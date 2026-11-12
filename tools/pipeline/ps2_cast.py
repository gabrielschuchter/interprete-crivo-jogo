# Gera o elenco na direção PS2 a partir dos GLB do pipeline MakeHuman (cast.py + anim.py).
# Uso: python3 ps2_cast.py <pasta_entrada_sem_meshopt> <pasta_saida> [personagem ...]
# Requer: bpy 5.3 num venv (BPY), BVH da CMU (CMU_MOCAP_DIR) e @gltf-transform/cli global.
import json, os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
BPY = os.environ.get('BPY', '/tmp/claude-0/bpyenv/bin/python')
CMU = os.environ.get('CMU_MOCAP_DIR', '/tmp/claude-0/cmu-mocap/data')

# clipes novos ou refeitos nesta passagem
CLIPS = [
    {"name": "jump", "bvh": "16_01", "pick": "peak", "sig": "hips_up", "pre": 0.5, "post": 0.6, "flatz": True},
    {"name": "attack2", "bvh": "02_09", "pick": "peak", "sig": "rhand_speed", "pre": 0.3, "post": 0.4, "from": 2},
    # queda para trás que termina deitada de costas, com o corpo apoiado no chão
    {"name": "die", "bvh": "90_12", "pick": "peak", "sig": "hips_down", "pre": 1.3, "post": 0.4, "drift": 0.15, "ground_dz": -0.12},
]

# penteado em casca sólida (cor em hex sRGB; sem cor, usa a mediana da textura original)
HAIR = {
    'player_curto': {'style': 'short', 'color': '3a2a20', 'nape': 0.07},
    'player_coque': {'style': 'bun', 'color': '3a2a20'},
    'player_longo': {'style': 'long', 'color': '2a1d16'},
    'player_capuz': {'style': 'none'},
    'heloisa': {'style': 'bun', 'color': 'a8a29a'},
    'iris': {'style': 'afro', 'color': '1a1210', 'fringe': 0.06},
    'anselmo': {'style': 'none'},
    'dalva': {'style': 'bun', 'color': '4a3a30'},
    'lia': {'style': 'long', 'color': '7a3a1e', 'length': 0.28},
    'noemia': {'style': 'braid', 'color': '2a2020', 'length': 0.3},
    'tome': {'style': 'short', 'color': '2a2420'},
    'vulto': {'style': 'none'},
}
# protagonista da criação de personagem: corpo masculino ou feminino x penteado.
# O penteado é gerado (casca sólida), então qualquer corpo aceita qualquer corte; o capuz feminino
# recebe o manto e o capuz enxertados do corpo masculino, ajustados à altura e à largura.
CAPUZ = {'from': 'player_capuz', 'take': ['monk_robe'], 'remove': ['suit', 'pants', 'skirt'], 'scale': (0.92, 0.94, 0.95)}
PLAYER = {
    'player_masc_curto': ('player_curto', {'style': 'short', 'color': '3a2a20', 'nape': 0.07}),
    'player_masc_coque': ('player_curto', {'style': 'bun', 'color': '3a2a20'}),
    'player_masc_longo': ('player_curto', {'style': 'long', 'color': '2a1d16', 'length': 0.2}),
    'player_masc_capuz': ('player_capuz', {'style': 'none'}),
    'player_fem_curto': ('player_coque', {'style': 'short', 'color': '2a1d16', 'nape': 0.05}),
    'player_fem_coque': ('player_coque', {'style': 'bun', 'color': '3a2a20'}),
    'player_fem_longo': ('player_longo', {'style': 'long', 'color': '2a1d16'}),
    'player_fem_capuz': ('player_coque', {'style': 'none'}),
}
for k_, (_, h_) in PLAYER.items(): HAIR[k_] = h_
for k_ in ('player_curto', 'player_coque', 'player_longo', 'player_capuz'): HAIR.pop(k_)
# o vulto é sombra: menos triângulos, textura menor
BUDGET = {'vulto': {'body': 1400, 'clothes': 2000}}


def run(k, src, dst):
    tmp = os.path.join(dst, f'{k}.raw.glb')
    base = PLAYER[k][0] if k in PLAYER else k
    cfg = dict(src=os.path.join(src, f'{base}.glb'), out=tmp, cmu=CMU, clips=CLIPS, hair=HAIR.get(k, {}), budget=BUDGET.get(k, {}), seed=sum(map(ord, k)))
    if k == 'vulto': cfg['marble'] = True
    if k == 'player_fem_capuz':
        cfg['graft'] = dict(CAPUZ, **{'from': os.path.join(src, CAPUZ['from'] + '.glb')})
    r = subprocess.run([BPY, os.path.join(HERE, 'ps2.py'), json.dumps(cfg)], capture_output=True, text=True)
    log = [l for l in r.stdout.splitlines() if l.split(' ')[0] in ('CABELO', 'TOTAL_TRIS', 'FALHOU', 'OK')]
    if r.returncode or not os.path.exists(tmp):
        return f'{k} FALHOU\n{r.stderr[-1500:]}'
    post = ['node', os.path.join(HERE, 'ps2_post.cjs'), tmp, os.path.join(dst, f'{k}.glb')]
    if not k.startswith('player_') and k != 'vulto': post.append('^(torch_.*|jump|attack2)$')
    p = subprocess.run(post, capture_output=True, text=True)
    os.remove(tmp)
    return f'{k} {log} {p.stdout.strip()} {p.stderr[-400:]}'


if __name__ == '__main__':
    src, dst = sys.argv[1], sys.argv[2]
    os.makedirs(dst, exist_ok=True)
    only = sys.argv[3:] or list(HAIR)
    with ThreadPoolExecutor(int(os.environ.get('JOBS', '4'))) as ex:
        for line in ex.map(lambda k: run(k, src, dst), only):
            print(line, flush=True)
