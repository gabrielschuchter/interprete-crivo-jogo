// Mesmo cenário do recast-teste.mjs, com navcat (JS puro, sem WASM). Mede construção, consulta e se destrava a perseguição.
import * as THREE from 'three';
import { DEFAULT_QUERY_FILTER, findPath } from 'navcat';
import { generateSoloNavMesh } from 'navcat/blocks';

function resolveCircle(colliders, x, z, r) {
  for (let iter = 0; iter < 2; iter++) for (const c of colliders) {
    if (c.kind === 'circle') { const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz), min = r + c.r; if (d < min && d > 1e-5) { x = c.x + dx / d * min; z = c.z + dz / d * min; } }
    else { const dx = x - c.x, dz = z - c.z, cs = Math.cos(c.rot), sn = Math.sin(c.rot), lx = dx * cs - dz * sn, lz = dx * sn + dz * cs; const qx = Math.max(-c.hx, Math.min(c.hx, lx)), qz = Math.max(-c.hz, Math.min(c.hz, lz)); const ox = lx - qx, oz = lz - qz, d = Math.hypot(ox, oz); if (d < r && d > 1e-5) { const nlx = qx + ox / d * r, nlz = qz + oz / d * r; x = c.x + nlx * cs + nlz * sn; z = c.z - nlx * sn + nlz * cs; } }
  }
  return { x, z };
}
const box = (x, z, hx, hz, rot = 0) => ({ kind: 'box', x, z, hx, hz, rot }), circ = (x, z, r) => ({ kind: 'circle', x, z, r });
const cenarios = {
  'U (armadilha de parede)': { colliders: [box(0, 2, 6, 0.4), box(-6, -1, 0.4, 3), box(6, -1, 0.4, 3)], from: [0, -1], to: [0, 9] },
  'Bosque de pilares (grade 4 m, r 1,2)': { colliders: Array.from({ length: 49 }, (_, i) => circ(-12 + (i % 7) * 4, -12 + Math.floor(i / 7) * 4, 1.2)), from: [-14, -14], to: [14, 14] },
  'Portão estreito (1,6 m) numa muralha': { colliders: [box(-9, 0, 8, 0.5), box(9, 0, 8, 0.5)], from: [0, -10], to: [0, 10] },
  'Sala em L com estante diagonal': { colliders: [box(-4, 0, 8, 0.4, 0), box(5, 6, 0.4, 7), box(2, -4, 4, 0.4, 0.7)], from: [-10, -10], to: [10, 12] },
};
const R = 0.45, SZ = 40;
function geom(colliders) {
  const meshes = [new THREE.Mesh(new THREE.PlaneGeometry(SZ * 2, SZ * 2).rotateX(-Math.PI / 2))];
  for (const c of colliders) { const m = new THREE.Mesh(c.kind === 'circle' ? new THREE.CylinderGeometry(c.r, c.r, 3, 16) : new THREE.BoxGeometry(c.hx * 2, 3, c.hz * 2)); m.position.set(c.x, 1.5, c.z); if (c.kind === 'box') m.rotation.y = c.rot; m.updateMatrixWorld(true); meshes.push(m); }
  const pos = [], idx = []; let off = 0;
  for (const m of meshes) { const g = m.geometry.clone().applyMatrix4(m.matrixWorld); const p = g.attributes.position.array; const ix = g.index ? Array.from(g.index.array) : Array.from({ length: p.length / 3 }, (_, i) => i); for (const v of p) pos.push(v); for (const i of ix) idx.push(i + off); off += p.length / 3; }
  return { positions: new Float32Array(pos), indices: new Uint32Array(idx) };
}
function opts() {
  const cs = 0.25, ch = 0.2, wr = R, wh = 1.8, wc = 0.4;
  return { cellSize: cs, cellHeight: ch, walkableRadiusWorld: wr, walkableRadiusVoxels: Math.ceil(wr / cs), walkableClimbWorld: wc, walkableClimbVoxels: Math.ceil(wc / ch), walkableHeightWorld: wh, walkableHeightVoxels: Math.ceil(wh / ch), walkableSlopeAngleDegrees: 45, borderSize: 0, minRegionArea: 8, mergeRegionArea: 20, maxSimplificationError: 1.3, maxEdgeLength: 12, maxVerticesPerPoly: 5, detailSampleDistance: cs * 6, detailSampleMaxError: ch };
}
function sim(colliders, from, to, nav) {
  let p = { x: from[0], z: from[1] }, t = 0, melhor = Infinity, next = 0, path = []; const dt = 1 / 30, v = 3.2;
  while (t < 60) {
    const dist = Math.hypot(to[0] - p.x, to[1] - p.z); melhor = Math.min(melhor, dist); if (dist < 1.2) return { ok: true, t, melhor };
    let tx = to[0], tz = to[1];
    if (nav) { if (t >= next) { const r = findPath(nav, [p.x, 0, p.z], [to[0], 0, to[1]], [1, 2, 1], DEFAULT_QUERY_FILTER); path = r.success ? r.path.map(q => q.position) : []; next = t + 0.5; } const w = path.find((q, i) => i > 0 && Math.hypot(q[0] - p.x, q[2] - p.z) > 0.4) ?? path[path.length - 1]; if (w) { tx = w[0]; tz = w[2]; } }
    const d = Math.hypot(tx - p.x, tz - p.z) || 1; p = resolveCircle(colliders, p.x + (tx - p.x) / d * v * dt, p.z + (tz - p.z) / d * v * dt, R); t += dt;
  }
  return { ok: false, t, melhor };
}
console.log('| Cenário | build navcat (ms) | navcat |'); console.log('|---|---|---|');
let big;
for (const [n, s] of Object.entries(cenarios)) {
  const t0 = performance.now(); const res = generateSoloNavMesh(geom(s.colliders), opts()); const ms = (performance.now() - t0).toFixed(0);
  const r = sim(s.colliders, s.from, s.to, res.navMesh); if (n.startsWith('Bosque')) big = res.navMesh;
  console.log(`| ${n} | ${ms} | ${r.ok ? `chega em ${r.t.toFixed(1)} s` : `preso (mais perto: ${r.melhor.toFixed(1)} m)`} |`);
}
const N = 2000, t1 = performance.now(); for (let i = 0; i < N; i++) findPath(big, [-14 + (i % 7), 0, -14], [14, 0, 14 - (i % 5)], [1, 2, 1], DEFAULT_QUERY_FILTER);
console.log(`\nfindPath: ${((performance.now() - t1) / N).toFixed(3)} ms por consulta (média de ${N})`);
