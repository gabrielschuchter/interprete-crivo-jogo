# Criaturas sem corpo humano (caminho A: modelagem procedural + rig próprio + animação por código).
# Uso: python3 tools/chars/criatura.py <nome> <saida.glb>   nomes: espectro_lanterna
# Convenção dos ossos: rolagem alinhada para a frente (-Y), então girar +X em qualquer osso leva a ponta para a frente.
# Clipes com os nomes que src/entities/enemy.ts já pede: idle, listen, walk, run, heavy (antecipação 42% + golpe),
# attack, cast, hit, talk, die.
import bpy, sys, os, math, json, time, random
import numpy as np
from mathutils import Vector, Euler, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import geo, paint
from geo import Piece, loft, ring_points, angles_n, cylinder, sphere, box, TAU

T0 = time.time()
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
NAME, OUT = argv[0], argv[1]
log = lambda *a: print('[criatura]', *a, flush=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.fps = 30
FPS = 30


def lerp(a, b, t): return a + (b - a) * t
def sm(t): t = max(0.0, min(1.0, t)); return t * t * (3 - 2 * t)


# ------------------------------------------------------------------ rig
class Rig:
    def __init__(self, name='Rig'):
        arm = bpy.data.armatures.new(name)
        self.ob = bpy.data.objects.new(name, arm)
        sc.collection.objects.link(self.ob)
        bpy.context.view_layer.objects.active = self.ob
        bpy.ops.object.mode_set(mode='EDIT')
        self.eb = arm.edit_bones
        self.seg = {}

    def bone(self, name, head, tail, parent=None, deform=True):
        b = self.eb.new(name)
        b.head = Vector(head); b.tail = Vector(tail)
        b.align_roll(Vector((0, -1, 0)) if abs((b.tail - b.head).normalized().y) < 0.9 else Vector((0, 0, 1)))
        if parent: b.parent = self.eb[parent]; b.use_connect = False
        b.use_deform = deform
        self.seg[name] = (Vector(head), Vector(tail))
        return b

    def done(self):
        bpy.ops.object.mode_set(mode='POSE')
        for pb in self.ob.pose.bones: pb.rotation_mode = 'XYZ'
        bpy.ops.object.mode_set(mode='OBJECT')


def seg_dist(p, a, b):
    ab = b - a
    t = max(0.0, min(1.0, (p - a).dot(ab) / max(ab.length_squared, 1e-9)))
    return (a + ab * t - p).length


def skin(ob, rig, plan):
    """plan: lista de (faixa_inicio, faixa_fim, ossos permitidos ou 'rigid:Osso')"""
    me = ob.data
    names = list(rig.seg)
    for n in names: ob.vertex_groups.new(name=n)
    gi = {n: i for i, n in enumerate(names)}
    for a, b, allow in plan:
        for i in range(a, b):
            p = me.vertices[i].co
            if isinstance(allow, str) and allow.startswith('rigid:'):
                ob.vertex_groups[gi[allow[6:]]].add([i], 1.0, 'REPLACE'); continue
            ds = sorted(((seg_dist(p, *rig.seg[n]), n) for n in allow))[:3]
            w = [1 / (d + 0.02) ** 4 for d, _ in ds]
            s = sum(w)
            for (d, n), wv in zip(ds, w):
                if wv / s > 0.02: ob.vertex_groups[gi[n]].add([i], wv / s, 'REPLACE')
    ob.parent = rig.ob
    md = ob.modifiers.new('Armature', 'ARMATURE'); md.object = rig.ob


def bake_clip(rig, name, dur, fn, loop=True):
    """fn(t, u) -> {osso: (rx, ry, rz) ou ((rx,ry,rz), (lx,ly,lz)) ou (..., ..., escala)}; u = t/dur"""
    ob = rig.ob
    act = bpy.data.actions.new(name); act.use_fake_user = True
    ob.animation_data_create(); ob.animation_data.action = act
    n = max(2, int(round(dur * FPS)))
    for f in range(n + 1):
        t = f / FPS
        pose = fn(t, f / n)
        for pb in ob.pose.bones:
            v = pose.get(pb.name)
            rot, loc, scl = (0, 0, 0), (0, 0, 0), (1, 1, 1)
            if v is not None:
                if isinstance(v[0], (tuple, list)):
                    rot = v[0]; loc = v[1] if len(v) > 1 else loc; scl = v[2] if len(v) > 2 else scl
                else:
                    rot = v
            pb.rotation_euler = Euler(rot, 'XYZ'); pb.location = Vector(loc); pb.scale = Vector(scl if not isinstance(scl, (int, float)) else (scl,) * 3)
            pb.keyframe_insert('rotation_euler', frame=f + 1)
            pb.keyframe_insert('location', frame=f + 1)
            pb.keyframe_insert('scale', frame=f + 1)
    ob.animation_data.action = None
    tr = ob.animation_data.nla_tracks.new(); tr.name = name
    st = tr.strips.new(name, 1, act); st.name = name; tr.mute = True
    return act


def mat_atlas(name, img, rough=0.92, emit=None):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; bs = nt.nodes['Principled BSDF']
    tx = nt.nodes.new('ShaderNodeTexImage'); tx.image = img
    nt.links.new(tx.outputs['Color'], bs.inputs['Base Color'])
    bs.inputs['Roughness'].default_value = rough; bs.inputs['Metallic'].default_value = 0
    if emit:
        nt.links.new(tx.outputs['Color'], bs.inputs['Emission Color']); bs.inputs['Emission Strength'].default_value = emit
    m.use_backface_culling = False
    m['ps2_alpha'] = 'OPAQUE'
    return m


def make_image(name, px):
    h, w = px.shape[:2]
    img = bpy.data.images.new(name, w, h, alpha=False)
    rgba = np.ones((h, w, 4), np.float32); rgba[..., :3] = px[::-1]
    img.pixels.foreach_set(rgba.ravel()); img.pack()
    return img


from criatura_paint import paint_shroud


# ================================================================== MOB_02 Espectro da Lanterna
def espectro_lanterna():
    rnd = random.Random(2)
    rig = Rig()
    H0 = 0.32  # flutua acima do chão
    rig.bone('Root', (0, 0, 0), (0, 0, 0.2))
    rig.bone('Hips', (0, 0, 0.95), (0, 0, 1.15), 'Root')
    rig.bone('Spine', (0, 0, 1.15), (0, 0, 1.38), 'Hips')
    rig.bone('Spine1', (0, 0, 1.38), (0, 0, 1.58), 'Spine')
    rig.bone('Neck', (0, 0, 1.58), (0, -0.02, 1.68), 'Spine1')
    rig.bone('Head', (0, -0.02, 1.68), (0, -0.04, 1.92), 'Neck')
    for s, X in (('Left', 1), ('Right', -1)):
        rig.bone(s + 'Shoulder', (0.04 * X, 0, 1.54), (0.17 * X, 0, 1.53), 'Spine1')
        rig.bone(s + 'Arm', (0.17 * X, 0, 1.53), (0.3 * X, -0.06, 1.28), s + 'Shoulder')
        rig.bone(s + 'ForeArm', (0.3 * X, -0.06, 1.28), (0.36 * X, -0.2, 1.1), s + 'Arm')
        rig.bone(s + 'Hand', (0.36 * X, -0.2, 1.1), (0.37 * X, -0.24, 1.0), s + 'ForeArm')
    NR = 8
    ribbons = []
    for k in range(NR):
        a = TAU * k / NR + 0.2
        r0 = 0.2
        base = Vector((r0 * math.sin(a), -r0 * math.cos(a), 1.02))
        chain = []
        prev = 'Hips'
        L = 0.78 + 0.12 * rnd.random()
        for j in range(3):
            h = base + Vector((math.sin(a) * 0.06 * j, -math.cos(a) * 0.06 * j, -L * j / 3))
            t = base + Vector((math.sin(a) * 0.06 * (j + 1), -math.cos(a) * 0.06 * (j + 1), -L * (j + 1) / 3))
            nm = f'Fita{k}_{j}'
            rig.bone(nm, h, t, prev); prev = nm; chain.append(nm)
        ribbons.append((a, chain, base, L))
    rig.done()

    AT = paint.Atlas(512, seed=5)
    for key, wh in (('manto', (256, 256)), ('capuz', (128, 128)), ('vazio', (32, 32)), ('osso', (32, 32)), ('metal', (32, 32)), ('brilho', (32, 32)), ('olho', (16, 16))):
        AT.alloc(key, *wh)
    paint_shroud(AT, 'manto', '7a746c', 'b0a898')
    paint_shroud(AT, 'capuz', '6a645e', 'a09888')
    paint.paint_flat(AT, 'vazio', '050407', 0.05)
    paint.paint_flat(AT, 'osso', 'a8a090', 0.3)
    paint.paint_metal(AT, 'metal', '7a5a30', 0.45)
    paint.paint_glow(AT, 'brilho', 'ffb35a')
    paint.paint_glow(AT, 'olho', 'ffd28a')

    plan_roupa, plan_brilho = [], []
    roupa, brilho = [], []

    def add(lst, plan, p, allow):
        lst.append((p, allow))

    # capuz pontudo com vazio
    P = Piece('capuz', 'capuz')
    c = Vector((0, -0.01, 1.8))
    A = angles_n(14)
    rings = []
    for j, ph in enumerate([150, 128, 104, 80, 56, 34, 16]):
        phr = math.radians(ph)
        R = []
        for a in A:
            back = max(0.0, math.cos(a - math.pi))
            rr = 0.15 + 0.02 * math.sin(phr) + 0.07 * back * sm((ph - 10) / 60) * (1 - sm((ph - 100) / 40))
            R.append(c + Vector((math.sin(phr) * math.sin(a) * rr * 1.05, -math.sin(phr) * math.cos(a) * rr, math.cos(phr) * rr * 1.25)))
        rings.append(np.array([tuple(p) for p in R]))
    tip = c + Vector((0, 0.14, 0.17))
    loft(P, rings, gaps=lambda i, k: abs(((k + 0.5) / 14 * TAU + math.pi) % TAU - math.pi) < 0.75 and 1 <= i <= 4)
    ci = P.add([tuple(tip)], [], [])
    top = rings[-1]
    off = len(P.v) - 1 - 15 * 1  # índice aproximado não é usado; ponta: cone a partir do último anel
    Pt = Piece('ponta', 'capuz')
    loft(Pt, [top, np.array([tuple(Vector(p).lerp(tip, 0.6)) for p in top]), np.array([tuple(tip)] * len(top))])
    roupa += [(P, ['Head', 'Neck']), (Pt, 'rigid:Head')]
    V = Piece('vazio', 'vazio')
    sphere(V, c + Vector((0, 0.02, -0.01)), 0.12, 0.11, 0.15, nu=10, nv=6)
    roupa.append((V, 'rigid:Head'))
    # manto superior: pescoço até a cintura, elíptico (mais largo nos ombros)
    M = Piece('manto', 'manto')
    A = angles_n(16)
    rings = []
    prof = [(1.0, 0.27, 0.2), (1.12, 0.25, 0.18), (1.25, 0.24, 0.17), (1.38, 0.25, 0.17), (1.5, 0.27, 0.17), (1.58, 0.22, 0.15), (1.66, 0.12, 0.11), (1.72, 0.1, 0.1)]
    for z, rx, ry in prof:
        rings.append(np.array([(rx * math.sin(a), -ry * math.cos(a), z) for a in A]))
    loft(M, rings, vrange=(0.35, 1.0))
    roupa.append((M, ['Hips', 'Spine', 'Spine1', 'Neck', 'LeftShoulder', 'RightShoulder']))
    # saia interna contínua (cone escuro até meio caminho)
    S = Piece('saia', 'manto')
    rings = [np.array([(0.24 * math.sin(a), -0.17 * math.cos(a), 1.02) for a in A]),
             np.array([(0.2 * math.sin(a), -0.15 * math.cos(a), 0.7) for a in A]),
             np.array([(0.12 * math.sin(a), -0.1 * math.cos(a), 0.45) for a in A])]
    loft(S, rings[::-1], vrange=(0.0, 0.35))
    roupa.append((S, ['Hips'] + [r[1][0] for r in ribbons]))
    # fitas: painéis afunilados que pendem das correntes de ossos
    for k, (a, chain, base, L) in enumerate(ribbons):
        F = Piece(f'fita{k}', 'manto')
        n_ = 7
        rings = []
        for j in range(n_):
            t = j / (n_ - 1)
            p = base + Vector((math.sin(a) * 0.18 * t, -math.cos(a) * 0.18 * t, -L * t))
            w = 0.11 * (1 - 0.85 * t ** 1.3) + 0.004
            side = Vector((math.cos(a), math.sin(a), 0)) * w
            out = Vector((math.sin(a), -math.cos(a), 0)) * 0.004
            rings.append(np.array([tuple(p - side + out), tuple(p + side + out)]))
        rings = rings[::-1]
        # zigue-zague da ponta
        rings[0][0][2] += 0.04 * rnd.random(); rings[0][1][2] -= 0.05 * rnd.random()
        loft(F, rings, closed=False, vrange=(0.0, 0.6))
        roupa.append((F, ['Hips'] + chain))
    # mangas largas e rasgadas
    for s, X in (('Left', 1), ('Right', -1)):
        Q = Piece('manga' + s, 'manto')
        sh = Vector(rig.seg[s + 'Arm'][0]); el = Vector(rig.seg[s + 'ForeArm'][0]); wr = Vector(rig.seg[s + 'Hand'][0])
        pts = geo.polyline([sh + Vector((-0.04 * X, 0, 0.02)), el, wr + (wr - el).normalized() * 0.04], 6)
        rings = []
        for i, p in enumerate(pts):
            t = i / 5
            d = (pts[min(i + 1, 5)] - pts[max(i - 1, 0)])
            Xv, Yv = geo.limb_frame(d)
            r = 0.06 + 0.08 * t ** 1.5
            R = ring_points(p, [r] * 10, angles_n(10), frame=(Xv, Yv))
            if i == 5:
                for q in range(10): R[q][2] -= 0.05 + 0.07 * rnd.random() * (q % 2)
            rings.append(R)
        loft(Q, rings)
        roupa.append((Q, [s + 'Shoulder', s + 'Arm', s + 'ForeArm', 'Spine1']))
        # mão esquelética: palma e quatro dedos finos
        Hn = Piece('mao' + s, 'osso')
        hb, ht = Vector(rig.seg[s + 'Hand'][0]), Vector(rig.seg[s + 'Hand'][1])
        box(Hn, hb.lerp(ht, 0.4), 0.025, 0.018, 0.035)
        for f_ in range(4):
            o = Vector(((f_ - 1.5) * 0.012 * X, -0.01, 0))
            cylinder(Hn, ht + o, ht + o + Vector((0.01 * X * (f_ - 1.5), -0.03, -0.07)), 0.0045, n=4, r2=0.002)
        roupa.append((Hn, 'rigid:' + s + 'Hand'))
    # lampião na mão esquerda
    L_ = Piece('lampiao', 'metal'); G_ = Piece('vidro', 'brilho')
    g = Vector(rig.seg['LeftHand'][1]) + Vector((0, -0.02, -0.03))
    top = g + Vector((0, 0, -0.05))
    for i in range(6):
        a0, a1 = math.pi * i / 6, math.pi * (i + 1) / 6
        cylinder(L_, top + Vector((0.04 * math.cos(a0), 0, 0.045 * math.sin(a0))), top + Vector((0.04 * math.cos(a1), 0, 0.045 * math.sin(a1))), 0.004, n=4, cap=False)
    zc = top.z - 0.01
    cylinder(L_, Vector((top.x, top.y, zc)), Vector((top.x, top.y, zc - 0.04)), 0.014, n=8, r2=0.05)
    zt, zb = zc - 0.04, zc - 0.17
    for i in range(4):
        a = math.pi / 4 + i * math.pi / 2
        o = Vector((math.cos(a) * 0.046, math.sin(a) * 0.046, 0))
        cylinder(L_, Vector((top.x, top.y, zt)) + o, Vector((top.x, top.y, zb)) + o, 0.005, n=4, cap=False)
    cylinder(G_, Vector((top.x, top.y, zt - 0.004)), Vector((top.x, top.y, zb + 0.004)), 0.04, n=8, r2=0.037)
    cylinder(L_, Vector((top.x, top.y, zb)), Vector((top.x, top.y, zb - 0.025)), 0.052, n=8, r2=0.04)
    roupa.append((L_, 'rigid:LeftHand'))
    brilho.append((G_, 'rigid:LeftHand'))
    # dois pontos de brilho no vazio
    E = Piece('olhos', 'olho')
    for X in (1, -1):
        sphere(E, c + Vector((0.035 * X, -0.085, 0.0)), 0.012, 0.006, 0.008, nu=6, nv=4)
    brilho.append((E, 'rigid:Head'))

    # elevação: tudo flutua H0
    for lst in (roupa, brilho):
        for p, _ in lst:
            p.v = [(x, y, z + H0 - 0.0) for (x, y, z) in p.v]
    for k_ in list(rig.seg):
        h_, t_ = rig.seg[k_]
        if k_ != 'Root': rig.seg[k_] = (h_ + Vector((0, 0, H0)), t_ + Vector((0, 0, H0)))
    bpy.context.view_layer.objects.active = rig.ob
    bpy.ops.object.mode_set(mode='EDIT')
    for b in rig.ob.data.edit_bones:
        if b.name != 'Root': b.head.z += H0; b.tail.z += H0
    bpy.ops.object.mode_set(mode='OBJECT')

    px = paint.ps2_grade(AT.px.copy(), sat=0.8, levels=31)
    img = make_image('espectro_ps2', px)
    MR = mat_atlas('roupa_ps2', img); MB = mat_atlas('brilho_ps2', img, rough=0.5, emit=3.0)
    for lst, mat, nm in ((roupa, MR, 'roupa'), (brilho, MB, 'brilho')):
        for p, _ in lst:
            p.uv = [[AT.uv_map(p.cell, max(0, min(1, u)), max(0, min(1, v))) for (u, v) in f] for f in p.uv]
        ob, spans = geo.to_mesh(nm, [p for p, _ in lst])
        ob.data.materials.append(mat)
        for poly in ob.data.polygons: poly.use_smooth = True
        skin(ob, rig, [(a, b, allow) for (p, a, b), (_, allow) in zip(spans, lst)])

    # ---------------------------------------------------------- animação
    def ribbons_pose(t, trail=0.0, amp=0.12, spd=1.0, spread=0.0):
        d = {}
        for k, (a, chain, base, L) in enumerate(ribbons):
            fb = -math.cos(a)  # 1 na frente
            for j, nm in enumerate(chain):
                w = math.sin(TAU * (t * 0.5 * spd) - j * 0.7 - k * 0.8)
                # "trail": correntes inclinam para trás (rotação -X leva a ponta para trás)
                rx = -trail * (0.6 + 0.4 * j) * 0.5 + amp * w * (0.5 + 0.5 * j)
                rz = amp * 0.6 * math.cos(TAU * t * 0.37 * spd - k)
                # abertura radial (morte): gira para fora do eixo
                if spread:
                    rx += spread * fb * (0.8 if j == 0 else 0.3)
                    rz += -spread * math.sin(a) * (0.8 if j == 0 else 0.3)
                d[nm] = (rx, 0, rz)
        return d

    def base_pose(t, bob=0.04, lean=0.0, spd=1.0):
        d = {}
        z = bob * math.sin(TAU * t * 0.5 * spd)
        d['Hips'] = ((lean, 0, 0.05 * math.sin(TAU * t * 0.23)), (0, 0, 0))
        d['Root'] = ((0, 0, 0), (0, 0, z))
        d['Spine'] = (lean * 0.4 + 0.03 * math.sin(TAU * t * 0.5 * spd + 1), 0, 0)
        d['Spine1'] = (0.05, 0, 0.03 * math.sin(TAU * t * 0.31))
        d['Head'] = (0.12 + 0.05 * math.sin(TAU * t * 0.27), 0.12 * math.sin(TAU * t * 0.19), 0)
        d['LeftArm'] = (0.15 + 0.05 * math.sin(TAU * t * 0.5), 0, 0)
        d['LeftForeArm'] = (0.2, 0, 0)
        d['LeftHand'] = (0.1 * math.sin(TAU * t * 0.5 + 0.6), 0, 0.08 * math.sin(TAU * t * 0.4))
        d['RightArm'] = (0.05 + 0.06 * math.sin(TAU * t * 0.5 + 2), 0, 0)
        d['RightForeArm'] = (0.15, 0, 0)
        return d

    def mix(*ds):
        out = {}
        for d in ds: out.update(d)
        return out

    clips = []
    clips.append(bake_clip(rig, 'idle', 4.0, lambda t, u: mix(base_pose(t), ribbons_pose(t))))
    clips.append(bake_clip(rig, 'listen', 4.0, lambda t, u: mix(base_pose(t, bob=0.02), ribbons_pose(t, amp=0.06), {'Head': (0.25, 0.3 * math.sin(TAU * u), 0)})))
    clips.append(bake_clip(rig, 'talk', 2.0, lambda t, u: mix(base_pose(t * 2), ribbons_pose(t * 2))))
    clips.append(bake_clip(rig, 'walk', 2.0, lambda t, u: mix(base_pose(t, bob=0.05, lean=0.18, spd=2), ribbons_pose(t, trail=0.45, amp=0.14, spd=2))))
    clips.append(bake_clip(rig, 'run', 1.2, lambda t, u: mix(base_pose(t, bob=0.06, lean=0.38, spd=3.3), ribbons_pose(t, trail=0.95, amp=0.18, spd=3.3), {'LeftArm': (-0.4, 0, 0.2), 'RightArm': (-0.5, 0, -0.2)})))

    def heavy(t, u):
        # 0..0.42 antecipação: lampião sobe acima da cabeça e o corpo recua; 0.42..0.6 estouro para a frente; resto recuperação
        a = sm(u / 0.42); b = sm((u - 0.42) / 0.14); r = sm((u - 0.65) / 0.35)
        up = a * (1 - r)
        d = mix(base_pose(t, bob=0.02), ribbons_pose(t, trail=-0.3 * b * (1 - r) + 0.2 * a * (1 - b), amp=0.1))
        d['LeftArm'] = (lerp(0.15, 2.6, up) - 1.2 * b * (1 - r), 0, 0.2 * up)
        d['LeftForeArm'] = (lerp(0.2, 0.3, up), 0, 0)
        d['Spine'] = (-0.25 * a * (1 - b) + 0.35 * b * (1 - r), 0, 0)
        d['Hips'] = ((-0.15 * a * (1 - b) + 0.25 * b * (1 - r), 0, 0), (0, 0, 0))
        d['Root'] = ((0, 0, 0), (0, -0.25 * b * (1 - r), 0.08 * a * (1 - b)))
        d['Head'] = (-0.2 * a * (1 - b) + 0.3 * b * (1 - r), 0, 0)
        return d
    clips.append(bake_clip(rig, 'heavy', 1.4, heavy, loop=False))

    def attack(t, u):
        # passagem fria: avança esticado e corta com a mão direita
        a = sm(u / 0.3); b = sm((u - 0.3) / 0.25); r = sm((u - 0.6) / 0.4)
        d = mix(base_pose(t, bob=0.0), ribbons_pose(t, trail=1.0 * b * (1 - r) + 0.2, amp=0.08, spd=3))
        d['Root'] = ((0, 0, 0), (0, -0.5 * b * (1 - r), -0.05 * a))
        d['Hips'] = ((0.45 * b * (1 - r) - 0.1 * a * (1 - b), 0, 0), (0, 0, 0))
        d['RightArm'] = (lerp(0.05, 1.8, a) - 1.2 * b * (1 - r), 0, -0.6 * a * (1 - b) + 0.6 * b * (1 - r))
        d['RightForeArm'] = (0.4 * b, 0, 0)
        return d
    clips.append(bake_clip(rig, 'attack', 0.9, attack, loop=False))

    def cast(t, u):
        a = sm(u / 0.5); r = sm((u - 0.7) / 0.3)
        d = mix(base_pose(t, bob=0.03), ribbons_pose(t, amp=0.16, spd=2))
        sh = 0.15 * math.sin(TAU * t * 7) * a * (1 - r)
        d['LeftArm'] = (lerp(0.15, 1.5, a * (1 - r)), sh, 0)
        d['LeftForeArm'] = (lerp(0.2, 0.6, a * (1 - r)), 0, 0)
        d['LeftHand'] = (sh * 2, 0, sh)
        d['Head'] = (-0.15 * a * (1 - r), 0, 0)
        return d
    clips.append(bake_clip(rig, 'cast', 1.1, cast, loop=False))

    def hit(t, u):
        k = math.sin(math.pi * min(1, u * 1.4)) * (1 - u * 0.3)
        d = mix(base_pose(t), ribbons_pose(t, trail=-0.8 * k, amp=0.2, spd=3))
        d['Hips'] = ((-0.4 * k, 0, 0), (0, 0, 0))
        d['Root'] = ((0, 0, 0), (0, 0.18 * k, 0.04 * k))
        d['Head'] = (-0.5 * k, 0.2 * k, 0)
        d['LeftArm'] = (0.15 - 0.6 * k, 0, 0.4 * k)
        d['RightArm'] = (0.05 - 0.6 * k, 0, -0.4 * k)
        return d
    clips.append(bake_clip(rig, 'hit', 0.45, hit, loop=False))

    def die(t, u):
        # dispersão: afunda, as fitas se abrem como poça de pano, o capuz desaba
        a = sm(u / 0.55); b = sm((u - 0.35) / 0.65)
        d = mix(base_pose(t * (1 - a), bob=0.02 * (1 - a)), ribbons_pose(t, amp=0.15 * (1 - b), spread=1.3 * b))
        d['Root'] = ((0, 0, 0), (0, 0.05 * a, -0.95 * b - 0.1 * a))
        d['Hips'] = ((-0.3 * a, 0, 0), (0, 0, 0), (1, 1, lerp(1, 0.55, b)))
        d['Spine'] = (0.7 * b, 0, 0)
        d['Head'] = (0.9 * b, 0, 0.3 * b)
        d['LeftArm'] = (0.15 + 0.9 * a, 0, 0.8 * b)
        d['RightArm'] = (0.05 + 0.9 * a, 0, -0.8 * b)
        return d
    clips.append(bake_clip(rig, 'die', 1.8, die, loop=False))
    return rig, clips


BUILDERS = {'espectro_lanterna': espectro_lanterna}
rig, clips = BUILDERS[NAME]()
mesh = [o for o in sc.objects if o.type == 'MESH']
tris = sum(len(p.vertices) - 2 for o in mesh for p in o.data.polygons)
height = max((o.matrix_world @ Vector(c)).z for o in mesh for c in o.bound_box)
sc['ps2_altura'] = float(height)
sc['ps2_id'] = NAME
log('TOTAL_TRIS', tris, 'ossos', len(rig.ob.data.bones), 'clipes', len(clips), 'altura %.2f' % height)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_image_format='WEBP', export_image_quality=90,
                          export_animations=True, export_animation_mode='NLA_TRACKS', export_force_sampling=True,
                          export_def_bones=False, export_optimize_animation_size=True, export_skins=True, export_yup=True,
                          export_extras=True)
print(json.dumps({'ok': True, 'out': OUT, 'tris': tris, 'clipes': len(clips), 's': round(time.time() - T0, 1)}))
