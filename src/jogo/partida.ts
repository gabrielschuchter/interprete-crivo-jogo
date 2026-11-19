/**
 * Uma partida: simulação e desenho do mundo. Recria main.gd, player.gd, weapon_system.gd,
 * projectile.gd, enemy.gd, enemy_spawner.gd, level_system.gd, xp_gem.gd, saw_system.gd, saw.gd,
 * lightning_system.gd, boss_system.gd, boss.gd e os efeitos, com os números de config.ts.
 *
 * A física roda em passos fixos de 1/60 s (o padrão do Godot). Colisão: círculos, como no original
 * (corpos contra paredes e pedras; áreas de dano contra áreas de dano).
 */
import { ARMAS, CHEFE, GERADOR, INIMIGO, INIMIGOS, JOGADOR, MUNDO, PERSONAGENS, PROJETIL, RAIOS, SERRAS, XP, type DefArma, type DefInimigo, type Melhoria, type Personagem } from './config';
import { aproximar, atributosChefe, descricaoMelhoria, filtrarMelhorias, intervaloGeracao, ondasRajada, sortearInimigo, sortearTres, voltaSaida, xpParaNivel } from './regras';
import { quadros, type Quadro } from './recursos';
import { som } from './som';
import { CHAO_LIMITE, CHAO_RES, type Peca } from './chao';
import type { Entrada } from './entrada';

const DT = 1 / MUNDO.fisicaHz;
const TAU = Math.PI * 2;
const rnd = (a: number, b: number) => a + (b - a) * Math.random();

type EstadoChefe = 'STALK' | 'CHARGE_WIND' | 'CHARGE' | 'JUMP_WIND' | 'JUMP_AIR' | 'JUMP_LAND' | 'BARRAGE' | 'RECOVER';

interface Chefe {
  estado: EstadoChefe;
  t: number;
  cool: number;
  anim: number;
  passo: number;
  descanso: number;
  dirInvestida: { x: number; y: number };
  de: { x: number; y: number };
  para: { x: number; y: number };
  onda: number;
  ondas: number;
  ultimo: string;
  marcador: Marcador | null;
  pose: 'idle' | 'attack' | 'cast' | 'jump';
  sx: number;
  sy: number;
  px: number;
  py: number;
  rot: number;
  vx: number;
  vy: number;
}

export interface Inimigo {
  def: DefInimigo;
  x: number;
  y: number;
  vida: number;
  vidaMax: number;
  velocidade: number;
  idade: number;
  escala: number;
  surgindo: boolean;
  kx: number;
  ky: number;
  rot: number;
  quadroT: number;
  clarao: number;
  morto: boolean;
  chefe: Chefe | null;
  noAr: boolean;
}

interface Projetil {
  x: number;
  y: number;
  dx: number;
  dy: number;
  vel: number;
  dano: number;
  resta: number;
  teleguiado: boolean;
  alvo: Inimigo | null;
  raioExpl: number;
  morreParede: boolean;
  ricochetes: number;
  sprite: string;
  escala: number;
  morto: boolean;
}

interface Gema { x: number; y: number; atraida: boolean; t: number; morta: boolean }
interface ProjChefe { x: number; y: number; vx: number; vy: number; dano: number; pulso: number; morto: boolean }
interface Onda { x: number; y: number; r: number; max: number; dano: number; acertou: boolean }
interface Marcador { x: number; y: number; r: number; t: number; vida: number; morto: boolean }
interface Particula { x: number; y: number; vx: number; vy: number; vida: number; max: number; tam: number; c0: number[]; c1: number[]; cm?: number[]; grav: number; amort: number; rot: number; vrot: number; camada: 'efeito' | 'chao' }
interface Explosao { x: number; y: number; rmax: number; t: number }
interface Raio { x: number; y: number; pts: number[]; t: number }
interface Numero { x: number; y: number; v: number; t: number }
interface Serra { raio: number; ang: number; vel: number; dps: number; x: number; y: number; giro: number }

export interface Eventos {
  nivel(escolhas: Array<{ id: string; nome: string; desc: string; icone: string }>): void;
  fimNivel(): void;
  morte(tempo: number, abates: number): void;
  chefeSurgiu(): void;
  dano(): void;
}

export class Partida {
  readonly pers: Personagem;
  // jogador
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  velocidade: number;
  vida: number;
  vidaMax: number;
  regenExtra = 0;
  invul = 0;
  ima: number;
  anim: 'idle' | 'down' | 'up' | 'right' = 'idle';
  animT = 0;
  espelho = false;
  passoT = 0;
  poeiraT = 0;
  // estado
  abates = 0;
  tempo = 0;
  fim = false;
  pausada = false;
  emNivel = false;
  private morteT = -1;
  nivel = 1;
  xp = 0;
  xpProx = XP.primeiro;
  xpPorSeg = 0;
  private xpAcum = 0;
  private pendentes = 0;
  private escolhas: Melhoria[] = [];
  pilhas: Record<string, number> = {};
  // sistemas
  armas: DefArma[] = [];
  private recargas: number[] = [];
  serras: Serra[] = [];
  raiosLigados = false;
  raiosQtd = 1;
  private raiosT = 0;
  private geradorT = 0;
  private intervalo = 1;
  private escalaGeracao = 1;
  private chefeAtual: Inimigo | null = null;
  private chefeDecorrido = 0;
  private chefeProximo = CHEFE.primeiro;
  private rajadaT = GERADOR.atrasoRajada;
  private quadroFisica = 0;
  // mundo
  inimigos: Inimigo[] = [];
  projeteis: Projetil[] = [];
  gemas: Gema[] = [];
  projChefe: ProjChefe[] = [];
  ondas: Onda[] = [];
  marcadores: Marcador[] = [];
  particulas: Particula[] = [];
  explosoes: Explosao[] = [];
  raios: Raio[] = [];
  numeros: Numero[] = [];
  // câmera
  private tremT = 0;
  private tremD = 0;
  private tremM = 0;
  camOX = 0;
  camOY = 0;
  clarao = 0;
  private acum = 0;

  constructor(
    idPers: 'rogue' | 'knight',
    private entrada: Entrada,
    private pecas: Peca[],
    private chao: HTMLCanvasElement,
    private ev: Eventos,
  ) {
    this.pers = PERSONAGENS[idPers];
    this.vidaMax = this.vida = this.pers.vida;
    this.velocidade = this.pers.velocidade;
    this.ima = this.pers.ima;
    for (const id of this.pers.armas) this.adicionarArma(id);
    for (let i = 0; i < this.pers.serras; i++) this.adicionarSerra();
    this.definirNivelGerador(1);
  }

  // ---------------------------------------------------------------- laço

  avancar(dtReal: number): void {
    this.acum += Math.min(dtReal, 0.1);
    let n = 0;
    while (this.acum >= DT && n < 6) {
      this.acum -= DT;
      this.passo();
      n++;
    }
    if (n === 6) this.acum = 0;
  }

  private congelada(): boolean {
    return this.pausada || this.emNivel || (this.fim && this.morteT < 0);
  }

  private passo(): void {
    if (this.congelada()) return;
    this.quadroFisica++;
    if (this.fim) {
      // a morte deixa o mundo andar 0,6 s antes de cortar (main.gd, _on_player_died)
      this.morteT -= DT;
      if (this.morteT <= 0) {
        this.morteT = -1;
        som.tocarMusica('derrota');
        this.ev.morte(this.tempo, this.abates);
      }
    }
    this.atualizarJogador();
    this.atualizarArmas();
    this.atualizarSerras();
    this.atualizarRaios();
    this.atualizarGerador();
    this.atualizarChefeSistema();
    this.atualizarXpPassivo();
    for (const e of this.inimigos) if (!e.morto) (e.chefe ? this.atualizarChefe(e) : this.atualizarInimigo(e));
    this.atualizarProjeteis();
    this.atualizarPerigos();
    this.atualizarGemas();
    this.atualizarEfeitos();
    this.inimigos = this.inimigos.filter((e) => !e.morto);
    if (!this.fim) {
      this.tremer();
      this.tempo += DT;
    }
  }

  // ---------------------------------------------------------------- jogador

  private atualizarJogador(): void {
    const d = this.entrada.direcao();
    let desejada: typeof this.anim = 'idle';
    if (d.x !== 0 || d.y !== 0) {
      if (Math.abs(d.x) > Math.abs(d.y)) {
        desejada = 'right';
        this.espelho = d.x < 0;
      } else {
        this.espelho = false;
        desejada = d.y > 0 ? 'down' : 'up';
      }
    } else this.espelho = false;
    if (this.anim !== desejada) {
      this.anim = desejada;
      this.animT = 0;
    }
    this.animT += DT;
    const l = Math.hypot(d.x, d.y);
    this.vx = l > 0 ? (d.x / l) * this.velocidade : 0;
    this.vy = l > 0 ? (d.y / l) * this.velocidade : 0;
    this.x += this.vx * DT;
    this.y += this.vy * DT;
    const c = this.colidir(this.x, this.y + JOGADOR.pesCorpo, JOGADOR.raioCorpo);
    this.x = c.x;
    this.y = c.y - JOGADOR.pesCorpo;
    const lim = MUNDO.meio - JOGADOR.raioCorpo;
    this.x = Math.max(-lim, Math.min(lim, this.x));
    this.y = Math.max(-lim, Math.min(lim, this.y));
    const movendo = l > 0;
    if (movendo) {
      this.passoT -= DT;
      if (this.passoT <= 0) {
        this.passoT = JOGADOR.passo;
        som.tocar('footstep');
      }
      // Dust: 12 partículas a cada 0,55 s nos pés
      this.poeiraT -= DT;
      while (this.poeiraT <= 0) {
        this.poeiraT += 0.55 / 12;
        const a = -Math.PI / 2 + rnd(-1, 1) * (40 * Math.PI) / 180;
        const v = rnd(14, 38);
        this.particulas.push({ x: this.x, y: this.y + 34, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vida: 0.55, max: 0.55, tam: rnd(3, 6), c0: [204, 184, 148, 0.55], c1: [204, 184, 148, 0], grav: 50, amort: 0, rot: 0, vrot: 0, camada: 'chao' });
      }
    } else this.passoT = 0;
    if (this.invul > 0) {
      this.invul -= DT;
    } else if (this.vida > 0) {
      for (const e of this.inimigos) {
        if (e.morto || e.surgindo || e.noAr) continue;
        const r = JOGADOR.raioFerida + e.def.raio * e.escala;
        if ((e.x - this.x) ** 2 + (e.y - this.y) ** 2 <= r * r) {
          this.sofrer(e.def.danoContato);
          break;
        }
      }
    }
    if (this.vida > 0 && this.vida < this.vidaMax) this.vida = Math.min(this.vidaMax, this.vida + (JOGADOR.regenBase + this.regenExtra) * DT);
  }

  /** player.gd, apply_hit */
  sofrer(qtd: number): boolean {
    if (this.vida <= 0 || this.invul > 0) return false;
    this.vida = Math.max(0, this.vida - qtd);
    if (this.vida <= 0) {
      som.tocar('player_death');
      this.morrer();
    } else som.tocar('player_hurt');
    // took_damage
    this.tremor(9, 0.22);
    this.clarao = 0.5;
    this.ev.dano();
    const kb = this.pers.empurraoAoSofrer;
    if (kb > 0) for (const e of this.inimigos) this.empurrar(e, this.x, this.y, kb);
    this.invul = JOGADOR.invulneravel;
    return true;
  }

  private morrer(): void {
    this.fim = true;
    this.morteT = 0.6;
    som.pararMusica();
  }

  private colidir(x: number, y: number, r: number): { x: number; y: number } {
    const lim = MUNDO.paredeInterna - r;
    x = Math.max(-lim, Math.min(lim, x));
    y = Math.max(-lim, Math.min(lim, y));
    for (const p of this.pecas) {
      if (p.tipo !== 'pedra') continue;
      const cx = p.x, cy = p.y + p.cy;
      const dx = x - cx, dy = y - cy;
      const rr = r + p.raio;
      const d2 = dx * dx + dy * dy;
      if (d2 < rr * rr) {
        const d = Math.sqrt(d2) || 0.001;
        x = cx + (dx / d) * rr;
        y = cy + (dy / d) * rr;
      }
    }
    return { x, y };
  }

  // ---------------------------------------------------------------- armas

  temArma(id: string): boolean {
    return this.armas.some((a) => a.id === id);
  }

  adicionarArma(id: 'homing' | 'arrows'): void {
    if (this.temArma(id)) return;
    this.armas.push({ ...ARMAS[id] });
    this.recargas.push(0);
  }

  private atualizarArmas(): void {
    for (let i = 0; i < this.armas.length; i++) {
      this.recargas[i] -= DT;
      if (this.recargas[i] <= 0) {
        this.recargas[i] = this.armas[i].cadencia;
        this.disparar(this.armas[i]);
      }
    }
  }

  private maisProximo(x: number, y: number): Inimigo | null {
    let melhor: Inimigo | null = null, md = Infinity;
    for (const e of this.inimigos) {
      if (e.morto) continue;
      const d = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d < md) {
        md = d;
        melhor = e;
      }
    }
    return melhor;
  }

  private disparar(a: DefArma): void {
    let dx = 1, dy = 0;
    let alvo: Inimigo | null = null;
    if (a.mira === 'maisProximo') {
      alvo = this.maisProximo(this.x, this.y);
      if (!alvo) return;
      const l = Math.hypot(alvo.x - this.x, alvo.y - this.y) || 1;
      dx = (alvo.x - this.x) / l;
      dy = (alvo.y - this.y) / l;
    } else {
      const vivos = this.inimigos.filter((e) => !e.morto);
      if (!vivos.length) {
        const ang = Math.random() * TAU;
        dx = Math.cos(ang);
        dy = Math.sin(ang);
      } else {
        const e = vivos[Math.floor(Math.random() * vivos.length)];
        const ang = Math.atan2(e.y - this.y, e.x - this.x) + rnd(-PROJETIL.espalhamento, PROJETIL.espalhamento);
        dx = Math.cos(ang);
        dy = Math.sin(ang);
      }
    }
    const infinito = a.morreNaParede && a.ricochetes >= 0;
    this.projeteis.push({ x: this.x, y: this.y, dx, dy, vel: a.velocidade, dano: a.dano, resta: infinito ? Infinity : a.vida, teleguiado: a.teleguiado, alvo, raioExpl: a.raioExplosao, morreParede: a.morreNaParede, ricochetes: a.ricochetes, sprite: a.sprite, escala: a.escala, morto: false });
    som.tocar(a.teleguiado ? 'orb_cast' : 'arrow_shoot');
  }

  private atualizarProjeteis(): void {
    const lim = MUNDO.meio - PROJETIL.margemParede;
    for (const p of this.projeteis) {
      if (p.morto) continue;
      p.resta -= DT;
      if (p.resta <= 0) {
        p.morto = true;
        continue;
      }
      if (p.teleguiado) {
        if (!p.alvo || p.alvo.morto) p.alvo = this.maisProximo(p.x, p.y);
        if (p.alvo) {
          const l = Math.hypot(p.alvo.x - p.x, p.alvo.y - p.y) || 1;
          const k = Math.min(1, PROJETIL.giro * DT);
          let nx = p.dx + ((p.alvo.x - p.x) / l - p.dx) * k, ny = p.dy + ((p.alvo.y - p.y) / l - p.dy) * k;
          const nl = Math.hypot(nx, ny) || 1;
          p.dx = nx / nl;
          p.dy = ny / nl;
        }
      }
      p.x += p.dx * p.vel * DT;
      p.y += p.dy * p.vel * DT;
      if (p.morreParede) {
        let bateu = false;
        if (p.x > lim) { p.x = lim; p.dx = -Math.abs(p.dx); bateu = true; }
        else if (p.x < -lim) { p.x = -lim; p.dx = Math.abs(p.dx); bateu = true; }
        if (p.y > lim) { p.y = lim; p.dy = -Math.abs(p.dy); bateu = true; }
        else if (p.y < -lim) { p.y = -lim; p.dy = Math.abs(p.dy); bateu = true; }
        if (bateu) {
          if (p.ricochetes < 0) { /* ricochete infinito */ }
          else if (p.ricochetes > 0) p.ricochetes--;
          else { p.morto = true; continue; }
        }
      }
      for (const e of this.inimigos) {
        if (e.morto) continue;
        const r = PROJETIL.raio + e.def.raio * e.escala;
        if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 > r * r) continue;
        this.ferir(e, p.dano, p.x, p.y);
        som.tocar('enemy_hit', 0, 25);
        this.faisca(p.x, p.y);
        if (p.raioExpl > 0) {
          som.tocar('explosion');
          this.explodir(p.x, p.y, p.raioExpl, p.dano * PROJETIL.fatorExplosao);
        }
        p.morto = true;
        break;
      }
    }
    this.projeteis = this.projeteis.filter((p) => !p.morto);
  }

  private explodir(x: number, y: number, r: number, dano: number): void {
    for (const e of this.inimigos) if (!e.morto && Math.hypot(e.x - x, e.y - y) <= r) this.ferir(e, dano, x, y);
    this.explosoes.push({ x, y, rmax: r, t: 0 });
  }

  // ---------------------------------------------------------------- serras e raios

  adicionarSerra(): void {
    this.serras.push({ raio: 0, ang: 0, vel: 0, dps: 0, x: 0, y: 0, giro: 0 });
    const n = this.serras.length;
    this.serras.forEach((s, i) => {
      s.raio = SERRAS.raioBase + i * SERRAS.passoRaio + SERRAS.crescimentoRaio * i * i;
      s.ang = (i / n) * TAU;
      s.vel = SERRAS.giro * Math.max(0.5, 1 - 0.12 * i) * (i % 2 === 0 ? 1 : -1);
      s.dps = SERRAS.dps;
    });
  }

  private atualizarSerras(): void {
    const toque = this.quadroFisica % SERRAS.quadrosPorToque === 0;
    const dano = SERRAS.dps * DT * SERRAS.quadrosPorToque;
    for (const s of this.serras) {
      s.ang += s.vel * DT;
      s.x = Math.cos(s.ang) * s.raio;
      s.y = Math.sin(s.ang) * s.raio;
      s.giro += SERRAS.giroVisual * DT;
      if (!toque) continue;
      const sx = this.x + s.x, sy = this.y + s.y;
      for (const e of this.inimigos) {
        if (e.morto) continue;
        const r = SERRAS.raio + e.def.raio * e.escala;
        if ((e.x - sx) ** 2 + (e.y - sy) ** 2 > r * r) continue;
        this.ferir(e, dano, null, null);
        som.tocar('saw_hit', 0, 120);
      }
    }
  }

  ligarRaios(): void {
    if (!this.raiosLigados) {
      this.raiosLigados = true;
      this.raiosT = RAIOS.intervalo;
    } else this.raiosQtd++;
  }

  private atualizarRaios(): void {
    if (!this.raiosLigados) return;
    this.raiosT -= DT;
    if (this.raiosT > 0) return;
    this.raiosT += RAIOS.intervalo;
    const todos = this.inimigos.slice();
    if (!todos.length) return;
    let pool = todos;
    const perto = todos.filter((e) => Math.hypot(e.x - this.x, e.y - this.y) <= RAIOS.alcance);
    if (perto.length) pool = perto;
    som.tocar('lightning');
    for (let i = 0; i < this.raiosQtd; i++) {
      const alvo = pool[Math.floor(Math.random() * pool.length)];
      this.raios.push({ x: alvo.x, y: alvo.y, pts: this.zigue(), t: 0 });
      this.ferir(alvo, RAIOS.dano, null, null);
    }
  }

  private zigue(): number[] {
    const pts: number[] = [];
    let y = -440;
    pts.push(rnd(-30, 30), y);
    while (y < 0) {
      y += rnd(28, 52);
      pts.push(rnd(-26, 26), Math.min(y, 0));
    }
    pts.push(0, 0);
    return pts;
  }

  // ---------------------------------------------------------------- inimigos

  private definirNivelGerador(n: number): void {
    this.intervalo = intervaloGeracao(n);
  }

  private atualizarGerador(): void {
    this.rajadaT -= DT;
    if (this.rajadaT <= 0 && this.rajadaT > -DT) for (let i = 0; i < GERADOR.rajadaInicial; i++) this.gerar('normal');
    const efetivo = Math.max(0.001, this.intervalo / this.escalaGeracao);
    this.geradorT += DT;
    let n = 0;
    while (this.geradorT >= efetivo && n < GERADOR.maxPorQuadro) {
      this.geradorT -= efetivo;
      this.gerar(sortearInimigo(Math.random()));
      n++;
    }
    if (this.geradorT > efetivo) this.geradorT = efetivo;
  }

  private gerar(tipo: 'normal' | 'rapido' | 'gigante'): void {
    const a = Math.random() * TAU;
    const d = rnd(GERADOR.distMin, GERADOR.distMax);
    const lim = MUNDO.meio - 32;
    const x = Math.max(-lim, Math.min(lim, this.x + Math.cos(a) * d));
    const y = Math.max(-lim, Math.min(lim, this.y + Math.sin(a) * d));
    this.inimigos.push(this.novoInimigo(INIMIGOS[tipo], x, y));
  }

  private novoInimigo(def: DefInimigo, x: number, y: number): Inimigo {
    return { def, x, y, vida: def.vida, vidaMax: def.vida, velocidade: def.velocidade, idade: 0, escala: 0.01, surgindo: true, kx: 0, ky: 0, rot: 0, quadroT: Math.random(), clarao: 0, morto: false, chefe: null, noAr: false };
  }

  private crescer(e: Inimigo): void {
    if (!e.surgindo) return;
    e.idade += DT;
    const t = Math.min(1, e.idade / INIMIGO.crescimento);
    e.escala = Math.max(0.01, voltaSaida(t));
    if (t >= 1) {
      e.escala = 1;
      e.surgindo = false;
    }
  }

  private atualizarInimigo(e: Inimigo): void {
    this.crescer(e);
    e.quadroT += DT;
    if (e.clarao > 0) e.clarao = Math.max(0, e.clarao - DT / 0.12);
    const l = Math.hypot(this.x - e.x, this.y - e.y) || 1;
    const dx = (this.x - e.x) / l, dy = (this.y - e.y) / l;
    if (e.def.gira) e.rot = Math.atan2(dy, dx) + Math.PI / 2;
    e.x += (dx * e.velocidade + e.kx) * DT;
    e.y += (dy * e.velocidade + e.ky) * DT;
    const c = this.colidir(e.x, e.y + e.def.corpoY * e.escala, e.def.raio * e.escala);
    e.x = c.x;
    e.y = c.y - e.def.corpoY * e.escala;
    const kl = Math.hypot(e.kx, e.ky);
    if (kl > 0) {
      const nl = Math.max(0, kl - INIMIGO.decaimento * DT);
      e.kx = (e.kx / kl) * nl;
      e.ky = (e.ky / kl) * nl;
    }
  }

  private empurrar(e: Inimigo, x: number, y: number, forca: number): void {
    const dx = e.x - x, dy = e.y - y;
    const l = Math.hypot(dx, dy);
    if (l > 0.01) {
      e.kx = (dx / l) * forca;
      e.ky = (dy / l) * forca;
    }
  }

  /** enemy.gd, take_damage; x e y nulos = sem empurrão (Vector2.INF) */
  ferir(e: Inimigo, qtd: number, x: number | null, y: number | null): void {
    if (e.vida <= 0) return;
    e.vida -= qtd;
    this.numeros.push({ x: e.x, y: e.y, v: Math.round(qtd), t: 0 });
    e.clarao = 1;
    if (x !== null && y !== null) this.empurrar(e, x, y, INIMIGO.empurrao);
    if (e.vida <= 0) {
      som.tocar('enemy_death', 0, 40);
      this.explosaoSangue(e.x, e.y);
      e.morto = true;
      this.aoMorrerInimigo(e);
    }
  }

  private aoMorrerInimigo(e: Inimigo): void {
    this.abates++;
    if (e.chefe) {
      const qtd = 50 + this.nivel * 3;
      const lim = MUNDO.meio - 24;
      for (let i = 0; i < qtd; i++) {
        const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * 250;
        this.gemas.push({ x: Math.max(-lim, Math.min(lim, e.x + Math.cos(a) * r)), y: Math.max(-lim, Math.min(lim, e.y + Math.sin(a) * r)), atraida: false, t: 0, morta: false });
      }
      this.explosaoChefe(e.x, e.y);
      this.tremor(22, 0.55);
      // boss_system.gd, _on_boss_died
      this.chefeAtual = null;
      this.chefeDecorrido = 0;
      this.chefeProximo = CHEFE.repeticao;
      this.escalaGeracao = 1;
    } else this.gemas.push({ x: e.x, y: e.y, atraida: false, t: 0, morta: false });
  }

  // ---------------------------------------------------------------- chefe

  private atualizarChefeSistema(): void {
    if (this.chefeAtual && !this.chefeAtual.morto) return;
    this.chefeDecorrido += DT;
    if (this.chefeDecorrido >= this.chefeProximo) this.gerarChefe();
  }

  chefe(): Inimigo | null {
    return this.chefeAtual && !this.chefeAtual.morto ? this.chefeAtual : null;
  }

  gerarChefe(): void {
    if (this.chefe() || this.fim) return;
    const at = atributosChefe(this.nivel);
    const a = Math.random() * TAU;
    const lim = MUNDO.meio - 80;
    const x = Math.max(-lim, Math.min(lim, this.x + Math.cos(a) * CHEFE.distancia));
    const y = Math.max(-lim, Math.min(lim, this.y + Math.sin(a) * CHEFE.distancia));
    const e = this.novoInimigo(INIMIGOS.chefe, x, y);
    e.vida = e.vidaMax = at.vida;
    e.chefe = { estado: 'STALK', t: 0, cool: 1, anim: 0, passo: at.passo, descanso: at.descanso, dirInvestida: { x: 0, y: 0 }, de: { x: 0, y: 0 }, para: { x: 0, y: 0 }, onda: 0, ondas: 3, ultimo: '', marcador: null, pose: 'idle', sx: 1, sy: 1, px: 0, py: 0, rot: 0, vx: 0, vy: 0 };
    this.inimigos.push(e);
    this.chefeAtual = e;
    this.escalaGeracao = CHEFE.escalaGeracao;
    this.tremor(16, 0.6);
    som.tocar('rugido');
    this.ev.chefeSurgiu();
  }

  private atualizarChefe(e: Inimigo): void {
    const c = e.chefe as Chefe;
    this.crescer(e);
    if (e.clarao > 0) e.clarao = Math.max(0, e.clarao - DT / 0.12);
    const tx = this.x - e.x, ty = this.y - e.y;
    const dist = Math.hypot(tx, ty) || 1;
    switch (c.estado) {
      case 'STALK': {
        c.pose = 'idle';
        c.vx = (tx / dist) * c.passo;
        c.vy = (ty / dist) * c.passo;
        c.anim += DT;
        const resp = 0.04 * Math.sin(c.anim * 3);
        c.sx = 1 - resp;
        c.sy = 1 + resp;
        c.py = -Math.abs(Math.sin(c.anim * 7)) * 5;
        c.rot = ((3 * Math.PI) / 180) * Math.sin(c.anim * 3.5);
        c.cool -= DT;
        if (c.cool <= 0) this.escolherGolpe(e, c, dist);
        break;
      }
      case 'CHARGE_WIND': {
        c.vx = c.vy = 0;
        c.t -= DT;
        const k = 1 - c.t / CHEFE.preparoInvestida;
        c.sx = 1 + 0.15 * k;
        c.sy = 1 - 0.12 * k;
        if (c.t <= 0) {
          c.sx = c.sy = 1;
          som.tocar('boss_charge');
          this.tremor(8, 0.22);
          c.estado = 'CHARGE';
          c.t = CHEFE.investida;
        }
        break;
      }
      case 'CHARGE':
        c.vx = c.dirInvestida.x * CHEFE.velInvestida;
        c.vy = c.dirInvestida.y * CHEFE.velInvestida;
        c.sx = 1.12;
        c.sy = 0.9;
        c.t -= DT;
        if (c.t <= 0) this.recuperar(c);
        break;
      case 'JUMP_WIND': {
        c.vx = c.vy = 0;
        c.t -= DT;
        const k = 1 - c.t / CHEFE.preparoSalto;
        c.sx = 1 + 0.22 * k;
        c.sy = 1 - 0.2 * k;
        if (c.t <= 0) {
          som.tocar('boss_jump');
          c.de = { x: e.x, y: e.y };
          c.estado = 'JUMP_AIR';
          c.t = CHEFE.ar;
          e.noAr = true;
        }
        break;
      }
      case 'JUMP_AIR': {
        c.t -= DT;
        const p = Math.max(0, Math.min(1, 1 - c.t / CHEFE.ar));
        e.x = c.de.x + (c.para.x - c.de.x) * p;
        e.y = c.de.y + (c.para.y - c.de.y) * p;
        c.vx = c.vy = 0;
        c.px = 0;
        c.py = -Math.sin(p * Math.PI) * 150;
        c.sx = 0.9;
        c.sy = 1.14;
        if (c.t <= 0) {
          e.x = c.para.x;
          e.y = c.para.y;
          c.py = 0;
          this.pousar(e, c);
        }
        break;
      }
      case 'JUMP_LAND':
        c.vx = c.vy = 0;
        c.sx = aproximar(c.sx, 1, DT * 3);
        c.sy = aproximar(c.sy, 1, DT * 3);
        c.t -= DT;
        if (c.t <= 0) {
          c.sx = c.sy = 1;
          this.recuperar(c);
        }
        break;
      case 'BARRAGE':
        c.vx = c.vy = 0;
        c.t -= DT;
        if (c.onda === 0) {
          const k = Math.max(0, Math.min(1, 1 - c.t / CHEFE.preparoRajada));
          const s = 1 + 0.1 * k + 0.03 * Math.sin(c.t * 30);
          c.sx = c.sy = s;
        }
        if (c.t <= 0) {
          if (c.onda < c.ondas) {
            this.dispararAnel(e, c, c.onda);
            c.onda++;
            c.t = CHEFE.intervaloOndas;
          } else this.recuperar(c);
        }
        break;
      case 'RECOVER': {
        const l = Math.hypot(c.vx, c.vy);
        if (l > 0) {
          const nl = Math.max(0, l - 1400 * DT);
          c.vx = (c.vx / l) * nl;
          c.vy = (c.vy / l) * nl;
        }
        c.sx = aproximar(c.sx, 1, DT * 2.5);
        c.sy = aproximar(c.sy, 1, DT * 2.5);
        const pl = Math.hypot(c.px, c.py);
        if (pl > 0) {
          const nl = Math.max(0, pl - DT * 500);
          c.px = (c.px / pl) * nl;
          c.py = (c.py / pl) * nl;
        }
        c.t -= DT;
        if (c.t <= 0) {
          c.sx = c.sy = 1;
          c.px = c.py = 0;
          c.cool = c.descanso;
          c.estado = 'STALK';
        }
        break;
      }
    }
    if (c.estado !== 'JUMP_AIR') {
      e.x += c.vx * DT;
      e.y += c.vy * DT;
      const r = this.colidir(e.x, e.y + INIMIGOS.chefe.corpoY * e.escala, INIMIGOS.chefe.raio * e.escala);
      e.x = r.x;
      e.y = r.y - INIMIGOS.chefe.corpoY * e.escala;
    }
  }

  private escolherGolpe(e: Inimigo, c: Chefe, dist: number): void {
    const opts = ['jump'];
    if (dist <= 650) opts.push('charge');
    if (dist >= 220) opts.push('barrage', 'barrage');
    let escolha = opts[Math.floor(Math.random() * opts.length)];
    if (escolha === 'jump' && c.ultimo === 'jump') escolha = 'charge';
    c.ultimo = escolha;
    if (escolha === 'charge') {
      c.estado = 'CHARGE_WIND';
      c.t = CHEFE.preparoInvestida;
      c.pose = 'attack';
      const l = Math.hypot(this.x - e.x, this.y - e.y) || 1;
      c.dirInvestida = { x: (this.x - e.x) / l, y: (this.y - e.y) / l };
    } else if (escolha === 'jump') {
      c.estado = 'JUMP_WIND';
      c.t = CHEFE.preparoSalto;
      c.pose = 'jump';
      const janela = (CHEFE.preparoSalto + CHEFE.ar) * CHEFE.antecipacao;
      let px = this.x + this.vx * janela, py = this.y + this.vy * janela;
      const ox = px - e.x, oy = py - e.y;
      const ol = Math.hypot(ox, oy);
      if (ol > CHEFE.saltoMax) {
        px = e.x + (ox / ol) * CHEFE.saltoMax;
        py = e.y + (oy / ol) * CHEFE.saltoMax;
      }
      const lim = MUNDO.meio - 80;
      c.para = { x: Math.max(-lim, Math.min(lim, px)), y: Math.max(-lim, Math.min(lim, py)) };
      const m: Marcador = { x: c.para.x, y: c.para.y, r: CHEFE.raioOnda, t: 0, vida: 2.5, morto: false };
      this.marcadores.push(m);
      c.marcador = m;
    } else {
      c.estado = 'BARRAGE';
      c.pose = 'cast';
      c.onda = 0;
      c.ondas = ondasRajada(this.nivel);
      c.t = CHEFE.preparoRajada;
    }
  }

  private pousar(e: Inimigo, c: Chefe): void {
    e.noAr = false;
    c.estado = 'JUMP_LAND';
    c.t = CHEFE.pouso;
    som.tocar('boss_land');
    c.sx = 1.3;
    c.sy = 0.72;
    if (c.marcador) c.marcador.morto = true;
    c.marcador = null;
    this.ondas.push({ x: e.x, y: e.y, r: 0, max: CHEFE.raioOnda, dano: CHEFE.danoSalto, acertou: false });
    this.tremor(16, 0.4);
  }

  private dispararAnel(e: Inimigo, c: Chefe, i: number): void {
    som.tocar('boss_fireball');
    const n = CHEFE.porOnda;
    const off = (i * (TAU / n)) / c.ondas;
    for (let k = 0; k < n; k++) {
      const a = (k * TAU) / n + off;
      const dx = Math.cos(a), dy = Math.sin(a);
      this.projChefe.push({ x: e.x + dx * 70, y: e.y + dy * 70, vx: dx * CHEFE.velProjetil, vy: dy * CHEFE.velProjetil, dano: CHEFE.danoProjetil, pulso: 0, morto: false });
    }
    c.sx = c.sy = 1.1;
  }

  private recuperar(c: Chefe): void {
    c.estado = 'RECOVER';
    c.t = CHEFE.recuperacao;
    c.pose = 'idle';
    c.rot = 0;
  }

  private atualizarPerigos(): void {
    for (const p of this.projChefe) {
      p.x += p.vx * DT;
      p.y += p.vy * DT;
      p.pulso += DT * 18;
      if (Math.abs(p.x) > MUNDO.meio || Math.abs(p.y) > MUNDO.meio) {
        p.morto = true;
        continue;
      }
      const r = CHEFE.raioProjetil + JOGADOR.raioCorpo;
      if ((p.x - this.x) ** 2 + (p.y - (this.y + JOGADOR.pesCorpo)) ** 2 <= r * r) {
        this.sofrer(p.dano);
        p.morto = true;
      }
    }
    this.projChefe = this.projChefe.filter((p) => !p.morto);
    for (const o of this.ondas) {
      o.r += CHEFE.velOnda * DT;
      if (!o.acertou && Math.hypot(this.x - o.x, this.y - o.y) <= o.r) {
        o.acertou = true;
        this.sofrer(o.dano);
      }
    }
    this.ondas = this.ondas.filter((o) => o.r < o.max);
    for (const m of this.marcadores) {
      m.t += DT;
      m.vida -= DT;
      if (m.vida <= 0) m.morto = true;
    }
    this.marcadores = this.marcadores.filter((m) => !m.morto);
  }

  // ---------------------------------------------------------------- experiência

  private atualizarGemas(): void {
    const ri = this.ima + XP.raioGema;
    for (const g of this.gemas) {
      g.t += DT;
      if (!g.atraida && (g.x - this.x) ** 2 + (g.y - this.y) ** 2 <= ri * ri) g.atraida = true;
      if (!g.atraida) continue;
      const dx = this.x - g.x, dy = this.y - g.y;
      const l = Math.hypot(dx, dy);
      const passo = XP.voo * DT;
      if (l <= passo) {
        g.x = this.x;
        g.y = this.y;
      } else {
        g.x += (dx / l) * passo;
        g.y += (dy / l) * passo;
      }
      if (Math.hypot(this.x - g.x, this.y - g.y) <= XP.coleta) {
        g.morta = true;
        this.ganharXp(1);
        som.tocarUnico('xp');
      }
    }
    this.gemas = this.gemas.filter((g) => !g.morta);
  }

  private atualizarXpPassivo(): void {
    if (this.xpPorSeg <= 0) return;
    this.xpAcum += this.xpPorSeg * DT;
    while (this.xpAcum >= 1) {
      this.xpAcum -= 1;
      this.ganharXp(1);
    }
  }

  ganharXp(qtd: number): void {
    this.xp += qtd;
    while (this.xp >= this.xpProx) {
      this.xp -= this.xpProx;
      this.nivel++;
      this.xpProx = xpParaNivel(this.nivel);
      this.subiuNivel();
    }
  }

  /** depuração (tecla L): XP exata para um nível */
  forcarNivel(): void {
    if (!this.fim) this.ganharXp(Math.max(1, this.xpProx - this.xp));
  }

  private subiuNivel(): void {
    som.tocar('nivel');
    this.definirNivelGerador(this.nivel);
    for (const g of this.gemas) g.atraida = true;
    this.pendentes++;
    if (!this.emNivel) this.mostrarNivel();
  }

  private mostrarNivel(): void {
    const pool = filtrarMelhorias(this.pilhas, this.pers.especiais, (id) => this.temArma(id));
    this.escolhas = sortearTres(pool);
    this.emNivel = true;
    this.entrada.soltar();
    this.ev.nivel(this.escolhas.map((u) => ({ id: u.id, nome: u.nome, desc: descricaoMelhoria(u, this.pilhas), icone: u.icone })));
  }

  escolher(i: number): void {
    if (!this.emNivel || !this.escolhas[i]) return;
    som.tocar('melhoria');
    this.aplicar(this.escolhas[i].id);
    this.pendentes--;
    // como no original, níveis acumulados mantêm o painel com as mesmas três cartas
    if (this.pendentes > 0) return;
    this.emNivel = false;
    this.ev.fimNivel();
  }

  aplicar(id: string): void {
    this.pilhas[id] = (this.pilhas[id] ?? 0) + 1;
    const flechas = (f: (a: DefArma) => void) => this.armas.filter((a) => !a.teleguiado).forEach(f);
    switch (id) {
      case 'missiles': flechas((a) => (a.cadencia *= 0.85)); break;
      case 'homing': this.armas.filter((a) => a.teleguiado).forEach((a) => (a.cadencia *= 0.85)); break;
      case 'speed': this.velocidade *= 1.2; break;
      case 'maxhp': this.vidaMax += 50; break;
      case 'xprate': this.xpPorSeg += 1; break;
      case 'regen': this.regenExtra += 1.5; break;
      case 'explode': flechas((a) => (a.raioExplosao = a.raioExplosao <= 0 ? 60 : a.raioExplosao + 30)); break;
      case 'bounce':
        if (this.pilhas.bounce >= 2) flechas((a) => { a.ricochetes = -1; a.vida = 30; });
        else flechas((a) => (a.ricochetes += 2));
        break;
      case 'saw': this.adicionarSerra(); break;
      case 'lightning': this.ligarRaios(); break;
      case 'flaming': this.adicionarArma('arrows'); break;
    }
  }

  // ---------------------------------------------------------------- efeitos

  tremor(m: number, d: number): void {
    this.tremM = m;
    this.tremD = d;
    this.tremT = d;
  }

  private tremer(): void {
    if (this.tremT <= 0) return;
    this.tremT -= DT;
    if (this.tremT <= 0) {
      this.camOX = this.camOY = 0;
      return;
    }
    const k = this.tremT / this.tremD;
    this.camOX = rnd(-1, 1) * this.tremM * k;
    this.camOY = rnd(-1, 1) * this.tremM * k;
  }

  private rajada(x: number, y: number, n: number, vida: number, dir: number, abertura: number, grav: number, v0: number, v1: number, a0: number, a1: number, t0: number, t1: number, c0: number[], c1: number[], cm?: number[], vrot = 0): void {
    for (let i = 0; i < n; i++) {
      const a = dir + rnd(-1, 1) * abertura;
      const v = rnd(v0, v1);
      this.particulas.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vida, max: vida, tam: rnd(t0, t1), c0, c1, cm, grav, amort: rnd(a0, a1), rot: 0, vrot: rnd(-vrot, vrot), camada: 'efeito' });
    }
  }

  /** death_burst.gd, em vinho */
  private explosaoSangue(x: number, y: number): void {
    this.rajada(x, y, 28, 0.6, -Math.PI / 2, (110 * Math.PI) / 180, 520, 220, 560, 80, 200, 2, 7, [178, 58, 82, 1], [65, 2, 48, 0], [140, 21, 53, 1], 500);
  }
  /** hit_spark.gd, em brasa */
  private faisca(x: number, y: number): void {
    this.rajada(x, y, 9, 0.28, -Math.PI / 2, Math.PI, 0, 130, 280, 120, 240, 1.5, 3, [255, 194, 122, 1], [168, 90, 28, 0]);
  }
  /** boss_explosion.gd */
  private explosaoChefe(x: number, y: number): void {
    this.rajada(x, y, 90, 0.9, -Math.PI / 2, Math.PI, 0, 220, 620, 0, 0, 4, 10, [255, 220, 160, 1], [110, 15, 41, 0]);
  }

  private atualizarEfeitos(): void {
    for (const p of this.particulas) {
      p.vida -= DT;
      p.vy += p.grav * DT;
      if (p.amort > 0) {
        const l = Math.hypot(p.vx, p.vy);
        if (l > 0) {
          const nl = Math.max(0, l - p.amort * DT);
          p.vx = (p.vx / l) * nl;
          p.vy = (p.vy / l) * nl;
        }
      }
      p.x += p.vx * DT;
      p.y += p.vy * DT;
      p.rot += (p.vrot * Math.PI * DT) / 180;
    }
    this.particulas = this.particulas.filter((p) => p.vida > 0);
    for (const x of this.explosoes) x.t += DT;
    this.explosoes = this.explosoes.filter((x) => x.t < 0.35);
    for (const r of this.raios) r.t += DT;
    this.raios = this.raios.filter((r) => r.t < 0.28);
    for (const n of this.numeros) n.t += DT;
    this.numeros = this.numeros.filter((n) => n.t < 0.6);
    if (this.clarao > 0) this.clarao = Math.max(0, this.clarao - (0.5 / 0.3) * DT);
  }

  // ---------------------------------------------------------------- desenho

  desenhar(g: CanvasRenderingContext2D, iw: number, ih: number, k: number): { fx: number; fy: number } {
    const cx = this.x + this.camOX, cy = this.y + this.camOY;
    const sx = (wx: number) => (wx - cx) * k + iw / 2;
    const sy = (wy: number) => (wy - cy) * k + ih / 2;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#000';
    g.fillRect(0, 0, iw, ih);
    g.imageSmoothingEnabled = true;
    // chão
    const meiaW = iw / 2 / k, meiaH = ih / 2 / k;
    const x0 = cx - meiaW, y0 = cy - meiaH;
    const srcX = (x0 + CHAO_LIMITE) * CHAO_RES, srcY = (y0 + CHAO_LIMITE) * CHAO_RES;
    g.drawImage(this.chao, srcX, srcY, meiaW * 2 * CHAO_RES, meiaH * 2 * CHAO_RES, 0, 0, iw, ih);
    const vis = (x: number, y: number, m: number) => Math.abs(x - cx) < meiaW + m && Math.abs(y - cy) < meiaH + m;
    g.setTransform(k, 0, 0, k, iw / 2 - cx * k, ih / 2 - cy * k);
    for (const p of this.pecas) if (p.tipo === 'tufo' && vis(p.x, p.y, 80)) this.sprite(g, quadros[p.quadro], p.x, p.y, p.escala, 0, p.espelho);
    for (const p of this.particulas) if (p.camada === 'chao') this.particula(g, p);
    // camada baixa: marcadores, explosões, gemas, projéteis, cordas das serras
    for (const m of this.marcadores) {
      const pulso = 0.5 + 0.5 * Math.sin(m.t * 9);
      g.fillStyle = 'rgba(214,40,57,0.12)';
      g.beginPath(); g.arc(m.x, m.y, m.r, 0, TAU); g.fill();
      g.strokeStyle = `rgba(214,40,57,${0.45 + 0.35 * pulso})`;
      g.lineWidth = 6;
      g.beginPath(); g.arc(m.x, m.y, m.r, 0, TAU); g.stroke();
      g.lineWidth = 3;
      g.beginPath(); g.moveTo(m.x - m.r, m.y); g.lineTo(m.x + m.r, m.y); g.moveTo(m.x, m.y - m.r); g.lineTo(m.x, m.y + m.r); g.stroke();
    }
    for (const x of this.explosoes) {
      const r = x.rmax * (0.3 + 0.7 * Math.min(1, x.t / 0.15));
      const a = 0.6 * (1 - x.t / 0.35);
      g.fillStyle = `rgba(229,168,95,${a})`;
      g.beginPath(); g.arc(x.x, x.y, r, 0, TAU); g.fill();
    }
    for (const gm of this.gemas) if (vis(gm.x, gm.y, 30)) this.sprite(g, quadros.xp, gm.x, gm.y, XP.escala, 0, false, 1, Math.cos(gm.t * XP.giro), 1);
    for (const p of this.projeteis) if (vis(p.x, p.y, 40)) this.sprite(g, quadros[p.sprite], p.x, p.y, p.escala, Math.atan2(p.dy, p.dx));
    for (const p of this.projChefe) {
      if (!vis(p.x, p.y, 40)) continue;
      const f = 1 + 0.12 * Math.sin(p.pulso), R = CHEFE.raioProjetil;
      g.fillStyle = 'rgba(168,90,28,0.35)'; g.beginPath(); g.arc(p.x, p.y, R * 1.35 * f, 0, TAU); g.fill();
      g.fillStyle = 'rgba(229,168,95,0.95)'; g.beginPath(); g.arc(p.x, p.y, R * f, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,240,200,1)'; g.beginPath(); g.arc(p.x, p.y, R * 0.55 * f, 0, TAU); g.fill();
    }
    g.strokeStyle = 'rgba(143,116,56,0.9)';
    g.lineWidth = 2;
    for (const s of this.serras) {
      g.beginPath(); g.moveTo(this.x, this.y); g.lineTo(this.x + s.x, this.y + s.y); g.stroke();
    }
    // atores por profundidade dos pés
    const atores: Array<{ y: number; f: () => void }> = [];
    atores.push({ y: this.y + JOGADOR.pesCorpo, f: () => this.desenharJogador(g) });
    for (const e of this.inimigos) if (vis(e.x, e.y, 260)) atores.push({ y: e.y + e.def.pes * e.escala, f: () => this.desenharInimigo(g, e) });
    for (const p of this.pecas) if (p.tipo === 'pedra' && vis(p.x, p.y, 120)) atores.push({ y: p.y, f: () => this.desenharPedra(g, p) });
    atores.sort((a, b) => a.y - b.y);
    for (const a of atores) a.f();
    // serras acima
    for (const s of this.serras) this.sprite(g, quadros.serra, this.x + s.x, this.y + s.y, SERRAS.escala, s.giro);
    // efeitos
    for (const p of this.particulas) if (p.camada === 'efeito') this.particula(g, p);
    for (const r of this.raios) {
      const a = r.t < 0.06 ? 1 : 1 - (r.t - 0.06) / 0.22;
      g.lineJoin = 'round';
      g.lineCap = 'round';
      g.beginPath();
      for (let i = 0; i < r.pts.length; i += 2) (i ? g.lineTo : g.moveTo).call(g, r.x + r.pts[i], r.y + r.pts[i + 1]);
      g.strokeStyle = `rgba(127,149,192,${0.5 * a})`; g.lineWidth = 9; g.stroke();
      g.strokeStyle = `rgba(240,229,211,${a})`; g.lineWidth = 3; g.stroke();
    }
    for (const o of this.ondas) {
      const t = Math.min(1, o.r / o.max), a = 1 - t;
      g.strokeStyle = `rgba(229,168,95,${a})`; g.lineWidth = 16 * (1 - 0.5 * t);
      g.beginPath(); g.arc(o.x, o.y, o.r, 0, TAU); g.stroke();
      g.strokeStyle = `rgba(255,224,170,${a * 0.7})`; g.lineWidth = 6;
      g.beginPath(); g.arc(o.x, o.y, o.r * 0.9, 0, TAU); g.stroke();
    }
    g.font = '500 18px "IBM Plex Mono", monospace';
    g.textBaseline = 'top';
    g.lineJoin = 'round';
    for (const n of this.numeros) {
      const a = 1 - n.t / 0.6;
      const y = n.y - 28 - 40 * (n.t / 0.6);
      g.globalAlpha = a;
      g.lineWidth = 4;
      g.strokeStyle = '#0b0709';
      g.strokeText(String(n.v), n.x - 12, y);
      g.fillStyle = '#ffc27a';
      g.fillText(String(n.v), n.x - 12, y);
    }
    g.globalAlpha = 1;
    g.setTransform(1, 0, 0, 1, 0, 0);
    return { fx: sx(this.x), fy: sy(this.y) };
  }

  private sprite(g: CanvasRenderingContext2D, q: Quadro | undefined, x: number, y: number, escala: number, rot = 0, espelho = false, alfa = 1, sxx = 1, syy = 1, clarao = 0): void {
    if (!q) return;
    g.save();
    g.translate(x, y);
    if (rot) g.rotate(rot);
    g.scale(escala * sxx * (espelho ? -1 : 1), escala * syy);
    g.globalAlpha = alfa;
    g.drawImage(q.img, q.ox - q.w / 2, q.oy - q.h / 2, q.w, q.h);
    if (clarao > 0 && q.branco) {
      g.globalAlpha = alfa * clarao;
      g.drawImage(q.branco, q.ox - q.w / 2, q.oy - q.h / 2, q.w, q.h);
    }
    g.restore();
  }

  private particula(g: CanvasRenderingContext2D, p: Particula): void {
    const t = 1 - p.vida / p.max;
    let c: number[];
    if (p.cm) c = t < 0.45 ? mistura(p.c0, p.cm, t / 0.45) : mistura(p.cm, p.c1, (t - 0.45) / 0.55);
    else c = mistura(p.c0, p.c1, t);
    g.fillStyle = `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${c[3]})`;
    g.fillRect(p.x - p.tam / 2, p.y - p.tam / 2, p.tam, p.tam);
  }

  private desenharJogador(g: CanvasRenderingContext2D): void {
    const pre = this.pers.quadros;
    let nome: string;
    if (this.anim === 'idle') nome = pre === 'mago' ? 'mago_idle' : 'cav_down_0';
    else {
      const fps = pre === 'cav' && this.anim === 'right' ? 5 : pre === 'cav' ? 9 : 8;
      nome = `${pre}_${this.anim}_${Math.floor(this.animT * fps) % 4}`;
    }
    let alfa = 1;
    if (this.invul > 0) alfa = this.invul % 0.2 < 0.1 ? 0.3 : 1;
    this.sprite(g, quadros[nome], this.x, this.y, this.pers.escala, 0, this.espelho, alfa);
  }

  private desenharInimigo(g: CanvasRenderingContext2D, e: Inimigo): void {
    if (e.chefe) {
      const c = e.chefe;
      const q = quadros[`chefe_${c.pose}`];
      g.save();
      g.translate(e.x, e.y);
      g.scale(e.escala, e.escala);
      this.sprite(g, q, c.px, c.py, e.def.escala, c.rot, false, 1, c.sx, c.sy, e.clarao);
      g.restore();
      return;
    }
    const d = e.def;
    const i = d.nQuadros > 1 ? Math.floor(e.quadroT * d.fps) % d.nQuadros : 0;
    this.sprite(g, quadros[`${d.quadros}_${i}`], e.x, e.y, d.escala * e.escala, e.rot, false, 1, 1, 1, e.clarao);
  }

  private desenharPedra(g: CanvasRenderingContext2D, p: Peca): void {
    const q = quadros[p.quadro];
    if (!q) return;
    const meia = q.H * p.escala * 0.5;
    // ancorada na base: o desenho fica acima do ponto de contato (ground_scatter.gd, _place_boulder)
    this.sprite(g, q, p.x, p.y - meia, p.escala, 0, p.espelho);
  }
}

function mistura(a: number[], b: number[], t: number): number[] {
  t = Math.max(0, Math.min(1, t));
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t];
}
