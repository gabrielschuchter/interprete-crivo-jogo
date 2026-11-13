# Dificuldade

Este documento descreve os três níveis de dificuldade (História, Padrão e Rigor), o que cada número muda, como a escolha fica no registro e como o equilíbrio foi medido. O pedido do Gabriel, em 13/11/2026, foi que o jogo base seja difícil e peça esforço para evoluir e passar das seções, e que zerar seja possível para quem explorou missões paralelas, equipamentos e pontos de evolução. O código está em `src/domain/difficulty.ts` (a tabela e as funções de ajuste, sem Three.js nem DOM), `src/domain/state.ts` (registro, atributos, dano recebido), `src/entities/enemy.ts` (criaturas), `src/entities/player.ts` (janelas de desvio e esquiva) e `src/game.ts` (economia, cura, derrota, troca de nível).

## Os três níveis

O Padrão é o jogo pensado para ser difícil, e é o que a pessoa recebe se não escolher nada. História existe para quem quer ler o mundo sem tropeçar nos encontros. Rigor é o Padrão com pouca margem de erro e pouco que sobra, para quem já domina a esgrima. Todos os valores são multiplicadores sobre os números de antes dos níveis (um multiplicador 1 reproduz o jogo anterior).

| Eixo | História | Padrão | Rigor |
|---|---|---|---|
| Vida das criaturas comuns | 0,80 | 1,20 | 1,45 |
| Vida de chefes e mini-chefes | 0,80 | 1,30 | 1,70 |
| Dano recebido, depois da defesa | 0,50 | 1,35 | 1,70 |
| Velocidade de perseguição | 0,92 | 1,06 | 1,12 |
| Tempo de aviso antes do golpe | 1,25 | 0,88 | 0,78 |
| Recuperação depois do golpe | 1,15 | 0,85 | 0,70 |
| Alcance da percepção | 0,85 | 1,15 | 1,30 |
| Intervalo entre sopros, anéis e recitações | 1,25 | 0,85 | 0,70 |
| Vida em que o mini-chefe muda de fase | 40% | 55% | 65% |
| Janela do golpe resoluto (desvio) | 1,40 | 0,85 | 0,70 |
| Janela da esquiva perfeita | 1,35 | 0,85 | 0,70 |
| Recuperação de vigor | 1,15 | 0,92 | 0,85 |
| Experiência recebida | 1,25 | 0,90 | 0,80 |
| Moedas recebidas | 1,25 | 0,80 | 0,65 |
| Chance de peça cair de criatura comum | 1,40 | 0,85 | 0,70 |
| Preço na banca | 0,85 | 1,20 | 1,40 |
| Cura de caldo e limão | 1,30 | 0,90 | 0,80 |
| Moedas deixadas na Névoa ao cair | 0% | 10% | 25% |

Em valores absolutos, a janela do golpe resoluto vai de 0,28 s (História) a 0,17 s (Padrão) e 0,14 s (Rigor), e a da esquiva perfeita de 0,30 s a 0,19 s e 0,15 s. O aviso de uma criatura nunca cai abaixo de 0,3 s, porque abaixo disso a leitura vira sorte. Peças de chefe (a que cada chefe entrega na primeira vez) continuam garantidas em qualquer nível: a dificuldade mexe na sorte das criaturas comuns, não no que a história promete.

A intenção de cada eixo é a seguinte. Vida, dano e velocidade sobem o custo de errar. Aviso, recuperação e intervalos tiram brechas e tempo de leitura, e fazem os chefes fecharem a luta mais cedo (fase 2 entra com mais vida). As janelas de desvio e esquiva perfeita encolhem junto, de modo que a mecânica mais recompensadora também fica mais exigente. A economia aperta de quatro lados (experiência, moedas, peças, preços) para que equipamento e pontos de habilidade custem exploração de verdade, e a derrota cobra uma fração das moedas para que o recuo para curar-se tenha preço. A cura menor torna cada caldo uma decisão.

## Onde a pessoa escolhe

Na criação de personagem há três botões de dificuldade com uma linha de descrição, e o Padrão vem marcado. A escolha vale para aquela partida e vira a preferência das próximas. Em Configurações, o seletor "Dificuldade desta partida" (ou "das novas partidas", se aberto pelo título) troca o nível da partida em curso e a preferência; a nota ao lado do seletor descreve o que o nível muda. A pausa mostra o nível em vigor. Tudo isso funciona por toque (botões de pelo menos 46 px de altura na criação, seletor nativo em Configurações) e a criação foi conferida em captura a 390x844 e 1280x720.

A troca no meio da partida vale a partir dos próximos encontros: dano recebido, janelas, economia e cura mudam na hora, mas as criaturas que já estão na cena mantêm vida, velocidade e avisos até a região recarregar ou a pessoa descansar num braseiro. Um aviso na tela diz isso. Não há bloqueio contra baixar o nível: a campanha é do jogador, e a dificuldade é uma escolha de experiência, não de mérito.

## Registro

A dificuldade vive em `GameState.difficulty`, e a versão do registro passou de 2 para 3. Registros anteriores não têm o campo: ao carregar, recebem a preferência que a pessoa tinha em Configurações (que antes era "Padrão" ou "História"), e uma notificação avisa que o registro é anterior aos níveis e qual nível passou a valer. Isso preserva "História" para quem jogava assim e põe o resto no Padrão novo, que é mais difícil que o antigo; a troca fica a dois toques em Configurações. Valores inválidos (registro editado ou de versão futura) caem no Padrão. `Settings.difficulty` aceita os três valores, e o antigo "padrao" continua valendo e passa a significar o Padrão novo.

## Como o equilíbrio foi medido

Há duas medidas, e nenhuma delas substitui jogo humano.

A primeira é a tabela analítica de `tests/unit/balance.test.ts` (`BALANCE=1 npx vitest run tests/unit/balance.test.ts` a imprime). Para cada encontro da campanha, calcula quantos golpes médios o jogador precisa para vencer e quantos golpes da criatura aguenta, em dois retratos: "direto" (arma inicial, sem traje, sem pontos gastos) e "completo" (pontos nos ramos de encontro, gibão, arma achada). Os níveis de cada retrato vêm das medições abaixo. O teste falha se uma criatura comum precisar de mais de 10 golpes ou se o jogador aguentar menos de 3 golpes dela, se um chefe sair da faixa de 10 a 75 golpes (6 a 75 em História), se quem se preparou não vencer mais depressa e aguentar mais que quem foi direto, se mais dificuldade não custar mais golpes e menos sobrevivência, e se o Padrão não pedir pelo menos 25% mais esforço que a campanha de antes dos níveis em cada chefe. No Padrão, o jogador no nível do encontro aguenta de 5 a 7 golpes de comuns e de 5 a 7 de chefes; o Veredito cai em 31 golpes para quem se preparou e em 44 para quem foi direto (1.144 pontos de vida contra 880 antes).

A segunda é a campanha jogada por um jogador automático em navegador real (`E2E_DIFICULDADE=padrao E2E_PERFIL=completo npm run e2e:dificuldade`, com `npm run dev` no ar). A dificuldade é escolhida clicando no botão da criação. O perfil `completo` faz as missões paralelas (Lia, vento, encomenda, passeio dos mestres, obras), recolhe as peças que caem, gasta os pontos de habilidade nos ramos de encontro, compra na banca o que couber e equipa a melhor arma e o melhor traje antes de cada região e de cada chefe. O perfil `direto` faz só o caminho principal, sem gastar pontos nem moedas. O relatório lista as mortes por luta. `E2E_ESPERA=vence` (padrão do perfil completo) falha se a campanha não for vencida em até 8 derrotas por luta; `mede` só relata. Quem cai volta ao último ponto seguro com dois caldos, como quem passa na banca.

| Nível | Perfil | Resultado | Mortes (luta) |
|---|---|---|---|
| História | completo | vence, nível 9 | 0 |
| História | direto | vence, nível 7 | 0 |
| Padrão | completo | vence, nível 7 | 0 (duas rodadas) |
| Padrão | direto | vence, nível 6 | 3 e 4 (Eco 1, Veredito 2 a 4) |
| Rigor | completo | vence, nível 7 | 3 (Eco 1, Veredito 2), com peças achadas; 8 e sem vitória numa rodada que não recolheu as peças |
| Rigor | direto | trava no Veredito | 10 |

O que a medida mostra: no Padrão, quem se preparou passa sem cair e quem não se preparou cai três ou quatro vezes só no Eco e no Veredito (antes dos níveis, o jogador automático da campanha, que fazia as paralelas mas não se preparava, caía duas vezes no Veredito, no nível 7). No Rigor, quem foi direto não passa, e quem explorou passa com margem curta e dependendo de que as peças achadas ajudem. A diferença entre os perfis é o que o pedido pedia: evoluir, equipar e explorar mudam o resultado.

## Limites

O jogador automático é cru: esquiva sem olhar o tempo certo, não usa o desvio nem o foco, mira com a câmera presa ao inimigo. As mortes servem para comparar níveis e perfis entre si, não como previsão do que uma pessoa sente; uma pessoa que domina desvio e esquiva perfeita sofre bem menos que o bot, e uma pessoa que ignora os avisos sofre mais. Nenhuma pessoa jogou a campanha nos três níveis. O sorteio de peças usa `Math.random`, então as rodadas variam: o teste de Rigor tem folga de 8 derrotas por luta justamente por isso. A calibragem do Rigor em especial precisa de jogo humano, e os números da tabela estão no topo do arquivo para serem mexidos sem tocar em mais nada: `src/domain/difficulty.ts` é o único lugar com os valores.

Também não há ainda um nível "sem derrota" ou escolha por criatura. O Veredito continua com 880 pontos de vida-base; os 1.144 do Padrão e os 1.496 do Rigor vêm do multiplicador.

## Como mexer

Para ajustar um número, edite o campo em `DIFFICULTIES` (`src/domain/difficulty.ts`) e rode `npm run test` (a tabela de equilíbrio e os testes de ordem falham se um nível sair do lugar). Para checar a campanha, rode `npm run e2e:dificuldade` nos níveis afetados e `npm run e2e` (que joga no Padrão, com preparo e recolhimento de peças). Para acrescentar um eixo, ponha o campo em `DifficultyDef`, um valor em cada nível, aplique onde o dado nasce (a criatura em `Enemy`, a economia em `Game`, os atributos em `computeStats`) e acrescente a asserção de ordem em `tests/unit/difficulty.test.ts`.
