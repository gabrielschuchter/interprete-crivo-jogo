import * as THREE from 'three';
import { Figure, SKINS, HAIRS } from './figure';
import type { Input } from '../core/input';
import type { BuiltRegion } from '../world/region';
import { groundAt, resolveCircle, pointBlocked } from '../world/region';
import type { Stats, Look } from '../domain/state';
import { PROFESSIONS, COAT_COLORS } from '../content/data';
import type { Emblem } from './figure';

const EMBLEM: Record<string, Emblem> = { nutricao: 'caderno', medicina: 'estetoscopio', enfermagem: 'relogio', psicologia: 'oculos', fisioterapia: 'fita' };
import { BRAND } from '../world/palette';

/** Rastro luminoso do cajado: leitura clara do golpe (Atlas H-06). */
class Trail {
  mesh: THREE.Mesh;
  private pts: Array<{ a: THREE.Vector3; b: THREE.Vector3; t: number }> = [];
  private geo = new THREE.BufferGeometry();
  private static N = 14;
  constructor() {
    const n = Trail.N;
    this.geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 2 * 3), 3));
    this.geo.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array(n * 2), 1));
    const idx: number[] = [];
    for (let i = 0; i < n - 1; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    this.geo.setIndex(idx);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(0xffc27a).multiplyScalar(2.2) } },
      vertexShader: `attribute float alpha; varying float vA; void main(){ vA = alpha; gl_Position = projectionMatrix * viewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 uColor; varying float vA; void main(){ gl_FragColor = vec4(uColor, vA * 0.75); }`,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    this.mesh = new THREE.Mesh(this.geo, mat);
    this.mesh.frustumCulled = false;
  }
  push(a: THREE.Vector3, b: THREE.Vector3): void {
    this.pts.unshift({ a: a.clone(), b: b.clone(), t: 0 });
    if (this.pts.length > Trail.N) this.pts.pop();
  }
  update(dt: number): void {
    const pos = this.geo.getAttribute('position') as THREE.BufferAttribute;
    const al = this.geo.getAttribute('alpha') as THREE.BufferAttribute;
    for (const p of this.pts) p.t += dt;
    this.pts = this.pts.filter((p) => p.t < 0.22);
    for (let i = 0; i < Trail.N; i++) {
      const p = this.pts[Math.min(i, this.pts.length - 1)];
      if (!p) {
        pos.setXYZ(i * 2, 0, -999, 0);
        pos.setXYZ(i * 2 + 1, 0, -999, 0);
        al.setX(i * 2, 0);
        al.setX(i * 2 + 1, 0);
        continue;
      }
      pos.setXYZ(i * 2, p.a.x, p.a.y, p.a.z);
      pos.setXYZ(i * 2 + 1, p.b.x, p.b.y, p.b.z);
      const a = i < this.pts.length ? Math.max(0, 1 - p.t / 0.22) : 0;
      al.setX(i * 2, a);
      al.setX(i * 2 + 1, a * 0.2);
    }
    pos.needsUpdate = true;
    al.needsUpdate = true;
  }
}

export interface AttackEvent {
  heavy: boolean;
  origin: THREE.Vector3;
  dir: THREE.Vector3;
  range: number;
  arc: number;
}

export class Player {
  fig: Figure;
  pos = new THREE.Vector3();
  yaw = Math.PI;
  vel = new THREE.Vector3();
  vigor = 100;
  iframes = 0;
  private dodgeT = 0;
  private dodgeDir = new THREE.Vector3();
  private comboNext = 1;
  private attackQueued: 'leve' | 'firme' | null = null;
  private attackFired = false;
  private vigorDelay = 0;
  private stepAcc = 0;
  private hurtT = 0;
  dead = false;
  light = new THREE.PointLight(0xffb060, 9, 9, 1.8);
  trail = new Trail();
  camYaw = Math.PI;
  camPitch = 0.22;
  camDist = 4.6;
  private camCur = new THREE.Vector3();
  private camInit = false;
  lockTarget: { pos: THREE.Vector3; alive: boolean; radius: number } | null = null;
  frozen = false;
  onStep: (() => void) | null = null;
  onAttack: ((e: AttackEvent) => void) | null = null;
  onSwing: ((heavy: boolean) => void) | null = null;
  onDodge: (() => void) | null = null;
  sensitivity = 1;
  invertY = false;
  /** velocidade horizontal atual, para o Crivo e a interface */
  speed = 0;
  /** queda em abismo */
  falling = false;
  onFall: (() => void) | null = null;
  lastSafe = new THREE.Vector3();

  constructor(look: Look, profession: string) {
    const prof = PROFESSIONS.find((p) => p.id === profession) ?? PROFESSIONS[5];
        this.fig = new Figure({
      skin: SKINS[look.skin % SKINS.length],
      hair: HAIRS[look.hair % HAIRS.length],
      hairStyle: (['curto', 'coque', 'longo', 'capuz'] as const)[Math.floor(look.hair / HAIRS.length) % 4] ?? 'curto',
      coat: COAT_COLORS[look.coat % COAT_COLORS.length],
      emblem: EMBLEM[prof.id] ?? null,
      scarf: new THREE.Color(BRAND.darkAmaranth).getHex(),
      cape: new THREE.Color(COAT_COLORS[look.coat % COAT_COLORS.length]).lerp(new THREE.Color(BRAND.darkAmaranth), 0.45).multiplyScalar(0.95).getHex(),
      staff: true,
      satchel: true,
    });
    this.light.castShadow = false;
  }

  addTo(scene: THREE.Scene): void {
    scene.add(this.fig.root, this.light, this.trail.mesh);
  }
  removeFrom(scene: THREE.Scene): void {
    scene.remove(this.fig.root, this.light, this.trail.mesh);
  }

  teleport(x: number, y: number, z: number, yaw: number): void {
    this.pos.set(x, y, z);
    this.lastSafe.copy(this.pos);
    this.yaw = yaw;
    this.camYaw = yaw + Math.PI;
    this.camPitch = 0.2;
    this.vel.set(0, 0, 0);
    this.camInit = false;
    this.falling = false;
    this.fig.root.position.copy(this.pos);
    this.fig.root.rotation.y = yaw;
  }

  get dodging(): boolean {
    return this.dodgeT > 0;
  }

  hurt(): void {
    this.hurtT = 0.36;
    if (!this.fig.busy || this.fig.action === 'hit') this.fig.play('hit');
  }

  die(): void {
    this.dead = true;
    this.fig.play('die');
  }

  revive(): void {
    this.dead = false;
    this.fig.action = 'none';
    this.iframes = 1.5;
  }

  update(dt: number, input: Input, region: BuiltRegion, stats: Stats, camera: THREE.PerspectiveCamera, controls: boolean): void {
    const fig = this.fig;
    this.iframes = Math.max(0, this.iframes - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);

    // ---------- câmera: órbita com mouse, setas alternativas e gamepad ----------
    if (controls) {
      const sens = 0.0024 * this.sensitivity;
      this.camYaw -= input.mouseDX * sens;
      this.camPitch += input.mouseDY * sens * (this.invertY ? -1 : 1);
      this.camYaw -= input.padLook.x * dt * 2.6 * this.sensitivity;
      this.camPitch += input.padLook.y * dt * 1.6 * this.sensitivity * (this.invertY ? -1 : 1);
    }
    this.camPitch = THREE.MathUtils.clamp(this.camPitch, -0.5, 1.15);

    // ---------- movimento ----------
    let mx = 0;
    let mz = 0;
    if (controls && !this.dead && !this.frozen) {
      if (input.held('frente')) mz += 1;
      if (input.held('tras')) mz -= 1;
      if (input.held('esquerda')) mx -= 1;
      if (input.held('direita')) mx += 1;
      mx += input.padMove.x;
      mz -= input.padMove.y;
    }
    const ml = Math.hypot(mx, mz);
    const wish = new THREE.Vector3();
    if (ml > 0.05) {
      const f = new THREE.Vector3(-Math.sin(this.camYaw), 0, -Math.cos(this.camYaw));
      const r = new THREE.Vector3(-f.z, 0, f.x);
      wish.addScaledVector(f, mz / Math.max(1, ml)).addScaledVector(r, mx / Math.max(1, ml));
    }
    const running = controls && (input.held('correr') || input.padRun()) && wish.lengthSq() > 0 && this.vigor > 1;
    const acting = fig.action === 'attack1' || fig.action === 'attack2' || fig.action === 'heavy';

    // esquiva
    if (controls && !this.dead && !this.frozen && input.took('esquiva') && this.dodgeT <= 0 && this.vigor >= stats.dodgeCost * 0.6 && fig.action !== 'hit') {
      this.dodgeT = 0.42;
      this.iframes = Math.max(this.iframes, stats.dodgeIframes);
      this.vigor = Math.max(0, this.vigor - stats.dodgeCost);
      this.vigorDelay = 0.7;
      this.dodgeDir.copy(wish.lengthSq() > 0.01 ? wish.clone().normalize() : new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)));
      this.yaw = Math.atan2(this.dodgeDir.x, this.dodgeDir.z);
      this.attackQueued = null;
      fig.play('dodge');
      this.onDodge?.();
    }

    // ataques (com fila curta para o combo)
    if (controls && !this.dead && !this.frozen) {
      if (input.took('ataque')) this.attackQueued = 'leve';
      if (input.took('golpe')) this.attackQueued = 'firme';
    }
    if (this.attackQueued && !this.dodging && fig.action !== 'hit' && (!acting || fig.progress > 0.72)) {
      const heavy = this.attackQueued === 'firme';
      const cost = heavy ? stats.attackCost * 2.6 : stats.attackCost;
      if (this.vigor >= cost * 0.5) {
        this.vigor = Math.max(0, this.vigor - cost);
        this.vigorDelay = 0.6;
        // mira: alvo travado, senão a direção do movimento ou a da câmera
        if (this.lockTarget?.alive) this.yaw = Math.atan2(this.lockTarget.pos.x - this.pos.x, this.lockTarget.pos.z - this.pos.z);
        else if (wish.lengthSq() > 0.01) this.yaw = Math.atan2(wish.x, wish.z);
        if (heavy) fig.play('heavy');
        else {
          fig.play(this.comboNext === 1 ? 'attack1' : 'attack2');
          this.comboNext = this.comboNext === 1 ? 2 : 1;
        }
        this.attackFired = false;
        this.onSwing?.(heavy);
      }
      this.attackQueued = null;
    }
    // instante do golpe
    if (acting && !this.attackFired) {
      const heavy = fig.action === 'heavy';
      const at = heavy ? 0.5 : 0.42;
      if (fig.progress >= at) {
        this.attackFired = true;
        this.onAttack?.({
          heavy,
          origin: this.pos.clone().setY(this.pos.y + 1),
          dir: new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)),
          range: heavy ? 2.9 : 2.5,
          arc: heavy ? 1.15 : 1.5,
        });
      }
    }

    let speed = 0;
    if (this.dodging) {
      this.dodgeT -= dt;
      const k = Math.max(0, this.dodgeT / 0.42);
      speed = 4.5 + 7.5 * k;
      this.vel.copy(this.dodgeDir).multiplyScalar(speed);
    } else if (acting) {
      // pequeno avanço no golpe
      const adv = fig.progress > 0.25 && fig.progress < 0.55 ? 2.4 : 0;
      this.vel.set(Math.sin(this.yaw) * adv, 0, Math.cos(this.yaw) * adv);
    } else if (this.hurtT > 0 || this.dead || fig.action === 'die') {
      this.vel.multiplyScalar(Math.max(0, 1 - dt * 8));
    } else if (wish.lengthSq() > 0.01) {
      const target = running ? stats.runSpeed : stats.walkSpeed + 1.2;
      const analog = Math.min(1, ml);
      speed = target * (analog < 0.6 ? 0.55 : 1);
      const tv = wish.clone().normalize().multiplyScalar(speed);
      this.vel.lerp(tv, Math.min(1, dt * 12));
      const wantYaw = Math.atan2(wish.x, wish.z);
      let d = wantYaw - this.yaw;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      this.yaw += d * Math.min(1, dt * 12);
      if (running) {
        this.vigor = Math.max(0, this.vigor - dt * 7);
        this.vigorDelay = 0.35;
      }
    } else {
      this.vel.multiplyScalar(Math.max(0, 1 - dt * 12));
      if (this.lockTarget?.alive) {
        const wantYaw = Math.atan2(this.lockTarget.pos.x - this.pos.x, this.lockTarget.pos.z - this.pos.z);
        let d = wantYaw - this.yaw;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        this.yaw += d * Math.min(1, dt * 8);
      }
    }

    // integração com colisão
    if (!this.falling) {
      const nx = this.pos.x + this.vel.x * dt;
      const nz = this.pos.z + this.vel.z * dt;
      const res = resolveCircle(region.colliders, nx, nz, 0.36, this.pos.y);
      const b = region.bounds;
      const cx = THREE.MathUtils.clamp(res.x, b.minX, b.maxX);
      const cz = THREE.MathUtils.clamp(res.z, b.minZ, b.maxZ);
      const g = groundAt(region, cx, cz, this.pos.y);
      if (g === null) {
        // sem chão: fora da esquiva o jogador para na borda; na esquiva, cai
        if (this.dodging) {
          this.pos.x = cx;
          this.pos.z = cz;
          this.falling = true;
          this.vel.y = 0;
        }
      } else {
        this.pos.x = cx;
        this.pos.z = cz;
        if (g < this.pos.y - 0.7) {
          // degrau alto para baixo: desce com gravidade
          this.pos.y = Math.max(g, this.pos.y - dt * 9);
        } else this.pos.y += (g - this.pos.y) * Math.min(1, dt * 16);
        if (Math.abs(g - this.pos.y) < 0.1) this.lastSafe.lerp(this.pos, 0.02);
      }
    } else {
      this.vel.y -= 18 * dt;
      this.pos.y += this.vel.y * dt;
      this.pos.x += this.vel.x * dt * 0.4;
      this.pos.z += this.vel.z * dt * 0.4;
      if (this.pos.y < -14) {
        this.falling = false;
        this.onFall?.();
      }
    }

    this.speed = Math.hypot(this.vel.x, this.vel.z);
    // vigor
    this.vigorDelay -= dt;
    if (this.vigorDelay <= 0) this.vigor = Math.min(stats.maxVigor, this.vigor + stats.vigorRegen * dt);

    // passos
    if (!this.dodging && !acting && this.speed > 0.8) {
      this.stepAcc += this.speed * dt;
      if (this.stepAcc > (running ? 1.5 : 1.05)) {
        this.stepAcc = 0;
        this.onStep?.();
      }
    }

    fig.speed = acting || this.dodging ? 0 : this.speed;
    fig.update(dt);
    fig.root.position.copy(this.pos);
    fig.root.rotation.y = this.yaw;
    fig.setTint(this.iframes > 0 && this.dodging ? 0x6688aa : this.hurtT > 0 ? 0xd62839 : 0x000000, this.hurtT > 0 ? 0.6 : this.dodging ? 0.25 : 0);

    // lanterna do cajado
    const tip = new THREE.Vector3();
    fig.staffTip.getWorldPosition(tip);
    this.light.position.copy(tip);
    if (acting && fig.progress > 0.2 && fig.progress < 0.62) {
      const base = new THREE.Vector3();
      fig.staff!.getWorldPosition(base);
      this.trail.push(tip, base.lerp(tip, 0.35));
    }
    this.trail.update(dt);

    this.updateCamera(dt, region, camera);
  }

  private updateCamera(dt: number, region: BuiltRegion, camera: THREE.PerspectiveCamera): void {
    // travar a mira: a câmera gira suavemente para manter jogador e alvo no quadro
    if (this.lockTarget?.alive) {
      const want = Math.atan2(this.pos.x - this.lockTarget.pos.x, this.pos.z - this.lockTarget.pos.z);
      let d = want - this.camYaw;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      this.camYaw += d * Math.min(1, dt * 4);
      this.camPitch += (0.3 - this.camPitch) * Math.min(1, dt * 2);
    }
    const pivot = new THREE.Vector3(this.pos.x, this.pos.y + 1.55, this.pos.z);
    const cp = Math.cos(this.camPitch);
    const dir = new THREE.Vector3(Math.sin(this.camYaw) * cp, Math.sin(this.camPitch), Math.cos(this.camYaw) * cp);
    // enquadramento sobre o ombro
    const right = new THREE.Vector3(Math.cos(this.camYaw), 0, -Math.sin(this.camYaw));
    pivot.addScaledVector(right, 0.42);
    // colisão: encurta o braço da câmera até o primeiro ponto livre
    let dist = this.camDist;
    const steps = 14;
    for (let i = 1; i <= steps; i++) {
      const d = (this.camDist * i) / steps;
      const px = pivot.x + dir.x * d;
      const py = pivot.y + dir.y * d;
      const pz = pivot.z + dir.z * d;
      const g = groundAt(region, px, pz, py + 2);
      if (pointBlocked(region.colliders, px, py, pz, 0.3) || (g !== null && py < g + 0.25)) {
        dist = Math.max(0.7, (this.camDist * (i - 1)) / steps - 0.1);
        break;
      }
    }
    const target = pivot.clone().addScaledVector(dir, dist);
    if (!this.camInit) {
      this.camCur.copy(target);
      this.camInit = true;
    } else this.camCur.lerp(target, Math.min(1, dt * 14));
    camera.position.copy(this.camCur);
    const lookAt = pivot.clone().addScaledVector(dir, -2.5);
    camera.lookAt(lookAt);
  }
}
