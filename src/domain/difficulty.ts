/**
 * Níveis de dificuldade: números puros, sem Three.js nem DOM.
 *
 * Quatro níveis: História, Fácil, Médio e Difícil. Cada um é uma tabela aplicada sobre os valores-base de
 * `ENEMY_CFG`, de `computeStats` e da economia. Os inimigos têm três classes (comuns, mini-chefes e chefes) e
 * cada classe tem os seus números, porque um único multiplicador deixava os comuns fáceis no nível mais alto
 * enquanto chefes e mini-chefes já estavam no ponto. No Difícil os comuns também ganham agressividade: golpes
 * encadeados, grupos maiores e dano próprio. O Médio é o jogo difícil de antes dos níveis serem quatro (o antigo
 * Padrão) e é o que vem marcado; o Difícil é o antigo Rigor com os comuns endurecidos.
 *
 * A dificuldade vive no registro (`GameState.difficulty`) e muda em Configurações; a preferência para novas partidas
 * fica em `Settings.difficulty`. Registros e preferências de antes dos quatro níveis usam os ids `padrao` e `rigor`,
 * que `normalizeDifficulty` traduz para `medio` e `dificil`.
 */

export type DifficultyId = 'historia' | 'facil' | 'medio' | 'dificil';
export const DIFFICULTY_IDS: readonly DifficultyId[] = ['historia', 'facil', 'medio', 'dificil'];
export const DEFAULT_DIFFICULTY: DifficultyId = 'medio';

/** classe do inimigo para efeito de vida: comuns, mini-chefes e chefes (Eco e Veredito) */
export type FoeTier = 'comum' | 'mini' | 'chefe';
export function foeTier(c: { boss?: boolean; mini?: boolean }): FoeTier {
  return !c.boss ? 'comum' : c.mini ? 'mini' : 'chefe';
}

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
  /** vida dos mini-chefes */
  miniHp: number;
  /** vida dos chefes (O Eco e O Veredito) */
  bossHp: number;
  /** dano recebido pelo jogador, de qualquer criatura, depois da defesa */
  foeDmg: number;
  /** dano a mais só das criaturas comuns (multiplica o golpe delas antes da defesa) */
  mobDmg: number;
  /** chance de a criatura comum emendar um segundo golpe, com aviso curto, quando o jogador ainda está ao alcance */
  mobChain: number;
  /** grupos maiores: fração de criaturas comuns que ganham uma companheira ao nascer (0,5 = uma a cada duas) */
  mobPack: number;
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
    foeHp: 0.8, miniHp: 0.8, bossHp: 0.8, foeDmg: 0.5, mobDmg: 1, mobChain: 0, mobPack: 0,
    foeSpeed: 0.92, foeWindup: 1.25, foeRecover: 1.15, foeSight: 0.85, foeGap: 1.25, phaseAt: 0.4,
    deflect: 1.4, perfect: 1.35, vigorRegen: 1.15,
    xp: 1.25, coins: 1.25, drops: 1.4, price: 0.85, heal: 1.3, deathCoins: 0,
  },
  facil: {
    id: 'facil',
    name: 'Fácil',
    line: 'Um jogo de ação tranquilo. Os encontros pedem atenção, mas perdoam erros.',
    detail: 'Vida das criaturas como no jogo-base, 20% menos dano, avisos um pouco mais longos, janelas de desvio e esquiva maiores, cura e peças um pouco acima do normal. Cair custa 5% das moedas.',
    foeHp: 1.0, miniHp: 1.0, bossHp: 1.0, foeDmg: 0.8, mobDmg: 1, mobChain: 0, mobPack: 0,
    foeSpeed: 1.0, foeWindup: 1.08, foeRecover: 1.0, foeSight: 1.0, foeGap: 1.0, phaseAt: 0.5,
    deflect: 1.15, perfect: 1.15, vigorRegen: 1.05,
    xp: 1.1, coins: 1.1, drops: 1.15, price: 1.0, heal: 1.1, deathCoins: 0.05,
  },
  medio: {
    id: 'medio',
    name: 'Médio',
    line: 'Pede esforço. Explorar, fazer as missões paralelas e se equipar antes de cada seção faz diferença.',
    detail: 'Criaturas com 20% mais vida (mini-chefes e chefes, 30%) e 35% mais dano, avisos mais curtos, algumas criaturas comuns emendam um segundo golpe, janelas de desvio menores, menos experiência, moedas e peças, banca mais cara, cura menor. Cair custa 10% das moedas.',
    foeHp: 1.2, miniHp: 1.3, bossHp: 1.3, foeDmg: 1.35, mobDmg: 1, mobChain: 0.15, mobPack: 0,
    foeSpeed: 1.06, foeWindup: 0.88, foeRecover: 0.85, foeSight: 1.15, foeGap: 0.85, phaseAt: 0.55,
    deflect: 0.85, perfect: 0.85, vigorRegen: 0.92,
    xp: 0.9, coins: 0.8, drops: 0.85, price: 1.2, heal: 0.9, deathCoins: 0.1,
  },
  dificil: {
    id: 'dificil',
    name: 'Difícil',
    line: 'Pouca margem de erro. Até as criaturas comuns ameaçam: atacam em dupla, emendam golpes e mordem forte. Para quem domina a esgrima.',
    detail: 'Criaturas comuns com 70% mais vida e 20% a mais de dano (além dos 70% gerais), metade delas com companheira, golpes emendados em metade dos ataques; mini-chefes e chefes com 70% mais vida. Avisos curtos, janelas de desvio 30% menores, pouca experiência, moeda e peça, banca 40% mais cara, cura menor. Cair custa 25% das moedas.',
    foeHp: 1.7, miniHp: 1.7, bossHp: 1.7, foeDmg: 1.7, mobDmg: 1.2, mobChain: 0.5, mobPack: 0.5,
    foeSpeed: 1.12, foeWindup: 0.78, foeRecover: 0.7, foeSight: 1.3, foeGap: 0.7, phaseAt: 0.65,
    deflect: 0.7, perfect: 0.7, vigorRegen: 0.85,
    xp: 0.8, coins: 0.65, drops: 0.7, price: 1.4, heal: 0.8, deathCoins: 0.25,
  },
};

/** Traduz ids de registros e preferências de antes dos quatro níveis (padrao e rigor) e valida o resto; null se desconhecido. */
export function normalizeDifficulty(v: unknown): DifficultyId | null {
  if (v === 'padrao') return 'medio';
  if (v === 'rigor') return 'dificil';
  return isDifficulty(v) ? v : null;
}

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
export function scaleEnemyHp(base: number, tier: FoeTier, d: DifficultyDef): number {
  return Math.round(base * (tier === 'chefe' ? d.bossHp : tier === 'mini' ? d.miniHp : d.foeHp));
}
