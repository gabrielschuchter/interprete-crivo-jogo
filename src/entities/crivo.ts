import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BRAND } from '../world/palette';

/**
 * O Crivo (Atlas D-01, D-04, D-07, D-12). Fonte primária: 07_crivo_original.png.
 * Silhueta em "I": base larga, haste, cabeça larga de topo claro; um olho branco
 * alongado com pupila vermelha; pelagem vinho. A pelagem usa cascas (shell fur):
 * volume felpudo real com custo fixo, sem textura de terceiros.
 */
export type CrivoMood = 'neutro' | 'curioso' | 'alegre' | 'desconfiado' | 'assustado' | 'cansado' | 'descanso';

const SHELLS = 14;
const FUR_LEN = 0.05;

const furVert = /* glsl */ `
  uniform float uShell; uniform float uLen; uniform vec3 uSway;
  varying vec3 vBase; varying vec3 vN; varying vec3 vW;
  #include <fog_pars_vertex>
  void main(){
    vBase = position;
    vec3 p = position + normal * uLen * uShell;
    // as pontas cedem ao movimento e à gravidade
    p += (uSway + vec3(0.0, -0.012, 0.0)) * uShell * uShell;
    vN = normalize(normalMatrix * normal);
    vec4 w = modelMatrix * vec4(p, 1.0);
    vW = w.xyz;
    vec4 mvPosition = viewMatrix * w;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;

const furFrag = /* glsl */ `
  uniform float uShell; uniform vec3 uRoot; uniform vec3 uTip; uniform vec3 uLightDir; uniform vec3 uLight; uniform vec3 uAmbient;
  uniform vec3 uWarm; uniform vec3 uWarmPos; uniform float uGlow;
  varying vec3 vBase; varying vec3 vN; varying vec3 vW;
  #include <fog_pars_fragment>
  float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  void main(){
    vec3 q = vBase * 210.0;
    vec3 cell = floor(q);
    vec3 f = fract(q) - 0.5;
    float rnd = hash(cell);
    float len = 0.45 + 0.55 * rnd;           // fios de comprimentos diferentes
    float r = length(f.xy + f.yz * 0.5) ;
    if (uShell > 0.001) {
      if (uShell > len) discard;
      if (r > (1.0 - uShell / len) * 0.62 + 0.06) discard;
    }
    vec3 n = normalize(vN);
    float ndl = dot(normalize((viewMatrix * vec4(uLightDir, 0.0)).xyz), n) * 0.5 + 0.5;
    vec3 col = mix(uRoot, uTip, pow(uShell, 0.8)) * (0.7 + 0.5 * rnd);
    float occ = 0.35 + 0.65 * uShell;                 // raiz sombreada
    vec3 lit = uAmbient + uLight * ndl * ndl;
    vec3 toWarm = uWarmPos - vW; float wd = length(toWarm);
    lit += uWarm * (1.0 / (1.0 + wd * wd * 0.35)) * 2.4;
    float rim = pow(1.0 - abs(n.z), 2.5) * uShell;
    col = col * lit * occ + uTip * rim * (0.22 + uGlow) + uTip * uGlow * 0.5;
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }`;

export class CrivoModel {
  root = new THREE.Group();
  private squash = new THREE.Group();
  private eye: THREE.Mesh;
  private pupil: THREE.Mesh;
  private shine: THREE.Mesh;
  private shells: THREE.ShaderMaterial[] = [];
  private bow: THREE.Group;
  private capeMesh: THREE.Mesh;
  private blinkT = 2 + Math.random() * 3;
  private blink = 0;
  mood: CrivoMood = 'neutro';
  private lidTarget = 1;
  private lid = 1;
  private look = new THREE.Vector2();
  glow = 0;
  sway = new THREE.Vector3();
  /** altura total em metros */
  static HEIGHT = 0.78;

  constructor() {
    this.root.add(this.squash);
    const base = new RoundedBoxGeometry(0.42, 0.13, 0.3, 4, 0.06);
    base.translate(0, 0.065, 0);
    const stem = new THREE.CylinderGeometry(0.088, 0.105, 0.44, 14, 6);
    // leve curva em S, como na referência
    const sp = stem.getAttribute('position');
    for (let i = 0; i < sp.count; i++) {
      const y = sp.getY(i);
      sp.setX(i, sp.getX(i) + Math.sin(y * 5.5) * 0.022);
    }
    stem.translate(0.01, 0.33, 0);
    stem.computeVertexNormals();
    const head = new RoundedBoxGeometry(0.46, 0.21, 0.32, 5, 0.085);
    head.translate(0, 0.655, 0);
    const prep = (g: THREE.BufferGeometry) => {
      const n = g.index ? g.toNonIndexed() : g;
      const out = new THREE.BufferGeometry();
      out.setAttribute('position', n.getAttribute('position'));
      out.setAttribute('normal', n.getAttribute('normal'));
      return out;
    };
    const body = mergeGeometries([prep(base), prep(stem), prep(head)])!;
    const root = new THREE.Color(BRAND.amaranthDark).multiplyScalar(0.4);
    const tip = new THREE.Color(BRAND.darkAmaranth).multiplyScalar(0.9);
    for (let i = 0; i <= SHELLS; i++) {
      const m = new THREE.ShaderMaterial({
        vertexShader: furVert,
        fragmentShader: furFrag,
        uniforms: THREE.UniformsUtils.merge([
          THREE.UniformsLib.fog,
          {
            uShell: { value: i / SHELLS },
            uLen: { value: FUR_LEN },
            uSway: { value: new THREE.Vector3() },
            uRoot: { value: root },
            uTip: { value: tip },
            uLightDir: { value: new THREE.Vector3(0.4, 0.8, 0.4) },
            uLight: { value: new THREE.Color(0.6, 0.64, 0.75) },
            uAmbient: { value: new THREE.Color(0.2, 0.19, 0.24) },
            uWarm: { value: new THREE.Color(1.0, 0.62, 0.3) },
            uWarmPos: { value: new THREE.Vector3(0, -100, 0) },
            uGlow: { value: 0 },
          },
        ]),
        fog: true,
      });
      this.shells.push(m);
      const mesh = new THREE.Mesh(body, m);
      mesh.castShadow = i === 0;
      mesh.frustumCulled = false;
      this.squash.add(mesh);
    }
    // topo claro e sem pelo
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.012, 24), new THREE.MeshStandardMaterial({ color: 0xb9a6a2, roughness: 0.9, envMapIntensity: 0.3 }));
    top.scale.set(1.2, 1, 0.78);
    top.position.set(0, 0.762 + FUR_LEN * 0.82, 0);
    this.squash.add(top);
    // olho: cápsula branca alongada, pupila vermelha brilhante
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.22, emissive: 0xffffff, emissiveIntensity: 0.16 });
    this.eye = new THREE.Mesh(new THREE.CapsuleGeometry(0.058, 0.2, 6, 16), eyeMat);
    this.eye.rotation.z = Math.PI / 2;
    this.eye.position.set(-0.035, 0.655, 0.165 + FUR_LEN * 0.4);
    this.eye.scale.set(1, 1, 0.62);
    this.squash.add(this.eye);
    const pupMat = new THREE.MeshStandardMaterial({ color: BRAND.classicCrimson, roughness: 0.12, emissive: BRAND.classicCrimson, emissiveIntensity: 0.55 });
    this.pupil = new THREE.Mesh(new THREE.SphereGeometry(0.043, 16, 12), pupMat);
    this.pupil.position.set(0, 0.655, 0.2 + FUR_LEN * 0.4);
    this.pupil.scale.z = 0.7;
    this.squash.add(this.pupil);
    this.shine = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    this.squash.add(this.shine);
    // cosméticos opcionais (preservam a silhueta)
    this.bow = new THREE.Group();
    const bowM = new THREE.MeshStandardMaterial({ color: 0xbd9a61, roughness: 0.5, metalness: 0.3 });
    for (const sx of [-1, 1]) {
      const b = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 4), bowM);
      b.rotation.z = (sx * Math.PI) / 2;
      b.position.x = sx * 0.04;
      this.bow.add(b);
    }
    this.bow.position.set(0.02, 0.5, 0.13);
    this.bow.visible = false;
    this.squash.add(this.bow);
    this.capeMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.42), new THREE.MeshStandardMaterial({ color: 0x183d35, roughness: 0.9, side: THREE.DoubleSide }));
    this.capeMesh.position.set(0, 0.38, -0.16);
    this.capeMesh.rotation.x = 0.16;
    this.capeMesh.visible = false;
    this.squash.add(this.capeMesh);
  }

  setCosmetics(laco: boolean, capa: boolean): void {
    this.bow.visible = laco;
    this.capeMesh.visible = capa;
  }

  setLighting(dir: THREE.Vector3, light: THREE.Color, ambient: THREE.Color, warmPos: THREE.Vector3): void {
    for (const m of this.shells) {
      (m.uniforms.uLightDir.value as THREE.Vector3).copy(dir);
      (m.uniforms.uLight.value as THREE.Color).copy(light);
      (m.uniforms.uAmbient.value as THREE.Color).copy(ambient);
      (m.uniforms.uWarmPos.value as THREE.Vector3).copy(warmPos);
    }
  }

  /** dir: direção do olhar em espaço local do Crivo (x lateral, y vertical), -1..1 */
  lookAt(x: number, y: number): void {
    this.look.set(THREE.MathUtils.clamp(x, -1, 1), THREE.MathUtils.clamp(y, -1, 1));
  }

  /** achatamento vertical (1 = repouso) preservando volume */
  setSquash(s: number): void {
    const inv = 1 / Math.sqrt(s);
    this.squash.scale.set(inv, s, inv);
  }

  setLean(x: number, z: number): void {
    this.squash.rotation.set(x, 0, z);
  }

  update(dt: number): void {
    this.blinkT -= dt;
    if (this.blinkT <= 0) {
      this.blink = 0.14;
      this.blinkT = this.mood === 'assustado' ? 0.8 + Math.random() : 2.2 + Math.random() * 3.5;
    }
    this.blink = Math.max(0, this.blink - dt);
    const moodLid: Record<CrivoMood, number> = { neutro: 1, curioso: 1.12, alegre: 0.92, desconfiado: 0.5, assustado: 1.28, cansado: 0.42, descanso: 0.16 };
    this.lidTarget = this.blink > 0 ? 0.08 : moodLid[this.mood];
    this.lid += (this.lidTarget - this.lid) * Math.min(1, dt * 22);
    this.eye.scale.set(this.lid, 1, 0.62);
    const ps = this.mood === 'assustado' ? 0.7 : this.mood === 'curioso' ? 1.15 : 1;
    this.pupil.scale.set(ps, Math.min(1, this.lid * 1.1) * ps, 0.7);
    const px = -0.035 + this.look.x * 0.085;
    const py = 0.655 + this.look.y * 0.018 * this.lid;
    this.pupil.position.x += (px - this.pupil.position.x) * Math.min(1, dt * 12);
    this.pupil.position.y += (py - this.pupil.position.y) * Math.min(1, dt * 12);
    this.shine.position.set(this.pupil.position.x + 0.012, this.pupil.position.y + 0.014, this.pupil.position.z + 0.028);
    this.shine.visible = this.lid > 0.3;
    for (const m of this.shells) {
      (m.uniforms.uSway.value as THREE.Vector3).copy(this.sway);
      m.uniforms.uGlow.value = this.glow;
    }
    (this.pupil.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.55 + this.glow * 2.5;
  }
}

export interface CrivoCtx {
  playerPos: THREE.Vector3;
  playerYaw: number;
  playerSpeed: number;
  /** ponto de interesse (pista, perigo); null = olhar para o jogador */
  interest: THREE.Vector3 | null;
  interestKind: 'pista' | 'perigo' | 'pessoa' | null;
  groundAt: (x: number, z: number, y: number) => number;
  cameraPos: THREE.Vector3;
  inCombat: boolean;
}

/** Comportamento: segue saltitando, olha, aponta, comemora, descansa. Nunca bloqueia passagem. */
export class Crivo {
  model = new CrivoModel();
  pos = new THREE.Vector3();
  yaw = 0;
  private hopT = 0;
  private hopDur = 0;
  private hopFrom = new THREE.Vector3();
  private hopTo = new THREE.Vector3();
  private hopH = 0;
  private landT = 1;
  private idleT = 0;
  private wait = 0;
  private celebrate = 0;
  private pointing = 0;
  pulseT = 0;
  private vel = new THREE.Vector3();
  tired = 0;
  onHop: (() => void) | null = null;
  /** lado preferido em relação ao jogador (1 = direita) */
  side = 1;

  constructor() {
    this.model.root.name = 'crivo';
  }

  place(x: number, y: number, z: number): void {
    this.pos.set(x, y, z);
    this.hopT = this.hopDur = 0;
    this.model.root.position.copy(this.pos);
  }

  cheer(): void {
    this.celebrate = 1.4;
  }

  point(seconds = 2.5): void {
    this.pointing = seconds;
  }

  pulse(): void {
    this.pulseT = 0.7;
  }

  get hopping(): boolean {
    return this.hopT < this.hopDur;
  }

  update(dt: number, c: CrivoCtx): void {
    const m = this.model;
    this.tired = Math.max(0, this.tired - dt);
    this.pointing = Math.max(0, this.pointing - dt);
    this.celebrate = Math.max(0, this.celebrate - dt);
    this.pulseT = Math.max(0, this.pulseT - dt);

    // destino: ao lado e um pouco atrás do jogador; ao apontar, perto da pista
    const fx = Math.sin(c.playerYaw);
    const fz = Math.cos(c.playerYaw);
    const target = new THREE.Vector3(c.playerPos.x - fx * 0.7 + fz * 1.05 * this.side, 0, c.playerPos.z - fz * 0.7 - fx * 1.05 * this.side);
    if (this.pointing > 0 && c.interest && c.interestKind === 'pista') {
      const d = c.interest.clone().sub(c.playerPos);
      d.y = 0;
      const dist = d.length();
      if (dist > 0.01) {
        d.normalize();
        const reach = Math.min(dist * 0.6, 3.2);
        target.set(c.playerPos.x + d.x * reach, 0, c.playerPos.z + d.z * reach);
      }
    }
    const dx = target.x - this.pos.x;
    const dz = target.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    const playerDist = Math.hypot(c.playerPos.x - this.pos.x, c.playerPos.z - this.pos.z);

    // preso ou longe demais: reaparece junto do jogador (Atlas S-15)
    if (playerDist > 16 || Math.abs(c.playerPos.y - this.pos.y) > 6) {
      this.place(target.x, c.groundAt(target.x, target.z, c.playerPos.y + 0.5), target.z);
    }

    if (this.hopping) {
      this.hopT += dt;
      const t = Math.min(1, this.hopT / this.hopDur);
      this.pos.lerpVectors(this.hopFrom, this.hopTo, t);
      this.pos.y = this.hopFrom.y + (this.hopTo.y - this.hopFrom.y) * t + Math.sin(t * Math.PI) * this.hopH;
      m.setSquash(1 + Math.sin(t * Math.PI) * 0.16 - (t < 0.12 ? (0.12 - t) * 1.6 : 0));
      if (t >= 1) {
        this.landT = 0;
        this.wait = this.celebrate > 0 ? 0 : dist > 4 ? 0 : 0.05 + Math.random() * 0.08;
        this.onHop?.();
      }
    } else {
      this.landT += dt;
      // amortecimento da aterrissagem
      const k = Math.exp(-this.landT * 14) * Math.cos(this.landT * 26);
      m.setSquash(1 - 0.2 * k + Math.sin(performance.now() * 0.0022) * 0.012);
      this.wait -= dt;
      const need = this.celebrate > 0 || dist > (c.playerSpeed > 0.3 ? 0.55 : 1.15);
      if (need && this.wait <= 0) {
        const step = this.celebrate > 0 ? 0.001 : Math.min(dist, 0.75 + Math.min(1.6, dist * 0.32));
        const nx = this.pos.x + (dist > 0.001 ? (dx / dist) * step : 0);
        const nz = this.pos.z + (dist > 0.001 ? (dz / dist) * step : 0);
        this.hopFrom.copy(this.pos);
        this.hopTo.set(nx, c.groundAt(nx, nz, Math.max(this.pos.y, c.playerPos.y) + 0.6), nz);
        this.hopDur = this.celebrate > 0 ? 0.34 : 0.2 + step * 0.085;
        this.hopH = this.celebrate > 0 ? 0.5 : 0.14 + step * 0.16;
        this.hopT = 0;
        this.idleT = 0;
        if (dist > 0.05 && this.celebrate <= 0) this.yaw = Math.atan2(dx, dz);
      } else if (!need) {
        this.idleT += dt;
        const gy = c.groundAt(this.pos.x, this.pos.z, this.pos.y + 0.5);
        this.pos.y += (gy - this.pos.y) * Math.min(1, dt * 10);
      }
    }

    // para onde olha
    const look = c.interest ?? c.playerPos.clone().setY(c.playerPos.y + 1.4);
    const ldx = look.x - this.pos.x;
    const ldz = look.z - this.pos.z;
    const wantYaw = Math.atan2(ldx, ldz);
    if (!this.hopping || this.celebrate > 0) {
      let d = wantYaw - this.yaw;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      this.yaw += d * Math.min(1, dt * (this.celebrate > 0 ? 0 : 5));
      if (this.celebrate > 0) this.yaw += dt * 9;
    }
    let rel = wantYaw - this.yaw;
    while (rel > Math.PI) rel -= Math.PI * 2;
    while (rel < -Math.PI) rel += Math.PI * 2;
    const ldy = look.y - (this.pos.y + 0.65);
    m.lookAt(-rel * 1.6, ldy * 0.6);

    // humor
    if (this.tired > 0) m.mood = 'cansado';
    else if (this.celebrate > 0) m.mood = 'alegre';
    else if (c.interestKind === 'perigo') m.mood = 'assustado';
    else if (c.interestKind === 'pista') m.mood = 'curioso';
    else if (this.idleT > 14 && !c.inCombat) m.mood = 'descanso';
    else if (this.idleT > 7 && !c.inCombat) m.mood = 'desconfiado';
    else m.mood = 'neutro';

    // inclinação: curiosidade para o lado, susto para trás
    const leanZ = m.mood === 'curioso' ? Math.sin(performance.now() * 0.003) * 0.12 + 0.14 : m.mood === 'desconfiado' ? 0.2 : 0;
    const leanX = m.mood === 'assustado' ? -0.16 + Math.sin(performance.now() * 0.05) * 0.02 : this.hopping ? 0.14 : 0;
    m.setLean(leanX, leanZ);
    m.glow = Math.max(0, this.pulseT / 0.7) + (this.pointing > 0 ? 0.12 + Math.sin(performance.now() * 0.008) * 0.08 : 0);

    // pelos acompanham o movimento
    const prev = m.root.position.clone();
    m.root.position.copy(this.pos);
    m.root.rotation.y = this.yaw;
    this.vel.copy(m.root.position).sub(prev).divideScalar(Math.max(dt, 1e-4));
    const lv = this.vel.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -this.yaw);
    m.sway.lerp(new THREE.Vector3(-lv.x * 0.004, -lv.y * 0.006, -lv.z * 0.004), Math.min(1, dt * 10));
    m.update(dt);
  }
}
