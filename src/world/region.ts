import * as THREE from 'three';
import type { Collider, LampSpec, Platform } from './builder';
import { RegionBuilder } from './builder';
import type { EnvPreset } from '../core/engine';

export type RegionId = 'atrio' | 'bosque' | 'arquivo' | 'observatorio';

export interface Spawn {
  x: number;
  z: number;
  yaw: number;
  y?: number;
}

export interface NpcPlacement {
  id: string;
  x: number;
  z: number;
  yaw: number;
  y?: number;
}

export interface EnemyPlacement {
  kind: 'fiapo' | 'vulto' | 'eco' | 'veredito';
  x: number;
  z: number;
  y?: number;
  group: string;
  /** só nasce se a flag estiver presente / ausente */
  ifFlag?: string;
  unlessFlag?: string;
}

export interface PropPlacement {
  /** id único estável (vai para o save) */
  id: string;
  kind: 'pickup' | 'chest' | 'examine' | 'portal' | 'mechanism' | 'board' | 'lever' | 'rest' | 'page' | 'brazier' | 'door' | 'trail';
  x: number;
  z: number;
  y?: number;
  label: string;
  /** dados livres interpretados pelo jogo */
  data?: Record<string, string | number | boolean>;
  radius?: number;
  hidden?: boolean;
  object?: THREE.Object3D;
}

export interface BuiltRegion {
  id: RegionId;
  name: string;
  subtitle: string;
  root: THREE.Group;
  colliders: Collider[];
  platforms: Platform[];
  lamps: LampSpec[];
  updaters: Array<(dt: number, t: number) => void>;
  env: EnvPreset;
  spawns: Record<string, Spawn>;
  npcs: NpcPlacement[];
  enemies: EnemyPlacement[];
  props: PropPlacement[];
  /** altura do chão-base; null = sem chão fora das plataformas (queda) */
  baseGround: number | null;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  /** nomes de objetos dinâmicos que o jogo manipula (ponte, portas) */
  handles: Record<string, THREE.Object3D>;
  /** pontos de interesse desenhados no mapa */
  mapPoints: Array<{ x: number; z: number; label: string; kind: 'portal' | 'npc' | 'poi' }>;
  music: 'atrio' | 'bosque' | 'arquivo' | 'observatorio';
  /** animações e mudanças de estado próprias da região (ponte, portas, braseiros) */
  actions: Record<string, () => void>;
}

export interface RegionCtx {
  flags: Set<string>;
  quality: 'baixa' | 'media' | 'alta';
  /** pele de época (texturas de public/textures/ps2); falso na Aparência Limpa */
  ps2?: boolean;
}

export function emptyRegion(id: RegionId, name: string, subtitle: string, b: RegionBuilder, env: EnvPreset): BuiltRegion {
  return {
    id,
    name,
    subtitle,
    root: b.root,
    colliders: b.colliders,
    platforms: b.platforms,
    lamps: b.lamps,
    updaters: b.updaters,
    env,
    spawns: {},
    npcs: [],
    enemies: [],
    props: [],
    baseGround: 0,
    bounds: { minX: -60, maxX: 60, minZ: -60, maxZ: 60 },
    handles: {},
    mapPoints: [],
    music: 'atrio',
    actions: {},
  };
}

/** Altura do chão sob (x,z) considerando a altura atual (para escadas e pontes). */
export function groundAt(r: { platforms: Platform[]; baseGround: number | null }, x: number, z: number, y: number): number | null {
  let best: number | null = r.baseGround;
  for (const p of r.platforms) {
    const dx = x - p.x;
    const dz = z - p.z;
    const c = Math.cos(p.rot);
    const s = Math.sin(p.rot);
    const lx = dx * c - dz * s;
    const lz = dx * s + dz * c;
    if (Math.abs(lx) > p.hx || Math.abs(lz) > p.hz) continue;
    const t = (lz + p.hz) / (2 * p.hz);
    const h = p.h0 + (p.h1 - p.h0) * t;
    if (h <= y + 0.65 && (best === null || h > best)) best = h;
  }
  return best;
}

/** Empurra um círculo para fora dos colisores. Retorna posição corrigida. */
export function resolveCircle(colliders: Collider[], x: number, z: number, r: number, y: number, height = 1.7): { x: number; z: number; hit: boolean } {
  let hit = false;
  for (let iter = 0; iter < 2; iter++) {
    for (const c of colliders) {
      if (y + 0.35 > c.yMax || y + height < c.yMin) continue;
      if (c.kind === 'circle') {
        const dx = x - c.x;
        const dz = z - c.z;
        const d = Math.hypot(dx, dz);
        const min = r + c.r;
        if (d < min && d > 1e-5) {
          x = c.x + (dx / d) * min;
          z = c.z + (dz / d) * min;
          hit = true;
        }
      } else {
        const dx = x - c.x;
        const dz = z - c.z;
        const cs = Math.cos(c.rot);
        const sn = Math.sin(c.rot);
        const lx = dx * cs - dz * sn;
        const lz = dx * sn + dz * cs;
        const qx = Math.max(-c.hx, Math.min(c.hx, lx));
        const qz = Math.max(-c.hz, Math.min(c.hz, lz));
        let ox = lx - qx;
        let oz = lz - qz;
        const d = Math.hypot(ox, oz);
        if (d < r) {
          let nlx: number;
          let nlz: number;
          if (d > 1e-5) {
            nlx = qx + (ox / d) * r;
            nlz = qz + (oz / d) * r;
          } else {
            // centro dentro da caixa: sair pela face mais próxima
            const px = c.hx - Math.abs(lx);
            const pz = c.hz - Math.abs(lz);
            if (px < pz) {
              nlx = Math.sign(lx || 1) * (c.hx + r);
              nlz = lz;
            } else {
              nlx = lx;
              nlz = Math.sign(lz || 1) * (c.hz + r);
            }
            ox = oz = 0;
          }
          x = c.x + nlx * cs + nlz * sn;
          z = c.z - nlx * sn + nlz * cs;
          hit = true;
        }
      }
    }
  }
  return { x, z, hit };
}

/** O ponto está dentro de algum colisor alto? (colisão da câmera) */
export function pointBlocked(colliders: Collider[], x: number, y: number, z: number, pad = 0.25): boolean {
  for (const c of colliders) {
    if (y > c.yMax || y < c.yMin) continue;
    if (c.yMax - c.yMin < 2.2) continue; // obstáculos baixos não bloqueiam a câmera
    if (c.kind === 'circle') {
      if (c.r < 0.5) continue;
      if (Math.hypot(x - c.x, z - c.z) < c.r + pad) return true;
    } else {
      const dx = x - c.x;
      const dz = z - c.z;
      const cs = Math.cos(c.rot);
      const sn = Math.sin(c.rot);
      const lx = dx * cs - dz * sn;
      const lz = dx * sn + dz * cs;
      if (Math.abs(lx) < c.hx + pad && Math.abs(lz) < c.hz + pad) return true;
    }
  }
  return false;
}
