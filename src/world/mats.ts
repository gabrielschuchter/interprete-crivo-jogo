import * as THREE from 'three';
import * as T from './textures';
import { BRAND, WORLD, srgb } from './palette';
import { pbrSet } from '../core/assets';

/** Materiais PBR compartilhados. UV em metros; repeat = 1 / lado do ladrilho. */
const cache = new Map<string, THREE.Material>();

function pbr(key: string, maps: () => T.MapSet, tile: number, opts: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial {
  let m = cache.get(key) as THREE.MeshStandardMaterial | undefined;
  if (!m) {
    const s = maps();
    for (const t of [s.map, s.normalMap, s.roughnessMap]) t.repeat.set(1 / tile, 1 / tile);
    m = new THREE.MeshStandardMaterial({ map: s.map, normalMap: s.normalMap, roughnessMap: s.roughnessMap, roughness: 1, metalness: 0, ...opts });
    m.name = key;
    cache.set(key, m);
  }
  return m;
}

/** Material de escaneamento PBR (Poly Haven, CC0). UV em metros; `tile` = lado do ladrilho em metros. */
function scan(key: string, set: string, tile: number, opts: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial {
  let m = cache.get(key) as THREE.MeshStandardMaterial | undefined;
  if (!m) {
    const t = pbrSet(set, 1 / tile);
    m = new THREE.MeshStandardMaterial({ ...t, roughness: 1, metalness: 0, ...opts });
    m.name = key;
    cache.set(key, m);
  }
  return m;
}

export const M = {
  get stone() {
    return scan('stone', 'fort_wall', 3.2, { color: 0xc9bfb2 });
  },
  get stoneDark() {
    return scan('stoneDark', 'fort_wall', 2.8, { color: 0x77707a });
  },
  get stoneWarm() {
    return scan('stoneWarm', 'fort_wall', 2.6, { color: 0xe0c8a8 });
  },
  get carved() {
    return scan('carved', 'fort_plaster', 2.2, { color: 0xb8ada0, roughness: 0.9 });
  },
  get cobble() {
    return scan('cobble', 'cobblestone_embedded_asphalt', 2.4, { envMapIntensity: 1.7, roughness: 0.62, color: 0xa8a4a8 });
  },
  get cobbleDry() {
    return scan('cobbleDry', 'cobblestone_embedded_asphalt', 2.4);
  },
  get flag() {
    return scan('flag', 'fort_wall', 4.2, { color: 0x8c8486, envMapIntensity: 1.3, roughness: 0.8 });
  },
  get brick() {
    return pbr('brick', () => T.brick(1024, 22, 3), 3.2);
  },
  get wood() {
    return pbr('wood', () => T.wood(512, 5, [0.36, 0.2, 0.12], 4), 1.6, { envMapIntensity: 0.7 });
  },
  get woodDark() {
    return pbr('woodDark', () => T.wood(512, 4, [0.2, 0.11, 0.07], 14), 1.4, { envMapIntensity: 0.9 });
  },
  get slate() {
    return pbr('slate', () => T.slate(512, 10, 5), 3, { envMapIntensity: 1.2 });
  },
  get ground() {
    return scan('ground', 'bark_debris_01', 3, { color: 0x9a9488 });
  },
  get rock() {
    return scan('rock', 'coast_rocks_01', 4, { color: 0x8a8680 });
  },
  get road() {
    return scan('road', 'road_damaged', 3, { color: 0x9a9690 });
  },
  get bark() {
    return pbr('bark', () => T.bark(512, 7), 1.6);
  },
  get bronze() {
    return pbr('bronze', () => T.metal(512, [0.62, 0.42, 0.2], 10), 1.2, { metalness: 0.85, envMapIntensity: 1.4 });
  },
  get iron() {
    return pbr('iron', () => T.metal(256, [0.12, 0.12, 0.13], 15), 1, { metalness: 0.7 });
  },
  get wine() {
    return pbr('wine', () => T.fabric(512, srgb(BRAND.darkAmaranth), 8), 0.8, { side: THREE.DoubleSide });
  },
  get clothDark() {
    return pbr('clothDark', () => T.fabric(512, [0.1, 0.09, 0.11], 18), 0.5);
  },
  get parchment() {
    return pbr('parchment', () => T.plaster(256, srgb(WORLD.ivory), 28), 0.8);
  },
  get plaster() {
    return scan('plaster', 'fort_plaster', 3, { color: 0x9a8e82 });
  },
  get books() {
    return pbr('books', () => bookSpines(), 2.4, { envMapIntensity: 0.6 });
  },
  get water() {
    let m = cache.get('water') as THREE.MeshStandardMaterial | undefined;
    if (!m) {
      m = new THREE.MeshStandardMaterial({ color: 0x0c1418, roughness: 0.04, metalness: 0.2, envMapIntensity: 2.2, transparent: true, opacity: 0.92 });
      cache.set('water', m);
    }
    return m;
  },
  get glassAmber() {
    let m = cache.get('glassAmber') as THREE.MeshStandardMaterial | undefined;
    if (!m) {
      const t = windowTexture();
      m = new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 1.7, roughness: 0.4, color: 0x221408 });
      cache.set('glassAmber', m);
    }
    return m;
  },
  get glassDark() {
    let m = cache.get('glassDark') as THREE.MeshStandardMaterial | undefined;
    if (!m) {
      m = new THREE.MeshStandardMaterial({ color: 0x0a1016, roughness: 0.08, metalness: 0.4, envMapIntensity: 1.8 });
      cache.set('glassDark', m);
    }
    return m;
  },
  get lampGlow() {
    let m = cache.get('lampGlow') as THREE.MeshBasicMaterial | undefined;
    if (!m) {
      m = new THREE.MeshBasicMaterial({ color: new THREE.Color(WORLD.amberHot).multiplyScalar(3.2) });
      cache.set('lampGlow', m);
    }
    return m;
  },
  get leaves() {
    let m = cache.get('leaves') as THREE.MeshStandardMaterial | undefined;
    if (!m) {
      m = new THREE.MeshStandardMaterial({ map: T.leafCard(256, [0.16, 0.34, 0.17], 11), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 });
      cache.set('leaves', m);
    }
    return m;
  },
  get leavesAutumn() {
    let m = cache.get('leavesAutumn') as THREE.MeshStandardMaterial | undefined;
    if (!m) {
      m = new THREE.MeshStandardMaterial({ map: T.leafCard(256, [0.42, 0.14, 0.12], 13), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 });
      cache.set('leavesAutumn', m);
    }
    return m;
  },
  get ivy() {
    let m = cache.get('ivy') as THREE.MeshStandardMaterial | undefined;
    if (!m) {
      m = new THREE.MeshStandardMaterial({ map: T.leafCard(256, [0.1, 0.3, 0.14], 19), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.7 });
      cache.set('ivy', m);
    }
    return m;
  },
};

/** Vitral âmbar com chumbo: abstrato, sem símbolo religioso ou de terceiros. */
function windowTexture(): THREE.CanvasTexture {
  const w = 256;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#ffcf87');
  grad.addColorStop(0.55, '#f0a04a');
  grad.addColorStop(1, '#b8651f');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  let s = 77;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return (s & 0xffff) / 0xffff;
  };
  const cols = 4;
  const rows = 10;
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const v = rnd();
      g.fillStyle = v > 0.9 ? 'rgba(140,21,53,0.55)' : v > 0.8 ? 'rgba(30,90,70,0.4)' : `rgba(${v > 0.5 ? 255 : 60},${v > 0.5 ? 240 : 30},${v > 0.5 ? 200 : 0},${0.08 + rnd() * 0.22})`;
      g.fillRect((i * w) / cols, (j * h) / rows, w / cols, h / rows);
    }
  g.strokeStyle = '#120a06';
  g.lineWidth = 5;
  for (let i = 0; i <= cols; i++) {
    g.beginPath();
    g.moveTo((i * w) / cols, 0);
    g.lineTo((i * w) / cols, h);
    g.stroke();
  }
  g.lineWidth = 3;
  for (let j = 0; j <= rows; j++) {
    g.beginPath();
    g.moveTo(0, (j * h) / rows);
    g.lineTo(w, (j * h) / rows);
    g.stroke();
  }
  g.lineWidth = 9;
  g.beginPath();
  g.moveTo(w / 2, 0);
  g.lineTo(w / 2, h);
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Lombadas de livros em couro, para estantes. */
function bookSpines(): T.MapSet {
  const hues: Array<[number, number, number]> = [
    [0.33, 0.07, 0.11],
    [0.12, 0.2, 0.16],
    [0.22, 0.14, 0.08],
    [0.1, 0.13, 0.22],
    [0.36, 0.26, 0.14],
    [0.16, 0.06, 0.14],
  ];
  const shelves = 4;
  return T.buildMaps(512, 3.0, (u, v) => {
    const sv = v * shelves;
    const si = Math.floor(sv);
    const sf = sv - si;
    if (sf < 0.1) return { r: 0.1, g: 0.06, b: 0.04, h: 1, rough: 0.5 };
    const bu = u * 26;
    const bi = Math.floor(bu);
    const bf = bu - bi;
    const id = Math.abs(Math.sin(bi * 12.9898 + si * 78.233) * 43758.5453) % 1;
    const tall = 0.72 + 0.26 * ((id * 7.3) % 1);
    if ((sf - 0.1) / 0.9 > tall) return { r: 0.02, g: 0.015, b: 0.015, h: 0, rough: 1 };
    const hue = hues[Math.floor(id * hues.length) % hues.length];
    const edge = Math.min(bf, 1 - bf);
    const round = Math.sqrt(Math.min(1, edge * 4));
    const band = Math.abs(((sf - 0.1) / 0.9 / tall) * 5 - Math.round(((sf - 0.1) / 0.9 / tall) * 5)) < 0.05 ? 1 : 0;
    const gold = band * (id > 0.4 ? 1 : 0);
    return {
      r: hue[0] * (0.6 + 0.5 * round) + gold * 0.4,
      g: hue[1] * (0.6 + 0.5 * round) + gold * 0.3,
      b: hue[2] * (0.6 + 0.5 * round) + gold * 0.1,
      h: 0.3 + round * 0.6,
      rough: 0.55 - gold * 0.25,
    };
  });
}
