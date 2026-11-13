# Movimento: como o elenco se mexe

Este documento descreve a camada de movimento que roda por cima dos clipes de captura do elenco (protagonistas, moradores e inimigos) e como medir e capturar o resultado com a câmera real de jogo. Vale para quem for mexer em `src/entities/`. A regra geral da direção de arte se aplica aqui: pose forte, movimento econômico e quietude. Nenhum gesto existe para preencher tempo.

## Arquitetura

Cada figura do elenco tem duas camadas de clipe misturadas pelo `AnimationMixer` com pesos normalizados à mão (locomoção e ação somam 1) e, depois do mixer, uma camada procedural em espaço de personagem. Antes do mixer, todos os ossos voltam à pose de repouso, para que a camada procedural nunca acumule de um quadro para outro. Isso exige `forceMixerWrite` (`src/entities/motion.ts`): o mixer do three.js só escreve num osso quando o valor calculado muda, e as trilhas constantes dos clipes de captura (a junta do quadril, por exemplo) ficavam presas no repouso, o que abria as pernas no idle. Qualquer código novo que zere ossos antes do mixer precisa chamar essa função.

Os módulos são quatro. `motion.ts` traz as ferramentas: `Rig` (rotação de osso em espaço de personagem, mira de membro, fechamento da mão, alinhamento do punho ao eixo de um objeto), `Pose` e `applyPose` (pose descrita por direções de membro, onde +X é a esquerda do personagem, +Y é cima e +Z é frente), molas para trancos, `Gaze` (olhar com pausas, como sacadas) e `Face` (morfos de rosto da forja). `personas.ts` dá a cada morador uma postura, braços de repouso, um ofício de espera, um estilo de gesto na fala, uma pose de escuta, uma expressão de base e quais mãos fecham sobre o que a forja pôs nelas. `gestos.ts` desenha as interações do protagonista (pegar, examinar, puxar, abrir, empurrar, alcançar) com antecipação, contato e volta. `estilos.ts` dá a cada inimigo do elenco a pose de antecipação, a de contato, a de recuperação e o instante do contato dentro do golpe.

## Protagonista

A locomoção mede a passada natural de cada clipe pelo pé de apoio (`measureGait`) e ajusta a velocidade do clipe para que o pé no chão ande à mesma velocidade do corpo. Andar e correr se misturam por velocidade, com a corrida entrando na mesma fase da passada que já está em curso. O deslize medido do pé de apoio caiu de cerca de 3,6 m/s para algo entre 0,5 e 0,6 m/s de mediana (ferramenta em `tools/movimento/medir.mjs`). O corpo inclina nas curvas e no arranque, os joelhos cedem no pouso e o tronco cede para longe de onde veio o golpe recebido.

A mão direita fecha no punho da espada e a esquerda na haste da tocha, com o punho girado para que a linha dos nós siga o eixo do objeto. Nas interações a arma vai para a bainha no quadril e a mão livre fecha no instante do contato com o objeto. O braço da tocha abre o suficiente para a chama não atravessar o corpo.

Os golpes do protagonista com a espada (sequência de leves, firme com foco, desvio, esquiva perfeita, golpe em queda) são poses-chave da camada de esgrima, descritas em `docs/game/COMBATE.md`. `Rig.aim` com peso parcial não fazia nada até 13/11/2026 (ver o mesmo documento); poses de persona e de inimigo aplicadas com peso menor que 1 passaram a aparecer.

## Moradores

Cada um tem postura de ofício (o arquivista lê, a acendedora ergue o lampião, a vigia segura a alabarda, o noviço reza), alterna a espera com uma ação própria de tempos em tempos, vira primeiro os olhos e a cabeça e só depois o corpo, fala com o gesto do seu estilo e mexe a boca só enquanto a interface escreve a fala. Quem escuta faz uma pose de escuta e assente no fim das frases. As sobrancelhas sobem na fala e na dúvida; o sorriso aparece no aceno.

## Inimigos e chefes

O golpe tem três tempos. A antecipação sobe até 78% do aviso e segura com um tremor de tensão até o golpe sair. O golpe acelera até a pose de contato, e o dano sai no quadro em que a pose chega ao contato (`impact` no estilo), não no início do estado. A recuperação deixa o peso seguir o golpe e devolve o corpo à guarda. O martelo do Eco desce sobre a cabeça e sacode a câmera no contato; o gancho do Carcereiro varre de lado e puxa de volta; o florete do Duelista estoca. Ao receber golpe, o tronco cede para longe do jogador: o comum cede muito, o chefe cede pouco e o golpe firme dobra o tranco. Na metade da vida, os mini-chefes entram num urro de 1,3 s antes da segunda fase (a fase muda no mesmo quadro; o urro só torna a mudança legível). A Matriarca paira a meio metro do chão, com as pernas soltas sob o véu, e só toca o chão ao morrer.

## Objetos, câmera e interface

A tampa do baú abre com atraso de 0,45 s, tempo da mão chegar à tampa. A grade do bosque treme antes de girar na dobradiça; a grade da arena do observatório sobe em três puxões de corrente. As alavancas do Arquivo descem quando a mão puxa, e as erradas voltam com um tranco. Na conversa, a câmera vai para trás do ombro do protagonista e enquadra o rosto de quem fala; nas descobertas (baú, folha, item, exame), aproxima e desce o olhar até o que foi achado. O tremor de câmera usa ruído contínuo com amplitude por trauma e uma leve rotação, e o movimento reduzido desliga tremor, rotação e as animações da interface. No inventário, o ícone selecionado sobe e assenta em degraus, e o painel de detalhe entra como folha virada.

## Como capturar e medir

Com `npm run build` e `npx vite preview --port 4173` no ar, `node tools/movimento/banco.mjs [cena ...]` grava tiras de quadros com a câmera de jogo em `docs/game/capturas/movimento/<cena>_<rótulo>.jpg` (rótulo pela variável `ROTULO`, padrão "depois"). As cenas são `maos`, `locomocao`, `golpes`, `conversa`, `moradores`, `inimigo_<tipo>` e `sonda` (pés e quadril do jogador parado, em texto). `node tools/movimento/medir.mjs` mede o deslize dos pés.
