# Converte um personagem GLB do pipeline MakeHuman (rig cmu_mb, clipes CMU) para a direção PS2:
# malha de poucos milhares de triângulos, texturas pequenas granuladas, sem mapa normal,
# e acrescenta clipes novos (pulo, golpes de espada de uma mão, variantes com tocha na mão esquerda).
# Uso: python ps2.py '<json>' com {"src":..., "out":..., "budget":{...}, "tex":{...}, "clips":[...], "cmu": "<pasta dos BVH>", "seed": n}
# A entrada precisa estar sem compressão meshopt (gltf-transform copy).
import bpy, bmesh, sys, json, math, os, random
import numpy as np
from mathutils import Matrix, Quaternion, Vector
from mathutils.bvhtree import BVHTree

cfg = json.loads(sys.argv[-1])
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import retarget as RT

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=cfg['src'])
sc = bpy.context.scene
sc.render.fps = 30
for o in list(bpy.data.objects):
    if o.type == 'MESH' and (o.parent is None or 'eyelashes' in o.name.lower()):
        bpy.data.objects.remove(o)  # forma de osso do importador e cílios em cartão alfa (não existem no PS2)
rig = [o for o in sc.objects if o.type == 'ARMATURE'][0]

# enxerto: troca peças de roupa por peças de outro personagem do mesmo esqueleto (ex.: manto com capuz num corpo feminino)
g = cfg.get('graft')
if g:
    for o in [o for o in sc.objects if o.type == 'MESH' and any(r in o.name.lower() for r in g.get('remove', []))]:
        bpy.data.objects.remove(o)
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=g['from'])
    added = [o for o in bpy.data.objects if o not in before]
    sx, sy, sz = g.get('scale', (1, 1, 1))
    for o in added:
        if o.type == 'MESH' and o.parent and any(k_ in o.name.lower() for k_ in g['take']):
            mw = o.matrix_world.copy()
            o.parent = rig
            o.matrix_world = mw
            for m_ in o.modifiers:
                if m_.type == 'ARMATURE': m_.object = rig
            for v in o.data.vertices:
                v.co = Vector((v.co.x * sx, v.co.y * sy, v.co.z * sz))
            print('ENXERTO', o.name)
        else:
            continue
    for o in added:
        if o.name in bpy.data.objects and (o.type != 'MESH' or o.parent is None or o.parent.type == 'ARMATURE' and o.parent != rig):
            bpy.data.objects.remove(o)
    for a in list(bpy.data.actions):
        if a.users == 0: bpy.data.actions.remove(a)
meshes = [o for o in sc.objects if o.type == 'MESH']

def kind(o):
    n = o.name.lower()
    if n.startswith('human_x') or n == 'human_x': return 'body'
    if 'high-poly' in n or 'eye' in n and 'brow' not in n: return 'eyes'
    if 'eyebrow' in n: return 'brows'
    if 'shoe' in n or 'boot' in n: return 'shoes'
    if any(k in n for k in ('hair', 'bun', 'braid', 'short0', 'long0', 'afro', 'ponytail', 'bob0')): return 'hair'
    if 'beard' in n: return 'beard'
    if 'glasses' in n: return 'glasses'
    if any(k in n for k in ('cap', 'hat', 'hood')): return 'hat'
    return 'clothes'

def all_nodes(nt):
    for n_ in nt.nodes:
        yield n_
        if n_.type == 'GROUP' and n_.node_tree: yield from all_nodes(n_.node_tree)

def tris(o):
    return sum(len(p.vertices) - 2 for p in o.data.polygons)

# 1) pele escondida sob a roupa sai antes da redução, senão a malha simplificada atravessa o tecido
rig.data.pose_position = 'REST'
bpy.context.view_layer.update()
dg = bpy.context.evaluated_depsgraph_get()
cover = [o for o in meshes if kind(o) in ('clothes', 'shoes')]
trees = [BVHTree.FromObject(o, dg) for o in cover]
body = [o for o in meshes if kind(o) == 'body']
for b in body:
    me = b.data
    hidden = np.zeros(len(me.vertices), bool)
    mw = b.matrix_world
    for v in me.vertices:
        p = mw @ v.co
        n = (mw.to_3x3() @ v.normal).normalized()
        hit = 0
        for t in trees:
            r = t.ray_cast(p + n * 0.001, n, 0.06)
            if r[0] is not None: hit += 1; break
        if hit:
            # confere também na diagonal, para não abrir buraco nas bordas (gola, punho, barra)
            ok = True
            for d in (Vector((0, 0, 1)), Vector((0, 0, -1))):
                nd = (n + d * 0.6).normalized()
                if not any(t.ray_cast(p + nd * 0.001, nd, 0.08)[0] is not None for t in trees): ok = False; break
            hidden[v.index] = ok
    bm = bmesh.new(); bm.from_mesh(me)
    bm.verts.ensure_lookup_table()
    dead = [f for f in bm.faces if all(hidden[v.index] for v in f.verts)]
    bmesh.ops.delete(bm, geom=dead, context='FACES')
    bm.to_mesh(me); bm.free()
    print('PELE', b.name, 'faces removidas', len(dead))

# 1b) cabelo de cartões alfa vira casca sólida pintada, como nos modelos de PS2.
# A casca nasce do couro cabeludo do próprio corpo (mesmos pesos de osso), afastada pela espessura do penteado.
def hair_color(objs):
    cols = []
    for o in objs:
        for ms in o.material_slots:
            if not ms.material or not ms.material.use_nodes: continue
            for n_ in all_nodes(ms.material.node_tree):
                if n_.type == 'TEX_IMAGE' and n_.image and n_.image.size[0]:
                    w, h = n_.image.size
                    px = np.empty(w * h * 4, np.float32); n_.image.pixels.foreach_get(px); px = px.reshape(-1, 4)
                    m = px[:, 3] > 0.6
                    if m.any(): cols.append(np.median(px[m, :3], axis=0))
    return np.mean(cols, axis=0) if cols else np.array([0.08, 0.06, 0.05])

def hair_texture(name, col, size=128, seed=3):
    r = np.random.default_rng(seed)
    img = bpy.data.images.new(name, size, size, alpha=False)
    # mechas: ruído forte ao longo de u, suave ao longo de v
    u = r.normal(0, 1, size)
    for _ in range(3): u = (u + np.roll(u, 1) + np.roll(u, -1)) / 3
    v = np.linspace(0, 1, size)[:, None]
    streak = 0.78 + 0.28 * (u - u.min()) / (np.ptp(u) + 1e-6)
    band = 1 + 0.18 * np.exp(-((v - 0.72) ** 2) / 0.006)  # faixa de brilho perto do alto
    root = 0.72 + 0.28 * np.clip(v * 1.6, 0, 1)            # raiz mais escura embaixo da casca
    lum = streak[None, :] * band * root
    rgb = np.clip(np.asarray(col)[None, None, :] * lum[..., None], 0, 1)
    px = np.concatenate([rgb, np.ones((size, size, 1))], axis=2).astype(np.float32)
    img.pixels.foreach_set(px.ravel()); img.update()
    return img

HAIR = cfg.get('hair', {})
hair_objs = [o for o in meshes if o.name in bpy.data.objects and kind(o) == 'hair']
style = HAIR.get('style', 'short' if hair_objs else 'none')
if style != 'none' and body:
    b = body[0]
    col = HAIR.get('color')
    col = np.array([int(col[i:i + 2], 16) / 255 for i in (0, 2, 4)]) if col else hair_color(hair_objs)
    gone = {o.name for o in hair_objs}
    for o in hair_objs: bpy.data.objects.remove(o)
    meshes = [o for o in sc.objects if o.type == 'MESH']
    brow = [o for o in sc.objects if o.type == 'MESH' and kind(o) == 'brows']
    gi = b.vertex_groups['Head'].index
    vs = b.data.vertices
    head_pts = np.array([tuple(v.co) for v in vs if any(g.group == gi and g.weight > 0.6 for g in v.groups)])
    top = head_pts[:, 2].max()
    brow_z = max((b2.matrix_world @ v.co).z for b2 in brow for v in b2.data.vertices) if brow else top - 0.1
    cx, cy = 0.0, float(np.median(head_pts[:, 1]))
    front_h = brow_z + HAIR.get('fringe', 0.045)
    back_h = brow_z - HAIR.get('nape', 0.06)
    side_h = brow_z - 0.005
    th = HAIR.get('thick', 0.014)
    def above(p):
        ang = math.atan2(p.x - cx, -(p.y - cy))  # 0 = frente
        f = (1 - math.cos(ang)) / 2               # 0 frente, 1 nuca
        hl = front_h + (side_h - front_h) * min(1, f * 2) if f < 0.5 else side_h + (back_h - side_h) * (f - 0.5) * 2
        return p.z > hl
    me = b.data.copy(); me.name = 'hair_ps2'
    sh = bpy.data.objects.new('Human.hair_ps2_x', me)
    sc.collection.objects.link(sh); sh.parent = rig; sh.matrix_world = b.matrix_world
    am = sh.modifiers.new('Armature', 'ARMATURE'); am.object = rig
    bm = bmesh.new(); bm.from_mesh(me)
    dl = bm.verts.layers.deform.active
    keep = set()
    for v in bm.verts:
        w = v[dl].get(gi, 0) if dl else 0
        if w > 0.5 and above(v.co): keep.add(v.index)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if not all(v.index in keep for v in f.verts)], context='FACES')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    # costuras de UV do corpo duplicam vértices; soldados, a casca não racha ao ser afastada
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0006)
    bm.normal_update()
    # linha do cabelo lisa: vértices da borda descem até a curva, em vez do serrilhado das faces
    def hairline(p):
        ang = math.atan2(p.x - cx, -(p.y - cy)); f = (1 - math.cos(ang)) / 2
        return front_h + (side_h - front_h) * min(1, f * 2) if f < 0.5 else side_h + (back_h - side_h) * (f - 0.5) * 2
    for v in bm.verts:
        if v.is_boundary: v.co.z = hairline(v.co) + 0.002
    c = Vector((cx, cy, brow_z + 0.02))
    for v in bm.verts:
        d = v.normal * th
        if style == 'afro': d += (v.co - c).normalized() * 0.035
        v.co += d
    # volume extra por penteado
    def blob(center, rx, ry, rz, group_w):
        ret = bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.0)
        for v in ret['verts']:
            v.co = Vector((center.x + v.co.x * rx, center.y + v.co.y * ry, center.z + v.co.z * rz))
            for gname, w in group_w.items():
                v[dl][b.vertex_groups[gname].index] = w
    if style in ('bun', 'braidbun'):
        back_y = float(head_pts[head_pts[:, 2] > brow_z - 0.03][:, 1].max())
        blob(Vector((0, back_y + 0.012, brow_z - 0.005)), 0.05, 0.042, 0.046, {'Head': 1.0})
    if style in ('long', 'braid'):
        # cortina de cabelo que desce da nuca até as escápulas, ligada ao pescoço e ao tronco
        boundary = [e for e in bm.edges if e.is_boundary and all(v.co.y > cy + 0.035 for v in e.verts)]
        if style == 'braid':
            boundary = [e for e in boundary if all(abs(v.co.x) < 0.04 for v in e.verts)]
        ext = bmesh.ops.extrude_edge_only(bm, edges=boundary)
        nv = [g for g in ext['geom'] if isinstance(g, bmesh.types.BMVert)]
        L = HAIR.get('length', 0.24)
        sp = b.vertex_groups['Spine1'].index if 'Spine1' in b.vertex_groups else None
        nk = b.vertex_groups['Neck'].index if 'Neck' in b.vertex_groups else None
        for v in nv:
            v.co.z -= L
            v.co.y += 0.03
            v.co.x *= 0.8 if style == 'long' else 0.5
            for k_ in list(v[dl].keys()): del v[dl][k_]
            if sp is not None: v[dl][sp] = 0.7
            if nk is not None: v[dl][nk] = 0.3
    bm.normal_update()
    # UV cilíndrica em torno da cabeça
    uvl = bm.loops.layers.uv.active or bm.loops.layers.uv.new()
    zmin = min(v.co.z for v in bm.verts); zr = max(1e-3, max(v.co.z for v in bm.verts) - zmin)
    for f in bm.faces:
        us = [math.atan2(l.vert.co.x - cx, -(l.vert.co.y - cy)) / (2 * math.pi) + 0.5 for l in f.loops]
        if max(us) - min(us) > 0.5: us = [u + 1 if u < 0.5 else u for u in us]  # face que cruza a costura
        for l, u in zip(f.loops, us):
            l[uvl].uv = (u * 3, (l.vert.co.z - zmin) / zr)
    bm.to_mesh(me); bm.free()
    while len(me.uv_layers) > 1: me.uv_layers.remove(me.uv_layers[-1])
    mat = bpy.data.materials.new('Human.hair_ps2'); mat.use_nodes = True
    bs = mat.node_tree.nodes.get('Principled BSDF')
    tx = mat.node_tree.nodes.new('ShaderNodeTexImage'); tx.image = hair_texture('hair_ps2', col)
    mat.node_tree.links.new(tx.outputs['Color'], bs.inputs['Base Color'])
    me.materials.clear(); me.materials.append(mat)
    meshes.append(sh)
    print('CABELO', style, len(me.polygons), 'cor', np.round(col, 3))

rig.data.pose_position = 'POSE'

# 2) redução de malha por orçamento de triângulos (collapse simétrico em X preserva grupos de vértices e UV)
budget = cfg.get('budget', {})
# sobrancelha e barba ficam inteiras: são cartões pequenos que a redução despedaça
default_budget = {'body': 2400, 'clothes': 2200, 'hair': 900, 'beard': 99999, 'shoes': 360, 'eyes': 96, 'brows': 99999, 'glasses': 240, 'hat': 500}
for o in meshes:
    k = kind(o)
    tgt = budget.get(k, default_budget[k])
    t0 = tris(o)
    if t0 > tgt:
        m = o.modifiers.new('dec', 'DECIMATE')
        m.decimate_type = 'COLLAPSE'
        m.ratio = tgt / t0
        m.use_symmetry = True
        m.symmetry_axis = 'X'
        m.use_collapse_triangulate = True
        bpy.context.view_layer.objects.active = o
        # o modificador precisa vir antes do Armature
        while o.modifiers.find('dec') > 0:
            bpy.ops.object.modifier_move_up(modifier='dec')
        bpy.ops.object.modifier_apply(modifier='dec')
    # sombreamento facetado leve: normais suaves com ângulo, como os modelos de época
    for p in o.data.polygons: p.use_smooth = True
    print('MALHA', o.name, k, t0, '->', tris(o))

# 3) materiais e texturas PS2: base color pequena, sem normal, granulada, levemente borrada e quantizada
texsz = {'body': 256, 'clothes': 256, 'hair': 128, 'beard': 128, 'shoes': 64, 'eyes': 64, 'brows': 64, 'glasses': 64, 'hat': 128}
texsz.update(cfg.get('tex', {}))
rng = np.random.default_rng(cfg.get('seed', 7))
grade = cfg.get('grade', {})
done = {}

def blur(px, w, h):
    a = px.reshape(h, w, 4)
    pad = np.pad(a, ((1, 1), (1, 1), (0, 0)), mode='wrap')
    k = (pad[:-2, :-2] + pad[:-2, 1:-1] * 2 + pad[:-2, 2:] + pad[1:-1, :-2] * 2 + pad[1:-1, 1:-1] * 4 + pad[1:-1, 2:] * 2 + pad[2:, :-2] + pad[2:, 1:-1] * 2 + pad[2:, 2:]) / 16
    return (a * 0.45 + k * 0.55).reshape(-1, 4)

def ps2_image(img, size, k):
    w, h = img.size
    if not w: return
    s = size / max(w, h)
    if s < 1: img.scale(max(8, int(w * s)), max(8, int(h * s)))
    w, h = img.size
    px = np.empty(w * h * 4, np.float32); img.pixels.foreach_get(px); px = px.reshape(-1, 4)
    px = blur(px, w, h)
    rgb = px[:, :3]
    if cfg.get('marble') and k in ('clothes', 'hat'):
        # tecido de espectro: mármore frio de veios largos, como as túnicas da referência; a cor vem do tom do inimigo
        def octave(n):
            gr = rng.random((n, n)).astype(np.float32)
            gr = np.kron(gr, np.ones((h // n + 1, w // n + 1), np.float32))[:h, :w]
            for _ in range(2): gr = (gr + np.roll(gr, 1, 0) + np.roll(gr, -1, 0) + np.roll(gr, 1, 1) + np.roll(gr, -1, 1)) / 5
            return gr
        turb = octave(4) * 0.55 + octave(8) * 0.3 + octave(16) * 0.15
        yy_, xx_ = np.mgrid[0:h, 0:w] / max(w, h)
        vein = np.abs(np.sin((xx_ * 3 + yy_ * 9 + turb * 7) * math.pi))
        m_ = (0.42 + 0.5 * (1 - vein) ** 3 + 0.12 * turb).reshape(-1, 1)
        rgb = rgb * 0.25 + np.clip(m_, 0, 1) * np.array([0.82, 0.84, 0.9], np.float32) * 0.75
    lum = rgb @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    sat = grade.get('sat', 0.78) if k not in ('eyes',) else 0.9
    rgb = lum[:, None] + (rgb - lum[:, None]) * sat
    # sombras puxam para cinza azulado, luzes para bege envelhecido
    t = np.clip(lum, 0, 1)[:, None]
    cold = np.array([0.86, 0.9, 1.0], np.float32); warm = np.array([1.04, 0.99, 0.9], np.float32)
    rgb = rgb * (cold * (1 - t) + warm * t)
    rgb = np.clip((rgb - 0.5) * grade.get('contrast', 1.08) + 0.5 - 0.015, 0, 1)
    # grão de luminância fixo (mesma semente por personagem)
    g = rng.normal(0, grade.get('grain', 0.03), (rgb.shape[0], 1)).astype(np.float32)
    rgb = np.clip(rgb + g * (0.4 + 0.6 * t), 0, 1)
    # cor de 15 bits com pontilhado ordenado 4x4
    bayer = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], np.float32) / 16 - 0.5) / 31
    yy, xx = np.divmod(np.arange(w * h), w)
    rgb = np.floor(np.clip(rgb + bayer[yy % 4, xx % 4][:, None], 0, 1) * 31 + 0.5) / 31
    px[:, :3] = rgb
    px[:, 3] = (px[:, 3] > 0.45).astype(np.float32)
    img.pixels.foreach_set(px.ravel()); img.update()

for o in sc.objects:
    if o.type != 'MESH': continue
    k = kind(o)
    for ms in o.material_slots:
        mat = ms.material
        if not mat or not mat.use_nodes: continue
        nt = mat.node_tree
        bsdf = next((n_ for n_ in nt.nodes if n_.type == 'BSDF_PRINCIPLED'), None)
        cut = False
        for n_ in list(nt.nodes):
            if n_.type == 'NORMAL_MAP':
                nt.nodes.remove(n_)
        for n_ in list(nt.nodes):
            if n_.type == 'TEX_IMAGE' and n_.image and not n_.outputs[0].links:
                nt.nodes.remove(n_)
        if bsdf:
            for inp in ('Roughness', 'Metallic', 'Specular IOR Level'):
                if inp in bsdf.inputs:
                    for l in list(bsdf.inputs[inp].links): nt.links.remove(l)
            bsdf.inputs['Roughness'].default_value = 0.92 if k != 'eyes' else 0.35
            bsdf.inputs['Metallic'].default_value = 0.0
            if 'Specular IOR Level' in bsdf.inputs: bsdf.inputs['Specular IOR Level'].default_value = 0.25
            cut = bool(bsdf.inputs['Alpha'].links)
        for n_ in all_nodes(nt):
            if n_.type == 'TEX_IMAGE' and n_.image and n_.image.name not in done:
                ps2_image(n_.image, texsz[k], k)
                done[n_.image.name] = k
        mat['ps2_alpha'] = 'MASK' if k in ('hair', 'brows', 'beard', 'glasses') or (bsdf and cut) else 'OPAQUE'
for img in list(bpy.data.images):
    if img.users == 0: bpy.data.images.remove(img)

# 4) clipes novos por redirecionamento CMU
RT.setup(rig, cfg.get('cmu'))
new = []
# clipe refeito substitui o antigo de mesmo nome
for spec in cfg.get('clips', []):
    for t in list(rig.animation_data.nla_tracks):
        if t.name == spec['name']: rig.animation_data.nla_tracks.remove(t)
    old = bpy.data.actions.get(spec['name'])
    if old: bpy.data.actions.remove(old)
for spec in cfg.get('clips', []):
    try:
        new.append(RT.retarget(spec))
    except Exception:
        import traceback; traceback.print_exc(); print('FALHOU', spec['name'])

# 5) variantes com tocha: o braço esquerdo sobe e segura a chama à frente do peito, o resto do corpo segue o clipe
def bone_dirs():
    b = rig.data.bones
    return {n: (b[n].tail_local - b[n].head_local).normalized() for n in ('LeftArm', 'LeftForeArm', 'LeftHand')}

def torch_variant(src_name, out_name, d_arm, d_fore):
    src = bpy.data.actions.get(src_name)
    if not src: return None
    rest = {b.name: b.matrix_local.to_quaternion() for b in rig.data.bones}
    par = {b.name: (b.parent.name if b.parent else None) for b in rig.data.bones}
    dirs = bone_dirs()
    rig.animation_data_create()
    for t in rig.animation_data.nla_tracks: t.mute = True
    rig.animation_data.action = src
    f0, f1 = int(src.frame_range[0]), int(round(src.frame_range[1]))
    pb = rig.pose.bones
    frames = []
    spine_rest = rest['Spine1']
    for f in range(f0, f1 + 1):
        sc.frame_set(f)
        snap = {b.name: (b.rotation_quaternion.copy() if b.rotation_mode == 'QUATERNION' else b.matrix_basis.to_quaternion(), b.location.copy()) for b in pb}
        spine_pose = pb['Spine1'].matrix.to_quaternion()
        chest = spine_pose @ spine_rest.inverted()
        sh = pb['LeftShoulder'].matrix.to_quaternion()
        A = {}
        for bn, d, parent_q in (('LeftArm', d_arm, sh), ('LeftForeArm', d_fore, None)):
            want = chest @ Vector(d).normalized()
            q_restW = rest[bn]
            q = dirs[bn].rotation_difference(want) @ q_restW
            A[bn] = q
        # base relativa ao pai posado
        rel_arm = rest['LeftShoulder'].inverted() @ rest['LeftArm']
        snap['LeftArm'] = ((sh @ rel_arm).inverted() @ A['LeftArm'], snap['LeftArm'][1])
        rel_fore = rest['LeftArm'].inverted() @ rest['LeftForeArm']
        snap['LeftForeArm'] = ((A['LeftArm'] @ rel_fore).inverted() @ A['LeftForeArm'], snap['LeftForeArm'][1])
        # punho firme: segue o antebraço com leve flexão
        snap['LeftHand'] = (Quaternion((1, 0, 0), 0.25), snap['LeftHand'][1])
        frames.append(snap)
    rig.animation_data.action = None
    act = bpy.data.actions.new(out_name); act.use_fake_user = True
    rig.animation_data.action = act
    for b in pb: b.rotation_mode = 'QUATERNION'
    for i, snap in enumerate(frames):
        for bn, (q, loc) in snap.items():
            b = pb[bn]
            b.rotation_quaternion = q
            b.keyframe_insert('rotation_quaternion', frame=i + 1)
            if par[bn] is None:
                b.location = loc
                b.keyframe_insert('location', frame=i + 1)
    rig.animation_data.action = None
    print('TOCHA', out_name, len(frames))
    return act

# direções no espaço da armadura em repouso (frente = -Y, esquerda = +X, cima = +Z)
D_ARM = (0.38, -0.5, -0.78)
D_FORE = (0.18, -0.95, 0.22)
for s, n in (('idle', 'torch_idle'), ('walk', 'torch_walk'), ('run', 'torch_run'), ('attack', 'torch_attack'), ('attack2', 'torch_attack2'), ('heavy', 'torch_heavy'), ('jump', 'torch_jump')):
    a = torch_variant(s, n, D_ARM, D_FORE)
    if a: new.append(a)

# todas as ações em trilhas NLA para o exportador
existing = {t.name for t in rig.animation_data.nla_tracks}
for act in new:
    if act.name in existing: continue
    tr = rig.animation_data.nla_tracks.new(); tr.name = act.name
    st = tr.strips.new(act.name, 1, act); st.name = act.name
    tr.mute = True
rig.animation_data.action = None
for b in rig.pose.bones:
    b.rotation_quaternion = Quaternion(); b.location = Vector()

total = sum(tris(o) for o in sc.objects if o.type == 'MESH')
print('TOTAL_TRIS', total)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=cfg['out'], export_format='GLB', export_image_format='WEBP', export_image_quality=88,
                          export_animations=True, export_animation_mode='NLA_TRACKS', export_force_sampling=True,
                          export_frame_step=1, export_def_bones=True, export_optimize_animation_size=True,
                          export_apply=False, export_skins=True, export_morph=False, export_yup=True, use_selection=False,
                          export_extras=True)
print('OK', cfg['out'], total)
