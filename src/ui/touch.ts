import type { Game } from '../game';
import type { ActionName } from '../core/input';
import { icon } from './icons';

/**
 * Controles de toque: joystick flutuante à esquerda, olhar por arrasto à direita e botões
 * de ação ao alcance dos polegares. Cada dedo é rastreado por pointerId, então mover,
 * olhar e golpear acontecem juntos. Tudo em px CSS, independente da densidade da tela.
 */
export function isTouchDevice(): boolean {
  if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('touch')) return true;
  return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
}

interface Btn {
  id: string;
  action?: ActionName;
  label: string;
  cls: string;
  repeat?: number;
  /** segurar conta (carga do firme) */
  hold?: boolean;
  glyph?: string;
}

const BUTTONS: Btn[] = [
  { id: 'ataque', action: 'ataque', label: 'Golpe', cls: 'a-main', repeat: 0.34 },
  { id: 'golpe', action: 'golpe', label: 'Firme', cls: 'a-heavy', hold: true },
  { id: 'esquiva', action: 'esquiva', label: 'Esquiva', cls: 'a-dodge' },
  { id: 'pular', action: 'pular', label: 'Pulo', cls: 'a-jump' },
  { id: 'crivo', action: 'crivo', label: 'Pulso', cls: 'a-crivo', glyph: 'pulso' },
  { id: 'interagir', action: 'interagir', label: 'Agir', cls: 'a-act' },
  { id: 'item', action: 'item', label: 'Item', cls: 'a-item', glyph: 'caldo' },
  { id: 'trocarCrivo', action: 'trocarCrivo', label: 'Trocar', cls: 'a-small s1' },
  { id: 'dica', action: 'dica', label: 'Dica', cls: 'a-small s2' },
  { id: 'travar', action: 'travar', label: 'Mira', cls: 'a-small s3' },
];

export class TouchControls {
  readonly el: HTMLElement;
  enabled = false;
  private g!: Game;
  private stick: { id: number; bx: number; by: number } | null = null;
  private look: { id: number; x: number; y: number } | null = null;
  private base: HTMLElement;
  private knob: HTMLElement;
  private btnEls = new Map<string, HTMLElement>();
  private held = new Map<number, { btn: Btn; t: number }>();
  private shown = false;

  constructor(root: HTMLElement) {
    this.el = document.createElement('div');
    this.el.id = 'touch';
    this.el.className = 'hidden';
    this.el.innerHTML = `<div class="t-stick"><i class="t-base"></i><i class="t-knob"></i></div>
      <div class="t-btns">${BUTTONS.map((b) => `<button class="t-btn ${b.cls}" data-b="${b.id}" aria-label="${b.label}">${b.glyph ? `<span class="g">${icon(b.glyph)}</span>` : ''}<span class="l">${b.label}</span><i class="cd"></i><i class="n"></i></button>`).join('')}</div>
      <div class="t-top"><button class="t-btn t-mini" data-b="caderno" aria-label="Caderno">Caderno</button><button class="t-btn t-mini" data-b="pausa" aria-label="Pausa">Pausa</button></div>`;
    root.appendChild(this.el);
    this.base = this.el.querySelector('.t-base') as HTMLElement;
    this.knob = this.el.querySelector('.t-knob') as HTMLElement;
    this.el.querySelectorAll<HTMLElement>('[data-b]').forEach((e) => this.btnEls.set(e.dataset.b!, e));
  }

  bind(g: Game): void {
    this.g = g;
    const el = this.el;
    // zonas livres: esquerda = joystick, direita = olhar. Botões interceptam antes.
    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const t = e.target as HTMLElement;
      const bt = t.closest<HTMLElement>('[data-b]');
      if (bt) return this.pressButton(e, bt);
      const w = window.innerWidth;
      if (e.clientX < w * 0.46 && !this.stick) {
        const m = 60;
        const bx = Math.min(Math.max(e.clientX, m), w * 0.46);
        const by = Math.min(Math.max(e.clientY, m), window.innerHeight - m);
        this.stick = { id: e.pointerId, bx, by };
        el.setPointerCapture(e.pointerId);
        this.place(bx, by);
        this.moveStick(e.clientX, e.clientY);
      } else if (!this.look && e.clientX >= w * 0.46) {
        this.look = { id: e.pointerId, x: e.clientX, y: e.clientY };
        el.setPointerCapture(e.pointerId);
      }
      e.preventDefault();
    });
    el.addEventListener('pointermove', (e) => {
      if (this.stick?.id === e.pointerId) this.moveStick(e.clientX, e.clientY);
      else if (this.look?.id === e.pointerId) {
        const inp = this.g.input;
        inp.touchLookX += e.clientX - this.look.x;
        inp.touchLookY += e.clientY - this.look.y;
        this.look.x = e.clientX;
        this.look.y = e.clientY;
      }
    });
    const end = (e: PointerEvent) => {
      if (this.stick?.id === e.pointerId) this.releaseStick();
      if (this.look?.id === e.pointerId) this.look = null;
      this.held.delete(e.pointerId);
      const ha = this.holds.get(e.pointerId);
      if (ha) {
        this.holds.delete(e.pointerId);
        if (![...this.holds.values()].includes(ha)) this.g.input.touchHeld.delete(ha);
      }
      // com captura de ponteiro o alvo do evento é o contêiner: o botão certo é o que este dedo apertou
      const bt = this.lit.get(e.pointerId) ?? (e.target as HTMLElement).closest?.('[data-b]');
      this.lit.delete(e.pointerId);
      if (bt) bt.classList.remove('on');
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('touchstart', () => this.enable(), { passive: true, once: true });
    // ao perder o foco, solta tudo: evita personagem andando sozinho
    window.addEventListener('blur', () => this.releaseAll());
  }

  enable(): void {
    if (this.enabled) return;
    this.enabled = true;
    document.body.classList.add('touch');
  }

  private place(x: number, y: number): void {
    const st = this.el.querySelector('.t-stick') as HTMLElement;
    st.style.setProperty('--R', `${this.radius()}px`);
    st.style.transform = `translate(${x}px,${y}px)`;
    st.classList.add('on');
    this.knob.style.transform = 'translate(0,0)';
  }

  private radius(): number {
    return Math.max(46, Math.min(72, Math.min(window.innerWidth, window.innerHeight) * 0.13));
  }

  private moveStick(px: number, py: number): void {
    const s = this.stick;
    if (!s) return;
    const R = this.radius();
    let dx = px - s.bx;
    let dy = py - s.by;
    const len = Math.hypot(dx, dy);
    // base flutuante: se o dedo passa do raio, a base acompanha, e o ponto neutro nunca se afasta
    if (len > R) {
      const k = (len - R) / len;
      s.bx += dx * k;
      s.by += dy * k;
      s.bx = Math.min(Math.max(s.bx, 40), window.innerWidth * 0.5);
      s.by = Math.min(Math.max(s.by, 40), window.innerHeight - 40);
      dx = px - s.bx;
      dy = py - s.by;
      this.place(s.bx, s.by);
    }
    const l = Math.min(R, Math.hypot(dx, dy));
    const ang = Math.atan2(dy, dx);
    const m = l / R;
    const dead = 0.14;
    const mm = m < dead ? 0 : (m - dead) / (1 - dead);
    const curved = Math.pow(mm, 1.15);
    const inp = this.g.input;
    inp.touchMove.x = Math.cos(ang) * curved;
    inp.touchMove.y = Math.sin(ang) * curved;
    // corrida: empurrar a 85% do curso, sem exigir a borda; histerese evita tremer entre andar e correr
    if (mm >= 0.85) inp.touchRun = true;
    else if (mm < 0.7) inp.touchRun = false;
    this.knob.style.transform = `translate(${Math.cos(ang) * l}px,${Math.sin(ang) * l}px)`;
  }

  private releaseStick(): void {
    this.stick = null;
    const inp = this.g.input;
    inp.touchMove.x = inp.touchMove.y = 0;
    inp.touchRun = false;
    this.el.querySelector('.t-stick')!.classList.remove('on');
  }

  releaseAll(): void {
    if (!this.g) return;
    this.releaseStick();
    this.look = null;
    this.held.clear();
    this.holds.clear();
    this.g.input.touchHeld.clear();
    this.lit.clear();
    this.el.querySelectorAll('[data-b].on').forEach((b) => b.classList.remove('on'));
  }
  private lit = new Map<number, HTMLElement>();
  private holds = new Map<number, ActionName>();

  private pressButton(e: PointerEvent, bt: HTMLElement): void {
    e.preventDefault();
    const id = bt.dataset.b!;
    bt.classList.add('on');
    this.lit.set(e.pointerId, bt);
    this.g.audio.start();
    if (id === 'pausa') return this.g.pauseGame();
    if (id === 'caderno') return this.g.ui.openBook('inventario');
    const b = BUTTONS.find((x) => x.id === id)!;
    if (b.action) this.g.input.inject(b.action);
    if (b.hold && b.action) {
      this.el.setPointerCapture(e.pointerId);
      this.holds.set(e.pointerId, b.action);
      this.g.input.touchHeld.add(b.action);
    }
    if (b.repeat) {
      this.el.setPointerCapture(e.pointerId);
      this.held.set(e.pointerId, { btn: b, t: b.repeat });
    }
  }

  /** chamado a cada quadro de interface */
  update(dt: number, mode: string): void {
    const on = this.enabled && mode === 'play';
    if (on !== this.shown) {
      this.shown = on;
      this.el.classList.toggle('hidden', !on);
      if (!on) this.releaseAll();
    }
    if (!on) return;
    for (const h of this.held.values()) {
      h.t -= dt;
      if (h.t <= 0 && h.btn.action) {
        this.g.input.inject(h.btn.action);
        h.t = h.btn.repeat ?? 0.34;
      }
    }
  }

  setPrompt(text: string | null): void {
    const b = this.btnEls.get('interagir');
    if (!b) return;
    b.classList.toggle('ready', !!text);
    (b.querySelector('.l') as HTMLElement).textContent = text ? text.split(' ')[0].slice(0, 10) : 'Agir';
  }

  setHud(d: { abilityCd: number; ability: string; caldo: number; limao: number }): void {
    const c = this.btnEls.get('crivo');
    if (c) {
      (c.querySelector('.cd') as HTMLElement).style.height = `${(d.abilityCd * 100).toFixed(0)}%`;
      (c.querySelector('.l') as HTMLElement).textContent = d.ability === 'pulso' ? 'Pulso' : 'Lupa';
    }
    const it = this.btnEls.get('item');
    if (it) {
      const n = d.caldo > 0 ? d.caldo : d.limao;
      (it.querySelector('.n') as HTMLElement).textContent = String(n);
      it.classList.toggle('empty', n <= 0);
    }
  }
}
