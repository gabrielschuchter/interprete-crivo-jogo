import { mirror, type Pose, type V3 } from './motion';

/**
 * Como cada personagem se porta. Os clipes de captura são os mesmos para todo o elenco; a persona é o que faz o
 * monge parecer monge e a detetive parecer detetive em movimento: postura, braços em repouso, tempo, jeito de
 * falar e de escutar e uma ação de ofício para os momentos de espera.
 *
 * Direções no espaço do personagem: +X é a esquerda dele, +Y para cima, +Z para a frente. Ângulos em radianos
 * (x positivo inclina para a frente, y gira para a esquerda, z tomba para a direita).
 * Mãos que seguram objetos da forja (lampião, alabarda, bengala, livro) não recebem pose de repouso daquele lado.
 */
export type TalkStyle = 'contida' | 'uma' | 'duas' | 'aula' | 'larga' | 'inquieta' | 'oracao';

export interface Persona {
  /** postura de sempre (tronco, ombros, cabeça) */
  posture: Pose;
  /** braços em repouso por cima do clipe idle, e quanto pesam (0..1) */
  rest?: Pose;
  restW?: number;
  /** velocidade do idle: o velho respira devagar, o órfão não para */
  tempo: number;
  /** peso do clipe de fala da captura (o resto é a persona) */
  talkW: number;
  talk: TalkStyle;
  /** pose ao escutar (por cima do repouso) */
  listen: Pose;
  /** ação de ofício nas esperas: pose, duração e intervalo */
  oficio?: { pose: Pose; dur: number; every: [number, number]; head?: 'varre' | 'baixo' | 'alto' };
  /** expressão de base (morphs da forja) */
  face?: Record<string, number>;
  /** quão rápido o olhar troca de alvo e quanto evita encarar (0..1) */
  gazeRate?: number;
  shy?: number;
  /** mãos fechadas em objeto da forja (lampião, haste, livro): [esquerda, direita] */
  grip?: [number, number];
}

// braços: direções de braço (ombro ao cotovelo) e antebraço (cotovelo ao punho)
const L = (a: V3, f: V3): Pose => ({ aL: a, fL: f });
const R = (a: V3, f: V3): Pose => mirror({ aL: a, fL: f });
const both = (a: V3, f: V3): Pose => ({ ...L(a, f), ...R(a, f) });
const join = (...ps: Pose[]): Pose => Object.assign({}, ...ps);

/** mãos juntas à frente, na altura do cinto */
const MAOS_BAIXAS = both([0.24, -0.93, 0.28], [-0.58, -0.22, 0.78]);
/** mãos postas na altura do peito */
const ORANDO = both([0.32, -0.86, 0.22], [-0.48, 0.72, 0.5]);
/** braços cruzados */
const CRUZADOS: Pose = { aL: [0.32, -0.74, 0.5], fL: [-0.93, 0.22, 0.2], aR: [-0.3, -0.8, 0.46], fR: [0.92, 0.28, 0.14] };
/** mãos para trás */
const ATRAS = both([0.18, -0.9, -0.38], [-0.76, -0.2, -0.6]);
/** mãos na cintura */
const CINTURA = both([0.72, -0.6, -0.18], [-0.45, -0.76, 0.42]);
/** livro aberto à frente, nas duas mãos */
const LENDO = both([0.2, -0.88, 0.34], [-0.28, 0.32, 0.9]);
/** uma mão no queixo, a outra segurando o cotovelo */
const PENSANDO: Pose = { aL: [0.2, -0.75, 0.6], fL: [-0.35, 0.92, 0.18], aR: [-0.3, -0.82, 0.45], fR: [0.95, 0.2, 0.2] };
/** braço do lampião estendido à frente e acima */
const LAMPIAO_ALTO = L([0.28, 0.25, 0.92], [0.1, 0.55, 0.82]);

const LIVRE: Pose = {};

export const PERSONAS: Record<string, Persona> = {
  // monge arquivista: curvado sobre as fichas, mãos recolhidas, fala baixa e lenta
  npc_01_arquivista: {
    grip: [0.35, 1],
    posture: { spine: [0.2, 0, 0], neck: [0.16, 0, 0], shL: -0.06, shR: -0.06 },
    rest: L([0.24, -0.93, 0.28], [-0.58, -0.22, 0.78]),
    restW: 0.85,
    tempo: 0.78,
    talkW: 0.3,
    talk: 'contida',
    listen: { head: [0.12, 0, 0.12] },
    oficio: { pose: join(LENDO, { neck: [0.3, 0, 0], head: [0.2, 0, 0] }), dur: 5.5, every: [8, 14], head: 'baixo' },
    gazeRate: 3,
    shy: 0.3,
  },
  // acendedora: impaciente, peso numa perna, lampião sempre erguido, cenho franzido
  npc_02_acendedora: {
    grip: [1, 0.35],
    posture: { hips: [0, 0.08, 0.06], spine: [-0.04, -0.06, -0.05], head: [0.04, 0.05, 0.07] },
    rest: R([0.72, -0.6, -0.18], [-0.45, -0.76, 0.42]),
    restW: 0.9,
    tempo: 1.1,
    talkW: 0.55,
    talk: 'uma',
    listen: { head: [-0.06, 0.1, 0.05], hips: [0, 0.1, 0.08] },
    oficio: { pose: join(LAMPIAO_ALTO, { head: [-0.25, 0.15, 0] }), dur: 3.2, every: [7, 11], head: 'alto' },
    face: { sobrancelha_franzir: 0.45 },
    gazeRate: 6,
  },
  // vigia: velho soldado, ereto, alabarda firme; varre o horizonte com a lanterna
  npc_03_vigia: {
    grip: [1, 1],
    posture: { spine: [-0.06, 0, 0], chest: [-0.05, 0, 0], head: [-0.06, 0, 0], shL: 0.03, shR: 0.03 },
    tempo: 0.85,
    talkW: 0.35,
    talk: 'contida',
    listen: { head: [0.05, 0, -0.06] },
    oficio: { pose: join(LAMPIAO_ALTO, { spine: [0, 0.25, 0], head: [-0.1, 0.35, 0] }), dur: 4.5, every: [9, 15], head: 'varre' },
    face: { sobrancelha_franzir: 0.25 },
    gazeRate: 2.5,
  },
  // viúva da estalagem: peito aberto, mão na cintura, fala com o corpo todo
  npc_04_estalajadeira: {
    grip: [0.35, 1],
    posture: { spine: [-0.08, 0, 0], chest: [-0.06, 0, 0], hips: [0, 0, -0.05], head: [-0.03, 0, -0.05] },
    rest: L([0.72, -0.6, -0.18], [-0.45, -0.76, 0.42]),
    restW: 0.9,
    tempo: 1.0,
    talkW: 0.8,
    talk: 'larga',
    listen: { head: [0.06, 0.08, -0.1] },
    oficio: { pose: join(R([-0.3, -0.75, 0.55], [0.1, 0.15, 0.98]), { neck: [0.25, 0, 0], head: [0.15, 0, 0] }), dur: 3.5, every: [8, 13], head: 'baixo' },
    face: { sorriso: 0.3 },
    gazeRate: 5,
  },
  // enfermeira: mãos juntas, cabeça inclinada, presença calma
  npc_05_enfermeira: {
    posture: { spine: [0.04, 0, 0], head: [0.06, 0, -0.1] },
    rest: MAOS_BAIXAS,
    restW: 0.9,
    tempo: 0.9,
    talkW: 0.45,
    talk: 'duas',
    listen: { head: [0.1, 0, -0.16], spine: [0.06, 0, 0] },
    oficio: { pose: join(R([-0.2, -0.7, 0.65], [0.25, 0.2, 0.95]), L([0.25, -0.9, 0.3], [-0.2, -0.3, 0.9]), { neck: [0.2, 0, 0] }), dur: 3.5, every: [10, 15], head: 'baixo' },
    face: { sorriso: 0.2, tristeza: 0.15 },
    gazeRate: 4,
  },
  // noviço: mãos postas sobre o livro, cabeça baixa, olhar que foge
  npc_06_novico: {
    grip: [1, 0.4],
    posture: { spine: [0.1, 0, 0], neck: [0.22, 0, 0], shL: 0.05, shR: 0.05 },
    rest: ORANDO,
    restW: 0.9,
    tempo: 1.05,
    talkW: 0.25,
    talk: 'oracao',
    listen: { neck: [0.12, 0, 0], head: [0.1, 0, 0.08] },
    oficio: { pose: { neck: [0.35, 0, 0], head: [0.25, 0, 0] }, dur: 4, every: [7, 12], head: 'baixo' },
    face: { tristeza: 0.25, sobrancelha_erguer: 0.2 },
    gazeRate: 7,
    shy: 0.6,
  },
  // herbalista: curiosa, inclinada para a frente, examina o que tem na mão
  npc_07_herbalista: {
    posture: { spine: [0.12, 0, 0], head: [0.05, 0, 0.08] },
    tempo: 1.05,
    talkW: 0.6,
    talk: 'duas',
    listen: { head: [0.05, 0, 0.15] },
    oficio: { pose: join(R([-0.22, -0.55, 0.8], [0.25, 0.75, 0.6]), { spine: [0.25, 0, 0], neck: [0.25, 0, 0], head: [0.15, -0.2, 0.1] }), dur: 4.5, every: [7, 12], head: 'baixo' },
    face: { sorriso: 0.25, sobrancelha_erguer: 0.2 },
    gazeRate: 5,
  },
  // cartógrafo: velho, encurvado, aponta com o queixo e consulta o mapa
  npc_08_cartografo: {
    grip: [1, 0.35],
    posture: { spine: [0.18, 0, 0], neck: [0.1, 0, 0], head: [-0.08, 0, 0] },
    rest: R([-0.24, -0.93, 0.28], [0.58, -0.22, 0.78]),
    restW: 0.7,
    tempo: 0.82,
    talkW: 0.5,
    talk: 'aula',
    listen: { head: [0.08, -0.08, 0.06] },
    oficio: { pose: join(R([-0.2, -0.88, 0.34], [0.3, 0.35, 0.88]), { neck: [0.3, 0, 0], head: [0.15, 0, 0] }), dur: 5, every: [8, 13], head: 'baixo' },
    face: { sobrancelha_franzir: 0.3 },
    gazeRate: 3,
  },
  // órfão: miúdo, ombros erguidos, não para quieto, mãos para trás
  npc_09_orfao: {
    posture: { spine: [0.06, 0, 0], shL: 0.1, shR: 0.1, head: [0.08, 0, 0.06] },
    rest: ATRAS,
    restW: 0.85,
    tempo: 1.3,
    talkW: 0.7,
    talk: 'inquieta',
    listen: { head: [0.12, 0.1, 0.12] },
    oficio: { pose: join(ATRAS, { hips: [0, 0.25, 0], head: [-0.15, 0.4, 0] }), dur: 2.5, every: [4, 8], head: 'varre' },
    face: { sobrancelha_erguer: 0.35 },
    gazeRate: 9,
    shy: 0.4,
  },
  // professor: queixo erguido, mão livre atrás das costas, fala de cátedra
  npc_10_professor: {
    grip: [1, 1],
    posture: { spine: [-0.04, 0, 0], chest: [-0.06, 0, 0], head: [-0.1, 0, 0] },
    tempo: 0.85,
    talkW: 0.45,
    talk: 'aula',
    listen: { head: [-0.05, 0, -0.1] },
    oficio: { pose: join(L([0.2, -0.88, 0.34], [-0.28, 0.32, 0.9]), { neck: [0.25, 0, 0], head: [0.12, 0, 0] }), dur: 5, every: [9, 14], head: 'baixo' },
    face: { sobrancelha_erguer: 0.15 },
    gazeRate: 3,
  },
  // detetive: braços cruzados, cabeça de lado, gesto mínimo, olhar que mede
  npc_11_detetive: {
    grip: [1, 0.4],
    posture: { hips: [0, 0, 0.06], spine: [0, -0.05, -0.04], head: [0.04, 0, 0.1] },
    rest: CRUZADOS,
    restW: 0.95,
    tempo: 0.9,
    talkW: 0.2,
    talk: 'contida',
    listen: { head: [0.06, 0, 0.16] },
    oficio: { pose: join(PENSANDO, { head: [0.12, 0.2, 0.08] }), dur: 4, every: [8, 13], head: 'baixo' },
    face: { sobrancelha_franzir: 0.2 },
    gazeRate: 2.2,
  },
  // acólita: ereta, serena, mãos postas na altura do peito
  npc_12_acolita: {
    posture: { spine: [-0.04, 0, 0], neck: [0.06, 0, 0] },
    rest: join(ORANDO, { aL: [0.3, -0.88, 0.25], aR: [-0.3, -0.88, 0.25] }),
    restW: 0.9,
    tempo: 0.8,
    talkW: 0.3,
    talk: 'oracao',
    listen: { neck: [0.1, 0, 0], head: [0.04, 0, 0.05] },
    oficio: { pose: { neck: [-0.15, 0, 0], head: [-0.3, 0, 0] }, dur: 4, every: [9, 14], head: 'alto' },
    face: { sorriso: 0.1 },
    gazeRate: 2.5,
  },
  // personagens da história (modelos anteriores à forja)
  heloisa: {
    posture: { spine: [-0.05, 0, 0], head: [-0.04, 0, 0] },
    rest: MAOS_BAIXAS,
    restW: 0.75,
    tempo: 0.85,
    talkW: 0.5,
    talk: 'duas',
    listen: { head: [0.06, 0, -0.08] },
    oficio: { pose: { head: [-0.2, 0.3, 0] }, dur: 4, every: [10, 16], head: 'varre' },
    gazeRate: 3,
  },
  iris: {
    posture: { spine: [0.05, 0, 0], shL: 0.04, shR: 0.04 },
    tempo: 1.2,
    talkW: 0.75,
    talk: 'inquieta',
    listen: { head: [0.05, 0.1, 0.1] },
    oficio: { pose: join(R([-0.2, -0.9, 0.2], [0.6, -0.3, 0.6]), { head: [0.2, -0.3, 0] }), dur: 2.5, every: [6, 10], head: 'baixo' },
    gazeRate: 7,
  },
  anselmo: {
    posture: { spine: [0.14, 0, 0], neck: [0.1, 0, 0] },
    rest: ATRAS,
    restW: 0.8,
    tempo: 0.8,
    talkW: 0.4,
    talk: 'aula',
    listen: { head: [0.1, 0, 0.08] },
    oficio: { pose: join(LENDO, { neck: [0.3, 0, 0] }), dur: 5, every: [9, 14], head: 'baixo' },
    gazeRate: 3,
  },
  dalva: {
    posture: { spine: [0.05, 0, 0], hips: [0, 0, 0.05] },
    rest: CINTURA,
    restW: 0.7,
    tempo: 1.0,
    talkW: 0.7,
    talk: 'larga',
    listen: { head: [0.05, 0, 0.1] },
    oficio: { pose: join(both([0.2, -0.7, 0.6], [-0.2, -0.2, 0.95]), { spine: [0.3, 0, 0], neck: [0.2, 0, 0] }), dur: 3.5, every: [7, 11], head: 'baixo' },
    gazeRate: 5,
  },
  lia: {
    posture: { spine: [0.06, 0, 0], neck: [0.12, 0, 0], shL: 0.05, shR: 0.05 },
    rest: MAOS_BAIXAS,
    restW: 0.8,
    tempo: 0.95,
    talkW: 0.4,
    talk: 'contida',
    listen: { neck: [0.1, 0, 0] },
    oficio: { pose: { head: [-0.3, 0.1, 0] }, dur: 3, every: [8, 12], head: 'alto' },
    face: { tristeza: 0.3 },
    gazeRate: 5,
    shy: 0.45,
  },
  noemia: {
    posture: { spine: [-0.05, 0, 0], head: [-0.08, 0, 0] },
    rest: CRUZADOS,
    restW: 0.8,
    tempo: 0.85,
    talkW: 0.4,
    talk: 'uma',
    listen: { head: [0, 0, 0.1] },
    oficio: { pose: join(CRUZADOS, { head: [-0.25, 0.35, 0] }), dur: 4.5, every: [8, 13], head: 'varre' },
    gazeRate: 2.5,
  },
  tome: {
    posture: { spine: [0.08, 0, 0], hips: [0, 0, -0.05] },
    tempo: 0.95,
    talkW: 0.65,
    talk: 'larga',
    listen: { head: [0.06, 0, -0.08] },
    oficio: { pose: join(LAMPIAO_ALTO, { head: [-0.3, 0, 0] }), dur: 3, every: [8, 12], head: 'alto' },
    gazeRate: 4,
  },
  // protagonista: postura de quem vigia, sem maneirismo que atrapalhe o combate
  player: {
    posture: { chest: [-0.03, 0, 0], head: [-0.02, 0, 0] },
    tempo: 1,
    talkW: 0.6,
    talk: 'duas',
    listen: { head: [0.06, 0, 0.06] },
    gazeRate: 5,
  },
};

const PADRAO: Persona = { posture: LIVRE, tempo: 1, talkW: 0.6, talk: 'duas', listen: { head: [0.05, 0, 0.08] }, gazeRate: 4 };

export function personaFor(key: string | undefined): Persona {
  if (!key) return PADRAO;
  if (key.startsWith('player')) return PERSONAS.player;
  return PERSONAS[key] ?? PADRAO;
}

/**
 * Gesto de fala da persona no instante t (s) da conversa, com batidas que caem nas sílabas tônicas.
 * Devolve a pose e o peso: nunca maior que 0,8, para o clipe de fala ainda respirar por baixo.
 */
export function talkGesture(style: TalkStyle, t: number, seed: number): { pose: Pose; w: number } {
  const beat = (f: number, ph: number) => Math.max(0, Math.sin(t * f + ph + seed)) ** 2;
  const b1 = beat(2.6, 0);
  const b2 = beat(2.1, 1.9);
  switch (style) {
    case 'contida': {
      // uma mão sobe meio palmo e volta; o resto do corpo quieto
      return { pose: { fR: [0.35 + 0.15 * b1, 0.1 + 0.5 * b1, 0.92], head: [0.04 * b1, 0, 0] }, w: 0.35 * b1 };
    }
    case 'uma':
      return { pose: { aR: [-0.3, -0.7 + 0.25 * b1, 0.6], fR: [0.15, 0.25 + 0.45 * b1, 0.9], head: [0.05 * b1, -0.05 * b1, 0] }, w: 0.55 };
    case 'duas':
      return { pose: { aL: [0.3, -0.75 + 0.2 * b1, 0.55], fL: [-0.25, 0.2 + 0.35 * b1, 0.92], aR: [-0.3, -0.75 + 0.2 * b2, 0.55], fR: [0.25, 0.2 + 0.35 * b2, 0.92], head: [0.04 * (b1 + b2), 0, 0] }, w: 0.5 };
    case 'aula': {
      // indicador erguido nas ênfases, a outra mão quieta
      const k = beat(1.6, 0.7);
      return { pose: { aR: [-0.35, -0.3 + 0.5 * k, 0.75], fR: [-0.05, 0.8 + 0.15 * k, 0.5], head: [-0.06 * k, 0, 0], chest: [-0.05 * k, 0, 0] }, w: 0.65 };
    }
    case 'larga':
      return { pose: { aL: [0.6, -0.55 + 0.3 * b1, 0.5], fL: [0.2, 0.25 + 0.3 * b1, 0.9], aR: [-0.6, -0.55 + 0.3 * b2, 0.5], fR: [-0.2, 0.25 + 0.3 * b2, 0.9], spine: [-0.04, 0.08 * Math.sin(t * 1.2), 0], head: [0.05 * (b1 + b2), 0, 0] }, w: 0.6 };
    case 'inquieta': {
      const k = beat(3.4, 0.3);
      return { pose: { aR: [-0.25, -0.75 + 0.3 * k, 0.5], fR: [0.2, 0.3 + 0.4 * k, 0.88], hips: [0, 0.12 * Math.sin(t * 2.3), 0], head: [0.06 * k, 0.12 * Math.sin(t * 1.9), 0.06 * Math.sin(t * 2.7)] }, w: 0.6 };
    }
    case 'oracao':
      // mãos postas que se abrem um pouco nas ênfases
      return { pose: { fL: [-0.3 - 0.2 * b1, 0.72, 0.6], fR: [0.3 + 0.2 * b1, 0.72, 0.6], head: [0.05 * b1, 0, 0] }, w: 0.5 };
  }
}
