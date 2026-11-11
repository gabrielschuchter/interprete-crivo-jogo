/**
 * Entrada unificada: teclado, mouse e gamepad. Ações abstratas, para permitir
 * remapeamento e para que o resto do jogo não conheça teclas.
 */
export type ActionName =
  | 'frente' | 'tras' | 'esquerda' | 'direita' | 'correr' | 'esquiva' | 'interagir' | 'ataque' | 'golpe'
  | 'crivo' | 'trocarCrivo' | 'dica' | 'item' | 'travar' | 'inventario' | 'diario' | 'mapa' | 'habilidades' | 'pausa';

export const DEFAULT_KEYS: Record<ActionName, string[]> = {
  frente: ['KeyW', 'ArrowUp'],
  tras: ['KeyS', 'ArrowDown'],
  esquerda: ['KeyA', 'ArrowLeft'],
  direita: ['KeyD', 'ArrowRight'],
  correr: ['ShiftLeft', 'ShiftRight'],
  esquiva: ['Space'],
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
};

export const ACTION_LABEL: Record<ActionName, string> = {
  frente: 'Andar para a frente', tras: 'Andar para trás', esquerda: 'Andar para a esquerda', direita: 'Andar para a direita',
  correr: 'Correr', esquiva: 'Esquiva', interagir: 'Interagir', ataque: 'Golpe leve', golpe: 'Golpe firme',
  crivo: 'Habilidade do Crivo', trocarCrivo: 'Alternar habilidade do Crivo', dica: 'Pedir dica ao Crivo', item: 'Usar caldo',
  travar: 'Travar a mira', inventario: 'Inventário', diario: 'Diário', mapa: 'Mapa', habilidades: 'Habilidades', pausa: 'Pausa',
};

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
  private down = new Set<string>();
  private pressed = new Set<ActionName>();
  mouseDX = 0;
  mouseDY = 0;
  locked = false;
  enabled = true;
  /** eixo analógico do gamepad */
  padMove = { x: 0, y: 0 };
  padLook = { x: 0, y: 0 };
  usingPad = false;
  private padPrev: boolean[] = [];
  onAnyKey: (() => void) | null = null;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Tab') e.preventDefault();
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      this.onAnyKey?.();
      if (!e.repeat) this.press(e.code);
    });
    window.addEventListener('keyup', (e) => this.down.delete(e.code));
    canvas.addEventListener('mousedown', (e) => {
      this.onAnyKey?.();
      if (!this.locked && this.enabled) this.requestLock();
      this.press('Mouse' + e.button);
    });
    window.addEventListener('mouseup', (e) => this.down.delete('Mouse' + e.button));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('mousemove', (e) => {
      if (this.locked) {
        this.mouseDX += e.movementX;
        this.mouseDY += e.movementY;
      }
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
    });
    window.addEventListener('blur', () => this.down.clear());
  }

  requestLock(): void {
    try {
      const p = this.canvas.requestPointerLock() as unknown as Promise<void> | undefined;
      p?.catch?.(() => undefined);
    } catch {
      /* navegadores sem pointer lock: a câmera segue pelas setas */
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
    return this.keys[a].some((k) => this.down.has(k));
  }

  /** verdadeiro uma vez por pressionamento */
  took(a: ActionName): boolean {
    if (this.pressed.has(a)) {
      this.pressed.delete(a);
      return true;
    }
    return false;
  }

  rebind(a: ActionName, code: string): void {
    for (const k of Object.keys(this.keys) as ActionName[]) this.keys[k] = this.keys[k].filter((c) => c !== code);
    this.keys[a] = [code];
  }

  pollGamepad(): void {
    const pads = navigator.getGamepads?.() ?? [];
    const p = pads.find((g) => g && g.connected);
    if (!p) {
      this.padMove.x = this.padMove.y = this.padLook.x = this.padLook.y = 0;
      return;
    }
    const dz = (v: number) => (Math.abs(v) < 0.18 ? 0 : v);
    this.padMove.x = dz(p.axes[0] ?? 0);
    this.padMove.y = dz(p.axes[1] ?? 0);
    this.padLook.x = dz(p.axes[2] ?? 0);
    this.padLook.y = dz(p.axes[3] ?? 0);
    const map: Array<[number, ActionName]> = [
      [0, 'interagir'], [1, 'esquiva'], [2, 'ataque'], [3, 'golpe'], [4, 'trocarCrivo'], [5, 'crivo'],
      [8, 'mapa'], [9, 'pausa'], [10, 'correr'], [11, 'travar'], [12, 'item'], [13, 'dica'], [14, 'diario'], [15, 'inventario'],
    ];
    for (const [i, a] of map) {
      const b = !!p.buttons[i]?.pressed;
      if (b && !this.padPrev[i]) {
        this.pressed.add(a);
        this.usingPad = true;
        this.onAnyKey?.();
      }
      this.padPrev[i] = b;
    }
    if (this.padMove.x || this.padMove.y) this.usingPad = true;
  }

  padRun(): boolean {
    const pads = navigator.getGamepads?.() ?? [];
    const p = pads.find((g) => g && g.connected);
    return !!p && (!!p.buttons[10]?.pressed || (p.buttons[7]?.value ?? 0) > 0.4);
  }

  endFrame(): void {
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.pressed.clear();
  }
}
