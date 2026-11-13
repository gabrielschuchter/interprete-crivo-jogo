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
import { GOLPES, GUARDA, ARMA_GUARDA, RAIZ, ARMA_RAIZ, ESQUIVA, ARMA_ESQUIVA, MERGULHO, ARMA_MERGULHO, amostra, fixa, avancoAte, giroAte, saltoEm, firmePorFoco, danoPorFoco, type Golpe, type GolpeId } from './esgrima';
import { approach } from './motion';

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
      fragmentShader: `uniform vec3 uColor; varying float vA; void main(){ gl_FragColor = vec4(uColor, vA * 0.5); }`,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    this.mesh = new THREE.Mesh(this.geo, mat);
    this.mesh.frustumCulled = false;
  }
  /** rastro do firme: mais claro e mais branco */
  heavy(on: boolean): void {
    (this.mesh.material as THREE.ShaderMaterial).uniforms.uColor.value.set(on ? 0xffe2b0 : 0xffc27a).multiplyScalar(on ? 1.6 : 1.1);
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
  /** golpe de origem e peso do contato (esgrima.ts) */
  golpe: GolpeId;
  mult: number;
  base: 'leve' | 'firme';
  pausa: number;
  tremor: number;
  circulo: boolean;
  ultimo: boolean;
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
  // ---- esgrima ----
  /** pontos de foco, de 0 a 3: os leves enchem, o firme gasta */
  foco = 0;
  /** foco gasto pelo firme em curso (dano) */
  private spent = 0;
  golpe: Golpe | null = null;
  golpeT = 0;
  private hitsFired = 0;
  private swung = false;
  private advDone = 0;
  private golpeTarget: { pos: THREE.Vector3; alive: boolean; radius: number } | null = null;
  private comboNext: GolpeId = 'l1';
  private comboT = 0;
  private bufLeve = 0;
  private bufEsq = 0;
  private heavyHold = -1;
  charging = false;
  private chargeLvl = 0;
  private deflectT = 0;
  private sinceDodge = 9;
  private dodgeAge = 9;
  /** duração da janela de esquiva perfeita da esquiva em curso (vem dos atributos, que seguem a dificuldade) */
  private perfectSec = 0.22;
  private dodgeBack = false;
  private perfectUsed = false;
  private plunge = false;
  private plungeT = 0;
  private ovW = 0;
  private guardW = 0;
  /** há adversário desperto por perto: o corpo assume a guarda (o jogo atualiza) */
  combatNear = false;
  /** alvo para onde o golpe vira e até onde avança (o jogo responde: travado ou o mais próximo à frente) */
  assist: ((dir: THREE.Vector3) => { pos: THREE.Vector3; alive: boolean; radius: number } | null) | null = null;
  onFoco: ((pontos: number, carga: boolean) => void) | null = null;
  /** câmera: aproximação na carga e tranco no impacto; desligado com movimento reduzido */
  calmCam = false;
  private camPull = 0;
  private camKick = 0;
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
  onSwing: ((g: Golpe) => void) | null = null;
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
    this.endGolpe(false);
    this.charging = false;
    this.heavyHold = -1;
    this.plunge = false;
    this.fig.root.position.copy(this.pos);
    this.fig.root.rotation.y = yaw;
  }

  get dodging(): boolean {
    return this.dodgeT > 0;
  }

  /** dano recebido: interrompe golpe e carga, salvo na janela de armadura dos firmes carregados */
  hurt(from?: THREE.Vector3, force = 1): void {
    const g = this.golpe;
    if (g?.armadura && this.golpeT >= g.armadura[0] && this.golpeT < g.armadura[1]) {
      if (from) this.fig.flinch(from, force * 0.4);
      return;
    }
    this.hurtT = 0.36;
    this.endGolpe(false);
    this.charging = false;
    this.heavyHold = -1;
    this.plunge = false;
    if (from) this.fig.flinch(from, force);
    this.fig.play('hit');
  }

  /** a postura de raiz está no instante de desviar (golpe resoluto) */
  get deflecting(): boolean {
    return this.charging && this.deflectT > 0;
  }
  /** desvio aceito: entra no golpe resoluto na hora e ganha um ponto de foco */
  deflect(stats: Stats): void {
    this.charging = false;
    this.heavyHold = -1;
    this.deflectT = 0;
    this.iframes = Math.max(this.iframes, 0.35);
    this.addFoco(1);
    this.startGolpe(GOLPES.resoluto, stats, new THREE.Vector3());
  }
  /** a esquiva está no começo (até 0,22 s): um golpe que passa por ela conta como esquiva perfeita, uma vez */
  get perfectWindow(): boolean {
    return this.dodging && this.dodgeAge < this.perfectSec && !this.perfectUsed;
  }
  perfectDodge(): void {
    this.perfectUsed = true;
    this.iframes = Math.max(this.iframes, 0.4);
    this.addFoco(1);
  }
  addFoco(n: number): void {
    const before = Math.floor(this.foco + 1e-6);
    this.foco = Math.min(3, this.foco + n);
    const after = Math.floor(this.foco + 1e-6);
    if (after > before) this.onFoco?.(after, false);
  }

  /** tranco de câmera no impacto (0..1) */
  punch(a: number): void {
    if (!this.calmCam) this.camKick = Math.max(this.camKick, a);
  }

  private aim(wish: THREE.Vector3): void {
    // mira: alvo travado; senão quem o jogo aponta na direção pedida; senão a direção pedida; parado, para onde já olha
    const dir = wish.lengthSq() > 0.01 ? wish.clone().normalize() : new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const t = this.lockTarget?.alive ? this.lockTarget : (this.assist?.(dir) ?? null);
    this.golpeTarget = t;
    if (t) this.yaw = Math.atan2(t.pos.x - this.pos.x, t.pos.z - this.pos.z);
    else if (wish.lengthSq() > 0.01) this.yaw = Math.atan2(wish.x, wish.z);
  }

  private startGolpe(G: Golpe, stats: Stats, wish: THREE.Vector3): void {
    const heavyFam = G.id === 'firme' || G.id === 'lua' || G.id === 'pilar';
    const cost = stats.attackCost * G.vigor;
    this.vigor = Math.max(0, this.vigor - cost);
    if (cost > 0) this.vigorDelay = 0.6;
    if (heavyFam) {
      this.spent = Math.floor(this.foco + 1e-6);
      this.foco = Math.max(0, this.foco - this.spent);
    }
    if (G.id !== 'resoluto') this.aim(wish);
    this.golpe = G;
    this.golpeT = 0;
    this.hitsFired = 0;
    this.advDone = 0;
    this.vel.set(0, 0, 0);
    this.swung = false;
    this.fig.play('esgrima', G.dur);
  }

  private endGolpe(done: boolean): void {
    const G = this.golpe;
    if (!G) return;
    this.golpe = null;
    if (this.fig.action === 'esgrima') this.fig.action = 'none';
    // a sequência de leves espera meio segundo pelo próximo toque
    if (done && G.next && G.id !== 'l4') {
      this.comboNext = G.next;
      this.comboT = 0.5;
    } else this.comboT = 0;
    if (done) this.guardW = 1;
  }

  /** escreve na figura a pose de esgrima deste quadro (golpe, carga, esquiva, mergulho ou guarda) */
  private overlay(dt: number): void {
    const fig = this.fig;
    const guardGoal = this.combatNear && !this.dead && !this.air && this.speed < 4 && !USING.has(fig.action) && fig.action !== 'hit' ? (this.speed > 0.4 ? 0.5 : 1) : 0;
    this.guardW = approach(this.guardW, guardGoal, 5, dt);
    let a = null as ReturnType<typeof amostra> | null;
    let w = 0;
    if (this.golpe) {
      a = amostra(this.golpe, this.golpeT);
      w = 1;
    } else if (this.charging) {
      a = fixa(RAIZ, ARMA_RAIZ);
      w = 1;
    } else if (this.plunge) {
      a = fixa(MERGULHO, ARMA_MERGULHO);
      w = 1;
    } else if (this.dodging) {
      a = fixa(ESQUIVA, ARMA_ESQUIVA);
      w = Math.sin(Math.min(1, this.dodgeAge / 0.42) * Math.PI) * 0.9;
    } else if (this.guardW > 0.01) {
      a = fixa(GUARDA, ARMA_GUARDA);
      w = this.guardW;
    }
    // entra rápido (o golpe sai do quadro em que foi pedido) e sai devagar
    this.ovW = approach(this.ovW, w, w > this.ovW ? 30 : 9, dt);
    if (!a) {
      if (this.ovW < 0.01) fig.combat = null;
      else if (fig.combat) fig.combat.w = fig.combat.armaW = this.ovW;
      return;
    }
    fig.combat = { pose: a.pose, arma: a.arma, w: this.ovW, armaW: this.ovW };
  }

  die(): void {
    this.dead = true;
    this.fig.play('die');
  }

  revive(): void {
    this.endGolpe(false);
    this.charging = false;
    this.heavyHold = -1;
    this.plunge = false;
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
    const running = controls && (input.held('correr') || input.padRun()) && wish.lengthSq() > 0 && this.vigor > 1 && !this.charging;
    const free = controls && !this.dead && !this.frozen;
    const g = this.golpe;
    const gt = this.golpeT;
    this.sinceDodge += dt;
    this.dodgeAge += dt;
    this.deflectT = Math.max(0, this.deflectT - dt);
    this.comboT = Math.max(0, this.comboT - dt);

    // ---------- fila de entrada: cada toque vale por 0,4 s ----------
    this.bufLeve = Math.max(0, this.bufLeve - dt);
    this.bufEsq = Math.max(0, this.bufEsq - dt);
    if (free && input.took('ataque')) this.bufLeve = 0.4;
    if (free && input.took('esquiva')) this.bufEsq = 0.3;
    const heavyDown = free && input.took('golpe');
    const heavyHeld = free && input.held('golpe');

    // ---------- esquiva ----------
    // Regra de vigor, de propósito tolerante: com 60% do custo ainda sai uma última esquiva, e o vigor vai a
    // zero. Golpes pedem metade do custo. A esquiva cancela golpes fora da janela de compromisso (`lock`) e a
    // carga do firme, sem perder o foco.
    const locked = !!g && !!g.lock && gt >= g.lock[0] && gt < g.lock[1];
    if (this.bufEsq > 0 && free && this.dodgeT <= 0.12 && !locked && !this.air && this.vigor >= stats.dodgeCost * 0.6 && fig.action !== 'hit') {
      this.bufEsq = 0;
      this.endGolpe(false);
      this.charging = false;
      this.heavyHold = -1;
      this.dodgeT = 0.42;
      this.dodgeAge = 0;
      this.perfectSec = stats.perfectWindow;
      this.perfectUsed = false;
      this.iframes = Math.max(this.iframes, stats.dodgeIframes);
      this.vigor = Math.max(0, this.vigor - stats.dodgeCost);
      this.vigorDelay = 0.7;
      this.dodgeDir.copy(wish.lengthSq() > 0.01 ? wish.clone().normalize() : new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)));
      // sem direção, a esquiva vai para trás e o corpo continua de frente para o adversário
      this.dodgeBack = wish.lengthSq() <= 0.01;
      if (!this.dodgeBack) this.yaw = Math.atan2(this.dodgeDir.x, this.dodgeDir.z);
      fig.play('dodge');
      this.onDodge?.();
    }

    // pulo: o toque vale por 0,14 s antes de tocar o chão e por 0,1 s depois de sair da borda
    if (free && input.took('pular')) this.jumpBuf = 0.14;
    this.jumpBuf = Math.max(0, this.jumpBuf - dt);
    if (this.jumpBuf > 0 && !this.golpe && !this.charging && !this.air && !this.falling && !this.dodging && fig.action !== 'hit' && !this.dead && this.groundedRecently > 0) {
      this.air = true;
      this.vy = 6.4;
      this.jumpBuf = 0;
      this.groundedRecently = 0;
      this.onJump?.();
    }
    this.groundedRecently = this.air || this.falling ? 0 : 0.1;

    // ---------- golpe aéreo: no ar, o leve vira mergulho com a lâmina para baixo ----------
    if (this.air && this.bufLeve > 0 && !this.plunge && !this.golpe && this.vigor >= stats.attackCost * 0.5) {
      this.bufLeve = 0;
      this.plunge = true;
      this.plungeT = 0;
      this.vy = Math.max(this.vy, 1.6);
      this.vigor = Math.max(0, this.vigor - stats.attackCost);
      this.vigorDelay = 0.6;
      this.aim(wish);
      this.onSwing?.(GOLPES.queda);
    }
    if (this.plunge) {
      this.plungeT += dt;
      // um instante parado no alto e depois a queda
      if (this.plungeT > 0.12) this.vy = Math.min(this.vy, -17);
    }

    // ---------- firme: apertar entra na postura de raiz; soltar libera com o foco que houver ----------
    const canHeavy = !this.air && !this.dodging && fig.action !== 'hit' && (!g || gt >= g.heavyFrom);
    if (heavyDown && canHeavy && this.heavyHold < 0) {
      this.endGolpe(false);
      this.heavyHold = 0;
      this.charging = true;
      this.chargeLvl = 0;
      // as primeiras 0,2 s da postura desviam um golpe corpo a corpo (golpe resoluto)
      this.deflectT = stats.deflectWindow;
      this.aim(wish);
    }
    if (this.charging) {
      this.heavyHold += dt;
      // segurar acumula foco: um ponto a cada 0,6 s depois da primeira fração, até três
      if (heavyHeld && this.heavyHold > 0.25) {
        const before = Math.floor(this.foco + 1e-6);
        if (before < 3) this.foco = Math.min(3, this.foco + dt / 0.6);
        const after = Math.floor(this.foco + 1e-6);
        if (after > before) {
          this.chargeLvl++;
          this.onFoco?.(after, true);
        }
      }
      if (!heavyHeld || this.heavyHold > 2.6) {
        this.charging = false;
        this.heavyHold = -1;
        this.startGolpe(GOLPES[firmePorFoco(this.foco)], stats, wish);
      }
    }

    // ---------- leves: a sequência de quatro, o contracorte depois da esquiva ----------
    if (this.bufLeve > 0 && !this.air && !this.charging && fig.action !== 'hit' && (!this.dodging || this.dodgeAge > 0.26) && (!g || gt >= g.chain)) {
      let id: GolpeId;
      if (this.dodging || this.sinceDodge < 0.4) id = 'contra';
      else if (g?.next) id = g.next;
      else if (this.comboT > 0) id = this.comboNext;
      else id = 'l1';
      if (this.dodging) this.dodgeT = 0;
      if (this.vigor >= stats.attackCost * GOLPES[id].vigor * 0.5) {
        this.bufLeve = 0;
        this.startGolpe(GOLPES[id], stats, wish);
      } else this.bufLeve = 0;
    }

    // ---------- golpe em curso: contatos, avanço, fim ----------
    if (this.golpe) {
      const G = this.golpe;
      this.golpeT += dt;
      const t = this.golpeT;
      // o som do corte sai quando a lâmina começa a andar, não quando o botão é apertado
      if (!this.swung && t >= G.som.t) {
        this.swung = true;
        this.onSwing?.(G);
      }
      for (let i = this.hitsFired; i < G.hits.length; i++) {
        const h = G.hits[i];
        if (t < h.t) break;
        this.hitsFired = i + 1;
        const yaw = this.yaw + giroAte(G, t);
        const heavyFam = G.id === 'firme' || G.id === 'lua' || G.id === 'pilar';
        this.onAttack?.({
          heavy: h.firme,
          origin: this.pos.clone().setY(this.pos.y + 1),
          dir: new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)),
          range: h.alcance ?? G.alcance,
          arc: h.circulo ? Math.PI : G.arco,
          golpe: G.id,
          mult: h.dano * (heavyFam ? danoPorFoco(this.spent) : 1),
          base: heavyFam || G.id === 'resoluto' || G.id === 'queda' ? 'firme' : 'leve',
          pausa: h.pausa,
          tremor: h.tremor,
          circulo: !!h.circulo,
          ultimo: i === G.hits.length - 1,
        });
      }
      if (t >= G.dur) this.endGolpe(true);
    }

    let speed = 0;
    if (this.golpe) {
      // avanço do golpe, medido: para a meio metro do alvo em vez de atravessá-lo
      const G = this.golpe;
      let want = avancoAte(G, this.golpeT) - this.advDone;
      if (this.golpeTarget?.alive) {
        const d = Math.hypot(this.golpeTarget.pos.x - this.pos.x, this.golpeTarget.pos.z - this.pos.z) - this.golpeTarget.radius - 0.75;
        want = Math.min(want, Math.max(0, d));
      }
      this.advDone += want;
      const v = dt > 0 ? want / dt : 0;
      this.vel.set(Math.sin(this.yaw) * v, 0, Math.cos(this.yaw) * v);
    } else if (this.dodging) {
      this.dodgeT -= dt;
      const k = Math.max(0, this.dodgeT / 0.42);
      speed = 4.5 + 7.5 * k;
      this.vel.copy(this.dodgeDir).multiplyScalar(speed);
      if (this.dodgeT <= 0) this.sinceDodge = 0;
    } else if (this.charging) {
      // na postura de raiz anda devagar, sempre de frente para o alvo
      const tv = wish.lengthSq() > 0.01 ? wish.clone().normalize().multiplyScalar(stats.walkSpeed * 0.4) : new THREE.Vector3();
      this.vel.lerp(tv, 1 - Math.exp(-dt * 10));
      const ty = this.lockTarget?.alive ? Math.atan2(this.lockTarget.pos.x - this.pos.x, this.lockTarget.pos.z - this.pos.z) : wish.lengthSq() > 0.01 ? Math.atan2(wish.x, wish.z) : this.yaw;
      let d = ty - this.yaw;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      this.yaw += d * (1 - Math.exp(-dt * 8));
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
          if (this.plunge) {
            this.plunge = false;
            this.startGolpe(GOLPES.queda, stats, new THREE.Vector3());
          }
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
    const acting = !!this.golpe || this.charging;
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
    fig.speed = this.golpe || this.dodging ? 0 : fig.airborne ? Math.max(this.speed, 3.6) : this.speed;
    this.overlay(dt);
    fig.update(dt);
    fig.root.position.copy(this.pos);
    fig.root.rotation.y = this.yaw;
    if (this.golpe) {
      // giro e salto são do corpo visível; posição e mira de jogo seguem no chão
      fig.root.rotation.y += giroAte(this.golpe, this.golpeT);
      fig.root.position.y += saltoEm(this.golpe, this.golpeT);
    }
    fig.setTint(this.iframes > 0 && this.dodging ? 0x6688aa : this.hurtT > 0 ? 0xd62839 : 0x000000, this.hurtT > 0 ? 0.6 : this.dodging ? 0.25 : 0);

    // luz da tocha e rastro da lâmina
    const tip = new THREE.Vector3();
    if (fig.torch) fig.torch.tip.getWorldPosition(tip);
    else tip.set(this.pos.x, this.pos.y + 1.6, this.pos.z);
    this.light.position.copy(tip);
    const G = this.golpe;
    if (((G && this.golpeT >= G.trail[0] && this.golpeT <= G.trail[1]) || (this.plunge && this.plungeT > 0.1)) && fig.weapon) {
      this.trail.heavy(!!G && (G.id === 'firme' || G.id === 'lua' || G.id === 'pilar' || G.id === 'resoluto'));
      const bt = new THREE.Vector3();
      const base = new THREE.Vector3();
      fig.weaponTip.getWorldPosition(bt);
      fig.weapon!.getWorldPosition(base);
      this.trail.push(bt, base.lerp(bt, 0.62));
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
      const want = Math.atan2(this.pos.x - this.frame.x, this.pos.z - this.frame.z) + 0.6;
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
    // carga do firme: a câmera chega um pouco mais perto; o impacto dá um tranco curto para dentro
    this.camPull = approach(this.camPull, this.charging && !this.calmCam ? 1 : 0, 3, dt);
    this.camKick = Math.max(0, this.camKick - dt * 5);
    const arm = this.camDist * (1 - 0.38 * fk) * (1 - 0.24 * fws) * (1 - 0.12 * this.camPull) * (1 - 0.09 * this.camKick * this.camKick);
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
