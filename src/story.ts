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
import * as THREE from 'three';
import { Cine, type Plano, type V3 } from './cine/cine';
import type { Ator } from './cine/ator';
import { CANTIGA, Som, type Toque } from './cine/som';
import { CASA, ENF, casa, enfermaria, oficina, serra, vila } from './cine/cenarios';
import {
  ABRACO, AJOELHADA, AJOELHADA_RUA, BOLEIA, CHAPEU_NO_PEITO, DEITADO, ENCOLHIDO, ESTENDE, GOLA, NO_PARAPEITO, SEGURA, SEGURA_MANGA, SENTADO, TRINCO,
  apoiar, caio as caioAtor, chapeu, crianca, dobrar, escrever, figurante, folhaLacrada, helena, maosSemJeito, odila as odilaAtor, protagonista, rastejar, sentadaCochilo, torcer,
} from './cine/elenco';

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
      const n = g.coinGain(Number(data.coins));
      s.coins += n;
      g.toast(`+${n} moedas`);
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
    // o gesto e a haste andam juntos: a mão alcança, o corpo puxa, a haste desce
    g.player?.fig.play('pull');
    g.region.actions['puxa_' + p.id]?.();
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

// ---------- abertura do Novo jogo: O Menino da Janela ----------
/*
 * Roteiro da abertura (docs/game/ABERTURA.md; plano em redesenho/REDESENHO_PARTE_1.md, seção 3.3). Três blocos
 * separados por pretos: a febre em Remanso, a janela, a partida. Cada `c.marca` é um plano da lista de planos;
 * `?cena=2.4` começa direto nele. Nenhum conceito de PBE é nomeado: o que importa fica na imagem (nove potes,
 * a cama treze, a folha fechada, a lanterna na rua) e só se lê no fim do jogo.
 */
export async function abertura(c: Cine, som: Som, look: D.Look): Promise<void> {
  const P = (de: V3, alvo: V3, dur: number, x: Partial<Plano> = {}): Plano => ({ de, alvo, dur, fov: 52, ...x });
  const fala = (t: string, o?: Parameters<Cine['fala']>[1]) => c.fala(t, o);
  const esperaFala = (t: string, o?: Parameters<Cine['fala']>[1]) => c.fala(t, { ...o, espera: false });
  const cantar = (verso: number) => esperaFala(CANTIGA[verso], { canto: true, dur: 3.6 });
  const toques: Toque[] = [];
  const toque = (t: Toque) => (toques.push(t), t);
  const calar = () => {
    for (const t of toques.splice(0)) t.parar(1.5);
  };
  /** anima um valor de 0 a 1 em `s` segundos de cena */
  const animar = (s: number, f: (k: number) => void): void => {
    if (c.ff) return f(1);
    let t = 0;
    const fn = (dt: number) => {
      t += dt;
      f(Math.min(1, t / s));
      if (t >= s) c.extra.splice(c.extra.indexOf(fn), 1);
    };
    c.extra.push(fn);
  };
  /** som que só toca fora do avanço rápido */
  const S = (fn: () => void) => {
    if (!c.ff) fn();
  };
  som.mudo = c.ff;
  const sincronizarMudo = () => (som.mudo = c.ff);
  // concordância com o corpo escolhido na criação (decisão 2 do redesenho)
  const fem = look.body === 'fem';
  const moco = fem ? 'a moça' : 'o moço';
  const ele = fem ? 'ela' : 'ele';
  const agasalhado = fem ? 'agasalhada' : 'agasalhado';
  const filho = fem ? 'minha filha' : 'meu filho';
  let dtq = 1 / 60;

  // ===================== Bloco 1 · A febre =====================
  await c.bloco('1', async () => {
    c.marca('1.1');
    sincronizarMudo();
    const vilaN = vila(false);
    c.montar(vilaN);
    S(() => som.tempo(0.9, 0.25));
    const balde = figurante('homem do balde', 'npc_08_cartografo', { coat: 0x2a2420 });
    c.ator(balde).em(-2.2, 0, -2.5, Math.PI);
    c.corte(P([0, 16, 16], [0, 2, -8], 1));
    // preto com som: a carga ganha esse tempo
    await c.espera(5);
    S(() => som.tosse(0.9));
    await c.espera(7);
    S(() => som.tosse(0.4));
    await c.espera(5);
    S(() => som.rangido(0.2));
    await c.espera(6);
    S(() => som.tosse(0.7));
    await c.espera(4);
    S(() => toque(som.cantiga({ perto: 0.05, ate: 10 })));
    await c.espera(9);

    c.marca('1.2');
    sincronizarMudo();
    S(() => som.sino(false, 0.22));
    c.corte(P([0, 15, 15], [0, 2.2, -8], 25, { para: [0.6, 2.4, 3.5], alvoPara: [0, 1.8, -8], curva: 'sai' }));
    void c.preto(false, 2.5);
    void balde.andar([[-1.2, -5.5], [0, -7.6]], 0.9).then(() => balde.ver(false));
    await c.espera(4);
    void c.letreiro('Remanso');
    await c.espera(21);

    // dentro: a enfermaria
    await c.preto(true, 0.6);
    c.marca('1.3');
    sincronizarMudo();
    c.montar(enfermaria(false));
    S(() => som.tempo(0.7, 0.1));
    const hel = c.ator(helena(false)).em(-6.5, 0, 1.7, Math.PI / 2);
    const mae = c.ator(figurante('uma mãe', 'npc_02_acendedora', { coat: 0x2e2420, altura: 1.62 })).em(-1.3, 0, 1.25, Math.PI);
    mae.posar(AJOELHADA, 50);
    const silv = c.ator(figurante('o moço', 'npc_11_detetive', { coat: 0x2a2a30, altura: 1.76 })).em(ENF.mesa[0] + 0.05, 0, ENF.mesa[1] + 0.62, Math.PI);
    silv.poseFn = escrever;
    const crian = c.ator(crianca(look)).em(ENF.cama12[0], 0.5, ENF.cama12[1], 0).deitar(1);
    crian.posar(ENCOLHIDO, 50);
    const odila = c.ator(odilaAtor()).em(ENF.cama13[0], 0.5, ENF.cama13[1], 0).deitar(-1);
    odila.posar(ENCOLHIDO, 50);
    c.corte(P([-8.4, 0.62, 2.0], [-5.6, 0.75, 1.2], 50, { para: [1.4, 0.62, 2.0], alvoPara: [4.4, 0.75, 1.2], curva: 'linear', fov: 50 }));
    void c.preto(false, 1.2);
    void hel.andar([[-1.5, 1.7], [5.5, 1.7]], 0.55);
    S(() => som.tosse(0.3));
    await c.espera(9);
    mae.olharPara = hel;
    await fala('Doutora, a minha não come desde ontem.', { ator: mae });
    hel.olharPara = mae;
    await fala('Põe água na boca dela. Pouquinho, de hora em hora.', { ator: hel });
    hel.olharPara = null;
    S(() => som.tosse(0.6));
    await c.espera(14);
    S(() => som.rangido(0.15));
    await c.espera(12);

    c.marca('1.4');
    sincronizarMudo();
    hel.parar();
    hel.em(-5.6, 0, -1.6, -Math.PI / 2);
    const [mx, mz] = ENF.mesa;
    c.corte(P([mx + 1.0, 1.12, mz + 0.1], [mx + 0.05, 0.86, mz + 0.18], 35, { para: [mx + 0.92, 1.1, mz + 0.18], fov: 44, mao: 0.006 }));
    await c.espera(8);
    await fala('Vai dormir, moço.', { quem: 'A doutora' });
    await c.espera(2);
    await fala('Já vou. Falta a fileira do fundo.', { ator: silv });
    await c.espera(14);

    c.marca('1.5');
    sincronizarMudo();
    const [ax, az] = ENF.armario;
    hel.em(ax - 0.75, 0, az, Math.PI / 2);
    const pote = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.12, 8), new THREE.MeshStandardMaterial({ color: 0x7a4a2c, roughness: 0.9 }));
    c.corte(P([ax - 2.6, 1.45, az + 2.4], [ax - 0.1, 1.05, az], 14, { para: [ax - 2.8, 1.45, az + 2.2], fov: 48 }));
    await c.espera(3.5);
    hel.gesto('reach');
    await c.espera(1.2);
    hel.segurar(pote, 'Right', [0, -0.04, 0]);
    await c.espera(1.5);
    hel.olharPara = new THREE.Vector3(0, 0.6, 0);
    await c.espera(3);
    hel.olharPara = null;
    // panorâmica acompanhando: duas camas recebem pote, sem pressa
    c.corte(P([ax - 2.8, 1.45, az + 2.2], [ax - 0.4, 1.0, az + 0.6], 26, { alvoPara: [3.6, 0.7, -1.6], curva: 'suave', fov: 48 }));
    await hel.andar([[ax - 0.9, -1.6], [6.2, -1.6]], 0.6);
    hel.em(6.2, 0, -1.6, Math.PI);
    hel.gesto('pickup');
    await c.espera(2.4);
    await hel.andar([[3.6, -1.6]], 0.6);
    hel.em(3.6, 0, -1.6, 0);
    hel.gesto('pickup');
    await c.espera(2.6);
    S(() => som.passo(0.1));
    await c.espera(4);

    c.marca('1.6');
    sincronizarMudo();
    hel.segurar(pote, 'Right', [0, -0.04, 0]);
    hel.em(ENF.cama12[0] + 0.15, 0, ENF.cama12[1] - 1.25, 0).posar(AJOELHADA, 2.5);
    crian.olharPara = null;
    c.corte(P([4.9, 0.75, 1.85], [3.0, 0.62, 2.9], 20, { para: [4.7, 0.72, 1.95], fov: 50 }));
    calar();
    S(() => toque(som.cantiga({ perto: 0.55 })));
    cantar(0);
    await c.espera(3.6);
    cantar(1);
    hel.olharPara = odila;
    await c.espera(2);
    hel.olharPara = crian;
    await c.espera(1.6);
    cantar(2);
    await c.espera(3.6);
    cantar(3);
    await c.espera(4);
    await fala('Vai arder um pouco.', { ator: hel });
    hel.segurar(null);
    await c.espera(2);

    // ---- 1.7 as sete noites ----
    c.marca('1.7');
    sincronizarMudo();
    const noite = async (n: number, corpo: () => Promise<void>) => {
      c.log.push(`noite ${n}`);
      S(() => som.sino(false, 0.18));
      await corpo();
    };
    await noite(1, async () => {
      hel.poseFn = torcer;
      hel.em(ENF.bacia[0] + 0.05, 0, ENF.bacia[1] - 0.7, 0);
      c.corte(P([2.15, 1.05, 3.05], [ENF.bacia[0], 0.55, ENF.bacia[1] - 0.2], 13, { fov: 44 }));
      S(() => som.pano());
      await c.espera(6);
      S(() => som.pano());
      await c.espera(7);
      hel.poseFn = null;
    });
    await noite(2, async () => {
      c.corte(P([3.4, 0.75, 3.1], [2.9, 0.62, 3.75], 10, { fov: 40 }));
      await c.espera(10);
    });
    await noite(3, async () => {
      const banquinho = 0;
      hel.em(ENF.cama12[0] + 0.15, 0, ENF.cama12[1] - 1.3, 0);
      hel.poseFn = () => sentadaCochilo(banquinho);
      let acorda = 0;
      hel.poseFn = () => sentadaCochilo(acorda);
      c.corte(P([5.2, 1.0, 1.0], [3.7, 0.75, 1.9], 14, { fov: 46 }));
      await c.espera(9);
      S(() => som.sino(false, 0.2));
      animar(0.5, (k) => (acorda = k));
      await c.espera(5);
      hel.poseFn = null;
    });
    await noite(4, async () => {
      // ao fundo, fora de foco, dois homens levam uma trouxa pequena; Helena não vira
      hel.em(ENF.cama12[0] + 0.15, 0, ENF.cama12[1] - 1.25, 0).posar(AJOELHADA, 50);
      const h1 = c.ator(figurante('homem', 'npc_01_arquivista', { coat: 0x1e1a18 })).em(-3.6, 0, -0.7, Math.PI / 2);
      const h2 = c.ator(figurante('homem', 'npc_08_cartografo', { coat: 0x26201c })).em(-4.6, 0, -0.7, Math.PI / 2);
      const trouxa = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.5, 3, 8), new THREE.MeshStandardMaterial({ color: 0x8f7c5e, roughness: 1 }));
      trouxa.rotation.z = Math.PI / 2;
      h1.segurar(trouxa, 'Left', [-0.3, 0, 0]);
      h1.posar(ESTENDE, 50);
      c.corte(P([5.4, 1.15, 0.8], [3.7, 0.9, 2.0], 15, { fov: 40 }));
      void h1.andar([[-1, -0.7], [6.2, -4.0]], 0.7);
      void h2.andar([[-2, -0.7], [5.4, -4.0]], 0.7);
      S(() => toque(som.choro(9, 0.1)));
      await c.espera(15);
      h1.segurar(null);
      h1.ver(false);
      h2.ver(false);
    });
    await noite(5, async () => {
      // a mão da criança segura o dedo dela
      hel.em(ENF.cama12[0] + 0.15, 0, ENF.cama12[1] - 1.25, 0).posar(AJOELHADA, 50);
      c.corte(P([3.1, 0.95, 1.85], [3.65, 0.62, 2.45], 18, { fov: 38, para: [3.15, 0.92, 1.9] }));
      await c.espera(3);
      await fala('Mãe, tá frio.', { ator: crian });
      await fala('Tá frio porque a febre tá indo embora.', { ator: hel });
      await c.espera(4);
    });
    await noite(6, async () => {
      // o moço da mesa olha para ela, abre a boca e não fala
      silv.poseFn = null;
      silv.posar(escrever(0), 50);
      silv.em(ENF.mesa[0] + 0.05, 0, ENF.mesa[1] + 0.62, Math.PI * 0.35);
      silv.olharPara = hel;
      silv.rosto = { boca_abrir: 0 };
      c.corte(P([mx - 0.6, 1.25, mz + 1.4], [3.6, 0.9, 1.9], 13, { fov: 34 }));
      await c.espera(5);
      animar(0.4, (k) => (silv.rosto = { boca_abrir: 0.3 * k, sobrancelha_erguer: 0.3 * k }));
      await c.espera(3);
      animar(0.6, (k) => (silv.rosto = { boca_abrir: 0.3 * (1 - k), tristeza: 0.4 * k }));
      await c.espera(5);
      silv.olharPara = null;
    });
    await noite(7, async () => {
      // a última: ela acordada, a vela no fim
      hel.posar(AJOELHADA, 50);
      hel.olharPara = crian;
      c.corte(P([5.6, 1.2, 0.4], [3.6, 0.7, 2.4], 12, { para: [5.2, 1.1, 0.9], fov: 48 }));
      await c.espera(12);
    });

    c.marca('1.8');
    sincronizarMudo();
    calar();
    await c.preto(true, 2);
    S(() => som.tempo(0, 0));
    await c.espera(3);
    S(() => som.passarinho());
    await c.espera(3);
  });

  // ===================== Bloco 2 · A janela =====================
  await c.bloco('2', async () => {
    c.marca('2.1');
    sincronizarMudo();
    calar();
    S(() => som.tempo(0, 0.05));
    const cen = enfermaria(true);
    c.montar(cen);
    const R = ENF.rastro;
    const crian = c.ator(crianca(look)).em(R.x0, 0, R.z, Math.PI / 2).deitar(2, 0.12);
    const odila = c.ator(odilaAtor()).em(ENF.cama13[0], 0.5, ENF.cama13[1], 0).deitar(-1);
    odila.posar(ENCOLHIDO, 50);
    const hel = c.ator(helena(false)).em(R.x1 - 2.4, 0, R.z - 1.6, Math.PI / 2).ver(false);
    let fase = 0;
    c.extra.push((d) => (dtq = d));
    crian.poseFn = () => rastejar(fase);
    // câmera baixa e presa atrás da criança, a janela fechando o fundo
    const alvoJ = new THREE.Vector3(ENF.janela[0], 0.75, ENF.janela[1] + 0.15);
    c.corte(P([R.x0 - 1.3, 1.1, 4.2], [R.x0 + (alvoJ.x - R.x0) * 0.45, 0.45, R.z], 1, { fov: 52 }));
    const _alvo = new THREE.Vector3();
    c.seguir = () => {
      const cx = crian.base.position.x;
      return { pos: new THREE.Vector3(cx - 1.3, 1.1, 4.2), alvo: _alvo.set(cx + (alvoJ.x - cx) * 0.45, 0.45, R.z + (alvoJ.z - R.z) * 0.45) };
    };
    await c.preto(false, 2.5);
    S(() => toque(som.cantiga({ perto: 0.35, bpm: 62 })));
    // três apoios: no terceiro, as mãos dela
    const apoios = [R.x0 + 1.15, R.x0 + 2.55, R.x1];
    let x = R.x0;
    let semMexer = 0;
    let respiro = 0;
    c.ligarToque(true);
    for (let i = 0; i < apoios.length; i++) {
      await c.ate_(() => {
        const f = c.frente();
        const dt = dtq;
        if (f > 0.05) {
          const v = 0.075 * f;
          x = Math.min(apoios[i], x + v * dt);
          fase += v * dt * 22;
          semMexer = 0;
          c.dica(null);
        } else if ((semMexer += dt) > 4) c.dica(document.body.classList.contains('touch') ? 'Segure o dedo na tela' : 'Segure para a frente');
        crian.base.position.x = x;
        if ((respiro += dt) > 2.4 && f > 0.05) {
          respiro = 0;
          S(() => som.respirar(0.07));
        }
        return x >= apoios[i] - 0.001;
      });
      c.dica(null);
      // de bruços para de joelhos, virada para a parede sul; tenta subir
      const r = crian.fig.root;
      const h = crian.fig.height;
      crian.poseFn = null;
      crian.posar(apoiar(0), 4);
      const rumo0 = crian.base.rotation.y;
      animar(0.9, (k) => {
        r.rotation.x = (Math.PI / 2) * (1 - k);
        r.position.set(0, 0.12 * (1 - k), (-h / 2) * (1 - k));
        crian.base.rotation.y = rumo0 + (0 - rumo0) * k * (i < 2 ? 1 : 0);
      });
      await c.espera(1.1);
      let subir = 0;
      animar(2.6, (k) => {
        subir = k;
        crian.posar(apoiar(subir * (i < 2 ? 0.75 : 0.95)), 50);
      });
      await c.espera(2.8);
      if (i < 2) {
        // cai de novo
        S(() => som.queda());
        animar(0.35, (k) => {
          r.rotation.x = (Math.PI / 2) * k;
          r.position.set(0, 0.12 * k, (-h / 2) * k);
          crian.base.rotation.y = 0 + (Math.PI / 2 - 0) * k;
        });
        await c.espera(1.4);
        crian.posar(null, 50);
        crian.poseFn = () => rastejar(fase);
      }
    }
    c.ligarToque(false);
    // mãos de mulher entram no quadro e a seguram pelos braços
    hel.ver(true).em(R.x1 - 0.5, 0, R.z, Math.PI / 2).posar(SEGURA, 50);
    hel.base.position.x -= 0.6;
    void hel.andar([[R.x1 - 0.48, R.z]], 0.5);
    await c.espera(2);
    crian.posar(null, 2);
    await c.espera(2);

    c.marca('2.2');
    sincronizarMudo();
    hel.parar();
    hel.em(R.x1 - 0.48, 0, R.z, Math.PI / 2).posar(TRINCO, 3);
    crian.em(R.x1 - 0.1, 0, R.z + 0.05, Math.PI / 2).posar(null, 50);
    crian.fig.root.rotation.set(0, 0, 0);
    crian.fig.root.position.set(0, 0, 0);
    c.corte(P([ENF.janela[0] - 1.9, 1.45, ENF.janela[1] - 1.2], [ENF.janela[0], 1.55, ENF.janela[1]], 20, { para: [ENF.janela[0] - 1.6, 1.4, ENF.janela[1] - 0.9], fov: 46 }));
    await c.espera(4);
    // a janela abre; a cantiga para no meio do verso; a luz toma a tela, sem som
    const fe = cen.h.folhaEsq;
    const fd = cen.h.folhaDir;
    const e0 = fe.rotation.y;
    const d0 = fd.rotation.y;
    animar(1.4, (k) => {
      fe.rotation.y = e0 - 1.7 * k;
      fd.rotation.y = d0 + 1.7 * k;
    });
    S(() => som.porta());
    calar();
    const fora = (cen.h.fora as THREE.Mesh).material as THREE.MeshBasicMaterial;
    const luzJ = cen.lamps[cen.lamps.length - 1];
    animar(1.5, (k) => {
      fora.color.setHex(0x5a6070).lerp(new THREE.Color(0xfff0c8), k);
      luzJ.intensity = 0.7 + 3.5 * k;
      luzJ.color = 0xffd8a0;
    });
    c.branco(0.92, 1.5);
    await c.espera(c.ff ? 0 : 2);

    c.marca('2.3');
    // dois quadros dentro da luz; com Reduzir movimento, um segundo em luz baixa
    const rm = document.body.classList.contains('rm');
    if (rm) {
      c.branco(0.55, 0.5);
      await c.espera(0.6);
    }
    await c.silhueta(rm ? 1 : 2 / 30);
    await c.espera(1.5);

    c.marca('2.4');
    sincronizarMudo();
    c.branco(0.18, 3);
    const porta = ENF.porta;
    const h1 = c.ator(figurante('um homem', 'npc_08_cartografo', { coat: 0x2a241e })).em(porta[0] - 0.4, 0, porta[1] + 1.1, 0.3);
    const m1 = c.ator(figurante('uma mulher', 'npc_12_acolita', { coat: 0x3a3028 })).em(porta[0] + 0.5, 0, porta[1] + 1.3, -0.2);
    const m2 = c.ator(figurante('outra mulher', 'npc_02_acendedora', { coat: 0x2e2420 })).em(porta[0] + 0.1, 0, porta[1] + 0.6, 0);
    for (const a of [h1, m1, m2]) a.olharPara = crian;
    // a criança de pé no parapeito, a mãe atrás
    crian.em(ENF.janela[0] - 0.12, 0.9, ENF.janela[1], Math.PI / 2).posar(NO_PARAPEITO, 2);
    hel.em(ENF.janela[0] - 0.75, 0, ENF.janela[1], Math.PI / 2).posar(SEGURA, 50);
    luzJ.intensity = 1.6;
    fora.color.setHex(0xd8d0b8);
    c.corte(P([5.4, 1.7, -3.2], [6.0, 1.2, 3.2], 40, { para: [5.6, 1.68, -2.9], fov: 52 }));
    let desb = 0;
    c.extra.push((dt) => {
      desb = Math.min(1, desb + dt / 34);
      odila.desbotar(desb);
    });
    await c.espera(5);
    h1.gesto('point');
    await fala('Levantou.', { ator: h1 });
    await c.espera(1.5);
    m1.gesto('bow');
    await fala('Foi o unguento.', { ator: m1 });
    await fala('Foi o unguento da doutora.', { ator: m2 });
    hel.posar(ABRACO, 2);
    hel.olharPara = crian;
    await c.espera(12);

    // ---- 2.5 a folha ----
    await c.preto(true, 0.8);
    c.marca('2.5');
    sincronizarMudo();
    c.branco(0, 0.1);
    const casaD = casa(true, false);
    c.montar(casaD);
    casaD.h.porta.rotation.y = -1.4;
    const helC = c.ator(helena(false)).em(CASA.porta[0], 0, CASA.porta[1] + 0.7, Math.PI);
    const rapaz = c.ator(figurante('o moço', 'npc_11_detetive', { coat: 0x2a2a30, altura: 1.76 })).em(CASA.porta[0] + 0.05, 0, CASA.porta[1] - 0.55, 0);
    const folha = folhaLacrada();
    folha.rotation.x = Math.PI / 2;
    rapaz.segurar(folha, 'Right', [0, 0, 0.04]);
    rapaz.posar(ESTENDE, 3);
    // por cima do ombro dela; o visitante fica cortado do peito para cima
    c.corte(P([CASA.porta[0] + 0.62, 1.42, CASA.porta[1] + 1.6], [CASA.porta[0] - 0.05, 1.0, CASA.porta[1] - 0.5], 35, { fov: 42 }));
    await c.preto(false, 1);
    await c.espera(2);
    await fala('Doutora, isso aqui é da enfermaria. De todas. A senhora devia ver antes de...', { ator: rapaz });
    helC.gesto('reach');
    await c.espera(0.6);
    await fala(`Eu vi ${filho} levantar.`, { ator: helC });
    rapaz.segurar(null);
    helC.segurar(folha, 'Right', [0, 0, 0.04]);
    rapaz.posar(null, 2);
    // ela põe a folha em cima da estante da cozinha, sem abrir
    const [ex, ez] = CASA.estante;
    await helC.andar([[ex + 0.7, ez]], 0.8);
    helC.em(ex + 0.6, 0, ez, -Math.PI / 2).gesto('reach');
    c.corte(P([ex + 2.2, 1.6, ez + 1.4], [ex + 0.1, 1.9, ez], 10, { fov: 46 }));
    await c.espera(0.8);
    helC.segurar(null);
    folha.position.set(ex + 0.05, 2.25, ez + 0.3);
    folha.rotation.set(0, 0.4, 0);
    await c.espera(4);
    void rapaz.andar([[CASA.porta[0], CASA.porta[1] - 3]], 0.9);
    await c.espera(4);
    rapaz.ver(false);

    // ---- 2.6 a visita da noite ----
    await c.preto(true, 0.8);
    c.marca('2.6');
    sincronizarMudo();
    const casaN = casa(false, false);
    c.montar(casaN);
    // a folha continua na estante
    casaN.root.add(folha);
    folha.position.set(ex + 0.05, 2.25, ez + 0.3);
    const helN = c.ator(helena(false)).em(CASA.porta[0] + 0.1, 0, CASA.porta[1] + 1.2, Math.PI);
    const velho = c.ator(figurante('uma voz de velho', 'npc_10_professor', { coat: 0x1e1a16 })).em(CASA.porta[0], 0, CASA.porta[1] - 0.75, 0).posar(CHAPEU_NO_PEITO, 50);
    const chap = chapeu();
    chap.rotation.x = Math.PI / 2;
    chap.scale.setScalar(0.8);
    velho.segurar(chap, 'Right', [0.08, 0, 0.06]);
    const lampPorta = casaN.lamps[casaN.lamps.length - 1];
    c.corte(P([CASA.porta[0] + 1.3, 1.5, CASA.porta[1] + 0.45], [CASA.porta[0] - 0.05, 1.42, CASA.porta[1] + 1.1], 30, { para: [CASA.porta[0] + 1.2, 1.48, CASA.porta[1] + 0.5], fov: 44 }));
    await c.preto(false, 1);
    S(() => som.bater());
    await c.espera(2.5);
    helN.gesto('pull');
    S(() => som.porta());
    animar(1.4, (k) => {
      casaN.h.porta.rotation.y = -1.2 * k;
      lampPorta.intensity = 0.9 * k;
    });
    // a mão velha com o chapéu contra o peito, na fresta
    c.corte(P([CASA.porta[0] + 0.55, 1.3, CASA.porta[1] + 0.95], [CASA.porta[0] - 0.05, 1.2, CASA.porta[1] - 0.7], 6, { fov: 34 }));
    await c.espera(3.5);
    c.corte(P([CASA.porta[0] + 1.25, 1.5, CASA.porta[1] + 0.48], [CASA.porta[0] - 0.05, 1.42, CASA.porta[1] + 1.1], 30, { para: [CASA.porta[0] + 1.15, 1.48, CASA.porta[1] + 0.52], fov: 44 }));
    helN.olharPara = velho;
    await fala('A senhora fez uma coisa bonita, doutora. Tem muita gente precisando saber.', { quem: 'Uma voz de velho', ator: velho });
    await fala('Eu só fiquei acordada.', { ator: helN });
    await fala('Pois então. Deixa a gente contar por você.', { quem: 'Uma voz de velho', ator: velho });
    await c.espera(3);

    // ---- 2.7 os anos ----
    await c.preto(true, 0.8);
    c.marca('2.7');
    sincronizarMudo();
    const of = oficina();
    c.montar(of);
    S(() => som.sino(true, 0.3));
    void c.preto(false, 0.6);
    c.corte(P([-8.6, 1.5, 0.7], [-9, 0.9, 0], 5, { fov: 40 }));
    await c.espera(5);
    c.corte(P([-2.2, 1.6, 1.4], [-3, 1.0, 0], 5, { fov: 44 }));
    const pl = of.h.placa;
    animar(0.6, (k) => (pl.position.y = 1.5 - 0.52 * k));
    S(() => som.prensa());
    await c.espera(5);
    S(() => som.sino(true, 0.25));
    c.corte(P([3, 1.5, 2.2], [3, 1.6, -0.3], 5, { fov: 46 }));
    await c.espera(5);
    c.corte(P([9.4, 1.5, -1.0], [9, 1.5, -2.1], 5, { fov: 40 }));
    await c.espera(5);
    // o banco dos romeiros cheio, na frente da clínica dela
    const vilaD = vila(true);
    c.montar(vilaD);
    for (let i = 0; i < 4; i++) {
      const a = c.ator(figurante('romeiro', ['npc_01_arquivista', 'npc_12_acolita', 'npc_06_novico', 'npc_04_estalajadeira'][i], { coat: [0x2a2420, 0x3a3028, 0x4a4238, 0x2e2a26][i] }));
      a.em(7.85, 0, 5.0 + i * 0.65, -Math.PI / 2).posar(SENTADO, 50);
    }
    S(() => som.sino(true, 0.3));
    c.corte(P([3.5, 1.7, 9.5], [8, 1.0, 6], 8, { para: [3.8, 1.7, 8.8], fov: 46 }));
    await c.espera(2);
    void c.letreiro('Quinze anos depois', 5);
    await c.espera(6);
  });

  // ===================== Bloco 3 · A partida =====================
  await c.bloco('3', async () => {
    await c.preto(true, 1);
    c.marca('3.1');
    sincronizarMudo();
    calar();
    S(() => som.tempo(0, 0.2));
    const casaA = casa(true, true);
    c.montar(casaA);
    const eu = c.ator(protagonista(look)).em(CASA.mala[0], 0, CASA.mala[1] - 0.75, 0);
    eu.poseFn = dobrar;
    const hel = c.ator(helena(true)).em(-1.5, 0, 0, Math.PI / 2).ver(false);
    c.corte(P([CASA.mesa[0] + 0.5, 1.3, CASA.mesa[1] + 0.7], [CASA.mesa[0] - 0.1, 0.92, CASA.mesa[1]], 9, { fov: 40 }));
    await c.preto(false, 1.5);
    S(() => toque(som.tema({ bpm: 44, vol: 0.05 })));
    await c.espera(7);
    c.corte(P([0.9, 1.6, -2.2], [3.4, 1.2, 1.0], 22, { para: [1.1, 1.6, -2.0], fov: 50 }));
    await esperaFala('(lá fora, a mãe conversa com o carroceiro)', { canto: true, dur: 4 });
    await c.espera(22);

    c.marca('3.2');
    sincronizarMudo();
    hel.ver(true);
    await hel.andar([[CASA.mala[0] - 0.05, CASA.mala[1] - 1.4]], 0.9);
    eu.poseFn = null;
    eu.base.rotation.y = Math.PI;
    hel.em(CASA.mala[0] - 0.05, 0, CASA.mala[1] - 1.35, 0).posar(GOLA, 3);
    hel.olharPara = eu;
    eu.olharPara = hel;
    c.corte(P([3.6, 1.65, 0.0], [2.05, 1.45, 0.5], 50, { para: [3.4, 1.62, 0.1], fov: 46 }));
    await c.espera(3);
    await fala(`Você tá ${agasalhado}?`, { ator: hel });
    await fala('Tô, mãe.', { ator: eu });
    hel.posar(ESTENDE, 3);
    const pao = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.12), new THREE.MeshStandardMaterial({ color: 0x8f7c5e, roughness: 1 }));
    hel.segurar(pao, 'Right');
    await fala('Lá em cima venta. Coma direito.', { ator: hel });
    hel.segurar(null);
    eu.segurar(pao, 'Left');
    hel.posar(null, 3);
    // ele vira para a janela; ela põe um pote embrulhado no fundo da mala; a câmera vê, ele não
    eu.olharPara = new THREE.Vector3(CASA.janela[0], 1.6, CASA.janela[1]);
    eu.base.rotation.y = Math.PI / 2;
    await c.espera(1.5);
    c.corte(P([CASA.mala[0] - 1.2, 1.5, CASA.mala[1] - 0.9], [CASA.mala[0], 0.6, CASA.mala[1]], 14, { fov: 40 }));
    hel.base.rotation.y = 0.5;
    hel.gesto('pickup');
    await c.espera(1.3);
    const embr = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.13, 8), new THREE.MeshStandardMaterial({ color: 0x8f7c5e, roughness: 1 }));
    embr.position.set(CASA.mala[0] + 0.15, 0.62, CASA.mala[1]);
    casaA.root.add(embr);
    await c.espera(4);
    eu.segurar(null);
    await c.espera(4);

    c.marca('3.3');
    sincronizarMudo();
    await c.preto(true, 0.6);
    const vilaD = vila(true);
    c.montar(vilaD);
    S(() => som.tempo(0, 0.3));
    const eu2 = c.ator(protagonista(look)).em(6.4, 0, 1.0, 0);
    const rom: Ator[] = [];
    for (let i = 0; i < 3; i++) {
      const a = c.ator(figurante('romeiro', ['npc_12_acolita', 'npc_01_arquivista', 'npc_06_novico'][i], { coat: [0x3a3028, 0x2a2420, 0x4a4238][i] }));
      a.em(7.85, 0, 5.2 + i * 0.7, -Math.PI / 2).posar(SENTADO, 50);
      rom.push(a);
    }
    const helP = c.ator(helena(true)).em(8.3, 0, 8.6, -Math.PI / 2 - 0.4);
    c.corte(P([3.2, 1.8, 3.0], [7.0, 1.2, 5.6], 35, { para: [3.6, 1.75, 4.6], fov: 48 }));
    await c.preto(false, 0.8);
    void eu2.andar([[6.6, 5.6]], 1.0);
    await c.espera(3.5);
    for (const a of rom) {
      a.posar(null, 2.5);
      a.olharPara = eu2;
    }
    await c.espera(1.4);
    eu2.parar();
    eu2.base.rotation.y = Math.PI / 2;
    // uma mulher segura a manga do casaco dele
    rom[0].em(7.25, 0, 5.4, -Math.PI / 2).posar(SEGURA_MANGA, 3);
    rom[0].olharPara = eu2;
    await fala(`É ${ele}.`, { ator: rom[0] });
    eu2.poseFn = maosSemJeito;
    c.corte(P([6.0, 1.3, 7.0], [6.9, 1.0, 5.5], 10, { fov: 40 }));
    await c.espera(3);
    helP.olharPara = rom[0];
    await fala(`Deixa ${moco}, que ${ele} tem estrada.`, { ator: helP });
    rom[0].posar(null, 2);
    await c.espera(2);

    // ---- 3.4 a serra ----
    await c.preto(true, 0.8);
    c.marca('3.4');
    sincronizarMudo();
    const sr = serra();
    c.montar(sr);
    S(() => som.tempo(0, 0.7));
    const carro = sr.h.carro;
    const eu3 = c.ator(protagonista(look));
    const carroceiro = c.ator(figurante('o carroceiro', 'npc_03_vigia', { coat: 0x2a241e }));
    eu3.posar(SENTADO, 50);
    carroceiro.posar(BOLEIA, 50);
    let cz = 22;
    const xEstrada = (z: number) => Math.sin(((30 - z) / 9) * 0.5) * 2.2;
    const poeCarro = () => {
      const x = xEstrada(cz);
      carro.position.set(x, 0, cz);
      carro.rotation.y = Math.PI;
      // o carro olha para o norte (-z): o rumo π
      eu3.em(x + 0.3, 0.88, cz + 0.6, Math.PI / 2 + Math.PI);
      carroceiro.em(x - 0.3, 0.88, cz - 0.9, Math.PI);
    };
    poeCarro();
    const andarCarro = (dt: number) => {
      cz -= dt * 0.9;
      poeCarro();
    };
    c.extra.push(andarCarro);
    const rodas = S(() => toque(som.carroca(0.16)));
    void rodas;
    // plano aberto da garganta, Pedra Alta no alto entre a névoa, o feixe passa pela carroça
    c.corte(P([2.5, 6.5, 44], [0, 14, -80], 40, { para: [1.8, 5.2, 37], alvoPara: [2, 24, -150], fov: 50 }));
    await c.preto(false, 2);
    await c.espera(10);
    c.corte(P([xEstrada(cz) + 2.2, 1.9, cz - 3.5], [xEstrada(cz), 1.4, cz + 0.4], 24, { fov: 48 }));
    c.seguir = () => ({ pos: new THREE.Vector3(xEstrada(cz) + 2.2, 1.9, cz - 3.5), alvo: new THREE.Vector3(xEstrada(cz), 1.4, cz + 0.4) });
    await c.espera(3);
    carroceiro.olharPara = eu3;
    await fala('Primeira vez em Pedra Alta?', { ator: carroceiro });
    eu3.olharPara = carroceiro;
    await fala('É.', { ator: eu3 });
    await c.espera(1.5);
    await fala('Lá todo mundo sabe quem é quem.', { ator: carroceiro });
    carroceiro.olharPara = null;
    eu3.olharPara = new THREE.Vector3(0, 30, -150);
    await c.espera(6);

    // ---- 3.5 a freada ----
    c.marca('3.5');
    sincronizarMudo();
    c.extra.splice(c.extra.indexOf(andarCarro), 1);
    calar();
    const xs = xEstrada(cz - 6);
    const caio = c.ator(caioAtor()).em(xs - 0.3, 0.05, cz - 6, Math.PI / 2).deitar(0, 0.05);
    caio.posar(DEITADO, 50);
    const marta = c.ator(figurante('Marta', 'npc_02_acendedora', { coat: 0x3a2e24, altura: 1.62 })).em(xs + 0.55, 0, cz - 6.2, -Math.PI / 2).posar(AJOELHADA_RUA, 50);
    marta.olharPara = caio;
    c.seguir = null;
    c.corte(P([xEstrada(cz) + 1.9, 1.55, cz - 1.6], [xs, 0.45, cz - 6], 12, { para: [xEstrada(cz) + 1.7, 1.5, cz - 2.0], fov: 46 }));
    S(() => som.rangido(0.3));
    await c.espera(1);
    marta.olharPara = eu3;
    await fala('Ajuda! Pelo amor de Deus, alguém ajuda!', { ator: marta });
    // ele desce da carroça
    eu3.posar(null, 4);
    eu3.em(xEstrada(cz) + 1.1, 0, cz - 0.2, Math.PI);
    void eu3.andar([[xs + 0.4, cz - 4.8]], 1.3);
    c.letterbox(false);
    await c.espera(2.5);
    c.titulo('Estrada da Serra');
    await c.espera(3);
  });

  calar();
  som.tempo(0, 0);
  Cine.marcarVista();
}
