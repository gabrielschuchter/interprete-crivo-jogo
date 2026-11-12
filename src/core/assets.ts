import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { report } from './diag';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

/**
 * Assets externos de alta resolução: modelos glTF (Poly Haven, MakeHuman), texturas PBR e HDRI.
 * Origem e licença de cada arquivo em docs/game/REGISTRO_DE_ASSETS.md.
 * Tudo é opcional: se um arquivo falta, o jogo segue com a versão procedural.
 */
const BASE = import.meta.env.BASE_URL;
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);

const gltfCache = new Map<string, Promise<GLTF | null>>();
const ready = new Map<string, GLTF>();

export function loadGltf(path: string): Promise<GLTF | null> {
  let p = gltfCache.get(path);
  if (!p) {
    p = loader
      .loadAsync(BASE + path)
      .then((g) => {
        fixMaterials(g.scene);
        g.scene.traverse((o) => {
          const me = o as THREE.Mesh;
          if (me.isMesh) me.geometry.userData.shared = true;
        });
        ready.set(path, g);
        return g;
      })
      .catch((err: unknown) => {
        // a falha não fica em cache: a próxima região ou a próxima abertura tentam de novo
        gltfCache.delete(path);
        report('modelo', path, String((err as Error)?.message ?? err).slice(0, 80));
        return null;
      });
    gltfCache.set(path, p);
  }
  return p;
}

/** Materiais exportados do Blender chegam com mistura alfa em tudo; aqui viram opacos ou recorte. */
export function fixMaterials(root: THREE.Object3D, character = false): void {
  root.traverse((o) => {
    const me = o as THREE.Mesh;
    if (!me.isMesh) return;
    me.castShadow = true;
    me.receiveShadow = true;
    const mats = Array.isArray(me.material) ? me.material : [me.material];
    for (const m of mats as THREE.MeshStandardMaterial[]) {
      const n = (m.name || me.name).toLowerCase();
      const fino = /hair|bob0|eyebrow|eyelash|braid|bun|ponytail|afro|short0|long0|grass|leaves|leaf|beard|glass_01_alpha|lantern_chandelier/.test(n);
      if (m.transparent || m.alphaTest > 0) {
        m.transparent = false;
        m.depthWrite = true;
        m.alphaTest = /leaves|leaf/.test(n) ? 0.3 : fino ? 0.45 : character ? 0 : 0.5;
        if (fino) m.alphaToCoverage = true;
      }
      // kit do forte: no Blender a cor vem de uma mistura por máscara; o glTF só levou a máscara.
      // Aqui a cor volta a ser a textura difusa do próprio kit, nas mesmas UVs do mapa normal.
      const forte = /^modular_fort_01_(wall|trim|plaster)/.exec(m.name || '');
      if (forte) {
        const t = texLoader.load(BASE + `textures/fort_${forte[1]}_diff.webp`);
        t.flipY = false;
        t.colorSpace = THREE.SRGBColorSpace;
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.anisotropy = 8;
        if (m.normalMap) t.channel = m.normalMap.channel;
        m.map = t;
        m.needsUpdate = true;
      }
      // cores por vértice dos kits Poly Haven são máscaras de mistura, não cor final
      if (!character) m.vertexColors = false;
      if (character) {
        m.metalness = 0;
        m.roughness = /body|skin/.test(n) ? 0.55 : /high-poly|eye/.test(n) ? 0.12 : 0.86;
      }
      if (fino) m.side = THREE.DoubleSide;
      // folhagem de árvore escaneada: recebe sombra, mas não projeta (custo alto no mapa de sombras)
      if (/jacaranda_tree_leaves/.test(n)) me.castShadow = false;
    }
  });
}

/** Instância de um modelo já carregado (síncrona). */
export function instance(path: string): THREE.Object3D | null {
  const g = ready.get(path);
  if (!g) return null;
  return g.scene.clone(true);
}

export function instanceSkinned(g: GLTF): THREE.Object3D {
  return cloneSkinned(g.scene);
}

export function getGltf(path: string): GLTF | null {
  return ready.get(path) ?? null;
}

export function isReady(path: string): boolean {
  return ready.has(path);
}

// ---------- props do cenário ----------
export const PROPS = [
  'antique_estoc', 'bark_debris_01', 'binder_notebook', 'chandelier_02', 'chandelier_03', 'classicconsole_01', 'classicnightstand_01',
  'coast_line_02', 'coast_rocks_01', 'coastal_cliff_01', 'gothic_coffee_table', 'gothic_statue', 'gothiccommode_01', 'grass_medium_01',
  'jacaranda_tree', 'lantern_chandelier_01', 'large_castle_door', 'large_iron_gate', 'machete', 'magnifying_glass_01', 'marble_bust_01',
  'modular_fort_01', 'namaqualand_boulder_02', 'ornate_medieval_dagger', 'ornate_medieval_mace', 'ornate_war_hammer', 'planter_box_03',
  'pocket_watch', 'root_cluster_01', 'root_cluster_02', 'schooldesk_01', 'side_table_tall_01', 'street_lamp_01', 'vintage_grandfather_clock_01',
  'vintage_pocket_watch', 'wooden_axe', 'wooden_barrels_01', 'wooden_crate_02', 'wooden_handle_saber', 'wooden_stool_01', 'woodenchair_01',
  'woodentable_03',
] as const;
export type PropName = (typeof PROPS)[number];

const propPath = (n: string): string => `models/props/${n}.glb`;

/** O que o Pátio e as peças comuns do kit usam: é o que precisa estar pronto antes do menu. */
export const PROPS_FIRST: readonly PropName[] = [
  'antique_estoc', 'gothic_statue', 'grass_medium_01', 'jacaranda_tree', 'large_castle_door', 'large_iron_gate', 'ornate_medieval_dagger',
  'ornate_medieval_mace', 'ornate_war_hammer', 'planter_box_03', 'pocket_watch', 'vintage_pocket_watch', 'wooden_axe', 'wooden_barrels_01',
  'wooden_handle_saber', 'wooden_stool_01', 'lantern_chandelier_01', 'marble_bust_01', 'street_lamp_01', 'wooden_crate_02',
];

/** Carrega todos os props. Chamado na abertura, com barra de progresso. */
export async function preloadProps(progress?: (f: number) => void, names: readonly string[] = PROPS): Promise<void> {
  let done = 0;
  await Promise.all(
    names.map((n) =>
      loadGltf(propPath(n)).then(() => {
        done++;
        progress?.(done / names.length);
      }),
    ),
  );
}

/**
 * Cópia de um prop. `part` escolhe um nó pelo nome (kits modulares como o forte).
 * O nó escolhido volta centrado em x/z na origem e apoiado em y = 0.
 */
export function prop(name: PropName, part?: string): THREE.Object3D | null {
  const g = ready.get(propPath(name));
  if (!g) {
    report('modelo', propPath(name), 'não carregado; o cenário usa a peça de reserva ou fica sem ela');
    return null;
  }
  let src: THREE.Object3D = g.scene;
  if (part) {
    const found = g.scene.getObjectByName(part);
    if (!found) {
      report('peça', `${name}:${part}`, 'nó ausente no kit');
      return null;
    }
    src = found;
  }
  const o = src.clone(true);
  // a translação do nó é só deslocamento (kit modular, quantização); a rotação é mantida
  o.position.set(0, 0, 0);
  o.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(o);
  const holder = new THREE.Group();
  o.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
  holder.add(o);
  holder.name = name + (part ? ':' + part : '');
  return holder;
}

/** Nomes das peças de um kit modular. */
export function propParts(name: PropName): string[] {
  const g = ready.get(propPath(name));
  if (!g) return [];
  return g.scene.children.map((c) => c.name);
}

// ---------- texturas PBR ----------
const texLoader = new THREE.TextureLoader();
const texCache = new Map<string, THREE.Texture>();

function tex(file: string, color: boolean, repeat: number): THREE.Texture {
  const key = file + '|' + repeat;
  let t = texCache.get(key);
  if (!t) {
    t = texLoader.load(BASE + 'textures/' + file);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = 8;
    t.repeat.set(repeat, repeat);
    texCache.set(key, t);
  }
  return t;
}

export interface PbrSet {
  map: THREE.Texture;
  normalMap: THREE.Texture;
  roughnessMap: THREE.Texture;
}

/** Conjunto Poly Haven: <nome>_diff, _nor (OpenGL), _rough em WebP. `repeat` = 1 / lado do ladrilho em metros. */
export function pbrSet(name: string, repeat: number): PbrSet {
  return { map: tex(`${name}_diff.webp`, true, repeat), normalMap: tex(`${name}_nor.webp`, false, repeat), roughnessMap: tex(`${name}_rough.webp`, false, repeat) };
}

// ---------- HDRI ----------
let hdri: Promise<THREE.DataTexture | null> | null = null;
export function loadHdri(): Promise<THREE.DataTexture | null> {
  hdri ??= new RGBELoader()
    .loadAsync(BASE + 'textures/zavelstein_2k.hdr')
    .then((t) => {
      t.mapping = THREE.EquirectangularReflectionMapping;
      return t;
    })
    .catch(() => null);
  return hdri;
}
