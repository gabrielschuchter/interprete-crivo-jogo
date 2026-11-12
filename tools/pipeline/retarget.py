# Redirecionamento de BVH da CMU (nomes MotionBuilder) para qualquer armadura com os mesmos nomes de osso.
# Extraído de anim.py para servir também a GLB já montados (ps2.py). setup(rig, pasta_cmu) antes de retarget(spec).
import bpy, math, os
import numpy as np
from mathutils import Quaternion, Vector

FPS = 30
SRC_FT = 1 / 120
CMU = sc = rig = Mt = MtR = None
bones = order = []
rest = parent = {}
tgt_hip_h = 0.0

def setup(rig_, cmu=None):
    global CMU, sc, rig, Mt, MtR, bones, order, rest, parent, tgt_hip_h
    CMU = os.path.join(cmu or os.environ.get('CMU_MOCAP_DIR') or os.path.join(os.getcwd(), 'cmu-mocap', 'data'), '')
    sc = bpy.context.scene
    rig = rig_
    Mt = rig.matrix_world.copy(); MtR = Mt.to_quaternion()
    bones = [b.name for b in rig.data.bones]
    order = []
    def walk(b):
        order.append(b.name)
        for c in b.children: walk(c)
    for b in rig.data.bones:
        if b.parent is None: walk(b)
    rest = {b.name: b.matrix_local.copy() for b in rig.data.bones}
    parent = {b.name: (b.parent.name if b.parent else None) for b in rig.data.bones}
    tgt_hip_h = (Mt @ rest['Hips'].translation).z

def import_bvh(clip):
    s = clip.split('_')[0]
    path = CMU + s.zfill(3) + '/' + clip + '.bvh'
    bpy.ops.import_anim.bvh(filepath=path, global_scale=0.056444, rotate_mode='NATIVE', axis_forward='-Z', axis_up='Y',
                            update_scene_fps=False, use_fps_scale=False)
    a = bpy.context.object
    n = int(a.animation_data.action.frame_range[1])
    return a, n

def world(a, name):
    pb = a.pose.bones[name]
    return a.matrix_world @ pb.matrix, a.matrix_world @ pb.tail

def setf(t):
    f = 1 + t / SRC_FT
    sc.frame_set(int(f), subframe=f - int(f))

def sample_signals(a, n):
    dur = (n - 1) * SRC_FT
    ts = np.arange(0, dur, 1 / FPS)
    sig = {k: [] for k in ['hips', 'lfoot', 'rfoot', 'rhand', 'lhand', 'head', 'lup', 'rup', 'chest']}
    names = {'hips': 'Hips', 'lfoot': 'LeftFoot', 'rfoot': 'RightFoot', 'rhand': 'RightHand', 'lhand': 'LeftHand', 'head': 'Head', 'lup': 'LeftUpLeg', 'rup': 'RightUpLeg', 'chest': 'Spine1'}
    for t in ts:
        setf(t)
        for k, nm in names.items():
            sig[k].append(tuple(world(a, nm)[0].translation))
    return ts, {k: np.array(v) for k, v in sig.items()}

def choose(spec, ts, S):
    kind = spec['pick']
    dur = ts[-1]
    if kind == 'range':
        return spec['t0'], min(dur, spec['t1'])
    if kind == 'loop':
        # ciclo entre dois apoios sucessivos do pé esquerdo, longe das pontas do clipe
        z = S['lfoot'][:, 2]
        lo = int(len(z) * spec.get('skip', 0.2))
        mins = [i for i in range(max(1, lo), len(z) - 1) if z[i] <= z[i - 1] and z[i] < z[i + 1] and z[i] < np.percentile(z, 35)]
        clean = []
        for i in mins:
            if not clean or ts[i] - ts[clean[-1]] > 0.4: clean.append(i)
        if len(clean) < 2:
            return ts[lo], min(dur, ts[lo] + 1.1)
        return ts[clean[0]], ts[clean[1]]
    if kind == 'still':
        # janela de duração L cujo início e fim têm poses mais parecidas
        L = spec['len']
        best, bt = 1e9, 0
        P = np.concatenate([S[k] - S['hips'] for k in ['rhand', 'lhand', 'head', 'lfoot', 'rfoot']], axis=1)
        nL = int(L * FPS)
        a0 = int(spec.get('from', 0) * FPS)
        a1 = int(spec.get('to', dur) * FPS) - nL
        for i in range(a0, max(a0 + 1, a1), 3):
            d = np.linalg.norm(P[i] - P[i + nL]) + 0.3 * np.linalg.norm(S['hips'][i, :2] - S['hips'][i + nL, :2])
            if d < best: best, bt = d, i
        return ts[bt], ts[bt] + L
    if kind == 'peak':
        k = spec['sig']
        if k.endswith('_speed'):
            p = S[k[:-6]] - S['hips']
            v = np.linalg.norm(np.gradient(p, axis=0), axis=1)
        elif k.endswith('_up'):
            v = S[k[:-3]][:, 2]
        elif k.endswith('_down'):
            v = -S[k[:-5]][:, 2]
        a0 = int(spec.get('from', 0) * FPS); a1 = int(spec.get('to', dur) * FPS)
        i = a0 + int(np.argmax(v[a0:a1]))
        t = ts[i]
        return max(0, t - spec['pre']), min(dur, t + spec['post'])
    raise ValueError(kind)

def heading(S, i0, i1, loco):
    if loco:
        d = S['hips'][i1] - S['hips'][i0]
    else:
        l = S['lup'][i0:i1 + 1] - S['rup'][i0:i1 + 1]
        d = -np.cross(l, np.array([0, 0, 1.0])).mean(axis=0)
    ang = math.atan2(d[0], -d[1])  # ângulo entre d e -Y
    print('HEAD', loco, d, math.degrees(ang))
    return ang

def retarget(spec):
    a, n = import_bvh(spec['bvh'])
    ts, S = sample_signals(a, n)
    t0, t1 = choose(spec, ts, S)
    i0, i1 = int(round(t0 * FPS)), min(len(ts) - 1, int(round(t1 * FPS)))
    loco = spec['pick'] == 'loop'
    ang = heading(S, i0, i1, loco)
    # gira a fonte em torno da origem para olhar para -Y
    bpy.context.view_layer.update()
    # T-pose de referência no quadro 1
    setf(0)
    src1 = {}
    for b in bones:
        if b in a.pose.bones:
            m, tail = world(a, b)
            src1[b] = (m.to_quaternion(), m.translation.copy(), tail)
    offset = {}
    for b in bones:
        if b not in src1: continue
        tr = Mt @ rest[b]
        tdir = (tr.col[1].xyz).normalized()
        q1, h1, tail1 = src1[b]
        sdir = tail1 - h1
        sdir = sdir.normalized() if sdir.length > 1e-4 else (q1 @ Vector((0, 1, 0)))
        Q = tdir.rotation_difference(sdir)
        aligned = Q @ tr.to_quaternion()
        offset[b] = q1.inverted() @ aligned
    src_hip_h = S['hips'][:, 2].max() if spec.get('hip_ref') == 'max' else np.median(S['hips'][:, 2])
    k = tgt_hip_h / max(0.3, float(np.median(S['hips'][i0:i1 + 1, 2]) if loco else src_hip_h))
    frames = []
    for i in range(i0, i1 + 1):
        setf(ts[i])
        rots = {}
        for b in bones:
            if b in offset:
                rots[b] = world(a, b)[0].to_quaternion() @ offset[b]
        hp = world(a, 'Hips')[0].translation.copy()
        frames.append((rots, hp))
    # orientação: gira a pose inteira para o corpo olhar para -Y (frente do MakeHuman)
    hipRW = (Mt @ rest['Hips']).to_quaternion()
    fw = Vector((0, 0, 0))
    for rots, _ in frames:
        fw += (rots['Hips'] @ hipRW.inverted()) @ Vector((0, -1, 0))
    th = math.atan2(fw.x, -fw.y)
    Rz = Quaternion((0, 0, 1), -th)
    frames = [({b: Rz @ q for b, q in rots.items()}, Rz @ hp) for rots, hp in frames]
    print('YAW', spec['name'], round(math.degrees(th)))
    # posição dos quadris: escala e remoção do deslocamento horizontal
    H = np.array([tuple(f[1]) for f in frames]) * k
    if loco or spec.get('inplace', 'start') == 'trend':
        n_ = len(H)
        lin = np.outer(np.linspace(0, 1, n_), H[-1] - H[0]) + H[0]
        H[:, 0] -= lin[:, 0]; H[:, 1] -= lin[:, 1]
    else:
        H[:, 0] -= H[0, 0]; H[:, 1] -= H[0, 1]
        damp = spec.get('drift', 0.35)
        H[:, 0] *= damp; H[:, 1] *= damp
    if spec.get('flatz'):
        # pulo: o salto vem da física do jogo; o clipe guarda só a flexão de impulso e de aterrissagem
        H[:, 2] = np.minimum(H[:, 2], tgt_hip_h)
    H[:, 2] += spec.get('dz', 0.0)
    if spec.get('ground_dz'):
        # queda: aproxima o corpo do chão à medida que os quadris descem (o começo, de pé, não afunda)
        z0, z1 = H[0, 2], H[:, 2].min()
        H[:, 2] += spec['ground_dz'] * np.clip((z0 - H[:, 2]) / max(1e-3, z0 - z1), 0, 1)
    act = bpy.data.actions.new(spec['name'])
    act.use_fake_user = True
    rig.animation_data_create()
    rig.animation_data.action = act
    for b in bones:
        pb = rig.pose.bones[b]
        pb.rotation_mode = 'QUATERNION'
    MtRi = MtR.inverted()
    prevq = {}
    for fi, (rots, _) in enumerate(frames):
        desA = {}
        for b in order:
            if b not in rots:
                # sem correspondente: herda o pai (osso fixo no repouso)
                p = parent[b]
                desA[b] = (desA[p] if p else Quaternion()) @ (rest[p].to_quaternion().inverted() @ rest[b].to_quaternion() if p else rest[b].to_quaternion())
                continue
            desA[b] = MtRi @ rots[b]
        for b in order:
            p = parent[b]
            if p:
                rel = rest[p].to_quaternion().inverted() @ rest[b].to_quaternion()
                basis = (desA[p] @ rel).inverted() @ desA[b]
            else:
                basis = rest[b].to_quaternion().inverted() @ desA[b]
            if b in prevq and prevq[b].dot(basis) < 0: basis.negate()
            prevq[b] = basis
            pb = rig.pose.bones[b]
            pb.rotation_quaternion = basis
            pb.keyframe_insert('rotation_quaternion', frame=fi + 1)
            if p is None:
                want = Mt.inverted() @ Vector(H[fi])
                loc = rest[b].to_3x3().inverted() @ (want - rest[b].translation)
                pb.location = loc
                pb.keyframe_insert('location', frame=fi + 1)
    rig.animation_data.action = None
    # limpa a fonte
    arm = a.data
    bpy.data.objects.remove(a)
    bpy.data.armatures.remove(arm)
    print('CLIP', spec['name'], spec['bvh'], 't=%.2f-%.2f' % (t0, t1), 'quadros', len(frames), 'k=%.2f' % k)
    return act

