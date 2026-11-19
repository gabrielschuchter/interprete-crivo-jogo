# Interprete · notas para agentes

O jogo é, desde 19/11/2026 e por decisão do Gabriel, uma cópia do modelo 2D Survivors Roguelike da Summer Engine (MIT): mesma mecânica, mesmos números, mesmo fluxo, com a identidade visual do Interprete e o menu principal minimalista de três botões (Novo jogo, Continuar jogo, Configurações). Ler `docs/game/SURVIVORS.md` antes de qualquer mudança: organização do código, testes e a lista de divergências em relação ao original. O jogo 3D anterior está inteiro na branch `legado-3d-v1`; boa parte de `docs/game/` descreve esse jogo e vale só como histórico.

Duas cópias, as duas mantidas. A web (`src/jogo/`, TypeScript estrito, Canvas 2D mais um passe WebGL PS2) é a que vai para produção: a main publica sozinha na Vercel. A Godot (`godot/`, Godot 4.7) é o próprio projeto do modelo com a pele trocada, e também vive em `Documents\interprete-jogo` no computador do Gabriel. Fidelidade ao original vem primeiro: um número só muda com o pedido do Gabriel, e toda divergência entra em `docs/game/SURVIVORS.md`. Os valores ficam em `src/jogo/config.ts`, cada bloco anotado com o arquivo GDScript de origem.

Identidade visual: `docs/DESIGN_SYSTEM.md` (tokens `--ds-*`, `design/sistema/interprete-ds.css`), direção PS2 dark academia de `docs/game/DIRECAO_DE_ARTE_PS2.md` (paleta preto, vinho, ardósia, musgo, osso, ouro gasto; cantos retos; Cinzel, Source Serif 4, IM Fell English, IBM Plex Mono). Nada de cor vibrante, cartoon ou interface de celular. Sprites recoloridos por `tools/survivors/preparar-assets.py` (web) e `tools/survivors/preparar-godot.py` (Godot); textos e ícones da Godot por `tools/survivors/gerar-godot-textos.mjs`.

Comandos: `npm run dev`, `npm run build`, `npm run test`, `npm run e2e` (com `npm run preview` no ar; `TOQUE=1` repete num celular emulado). Uma mudança de jogabilidade só está pronta quando `npm run e2e` passa no computador e com `TOQUE=1`.

Regras que não mudam sem autorização explícita do Gabriel: não tocar banco de produção, Clerk, RLS, domínio canônico, migrations nem os apps Estudar e Comunidade; não usar pessoa real como NPC; todo asset novo entra em `docs/game/REGISTRO_DE_ASSETS.md` com origem e licença; nenhum conteúdo clínico real, e todo caso é fictício e marcado como simulação; PBE não vira quiz nem pirâmide rígida de evidências.

Texto de jogo em português do Brasil, sem emoji, sem "jornada" e afins.

Skills: `.claude/skills/` traz skills de gamedev (origem e licença em `.claude/skills/CREDITOS.md`). Antes de mexer em câmera, entrada, interface, áudio, combate, level design, Godot ou desempenho, carregue a skill correspondente. As regras acima prevalecem sobre qualquer skill.
