import * as THREE from 'three';
import { loadGltf, instance } from '../core/assets';
import { M } from '../world/mats';

/**
 * Armas na mão: modelos Poly Haven (CC0) normalizados em comprimento e empunhadura, com a lâmina em +Y
 * e a origem no ponto da mão. A pose de golpe é calculada no espaço do personagem (ver `weaponDir`),
 * o que mantém o arco do golpe legível mesmo que o braço da captura de movimento varie.
 */
export interface WeaponLook {
  model: string;
  /** comprimento total em metros */
  length: number;
  /** fração do comprimento, a partir do pomo, onde a mão segura */
  grip: number;
}

export const WEAPON_LOOKS: Record<string, WeaponLook> = {
  estoque: { model: 'antique_estoc', length: 1.08, grip: 0.15 },
  sabre: { model: 'wooden_handle_saber', length: 0.95, grip: 0.16 },
  adaga: { model: 'ornate_medieval_dagger', length: 0.4, grip: 0.22 },
  machete: { model: 'machete', length: 0.72, grip: 0.17 },
  maca: { model: 'ornate_medieval_mace', length: 0.78, grip: 0.22 },
  martelo: { model: 'ornate_war_hammer', length: 0.88, grip: 0.2 },
  machado: { model: 'wooden_axe', length: 0.82, grip: 0.18 },
};

const path = (m: string) => `models/props/${m}.glb`;
const cache = new Map<string, THREE.Group>();

/** Garante o arquivo carregado; devolve falso se não houver como mostrar a arma. */
export async function preloadWeapon(kind: string): Promise<boolean> {
  const look = WEAPON_LOOKS[kind];
  if (!look) return false;
  return !!(await loadGltf(path(look.model)));
}

/** Modelo normalizado: lâmina em +Y, origem na empunhadura. Nulo se o arquivo não carregou. */
export function buildWeapon(kind: string): THREE.Group | null {
  const look = WEAPON_LOOKS[kind];
  if (!look) return null;
  let base = cache.get(kind);
  if (!base) {
    const inst = instance(path(look.model));
    if (!inst) return null;
    inst.traverse((o) => {
      if (/scabbard|sheath/i.test(o.name)) o.visible = false;
    });
    // eixo mais longo = lâmina; a ponta é o extremo mais estreito
    inst.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(inst);
    const size = box.getSize(new THREE.Vector3());
    const axis = size.x >= size.y && size.x >= size.z ? 0 : size.y >= size.z ? 1 : 2;
    const lo = box.min.getComponent(axis);
    const span = size.getComponent(axis);
    const spread = [0, 0].map(() => ({ min: new THREE.Vector2(1e9, 1e9), max: new THREE.Vector2(-1e9, -1e9) }));
    const v = new THREE.Vector3();
    const other = [0, 1, 2].filter((i) => i !== axis);
    inst.traverse((o) => {
      const me = o as THREE.Mesh;
      if (!me.isMesh || !me.visible) return;
      const pos = me.geometry.getAttribute('position');
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(me.matrixWorld);
        const t = (v.getComponent(axis) - lo) / span;
        const s = t < 0.14 ? spread[0] : t > 0.86 ? spread[1] : null;
        if (!s) continue;
        s.min.set(Math.min(s.min.x, v.getComponent(other[0])), Math.min(s.min.y, v.getComponent(other[1])));
        s.max.set(Math.max(s.max.x, v.getComponent(other[0])), Math.max(s.max.y, v.getComponent(other[1])));
      }
    });
    const area = (s: { min: THREE.Vector2; max: THREE.Vector2 }) => Math.max(0, s.max.x - s.min.x) * Math.max(0, s.max.y - s.min.y);
    // cabo e guarda são mais largos que a ponta; machados e martelos têm a cabeça larga na ponta do cabo
    const tipAtHigh = look.model.includes('axe') || look.model.includes('hammer') || look.model.includes('mace') ? area(spread[1]) > area(spread[0]) : area(spread[1]) < area(spread[0]);
    const dir = new THREE.Vector3();
    dir.setComponent(axis, tipAtHigh ? 1 : -1);
    const q = new THREE.Quaternion().setFromUnitVectors(dir, new THREE.Vector3(0, 1, 0));
    const holder = new THREE.Group();
    holder.add(inst);
    inst.quaternion.premultiply(q);
    holder.updateMatrixWorld(true);
    const b2 = new THREE.Box3().setFromObject(holder);
    const k = look.length / Math.max(0.01, b2.max.y - b2.min.y);
    inst.scale.multiplyScalar(k);
    holder.updateMatrixWorld(true);
    const b3 = new THREE.Box3().setFromObject(holder);
    const c = b3.getCenter(new THREE.Vector3());
    inst.position.set(-c.x, -(b3.min.y + look.grip * look.length), -c.z);
    holder.traverse((o) => {
      const me = o as THREE.Mesh;
      if (me.isMesh) me.castShadow = true;
    });
    base = holder;
    cache.set(kind, base);
  }
  const g = new THREE.Group();
  g.add(base.clone(true));
  return g;
}

const UP = new THREE.Vector3(0, 1, 0);
const _d = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _r = new THREE.Quaternion();

function ease(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}
function span(t: number, a: number, b: number): number {
  return ease((t - a) / (b - a));
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const DEG = Math.PI / 180;

/**
 * Orientação da lâmina no espaço do personagem (+Z à frente, +X à esquerda de quem olha para +Z).
 * `yaw` gira em torno do corpo (0 = à frente, positivo = para a esquerda); `elev` sobe da horizontal.
 */
export function weaponDir(action: string, p: number): { yaw: number; elev: number; roll: number } {
  switch (action) {
    case 'attack1': {
      // corte horizontal da direita para a esquerda: arma recua, corta, recupera
      const wind = span(p, 0, 0.22);
      const cut = span(p, 0.22, 0.52);
      const back = span(p, 0.62, 1);
      let yaw = lerp(-14, -78, wind);
      yaw = lerp(yaw, 82, cut);
      yaw = lerp(yaw, -14, back);
      const elev = lerp(36, 24, wind) + lerp(0, -14, cut) + lerp(0, 26, back);
      return { yaw: yaw * DEG, elev: elev * DEG, roll: lerp(0, 1.4, cut) * (1 - back) };
    }
    case 'attack2': {
      // corte de volta, da esquerda para a direita, um pouco mais alto
      const wind = span(p, 0, 0.22);
      const cut = span(p, 0.22, 0.52);
      const back = span(p, 0.62, 1);
      let yaw = lerp(-14, 74, wind);
      yaw = lerp(yaw, -88, cut);
      yaw = lerp(yaw, -14, back);
      const elev = lerp(36, 50, wind) + lerp(0, -30, cut) + lerp(0, 16, back);
      return { yaw: yaw * DEG, elev: elev * DEG, roll: lerp(0, -1.4, cut) * (1 - back) };
    }
    case 'heavy': {
      // golpe firme: arma sobe atrás do ombro e desce em arco sobre o alvo
      const wind = span(p, 0, 0.42);
      const chop = span(p, 0.42, 0.64);
      const back = span(p, 0.74, 1);
      let elev = lerp(36, 128, wind);
      elev = lerp(elev, -34, chop);
      elev = lerp(elev, 36, back);
      const yaw = lerp(-14, -4, wind) + lerp(0, 8, chop);
      return { yaw: yaw * DEG, elev: elev * DEG, roll: 0 };
    }
    case 'dodge':
      return { yaw: -50 * DEG, elev: 8 * DEG, roll: 0 };
    case 'hit':
      return { yaw: -30 * DEG, elev: 70 * DEG, roll: 0 };
    case 'interact':
    case 'cast':
      return { yaw: -24 * DEG, elev: 52 * DEG, roll: 0 };
    default:
      return { yaw: -14 * DEG, elev: 36 * DEG, roll: 0 };
  }
}

/** Aplica a orientação à arma (rotação no espaço do personagem). */
export function orientWeapon(w: THREE.Object3D, d: { yaw: number; elev: number; roll: number }): void {
  const ce = Math.cos(d.elev);
  _d.set(Math.sin(d.yaw) * ce, Math.sin(d.elev), Math.cos(d.yaw) * ce).normalize();
  _q.setFromUnitVectors(UP, _d);
  _r.setFromAxisAngle(_d, d.roll);
  w.quaternion.copy(_r.multiply(_q));
}

/** Tocha: cabo torneado de madeira, pano embebido em piche, chama em shader e uma luz. */
export class TorchModel {
  group = new THREE.Group();
  tip = new THREE.Object3D();
  private mat: THREE.ShaderMaterial;
  constructor() {
    const prof: THREE.Vector2[] = [];
    const pts: Array<[number, number]> = [[0.0, 0], [0.016, 0.0], [0.019, 0.05], [0.021, 0.3], [0.023, 0.36], [0.026, 0.38], [0.03, 0.4], [0.042, 0.43], [0.052, 0.47], [0.054, 0.51], [0.046, 0.55], [0.03, 0.57], [0, 0.575]];
    for (const [r, y] of pts) prof.push(new THREE.Vector2(r, y));
    const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 36), M.woodDark);
    body.castShadow = true;
    this.group.add(body);
    // pano e cordas: anéis finos sobre a cabeça
    const rope = new THREE.MeshStandardMaterial({ color: 0x4a3724, roughness: 0.95 });
    for (const [y, r] of [[0.41, 0.036], [0.445, 0.048]] as Array<[number, number]>) {
      const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.006, 8, 32), rope);
      t.rotation.x = Math.PI / 2;
      t.position.y = y;
      this.group.add(t);
    }
    const ferr = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, 0.05, 24), M.bronze);
    ferr.position.y = 0.33;
    this.group.add(ferr);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uC: { value: new THREE.Color(0xff9a3c).multiplyScalar(2.1) } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform float uT; uniform vec3 uC; varying vec2 vUv;
        float h(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
        float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
        void main(){
          vec2 q = vUv; q.x = (q.x - 0.5) * 2.0;
          float wob = (n(vec2(q.y * 3.0 - uT * 3.2, uT * 0.7)) - 0.5) * 0.5 * q.y;
          float w = abs(q.x + wob);
          float body = smoothstep(1.0 - q.y * 0.95, 0.0, w) * smoothstep(0.0, 0.12, q.y) * (1.0 - smoothstep(0.7, 1.0, q.y));
          float flick = 0.75 + 0.25 * n(vec2(uT * 9.0, q.y * 4.0));
          vec3 col = mix(uC, vec3(1.0, 0.95, 0.65) * 1.6, smoothstep(0.55, 0.0, q.y) * (1.0 - w));
          gl_FragColor = vec4(col * flick, body * 0.95);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.34, 1, 1), this.mat);
      m.position.y = 0.74;
      m.rotation.y = (i * Math.PI) / 3;
      m.renderOrder = 6;
      this.group.add(m);
    }
    this.tip.position.y = 0.72;
    this.group.add(this.tip);
  }
  update(t: number): void {
    this.mat.uniforms.uT.value = t;
  }
}
