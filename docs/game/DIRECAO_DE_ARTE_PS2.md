# Direção de arte e design system: PS2 gótico, dark academia, Interprete

Versão 1.0, 12/11/2026. Documento de direção e especificação. Substitui a regra anterior de "low-poly proibido" e a seção de estética de `DECISOES_VISUAIS.md` onde houver conflito; `CLAUDE.md` e as regras de conteúdo do projeto continuam valendo. Os números de render e de interface têm uma única fonte, `design/ps2/ps2.tokens.json`, e o jogo usa uma imagem só, a PS2 tardia (ver `docs/game/AJUSTES.md`); as predefinições de estudo citadas abaixo saíram do jogo em 13/11/2026 e restam como registro e capturas. A versão navegável deste documento é a página `direcao-de-arte.html` (na produção, `/direcao-de-arte.html`), construída a partir dos mesmos tokens.

## 1. Decisão em um parágrafo

A identidade proposta chama-se **Luz de estudo**. O mundo é lido pela luz: só o que está iluminado pode ser examinado, a névoa é tudo o que ainda não foi interpretado, e a escuridão entre as duas é onde o jogo acontece. Isso decide a imagem (poucos pontos quentes sobre um fundo frio de uma cor só por região), decide a interface (painéis sólidos de pedra e papel, com informação sempre legível sobre fundo escuro) e decide o som (silêncio como material, reverberação como medida do espaço). A estética de superfície é a de um RPG sombrio de 2003 a 2006: resolução interna entre 360 e 448 linhas, texturas pequenas e borradas, névoa linear colorida, quantização de cor com dither, geometria com poucos polígonos e silhuetas de proporção humana correta. O vínculo com a Escola Interprete é conceitual e discreto: o ponto final do nome vira a brasa do jogo, o Crivo (peneira) vira o motivo da rosácea perfurada, o vinho da marca vira tecido e selo, e a voz da escola ("a evidência sugere", "não permite concluir") continua sendo a voz da interface.

## 2. Diagnóstico do estado atual

A versão em produção é uma cena de iluminação física moderna, com mapas PBR de 1024 px, bloom, vinheta, grão e sombras suaves, sob uma interface plana de painéis escuros em Inter e Source Serif. Os fundamentos são bons: a paleta já gira em torno de vinho, âmbar e carvão, o Átrio já tem arquitetura gótica com lanternas, e o controle de luz por região existe. O desencontro com o briefing é de regime de render e de gramática de interface, não de cor. A cena atual parece um jogo moderno de orçamento médio; a interface parece um painel de aplicativo com moldura dourada. Nenhum dos dois lembra um RPG de PS2.

Dois dados do código importam para o que segue. O motor já tem um passe de tonalização e um compositor, então o regime PS2 entra como mais um passe e como uma troca de névoa, sem reescrever a cena. E as texturas do lote 1 já foram convertidas para WebP de 1024 px com mapas de normal e de rugosidade, o que contraria a economia de VRAM que define a era; o caminho para os modelos existentes está na seção 11.

## 3. As onze referências, uma a uma

As imagens foram enviadas por Gabriel e não entram no repositório (regra de assets do projeto). A leitura abaixo separa o que cada uma ensina do que ela não pode ensinar. Um alerta de método que vale para o conjunto: as imagens não vêm todas do mesmo hardware. Algumas parecem capturas de jogos de PS2 ou de PC da mesma época, outras evocam a geração anterior, e duas (a viela vitoriana e a mulher de vestido preto) têm fidelidade acima da que um PS2 entregava. Não identifico a origem de nenhuma com segurança, e isso não é necessário. O uso correto é extrair gramática (luz, composição, relação entre figura e arquitetura), não fidelidade de textura.

**1. Catedral de pedra pálida sob lua.** Um render de aparência pré-calculada: pináculos em repetição, rosácea e portal ogival, lua cheia grande à esquerda, figura de capa e chapéu de costas no canto inferior esquerdo, piso de laje com espelhos d'água. A paleta é quase monocromática, branco azulado sobre preto. A lição é a monumentalidade por verticalidade e repetição: o olho conta pináculos, e a figura pequena fixa a escala. A luz é uma só, a da lua, e a pedra clara a devolve por si. Não copiar a pedra branca, que apaga o clima de decadência e cria um problema de legibilidade para a interface; extrair a composição (figura de costas, terço inferior, arquitetura ocupando três quartos do quadro) e o papel do céu como bloco negro que recorta a silhueta.

**2. Farol e dois homens de casaco.** Preto e branco granulado, vinheta forte, partículas em estrelas e riscos, feixe do farol como único gesto de luz, dois personagens de poucos polígonos com rosto sem detalhe. É a referência mais próxima do que o jogo precisa em acabamento: o grão e a vinheta fazem o trabalho que uma malha de qualidade faria, e a névoa baixa esconde onde a geometria acaba. A lição de composição é o contraste de escala entre figuras e torre, com uma luz que se move. A lição de método é que o rosto não precisa de detalhe quando a silhueta e o casaco carregam a identidade. Não adotar o monocromo: a nota do atlas ("não tornar tudo cinza") continua certa.

**3. Dois vultos numa rua nevada, com lanterna.** É ilustração conceitual, não captura de jogo. O valor está na composição: uma poça de luz quente em chão frio, as duas pessoas de costas caminhando para dentro da profundidade, um poste distante, casas de madeira, um carro antigo. Solidão e companhia ao mesmo tempo. A lição é a regra dos dois acentos, um ambiente frio e uma fonte quente que desenha o espaço em volta de quem a carrega, e é a imagem que mais se aproxima do vínculo entre o jogador e o Crivo. Em PS2 isso se faz com vertex color quente no chão ao redor da lanterna e uma luz pontual, não com iluminação global.

**4. Viela vitoriana de tijolo, cartazes e poça.** Um render de 2007 com assinatura de autor no canto, fidelidade alta e fora do regime PS2; serve como estudo de mundo, não de acabamento. Três ideias merecem ser levadas: o arco que enquadra uma profundidade iluminada ao fundo (portal de descoberta), a lanterna de parede que cria uma única poça quente, e sobretudo o texto no mundo. Cartazes colados, letreiros pintados na parede, anúncio de recompensa: o ambiente conta a história por escrita. Para o Interprete isso é uma mina, porque os cartazes do mundo podem fazer afirmações (uma cura garantida, uma recomendação sem fonte) que o jogador aprende a examinar, sem nenhum diálogo. Não reproduzir letreiros reais nem marcas; os textos do jogo são autorais e em português.

**5. Caverna de cogumelos azuis com vagonete.** Texturas de baixa resolução com ruído de alta frequência, chapéus de cogumelo em polígonos chapados, vertex color azul saturado, partículas aditivas, trilhos em fuga até um túnel preto. Parece geração anterior à do PS2 médio, mas a gramática é a certa: linhas de fuga para o vazio escuro dizem "algo desconhecido ali" melhor que qualquer texto. O ruído nas texturas é a granulação pedida. O problema é a saturação, que contraria o briefing (evitar cores vibrantes). A solução está na seção 5: cada região mantém uma matiz dominante, mas a 55 a 72 por cento da saturação da referência, e o brilho extremo fica nos pontos de luz.

**6. Rosto de pedra no céu azul.** Um corpo celeste com rosto grave e olhos que brilham, nuvens pintadas, muros de pedra de contorno escuro em primeiro plano, laje no piso. A lição é o símbolo único e estranho que domina o quadro. O céu aqui é textura, não simulação, e funciona. A conexão com o Interprete é direta e proponho como motivo recorrente do Observatório: uma lua de olho único que vigia, versão invertida do Crivo (o Crivo olha para examinar; a lua olha sem ser examinada). Aprovada por Gabriel em 13/11/2026 (com as quatro famílias tipográficas) e implementada no shader do céu, só no Observatório (`moonEye` em `src/world/envs.ts`): disco pálido com íris fria e pupila em fenda que acompanha o céu devagar, encoberto pelas nuvens. Captura: `docs/game/capturas/ps2/ps2-lua-observatorio.jpg`. O roteiro ainda não cita o olho; se ele virar fala ou pista, é decisão de história.

**7. Vultos encapuzados em roxo diante de arco com fogo.** Figuras de manto marmorizado sem rosto, só vazio negro com pontos de olho, tochas de parede como pontos quentes, contrafortes de pedra afunilados, céu de aurora roxa. Parece captura de jogo de PC da época, com mais resolução que um PS2, mas com poucos polígonos nos mantos. A lição é a figura sem rosto como inimigo legível (o Vulto e o Eco do jogo já pedem isso) e o roxo espectral como cor reservada. Proponho que o violeta seja exclusivo do que ainda não foi interpretado: inimigos, anomalias, o interior do Eco. Aparece em nenhum material de arquitetura.

**8. Rampa de paralelepípedo azul até um castelo, com tochas.** Textura de tijolo grande e borrada pela ampliação, cores divididas em ciano, verde e laranja por vertex color, tochas como sprites de chama marcando o ritmo da subida, figura encapuzada solitária, silhueta do castelo recortada contra nuvem azul. É a referência que mais ensina sobre desenho de percurso: uma curva em S conduzindo o olho, tochas a cada poucos passos como metrônomo, castelo como destino. A borra da textura ampliada é exatamente o "levemente borrado" do briefing, e vem de textura pequena com filtro linear, não de efeito de pós-processamento. Isso pesou na escolha do filtro linear como padrão (seção 12).

**9. Pináculos, balaustrada de latão e floresta em névoa.** A imagem mais próxima de "gótico de PS2": dither visível, compressão agressiva, desfoque de movimento, personagem de pele ruidosa de cabelo claro e espada, olhando uma floresta que some na bruma. A paleta é cinza esverdeado com latão. Duas lições. Primeira: o ponto de vista elevado sobre uma paisagem coberta de névoa é a imagem da contemplação solitária, e o jogo deve oferecer varandas assim em cada região. Segunda: o latão é o único metal quente em uma cena fria, e aqui nasce a regra de um acento metálico por quadro (seção 5).

**10. Cavaleiro de armadura verde sentado, espada fincada.** Pose de repouso, mãos sobre o pomo, elmo baixo, musgo em manchas de alta frequência nas texturas, névoa verde, ouro apenas no punho da espada. A lição de composição é a pausa como imagem: o personagem sentado diz melancolia sem uma palavra. Cabe como linguagem dos pontos de descanso do jogo. A lição de material é que o ruído de alta frequência da textura (aqui, manchas e brilhos pontuais) dá à pedra uma vida que um PBR liso não dá. Não adotar a espada branca de gume brilhante nem o verde saturado do fundo.

**11. Mulher de vestido preto em corredor, tom verde.** Retrato com olhos fechados, rosto voltado para baixo, vestido de textura escura marmorizada, arco de pedra e pilar atrás. Fidelidade de rosto acima da do PS2, com textura macia. A lição é de retrato de diálogo: um único tom de luz (verde-chave), expressão contida, fundo arquitetônico em desfoque. Serve como modelo para os retratos de busto dos personagens falantes. Não adotar orelhas, cicatrizes decorativas nem a ambiguidade do figurino; os personagens do jogo são fictícios e humanos, com a regra do projeto de nunca representar pessoa real.

### Leitura cruzada

Seis padrões se repetem e formam a gramática comum. A luz de fundo é de uma cor só por cena: azul, verde, roxo, cinza. Os acentos são quentes e pontuais: lanterna, tocha, janela, farol, latão, punho de espada. A arquitetura é vertical e repetida, com a figura humana pequena. As figuras estão de costas, sentadas ou com o rosto escondido ou baixo. A névoa esconde o fim do mundo. E há um ponto de fuga que termina no escuro. Dois conflitos precisam de decisão explícita. O primeiro é saturação: o briefing pede evitar cores vibrantes e quatro das referências são vibrantes, o que se resolve pela regra de dessaturar a matiz regional e concentrar o brilho. O segundo é fidelidade: duas referências estão acima do regime PS2, e adotá-las como alvo de acabamento levaria o jogo de volta ao "realismo AAA" que o briefing rejeita.

## 4. Três direções exploradas

Em vez de partir da primeira solução, foram desenhadas três direções com premissas diferentes e prototipadas como predefinições do passe de render (`?arte=a`, `b`, `c`). O protótipo altera resolução, quantização, saturação, névoa, filtro de textura e a interface; não refaz modelos, de modo que a comparação é de regime de imagem e de gramática de interface, não de arte final.

**Direção A, Necrópole fria.** Premissa: o mundo é um monumento abandonado e a imagem é quase monocromática, azul e cinza com muito pouco acento. Vem das referências 1, 2, 3 e 9. Resolução de 360 linhas, 20 níveis por canal, dither forte, ampliação sem suavização, textura sem filtro, névoa curta e densa. A interface é pedra e ferro, sem cor. Força: é a mais coesa e a mais barata de produzir, porque quase não pede variação de material. Risco: perde a marca. Sem vinho nem âmbar, o jogo deixa de parecer do Interprete, e a atmosfera de solidão vira monotonia em sessões de uma hora. Também é a direção em que a legibilidade de combate mais sofre, porque inimigo e cenário têm o mesmo valor.

**Direção B, Sala de vela.** Premissa: o jogo é um interior de estudo iluminado por chama, madeira escura, papel e vinho, e o exterior é só a janela. Vem das referências 3 e 4 e da paleta do briefing (vinho, bege envelhecido, marrom, dourado). Resolução de 448 linhas, 32 níveis, dither moderado, ampliação suave, textura linear, vinheta. A interface é papel e couro, com molduras de madeira. Força: é a que mais se aproxima do dark academia e do vínculo com a marca, e é a mais aconchegante, o que dá descanso entre trechos tensos. Risco: o quadro fica quente e marrom em toda parte, a "sépia genérica", e o exterior do Bosque e do Observatório perde identidade. Também compete mal com a promessa de "monumental", porque interiores são pequenos.

**Direção C, Vitral regional.** Premissa: cada região é uma cor, como um painel de vitral: azul, verde, roxo, vinho. Vem das referências 5 a 8, 10 e 11. Resolução de 360 linhas, saturação ampliada, bloom alto, ampliação sem suavização. A interface muda de matiz com a região. Força: é a mais memorável e a que melhor ajuda a orientação (o jogador sabe onde está pela cor), e é a que mais se parece com as imagens enviadas. Risco: é a direção que o próprio briefing pede para evitar (fantasia colorida, cores vibrantes), e uma interface que muda de cor com a região quebra a consistência do design system e custa tokens por região, e a identidade da marca fica diluída entre cinco paletas.

### Comparação crítica

| Critério | A Necrópole | B Sala de vela | C Vitral |
| --- | --- | --- | --- |
| Fidelidade ao briefing (melancolia, solidão, estranheza) | alta | média | média |
| Aderência à paleta pedida (vinho, bege, preto, cinza azulado, marrom, dourado) | baixa | alta | baixa |
| Legibilidade de jogo (inimigo, interagível, caminho) | baixa | média | alta |
| Continuidade com a Escola Interprete | baixa | alta | baixa |
| Diferenciação entre regiões | baixa | baixa | alta |
| Risco de parecer "filtro retrô" | médio | baixo | médio |
| Custo de produção de material | baixo | médio | alto |
| Risco de monotonia em sessão longa | alto | médio | baixo |

Nenhuma das três serve sozinha, e cada uma resolve exatamente o que a outra deixa aberto. A consolidação toma de A a estrutura de imagem (monumento, verticalidade, névoa densa e resolução baixa) e a regra de que o fundo é frio; toma de B o hub, os interiores, a paleta de superfícies e a calidez dos pontos de luz; e toma de C a ideia de uma matiz por região, mas com saturação contida e restrita ao ambiente, nunca à interface. A interface não muda de cor com a região. Essa é a decisão que mais pesa na consolidação, porque preserva o design system.

## 5. A direção consolidada: Luz de estudo

### Leis visuais

São sete e valem acima de qualquer gosto de cena. Primeira, **uma matiz fria por região, uma luz quente por foco**: o ambiente tem uma cor só, dessaturada, e os pontos quentes (lanterna, vela, tocha, janela) são as únicas fontes que contam. Segunda, **no máximo quatro pontos quentes ativos por quadro**, o que é também orçamento de luzes e é a razão de o quadro ficar escuro e legível. Terceira, **só o que está iluminado é interagível**: todo objeto interativo tem um ponto de luz próprio, de modo que o jogador aprende que luz quer dizer "examine". Quarta, **a névoa é incerteza**: ela esconde o fim do mundo, mas também o que o jogador ainda não investigou, e recua por ação do jogador (lupa, mecanismo, resolução de missão). Quinta, **um acento metálico por quadro** (latão ou ouro gasto), nunca dois. Sexta, **a escala se mede em figura humana**: arquitetura ao fundo sempre maior que o necessário, figura sempre pequena, a câmera preferindo baixo ângulo em monumentos e alto ângulo em varandas. Sétima, **o vinho é tecido e selo, não luz**: aparece em estandartes, mantos, capas de livro e lacres, e nunca como cor de luz de ambiente.

### Paleta

A paleta é feita de rampas curtas, de cinco ou seis degraus, porque o regime da era usava paletas indexadas e porque rampas curtas impõem disciplina. Cada material escolhe uma rampa e vive nela. Os valores completos estão em `design/ps2/ps2.tokens.json`.

| Rampa | Degraus (escuro para claro) | Papel |
| --- | --- | --- |
| Breu | #0b0709, #120910, #1b0f1a, #2a1426, #3d2338 | fundo de interface, sombra |
| Vinho | #1d0316, #410230, #6e0f29, #8c1535, #b23a52 | tecido, selo, estandarte |
| Ardósia | #0d1117, #171d27, #252d3a, #3a4556, #5b6779, #8993a3 | pedra, céu, névoa fria |
| Musgo | #0c130d, #16241a, #25382a, #3b5236, #5d7650 | Bosque, vegetação |
| Madeira | #0f0a07, #1e140d, #33221a, #4d3424, #6f4d33 | estantes, portas, Arquivo |
| Osso | #2b241c, #5a4b3a, #8f7c5e, #c2ad86, #e3d5b3, #f0e5d3 | papel, texto, pergaminho |
| Ouro gasto | #3a2e15, #6a5528, #8f7438, #bd9a61, #d9bd82 | metal, filetes, molduras |
| Brasa | #5a2a12, #a85a1c, #e5a85f, #ffc27a | fogo, janela, lanterna |
| Espectro | #241c3d, #3b2f63, #5b4a8a, #8c7bb8 | inimigos e anomalias, só estes |

As cores de marca (`design/tokens.json`) são preservadas: vinho-2 é o crimson-violet, vinho-3 o amaranth-dark, vinho-4 o dark-amaranth, breu-2 o ink-black, ouro-4 o ouro envelhecido já registrado em `DESIGN.md`, e brasa-3 e brasa-4 o âmbar e o âmbar quente. O carmesim clássico (#D62839) segue reservado a dano, perigo e ação principal, e o contraste dele sobre o fundo de painel é 3,9:1, o que o limita a elementos grandes. O violeta do Espectro sobre o painel (#5b4a8a) tem 2,58:1 e é, portanto, ornamento e luz, nunca texto; o degrau claro (#8c7bb8) tem 5,2:1 e pode servir de rótulo em casos raros.

As assinaturas regionais ficam assim. O Átrio é ardósia com âmbar, ao entardecer ou à noite; o Bosque é musgo, com luz fria esverdeada e pontos de ouro pálido; o Arquivo é madeira e vela, o único espaço quase sem luz fria; o Observatório é ardósia azul-noite, com a lua e o braseiro como únicas fontes; o Veredito é vinho. A proporção de cor por tela, que no sistema da marca é 60/20/12/8, é reinterpretada: cerca de 60 por cento de breu e ardósia, 20 de vinho e madeira, 12 de osso e ouro, e 8 de brasa. O oito por cento de brasa é o ponto do nome da escola, visto como luz.

### Contraste e acessibilidade

Os pares de texto medidos são: osso (#e3d5b3) sobre painel (#140a12) com 13,3:1; marfim (#f0e5d3) sobre painel com 15,6:1; ouro (#bd9a61) com 7,4:1; âmbar quente (#ffc27a) com 12,3:1; marfim sobre vinho-3 com 9,6:1; tinta ferrogálica (#3b2a1c) sobre osso-5 com 9,4:1. O texto secundário nunca desce de 4,5:1; o cinza apagado já usado em `game.css` (#7d6a74, 3,9:1) só serve para rótulos desabilitados. Informação de estado nunca vai só em cor: forma, texto e peso continuam sendo a regra, como já está em `DESIGN.md`.

## 6. Tipografia

A hierarquia tem cinco papéis e quatro famílias novas ou mantidas, todas com licença livre. O princípio é o de um livro impresso em 1500 lido à luz de vela: inscrição romana nos títulos, serifa legível no texto, itálico de manuscrito nas margens e dado em máquina. Fraktur existe uma vez só.

| Papel | Família | Uso | Regra |
| --- | --- | --- | --- |
| Logotipo | UnifrakturCook 700 | "Interprete." na abertura e no menu | nunca abaixo de 28 px; nunca em frases |
| Título | Cinzel 500 e 700 | títulos de tela, nome de região, botões de menu, nomes de personagens | caixa alta ou versalete, rastreio 0,06em, nunca abaixo de 14 px |
| Texto | Source Serif 4 (marca) | diálogo, descrição, códice, corpo em geral | 17 px, entrelinha 1,5, medida de 62 caracteres |
| Manuscrito | IM Fell English 400 normal e itálico | epígrafes, notas de margem, descrição de sabor de item, assinatura de carta | nunca abaixo de 16 px; nunca em informação que exija ação |
| Dado | IBM Plex Mono (marca) | números, teclas, rótulos, coordenadas | 12 px mínimo, caixa alta, rastreio 0,18em |

Inter deixa de ser usada no jogo. Um sans moderno em corpo de interface é o que mais denuncia "aplicativo", e a Source Serif 4, que já é fonte da marca, cumpre o papel de texto sem perder a continuidade. A Inter permanece no design system da escola para uso fora do jogo. A escala é 12, 14, 17, 22, 32, 56 e 96 px, com `--ui-scale` do jogo aplicado por cima. A família Cinzel é uma maiúscula de inscrição romana: cabe ao título de uma tela e perde legibilidade em parágrafo, e por isso nada longo é composto nela. A IM Fell English reproduz tipos de impressão do século XVII; a irregularidade é o seu valor, e é também o seu limite de legibilidade em corpo pequeno. A UnifrakturCook é uma blackletter de poucas ligaduras; a escolha foi por ela exatamente por ser a mais legível das gerais, e mesmo assim só funciona em tamanho grande.

Origem e licença: os arquivos woff2 do subconjunto latino vêm dos pacotes `@fontsource/cinzel`, `@fontsource/im-fell-english` e `@fontsource/unifrakturcook`, versão 5.3.0, todos sob SIL Open Font License 1.1. As reservas de nome de fonte ficam preservadas, e a licença do pacote declara os titulares originais (Cinzel Project Authors; Igino Marini, para a família Fell; j. 'mach' wust e Peter Wiegel, para a UnifrakturCook). O subconjunto latino cobre os caracteres do português (conferido na renderização de "Código" e "Configurações"). O registro está em `docs/game/REGISTRO_DE_ASSETS.md`. As combinações já foram testadas em tela no protótipo.

## 7. Interface e experiência: o menu de um RPG de 2004

### Princípios

A interface de um RPG dessa geração é um objeto, não uma camada. O inventário do Resident Evil 4 é uma maleta, os menus do Morrowind são folhas de pergaminho emolduradas, o diário do Silent Hill 2 é um caderno, e o Shadow of the Colossus quase não tem HUD. O que eles têm em comum é uma gramática material (cada painel é feito de alguma coisa), foco explícito (você sempre sabe onde o cursor está) e pouca informação por tela. A interface atual do Interprete RPG acerta a densidade baixa e erra a gramática: os painéis são sólidos de cor, com fio fino, sem material. A proposta mantém a estrutura de telas já implementada e troca o acabamento.

Cinco regras governam todos os componentes. Cantos retos, sem arredondamento e sem desfoque de fundo. Moldura dupla: um filete escuro por fora (separa da cena), um fio de ouro por dentro, e quatro tachas de ouro nos cantos nos painéis grandes. Painéis sólidos sobre a cena, com grão de papel em baixa opacidade, porque a transparência com desfoque é o recurso que mais denuncia "interface moderna". Seleção por inversão e marcador, nunca por animação suave. Transições em degraus (`steps()`), nunca em curva contínua, para que o movimento da interface partilhe a cadência de poucos quadros do restante.

### Componentes

**Moldura.** Três tipos. Pedra, para o que é do mundo (menu principal, pausa, mapa): fundo breu com grão e moldura de ouro gasto. Papel, para o que é registro (diário, códice, dossiê, cartas): fundo osso com tinta ferrogálica, borda irregular em serrilhado de pixel. Bronze, para o que é equipamento (inventário, loja): moldura ouro-3 mais grossa, com chanfro de um pixel claro em cima e escuro embaixo. O protótipo implementa pedra e bronze; papel já existe no dossiê.

**Botão.** Estados: normal (fio de ouro-2), foco e hover (preenchimento ouro-4 com texto breu, inversão total), pressionado (deslocamento de um pixel), desabilitado (cinza apagado sem fio), primário (vinho-3 com texto marfim, um por tela) e perigo (carmesim clássico apenas em confirmar ação irreversível). O foco por teclado e controle usa anel de dois pixels em marfim com deslocamento de dois pixels, em adição à inversão, para que o estado seja identificável sem cor.

**Lista e menu principal.** Itens em Cinzel, separados por filete ouro-1. O item focado ganha um losango de brasa à esquerda e recuo de 26 px, sem animação suave. A lista nunca passa de sete itens por tela; mais que isso vira página.

**Casa de inventário.** Chanfro de um pixel (claro em cima, escuro embaixo), casa vazia afundada (mais escura que o fundo), casa selecionada com contorno de dois pixels em brasa sobre fundo vinho-1, casa em uso marcada por rótulo em Plex Mono e não por cor. O inventário permanece em grade de cinco colunas, ao modo da maleta; peso e peso máximo não entram, por decisão já registrada de manter a densidade baixa. A raridade, quando entrar (backlog do jogo), é dita pela moldura da casa (nenhuma, fio, fio duplo, fio duplo com tacha) e pelo nome em Cinzel, não por semáforo de cor.

**Barras.** Calha de pedra com fio de ouro, enchimento em degraus visíveis de seis pixels. Vida em vinho-4, vigor em ouro-4, experiência em musgo-5 e muito fina. A perda recente aparece como faixa osso por 0,25 s, em degraus, a mesma pausa de impacto já prevista (até 90 ms) mantida.

**Caixa de diálogo.** Aba de nome em Cinzel sobre a moldura, texto em Source Serif 17 px com medida de 62 caracteres, máquina de escrever a 40 caracteres por segundo com revelação imediata ao confirmar, e indicador de continuação que pisca em dois estados. O retrato de busto é opcional e segue o modelo da referência 11: uma luz-chave, expressão contida, fundo arquitetônico fora de foco. A escolha é uma lista de botões, com o rótulo mono "evidência" ou "valor" à direita quando a opção carrega esse tipo, como já existe.

**HUD.** Quatro peças e nada mais: vida e vigor no canto superior esquerdo, objetivo no superior direito, atalhos no inferior direito, moedas no inferior esquerdo. A dica contextual aparece sobre o objeto, com a luz dele, e some quando o jogador se afasta. O marcador de distância usa o losango de brasa. A mira de interação aparece só quando há um alvo.

**Pausa.** Um painel de pedra de cinco itens sobre a cena escurecida por dither (não por blur). O fundo é a própria cena congelada, rebaixada em resolução, o que é barato e coerente.

**Mapa.** Uma gravura sobre papel osso, com linhas de hachura em dither de um bit, o jogador como brasa, pontos de interesse como glifos do vocabulário da seção 8, e a névoa como área ainda não hachurada. O que não foi visitado é papel em branco, não escuridão: o mapa é um registro e o mapa vazio é uma pergunta.

**Transições.** Corte por véu em seis degraus (`--passosFade`), com a tela escurecendo em faixas, e título de região em Cinzel caixa alta com sombra dura de dois pixels. A transição entre telas de interface é imediata; a única animação de interface permitida é o cursor piscando em dois estados.

### Estados e feedback

O feedback de acerto e de erro continua sem semáforo, como o design system exige. O acerto é marcado por texto e peso (nome do selo em Cinzel, "gabarito" em Plex Mono). O dano ao jogador pisca a moldura do HUD em carmesim por dois quadros. O alvo atingido pisca em osso por dois quadros e o texto de dano sobe em degraus. A pausa de impacto de 90 ms e o tremor de câmera seguem as regras existentes e são desligados em redução de movimento, junto com o piscar do cursor e o grão animado.

### Diegese

A interface é diegética onde isso custa pouco: o diário é um caderno que o jogador abre sobre uma mesa (o painel de papel), o mapa é gravura, o Crivo é a ajuda (a tecla de dica) e o olho dele aparece no HUD só quando ele tem algo a dizer, a lupa e a lanterna são ferramentas com feixe de luz visível no mundo. O que não deve ser diegético é a configuração, o salvamento e a acessibilidade.

## 8. Elementos gráficos

**Brasão.** Um escudo de topo reto com um disco perfurado de sete furos e um ponto de brasa no centro. O disco perfurado é o Crivo visto como peneira; o ponto é o "." do nome. O brasão aparece em estandartes (vinho, ouro gasto), lacres de cera (vinho-3), na capa do diário e no selo do Veredito. Nunca reproduz o logotipo literal da escola.

**Vocabulário de glifos.** Oito símbolos em grade de 16 por 16 e traço de 2 px, para mapa, códice e itens: o disco perfurado (Crivo, método), o disco com ponto (evidência), a chave aberta (descoberta), o losango (alvo e interesse), o triângulo de vértice para baixo com ponto (incerteza), os dois círculos que se tocam (comparação), a espiral de ponto aberto (pergunta) e a balança de braços desiguais (custo e dano). Os glifos são desenhados do zero e passam a viver em `src/ui/icons.ts` quando forem implementados; a escolha de usar um vocabulário epistêmico em vez de símbolos alquímicos literais é deliberada, para não cair em ocultismo genérico de fantasia e para que o símbolo diga algo sobre o método.

**Manuscritos e pergaminhos.** Papel osso-4 com manchas em osso-2 e borda serrilhada em escada, texto em IM Fell English na tinta ferrogálica (#3b2a1c), com contraste de 9,4:1 sobre osso-5. A marginália é em itálico. Cartas e notas de missão usam esse formato. As letras capitulares, quando houver, usam UnifrakturCook, com quatro linhas de altura.

**Gravuras.** O dither deixa de ser defeito e vira linguagem: ilustrações de códice, mapa e telas de morte são desenhadas em hachura de um bit com padrão Bayer, em ouro-3 sobre breu, o que as liga ao passe de render.

**Metais, pedra, vitrais.** O ouro é sempre gasto (ouro-3 e ouro-4, nunca brilhante), o bronze é brasa-2, o ferro é ardósia-3. A pedra é ardósia com ruído de alta frequência e um tom de musgo nos baixos. O vitral é feito de quatro cores só (vinho-4, brasa-3, musgo-4, ardósia azul-noite) com chumbo de um pixel em breu, e é a única superfície emissiva grande permitida: a luz que atravessa o vitral é a metáfora da interpretação, em que a mesma luz sai de cor diferente conforme o vidro.

## 9. Materiais e texturas

O regime de texturas da era é pequeno, indexado e borrado. As regras são as seguintes. Lado de 64 a 256 px em potência de 2: 128 para props, 256 para arquitetura e personagem, 512 só para atlas de interface. Entre 16 e 64 cores por textura, quantizadas por mediana com dither de Floyd-Steinberg (a ferramenta `tools/ps2/degradar-textura.py` faz isso). Filtro linear na ampliação, que dá o borrão suave que o briefing chama de "levemente borrado", e mipmap de vizinho mais próximo para não cintilar na distância. Sem mapa de normal, rugosidade ou metalicidade: o relevo é pintado na própria cor, e o brilho é falso, por textura emissiva ou por vertex color. Iluminação de arquitetura por cor de vértice, com oclusão assada e poças quentes pintadas no chão, em vez de depender só de luz dinâmica. Água e piso molhado por plano com textura animada e mistura aditiva.

As superfícies principais, na ordem em que o jogador as vê: pedra de ardósia com juntas profundas (a lição da referência 8 é fazer a junta mais escura que a face); madeira escura de veio longo, com sulcos pintados; papel de osso com manchas; tecido de vinho com dobra pintada, sem simulação; metal em duas ou três faixas de valor, sem reflexo; vegetação em planos recortados com alfa de um bit, que é o que a era fazia e é o que evita problemas de ordenação; vidro em cor lisa e emissiva.

**Orçamentos de geometria, como alvo e não como medida.** Personagem principal e Crivo de 3.000 a 6.000 triângulos; NPC e inimigo comum de 2.000 a 4.000; chefe de 5.000 a 8.000; prop de 100 a 800; módulo de arquitetura de 300 a 1.500; cena visível de 120.000 a 200.000 triângulos e 250 chamadas de desenho no máximo. As cifras vêm da prática conhecida da geração (personagens de protagonista na faixa de poucos milhares de triângulos) e não de medição neste projeto; a primeira medição em GPU real deve confirmá-las ou ajustá-las.

## 10. Ambientação

**Luz.** Uma luz direcional fria e fraca por região, no máximo quatro luzes pontuais quentes ativas (o motor já limita a seis e distribui por proximidade), sombra única de baixa resolução ou sombra de mancha sob personagens e objetos, e o restante por cor de vértice. A luz de lanterna oscila em baixa frequência e em degraus, não de forma senoidal contínua. A lanterna do jogador e a luz do Crivo são as duas luzes que acompanham o jogador.

**Névoa.** Linear, colorida, com distância próxima e distância longe definidas por região (parâmetros `nevoaPerto` e `nevoaLonge`), e não exponencial como hoje. A névoa linear dá o corte duro do horizonte que a era tinha, e esse corte é parte do charme. O que é incerteza, segundo a lei quatro, pode engrossar a névoa localmente, como já acontece no Observatório. Camadas de névoa baixa por planos translúcidos de textura ruidosa dão profundidade a custo de dois quadriláteros.

**Partículas.** Poeira em planos de câmera com cerca de oito quadros por segundo; faíscas e brasas como sprites aditivos; chuva em riscos, como já existe, mas em número menor e mais largos; folhas no Bosque como planos recortados. Todas respeitam a redução de movimento.

**Profundidade e cenografia.** Silhuetas de arquitetura distante em planos recortados dentro da névoa, repetição de pináculos e arcos, varandas de contemplação por região, pontos de fuga para o escuro, e o texto no mundo da referência 4: cartazes, letreiros e anotações com afirmações que o jogador examina.

**Composição cinematográfica.** Figura no terço inferior, campo de visão entre 50 e 58 graus, ângulo baixo em monumentos e alto em varandas, barras de 2,35:1 nas cenas de abertura e de chefe, movimento de câmera em dolly lento, e uma regra de ouro herdada da referência 2: cada região tem um gesto de luz próprio que se move (o feixe do farol é o modelo), como a lanterna pendular do Átrio ou a lua do Observatório.

## 11. Como reproduzir tecnicamente em Three.js

### O que é PS2 e o que é PS1

A pesquisa de técnica trouxe uma correção importante ao senso comum retro. O tremor de vértices e a distorção afim de textura que se associam a "gráficos de PlayStation" são traços do PS1, cujo hardware não fazia divisão por profundidade nem tinha precisão subpixel. O PS2 fazia mapeamento de textura com correção de perspectiva, tinha precisão subpixel melhor e filtragem bilinear. O que dá a cara de PS2 é outra coisa: resolução de saída em torno de 640 por 448, texturas pequenas por causa dos 4 MB de memória de vídeo, paletas indexadas, serrilhado sem antialiasing, iluminação principalmente por vértice, muita névoa para cortar a distância e efeitos de brilho e de grão aplicados sobre o quadro. A tabela fixa o que o protótipo faz com cada traço.

| Traço | Origem | Decisão |
| --- | --- | --- |
| Resolução interna baixa | PS2 | Adotado: 448 linhas por padrão, 360 em variantes |
| Texturas pequenas e indexadas, filtro bilinear | PS2 | Adotado: 128 a 256 px, filtro linear |
| Serrilhado, sem antialiasing | PS2 | Adotado: antialias desligado, já é a configuração do motor |
| Névoa linear colorida | PS2 e PC da época | Adotado |
| Quantização de cor com dither | PS1 e PS2 em 16 bits | Adotado, com 32 níveis por canal e dither de 0,7 |
| Vértices presos a uma grade | PS1 | Adotado só em meio pixel (grade fina), o suficiente para viver sem imitar o PS1 |
| Texturas com distorção afim | PS1 | Não adotado por padrão; opcional por material em props e vegetação |
| Bloom, grão e vinheta | PS2 (comum) | Adotado, mais contido que o atual |
| Mapa de normal, PBR, sombra suave | posterior | Removido no regime PS2 |

### Implementação do protótipo

O regime fica em `src/core/ps2.ts`, com integração de poucas linhas em `src/core/engine.ts`. Na versão 1.0 deste documento ele ligava com `?arte=a|b|c|ps2`; desde 13/11/2026 está sempre ligado, com os números da PS2 tardia. O que o código faz:

A **resolução interna** é uma razão de pixel (`alturaInterna` dividida pela altura da janela) aplicada ao renderizador e ao compositor, de modo que cena, bloom e tonalização rodam na resolução baixa. A ampliação para a tela segue a predefinição: suave (o navegador interpola, como uma TV) ou em pixel (`image-rendering: pixelated`, como um emulador em escala inteira). Para o padrão, escolhi suave, porque o briefing fala em "levemente borrado" e porque a escala 448 para 720 não é inteira, o que em modo pixel produz degraus de largura desigual que cintilam.

O **passe final** (`Ps2Shader`) lê a imagem na grade do buffer baixo, reduz a saturação, esmaga um pouco os pretos (o preto da era era grosso, sem gradação nas sombras), soma uma matriz de Bayer de 4 por 4 e quantiza em N níveis por canal. É o que produz a banda e o padrão de cruzeta de 16 bits.

Os **vértices** são presos por injeção em `onBeforeCompile` depois do `project_vertex`, com a grade derivada do tamanho do buffer; a injeção encadeia com qualquer `onBeforeCompile` já existente (os materiais do kit do forte têm o seu) e muda a chave de cache do programa. A **névoa** troca a `FogExp2` do motor por `Fog` linear com distância derivada da densidade de cada região. As **texturas** passam por uma varredura meio-segundo que aplica o filtro, reduz o efeito dos mapas de normal e de rugosidade e preserva o que já foi tocado (um `WeakSet` evita retrabalho).

O mapeamento afim, não implementado, é possível sem extensão: o shader de vértice envia `uv * w` e `w` como duas variáveis, e o de fragmento divide uma pela outra, o que cancela a correção de perspectiva. Fica como opção por material, e não é recomendado para arquitetura grande, onde a distorção atrapalha a leitura do espaço.

### Resultado das predefinições

As capturas estão em `docs/game/capturas/ps2/`, geradas em Chromium com renderização por software (SwiftShader). Elas servem para comparar linguagem de imagem, não desempenho, e nenhuma delas foi vista em placa de vídeo real.

Cinco leituras saem das capturas (Átrio nas cinco predefinições; Bosque, Observatório, menu e inventário na consolidada).

A primeira é que o passe sozinho leva o jogo a mais ou menos metade do caminho. O Átrio em `ps2` já perde o aspecto de aplicativo: a imagem fica mais densa, a névoa corta o fundo, as lanternas ganham halo e as bandas de cor aparecem nas sombras. Mas as malhas continuam finas demais e as lajes de 1024 px continuam nítidas demais para o regime; o resto do caminho é de material e de modelo, não de pós-processamento.

A segunda é que A, B e C se distinguem pouco no Átrio. As três diferem em saturação, resolução e filtro, e o olho lê as três como "o mesmo cenário com acabamento diferente". Isso é um achado sobre o método: a identidade de uma direção mora em luz, paleta de material e modelo, e um passe de imagem só a insinua. A comparação decisiva entre as direções, portanto, é a do documento (critérios da seção 4), não a das capturas.

A terceira é a que mais muda o plano. No Bosque e no Observatório, o piso de paralelepípedo, de albedo quente e alaranjado, domina a imagem e anula a lei da matiz fria: o Bosque deveria ser verde-musgo e o Observatório azul-noite, e ambos leem marrom. A névoa e o céu têm a matiz certa, o chão não. O piloto de materiais da seção 16 começa, por isso, pelo chão: retexturizar o paralelepípedo nas rampas ardósia, musgo e madeira, com a poça quente pintada em vertex color ao redor das lanternas.

A quarta é sobre o Observatório: a lua de olho único e a arquitetura distante em silhueta já funcionam como no desenho da referência 6 e 9, e a cena ganha com a resolução baixa porque as formas distantes viram massas. A quinta é sobre a interface: menu, inventário e HUD mudaram de caráter com poucas regras (Cinzel, fraktur no logotipo, tachas e moldura dupla, seleção por inversão, barras em degraus), e o logotipo com a brasa no lugar do ponto é o elemento de identidade mais forte do conjunto. Defeitos vistos: o fundo do inventário em casas vazias ficou quase preto e a casa sob o cursor destaca demais; o Crivo e os rostos continuam com luz estourada; e o contraste do texto de dica sobre a cena depende do painel sólido, que funcionou.

### PS2 tardia, o padrão desde 13/11/2026

O pedido do Gabriel foi uma imagem de PS2 "sutilmente melhor, tipo God of War e Resident Evil 4". Esses jogos são o teto da geração, não outro console: continuam saindo em 480 linhas entrelaçadas, com texturas pequenas, névoa curta e poucas luzes, e o que os separa do PS2 de 2001 é disciplina de produção. Usam a resolução cheia do quadro em vez de meio quadro, mipmaps e filtro trilinear bem configurados, cor de 24 ou 32 bits no buffer final (o pontilhado some quase todo), saída de vídeo com filtro que amacia as bordas, névoa e partículas em camadas, e luz montada como cinema, com poucos pontos quentes e sombras de penumbra pintadas ou projetadas. Nada disso é realismo AAA, e a predefinição nova copia exatamente essa lista.

A predefinição `tardia` (em `design/ps2/ps2.tokens.json`) virou o padrão do jogo. A antiga `ps2` continua existindo como "Era PS2 crua" e não mudou em nada: todos os campos novos são opcionais e só a tardia os usa. Em Ajustes, Imagem, Aparência há três opções, PS2 tardia, Era PS2 crua e Limpa, e a troca recarrega o jogo. Quem tinha o valor antigo `ps2` gravado (o padrão anterior, que ninguém escolheu ativamente) passa para a tardia; quem tinha escolhido Limpa continua na Limpa.

| Traço | Era PS2 crua | PS2 tardia |
| --- | --- | --- |
| Linhas internas | 448 fixas | 448, 512 ou 576 conforme a Qualidade (baixa, média, alta), nunca acima da altura real da tela |
| Cor e pontilhado | 32 níveis por canal, dither 0,7 | 64 níveis, dither 0,45: a cruzeta continua nos degradês de céu e névoa, mas some das superfícies |
| Grade de vértices | meio pixel | um quarto de pixel |
| Filtro de textura | bilinear, mipmap sem mistura | trilinear com anisotropia 4: o piso ao longe para de formar faixas à frente da câmera |
| Bordas | serrilhado puro | anti-serrilhado leve no passe final, só onde a luma muda entre vizinhos (o filtro da saída de vídeo, não um FXAA moderno) |
| Névoa | linear de distância | a mesma, mais uma camada rasteira presa ao chão, um pouco mais clara que a cor da névoa, que começa a 1,2 m da câmera e some a 1,8 m de altura |
| Sombra do sol | PCF de borda dura | PCF suave, mesmo mapa de 1024 px |
| Contraste e brilho | contraste 1,08, bloom até 0,4 | contraste 1,14, bloom até 0,55 |
| Saturação | 0,72 | 0,8 |

A névoa rasteira acompanha os pés do jogador com atraso (`Ps2.follow`), para que um pulo não levante a camada junto, e entra na mesma injeção de shader da grade de vértices, sob a mesma chave de programa. Por isso o número de programas não muda. Medido com `node tools/perf/metricas.mjs` antes e depois: 15,5 MB e 90 pedidos até a abertura, 84 programas, 228 texturas, 684 chamadas e 1,37 milhão de triângulos no Pátio, os mesmos números nos dois builds. O custo novo fica na placa, não na carga: até 65% mais pixels em Qualidade alta, quatro leituras a mais por pixel no passe final, o filtro trilinear e a penumbra filtrada. Em Qualidade baixa, que é o padrão da primeira execução em aparelho de toque, a resolução é a mesma da crua e a sombra fica desligada como antes.

O que a tardia não faz ainda, e que fecharia a distância para os jogos de referência: personagens principais com mais polígonos e texturas próprias de 512 px no rosto e nas mãos (trabalho da forja em `tools/chars/`, não do pós-processamento), luz assada em vertex color nos cenários e uma câmera de enquadramento cinematográfico nas cenas de diálogo além da que já existe. As capturas de comparação, uma por região na câmera real de jogo a 1280 por 720, estão na biblioteca do projeto em `ps2-tardia/` e são geradas por `node tools/perf/regioes.mjs <prefixo> [crua|tardia|off]`.

### Como reaproveitar os modelos existentes

Os doze personagens em glTF (MakeHuman CC0, esqueleto cmu_mb, 1,2 a 1,8 MB cada) e os props do Poly Haven (centenas de milhares de triângulos nos originais, reduzidos no pipeline atual) já têm o que mais importa para a identidade: proporção humana correta e animação por captura. O que o regime PS2 pede deles é redução, não refação. O caminho em quatro passos, todos em `tools/pipeline/` por serem offline: decimação preservando silhueta e contorno (alvo de 3.000 a 6.000 triângulos para o protagonista; o rosto mantém densidade, as costas e a sola não), troca da textura difusa por uma de 256 px com paleta de 32 a 64 cores (`degradar-textura.py`), remoção das texturas de normal, rugosidade e metalicidade e conversão da iluminação fina em vertex color assado, e reaplicação do manto e do cabelo como planos recortados com alfa de um bit. A identidade que isso preserva é a de proporção e de gesto; a que se perde é a de microdetalhe, o que é deliberado. Os dois defeitos já conhecidos nos personagens (fenda do manto, cabelo de Heloísa) devem ser resolvidos nessa passagem, e não antes, para não gastar trabalho em geometria que será decimada.

Os props de 4K do Poly Haven, por sua vez, seguem o mesmo roteiro com orçamento de 100 a 800 triângulos e textura de 128 px. O custo de arquivo cai muito: o pacote de texturas do jogo, hoje com 13 MB em WebP de 1024 px, cai para poucas centenas de kB.

## 12. Identidade sonora

O som segue a lei da luz: o silêncio é um material e o que soa deve ter fonte. A trilha ocupa no máximo metade do tempo de jogo; entre uma peça e outra há vazios de 20 a 45 segundos em que só a ambiência fala. A ambiência é a base: vento e pedra no Átrio, água e galhos no Bosque, madeira e papel no Arquivo, vento alto e metal no Observatório. A música usa instrumentação de poucos timbres, escrita para parecer sampleada na era: órgão de tubo, coro masculino distante em vogais, violoncelo, cravo, sinos e harmônica de vidro. Modos menores e dóricos, harmonia estática (bordões longos com um acorde móvel), nada de melodia de herói. O acabamento imita a mixagem da época com um filtro passa-baixas em torno de 12 a 14 kHz no barramento de música e com reverberação convolutiva por espaço (o `ConvolverNode` já existe em `audio.ts`): catedral e Átrio de 3 a 4 segundos, biblioteca de 1,2 segundo com agudos amortecidos, Bosque aberto de 0,8 segundo, Observatório de 5 segundos com corte de graves.

Os sons de interface são cinco famílias, todas de material: clique de pedra (foco e seleção), virada de página (troca de aba), arranhão de pena (confirmação de diário), lacre de cera (confirmação importante) e sino curto (alerta). Nenhum bipe sintético. Cada som tem um volume alvo abaixo da música em momentos de diálogo (o rebaixamento de música sob fala já está no `audio.ts`) e uma variação de altura de poucos por cento para não repetir.

O que existe hoje: trilha de Kevin MacLeod (CC-BY), sons do Freesound (licença dos dez links ainda por conferir, pendência do Gabriel) e síntese em WebAudio como reserva. A recomendação é manter tudo até substituir, aplicar o passa-baixas e a reverberação por região desde já (custo mínimo, ganho de coesão) e tratar a substituição por material autoral ou de licença limpa como trabalho posterior, com a regra da lei da luz como critério de escolha.

## 13. DNA da Escola Interprete

O documento-matriz e o atlas pedem que o jogo seja uma obra do universo do Interprete e não um produto com a identidade da escola colada por cima. A estratégia é traduzir conceito em arquitetura, símbolo e mecânica, e deixar no visual só três marcas de procedência que um conhecedor reconhece e um estranho não percebe como logotipo.

| Conceito da escola | Tradução no jogo | Onde aparece |
| --- | --- | --- |
| Conhecimento | pedra, estante e livro como arquitetura; a Academia como lugar | Átrio, Arquivo |
| Investigação | luz como ferramenta; a lupa revela rastros de tinta; a lanterna abre o espaço | lupa, Crivo, interação |
| Pensamento crítico | o Crivo: peneira, disco perfurado, filtro; a rosácea como crivo de pedra | brasão, janelas, símbolo |
| Interpretação | o vitral: mesma luz, vidro diferente; duas versões do mesmo vento | missões do vento, janelas |
| Evidência | a luz quente pontual; selo, lacre, papel com carimbo | itens, interface |
| Descoberta | o corredor que acaba no escuro; a porta que abre luz | composição, level design |
| Certeza declarada | "a evidência sugere"; "não permite concluir" | texto de interface e diálogo |

As três marcas de procedência são estas. Primeira, o **ponto do nome**: "Interprete." mantém o ponto final, que no jogo é uma brasa de dois estados (acesa e baixa) no logotipo, no carregamento e no marcador de objetivo. Segunda, o **vinho em tecido e selo**, com as cores de marca preservadas exatamente em estandartes, mantos e lacres. Terceira, a **voz**: português do Brasil, frases curtas, jargão definido na primeira vez, sem promessa, sem "jornada", com ironia só sobre ideias. A proporção 60/20/12/8 da marca reaparece reinterpretada como descrito na seção 5. O que não se transpõe: o logotipo literal, a Inter, o fundo rosa-claro, o design plano sem textura e a ausência de ornamento. O jogo é escuro, texturizado e ornamentado, e é isso que o separa da plataforma, enquanto as três marcas mantêm a ponte.

Os dois arcos da área de membros ("Estudar" e "Comunidade") continuam como o vocabulário arquitetônico de partida, citado no documento-matriz, e são reinterpretados no Átrio como dois portais ogivais, cada um com sua luz. A conexão é de forma, não de identificação.

## 14. Limites e o que este documento não afirma

A direção foi fundamentada em onze imagens, no repositório, no documento-matriz, no atlas e em conhecimento técnico sobre a geração; ela não foi testada com jogadores. As predefinições A, B e C foram prototipadas só como regime de imagem e de interface, sem refazer modelos, e a comparação, por isso, subestima o que A, B e C poderiam ser com arte própria. As capturas vêm de renderização por software, de 10 a 17 quadros por segundo, com sombras e pós-processamento reduzidos pelo ambiente; o aspecto em placa real e em celular não foi verificado, e o custo do passe PS2 em GPU móvel não foi medido (a hipótese é que seja menor que o atual, porque a resolução cai pela metade ou mais). Os orçamentos de triângulos são alvos extraídos da prática conhecida da geração. A afirmação de que o tremor de vértices é traço de PS1 e de que o PS2 tinha correção de perspectiva é de conhecimento técnico geral da arquitetura dos dois consoles e não foi reverificada em fonte primária nesta sessão. Nenhuma imagem de referência foi copiada para o repositório, e nenhum letreiro, marca ou nome das referências foi reproduzido.

## 15. Decisões que dependem do Gabriel

Resolvido em 13/11/2026: a PS2 tardia é a única imagem, sem opção de aparência nem `?arte=`. Aprovar o motivo da lua de olho único no Observatório com o roteiro. Aprovar a escolha das quatro famílias tipográficas (as licenças já estão registradas). Autorizar a passagem de decimação e de redução de textura dos personagens, que cabe à frente "Refazer personagens, NPCs e mobs" e deve ser coordenada com ela para não decimar o que ainda está sendo refeito.

## 16. Próximos passos recomendados

Em ordem de retorno: ligar o regime como padrão depois da revisão do Gabriel; trocar a moldura dos painéis de pedra e de bronze pelas versões do protótipo em todas as telas e acrescentar a moldura de papel ao diário e ao códice; implementar o vocabulário de glifos em `icons.ts`; aplicar passa-baixas e reverberação por região no áudio; retexturizar o piso de paralelepípedo nas rampas ardósia, musgo e madeira (o achado das capturas), depois refazer os materiais do Átrio no regime de paleta e de textura pequena como piloto, medir em GPU real e só então estender às outras regiões; e redigir os cartazes e letreiros do mundo com afirmações examináveis, em coordenação com o roteiro e com a regra de que todo caso é fictício e marcado como simulação.

A direção só se sustenta se for aplicada com a mesma disciplina em cenário, personagem, interface e som, e se cada elemento novo responder à pergunta da primeira lei: o que, nesta cena, está iluminado, e o que o jogador pode examinar nessa luz?
