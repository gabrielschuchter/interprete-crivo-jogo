# Decisões técnicas

Registro das escolhas de arquitetura feitas em novembro de 2026, com o motivo de cada uma e o que a faria mudar.

## Pilha

Vite 5, TypeScript em modo estrito e Three.js 0.170, sem framework de interface. A interface é DOM e CSS sobre `design/tokens.css`. A alternativa considerada foi React Three Fiber; foi descartada porque o jogo tem um laço de quadro único e pouca interface reativa, e a camada extra custaria tamanho de pacote e controle de alocação sem dar nada em troca. O pacote final tem 838 kB de JavaScript (244 kB em gzip), quase todo Three.js.

## Assets gerados em código

Não há modelo, textura ou áudio externo. Texturas PBR são pintadas em canvas (`src/world/textures.ts`), a arquitetura vem de um kit paramétrico (`src/world/kit.ts`), personagens são figuras articuladas com animação procedural (`src/entities/figure.ts`), o pelo do Crivo usa camadas de casca e o som é sintetizado em WebAudio (`src/core/audio.ts`). O motivo foi duplo: o ambiente de desenvolvimento não alcança repositórios de assets, e a regra de licenças do projeto fica trivial quando tudo é autoral. O custo é visível: as figuras humanas são estilizadas, sem malha esculpida nem captura de movimento. Substituir por modelos glTF é possível sem mexer em jogabilidade, porque `Figure` expõe só pose, âncoras e estados.

## Estado e registro

Todo o estado de partida é um objeto serializável em `src/domain/state.ts`, alterado por funções puras e sem dependência de Three.js. O registro grava esse objeto em `localStorage` (chave `interprete-rpg-registro-v1`) por meio de um adaptador com três métodos. Trocar por Supabase significa escrever outro adaptador; nada foi conectado a banco, Clerk ou domínio, conforme os limites do projeto.

## Cooperativo

O jogo é para um jogador. O que está pronto para cooperativo é a separação: regras e progresso no domínio puro, entrada abstraída em ações nomeadas, inimigos e jogador como entidades com estado próprio e resolução de golpes centralizada em `Game.resolveAttack`. O que falta é tudo o que é rede: autoridade, sincronização de entidades, reconciliação e sessão. Isso não foi implementado e não deve ser descrito como parcialmente pronto.

## Regiões

Cada região é uma função que devolve geometria estática fundida, colisores 2D com etiquetas, plataformas, pontos de entrada, objetos interativos e ações de animação. A colisão é 2D com altura por plataforma, o que basta para o desenho atual e impede níveis com sobreposição vertical real (uma passarela sobre uma área caminhável). Viagem entre regiões descarta a cena anterior inteira.

## Narrativa

Diálogos são funções assíncronas (`await g.say`, `await g.choose`) em `src/story.ts`. Lê-se como roteiro e dispensa um formato de dados próprio. O progresso é guardado como passo numérico por missão e um conjunto de marcas. Com mais de umas vinte missões isso pede um editor ou um formato declarativo.

## Testes

Vitest cobre domínio, conteúdo e o caso simulado (27 testes). `tests/e2e/playthrough.mjs` joga a campanha inteira em Chromium com 29 verificações, usando as mesmas ações de entrada do jogador humano e um jogador automático simples para as lutas. O teste já pagou o próprio custo: encontrou que o caso de Lia destravava no códice a página que conta como sexta página solta, o que permitia concluir a missão das páginas com cinco.

## Desempenho

Medido apenas em renderização por software (SwiftShader), a 1280×720: de 10 a 17 quadros por segundo. Isso não diz nada sobre uma placa de vídeo real, e não houve teste em hardware. Há três níveis de qualidade em Ajustes que alteram sombras, densidade de vegetação, resolução interna e pós-processamento. A medição em máquinas reais é a primeira pendência.

## Assets externos (lote 1, 12/11/2026)

Os assets de alta resolução entram por um pipeline sem passo manual, em `tools/pipeline/`. Blender 5.3 roda como módulo Python (`pip install bpy`) e abre os pacotes Blend 4K do Poly Haven, aplica modificadores, reduz a contagem de triângulos só onde ela não aparece e exporta glTF; `gltf-transform optimize --compress meshopt` comprime a geometria e as texturas vão para WebP. O jacarandá foi de 585 MB para 4,4 MB e o forte modular para 6,8 MB. O kit do forte perdeu a cor na exportação (no Blender ela vem de uma mistura por máscara), e `fixMaterials` em `src/core/assets.ts` religa a textura difusa do kit em tempo de execução.

Os humanos são montados com MPFB2 a partir dos assets CC0 do MakeHuman, com esqueleto `cmu_mb`. As animações são da base de captura de movimento da CMU, que usa os mesmos nomes de osso; o redirecionamento (`anim.py`) mede a rotação de cada osso em relação à pose T do primeiro quadro, reamostra a 30 quadros por segundo, remove o deslocamento horizontal e grava cada clipe como trilha NLA. O resultado são doze personagens de 1,2 a 1,8 MB cada, com dezesseis clipes.

No jogo, a abertura carrega os personagens e só os props que o Pátio usa (`PROPS_FIRST`); os demais descem em segundo plano e uma troca de região espera por eles. O que falha ao carregar não fica em cache como ausente: é tentado de novo na região seguinte e aparece em Configurações, em "Diagnóstico" (`src/core/diag.ts`), junto com peças de kit, clipes de animação e arquivos de áudio que faltarem. `RegionBuilder.place` instancia um prop já carregado, com escala por altura ou largura e colisor opcional, e devolve null quando o arquivo falta; todo uso tem a versão procedural como reserva, então o jogo continua jogável sem `public/models`. Na qualidade baixa os jacarandás voltam a ser árvores procedurais. As folhas do jacarandá não projetam sombra, por custo.

Os espectros maiores (vulto, eco, veredito) usam o corpo `vulto.glb`: o rosto vira escuro, os olhos são esferas presas ao osso da cabeça e a máquina de estados escolhe o clipe. A antecipação do golpe toca a primeira parte do clipe de golpe pesado no tempo exato de `windup`, para que o aviso legível continue casado com o dano. O fiapo continua procedural, porque é névoa e não corpo.

O áudio passou a misturar arquivos e síntese. A trilha de cada região é um arquivo de Kevin MacLeod tocado por streaming (elemento de áudio ligado ao barramento de música); se falhar, a trilha generativa volta. Passos são escolhidos por superfície da região (pedra, terra, entulho, água quando chove), sem repetir a última amostra e com pequena variação de altura. Os golpes usam amostras gravadas. Cada som gravado tem o sintetizado como reserva.

Peso total acrescentado ao build: cerca de 34 MB de props, 20 MB de personagens, 17 MB de áudio e 10 MB de texturas. O carregamento inicial ficou maior; carregar por região é a próxima otimização se a medição em rede real pedir.

## Controles de toque (12/11/2026)

`src/ui/touch.ts` escreve em `Input.touchMove` (eixo do joystick, y positivo para trás), `touchLookX/Y` (px CSS acumulados por quadro) e `touchRun`; o jogador soma esses valores aos do teclado e do gamepad, e os botões injetam as mesmas ações do teclado. Cálculos de movimento: o joystick tem zona morta de 14%, curva ligeira (expoente 1,15) e a base acompanha o dedo quando ele passa do raio, para o ponto neutro não se afastar. A velocidade analógica é contínua, de 35% a 100% do alvo, sem degrau; corrida liga em 94% de deflexão e só desliga abaixo de 80% (histerese). Amortecimento da velocidade, da guinada e da frenagem é exponencial (`1 - exp(-12 dt)`), logo a resposta é a mesma a 30 ou 144 quadros por segundo. O olhar usa 0,0046 rad por px vezes a sensibilidade, com teto de 0,6 rad por quadro contra saltos depois de travamentos. O toque que abre o menu a partir da abertura é engolido por 450 ms, para não virar clique no botão que surge sob o dedo.

## Entrada, registro e dossiê depois da auditoria de 12/11/2026

A classe `Input` pergunta ao jogo se há painel aberto (`uiOpen`). Só com o jogo em primeiro plano ela cancela Tab, espaço e setas; em menu, pausa, caderno, loja, dossiê e conversa essas teclas são do navegador, e Tab deixa de ser atalho de inventário. O clique que captura o ponteiro não vira golpe; se o navegador recusa a captura, os cliques voltam a valer. `usingPad` acompanha a última entrada, e o estado do controle é zerado quando ele some, volta ou é trocado, de modo que botão apertado na reconexão não dispara. A zona morta é radial, com reescala, e ajustável. Teclas e botões do controle são remapeáveis; um conflito troca as duas ações e avisa.

O adaptador de registro devolve falso quando a gravação falha. O jogo avisa uma vez, mantém o aviso na pausa e oferece baixar o registro; o menu inicial importa o arquivo. Cada gravação guarda a anterior como cópia, e um registro ilegível é posto de lado e trocado por ela. `migrate` e `sanitizeSettings` validam tipos e faixas. Há um registro por navegador; perfis múltiplos dependem de decisão de produto.

O dossiê de Lia gera figuras e frases a partir das opções do caso. O dano é risco absoluto total, com risco de base explícito. O desfecho é sorteado no horizonte dos estudos (8 semanas), e em dois tempos: primeiro a chance real dentro da faixa de incerteza da opção, depois o resultado. É uma escolha de modelagem para não tratar a estimativa de um grupo como a probabilidade de uma pessoa; continua fictícia e sem revisão independente.
