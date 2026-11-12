# Uso: python -I props.py <in.blend> <out.glb> <tris_alvo> <tex_max>
import sys, bpy, os
import re, json
cfg = json.loads(sys.argv[-1]); src, out, target, texmax = cfg['src'], cfg['out'], cfg['tris'], cfg['tex']
keep = re.compile(cfg.get('keep', '.*')); drop = re.compile(cfg.get('drop', '^$'))
bpy.ops.wm.open_mainfile(filepath=src)
sc = bpy.context.scene
def unex(lc):
    lc.exclude = False; lc.hide_viewport = False
    for c in lc.children: unex(c)
unex(bpy.context.view_layer.layer_collection)
for o in sc.objects: o.hide_set(False); o.hide_viewport = False
# remover câmeras, luzes e objetos fora da cena ativa
for o in list(bpy.data.objects):
    if o.type in ('CAMERA', 'LIGHT', 'EMPTY') and not o.children: bpy.data.objects.remove(o); continue
    if o.type == 'MESH' and (not keep.search(o.name) or drop.search(o.name)): bpy.data.objects.remove(o)
meshes = [o for o in sc.objects if o.type == 'MESH']
for o in meshes:
    for m in o.modifiers:
        if m.type == 'NODES' and cfg.get('dropnodes', True): o.modifiers.remove(m)
meshes = [o for o in sc.objects if o.type == 'MESH']
dg = bpy.context.evaluated_depsgraph_get()
def tris(o):
    ev = o.evaluated_get(dg); m = ev.to_mesh(); m.calc_loop_triangles(); n = len(m.loop_triangles); ev.to_mesh_clear(); return n
counts = {o.name: tris(o) for o in meshes}
total = sum(counts.values())
print('TRIS_ORIG', total, len(meshes))
for o in meshes:
    bpy.context.view_layer.objects.active = o
    for m in list(o.modifiers):
        try: bpy.ops.object.modifier_apply(modifier=m.name)
        except Exception as e: o.modifiers.remove(m)
if cfg.get('origin'):
    for o in meshes: o.matrix_world.translation = (0, 0, 0)
dg = bpy.context.evaluated_depsgraph_get()
total = sum(tris(o) for o in meshes)
if total > target:
    r = target / total
    for o in meshes:
        if o.data.users > 1: o.data = o.data.copy()
        md = o.modifiers.new('dec', 'DECIMATE'); md.ratio = max(0.02, r); md.use_collapse_triangulate = True
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.modifier_apply(modifier='dec')
dg = bpy.context.evaluated_depsgraph_get()
print('TRIS_FINAL', sum(tris(o) for o in meshes))
for img in list(bpy.data.images):
    try:
        img.pixels[0]
    except Exception:
        print('REMOVE_IMG', img.name); bpy.data.images.remove(img); continue
    if img.source != 'FILE' or not img.size[0]: continue
    w, h = img.size
    s = min(1.0, texmax / max(w, h))
    if s < 1: img.scale(max(4, int(w * s)), max(4, int(h * s)))
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_image_format='WEBP', export_image_quality=82,
    export_apply=True, export_yup=True, use_selection=False, export_extras=False, export_cameras=False, export_lights=False, export_animations=False)
print('OK', out)
