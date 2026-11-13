import type { Quality } from './engine';
import { DEFAULT_KEYS, type ActionName } from './input';

export interface Settings {
  quality: Quality;
  /** Era PS2 (padrão, direção Luz de estudo) ou Limpa (sem a camada de época); vale ao recarregar */
  aparencia: 'ps2' | 'limpa';
  volGeral: number;
  volMusica: number;
  volEfeitos: number;
  volAmbiente: number;
  sens: number;
  /** multiplicador do eixo vertical sobre a sensibilidade geral */
  sensY: number;
  /** distância da câmera ao personagem, em metros */
  camDist: number;
  /** escala da interface durante o jogo (barras, bússola, atalhos) */
  hudScale: number;
  invertY: boolean;
  grain: boolean;
  vignette: boolean;
  reduceMotion: boolean;
  highContrast: boolean;
  textScale: number;
  difficulty: 'historia' | 'padrao';
  fov: number;
  hud: boolean;
  /** tamanho dos botões de toque */
  touchScale: number;
  /** corrida por toque já a partir de 60% do curso do analógico, sem ir à borda */
  touchEasyRun: boolean;
  /** zona morta dos analógicos do gamepad */
  padDeadzone: number;
  /** botão do gamepad de cada ação; ausente = mapa padrão */
  pad?: Partial<Record<ActionName, number>>;
  /** segundos que avisos e dicas ficam na tela, como multiplicador */
  noticeTime: number;
  /** mostrar números de vida, vigor e experiência nas barras */
  hudNumbers: boolean;
  /** falso até a pessoa mexer em "Reduzir movimento": enquanto isso, vale a preferência do sistema */
  reduceMotionSet: boolean;
  keys: Partial<Record<ActionName, string[]>>;
}

export const DEFAULT_SETTINGS: Settings = {
  quality: 'alta',
  aparencia: 'ps2',
  volGeral: 0.8,
  volMusica: 0.6,
  volEfeitos: 0.85,
  volAmbiente: 0.7,
  sens: 1,
  sensY: 1,
  camDist: 4.6,
  hudScale: 1,
  invertY: false,
  grain: true,
  vignette: true,
  reduceMotion: false,
  highContrast: false,
  textScale: 1,
  difficulty: 'padrao',
  fov: 58,
  hud: true,
  touchScale: 1,
  touchEasyRun: false,
  padDeadzone: 0.18,
  noticeTime: 1,
  hudNumbers: false,
  reduceMotionSet: false,
  keys: {},
};

const KEY = 'interprete-rpg-config-v1';

const QUALITIES = ['baixa', 'media', 'alta'];

/** Aceita só valores do tipo e da faixa esperados; o resto volta ao padrão. */
export function sanitizeSettings(raw: unknown): Settings {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const s: Settings = { ...DEFAULT_SETTINGS, keys: {} };
  const num = (k: keyof Settings, min: number, max: number) => {
    const v = d[k];
    if (typeof v === 'number' && Number.isFinite(v)) (s as unknown as Record<string, unknown>)[k] = Math.min(max, Math.max(min, v));
  };
  const bool = (k: keyof Settings) => {
    if (typeof d[k] === 'boolean') (s as unknown as Record<string, unknown>)[k] = d[k];
  };
  if (QUALITIES.includes(d.quality as string)) s.quality = d.quality as Quality;
  if (d.difficulty === 'historia' || d.difficulty === 'padrao') s.difficulty = d.difficulty;
  if (d.aparencia === 'ps2' || d.aparencia === 'limpa') s.aparencia = d.aparencia;
  num('volGeral', 0, 1); num('volMusica', 0, 1); num('volEfeitos', 0, 1); num('volAmbiente', 0, 1);
  num('sens', 0.3, 2.5); num('sensY', 0.4, 2); num('camDist', 3.2, 6.5); num('hudScale', 0.8, 1.4); num('textScale', 0.9, 1.6); num('fov', 48, 75); num('touchScale', 0.8, 1.4);
  num('padDeadzone', 0.05, 0.45); num('noticeTime', 0.5, 4);
  for (const k of ['invertY', 'grain', 'vignette', 'reduceMotion', 'highContrast', 'hud', 'touchEasyRun', 'hudNumbers', 'reduceMotionSet'] as const) bool(k);
  if (d.keys && typeof d.keys === 'object') {
    for (const [a, list] of Object.entries(d.keys as Record<string, unknown>)) {
      if (a in DEFAULT_KEYS && Array.isArray(list)) s.keys[a as ActionName] = list.filter((c): c is string => typeof c === 'string' && c.length < 24).slice(0, 4);
    }
  }
  // antes do pulo, Espaço era a esquiva: um remapeamento antigo não pode deixar as duas ações na mesma tecla
  if (s.keys.esquiva?.includes('Space') && !s.keys.pular) {
    const rest = s.keys.esquiva.filter((c) => c !== 'Space');
    if (rest.length) s.keys.esquiva = rest;
    else delete s.keys.esquiva;
  }
  if (d.pad && typeof d.pad === 'object') {
    s.pad = {};
    for (const [a, b] of Object.entries(d.pad as Record<string, unknown>)) {
      if (a in DEFAULT_KEYS && typeof b === 'number' && Number.isInteger(b) && b >= 0 && b < 32) s.pad[a as ActionName] = b;
    }
  }
  return s;
}

const systemReduce = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function loadSettings(): Settings {
  let s: Settings | null = null;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) s = sanitizeSettings(JSON.parse(raw));
  } catch {
    /* armazenamento indisponível ou conteúdo ilegível: segue com o padrão */
  }
  if (!s) {
    s = { ...DEFAULT_SETTINGS, keys: {} };
    // primeira execução em aparelho de toque: qualidade baixa poupa bateria e garante fluidez
    if (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches) s.quality = 'baixa';
  }
  // enquanto a pessoa não escolher, "reduzir movimento" acompanha o sistema, inclusive se ele mudar depois
  if (!s.reduceMotionSet) s.reduceMotion = systemReduce();
  return s;
}

export function storeSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* sem armazenamento */
  }
}
