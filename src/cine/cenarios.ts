/**
 * Cenários da abertura, montados como cenário de teatro: só existe o que entra em quadro, com fundo pintado onde
 * a câmera não chega. Todos usam os materiais do jogo (M) e materiais novos do mesmo tipo (MeshStandard com mapa
 * normal de tecido, MeshBasic), para não pedir programa de shader novo no meio da cena.
 *
 * Convenções do jogo: x é leste, z é sul, figuras olham para +z.
 */
import * as THREE from 'three';
import { RegionBuilder, trs } from '../world/builder';
import { M } from '../world/mats';
import { building, candle, gableRoof, halo, table } from '../world/kit';
import type { EnvPreset } from '../core/engine';
import type { Cenario } from './cine';

// ---------- materiais próprios (cache) ----------
const cache = new Map<string, THREE.Material>();
function pano(nome: string, cor: number): THREE.MeshStandardMaterial {
  let m = cache.get(nome) as THREE.MeshStandardMaterial | undefined;
  if (!m) {
    const base = M.clothDark;
    m = new THREE.MeshStandardMaterial({ color: cor, roughness: 0.95, normalMap: base.normalMap, normalScale: new THREE.Vector2(0.7, 0.7) });
    cache.set(nome, m);
  }
  return m;
}
function liso(nome: string, cor: number, rough = 0.85): THREE.MeshStandardMaterial {
  let m = cache.get(nome) as THREE.MeshStandardMaterial | undefined;
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color: cor, roughness: rough });
    cache.set(nome, m);
  }
  return m;
}
function basico(nome: string, cor: number): THREE.MeshBasicMaterial {
  let m = cache.get(nome) as THREE.MeshBasicMaterial | undefined;
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color: cor, fog: false });
    cache.set(nome, m);
  }
  return m;
}

/** Gravura do Menino da Janela: entalhe em linhas paralelas, desenhado em canvas (autoral). */
let gravuraTex: THREE.CanvasTexture | null = null;
export function gravura(): THREE.CanvasTexture {
  if (gravuraTex) return gravuraTex;
  const W = 256;
  const H = 320;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  g.fillStyle = '#d9c9a3';
  g.fillRect(0, 0, W, H);
  g.strokeStyle = '#2a1d14';
  g.lineWidth = 1.4;
  // raios da janela
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    g.beginPath();
    g.moveTo(W / 2, 115);
    g.lineTo(W / 2 + Math.cos(a) * 300, 115 + Math.sin(a) * 300);
    g.stroke();
  }
  // moldura da janela
  g.fillStyle = '#d9c9a3';
  g.fillRect(70, 40, 116, 150);
  g.lineWidth = 6;
  g.strokeRect(70, 40, 116, 150);
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(128, 40);
  g.lineTo(128, 190);
  g.moveTo(70, 112);
  g.lineTo(186, 112);
  g.stroke();
  // menino de pé no parapeito, em hachura
  g.fillStyle = '#2a1d14';
  g.beginPath();
  g.arc(128, 96, 11, 0, Math.PI * 2);
  g.fill();
  g.fillRect(118, 107, 20, 46);
  g.fillRect(119, 152, 7, 34);
  g.fillRect(130, 152, 7, 34);
  g.fillRect(104, 110, 14, 6);
  g.fillRect(138, 110, 14, 6);
  // parapeito e parede em hachura cruzada
  g.lineWidth = 1;
  for (let y = 196; y < H - 34; y += 4) {
    g.beginPath();
    g.moveTo(20, y);
    g.lineTo(W - 20, y + 6);
    g.stroke();
  }
  // faixa do título, sem texto legível na resolução de época
  g.fillRect(40, H - 26, W - 80, 3);
  g.fillRect(60, H - 18, W - 120, 2);
  gravuraTex = new THREE.CanvasTexture(c);
  gravuraTex.colorSpace = THREE.SRGBColorSpace;
  gravuraTex.magFilter = THREE.LinearFilter;
  return gravuraTex;
}
function gravuraMat(): THREE.MeshStandardMaterial {
  let m = cache.get('gravura') as THREE.MeshStandardMaterial | undefined;
  if (!m) {
    m = new THREE.MeshStandardMaterial({ map: gravura(), roughness: 0.95, side: THREE.DoubleSide });
    cache.set('gravura', m);
  }
  return m;
}

// ---------- atmosferas ----------
const base: Omit<EnvPreset, 'fog' | 'fogDensity' | 'hemiSky' | 'hemiGround' | 'hemiIntensity' | 'sun' | 'sunIntensity' | 'exposure'> = {
  skyTop: 0x0c1220, skyHorizon: 0x2a3446, cloud: 0x4a566c, cloudAmount: 0.8,
  sunDir: [0.4, 0.7, 0.5], rain: 0, bloom: 0.6,
  tintShadow: [0.95, 0.98, 1.08], tintLight: [1.07, 1.0, 0.9], envIntensity: 0.5, moon: false,
};
export const ENV_CENA: Record<string, EnvPreset> = {
  /** enfermaria de noite: velas e pouco mais */
  enfermariaNoite: { ...base, fog: 0x0b0a0c, fogDensity: 0.03, hemiSky: 0x5a6a8a, hemiGround: 0x1a1210, hemiIntensity: 0.45, sun: 0x8090b0, sunIntensity: 0.16, exposure: 1.3, interior: true, envIntensity: 0.25 },
  /** a manhã da sétima noite: luz cinza entra pelas frestas */
  enfermariaManha: { ...base, fog: 0x2a2a30, fogDensity: 0.02, hemiSky: 0x8a94a8, hemiGround: 0x2a2018, hemiIntensity: 0.55, sun: 0xd8d0c0, sunIntensity: 0.6, sunDir: [0.9, 0.35, 0.2], exposure: 1.0, interior: true, envIntensity: 0.35 },
  vilaNoite: { ...base, fog: 0x141a24, fogDensity: 0.03, hemiSky: 0x5d6f90, hemiGround: 0x1a1414, hemiIntensity: 0.62, sun: 0x8a9cc0, sunIntensity: 0.7, rain: 1, exposure: 1.25, moon: true },
  vilaDia: { ...base, skyTop: 0x5a6878, skyHorizon: 0xa8a8a0, cloud: 0xb0b0b0, cloudAmount: 0.9, fog: 0x7c8088, fogDensity: 0.012, hemiSky: 0xb0b8c8, hemiGround: 0x3a3028, hemiIntensity: 0.9, sun: 0xe8dcc8, sunIntensity: 1.4, sunDir: [-0.5, 0.6, 0.4], exposure: 0.95, envIntensity: 0.8 },
  casaNoite: { ...base, fog: 0x0c0a0a, fogDensity: 0.035, hemiSky: 0x4a5670, hemiGround: 0x1a120e, hemiIntensity: 0.34, sun: 0x8090b0, sunIntensity: 0.1, exposure: 1.3, interior: true, envIntensity: 0.2 },
  casaDia: { ...base, fog: 0x3a3634, fogDensity: 0.018, hemiSky: 0x9aa2b0, hemiGround: 0x30261c, hemiIntensity: 0.7, sun: 0xd8d4c8, sunIntensity: 0.9, sunDir: [0.7, 0.4, 0.5], exposure: 1.0, interior: true, envIntensity: 0.4 },
  serra: { ...base, skyTop: 0x3a4658, skyHorizon: 0x9a9a98, cloud: 0x8a8c90, cloudAmount: 0.95, fog: 0x6c727c, fogDensity: 0.016, hemiSky: 0xa0a8b8, hemiGround: 0x2c2a22, hemiIntensity: 0.8, sun: 0xd8d0c0, sunIntensity: 1.1, sunDir: [0.3, 0.5, -0.8], exposure: 0.95, envIntensity: 0.7 },
  /** enfermaria da Academia no fim da tarde: cinza frio nas janelas, velas no corredor */
  enfermariaTarde: { ...base, fog: 0x1a1a20, fogDensity: 0.02, hemiSky: 0x7a8298, hemiGround: 0x221a14, hemiIntensity: 0.55, sun: 0xb0b4c4, sunIntensity: 0.45, sunDir: [0.2, 0.5, 0.85], exposure: 1.1, interior: true, envIntensity: 0.3 },
  /** salões da Academia (refeitório, anfiteatro) à luz de velas, com o resto do dia nas janelas */
  salaoTarde: { ...base, fog: 0x140e0c, fogDensity: 0.022, hemiSky: 0x6a5a50, hemiGround: 0x1a120c, hemiIntensity: 0.5, sun: 0x9098b0, sunIntensity: 0.35, sunDir: [0.1, 0.5, -0.85], exposure: 1.15, interior: true, envIntensity: 0.3 },
  oficina: { ...base, fog: 0x100c0a, fogDensity: 0.03, hemiSky: 0x6a5a48, hemiGround: 0x1a120c, hemiIntensity: 0.4, sun: 0xffd0a0, sunIntensity: 0.5, exposure: 1.1, interior: true, envIntensity: 0.3 },
};

// ---------- peças ----------
/** cama de enfermaria de vila: pés de madeira, colchão, lençol; comprimento em z, cabeceira em -z */
function cama(b: RegionBuilder, x: number, z: number, ocupada: boolean, seed: number, skin = 0x9a7a62): void {
  const W = 0.86;
  const L = 1.9;
  b.box(M.woodDark, W + 0.06, 0.08, L + 0.06, x, 0.36, z);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(M.woodDark, 0.07, 0.42, 0.07, x + sx * W * 0.47, 0, z + sz * L * 0.48);
  b.box(M.woodDark, W + 0.06, 0.5, 0.06, x, 0.36, z - L / 2 - 0.03);
  b.box(pano('colchao', 0x6f6150), W, 0.14, L, x, 0.44, z);
  b.box(pano('travesseiro', 0x9a8c74), W * 0.7, 0.1, 0.34, x, 0.58, z - L / 2 + 0.24);
  const cobertor = seed % 3 === 0 ? pano('cobertorVinho', 0x3d1420) : seed % 3 === 1 ? pano('cobertorCinza', 0x3a3a40) : pano('cobertorTerra', 0x4a3424);
  if (ocupada) {
    // volume de criança embaixo do cobertor, cabeça no travesseiro
    const g = new THREE.CapsuleGeometry(0.2, 0.9, 3, 8);
    b.add(g, cobertor, trs(x + Math.sin(seed) * 0.05, 0.62, z + 0.18, 0, Math.PI / 2, 0, 1.25, 1, 0.55));
    b.add(new THREE.SphereGeometry(0.11, 8, 6), liso('pele' + skin, skin, 0.7), trs(x, 0.66, z - L / 2 + 0.3));
    b.add(new THREE.SphereGeometry(0.115, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), liso('cabelo', 0x1e1410), trs(x, 0.68, z - L / 2 + 0.28, 0, -0.6));
  } else b.box(cobertor, W + 0.02, 0.05, L * 0.6, x, 0.58, z + L * 0.18);
}

/** banquinho com vela */
function banco(b: RegionBuilder, x: number, z: number, vela: boolean, luz: boolean): void {
  b.box(M.wood, 0.34, 0.04, 0.34, x, 0.42, z);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(M.wood, 0.04, 0.42, 0.04, x + sx * 0.13, 0, z + sz * 0.13);
  if (vela) candle(b, x, 0.46, z, luz);
}

/** janela de madeira com duas folhas que abrem (dinâmicas); normal para +z local. Devolve as folhas e o fundo. */
function janela(b: RegionBuilder, x: number, y: number, z: number, rot: number, w: number, h: number, fora: THREE.Material): { esq: THREE.Object3D; dir: THREE.Object3D; luz: THREE.Object3D } {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const at = (lx: number, lz: number): [number, number] => [x + lx * c + lz * s, z - lx * s + lz * c];
  // batentes e parapeito
  const f = 0.09;
  for (const sx of [-1, 1]) {
    const [px, pz] = at((sx * (w + f)) / 2, 0);
    b.box(M.woodDark, f, h + f * 2, 0.22, px, y - f, pz, rot);
  }
  b.box(M.woodDark, w + f * 2, f, 0.22, ...pos3(at(0, 0), y + h), rot);
  const [px, pz] = at(0, 0.06);
  b.box(M.woodDark, w + 0.4, 0.07, 0.38, px, y - 0.07, pz, rot);
  // lá fora: um cartão que muda de cor (noite, madrugada, luz)
  const fundo = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.2, h + 0.2), fora);
  const [fx, fz] = at(0, -0.3);
  fundo.position.set(fx, y + h / 2, fz);
  fundo.rotation.y = rot;
  b.dynamic(fundo);
  const folha = (lado: 1 | -1): THREE.Object3D => {
    const piv = new THREE.Group();
    const [hx, hz] = at((lado * w) / 2, 0.02);
    piv.position.set(hx, y, hz);
    piv.rotation.y = rot;
    const g = new THREE.Group();
    const tab = new THREE.Mesh(new THREE.BoxGeometry(w / 2, h, 0.045), M.wood);
    tab.position.set((-lado * w) / 4, h / 2, 0);
    tab.castShadow = true;
    g.add(tab);
    // travessas e tranca
    for (const yy of [0.18, 0.5, 0.82]) {
      const tr = new THREE.Mesh(new THREE.BoxGeometry(w / 2 - 0.04, 0.06, 0.06), M.woodDark);
      tr.position.set((-lado * w) / 4, h * yy, 0.03);
      g.add(tr);
    }
    piv.add(g);
    b.dynamic(piv);
    return piv;
  };
  return { esq: folha(-1), dir: folha(1), luz: fundo };
}
function pos3(p: [number, number], y: number): [number, number, number] {
  return [p[0], y, p[1]];
}

/** pote de barro com tampa de pano */
function pote(b: RegionBuilder, x: number, y: number, z: number): void {
  b.add(new THREE.CylinderGeometry(0.06, 0.05, 0.12, 8), liso('barro', 0x7a4a2c, 0.9), trs(x, y + 0.06, z));
  b.add(new THREE.CylinderGeometry(0.065, 0.065, 0.02, 8), pano('panoPote', 0x8f7c5e), trs(x, y + 0.125, z));
}

function paredes(b: RegionBuilder, x0: number, x1: number, z0: number, z1: number, h: number, mat: THREE.Material, piso: THREE.Material, teto: THREE.Material | null, abrir: Array<{ lado: 'n' | 's' | 'l' | 'o'; de: number; ate: number; y0: number; y1: number }> = []): void {
  b.box(piso, x1 - x0, 0.1, z1 - z0, (x0 + x1) / 2, -0.1, (z0 + z1) / 2);
  if (teto) b.box(teto, x1 - x0, 0.12, z1 - z0, (x0 + x1) / 2, h, (z0 + z1) / 2);
  const T = 0.25;
  const parede = (lado: 'n' | 's' | 'l' | 'o') => {
    const horiz = lado === 'n' || lado === 's';
    const a = horiz ? x0 : z0;
    const bb = horiz ? x1 : z1;
    const furos = abrir.filter((o) => o.lado === lado).sort((p, q) => p.de - q.de);
    let cur = a;
    const peca = (u0: number, u1: number, y0: number, y1: number) => {
      if (u1 - u0 < 0.01 || y1 - y0 < 0.01) return;
      const mid = (u0 + u1) / 2;
      if (horiz) b.box(mat, u1 - u0, y1 - y0, T, mid, y0, lado === 'n' ? z0 - T / 2 : z1 + T / 2);
      else b.box(mat, T, y1 - y0, u1 - u0, lado === 'o' ? x0 - T / 2 : x1 + T / 2, y0, mid);
    };
    for (const f of furos) {
      peca(cur, f.de, 0, h);
      peca(f.de, f.ate, 0, f.y0);
      peca(f.de, f.ate, f.y1, h);
      cur = f.ate;
    }
    peca(cur, bb, 0, h);
  };
  for (const l of ['n', 's', 'l', 'o'] as const) parede(l);
}

// ---------- 1. Enfermaria de Remanso ----------
/**
 * Sala de escola de vila, 18 por 9 m (x de -9 a 9, z de -4,5 a 4,5), 31 camas em três fileiras. A cama doze
 * fica na fileira sul, a 3,6 m; a treze ao lado, a 2,2 m. A janela da manhã está na parede leste, em z = 3,4.
 * O armário dos nove potes fica no canto nordeste; a mesa do moço que anota, no canto noroeste; a porta, na parede
 * norte, perto do leste.
 */
export const ENF = {
  cama12: [3.6, 3.15] as [number, number],
  cama13: [2.2, 3.15] as [number, number],
  janela: [8.86, 3.4] as [number, number],
  armario: [8.3, -3.0] as [number, number],
  mesa: [-7.6, -3.6] as [number, number],
  porta: [6.2, -4.5] as [number, number],
  bacia: [2.9, 2.45] as [number, number],
  /** caminho do trecho jogável: do chão ao lado da doze até a janela, rente à parede sul */
  rastro: { x0: 4.45, x1: 8.3, z: 3.85 },
};
export function enfermaria(manha: boolean): Cenario {
  const b = new RegionBuilder();
  const fora = basico('foraJanela', manha ? 0x5a6070 : 0x0a0e18);
  paredes(b, -9, 9, -4.5, 4.5, 4.2, M.plaster, M.wood, M.woodDark, [
    { lado: 'l', de: ENF.janela[1] - 0.6, ate: ENF.janela[1] + 0.6, y0: 0.9, y1: 2.5 },
    { lado: 'n', de: ENF.porta[0] - 0.6, ate: ENF.porta[0] + 0.6, y0: 0, y1: 2.3 },
  ]);
  // vigas do teto e janelas altas tapadas por tábuas na parede norte
  for (let x = -8; x <= 8; x += 2) b.box(M.woodDark, 0.22, 0.3, 9, x, 3.9, 0);
  for (const x of [-6, -2, 2]) {
    b.box(M.woodDark, 1.0, 1.3, 0.1, x, 2.2, -4.42);
    for (let k = 0; k < 4; k++) b.box(M.wood, 1.1, 0.16, 0.12, x, 2.3 + k * 0.32, -4.36);
  }
  // lousa de escola que ninguém apagou
  b.box(liso('lousa', 0x1a2420, 0.9), 3.2, 1.3, 0.05, -2, 1.3, 4.43);
  // camas: fileira norte (1 a 11), do meio (14 a 24), sul (as nove restantes, com a doze e a treze)
  let seed = 3;
  const vazias = new Set([5, 19, 27]);
  const peles = [0xd1a487, 0xa48066, 0x7b5a47, 0x523525, 0xb08a6e];
  const numerar: Array<{ n: number; x: number; z: number; rot: number }> = [];
  for (let i = 0; i < 11; i++) numerar.push({ n: i + 1, x: -7.6 + i * 1.4, z: -3.15, rot: 0 });
  for (let i = 0; i < 11; i++) numerar.push({ n: 14 + i, x: -7.6 + i * 1.4, z: 0, rot: 0 });
  for (let i = 0; i < 9; i++) numerar.push({ n: i < 7 ? 25 + i : i === 7 ? 13 : 12, x: -7.6 + i * 1.4, z: 3.15, rot: Math.PI });
  for (const c of numerar) {
    seed++;
    // a doze e a treze recebem atores; as outras, volumes
    if (c.n === 12 || c.n === 13) cama(b, c.x, c.z, false, seed);
    else cama(b, c.x, c.z, !vazias.has(c.n), seed, peles[seed % peles.length]);
    if (c.n !== 12 && c.n !== 13) banco(b, c.x + 0.62, c.z + (c.z < 0 ? -0.6 : c.z > 1 ? 0.6 : -0.6), seed % 2 === 0, false);
  }
  // banco e bacia da doze
  banco(b, 2.9, 3.75, true, true);
  b.add(new THREE.CylinderGeometry(0.22, 0.16, 0.12, 12), liso('estanho', 0x6a6a6a, 0.5), trs(ENF.bacia[0], 0.46, ENF.bacia[1]));
  b.box(M.wood, 0.36, 0.04, 0.36, ENF.bacia[0], 0.42, ENF.bacia[1]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(M.wood, 0.04, 0.42, 0.04, ENF.bacia[0] + sx * 0.14, 0, ENF.bacia[1] + sz * 0.14);
  // armário improvisado: tábuas sobre caixotes, nove potes na prateleira do meio
  const [ax, az] = ENF.armario;
  b.box(M.woodDark, 0.5, 1.9, 1.6, ax, 0, az);
  for (const yy of [0.5, 1.0, 1.5]) b.box(M.wood, 0.56, 0.04, 1.64, ax - 0.04, yy, az);
  for (let i = 0; i < 9; i++) pote(b, ax - 0.12, 1.04, az - 0.68 + i * 0.17);
  b.box(pano('panos', 0x8f7c5e), 0.4, 0.2, 0.9, ax - 0.06, 0.54, az);
  // mesa do moço que anota: folha em colunas, tinteiro, vela
  const [mx, mz] = ENF.mesa;
  table(b, mx, mz, 0, 1.4, 0.7);
  b.box(M.parchment, 0.42, 0.005, 0.56, mx + 0.1, 0.92, mz + 0.02);
  b.add(new THREE.CylinderGeometry(0.03, 0.035, 0.06, 8), liso('tinta', 0x0a0a10, 0.3), trs(mx + 0.45, 0.95, mz - 0.15));
  candle(b, mx - 0.5, 0.92, mz - 0.1, true);
  b.box(M.wood, 0.45, 0.45, 0.45, mx + 0.05, 0, mz + 0.7);
  // velas acesas pelo corredor (o pool de seis luzes escolhe as mais próximas do alvo da câmera)
  for (const [x, z] of [[-6.9, -1.6], [-3.4, 1.6], [0.2, -1.6], [2.9, 1.6], [6.2, -1.6], [7.6, 1.8]] as Array<[number, number]>) {
    banco(b, x, z, true, true);
  }
  // luz fria de fora pela janela (madrugada) e luz quente do lado da doze
  b.lamp(ENF.janela[0] - 0.6, 1.8, ENF.janela[1], manha ? 0xc8d0e0 : 0x5a6a90, manha ? 0.7 : 0.25, 7, 0);
  // porta: folha entreaberta e o escuro do corredor
  b.box(basico('escuro', 0x020203), 1.2, 2.3, 0.05, ENF.porta[0], 0, ENF.porta[1] - 0.6);
  const j = janela(b, ENF.janela[0] + 0.12, 0.9, ENF.janela[1], -Math.PI / 2, 1.2, 1.6, fora);
  b.finalize();
  return { root: b.root, lamps: b.lamps, env: manha ? ENV_CENA.enfermariaManha : ENV_CENA.enfermariaNoite, h: { folhaEsq: j.esq, folhaDir: j.dir, fora: j.luz } };
}

// ---------- 2. Remanso por fora ----------
/** Rua de vila com a escola no fundo (x = 0, z = -10, frente para +z), casas baixas dos dois lados e a carroça. */
export function vila(dia: boolean): Cenario {
  const b = new RegionBuilder();
  b.box(M.cobble, 40, 0.1, 60, 0, -0.1, 0);
  // escola: casa comprida de pedra, janelas acesas fracas
  building(b, 0, -12, 0, 16, 5.2, 8, { floors: 1, bays: 5, lit: dia ? 0 : 0.85, windowW: 1.1, windowH: 2.4, gap: 1.4, seed: 4 });
  b.box(basico('portaEscola', dia ? 0x18120e : 0x3a2410), 1.6, 2.6, 0.05, 0, 0, -7.95);
  b.box(M.woodDark, 2.0, 0.2, 0.3, 0, 2.6, -7.9);
  // casas dos dois lados
  const casas: Array<[number, number, number, number]> = [
    [-11, -4, Math.PI / 2, 7], [-11, 5, Math.PI / 2, 6], [-11, 14, Math.PI / 2, 8],
    [11, -3, -Math.PI / 2, 6], [11, 6, -Math.PI / 2, 7], [11, 15, -Math.PI / 2, 6],
  ];
  let seed = 11;
  for (const [x, z, r, w] of casas) {
    building(b, x, z, r, w, 3.6 + (seed % 3) * 0.5, 5, { floors: 1, bays: 2, lit: dia ? 0 : 0.35, windowW: 0.9, windowH: 1.6, seed: seed++, mat: seed % 2 ? M.plaster : M.stoneWarm });
  }
  // sino da vila numa torrezinha de madeira
  b.box(M.woodDark, 1.4, 7, 1.4, 6.5, 0, -9);
  gableRoof(b, 6.5, 7, -9, 0, 1.4, 1.4, 1.2);
  b.add(new THREE.CylinderGeometry(0.22, 0.38, 0.5, 10, 1, true), M.bronze, trs(6.5, 6.2, -9));
  // carroça parada com lençóis estendidos
  carroca(b, -3.2, -4.5, 0.3, true);
  // lampião da porta da escola
  b.lamp(0, 3.1, -7.4, 0xffa850, dia ? 0 : 1.1, 12);
  b.lamp(-3, 2.6, -4, 0xffa850, dia ? 0 : 0.3, 8);
  // fundo pintado: morro escuro
  const morro = new THREE.Mesh(new THREE.PlaneGeometry(120, 30), basico('morro', dia ? 0x6a6e70 : 0x0a0e14));
  morro.position.set(0, 8, -40);
  b.dynamic(morro);
  if (!dia) {
    const hl = halo(3.2, 0xffb86a, 0.5);
    hl.position.set(0, 3.1, -7.3);
    b.dynamic(hl);
  }
  // banco dos romeiros na frente da clínica de Helena (casa leste do meio): usado de dia
  b.box(M.wood, 2.6, 0.08, 0.45, 8.0, 0.44, 6);
  for (const dz of [-1.1, 1.1]) b.box(M.wood, 0.08, 0.44, 0.4, 8.0, 0, 6 + dz);
  b.finalize();
  return { root: b.root, lamps: b.lamps, env: dia ? ENV_CENA.vilaDia : ENV_CENA.vilaNoite, h: {} };
}

/** carroça de duas rodas (parada) */
export function carroca(b: RegionBuilder, x: number, z: number, rot: number, lencois: boolean): void {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const at = (lx: number, lz: number): [number, number] => [x + lx * c + lz * s, z - lx * s + lz * c];
  b.box(M.wood, 1.5, 0.1, 2.6, x, 0.85, z, rot);
  for (const sx of [-1, 1]) {
    const [px, pz] = at(sx * 0.72, 0);
    b.box(M.woodDark, 0.06, 0.4, 2.6, px, 0.95, pz, rot);
    const [wx, wz] = at(sx * 0.86, 0.2);
    b.add(new THREE.CylinderGeometry(0.6, 0.6, 0.08, 14), M.woodDark, trs(wx, 0.6, wz, rot, 0, Math.PI / 2));
  }
  const [vx, vz] = at(0, 1.9);
  b.box(M.woodDark, 0.08, 0.08, 1.6, vx, 0.7, vz, rot);
  if (lencois) for (let k = 0; k < 3; k++) {
    const [px, pz] = at(-0.4 + k * 0.4, -0.2);
    b.box(pano('lencol', 0xb8ac94), 0.36, 0.06, 2.2, px, 0.95 + k * 0.06, pz, rot);
  }
}

// ---------- 3. Casa de Helena (cozinha e quarto) ----------
/**
 * Cozinha a oeste (x de -6 a 0) com a estante e a porta dos fundos na parede norte; quarto a leste (x de 0,3 a 5)
 * com a cama e a janela na parede leste, em z = 0. O mesmo quarto serve à infância e aos vinte anos: `adulto`
 * troca a cama de criança pela mesa com a carta e a mala.
 */
export const CASA = {
  porta: [-3.2, -3] as [number, number],
  estante: [-5.6, -1.2] as [number, number],
  janela: [4.95, 0.2] as [number, number],
  mesa: [3.6, -2.2] as [number, number],
  cama: [2.0, 1.6] as [number, number],
  mala: [2.1, 1.5] as [number, number],
};
export function casa(dia: boolean, adulto: boolean): Cenario {
  const b = new RegionBuilder();
  const fora = basico('foraCasa', dia ? 0x8a8e94 : 0x05070c);
  paredes(b, -6, 0, -3, 3, 2.9, M.plaster, M.woodDark, M.woodDark, [{ lado: 'n', de: CASA.porta[0] - 0.5, ate: CASA.porta[0] + 0.5, y0: 0, y1: 2.1 }]);
  paredes(b, 0.3, 5, -3, 3, 2.9, M.plaster, M.wood, M.woodDark, [{ lado: 'l', de: CASA.janela[1] - 0.55, ate: CASA.janela[1] + 0.55, y0: 0.95, y1: 2.35 }]);
  // cozinha: fogão de lenha, mesa, estante com potes e a folha que vai para cima dela
  b.box(M.stoneDark, 1.4, 0.9, 0.8, -1.0, 0, -2.5);
  b.box(M.iron, 1.2, 0.05, 0.6, -1.0, 0.9, -2.5);
  table(b, -2.6, 0.6, 0, 1.6, 0.9);
  for (const dx of [-0.5, 0.5]) b.box(M.wood, 0.4, 0.45, 0.4, -2.6 + dx, 0, 1.5);
  const [ex, ez] = CASA.estante;
  b.box(M.woodDark, 0.4, 2.2, 1.6, ex, 0, ez);
  for (const yy of [0.6, 1.1, 1.6, 2.2]) b.box(M.wood, 0.44, 0.04, 1.64, ex + 0.02, yy, ez);
  for (let i = 0; i < 5; i++) pote(b, ex + 0.05, 1.12, ez - 0.6 + i * 0.3);
  b.box(M.books, 0.25, 0.3, 0.8, ex + 0.05, 1.62, ez - 0.2);
  // porta dos fundos (folha dinâmica, abre para dentro)
  const piv = new THREE.Group();
  piv.position.set(CASA.porta[0] - 0.5, 0, CASA.porta[1] + 0.06);
  const folha = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.1, 0.06), M.wood);
  folha.position.set(0.5, 1.05, 0);
  folha.castShadow = true;
  piv.add(folha);
  b.dynamic(piv);
  // lá fora da porta: escuro ou quintal cinza
  b.box(basico('foraPorta', dia ? 0x6a6c6a : 0x020203), 1.2, 2.3, 0.05, CASA.porta[0], 0, CASA.porta[1] - 0.8);
  // quarto
  if (!adulto) {
    b.box(M.woodDark, 0.9, 0.36, 1.8, CASA.cama[0], 0, CASA.cama[1]);
    b.box(pano('colchao', 0x6f6150), 0.84, 0.14, 1.74, CASA.cama[0], 0.36, CASA.cama[1]);
    b.box(pano('cobertorVinho', 0x3d1420), 0.86, 0.06, 1.0, CASA.cama[0], 0.5, CASA.cama[1] + 0.35);
  } else {
    b.box(M.woodDark, 0.9, 0.42, 1.9, CASA.cama[0], 0, CASA.cama[1]);
    b.box(pano('colchaoAdulto', 0x5a4c3e), 0.84, 0.14, 1.84, CASA.cama[0], 0.42, CASA.cama[1]);
    // mala aberta em cima da cama
    b.box(liso('couro', 0x3a2214, 0.6), 0.7, 0.22, 0.45, CASA.mala[0], 0.56, CASA.mala[1]);
    b.box(pano('roupaDobrada', 0x2a2630), 0.55, 0.12, 0.34, CASA.mala[0], 0.66, CASA.mala[1]);
  }
  table(b, CASA.mesa[0], CASA.mesa[1], 0, 1.2, 0.6);
  b.box(M.wood, 0.4, 0.45, 0.4, CASA.mesa[0], 0, CASA.mesa[1] + 0.6);
  if (adulto) {
    // carta de admissão aberta, com selo vinho
    b.box(M.parchment, 0.3, 0.004, 0.4, CASA.mesa[0] - 0.1, 0.92, CASA.mesa[1]);
    b.add(new THREE.CylinderGeometry(0.03, 0.03, 0.01, 10), liso('lacre', 0x6e0f29, 0.5), trs(CASA.mesa[0] - 0.05, 0.93, CASA.mesa[1] + 0.1));
  }
  candle(b, CASA.mesa[0] + 0.4, 0.88, CASA.mesa[1] - 0.1, !dia);
  candle(b, -2.4, 0.88, 0.5, !dia);
  b.lamp(CASA.janela[0] - 0.5, 1.7, CASA.janela[1], dia ? 0xc8ccd4 : 0x3a4660, dia ? 0.8 : 0.15, 7, 0);
  b.lamp(CASA.porta[0], 1.8, CASA.porta[1] - 0.4, 0xffa850, 0, 6, 0.15);
  const j = janela(b, CASA.janela[0] + 0.12, 0.95, CASA.janela[1], -Math.PI / 2, 1.1, 1.4, fora);
  b.finalize();
  return { root: b.root, lamps: b.lamps, env: dia ? ENV_CENA.casaDia : ENV_CENA.casaNoite, h: { porta: piv, folhaEsq: j.esq, folhaDir: j.dir, fora: j.luz } };
}

// ---------- 4. Oficina e feira (montagem da gravura) ----------
/** Bancada de entalhe, prensa, banca de feira e uma parede de cozinha, lado a lado em x (planos fechados). */
export function oficina(): Cenario {
  const b = new RegionBuilder();
  b.box(M.woodDark, 30, 0.1, 10, 0, -0.1, 0);
  b.box(M.plaster, 30, 3.2, 0.2, 0, 0, -2.2);
  // 1) bancada de entalhe em x = -9: bloco de madeira com a gravura meio feita
  table(b, -9, 0, 0, 1.6, 0.8);
  b.box(M.wood, 0.4, 0.06, 0.5, -9, 0.87, 0);
  const g1 = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.45), gravuraMat());
  g1.rotation.x = -Math.PI / 2;
  g1.position.set(-9, 0.935, 0);
  b.dynamic(g1);
  candle(b, -9.6, 0.87, -0.2, true);
  // 2) prensa em x = -3: dois postes, travessa, parafuso, folha saindo
  b.box(M.woodDark, 1.4, 0.9, 0.9, -3, 0, 0);
  for (const sx of [-1, 1]) b.box(M.woodDark, 0.16, 1.6, 0.16, -3 + sx * 0.6, 0.9, 0);
  b.box(M.woodDark, 1.4, 0.2, 0.3, -3, 2.4, 0);
  const placa = new THREE.Group();
  const pl = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.7), M.woodDark);
  placa.add(pl);
  placa.position.set(-3, 1.5, 0);
  b.dynamic(placa);
  const fp = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.45), gravuraMat());
  fp.rotation.x = -Math.PI / 2;
  fp.position.set(-3, 0.915, 0.1);
  b.dynamic(fp);
  b.lamp(-3.5, 2.2, 0.8, 0xffb070, 0.8, 8, 0.1);
  // 3) banca de feira em x = 3: várias gravuras penduradas num cordão
  b.box(M.wood, 2.4, 0.08, 0.9, 3, 0.85, 0);
  b.box(pano('toldo', 0x410230), 2.8, 0.05, 1.4, 3, 2.3, 0.1);
  for (let k = 0; k < 5; k++) {
    const gm = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.38), gravuraMat());
    gm.position.set(2.0 + k * 0.5, 1.7, -0.35);
    b.dynamic(gm);
  }
  b.lamp(3, 2.0, 1.0, 0xe8d8c0, 0.6, 8, 0);
  // 4) parede de cozinha em x = 9: a gravura pregada, um prato, uma vela
  const gk = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.38), gravuraMat());
  gk.position.set(9, 1.6, -2.08);
  b.dynamic(gk);
  b.box(M.woodDark, 1.2, 0.04, 0.3, 9, 1.0, -1.95);
  candle(b, 9.3, 1.04, -1.95, true);
  b.add(new THREE.CylinderGeometry(0.12, 0.09, 0.03, 12), liso('loica', 0xc8c0b0, 0.5), trs(8.75, 1.06, -1.95));
  b.finalize();
  return { root: b.root, lamps: b.lamps, env: ENV_CENA.oficina, h: { placa } };
}

// ---------- 5. Estrada da serra ----------
/**
 * Garganta de serra: estrada de terra subindo para o norte (-z), paredões dos dois lados, Pedra Alta no alto em
 * degraus, com aquedutos e o Farol, que varre o vale com um feixe. A carroça anda pela estrada (dinâmica).
 */
export function serra(): Cenario {
  const b = new RegionBuilder();
  // chão e estrada
  b.box(M.ground, 60, 0.1, 160, 0, -0.1, -40);
  for (let i = 0; i < 16; i++) {
    const z = 30 - i * 9;
    const x = Math.sin(i * 0.5) * 2.2;
    b.box(M.road, 3.6, 0.04, 9.4, x, -0.06, z, Math.cos(i * 0.5) * 0.24);
  }
  // paredões
  let s = 5;
  const rnd = () => ((s = (s * 16807) % 2147483647) & 0xffff) / 0xffff;
  for (let i = 0; i < 22; i++) {
    for (const lado of [-1, 1]) {
      const z = 34 - i * 7 + rnd() * 3;
      const x = lado * (9 + rnd() * 6 + i * 0.25);
      const h = 8 + rnd() * 14 + i * 0.6;
      b.add(new THREE.DodecahedronGeometry(1, 0), M.rock, trs(x, h * 0.35, z, rnd() * 3, rnd(), 0, 5 + rnd() * 4, h * 0.5, 5 + rnd() * 3));
    }
  }
  // Pedra Alta: degraus de casas, aqueduto e o Farol, longe ao norte (cartões e caixas, na névoa)
  const cz = -150;
  for (let k = 0; k < 6; k++) {
    for (let i = 0; i < 9; i++) {
      const x = -26 + i * 6.5 + (k % 2) * 3;
      const y = 10 + k * 7;
      building(b, x, cz - k * 6, 0, 5.5, 5 + (i % 3), 5, { floors: 1, bays: 1, lit: 0.15, windowW: 0.9, windowH: 1.8, seed: k * 13 + i, roof: i % 2 ? 'gable' : 'flat', y0: y });
    }
    b.box(M.stoneDark, 64, 7, 8, 0, 3 + k * 7 - 7, cz - k * 6 - 1);
  }
  // aqueduto em arcos atravessando a garganta
  for (let i = 0; i < 12; i++) {
    const x = -36 + i * 6.5;
    b.box(M.stone, 1.4, 34, 2, x, 0, cz + 22);
  }
  b.box(M.stone, 80, 3, 2.4, 0, 34, cz + 22);
  // Farol
  b.add(new THREE.CylinderGeometry(4, 5, 34, 12), M.stoneDark, trs(8, 64, cz - 40));
  b.add(new THREE.CylinderGeometry(5.5, 5.5, 6, 12), M.carved, trs(8, 84, cz - 40));
  const lente = new THREE.Mesh(new THREE.SphereGeometry(3.4, 12, 8), basico('lente', 0xffe2a8));
  lente.position.set(8, 84, cz - 40);
  b.dynamic(lente);
  // feixe: cone aditivo que gira
  const feixeMat = new THREE.MeshBasicMaterial({ color: 0xffe4b0, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(28, 260, 16, 1, true), feixeMat);
  cone.geometry.translate(0, -130, 0);
  const feixe = new THREE.Group();
  cone.rotation.x = -Math.PI / 2 + 0.1;
  feixe.add(cone);
  feixe.position.set(8, 84, cz - 40);
  b.dynamic(feixe);
  // carroça (dinâmica): caixa, rodas, mula de caixas, carroceiro na boleia vem do elenco
  const carro = new THREE.Group();
  const cx = new RegionBuilder();
  carroca(cx, 0, 0, 0, false);
  cx.box(pano('mala', 0x3a2214), 0.7, 0.3, 0.45, 0.3, 0.95, -0.4);
  // mula de PS2: corpo, pescoço e cabeça
  cx.box(liso('mula', 0x3a2e26), 0.5, 0.7, 1.4, 0, 0.75, 3.0);
  cx.box(liso('mula', 0x3a2e26), 0.3, 0.7, 0.3, 0, 1.2, 3.6, 0);
  cx.box(liso('mula', 0x3a2e26), 0.26, 0.26, 0.6, 0, 1.75, 3.8);
  for (const [lx, lz] of [[-0.18, 2.5], [0.18, 2.5], [-0.18, 3.5], [0.18, 3.5]]) cx.box(liso('mula', 0x3a2e26), 0.1, 0.75, 0.1, lx, 0, lz);
  cx.finalize();
  carro.add(cx.root);
  b.dynamic(carro);
  b.lamp(8, 84, cz - 40, 0xffe0a0, 0, 10);
  // fundo pintado: céu de serra coberto
  b.finalize();
  return {
    root: b.root,
    lamps: b.lamps,
    env: ENV_CENA.serra,
    h: { feixe, carro },
    update: (_dt, t) => {
      // o feixe varre o vale devagar, de leste a oeste
      feixe.rotation.y = Math.sin(t * 0.18) * 0.55;
    },
  };
}

// =====================================================================================================
// Capítulo 1 · A Academia (docs/game/CAPITULO_1.md). Mesmo princípio de teatro: só o que entra em quadro.
// =====================================================================================================

/** pessoa sentada em volume (plateia, refeitório): tronco, ombros e cabeça; `ve` vira a cabeça para x, z */
function sentado(b: RegionBuilder, x: number, y: number, z: number, rot: number, seed: number): void {
  const capas = [0x2a1a22, 0x1c2430, 0x2a2a1c, 0x301c14, 0x1a1a1e, 0x3a2e24, 0x24181c];
  const peles = [0xd1a487, 0xa48066, 0x7b5a47, 0x523525, 0xb08a6e];
  const cabelos = [0x1a1210, 0x3d2416, 0x6b3f22, 0x2a1a12, 0x8a8078];
  const capa = pano('capa' + (seed % capas.length), capas[seed % capas.length]);
  b.add(new THREE.CapsuleGeometry(0.2, 0.36, 2, 7), capa, trs(x, y + 0.72, z, rot, 0.08, 0, 1.15, 1, 0.7));
  b.add(new THREE.BoxGeometry(0.36, 0.16, 0.42), capa, trs(x, y + 0.42, z + Math.cos(rot) * 0.16, rot));
  b.add(new THREE.SphereGeometry(0.11, 7, 5), liso('pele' + peles[seed % 5], peles[seed % 5], 0.7), trs(x, y + 1.17, z, rot));
  // cabelo: o topo e a nuca inteira (de costas, ninguém fica careca)
  const cab = liso('cabelo' + (seed % 5), cabelos[seed % 5], 0.9);
  b.add(new THREE.SphereGeometry(0.118, 7, 5, 0, Math.PI * 2, 0, Math.PI / 2), cab, trs(x, y + 1.19, z, rot));
  b.add(new THREE.SphereGeometry(0.12, 7, 5, Math.PI, Math.PI, 0, Math.PI * 0.74), cab, trs(x, y + 1.17, z, rot));
}

/** banco corrido de madeira, comprimento em x */
function bancoCorrido(b: RegionBuilder, x: number, y: number, z: number, len: number): void {
  b.box(M.wood, len, 0.06, 0.34, x, y + 0.42, z);
  for (const sx of [-1, 1]) b.box(M.woodDark, 0.08, 0.42, 0.3, x + sx * (len / 2 - 0.2), y, z);
}

/** prato fundo com uma concha de comida */
function prato(b: RegionBuilder, x: number, y: number, z: number, cheio: boolean): void {
  b.add(new THREE.CylinderGeometry(0.12, 0.08, 0.04, 10), liso('loica', 0xc8c0b0, 0.5), trs(x, y + 0.02, z));
  if (cheio) b.add(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 8), liso('sopa', 0x7a5a30, 0.6), trs(x, y + 0.04, z));
}

/** janela alta de pedra com o fim de tarde lá fora (cartão) */
function janelaAlta(b: RegionBuilder, x: number, y: number, z: number, rot: number, w: number, h: number, cor: number): void {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), basico('tarde' + cor, cor));
  m.position.set(x, y + h / 2, z);
  m.rotation.y = rot;
  b.dynamic(m);
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  for (const sx of [-1, 1]) b.box(M.carved, 0.14, h + 0.2, 0.3, x + sx * (w / 2 + 0.07) * c, y - 0.1, z - sx * (w / 2 + 0.07) * s, rot);
  b.box(M.carved, w + 0.4, 0.14, 0.34, x, y - 0.14, z, rot);
  b.box(M.iron, 0.05, h, 0.05, x, y, z, rot);
}

// ---------- A. Enfermaria da Academia ----------
/**
 * Salão de pedra de 16 por 10 m (x de -8 a 8, z de -5 a 5), duas fileiras de camas de ferro com as cabeceiras
 * para o norte, três janelas altas na parede sul e a mesa de Celeste na ponta leste, com o caderno aberto. A porta
 * fica no oeste. A cama sete, a do Caio, é a do meio da fileira norte.
 */
export const ENF_ACAD = {
  porta: [-7.6, 0] as [number, number],
  cama7: [0.6, -3.3] as [number, number],
  mesa: [6.4, 0.4] as [number, number],
};
export function enfermariaAcademia(): Cenario {
  const b = new RegionBuilder();
  paredes(b, -8, 8, -5, 5, 6, M.stone, M.flag, M.woodDark, [
    { lado: 'o', de: -0.7, ate: 0.7, y0: 0, y1: 2.6 },
  ]);
  for (let x = -7; x <= 7; x += 2.33) b.box(M.woodDark, 0.26, 0.34, 10, x, 5.6, 0);
  for (const x of [-4.5, 0, 4.5]) janelaAlta(b, x, 1.6, 4.86, Math.PI, 1.2, 3.0, 0x6a6470);
  let seed = 2;
  for (let i = 0; i < 6; i++) {
    const x = -5.2 + i * 1.95;
    seed++;
    if (i !== 3) cama(b, x, -3.3, i !== 1, seed, [0xd1a487, 0xa48066, 0x7b5a47, 0x523525][seed % 4]);
    else cama(b, x, -3.3, false, seed);
    cama(b, x, 2.4, i % 2 === 0, seed + 7, [0xb08a6e, 0x7b5a47, 0xd1a487][seed % 3]);
    if (i % 2 === 0) banco(b, x + 0.72, -2.4, true, i === 2);
  }
  // mesa de Celeste: caderno grande aberto, tinteiro, a vela
  const [mx, mz] = ENF_ACAD.mesa;
  table(b, mx, mz, Math.PI / 2, 1.6, 0.8);
  b.box(M.parchment, 0.5, 0.012, 0.36, mx, 0.92, mz);
  b.box(M.woodDark, 0.02, 0.03, 0.38, mx, 0.92, mz);
  b.add(new THREE.CylinderGeometry(0.03, 0.035, 0.06, 8), liso('tinta', 0x0a0a10, 0.3), trs(mx + 0.1, 0.95, mz - 0.5));
  candle(b, mx - 0.15, 0.92, mz + 0.55, true);
  b.box(M.wood, 0.42, 0.45, 0.42, mx + 0.7, 0, mz);
  // estante de vidros e panos
  b.box(M.woodDark, 2.2, 2.2, 0.45, 5.4, 0, -4.7);
  for (const yy of [0.7, 1.3, 1.9]) b.box(M.wood, 2.2, 0.04, 0.5, 5.4, yy, -4.68);
  for (let i = 0; i < 8; i++) b.add(new THREE.CylinderGeometry(0.05, 0.05, 0.16, 6), liso('vidro', 0x4a5a50, 0.2), trs(4.6 + i * 0.22, 1.42, -4.62));
  // velas no corredor e a luz cinza das janelas
  for (const [x, z] of [[-6, -0.4], [-2, 0.4], [2.4, -0.4]] as Array<[number, number]>) banco(b, x, z, true, true);
  b.lamp(0, 3.0, 4.0, 0x8a90a8, 0.5, 12, 0);
  b.box(basico('escuro', 0x020203), 0.05, 2.6, 1.4, -8.2, 0, 0);
  b.finalize();
  return { root: b.root, lamps: b.lamps, env: ENV_CENA.enfermariaTarde, h: {} };
}

// ---------- B. Refeitório ----------
/**
 * Salão comprido de 18 por 8 m (x de -9 a 9, z de -4 a 4): duas mesas corridas, o balcão da cozinha na ponta leste e,
 * na parede leste, a gravura do Menino da Janela emoldurada, com uma vela embaixo, como num altar de casa.
 */
export const REF = {
  porta: [-8.6, 0] as [number, number],
  gravura: [8.85, 0] as [number, number],
  balcao: [7.3, 0] as [number, number],
  lugar: [-1.2, 1.9] as [number, number],
};
export function refeitorio(): Cenario {
  const b = new RegionBuilder();
  paredes(b, -9, 9, -4, 4, 5, M.stone, M.flag, M.woodDark, [{ lado: 'o', de: -0.7, ate: 0.7, y0: 0, y1: 2.6 }]);
  for (let x = -8; x <= 8; x += 2) b.box(M.woodDark, 0.24, 0.3, 8, x, 4.7, 0);
  for (const x of [-6, -2, 2]) janelaAlta(b, x, 1.8, -3.86, 0, 1.0, 2.4, 0x5a5466);
  for (const z of [-1.3, 1.3]) {
    b.box(M.wood, 12, 0.07, 1.0, -1.5, 0.78, z);
    for (const sx of [-1, 1]) b.box(M.woodDark, 0.12, 0.78, 0.8, -1.5 + sx * 5.6, 0, z);
    bancoCorrido(b, -1.5, 0, z - 0.75, 12);
    bancoCorrido(b, -1.5, 0, z + 0.75, 12);
  }
  // estudantes nas mesas; o lugar do protagonista e os do lado ficam vazios
  let seed = 4;
  for (const z of [-1.3, 1.3]) for (const lado of [-1, 1]) for (let i = 0; i < 9; i++) {
    const x = -6.8 + i * 1.3;
    seed++;
    if (z > 0 && lado > 0 && Math.abs(x - REF.lugar[0]) < 1.6) continue;
    if (seed % 5 === 0) continue;
    sentado(b, x, 0.04, z + lado * 0.78, lado > 0 ? Math.PI : 0, seed);
    prato(b, x, 0.82, z + lado * 0.3, true);
  }
  // balcão, panelas e a gravura
  const [bx, bz] = REF.balcao;
  b.box(M.woodDark, 1.0, 0.95, 4.2, bx, 0, bz, 0, true);
  b.add(new THREE.CylinderGeometry(0.3, 0.26, 0.4, 10), M.iron, trs(bx, 1.15, bz - 1.2));
  b.add(new THREE.CylinderGeometry(0.22, 0.2, 0.3, 10), M.iron, trs(bx, 1.1, bz + 0.9));
  const gm = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.0), new THREE.MeshStandardMaterial({ map: gravura(), roughness: 0.95 }));
  gm.position.set(REF.gravura[0], 2.6, REF.gravura[1]);
  gm.rotation.y = -Math.PI / 2;
  b.dynamic(gm);
  b.box(M.carved, 0.08, 1.2, 1.0, REF.gravura[0] + 0.06, 2.0, REF.gravura[1], 0);
  b.box(M.woodDark, 0.28, 0.06, 0.8, 8.7, 1.85, 0);
  candle(b, 8.62, 1.91, 0.18, true);
  candle(b, 8.62, 1.91, -0.2, false);
  for (const x of [-6, -1.5, 3]) b.lamp(x, 3.6, 0, 0xffb070, 0.6, 10, 0.08);
  b.box(basico('escuro', 0x020203), 0.05, 2.6, 1.4, -9.2, 0, 0);
  b.finalize();
  return { root: b.root, lamps: b.lamps, env: ENV_CENA.salaoTarde, h: {} };
}

// ---------- C. Anfiteatro ----------
/**
 * Anfiteatro da aula inaugural: estrado na frente (z = 0), seis fileiras de bancos subindo para o sul (z de 3 a
 * 10,5, 0,45 m por degrau), de x -9 a 9. Janelas altas atrás do estrado, lustre de velas e a porta do alto, a
 * oeste, por onde o homem do casaco gasto sai.
 */
export const ANF = {
  estrado: [0, 0.2] as [number, number],
  altura: 0.6,
  tribuna: [-1.6, 0.4] as [number, number],
  lugar: [3.4, 3.0] as [number, number],
  portaAlto: [-8.4, 11.2] as [number, number],
  fileira: (i: number) => ({ z: 3 + i * 1.5, y: i * 0.45 }),
};
export function anfiteatro(): Cenario {
  const b = new RegionBuilder();
  paredes(b, -10, 10, -3.5, 12.5, 9, M.stoneDark, M.flag, M.woodDark, [{ lado: 'o', de: 10.5, ate: 11.9, y0: 2.7, y1: 5.3 }]);
  // estrado e tribuna
  b.box(M.woodDark, 8, ANF.altura, 3.2, 0, 0, ANF.estrado[1]);
  b.box(M.wood, 0.7, 1.15, 0.5, ANF.tribuna[0], ANF.altura, ANF.tribuna[1]);
  b.box(M.carved, 0.8, 0.06, 0.6, ANF.tribuna[0], ANF.altura + 1.15, ANF.tribuna[1]);
  for (const x of [-6, -2, 2, 6]) janelaAlta(b, x, 3, -3.36, 0, 1.3, 4.4, 0x4a4658);
  K_banner(b);
  // fileiras
  let seed = 11;
  for (let i = 0; i < 6; i++) {
    const { z, y } = ANF.fileira(i);
    b.box(M.woodDark, 18, y + 0.02, 1.5, 0, 0, z + 0.2);
    bancoCorrido(b, 0, y, z, 17);
    b.box(M.wood, 17, 0.06, 0.3, 0, y + 0.95, z - 0.6);
    for (let k = 0; k < 14; k++) {
      const x = -7.8 + k * 1.2;
      seed++;
      if (i === 0 && Math.abs(x - ANF.lugar[0]) < 0.7) continue;
      if (i === 0 && k < 4) continue; // os atores da primeira fila
      if (seed % 7 === 0) continue;
      sentado(b, x, y + 0.04, z + 0.1, Math.PI, seed);
    }
  }
  // lustre de velas e as luzes da sala
  b.add(new THREE.TorusGeometry(1.4, 0.05, 4, 12), M.iron, trs(0, 6.2, 4.5, 0, Math.PI / 2));
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    candle(b, Math.cos(a) * 1.4, 6.22, 4.5 + Math.sin(a) * 1.4, false);
  }
  b.lamp(0, 5.6, 4.5, 0xffb070, 1.0, 16, 0.06);
  b.lamp(0, 3.2, 0.4, 0xffc890, 1.7, 10, 0.04);
  b.lamp(6, 3.4, 5.5, 0xffa860, 0.6, 10, 0.08);
  b.lamp(-7, 4, 9, 0xffa050, 0.4, 10, 0.1);
  b.box(basico('escuro', 0x020203), 0.05, 2.6, 1.4, -10.2, 2.7, 11.2);
  b.finalize();
  return { root: b.root, lamps: b.lamps, env: ENV_CENA.salaoTarde, h: {} };
}
/** estandarte vinho atrás do estrado, com o brasão bordado em ouro gasto (só tecido e um losango) */
function K_banner(b: RegionBuilder): void {
  b.box(pano('estandarte', 0x3d1420), 1.6, 3.4, 0.05, 0, 3.4, -3.3);
  b.add(new THREE.OctahedronGeometry(0.3, 0), liso('ouroGasto', 0x8f7438, 0.6), trs(0, 5.6, -3.26, 0, 0, 0, 1, 1.4, 0.2));
}

// ---------- D. Dormitório ----------
/**
 * Quarto de calouro, 5 por 4 m (x de -2,5 a 2,5, z de -2 a 2): catre na parede norte, a mala em cima, mesa e
 * cadeira, e a janela na parede leste, a mesma janela de folhas de madeira da casa de Remanso.
 */
export const DORM = {
  porta: [-2.3, 1.2] as [number, number],
  cama: [0.2, -1.35] as [number, number],
  mala: [0.4, -1.3] as [number, number],
  janela: [2.45, 0.1] as [number, number],
  mesa: [1.6, 1.4] as [number, number],
};
export function dormitorio(): Cenario {
  const b = new RegionBuilder();
  const fora = basico('foraDorm', 0x141824);
  paredes(b, -2.5, 2.5, -2, 2, 3.1, M.plaster, M.wood, M.woodDark, [
    { lado: 'l', de: DORM.janela[1] - 0.55, ate: DORM.janela[1] + 0.55, y0: 0.95, y1: 2.35 },
    { lado: 'o', de: DORM.porta[1] - 0.5, ate: DORM.porta[1] + 0.5, y0: 0, y1: 2.1 },
  ]);
  const [cx, cz] = DORM.cama;
  b.box(M.woodDark, 1.9, 0.4, 0.86, cx, 0, cz);
  b.box(pano('colchaoAdulto', 0x5a4c3e), 1.84, 0.12, 0.8, cx, 0.4, cz);
  b.box(pano('cobertorCinza', 0x3a3a40), 0.9, 0.04, 0.82, cx - 0.4, 0.52, cz);
  const [ex, ez] = DORM.mesa;
  table(b, ex, ez, 0, 1.0, 0.55);
  b.box(M.wood, 0.4, 0.45, 0.4, ex - 0.1, 0, ez - 0.6);
  candle(b, ex + 0.3, 0.88, ez, true);
  b.box(M.books, 0.24, 0.24, 0.5, ex - 0.25, 0.88, ez + 0.05);
  b.lamp(DORM.janela[0] - 0.5, 1.7, DORM.janela[1], 0x3a4660, 0.25, 7, 0);
  const j = janela(b, DORM.janela[0] + 0.12, 0.95, DORM.janela[1], -Math.PI / 2, 1.1, 1.4, fora);
  // mala aberta em cima do catre: a tampa é dinâmica, o embrulho do pote também
  const mala = new THREE.Group();
  const corpo = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.45), liso('couro', 0x3a2214, 0.6));
  corpo.position.y = 0.11;
  const roupa = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.1, 0.36), pano('roupaDobrada', 0x2a2630));
  roupa.position.y = 0.2;
  roupa.name = 'roupa';
  const embrulho = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.13, 8), pano('panoPote', 0x8f7c5e));
  embrulho.position.set(0.18, 0.12, 0.05);
  embrulho.name = 'embrulho';
  const tampa = new THREE.Group();
  tampa.position.set(0, 0.22, -0.225);
  const tp = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, 0.45), liso('couro', 0x3a2214, 0.6));
  tp.position.set(0, 0, 0.225);
  tampa.add(tp);
  tampa.rotation.x = -1.7;
  mala.add(corpo, roupa, embrulho, tampa);
  mala.position.set(DORM.mala[0], 0.52, DORM.mala[1]);
  mala.rotation.y = 0.1;
  b.dynamic(mala);
  // pote destampado, para a mão (aparece quando ele desembrulha)
  const pt = new THREE.Group();
  const barro = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.12, 8), liso('barro', 0x7a4a2c, 0.9));
  const tecido = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.02, 8), pano('panoPote', 0x8f7c5e));
  tecido.position.y = 0.065;
  pt.add(barro, tecido);
  pt.visible = false;
  b.dynamic(pt);
  b.box(basico('escuro', 0x020203), 0.05, 2.1, 1.0, -2.7, 0, DORM.porta[1]);
  b.finalize();
  return { root: b.root, lamps: b.lamps, env: ENV_CENA.casaNoite, h: { mala, pote: pt, folhaEsq: j.esq, folhaDir: j.dir, fora: j.luz } };
}
