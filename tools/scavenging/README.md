# Testes do scavenging (13/11/2026)

Pacote isolado, fora do build do jogo. Relatório em `docs/game/SCAVENGING_2026-11-13.md`.

- `recast-teste.mjs`, `navcat-teste.mjs`: navmesh contra a perseguição atual dos inimigos.
- `inkjs-teste.mjs`, `quarks-teste.mjs`: smoke tests de inkjs e three.quarks com three 0.170.
- `jfxr-teste.cjs`, `inspecionar-glb.mjs`, `render/`: apontam para clones em `/tmp/scav` (JFXR, KayKit, Quaternius); ajuste os caminhos.

Instalar com `npm i --legacy-peer-deps` (os peers de three divergem entre as bibliotecas).
