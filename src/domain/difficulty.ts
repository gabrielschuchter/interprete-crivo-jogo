/**
 * Níveis de dificuldade: números puros, sem Three.js nem DOM.
 *
 * Cada nível é uma tabela de multiplicadores aplicada sobre os valores-base de `ENEMY_CFG`, de `computeStats`
 * e da economia. O padrão (Padrão) é o jogo pensado para ser difícil: pede que a pessoa explore, faça as missões
 * paralelas, troque de equipamento e gaste os pontos de habilidade antes de cada seção. História existe para
 * quem quer ler o mundo sem tropeçar nos encontros. Rigor é o Padrão com margem de erro curta.
 *
 * A dificuldade vive no registro (`GameState.difficulty`) e muda em Configurações; a preferência para novas partidas
 * fica em `Settings.difficulty`. Valores de 1 reproduzem o jogo de antes dos níveis.
 */

export type DifficultyId = 'historia' | 'padrao' | 'rigor';
export const DIFFICULTY_IDS: readonly DifficultyId[] = ['historia', 'padrao', 'rigor'];
export const DEFAULT_DIFFICULTY: DifficultyId = 'padrao';

export interface DifficultyDef {
  id: DifficultyId;
  name: string;
  /** uma linha para a criação de personagem e para Configurações */
  line: string;
  /** o que muda, em termos de jogo, para a nota em Configurações */
  detail: string;

  // criaturas comuns e chefes
  /** vida das criaturas comuns */
  foeHp: number;
  /** vida de chefes e mini-chefes */
  bossHp: number;
  /** dano recebido pelo jogador, depois da defesa */
  foeDmg: number;
  /** velocidade de perseguição */
  foeSpeed: number;
  /** tempo de aviso antes do golpe: abaixo de 1 dá menos tempo para reagir */
  foeWindup: number;
  /** recuperação depois de um golpe: abaixo de 1 abre menos brechas */
  foeRecover: number;
  /** alcance da percepção */
  foeSight: number;
  /** intervalo entre sopros, anéis e recitações: abaixo de 1 é mais frequente */
  foeGap: number;
  /** fração da vida em que o mini-chefe entra na segunda fase */
  phaseAt: number;

  // janelas do jogador
  /** duração da janela do golpe resoluto (desvio) */
  deflect: number;
  /** duração da janela da esquiva perfeita */
  perfect: number;
  /** recuperação de vigor */
  vigorRegen: number;

  // ganhos e perdas
  /** experiência recebida */
  xp: number;
  /** moedas recebidas */
  coins: number;
  /** chance de peça cair de criaturas comuns (chefes continuam entregando a sua) */
  drops: number;
  /** preço na banca */
  price: number;
  /** cura de caldo e limão */
  heal: number;
  /** fração das moedas deixada na Névoa ao ser derrotado */
  deathCoins: number;
}

export const DIFFICULTIES: Record<DifficultyId, DifficultyDef> = {
  historia: {
    id: 'historia',
    name: 'História',
    line: 'Para ler o mundo sem pressa. Criaturas mais fracas, avisos longos e curas generosas.',
    detail: 'Criaturas com 20% menos vida, metade do dano, avisos mais longos, janelas de desvio maiores, mais cura, moedas e peças. Cair não custa moedas.',
    foeHp: 0.8, bossHp: 0.8, foeDmg: 0.5, foeSpeed: 0.92, foeWindup: 1.25, foeRecover: 1.15, foeSight: 0.85, foeGap: 1.25, phaseAt: 0.4,
    deflect: 1.4, perfect: 1.35, vigorRegen: 1.15,
    xp: 1.25, coins: 1.25, drops: 1.4, price: 0.85, heal: 1.3, deathCoins: 0,
  },
  padrao: {
    id: 'padrao',
    name: 'Padrão',
    line: 'Difícil. Pede explorar, fazer as missões paralelas e se equipar antes de cada seção.',
    detail: 'Criaturas com 20% mais vida (chefes, 30%) e 35% mais dano, avisos mais curtos, janelas de desvio menores, menos experiência, moedas e peças, banca mais cara, cura menor. Cair custa 10% das moedas.',
    foeHp: 1.2, bossHp: 1.3, foeDmg: 1.35, foeSpeed: 1.06, foeWindup: 0.88, foeRecover: 0.85, foeSight: 1.15, foeGap: 0.85, phaseAt: 0.55,
    deflect: 0.85, perfect: 0.85, vigorRegen: 0.92,
    xp: 0.9, coins: 0.8, drops: 0.85, price: 1.2, heal: 0.9, deathCoins: 0.1,
  },
  rigor: {
    id: 'rigor',
    name: 'Rigor',
    line: 'Extremo. Pouca margem de erro e pouco que sobra. Para quem já domina a esgrima.',
    detail: 'Criaturas com 45% mais vida (chefes, 70%) e 70% mais dano, avisos curtos, janelas de desvio 30% menores, pouca experiência, moeda e peça, banca 40% mais cara, cura menor. Cair custa 25% das moedas.',
    foeHp: 1.45, bossHp: 1.7, foeDmg: 1.7, foeSpeed: 1.12, foeWindup: 0.78, foeRecover: 0.7, foeSight: 1.3, foeGap: 0.7, phaseAt: 0.65,
    deflect: 0.7, perfect: 0.7, vigorRegen: 0.85,
    xp: 0.8, coins: 0.65, drops: 0.7, price: 1.4, heal: 0.8, deathCoins: 0.25,
  },
};

export function isDifficulty(v: unknown): v is DifficultyId {
  return typeof v === 'string' && (DIFFICULTY_IDS as readonly string[]).includes(v);
}

/** Tabela de um nível; qualquer valor desconhecido (registro editado, versão futura) cai no padrão. */
export function difficultyDef(id: unknown): DifficultyDef {
  return DIFFICULTIES[isDifficulty(id) ? id : DEFAULT_DIFFICULTY];
}

/** Experiência já ajustada ao nível, nunca abaixo de 1 quando havia algo a receber. */
export function scaleXp(amount: number, d: DifficultyDef): number {
  return amount > 0 ? Math.max(1, Math.round(amount * d.xp)) : 0;
}

/** Moedas ajustadas ao nível e ao bônus de habilidades e equipamentos. */
export function scaleCoins(amount: number, d: DifficultyDef, bonus = 0): number {
  return amount > 0 ? Math.max(1, Math.round(amount * (1 + bonus) * d.coins)) : 0;
}

/** Cura de um consumível ajustada ao nível. */
export function scaleHeal(amount: number, d: DifficultyDef): number {
  return Math.round(amount * d.heal);
}

/** Preço na banca ajustado ao nível (o desconto de Dalva entra por fora). */
export function scalePrice(base: number, d: DifficultyDef): number {
  return base > 0 ? Math.max(1, Math.round(base * d.price)) : 0;
}

/** Moedas que ficam na Névoa quando a pessoa cai. */
export function coinsLostOnDeath(coins: number, d: DifficultyDef): number {
  return Math.min(coins, Math.floor(coins * d.deathCoins));
}

/** Vida de uma criatura ao nascer, a partir da vida-base. */
export function scaleEnemyHp(base: number, boss: boolean, d: DifficultyDef): number {
  return Math.round(base * (boss ? d.bossHp : d.foeHp));
}
