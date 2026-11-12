# Modelos glTF de alta resolução

`personagens/` traz os doze corpos humanos (protagonista em quatro cortes de cabelo, os sete NPCs e o vulto), listados em `manifest.json` por chave. `props/` traz os 42 adereços e peças de cenário usados por `RegionBuilder.place` (lista em `src/core/assets.ts`). Origem e licença de cada um em `docs/game/REGISTRO_DE_ASSETS.md`; o pipeline que os gerou está em `tools/pipeline/`.

Requisitos para um personagem novo: em pé olhando para +Z, escala livre (a altura é normalizada), materiais PBR, esqueleto com ossos `RightHand` e `Head`. Animações são escolhidas pelo nome do clipe: idle, walk, run, attack, heavy, dodge, hit, die, interact, cast, talk, sit, shrug, wave, point, listen. Faltando um clipe, o jogo usa o vizinho mais próximo ou idle. Sem arquivo, vale o corpo procedural.
