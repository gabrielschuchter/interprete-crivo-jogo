import bpy, os, glob, sys
OUT='/tmp/claude-0/out/tex/'; os.makedirs(OUT,exist_ok=True)
def conv(path, out, size, fmt='PNG'):
    img=bpy.data.images.load(path); w,h=img.size
    if max(w,h)>size: img.scale(size, int(h*size/w))
    img.filepath_raw=out; img.file_format=fmt
    if fmt=='HDR': img.file_format='HDR'
    img.save(); bpy.data.images.remove(img)
# HDRI
src='/mnt/user-data/uploads/Assets jogo interprete/zavelstein_4k.exr'
img=bpy.data.images.load(src); img.scale(2048,1024)
img.filepath_raw=OUT+'zavelstein_2k.hdr'; img.file_format='HDR'; img.save()
sets={'asphalt_02':('/tmp/claude-0/ph/asphalt_02_4k/textures/',1024),'cobblestone_embedded_asphalt':('/tmp/claude-0/ph/cobblestone_embedded_asphalt_4k/textures/',1024),'road_damaged':('/tmp/claude-0/ph/road_damaged_4k/textures/',1024),
'coast_rocks_01':('/tmp/claude-0/ph/coast_rocks_01_4k/textures/',1024),'bark_debris_01':('/tmp/claude-0/ph/bark_debris_01_4k/textures/',1024)}
for k,(d,s) in sets.items():
    for f in glob.glob(d+'*'):
        b=os.path.basename(f)
        for kind in ['diff','nor_gl','rough','disp']:
            if f'_{kind}_' in b:
                conv(f, OUT+f'{k}_{kind}.png', s)
for kind in ['diff','nor_gl','rough']:
    for part in ['wall','plaster','trim']:
        conv(f'/tmp/claude-0/ph2/fort/textures/modular_fort_01_{part}_{kind}_4k.png', OUT+f'fort_{part}_{kind}.png', 1024)
print('OK')
