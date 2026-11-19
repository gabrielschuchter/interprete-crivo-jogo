"""
Prepara as imagens do modelo 2D Survivors Roguelike (Summer Engine, MIT) para o Interprete.

Uso: python3 -I tools/survivors/preparar-assets.py <pasta do repo de referência> <pasta do repo do jogo>

Para cada quadro: recorta pelo alfa, reduz para o tamanho em que o jogo desenha (escala do Godot
vezes a qualidade Q), aplica a gradação de cor da paleta do Interprete e grava WebP em public/sv/.
O manifesto src/jogo/sprites.json guarda, em pixels da imagem original, o tamanho do recorte e o
deslocamento do centro do recorte em relação ao centro da imagem (o Sprite2D do Godot é centrado),
para que o jogo desenhe cada quadro exatamente onde o original desenharia.
"""
import json, os, sys
from PIL import Image, ImageEnhance

REF, JOGO = sys.argv[1], sys.argv[2]
A = os.path.join(REF, 'assets')
OUT = os.path.join(JOGO, 'public', 'sv')
os.makedirs(OUT, exist_ok=True)
Q = 1.5  # folga de resolução sobre a escala de jogo (a imagem PS2 é ampliada com filtro suave)

def hexrgb(h):
    h = h.lstrip('#'); return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

RAMPAS = {
    'ardosia': ['#0d1117', '#171d27', '#252d3a', '#3a4556', '#5b6779', '#8993a3'],
    'musgo': ['#0c130d', '#16241a', '#25382a', '#3b5236', '#5d7650', '#7d8f68'],
    'ouro': ['#1b0f1a', '#3a2e15', '#6a5528', '#8f7438', '#bd9a61', '#d9bd82', '#f0e5d3'],
    'xp': ['#0b0709', '#16241a', '#25382a', '#3b6b5c', '#5fb39a', '#a9dcc9', '#f0e5d3'],
}

def mapa_gradiente(im, rampa):
    cores = [hexrgb(c) for c in RAMPAS[rampa]]
    n = len(cores) - 1
    lut = []
    for ch in range(3):
        for v in range(256):
            t = v / 255 * n; i = min(int(t), n - 1); f = t - i
            lut.append(round(cores[i][ch] * (1 - f) + cores[i + 1][ch] * f))
    a = im.getchannel('A')
    g = im.convert('L').convert('RGB').point(lut)
    g.putalpha(a)
    return g

def gradar(im, modo):
    """Gradação: saturação 0,72, contraste levemente maior, pretos puxados para o breu."""
    if modo in RAMPAS:
        return mapa_gradiente(im, modo)
    a = im.getchannel('A') if im.mode == 'RGBA' else None
    rgb = im.convert('RGB')
    rgb = ImageEnhance.Color(rgb).enhance(0.72 if modo == 'ator' else 0.6)
    rgb = ImageEnhance.Contrast(rgb).enhance(1.08)
    r, g, b = rgb.split()
    # leve viragem para a paleta: sombras frias e arroxeadas (breu), luzes de osso
    r = r.point(lambda v: round(11 + v * (240 - 11) / 255))
    g = g.point(lambda v: round(7 + v * (229 - 7) / 255))
    b = b.point(lambda v: round(9 + v * (211 - 9) / 255))
    out = Image.merge('RGB', (r, g, b))
    if a is not None:
        out.putalpha(a)
    return out

manifesto = {}

def preparar(nome, arquivo, escala, modo='ator', bbox=None):
    im = Image.open(os.path.join(A, arquivo)).convert('RGBA')
    W, H = im.size
    caixa = bbox or im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox() or (0, 0, W, H)
    rec = im.crop(caixa)
    w, h = rec.size
    alvo = (max(2, round(w * escala * Q)), max(2, round(h * escala * Q)))
    rec = rec.resize(alvo, Image.LANCZOS)
    rec = gradar(rec, modo)
    rec.save(os.path.join(OUT, nome + '.webp'), 'WEBP', quality=86, method=6)
    manifesto[nome] = {
        'w': w, 'h': h, 'W': W, 'H': H,
        'ox': (caixa[0] + caixa[2]) / 2 - W / 2,
        'oy': (caixa[1] + caixa[3]) / 2 - H / 2,
    }

def uniao(arquivos):
    caixas = []
    for f in arquivos:
        im = Image.open(os.path.join(A, f)).convert('RGBA')
        caixas.append(im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox())
    return (min(c[0] for c in caixas), min(c[1] for c in caixas), max(c[2] for c in caixas), max(c[3] for c in caixas))

# Mago (player_frames.tres): idle = player.png; walk_down = player_walk_*; walk_up; walk_right
mago = ['player.png'] + [f'player_walk_{i}.png' for i in range(4)] + [f'player_up_{i}.png' for i in range(4)] + [f'player_right_{i}.png' for i in range(4)]
cx = uniao(mago)
preparar('mago_idle', 'player.png', 0.18, bbox=cx)
for i in range(4):
    preparar(f'mago_down_{i}', f'player_walk_{i}.png', 0.18, bbox=cx)
    preparar(f'mago_up_{i}', f'player_up_{i}.png', 0.18, bbox=cx)
    preparar(f'mago_right_{i}', f'player_right_{i}.png', 0.18, bbox=cx)
# Cavaleiro (knight_frames.tres): idle = knight_down_0
cav = [f'knight_{d}_{i}.png' for d in ('down', 'up', 'right') for i in range(4)]
cx = uniao(cav)
for d in ('down', 'up', 'right'):
    for i in range(4):
        preparar(f'cav_{d}_{i}', f'knight_{d}_{i}.png', 0.21, bbox=cx)
# Inimigos
cx = uniao([f'enemy_{i}.png' for i in range(4)])
for i in range(4):
    preparar(f'morcego_{i}', f'enemy_{i}.png', 0.08, bbox=cx)
cx = uniao([f'scorpion_{i}.png' for i in range(2)])
for i in range(2):
    preparar(f'escorpiao_{i}', f'scorpion_{i}.png', 0.05, bbox=cx)
cx = uniao([f'giant_{i}.png' for i in range(4)])
for i in range(4):
    preparar(f'gigante_{i}', f'giant_{i}.png', 0.2, bbox=cx)
for p in ('idle', 'attack', 'cast', 'jump'):
    preparar(f'chefe_{p}', f'boss_{p}.png', 0.3)
# Armas e coletáveis
preparar('flecha', 'arrow.png', 0.04)
preparar('orbe', 'projectile.png', 0.06)
preparar('serra', 'sawblade.png', 0.036, 'ouro')
preparar('xp', 'xp.png', 0.07, 'xp')
# Cenário: pedras e tufos sorteados entre 0,14 e 0,30
for i in range(4):
    preparar(f'pedra_{i}', f'props/boulder_{i}.png', 0.30, 'ardosia')
    preparar(f'tufo_{i}', f'props/tuft_{i}.png', 0.26, 'musgo')
# Retratos da seleção e fundo da derrota
for n, f in (('retrato_mago', 'mage_portrait.png'), ('retrato_cav', 'knight_portrait.png')):
    im = Image.open(os.path.join(A, f)).convert('RGBA')
    im.thumbnail((360, 480), Image.LANCZOS)
    gradar(im, 'ator').save(os.path.join(OUT, n + '.webp'), 'WEBP', quality=86, method=6)
im = Image.open(os.path.join(A, 'death_splash.png')).convert('RGBA')
mx, my = round(im.width * 0.035), round(im.height * 0.06)
im = im.crop((mx, my, im.width - mx, im.height - my))  # tira a moldura de pergaminho do original
im.thumbnail((960, 540), Image.LANCZOS)
gradar(im, 'cena').convert('RGB').save(os.path.join(OUT, 'derrota.webp'), 'WEBP', quality=80, method=6)

json.dump({'q': Q, 'quadros': manifesto}, open(os.path.join(JOGO, 'src', 'jogo', 'sprites.json'), 'w'), indent=1)
print(len(manifesto), 'quadros')
