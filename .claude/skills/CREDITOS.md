# Créditos das skills de desenvolvimento de jogos

Estas skills orientam agentes de código que trabalham neste repositório. Não são assets do jogo e não entram em `docs/game/REGISTRO_DE_ASSETS.md`.

## Origem

- Repositório: https://github.com/gamedev-skills/awesome-gamedev-agent-skills
- Commit importado: `c6ca6c41c839b68319ffc08430b99ab768debc32` (12/11/2026)
- Autoria: Abhishek Barali e colaboradores do repositório
- Licença: Apache-2.0. O texto está em `LICENSE-awesome-gamedev-agent-skills` e o aviso original em `NOTICE-awesome-gamedev-agent-skills`
- Alterações: nenhuma nos arquivos de cada skill. Foi omitido apenas `create-game-assets/agents/openai.yaml`, que é metadado de outro agente

## Skills instaladas (16 de 79)

| Skill | Por que entrou |
|-------|----------------|
| `threejs-scene-setup` | Base do renderizador, câmera e laço de animação em Three.js |
| `threejs-gltf-loading` | Carregamento de glTF/GLB com Draco, Meshopt e KTX2, necessário para a troca dos modelos procedurais por assets de alta densidade |
| `threejs-materials-lighting` | Materiais físicos, luzes, sombras e ambiente HDR para a direção ultrarrealista |
| `create-game-assets` | Direção de arte, manifesto de assets e registro de proveniência. Os scripts em Python (Pillow) foram lidos: só inspecionam imagens e geram folha de contato |
| `shader-programming` | Efeitos em GLSL para o acabamento visual |
| `camera-systems` | Câmera de terceira pessoa |
| `input-systems` | Teclado, controle e toque, com remapeamento |
| `game-ui-ux` | HUD e menus, áreas seguras e acessibilidade |
| `game-feel` | Retorno de golpes, tremor de câmera e easing no combate |
| `game-ai` | Inimigos e NPCs, percepção e navegação |
| `dialogue-systems` | Diálogos ramificados, condições e variáveis |
| `rpg` | Atributos, dano, itens e missões |
| `level-design` | Ritmo, bloqueio por progressão e checagem de soft-lock nas regiões |
| `save-systems` | Slots, gravação segura e migração de versões |
| `audio-design` | Barramentos, mixagem e música adaptativa |
| `performance-optimization` | Orçamento de quadros, draw calls e memória, relevante para 10–17 fps em teste e para mobile |

## Não instaladas

Roteador e skills de Godot, Unity, Unreal, Bevy, Phaser, PixiJS, Roblox e demais motores, porque o jogo usa Three.js e o roteador depende de detectar esses motores. Também ficaram de fora `physics-tuning`, `procedural-gen`, os gêneros restantes, `game-docs` (já existe `docs/game/`), `prototype-fast` e as de publicação em Steam e itch.

## Como estas skills convivem com as regras do projeto

Algumas skills citam skills de outros motores (`godot-tilemap`, `pixijs-rendering`) que não estão aqui; ignore essas referências. Onde uma skill sugerir pixel art, estilo estilizado ou geometria simples, valem `CLAUDE.md`, `DESIGN.md` e a regra firme do Gabriel: low-poly é proibido, todo asset novo entra em `docs/game/REGISTRO_DE_ASSETS.md` com origem e licença, e nenhum conteúdo clínico real é usado.

## Atualização

Reimportar a partir do repositório de origem, comparar o diff e atualizar o commit acima. Rever qualquer script antes de copiar.
