/**
 * Entrada: teclado físico (WASD e setas, como Input.is_physical_key_pressed do original) e o
 * joystick flutuante de toque (scripts/virtual_joystick.gd): o primeiro dedo em qualquer ponto da
 * tela fixa a base ali, arrastar dirige, curso máximo de 110 px e zona morta de 0,18.
 */
const CURSO = 110;
const ZONA_MORTA = 0.18;

export class Entrada {
  teclas = new Set<string>();
  private dedo = -1;
  private ox = 0;
  private oy = 0;
  private kx = 0;
  private ky = 0;
  vetor = { x: 0, y: 0 };
  ativo = true;
  private svg: SVGSVGElement;
  private base: SVGCircleElement;
  private botao: SVGCircleElement;

  constructor(private superficie: HTMLElement) {
    addEventListener('keydown', (e) => this.teclas.add(e.code));
    addEventListener('keyup', (e) => this.teclas.delete(e.code));
    addEventListener('blur', () => this.teclas.clear());
    const ns = 'http://www.w3.org/2000/svg';
    this.svg = document.createElementNS(ns, 'svg');
    this.svg.id = 'joystick';
    this.svg.setAttribute('aria-hidden', 'true');
    this.base = document.createElementNS(ns, 'circle');
    this.botao = document.createElementNS(ns, 'circle');
    this.base.setAttribute('r', String(CURSO));
    this.botao.setAttribute('r', String(CURSO * 0.42));
    this.base.setAttribute('class', 'base');
    this.botao.setAttribute('class', 'botao');
    this.svg.append(this.base, this.botao);
    document.body.appendChild(this.svg);
    superficie.addEventListener('pointerdown', (e) => this.baixo(e));
    addEventListener('pointermove', (e) => this.mover(e));
    addEventListener('pointerup', (e) => this.cima(e));
    addEventListener('pointercancel', (e) => this.cima(e));
  }

  private baixo(e: PointerEvent): void {
    if (e.pointerType !== 'touch' || this.dedo !== -1 || !this.ativo) return;
    this.dedo = e.pointerId;
    this.ox = this.kx = e.clientX;
    this.oy = this.ky = e.clientY;
    this.recalcular();
  }
  private mover(e: PointerEvent): void {
    if (e.pointerId !== this.dedo) return;
    this.kx = e.clientX;
    this.ky = e.clientY;
    this.recalcular();
  }
  private cima(e: PointerEvent): void {
    if (e.pointerId !== this.dedo) return;
    this.soltar();
  }
  soltar(): void {
    this.dedo = -1;
    this.vetor = { x: 0, y: 0 };
    this.svg.classList.remove('on');
  }
  private recalcular(): void {
    let dx = this.kx - this.ox, dy = this.ky - this.oy;
    const l = Math.hypot(dx, dy);
    if (l > CURSO) {
      dx = (dx / l) * CURSO;
      dy = (dy / l) * CURSO;
      this.kx = this.ox + dx;
      this.ky = this.oy + dy;
    }
    const vx = dx / CURSO, vy = dy / CURSO;
    this.vetor = Math.hypot(vx, vy) < ZONA_MORTA ? { x: 0, y: 0 } : { x: vx, y: vy };
    this.base.setAttribute('cx', String(this.ox));
    this.base.setAttribute('cy', String(this.oy));
    this.botao.setAttribute('cx', String(this.kx));
    this.botao.setAttribute('cy', String(this.ky));
    this.svg.classList.add('on');
  }

  /** direção do teclado somada ao joystick (player.gd, _physics_process) */
  direcao(): { x: number; y: number } {
    const t = this.teclas;
    let x = 0, y = 0;
    if (t.has('KeyW') || t.has('ArrowUp')) y -= 1;
    if (t.has('KeyS') || t.has('ArrowDown')) y += 1;
    if (t.has('KeyA') || t.has('ArrowLeft')) x -= 1;
    if (t.has('KeyD') || t.has('ArrowRight')) x += 1;
    return { x: x + this.vetor.x, y: y + this.vetor.y };
  }
}
