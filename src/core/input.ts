/**
 * Entrada unificada: teclado, mouse e gamepad. Ações abstratas, para permitir
 * remapeamento e para que o resto do jogo não conheça teclas.
 */
export type ActionName =
  | 'frente' | 'tras' | 'esquerda' | 'direita' | 'correr' | 'pular' | 'esquiva' | 'interagir' | 'ataque' | 'golpe'
  | 'crivo' | 'trocarCrivo' | 'dica' | 'item' | 'travar' | 'inventario' | 'diario' | 'mapa' | 'habilidades' | 'pausa' | 'camEsq' | 'camDir';

export const DEFAULT_KEYS: Record<ActionName, string[]> = {
  frente: ['KeyW', 'ArrowUp'],
  tras: ['KeyS', 'ArrowDown'],
  esquerda: ['KeyA', 'ArrowLeft'],
  direita: ['KeyD', 'ArrowRight'],
  correr: ['ShiftLeft', 'ShiftRight'],
  pular: ['Space'],
  esquiva: ['KeyX'],
  interagir: ['KeyE'],
  ataque: ['Mouse0', 'KeyJ'],
  golpe: ['Mouse2', 'KeyK'],
  crivo: ['KeyQ'],
  trocarCrivo: ['KeyR'],
  dica: ['KeyH'],
  item: ['KeyF'],
  travar: ['KeyT', 'Mouse1'],
  inventario: ['Tab', 'KeyI'],
  diario: ['KeyL'],
  mapa: ['KeyM'],
  habilidades: ['KeyP'],
  pausa: ['Escape'],
  camEsq: ['KeyZ'],
  camDir: ['KeyC'],
};

export const ACTION_LABEL: Record<ActionName, string> = {
  frente: 'Andar para a frente', tras: 'Andar para trás', esquerda: 'Andar para a esquerda', direita: 'Andar para a direita',
  correr: 'Correr', pular: 'Pular', esquiva: 'Esquiva', interagir: 'Interagir', ataque: 'Golpe leve', golpe: 'Golpe firme',
  crivo: 'Habilidade do Crivo', trocarCrivo: 'Alternar habilidade do Crivo', dica: 'Pedir dica ao Crivo', item: 'Usar caldo ou limão',
  travar: 'Travar a mira', inventario: 'Inventário', diario: 'Diário', mapa: 'Mapa', habilidades: 'Habilidades', pausa: 'Pausa',
  camEsq: 'Girar a câmera à esquerda', camDir: 'Girar a câmera à direita',
};

/** Botões do gamepad no mapa padrão do navegador (W3C "standard"). */
export const DEFAULT_PAD: Partial<Record<ActionName, number>> = {
  interagir: 0, esquiva: 1, ataque: 2, golpe: 3, trocarCrivo: 4, crivo: 5,
  pular: 6, mapa: 8, pausa: 9, correr: 10, travar: 11, item: 12, dica: 13, diario: 14, inventario: 15,
};

const PAD_NAMES = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'Voltar', 'Start', 'L3', 'R3', 'Direcional ↑', 'Direcional ↓', 'Direcional ←', 'Direcional →'];
export function padLabel(i: number | undefined): string {
  if (i === undefined) return 'sem botão';
  return PAD_NAMES[i] ?? `Botão ${i}`;
}

export function keyLabel(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  const map: Record<string, string> = {
    Mouse0: 'Clique', Mouse1: 'Botão do meio', Mouse2: 'Clique direito', Space: 'Espaço', ShiftLeft: 'Shift', ShiftRight: 'Shift',
    Escape: 'Esc', Tab: 'Tab', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Enter: 'Enter',
  };
  return map[code] ?? code;
}

export class Input {
  keys = { ...DEFAULT_KEYS } as Record<ActionName, string[]>;
  pad = { ...DEFAULT_PAD } as Partial<Record<ActionName, number>>;
  /** zona morta radial dos analógicos, de 0 a 1 */
  padDeadzone = 0.18;
  private down = new Set<string>();
  private pressed = new Set<ActionName>();
  mouseDX = 0;
  mouseDY = 0;
  locked = false;
  enabled = true;
  /** eixo analógico do gamepad */
  padMove = { x: 0, y: 0 };
  /** controles de toque: eixo do joystick virtual (y positivo = para trás), olhar em px acumulados no quadro */
  touchMove = { x: 0, y: 0 };
  touchLookX = 0;
  touchLookY = 0;
  touchRun = false;
  padLook = { x: 0, y: 0 };
  /** navegação de menus pelo controle: analógico esquerdo ou direcional, -1, 0 ou 1 */
  padNav = { x: 0, y: 0 };
  /** verdadeiro enquanto a última entrada veio do gamepad; volta a falso ao usar teclado ou mouse */
  usingPad = false;
  private padPrev: boolean[] = [];
  private padId = '';
  private padHeld = new Set<ActionName>();
  /** botões de toque mantidos apertados (carga do golpe firme) */
  touchHeld = new Set<ActionName>();
  private lockFailed = false;
  onAnyKey: (() => void) | null = null;
  /** Diz se há painel, menu ou conversa por cima do jogo. Com painel aberto, Tab, setas e espaço são do navegador. */
  uiOpen: () => boolean = () => false;
  /** Durante o remapeamento: recebe o próximo botão do gamepad em vez de disparar a ação. */
  capturePad: ((button: number) => void) | null = null;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    window.addEventListener('keydown', (e) => {
      const t = e.target;
      const form = t instanceof HTMLInputElement || t instanceof HTMLSelectElement || t instanceof HTMLTextAreaElement;
      const menu = this.uiOpen();
      this.usingPad = false;
      // só o jogo em si captura Tab, espaço e setas; em painéis eles percorrem e acionam os controles
      if (!menu && !form && (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('Arrow'))) e.preventDefault();
      if (form) return;
      this.onAnyKey?.();
      if (menu && (e.code === 'Tab' || e.code === 'Space' || e.code === 'Enter' || e.code.startsWith('Arrow'))) return;
      if (!e.repeat) this.press(e.code);
    });
    window.addEventListener('keyup', (e) => this.down.delete(e.code));
    canvas.addEventListener('mousedown', (e) => {
      this.onAnyKey?.();
      this.usingPad = false;
      if (!this.locked && this.enabled && !this.lockFailed) {
        // este clique só captura o ponteiro: não vira golpe
        this.requestLock();
        return;
      }
      this.press('Mouse' + e.button);
    });
    window.addEventListener('mouseup', (e) => this.down.delete('Mouse' + e.button));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('mousemove', (e) => {
      if (this.locked) {
        // saltos enormes de um único evento (retomada do ponteiro, bug conhecido) giravam a câmera sozinha
        if (Math.abs(e.movementX) < 280 && Math.abs(e.movementY) < 280) {
          this.mouseDX += e.movementX;
          this.mouseDY += e.movementY;
        }
        if (e.movementX || e.movementY) this.usingPad = false;
      }
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
      if (this.locked) this.lockFailed = false;
    });
    // sem captura de ponteiro (navegador ou moldura que recusa): os cliques voltam a valer como golpes
    document.addEventListener('pointerlockerror', () => (this.lockFailed = true));
    window.addEventListener('blur', () => {
      this.down.clear();
      this.padHeld.clear();
    });
    window.addEventListener('gamepaddisconnected', () => this.clearPad());
    window.addEventListener('gamepadconnected', () => this.clearPad());
  }

  private clearPad(): void {
    this.padPrev = [];
    this.padHeld.clear();
    this.padId = '';
    this.padMove.x = this.padMove.y = this.padLook.x = this.padLook.y = 0;
    this.padNav.x = this.padNav.y = 0;
  }

  requestLock(): void {
    try {
      // movimento cru, sem a aceleração do sistema: em tela cheia a aceleração do Windows multiplicava os saltos
      const req = this.canvas.requestPointerLock as unknown as (o?: { unadjustedMovement?: boolean }) => Promise<void> | undefined;
      const p = req.call(this.canvas, { unadjustedMovement: true });
      p?.catch?.(() => {
        const q = this.canvas.requestPointerLock() as unknown as Promise<void> | undefined;
        q?.catch?.(() => (this.lockFailed = true));
      });
    } catch {
      /* navegadores sem pointer lock: a câmera segue pelas teclas Z e C */
      this.lockFailed = true;
    }
  }

  releaseLock(): void {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  private press(code: string): void {
    this.down.add(code);
    for (const a of Object.keys(this.keys) as ActionName[]) if (this.keys[a].includes(code)) this.pressed.add(a);
  }

  /** injeta uma ação (testes automatizados e toque) */
  inject(a: ActionName): void {
    this.pressed.add(a);
  }
  hold(code: string, on: boolean): void {
    if (on) this.down.add(code);
    else this.down.delete(code);
  }

  held(a: ActionName): boolean {
    return this.keys[a].some((k) => this.down.has(k)) || this.padHeld.has(a) || this.touchHeld.has(a);
  }

  /** verdadeiro uma vez por pressionamento */
  took(a: ActionName): boolean {
    if (this.pressed.has(a)) {
      this.pressed.delete(a);
      return true;
    }
    return false;
  }

  /** Ação que hoje usa a tecla, se houver. */
  owner(code: string, except?: ActionName): ActionName | null {
    for (const k of Object.keys(this.keys) as ActionName[]) if (k !== except && this.keys[k].includes(code)) return k;
    return null;
  }

  /**
   * Atribui a tecla à ação. Se ela já era de outra ação, as duas trocam: a outra fica com a
   * tecla principal que esta ação tinha, em vez de perder a tecla em silêncio.
   */
  rebind(a: ActionName, code: string): { other: ActionName; got: string | null } | null {
    const other = this.owner(code, a);
    const old = this.keys[a][0] ?? null;
    let res: { other: ActionName; got: string | null } | null = null;
    if (other) {
      const give = old && old !== code && !this.owner(old, a) ? old : null;
      this.keys[other] = this.keys[other].filter((c) => c !== code);
      if (give) this.keys[other] = [give, ...this.keys[other]];
      res = { other, got: this.keys[other][0] ?? null };
    }
    this.keys[a] = [code];
    return res;
  }

  /** Mesmo contrato de `rebind`, para botões do gamepad. */
  rebindPad(a: ActionName, button: number): { other: ActionName; got: number | null } | null {
    const other = (Object.keys(this.pad) as ActionName[]).find((k) => k !== a && this.pad[k] === button) ?? null;
    const old = this.pad[a];
    let res: { other: ActionName; got: number | null } | null = null;
    if (other) {
      if (old !== undefined && old !== button) this.pad[other] = old;
      else delete this.pad[other];
      res = { other, got: this.pad[other] ?? null };
    }
    this.pad[a] = button;
    return res;
  }

  private activePad(): Gamepad | null {
    const pads = navigator.getGamepads?.() ?? [];
    return pads.find((g) => g && g.connected) ?? null;
  }

  /** zona morta radial com reescala: o eixo sai de 0 logo após a borda da zona, sem degrau */
  private stick(x: number, y: number, out: { x: number; y: number }): void {
    const m = Math.hypot(x, y);
    const dz = this.padDeadzone;
    if (m <= dz) {
      out.x = out.y = 0;
      return;
    }
    const k = Math.min(1, (m - dz) / (1 - dz)) / m;
    out.x = x * k;
    out.y = y * k;
  }

  pollGamepad(): void {
    const p = this.activePad();
    if (!p) {
      if (this.padId) this.clearPad();
      return;
    }
    const id = p.index + ':' + p.id;
    if (id !== this.padId) {
      // controle novo ou reconectado: nada do anterior vale, e botões já apertados não disparam
      this.clearPad();
      this.padId = id;
      p.buttons.forEach((b, i) => (this.padPrev[i] = !!b?.pressed));
    }
    this.stick(p.axes[0] ?? 0, p.axes[1] ?? 0, this.padMove);
    this.stick(p.axes[2] ?? 0, p.axes[3] ?? 0, this.padLook);
    const by = new Map<number, ActionName>();
    for (const [a, i] of Object.entries(this.pad) as Array<[ActionName, number]>) by.set(i, a);
    this.padHeld.clear();
    for (let i = 0; i < p.buttons.length; i++) {
      const b = !!p.buttons[i]?.pressed;
      const a = by.get(i);
      if (b && !this.padPrev[i]) {
        this.usingPad = true;
        this.onAnyKey?.();
        if (this.capturePad) this.capturePad(i);
        else if (a) this.pressed.add(a);
      }
      if (b && a) this.padHeld.add(a);
      this.padPrev[i] = b;
    }
    if (this.padMove.x || this.padMove.y || this.padLook.x || this.padLook.y) this.usingPad = true;
    const dp = (i: number) => (p.buttons[i]?.pressed ? 1 : 0);
    const ax = (v: number) => (v > 0.6 ? 1 : v < -0.6 ? -1 : 0);
    this.padNav.x = dp(15) - dp(14) || ax(this.padMove.x);
    this.padNav.y = dp(13) - dp(12) || ax(this.padMove.y);
  }

  padRun(): boolean {
    if (this.touchRun) return true;
    const p = this.activePad();
    return !!p && (this.padHeld.has('correr') || (p.buttons[7]?.value ?? 0) > 0.4);
  }

  endFrame(): void {
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.touchLookX = 0;
    this.touchLookY = 0;
    this.pressed.clear();
  }
}
