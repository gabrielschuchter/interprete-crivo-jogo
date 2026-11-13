import * as THREE from 'three';

/**
 * Camada de movimento sobre os clipes de captura. Os clipes CMU são os mesmos para todo o elenco; aqui cada figura
 * ganha postura, olhar, respiração, reação a impacto, rosto e poses de ofício próprios, sem tocar nos GLB.
 *
 * Toda rotação é dada no espaço do personagem (a raiz da figura: +Z à frente, +Y para cima, +X à esquerda de quem
 * olha para +Z), e não no eixo local de cada osso. Assim a mesma pose serve para qualquer esqueleto do elenco
 * (cmu_mb da forja e o rig próprio do Espectro), sem depender de como cada osso foi orientado na exportação.
 */

const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _q3 = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _id = new THREE.Quaternion();
const _hf = new THREE.Vector3();
const _hn = new THREE.Vector3();
const _hi = new THREE.Vector3();
const _ax = new THREE.Vector3();

export const clamp = (x: number, a: number, b: number): number => (x < a ? a : x > b ? b : x);
export const smooth = (x: number): number => {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
};
/** 0 antes de a, 1 depois de b, suave no meio */
export const span = (t: number, a: number, b: number): number => smooth((t - a) / Math.max(1e-4, b - a));
/** sobe em a..b, fica, desce em c..d */
export const env = (t: number, a: number, b: number, c: number, d: number): number => span(t, a, b) * (1 - span(t, c, d));

/** mola amortecida escalar: impulsos viram um tranco que assenta sozinho */
export class Spring {
  x = 0;
  v = 0;
  constructor(
    public k = 90,
    public damp = 11,
  ) {}
  kick(v: number): void {
    this.v += v;
  }
  update(dt: number, target = 0): number {
    // integração semi-implícita em passos curtos: estável a 30 ou 144 quadros por segundo
    const n = Math.max(1, Math.ceil(dt / (1 / 120)));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      this.v += (-(this.x - target) * this.k - this.v * this.damp) * h;
      this.x += this.v * h;
    }
    return this.x;
  }
}

/** valor que persegue o alvo com amortecimento exponencial (independe da taxa de quadros) */
/**
 * O AnimationMixer só escreve num osso quando o valor calculado muda de um quadro para o outro. Como as camadas
 * procedurais voltam os ossos ao repouso antes do mixer, um clipe com trilha constante (a junta do quadril dos
 * clipes de captura, uma pose segurada) deixava o osso no repouso: as pernas abriam no idle. Isto invalida o
 * valor do quadro anterior em cada vínculo ativo, e o mixer volta a escrever tudo neste quadro.
 */
export function forceMixerWrite(mixer: THREE.AnimationMixer): void {
  const m = mixer as unknown as { _bindings: Array<{ buffer: Float64Array; valueSize: number }>; _accuIndex: number; _nActiveBindings: number };
  if (!m._bindings) return;
  const prev = m._accuIndex;
  for (let i = 0; i < m._nActiveBindings; i++) {
    const b = m._bindings[i];
    b.buffer[prev * b.valueSize + b.valueSize] = NaN;
  }
}

export function approach(cur: number, target: number, rate: number, dt: number): number {
  return cur + (target - cur) * (1 - Math.exp(-rate * dt));
}

export type V3 = [number, number, number];

/** Esqueleto de uma figura, com operações no espaço do personagem. */
export class Rig {
  bones = new Map<string, THREE.Object3D>();
  /** comprimento do braço (ombro ao punho), para escalar gestos */
  constructor(
    scene: THREE.Object3D,
    public space: THREE.Object3D,
  ) {
    scene.traverse((o) => {
      if ((o as THREE.Bone).isBone || /^(Hips|Spine|Neck|Head|Left|Right|L|R)/.test(o.name)) if (!this.bones.has(o.name)) this.bones.set(o.name, o);
    });
  }
  get(n: string): THREE.Object3D | null {
    return this.bones.get(n) ?? null;
  }
  has(n: string): boolean {
    return this.bones.has(n);
  }
  /** rotação acumulada do objeto até o espaço do personagem (sem ele) */
  charQuat(o: THREE.Object3D, out: THREE.Quaternion): THREE.Quaternion {
    out.copy(o.quaternion);
    let p = o.parent;
    while (p && p !== this.space) {
      out.premultiply(p.quaternion);
      p = p.parent;
    }
    return out;
  }
  /** gira o osso por uma rotação dada no espaço do personagem */
  turnQ(name: string, r: THREE.Quaternion): void {
    const b = this.bones.get(name);
    if (!b || !b.parent) return;
    this.charQuat(b.parent, _q2);
    // delta local = P^-1 R P
    _q3.copy(_q2).invert().multiply(r).multiply(_q2);
    b.quaternion.premultiply(_q3).normalize();
  }
  /** gira o osso por ângulos de Euler (radianos) no espaço do personagem: x inclina para a frente, y gira, z tomba */
  turn(name: string, x: number, y: number, z: number, w = 1): void {
    if (!w || (!x && !y && !z)) return;
    _e.set(x * w, y * w, z * w, 'YXZ');
    _q.setFromEuler(_e);
    this.turnQ(name, _q);
  }
  /** direção do osso (dele até o filho) no espaço do personagem */
  dir(name: string, child: string, out: THREE.Vector3): THREE.Vector3 | null {
    const b = this.bones.get(name);
    const c = this.bones.get(child);
    if (!b || !c) return null;
    this.charQuat(b, _q);
    return out.copy(c.position).applyQuaternion(_q).normalize();
  }
  /** aponta o osso (para o filho) na direção dada, com peso 0..1 */
  aim(name: string, child: string, d: V3 | THREE.Vector3, w = 1): void {
    if (w <= 0.001) return;
    if (!this.dir(name, child, _v)) return;
    if (Array.isArray(d)) _v2.set(d[0], d[1], d[2]);
    else _v2.copy(d);
    if (_v2.lengthSq() < 1e-6) return;
    _v2.normalize();
    _q.setFromUnitVectors(_v, _v2);
    if (w < 1) _q.slerpQuaternions(_id, _q, w);
    this.turnQ(name, _q);
  }
  /**
   * Fecha a mão (0 aberta, 1 punho). No cmu_mb da forja o polegar fica para o dorso; os dedos giram para o lado
   * oposto a ele, que é a palma (conferido em close, docs/game/capturas/movimento/maos_*.jpg). Sem ossos de dedo
   * (rig do Espectro), não faz nada.
   */
  grip(side: 'Left' | 'Right', k: number): void {
    if (Math.abs(k) <= 0.01) return;
    const s = side === 'Left' ? 'L' : 'R';
    const fb = this.bones.get(side + 'FingerBase');
    const f1 = this.bones.get(side + 'HandFinger1');
    const th = this.bones.get(s + 'Thumb');
    if (!this.hand(side, _hf, _hn, _hi) || !fb) return;
    // eixo de dobra dos dedos: a linha dos nós (indicador ao mínimo)
    _q.setFromAxisAngle(_ax.crossVectors(_hf, _hn).normalize(), 1.1 * k);
    this.turnQ(side + 'FingerBase', _q);
    if (f1) this.turnQ(side + 'HandFinger1', _q.setFromAxisAngle(_ax, 0.95 * k));
    // polegar fecha por cima dos dedos
    if (th) this.turnQ(s + 'Thumb', _q.setFromAxisAngle(_hf, (side === 'Left' ? 0.5 : -0.5) * k));
  }
  /**
   * Eixos da mão no espaço do personagem: f (punho aos dedos), n (normal da palma) e i (linha dos nós, para o lado
   * do indicador e do polegar). Falso sem os ossos.
   */
  hand(side: 'Left' | 'Right', f: THREE.Vector3, n: THREE.Vector3, i: THREE.Vector3): boolean {
    const hand = this.bones.get(side + 'Hand');
    const fb = this.bones.get(side + 'FingerBase');
    const th = this.bones.get((side === 'Left' ? 'L' : 'R') + 'Thumb');
    if (!hand || !fb || !th) return false;
    this.charQuat(hand, _q);
    f.copy(fb.position).applyQuaternion(_q).normalize();
    const t = _ax.copy(th.position).applyQuaternion(_q).normalize();
    // o polegar aponta para o dorso: a palma é o lado oposto
    n.copy(t).addScaledVector(f, -t.dot(f)).normalize().negate();
    if (side === 'Left') i.crossVectors(n, f).normalize();
    else i.crossVectors(f, n).normalize();
    return true;
  }
  /**
   * Gira o punho para a linha dos nós seguir `axis` (o cabo de um objeto segurado) e devolve, no espaço do
   * personagem, o centro do punho fechado, onde o cabo passa.
   */
  holdAxis(side: 'Left' | 'Right', axis: THREE.Vector3, out: THREE.Vector3, maxTwist = 1.8): THREE.Vector3 | null {
    if (!this.hand(side, _hf, _hn, _hi)) return null;
    _q.setFromUnitVectors(_hi, _ax.copy(axis).normalize());
    const ang = 2 * Math.acos(clamp(Math.abs(_q.w), 0, 1));
    if (ang > maxTwist) _q.slerpQuaternions(_id, _q, maxTwist / ang);
    this.turnQ(side + 'Hand', _q);
    if (!this.pos(side + 'Hand', out) || !this.pos(side + 'FingerBase', _v)) return null;
    this.hand(side, _hf, _hn, _hi);
    const len = out.distanceTo(_v);
    return out.lerp(_v, 0.55).addScaledVector(_hn, len * 0.28);
  }
  /** posição do osso no espaço do personagem */
  pos(name: string, out: THREE.Vector3): THREE.Vector3 | null {
    const b = this.bones.get(name);
    if (!b) return null;
    b.updateWorldMatrix(true, false);
    out.setFromMatrixPosition(b.matrixWorld);
    return this.space.worldToLocal(out);
  }
}

/**
 * Pose: braços apontados (direção do braço e do antebraço no espaço do personagem) e giros de tronco, pescoço e
 * cabeça. Campos ausentes deixam o clipe como está.
 */
export interface Pose {
  /** braço esquerdo e antebraço esquerdo */
  aL?: V3;
  fL?: V3;
  aR?: V3;
  fR?: V3;
  /** giros (x à frente, y gira, z tomba), radianos */
  hips?: V3;
  spine?: V3;
  chest?: V3;
  neck?: V3;
  head?: V3;
  /** ombros: subir (positivo) ou cair */
  shL?: number;
  shR?: number;
  /** pernas apontadas (coxa e canela), para pairar ou agachar */
  lL?: V3;
  sL?: V3;
  lR?: V3;
  sR?: V3;
  /** abaixa o quadril em metros (agachar, golpe pesado) */
  drop?: number;
}

/** espelha uma pose (esquerda vira direita) */
export function mirror(p: Pose): Pose {
  const m = (v?: V3): V3 | undefined => (v ? [-v[0], v[1], v[2]] : undefined);
  const r = (v?: V3): V3 | undefined => (v ? [v[0], -v[1], -v[2]] : undefined);
  return { aL: m(p.aR), fL: m(p.fR), aR: m(p.aL), fR: m(p.fL), hips: r(p.hips), spine: r(p.spine), chest: r(p.chest), neck: r(p.neck), head: r(p.head), shL: p.shR, shR: p.shL, lL: m(p.lR), sL: m(p.sR), lR: m(p.lL), sR: m(p.sL), drop: p.drop };
}

const lerpV = (a: V3 | undefined, b: V3 | undefined, t: number): V3 | undefined => {
  if (!a) return b;
  if (!b) return a;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
};
/** interpola duas poses (campo ausente em uma das duas fica o da outra) */
export function mix(a: Pose, b: Pose, t: number): Pose {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const o: Pose = {};
  for (const k of ['aL', 'fL', 'aR', 'fR', 'hips', 'spine', 'chest', 'neck', 'head', 'lL', 'sL', 'lR', 'sR'] as const) o[k] = lerpV(a[k], b[k], t);
  for (const k of ['shL', 'shR', 'drop'] as const) {
    const x = a[k];
    const y = b[k];
    o[k] = x === undefined ? y : y === undefined ? x : x + (y - x) * t;
  }
  return o;
}

/** aplica uma pose sobre o que o clipe deixou, com peso 0..1 */
export function applyPose(rig: Rig, p: Pose, w: number): void {
  if (w <= 0.001) return;
  const T = (n: string, v?: V3, k = 1) => v && rig.turn(n, v[0] * k, v[1] * k, v[2] * k, w);
  T('Hips', p.hips);
  // tronco dividido entre as vértebras para curvar em vez de dobrar num ponto só
  if (p.spine) {
    T('LowerBack', p.spine, 0.35);
    T('Spine', p.spine, 0.35);
    T('Spine1', p.spine, rig.has('LowerBack') ? 0.3 : 0.65);
  }
  T('Spine1', p.chest);
  if (p.neck) {
    T('Neck', p.neck, rig.has('Neck1') ? 0.5 : 1);
    T('Neck1', p.neck, 0.5);
  }
  T('Head', p.head);
  if (p.shL) rig.turn('LeftShoulder', 0, 0, p.shL, w);
  if (p.shR) rig.turn('RightShoulder', 0, 0, -p.shR, w);
  if (p.aL) rig.aim('LeftArm', 'LeftForeArm', p.aL, w);
  if (p.fL) rig.aim('LeftForeArm', 'LeftHand', p.fL, w);
  if (p.aR) rig.aim('RightArm', 'RightForeArm', p.aR, w);
  if (p.fR) rig.aim('RightForeArm', 'RightHand', p.fR, w);
  if (p.lL) rig.aim('LeftUpLeg', 'LeftLeg', p.lL, w);
  if (p.sL) rig.aim('LeftLeg', 'LeftFoot', p.sL, w);
  if (p.lR) rig.aim('RightUpLeg', 'RightLeg', p.lR, w);
  if (p.sR) rig.aim('RightLeg', 'RightFoot', p.sR, w);
}

/** Olhar: cabeça e pescoço viram para um ponto, com limite e um atraso de quem decide olhar. */
export class Gaze {
  yaw = 0;
  pitch = 0;
  private ty = 0;
  private tp = 0;
  private hold = 0;
  constructor(
    public maxYaw = 1.05,
    public rate = 5,
  ) {}
  /** alvo no espaço do personagem (null: olha à frente) */
  update(rig: Rig, target: THREE.Vector3 | null, dt: number, w = 1): void {
    this.hold -= dt;
    if (this.hold <= 0) {
      // o olhar salta e fica, como olho de gente: não segue o alvo de forma contínua
      this.hold = 0.18 + Math.random() * 0.25;
      if (target && rig.pos('Head', _v)) {
        const dx = target.x - _v.x;
        const dz = target.z - _v.z;
        const dy = target.y - _v.y;
        let y = Math.atan2(dx, dz);
        // atrás do ombro não vira a cabeça: volta à frente
        if (Math.abs(y) > this.maxYaw + 0.6) y = 0;
        this.ty = clamp(y, -this.maxYaw, this.maxYaw);
        this.tp = clamp(-Math.atan2(dy, Math.hypot(dx, dz)), -0.45, 0.5);
      } else {
        this.ty = 0;
        this.tp = 0;
      }
    }
    this.yaw = approach(this.yaw, this.ty, this.rate, dt);
    this.pitch = approach(this.pitch, this.tp, this.rate, dt);
    if (w <= 0.001) return;
    // pescoço leva 40%, cabeça o resto; o peito acompanha um pouco quando o giro é grande
    rig.turn('Spine1', 0, this.yaw * 0.18, 0, w);
    const neck = rig.has('Neck1') ? 'Neck1' : 'Neck';
    rig.turn(neck, this.pitch * 0.4, this.yaw * 0.35, 0, w);
    rig.turn('Head', this.pitch * 0.6, this.yaw * 0.47, 0, w);
  }
}

/** Rosto por morph targets (forja: piscar, sobrancelha_erguer, sobrancelha_franzir, boca_abrir, sorriso, tristeza). */
export class Face {
  private targets: Array<{ inf: number[]; idx: Record<string, number> }> = [];
  private blinkT = 1 + Math.random() * 3;
  private blink = 0;
  private cur: Record<string, number> = {};
  /** expressão desejada (0..1 por canal); boca e piscar são do próprio rosto */
  want: Record<string, number> = {};
  /** fala em curso: abre e fecha a boca em sílabas */
  speaking = false;
  private syl = 0;
  constructor(scene: THREE.Object3D) {
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && m.morphTargetDictionary && m.morphTargetInfluences && 'piscar' in m.morphTargetDictionary) this.targets.push({ inf: m.morphTargetInfluences, idx: m.morphTargetDictionary });
    });
  }
  get ok(): boolean {
    return this.targets.length > 0;
  }
  update(dt: number, t: number): void {
    if (!this.targets.length) return;
    this.blinkT -= dt;
    if (this.blinkT <= 0) {
      this.blink = 0.14;
      // às vezes duas piscadas seguidas
      this.blinkT = Math.random() < 0.2 ? 0.25 : 2 + Math.random() * 4;
    }
    this.blink = Math.max(0, this.blink - dt);
    let mouth = 0;
    if (this.speaking) {
      this.syl += dt * (9 + Math.sin(t * 1.7) * 2);
      // sílabas com pausas entre palavras
      mouth = Math.max(0, Math.sin(this.syl)) * (Math.sin(t * 2.9) > -0.55 ? 0.75 : 0.1);
    }
    const ch: Record<string, number> = {
      piscar: this.blink > 0 ? Math.sin((1 - this.blink / 0.14) * Math.PI) : 0,
      // acima de 0,5 aparece a língua (forja): a fala fica entre 0,1 e 0,45
      boca_abrir: Math.min(0.5, mouth * 0.6 + (this.want.boca_abrir ?? 0)),
      sobrancelha_erguer: this.want.sobrancelha_erguer ?? 0,
      sobrancelha_franzir: this.want.sobrancelha_franzir ?? 0,
      sorriso: this.want.sorriso ?? 0,
      tristeza: this.want.tristeza ?? 0,
    };
    for (const k in ch) {
      const rate = k === 'piscar' || k === 'boca_abrir' ? 40 : 6;
      this.cur[k] = approach(this.cur[k] ?? 0, clamp(ch[k], 0, 1), rate, dt);
      for (const tg of this.targets) {
        const i = tg.idx[k];
        if (i !== undefined) tg.inf[i] = this.cur[k];
      }
    }
  }
}

export interface GaitInfo {
  /** velocidade do pé de apoio com o clipe em escala 1 (m/s, no espaço do personagem) */
  nat: number;
  dur: number;
  /** fase (0..1) em que o pé esquerdo está mais à frente: alinha andar e correr na troca */
  phase: number;
}
const gaitCache = new Map<string, GaitInfo>();

/**
 * Mede a velocidade natural de um clipe de locomoção pelo pé de apoio. Com ela, a passada acompanha a
 * velocidade real e o pé não desliza. O resultado fica guardado por clipe (instâncias do mesmo modelo dividem).
 */
export function measureGait(mixer: THREE.AnimationMixer, clip: THREE.AnimationClip, rig: Rig): GaitInfo | null {
  const hit = gaitCache.get(clip.uuid);
  if (hit) return hit;
  const L = rig.get('LeftFoot');
  const R = rig.get('RightFoot');
  if (!L || !R) return null;
  const act = mixer.clipAction(clip);
  const prevW = act.getEffectiveWeight();
  const wasRunning = act.isRunning();
  act.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).play();
  const dt = 1 / 90;
  const pts: Array<[number, number, number, number]> = [];
  let minY = 1e9;
  for (let t = 0; t < clip.duration; t += dt) {
    act.time = t;
    mixer.update(0);
    rig.pos('LeftFoot', _v);
    rig.pos('RightFoot', _v2);
    pts.push([_v.y, _v.z, _v2.y, _v2.z]);
    minY = Math.min(minY, _v.y, _v2.y);
  }
  act.stop();
  if (wasRunning) act.play().setEffectiveWeight(prevW);
  let acc = 0;
  let n = 0;
  let best = -1e9;
  let phase = 0;
  for (let i = 1; i < pts.length; i++) {
    for (const k of [0, 2]) {
      const [y, z] = [pts[i][k], pts[i][k + 1]];
      const [py, pz] = [pts[i - 1][k], pts[i - 1][k + 1]];
      if (y < minY + 0.035 && py < minY + 0.035) {
        acc += (pz - z) / dt;
        n++;
      }
    }
    if (pts[i][1] > best) {
      best = pts[i][1];
      phase = i / pts.length;
    }
  }
  const info = { nat: n ? Math.max(0.2, acc / n) : 1, dur: clip.duration, phase };
  gaitCache.set(clip.uuid, info);
  return info;
}
