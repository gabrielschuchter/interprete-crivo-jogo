import * as THREE from 'three';
import { RegionBuilder, trs } from './builder';
import { M } from './mats';
import * as K from './kit';
import { ENV } from './envs';
import { emptyRegion, type BuiltRegion, type RegionCtx } from './region';

/**
 * Bosque da Confusão (Atlas E-05, E-12, E-16). Trilha entre árvores, ruínas
 * góticas tomadas pela hera, névoa esmeralda, e a Ponte das Conclusões sobre
 * um abismo. A ponte responde a quem atravessa: é a lição de aplicabilidade.
 */
export function buildBosque(ctx: RegionCtx): BuiltRegion {
  const b = new RegionBuilder();
  const open = ctx.flags.has('ponte_aberta');
  const extended = ctx.flags.has('ponte_estendida');
  const r = emptyRegion('bosque', 'Bosque da Confusão', 'Onde a ponte parou de responder', b, open ? ENV.bosqueLimpo : ENV.bosque);
  r.music = 'bosque';
  r.baseGround = null;
  r.bounds = { minX: -45.4, maxX: 61, minZ: -29, maxZ: 29 };

  // margens
  b.add(new THREE.PlaneGeometry(74, 62), M.ground, trs(-11, 0, 0, 0, -Math.PI / 2), false, false);
  b.add(new THREE.PlaneGeometry(26, 62), M.ground, trs(51, 0, 0, 0, -Math.PI / 2), false, false);
  b.platform(-10, 0, 36, 31, 0, 0);
  b.platform(50, 0, 12, 31, 0, 0);
  // paredões do abismo
  // paredões do abismo: o topo fica 2 cm abaixo do chão das margens (topo e chão no mesmo plano cintilavam)
  b.box(M.stoneDark, 3, 41.98, 62, 24.5, -42, 0, 0);
  b.box(M.stoneDark, 3, 41.98, 62, 39.5, -42, 0, 0);
  for (let i = 0; i < 9; i++) {
    const z = -28 + i * 7;
    b.box(M.stone, 1.2 + (i % 3) * 0.5, 9, 3.5, 26.1, -9.2 - (i % 2), z, 0.1 * (i % 3));
    b.box(M.stone, 1.2 + ((i + 1) % 3) * 0.5, 9, 3.5, 37.9, -9.4 - ((i + 1) % 2), z + 3, -0.1 * (i % 3));
  }
  // faces de rocha escaneadas nas duas paredes do abismo, abaixo da borda
  b.place('coastal_cliff_01', 27.6, -10.2, 0, Math.PI / 2, { collide: false });
  b.place('coastal_cliff_01', 36.4, -10.6, 3, -Math.PI / 2, { collide: false });
  b.place('coastal_cliff_01', 27.6, -24, -14, Math.PI / 2, { collide: false });
  b.place('coastal_cliff_01', 36.4, -25, 16, -Math.PI / 2, { collide: false });
  // o abismo é vazio de verdade: a pedra solta que havia no vão sumiu. Lá embaixo, longe, corre um rio
  // escuro com reflexos verdes, e a névoa fica entre ele e a borda.
  const river = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 62, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0x0b1f1c, roughness: 0.08, metalness: 0.6, emissive: 0x0d3a30, emissiveIntensity: 0.5 }),
  );
  river.rotation.x = -Math.PI / 2;
  river.position.set(32, -40, 0);
  b.dynamic(river);
  for (let i = 0; i < 6; i++) {
    const glint = K.halo(5, 0x58d6b0, 0.22);
    glint.position.set(29 + (i % 3) * 3, -39.2, -25 + i * 10);
    b.dynamic(glint);
  }
  const mist = new THREE.Mesh(new THREE.PlaneGeometry(14, 62), new THREE.MeshBasicMaterial({ color: 0x1f5a4c, transparent: true, opacity: 0.45, fog: true, depthWrite: false }));
  mist.rotation.x = -Math.PI / 2;
  mist.position.set(32, -16, 0);
  b.dynamic(mist);
  const puffs: THREE.Sprite[] = [];
  for (let i = 0; i < 16; i++) {
    const h = K.halo(9 + (i % 4) * 2, 0x3fae8c, open ? 0.06 : 0.13);
    h.position.set(27 + ((i * 37) % 11), -3 + (i % 3), -28 + i * 3.7);
    b.dynamic(h);
    puffs.push(h);
  }
  b.updaters.push((_dt, t) => {
    for (let i = 0; i < puffs.length; i++) puffs[i].position.y = -3 + (i % 3) + Math.sin(t * 0.4 + i) * 0.7;
  });

  // trilha
  const path: Array<[number, number]> = [[-44, 0], [-31, 3], [-19, -2], [-7, 2], [5, -1], [15, 0], [25, 0]];
  // a trilha é uma fita contínua, sem retângulos sobrepostos no mesmo plano (causavam cintilação nas emendas)
  const ribbon = (pts: Array<[number, number]>, w: number, y: number) => {
    const pos: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];
    let run = 0;
    for (let i = 0; i < pts.length; i++) {
      const prev = pts[Math.max(0, i - 1)];
      const next = pts[Math.min(pts.length - 1, i + 1)];
      const dx = next[0] - prev[0];
      const dz = next[1] - prev[1];
      const l = Math.hypot(dx, dz) || 1;
      const nx = -dz / l;
      const nz = dx / l;
      if (i > 0) run += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      for (const sgn of [-1, 1]) {
        pos.push(pts[i][0] + nx * (w / 2) * sgn, y, pts[i][1] + nz * (w / 2) * sgn);
        uv.push(sgn < 0 ? 0 : w / 3.3, run / 3.3);
      }
      if (i > 0) {
        const a = (i - 1) * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    // normais para cima, independentemente da ordem dos vértices
    const nrm = g.getAttribute('normal') as THREE.BufferAttribute;
    for (let i = 0; i < nrm.count; i++) nrm.setXYZ(i, 0, 1, 0);
    b.add(g, M.cobbleDry, new THREE.Matrix4(), false, false);
  };
  ribbon(path, 3.2, 0.03);
  ribbon([[-7, 2], [-5.5, -6], [-4, -13]], 2.4, 0.036);
  ribbon([[40, 0], [46, 0], [52, 0]], 3.2, 0.03);
  b.add(new THREE.CircleGeometry(5.5, 32), M.cobbleDry, trs(-4, 0.042, -18, 0, -Math.PI / 2), false, false);
  b.add(new THREE.CircleGeometry(5, 32), M.flag, trs(20.5, 0.048, -1.5, 0, -Math.PI / 2), false, false);
  const distToPath = (x: number, z: number) => {
    let best = 1e9;
    const all: Array<[number, number, number, number]> = [];
    for (let i = 0; i < path.length - 1; i++) all.push([path[i][0], path[i][1], path[i + 1][0], path[i + 1][1]]);
    all.push([-7, 2, -4, -15], [40, 0, 52, 0]);
    for (const [ax, az, bx, bz] of all) {
      const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / ((bx - ax) ** 2 + (bz - az) ** 2)));
      best = Math.min(best, Math.hypot(x - ax - (bx - ax) * t, z - az - (bz - az) * t));
    }
    return best;
  };

  // portal de volta ao Pátio
  K.archWall(b, -46, 0, Math.PI / 2, 12, 10, 2.2, 4.6, 3.6, M.stone);
  K.ivy(b, -44.85, 0, -4.2, Math.PI / 2, 3, 7, 4);
  K.ivy(b, -44.85, 0, 4.4, Math.PI / 2, 2.6, 6, 7);
  b.box(M.stoneDark, 2, 8, 22, -46, 0, -17, 0, true);
  b.box(M.stoneDark, 2, 8, 22, -46, 0, 17, 0, true);
  K.lampPost(b, -41, -3.2, 3.6);
  K.lampPost(b, -41, 3.2, 3.6);

  // ruínas ao longo da trilha
  K.archWall(b, -25, 0.6, Math.PI / 2 + 0.2, 9, 8.5, 1.4, 4.2, 3.2, M.stoneDark);
  K.ivy(b, -24.2, 0, -2.6, Math.PI / 2 + 0.2, 2.6, 6, 11);
  b.box(M.stoneDark, 5, 3.2, 1.2, -13, 0, 7.5, 0.4, true);
  b.box(M.stoneDark, 1.2, 5.5, 1.2, -10.4, 0, 8.6, 0.4, true);
  K.column(b, 1, 6, 5.5, 0.45);
  K.column(b, 9, -6.5, 4.2, 0.45);
  b.box(M.stone, 1.6, 0.9, 0.9, 10.4, 0, -7.6, 0.9, true);
  K.lampPost(b, -18, 1.4, 3.6);
  K.lampPost(b, -3, -1.6, 3.6);
  K.lampPost(b, 10, 2.6, 3.6);
  // clareira: círculo de pedras
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.4;
    if (Math.abs(a - Math.PI * 0.5) < 0.5) continue;
    b.box(M.stoneDark, 0.9, 2.2 + (i % 3) * 0.7, 0.7, -4 + Math.sin(a) * 6.4, 0, -18 + Math.cos(a) * 6.4, a, true);
  }
  K.lantern(b, -4, 2.6, -24.6, 0.4, 0.8);
  b.box(M.stoneDark, 0.2, 2.4, 0.2, -4, 0, -24.6, 0);

  // cabeceira da ponte: três mecanismos
  const mech = (x: number, z: number, kind: 'a' | 'b' | 'c') => {
    b.add(new THREE.CylinderGeometry(0.42, 0.52, 1.1, 22), M.stone, trs(x, 0.55, z), false);
    b.add(new THREE.CylinderGeometry(0.5, 0.42, 0.12, 22), M.bronze, trs(x, 1.16, z), false);
    b.add(new THREE.TorusGeometry(0.2, 0.035, 10, 28), M.bronze, trs(x, 1.24, z, 0, Math.PI / 2), false);
    b.collideCircle(x, z, 0.55, -1, 1.4);
    if (kind === 'a') b.add(new THREE.TorusGeometry(0.5, 0.06, 10, 28, Math.PI * 1.3), M.wood, trs(x + 0.9, 0.1, z + 0.5, 0.4, 1.2, 0.2), false);
    if (kind === 'b') {
      K.lantern(b, x + 0.85, 0.24, z + 0.4, 0.3, 0, false);
      b.add(new THREE.BoxGeometry(0.14, 0.03, 0.34), M.woodDark, trs(x + 0.5, 0.03, z + 0.75, 0.3), false);
      b.add(new THREE.BoxGeometry(0.14, 0.03, 0.34), M.woodDark, trs(x + 0.72, 0.03, z + 0.82, -0.2), false);
    }
    if (kind === 'c') b.add(new THREE.TorusGeometry(0.16, 0.035, 10, 28, Math.PI * 1.4), M.iron, trs(x + 0.8, 0.05, z + 0.5, 0.8, Math.PI / 2), false);
  };
  mech(17.5, -5, 'c');
  mech(20.5, -5.6, 'a');
  mech(23.3, -4.6, 'b');
  // pilares da ponte
  for (const [px, pz] of [[25, -2.1], [25, 2.1], [39, -2.1], [39, 2.1]]) {
    b.box(M.stone, 1.1, 3.4, 1.1, px, 0, pz, 0, true);
    K.pinnacle(b, px, 3.4, pz, 0.9, 2.2, M.stoneDark);
  }
  K.lantern(b, 25, 3.1, -1.3, 0.34, 0.7);
  K.lantern(b, 25, 3.1, 1.3, 0.34, 0.7);

  // ponte: lajes que sobem do abismo
  const slabs: THREE.Mesh[] = [];
  const N = 7;
  for (let i = 0; i < N; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(2.06, 0.5, 3.4), M.flag);
    m.position.set(26 + (i + 0.5) * (12 / N) * 1.0, extended ? -0.25 : -14, 0);
    m.scale.x = 12 / N / 2.0;
    m.castShadow = m.receiveShadow = true;
    m.visible = extended;
    b.dynamic(m);
    slabs.push(m);
  }
  const rails: THREE.Mesh[] = [];
  for (const sz of [-1.6, 1.6]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(12, 0.5, 0.24), M.stoneDark);
    m.position.set(32, 0.25, sz);
    m.visible = extended;
    b.dynamic(m);
    rails.push(m);
  }
  if (extended) b.platform(32, 0, 6.6, 1.5, 0, 0, 0, 'ponte');
  let rise = -1;
  r.actions.ponte = () => {
    if (rise >= 0 || r.platforms.some((p) => p.tag === 'ponte')) return;
    rise = 0;
    for (const s of slabs) s.visible = true;
  };
  b.updaters.push((dt) => {
    if (rise < 0 || rise > N + 1.2) return;
    rise += dt * 2.2;
    for (let i = 0; i < N; i++) {
      const k = Math.max(0, Math.min(1, rise - i * 0.8));
      slabs[i].position.y = -14 + 13.75 * (1 - (1 - k) ** 3);
    }
    if (rise >= N * 0.8 + 1) {
      rise = N + 2;
      for (const m of rails) m.visible = true;
      r.platforms.push({ x: 32, z: 0, hx: 6.6, hz: 1.5, rot: 0, h0: 0, h1: 0, tag: 'ponte' });
    }
  });

  // margem leste: marco, ruína com grade, caixa
  b.add(new THREE.CylinderGeometry(0.5, 0.7, 0.5, 22), M.stoneDark, trs(43.5, 0.25, 0), false);
  b.add(new THREE.CylinderGeometry(0.3, 0.42, 2.6, 22), M.stone, trs(43.5, 1.8, 0), false);
  b.add(new THREE.CylinderGeometry(0.44, 0.3, 0.24, 22), M.bronze, trs(43.5, 3.2, 0), false);
  b.collideCircle(43.5, 0, 0.7, -1, 3.4);
  const flame = K.halo(3.4, 0xffc070, 0.9);
  flame.position.set(43.5, 3.7, 0);
  flame.visible = open;
  b.dynamic(flame);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), M.lampGlow);
  core.position.set(43.5, 3.5, 0);
  core.scale.y = 1.7;
  core.visible = open;
  b.dynamic(core);
  if (open) b.lamp(43.5, 3.8, 0, 0xffb060, 1.6, 22, 0.12);
  r.actions.marco = () => {
    flame.visible = core.visible = true;
    r.lamps.push({ pos: new THREE.Vector3(43.5, 3.8, 0), color: 0xffb060, intensity: 1.6, range: 22, flicker: 0.12 });
    for (const p of puffs) (p.material as THREE.SpriteMaterial).opacity = 0.05;
  };
  // recinto em ruínas com grade (atalho)
  b.box(M.stoneDark, 9, 4.2, 1, 54, 0, 22.5, 0, true);
  b.box(M.stoneDark, 1, 4.2, 9, 49.5, 0, 18, 0, true);
  // parede leste com um trecho desmoronado: dá para subir pelos caixotes e saltar para dentro
  b.box(M.stoneDark, 1, 3.2, 4.3, 58.5, 0, 15.65, 0, true);
  b.box(M.stoneDark, 1, 2.3, 2.4, 58.5, 0, 19.0, 0, true);
  b.platform(58.5, 19.0, 0.5, 1.2, 0, 2.3);
  b.box(M.stoneDark, 1, 3.2, 2.3, 58.5, 0, 21.35, 0, true);
  for (const [x, y, z, rot] of [[58.3, 2.3, 18.3, 0.5], [58.7, 2.3, 19.8, 1.9], [59.6, 0, 20.8, 2.6]] as Array<[number, number, number, number]>) {
    b.box(M.stone, 0.5, 0.28, 0.4, x, y - (y > 0 ? 0.08 : 0), z, rot);
  }
  // caixotes: 0,8 m e depois 1,6 m, cada um ao alcance de um pulo
  K.crate(b, 60.6, 15.6, 0.8, 0.1);
  b.platform(60.6, 15.6, 0.44, 0.44, 0.1, 0.8);
  K.crate(b, 60.5, 17.6, 0.8, -0.2);
  K.crate(b, 60.5, 17.6, 0.8, 0.25, 0.8, false);
  b.collideBox(60.5, 17.6, 0.42, 0.42, -0.2, -1, 1.6);
  b.platform(60.5, 17.6, 0.44, 0.44, -0.2, 1.6);
  b.box(M.stoneDark, 3, 4.2, 1, 51, 0, 13.5, 0, true);
  b.box(M.stoneDark, 3, 4.2, 1, 57, 0, 13.5, 0, true);
  K.ivy(b, 54, 0, 21.95, Math.PI, 5, 3.6, 21);
  const gate = new THREE.Group();
  const gateScan = b.place('large_iron_gate', 54, 0, 13.5, 0, { size: 3.1, fit: 'w', collide: false });
  if (gateScan) gate.add(gateScan);
  else
    for (let i = -5; i <= 5; i++) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 3.2, 14), M.iron);
      bar.position.set(54 + i * 0.27, 1.6, 13.5);
      gate.add(bar);
    }
  const gopen = ctx.flags.has('aberta:grade_bosque');
  gate.visible = !gopen;
  b.dynamic(gate);
  if (!gopen) b.collideBox(54, 13.5, 1.6, 0.3, 0, -1, 4, 'grade_bosque');
  r.actions.grade_bosque = () => {
    gate.visible = false;
    r.colliders = r.colliders.filter((c) => c.tag !== 'grade_bosque');
  };
  K.crate(b, 47.5, -9.4, 0.8, 0.4);
  K.barrel(b, 46.4, -8.2);
  b.place('wooden_barrels_01', 51, -13.2, 0, -0.3, { size: 4.0, fit: 'w', pad: -0.4 });
  b.place('wooden_axe', 47.2, 0, -10.1, 0.5, { roll: 0.35, collide: false });
  K.lampPost(b, 46, 2.8, 3.6);
  K.archWall(b, 57, -14, 0.5, 8, 7.5, 1.3, 3.6, 2.8, M.stoneDark);

  // marco de descanso
  b.add(new THREE.CylinderGeometry(0.34, 0.42, 1.0, 22), M.carved, trs(13, 0.5, 5.6), false);
  b.add(new THREE.CylinderGeometry(0.46, 0.34, 0.14, 22), M.bronze, trs(13, 1.06, 5.6), false);
  K.candle(b, 13, 1.13, 5.6, true);
  b.collideCircle(13, 5.6, 0.45, -1, 1.3);

  // árvores e arbustos
  let s = 4242;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return (s & 0xffff) / 0xffff;
  };
  // ---------- chão de floresta escaneado: jacarandás, raízes, pedras, cascas e capim ----------
  const taken: Array<[number, number, number]> = [];
  const free = (x: number, z: number, r: number) => taken.every(([tx, tz, tr]) => Math.hypot(x - tx, z - tz) > r + tr);
  const hi = ctx.quality !== 'baixa';
  if (hi) {
    for (const [x, z, h, rot] of [[-4.5, -27.5, 13, 0.3], [-35, -17, 12, 2.1], [-30, 19, 11.5, 4.0], [52.5, -24.5, 12, 1.2], [6, 17, 12.5, 5.2]] as Array<[number, number, number, number]>) {
      if (b.place('jacaranda_tree', x, -0.1, z, rot, { size: h, collide: false })) {
        b.collideCircle(x, z, 0.7, -1, 6);
        taken.push([x, z, 5]);
      }
    }
  }
  for (const [x, z, rot, k] of [[-27.5, -4.6, 0.6, 1], [-12, 11.6, 2.4, 1], [2.6, 8.4, 4.1, 2], [12.4, -9.6, 1.2, 1], [-36, 7.5, 3.3, 2], [-18, -10.5, 5.5, 1], [48.4, 8.4, 1.7, 2], [-41, -12, 0.2, 1]] as Array<[number, number, number, number]>) {
    if (distToPath(x, z) < 3) continue;
    b.place(k === 1 ? 'root_cluster_01' : 'root_cluster_02', x, -0.05, z, rot, { collide: k === 1 ? 'box' : false, pad: -0.6 });
    taken.push([x, z, k === 1 ? 2.4 : 1.6]);
  }
  for (const [x, z, rot, sc] of [[-21, -7.5, 0.4, 2.4], [-33.5, -4.5, 2.2, 1.8], [-14, 6.4, 1.1, 1.6], [4.4, -9.5, 3.5, 2.2], [15.6, 9.6, 0.8, 2.6], [-38, 12, 4.4, 2.0], [55.5, 6.5, 2.7, 2.2], [44.5, 20, 1.9, 1.8], [-1, -7.4, 5.1, 1.4]] as Array<[number, number, number, number]>) {
    if (distToPath(x, z) < 2.6) continue;
    b.place('namaqualand_boulder_02', x, -0.1, z, rot, { size: sc, fit: 'w', pad: -0.25 });
    taken.push([x, z, sc / 2]);
  }
  if (hi) {
    const barks = ['a', 'b', 'c', 'd'];
    for (let i = 0; i < 26; i++) {
      const x = -43 + rnd() * 65;
      const z = -27 + rnd() * 54;
      if (distToPath(x, z) < 1.9 || !free(x, z, 0.6)) continue;
      b.place('bark_debris_01', x, 0, z, rnd() * 6.3, { part: `bark_debris_01_${barks[i % 4]}_LOD1`, collide: false });
    }
    const grass = ['large_a', 'large_b', 'large_c', 'mid_a', 'mid_b', 'mid_c', 'small_a', 'small_b'];
    for (let i = 0; i < 170; i++) {
      const east = rnd() < 0.2;
      const x = east ? 41 + rnd() * 19 : -43 + rnd() * 65;
      const z = -27 + rnd() * 54;
      if (distToPath(x, z) < 1.85 || !free(x, z, 0.2) || (x > 22 && x < 41)) continue;
      b.place('grass_medium_01', x, -0.02, z, rnd() * 6.3, { part: `grass_medium_01_geonodes_${grass[i % grass.length]}_LOD1`, size: 0.45 + rnd() * 0.5, collide: false });
    }
  }
  const dense = ctx.quality === 'baixa' ? 34 : 50;
  let placed = 0;
  let extraJac = 0;
  for (let i = 0; i < 600 && placed < dense; i++) {
    const east = rnd() < 0.22;
    const x = east ? 41 + rnd() * 19 : -43 + rnd() * 65;
    const z = -28 + rnd() * 56;
    if (distToPath(x, z) < 3.4) continue;
    if (Math.hypot(x + 4, z + 18) < 8) continue;
    if (Math.hypot(x - 20.5, z + 3) < 7.5) continue;
    if (x > 22 && x < 41) continue;
    if (x > 48 && x < 60 && z > 12 && z < 24) continue;
    if (Math.hypot(x - 13, z - 5.6) < 2.5 || Math.hypot(x - 47, z + 8.6) < 3) continue;
    if (!free(x, z, 1.2)) continue;
    const th = 8 + rnd() * 6;
    const autumn = rnd() < 0.2;
    // perto da trilha, onde o olhar alcança, a árvore é o jacarandá escaneado; ao fundo, na bruma, a procedural
    if (hi && extraJac < 7 && distToPath(x, z) < 8 && free(x, z, 3.5) && b.place('jacaranda_tree', x, -0.1, z, rnd() * 6.3, { size: th, collide: false })) {
      b.collideCircle(x, z, 0.6, -1, 6);
      taken.push([x, z, 3.5]);
      extraJac++;
    } else K.tree(b, x, z, th, 100 + i, autumn ? M.leavesAutumn : M.leaves, 0.3 + rnd() * 0.22);
    if (rnd() < 0.7) K.bush(b, x + 1.2 * (rnd() - 0.5) * 2, z + 1.2 * (rnd() - 0.5) * 2, 0.8 + rnd() * 0.7, M.ivy);
    placed++;
  }
  for (let i = 0; i < 40; i++) {
    const x = -43 + rnd() * 103;
    const z = -28 + rnd() * 56;
    if ((x > 23 && x < 41) || distToPath(x, z) < 2.2) continue;
    K.bush(b, x, z, 0.6 + rnd() * 0.9, M.ivy);
  }
  // bruma esmeralda baixa entre as árvores
  for (let i = 0; i < 14; i++) {
    const h = K.halo(10 + rnd() * 8, 0x3fae8c, open ? 0.04 : 0.09);
    h.position.set(-40 + rnd() * 62, 1 + rnd() * 2, -26 + rnd() * 52);
    b.dynamic(h);
  }

  // muralha de uma fortaleza antiga além da mata, ao norte e a leste (chão de fundo, não caminhável)
  b.add(new THREE.PlaneGeometry(130, 18), M.ground, trs(14, -0.02, -40, 0, -Math.PI / 2), false, false);
  b.add(new THREE.PlaneGeometry(14, 62), M.ground, trs(71, -0.02, 0, 0, -Math.PI / 2), false, false);
  for (let i = 0; i < 5; i++) b.place('modular_fort_01', -40 + i * 14.5, -0.4, -37.5, 0, { part: i === 2 ? 'modular_fort_01_wall_thin_gate_01' : 'modular_fort_01_wall_thick_straight_0' + (1 + (i % 2)), size: 14.5, fit: 'w', collide: false });
  b.place('modular_fort_01', 33, -1, -40, 0, { part: 'modular_fort_01_tower_round', size: 12, fit: 'w', collide: false });
  b.place('modular_fort_01', 66, -0.4, -38, 0.3, { part: 'modular_fort_01_wall_walkway_straight_01', size: 14.5, fit: 'w', collide: false });
  b.place('modular_fort_01', 71, -0.4, -20, Math.PI / 2, { part: 'modular_fort_01_wall_thick_straight_02', size: 14.5, fit: 'w', collide: false });
  b.place('modular_fort_01', 71, -0.4, 0, Math.PI / 2, { part: 'modular_fort_01_wall_thick_straight_01', size: 14.5, fit: 'w', collide: false });
  b.place('modular_fort_01', 71, -0.4, 20, Math.PI / 2, { part: 'modular_fort_01_wall_thick_straight_02', size: 14.5, fit: 'w', collide: false });

  // limites
  b.collideBox(8, -30, 56, 0.6, 0, -1, 30);
  b.collideBox(8, 30, 56, 0.6, 0, -1, 30);
  b.collideBox(62, 0, 0.6, 31, 0, -1, 30);

  b.finalize();

  r.spawns = { de_atrio: { x: -41.5, z: 0, yaw: Math.PI / 2 } };
  r.npcs = [
    { id: 'gloria', x: -36, z: 5.5, yaw: -2.2 },
    { id: 'matias', x: -35, z: -6, yaw: -1.0 },
  ];
  r.enemies = [
    { kind: 'fiapo', x: -23, z: 2.5, group: 'trilha' },
    { kind: 'fiapo', x: -15, z: -3, group: 'trilha' },
    { kind: 'fiapo', x: -9, z: 3.5, group: 'trilha' },
    { kind: 'fiapo', x: -7, z: -16, group: 'clareira' },
    { kind: 'fiapo', x: -1, z: -17.5, group: 'clareira' },
    { kind: 'vulto', x: -4, z: -21.5, group: 'clareira' },
    { kind: 'vulto', x: 50, z: -3, group: 'margem', ifFlag: 'ponte_estendida' },
    { kind: 'fiapo', x: 47, z: 6, group: 'margem', ifFlag: 'ponte_estendida' },
    // depois do Veredito: o foco residual da clareira (missão Focos Residuais)
    // foco da clareira: a Duelista das Cinzas e dois Eruditos Ocos
    { kind: 'duelista', x: -2, z: -21, group: 'foco', ifFlag: 'epilogo' },
    { kind: 'erudito', x: -6, z: -19, group: 'foco', ifFlag: 'epilogo' },
    { kind: 'erudito', x: 2, z: -19.5, group: 'foco', ifFlag: 'epilogo' },
    { kind: 'fiapo', x: -9, z: -14, group: 'foco', ifFlag: 'epilogo' },
    { kind: 'fiapo', x: 0, z: -14.5, group: 'foco', ifFlag: 'epilogo' },
    { kind: 'fiapo', x: -3, z: -23, group: 'foco', ifFlag: 'epilogo' },
  ];
  r.props = [
    { id: 'portal_atrio', kind: 'portal', x: -44.4, z: 0, label: 'Voltar ao Pátio dos Caminhos', radius: 2.6, data: { to: 'atrio', spawn: 'de_bosque' } },
    { id: 'bau_selo', kind: 'chest', x: -4, z: -21, label: 'Abrir o baú', radius: 1.8, data: { item: 'selo_contexto', requiresGroup: 'clareira' } },
    { id: 'mec_c', kind: 'mechanism', x: 17.5, z: -5, label: 'Examinar o mecanismo', radius: 1.7 },
    { id: 'mec_a', kind: 'mechanism', x: 20.5, z: -5.6, label: 'Examinar o mecanismo', radius: 1.7 },
    { id: 'mec_b', kind: 'mechanism', x: 23.3, z: -4.6, label: 'Examinar o mecanismo', radius: 1.7 },
    { id: 'marco', kind: 'examine', x: 43.5, z: 0, label: 'Acender o marco', radius: 2.0 },
    { id: 'caixa_dalva', kind: 'pickup', x: 47, z: -8.6, label: 'Pegar a caixa de ferragens', radius: 1.8, data: { item: 'encomenda_dalva' } },
    { id: 'grade_bosque', kind: 'door', x: 54, z: 12.8, label: 'Examinar a grade', radius: 1.8, data: { skill: 'atalhos', unlessFlag: 'aberta:grade_bosque' } },
    { id: 'bau_botas', kind: 'chest', x: 54, z: 19.5, label: 'Abrir o baú', radius: 1.8, data: { item: 'botas_bradford', item2: 'maca_absoluta', rot: Math.PI } },
    { id: 'pagina_4', kind: 'page', x: 56.5, z: -17.5, label: 'Recolher a página solta', radius: 1.6, data: { page: 'confundimento' } },
    { id: 'descanso_bosque', kind: 'rest', x: 13, z: 5.6, label: 'Descansar e registrar o caminho', radius: 1.8 },
    { id: 'moedas_bosque_1', kind: 'pickup', x: -26, z: 15, label: 'Pegar moedas', data: { item: 'moedas', qty: 14 } },
    { id: 'moedas_bosque_2', kind: 'pickup', x: 9.6, z: -8.6, label: 'Pegar moedas', data: { item: 'moedas', qty: 10 } },
    { id: 'caldo_bosque', kind: 'pickup', x: -11.6, z: 9.4, label: 'Pegar o caldo', data: { item: 'caldo', qty: 1 } },
    { id: 'rastro_bosque', kind: 'pickup', x: -31, z: -22, label: 'Pegar o que o rastro escondia', data: { item: 'moedas', qty: 40, needsCrivo: 'rastro' } },
    { id: 'ruina_bosque', kind: 'examine', x: -25, z: 3.2, label: 'Examinar a ruína', radius: 2.2, data: { text: 'No lintel caído, quase apagado: "Passou sempre. Logo, passará." Alguém riscou a segunda frase com a ponta de uma faca.', xp: 10 } },
  ];
  r.mapPoints = [
    { x: -44, z: 0, label: 'Arco do Pátio', kind: 'portal' },
    { x: -4, z: -18, label: 'Clareira', kind: 'poi' },
    { x: 32, z: 0, label: 'Ponte das Conclusões', kind: 'poi' },
    { x: 43.5, z: 0, label: 'Marco', kind: 'poi' },
  ];
  return r;
}
