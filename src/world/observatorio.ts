import * as THREE from 'three';
import { RegionBuilder, trs } from './builder';
import { M } from './mats';
import * as K from './kit';
import { ENV } from './envs';
import { emptyRegion, type BuiltRegion, type RegionCtx } from './region';

/**
 * Observatório do Acaso (Atlas E-07, E-18, E-22). Terraço no alto da Academia,
 * sob chuva: dois braseiros, um frasco de óleo, e a arena onde o Veredito espera.
 * A escolha do braseiro é uma troca com custo dos dois lados, sem resposta certa.
 */
export function buildObservatorio(ctx: RegionCtx): BuiltRegion {
  const b = new RegionBuilder();
  const r = emptyRegion('observatorio', 'Observatório do Acaso', 'De onde se vê tudo de uma vez', b, ENV.observatorio);
  r.music = 'observatorio';
  r.baseGround = null;
  r.bounds = { minX: -16, maxX: 16, minZ: -40, maxZ: 15 };
  const vila = ctx.flags.has('braseiro_vila');
  const terraco = ctx.flags.has('braseiro_terraco');
  const R = 14.5;
  const AZ = -24;

  // patamar e passarela
  // topo do bloco 2 cm abaixo do piso (no mesmo plano, cintilava de longe)
  b.box(M.stoneDark, 13, 29.98, 25, 0, -30, 2.5, 0);
  b.add(new THREE.PlaneGeometry(13, 25), M.flag, trs(0, 0.01, 2.5, 0, -Math.PI / 2), false, false);
  b.platform(0, 2.5, 6.3, 12.5, 0, 0);
  // arena circular
  b.add(new THREE.CylinderGeometry(R + 0.6, R - 1, 30, 40), M.stoneDark, trs(0, -15, AZ), false);
  b.add(new THREE.CircleGeometry(R + 0.5, 48), M.flag, trs(0, 0.018, AZ, 0, -Math.PI / 2), false, false);
  for (const rr of [4, 8.5, 12.5]) b.add(new THREE.RingGeometry(rr, rr + 0.16, 64), M.bronze, trs(0, 0.03, AZ, 0, -Math.PI / 2), false, false);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    b.add(new THREE.PlaneGeometry(0.1, 8.5), M.bronze, trs(Math.sin(a) * 8.3, 0.036, AZ + Math.cos(a) * 8.3, a, -Math.PI / 2), false, false);
  }
  b.platform(0, AZ, R + 0.4, R + 0.4, 0, 0);
  // parapeito da arena (aberto ao sul, onde fica a grade)
  const SEG = 30;
  for (let i = 0; i < SEG; i++) {
    const a = ((i + 0.5) / SEG) * Math.PI * 2;
    if (Math.abs(Math.sin(a)) < 0.24 && Math.cos(a) > 0) continue;
    const x = Math.sin(a) * R;
    const z = AZ + Math.cos(a) * R;
    b.box(M.stoneDark, (2 * Math.PI * R) / SEG + 0.1, 1.05, 0.5, x, 0, z, a, true);
    b.add(new THREE.BoxGeometry((2 * Math.PI * R) / SEG + 0.16, 0.14, 0.66), M.carved, trs(x, 1.12, z, a));
    if (i % 5 === 2) K.pinnacle(b, x, 1.15, z, 0.6, 2.0, M.stoneDark);
  }
  // parapeitos do patamar
  for (const sx of [-1, 1]) {
    b.box(M.stoneDark, 0.5, 1.05, 25, sx * 6.25, 0, 2.5, 0, true);
    b.add(new THREE.BoxGeometry(0.66, 0.14, 25.2), M.carved, trs(sx * 6.25, 1.12, 2.5));
    K.pinnacle(b, sx * 6.25, 1.15, 14.6, 0.7, 2.4, M.stoneDark);
    K.pinnacle(b, sx * 6.25, 1.15, -9.4, 0.7, 2.4, M.stoneDark);
    K.lampPost(b, sx * 5.2, 9.5, 3.4);
  }
  // casa da escada (de onde se chega): ocupa toda a largura do patamar e desce até a base da torre, para
  // que atrás da porta e dos lados dela haja parede, e não o vazio que o Gabriel viu
  b.box(M.stoneDark, 13.5, 30, 5.5, 0, -30, 17.8, 0);
  b.box(M.stone, 13.5, 9, 5.5, 0, 0, 17.8, 0, true);
  K.archWall(b, 0, 14.75, 0, 13.5, 9, 0.5, 2.8, 2.6, M.stone, 0, false);
  if (!b.place('large_castle_door', 0, 0, 14.7, Math.PI, { size: 2.9, fit: 'w', collide: false })) b.box(M.woodDark, 2.8, 5, 0.2, 0, 0, 14.9, 0);
  K.gableRoof(b, 0, 9, 17.8, 0, 13.9, 5.9, 2.8);
  for (const sx of [-1, 1]) {
    K.gothicWindow(b, sx * 4.4, 4.6, 14.44, Math.PI, 1.3, 3.2, true);
    K.pinnacle(b, sx * 6.75, 9, 15.05, 0.8, 3.2, M.stoneDark);
  }
  b.add(new THREE.BoxGeometry(14, 0.24, 0.7), M.carved, trs(0, 8.9, 14.75));
  K.wallLantern(b, 2.4, 3.2, 14.5, Math.PI);
  K.wallLantern(b, -2.4, 3.2, 14.5, Math.PI);

  // braseiros
  const brazier = (x: number, z: number, lit: boolean): (() => void) => {
    b.add(new THREE.CylinderGeometry(0.36, 0.5, 1.0, 22), M.stone, trs(x, 0.5, z), false);
    b.add(new THREE.CylinderGeometry(0.72, 0.4, 0.42, 22), M.iron, trs(x, 1.2, z), false);
    b.collideCircle(x, z, 0.7, -1, 1.6);
    const fl = K.halo(4.2, 0xffb060, 0.95);
    fl.position.set(x, 1.9, z);
    const core = new THREE.Mesh(new THREE.ConeGeometry(0.36, 1.0, 7), M.lampGlow);
    core.position.set(x, 1.85, z);
    fl.visible = core.visible = lit;
    b.dynamic(fl);
    b.dynamic(core);
    b.updaters.push((_dt, t) => {
      if (!core.visible) return;
      core.scale.set(1 + Math.sin(t * 13 + x) * 0.12, 1 + Math.sin(t * 9 + x) * 0.18, 1 + Math.cos(t * 11) * 0.12);
    });
    const on = () => {
      fl.visible = core.visible = true;
      r.lamps.push({ pos: new THREE.Vector3(x, 2.2, z), color: 0xffa050, intensity: 1.8, range: 22, flicker: 0.2 });
    };
    if (lit) b.lamp(x, 2.2, z, 0xffa050, 1.8, 22, 0.2);
    return on;
  };
  r.actions.braseiro_vila = brazier(-4.2, -4.4, vila);
  const lightTerrace = brazier(4.2, -4.4, terraco);
  // a estrada da Vila, lá embaixo a oeste: uma fileira de luzes que só acende com o braseiro
  const road: THREE.Sprite[] = [];
  for (let i = 0; i < 9; i++) {
    const h = K.halo(5, 0xffb060, 0.8);
    h.position.set(-30 - i * 9, -26 - i * 1.5, -6 + Math.sin(i * 0.8) * 10);
    h.visible = vila;
    b.dynamic(h);
    road.push(h);
  }
  const vilaOn = r.actions.braseiro_vila;
  r.actions.braseiro_vila = () => {
    vilaOn();
    for (const h of road) h.visible = true;
  };
  // lampiões da arena: acesos apenas se o braseiro do terraço foi o escolhido
  const arenaLamps: Array<[number, number]> = [];
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const x = Math.sin(a) * (R - 1.4);
    const z = AZ + Math.cos(a) * (R - 1.4);
    b.add(new THREE.CylinderGeometry(0.07, 0.1, 3.6, 16), M.iron, trs(x, 1.8, z));
    b.add(new THREE.BoxGeometry(0.3, 0.4, 0.3), terraco ? M.lampGlow : M.glassDark, trs(x, 3.8, z), true, false);
    b.collideCircle(x, z, 0.2, -1, 3.6);
    arenaLamps.push([x, z]);
    if (terraco) {
      b.lamp(x, 3.8, z, 0xffb060, 1.5, 22, 0.08);
      const h = K.halo(2.6, 0xffb86a, 0.6);
      h.position.set(x, 3.8, z);
      b.dynamic(h);
    }
  }
  r.actions.braseiro_terraco = () => {
    lightTerrace();
    for (const [x, z] of arenaLamps) {
      r.lamps.push({ pos: new THREE.Vector3(x, 3.8, z), color: 0xffb060, intensity: 1.5, range: 22, flicker: 0.08 });
      const h = K.halo(2.6, 0xffb86a, 0.6);
      h.position.set(x, 3.8, z);
      r.root.add(h);
    }
  };

  // grade entre o patamar e a arena
  const openGate = ctx.flags.has('grade_aberta');
  for (const sx of [-1, 1]) {
    b.box(M.stone, 1.0, 4.2, 1.0, sx * 2.6, 0, -9.7, 0, true);
    K.pinnacle(b, sx * 2.6, 4.2, -9.7, 0.8, 2.2, M.stoneDark);
    b.box(M.stoneDark, 3.2, 1.05, 0.5, sx * 4.6, 0, -9.7, 0, true);
  }
  const gate = new THREE.Group();
  const gateScan = b.place('large_iron_gate', 0, 0, -9.7, 0, { size: 4.25, fit: 'w', collide: false });
  if (gateScan) gate.add(gateScan);
  else
    for (let i = -7; i <= 7; i++) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 3.6, 14), M.iron);
      bar.position.set(i * 0.28, 1.8, -9.7);
      gate.add(bar);
    }
  gate.visible = !openGate;
  b.dynamic(gate);
  if (!openGate) b.collideBox(0, -9.7, 2.2, 0.3, 0, -1, 5, 'grade_arena');
  // grade levadiça: sobe aos trancos, presa por corrente, e some na sombra do arco
  let lift = -1;
  r.actions.grade = () => {
    if (lift < 0) lift = 0;
    r.colliders = r.colliders.filter((c) => c.tag !== 'grade_arena');
  };
  b.updaters.push((dt) => {
    if (lift < 0 || lift >= 1) return;
    lift = Math.min(1, lift + dt * 0.5);
    // três puxões de corrente: sobe, para, sobe
    const steps = lift * 3;
    const f = Math.floor(steps);
    const k = (f + Math.min(1, (steps - f) * 1.6)) / 3;
    gate.position.y = 3.9 * Math.min(1, k);
    if (lift >= 1) gate.visible = false;
  });

  // cúpula do observatório ao fundo, com a fenda e o telescópio
  b.add(new THREE.CylinderGeometry(9, 9.4, 7, 28), M.stone, trs(0, 3.5, -47), false);
  b.add(new THREE.SphereGeometry(9, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), M.slate, trs(0, 7, -47), false);
  b.add(new THREE.BoxGeometry(1.6, 9, 9), M.glassDark, trs(0, 9.4, -42.4, 0, -0.5), false);
  b.add(new THREE.CylinderGeometry(0.5, 0.75, 8, 24), M.bronze, trs(0, 12.6, -40.6, 0, -0.9), false);
  b.add(new THREE.TorusGeometry(9.2, 0.2, 10, 40), M.bronze, trs(0, 7, -47, 0, Math.PI / 2), false);
  K.gothicWindow(b, 0, 0.6, -37.9, 0, 2.6, 5, true);
  // esferas armilares nos cantos da arena
  for (const a of [Math.PI * 0.72, -Math.PI * 0.72]) {
    const x = Math.sin(a) * (R - 2.6);
    const z = AZ + Math.cos(a) * (R - 2.6);
    b.add(new THREE.CylinderGeometry(0.4, 0.55, 1.2, 22), M.stone, trs(x, 0.6, z), false);
    for (let k = 0; k < 3; k++) b.add(new THREE.TorusGeometry(0.75, 0.035, 10, 28), M.bronze, trs(x, 2.1, z, k * 1.05, k * 0.7), false);
    b.collideCircle(x, z, 0.7, -1, 3);
  }
  // a cidade lá embaixo: torres na bruma
  for (const [x, z, w, h, sp] of [
    [-30, -10, 7, 18, 14], [30, -4, 6, 14, 12], [-40, -40, 9, 26, 20], [42, -44, 9, 24, 18], [-24, 20, 6, 12, 10], [26, 22, 7, 16, 12], [0, -78, 11, 34, 26], [-58, 6, 8, 20, 14], [60, -20, 8, 18, 16],
  ] as Array<[number, number, number, number, number]>)
    K.spireTower(b, x, z, w, h, sp, -32, x * 0.01, false);

  // guardiãs de pedra no fundo da arena, de frente para quem chega
  for (const sx of [-1, 1]) {
    b.box(M.stoneDark, 1.8, 0.8, 1.8, sx * 5.2, 0, -35.2, 0, true);
    b.add(new THREE.BoxGeometry(1.94, 0.12, 1.94), M.carved, trs(sx * 5.2, 0.86, -35.2));
    b.place('gothic_statue', sx * 5.2, 0.92, -35.2, sx * 0.3, { size: 2.6, collide: false });
    K.candle(b, sx * 5.2 + 0.7, 0.92, -34.4, true);
  }
  // a muralha da cidade lá embaixo
  b.place('modular_fort_01', -34, -32, -22, Math.PI / 2, { part: 'modular_fort_01_tower_round', size: 13, fit: 'w', collide: false });
  b.place('modular_fort_01', -34, -32, -6, Math.PI / 2, { part: 'modular_fort_01_wall_thick_straight_01', size: 16, fit: 'w', collide: false });
  b.place('modular_fort_01', 34, -32, -18, -Math.PI / 2, { part: 'modular_fort_01_wall_thin_gate_01', size: 10, fit: 'w', collide: false });
  b.place('modular_fort_01', 34, -32, -4, -Math.PI / 2, { part: 'modular_fort_01_wall_thin_straight_01', size: 16, fit: 'w', collide: false });
  // carga deixada junto à casa da escada
  K.crate(b, -5.0, 13.3, 0.7, 0.3);
  K.barrel(b, -4.2, 13.8);

  // marco de descanso
  b.add(new THREE.CylinderGeometry(0.34, 0.42, 1.0, 22), M.carved, trs(-4.4, 0.5, 9.4), false);
  b.add(new THREE.CylinderGeometry(0.46, 0.34, 0.14, 22), M.bronze, trs(-4.4, 1.06, 9.4), false);
  K.candle(b, -4.4, 1.13, 9.4, true);
  b.collideCircle(-4.4, 9.4, 0.45, -1, 1.3);
  K.bench(b, 4.9, 4, Math.PI / 2);
  K.plaque(b, 'Há algo gravado, apagado pela chuva', 5.96, 1.5, 6.6, -Math.PI / 2, 2.2, 0.26, '#6a6470', null, 'italic 400 46px "Source Serif 4", Georgia, serif');

  // a Academia está lá embaixo: telhados e torres da cidade abaixo do terraço, e serras ao longe
  K.skyline(b, 0, -10, 45, 110, { count: 50, color: 0x10172a, seed: 13, minH: 8, maxH: 30, y0: -42 });
  K.skyline(b, 0, -10, 130, 200, { count: 26, color: 0x172038, seed: 59, minH: 20, maxH: 55, y0: -40, windows: 0.1 });
  b.finalize();

  r.spawns = { de_atrio: { x: 0, z: 12.4, yaw: Math.PI } };
  r.npcs = [
    { id: 'severino', x: 0.5, z: 10.0, yaw: Math.PI },
    { id: 'rosario', x: -7.0, z: 5.5, yaw: 2.2 },
    { id: 'celeste', x: 8.6, z: 1.2, yaw: -2.0 },
    { id: 'inacio', x: -1.0, z: 6.0, yaw: Math.PI },
  ];
  r.enemies = [
    { kind: 'veredito', x: 0, z: AZ - 3, group: 'veredito', ifFlag: 'grade_aberta' },
    // foco do terraço: a Matriarca do Coro Velado, dois Suplicantes e um Espectro da Lanterna
    { kind: 'matriarca', x: 0, z: AZ - 6, group: 'foco', ifFlag: 'epilogo' },
    { kind: 'suplicante', x: -5, z: AZ + 2, group: 'foco', ifFlag: 'epilogo' },
    { kind: 'suplicante', x: 5, z: AZ + 2, group: 'foco', ifFlag: 'epilogo' },
    { kind: 'vulto', x: 0, z: AZ - 1, group: 'foco', ifFlag: 'epilogo' },
    { kind: 'fiapo', x: -3, z: AZ - 2, group: 'foco', ifFlag: 'epilogo' },
    { kind: 'fiapo', x: 3, z: AZ - 2, group: 'foco', ifFlag: 'epilogo' },
  ];
  r.props = [
    { id: 'portal_atrio', kind: 'portal', x: 0, z: 14, label: 'Descer ao Pátio dos Caminhos', radius: 1.9, data: { to: 'atrio', spawn: 'de_observatorio' } },
    { id: 'braseiro_vila', kind: 'brazier', x: -4.2, z: -4.4, label: 'Examinar o braseiro da estrada', radius: 1.9, data: { group: 'braseiros' } },
    { id: 'braseiro_terraco', kind: 'brazier', x: 4.2, z: -4.4, label: 'Examinar o braseiro do terraço', radius: 1.9, data: { group: 'braseiros' } },
    { id: 'pagina_6', kind: 'page', x: -4.6, z: 1.6, label: 'Recolher a página solta', radius: 1.6, data: { page: 'decisao' } },
    { id: 'inscricao_obs', kind: 'examine', x: 5.2, z: 6.6, label: 'Examinar a inscrição', radius: 1.8, data: { needsItem: 'lanterna_transparencia', dimText: 'Há algo gravado no parapeito, apagado pela chuva e pela penumbra. Com a luz certa, talvez desse para ler.', text: 'À luz da lanterna, a gravação aparece: "Quando ele recita, está indefeso por dentro. Interrompa-o nessa hora e cada golpe vale por mais."', xp: 20 } },
    { id: 'lua_obs', kind: 'examine', x: -5.2, z: 6.6, label: 'Olhar a lua', radius: 1.8, data: { text: 'Daqui de cima a lua tem uma mancha escura bem no meio, redonda como uma pupila. Na Academia chamavam isso de olho único: uma lua que olha uma coisa de cada vez e, por isso, não se deixa convencer pelo céu inteiro. O Crivo fica parado, encarando. A lua parece conferir a mesma soma que ele.', xp: 10 } },
    { id: 'descanso_obs', kind: 'rest', x: -4.4, z: 9.4, label: 'Descansar e registrar o caminho', radius: 1.8 },
    { id: 'bau_pingente', kind: 'chest', x: 0, z: -36.4, label: 'Abrir o baú', radius: 1.9, data: { item: 'pingente_intervalo', ifFlag: 'veredito_vencido' } },
    { id: 'moedas_obs', kind: 'pickup', x: 4.8, z: 12.6, label: 'Pegar moedas', data: { item: 'moedas', qty: 20 } },
    { id: 'caldo_obs', kind: 'pickup', x: -5, z: -8.4, label: 'Pegar o caldo', data: { item: 'caldo', qty: 2 } },
    { id: 'rastro_obs', kind: 'pickup', x: 5, z: -1, label: 'Pegar o que o rastro escondia', data: { item: 'moedas', qty: 50, needsCrivo: 'rastro' } },
  ];
  r.mapPoints = [
    { x: 0, z: 14, label: 'Escada do Pátio', kind: 'portal' },
    { x: 0, z: -4.4, label: 'Braseiros', kind: 'poi' },
    { x: 0, z: AZ, label: 'Terraço do Veredito', kind: 'poi' },
  ];
  return r;
}
