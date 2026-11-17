/**
 * Sistema de cena: câmera de planos, letterbox, legendas com tempo calculado, pretos, letreiros, pausa e pular.
 * O roteiro (story.ts) chama estas primitivas com await. O relógio é o dt do jogo com teto de passo, não o do
 * áudio: um quadro lento atrasa a cena em vez de pular plano.
 *
 * Pular: cada bloco roda dentro de `bloco()`. Pular rejeita todas as esperas pendentes com PULAR, o bloco
 * termina ali e o roteiro segue para o seguinte (ou para o fim, se a pessoa pulou a abertura inteira).
 * Avanço rápido (`?cena=2.4`): até a marca pedida, toda espera resolve na hora, sem legenda nem som.
 */
import * as THREE from 'three';
import type { Engine, EnvPreset } from '../core/engine';
import type { Input } from '../core/input';
import type { LampSpec } from '../world/builder';
import { Ator } from './ator';
import './cine.css';

export const PULAR = Symbol('pular');
export const ENCERRAR = Symbol('encerrar');

export type V3 = [number, number, number];
export type Curva = 'linear' | 'suave' | 'entra' | 'sai';

export interface Plano {
  /** posição da câmera no começo e no fim do plano */
  de: V3;
  para?: V3;
  /** para onde ela olha */
  alvo: V3;
  alvoPara?: V3;
  /** campo de visão vertical (a direção de arte pede de 50 a 58 graus) */
  fov?: number;
  fovPara?: number;
  dur: number;
  curva?: Curva;
  /** balanço de câmera na mão, em metros */
  mao?: number;
}

/** Um cenário montado: raiz, luzes do pool fixo de seis e atmosfera. */
export interface Cenario {
  root: THREE.Object3D;
  lamps: LampSpec[];
  env: EnvPreset;
  update?: (dt: number, t: number) => void;
  /** objetos nomeados que o roteiro move (janela, folha, carroça) */
  h: Record<string, THREE.Object3D>;
}

export interface CineHost {
  engine: Engine;
  input: Input;
  reduceMotion: () => boolean;
  /** pausa e retomada do áudio do jogo inteiro */
  audioPause: (on: boolean) => void;
}

const ease = (c: Curva, t: number): number => {
  t = Math.min(1, Math.max(0, t));
  if (c === 'linear') return t;
  if (c === 'entra') return t * t;
  if (c === 'sai') return 1 - (1 - t) * (1 - t);
  return t * t * (3 - 2 * t);
};

const VISTA_KEY = 'interprete-rpg-abertura-vista';

interface Espera {
  at: number;
  res: () => void;
  rej: (e: unknown) => void;
}

/** Duração de uma legenda: 1,8 s mais 65 ms por caractere (cerca de 15 caracteres por segundo). */
export function tempoDeLeitura(texto: string): number {
  return 1.8 + texto.length * 0.065;
}

export class Cine {
  /** relógio da cena, em segundos */
  t = 0;
  paused = false;
  /** avanço rápido até a marca `ate` */
  ff = false;
  private ate: string | null = null;
  /** marca (plano) em curso, para o diagnóstico e os testes */
  marcaAtual = '';
  blocoAtual = '';
  /** pedido de pular a abertura inteira */
  pularTudo = false;
  private esperas: Espera[] = [];
  private plano: Plano | null = null;
  private planoT = 0;
  private camPos = new THREE.Vector3();
  private camAlvo = new THREE.Vector3();
  private fov = 54;
  /** foco das luzes e da sombra: o alvo da câmera */
  focus = new THREE.Vector3();
  atores: Ator[] = [];
  cenario: Cenario | null = null;
  /** câmera seguindo algo (trecho jogável); devolve posição e alvo desejados */
  seguir: ((dt: number) => { pos: THREE.Vector3; alvo: THREE.Vector3 }) | null = null;
  /** chamado a cada quadro pelo roteiro (trecho jogável, efeitos) */
  extra: Array<(dt: number) => void> = [];
  /** quadros por plano, para os testes e as capturas */
  log: string[] = [];

  private el: HTMLElement;
  private $: Record<string, HTMLElement> = {};
  private holdT = 0;
  private holdTarget: 'bloco' | 'tudo' | null = null;
  private wasPauseKey = false;

  constructor(
    private host: CineHost,
    opts: { ate?: string | null } = {},
  ) {
    this.ate = opts.ate ?? null;
    this.ff = !!this.ate;
    this.el = document.createElement('div');
    this.el.id = 'cine';
    this.el.innerHTML = `
      <div class="barra cima"></div>
      <div class="barra baixo"><div class="legenda" aria-live="polite"><span class="quem"></span><span class="txt"></span></div></div>
      <div class="letreiro"></div>
      <div class="titulo"></div>
      <div class="branco"></div>
      <div class="preto on"></div>
      <button class="pausar" aria-label="Pausar a cena" type="button"><i></i><i></i></button>
      <div class="dica"></div>
      <div class="pausa" role="dialog" aria-label="Cena em pausa">
        <div class="caixa">
          <p class="cab">Cena em pausa</p>
          <button type="button" data-a="continuar">Continuar</button>
          <button type="button" data-a="bloco" class="segura"><span class="anel"></span><span class="r">Pular esta parte</span><small>segure</small></button>
          <button type="button" data-a="tudo" class="segura"><span class="anel"></span><span class="r">Pular a abertura</span><small>segure</small></button>
        </div>
      </div>`;
    document.body.appendChild(this.el);
    for (const k of ['cima', 'baixo', 'legenda', 'quem', 'txt', 'letreiro', 'titulo', 'branco', 'preto', 'pausar', 'dica', 'pausa']) this.$[k] = this.el.querySelector('.' + k) as HTMLElement;
    this.$.pausar.addEventListener('click', () => this.pausar(true));
    const pz = this.$.pausa;
    pz.querySelector('[data-a=continuar]')!.addEventListener('click', () => this.pausar(false));
    for (const b of pz.querySelectorAll<HTMLButtonElement>('.segura')) {
      const alvo = b.dataset.a as 'bloco' | 'tudo';
      const start = (e: Event) => {
        e.preventDefault();
        this.holdTarget = alvo;
        this.holdT = 0;
      };
      const stop = () => {
        if (this.holdTarget === alvo) this.holdTarget = null;
      };
      b.addEventListener('pointerdown', start);
      b.addEventListener('pointerup', stop);
      b.addEventListener('pointerleave', stop);
      b.addEventListener('keydown', (e) => (e.code === 'Enter' || e.code === 'Space') && !e.repeat && start(e));
      b.addEventListener('keyup', (e) => (e.code === 'Enter' || e.code === 'Space') && stop());
    }
    // na primeira vez, pular só pula a parte em curso: quem pulou a febre pode querer ver a janela
    pz.querySelector<HTMLElement>('[data-a=tudo]')!.hidden = !Cine.jaViu();
    this.letterbox(true, true);
  }

  static jaViu(): boolean {
    try {
      return localStorage.getItem(VISTA_KEY) === '1';
    } catch {
      return false;
    }
  }
  static marcarVista(): void {
    try {
      localStorage.setItem(VISTA_KEY, '1');
    } catch {
      /* sem armazenamento: vale só nesta sessão */
    }
  }

  dispose(): void {
    for (const a of this.atores) a.remover();
    this.atores = [];
    if (this.cenario) this.host.engine.scene.remove(this.cenario.root);
    this.cenario = null;
    this.el.remove();
    this.host.engine.camera.fov = 58;
    this.host.engine.camera.updateProjectionMatrix();
  }

  // ---------- relógio e esperas ----------
  /** espera `s` segundos de cena; rejeita com PULAR se a pessoa pular */
  espera(s: number): Promise<void> {
    if (this.ff || s <= 0) return Promise.resolve();
    return new Promise((res, rej) => this.esperas.push({ at: this.t + s, res, rej }));
  }
  /** espera uma condição checada a cada quadro (trecho jogável) */
  ate_(cond: () => boolean): Promise<void> {
    if (this.ff) return Promise.resolve();
    return new Promise((res, rej) => {
      const e: Espera = { at: Infinity, res, rej };
      this.esperas.push(e);
      const chk = () => {
        if (!this.esperas.includes(e)) return void this.extra.splice(this.extra.indexOf(chk), 1);
        if (cond()) {
          this.esperas.splice(this.esperas.indexOf(e), 1);
          this.extra.splice(this.extra.indexOf(chk), 1);
          res();
        }
      };
      this.extra.push(chk);
    });
  }

  /** marca de plano (1.1, 2.4...): encerra o avanço rápido quando chega na marca pedida */
  marca(id: string): void {
    this.marcaAtual = id;
    this.log.push(`${this.t.toFixed(1)} ${id}`);
    if (this.ff && this.ate && id === this.ate) {
      this.ff = false;
      this.ate = null;
    }
  }

  /** roda um bloco; pular encerra o bloco e o roteiro segue */
  async bloco(id: string, fn: () => Promise<void>): Promise<void> {
    if (this.pularTudo) return;
    this.blocoAtual = id;
    try {
      await fn();
    } catch (e) {
      if (e !== PULAR) throw e;
    }
    this.limparFala();
    this.extra = [];
    this.seguir = null;
  }

  pular(tudo: boolean): void {
    if (tudo) this.pularTudo = true;
    Cine.marcarVista();
    this.pausar(false);
    const es = this.esperas.splice(0);
    for (const e of es) e.rej(PULAR);
  }

  pausar(on: boolean): void {
    if (this.paused === on) return;
    this.paused = on;
    this.holdTarget = null;
    this.$.pausa.classList.toggle('on', on);
    this.host.audioPause(on);
    if (on) (this.$.pausa.querySelector('[data-a=continuar]') as HTMLElement).focus();
  }

  // ---------- câmera ----------
  /** começa um plano e espera ele terminar */
  async filmar(p: Plano): Promise<void> {
    this.corte(p);
    await this.espera(p.dur);
  }
  /** começa um plano sem esperar */
  corte(p: Plano): void {
    this.plano = p;
    this.planoT = this.ff ? p.dur : 0;
    this.seguir = null;
    this.aplicarPlano(0);
  }

  private aplicarPlano(dt: number): void {
    const p = this.plano;
    if (!p) return;
    this.planoT += dt;
    const k = ease(p.curva ?? 'suave', p.dur > 0 ? this.planoT / p.dur : 1);
    const a = p.de;
    const b = p.para ?? p.de;
    this.camPos.set(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k);
    const la = p.alvo;
    const lb = p.alvoPara ?? p.alvo;
    this.camAlvo.set(la[0] + (lb[0] - la[0]) * k, la[1] + (lb[1] - la[1]) * k, la[2] + (lb[2] - la[2]) * k);
    const f0 = p.fov ?? 54;
    this.fov = f0 + ((p.fovPara ?? f0) - f0) * k;
    if (p.mao && !this.host.reduceMotion()) {
      const t = this.t;
      this.camPos.x += (Math.sin(t * 0.9) * 0.6 + Math.sin(t * 2.3) * 0.25) * p.mao;
      this.camPos.y += (Math.sin(t * 1.3 + 1) * 0.5 + Math.sin(t * 2.9) * 0.2) * p.mao;
    }
  }

  // ---------- texto ----------
  private falaTimer = 0;
  /** legenda inteira, sem digitação; espera o tempo de leitura (ou `dur`) */
  async fala(texto: string, o: { quem?: string; ator?: Ator; dur?: number; canto?: boolean; espera?: boolean } = {}): Promise<void> {
    const dur = o.dur ?? tempoDeLeitura(texto);
    if (this.ff) return;
    this.$.quem.textContent = o.quem ?? '';
    this.$.quem.hidden = !o.quem;
    this.$.txt.textContent = texto;
    this.$.legenda.classList.toggle('canto', !!o.canto);
    this.$.legenda.classList.add('on');
    this.log.push(`${this.t.toFixed(1)} fala ${o.quem ?? o.ator?.nome ?? ''}: ${texto}`);
    const id = ++this.falaTimer;
    if (o.ator) o.ator.falando = true;
    const fim = () => {
      if (o.ator) o.ator.falando = false;
      if (id === this.falaTimer) this.limparFala();
    };
    if (o.espera === false) {
      void this.espera(dur).then(fim, fim);
      return;
    }
    try {
      await this.espera(dur);
    } finally {
      fim();
    }
    // respiro entre falas
    await this.espera(0.35);
  }
  limparFala(): void {
    this.$.legenda.classList.remove('on');
  }

  /** letreiro de lugar ou de tempo, no canto inferior esquerdo, em Plex Mono */
  async letreiro(texto: string, dur = 4.5): Promise<void> {
    if (this.ff) return;
    const l = this.$.letreiro;
    l.textContent = texto;
    l.classList.add('on');
    this.log.push(`${this.t.toFixed(1)} letreiro ${texto}`);
    void this.espera(dur).then(
      () => l.classList.remove('on'),
      () => l.classList.remove('on'),
    );
  }

  /** título de região ao devolver o controle */
  titulo(nome: string): void {
    const t = this.$.titulo;
    t.textContent = nome;
    t.classList.add('on');
    setTimeout(() => t.classList.remove('on'), 3600);
  }

  /** dica de controle discreta (trecho jogável) */
  dica(texto: string | null): void {
    this.$.dica.textContent = texto ?? '';
    this.$.dica.classList.toggle('on', !!texto);
  }

  /** corte para preto (on) ou volta do preto, em `s` segundos, em degraus */
  async preto(on: boolean, s = 1.2): Promise<void> {
    const p = this.$.preto;
    p.style.transitionDuration = this.ff ? '0s' : `${s}s`;
    p.classList.toggle('on', on);
    await this.espera(s);
  }

  /** luz branca que toma a tela (janela): sobe em `s`, segura, desce */
  branco(nivel: number, s: number): void {
    const b = this.$.branco;
    const rm = this.host.reduceMotion();
    b.style.transitionDuration = this.ff ? '0s' : `${rm ? Math.max(3, s) : s}s`;
    b.style.opacity = String(nivel);
  }

  letterbox(on: boolean, imediato = false): void {
    this.el.classList.toggle('lb', on);
    this.el.classList.toggle('lb-instante', imediato);
  }

  /** a cena encerra e devolve a interface: some com os elementos fixos */
  fechar(): void {
    this.$.pausar.hidden = true;
    this.el.classList.add('fim');
  }

  // ---------- cenário e atores ----------
  montar(c: Cenario): void {
    const e = this.host.engine;
    for (const a of this.atores) a.remover();
    this.atores = [];
    if (this.cenario) e.scene.remove(this.cenario.root);
    this.cenario = c;
    e.scene.add(c.root);
    e.applyEnv(c.env);
    e.setLamps(c.lamps);
  }
  ator(a: Ator): Ator {
    this.atores.push(a);
    a.entrar(this.host.engine.scene);
    return a;
  }

  // ---------- quadro ----------
  update(dt: number): void {
    const inp = this.host.input;
    // Esc, Start ou o botão de pausa no toque
    const pauseKey = inp.took('pausa');
    if (pauseKey && !this.wasPauseKey) this.pausar(!this.paused);
    this.wasPauseKey = false;
    if (this.paused) {
      this.atualizarSegura(dt);
      this.cam();
      return;
    }
    this.t += dt;
    // esperas vencidas resolvem em ordem
    for (let i = 0; i < this.esperas.length; ) {
      const e = this.esperas[i];
      if (e.at <= this.t) {
        this.esperas.splice(i, 1);
        e.res();
      } else i++;
    }
    for (const f of [...this.extra]) f(dt);
    if (this.seguir) {
      const s = this.seguir(dt);
      const k = 1 - Math.exp(-3.2 * dt);
      this.camPos.lerp(s.pos, k);
      this.camAlvo.lerp(s.alvo, k);
    } else this.aplicarPlano(dt);
    for (const a of this.atores) a.update(dt, this.t);
    this.cenario?.update?.(dt, this.t);
    this.cam();
  }

  private atualizarSegura(dt: number): void {
    const b = this.holdTarget ? this.$.pausa.querySelector<HTMLElement>(`[data-a=${this.holdTarget}]`) : null;
    for (const x of this.$.pausa.querySelectorAll<HTMLElement>('.segura')) if (x !== b) x.style.setProperty('--p', '0');
    if (!b) return;
    this.holdT += dt;
    // anel em oito degraus, sem interpolar
    b.style.setProperty('--p', String(Math.floor(Math.min(1, this.holdT / 1.2) * 8) / 8));
    if (this.holdT >= 1.2) this.pular(this.holdTarget === 'tudo');
  }

  private cam(): void {
    const c = this.host.engine.camera;
    c.position.copy(this.camPos);
    c.lookAt(this.camAlvo);
    if (Math.abs(c.fov - this.fov) > 0.01) {
      c.fov = this.fov;
      c.updateProjectionMatrix();
    }
    this.focus.copy(this.camAlvo);
  }

  /** posição atual da câmera (para casar a câmera de jogo na saída) */
  get camera(): { pos: THREE.Vector3; alvo: THREE.Vector3 } {
    return { pos: this.camPos, alvo: this.camAlvo };
  }
  /** eixo "para a frente" do jogador, 0..1, de teclado, controle ou toque (dedo pousado na tela) */
  frente(): number {
    const inp = this.host.input;
    let f = inp.held('frente') ? 1 : 0;
    f = Math.max(f, -inp.padMove.y, -inp.touchMove.y, this.toque ? 1 : 0);
    return Math.min(1, Math.max(0, f));
  }
  /** toque pousado na área da cena (fora dos botões): vale como "para a frente" no trecho jogável */
  toque = false;
  ligarToque(on: boolean): void {
    const down = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest('button, .pausa')) return;
      this.toque = true;
    };
    const up = () => (this.toque = false);
    if (on) {
      this.el.classList.add('toque');
      this.el.addEventListener('pointerdown', down);
      window.addEventListener('pointerup', up);
      this.offToque = () => {
        this.el.classList.remove('toque');
        this.el.removeEventListener('pointerdown', down);
        window.removeEventListener('pointerup', up);
        this.toque = false;
      };
    } else this.offToque?.();
  }
  private offToque: (() => void) | null = null;
}
