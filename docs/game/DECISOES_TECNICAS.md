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

Carga e tremor do chão (13/11/2026): causas, correções e números medidos em `docs/game/DESEMPENHO.md`. Regras que ficaram: props de cenário obedecem ao orçamento PS2 de `tools/pipeline/ps2_lod.mjs`; a camada PS2 só prende à grade vértices na tela e a menos de 30 m da câmera; `Engine.precompile` aplica a camada PS2, compila no alvo do compositor e sobe as texturas antes de revelar a cena; quem entra na cena depois da região passa por `Game.warmScene`.

## Assets externos (lote 1, 12/11/2026)

Os assets de alta resolução entram por um pipeline sem passo manual, em `tools/pipeline/`. Blender 5.3 roda como módulo Python (`pip install bpy`) e abre os pacotes Blend 4K do Poly Haven, aplica modificadores, reduz a contagem de triângulos só onde ela não aparece e exporta glTF; `gltf-transform optimize --compress meshopt` comprime a geometria e as texturas vão para WebP. O jacarandá foi de 585 MB para 4,4 MB e o forte modular para 6,8 MB. O kit do forte perdeu a cor na exportação (no Blender ela vem de uma mistura por máscara), e `fixMaterials` em `src/core/assets.ts` religa a textura difusa do kit em tempo de execução.

Os humanos são montados com MPFB2 a partir dos assets CC0 do MakeHuman, com esqueleto `cmu_mb`. As animações são da base de captura de movimento da CMU, que usa os mesmos nomes de osso; o redirecionamento (`anim.py`) mede a rotação de cada osso em relação à pose T do primeiro quadro, reamostra a 30 quadros por segundo, remove o deslocamento horizontal e grava cada clipe como trilha NLA. O resultado são doze personagens de 1,2 a 1,8 MB cada, com dezesseis clipes.

No jogo, a abertura carrega os personagens e só os props que o Pátio usa (`PROPS_FIRST`); os demais descem em segundo plano e uma troca de região espera por eles. O que falha ao carregar não fica em cache como ausente: é tentado de novo na região seguinte e aparece em Configurações, em "Diagnóstico" (`src/core/diag.ts`), junto com peças de kit, clipes de animação e arquivos de áudio que faltarem. `RegionBuilder.place` instancia um prop já carregado, com escala por altura ou largura e colisor opcional, e devolve null quando o arquivo falta; todo uso tem a versão procedural como reserva, então o jogo continua jogável sem `public/models`. Na qualidade baixa os jacarandás voltam a ser árvores procedurais. As folhas do jacarandá não projetam sombra, por custo.

Os espectros maiores (vulto, eco, veredito) usam o corpo `vulto.glb`: o rosto vira escuro, os olhos são esferas presas ao osso da cabeça e a máquina de estados escolhe o clipe. A antecipação do golpe toca a primeira parte do clipe de golpe pesado no tempo exato de `windup`, para que o aviso legível continue casado com o dano. O fiapo continua procedural, porque é névoa e não corpo.

O áudio passou a misturar arquivos e síntese. A trilha de cada região é um arquivo de Kevin MacLeod tocado por streaming (elemento de áudio ligado ao barramento de música); se falhar, a trilha generativa volta. Passos são escolhidos por superfície da região (pedra, terra, entulho, água quando chove), sem repetir a última amostra e com pequena variação de altura. Os golpes usam amostras gravadas. Cada som gravado tem o sintetizado como reserva.

## Personagens na direção PS2 (12/11/2026)

A direção de arte passou a ser dark fantasy gótica de PS2 (2003 a 2006) com dark academia, e a regra antiga de "low-poly proibido" caiu. Os humanos foram refeitos a partir dos mesmos GLB do MakeHuman, sem escaneamento de pessoa real, por `tools/pipeline/ps2.py` (um personagem) e `ps2_cast.py` (o elenco, em paralelo). O script remove a pele coberta por roupa antes de reduzir a malha, porque a malha simplificada do corpo atravessaria o tecido; reduz cada peça por orçamento de triângulos com colapso simétrico em X, o que preserva grupos de vértices e UV; troca o cabelo de cartões alfa, que a redução despedaça, por uma casca sólida nascida do couro cabeludo do próprio corpo, com os mesmos pesos de osso, linha do cabelo alisada e volume por penteado (curto, coque, longo, trança, afro); e reprocessa as texturas: 256 px para pele e roupa, 128 para cabelo, 64 para sapato e olho, desfoque leve, saturação menor, sombra puxada para cinza azulado, grão de luminância e cor de 15 bits com pontilhado ordenado 4x4. Mapas normais saem. O alfa de recorte fica decidido no pipeline (`extras.ps2_alpha`) e `fixMaterials` o respeita.

Cada personagem fica entre 4 e 8,4 mil triângulos (o vulto com 4 mil), contra 38 a 40 mil antes. `retarget.py` é o redirecionamento de `anim.py` extraído como biblioteca, para funcionar sobre um GLB já montado. Clipes novos: `jump` (CMU 16_01, só a flexão de impulso e de aterrissagem, porque a altura do pulo vem da física), `attack2` (02_09) e `die` refeito (90_12, queda para trás que termina deitada, aproximada do chão à medida que os quadris descem). As variantes `torch_idle`, `torch_walk`, `torch_run`, `torch_attack`, `torch_attack2`, `torch_heavy` e `torch_jump` repetem o clipe de origem com o braço esquerdo erguido à frente do peito, orientado pelo tronco a cada quadro. NPCs não levam os clipes de tocha, pulo e segundo golpe.

O protagonista tem oito modelos, `player_<masc|fem>_<curto|coque|longo|capuz>`. Como o cabelo é gerado, qualquer corpo aceita qualquer corte; o capuz feminino recebe manto e capuz enxertados do corpo masculino, reduzidos em largura e altura. As chaves antigas `player_<corte>` apontam para os novos arquivos. O vulto, que é o corpo dos espectros, tem túnica em mármore frio de veios largos, tingida em tempo de execução pela cor de cada inimigo.

Para refazer: `python3 -m venv` com `pip install bpy==5.3.0 numpy`, BVH da CMU em `CMU_MOCAP_DIR` (repositório una-dinosauria/cmu-mocap), `npm i -g @gltf-transform/cli`, GLB de entrada descomprimidos com `gltf-transform copy`, e `BPY=<venv>/bin/python python3 tools/pipeline/ps2_cast.py <entrada> <saída>`.

Peso total acrescentado ao build: cerca de 34 MB de props, 20 MB de personagens, 17 MB de áudio e 10 MB de texturas. O carregamento inicial ficou maior; carregar por região é a próxima otimização se a medição em rede real pedir.

## Controles de toque (12/11/2026)

`src/ui/touch.ts` escreve em `Input.touchMove` (eixo do joystick, y positivo para trás), `touchLookX/Y` (px CSS acumulados por quadro) e `touchRun`; o jogador soma esses valores aos do teclado e do gamepad, e os botões injetam as mesmas ações do teclado. Cálculos de movimento: o joystick tem zona morta de 14%, curva ligeira (expoente 1,15) e a base acompanha o dedo quando ele passa do raio, para o ponto neutro não se afastar. A velocidade analógica é contínua, de 35% a 100% do alvo, sem degrau; corrida liga em 94% de deflexão e só desliga abaixo de 80% (histerese). Amortecimento da velocidade, da guinada e da frenagem é exponencial (`1 - exp(-12 dt)`), logo a resposta é a mesma a 30 ou 144 quadros por segundo. O olhar usa 0,0046 rad por px vezes a sensibilidade, com teto de 0,6 rad por quadro contra saltos depois de travamentos. O toque que abre o menu a partir da abertura é engolido por 450 ms, para não virar clique no botão que surge sob o dedo.

## Entrada, registro e dossiê depois da auditoria de 12/11/2026

A classe `Input` pergunta ao jogo se há painel aberto (`uiOpen`). Só com o jogo em primeiro plano ela cancela Tab, espaço e setas; em menu, pausa, caderno, loja, dossiê e conversa essas teclas são do navegador, e Tab deixa de ser atalho de inventário. O clique que captura o ponteiro não vira golpe; se o navegador recusa a captura, os cliques voltam a valer. `usingPad` acompanha a última entrada, e o estado do controle é zerado quando ele some, volta ou é trocado, de modo que botão apertado na reconexão não dispara. A zona morta é radial, com reescala, e ajustável. Teclas e botões do controle são remapeáveis; um conflito troca as duas ações e avisa.

O adaptador de registro devolve falso quando a gravação falha. O jogo avisa uma vez, mantém o aviso na pausa e oferece baixar o registro; o menu inicial importa o arquivo. Cada gravação guarda a anterior como cópia, e um registro ilegível é posto de lado e trocado por ela. `migrate` e `sanitizeSettings` validam tipos e faixas. Há um registro por navegador; perfis múltiplos dependem de decisão de produto.

O dossiê de Lia gera figuras e frases a partir das opções do caso. O dano é risco absoluto total, com risco de base explícito. O desfecho é sorteado no horizonte dos estudos (8 semanas), e em dois tempos: primeiro a chance real dentro da faixa de incerteza da opção, depois o resultado. É uma escolha de modelagem para não tratar a estimativa de um grupo como a probabilidade de uma pessoa; continua fictícia e sem revisão independente.
