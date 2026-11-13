/**
 * Armas e armaduras: números puros, sem Three.js. Cada peça leva o nome de uma ideia de prática
 * baseada em evidências, e o efeito de jogo imita a ideia (variância, precisão, NNT, síntese, replicação).
 * Alvos de equilíbrio (skill rpg): Fiapo (46 PV) cai em 2 a 3 golpes leves com a arma inicial,
 * Vulto (96 PV) em 4 a 6, chefes em 25 a 50.
 */

export type Rarity = 'comum' | 'incomum' | 'rara' | 'epica' | 'lendaria';
export const RARITY_LABEL: Record<Rarity, string> = { comum: 'Comum', incomum: 'Incomum', rara: 'Rara', epica: 'Épica', lendaria: 'Lendária' };
/** cor do facho de luz sobre a peça caída: tons gastos, coerentes com a paleta */
export const RARITY_COLOR: Record<Rarity, number> = { comum: 0xb8b0a0, incomum: 0x7fa86a, rara: 0x6a9ad0, epica: 0xa86ad0, lendaria: 0xe0b050 };
/** pesos de sorteio por raridade */
export const RARITY_WEIGHT: Record<Rarity, number> = { comum: 60, incomum: 25, rara: 10, epica: 4, lendaria: 1 };

export type WeaponEffect = 'variancia' | 'precisao' | 'absoluto' | 'nnt' | 'sintese' | 'replicacao' | 'desfecho';

export interface GearDef {
  id: string;
  name: string;
  slot: 'arma' | 'traje';
  rarity: Rarity;
  desc: string;
  /** o que o efeito faz, em termos de jogo */
  effect: string;
  ref: string;
  price?: number;
  /** arma: aparência (WEAPON_LOOKS), dano leve e firme, alcance */
  look?: string;
  dmg?: number;
  heavy?: number;
  reach?: number;
  /** fração de variação do dano para cima e para baixo; padrão 0,1 */
  variance?: number;
  crit?: number;
  critMult?: number;
  /** multiplica o custo de vigor dos golpes */
  costMult?: number;
  special?: WeaponEffect;
  /** armadura: fração de dano reduzida e efeito na velocidade */
  defense?: number;
  speed?: number;
  dodgeMult?: number;
}

export const GEAR: Record<string, GearDef> = {
  estoque_aprendiz: {
    id: 'estoque_aprendiz', name: 'Estoque do Aprendiz', slot: 'arma', rarity: 'comum', look: 'estoque', dmg: 18, heavy: 40, reach: 2.6,
    desc: 'Lâmina reta, fina, sem enfeite. Serve a quem ainda está aprendendo a perguntar antes de golpear.',
    effect: 'Dano 18, firme 40. Variação pequena.', ref: 'A pergunta vem antes da resposta',
  },
  facao_conveniencia: {
    id: 'facao_conveniencia', name: 'Facão da Amostra de Conveniência', slot: 'arma', rarity: 'comum', look: 'machete', dmg: 22, heavy: 46, reach: 2.4, variance: 0.45, price: 45,
    desc: 'Pega o que estiver à mão. Num dia corta fundo, no outro mal arranha, e ninguém sabe dizer por quê.',
    effect: 'Dano médio alto, mas varia 45% para cima ou para baixo a cada golpe.', ref: 'Amostra de conveniência e variabilidade', special: 'variancia',
  },
  sabre_desfecho: {
    id: 'sabre_desfecho', name: 'Sabre do Desfecho Registrado', slot: 'arma', rarity: 'incomum', look: 'sabre', dmg: 21, heavy: 47, reach: 2.7, price: 130,
    desc: 'Gravado na lâmina, antes da primeira luta, está o nome do único alvo que importa.',
    effect: '+30% de dano contra chefes.', ref: 'Desfecho primário registrado antes do estudo', special: 'desfecho',
  },
  adaga_intervalo: {
    id: 'adaga_intervalo', name: 'Adaga do Intervalo Estreito', slot: 'arma', rarity: 'rara', look: 'adaga', dmg: 16, heavy: 34, reach: 2.1, variance: 0.04, crit: 0.2, critMult: 1.9, costMult: 0.65,
    desc: 'Curta e exata. O golpe cai quase sempre no mesmo lugar, e às vezes no lugar certo.',
    effect: 'Quase sem variação, 20% de crítico (x1,9) e golpes 35% mais baratos.', ref: 'Precisão e intervalo de confiança estreito', special: 'precisao',
  },
  maca_absoluta: {
    id: 'maca_absoluta', name: 'Maça da Diferença Absoluta', slot: 'arma', rarity: 'rara', look: 'maca', dmg: 25, heavy: 56, reach: 2.3, variance: 0,
    desc: 'Não promete porcentagens. Diz quanto tira, e tira exatamente isso.',
    effect: 'Dano fixo, sem variação; o golpe firme sempre interrompe inimigos comuns.', ref: 'Risco absoluto antes do relativo', special: 'absoluto',
  },
  machado_nnt: {
    id: 'machado_nnt', name: 'Machado do Número Necessário', slot: 'arma', rarity: 'epica', look: 'machado', dmg: 23, heavy: 50, reach: 2.6,
    desc: 'No cabo, três entalhes. Nem todo golpe decide; um em cada três decide por todos.',
    effect: 'A cada três golpes que acertam, o terceiro causa dano x2,2.', ref: 'Número necessário para tratar (NNT)', special: 'nnt',
  },
  martelo_sintese: {
    id: 'martelo_sintese', name: 'Martelo da Síntese', slot: 'arma', rarity: 'epica', look: 'martelo', dmg: 26, heavy: 62, reach: 2.9, costMult: 1.25,
    desc: 'Pesado como uma revisão inteira. Não escolhe um alvo: junta todos os que estão em volta.',
    effect: 'O golpe firme atinge em círculo completo. Golpes custam 25% mais vigor.', ref: 'Revisão sistemática e síntese', special: 'sintese',
  },
  estoque_replicacao: {
    id: 'estoque_replicacao', name: 'Estoque da Replicação', slot: 'arma', rarity: 'lendaria', look: 'estoque', dmg: 24, heavy: 52, reach: 2.8, crit: 0.08, critMult: 1.8,
    desc: 'Forjado duas vezes, por ferreiros que nunca se encontraram. As duas lâminas saíram iguais.',
    effect: 'Cada acerto seguido no mesmo alvo soma +12% de dano, até +60%.', ref: 'Replicação independente de resultados', special: 'replicacao',
  },
  gibao_sigilo: {
    id: 'gibao_sigilo', name: 'Gibão do Sigilo de Alocação', slot: 'traje', rarity: 'incomum', defense: 0.14, price: 95,
    desc: 'Couro escuro, costuras por dentro. Quem olha de fora não adivinha o que vem.',
    effect: 'Reduz 14% do dano recebido.', ref: 'Sigilo da alocação',
  },
  cota_amostra: {
    id: 'cota_amostra', name: 'Cota da Amostra Grande', slot: 'traje', rarity: 'rara', defense: 0.22, speed: -0.05, price: 230,
    desc: 'Milhares de elos pequenos. Nenhum sozinho protege muito; juntos, o acaso quase não passa.',
    effect: 'Reduz 22% do dano recebido; 5% mais lento.', ref: 'Tamanho de amostra e erro aleatório',
  },
  armadura_protocolo: {
    id: 'armadura_protocolo', name: 'Armadura do Protocolo', slot: 'traje', rarity: 'epica', defense: 0.26, dodgeMult: 0.85,
    desc: 'Cada placa foi desenhada antes da batalha e nenhuma foi trocada no meio dela.',
    effect: 'Reduz 26% do dano recebido; esquiva 15% mais barata.', ref: 'Protocolo publicado antes do estudo',
  },
};

export const STARTING_WEAPON = 'estoque_aprendiz';

/** O que cada inimigo pode deixar cair: chance e lista de peças possíveis (sorteio ponderado pela raridade). */
export const DROPS: Record<string, { chance: number; pool: string[]; first?: string }> = {
  fiapo: { chance: 0.08, pool: ['facao_conveniencia', 'gibao_sigilo', 'sabre_desfecho'] },
  vulto: { chance: 0.22, pool: ['sabre_desfecho', 'gibao_sigilo', 'adaga_intervalo', 'maca_absoluta', 'cota_amostra'] },
  eco: { chance: 1, first: 'machado_nnt', pool: ['adaga_intervalo', 'machado_nnt', 'cota_amostra', 'martelo_sintese'] },
  veredito: { chance: 1, first: 'estoque_replicacao', pool: ['estoque_replicacao', 'armadura_protocolo'] },
};

/** Sorteio puro: `r1` decide se cai algo, `r2` escolhe a peça. Peças já possuídas saem do sorteio. */
export function rollDrop(kind: string, owned: (id: string) => boolean, r1: number, r2: number, chanceMult = 1): string | null {
  const t = DROPS[kind];
  // a dificuldade mexe na sorte das criaturas comuns; quem já tem queda garantida (chefes) continua garantindo
  const chance = t && t.chance >= 1 ? 1 : t ? Math.min(1, t.chance * chanceMult) : 0;
  if (!t || r1 >= chance) return null;
  // chefes entregam primeiro a peça que é deles; repetir a luta sorteia o resto
  if (t.first && GEAR[t.first] && !owned(t.first)) return t.first;
  const pool = t.pool.filter((id) => GEAR[id] && !owned(id));
  if (!pool.length) return null;
  const total = pool.reduce((a, id) => a + RARITY_WEIGHT[GEAR[id].rarity], 0);
  let x = r2 * total;
  for (const id of pool) {
    x -= RARITY_WEIGHT[GEAR[id].rarity];
    if (x < 0) return id;
  }
  return pool[pool.length - 1];
}
