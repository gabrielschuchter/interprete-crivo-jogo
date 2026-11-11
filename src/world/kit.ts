import * as THREE from 'three';
import { RegionBuilder, trs } from './builder';
import { M } from './mats';
import { BRAND, WORLD } from './palette';
import { glowSprite } from './textures';

/**
 * Kit modular de arquitetura gótica acadêmica.
 * Convenção: rot é rotação em Y; o eixo x local corre ao longo do comprimento.
 */

function ogive(shape: THREE.Shape | THREE.Path, ow: number, spring: number, y0 = 0, cx = 0): void {
  // arco ogival equilátero: dois arcos de raio ow centrados nas impostas opostas
  shape.moveTo(cx - ow / 2, y0);
  shape.lineTo(cx - ow / 2, y0 + spring);
  shape.absarc(cx + ow / 2, y0 + spring, ow, Math.PI, (Math.PI * 2) / 3, true);
  shape.absarc(cx - ow / 2, y0 + spring, ow, Math.PI / 3, 0, true);
  shape.lineTo(cx + ow / 2, y0);
  shape.lineTo(cx - ow / 2, y0);
}

export function ogiveHeight(ow: number, spring: number): number {
  return spring + ow * 0.866;
}

/** Parede com vão ogival (portal). Centro da base em (x,z). */
export function archWall(
  b: RegionBuilder,
  x: number,
  z: number,
  rot: number,
  w: number,
  h: number,
  thick: number,
  ow: number,
  spring: number,
  mat: THREE.Material = M.stone,
  y0 = 0,
  collide = true,
): void {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(w / 2, h);
  s.lineTo(-w / 2, h);
  s.lineTo(-w / 2, 0);
  const hole = new THREE.Path();
  ogive(hole, ow, spring);
  s.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: false, curveSegments: 14 });
  g.translate(0, 0, -thick / 2);
  b.add(g, mat, trs(x, y0, z, rot));
  // arquivolta: moldura saliente
  const ring = new THREE.Shape();
  ogive(ring, ow + 0.7, spring);
  const rh = new THREE.Path();
  ogive(rh, ow, spring);
  ring.holes.push(rh);
  const rg = new THREE.ExtrudeGeometry(ring, { depth: thick + 0.36, bevelEnabled: false, curveSegments: 14 });
  rg.translate(0, 0, -(thick + 0.36) / 2);
  b.add(rg, M.carved, trs(x, y0, z, rot));
  const ring2 = new THREE.Shape();
  ogive(ring2, ow + 1.3, spring + 0.1);
  const rh2 = new THREE.Path();
  ogive(rh2, ow + 0.7, spring);
  ring2.holes.push(rh2);
  const rg2 = new THREE.ExtrudeGeometry(ring2, { depth: thick + 0.16, bevelEnabled: false, curveSegments: 14 });
  rg2.translate(0, 0, -(thick + 0.16) / 2);
  b.add(rg2, M.stoneDark, trs(x, y0, z, rot));
  if (collide) {
    const side = (w - ow) / 2;
    const c = Math.cos(rot);
    const sn = Math.sin(rot);
    for (const sgn of [-1, 1]) {
      const lx = sgn * (ow / 2 + side / 2);
      b.collideBox(x + lx * c, z - lx * sn, side / 2, thick / 2 + 0.05, rot, y0 - 1, y0 + h);
    }
  }
}

/** Janela ogival, acesa (âmbar) ou escura. Plano voltado para +z local. */
export function gothicWindow(b: RegionBuilder, x: number, y: number, z: number, rot: number, w: number, h: number, lit = true): void {
  const spring = h - w * 0.866;
  const s = new THREE.Shape();
  ogive(s, w, spring);
  const g = new THREE.ShapeGeometry(s, 10);
  const pos = g.getAttribute('position');
  const uv = g.getAttribute('uv') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h);
  b.add(g, lit ? M.glassAmber : M.glassDark, trs(x, y, z, rot), true, false);
  const frame = new THREE.Shape();
  ogive(frame, w + 0.5, spring);
  const fh = new THREE.Path();
  ogive(fh, w, spring);
  frame.holes.push(fh);
  const fg = new THREE.ExtrudeGeometry(frame, { depth: 0.34, bevelEnabled: false, curveSegments: 10 });
  fg.translate(0, 0, -0.14);
  b.add(fg, M.carved, trs(x, y, z, rot));
  // peitoril e mainel de pedra
  const c = Math.cos(rot);
  const sn = Math.sin(rot);
  b.add(new THREE.BoxGeometry(w + 0.8, 0.18, 0.5), M.carved, trs(x + 0.1 * sn, y - 0.09, z + 0.1 * c, rot));
  b.add(new THREE.BoxGeometry(0.1, h * 0.98, 0.12), M.stoneDark, trs(x + 0.03 * sn, y + h * 0.49, z + 0.03 * c, rot));
  b.add(new THREE.BoxGeometry(w, 0.08, 0.1), M.stoneDark, trs(x + 0.03 * sn, y + spring * 0.55, z + 0.03 * c, rot));
}

/** Pináculo: prisma + agulha + florão. */
export function pinnacle(b: RegionBuilder, x: number, y: number, z: number, size: number, h: number, mat: THREE.Material = M.stoneDark): void {
  b.add(new THREE.BoxGeometry(size, h * 0.35, size), mat, trs(x, y + h * 0.175, z));
  b.add(new THREE.BoxGeometry(size * 1.25, h * 0.04, size * 1.25), M.carved, trs(x, y + h * 0.35, z));
  b.add(new THREE.ConeGeometry(size * 0.72, h * 0.6, 4), mat, trs(x, y + h * 0.67, z, Math.PI / 4));
  b.add(new THREE.OctahedronGeometry(size * 0.26), M.bronze, trs(x, y + h * 0.99, z));
}

export function buttress(b: RegionBuilder, x: number, z: number, rot: number, h: number, depth = 1.2, w = 0.9, y0 = 0): void {
  // contraforte em três recuos
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const steps = [
    [depth, h * 0.45],
    [depth * 0.7, h * 0.3],
    [depth * 0.42, h * 0.25],
  ];
  let y = y0;
  for (const [d, hh] of steps) {
    const off = d / 2;
    b.add(new THREE.BoxGeometry(w, hh, d), M.stoneDark, trs(x + off * s, y + hh / 2, z + off * c, rot));
    b.add(new THREE.BoxGeometry(w + 0.12, 0.1, d + 0.1), M.carved, trs(x + off * s, y + hh, z + off * c, rot));
    y += hh;
  }
  pinnacle(b, x + 0.25 * s, y, z + 0.25 * c, w * 0.55, h * 0.28);
  b.collideBox(x + (depth / 2) * s, z + (depth / 2) * c, w / 2, depth / 2, rot, y0 - 1, y0 + h);
}

/** Telhado de duas águas com cumeeira ao longo do x local. */
export function gableRoof(b: RegionBuilder, x: number, y: number, z: number, rot: number, len: number, depth: number, rise: number): void {
  const s = new THREE.Shape();
  s.moveTo(-depth / 2 - 0.3, 0);
  s.lineTo(depth / 2 + 0.3, 0);
  s.lineTo(0, rise);
  s.lineTo(-depth / 2 - 0.3, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: len + 0.4, bevelEnabled: false });
  g.translate(0, 0, -(len + 0.4) / 2);
  b.add(g, M.slate, trs(x, y, z, rot + Math.PI / 2));
}

export interface FacadeOpts {
  floors?: number;
  windowW?: number;
  windowH?: number;
  bays?: number;
  lit?: number; // probabilidade de janela acesa
  mat?: THREE.Material;
  roof?: 'gable' | 'flat' | 'none';
  buttresses?: boolean;
  seed?: number;
  y0?: number;
  /** quais faces recebem janelas: frente (+z local) e/ou fundo */
  back?: boolean;
  sides?: boolean;
}

/** Edifício: corpo, janelas, cornija, telhado. Frente voltada para +z local. */
export function building(b: RegionBuilder, x: number, z: number, rot: number, w: number, h: number, d: number, o: FacadeOpts = {}): void {
  const mat = o.mat ?? M.stone;
  const y0 = o.y0 ?? 0;
  const floors = o.floors ?? Math.max(1, Math.round(h / 5.5));
  const bays = o.bays ?? Math.max(1, Math.round(w / 4));
  const ww = o.windowW ?? 1.3;
  const wh = o.windowH ?? 3.2;
  let seed = o.seed ?? Math.floor(Math.abs(x * 13 + z * 7)) + 1;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed & 0xffff) / 0xffff;
  };
  b.box(mat, w, h, d, x, y0, z, rot, true);
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const at = (lx: number, lz: number): [number, number] => [x + lx * c + lz * s, z - lx * s + lz * c];
  // soco e cornijas
  {
    b.add(new THREE.BoxGeometry(w + 0.3, 0.9, d + 0.3), M.stoneDark, trs(x, y0 + 0.45, z, rot));
    b.add(new THREE.BoxGeometry(w + 0.5, 0.3, d + 0.5), M.carved, trs(x, y0 + h - 0.15, z, rot));
    for (let f = 1; f < floors; f++) b.add(new THREE.BoxGeometry(w + 0.24, 0.16, d + 0.24), M.carved, trs(x, y0 + (h / floors) * f, z, rot));
  }
  const faces: Array<{ lz: number; r: number; len: number; axis: 'x' | 'z' }> = [{ lz: d / 2 + 0.02, r: rot, len: w, axis: 'x' }];
  if (o.back) faces.push({ lz: -d / 2 - 0.02, r: rot + Math.PI, len: w, axis: 'x' });
  if (o.sides) {
    faces.push({ lz: w / 2 + 0.02, r: rot + Math.PI / 2, len: d, axis: 'z' });
    faces.push({ lz: -w / 2 - 0.02, r: rot - Math.PI / 2, len: d, axis: 'z' });
  }
  for (const face of faces) {
    const nb = face.axis === 'x' ? bays : Math.max(1, Math.round(d / 4));
    for (let f = 0; f < floors; f++) {
      const fy = y0 + (h / floors) * f + (h / floors - wh) * 0.45 + (f === 0 ? 0.6 : 0);
      for (let i = 0; i < nb; i++) {
        const lx = (i + 0.5) * (face.len / nb) - face.len / 2;
        let px: number;
        let pz: number;
        if (face.axis === 'x') [px, pz] = at(face.r === rot ? lx : -lx, face.lz);
        else [px, pz] = at(face.lz, face.r === rot + Math.PI / 2 ? -lx : lx);
        gothicWindow(b, px, fy, pz, face.r, ww, f === 0 ? wh * 0.85 : wh, rnd() < (o.lit ?? 0.45));
      }
    }
  }
  if (o.buttresses) {
    for (let i = 0; i <= bays; i++) {
      const lx = i * (w / bays) - w / 2;
      const [px, pz] = at(lx, d / 2);
      buttress(b, px, pz, rot, h * 0.92, 1.0, 0.7, y0);
    }
  }
  const roof = o.roof ?? 'gable';
  if (roof === 'gable') gableRoof(b, x, y0 + h, z, rot, w, d, Math.min(d * 0.7, 5.5));
  else if (roof === 'flat') {
    // ameias
    const n = Math.round(w / 1.6);
    for (let i = 0; i < n; i += 2) {
      const lx = (i + 0.5) * (w / n) - w / 2;
      const [px, pz] = at(lx, d / 2 - 0.25);
      b.add(new THREE.BoxGeometry(w / n, 0.8, 0.5), mat, trs(px, y0 + h + 0.4, pz, rot));
    }
  }
}

/** Torre cilíndrica com telhado cônico de ardósia. */
export function tower(b: RegionBuilder, x: number, z: number, r: number, h: number, roofH: number, mat: THREE.Material = M.stoneDark, lit = true, y0 = 0): void {
  const g = new THREE.CylinderGeometry(r, r * 1.06, h, 24, 1);
  b.add(g, mat, trs(x, y0 + h / 2, z), false);
  b.add(new THREE.CylinderGeometry(r * 1.14, r * 1.02, 0.5, 24), M.carved, trs(x, y0 + h - 0.1, z));
  b.add(new THREE.ConeGeometry(r * 1.2, roofH, 12), M.slate, trs(x, y0 + h + roofH / 2 + 0.1, z));
  b.add(new THREE.OctahedronGeometry(r * 0.16), M.bronze, trs(x, y0 + h + roofH + 0.25, z));
  b.add(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 14), M.bronze, trs(x, y0 + h + roofH + 0.6, z));
  if (lit) {
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + 0.4;
      gothicWindow(b, x + Math.sin(a) * (r + 0.02), y0 + h * 0.62, z + Math.cos(a) * (r + 0.02), a, r * 0.32, r * 1.0, k % 2 === 0);
    }
  }
  b.collideCircle(x, z, r * 1.05, y0 - 1, y0 + h);
}

/** Agulha gótica quadrada (torre de campanário). */
export function spireTower(b: RegionBuilder, x: number, z: number, w: number, h: number, spireH: number, y0 = 0, rot = 0, collide = true): void {
  b.box(M.stoneDark, w, h, w, x, y0, z, rot, collide);
  for (let i = 1; i <= 3; i++) b.add(new THREE.BoxGeometry(w + 0.3, 0.2, w + 0.3), M.carved, trs(x, y0 + (h * i) / 3.2, z, rot));
  for (let k = 0; k < 4; k++) {
    const a = rot + (k * Math.PI) / 2;
    gothicWindow(b, x + Math.sin(a) * (w / 2 + 0.02), y0 + h * 0.66, z + Math.cos(a) * (w / 2 + 0.02), a, w * 0.3, h * 0.26, k === 0);
    gothicWindow(b, x + Math.sin(a) * (w / 2 + 0.02), y0 + h * 0.3, z + Math.cos(a) * (w / 2 + 0.02), a, w * 0.22, h * 0.2, false);
    const ca = rot + Math.PI / 4 + (k * Math.PI) / 2;
    pinnacle(b, x + Math.sin(ca) * w * 0.66, y0 + h, z + Math.cos(ca) * w * 0.66, w * 0.2, spireH * 0.34);
  }
  b.add(new THREE.ConeGeometry(w * 0.72, spireH, 8), M.slate, trs(x, y0 + h + spireH / 2, z, rot + Math.PI / 8));
  b.add(new THREE.OctahedronGeometry(w * 0.09), M.bronze, trs(x, y0 + h + spireH + 0.2, z));
}

/** Escadaria reta subindo no sentido -z local; (x,z) é o centro do primeiro degrau. */
export function stairs(b: RegionBuilder, x: number, z: number, rot: number, width: number, steps: number, rise: number, run: number, y0 = 0, rails = true): void {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  for (let i = 0; i < steps; i++) {
    const lz = -(i + 0.5) * run;
    const hh = (i + 1) * rise;
    b.add(new THREE.BoxGeometry(width, hh, run + 0.02), M.flag, trs(x + lz * s, y0 + hh / 2, z + lz * c, rot));
    b.add(new THREE.BoxGeometry(width + 0.02, 0.06, 0.12), M.carved, trs(x + (lz + run / 2 - 0.04) * s, y0 + hh - 0.02, z + (lz + run / 2 - 0.04) * c, rot));
  }
  const len = steps * run;
  const mid = -len / 2;
  b.platform(x + mid * s, z + mid * c, width / 2, len / 2, rot, y0 + steps * rise, y0);
  if (rails) {
    for (const sgn of [-1, 1]) {
      const lx = sgn * (width / 2 + 0.25);
      const px = x + lx * c + mid * s;
      const pz = z - lx * s + mid * c;
      const slope = Math.atan2(steps * rise, len);
      const railLen = Math.hypot(len, steps * rise);
      b.add(new THREE.BoxGeometry(0.5, 0.28, railLen), M.carved, trs(px, y0 + (steps * rise) / 2 + 1.0, pz, rot, slope));
      b.add(new THREE.BoxGeometry(0.44, 1.0, railLen), M.stoneDark, trs(px, y0 + (steps * rise) / 2 + 0.4, pz, rot, slope));
      b.collideBox(px, pz, 0.28, len / 2, rot, y0 - 1, y0 + steps * rise + 1.3);
      // pilares de arranque e chegada
      for (const end of [0, 1]) {
        const lz = -end * len;
        const ex = x + lx * c + lz * s;
        const ez = z - lx * s + lz * c;
        const ey = y0 + end * steps * rise;
        b.add(new THREE.BoxGeometry(0.7, 1.7, 0.7), M.stoneDark, trs(ex, ey + 0.85, ez, rot));
        b.add(new THREE.BoxGeometry(0.86, 0.14, 0.86), M.carved, trs(ex, ey + 1.7, ez, rot));
        b.add(new THREE.SphereGeometry(0.3, 10, 8), M.carved, trs(ex, ey + 2.02, ez));
      }
    }
  }
}

let glowTex: THREE.Texture | null = null;
export function halo(size: number, color = 0xffb86a, opacity = 0.75): THREE.Sprite {
  glowTex ??= glowSprite();
  const m = new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const s = new THREE.Sprite(m);
  s.scale.setScalar(size);
  return s;
}

/** Poste de ferro com lampião. */
export function lampPost(b: RegionBuilder, x: number, z: number, h = 3.6, y0 = 0, intensity = 1): void {
  b.add(new THREE.CylinderGeometry(0.16, 0.24, 0.5, 22), M.iron, trs(x, y0 + 0.25, z));
  b.add(new THREE.CylinderGeometry(0.06, 0.09, h, 22), M.iron, trs(x, y0 + h / 2, z));
  b.add(new THREE.CylinderGeometry(0.12, 0.06, 0.2, 22), M.iron, trs(x, y0 + h, z));
  lantern(b, x, y0 + h + 0.36, z, 0.42, intensity);
  b.collideCircle(x, z, 0.2, y0 - 1, y0 + h);
}

export function lantern(b: RegionBuilder, x: number, y: number, z: number, size = 0.4, intensity = 1, light = true): void {
  b.add(new THREE.BoxGeometry(size * 0.62, size * 0.9, size * 0.62), M.lampGlow, trs(x, y, z), true, false);
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2 + Math.PI / 4;
    b.add(new THREE.BoxGeometry(0.04, size, 0.04), M.iron, trs(x + Math.sin(a) * size * 0.46, y, z + Math.cos(a) * size * 0.46));
  }
  b.add(new THREE.ConeGeometry(size * 0.6, size * 0.4, 4), M.iron, trs(x, y + size * 0.68, z, Math.PI / 4));
  b.add(new THREE.BoxGeometry(size * 0.8, 0.05, size * 0.8), M.iron, trs(x, y - size * 0.48, z));
  const hl = halo(size * 5.5, 0xffb86a, 0.5);
  hl.position.set(x, y, z);
  b.dynamic(hl);
  if (light) b.lamp(x, y, z, 0xffa85a, 1.0 * intensity, 15);
}

/** Lampião de parede em braço de ferro. Normal aponta para +z local. */
export function wallLantern(b: RegionBuilder, x: number, y: number, z: number, rot: number, light = true): void {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  b.add(new THREE.BoxGeometry(0.06, 0.06, 0.7), M.iron, trs(x + 0.35 * s, y + 0.5, z + 0.35 * c, rot));
  b.add(new THREE.BoxGeometry(0.05, 0.5, 0.05), M.iron, trs(x + 0.04 * s, y + 0.3, z + 0.04 * c, rot));
  lantern(b, x + 0.68 * s, y + 0.1, z + 0.68 * c, 0.36, 1, light);
}

/** Árvore: tronco curvo, galhos e copa de cartões. */
export function tree(b: RegionBuilder, x: number, z: number, h = 7, seed = 1, leaves: THREE.Material | null = M.leaves, girth = 0.32): void {
  let s = seed * 7919 + 13;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return (s & 0xffff) / 0xffff;
  };
  const segs = 5;
  let px = x;
  let pz = z;
  let py = 0;
  let lean = (rnd() - 0.5) * 0.25;
  let dir = rnd() * Math.PI * 2;
  const tips: THREE.Vector3[] = [];
  for (let i = 0; i < segs; i++) {
    const sh = (h * 0.62) / segs;
    const r0 = girth * (1 - i / (segs + 1.5));
    const r1 = girth * (1 - (i + 1) / (segs + 1.5));
    const nx = px + Math.sin(dir) * lean * sh;
    const nz = pz + Math.cos(dir) * lean * sh;
    const g = new THREE.CylinderGeometry(r1, r0 * (i === 0 ? 1.5 : 1), sh * 1.04, 16);
    const m = new THREE.Matrix4().lookAt(new THREE.Vector3(px, py, pz), new THREE.Vector3(nx, py + sh, nz), new THREE.Vector3(0, 0, 1));
    const q = new THREE.Quaternion().setFromRotationMatrix(m).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2));
    b.add(g, M.bark, new THREE.Matrix4().compose(new THREE.Vector3((px + nx) / 2, py + sh / 2, (pz + nz) / 2), q, new THREE.Vector3(1, 1, 1)), false);
    px = nx;
    pz = nz;
    py += sh;
    lean += (rnd() - 0.5) * 0.5;
    dir += (rnd() - 0.5) * 1.6;
    if (i >= 2) {
      // galhos
      const nb = 2 + Math.floor(rnd() * 2);
      for (let k = 0; k < nb; k++) {
        const a = rnd() * Math.PI * 2;
        const bl = h * (0.22 + rnd() * 0.2);
        const up = 0.35 + rnd() * 0.5;
        const ex = px + Math.sin(a) * bl;
        const ez = pz + Math.cos(a) * bl;
        const ey = py + bl * up;
        const from = new THREE.Vector3(px, py - sh * 0.3, pz);
        const to = new THREE.Vector3(ex, ey, ez);
        const len = from.distanceTo(to);
        const bg = new THREE.CylinderGeometry(r1 * 0.25, r1 * 0.75, len, 14);
        const bm = new THREE.Matrix4().lookAt(from, to, new THREE.Vector3(0, 1, 0));
        const bq = new THREE.Quaternion().setFromRotationMatrix(bm).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2));
        b.add(bg, M.bark, new THREE.Matrix4().compose(from.clone().lerp(to, 0.5), bq, new THREE.Vector3(1, 1, 1)), false);
        tips.push(to);
      }
    }
  }
  tips.push(new THREE.Vector3(px, py, pz));
  if (leaves) {
    for (const t of tips) {
      const n = 5;
      for (let k = 0; k < n; k++) {
        const size = h * (0.2 + rnd() * 0.16);
        const g = new THREE.PlaneGeometry(size, size);
        b.add(
          g,
          leaves,
          trs(t.x + (rnd() - 0.5) * size * 0.7, t.y + (rnd() - 0.3) * size * 0.6, t.z + (rnd() - 0.5) * size * 0.7, rnd() * Math.PI, (rnd() - 0.5) * 1.4, (rnd() - 0.5) * 0.8),
          true,
        );
      }
    }
  }
  b.collideCircle(x, z, girth * 1.3, -1, 4);
}

/** Arbusto baixo de cartões cruzados. */
export function bush(b: RegionBuilder, x: number, z: number, size = 1.2, mat: THREE.Material = M.ivy, y = 0): void {
  for (let k = 0; k < 4; k++) {
    b.add(new THREE.PlaneGeometry(size * 1.5, size), mat, trs(x, y + size * 0.45, z, (k * Math.PI) / 4 + x), true);
  }
  b.add(new THREE.PlaneGeometry(size * 1.3, size * 1.3), mat, trs(x, y + size * 0.55, z, 0, -Math.PI / 2), true);
}

/** Hera subindo por uma parede; normal para +z local. */
export function ivy(b: RegionBuilder, x: number, y: number, z: number, rot: number, w: number, h: number, seed = 3): void {
  let s = seed * 131 + 7;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return (s & 0xffff) / 0xffff;
  };
  const c = Math.cos(rot);
  const sn = Math.sin(rot);
  const n = Math.round(w * h * 0.9);
  for (let i = 0; i < n; i++) {
    const lx = (rnd() - 0.5) * w;
    const fy = rnd();
    const ly = fy * fy * h; // mais densa embaixo
    if (Math.abs(lx) / (w / 2) > 1 - fy * 0.6) continue;
    const size = 0.5 + rnd() * 0.6;
    b.add(new THREE.PlaneGeometry(size, size), M.ivy, trs(x + lx * c + 0.06 * sn, y + ly, z - lx * sn + 0.06 * c, rot + (rnd() - 0.5) * 0.5, (rnd() - 0.5) * 0.4, rnd() * 6), true, false);
  }
}

const bannerTex = new Map<string, THREE.Texture>();
function bannerTexture(kind: string): THREE.Texture {
  let t = bannerTex.get(kind);
  if (t) return t;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = BRAND.amaranthDark;
  g.fillRect(0, 0, 256, 512);
  // trama
  for (let i = 0; i < 2400; i++) {
    g.fillStyle = `rgba(${Math.random() > 0.5 ? 255 : 0},0,0,${Math.random() * 0.05})`;
    g.fillRect(Math.random() * 256, Math.random() * 512, 2, 14);
  }
  g.strokeStyle = WORLD.agedGold;
  g.lineWidth = 5;
  g.strokeRect(14, 14, 228, 484);
  g.lineWidth = 2;
  g.strokeRect(24, 24, 208, 464);
  // coroa de louros + "I."
  g.save();
  g.translate(128, 210);
  g.fillStyle = WORLD.agedGold;
  for (const sgn of [-1, 1]) {
    for (let k = 0; k < 9; k++) {
      const a = -Math.PI / 2 + sgn * (0.35 + k * 0.3);
      g.save();
      g.translate(Math.cos(a) * 62, Math.sin(a) * 62 + 4);
      g.rotate(a + (sgn * Math.PI) / 2.6);
      g.beginPath();
      g.ellipse(0, 0, 16, 6, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
  }
  g.font = '600 86px "Source Serif 4", Georgia, serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(kind, 0, 8);
  g.restore();
  t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  bannerTex.set(kind, t);
  return t;
}

/** Estandarte vinho pendurado; normal para +z local. Retorna a malha para balanço. */
export function banner(b: RegionBuilder, x: number, y: number, z: number, rot: number, w = 1.3, h = 3.4, glyph = 'I.'): THREE.Mesh {
  const g = new THREE.PlaneGeometry(w, h, 6, 12);
  g.translate(0, -h / 2, 0);
  const m = new THREE.MeshStandardMaterial({ map: bannerTexture(glyph), roughness: 0.9, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(g, m);
  mesh.position.set(x, y, z);
  mesh.rotation.y = rot;
  mesh.castShadow = true;
  const base = (g.getAttribute('position') as THREE.BufferAttribute).clone();
  const phase = x * 0.7 + z * 0.3;
  b.updaters.push((_dt, t) => {
    const p = g.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const yy = -base.getY(i) / h;
      p.setZ(i, Math.sin(t * 1.3 + phase + yy * 3.2 + base.getX(i)) * 0.09 * yy);
    }
    p.needsUpdate = true;
  });
  b.dynamic(mesh);
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  b.add(new THREE.CylinderGeometry(0.035, 0.035, w + 0.3, 16), M.bronze, trs(x, y + 0.02, z, rot, 0, Math.PI / 2));
  void c;
  void s;
  return mesh;
}

export function bench(b: RegionBuilder, x: number, z: number, rot: number, y0 = 0): void {
  b.box(M.woodDark, 2.0, 0.1, 0.55, x, y0 + 0.45, z, rot);
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  for (const sgn of [-1, 1]) b.box(M.stoneDark, 0.22, 0.45, 0.55, x + sgn * 0.8 * c, y0, z - sgn * 0.8 * s, rot);
  b.collideBox(x, z, 1.0, 0.3, rot, y0 - 1, y0 + 0.6);
}

export function crate(b: RegionBuilder, x: number, z: number, size = 0.8, rot = 0, y0 = 0, collide = true): void {
  b.box(M.wood, size, size, size, x, y0, z, rot, collide);
  b.add(new THREE.BoxGeometry(size + 0.04, 0.08, size + 0.04), M.woodDark, trs(x, y0 + size * 0.15, z, rot));
  b.add(new THREE.BoxGeometry(size + 0.04, 0.08, size + 0.04), M.woodDark, trs(x, y0 + size * 0.85, z, rot));
}

export function barrel(b: RegionBuilder, x: number, z: number, y0 = 0): void {
  b.add(new THREE.CylinderGeometry(0.36, 0.34, 1.0, 24), M.wood, trs(x, y0 + 0.5, z), false);
  for (const yy of [0.2, 0.8]) b.add(new THREE.CylinderGeometry(0.385, 0.385, 0.06, 24), M.iron, trs(x, y0 + yy, z));
  b.collideCircle(x, z, 0.42, y0 - 1, y0 + 1.1);
}

/** Estante alta de biblioteca; frente em +z local. */
export function bookshelf(b: RegionBuilder, x: number, z: number, rot: number, w = 3, h = 4.2, y0 = 0, doubleSided = false): void {
  const d = doubleSided ? 0.9 : 0.5;
  b.box(M.woodDark, w, h, d, x, y0, z, rot, true);
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const faces = doubleSided ? [1, -1] : [1];
  for (const f of faces) {
    const g = new THREE.PlaneGeometry(w - 0.24, h - 0.5);
    const uv = g.getAttribute('uv') as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * ((w - 0.24) / 2.4), uv.getY(i) * ((h - 0.5) / 2.4));
    // UV direto em unidades de ladrilho: compensar o repeat do material (1/2.4)
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2.4, uv.getY(i) * 2.4);
    b.add(g, M.books, trs(x + f * (d / 2 + 0.012) * s, y0 + h / 2 + 0.1, z + f * (d / 2 + 0.012) * c, rot + (f < 0 ? Math.PI : 0)), true);
  }
  b.add(new THREE.BoxGeometry(w + 0.2, 0.22, d + 0.2), M.wood, trs(x, y0 + h + 0.05, z, rot));
}

export function table(b: RegionBuilder, x: number, z: number, rot: number, w = 2.6, d = 1.1, y0 = 0): void {
  b.box(M.woodDark, w, 0.1, d, x, y0 + 0.82, z, rot);
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const lx = sx * (w / 2 - 0.15);
      const lz = sz * (d / 2 - 0.15);
      b.box(M.woodDark, 0.12, 0.82, 0.12, x + lx * c + lz * s, y0, z - lx * s + lz * c, rot);
    }
  b.collideBox(x, z, w / 2, d / 2, rot, y0 - 1, y0 + 1);
}

/** Vela com chama e halo; luz opcional. */
export function candle(b: RegionBuilder, x: number, y: number, z: number, light = false): void {
  b.add(new THREE.CylinderGeometry(0.035, 0.04, 0.22, 16), M.parchment, trs(x, y + 0.11, z), false, false);
  b.add(new THREE.SphereGeometry(0.035, 6, 5), M.lampGlow, trs(x, y + 0.27, z, 0, 0, 0, 1, 1.8, 1), true, false);
  const hl = halo(0.9, 0xffb86a, 0.45);
  hl.position.set(x, y + 0.28, z);
  b.dynamic(hl);
  if (light) b.lamp(x, y + 0.4, z, 0xffa050, 0.55, 8, 0.2);
}

/** Luminária de leitura (latão com cúpula verde). */
export function deskLamp(b: RegionBuilder, x: number, y: number, z: number, light = true): void {
  b.add(new THREE.CylinderGeometry(0.1, 0.12, 0.04, 22), M.bronze, trs(x, y + 0.02, z), false);
  b.add(new THREE.CylinderGeometry(0.015, 0.015, 0.36, 16), M.bronze, trs(x, y + 0.2, z), false);
  const shade = new THREE.MeshStandardMaterial({ color: 0x1f6b52, emissive: 0x2a8a66, emissiveIntensity: 0.9, roughness: 0.3 });
  const sm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.2, 0.14, 24, 1, true), shade);
  sm.position.set(x, y + 0.42, z);
  b.dynamic(sm);
  const hl = halo(1.5, 0xffc880, 0.4);
  hl.position.set(x, y + 0.34, z);
  b.dynamic(hl);
  if (light) b.lamp(x, y + 0.5, z, 0xffb060, 0.7, 9, 0.03);
}

/** Texto gravado/pintado em placa; normal para +z local. */
export function plaque(b: RegionBuilder, text: string, x: number, y: number, z: number, rot: number, w: number, h: number, color = '#d8c9a8', bg: string | null = null, font = '600 64px "Source Serif 4", Georgia, serif'): THREE.Mesh {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = Math.max(64, Math.round((1024 * h) / w));
  const g = c.getContext('2d')!;
  if (bg) {
    g.fillStyle = bg;
    g.fillRect(0, 0, c.width, c.height);
  }
  g.font = font;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = 'rgba(0,0,0,0.6)';
  g.fillText(text, c.width / 2 + 3, c.height / 2 + 4);
  g.fillStyle = color;
  g.fillText(text, c.width / 2, c.height / 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  const m = new THREE.MeshStandardMaterial({ map: t, transparent: !bg, roughness: 0.8, depthWrite: !!bg });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  mesh.position.set(x, y, z);
  mesh.rotation.y = rot;
  b.dynamic(mesh);
  return mesh;
}

/** Fonte central com esfera armilar de bronze. */
export function fountain(b: RegionBuilder, x: number, z: number): THREE.Group {
  b.add(new THREE.CylinderGeometry(3.3, 3.5, 0.7, 24), M.stoneDark, trs(x, 0.35, z), false);
  b.add(new THREE.CylinderGeometry(3.45, 3.45, 0.14, 24), M.carved, trs(x, 0.72, z), false);
  b.add(new THREE.CylinderGeometry(3.0, 3.0, 0.06, 24), M.water, trs(x, 0.6, z), true, false);
  b.add(new THREE.CylinderGeometry(0.75, 1.1, 1.6, 22), M.stoneDark, trs(x, 0.8, z), false);
  b.add(new THREE.CylinderGeometry(1.5, 0.5, 0.5, 16), M.carved, trs(x, 1.85, z), false);
  b.add(new THREE.CylinderGeometry(1.4, 1.4, 0.04, 16), M.water, trs(x, 2.08, z), true, false);
  b.add(new THREE.CylinderGeometry(0.2, 0.3, 1.1, 22), M.bronze, trs(x, 2.6, z), false);
  // esfera armilar: anéis de bronze que giram devagar
  const arm = new THREE.Group();
  arm.position.set(x, 4.1, z);
  const mk = (r: number, rx: number, rz: number) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.045, 10, 48), M.bronze);
    m.rotation.set(rx, 0, rz);
    m.castShadow = true;
    return m;
  };
  const r1 = mk(1.0, Math.PI / 2, 0);
  const r2 = mk(0.92, 0.4, 0.2);
  const r3 = mk(0.84, 1.1, 1.0);
  arm.add(r1, r2, r3);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), M.lampGlow);
  arm.add(core);
  const hl = halo(3.2, 0xffb86a, 0.5);
  arm.add(hl);
  b.dynamic(arm);
  b.updaters.push((dt) => {
    r2.rotation.y += dt * 0.25;
    r3.rotation.z += dt * 0.18;
    r1.rotation.z += dt * 0.1;
  });
  b.lamp(x, 4.1, z, 0xffb060, 1.1, 16, 0.04);
  b.collideCircle(x, z, 3.55, -1, 3);
  return arm;
}

/** Pedestal com busto abstrato (figura fictícia, sem retrato de pessoa real). */
/** Placa de bronze com nome e anos, desenhada em canvas. */
function plaqueTexture(line1: string, line2: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 192;
  const g = c.getContext('2d')!;
  const gr = g.createLinearGradient(0, 0, 512, 192);
  gr.addColorStop(0, '#7a5c2e');
  gr.addColorStop(0.5, '#a3814a');
  gr.addColorStop(1, '#6b4f26');
  g.fillStyle = gr;
  g.fillRect(0, 0, 512, 192);
  g.strokeStyle = 'rgba(30,18,6,0.7)';
  g.lineWidth = 6;
  g.strokeRect(12, 12, 488, 168);
  g.fillStyle = '#1c1206';
  g.textAlign = 'center';
  g.font = '600 56px "Source Serif 4", Georgia, serif';
  g.fillText(line1, 256, 94, 470);
  g.font = '500 34px "IBM Plex Mono", monospace';
  g.fillText(line2, 256, 148, 470);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Busto sobre pedestal, com rosto esculpido, ombros e placa. `rot` aponta a frente (+z local) para onde `rot` gira. */
export function bust(b: RegionBuilder, x: number, z: number, rot = 0, y0 = 0, plate?: { name: string; years: string }, hair: 'curto' | 'longo' | 'touca' | 'calvo' = 'curto'): void {
  const at = (lx: number, ly: number, lz: number) => {
    const c = Math.cos(rot);
    const s = Math.sin(rot);
    return { x: x + lx * c + lz * s, y: y0 + ly, z: z - lx * s + lz * c };
  };
  const place = (geo: THREE.BufferGeometry, mat: THREE.Material, lx: number, ly: number, lz: number, sx = 1, sy = 1, sz = 1, rx = 0) => {
    const p = at(lx, ly, lz);
    b.add(geo, mat, trs(p.x, p.y, p.z, rot, rx, 0, sx, sy, sz), false);
  };
  b.box(M.stoneDark, 0.78, 1.15, 0.78, x, y0, z, rot, true);
  place(new THREE.BoxGeometry(0.92, 0.1, 0.92), M.carved, 0, 1.2, 0);
  place(new THREE.BoxGeometry(0.84, 0.06, 0.84), M.stoneDark, 0, 1.12, 0);
  // ombros e peito cortados em lâmina
  place(new THREE.SphereGeometry(0.34, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.carved, 0, 1.25, 0, 1.15, 0.9, 0.62);
  place(new THREE.CylinderGeometry(0.1, 0.13, 0.2, 22), M.carved, 0, 1.58, 0);
  // cabeça
  place(new THREE.SphereGeometry(0.17, 28, 22), M.carved, 0, 1.82, 0, 0.88, 1.12, 1.0);
  place(new THREE.SphereGeometry(0.12, 22, 16), M.carved, 0, 1.69, 0.025, 0.95, 0.85, 0.98);
  place(new THREE.SphereGeometry(0.03, 14, 10), M.carved, 0, 1.78, 0.17, 0.85, 1.4, 1.2);
  place(new THREE.BoxGeometry(0.2, 0.025, 0.05), M.carved, 0, 1.86, 0.155);
  for (const sx of [-1, 1]) place(new THREE.SphereGeometry(0.035, 12, 10), M.carved, sx * 0.158, 1.8, -0.01, 0.5, 1, 0.8);
  if (hair !== 'calvo') {
    place(new THREE.SphereGeometry(0.18, 26, 18, 0, Math.PI * 2, 0, Math.PI * 0.52), M.stone, 0, 1.86, -0.02, 0.9, 1.1, 1.02, -0.25);
    if (hair === 'longo') place(new THREE.CapsuleGeometry(0.13, 0.28, 6, 14), M.stone, 0, 1.62, -0.1, 1.05, 1, 0.6);
    if (hair === 'touca') place(new THREE.SphereGeometry(0.19, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.62), M.stone, 0, 1.87, -0.01, 0.95, 1.1, 1.06, -0.2);
  }
  if (plate) {
    const mat = new THREE.MeshStandardMaterial({ map: plaqueTexture(plate.name, plate.years), roughness: 0.45, metalness: 0.55 });
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.23), mat);
    const p = at(0, 0.62, 0.395);
    pl.position.set(p.x, p.y, p.z);
    pl.rotation.y = rot;
    b.dynamic(pl);
  }
}

/** Abóbada de nervuras entre quatro pilares (interiores). */
export function ribVault(b: RegionBuilder, x: number, z: number, w: number, d: number, springY: number, rise: number): void {
  const mk = (ax: number, az: number, bx: number, bz: number) => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const arch = Math.sin(t * Math.PI);
      const peak = 1 - Math.abs(t - 0.5) * 2;
      pts.push(new THREE.Vector3(ax + (bx - ax) * t, springY + rise * (arch * 0.7 + peak * 0.3), az + (bz - az) * t));
    }
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.13, 5, false);
    b.add(g, M.carved, new THREE.Matrix4(), false, false);
  };
  mk(x - w / 2, z - d / 2, x + w / 2, z + d / 2);
  mk(x + w / 2, z - d / 2, x - w / 2, z + d / 2);
  mk(x - w / 2, z - d / 2, x + w / 2, z - d / 2);
  mk(x - w / 2, z + d / 2, x + w / 2, z + d / 2);
  mk(x - w / 2, z - d / 2, x - w / 2, z + d / 2);
  mk(x + w / 2, z - d / 2, x + w / 2, z + d / 2);
}

export function column(b: RegionBuilder, x: number, z: number, h: number, r = 0.4, y0 = 0): void {
  b.add(new THREE.BoxGeometry(r * 3, 0.4, r * 3), M.stoneDark, trs(x, y0 + 0.2, z));
  b.add(new THREE.CylinderGeometry(r, r * 1.08, h - 0.8, 22), M.stone, trs(x, y0 + h / 2, z), false);
  b.add(new THREE.CylinderGeometry(r * 1.5, r, 0.4, 22), M.carved, trs(x, y0 + h - 0.2, z), false);
  b.collideCircle(x, z, r * 1.3, y0 - 1, y0 + h);
}
