/**
 * Telas e fluxo: carga, menu principal do Interprete (três botões), seleção de personagem, partida,
 * HUD, subida de nível, pausa, derrota e configurações. Fluxo do original: main_menu.tscn ->
 * character_select.tscn -> main.tscn. O menu é o do Interprete (docs/game/CARGA_E_MENU.md), com
 * "Novo jogo" no lugar de Play, "Continuar jogo" para a partida deixada pela pausa e
 * "Configurações" no lugar de Options (volume e tela cheia, como no original).
 */
import { glyphSvg } from '../ui/ps2-glyphs';
import { PERSONAGENS } from './config';
import { assarChao, assarMascara, espalhar, type Peca } from './chao';
import { Entrada } from './entrada';
import { iconeMelhoria } from './icones';
import { Partida } from './partida';
import { Pos } from './pos';
import { carregarTudo, imagens, quadros } from './recursos';
import { som } from './som';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
const fmtTempo = (s: number) => `${s.toFixed(1).replace('.', ',')} s`;
const toque = matchMedia('(pointer: coarse)').matches || new URLSearchParams(location.search).has('touch');

function carregarImg(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, falha) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = () => falha(new Error(src));
    i.src = src;
  });
}

export class Telas {
  readonly ui: HTMLElement;
  private $: Record<string, HTMLElement> = {};
  partida: Partida | null = null;
  private suspensa: Partida | null = null;
  private entrada: Entrada;
  private pos: Pos;
  private interna = document.createElement('canvas');
  private gi = this.interna.getContext('2d', { alpha: false }) as CanvasRenderingContext2D;
  private pecas: Peca[] = [];
  private chao: HTMLCanvasElement | null = null;
  private ultimo = performance.now();
  private hudCache: Record<string, string> = {};
  private menuIntro = true;
  private tela: 'carga' | 'menu' | 'selecao' | 'config' | 'jogo' = 'carga';
  private configDe: 'menu' | 'pausa' = 'menu';

  constructor(private palco: HTMLCanvasElement, ui: HTMLElement) {
    this.ui = ui;
    if (toque) document.body.classList.add('touch');
    ui.innerHTML = `
      <div id="clarao"></div>
      <div id="hud" class="hidden">
        <div class="xp" role="meter" aria-label="Experiência"><b></b><span class="nv"></span></div>
        <div class="status">
          <div class="vida" role="meter" aria-label="Vida"><b></b><span></span></div>
          <div class="dados"><span class="abates"></span><span class="tempo"></span></div>
        </div>
        <div class="chefe hidden"><div class="nome">Chefe</div><div class="barra" role="meter" aria-label="Vida do chefe"><b></b></div></div>
        <button class="pausar" aria-label="Pausar">${glyphSvg('crivo', 20)}<span>Pausa</span></button>
      </div>
      <div id="aviso-chefe" class="hidden">Chefe</div>
      <div id="nivel" class="screen hidden" role="dialog" aria-modal="true" aria-label="Subiu de nível"></div>
      <div id="pausa" class="screen hidden" role="dialog" aria-modal="true" aria-label="Pausa"></div>
      <div id="derrota" class="screen hidden" role="dialog" aria-modal="true" aria-label="Fim da partida"></div>
      <div id="selecao" class="screen hidden" role="dialog" aria-modal="true" aria-label="Escolha de personagem"></div>
      <div id="config" class="screen hidden" role="dialog" aria-modal="true" aria-label="Configurações"></div>
      <div id="menu" class="screen hidden" role="dialog" aria-modal="true" aria-label="Menu inicial"></div>
      <div id="loading" role="progressbar" aria-label="Carregando" aria-valuemin="0" aria-valuemax="100"><div class="brasao">${glyphSvg('brasao', 56)}</div><div class="linha"><b></b></div><div class="nota" aria-live="polite"></div></div>`;
    for (const el of ui.querySelectorAll<HTMLElement>('[id]')) this.$[el.id] = el;
    this.entrada = new Entrada(palco);
    this.pos = new Pos(palco);
    addEventListener('resize', () => this.dimensionar());
    this.dimensionar();
    addEventListener('keydown', (e) => this.tecla(e));
    const destravar = () => {
      som.destravar();
      if (this.tela === 'menu' || this.tela === 'selecao' || this.tela === 'config') som.tocarMusica('menu');
    };
    addEventListener('pointerdown', destravar);
    addEventListener('keydown', destravar);
    (this.$.hud.querySelector('.pausar') as HTMLElement).addEventListener('click', () => this.alternarPausa());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.partida && !this.partida.fim && !this.partida.emNivel && !this.partida.pausada) this.alternarPausa();
    });
    requestAnimationFrame((t) => this.quadro(t));
  }

  // ---------------------------------------------------------------- carga

  async iniciar(): Promise<void> {
    const t0 = performance.now();
    const linha = this.$.loading.querySelector('.linha b') as HTMLElement;
    const nota = this.$.loading.querySelector('.nota') as HTMLElement;
    const lento = setTimeout(() => (nota.textContent = 'Preparando'), 10000);
    const prog = (p: number) => {
      linha.style.width = `${Math.round((p * 160) / 8) * 8}px`;
      this.$.loading.setAttribute('aria-valuenow', String(Math.round(p * 100)));
    };
    try {
      const ctx = som.iniciar();
      const base = `${import.meta.env.BASE_URL}textures/ps2/`;
      const [, tg, tr, ta] = await Promise.all([
        carregarTudo(ctx, (p) => prog(p * 0.85)),
        carregarImg(`${base}terra_musgo.png`),
        carregarImg(`${base}piso_ardosia.png`),
        carregarImg(`${base}piso_estrada_ardosia.png`),
      ]);
      await new Promise((r) => setTimeout(r, 0));
      const mascara = assarMascara();
      this.chao = assarChao(tg, tr, ta, mascara);
      this.pecas = espalhar(mascara, (q) => ({ w: quadros[q].W, h: quadros[q].H }));
      prog(1);
    } catch (e) {
      clearTimeout(lento);
      console.error(e);
      nota.innerHTML = 'Um arquivo não chegou.<br><button class="btn" data-a="retry">Tentar de novo</button>';
      const b = nota.querySelector('button') as HTMLButtonElement;
      b.addEventListener('click', () => location.reload());
      b.focus();
      return;
    }
    clearTimeout(lento);
    const falta = 400 - (performance.now() - t0);
    if (falta > 0) await new Promise((r) => setTimeout(r, falta));
    this.$.loading.classList.add('hidden');
    this.menu();
  }

  // ---------------------------------------------------------------- menu

  private mostrar(id: string | null): void {
    for (const t of ['menu', 'selecao', 'config', 'nivel', 'pausa', 'derrota']) this.$[t].classList.toggle('hidden', t !== id);
  }

  private focar(el: HTMLElement): void {
    requestAnimationFrame(() => (el.querySelector<HTMLElement>('[data-focus]:not([disabled])') ?? el.querySelector<HTMLElement>('button:not([disabled]), input'))?.focus());
  }

  menu(): void {
    this.tela = 'menu';
    this.partida = null;
    document.body.classList.add('palco-preto');
    this.$.hud.classList.add('hidden');
    this.mostrar('menu');
    som.tocarMusica('menu');
    const s = this.suspensa;
    const resumo = s ? `${s.pers.nome} · nível ${s.nivel} · ${fmtTempo(s.tempo)}` : 'Nenhuma partida em andamento';
    this.$.menu.innerHTML = `<div class="coluna"><div class="brasao">${glyphSvg('brasao', 64)}</div><h1>Interprete<i>.</i></h1>
      <div class="botoes">
        <button class="mb" data-a="novo" ${s ? '' : 'data-focus'}>Novo jogo</button>
        <button class="mb" data-a="continuar" ${s ? 'data-focus' : 'disabled aria-disabled="true"'}>Continuar jogo</button>
        <div class="resumo${s ? '' : ' apagado'}">${esc(resumo)}</div>
        <button class="mb" data-a="config">Configurações</button>
      </div></div>
      <div class="rodape">Versão 0.2 · um jogador</div>`;
    this.botoes(this.$.menu, (a) => {
      if (a === 'novo') this.selecao();
      else if (a === 'continuar') this.continuar();
      else this.config('menu');
    });
    if (this.menuIntro) {
      this.menuIntro = false;
      const br = this.$.menu.querySelector('.brasao') as HTMLElement;
      requestAnimationFrame(() => {
        const r = br.getBoundingClientRect();
        if (!r.height) return;
        br.style.setProperty('--de-y', `${Math.round(innerHeight / 2 - (r.top + r.height / 2))}px`);
        br.style.setProperty('--de-s', String(56 / r.height));
        br.classList.add('chega');
      });
    }
    this.focar(this.$.menu);
  }

  private botoes(raiz: HTMLElement, f: (a: string, b: HTMLElement) => void): void {
    raiz.querySelectorAll<HTMLButtonElement>('button[data-a]').forEach((b) => {
      b.addEventListener('mouseenter', () => !b.disabled && som.tocar('ui_hover'));
      b.addEventListener('click', () => {
        if (b.disabled) return;
        som.tocar('ui_click');
        f(b.dataset.a as string, b);
      });
    });
  }

  /** character_select.tscn */
  private selecao(): void {
    this.tela = 'selecao';
    this.mostrar('selecao');
    const cartao = (id: 'rogue' | 'knight') => {
      const p = PERSONAGENS[id];
      const img = imagens[p.retrato];
      return `<div class="pers card">
        <div class="retrato"><img src="${img?.src ?? ''}" alt=""></div>
        <h2>${esc(p.nome)}</h2>
        <p>${esc(p.resumo)}</p>
        <div class="atrib label">Vida ${p.vida} · Passo ${p.velocidade}</div>
        <button class="btn primary" data-a="${id}" ${id === 'rogue' ? 'data-focus' : ''}>Escolher</button>
      </div>`;
    };
    this.$.selecao.innerHTML = `<div class="sel"><h1>Quem entra na névoa</h1><div class="cartas">${cartao('rogue')}${cartao('knight')}</div>
      <button class="btn voltar" data-a="voltar">Voltar</button></div>`;
    this.botoes(this.$.selecao, (a) => (a === 'voltar' ? this.menu() : this.comecar(a as 'rogue' | 'knight')));
    this.focar(this.$.selecao);
  }

  /** main_menu.tscn, OptionsPanel: volume e tela cheia */
  private config(de: 'menu' | 'pausa'): void {
    this.configDe = de;
    if (de === 'menu') this.tela = 'config';
    this.mostrar('config');
    const cheia = !!document.fullscreenElement;
    this.$.config.innerHTML = `<div class="card">
      <div class="label">Configurações</div><h2>Ajustes</h2>
      <label class="linha"><span>Volume</span><input type="range" min="0" max="1" step="0.05" value="${som.volume}" data-focus aria-label="Volume"></label>
      <label class="linha"><span>Tela cheia</span><input type="checkbox" ${cheia ? 'checked' : ''} aria-label="Tela cheia" ${document.fullscreenEnabled ? '' : 'disabled'}></label>
      <p class="creditos">Jogabilidade, imagens dos personagens e sons do modelo 2D Survivors Roguelike, da Summer Engine, sob licença MIT. Interface, glifos, chão e paleta do Interprete.</p>
      <button class="btn primary" data-a="voltar">Voltar</button></div>`;
    const vol = this.$.config.querySelector('input[type=range]') as HTMLInputElement;
    vol.addEventListener('input', () => {
      som.definirVolume(Number(vol.value));
      try {
        localStorage.setItem('interprete-sv-volume', vol.value);
      } catch {
        /* armazenamento recusado */
      }
    });
    const tc = this.$.config.querySelector('input[type=checkbox]') as HTMLInputElement;
    tc.addEventListener('change', () => {
      if (tc.checked) void document.documentElement.requestFullscreen?.().catch(() => (tc.checked = false));
      else if (document.fullscreenElement) void document.exitFullscreen();
    });
    this.botoes(this.$.config, () => (this.configDe === 'menu' ? this.menu() : this.pausaTela()));
    this.focar(this.$.config);
  }

  // ---------------------------------------------------------------- partida

  private comecar(id: 'rogue' | 'knight'): void {
    if (!this.chao) return;
    this.suspensa = null;
    const p = new Partida(id, this.entrada, this.pecas, this.chao, {
      nivel: (escolhas) => this.telaNivel(escolhas),
      fimNivel: () => this.mostrar(null),
      morte: (t, k) => this.telaDerrota(t, k),
      chefeSurgiu: () => this.avisoChefe(),
      dano: () => undefined,
    });
    this.entrarNaPartida(p);
    som.tocarMusica('combate');
  }

  private entrarNaPartida(p: Partida): void {
    this.partida = p;
    this.tela = 'jogo';
    this.hudCache = {};
    document.body.classList.remove('palco-preto');
    this.$.hud.classList.remove('hidden');
    this.mostrar(null);
    this.ultimo = performance.now();
  }

  private continuar(): void {
    const p = this.suspensa;
    if (!p) return;
    this.suspensa = null;
    this.entrarNaPartida(p);
    p.pausada = false;
    som.tocarMusica('combate');
  }

  private telaNivel(escolhas: Array<{ id: string; nome: string; desc: string; icone: string }>): void {
    this.mostrar('nivel');
    this.$.nivel.innerHTML = `<div class="caixa"><div class="label">Nível ${this.partida?.nivel ?? ''}</div><h1>Subiu de nível</h1><p class="sub">Escolha uma melhoria</p>
      <div class="cartas">${escolhas
        .map(
          (u, i) => `<button class="carta card" data-a="${i}" ${i === 0 ? 'data-focus' : ''}>
          <span class="tecla label">${i + 1}</span><span class="ico">${iconeMelhoria(u.icone, 56)}</span>
          <span class="nome">${esc(u.nome)}</span><span class="desc">${esc(u.desc)}</span></button>`,
        )
        .join('')}</div></div>`;
    const cartas = [...this.$.nivel.querySelectorAll<HTMLElement>('.carta')];
    for (const c of cartas) {
      const acender = (on: boolean) => {
        for (const o of cartas) o.classList.toggle('apagada', on && o !== c);
        if (on) som.tocar('ui_hover');
      };
      c.addEventListener('mouseenter', () => acender(true));
      c.addEventListener('mouseleave', () => acender(false));
      c.addEventListener('focus', () => cartas.forEach((o) => o.classList.toggle('apagada', o !== c)));
      c.addEventListener('click', () => this.partida?.escolher(Number(c.dataset.a)));
    }
    this.focar(this.$.nivel);
  }

  private alternarPausa(): void {
    const p = this.partida;
    if (!p || p.fim || p.emNivel) return;
    som.tocar('ui_click');
    if (p.pausada) {
      p.pausada = false;
      this.mostrar(null);
    } else {
      p.pausada = true;
      this.entrada.soltar();
      this.pausaTela();
    }
  }

  private pausaTela(): void {
    this.mostrar('pausa');
    this.$.pausa.innerHTML = `<div class="card"><div class="label">Pausa</div><h2>Pausado</h2>
      <button class="btn primary" data-a="retomar" data-focus>Retomar</button>
      <button class="btn" data-a="config">Configurações</button>
      <button class="btn" data-a="menu">Menu principal</button></div>`;
    this.botoes(this.$.pausa, (a) => {
      if (a === 'retomar') {
        if (this.partida) this.partida.pausada = false;
        this.mostrar(null);
      } else if (a === 'config') this.config('pausa');
      else {
        this.suspensa = this.partida;
        this.menu();
      }
    });
    this.focar(this.$.pausa);
  }

  private telaDerrota(tempo: number, abates: number): void {
    this.mostrar('derrota');
    this.$.derrota.innerHTML = `<div class="fundo" style="background-image:url('${imagens.derrota?.src ?? ''}')"></div>
      <div class="card"><div class="label">A névoa fechou</div><h2>Fim da partida</h2>
      <p class="resultado">Sobreviveu ${fmtTempo(tempo)} · ${abates} ${abates === 1 ? 'abate' : 'abates'}</p>
      <button class="btn primary" data-a="recomecar" data-focus>Recomeçar</button>
      <button class="btn" data-a="menu">Menu principal</button>
      <p class="dica">R recomeça</p></div>`;
    this.botoes(this.$.derrota, (a) => (a === 'recomecar' ? this.recomecar() : this.menu()));
    this.focar(this.$.derrota);
  }

  private recomecar(): void {
    const p = this.partida;
    if (!p) return;
    this.comecar(p.pers.id);
  }

  private avisoChefe(): void {
    const a = this.$['aviso-chefe'];
    a.classList.remove('hidden', 'on');
    void a.offsetWidth;
    a.classList.add('on');
    setTimeout(() => a.classList.add('hidden'), 2300);
  }

  private tecla(e: KeyboardEvent): void {
    const p = this.partida;
    if (this.tela === 'jogo' && p) {
      if (e.repeat) return;
      if (e.code === 'Escape') {
        if (!this.$.config.classList.contains('hidden')) this.pausaTela();
        else this.alternarPausa();
        e.preventDefault();
      } else if (e.code === 'KeyL' && !p.fim) p.forcarNivel();
      else if (e.code === 'KeyB' && !p.fim) p.gerarChefe();
      else if (e.code === 'KeyR' && p.fim && !this.$.derrota.classList.contains('hidden')) this.recomecar();
      else if (p.emNivel && /^Digit[123]$/.test(e.code)) p.escolher(Number(e.code.slice(5)) - 1);
      return;
    }
    if (this.tela === 'config' && e.code === 'Escape') this.menu();
    if (this.tela === 'selecao' && e.code === 'Escape') this.menu();
    // setas percorrem os botões do menu, como no menu do jogo anterior
    if ((e.code === 'ArrowDown' || e.code === 'ArrowUp') && this.tela !== 'carga') {
      const raiz = this.$[this.tela];
      const bs = [...raiz.querySelectorAll<HTMLElement>('button:not([disabled]), input')];
      if (!bs.length) return;
      const i = bs.indexOf(document.activeElement as HTMLElement);
      const n = e.code === 'ArrowDown' ? (i + 1) % bs.length : (i - 1 + bs.length) % bs.length;
      bs[n].focus();
      e.preventDefault();
    }
  }

  // ---------------------------------------------------------------- desenho

  private iw = 0;
  private ih = 0;
  private k = 1;

  private dimensionar(): void {
    const W = innerWidth, H = innerHeight;
    const dpr = Math.min(2, devicePixelRatio || 1);
    this.palco.width = Math.round(W * dpr);
    this.palco.height = Math.round(H * dpr);
    // stretch canvas_items + expand: a área base de 1280 × 720 sempre cabe; o lado que sobra mostra mais mundo
    const s = Math.min(W / 1280, H / 720);
    // imagem PS2: no máximo 512 linhas no lado curto (448 em tela pequena), ampliadas com filtro suave
    const linhas = Math.min(W, H) < 560 ? 448 : 512;
    const f = Math.min(1, linhas / Math.min(W, H));
    this.iw = Math.max(1, Math.round(W * f));
    this.ih = Math.max(1, Math.round(H * f));
    this.interna.width = this.iw;
    this.interna.height = this.ih;
    this.k = s * f;
  }

  private quadro(t: number): void {
    requestAnimationFrame((n) => this.quadro(n));
    const dt = Math.min(0.1, (t - this.ultimo) / 1000);
    this.ultimo = t;
    const p = this.partida;
    if (!p || this.tela !== 'jogo') return;
    p.avancar(dt);
    const foco = p.desenhar(this.gi, this.iw, this.ih, this.k);
    this.pos.apresentar(this.interna, foco.fx, foco.fy, 0.42);
    this.hud(p);
  }

  private set(chave: string, valor: string, f: () => void): void {
    if (this.hudCache[chave] === valor) return;
    this.hudCache[chave] = valor;
    f();
  }

  private hud(p: Partida): void {
    const h = this.$.hud;
    const pct = (v: number, m: number) => `${Math.max(0, Math.min(100, (v / m) * 100)).toFixed(1)}%`;
    this.set('xp', `${p.xp}/${p.xpProx}`, () => ((h.querySelector('.xp b') as HTMLElement).style.width = pct(p.xp, p.xpProx)));
    this.set('nv', String(p.nivel), () => ((h.querySelector('.xp .nv') as HTMLElement).textContent = `Nv ${p.nivel}`));
    const vida = `${Math.ceil(p.vida)}/${Math.round(p.vidaMax)}`;
    this.set('vida', vida, () => {
      (h.querySelector('.vida b') as HTMLElement).style.width = pct(p.vida, p.vidaMax);
      (h.querySelector('.vida span') as HTMLElement).textContent = `Vida ${Math.ceil(p.vida)} / ${Math.round(p.vidaMax)}`;
    });
    this.set('abates', String(p.abates), () => ((h.querySelector('.abates') as HTMLElement).textContent = `Abates ${p.abates}`));
    this.set('tempo', p.tempo.toFixed(1), () => ((h.querySelector('.tempo') as HTMLElement).textContent = `Tempo ${fmtTempo(p.tempo)}`));
    const c = p.chefe();
    this.set('chefe', c ? `${Math.max(0, Math.round(c.vida))}/${c.vidaMax}` : '-', () => {
      const el = h.querySelector('.chefe') as HTMLElement;
      el.classList.toggle('hidden', !c);
      if (c) (el.querySelector('b') as HTMLElement).style.width = pct(c.vida, c.vidaMax);
    });
    const cl = this.$.clarao;
    const a = p.clarao.toFixed(2);
    if (cl.dataset.a !== a) {
      cl.dataset.a = a;
      cl.style.opacity = a;
    }
  }
}
