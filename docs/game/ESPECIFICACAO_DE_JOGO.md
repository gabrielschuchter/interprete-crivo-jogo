# Especificação de jogo

O que o jogo é hoje, descrito pelo que está implementado e verificado.

## Laço principal

Explorar uma região, conversar, observar com o Crivo, enfrentar a névoa e decidir. Cada missão principal termina numa escolha em que a resposta apressada parece razoável e está errada por um motivo que o próprio cenário mostra. Errar não trava a partida: o mecanismo devolve o selo, a alavanca chama um Vulto, o braseiro errado engrossa a névoa do chefe e muda uma fala do epílogo. A consequência existe e é reversível ou suportável.

## Campanha

A chegada apresenta Heloísa, a mestra da Academia, e o Pátio. Em "A Ponte das Conclusões", no Bosque da Confusão, três mecanismos ficam diante da ponte e só um a estende: o da roda foi calibrado com carroças carregadas em tempo seco, o do galope com cavaleiros ao meio-dia, e o do passo com quem atravessa a pé, de carga leve, sob névoa, que é o viajante descrito no selo. Cada mecanismo errado chama um Fiapo na primeira vez; os erros seguintes só devolvem o selo. É viés de seleção e validade externa em forma de engrenagem. Em "O Registro Original", no Arquivo das Perguntas, a lupa do Crivo revela fichas de procedência e mostra que, dos três registros, dois (Sino e Farol) concordam porque um foi copiado do outro, e só o terceiro, o da Maré, foi escrito por quem estava lá; contar votos não é contar evidência independente. Em "O Veredito", no Observatório, há óleo para um braseiro só, e o chefe recita certezas que o pulso do Crivo interrompe.

As paralelas são a encomenda de Dalva, as duas versões do vento (Noêmia e Tomé medem o mesmo vento em lugares diferentes e os dois têm razão), as seis páginas de método espalhadas pelas regiões e a decisão de Lia.

## O universo da PBE no mundo

O Pátio abriga o Passeio dos Mestres: oito bustos em arco ao redor da fonte (Lind, Nightingale, Semmelweis, Fisher, Bradford Hill, Cochrane, Sackett e Altman). Todos já faleceram, e a placa de cada um conta o que fez; o verbete do códice traz o contexto e o que ficou em aberto. Ler os oito conclui uma missão paralela e rende o Anel do Duplo-Cego. O Arquivo guarda seis estantes expositoras de obras, entre elas as de autores vivos, citados pela obra e sem busto; lê-las rende a Bússola de Cochrane. Cada morador tem um assunto de método que o ocupa (pergunta estruturada, viés de publicação, revisão sistemática, erro de medida, regressão à média e número necessário para tratar) e o conta em uma conversa opcional, que só aparece quando ele não tem pendência de missão. Os números das contas são inventados e dizem isso.

Os fatos históricos dos verbetes foram escritos de memória. Em 12/11/2026 passaram por uma primeira conferência, também sem a fonte primária em mãos, que corrigiu dois pontos (a sociedade que elegeu Nightingale em 1858 chamava-se Statistical Society of London; a ideia de que só a temporalidade é indispensável não é de Hill, é de leitores posteriores) e acrescentou a cada verbete de mestre e de obra a referência bibliográfica, exibida no códice em "Onde conferir". Conferência contra o material original, por pessoa independente, continua pendente antes de qualquer divulgação.

## Caso simulado

Lia é sineira e tem "vertigem de torre", condição inventada. O dossiê mostra queixa, preferências, três opções com benefício e dano em frequências naturais sobre 100 pessoas, custo e incerteza. O jogador investiga o que quiser e decide com ela. A devolutiva comenta o processo, não só a opção: o que foi perguntado, o que ficou de fora e como a escolha conversa com o que Lia valoriza. A tela e o diálogo dizem que a condição, os tratamentos e os números são fictícios e não orientam decisão de saúde real. Refazer o caso é permitido e não rende experiência de novo.

## Combate

Espada de uma mão na direita e tocha na esquerda. Golpe leve em sequência alternada de dois movimentos, golpe firme que quebra postura, esquiva com janela de invulnerabilidade, pulo com buffer e tempo de coiote (só um pulo leva ao vazio; andar e esquivar param na borda), vigor que limita tudo isso e mira travável. Inimigos anunciam o golpe antes de dar. Fiapos avançam em grupo, Vultos sopram de longe e obrigam a andar de lado, o Eco repete em anel o que o jogador acabou de fazer, e o Veredito alterna projéteis, anéis e recitação. O Crivo tem duas habilidades ativas alternáveis: o pulso de atenção, que atordoa e interrompe, e a lupa curiosa, que revela o que está escondido. Há dois níveis de dificuldade, Padrão e História.

## Progressão

Experiência e níveis dão pontos de habilidade para três ramos do jogador (Exploração, Interação, Encontros) e pontos próprios para três ramos do Crivo (Observação, Suporte, Exploração), com nove habilidades em cada árvore. Habilidades de Interação abrem falas que não existem sem elas. Equipamento ocupa traje, calçado, amuleto e ferramenta. A banca de Dalva vende consumíveis e peças, com desconto para quem entregou a encomenda. O Crivo ganha laço e capa como recompensas visuais. Uma habilidade do Crivo, Olhar compartilhado, aparece bloqueada e reservada ao cooperativo.

## Registro e acessibilidade

O jogo grava ao trocar de região, ao descansar e em pontos-chave das missões. Ajustes inclui três níveis de qualidade, quatro volumes, sensibilidade, eixo invertido, campo de visão, escala de texto, alto contraste, redução de movimento, granulado, vinheta, remapeamento de todas as ações e a opção de esconder a interface.


## Armas, armaduras e focos (12/11/2026)

Oito armas e três armaduras em `src/domain/gear.ts`, com raridade Comum, Incomum, Rara, Épica e Lendária. Cada peça leva o nome de uma ideia de prática baseada em evidências e o efeito imita a ideia: o Facão da Amostra de Conveniência varia 45% a cada golpe, a Adaga do Intervalo Estreito quase não varia e tem crítico, a Maça da Diferença Absoluta dá dano fixo, o Machado do Número Necessário decide um golpe em cada três, o Martelo da Síntese acerta em círculo, o Estoque da Replicação soma dano em acertos seguidos e o Sabre do Desfecho Registrado rende mais contra chefes. Fiapos e Vultos às vezes deixam uma peça no chão, com um facho na cor da raridade; chefes entregam primeiro a peça que é deles. Dalva vende a gazua e as peças de entrada.

Depois do Veredito, a missão Focos Residuais traz três grupos maiores de inimigos (clareira do Bosque, salão do Arquivo, terraço do Observatório). Cada foco apagado deixa um erro de leitura descrito sem jargão: regressão à média, publicação seletiva e confusão. Heloísa fecha a missão perguntando o que os três tinham em comum, e a Armadura do Protocolo é a recompensa.
