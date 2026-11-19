/**
 * Chão da arena e peças espalhadas. Recria scripts/ground_splat_setup.gd, shaders/ground_splat.gdshader
 * e scripts/ground_scatter.gd: máscara de três materiais por ruído fractal com distorção de domínio,
 * mistura guiada pela altura de cada textura, linha escura junto à parede e queda para o preto fora dela.
 *
 * Divergência: o FastNoiseLite do Godot não existe na web; o ruído aqui é um ruído de valor fractal
 * próprio com a mesma estrutura (5 oitavas, distorção de domínio, semente fixa). A disposição dos
 * materiais e das pedras muda, as regras não. Os materiais são as texturas PS2 do Interprete
 * (terra com musgo, laje de ardósia, estrada de ardósia) no lugar de grama, rocha e areia.
 */
import { MUNDO } from './config';

const ARENA_MIN = -1500;
const ARENA = 3000;
/** pixels de chão por unidade de mundo; a imagem PS2 é ampliada com filtro suave */
export const CHAO_RES = 0.5;
export const CHAO_LIMITE = 1800; // ±1500 da arena + 300 de queda para o preto (oob_fade_px)

function rngSemente(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function ruidoValor(seed: number): (x: number, y: number) => number {
  const h = (x: number, y: number): number => {
    let n = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 2147483647)) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return (((n ^ (n >>> 16)) >>> 0) / 4294967296) * 2 - 1;
  };
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const fx = x - xi, fy = y - yi;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}

function fbm(seed: number, freq: number, oitavas = 5): (x: number, y: number) => number {
  const r = ruidoValor(seed);
  return (x, y) => {
    let soma = 0, amp = 1, f = freq, norma = 0;
    for (let i = 0; i < oitavas; i++) {
      soma += r(x * f, y * f) * amp;
      norma += amp;
      amp *= 0.5;
      f *= 2;
    }
    return soma / norma;
  };
}

function distorcido(seed: number, freq: number, escala: number): (x: number, y: number) => number {
  const base = fbm(seed, freq);
  const wx = fbm(seed + 101, 1 / escala, 3);
  const wy = fbm(seed + 202, 1 / escala, 3);
  const amp = escala * 1.4;
  return (x, y) => base(x + wx(x, y) * amp, y + wy(x, y) * amp);
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** _bake_mask: R grama, G rocha, B areia, 384 × 384 sobre a arena */
export function assarMascara(tam = 384): Float32Array {
  const seed = 1337, escala = 900, banda = 0.4, bandaRocha = 0.35, detEscala = 110, detAmp = 0.12;
  const umidade = distorcido(seed, 1 / escala, escala);
  const rochoso = distorcido(seed + 5000, 1.7 / escala, escala);
  const dg = fbm(seed + 11000, 1 / detEscala), dr = fbm(seed + 14000, 1 / detEscala), ds = fbm(seed + 17000, 1 / detEscala);
  const m = new Float32Array(tam * tam * 3);
  for (let y = 0; y < tam; y++)
    for (let x = 0; x < tam; x++) {
      const wx = ARENA_MIN + (ARENA * (x + 0.5)) / tam, wy = ARENA_MIN + (ARENA * (y + 0.5)) / tam;
      const u = umidade(wx, wy) * 0.5 + 0.5;
      let r = rochoso(wx, wy) * 0.5 + 0.5;
      const d = Math.max(Math.abs(wx), Math.abs(wy));
      const borda = clamp01((d - 1050) / 450);
      r += 0.55 * borda * borda;
      let rocha = clamp01(0.5 + (r - 0.64) / bandaRocha);
      const gs = clamp01(0.5 + (u - 0.55) / banda);
      let grama = (1 - rocha) * gs, areia = (1 - rocha) * (1 - gs);
      grama += detAmp * dg(wx, wy);
      rocha += detAmp * dr(wx, wy);
      areia += detAmp * ds(wx, wy);
      const i = (y * tam + x) * 3;
      m[i] = clamp01(grama);
      m[i + 1] = clamp01(rocha);
      m[i + 2] = clamp01(areia);
    }
  return m;
}

function amostrarMascara(m: Float32Array, tam: number, wx: number, wy: number, out: number[]): void {
  const fx = ((wx - ARENA_MIN) / ARENA) * tam - 0.5, fy = ((wy - ARENA_MIN) / ARENA) * tam - 0.5;
  const x0 = Math.max(0, Math.min(tam - 1, Math.floor(fx))), y0 = Math.max(0, Math.min(tam - 1, Math.floor(fy)));
  const x1 = Math.min(tam - 1, x0 + 1), y1 = Math.min(tam - 1, y0 + 1);
  const tx = clamp01(fx - x0), ty = clamp01(fy - y0);
  for (let c = 0; c < 3; c++) {
    const a = m[(y0 * tam + x0) * 3 + c], b = m[(y0 * tam + x1) * 3 + c], cc = m[(y1 * tam + x0) * 3 + c], d = m[(y1 * tam + x1) * 3 + c];
    out[c] = (a + (b - a) * tx) * (1 - ty) + (cc + (d - cc) * tx) * ty;
  }
}

interface Tex {
  d: Uint8ClampedArray;
  w: number;
  h: number;
  media: number;
}

function lerTextura(img: HTMLImageElement): Tex {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data;
  let s = 0;
  for (let i = 0; i < d.length; i += 4) s += (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255;
  return { d, w: c.width, h: c.height, media: s / (d.length / 4) };
}

/** Desenha o chão inteiro uma vez, em CHAO_RES pixels por unidade, de -1800 a 1800. */
export function assarChao(texGrama: HTMLImageElement, texRocha: HTMLImageElement, texAreia: HTMLImageElement, mascara: Float32Array): HTMLCanvasElement {
  const tam = Math.round(CHAO_LIMITE * 2 * CHAO_RES);
  const c = document.createElement('canvas');
  c.width = c.height = tam;
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  const img = g.createImageData(tam, tam);
  const o = img.data;
  const T = [lerTextura(texGrama), lerTextura(texRocha), lerTextura(texAreia)];
  const ladrilho = [256, 320, 512]; // grass_tile_px, rock_tile_px, sand_tile_px
  const w = [0, 0, 0];
  const cor = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  const lim = MUNDO.meio;
  for (let py = 0; py < tam; py++) {
    const wy = -CHAO_LIMITE + (py + 0.5) / CHAO_RES;
    for (let px = 0; px < tam; px++) {
      const wx = -CHAO_LIMITE + (px + 0.5) / CHAO_RES;
      const paredeD = Math.max(Math.abs(wx) - lim, Math.abs(wy) - lim);
      amostrarMascara(mascara, 384, wx, wy, w);
      if (paredeD > 0) {
        const k = clamp01(paredeD / 80);
        w[0] *= 1 - k;
        w[1] = w[1] * (1 - k) + k;
        w[2] *= 1 - k;
      }
      let hx = 0, hy = 0, hz = 0;
      for (let t = 0; t < 3; t++) {
        const tx = T[t];
        let u = ((wx / ladrilho[t]) % 1) * tx.w, v = ((wy / ladrilho[t]) % 1) * tx.h;
        if (u < 0) u += tx.w;
        if (v < 0) v += tx.h;
        const i = ((Math.floor(v) % tx.h) * tx.w + (Math.floor(u) % tx.w)) * 4;
        cor[t * 3] = tx.d[i];
        cor[t * 3 + 1] = tx.d[i + 1];
        cor[t * 3 + 2] = tx.d[i + 2];
        const l = (tx.d[i] * 0.299 + tx.d[i + 1] * 0.587 + tx.d[i + 2] * 0.114) / 255 - tx.media;
        if (t === 0) hx = l; else if (t === 1) hy = l; else hz = l;
      }
      const ax = hx * 0.8 + w[0], ay = hy * 0.8 + w[1], az = hz * 0.8 + w[2];
      const ma = Math.max(ax, ay, az);
      const bx = Math.max(ax - ma + 0.12, 0), by = Math.max(ay - ma + 0.12, 0), bz = Math.max(az - ma + 0.12, 0);
      const bs = bx + by + bz || 1;
      let mult = 1;
      if (paredeD > 0) mult = 0.55 + (0 - 0.55) * smooth(0, 300, paredeD);
      else mult = 1 + (0.5 - 1) * (1 - smooth(4, 16, -paredeD));
      const k = (py * tam + px) * 4;
      o[k] = ((cor[0] * bx + cor[3] * by + cor[6] * bz) / bs) * mult;
      o[k + 1] = ((cor[1] * bx + cor[4] * by + cor[7] * bz) / bs) * mult;
      o[k + 2] = ((cor[2] * bx + cor[5] * by + cor[8] * bz) / bs) * mult;
      o[k + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

export interface Peca {
  tipo: 'tufo' | 'pedra';
  x: number;
  y: number;
  quadro: string;
  escala: number;
  espelho: boolean;
  raio: number;
  cy: number; // centro do círculo de colisão, relativo a y (pedra)
}

/** ground_scatter.gd: 140 tufos onde há grama, 26 pedras em qualquer bioma, fora do centro e das paredes */
export function espalhar(mascara: Float32Array, dims: (q: string) => { w: number; h: number }): Peca[] {
  const rng = rngSemente(4242);
  const range = (a: number, b: number) => a + (b - a) * rng();
  const pecas: Peca[] = [];
  let tufos = 0, pedras = 0, tent = 0;
  const w = [0, 0, 0];
  while ((tufos < 140 || pedras < 26) && tent < 6000) {
    tent++;
    const x = range(ARENA_MIN + 120, ARENA_MIN + ARENA - 120), y = range(ARENA_MIN + 120, ARENA_MIN + ARENA - 120);
    if (Math.hypot(x, y) < 260) continue;
    amostrarMascara(mascara, 384, x, y, w);
    if (tufos < 140 && w[0] > 0.42 && rng() < w[0]) {
      const q = `tufo_${Math.floor(rng() * 4)}`;
      pecas.push({ tipo: 'tufo', x, y, quadro: q, escala: range(0.14, 0.26), espelho: rng() < 0.5, raio: 0, cy: 0 });
      tufos++;
    } else if (pedras < 26 && rng() < 0.5) {
      const q = `pedra_${Math.floor(rng() * 4)}`;
      const sc = range(0.16, 0.3);
      const espelho = rng() < 0.5;
      const d = dims(q);
      const meiaAltura = d.h * sc * 0.5;
      const raio = Math.min(d.w * sc * 0.3, meiaAltura * 0.75);
      pecas.push({ tipo: 'pedra', x, y, quadro: q, escala: sc, espelho, raio, cy: -raio - meiaAltura * 0.16 });
      pedras++;
    }
  }
  return pecas;
}
