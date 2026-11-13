"""Monta uma tira de quadros (grade) a partir de imagens: tira.py destino.jpg colunas q1.jpg q2.jpg ..."""
import sys
from PIL import Image, ImageDraw

dest, cols, files = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
ims = [Image.open(f).convert('RGB') for f in files]
# quadros largos descem para 480 px: a tira serve para ler pose, não textura, e precisa caber no repositório
if ims[0].size[0] > 520:
    ims = [im.resize((480, round(im.size[1] * 480 / im.size[0])), Image.LANCZOS) for im in ims]
w, h = ims[0].size
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (w * min(cols, len(ims)), h * rows), (8, 6, 8))
d = ImageDraw.Draw(sheet)
for i, im in enumerate(ims):
    x, y = (i % cols) * w, (i // cols) * h
    sheet.paste(im, (x, y))
    d.text((x + 6, y + 4), str(i + 1), fill=(231, 216, 180))
sheet.save(dest, quality=74)
