// Teste isolado do Recast Navigation JS contra a perseguição atual dos inimigos (enemy.ts: move + resolveCircle).
// Roda fora do jogo: cd tools/scavenging && npm i && node recast-teste.mjs
// resolveCircle abaixo é cópia fiel de src/world/region.ts (linhas 125-180), para não puxar three/DOM.
import * as THREE from 'three';
import { init, NavMeshQuery, Crowd } from '@recast-navigation/core';
import { threeToSoloNavMesh } from '@recast-navigation/three';

function resolveCircle(colliders, x, z, r) {
  for (let iter = 0; iter < 2; iter++) for (const c of colliders) {
    if (c.kind === 'circle') {
      const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz), min = r + c.r;
      if (d < min && d > 1e-5) { x = c.x + dx / d * min; z = c.z + dz / d * min; }
    } else {
      const dx = x - c.x, dz = z - c.z, cs = Math.cos(c.rot), sn = Math.sin(c.rot);
      const lx = dx * cs - dz * sn, lz = dx * sn + dz * cs;
      const qx = Math.max(-c.hx, Math.min(c.hx, lx)), qz = Math.max(-c.hz, Math.min(c.hz, lz));
      const ox = lx - qx, oz = lz - qz, d = Math.hypot(ox, oz);
      if (d < r && d > 1e-5) {
        const nlx = qx + ox / d * r, nlz = qz + oz / d * r;
        x = c.x + nlx * cs + nlz * sn; z = c.z - nlx * sn + nlz * cs;
      }
    }
  }
  return { x, z };
}

// Cenários: caixa = {kind:'box',x,z,hx,hz,rot}, círculo = {kind:'circle',x,z,r}
const box = (x, z, hx, hz, rot = 0) => ({ kind: 'box', x, z, hx, hz, rot });
const circ = (x, z, r) => ({ kind: 'circle', x, z, r });
const cenarios = {
  'U (armadilha de parede)': { colliders: [box(0, 2, 6, 0.4), box(-6, -1, 0.4, 3), box(6, -1, 0.4, 3)], from: [0, -1], to: [0, 9] },
  'Bosque de pilares (grade 4 m, r 1,2)': { colliders: Array.from({ length: 49 }, (_, i) => circ(-12 + (i % 7) * 4, -12 + Math.floor(i / 7) * 4, 1.2)), from: [-14, -14], to: [14, 14] },
  'Portão estreito (1,6 m) numa muralha': { colliders: [box(-9, 0, 8, 0.5), box(9, 0, 8, 0.5)], from: [0, -10], to: [0, 10] },
  'Sala em L com estante diagonal': { colliders: [box(-4, 0, 8, 0.4, 0), box(5, 6, 0.4, 7), box(2, -4, 4, 0.4, 0.7)], from: [-10, -10], to: [10, 12] },
};

await init();
const R = 0.45; // raio de inimigo
const SZ = 40;
function geometria(colliders) {
  const g = [];
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(SZ * 2, SZ * 2, 1, 1).rotateX(-Math.PI / 2));
  g.push(ground);
  for (const c of colliders) {
    let geo;
    if (c.kind === 'circle') geo = new THREE.CylinderGeometry(c.r, c.r, 3, 16);
    else geo = new THREE.BoxGeometry(c.hx * 2, 3, c.hz * 2);
    const m = new THREE.Mesh(geo);
    m.position.set(c.x, 1.5, c.z);
    if (c.kind === 'box') m.rotation.y = c.rot; // resolveCircle usa lx = dx*cos - dz*sin
    m.updateMatrixWorld(true);
    g.push(m);
  }
  return g;
}

function simular(colliders, from, to, modo, nav, query) {
  let p = { x: from[0], z: from[1] }; const dt = 1 / 30, v = 3.2; let t = 0, melhor = Infinity, nextRepath = 0, path = [];
  while (t < 60) {
    const dist = Math.hypot(to[0] - p.x, to[1] - p.z); melhor = Math.min(melhor, dist);
    if (dist < 1.2) return { ok: true, t, melhor };
    let tx = to[0], tz = to[1];
    if (modo === 'nav') {
      if (t >= nextRepath) { const r = query.computePath({ x: p.x, y: 0, z: p.z }, { x: to[0], y: 0, z: to[1] }, { halfExtents: { x: 1, y: 2, z: 1 } }); path = r.path ?? []; nextRepath = t + 0.5; }
      const w = path.find((q, i) => i > 0 && Math.hypot(q.x - p.x, q.z - p.z) > 0.4) ?? path[path.length - 1];
      if (w) { tx = w.x; tz = w.z; }
    }
    const d = Math.hypot(tx - p.x, tz - p.z) || 1;
    const nx = p.x + (tx - p.x) / d * v * dt, nz = p.z + (tz - p.z) / d * v * dt;
    p = resolveCircle(colliders, nx, nz, R); t += dt;
  }
  return { ok: false, t, melhor };
}

console.log('| Cenário | build navmesh (ms) | reta+resolveCircle (atual) | navmesh (Recast) |');
console.log('|---|---|---|---|');
for (const [nome, s] of Object.entries(cenarios)) {
  const t0 = performance.now();
  const { success, navMesh } = threeToSoloNavMesh(geometria(s.colliders), { cs: 0.25, ch: 0.2, walkableRadius: Math.ceil(R / 0.25), walkableClimb: 2, walkableHeight: 8, walkableSlopeAngle: 45 });
  const ms = (performance.now() - t0).toFixed(0);
  if (!success) { console.log(`| ${nome} | FALHOU | | |`); continue; }
  const q = new NavMeshQuery(navMesh);
  const a = simular(s.colliders, s.from, s.to, 'reta', navMesh, q), b = simular(s.colliders, s.from, s.to, 'nav', navMesh, q);
  const f = (r) => r.ok ? `chega em ${r.t.toFixed(1)} s` : `preso (mais perto: ${r.melhor.toFixed(1)} m)`;
  console.log(`| ${nome} | ${ms} | ${f(a)} | ${f(b)} |`);
}

// Custo por consulta e multidão (20 agentes) no cenário grande
{
  const s = cenarios['Bosque de pilares (grade 4 m, r 1,2)'];
  const { navMesh } = threeToSoloNavMesh(geometria(s.colliders), { cs: 0.25, ch: 0.2, walkableRadius: 2, walkableClimb: 2, walkableHeight: 8 });
  const q = new NavMeshQuery(navMesh); const N = 2000; const t0 = performance.now();
  for (let i = 0; i < N; i++) q.computePath({ x: -14 + (i % 7), y: 0, z: -14 }, { x: 14, y: 0, z: 14 - (i % 5) }, { halfExtents: { x: 1, y: 2, z: 1 } });
  console.log(`\ncomputePath: ${((performance.now() - t0) / N).toFixed(3)} ms por consulta (média de ${N}, caminho de ~40 m entre pilares)`);
  const crowd = new Crowd(navMesh, { maxAgents: 32, maxAgentRadius: 0.6 });
  for (let i = 0; i < 20; i++) { const a = crowd.addAgent({ x: -14 + i * 0.3, y: 0, z: -14 }, { radius: 0.45, height: 1.8, maxSpeed: 3.2, maxAcceleration: 12 }); a.requestMoveTarget({ x: 14, y: 0, z: 14 }); }
  const t1 = performance.now(); for (let i = 0; i < 600; i++) crowd.update(1 / 30);
  console.log(`Crowd com 20 agentes: ${((performance.now() - t1) / 600).toFixed(3)} ms por quadro (600 quadros)`);
}
