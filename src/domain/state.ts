/**
 * Estado do jogo e regras puras (sem Three.js, sem DOM).
 * Tudo aqui é testável em Node e é o contrato que um servidor de cooperação
 * validaria no futuro: recompensas idempotentes, save versionado, eventos.
 */

import { GEAR, STARTING_WEAPON, type WeaponEffect } from './gear';

export const SAVE_VERSION = 2;

export type ProfessionId = 'nutricao' | 'medicina' | 'enfermagem' | 'psicologia' | 'fisioterapia' | 'aprendiz';
export type EquipSlot = 'arma' | 'ferramenta' | 'traje' | 'calcado' | 'amuleto';
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
  /** corpo escolhido na criação; registros antigos não têm e usam o modelo do corte */
  body?: 'fem' | 'masc';
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
    inventory: { caldo: 1, [STARTING_WEAPON]: 1 },
    equipment: { arma: STARTING_WEAPON },
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
  /** arma equipada: aparência, alcance e efeito especial */
  weaponLook: string;
  reach: number;
  variance: number;
  crit: number;
  critMult: number;
  special: WeaponEffect | null;
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
    weaponLook: 'estoque',
    reach: 2.5,
    variance: 0.1,
    crit: 0.05,
    critMult: 1.6,
    special: null,
  };
  // arma: substitui o dano-base; o nível continua somando
  const w = s.equipment.arma ? GEAR[s.equipment.arma] : undefined;
  if (w && w.slot === 'arma' && countItem(s, w.id) > 0) {
    st.damage = (w.dmg ?? 18) + lvl * 1.5;
    st.heavyDamage = (w.heavy ?? 40) + lvl * 3;
    st.weaponLook = w.look ?? 'estoque';
    st.reach = w.reach ?? 2.5;
    st.variance = w.variance ?? 0.1;
    st.crit = w.crit ?? 0.05;
    st.critMult = w.critMult ?? 1.6;
    st.attackCost *= w.costMult ?? 1;
    st.special = w.special ?? null;
    if (w.special === 'absoluto') st.heavyStagger = true;
  }
  const a = s.equipment.traje ? GEAR[s.equipment.traje] : undefined;
  if (a && a.slot === 'traje' && countItem(s, a.id) > 0) {
    st.defense += a.defense ?? 0;
    st.walkSpeed *= 1 + (a.speed ?? 0);
    st.runSpeed *= 1 + (a.speed ?? 0);
    st.dodgeCost *= a.dodgeMult ?? 1;
  }
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
  return Math.max(1, Math.round(raw * (1 - Math.min(0.6, st.defense)) * mult));
}

// ---------- save ----------

export interface SaveAdapter {
  load(): string | null;
  /** falso quando a gravação falhou; adaptadores antigos que não devolvem nada contam como sucesso */
  save(data: string): boolean | void;
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
  // valores numéricos e aninhados: um registro editado ou truncado não pode travar o jogo
  const num = (v: unknown, min: number, max: number, def: number): number => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : def);
  out.level = Math.round(num(out.level, 1, MAX_LEVEL, 1));
  out.xp = num(out.xp, 0, 1e7, 0);
  out.hp = num(out.hp, 1, 1e5, base.hp);
  out.coins = Math.round(num(out.coins, 0, 1e7, 0));
  out.skillPoints = Math.round(num(out.skillPoints, 0, 999, 0));
  out.crivoPoints = Math.round(num(out.crivoPoints, 0, 999, 0));
  out.playtime = num(out.playtime, 0, 1e9, 0);
  if (typeof out.name !== 'string' || !out.name.trim()) out.name = base.name;
  out.name = out.name.slice(0, 40);
  if (typeof out.region !== 'string') out.region = base.region;
  const pos = out.pos as Partial<GameState['pos']> | null;
  if (!pos || typeof pos !== 'object' || ![pos.x, pos.y, pos.z, pos.yaw].every((v) => typeof v === 'number' && Number.isFinite(v))) {
    out.pos = { ...base.pos };
    out.region = base.region;
  }
  const lk = out.look as Partial<Look> | null;
  out.look = { skin: Math.round(num(lk?.skin, 0, 99, 1)), hair: Math.round(num(lk?.hair, 0, 99, 0)), coat: Math.round(num(lk?.coat, 0, 99, 0)) };
  if (lk?.body === 'fem' || lk?.body === 'masc') out.look.body = lk.body;
  if (out.crivoActive !== 'pulso' && out.crivoActive !== 'lupa') out.crivoActive = 'pulso';
  if (!out.crivoLook || typeof out.crivoLook !== 'object') out.crivoLook = base.crivoLook;
  if (typeof out.equipment !== 'object' || !out.equipment) out.equipment = {};
  for (const k of ['flags', 'collected', 'defeated', 'codex', 'rewards', 'skills', 'crivoSkills'] as const) out[k] = out[k].filter((x) => typeof x === 'string');
  out.cases = out.cases.filter((c) => c && typeof c === 'object' && typeof c.caseId === 'string');
  if (typeof out.inventory !== 'object' || !out.inventory) out.inventory = {};
  if (typeof out.quests !== 'object' || !out.quests) out.quests = {};
  for (const [k, v] of Object.entries(out.inventory)) if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) delete out.inventory[k];
  // registros de antes das armas: quem não tem nenhuma recebe a inicial, já empunhada
  if (!Object.keys(out.inventory).some((id) => GEAR[id]?.slot === 'arma')) out.inventory[STARTING_WEAPON] = 1;
  if (!out.equipment.arma || !out.inventory[out.equipment.arma]) out.equipment.arma = Object.keys(out.inventory).find((id) => GEAR[id]?.slot === 'arma');
  for (const [k, q] of Object.entries(out.quests)) {
    if (!q || typeof q !== 'object' || (q.status !== 'ativa' && q.status !== 'concluida')) delete out.quests[k];
    else {
      q.step = Math.round(num(q.step, 0, 99, 0));
      if (!q.vars || typeof q.vars !== 'object') q.vars = {};
    }
  }
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
