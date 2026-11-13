# Geometria procedural de figurino sobre um corpo MakeHuman em repouso (rig cmu_mb).
# Tudo trabalha no espaço do mundo do Blender: Z para cima, a figura olha para -Y, esquerda da figura em +X.
# Cada peça é uma "malha solta" (verts, faces, uvs) mais regras de pele; build.py junta tudo num objeto só.
import math
import numpy as np
import bpy, bmesh
from mathutils import Vector
from mathutils.bvhtree import BVHTree

TAU = math.tau


class Piece:
    """Malha solta: vértices (n,3), faces (listas de índices), uv por canto (mesma ordem das faces)."""

    def __init__(self, name, cell, skin='nearest', bone=None, allow=None, mat='roupa'):
        self.name = name
        self.cell = cell          # chave da célula do atlas (pintura)
        self.skin = skin          # 'nearest' | 'skirt' | 'rigid' | 'hood'
        self.bone = bone          # osso fixo para 'rigid'
        self.allow = allow        # conjunto de ossos aceitos na transferência
        self.mat = mat
        self.v = []
        self.f = []
        self.uv = []              # lista de listas de (u,v), uma por face
        self.meta = {}

    def add(self, verts, faces, uvs, off=None):
        o = len(self.v)
        self.v.extend([tuple(map(float, p)) for p in verts])
        for f, u in zip(faces, uvs):
            self.f.append([i + o for i in f])
            self.uv.append(u)
        return o


# ---------------------------------------------------------------- corpo
class Body:
    def __init__(self, obj, rig):
        self.obj = obj
        self.rig = rig
        me = obj.data
        mw = obj.matrix_world
        self.V = np.array([tuple(mw @ v.co) for v in me.vertices])
        self.F = [tuple(p.vertices) for p in me.polygons]
        self.groups = [g.name for g in obj.vertex_groups]
        gi = {g.index: g.name for g in obj.vertex_groups}
        self.W = np.zeros((len(self.V), len(self.groups)))
        for v in me.vertices:
            for g in v.groups:
                self.W[v.index, g.group] = g.weight
        s = self.W.sum(1, keepdims=True); s[s == 0] = 1
        self.W /= s
        self.uvs = None
        if me.uv_layers:
            uvl = me.uv_layers.active.data
            self.loop_uv = np.array([tuple(l.uv) for l in uvl])
            self.face_loops = [list(p.loop_indices) for p in me.polygons]
        # osso dominante por face
        fw = np.array([self.W[list(f)].mean(0) for f in self.F])
        self.fdom = [self.groups[i] for i in fw.argmax(1)]
        self.bones = {b.name: (rig.matrix_world @ b.head_local, rig.matrix_world @ b.tail_local) for b in rig.data.bones}
        self._bvh = {}

    def bvh(self, key, names=None):
        if key in self._bvh: return self._bvh[key]
        if names is None:
            idx = list(range(len(self.F)))
        else:
            idx = [i for i, d in enumerate(self.fdom) if any(d == n or d.startswith(n) for n in names)]
        polys = [self.F[i] for i in idx]
        t = BVHTree.FromPolygons([Vector(p) for p in self.V], polys, all_triangles=False)
        self._bvh[key] = (t, idx)
        return self._bvh[key]

    def head(self, b): return Vector(self.bones[b][0])
    def tail(self, b): return Vector(self.bones[b][1])

    def weights_at(self, p, key='all', names=None):
        """pesos interpolados do ponto do corpo mais próximo de p"""
        t, idx = self.bvh(key, names)
        loc, nrm, fi, d = t.find_nearest(Vector(p))
        if loc is None: return None, None
        f = self.F[idx[fi]]
        P = self.V[list(f)]
        dd = np.linalg.norm(P - np.array(loc), axis=1) + 1e-4
        w = (1 / dd) / (1 / dd).sum()
        return (self.W[list(f)] * w[:, None]).sum(0), d

    def uv_at(self, p):
        t, idx = self.bvh('all')
        loc, nrm, fi, d = t.find_nearest(Vector(p))
        fi = idx[fi]
        f = self.F[fi]
        P = self.V[list(f)]
        dd = np.linalg.norm(P - np.array(loc), axis=1) + 1e-5
        w = (1 / dd ** 2) / (1 / dd ** 2).sum()
        uv = self.loop_uv[self.face_loops[fi]]
        return (uv * w[:, None]).sum(0)


# grupos de ossos
TORSO = ['Hips', 'LowerBack', 'Spine', 'Spine1', 'LHipJoint', 'RHipJoint', 'Neck', 'LeftShoulder', 'RightShoulder']
ARM_L = ['LeftArm', 'LeftForeArm']
ARM_R = ['RightArm', 'RightForeArm']
HAND_L = ['LeftHand', 'LeftFinger', 'LeftHandFinger', 'LThumb']
HAND_R = ['RightHand', 'RightFinger', 'RightHandFinger', 'RThumb']
LEGS = ['LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg']
FEET = ['LeftFoot', 'RightFoot', 'LeftToeBase', 'RightToeBase']
HEAD = ['Head', 'Neck1']


def cast_out_in(tree, center, d, far=1.2):
    """raio de fora para dentro em direção a center; devolve distância radial do primeiro contato (camada externa)"""
    o = center + d * far
    loc, n, i, dist = tree.ray_cast(o, -d, far * 1.2)
    if loc is None: return None
    return (loc - center).dot(d)


def fill_none(r, default):
    r = list(r)
    n = len(r)
    if all(x is None for x in r): return [default] * n
    for k in range(n):
        if r[k] is None:
            # vizinho válido mais próximo
            for s in range(1, n):
                a, b = r[(k - s) % n], r[(k + s) % n]
                if a is not None or b is not None:
                    r[k] = max(x for x in (a, b) if x is not None)
                    break
    return r


def convex_radial(r, angles):
    """envoltória convexa 2D de um anel polar, reamostrada nos mesmos ângulos"""
    pts = [(rr * math.sin(a), -rr * math.cos(a)) for rr, a in zip(r, angles)]
    P = sorted(set(pts))
    if len(P) < 3: return r
    def cross(o, a, b): return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lo, up = [], []
    for p in P:
        while len(lo) >= 2 and cross(lo[-2], lo[-1], p) <= 0: lo.pop()
        lo.append(p)
    for p in reversed(P):
        while len(up) >= 2 and cross(up[-2], up[-1], p) <= 0: up.pop()
        up.append(p)
    H = lo[:-1] + up[:-1]
    out = []
    for a in angles:
        d = (math.sin(a), -math.cos(a))
        best = 0
        for i in range(len(H)):
            p, q = H[i], H[(i + 1) % len(H)]
            # interseção raio (0 + t d) com segmento p-q
            ex, ey = q[0] - p[0], q[1] - p[1]
            den = d[0] * (-ey) - d[1] * (-ex)
            if abs(den) < 1e-9: continue
            t = (p[0] * (-ey) - p[1] * (-ex)) / den
            s = (d[0] * p[1] - d[1] * p[0]) / den
            if t > 0 and -1e-6 <= s <= 1 + 1e-6: best = max(best, t)
        out.append(best if best > 0 else max(r))
    return out


def smooth_ring(r, k=1, w=0.5):
    r = np.array(r, float)
    for _ in range(k):
        r = r * (1 - w) + (np.roll(r, 1) + np.roll(r, -1)) * w / 2
    return list(r)


# ---------------------------------------------------------------- lofts
def loft(piece, rings, closed=True, cap_top=False, cap_bot=False, vrange=(0, 1), gaps=None, flip=False):
    """rings: lista de arrays (n,3) de baixo para cima (v cresce). gaps: função (iring,k)->True remove a face."""
    n = len(rings[0])
    m = len(rings)
    # comprimento acumulado para v
    L = [0.0]
    for i in range(1, m):
        L.append(L[-1] + float(np.mean(np.linalg.norm(np.array(rings[i]) - np.array(rings[i - 1]), axis=1))))
    tot = L[-1] or 1
    v0, v1 = vrange
    verts, faces, uvs = [], [], []
    cols = n + 1 if closed else n
    for i, R in enumerate(rings):
        for k in range(cols):
            verts.append(R[k % n])
    for i in range(m - 1):
        for k in range(cols - 1):
            if gaps and gaps(i, k): continue
            a = i * cols + k; b = a + 1; c = a + cols + 1; d = a + cols
            f = [a, b, c, d]
            u0, u1 = k / (cols - 1), (k + 1) / (cols - 1)
            va, vb = v0 + (v1 - v0) * L[i] / tot, v0 + (v1 - v0) * L[i + 1] / tot
            uv = [(u0, va), (u1, va), (u1, vb), (u0, vb)]
            if flip:
                f = f[::-1]; uv = uv[::-1]
            faces.append(f); uvs.append(uv)
    off = piece.add(verts, faces, uvs)
    if cap_top or cap_bot:
        for which, R, idx in ((cap_bot, rings[0], 0), (cap_top, rings[-1], m - 1)):
            if not which: continue
            c = np.mean(np.array(R), axis=0)
            ci = piece.add([c], [], [])
            for k in range(n):
                a = off + idx * cols + k
                b = off + idx * cols + (k + 1) % cols if closed else a + 1
                if not closed and k == n - 1: break
                f = [a, ci, b] if idx == 0 else [a, b, ci]
                if flip: f = f[::-1]
                piece.f.append(f); piece.uv.append([(0.5, 0.02)] * 3)
    return off


def ring_points(center, radii, angles, z=None, frame=None):
    """frame: (X, Y) vetores; ponto = center + r (sin a X - cos a Y)... por padrão X=+x, Y=+y no plano horizontal"""
    pts = []
    for r, a in zip(radii, angles):
        if frame is None:
            pts.append((center[0] + r * math.sin(a), center[1] - r * math.cos(a), center[2] if z is None else z))
        else:
            X, Y = frame
            p = Vector(center) + X * (r * math.sin(a)) - Y * (r * math.cos(a))
            pts.append(tuple(p))
    return np.array(pts)


def angles_n(n, start=0.0):
    return [start + TAU * k / n for k in range(n)]


def spine_center(body, z):
    """centro do tronco na altura z (interpola a linha da coluna, x=0)"""
    chain = ['Hips', 'LowerBack', 'Spine', 'Spine1', 'Neck', 'Neck1', 'Head']
    pts = [body.head(c) for c in chain] + [body.tail('Head')]
    pts.sort(key=lambda p: p.z)
    if z <= pts[0].z: y = pts[0].y
    elif z >= pts[-1].z: y = pts[-1].y
    else:
        for a, b in zip(pts, pts[1:]):
            if a.z <= z <= b.z:
                t = (z - a.z) / max(b.z - a.z, 1e-6); y = a.y + (b.y - a.y) * t; break
    return Vector((0.0, y, z))


def torso_ring(body, z, n, off, names=TORSO + ['LeftUpLeg', 'RightUpLeg'], key='torso', convex=True, center=None):
    tree, _ = body.bvh(key, names)
    c = center or spine_center(body, z)
    A = angles_n(n)
    r = [cast_out_in(tree, c, Vector((math.sin(a), -math.cos(a), 0))) for a in A]
    r = fill_none(r, 0.12)
    if convex: r = convex_radial(r, A)
    r = smooth_ring(r, 1, 0.4)
    return c, [x + off for x in r], A


def limb_frame(d):
    d = d.normalized()
    up = Vector((0, 0, 1)) if abs(d.z) < 0.9 else Vector((0, -1, 0))
    X = d.cross(up).normalized()
    Y = X.cross(d).normalized()
    return X, Y


def limb_rings(body, pts, n, off, names, key, taper=None, minr=0.02):
    """anéis ao longo de uma polilinha (lista de Vector). taper(t)->extra raio."""
    tree, _ = body.bvh(key, names)
    # parametriza por comprimento
    seg = [0.0]
    for a, b in zip(pts, pts[1:]): seg.append(seg[-1] + (b - a).length)
    rings = []
    A = angles_n(n)
    for i, p in enumerate(pts):
        d = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)])
        X, Y = limb_frame(d)
        r = []
        for a in A:
            dirv = X * math.sin(a) - Y * math.cos(a)
            rr = cast_out_in(tree, p, dirv, far=0.35)
            r.append(rr if rr is not None and rr > 0 else None)
        r = fill_none(r, 0.05)
        r = convex_radial(r, A)
        t = seg[i] / (seg[-1] or 1)
        ex = taper(t) if taper else 0
        r = [max(minr, x + off + ex) for x in smooth_ring(r, 1, 0.4)]
        rings.append(ring_points(p, r, A, frame=(X, Y)))
    return rings


def polyline(points, steps):
    """reamostra a polilinha em `steps` pontos igualmente espaçados"""
    pts = [Vector(p) for p in points]
    L = [0.0]
    for a, b in zip(pts, pts[1:]): L.append(L[-1] + (b - a).length)
    out = []
    for s in range(steps):
        t = L[-1] * s / (steps - 1)
        for i in range(len(L) - 1):
            if L[i] <= t <= L[i + 1] + 1e-9:
                u = (t - L[i]) / max(L[i + 1] - L[i], 1e-9)
                out.append(pts[i].lerp(pts[i + 1], u)); break
    return out


def box(piece, c, sx, sy, sz, rot=None):
    """caixa (c centro, meias-medidas) com UV de cubo simples"""
    c = Vector(c)
    corners = []
    for z in (-1, 1):
        for y in (-1, 1):
            for x in (-1, 1):
                p = Vector((x * sx, y * sy, z * sz))
                if rot: p = rot @ p
                corners.append(c + p)
    F = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    uv = [(0, 0), (1, 0), (1, 1), (0, 1)]
    return piece.add(corners, F, [uv] * 6)


def cylinder(piece, a, b, r, n=8, cap=True, r2=None, vrange=(0, 1)):
    a, b = Vector(a), Vector(b)
    X, Y = limb_frame(b - a)
    A = angles_n(n)
    R0 = ring_points(a, [r] * n, A, frame=(X, Y))
    R1 = ring_points(b, [r2 if r2 is not None else r] * n, A, frame=(X, Y))
    return loft(piece, [R0, R1], cap_top=cap, cap_bot=cap, vrange=vrange)


def sphere(piece, c, rx, ry, rz, nu=8, nv=5):
    c = Vector(c)
    rings = []
    for j in range(1, nv):
        ph = math.pi * j / nv
        z = -math.cos(ph)
        s = math.sin(ph)
        rings.append(np.array([(c.x + rx * s * math.sin(a), c.y - ry * s * math.cos(a), c.z + rz * z) for a in angles_n(nu)]))
    return loft(piece, rings, cap_top=True, cap_bot=True)


def to_mesh(name, pieces):
    """junta peças num objeto de malha com UV e devolve (obj, lista de faixas de vértice por peça)"""
    V, F, U = [], [], []
    spans = []
    for p in pieces:
        o = len(V)
        V.extend(p.v)
        for f, uv in zip(p.f, p.uv):
            F.append([i + o for i in f]); U.append(uv)
        spans.append((p, o, len(V)))
    me = bpy.data.meshes.new(name)
    me.from_pydata(V, [], F)
    uvl = me.uv_layers.new(name='UVMap')
    li = 0
    for poly, uv in zip(me.polygons, U):
        for j, l in enumerate(poly.loop_indices):
            uvl.data[l].uv = uv[j % len(uv)]
    me.validate(clean_customdata=False)
    me.update()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob, spans
