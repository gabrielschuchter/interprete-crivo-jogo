# Tons de pele dos protagonistas: mistura as peles assadas pela forja (mesma UV da proxy) numa escala de cinco tons.
# Uso: python3 tools/chars/peles.py <pasta_das_bases> <saida>   (bases: <corpo>_caucasiana.png, _asiatica.png, _africana.png)
# Saída: <saida>/<corpo>_<0..4>.webp e a cor média do rosto de cada tom (para as amostras da criação).
import sys, os, json
import numpy as np
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
# do mais claro ao mais escuro: caucasiana; dois tons médios (asiática misturada à africana, espaçados por luminância
# do rosto); africana; africana escurecida. Mistura em sRGB, que espaça os tons de forma mais próxima do olho.
def rosto(im):
    top = im[: im.shape[0] // 2].reshape(-1, 3)
    top = top[top.sum(1) > 0.25]
    return np.median(top, 0)
lum = lambda c: float(c @ np.array([0.2126, 0.7152, 0.0722]))
medias = {}
for corpo in ('fem', 'masc'):
    cau, asi, afr = [np.asarray(Image.open(os.path.join(src, f'{corpo}_{n}.png')).convert('RGB')).astype(np.float32) / 255 for n in ('caucasiana', 'asiatica', 'africana')]
    l0, l3 = lum(rosto(cau)), lum(rosto(afr))
    def mix(alvo):  # fração de africana que leva o rosto à luminância alvo (busca binária)
        lo, hi = 0.0, 1.0
        for _ in range(20):
            f = (lo + hi) / 2
            if lum(rosto(asi * (1 - f) + afr * f)) > alvo: lo = f
            else: hi = f
        return asi * (1 - f) + afr * f
    tons = [cau, mix(l0 + (l3 - l0) / 3), mix(l0 + 2 * (l3 - l0) / 3), afr, afr * 0.78]
    medias[corpo] = []
    for i, px in enumerate(tons):
        im = (np.clip(px, 0, 1) * 255).round().astype(np.uint8)
        Image.fromarray(im).save(os.path.join(out, f'{corpo}_{i}.webp'), quality=88, method=6)
        medias[corpo].append('%02x%02x%02x' % tuple((rosto(px) * 255).round().astype(int)))
print(json.dumps(medias))
