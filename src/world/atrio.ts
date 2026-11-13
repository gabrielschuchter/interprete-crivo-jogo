import * as THREE from 'three';
import { RegionBuilder, trs } from './builder';
import { M } from './mats';
import * as K from './kit';
import { ENV } from './envs';
import { emptyRegion, type BuiltRegion, type RegionCtx } from './region';


type Hair = 'curto' | 'longo' | 'touca' | 'calvo';
/** Os oito bustos do Passeio dos Mestres. Todas as pessoas homenageadas já faleceram; o texto longo está no códice. */
export const MESTRES_PATIO: Array<{ id: string; nome: string; anos: string; cabelo: Hair; texto: string }> = [
  { id: 'lind', nome: 'JAMES LIND', anos: '1716 · 1794', cabelo: 'touca', texto: 'JAMES LIND. Em 1747, a bordo do Salisbury, separou doze marinheiros com escorbuto em seis duplas e deu um tratamento diferente a cada uma. Quem recebeu laranjas e limões melhorou. A comparação foi a ideia.' },
  { id: 'nightingale', nome: 'FLORENCE NIGHTINGALE', anos: '1820 · 1910', cabelo: 'touca', texto: 'FLORENCE NIGHTINGALE. Contou as mortes dos hospitais da Crimeia e as desenhou em um diagrama que ninguém conseguia ignorar. A maior parte vinha de doença evitável, não de ferida.' },
  { id: 'semmelweis', nome: 'IGNAZ SEMMELWEIS', anos: '1818 · 1865', cabelo: 'curto', texto: 'IGNAZ SEMMELWEIS. Em Viena, em 1847, ligou a febre das parturientes às mãos que vinham da autópsia. Mandou lavar com cloro e as mortes diminuíram. Os colegas pediram um porquê que ele ainda não tinha.' },
  { id: 'fisher', nome: 'RONALD FISHER', anos: '1890 · 1962', cabelo: 'curto', texto: 'RONALD FISHER. Defendeu que a ordem dos tratamentos seja sorteada. O exemplo do livro era uma senhora que jurava saber se o chá fora posto antes do leite.' },
  { id: 'hill', nome: 'A. BRADFORD HILL', anos: '1897 · 1991', cabelo: 'curto', texto: 'AUSTIN BRADFORD HILL. Estatístico de um dos primeiros ensaios randomizados modernos e autor de nove pontos de vista para pensar em causa. Ele mesmo dizia que não eram uma lista de verificação.' },
  { id: 'cochrane', nome: 'ARCHIE COCHRANE', anos: '1909 · 1988', cabelo: 'curto', texto: 'ARCHIE COCHRANE. Pediu que os serviços de saúde fossem avaliados por ensaios e que alguém resumisse todos eles, por especialidade, de tempos em tempos. A Colaboração Cochrane leva o nome dele.' },
  { id: 'sackett', nome: 'DAVID SACKETT', anos: '1934 · 2015', cabelo: 'calvo', texto: 'DAVID SACKETT. Definiu a medicina baseada em evidências como a melhor evidência atual, a perícia de quem cuida e a vontade de quem é cuidado, juntas. Nenhuma das três decide sozinha.' },
  { id: 'altman', nome: 'DOUG ALTMAN', anos: '1948 · 2018', cabelo: 'curto', texto: 'DOUG ALTMAN. Chamou de escândalo o tanto de pesquisa mal feita e mal relatada, e ajudou a criar as listas que dizem o que um estudo precisa contar para ser julgado.' },
];
/** arco ao redor da fonte, com abertura nos corredores dos arcos leste e oeste */
const MESTRES_POS: Array<[number, number]> = [[-10, -10], [-14, -6], [-14, 6], [-10, 10], [10, 10], [14, 6], [14, -6], [10, -10]];

/**
 * Pátio dos Caminhos · hub (Atlas E-01, E-04, E-11, E-13, E-14).
 * Fonte central, dois grandes arcos legíveis (oeste e leste), escadaria monumental
 * ao norte e a Academia como marco distante. O beco de tijolo fica ao sul.
 * x cresce para leste, z cresce para sul.
 */
export function buildAtrio(ctx: RegionCtx): BuiltRegion {
  const b = new RegionBuilder();
  const dawn = ctx.flags.has('epilogo');
  const act2 = ctx.flags.has('ponte_aberta');
  const env = dawn ? ENV.atrioAmanhecer : act2 ? ENV.atrioEntardecer : ENV.atrioNoiteChuva;
  const r = emptyRegion('atrio', 'Pátio dos Caminhos', 'Onde os caminhos se cruzam', b, env);
  r.music = 'atrio';
  r.bounds = { minX: -34, maxX: 34, minZ: -34, maxZ: 46 };

  // chão
  const floor = new THREE.PlaneGeometry(150, 150);
  b.add(floor, dawn ? M.cobbleDry : M.cobble, trs(0, 0, 0, 0, -Math.PI / 2), false, false);
  // anel de lajes ao redor da fonte
  b.add(new THREE.RingGeometry(3.6, 6.2, 40), M.flag, trs(0, 0.02, 0, 0, -Math.PI / 2), false, false);
  b.add(new THREE.RingGeometry(6.2, 6.5, 40), M.carved, trs(0, 0.025, 0, 0, -Math.PI / 2), false, false);

  K.fountain(b, 0, 0);

  // ---------- norte: escadaria monumental, terraço e Academia ----------
  const TH = 3.2;
  K.stairs(b, 0, -13, 0, 10, 16, 0.2, 0.5, 0);
  b.box(M.stone, 30, TH, 9, 0, 0, -25.5, 0, true);
  b.add(new THREE.PlaneGeometry(30, 9), M.flag, trs(0, TH + 0.01, -25.5, 0, -Math.PI / 2), false, false);
  b.platform(0, -25.5, 15, 4.5, 0, TH);
  // balaustrada do terraço (aberta na escada)
  for (const sgn of [-1, 1]) {
    const cx = sgn * 10.25;
    b.box(M.stoneDark, 9.5, 1.0, 0.44, cx, TH, -21.2, 0);
    b.add(new THREE.BoxGeometry(9.7, 0.2, 0.6), M.carved, trs(cx, TH + 1.08, -21.2));
    b.collideBox(cx, -21.2, 4.75, 0.3, 0, TH - 0.5, TH + 1.4);
    b.collideBox(sgn * 15.1, -25.5, 0.3, 4.5, 0, TH - 0.5, TH + 1.4);
    b.box(M.stoneDark, 0.44, 1.0, 9, sgn * 15.0, TH, -25.5, 0);
    K.pinnacle(b, sgn * 5.6, TH, -21.2, 0.7, 3.0, M.stoneDark);
    K.pinnacle(b, sgn * 15, TH, -21.2, 0.7, 3.0, M.stoneDark);
    K.bust(b, sgn * 8.5, -27.6, 0, TH);
    K.lampPost(b, sgn * 6.4, -23.0, 3.4, TH, 1);
  }
  // corpo da Academia
  // o centro da fachada fica livre: ali estão o portal e a janela grande (antes, um contraforte caía no meio do portal
  // e janelas da fachada apareciam por baixo do arco e atrás dos estandartes)
  K.building(b, 0, -37, 0, 34, 22, 14, { floors: 3, bays: 8, windowW: 1.5, windowH: 4.4, lit: 0.55, mat: M.stoneDark, buttresses: true, seed: 5, roof: 'gable', gap: 4.6 });
  // portal principal com portas de madeira (entrada do Observatório)
  K.archWall(b, 0, -29.6, 0, 9, 9.5, 1.2, 4.6, 4.2, M.stone, TH, false);
  const doorScan = b.place('large_castle_door', 0, TH, -29.85, 0, { size: 4.7, fit: 'w', collide: false });
  if (doorScan) b.box(M.woodDark, 4.6, 8.2, 0.2, 0, TH, -30.1, 0);
  else b.box(M.woodDark, 4.6, 8.2, 0.3, 0, TH, -29.9, 0);
  for (const sgn of [-1, 1]) {
    if (!doorScan) {
      b.add(new THREE.BoxGeometry(0.1, 7.4, 0.36), M.iron, trs(sgn * 0.02, TH + 3.7, -29.86));
      for (const yy of [1.2, 3.4, 5.4]) b.add(new THREE.BoxGeometry(2.0, 0.12, 0.36), M.iron, trs(sgn * 1.2, TH + yy, -29.86));
    }
    K.wallLantern(b, sgn * 3.6, TH + 3.6, -29.0, 0);
  }
  K.gothicWindow(b, 0, 14.2, -29.96, 0, 4.2, 7.2, true);
  b.collideBox(0, -29.9, 2.4, 0.4, 0, TH - 1, TH + 9, 'porta_observatorio');
  // torres da Academia: marco vertical (ref. 02 e 03)
  K.spireTower(b, -13, -33, 6.5, 30, 18, 0, 0, true);
  K.spireTower(b, 13, -33, 6.5, 30, 18, 0, 0, true);
  K.spireTower(b, 0, -47, 9, 44, 26, 0, 0, false);
  K.spireTower(b, -24, -44, 5, 26, 14, 0, 0.3, false);
  K.spireTower(b, 25, -45, 5, 28, 15, 0, -0.2, false);

  // ---------- oeste: grande arco do Arquivo ----------
  K.archWall(b, -23, 0, Math.PI / 2, 15, 13, 3, 5.6, 4.6, M.stone);
  K.plaque(b, 'ΓΝΩΘΙ ΣΑΥΤΟΝ', -21.42, 11.2, 0, Math.PI / 2, 7.2, 0.9, '#cdb98e');
  K.building(b, -30, -13.5, Math.PI / 2, 12, 15, 12, { floors: 2, bays: 3, lit: 0.6, mat: M.stone, seed: 11, buttresses: true });
  K.building(b, -30, 13.5, Math.PI / 2, 12, 13, 12, { floors: 2, bays: 3, lit: 0.5, mat: M.stoneDark, seed: 12, buttresses: true });
  // passagem do arco até a porta do Arquivo
  b.box(M.stoneDark, 8, 11, 1.2, -28, 0, -4.6, 0, true);
  b.box(M.stoneDark, 8, 11, 1.2, -28, 0, 4.6, 0, true);
  b.box(M.stoneDark, 1, 11, 9, -32.5, 0, 0, 0, true);
  b.box(M.stoneDark, 9, 1, 10, -28, 10.5, 0, 0);
  K.archWall(b, -31.6, 0, Math.PI / 2, 8, 9, 0.8, 3.2, 3.2, M.stone, 0, false);
  if (!b.place('large_castle_door', -31.75, 0, 0, Math.PI / 2, { size: 3.3, fit: 'w', collide: false })) b.box(M.woodDark, 0.25, 6, 3.2, -31.9, 0, 0, 0);
  else b.box(M.woodDark, 0.2, 6, 3.2, -32.05, 0, 0, 0);
  K.wallLantern(b, -27, 3.3, -3.95, 0);
  K.wallLantern(b, -27, 3.3, 3.95, Math.PI);

  // ---------- leste: grande arco do Bosque ----------
  K.archWall(b, 23, 0, -Math.PI / 2, 15, 13, 3, 5.6, 4.6, M.stone);
  K.plaque(b, 'ΚΟΙΝΑ ΤΑ ΦΙΛΩΝ', 21.42, 11.2, 0, -Math.PI / 2, 7.2, 0.9, '#cdb98e');
  K.building(b, 30, -13.5, -Math.PI / 2, 12, 14, 12, { floors: 2, bays: 3, lit: 0.5, mat: M.stoneDark, seed: 13, buttresses: true });
  K.building(b, 30, 13.5, -Math.PI / 2, 12, 16, 12, { floors: 3, bays: 3, lit: 0.6, mat: M.stone, seed: 14, buttresses: true });
  // além do arco leste: caminho que desce para a ponte, com névoa esmeralda
  b.box(M.stoneDark, 10, 9, 1.2, 29, 0, -4.8, 0, true);
  b.box(M.stoneDark, 10, 9, 1.2, 29, 0, 4.8, 0, true);
  b.collideBox(34.6, 0, 0.5, 5, 0, -1, 9);
  K.tree(b, 31, -2.6, 8, 41, M.leaves, 0.3);
  K.tree(b, 32.5, 2.4, 9, 42, M.leaves, 0.34);

  // cantos: torres redondas
  K.tower(b, -22.5, -21.5, 3.4, 20, 9, M.stoneDark);
  K.tower(b, 22.5, -21.5, 3.4, 22, 10, M.stoneDark);

  // ---------- sul: muro e beco de tijolo (ref. 05) ----------
  K.archWall(b, 0, 23, 0, 12, 10, 2.4, 4.6, 3.2, M.brick);
  K.building(b, -14.5, 28.5, Math.PI, 17, 12, 11, { floors: 2, bays: 4, lit: 0.5, mat: M.brick, seed: 21, roof: 'gable' });
  K.building(b, 14.5, 28.5, Math.PI, 17, 13, 11, { floors: 2, bays: 4, lit: 0.6, mat: M.brick, seed: 22, roof: 'gable' });
  K.tower(b, -22.5, 23, 3.0, 16, 8, M.brick, true);
  K.tower(b, 22.5, 23, 3.0, 17, 8, M.brick, true);
  // beco
  K.building(b, -7.5, 37, Math.PI / 2, 14, 11, 8, { floors: 2, bays: 3, lit: 0.7, mat: M.brick, seed: 23, roof: 'flat', windowH: 2.6 });
  K.building(b, 7.5, 37, -Math.PI / 2, 14, 12, 8, { floors: 2, bays: 3, lit: 0.6, mat: M.brick, seed: 24, roof: 'flat', windowH: 2.6 });
  K.archWall(b, 0, 44.6, 0, 7, 8, 1.2, 3.0, 2.6, M.brick, 0, true);
  // portão de ferro fechado: saída para a área de membros
  if (!b.place('large_iron_gate', 0, 0, 44.6, Math.PI, { size: 3.05, fit: 'w', collide: false })) {
    for (let i = -5; i <= 5; i++) b.add(new THREE.CylinderGeometry(0.03, 0.03, 4.6, 14), M.iron, trs(i * 0.27, 2.3, 44.6));
    b.add(new THREE.BoxGeometry(3.0, 0.1, 0.1), M.iron, trs(0, 1.1, 44.6));
    b.add(new THREE.BoxGeometry(3.0, 0.1, 0.1), M.iron, trs(0, 3.4, 44.6));
  }
  b.collideBox(0, 44.6, 1.6, 0.3, 0, -1, 6, 'portao_sul');
  K.lampPost(b, -2.7, 30, 3.4);
  K.lampPost(b, 2.7, 38, 3.4);
  K.wallLantern(b, -3.48, 3.0, 40.5, Math.PI / 2);
  // banca da artesã
  b.box(M.woodDark, 2.6, 0.9, 1.0, 2.6, 0, 33.2, 0, true);
  b.add(new THREE.BoxGeometry(3.0, 0.08, 1.6), M.wine, trs(2.6, 2.5, 33.2, 0, 0.12));
  for (const sx of [-1.3, 1.3]) b.add(new THREE.CylinderGeometry(0.04, 0.04, 2.5, 16), M.woodDark, trs(2.6 + sx, 1.25, 33.6));
  K.candle(b, 2.0, 0.9, 33.2, true);
  // mercadoria da artesã: lâminas e ferramentas de verdade, deitadas na banca
  b.place('antique_estoc', 2.95, 0.9, 33.0, 0.08, { tilt: -Math.PI / 2, collide: false });
  b.place('wooden_handle_saber', 2.7, 0.9, 33.45, -0.1, { tilt: -Math.PI / 2, roll: Math.PI / 2, collide: false });
  b.place('ornate_medieval_dagger', 1.55, 0.9, 33.35, 0.5, { tilt: -Math.PI / 2, collide: false });
  b.place('ornate_medieval_mace', 3.55, 0.9, 33.5, Math.PI / 2 - 0.3, { tilt: -Math.PI / 2, collide: false });
  b.place('pocket_watch', 2.25, 0.9, 33.55, 0.6, { tilt: -Math.PI / 2, collide: false });
  b.place('vintage_pocket_watch', 2.4, 0.9, 32.85, -0.4, { tilt: -Math.PI / 2, collide: false });
  b.place('ornate_war_hammer', 3.88, 0, 32.55, 0.3, { collide: false });
  b.place('wooden_axe', 1.15, 0, 32.6, -0.4, { roll: 0.32, collide: false });
  b.place('wooden_stool_01', 2.9, 0, 34.3, 0.4, { collide: 'circle' });
  K.crate(b, 3.2, 31.6, 0.7, 0.3);
  K.barrel(b, -3.0, 34.5);
  K.barrel(b, -2.9, 35.4);
  K.crate(b, -2.9, 42.4, 0.8, 0.1);
  // porta do consultório de Lia
  b.box(M.woodDark, 0.2, 2.6, 1.3, -3.45, 0, 37.5, 0);
  K.plaque(b, 'Sala de conversa', -3.3, 2.95, 37.5, Math.PI / 2, 1.5, 0.3, '#e7d8b4', '#2a1418', '500 80px "Source Serif 4", Georgia, serif');

  // ---------- pátio: luz, bancos, árvores, estandartes ----------
  for (const [lx, lz] of [
    [-8, -8],
    [8, -8],
    [-8, 8],
    [8, 8],
    [-17, 0.0],
    [17, 0.0],
    [0, 17],
  ] as Array<[number, number]>) {
    if (Math.abs(lx) === 17) {
      K.lampPost(b, lx, -4.6, 3.8);
      K.lampPost(b, lx, 4.6, 3.8);
    } else if (lz === 17) {
      K.lampPost(b, -4.4, 19.4, 3.6);
      K.lampPost(b, 4.4, 19.4, 3.6);
    } else K.lampPost(b, lx, lz, 3.8);
  }
  K.bench(b, -11.5, 6.5, Math.PI / 2);
  K.bench(b, 11.5, 6.5, Math.PI / 2);
  K.bench(b, -6, 14.5, 0.25);
  K.bench(b, 11.5, -6.5, Math.PI / 2);
  // canteiros com árvores
  const planter = (x: number, z: number, seed: number, autumn: boolean) => {
    b.add(new THREE.CylinderGeometry(1.7, 1.8, 0.5, 22), M.stoneDark, trs(x, 0.25, z), false);
    b.add(new THREE.CylinderGeometry(1.5, 1.5, 0.52, 22), M.ground, trs(x, 0.26, z), false);
    // jacarandá escaneado; na qualidade baixa fica a árvore procedural
    if (ctx.quality === 'baixa' || !b.place('jacaranda_tree', x, 0.5, z, seed * 1.3, { size: 10 + (seed % 3) * 0.8, collide: false }))
      K.tree(b, x, z, 8.5 + (seed % 3), seed, autumn ? M.leavesAutumn : M.leaves, 0.3);
    b.collideCircle(x, z, 1.8, -1, 1.2);
    K.bush(b, x + 0.9, z + 0.5, 0.9, M.ivy, 0.45);
    K.bush(b, x - 0.8, z - 0.6, 0.8, M.ivy, 0.45);
  };
  planter(-14.5, -13, 3, true);
  planter(14.5, -13, 4, false);
  planter(-14.5, 14.5, 5, false);
  planter(14.5, 14.5, 6, true);
  // estátuas ao pé da escadaria e floreiras junto aos arcos
  for (const sgn of [-1, 1]) {
    b.box(M.stoneDark, 1.9, 0.9, 1.9, sgn * 6.9, 0, -3.9, 0, true);
    b.add(new THREE.BoxGeometry(2.04, 0.12, 2.04), M.carved, trs(sgn * 6.9, 0.96, -3.9));
    b.place('gothic_statue', sgn * 6.9, 1.02, -3.9, sgn * -0.25, { size: 2.5, collide: false });
    for (const zz of [-9.6, 9.6]) {
      if (b.place('planter_box_03', sgn * 19.6, 0, zz, Math.PI / 2, { size: 1.6, fit: 'w' })) {
        for (let k = 0; k < 3; k++) b.place('grass_medium_01', sgn * 19.6, 0.7, zz - 0.45 + k * 0.45, k * 2.1, { part: `grass_medium_01_geonodes_mid_${'abc'[k]}_LOD1`, size: 0.5, collide: false });
      }
    }
  }
  // barris e caixotes junto ao muro do beco
  b.place('wooden_barrels_01', -17.5, 0, 19.6, 0.2, { size: 4.0, fit: 'w', pad: -0.4 });

  // hera e estandartes nos grandes arcos
  K.ivy(b, -21.45, 0, -5.4, Math.PI / 2, 4, 9, 2);
  K.ivy(b, -21.45, 0, 5.6, Math.PI / 2, 3.4, 7, 3);
  K.ivy(b, 21.45, 0, -5.4, -Math.PI / 2, 3.6, 8, 4);
  K.ivy(b, 21.45, 0, 5.6, -Math.PI / 2, 4, 9.5, 5);
  K.ivy(b, -4.4, 0, 21.75, Math.PI, 3, 6, 6);
  K.ivy(b, -12, 0, -20.95, 0, 5, 3, 8);
  K.banner(b, -21.3, 9.4, -5.6, Math.PI / 2);
  K.banner(b, -21.3, 9.4, 5.6, Math.PI / 2);
  K.banner(b, 21.3, 9.4, -5.6, -Math.PI / 2);
  K.banner(b, 21.3, 9.4, 5.6, -Math.PI / 2);
  // estandartes nos pilares do próprio portal, sem janela atrás
  K.banner(b, -3.72, TH + 9.1, -28.86, 0, 1.3, 3.6);
  K.banner(b, 3.72, TH + 9.1, -28.86, 0, 1.3, 3.6);

  // quadro de missões e casos (Atlas O-01)
  b.box(M.woodDark, 2.6, 2.0, 0.14, 7.4, 0.9, 12.6, -0.5, false);
  // os postes ficam nas pontas da tábua, ao longo do eixo girado dela
  b.box(M.woodDark, 0.16, 3.0, 0.16, 6.26, 0, 11.98, -0.5);
  b.box(M.woodDark, 0.16, 3.0, 0.16, 8.54, 0, 13.22, -0.5);
  b.box(M.woodDark, 2.9, 0.12, 0.22, 7.4, 2.9, 12.6, -0.5);
  for (const [px, py] of [
    [-0.7, 2.2],
    [0.1, 2.35],
    [0.75, 2.1],
    [-0.3, 1.5],
    [0.55, 1.45],
  ]) {
    const c = Math.cos(-0.5);
    const s = Math.sin(-0.5);
    b.add(new THREE.PlaneGeometry(0.5, 0.62), M.parchment, trs(7.4 + px * c + 0.08 * s, py, 12.6 - px * s + 0.08 * c, -0.5, 0, (px * 0.3) % 0.2));
  }
  b.collideBox(7.4, 12.6, 1.3, 0.2, -0.5, -1, 3);
  K.lantern(b, 7.4, 3.2, 12.6, 0.3, 0.6, true);

  // Passeio dos Mestres: oito bustos em arco, com uma abertura em cada corredor dos arcos
  const mestres = MESTRES_PATIO;
  mestres.forEach((m, i) => {
    const [mx, mz] = MESTRES_POS[i];
    K.bust(b, mx, mz, Math.atan2(-mx, -mz), 0, { name: m.nome, years: m.anos }, m.cabelo);
  });

  // marco de descanso junto à fonte (ponto de salvamento, Atlas E-21)
  b.add(new THREE.CylinderGeometry(0.34, 0.42, 1.0, 22), M.carved, trs(-5.2, 0.5, 5.2), false);
  b.add(new THREE.CylinderGeometry(0.46, 0.34, 0.14, 22), M.bronze, trs(-5.2, 1.06, 5.2), false);
  K.candle(b, -5.2, 1.13, 5.2, false);
  b.collideCircle(-5.2, 5.2, 0.45, -1, 1.3);

  // silhuetas distantes na bruma
  K.spireTower(b, -58, -62, 9, 40, 24, 0, 0.4, false);
  K.spireTower(b, 60, -70, 10, 46, 28, 0, 0.1, false);
  K.tower(b, 48, -40, 5, 30, 14, M.stoneDark, true);
  K.tower(b, -46, -36, 4.5, 26, 12, M.stoneDark, true);
  K.building(b, -52, 6, Math.PI / 2, 26, 18, 12, { floors: 3, bays: 6, lit: 0.35, mat: M.stoneDark, seed: 31 });
  K.building(b, 52, 8, -Math.PI / 2, 26, 20, 12, { floors: 3, bays: 6, lit: 0.35, mat: M.stoneDark, seed: 32 });

  // limites invisíveis
  b.collideBox(0, -30.4, 30, 0.5, 0, -1, 40);
  b.collideBox(-21.6, -17, 0.6, 5, 0, -1, 30);
  b.collideBox(21.6, -17, 0.6, 5, 0, -1, 30);

  // cidade ao longe: telhados, torres e agulhas além dos muros, para o olhar ter onde pousar
  K.skyline(b, 0, 0, 62, 120, { count: 46, color: 0x151b27, seed: 31, minH: 14, maxH: 42, y0: -1 });
  K.skyline(b, 0, 0, 150, 220, { count: 30, color: 0x1b2232, seed: 77, minH: 26, maxH: 70, y0: -4, windows: 0.15 });
  b.finalize();

  r.spawns = {
    inicio: { x: 0, z: 17.5, yaw: Math.PI },
    de_bosque: { x: 18.5, z: 0, yaw: -Math.PI / 2 },
    de_arquivo: { x: -18.5, z: 0, yaw: Math.PI / 2 },
    de_observatorio: { x: 0, z: -26.5, yaw: 0, y: TH },
    descanso: { x: -4.4, z: 6.4, yaw: Math.PI * 0.75 },
  };
  r.npcs = [
    { id: 'heloisa', x: 2.6, z: 7.6, yaw: 0.15 },
    { id: 'iris', x: 15.6, z: 2.6, yaw: -Math.PI / 2 - 0.3 },
    { id: 'anselmo', x: -15.8, z: -2.4, yaw: Math.PI / 2 + 0.25 },
    { id: 'dalva', x: 2.6, z: 34.4, yaw: Math.PI },
    { id: 'lia', x: -10.6, z: 6.5, yaw: Math.PI / 2 },
    { id: 'noemia', x: 10.6, z: -6.5, yaw: -Math.PI / 2 },
    { id: 'tome', x: -13.0, z: 12.6, yaw: 0.8 },
    // moradores do elenco PS2
    { id: 'custodia', x: -4.5, z: 30.5, yaw: 0.4 },
    { id: 'amelia', x: 7.5, z: 30.5, yaw: -0.6 },
    { id: 'dito', x: -5.5, z: 14.5, yaw: 2.6 },
    { id: 'vera', x: 13.0, z: 13.5, yaw: -2.4 },
  ];
  r.props = [
    { id: 'portal_bosque', kind: 'portal', x: 30.5, z: 0, label: 'Seguir para o Bosque da Confusão', radius: 3.4, data: { to: 'bosque', spawn: 'de_atrio' } },
    { id: 'portal_arquivo', kind: 'portal', x: -30.4, z: 0, label: 'Entrar no Arquivo das Perguntas', radius: 2.6, data: { to: 'arquivo', spawn: 'de_atrio', requires: 'chave_arquivo', lockedMsg: 'A porta do Arquivo está trancada por dentro. Anselmo tem a chave.' } },
    { id: 'portal_observatorio', kind: 'portal', x: 0, z: -28.6, y: TH, label: 'Subir ao Observatório do Acaso', radius: 2.4, data: { to: 'observatorio', spawn: 'de_atrio', requires: 'arquivo_concluido', lockedMsg: 'As portas da Academia não cedem. Algo lá em cima ainda não quer visita.' } },
    { id: 'quadro_atrio', kind: 'board', x: 7.0, z: 12.0, label: 'Ler o quadro de casos', radius: 2.2 },
    { id: 'descanso_atrio', kind: 'rest', x: -5.2, z: 5.2, label: 'Descansar e registrar o caminho', radius: 1.8 },
    { id: 'portao_sul', kind: 'examine', x: 0, z: 43.4, label: 'Examinar o portão', radius: 2.0, data: { text: 'O portão dá para a área de membros. Do lado de lá, os corredores de Estudar e Comunidade seguem como sempre.' } },
    { id: 'fonte_atrio', kind: 'examine', x: 0, z: 4.6, label: 'Examinar a esfera armilar', radius: 1.6, data: { text: 'Os anéis de bronze nunca se alinham por muito tempo. Na borda, alguém gravou: "medir é escolher o que deixar de fora".' } },
    { id: 'pagina_1', kind: 'page', x: -19.2, z: -18.6, label: 'Recolher a página solta', radius: 1.6, data: { page: 'pergunta' } },
    { id: 'pagina_2', kind: 'page', x: 3.0, z: 42.6, label: 'Recolher a página solta', radius: 1.6, data: { page: 'acaso' } },
    { id: 'pagina_3', kind: 'page', x: -12.6, z: -27.4, y: TH, label: 'Recolher a página solta', radius: 1.6, data: { page: 'absoluto' } },
    { id: 'moedas_atrio_1', kind: 'pickup', x: 19.0, z: 19.6, label: 'Pegar moedas', data: { item: 'moedas', qty: 12 } },
    { id: 'moedas_atrio_2', kind: 'pickup', x: 12.2, z: -27.2, y: TH, label: 'Pegar moedas', data: { item: 'moedas', qty: 15 } },
    { id: 'caldo_atrio', kind: 'pickup', x: -2.4, z: 40.2, label: 'Pegar o caldo', data: { item: 'caldo', qty: 1 } },
    { id: 'vento_terraco', kind: 'examine', x: 13.4, z: -22.6, y: TH, label: 'Examinar os estandartes', radius: 2.2, data: { text: 'O canto leste do terraço fica à sombra da torre. Os estandartes daqui pendem parados, com poeira antiga nas dobras. Deste lado, o vento não chega.' } },
    ...mestres.map((m, i) => ({ id: 'mestre_' + m.id, kind: 'examine' as const, x: MESTRES_POS[i][0], z: MESTRES_POS[i][1], label: `Ler a placa de ${m.nome}`, radius: 2.0, data: { text: m.texto, codex: m.id, xp: 10, mestre: true } })),
    { id: 'vento_beco', kind: 'examine', x: -2.6, z: 41.2, label: 'Examinar as velas do beco', radius: 2.0, data: { text: 'O beco corre de norte a sul entre dois paredões. Mesmo agora passa uma corrente de ar constante, e a cera das velas escorreu toda para o lado sul.' } },
  ];
  r.mapPoints = [
    { x: 0, z: 0, label: 'Fonte armilar', kind: 'poi' },
    { x: 23, z: 0, label: 'Arco do Bosque', kind: 'portal' },
    { x: -23, z: 0, label: 'Arco do Arquivo', kind: 'portal' },
    { x: 0, z: -29, label: 'Academia · Observatório', kind: 'portal' },
    { x: 0, z: 34, label: 'Beco dos Ofícios', kind: 'poi' },
    { x: 7.4, z: 12.6, label: 'Quadro de casos', kind: 'poi' },
  ];
  return r;
}
