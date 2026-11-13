/**
 * Narrativa, conversas e regras das missões. Texto em português, voz direta.
 * Nenhuma missão é quiz: os conceitos de PBE aparecem como regra do mundo
 * (para quem a ponte foi calibrada, de onde vem cada registro, o que cada
 * escolha custa) e só ganham nome depois, no códice, para quem quiser ler.
 */
import type { Game } from './game';
import type { Npc } from './entities/npc';
import type { PropPlacement } from './world/region';
import { CODEX, MESTRES_IDS, OBRAS_IDS, PAGES, PROFESSIONS, QUESTS } from './content/data';
import * as D from './domain/state';
import { MORADORES } from './content/moradores';

type G = Game;

/** itens recolhidos com tratamento próprio */
export const CUSTOM_PICKUPS = new Set<string>(['caixa_dalva']);

const prof = (g: G) => PROFESSIONS.find((p) => p.id === g.state!.profession) ?? PROFESSIONS[5];
const seen = (g: G, id: string) => D.markCollected(g.state!, 'visto:' + id);

/** pergunta em laço: o jogador pode esgotar as opções; a última encerra */
async function ask(g: G, opts: Array<{ text: string; tag?: string; if?: boolean; run: () => Promise<void> }>, exit: string): Promise<void> {
  const used = new Set<number>();
  for (;;) {
    const avail = opts.map((o, i) => ({ o, i })).filter(({ o, i }) => o.if !== false && !used.has(i));
    const list = [...avail.map(({ o }) => ({ text: o.text, tag: o.tag })), { text: exit }];
    const c = await g.choose(list, list.length - 1);
    if (c >= avail.length) return;
    used.add(avail[c].i);
    await avail[c].o.run();
  }
}

// ---------- abertura ----------
export async function opening(g: G): Promise<void> {
  await g.say('', 'Chove no Pátio dos Caminhos. Você chegou tarde, com a carta de admissão dobrada no bolso e a impressão de que esqueceram de avisar que você vinha.');
  await g.say('', 'Algo pequeno, cor de vinho, saltita entre as poças na sua direção. Tem um olho só, e olha para você como quem confere uma soma.');
  g.crivo.cheer();
  g.audio.sfx('crivoAlegre');
  await g.say('', 'Ele não diz nada. Dá uma volta ao seu redor, pisca devagar e se põe ao seu lado. Pelo visto, a decisão foi tomada.');
  g.startQuest('chegada');
  if (g.ui.isTouch) g.ui.hint('Arraste na metade esquerda para andar, empurre até a borda para correr · arraste na direita para olhar · Interagir fica ativo perto de pessoas e objetos · Dica pede ajuda ao Crivo', 'Primeiros passos', 14);
  else g.ui.hint(`${g.ui.key('frente')} ${g.ui.key('esquerda')} ${g.ui.key('tras')} ${g.ui.key('direita')} para andar · ${g.ui.key('correr')} para correr · mouse para olhar · ${g.ui.key('interagir')} para interagir · ${g.ui.key('dica')} pede uma dica ao Crivo`, 'Primeiros passos', 14);
}

// ---------- marcadores sobre personagens ----------
export function npcHasBusiness(g: G, id: string): boolean {
  const s = g.state!;
  const st = (q: string) => D.questStep(s, q);
  switch (id) {
    case 'heloisa':
      return st('chegada') === 0 || (s.flags.includes('arquivo_concluido') && st('veredito') < 0) || st('veredito') === 0 || st('veredito') === 4 || st('focos') === 1 || (s.flags.includes('epilogo') && st('focos') < 0);
    case 'iris':
      return st('ponte') === 0 || st('ponte') === 6 || (s.flags.includes('epilogo') && s.flags.includes('braseiro_vila') && !s.rewards.includes('presente_iris'));
    case 'anselmo':
      return (D.questDone(s, 'ponte') && st('arquivo') < 0) || st('arquivo') === 0 || st('arquivo') === 6 || st('paginas') === 1;
    case 'dalva':
      return st('encomenda') === 1;
    case 'lia':
      return D.questDone(s, 'chegada') && !D.questDone(s, 'lia');
    case 'noemia':
      return (D.questDone(s, 'chegada') && st('vento') < 0) || st('vento') === 2 || (st('vento') === 0 && !D.questVar(s, 'vento', 'n'));
    case 'tome':
      return st('vento') === 0 && !D.questVar(s, 'vento', 't');
  }
  return false;
}

// ---------- conversas ----------
export async function talk(g: G, id: string): Promise<void> {
  D.unlockCodex(g.state!, id);
  switch (id) {
    case 'heloisa':
      await heloisa(g);
      break;
    case 'iris':
      await iris(g);
      break;
    case 'anselmo':
      await anselmo(g);
      break;
    case 'dalva':
      await dalva(g);
      break;
    case 'lia':
      await lia(g);
      break;
    case 'noemia':
      await noemia(g);
      break;
    case 'tome':
      await tome(g);
      break;
    default:
      if (MORADORES[id]) await morador(g, id);
      break;
  }
  await conversaDeOficio(g, id);
}

/**
 * Cada morador carrega um assunto de método que o ocupa. Só entra quando a pessoa não tem pendência de missão,
 * para não atravessar o fio da história, e cada assunto rende uma só vez um verbete no códice.
 */
const OFICIO: Record<string, { pergunta: string; codex: string; linhas: string[] }> = {
  heloisa: {
    pergunta: 'Como você decide para onde mandar alguém?',
    codex: 'pico',
    linhas: [
      'Quando chega alguém dizendo "tem um problema na ponte", eu pergunto quatro coisas. Quem é? O que se pretende fazer? Em comparação com quê? E o que, exatamente, você diria que deu certo?',
      'Parece burocracia. Mas pergunta com os quatro campos preenchidos diz onde procurar e quando parar de procurar. Pergunta com um campo em branco me faz andar o dia inteiro.',
    ],
  },
  iris: {
    pergunta: 'O que você leva nas cartas?',
    codex: 'vies_publicacao',
    linhas: [
      'Tudo que me entregam. O problema é o que não me entregam. Carta boa sai logo, com selo bonito. Carta ruim fica na gaveta, ou nem chega a ser escrita.',
      'No fim do mês, quem lê só o que eu entreguei conclui que o mundo vai muito bem. Eu aprendi a perguntar na estrada: quem não mandou carta, e por quê?',
    ],
  },
  anselmo: {
    pergunta: 'Como você escolhe o que entra no Arquivo?',
    codex: 'revisao_sistematica',
    linhas: [
      'Escrevo a pergunta primeiro. Depois escrevo o que vou aceitar e o que vou recusar, antes de abrir a primeira estante, para não ajustar o critério ao livro que me agradou.',
      'Procuro em mais de um lugar e anoto o que descartei, com o motivo. A prova de que fiz direito é outra pessoa refazer e chegar ao mesmo lugar. Se só eu chego lá, é opinião com bibliografia.',
    ],
  },
  dalva: {
    pergunta: 'Você mede tudo duas vezes?',
    codex: 'erro_medida',
    linhas: [
      'Duas vezes, sempre. A segunda diz se a minha mão é caprichosa. Mas tem um erro que a segunda medida não pega: a trena que mente sempre para o mesmo lado dá a mesma resposta nas duas.',
      'Para isso eu tenho uma régua de bronze que era do meu pai e que eu confio. Medir de novo e conferir com um padrão são coisas diferentes.',
    ],
  },
  noemia: {
    pergunta: 'Você anota o frio todas as noites?',
    codex: 'regressao_media',
    linhas: [
      'Todas. E reparei em uma coisa chata: depois da pior noite do mês vem quase sempre uma menos pior, mesmo quando ninguém fez nada.',
      'Se eu acender um braseiro justo na pior noite, vou jurar que foi o braseiro. Por isso eu deixo algumas noites ruins sem braseiro, só para comparar. Dá peso na consciência e dá resposta.',
    ],
  },
  tome: {
    pergunta: 'Quantos lampiões fazem uma rua mais segura?',
    codex: 'nnt',
    linhas: [
      'Fiz uma conta no caderno, com números que inventei para treinar. Em cem noites sem lampião, dez tropeços. Em cem com lampião, seis. Diferença de quatro em cem.',
      'Para evitar um tropeço a mais eu preciso acender em 25 noites, porque cem dividido por quatro dá vinte e cinco. Se eu disser só que o lampião "reduz 40% dos tropeços", parece mais, e esconde de onde parti.',
    ],
  },
};

async function conversaDeOficio(g: G, id: string): Promise<void> {
  const s = g.state!;
  const o = OFICIO[id];
  if (!o || s.codex.includes(o.codex) || npcHasBusiness(g, id)) return;
  const c = await g.choose([{ text: o.pergunta }, { text: 'Até logo.' }], 1);
  if (c !== 0) return;
  for (const l of o.linhas) await g.say(id, l);
  D.unlockCodex(s, o.codex);
  g.toast(`Novo verbete no códice: ${CODEX[o.codex].title}`);
  g.reward({ id: 'oficio:' + id, xp: 15, talk: true });
}

async function heloisa(g: G): Promise<void> {
  const s = g.state!;
  const H = (t: string) => g.say('heloisa', t);
  if (g.step('chegada') === 0) {
    await H('Então é você. O Crivo desceu a escadaria faz uma hora e ficou aí, olhando para o arco sul. Eles sabem antes da gente.');
    await H('Sou Heloísa. Cuido do Pátio, o que nos últimos tempos quer dizer: cuido do que sobrou dele fora da névoa.');
    await ask(
      g,
      [
        {
          text: 'Que névoa?',
          run: async () => {
            await H('A Névoa das Conclusões. Entra onde alguém teve certeza cedo demais e ninguém conferiu. Ela não mente. Encurta o caminho, e o atalho dá em outro lugar.');
            await H('Fechou a ponte do Bosque, bagunçou o Arquivo e, pelo barulho das últimas noites, subiu para o Observatório.');
            D.unlockCodex(s, 'nevoa');
          },
        },
        {
          text: 'O que é um Crivo?',
          run: async () => {
            await H('Um companheiro. Tem um olho só e vê uma coisa de cada vez; dizem que é por isso que erra menos. Não fala. Repare para onde ele olha.');
            await H('Ele sabe interromper quem está prestes a atacar. Um piscar, e a névoa perde o fio da meada por um instante.');
          },
        },
        {
          text: 'Você disse "o que sobrou".',
          tag: '◆ Escuta atenta',
          if: s.skills.includes('escuta_atenta'),
          run: async () => {
            await H('Disse. Eu mesma tive certeza cedo demais, uma vez, sobre de que lado a névoa viria. Fechei o arco errado.');
            await H('Não conto isso para ser perdoada. Conto para você desconfiar de mim na medida certa.');
            g.reward({ id: 'escuta_heloisa', xp: 15, talk: true });
          },
        },
      ],
      'Por onde eu começo?',
    );
    await H(`Pela ponte. Íris, a mensageira, está junto ao arco leste e conhece o Bosque pelos pés. ${prof(g).id === 'aprendiz' ? 'Não ter ofício ainda não atrapalha: lá ninguém vai perguntar.' : `Gente de ${prof(g).name} costuma se dar bem com ela.`}`);
    await H('Leve o estoque e a tocha. Os Fiapos não escutam argumento. E descanse no marco ao lado da fonte quando precisar: ele guarda o seu caminho.');
    g.completeQuest('chegada', { xp: 20, talk: true });
    g.startQuest('ponte');
    D.unlockCodex(s, 'atrio');
    return;
  }
  if (g.step('veredito') === 4) {
    await H('Eu vi daqui. O céu sobre a torre abriu por um instante, como quem respira depois de muito tempo.');
    await H(s.flags.includes('braseiro_vila') ? 'E vi o braseiro da estrada aceso. Você lutou no escuro para que outros andassem no claro. Há um preço nisso, e você pagou.' : 'E vi o terraço iluminado. Você escolheu enxergar o que enfrentava. A estrada da Vila esperou mais uma noite, e essa conta também é sua.');
    await H('A Névoa não foi embora. Nunca vai. Ficou do tamanho certo, que é o tamanho em que dá para trabalhar com ela.');
    await g.say('', 'O Crivo encosta em você, só um instante. Depois finge que não foi nada.');
    await H('Mas não terminou. Daqui eu vejo três pontos onde ela ainda se junta: a clareira do Bosque, o salão do Arquivo e o terraço lá em cima. Focos. Cada um se sustenta num jeito errado de ler o que aconteceu.');
    g.completeQuest('veredito', { xp: 300, coins: 80, crivoPoints: 1, talk: true });
    g.flag('epilogo');
    g.flag('crivo_capa');
    g.startQuest('focos');
    const left = ['lia', 'vento', 'encomenda', 'paginas', 'mestres'].filter((q) => !D.questDone(s, q)).map((q) => QUESTS[q].title);
    g.showEnding([
      'A ponte voltou a responder a quem atravessa, o registro do cais está na estante certa e o Observatório tem, de novo, mais perguntas do que sentenças.',
      'O que vem agora: a missão Focos Residuais. Três grupos maiores de inimigos voltaram, um no Bosque, um no Arquivo e um no Observatório. Apague os três e conte a Heloísa o que eles tinham em comum.',
      left.length ? `Ainda em aberto: ${left.join(', ')}. O Diário mostra onde cada uma começa.` : 'Todas as missões paralelas estão fechadas. Os segredos de cada região continuam onde estavam.',
      'Uma capa esmeralda para o Crivo espera você em Habilidades. Ele vai fingir que não gostou.',
    ]);
    return;
  }
  if (g.step('focos') === 1) {
    await H('Os três? Então me diga o que eles tinham em comum.');
    const ok = await g.choose([
      { text: 'Todos pareciam maiores do que eram, porque eu só via o que chamava atenção.' },
      { text: 'Nenhum era a Névoa sozinha. Cada um se apoiava num jeito errado de ler o que aconteceu.' },
      { text: 'Eram fortes. Precisei de mais golpes.' },
    ]);
    if (ok === 2) await H('Eram, e você aguentou. Mas força não explica por que voltaram. Pense de novo no que cada um deixou para trás.');
    else {
      await H(ok === 1 ? 'Isso. A clareira crescia porque só as noites piores eram lembradas. O Arquivo guardava só as vozes que concordavam. E no terraço o vento levava a culpa do frio. Três leituras erradas, e a Névoa morando no meio delas.' : 'Em parte. Isso explica a clareira. O Arquivo e o terraço erraram de outro jeito: um escondeu as vozes que discordavam, o outro culpou o vento pelo que era do frio. Mas você viu os três, e isso conta.');
      g.completeQuest('focos', { xp: 220, coins: 120, crivoPoints: 1, talk: true });
      if (!D.countItem(s, 'armadura_protocolo')) g.give('armadura_protocolo');
      await H('Leve isto. Foi desenhada antes de qualquer batalha e ninguém trocou uma placa no meio do caminho. Combina com você.');
      return;
    }
    return;
  }
  if (s.flags.includes('epilogo') && g.step('focos') < 0) {
    // saves de antes desta missão: o final já aconteceu, a missão começa aqui
    await H('Ainda há três pontos onde a Névoa se junta: a clareira do Bosque, o salão do Arquivo e o terraço do Observatório. Focos. Apague os três e venha me contar o que viu.');
    g.startQuest('focos');
    return;
  }
  if (g.step('focos') === 0) {
    await H('Os focos: clareira do Bosque, salão do Arquivo, terraço do Observatório. Apague os três e venha me contar o que viu.');
    return;
  }
  if (s.flags.includes('arquivo_concluido') && g.step('veredito') < 0) {
    await H('Anselmo me contou do registro. Bom trabalho, e melhor ainda por não ter confiado no número de vozes.');
    await H('Agora o resto. A Névoa subiu para o Observatório e se convenceu de alguma coisa. Quando ela se convence, ganha corpo. Chamamos de Veredito.');
    await H('Leve este frasco de óleo. Lá em cima há dois braseiros, e o frasco dá para um só. Um ilumina a estrada da Vila. O outro, o terraço onde ele espera.');
    await ask(g, [{ text: 'Qual eu devo acender?', run: async () => void (await H('Se eu soubesse, não mandava você. Cada um cobra uma coisa diferente. Decida sabendo o que perde, e não finja depois que não perdeu nada.')) }], 'Eu subo.');
    g.startQuest('veredito');
    g.give('oleo_lamparina');
    g.advance('veredito', 1);
    return;
  }
  if (g.step('veredito') >= 0 && g.step('veredito') < 4) {
    await H('As portas da Academia abrem para quem leva o óleo. Suba a escadaria. E não tenha pressa de concluir nada lá em cima.');
    return;
  }
  if (s.flags.includes('epilogo')) {
    await H('Bom dia. Faz tempo que eu não dizia isso aqui com o céu concordando.');
    return;
  }
  await H(g.step('ponte') >= 0 && !D.questDone(s, 'ponte') ? 'A ponte primeiro. Íris está no arco leste.' : 'Anselmo anda atrás de você, junto ao arco oeste. Tem a ver com três registros que não concordam.');
}

async function iris(g: G): Promise<void> {
  const s = g.state!;
  const I = (t: string) => g.say('iris', t);
  if (g.step('ponte') === 5 && s.flags.includes('ponte_aberta')) D.advanceQuest(s, 'ponte', 6);
  const st = g.step('ponte');
  if (st === 0) {
    await I('Duas vezes por dia, ida e volta, onze anos. Anteontem a ponte recolheu no meio da minha travessia. Voltei de costas, sem tirar o olho dela.');
    await I('Na cabeceira há três mecanismos. Sempre funcionou sozinha, ninguém mais lembra para que serve cada um. E a névoa largou uns Fiapos pela trilha.');
    await ask(
      g,
      [
        { text: 'O que são Fiapos?', run: async () => void (await I('Resto de névoa que ganhou vontade. Avançam, hesitam um instante e investem. O instante em que hesitam é a sua vez. Não são ninguém, não se sinta mal.')) },
        {
          text: 'Sempre funcionou sozinha?',
          tag: '◆ Escuta atenta',
          if: s.skills.includes('escuta_atenta'),
          run: async () => {
            await I('Sozinha para mim. Uma vez vi um carroceiro esperar meia hora até ela abrir. Na época achei que era azar dele.');
            await I('Agora que você pergunta... talvez a ponte sempre tenha escolhido para quem abrir. Eu só nunca precisei reparar.');
            g.reward({ id: 'escuta_iris', xp: 15, talk: true });
          },
        },
      ],
      'Eu vou até lá.',
    );
    await I('O arco leste dá na trilha. Se achar uma caixa de ferragens do outro lado, é da Dalva. Ela vai querer de volta.');
    g.advance('ponte', 1);
    return;
  }
  if (st === 6) {
    await I('Eu ouvi o estalo daqui. Pedra encaixando em pedra. Não escutava isso fazia dias.');
    await I('Então era isso: ela não estava quebrada. Estava esperando alguém perguntar para quem tinha sido feita.');
    g.completeQuest('ponte', { xp: 120, coins: 30, crivoPoints: 1, talk: true });
    await I('O Crivo parece maior. Deve ser impressão. Aliás, Anselmo quer falar com você: algo sobre o Arquivo e registros que brigam entre si.');
    return;
  }
  if (s.flags.includes('epilogo') && s.flags.includes('braseiro_vila') && !s.rewards.includes('presente_iris')) {
    await I('A estrada da Vila estava acesa ontem à noite. Fiz a travessia inteira sem tropeçar. O pessoal de lá mandou isto para quem acendeu.');
    g.reward({ id: 'presente_iris', coins: 60, items: { selo_pergunta: 2 } });
    return;
  }
  if (s.flags.includes('epilogo') && s.flags.includes('braseiro_terraco')) {
    await I('A estrada ficou escura mais uma noite, e esperamos. Ninguém se machucou. Só para você saber que a espera existiu.');
    return;
  }
  await I(st > 0 && st < 6 ? 'A trilha começa logo depois do arco. Olho nos Fiapos.' : 'Onze anos de ponte e eu nunca tinha lido o que está escrito nos mecanismos. Dá o que pensar.');
}

async function anselmo(g: G): Promise<void> {
  const s = g.state!;
  const A = (t: string) => g.say('anselmo', t);
  if (g.step('paginas') === 1) {
    await A('As seis. Inteiras. Sabe o que mais me agrada nelas? Nenhuma manda. Todas perguntam.');
    g.completeQuest('paginas', { xp: 90, crivoPoints: 1, talk: true });
    g.flag('crivo_laco');
    await A('Vou deixar o caderno aberto na mesa de entrada. E isto é para o seu companheiro: um laço. Ele pode usar ou não, o gosto é dele.');
    return;
  }
  const st = g.step('arquivo');
  if (st === 6) {
    await A('O Registro da Maré. Escrito no cais, na noite em que a névoa entrou, por quem estava lá. Os outros dois eram cópia, e um copiava o outro.');
    await A('Durante anos contei três registros a favor da mesma versão e dormi tranquilo. Eram um só, com dois ecos.');
    g.completeQuest('arquivo', { xp: 160, coins: 40, crivoPoints: 1, talk: true });
    g.flag('arquivo_concluido');
    await A('As cópias ficam. Só ganharam uma etiqueta honesta. Heloísa quer ver você: é sobre o Observatório.');
    return;
  }
  if (D.questDone(s, 'ponte') && st < 0) {
    await A('Você é quem perguntou para quem a ponte foi feita. Preciso desse tipo de pergunta no Arquivo.');
    await A('Três registros contam por onde a Névoa entrou. O do Sino, o da Maré e o do Farol. Não concordam nos detalhes, e a porta da Sala dos Originais só abre para quem indicar o registro que não copiou de ninguém.');
    await ask(
      g,
      [
        { text: 'Dois concordam entre si?', run: async () => void (await A('Sino e Farol contam quase a mesma coisa. Por muito tempo isso me bastou: dois contra um. Hoje eu queria saber de onde cada um veio antes de contar votos.')) },
        {
          text: 'Como você organiza tudo isso?',
          tag: '◆ Escuta atenta',
          if: s.skills.includes('escuta_atenta'),
          run: async () => {
            await A('Pela pergunta que o livro responde. Assunto engana: dois livros sobre a mesma febre podem responder perguntas que nem se conhecem.');
            g.reward({ id: 'escuta_anselmo', xp: 15, talk: true });
          },
        },
      ],
      'Eu entro.',
    );
    await A('Cada registro deixou um rastro de tinta até a ficha de procedência. A olho nu não se vê. Ensino o truque ao seu Crivo, se ele deixar.');
    g.learnCrivo('lupa');
    s.crivoActive = 'lupa';
    await g.say('', `O Crivo arregala o olho, que por um momento fica do tamanho de um pires. Ele aprendeu a Lupa curiosa. ${g.ui.key('crivo')} usa a habilidade ativa; ${g.ui.key('trocarCrivo')} alterna entre lupa e pulso.`);
    g.startQuest('arquivo');
    g.flag('chave_arquivo');
    g.advance('arquivo', 1);
    await A('A chave. Há Vultos entre as estantes: névoa mais velha, que sopra de longe antes de chegar perto. Ande de lado.');
    return;
  }
  if (st >= 0 && st < 6) {
    await A('Púlpitos no salão, fichas escondidas entre as estantes, alavancas na porta do fundo. Não confie em quantos dizem. Confie em quem estava lá.');
    return;
  }
  if (g.step('paginas') === 0) {
    const n = PAGES.filter((p) => s.codex.includes(p)).length;
    await A(n ? `Você já tem ${n} de seis páginas. Há três no Pátio, uma em cada região além dele.` : 'Páginas de um caderno antigo andam soltas por aí. Seis, ao todo. Se cruzar com alguma, eu gostaria de ver o caderno inteiro de novo.');
    return;
  }
  if (!D.questDone(s, 'ponte')) {
    await A('O Arquivo está trancado por dentro. Antes dele, a ponte: sem estrada, nem os registros chegam.');
    return;
  }
  await A('O caderno está aberto na mesa de entrada. Passe lá quando quiser. Ler não tem prazo.');
}

async function dalva(g: G): Promise<void> {
  const s = g.state!;
  const Dv = (t: string) => g.say('dalva', t);
  if (D.countItem(s, 'encomenda_dalva') > 0) {
    await Dv('Minhas ferragens! Achei que a névoa tinha comido. Dobradiça boa não se acha em qualquer forja.');
    D.removeItem(s, 'encomenda_dalva');
    if (g.step('encomenda') < 0) D.startQuest(s, 'encomenda');
    g.completeQuest('encomenda', { xp: 70, coins: 20, talk: true });
    g.flag('desconto_dalva');
    await Dv('Para você, a banca fica mais barata. Não é favor: é conta. Quem devolve o que é dos outros merece preço justo.');
  } else if (g.step('encomenda') < 0 && g.step('ponte') >= 1) {
    await Dv('Se for ao Bosque: uma caixa minha ficou do lado de lá quando a ponte fechou. Ferragens. Pesa, mas você tem cara de quem aguenta.');
    g.startQuest('encomenda');
  } else await Dv('Conserto o que dá para consertar e aviso quando não dá. Quer ver a banca?');
  const c = await g.choose([{ text: 'Ver a banca' }, { text: 'Agora não' }], 1);
  if (c === 0) g.openShop();
}

async function lia(g: G): Promise<void> {
  const s = g.state!;
  const L = (t: string) => g.say('lia', t);
  if (D.questDone(s, 'lia')) {
    await L('Estou seguindo o que combinamos. Em quatro semanas a gente olha de novo, e muda se precisar.');
    const c = await g.choose([{ text: 'Reabrir o dossiê (não rende experiência de novo)' }, { text: 'Até lá' }], 1);
    if (c === 0) await g.openCase();
    return;
  }
  if (g.step('lia') < 0) {
    await L('Você é quem chegou com o Crivo? Eu sou Lia, toco o sino da Academia. Duzentos e doze degraus, todo dia, antes do sol.');
    await L('Faz dois meses que a escada roda quando eu subo. Aqui chamam de vertigem de torre. Não quero largar o sino. Só não quero cair da escada.');
    await g.say('', 'Este é um caso simulado. A condição, os tratamentos e os números são fictícios e não orientam nenhuma decisão de saúde real.');
    g.startQuest('lia');
  } else await L('Trouxe o dossiê? Eu espero. Prefiro decidir devagar a decidir duas vezes.');
  const c = await g.choose([{ text: 'Sentar com Lia e abrir o dossiê' }, { text: 'Voltar depois' }], 0);
  if (c !== 0) return;
  g.advance('lia', 1);
  const f = await g.openCase();
  if (!f) return;
  g.completeQuest('lia', { coins: 15 });
}

async function noemia(g: G): Promise<void> {
  const s = g.state!;
  const N = (t: string) => g.say('noemia', t);
  const st = g.step('vento');
  if (st === 2) {
    await N('Então ventou no beco e não ventou no terraço. A torre leste corta o vento antes de ele chegar aqui em cima.');
    await N('Passei três dias chamando o Tomé de exagerado. Ele passou três dias me chamando de distraída. Os dois tinham razão sobre o pedaço que viram.');
    g.completeQuest('vento', { xp: 80, items: { lupa_contexto: 1 }, talk: true });
    await N('Fique com esta lupa. Não aumenta o objeto. Aumenta o que está em volta dele, que era o que nos faltava.');
    return;
  }
  if (st < 0 || (st === 0 && !D.questVar(s, 'vento', 'n'))) {
    await N('Não ventou naquela noite. Fiquei no terraço até amanhecer e os estandartes não mexeram um dedo.');
    await N('O Tomé jura que ventou a noite inteira. Um de nós está errado, e eu estava acordada.');
    if (st < 0) g.startQuest('vento');
    D.setQuestVar(s, 'vento', 'n', 1);
    ventoHeard(g);
    return;
  }
  await N(D.questDone(s, 'vento') ? 'Agora, antes de discordar de alguém, eu pergunto de onde a pessoa estava olhando.' : 'Os estandartes não mexeram. Vá ver o canto do terraço, se duvida.');
}

async function tome(g: G): Promise<void> {
  const s = g.state!;
  const T = (t: string) => g.say('tome', t);
  const st = g.step('vento');
  if (st < 0 || (st === 0 && !D.questVar(s, 'vento', 't'))) {
    await T('Ventou do norte a noite inteira. Apagou os lampiões do beco um por um. Eu sei porque reacendi todos, três vezes.');
    await T('A Noêmia diz que não ventou. Ela fica lá no alto, no terraço, vendo estrela. Eu fico no chão, com o pavio na mão.');
    if (st < 0) g.startQuest('vento');
    D.setQuestVar(s, 'vento', 't', 1);
    ventoHeard(g);
    return;
  }
  await T(D.questDone(s, 'vento') ? 'Ventou no beco, não ventou no terraço. Quem diria que cabia tudo na mesma noite.' : 'Vá ao fundo do beco e olhe a cera das velas. Cera não mente.');
}

function ventoHeard(g: G): void {
  const s = g.state!;
  if (D.questVar(s, 'vento', 'n') && D.questVar(s, 'vento', 't')) {
    g.advance('vento', 1);
    if (D.questVar(s, 'vento', 'vento_terraco') && D.questVar(s, 'vento', 'vento_beco')) g.advance('vento', 2);
  }
}

// ---------- moradores do elenco PS2 ----------
/** Saudação, assunto do ofício (uma vez com gesto, depois resumido), reação ao andamento e despedida. */
async function morador(g: G, id: string): Promise<void> {
  const m = MORADORES[id];
  const s = g.state!;
  const S = (t: string) => g.say(id, t);
  const gesto = (a: Parameters<Npc['fig']['play']>[0]) => g.npcs.find((n) => n.def.id === id)?.fig.play(a);
  const etapa = s.flags.includes('epilogo') ? 2 : s.flags.includes('arquivo_concluido') ? 1 : 0;
  await S(m.saudacao);
  if (D.markCollected(s, 'conversa:' + id)) {
    gesto(m.gestoAssunto);
    for (const l of m.assunto) await S(l);
  } else await S(m.assunto[m.assunto.length - 1]);
  await S(m.andamento[etapa]);
  gesto('wave');
  await S(m.despedida);
}

// ---------- páginas ----------
export async function page(g: G, id: string): Promise<void> {
  const s = g.state!;
  const e = CODEX[id];
  await g.say('', e.body[0]);
  const n = PAGES.filter((p) => s.codex.includes(p)).length;
  g.toast(`${e.title} · ${n} de ${PAGES.length}`, 'Códice');
  if (g.step('paginas') < 0) g.startQuest('paginas');
  if (n >= PAGES.length) g.advance('paginas', 1);
}

// ---------- eventos de região ----------
export function onEnterRegion(g: G, region: string): void {
  const s = g.state!;
  if (region === 'bosque' && g.step('ponte') === 1) g.advance('ponte', 2);
  if (region === 'bosque' && g.step('ponte') === 2 && s.flags.includes('limpo:bosque:trilha')) g.advance('ponte', 3);
  if (region === 'arquivo' && g.step('arquivo') === 1) g.advance('arquivo', 2);
  if (region === 'observatorio') {
    if (g.step('veredito') === 1) g.advance('veredito', 2);
    if (s.flags.includes('braseiro_vila') && !s.flags.includes('limpo:observatorio:veredito')) g.engine.setFogAmount(2.1);
  }
}

export function onGroupCleared(g: G, region: string, group: string): void {
  if (region === 'bosque' && group === 'trilha' && g.step('ponte') === 2) g.advance('ponte', 3);
  if (region === 'arquivo' && group === 'eco') {
    g.advance('arquivo', 5);
    g.toast('O Eco se calou. O fundo da sala ficou visível.');
  }
  if (region === 'observatorio' && group === 'veredito') {
    g.flag('veredito_vencido');
    g.advance('veredito', 4);
    g.engine.setFogAmount(0.5);
    g.region.actions.clarear?.();
    g.ui.banner('O Veredito cedeu', 'A Névoa ficou menor', 'Não foi destruída. Ficou do tamanho em que dá para trabalhar com ela.');
  }
  if (group === 'foco' && FOCO[region]) {
    const s = g.state!;
    const f = FOCO[region];
    g.ui.banner(f.title, 'Foco apagado', f.text);
    const n = ['bosque', 'arquivo', 'observatorio'].filter((r) => s.flags.includes(`limpo:${r}:foco`)).length;
    if (n >= 3 && g.step('focos') === 0) g.advance('focos', 1);
    else g.toast(`${n} de 3 focos residuais`);
  }
}

/** O que cada foco residual deixa para trás: um erro de leitura, dito sem jargão. */
const FOCO: Record<string, { title: string; text: string }> = {
  bosque: { title: 'O foco da clareira', text: 'Parecia crescer a cada noite. Contado de novo, era do tamanho de sempre: as noites piores é que ficavam na memória. Quem mede no pior dia vê melhora em qualquer coisa que fizer depois.' },
  arquivo: { title: 'O foco do salão', text: 'Na estante, só as vozes que concordavam. As que discordavam estavam no chão, sem capa e sem número. Quem lê só o que foi guardado acha que todo mundo concordou.' },
  observatorio: { title: 'O foco do terraço', text: 'Toda vez que o vento soprava, a névoa subia, e o vento levou a culpa. Mas as noites de vento eram as noites frias, e era o frio que trazia a névoa. Duas coisas juntas não querem dizer que uma fez a outra.' },
};

export function onCollected(g: G, id: string): void {
  const s = g.state!;
  if (id.startsWith('ficha_')) {
    const n = ['ficha_a', 'ficha_b', 'ficha_c'].filter((f) => D.countItem(s, f) > 0).length;
    if (n === 3) {
      g.advance('arquivo', 3);
      g.ui.hint('Três fichas. Leia os carimbos no inventário antes de escolher a alavanca.', 'O Crivo aponta', 8);
    } else g.toast(`${n} de 3 fichas de procedência`);
  }
}

// ---------- objetos ----------
const MEC: Record<string, { name: string; ins: string; foot: string }> = {
  mec_a: { name: 'Mecanismo da roda', ins: '"Calibrado com carroças carregadas, em tempo seco."', foot: 'Ao pé dele, meio enterrado, um aro de roda partido.' },
  mec_b: { name: 'Mecanismo do passo', ins: '"Calibrado com quem atravessa a pé, de carga leve, sob névoa."', foot: 'Ao pé dele, um par de solas gastas e um lampião de neblina sem vidro.' },
  mec_c: { name: 'Mecanismo do galope', ins: '"Calibrado com cavaleiros a galope, ao meio-dia."', foot: 'Ao pé dele, uma ferradura que a ferrugem ainda não venceu.' },
};
const REG: Record<string, { name: string; text: string }> = {
  pulpito_a: { name: 'Registro do Sino', text: '"A névoa entrou pelo arco norte, à terceira badalada." A letra é limpa demais para quem escrevia de madrugada. Um fio de tinta parece escorrer do púlpito para as estantes do oeste.' },
  pulpito_b: { name: 'Registro da Maré', text: '"Entrou pelo cais, rente à água, antes de qualquer sino. Eu estava amarrando o barco." A página tem manchas de sal. Um fio de tinta parece seguir para as estantes do leste.' },
  pulpito_c: { name: 'Registro do Farol', text: '"A névoa entrou pelo arco norte, à terceira badalada, e era espessa e má." Quase as mesmas palavras do Sino, com adjetivos a mais. Um fio de tinta parece seguir para o fundo, ao norte.' },
};
const ALAV: Record<string, string> = { alavanca_a: 'Registro do Sino', alavanca_b: 'Registro da Maré', alavanca_c: 'Registro do Farol' };

export async function useProp(g: G, p: PropPlacement): Promise<void> {
  const s = g.state!;
  const data = p.data ?? {};
  const N = (t: string) => g.say('', t);
  const first = seen(g, p.id);

  if (p.kind === 'chest') {
    if (data.requiresGroup && !s.flags.includes(`limpo:${g.region.id}:${data.requiresGroup}`)) {
      await N('A névoa em volta ainda se mexe. Enquanto houver quem a guarde, a tampa não cede.');
      return;
    }
    if (!g.openChest(p.id)) return;
    if (data.coins) {
      s.coins += Number(data.coins);
      g.toast(`+${data.coins} moedas`);
    }
    if (data.item) g.give(String(data.item), Number(data.qty ?? 1));
    if (data.item2) g.give(String(data.item2));
    if (p.id === 'bau_selo') {
      await N('Dentro, um lacre de cera verde, ainda morno. No verso, alguém escreveu: "viajante a pé, carga leve, sob névoa". É a descrição de quem atravessa hoje.');
      g.advance('ponte', 4);
    } else if (p.id === 'bau_lanterna') {
      await N('Uma lanterna de latão que ilumina o resultado e o caminho até ele. Equipada no inventário, mostra inscrições que a penumbra apagou.');
      g.advance('arquivo', 6);
    } else if (p.id === 'bau_botas') await N('Um par de botas com nove ilhós de cada lado. A etiqueta avisa: "pontos de vista para considerar, não lista para marcar".');
    else if (p.id === 'bau_pingente') await N('Duas hastes e um ponto no meio. O ponto chama a atenção; quem conta a história são as hastes.');
    return;
  }

  if (p.kind === 'board') return board(g);

  if (p.kind === 'mechanism') {
    const m = MEC[p.id];
    await N(`${m.name}. Na placa de bronze: ${m.ins}`);
    await N(m.foot);
    if (s.flags.includes('ponte_estendida')) return void (await N(p.id === 'mec_b' ? 'O selo está encaixado. O mecanismo gira sem esforço.' : 'Este não está quebrado. Só foi feito para outra pessoa.'));
    if (!D.countItem(s, 'selo_contexto')) return void (await N('Há um encaixe redondo, do tamanho de um lacre. Você não tem nada que caiba nele.'));
    const c = await g.choose([{ text: 'Encaixar o Selo do Contexto aqui' }, { text: 'Ler os outros antes' }], 1);
    if (c !== 0) return;
    g.audio.sfx('mecanismo');
    if (p.id !== 'mec_b') {
      D.setQuestVar(s, 'ponte', 'erros', D.questVar(s, 'ponte', 'erros') + 1);
      g.audio.sfx('erro');
      await N('O mecanismo gira, range e devolve o selo. A ponte estremece e não sai do lugar. Ele funciona; só responde a outro tipo de viajante.');
      if (!s.flags.includes('fiapo_' + p.id)) {
        g.flag('fiapo_' + p.id);
        const e = g.spawnEnemy('fiapo', p.x - 3, p.z + (p.id === 'mec_a' ? -2 : 2), 'ruido');
        e.aggro = true;
        await N('O rangido chamou atenção. Um Fiapo se desprende da névoa do abismo.');
      }
      return;
    }
    D.removeItem(s, 'selo_contexto');
    g.flag('ponte_estendida');
    g.region.actions.ponte?.();
    if (!s.flags.includes('limpo:bosque:margem')) {
      g.spawnEnemy('vulto', 50, -3, 'margem');
      g.spawnEnemy('fiapo', 47, 6, 'margem');
    }
    g.crivo.cheer();
    g.audio.sfx('crivoAlegre');
    await N('O selo assenta com um estalo. Do abismo sobem lajes de pedra, uma a uma, e a ponte se estende até a outra margem.');
    await N('Nenhum dos três mecanismos estava quebrado. A ponte parou porque ninguém perguntou quem estava atravessando.');
    D.unlockCodex(s, 'validade_externa');
    g.toast('Novo verbete no códice: Para quem a ponte foi feita');
    g.advance('ponte', 5);
    g.reward({ id: 'ponte_estendida', xp: 60 });
    return;
  }

  if (p.id === 'marco') {
    if (s.flags.includes('ponte_aberta')) {
      // saves gravados antes da correção: o marco acendeu mas o passo ficou no 5
      if (g.step('ponte') === 5) g.advance('ponte', 6);
      return void (await N('O marco arde baixo e constante. Dá para vê-lo do Pátio.'));
    }
    if (g.step('ponte') < 5 && !s.flags.includes('ponte_estendida')) return void (await N('Um marco de pedra com um pavio seco. Parece esperar alguma coisa.'));
    // quem atravessou sem a missão registrada não fica preso: ela é iniciada e posta em dia
    if (g.step('ponte') < 0) g.startQuest('ponte');
    g.advance('ponte', 5);
    g.flag('ponte_aberta');
    g.region.actions.marco?.();
    g.audio.sfx('sino');
    g.advance('ponte', 6);
    await N('O pavio pega de primeira. A luz sobe pelo marco, e do outro lado do abismo a névoa recua alguns passos, como quem reconhece que perdeu a vez.');
    return;
  }

  if (p.id === 'caixa_dalva') {
    D.markCollected(s, p.id);
    g.give('encomenda_dalva');
    g.refreshProps();
    if (g.step('encomenda') < 0) g.startQuest('encomenda');
    g.advance('encomenda', 1);
    return;
  }

  if (p.kind === 'door') {
    // três saídas legítimas: a habilidade Atalhos, uma gazua, ou chegar por dentro pulando o muro desmoronado
    const inside = p.id === 'grade_bosque' && (g.player?.pos.z ?? 0) > 13.6;
    const skill = !data.skill || s.skills.includes(String(data.skill));
    const pick = D.countItem(s, 'gazua') > 0;
    if (!inside && !skill && !pick) {
      await N('Uma grade de ferro com tranca antiga. Do lado de dentro, um baú.');
      await N('Três caminhos possíveis: a habilidade Atalhos, uma gazua (a banca da Dalva, no Pátio, vende uma), ou o muro leste, onde as pedras caíram e os caixotes ajudam a subir.');
      return;
    }
    if (g.flag('aberta:' + p.id)) {
      g.region.actions[p.id]?.();
      g.audio.sfx('porta');
      if (inside) await N('Por dentro a tranca é só um ferrolho. Ele corre, e a grade abre para fora.');
      else if (!skill && pick) await N('A gazua encontra o pino solto na segunda tentativa. Quem confere a tranca em vez de supor que ela está boa abre o que os outros contornam.');
      else await N('A tranca tinha um pino solto, como quase toda tranca que ninguém confere. A grade abre.');
    }
    return;
  }

  if (p.kind === 'lever') {
    const name = ALAV[p.id];
    if (s.flags.includes('originais_aberta')) return void (await N(`Alavanca do ${name}. A porta já está aberta.`));
    await N(`Alavanca do ${name}. Na porta, em letras fundas: "Abre para o registro que não copiou de ninguém".`);
    const fichas = ['ficha_a', 'ficha_b', 'ficha_c'].filter((f) => D.countItem(s, f) > 0).length;
    if (fichas < 3) await N(`Você tem ${fichas} de três fichas de procedência. Dá para puxar assim mesmo, mas seria palpite.`);
    const c = await g.choose([{ text: `Puxar a alavanca do ${name}` }, { text: 'Ainda não' }], 1);
    if (c !== 0) return;
    g.audio.sfx('mecanismo');
    if (p.id !== 'alavanca_b') {
      g.audio.sfx('erro');
      await N('A alavanca desce, a porta geme e volta. Em algum lugar da sala ao lado, algo repete o gemido, mais alto.');
      if (!s.flags.includes('fiapo_' + p.id)) {
        g.flag('fiapo_' + p.id);
        g.spawnEnemy('fiapo', p.x + (p.id === 'alavanca_a' ? -3 : 3), p.z + 4, 'ruido').aggro = true;
      }
      return;
    }
    g.flag('originais_aberta');
    g.region.actions.porta?.();
    if (!s.flags.includes('limpo:arquivo:eco')) g.spawnEnemy('eco', 0, -31, 'eco');
    g.audio.sfx('porta');
    if (fichas < 3) {
      // acertar sem as três fichas é permitido, mas fica registrado como palpite
      g.flag('originais_palpite');
      await N('A porta cede. Você acertou sem ter lido as três fichas: desta vez o palpite coincidiu com a procedência. As fichas que faltam ainda dizem por quê.');
    }
    await N('O Registro da Maré foi escrito no cais por quem estava lá. Sino e Farol concordavam entre si porque um copiava o outro.');
    D.unlockCodex(s, 'procedencia');
    g.toast('Novo verbete no códice: Cópia de cópia');
    g.advance('arquivo', 4);
    g.reward({ id: 'originais_aberta', xp: 60 });
    return;
  }

  if (p.kind === 'brazier') {
    const vila = p.id === 'braseiro_vila';
    if (s.flags.includes('braseiro_vila') || s.flags.includes('braseiro_terraco')) return void (await N(s.flags.includes(p.id) ? 'O braseiro arde. O óleo era para um só.' : 'Este ficou apagado. Foi uma escolha, não um esquecimento.'));
    await N(vila ? 'O braseiro da estrada. Aceso, ilumina o caminho da Vila: quem espera do outro lado atravessa esta noite. O terraço fica no escuro.' : 'O braseiro do terraço. Aceso, mostra o lugar onde o Veredito espera: você enxerga o que enfrenta. A estrada da Vila fica no escuro mais uma noite.');
    if (!D.countItem(s, 'oleo_lamparina')) return void (await N('Sem óleo, ele não pega.'));
    const c = await g.choose([{ text: vila ? 'Acender o braseiro da estrada' : 'Acender o braseiro do terraço' }, { text: 'Olhar o outro antes' }], 1);
    if (c !== 0) return;
    D.removeItem(s, 'oleo_lamparina');
    g.flag(p.id);
    g.flag('grade_aberta');
    g.region.actions[p.id]?.();
    g.region.actions.grade?.();
    if (!s.flags.includes('limpo:observatorio:veredito')) g.spawnEnemy('veredito', 0, -27, 'veredito');
    g.audio.sfx('sino');
    D.unlockCodex(s, 'trocas');
    await N(vila ? 'A chama sobe e, lá embaixo, a estrada da Vila aparece em âmbar. O terraço à sua frente continua tomado pela névoa. Você vai lutar sem ver direito.' : 'A chama sobe e o terraço se abre à vista, pedra por pedra. Lá embaixo, a estrada da Vila continua escura. Alguém vai esperar mais uma noite.');
    await N('Não havia escolha certa. Havia duas escolhas com contas diferentes para pagar. A grade do terraço se abre.');
    if (vila) g.engine.setFogAmount(2.1);
    g.advance('veredito', 3);
    g.reward({ id: 'braseiro', xp: 50 });
    return;
  }

  if (REG[p.id]) {
    await N(`${REG[p.id].name}. ${REG[p.id].text}`);
    if (first && s.crivoSkills.includes('lupa')) g.ui.hint(`A lupa do Crivo (${g.ui.key('crivo')}) mostra o rastro de tinta por alguns segundos.`, 'O Crivo aponta', 7);
    return;
  }

  if (p.id === 'vento_terraco' || p.id === 'vento_beco') {
    await N(String(data.text));
    // o exame vale em qualquer ponto da missão ativa, inclusive antes de ouvir as duas versões
    if (g.step('vento') >= 0 && g.step('vento') < 2) {
      D.setQuestVar(s, 'vento', p.id, 1);
      if (g.step('vento') === 1 && D.questVar(s, 'vento', 'vento_terraco') && D.questVar(s, 'vento', 'vento_beco')) g.advance('vento', 2);
      else if (g.step('vento') === 0) g.toast('Anotado. Falta ouvir as duas versões para isso fazer sentido.');
    }
    return;
  }

  // examinar genérico
  if (data.needsItem && !D.isEquipped(s, String(data.needsItem))) return void (await N(String(data.dimText ?? 'Há algo gravado aqui, apagado pela penumbra. Com a luz certa, talvez desse para ler.')));
  if (s.crivoSkills.includes('contraste') && g.lastExamined && g.lastExamined !== String(data.text)) await g.say('', `O Crivo põe esta pista ao lado da anterior. Antes: ${g.lastExamined}`);
  await N(String(data.text ?? 'Nada de especial.'));
  g.lastExamined = String(data.text ?? '');
  if (data.codex && D.unlockCodex(s, String(data.codex))) g.toast(`Novo verbete no códice: ${CODEX[String(data.codex)].title}`);
  if (first && data.xp) g.reward({ id: 'exame:' + p.id, xp: Number(data.xp) });
  if (data.mestre) mestresProgresso(g);
  if (data.obra) obrasProgresso(g);
}

function mestresProgresso(g: G): void {
  const s = g.state!;
  const n = MESTRES_IDS.filter((id) => s.codex.includes(id)).length;
  if (g.step('mestres') < 0) g.startQuest('mestres');
  g.toast(`${n} de ${MESTRES_IDS.length} bustos`, 'Passeio dos Mestres');
  if (n >= MESTRES_IDS.length) g.completeQuest('mestres', { xp: 120, items: { anel_duplo_cego: 1 } });
}

function obrasProgresso(g: G): void {
  const s = g.state!;
  const n = OBRAS_IDS.filter((id) => s.codex.includes(id)).length;
  g.toast(`${n} de ${OBRAS_IDS.length} obras`, 'Estantes do Arquivo');
  if (n >= OBRAS_IDS.length) g.reward({ id: 'obras_completas', xp: 100, items: { bussola_cochrane: 1 } });
}

async function board(g: G): Promise<void> {
  const s = g.state!;
  await g.say('', 'O quadro de casos. Papéis presos com alfinete de latão; alguns tão antigos que a tinta virou sépia. Nenhum tem prazo.');
  const opts: Array<{ text: string; run: () => Promise<void>; if?: boolean }> = [
    { text: 'Uma decisão para Lia · caso simulado', if: g.step('lia') < 0, run: async () => void (g.startQuest('lia'), await g.say('', 'Lia, a sineira, costuma ficar no banco a oeste da fonte. O bilhete avisa: caso simulado, dados fictícios.')) },
    { text: 'Duas versões do vento', if: g.step('vento') < 0, run: async () => void (g.startQuest('vento'), await g.say('', 'Noêmia fica no banco a leste da fonte; Tomé, perto dos canteiros do sudoeste. Cada um conta a mesma noite de um jeito.')) },
    { text: 'Encomenda atrasada', if: g.step('encomenda') < 0 && g.step('ponte') >= 1, run: async () => void (g.startQuest('encomenda'), await g.say('', 'Dalva, do Beco dos Ofícios, perdeu uma caixa de ferragens do outro lado da ponte.')) },
    { text: 'Páginas de método', if: g.step('paginas') < 0, run: async () => void (g.startQuest('paginas'), await g.say('', 'Seis páginas de um caderno antigo andam soltas. Três estão aqui no Pátio.')) },
  ];
  if (!opts.some((o) => o.if !== false)) {
    const open = Object.keys(s.quests).filter((q) => D.questActive(s, q)).length;
    await g.say('', open ? 'Tudo o que está no quadro já consta no seu diário.' : 'O quadro está em dia. Por ora, o Pátio não pede nada.');
    return;
  }
  await ask(g, opts, 'Deixar o quadro');
}
