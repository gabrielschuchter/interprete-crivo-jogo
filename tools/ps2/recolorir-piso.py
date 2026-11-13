#!/usr/bin/env python3
"""Gera as texturas de piso e parede da direção PS2 nas rampas dos tokens.

Uso: python3 -I tools/ps2/recolorir-piso.py [saida=public/textures/ps2] [lado=128]

Lê design/ps2/ps2.tokens.json (rampas) e as texturas CC0 do Poly Haven já presentes em
public/textures. Cada textura vira luminância normalizada, é remapeada pela rampa escolhida e
quantizada com dither de Floyd-Steinberg numa paleta indexada de 24 cores. A madeira é
autoral: tábuas com veio, geradas por código. Saída em PNG indexado (WebP com perda
destruiria a paleta). Todas as texturas são ladrilháveis porque a redução usa média de caixa.
"""
import json
import os
import sys
import numpy as np
from PIL import Image, ImageOps

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
TOK = json.load(open(os.path.join(RAIZ, "design/ps2/ps2.tokens.json"), encoding="utf-8"))
TEX = os.path.join(RAIZ, "public/textures")


def rampa(nome):
    cores = [tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for h in TOK["rampas"][nome]]
    return np.array(cores, dtype=np.float32)


def aplicar(lum, nome):
    """lum em 0..1 -> imagem RGB pela rampa, com interpolação linear entre degraus."""
    r = rampa(nome)
    pos = np.clip(lum, 0, 1) * (len(r) - 1)
    i = np.minimum(pos.astype(int), len(r) - 2)
    f = (pos - i)[..., None]
    return r[i] * (1 - f) + r[i + 1] * f


def salvar(rgb, destino, cores=24):
    im = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), "RGB")
    q = im.quantize(colors=cores, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG)
    q.save(destino, optimize=True)
    print(f"{os.path.relpath(destino, RAIZ)}: {im.width}x{im.height}, {cores} cores, {os.path.getsize(destino)} bytes")


def de_foto(arquivo, lado, ganho=1.0, piso=0.0, teto=1.0):
    im = Image.open(os.path.join(TEX, arquivo)).convert("L").resize((lado, lado), Image.Resampling.BOX)
    im = ImageOps.autocontrast(im, cutoff=2)
    lum = np.asarray(im, dtype=np.float32) / 255.0
    return piso + (teto - piso) * np.clip(lum * ganho, 0, 1)


def tabuas(lado, seed=7):
    """Piso de madeira: tábuas de 16 px com veio longo e emendas escuras. Autoral."""
    rng = np.random.default_rng(seed)
    y, x = np.mgrid[0:lado, 0:lado].astype(np.float32)
    larg = lado // 8
    idx = (x // larg).astype(int)
    tom = rng.uniform(0.35, 0.75, size=idx.max() + 1)[idx]
    desloc = rng.uniform(0, lado, size=idx.max() + 1)[idx]
    # veio: ruído esticado ao longo da tábua
    base = rng.random((lado // 2, lado // 16 + 1)).astype(np.float32)
    veio = np.asarray(Image.fromarray((base * 255).astype(np.uint8)).resize((lado, lado), Image.Resampling.BICUBIC), dtype=np.float32) / 255.0
    veio = np.roll(veio, 0, axis=0)
    ondas = 0.5 + 0.5 * np.sin((y + desloc) * 0.55 + veio * 6.0)
    lum = tom * 0.7 + ondas * 0.18 + veio * 0.12
    emenda = (x % larg < 1) | (((y + desloc.astype(int)) % lado) < 1)
    lum = np.where(emenda, 0.05, lum)
    return np.clip(lum, 0, 1)


def main():
    saida = sys.argv[1] if len(sys.argv) > 1 else os.path.join(RAIZ, "public/textures/ps2")
    lado = int(sys.argv[2]) if len(sys.argv) > 2 else 128
    os.makedirs(saida, exist_ok=True)
    pedidos = [
        ("piso_ardosia.png", aplicar(de_foto("cobblestone_embedded_asphalt_diff.webp", lado, 1.0, 0.04, 0.78), "ardosia")),
        ("piso_musgo.png", aplicar(de_foto("coast_rocks_01_diff.webp", lado, 1.0, 0.04, 0.80), "musgo")),
        ("piso_estrada_ardosia.png", aplicar(de_foto("road_damaged_diff.webp", lado, 1.0, 0.04, 0.75), "ardosia")),
        ("parede_ardosia.png", aplicar(de_foto("fort_wall_diff.webp", lado, 1.0, 0.05, 0.80), "ardosia")),
        ("parede_musgo.png", aplicar(de_foto("fort_wall_diff.webp", lado, 1.0, 0.05, 0.78), "musgo")),
        ("piso_madeira.png", aplicar(tabuas(lado), "madeira")),
        ("terra_musgo.png", aplicar(de_foto("bark_debris_01_diff.webp", lado, 1.0, 0.04, 0.70), "musgo")),
    ]
    for nome, rgb in pedidos:
        salvar(rgb, os.path.join(saida, nome))


if __name__ == "__main__":
    main()
