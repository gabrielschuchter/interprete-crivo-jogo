import tokens from '../../design/tokens.json';

/**
 * Cores do jogo. As de marca vêm de design/tokens.json (fonte da verdade).
 * As de mundo são a extensão registrada em DESIGN.md ("Extensão de jogo"):
 * existem porque o design system não cobre luz, pedra e vegetação de cena 3D.
 */
type Tok = { name: string; value: { light: string } };
const list = (tokens as unknown as { color: { tokens: Tok[] } }).color.tokens;
const tok = (name: string, fallback: string): string => list.find((t) => t.name === name)?.value.light ?? fallback;

export const BRAND = {
  darkAmaranth: tok('dark-amaranth', '#8C1535'),
  crimsonViolet: tok('crimson-violet', '#410230'),
  classicCrimson: tok('classic-crimson', '#D62839'),
  pinkEssence: tok('pink-essence', '#F1EBE8'),
  paperLight: tok('paper-light', '#F7F3F1'),
  inkBlack: tok('ink-black', '#120910'),
  amaranthDark: tok('amaranth-dark', '#6E0F29'),
};

export const WORLD = {
  amber: '#E5A85F',
  amberHot: '#FFC27A',
  agedGold: '#BD9A61',
  emerald: '#183D35',
  emeraldLit: '#3F8C74',
  midnight: '#182C48',
  ivory: '#F0E5D3',
  charcoal: '#16121C',
  mist: '#8FB5A6',
};

export function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.pow(v / 255, 2.2);
  return [f((n >> 16) & 255), f((n >> 8) & 255), f(n & 255)];
}
export function srgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
