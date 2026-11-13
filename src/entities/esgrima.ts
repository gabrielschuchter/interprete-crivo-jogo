import type { Pose, V3 } from './motion';
import { mix, clamp } from './motion';

/**
 * Esgrima do protagonista: o repertório de golpes com espada na mão direita e tocha na esquerda.
 *
 * Cada golpe é um dado: duração, quadros de contato, janelas de encadeamento e de cancelamento, avanço do corpo,
 * alcance, peso (dano, quebra de postura, pausa de impacto, tremor) e uma sequência de poses-chave no espaço do
 * personagem (+X esquerda dele, +Y cima, +Z frente; ângulos da lâmina em graus). A camada procedural da figura
 * aplica a pose amostrada por cima do clipe parado; a lâmina segue a direção da chave, e o punho gira para ela.
 *
 * Princípios (docs/game/COMBATE.md):
 * - antecipação curta e legível no leve, longa e segura no firme; o golpe acelera até o contato e o dano sai
 *   no quadro do contato, nunca no início;
 * - recuperação real: o corpo termina o arco e assenta numa pose parada antes de voltar à guarda;
 * - o próximo golpe leve pode sair a partir de `chain` (o toque fica guardado por 0,4 s), a esquiva cancela fora
 *   de `lock`, e o firme pode sair de dentro da sequência a partir de `heavyFrom`;
 * - a tocha é contrapeso: vai para trás quando a lâmina vai para a frente.
 */

export type GolpeId = 'l1' | 'l2' | 'l3' | 'l4' | 'contra' | 'firme' | 'lua' | 'pilar' | 'resoluto' | 'queda';
type Ease = 'io' | 'in' | 'out' | 'snap';
export interface Chave {
  t: number;
  pose: Pose;
  /** lâmina: [giro em torno do corpo, elevação, rolagem em radianos] */
  arma: [number, number, number];
  /** curva do trecho que termina nesta chave */
  ease?: Ease;
}
export interface Contato {
  t: number;
  dano: number;
  firme: boolean;
  /** pausa de impacto em segundos e tremor de câmera (trauma) */
  pausa: number;
  tremor: number;
  /** círculo inteiro em volta do corpo (giro, onda de choque) */
  circulo?: boolean;
  alcance?: number;
}
export interface Golpe {
  id: GolpeId;
  nome: string;
  dur: number;
  hits: Contato[];
  /** janela do rastro da lâmina */
  trail: [number, number];
  /** a partir daqui o próximo golpe leve sai */
  chain: number;
  /** a partir daqui o firme sai de dentro do golpe */
  heavyFrom: number;
  /** a esquiva não cancela dentro desta janela (compromisso do golpe) */
  lock?: [number, number];
  /** dano recebido não interrompe dentro desta janela */
  armadura?: [number, number];
  /** avanço do corpo: [início, fim, metros] */
  avanco: [number, number, number];
  alcance: number;
  /** meia abertura do arco em radianos */
  arco: number;
  vigor: number;
  /** som do corte: amostra, velocidade, instante */
  som: { nome: string; taxa: number; t: number };
  /** giro do corpo inteiro: [início, fim, radianos] */
  giro?: [number, number, number];
  /** salto: [início, fim, altura] */
  salto?: [number, number, number];
  next?: GolpeId;
  keys: Chave[];
}

const DEG = Math.PI / 180;

/** Guarda: lâmina à frente na linha dos olhos do adversário, ombro direito adiantado, tocha baixa atrás. */
export const GUARDA: Pose = { aR: [-0.38, -0.72, 0.58], fR: [-0.08, -0.12, 0.99], aL: [0.55, -0.68, -0.3], fL: [0.35, 0.1, 0.4], spine: [0.12, 0.28, 0], head: [-0.06, -0.22, 0], drop: 0.11 };
export const ARMA_GUARDA: [number, number, number] = [-6, 16, 0];
/** Postura de raiz: carga do firme. Lâmina baixa atrás do quadril direito, tocha à frente, joelhos dobrados. */
export const RAIZ: Pose = { aR: [-0.5, -0.75, -0.42], fR: [-0.25, -0.45, -0.86], aL: [0.3, -0.35, 0.88], fL: [0.12, 0.3, 0.95], spine: [0.22, -0.5, 0], head: [0, 0.4, 0], drop: 0.24 };
export const ARMA_RAIZ: [number, number, number] = [-160, -24, 0];
/** Esquiva: tronco baixo, lâmina recolhida para trás para não abrir a silhueta. */
export const ESQUIVA: Pose = { aR: [-0.4, -0.7, -0.55], fR: [-0.3, -0.4, -0.86], aL: [0.4, -0.72, -0.5], spine: [0.42, 0, 0], head: [-0.25, 0, 0], drop: 0.14 };
export const ARMA_ESQUIVA: [number, number, number] = [-150, -20, 0];
/** Mergulho do golpe aéreo: lâmina de ponta para baixo. */
export const MERGULHO: Pose = { aR: [-0.15, -0.3, 0.95], fR: [0, -0.92, 0.4], aL: [0.6, 0.3, -0.7], spine: [0.42, 0, 0], drop: 0 };
export const ARMA_MERGULHO: [number, number, number] = [0, -82, 0];

const lunge = (k = 1): Pose => ({ lR: [-0.05, -0.72, 0.68 * k + 0.0], sR: [0, -0.98, 0.15], lL: [0.05, -0.84, -0.5 * k], sL: [0, -0.6, -0.8 * k] });
const plus = (a: Pose, b: Pose): Pose => ({ ...a, ...b });

export const GOLPES: Record<GolpeId, Golpe> = {
  // 1. corte horizontal da direita para a esquerda: abre a sequência, sai rápido
  l1: {
    id: 'l1',
    nome: 'Corte de abertura',
    dur: 0.5,
    hits: [{ t: 0.17, dano: 1, firme: false, pausa: 0.045, tremor: 0.2 }],
    trail: [0.1, 0.28],
    chain: 0.24,
    heavyFrom: 0.2,
    avanco: [0.08, 0.2, 0.55],
    alcance: 2.5,
    arco: 1.4,
    vigor: 1,
    som: { nome: 'espada', taxa: 1.08, t: 0.09 },
    next: 'l2',
    keys: [
      { t: 0, pose: GUARDA, arma: ARMA_GUARDA },
      { t: 0.1, pose: { aR: [-0.88, 0.15, -0.05], fR: [-0.8, 0.22, -0.2], aL: [0.5, -0.7, 0.3], spine: [0, -0.5, 0], head: [0, 0.35, 0], drop: 0.08 }, arma: [-115, 20, 0.3], ease: 'out' },
      { t: 0.17, pose: { aR: [-0.1, 0, 1], fR: [0.45, 0, 0.88], aL: [0.65, -0.45, -0.6], spine: [0.12, 0.35, 0], head: [0, -0.3, 0], drop: 0.12 }, arma: [15, 8, 1.45], ease: 'in' },
      { t: 0.27, pose: { aR: [0.55, -0.05, 0.75], fR: [0.85, -0.05, 0.35], aL: [0.6, -0.5, -0.62], spine: [0.15, 0.6, 0], head: [0, -0.5, 0], drop: 0.12 }, arma: [100, 0, 1.45], ease: 'out' },
      { t: 0.5, pose: GUARDA, arma: ARMA_GUARDA, ease: 'io' },
    ],
  },
  // 2. revés subindo da esquerda para a direita: a lâmina volta pelo caminho de onde veio
  l2: {
    id: 'l2',
    nome: 'Revés',
    dur: 0.54,
    hits: [{ t: 0.19, dano: 1, firme: false, pausa: 0.045, tremor: 0.2 }],
    trail: [0.11, 0.31],
    chain: 0.27,
    heavyFrom: 0.22,
    avanco: [0.1, 0.22, 0.6],
    alcance: 2.5,
    arco: 1.4,
    vigor: 1,
    som: { nome: 'espada', taxa: 0.98, t: 0.11 },
    next: 'l3',
    keys: [
      { t: 0, pose: GUARDA, arma: ARMA_GUARDA },
      { t: 0.11, pose: { aR: [0.6, 0.3, 0.55], fR: [0.75, 0.45, -0.25], aL: [0.6, -0.55, 0.3], spine: [0, 0.6, 0], head: [0, -0.4, 0], drop: 0.08 }, arma: [120, 45, -0.6], ease: 'out' },
      { t: 0.19, pose: { aR: [-0.25, 0.1, 0.96], fR: [-0.6, 0.12, 0.78], aL: [0.55, -0.4, -0.7], spine: [0.1, -0.25, 0], head: [0, 0.2, 0], drop: 0.1 }, arma: [-15, 22, -1.45], ease: 'in' },
      { t: 0.3, pose: { aR: [-0.8, 0.2, 0.45], fR: [-0.9, 0.3, -0.1], aL: [0.55, -0.5, -0.6], spine: [0.1, -0.55, 0], head: [0, 0.45, 0], drop: 0.1 }, arma: [-105, 30, -1.45], ease: 'out' },
      { t: 0.54, pose: GUARDA, arma: ARMA_GUARDA, ease: 'io' },
    ],
  },
  // 3. estocada longa em base baixa: alcance maior, abertura estreita
  l3: {
    id: 'l3',
    nome: 'Estocada do grou',
    dur: 0.64,
    hits: [{ t: 0.24, dano: 1.25, firme: false, pausa: 0.06, tremor: 0.3, alcance: 3.1 }],
    trail: [0.15, 0.3],
    chain: 0.38,
    heavyFrom: 0.3,
    avanco: [0.13, 0.26, 1.6],
    alcance: 3.1,
    arco: 0.75,
    vigor: 1.1,
    som: { nome: 'espada', taxa: 1.22, t: 0.15 },
    next: 'l4',
    keys: [
      { t: 0, pose: GUARDA, arma: ARMA_GUARDA },
      { t: 0.14, pose: { aR: [-0.45, -0.55, -0.7], fR: [0.05, 0.05, 1], aL: [0.4, 0.3, 0.86], fL: [0.2, 0.5, 0.85], spine: [-0.05, -0.6, 0], head: [0, 0.5, 0], drop: 0.16 }, arma: [0, 0, 1.57], ease: 'out' },
      { t: 0.24, pose: plus({ aR: [-0.02, 0.04, 1], fR: [0, 0.03, 1], aL: [0.5, -0.1, -0.86], fL: [0.4, -0.2, -0.9], spine: [0.28, 0.5, 0], head: [-0.1, -0.45, 0], drop: 0.3 }, lunge()), arma: [0, 2, 1.57], ease: 'snap' },
      { t: 0.38, pose: plus({ aR: [-0.05, 0, 1], fR: [0, 0, 1], aL: [0.5, -0.15, -0.85], spine: [0.24, 0.45, 0], head: [-0.1, -0.4, 0], drop: 0.28 }, lunge(0.9)), arma: [0, 0, 1.57] },
      { t: 0.64, pose: GUARDA, arma: ARMA_GUARDA, ease: 'io' },
    ],
  },
  // 4. giro completo com a lâmina estendida, dois contatos, e uma pose parada no fim (o fecho da sequência)
  l4: {
    id: 'l4',
    nome: 'Roda de cinzas',
    dur: 0.94,
    hits: [
      { t: 0.32, dano: 0.85, firme: false, pausa: 0.05, tremor: 0.25, circulo: true },
      { t: 0.5, dano: 1.05, firme: true, pausa: 0.1, tremor: 0.5, circulo: true },
    ],
    trail: [0.2, 0.58],
    chain: 0.76,
    heavyFrom: 0.62,
    avanco: [0.2, 0.52, 0.7],
    alcance: 2.8,
    arco: Math.PI,
    vigor: 1.4,
    som: { nome: 'giro', taxa: 1, t: 0.2 },
    giro: [0.2, 0.56, -Math.PI * 2],
    next: 'l1',
    keys: [
      { t: 0, pose: GUARDA, arma: ARMA_GUARDA },
      { t: 0.16, pose: { aR: [0.45, -0.5, 0.75], fR: [0.8, -0.3, 0.5], aL: [0.6, -0.5, -0.6], spine: [0.25, 0.65, 0], head: [0, -0.5, 0], drop: 0.22 }, arma: [150, -10, 1.5], ease: 'out' },
      { t: 0.23, pose: { aR: [-1, 0.05, 0.1], fR: [-1, 0, 0.15], aL: [0.35, -0.8, 0.2], spine: [0.15, 0, 0], drop: 0.18 }, arma: [-92, -2, 1.5], ease: 'in' },
      { t: 0.56, pose: { aR: [-1, 0.02, 0.12], fR: [-1, -0.02, 0.18], aL: [0.35, -0.8, 0.2], spine: [0.15, 0, 0], drop: 0.2 }, arma: [-92, -4, 1.5] },
      { t: 0.68, pose: { aR: [-0.55, -0.75, 0.35], fR: [-0.6, -0.8, 0.1], aL: [0.55, -0.6, -0.4], spine: [0.3, -0.2, 0], head: [-0.15, 0.2, 0], drop: 0.25 }, arma: [-70, -50, 1.2], ease: 'out' },
      { t: 0.8, pose: { aR: [-0.55, -0.76, 0.34], fR: [-0.6, -0.8, 0.1], aL: [0.55, -0.6, -0.4], spine: [0.3, -0.2, 0], head: [-0.15, 0.2, 0], drop: 0.24 }, arma: [-70, -50, 1.2] },
      { t: 0.94, pose: GUARDA, arma: ARMA_GUARDA, ease: 'io' },
    ],
  },
  // contracorte: sai da esquiva, sobe na diagonal de baixo para cima
  contra: {
    id: 'contra',
    nome: 'Contracorte',
    dur: 0.52,
    hits: [{ t: 0.14, dano: 1.4, firme: true, pausa: 0.07, tremor: 0.35 }],
    trail: [0.05, 0.27],
    chain: 0.3,
    heavyFrom: 0.26,
    avanco: [0, 0.14, 1.4],
    alcance: 2.7,
    arco: 1.2,
    vigor: 0.8,
    som: { nome: 'espada', taxa: 1.3, t: 0.04 },
    next: 'l3',
    keys: [
      { t: 0, pose: { aR: [-0.5, -0.8, 0.3], fR: [-0.4, -0.6, 0.7], aL: [0.5, -0.6, 0.4], spine: [0.35, -0.4, 0], drop: 0.28 }, arma: [-60, -45, -1.2] },
      { t: 0.14, pose: { aR: [0.25, 0.85, 0.45], fR: [0.35, 0.85, 0.2], aL: [0.6, -0.5, -0.6], spine: [-0.2, 0.45, 0], head: [0.1, -0.3, 0], drop: 0.02 }, arma: [35, 70, -1.3], ease: 'in' },
      { t: 0.28, pose: { aR: [0.4, 0.9, 0.1], fR: [0.3, 0.95, -0.1], aL: [0.6, -0.5, -0.6], spine: [-0.25, 0.5, 0], head: [0.1, -0.35, 0] }, arma: [55, 90, -1.3], ease: 'out' },
      { t: 0.52, pose: GUARDA, arma: ARMA_GUARDA, ease: 'io' },
    ],
  },
  // golpe firme sem foco: a lâmina sobe atrás da cabeça, segura um instante e desce com o corpo inteiro
  firme: {
    id: 'firme',
    nome: 'Golpe firme',
    dur: 0.86,
    hits: [{ t: 0.43, dano: 1, firme: true, pausa: 0.1, tremor: 0.55 }],
    trail: [0.36, 0.52],
    chain: 0.64,
    heavyFrom: 0.7,
    lock: [0.16, 0.5],
    avanco: [0.3, 0.45, 0.8],
    alcance: 2.9,
    arco: 0.95,
    vigor: 2.6,
    som: { nome: 'lamina', taxa: 0.86, t: 0.34 },
    keys: [
      { t: 0, pose: GUARDA, arma: ARMA_GUARDA },
      { t: 0.3, pose: { aR: [-0.2, 0.9, -0.35], fR: [0.1, 0.55, -0.83], aL: [0.35, 0.25, 0.9], fL: [0.2, 0.6, 0.75], spine: [-0.32, 0.15, 0], head: [-0.15, 0, 0], drop: 0.06 }, arma: [0, 135, 0], ease: 'out' },
      { t: 0.36, pose: { aR: [-0.2, 0.92, -0.33], fR: [0.1, 0.57, -0.81], aL: [0.35, 0.25, 0.9], fL: [0.2, 0.6, 0.75], spine: [-0.34, 0.15, 0], head: [-0.15, 0, 0], drop: 0.07 }, arma: [0, 138, 0] },
      { t: 0.43, pose: plus({ aR: [-0.08, -0.25, 0.96], fR: [0, -0.72, 0.7], aL: [0.45, -0.35, -0.8], spine: [0.55, 0, 0], head: [0.2, 0, 0], drop: 0.28 }, lunge()), arma: [0, -35, 0], ease: 'snap' },
      { t: 0.6, pose: plus({ aR: [-0.08, -0.3, 0.95], fR: [0, -0.75, 0.66], aL: [0.45, -0.38, -0.8], spine: [0.5, 0, 0], head: [0.15, 0, 0], drop: 0.26 }, lunge(0.9)), arma: [0, -40, 0] },
      { t: 0.86, pose: GUARDA, arma: ARMA_GUARDA, ease: 'io' },
    ],
  },
  // corte da lua: firme com um ou dois pontos de foco. Salta da postura de raiz e cai sobre o alvo
  lua: {
    id: 'lua',
    nome: 'Corte da lua',
    dur: 0.92,
    hits: [{ t: 0.38, dano: 1, firme: true, pausa: 0.13, tremor: 0.75, alcance: 3.3 }],
    trail: [0.12, 0.46],
    chain: 0.7,
    heavyFrom: 0.8,
    lock: [0, 0.5],
    armadura: [0, 0.46],
    avanco: [0.05, 0.38, 2.2],
    alcance: 3.3,
    arco: 1.15,
    vigor: 2.2,
    som: { nome: 'lamina', taxa: 0.78, t: 0.08 },
    salto: [0.06, 0.38, 0.6],
    keys: [
      { t: 0, pose: RAIZ, arma: ARMA_RAIZ },
      { t: 0.16, pose: { aR: [-0.15, 0.95, -0.2], fR: [0.05, 0.8, -0.6], aL: [0.4, 0.2, 0.9], spine: [-0.4, 0, 0], head: [-0.2, 0, 0], lR: [0, -0.5, 0.86], sR: [0, -0.9, -0.4], lL: [0, -0.8, 0.3], sL: [0, -0.8, -0.6] }, arma: [0, 150, 0], ease: 'out' },
      { t: 0.38, pose: plus({ aR: [-0.08, -0.25, 0.96], fR: [0, -0.72, 0.7], aL: [0.45, -0.35, -0.8], spine: [0.6, 0, 0], head: [0.25, 0, 0], drop: 0.32 }, lunge()), arma: [0, -38, 0], ease: 'snap' },
      { t: 0.62, pose: plus({ aR: [-0.08, -0.3, 0.95], fR: [0, -0.75, 0.66], aL: [0.45, -0.38, -0.8], spine: [0.55, 0, 0], head: [0.2, 0, 0], drop: 0.3 }, lunge(0.9)), arma: [0, -42, 0] },
      { t: 0.92, pose: GUARDA, arma: ARMA_GUARDA, ease: 'io' },
    ],
  },
  // queda do pilar: três pontos de foco. Salto alto, golpe e onda de choque em volta
  pilar: {
    id: 'pilar',
    nome: 'Queda do pilar',
    dur: 1.1,
    hits: [
      { t: 0.46, dano: 1, firme: true, pausa: 0.15, tremor: 0.9, alcance: 3.4 },
      { t: 0.52, dano: 0.45, firme: true, pausa: 0.04, tremor: 0.4, circulo: true, alcance: 3.6 },
    ],
    trail: [0.14, 0.54],
    chain: 0.86,
    heavyFrom: 0.95,
    lock: [0, 0.62],
    armadura: [0, 0.6],
    avanco: [0.05, 0.46, 2.4],
    alcance: 3.4,
    arco: 1.2,
    vigor: 2.2,
    som: { nome: 'lamina', taxa: 0.7, t: 0.08 },
    salto: [0.06, 0.46, 1.15],
    keys: [
      { t: 0, pose: RAIZ, arma: ARMA_RAIZ },
      { t: 0.22, pose: { aR: [-0.1, 0.97, -0.15], fR: [0.05, 0.85, -0.52], aL: [0.5, 0.3, 0.8], spine: [-0.45, 0, 0], head: [-0.25, 0, 0], lR: [0, -0.4, 0.9], sR: [0, -0.9, -0.4], lL: [0, -0.7, 0.4], sL: [0, -0.85, -0.5] }, arma: [0, 160, 0], ease: 'out' },
      { t: 0.46, pose: plus({ aR: [-0.06, -0.3, 0.95], fR: [0, -0.8, 0.6], aL: [0.5, -0.3, -0.8], spine: [0.7, 0, 0], head: [0.3, 0, 0], drop: 0.38 }, lunge(1.1)), arma: [0, -50, 0], ease: 'snap' },
      { t: 0.78, pose: plus({ aR: [-0.06, -0.32, 0.95], fR: [0, -0.82, 0.57], aL: [0.5, -0.32, -0.8], spine: [0.62, 0, 0], head: [0.25, 0, 0], drop: 0.34 }, lunge(1)), arma: [0, -52, 0] },
      { t: 1.1, pose: GUARDA, arma: ARMA_GUARDA, ease: 'io' },
    ],
  },
  // golpe resoluto: o firme apertado no instante do golpe inimigo desvia a arma dele e responde na hora
  resoluto: {
    id: 'resoluto',
    nome: 'Golpe resoluto',
    dur: 0.66,
    hits: [{ t: 0.11, dano: 1.5, firme: true, pausa: 0.16, tremor: 0.6 }],
    trail: [0.02, 0.24],
    chain: 0.42,
    heavyFrom: 0.5,
    lock: [0, 0.3],
    armadura: [0, 0.3],
    avanco: [0, 0.13, 1.2],
    alcance: 2.8,
    arco: 1.2,
    vigor: 0,
    som: { nome: 'lamina', taxa: 1.05, t: 0 },
    keys: [
      { t: 0, pose: { aR: [-0.4, 0.8, 0.3], fR: [-0.3, 0.85, 0.1], aL: [0.4, 0.2, 0.85], spine: [-0.2, -0.3, 0], drop: 0.1 }, arma: [-40, 110, 0.6] },
      { t: 0.11, pose: plus({ aR: [0.3, -0.3, 0.9], fR: [0.6, -0.5, 0.6], aL: [0.55, -0.4, -0.7], spine: [0.45, 0.45, 0], head: [0.1, -0.35, 0], drop: 0.25 }, lunge()), arma: [60, -30, 0.8], ease: 'snap' },
      { t: 0.34, pose: plus({ aR: [0.32, -0.35, 0.88], fR: [0.62, -0.52, 0.58], aL: [0.55, -0.4, -0.7], spine: [0.42, 0.42, 0], head: [0.1, -0.35, 0], drop: 0.24 }, lunge(0.9)), arma: [62, -34, 0.8] },
      { t: 0.66, pose: GUARDA, arma: ARMA_GUARDA, ease: 'io' },
    ],
  },
  // aterrissagem do golpe aéreo: a lâmina crava no chão e a onda abre em volta
  queda: {
    id: 'queda',
    nome: 'Golpe em queda',
    dur: 0.56,
    hits: [{ t: 0.0, dano: 1.3, firme: true, pausa: 0.11, tremor: 0.7, circulo: true, alcance: 2.6 }],
    trail: [0, 0.08],
    chain: 0.36,
    heavyFrom: 0.36,
    lock: [0, 0.26],
    avanco: [0, 0, 0],
    alcance: 2.6,
    arco: Math.PI,
    vigor: 0,
    som: { nome: 'lamina', taxa: 0.9, t: 0 },
    keys: [
      { t: 0, pose: { ...MERGULHO, drop: 0.4, spine: [0.7, 0, 0] }, arma: [0, -80, 0] },
      { t: 0.3, pose: { ...MERGULHO, drop: 0.36, spine: [0.62, 0, 0] }, arma: [0, -78, 0] },
      { t: 0.56, pose: GUARDA, arma: ARMA_GUARDA, ease: 'io' },
    ],
  },
};

const curve = (k: number, e: Ease = 'io'): number => {
  const t = clamp(k, 0, 1);
  switch (e) {
    case 'in':
      return t * t;
    case 'out':
      return 1 - (1 - t) * (1 - t);
    case 'snap':
      return t * t * t;
    default:
      return t * t * (3 - 2 * t);
  }
};

export interface Amostra {
  pose: Pose;
  arma: { yaw: number; elev: number; roll: number };
}

const lerpA = (a: [number, number, number], b: [number, number, number], k: number): [number, number, number] => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const toRad = (a: [number, number, number]) => ({ yaw: a[0] * DEG, elev: a[1] * DEG, roll: a[2] });

/**
 * Antebraço da tocha: quando a pose mexe o braço esquerdo sem dizer o antebraço, a tocha vai à frente do peito,
 * cabo quase de pé. Sem isto o antebraço ficava no ângulo do clipe (erguido) e a chama subia acima da cabeça.
 */
function tocha(p: Pose): Pose {
  if (!p.aL || p.fL) return p;
  const [x, y, z] = p.aL;
  const fx = x * 0.25;
  const fy = 0.35 + Math.max(0, -y) * 0.2;
  const fz = z < -0.2 ? 0.55 : 0.9;
  const l = Math.hypot(fx, fy, fz);
  return { ...p, fL: [fx / l, fy / l, fz / l] };
}

/** pose e lâmina do golpe no instante t (segundos) */
export function amostra(g: Golpe, t: number): Amostra {
  const a = amostraCrua(g, t);
  a.pose = tocha(a.pose);
  return a;
}
function amostraCrua(g: Golpe, t: number): Amostra {
  const ks = g.keys;
  if (t <= ks[0].t) return { pose: ks[0].pose, arma: toRad(ks[0].arma) };
  for (let i = 1; i < ks.length; i++) {
    const b = ks[i];
    if (t <= b.t) {
      const a = ks[i - 1];
      const k = curve((t - a.t) / Math.max(1e-4, b.t - a.t), b.ease);
      return { pose: mix(a.pose, b.pose, k), arma: toRad(lerpA(a.arma, b.arma, k)) };
    }
  }
  const z = ks[ks.length - 1];
  return { pose: z.pose, arma: toRad(z.arma) };
}

/** pose fixa com lâmina (guarda, raiz, esquiva) */
export function fixa(p: Pose, a: [number, number, number]): Amostra {
  return { pose: tocha(p), arma: toRad(a) };
}

/** avanço acumulado em metros até t */
export function avancoAte(g: Golpe, t: number): number {
  const [a, b, m] = g.avanco;
  if (m === 0 || t <= a) return 0;
  const k = clamp((t - a) / Math.max(1e-4, b - a), 0, 1);
  return m * (1 - (1 - k) * (1 - k));
}

/** giro do corpo acumulado até t (radianos) */
export function giroAte(g: Golpe, t: number): number {
  if (!g.giro) return 0;
  const [a, b, r] = g.giro;
  const k = clamp((t - a) / Math.max(1e-4, b - a), 0, 1);
  return r * (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
}

/** altura do salto em t */
export function saltoEm(g: Golpe, t: number): number {
  if (!g.salto) return 0;
  const [a, b, h] = g.salto;
  if (t <= a || t >= b) return 0;
  const k = (t - a) / (b - a);
  // sobe rápido, paira no alto, cai mais rápido ainda sobre o alvo
  const s = k < 0.55 ? 1 - Math.pow(1 - k / 0.55, 2) : 1 - Math.pow((k - 0.55) / 0.45, 2.2);
  return h * s;
}

/** foco: pontos acumulados de 0 a 3. O firme gasta todos e escolhe o golpe pelo que havia */
export function firmePorFoco(foco: number): GolpeId {
  const n = Math.floor(foco + 1e-6);
  return n >= 3 ? 'pilar' : n >= 1 ? 'lua' : 'firme';
}

/** multiplicador de dano do firme pelos pontos de foco gastos */
export function danoPorFoco(foco: number): number {
  return 1 + 0.45 * Math.floor(foco + 1e-6);
}

export type { V3 };
