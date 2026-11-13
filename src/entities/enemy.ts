import * as THREE from 'three';
import { smokeSprite, glowSprite } from '../world/textures';
import { BRAND } from '../world/palette';
import type { Collider } from '../world/builder';
import { resolveCircle } from '../world/region';
import { getGltf, instanceSkinned, loadGltf } from '../core/assets';
import { Rig, Spring, applyPose, approach, forceMixerWrite, measureGait, mix, smooth, span, type GaitInfo, type Pose } from './motion';
import { ESTILOS, RECITA, TONTO, URRO, type Estilo } from './estilos';

/** Corpo de captura de movimento dos espectros maiores (MakeHuman + CMU, ver REGISTRO_DE_ASSETS). */
const BODY_PATH = 'models/personagens/vulto.glb';
const _hv = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

/**
 * Criaturas da Névoa. Linguagem fantástica: não representam pessoas, escolas
 * metodológicas nem resultados científicos (documento-matriz, seção 6).
 * Todo ataque tem aviso legível (olhos vermelhos + anel no chão) antes do golpe.
 */
export type EnemyKind = 'fiapo' | 'vulto' | 'eco' | 'veredito' | 'erudito' | 'errante' | 'suplicante' | 'duelista' | 'carcereiro' | 'matriarca';

interface Cfg {
  name: string;
  hp: number;
  speed: number;
  scale: number;
  sight: number;
  meleeRange: number;
  windup: number;
  lunge: number;
  dmg: number;
  recover: number;
  xp: number;
  coins: [number, number];
  boss?: boolean;
  ranged?: boolean;
  tint: number;
  eye: number;
  poise: number; // golpes leves necessários para interromper
  /** corpo glTF próprio (elenco PS2 em public/models/personagens/ps2); sem ele, o corpo encapuzado escurecido */
  model?: string;
  /** altura do corpo em metros (padrão 1,9 x escala) */
  alt?: number;
  /** olhos acesos sobrepostos ao rosto (falso quando o modelo já traz os seus ou mostra o rosto) */
  eyes?: boolean;
  /** mini-chefe: barra de chefe, segunda fase a 50% de vida e um padrão próprio */
  mini?: boolean;
  /** padrão próprio: combo (estocadas em cadeia), invoca (anel e reforços), coro (leque de sopros) */
  special?: 'combo' | 'invoca' | 'coro';
}

const PS2 = 'models/personagens/ps2/';

export const ENEMY_CFG: Record<EnemyKind, Cfg> = {
  fiapo: { name: 'Fiapo da Névoa', hp: 46, speed: 2.7, scale: 1, sight: 12, meleeRange: 2.1, windup: 0.62, lunge: 2.8, dmg: 12, recover: 1.0, xp: 14, coins: [2, 5], tint: 0x5f7f78, eye: 0x7fffd0, poise: 1 },
  vulto: { name: 'Vulto', hp: 96, speed: 2.1, scale: 1.35, sight: 16, meleeRange: 2.3, windup: 0.8, lunge: 2.2, dmg: 16, recover: 1.2, xp: 32, coins: [6, 10], ranged: true, tint: 0x4a5f7a, eye: 0x9fd0ff, poise: 3 },
  eco: { name: 'O Eco', hp: 340, speed: 2.9, scale: 1.9, sight: 30, meleeRange: 2.9, windup: 0.7, lunge: 3.4, dmg: 18, recover: 1.0, xp: 130, coins: [30, 40], boss: true, tint: 0x7a6a4a, eye: 0xffd28a, poise: 99 },
  veredito: { name: 'O Veredito', hp: 760, speed: 2.4, scale: 2.7, sight: 60, meleeRange: 3.9, windup: 0.85, lunge: 3.0, dmg: 20, recover: 1.1, xp: 320, coins: [60, 60], boss: true, ranged: true, tint: 0x4a3a5a, eye: 0xff5a6a, poise: 99 },
  // elenco PS2 (bíblia de personagens): quatro comuns, quatro mini-chefes e o chefe final
  erudito: { name: 'Erudito Oco', hp: 70, speed: 2.4, scale: 1, sight: 13, meleeRange: 2.0, windup: 0.55, lunge: 2.6, dmg: 13, recover: 0.9, xp: 22, coins: [3, 7], tint: 0x6a6e78, eye: 0xd8e0ff, poise: 2, model: 'mob_01_erudito', alt: 1.82, eyes: false },
  errante: { name: 'Errante do Gelo', hp: 120, speed: 1.7, scale: 1.1, sight: 12, meleeRange: 2.4, windup: 0.95, lunge: 2.0, dmg: 20, recover: 1.4, xp: 30, coins: [5, 9], tint: 0x9fb4c8, eye: 0xcfe8ff, poise: 4, model: 'mob_03_errante', alt: 2.0, eyes: false },
  suplicante: { name: 'Suplicante Encapuzado', hp: 60, speed: 3.1, scale: 0.95, sight: 15, meleeRange: 1.9, windup: 0.42, lunge: 3.4, dmg: 11, recover: 0.8, xp: 24, coins: [3, 8], tint: 0x5a1a24, eye: 0xff5a5a, poise: 1, model: 'mob_04_suplicante', alt: 1.78 },
  duelista: { name: 'Duelista das Cinzas', hp: 300, speed: 3.2, scale: 1.15, sight: 20, meleeRange: 2.6, windup: 0.5, lunge: 4.2, dmg: 15, recover: 0.75, xp: 110, coins: [25, 35], boss: true, mini: true, special: 'combo', tint: 0x8a8278, eye: 0xffe0b0, poise: 99, model: 'mini_02_duelista', alt: 2.05, eyes: false },
  carcereiro: { name: 'Carcereiro dos Trilhos', hp: 420, speed: 1.9, scale: 1.35, sight: 18, meleeRange: 3.0, windup: 1.0, lunge: 2.4, dmg: 23, recover: 1.3, xp: 120, coins: [28, 38], boss: true, mini: true, special: 'invoca', tint: 0x7a5ab0, eye: 0xc8a0ff, poise: 99, model: 'mini_03_carcereiro', alt: 2.4, eyes: false },
  matriarca: { name: 'Matriarca do Coro Velado', hp: 280, speed: 1.6, scale: 1.25, sight: 22, meleeRange: 2.4, windup: 0.8, lunge: 1.8, dmg: 14, recover: 1.0, xp: 115, coins: [26, 36], boss: true, mini: true, ranged: true, special: 'coro', tint: 0xa88a48, eye: 0xffd28a, poise: 99, model: 'mini_04_matriarca', alt: 2.2, eyes: false },
};
// corpos do elenco nos tipos que já existiam: o Vulto vira o Espectro da Lanterna, o Eco veste o Carrasco da
// Torre dos Sinos (o anel do Eco é a badalada do martelo) e o Veredito é o Grande Intérprete
Object.assign(ENEMY_CFG.vulto, { model: 'mob_02_espectro', alt: 2.25, eyes: false });
Object.assign(ENEMY_CFG.eco, { model: 'mini_01_carrasco', alt: 3.3, eyes: false });
Object.assign(ENEMY_CFG.veredito, { model: 'boss_01_grande_interprete', alt: 4.6, eyes: false });

/** caminho do corpo glTF de um tipo de inimigo (null: espectro procedural) */
export function enemyModelPath(kind: EnemyKind): string | null {
  if (kind === 'fiapo') return null;
  const m = ENEMY_CFG[kind].model;
  return m ? `${PS2}${m}.glb` : BODY_PATH;
}

export type EnemyState = 'idle' | 'chase' | 'windup' | 'strike' | 'recover' | 'stunned' | 'cast' | 'ring' | 'recite' | 'fase' | 'dying' | 'dead';

export interface EnemyCtx {
  playerPos: THREE.Vector3;
  playerAlive: boolean;
  colliders: Collider[];
  groundAt: (x: number, z: number, y: number) => number | null;
  hitPlayer: (dmg: number, from: THREE.Vector3, kind: 'golpe' | 'sopro' | 'anel') => void;
  shoot: (from: THREE.Vector3, dir: THREE.Vector3, dmg: number, speed: number) => void;
  summon: (kind: EnemyKind, x: number, z: number, group: string) => void;
  sfx: (name: string) => void;
  shake: (amount: number) => void;
  others: Enemy[];
}

let smokeTex: THREE.Texture | null = null;
let glowTex: THREE.Texture | null = null;

export class Enemy {
  root = new THREE.Group();
  pos = new THREE.Vector3();
  yaw = 0;
  hp: number;
  maxHp: number;
  state: EnemyState = 'idle';
  private t = 0;
  cfg: Cfg;
  private puffs: Array<{ s: THREE.Sprite; a: number; r: number; y: number; sp: number; base: number }> = [];
  private eyes: THREE.Mesh[] = [];
  private shroud: THREE.Mesh;
  private rig = new THREE.Group();
  private hips = new THREE.Group();
  private torso = new THREE.Group();
  private head = new THREE.Group();
  private arms: Array<{ up: THREE.Group; fore: THREE.Group; hand: THREE.Group; fingers: THREE.Group[] }> = [];
  private strips: THREE.Mesh[] = [];
  private orb: THREE.Sprite;
  private pz: Record<string, number> = {};
  private prevPos = new THREE.Vector3();
  private moveSpeed = 0;
  private gait = Math.random() * 6;
  private ring: THREE.Mesh;
  private bar: THREE.Group;
  private barFill: THREE.Mesh;
  private home = new THREE.Vector3();
  private strikeDir = new THREE.Vector3();
  private strikeHit = false;
  private attackCd = 0;
  private castCd = 4;
  private ringCd = 9;
  private reciteCd = 14;
  private poise = 0;
  private flash = 0;
  private summoned = 0;
  private wander = Math.random() * 6;
  private ringRadius = 0;
  aggro = false;
  vulnerable = 1; // multiplicador de dano recebido
  private bobPhase = Math.random() * 6;
  private tablets: THREE.Mesh[] = [];
  /** barra de chefe / avisos na interface */
  reciteProgress = 0;
  /** fase do mini-chefe (1 ou 2) */
  phase = 1;
  private combo = 0;
  onDeath: (() => void) | null = null;
  /** corpo escaneado e animado; null = espectro procedural */
  private body: {
    root: THREE.Object3D;
    mixer: THREE.AnimationMixer;
    clips: Map<string, THREE.AnimationClip>;
    cur: string;
    act: THREE.AnimationAction | null;
    mats: THREE.MeshStandardMaterial[];
    head: THREE.Object3D | null;
    eyes: THREE.Mesh[];
    lastState: EnemyState | null;
    own: boolean;
    rig: Rig;
    rest: Map<THREE.Object3D, { q: THREE.Quaternion; p: THREE.Vector3 }>;
    gaits: Map<string, GaitInfo>;
    k: number;
  } | null = null;
  /** trancos de impacto (frente/trás e lado) e o último ponto de onde veio o golpe */
  private flX = new Spring(120, 11);
  private flZ = new Spring(120, 11);
  private lastFrom = new THREE.Vector3();
  /** pose do golpe que já foi atingida, para a recuperação partir dela */
  private styleW = 0;
  private hoverY = 0;

  constructor(
    public kind: EnemyKind,
    public group: string,
    x: number,
    y: number,
    z: number,
    hpScale = 1,
  ) {
    const c = (this.cfg = ENEMY_CFG[kind]);
    this.maxHp = this.hp = Math.round(c.hp * hpScale);
    this.pos.set(x, y, z);
    this.home.copy(this.pos);
    smokeTex ??= smokeSprite(128, 3);
    glowTex ??= glowSprite(64, 'rgba(255,255,255,1)', 'rgba(255,255,255,0)');
    const s = c.scale;

    // corpo: espectro articulado (manto rasgado, tronco, capuz, braços com garras)
    const tint = new THREE.Color(c.tint);
    const robeM = new THREE.MeshStandardMaterial({ color: tint.clone().multiplyScalar(0.26), roughness: 0.95, transparent: true, opacity: 0.94, side: THREE.DoubleSide, emissive: c.tint, emissiveIntensity: 0.08 });
    const boneM = new THREE.MeshStandardMaterial({ color: tint.clone().lerp(new THREE.Color(0xd8d2c0), 0.6), roughness: 0.55, emissive: c.tint, emissiveIntensity: 0.05 });
    const voidM = new THREE.MeshBasicMaterial({ color: 0x050407 });
    const thin = kind === 'fiapo';
    const broad = kind === 'vulto' ? 1.18 : kind === 'veredito' ? 1.3 : kind === 'eco' ? 1.22 : 0.86;
    const armLen = thin ? 1.2 : 1;
    const ragged = (g: THREE.BufferGeometry, amp: number, bottomY: number, freq: number): void => {
      const pos = g.getAttribute('position');
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const k = Math.max(0, (bottomY + 0.35 - y) / 0.35);
        const a = Math.atan2(pos.getZ(i), pos.getX(i));
        const rag = 1 + (Math.sin(a * freq) * 0.2 + Math.sin(a * freq * 2.3 + 1) * 0.1) * k * amp;
        pos.setX(i, pos.getX(i) * rag);
        pos.setZ(i, pos.getZ(i) * rag);
        if (k > 0.85) pos.setY(i, y - (Math.sin(a * freq * 1.7) * 0.5 + 0.5) * 0.18 * amp);
      }
      g.computeVertexNormals();
    };
    const mesh = (parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      parent.add(m);
      return m;
    };
    this.rig.scale.setScalar(s);
    this.root.add(this.rig);
    this.hips.position.y = thin ? 0.98 : 1.06;
    this.rig.add(this.hips);
    // saia/manto longo, flutuando
    const skirtProfile: THREE.Vector2[] = [];
    for (let i = 0; i <= 14; i++) {
      const u = i / 14;
      skirtProfile.push(new THREE.Vector2((0.17 + Math.pow(u, 1.4) * 0.5) * broad, -u * 0.98));
    }
    const sg = new THREE.LatheGeometry(skirtProfile, 56);
    ragged(sg, 1.3, -0.98, 7);
    this.shroud = mesh(this.hips, sg, robeM);
    // tronco
    this.torso.position.y = 0.04;
    this.hips.add(this.torso);
    const chestProfile = [0.0, 0.17, 0.24, 0.33, 0.45, 0.55, 0.62, 0.66].map((y, i) => new THREE.Vector2([0.17, 0.165, 0.19, 0.225, 0.235, 0.2, 0.1, 0.06][i] * broad, y));
    mesh(this.torso, new THREE.LatheGeometry(chestProfile, 40), robeM);
    const collar = mesh(this.torso, new THREE.TorusGeometry(0.115 * broad, 0.035, 12, 32), robeM, 0, 0.6, 0);
    collar.rotation.x = Math.PI / 2;
    // costelas expostas: arcos de osso sob o manto
    for (let i = 0; i < 4; i++) {
      const rib = mesh(this.torso, new THREE.TorusGeometry((0.2 - i * 0.012) * broad, 0.008, 6, 22, Math.PI * 1.1), boneM, 0, 0.28 + i * 0.065, 0.02);
      rib.rotation.set(Math.PI / 2, 0, -Math.PI * 0.05);
      rib.scale.z = 0.75;
    }
    // cabeça: capuz, vazio no rosto, olhos
    this.head.position.y = 0.72;
    this.torso.add(this.head);
    const hood = mesh(this.head, new THREE.SphereGeometry(0.19, 36, 28), robeM, 0, 0.03, -0.02);
    hood.scale.set(0.95 * (thin ? 0.9 : 1), 1.22, 1.08);
    const tip = mesh(this.head, new THREE.ConeGeometry(0.1, kind === 'vulto' ? 0.42 : 0.3, 20, 1, true), robeM, 0, 0.26, -0.1);
    tip.rotation.x = -0.5;
    const face = mesh(this.head, new THREE.SphereGeometry(0.115, 28, 20), voidM, 0, -0.01, 0.1);
    face.scale.set(0.92, 1.18, 0.7);
    face.castShadow = false;
    const brow = mesh(this.head, new THREE.TorusGeometry(0.135, 0.022, 10, 30, Math.PI), robeM, 0, 0.06, 0.085);
    brow.rotation.set(0.0, 0.0, 0);
    brow.scale.set(1, 0.9, 0.7);
    // boca de osso entreaberta para criaturas mais velhas
    if (kind !== 'fiapo') {
      for (let i = -2; i <= 2; i++) {
        const tooth = mesh(this.head, new THREE.ConeGeometry(0.008, 0.035, 5), boneM, i * 0.02, -0.098 + Math.abs(i) * 0.004, 0.155);
        tooth.rotation.x = Math.PI;
        tooth.castShadow = false;
      }
    }
    if (kind === 'veredito') {
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        const sp = mesh(this.head, new THREE.ConeGeometry(0.018, 0.2 + (i % 3) * 0.06, 6), boneM, Math.cos(a) * 0.17, 0.26, Math.sin(a) * 0.17 - 0.02);
        sp.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35);
      }
    }
    const eyeM = new THREE.MeshBasicMaterial({ color: new THREE.Color(c.eye).multiplyScalar(2.2) });
    for (const sx of [-1, 1]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 10), eyeM);
      e.position.set(sx * 0.052, 0.02, 0.172);
      e.scale.set(1.5, 0.62, 0.8);
      e.rotation.z = sx * -0.28;
      this.head.add(e);
      this.eyes.push(e);
    }
    // braços articulados: manga rasgada, antebraço, mão com quatro garras
    for (const sx of [-1, 1]) {
      const up = new THREE.Group();
      up.position.set(sx * 0.27 * broad, 0.52, 0);
      this.torso.add(up);
      mesh(up, new THREE.SphereGeometry(0.075, 18, 14), robeM).scale.set(1.2, 0.9, 1);
      mesh(up, new THREE.CapsuleGeometry(0.042, 0.34 * armLen, 8, 14), boneM, 0, -0.2 * armLen, 0);
      const sleeve = mesh(up, new THREE.ConeGeometry(0.1, 0.4 * armLen, 20, 1, true), robeM, 0, -0.22 * armLen, 0);
      sleeve.rotation.x = Math.PI;
      const fore = new THREE.Group();
      fore.position.y = -0.4 * armLen;
      up.add(fore);
      mesh(fore, new THREE.SphereGeometry(0.045, 14, 10), boneM);
      mesh(fore, new THREE.CapsuleGeometry(0.034, 0.32 * armLen, 8, 14), boneM, 0, -0.19 * armLen, 0);
      const fsl = mesh(fore, new THREE.ConeGeometry(0.085, 0.34 * armLen, 20, 1, true), robeM, 0, -0.2 * armLen, 0);
      fsl.rotation.x = Math.PI;
      ragged(fsl.geometry, 1.2, -0.17 * armLen, 6);
      const hand = new THREE.Group();
      hand.position.y = -0.38 * armLen;
      fore.add(hand);
      mesh(hand, new THREE.SphereGeometry(0.04, 14, 10), boneM).scale.set(1, 1.2, 0.6);
      const fingers: THREE.Group[] = [];
      for (let f = 0; f < 4; f++) {
        const fg = new THREE.Group();
        fg.position.set((f - 1.5) * 0.02, -0.04, 0.0);
        hand.add(fg);
        mesh(fg, new THREE.CapsuleGeometry(0.0075, 0.07, 4, 8), boneM, 0, -0.045, 0);
        const claw = mesh(fg, new THREE.ConeGeometry(0.009, 0.075, 8), boneM, 0, -0.115, 0);
        claw.rotation.x = Math.PI;
        fg.rotation.z = (f - 1.5) * 0.08;
        fingers.push(fg);
      }
      this.arms.push({ up, fore, hand, fingers });
    }
    // fitas de manto às costas, balançando
    for (let i = 0; i < 6; i++) {
      const w = 0.07 + (i % 2) * 0.03;
      const g = new THREE.PlaneGeometry(w, 0.7 + (i % 3) * 0.18, 1, 6);
      const st = mesh(this.torso, g, robeM, (i - 2.5) * 0.075 * broad, 0.5 - (0.7 + (i % 3) * 0.18) / 2, -0.19 * broad);
      st.geometry.translate(0, 0, 0);
      this.strips.push(st);
    }
    // esfera de energia na conjuração
    glowTex ??= glowSprite(64, 'rgba(255,255,255,1)', 'rgba(255,255,255,0)');
    this.orb = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(c.eye).multiplyScalar(2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.orb.position.set(0, 1.35, 0.6);
    this.orb.scale.setScalar(0.001);
    this.rig.add(this.orb);

    const n = kind === 'veredito' ? 16 : kind === 'eco' ? 12 : 7;
    for (let i = 0; i < n; i++) {
      const m = new THREE.SpriteMaterial({ map: smokeTex, color: c.tint, transparent: true, opacity: 0.5, depthWrite: false, rotation: Math.random() * 6 });
      const sp = new THREE.Sprite(m);
      const base = (0.7 + Math.random() * 0.9) * s;
      sp.scale.setScalar(base);
      this.root.add(sp);
      this.puffs.push({ s: sp, a: Math.random() * 6.28, r: (0.2 + Math.random() * 0.45) * s, y: (0.05 + Math.random() * 1.0) * s, sp: 0.4 + Math.random() * 1.2, base });
    }
    if (kind === 'veredito') {
      // tábuas de sentença orbitando: certezas escritas cedo demais
      const tm = new THREE.MeshStandardMaterial({ color: 0x2a2530, roughness: 0.7, emissive: BRAND.classicCrimson, emissiveIntensity: 0.25 });
      for (let i = 0; i < 6; i++) {
        const t = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.72, 0.06), tm);
        t.castShadow = true;
        this.root.add(t);
        this.tablets.push(t);
      }
    }
    if (kind === 'eco') {
      // máscaras pálidas que repetem o que ouviram, orbitando
      const mm = new THREE.MeshStandardMaterial({ color: 0xd9d0b8, roughness: 0.5, emissive: c.tint, emissiveIntensity: 0.12 });
      const dark = new THREE.MeshBasicMaterial({ color: 0x08060a });
      for (let i = 0; i < 5; i++) {
        const g = new THREE.Group();
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 18), mm);
        m.scale.set(0.8, 1.1, 0.35);
        g.add(m);
        for (const sx of [-1, 1]) {
          const e = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), dark);
          e.position.set(sx * 0.07, 0.05, 0.07);
          e.scale.set(1.3, 0.6, 0.5);
          g.add(e);
        }
        const mo = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), dark);
        mo.position.set(0, -0.1, 0.07);
        mo.scale.set(1.5, 0.5 + i * 0.25, 0.5);
        g.add(mo);
        g.traverse((o) => ((o as THREE.Mesh).isMesh ? ((o as THREE.Mesh).castShadow = true) : 0));
        this.root.add(g);
        this.tablets.push(g as unknown as THREE.Mesh);
      }
    }
    // anel de aviso no chão
    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(0.86, 1, 48),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(BRAND.classicCrimson).multiplyScalar(2), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }),
    );
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.06;
    this.root.add(this.ring);
    // barra de vida sobre a cabeça (chefes usam a barra da interface)
    this.bar = new THREE.Group();
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.07), new THREE.MeshBasicMaterial({ color: 0x120910, transparent: true, opacity: 0.85, depthTest: false }));
    this.barFill = new THREE.Mesh(new THREE.PlaneGeometry(0.88, 0.045), new THREE.MeshBasicMaterial({ color: BRAND.classicCrimson, depthTest: false }));
    this.barFill.position.z = 0.001;
    this.bar.add(bg, this.barFill);
    this.bar.position.y = 2.25 * s;
    this.bar.visible = false;
    this.bar.renderOrder = 20;
    this.root.add(this.bar);
    this.root.position.copy(this.pos);
    if (kind !== 'fiapo') this.useBody(eyeM);
  }

  /** Troca o espectro de primitivas por um corpo humano encapuzado, escurecido e com olhos acesos. */
  private useBody(eyeM: THREE.Material): void {
    const path = enemyModelPath(this.kind) ?? BODY_PATH;
    const g = getGltf(path);
    if (!g) {
      // a região pré-carrega os corpos; se um chegar depois (invocação, teste), entra quando terminar de baixar
      void loadGltf(path).then((x) => {
        if (x && this.alive && !this.body) this.useBody(eyeM);
      });
      return;
    }
    if (!g.animations.length) return;
    const c = this.cfg;
    const own = !!c.model;
    const root = instanceSkinned(g);
    const mats: THREE.MeshStandardMaterial[] = [];
    const tint = new THREE.Color(c.tint);
    root.traverse((o) => {
      const me = o as THREE.SkinnedMesh;
      if (!me.isMesh) return;
      me.castShadow = true;
      me.frustumCulled = false;
      const src = me.material as THREE.MeshStandardMaterial;
      const m = src.clone();
      const n = (src.name || me.name).toLowerCase();
      if (own) {
        // elenco PS2: materiais e paleta do próprio modelo; o jogo só acende o brilho de dano e de aviso
        m.emissive = new THREE.Color(0);
        m.emissiveIntensity = 0;
        if (/brilho/.test(n)) {
          m.emissive = src.emissive.clone();
          m.emissiveIntensity = src.emissiveIntensity;
          me.userData.glow = true;
        }
        me.material = m;
        if (!me.userData.glow) mats.push(m);
        return;
      } else if (/body|skin|eye|teeth|tongue|brow|lash/.test(n)) {
        // sob o capuz não há rosto: só escuro
        m.map = null;
        m.color.set(0x050407);
        m.roughness = 1;
      } else {
        m.color.multiplyScalar(0.32).lerp(tint, 0.25);
        m.roughness = 0.95;
      }
      m.emissive = tint.clone();
      m.emissiveIntensity = 0.1;
      me.material = m;
      mats.push(m);
    });
    const box = new THREE.Box3().setFromObject(root);
    // altura declarada pelo modelo (ps2_altura) em vez da caixa: haste, coroa e auréola não encolhem o corpo
    const h = Number(g.scene.userData.ps2_altura) || box.max.y - box.min.y;
    root.scale.setScalar((c.alt ?? 1.9 * c.scale) / Math.max(0.1, h));
    this.root.add(root);
    this.rig.visible = false;
    let head: THREE.Object3D | null = null;
    root.traverse((o) => {
      if (!head && /^head$/i.test(o.name)) head = o;
    });
    const eyes: THREE.Mesh[] = [];
    for (let i = 0; i < (c.eyes === false ? 0 : 2); i++) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.028 * c.scale, 12, 10), eyeM);
      e.scale.set(1.5, 0.62, 0.8);
      this.root.add(e);
      eyes.push(e);
      this.eyes.push(e);
    }
    const clips = new Map(g.animations.map((a) => [a.name, a] as const));
    const mixer = new THREE.AnimationMixer(root);
    const rig = new Rig(root, this.root);
    const rest = new Map<THREE.Object3D, { q: THREE.Quaternion; p: THREE.Vector3 }>();
    for (const b of rig.bones.values()) rest.set(b, { q: b.quaternion.clone(), p: b.position.clone() });
    // passada: velocidade natural de andar e correr deste corpo, para o pé não patinar na perseguição
    const gaits = new Map<string, GaitInfo>();
    for (const n of ['walk', 'run']) {
      const cl = clips.get(n);
      const gi = cl ? measureGait(mixer, cl, rig) : null;
      if (gi) gaits.set(n, gi);
    }
    mixer.stopAllAction();
    this.body = { root, mixer, clips, cur: '', act: null, mats, head, eyes, lastState: null, own, rig, rest, gaits, k: root.scale.x };
  }

  private playClip(name: string, opts: { once?: boolean; speed?: number; fade?: number } = {}): void {
    const b = this.body!;
    const clip = b.clips.get(name) ?? b.clips.get('idle');
    if (!clip) return;
    if (b.cur === name && b.act) {
      if (opts.speed !== undefined) b.act.timeScale = opts.speed;
      return;
    }
    const act = b.mixer.clipAction(clip);
    act.reset();
    act.setLoop(opts.once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    act.clampWhenFinished = !!opts.once;
    act.timeScale = opts.speed ?? 1;
    act.play();
    if (b.act) b.act.crossFadeTo(act, opts.fade ?? 0.22, false);
    b.act = act;
    b.cur = name;
  }

  /** Estado da máquina de combate -> clipe de captura de movimento, com o tempo do clipe casado ao do golpe. */
  private animateBody(dt: number, eyeHot: boolean): void {
    const b = this.body!;
    const c = this.cfg;
    const st = this.state;
    const dur = (n: string) => b.clips.get(n)?.duration ?? 1;
    const changed = st !== b.lastState;
    b.lastState = st;
    switch (st) {
      case 'idle':
      case 'recover':
        this.playClip(this.kind === 'veredito' ? 'listen' : 'idle', { speed: 0.8 });
        break;
      case 'chase': {
        const v = this.moveSpeed;
        if (this.kind === 'matriarca') {
          // a Matriarca não anda: paira, e o véu arrasta
          this.playClip('idle', { speed: 0.7 });
          break;
        }
        // velocidade do clipe = velocidade real / velocidade natural do corpo: o pé assenta onde pisa
        const gw = b.gaits.get('walk');
        const gr = b.gaits.get('run');
        if (gr && v > gr.nat * 0.75) this.playClip('run', { speed: THREE.MathUtils.clamp(v / gr.nat, 0.6, 1.8) });
        else if (gw) this.playClip('walk', { speed: THREE.MathUtils.clamp(v / gw.nat, 0.4, 2.4) });
        else this.playClip(v > 2.2 ? 'run' : 'walk', { speed: 1 });
        break;
      }
      case 'windup':
        if (this.style) {
          this.playClip('idle', { speed: 0.5, fade: 0.1 });
          break;
        }
        // o braço sobe durante a antecipação e desce no golpe: mesmo clipe, sem reinício
        if (changed) {
          b.cur = '';
          this.playClip('heavy', { once: true, speed: (dur('heavy') * 0.42) / c.windup, fade: 0.12 });
        }
        break;
      case 'strike':
        if (this.style) break;
        if (b.act && b.cur === 'heavy') b.act.timeScale = 1.5;
        else this.playClip('attack', { once: true, speed: 1.3 });
        break;
      case 'stunned':
        if (changed) {
          b.cur = '';
          this.playClip('hit', { once: true, speed: 0.9, fade: 0.08 });
        }
        break;
      case 'cast':
      case 'ring':
        if (changed) b.cur = '';
        this.playClip('cast', { once: true, speed: 1.1 });
        break;
      case 'recite':
        this.playClip('talk', { speed: 0.7 });
        break;
      case 'fase':
        if (changed) {
          b.cur = '';
          this.playClip('hit', { once: true, speed: 0.6, fade: 0.08 });
        }
        break;
      case 'dying':
        if (changed) {
          b.cur = '';
          this.playClip('die', { once: true, speed: dur('die') / 1.1, fade: 0.1 });
          for (const m of b.mats) {
            m.transparent = true;
            m.depthWrite = true;
          }
        }
        for (const m of b.mats) m.opacity = Math.max(0, 1 - Math.max(0, this.t - 0.35) / 0.55);
        break;
      default:
        break;
    }
    for (const [bn, r] of b.rest) {
      bn.quaternion.copy(r.q);
      bn.position.copy(r.p);
    }
    forceMixerWrite(b.mixer);
    b.mixer.update(dt);
    this.motion(dt);
    const em = this.flash > 0 ? 0xffffff : eyeHot ? BRAND.classicCrimson : c.tint;
    for (const m of b.mats) {
      m.emissive.set(em);
      m.emissiveIntensity = b.own ? (this.flash > 0 ? 0.9 : eyeHot ? 0.14 : 0) : this.flash > 0 ? 1.2 : eyeHot ? 0.25 : 0.1;
    }
    // olhos presos ao osso da cabeça, à frente do rosto
    if (b.head) {
      // só a cadeia até a cabeça; o resto do esqueleto o renderizador atualiza
      this.root.updateWorldMatrix(true, false);
      b.head.updateWorldMatrix(true, false);
      _hv.setFromMatrixPosition(b.head.matrixWorld);
      this.root.worldToLocal(_hv);
      const sc = c.scale;
      for (let i = 0; i < b.eyes.length; i++) b.eyes[i].position.set(_hv.x + (i ? 1 : -1) * 0.045 * sc, _hv.y + 0.07 * sc, _hv.z + 0.11 * sc);
    }
  }

  /** estilo de ataque do corpo do elenco (poses de antecipação, contato e recuperação) */
  private get style(): Estilo | null {
    return this.body?.own ? (ESTILOS[this.kind] ?? null) : null;
  }

  /** Camada procedural sobre o clipe: poses do golpe, trancos de impacto, urro de fase e o pairar da Matriarca. */
  private motion(dt: number): void {
    const b = this.body!;
    const rig = b.rig;
    const st = this.state;
    const t = this.t;
    const cfg = this.cfg;
    const sty = this.style;
    let pose: Pose | null = null;
    let w = 0;
    if (sty) {
      switch (st) {
        case 'chase':
          if (sty.guard) {
            pose = sty.guard;
            w = 0.55;
          }
          break;
        case 'windup': {
          // sobe até 78% do aviso e segura, tenso, até o golpe sair
          const hold = cfg.windup * 0.78;
          pose = sty.windup;
          w = smooth(t / hold);
          if (t > hold) rig.turn('Spine1', Math.sin(t * 55) * 0.018, 0, Math.sin(t * 47) * 0.014);
          break;
        }
        case 'strike': {
          // acelera até o contato, que cai no quadro do dano
          const k = Math.min(1, t / sty.impact);
          pose = mix(sty.windup, sty.strike, k * k);
          w = 1;
          break;
        }
        case 'recover': {
          const R = cfg.recover;
          pose = mix(sty.strike, sty.recover, span(t, 0, R * 0.35));
          w = 1 - span(t, R * 0.55, R);
          break;
        }
        case 'ring':
          if (sty.ring) {
            const wind = 1.15;
            if (t < wind) {
              pose = sty.ring.up;
              w = smooth(t / (wind * 0.7));
              if (t > wind * 0.7) rig.turn('Spine1', Math.sin(t * 50) * 0.02, 0, 0);
            } else {
              pose = mix(sty.ring.up, sty.ring.down, Math.min(1, (t - wind) / 0.1) ** 2);
              w = 1 - span(t, wind + 0.3, wind + 0.45);
            }
          }
          break;
        case 'cast':
          if (sty.cast) {
            pose = sty.cast;
            w = smooth(t / 0.45);
            // cada sopro sai com um tranco de peito
            rig.turn('Spine1', Math.max(0, Math.sin(t * 26)) * 0.06 * w, 0, 0);
          }
          break;
        default:
          break;
      }
    }
    if (st === 'recite') {
      pose = RECITA;
      w = smooth(t / 0.8);
      rig.turn('Spine1', Math.sin(t * 40) * 0.02 * w, 0, Math.sin(t * 33) * 0.015 * w);
    } else if (st === 'fase') {
      // recua com o golpe que abriu a fase, depois se ergue e urra
      pose = URRO;
      w = span(t, 0.3, 0.6) * (1 - span(t, 1.05, 1.3));
      if (t > 0.5 && t < 1.05) rig.turn('Head', Math.sin(t * 60) * 0.03, 0, 0);
    } else if (st === 'stunned' && b.own) {
      pose = TONTO;
      w = 0.7;
    }
    if (pose && w > 0.001) {
      applyPose(rig, pose, w);
      const hips = rig.get('Hips');
      if (hips && pose.drop) hips.position.y -= (pose.drop * w * (this.cfg.alt ?? 1.9) / 1.9) / b.k;
    }
    // Matriarca: pernas soltas sob o véu, corpo inclinado na direção do movimento
    if (this.kind === 'matriarca') {
      applyPose(rig, { lL: [0.06, -0.93, -0.36], sL: [0, -0.82, -0.57], lR: [-0.06, -0.93, -0.3], sR: [0, -0.85, -0.52] }, 0.75);
      rig.turn('Hips', Math.min(0.32, this.moveSpeed * 0.14), 0, 0);
    }
    // tranco de impacto: o tronco cede para longe do golpe e volta
    const fx = this.flX.update(dt);
    const fz = this.flZ.update(dt);
    if (fx || fz) {
      rig.turn('Spine', fx * 0.07, 0, fz * 0.05);
      rig.turn('Spine1', fx * 0.09, 0, fz * 0.06);
      rig.turn('Head', fx * 0.12, 0, fz * 0.08);
    }
  }

  get alive(): boolean {
    return this.state !== 'dying' && this.state !== 'dead';
  }
  get radius(): number {
    return 0.5 * this.cfg.scale;
  }
  get telegraphing(): boolean {
    return this.state === 'windup' || this.state === 'cast' || this.state === 'ring' || this.state === 'recite';
  }

  private set(s: EnemyState): void {
    this.state = s;
    this.t = 0;
  }

  /** Interrupção pelo pulso do Crivo. */
  stun(seconds: number): boolean {
    if (!this.alive) return false;
    const wasReciting = this.state === 'recite';
    if (this.cfg.boss && !wasReciting && this.state !== 'windup' && this.state !== 'cast' && this.state !== 'ring') {
      // chefes só cedem ao pulso quando estão se preparando
      this.flash = 0.3;
      return false;
    }
    this.set('stunned');
    this.t = -(wasReciting ? 4 : this.cfg.boss ? seconds * 0.6 : seconds) + 1;
    this.vulnerable = wasReciting ? 1.6 : 1.15;
    this.reciteProgress = 0;
    this.ring.visible = false;
    return true;
  }

  damage(amount: number, heavy: boolean, staggerOnHeavy: boolean): number {
    if (!this.alive) return 0;
    const dealt = Math.round(amount * this.vulnerable);
    this.hp -= dealt;
    this.flash = 0.18;
    this.aggro = true;
    {
      // tranco na direção do golpe: chefe cede pouco, comum cede muito, golpe firme dobra
      const dx = this.lastFrom.x - this.pos.x;
      const dz = this.lastFrom.z - this.pos.z;
      const c = Math.cos(this.yaw);
      const sn = Math.sin(this.yaw);
      const lx = dx * c - dz * sn;
      const lz = dx * sn + dz * c;
      const l = Math.hypot(lx, lz) || 1;
      const f = (this.cfg.boss ? 0.45 : 1) * (heavy ? 1.6 : 1);
      this.flX.kick((-lz / l) * 6 * f);
      this.flZ.kick((lx / l) * 4 * f);
    }
    this.bar.visible = !this.cfg.boss;
    this.poise += heavy ? 3 : 1;
    if (this.hp <= 0) {
      this.hp = 0;
      this.set('dying');
      this.ring.visible = false;
      this.bar.visible = false;
      this.onDeath?.();
      return dealt;
    }
    const canStagger = !this.cfg.boss && (this.poise >= this.cfg.poise || (heavy && staggerOnHeavy));
    if (canStagger && this.state !== 'stunned') {
      this.poise = 0;
      this.set('stunned');
      this.t = 0.45; // atordoamento curto
      this.ring.visible = false;
    }
    return dealt;
  }

  update(dt: number, c: EnemyCtx, cameraQuat: THREE.Quaternion, time: number): void {
    const cfg = this.cfg;
    const s = cfg.scale;
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt);
    this.attackCd = Math.max(0, this.attackCd - dt);
    this.lastFrom.copy(c.playerPos);
    const toP = new THREE.Vector3().subVectors(c.playerPos, this.pos);
    toP.y = 0;
    const dist = toP.length();
    const dir = dist > 0.001 ? toP.clone().multiplyScalar(1 / dist) : new THREE.Vector3(0, 0, 1);
    const face = (rate: number) => {
      const want = Math.atan2(dir.x, dir.z);
      let d = want - this.yaw;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      this.yaw += d * Math.min(1, dt * rate);
    };
    const move = (vx: number, vz: number) => {
      let nx = this.pos.x + vx * dt;
      let nz = this.pos.z + vz * dt;
      // separação entre criaturas
      for (const o of c.others) {
        if (o === this || !o.alive) continue;
        const dx = nx - o.pos.x;
        const dz = nz - o.pos.z;
        const d = Math.hypot(dx, dz);
        const min = this.radius + o.radius + 0.25;
        if (d < min && d > 0.001) {
          nx += (dx / d) * (min - d) * 0.5;
          nz += (dz / d) * (min - d) * 0.5;
        }
      }
      const r = resolveCircle(c.colliders, nx, nz, this.radius, this.pos.y);
      const g = c.groundAt(r.x, r.z, this.pos.y + 0.6);
      if (g === null || Math.abs(g - this.pos.y) > 0.9) return; // não cai em abismos nem sobe muros
      this.pos.set(r.x, g, r.z);
    };
    let ringOpacity = 0;
    let ringScale = 1;
    let eyeHot = 0;
    let swell = 1;
    let lean = 0;

    switch (this.state) {
      case 'idle': {
        this.wander += dt;
        const wx = this.home.x + Math.sin(this.wander * 0.4) * 1.6;
        const wz = this.home.z + Math.cos(this.wander * 0.31) * 1.6;
        const d = Math.hypot(wx - this.pos.x, wz - this.pos.z);
        if (d > 0.2) {
          move(((wx - this.pos.x) / d) * 0.6, ((wz - this.pos.z) / d) * 0.6);
          this.yaw = Math.atan2(wx - this.pos.x, wz - this.pos.z);
        }
        if (c.playerAlive && (dist < cfg.sight * 0.75 || this.aggro) && Math.abs(c.playerPos.y - this.pos.y) < 3) {
          this.aggro = true;
          this.set('chase');
          c.sfx('fiapo');
        }
        break;
      }
      case 'chase': {
        face(7);
        if (!c.playerAlive || dist > cfg.sight * 1.7) {
          this.aggro = false;
          this.set('idle');
          break;
        }
        this.castCd -= dt;
        this.ringCd -= dt;
        this.reciteCd -= dt;
        const hpF = this.hp / this.maxHp;
        if (this.kind === 'veredito' && hpF < 0.36 && this.reciteCd <= 0) {
          this.set('recite');
          this.reciteCd = 17;
          c.sfx('chefe');
          break;
        }
        if (cfg.mini && this.phase === 1 && hpF <= 0.5) {
          // segunda fase: mais rápido, antecipação mais curta, golpe mais pesado e o padrão próprio se intensifica.
          // Antes, um urro de 1,3 s: a mudança se vê no corpo antes de se sentir no dano
          this.phase = 2;
          this.cfg = { ...cfg, speed: cfg.speed * 1.25, windup: cfg.windup * 0.8, recover: cfg.recover * 0.7, dmg: Math.round(cfg.dmg * 1.15) };
          this.flash = 0.4;
          this.set('fase');
          this.flX.kick(-7);
          break;
        }
        if (cfg.boss && this.ringCd <= 0 && dist < 9 && (this.kind === 'eco' || hpF < 0.7) && (!cfg.mini || cfg.special === 'invoca' || this.phase === 2)) {
          this.set('ring');
          this.ringCd = this.kind === 'eco' ? 9 : cfg.mini ? (this.phase === 2 ? 7 : 10) : 8;
          c.sfx('fiapoAviso');
          break;
        }
        if (cfg.boss && !cfg.mini) {
          const stage = hpF < 0.33 ? 2 : hpF < 0.66 ? 1 : 0;
          if (stage > this.summoned) {
            this.summoned = stage;
            for (const sgn of [-1, 1]) c.summon('fiapo', this.pos.x + sgn * 2.4 * Math.cos(this.yaw), this.pos.z - sgn * 2.4 * Math.sin(this.yaw), this.group);
            c.sfx('chefe');
          }
        }
        if (cfg.ranged && this.castCd <= 0 && dist > 4.5) {
          this.set('cast');
          this.castCd = this.kind === 'veredito' ? 7 : cfg.special === 'coro' ? (this.phase === 2 ? 4.2 : 5.5) : 3.6;
          c.sfx('fiapoAviso');
          break;
        }
        if (dist < cfg.meleeRange && this.attackCd <= 0) {
          this.set('windup');
          this.strikeDir.copy(dir);
          c.sfx('fiapoAviso');
          break;
        }
        // a matriarca canta de longe, como os comuns de sopro
        const keeper = cfg.ranged && (!cfg.boss || cfg.mini);
        const keep = keeper ? 6.5 : cfg.meleeRange * 0.75;
        if (dist > keep) move(dir.x * cfg.speed, dir.z * cfg.speed);
        else if (keeper && dist < 4) move(-dir.x * cfg.speed * 0.7, -dir.z * cfg.speed * 0.7);
        else {
          // ronda lateral: dá ritmo e evita empilhamento
          const sgn = Math.sin(this.wander + this.bobPhase) > 0 ? 1 : -1;
          this.wander += dt * 0.6;
          move(-dir.z * sgn * cfg.speed * 0.45, dir.x * sgn * cfg.speed * 0.45);
        }
        break;
      }
      case 'windup': {
        face(3);
        if (this.t < cfg.windup * 0.75) this.strikeDir.copy(dir);
        const k = Math.min(1, this.t / cfg.windup);
        eyeHot = 1;
        swell = 1 + k * 0.22;
        lean = -0.22 * k;
        ringOpacity = 0.35 + 0.5 * k;
        ringScale = cfg.meleeRange * (0.5 + 0.5 * k);
        if (this.t >= cfg.windup) {
          this.set('strike');
          this.strikeHit = false;
          c.sfx('golpe');
        }
        break;
      }
      case 'strike': {
        const dur = 0.24;
        const sp = cfg.lunge / dur;
        move(this.strikeDir.x * sp, this.strikeDir.z * sp);
        lean = 0.4;
        eyeHot = 1;
        // o dano sai no quadro em que a pose chega ao contato, não no início do golpe
        const impact = this.style?.impact ?? 0;
        if (this.t >= impact && this.t - dt < impact && this.style?.quake) {
          c.shake(this.style.quake);
          c.sfx('impactoChao');
        }
        if (!this.strikeHit && this.t >= impact && dist < this.radius + 0.95 + (cfg.boss ? 0.8 : 0)) {
          this.strikeHit = true;
          c.hitPlayer(cfg.dmg, this.pos, 'golpe');
        }
        if (this.t >= dur) {
          // duelista: estocadas em cadeia (duas na primeira fase, três na segunda), cada uma com aviso curto
          if (cfg.special === 'combo' && this.combo < this.phase) {
            this.combo++;
            this.set('windup');
            this.t = cfg.windup * 0.45;
            this.strikeDir.copy(dir);
            c.sfx('fiapoAviso');
            break;
          }
          this.combo = 0;
          this.set('recover');
          this.attackCd = 0.6;
        }
        break;
      }
      case 'recover': {
        face(2);
        if (this.t >= cfg.recover) this.set('chase');
        break;
      }
      case 'cast': {
        face(6);
        const wind = this.kind === 'veredito' ? 0.75 : 0.95;
        eyeHot = 1;
        swell = 1 + Math.sin(this.t * 20) * 0.03;
        const coro = cfg.special === 'coro';
        const shots = this.kind === 'veredito' ? 3 : coro ? (this.phase === 2 ? 5 : 3) : 1;
        for (let i = 0; i < shots; i++) {
          const at = wind + i * (coro ? 0.12 : 0.36);
          if (this.t >= at && this.t - dt < at) {
            const from = this.pos.clone().setY(this.pos.y + 1.4 * s);
            const aim = new THREE.Vector3().subVectors(c.playerPos.clone().setY(c.playerPos.y + 1.0), from).normalize();
            // coro: leque de sopros, o do meio mira o jogador
            if (coro) aim.applyAxisAngle(_up, (i - (shots - 1) / 2) * 0.2);
            c.shoot(from, aim, cfg.dmg * (this.kind === 'veredito' ? 0.55 : 0.8), this.kind === 'veredito' ? 8 : 7.5);
            c.sfx('fiapo');
          }
        }
        if (this.t >= wind + shots * (coro ? 0.12 : 0.36) + 0.3) this.set('chase');
        break;
      }
      case 'ring': {
        // anel que se expande: saia do raio ou esquive através dele
        const wind = 1.15;
        const maxR = this.kind === 'eco' ? 5.2 : 6.5;
        eyeHot = 1;
        if (this.t < wind) {
          const k = this.t / wind;
          ringOpacity = 0.3 + 0.6 * k;
          ringScale = maxR;
          swell = 1 + k * 0.3;
          this.ringRadius = 0;
        } else {
          const k = (this.t - wind) / 0.45;
          if (this.t - dt < wind) {
            c.sfx('impactoChao');
            c.shake(0.5);
            if (dist < maxR && Math.abs(c.playerPos.y - this.pos.y) < 2) c.hitPlayer(cfg.dmg * 1.15, this.pos, 'anel');
          }
          ringOpacity = Math.max(0, 0.9 - k);
          ringScale = maxR * (1 + k * 0.2);
          if (k >= 1) this.set('recover');
        }
        break;
      }
      case 'recite': {
        // O Veredito recita: o pulso do Crivo interrompe. Se terminar, o dano é pesado.
        const total = 3.6;
        this.reciteProgress = Math.min(1, this.t / total);
        eyeHot = 1;
        swell = 1 + this.reciteProgress * 0.35;
        ringOpacity = 0.25 + 0.6 * this.reciteProgress;
        ringScale = 11;
        if (this.t >= total) {
          this.reciteProgress = 0;
          c.sfx('impactoChao');
          c.shake(0.9);
          if (dist < 11) c.hitPlayer(34, this.pos, 'anel');
          this.set('recover');
        }
        break;
      }
      case 'fase': {
        face(1.5);
        eyeHot = 1;
        swell = 1 + span(this.t, 0.3, 0.6) * 0.2;
        if (this.t >= 0.45 && this.t - dt < 0.45) {
          c.shake(0.6);
          c.sfx('chefe');
          if (cfg.special === 'invoca') {
            for (const sgn of [-1, 1]) c.summon('fiapo', this.pos.x + sgn * 2.4 * Math.cos(this.yaw), this.pos.z - sgn * 2.4 * Math.sin(this.yaw), this.group);
          }
          ringOpacity = 0.9;
          ringScale = 4;
        }
        if (this.t >= 1.3) {
          this.ringCd = 0;
          this.set('chase');
        }
        break;
      }
      case 'stunned': {
        lean = -0.3;
        swell = 0.92 + Math.sin(this.t * 30) * 0.02;
        if (this.t >= 1) {
          this.vulnerable = 1;
          this.set('chase');
        }
        break;
      }
      case 'dying': {
        const k = Math.min(1, this.t / 0.9);
        swell = 1 + k * 0.3;
        this.rig.scale.setScalar(s * Math.max(0.05, 1 - k * 0.85));
        (this.shroud.material as THREE.MeshStandardMaterial).opacity = 0.9 * (1 - k);
        for (const p of this.puffs) (p.s.material as THREE.SpriteMaterial).opacity = 0.5 * (1 - k);
        for (const e of this.eyes) e.scale.setScalar(Math.max(0.001, 1 - k * 1.5));
        for (const tb of this.tablets) tb.scale.setScalar(Math.max(0.001, 1 - k));
        if (k >= 1) {
          this.state = 'dead';
          this.root.visible = false;
        }
        break;
      }
      default:
        break;
    }

    // visual
    this.bobPhase += dt;
    const bob = Math.sin(this.bobPhase * 1.7) * 0.08 * s;
    // a Matriarca paira a meio metro do chão, sobe e desce devagar e só toca o chão ao morrer
    const hover = this.kind === 'matriarca' && this.body ? (this.alive ? 0.5 + Math.sin(this.bobPhase * 1.1) * 0.08 : 0.5 * Math.max(0, 1 - this.t / 0.8)) : 0;
    this.hoverY = approach(this.hoverY, hover, 3, dt);
    this.root.position.set(this.pos.x, this.pos.y + bob + 0.05 + this.hoverY, this.pos.z);
    this.root.rotation.y = this.yaw;
    this.shroud.scale.set(swell, 1 + (swell - 1) * 0.3, swell);
    this.shroud.rotation.y = Math.sin(time * 0.7 + this.bobPhase) * 0.08;
    if (this.body) {
      this.moveSpeed += ((dt > 0 ? this.pos.distanceTo(this.prevPos) / dt : 0) - this.moveSpeed) * Math.min(1, dt * 8);
      this.prevPos.copy(this.pos);
      this.animateBody(dt, eyeHot > 0);
    } else this.poseBody(dt, time, lean, eyeHot > 0);
    const sm = this.shroud.material as THREE.MeshStandardMaterial;
    sm.emissive.set(this.flash > 0 ? 0xffffff : eyeHot ? BRAND.classicCrimson : cfg.tint);
    sm.emissiveIntensity = this.flash > 0 ? 1.4 : eyeHot ? 0.3 : 0.08;
    const em = this.eyes[0].material as THREE.MeshBasicMaterial;
    em.color.set(eyeHot ? BRAND.classicCrimson : cfg.eye).multiplyScalar(eyeHot ? 3.2 : 2.2);
    for (const p of this.puffs) {
      p.a += dt * p.sp;
      p.s.position.set(Math.cos(p.a) * p.r, p.y + Math.sin(p.a * 1.3) * 0.12 * s, Math.sin(p.a) * p.r);
      p.s.scale.setScalar(p.base * swell * (1 + Math.sin(p.a * 2) * 0.12));
      (p.s.material as THREE.SpriteMaterial).rotation += dt * 0.3 * p.sp;
    }
    this.tablets.forEach((tb, i) => {
      const a = time * 0.6 + (i / this.tablets.length) * Math.PI * 2;
      const rr = (this.state === 'recite' ? 1.2 : 1.9) * s * 0.55;
      tb.position.set(Math.cos(a) * rr, (1.5 + Math.sin(a * 2 + i) * 0.25) * s, Math.sin(a) * rr);
      tb.rotation.set(Math.sin(a) * 0.3, -a + Math.PI / 2, 0);
    });
    const rm = this.ring.material as THREE.MeshBasicMaterial;
    rm.opacity = ringOpacity;
    this.ring.visible = ringOpacity > 0.01;
    this.ring.scale.setScalar(ringScale);
    this.ring.position.y = 0.06 - bob - this.hoverY;
    this.ring.rotation.z = -this.yaw;
    if (this.bar.visible) {
      this.bar.quaternion.copy(this.root.quaternion).invert().multiply(cameraQuat);
      const f = Math.max(0.001, this.hp / this.maxHp);
      this.barFill.scale.x = f;
      this.barFill.position.x = -0.44 * (1 - f);
    }
  }

  /** Pose do espectro por estado: antecipação legível antes de cada golpe, fluidez entre estados. */
  private poseBody(dt: number, time: number, lean: number, hot: boolean): void {
    const d = dt || 0.016;
    const t = this.t;
    const cfg = this.cfg;
    const sp = d > 0 ? this.pos.distanceTo(this.prevPos) / d : 0;
    this.prevPos.copy(this.pos);
    this.moveSpeed += (sp - this.moveSpeed) * Math.min(1, d * 8);
    const mv = Math.min(1, this.moveSpeed / 2.6);
    this.gait += d * (2 + mv * 4.5);
    const g = Math.sin(this.gait);
    const k = (x: number, a: number, b: number) => Math.min(1, Math.max(0, (x - a) / (b - a)));
    const sm = (x: number) => x * x * (3 - 2 * x);
    const T: Record<string, number> = {
      hipsRx: 0.12 + mv * 0.28,
      hipsY: 0,
      torsoRx: 0.16 + Math.sin(time * 1.3 + this.bobPhase) * 0.03,
      torsoRy: Math.sin(time * 0.6 + this.bobPhase) * 0.12,
      headRx: 0.1,
      headRy: Math.sin(time * 0.5 + this.bobPhase * 1.3) * 0.5 * (1 - mv),
      aLx: g * 0.55 * mv + Math.sin(time * 0.9) * 0.05,
      aRx: -g * 0.55 * mv + Math.sin(time * 0.9 + 1.5) * 0.05,
      aLz: 0.12 + mv * 0.05,
      aRz: -(0.12 + mv * 0.05),
      fLx: -0.35 - mv * 0.5,
      fRx: -0.35 - mv * 0.5,
      claw: 0.5,
      orb: 0,
      rate: 12,
    };
    switch (this.state) {
      case 'windup': {
        const w = sm(k(t, 0, cfg.windup));
        T.hipsRx = 0.1 - 0.15 * w;
        T.torsoRx = -0.4 * w;
        T.headRx = -0.35 * w;
        T.aLx = T.aRx = -(0.8 + 1.8 * w);
        T.aLz = 0.25 + 0.3 * w;
        T.aRz = -T.aLz;
        T.fLx = T.fRx = -0.5;
        T.claw = 0.5 - 0.9 * w;
        T.headRy = 0;
        T.rate = 16;
        break;
      }
      case 'strike': {
        const w = k(t, 0, 0.24);
        T.hipsRx = 0.55;
        T.torsoRx = 0.65 * w;
        T.headRx = 0.25;
        T.aLx = T.aRx = -2.6 + 2.7 * w;
        T.aLz = 0.15;
        T.aRz = -0.15;
        T.fLx = T.fRx = -0.15;
        T.claw = -0.5;
        T.headRy = 0;
        T.rate = 34;
        break;
      }
      case 'recover': {
        const w = sm(k(t, 0, this.cfg.recover));
        T.hipsRx = 0.4 - 0.25 * w;
        T.torsoRx = 0.45 - 0.25 * w;
        T.headRx = 0.35;
        T.aLx = T.aRx = 0.1 - 0.1 * w;
        T.claw = 0.2;
        T.rate = 8;
        break;
      }
      case 'cast': {
        const w = sm(k(t, 0, 0.8));
        T.hipsRx = 0;
        T.torsoRx = -0.12 * w;
        T.headRx = -0.18 * w;
        T.aLx = T.aRx = -1.3 * w;
        T.aLz = 0.3 + 0.3 * w;
        T.aRz = -T.aLz;
        T.fLx = T.fRx = -0.55;
        T.claw = 0.1;
        T.orb = w * (0.55 + Math.sin(t * 28) * 0.04);
        T.headRy = 0;
        break;
      }
      case 'ring': {
        const wind = 1.15;
        const up = sm(k(t, 0, wind));
        const slam = k(t, wind, wind + 0.12);
        T.hipsRx = 0.1 + 0.5 * slam;
        T.torsoRx = -0.3 * up + 0.95 * slam;
        T.headRx = -0.4 * up + 0.5 * slam;
        T.aLx = T.aRx = -2.8 * up * (1 - slam) + 0.3 * slam;
        T.aLz = 0.5;
        T.aRz = -0.5;
        T.fLx = T.fRx = -0.3;
        T.claw = -0.2;
        T.hipsY = -0.2 * slam;
        T.headRy = 0;
        T.rate = slam > 0 ? 38 : 14;
        break;
      }
      case 'recite': {
        const w = sm(k(t, 0, 0.8));
        T.hipsRx = -0.05;
        T.torsoRx = -0.35 * w;
        T.headRx = -0.5 * w;
        T.aLx = T.aRx = -2.2 * w;
        T.aLz = 0.9 * w;
        T.aRz = -T.aLz;
        T.fLx = T.fRx = -0.35;
        T.claw = -0.3;
        T.headRy = Math.sin(t * 6) * 0.15;
        break;
      }
      case 'stunned': {
        const sh = Math.sin(t * 38) * 0.04;
        T.hipsRx = 0.45;
        T.torsoRx = 0.6 + sh;
        T.headRx = 0.6;
        T.headRy = sh * 4;
        T.aLx = T.aRx = 0.25;
        T.aLz = 0.35;
        T.aRz = -0.35;
        T.fLx = T.fRx = -0.15;
        T.claw = 0.9;
        T.rate = 20;
        break;
      }
      case 'dying': {
        const w = sm(k(t, 0, 0.8));
        T.hipsRx = 0.9 * w;
        T.torsoRx = 1.0 * w;
        T.headRx = 0.9 * w;
        T.hipsY = -0.45 * w;
        T.aLx = T.aRx = 0.3;
        T.aLz = 0.7;
        T.aRz = -0.7;
        T.claw = 1;
        T.rate = 9;
        break;
      }
      default:
        break;
    }
    // aviso do golpe é de postura; o lean antigo ainda soma um pouco (inclinação do avanço)
    T.hipsRx += lean * 0.25;
    const f = Math.min(1, d * T.rate);
    const z = this.pz;
    const set = (key: string, v: number): number => (z[key] = (z[key] ?? v) + (v - (z[key] ?? v)) * f);
    this.hips.position.y = (this.cfg.scale > 0 ? (this.kind === 'fiapo' ? 0.98 : 1.06) : 1) + set('hipsY', T.hipsY);
    this.hips.rotation.x = set('hipsRx', T.hipsRx);
    this.torso.rotation.set(set('torsoRx', T.torsoRx) - this.hips.rotation.x * 0.4, set('torsoRy', T.torsoRy), 0);
    this.head.rotation.set(set('headRx', T.headRx), set('headRy', T.headRy), 0);
    const [L, R] = this.arms;
    L.up.rotation.set(set('aLx', T.aLx), 0, set('aLz', T.aLz));
    R.up.rotation.set(set('aRx', T.aRx), 0, set('aRz', T.aRz));
    L.fore.rotation.x = set('fLx', T.fLx);
    R.fore.rotation.x = set('fRx', T.fRx);
    const curl = set('claw', T.claw);
    for (const a of this.arms) a.fingers.forEach((fg, i) => (fg.rotation.x = curl * (0.8 + (i % 2) * 0.25)));
    // fitas de manto seguem o movimento
    this.strips.forEach((st, i) => {
      st.rotation.x = 0.12 + mv * 0.5 + Math.sin(time * 2.1 + i * 1.3) * 0.08 + (this.state === 'strike' ? 0.5 : 0);
      st.rotation.z = Math.sin(time * 1.7 + i) * 0.06;
    });
    const o = set('orb', T.orb);
    this.orb.scale.setScalar(Math.max(0.001, o));
    this.orb.visible = o > 0.02;
    this.orb.position.set(0, 1.35, 0.6);
    void hot;
  }
}

/** Sopro de névoa: projétil lento e reto, esquivável andando de lado. */
export class Projectile {
  mesh: THREE.Group;
  life = 4.5;
  constructor(
    public pos: THREE.Vector3,
    public dir: THREE.Vector3,
    public dmg: number,
    public speed: number,
  ) {
    glowTex ??= glowSprite(64, 'rgba(255,255,255,1)', 'rgba(255,255,255,0)');
    smokeTex ??= smokeSprite(128, 3);
    this.mesh = new THREE.Group();
    const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(BRAND.classicCrimson).multiplyScalar(2.4), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    core.scale.setScalar(0.9);
    const smoke = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, color: 0x4a3a5a, transparent: true, opacity: 0.7, depthWrite: false }));
    smoke.scale.setScalar(1.3);
    this.mesh.add(smoke, core);
    this.mesh.position.copy(pos);
  }
  /** os dois materiais são próprios de cada projétil (as texturas, não): sem isto acumulam na GPU */
  dispose(): void {
    for (const c of this.mesh.children) ((c as THREE.Sprite).material as THREE.Material).dispose();
  }
  update(dt: number): void {
    this.pos.addScaledVector(this.dir, this.speed * dt);
    this.mesh.position.copy(this.pos);
    this.life -= dt;
    ((this.mesh.children[0] as THREE.Sprite).material as THREE.SpriteMaterial).rotation += dt * 3;
  }
}
