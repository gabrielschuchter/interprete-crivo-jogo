/**
 * Três espaços de registro no armazenamento local do navegador (decisão 5 do REDESENHO_PARTE_1).
 *
 * O espaço 1 usa a chave de sempre (`interprete-rpg-registro-v1`), então o registro de quem já jogava
 * continua onde estava, sem migração. Os espaços 2 e 3 ganham sufixo. Cada espaço guarda a gravação anterior
 * como cópia (`-anterior`) e, se a atual não puder ser lida, a guarda à parte (`-ilegivel`). O formato do
 * registro não muda: "o mais recente" sai do `savedAt` que `serialize` já grava.
 */
import * as D from '../domain/state';
import type { SaveAdapter } from '../domain/state';

export type SlotId = 1 | 2 | 3;
export const SLOTS: readonly SlotId[] = [1, 2, 3];

const BASE = 'interprete-rpg-registro-v1';
export function slotKey(n: SlotId): string {
  return n === 1 ? BASE : `${BASE}-espaco${n}`;
}

function get(k: string): string | null {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function set(k: string, v: string): boolean {
  try {
    localStorage.setItem(k, v);
    return true;
  } catch {
    return false;
  }
}
function del(k: string): void {
  try {
    localStorage.removeItem(k);
  } catch {
    /* sem armazenamento */
  }
}

export function slotAdapter(n: SlotId): SaveAdapter {
  const key = slotKey(n);
  return {
    load: () => get(key),
    save: (d) => {
      // a gravação anterior fica como cópia: se a nova sair truncada, ainda há de onde retomar
      const prev = get(key);
      if (!set(key, d)) return false;
      if (prev) set(key + '-anterior', prev);
      return true;
    },
    clear: () => del(key),
  };
}

export interface SlotInfo {
  slot: SlotId;
  /** registro legível */
  ok: boolean;
  /** há algo gravado (legível ou não) */
  used: boolean;
  name: string;
  level: number;
  playtime: number;
  region: string;
  savedAt: number;
}

export function slotInfo(n: SlotId): SlotInfo {
  const raw = get(slotKey(n));
  const s = D.deserialize(raw);
  let savedAt = 0;
  if (raw) {
    try {
      const v = (JSON.parse(raw) as { savedAt?: unknown }).savedAt;
      if (typeof v === 'number' && Number.isFinite(v)) savedAt = v;
    } catch {
      /* ilegível */
    }
  }
  return { slot: n, ok: !!s, used: !!raw, name: s?.name ?? '', level: s?.level ?? 0, playtime: s?.playtime ?? 0, region: s?.region ?? '', savedAt };
}

export function allSlots(): SlotInfo[] {
  return SLOTS.map(slotInfo);
}

/** Espaço do registro legível mais recente; empate (registros sem data) fica com o de número menor. */
export function latestSlot(): SlotId | null {
  let best: SlotInfo | null = null;
  for (const i of allSlots()) if (i.ok && (!best || i.savedAt > best.savedAt)) best = i;
  return best?.slot ?? null;
}

/** Primeiro espaço sem nada gravado. */
export function freeSlot(): SlotId | null {
  return allSlots().find((i) => !i.used)?.slot ?? null;
}

/** Apaga o registro e as cópias de um espaço. */
export function clearSlot(n: SlotId): void {
  const k = slotKey(n);
  for (const s of ['', '-anterior', '-ilegivel']) del(k + s);
}

/**
 * Registro gravado que não pode ser lido: guarda à parte e tenta a cópia anterior.
 * 'ok' também quando o espaço está vazio.
 */
export function recoverSlot(n: SlotId): 'ok' | 'recuperado' | 'ilegivel' {
  const k = slotKey(n);
  const raw = get(k);
  if (!raw || D.deserialize(raw)) return 'ok';
  set(k + '-ilegivel', raw);
  const prev = get(k + '-anterior');
  if (prev && D.deserialize(prev)) {
    set(k, prev);
    return 'recuperado';
  }
  return 'ilegivel';
}

/** "3 h 12 min", "8 min" */
export function playtimeLabel(sec: number): string {
  const min = Math.round(sec / 60);
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`;
}
