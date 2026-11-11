import type { Quality } from './engine';
import type { ActionName } from './input';

export interface Settings {
  quality: Quality;
  volGeral: number;
  volMusica: number;
  volEfeitos: number;
  volAmbiente: number;
  sens: number;
  invertY: boolean;
  grain: boolean;
  vignette: boolean;
  reduceMotion: boolean;
  highContrast: boolean;
  textScale: number;
  difficulty: 'historia' | 'padrao';
  fov: number;
  hud: boolean;
  keys: Partial<Record<ActionName, string[]>>;
}

export const DEFAULT_SETTINGS: Settings = {
  quality: 'alta',
  volGeral: 0.8,
  volMusica: 0.6,
  volEfeitos: 0.85,
  volAmbiente: 0.7,
  sens: 1,
  invertY: false,
  grain: true,
  vignette: true,
  reduceMotion: false,
  highContrast: false,
  textScale: 1,
  difficulty: 'padrao',
  fov: 58,
  hud: true,
  keys: {},
};

const KEY = 'interprete-rpg-config-v1';

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    /* armazenamento indisponível: segue com o padrão */
  }
  const s = { ...DEFAULT_SETTINGS };
  if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) s.reduceMotion = true;
  return s;
}

export function storeSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* sem armazenamento */
  }
}
