import type { Pose } from './motion';
import { mirror } from './motion';

/**
 * Estilo de ataque de cada inimigo do elenco: três poses (antecipação, contato e recuperação) que a camada
 * procedural impõe por cima do clipe. A leitura que o jogador precisa vem daqui:
 *
 * - a antecipação termina numa pose parada e tensa (o "segura" de 20% do tempo de aviso), longa o bastante para
 *   esquivar e diferente para cada arma: o martelo sobe atrás da cabeça, o gancho recua para o lado, o florete
 *   recolhe junto ao peito;
 * - o contato é atingido no instante do dano (`impact`, em segundos depois do início do golpe), não antes;
 * - a recuperação mostra o peso da arma e deixa a guarda aberta: é a janela de contra-ataque.
 *
 * Direções no espaço do personagem (+X esquerda dele, +Y cima, +Z frente); ângulos em radianos.
 */
export interface Estilo {
  windup: Pose;
  strike: Pose;
  recover: Pose;
  /** segundos do início do golpe até o contato (o dano sai nesse quadro) */
  impact: number;
  /** o golpe treme o chão (martelo, clava, sentença) */
  quake?: number;
  /** pose de conjuração (sopro, canto) e de recitação */
  cast?: Pose;
  /** pose do anel (golpe no chão) */
  ring?: { up: Pose; down: Pose };
  /** postura de guarda enquanto persegue */
  guard?: Pose;
}

const MARTELO: Estilo = {
  // o martelo sobe atrás da cabeça com as duas mãos; o peito abre e a cabeça acompanha
  windup: { aR: [-0.2, 0.82, -0.52], fR: [0.15, 0.55, -0.82], aL: [0.15, 0.82, -0.45], fL: [-0.35, 0.55, -0.75], spine: [-0.32, 0.05, 0], chest: [-0.12, 0, 0], head: [-0.18, 0, 0], drop: 0.05 },
  // desce sobre o alvo com o corpo todo: joelhos dobram, tronco fecha
  strike: { aR: [-0.08, -0.32, 0.95], fR: [0.05, -0.72, 0.7], aL: [0.12, -0.36, 0.92], fL: [-0.2, -0.7, 0.68], spine: [0.58, 0, 0], head: [0.25, 0, 0], drop: 0.26 },
  // o martelo fica no chão um instante: respira, ergue de novo
  recover: { aR: [-0.1, -0.7, 0.7], fR: [0, -0.9, 0.42], aL: [0.15, -0.72, 0.68], fL: [-0.1, -0.9, 0.4], spine: [0.38, 0, 0], head: [0.1, 0, 0], drop: 0.12 },
  impact: 0.11,
  quake: 0.35,
  ring: {
    up: { aR: [-0.1, 0.95, -0.25], fR: [0.1, 0.8, -0.58], aL: [0.08, 0.95, -0.2], fL: [-0.25, 0.8, -0.5], spine: [-0.4, 0, 0], head: [-0.3, 0, 0] },
    down: { aR: [-0.02, -0.45, 0.89], fR: [0.05, -0.92, 0.38], aL: [0.08, -0.45, 0.88], fL: [-0.1, -0.92, 0.36], spine: [0.75, 0, 0], head: [0.3, 0, 0], drop: 0.38 },
  },
  guard: { aR: [-0.25, -0.75, 0.55], fR: [0.15, -0.2, 0.95], spine: [0.12, 0, 0] },
};

const GANCHO: Estilo = {
  // o gancho recua para a direita na altura da cintura, o tronco torce, o lampião vai à frente como contrapeso
  windup: { aR: [-0.82, -0.2, -0.52], fR: [-0.55, 0.05, -0.83], spine: [0.05, -0.62, 0], head: [0, 0.35, 0], aL: [0.35, -0.25, 0.9], fL: [0.05, 0.3, 0.95], drop: 0.12 },
  // varre da direita para a esquerda à frente do corpo
  strike: { aR: [0.38, -0.12, 0.92], fR: [0.78, 0.02, 0.62], spine: [0.15, 0.62, 0], head: [0, -0.25, 0], aL: [0.55, -0.55, -0.3], drop: 0.14 },
  // puxa o gancho de volta, arrastando o que pegou
  recover: { aR: [-0.15, -0.55, 0.82], fR: [-0.35, -0.45, 0.82], spine: [0.28, 0.2, 0], head: [0.1, 0, 0], drop: 0.06 },
  impact: 0.1,
  ring: {
    up: { aR: [-0.15, 0.95, -0.2], fR: [0, 0.85, -0.5], aL: [0.4, 0.5, 0.75], spine: [-0.35, 0, 0], head: [-0.25, 0, 0] },
    down: { aR: [-0.05, -0.5, 0.86], fR: [0, -0.95, 0.3], aL: [0.4, -0.3, 0.86], spine: [0.7, 0, 0], drop: 0.34 },
  },
  guard: { aR: [-0.35, -0.7, 0.4], fR: [0.25, -0.1, 0.96], spine: [0.15, -0.12, 0] },
};

const FLORETE: Estilo = {
  // en garde: lâmina recolhida junto ao peito apontando o alvo, mão livre erguida atrás
  windup: { aR: [-0.3, -0.42, -0.85], fR: [0.05, 0.12, 0.99], aL: [0.62, 0.52, -0.58], fL: [0.15, 0.85, -0.3], spine: [-0.08, -0.38, 0], head: [0, 0.3, 0], drop: 0.16 },
  // estocada em extensão total, o corpo inteiro atrás da ponta
  strike: { aR: [-0.04, 0.05, 1], fR: [0, 0.02, 1], aL: [0.45, -0.15, -0.88], fL: [0.1, -0.3, -0.95], spine: [0.28, -0.5, 0], head: [-0.1, 0.4, 0], drop: 0.3 },
  recover: { aR: [-0.3, -0.5, 0.8], fR: [0, 0.1, 0.99], aL: [0.5, 0.2, -0.8], spine: [0.05, -0.3, 0], drop: 0.12 },
  impact: 0.07,
  guard: { aR: [-0.3, -0.45, 0.84], fR: [0.05, 0.12, 0.99], aL: [0.55, 0.45, -0.6], fL: [0.1, 0.85, -0.3], spine: [0, -0.3, 0], drop: 0.08 },
};

const GARRA: Estilo = {
  // ergue a garra direita sobre o ombro e encolhe o tronco
  windup: { aR: [-0.35, 0.75, -0.55], fR: [-0.15, 0.72, -0.62], aL: [0.45, -0.5, 0.7], spine: [-0.18, -0.38, 0], head: [-0.05, 0.2, 0] },
  // rasga na diagonal para baixo e para a esquerda
  strike: { aR: [0.3, -0.45, 0.85], fR: [0.5, -0.65, 0.58], aL: [0.35, -0.8, -0.3], spine: [0.42, 0.38, 0], head: [0.2, -0.1, 0], drop: 0.08 },
  recover: { aR: [0.05, -0.9, 0.4], fR: [0.1, -0.85, 0.5], aL: [0.15, -0.9, 0.3], spine: [0.45, 0.1, 0], head: [0.3, 0, 0], drop: 0.05 },
  impact: 0.09,
};

const PUNHAL: Estilo = {
  // agacha com o punhal erguido, ponta para baixo
  windup: { aR: [-0.2, 0.8, -0.3], fR: [0, 0.45, 0.9], aL: [0.5, -0.3, 0.8], spine: [-0.1, -0.15, 0], head: [-0.1, 0, 0], drop: 0.26 },
  // salta e crava para a frente e para baixo
  strike: { aR: [-0.05, -0.18, 0.98], fR: [0, -0.7, 0.72], aL: [0.55, -0.6, -0.5], spine: [0.52, 0, 0], head: [0.2, 0, 0], drop: 0.14 },
  recover: { aR: [-0.1, -0.85, 0.5], fR: [0, -0.9, 0.42], spine: [0.4, 0, 0], head: [0.3, 0, 0], drop: 0.2 },
  impact: 0.06,
  guard: { aR: [-0.25, -0.6, 0.75], fR: [0, 0.3, 0.95], spine: [0.2, 0, 0], drop: 0.08 },
};

const CORO: Estilo = {
  // a Matriarca rege: braços abertos para cima, o peito se oferece, a cabeça tomba para trás
  windup: { aL: [0.78, 0.5, 0.35], fL: [0.3, 0.85, 0.42], aR: [-0.78, 0.5, 0.35], fR: [-0.3, 0.85, 0.42], spine: [-0.22, 0, 0], head: [-0.32, 0, 0] },
  // empurra o ar com as duas palmas
  strike: { aL: [0.22, 0.12, 0.97], fL: [0.05, 0.18, 0.98], aR: [-0.22, 0.12, 0.97], fR: [-0.05, 0.18, 0.98], spine: [0.25, 0, 0], head: [0.1, 0, 0] },
  recover: { aL: [0.35, -0.6, 0.7], fL: [0, -0.3, 0.95], aR: [-0.35, -0.6, 0.7], fR: [0, -0.3, 0.95], spine: [0.1, 0, 0], head: [0.15, 0, 0] },
  impact: 0.1,
  cast: { aL: [0.7, 0.62, 0.35], fL: [0.2, 0.92, 0.33], aR: [-0.7, 0.62, 0.35], fR: [-0.2, 0.92, 0.33], spine: [-0.18, 0, 0], head: [-0.38, 0, 0] },
  guard: { aL: [0.45, -0.55, 0.7], fL: [0.05, 0.4, 0.9], aR: [-0.45, -0.55, 0.7], fR: [-0.05, 0.4, 0.9] },
};

const SENTENCA: Estilo = {
  // o Grande Intérprete ergue a mão como quem bate o martelo do juiz, o livro aberto à frente
  windup: { aR: [-0.12, 0.95, 0.22], fR: [0, 0.9, 0.42], aL: [0.25, -0.45, 0.85], fL: [-0.2, 0.3, 0.93], chest: [-0.2, 0, 0], head: [-0.28, 0, 0] },
  strike: { aR: [-0.1, -0.28, 0.95], fR: [0, -0.82, 0.57], aL: [0.3, -0.6, 0.74], spine: [0.5, 0, 0], head: [0.2, 0, 0], drop: 0.22 },
  recover: { aR: [-0.15, -0.75, 0.64], fR: [0, -0.7, 0.7], spine: [0.3, 0, 0], head: [0.1, 0, 0], drop: 0.08 },
  impact: 0.1,
  quake: 0.3,
  cast: { aR: [-0.2, 0.25, 0.95], fR: [0, 0.2, 0.98], aL: [0.25, -0.4, 0.88], fL: [-0.2, 0.35, 0.92], head: [-0.05, 0, 0] },
  ring: {
    up: { aR: [-0.5, 0.85, 0.15], fR: [-0.2, 0.95, 0.2], aL: [0.5, 0.85, 0.15], fL: [0.2, 0.95, 0.2], chest: [-0.3, 0, 0], head: [-0.4, 0, 0] },
    down: { aR: [-0.2, -0.4, 0.9], fR: [0, -0.9, 0.42], aL: [0.2, -0.4, 0.9], fL: [0, -0.9, 0.42], spine: [0.7, 0, 0], drop: 0.35 },
  },
};

/** a recitação do Veredito: braços abertos, cabeça para o alto, o corpo vibra */
export const RECITA: Pose = { aL: [0.92, 0.3, 0.15], fL: [0.85, 0.5, 0.1], aR: [-0.92, 0.3, 0.15], fR: [-0.85, 0.5, 0.1], chest: [-0.28, 0, 0], head: [-0.45, 0, 0] };
/** urro da segunda fase: recua, abre o peito e os braços e grita para o alto */
export const URRO: Pose = { aL: [0.85, 0.15, -0.5], fL: [0.6, 0.6, -0.5], aR: [-0.85, 0.15, -0.5], fR: [-0.6, 0.6, -0.5], spine: [-0.35, 0, 0], chest: [-0.2, 0, 0], head: [-0.5, 0, 0] };
/** atordoado: curvado, braços soltos, cabeça baixa */
export const TONTO: Pose = { aL: [0.3, -0.95, 0.1], aR: [-0.3, -0.95, 0.1], spine: [0.42, 0, 0], head: [0.4, 0, 0.15], drop: 0.12 };

export const ESTILOS: Record<string, Estilo> = {
  eco: MARTELO,
  errante: { ...MARTELO, impact: 0.12, quake: 0.25 },
  carcereiro: GANCHO,
  duelista: FLORETE,
  erudito: GARRA,
  suplicante: PUNHAL,
  matriarca: CORO,
  veredito: SENTENCA,
};

export { mirror };
