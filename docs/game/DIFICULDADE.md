# Dificuldade

Este documento descreve os quatro níveis (História, Fácil, Médio e Difícil), o que cada número muda, os números por inimigo, como a escolha fica no registro e como o equilíbrio foi medido. O pedido original do Gabriel (13/11/2026) foi que o jogo base seja difícil e peça esforço; em 14/11/2026 ele relatou que chefes e mini-chefes estavam no ponto no nível mais difícil, mas os mobs básicos estavam fáceis, e pediu quatro níveis com números condizentes em todos os inimigos. O código está em `src/domain/difficulty.ts` (a tabela e as funções de ajuste, sem Three.js nem DOM), `src/domain/state.ts` (registro, atributos, dano recebido), `src/entities/enemy.ts` (criaturas e golpes emendados), `src/entities/player.ts` (janelas de desvio e esquiva) e `src/game.ts` (economia, cura, derrota, grupos maiores, troca de nível).

## Os quatro níveis

O Médio é o jogo difícil de antes dos quatro níveis (os números são os do antigo Padrão) e vem marcado ao criar o personagem; é o que a pessoa recebe se não escolher nada. O Difícil parte do antigo Rigor e acrescenta o que faltava aos comuns. História existe para ler o mundo sem tropeçar nos encontros, e Fácil é um meio-termo que perdoa erros sem trivializar. Os valores são multiplicadores sobre os números-base de `ENEMY_CFG`, de `computeStats` e da economia.

A causa do problema relatado era estrutural: um único multiplicador de vida para chefes e outro, menor, para comuns, e o jogador cresce em dano e vida por nível enquanto a vida de um comum não cresce. No fim da campanha um Fiapo caía em dois golpes mesmo no nível mais alto. Por isso os inimigos agora têm três classes com números próprios (comuns, mini-chefes, chefes) e os comuns ganharam três eixos que não dependem de vida: dano próprio, golpe emendado e grupos maiores.

| Eixo | História | Fácil | Médio | Difícil |
|---|---|---|---|---|
| Vida dos comuns | 0,80 | 1,00 | 1,20 | 1,70 |
| Vida dos mini-chefes | 0,80 | 1,00 | 1,30 | 1,70 |
| Vida dos chefes | 0,80 | 1,00 | 1,30 | 1,70 |
| Dano recebido, de qualquer criatura | 0,50 | 0,80 | 1,35 | 1,70 |
| Dano extra só dos comuns | 1,00 | 1,00 | 1,00 | 1,20 |
| Chance de o comum emendar um segundo golpe | 0% | 0% | 15% | 50% |
| Comuns que nascem com companheira | 0% | 0% | 0% | 50% (uma a cada duas) |
| Velocidade de perseguição | 0,92 | 1,00 | 1,06 | 1,12 |
| Tempo de aviso antes do golpe | 1,25 | 1,08 | 0,88 | 0,78 |
| Recuperação depois do golpe | 1,15 | 1,00 | 0,85 | 0,70 |
| Alcance da percepção | 0,85 | 1,00 | 1,15 | 1,30 |
| Intervalo entre sopros, anéis e recitações | 1,25 | 1,00 | 0,85 | 0,70 |
| Vida em que o mini-chefe muda de fase | 40% | 50% | 55% | 65% |
| Janela do golpe resoluto (desvio) | 1,40 | 1,15 | 0,85 | 0,70 |
| Janela da esquiva perfeita | 1,35 | 1,15 | 0,85 | 0,70 |
| Recuperação de vigor | 1,15 | 1,05 | 0,92 | 0,85 |
| Experiência recebida | 1,25 | 1,10 | 0,90 | 0,80 |
| Moedas recebidas | 1,25 | 1,10 | 0,80 | 0,65 |
| Chance de peça cair de comum | 1,40 | 1,15 | 0,85 | 0,70 |
| Preço na banca | 0,85 | 1,00 | 1,20 | 1,40 |
| Cura de caldo e limão | 1,30 | 1,10 | 0,90 | 0,80 |
| Moedas deixadas na Névoa ao cair | 0% | 5% | 10% | 25% |

O golpe emendado de um comum é uma segunda investida com aviso curto (60% do aviso normal, nunca menos de 0,32 s), só se o jogador ainda estiver ao alcance; o desvio e o contracorte cancelam o encadeamento. Os grupos maiores valem para as criaturas que nascem pelo mapa (os grupos de cada região, inclusive os dos focos do epílogo); reforços invocados por chefes e por missões não são duplicados. O aviso de uma criatura nunca cai abaixo de 0,3 s. As peças que cada chefe entrega na primeira vez continuam garantidas em qualquer nível.

## Números por inimigo

Cada célula mostra vida, dano de um golpe antes da defesa do jogador (já com o fator de dano do nível e, nos comuns, o dano extra) e aviso em segundos. Os mini-chefes entram na segunda fase com aviso 20% mais curto e golpe 15% mais forte, e o Veredito recita a sentença abaixo de 36% de vida, independentemente do nível.

| Inimigo | Classe | História | Fácil | Médio | Difícil |
|---|---|---|---|---|---|
| Fiapo da Névoa | comum | 37 / 6 / 0.78 | 46 / 10 / 0.67 | 55 / 16 / 0.55 | 78 / 24 / 0.48 |
| Vulto | comum | 77 / 8 / 1.00 | 96 / 13 / 0.86 | 115 / 22 / 0.70 | 163 / 33 / 0.62 |
| Erudito Oco | comum | 56 / 6 / 0.69 | 70 / 10 / 0.59 | 84 / 18 / 0.48 | 119 / 27 / 0.43 |
| Errante do Gelo | comum | 96 / 10 / 1.19 | 120 / 16 / 1.03 | 144 / 27 / 0.84 | 204 / 41 / 0.74 |
| Suplicante Encapuzado | comum | 48 / 6 / 0.53 | 60 / 9 / 0.45 | 72 / 15 / 0.37 | 102 / 22 / 0.33 |
| Duelista das Cinzas | mini-chefe | 240 / 8 / 0.62 | 300 / 12 / 0.54 | 390 / 20 / 0.44 | 510 / 26 / 0.39 |
| Carcereiro dos Trilhos | mini-chefe | 336 / 12 / 1.25 | 420 / 18 / 1.08 | 546 / 31 / 0.88 | 714 / 39 / 0.78 |
| Matriarca do Coro Velado | mini-chefe | 224 / 7 / 1.00 | 280 / 11 / 0.86 | 364 / 19 / 0.70 | 476 / 24 / 0.62 |
| O Eco | chefe | 272 / 9 / 0.88 | 340 / 14 / 0.76 | 442 / 24 / 0.62 | 578 / 31 / 0.55 |
| O Veredito | chefe | 704 / 10 / 1.06 | 880 / 16 / 0.92 | 1144 / 27 / 0.75 | 1496 / 34 / 0.66 |

## Onde a pessoa escolhe

Na criação de personagem há quatro botões de dificuldade com uma linha de descrição, e o Médio vem marcado. Em Configurações, o seletor "Dificuldade desta partida" (ou "das novas partidas", se aberto pelo título) tem as quatro opções e troca o nível da partida em curso e a preferência; a nota ao lado descreve o que o nível muda. A pausa mostra o nível em vigor. A troca no meio da partida vale a partir dos próximos encontros: dano recebido, janelas, economia e cura mudam na hora, mas as criaturas que já estão na cena mantêm vida, velocidade e avisos até a região recarregar. Um aviso na tela diz isso.

## Registro e migração

A dificuldade vive em `GameState.difficulty`, e a versão do registro passou de 3 para 4. Os ids antigos são traduzidos por `normalizeDifficulty`: `padrao` vira `medio`, `rigor` vira `dificil` e `historia` continua. O mesmo vale para a preferência em `Settings.difficulty`. Registros anteriores à versão 3, sem o campo, recebem a preferência de Configurações (traduzida) e o Médio na falta dela. Ao continuar um registro com id antigo, uma notificação avisa da troca de nome e de que o Difícil ficou mais duro com os comuns. Valores inválidos caem no Médio. Junto, foi corrigido um defeito de leitura: o dano recebido usava a preferência de Configurações em vez do nível do registro; agora usa o da partida.

## Como o equilíbrio foi medido

A primeira medida é a tabela analítica de `tests/unit/balance.test.ts` (`BALANCE=1 npx vitest run tests/unit/balance.test.ts` a imprime): para cada encontro, golpes para vencer e golpes que o jogador aguenta, nos retratos direto (arma inicial, sem pontos) e completo (pontos, gibão, arma achada), em todos os quatro níveis e em todos os tipos, inclusive os três mini-chefes e os três comuns do epílogo. Os testes exigem que mais dificuldade custe mais golpes e aguente menos, que quem se preparou se saia melhor, que comuns caiam em até 10 golpes e deixem o jogador aguentar ao menos 3 (2,5 no Difícil), que mini-chefes e chefes fiquem entre 8 e 75 golpes, e que o Difícil cobre dos comuns pelo menos 1,6 vez o dano por ataque do Médio.

A segunda é a campanha jogada por um jogador automático em navegador real (`E2E_DIFICULDADE=dificil E2E_PERFIL=completo npm run e2e:dificuldade`, com `npm run dev` no ar). O perfil `completo` faz as paralelas, recolhe peças, gasta pontos, compra e equipa; o `direto` faz só o caminho principal. O relatório agora lista as mortes por tipo de inimigo (`__game.lastFoe`). Resultados de 14/11/2026, derrotas por luta:

| Nível | Perfil | Resultado | Mortes (por tipo) |
|---|---|---|---|
| História | completo | vence, nível 9 | 0 |
| História | direto | vence, nível 7 | 0 |
| Fácil | completo | vence, nível 8 | 0 |
| Fácil | direto | vence, nível 7 | 0 |
| Médio | completo | vence, nível 8 | 0 |
| Médio | direto | vence, nível 6 (outra rodada travou no Veredito) | 4 (Veredito 3, Fiapo 1) |
| Difícil | completo | vence, nível 7 | 1 (Eco) |
| Difícil | direto | trava no Veredito, nível 5 | 13 (Eco 5, Veredito 8) |

## Limites

O jogador automático é cru: esquiva sem olhar o tempo certo, não usa desvio nem foco. Ele ainda não morre para comuns no Difícil (as lutas de comuns ficaram em 0 mortes), porque comuns, mesmo agressivos, caem em poucos golpes de um jogador que fica de frente; o que o teste mostra é que o nível é vencível por quem se prepara e que quem não se prepara não passa dos chefes. A pressão sobre os comuns (dano 1,7 vezes 1,2, 50% de golpes emendados, metade deles em dupla, menos 22% de aviso) está calibrada pela tabela analítica e precisa de jogo humano para ajuste fino; todos os valores estão no topo de `src/domain/difficulty.ts`. O sorteio de peças usa `Math.random`, então as rodadas variam (Médio direto travou no Veredito numa rodada e venceu com 4 mortes em outra).

## Como mexer

Edite o campo em `DIFFICULTIES` (`src/domain/difficulty.ts`) e rode `npm run test`. Para checar a campanha, rode `npm run e2e:dificuldade` nos níveis afetados e `npm run e2e`. Para acrescentar um eixo, ponha o campo em `DifficultyDef`, um valor em cada nível, aplique onde o dado nasce (a criatura em `Enemy`, a economia em `Game`, os atributos em `computeStats`) e acrescente a asserção de ordem em `tests/unit/difficulty.test.ts`.
