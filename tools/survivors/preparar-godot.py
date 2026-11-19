"""
Recolore o projeto Godot do modelo (godot/) para a paleta do Interprete, em tamanho cheio.

Uso: python3 -I tools/survivors/preparar-godot.py <pasta do repo de referência> <pasta godot/ do jogo>

Lê sempre do repo de referência (o original não é tocado) e grava por cima dos PNG de godot/assets,
com as mesmas dimensões, para que as escalas das cenas continuem valendo. A gradação é a mesma de
preparar-assets.py (versão web). Os chãos são trocados pelas texturas PS2 do Interprete. Títulos e
ícones com texto em inglês são gerados à parte por gerar-godot-textos.mjs.
"""
import glob, os, sys, importlib.util
from PIL import Image, ImageEnhance

REF, GD = sys.argv[1], sys.argv[2]
A, OUT = os.path.join(REF, 'assets'), os.path.join(GD, 'assets')
JOGO = os.path.dirname(os.path.abspath(GD))

spec = importlib.util.spec_from_file_location('web', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'preparar-assets.py'))
# reaproveita só as funções de gradação, sem rodar o script web
src = open(spec.origin, encoding='utf-8').read().split('manifesto = {}')[0].replace('REF, JOGO = sys.argv[1], sys.argv[2]', 'REF = JOGO = "."').replace("os.makedirs(OUT, exist_ok=True)", '')
web = {}
exec(compile(src, spec.origin, 'exec'), web)
gradar = web['gradar']

def grava(rel, modo):
    im = Image.open(os.path.join(A, rel)).convert('RGBA')
    gradar(im, modo).save(os.path.join(OUT, rel), optimize=True)

atores = ['player.png', 'arrow.png', 'projectile.png', 'mage_portrait.png', 'knight_portrait.png']
atores += [os.path.basename(f) for p in ('player_*_?.png', 'knight_*_?.png', 'enemy_?.png', 'scorpion_?.png', 'giant_?.png', 'boss_*.png') for f in glob.glob(os.path.join(A, p))]
for f in sorted(set(atores)):
    if os.path.exists(os.path.join(OUT, f)):
        grava(f, 'ator')
for i in range(4):
    grava(f'props/boulder_{i}.png', 'ardosia')
    grava(f'props/tuft_{i}.png', 'musgo')
grava('sawblade.png', 'ouro')
grava('xp.png', 'xp')
for f in ('splash.png', 'death_splash.png', 'scroll.png', 'ui/button.png'):
    grava(f, 'cena')

# chãos: grama -> terra com musgo, rocha -> ardósia, areia -> estrada de ardósia; fora do muro, ardósia no breu
T = os.path.join(JOGO, 'public', 'textures', 'ps2')
def chao(origem, destino, escuro=1.0):
    tam = Image.open(os.path.join(A, destino)).size
    im = Image.open(os.path.join(T, origem)).convert('RGB').resize(tam, Image.LANCZOS)
    if escuro != 1.0:
        im = ImageEnhance.Brightness(im).enhance(escuro)
    im.save(os.path.join(OUT, destino), optimize=True)
chao('terra_musgo.png', 'ground_grass.png')
chao('piso_ardosia.png', 'ground_rock.png')
chao('piso_estrada_ardosia.png', 'ground_sand.png')
chao('piso_ardosia.png', 'sand_dark.png', 0.35)
print('godot recolorido')
