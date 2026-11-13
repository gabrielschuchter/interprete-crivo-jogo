/**
 * Moradores do elenco PS2 (bíblia de personagens NPC_01 a NPC_12). Todos fictícios; nenhum representa pessoa real.
 * Cada um tem quatro tempos de fala: saudação, assunto do ofício, reação ao andamento da história e despedida.
 * O assunto do ofício carrega um jeito de pensar com evidência como coisa do mundo, nunca como pergunta de prova.
 */
import type { Action } from '../entities/figure';

export interface Morador {
  id: string;
  nome: string;
  papel: string;
  /** chave do modelo em public/models/manifest.json */
  modelo: string;
  altura: number;
  saudacao: string;
  assunto: string[];
  /** [antes do Arquivo, depois do Arquivo, depois do Veredito] */
  andamento: [string, string, string];
  despedida: string;
  gestoAssunto: Action;
}

export const MORADORES: Record<string, Morador> = {
  bartolomeu: {
    id: 'bartolomeu', nome: 'Frei Bartolomeu', papel: 'Monge arquivista', modelo: 'npc_01_arquivista', altura: 1.84,
    saudacao: 'Fale baixo. Não pelos livros: pelas fichas. Elas se assustam fácil e se perdem.',
    assunto: [
      'Cada registro aqui tem uma ficha presa na lombada: quem escreveu, quando, a mando de quem e quem copiou depois.',
      'Um livro sem ficha não é falso. Só não sabemos o quanto confiar nele. Eu guardo as duas coisas juntas.',
    ],
    andamento: [
      'Dizem que o Anselmo vai abrir a porta para alguém novo. Se for você, leia as fichas antes das páginas.',
      'Você voltou da Sala dos Originais com a roupa cheirando a vela. Bom sinal. Quem desce lá e volta inteiro aprendeu a perguntar de onde veio.',
      'O Observatório se calou. Passei a noite refazendo fichas que a névoa tinha apagado. Algumas voltaram com outra data.',
    ],
    despedida: 'Vá com cuidado. E devolva o que pegar no lugar exato. Exato.',
    gestoAssunto: 'point',
  },
  custodia: {
    id: 'custodia', nome: 'Custódia', papel: 'Acendedora de lampiões', modelo: 'npc_02_acendedora', altura: 1.62,
    saudacao: 'Cuidado com o pavio. Ainda está quente, e eu ainda estou de mau humor.',
    assunto: [
      'Toda noite alguém perde uma chave no beco e procura embaixo do lampião. Não porque caiu ali: porque ali dá para ver.',
      'Eu acendo os do canto escuro primeiro. Se só iluminarmos onde já é fácil olhar, o resto do beco fica parecendo vazio.',
    ],
    andamento: [
      'O Tomé reacendeu metade do beco ontem e jura que ventou. Eu só sei que a cera escorreu para o mesmo lado em todos.',
      'Desde que o Arquivo abriu, os lampiões duram mais. Pode ser o óleo novo. Pode ser que agora alguém anota quanto dura.',
      'Amanheceu de verdade hoje. Apaguei tudo mais cedo e fiquei olhando a rua sem sombra nenhuma. Estranho de bonito.',
    ],
    despedida: 'Se encontrar uma chave, deixe na escada. Alguém vai procurar embaixo do lampião.',
    gestoAssunto: 'point',
  },
  severino: {
    id: 'severino', nome: 'Severino', papel: 'Vigia da catedral', modelo: 'npc_03_vigia', altura: 1.86,
    saudacao: 'Alto. Ah, é você. A lanterna não mente, mas os olhos deste velho já mentiram muito.',
    assunto: [
      'Trinta anos nesta escada. Contei todo mundo que desceu da torre e me contou como foi bom subir.',
      'Quem não desceu não me contou nada. A minha conta só tem quem voltou, e por isso parece tão boa.',
    ],
    andamento: [
      'Lá em cima as portas não cedem. Nem para mim. Fico aqui, guardando uma entrada que ninguém usa.',
      'Ouvi passos na grade de cima pela primeira vez em anos. Se forem seus, ande mais devagar no terceiro lance. Range.',
      'O terraço está quieto. Quieto demais, para quem passou a vida ouvindo aquilo respirar. Ainda assim, durmo melhor.',
    ],
    despedida: 'Volte antes de a lanterna apagar. Eu conto quem volta.',
    gestoAssunto: 'shrug',
  },
  amelia: {
    id: 'amelia', nome: 'Dona Amélia', papel: 'Viúva da estalagem', modelo: 'npc_04_estalajadeira', altura: 1.6,
    saudacao: 'Entre, tire a chuva dos ombros. Quarto não tenho, mas tenho caldo e opinião.',
    assunto: [
      'O livro de hóspedes só tem elogio. Lindo de ler. Só que quem detestou a sopa foi embora sem escrever nada.',
      'Por isso eu pergunto na porta, para todo mundo, antes de sair. Dá mais trabalho e dói mais. Mas é a sopa de verdade.',
    ],
    andamento: [
      'A ponte fechada esvaziou a casa. Quem atravessa hoje é só quem já ia atravessar de qualquer jeito.',
      'Tem gente nova no Pátio desde que o Arquivo abriu. Fazem perguntas compridas e comem pouco.',
      'Depois daquela noite no Observatório, todo mundo jantou junto pela primeira vez. Ninguém escreveu no livro. Melhor assim.',
    ],
    despedida: 'Leve um pão. Não aceito recusa, só devolução de cesta.',
    gestoAssunto: 'shrug',
  },
  rosario: {
    id: 'rosario', nome: 'Rosário', papel: 'Enfermeira da neve', modelo: 'npc_05_enfermeira', altura: 1.66,
    saudacao: 'Aqui no alto o frio chega antes. Fique perto do braseiro enquanto conversamos.',
    assunto: [
      'Na estrada de cima, antes de qualquer remédio, eu pergunto o que a pessoa quer conseguir fazer amanhã.',
      'Um quer subir a escada sozinho. Outro quer só dormir sem tossir. O mesmo número no termômetro, dois cuidados diferentes.',
    ],
    andamento: [
      'Ninguém sobe para a Academia ainda. Fico aqui com a maleta pronta, por hábito.',
      'Os braseiros da estrada voltaram a acender. Alguém tem atravessado o frio com pressa. Coma alguma coisa, sim?',
      'O frio continua, mas agora é só frio. Dá para cuidar de frio.',
    ],
    despedida: 'Volte inteiro. E se não voltar inteiro, volte mesmo assim.',
    gestoAssunto: 'point',
  },
  inacio: {
    id: 'inacio', nome: 'Inácio', papel: 'Noviço do coro', modelo: 'npc_06_novico', altura: 1.6,
    saudacao: 'Ah. Desculpe, eu estava ensaiando baixinho. Não ensaio alto desde que o mestre ouviu.',
    assunto: [
      'O mestre me corrige depois de cada ensaio ruim, e no seguinte eu canto melhor. Ele acha que é a bronca.',
      'Mas depois de um ensaio muito ruim, o próximo quase sempre é menos ruim, com bronca ou sem. Eu contei. Não tive coragem de mostrar.',
    ],
    andamento: [
      'O coro não sobe mais para o terraço. Cantamos aqui embaixo e o som não volta do mesmo jeito.',
      'O mestre pediu para eu anotar os ensaios numa folha. Acho que ele leu a minha conta escondida. Ou adivinhou.',
      'Cantamos lá em cima ontem, ao amanhecer. Errei a entrada. Ninguém ralhou. Na segunda vez, acertei.',
    ],
    despedida: 'Se ouvir alguém desafinando na escada, sou eu. Finja que não.',
    gestoAssunto: 'shrug',
  },
  gloria: {
    id: 'gloria', nome: 'Glória', papel: 'Herbalista dos cogumelos', modelo: 'npc_07_herbalista', altura: 1.63,
    saudacao: 'Não pise no musgo violeta. Ele brilha mais quando está irritado.',
    assunto: [
      'Vendo chá de cogumelo para quem não dorme. Na terceira noite, todos me agradecem.',
      'Só que na terceira noite muita gente dormiria de qualquer jeito, de puro cansaço. Agora dou o chá para metade e chá de folha comum para a outra metade. Ainda não sei o resultado.',
    ],
    andamento: [
      'A trilha anda cheia de fiapos. Eles gostam do mesmo úmido que os cogumelos, e não pagam pelo que pisam.',
      'A ponte voltou a esticar e os viajantes trazem esporos de longe. Separei os de fora numa prateleira só deles.',
      'Contei as duas metades. A diferença foi menor do que eu queria. Continuo vendendo, mas parei de prometer.',
    ],
    despedida: 'Leve isto no bolso. Não cura nada. Só cheira bem.',
    gestoAssunto: 'point',
  },
  matias: {
    id: 'matias', nome: 'Matias', papel: 'Cartógrafo ferroviário', modelo: 'npc_08_cartografo', altura: 1.72,
    saudacao: 'Viajante! Fique parado um instante. Estou medindo a sua sombra.',
    assunto: [
      'Este mapa foi feito para os trens. Mostra cada trilho com perfeição e não mostra um único atalho a pé.',
      'Mapa bom é mapa feito para a pergunta de quem vai usar. Para outra pergunta, o mesmo mapa erra com toda a confiança.',
    ],
    andamento: [
      'A margem leste ficou sem ponte e sem trem. Desenho o que lembro, e lembrar não é medir.',
      'Com a ponte de volta, refiz a margem leste. Achei dois caminhos que o mapa antigo jurava não existir.',
      'Comecei um mapa novo, só de onde a névoa ainda se junta. É pequeno. Gosto que seja pequeno.',
    ],
    despedida: 'Se achar um trilho que não está aqui, venha me contar. Com passos contados, de preferência.',
    gestoAssunto: 'point',
  },
  dito: {
    id: 'dito', nome: 'Dito', papel: 'Órfão da torre dos sinos', modelo: 'npc_09_orfao', altura: 1.3,
    saudacao: 'Você tem cara de quem sobe torre. Eu subo. Toda manhã. Mais rápido que a Lia.',
    assunto: [
      'Ontem o sino deu treze badaladas. Treze! Corri contar para todo mundo que a torre estava assombrada.',
      'Hoje deu doze. Anteontem, doze. A Lia diz que uma manhã só não prova assombração. Eu acho que prova um pouquinho.',
    ],
    andamento: [
      'Ninguém deixa eu subir na Academia. Diz que é perigoso. Perigoso é ficar aqui sem nada para fazer.',
      'Contei as badaladas a semana toda. Doze em todas. Talvez a de treze fosse eco. Talvez eu tenha contado o pombo.',
      'Agora eu anoto num caderno. Se der treze outra vez, eu tenho prova. Uma. Pequena.',
    ],
    despedida: 'Tchau! Se o sino tocar treze, foi a torre, não fui eu.',
    gestoAssunto: 'wave',
  },
  aurelio: {
    id: 'aurelio', nome: 'Professor Aurélio', papel: 'Professor aposentado', modelo: 'npc_10_professor', altura: 1.74,
    saudacao: 'Sente-se, se achar onde. Os livros ocuparam todas as cadeiras por mérito.',
    assunto: [
      'Ensinei a mesma coisa por quarenta anos com toda a certeza do mundo. Os alunos anotavam tudo, porque era eu.',
      'Ano passado um deles me trouxe um estudo novo que me desmentia. Fiquei furioso uma tarde e grato o resto da semana.',
    ],
    andamento: [
      'O Anselmo ainda não abriu o Arquivo para os novos. Fez bem. Primeiro aprendam a desconfiar de mim.',
      'Você desceu aos Originais? Então já sabe: o livro mais antigo nem sempre é o primeiro a dizer a verdade.',
      'Reescrevi minhas aulas. Metade continua igual. A outra metade agora começa com "achávamos que".',
    ],
    despedida: 'Discorde de mim pelo menos uma vez antes de ir embora. Faz bem para nós dois.',
    gestoAssunto: 'shrug',
  },
  vera: {
    id: 'vera', nome: 'Vera', papel: 'Detetive mascarada', modelo: 'npc_11_detetive', altura: 1.68,
    saudacao: 'Não olhe para a máscara. Olhe para o que eu estou olhando.',
    assunto: [
      'Toda vez que some uma lanterna no Pátio, o mesmo carregador está por perto. A vizinhança já decidiu quem é.',
      'Ele está por perto porque carrega lanternas o dia inteiro. Estar sempre no lugar não é a mesma coisa que causar.',
    ],
    andamento: [
      'A névoa no Bosque tem padrão. Ainda não sei qual. Sei que não é o carregador.',
      'Os registros do Arquivo resolveram dois casos meus. Nenhum do jeito que eu esperava.',
      'O Veredito caiu e todo mundo quer um culpado para a névoa. Eu queria primeiro saber o que ela tinha em comum.',
    ],
    despedida: 'Se vir alguma coisa, anote quando e onde. Opinião eu já tenho de sobra.',
    gestoAssunto: 'point',
  },
  celeste: {
    id: 'celeste', nome: 'Celeste', papel: 'Acólita da catedral', modelo: 'npc_12_acolita', altura: 1.62,
    saudacao: 'Que a luz seja branda com você. O incenso é só para o frio, não se preocupe.',
    assunto: [
      'Quem vem à catedral quer conselho. Eu poderia recitar o que os livros dizem e mandar para casa.',
      'Prefiro perguntar primeiro o que a pessoa pode, o que ela quer e o que ela teme. O livro entra depois, como terceira voz na conversa.',
    ],
    andamento: [
      'A catedral está fechada lá em cima. Rezo aqui na estrada, onde o vento leva o incenso embora.',
      'Ouvi dizer que você subiu ao Observatório. Se tiver medo do que achar, vá assim mesmo. Medo também é informação.',
      'Abrimos a catedral ao amanhecer. Veio menos gente do que eu esperava, e todos ficaram mais tempo.',
    ],
    despedida: 'Vá em paz. E pergunte antes de aconselhar alguém. Sempre.',
    gestoAssunto: 'listen',
  },
};
