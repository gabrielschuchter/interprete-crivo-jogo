# Capítulo 1 · A estrada

Implementação do capítulo 1 da bíblia `HISTORIA_NOVA_v3.md` (O Menino da Janela), aprovada pelo Gabriel em 17/11/2026 junto com a parte 1 do redesenho. O capítulo começa onde a abertura termina, com o protagonista descendo da carroça na Estrada da Serra, e substitui a conversa de chegada antiga (`Story.opening`, que ficou no código sem chamada).

## O que se joga

O controle volta na estrada com Caio nas costas. Com carga o corpo anda a 1,55 m/s e não corre, não pula, não esquiva nem golpeia; a espada e a tocha somem e os braços seguram as pernas do menino (`Player.carregar`, poses `CARREGA` e `NAS_COSTAS` em `src/entities/player.ts`). Marta anda do lado esquerdo, um passo atrás (`Npc.goal`), e fala em legendas soltas a cada trecho da subida: são romeiros de Vau do Ribeiro e vieram por causa do Menino da Janela, sem saber com quem falam. Caio conta os passos. O oratório de beira de estrada guarda a gravura e pode ser examinado. O botão e a habilidade do Crivo ficam escondidos no capítulo inteiro, porque o Crivo só entra na Sala Nove, no capítulo 3 da bíblia (`Game.semCrivo`).

Perto do muro de Pedra Alta a cena do portão começa na própria estrada. O protagonista põe o menino sentado para tirar a carta; o guarda lê "Avelar" e abre a porta dos professores; Marta tira a gravura do bolso, compara e se ajoelha no meio da rua ("Deus me mandou você na estrada."); as mãos do protagonista ficam sem lugar, e Caio pede que a mãe levante. A cena seguinte é a enfermaria da Academia: Caio na cama sete, dezenove dias de febre contados por ele, e Celeste mandando o calouro sair do caminho.

O pátio da Academia é o Átrio com a bandeira `cap1_academia`: fim de tarde, cinco estudantes, a estátua de Mestra Iolanda Ferro (duas bacias, velas, bilhetes, a placa coberta de cera, verbete no códice) e as portas do refeitório e do dormitório no beco do sul. Os portais da campanha antiga, o quadro e o portão sul saem nesse estado. Cada grupo de estudantes conversa quando o protagonista chega a 11 m e se cala a 4,5 m ("É ele.", "Fala baixo."). O refeitório é uma cena opcional com a gravura na parede e a cozinheira que não cobra. A aula inaugural é a missão: o Reitor Varga chama Avelar ao estrado e o jogador escolhe entre três falas, todas dizendo que a mãe o curou (a escolhida fica em `capitulo1.vars.fala`, de 1 a 3, para o capítulo 12). O anfiteatro aplaude, e um homem de casaco gasto na última fila não aplaude e sai pela porta do alto. O dormitório fecha o capítulo: a mala, o pote embrulhado no fundo, o bilhete "Pra você nunca precisar. Coma direito." O pote de unguento entra no inventário como item de missão.

## Concordância

Todo o texto do capítulo concorda com o corpo escolhido na criação (`txt()` em `src/cap1.ts`): ele ou ela, dele ou dela, calouro ou caloura, o Menino ou a Menina da Janela. Sem corpo escolhido (registro antigo), vale o masculino da bíblia.

## Estado e registro

A missão `capitulo1` tem três passos: levar o menino ao portão (estrada), ir à aula inaugural e desfazer a mala (Átrio). Bandeiras: `cap1_academia` (depois da enfermaria; muda o Átrio), `cap1_refeitorio`, `cap1_aula` e `cap1_fim` (devolve o Átrio de sempre). As variáveis da missão guardam a próxima fala da estrada (`b`), o disparo do portão (`portao`), as falas do pátio (`l_*`, `q_*`) e a fala escolhida na aula (`fala`). O registro segue na versão 4; continuar um registro gravado na estrada remonta Caio nas costas e Marta ao lado (`Cap1.aoEntrar`).

## Ponte provisória

Depois do dormitório, enquanto os capítulos 2 em diante não existem, o jogo entra no Átrio de noite, com chuva, e o Crivo aparece mudo, olhando as mãos, o bolso e os sapatos do protagonista e nunca o rosto (plantio do capítulo 3). Daí em diante a campanha antiga segue a partir da missão `chegada`, com Heloísa.

## Arquivos

`src/cap1.ts` concentra roteiro, falas, cenas e lógica por quadro; `src/story.ts` só delega (`cap1Comeco`, `cap1Cena`, `tick`, conversas, exames e `onEnterRegion`). A estrada é `src/world/estrada.ts`; o pátio do capítulo está em `src/world/atrio.ts`. Os cenários das cenas (enfermaria da Academia, refeitório, anfiteatro e dormitório) estão em `src/cine/cenarios.ts`, e `Game.cena` roda cenas curtas no meio do jogo com o mesmo sistema da abertura, com pausa e "Pular a cena". A escolha dentro de cena é `Cine.escolha`. O aplauso é síntese (`Som.aplauso`).

## Testes

`T.capitulo1(escolha)` em `tests/e2e/page-helpers.js` joga o capítulo como uma pessoa: anda com Shift apertado (e confere que não corre), confere Marta perto e falando, vai ao portão, examina a estátua, entra no refeitório, escolhe a fala na aula e desfaz a mala. `npm run e2e` confere cada passo antes da campanha antiga; dificuldade, elenco e toque passam pelo capítulo antes do Pátio de sempre, e a abertura confere a entrega na estrada com o menino nas costas. No modo `?teste` as cenas correm em avanço rápido; com `?teste&cenas` correm no tempo real.

## Pendências

Celeste, a enfermeira-chefe do capítulo, divide o nome com uma moradora do Observatório da campanha antiga; uma das duas precisa mudar quando a campanha antiga sair. Caio, Marta, Celeste, o Reitor e o homem do casaco gasto usam modelos de moradores com tinta e escala, como na abertura; receitas próprias na forja de personagens tiram o capítulo do provisório. Os estudantes sentados do refeitório e do anfiteatro são figuras de primitivas, de propósito baratas para encher salas; de perto, a câmera evita. As capturas foram feitas com render por software, a poucos quadros por segundo; a taxa real precisa ser medida no computador do Gabriel.
