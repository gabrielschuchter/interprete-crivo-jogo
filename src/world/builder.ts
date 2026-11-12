import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { prop, type PropName } from '../core/assets';

export interface Collider {
  kind: 'box' | 'circle';
  x: number;
  z: number;
  hx: number;
  hz: number;
  rot: number;
  r: number;
  yMin: number;
  yMax: number;
  /** identificador opcional para remover (portas, pontes) */
  tag?: string;
}

/** Trecho de chão caminhável: retângulo orientado com altura linear ao longo do z local. */
export interface Platform {
  x: number;
  z: number;
  hx: number;
  hz: number;
  rot: number;
  h0: number;
  h1: number;
  tag?: string;
}

export interface LampSpec {
  pos: THREE.Vector3;
  color: number;
  intensity: number;
  range: number;
  flicker: number;
}

interface StaticPart {
  geo: THREE.BufferGeometry;
  mat: THREE.Material;
  keepUV: boolean;
  shadow: boolean;
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3(1, 1, 1);
const _p = new THREE.Vector3();

export function trs(x: number, y: number, z: number, rotY = 0, rotX = 0, rotZ = 0, sx = 1, sy = 1, sz = 1): THREE.Matrix4 {
  _e.set(rotX, rotY, rotZ, 'YXZ');
  _q.setFromEuler(_e);
  _p.set(x, y, z);
  _s.set(sx, sy, sz);
  return new THREE.Matrix4().compose(_p, _q, _s);
}

/** UV em metros por projeção triplanar por triângulo. */
function worldUV(geo: THREE.BufferGeometry): void {
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const uv = new Float32Array(pos.count * 2);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    c.fromBufferAttribute(pos, i + 2);
    n.subVectors(b, a).cross(c.clone().sub(a));
    const ax = Math.abs(n.x);
    const ay = Math.abs(n.y);
    const az = Math.abs(n.z);
    for (let k = 0; k < 3; k++) {
      const v = k === 0 ? a : k === 1 ? b : c;
      let u0: number;
      let v0: number;
      if (ay >= ax && ay >= az) {
        u0 = v.x;
        v0 = v.z;
      } else if (ax >= az) {
        u0 = v.z;
        v0 = v.y;
      } else {
        u0 = v.x;
        v0 = v.y;
      }
      uv[(i + k) * 2] = u0;
      uv[(i + k) * 2 + 1] = v0;
    }
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

function normalize(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', g.getAttribute('position'));
  if (!g.getAttribute('normal')) g.computeVertexNormals();
  out.setAttribute('normal', g.getAttribute('normal'));
  const uv = g.getAttribute('uv');
  out.setAttribute('uv', uv ?? new THREE.BufferAttribute(new Float32Array(g.getAttribute('position').count * 2), 2));
  return out;
}

export class RegionBuilder {
  root = new THREE.Group();
  colliders: Collider[] = [];
  platforms: Platform[] = [];
  lamps: LampSpec[] = [];
  updaters: Array<(dt: number, t: number) => void> = [];
  private parts: StaticPart[] = [];

  /** Acrescenta geometria estática (será fundida por material). */
  add(geo: THREE.BufferGeometry, mat: THREE.Material, matrix: THREE.Matrix4, keepUV = false, shadow = true): void {
    const g = normalize(geo);
    g.applyMatrix4(matrix);
    this.parts.push({ geo: g, mat, keepUV, shadow });
  }

  /** Caixa com base em y. */
  box(mat: THREE.Material, w: number, h: number, d: number, x: number, y: number, z: number, rot = 0, collide = false, tag?: string): void {
    this.add(new THREE.BoxGeometry(w, h, d), mat, trs(x, y + h / 2, z, rot));
    if (collide) this.collideBox(x, z, w / 2, d / 2, rot, y, y + h, tag);
  }

  collideBox(x: number, z: number, hx: number, hz: number, rot = 0, yMin = -1, yMax = 50, tag?: string): void {
    this.colliders.push({ kind: 'box', x, z, hx, hz, rot, r: 0, yMin, yMax, tag });
  }

  collideCircle(x: number, z: number, r: number, yMin = -1, yMax = 50, tag?: string): void {
    this.colliders.push({ kind: 'circle', x, z, hx: 0, hz: 0, rot: 0, r, yMin, yMax, tag });
  }

  platform(x: number, z: number, hx: number, hz: number, rot: number, h0: number, h1 = h0, tag?: string): void {
    this.platforms.push({ x, z, hx, hz, rot, h0, h1, tag });
  }

  lamp(x: number, y: number, z: number, color = 0xffb060, intensity = 1, range = 14, flicker = 0.08): void {
    this.lamps.push({ pos: new THREE.Vector3(x, y, z), color, intensity, range, flicker });
  }

  /**
   * Prop glTF de alta resolução (precisa ter sido pré-carregado).
   * `size` em metros: altura alvo se `fit` = 'h', maior lado horizontal se 'w'; omitido usa escala 1.
   * Devolve null quando o arquivo não está disponível, para o chamador usar a versão procedural.
   */
  place(
    name: PropName,
    x: number,
    y: number,
    z: number,
    rot = 0,
    opts: { size?: number; fit?: 'h' | 'w' | 'l'; part?: string; collide?: 'box' | 'circle' | false; pad?: number; tint?: number; tilt?: number; roll?: number } = {},
  ): THREE.Object3D | null {
    let o = prop(name, opts.part);
    if (!o) return null;
    if (opts.tilt || opts.roll) {
      // deitar o objeto (armas sobre a mesa): gira em x/z e volta a apoiar em y = 0
      const w = new THREE.Group();
      o.rotation.set(opts.tilt ?? 0, 0, opts.roll ?? 0);
      w.add(o);
      w.updateMatrixWorld(true);
      const bx = new THREE.Box3().setFromObject(w);
      o.position.set(-(bx.min.x + bx.max.x) / 2, -bx.min.y, -(bx.min.z + bx.max.z) / 2);
      o = w;
    }
    o.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(o);
    const sz = box.getSize(new THREE.Vector3());
    let s = 1;
    if (opts.size) s = opts.fit === 'w' ? opts.size / Math.max(sz.x, sz.z, 1e-3) : opts.fit === 'l' ? opts.size / Math.max(sz.x, sz.y, sz.z, 1e-3) : opts.size / Math.max(sz.y, 1e-3);
    o.scale.setScalar(s);
    o.position.set(x, y, z);
    o.rotation.y = rot;
    if (opts.tint !== undefined) {
      const c = new THREE.Color(opts.tint);
      o.traverse((m) => {
        const me = m as THREE.Mesh;
        if (!me.isMesh) return;
        const mat = (me.material as THREE.MeshStandardMaterial).clone();
        mat.color.multiply(c);
        me.material = mat;
      });
    }
    o.traverse((m) => {
      m.matrixAutoUpdate = false;
      m.updateMatrix();
    });
    o.updateMatrixWorld(true);
    this.root.add(o);
    const col = opts.collide ?? 'box';
    if (col) {
      const pad = opts.pad ?? 0;
      const hx = (sz.x * s) / 2 + pad;
      const hz = (sz.z * s) / 2 + pad;
      if (col === 'circle') this.collideCircle(x, z, Math.max(hx, hz), y - 1, y + sz.y * s);
      else this.collideBox(x, z, hx, hz, rot, y - 1, y + sz.y * s);
    }
    return o;
  }

  /** Objeto dinâmico (não fundido). */
  dynamic<T extends THREE.Object3D>(o: T): T {
    this.root.add(o);
    return o;
  }

  finalize(): void {
    const groups = new Map<THREE.Material, { geos: THREE.BufferGeometry[]; shadow: boolean }>();
    for (const p of this.parts) {
      if (!p.keepUV) worldUV(p.geo);
      let g = groups.get(p.mat);
      if (!g) groups.set(p.mat, (g = { geos: [], shadow: p.shadow }));
      g.geos.push(p.geo);
      g.shadow = g.shadow && p.shadow;
    }
    for (const [mat, g] of groups) {
      const merged = mergeGeometries(g.geos, false);
      if (!merged) continue;
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, mat);
      const transparent = (mat as THREE.Material).transparent || (mat as THREE.MeshStandardMaterial).alphaTest > 0;
      mesh.castShadow = g.shadow && !(mat as THREE.Material).transparent;
      mesh.receiveShadow = !transparent || (mat as THREE.MeshStandardMaterial).alphaTest > 0;
      mesh.matrixAutoUpdate = false;
      this.root.add(mesh);
      for (const geo of g.geos) geo.dispose();
    }
    this.parts = [];
  }
}
