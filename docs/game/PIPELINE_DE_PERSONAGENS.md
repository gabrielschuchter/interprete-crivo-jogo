# Pipeline de personagens PS2 (elenco de 23)

Registro dos experimentos de 12 e 13/11/2026 com o kit de personagens PS2 e do pipeline que saiu deles. Tudo roda localmente, sem custo, sem GPU e sem serviço pago. As capturas estão em `docs/game/capturas/elenco/`.

## O que foi testado e o que ficou

Três caminhos de produção 3D foram tentados dentro do projeto, com o mesmo critério de saída: um GLB que o jogo carrega, com esqueleto, clipes e altura correta.

O caminho A (criatura procedural com rig próprio, `tools/chars/criatura.py`) gera a malha, o esqueleto e as animações em Python dentro do Blender 5.3 em modo de fundo. Serve para o que não tem anatomia humana: o Espectro da Lanterna (MOB_02) sai em 1,9 s, com 1.276 triângulos, 38 ossos (oito fitas do manto com três ossos cada) e dez clipes desenhados à mão por função (pairar, avançar, erguer o lampião, se desfazer).

O caminho B, a forja (`tools/chars/build.py`), parte do corpo MakeHuman de baixa contagem (proxy de 3,2 mil triângulos, esqueleto cmu_mb de 31 ossos) e veste a figura com figurino procedural: anéis lançados contra o corpo, casca convexa, evasê e pesos transferidos da face mais próxima. Peças rígidas (lampião, alabarda, livro, martelo) ficam presas ao osso da mão e são reancoradas na pose de referência do clipe idle, para não girarem com o braço. A pele é assada da malha base para a UV da proxy com Cycles na CPU; o atlas da roupa é pintado em numpy (grão de lã, dobras, sujeira, barras com motivo gótico, gradação PS2 com pontilhado de 31 níveis), sem mapa normal. Os clipes vêm da base CMU, redirecionados e corrigidos: cabeça nivelada a cerca de 6 graus, pernas congeladas nos gestos de NPC, braço baixo para quem segura lampião e variantes de tocha para o protagonista. Cada personagem sai em 6 a 12 s.

O caminho C (imagem para 3D com TripoSR, Hunyuan3D ou TRELLIS) foi recusado depois de testado: os pesos ficam no Hugging Face, que a rede deste ambiente bloqueia, e nenhum dos três roda em tempo útil sem GPU. Mesmo com acesso, a saída é uma malha única sem esqueleto, com textura projetada e topologia que não aceita animação sem retopologia manual, o que contraria a meta de pipeline reutilizável.

## Rubrica

Notas de 1 a 5, comparando com a versão anterior dos personagens (`tools/pipeline/ps2_cast.py`, roupas da comunidade MakeHuman reduzidas). As imagens `cmp_npc.jpg` e `cmp_mob.jpg` mostram a anterior na linha de cima.

| Critério | Anterior | Forja (B) | Criatura (A) | Imagem para 3D (C) |
| --- | --- | --- | --- | --- |
| Fidelidade PS2 (silhueta, textura pintada, paleta) | 2 | 4 | 4 | não medido |
| Silhueta legível e identidade própria | 2 | 4 | 5 | não medido |
| Topologia e esqueleto prontos para animar | 4 | 4 | 4 | 1 |
| Editabilidade (mudar roupa, cor, adereço) | 2 | 5 (receita JSON) | 3 (código) | 1 |
| Desempenho (triângulos, KB após meshopt) | 3 (8,3 mil, 860 KB) | 4 (3,8 a 6 mil, 470 a 520 KB) | 5 (1,3 mil, 480 KB) | não medido |
| Repetibilidade | 3 | 5 (lote de 29 GLB em 90 s) | 5 | 2 |
| Licença | 4 (CC0 de terceiros) | 5 (corpo CC0, resto autoral) | 5 (autoral) | 3 (depende do modelo) |
| Custo | 5 | 5 | 5 | 5 (impraticável aqui) |

## Elenco gerado

As receitas estão em `tools/chars/elenco.py`, que escreve `elenco.json`. `tools/chars/lote.sh` constrói tudo em paralelo e comprime com `tools/pipeline/ps2_post.cjs`; a saída vai para `public/models/personagens/ps2/`.

| Código | Personagem no jogo | Arquivo | Triângulos | Clipes |
| --- | --- | --- | --- | --- |
| PC_M_01, PC_F_01 | protagonista, dois corpos e quatro penteados (curto, coque, longo, capuz), cabelo em material próprio para a cor escolhida | `player_<masc|fem>_<corte>` | 5,0 a 5,4 mil | 25, com tocha e pulo |
| NPC_01 | Frei Bartolomeu, monge arquivista (Arquivo) | `npc_01_arquivista` | 4,0 mil | 11 |
| NPC_02 | Custódia, acendedora de lampiões (Pátio) | `npc_02_acendedora` | 5,3 mil | 11 |
| NPC_03 | Severino, vigia da catedral (Observatório) | `npc_03_vigia` | 5,8 mil | 11 |
| NPC_04 | Dona Amélia, viúva da estalagem (Pátio) | `npc_04_estalajadeira` | 4,0 mil | 11 |
| NPC_05 | Rosário, enfermeira da neve (Observatório) | `npc_05_enfermeira` | 5,4 mil | 11 |
| NPC_06 | Inácio, noviço do coro (Observatório) | `npc_06_novico` | 3,8 mil | 11 |
| NPC_07 | Glória, herbalista dos cogumelos (Bosque) | `npc_07_herbalista` | 4,7 mil | 11 |
| NPC_08 | Matias, cartógrafo ferroviário (Bosque) | `npc_08_cartografo` | 4,8 mil | 11 |
| NPC_09 | Dito, órfão da torre dos sinos (Pátio) | `npc_09_orfao` | 4,2 mil | 11 |
| NPC_10 | Professor Aurélio (Arquivo) | `npc_10_professor` | 4,3 mil | 11 |
| NPC_11 | Vera, detetive mascarada (Pátio) | `npc_11_detetive` | 5,3 mil | 11 |
| NPC_12 | Celeste, acólita da catedral (Observatório) | `npc_12_acolita` | 4,4 mil | 11 |
| MOB_01 | Erudito Oco (`erudito`) | `mob_01_erudito` | 4,0 mil | 10 |
| MOB_02 | Espectro da Lanterna, corpo do Vulto | `mob_02_espectro` | 1,3 mil | 10 |
| MOB_03 | Errante do Gelo (`errante`) | `mob_03_errante` | 5,7 mil | 10 |
| MOB_04 | Suplicante Encapuzado (`suplicante`) | `mob_04_suplicante` | 5,2 mil | 10 |
| MINI_01 | Carrasco da Torre dos Sinos, corpo do Eco | `mini_01_carrasco` | 5,5 mil | 10 |
| MINI_02 | Duelista das Cinzas (`duelista`) | `mini_02_duelista` | 5,4 mil | 10 |
| MINI_03 | Carcereiro dos Trilhos (`carcereiro`) | `mini_03_carcereiro` | 6,0 mil | 10 |
| MINI_04 | Matriarca do Coro Velado (`matriarca`) | `mini_04_matriarca` | 4,3 mil | 10 |
| BOSS_01 | O Grande Intérprete, corpo do Veredito | `boss_01_grande_interprete` | 4,1 mil | 10 |

## Comportamento em jogo

Os moradores falam em quatro tempos (saudação, assunto do ofício com gesto, reação ao andamento da história em três etapas, despedida com aceno), viram para o jogador e gesticulam sozinhos. O assunto de cada um é um jeito de pensar com evidência posto como coisa do mundo: procurar só onde há luz, contar só quem voltou, o livro de hóspedes que só tem elogio, a melhora que viria de qualquer jeito, o mapa feito para outra pergunta. Texto em `src/content/moradores.ts`.

Os inimigos novos usam a mesma máquina de combate dos antigos (vagar, perceber, perseguir, antecipar, golpear, recuperar, atordoar, morrer). Os mini-chefes têm barra de chefe e entram na segunda fase a 50% de vida: ficam 25% mais rápidos, antecipam 20% mais curto, recuperam 30% mais rápido e batem 15% mais forte. Cada um tem padrão próprio: a Duelista encadeia estocadas (duas, depois três), o Carcereiro bate em anel e chama dois fiapos ao entrar na segunda fase, a Matriarca mantém distância e canta em leque (três sopros, depois cinco). Eles formam os três focos da missão Focos Residuais, um por região. O Eco e o Veredito mantêm os padrões que já tinham, com os corpos novos.

Os corpos dos moradores e inimigos baixam junto com a região em que aparecem; a abertura só pré-carrega os protagonistas.

## Evidência de QA

`npm run e2e:elenco` (com o servidor de desenvolvimento no ar) confere 103 pontos: modelo e clipes de cada morador, distância mínima dos objetos de missão, conversa completa, e para cada inimigo novo perceber, perseguir, se mover, antecipar, acertar, receber dano e morrer; nos mini-chefes, a segunda fase e o padrão próprio medido (combo máximo, reforços e anel, pico de projéteis). A campanha completa (`npm run e2e`, contra `vite preview`) passou sem falhas com os corpos novos, e os 40 testes unitários seguem verdes.

## Limitações conhecidas

O rosto é a textura de pele do MakeHuman assada em 512 px. Desde 13/11/2026 a malha do corpo (material `Human.body`) de cada um dos 28 humanos traz seis morph targets com valores de 0 a 1: `piscar`, `sobrancelha_erguer`, `sobrancelha_franzir`, `boca_abrir`, `sorriso` e `tristeza`. Eles saem das unidades de expressão do MakeHuman (CC0), carregadas como shape keys na malha base e transferidas para a proxy por projeção baricêntrica na superfície mais próxima (vértices a mais de 3 cm são ignorados); cerca de 300 vértices do rosto se movem por expressão. A receita pode desligar com `sem_expressoes`. Quem aciona os morphs em tempo real é o código do jogo (`morphTargetDictionary` e `morphTargetInfluences`); a forja só garante que existam. Na barba cheia do Professor a boca quase não aparece, e `boca_abrir` em 1 mostra a língua: em fala, valores de 0,2 a 0,5 leem melhor.

Os protagonistas têm cinco tons de pele, escolhidos na criação. Cada tom é uma textura própria em `public/textures/ps2/pele/<fem|masc>_<0..4>.webp`, e não uma tinta multiplicada sobre a pele clara, que puxava para o laranja e apagava a sobrancelha. `tools/chars/peles.sh` assa as peles caucasiana, asiática e africana do MakeHuman (CC0) na UV da proxy de cada corpo, com o mesmo grão, as sobrancelhas pintadas e a gradação PS2 do resto da forja. Depois `tools/chars/peles.py` monta a escala: caucasiana, dois tons médios (asiática misturada à africana, espaçados por luminância do rosto), africana e africana escurecida. No jogo, `FigureOpts.skinMap` troca o mapa do material `Human.body` (rosto, mãos e corpo) sem tocar na roupa. As amostras da criação (`SKINS`) são a cor média do rosto de cada tom. As variações saem da forja sem receita nova, por `FORJA_EXTRA` (JSON fundido na receita) e `FORJA_PELE_OUT` (salva a pele avulsa).

O olho low-poly saía do Blender com `alphaMode: BLEND`, e o GLTFLoader desliga a escrita de profundidade nesse modo: o interior do crânio, de dupla face, cobria o globo, e os olhos pareciam vazios. A forja agora exporta o olho opaco.

A máscara da detetive virou dominó (faixa dos olhos com o nariz livre, furos largos e abas nas têmporas) em linho claro com barra dourada, legível de corpo inteiro. A verificação de expressões fica em `prancha.ts?expr=neutro,piscar,...&zoom=0.4` (com `esconde=` e `marca=` para depurar material), e o `e2e:elenco` confere as seis expressões no protagonista e nos doze moradores.

Os mini-chefes reaproveitam os clipes humanos de captura; o golpe próprio do martelo e do gancho e a Matriarca pairando são feitos em tempo real no jogo, não na forja. Os sete NPCs da história (Heloísa, Íris e os demais) continuam com os modelos anteriores, e o próximo passo natural é passá-los pela forja.

## Como rodar

Requisitos: Python 3.13 com o pacote `bpy` 5.3, a extensão MPFB2 instalada no perfil do Blender com os assets de sistema do MakeHuman, a base CMU em BVH (variável `CMU_MOCAP_DIR`), Node com `@gltf-transform/cli` global. Um personagem: `python3 tools/chars/build.py tools/chars/elenco.json saida.glb npc_03_vigia`. O elenco: `tools/chars/lote.sh`. Conferência visual: `node tools/chars/shot.mjs saida.png "m=models/personagens/ps2/npc_03_vigia.glb&luz=neutra"` com o `npm run dev` no ar (página `prancha.html`).
