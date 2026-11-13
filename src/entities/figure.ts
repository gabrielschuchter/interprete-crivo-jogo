import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { fixMaterials, instanceSkinned, loadGltf } from '../core/assets';
import { M } from '../world/mats';
import { report } from '../core/diag';
import { TorchModel, WEAPON_LOOKS, buildWeapon, orientWeapon, preloadWeapon, weaponDir } from './weapons';
import { Face, Gaze, Rig, Spring, applyPose, approach, measureGait, smooth, type GaitInfo, forceMixerWrite } from './motion';
import { personaFor, talkGesture, type Persona } from './personas';
import { gesto, type Interaction } from './gestos';

/**
 * Figura humana procedural: proporções plausíveis, casaco longo, capa curta,
 * cachecol e cajado. Animação por cinemática direta (sem arquivo de terceiros).
 * A figura olha para +Z local.
 */
export interface FigureOpts {
  height?: number;
  skin: number;
  hair: number;
  hairStyle?: 'curto' | 'coque' | 'longo' | 'capuz' | 'calvo';
  coat: number;
  trousers?: number;
  scarf?: number | null;
  cape?: number | null;
  /** carrega arma e tocha */
  armed?: boolean;
  /** tipo de arma em WEAPON_LOOKS */
  weapon?: string;
  satchel?: boolean;
  build?: number;
  apron?: number | null;
  beard?: boolean;
  hat?: boolean;
  emblem?: Emblem | null;
  /** chave em public/models/manifest.json; se existir, o modelo glTF substitui o procedural */
  model?: string;
  /** modelo de reserva quando `model` não está no manifesto */
  modelAlt?: string;
  /** cor multiplicada sobre a textura de pele / cabelo do modelo externo */
  tintSkin?: number;
  tintHair?: number;
  tintCoat?: number;
  /** chave da persona (postura, fala, ofício); padrão: a chave do modelo */
  persona?: string;
}

export type Emblem = 'caderno' | 'estetoscopio' | 'relogio' | 'oculos' | 'fita';

export type Action = 'none' | 'attack1' | 'attack2' | 'heavy' | 'dodge' | 'hit' | 'die' | 'interact' | 'cast' | 'talk' | 'sit' | 'shrug' | 'think' | 'nod' | 'wave' | 'point' | 'cheer' | 'bow' | 'listen' | Interaction;
const INTERACTIONS = new Set<string>(['pickup', 'examine', 'pull', 'open', 'push', 'reach']);

export const SKINS = [0xf1cfb4, 0xd9a47c, 0xb07a52, 0x7a4f34, 0x4f3222];
export const HAIRS = [0x1a1210, 0x3d2416, 0x6b3f22, 0x8a8078, 0xb9482e, 0xd8c8a8];

const ACTION_TIME: Record<Action, number> = {
  none: 0,
  attack1: 0.46,
  attack2: 0.5,
  heavy: 0.86,
  dodge: 0.5,
  hit: 0.36,
  die: 1.6,
  interact: 0.6,
  cast: 0.55,
  talk: 2.4,
  sit: 9999,
  shrug: 1.5,
  think: 3.2,
  nod: 1.1,
  wave: 2.0,
  point: 1.6,
  cheer: 1.6,
  bow: 1.8,
  listen: 9999,
  pickup: 1.15,
  examine: 1.7,
  pull: 1.15,
  open: 1.25,
  push: 1.0,
  reach: 0.85,
};

function cloth(color: number, rough = 0.92): THREE.MeshStandardMaterial {
  const base = M.clothDark;
  return new THREE.MeshStandardMaterial({ color, roughness: rough, normalMap: base.normalMap, normalScale: new THREE.Vector2(0.6, 0.6), side: THREE.DoubleSide });
}

function ease(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
}
function seg(t: number, a: number, b: number): number {
  return ease((t - a) / (b - a));
}

interface ModelManifest { [key: string]: string }
let manifest: Promise<ModelManifest> | null = null;

/** Carrega public/models/<arquivo>.glb listado em manifest.json. Sem manifesto ou sem a chave, devolve null e o corpo procedural fica. */
export function loadExternalModel(key: string): Promise<GLTF | null> {
  manifest ??= fetch(`${import.meta.env.BASE_URL}models/manifest.json`).then((r) => (r.ok ? (r.json() as Promise<ModelManifest>) : {})).catch(() => ({}));
  return manifest.then((mf) => (mf[key] ? loadGltf(`models/${mf[key]}`) : null));
}

/** Pré-carrega os protagonistas (tela de abertura). Moradores e inimigos baixam com a região em que aparecem. */
export async function preloadModels(): Promise<void> {
  manifest ??= fetch(`${import.meta.env.BASE_URL}models/manifest.json`).then((r) => (r.ok ? (r.json() as Promise<ModelManifest>) : {})).catch(() => ({}));
  const mf = await manifest;
  await Promise.all(Object.keys(mf).filter((k) => k.startsWith('player_')).map((k) => loadExternalModel(k)));
}

/** Clipes de captura de movimento por ação. Ações sem clipe próprio usam o vizinho mais próximo. */
const CLIP_FOR: Partial<Record<Action, string[]>> = {
  attack1: ['attack'],
  attack2: ['attack2', 'attack'],
  heavy: ['heavy', 'attack'],
  // a captura de esquiva é um agachamento; no jogo a esquiva é um arranque em corrida
  dodge: ['run', 'dodge'],
  hit: ['hit'],
  die: ['die'],
  interact: ['interact'],
  cast: ['cast', 'attack'],
  talk: ['talk'],
  sit: ['idle'],
  shrug: ['shrug', 'talk'],
  think: ['listen', 'idle'],
  nod: ['talk'],
  wave: ['wave', 'talk'],
  point: ['point', 'talk'],
  cheer: ['wave'],
  bow: ['interact'],
  listen: ['listen', 'idle'],
  pickup: ['idle'],
  examine: ['idle'],
  pull: ['idle'],
  open: ['idle'],
  push: ['idle'],
  reach: ['idle'],
};
/** ações que acompanham a duração de jogo (golpes): o clipe é acelerado para caber em ACTION_TIME */
const TIMED: Action[] = ['attack1', 'attack2', 'heavy', 'dodge', 'hit', 'interact', 'cast'];
const LOOPED = new Set(['idle', 'walk', 'run', 'talk', 'listen']);

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _v3 = new THREE.Vector3();
const _qs = new THREE.Quaternion();
const _tc = new THREE.Color();

/** corpo glTF animado: clipes em duas camadas (locomoção e ação) e a camada procedural da persona */
interface ExtBody {
  mixer: THREE.AnimationMixer;
  clips: Map<string, THREE.AnimationAction>;
  cur: string;
  curAction: Action;
  hand: THREE.Object3D | null;
  handL: THREE.Object3D | null;
  head: THREE.Object3D | null;
  rig: Rig;
  rest: Map<THREE.Object3D, { q: THREE.Quaternion; p: THREE.Vector3 }>;
  gaits: Map<string, GaitInfo>;
  persona: Persona;
  face: Face;
  loco: Map<string, number>;
  acts: Array<{ a: THREE.AnimationAction; w: number; rate: number }>;
  twins: Map<THREE.AnimationAction, THREE.AnimationAction>;
  actW: number;
  actName: string;
  gaze: Gaze;
  seed: number;
  hipsBase: number;
  scale: number;
  restK?: number;
  ofK?: number;
  talkK?: number;
  listenK?: number;
  breath?: number;
  gripL?: number;
  gripR?: number;
  sheath?: number;
}

export class Figure {
  root = new THREE.Group();
  private body = new THREE.Group();
  private hips = new THREE.Group();
  private torso = new THREE.Group();
  private head = new THREE.Group();
  private armL = new THREE.Group();
  private armR = new THREE.Group();
  private foreL = new THREE.Group();
  private foreR = new THREE.Group();
  private legL = new THREE.Group();
  private legR = new THREE.Group();
  private shinL = new THREE.Group();
  private shinR = new THREE.Group();
  private skirt: THREE.Mesh;
  private cape: THREE.Mesh | null = null;
  /** arma empunhada (lâmina em +Y); a ponta fica em weaponTip */
  weapon: THREE.Group | null = null;
  weaponTip = new THREE.Object3D();
  weaponKind = '';
  /** no ar após pulo ou queda: usa a passada de corrida */
  airborne = false;
  torch: TorchModel | null = null;
  private clock = 0;
  private phase = Math.random() * 6;
  speed = 0;
  action: Action = 'none';
  actionT = 0;
  private breathe = Math.random() * 6;
  private lookYaw = 0;
  lookTarget: number | null = null;
  height: number;
  alive = true;
  private mats: THREE.MeshStandardMaterial[] = [];
  private eyeParts: Array<{ m: THREE.Mesh; y: number }> = [];
  private brows: THREE.Mesh[] = [];
  private lips: THREE.Mesh | null = null;
  private smo: Record<string, number> = {};
  private blinkT = 2 + Math.random() * 3;
  private blink = 0;
  private idleT = 0;
  private lastYaw = 0;
  private bank = 0;
  private ext: ExtBody | null = null;
  private opts: FigureOpts;
  private lastActT = 0;
  /** cabeça do modelo externo (para olhos, marcadores) */
  get headBone(): THREE.Object3D | null {
    return this.ext?.head ?? null;
  }
  get external(): boolean {
    return !!this.ext;
  }

  constructor(o: FigureOpts) {
    this.opts = o;
    const H = (this.height = o.height ?? 1.74);
    const k = H / 1.74;
    const w = o.build ?? 1;
    const skin = new THREE.MeshStandardMaterial({ color: o.skin, roughness: 0.7 });
    const coat = cloth(o.coat);
    const trousers = cloth(o.trousers ?? 0x15131a);
    const boot = new THREE.MeshStandardMaterial({ color: 0x120d0b, roughness: 0.5 });
    const hairM = new THREE.MeshStandardMaterial({ color: o.hair, roughness: 0.75 });
    this.mats.push(skin, coat, trousers, boot, hairM);
    const add = (parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      parent.add(m);
      return m;
    };

    this.root.add(this.body);
    if (o.model) void this.useModel(o.model).then((ok) => (!ok && o.modelAlt ? this.useModel(o.modelAlt) : ok));
    this.body.scale.setScalar(k);
    this.hips.position.y = 0.93;
    this.body.add(this.hips);

    const trimC = new THREE.Color(o.coat).multiplyScalar(0.5);
    const trim = cloth(trimC.getHex(), 0.85);
    const leather = new THREE.MeshStandardMaterial({ color: 0x2a1a12, roughness: 0.55, metalness: 0.05 });
    const white = new THREE.MeshStandardMaterial({ color: 0xf2ece4, roughness: 0.4 });
    this.mats.push(trim, leather, white);
    const R = 16;

    // pernas, botas de cano com cuff e sola
    for (const [leg, shin, sx] of [
      [this.legL, this.shinL, 1],
      [this.legR, this.shinR, -1],
    ] as Array<[THREE.Group, THREE.Group, number]>) {
      leg.position.set(sx * 0.095 * w, 0, 0);
      this.hips.add(leg);
      add(leg, new THREE.CapsuleGeometry(0.078 * w, 0.3, 8, R), trousers, 0, -0.225, 0);
      add(leg, new THREE.SphereGeometry(0.066 * w, R, 12), trousers, 0, -0.45, 0);
      shin.position.y = -0.45;
      leg.add(shin);
      add(shin, new THREE.CapsuleGeometry(0.06 * w, 0.28, 8, R), trousers, 0, -0.19, 0);
      const bootProfile = [new THREE.Vector2(0.001, -0.455), new THREE.Vector2(0.056 * w, -0.45), new THREE.Vector2(0.064 * w, -0.4), new THREE.Vector2(0.066 * w, -0.3), new THREE.Vector2(0.074 * w, -0.255), new THREE.Vector2(0.078 * w, -0.23), new THREE.Vector2(0.068 * w, -0.225)];
      add(shin, new THREE.LatheGeometry(bootProfile, 20), boot);
      const toe = add(shin, new THREE.CapsuleGeometry(0.05 * w, 0.1, 6, 14), boot, 0, -0.425, 0.075);
      toe.rotation.x = Math.PI / 2;
      toe.scale.set(1, 1, 0.78);
      add(shin, new THREE.BoxGeometry(0.1 * w, 0.02, 0.27), M.woodDark, 0, -0.455, 0.06);
    }

    // saia do casaco, com bainha de debrum
    const coatLen = 0.62;
    const skirtProfile = [new THREE.Vector2(0.17 * w, 0.06), new THREE.Vector2(0.19 * w, -0.08), new THREE.Vector2(0.225 * w, -coatLen * 0.45), new THREE.Vector2(0.265 * w, -coatLen * 0.8), new THREE.Vector2(0.285 * w, -coatLen)];
    this.skirt = add(this.hips, new THREE.LatheGeometry(skirtProfile, 40), coat);
    this.skirt.scale.z = 0.78;
    const hem = add(this.skirt, new THREE.TorusGeometry(0.285 * w, 0.011, 8, 40), trim, 0, -coatLen, 0);
    hem.rotation.x = Math.PI / 2;
    // fenda traseira: duas abas sobrepostas
    add(this.skirt, new THREE.BoxGeometry(0.012, coatLen * 0.8, 0.012), trim, 0, -coatLen * 0.62, -0.215 * w);

    // tronco
    this.torso.position.y = 0.02;
    this.hips.add(this.torso);
    const torsoProfile = [
      new THREE.Vector2(0.165 * w, 0),
      new THREE.Vector2(0.178 * w, 0.1),
      new THREE.Vector2(0.19 * w, 0.22),
      new THREE.Vector2(0.21 * w, 0.37),
      new THREE.Vector2(0.215 * w, 0.45),
      new THREE.Vector2(0.17 * w, 0.51),
      new THREE.Vector2(0.095, 0.545),
      new THREE.Vector2(0.07, 0.56),
    ];
    const tm = add(this.torso, new THREE.LatheGeometry(torsoProfile, 40), coat);
    tm.scale.z = 0.7;
    // cinto, fivela, lapelas e botões
    const belt = add(this.torso, new THREE.TorusGeometry(0.172 * w, 0.013, 8, 40), leather, 0, 0.03, 0);
    belt.rotation.x = Math.PI / 2;
    belt.scale.set(1, 0.7, 1);
    add(this.torso, new THREE.BoxGeometry(0.03, 0.024, 0.01), M.bronze, 0, 0.03, 0.123 * w);
    for (const sx of [-1, 1]) {
      const lap = add(this.torso, new THREE.BoxGeometry(0.05, 0.27, 0.01), trim, sx * 0.05, 0.4, 0.147);
      lap.rotation.z = sx * 0.3;
    }
    for (let i = 0; i < 3; i++) add(this.torso, new THREE.SphereGeometry(0.0125, 10, 8), M.bronze, 0, 0.09 + i * 0.09, 0.133 + i * 0.002);
    // gola alta e pescoço
    const collar = add(this.torso, new THREE.TorusGeometry(0.084, 0.026, 10, 28), trim, 0, 0.545, 0.0);
    collar.rotation.x = Math.PI / 2;
    collar.scale.set(1, 0.9, 1);
    add(this.torso, new THREE.CylinderGeometry(0.048, 0.056, 0.13, 18), skin, 0, 0.6, 0);
    if (o.scarf != null) {
      const sm = cloth(o.scarf, 0.95);
      this.mats.push(sm);
      const sc = add(this.torso, new THREE.TorusGeometry(0.088, 0.04, 10, 28), sm, 0, 0.57, 0.005);
      sc.rotation.x = Math.PI / 2;
      sc.scale.set(1, 0.85, 1.05);
      // pontas caídas nas costas, longe da alça da bolsa
      const tail = add(this.torso, new THREE.BoxGeometry(0.075, 0.36, 0.022), sm, -0.045, 0.38, -0.155);
      tail.rotation.set(0.05, 0, 0.06);
      add(this.torso, new THREE.SphereGeometry(0.036, 12, 10), sm, 0.075, 0.545, 0.085);
    }
    if (o.apron != null) {
      const am = cloth(o.apron, 0.9);
      this.mats.push(am);
      add(this.torso, new THREE.BoxGeometry(0.27 * w, 0.3, 0.02), am, 0, 0.22, 0.142);
      add(this.hips, new THREE.BoxGeometry(0.3 * w, 0.42, 0.02), am, 0, -0.2, 0.185).rotation.x = -0.1;
      for (const sx of [-1, 1]) {
        const band = add(this.torso, new THREE.BoxGeometry(0.02, 0.34, 0.012), am, sx * 0.095, 0.37, 0.138);
        band.rotation.z = sx * -0.12;
      }
    }
    if (o.cape != null) {
      const cm = cloth(o.cape, 0.9);
      this.mats.push(cm);
      const capeProfile = [new THREE.Vector2(0.1, 0.54), new THREE.Vector2(0.235 * w, 0.47), new THREE.Vector2(0.27 * w, 0.2), new THREE.Vector2(0.31 * w, -0.25), new THREE.Vector2(0.33 * w, -0.5)];
      this.cape = add(this.torso, new THREE.LatheGeometry(capeProfile, 40, Math.PI * 0.42, Math.PI * 1.16), cm);
      this.cape.scale.z = 0.86;
    }
    if (o.satchel) {
      // bolsa no quadril esquerdo; a alça desce do ombro direito, por cima do casaco
      add(this.hips, new THREE.BoxGeometry(0.2, 0.16, 0.075), M.wood, -0.25 * w, -0.04, 0.0);
      add(this.hips, new THREE.BoxGeometry(0.205, 0.07, 0.085), leather, -0.25 * w, 0.005, 0.0).rotation.x = 0.06;
      add(this.hips, new THREE.BoxGeometry(0.024, 0.032, 0.012), M.bronze, -0.25 * w, -0.025, 0.045);
      const strap = add(this.torso, new THREE.BoxGeometry(0.03, 0.7, 0.012), leather, -0.055, 0.22, 0.153);
      strap.rotation.z = -0.52;
    }
    // objeto de ofício, visível no corpo
    const emb = o.emblem ?? null;
    if (emb === 'caderno') {
      const nb = add(this.hips, new THREE.BoxGeometry(0.1, 0.14, 0.03), new THREE.MeshStandardMaterial({ color: 0x6b1e2c, roughness: 0.7 }), 0.2 * w, -0.04, 0.1);
      nb.rotation.set(0, -0.35, 0.1);
      add(nb, new THREE.BoxGeometry(0.104, 0.02, 0.034), M.bronze, 0, 0.03, 0);
    } else if (emb === 'estetoscopio') {
      const tube = add(this.torso, new THREE.TorusGeometry(0.1, 0.009, 8, 28), M.bronze, 0, 0.5, 0.065);
      tube.rotation.x = Math.PI / 2.4;
      tube.scale.set(1, 1.5, 1);
      add(this.torso, new THREE.CylinderGeometry(0.026, 0.026, 0.012, 16), M.bronze, 0.0, 0.33, 0.154).rotation.x = Math.PI / 2;
    } else if (emb === 'relogio') {
      const ch = add(this.torso, new THREE.TorusGeometry(0.09, 0.004, 6, 24, Math.PI), M.bronze, 0.0, 0.47, 0.13);
      ch.rotation.set(0.0, 0, Math.PI);
      const wt = add(this.torso, new THREE.CylinderGeometry(0.03, 0.03, 0.014, 20), M.bronze, -0.07, 0.34, 0.154);
      wt.rotation.x = Math.PI / 2;
      add(wt, new THREE.CylinderGeometry(0.024, 0.024, 0.004, 20), white, 0, 0.008, 0);
    } else if (emb === 'fita') {
      const fm = new THREE.MeshStandardMaterial({ color: 0xe0b84a, roughness: 0.6 });
      const f1 = add(this.torso, new THREE.TorusGeometry(0.15, 0.011, 6, 28), fm, 0, 0.47, 0);
      f1.rotation.x = Math.PI / 2.6;
      f1.scale.set(1.1, 1, 0.75);
    }

    // cabeça
    this.head.position.y = 0.7;
    this.head.scale.setScalar(1.1);
    this.torso.add(this.head);
    const hm = add(this.head, new THREE.SphereGeometry(0.106, 28, 22), skin);
    hm.scale.set(0.9, 1.12, 1.02);
    const jaw = add(this.head, new THREE.SphereGeometry(0.084, 24, 18), skin, 0, -0.045, 0.012);
    jaw.scale.set(0.94, 0.86, 0.98);
    for (const sx of [-1, 1]) add(this.head, new THREE.SphereGeometry(0.02, 10, 8), skin, sx * 0.096, -0.005, -0.004).scale.set(0.5, 1, 0.8);
    const eyeM = new THREE.MeshStandardMaterial({ color: 0x15100e, roughness: 0.3 });
    for (const sx of [-1, 1]) {
      const ew = add(this.head, new THREE.SphereGeometry(0.0155, 16, 12), white, sx * 0.038, 0.012, 0.094);
      ew.scale.set(1, 0.7, 0.6);
      const ei = add(this.head, new THREE.SphereGeometry(0.0085, 14, 10), eyeM, sx * 0.038, 0.012, 0.1);
      this.eyeParts.push({ m: ew, y: 0.7 }, { m: ei, y: 1 });
      const brow = add(this.head, new THREE.CapsuleGeometry(0.0045, 0.036, 4, 8), hairM, sx * 0.04, 0.04, 0.097);
      brow.rotation.z = Math.PI / 2 + sx * -0.14;
      this.brows.push(brow);
    }
    const nose = add(this.head, new THREE.SphereGeometry(0.019, 12, 10), skin, 0, -0.016, 0.104);
    nose.scale.set(0.8, 1.1, 1.1);
    const lipM = new THREE.MeshStandardMaterial({ color: new THREE.Color(o.skin).multiplyScalar(0.72).getHex(), roughness: 0.6 });
    this.mats.push(lipM);
    this.lips = add(this.head, new THREE.CapsuleGeometry(0.0038, 0.03, 4, 8), lipM, 0, -0.058, 0.092);
    this.lips.rotation.z = Math.PI / 2;
    if (emb === 'oculos') {
      for (const sx of [-1, 1]) add(this.head, new THREE.TorusGeometry(0.026, 0.0035, 8, 20), M.bronze, sx * 0.038, 0.012, 0.105);
      add(this.head, new THREE.BoxGeometry(0.02, 0.004, 0.004), M.bronze, 0, 0.018, 0.106);
    }
    const style = o.hairStyle ?? 'curto';
    if (style === 'capuz') {
      // capuz: calota, bordas ao redor do rosto e gola caída nas costas
      const hood = add(this.head, new THREE.SphereGeometry(0.142, 28, 20, 0, Math.PI * 2, 0, Math.PI * 0.78), coat, 0, 0.0, -0.025);
      hood.scale.set(1, 1.1, 1.08);
      hood.rotation.x = -0.28;
      const rim = add(this.head, new THREE.TorusGeometry(0.108, 0.016, 8, 28), trim, 0, 0.01, 0.07);
      rim.scale.set(0.95, 1.12, 1);
      const drape = add(this.head, new THREE.CylinderGeometry(0.12, 0.15, 0.1, 24, 1, true), coat, 0, -0.1, -0.05);
      drape.scale.set(1, 1, 1.05);
    } else if (style !== 'calvo') {
      const cap = add(this.head, new THREE.SphereGeometry(0.117, 28, 20, 0, Math.PI * 2, 0, Math.PI * 0.56), hairM, 0, 0.014, -0.014);
      cap.scale.set(0.98, 1.14, 1.08);
      cap.rotation.x = -0.22;
      // franja e costeletas, para a linha do cabelo não parecer uma touca
      for (let i = -2; i <= 2; i++) {
        const fr = add(this.head, new THREE.SphereGeometry(0.03, 10, 8), hairM, i * 0.032, 0.088 - Math.abs(i) * 0.008, 0.07);
        fr.scale.set(1, 0.7, 0.8);
      }
      for (const sx of [-1, 1]) add(this.head, new THREE.CapsuleGeometry(0.014, 0.05, 4, 8), hairM, sx * 0.093, 0.025, 0.02);
      if (style === 'coque') {
        add(this.head, new THREE.SphereGeometry(0.054, 16, 12), hairM, 0, 0.085, -0.108);
        const tie = add(this.head, new THREE.TorusGeometry(0.05, 0.006, 6, 18), leather, 0, 0.085, -0.108);
        tie.rotation.x = Math.PI / 2.5;
      }
      if (style === 'longo') {
        const back = add(this.head, new THREE.CapsuleGeometry(0.09, 0.2, 6, 14), hairM, 0, -0.13, -0.07);
        back.scale.set(1.15, 1, 0.62);
        for (const sx of [-1, 1]) add(this.head, new THREE.CapsuleGeometry(0.02, 0.15, 4, 8), hairM, sx * 0.1, -0.06, 0.02);
      }
    }
    if (o.beard) {
      const bd = add(this.head, new THREE.SphereGeometry(0.078, 18, 14), hairM, 0, -0.082, 0.04);
      bd.scale.set(1, 1.1, 0.8);
      add(this.head, new THREE.BoxGeometry(0.05, 0.012, 0.012), hairM, 0, -0.046, 0.1);
    }
    if (o.hat) {
      add(this.head, new THREE.CylinderGeometry(0.2, 0.2, 0.012, 28), M.clothDark, 0, 0.1, 0);
      add(this.head, new THREE.CylinderGeometry(0.1, 0.115, 0.1, 22), M.clothDark, 0, 0.15, 0);
      add(this.head, new THREE.TorusGeometry(0.114, 0.008, 6, 24), leather, 0, 0.118, 0).rotation.x = Math.PI / 2;
    }

    // braços com punho de manga e mão com polegar
    for (const [arm, fore, sx] of [
      [this.armL, this.foreL, 1],
      [this.armR, this.foreR, -1],
    ] as Array<[THREE.Group, THREE.Group, number]>) {
      arm.position.set(sx * 0.21 * w, 0.48, 0);
      this.torso.add(arm);
      add(arm, new THREE.SphereGeometry(0.066 * w, 18, 14), coat, 0, 0, 0);
      add(arm, new THREE.CapsuleGeometry(0.053 * w, 0.2, 8, R), coat, 0, -0.145, 0);
      fore.position.y = -0.29;
      arm.add(fore);
      add(fore, new THREE.SphereGeometry(0.05 * w, 14, 10), coat, 0, 0, 0);
      add(fore, new THREE.CapsuleGeometry(0.046 * w, 0.18, 8, R), coat, 0, -0.11, 0);
      const cuff = add(fore, new THREE.CylinderGeometry(0.052 * w, 0.056 * w, 0.045, 20), trim, 0, -0.225, 0);
      cuff.scale.z = 1;
      const hand = add(fore, new THREE.CapsuleGeometry(0.03, 0.06, 6, 12), skin, 0, -0.285, 0);
      hand.scale.set(1.15, 1, 0.7);
      const thumb = add(fore, new THREE.CapsuleGeometry(0.011, 0.03, 4, 8), skin, -sx * 0.03, -0.27, 0.014);
      thumb.rotation.z = sx * 0.5;
    }

    if (o.armed) {
      // corpo procedural (reserva): arma na mão direita, tocha na esquerda
      const st = (this.weapon = new THREE.Group());
      st.position.set(0, -0.275, 0);
      this.foreR.add(st);
      this.torch = new TorchModel();
      this.torch.group.position.set(0, -0.28, 0);
      this.foreL.add(this.torch.group);
      void this.equipWeapon(o.weapon ?? 'estoque');
    }
    this.pose(0);
  }

  /** Troca a arma na mão. Se o modelo não carrega, a figura segue desarmada em vez de falhar. */
  async equipWeapon(kind: string): Promise<boolean> {
    if (!this.weapon) return false;
    this.weaponKind = kind;
    if (!(await preloadWeapon(kind))) return false;
    if (this.weaponKind !== kind) return false;
    const w = buildWeapon(kind);
    if (!w) return false;
    for (const c of [...this.weapon.children]) this.weapon.remove(c);
    this.weapon.add(w, this.weaponTip);
    this.weaponTip.position.set(0, WEAPON_LOOKS[kind].length * (1 - WEAPON_LOOKS[kind].grip) * 0.96, 0);
    return true;
  }

  play(a: Action): void {
    this.action = a;
    this.actionT = 0;
  }

  get busy(): boolean {
    // gestos sociais não bloqueiam o jogador: só combate, esquiva, dano, morte e uso de objetos
    return !['none', 'talk', 'sit', 'shrug', 'think', 'nod', 'wave', 'point', 'cheer', 'bow', 'listen'].includes(this.action);
  }

  /** progresso 0..1 da ação atual */
  get progress(): number {
    return this.action === 'none' ? 1 : Math.min(1, this.actionT / ACTION_TIME[this.action]);
  }

  setTint(emissive: number, intensity: number): void {
    for (const m of this.mats) {
      m.emissive.set(emissive);
      m.emissiveIntensity = intensity;
    }
  }

  /** Troca o corpo procedural por um glTF de alta resolução, quando o manifesto o lista. */
  async useModel(key: string): Promise<boolean> {
    const g = await loadExternalModel(key);
    if (!g) return false;
    const scene = instanceSkinned(g);
    fixMaterials(scene, true);
    // materiais próprios por instância: tom de pele, cabelo e brilho de dano não vazam entre figuras
    const o = this.opts;
    scene.traverse((ob) => {
      const me = ob as THREE.Mesh;
      if (!me.isMesh) return;
      me.frustumCulled = false;
      const m = (me.material as THREE.MeshStandardMaterial).clone();
      me.material = m;
      const n = m.name.toLowerCase();
      if (o.tintSkin !== undefined && /body|skin/.test(n)) m.color.set(o.tintSkin);
      else if (o.tintHair !== undefined && /hair|bob0|braid|bun|short0|long0|afro|ponytail|eyebrow/.test(n)) m.color.set(o.tintHair);
      else if (o.tintCoat !== undefined && /roupa_ps2/.test(n)) m.color.set(0xffffff).lerp(_tc.set(o.tintCoat), 0.45);
      // elenco PS2: o atlas já tem a paleta (vinho, couro, bronze); a cor escolhida tinge pela metade
      else if (o.tintCoat !== undefined && !/body|skin|high-poly|low-poly|eye|shoe|teeth|tongue|brilho/.test(n)) m.color.set(o.tintCoat);
      this.mats.push(m);
    });
    const box = new THREE.Box3().setFromObject(scene);
    // modelos do elenco PS2 declaram a altura do corpo (ps2_altura): haste, chapéu e coroa não encolhem a figura
    const declared = Number(g.scene.userData.ps2_altura) || 0;
    const k = this.height / Math.max(0.01, declared || box.max.y - box.min.y);
    scene.scale.setScalar(k);
    scene.position.y = declared ? 0 : -box.min.y * k; // no elenco PS2 os pés já estão em y = 0
    this.body.visible = false;
    this.root.add(scene);
    const mixer = new THREE.AnimationMixer(scene);
    const clips = new Map<string, THREE.AnimationAction>();
    for (const c of g.animations) {
      const a = mixer.clipAction(c);
      if (!LOOPED.has(c.name.toLowerCase().replace('torch_', ''))) {
        a.setLoop(THREE.LoopOnce, 1);
        a.clampWhenFinished = true;
      }
      clips.set(c.name.toLowerCase(), a);
    }
    const hand = scene.getObjectByName('RightHand') ?? null;
    const handL = scene.getObjectByName('LeftHand') ?? null;
    const head = scene.getObjectByName('Head') ?? null;
    if (this.weapon) {
      // arma e tocha saem do antebraço procedural e passam a seguir as mãos do esqueleto
      this.root.add(this.weapon);
      this.weapon.position.set(0.2, 0.9, 0.1);
      if (this.torch) this.root.add(this.torch.group);
    }
    const rig = new Rig(scene, this.root);
    // pose de referência: osso sem trilha no clipe não acumula giro de quadro em quadro
    const rest = new Map<THREE.Object3D, { q: THREE.Quaternion; p: THREE.Vector3 }>();
    for (const b of rig.bones.values()) rest.set(b, { q: b.quaternion.clone(), p: b.position.clone() });
    // passada: velocidade natural de cada clipe de locomoção, medida pelo pé de apoio
    const gaits = new Map<string, GaitInfo>();
    for (const n of ['walk', 'run', 'torch_walk', 'torch_run']) {
      const a = clips.get(n);
      if (!a) continue;
      const gi = measureGait(mixer, a.getClip(), rig);
      if (gi) gaits.set(n, gi);
    }
    mixer.stopAllAction();
    const persona = personaFor(o.persona ?? key);
    // ninguém respira no mesmo compasso: o idle começa em ponto diferente e no tempo da persona
    const idle = clips.get('idle');
    if (idle) idle.time = Math.random() * idle.getClip().duration;
    this.ext = { mixer, clips, cur: '', curAction: 'none', hand, handL, head, rig, rest, gaits, persona, face: new Face(scene), loco: new Map(), acts: [], twins: new Map(), actW: 0, actName: '', gaze: new Gaze(1.05, persona.gazeRate ?? 4), seed: Math.random() * 10, hipsBase: rig.get('Hips')?.position.y ?? 0, scale: k };
    return true;
  }

  private pickClip(names: string[] | undefined): string | null {
    const list = names ?? [];
    for (let i = 0; i < list.length; i++) {
      if (!this.ext!.clips.has(list[i])) continue;
      // o clipe próprio da ação não existe no modelo: registra, em vez de trocar em silêncio
      if (i > 0) report('animação', `${this.action}`, `sem clipe "${list[0]}", usando "${list[i]}"`);
      return list[i];
    }
    if (list.length) report('animação', `${this.action}`, `sem clipe "${list[0]}", usando idle`);
    return null;
  }

  /** ponto (no mundo) para onde a cabeça olha; null olha à frente */
  lookAt: THREE.Vector3 | null = null;
  /** fala em curso (boca e gesto) */
  speaking = false;
  /** passos no lugar ao virar parado, em rad/s (moradores que se voltam para o jogador) */
  turnRate = 0;
  private flX = new Spring(140, 12);
  private flZ = new Spring(140, 12);
  private landS = new Spring(170, 13);
  private accS = new Spring(60, 10);
  private lastSpeed = 0;
  private oficioT = 6 + Math.random() * 6;
  private oficioRun = 0;
  private nodT = 2 + Math.random() * 2;
  private nodS = new Spring(120, 9);
  /** tranco de impacto vindo de `from` (mundo); força 1 = golpe comum */
  flinch(from: THREE.Vector3, force = 1): void {
    _v.copy(from);
    this.root.worldToLocal(_v);
    const l = Math.hypot(_v.x, _v.z) || 1;
    // o tronco recua para longe do golpe e tomba de lado
    this.flX.kick((-_v.z / l) * 7 * force);
    this.flZ.kick((_v.x / l) * 5 * force);
  }
  /** teste: força a mão (0 aberta, 1 punho) */
  gripTest: number | null = null;
  /** mão por ação: [esquerda, direita]; undefined deixa o padrão */
  private handGrip(act: Action): [number | undefined, number | undefined] {
    switch (act) {
      case 'wave':
      case 'point':
      case 'shrug':
        return [0.1, this.weapon ? 1 : 0.1];
      case 'cast':
        return [0, undefined];
      default:
        return [undefined, undefined];
    }
  }
  /** pouso: os joelhos absorvem */
  land(hard: boolean): void {
    this.landS.kick(hard ? 4.2 : 2.4);
  }
  /** aceno de cabeça de quem escuta (fim de frase) */
  nod(): void {
    this.nodS.kick(3.2);
  }

  /** pesos da camada de locomoção: parado, andar, correr, no ar */
  private locoTargets(base: string): Map<string, number> {
    const e = this.ext!;
    const t = new Map<string, number>();
    const has = (n: string) => e.clips.has(base + n) || e.clips.has(n);
    if (this.airborne && has('jump')) t.set('jump', 1);
    else {
      const k = this.height / 1.75;
      const sp = this.speed;
      // até 1,3 m/s anda, a partir de 2,1 corre; entre os dois mistura com as fases alinhadas
      const run = has('run') ? THREE.MathUtils.smoothstep(sp, 1.3 * k, 2.1 * k) : 0;
      const move = THREE.MathUtils.smoothstep(sp, 0.08, 0.5);
      // virar parado: arrasta os pés no compasso do andar, devagar
      const shuffle = Math.min(0.55, Math.abs(this.turnRate) * 0.6) * (1 - move);
      t.set('idle', (1 - move) * (1 - shuffle));
      t.set('walk', move * (1 - run) + shuffle);
      if (run > 0) t.set('run', move * run);
    }
    return t;
  }

  private clipName(base: string, n: string): string {
    return this.ext!.clips.has(base + n) ? base + n : n;
  }

  private updateExternal(dt: number): void {
    const e = this.ext!;
    const per = e.persona;
    // tocha na mão esquerda: o modelo do protagonista traz variantes de braço erguido (torch_*)
    const base = this.torch ? 'torch_' : '';

    // ---- camada de ação: uma ação por vez, com troca em mistura curta ----
    const restart = this.action !== 'none' && (this.action !== e.curAction || this.actionT < this.lastActT);
    this.lastActT = this.actionT;
    e.curAction = this.action;
    const timed = TIMED.includes(this.action);
    if (this.action !== 'none' && restart) {
      const want = this.clipName(base, this.pickClip(CLIP_FOR[this.action]) ?? 'idle');
      const a = e.clips.get(want);
      if (a) {
        // a mesma ação reiniciada (combo) usa um clone para misturar com a anterior em vez de pular
        let act = a;
        if (e.acts.some((x) => x.a === a)) {
          let tw = e.twins.get(a);
          if (!tw) e.twins.set(a, (tw = e.mixer.clipAction(a.getClip().clone())));
          if (!e.acts.some((x) => x.a === tw)) act = tw;
          else e.acts = e.acts.filter((x) => x.a !== a);
        }
        act.setLoop(LOOPED.has(want.replace('torch_', '')) ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
        act.clampWhenFinished = true;
        act.reset().play();
        act.setEffectiveTimeScale(timed ? act.getClip().duration / ACTION_TIME[this.action] : this.action === 'talk' || this.action === 'listen' ? per.tempo : 1);
        e.acts.push({ a: act, w: 0, rate: timed ? 16 : 6 });
        e.actName = want;
        e.cur = want;
      }
    }
    const actOn = this.action !== 'none' && e.acts.length > 0;
    // fala e escuta não apagam a locomoção inteira: a persona decide quanto do clipe de fala aparece
    const social = this.action === 'talk' ? per.talkW : this.action === 'listen' ? 0.35 : 1;
    e.actW = approach(e.actW, actOn ? social : 0, actOn ? (timed ? 18 : 7) : timed ? 10 : 5, dt);
    for (let i = 0; i < e.acts.length; i++) {
      const x = e.acts[i];
      const last = i === e.acts.length - 1;
      x.w = approach(x.w, last && actOn ? 1 : 0, x.rate, dt);
    }
    // ações que já sumiram saem da mistura
    for (let i = e.acts.length - 1; i >= 0; i--) {
      if (e.acts[i].w < 0.01 && (i < e.acts.length - 1 || !actOn)) {
        e.acts[i].a.stop();
        e.acts.splice(i, 1);
      }
    }
    if (!actOn && e.actW < 0.01) e.actName = '';

    // ---- camada de locomoção ----
    const tg = this.locoTargets(base);
    for (const n of new Set([...tg.keys(), ...e.loco.keys()])) {
      const cur = e.loco.get(n) ?? 0;
      const goal = tg.get(n) ?? 0;
      const nw = approach(cur, goal, n === 'jump' || this.airborne ? 12 : 7, dt);
      const name = this.clipName(base, n);
      const a = e.clips.get(name);
      if (!a) continue;
      if (cur < 0.01 && nw >= 0.01) {
        a.reset().play();
        if (n === 'idle') a.time = (e.seed * 0.37) % a.getClip().duration;
        // entra na mesma fase da passada que já está em curso
        const other = n === 'walk' ? 'run' : n === 'run' ? 'walk' : '';
        const oa = other && (e.loco.get(other) ?? 0) > 0.01 ? e.clips.get(this.clipName(base, other)) : null;
        const gi = e.gaits.get(name);
        const go = oa ? e.gaits.get(this.clipName(base, other)) : null;
        if (oa && gi && go) a.time = ((((oa.time / go.dur - go.phase + gi.phase) % 1) + 1) % 1) * gi.dur;
      }
      if (nw < 0.01) {
        if (cur >= 0.01) a.stop();
        e.loco.delete(n);
      } else e.loco.set(n, nw);
    }
    // passada casada à velocidade: frequência = velocidade / comprimento de passada misturado
    const gw = e.gaits.get(this.clipName(base, 'walk'));
    const gr = e.gaits.get(this.clipName(base, 'run'));
    const ww = e.loco.get('walk') ?? 0;
    const wr = e.loco.get('run') ?? 0;
    if (gw && ww + wr > 0) {
      const sw = gw.nat * gw.dur;
      const sr = gr ? gr.nat * gr.dur : sw;
      const stride = (ww * sw + wr * sr) / (ww + wr);
      const sp = Math.max(this.speed, Math.abs(this.turnRate) * 0.35);
      const f = THREE.MathUtils.clamp(sp / stride, 0.45 / gw.dur, 2.2 / (gr?.dur ?? gw.dur));
      const aw = e.clips.get(this.clipName(base, 'walk'));
      const ar = e.clips.get(this.clipName(base, 'run'));
      aw?.setEffectiveTimeScale(f * gw.dur);
      if (ar && gr) ar.setEffectiveTimeScale(f * gr.dur);
    }
    const idleA = e.clips.get(this.clipName(base, 'idle'));
    idleA?.setEffectiveTimeScale(per.tempo);
    // pesos finais somam 1: o que sobra da ação vai para a locomoção
    let locoSum = 0;
    for (const w of e.loco.values()) locoSum += w;
    const lw = (1 - e.actW) / Math.max(1e-3, locoSum);
    for (const [n, w] of e.loco) e.clips.get(this.clipName(base, n))?.setEffectiveWeight(w * lw);
    let actSum = 0;
    for (const x of e.acts) actSum += x.w;
    for (const x of e.acts) x.a.setEffectiveWeight((e.actW * x.w) / Math.max(1e-3, actSum));
    if (locoSum < 1e-3 && actSum < 1e-3) idleA?.play().setEffectiveWeight(1);

    // ---- clipes ----
    for (const [b, r] of e.rest) {
      b.quaternion.copy(r.q);
      b.position.copy(r.p);
    }
    forceMixerWrite(e.mixer);
    e.mixer.update(dt);
    this.clock += dt;
    this.motion(dt);
    e.face.update(dt, this.clock);

    const rig = e.rig;
    if (this.torch && e.handL) {
      // a chama nunca entra no corpo: na altura do tronco o braço da tocha abre até a mão ficar a um palmo do eixo
      const kH = this.height / 1.75;
      if (rig.pos('LeftHand', _v) && _v.y > 0.6 * kH && _v.y < 1.6 * kH && _v.x < 0.22 * kH && _v.z < 0.3 * kH) rig.turn('LeftArm', 0, 0, Math.min(0.7, (0.22 * kH - _v.x) * 2.2));
      // cabo quase de pé, um pouco para fora e para a frente; balança com a passada e tomba na curva
      const sw = Math.sin(this.clock * 7) * Math.min(0.08, this.speed * 0.015);
      _v2.set(0.16 - this.bankX * 0.12, 1, 0.3 + sw).normalize();
      const palm = rig.holdAxis('Left', _v2, _v);
      if (palm) {
        // o cabo passa pelo punho a 15 cm da base
        this.torch.group.position.copy(palm).addScaledVector(_v2, -0.15);
        this.torch.group.quaternion.setFromUnitVectors(_up, _v2);
      } else {
        e.handL.getWorldPosition(_v);
        this.torch.group.position.copy(this.root.worldToLocal(_v));
        this.torch.group.rotation.set(0.28 + sw, 0, -0.16);
      }
      this.torch.update(this.clock);
    }
    if (this.weapon && e.hand) {
      const act = this.action;
      orientWeapon(this.weapon, weaponDir(act, act === 'none' ? 0 : this.progress));
      // o punho gira para o cabo: a lâmina sai do lado do polegar e a mão fecha em volta da empunhadura
      _v2.set(0, 1, 0).applyQuaternion(this.weapon.quaternion);
      const sh = e.sheath ?? 0;
      const palm = sh < 0.5 ? rig.holdAxis('Right', _v2, _v, 2.4) : null;
      if (palm) this.weapon.position.copy(palm);
      else {
        e.hand.getWorldPosition(_v);
        this.weapon.position.copy(this.root.worldToLocal(_v));
      }
      if (sh > 0.001) {
        // bainha no quadril esquerdo, cabo à frente, lâmina para baixo e para trás
        const kH = this.height / 1.75;
        _v2.set(0.19 * kH, 0.98 * kH, 0.06 * kH);
        const k = smooth(sh);
        this.weapon.position.lerp(_v2, k);
        _qs.setFromUnitVectors(_up, _v3.set(0.15, -0.75, -0.6).normalize());
        this.weapon.quaternion.slerp(_qs, k);
      }
    }
  }

  private bankX = 0;
  private lastYawX = 0;
  /** camada procedural: postura da persona, repouso, ofício, fala e escuta, olhar, respiração, inclinação e trancos */
  private motion(dt: number): void {
    const e = this.ext!;
    const per = e.persona;
    const rig = e.rig;
    const t = this.clock;
    const act = this.action;
    const calm = act === 'none' || act === 'talk' || act === 'listen' || act === 'think' || act === 'nod';
    const moving = this.speed > 0.3;
    const still = calm && !moving && !this.airborne;
    // postura de sempre: inteira parada, metade andando, quase nada no meio de golpe
    applyPose(rig, per.posture, calm ? (moving ? 0.5 : 1) : 0.25);
    // braços em repouso: só parados e fora de gesto
    const rw = (per.restW ?? 0) * (still && act !== 'talk' ? 1 : act === 'talk' ? 0.35 : 0);
    e.restK = approach(e.restK ?? 0, rw, 4, dt);
    if (per.rest) applyPose(rig, per.rest, e.restK);
    // ofício nas esperas: começa, segura, termina; a conversa interrompe
    if (still && act === 'none' && per.oficio) {
      this.oficioT -= dt;
      if (this.oficioT <= 0 && this.oficioRun <= 0) {
        this.oficioRun = per.oficio.dur;
        const [a, b] = per.oficio.every;
        this.oficioT = per.oficio.dur + a + Math.random() * (b - a);
      }
    } else this.oficioRun = Math.min(this.oficioRun, 0.6);
    if (this.oficioRun > 0) this.oficioRun -= dt;
    const of = per.oficio;
    const ofK = of ? smooth(Math.min(of.dur - Math.max(0, this.oficioRun), Math.max(0, this.oficioRun)) / 0.7) : 0;
    e.ofK = approach(e.ofK ?? 0, of && this.oficioRun > 0 ? ofK : 0, 6, dt);
    if (of && e.ofK > 0.01) {
      applyPose(rig, of.pose, e.ofK);
      if (of.head === 'varre') rig.turn('Head', 0, Math.sin(t * 0.7) * 0.45 * e.ofK, 0);
    }
    // fala: gesto da persona por cima do clipe de fala; escuta: pose de escuta e acenos no fim das frases
    e.talkK = approach(e.talkK ?? 0, act === 'talk' ? 1 : 0, 5, dt);
    if (e.talkK > 0.01) {
      const g = talkGesture(per.talk, t, e.seed);
      applyPose(rig, g.pose, g.w * e.talkK);
    }
    e.listenK = approach(e.listenK ?? 0, act === 'listen' ? 1 : 0, 4, dt);
    if (e.listenK > 0.01) {
      applyPose(rig, per.listen, e.listenK);
      this.nodT -= dt;
      if (this.nodT <= 0) {
        this.nod();
        this.nodT = 2.4 + Math.random() * 3.5;
      }
    }
    rig.turn('Head', this.nodS.update(dt) * 0.09, 0, 0);
    // olhar: no alvo; quem é tímido baixa os olhos de vez em quando
    let target: THREE.Vector3 | null = null;
    if (this.lookAt && (calm || act === 'wave' || act === 'point')) {
      target = _v2.copy(this.lookAt);
      this.root.worldToLocal(target);
      if (per.shy && Math.sin(t * 0.37 + e.seed) > 1 - per.shy * 1.4) target.set(target.x * 0.3 + 0.3, 0.3 * this.height, 1.2);
    }
    e.gaze.update(rig, target, dt, calm ? 1 : 0.4);
    // respiração: peito e ombros sobem, mais fundo depois de correr
    e.breath = approach(e.breath ?? 0, moving ? Math.min(1, this.speed / 4) : 0, 0.6, dt);
    const br = Math.sin(t * (1.4 + e.breath * 1.8) * per.tempo + e.seed);
    rig.turn('Spine1', -br * (0.012 + e.breath * 0.02), 0, 0);
    rig.turn('LeftShoulder', 0, 0, br * 0.012);
    rig.turn('RightShoulder', 0, 0, -br * 0.012);
    // inclinação nas curvas e no arranque: o corpo vai antes dos pés
    let dyaw = this.root.rotation.y - this.lastYawX;
    while (dyaw > Math.PI) dyaw -= Math.PI * 2;
    while (dyaw < -Math.PI) dyaw += Math.PI * 2;
    this.lastYawX = this.root.rotation.y;
    const turn = dt > 0 ? THREE.MathUtils.clamp(dyaw / dt, -5, 5) : 0;
    this.bankX = approach(this.bankX, turn * Math.min(1, this.speed / 4), 6, dt);
    if (dt > 0) this.accS.kick(THREE.MathUtils.clamp((this.speed - this.lastSpeed) / dt, -25, 25) * 0.012);
    this.lastSpeed = this.speed;
    const acc = this.accS.update(dt);
    rig.turn('Hips', acc * 0.5, 0, -this.bankX * 0.06);
    rig.turn('Spine1', acc * 0.35, 0, this.bankX * 0.03);
    // trancos: impacto e pouso
    const fx = this.flX.update(dt);
    const fz = this.flZ.update(dt);
    if (fx || fz) {
      rig.turn('Spine', fx * 0.06, 0, fz * 0.05);
      rig.turn('Spine1', fx * 0.08, 0, fz * 0.06);
      rig.turn('Head', fx * 0.1, 0, fz * 0.08);
    }
    const ld = this.landS.update(dt);
    if (ld) {
      const hips = rig.get('Hips');
      if (hips) hips.position.y -= (ld * 0.035) / e.scale;
      rig.turn('Spine1', ld * 0.06, 0, 0);
      // joelhos dobram para o quadril descer sem tirar os pés do chão
      rig.turn('LeftUpLeg', -ld * 0.12, 0, 0);
      rig.turn('RightUpLeg', -ld * 0.12, 0, 0);
      rig.turn('LeftLeg', ld * 0.24, 0, 0);
      rig.turn('RightLeg', ld * 0.24, 0, 0);
    }
    // interações: pose desenhada por cima do idle, mão que fecha no contato, arma na bainha
    let gripI: number | undefined;
    e.sheath = approach(e.sheath ?? 0, 0, 8, dt);
    if (INTERACTIONS.has(act)) {
      const g = gesto(act as Interaction, this.progress);
      applyPose(rig, g.pose, g.w);
      if (g.drop > 0.001) {
        const hips = rig.get('Hips');
        if (hips) hips.position.y -= g.drop / e.scale;
      }
      gripI = g.gripR;
      e.sheath = g.sheath;
    }
    // mãos: relaxadas meio fechadas; punho cerrado na arma, na tocha e no que a forja pôs na mão
    const gp = per.grip ?? [0.35, 0.35];
    const ga = this.handGrip(act);
    e.gripL = approach(e.gripL ?? 0, ga[0] ?? (this.torch ? 1 : gp[0]), 14, dt);
    e.gripR = gripI ?? approach(e.gripR ?? 0, ga[1] ?? (this.weapon && (e.sheath ?? 0) < 0.5 ? 1 : gp[1]), 14, dt);
    rig.grip('Left', this.gripTest ?? e.gripL);
    rig.grip('Right', this.gripTest ?? e.gripR);
    // rosto: expressão de base da persona, sobrancelhas na fala, sorriso no aceno
    const fw = e.face.want;
    const bf = per.face ?? {};
    fw.sobrancelha_erguer = (bf.sobrancelha_erguer ?? 0) + (act === 'talk' ? 0.25 * Math.max(0, Math.sin(t * 2.6 + e.seed)) : 0) + (act === 'listen' ? 0.2 : 0) + (act === 'shrug' ? 0.6 : 0);
    fw.sobrancelha_franzir = (bf.sobrancelha_franzir ?? 0) + (act === 'hit' ? 0.8 : 0) + (act === 'think' ? 0.4 : 0) + (act === 'attack1' || act === 'attack2' || act === 'heavy' ? 0.6 : 0);
    fw.sorriso = (bf.sorriso ?? 0) + (act === 'wave' || act === 'cheer' ? 0.6 : 0);
    fw.tristeza = bf.tristeza ?? 0;
    fw.boca_abrir = act === 'hit' ? 0.5 : act === 'heavy' ? 0.3 * this.progress : act === 'die' ? 0.4 : 0;
    e.face.speaking = this.speaking;
  }

  update(dt: number): void {
    if (this.ext) {
      if (this.action !== 'none') {
        this.actionT += dt;
        if (this.actionT >= ACTION_TIME[this.action] && this.action !== 'die' && this.action !== 'sit') this.action = 'none';
      }
      return this.updateExternal(dt);
    }
    this.clock += dt;
    this.phase += dt * (2.2 + this.speed * 1.55);
    this.breathe += dt;
    this.idleT += dt;
    this.blinkT -= dt;
    if (this.blinkT <= 0) {
      this.blink = 0.16;
      this.blinkT = 2.2 + Math.random() * 4;
    }
    this.blink = Math.max(0, this.blink - dt);
    // inclinação nas curvas: o corpo acompanha a mudança de direção
    let dyaw = this.root.rotation.y - this.lastYaw;
    while (dyaw > Math.PI) dyaw -= Math.PI * 2;
    while (dyaw < -Math.PI) dyaw += Math.PI * 2;
    this.lastYaw = this.root.rotation.y;
    const turn = dt > 0 ? THREE.MathUtils.clamp(dyaw / dt, -4, 4) : 0;
    this.bank += (turn * Math.min(1, this.speed / 3) - this.bank) * Math.min(1, dt * 6);
    if (this.action !== 'none') {
      this.actionT += dt;
      if (this.actionT >= ACTION_TIME[this.action]) {
        if (this.action === 'die') this.actionT = ACTION_TIME.die;
        else if (this.action !== 'sit') this.action = 'none';
      }
    }
    this.pose(dt);
  }

  private pose(dt: number): void {
    const sp = Math.min(1, this.speed / 5.6);
    const moving = this.speed > 0.15;
    const p = this.phase;
    const stride = moving ? 0.38 + sp * 0.62 : 0;
    const s = Math.sin(p);
    const c = Math.cos(p);
    const br = Math.sin(this.breathe * 1.6) * 0.012;

    // base: locomoção
    let hipsY = 0.93 + (moving ? Math.abs(c) * 0.035 * stride - 0.02 * stride : br);
    let hipsRx = sp * 0.16;
    let hipsRy = 0;
    let hipsRz = moving ? s * 0.05 * stride : 0;
    let torsoRx = sp * 0.1;
    let torsoRy = moving ? -s * 0.14 * stride : 0;
    let torsoRz = moving ? -s * 0.035 * stride : 0;
    let headRx = -sp * 0.12;
    let headRy = 0;
    let headRz = 0;
    let mouth = 0;
    let browUp = 0;
    let hipX = 0;
    let lLx = -s * 0.78 * stride;
    let rLx = s * 0.78 * stride;
    let lSx = Math.max(0, c) * 1.25 * stride + (moving ? 0.1 : 0.04);
    let rSx = Math.max(0, -c) * 1.25 * stride + (moving ? 0.1 : 0.04);
    let aLx = s * 0.62 * stride;
    let aLz = 0.1;
    let fLx = -0.18 - sp * 0.7;
    // braço direito: segura o cajado
    const hasStaff = !!this.weapon;
    let aRx = hasStaff ? -0.35 - s * 0.12 * stride : -s * 0.62 * stride;
    let aRz = hasStaff ? -0.16 : -0.1;
    let aRy = 0;
    let fRx = hasStaff ? -0.5 : -0.18 - sp * 0.7;
    let stW = 0; // inclinação desejada do cajado no mundo (0 = vertical)
    let stRz = 0;
    let skirtRx = -sp * 0.2;
    let capeRx = sp * 0.34 + (moving ? Math.sin(p * 2) * 0.05 : Math.sin(this.breathe) * 0.015);
    let rootRx = 0;
    let rootY = 0;

    const t = this.actionT;
    switch (this.action) {
      case 'attack1':
      case 'attack2': {
        const dir = this.action === 'attack1' ? 1 : -1;
        const wind = seg(t, 0, 0.13);
        const strike = seg(t, 0.13, 0.26);
        const rec = seg(t, 0.3, 0.46);
        const sw = wind * (1 - strike) * -1 + strike * (1 - rec);
        torsoRy = dir * (sw * 0.75 - wind * (1 - strike) * 0.1);
        hipsRy = dir * sw * 0.25;
        torsoRx = 0.14 * strike * (1 - rec);
        aRx = -1.5 + (wind - strike) * 0.2 + rec * 1.1;
        aRy = dir * (-1.1 * wind * (1 - strike) + 0.9 * strike * (1 - rec));
        aRz = -0.35 * (1 - rec) - 0.16 * rec;
        fRx = -0.25 * (1 - rec) - 0.5 * rec;
        stW = 1.3 * wind * (1 - rec);
        stRz = dir * 0.2 * strike * (1 - rec);
        lLx += -0.25 * strike * (1 - rec);
        rLx += 0.3 * strike * (1 - rec);
        break;
      }
      case 'heavy': {
        const wind = seg(t, 0, 0.36);
        const strike = seg(t, 0.36, 0.5);
        const rec = seg(t, 0.62, 0.86);
        const up = wind * (1 - strike);
        aRx = -0.35 + up * -2.5 + strike * (1 - rec) * -0.75;
        aLx = up * -2.4 + strike * (1 - rec) * -0.7;
        aRz = -0.16 + up * 0.35;
        aLz = 0.1 - up * 0.35;
        fRx = -0.5 + up * 0.2;
        fLx = -0.6;
        stW = up * -0.5 + strike * (1 - rec) * 1.5;
        torsoRx = -0.22 * up + 0.5 * strike * (1 - rec);
        hipsY -= 0.14 * strike * (1 - rec);
        lSx += 0.5 * strike * (1 - rec);
        rSx += 0.5 * strike * (1 - rec);
        lLx -= 0.3 * strike * (1 - rec);
        rLx -= 0.3 * strike * (1 - rec);
        break;
      }
      case 'dodge': {
        const k = Math.sin(Math.min(1, t / 0.5) * Math.PI);
        rootRx = k * 0.55;
        hipsY -= k * 0.3;
        lLx = -0.9 * k;
        rLx = -0.4 * k;
        lSx = 1.3 * k;
        rSx = 1.0 * k;
        torsoRx = 0.3 * k;
        aLx = 0.8 * k;
        capeRx = 0.7 * k;
        skirtRx = -0.4 * k;
        break;
      }
      case 'hit': {
        const k = Math.sin(Math.min(1, t / 0.36) * Math.PI);
        torsoRx = -0.35 * k;
        headRx = -0.2 * k;
        hipsY -= 0.05 * k;
        aLz = 0.1 + 0.5 * k;
        break;
      }
      case 'die': {
        const k = seg(t, 0, 0.7);
        const k2 = seg(t, 0.7, 1.4);
        hipsY = 0.93 - 0.45 * k - 0.22 * k2;
        lLx = -1.2 * k + 0.2 * k2;
        rLx = -1.2 * k + 0.2 * k2;
        lSx = 2.2 * k;
        rSx = 2.2 * k;
        torsoRx = 0.5 * k + 0.5 * k2;
        headRx = 0.4 * k;
        aLx = -0.4 * k;
        aRx = -0.4 * k;
        stW = 0.5 * k2;
        break;
      }
      case 'interact': {
        const k = Math.sin(Math.min(1, t / 0.6) * Math.PI);
        aLx = -1.3 * k;
        fLx = -0.4;
        torsoRx = 0.18 * k;
        break;
      }
      case 'cast': {
        const k = Math.sin(Math.min(1, t / 0.55) * Math.PI);
        aLx = -2.2 * k;
        aLz = 0.1 + 0.3 * k;
        fLx = -0.2;
        torsoRx = -0.1 * k;
        break;
      }
      case 'talk': {
        // gestos em batidas: cada mão enfatiza em tempos diferentes, a cabeça acompanha o ritmo da fala
        const beatL = Math.max(0, Math.sin(t * 2.7)) ** 2;
        const beatR = Math.max(0, Math.sin(t * 2.1 + 1.7)) ** 2;
        aLx = -0.45 - 0.7 * beatL;
        fLx = -1.0 - 0.5 * beatL + 0.2 * Math.sin(t * 7);
        aLz = 0.22 + 0.18 * beatL;
        if (!hasStaff) {
          aRx = -0.4 - 0.6 * beatR;
          fRx = -0.9 - 0.45 * beatR;
          aRz = -0.2 - 0.15 * beatR;
        }
        headRx = Math.sin(t * 2.4) * 0.05 + 0.04 * (beatL + beatR);
        headRy = Math.sin(t * 1.1) * 0.1;
        headRz = Math.sin(t * 0.8) * 0.05;
        torsoRy = Math.sin(t * 1.3) * 0.07;
        torsoRx = 0.03 + 0.05 * (beatL + beatR);
        mouth = (Math.sin(t * 15) * 0.5 + 0.5) * (Math.sin(t * 3.3) > -0.4 ? 1 : 0.15);
        browUp = beatL + beatR;
        break;
      }
      case 'shrug': {
        const k = Math.sin(Math.min(1, t / 1.5) * Math.PI);
        aLz = 0.12 + 0.55 * k;
        fLx = -0.8 * k - 0.1;
        headRz = 0.12 * k;
        headRx = -0.06 * k;
        torsoRx = -0.04 * k;
        browUp = k;
        if (!hasStaff) {
          aRz = -0.12 - 0.55 * k;
          fRx = -0.8 * k - 0.1;
          aRx = -0.2 * k;
        }
        break;
      }
      case 'think': {
        const k = seg(t, 0, 0.5) * (1 - seg(t, 2.7, 3.2));
        aLx = -1.25 * k;
        aLz = 0.05;
        fLx = -2.0 * k - 0.1;
        headRx = 0.16 * k;
        headRz = 0.1 * k;
        headRy = Math.sin(t * 1.4) * 0.06 * k;
        browUp = 0.6 * k;
        break;
      }
      case 'nod': {
        headRx = Math.sin(Math.min(1, t / 1.1) * Math.PI * 2) * 0.28;
        torsoRx = 0.03;
        break;
      }
      case 'listen': {
        headRz = 0.07;
        headRx = 0.03 + Math.max(0, Math.sin(this.idleT * 0.8)) * 0.1;
        browUp = 0.3;
        break;
      }
      case 'wave': {
        const k = seg(t, 0, 0.3) * (1 - seg(t, 1.7, 2.0));
        if (!hasStaff) {
          aRx = -0.35 * k;
          aRz = -0.16 - 2.15 * k;
          fRx = -0.5 - 0.7 * k + Math.sin(t * 10) * 0.45 * k;
        } else aLx = -2.4 * k;
        headRz = -0.06 * k;
        headRx = -0.04 * k;
        mouth = 0.5 * k * (Math.sin(t * 9) > 0 ? 1 : 0.3);
        browUp = 0.5 * k;
        break;
      }
      case 'point': {
        const k = seg(t, 0, 0.3) * (1 - seg(t, 1.2, 1.6));
        aLx = -1.55 * k;
        aLz = 0.1 + 0.08 * k;
        fLx = -0.1 - 0.05 * k;
        torsoRy = -0.12 * k;
        headRy = -0.1 * k;
        break;
      }
      case 'cheer': {
        const k = seg(t, 0, 0.25) * (1 - seg(t, 1.2, 1.6));
        aLx = -2.8 * k;
        aLz = 0.3 * k + 0.1;
        fLx = -0.3 * k - 0.1;
        if (!hasStaff) {
          aRx = -2.8 * k;
          aRz = -0.3 * k - 0.1;
          fRx = -0.3 * k - 0.1;
        } else aRx -= 0.9 * k;
        hipsY += Math.abs(Math.sin(t * 9)) * 0.08 * k;
        headRx = -0.25 * k;
        mouth = 0.8 * k;
        browUp = k;
        break;
      }
      case 'bow': {
        const k = Math.sin(Math.min(1, t / 1.8) * Math.PI);
        const hold = Math.min(1, k * 1.6);
        hipsRx = 0.25 * hold;
        torsoRx = 0.65 * hold;
        headRx = 0.15 * hold;
        hipsY -= 0.04 * hold;
        aLx = 0.15 * hold;
        aLz = 0.06;
        if (!hasStaff) aRx = 0.15 * hold;
        break;
      }
      case 'sit': {
        hipsY = 0.56;
        lLx = -1.5;
        rLx = -1.5;
        lSx = 1.5;
        rSx = 1.5;
        aLx = -0.5;
        aRx = -0.5;
        fLx = -0.6;
        fRx = -0.6;
        skirtRx = -1.2;
        break;
      }
      default:
        break;
    }

    // vida em repouso: troca de apoio, deriva do olhar e braços que não ficam congelados
    const calm = !moving && (this.action === 'none' || this.action === 'listen' || this.action === 'talk');
    const calmK = calm ? 1 : 0;
    const it = this.idleT;
    const shift = Math.sin(it * 0.43 + this.phase * 0.0) * calmK;
    hipsRz += shift * 0.035;
    torsoRz -= shift * 0.022;
    hipX += shift * 0.014;
    headRy += (Math.sin(it * 0.31) * 0.12 + Math.sin(it * 0.83 + 1) * 0.05) * calmK * (this.action === 'talk' ? 0.4 : 1);
    headRx += Math.sin(it * 0.52) * 0.03 * calmK;
    if (calm && this.action !== 'talk' && !hasStaff) {
      aLx += Math.sin(it * 0.9) * 0.03;
      aRx += Math.sin(it * 0.9 + 1.4) * 0.03;
      fLx -= 0.12;
      fRx -= 0.12;
    }
    const bk = this.bank;
    hipsRz += bk * 0.05;
    torsoRz += bk * 0.04;
    headRz -= bk * 0.04;

    const busyNow = this.busy;
    const r = this.action === 'die' ? 9 : busyNow ? 30 : 17;
    const d = dt || 0.016;
    const sv = (k: string, v: number, rate = r): number => {
      const o = this.smo[k];
      const n = o === undefined ? v : o + (v - o) * Math.min(1, d * rate);
      this.smo[k] = n;
      return n;
    };
    hipsY = sv('hy', hipsY);
    hipsRx = sv('hrx', hipsRx);
    hipsRy = sv('hry', hipsRy);
    hipsRz = sv('hrz', hipsRz);
    torsoRx = sv('trx', torsoRx);
    torsoRy = sv('try', torsoRy);
    torsoRz = sv('trz', torsoRz);
    headRx = sv('hdx', headRx);
    headRy = sv('hdy', headRy, 10);
    headRz = sv('hdz', headRz, 10);
    lLx = sv('llx', lLx);
    rLx = sv('rlx', rLx);
    lSx = sv('lsx', lSx);
    rSx = sv('rsx', rSx);
    aLx = sv('alx', aLx);
    aLz = sv('alz', aLz);
    aRx = sv('arx', aRx);
    aRy = sv('ary', aRy);
    aRz = sv('arz', aRz);
    fLx = sv('flx', fLx);
    fRx = sv('frx', fRx);
    stW = sv('stw', stW);
    stRz = sv('str', stRz);
    capeRx = sv('cpx', capeRx, 9);
    skirtRx = sv('skx', skirtRx, 9);
    rootRx = sv('rrx', rootRx);

    this.hips.position.set(hipX, hipsY, 0);
    this.hips.rotation.set(hipsRx, hipsRy, hipsRz);
    this.torso.rotation.set(torsoRx - hipsRx * 0.5, torsoRy, torsoRz);
    this.torso.scale.set(1 + br * 0.9, 1 + br * 1.4, 1 + br * 0.9);
    // olhar para um alvo (NPCs em conversa)
    const targetLook = this.lookTarget ?? 0;
    this.lookYaw += (targetLook - this.lookYaw) * Math.min(1, (dt || 0.016) * 5);
    this.head.rotation.set(headRx, THREE.MathUtils.clamp(this.lookYaw, -1.1, 1.1) + headRy - torsoRy * 0.6, headRz);
    this.legL.rotation.x = lLx - hipsRx;
    this.legR.rotation.x = rLx - hipsRx;
    this.shinL.rotation.x = lSx;
    this.shinR.rotation.x = rSx;
    this.armL.rotation.set(aLx, 0, aLz);
    this.armR.rotation.set(aRx, aRy, aRz, 'YXZ');
    this.foreL.rotation.x = fLx;
    this.foreR.rotation.x = fRx;
    if (this.weapon) this.weapon.rotation.set(stW - aRx - fRx + 1.0, 0, stRz);
    if (this.torch) this.torch.update(this.clock);
    this.skirt.rotation.x = skirtRx - hipsRx * 0.6;
    if (this.cape) this.cape.rotation.x = capeRx;
    this.body.rotation.x = rootRx;
    this.body.rotation.z = this.bank * 0.03;
    this.body.position.y = rootY;

    // rosto: piscar, boca e sobrancelhas
    const lid = this.blink > 0 ? Math.sin((1 - this.blink / 0.16) * Math.PI) : 0;
    for (const e of this.eyeParts) e.m.scale.y = Math.max(0.06, e.y * (1 - 0.94 * lid));
    if (this.lips) this.lips.scale.x = sv('mouth', 1 + mouth * 3.2, 25);
    const bu = sv('brow', browUp, 12);
    this.brows.forEach((b) => (b.position.y = 0.04 + bu * 0.007));
  }
}
