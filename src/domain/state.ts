/**
 * Estado do jogo e regras puras (sem Three.js, sem DOM).
 * Tudo aqui é testável em Node e é o contrato que um servidor de cooperação
 * validaria no futuro: recompensas idempotentes, save versionado, eventos.
 */

export const SAVE_VERSION = 2;

export type ProfessionId = 'nutricao' | 'medicina' | 'enfermagem' | 'psicologia' | 'fisioterapia' | 'aprendiz';
export type EquipSlot = 'ferramenta' | 'traje' | 'calcado' | 'amuleto';
export type QuestStatus = 'ativa' | 'concluida';
export type CrivoActive = 'pulso' | 'lupa';

export interface QuestState {
  status: QuestStatus;
  step: number;
  vars: Record<string, number>;
}

export interface CaseDecision {
  caseId: string;
  caseVersion: string;
  option: string;
  process: string[];
  outcome: string;
  at: number;
}

export interface Look {
  skin: number;
  hair: number;
  coat: number;
}

export interface GameState {
  version: number;
  name: string;
  profession: ProfessionId;
  look: Look;
  region: string;
  pos: { x: number; y: number; z: number; yaw: number };
  level: number;
  xp: number;
  skillPoints: number;
  crivoPoints: number;
  hp: number;
  coins: number;
  inventory: Record<string, number>;
  equipment: Partial<Record<EquipSlot, string>>;
  skills: string[];
  crivoSkills: string[];
  crivoActive: CrivoActive;
  crivoLook: { laco: boolean; capa: boolean };
  quests: Record<string, QuestState>;
  flags: string[];
  collected: string[];
  defeated: string[];
  codex: string[];
  rewards: string[];
  cases: CaseDecision[];
  playtime: number;
  savedAt: number;
}

export function newGame(name: string, profession: ProfessionId, look: Look): GameState {
  return {
    version: SAVE_VERSION,
    name: name.trim().slice(0, 18) || 'Viajante',
    profession,
    look,
    region: 'atrio',
    pos: { x: 0, y: 0, z: 17.5, yaw: Math.PI },
    level: 1,
    xp: 0,
    skillPoints: 0,
    crivoPoints: 0,
    hp: 100,
    coins: 10,
    inventory: { caldo: 1 },
    equipment: {},
    skills: [],
    crivoSkills: ['farejar'],
    crivoActive: 'pulso',
    crivoLook: { laco: false, capa: false },
    quests: {},
    flags: [],
    collected: [],
    defeated: [],
    codex: ['crivo'],
    rewards: [],
    cases: [],
    playtime: 0,
    savedAt: 0,
  };
}

// ---------- progressão ----------

/** XP total necessário para alcançar o nível n (n >= 1). */
export function xpForLevel(n: number): number {
  return n <= 1 ? 0 : Math.round(60 * (n - 1) + 30 * (n - 1) * (n - 2));
}

export const MAX_LEVEL = 12;

export interface XpResult {
  leveled: number;
}

export function addXp(s: GameState, amount: number): XpResult {
  if (amount <= 0) return { leveled: 0 };
  s.xp += Math.round(amount);
  let leveled = 0;
  while (s.level < MAX_LEVEL && s.xp >= xpForLevel(s.level + 1)) {
    s.level++;
    s.skillPoints++;
    leveled++;
  }
  return { leveled };
}

// ---------- flags, coleções, recompensas ----------

export function hasFlag(s: GameState, f: string): boolean {
  return s.flags.includes(f);
}
export function setFlag(s: GameState, f: string): boolean {
  if (s.flags.includes(f)) return false;
  s.flags.push(f);
  return true;
}
export function markCollected(s: GameState, id: string): boolean {
  if (s.collected.includes(id)) return false;
  s.collected.push(id);
  return true;
}

export interface Reward {
  id: string;
  xp?: number;
  coins?: number;
  items?: Record<string, number>;
  crivoPoints?: number;
  skillPoints?: number;
  codex?: string[];
}

/** Concede uma recompensa uma única vez, mesmo que chamada de novo após recarregar. */
export function grantReward(s: GameState, r: Reward): { granted: boolean; leveled: number } {
  if (s.rewards.includes(r.id)) return { granted: false, leveled: 0 };
  s.rewards.push(r.id);
  if (r.coins) s.coins += r.coins;
  if (r.items) for (const [k, v] of Object.entries(r.items)) addItem(s, k, v);
  if (r.crivoPoints) s.crivoPoints += r.crivoPoints;
  if (r.skillPoints) s.skillPoints += r.skillPoints;
  if (r.codex) for (const c of r.codex) unlockCodex(s, c);
  const { leveled } = addXp(s, r.xp ?? 0);
  return { granted: true, leveled };
}

export function unlockCodex(s: GameState, id: string): boolean {
  if (s.codex.includes(id)) return false;
  s.codex.push(id);
  return true;
}

// ---------- inventário ----------

export function addItem(s: GameState, id: string, qty = 1): void {
  if (qty <= 0) return;
  s.inventory[id] = (s.inventory[id] ?? 0) + qty;
}

export function removeItem(s: GameState, id: string, qty = 1): boolean {
  const have = s.inventory[id] ?? 0;
  if (have < qty) return false;
  if (have === qty) {
    delete s.inventory[id];
    for (const slot of Object.keys(s.equipment) as EquipSlot[]) if (s.equipment[slot] === id) delete s.equipment[slot];
  } else s.inventory[id] = have - qty;
  return true;
}

export function countItem(s: GameState, id: string): number {
  return s.inventory[id] ?? 0;
}

export function equip(s: GameState, slot: EquipSlot, id: string): boolean {
  if (!countItem(s, id)) return false;
  s.equipment[slot] = id;
  return true;
}

export function unequip(s: GameState, slot: EquipSlot): void {
  delete s.equipment[slot];
}

export function isEquipped(s: GameState, id: string): boolean {
  return Object.values(s.equipment).includes(id);
}

export function buy(s: GameState, id: string, price: number): boolean {
  if (s.coins < price) return false;
  s.coins -= price;
  addItem(s, id, 1);
  return true;
}

// ---------- missões ----------

export function startQuest(s: GameState, id: string): boolean {
  if (s.quests[id]) return false;
  s.quests[id] = { status: 'ativa', step: 0, vars: {} };
  return true;
}

export function questStep(s: GameState, id: string): number {
  const q = s.quests[id];
  return q ? (q.status === 'concluida' ? 999 : q.step) : -1;
}

export function questActive(s: GameState, id: string): boolean {
  return s.quests[id]?.status === 'ativa';
}
export function questDone(s: GameState, id: string): boolean {
  return s.quests[id]?.status === 'concluida';
}

/** Avança para um passo específico; nunca retrocede. */
export function advanceQuest(s: GameState, id: string, toStep: number): boolean {
  const q = s.quests[id];
  if (!q || q.status !== 'ativa' || toStep <= q.step) return false;
  q.step = toStep;
  return true;
}

export function completeQuest(s: GameState, id: string): boolean {
  const q = s.quests[id];
  if (!q || q.status === 'concluida') return false;
  q.status = 'concluida';
  return true;
}

export function questVar(s: GameState, id: string, key: string): number {
  return s.quests[id]?.vars[key] ?? 0;
}
export function setQuestVar(s: GameState, id: string, key: string, v: number): void {
  const q = s.quests[id];
  if (q) q.vars[key] = v;
}

// ---------- habilidades ----------

export interface SkillDef {
  id: string;
  name: string;
  branch: string;
  desc: string;
  effect: string;
  cost: number;
  requires?: string[];
  minLevel?: number;
  /** nó anunciado mas indisponível nesta versão (ex.: cooperação) */
  locked?: string;
  tier: number;
}

export type UnlockCheck = { ok: true } | { ok: false; reason: string };

export function canUnlock(def: SkillDef, owned: string[], points: number, level: number): UnlockCheck {
  if (owned.includes(def.id)) return { ok: false, reason: 'Já ativa.' };
  if (def.locked) return { ok: false, reason: def.locked };
  if (def.minLevel && level < def.minLevel) return { ok: false, reason: `Requer nível ${def.minLevel}.` };
  for (const r of def.requires ?? []) if (!owned.includes(r)) return { ok: false, reason: 'Requer o nó anterior do ramo.' };
  if (points < def.cost) return { ok: false, reason: def.cost === 1 ? 'Requer 1 ponto.' : `Requer ${def.cost} pontos.` };
  return { ok: true };
}

export function unlockSkill(s: GameState, def: SkillDef): UnlockCheck {
  const c = canUnlock(def, s.skills, s.skillPoints, s.level);
  if (!c.ok) return c;
  s.skillPoints -= def.cost;
  s.skills.push(def.id);
  return c;
}

export function unlockCrivoSkill(s: GameState, def: SkillDef): UnlockCheck {
  const c = canUnlock(def, s.crivoSkills, s.crivoPoints, s.level);
  if (!c.ok) return c;
  s.crivoPoints -= def.cost;
  s.crivoSkills.push(def.id);
  return c;
}

// ---------- atributos derivados ----------

export interface Stats {
  maxHp: number;
  maxVigor: number;
  vigorRegen: number;
  damage: number;
  heavyDamage: number;
  walkSpeed: number;
  runSpeed: number;
  dodgeCost: number;
  dodgeIframes: number;
  attackCost: number;
  defense: number; // fração de dano reduzida
  coinBonus: number;
  pickupRadius: number;
  heavyStagger: boolean;
  pulseCooldown: number;
  lupaCooldown: number;
  pulseRadius: number;
}

export function computeStats(s: GameState): Stats {
  const has = (id: string) => s.skills.includes(id);
  const crivo = (id: string) => s.crivoSkills.includes(id);
  const eq = (id: string) => isEquipped(s, id);
  const lvl = s.level - 1;
  const st: Stats = {
    maxHp: 100 + lvl * 8,
    maxVigor: 100 + (has('folego') ? 25 : 0),
    vigorRegen: 26,
    damage: 18 + lvl * 1.5,
    heavyDamage: 40 + lvl * 3,
    walkSpeed: 2.5,
    runSpeed: 5.6,
    dodgeCost: 22,
    dodgeIframes: 0.34,
    attackCost: 9,
    defense: 0,
    coinBonus: 0,
    pickupRadius: 1.5,
    heavyStagger: false,
    pulseCooldown: 11,
    lupaCooldown: 14,
    pulseRadius: 6,
  };
  if (has('passo_firme')) st.runSpeed *= 1.1;
  if (has('olho_coletor')) {
    st.coinBonus += 0.25;
    st.pickupRadius = 2.6;
  }
  if (has('esquiva_limpa')) {
    st.dodgeCost = 16;
    st.dodgeIframes = 0.46;
  }
  if (has('golpe_decidido')) {
    st.damage *= 1.15;
    st.heavyDamage *= 1.15;
    st.heavyStagger = true;
  }
  if (eq('botas_bradford')) {
    st.walkSpeed *= 1.08;
    st.runSpeed *= 1.08;
  }
  if (eq('capa_parcimonia')) {
    st.dodgeCost *= 0.8;
    st.attackCost *= 0.8;
  }
  if (eq('pingente_intervalo')) st.defense += 0.12;
  if (eq('jaleco_semmelweis')) st.defense += 0.1;
  if (eq('anel_duplo_cego')) {
    st.damage *= 1.1;
    st.heavyDamage *= 1.1;
  }
  if (eq('bussola_cochrane')) {
    st.coinBonus += 0.25;
    st.pickupRadius = Math.max(st.pickupRadius, 2.4);
  }
  if (countItem(s, 'ponteira_latao') > 0) {
    st.damage += 6;
    st.heavyDamage += 10;
  }
  if (crivo('pulso_amplo')) {
    st.pulseRadius = 8.5;
    st.pulseCooldown = 9;
  }
  return st;
}

/** Dano recebido após defesa; nunca abaixo de 1. */
export function damageTaken(raw: number, st: Stats, difficulty: 'historia' | 'padrao'): number {
  const mult = difficulty === 'historia' ? 0.45 : 1;
  return Math.max(1, Math.round(raw * (1 - st.defense) * mult));
}

// ---------- save ----------

export interface SaveAdapter {
  load(): string | null;
  save(data: string): void;
  clear(): void;
}

export function serialize(s: GameState): string {
  return JSON.stringify({ ...s, savedAt: Date.now() });
}

/** Migra saves antigos. v1 não tinha crivoLook, cases nem rewards idempotentes. */
export function migrate(raw: unknown): GameState | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, unknown>;
  if (typeof d.version !== 'number' || typeof d.name !== 'string') return null;
  if (d.version > SAVE_VERSION) return null;
  const base = newGame(String(d.name), (d.profession as ProfessionId) ?? 'aprendiz', (d.look as Look) ?? { skin: 1, hair: 0, coat: 0 });
  const out = { ...base, ...(d as Partial<GameState>) } as GameState;
  if (d.version < 2) {
    out.crivoLook = base.crivoLook;
    out.cases = [];
    out.rewards = Array.isArray(d.rewards) ? (d.rewards as string[]) : [];
    // v1 guardava missões concluídas como lista de ids
    const done = (d as { questsDone?: string[] }).questsDone;
    if (Array.isArray(done)) for (const q of done) out.quests[q] = { status: 'concluida', step: 0, vars: {} };
  }
  out.version = SAVE_VERSION;
  for (const k of ['flags', 'collected', 'defeated', 'codex', 'rewards', 'skills', 'crivoSkills', 'cases'] as const) {
    if (!Array.isArray(out[k])) (out as unknown as Record<string, unknown>)[k] = [];
  }
  if (!out.crivoSkills.includes('farejar')) out.crivoSkills.push('farejar');
  if (typeof out.inventory !== 'object' || !out.inventory) out.inventory = {};
  if (typeof out.quests !== 'object' || !out.quests) out.quests = {};
  return out;
}

export function deserialize(text: string | null): GameState | null {
  if (!text) return null;
  try {
    return migrate(JSON.parse(text));
  } catch {
    return null;
  }
}
