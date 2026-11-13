import { DEFAULT_KEYS, type ActionName } from './input';
import { DEFAULT_DIFFICULTY, isDifficulty, type DifficultyId } from '../domain/difficulty';

/**
 * Ajustes do jogador. A lista é curta de propósito (docs/game/AJUSTES.md): só entra o que muda a jogabilidade
 * ou a acessibilidade. Imagem e qualidade são do jogo, não do jogador: a PS2 tardia é a única imagem e a
 * qualidade sai do aparelho e do ritmo de quadros (src/core/quality.ts).
 */
export interface Settings {
  volGeral: number;
  volMusica: number;
  /** efeitos e ambiente (vento, chuva, salas) num controle só */
  volEfeitos: number;
  sens: number;
  invertY: boolean;
  /** gama do passe de cor: 1 é neutro, acima abre as sombras, abaixo fecha */
  brilho: number;
  reduceMotion: boolean;
  highContrast: boolean;
  /** escala do texto e, em proporção menor, da interface em jogo (barras, objetivo, atalhos) */
  textScale: number;
  /** dificuldade das novas partidas; a de uma partida em curso mora no registro (GameState.difficulty) */
  difficulty: DifficultyId;
  /** tamanho dos botões de toque */
  touchScale: number;
  /** botão do gamepad de cada ação; ausente = mapa padrão */
  pad?: Partial<Record<ActionName, number>>;
  /** falso até a pessoa mexer em "Reduzir movimento": enquanto isso, vale a preferência do sistema */
  reduceMotionSet: boolean;
  keys: Partial<Record<ActionName, string[]>>;
}

export const DEFAULT_SETTINGS: Settings = {
  volGeral: 0.8,
  volMusica: 0.6,
  volEfeitos: 0.85,
  sens: 1,
  invertY: false,
  brilho: 1,
  reduceMotion: false,
  highContrast: false,
  textScale: 1,
  difficulty: DEFAULT_DIFFICULTY,
  touchScale: 1,
  reduceMotionSet: false,
  keys: {},
};

/** faixa do brilho (gama); fora dela o breu vira cinza ou as sombras engolem a leitura do golpe */
export const BRILHO_MIN = 0.7;
export const BRILHO_MAX = 1.5;

/** escala da interface em jogo derivada do tamanho do texto: cresce mais devagar, para não cobrir a cena */
export function hudScaleFor(textScale: number): number {
  return Math.min(1.3, Math.max(0.9, 1 + (textScale - 1) * 0.5));
}

const KEY = 'interprete-rpg-config-v1';

/**
 * Aceita só valores do tipo e da faixa esperados; o resto volta ao padrão. Campos de versões antigas
 * (aparência, qualidade, campo de visão, grão, vinheta, sensibilidade vertical, distância da câmera, escala
 * própria da interface, interface oculta, números nas barras, corrida fácil no toque, zona morta, duração de
 * avisos, volume de ambiente) caem em silêncio: o jogo passa a decidir por eles.
 */
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
  if (isDifficulty(d.difficulty)) s.difficulty = d.difficulty;
  num('volGeral', 0, 1); num('volMusica', 0, 1); num('volEfeitos', 0, 1);
  // a escala própria da interface em jogo saiu: quem tinha aumentado só ela passa a "Maior" no tamanho do texto
  if (typeof d.hudScale === 'number' && d.hudScale >= 1.15 && (d.textScale === undefined || d.textScale === 1)) s.textScale = 1.15;
  num('sens', 0.3, 2.5); num('brilho', BRILHO_MIN, BRILHO_MAX); num('textScale', 0.9, 1.6); num('touchScale', 0.8, 1.4);
  for (const k of ['invertY', 'reduceMotion', 'highContrast', 'reduceMotionSet'] as const) bool(k);
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
  if (!s) s = { ...DEFAULT_SETTINGS, keys: {} };
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
