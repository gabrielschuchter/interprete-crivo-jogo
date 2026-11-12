#!/usr/bin/env python3
"""Degrada uma textura para o regime PS2: tamanho pequeno, paleta indexada e dither.

Uso: python3 tools/ps2/degradar-textura.py entrada.webp saida.png [lado=128] [cores=32] [--sem-dither]

A paleta é calculada por quantização mediana (Pillow) a partir da própria imagem, o que imita
uma CLUT de 5 bits por canal sem exigir tabela fixa por região. O lado precisa ser potência de 2.
Pensado para pipeline offline (props Poly Haven 4K -> 128 ou 256), não para tempo de execução.
"""
import sys
from PIL import Image

def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) < 2:
        print(__doc__)
        return 1
    src, dst = args[0], args[1]
    lado = int(args[2]) if len(args) > 2 else 128
    cores = int(args[3]) if len(args) > 3 else 32
    if lado & (lado - 1):
        print("o lado precisa ser potência de 2")
        return 1
    dither = Image.Dither.FLOYDSTEINBERG if "--sem-dither" not in sys.argv else Image.Dither.NONE
    im = Image.open(src).convert("RGB").resize((lado, lado), Image.Resampling.BOX)
    q = im.quantize(colors=cores, method=Image.Quantize.MEDIANCUT, dither=dither)
    q.save(dst, optimize=True)
    print(f"{src} -> {dst}: {lado}x{lado}, {cores} cores")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
