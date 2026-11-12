import type { EquipSlot, ProfessionId, SkillDef } from '../domain/state';
import type { ClinicalCase } from '../domain/clinical';

export const CONTENT_VERSION = '0.1.0';

// ---------- profissões ----------

export interface ProfessionDef {
  id: ProfessionId;
  name: string;
  line: string;
  tool: string;
  coat: number;
}

/** Seis casacos, os mesmos na criação, no jogo e no salvamento. O ofício só escolhe qual vem marcado. */
export const COAT_COLORS = [0x4a1830, 0x1c2f45, 0x1f3d35, 0x3a2a4a, 0x4a3420, 0x2b2b33];

/** Nenhuma profissão é superior às outras: mudam falas, casos e um objeto de ofício. */
export const PROFESSIONS: ProfessionDef[] = [
  { id: 'nutricao', name: 'Nutrição', line: 'Você pesa o que as pessoas comem contra o que elas conseguem manter.', tool: 'Caderno de porções', coat: 0x4a1830 },
  { id: 'medicina', name: 'Medicina', line: 'Você aprendeu que prescrever é a parte fácil. Difícil é saber quando não.', tool: 'Estetoscópio de latão', coat: 0x1c2f45 },
  { id: 'enfermagem', name: 'Enfermagem', line: 'Você é quem vê a pessoa às três da manhã, quando o plano encontra a realidade.', tool: 'Relógio de bolso', coat: 0x1f3d35 },
  { id: 'psicologia', name: 'Psicologia', line: 'Você escuta o que foi dito e repara no que ficou de fora.', tool: 'Bloco de escuta', coat: 0x3a2a4a },
  { id: 'fisioterapia', name: 'Fisioterapia', line: 'Você mede melhora em degraus subidos, não em promessas.', tool: 'Fita métrica', coat: 0x4a3420 },
  { id: 'aprendiz', name: 'Aprendiz', line: 'Você ainda não escolheu um ofício. Aqui isso não é defeito.', tool: 'Caderno em branco', coat: 0x2b2b33 },
];

export function professionName(id: ProfessionId): string {
  return PROFESSIONS.find((p) => p.id === id)?.name ?? 'Aprendiz';
}

// ---------- itens ----------

export type ItemType = 'consumivel' | 'ferramenta' | 'equipamento' | 'missao' | 'melhoria';

export interface ItemDef {
  id: string;
  name: string;
  type: ItemType;
  slot?: EquipSlot;
  desc: string;
  effect: string;
  ref?: string;
  price?: number;
  glyph: string;
}

export const ITEMS: Record<string, ItemDef> = {
  caldo: {
    id: 'caldo', name: 'Caldo da cantina', type: 'consumivel', glyph: 'caldo', price: 14,
    desc: 'Quente, salgado e honesto. A cantina não promete nada além disso.',
    effect: 'Recupera 45 de fôlego de aventura. Efeito de jogo, sem pretensão clínica.',
  },
  selo_pergunta: {
    id: 'selo_pergunta', name: 'Selo da Pergunta', type: 'consumivel', glyph: 'selo', price: 18,
    desc: 'Um lacre com quatro campos em branco. Quem pergunta direito já andou metade do caminho.',
    effect: 'O Crivo aponta o segredo ainda não encontrado mais próximo nesta região.', ref: 'Pergunta estruturada',
  },
  lupa_contexto: {
    id: 'lupa_contexto', name: 'Lupa do Contexto', type: 'ferramenta', slot: 'ferramenta', glyph: 'lupa',
    desc: 'Não aumenta o objeto. Aumenta o que está em volta dele.',
    effect: 'Equipada: mostra de longe objetos examináveis e dobra o alcance de interação.', ref: 'Aplicabilidade',
  },
  lanterna_transparencia: {
    id: 'lanterna_transparencia', name: 'Lanterna da Transparência', type: 'ferramenta', slot: 'ferramenta', glyph: 'lanterna',
    desc: 'Ilumina o método junto com o resultado. Algumas inscrições só aparecem assim.',
    effect: 'Equipada: luz própria em lugares escuros e revela inscrições apagadas.', ref: 'Transparência e reprodutibilidade',
  },
  botas_bradford: {
    id: 'botas_bradford', name: 'Botas de Bradford', type: 'equipamento', slot: 'calcado', glyph: 'botas',
    desc: 'Nove ilhós de cada lado. A etiqueta avisa: "são pontos de vista para considerar, não uma lista para marcar".',
    effect: 'Equipadas: +8% de velocidade ao andar e correr.',
    ref: 'Homenagem aos pontos de vista de Austin Bradford Hill (1965) sobre associação e causalidade',
  },
  capa_parcimonia: {
    id: 'capa_parcimonia', name: 'Capa da Parcimônia', type: 'equipamento', slot: 'traje', glyph: 'capa', price: 110,
    desc: 'Sem bolsos sobrando, sem costura à toa. O que não precisa estar, não está.',
    effect: 'Equipada: esquiva e golpes custam 20% menos vigor.', ref: 'Parcimônia',
  },
  pingente_intervalo: {
    id: 'pingente_intervalo', name: 'Pingente do Intervalo', type: 'equipamento', slot: 'amuleto', glyph: 'pingente',
    desc: 'Duas hastes e um ponto no meio. O ponto chama atenção, mas quem conta a história são as hastes.',
    effect: 'Equipado: reduz em 12% o dano recebido.', ref: 'Imprecisão',
  },
  anel_duplo_cego: {
    id: 'anel_duplo_cego', name: 'Anel do Duplo-Cego', type: 'equipamento', slot: 'amuleto', glyph: 'pingente',
    desc: 'Dois anéis idênticos, e nem o ourives lembra qual é qual. Serve para lembrar que quem avalia não deveria saber o que está avaliando.',
    effect: 'Equipado: +10% de dano nos golpes.', ref: 'Mascaramento, ou cegamento, em ensaios clínicos',
  },
  jaleco_semmelweis: {
    id: 'jaleco_semmelweis', name: 'Avental de Semmelweis', type: 'equipamento', slot: 'traje', glyph: 'capa', price: 120,
    desc: 'Lavado antes e depois. A bacia vem junto, e a pergunta também: o que mudou de fato?',
    effect: 'Equipado: reduz em 10% o dano recebido.', ref: 'Semmelweis, Viena, 1847',
  },
  bussola_cochrane: {
    id: 'bussola_cochrane', name: 'Bússola de Cochrane', type: 'ferramenta', slot: 'ferramenta', glyph: 'lupa',
    desc: 'Não aponta para o norte. Aponta para onde as provas já foram reunidas, e não para onde alguém gostaria que estivessem.',
    effect: 'Equipada: +25% de moedas e alcance de coleta maior.', ref: 'Archie Cochrane e as revisões sistemáticas',
  },
  limao_lind: {
    id: 'limao_lind', name: 'Limão de Lind', type: 'consumivel', glyph: 'caldo', price: 16,
    desc: 'Um entre seis tratamentos testados no convés do Salisbury. Foi o que deu certo.',
    effect: 'Recupera 30 de fôlego de aventura e todo o vigor.', ref: 'James Lind, 1747',
  },
  cha_fisher: {
    id: 'cha_fisher', name: 'Xícara de Fisher', type: 'consumivel', glyph: 'caldo', price: 12,
    desc: 'Chá antes do leite, ou leite antes do chá? Alguém sorteou a ordem antes de servir você.',
    effect: 'O Crivo fica pronto para usar a habilidade de novo, sem esperar.', ref: 'Ronald Fisher e a randomização',
  },
  ponteira_latao: {
    id: 'ponteira_latao', name: 'Ponteira de latão', type: 'melhoria', glyph: 'ponteira', price: 75,
    desc: 'Dalva torneou a peça para o seu cajado. Pesa pouco e decide muito.',
    effect: 'Permanente: +6 de dano no golpe leve e +10 no golpe firme.',
  },
  selo_contexto: {
    id: 'selo_contexto', name: 'Selo do Contexto', type: 'missao', glyph: 'selo',
    desc: 'Cera verde, ainda morna. No verso: "viajante a pé, carga leve, sob névoa". É a descrição de quem atravessa hoje.',
    effect: 'Encaixa em um dos mecanismos da ponte.',
  },
  ficha_a: {
    id: 'ficha_a', name: 'Ficha de procedência · Registro do Sino', type: 'missao', glyph: 'ficha',
    desc: '"Transcrito do Registro da Maré, sem conferência." Carimbo: cópia.',
    effect: 'Peça do enigma do Arquivo.',
  },
  ficha_b: {
    id: 'ficha_b', name: 'Ficha de procedência · Registro da Maré', type: 'missao', glyph: 'ficha',
    desc: '"Anotado no cais, na noite em que a névoa entrou, por quem estava lá." Carimbo: original.',
    effect: 'Peça do enigma do Arquivo.',
  },
  ficha_c: {
    id: 'ficha_c', name: 'Ficha de procedência · Registro do Farol', type: 'missao', glyph: 'ficha',
    desc: '"Resumo do Registro do Sino, com acréscimos do copista." Carimbo: cópia de cópia.',
    effect: 'Peça do enigma do Arquivo.',
  },
  oleo_lamparina: {
    id: 'oleo_lamparina', name: 'Frasco de óleo de lamparina', type: 'missao', glyph: 'oleo',
    desc: 'Um frasco. Dá para um braseiro, não para dois.',
    effect: 'Acende um dos braseiros do Observatório.',
  },
  encomenda_dalva: {
    id: 'encomenda_dalva', name: 'Encomenda de Dalva', type: 'missao', glyph: 'caixa',
    desc: 'Caixa de ferragens que ficou do outro lado quando a ponte fechou.',
    effect: 'Entregar a Dalva, no Beco dos Ofícios.',
  },
};

export const SHOP: string[] = ['caldo', 'limao_lind', 'cha_fisher', 'selo_pergunta', 'ponteira_latao', 'capa_parcimonia', 'jaleco_semmelweis'];

// ---------- habilidades ----------

export const PLAYER_SKILLS: SkillDef[] = [
  { id: 'passo_firme', name: 'Passo firme', branch: 'Exploração', tier: 0, cost: 1, desc: 'Correr deixa de ser pressa e vira hábito.', effect: '+10% de velocidade de corrida.' },
  { id: 'olho_coletor', name: 'Olho de coletor', branch: 'Exploração', tier: 1, cost: 1, requires: ['passo_firme'], desc: 'Você repara no que os outros pisam em cima.', effect: 'Recolhe itens de mais longe e ganha 25% a mais de moedas.' },
  { id: 'atalhos', name: 'Atalhos', branch: 'Exploração', tier: 2, cost: 2, requires: ['olho_coletor'], minLevel: 4, desc: 'Toda grade tem uma tranca que alguém esqueceu de conferir.', effect: 'Abre as grades de atalho marcadas nas regiões.' },
  { id: 'escuta_atenta', name: 'Escuta atenta', branch: 'Interação', tier: 0, cost: 1, desc: 'Você deixa a pessoa terminar a frase.', effect: 'Libera perguntas extras em conversas, marcadas com um losango.' },
  { id: 'pergunta_aberta', name: 'Pergunta aberta', branch: 'Interação', tier: 1, cost: 1, requires: ['escuta_atenta'], desc: '"O que mais?" costuma render mais do que "é isso?".', effect: 'Conversas e casos rendem 30% a mais de experiência.' },
  { id: 'anotacoes', name: 'Anotações de campo', branch: 'Interação', tier: 2, cost: 2, requires: ['pergunta_aberta'], minLevel: 4, desc: 'O que não foi anotado tende a virar certeza.', effect: 'O diário passa a registrar uma pista por objetivo.' },
  { id: 'folego', name: 'Fôlego', branch: 'Encontros', tier: 0, cost: 1, desc: 'Escada de torre, todo dia, sem reclamar.', effect: '+25 de vigor máximo.' },
  { id: 'esquiva_limpa', name: 'Esquiva limpa', branch: 'Encontros', tier: 1, cost: 1, requires: ['folego'], desc: 'Sair do caminho também é uma decisão.', effect: 'Esquiva mais barata e com janela de proteção maior.' },
  { id: 'golpe_decidido', name: 'Golpe decidido', branch: 'Encontros', tier: 2, cost: 2, requires: ['esquiva_limpa'], minLevel: 4, desc: 'Um golpe só, no momento em que cabe.', effect: '+15% de dano; o golpe firme interrompe inimigos comuns.' },
];

export const CRIVO_SKILLS: SkillDef[] = [
  { id: 'farejar', name: 'Farejar pistas', branch: 'Observação', tier: 0, cost: 0, desc: 'O olho do Crivo vira para o que merece um segundo olhar.', effect: 'Passiva: o Crivo olha e aponta para pistas próximas. Não marca tudo o tempo todo.' },
  { id: 'lupa', name: 'Lupa curiosa', branch: 'Observação', tier: 1, cost: 1, requires: ['farejar'], desc: 'Por alguns segundos, o que estava escondido deixa de estar.', effect: 'Ativa: revela rastros e detalhes ocultos por 7 segundos, perto de você.' },
  { id: 'contraste', name: 'Contraste', branch: 'Observação', tier: 2, cost: 2, requires: ['lupa'], desc: 'Duas pistas lado a lado dizem o que nenhuma diz sozinha.', effect: 'Ao examinar, o Crivo põe a pista ao lado da anterior e mostra o que mudou.' },
  { id: 'pulso', name: 'Pulso de atenção', branch: 'Suporte', tier: 0, cost: 0, desc: 'Um piscar que faz a névoa perder o fio da meada.', effect: 'Ativa: interrompe inimigos próximos por um instante.' },
  { id: 'pulso_amplo', name: 'Pulso amplo', branch: 'Suporte', tier: 1, cost: 1, requires: ['pulso'], desc: 'O piscar chega mais longe e volta mais cedo.', effect: 'O pulso alcança mais longe e recarrega mais rápido.' },
  { id: 'abrigo', name: 'Abrigo', branch: 'Suporte', tier: 2, cost: 2, requires: ['pulso_amplo'], desc: 'O Crivo se põe na frente. Uma vez. Depois precisa de um tempo.', effect: 'Quando um golpe o derrubaria, o Crivo absorve o dano. Recarrega em 90 segundos.' },
  { id: 'rastro', name: 'Rastro do contexto', branch: 'Exploração', tier: 0, cost: 1, desc: 'O Crivo acha a passagem que só faz sentido para quem conhece o lugar.', effect: 'Revela passagens opcionais marcadas com pegadas claras.' },
  { id: 'faro_moedas', name: 'Faro de moedas', branch: 'Exploração', tier: 1, cost: 1, requires: ['rastro'], desc: 'Brilho pequeno, olho grande.', effect: 'O Crivo saltita na direção de moedas e páginas ainda não recolhidas.' },
  { id: 'olhar_compartilhado', name: 'Olhar compartilhado', branch: 'Exploração', tier: 2, cost: 2, requires: ['faro_moedas'], locked: 'Disponível quando a cooperação chegar.', desc: 'Marcar uma pista para quem joga com você.', effect: 'Fase cooperativa.' },
];

// ---------- códice ----------

export interface CodexEntry {
  id: string;
  title: string;
  group: 'Mundo' | 'Método' | 'Pessoas' | 'Criaturas' | 'Mestres' | 'Obras';
  body: string[];
  /** leitura opcional para curiosos; não é pré-requisito de nada */
  note?: string;
  /** onde conferir: referência bibliográfica da obra citada no verbete */
  refs?: string[];
}

export const CODEX: Record<string, CodexEntry> = {
  crivo: {
    id: 'crivo', title: 'O Crivo', group: 'Mundo',
    body: [
      'Cada viajante do Pátio acaba escolhido por um. Ninguém sabe o critério, e os Crivos não explicam.',
      'Tem um olho só, que serve para ver uma coisa de cada vez. Dizem que é por isso que erra menos.',
      'Não fala. Pisca, saltita, aponta. Quando duvida, inclina o corpo para o lado.',
    ],
    note: 'Crivo é peneira: o que separa o que passa do que fica. O nome não promete certeza, só critério.',
  },
  nevoa: {
    id: 'nevoa', title: 'A Névoa das Conclusões', group: 'Mundo',
    body: [
      'Ela entra onde uma certeza frágil ficou sem ser conferida. Não mente: encurta o caminho, e o atalho leva a outro lugar.',
      'Não dá para acabar com ela. Dá para ficar do tamanho certo.',
    ],
    note: 'A névoa é uma figura do jogo. Fora dele, incerteza não some com esforço; aprende-se a decidir com ela.',
  },
  atrio: {
    id: 'atrio', title: 'Pátio dos Caminhos', group: 'Mundo',
    body: [
      'Dois arcos, uma fonte, uma escadaria. O arco do oeste diz "conhece-te a ti mesmo" e leva ao Arquivo. O do leste diz "entre amigos, tudo é comum" e levava, até a ponte fechar, à estrada da Vila.',
      'A esfera armilar da fonte nunca se alinha por muito tempo. Os alunos antigos chamam isso de calibragem.',
    ],
  },
  fiapo: {
    id: 'fiapo', title: 'Fiapo da Névoa', group: 'Criaturas',
    body: [
      'Um resto de névoa que ganhou vontade. Avança, hesita um instante e investe. O instante de hesitação é a sua janela.',
      'Não é ninguém. Não representa ninguém. É só névoa com pressa.',
    ],
  },
  vulto: {
    id: 'vulto', title: 'Vulto', group: 'Criaturas',
    body: ['Névoa mais velha, que aprendeu a manter distância. Lança um sopro lento e depois se aproxima. O sopro tem trajetória reta: ande de lado.'],
  },
  eco: {
    id: 'eco', title: 'O Eco', group: 'Criaturas',
    body: ['Vive na Sala dos Originais e repete o que ouve. Quando se divide, os pedaços são mais fracos que o inteiro, mas falam mais alto.'],
  },
  veredito: {
    id: 'veredito', title: 'O Veredito', group: 'Criaturas',
    body: [
      'A Névoa, quando se convence. Ocupa o Observatório porque de lá se vê tudo de uma vez, e ver tudo de uma vez é o jeito mais rápido de concluir errado.',
      'Não foi destruído. Ficou menor.',
    ],
  },
  validade_externa: {
    id: 'validade_externa', title: 'Para quem a ponte foi feita', group: 'Método',
    body: [
      'A Ponte das Conclusões tem três mecanismos. Cada um foi calibrado com um tipo de viajante. Nenhum está quebrado: cada um responde bem a quem se parece com quem o calibrou.',
      'A ponte parou porque ninguém perguntou quem estava atravessando.',
    ],
    note: 'Um resultado obtido em um grupo pode não valer do mesmo jeito para outro. Isso se chama aplicabilidade, ou validade externa. A pergunta útil é: as pessoas do estudo se parecem, no que importa, com a pessoa na minha frente?',
  },
  procedencia: {
    id: 'procedencia', title: 'Cópia de cópia', group: 'Método',
    body: [
      'Três registros contavam a mesma noite com detalhes diferentes. Dois eram cópias, e um deles copiava o outro. O terceiro foi escrito por quem estava no cais.',
      'Três vozes repetindo a mesma fonte não são três confirmações.',
    ],
    note: 'Antes de somar relatos, vale perguntar de onde cada um veio. Fontes que dependem umas das outras contam como uma.',
  },
  trocas: {
    id: 'trocas', title: 'Um frasco, dois braseiros', group: 'Método',
    body: [
      'No alto do Observatório havia óleo para um braseiro só. Um iluminava o caminho da Vila. O outro, o lugar onde o Veredito esperava.',
      'Não havia escolha certa. Havia duas escolhas com contas diferentes para pagar.',
    ],
    note: 'Quase toda decisão em saúde gasta algo que não volta: tempo, dinheiro, disposição. Dizer o que se perde com cada opção faz parte de decidir bem.',
  },
  pergunta: {
    id: 'pergunta', title: 'Página solta · A pergunta', group: 'Método',
    body: ['"Funciona?" não é pergunta. Funciona para quem, comparado com o quê, medido como, em quanto tempo? Enquanto isso não estiver escrito, qualquer resposta serve, e é esse o problema."'],
    note: 'Uma pergunta clínica costuma dizer quem são as pessoas, qual é a intervenção, com o que ela é comparada e quais desfechos importam.',
  },
  acaso: {
    id: 'acaso', title: 'Página solta · O acaso', group: 'Método',
    body: ['"Joguei a moeda dez vezes e deu sete caras. Passei a tarde explicando por quê. À noite joguei de novo e deu quatro."'],
    note: 'Parte do que se observa em um estudo pequeno é variação ao acaso. Por isso resultados vêm com uma faixa de valores compatíveis, e não só com um número.',
  },
  absoluto: {
    id: 'absoluto', title: 'Página solta · Em cada cem', group: 'Método',
    body: ['"Disseram que o risco caía pela metade. Perguntei: metade de quanto? Era de dois em cem para um em cem. Continua sendo metade. Só deixou de ser manchete."'],
    note: 'O mesmo efeito pode ser dito de forma relativa ("metade") ou absoluta ("um a menos em cada cem"). Para decidir, a forma absoluta costuma ajudar mais.',
  },
  confundimento: {
    id: 'confundimento', title: 'Página solta · A terceira coisa', group: 'Método',
    body: ['"Nos dias em que o sineiro leva guarda-chuva, a ponte fica escorregadia. Proibiram o guarda-chuva. A ponte continuou escorregadia. Chovia."'],
    note: 'Quando duas coisas andam juntas, pode haver uma terceira por trás das duas. Isso se chama confundimento, e é uma das razões para comparar grupos com cuidado.',
  },
  desenho: {
    id: 'desenho', title: 'Página solta · A ferramenta e a pergunta', group: 'Método',
    body: ['"Perguntaram ao bibliotecário qual era o melhor tipo de estudo. Ele perguntou de volta: melhor para responder o quê?"'],
    note: 'Não existe uma escada fixa de estudos do pior ao melhor. O desenho adequado depende da pergunta, e a confiança depende também de viés, precisão, consistência e de quão direto é o caminho até a pessoa em questão.',
  },
  decisao: {
    id: 'decisao', title: 'Página solta · Duas cadeiras', group: 'Método',
    body: ['"A evidência dizia uma coisa. A senhora dizia outra. Demorei a entender que não estavam discutindo o mesmo assunto: uma falava de média, a outra da própria vida."'],
    note: 'Decisão compartilhada junta três coisas: o que os estudos sugerem, o que é viável naquele contexto e o que a pessoa valoriza. Nenhuma das três decide sozinha.',
  },
  heloisa: { id: 'heloisa', title: 'Heloísa Vértice', group: 'Pessoas', body: ['Guardiã do Pátio. Recebe quem chega e não costuma dar respostas completas. Diz que é por respeito.'] },
  iris: { id: 'iris', title: 'Íris', group: 'Pessoas', body: ['Mensageira. Atravessava a ponte duas vezes por dia até ela fechar. Conhece o Bosque pelos pés.'] },
  anselmo: { id: 'anselmo', title: 'Anselmo', group: 'Pessoas', body: ['Bibliotecário do Arquivo das Perguntas. Classifica os livros pela pergunta que respondem, não pelo assunto.'] },
  dalva: { id: 'dalva', title: 'Dalva', group: 'Pessoas', body: ['Artesã do Beco dos Ofícios. Conserta o que dá para consertar e avisa quando não dá.'] },
  lia: { id: 'lia', title: 'Lia', group: 'Pessoas', body: ['Sineira da Academia. Sobe a torre antes do sol. Personagem fictícia de um caso simulado.'] },
  // ---------- método: conceitos que os moradores carregam ----------
  pico: {
    id: 'pico', title: 'Pergunta com quatro campos', group: 'Método',
    body: [
      'Quem? O que se pretende fazer? Em comparação com quê? E o que, exatamente, contaria como deu certo? Heloísa pergunta essas quatro coisas antes de mandar alguém a qualquer lugar.',
      'Pergunta com os quatro campos preenchidos diz o que procurar, onde procurar e quando parar.',
    ],
    note: 'Em PBE isso aparece como PICO: população, intervenção, comparação e desfecho (outcome). É um jeito de formular perguntas clínicas respondíveis; não é a única estrutura possível, e perguntas sobre prognóstico ou experiência pedem outras.',
  },
  vies_publicacao: {
    id: 'vies_publicacao', title: 'Cartas que chegam', group: 'Método',
    body: [
      'Íris só entrega as cartas que lhe dão. Carta boa chega rápido. Carta ruim se perde na estrada, ou ninguém chega a escrever.',
      'Quem lê só as cartas entregues conclui que o mundo vai bem.',
    ],
    note: 'Estudos com resultado favorável tendem a ser publicados mais cedo e com mais frequência do que os neutros ou desfavoráveis. Isso se chama viés de publicação. Quem faz revisão sistemática procura também o que não foi publicado, e há métodos (como o gráfico de funil) que ajudam a suspeitar da falta, com limites conhecidos.',
  },
  revisao_sistematica: {
    id: 'revisao_sistematica', title: 'A mesma estante, duas vezes', group: 'Método',
    body: [
      'Anselmo escreve a pergunta e o que vai aceitar ou recusar antes de abrir a primeira estante. Procura em mais de um lugar. Anota o que descartou e por quê.',
      'A ideia é que outra pessoa, refazendo, chegue ao mesmo lugar.',
    ],
    note: 'É o que distingue uma revisão sistemática de uma revisão narrativa: pergunta e critérios definidos antes, busca ampla, avaliação do risco de viés de cada estudo e síntese explícita. O tamanho da revisão não é o que a define.',
  },
  erro_medida: {
    id: 'erro_medida', title: 'A trena que mente sempre igual', group: 'Método',
    body: [
      'Dalva mede duas vezes. A segunda medida mostra se a trena é caprichosa. Se a trena mente sempre para o mesmo lado, só uma régua conhecida denuncia.',
      'Repetir a medida e calibrar o instrumento resolvem problemas diferentes.',
    ],
    note: 'Precisão é o quanto medidas repetidas se parecem. Exatidão é o quanto elas se aproximam do valor verdadeiro. Um instrumento pode ser preciso e inexato, e só a comparação com um padrão mostra isso.',
  },
  regressao_media: {
    id: 'regressao_media', title: 'Depois da pior noite', group: 'Método',
    body: [
      'Noêmia anota o frio do terraço. Percebeu que depois da pior noite do mês costuma vir uma menos ruim, mesmo quando ninguém fez nada.',
      'Se ela acendesse um braseiro justo na pior noite, juraria que foi o braseiro.',
    ],
    note: 'Valores extremos tendem a ser seguidos por valores menos extremos por acaso. É a regressão à média. Quem trata no pior momento corre o risco de atribuir ao tratamento o que foi a volta ao habitual, e é por isso que se compara com um grupo sem a intervenção.',
  },
  nnt: {
    id: 'nnt', title: 'Quantos lampiões por um tropeço', group: 'Método',
    body: [
      'Conta fictícia de Tomé: em cem noites sem lampião houve 10 tropeços na rua; em cem noites com lampião, 6. A diferença é de 4 em 100. Para evitar um tropeço a mais, ele precisa acender lampiões em 25 noites, porque 100 dividido por 4 dá 25.',
      'Números inventados para o exemplo. Servem só para mostrar a conta.',
    ],
    note: 'É o número necessário para tratar (NNT): o inverso da diferença absoluta de risco. Só significa algo para um desfecho, um período e uma população definidos, e é mais fácil de entender que um risco relativo, que esconde o tamanho do ponto de partida.',
  },

  // ---------- mestres: bustos do Pátio (todas as pessoas já faleceram) ----------
  lind: {
    id: 'lind', title: 'James Lind · seis duplas, uma laranja', group: 'Mestres',
    body: [
      'Em 1747, a bordo do HMS Salisbury, o cirurgião escocês James Lind (1716–1794) separou doze marinheiros com escorbuto em seis duplas e deu um tratamento diferente a cada dupla. A dupla que recebeu laranjas e limões foi a que melhorou.',
      'O desenho era novo: comparar tratamentos entre pessoas parecidas, no mesmo navio, ao mesmo tempo.',
    ],
    note: 'Doze homens não fecham a questão e hoje seria um estudo muito pequeno. A marinha britânica só passou a distribuir suco de limão de forma regular décadas depois, em 1795. Evidência e adoção andam em ritmos diferentes.',
    refs: ['Lind J. A Treatise of the Scurvy. Edimburgo, 1753.'],
  },
  nightingale: {
    id: 'nightingale', title: 'Florence Nightingale · o diagrama que convenceu', group: 'Mestres',
    body: [
      'Florence Nightingale (1820–1910) reuniu os números de mortalidade dos hospitais militares na Guerra da Crimeia e os desenhou em diagramas de área polar. O desenho mostrava que a maior parte das mortes vinha de doenças evitáveis ligadas às condições dos hospitais, e não dos ferimentos de batalha.',
      'Os diagramas foram feitos para leitores que não percorreriam as tabelas: ministros, parlamentares, a rainha.',
    ],
    note: 'Foi eleita, em 1858, a primeira mulher membro da Statistical Society of London, hoje Royal Statistical Society. Comunicar o dado de um jeito que muda decisão faz parte do ofício, não é enfeite.',
    refs: ['Nightingale F. Notes on Matters Affecting the Health, Efficiency, and Hospital Administration of the British Army. Londres, 1858.'],
  },
  semmelweis: {
    id: 'semmelweis', title: 'Ignaz Semmelweis · mãos lavadas, ouvidos fechados', group: 'Mestres',
    body: [
      'Em 1847, na maternidade de Viena, Ignaz Semmelweis (1818–1865) notou que a mortalidade por febre puerperal era maior na clínica atendida por médicos e estudantes, que vinham das autópsias, do que na atendida por parteiras. Instituiu a lavagem das mãos com solução clorada e as mortes diminuíram.',
      'Muitos colegas resistiram. Ele tinha o padrão e não tinha o mecanismo.',
    ],
    note: 'A teoria dos germes, que explicaria o porquê, só se firmaria depois, com Pasteur e Lister. A lição é dupla: observação cuidadosa pode antecipar a explicação, e a falta de explicação é a desculpa favorita para não mudar a prática.',
    refs: ['Semmelweis I. Die Aetiologie, der Begriff und die Prophylaxis des Kindbettfiebers. Pest, Viena e Leipzig, 1861.'],
  },
  fisher: {
    id: 'fisher', title: 'Ronald Fisher · a senhora do chá', group: 'Mestres',
    body: [
      'Ronald Fisher (1890–1962), estatístico britânico, defendeu que a ordem em que os tratamentos são aplicados seja decidida por sorteio. No livro de 1935 sobre planejamento de experimentos usou o exemplo de uma senhora que dizia distinguir se o leite fora posto na xícara antes ou depois do chá.',
      'Sortear a ordem das xícaras impede que o experimentador, sem querer, escolha.',
    ],
    note: 'A randomização não garante grupos idênticos em uma amostra pequena. Garante que as diferenças entre eles não vieram de quem decidiu quem recebia o quê, e é isso que permite calcular a probabilidade do acaso.',
    refs: ['Fisher RA. The Design of Experiments. Edimburgo: Oliver and Boyd, 1935.'],
  },
  hill: {
    id: 'hill', title: 'Austin Bradford Hill · nove pontos de vista', group: 'Mestres',
    body: [
      'Austin Bradford Hill (1897–1991) foi o estatístico do ensaio do Conselho de Pesquisa Médica sobre estreptomicina na tuberculose, em 1948, frequentemente citado como o primeiro ensaio randomizado moderno. Com Richard Doll, estudou a relação entre fumo e câncer de pulmão.',
      'Em 1965 listou nove aspectos para pensar se uma associação é causal: força, consistência, especificidade, temporalidade, gradiente, plausibilidade, coerência, experimento e analogia.',
    ],
    note: 'O próprio Hill avisou que nenhum desses pontos prova causa e que nenhum é exigência. Leitores posteriores notaram que só a temporalidade (a causa vem antes do efeito) é logicamente necessária. Não é uma lista de verificação. É um jeito de organizar a discussão.',
    refs: ['Medical Research Council. Streptomycin treatment of pulmonary tuberculosis. BMJ 1948;2:769-82.', 'Hill AB. The environment and disease: association or causation? Proceedings of the Royal Society of Medicine 1965;58:295-300.'],
  },
  cochrane: {
    id: 'cochrane', title: 'Archie Cochrane · efetividade e eficiência', group: 'Mestres',
    body: [
      'Archie Cochrane (1909–1988), médico e epidemiologista britânico, publicou em 1972 "Effectiveness and Efficiency", defendendo que os serviços de saúde fossem avaliados por ensaios randomizados.',
      'Em 1979 escreveu que era uma crítica à profissão não haver um resumo crítico, por especialidade e atualizado, de todos os ensaios relevantes. A Colaboração Cochrane, criada em 1993, leva o nome dele.',
    ],
    note: 'Cochrane também era cético com a própria tese: pedia que se perguntasse o que um tratamento custa, além do que ele alcança.',
    refs: ['Cochrane AL. Effectiveness and Efficiency: Random Reflections on Health Services. Londres: Nuffield Provincial Hospitals Trust, 1972.'],
  },
  sackett: {
    id: 'sackett', title: 'David Sackett · evidência, perícia e a pessoa', group: 'Mestres',
    body: [
      'David Sackett (1934–2015) fundou, em 1967, o departamento de epidemiologia clínica e bioestatística da Universidade McMaster, no Canadá. Em 1996, com colegas, definiu no BMJ a medicina baseada em evidências como o uso consciente, explícito e criterioso da melhor evidência atual nas decisões sobre o cuidado de cada pessoa.',
      'No mesmo artigo explicou o que ela não é: nem um livro de receitas, nem uma regra que dispensa a perícia clínica e as preferências de quem é cuidado.',
    ],
    note: 'A frase de Sackett é a base de quase todo o resto: evidência externa, perícia clínica e valores da pessoa entram juntos na decisão, e nenhum dos três decide sozinho.',
    refs: ['Sackett DL, Rosenberg WMC, Gray JAM, Haynes RB, Richardson WS. Evidence based medicine: what it is and what it isn\'t. BMJ 1996;312:71-2.'],
  },
  altman: {
    id: 'altman', title: 'Doug Altman · o escândalo da pesquisa ruim', group: 'Mestres',
    body: [
      'Doug Altman (1948–2018), estatístico britânico, publicou em 1994 no BMJ o artigo "The scandal of poor medical research", sobre o volume de pesquisa mal planejada e mal relatada.',
      'Ajudou a criar o CONSORT, de 1996, uma lista do que um ensaio randomizado deve relatar, e depois a rede EQUATOR, que reúne guias de relato para outros tipos de estudo.',
    ],
    note: 'Relato claro não torna um estudo bom, mas sem ele não se consegue julgar se o estudo é bom.',
    refs: ['Altman DG. The scandal of poor medical research. BMJ 1994;308:283-4.'],
  },

  // ---------- obras: estantes do Arquivo (autores vivos, citados pelas obras) ----------
  obra_ebm: {
    id: 'obra_ebm', title: 'A expressão e o grupo de trabalho', group: 'Obras',
    body: [
      'A expressão "evidence-based medicine" apareceu em 1991, em um editorial de Gordon Guyatt no ACP Journal Club. Em 1992, o Evidence-Based Medicine Working Group publicou no JAMA uma proposta de nova abordagem para ensinar a prática da medicina.',
      'Guyatt também integra o grupo que desenvolveu o GRADE, um sistema para classificar a certeza da evidência e a força das recomendações.',
    ],
    note: 'Obra citada, sem reprodução de texto. O GRADE parte do tipo de estudo e rebaixa ou eleva a certeza segundo risco de viés, inconsistência, evidência indireta, imprecisão e viés de publicação.',
    refs: ['Guyatt GH. Evidence-based medicine. ACP Journal Club 1991;114:A-16.', 'Evidence-Based Medicine Working Group. Evidence-based medicine: a new approach to teaching the practice of medicine. JAMA 1992;268:2420-5.'],
  },
  obra_chalmers: {
    id: 'obra_chalmers', title: 'Cuidado efetivo na gravidez e no parto', group: 'Obras',
    body: [
      '"Effective Care in Pregnancy and Childbirth", de Murray Enkin, Marc Keirse e Iain Chalmers (1989), reuniu revisões sistemáticas de ensaios em obstetrícia. Chalmers também foi um dos fundadores da Colaboração Cochrane.',
      'Mostrou que reunir os ensaios de forma sistemática podia apontar práticas úteis ignoradas e práticas disseminadas sem prova.',
    ],
    note: 'A James Lind Library, editada por Chalmers e colegas, conta a história dos ensaios comparativos em tratamentos.',
    refs: ['Chalmers I, Enkin M, Keirse MJNC, organizadores. Effective Care in Pregnancy and Childbirth. Oxford: Oxford University Press, 1989.'],
  },
  obra_greenhalgh: {
    id: 'obra_greenhalgh', title: 'Como ler um artigo', group: 'Obras',
    body: [
      '"How to Read a Paper", de Trisha Greenhalgh, nasceu como série no BMJ, em 1997, e virou livro. Ensina a ler um artigo perguntando primeiro qual era a pergunta, depois qual foi o desenho, e só no fim os números.',
      'Em 2014, Greenhalgh e colegas publicaram no BMJ "Evidence based medicine: a movement in crisis?", um balanço crítico sobre o que a prática tem a corrigir.',
    ],
    note: 'Criticar a PBE por dentro é parte do método. Entre os pontos levantados estavam a influência de interesses comerciais, o excesso de diretrizes e a distância entre o resultado médio e a pessoa na consulta.',
    refs: ['Greenhalgh T. How to Read a Paper: The Basics of Evidence-Based Medicine. Londres: BMJ Publishing, 1997.', 'Greenhalgh T, Howick J, Maskrey N. Evidence based medicine: a movement in crisis? BMJ 2014;348:g3725.'],
  },
  obra_gigerenzer: {
    id: 'obra_gigerenzer', title: 'Riscos em frequências naturais', group: 'Obras',
    body: [
      'Gerd Gigerenzer estuda como médicos e pacientes entendem risco. Mostrou que "10 em cada 100 pessoas" é mais fácil de entender do que "10%", e que probabilidades condicionais confundem quase todo mundo, inclusive profissionais.',
      'É por isso que o dossiê de Lia mostra benefício e dano em pessoas de cada 100.',
    ],
    note: 'Obra citada, sem reprodução de texto. Apresentar o risco absoluto, e não apenas o relativo, ajuda a decidir com menos distorção.',
    refs: ['Gigerenzer G. Reckoning with Risk: Learning to Live with Uncertainty. Londres: Penguin, 2002.'],
  },
  obra_ioannidis: {
    id: 'obra_ioannidis', title: 'Por que tantos achados não se repetem', group: 'Obras',
    body: [
      'Em 2005, John Ioannidis publicou na PLoS Medicine "Why Most Published Research Findings Are False". Com um modelo, argumentou que estudos pequenos, com desenhos flexíveis, muitos testes e interesses em jogo tendem a produzir achados que não se confirmam.',
      'O artigo é um argumento de modelagem, não uma medida direta. É muito citado e também muito debatido.',
    ],
    note: 'O recado prático é pedir replicação e pré-registro antes de tratar um achado novo como fato.',
    refs: ['Ioannidis JPA. Why most published research findings are false. PLoS Medicine 2005;2(8):e124.'],
  },
  obra_cochrane_br: {
    id: 'obra_cochrane_br', title: 'Cochrane no Brasil', group: 'Obras',
    body: [
      'O Centro Cochrane do Brasil foi criado em 1996, em São Paulo, na Universidade Federal de São Paulo, por iniciativa de Álvaro Atallah, e integra a rede internacional da Colaboração Cochrane.',
      'Ajuda a produzir e a traduzir revisões sistemáticas para a prática e para o ensino em português.',
    ],
    note: 'A evidência chega à prática pelas pessoas que a resumem, traduzem e ensinam, e não só pelas que a produzem.',
  },

};

export const MESTRES_IDS = ['lind', 'nightingale', 'semmelweis', 'fisher', 'hill', 'cochrane', 'sackett', 'altman'];
export const OBRAS_IDS = ['obra_ebm', 'obra_chalmers', 'obra_greenhalgh', 'obra_gigerenzer', 'obra_ioannidis', 'obra_cochrane_br'];
export const PAGES = ['pergunta', 'acaso', 'absoluto', 'confundimento', 'desenho', 'decisao'];

// ---------- missões ----------

export interface QuestDef {
  id: string;
  title: string;
  kind: 'principal' | 'paralela';
  summary: string;
  steps: Array<{ text: string; hint?: string; region?: string; target?: string }>;
  done: string;
}

export const QUESTS: Record<string, QuestDef> = {
  chegada: {
    id: 'chegada', title: 'Chegada ao Pátio', kind: 'principal',
    summary: 'Você chegou sob chuva, e um Crivo escolheu acompanhar você. A guardiã do Pátio espera junto à fonte.',
    steps: [{ text: 'Fale com Heloísa, junto à fonte', region: 'atrio', target: 'npc:heloisa', hint: 'Ela está ao sul da fonte, de capa escura e cachecol dourado.' }],
    done: 'Heloísa contou o que a Névoa das Conclusões fez com o Pátio.',
  },
  ponte: {
    id: 'ponte', title: 'A Ponte das Conclusões', kind: 'principal',
    summary: 'A ponte do Bosque recolheu e não volta. Íris acha que ninguém mais sabe para quem ela foi feita.',
    steps: [
      { text: 'Fale com Íris, junto ao arco leste', region: 'atrio', target: 'npc:iris', hint: 'Ela fica perto do arco com a inscrição ΚΟΙΝΑ ΤΑ ΦΙΛΩΝ.' },
      { text: 'Atravesse o arco leste até o Bosque da Confusão', region: 'atrio', target: 'prop:portal_bosque' },
      { text: 'Siga a trilha e afaste os Fiapos da Névoa', region: 'bosque', target: 'group:trilha', hint: 'Eles hesitam antes de investir. Esquive nesse instante ou use o pulso do Crivo.' },
      { text: 'Encontre o que os Fiapos guardavam na clareira', region: 'bosque', target: 'prop:bau_selo', hint: 'O Crivo olha para o que merece atenção.' },
      { text: 'Descubra em qual mecanismo o selo se encaixa', region: 'bosque', target: 'prop:mec_b', hint: 'Leia as inscrições e repare no que ficou largado ao pé de cada mecanismo.' },
      { text: 'Atravesse a ponte e acenda o marco do outro lado', region: 'bosque', target: 'prop:marco' },
      { text: 'Volte ao Pátio e fale com Íris', region: 'atrio', target: 'npc:iris' },
    ],
    done: 'A ponte voltou a responder a quem atravessa. O Pátio parece respirar melhor.',
  },
  arquivo: {
    id: 'arquivo', title: 'O Registro Original', kind: 'principal',
    summary: 'Três registros contam por onde a Névoa entrou. Não concordam. Anselmo quer saber qual deles estava lá.',
    steps: [
      { text: 'Fale com Anselmo, junto ao arco oeste', region: 'atrio', target: 'npc:anselmo' },
      { text: 'Entre no Arquivo das Perguntas', region: 'atrio', target: 'prop:portal_arquivo' },
      { text: 'Reúna as três fichas de procedência', region: 'arquivo', target: 'group:fichas', hint: 'A Lupa curiosa do Crivo (tecla Q, alternando com R) mostra o rastro de tinta que sai de cada púlpito.' },
      { text: 'Na porta da Sala dos Originais, acione a alavanca do registro que não copiou de ninguém', region: 'arquivo', target: 'prop:alavanca_b', hint: 'Leia os carimbos das fichas no inventário.' },
      { text: 'Enfrente o que se esconde na Sala dos Originais', region: 'arquivo', target: 'group:eco' },
      { text: 'Recolha a lanterna no fundo da sala', region: 'arquivo', target: 'prop:bau_lanterna' },
      { text: 'Volte ao Pátio e fale com Anselmo', region: 'atrio', target: 'npc:anselmo' },
    ],
    done: 'O registro do cais voltou para a estante certa. As cópias ganharam uma etiqueta honesta.',
  },
  veredito: {
    id: 'veredito', title: 'O Veredito', kind: 'principal',
    summary: 'A Névoa subiu para o Observatório e se convenceu de alguma coisa. Heloísa pede que você vá até lá.',
    steps: [
      { text: 'Fale com Heloísa, junto à fonte', region: 'atrio', target: 'npc:heloisa' },
      { text: 'Suba a escadaria e entre na Academia', region: 'atrio', target: 'prop:portal_observatorio' },
      { text: 'Decida qual braseiro acender com o único frasco de óleo', region: 'observatorio', target: 'group:braseiros', hint: 'Um ilumina a estrada da Vila. O outro, o terraço onde o Veredito espera. Não há resposta certa.' },
      { text: 'Enfrente o Veredito', region: 'observatorio', target: 'group:veredito', hint: 'Quando ele começar a recitar, o pulso do Crivo interrompe.' },
      { text: 'Volte ao Pátio e fale com Heloísa', region: 'atrio', target: 'npc:heloisa' },
    ],
    done: 'A Névoa não foi embora. Ficou do tamanho certo.',
  },
  lia: {
    id: 'lia', title: 'Uma Decisão para Lia', kind: 'paralela',
    summary: 'Lia, a sineira, anda tonta na escada da torre e quer conversar sobre o que fazer. Caso simulado, com dados fictícios.',
    steps: [
      { text: 'Converse com Lia e abra o dossiê do caso', region: 'atrio', target: 'npc:lia' },
      { text: 'Chegue a uma decisão com Lia', region: 'atrio', target: 'npc:lia', hint: 'Não há cronômetro. Pergunte o que importa para ela antes de decidir.' },
    ],
    done: 'Você e Lia fecharam um plano e combinaram quando rever.',
  },
  vento: {
    id: 'vento', title: 'Duas Versões do Vento', kind: 'paralela',
    summary: 'Noêmia e Tomé viram a mesma noite e contam histórias que não cabem uma na outra.',
    steps: [
      { text: 'Ouça a versão de Noêmia e a de Tomé', region: 'atrio', target: 'npc:tome' },
      { text: 'Examine o canto do terraço e o fundo do beco', region: 'atrio', target: 'prop:vento_terraco', hint: 'Cada um olhava de um lugar. Vá até os dois.' },
      { text: 'Conte a Noêmia o que você encontrou', region: 'atrio', target: 'npc:noemia' },
    ],
    done: 'Os dois tinham razão sobre o pedaço que viram.',
  },
  encomenda: {
    id: 'encomenda', title: 'Encomenda Atrasada', kind: 'paralela',
    summary: 'Uma caixa de Dalva ficou do lado de lá da ponte.',
    steps: [
      { text: 'Encontre a caixa de Dalva além da ponte, no Bosque', region: 'bosque', target: 'prop:caixa_dalva' },
      { text: 'Entregue a caixa a Dalva, no beco', region: 'atrio', target: 'npc:dalva' },
    ],
    done: 'Dalva recuperou as ferragens e baixou os preços para você.',
  },
  paginas: {
    id: 'paginas', title: 'Páginas de Método', kind: 'paralela',
    summary: 'Páginas soltas de um caderno antigo andam espalhadas. Anselmo gostaria de ver todas juntas de novo.',
    steps: [{ text: 'Recolha as seis páginas soltas', hint: 'Há três no Pátio, uma no Bosque, uma no Arquivo e uma no Observatório.' }, { text: 'Leve as páginas a Anselmo', region: 'atrio', target: 'npc:anselmo' }],
    done: 'O caderno está inteiro. Anselmo o deixou na mesa de entrada, aberto.',
  },
  mestres: {
    id: 'mestres', title: 'Passeio dos Mestres', kind: 'paralela',
    summary: 'Oito bustos em arco ao redor da fonte lembram quem inventou os jeitos de perguntar que a Academia ensina. Cada placa conta o que a pessoa fez e o que ficou em aberto.',
    steps: [{ text: 'Leia as placas dos oito bustos do Pátio', hint: 'Estão em arco ao redor da fonte, quatro de cada lado.' }],
    done: 'Você leu os oito. O ourives do Pátio deixou um anel para quem terminasse o passeio.',
  },
};

// ---------- caso clínico (simulação fictícia) ----------

export const CASE_LIA: ClinicalCase = {
  id: 'lia-vertigem-de-torre',
  version: '0.2.0',
  reviewed_at: '2026-11-12',
  reviewer: 'Sem revisão clínica nem pedagógica independente: conteúdo inteiramente fictício, para teste de mecânica',
  fictional: true,
  discipline: 'Interprofissional',
  scope_of_practice: 'Aconselhar dentro da competência, encaminhar quando a opção exigir outro profissional e decidir junto com a pessoa.',
  case_summary: 'Lia, 34 anos, sineira da Academia. Há dois meses sente "vertigem de torre": tontura ao subir os 212 degraus do campanário. Condição e tratamentos inventados para o jogo.',
  fictional_patient_statement: 'Eu não quero largar o sino. Só não quero cair da escada.',
  question: 'Para uma adulta com vertigem de torre que trabalha em altura, a tintura de raiz-de-bruma, comparada a não usar, reduz as crises em oito semanas, e a que custo?',
  population: 'Adultos com vertigem de torre',
  intervention: 'Tintura de raiz-de-bruma, uso diário',
  comparison: 'Não usar a tintura; ou exercícios de equilíbrio',
  outcomes: 'Melhora das crises em 8 semanas; sonolência diurna; custo',
  horizon_weeks: 8,
  harm_label: 'sonolência de dia',
  baseline_harm_per100: 6,
  comparator: 'espera',
  simulation_notes: [
    'O desfecho é sorteado para as mesmas 8 semanas dos estudos. O retorno em 4 semanas é uma conversa no meio do caminho, não a medida do resultado.',
    'O sorteio não usa o número do estudo como se fosse a chance exata de Lia. Primeiro sorteia a chance real dentro da faixa de incerteza de cada opção; depois sorteia o desfecho.',
    'Para os exercícios, a faixa é mais larga porque o estudo não teve sorteio: parte da melhora observada pode vir de quem escolheu se exercitar, e não dos exercícios.',
    'A sonolência também acontece em quem não toma nada. O sorteio usa o risco total de cada opção; o que a tintura acrescenta é a diferença.',
  ],
  sources: [
    { label: 'Ensaio dos Sineiros de Valmor (fictício)', note: 'Comparação com sorteio, 240 pessoas, 8 semanas. Não incluiu quem trabalha em altura.' },
    { label: 'Cadernos da Vila sobre exercícios de equilíbrio (fictício)', note: 'Acompanhamento sem sorteio, 60 pessoas, 8 semanas. Quem fazia os exercícios já era mais ativo. Não registrou efeitos indesejados, o que não é o mesmo que não haver.' },
  ],
  evidence_summary: [
    'Sem tintura: cerca de 30 em cada 100 pessoas melhoraram em 8 semanas.',
    'Com tintura: cerca de 42 em cada 100. São 12 a mais em cada 100, mas a faixa compatível com os dados vai de nenhuma a mais até 24 a mais.',
    'Sonolência durante o dia: cerca de 6 em cada 100 sem tintura e 15 em cada 100 com ela. São 9 a mais em cada 100.',
    'Exercícios de equilíbrio: cerca de 38 em cada 100 melhoraram, em um acompanhamento sem sorteio. A incerteza aqui é maior.',
  ],
  quality_considerations: [
    'O ensaio da tintura teve sorteio, mas é pequeno: a faixa de resultados inclui "não faz diferença".',
    'Ele não incluiu ninguém que trabalha em altura. Lia trabalha.',
    'O dado dos exercícios vem de comparação sem sorteio; quem escolheu se exercitar podia ser diferente de quem não escolheu.',
  ],
  preferences: [
    'Ficar alerta na torre importa mais para ela do que a tontura passar rápido.',
    'Não gosta de remédio diário, mas toma se fizer sentido.',
    'Tem medo de perder o posto se pedir afastamento.',
  ],
  cost_access: [
    'A tintura custa 6 moedas por semana. O salário de sineira é de 20.',
    'Os exercícios são gratuitos, mas exigem três idas à Vila por semana, e a ponte andou fechada.',
  ],
  options: [
    {
      id: 'tintura',
      label: 'Iniciar a tintura, com retorno em 4 semanas',
      scopeLabel: {
        nutricao: 'Encaminhar à boticária para avaliar a tintura, com uma carta sua',
        psicologia: 'Encaminhar à boticária para avaliar a tintura, com uma carta sua',
        fisioterapia: 'Encaminhar à boticária para avaliar a tintura, com uma carta sua',
        enfermagem: 'Levar o caso à boticária e acompanhar o início da tintura',
        aprendiz: 'Pedir à sua supervisora que avalie a tintura com Lia',
      },
      detail: 'Benefício possível, com sonolência como preço provável para algumas pessoas.',
      improvePer100: 42, improveRange: [30, 54], harmPer100: 15, costPerWeek: 6,
      fragileWithout: ['danos', 'preferencias'],
      fragileNote: 'A opção é defensável, mas foi escolhida sem pesar a sonolência com alguém que sobe uma torre todo dia. Era a informação que mais importava para ela.',
      reasonableNote: 'Opção defensável: vocês pesaram o ganho incerto contra a sonolência e combinaram rever em quatro semanas.',
    },
    {
      id: 'exercicios',
      label: 'Exercícios de equilíbrio e diário de crises, com retorno em 4 semanas',
      scopeLabel: {
        medicina: 'Encaminhar para exercícios de equilíbrio e pedir um diário de crises',
        nutricao: 'Encaminhar para exercícios de equilíbrio e pedir um diário de crises',
        psicologia: 'Encaminhar para exercícios de equilíbrio e pedir um diário de crises',
        aprendiz: 'Sugerir, com sua supervisora, exercícios de equilíbrio e um diário de crises',
      },
      detail: 'Nenhuma sonolência a mais registrada; evidência mais incerta e três viagens à Vila por semana.',
      improvePer100: 38, improveRange: [24, 52], harmPer100: 6, costPerWeek: 0,
      fragileWithout: ['custo'],
      fragileNote: 'A opção é defensável, mas ninguém perguntou se ela consegue ir à Vila três vezes por semana. Um plano que não cabe na vida da pessoa tende a ficar no papel.',
      reasonableNote: 'Opção defensável: evita o efeito que ela mais teme, e você perguntou pelas idas à Vila. A resposta dela ficou condicionada à ponte; vale combinar o que fazer se as viagens não couberem.',
    },
    {
      id: 'espera',
      label: 'Esperar com diário de crises e rever em 4 semanas',
      detail: 'Sem custo e sem efeito a mais; cerca de 30 em 100 melhoram em 8 semanas sem fazer nada.',
      improvePer100: 30, harmPer100: 6, costPerWeek: 0,
      fragileWithout: ['preferencias'],
      fragileNote: 'Esperar é defensável, mas foi decidido sem saber o quanto as crises pesam para ela hoje. Esperar tem custo quando a pessoa está com medo de cair.',
      reasonableNote: 'Opção defensável: ela preferiu observar, sabendo o que as crises pesam hoje. O dossiê não chegou a combinar o que fazer se piorar antes do retorno; numa consulta de verdade, esse combinado faz parte de esperar.',
    },
  ],
  uncertainty: [
    'Não se sabe se a tintura funciona em quem trabalha em altura: essas pessoas ficaram fora do ensaio.',
    'Não se sabe o efeito além de 8 semanas.',
    'Os Cadernos da Vila não anotaram efeitos indesejados dos exercícios. Falta de registro não é prova de que não existam.',
    'Os números descrevem grupos. Não dizem o que vai acontecer com Lia.',
  ],
  safety_note: 'Simulação não clínica. A condição, os tratamentos, os estudos e os números foram inventados para o jogo e não orientam nenhuma decisão de saúde real.',
};
