# Forja de personagens PS2: corpo MakeHuman (MPFB2, malha proxy de baixa contagem) + figurino procedural + clipes CMU.
# Uso: python3 tools/chars/build.py receita.json saida.glb   (bpy 5.3 do pip; MPFB2 instalado como extensão)
# Receitas em tools/chars/elenco.json. Saída: GLB com rig cmu_mb, materiais "Human.body" (pele), "roupa_ps2" (atlas),
# "brilho_ps2" (emissivo), e as mesmas animações que o jogo já conhece (idle, walk, run, talk, point, attack...).
import bpy, bmesh, sys, os, json, math, time
import numpy as np
from mathutils import Vector, Quaternion

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..', 'pipeline'))
import geo, paint, figurino as _FG
import inspect as _insp


class _Fig:  # filtra chaves que a função de figurino não aceita e avisa no log (receitas podem trazer chaves extras)
    def __getattr__(self, n):
        fn = getattr(_FG, n)
        if not callable(fn) or isinstance(fn, type): return fn
        ps_ = _insp.signature(fn).parameters
        if any(v.kind == v.VAR_KEYWORD for v in ps_.values()): return fn
        def call(*ar, **kw):
            bad = [k for k in kw if k not in ps_]
            if bad: print('[forja] aviso: %s ignora %s' % (n, bad), flush=True)
            return fn(*ar, **{k: v for k, v in kw.items() if k in ps_})
        return call


FG = _Fig()

T0 = time.time()
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
R = json.loads(open(argv[0]).read()) if argv[0].endswith('.json') and not argv[0].startswith('{') else json.loads(argv[0])
if 'elenco' in R:  # arquivo de elenco: escolhe a receita pelo nome
    R = R['elenco'][argv[2]]
OUT = argv[1]
CMU = os.environ.get('CMU_MOCAP_DIR', '/home/user/cmu-mocap/data')
log = lambda *a: print('[forja]', *a, flush=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
import addon_utils
addon_utils.enable('bl_ext.user_default.mpfb', default_set=True)
from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.assetservice import AssetService
from bl_ext.user_default.mpfb.services.targetservice import TargetService
from bl_ext.user_default.mpfb.services.exportservice import ExportService
from bl_ext.user_default.mpfb.services.objectservice import ObjectService

sc = bpy.context.scene
sc.render.fps = 30

# ------------------------------------------------------------------ 1. corpo
B = R['corpo']
macro = TargetService.get_default_macro_info_dict()
for k, v in B.get('macro', {}).items(): macro[k] = v
base = HumanService.create_human(macro_detail_dict=macro)
tdir = os.path.join(os.path.dirname(AssetService.__module__.replace('.', '/')), '')
from bl_ext.user_default.mpfb.services.locationservice import LocationService
TG = os.path.join(LocationService.get_mpfb_data(), 'targets')
for t, w in B.get('targets', {}).items():
    TargetService.load_target(base, os.path.join(TG, t + '.target.gz'), weight=w)
HumanService.set_character_skin(AssetService.find_asset_absolute_path(B.get('pele', 'young_caucasian_female') + '.mhmat', asset_subdir='skins'), base, skin_type='GAMEENGINE')
HumanService.add_builtin_rig(base, 'cmu_mb')
proxy = B.get('proxy', 'female1605' if macro['gender'] < 0.5 else 'male1591')
for sub, name, typ in [('proxymeshes', proxy + '.proxy', 'Proxymeshes'), ('eyes', 'low-poly.mhclo', 'Eyes'), ('eyebrows', B.get('sobrancelha', 'eyebrow001') + '.mhclo', 'Eyebrows')]:
    HumanService.add_mhclo_asset(AssetService.find_asset_absolute_path(name, asset_subdir=sub), base, asset_type=typ, material_type='GAMEENGINE', subdiv_levels=0)
root = ExportService.create_character_copy(base, name_suffix='_x')
xb = ObjectService.find_object_of_type_amongst_nearest_relatives(root, 'Basemesh')
ExportService.bake_modifiers_remove_helpers(xb, bake_masks=True, bake_subdiv=False, remove_helpers=True, also_proxy=True)
keep = {root.name} | {c.name for c in ObjectService.get_list_of_children(root)}
for o in list(bpy.data.objects):
    if o.name not in keep: bpy.data.objects.remove(o)
rig = [o for o in sc.objects if o.type == 'ARMATURE'][0]
rig.name = 'Rig'
basex = [o for o in sc.objects if o.type == 'MESH' and o.name == 'Human_x'][0]
bodyo = [o for o in sc.objects if o.type == 'MESH' and proxy in o.name][0]
eyeso = [o for o in sc.objects if o.type == 'MESH' and 'low-poly' in o.name][0]
browo = [o for o in sc.objects if o.type == 'MESH' and 'eyebrow' in o.name.lower()][0]
skin_mat = basex.data.materials[0]
skin_mat.name = 'mh_pele_origem'
# a UV da malha proxy não é a da textura de pele do MakeHuman: a cor é assada da malha base para a proxy (Cycles, CPU)
SK = R.get('pele_tex', 512)
bake_img = bpy.data.images.new('pele_ps2', SK, SK, alpha=False)
bm_ = bpy.data.materials.new('Human.body'); bm_.use_nodes = True
tn = bm_.node_tree.nodes.new('ShaderNodeTexImage'); tn.image = bake_img
bm_.node_tree.links.new(tn.outputs['Color'], bm_.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
bm_.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.62
bm_.node_tree.nodes.active = tn
bodyo.data.materials.clear(); bodyo.data.materials.append(bm_)
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 1
for o in sc.objects: o.select_set(False)
basex.select_set(True); bodyo.select_set(True); bpy.context.view_layer.objects.active = bodyo
bpy.ops.object.bake(type='DIFFUSE', pass_filter={'COLOR'}, use_selected_to_active=True, cage_extrusion=0.03, max_ray_distance=0.06, margin=4)
bake_img.pack()
skin_mat = bm_
log('pele assada em %.1fs' % (time.time() - T0))
bpy.data.objects.remove(basex)
for o in sc.objects:
    if o.type == 'MESH' and o.data.shape_keys:
        bpy.context.view_layer.objects.active = o
        o.shape_key_clear()
bodyo.name = 'corpo'
body = geo.Body(bodyo, rig)
mk = FG.Marks(body)
ev = np.array([tuple(eyeso.matrix_world @ v.co) for v in eyeso.data.vertices])
eyes = (tuple(ev[ev[:, 0] > 0].mean(0)), tuple(ev[ev[:, 0] < 0].mean(0)))
log('corpo', len(body.F), 'faces; altura %.3f' % mk.height, 'olhos', [round(x, 3) for x in eyes[0]])

# ------------------------------------------------------------------ 2. figurino
pieces = []
named = {}
for spec in R.get('pecas', []):
    t = spec['tipo']; a = {k: v for k, v in spec.items() if k not in ('tipo', 'id', 'ref')}
    z = lambda key: getattr(mk, key) if isinstance(key, str) else key
    for key in ('z_bot', 'z_top', 'z_hem', 'z', 'z_max'):
        if key in a and isinstance(a[key], str):
            # aceita "hip-0.1", "knee+0.05"
            s = a[key]
            for op in ('+', '-'):
                if op in s[1:]:
                    nm, val = s.split(op, 1) if not s.startswith('-') else (s, '0')
                    a[key] = getattr(mk, nm) + (float(val) if op == '+' else -float(val)); break
            else:
                a[key] = getattr(mk, s)
    if t == 'tronco': p = FG.bodice(body, mk, **a)
    elif t == 'saia': p = FG.skirt(body, mk, **a)
    elif t == 'manga': p = [FG.sleeve(body, mk, s, **a) for s in ('L', 'R')]
    elif t == 'calca': p = [FG.trouser(body, mk, s, **a) for s in ('L', 'R')]
    elif t == 'bota': p = [FG.boot(body, mk, s, **a) for s in ('L', 'R')]
    elif t == 'luva':
        p = []
        for s, nm in (('L', geo.HAND_L), ('R', geo.HAND_R)):
            q = geo.Piece('luva' + s, a.get('cell', 'luva'), allow=set(nm + [('Left' if s == 'L' else 'Right') + 'ForeArm']))
            FG.shell(body, q, nm + [('Left' if s == 'L' else 'Right') + 'ForeArm'], a.get('off', 0.004),
                     pred=(lambda pp, s=s: True) if a.get('cano') else None,
                     z_max=None)
            if not a.get('cano'):
                q2 = geo.Piece('luva' + s, a.get('cell', 'luva'), allow=q.allow)
                FG.shell(body, q2, nm, a.get('off', 0.004))
                q = q2
            p.append(q)
    elif t == 'capa': p = FG.capelet(body, mk, **a)
    elif t == 'capuz': p = FG.hood(body, mk, **a)
    elif t == 'cachecol': p = FG.scarf(body, mk, **a)
    elif t == 'cinto': p = FG.belt(body, mk, **a)
    elif t == 'avental': p = FG.apron(body, mk, named[spec['ref']], **a)
    elif t == 'bolsa': p = FG.satchel(body, mk, **a)
    elif t == 'chapeu': p = FG.hat(body, mk, **a)
    elif t == 'oculos': p = FG.glasses(body, mk, eyes, **a)
    elif t == 'cabelo': p = FG.hair(body, mk, **a)
    elif t == 'barba': p = FG.beard(body, mk, eyes, **a)
    elif t == 'mascara': p = FG.mask(body, mk, eyes, **a)
    elif t == 'lampiao': p = FG.lantern(body, **a)
    elif t == 'haste': p = FG.staff(body, **a)
    elif t == 'livro': p = FG.book(body, **a)
    elif t == 'chaves': p = FG.keys(body, mk, **a)
    elif t == 'incensario': p = FG.censer(body, **a)
    elif t == 'bolsinha': p = FG.pouch(body, mk, **a)
    elif t == 'ferramenta': p = FG.tool_on_belt(body, mk, **a)
    elif t == 'cogumelos': p = FG.mushrooms(body, mk, **a)
    elif t == 'oculos_testa': p = FG.goggles(body, mk, eyes, **a)
    elif t == 'mochila': p = FG.backpack(body, mk, **a)
    elif t == 'sino': p = FG.small_bell(body, mk, **a)
    elif t == 'elmo_sino': p = FG.bell_helm(body, mk, **a)
    elif t == 'elmo_grade': p = FG.cage_helm(body, mk, **a)
    elif t == 'lamina': p = FG.blade(body, **a)
    elif t == 'martelo': p = FG.hammer(body, **a)
    elif t == 'gancho': p = FG.hook_pick(body, **a)
    elif t == 'aureola': p = FG.halo(body, mk, **a)
    elif t == 'coroa': p = FG.crown(body, mk, **a)
    elif t == 'cristais': p = FG.crystals(body, mk, **a)
    elif t == 'correntes': p = FG.chains(body, mk, **a)
    else: raise ValueError(t)
    ps = p if isinstance(p, list) else [p]
    if 'id' in spec: named[spec['id']] = ps[0]
    pieces.extend(ps)
log('peças', len(pieces), 'em %.1fs' % (time.time() - T0))

# ------------------------------------------------------------------ 3. atlas e pintura
CELLS = R.get('celulas', {})
AT = paint.Atlas(R.get('atlas', 512), seed=R.get('seed', 1))
DEFAULT_SIZE = {'saia': (256, 192), 'tronco': (128, 128), 'capa': (128, 128), 'manga': (64, 128), 'calca': (64, 128),
                'bota': (64, 64), 'luva': (32, 32), 'capuz': (128, 128), 'cachecol': (64, 64), 'couro': (64, 64),
                'metal': (32, 32), 'brilho': (32, 32), 'cabelo': (128, 128), 'barba': (64, 64), 'avental': (128, 128),
                'chapeu': (128, 128), 'madeira': (32, 64), 'livro': (32, 32), 'mascara': (64, 64),
                'cogumelo': (32, 32), 'osso_claro': (16, 16), 'lente': (16, 16), 'papel': (32, 32), 'bronze': (64, 64),
                'gelo': (32, 32), 'vazio': (16, 16), 'olho': (16, 16)}
AUTO = {'cogumelo': {'pintura': 'brilho', 'col': 'a070ff'}, 'osso_claro': {'pintura': 'plano', 'col': 'c8bca0'},
        'lente': {'pintura': 'plano', 'col': '3a4a50'}, 'papel': {'pintura': 'plano', 'col': 'c8b890', 'noise': 0.2},
        'bronze': {'pintura': 'metal', 'col': 'a07a40', 'rust': 0.3}, 'gelo': {'pintura': 'plano', 'col': 'c8d8e8', 'noise': 0.25},
        'vazio': {'pintura': 'plano', 'col': '050407', 'noise': 0.05}, 'olho': {'pintura': 'brilho', 'col': 'ff6a5a'},
        'madeira': {'pintura': 'madeira'}, 'livro': {'pintura': 'tecido', 'col': '4a1a20', 'kind': 'couro', 'folds': 0, 'trim': 'a08040', 'trim_w': 0.1},
        'metal': {'pintura': 'metal'}, 'brilho': {'pintura': 'brilho'}}
for k_, v_ in AUTO.items(): CELLS.setdefault(k_, v_)
used = []
for p in pieces:
    if p.cell not in used: used.append(p.cell)
used.sort(key=lambda c: -(CELLS.get(c, {}).get('tam') or DEFAULT_SIZE.get(c, (64, 64)))[0] * (CELLS.get(c, {}).get('tam') or DEFAULT_SIZE.get(c, (64, 64)))[1])
for c in used:
    w, h = CELLS.get(c, {}).get('tam') or DEFAULT_SIZE.get(c, (64, 64))
    AT.alloc(c, w, h)
    sp = dict(CELLS.get(c, {}))
    sp.pop('tam', None)
    kind = sp.pop('pintura', 'tecido' if c not in ('metal', 'brilho', 'cabelo', 'barba', 'madeira') else c)
    if kind == 'tecido': paint.paint_cloth(AT, c, **({'col': '3a3036'} | sp))
    elif kind == 'espectro':
        import criatura_paint as CP; CP.paint_shroud(AT, c, **sp)
    elif kind == 'metal': paint.paint_metal(AT, c, **sp)
    elif kind == 'brilho': paint.paint_glow(AT, c, **sp)
    elif kind in ('cabelo', 'barba'): paint.paint_hair(AT, c, **({'col': '2a1d16'} | sp))
    elif kind == 'madeira': paint.paint_cloth(AT, c, **({'col': '4a3424', 'kind': 'couro', 'folds': 0, 'grime': 0.2, 'trim': None, 'seams': False} | sp))
    elif kind == 'plano': paint.paint_flat(AT, c, **sp)
for p in pieces:
    p.uv = [[AT.uv_map(p.cell, max(0, min(1, u)), max(0, min(1, v))) for (u, v) in f] for f in p.uv]
atlas_px = paint.ps2_grade(np.clip(AT.px * R.get('clarear', 1.3), 0, 255 if AT.px.max() > 1.5 else 1).astype(AT.px.dtype), sat=R.get('sat', 0.85), contrast=1.05, levels=R.get('niveis', 31))

def make_image(name, px):
    h, w = px.shape[:2]
    img = bpy.data.images.new(name, w, h, alpha=False)
    rgba = np.ones((h, w, 4), np.float32); rgba[..., :3] = px[::-1]
    img.pixels.foreach_set(rgba.ravel()); img.pack()
    return img

atlas_img = make_image('roupa_ps2', atlas_px)

def mat_tex(name, img, rough=0.9, emit=None):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; bs = nt.nodes['Principled BSDF']
    tx = nt.nodes.new('ShaderNodeTexImage'); tx.image = img; tx.interpolation = 'Linear'
    nt.links.new(tx.outputs['Color'], bs.inputs['Base Color'])
    bs.inputs['Roughness'].default_value = rough; bs.inputs['Metallic'].default_value = 0
    if emit:
        nt.links.new(tx.outputs['Color'], bs.inputs['Emission Color'])
        bs.inputs['Emission Strength'].default_value = emit
    m.use_backface_culling = False
    m['ps2_alpha'] = 'OPAQUE'
    return m

M_ROUPA = mat_tex('roupa_ps2', atlas_img)
M_BRILHO = mat_tex('brilho_ps2', atlas_img, rough=0.5, emit=2.0)
# protagonistas: cabelo em material próprio ("hair_ps2", mesma textura) para o jogo tingir a cor escolhida
M_CABELO = mat_tex('hair_ps2', atlas_img, rough=0.7) if R.get('cabelo_material') else None  # rugosidade distinta: o dedup do meshopt não funde com a roupa
if M_CABELO:
    for p in pieces:
        if p.cell == 'cabelo': p.mat = 'cabelo'

# ------------------------------------------------------------------ 4. malhas, pele (pesos) e corte do corpo escondido
bone_names = [b.name for b in rig.data.bones]

def piece_weights(p, verts):
    W = np.zeros((len(verts), len(body.groups)))
    gi = {g: i for i, g in enumerate(body.groups)}
    if p.skin == 'rigid':
        W[:, gi[p.bone]] = 1
        return W
    allow = sorted(p.allow) if p.allow else None
    key = 'allow:' + ','.join(allow) if allow else 'all'
    if p.skin == 'hood':
        allow = ['Head', 'Neck1', 'Neck', 'Spine1']; key = 'hood'
    for i, v in enumerate(verts):
        w, d = body.weights_at(v, key, allow)
        if w is None: w, d = body.weights_at(v)
        W[i] = w
    if p.skin == 'skirt':
        m = p.meta
        zt, zh = m['z_top'], m['z_hem']
        tors = ['Hips', 'LowerBack', 'LHipJoint', 'RHipJoint']
        for i, v in enumerate(verts):
            z = v[2]
            if z > mk.hip + 0.02:
                continue
            s = FG.smooth((mk.hip + 0.02 - z) / max(mk.hip + 0.02 - zh, 1e-3)) * m.get('follow', 0.8)
            a = math.atan2(v[0], -(v[1] - spine_center_y))
            f = 0.5 + 0.5 * math.sin(a)
            f = FG.smooth(f * 1.2 - 0.1)
            leg = np.zeros(len(body.groups))
            kn = FG.smooth((mk.knee + 0.1 - z) / 0.3) * 0.35  # abaixo do joelho a barra acompanha um pouco a canela
            leg[gi['LeftUpLeg']] = f * (1 - kn); leg[gi['RightUpLeg']] = (1 - f) * (1 - kn)
            leg[gi['LeftLeg']] = f * kn; leg[gi['RightLeg']] = (1 - f) * kn
            hip = np.zeros(len(body.groups)); hip[gi['Hips']] = 1
            W[i] = hip * (1 - s) + leg * s
    return W

spine_center_y = geo.spine_center(body, mk.hip).y

def build_object(name, plist, mat):
    if not plist: return None
    ob, spans = geo.to_mesh(name, plist)
    me = ob.data
    verts = np.array([tuple(v.co) for v in me.vertices])
    W = np.zeros((len(verts), len(body.groups)))
    for p, a, b in spans:
        if b > a: W[a:b] = piece_weights(p, verts[a:b])
    # suavização por vizinhança dentro de cada peça não rígida
    adj = [set() for _ in range(len(verts))]
    for poly in me.polygons:
        vs = list(poly.vertices)
        for i in range(len(vs)):
            adj[vs[i]].add(vs[i - 1]); adj[vs[i - 1]].add(vs[i])
    rigid = np.zeros(len(verts), bool)
    for p, a, b in spans:
        if p.skin == 'rigid': rigid[a:b] = True
    for _ in range(2):
        W2 = W.copy()
        for i in range(len(verts)):
            if rigid[i] or not adj[i]: continue
            nb = [j for j in adj[i] if not rigid[j]]
            if nb: W2[i] = W[i] * 0.5 + W[nb].mean(0) * 0.5
        W = W2
    # no máximo 4 influências
    idx = np.argsort(-W, axis=1)[:, :4]
    for gname in body.groups: ob.vertex_groups.new(name=gname)
    for i in range(len(verts)):
        ws = W[i, idx[i]]; s = ws.sum() or 1
        for j, wv in zip(idx[i], ws / s):
            if wv > 0.01: ob.vertex_groups[j].add([i], float(wv), 'REPLACE')
    for p, a, b in spans:  # objetos segurados na mão: corrigidos depois para a pose de referência
        if p.skin == 'rigid' and p.bone and p.bone.endswith('Hand') and p.meta.get('hold', 'mundo') == 'mundo' and b > a:
            HOLD.append((ob, a, b, p.bone))
    me.materials.append(mat)
    ob.parent = rig
    md = ob.modifiers.new('Armature', 'ARMATURE'); md.object = rig
    # normais suaves por padrão (PS2 sombreava Gouraud)
    for poly in me.polygons: poly.use_smooth = True
    return ob

HOLD = []
roupa = build_object('roupa', [p for p in pieces if p.mat == 'roupa'], M_ROUPA)
brilho = build_object('brilho', [p for p in pieces if p.mat == 'brilho'], M_BRILHO)
cabelo = build_object('cabelo', [p for p in pieces if p.mat == 'cabelo'], M_CABELO) if M_CABELO else None

# corta faces do corpo cobertas (evita atravessar a roupa e economiza triângulos)
hide = R.get('esconder', [])
if hide:
    bm = bmesh.new(); bm.from_mesh(bodyo.data)
    bm.faces.ensure_lookup_table()
    zmin = R.get('esconder_z_min', -9); zmax = R.get('esconder_z_max', 9)
    kill = []
    for f in bm.faces:
        d = body.fdom[f.index]
        cz = sum(v.co.z for v in f.verts) / len(f.verts)
        if any(d == n or d.startswith(n) for n in hide) and zmin <= cz <= zmax: kill.append(f)
    bmesh.ops.delete(bm, geom=kill, context='FACES')
    bm.to_mesh(bodyo.data); bm.free()
    log('corpo: %d faces escondidas' % len(kill))
# cílios em cartão alfa somem; sobrancelha vira pintura na pele
for o in list(sc.objects):
    if o.type == 'MESH' and 'eyelash' in o.name.lower(): bpy.data.objects.remove(o)

# ------------------------------------------------------------------ 5. texturas da pele e dos olhos
def node_images(mat):
    out = []
    def walk(nt):
        for n in nt.nodes:
            if n.type == 'TEX_IMAGE' and n.image: out.append(n.image)
            if n.type == 'GROUP' and n.node_tree: walk(n.node_tree)
    if mat and mat.use_nodes: walk(mat.node_tree)
    return out

def img_np(img):
    w, h = img.size
    px = np.empty(w * h * 4, np.float32); img.pixels.foreach_get(px)
    return px.reshape(h, w, 4)

def set_np(img, a):
    img.pixels.foreach_set(a.ravel()); img.update(); img.pack()

for img in node_images(skin_mat)[:1]:
    if any(x in img.name.lower() for x in ('normal', 'nor', 'bump', 'spec', 'rough', 'ao')): continue
    if img.size[0] > SK: img.scale(SK, SK)
    a = img_np(img)
    h, w = a.shape[:2]
    # sobrancelhas pintadas: cada vértice do cartão vira um traço na UV da pele
    bv = [browo.matrix_world @ v.co for v in browo.data.vertices]
    bc = paint.hexrgb(R.get('sobrancelha_cor', '2a1d16'))
    # traço de 1 px entre vértices vizinhos do cartão, metade da opacidade: sobrancelha fina e contínua
    mask_b = np.zeros((h, w), np.float32)
    uvs_b = [body.uv_at(p) for p in bv]
    for e in browo.data.edges:
        (u0, v0), (u1, v1) = uvs_b[e.vertices[0]], uvs_b[e.vertices[1]]
        for t in np.linspace(0, 1, 6):
            x, y = int((u0 + (u1 - u0) * t) * w), int((v0 + (v1 - v0) * t) * h)
            if 0 <= x < w and 0 <= y < h: mask_b[y, x] = 1
    mask_b = np.clip(paint.blur(mask_b, 1) * 1.6, 0, R.get('sobrancelha_forca', 0.6))
    a[..., :3] = a[..., :3] * (1 - mask_b[..., None]) + bc[None, None, :] * mask_b[..., None]
    # tinta de pele (corrige tom), fuligem, palidez
    tint = R.get('pele_tinta')
    if tint: a[..., :3] *= paint.hexrgb(tint)[None, None, :] / max(paint.hexrgb(tint).max(), 1e-3)
    flip = a[::-1].copy()
    flip[..., :3] = paint.blur(flip[..., :3], 1) * 0.5 + flip[..., :3] * 0.5
    flip = paint.ps2_grade(flip, sat=R.get('pele_sat', 0.82), contrast=1.04, levels=R.get('niveis', 31))
    set_np(img, flip[::-1].copy())
    log('pele', img.name, img.size[:])
for img in node_images(eyeso.data.materials[0] if eyeso.data.materials else None):
    if img.size[0] > 128: img.scale(128, 128)
for o in list(sc.objects):
    if o == browo: bpy.data.objects.remove(o)
# normal maps fora (PS2 não tinha)
for m in bpy.data.materials:
    if not m.use_nodes: continue
    for n in list(m.node_tree.nodes):
        if n.type == 'NORMAL_MAP': m.node_tree.nodes.remove(n)
    for n in m.node_tree.nodes:
        if n.type == 'GROUP' and n.node_tree:
            for k in list(n.node_tree.nodes):
                if k.type == 'NORMAL_MAP': n.node_tree.nodes.remove(k)
for img in list(bpy.data.images):
    if any(x in img.name.lower() for x in ('normal', '_nor')) : bpy.data.images.remove(img)

# ------------------------------------------------------------------ 6. animações (CMU redirecionada) e variantes com tocha
import retarget as RT
for b in rig.pose.bones: b.rotation_mode = 'QUATERNION'
RT.setup(rig, CMU)
clips = json.load(open(os.path.join(HERE, '..', 'pipeline', 'clips.json')))
EXTRA = {c['name']: c for c in [
    {"name": "jump", "bvh": "16_01", "pick": "peak", "sig": "hips_up", "pre": 0.5, "post": 0.6, "flatz": True},
    {"name": "attack2", "bvh": "02_09", "pick": "peak", "sig": "rhand_speed", "pre": 0.3, "post": 0.4, "from": 2},
    {"name": "die", "bvh": "90_12", "pick": "peak", "sig": "hips_down", "pre": 1.3, "post": 0.4, "drift": 0.15, "ground_dz": -0.12},
]}
clips = [EXTRA.get(c['name'], c) for c in clips] + [c for n, c in EXTRA.items() if n not in {x['name'] for x in clips}]
want = set(R.get('clipes', [c['name'] for c in clips]))
acts = []
for spec in clips:
    if spec['name'] not in want: continue
    try:
        acts.append(RT.retarget(spec))
    except Exception:
        import traceback; traceback.print_exc(); log('FALHOU', spec['name'])

def head_pitch(act):
    """inclinação média do rosto (graus; positivo = olhando para baixo) ao longo do clipe"""
    rig.animation_data_create(); rig.animation_data.action = act
    rest = rig.data.bones['Head'].matrix_local.to_quaternion()
    fl = rest.inverted() @ Vector((0, -1, 0))
    f0, f1 = int(act.frame_range[0]), int(round(act.frame_range[1]))
    acc = []
    for f in range(f0, f1 + 1, 3):
        sc.frame_set(f)
        fw = rig.pose.bones['Head'].matrix.to_quaternion() @ fl
        acc.append(math.degrees(math.atan2(-fw.z, math.hypot(fw.x, fw.y))))
    rig.animation_data.action = None
    return sum(acc) / len(acc)

def rotate_keys(act, bone, axis, ang):
    """multiplica a rotação local de todos os quadros de `bone` por um giro fixo"""
    fcs = [fc for fc in act.fcurves if fc.data_path == f'pose.bones["{bone}"].rotation_quaternion'] if hasattr(act, 'fcurves') else []
    if not fcs:
        # Blender 5: ações em camadas
        for layer in act.layers:
            for strip in layer.strips:
                for cb in strip.channelbags:
                    fcs += [fc for fc in cb.fcurves if fc.data_path == f'pose.bones["{bone}"].rotation_quaternion']
    if len(fcs) != 4: return False
    fcs.sort(key=lambda fc: fc.array_index)
    corr = Quaternion(axis, math.radians(ang))
    n = len(fcs[0].keyframe_points)
    for i in range(n):
        q = Quaternion([fcs[c].keyframe_points[i].co[1] for c in range(4)])
        q2 = q @ corr
        for c in range(4): fcs[c].keyframe_points[i].co[1] = q2[c]
    for fc in fcs: fc.update()
    return True

LEVEL = {'idle', 'walk', 'run', 'talk', 'listen', 'point', 'wave', 'shrug', 'interact', 'jump', 'attack', 'attack2', 'heavy', 'cast'}
def level_head(act, target=R.get('olhar', 6.0)):
    p0 = head_pitch(act)
    if p0 - target < 4: return
    for sign in (1, -1):
        for bn in ('Neck1', 'Head'):
            rotate_keys(act, bn, Vector((1, 0, 0)), sign * (p0 - target) * 0.5)
        p1 = head_pitch(act)
        if abs(p1 - target) < abs(p0 - target): log('cabeça', act.name, '%.0f -> %.0f graus' % (p0, p1)); return
        for bn in ('Neck1', 'Head'):
            rotate_keys(act, bn, Vector((1, 0, 0)), -sign * (p0 - target) * 0.5)
    log('cabeça', act.name, 'sem correção', round(p0))

for a in acts:
    if a.name in LEVEL and not R.get('sem_nivelar'): level_head(a)
POST = R.get('postura')  # {"Spine": graus, "Spine1": graus, "Neck": graus}: curvatura fixa (erudito oco, errante)
if POST:
    ref = next((a for a in acts if a.name == 'idle'), acts[0])
    p0 = head_pitch(ref)
    sgn = 1
    for bn, ang in POST.items(): rotate_keys(ref, bn, Vector((1, 0, 0)), ang)
    if head_pitch(ref) < p0: sgn = -1
    for bn, ang in POST.items(): rotate_keys(ref, bn, Vector((1, 0, 0)), -ang)
    for a in acts:
        for bn, ang in POST.items(): rotate_keys(a, bn, Vector((1, 0, 0)), sgn * ang)
    log('postura', POST, 'sinal', sgn)

LEGB = ['Hips', 'LHipJoint', 'RHipJoint', 'LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg', 'LeftFoot', 'RightFoot', 'LeftToeBase', 'RightToeBase']
def freeze_legs(act, ref):
    """gestos de NPC sem passo: pernas e quadril copiados do primeiro quadro do idle"""
    def fcs_of(a):
        out = []
        for layer in a.layers:
            for strip in layer.strips:
                for cb in strip.channelbags: out += list(cb.fcurves)
        return out
    rf = {(fc.data_path, fc.array_index): fc.keyframe_points[0].co[1] for fc in fcs_of(ref) if fc.keyframe_points}
    for fc in fcs_of(act):
        if not any(f'"{b}"' in fc.data_path for b in LEGB): continue
        v = rf.get((fc.data_path, fc.array_index))
        if v is None: continue
        if fc.data_path.endswith('location') and fc.array_index == 2 and 'Hips' in fc.data_path:
            pass
        for k in fc.keyframe_points: k.co[1] = v
        fc.update()
idle_a = next((a for a in acts if a.name == 'idle'), None)
if idle_a and R.get('gestos_parados', True):
    for a in acts:
        if a.name in ('point', 'wave', 'shrug', 'talk', 'interact', 'listen'): freeze_legs(a, idle_a)


def torch_variant(src_name, out_name, d_arm, d_fore):
    src = bpy.data.actions.get(src_name)
    if not src: return None
    rest = {b.name: b.matrix_local.to_quaternion() for b in rig.data.bones}
    par = {b.name: (b.parent.name if b.parent else None) for b in rig.data.bones}
    dirs = {n: (rig.data.bones[n].tail_local - rig.data.bones[n].head_local).normalized() for n in ('LeftArm', 'LeftForeArm')}
    rig.animation_data_create(); rig.animation_data.action = src
    f0, f1 = int(src.frame_range[0]), int(round(src.frame_range[1]))
    pb = rig.pose.bones
    frames = []
    for f in range(f0, f1 + 1):
        sc.frame_set(f)
        snap = {b.name: (b.rotation_quaternion.copy(), b.location.copy()) for b in pb}
        chest = pb['Spine1'].matrix.to_quaternion() @ rest['Spine1'].inverted()
        sh = pb['LeftShoulder'].matrix.to_quaternion()
        Aq = {}
        for bn, d in (('LeftArm', d_arm), ('LeftForeArm', d_fore)):
            Aq[bn] = dirs[bn].rotation_difference(chest @ Vector(d).normalized()) @ rest[bn]
        snap['LeftArm'] = ((sh @ (rest['LeftShoulder'].inverted() @ rest['LeftArm'])).inverted() @ Aq['LeftArm'], snap['LeftArm'][1])
        snap['LeftForeArm'] = ((Aq['LeftArm'] @ (rest['LeftArm'].inverted() @ rest['LeftForeArm'])).inverted() @ Aq['LeftForeArm'], snap['LeftForeArm'][1])
        snap['LeftHand'] = (Quaternion((1, 0, 0), 0.25), snap['LeftHand'][1])
        frames.append(snap)
    rig.animation_data.action = None
    act = bpy.data.actions.new(out_name); act.use_fake_user = True
    rig.animation_data.action = act
    for i, snap in enumerate(frames):
        for bn, (q, loc) in snap.items():
            b = pb[bn]; b.rotation_quaternion = q; b.keyframe_insert('rotation_quaternion', frame=i + 1)
            if par[bn] is None: b.location = loc; b.keyframe_insert('location', frame=i + 1)
    rig.animation_data.action = None
    return act

if R.get('tocha'):
    for s, n in (('idle', 'torch_idle'), ('walk', 'torch_walk'), ('run', 'torch_run'), ('attack', 'torch_attack'), ('attack2', 'torch_attack2'), ('heavy', 'torch_heavy'), ('jump', 'torch_jump')):
        a = torch_variant(s, n, (0.38, -0.5, -0.78), (0.18, -0.95, 0.22))
        if a: acts.append(a)
# lampião na mão esquerda: braço baixo e firme, o lampião balança só com o corpo
if R.get('lampiao_braco'):
    for s in ('idle', 'walk', 'run', 'talk', 'listen'):
        a = torch_variant(s, s + '_tmp', (0.25, -0.15, -0.96), (0.1, -0.75, -0.65))
        if a:
            old = bpy.data.actions.get(s)
            acts = [x for x in acts if x.name != s]
            if old: bpy.data.actions.remove(old)
            a.name = s; acts.append(a)

# objetos de mão modelados em coordenadas do mundo (haste vertical, lampião pendurado) são desenhados na pose de
# repouso em A; sem correção, giram com a mão quando o clipe abaixa o braço (a haste ficava deitada). Reancora cada um
# para que, no quadro de referência do clipe 'idle', apareça exatamente como foi desenhado, com a empunhadura na mão.
ref = next((a for a in acts if a.name == R.get('pose_ref', 'idle')), None)
if HOLD and ref:
    rig.animation_data_create(); rig.animation_data.action = ref
    sc.frame_set(int(ref.frame_range[0]) + 1); bpy.context.view_layer.update()
    for ob, a, b, bone in HOLD:
        pb = rig.pose.bones[bone]
        Mr = rig.matrix_world @ rig.data.bones[bone].matrix_local
        Mp = rig.matrix_world @ pb.matrix
        g_r = Mr.translation.copy(); g_p = (Mp @ Mr.inverted()) @ g_r
        T = Mr @ Mp.inverted()
        mw = ob.matrix_world; mwi = mw.inverted()
        for i in range(a, b):
            v = ob.data.vertices[i]
            w = mw @ v.co
            v.co = mwi @ (T @ (w - g_r + g_p))
    rig.animation_data.action = None
    log('objetos de mão reancorados', len(HOLD))

rig.animation_data_create()
for act in acts:
    tr = rig.animation_data.nla_tracks.new(); tr.name = act.name
    st = tr.strips.new(act.name, 1, act); st.name = act.name
    tr.mute = True
rig.animation_data.action = None
for b in rig.pose.bones: b.rotation_quaternion = Quaternion(); b.location = Vector()

# ------------------------------------------------------------------ 7. relatório e exportação
def tris(o):
    return sum(len(p.vertices) - 2 for p in o.data.polygons)
mesh_objs = [o for o in sc.objects if o.type == 'MESH']
total = sum(tris(o) for o in mesh_objs)
sc['ps2_altura'] = float(mk.height)
sc['ps2_id'] = R.get('id', '')
for o in mesh_objs: log('malha', o.name, tris(o), [m.name for m in o.data.materials])
log('TOTAL_TRIS', total, 'ossos', len(rig.data.bones), 'clipes', len(acts))
if R.get('blend'): bpy.ops.wm.save_as_mainfile(filepath=R['blend'])
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_image_format='WEBP', export_image_quality=90,
                          export_animations=True, export_animation_mode='NLA_TRACKS', export_force_sampling=True,
                          export_frame_step=1, export_def_bones=True, export_optimize_animation_size=True,
                          export_apply=False, export_skins=True, export_morph=False, export_yup=True, use_selection=False,
                          export_extras=True)
log('OK', OUT, total, 'tris em %.1fs' % (time.time() - T0))
print(json.dumps({'ok': True, 'out': OUT, 'tris': total, 'altura': mk.height, 'clipes': len(acts), 's': round(time.time() - T0, 1)}))
