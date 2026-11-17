# Carga, menu principal e registros

Implementação das seções 1 e 2 do `REDESENHO_PARTE_1.md` (17/11/2026), com as recomendações das cinco decisões abertas aprovadas pelo Gabriel. A abertura (seção 3) é outra frente e entra pelo gancho descrito no fim.

## Fluxo

A página abre numa tela preta com o brasão de 56 px e uma linha de 160 px por 1 px que anda em degraus de 8 px. A brasa do canto do brasão alterna em dois estados (parada com Reduzir movimento). Não há porcentagem, dica nem texto, salvo duas exceções: "Preparando" depois de 10 s, e "Um arquivo não chegou" com o botão Tentar de novo se a carga lançar erro. A tela fica no mínimo 400 ms, contra o piscar. Quando termina, o menu aparece direto: a tela "Pressione qualquer tecla" saiu, e a música do menu começa no primeiro gesto (o navegador só libera som depois dele).

O menu é fundo preto puro, sem cena 3D (o canvas fica escondido com `body.palco-preto` e o laço não desenha). No alto, o brasão grande (28% da altura, de 140 a 240 px; 112 px no celular em pé), que chega da tela de carga crescendo em quatro degraus; embaixo, "Interprete." em UnifrakturCook. Três botões em coluna de 360 px (90% da tela no celular), 52 px de altura, 12 px de intervalo: Novo jogo, Continuar jogo, Configurações. Foco e passagem do mouse acendem o filete em ouro-3 e um losango de brasa de cada lado, sem transição suave. Continuar sem registro fica na tela, apagado, fora da ordem de foco, com "Nenhum registro neste navegador"; com registro, mostra nome, nível e tempo do mais recente e recebe o foco inicial. O rodapé traz a versão e o aviso de simulação fictícia. O subtítulo antigo ("O Crivo e a Névoa das Conclusões") saiu.

Esc no menu não faz nada. Setas, Tab, direcional e analógico percorrem a coluna; Enter, Espaço, A ou toque confirmam.

## Três espaços de registro

`src/core/registros.ts`. O espaço 1 usa a chave de sempre (`interprete-rpg-registro-v1`), então quem já jogava continua sem migração; os espaços 2 e 3 usam `-espaco2` e `-espaco3`. Cada espaço guarda a gravação anterior (`-anterior`) e, se a atual estiver ilegível, a guarda à parte (`-ilegivel`) e volta para a anterior. O formato do registro não mudou (versão 4): "o mais recente" sai do `savedAt` que `serialize` já gravava.

Continuar leva ao mais recente em um clique. Novo jogo vai direto à criação se houver espaço livre; com os três ocupados, pergunta qual substituir, e o registro só é substituído quando o nome do novo personagem é confirmado (a gravação anterior fica como cópia). Abaixo da coluna, "Registros (n)" abre a lista dos três espaços com Carregar, Baixar cópia, Importar e Apagar (com confirmação). Sem registro nenhum, o mesmo lugar diz "Importar registro". Baixar e importar saíram da coluna principal.

O plano previa mostrar os registros da versão 4 como "versão anterior", só para baixar, quando a história nova entrar com o registro 5. Isso não foi feito: a campanha atual ainda é a da versão 4, e esconder o Continuar agora apagaria o jogo de quem está jogando.

## Carga em camadas e compilação única

Três camadas, só a primeira segura a tela:

1. Tela de carga: efeitos sonoros curtos, o corpo da criação e o do registro mais recente, e o catálogo de figuras (protagonista e Crivo) compilado com o ambiente da região de destino. 1,8 MB em cerca de 40 pedidos.
2. Com o menu na tela (`Game.prepare`): os props e a região do registro mais recente (ou o Pátio, onde ficam a criação e o começo do jogo), os corpos de quem mora e ronda a região, e todos os programas de shader deles, mais um quadro escondido com o protagonista no lugar em que vai aparecer, que compila também as sombras. Se o jogador clicar antes, o botão mostra a mesma linha de progresso embaixo do rótulo e a ação segue sozinha.
3. Ainda no menu ou na criação (`Game.warmOthers`): as outras três regiões são montadas fora da cena, com moradores, criaturas e peças, e compiladas contra as luzes da cena. A geometria é descartada; os programas ficam. Para assim que o jogo começa. Celular com 4 GB ou menos (ou sem a informação, como no iPhone) não faz esta camada.

A causa de quase toda a recompilação antiga era a conta de luzes: o three.js gera um programa por número de luzes, e o protagonista leva duas (tocha e lanterna) além das seis lâmpadas fixas do motor. A cena era compilada sem ele (seis luzes) e recompilada inteira quando ele entrava (oito). Agora toda compilação sem protagonista na cena usa um substituto fora da vista (`Game.compileLit`), inclusive o primeiro quadro de cada troca de região, e o que começa escondido (vidros de prop, peças que dependem de marca) é mostrado só durante a compilação.

O plano falava num catálogo fechado de materiais com teste que proíbe material novo por região. Não foi preciso nesta etapa: aquecer as quatro regiões reais cobre o mesmo objetivo com menos risco. Se as regiões novas da história crescerem muito, o catálogo volta à mesa.

## Medidas

Chromium sem placa de vídeo (SwiftShader), build de produção com `vite preview`, `node tools/perf/carga-menu.mjs` (e `CELULAR=1` para Pixel 7). Bytes e programas valem para qualquer máquina; tempos de parede só comparam versões, e as duas medições abaixo rodaram ao mesmo tempo no mesmo contêiner, o que infla os tempos.

| Medida | Antes (main 8994d4c) | Depois |
|---|---|---|
| Download até o menu | 15,5 MB, 90 pedidos | 1,8 MB, 42 pedidos |
| Tempo até o menu, primeira visita | 5,5 s | 1,7 a 2,5 s |
| Tempo até o menu, com cache | não medido | 0,8 s |
| Programas de shader do jogo inteiro | 84 ao entrar no Pátio | cerca de 56 nas quatro regiões |
| Programas novos ao entrar no jogo pelo Novo jogo | 12 (72 para 84) | 0 |
| Programas novos por troca de região, depois do aquecimento | não medido | 0 a 3 (só programas de sombra) |
| Novo jogo, do botão Entrar até jogar | 19,6 a 21 s | 1,1 a 5,1 s |
| Criação, do clique em Novo jogo até a tela | 0,4 s (primeiro quadro, Pátio já montado atrás do menu) | 0,25 a 0,33 s (Pátio montado em segundo plano) |

No celular emulado: menu em 2,4 s, Novo jogo em 1,1 s, 41 programas (qualidade baixa, sem sombra).

O que falta medir: placa de vídeo real e rede limitada (`REDE=20`). Os números de GPU só saem do computador do Gabriel.

## Gancho da abertura

`Game.iniciarCampanha()` é a rota da nova campanha. `startNew` cria o registro no espaço escolhido, grava, fecha o véu preto e chama `iniciarCampanha`, que:

1. chama `await Story.abertura(g)` em `src/story.ts`, com `g.state` criado e gravado, o modo em `'transition'`, o véu fechado e nenhuma figura na cena. A abertura pode usar câmera, cena, áudio e interface enquanto roda. Hoje é um stub que devolve na hora;
2. lê o retorno opcional `FimDaAbertura` (`regiao`, `spawn`, `conversa`): sem nada, o jogo começa no Pátio, em `'inicio'`, com a conversa de chegada (`Story.opening`);
3. monta a região pedida (ou reaproveita a que o menu deixou pronta), põe o jogador, compila o que faltar, abre o véu.

Se a abertura lançar erro, o jogo registra em `g.errors` e segue para o Pátio. `Story.prepararAbertura(g)` é chamado em segundo plano com o menu na tela quando não há registro, depois que o Pátio ficou pronto: é o lugar para baixar e compilar o primeiro bloco da cena. Nos testes (`g.ui.instant`) a abertura deve resolver na hora.
