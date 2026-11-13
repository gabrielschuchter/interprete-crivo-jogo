import * as THREE from 'three';
import { Figure, SKINS, HAIRS } from './figure';
import type { Input } from '../core/input';
import type { BuiltRegion } from '../world/region';
import { groundAt, resolveCircle, pointBlocked } from '../world/region';
import type { Stats, Look } from '../domain/state';
import { PROFESSIONS, COAT_COLORS } from '../content/data';
import type { Emblem } from './figure';

/** gestos de interação: o corpo para enquanto a mão trabalha */
const USING = new Set(['pickup', 'examine', 'pull', 'open', 'push', 'reach', 'interact']);
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

/** razão entre o tom escolhido e o tom da textura base (pele clara) */
function skinTint(c: number): number {
  const a = new THREE.Color(c);
  const b = new THREE.Color(SKINS[0]);
  return new THREE.Color(Math.min(1, a.r / b.r), Math.min(1, a.g / b.g), Math.min(1, a.b / b.b)).getHex();
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
  /** conversa: a câmera vai para trás do ombro e enquadra quem fala (o jogo aponta o rosto) */
  frame: THREE.Vector3 | null = null;
  private frameK = 0;
  /** descoberta: aproximação lenta sobre o ponto achado (baú, folha, item) */
  private focusP = new THREE.Vector3();
  private focusT = 0;
  private focusDur = 1;
  private camLook = new THREE.Vector3();
  focus(p: THREE.Vector3, dur = 1.8): void {
    this.focusP.copy(p);
    this.focusT = this.focusDur = dur;
  }
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
  /** no ar após um pulo */
  air = false;
  private vy = 0;
  private jumpBuf = 0;
  private groundedRecently = 0;
  onJump: (() => void) | null = null;
  onLand: ((hard: boolean) => void) | null = null;
  /** ponto de interesse próximo para onde a cabeça vira (o jogo atualiza) */
  lookHint: THREE.Vector3 | null = null;
  /** rumo para onde o corpo vira sozinho (conversa, objeto), com passos e sem estalo */
  faceTo: number | null = null;
  private lookP = new THREE.Vector3();

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
      height: look.body === 'masc' ? 1.8 : look.body === 'fem' ? 1.68 : undefined,
      build: look.body === 'masc' ? 1.08 : undefined,
      armed: true,
      weapon: 'estoque',
      satchel: true,
      // corpo e corte: player_<fem|masc>_<corte> quando existir; senão o modelo antigo do corte
      model: look.body ? `player_${look.body}_${(['curto', 'coque', 'longo', 'capuz'] as const)[Math.floor(look.hair / HAIRS.length) % 4] ?? 'curto'}` : 'player_' + ((['curto', 'coque', 'longo', 'capuz'] as const)[Math.floor(look.hair / HAIRS.length) % 4] ?? 'curto'),
      modelAlt: 'player_' + ((['curto', 'coque', 'longo', 'capuz'] as const)[Math.floor(look.hair / HAIRS.length) % 4] ?? 'curto'),
      tintSkin: skinTint(SKINS[look.skin % SKINS.length]),
      // corpo da forja: textura de pele própria de cada tom (assada das peles CC0 do MakeHuman), sem tinta por cima
      skinMap: look.body ? `textures/ps2/pele/${look.body}_${look.skin % SKINS.length}.webp` : undefined,
      tintHair: new THREE.Color(HAIRS[look.hair % HAIRS.length]).multiplyScalar(2.4).getHex(),
      tintCoat: new THREE.Color(COAT_COLORS[look.coat % COAT_COLORS.length]).multiplyScalar(2.2).getHex(),
    });
    this.light.castShadow = false;
  }

  private lantern: THREE.Group | null = null;
  /** criada sempre e só apagada (intensidade 0): ligar e desligar uma luz muda a contagem de luzes e obriga o
   *  navegador a recompilar todos os materiais da cena, um engasgo de segundos */
  private lanternLight = new THREE.PointLight(0xdfe8ff, 0, 7, 1.6);
  /** Lanterna da Transparência equipada: pende do cinto, à direita, e ilumina com luz fria e estável. */
  setLantern(on: boolean): void {
    if (on && !this.lantern) {
      const g = new THREE.Group();
      const brass = new THREE.MeshStandardMaterial({ color: 0x8a6a34, metalness: 0.7, roughness: 0.45 });
      const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.16, 6, 1, true), new THREE.MeshStandardMaterial({ color: 0xfff2c8, emissive: 0xfff0c0, emissiveIntensity: 1.6, transparent: true, opacity: 0.85 }));
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.07, 6), brass);
      cap.position.y = 0.115;
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.025, 6), brass);
      base.position.y = -0.09;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 4, 10), brass);
      ring.position.y = 0.17;
      g.add(cage, cap, base, ring);
      g.position.set(-0.24, 0.9, 0.06);
      this.fig.root.add(g);
      this.lantern = g;
    }
    if (this.lantern) this.lantern.visible = on;
    this.lanternLight.intensity = on ? 4 : 0;
    if (this.lantern && on) this.lantern.rotation.z = Math.sin(performance.now() / 260) * 0.12 * Math.min(1, this.speed / 3);
  }

  addTo(scene: THREE.Scene): void {
    this.lanternLight.position.set(-0.24, 0.9, 0.06);
    this.fig.root.add(this.lanternLight);
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
    this.air = false;
    this.vy = 0;
    this.fig.root.position.copy(this.pos);
    this.fig.root.rotation.y = yaw;
  }

  get dodging(): boolean {
    return this.dodgeT > 0;
  }

  hurt(from?: THREE.Vector3, force = 1): void {
    this.hurtT = 0.36;
    if (from) this.fig.flinch(from, force);
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
      // toque: deslocamento em px CSS por quadro; o teto por quadro evita saltos de câmera após travamento
      const tk = 0.0046 * this.sensitivity;
      const lim = 0.6;
      this.camYaw -= THREE.MathUtils.clamp(input.touchLookX * tk, -lim, lim);
      this.camPitch += THREE.MathUtils.clamp(input.touchLookY * tk * 0.85, -lim, lim) * (this.invertY ? -1 : 1);
      this.camYaw -= input.padLook.x * dt * 2.6 * this.sensitivity;
      // sem pointer lock (touchpad, navegador embutido) a câmera ainda gira pelo teclado
      this.camYaw += ((input.held('camEsq') ? 1 : 0) - (input.held('camDir') ? 1 : 0)) * dt * 2.2 * this.sensitivity;
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
      mx += input.padMove.x + input.touchMove.x;
      mz -= input.padMove.y + input.touchMove.y;
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

    // esquiva. Regra de vigor, de propósito tolerante: com 60% do custo ainda sai uma última esquiva,
    // e o vigor vai a zero. Golpes pedem metade do custo. A dica "último fôlego" explica isso ao jogador.
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

    // pulo: o toque vale por 0,14 s antes de tocar o chão e por 0,1 s depois de sair da borda
    if (controls && !this.dead && !this.frozen && input.took('pular')) this.jumpBuf = 0.14;
    this.jumpBuf = Math.max(0, this.jumpBuf - dt);
    if (this.jumpBuf > 0 && !this.air && !this.falling && !this.dodging && fig.action !== 'hit' && fig.action !== 'heavy' && !this.dead && this.groundedRecently > 0) {
      this.air = true;
      this.vy = 6.4;
      this.jumpBuf = 0;
      this.groundedRecently = 0;
      this.onJump?.();
    }
    this.groundedRecently = this.air || this.falling ? 0 : 0.1;

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
        // mira: alvo travado; senão a direção do movimento; parado e sem alvo, o golpe sai para onde o corpo já olha
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
    } else if (this.hurtT > 0 || this.dead || fig.action === 'die' || USING.has(fig.action)) {
      this.vel.multiplyScalar(Math.exp(-dt * 8));
    } else if (wish.lengthSq() > 0.01) {
      const target = running ? stats.runSpeed : stats.walkSpeed + 1.2;
      // magnitude analógica contínua (joystick): de 35% a 100% da velocidade, sem degrau; teclado vale 1
      const analog = Math.min(1, ml);
      speed = target * (analog < 1 ? 0.35 + 0.65 * analog : 1);
      const tv = wish.clone().normalize().multiplyScalar(speed);
      // amortecimento exponencial: a mesma resposta em 30 ou 144 quadros por segundo
      this.vel.lerp(tv, 1 - Math.exp(-dt * 12));
      const wantYaw = Math.atan2(wish.x, wish.z);
      let d = wantYaw - this.yaw;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      this.yaw += d * (1 - Math.exp(-dt * 12));
      if (running) {
        this.vigor = Math.max(0, this.vigor - dt * 7);
        this.vigorDelay = 0.35;
      }
    } else {
      this.vel.multiplyScalar(Math.exp(-dt * 12));
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
      if (this.air) {
        // no ar: a trajetória vale mesmo sem chão embaixo; só o pulo pode levar a um abismo
        this.pos.x = cx;
        this.pos.z = cz;
        this.vy -= 18 * dt;
        this.pos.y += this.vy * dt;
        if (g !== null && this.vy <= 0 && this.pos.y <= g + 0.05) {
          // pouso, ou degrau ao alcance: sobe na borda em vez de bater nela
          const hard = this.vy < -8;
          this.pos.y = g;
          this.air = false;
          this.vy = 0;
          this.lastSafe.copy(this.pos);
          this.fig.land(hard);
          this.onLand?.(hard);
        } else if (g === null && this.pos.y < Math.min(this.lastSafe.y, 0) - 1.4) {
          this.air = false;
          this.falling = true;
          this.vel.y = this.vy;
        }
      } else if (g === null) {
        // sem chão: andando ou esquivando, o jogador para na borda; só um pulo atravessa o vazio
      } else {
        this.pos.x = cx;
        this.pos.z = cz;
        if (g < this.pos.y - 0.7) {
          // degrau alto para baixo: cai com gravidade e conta como queda curta
          this.pos.y = Math.max(g, this.pos.y - dt * 9);
        } else this.pos.y += (g - this.pos.y) * Math.min(1, dt * 16);
        if (Math.abs(g - this.pos.y) < 0.1) this.lastSafe.lerp(this.pos, 1 - Math.exp(-1.2 * dt)); // independe da taxa de quadros
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

    let turnRate = 0;
    if (this.faceTo !== null) {
      let d = this.faceTo - this.yaw;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      if (Math.abs(d) < 0.03 || (wish.lengthSq() > 0.01 && !this.frozen)) this.faceTo = null;
      else {
        const step = d * (1 - Math.exp(-dt * 9));
        this.yaw += step;
        turnRate = step / Math.max(dt, 1e-3);
      }
    }
    fig.turnRate = turnRate;
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

    fig.airborne = this.air || this.falling;
    // olhar: o alvo travado manda; senão, quem o jogo apontou por perto (morador, objeto)
    if (this.lockTarget?.alive) fig.lookAt = this.lookP.set(this.lockTarget.pos.x, this.lockTarget.pos.y + 1.4, this.lockTarget.pos.z);
    else fig.lookAt = this.lookHint;
    fig.speed = acting || this.dodging ? 0 : fig.airborne ? Math.max(this.speed, 3.6) : this.speed;
    fig.update(dt);
    fig.root.position.copy(this.pos);
    fig.root.rotation.y = this.yaw;
    fig.setTint(this.iframes > 0 && this.dodging ? 0x6688aa : this.hurtT > 0 ? 0xd62839 : 0x000000, this.hurtT > 0 ? 0.6 : this.dodging ? 0.25 : 0);

    // luz da tocha e rastro da lâmina
    const tip = new THREE.Vector3();
    if (fig.torch) fig.torch.tip.getWorldPosition(tip);
    else tip.set(this.pos.x, this.pos.y + 1.6, this.pos.z);
    this.light.position.copy(tip);
    if (acting && fig.weapon && fig.progress > 0.2 && fig.progress < 0.66) {
      const bt = new THREE.Vector3();
      const base = new THREE.Vector3();
      fig.weaponTip.getWorldPosition(bt);
      fig.weapon.getWorldPosition(base);
      this.trail.push(bt, base.lerp(bt, 0.4));
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
    // conversa: gira devagar até ficar atrás do ombro do jogador, com o rosto do morador no terço da tela
    this.frameK += ((this.frame ? 1 : 0) - this.frameK) * (1 - Math.exp(-2.4 * dt));
    const fk = this.frameK;
    if (this.frame && fk > 0.01) {
      const want = Math.atan2(this.pos.x - this.frame.x, this.pos.z - this.frame.z) + 0.42;
      let d = want - this.camYaw;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      this.camYaw += d * Math.min(1, dt * 2.6);
      this.camPitch += (0.1 - this.camPitch) * Math.min(1, dt * 2);
    }
    this.focusT = Math.max(0, this.focusT - dt);
    // entra em 0,35 s, segura e sai devagar
    const u = 1 - this.focusT / this.focusDur;
    const fw = this.focusT > 0 ? Math.min(1, u / 0.25) * Math.min(1, (1 - u) / 0.45) : 0;
    const fws = fw * fw * (3 - 2 * fw);
    const pivot = new THREE.Vector3(this.pos.x, this.pos.y + 1.55 - 0.05 * fk, this.pos.z);
    const cp = Math.cos(this.camPitch);
    const dir = new THREE.Vector3(Math.sin(this.camYaw) * cp, Math.sin(this.camPitch), Math.cos(this.camYaw) * cp);
    // enquadramento centrado: o personagem fica no meio da tela
    const right = new THREE.Vector3(Math.cos(this.camYaw), 0, -Math.sin(this.camYaw));
    pivot.addScaledVector(right, 0.0);
    // colisão: encurta o braço da câmera até o primeiro ponto livre
    const arm = this.camDist * (1 - 0.3 * fk) * (1 - 0.24 * fws);
    let dist = arm;
    const steps = 14;
    for (let i = 1; i <= steps; i++) {
      const d = (arm * i) / steps;
      const px = pivot.x + dir.x * d;
      const py = pivot.y + dir.y * d;
      const pz = pivot.z + dir.z * d;
      const g = groundAt(region, px, pz, py + 2);
      if (pointBlocked(region.colliders, px, py, pz, 0.3) || (g !== null && py < g + 0.25)) {
        dist = Math.max(0.7, (arm * (i - 1)) / steps - 0.1);
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
    // na conversa o olhar mira entre os dois rostos; na descoberta, desce até o que foi achado
    if (this.frame && fk > 0.01) lookAt.lerp(this.frame, 0.45 * fk);
    if (fws > 0) lookAt.lerp(this.focusP, 0.55 * fws);
    if (!this.camLook.lengthSq()) this.camLook.copy(lookAt);
    else this.camLook.lerp(lookAt, Math.min(1, dt * 10));
    camera.lookAt(this.camLook);
  }
}
