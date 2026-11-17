import * as THREE from 'three';
import { RegionBuilder, trs } from './builder';
import { M } from './mats';
import * as K from './kit';
import { ENV } from './envs';
import { emptyRegion, type BuiltRegion, type RegionCtx } from './region';
import { carroca, gravura } from '../cine/cenarios';

/**
 * Estrada da Serra e portão de Pedra Alta · capítulo 1 (docs/game/CAPITULO_1.md).
 * A garganta da abertura (plano 3.4), agora no chão: a estrada de terra sobe para o norte (-z) entre paredões, da
 * carroça parada onde Caio caiu até o muro da cidade. Pedra Alta fica em degraus atrás do muro, com o aqueduto e o
 * Farol no alto. O jogador faz o trecho com o menino nas costas, então a estrada é estreita, sem buraco e sem pulo.
 * x cresce para leste, z para sul.
 */
export const ESTRADA = {
  /** onde a carroça parou */
  carroca: [2.6, 38] as [number, number],
  /** oratório de beira de estrada, com a gravura */
  oratorio: [0, 2] as [number, number],
  /** muro da cidade e a passagem dos professores */
  muro: -62,
  passagem: [5.2, -61.2] as [number, number],
  portao: [0, -61.2] as [number, number],
  guarda: [3.9, -59.6] as [number, number],
  /** a partir daqui o portão chama a cena */
  gatilho: -54,
};
/** centro da estrada em z: curva larga, como no plano 3.4 */
export const xEstrada = (z: number): number => Math.sin((40 - z) / 15) * 2.4;

export function buildEstrada(_ctx: RegionCtx): BuiltRegion {
  const b = new RegionBuilder();
  const r = emptyRegion('estrada', 'Estrada da Serra', 'A subida para Pedra Alta', b, ENV.estrada);
  r.music = 'atrio';
  r.bounds = { minX: -11, maxX: 11, minZ: -60.4, maxZ: 44 };

  // chão de serra e a estrada de terra batida em trechos
  b.add(new THREE.PlaneGeometry(90, 170), M.ground, trs(0, 0, -20, 0, -Math.PI / 2), false, false);
  for (let z = 44; z > -62; z -= 6) {
    const x = xEstrada(z - 3);
    const ang = Math.atan2(xEstrada(z - 6) - xEstrada(z), -6);
    b.box(M.road, 3.8, 0.04, 6.6, x, -0.02, z - 3, ang + Math.PI);
  }
  // paredões: rocha escura empilhada, mais alta conforme sobe
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) & 0xffff) / 0xffff;
  for (let i = 0; i < 18; i++) {
    for (const lado of [-1, 1]) {
      const z = 46 - i * 6.4 + rnd() * 2;
      const x = xEstrada(z) + lado * (8.5 + rnd() * 3);
      const h = 7 + rnd() * 9 + i * 0.5;
      b.add(new THREE.DodecahedronGeometry(1, 0), M.rock, trs(x + lado * 2.5, h * 0.3, z, rnd() * 3, rnd(), 0, 4 + rnd() * 3, h * 0.5, 4 + rnd() * 2.5));
      // pedras soltas no pé do paredão
      if (rnd() > 0.45) b.add(new THREE.DodecahedronGeometry(1, 0), M.rock, trs(x - lado * 1.2, 0.3, z + rnd() * 3, rnd() * 3, rnd(), 0, 0.6 + rnd() * 0.6, 0.5, 0.7));
    }
  }
  // os paredões seguram o jogador na faixa da estrada
  for (let z = 44; z > -60; z -= 8) {
    const x = xEstrada(z - 4);
    b.collideBox(x - 8.4, z - 4, 1, 4.4, 0, -1, 30);
    b.collideBox(x + 8.4, z - 4, 1, 4.4, 0, -1, 30);
  }
  // mato seco à beira da estrada
  for (let i = 0; i < 26; i++) {
    const z = 42 - i * 3.9;
    const lado = i % 2 ? 1 : -1;
    K.bush(b, xEstrada(z) + lado * (3.4 + rnd() * 2.4), z, 0.5 + rnd() * 0.5, M.ivy, 0);
  }

  // a carroça parada onde Caio caiu, com a mula; a mala dele vai no banco
  carroca(b, ESTRADA.carroca[0], ESTRADA.carroca[1], Math.PI + 0.12, false);
  b.box(M.woodDark, 0.7, 0.3, 0.45, ESTRADA.carroca[0] + 0.2, 0.95, ESTRADA.carroca[1] + 0.4);
  const mula = new THREE.MeshStandardMaterial({ color: 0x3a2e26, roughness: 0.95 });
  const [mx, mz] = [ESTRADA.carroca[0] - 0.3, ESTRADA.carroca[1] - 3.1];
  b.box(mula, 0.5, 0.7, 1.4, mx, 0.75, mz);
  b.box(mula, 0.3, 0.7, 0.3, mx, 1.2, mz - 0.6);
  b.box(mula, 0.26, 0.26, 0.6, mx, 1.75, mz - 0.8);
  for (const [lx, lz] of [[-0.18, -0.5], [0.18, -0.5], [-0.18, 0.5], [0.18, 0.5]]) b.box(mula, 0.1, 0.75, 0.1, mx + lx, 0, mz + lz);
  b.collideBox(ESTRADA.carroca[0], ESTRADA.carroca[1], 0.9, 1.5, 0.12, -1, 2);
  b.collideBox(mx, mz, 0.4, 0.9, 0, -1, 2);

  // oratório de beira de estrada: nicho de pedra com a gravura do Menino da Janela, velas e um pão
  {
    const [ox, oz] = ESTRADA.oratorio;
    const x = xEstrada(oz) + 3.6 + ox;
    b.box(M.stoneDark, 1.1, 1.0, 0.7, x, 0, oz, -Math.PI / 2, true);
    b.box(M.stone, 0.9, 1.1, 0.5, x + 0.1, 1.0, oz, -Math.PI / 2);
    K.gableRoof(b, x + 0.05, 2.1, oz, -Math.PI / 2, 1.1, 0.8, 0.4);
    const gm = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.52), new THREE.MeshStandardMaterial({ map: gravura(), roughness: 0.95 }));
    gm.position.set(x - 0.17, 1.55, oz);
    gm.rotation.y = -Math.PI / 2;
    b.dynamic(gm);
    K.candle(b, x - 0.35, 1.0, oz - 0.28, true);
    K.candle(b, x - 0.35, 1.0, oz + 0.25, false);
    K.candle(b, x - 0.3, 1.0, oz + 0.05, false);
    b.add(new THREE.SphereGeometry(0.08, 6, 4), new THREE.MeshStandardMaterial({ color: 0x8f6a3a, roughness: 1 }), trs(x - 0.38, 1.04, oz + 0.12, 0, 0, 0, 1.4, 0.7, 1));
  }

  // muro de Pedra Alta atravessando a garganta, com o portão grande fechado e a passagem dos professores
  const W = ESTRADA.muro;
  b.box(M.stoneDark, 12, 11, 3, -9, 0, W - 1.5, 0, true);
  b.box(M.stoneDark, 7, 11, 3, 10.5, 0, W - 1.5, 0, true);
  K.archWall(b, 0, W, 0, 6, 11, 3, 4.2, 4.6, M.stone);
  b.box(M.woodDark, 4.2, 6.6, 0.3, 0, 0, W - 0.6, 0, true);
  for (const yy of [1.2, 3.4, 5.4]) b.add(new THREE.BoxGeometry(4.0, 0.12, 0.12), M.iron, trs(0, yy, W - 0.42));
  // passagem dos professores: porta baixa no muro, com lanterna
  const [px, pz] = ESTRADA.passagem;
  b.box(M.stone, 2.0, 3.2, 0.4, px, 0, pz + 0.1, 0);
  const porta = new THREE.Group();
  porta.position.set(px - 0.55, 0, pz + 0.32);
  const folha = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.3, 0.08), M.wood);
  folha.position.set(0.55, 1.15, 0);
  folha.castShadow = true;
  porta.add(folha);
  b.dynamic(porta);
  r.handles.passagem = porta;
  K.wallLantern(b, px + 1.2, 2.9, pz + 0.4, 0);
  K.wallLantern(b, -3.4, 4.0, W + 0.1, 0);
  K.wallLantern(b, 3.4, 4.0, W + 0.1, 0);
  // ameias
  for (let i = -7; i <= 7; i++) if (Math.abs(i) > 1) b.box(M.stoneDark, 0.9, 0.9, 3.2, i * 1.9, 11, W - 1.5);
  b.collideBox(0, W - 1.4, 16, 1.6, 0, -1, 30);

  // Pedra Alta em degraus atrás do muro, na névoa: casas, o aqueduto e o Farol
  for (let k = 0; k < 6; k++) {
    for (let i = 0; i < 8; i++) {
      const x = -22 + i * 6.3 + (k % 2) * 3;
      K.building(b, x, W - 14 - k * 9, 0, 5.4, 5 + ((i + k) % 3), 5, { floors: 1, bays: 1, lit: 0.25, windowW: 0.9, windowH: 1.8, seed: k * 17 + i, roof: i % 2 ? 'gable' : 'flat', y0: 4 + k * 6.5 });
    }
    b.box(M.stoneDark, 56, 4 + k * 6.5, 6, 0, 0, W - 14 - k * 9);
  }
  for (let i = 0; i < 9; i++) b.box(M.stone, 1.4, 34, 2, -26 + i * 6.5, 0, W - 30);
  b.box(M.stone, 60, 3, 2.4, 0, 34, W - 30);
  K.spireTower(b, -8, W - 52, 6, 46, 20, 0, 0.2, false);
  b.add(new THREE.CylinderGeometry(3.5, 4.4, 30, 10), M.stoneDark, trs(9, 52, W - 78));
  b.add(new THREE.CylinderGeometry(4.8, 4.8, 5, 10), M.carved, trs(9, 69, W - 78));
  const lente = new THREE.Mesh(new THREE.SphereGeometry(3, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffe2a8, fog: false }));
  lente.position.set(9, 69, W - 78);
  b.dynamic(lente);
  K.skyline(b, 0, -60, 70, 130, { count: 30, color: 0x2a3040, seed: 9, minH: 18, maxH: 50, y0: 0 });

  b.finalize();

  r.spawns = {
    inicio: { x: xEstrada(35) + 0.6, z: 35, yaw: Math.PI },
    portao: { x: 3.2, z: -57, yaw: Math.PI },
  };
  r.npcs = [{ id: 'guarda', x: ESTRADA.guarda[0], z: ESTRADA.guarda[1], yaw: 0.2 }];
  r.extraModels = ['npc_09_orfao', 'npc_02_acendedora'];
  r.props = [
    { id: 'oratorio_estrada', kind: 'examine', x: xEstrada(ESTRADA.oratorio[1]) + 2.6, z: ESTRADA.oratorio[1], label: 'Olhar o oratório', radius: 1.8, data: { cap1: 'oratorio' } },
    { id: 'carroca_estrada', kind: 'examine', x: ESTRADA.carroca[0] - 1.2, z: ESTRADA.carroca[1] - 0.4, label: 'Olhar a carroça', radius: 1.8, data: { cap1: 'carroca' } },
  ];
  r.mapPoints = [
    { x: ESTRADA.carroca[0], z: ESTRADA.carroca[1], label: 'A carroça', kind: 'poi' },
    { x: xEstrada(2) + 3.6, z: 2, label: 'Oratório', kind: 'poi' },
    { x: ESTRADA.passagem[0], z: ESTRADA.passagem[1], label: 'Portão de Pedra Alta', kind: 'portal' },
  ];
  return r;
}
