# Modelos glTF de alta resolução

Coloque aqui arquivos .glb e liste cada um em manifest.json, por chave:

    { "player": "player.glb", "heloisa": "heloisa.glb", "iris": "iris.glb" }

Chaves: "player" e o id de cada NPC (heloisa, iris, anselmo, dalva, noemia, tome, etc., ver src/story.ts).
Requisitos: personagem em pé olhando para +Z, escala livre (a altura é normalizada), materiais PBR.
Animações são escolhidas pelo nome do clipe, sem diferenciar maiúsculas: idle, walk, run, attack, heavy,
dodge, hit, die, interact, cast, talk, sit. Faltando um clipe, o jogo usa walk ou idle.
Cada arquivo novo entra em docs/game/REGISTRO_DE_ASSETS.md com origem e licença.
