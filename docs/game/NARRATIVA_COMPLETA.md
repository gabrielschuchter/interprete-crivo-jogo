# Interprete · Narrativa completa

Exportação de toda a narrativa que existe no jogo, tirada do código da `main` (commit `c916771`, 16/11/2026). As fontes são `src/story.ts` (conversas e regras das missões), `src/content/data.ts` (missões, itens, códice, caso de Lia), `src/content/moradores.ts` (12 moradores), `src/domain/gear.ts` (armas e armaduras), `src/entities/enemy.ts` e `src/entities/npc.ts` (nomes), `src/world/*.ts` (regiões, objetos, placas) e `src/ui/` (telas). Nada foi inventado. O que só existe no documento-matriz está na seção 15, marcado como planejado e não implementado.

Convenções: falas entre aspas são transcrição literal. "Narrador" é o texto sem personagem (caixa de diálogo sem nome). Trechos entre colchetes, como `[ofício]`, são partes que o jogo preenche na hora. Uma opção com "◆ Escuta atenta" só aparece com essa habilidade.

---

## 1. Premissa

Título na tela inicial: **Interprete. O Crivo e a Névoa das Conclusões**, com a linha "Uma aventura de método, dúvida e companhia".

A pessoa jogadora chega sob chuva ao Pátio dos Caminhos, diante da Academia, com uma carta de admissão no bolso. Um Crivo, criatura pequena cor de vinho com um olho só, escolhe acompanhá-la. O Pátio está cercado pela **Névoa das Conclusões**, que entra onde alguém teve certeza cedo demais e ninguém conferiu. A Névoa fechou a ponte do Bosque, bagunçou o Arquivo e subiu para o Observatório, onde ganhou corpo como o Veredito.

A campanha tem três problemas de leitura disfarçados de obstáculo físico: uma ponte calibrada para outro tipo de viajante (aplicabilidade), três registros em que dois são cópia (procedência) e uma escolha entre dois braseiros com óleo para um só (trocas). Depois do Veredito, três focos residuais repetem três erros de leitura (regressão à média, publicação seletiva, confusão entre coisas que andam juntas). A Névoa nunca é destruída: termina "do tamanho certo, que é o tamanho em que dá para trabalhar com ela".

Regra de tom do código: nenhuma missão é quiz; os conceitos de PBE aparecem como regra do mundo e só ganham nome no códice, para quem quiser ler. O único caso de saúde (Lia) é fictício e o jogo diz isso três vezes.

---

## 2. Linha do tempo

### 2.1 Passado do mundo (o que as falas contam)

| Quando | Fato | Quem conta |
|---|---|---|
| Há décadas | Severino vigia a escada da catedral há trinta anos. Professor Aurélio ensinou a mesma coisa por quarenta anos. | Severino, Aurélio |
| Há onze anos | Íris atravessa a ponte duas vezes por dia. | Íris |
| Uma vez, no passado | Heloísa teve certeza cedo demais sobre de que lado a névoa viria e fechou o arco errado. | Heloísa (◆ Escuta atenta) |
| A noite em que a névoa entrou | A Névoa entrou pelo cais, rente à água, antes de qualquer sino. Alguém que amarrava o barco escreveu o Registro da Maré. Depois, o Registro do Sino copiou a Maré sem conferência, e o do Farol resumiu o Sino com acréscimos. | Registros e fichas do Arquivo, Anselmo |
| Ano passado | Um aluno levou ao Professor Aurélio um estudo que o desmentia. | Aurélio |
| Há dois meses | Lia começa a sentir a "vertigem de torre" na escada do campanário. | Lia |
| Uma noite recente | Noêmia diz que não ventou no terraço; Tomé diz que ventou do norte a noite inteira no beco. | Noêmia, Tomé |
| Anteontem | A ponte recolheu no meio da travessia de Íris. Uma caixa de ferragens de Dalva ficou do outro lado. | Íris, Dalva |
| Últimas noites | Barulho no Observatório: a Névoa subiu para lá. | Heloísa |
| Uma hora antes da chegada | O Crivo desceu a escadaria e ficou olhando para o arco sul. | Heloísa |

### 2.2 Ordem da campanha

1. **Abertura.** Chegada sob chuva, o Crivo escolhe a pessoa. Começa *Chegada ao Pátio*.
2. **Heloísa.** Apresenta a Névoa e manda à ponte. Começa *A Ponte das Conclusões*.
3. **Bosque da Confusão.** Fiapos na trilha, baú do selo na clareira, três mecanismos, ponte estendida, marco aceso. Íris fecha a missão.
4. **Arquivo das Perguntas.** Anselmo ensina a Lupa ao Crivo e entrega a chave. Três púlpitos, três fichas, três alavancas, o Eco, a Lanterna. Anselmo fecha a missão (flag `arquivo_concluido`).
5. **Observatório do Acaso.** Heloísa entrega o único frasco de óleo. Escolha entre dois braseiros, abertura da grade, luta contra o Veredito. Heloísa fecha a missão e aparece a **tela de fim do primeiro caminho** (flag `epilogo`).
6. **Pós-final.** *Focos Residuais*: três grupos maiores voltam, um por região. Heloísa pergunta o que os três tinham em comum.

As paralelas (Lia, Vento, Encomenda, Páginas, Mestres, mais as Obras do Arquivo) podem ser feitas em qualquer ordem, sem prazo. A Encomenda só aparece no quadro depois que Íris manda à ponte.

### 2.3 Três estados do mundo

Os 12 moradores mudam a fala de andamento em três tempos: **antes do Arquivo**, **depois do Arquivo** (flag `arquivo_concluido`) e **depois do Veredito** (flag `epilogo`). A névoa do Bosque também muda: com o marco aceso (`ponte_aberta`) a região passa a usar a ambientação limpa.

### 2.4 Ramificação: os dois braseiros

| | Braseiro da estrada (`braseiro_vila`) | Braseiro do terraço (`braseiro_terraco`) |
|---|---|---|
| O que acontece | A estrada da Vila acende em âmbar; o terraço fica tomado pela névoa (névoa reforçada durante a luta) | O terraço se abre à vista; a estrada da Vila fica escura mais uma noite |
| Fala de Heloísa no final | "E vi o braseiro da estrada aceso. Você lutou no escuro para que outros andassem no claro. Há um preço nisso, e você pagou." | "E vi o terraço iluminado. Você escolheu enxergar o que enfrentava. A estrada da Vila esperou mais uma noite, e essa conta também é sua." |
| Íris depois do final | Entrega um presente da Vila: 60 moedas e 2 Selos da Pergunta | "A estrada ficou escura mais uma noite, e esperamos. Ninguém se machucou. Só para você saber que a espera existiu." |

Não há escolha certa; o jogo diz isso no próprio braseiro e no códice.

---

## 3. Regiões e locais

| Região | Subtítulo no jogo | Quem mora | O que acontece |
|---|---|---|---|
| **Pátio dos Caminhos** (hub) | Onde os caminhos se cruzam | Heloísa, Íris, Anselmo, Dalva, Lia, Noêmia, Tomé, Custódia, Dona Amélia, Dito, Vera | Fonte armilar, dois arcos, escadaria da Academia, Beco dos Ofícios, quadro de casos, Passeio dos Mestres (8 bustos), terraço, marco de descanso, portão sul |
| **Bosque da Confusão** | Onde a ponte parou de responder | Glória, Matias | Trilha, ruína, clareira, Ponte das Conclusões com três mecanismos, marco, margem leste com a caixa de Dalva, grade com baú, página solta |
| **Arquivo das Perguntas** | Os livros são guardados pela pergunta que respondem | Frei Bartolomeu, Professor Aurélio | Caderno da entrada, salão dos púlpitos, estantes, seis obras expositoras, porta com três alavancas, Sala dos Originais |
| **Observatório do Acaso** | De onde se vê tudo de uma vez | Severino, Rosário, Celeste, Inácio | Parapeito com inscrição, lua de olho único, dois braseiros, grade, Terraço do Veredito, baú do pingente |

Detalhes de lugar ditos no jogo:

- Arco oeste: "conhece-te a ti mesmo", leva ao Arquivo. Arco leste: "entre amigos, tudo é comum" (inscrição ΚΟΙΝΑ ΤΑ ΦΙΛΩΝ), leva ao Bosque e, antes, à estrada da Vila.
- O Arquivo abre só com a chave de Anselmo ("A porta do Arquivo está trancada por dentro. Anselmo tem a chave."). As portas da Academia só abrem depois do Arquivo ("As portas da Academia não cedem. Algo lá em cima ainda não quer visita.").
- A **Vila** existe só fora de cena: uma estrada de luzes a oeste do Observatório e o destino de Íris. Não é região jogável.
- Portão sul do Pátio: dá para a área de membros, onde "os corredores de Estudar e Comunidade seguem como sempre".
- Cair no abismo do Bosque: "A névoa devolveu você à borda. Sem ponte, não há passagem."

---

## 4. Personagens

### 4.1 Protagonista

Criado na tela "Quem chega ao Pátio?". Escolhas: nome (padrão "Viajante"), corpo feminino ou masculino, cinco tons de pele (muito clara, clara, média, escura, muito escura), seis cores de cabelo, quatro cortes (Curto, Coque, Longo, Capuz), seis casacos (vinho, azul-marinho, verde-escuro, roxo, marrom, grafite), ofício e dificuldade. Rodapé: "Nenhum ofício é melhor que outro. Mudam algumas falas e o que cabe a você fazer em cada caso."

| Ofício | Linha de apresentação | Objeto de ofício |
|---|---|---|
| Nutrição | Você pesa o que as pessoas comem contra o que elas conseguem manter. | Caderno de porções |
| Medicina | Você aprendeu que prescrever é a parte fácil. Difícil é saber quando não. | Estetoscópio de latão |
| Enfermagem | Você é quem vê a pessoa às três da manhã, quando o plano encontra a realidade. | Relógio de bolso |
| Psicologia | Você escuta o que foi dito e repara no que ficou de fora. | Bloco de escuta |
| Fisioterapia | Você mede melhora em degraus subidos, não em promessas. | Fita métrica |
| Aprendiz | Você ainda não escolheu um ofício. Aqui isso não é defeito. | Caderno em branco |

O ofício muda uma fala de Heloísa e os rótulos das opções no caso de Lia (encaminhar em vez de prescrever, quando fora do escopo).

Começa com 10 moedas, um Caldo da cantina e o Estoque do Aprendiz. Usa espada na direita e tocha na esquerda.

### 4.2 O Crivo

Companheiro mudo, cor de vinho, um olho só. Pisca, saltita, aponta; quando duvida, inclina o corpo. Verbete: "Cada viajante do Pátio acaba escolhido por um. Ninguém sabe o critério, e os Crivos não explicam." Nota: "Crivo é peneira: o que separa o que passa do que fica. O nome não promete certeza, só critério."

Começa com Farejar pistas (passiva) e Pulso de atenção (ativa). Aprende a Lupa curiosa com Anselmo. Ganha um laço dourado (Páginas de Método) e uma capa esmeralda (fim do Veredito), ligáveis em Habilidades.

### 4.3 Personagens da história (7)

| Nome | Papel | Onde | Função |
|---|---|---|---|
| Heloísa Vértice | Guardiã do Pátio | Pátio, ao sul da fonte | Dá as missões principais e fecha o Veredito e os Focos |
| Íris | Mensageira | Pátio, arco leste | Missão da ponte; presente pós-final se a estrada foi acesa |
| Anselmo | Bibliotecário do Arquivo das Perguntas | Pátio, arco oeste | Missão do Arquivo, Lupa do Crivo, Páginas de Método |
| Dalva | Artesã do Beco dos Ofícios | Pátio, beco | Banca (loja), Encomenda Atrasada |
| Lia | Sineira da Academia, personagem de caso simulado | Pátio, banco a oeste da fonte | Caso simulado "Uma Decisão para Lia" |
| Noêmia | Vigia do terraço | Pátio, banco a leste da fonte | Duas Versões do Vento |
| Tomé | Acendedor de lampiões | Pátio, canteiros do sudoeste | Duas Versões do Vento |

Verbetes de pessoas no códice: Heloísa "recebe quem chega e não costuma dar respostas completas. Diz que é por respeito." Íris "conhece o Bosque pelos pés." Anselmo "classifica os livros pela pergunta que respondem, não pelo assunto." Dalva "conserta o que dá para consertar e avisa quando não dá." Lia "sobe a torre antes do sol. Personagem fictícia de um caso simulado."

### 4.4 Moradores (12)

Todos fictícios. Cada um tem saudação, assunto de ofício (um jeito de pensar com evidência), fala de andamento em três tempos e despedida. Falas completas na seção 8.9.

| Nome | Papel | Região | Assunto |
|---|---|---|---|
| Frei Bartolomeu | Monge arquivista | Arquivo | Fichas de procedência |
| Professor Aurélio | Professor aposentado | Arquivo | Mudar de ideia diante de estudo novo |
| Custódia | Acendedora de lampiões | Pátio (beco) | Procurar só onde há luz |
| Dona Amélia | Viúva da estalagem | Pátio (beco) | Livro de hóspedes só com elogios |
| Dito | Órfão da torre dos sinos | Pátio | Uma manhã só não prova assombração |
| Vera | Detetive mascarada | Pátio | Estar sempre no lugar não é causar |
| Glória | Herbalista dos cogumelos | Bosque | Chá para metade, folha comum para a outra |
| Matias | Cartógrafo ferroviário | Bosque | Mapa bom é feito para a pergunta de quem usa |
| Severino | Vigia da catedral | Observatório | Só contou quem voltou |
| Rosário | Enfermeira da neve | Observatório | Perguntar o que a pessoa quer conseguir fazer |
| Celeste | Acólita da catedral | Observatório | O livro entra como terceira voz |
| Inácio | Noviço do coro | Observatório | Depois do ensaio ruim vem um menos ruim |

### 4.5 Mestres (pessoas reais já falecidas, como bustos e placas)

Oito bustos em arco ao redor da fonte: James Lind, Florence Nightingale, Ignaz Semmelweis, Ronald Fisher, Austin Bradford Hill, Archie Cochrane, David Sackett, Doug Altman. Não falam e não são NPC; aparecem só como placa e verbete. Textos na seção 9.4.

### 4.6 Obras (autores vivos, citados pela obra, sem busto)

Seis estantes no Arquivo: EBM Working Group (1992), Enkin, Keirse e Chalmers (1989), Greenhalgh, Gigerenzer, Ioannidis (2005), Centro Cochrane do Brasil (1996). Textos na seção 9.5.

---

## 5. Criaturas

Vida e dano abaixo são os valores de base; a dificuldade escolhida multiplica por classe (ver `docs/game/DIFICULDADE.md`).

### 5.1 Comuns

| Criatura | Onde | Papel narrativo (códice) |
|---|---|---|
| **Fiapo da Névoa** (46 PV) | Bosque (trilha, clareira, margem), Arquivo (estantes), todos os focos; também surge quando se aciona mecanismo ou alavanca errados | "Um resto de névoa que ganhou vontade. Avança, hesita um instante e investe. O instante de hesitação é a sua janela." / "Não é ninguém. Não representa ninguém. É só névoa com pressa." |
| **Vulto** (96 PV, ataque à distância) | Bosque (clareira, margem), Arquivo (estantes), foco do Observatório | "Névoa mais velha, que aprendeu a manter distância. Lança um sopro lento e depois se aproxima. O sopro tem trajetória reta: ande de lado." |
| **Erudito Oco** (70 PV) | Foco do Bosque | "Um estudante que leu tanto a mesma conclusão que esqueceu a pergunta. Anda curvado, ataca rápido e cede a dois golpes seguidos." |
| **Errante do Gelo** (120 PV) | Foco do Arquivo | "Coberto de geada e de certezas antigas. Lento para se preparar e pesado quando acerta. Fique fora do alcance enquanto ele ergue os braços." |
| **Suplicante Encapuzado** (60 PV) | Foco do Observatório | "Pede uma resposta, qualquer uma, e investe com um punhal curto. O aviso é breve; o golpe, também. Um golpe firme o derruba." |

### 5.2 Mini-chefes (só na missão Focos Residuais)

| Criatura | Foco | Códice |
|---|---|---|
| **Duelista das Cinzas** (300 PV) | Clareira do Bosque | "Esgrimista do Bosque. Encadeia estocadas: duas, e três quando ferido. Cada estocada tem um aviso curto, e a última deixa a guarda aberta." |
| **Carcereiro dos Trilhos** (420 PV) | Salão do Arquivo | "Guarda o Arquivo com um gancho de ferroviário e um lampião violeta. Bate no chão em anel e, ferido, chama reforços." |
| **Matriarca do Coro Velado** (280 PV) | Terraço do Observatório | "Paira sobre o terraço com dois incensários. Canta em leque: três sopros, e cinco depois de ferida. O espaço entre eles é o caminho." |

### 5.3 Chefes

| Criatura | Onde | Códice |
|---|---|---|
| **O Eco** (340 PV) | Sala dos Originais, no Arquivo; aparece ao puxar a alavanca certa | "Vive na Sala dos Originais e repete o que ouve. Quando se divide, os pedaços são mais fracos que o inteiro, mas falam mais alto." |
| **O Veredito** (880 PV) | Terraço do Observatório; aparece ao acender um braseiro | "A Névoa, quando se convence. Ocupa o Observatório porque de lá se vê tudo de uma vez, e ver tudo de uma vez é o jeito mais rápido de concluir errado." / "Não foi destruído. Ficou menor." Abaixo de cerca de um terço da vida, ele recita; o pulso do Crivo interrompe. |

A **Névoa das Conclusões** é a antagonista sem corpo: "Ela entra onde uma certeza frágil ficou sem ser conferida. Não mente: encurta o caminho, e o atalho leva a outro lugar." / "Não dá para acabar com ela. Dá para ficar do tamanho certo." Nota: "A névoa é uma figura do jogo. Fora dele, incerteza não some com esforço; aprende-se a decidir com ela."

---

## 6. Missões principais

### 6.1 Chegada ao Pátio

- **Resumo:** Você chegou sob chuva, e um Crivo escolheu acompanhar você. A guardiã do Pátio espera junto à fonte.
- **Gatilho:** abertura do jogo.
- **Passo:** Fale com Heloísa, junto à fonte (dica: ela está ao sul da fonte, de capa escura e cachecol dourado).
- **Recompensa:** 20 XP. Abre o verbete Pátio dos Caminhos e, se perguntado, A Névoa das Conclusões.
- **Conclusão:** Heloísa contou o que a Névoa das Conclusões fez com o Pátio.

### 6.2 A Ponte das Conclusões

- **Resumo:** A ponte do Bosque recolheu e não volta. Íris acha que ninguém mais sabe para quem ela foi feita.
- **Gatilho:** fim da conversa com Heloísa.
- **Passos:**
  1. Fale com Íris, junto ao arco leste.
  2. Atravesse o arco leste até o Bosque da Confusão.
  3. Siga a trilha e afaste os Fiapos da Névoa (dica: eles hesitam antes de investir; esquive nesse instante ou use o pulso do Crivo).
  4. Encontre o que os Fiapos guardavam na clareira (o baú só abre com a clareira limpa; dentro, o Selo do Contexto).
  5. Descubra em qual mecanismo o selo se encaixa (dica: leia as inscrições e repare no que ficou ao pé de cada um).
  6. Atravesse a ponte e acenda o marco do outro lado.
  7. Volte ao Pátio e fale com Íris.
- **Erro permitido:** o selo nos mecanismos da roda ou do galope é devolvido; na primeira vez em cada um, um Fiapo surge.
- **Ao estender a ponte:** surgem um Vulto e um Fiapo na margem; abre o verbete Para quem a ponte foi feita; 60 XP.
- **Recompensa final:** 120 XP, 30 moedas, 1 ponto do Crivo.
- **Conclusão:** A ponte voltou a responder a quem atravessa. O Pátio parece respirar melhor.

### 6.3 O Registro Original

- **Resumo:** Três registros contam por onde a Névoa entrou. Não concordam. Anselmo quer saber qual deles estava lá.
- **Gatilho:** falar com Anselmo depois da ponte.
- **Passos:**
  1. Fale com Anselmo, junto ao arco oeste (ensina a Lupa curiosa ao Crivo e entrega a chave).
  2. Entre no Arquivo das Perguntas.
  3. Reúna as três fichas de procedência (escondidas; a Lupa mostra o rastro de tinta de cada púlpito).
  4. Na porta da Sala dos Originais, acione a alavanca do registro que não copiou de ninguém (dica: leia os carimbos das fichas no inventário).
  5. Enfrente o que se esconde na Sala dos Originais (o Eco).
  6. Recolha a lanterna no fundo da sala (Lanterna da Transparência).
  7. Volte ao Pátio e fale com Anselmo.
- **Erro permitido:** alavanca do Sino ou do Farol faz a porta gemer e voltar; na primeira vez em cada uma, um Fiapo surge. Acertar sem as três fichas é permitido e fica registrado como palpite (flag `originais_palpite`).
- **Ao abrir a porta:** verbete Cópia de cópia; 60 XP.
- **Recompensa final:** 160 XP, 40 moedas, 1 ponto do Crivo; libera o Observatório.
- **Conclusão:** O registro do cais voltou para a estante certa. As cópias ganharam uma etiqueta honesta.

### 6.4 O Veredito

- **Resumo:** A Névoa subiu para o Observatório e se convenceu de alguma coisa. Heloísa pede que você vá até lá.
- **Gatilho:** falar com Heloísa depois do Arquivo. Ela entrega o Frasco de óleo de lamparina.
- **Passos:**
  1. Fale com Heloísa, junto à fonte.
  2. Suba a escadaria e entre na Academia.
  3. Decida qual braseiro acender com o único frasco de óleo (dica: um ilumina a estrada da Vila; o outro, o terraço onde o Veredito espera; não há resposta certa).
  4. Enfrente o Veredito (dica: quando ele começar a recitar, o pulso do Crivo interrompe).
  5. Volte ao Pátio e fale com Heloísa.
- **Ramificação:** ver 2.4.
- **Ao acender:** a grade do terraço abre, o Veredito aparece, verbete Um frasco, dois braseiros, 50 XP.
- **Ao vencer:** faixa "O Veredito cedeu · A Névoa ficou menor · Não foi destruída. Ficou do tamanho em que dá para trabalhar com ela." A névoa baixa e o terraço clareia. O baú do Pingente do Intervalo fica disponível.
- **Recompensa final:** 300 XP, 80 moedas, 1 ponto do Crivo, capa esmeralda do Crivo. Abre a tela de fim (seção 10).
- **Conclusão:** A Névoa não foi embora. Ficou do tamanho certo.

### 6.5 Focos Residuais

- **Resumo:** O Veredito cedeu, mas a Névoa deixou três focos para trás, um em cada região. Cada um se sustenta num erro de leitura diferente.
- **Gatilho:** fim do Veredito (ou primeira conversa com Heloísa em registro antigo já finalizado).
- **Passos:**
  1. Apague os três focos residuais: clareira do Bosque, salão do Arquivo e terraço do Observatório (dica: cada foco é um grupo maior de inimigos; ao apagar um, leia o que ele deixa para trás).
  2. Conte a Heloísa o que os focos tinham em comum.
- **Grupos:** Bosque: Duelista, 2 Eruditos, 3 Fiapos. Arquivo: Carcereiro, 2 Errantes, 2 Fiapos. Observatório: Matriarca, 2 Suplicantes, 1 Vulto, 2 Fiapos.
- **Recompensa:** 220 XP, 120 moedas, 1 ponto do Crivo, Armadura do Protocolo.
- **Conclusão:** Três focos, três erros de leitura. Nenhum deles era a Névoa sozinha.

---

## 7. Missões paralelas

### 7.1 Uma Decisão para Lia (caso simulado)

- **Resumo:** Lia, a sineira, anda tonta na escada da torre e quer conversar sobre o que fazer. Caso simulado, com dados fictícios.
- **Gatilho:** falar com Lia ou pegar no quadro de casos.
- **Passos:** Converse com Lia e abra o dossiê do caso; chegue a uma decisão com Lia (dica: não há cronômetro; pergunte o que importa para ela antes de decidir).
- **Recompensa:** 15 moedas, mais XP calculado só pelo processo: 20 + 12 por passo feito + 16 se a escolha não ficou frágil. O desfecho sorteado não entra na conta. Refazer não paga de novo.
- **Conclusão:** Você e Lia fecharam um plano e combinaram quando rever.
- Dossiê completo na seção 8.6.

### 7.2 Duas Versões do Vento

- **Resumo:** Noêmia e Tomé viram a mesma noite e contam histórias que não cabem uma na outra.
- **Gatilho:** falar com Noêmia ou Tomé, ou o quadro.
- **Passos:** Ouça a versão de Noêmia e a de Tomé; examine o canto do terraço e o fundo do beco (dica: cada um olhava de um lugar); conte a Noêmia o que você encontrou.
- **Recompensa:** 80 XP e a Lupa do Contexto.
- **Conclusão:** Os dois tinham razão sobre o pedaço que viram.

### 7.3 Encomenda Atrasada

- **Resumo:** Uma caixa de Dalva ficou do lado de lá da ponte.
- **Gatilho:** Dalva ou o quadro, depois que Íris manda à ponte; ou pegar a caixa direto.
- **Passos:** Encontre a caixa de Dalva além da ponte, no Bosque; entregue a caixa a Dalva, no beco.
- **Recompensa:** 70 XP, 20 moedas e desconto permanente na banca.
- **Conclusão:** Dalva recuperou as ferragens e baixou os preços para você.

### 7.4 Páginas de Método

- **Resumo:** Páginas soltas de um caderno antigo andam espalhadas. Anselmo gostaria de ver todas juntas de novo.
- **Gatilho:** recolher a primeira página ou o quadro.
- **Passos:** Recolha as seis páginas soltas (três no Pátio, uma no Bosque, uma no Arquivo, uma no Observatório); leve as páginas a Anselmo.
- **Páginas:** A pergunta, O acaso e Em cada cem (Pátio); A terceira coisa (Bosque, margem leste); A ferramenta e a pergunta (Sala dos Originais); Duas cadeiras (Observatório). Textos na seção 11.
- **Recompensa:** 90 XP, 1 ponto do Crivo, laço dourado do Crivo.
- **Conclusão:** O caderno está inteiro. Anselmo o deixou na mesa de entrada, aberto.

### 7.5 Passeio dos Mestres

- **Resumo:** Oito bustos em arco ao redor da fonte lembram quem inventou os jeitos de perguntar que a Academia ensina. Cada placa conta o que a pessoa fez e o que ficou em aberto.
- **Gatilho:** ler a primeira placa.
- **Passo:** Leia as placas dos oito bustos do Pátio (quatro de cada lado da fonte). Cada placa rende 10 XP.
- **Recompensa:** 120 XP e o Anel do Duplo-Cego.
- **Conclusão:** Você leu os oito. O ourives do Pátio deixou um anel para quem terminasse o passeio.

### 7.6 Estantes do Arquivo (coleção, sem entrada no diário)

Ler as seis obras expositoras do Arquivo (10 XP cada) rende 100 XP e a Bússola de Cochrane.

### 7.7 Quadro de casos (Pátio)

Texto ao abrir: "O quadro de casos. Papéis presos com alfinete de latão; alguns tão antigos que a tinta virou sépia. Nenhum tem prazo."

| Bilhete | Texto ao aceitar |
|---|---|
| Uma decisão para Lia · caso simulado | Lia, a sineira, costuma ficar no banco a oeste da fonte. O bilhete avisa: caso simulado, dados fictícios. |
| Duas versões do vento | Noêmia fica no banco a leste da fonte; Tomé, perto dos canteiros do sudoeste. Cada um conta a mesma noite de um jeito. |
| Encomenda atrasada (depois de falar com Íris) | Dalva, do Beco dos Ofícios, perdeu uma caixa de ferragens do outro lado da ponte. |
| Páginas de método | Seis páginas de um caderno antigo andam soltas. Três estão aqui no Pátio. |

Quadro vazio: "Tudo o que está no quadro já consta no seu diário." ou "O quadro está em dia. Por ora, o Pátio não pede nada."

---

## 8. Diálogos completos

### 8.1 Abertura

> **Narrador:** Chove no Pátio dos Caminhos. Você chegou tarde, com a carta de admissão dobrada no bolso e a impressão de que esqueceram de avisar que você vinha.
>
> **Narrador:** Algo pequeno, cor de vinho, saltita entre as poças na sua direção. Tem um olho só, e olha para você como quem confere uma soma.
>
> *(o Crivo comemora)*
>
> **Narrador:** Ele não diz nada. Dá uma volta ao seu redor, pisca devagar e se põe ao seu lado. Pelo visto, a decisão foi tomada.

Em seguida aparece a dica "Primeiros passos" com os controles.

### 8.2 Heloísa Vértice

**Chegada (primeira conversa).**

> **Heloísa:** Então é você. O Crivo desceu a escadaria faz uma hora e ficou aí, olhando para o arco sul. Eles sabem antes da gente.
>
> **Heloísa:** Sou Heloísa. Cuido do Pátio, o que nos últimos tempos quer dizer: cuido do que sobrou dele fora da névoa.

Perguntas em laço (pode fazer todas; a última encerra):

- **"Que névoa?"**
  > A Névoa das Conclusões. Entra onde alguém teve certeza cedo demais e ninguém conferiu. Ela não mente. Encurta o caminho, e o atalho dá em outro lugar.
  >
  > Fechou a ponte do Bosque, bagunçou o Arquivo e, pelo barulho das últimas noites, subiu para o Observatório.
- **"O que é um Crivo?"**
  > Um companheiro. Tem um olho só e vê uma coisa de cada vez; dizem que é por isso que erra menos. Não fala. Repare para onde ele olha.
  >
  > Ele sabe interromper quem está prestes a atacar. Um piscar, e a névoa perde o fio da meada por um instante.
- **◆ Escuta atenta · "Você disse 'o que sobrou'."** (15 XP)
  > Disse. Eu mesma tive certeza cedo demais, uma vez, sobre de que lado a névoa viria. Fechei o arco errado.
  >
  > Não conto isso para ser perdoada. Conto para você desconfiar de mim na medida certa.
- **"Por onde eu começo?"** (encerra)
  > Pela ponte. Íris, a mensageira, está junto ao arco leste e conhece o Bosque pelos pés. `[Aprendiz:]` Não ter ofício ainda não atrapalha: lá ninguém vai perguntar. `[demais ofícios:]` Gente de [ofício] costuma se dar bem com ela.
  >
  > Leve o estoque e a tocha. Os Fiapos não escutam argumento. E descanse no marco ao lado da fonte quando precisar: ele guarda o seu caminho.

**Durante a ponte.** "A ponte primeiro. Íris está no arco leste."

**Depois da ponte, antes do Arquivo.** "Anselmo anda atrás de você, junto ao arco oeste. Tem a ver com três registros que não concordam."

**Depois do Arquivo (início do Veredito).**

> **Heloísa:** Anselmo me contou do registro. Bom trabalho, e melhor ainda por não ter confiado no número de vozes.
>
> **Heloísa:** Agora o resto. A Névoa subiu para o Observatório e se convenceu de alguma coisa. Quando ela se convence, ganha corpo. Chamamos de Veredito.
>
> **Heloísa:** Leve este frasco de óleo. Lá em cima há dois braseiros, e o frasco dá para um só. Um ilumina a estrada da Vila. O outro, o terraço onde ele espera.

- **"Qual eu devo acender?"**
  > Se eu soubesse, não mandava você. Cada um cobra uma coisa diferente. Decida sabendo o que perde, e não finja depois que não perdeu nada.
- **"Eu subo."** (encerra)

**Durante o Veredito.** "As portas da Academia abrem para quem leva o óleo. Suba a escadaria. E não tenha pressa de concluir nada lá em cima."

**Depois de vencer o Veredito (final).**

> **Heloísa:** Eu vi daqui. O céu sobre a torre abriu por um instante, como quem respira depois de muito tempo.
>
> **Heloísa:** `[estrada acesa:]` E vi o braseiro da estrada aceso. Você lutou no escuro para que outros andassem no claro. Há um preço nisso, e você pagou. `[terraço aceso:]` E vi o terraço iluminado. Você escolheu enxergar o que enfrentava. A estrada da Vila esperou mais uma noite, e essa conta também é sua.
>
> **Heloísa:** A Névoa não foi embora. Nunca vai. Ficou do tamanho certo, que é o tamanho em que dá para trabalhar com ela.
>
> **Narrador:** O Crivo encosta em você, só um instante. Depois finge que não foi nada.
>
> **Heloísa:** Mas não terminou. Daqui eu vejo três pontos onde ela ainda se junta: a clareira do Bosque, o salão do Arquivo e o terraço lá em cima. Focos. Cada um se sustenta num jeito errado de ler o que aconteceu.

Segue a tela de fim (seção 10).

**Focos em andamento.** "Os focos: clareira do Bosque, salão do Arquivo, terraço do Observatório. Apague os três e venha me contar o que viu."

**Registro antigo, já finalizado, sem a missão.** "Ainda há três pontos onde a Névoa se junta: a clareira do Bosque, o salão do Arquivo e o terraço do Observatório. Focos. Apague os três e venha me contar o que viu."

**Fechando os Focos.**

> **Heloísa:** Os três? Então me diga o que eles tinham em comum.

| Resposta | Fala de Heloísa | Resultado |
|---|---|---|
| "Todos pareciam maiores do que eram, porque eu só via o que chamava atenção." | Em parte. Isso explica a clareira. O Arquivo e o terraço erraram de outro jeito: um escondeu as vozes que discordavam, o outro culpou o vento pelo que era do frio. Mas você viu os três, e isso conta. | Conclui |
| "Nenhum era a Névoa sozinha. Cada um se apoiava num jeito errado de ler o que aconteceu." | Isso. A clareira crescia porque só as noites piores eram lembradas. O Arquivo guardava só as vozes que concordavam. E no terraço o vento levava a culpa do frio. Três leituras erradas, e a Névoa morando no meio delas. | Conclui |
| "Eram fortes. Precisei de mais golpes." | Eram, e você aguentou. Mas força não explica por que voltaram. Pense de novo no que cada um deixou para trás. | Não conclui; pode responder de novo |

Ao concluir: "Leve isto. Foi desenhada antes de qualquer batalha e ninguém trocou uma placa no meio do caminho. Combina com você." (Armadura do Protocolo)

**Depois de tudo.** "Bom dia. Faz tempo que eu não dizia isso aqui com o céu concordando."

### 8.3 Íris

**Primeira conversa (passo 1 da ponte).**

> **Íris:** Duas vezes por dia, ida e volta, onze anos. Anteontem a ponte recolheu no meio da minha travessia. Voltei de costas, sem tirar o olho dela.
>
> **Íris:** Na cabeceira há três mecanismos. Sempre funcionou sozinha, ninguém mais lembra para que serve cada um. E a névoa largou uns Fiapos pela trilha.

- **"O que são Fiapos?"**
  > Resto de névoa que ganhou vontade. Avançam, hesitam um instante e investem. O instante em que hesitam é a sua vez. Não são ninguém, não se sinta mal.
- **◆ Escuta atenta · "Sempre funcionou sozinha?"** (15 XP)
  > Sozinha para mim. Uma vez vi um carroceiro esperar meia hora até ela abrir. Na época achei que era azar dele.
  >
  > Agora que você pergunta... talvez a ponte sempre tenha escolhido para quem abrir. Eu só nunca precisei reparar.
- **"Eu vou até lá."** (encerra)
  > O arco leste dá na trilha. Se achar uma caixa de ferragens do outro lado, é da Dalva. Ela vai querer de volta.

**Durante a ponte.** "A trilha começa logo depois do arco. Olho nos Fiapos."

**Fechando a ponte.**

> **Íris:** Eu ouvi o estalo daqui. Pedra encaixando em pedra. Não escutava isso fazia dias.
>
> **Íris:** Então era isso: ela não estava quebrada. Estava esperando alguém perguntar para quem tinha sido feita.
>
> **Íris:** O Crivo parece maior. Deve ser impressão. Aliás, Anselmo quer falar com você: algo sobre o Arquivo e registros que brigam entre si.

**Pós-final, estrada acesa (uma vez).** "A estrada da Vila estava acesa ontem à noite. Fiz a travessia inteira sem tropeçar. O pessoal de lá mandou isto para quem acendeu." (60 moedas e 2 Selos da Pergunta)

**Pós-final, terraço aceso.** "A estrada ficou escura mais uma noite, e esperamos. Ninguém se machucou. Só para você saber que a espera existiu."

**Depois da ponte, sem pendência.** "Onze anos de ponte e eu nunca tinha lido o que está escrito nos mecanismos. Dá o que pensar."

### 8.4 Anselmo

**Antes da ponte.** "O Arquivo está trancado por dentro. Antes dele, a ponte: sem estrada, nem os registros chegam."

**Depois da ponte (início do Arquivo).**

> **Anselmo:** Você é quem perguntou para quem a ponte foi feita. Preciso desse tipo de pergunta no Arquivo.
>
> **Anselmo:** Três registros contam por onde a Névoa entrou. O do Sino, o da Maré e o do Farol. Não concordam nos detalhes, e a porta da Sala dos Originais só abre para quem indicar o registro que não copiou de ninguém.

- **"Dois concordam entre si?"**
  > Sino e Farol contam quase a mesma coisa. Por muito tempo isso me bastou: dois contra um. Hoje eu queria saber de onde cada um veio antes de contar votos.
- **◆ Escuta atenta · "Como você organiza tudo isso?"** (15 XP)
  > Pela pergunta que o livro responde. Assunto engana: dois livros sobre a mesma febre podem responder perguntas que nem se conhecem.
- **"Eu entro."** (encerra)

> **Anselmo:** Cada registro deixou um rastro de tinta até a ficha de procedência. A olho nu não se vê. Ensino o truque ao seu Crivo, se ele deixar.
>
> **Narrador:** O Crivo arregala o olho, que por um momento fica do tamanho de um pires. Ele aprendeu a Lupa curiosa. [tecla do Crivo] usa a habilidade ativa; [tecla de troca] alterna entre lupa e pulso.
>
> **Anselmo:** A chave. Há Vultos entre as estantes: névoa mais velha, que sopra de longe antes de chegar perto. Ande de lado.

**Durante o Arquivo.** "Púlpitos no salão, fichas escondidas entre as estantes, alavancas na porta do fundo. Não confie em quantos dizem. Confie em quem estava lá."

**Fechando o Arquivo.**

> **Anselmo:** O Registro da Maré. Escrito no cais, na noite em que a névoa entrou, por quem estava lá. Os outros dois eram cópia, e um copiava o outro.
>
> **Anselmo:** Durante anos contei três registros a favor da mesma versão e dormi tranquilo. Eram um só, com dois ecos.
>
> **Anselmo:** As cópias ficam. Só ganharam uma etiqueta honesta. Heloísa quer ver você: é sobre o Observatório.

**Páginas em andamento.** Com páginas: "Você já tem [n] de seis páginas. Há três no Pátio, uma em cada região além dele." Sem nenhuma: "Páginas de um caderno antigo andam soltas por aí. Seis, ao todo. Se cruzar com alguma, eu gostaria de ver o caderno inteiro de novo."

**Entregando as seis páginas.**

> **Anselmo:** As seis. Inteiras. Sabe o que mais me agrada nelas? Nenhuma manda. Todas perguntam.
>
> **Anselmo:** Vou deixar o caderno aberto na mesa de entrada. E isto é para o seu companheiro: um laço. Ele pode usar ou não, o gosto é dele.

**Sem pendência.** "O caderno está aberto na mesa de entrada. Passe lá quando quiser. Ler não tem prazo."

### 8.5 Dalva

**Com a caixa no inventário.**

> **Dalva:** Minhas ferragens! Achei que a névoa tinha comido. Dobradiça boa não se acha em qualquer forja.
>
> **Dalva:** Para você, a banca fica mais barata. Não é favor: é conta. Quem devolve o que é dos outros merece preço justo.

**Depois de Íris mandar à ponte, sem a missão.** "Se for ao Bosque: uma caixa minha ficou do lado de lá quando a ponte fechou. Ferragens. Pesa, mas você tem cara de quem aguenta."

**Padrão.** "Conserto o que dá para consertar e aviso quando não dá. Quer ver a banca?"

Sempre termina com: **Ver a banca** / **Agora não**. Cabeçalho da banca: "Banca de Dalva · [n] moedas. O que dá para consertar, eu conserto."

### 8.6 Lia e o dossiê

**Primeira conversa.**

> **Lia:** Você é quem chegou com o Crivo? Eu sou Lia, toco o sino da Academia. Duzentos e doze degraus, todo dia, antes do sol.
>
> **Lia:** Faz dois meses que a escada roda quando eu subo. Aqui chamam de vertigem de torre. Não quero largar o sino. Só não quero cair da escada.
>
> **Narrador:** Este é um caso simulado. A condição, os tratamentos e os números são fictícios e não orientam nenhuma decisão de saúde real.

**Voltando sem decidir.** "Trouxe o dossiê? Eu espero. Prefiro decidir devagar a decidir duas vezes."

Opções: **Sentar com Lia e abrir o dossiê** / **Voltar depois**.

**Depois de decidir.** "Estou seguindo o que combinamos. Em quatro semanas a gente olha de novo, e muda se precisar." Opções: **Reabrir o dossiê (não rende experiência de novo)** / **Até lá**.

**O papel do dossiê (lado esquerdo).** Carimbo: "Caso simulado · dados fictícios". Título: "Uma decisão para Lia".

- **Resumo:** Lia, 34 anos, sineira da Academia. Há dois meses sente "vertigem de torre": tontura ao subir os 212 degraus do campanário. Condição e tratamentos inventados para o jogo.
- **Fala dela:** "Eu não quero largar o sino. Só não quero cair da escada."
- **Aviso:** Simulação não clínica. A condição, os tratamentos, os estudos e os números foram inventados para o jogo e não orientam nenhuma decisão de saúde real.
- **A pergunta:** Para uma adulta com vertigem de torre que trabalha em altura, a tintura de raiz-de-bruma, comparada a não usar, reduz as crises em oito semanas, e a que custo? (População: adultos com vertigem de torre. Intervenção: tintura de raiz-de-bruma, uso diário. Comparação: não usar a tintura, ou exercícios de equilíbrio. Desfechos: melhora das crises em 8 semanas, sonolência diurna, custo.)
- **O que importa para ela** (abre com "Perguntar o que importa para ela"): ficar alerta na torre importa mais do que a tontura passar rápido; não gosta de remédio diário, mas toma se fizer sentido; tem medo de perder o posto se pedir afastamento.
- **O que os estudos fictícios sugerem** (abre com "Ler o resumo da evidência"): sem tratar, cerca de 30 em cada 100 melhoraram em 8 semanas; com tintura, cerca de 42 em cada 100, 12 a mais, com a diferença podendo ir de nenhuma a mais até 24 a mais; com exercícios, cerca de 38 em cada 100, 8 a mais, faixa de 6 a menos até 22 a mais, vindo de acompanhamento sem sorteio. Fontes: *Ensaio dos Sineiros de Valmor (fictício)*, comparação com sorteio, 240 pessoas, 8 semanas, não incluiu quem trabalha em altura; *Cadernos da Vila sobre exercícios de equilíbrio (fictício)*, acompanhamento sem sorteio, 60 pessoas, 8 semanas, quem fazia os exercícios já era mais ativo, não registrou efeitos indesejados, "o que não é o mesmo que não haver".
- **O que pode custar** (abre com "Olhar o que a tintura cobra"): sonolência de dia em cerca de 6 em cada 100 sem tintura e 15 em cada 100 com ela, 9 a mais. Com "Perguntar sobre custo e acesso": a tintura custa 6 moedas por semana e o salário de sineira é 20; os exercícios são gratuitos, mas exigem três idas à Vila por semana, e a ponte andou fechada.
- **O estudo fala de gente como ela?** (abre com "Conferir quem estava no estudo"): o ensaio teve sorteio mas é pequeno, e a faixa inclui "não faz diferença"; não incluiu ninguém que trabalha em altura, e Lia trabalha; o dado dos exercícios vem de comparação sem sorteio.
- **O que não se sabe** (abre com "Dizer o que não se sabe"): se a tintura funciona em quem trabalha em altura; o efeito além de 8 semanas; os Cadernos não anotaram efeitos indesejados, e falta de registro não é prova de que não existam; os números descrevem grupos e não dizem o que vai acontecer com Lia.

**A mesa (lado direito).** Cabeçalho: "[ofício] · Aconselhar dentro da competência, encaminhar quando a opção exigir outro profissional e decidir junto com a pessoa." Título "Na mesa, com Lia". Cada ação muda o que se ouve:

| Ação | O que se ouve |
|---|---|
| (ao abrir) | "Eu não quero largar o sino. Só não quero cair da escada." |
| Perguntar o que importa para ela | "Importa eu continuar subindo. Se for para ficar lerda lá em cima, prefiro a tontura, que pelo menos eu conheço." |
| Ler o resumo da evidência | Você abre o resumo e lê os números em cada cem pessoas, não em porcentagem de melhora. |
| Olhar o que a tintura cobra | "Sonolência de dia? Eu trabalho numa escada de pedra, a sessenta metros." |
| Conferir quem estava no estudo | Você procura sineiros, telhadores, gente de altura. Não acha nenhum na lista de participantes. |
| Perguntar sobre custo e acesso | "Seis moedas por semana eu pago, apertando. Ir à Vila três vezes... depende da ponte, não é?" |
| Dizer o que não se sabe | Você diz em voz alta: ninguém estudou isso em quem trabalha em altura, nem além de oito semanas. Lia assente devagar. |

**"Pôr as opções na mesa e decidir com ela"** só conta com as preferências e ao menos benefício ou dano lidos:

- Sem nada: "Não sei escolher entre coisas que eu não entendi direito. E você ainda nem me perguntou o que pesa para mim."
- Só preferências: "Decidir junto eu quero. Mas entre o quê? Você ainda não me mostrou o que cada caminho dá e o que cobra."
- Com preferências e benefício, sem dano: "Entendi o que posso ganhar. Só não entendi ainda o que cada coisa me cobra. Você sabe?"
- Com preferências e dano: "Posta assim, eu começaria pelo que não me deixa lerda. Mas quero ouvir o que você faria no meu lugar, e por quê."

**"Decidir"**: "Nenhuma opção é o gabarito. Cada uma cobra uma coisa diferente." Uma opção sem os passos que a sustentam pede confirmação: "Antes de fechar: você ainda não [passos que faltam]. Dá para decidir assim mesmo; acione a opção de novo para confirmar."

| Opção | Rótulo por ofício | Detalhe | Fica frágil sem | Nota se frágil | Nota se defensável |
|---|---|---|---|---|---|
| Tintura | Medicina: "Iniciar a tintura, com retorno em 4 semanas". Nutrição, Psicologia, Fisioterapia: "Encaminhar à boticária para avaliar a tintura, com uma carta sua". Enfermagem: "Levar o caso à boticária e acompanhar o início da tintura". Aprendiz: "Pedir à sua supervisora que avalie a tintura com Lia". | Benefício possível, com sonolência como preço provável para algumas pessoas. | danos, preferências | A opção é defensável, mas foi escolhida sem pesar a sonolência com alguém que sobe uma torre todo dia. Era a informação que mais importava para ela. | Opção defensável: vocês pesaram o ganho incerto contra a sonolência e combinaram rever em quatro semanas. |
| Exercícios | Enfermagem e Fisioterapia: "Exercícios de equilíbrio e diário de crises, com retorno em 4 semanas". Medicina, Nutrição, Psicologia: "Encaminhar para exercícios de equilíbrio e pedir um diário de crises". Aprendiz: "Sugerir, com sua supervisora, exercícios de equilíbrio e um diário de crises". | Nenhuma sonolência a mais registrada; evidência mais incerta e três viagens à Vila por semana. | custo | A opção é defensável, mas ninguém perguntou se ela consegue ir à Vila três vezes por semana. Um plano que não cabe na vida da pessoa tende a ficar no papel. | Opção defensável: evita o efeito que ela mais teme, e você perguntou pelas idas à Vila. A resposta dela ficou condicionada à ponte; vale combinar o que fazer se as viagens não couberem. |
| Esperar | "Esperar com diário de crises e rever em 4 semanas" (todos) | Sem custo e sem efeito a mais; cerca de 30 em 100 melhoram em 8 semanas sem fazer nada. | preferências | Esperar é defensável, mas foi decidido sem saber o quanto as crises pesam para ela hoje. Esperar tem custo quando a pessoa está com medo de cair. | Opção defensável: ela preferiu observar, sabendo o que as crises pesam hoje. O dossiê não chegou a combinar o que fazer se piorar antes do retorno; numa consulta de verdade, esse combinado faz parte de esperar. |

**Devolutiva.** "O que você fez · avaliado à parte do que aconteceu." Lista os sete passos de processo (Perguntou o que importa para a pessoa; Leu o resumo da evidência em números absolutos; Considerou os danos, e não só o benefício; Verificou se o estudo incluía gente como ela; Considerou custo e acesso; Disse em voz alta o que não se sabe; Decidiu junto, e não por ela). Depois, "8 semanas depois · inclui acaso", com um destes desfechos sorteados:

- Melhorou sem dano: "Desta vez, ela melhorou. Isso sozinho não prova que a escolha foi a melhor: parte de quem não faz nada também melhora."
- Dano numa opção que não acrescenta dano: "[Ela melhorou / Desta vez não houve melhora perceptível], e teve sonolência de dia. Nesta opção isso não vem do tratamento: cerca de 6 em cada 100 pessoas têm o mesmo sem tratar nada."
- Melhorou com dano: "Ela melhorou e teve sonolência de dia. Benefício e dano não se excluem, e não dá para saber, numa pessoa só, se o efeito veio do tratamento ou viria de qualquer jeito."
- Sem melhora, com dano: "Desta vez não houve melhora e apareceu sonolência de dia. Um desfecho ruim não torna ruim, por si só, uma decisão bem conduzida."
- Sem melhora, sem dano: "Desta vez não houve melhora perceptível. Acontece com boa parte das pessoas em qualquer das opções."

"Como o desfecho foi sorteado" (expansível): o desfecho é sorteado para as mesmas 8 semanas dos estudos, e o retorno em 4 semanas é conversa no meio do caminho; primeiro sorteia a chance real dentro da faixa de incerteza, depois o desfecho; a faixa dos exercícios é mais larga porque o estudo não teve sorteio; a sonolência também acontece em quem não toma nada. Fecha com: "A experiência que você recebe vem do processo ([n] pontos), não do desfecho. Refazer o caso com outra escolha não paga de novo."

### 8.7 Noêmia

**Primeira conversa.**

> **Noêmia:** Não ventou naquela noite. Fiquei no terraço até amanhecer e os estandartes não mexeram um dedo.
>
> **Noêmia:** O Tomé jura que ventou a noite inteira. Um de nós está errado, e eu estava acordada.

**Em andamento.** "Os estandartes não mexeram. Vá ver o canto do terraço, se duvida."

**Fechando a missão (depois de examinar os dois lugares).**

> **Noêmia:** Então ventou no beco e não ventou no terraço. A torre leste corta o vento antes de ele chegar aqui em cima.
>
> **Noêmia:** Passei três dias chamando o Tomé de exagerado. Ele passou três dias me chamando de distraída. Os dois tinham razão sobre o pedaço que viram.
>
> **Noêmia:** Fique com esta lupa. Não aumenta o objeto. Aumenta o que está em volta dele, que era o que nos faltava.

**Depois.** "Agora, antes de discordar de alguém, eu pergunto de onde a pessoa estava olhando."

### 8.8 Tomé

**Primeira conversa.**

> **Tomé:** Ventou do norte a noite inteira. Apagou os lampiões do beco um por um. Eu sei porque reacendi todos, três vezes.
>
> **Tomé:** A Noêmia diz que não ventou. Ela fica lá no alto, no terraço, vendo estrela. Eu fico no chão, com o pavio na mão.

**Em andamento.** "Vá ao fundo do beco e olhe a cera das velas. Cera não mente."

**Depois.** "Ventou no beco, não ventou no terraço. Quem diria que cabia tudo na mesma noite."

### 8.9 Conversas de ofício (personagens da história)

Aparecem uma vez, no fim de uma conversa sem pendência de missão, como pergunta opcional (a outra opção é "Até logo."). Cada uma abre um verbete e rende 15 XP.

**Heloísa · "Como você decide para onde mandar alguém?"** (verbete Pergunta com quatro campos)
> Quando chega alguém dizendo "tem um problema na ponte", eu pergunto quatro coisas. Quem é? O que se pretende fazer? Em comparação com quê? E o que, exatamente, você diria que deu certo?
>
> Parece burocracia. Mas pergunta com os quatro campos preenchidos diz onde procurar e quando parar de procurar. Pergunta com um campo em branco me faz andar o dia inteiro.

**Íris · "O que você leva nas cartas?"** (verbete Cartas que chegam)
> Tudo que me entregam. O problema é o que não me entregam. Carta boa sai logo, com selo bonito. Carta ruim fica na gaveta, ou nem chega a ser escrita.
>
> No fim do mês, quem lê só o que eu entreguei conclui que o mundo vai muito bem. Eu aprendi a perguntar na estrada: quem não mandou carta, e por quê?

**Anselmo · "Como você escolhe o que entra no Arquivo?"** (verbete A mesma estante, duas vezes)
> Escrevo a pergunta primeiro. Depois escrevo o que vou aceitar e o que vou recusar, antes de abrir a primeira estante, para não ajustar o critério ao livro que me agradou.
>
> Procuro em mais de um lugar e anoto o que descartei, com o motivo. A prova de que fiz direito é outra pessoa refazer e chegar ao mesmo lugar. Se só eu chego lá, é opinião com bibliografia.

**Dalva · "Você mede tudo duas vezes?"** (verbete A trena que mente sempre igual)
> Duas vezes, sempre. A segunda diz se a minha mão é caprichosa. Mas tem um erro que a segunda medida não pega: a trena que mente sempre para o mesmo lado dá a mesma resposta nas duas.
>
> Para isso eu tenho uma régua de bronze que era do meu pai e que eu confio. Medir de novo e conferir com um padrão são coisas diferentes.

**Noêmia · "Você anota o frio todas as noites?"** (verbete Depois da pior noite)
> Todas. E reparei em uma coisa chata: depois da pior noite do mês vem quase sempre uma menos pior, mesmo quando ninguém fez nada.
>
> Se eu acender um braseiro justo na pior noite, vou jurar que foi o braseiro. Por isso eu deixo algumas noites ruins sem braseiro, só para comparar. Dá peso na consciência e dá resposta.

**Tomé · "Quantos lampiões fazem uma rua mais segura?"** (verbete Quantos lampiões por um tropeço)
> Fiz uma conta no caderno, com números que inventei para treinar. Em cem noites sem lampião, dez tropeços. Em cem com lampião, seis. Diferença de quatro em cem.
>
> Para evitar um tropeço a mais eu preciso acender em 25 noites, porque cem dividido por quatro dá vinte e cinco. Se eu disser só que o lampião "reduz 40% dos tropeços", parece mais, e esconde de onde parti.

### 8.10 Moradores

Ordem de cada conversa: saudação; assunto (completo na primeira vez, com gesto; depois só a última linha); fala de andamento conforme o estado do mundo; despedida, com aceno.

**Frei Bartolomeu · Monge arquivista · Arquivo**
- Saudação: Fale baixo. Não pelos livros: pelas fichas. Elas se assustam fácil e se perdem.
- Assunto: Cada registro aqui tem uma ficha presa na lombada: quem escreveu, quando, a mando de quem e quem copiou depois. / Um livro sem ficha não é falso. Só não sabemos o quanto confiar nele. Eu guardo as duas coisas juntas.
- Antes do Arquivo: Dizem que o Anselmo vai abrir a porta para alguém novo. Se for você, leia as fichas antes das páginas.
- Depois do Arquivo: Você voltou da Sala dos Originais com a roupa cheirando a vela. Bom sinal. Quem desce lá e volta inteiro aprendeu a perguntar de onde veio.
- Depois do Veredito: O Observatório se calou. Passei a noite refazendo fichas que a névoa tinha apagado. Algumas voltaram com outra data.
- Despedida: Vá com cuidado. E devolva o que pegar no lugar exato. Exato.

**Custódia · Acendedora de lampiões · Pátio**
- Saudação: Cuidado com o pavio. Ainda está quente, e eu ainda estou de mau humor.
- Assunto: Toda noite alguém perde uma chave no beco e procura embaixo do lampião. Não porque caiu ali: porque ali dá para ver. / Eu acendo os do canto escuro primeiro. Se só iluminarmos onde já é fácil olhar, o resto do beco fica parecendo vazio.
- Antes do Arquivo: O Tomé reacendeu metade do beco ontem e jura que ventou. Eu só sei que a cera escorreu para o mesmo lado em todos.
- Depois do Arquivo: Desde que o Arquivo abriu, os lampiões duram mais. Pode ser o óleo novo. Pode ser que agora alguém anota quanto dura.
- Depois do Veredito: Amanheceu de verdade hoje. Apaguei tudo mais cedo e fiquei olhando a rua sem sombra nenhuma. Estranho de bonito.
- Despedida: Se encontrar uma chave, deixe na escada. Alguém vai procurar embaixo do lampião.

**Severino · Vigia da catedral · Observatório**
- Saudação: Alto. Ah, é você. A lanterna não mente, mas os olhos deste velho já mentiram muito.
- Assunto: Trinta anos nesta escada. Contei todo mundo que desceu da torre e me contou como foi bom subir. / Quem não desceu não me contou nada. A minha conta só tem quem voltou, e por isso parece tão boa.
- Antes do Arquivo: Lá em cima as portas não cedem. Nem para mim. Fico aqui, guardando uma entrada que ninguém usa.
- Depois do Arquivo: Ouvi passos na grade de cima pela primeira vez em anos. Se forem seus, ande mais devagar no terceiro lance. Range.
- Depois do Veredito: O terraço está quieto. Quieto demais, para quem passou a vida ouvindo aquilo respirar. Ainda assim, durmo melhor.
- Despedida: Volte antes de a lanterna apagar. Eu conto quem volta.

**Dona Amélia · Viúva da estalagem · Pátio**
- Saudação: Entre, tire a chuva dos ombros. Quarto não tenho, mas tenho caldo e opinião.
- Assunto: O livro de hóspedes só tem elogio. Lindo de ler. Só que quem detestou a sopa foi embora sem escrever nada. / Por isso eu pergunto na porta, para todo mundo, antes de sair. Dá mais trabalho e dói mais. Mas é a sopa de verdade.
- Antes do Arquivo: A ponte fechada esvaziou a casa. Quem atravessa hoje é só quem já ia atravessar de qualquer jeito.
- Depois do Arquivo: Tem gente nova no Pátio desde que o Arquivo abriu. Fazem perguntas compridas e comem pouco.
- Depois do Veredito: Depois daquela noite no Observatório, todo mundo jantou junto pela primeira vez. Ninguém escreveu no livro. Melhor assim.
- Despedida: Leve um pão. Não aceito recusa, só devolução de cesta.

**Rosário · Enfermeira da neve · Observatório**
- Saudação: Aqui no alto o frio chega antes. Fique perto do braseiro enquanto conversamos.
- Assunto: Na estrada de cima, antes de qualquer remédio, eu pergunto o que a pessoa quer conseguir fazer amanhã. / Um quer subir a escada sozinho. Outro quer só dormir sem tossir. O mesmo número no termômetro, dois cuidados diferentes.
- Antes do Arquivo: Ninguém sobe para a Academia ainda. Fico aqui com a maleta pronta, por hábito.
- Depois do Arquivo: Os braseiros da estrada voltaram a acender. Alguém tem atravessado o frio com pressa. Coma alguma coisa, sim?
- Depois do Veredito: O frio continua, mas agora é só frio. Dá para cuidar de frio.
- Despedida: Volte inteiro. E se não voltar inteiro, volte mesmo assim.

**Inácio · Noviço do coro · Observatório**
- Saudação: Ah. Desculpe, eu estava ensaiando baixinho. Não ensaio alto desde que o mestre ouviu.
- Assunto: O mestre me corrige depois de cada ensaio ruim, e no seguinte eu canto melhor. Ele acha que é a bronca. / Mas depois de um ensaio muito ruim, o próximo quase sempre é menos ruim, com bronca ou sem. Eu contei. Não tive coragem de mostrar.
- Antes do Arquivo: O coro não sobe mais para o terraço. Cantamos aqui embaixo e o som não volta do mesmo jeito.
- Depois do Arquivo: O mestre pediu para eu anotar os ensaios numa folha. Acho que ele leu a minha conta escondida. Ou adivinhou.
- Depois do Veredito: Cantamos lá em cima ontem, ao amanhecer. Errei a entrada. Ninguém ralhou. Na segunda vez, acertei.
- Despedida: Se ouvir alguém desafinando na escada, sou eu. Finja que não.

**Glória · Herbalista dos cogumelos · Bosque**
- Saudação: Não pise no musgo violeta. Ele brilha mais quando está irritado.
- Assunto: Vendo chá de cogumelo para quem não dorme. Na terceira noite, todos me agradecem. / Só que na terceira noite muita gente dormiria de qualquer jeito, de puro cansaço. Agora dou o chá para metade e chá de folha comum para a outra metade. Ainda não sei o resultado.
- Antes do Arquivo: A trilha anda cheia de fiapos. Eles gostam do mesmo úmido que os cogumelos, e não pagam pelo que pisam.
- Depois do Arquivo: A ponte voltou a esticar e os viajantes trazem esporos de longe. Separei os de fora numa prateleira só deles.
- Depois do Veredito: Contei as duas metades. A diferença foi menor do que eu queria. Continuo vendendo, mas parei de prometer.
- Despedida: Leve isto no bolso. Não cura nada. Só cheira bem.

**Matias · Cartógrafo ferroviário · Bosque**
- Saudação: Viajante! Fique parado um instante. Estou medindo a sua sombra.
- Assunto: Este mapa foi feito para os trens. Mostra cada trilho com perfeição e não mostra um único atalho a pé. / Mapa bom é mapa feito para a pergunta de quem vai usar. Para outra pergunta, o mesmo mapa erra com toda a confiança.
- Antes do Arquivo: A margem leste ficou sem ponte e sem trem. Desenho o que lembro, e lembrar não é medir.
- Depois do Arquivo: Com a ponte de volta, refiz a margem leste. Achei dois caminhos que o mapa antigo jurava não existir.
- Depois do Veredito: Comecei um mapa novo, só de onde a névoa ainda se junta. É pequeno. Gosto que seja pequeno.
- Despedida: Se achar um trilho que não está aqui, venha me contar. Com passos contados, de preferência.

**Dito · Órfão da torre dos sinos · Pátio**
- Saudação: Você tem cara de quem sobe torre. Eu subo. Toda manhã. Mais rápido que a Lia.
- Assunto: Ontem o sino deu treze badaladas. Treze! Corri contar para todo mundo que a torre estava assombrada. / Hoje deu doze. Anteontem, doze. A Lia diz que uma manhã só não prova assombração. Eu acho que prova um pouquinho.
- Antes do Arquivo: Ninguém deixa eu subir na Academia. Diz que é perigoso. Perigoso é ficar aqui sem nada para fazer.
- Depois do Arquivo: Contei as badaladas a semana toda. Doze em todas. Talvez a de treze fosse eco. Talvez eu tenha contado o pombo.
- Depois do Veredito: Agora eu anoto num caderno. Se der treze outra vez, eu tenho prova. Uma. Pequena.
- Despedida: Tchau! Se o sino tocar treze, foi a torre, não fui eu.

**Professor Aurélio · Professor aposentado · Arquivo**
- Saudação: Sente-se, se achar onde. Os livros ocuparam todas as cadeiras por mérito.
- Assunto: Ensinei a mesma coisa por quarenta anos com toda a certeza do mundo. Os alunos anotavam tudo, porque era eu. / Ano passado um deles me trouxe um estudo novo que me desmentia. Fiquei furioso uma tarde e grato o resto da semana.
- Antes do Arquivo: O Anselmo ainda não abriu o Arquivo para os novos. Fez bem. Primeiro aprendam a desconfiar de mim.
- Depois do Arquivo: Você desceu aos Originais? Então já sabe: o livro mais antigo nem sempre é o primeiro a dizer a verdade.
- Depois do Veredito: Reescrevi minhas aulas. Metade continua igual. A outra metade agora começa com "achávamos que".
- Despedida: Discorde de mim pelo menos uma vez antes de ir embora. Faz bem para nós dois.

**Vera · Detetive mascarada · Pátio**
- Saudação: Não olhe para a máscara. Olhe para o que eu estou olhando.
- Assunto: Toda vez que some uma lanterna no Pátio, o mesmo carregador está por perto. A vizinhança já decidiu quem é. / Ele está por perto porque carrega lanternas o dia inteiro. Estar sempre no lugar não é a mesma coisa que causar.
- Antes do Arquivo: A névoa no Bosque tem padrão. Ainda não sei qual. Sei que não é o carregador.
- Depois do Arquivo: Os registros do Arquivo resolveram dois casos meus. Nenhum do jeito que eu esperava.
- Depois do Veredito: O Veredito caiu e todo mundo quer um culpado para a névoa. Eu queria primeiro saber o que ela tinha em comum.
- Despedida: Se vir alguma coisa, anote quando e onde. Opinião eu já tenho de sobra.

**Celeste · Acólita da catedral · Observatório**
- Saudação: Que a luz seja branda com você. O incenso é só para o frio, não se preocupe.
- Assunto: Quem vem à catedral quer conselho. Eu poderia recitar o que os livros dizem e mandar para casa. / Prefiro perguntar primeiro o que a pessoa pode, o que ela quer e o que ela teme. O livro entra depois, como terceira voz na conversa.
- Antes do Arquivo: A catedral está fechada lá em cima. Rezo aqui na estrada, onde o vento leva o incenso embora.
- Depois do Arquivo: Ouvi dizer que você subiu ao Observatório. Se tiver medo do que achar, vá assim mesmo. Medo também é informação.
- Depois do Veredito: Abrimos a catedral ao amanhecer. Veio menos gente do que eu esperava, e todos ficaram mais tempo.
- Despedida: Vá em paz. E pergunte antes de aconselhar alguém. Sempre.

---

## 9. Textos de objetos

### 9.1 Pátio dos Caminhos

- **Esfera armilar da fonte:** Os anéis de bronze nunca se alinham por muito tempo. Na borda, alguém gravou: "medir é escolher o que deixar de fora".
- **Portão sul:** O portão dá para a área de membros. Do lado de lá, os corredores de Estudar e Comunidade seguem como sempre.
- **Estandartes do terraço (Vento):** O canto leste do terraço fica à sombra da torre. Os estandartes daqui pendem parados, com poeira antiga nas dobras. Deste lado, o vento não chega.
- **Velas do beco (Vento):** O beco corre de norte a sul entre dois paredões. Mesmo agora passa uma corrente de ar constante, e a cera das velas escorreu toda para o lado sul.
- Examinar um dos dois antes de ouvir as duas versões: "Anotado. Falta ouvir as duas versões para isso fazer sentido."

### 9.2 Bosque da Confusão

- **Ruína:** No lintel caído, quase apagado: "Passou sempre. Logo, passará." Alguém riscou a segunda frase com a ponta de uma faca.
- **Baú da clareira, antes de limpar:** A névoa em volta ainda se mexe. Enquanto houver quem a guarde, a tampa não cede.
- **Baú da clareira, ao abrir:** Dentro, um lacre de cera verde, ainda morno. No verso, alguém escreveu: "viajante a pé, carga leve, sob névoa". É a descrição de quem atravessa hoje.
- **Os três mecanismos** (o jogo lê "[nome]. Na placa de bronze: [inscrição]" e depois o que está ao pé):

| Mecanismo | Inscrição | Ao pé dele |
|---|---|---|
| Mecanismo da roda | "Calibrado com carroças carregadas, em tempo seco." | Ao pé dele, meio enterrado, um aro de roda partido. |
| Mecanismo do passo (o certo) | "Calibrado com quem atravessa a pé, de carga leve, sob névoa." | Ao pé dele, um par de solas gastas e um lampião de neblina sem vidro. |
| Mecanismo do galope | "Calibrado com cavaleiros a galope, ao meio-dia." | Ao pé dele, uma ferradura que a ferrugem ainda não venceu. |

  - Sem selo: Há um encaixe redondo, do tamanho de um lacre. Você não tem nada que caiba nele.
  - Opções: "Encaixar o Selo do Contexto aqui" / "Ler os outros antes".
  - Errado: O mecanismo gira, range e devolve o selo. A ponte estremece e não sai do lugar. Ele funciona; só responde a outro tipo de viajante. (Primeira vez: "O rangido chamou atenção. Um Fiapo se desprende da névoa do abismo.")
  - Certo: O selo assenta com um estalo. Do abismo sobem lajes de pedra, uma a uma, e a ponte se estende até a outra margem. / Nenhum dos três mecanismos estava quebrado. A ponte parou porque ninguém perguntou quem estava atravessando.
  - Depois, no certo: O selo está encaixado. O mecanismo gira sem esforço. Nos outros: Este não está quebrado. Só foi feito para outra pessoa.
- **Marco:** antes da ponte, "Um marco de pedra com um pavio seco. Parece esperar alguma coisa."; ao acender, "O pavio pega de primeira. A luz sobe pelo marco, e do outro lado do abismo a névoa recua alguns passos, como quem reconhece que perdeu a vez."; depois, "O marco arde baixo e constante. Dá para vê-lo do Pátio."
- **Grade da margem leste:** fechada, "Uma grade de ferro com tranca antiga. Do lado de dentro, um baú." / "Três caminhos possíveis: a habilidade Atalhos, uma gazua (a banca da Dalva, no Pátio, vende uma), ou o muro leste, onde as pedras caíram e os caixotes ajudam a subir." Por dentro: "Por dentro a tranca é só um ferrolho. Ele corre, e a grade abre para fora." Com gazua: "A gazua encontra o pino solto na segunda tentativa. Quem confere a tranca em vez de supor que ela está boa abre o que os outros contornam." Com Atalhos: "A tranca tinha um pino solto, como quase toda tranca que ninguém confere. A grade abre."
- **Baú das botas:** Um par de botas com nove ilhós de cada lado. A etiqueta avisa: "pontos de vista para considerar, não lista para marcar". (Botas de Bradford e Maça da Diferença Absoluta)

### 9.3 Arquivo das Perguntas

- **Caderno da entrada:** O caderno de entrada lista os livros pela pergunta que respondem: "Para quem?", "Comparado com o quê?", "Medido como?". Não há coluna para "assunto".
- **Os três púlpitos:**
  - Registro do Sino: "A névoa entrou pelo arco norte, à terceira badalada." A letra é limpa demais para quem escrevia de madrugada. Um fio de tinta parece escorrer do púlpito para as estantes do oeste.
  - Registro da Maré: "Entrou pelo cais, rente à água, antes de qualquer sino. Eu estava amarrando o barco." A página tem manchas de sal. Um fio de tinta parece seguir para as estantes do leste.
  - Registro do Farol: "A névoa entrou pelo arco norte, à terceira badalada, e era espessa e má." Quase as mesmas palavras do Sino, com adjetivos a mais. Um fio de tinta parece seguir para o fundo, ao norte.
- **Fichas de procedência** (texto no inventário):
  - Sino: "Transcrito do Registro da Maré, sem conferência." Carimbo: cópia.
  - Maré: "Anotado no cais, na noite em que a névoa entrou, por quem estava lá." Carimbo: original.
  - Farol: "Resumo do Registro do Sino, com acréscimos do copista." Carimbo: cópia de cópia.
  - Com as três: dica "O Crivo aponta · Três fichas. Leia os carimbos no inventário antes de escolher a alavanca."
- **Alavancas:** Alavanca do [registro]. Na porta, em letras fundas: "Abre para o registro que não copiou de ninguém". Com menos de três fichas: "Você tem [n] de três fichas de procedência. Dá para puxar assim mesmo, mas seria palpite." Errada: "A alavanca desce, a porta geme e volta. Em algum lugar da sala ao lado, algo repete o gemido, mais alto." Certa sem as três fichas: "A porta cede. Você acertou sem ter lido as três fichas: desta vez o palpite coincidiu com a procedência. As fichas que faltam ainda dizem por quê." Certa: "O Registro da Maré foi escrito no cais por quem estava lá. Sino e Farol concordavam entre si porque um copiava o outro." Depois: "Alavanca do [registro]. A porta já está aberta."
- **Eco derrotado:** "O Eco se calou. O fundo da sala ficou visível."
- **Baú da lanterna:** Uma lanterna de latão que ilumina o resultado e o caminho até ele. Equipada no inventário, mostra inscrições que a penumbra apagou.

### 9.4 Observatório do Acaso

- **Inscrição do parapeito:** sem a Lanterna, "Há algo gravado no parapeito, apagado pela chuva e pela penumbra. Com a luz certa, talvez desse para ler."; com a Lanterna, "À luz da lanterna, a gravação aparece: 'Quando ele recita, está indefeso por dentro. Interrompa-o nessa hora e cada golpe vale por mais.'"
- **Lua:** Daqui de cima a lua tem uma mancha escura bem no meio, redonda como uma pupila. Na Academia chamavam isso de olho único: uma lua que olha uma coisa de cada vez e, por isso, não se deixa convencer pelo céu inteiro. O Crivo fica parado, encarando. A lua parece conferir a mesma soma que ele.
- **Braseiros:**
  - Estrada: O braseiro da estrada. Aceso, ilumina o caminho da Vila: quem espera do outro lado atravessa esta noite. O terraço fica no escuro.
  - Terraço: O braseiro do terraço. Aceso, mostra o lugar onde o Veredito espera: você enxerga o que enfrenta. A estrada da Vila fica no escuro mais uma noite.
  - Sem óleo: Sem óleo, ele não pega.
  - Opções: "Acender o braseiro da [estrada/terraço]" / "Olhar o outro antes".
  - Ao acender a estrada: A chama sobe e, lá embaixo, a estrada da Vila aparece em âmbar. O terraço à sua frente continua tomado pela névoa. Você vai lutar sem ver direito.
  - Ao acender o terraço: A chama sobe e o terraço se abre à vista, pedra por pedra. Lá embaixo, a estrada da Vila continua escura. Alguém vai esperar mais uma noite.
  - Em ambos: Não havia escolha certa. Havia duas escolhas com contas diferentes para pagar. A grade do terraço se abre.
  - Depois: no aceso, "O braseiro arde. O óleo era para um só."; no apagado, "Este ficou apagado. Foi uma escolha, não um esquecimento."
- **Baú do pingente** (depois do Veredito): Duas hastes e um ponto no meio. O ponto chama a atenção; quem conta a história são as hastes.

### 9.5 Placas do Passeio dos Mestres (Pátio)

- JAMES LIND (1716 · 1794). Em 1747, a bordo do Salisbury, separou doze marinheiros com escorbuto em seis duplas e deu um tratamento diferente a cada uma. Quem recebeu laranjas e limões melhorou. A comparação foi a ideia.
- FLORENCE NIGHTINGALE (1820 · 1910). Contou as mortes dos hospitais da Crimeia e as desenhou em um diagrama que ninguém conseguia ignorar. A maior parte vinha de doença evitável, não de ferida.
- IGNAZ SEMMELWEIS (1818 · 1865). Em Viena, em 1847, ligou a febre das parturientes às mãos que vinham da autópsia. Mandou lavar com cloro e as mortes diminuíram. Os colegas pediram um porquê que ele ainda não tinha.
- RONALD FISHER (1890 · 1962). Defendeu que a ordem dos tratamentos seja sorteada. O exemplo do livro era uma senhora que jurava saber se o chá fora posto antes do leite.
- AUSTIN BRADFORD HILL (1897 · 1991). Estatístico de um dos primeiros ensaios randomizados modernos e autor de nove pontos de vista para pensar em causa. Ele mesmo dizia que não eram uma lista de verificação.
- ARCHIE COCHRANE (1909 · 1988). Pediu que os serviços de saúde fossem avaliados por ensaios e que alguém resumisse todos eles, por especialidade, de tempos em tempos. A Colaboração Cochrane leva o nome dele.
- DAVID SACKETT (1934 · 2015). Definiu a medicina baseada em evidências como a melhor evidência atual, a perícia de quem cuida e a vontade de quem é cuidado, juntas. Nenhuma das três decide sozinha.
- DOUG ALTMAN (1948 · 2018). Chamou de escândalo o tanto de pesquisa mal feita e mal relatada, e ajudou a criar as listas que dizem o que um estudo precisa contar para ser julgado.

Cada placa abre o verbete correspondente no códice, com contexto, nota e referência (texto integral em `src/content/data.ts`, grupo Mestres).

### 9.6 Estantes de obras (Arquivo)

- EBM WORKING GROUP · 1992: Um periódico aberto em 1992: o grupo de trabalho propõe ensinar a prática por perguntas, busca e avaliação crítica, e não por decoreba.
- ENKIN · KEIRSE · CHALMERS · 1989: Um volume grosso de revisões sobre gravidez e parto. Cada capítulo diz o que ajuda, o que atrapalha e o que ainda ninguém testou.
- GREENHALGH · COMO LER UM ARTIGO: Uma série transformada em livro. A primeira pergunta é qual era a pergunta do estudo. Os números ficam para depois.
- GIGERENZER · RISCO EM CEM PESSOAS: Dois cartões lado a lado: um diz "10%", o outro diz "10 em cada 100". Quase todo mundo entende melhor o segundo.
- IOANNIDIS · 2005: Um artigo marcado de lápis por muitos leitores. Diz que estudos pequenos, flexíveis e com muito em jogo tendem a produzir achados que não se confirmam.
- CENTRO COCHRANE DO BRASIL · 1996: Uma placa de fundação: em 1996 o Centro Cochrane do Brasil começou a reunir e a traduzir revisões sistemáticas para o português.

### 9.7 Focos apagados (faixa na tela)

- **O foco da clareira:** Parecia crescer a cada noite. Contado de novo, era do tamanho de sempre: as noites piores é que ficavam na memória. Quem mede no pior dia vê melhora em qualquer coisa que fizer depois.
- **O foco do salão:** Na estante, só as vozes que concordavam. As que discordavam estavam no chão, sem capa e sem número. Quem lê só o que foi guardado acha que todo mundo concordou.
- **O foco do terraço:** Toda vez que o vento soprava, a névoa subia, e o vento levou a culpa. Mas as noites de vento eram as noites frias, e era o frio que trazia a névoa. Duas coisas juntas não querem dizer que uma fez a outra.

---

## 10. Final e epílogo

**Tela de fim** (depois da última fala de Heloísa no Veredito). Rótulo "Fim do primeiro caminho", título **"A Névoa ficou do tamanho certo."**:

1. A ponte voltou a responder a quem atravessa, o registro do cais está na estante certa e o Observatório tem, de novo, mais perguntas do que sentenças.
2. O que vem agora: a missão Focos Residuais. Três grupos maiores de inimigos voltaram, um no Bosque, um no Arquivo e um no Observatório. Apague os três e conte a Heloísa o que eles tinham em comum.
3. Se houver paralelas abertas: "Ainda em aberto: [lista]. O Diário mostra onde cada uma começa." Se não: "Todas as missões paralelas estão fechadas. Os segredos de cada região continuam onde estavam."
4. Uma capa esmeralda para o Crivo espera você em Habilidades. Ele vai fingir que não gostou.

Botão: "Continuar explorando o Pátio". O jogo segue aberto.

**Variações do final:** só as duas da escolha do braseiro (fala de Heloísa e conversa de Íris, ver 2.4). Não há final ruim nem final alternativo de campanha.

**Epílogo jogável:** Focos Residuais, falas de andamento "depois do Veredito" dos 12 moradores, Heloísa ("Bom dia. Faz tempo que eu não dizia isso aqui com o céu concordando."), Íris conforme o braseiro, o baú do pingente no Observatório.

**Derrota** (não é final): rótulo "A névoa fechou", título "Você perdeu o fio.", texto "Nada do que você aprendeu ou recolheu foi perdido. O Crivo leva você de volta ao último ponto seguro registrado, com a vida refeita." Botão "Retomar o caminho". Depois: "A Névoa ficou com [n] moedas."

---

## 11. Códice: verbetes de mundo e de método

Grupos: Mundo, Método, Pessoas, Criaturas, Mestres, Obras. Mundo, Criaturas e Pessoas estão acima. Os de método, com corpo e nota "Para quem quiser saber mais":

| Verbete | Como abre | Corpo | Nota |
|---|---|---|---|
| Pátio dos Caminhos | Fim da chegada | Dois arcos, uma fonte, uma escadaria. O arco do oeste diz "conhece-te a ti mesmo" e leva ao Arquivo. O do leste diz "entre amigos, tudo é comum" e levava, até a ponte fechar, à estrada da Vila. / A esfera armilar da fonte nunca se alinha por muito tempo. Os alunos antigos chamam isso de calibragem. | — |
| Para quem a ponte foi feita | Ponte estendida | A Ponte das Conclusões tem três mecanismos. Cada um foi calibrado com um tipo de viajante. Nenhum está quebrado: cada um responde bem a quem se parece com quem o calibrou. / A ponte parou porque ninguém perguntou quem estava atravessando. | Um resultado obtido em um grupo pode não valer do mesmo jeito para outro. Isso se chama aplicabilidade, ou validade externa. A pergunta útil é: as pessoas do estudo se parecem, no que importa, com a pessoa na minha frente? |
| Cópia de cópia | Porta dos Originais | Três registros contavam a mesma noite com detalhes diferentes. Dois eram cópias, e um deles copiava o outro. O terceiro foi escrito por quem estava no cais. / Três vozes repetindo a mesma fonte não são três confirmações. | Antes de somar relatos, vale perguntar de onde cada um veio. Fontes que dependem umas das outras contam como uma. |
| Um frasco, dois braseiros | Acender um braseiro | No alto do Observatório havia óleo para um braseiro só. Um iluminava o caminho da Vila. O outro, o lugar onde o Veredito esperava. / Não havia escolha certa. Havia duas escolhas com contas diferentes para pagar. | Quase toda decisão em saúde gasta algo que não volta: tempo, dinheiro, disposição. Dizer o que se perde com cada opção faz parte de decidir bem. |
| Página solta · A pergunta | Página 1 (Pátio) | "Funciona?" não é pergunta. Funciona para quem, comparado com o quê, medido como, em quanto tempo? Enquanto isso não estiver escrito, qualquer resposta serve, e é esse o problema. | Uma pergunta clínica costuma dizer quem são as pessoas, qual é a intervenção, com o que ela é comparada e quais desfechos importam. |
| Página solta · O acaso | Página 2 (Pátio, beco) | "Joguei a moeda dez vezes e deu sete caras. Passei a tarde explicando por quê. À noite joguei de novo e deu quatro." | Parte do que se observa em um estudo pequeno é variação ao acaso. Por isso resultados vêm com uma faixa de valores compatíveis, e não só com um número. |
| Página solta · Em cada cem | Página 3 (Pátio, terraço) | "Disseram que o risco caía pela metade. Perguntei: metade de quanto? Era de dois em cem para um em cem. Continua sendo metade. Só deixou de ser manchete." | O mesmo efeito pode ser dito de forma relativa ("metade") ou absoluta ("um a menos em cada cem"). Para decidir, a forma absoluta costuma ajudar mais. |
| Página solta · A terceira coisa | Página 4 (Bosque) | "Nos dias em que o sineiro leva guarda-chuva, a ponte fica escorregadia. Proibiram o guarda-chuva. A ponte continuou escorregadia. Chovia." | Quando duas coisas andam juntas, pode haver uma terceira por trás das duas. Isso se chama confundimento, e é uma das razões para comparar grupos com cuidado. |
| Página solta · A ferramenta e a pergunta | Página 5 (Arquivo) | "Perguntaram ao bibliotecário qual era o melhor tipo de estudo. Ele perguntou de volta: melhor para responder o quê?" | Não existe uma escada fixa de estudos do pior ao melhor. O desenho adequado depende da pergunta, e a confiança depende também de viés, precisão, consistência e de quão direto é o caminho até a pessoa em questão. |
| Página solta · Duas cadeiras | Página 6 (Observatório) | "A evidência dizia uma coisa. A senhora dizia outra. Demorei a entender que não estavam discutindo o mesmo assunto: uma falava de média, a outra da própria vida." | Decisão compartilhada junta três coisas: o que os estudos sugerem, o que é viável naquele contexto e o que a pessoa valoriza. Nenhuma das três decide sozinha. |
| Pergunta com quatro campos | Ofício de Heloísa | Quem? O que se pretende fazer? Em comparação com quê? E o que, exatamente, contaria como deu certo? Heloísa pergunta essas quatro coisas antes de mandar alguém a qualquer lugar. / Pergunta com os quatro campos preenchidos diz o que procurar, onde procurar e quando parar. | Em PBE isso aparece como PICO: população, intervenção, comparação e desfecho (outcome). É um jeito de formular perguntas clínicas respondíveis; não é a única estrutura possível, e perguntas sobre prognóstico ou experiência pedem outras. |
| Cartas que chegam | Ofício de Íris | Íris só entrega as cartas que lhe dão. Carta boa chega rápido. Carta ruim se perde na estrada, ou ninguém chega a escrever. / Quem lê só as cartas entregues conclui que o mundo vai bem. | Estudos com resultado favorável tendem a ser publicados mais cedo e com mais frequência do que os neutros ou desfavoráveis. Isso se chama viés de publicação. Quem faz revisão sistemática procura também o que não foi publicado, e há métodos (como o gráfico de funil) que ajudam a suspeitar da falta, com limites conhecidos. |
| A mesma estante, duas vezes | Ofício de Anselmo | Anselmo escreve a pergunta e o que vai aceitar ou recusar antes de abrir a primeira estante. Procura em mais de um lugar. Anota o que descartou e por quê. / A ideia é que outra pessoa, refazendo, chegue ao mesmo lugar. | É o que distingue uma revisão sistemática de uma revisão narrativa: pergunta e critérios definidos antes, busca ampla, avaliação do risco de viés de cada estudo e síntese explícita. O tamanho da revisão não é o que a define. |
| A trena que mente sempre igual | Ofício de Dalva | Dalva mede duas vezes. A segunda medida mostra se a trena é caprichosa. Se a trena mente sempre para o mesmo lado, só uma régua conhecida denuncia. / Repetir a medida e calibrar o instrumento resolvem problemas diferentes. | Precisão é o quanto medidas repetidas se parecem. Exatidão é o quanto elas se aproximam do valor verdadeiro. Um instrumento pode ser preciso e inexato, e só a comparação com um padrão mostra isso. |
| Depois da pior noite | Ofício de Noêmia | Noêmia anota o frio do terraço. Percebeu que depois da pior noite do mês costuma vir uma menos ruim, mesmo quando ninguém fez nada. / Se ela acendesse um braseiro justo na pior noite, juraria que foi o braseiro. | Valores extremos tendem a ser seguidos por valores menos extremos por acaso. É a regressão à média. Quem trata no pior momento corre o risco de atribuir ao tratamento o que foi a volta ao habitual, e é por isso que se compara com um grupo sem a intervenção. |
| Quantos lampiões por um tropeço | Ofício de Tomé | Conta fictícia de Tomé: em cem noites sem lampião houve 10 tropeços na rua; em cem noites com lampião, 6. A diferença é de 4 em 100. Para evitar um tropeço a mais, ele precisa acender lampiões em 25 noites, porque 100 dividido por 4 dá 25. / Números inventados para o exemplo. Servem só para mostrar a conta. | É o número necessário para tratar (NNT): o inverso da diferença absoluta de risco. Só significa algo para um desfecho, um período e uma população definidos, e é mais fácil de entender que um risco relativo, que esconde o tamanho do ponto de partida. |

Os verbetes de Mestres (8) e Obras (6) trazem corpo, nota e referência bibliográfica; o texto integral está em `src/content/data.ts` e não foi repetido aqui para não dobrar o tamanho do documento. Cada morador também ganha um verbete em Pessoas com papel e a última linha do assunto.

---

## 12. Itens com texto narrativo

### 12.1 Consumíveis, ferramentas e itens de missão

| Item | Tipo | Como se obtém | Descrição | Efeito |
|---|---|---|---|---|
| Caldo da cantina | Consumível | Início, chão, banca (14) | Quente, salgado e honesto. A cantina não promete nada além disso. | Recupera fôlego; efeito de jogo, sem pretensão clínica |
| Limão de Lind | Consumível | Banca (16) | Um entre seis tratamentos testados no convés do Salisbury. Foi o que deu certo. | Recupera fôlego e todo o vigor |
| Xícara de Fisher | Consumível | Banca (12) | Chá antes do leite, ou leite antes do chá? Alguém sorteou a ordem antes de servir você. | Recarrega a habilidade do Crivo |
| Selo da Pergunta | Consumível | Banca (18), presente de Íris | Um lacre com quatro campos em branco. Quem pergunta direito já andou metade do caminho. | O Crivo aponta o segredo mais próximo |
| Gazua de conferência | Missão | Banca (35) | Duas hastes finas de aço. Não força nada: só confere, pino por pino, o que a tranca diz que é. | Abre grades sem Atalhos |
| Lupa do Contexto | Ferramenta | Missão do Vento | Não aumenta o objeto. Aumenta o que está em volta dele. | Mostra examináveis de longe |
| Lanterna da Transparência | Ferramenta | Sala dos Originais | Ilumina o método junto com o resultado. Algumas inscrições só aparecem assim. | Luz própria, revela inscrições |
| Bússola de Cochrane | Ferramenta | Seis obras do Arquivo | Não aponta para o norte. Aponta para onde as provas já foram reunidas, e não para onde alguém gostaria que estivessem. | +25% de moedas |
| Botas de Bradford | Calçado | Baú da grade, Bosque | Nove ilhós de cada lado. A etiqueta avisa: "são pontos de vista para considerar, não uma lista para marcar". | +8% de velocidade |
| Capa da Parcimônia | Traje | Banca (110) | Sem bolsos sobrando, sem costura à toa. O que não precisa estar, não está. | Esquiva e golpes 20% mais baratos |
| Avental de Semmelweis | Traje | Banca (120) | Lavado antes e depois. A bacia vem junto, e a pergunta também: o que mudou de fato? | −10% de dano recebido |
| Pingente do Intervalo | Amuleto | Baú do Observatório, pós-Veredito | Duas hastes e um ponto no meio. O ponto chama atenção, mas quem conta a história são as hastes. | −12% de dano recebido |
| Anel do Duplo-Cego | Amuleto | Passeio dos Mestres | Dois anéis idênticos, e nem o ourives lembra qual é qual. Serve para lembrar que quem avalia não deveria saber o que está avaliando. | +10% de dano |
| Ponteira de latão | Melhoria | Banca (75) | Dalva torneou a peça para o seu cajado. Pesa pouco e decide muito. | +6 leve, +10 firme |
| Selo do Contexto | Missão | Baú da clareira | Cera verde, ainda morna. No verso: "viajante a pé, carga leve, sob névoa". É a descrição de quem atravessa hoje. | Encaixa num mecanismo da ponte |
| Fichas de procedência (3) | Missão | Estantes do Arquivo, com a Lupa | Ver 9.3 | Peças do enigma |
| Frasco de óleo de lamparina | Missão | Heloísa | Um frasco. Dá para um braseiro, não para dois. | Acende um braseiro |
| Encomenda de Dalva | Missão | Margem leste do Bosque | Caixa de ferragens que ficou do outro lado quando a ponte fechou. | Entregar a Dalva |

### 12.2 Armas e armaduras

| Peça | Raridade | Como se obtém | Descrição | Ideia |
|---|---|---|---|---|
| Estoque do Aprendiz | Comum | Início | Lâmina reta, fina, sem enfeite. Serve a quem ainda está aprendendo a perguntar antes de golpear. | A pergunta vem antes da resposta |
| Facão da Amostra de Conveniência | Comum | Banca (45), queda de Fiapo | Pega o que estiver à mão. Num dia corta fundo, no outro mal arranha, e ninguém sabe dizer por quê. | Amostra de conveniência e variabilidade |
| Sabre do Desfecho Registrado | Incomum | Banca (130), queda de Fiapo/Vulto | Gravado na lâmina, antes da primeira luta, está o nome do único alvo que importa. | Desfecho primário registrado antes do estudo |
| Adaga do Intervalo Estreito | Rara | Queda de Vulto/Eco | Curta e exata. O golpe cai quase sempre no mesmo lugar, e às vezes no lugar certo. | Precisão e intervalo de confiança estreito |
| Maça da Diferença Absoluta | Rara | Baú da grade, queda de Vulto | Não promete porcentagens. Diz quanto tira, e tira exatamente isso. | Risco absoluto antes do relativo |
| Machado do Número Necessário | Épica | Primeira queda do Eco | No cabo, três entalhes. Nem todo golpe decide; um em cada três decide por todos. | NNT |
| Martelo da Síntese | Épica | Queda do Eco | Pesado como uma revisão inteira. Não escolhe um alvo: junta todos os que estão em volta. | Revisão sistemática e síntese |
| Estoque da Replicação | Lendária | Primeira queda do Veredito | Forjado duas vezes, por ferreiros que nunca se encontraram. As duas lâminas saíram iguais. | Replicação independente |
| Gibão do Sigilo de Alocação | Incomum | Banca (95), queda | Couro escuro, costuras por dentro. Quem olha de fora não adivinha o que vem. | Sigilo da alocação |
| Cota da Amostra Grande | Rara | Banca (230), queda | Milhares de elos pequenos. Nenhum sozinho protege muito; juntos, o acaso quase não passa. | Tamanho de amostra e erro aleatório |
| Armadura do Protocolo | Épica | Focos Residuais, queda do Veredito | Cada placa foi desenhada antes da batalha e nenhuma foi trocada no meio dela. | Protocolo publicado antes do estudo |

### 12.3 Habilidades (texto de cada nó)

Pessoa jogadora. Exploração: Passo firme ("Correr deixa de ser pressa e vira hábito."), Olho de coletor ("Você repara no que os outros pisam em cima."), Atalhos ("Toda grade tem uma tranca que alguém esqueceu de conferir."). Interação: Escuta atenta ("Você deixa a pessoa terminar a frase."), Pergunta aberta ("'O que mais?' costuma render mais do que 'é isso?'."), Anotações de campo ("O que não foi anotado tende a virar certeza."). Encontros: Fôlego ("Escada de torre, todo dia, sem reclamar."), Esquiva limpa ("Sair do caminho também é uma decisão."), Golpe decidido ("Um golpe só, no momento em que cabe.").

Crivo. Observação: Farejar pistas ("O olho do Crivo vira para o que merece um segundo olhar."), Lupa curiosa ("Por alguns segundos, o que estava escondido deixa de estar."), Contraste ("Duas pistas lado a lado dizem o que nenhuma diz sozinha."). Suporte: Pulso de atenção ("Um piscar que faz a névoa perder o fio da meada."), Pulso amplo ("O piscar chega mais longe e volta mais cedo."), Abrigo ("O Crivo se põe na frente. Uma vez. Depois precisa de um tempo."). Exploração: Rastro do contexto ("O Crivo acha a passagem que só faz sentido para quem conhece o lugar."), Faro de moedas ("Brilho pequeno, olho grande."), Olhar compartilhado (bloqueado: "Disponível quando a cooperação chegar.").

Com Contraste, ao examinar um objeto o narrador acrescenta: "O Crivo põe esta pista ao lado da anterior. Antes: [texto anterior]".

---

## 13. Textos de interface com voz narrativa

- Pausa: "O Pátio espera."
- Diário vazio: "Nada anotado ainda. Converse com quem está no Pátio. O que você aceitar investigar fica registrado aqui, sem prazo." Cabeçalho: "Sem cronômetro, sem ordem obrigatória entre as paralelas."
- Descanso no marco: "Fôlego recuperado e caminho registrado. O que a névoa deixou pelo caminho pode ter voltado."
- Dica do Crivo sem pendência: "O Crivo olha em volta, sem pressa. Não há nada pendente; fale com quem está por perto." Com pista fora de vista: "Ele inclina o corpo: desta vez, a pista não está à vista. Procure com calma."
- Abrigo do Crivo: "O Crivo se pôs na frente. Ele precisa de um tempo antes de fazer isso de novo."
- Dificuldades: História ("Para ler o mundo sem pressa. Criaturas mais fracas, avisos longos e curas generosas."), Fácil ("Um jogo de ação tranquilo. Os encontros pedem atenção, mas perdoam erros."), Médio ("Pede esforço. Explorar, fazer as missões paralelas e se equipar antes de cada seção faz diferença."), Difícil ("Pouca margem de erro. Até as criaturas comuns ameaçam: atacam em dupla, emendam golpes e mordem forte. Para quem domina a esgrima.").
- Dicas de carregamento com voz de mundo: "Nenhuma missão tem cronômetro. Ler com calma nunca é penalizado." / "Um desfecho ruim não torna ruim, por si só, uma decisão bem conduzida." / "Três vozes repetindo a mesma fonte não são três confirmações." (as demais são de controle).

---

## 14. Resumo de recompensas narrativas

| Marco | Recompensa |
|---|---|
| Chegada | 20 XP |
| Cada pergunta ◆ Escuta atenta (Heloísa, Íris, Anselmo) | 15 XP |
| Cada conversa de ofício (6) | 15 XP e um verbete |
| Ponte estendida / Ponte concluída | 60 XP / 120 XP, 30 moedas, 1 ponto do Crivo |
| Porta dos Originais / Arquivo concluído | 60 XP / 160 XP, 40 moedas, 1 ponto do Crivo |
| Braseiro / Veredito concluído | 50 XP / 300 XP, 80 moedas, 1 ponto do Crivo, capa do Crivo |
| Focos Residuais | 220 XP, 120 moedas, 1 ponto do Crivo, Armadura do Protocolo |
| Lia | 15 moedas e XP do processo |
| Vento | 80 XP, Lupa do Contexto |
| Encomenda | 70 XP, 20 moedas, desconto |
| Páginas | 90 XP, 1 ponto do Crivo, laço do Crivo |
| Mestres | 10 XP por placa, 120 XP e Anel do Duplo-Cego |
| Obras | 10 XP por obra, 100 XP e Bússola de Cochrane |
| Presente de Íris (estrada acesa) | 60 moedas, 2 Selos da Pergunta |

---

## 15. Planejado, não implementado

Tudo abaixo está no `DOCUMENTO_MATRIZ_INTERPRETE_RPG_v0_1.md` e não existe no jogo.

- **Vila das Escolhas.** Região social com missões opcionais sobre valores, preferências, custo e viabilidade. No jogo, a Vila é só uma estrada de luzes vista do Observatório e o destino de Íris.
- **Estrutura em atos** (Prólogo, Ato I Perceber, Ato II Contrastar, Ato III Decidir, Epílogo). A campanha segue essa progressão em espírito, mas os atos não têm nome nem marcação no jogo.
- **Sopro de Clareza.** Habilidade do Crivo para reduzir um efeito de confusão do ambiente, marcada como fase futura.
- **Olhar Compartilhado e cooperação** (2 a 4 pessoas, cada uma com seu Crivo, escolhas clínicas por consenso). No jogo, o nó existe e está bloqueado.
- **Participações de pessoas reais (cameos).** Só com autorização explícita de nome, imagem, voz e falas. Nenhuma existe.
- **"Mestres convidados fictícios"** que ofereceriam desafios. No jogo os mestres são bustos de pessoas reais falecidas, sem fala.
- **Cartógrafa** como tipo de NPC principal. No jogo existe Matias, cartógrafo ferroviário, como morador.
- **Recompensa da ponte** prevista na matriz como "item mais primeiro nó da árvore do Crivo". No jogo a ponte dá XP, moedas e um ponto do Crivo; a Lupa vem de Anselmo.
- **Casos clínicos de publicação** (sintéticos mas plausíveis, com referências auditadas e revisão profissional). Só existe o caso fictício de Lia, versão 0.2.0, sem revisão clínica independente.
- **Emotes e cor de detalhes do Crivo.** Só laço e capa existem.

---

## 16. Inconsistências encontradas na exportação

Registro do que não bate entre fontes; nada foi corrigido no código.

- `docs/game/ESPECIFICACAO_DE_JOGO.md` chama Heloísa de "mestra da Academia"; no jogo ela é "Guardiã do Pátio".
- A mesma especificação ainda diz "dois níveis de dificuldade, Padrão e História"; o jogo tem quatro (História, Fácil, Médio, Difícil).
- A matriz usa "Átrio dos Caminhos"; o jogo usa "Pátio dos Caminhos" (o id interno continua `atrio`).
- A dica do passo 3 do Arquivo cita "tecla Q, alternando com R" fixo, enquanto o resto do jogo mostra a tecla remapeada.
- O verbete "Página solta · A pergunta" termina com uma aspa de fechamento sobrando (`é esse o problema."`).
- O códice da Ponte diz que o arco leste "levava, até a ponte fechar, à estrada da Vila", mas a estrada da Vila aparece no Observatório, a oeste; a geografia da Vila não é fixada em lugar nenhum.
- A Ponteira de latão fala em "cajado", mas a arma do jogo é um estoque (espada).
