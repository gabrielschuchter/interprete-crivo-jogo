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
  b.box(M.stoneDark, 3, 26, 62, 24.5, -26, 0, 0);
  b.box(M.stoneDark, 3, 26, 62, 39.5, -26, 0, 0);
  for (let i = 0; i < 9; i++) {
    const z = -28 + i * 7;
    b.box(M.stone, 1.2 + (i % 3) * 0.5, 9, 3.5, 26.1, -9.2 - (i % 2), z, 0.1 * (i % 3));
    b.box(M.stone, 1.2 + ((i + 1) % 3) * 0.5, 9, 3.5, 37.9, -9.4 - ((i + 1) % 2), z + 3, -0.1 * (i % 3));
  }
  // névoa no fundo do abismo
  const mist = new THREE.Mesh(new THREE.PlaneGeometry(14, 62), new THREE.MeshBasicMaterial({ color: 0x1f5a4c, transparent: true, opacity: 0.85, fog: true }));
  mist.rotation.x = -Math.PI / 2;
  mist.position.set(32, -7, 0);
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
  const seg = (ax: number, az: number, bx: number, bz: number, w: number) => {
    const len = Math.hypot(bx - ax, bz - az);
    const rot = Math.atan2(bx - ax, bz - az);
    b.add(new THREE.PlaneGeometry(w, len + 1.4), M.cobbleDry, trs((ax + bx) / 2, 0.03, (az + bz) / 2, rot, -Math.PI / 2), false, false);
  };
  for (let i = 0; i < path.length - 1; i++) seg(path[i][0], path[i][1], path[i + 1][0], path[i + 1][1], 3.2);
  seg(-7, 2, -4, -15, 2.4);
  seg(40, 0, 52, 0, 3.2);
  b.add(new THREE.CircleGeometry(5.5, 24), M.cobbleDry, trs(-4, 0.035, -18, 0, -Math.PI / 2), false, false);
  b.add(new THREE.CircleGeometry(5, 24), M.flag, trs(20.5, 0.035, -1.5, 0, -Math.PI / 2), false, false);
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

  // portal de volta ao Átrio
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
    b.add(new THREE.CylinderGeometry(0.42, 0.52, 1.1, 8), M.stone, trs(x, 0.55, z), false);
    b.add(new THREE.CylinderGeometry(0.5, 0.42, 0.12, 8), M.bronze, trs(x, 1.16, z), false);
    b.add(new THREE.TorusGeometry(0.2, 0.035, 6, 16), M.bronze, trs(x, 1.24, z, 0, Math.PI / 2), false);
    b.collideCircle(x, z, 0.55, -1, 1.4);
    if (kind === 'a') b.add(new THREE.TorusGeometry(0.5, 0.06, 6, 18, Math.PI * 1.3), M.wood, trs(x + 0.9, 0.1, z + 0.5, 0.4, 1.2, 0.2), false);
    if (kind === 'b') {
      K.lantern(b, x + 0.85, 0.24, z + 0.4, 0.3, 0, false);
      b.add(new THREE.BoxGeometry(0.14, 0.03, 0.34), M.woodDark, trs(x + 0.5, 0.03, z + 0.75, 0.3), false);
      b.add(new THREE.BoxGeometry(0.14, 0.03, 0.34), M.woodDark, trs(x + 0.72, 0.03, z + 0.82, -0.2), false);
    }
    if (kind === 'c') b.add(new THREE.TorusGeometry(0.16, 0.035, 6, 14, Math.PI * 1.4), M.iron, trs(x + 0.8, 0.05, z + 0.5, 0.8, Math.PI / 2), false);
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
  b.add(new THREE.CylinderGeometry(0.5, 0.7, 0.5, 8), M.stoneDark, trs(43.5, 0.25, 0), false);
  b.add(new THREE.CylinderGeometry(0.3, 0.42, 2.6, 8), M.stone, trs(43.5, 1.8, 0), false);
  b.add(new THREE.CylinderGeometry(0.44, 0.3, 0.24, 8), M.bronze, trs(43.5, 3.2, 0), false);
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
  b.box(M.stoneDark, 1, 3.2, 9, 58.5, 0, 18, 0, true);
  b.box(M.stoneDark, 3, 4.2, 1, 51, 0, 13.5, 0, true);
  b.box(M.stoneDark, 3, 4.2, 1, 57, 0, 13.5, 0, true);
  K.ivy(b, 54, 0, 21.95, Math.PI, 5, 3.6, 21);
  const gate = new THREE.Group();
  for (let i = -5; i <= 5; i++) {
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 3.2, 5), M.iron);
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
  K.lampPost(b, 46, 2.8, 3.6);
  K.archWall(b, 57, -14, 0.5, 8, 7.5, 1.3, 3.6, 2.8, M.stoneDark);

  // marco de descanso
  b.add(new THREE.CylinderGeometry(0.34, 0.42, 1.0, 8), M.carved, trs(13, 0.5, 5.6), false);
  b.add(new THREE.CylinderGeometry(0.46, 0.34, 0.14, 8), M.bronze, trs(13, 1.06, 5.6), false);
  K.candle(b, 13, 1.13, 5.6, true);
  b.collideCircle(13, 5.6, 0.45, -1, 1.3);

  // árvores e arbustos
  let s = 4242;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return (s & 0xffff) / 0xffff;
  };
  const dense = ctx.quality === 'baixa' ? 34 : 58;
  let placed = 0;
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
    K.tree(b, x, z, 8 + rnd() * 6, 100 + i, rnd() < 0.2 ? M.leavesAutumn : M.leaves, 0.3 + rnd() * 0.22);
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

  // limites
  b.collideBox(8, -30, 56, 0.6, 0, -1, 30);
  b.collideBox(8, 30, 56, 0.6, 0, -1, 30);
  b.collideBox(62, 0, 0.6, 31, 0, -1, 30);

  b.finalize();

  r.spawns = { de_atrio: { x: -41.5, z: 0, yaw: Math.PI / 2 } };
  r.enemies = [
    { kind: 'fiapo', x: -23, z: 2.5, group: 'trilha' },
    { kind: 'fiapo', x: -15, z: -3, group: 'trilha' },
    { kind: 'fiapo', x: -9, z: 3.5, group: 'trilha' },
    { kind: 'fiapo', x: -7, z: -16, group: 'clareira' },
    { kind: 'fiapo', x: -1, z: -17.5, group: 'clareira' },
    { kind: 'vulto', x: -4, z: -21.5, group: 'clareira' },
    { kind: 'vulto', x: 50, z: -3, group: 'margem', ifFlag: 'ponte_estendida' },
    { kind: 'fiapo', x: 47, z: 6, group: 'margem', ifFlag: 'ponte_estendida' },
  ];
  r.props = [
    { id: 'portal_atrio', kind: 'portal', x: -44.4, z: 0, label: 'Voltar ao Átrio dos Caminhos', radius: 2.6, data: { to: 'atrio', spawn: 'de_bosque' } },
    { id: 'bau_selo', kind: 'chest', x: -4, z: -21, label: 'Abrir o baú', radius: 1.8, data: { item: 'selo_contexto', requiresGroup: 'clareira' } },
    { id: 'mec_c', kind: 'mechanism', x: 17.5, z: -5, label: 'Examinar o mecanismo', radius: 1.7 },
    { id: 'mec_a', kind: 'mechanism', x: 20.5, z: -5.6, label: 'Examinar o mecanismo', radius: 1.7 },
    { id: 'mec_b', kind: 'mechanism', x: 23.3, z: -4.6, label: 'Examinar o mecanismo', radius: 1.7 },
    { id: 'marco', kind: 'examine', x: 43.5, z: 0, label: 'Acender o marco', radius: 2.0 },
    { id: 'caixa_dalva', kind: 'pickup', x: 47, z: -8.6, label: 'Pegar a caixa de ferragens', radius: 1.8, data: { item: 'encomenda_dalva' } },
    { id: 'grade_bosque', kind: 'door', x: 54, z: 12.8, label: 'Examinar a grade', radius: 1.8, data: { skill: 'atalhos', unlessFlag: 'aberta:grade_bosque' } },
    { id: 'bau_botas', kind: 'chest', x: 54, z: 19.5, label: 'Abrir o baú', radius: 1.8, data: { item: 'botas_bradford', rot: Math.PI } },
    { id: 'pagina_4', kind: 'page', x: 56.5, z: -17.5, label: 'Recolher a página solta', radius: 1.6, data: { page: 'confundimento' } },
    { id: 'descanso_bosque', kind: 'rest', x: 13, z: 5.6, label: 'Descansar e registrar o caminho', radius: 1.8 },
    { id: 'moedas_bosque_1', kind: 'pickup', x: -26, z: 15, label: 'Pegar moedas', data: { item: 'moedas', qty: 14 } },
    { id: 'moedas_bosque_2', kind: 'pickup', x: 9.6, z: -8.6, label: 'Pegar moedas', data: { item: 'moedas', qty: 10 } },
    { id: 'caldo_bosque', kind: 'pickup', x: -11.6, z: 9.4, label: 'Pegar o caldo', data: { item: 'caldo', qty: 1 } },
    { id: 'rastro_bosque', kind: 'pickup', x: -31, z: -22, label: 'Pegar o que o rastro escondia', data: { item: 'moedas', qty: 40, needsCrivo: 'rastro' } },
    { id: 'ruina_bosque', kind: 'examine', x: -25, z: 3.2, label: 'Examinar a ruína', radius: 2.2, data: { text: 'No lintel caído, quase apagado: "Passou sempre. Logo, passará." Alguém riscou a segunda frase com a ponta de uma faca.', xp: 10 } },
  ];
  r.mapPoints = [
    { x: -44, z: 0, label: 'Arco do Átrio', kind: 'portal' },
    { x: -4, z: -18, label: 'Clareira', kind: 'poi' },
    { x: 32, z: 0, label: 'Ponte das Conclusões', kind: 'poi' },
    { x: 43.5, z: 0, label: 'Marco', kind: 'poi' },
  ];
  return r;
}
