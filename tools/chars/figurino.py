# Peças de figurino geradas sobre o corpo em repouso. Cada função devolve uma ou mais Piece (geo.py).
# Medidas em metros; offsets a partir da pele. Ângulo 0 = frente da figura (-Y), cresce para a esquerda da figura (+X).
import math, random
import numpy as np
from mathutils import Vector, Matrix
from geo import (Piece, TORSO, ARM_L, ARM_R, LEGS, FEET, HEAD, HAND_L, HAND_R, torso_ring, limb_rings, polyline,
                 loft, ring_points, angles_n, spine_center, cast_out_in, fill_none, convex_radial, smooth_ring,
                 box, cylinder, sphere, limb_frame, TAU)


class Marks:
    """alturas de referência tiradas do esqueleto"""

    def __init__(self, body):
        b = body
        self.neck = b.head('Neck').z
        self.neck1 = b.head('Neck1').z
        self.head0 = b.head('Head').z
        self.head1 = b.tail('Head').z
        self.shoulder = b.head('LeftArm').z
        self.chest = b.head('Spine1').z
        self.waist = b.head('Spine').z - 0.02
        self.hip = b.head('Hips').z
        self.crotch = self.hip - 0.07
        self.knee = b.head('LeftLeg').z
        self.ankle = b.head('LeftFoot').z
        self.elbow = b.head('LeftForeArm').z
        # topo da cabeça: maior z do corpo
        self.top = float(body.V[:, 2].max())
        self.height = self.top - float(body.V[:, 2].min())
        hc = (b.head('Head') + b.tail('Head')) / 2
        self.head_c = Vector((0, hc.y + 0.005, (self.head0 + self.top) / 2 - 0.01))


def lerp(a, b, t): return a + (b - a) * t
def smooth(t): t = max(0.0, min(1.0, t)); return t * t * (3 - 2 * t)


# ------------------------------------------------------------- tronco e saia
def bodice(body, mk, z_bot, z_top, off=0.012, n=16, collar=0.0, cell='tronco', steps=7, name='tronco', open_front=0.0):
    """tubo justo do tronco (camisa, colete, corpete, casaco). collar: gola alta que sobe e abre."""
    P = Piece(name, cell)
    zs = [lerp(z_bot, z_top, i / (steps - 1)) for i in range(steps)]
    rings = []
    radii = []
    for z in zs:
        c, r, A = torso_ring(body, z, n, off)
        radii.append(r)
        rings.append(ring_points(c, r, A))
    if collar:
        c, r, A = torso_ring(body, z_top, n, off)
        c2 = spine_center(body, z_top + collar)
        rings.append(ring_points(c2, [x * 1.08 + 0.008 for x in r], A))
    gaps = None
    if open_front:
        def gaps(i, k, n=n):
            a = (k + 0.5) / n * TAU
            a = a if a <= math.pi else a - TAU
            return abs(a) < open_front
    loft(P, rings, gaps=gaps)
    P.meta['rings'] = (zs, radii)
    return P


def skirt(body, mk, z_top, z_hem, off=0.02, flare=0.12, n=18, steps=6, open_front=0.0, open_from=1.0, ragged=0.0,
          cell='saia', name='saia', seed=3, back_slit=0.0, front_only=None, follow=0.55, top_off=None, scale_x=1.0):
    """saia, aba de casaco, batina. open_front: meia-abertura frontal em radianos a partir de open_from (0 barra..1 cintura).
    front_only: (a0,a1) faz só um painel (avental, capa traseira)."""
    P = Piece(name, cell, skin='skirt')
    rnd = random.Random(seed)
    A = angles_n(n) if not front_only else [lerp(front_only[0], front_only[1], k / (n - 1)) for k in range(n)]
    names = TORSO + ['LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg']
    tree, _ = body.bvh('saia', names)
    zs = [lerp(z_hem, z_top, i / (steps - 1)) for i in range(steps)]
    top = None
    rings, radii = [], []
    for i, z in enumerate(reversed(zs)):
        c = spine_center(body, max(z, mk.hip - 0.02))
        c = c.copy(); c.z = z
        r = [cast_out_in(tree, c, Vector((math.sin(a), -math.cos(a), 0))) for a in angles_n(n)]
        r = fill_none(r, 0.14)
        r = convex_radial(r, angles_n(n))
        r = smooth_ring(r, 2, 0.5)
        if front_only:
            # reamostra nos ângulos do painel
            full = angles_n(n)
            r = [np.interp((a % TAU), full + [TAU], list(r) + [r[0]]) for a in A]
        t = (z_top - z) / max(z_top - z_hem, 1e-6)
        o = off if top_off is None else lerp(top_off, off, smooth(t * 3))
        r = [x + o for x in r]
        if top is None: top = list(r)
        rr = [max(x, tp + flare * t ** 1.25) for x, tp in zip(r, top)]
        rr = [x * (1 + (scale_x - 1) * abs(math.sin(a))) for x, a in zip(rr, A)]
        radii.append(rr)
        rings.append(ring_points(c, rr, A))
    rings = rings[::-1]; radii = radii[::-1]  # de baixo para cima
    if ragged:
        R0 = rings[0]
        for k in range(len(R0)):
            j = (k % 2) * 2 - 1
            R0[k][2] += j * ragged * (0.5 + rnd.random()) + (rnd.random() - 0.5) * ragged
    m = len(rings)
    gaps = None
    if open_front or back_slit:
        def gaps(i, k):
            a = (k + 0.5) / n * TAU
            a = a if a <= math.pi else a - TAU
            if open_front and abs(a) < open_front and i < (m - 1) * open_from: return True
            if back_slit and abs(abs(a) - math.pi) < back_slit and i < (m - 1) * 0.45: return True
            return False
    loft(P, rings, closed=not front_only, gaps=gaps)
    P.meta.update(z_top=z_top, z_hem=z_hem, A=A, radii=radii, zs=zs, follow=follow)
    return P


def sleeve(body, mk, side, off=0.012, t0=0.0, t1=1.0, cuff=0.02, n=10, steps=7, cell='manga', name=None, puff=0.0):
    s = 'Left' if side == 'L' else 'Right'
    sh = body.head(s + 'Arm'); el = body.head(s + 'ForeArm'); wr = body.head(s + 'Hand')
    cl = body.head(s + 'Shoulder')
    start = sh.lerp(cl, 0.35) + Vector((0, 0, 0.01))
    full = polyline([start, sh, el, wr], 40)
    pts = full[int(t0 * 39):int(t1 * 39) + 1]
    pts = polyline(pts, steps)
    names = ARM_L if side == 'L' else ARM_R
    rings = limb_rings(body, pts, n, off, names + [s + 'Shoulder'], 'arm' + side,
                       taper=lambda t: cuff * smooth((t - 0.75) / 0.25) + puff * math.sin(math.pi * min(1, t * 1.6)))
    P = Piece(name or ('manga' + side), cell, allow=set(names + [s + 'Shoulder', 'Spine1', s + 'Hand']))
    loft(P, rings)
    return P


def trouser(body, mk, side, off=0.012, z_bot=None, flare=0.0, n=10, steps=7, cell='calca', name=None):
    s = 'Left' if side == 'L' else 'Right'
    hip = body.head(s + 'UpLeg') + Vector((0, 0, 0.05)); kn = body.head(s + 'Leg'); an = body.head(s + 'Foot')
    full = polyline([hip, kn, an], 40)
    if z_bot is not None:
        full = [p for p in full if p.z >= z_bot] or full[:2]
    pts = polyline(full, steps)
    rings = limb_rings(body, pts, n, off, ['LeftUpLeg', 'RightUpLeg'] if False else [s + 'UpLeg', s + 'Leg'], 'leg' + side,
                       taper=lambda t: flare * t)
    P = Piece(name or ('calca' + side), cell, allow={s + 'UpLeg', s + 'Leg', 'Hips', s[0] + 'HipJoint'})
    loft(P, rings)
    return P


def boot(body, mk, side, z_top, off=0.014, n=10, cell='bota', name=None, cuff=0.012):
    s = 'Left' if side == 'L' else 'Right'
    kn = body.head(s + 'Leg'); an = body.head(s + 'Foot')
    full = polyline([kn, an], 30)
    pts = [p for p in full if p.z <= z_top] or full[-3:]
    pts = polyline([pts[0], an + Vector((0, 0.01, 0.025))], 4)
    rings = limb_rings(body, pts, n, off, [s + 'Leg', s + 'Foot'], 'shin' + side,
                       taper=lambda t: cuff * (1 - smooth(t * 3)))
    P = Piece(name or ('bota' + side), cell, allow={s + 'Leg', s + 'Foot', s + 'ToeBase'})
    loft(P, rings)
    # pé: casca deslocada das faces do pé
    shell(body, P, [s + 'Foot', s + 'ToeBase'], off + 0.004, z_max=an.z + 0.05)
    return P


def shell(body, P, names, off, z_max=None, z_min=None, pred=None, uv_box=None):
    """copia faces do corpo cujo osso dominante está em names e as empurra pela normal (botas, luvas, máscara, barba)."""
    idx = [i for i, d in enumerate(body.fdom) if any(d == n or d.startswith(n) for n in names)]
    V = body.V
    # normais por vértice
    if not hasattr(body, 'VN'):
        vn = np.zeros_like(V)
        for f in body.F:
            p = V[list(f)]
            nrm = np.cross(p[1] - p[0], p[2] - p[0])
            if len(f) == 4: nrm += np.cross(p[2] - p[0], p[3] - p[0])
            vn[list(f)] += nrm
        body.VN = vn / (np.linalg.norm(vn, axis=1, keepdims=True) + 1e-9)
    sel = []
    for i in idx:
        f = body.F[i]
        cz = V[list(f)][:, 2].mean()
        if z_max is not None and cz > z_max: continue
        if z_min is not None and cz < z_min: continue
        if pred and not pred(V[list(f)].mean(0)): continue
        sel.append(f)
    if not sel: return P
    used = sorted({v for f in sel for v in f})
    remap = {v: k for k, v in enumerate(used)}
    pts = V[used] + body.VN[used] * off
    # UV: projeção cilíndrica em torno do eixo vertical do conjunto
    c = pts.mean(0)
    zr = (pts[:, 2].min(), pts[:, 2].max() + 1e-6)
    faces, uvs = [], []
    for f in sel:
        ff = [remap[v] for v in f]
        uv = []
        for v in ff:
            p = pts[v]
            a = (math.atan2(p[0] - c[0], -(p[1] - c[1])) / TAU) % 1.0
            uv.append((a, (p[2] - zr[0]) / (zr[1] - zr[0])))
        # costura: evita faixa invertida
        us = [x[0] for x in uv]
        if max(us) - min(us) > 0.5: uv = [((x[0] + 1) if x[0] < 0.5 else x[0], x[1]) for x in uv]; uv = [(x[0] % 1.0001, x[1]) for x in uv]
        faces.append(ff); uvs.append(uv)
    P.add(pts, faces, uvs)
    return P


def capelet(body, mk, z_bot, off=0.03, flare=0.08, n=18, steps=5, ragged=0.0, cell='capa', name='capa', z_top=None, seed=5):
    """capa curta sobre ombros e braços (raio sobre tronco + braços superiores)."""
    P = Piece(name, cell, allow=set(TORSO + ['LeftArm', 'RightArm', 'Neck1']))
    rnd = random.Random(seed)
    names = TORSO + ['LeftArm', 'RightArm']
    tree, _ = body.bvh('capa', names)
    z_top = z_top or mk.neck + 0.03
    zs = [lerp(z_bot, z_top, i / (steps - 1)) for i in range(steps)]
    A = angles_n(n)
    rings = []
    rtop = None
    for z in reversed(zs):
        c = spine_center(body, z)
        r = [cast_out_in(tree, c, Vector((math.sin(a), -math.cos(a), 0)), far=1.0) for a in A]
        r = convex_radial(fill_none(r, 0.15), A)
        r = smooth_ring(r, 2, 0.5)
        t = (z_top - z) / max(z_top - z_bot, 1e-6)
        if rtop is None: rtop = r
        rr = [max(x + off, rt + off + flare * t) for x, rt in zip(r, rtop)]
        rings.append(ring_points(c, rr, A))
    rings = rings[::-1]
    if ragged:
        for k in range(n):
            rings[0][k][2] += ((k % 2) * 2 - 1) * ragged * (0.4 + rnd.random())
    loft(P, rings)
    return P


def hood(body, mk, off=0.035, n=16, nlat=6, opening=0.95, peak=0.06, cell='capuz', name='capuz', drop=0.0):
    """capuz: casca esférica sobre a cabeça com abertura frontal; a base desce até o pescoço."""
    P = Piece(name, cell, skin='hood', allow={'Head', 'Neck1', 'Neck', 'Spine1'})
    tree, _ = body.bvh('cabeca', HEAD + ['Neck'])
    c = mk.head_c.copy()
    A = angles_n(n)
    rings = []
    lats = [math.radians(lerp(125, 8, j / (nlat - 1))) for j in range(nlat)]
    for j, ph in enumerate(lats):
        R = []
        for a in A:
            d = Vector((math.sin(ph) * math.sin(a), -math.sin(ph) * math.cos(a), math.cos(ph)))
            r = cast_out_in(tree, c, d, far=0.5)
            r = (r if r else 0.11) + off
            back = max(0.0, math.cos(a - math.pi))  # 1 atrás
            r += peak * back * smooth((math.degrees(ph) - 20) / 60) * (1 - smooth((math.degrees(ph) - 95) / 30))
            R.append(r)
        R = smooth_ring(R, 1, 0.4)
        pts = np.array([tuple(c + Vector((math.sin(ph) * math.sin(a), -math.sin(ph) * math.cos(a), math.cos(ph))) * r) for a, r in zip(A, R)])
        rings.append(pts)
    # base: anel no pescoço/ombros abaixo do primeiro
    cz = mk.neck - drop
    c2, r2, _ = torso_ring(body, cz, n, off + 0.02)
    rings.insert(0, ring_points(c2, r2, A))
    m = len(rings)

    def gaps(i, k):
        a = (k + 0.5) / n * TAU
        a = a if a <= math.pi else a - TAU
        ph = 125 - (i - 1) * (117 / (nlat - 1)) if i > 0 else 140
        return abs(a) < opening and 40 < ph < 128
    loft(P, rings, gaps=gaps)
    return P


def scarf(body, mk, col_off=0.022, thick=0.035, n=16, tail=0.32, side=1, cell='cachecol', name='cachecol'):
    P = Piece(name, cell, allow={'Neck', 'Neck1', 'Spine1', 'Spine', 'Head'})
    z = mk.neck + 0.015
    A = angles_n(n)
    c, r, _ = torso_ring(body, z, n, col_off)
    c0, r0, _ = torso_ring(body, z - 0.035, n, col_off)
    rings = [ring_points(c0, [x + thick * 0.5 for x in r0], A, z=z - 0.045),
             ring_points(c, [x + thick for x in r], A, z=z - 0.01),
             ring_points(c, [x + thick * 0.8 for x in r], A, z=z + 0.03),
             ring_points(c, [x + 0.004 for x in r], A, z=z + 0.045)]
    loft(P, rings)
    if tail:
        # ponta pendente sobre o peito
        tree, _ = body.bvh('torso', TORSO + ['LeftUpLeg', 'RightUpLeg'])
        pts = []
        for i in range(5):
            zz = z - 0.03 - tail * i / 4
            cc = spine_center(body, zz)
            a = side * (0.35 - 0.05 * i)
            d = Vector((math.sin(a), -math.cos(a), 0))
            rr = cast_out_in(tree, cc, d) or 0.12
            pts.append(cc + d * (rr + col_off + thick * 0.9))
        W, T = 0.045, 0.008
        rings2 = []
        for i, p in enumerate(pts):
            d = (pts[min(i + 1, 4)] - pts[max(i - 1, 0)]).normalized()
            X = Vector((1, 0, 0)); Y = d.cross(X).normalized()
            w = W * (1 + 0.15 * i / 4)
            rings2.append(np.array([tuple(p + X * w + Y * T), tuple(p - X * w + Y * T), tuple(p - X * w - Y * T), tuple(p + X * w - Y * T)]))
        loft(P, rings2[::-1], cap_bot=True, vrange=(0, 0.5))
    return P


def belt(body, mk, z, off=0.02, h=0.045, n=16, buckle=True, cell='couro', name='cinto'):
    P = Piece(name, cell)
    A = angles_n(n)
    c, r, _ = torso_ring(body, z, n, off)
    rings = [ring_points(c, r, A, z=z - h / 2), ring_points(c, [x + 0.006 for x in r], A, z=z), ring_points(c, r, A, z=z + h / 2)]
    loft(P, rings)
    if buckle:
        front = c + Vector((0, -r[0] - 0.008, 0))
        Pm = Piece('fivela', 'metal')
        box(Pm, front, 0.025, 0.006, h * 0.6)
        return [P, Pm]
    return [P]


def apron(body, mk, skirt_piece, z_top, z_hem, width=1.0, off=0.012, bib=False, cell='avental', name='avental'):
    """painel frontal sobre a saia, acompanhando o raio dela."""
    P = Piece(name, cell, skin='skirt')
    Sm = skirt_piece.meta
    n = 9
    A = [lerp(-width, width, k / (n - 1)) for k in range(n)]
    steps = 5
    rings = []
    for i in range(steps):
        z = lerp(z_hem, z_top, i / (steps - 1))
        rr = []
        for a in A:
            # raio da saia em (a, z) por interpolação
            zs, radii, SA = Sm['zs'], Sm['radii'], Sm['A']
            j = int(np.clip(np.searchsorted(zs, z) - 1, 0, len(zs) - 2))
            t = (z - zs[j]) / max(zs[j + 1] - zs[j], 1e-6)
            ring = [lerp(radii[j][q], radii[j + 1][q], t) for q in range(len(SA))]
            rr.append(np.interp(a % TAU, list(SA) + [TAU], ring + [ring[0]]) + off)
        c = spine_center(body, max(z, mk.hip - 0.02)); c.z = z
        rings.append(ring_points(c, rr, A))
    loft(P, rings, closed=False)
    P.meta.update(Sm)
    if bib:
        B = Piece(name + '_peito', cell)
        A2 = [lerp(-0.75, 0.75, k / 6) for k in range(7)]
        rings = []
        for i in range(4):
            z = lerp(z_top, mk.chest + 0.02, i / 3)
            c, r, AA = torso_ring(body, z, 24, off + 0.012)
            rr = [np.interp(a % TAU, AA + [TAU], r + [r[0]]) for a in A2]
            rings.append(ring_points(c, rr, A2))
        loft(B, rings, closed=False, vrange=(0.6, 1.0))
        return [P, B]
    return [P]


def satchel(body, mk, side=1, strap_from=-1, cell='couro', name='bolsa', size=(0.12, 0.05, 0.1)):
    """bolsa a tiracolo: caixa no quadril + alça diagonal sobre o peito"""
    P = Piece(name, cell, allow=set(TORSO + ['LeftUpLeg', 'RightUpLeg']))
    tree, _ = body.bvh('torso', TORSO + ['LeftUpLeg', 'RightUpLeg'])
    z = mk.hip + 0.02
    a = side * 1.35
    c = spine_center(body, z)
    d = Vector((math.sin(a), -math.cos(a), 0))
    r = cast_out_in(tree, c, d) or 0.18
    bc = c + d * (r + size[1] + 0.01)
    rot = Matrix.Rotation(-a, 3, 'Z')
    box(P, bc, size[0] / 2, size[1] / 2, size[2] / 2, rot=rot)
    box(P, bc + Vector((0, 0, size[2] * 0.25)) + d * 0.004, size[0] / 2 + 0.006, size[1] / 2 + 0.006, size[2] * 0.3, rot=rot)
    # alça
    pts = []
    for i, t in enumerate(np.linspace(0, 1, 9)):
        zz = lerp(mk.shoulder + 0.06, z + size[2] * 0.45, t)
        aa = lerp(strap_from * 0.55, a * 0.95, t) if t > 0.08 else strap_from * 0.9
        if i == 0: aa = strap_from * 1.25
        cc = spine_center(body, zz)
        dd = Vector((math.sin(aa), -math.cos(aa), 0))
        rr = cast_out_in(body.bvh('capa', TORSO + ['LeftArm', 'RightArm'])[0], cc, dd) or 0.15
        pts.append(cc + dd * (rr + 0.014))
    rings = []
    for i, p in enumerate(pts):
        dv = (pts[min(i + 1, 8)] - pts[max(i - 1, 0)]).normalized()
        out = (p - spine_center(body, p.z)); out.z = 0; out.normalize()
        X = dv.cross(out).normalized()
        rings.append(np.array([tuple(p + X * 0.018 + out * 0.004), tuple(p - X * 0.018 + out * 0.004), tuple(p - X * 0.018 - out * 0.004), tuple(p + X * 0.018 - out * 0.004)]))
    loft(P, rings, vrange=(0, 0.3))
    return P


def hat(body, mk, brim=0.2, crown_h=0.14, crown_r=None, tip_bend=0.0, droop=0.03, n=18, cell='chapeu', name='chapeu', z_off=0.0):
    P = Piece(name, cell, skin='rigid', bone='Head')
    tree, _ = body.bvh('cabeca', HEAD + ['Neck'])
    c = mk.head_c
    z = mk.top - 0.065 + z_off
    A = angles_n(n)
    cc = Vector((0, c.y + 0.005, z))
    rh = [cast_out_in(tree, cc, Vector((math.sin(a), -math.cos(a), 0)), far=0.4) or 0.1 for a in A]
    rh = [x + 0.012 for x in smooth_ring(rh, 1, 0.4)]
    # aba: anel interno (cabeça) e externo caído
    R_in = ring_points(cc, rh, A)
    R_out = ring_points(cc, [brim] * n, A, z=z - droop)
    R_out_t = ring_points(cc, [brim] * n, A, z=z - droop + 0.008)
    R_in_t = ring_points(cc, rh, A, z=z + 0.01)
    loft(P, [R_in, R_out, R_out_t, R_in_t], vrange=(0, 0.25))
    # copa
    cr = crown_r or max(rh) * 0.95
    rings = [R_in_t]
    k = 5
    for i in range(1, k + 1):
        t = i / k
        rr = [lerp(x, cr * (1 - 0.82 * t ** 1.6), smooth(t * 1.2)) for x in rh]
        bend = Vector((0, tip_bend * t ** 2, 0))
        cz = Vector((cc.x, cc.y, z + 0.01 + crown_h * t)) + bend
        rings.append(ring_points(cz, rr, A))
    loft(P, rings, cap_top=True, vrange=(0.3, 1.0))
    P.meta['top'] = z + crown_h
    return P


def glasses(body, mk, eyes, r=0.017, cell='metal', name='oculos'):
    P = Piece(name, cell, skin='rigid', bone='Head')
    L, R = eyes
    for e in (L, R):
        cpos = Vector(e) + Vector((0, -0.018, 0))
        rings = []
        A = angles_n(8)
        for rr in (r, r + 0.003):
            rings.append(np.array([tuple(cpos + Vector((rr * math.cos(a), 0, rr * math.sin(a)))) for a in A]))
        rings2 = [rings[0], rings[1], rings[1] + np.array([0, -0.003, 0]), rings[0] + np.array([0, -0.003, 0])]
        loft(P, rings2, vrange=(0, 1))
    mid = (Vector(L) + Vector(R)) / 2 + Vector((0, -0.02, 0.004))
    cylinder(P, Vector(L) + Vector((-0.017 if L[0] > 0 else 0.017, -0.019, 0.004)), mid, 0.0018, n=4, cap=False)
    cylinder(P, Vector(R) + Vector((-0.017 if R[0] > 0 else 0.017, -0.019, 0.004)), mid, 0.0018, n=4, cap=False)
    for e in (L, R):
        s = 1 if e[0] > 0 else -1
        a = Vector(e) + Vector((s * 0.02, -0.018, 0.004))
        cylinder(P, a, a + Vector((s * 0.012, 0.09, 0.005)), 0.0016, n=4, cap=False)
    return P


# ------------------------------------------------------------- cabelo e barba
def hair(body, mk, style='curto', col_off=0.012, volume=0.012, n=18, nlat=6, length=0.3, seed=7, cell='cabelo', fringe=None, hl_front=76, hl_side=113, hl_back=126, locks=0):
    """penteado em casca sólida (como no PS2). estilos: curto, bagunca, coque, longo, trancas, rabo, calvo_lados"""
    rnd = random.Random(seed)
    tree, _ = body.bvh('cabeca', HEAD + ['Neck'])
    c = mk.head_c.copy()
    A = angles_n(n)
    out = []
    P = Piece('cabelo', cell, skin='rigid', bone='Head')
    # linha do cabelo: ângulo polar máximo por direção (frente alta, nuca baixa)
    def phmax(a):
        f = math.cos(a)  # 1 na frente
        s = abs(math.sin(a))
        jit = 3.5 * math.sin(a * 7 + seed) + 2.0 * math.sin(a * 13 + seed * 3)
        if f > 0: return lerp(hl_front, hl_side, s ** 2) + jit
        return lerp(hl_back, hl_side, s ** 1.5) + jit
    rings = []
    for j in range(nlat):
        t = j / (nlat - 1)
        R = []
        for a in A:
            ph = math.radians(lerp(phmax(a), 6, t))
            d = Vector((math.sin(ph) * math.sin(a), -math.sin(ph) * math.cos(a), math.cos(ph)))
            r = cast_out_in(tree, c, d, far=0.45) or 0.1
            vol = volume * (0.4 + 0.6 * t)
            if style == 'bagunca': vol += 0.012 * rnd.random() * t
            R.append(c + d * (r + col_off * (0.35 + 0.65 * t) + vol))
        rings.append(np.array([tuple(p) for p in R]))
    loft(P, rings, cap_top=True, vrange=(0.2, 1.0))
    # franja / mechas na testa
    if fringe is None: fringe = style == 'bagunca'
    if fringe:
        nf = 7 if style == 'bagunca' else 5
        for i in range(nf):
            a = lerp(-0.9, 0.9, i / (nf - 1)) + rnd.uniform(-0.08, 0.08)
            ph0 = math.radians(phmax(a) - 14)
            ph1 = math.radians(phmax(a) + (10 if style == 'bagunca' else 6) + rnd.uniform(-3, 4))
            d0 = Vector((math.sin(ph0) * math.sin(a), -math.sin(ph0) * math.cos(a), math.cos(ph0)))
            d1 = Vector((math.sin(ph1) * math.sin(a), -math.sin(ph1) * math.cos(a), math.cos(ph1)))
            r0 = (cast_out_in(tree, c, d0, far=0.45) or 0.1) + col_off + volume
            r1 = (cast_out_in(tree, c, d1, far=0.45) or 0.1) + 0.006
            p0 = c + d0 * r0; p1 = c + d1 * r1
            w = 0.017 if style != 'bagunca' else 0.022
            side = Vector((math.cos(a), math.sin(a), 0)) * w
            nrm = d0 * 0.005
            V = [p0 - side, p0 + side, p1, p0 - side + nrm, p0 + side + nrm]
            P.add([tuple(v) for v in V], [[0, 1, 2], [4, 3, 2], [1, 4, 2], [3, 0, 2]], [[(0, 0.9), (1, 0.9), (0.5, 0.2)]] * 4)
    for i in range(locks):
        sx = 1 if i % 2 == 0 else -1
        a = sx * 1.25
        for j in range(2):
            ph0 = math.radians(phmax(a) - 8); ph1 = math.radians(phmax(a) + 22 + 6 * j)
            aa = a + sx * 0.12 * j
            d0 = Vector((math.sin(ph0) * math.sin(aa), -math.sin(ph0) * math.cos(aa), math.cos(ph0)))
            d1 = Vector((math.sin(ph1) * math.sin(aa), -math.sin(ph1) * math.cos(aa), math.cos(ph1)))
            r0 = (cast_out_in(tree, c, d0, far=0.45) or 0.1) + col_off + volume * 0.5
            r1 = (cast_out_in(tree, c, d1, far=0.45) or 0.1) + 0.008
            cylinder(P, c + d0 * r0, c + d1 * r1, 0.009, n=4, r2=0.003)
    if style in ('coque',):
        back = c + Vector((0, 0.085, 0.06))
        r_ = cast_out_in(tree, c, (back - c).normalized(), far=0.4) or 0.1
        bc = c + (back - c).normalized() * (r_ + 0.035)
        sphere(P, bc, 0.05, 0.045, 0.045, nu=10, nv=6)
    if style in ('longo', 'rabo', 'trancas'):
        L = (Piece('cabelo_longo', cell, skin='rigid', bone='Head') if style == 'trancas'  # tranças presas à cabeça
             else Piece('cabelo_longo', cell, skin='nearest', allow={'Head', 'Neck1', 'Neck', 'Spine1'}))
        if style == 'longo':
            # lençol de cabelo nas costas, do occipital até `length` abaixo
            tt, _ = body.bvh('costas', TORSO + HEAD)
            z0 = mk.head0 + 0.06
            z1 = z0 - length
            Ab = [lerp(math.radians(70), math.radians(290), k / 10) for k in range(11)]
            rings = []
            for i in range(6):
                z = lerp(z0, z1, i / 5)
                cc = spine_center(body, z)
                if z > mk.neck1: cc = Vector((0, c.y, z))
                rr = []
                for a in Ab:
                    d = Vector((math.sin(a), -math.cos(a), 0))
                    r = cast_out_in(tt, cc, d, far=0.5) or 0.1
                    rr.append(r + col_off + 0.022 + 0.02 * (1 - i / 5))
                rings.append(ring_points(cc, rr, Ab))
            rings = rings[::-1]
            for k in range(len(rings[0])):
                rings[0][k][2] += rnd.uniform(-0.025, 0.02)
            loft(L, rings, closed=False, vrange=(0, 0.6))
            # face interna (o lençol tem espessura)
            inner = [r.copy() for r in rings]
            for r in inner:
                for k in range(len(r)):
                    a = Ab[k]; r[k][0] -= math.sin(a) * 0.012; r[k][1] += math.cos(a) * 0.012
            loft(L, inner, closed=False, vrange=(0, 0.6), flip=True)
        else:
            # rabo ou trança: cadeia de gomos atrás da nuca
            p = c + Vector((0, 0.1, -0.02))
            nseg = 6
            for i in range(nseg):
                q = p + Vector((0, 0.014 * (1 - i / 3), -length / nseg))  # desce rente às costas
                rr = 0.026 * (1 - 0.5 * i / nseg)
                if style == 'trancas':
                    for sx in (-1, 1):
                        sphere(L, (p + q) / 2 + Vector((sx * 0.012 * (1 if i % 2 else -1), 0, 0)), rr * 0.8, rr * 0.8, length / nseg * 0.6, nu=6, nv=4)
                else:
                    cylinder(L, p, q, rr, n=6, cap=True, r2=rr * 0.85)
                p = q
        out.append(L)
    out.insert(0, P)
    return out


def beard(body, mk, eyes, off=0.008, full=True, cell='barba', name='barba', mustache=True):
    """barba em casca da metade inferior do rosto"""
    P = Piece(name, cell, skin='rigid', bone='Head')
    ez = (eyes[0][2] + eyes[1][2]) / 2
    ey = (eyes[0][1] + eyes[1][1]) / 2
    zc = ez - 0.055  # boca aproximada
    def pred(p):
        if p[2] > ez - 0.035: return False
        if abs(p[0]) < 0.026 and zc - 0.02 < p[2] < zc + 0.008 and p[1] < mk.head_c.y - 0.04: return False  # boca aberta
        if p[2] < mk.neck1 - (0.04 if full else 0.0): return False
        return p[1] < mk.head_c.y + (0.03 if full else -0.01)
    shell(body, P, HEAD + ['Neck'], off, pred=pred)
    if mustache:
        for s in (-1, 1):
            a = Vector((0.0, ey - 0.006, zc + 0.012)) + Vector((0, -0.0, 0))
            tree, _ = body.bvh('cabeca', HEAD + ['Neck'])
            d = Vector((s * 0.35, -1, 0)).normalized()
            r = cast_out_in(tree, Vector((0, mk.head_c.y, zc + 0.014)), d, far=0.3) or 0.09
            p0 = Vector((0, mk.head_c.y, zc + 0.014)) + d * (r + 0.004)
            d2 = Vector((s * 0.9, -0.5, 0)).normalized()
            r2 = cast_out_in(tree, Vector((0, mk.head_c.y, zc - 0.005)), d2, far=0.3) or 0.09
            p1 = Vector((0, mk.head_c.y, zc - 0.005)) + d2 * (r2 + 0.004)
            cylinder(P, p0, p1, 0.007, n=5, r2=0.004)
    return P


def mask(body, mk, eyes, off=0.006, cell='mascara', name='mascara', half='direita'):
    """meia máscara ornamentada sobre olhos e testa (detetive)"""
    P = Piece(name, cell, skin='rigid', bone='Head')
    ez = (eyes[0][2] + eyes[1][2]) / 2
    sgn = -1 if half == 'direita' else 1
    def pred(p):
        if half == 'toda':
            return (mk.neck1 - 0.01 < p[2] < ez + 0.07) and p[1] < mk.head_c.y - 0.02
        if half == 'domino':
            # faixa larga sobre os dois olhos e a testa baixa, com furos nos olhos (as pálpebras piscam por baixo)
            if not (ez - 0.024 < p[2] < ez + 0.05 and p[1] < mk.head_c.y - 0.01): return False
            if abs(p[0]) < 0.022 and p[2] < ez - 0.004: return False  # nariz livre
            return all(math.hypot(p[0] - e[0], (p[2] - e[2]) * 1.3) > 0.021 for e in eyes)
        return (ez - 0.03 < p[2] < ez + 0.055) and p[1] < mk.head_c.y - 0.03 and (p[0] * sgn > -0.02)
    shell(body, P, ['Head'], off, pred=pred)
    if half == 'domino':
        # asas nas têmporas: a silhueta da máscara lê de longe mesmo quando o rosto vira pontos
        ey = min(e[1] for e in eyes)
        for sx in (-1, 1):
            ex = max(abs(e[0]) for e in eyes)
            root_t, root_b = Vector((sx * (ex + 0.03), ey + 0.03, ez + 0.035)), Vector((sx * (ex + 0.035), ey + 0.035, ez - 0.012))
            tip = Vector((sx * (ex + 0.07), ey + 0.075, ez + 0.06))
            mid = Vector((sx * (ex + 0.06), ey + 0.065, ez + 0.012))
            V = [tuple(root_b), tuple(root_t), tuple(tip), tuple(mid)]
            F = [[0, 1, 2, 3], [3, 2, 1, 0]]
            P.add(V, F, [[(0, 0), (0, 1), (1, 1), (1, 0)], [(1, 0), (1, 1), (0, 1), (0, 0)]])
    return P


# ------------------------------------------------------------- adereços (rígidos num osso)
def hand_grip(body, side):
    s = 'Left' if side == 'L' else 'Right'
    h = body.head(s + 'Hand'); f = body.head(s + 'FingerBase')
    return h.lerp(f, 0.75), (f - h).normalized()


def lantern(body, side='L', scale=1.0, cell_metal='metal', cell_glow='brilho', name='lampiao', hang=0.0):
    """lampião âmbar pendurado na mão: alça, tampa, gaiola de quatro hastes, vidro emissivo, base"""
    s = 'Left' if side == 'L' else 'Right'
    g, d = hand_grip(body, side)
    P = Piece(name, cell_metal, skin='rigid', bone=s + 'Hand')
    G = Piece(name + '_vidro', cell_glow, skin='rigid', bone=s + 'Hand', mat='brilho')
    k = scale
    top = g + Vector((0, 0, -0.02 - hang))
    # alça em arco
    A = [math.pi * i / 6 for i in range(7)]
    arc = [top + Vector((0.035 * k * math.cos(a), 0, -0.04 * k + 0.04 * k * math.sin(a))) for a in A]
    for a_, b_ in zip(arc, arc[1:]): cylinder(P, a_, b_, 0.0035 * k, n=4, cap=False)
    cap_z = top.z - 0.045 * k
    cylinder(P, Vector((top.x, top.y, cap_z)), Vector((top.x, top.y, cap_z - 0.035 * k)), 0.012 * k, n=8, r2=0.045 * k)
    body_top = cap_z - 0.035 * k; body_bot = body_top - 0.11 * k
    for i in range(4):
        a = math.pi / 4 + i * math.pi / 2
        o = Vector((math.cos(a) * 0.042 * k, math.sin(a) * 0.042 * k, 0))
        cylinder(P, Vector((top.x, top.y, body_top)) + o, Vector((top.x, top.y, body_bot)) + o, 0.004 * k, n=4, cap=False)
    cylinder(G, Vector((top.x, top.y, body_top - 0.004)), Vector((top.x, top.y, body_bot + 0.004)), 0.036 * k, n=8, r2=0.034 * k)
    cylinder(P, Vector((top.x, top.y, body_bot)), Vector((top.x, top.y, body_bot - 0.022 * k)), 0.047 * k, n=8, r2=0.038 * k)
    return [P, G]


def staff(body, side='R', length=1.7, kind='cajado', cell='madeira', cell_metal='metal', name='haste', head=None):
    """haste vertical na mão (cajado, alabarda, bengala). head: 'alabarda' | 'anel' | 'bengala' | None"""
    s = 'Left' if side == 'L' else 'Right'
    g, d = hand_grip(body, side)
    P = Piece(name, cell, skin='rigid', bone=s + 'Hand')
    M = Piece(name + '_ponta', cell_metal, skin='rigid', bone=s + 'Hand')
    bot = Vector((g.x, g.y, 0.0))
    topv = Vector((g.x, g.y, length))
    if kind == 'bengala':
        bot = Vector((g.x, g.y - 0.02, 0.0)); topv = Vector((g.x, g.y, g.z + 0.02))
    cylinder(P, bot, topv, 0.014 if kind != 'bengala' else 0.011, n=6)
    if head == 'alabarda':
        # lâmina em meia-lua e ponta
        A = [math.radians(lerp(-70, 70, i / 6)) for i in range(7)]
        hz = length - 0.18
        outer = [Vector((g.x - 0.03 - 0.13 * math.cos(a), g.y, hz + 0.13 * math.sin(a))) for a in A]
        inner = [Vector((g.x - 0.008, g.y, hz + 0.1 * math.sin(a))) for a in A]  # aresta presa à haste
        V = [tuple(p + Vector((0, 0.004, 0))) for p in outer + inner] + [tuple(p - Vector((0, 0.004, 0))) for p in outer + inner]
        F = []
        n7 = 7
        for i in range(6):
            F.append([i, i + 1, n7 + i + 1, n7 + i]); F.append([14 + n7 + i, 14 + n7 + i + 1, 14 + i + 1, 14 + i])
            F.append([i + 1, i, 14 + i, 14 + i + 1])
        M.add(V, F, [[(0, 0), (1, 0), (1, 1), (0, 1)]] * len(F))
        cylinder(M, topv, topv + Vector((0, 0, 0.2)), 0.02, n=4, r2=0.001)
    elif head == 'anel':
        c = topv + Vector((0, 0, 0.12))
        for i in range(10):
            a0, a1 = TAU * i / 10, TAU * (i + 1) / 10
            cylinder(M, c + Vector((0.11 * math.cos(a0), 0, 0.11 * math.sin(a0))), c + Vector((0.11 * math.cos(a1), 0, 0.11 * math.sin(a1))), 0.008, n=4, cap=False)
        cylinder(M, c + Vector((-0.15, 0, 0)), c + Vector((0.15, 0, 0)), 0.006, n=4, cap=False)
        cylinder(M, c + Vector((0, 0, -0.15)), c + Vector((0, 0, 0.18)), 0.006, n=4, cap=False)
    elif head == 'bengala':
        cylinder(M, topv, topv + Vector((0, -0.07, 0.01)), 0.016, n=6)
    return [P, M]


def book(body, side='R', size=(0.17, 0.04, 0.23), cell='livro', name='livro', at='hand'):
    s = 'Left' if side == 'L' else 'Right'
    g, d = hand_grip(body, side)
    P = Piece(name, cell, skin='rigid', bone=s + 'Hand')
    c = g + Vector((0, -0.02, -0.02))
    box(P, c, size[1] / 2, size[0] / 2, size[2] / 2)
    return P


def keys(body, mk, side=1, cell='metal', name='chaves'):
    P = Piece(name, cell, allow={'Hips', 'LowerBack', 'LeftUpLeg' if side > 0 else 'RightUpLeg'})
    tree, _ = body.bvh('torso', TORSO + ['LeftUpLeg', 'RightUpLeg'])
    z = mk.hip
    a = side * 0.9
    c = spine_center(body, z)
    dd = Vector((math.sin(a), -math.cos(a), 0))
    r = cast_out_in(tree, c, dd) or 0.17
    ring_c = c + dd * (r + 0.03)
    A = angles_n(8)
    for i in range(8):
        a0, a1 = A[i], A[(i + 1) % 8]
        cylinder(P, ring_c + Vector((0.025 * math.cos(a0), 0, 0.025 * math.sin(a0))), ring_c + Vector((0.025 * math.cos(a1), 0, 0.025 * math.sin(a1))), 0.003, n=4, cap=False)
    for i in range(3):
        o = Vector(((i - 1) * 0.018, -0.004, -0.025))
        cylinder(P, ring_c + o, ring_c + o + Vector(((i - 1) * 0.01, 0, -0.07)), 0.004, n=4)
    return P


def censer(body, side='L', cell='metal', cell_glow='brilho', name='incensario'):
    s = 'Left' if side == 'L' else 'Right'
    g, d = hand_grip(body, side)
    P = Piece(name, cell, skin='rigid', bone=s + 'Hand')
    for i in range(3):
        a = TAU * i / 3
        cylinder(P, g, g + Vector((0.03 * math.cos(a), 0.03 * math.sin(a), -0.28)), 0.0018, n=3, cap=False)
    c = g + Vector((0, 0, -0.32))
    sphere(P, c, 0.045, 0.045, 0.05, nu=8, nv=5)
    cylinder(P, c + Vector((0, 0, 0.04)), c + Vector((0, 0, 0.075)), 0.02, n=6, r2=0.004)
    return [P]


def pouch(body, mk, a, z, size=(0.06, 0.035, 0.07), cell='couro', name='bolsinha'):
    P = Piece(name, cell, allow=set(TORSO + ['LeftUpLeg', 'RightUpLeg']))
    tree, _ = body.bvh('torso', TORSO + ['LeftUpLeg', 'RightUpLeg'])
    c = spine_center(body, z)
    dd = Vector((math.sin(a), -math.cos(a), 0))
    r = cast_out_in(tree, c, dd) or 0.17
    box(P, c + dd * (r + 0.02 + size[1] / 2), size[0] / 2, size[1] / 2, size[2] / 2, rot=Matrix.Rotation(-a, 3, 'Z'))
    return P


def tool_on_belt(body, mk, a, z, kind='alicate', cell='metal', name='ferramenta'):
    P = Piece(name, cell, allow={'Hips', 'LowerBack', 'LeftUpLeg', 'RightUpLeg'})
    tree, _ = body.bvh('torso', TORSO + ['LeftUpLeg', 'RightUpLeg'])
    c = spine_center(body, z)
    dd = Vector((math.sin(a), -math.cos(a), 0))
    r = cast_out_in(tree, c, dd) or 0.17
    p = c + dd * (r + 0.03)
    if kind == 'alicate':
        cylinder(P, p + Vector((-0.008, 0, 0.02)), p + Vector((-0.012, 0, -0.11)), 0.0045, n=4)
        cylinder(P, p + Vector((0.008, 0, 0.02)), p + Vector((0.012, 0, -0.11)), 0.0045, n=4)
        box(P, p + Vector((0, 0, 0.035)), 0.012, 0.004, 0.02)
    else:
        cylinder(P, p + Vector((0, 0, 0.03)), p + Vector((0, 0, -0.12)), 0.005, n=4)
        box(P, p + Vector((0, 0, 0.04)), 0.016, 0.004, 0.012)
    return P


# ------------------------------------------------------------- adereços do elenco completo
def _head_dir_point(body, mk, a, ph_deg, extra=0.0):
    tree, _ = body.bvh('cabeca', HEAD + ['Neck'])
    c = mk.head_c
    ph = math.radians(ph_deg)
    d = Vector((math.sin(ph) * math.sin(a), -math.sin(ph) * math.cos(a), math.cos(ph)))
    r = cast_out_in(tree, c, d, far=0.45) or 0.1
    return c + d * (r + extra), d


def mushrooms(body, mk, where='chapeu', n=5, size=0.035, seed=3, hat_piece=None, cell='brilho', name='cogumelos'):
    """cogumelos violeta luminosos (herbalista: na aba do chapéu; carcereiro: nos ombros)"""
    rnd = random.Random(seed)
    bone = 'Head' if where == 'chapeu' else 'Spine1'
    P = Piece(name, 'cogumelo', skin='rigid', bone=bone, mat='brilho')
    S = Piece(name + '_pe', 'osso_claro', skin='rigid', bone=bone)
    for i in range(n):
        if where == 'chapeu':
            a = rnd.uniform(-2.2, -0.6) if i % 2 else rnd.uniform(0.6, 2.4)
            r = rnd.uniform(0.09, 0.17)
            base = Vector((math.sin(a) * r, mk.head_c.y - math.cos(a) * r, mk.top - 0.05 + 0.01))
        else:
            sx = 1 if i % 2 else -1
            base = Vector((sx * rnd.uniform(0.1, 0.2), rnd.uniform(-0.03, 0.06), mk.shoulder + rnd.uniform(0.02, 0.08)))
        s = size * rnd.uniform(0.6, 1.3)
        top = base + Vector((rnd.uniform(-0.01, 0.01), rnd.uniform(-0.01, 0.01), s * 1.6))
        cylinder(S, base, top, s * 0.22, n=5)
        sphere(P, top, s, s, s * 0.45, nu=7, nv=4)
    return [P, S]


def goggles(body, mk, eyes, cell='metal', name='oculos_protecao'):
    """óculos de proteção na testa"""
    P = Piece(name, cell, skin='rigid', bone='Head')
    G = Piece(name + '_lente', 'lente', skin='rigid', bone='Head')
    for e in eyes:
        p, d = _head_dir_point(body, mk, -0.35 if e[0] < 0 else 0.35, 52, 0.012)
        cylinder(P, p - d * 0.006, p + d * 0.022, 0.022, n=8, r2=0.02)
        cylinder(G, p + d * 0.021, p + d * 0.024, 0.017, n=8)
    # tira
    A = angles_n(16)
    tree, _ = body.bvh('cabeca', HEAD + ['Neck'])
    pts = []
    for a in A:
        p, d = _head_dir_point(body, mk, a, 55, 0.008)
        pts.append(tuple(p))
    R0 = np.array(pts); R1 = R0 + np.array([0, 0, 0.012])
    loft(P, [R0, R1])
    return [P, G]


def backpack(body, mk, rolls=3, cell='couro', name='mochila'):
    """mochila de cartógrafo com rolos de mapa"""
    P = Piece(name, cell, allow={'Spine', 'Spine1', 'LowerBack'})
    R = Piece(name + '_rolos', 'papel', allow={'Spine', 'Spine1'})
    tree, _ = body.bvh('torso', TORSO + ['LeftUpLeg', 'RightUpLeg'])
    z = mk.chest - 0.05
    c = spine_center(body, z)
    r = cast_out_in(tree, c, Vector((0, 1, 0))) or 0.12
    bc = c + Vector((0, r + 0.08, 0))
    box(P, bc, 0.14, 0.07, 0.17)
    for i in range(rolls):
        x = (i - (rolls - 1) / 2) * 0.06
        a = bc + Vector((x, 0.02, 0.12)); b = a + Vector((x * 0.5, 0.04, 0.32 + 0.04 * (i % 2)))
        cylinder(R, a, b, 0.024, n=6)
    return [P, R]


def small_bell(body, mk, a=0.9, z=None, cell='metal', name='sino'):
    P = Piece(name, cell, allow={'Hips', 'LowerBack', 'Spine'})
    tree, _ = body.bvh('torso', TORSO + ['LeftUpLeg', 'RightUpLeg'])
    z = z or mk.hip + 0.05
    c = spine_center(body, z)
    d = Vector((math.sin(a), -math.cos(a), 0))
    r = cast_out_in(tree, c, d) or 0.17
    p = c + d * (r + 0.05)
    cylinder(P, p, p - Vector((0, 0, 0.06)), 0.012, n=8, r2=0.035)
    sphere(P, p - Vector((0, 0, 0.065)), 0.008, 0.008, 0.008, nu=5, nv=3)
    return P


def bell_helm(body, mk, cell='bronze', name='elmo_sino', h=0.42, r=0.2):
    """elmo de ferro em forma de sino que cobre toda a cabeça (carrasco)"""
    P = Piece(name, cell, skin='rigid', bone='Head')
    c = mk.head_c
    A = angles_n(16)
    rings = []
    z0 = mk.neck1 - 0.04
    for i in range(7):
        t = i / 6
        zz = z0 + h * t
        rr = r * (1.25 - 0.55 * t ** 0.8) if t < 0.95 else 0.03
        rings.append(ring_points(Vector((0, c.y + 0.01, zz)), [rr] * 16, A))
    loft(P, rings, cap_top=True, cap_bot=False)
    # aro inferior grosso
    loft(P, [ring_points(Vector((0, c.y + 0.01, z0 - 0.02)), [r * 1.32] * 16, A), rings[0]])
    return P


def cage_helm(body, mk, cell='metal', name='elmo_grade'):
    """capacete de mineiro com grade frontal e lanterna (carcereiro)"""
    P = Piece(name, cell, skin='rigid', bone='Head')
    c = mk.head_c
    tree, _ = body.bvh('cabeca', HEAD + ['Neck'])
    A = angles_n(14)
    rings = []
    for j, ph in enumerate([120, 95, 70, 45, 20, 5]):
        R = []
        for a in A:
            phr = math.radians(ph)
            d = Vector((math.sin(phr) * math.sin(a), -math.sin(phr) * math.cos(a), math.cos(phr)))
            rr = (cast_out_in(tree, c, d, far=0.45) or 0.1) + 0.035
            R.append(tuple(c + d * rr))
        rings.append(np.array(R))
    loft(P, rings, cap_top=True, gaps=lambda i, k: abs(((k + 0.5) / 14 * TAU + math.pi) % TAU - math.pi) < 0.8 and i < 3)
    # grade: barras verticais e horizontais na frente
    for k in range(-3, 4):
        a = k * 0.2
        p0, _ = _head_dir_point(body, mk, a, 118, 0.05)
        p1, _ = _head_dir_point(body, mk, a, 62, 0.05)
        cylinder(P, p0, p1, 0.004, n=4, cap=False)
    for ph in (75, 95, 112):
        pts = [_head_dir_point(body, mk, a, ph, 0.052)[0] for a in np.linspace(-0.7, 0.7, 6)]
        for a_, b_ in zip(pts, pts[1:]): cylinder(P, a_, b_, 0.004, n=4, cap=False)
    return P


def blade(body, side='R', length=0.95, kind='florete', cell='metal', name='lamina'):
    """lâmina na mão, alinhada ao osso da mão (aponta para baixo e à frente no repouso)"""
    s = 'Left' if side == 'L' else 'Right'
    g, d = hand_grip(body, side)
    P = Piece(name, cell, skin='rigid', bone=s + 'Hand')
    P.meta['hold'] = 'mao'
    d = (d + Vector((0, -0.4, -0.2))).normalized()
    if kind == 'florete':
        cylinder(P, g - d * 0.09, g + d * 0.02, 0.012, n=6)
        for i in range(8):
            a0, a1 = TAU * i / 8, TAU * (i + 1) / 8
            X, Y = limb_frame(d)
            cylinder(P, g + d * 0.03 + X * 0.05 * math.cos(a0) + Y * 0.05 * math.sin(a0), g + d * 0.03 + X * 0.05 * math.cos(a1) + Y * 0.05 * math.sin(a1), 0.003, n=3, cap=False)
        cylinder(P, g + d * 0.03, g + d * length, 0.006, n=4, r2=0.001)
    elif kind == 'punhal':
        cylinder(P, g - d * 0.06, g + d * 0.02, 0.012, n=6)
        cylinder(P, g + d * 0.02, g + d * 0.28, 0.016, n=4, r2=0.001)
    return P


def hammer(body, side='R', cell='madeira', cell_metal='bronze', name='martelo', length=1.25):
    """martelo de bronze com cabeça de sino, haste apoiada no chão (carrasco)"""
    s = 'Left' if side == 'L' else 'Right'
    g, d = hand_grip(body, side)
    P = Piece(name, cell, skin='rigid', bone=s + 'Hand')
    M = Piece(name + '_cabeca', cell_metal, skin='rigid', bone=s + 'Hand')
    top = g + Vector((0, 0, 0.12))
    bot = Vector((g.x + 0.05, g.y - 0.1, 0.25))
    cylinder(P, top, bot, 0.02, n=6)
    A = angles_n(12)
    c = bot
    rings = [ring_points(c + Vector((0, 0, 0.05)), [0.07] * 12, A), ring_points(c + Vector((0, 0, -0.08)), [0.11] * 12, A),
             ring_points(c + Vector((0, 0, -0.2)), [0.17] * 12, A), ring_points(c + Vector((0, 0, -0.24)), [0.19] * 12, A)]
    loft(M, rings[::-1], cap_bot=True, cap_top=True)
    return [P, M]


def hook_pick(body, side='R', cell='madeira', cell_metal='metal', name='gancho'):
    s = 'Left' if side == 'L' else 'Right'
    g, d = hand_grip(body, side)
    P = Piece(name, cell, skin='rigid', bone=s + 'Hand')
    M = Piece(name + '_ponta', cell_metal, skin='rigid', bone=s + 'Hand')
    a = g + Vector((0, 0, 0.25)); b = g + Vector((0.02, -0.05, -0.75))
    cylinder(P, a, b, 0.02, n=6)
    pts = [b + Vector((0.18 * math.sin(t), -0.05, 0.18 * (1 - math.cos(t)) - 0.02)) for t in np.linspace(0, 2.4, 6)]
    for x, y in zip(pts, pts[1:]): cylinder(M, x, y, 0.016, n=4, r2=0.012)
    return [P, M]


def halo(body, mk, rays=14, r=0.3, cell='bronze', name='aureola'):
    """aro de raios góticos atrás da cabeça (matriarca)"""
    P = Piece(name, cell, skin='rigid', bone='Head')
    c = mk.head_c + Vector((0, 0.14, 0.04))
    for i in range(rays):
        a0, a1 = TAU * i / rays, TAU * (i + 1) / rays
        p0 = c + Vector((r * math.cos(a0), 0, r * math.sin(a0))); p1 = c + Vector((r * math.cos(a1), 0, r * math.sin(a1)))
        cylinder(P, p0, p1, 0.007, n=4, cap=False)
        tip = c + Vector(((r + 0.12 + 0.06 * (i % 2)) * math.cos(a0), 0, (r + 0.12 + 0.06 * (i % 2)) * math.sin(a0)))
        cylinder(P, p0, tip, 0.008, n=4, r2=0.001)
    return P


def crown(body, mk, spires=9, h=0.3, cell='bronze', name='coroa'):
    """coroa de agulhas e janelas góticas (chefe)"""
    P = Piece(name, cell, skin='rigid', bone='Head')
    tree, _ = body.bvh('cabeca', HEAD + ['Neck'])
    c = mk.head_c
    z = mk.top - 0.06
    A = angles_n(spires)
    cc = Vector((0, c.y, z))
    rh = [(cast_out_in(tree, cc, Vector((math.sin(a), -math.cos(a), 0)), far=0.4) or 0.1) + 0.02 for a in angles_n(18)]
    loft(P, [ring_points(cc, rh, angles_n(18)), ring_points(cc + Vector((0, 0, 0.05)), [x + 0.01 for x in rh], angles_n(18))])
    for i, a in enumerate(A):
        rr = max(rh) + 0.01
        base = cc + Vector((math.sin(a) * rr, -math.cos(a) * rr, 0.04))
        hh = h * (1.0 if i == 0 else 0.6 + 0.3 * ((i % 3) / 2))
        cylinder(P, base, base + Vector((math.sin(a) * 0.04, -math.cos(a) * 0.04, hh)), 0.018, n=4, r2=0.002)
    return P


def crystals(body, mk, n=10, seed=4, cell='gelo', name='cristais'):
    """cristais de gelo nas mangas e ombros (errante do gelo)"""
    rnd = random.Random(seed)
    P = Piece(name, cell, allow={'LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm', 'Spine1', 'LeftShoulder', 'RightShoulder'})
    for i in range(n):
        s = 'Left' if i % 2 else 'Right'
        a = body.head(s + 'Arm'); b = body.head(s + 'Hand')
        t = rnd.uniform(0.0, 0.9)
        p = a.lerp(b, t)
        out = Vector((1 if s == 'Left' else -1, rnd.uniform(-0.6, 0.6), rnd.uniform(-0.5, 0.2))).normalized()
        base = p + out * 0.05
        cylinder(P, base, base + out * rnd.uniform(0.05, 0.11) + Vector((0, 0, -0.03)), 0.014, n=4, r2=0.001)
    return P


def chains(body, mk, n=4, cell='metal', name='correntes', bells=True):
    """correntes com pequenos sinos penduradas no cinto (carrasco)"""
    P = Piece(name, cell, allow={'Hips', 'LowerBack', 'LeftUpLeg', 'RightUpLeg'})
    tree, _ = body.bvh('torso', TORSO + ['LeftUpLeg', 'RightUpLeg'])
    for i in range(n):
        a = -1.2 + 2.4 * i / max(1, n - 1)
        c = spine_center(body, mk.waist)
        d = Vector((math.sin(a), -math.cos(a), 0))
        r = cast_out_in(tree, c, d) or 0.18
        p = c + d * (r + 0.06)
        q = p + Vector((0, 0, -0.2 - 0.05 * (i % 2)))
        for k in range(5):
            cylinder(P, p.lerp(q, k / 5), p.lerp(q, (k + 1) / 5), 0.006, n=4, cap=False)
        if bells:
            cylinder(P, q, q - Vector((0, 0, 0.05)), 0.01, n=6, r2=0.03)
    return P
