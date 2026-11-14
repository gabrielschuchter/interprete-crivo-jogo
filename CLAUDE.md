# Interprete RPG · notas para agentes

Direção de arte (Gabriel, 12/11/2026, substitui a regra anterior de ultrarrealismo): dark fantasy gótica de PS2 (2003 a 2006) com dark academia. Low-poly estilizado com proporção humana correta (personagens de 1,5 a 8 mil triângulos), texturas pequenas (até 512 px no cenário), granuladas e levemente borradas, resolução interna baixa ampliada com filtro suave, pontilhado de 16 bits, névoa, luz baixa com poucos pontos quentes e sombras fortes. Paleta: preto, vinho profundo, cinza frio ou azulado, verde-musgo, marrom escuro, bege envelhecido e dourado gasto. Nada de realismo AAA, escaneamento de pessoa real, cartoon, cor vibrante ou cara de celular. Personagens novos saem da forja em `tools/chars/` (receitas em `elenco.py`, lote em `lote.sh`; ver `docs/game/PIPELINE_DE_PERSONAGENS.md`); os sete NPCs da história ainda vêm de `tools/pipeline/ps2_cast.py`; detalhes em `docs/game/DIRECAO_DE_ARTE.md`.

Documento completo da direção (identidade "Luz de estudo", leis visuais, paleta, tipografia, interface, som, técnica de render): `docs/game/DIRECAO_DE_ARTE_PS2.md`; tokens em `design/ps2/ps2.tokens.json`; a imagem é uma só, a PS2 tardia (God of War e RE4 como teto), sem opção de aparência nem `?arte=`, e a qualidade é automática (`src/core/quality.ts`). Ajustes é mínimo por decisão do Gabriel: ler `docs/game/AJUSTES.md` antes de acrescentar qualquer opção.

Ler `DESIGN.md` antes de tocar em interface e `docs/game/DECISOES_TECNICAS.md` antes de tocar em arquitetura.

Dificuldade: quatro níveis (História, Fácil, Médio, Difícil), com números por classe de inimigo (comuns, mini-chefes, chefes), todos em `src/domain/difficulty.ts`, escolhidos na criação e em Configurações e gravados no registro (versão 4; ids antigos `padrao` e `rigor` viram `medio` e `dificil`). O Médio é o jogo difícil de antes e vem marcado; o Difícil endurece também os comuns. Ler `docs/game/DIFICULDADE.md` antes de mexer em vida e dano de criaturas, XP, moedas, preços, curas ou janelas de desvio; `npm run e2e:dificuldade` mede mortes por nível.

Comandos: `npm run dev`, `npm run build`, `npm run test`, `npm run e2e` (com o servidor de desenvolvimento no ar).

Regras que não mudam sem autorização explícita do Gabriel: não tocar banco de produção, Clerk, RLS, domínio canônico, migrations nem os apps Estudar e Comunidade; não usar pessoa real como NPC; todo asset novo entra em `docs/game/REGISTRO_DE_ASSETS.md` com origem e licença; nenhum conteúdo clínico real, e todo caso é fictício e marcado como simulação; PBE não vira quiz nem pirâmide rígida de evidências.

Convenções de código: x é leste, z é sul, figuras olham para +Z. O estado de jogo vive em `src/domain/state.ts` e só muda por funções puras de lá. Diálogos são funções assíncronas em `src/story.ts`. Texto de jogo em português do Brasil, sem emoji, sem "jornada" e afins.

Uma mudança de jogabilidade só está pronta quando `npm run e2e` passa.

Skills: `.claude/skills/` traz skills de gamedev (origem e licença em `.claude/skills/CREDITOS.md`). Antes de mexer em câmera, entrada, interface, áudio, diálogos, saves, combate, level design, Three.js (cena, glTF, materiais) ou desempenho, carregue a skill correspondente e siga o que ela ensina. As regras acima e o `DESIGN.md` prevalecem sobre qualquer skill.
