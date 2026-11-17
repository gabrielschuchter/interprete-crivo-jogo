# Abertura do Novo jogo

A abertura é a cena de onze a treze minutos que vem entre a criação de personagem e o primeiro passo no jogo. Ela segue a lista de planos da seção 3.3 de `redesenho/REDESENHO_PARTE_1.md` (pasta do projeto) e a bíblia `narrativa/HISTORIA_NOVA_v3.md`, com as cinco decisões do Gabriel tomadas pela recomendação do plano: criação antes da abertura, os dois corpos com concordância, a versão completa do que a abertura revela (nove potes, a cama treze perdendo cor, o rapaz sem rosto anotando, a folha na estante, a mão do velho na porta) e o trecho jogável da janela.

São três blocos separados por pretos. O bloco 1, "A febre", vai da chuva em Remanso às sete noites de Helena na enfermaria. O bloco 2, "A janela", tem o trecho que o jogador controla (a criança se arrasta até a parede, cai duas vezes, e no terceiro apoio as mãos da mãe a seguram), a janela que abre para a luz, a silhueta com a lanterna, a cama treze desbotando enquanto a vila fala do unguento, a folha lacrada, a visita da noite e a montagem dos quinze anos. O bloco 3, "A partida", vai da mala feita até a freada na serra e o grito de Marta. A cena termina com o protagonista descendo da carroça, o letterbox recolhendo e o título "Estrada da Serra".

Na medição do teste (trecho jogável na velocidade máxima), a abertura inteira dura 11,3 minutos de relógio de cena.

## Como rodar e testar

`npm run dev` e Novo jogo: a abertura roda depois da criação. Para cair direto num plano, `?cena=2.4` (qualquer marca de 1.1 a 3.5) cria um registro de teste com o corpo feminino; `&corpo=masc` troca o corpo. No modo de teste (`?teste`) a abertura é pulada para a campanha de ponta a ponta não mudar; `?teste&abertura` a liga.

`npm run e2e:abertura` (com `npm run preview` no ar, ou `E2E_URL` apontando para o servidor) roda a abertura inteira com o relógio à mão, confere a ordem dos planos, a concordância das falas, a pausa, o pulo de um bloco, o pulo da abertura inteira, a entrega para o jogo e a entrada direta por `?cena=`.

## Onde está cada coisa

`src/cine/cine.ts` é o sistema de cena: relógio próprio, planos de câmera com interpolação e câmera na mão, letterbox 2,35:1 (no máximo 14% da altura por barra, mínimo de 56 px), legendas inteiras sem digitação com tempo de leitura de 1,8 s mais 65 ms por caractere, letreiros, pretos e luz branca em degraus, a pausa com os botões de segurar para pular e as marcas de plano que a entrada `?cena=` usa para avançar rápido. `src/cine/ator.ts` põe uma figura do elenco PS2 dentro de um suporte que a cena deita, gira e faz andar, com pose imposta por cima do clipe (a mesma camada que a esgrima usa), olhar, rosto, objeto na mão e desbotar. `src/cine/cenarios.ts` monta os cinco cenários, um por vez. `src/cine/elenco.ts` tem os figurinos, as poses e os adereços. `src/cine/som.ts` tem a cantiga, o tema e os efeitos. O roteiro é a função `abertura` em `src/story.ts`, e `Game.abertura` em `src/game.ts` liga tudo ao Novo jogo com o modo `cine`.

## Pular

Esc, Start ou o botão de pausa no toque param a cena. Na primeira vez, a pausa oferece só "Pular esta parte", que encerra o bloco em curso e segue para o próximo: quem pulou a febre talvez queira ver a janela. Depois que a abertura foi vista ou pulada uma vez, aparece também "Pular a abertura". Os dois pedem 1,2 s segurando, com o anel em oito degraus. O "já viu" fica no armazenamento do navegador, na chave `interprete-rpg-abertura-vista`, e não nas Configurações, para não acrescentar opção a Ajustes (`docs/game/AJUSTES.md`).

## Orçamento PS2

Só um cenário fica na cena por vez; a região do jogo sai da cena durante a abertura e volta na entrega. Os cenários usam o kit e os materiais das regiões (texturas de até 512 px já carregadas), mesclados por material no `RegionBuilder`, e as seis lâmpadas fixas do motor, escolhidas pela distância ao alvo da câmera. O plano mais cheio (a enfermaria com 31 camas) fica perto de 140 malhas depois da mesclagem e oito figuras animadas. O elenco reaproveita os GLB já carregados; nenhum modelo novo desce da rede. O áudio do jogo fica calado (`AudioSys.hush`) e a cena toca só a própria síntese.

Com Reduzir movimento ligado, a câmera na mão para, a luz da janela sobe em três segundos em vez de um e meio, e os dois quadros da silhueta viram um segundo em luz baixa. Com Alto contraste, a legenda ganha fundo preto opaco. Na tela em pé, o ângulo vertical abre para o quadro composto em 16:9 não virar uma fresta.

## Pendências

A forja de personagens (`tools/chars/`) não roda neste ambiente: o Blender, o MPFB2 e o banco CMU estão fora do alcance da rede. Por isso a criança é o corpo do protagonista escolhido, reduzido a 1,42 m com a cabeça 12% maior, Helena é a estalajadeira com cabelo cinza na velhice, e os demais saem dos moradores com tinta e escala. Receitas próprias para a criança, a Helena jovem e velha, a Odila e o Caio, com rosto de criança e roupas de 1890, são o primeiro passo para a abertura sair do provisório.

A cantiga é cantarolada por síntese de formantes. Uma voz gravada (a melodia e a letra estão em `src/cine/som.ts`) melhora muito a cena 1.6 e o trecho da janela, e é decisão do Gabriel quem grava. O tema da partida também é sintetizado.

O capítulo 1 (a Estrada da Serra) não existe ainda. Hoje a abertura entrega o jogo no Átrio, como o Novo jogo fazia antes, e a conversa de abertura antiga ainda roda em seguida. Quando o capítulo 1 entrar, a troca é uma linha em `Game.startNew`: a região carregada depois da abertura.

O menu novo de três botões é de outra frente. A abertura entrou no `startNew` atual, então qualquer Novo jogo passa por ela; quando o menu novo chegar, ele chama o mesmo `startNew`.

A gravura dos planos 2.7 é uma só, com a criança sem marca de gênero. A decisão 2 pede duas versões ("o Menino" e "a Menina da Janela"); fica para quando a gravura sair da textura de canvas para uma ilustração.

As capturas foram feitas com render por software. A taxa de quadros real precisa ser medida no computador do Gabriel e num celular, principalmente na enfermaria e na serra.
