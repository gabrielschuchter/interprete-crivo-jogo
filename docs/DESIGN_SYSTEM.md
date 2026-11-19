# Design system do Interprete RPG

Versão 1, 19/11/2026. Extraído da `main` depois do PR #41. Este documento descreve o que o jogo usa hoje, com os valores tirados do código, e marca como pendência o que falta ou o que diverge entre documento e código. Ele não cria regra estética nova: consolida `DESIGN.md`, `docs/game/DIRECAO_DE_ARTE_PS2.md`, `docs/game/ESPECIFICACAO_DE_TELAS_PS2.md`, `docs/game/CARGA_E_MENU.md`, `docs/game/AJUSTES.md` e o CSS que de fato roda (`src/ui/game.css`, `src/ui/ps2-ui.css`, `src/cine/cine.css`).

A referência visual navegável é `design-system.html` (no ar em `/design-system.html` do build), montada com o CSS do jogo e com as classes reais, de modo que a página não guarda valores próprios. A camada semântica de tokens para trabalho novo está em `design/sistema/interprete-ds.css`.

## 1. Como as fontes se ordenam

Quando dois arquivos discordam, vale esta ordem. Primeiro, o `CLAUDE.md` e as decisões do Gabriel registradas nele (direção PS2 de 12/11/2026, imagem única, Ajustes mínimos). Segundo, `design/ps2/ps2.tokens.json`, fonte das rampas, das regiões, da tipografia de jogo, do movimento e dos números de render; `design/ps2/tokens-ps2.css` é gerado dele por `tools/ps2/gerar-tokens.mjs` e não se edita à mão. Terceiro, `design/tokens.json` e `design/tokens.css`, o design system da Escola Interprete, de onde vêm as cores de marca, Source Serif 4, IBM Plex Mono e a voz. Quarto, o CSS em execução, que é o que o jogador vê; quando ele contradiz um documento, este arquivo registra a divergência na seção 13 em vez de escolher calado.

O design system da escola é plano, claro e sem ornamento. O do jogo herda dele a marca e a voz e inverte o resto: é escuro, texturizado, emoldurado e de cantos retos. O que separa os dois está na seção 13 de `DIRECAO_DE_ARTE_PS2.md`; o que os liga são três marcas de procedência descritas na seção 2.

## 2. O que é próprio do Interprete

Um design system genérico de RPG sombrio caberia em qualquer jogo. Estes elementos só fazem sentido aqui, e são eles que um trabalho novo deve preservar antes de qualquer outro.

**Luz de estudo.** A identidade visual tem um nome e uma tese: o mundo é lido pela luz. Só o que está iluminado pode ser examinado, a névoa é o que ainda não foi interpretado, e a interface repete a mesma lógica (o que tem foco ganha brasa; o resto fica em breu). É a tradução visual da Prática Baseada em Evidências: evidência é luz pontual e quente, incerteza é névoa fria, e a névoa recua por ação do jogador.

**O Crivo.** O mascote é uma figura em "I" (base larga, haste, cabeça larga de topo claro), pelagem vinho em cascas (`SHELLS = 8`, `FUR_LEN = 0.045`, tom derivado de dark-amaranth), um olho branco alongado (`#ece4de`) com pupila em carmesim clássico emissivo e topo `#8c7b79` sem pelo (`src/entities/crivo.ts`). Os dois cosméticos preservam a silhueta: laço dourado (`#bd9a61`) e capa esmeralda (`#183d35`). Humores existentes: neutro, curioso, alegre, desconfiado, assustado, cansado e descanso. O Crivo não fala: ele aponta com o olhar, e é por isso que a pupila é o único carmesim permanente da cena. Na interface, ele aparece como glifo (disco perfurado de sete furos), como dono da tecla de dica e como o pulso que interrompe a recitação do chefe. O Crivo nunca vira ícone fofo, emoji ou balão de fala.

**Brasão e ponto do nome.** Escudo de topo reto com o disco perfurado e um quadrado de brasa no canto (`brasao` em `src/ui/ps2-glyphs.ts`). O ponto final de "Interprete." é brasa: `--brasa-4` com `text-shadow: 0 0 6px var(--brasa-3)` no logotipo, e a brasa do brasão pisca em dois estados na carga e no menu (`@keyframes brasa`, `steps(2, end)`, 1,2 s). Essa é a primeira marca de procedência. A segunda é o vinho preservado em tecido e selo (vinho-2 é o crimson-violet da marca, vinho-3 o amaranth-dark, vinho-4 o dark-amaranth). A terceira é a voz.

**Vocabulário epistêmico.** Os glifos dizem algo sobre o método (evidência, incerteza, comparação, pergunta, custo), não sobre magia. Escolher um símbolo alquímico ou ocultista genérico é quebrar o sistema.

**PBE como linguagem, não como quiz.** Nenhum componente apresenta pergunta com resposta certa marcada em verde, pontuação de acerto ou pirâmide de evidência. Resultado se marca com texto, peso e o comportamento do Crivo. O dossiê de caso traz o selo "simulação"; todo caso é fictício.

## 3. Princípios

A interface é um objeto do mundo, não uma camada de aplicativo: cada painel é feito de pedra, bronze ou papel. Cantos retos, sempre; a regra `html[data-arte] * { border-radius: 0 !important; backdrop-filter: none !important; }` em `ps2-ui.css` impõe isso a tudo, inclusive ao que o CSS antigo declara redondo. Painéis são sólidos sobre a cena, com grão em baixa opacidade, e nunca translúcidos com desfoque. Seleção se mostra por inversão (fundo ouro, texto breu) ou por marcador de brasa, e nunca por animação suave. A interface anda em degraus (`steps()`) ou corta. Densidade baixa: no máximo sete itens por lista, quatro peças no HUD, um botão primário por tela. Estado nunca só por cor.

As sete leis visuais de `DIRECAO_DE_ARTE_PS2.md` valem para cena e arte: uma matiz fria por região e uma luz quente por foco; no máximo quatro pontos quentes por quadro; só o iluminado é interagível; a névoa é incerteza; um acento metálico por quadro; a escala se mede em figura humana; o vinho é tecido e selo, não luz.

## 4. Cor

### Rampas (fonte: `ps2.tokens.json`)

Cada material escolhe uma rampa e vive nela. Os nomes CSS são `--<rampa>-<n>`, contados do escuro para o claro.

| Rampa | Valores | Papel |
| --- | --- | --- |
| breu | #0b0709 #120910 #1b0f1a #2a1426 #3d2338 | fundo de interface, sombra |
| vinho | #1d0316 #410230 #6e0f29 #8c1535 #b23a52 | tecido, selo, estandarte, botão primário, seleção |
| ardosia | #0d1117 #171d27 #252d3a #3a4556 #5b6779 #8993a3 | pedra, céu, névoa fria, botões do menu |
| musgo | #0c130d #16241a #25382a #3b5236 #5d7650 | Bosque, vegetação |
| madeira | #0f0a07 #1e140d #33221a #4d3424 #6f4d33 | estantes, portas, Arquivo |
| osso | #2b241c #5a4b3a #8f7c5e #c2ad86 #e3d5b3 #f0e5d3 | papel, texto, pergaminho |
| ouro | #3a2e15 #6a5528 #8f7438 #bd9a61 #d9bd82 | metal, filetes, molduras, rótulos |
| brasa | #5a2a12 #a85a1c #e5a85f #ffc27a | fogo, janela, lanterna, marcador de foco |
| espectro | #241c3d #3b2f63 #5b4a8a #8c7bb8 | inimigos e anomalias, e só eles |

Cores de marca usadas fora das rampas: classic-crimson `#D62839` (dano, perigo, barra de chefe, alvo no mapa, pupila do Crivo), `#b31f2f` (degrau escuro da barra de chefe), pink-essence `#F1EBE8` (corpo de texto, `--g-text`), crimson-violet `#410230` (tinta do mapa).

### Assinatura das regiões (fonte: `ps2.tokens.json`, `regioes`)

| Região | Bruma | Luz fria | Luz quente | Rampa |
| --- | --- | --- | --- | --- |
| Átrio (Pátio) | #222b3c | #7f95c0 | #e5a85f | ardosia |
| Bosque | #142a26 | #5d9483 | #d9bd82 | musgo |
| Arquivo | #0e0a08 | #6f86c0 | #ffc27a | madeira |
| Observatório | #131a2c | #6478b0 | #e5a85f | ardosia |
| Veredito | #1d0316 | #8c7bb8 | #b23a52 | vinho |

A proporção de cor por tela reinterpreta o 60/20/12/8 da marca: cerca de 60% de breu e ardósia, 20% de vinho e madeira, 12% de osso e ouro, 8% de brasa.

### Camada semântica

O jogo usa hoje as variáveis `--g-*` de `game.css`, redefinidas sob `html[data-arte]` em `ps2-ui.css`. Os valores efetivos são estes, e são os que `design/sistema/interprete-ds.css` expõe com nomes `--ds-*` para trabalho novo.

| Papel | Variável do jogo | Valor efetivo | Alias novo |
| --- | --- | --- | --- |
| Fundo de painel | `--g-panel`, `--g-panel-solid` | #140a12 | `--ds-fundo-painel` |
| Fundo elevado (hover, aba) | `--g-raise` | #2a1426 (breu-4) | `--ds-fundo-elevado` |
| Casa de inventário | | breu-2 | `--ds-fundo-casa` |
| Casa vazia, calha | | breu-1 | `--ds-fundo-afundado` |
| Seleção | | vinho-1 | `--ds-fundo-selecao` |
| Carga, menu, barras de cena | | #000 | `--ds-fundo-palco` |
| Véu atrás de livro, pausa, dossiê | | rgba(11, 7, 9, 0.88) | `--ds-veu-livro` |
| Texto | `--g-text` | #F1EBE8 | `--ds-texto` |
| Texto forte, selecionado | | osso-6 #f0e5d3 | `--ds-texto-forte` |
| Texto secundário | `--g-dim` | #b9a6ae | `--ds-texto-secundario` |
| Texto apagado | `--g-mute` | #7d6a74 | `--ds-texto-apagado` |
| Rótulo | `--g-gold` | #bd9a61 | `--ds-texto-rotulo` |
| Fio | `--g-line` | #5a4a2c | (ouro-2 nos componentes PS2: `--ds-fio`) |
| Fio forte | `--g-line-strong` | #bd9a61 | `--ds-fio-ativo` |
| Papel | `--g-paper` | #f0e5d3 | `--ds-papel-mapa` |
| Tinta sobre papel | | #3b2a1c | `--ds-tinta-papel` |

Alto contraste (`body.hc`, `game.css`) troca o painel por `rgba(0,0,0,0.96)` e `#000`, o secundário por `#e6dade`, o apagado por `#b9a6ae` e o fio por `#bd9a61`; na cena, a legenda ganha fundo preto e texto `#f0e5d3`.

### Raridade

Na interface, a raridade é um filete de 2 px na base da casa (`box-shadow: inset 0 -2px 0`) e a cor do nome no detalhe, sempre ao lado do rótulo em texto: incomum `#6f8a5a`, rara `#5a7a9a`, épica `#8a5a8f`, lendária `#b8933f`; comum não leva filete. No mundo, o feixe e o halo do item no chão usam `RARITY_COLOR` de `src/domain/gear.ts`, mais saturado (ver divergência 4 na seção 13).

## 5. Tipografia

Cinco papéis, quatro famílias no jogo, todas com woff2 em `design/fonts/` e licença SIL OFL 1.1 registrada em `REGISTRO_DE_ASSETS.md`.

| Papel | Família e variável | Tamanho (token) | Regra |
| --- | --- | --- | --- |
| Logotipo | UnifrakturCook 700, `--ps2-font-logotipo` | 96 (`--ps2-size-logotipo`); 40 no menu, 30 em tela baixa | só "Interprete.", nunca abaixo de 28 px, nunca frase |
| Título | Cinzel 500 e 700, `--ps2-font-titulo` | 32 título, 22 subtítulo, 56 região | caixa alta ou versalete, rastreio 0,06em (região 0,12em), nunca abaixo de 14 px, nada longo |
| Texto | Source Serif 4, `--ps2-font-texto` | 17 corpo, entrelinha 1,5, medida 62ch | diálogo, descrição, códice, botões comuns |
| Manuscrito | IM Fell English normal e itálico, `--ps2-font-manuscrito` | 16 ou mais | dica, descrição de ofício, estado vazio, marginália, legenda "canto" da cena; nunca informação que exija ação |
| Dado | IBM Plex Mono, `--ps2-font-dado` | 12 rótulo, caixa alta, rastreio 0,18em | números, teclas, rótulos, distância, moedas |

Escala completa: 12, 14, 17, 22, 32, 56, 96 px, multiplicada por `--ui-scale` (o Tamanho do texto dos Ajustes, de 0,9 a 1,6). A HUD cresce mais devagar, por `--hud-scale = hudScaleFor(textScale)`, limitada a 0,9 e 1,3. Inter não entra no jogo; fica para a plataforma da escola. Os botões do menu usam Cinzel 700 de 17 px com rastreio 0,14em; os títulos de região, Cinzel 500 com sombra dura de 2 px.

## 6. Espaço, forma, profundidade, névoa e luz

Espaçamento em `--ps2-space-1` a `--ps2-space-7`: 4, 8, 12, 16, 24, 32, 48 px. Raio sempre 0 (`--ps2-radius`). Filete de 2 px (`--ps2-filete`).

Não há sombra difusa em lugar nenhum. Profundidade se faz com quatro recursos. A moldura dupla `--ps2-frame`: `0 0 0 2px breu-1, inset 0 0 0 1px ouro-3, inset 0 0 0 3px breu-1, inset 0 0 0 4px rgba(189,154,97,0.25)`. Tachas de ouro-4 de 8 px nos quatro cantos dos painéis grandes, desenhadas como gradientes de fundo sobre `var(--texture-grain)`. O chanfro de 1 px das casas: `inset 1px 1px 0 ouro-1, inset -1px -1px 0 breu-1`, invertido na casa vazia (`inset 1px 1px 0 breu-1, inset -1px -1px 0 breu-4`). E a sombra dura de título, `2px 2px 0 breu-1` (preto na cena).

As molduras 9-slice são SVG em `public/ui/ps2/` (geradas por `tools/ps2/gerar-molduras.mjs`), aplicadas com `border: 16px solid transparent` e `border-image ... 16 / 16px stretch`. Pedra é o mundo e cobre os cartões de pausa, confirmação, derrota, final, loja e registros (`#ui .card`). Bronze é equipamento e conversa e cobre o diálogo. Papel é registro e cobre a folha do dossiê, com preenchimento (`fill`). As classes `moldura-pedra`, `moldura-bronze` e `moldura-papel` estão disponíveis para telas novas.

Névoa e luz são da cena, não da interface, e seus números moram em `ps2.tokens.json`, `render.imagem`: resolução interna de 448, 512 ou 576 linhas conforme a qualidade automática, 64 níveis por canal com dither ordenado de 0,45, grade de vértices a um quarto de pixel, saturação 0,8, esmagamento de pretos 0,025, névoa linear de 0,05 a 2,1, névoa rasteira 0,38 até 1,8 m, brilho 0,55, anisotropia 4, anti-serrilhado por luma 0,6 e contraste 1,14 (`src/core/ps2.ts`). A pele de época das regiões troca os materiais do kit por texturas de até 512 px em `public/textures/ps2` (`src/world/ps2skin.ts`). Toda compilação de shader precisa da conta de luzes do jogo (seis lâmpadas fixas e duas do protagonista), via `Game.compileLit`.

## 7. Componentes

Cada linha descreve o estado que existe no CSS. Hover e foco são o mesmo estado; nenhum estado usa transição suave.

**Botão (`.btn`).** Normal: fundo transparente, fio interno de 1 px em ouro-2 e externo em breu-1, Source Serif. Foco e passagem: fundo ouro-4, texto breu-1, fio ouro-5 (inversão, 7,6:1); por teclado, também `outline: 2px solid osso-6` com deslocamento de 2 px. Pressionado: desloca 1 px para baixo e para a direita. Desabilitado: texto `--g-mute`, fio a 15%. Primário (`.btn.primary`, um por tela): vinho-3 com fio vinho-5; no foco, vinho-4 com texto osso-6. Perigo em carmesim clássico existe como regra de documento para ação irreversível, sem classe própria hoje.

**Botão do menu (`#menu .mb`).** 52 px de altura (44 em tela baixa), coluna de até 360 px ou 90vw, 12 px de intervalo. Fundo `var(--texture-grain), ardosia-1`, fio ouro-1, Cinzel 700 de 17 px em caixa alta, osso-5. Foco: fio ouro-3, texto ouro-5 e um losango de brasa-3 de 8 px de cada lado. Desabilitado: texto ardosia-5, fio ouro-1 a 40%, fora da ordem de foco, com o resumo apagado embaixo ("Nenhum registro neste navegador"). Enquanto a região prepara, a mesma linha de progresso da carga corre sob o rótulo.

**Chip (`.chip`) e amostra (`.swatch`).** Chip com fio ouro-2; pressionado, fundo vinho-1, fio ouro-4 e losango `◆` dourado antes do texto. Amostra de cor de 30 px (quadrada pela regra global), selecionada com contorno de 2 px em texto e deslocamento de 2 px, sempre com `aria-label` do tom.

**Campo de texto.** Fio ouro-2 e externo breu-1, Source Serif.

**Barras (`.meter`).** Calha breu-1 de 12 px com fio ouro-2. Vida em degraus de 6 px vinho-4 com junta vinho-3 de 2 px; vigor com 7 px de altura em ouro-4 e ouro-3; experiência em `#5fb39a`; perda recente (`b.lag`) em `--g-paper` a 55%. A largura anda em `steps(6, end)` em 0,18 s. Chefe: degraus em `#d62839` e `#b31f2f`, nome em Cinzel; a recitação tem barra própria em `--g-paper`.

**Foco de esgrima (`.foco i`).** Losangos de 7 px que enchem de baixo para cima em ouro; cheio, contorno ouro com brilho.

**Casa de inventário (`.cell`).** Grade de cinco colunas, fundo breu-2 com chanfro. Vazia: afundada em breu-1. Foco: contorno interno de 2 px em ouro-4. Selecionada (`aria-pressed="true"`): fundo vinho-1 e contorno de 2 px em brasa-3; o ícone sobe 3 px e assenta em `steps(4)` em 0,24 s. Quantidade em Plex Mono no canto inferior direito; peça em uso marcada pelo rótulo "EM USO" em Plex Mono de 9 px, não por cor. Raridade, como na seção 4.

**Atalho do HUD (`.slot`).** 62 px (o grande, 78 px), mesmo chanfro da casa, ícone com traço 2,2 e `crispEdges`, recarga como cortina breu a 88% subindo, nome em Plex Mono de 10 px embaixo.

**Abas (`.tabs`).** Cinzel com rastreio 0,06em; selecionada com barra de 4 px em brasa-3 embaixo e texto osso-6. **Navegação do livro (`#book nav`).** Cinzel; atual com barra de 4 px em brasa-3 à esquerda e fundo vinho-1.

**Nó de habilidade (`.node`).** Losango reto (sem rotação) à esquerda, fio ouro-2. Disponível (`.can`): contorno de 2 px em osso-5. Ativo (`.on`): contorno de 2 px em ouro-4 e losango cheio. Bloqueado: rótulo "em breve".

**Linha de missão e de códice (`.quest`).** Título em Cinzel, rótulo em Plex Mono com glifo (alvo para o caminho principal, pergunta para paralela). Selecionada: barra de 4 px em brasa-3 e fundo vinho-1. Concluída: título riscado em `--g-mute`.

**Linha de loja (`.shop-row`).** Ícone, nome e efeito, preço em Plex Mono dourado com o glifo de custo; selecionada como a missão; sem moedas ou já adquirida, desabilitada com o texto "adquirido".

**Aviso (`.toast`).** Painel com moldura dupla, sem animação de entrada, rótulo opcional em Plex Mono; some por opacidade em 0,5 s. Avisos passados ficam no Diário.

**Tecla (`.kbd`).** Plex Mono de 12 px com fio ouro-4, rastreio 0,18em.

**Marcador de objetivo (`#marker`).** Losango de 14 px cheio em brasa-3, distância em Plex Mono embaixo. **Mira travada (`#lock`).** Contorno de 32 px em `--g-paper`, declarado redondo e quadrado na prática pela regra global de cantos retos.

**Caixa de diálogo (`#dialogue`).** Até 880 px ou 92vw, a 5vh da base, moldura bronze 9-slice com grão e tachas. Nome em Cinzel 700; texto em Source Serif 17 px, medida 62ch, revelado por máquina de escrever a 62 caracteres por segundo, com o som "texto" a cada três caracteres. Escolhas como `.btn` empilhados com número em Plex Mono à esquerda e, quando a opção depende de uma habilidade, a etiqueta à direita ("◆ Escuta atenta"). "Continuar" pisca em dois estados (`steps(2)`, 1 s). Retrato opcional de 88 px (56 no celular) quando a figura tem canvas de retrato; botão de fechar "dx" no canto.

**Brasão e glifos.** Ver seção 9.

## 8. Padrões de tela

**Carga.** Fundo preto, brasão de 56 px, linha de 160 por 1 px que anda em degraus de 8 px em ouro-3 sobre ouro-1. Sem porcentagem nem dica; "Preparando" depois de 10 s; "Um arquivo não chegou" com Tentar de novo em caso de erro. Mínimo de 400 ms, contra o piscar.

**Menu principal.** Preto puro, sem cena (`body.palco-preto` esconde o canvas). Brasão grande no alto (28% da altura, de 140 a 240 px; 112 px no celular em pé; 84 px em tela baixa) que chega da carga crescendo em quatro degraus; "Interprete." em UnifrakturCook de 40 px; três botões (Novo jogo, Continuar jogo, Configurações); "Registros (n)" sublinhado abaixo; rodapé com versão e aviso de simulação. Esc não faz nada; setas, Tab, direcional e analógico percorrem; Enter, Espaço, A ou toque confirmam. O foco inicial vai para Continuar quando há registro, senão para Novo jogo. A descrição antiga (painel de pedra à esquerda com o Átrio vivo, "Pressione qualquer tecla") está superada.

**Criação.** Painel de pedra à esquerda com grão e tachas, figura à direita. Ofícios em chips, descrição do ofício em IM Fell itálico, nome em campo, pele, cabelo e casaco em amostras com nome acessível, corte em chips, dificuldade em chips (História, Fácil, Médio marcado, Difícil). Tons de pele: `SKINS` em `src/entities/figure.ts` (#d1a487, #a48066, #7b5a47, #523525, #402a1d), requisito de inclusão do Gabriel.

**HUD.** Quatro peças: vida, vigor, nível e foco no canto superior esquerdo; objetivo (título em Cinzel, passo em painel com moldura) no superior direito; atalhos no inferior direito; moedas no inferior esquerdo. Avisos acima das moedas, chefe no topo ao centro, dica contextual em IM Fell no rodapé central, marcador de objetivo no mundo. Nada mais.

**Diálogo.** Como na seção 7. A câmera de conversa é da camada de movimento (`docs/game/MOVIMENTO.md`).

**Livro.** Inventário, habilidades, mapa, diário, códice e configurações dividem a moldura de até 1180 por 720 px, navegação lateral de 208 px com o logotipo no topo e conteúdo em duas colunas (lista e detalhe). O detalhe tem ícone grande de 112 px em casa chanfrada, rótulo, título em Cinzel, descrição, efeito e, quando existe, a linha "Conceito" em Plex Mono que liga o item a uma ideia de método.

**Mapa.** Canvas em papel `#f0e5d3` com traço em crimson-violet, `image-rendering: pixelated`, glifos do vocabulário nos pontos de interesse (portais em `#8c1535`), alvo em carmesim clássico com o glifo de losango. O que não foi visitado fica em papel. A hachura em dither de um bit prevista no documento ainda não existe.

**Ajustes.** Mínimos por decisão do Gabriel (`docs/game/AJUSTES.md`): Brilho (gama de 70% a 150%, com amostra de três emblemas a 3%, 7% e 13%), Volume geral, Música, Efeitos e ambiente, Dificuldade, Sensibilidade, Inverter eixo vertical, Tamanho dos botões de toque (só em toque), Tamanho do texto e da interface, Alto contraste, Reduzir movimento, remapeamento, Restaurar padrões, Diagnóstico (só em falha) e Créditos. Linhas em grade de duas colunas (uma em tela estreita ou com texto grande), fio a 14% entre elas, controle deslizante com `accent-color: ouro-4`. Nenhuma opção de aparência, qualidade, campo de visão ou filtro.

**Pausa e registros.** Cartão de pedra centralizado sobre véu escuro, sem desfoque; o primeiro botão é o primário. A lista de registros mostra os três espaços com número em Cinzel ouro-4, nome e resumo, e ações à direita (abaixo no celular).

**Dossiê de caso.** Mesa escura com folha em moldura de papel, estatísticas em Plex Mono, selo de simulação. Acerto e erro sem semáforo.

**Derrota e final.** Cartão de pedra, rótulo ("A névoa fechou", "Fim do primeiro caminho"), título em Cinzel e um único botão primário. A derrota não pune nem humilha: "Nada do que você aprendeu ou recolheu foi perdido."

**Cena (src/cine).** Faixas pretas de 2,35:1 (mínimo de 56 px) que entram em `steps(4)` em 0,6 s. Legenda em Source Serif de 20 px (17 no celular em pé) em osso-4 com sombra preta de 1 px, nome de quem fala em Cinzel 500 de 12 px em ouro-3, e a variante "canto" em IM Fell itálico osso-3. Letreiro de lugar em Plex Mono de 12 px com rastreio 0,22em; título de capítulo em Cinzel a 70% do tamanho de região. Pretos em `steps(6)` em 1,2 s, clarão branco quente `#fff4dc` em `steps(8)`. Pausa com véu de 72%, botões de 52 px em breu-2 e o anel de segurar para pular em brasa-3. Escolha de fala sobe da barra de baixo, número em Plex Mono à esquerda.

**Celular.** Detectado por `pointer: coarse` ou `?touch`. Joystick flutuante à esquerda, olhar por arrasto à direita, botões ao alcance do polegar direito: Golpe (o maior, 1,32 vez o módulo, em `--action-primary` com fio brasa), Firme (segurar carrega), Esquiva, Pulo, Pulso (glifo do Crivo), Agir (acende em brasa quando há alvo, com o rótulo da ação), Item (ícone do caldo) e três pequenos (Trocar, Dica, Mira); Caderno e Pausa no alto à direita. Módulo `--tb = clamp(52px, 15vw, 76px) × touch-scale`. Rótulos em Plex Mono. Toda margem respeita `env(safe-area-inset-*)`; os atalhos do HUD somem no toque e vida e objetivo se encolhem nos cantos.

## 9. Iconografia e glifos

Há dois conjuntos, com papéis diferentes, ambos desenhados do zero e herdando `currentColor`. Lucide e qualquer pacote de ícones prontos estão fora.

Os glifos de método (`src/ui/ps2-glyphs.ts`) usam grade de 16 por 16, traço de 2 px, junções em esquadro, pontas quadradas e `shape-rendering: crispEdges`: crivo (disco de sete furos, o método), evidência (disco com ponto), descoberta (chave aberta), alvo (losango), incerteza (triângulo de vértice para baixo com ponto), comparação (dois círculos que se tocam), pergunta (espiral de ponto aberto), custo (balança de braços desiguais) e o brasão. Aparecem em rótulos a 12 ou 14 px em ouro-3, no mapa, nas missões, no códice, nos preços da loja, no menu e na carga.

Os ícones de objeto (`src/ui/icons.ts`) usam grade de 24 por 24 e traço de 1,4 px com pontas redondas (2,2 nos atalhos do HUD): caldo, selo, lupa, lanterna, botas, capa, pingente, ponteira, ficha, óleo, caixa, moedas, pulso, página, chave, espada, escudo e vazio. Representam coisas que o jogador carrega.

Glifo novo segue a grade e o traço do conjunto, diz algo sobre o método ou sobre o objeto, entra no tipo `Ps2Glyph` ou no dicionário de ícones e aparece em `design-system.html`. A forma do glifo nunca é o único portador de sentido: sempre vem com rótulo ou `aria-label`.

## 10. Movimento e som de interface

Tokens: rápido 100 ms, base 160 ms, lento 320 ms, curva `steps(4, end)`, véu em seis degraus (`#fade`, 0,48 s em `steps(6, end)`). O cursor do diálogo e a brasa do brasão piscam em dois estados. O brasão chega da carga em quatro degraus (0,4 s). As barras andam em seis degraus. A transição entre telas de interface é imediata.

Animação de jogo é permitida e registrada como exceção em `DESIGN.md`: antecipação de golpes inimigos, pausa de impacto (até 90 ms; 0,08 s em golpe comum, 15% mais longa em chefe, em `src/game.ts`), tremor curto de câmera, faixas de título de região e missão. Reduzir movimento (`body.rm`) zera toda animação e transição de interface, o tremor, a pausa de impacto, o grão animado, o piscar e o texto animado, e começa igual à preferência do sistema.

Sons de interface existentes, todos sintetizados em WebAudio em `src/core/audio.ts`: `ui` (seleção, tom de 660 Hz em 50 ms), `uiAbrir` (abrir livro ou loja, ruído filtrado de 180 ms), `uiNegar` (160 Hz quadrado), `texto` (tique da máquina de escrever, 420 a 480 Hz, a cada três caracteres, a meio volume), `missao`, `nivel`, `sino`, `pegar` e `moeda`. A música abaixa sob a fala. O documento de direção pede cinco famílias de material (clique de pedra, virada de página, arranhão de pena, lacre de cera, sino curto) e nenhum bipe sintético; o que existe hoje ainda são tons sintéticos, salvo o sino (pendência).

## 11. Voz e texto

Português do Brasil, frases curtas, jargão definido na primeira vez, certeza declarada de forma explícita ("a evidência sugere", "não permite concluir"), ironia só sobre ideias. Separador `·`. Sem emoji, sem "jornada", sem promessa (transforme, destrave, revolucione). Rótulos em caixa alta só em Plex Mono; títulos em Cinzel; o resto em caixa de frase. Mensagens de falha dizem o que aconteceu e o que fazer ("O navegador recusou a última gravação... Baixe uma cópia do registro"). Todo caso é fictício e marcado como simulação; nenhuma pessoa real vira NPC.

## 12. Acessibilidade

Pares medidos (WCAG, sobre os valores do código; a tabela completa e calculada ao vivo está em `design-system.html`): osso-6 sobre painel 15,6:1; pink-essence 16,4:1; osso-5 13,3:1; secundário 8,4:1; ouro-4 7,4:1; ouro-3 4,4:1 (só rótulo grande ou fio); apagado 3,9:1 (só desabilitado); carmesim clássico 3,9:1 (só peça grande); inversão breu-1 sobre ouro-4 7,6:1; marfim sobre vinho-3 9,6:1; osso-4 sobre preto 9,6:1; ouro-3 sobre preto 4,7:1; tinta sobre osso-5 9,4:1; desabilitado do menu 3,3:1. Texto que carrega informação fica em 4,5:1 ou mais.

O jogo tem Tamanho do texto (até 160%), Alto contraste, Reduzir movimento, Brilho com amostra de calibragem, remapeamento de teclado, mouse e controle (conflito troca as duas ações e avisa) e tamanho dos botões de toque. Toda tela foca um controle ao abrir (`data-focus` ou o primeiro botão habilitado) e é navegável por teclado e controle; o foco por teclado é visível sem depender de cor (inversão mais anel). Medidores levam `role="meter"` e rótulo; casas e amostras levam `aria-label` com nome, quantidade e estado. Estado nunca só por cor: raridade com texto, peça em uso com rótulo, missão concluída com risco e "concluída", seleção com barra e contorno.

## 13. Divergências e pendências

Estas são as diferenças encontradas entre documentos e código em 19/11/2026. Nenhuma foi corrigida neste trabalho, que só documenta.

1. A máquina de escrever do diálogo roda a 62 caracteres por segundo (`ui.ts`, `t.i += dt * 62`); `DIRECAO_DE_ARTE_PS2.md` e `ESPECIFICACAO_DE_TELAS_PS2.md` dizem 40.
2. As etiquetas de escolha "evidência" e "valor" citadas nos documentos não aparecem nas falas atuais; a etiqueta em uso é a de habilidade ("◆ Escuta atenta").
3. A barra de experiência usa `#5fb39a` (`--g-emerald`), fora das rampas; o documento prevê musgo-5 (`#5d7650`).
4. O feixe e o halo do item no chão usam `RARITY_COLOR` de `gear.ts` (`0x7fa86a`, `0x6a9ad0`, `0xa86ad0`, `0xe0b050`), mais saturados que as cores gastas da interface, e o azul e o violeta viram luz aditiva na cena, o que esbarra nas leis "vinho não é luz" e "espectro só para inimigos".
5. Restam curvas suaves em `game.css`: a entrada do livro (`livro`, 0,26 s) e a folha do detalhe (`folha`, 0,28 s) usam `--ease-standard`, a faixa de perda da vida usa `ease-out` em 0,7 s, o joystick de toque aparece em `linear` de 0,12 s e o brilho da casa selecionada em `linear` de 0,3 s. A regra do sistema é degrau ou corte.
6. Os controles de toque, as amostras de cor e a mira travada declaram círculos ou cantos de 6 px, mas a regra global de cantos retos os torna quadrados. Se o joystick redondo for desejado, ele precisa de exceção explícita; se o quadrado for o desejado, o CSS antigo deve sair.
7. Vários rótulos ficam abaixo do mínimo de 12 px do papel Dado: nome do atalho (10 px), "EM USO" (9 px), rótulo de nó e de missão (10 px), etiqueta de escolha (10 px), nota do botão da pausa de cena (10 px). O corpo de 17 px também fica abaixo dos 18 px a 1080p que a skill `game-ui-ux` recomenda para PC; o Tamanho do texto compensa, mas o padrão não.
8. A nota do botão da pausa de cena usa osso-2 sobre breu-2 (2,3:1), abaixo do mínimo para texto.
9. `AJUSTES.md` ainda lista a dificuldade como História, Padrão e Rigor (hoje são quatro níveis). `ESPECIFICACAO_DE_TELAS_PS2.md` ainda descreve o menu antigo (painel de pedra com o Átrio ao fundo, "Pressione qualquer tecla") e o diálogo em moldura de pedra; o código usa o menu preto de `CARGA_E_MENU.md` e o diálogo em bronze.
10. A paleta de mundo antiga (`WORLD` em `src/world/palette.ts`: esmeralda `#183D35`, esmeralda iluminada `#3F8C74`, meia-noite `#182C48`, névoa `#8FB5A6`, carvão `#16121C`) continua em uso em materiais e luz, ao lado das rampas. `DESIGN.md` diz que as rampas prevalecem onde houver conflito; a migração não foi feita.
11. Sem implementação ainda: hachura em dither de um bit no mapa e nas telas de morte, letras capitulares, famílias de som de material, botão de perigo em carmesim, retratos de busto pintados para todo o elenco, olho do Crivo no HUD quando ele tem algo a dizer.
12. O jogo ainda não consome `design/sistema/interprete-ds.css`; os nomes `--ds-*` são para trabalho novo, e migrar `game.css` e `ps2-ui.css` para eles é trabalho separado.
13. Nada disso foi verificado em GPU real nem em sessão humana; as capturas vêm do Chromium com render por software.

## 14. O que é proibido

Canto arredondado, desfoque de fundo, sombra difusa, gradiente decorativo, painel translúcido sobre a cena. Cor vibrante, neon, semáforo verde e vermelho, carmesim clássico em texto corrido, carmesim clássico e debian-red na mesma tela, espectro fora de inimigos e anomalias, vinho como cor de luz. Transição em curva suave na interface. Inter ou qualquer sans no jogo; fraktur fora do logotipo; Cinzel em parágrafo; IM Fell em informação que exige ação. Realismo AAA, escaneamento de pessoa real, cartoon, cara de celular. Ícones de pacote pronto, símbolo ocultista genérico, emoji. Opção de aparência, qualidade, filtro, campo de visão ou modo foto nos Ajustes. PBE como quiz, pirâmide rígida de evidências ou pontuação de acerto. Caso clínico real, pessoa real como NPC, "jornada" e promessa no texto. Asset sem origem e licença em `docs/game/REGISTRO_DE_ASSETS.md`.

## 15. Como usar este sistema em trabalho novo

Uma tela nova importa `design/tokens.css`, `design/ps2/tokens-ps2.css` e, para os nomes semânticos, `design/sistema/interprete-ds.css`, e parte das classes existentes (`.btn`, `.card`, `.cell`, `.meter`, `.tabs`, `.quest`, `.moldura-*`) antes de criar outras. Uma cor nova entra primeiro em `ps2.tokens.json`, numa rampa existente, e o CSS é regenerado. Um asset novo (textura, modelo, ilustração) escolhe uma rampa, respeita o teto de 512 px no cenário e de 1,5 a 8 mil triângulos por personagem e é registrado com origem e licença. Uma peça de material de apoio fora do jogo (página, apresentação, imagem de divulgação) pode usar o mesmo sistema; se for da plataforma da escola, volta para `DESIGN.md`. Qualquer decisão que mude uma regra deste documento entra aqui, com data e quem decidiu.
