# Retarget CMU (BVH MotionBuilder) -> rig cmu_mb do MPFB, exporta GLB animado.
# Uso: python anim.py '<json>'  com {"blend":..., "out":..., "clips":[...], "tint":...}
import bpy, sys, json, math, os
import numpy as np
from mathutils import Matrix, Quaternion, Vector

cfg = json.loads(sys.argv[-1])
CMU = '/home/user/cmu-mocap/data/'
FPS = 30
SRC_FT = 1 / 120

bpy.ops.wm.open_mainfile(filepath=cfg['blend'])
import addon_utils
addon_utils.enable('bl_ext.user_default.mpfb', default_set=True)
from bl_ext.user_default.mpfb.services.exportservice import ExportService
from bl_ext.user_default.mpfb.services.objectservice import ObjectService

sc = bpy.context.scene
sc.render.fps = FPS
basemesh = [o for o in sc.objects if o.name == 'Human'][0]
# cópia de exportação: modificadores e máscaras assados, sem geometria auxiliar
root = ExportService.create_character_copy(basemesh, name_suffix='_x')
xb = ObjectService.find_object_of_type_amongst_nearest_relatives(root, 'Basemesh')
ExportService.bake_modifiers_remove_helpers(xb, bake_masks=cfg.get('masks', True), bake_subdiv=False, remove_helpers=True, also_proxy=True)
keep = {root.name} | {c.name for c in ObjectService.get_list_of_children(root)}
for o in list(sc.objects):
    if o.name not in keep:
        bpy.data.objects.remove(o)
rig = root if root.type == 'ARMATURE' else [o for o in sc.objects if o.type == 'ARMATURE'][0]
rig.name = 'Rig'
for o in sc.objects:
    if o.type == 'MESH' and o.data.shape_keys:
        bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
        bpy.ops.object.shape_key_remove(all=True, apply_mix=True)
print('OBJS', [(o.name, o.type) for o in sc.objects])

Mt = rig.matrix_world.copy()
MtR = Mt.to_quaternion()
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
    H[:, 2] += spec.get('dz', 0.0)
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

acts = []
for spec in cfg['clips']:
    try:
        acts.append(retarget(spec))
    except Exception as e:
        import traceback; traceback.print_exc()
        print('FALHOU', spec['name'])
# todas as ações numa trilha NLA cada, para o exportador levar todas
rig.animation_data_create()
for act in acts:
    tr = rig.animation_data.nla_tracks.new(); tr.name = act.name
    st = tr.strips.new(act.name, 1, act); st.name = act.name
    tr.mute = True
rig.animation_data.action = None
# recoloração (paleta Dark Academia): luminância da textura x cor alvo
def recolor(img, hexc, keep=0.15):
    w, h = img.size
    px = np.empty(w * h * 4, np.float32); img.pixels.foreach_get(px); px = px.reshape(-1, 4)
    lum = px[:, :3] @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    m = float(np.median(lum[px[:, 3] > 0.5])) if (px[:, 3] > 0.5).any() else float(np.median(lum))
    tgt = np.array([int(hexc[i:i + 2], 16) / 255 for i in (0, 2, 4)], np.float32)
    rel = np.clip(lum / max(m, 1e-3), 0, 2.2)[:, None]
    new = tgt[None, :] * rel
    px[:, :3] = new * (1 - keep) + px[:, :3] * keep * (tgt.mean() / max(m, 1e-3))
    img.pixels.foreach_set(px.ravel()); img.update()
done = set()
for o in sc.objects:
    if o.type != 'MESH': continue
    for key, hexc in cfg.get('recolor', {}).items():
        if key.lower() not in o.name.lower(): continue
        if not o.material_slots or not any(ms.material for ms in o.material_slots):
            mat = bpy.data.materials.new(o.name.split('.')[-1] + '_cor'); mat.use_nodes = True
            bsdf = mat.node_tree.nodes.get('Principled BSDF')
            rgb = [int(hexc[i:i + 2], 16) / 255 for i in (0, 2, 4)]
            bsdf.inputs['Base Color'].default_value = (rgb[0] ** 2.2, rgb[1] ** 2.2, rgb[2] ** 2.2, 1)
            bsdf.inputs['Roughness'].default_value = 0.85
            o.data.materials.clear(); o.data.materials.append(mat); print('NEWMAT', o.name, hexc)
            continue
        for ms in o.material_slots:
            if not ms.material or not ms.material.use_nodes: continue
            def allnodes(nt):
                for n_ in nt.nodes:
                    yield n_
                    if n_.type == 'GROUP' and n_.node_tree: yield from allnodes(n_.node_tree)
            for nd in allnodes(ms.material.node_tree):
                if nd.type == 'TEX_IMAGE' and nd.image and nd.image.name not in done:
                    if any(x in nd.image.name.lower() for x in ('normal', 'bump', 'nor', 'spec', 'rough')): continue
                    if nd.image.size[0] and max(nd.image.size) > cfg.get('tex', 1024):
                        sc_ = cfg.get('tex', 1024) / max(nd.image.size); nd.image.scale(int(nd.image.size[0] * sc_), int(nd.image.size[1] * sc_))
                    recolor(nd.image, hexc); done.add(nd.image.name); print('RECOLOR', o.name, nd.image.name, hexc)
# texturas: limitar resolução
for img in bpy.data.images:
    try:
        w, h = img.size
    except Exception:
        continue
    if w and max(w, h) > cfg.get('tex', 1024):
        s = cfg.get('tex', 1024) / max(w, h)
        img.scale(int(w * s), int(h * s))
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=cfg['out'], export_format='GLB', export_image_format='WEBP', export_image_quality=85,
                          export_animations=True, export_animation_mode='NLA_TRACKS', export_force_sampling=True,
                          export_frame_step=1, export_def_bones=True, export_optimize_animation_size=True,
                          export_apply=False, export_skins=True, export_morph=False, export_yup=True, use_selection=False)
print('OK', cfg['out'])
