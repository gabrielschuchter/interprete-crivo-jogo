/**
 * Pele de época das regiões (direção "Luz de estudo", docs/game/DIRECAO_DE_ARTE_PS2.md, seções 5, 9 e 11).
 *
 * Os materiais do kit são compartilhados entre regiões (M.flag, M.stone...). Em vez de duplicar a montagem de
 * cada região, a troca é feita depois de montar: cada malha cujo material tem um nome da tabela da região recebe
 * a variante com a textura pequena de public/textures/ps2. Os pisos de paralelepípedo, que puxavam a imagem para
 * o marrom, ficam na matiz da região: ardósia no Pátio e no Observatório, musgo no Bosque, madeira no Arquivo.
 */
import * as THREE from 'three';
import { ps2Tex } from '../core/assets';
import type { RegionId } from './region';

interface Skin {
  /** arquivo em public/textures/ps2, sem extensão */
  file: string;
  /** lado do ladrilho em metros */
  tile: number;
  /** multiplica a textura; o padrão preserva o brilho relativo do material original */
  tint?: number;
}

const SKINS: Record<RegionId, Record<string, Skin>> = {
  atrio: {
    flag: { file: 'piso_ardosia', tile: 3 },
    cobble: { file: 'piso_estrada_ardosia', tile: 2.4 },
    cobbleDry: { file: 'piso_estrada_ardosia', tile: 2.4 },
    road: { file: 'piso_estrada_ardosia', tile: 3 },
    stone: { file: 'parede_ardosia', tile: 3.2 },
    stoneDark: { file: 'parede_ardosia', tile: 2.8, tint: 0x8a8890 },
  },
  bosque: {
    ground: { file: 'terra_musgo', tile: 3 },
    flag: { file: 'piso_musgo', tile: 3 },
    cobble: { file: 'piso_musgo', tile: 2.4 },
    cobbleDry: { file: 'piso_musgo', tile: 2.4 },
    road: { file: 'piso_musgo', tile: 3 },
    stone: { file: 'parede_musgo', tile: 3.2 },
    stoneDark: { file: 'parede_musgo', tile: 2.8, tint: 0x8a8a84 },
  },
  arquivo: {
    flag: { file: 'piso_madeira', tile: 2 },
    wood: { file: 'piso_madeira', tile: 1.6, tint: 0xd8c8b8 },
  },
  observatorio: {
    flag: { file: 'piso_ardosia', tile: 3 },
    cobble: { file: 'piso_estrada_ardosia', tile: 2.4 },
    stone: { file: 'parede_ardosia', tile: 3.2 },
    stoneDark: { file: 'parede_ardosia', tile: 2.8, tint: 0x8a8890 },
  },
};

const cache = new Map<string, THREE.MeshStandardMaterial>();

function variant(base: THREE.MeshStandardMaterial, skin: Skin): THREE.MeshStandardMaterial {
  const key = `${base.name}@${skin.file}@${skin.tile}@${skin.tint ?? ''}`;
  let m = cache.get(key);
  if (!m) {
    // sem mapa de normal nem de rugosidade: o relevo da era vem pintado na cor
    m = new THREE.MeshStandardMaterial({ map: ps2Tex(skin.file, 1 / skin.tile), color: skin.tint ?? 0xffffff, roughness: 0.92, metalness: 0, envMapIntensity: 0.35 });
    m.name = key;
    cache.set(key, m);
  }
  return m;
}

/** Troca, na região montada, os materiais da tabela pela variante de época. Devolve quantas malhas mudaram. */
export function applyPs2Skin(id: RegionId, root: THREE.Object3D): number {
  const table = SKINS[id];
  if (!table) return 0;
  let n = 0;
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const swap = (mat: THREE.Material): THREE.Material => {
      const skin = table[mat.name];
      if (!skin || !(mat as THREE.MeshStandardMaterial).isMeshStandardMaterial) return mat;
      n++;
      return variant(mat as THREE.MeshStandardMaterial, skin);
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(swap) : swap(mesh.material);
  });
  return n;
}
