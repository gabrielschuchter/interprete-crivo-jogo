import * as THREE from 'three';
import { Figure, HAIRS, SKINS, type FigureOpts } from './figure';

export interface NpcDef {
  id: string;
  name: string;
  role: string;
  fig: FigureOpts;
}

/** Personagens fictícios. Nenhum representa pessoa real. */
export const NPCS: Record<string, NpcDef> = {
  heloisa: { id: 'heloisa', name: 'Heloísa Vértice', role: 'Guardiã do Átrio', fig: { skin: SKINS[2], hair: HAIRS[3], hairStyle: 'coque', coat: 0x3a1226, cape: 0x1a1418, scarf: 0xbd9a61, height: 1.74 } },
  iris: { id: 'iris', name: 'Íris', role: 'Mensageira', fig: { skin: SKINS[3], hair: HAIRS[0], hairStyle: 'curto', coat: 0x1f3d35, satchel: true, scarf: 0x8c1535, height: 1.66, build: 0.92 } },
  anselmo: { id: 'anselmo', name: 'Anselmo', role: 'Bibliotecário', fig: { skin: SKINS[1], hair: HAIRS[3], hairStyle: 'calvo', beard: true, coat: 0x4a3420, scarf: null, height: 1.78, build: 1.08 } },
  dalva: { id: 'dalva', name: 'Dalva', role: 'Artesã do beco', fig: { skin: SKINS[4], hair: HAIRS[0], hairStyle: 'coque', coat: 0x2b2b33, apron: 0x6b4a2a, height: 1.68, build: 1.06 } },
  lia: { id: 'lia', name: 'Lia', role: 'Sineira · personagem de caso simulado', fig: { skin: SKINS[1], hair: HAIRS[4], hairStyle: 'longo', coat: 0x1c2f45, scarf: 0xe7d8b4, height: 1.64, build: 0.94 } },
  noemia: { id: 'noemia', name: 'Noêmia', role: 'Vigia do terraço', fig: { skin: SKINS[0], hair: HAIRS[2], hairStyle: 'longo', coat: 0x3a2a4a, cape: 0x201a2a, height: 1.7 } },
  tome: { id: 'tome', name: 'Tomé', role: 'Acendedor de lampiões', fig: { skin: SKINS[2], hair: HAIRS[1], hairStyle: 'curto', hat: true, beard: true, coat: 0x2f2a22, height: 1.76, build: 1.04 } },
};

let markGeo: THREE.BufferGeometry | null = null;
let markMat: THREE.MeshBasicMaterial | null = null;

export class Npc {
  fig: Figure;
  pos = new THREE.Vector3();
  yaw: number;
  private homeYaw: number;
  marker: THREE.Mesh;
  talking = false;
  private t = Math.random() * 6;

  constructor(public def: NpcDef, x: number, y: number, z: number, yaw: number) {
    this.fig = new Figure(def.fig);
    this.pos.set(x, y, z);
    this.yaw = this.homeYaw = yaw;
    this.fig.root.position.copy(this.pos);
    this.fig.root.rotation.y = yaw;
    markGeo ??= new THREE.OctahedronGeometry(0.13);
    markMat ??= new THREE.MeshBasicMaterial({ color: new THREE.Color(0xe5a85f).multiplyScalar(1.8) });
    this.marker = new THREE.Mesh(markGeo, markMat);
    this.marker.position.set(0, this.fig.height + 0.5, 0);
    this.marker.scale.set(1, 1.5, 1);
    this.marker.visible = false;
    this.fig.root.add(this.marker);
  }

  update(dt: number, playerPos: THREE.Vector3): void {
    this.t += dt;
    const dx = playerPos.x - this.pos.x;
    const dz = playerPos.z - this.pos.z;
    const d = Math.hypot(dx, dz);
    const want = d < 5.5 || this.talking ? Math.atan2(dx, dz) : this.homeYaw;
    let dy = want - this.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    this.yaw += dy * Math.min(1, dt * 3.5);
    this.fig.root.rotation.y = this.yaw;
    if (this.talking && this.fig.action !== 'talk') this.fig.play('talk');
    if (!this.talking && this.fig.action === 'talk') this.fig.action = 'none';
    this.fig.speed = 0;
    this.fig.update(dt);
    this.marker.rotation.y = this.t * 1.6;
    this.marker.position.y = this.fig.height + 0.5 + Math.sin(this.t * 2.2) * 0.06;
  }
}
