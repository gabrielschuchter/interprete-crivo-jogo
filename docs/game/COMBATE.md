# Combate: a esgrima do protagonista

Este documento descreve como o protagonista luta desde a rodada de combate de 13/11/2026 e por que cada regra existe. A referência declarada pelo Gabriel é a de um jogo de ação de artes marciais com espada (sequências longas de golpes leves, um golpe pesado que acumula energia, desvio no tempo certo), traduzida para a direção de arte do projeto: movimento econômico, silhuetas claras, poses que param. O código está em `src/entities/esgrima.ts` (os golpes como dados), `src/entities/player.ts` (a máquina de estados e a entrada) e `resolveAttack` e `hitPlayer` em `src/game.ts` (contato, dano, foco, pausa de impacto, desvio).

## O que estava errado antes

O leve e o firme eram dois clipes de captura acelerados para 0,46 s e 0,86 s, com o dano saindo a 42% e 50% do tempo, uma fila que nunca expirava (um toque antigo virava golpe segundos depois), avanço fixo de 2,4 m/s entre 25% e 55% do clipe, qualquer esquiva cancelando qualquer golpe em qualquer quadro e um combo de dois cortes que alternava para sempre. O firme não tinha compromisso nem recompensa: era um leve mais lento. Não havia desvio, nem esquiva perfeita, nem golpe aéreo. A arma girava por uma curva própria, sem relação com a pose do braço, que vinha do clipe de soco da captura.

Havia também um defeito antigo em `motion.ts` que afetava o elenco inteiro: `Rig.aim` com peso menor que 1 chamava `q.slerpQuaternions(identidade, q, w)`, e o three.js copia o primeiro argumento para `q` antes de interpolar. O resultado era sempre a identidade, isto é, toda pose aplicada com peso parcial (postura dos moradores andando, guarda dos inimigos, transições) simplesmente não acontecia. A correção (`partial` em `motion.ts`) faz essas poses aparecerem pela primeira vez; quem mexer no elenco deve conferir as capturas com isso em mente.

## Anatomia de um golpe

Cada golpe é um registro com duração, instantes de contato, janela do rastro, janela de encadeamento (`chain`, a partir de quando o próximo leve sai), janela do firme (`heavyFrom`), janela de compromisso (`lock`, em que a esquiva não cancela), janela de armadura (dano recebido não interrompe), avanço medido em metros, alcance, meia abertura do arco, custo de vigor, som e uma lista de poses-chave com a direção da lâmina. A camada de esgrima da figura aplica a pose amostrada por cima do clipe parado, e a lâmina segue a direção da chave, com o punho girando para ela. O trecho até o contato usa curva acelerada (o golpe ganha velocidade até o alvo); o trecho depois do contato desacelera e assenta numa pose parada antes de voltar à guarda. O dano sai no quadro do contato, nunca no início do golpe.

A tocha na mão esquerda é contrapeso: vai para trás quando a lâmina vai para a frente, e o antebraço dela é derivado do braço quando a pose não o diz, para a chama não subir acima da cabeça.

## Repertório

A sequência de leves tem quatro golpes. O Corte de abertura cruza da direita para a esquerda com contato a 0,17 s; o Revés volta subindo da esquerda para a direita (0,19 s); a Estocada do grou avança 1,6 m em base baixa, com alcance maior (3,1 m) e arco estreito; a Roda de cinzas gira o corpo inteiro com a lâmina estendida, acerta tudo em volta duas vezes (a segunda quebra a postura) e termina numa pose parada de meio segundo. O próximo toque precisa chegar até meio segundo depois do fim de cada golpe; depois disso a sequência recomeça. Um leve logo depois da esquiva (ou na cauda dela) sai como Contracorte, diagonal subindo, mais forte e com avanço de 1,4 m.

O firme se aperta e solta. Apertar entra na postura de raiz (lâmina baixa atrás do quadril, tocha à frente, joelhos dobrados); segurar acumula foco, um ponto a cada 0,6 s, até três; soltar descarrega todo o foco que houver. Sem foco sai o Golpe firme (lâmina atrás da cabeça, segura, desce com o corpo inteiro, contato a 0,43 s). Com um ou dois pontos sai o Corte da lua, que salta da raiz e cai sobre o alvo com 2,2 m de avanço. Com três sai a Queda do pilar, salto mais alto e uma onda de choque em volta. Cada ponto gasto soma 45% ao dano. Os leves também enchem o foco (0,2 a 0,4 por inimigo atingido), então a rotação natural é sequência de leves e firme imediato, e a carga parada fica para quando há tempo.

Apertar o firme no instante em que um golpe corpo a corpo chega (as primeiras 0,2 s da postura) desvia a arma: o jogador não toma dano, ganha um ponto de foco, o tempo desacelera um instante e sai o Golpe resoluto. O inimigo comum perde o equilíbrio por quase um segundo; o chefe recua e demora meio segundo a mais para atacar de novo. Cedo ou tarde demais, o golpe entra. Não há bloqueio parado: a defesa é a esquiva e o desvio no tempo certo, o que mantém a leitura dos avisos inimigos no centro da luta e não pede um botão a mais no toque.

A esquiva é um arranque de 0,42 s com invulnerabilidade. Se um golpe a atravessa nas primeiras 0,22 s, conta como esquiva perfeita (uma vez por esquiva): o tempo desacelera, entra um ponto de foco e o contracorte fica à mão. Sem direção, a esquiva vai para trás e o corpo continua de frente para o adversário. Ela cancela leves a qualquer momento e o firme fora da janela de compromisso (do começo da descida até logo depois do contato), e cancela a carga sem perder o foco acumulado.

No ar, o leve vira golpe em queda: o corpo para no alto um instante, mergulha com a lâmina para baixo e abre uma onda em volta ao tocar o chão.

## Peso e retorno

A pausa de impacto vai de 45 ms no leve a 160 ms no resoluto (a mais longa vence quando duas se sobrepõem, nunca somam), o tremor de câmera de 0,2 a 0,9 de trauma, e os firmes dão um tranco curto de câmera para dentro. Na carga a câmera chega 12% mais perto. Movimento reduzido desliga tranco e aproximação, além do tremor e do clarão que o motor já desligava. Cada golpe tem som próprio no instante em que a lâmina começa a andar (não no aperto do botão): os leves usam a amostra de espada com velocidades diferentes, o firme a de lâmina com um grave por baixo, a roda dois sopros, a carga um tom por ponto, o desvio dois parciais metálicos longos e a esquiva perfeita um sopro com um tom que desce. O rastro da lâmina é estreito e meio transparente, mais claro nos firmes.

O golpe gira para o alvo travado ou, sem trava, para o inimigo mais à frente na direção pedida (até 4,5 m e 70 graus), e o avanço para a meio metro do corpo dele em vez de atravessá-lo. O arco conta da borda do corpo do inimigo, não do centro, para chefes largos não escaparem pela quina. Com inimigo desperto a menos de 10 m, o corpo assume a guarda (lâmina à frente na linha dos olhos, ombro direito adiantado, tocha baixa atrás); correndo, a guarda sai.

## Entrada

Teclado e mouse: leve no botão esquerdo ou J, firme no direito ou K (segurar carrega), esquiva no X, pulo no Espaço. Controle: os mesmos botões mapeados, e o firme segurado também carrega. Toque: o botão Golpe repete enquanto o dedo fica nele (a sequência sai sozinha) e o botão Firme conta como segurado enquanto o dedo estiver nele. Cada toque de leve e de esquiva fica guardado por 0,4 s e 0,3 s; depois disso some.

## Como ver

Com o build servido por `npx vite preview --port 4173`, `LARG=640 ALT=400 node tools/movimento/banco.mjs esgrima` grava a sequência inteira de perto em `docs/game/capturas/movimento/esgrima_depois.jpg`. Os testes de `tests/unit/esgrima.test.ts` conferem a coerência dos tempos de cada golpe.
