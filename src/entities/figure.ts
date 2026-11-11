import * as THREE from 'three';
import { M } from '../world/mats';

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
  staff?: boolean;
  satchel?: boolean;
  build?: number;
  apron?: number | null;
  beard?: boolean;
  hat?: boolean;
}

export type Action = 'none' | 'attack1' | 'attack2' | 'heavy' | 'dodge' | 'hit' | 'die' | 'interact' | 'cast' | 'talk' | 'sit';

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
  staff: THREE.Group | null = null;
  staffTip = new THREE.Object3D();
  staffGlow: THREE.Mesh | null = null;
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

  constructor(o: FigureOpts) {
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
    this.body.scale.setScalar(k);
    this.hips.position.y = 0.93;
    this.body.add(this.hips);

    // pernas
    for (const [leg, shin, sx] of [
      [this.legL, this.shinL, 1],
      [this.legR, this.shinR, -1],
    ] as Array<[THREE.Group, THREE.Group, number]>) {
      leg.position.set(sx * 0.095 * w, 0, 0);
      this.hips.add(leg);
      add(leg, new THREE.CapsuleGeometry(0.075 * w, 0.32, 4, 8), trousers, 0, -0.225, 0);
      shin.position.y = -0.45;
      leg.add(shin);
      add(shin, new THREE.CapsuleGeometry(0.058 * w, 0.3, 4, 8), trousers, 0, -0.2, 0);
      add(shin, new THREE.CapsuleGeometry(0.066 * w, 0.14, 4, 8), boot, 0, -0.33, 0);
      const foot = add(shin, new THREE.BoxGeometry(0.1 * w, 0.07, 0.25), boot, 0, -0.445, 0.055);
      foot.geometry.translate(0, 0, 0);
    }

    // saia do casaco: tronco de cone aberto, achatado
    const coatLen = 0.62;
    const skirtProfile = [new THREE.Vector2(0.17 * w, 0.06), new THREE.Vector2(0.2 * w, -0.1), new THREE.Vector2(0.25 * w, -coatLen * 0.6), new THREE.Vector2(0.29 * w, -coatLen)];
    this.skirt = add(this.hips, new THREE.LatheGeometry(skirtProfile, 14), coat);
    this.skirt.scale.z = 0.78;

    // tronco
    this.torso.position.y = 0.02;
    this.hips.add(this.torso);
    const torsoProfile = [
      new THREE.Vector2(0.165 * w, 0),
      new THREE.Vector2(0.18 * w, 0.12),
      new THREE.Vector2(0.205 * w, 0.34),
      new THREE.Vector2(0.21 * w, 0.44),
      new THREE.Vector2(0.15 * w, 0.52),
      new THREE.Vector2(0.065, 0.56),
    ];
    const tm = add(this.torso, new THREE.LatheGeometry(torsoProfile, 14), coat);
    tm.scale.z = 0.7;
    // botões e gola
    for (let i = 0; i < 4; i++) add(this.torso, new THREE.SphereGeometry(0.013, 6, 5), M.bronze, 0, 0.1 + i * 0.09, 0.132 + (i > 2 ? 0.006 : 0.012 * i * 0.5));
    add(this.torso, new THREE.CylinderGeometry(0.05, 0.06, 0.1, 10), skin, 0, 0.59, 0);
    if (o.scarf != null) {
      const sm = cloth(o.scarf, 0.95);
      this.mats.push(sm);
      const sc = add(this.torso, new THREE.TorusGeometry(0.085, 0.042, 8, 16), sm, 0, 0.555, 0.005);
      sc.rotation.x = Math.PI / 2;
      sc.scale.set(1, 0.85, 1);
      const tail = add(this.torso, new THREE.BoxGeometry(0.08, 0.34, 0.03), sm, 0.05, 0.38, 0.14);
      tail.rotation.z = -0.08;
    }
    if (o.apron != null) {
      const am = cloth(o.apron, 0.9);
      this.mats.push(am);
      add(this.torso, new THREE.BoxGeometry(0.27 * w, 0.3, 0.02), am, 0, 0.22, 0.142);
      add(this.hips, new THREE.BoxGeometry(0.3 * w, 0.42, 0.02), am, 0, -0.2, 0.185).rotation.x = -0.1;
    }
    if (o.cape != null) {
      const cm = cloth(o.cape, 0.9);
      this.mats.push(cm);
      const capeProfile = [new THREE.Vector2(0.1, 0.54), new THREE.Vector2(0.235 * w, 0.47), new THREE.Vector2(0.27 * w, 0.2), new THREE.Vector2(0.31 * w, -0.25), new THREE.Vector2(0.33 * w, -0.5)];
      this.cape = add(this.torso, new THREE.LatheGeometry(capeProfile, 14, Math.PI * 0.42, Math.PI * 1.16), cm);
      this.cape.scale.z = 0.86;
    }
    if (o.satchel) {
      add(this.hips, new THREE.BoxGeometry(0.2, 0.17, 0.08), M.wood, -0.24 * w, -0.02, -0.02);
      const strap = add(this.torso, new THREE.BoxGeometry(0.035, 0.66, 0.02), M.wood, 0, 0.26, 0.135);
      strap.rotation.z = 0.62;
    }

    // cabeça
    this.head.position.y = 0.7;
    this.torso.add(this.head);
    const hm = add(this.head, new THREE.SphereGeometry(0.108, 16, 14), skin);
    hm.scale.set(0.92, 1.14, 1);
    const eyeM = new THREE.MeshStandardMaterial({ color: 0x15100e, roughness: 0.3 });
    for (const sx of [-1, 1]) {
      add(this.head, new THREE.SphereGeometry(0.013, 6, 5), eyeM, sx * 0.037, 0.012, 0.098);
      const brow = add(this.head, new THREE.BoxGeometry(0.04, 0.008, 0.01), hairM, sx * 0.038, 0.04, 0.1);
      brow.rotation.z = sx * -0.12;
    }
    add(this.head, new THREE.ConeGeometry(0.017, 0.045, 5), skin, 0, -0.012, 0.108).rotation.x = Math.PI / 2.4;
    const style = o.hairStyle ?? 'curto';
    if (style === 'capuz') {
      const hood = add(this.head, new THREE.SphereGeometry(0.145, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.72), coat, 0, 0.0, -0.02);
      hood.scale.set(1, 1.12, 1.1);
      hood.rotation.x = -0.35;
    } else if (style !== 'calvo') {
      const cap = add(this.head, new THREE.SphereGeometry(0.115, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM, 0, 0.012, -0.012);
      cap.scale.set(0.98, 1.15, 1.06);
      cap.rotation.x = -0.32;
      if (style === 'coque') add(this.head, new THREE.SphereGeometry(0.05, 10, 8), hairM, 0, 0.09, -0.1);
      if (style === 'longo') {
        const back = add(this.head, new THREE.CapsuleGeometry(0.085, 0.16, 4, 8), hairM, 0, -0.1, -0.06);
        back.scale.set(1.1, 1, 0.6);
      }
    }
    if (o.beard) {
      const bd = add(this.head, new THREE.SphereGeometry(0.075, 10, 8), hairM, 0, -0.085, 0.045);
      bd.scale.set(1, 1.1, 0.8);
    }
    if (o.hat) {
      add(this.head, new THREE.CylinderGeometry(0.2, 0.2, 0.012, 16), M.clothDark, 0, 0.1, 0);
      add(this.head, new THREE.CylinderGeometry(0.1, 0.115, 0.1, 14), M.clothDark, 0, 0.15, 0);
    }

    // braços
    for (const [arm, fore, sx] of [
      [this.armL, this.foreL, 1],
      [this.armR, this.foreR, -1],
    ] as Array<[THREE.Group, THREE.Group, number]>) {
      arm.position.set(sx * 0.21 * w, 0.48, 0);
      this.torso.add(arm);
      add(arm, new THREE.SphereGeometry(0.068 * w, 10, 8), coat, 0, 0, 0);
      add(arm, new THREE.CapsuleGeometry(0.052 * w, 0.2, 4, 8), coat, 0, -0.145, 0);
      fore.position.y = -0.29;
      arm.add(fore);
      add(fore, new THREE.CapsuleGeometry(0.045 * w, 0.2, 4, 8), coat, 0, -0.12, 0);
      add(fore, new THREE.SphereGeometry(0.042, 8, 7), skin, 0, -0.275, 0);
    }

    if (o.staff) {
      const st = (this.staff = new THREE.Group());
      st.position.set(0, -0.275, 0);
      this.foreR.add(st);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 1.75, 7), M.woodDark);
      shaft.position.y = -0.02;
      shaft.castShadow = true;
      st.add(shaft);
      const ferr = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.016, 0.07, 7), M.bronze);
      ferr.position.y = -0.88;
      st.add(ferr);
      // ponteira-lanterna
      const cage = new THREE.Mesh(new THREE.OctahedronGeometry(0.075, 0), new THREE.MeshStandardMaterial({ color: 0x7a5a2a, metalness: 0.8, roughness: 0.4, wireframe: true }));
      cage.position.y = 0.95;
      st.add(cage);
      const glow = (this.staffGlow = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffc27a).multiplyScalar(2.6) })));
      glow.position.y = 0.95;
      st.add(glow);
      this.staffTip.position.y = 0.95;
      st.add(this.staffTip);
    }
    this.pose(0);
  }

  play(a: Action): void {
    this.action = a;
    this.actionT = 0;
  }

  get busy(): boolean {
    return this.action !== 'none' && this.action !== 'talk' && this.action !== 'sit';
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

  update(dt: number): void {
    this.phase += dt * (2.2 + this.speed * 1.55);
    this.breathe += dt;
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
    let hipsRz = 0;
    let torsoRx = sp * 0.1;
    let torsoRy = moving ? -s * 0.14 * stride : 0;
    let torsoRz = 0;
    let headRx = -sp * 0.12;
    let lLx = -s * 0.78 * stride;
    let rLx = s * 0.78 * stride;
    let lSx = Math.max(0, c) * 1.25 * stride + (moving ? 0.1 : 0.04);
    let rSx = Math.max(0, -c) * 1.25 * stride + (moving ? 0.1 : 0.04);
    let aLx = s * 0.62 * stride;
    let aLz = 0.1;
    let fLx = -0.18 - sp * 0.7;
    // braço direito: segura o cajado
    const hasStaff = !!this.staff;
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
        const k = Math.sin(t * 2.6) * 0.5 + 0.5;
        aLx = -0.5 - 0.35 * k;
        fLx = -1.1 + 0.3 * Math.sin(t * 3.4);
        aLz = 0.25;
        headRx = Math.sin(t * 2) * 0.04;
        torsoRy = Math.sin(t * 1.3) * 0.05;
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

    this.hips.position.y = hipsY;
    this.hips.rotation.set(hipsRx, hipsRy, hipsRz);
    this.torso.rotation.set(torsoRx - hipsRx * 0.5, torsoRy, torsoRz);
    // olhar para um alvo (NPCs em conversa)
    const targetLook = this.lookTarget ?? 0;
    this.lookYaw += (targetLook - this.lookYaw) * Math.min(1, (dt || 0.016) * 5);
    this.head.rotation.set(headRx, THREE.MathUtils.clamp(this.lookYaw, -1.1, 1.1) - torsoRy * 0.6, 0);
    this.legL.rotation.x = lLx - hipsRx;
    this.legR.rotation.x = rLx - hipsRx;
    this.shinL.rotation.x = lSx;
    this.shinR.rotation.x = rSx;
    this.armL.rotation.set(aLx, 0, aLz);
    this.armR.rotation.set(aRx, aRy, aRz, 'YXZ');
    this.foreL.rotation.x = fLx;
    this.foreR.rotation.x = fRx;
    if (this.staff) this.staff.rotation.set(stW - aRx - fRx, 0, stRz);
    this.skirt.rotation.x = skirtRx - hipsRx * 0.6;
    if (this.cape) this.cape.rotation.x = capeRx;
    this.body.rotation.x = rootRx;
    this.body.position.y = rootY;
  }
}
