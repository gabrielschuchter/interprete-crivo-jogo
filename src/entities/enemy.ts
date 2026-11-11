import * as THREE from 'three';
import { smokeSprite, glowSprite } from '../world/textures';
import { BRAND } from '../world/palette';
import type { Collider } from '../world/builder';
import { resolveCircle } from '../world/region';

/**
 * Criaturas da Névoa. Linguagem fantástica: não representam pessoas, escolas
 * metodológicas nem resultados científicos (documento-matriz, seção 6).
 * Todo ataque tem aviso legível (olhos vermelhos + anel no chão) antes do golpe.
 */
export type EnemyKind = 'fiapo' | 'vulto' | 'eco' | 'veredito';

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
}

export const ENEMY_CFG: Record<EnemyKind, Cfg> = {
  fiapo: { name: 'Fiapo da Névoa', hp: 46, speed: 2.7, scale: 1, sight: 12, meleeRange: 2.1, windup: 0.62, lunge: 2.8, dmg: 12, recover: 1.0, xp: 14, coins: [2, 5], tint: 0x5f7f78, eye: 0x7fffd0, poise: 1 },
  vulto: { name: 'Vulto', hp: 96, speed: 2.1, scale: 1.35, sight: 16, meleeRange: 2.3, windup: 0.8, lunge: 2.2, dmg: 16, recover: 1.2, xp: 32, coins: [6, 10], ranged: true, tint: 0x4a5f7a, eye: 0x9fd0ff, poise: 3 },
  eco: { name: 'O Eco', hp: 340, speed: 2.9, scale: 1.9, sight: 30, meleeRange: 2.9, windup: 0.7, lunge: 3.4, dmg: 18, recover: 1.0, xp: 130, coins: [30, 40], boss: true, tint: 0x7a6a4a, eye: 0xffd28a, poise: 99 },
  veredito: { name: 'O Veredito', hp: 760, speed: 2.4, scale: 2.7, sight: 60, meleeRange: 3.9, windup: 0.85, lunge: 3.0, dmg: 20, recover: 1.1, xp: 320, coins: [60, 60], boss: true, ranged: true, tint: 0x4a3a5a, eye: 0xff5a6a, poise: 99 },
};

export type EnemyState = 'idle' | 'chase' | 'windup' | 'strike' | 'recover' | 'stunned' | 'cast' | 'ring' | 'recite' | 'dying' | 'dead';

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
  onDeath: (() => void) | null = null;

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

    // manto: cone rasgado de névoa densa
    const g = new THREE.ConeGeometry(0.55 * s, 1.9 * s, 12, 6, true);
    const p = g.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      const yy = p.getY(i);
      const k = 0.5 - yy / (1.9 * s);
      const a = Math.atan2(p.getZ(i), p.getX(i));
      const rag = 1 + Math.sin(a * 5 + yy * 3) * 0.16 * k + Math.sin(a * 9) * 0.08 * k;
      p.setX(i, p.getX(i) * rag);
      p.setZ(i, p.getZ(i) * rag);
      if (k > 0.92) p.setY(i, yy + Math.sin(a * 7) * 0.16 * s);
    }
    g.computeVertexNormals();
    const sm = new THREE.MeshStandardMaterial({ color: new THREE.Color(c.tint).multiplyScalar(0.28), roughness: 1, transparent: true, opacity: 0.9, side: THREE.DoubleSide, emissive: c.tint, emissiveIntensity: 0.08 });
    this.shroud = new THREE.Mesh(g, sm);
    this.shroud.position.y = 1.15 * s;
    this.shroud.castShadow = true;
    this.root.add(this.shroud);

    const n = kind === 'veredito' ? 22 : kind === 'eco' ? 16 : 10;
    for (let i = 0; i < n; i++) {
      const m = new THREE.SpriteMaterial({ map: smokeTex, color: c.tint, transparent: true, opacity: 0.5, depthWrite: false, rotation: Math.random() * 6 });
      const sp = new THREE.Sprite(m);
      const base = (0.7 + Math.random() * 0.9) * s;
      sp.scale.setScalar(base);
      this.root.add(sp);
      this.puffs.push({ s: sp, a: Math.random() * 6.28, r: (0.2 + Math.random() * 0.45) * s, y: (0.2 + Math.random() * 1.7) * s, sp: 0.4 + Math.random() * 1.2, base });
    }
    const eyeM = new THREE.MeshBasicMaterial({ color: new THREE.Color(c.eye).multiplyScalar(2.2) });
    for (const sx of [-1, 1]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.05 * s, 8, 6), eyeM);
      e.position.set(sx * 0.13 * s, 1.72 * s, 0.3 * s);
      e.scale.set(1.5, 0.7, 1);
      this.root.add(e);
      this.eyes.push(e);
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
        if (cfg.boss && this.ringCd <= 0 && dist < 9 && (this.kind === 'eco' || hpF < 0.7)) {
          this.set('ring');
          this.ringCd = this.kind === 'eco' ? 9 : 8;
          c.sfx('fiapoAviso');
          break;
        }
        if (cfg.boss) {
          const stage = hpF < 0.33 ? 2 : hpF < 0.66 ? 1 : 0;
          if (stage > this.summoned) {
            this.summoned = stage;
            for (const sgn of [-1, 1]) c.summon('fiapo', this.pos.x + sgn * 2.4 * Math.cos(this.yaw), this.pos.z - sgn * 2.4 * Math.sin(this.yaw), this.group);
            c.sfx('chefe');
          }
        }
        if (cfg.ranged && this.castCd <= 0 && dist > 4.5) {
          this.set('cast');
          this.castCd = this.kind === 'veredito' ? 7 : 3.6;
          c.sfx('fiapoAviso');
          break;
        }
        if (dist < cfg.meleeRange && this.attackCd <= 0) {
          this.set('windup');
          this.strikeDir.copy(dir);
          c.sfx('fiapoAviso');
          break;
        }
        const keep = cfg.ranged && !cfg.boss ? 6.5 : cfg.meleeRange * 0.75;
        if (dist > keep) move(dir.x * cfg.speed, dir.z * cfg.speed);
        else if (cfg.ranged && !cfg.boss && dist < 4) move(-dir.x * cfg.speed * 0.7, -dir.z * cfg.speed * 0.7);
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
        if (!this.strikeHit && dist < this.radius + 0.95 + (cfg.boss ? 0.8 : 0)) {
          this.strikeHit = true;
          c.hitPlayer(cfg.dmg, this.pos, 'golpe');
        }
        if (this.t >= dur) {
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
        const shots = this.kind === 'veredito' ? 3 : 1;
        for (let i = 0; i < shots; i++) {
          const at = wind + i * 0.36;
          if (this.t >= at && this.t - dt < at) {
            const from = this.pos.clone().setY(this.pos.y + 1.4 * s);
            const aim = new THREE.Vector3().subVectors(c.playerPos.clone().setY(c.playerPos.y + 1.0), from).normalize();
            c.shoot(from, aim, cfg.dmg * (this.kind === 'veredito' ? 0.55 : 0.8), this.kind === 'veredito' ? 8 : 7.5);
            c.sfx('fiapo');
          }
        }
        if (this.t >= wind + shots * 0.36 + 0.3) this.set('chase');
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
        swell = 1 + k * 0.8;
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
    this.root.position.set(this.pos.x, this.pos.y + bob + 0.05, this.pos.z);
    this.root.rotation.y = this.yaw;
    this.shroud.scale.set(swell, 1 + (swell - 1) * 0.5, swell);
    this.shroud.rotation.x = lean;
    this.shroud.rotation.y = Math.sin(time * 0.7 + this.bobPhase) * 0.3;
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
    this.ring.position.y = 0.06 - bob;
    this.ring.rotation.z = -this.yaw;
    if (this.bar.visible) {
      this.bar.quaternion.copy(this.root.quaternion).invert().multiply(cameraQuat);
      const f = Math.max(0.001, this.hp / this.maxHp);
      this.barFill.scale.x = f;
      this.barFill.position.x = -0.44 * (1 - f);
    }
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
  update(dt: number): void {
    this.pos.addScaledVector(this.dir, this.speed * dt);
    this.mesh.position.copy(this.pos);
    this.life -= dt;
    ((this.mesh.children[0] as THREE.Sprite).material as THREE.SpriteMaterial).rotation += dt * 3;
  }
}
