import * as THREE from 'three';

/**
 * Texturas PBR procedurais (albedo + normal + roughness), geradas em canvas.
 * Autoria própria do projeto: não há arquivo de terceiros envolvido.
 * Todas são tileáveis (ruído periódico).
 */

function hash2(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return ((h >>> 0) % 100000) / 100000;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Ruído de valor periódico; período em células. */
export function pnoise(x: number, y: number, period: number, seed = 0): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const m = (v: number) => ((v % period) + period) % period;
  const a = hash2(m(xi), m(yi), seed);
  const b = hash2(m(xi + 1), m(yi), seed);
  const c = hash2(m(xi), m(yi + 1), seed);
  const d = hash2(m(xi + 1), m(yi + 1), seed);
  const u = smooth(xf);
  const v = smooth(yf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function fbm(u: number, v: number, base: number, oct: number, seed = 0): number {
  let amp = 0.5;
  let f = base;
  let s = 0;
  let norm = 0;
  for (let i = 0; i < oct; i++) {
    s += amp * pnoise(u * f, v * f, f, seed + i * 17);
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  return s / norm;
}

export interface Texel {
  r: number;
  g: number;
  b: number;
  h: number; // altura 0..1
  rough: number; // 0..1
  a?: number;
}

export interface MapSet {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

export function buildMaps(size: number, strength: number, fn: (u: number, v: number) => Texel, alpha = false): MapSet {
  const n = size * size;
  const height = new Float32Array(n);
  const col = new Uint8ClampedArray(n * 4);
  const rgh = new Uint8ClampedArray(n * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const t = fn(x / size, y / size);
      const i = y * size + x;
      height[i] = t.h;
      col[i * 4] = t.r * 255;
      col[i * 4 + 1] = t.g * 255;
      col[i * 4 + 2] = t.b * 255;
      col[i * 4 + 3] = alpha ? clamp01(t.a ?? 1) * 255 : 255;
      const rv = clamp01(t.rough) * 255;
      rgh[i * 4] = 255;
      rgh[i * 4 + 1] = rv; // roughness no canal G
      rgh[i * 4 + 2] = 0;
      rgh[i * 4 + 3] = 255;
    }
  }
  const nrm = new Uint8ClampedArray(n * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const xl = (x - 1 + size) % size;
      const xr = (x + 1) % size;
      const yu = (y - 1 + size) % size;
      const yd = (y + 1) % size;
      const dx = (height[y * size + xr] - height[y * size + xl]) * strength;
      const dy = (height[yd * size + x] - height[yu * size + x]) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      nrm[i] = (-dx / len) * 127 + 128;
      nrm[i + 1] = (dy / len) * 127 + 128;
      nrm[i + 2] = (1 / len) * 127 + 128;
      nrm[i + 3] = 255;
    }
  }
  const mk = (data: Uint8ClampedArray, srgb: boolean) => {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d')!;
    ctx.putImageData(new ImageData(data as unknown as Uint8ClampedArray<ArrayBuffer>, size, size), 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  return { map: mk(col, true), normalMap: mk(nrm, false), roughnessMap: mk(rgh, false) };
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
function sstep(a: number, b: number, x: number): number {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

/** Cantaria em fiadas: blocos de pedra com junta rebaixada, pátina e musgo. */
export function ashlar(size: number, rows: number, tint: [number, number, number], seed = 1, moss = 0.35): MapSet {
  return buildMaps(size, 3.2, (u, v) => {
    const row = Math.floor(v * rows);
    const vf = v * rows - row;
    const perRow = 3 + Math.floor(hash2(row, 7, seed) * 2);
    const off = hash2(row, 3, seed);
    const uu = (u + off) * perRow;
    const bi = Math.floor(uu);
    const uf = uu - bi;
    const id = hash2(((bi % perRow) + perRow) % perRow, row, seed + 9);
    const aspect = rows / perRow;
    const ex = Math.min(uf, 1 - uf) / aspect;
    const ey = Math.min(vf, 1 - vf);
    const edge = Math.min(ex, ey);
    const joint = sstep(0.0, 0.07, edge);
    const grain = fbm(u, v, 8, 5, seed);
    const pit = fbm(u, v, 40, 3, seed + 5);
    const stain = fbm(u * 3, v * 0.6, 4, 4, seed + 11);
    let h = joint * (0.62 + 0.3 * id) + grain * 0.25 + pit * 0.1;
    const tone = 0.78 + 0.22 * id + (grain - 0.5) * 0.55 - (1 - joint) * 0.4;
    let r = tint[0] * tone;
    let g = tint[1] * tone;
    let b = tint[2] * tone;
    // escorridos escuros
    const dark = sstep(0.55, 0.8, stain) * 0.4;
    r *= 1 - dark;
    g *= 1 - dark;
    b *= 1 - dark * 0.85;
    // musgo nas juntas e zonas úmidas
    const m = sstep(0.52, 0.7, fbm(u, v, 5, 4, seed + 23)) * (1 - joint * 0.6) * moss;
    r = mix(r, 0.13, m);
    g = mix(g, 0.22, m);
    b = mix(b, 0.12, m);
    h += m * 0.05;
    const rough = 0.86 - dark * 0.25 - (1 - joint) * 0.1 + pit * 0.1;
    return { r, g, b, h, rough };
  });
}

/** Calçamento de paralelepípedo com poças localizadas. */
export function cobble(size: number, cells: number, seed = 2, wet = 0.5): MapSet {
  const pts: Array<[number, number, number]> = [];
  for (let j = 0; j < cells; j++)
    for (let i = 0; i < cells; i++) {
      pts.push([
        (i + 0.2 + 0.6 * hash2(i, j, seed)) / cells,
        (j + 0.2 + 0.6 * hash2(i, j, seed + 1)) / cells,
        hash2(i, j, seed + 2),
      ]);
    }
  return buildMaps(size, 4.0, (u, v) => {
    const ci = Math.floor(u * cells);
    const cj = Math.floor(v * cells);
    let f1 = 9;
    let f2 = 9;
    let id = 0;
    for (let dj = -1; dj <= 1; dj++)
      for (let di = -1; di <= 1; di++) {
        const ii = (ci + di + cells) % cells;
        const jj = (cj + dj + cells) % cells;
        const p = pts[jj * cells + ii];
        let dx = Math.abs(u - p[0]);
        let dy = Math.abs(v - p[1]);
        if (dx > 0.5) dx = 1 - dx;
        if (dy > 0.5) dy = 1 - dy;
        // pedras ligeiramente retangulares
        const d = Math.max(dx * 0.9, dy * 1.15) * 0.6 + Math.hypot(dx, dy) * 0.4;
        if (d < f1) {
          f2 = f1;
          f1 = d;
          id = p[2];
        } else if (d < f2) f2 = d;
      }
    const edge = (f2 - f1) * cells;
    const stone = sstep(0.02, 0.2, edge);
    const grain = fbm(u, v, 24, 4, seed + 3);
    const low = fbm(u, v, 3, 3, seed + 31);
    const h = stone * (0.6 + 0.25 * id) + grain * 0.12;
    const tone = 0.7 + 0.3 * id;
    let r = mix(0.07, 0.27 * tone + 0.04, stone);
    let g = mix(0.065, 0.25 * tone + 0.04, stone);
    let b = mix(0.07, 0.27 * tone + 0.05, stone);
    // algumas pedras avermelhadas ou esverdeadas: o chão não é cinza puro
    if (id > 0.86) {
      r *= 1.14;
      b *= 0.94;
    } else if (id < 0.1) {
      g *= 1.08;
    }
    r += (grain - 0.5) * 0.08;
    g += (grain - 0.5) * 0.08;
    b += (grain - 0.5) * 0.08;
    const puddle = sstep(0.5, 0.62, low) * wet;
    const wetJoint = (1 - stone) * wet;
    const w = Math.max(puddle, wetJoint * 0.8);
    const rough = mix(0.86 - 0.22 * wet + (grain - 0.5) * 0.25, 0.07, w);
    r *= 1 - w * 0.45;
    g *= 1 - w * 0.45;
    b *= 1 - w * 0.4;
    return { r, g, b, h: mix(h, 0.35, puddle * 0.85), rough };
  });
}

export function brick(size: number, rows: number, seed = 3): MapSet {
  return buildMaps(size, 3.0, (u, v) => {
    const row = Math.floor(v * rows);
    const vf = v * rows - row;
    const perRow = rows / 2.6;
    const uu = u * perRow + (row % 2) * 0.5;
    const bi = Math.floor(uu);
    const uf = uu - bi;
    const id = hash2(bi % Math.ceil(perRow), row, seed);
    const ex = Math.min(uf, 1 - uf) * 2.6;
    const ey = Math.min(vf, 1 - vf);
    const joint = sstep(0.03, 0.12, Math.min(ex, ey));
    const grain = fbm(u, v, 32, 4, seed + 1);
    const soot = sstep(0.45, 0.8, fbm(u * 2, v, 3, 4, seed + 4));
    const tone = 0.55 + 0.45 * id + (grain - 0.5) * 0.4;
    let r = mix(0.16, 0.42 * tone, joint);
    let g = mix(0.14, 0.2 * tone, joint);
    let b = mix(0.13, 0.15 * tone, joint);
    if (id > 0.85) {
      r *= 0.6;
      g *= 0.7;
      b *= 0.9;
    }
    r *= 1 - soot * 0.55;
    g *= 1 - soot * 0.55;
    b *= 1 - soot * 0.5;
    return { r, g, b, h: joint * (0.6 + 0.2 * id) + grain * 0.2, rough: 0.9 - soot * 0.2 };
  });
}

export function wood(size: number, planks: number, tint: [number, number, number], seed = 4): MapSet {
  return buildMaps(size, 2.0, (u, v) => {
    const pu = u * planks;
    const pi = Math.floor(pu);
    const pf = pu - pi;
    const id = hash2(pi, 1, seed);
    const gap = sstep(0.0, 0.04, Math.min(pf, 1 - pf));
    const g1 = fbm(u * 1.0 + id, v * 0.08, 48, 4, seed + pi);
    const g2 = fbm(u, v * 0.3, 96, 2, seed + 9);
    const grain = g1 * 0.7 + g2 * 0.3;
    const tone = (0.55 + 0.45 * id) * (0.6 + 0.8 * grain) * gap;
    return {
      r: tint[0] * tone,
      g: tint[1] * tone,
      b: tint[2] * tone,
      h: gap * 0.7 + grain * 0.3,
      rough: 0.45 + grain * 0.3,
    };
  });
}

export function slate(size: number, rows: number, seed = 5): MapSet {
  return buildMaps(size, 3.0, (u, v) => {
    const row = Math.floor(v * rows);
    const vf = v * rows - row;
    const per = rows * 1.2;
    const uu = u * per + (row % 2) * 0.5;
    const bi = Math.floor(uu);
    const uf = uu - bi;
    const id = hash2(bi % Math.ceil(per), row, seed);
    const ex = sstep(0.0, 0.08, Math.min(uf, 1 - uf));
    const lip = sstep(0.0, 0.2, vf);
    const grain = fbm(u, v, 24, 3, seed);
    const tone = (0.5 + 0.5 * id) * (0.75 + 0.5 * grain) * (0.6 + 0.4 * ex * lip);
    return { r: 0.13 * tone, g: 0.15 * tone, b: 0.2 * tone, h: (1 - vf) * 0.6 * ex + 0.2 * lip, rough: 0.5 + grain * 0.2 };
  });
}

export function ground(size: number, seed = 6, mossy = 0.6): MapSet {
  return buildMaps(size, 2.4, (u, v) => {
    const n1 = fbm(u, v, 4, 5, seed);
    const n2 = fbm(u, v, 32, 4, seed + 2);
    const m = sstep(0.42, 0.62, n1) * mossy;
    const leaf = sstep(0.72, 0.8, fbm(u, v, 64, 2, seed + 8));
    let r = mix(0.16, 0.1, m) + (n2 - 0.5) * 0.1;
    let g = mix(0.12, 0.2, m) + (n2 - 0.5) * 0.1;
    let b = mix(0.09, 0.08, m) + (n2 - 0.5) * 0.06;
    r = mix(r, 0.34, leaf * 0.7);
    g = mix(g, 0.16, leaf * 0.7);
    b = mix(b, 0.06, leaf * 0.7);
    const wetSpot = sstep(0.62, 0.72, fbm(u, v, 3, 3, seed + 40));
    return { r: r * (1 - wetSpot * 0.4), g: g * (1 - wetSpot * 0.4), b: b * (1 - wetSpot * 0.3), h: n2 * 0.6 + n1 * 0.4, rough: mix(0.95, 0.15, wetSpot) };
  });
}

export function bark(size: number, seed = 7): MapSet {
  return buildMaps(size, 4.0, (u, v) => {
    const ridges = Math.abs(fbm(u * 1.0, v * 0.15, 24, 4, seed) - 0.5) * 2;
    const n = fbm(u, v, 32, 3, seed + 3);
    const tone = 0.35 + ridges * 0.8 + (n - 0.5) * 0.3;
    const m = sstep(0.6, 0.75, fbm(u, v, 4, 3, seed + 6)) * 0.6;
    return { r: mix(0.17 * tone, 0.1, m), g: mix(0.13 * tone, 0.19, m), b: mix(0.1 * tone, 0.08, m), h: ridges, rough: 0.95 };
  });
}

export function fabric(size: number, tint: [number, number, number], seed = 8): MapSet {
  return buildMaps(size, 1.4, (u, v) => {
    const wx = 0.5 + 0.5 * Math.sin(u * Math.PI * 2 * 96);
    const wy = 0.5 + 0.5 * Math.sin(v * Math.PI * 2 * 96);
    const weave = wx * 0.5 + wy * 0.5;
    const n = fbm(u, v, 6, 4, seed);
    const tone = 0.7 + 0.25 * weave + (n - 0.5) * 0.5;
    return { r: tint[0] * tone, g: tint[1] * tone, b: tint[2] * tone, h: weave * 0.6 + n * 0.4, rough: 0.92 };
  });
}

export function plaster(size: number, tint: [number, number, number], seed = 9): MapSet {
  return buildMaps(size, 1.6, (u, v) => {
    const n = fbm(u, v, 6, 5, seed);
    const c = fbm(u, v, 48, 3, seed + 2);
    const stain = sstep(0.5, 0.8, fbm(u * 3, v * 0.7, 3, 4, seed + 5)) * 0.45;
    const tone = (0.75 + (n - 0.5) * 0.5 + (c - 0.5) * 0.15) * (1 - stain);
    return { r: tint[0] * tone, g: tint[1] * tone, b: tint[2] * tone, h: n * 0.5 + c * 0.5, rough: 0.9 };
  });
}

export function metal(size: number, tint: [number, number, number], seed = 10): MapSet {
  return buildMaps(size, 1.2, (u, v) => {
    const n = fbm(u, v, 12, 5, seed);
    const pat = sstep(0.55, 0.75, fbm(u, v, 5, 4, seed + 4));
    const tone = 0.8 + (n - 0.5) * 0.5;
    // pátina esverdeada do bronze envelhecido
    return {
      r: mix(tint[0] * tone, 0.16, pat * 0.7),
      g: mix(tint[1] * tone, 0.33, pat * 0.7),
      b: mix(tint[2] * tone, 0.27, pat * 0.7),
      h: n,
      rough: mix(0.32, 0.8, pat) + (n - 0.5) * 0.2,
    };
  });
}

/** Cartão de folhagem com alfa. */
export function leafCard(size: number, tint: [number, number, number], seed = 11): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);
  let s = seed;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return (s & 0xffff) / 0xffff;
  };
  for (let i = 0; i < 90; i++) {
    const x = size * (0.12 + 0.76 * rnd());
    const y = size * (0.12 + 0.76 * rnd());
    const d = Math.hypot(x - size / 2, y - size / 2) / (size / 2);
    if (d > 0.92) continue;
    const l = size * (0.05 + 0.06 * rnd());
    const a = rnd() * Math.PI * 2;
    const tone = 0.45 + rnd() * 0.75;
    ctx.fillStyle = `rgb(${Math.round(tint[0] * 255 * tone)},${Math.round(tint[1] * 255 * tone)},${Math.round(tint[2] * 255 * tone)})`;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.ellipse(0, 0, l, l * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Brilho radial para halos de lamparina e partículas. */
export function glowSprite(size = 128, inner = 'rgba(255,214,150,1)', outer = 'rgba(255,160,60,0)'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.25, inner.replace(/,1\)$/, ',0.45)'));
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Fumaça/névoa macia para criaturas e bruma baixa. */
export function smokeSprite(size = 128, seed = 3): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const d = Math.hypot(u - 0.5, v - 0.5) * 2;
      const n = fbm(u, v, 4, 4, seed);
      const a = clamp01((1 - d) * 1.4) * clamp01(n * 1.8 - 0.35);
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = a * a * 255;
    }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  return t;
}
