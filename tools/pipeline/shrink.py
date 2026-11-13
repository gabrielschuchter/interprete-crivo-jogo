"""Reduz as texturas embutidas nos .glb de cenário e as texturas soltas para no máximo 512 px.

Direção de arte PS2 (docs/game/DIRECAO_DE_ARTE.md): texturas pequenas e levemente borradas. Também é o
maior ganho de carga: cada textura de 2048 px custa ~22 MB de GPU com mipmaps e decodificação na thread
principal. Uso: python3 tools/pipeline/shrink.py [lado_max]. Reescreve os arquivos no lugar; depois rode
bash tools/hash-assets.sh.
"""
import glob
import io
import json
import struct
import sys

from PIL import Image

MAX = int(sys.argv[1]) if len(sys.argv) > 1 else 512


def shrink_image(data: bytes, fmt: str) -> bytes | None:
    im = Image.open(io.BytesIO(data))
    if max(im.size) <= MAX:
        return None
    s = MAX / max(im.size)
    im = im.resize((max(1, round(im.size[0] * s)), max(1, round(im.size[1] * s))), Image.LANCZOS)
    out = io.BytesIO()
    if fmt == 'webp':
        im.save(out, 'WEBP', quality=88, method=6)
    elif fmt == 'png':
        im.save(out, 'PNG', optimize=True)
    else:
        im.convert('RGB').save(out, 'JPEG', quality=88)
    return out.getvalue()


def pad4(b: bytes, fill: bytes = b'\0') -> bytes:
    return b + fill * ((4 - len(b) % 4) % 4)


def shrink_glb(path: str) -> int:
    raw = open(path, 'rb').read()
    jl = struct.unpack('<I', raw[12:16])[0]
    doc = json.loads(raw[20:20 + jl])
    off = 20 + jl
    bl = struct.unpack('<I', raw[off:off + 4])[0]
    binb = raw[off + 8:off + 8 + bl]
    views = doc['bufferViews']
    # com EXT_meshopt_compression a view aponta para o buffer 1 (destino da descompressão, sem bytes) e a
    # extensão aponta para os bytes comprimidos no buffer 0: é a extensão que precisa ser realocada
    def src(v):
        m = v.get('extensions', {}).get('EXT_meshopt_compression')
        return m if m is not None else v
    chunks = []
    for v in views:
        r = src(v)
        chunks.append(binb[r.get('byteOffset', 0):r.get('byteOffset', 0) + r['byteLength']] if r['buffer'] == 0 else None)
    changed = 0
    for im in doc.get('images', []):
        if 'bufferView' not in im:
            continue
        fmt = (im.get('mimeType') or 'image/png').split('/')[1].replace('jpeg', 'jpg')
        new = shrink_image(chunks[im['bufferView']], fmt)
        if new is not None:
            chunks[im['bufferView']] = new
            changed += 1
    if not changed:
        return 0
    out = b''
    for v, c in zip(views, chunks):
        if c is None:
            continue
        r = src(v)
        r['byteOffset'] = len(out)
        r['byteLength'] = len(c)
        out = pad4(out + c)
    doc['buffers'][0]['byteLength'] = len(out)
    js = pad4(json.dumps(doc, separators=(',', ':')).encode(), b' ')
    body = struct.pack('<I', len(js)) + b'JSON' + js + struct.pack('<I', len(out)) + b'BIN\0' + out
    open(path, 'wb').write(b'glTF' + struct.pack('<II', 2, 12 + len(body)) + body)
    return changed


def shrink_file(path: str) -> int:
    fmt = path.rsplit('.', 1)[1].lower().replace('jpeg', 'jpg')
    new = shrink_image(open(path, 'rb').read(), fmt)
    if new is None:
        return 0
    open(path, 'wb').write(new)
    return 1


if __name__ == '__main__':
    n = 0
    for f in sorted(glob.glob('public/models/props/*.glb')):
        n += shrink_glb(f)
    for f in sorted(glob.glob('public/textures/**/*.*', recursive=True)):
        if f.rsplit('.', 1)[1].lower() in ('png', 'jpg', 'jpeg', 'webp'):
            n += shrink_file(f)
    print('texturas reduzidas:', n)
