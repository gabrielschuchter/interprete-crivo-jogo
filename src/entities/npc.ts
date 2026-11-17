import * as THREE from 'three';
import { Figure, HAIRS, SKINS, type Action, type FigureOpts } from './figure';
import { MORADORES } from '../content/moradores';

export interface NpcDef {
  id: string;
  name: string;
  role: string;
  fig: FigureOpts;
  /** chave do modelo no manifesto, quando difere do id */
  model?: string;
}

/** Personagens fictícios. Nenhum representa pessoa real. */
export const NPCS: Record<string, NpcDef> = {
  heloisa: { id: 'heloisa', name: 'Heloísa Vértice', role: 'Guardiã do Pátio', fig: { skin: SKINS[2], hair: HAIRS[3], hairStyle: 'coque', coat: 0x3a1226, cape: 0x1a1418, scarf: 0xbd9a61, height: 1.74 } },
  iris: { id: 'iris', name: 'Íris', role: 'Mensageira', fig: { skin: SKINS[3], hair: HAIRS[0], hairStyle: 'curto', coat: 0x1f3d35, satchel: true, scarf: 0x8c1535, height: 1.66, build: 0.92 } },
  anselmo: { id: 'anselmo', name: 'Anselmo', role: 'Bibliotecário', fig: { skin: SKINS[1], hair: HAIRS[3], hairStyle: 'calvo', beard: true, coat: 0x4a3420, scarf: null, height: 1.78, build: 1.08 } },
  dalva: { id: 'dalva', name: 'Dalva', role: 'Artesã do beco', fig: { skin: SKINS[4], hair: HAIRS[0], hairStyle: 'coque', coat: 0x2b2b33, apron: 0x6b4a2a, height: 1.68, build: 1.06 } },
  lia: { id: 'lia', name: 'Lia', role: 'Sineira · personagem de caso simulado', fig: { skin: SKINS[1], hair: HAIRS[4], hairStyle: 'longo', coat: 0x1c2f45, scarf: 0xe7d8b4, height: 1.64, build: 0.94 } },
  noemia: { id: 'noemia', name: 'Noêmia', role: 'Vigia do terraço', fig: { skin: SKINS[0], hair: HAIRS[2], hairStyle: 'longo', coat: 0x3a2a4a, cape: 0x201a2a, height: 1.7 } },
  tome: { id: 'tome', name: 'Tomé', role: 'Acendedor de lampiões', fig: { skin: SKINS[2], hair: HAIRS[1], hairStyle: 'curto', hat: true, beard: true, coat: 0x2f2a22, height: 1.76, build: 1.04 } },
};
// capítulo 1 (docs/game/CAPITULO_1.md): gente da estrada e da Academia, sobre os corpos do elenco PS2
const cap1 = (id: string, name: string, role: string, model: string, height: number, coat: number, hair?: number): NpcDef => ({
  id, name, role, model, fig: { skin: SKINS[1], hair: HAIRS[1], hairStyle: 'curto', coat, height, tintCoat: coat, tintHair: hair },
});
Object.assign(NPCS, {
  marta: cap1('marta', 'Marta', 'Lavadeira, romeira', 'npc_02_acendedora', 1.62, 0x3a2e24),
  guarda: cap1('guarda', 'O guarda do portão', 'Pedra Alta', 'npc_03_vigia', 1.84, 0x2a2a26),
  estudante_a: cap1('estudante_a', 'Estudante', 'Primeiro ano', 'npc_06_novico', 1.72, 0x2a1a22),
  estudante_b: cap1('estudante_b', 'Estudante', 'Primeiro ano', 'npc_12_acolita', 1.64, 0x1c2430),
  estudante_c: cap1('estudante_c', 'Estudante', 'Segundo ano', 'npc_06_novico', 1.78, 0x24181c, 0x3d2416),
  estudante_d: cap1('estudante_d', 'Estudante', 'Segundo ano', 'npc_07_herbalista', 1.66, 0x2a2a1c),
  estudante_e: cap1('estudante_e', 'Estudante', 'Primeiro ano', 'npc_08_cartografo', 1.76, 0x1a1a1e),
} satisfies Record<string, NpcDef>);
// moradores do elenco PS2: o corpo procedural só aparece se o modelo faltar
for (const m of Object.values(MORADORES)) {
  NPCS[m.id] = { id: m.id, name: m.nome, role: m.papel, model: m.modelo, fig: { skin: SKINS[1], hair: HAIRS[1], hairStyle: 'curto', coat: 0x2a2226, height: m.altura } };
}

let markGeo: THREE.BufferGeometry | null = null;
let markMat: THREE.MeshBasicMaterial | null = null;

export class Npc {
  fig: Figure;
  pos = new THREE.Vector3();
  yaw: number;
  private homeYaw: number;
  marker: THREE.Mesh;
  talking = false;
  private gestureCd = 3 + Math.random() * 6;
  private greeted = false;
  private t = Math.random() * 6;

  constructor(public def: NpcDef, x: number, y: number, z: number, yaw: number) {
    this.fig = new Figure({ ...def.fig, model: def.model ?? def.id });
    this.pos.set(x, y, z);
    this.yaw = this.homeYaw = yaw;
    this.fig.root.position.copy(this.pos);
    this.fig.root.rotation.y = yaw;
    markGeo ??= new THREE.OctahedronGeometry(0.13);
    markMat ??= new THREE.MeshBasicMaterial({ color: new THREE.Color(0xe5a85f).multiplyScalar(1.25) });
    this.marker = new THREE.Mesh(markGeo, markMat);
    this.marker.position.set(0, this.fig.height + 0.5, 0);
    this.marker.scale.set(1, 1.5, 1);
    this.marker.visible = false;
    this.fig.root.add(this.marker);
  }

  /** posição da câmera, atualizada pelo jogo a cada quadro */
  static cam = new THREE.Vector3(0, 1e3, 0);
  /** a interface ainda escreve a fala: a boca mexe só enquanto o texto corre */
  static typing = false;

  /** fala em curso nesta conversa (o morador fala; senão, escuta) */
  speaking = false;
  private lookP = new THREE.Vector3();
  private turning = false;

  /** para onde a pessoa anda (acompanhar o jogador na estrada); null = fica onde está */
  goal: THREE.Vector3 | null = null;
  goalSpeed = 1.6;
  /** altura do chão, para quem anda */
  ground: ((x: number, z: number, y: number) => number | null) | null = null;
  private walkV = 0;

  update(dt: number, playerPos: THREE.Vector3): void {
    this.t += dt;
    if (this.goal && !this.talking) {
      const gx = this.goal.x - this.pos.x;
      const gz = this.goal.z - this.pos.z;
      const gd = Math.hypot(gx, gz);
      // anda, aperta o passo se ficou para trás e para devagar perto do ponto
      const want = gd < 0.3 ? 0 : Math.min(this.goalSpeed * (gd > 3 ? 1.35 : 1), gd * 2.2);
      this.walkV += (want - this.walkV) * (1 - Math.exp(-6 * dt));
      if (this.walkV > 0.02 && gd > 1e-3) {
        const st = Math.min(gd, this.walkV * dt);
        this.pos.x += (gx / gd) * st;
        this.pos.z += (gz / gd) * st;
        let dy = Math.atan2(gx, gz) - this.yaw;
        while (dy > Math.PI) dy -= Math.PI * 2;
        while (dy < -Math.PI) dy += Math.PI * 2;
        this.yaw += dy * (1 - Math.exp(-7 * dt));
        this.homeYaw = this.yaw;
      }
      const y = this.ground?.(this.pos.x, this.pos.z, this.pos.y + 0.5);
      if (y !== null && y !== undefined) this.pos.y += (y - this.pos.y) * Math.min(1, dt * 12);
      this.fig.root.position.copy(this.pos);
      this.fig.root.rotation.y = this.yaw;
      this.lookP.set(playerPos.x, playerPos.y + 1.55, playerPos.z);
      this.fig.lookAt = Math.hypot(playerPos.x - this.pos.x, playerPos.z - this.pos.z) < 4 ? this.lookP : null;
      this.fig.speaking = this.speaking;
      this.fig.speed = this.walkV;
      this.fig.update(dt);
      this.marker.visible = false;
      return;
    }
    this.walkV = 0;
    const dx = playerPos.x - this.pos.x;
    const dz = playerPos.z - this.pos.z;
    const d = Math.hypot(dx, dz);
    const near = d < 5.5 || this.talking;
    // primeiro os olhos e a cabeça; o corpo só vira quando o jogador sai do campo de quem olha de lado
    this.lookP.set(playerPos.x, playerPos.y + 1.55, playerPos.z);
    this.fig.lookAt = d < 7.5 || this.talking ? this.lookP : null;
    const want = near ? Math.atan2(dx, dz) : this.homeYaw;
    let dy = want - this.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    if (Math.abs(dy) > (this.talking ? 0.35 : 0.85)) this.turning = true;
    else if (Math.abs(dy) < 0.08) this.turning = false;
    let rate = 0;
    if (this.turning) {
      // vira em passos, a no máximo 2,4 rad/s, desacelerando no fim
      rate = Math.sign(dy) * Math.min(2.4, Math.abs(dy) * 4);
      this.yaw += rate * dt;
    }
    this.fig.turnRate = rate;
    this.fig.root.rotation.y = this.yaw;
    this.fig.speaking = this.talking && this.speaking && Npc.typing;
    const conv: Action = this.speaking ? 'talk' : 'listen';
    if (this.talking && this.fig.action !== conv && !(this.fig.action !== 'none' && this.fig.action !== 'talk' && this.fig.action !== 'listen' && this.fig.progress < 1)) this.fig.play(conv);
    if (!this.talking && (this.fig.action === 'talk' || this.fig.action === 'listen')) this.fig.action = 'none';
    this.fig.speed = 0;
    // gestos espontâneos: cumprimenta uma vez ao se aproximar e, de vez em quando, pensa, assente ou dá de ombros
    if (!this.talking && this.fig.action === 'none' && !this.turning) {
      if (d < 7 && !this.greeted && Math.abs(dy) < 0.6) {
        this.greeted = true;
        this.fig.play('wave');
      } else if (d > 11) this.greeted = false;
      this.gestureCd -= dt;
      if (this.gestureCd <= 0) {
        this.gestureCd = 9 + Math.random() * 12;
        // longe do jogador, a persona cuida do próprio ofício; perto, reage a ele
        if (d < 9) {
          const pool: Action[] = ['think', 'nod', 'shrug'];
          this.fig.play(pool[Math.floor(Math.random() * pool.length)]);
        }
      }
    }
    this.fig.update(dt);
    this.marker.rotation.y = this.t * 1.6;
    this.marker.position.y = this.fig.height + 0.5 + Math.sin(this.t * 2.2) * 0.06;
    // perto da câmera o losango encolhe e some: a menos de 1,2 m ele tomava a tela, somado ao brilho
    const cd = Math.hypot(Npc.cam.x - this.pos.x, Npc.cam.y - (this.pos.y + this.marker.position.y), Npc.cam.z - this.pos.z);
    const k = THREE.MathUtils.clamp((cd - 1.2) / 2.0, 0, 1);
    this.marker.scale.set(k, 1.5 * k, k);
  }
}
