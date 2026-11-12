import bpy, bmesh, numpy as np, sys, json
cfg=json.loads(sys.argv[-1])
bpy.ops.wm.open_mainfile(filepath=cfg['src'])
def unex(lc):
    lc.exclude=False
    for c in lc.children: unex(c)
unex(bpy.context.view_layer.layer_collection)
sc=bpy.context.scene
keepname=cfg['obj']
for o in list(sc.objects):
    if o.name!=keepname: bpy.data.objects.remove(o)
o=sc.objects[keepname]; o.matrix_world.translation=(0,0,0)
me=o.data
nv=len(me.vertices); nl=len(me.loops); npoly=len(me.polygons)
print('polys',npoly)
# componentes conexos por união-busca sobre arestas
ed=np.zeros(len(me.edges)*2,np.int64); me.edges.foreach_get('vertices',ed); ed=ed.reshape(-1,2)
par=np.arange(nv)
def find(a):
    while True:
        p=par[a]; gp=par[p]
        if np.all(p==gp): return p
        par[a]=gp; a=gp
for it in range(60):
    ra=find(ed[:,0]); rb=find(ed[:,1])
    lo=np.minimum(ra,rb); hi=np.maximum(ra,rb)
    np.minimum.at(par,hi,lo)
    if np.all(ra==rb): break
root=find(np.arange(nv))
# material por polígono e componente por polígono
pm=np.zeros(npoly,np.int64); me.polygons.foreach_get('material_index',pm)
ls=np.zeros(npoly,np.int64); me.polygons.foreach_get('loop_start',ls)
lv=np.zeros(nl,np.int64); me.loops.foreach_get('vertex_index',lv)
pc=root[lv[ls]]
mats=[m.name for m in me.materials]; print(mats)
rng=np.random.default_rng(7)
comps,inv=np.unique(pc,return_inverse=True)
keepc=np.ones(len(comps),bool)
leafmat=[i for i,m in enumerate(mats) if 'leaves' in m.lower() or 'leaf' in m.lower()]
# componente é folha se a maioria dos polígonos tem material de folha
isleaf=np.zeros(len(comps)); np.add.at(isleaf,inv,np.isin(pm,leafmat).astype(float))
cnt=np.bincount(inv); isleaf=isleaf/cnt>0.5
keepc[isleaf]=rng.random(isleaf.sum())<cfg['frac']
print('comps',len(comps),'leafcomps',isleaf.sum(),'kept',keepc[isleaf].sum())
delp=~keepc[inv]
bm=bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table()
bmesh.ops.delete(bm,geom=[bm.faces[i] for i in np.nonzero(delp)[0]],context='FACES')
bm.to_mesh(me); bm.free()
print('polys after',len(me.polygons))
me.calc_loop_triangles(); print('tris total',len(me.loop_triangles))
bpy.context.view_layer.objects.active=o; o.select_set(True)
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.separate(type='MATERIAL'); bpy.ops.object.mode_set(mode='OBJECT')
parts=[x for x in sc.objects if x.type=='MESH']
for x in parts:
    x.data.calc_loop_triangles(); t=len(x.data.loop_triangles); mn=x.data.materials[0].name if x.data.materials else ''
    leaf='leaves' in mn.lower() or 'leaf' in mn.lower()
    tgt=cfg['leaf_tris'] if leaf else cfg['tris']
    print('part',mn,t,'leaf' if leaf else 'wood')
    if t>tgt and not leaf:
        md=x.modifiers.new('d','DECIMATE'); md.ratio=tgt/t; bpy.context.view_layer.objects.active=x; bpy.ops.object.modifier_apply(modifier='d')
    x.data.calc_loop_triangles(); print(' ->',len(x.data.loop_triangles))
for img in bpy.data.images:
    if img.source=='FILE' and img.size[0]:
        w,h=img.size; s=min(1,cfg['tex']/max(w,h))
        if s<1: img.scale(int(w*s),int(h*s))
bpy.ops.export_scene.gltf(filepath=cfg['out'],export_format='GLB',export_image_format='WEBP',export_image_quality=82,export_apply=True,export_yup=True,export_animations=False)
print('OK')
