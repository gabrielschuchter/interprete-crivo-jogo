/**
 * Ator de cena: uma figura do elenco PS2 dentro de um suporte que a cena posiciona, deita e gira, com pose
 * imposta por cima do clipe (a mesma camada que a esgrima usa), rota de caminhada, olhar e rosto.
 */
import * as THREE from 'three';
import { Figure, type Action, type FigureOpts } from '../entities/figure';
import type { Pose } from '../entities/motion';

export type V3 = [number, number, number];

const _v = new THREE.Vector3();

export class Ator {
  /** suporte: posição, rumo e giro do corpo inteiro (deitado, de bruços) */
  base = new THREE.Group();
  fig: Figure;
  falando = false;
  private pose: Pose | null = null;
  private poseW = 0;
  private poseAlvo = 0;
  private poseRate = 3;
  /** pose que muda a cada quadro (rastejar, torcer pano) */
  poseFn: ((t: number) => Pose) | null = null;
  private rota: { pts: THREE.Vector3[]; vel: number; i: number; res: () => void } | null = null;
  olharPara: THREE.Vector3 | Ator | null = null;
  rosto: Record<string, number> | null = null;
  /** escala da cabeça (corpo de criança feito do corpo jovem): aplicada quando o modelo chega */
  cabeca = 1;
  private cabecaFeita = false;
  /** silhueta: todos os materiais em preto, sem luz */
  silhueta = false;
  private silFeita = false;
  /** some quando a câmera estiver longe (figurantes) */
  constructor(
    public nome: string,
    opts: FigureOpts,
  ) {
    this.fig = new Figure(opts);
    this.base.add(this.fig.root);
  }

  entrar(scene: THREE.Object3D): void {
    scene.add(this.base);
  }
  remover(): void {
    this.base.parent?.remove(this.base);
  }

  /** coloca no lugar: x, y, z e rumo (rad; 0 olha para +z) */
  em(x: number, y: number, z: number, rumo = 0): this {
    this.base.position.set(x, y, z);
    this.base.rotation.set(0, rumo, 0);
    this.fig.root.rotation.set(0, 0, 0);
    this.fig.root.position.set(0, 0, 0);
    return this;
  }
  /**
   * Deita com o meio do corpo na origem da base e a cabeça para -z da base: de costas (0), de lado (1 ou -1),
   * de bruços (2, aí a cabeça vai para +z, que é para onde se rasteja). `alto` ergue o corpo do colchão.
   */
  deitar(modo: 0 | 1 | -1 | 2, alto = 0.1): this {
    const r = this.fig.root;
    const h = this.fig.height;
    if (modo === 2) {
      r.rotation.set(Math.PI / 2, 0, 0);
      r.position.set(0, alto, -h * 0.5);
    } else {
      r.rotation.set(-Math.PI / 2, 0, 0);
      // o comprimento do corpo é o y da figura: girar nele vira de lado
      if (modo !== 0) r.rotateY((modo * Math.PI) / 2);
      r.position.set(0, alto + (modo !== 0 ? 0.12 : 0), h * 0.5);
    }
    return this;
  }
  /** inclina o corpo inteiro para a frente (rastejar, apoiar), em rad, pivô nos pés */
  inclinar(rx: number, y = 0): this {
    this.fig.root.rotation.set(rx, 0, 0);
    this.fig.root.position.set(0, y, 0);
    return this;
  }
  /** aparece ou some */
  ver(on: boolean): this {
    this.base.visible = on;
    return this;
  }

  /** impõe uma pose (peso sobe na taxa dada) */
  posar(p: Pose | null, rate = 3): this {
    if (p) this.pose = p;
    this.poseAlvo = p ? 1 : 0;
    this.poseRate = rate;
    if (rate >= 50) this.poseW = this.poseAlvo;
    return this;
  }
  /** gesto de clipe (aceno, fala, interação) */
  gesto(a: Action, dur?: number): this {
    this.fig.play(a, dur);
    return this;
  }

  /** anda pela rota (pontos x, z no chão da base) e resolve ao chegar */
  /** avanço rápido ou pulo: a caminhada chega na hora */
  instante: () => boolean = () => false;
  andar(pts: Array<[number, number]>, vel = 1.1): Promise<void> {
    if (this.instante() && pts.length) {
      const [x, z] = pts[pts.length - 1];
      this.base.position.set(x, this.base.position.y, z);
      return Promise.resolve();
    }
    return new Promise((res) => {
      this.rota = { pts: pts.map(([x, z]) => new THREE.Vector3(x, this.base.position.y, z)), vel, i: 0, res };
    });
  }
  parar(): void {
    this.rota?.res();
    this.rota = null;
    this.fig.speed = 0;
  }
  get andando(): boolean {
    return !!this.rota;
  }

  /** ponto do mundo na altura da cabeça */
  cabecaPos(out = new THREE.Vector3()): THREE.Vector3 {
    const hb = this.fig.headBone;
    if (hb) return hb.getWorldPosition(out);
    return this.base.localToWorld(out.set(0, this.fig.height * 0.93, 0));
  }

  /** objeto na mão (pote, folha, chapéu): segue o osso da mão, posto direto na cena */
  private mao: { obj: THREE.Object3D; osso: string; off: THREE.Vector3; bone: THREE.Object3D | null } | null = null;
  segurar(obj: THREE.Object3D | null, lado: 'Left' | 'Right' = 'Right', off: V3 = [0, 0, 0]): this {
    if (this.mao) this.mao.obj.parent?.remove(this.mao.obj);
    this.mao = obj ? { obj, osso: lado + 'Hand', off: new THREE.Vector3(...off), bone: null } : null;
    if (obj) this.base.parent?.add(obj);
    return this;
  }
  /** perde cor e contraste, até ficar quase da cor da parede (k de 0 a 1) */
  private cores: Array<{ m: THREE.MeshStandardMaterial; c: THREE.Color }> | null = null;
  desbotar(k: number, parede = 0x5a5048): void {
    if (!this.fig.external) return;
    if (!this.cores) {
      this.cores = [];
      this.fig.root.traverse((o) => {
        const me = o as THREE.Mesh;
        if (me.isMesh) for (const m of ([] as THREE.Material[]).concat(me.material)) if ((m as THREE.MeshStandardMaterial).color) this.cores!.push({ m: m as THREE.MeshStandardMaterial, c: (m as THREE.MeshStandardMaterial).color.clone() });
      });
    }
    const alvo = new THREE.Color(parede);
    for (const x of this.cores) {
      x.m.color.copy(x.c).lerp(alvo, k * 0.85);
      // sem contraste: a textura some sob a cor chapada
      if (x.m.map) x.m.color.multiplyScalar(1 - k * 0.25);
    }
  }

  update(dt: number, t: number): void {
    const f = this.fig;
    const r = this.rota;
    if (r) {
      const alvo = r.pts[r.i];
      _v.copy(alvo).sub(this.base.position);
      _v.y = 0;
      const d = _v.length();
      if (d < 0.08) {
        r.i++;
        if (r.i >= r.pts.length) {
          this.rota = null;
          f.speed = 0;
          r.res();
        }
      } else {
        const passo = Math.min(d, r.vel * dt);
        this.base.position.addScaledVector(_v.normalize(), passo);
        const rumo = Math.atan2(_v.x, _v.z);
        let dr = rumo - this.base.rotation.y;
        while (dr > Math.PI) dr -= Math.PI * 2;
        while (dr < -Math.PI) dr += Math.PI * 2;
        this.base.rotation.y += dr * (1 - Math.exp(-8 * dt));
        f.speed = r.vel;
      }
    }
    this.poseW += (this.poseAlvo - this.poseW) * (1 - Math.exp(-this.poseRate * dt));
    const p = this.poseFn ? this.poseFn(t) : this.pose;
    const w = this.poseFn ? 1 : this.poseW;
    f.combat = p && w > 0.002 ? { pose: p, arma: { yaw: 0, elev: 0, roll: 0 }, w, armaW: 0 } : null;
    const o = this.olharPara;
    f.lookAt = o ? (o instanceof Ator ? o.cabecaPos(_v) : o) : null;
    f.speaking = this.falando;
    f.faceOverride = this.rosto;
    f.update(dt);
    const mh = this.mao;
    if (mh) {
      mh.bone ??= f.root.getObjectByName(mh.osso) ?? null;
      if (mh.bone) {
        mh.bone.getWorldPosition(mh.obj.position);
        mh.obj.position.add(mh.off);
      } else this.base.localToWorld(mh.obj.position.set(0.2, f.height * 0.5, 0.25));
    }
    if (!this.cabecaFeita && f.headBone && this.cabeca !== 1) {
      f.headBone.scale.setScalar(this.cabeca);
      this.cabecaFeita = true;
    }
    if (this.silhueta && !this.silFeita && f.external) {
      const preto = new THREE.MeshBasicMaterial({ color: 0x050304 });
      f.root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) m.material = preto;
      });
      this.silFeita = true;
    }
  }
}
