/**
 * Interface em DOM e CSS, sobre o canvas. Usa os tokens do design system.
 * A interface só lê o estado e chama operações do jogo; nenhuma regra mora aqui.
 */
import { glyphSvg, PS2_GLYPHS, type Ps2Glyph } from './ps2-glyphs';
import type { Game } from '../game';
import { ACTION_LABEL, keyLabel, padLabel, type ActionName } from '../core/input';
import { CODEX, COAT_COLORS, CRIVO_SKILLS, ITEMS, PLAYER_SKILLS, PROFESSIONS, QUESTS, SHOP } from '../content/data';
import { canUnlock, countItem, isEquipped, xpForLevel, type ProfessionId, type SkillDef } from '../domain/state';
import { HAIRS, SKINS } from '../entities/figure';
import { RARITY_LABEL } from '../domain/gear';
import { icon } from './icons';
import { problems } from '../core/diag';
import { CaseView } from './caseview';
import { TouchControls, isTouchDevice } from './touch';

export type BookTab = 'inventario' | 'habilidades' | 'mapa' | 'diario' | 'codice' | 'config';

export function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
}
function el(html: string): HTMLElement {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild as HTMLElement;
}
const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');

export interface HudData {
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  vigor: number;
  maxVigor: number;
  xp: number;
  coins: number;
  quest: string;
  step: string;
  ability: 'pulso' | 'lupa';
  abilityCd: number;
  caldo: number;
  limao: number;
  /** pontos que faltam para o próximo nível; 0 no nível máximo */
  xpLeft: number;
  boss: { name: string; frac: number; recite: number } | null;
  /** pontos de habilidade ainda não gastos (seus e do Crivo) */
  points: number;
  crivoPoints: number;
}

const SKIN_NAMES = ['muito clara', 'clara', 'média', 'escura', 'muito escura'];
const HAIR_NAMES = ['preto', 'castanho-escuro', 'castanho', 'grisalho', 'ruivo', 'loiro'];
const COAT_NAMES = ['vinho', 'azul-marinho', 'verde-escuro', 'roxo', 'marrom', 'grafite'];

const TIPS = [
  'Último fôlego: com pouco vigor ainda sai uma esquiva (a partir de 60% do custo) ou um golpe (a partir da metade). O vigor vai a zero e demora a voltar.',
  'O Crivo olha para o que merece um segundo olhar. Ele não marca tudo o tempo todo.',
  'Inimigos hesitam antes de investir. O anel vermelho no chão mostra até onde o golpe chega.',
  'Nenhuma missão tem cronômetro. Ler com calma nunca é penalizado.',
  'Um desfecho ruim não torna ruim, por si só, uma decisão bem conduzida.',
  'O pulso do Crivo interrompe quem está se preparando para atacar.',
  'Três vozes repetindo a mesma fonte não são três confirmações.',
];

export class UI {
  private $: Record<string, HTMLElement> = {};
  private g!: Game;
  private typing: { full: string; i: number; el: HTMLElement; done: () => void } | null = null;
  private sayResolve: (() => void) | null = null;
  private chooseResolve: ((i: number) => void) | null = null;
  private choiceCount = 0;
  bookTab: BookTab = 'inventario';
  /** Configurações foram abertas pela pausa; Esc ou Fechar devolve à pausa */
  bookFromPause = false;
  private sel: Record<string, string> = {};
  private skillTab: 'jogador' | 'crivo' = 'jogador';
  private rebinding: ActionName | null = null;
  private cache: Record<string, string> = {};
  private create = { prof: 'nutricao' as ProfessionId, body: 'fem' as 'fem' | 'masc', skin: 1, hair: 1, style: 1, coat: 0, name: '' };
  private hintTimer = 0;
  private bannerTimer = 0;
  private titleTimer = 0;
  caseView!: CaseView;
  touch!: TouchControls;
  private clickBlockedUntil = 0;
  swallowClicks(ms: number): void {
    this.clickBlockedUntil = performance.now() + ms;
  }
  /** modo de teste: diálogos sem espera */
  instant = false;

  constructor(private root: HTMLElement) {
    root.innerHTML = `
      <div id="hurt"></div>
      <div id="hud" class="hidden">
        <div class="status">
          <div class="who"><span class="lvl" data-k="lvl"></span><span class="nm" data-k="nm"></span></div>
          <div class="meter" role="meter" aria-label="Vida" aria-valuemin="0" data-k="hpM"><b class="lag" data-k="hplag"></b><b data-k="hp"></b><span class="num" data-k="hpN"></span></div>
          <div class="meter vigor" role="meter" aria-label="Vigor" aria-valuemin="0" data-k="vigorM"><b data-k="vigor"></b><span class="num" data-k="vigorN"></span></div>
          <div class="meter xp" role="meter" aria-label="Experiência" aria-valuemin="0" aria-valuemax="100" data-k="xpM"><b data-k="xp"></b></div>
          <div class="xpn" data-k="xpN"></div>
        </div>
        <div class="objective"><div class="label">Objetivo</div><div class="q" data-k="quest"></div><div class="s" data-k="step"></div></div>
        <div class="coins" data-k="coins"></div>
        <div class="pending hidden" data-k="pending" role="status"></div>
        <div class="quick">
          <div class="slot"><span class="kbd key" data-k="kItem"></span><span data-k="iItem">${icon('caldo')}</span><span class="n" data-k="caldo"></span><span class="nm" data-k="itemNm">Caldo</span></div>
          <div class="slot big"><span class="kbd key" data-k="kCrivo"></span><span data-k="iCrivo">${icon('pulso')}</span><span class="cd" data-k="cd"></span><span class="nm" data-k="ability"></span></div>
        </div>
        <div id="boss" class="hidden"><div class="nm" data-k="bossNm"></div><div class="meter" role="meter" aria-label="Vida do adversário" aria-valuemin="0" aria-valuemax="100" data-k="bossM"><b data-k="bossHp"></b></div><div class="recite hidden" data-k="reciteBox">Recitando a sentença · interrompa com o pulso do Crivo<div class="meter"><b data-k="recite"></b></div></div></div>
        <div id="marker" class="hidden" role="img" aria-label="Objetivo"><i></i><span></span></div>
        <div id="lock" class="hidden" role="img" aria-label="Mira travada"><i></i></div>
        <div id="prompt" class="hidden"></div>
      </div>
      <div id="toasts" role="log" aria-live="polite" aria-relevant="additions"></div>
      <div id="hint" class="hidden" role="status" aria-live="polite"></div>
      <div id="sr-status" class="sr-only" role="status" aria-live="assertive"></div>
      <div id="subtitle" class="hidden"></div>
      <div id="banner"><div class="label k"></div><div class="t"></div><div class="d"></div></div>
      <div id="region-title"><div class="sub"></div><div class="rule"></div><div class="name"></div></div>
      <div id="dialogue" class="hidden" role="dialog" aria-label="Conversa" aria-live="polite"><div class="retrato" aria-hidden="true"></div><div class="who"><span class="nm"></span><span class="label role"></span></div><div class="txt"></div><div class="choices"></div><div class="next"></div><button class="dx" type="button" aria-label="Sair da conversa">Sair</button></div>
      <div id="splash" class="screen hidden"></div>
      <div id="menu" class="screen hidden" role="dialog" aria-modal="true" aria-label="Menu inicial"></div>
      <div id="create" class="screen hidden" role="dialog" aria-modal="true" aria-label="Criação de personagem"></div>
      <div id="book" class="screen hidden" role="dialog" aria-modal="true" aria-label="Caderno"></div>
      <div id="shop" class="screen center hidden" role="dialog" aria-modal="true" aria-label="Loja"></div>
      <div id="case" class="screen hidden" role="dialog" aria-modal="true" aria-label="Dossiê do caso simulado"></div>
      <div id="pause" class="screen center hidden" role="dialog" aria-modal="true" aria-label="Pausa"></div>
      <div id="defeat" class="screen center hidden" role="dialog" aria-modal="true" aria-label="Derrota"></div>
      <div id="ending" class="screen center hidden" role="dialog" aria-modal="true" aria-label="Epílogo"></div>
      <div id="fade"></div>
      <div id="loading"><div class="word">Interprete<i>.</i></div><div class="bar"><b></b></div><div class="tip"></div></div>`;
    for (const e of Array.from(root.querySelectorAll<HTMLElement>('[id]'))) this.$[e.id] = e;
    this.touch = new TouchControls(root);
    if (isTouchDevice()) this.touch.enable();
    for (const e of Array.from(root.querySelectorAll<HTMLElement>('[data-k]'))) this.$['k:' + e.dataset.k] = e;
    document.addEventListener('keydown', (e) => this.onKey(e), true);
    document.addEventListener(
      'click',
      (e) => {
        if (performance.now() < this.clickBlockedUntil) {
          e.stopPropagation();
          e.preventDefault();
        }
      },
      true,
    );
    // remapeamento também aceita botões do mouse
    document.addEventListener(
      'mousedown',
      (e) => {
        if (!this.rebinding || this.rebindPad) return;
        e.preventDefault();
        e.stopPropagation();
        this.clickBlockedUntil = performance.now() + 300;
        this.finishRebind('Mouse' + e.button);
      },
      true,
    );
    document.addEventListener('contextmenu', (e) => this.rebinding && e.preventDefault(), true);
    this.$.dialogue.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (t.closest('.dx')) return this.g.cancelScript();
      if (!t.closest('.choices')) this.advance();
    });
  }

  bind(g: Game): void {
    this.g = g;
    this.caseView = new CaseView(this.$.case, g);
    this.touch.bind(g);
  }

  // ---------- utilidades ----------
  private show(id: string, on: boolean): void {
    this.$[id].classList.toggle('hidden', !on);
  }
  private set(key: string, text: string, prop: 'text' | 'width' | 'height' | 'html' = 'text'): void {
    const ck = key + prop;
    if (this.cache[ck] === text) return;
    this.cache[ck] = text;
    const e = this.$['k:' + key];
    if (prop === 'text') e.textContent = text;
    else if (prop === 'html') e.innerHTML = text;
    else e.style[prop] = text;
  }
  /** verdadeiro em aparelhos de toque: textos de ajuda falam de botões, não de teclas */
  get isTouch(): boolean {
    return this.touch.enabled;
  }
  key(a: ActionName): string {
    if (this.touch.enabled && !this.g.input.usingPad) {
      const t: Partial<Record<ActionName, string>> = { interagir: 'Toque', ataque: 'Golpe', golpe: 'Firme', esquiva: 'Esquiva', pular: 'Pulo', crivo: 'Pulso', travar: 'Mira', item: 'Item', dica: 'Dica', trocarCrivo: 'Trocar', habilidades: 'Caderno', inventario: 'Caderno', diario: 'Caderno', mapa: 'Caderno' };
      if (t[a]) return t[a]!;
    }
    if (this.g.input.usingPad && this.g.input.pad[a] !== undefined) return padLabel(this.g.input.pad[a]);
    return keyLabel(this.g.input.keys[a][0] ?? '');
  }
  private sfx(n = 'ui'): void {
    this.g.audio.sfx(n);
  }
  private focusFirst(scr: HTMLElement): void {
    requestAnimationFrame(() => scr.querySelector<HTMLElement>('[data-focus], button:not([disabled]), input')?.focus());
  }
  /** navegação por setas/gamepad entre os controles da tela ativa */
  moveFocus(dir: number): void {
    const scr = this.topScreen();
    if (!scr) return;
    const list = Array.from(scr.querySelectorAll<HTMLElement>('button:not([disabled]), input, select')).filter((e) => e.offsetParent !== null);
    if (!list.length) return;
    const i = list.indexOf(document.activeElement as HTMLElement);
    list[(i + dir + list.length) % list.length].focus();
  }
  /** esquerda/direita do controle sobre o controle em foco: mexe em seletor ou barra, ou troca de aba */
  adjust(dir: number): void {
    const a = document.activeElement as HTMLInputElement | HTMLSelectElement | null;
    if (!a || !this.topScreen()?.contains(a)) return;
    if (a instanceof HTMLInputElement && a.type === 'range') {
      dir > 0 ? a.stepUp() : a.stepDown();
      a.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (a instanceof HTMLSelectElement) {
      const i = Math.min(a.options.length - 1, Math.max(0, a.selectedIndex + dir));
      if (i !== a.selectedIndex) {
        a.selectedIndex = i;
        a.dispatchEvent(new Event('input', { bubbles: true }));
      }
    } else this.moveFocus(dir);
  }
  /** botão B do controle fora do jogo: aciona o "voltar" da tela, se houver */
  back(): void {
    if (this.dialogueOpen && !this.topScreenIsModal()) return this.g.cancelScript();
    const scr = this.topScreen();
    scr?.querySelector<HTMLElement>('[data-a=back], [data-a=no], [data-a=leave], [data-a=close]')?.click();
  }
  /** aviso lido de imediato por leitor de tela (mudanças críticas de combate) */
  announce(text: string): void {
    this.$['sr-status'].textContent = text;
  }
  activate(): void {
    const a = document.activeElement as HTMLElement | null;
    if (a && this.topScreen()?.contains(a)) a.click();
  }
  private topScreen(): HTMLElement | null {
    for (const id of ['ending', 'defeat', 'pause', 'case', 'shop', 'book', 'create', 'menu', 'splash']) if (!this.$[id].classList.contains('hidden')) return this.$[id];
    if (!this.$.dialogue.classList.contains('hidden')) return this.$.dialogue;
    return null;
  }

  private onKey(e: KeyboardEvent): void {
    if (this.rebinding) {
      e.preventDefault();
      e.stopPropagation();
      this.finishRebind(e.code === 'Escape' ? null : e.code);
      return;
    }
    if (e.repeat) return;
    const typing = (e.target as HTMLElement)?.tagName === 'INPUT' && (e.target as HTMLInputElement).type === 'text';
    if (!this.$.dialogue.classList.contains('hidden') && !this.topScreenIsModal()) {
      if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyE') {
        e.preventDefault();
        this.advance();
      } else if (e.code === 'Escape') {
        e.preventDefault();
        this.g.cancelScript();
      } else if (/^(Digit|Numpad)[1-9]$/.test(e.code)) this.pick(Number(e.code.slice(-1)) - 1);
      else if (e.code === 'ArrowDown') this.moveFocus(1);
      else if (e.code === 'ArrowUp') this.moveFocus(-1);
      return;
    }
    if (this.topScreen() && !typing && !(e.target instanceof HTMLSelectElement)) {
      if (e.code === 'ArrowDown') {
        e.preventDefault();
        this.moveFocus(1);
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        this.moveFocus(-1);
      }
    }
  }
  /** Conclui o remapeamento com uma tecla, um botão do mouse ("Mouse0"...) ou um botão do controle. */
  private finishRebind(code: string | null, padButton?: number): void {
    const a = this.rebinding;
    const inp = this.g.input;
    this.rebinding = null;
    this.rebindPad = false;
    inp.capturePad = null;
    if (a && padButton !== undefined) {
      const r = inp.rebindPad(a, padButton);
      this.g.settings.pad = { ...inp.pad };
      this.g.applySettings();
      this.toast(r ? `${ACTION_LABEL[a]} passou a usar ${padLabel(padButton)}. ${ACTION_LABEL[r.other]} ficou com ${padLabel(r.got ?? undefined)}.` : `${ACTION_LABEL[a]}: ${padLabel(padButton)}.`, 'Controle');
    } else if (a && code) {
      const r = inp.rebind(a, code);
      this.g.settings.keys = { ...inp.keys };
      this.g.applySettings();
      if (r) this.toast(`${keyLabel(code)} era de "${ACTION_LABEL[r.other]}", que ${r.got ? `ficou com ${keyLabel(r.got)}` : 'ficou sem tecla: escolha outra para ela'}.`, 'Teclas trocadas', 8);
    }
    this.renderBook();
    requestAnimationFrame(() => this.$.book.querySelector<HTMLElement>(`[data-bind${padButton !== undefined ? 'pad' : ''}="${a}"]`)?.focus());
  }
  private rebindPad = false;
  private topScreenIsModal(): boolean {
    const t = this.topScreen();
    return !!t && t !== this.$.dialogue;
  }

  // ---------- carregamento, véu, títulos ----------
  loading(on: boolean, p = 0): void {
    this.show('loading', on);
    if (on) {
      (this.$.loading.querySelector('.bar b') as HTMLElement).style.width = `${Math.round(p * 100)}%`;
      const tip = this.$.loading.querySelector('.tip') as HTMLElement;
      if (!tip.textContent || p === 0) tip.textContent = TIPS[Math.floor(Math.random() * TIPS.length)];
    }
  }
  fade(on: boolean): Promise<void> {
    this.$.fade.classList.toggle('on', on);
    return new Promise((r) => setTimeout(r, this.instant || this.g.settings.reduceMotion ? 30 : 580));
  }
  regionTitle(name: string, sub: string): void {
    const t = this.$['region-title'];
    (t.querySelector('.name') as HTMLElement).textContent = name;
    (t.querySelector('.sub') as HTMLElement).textContent = sub;
    this.$.banner.classList.remove('on');
    t.classList.add('on');
    clearTimeout(this.titleTimer);
    this.titleTimer = window.setTimeout(() => t.classList.remove('on'), 3600);
  }
  private bannerQueue: [string, string, string] | null = null;
  banner(kicker: string, title: string, desc = ''): void {
    // com a caixa de conversa aberta o anúncio espera: dois textos ao mesmo tempo disputam a leitura
    if (!this.$.dialogue.classList.contains('hidden') && !this.instant) {
      this.bannerQueue = [kicker, title, desc];
      return;
    }
    this.remember(kicker, desc ? `${title}. ${desc}` : title);
    const b = this.$.banner;
    (b.querySelector('.k') as HTMLElement).textContent = kicker;
    (b.querySelector('.t') as HTMLElement).textContent = title;
    (b.querySelector('.d') as HTMLElement).textContent = desc;
    this.$['region-title'].classList.remove('on');
    b.classList.add('on');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = window.setTimeout(() => b.classList.remove('on'), 4200);
  }
  /** últimos avisos e dicas, para reler no Diário */
  log: Array<{ label: string; text: string }> = [];
  private remember(label: string, text: string): void {
    if (this.log[0]?.text === text) return;
    this.log.unshift({ label, text });
    if (this.log.length > 40) this.log.pop();
  }
  toast(text: string, label = '', seconds = 4.2): void {
    this.remember(label || 'Aviso', text);
    const t = el(`<div class="toast">${label ? `<span class="label">${esc(label)}</span>` : ''}${esc(text)}</div>`);
    this.$.toasts.prepend(t);
    while (this.$.toasts.children.length > 4) this.$.toasts.lastElementChild?.remove();
    const ms = seconds * 1000 * (this.g?.settings.noticeTime ?? 1);
    setTimeout(() => t.classList.add('out'), ms);
    setTimeout(() => t.remove(), ms + 600);
  }
  hint(text: string | null, label = 'O Crivo aponta', seconds = 7): void {
    clearTimeout(this.hintTimer);
    this.show('hint', !!text);
    if (text) {
      this.remember(label, text);
      this.$.hint.innerHTML = `<span class="label">${esc(label)}</span>${esc(text)}`;
      this.hintTimer = window.setTimeout(() => this.show('hint', false), seconds * 1000 * (this.g?.settings.noticeTime ?? 1));
    }
  }
  subtitle(text: string | null): void {
    this.show('subtitle', !!text);
    if (text) this.$.subtitle.textContent = text;
  }
  hurt(amount: number): void {
    const h = this.$.hurt;
    h.style.borderWidth = `${Math.min(46, 14 + amount)}px`;
    h.style.transition = 'none';
    h.style.opacity = '1';
    requestAnimationFrame(() => {
      h.style.transition = '';
      h.style.opacity = '0';
    });
  }

  // ---------- HUD ----------
  hudVisible(on: boolean): void {
    this.show('hud', on);
  }
  hud(d: HudData): void {
    this.set('lvl', `NÍVEL ${d.level}`);
    this.set('nm', d.name);
    const f = `${Math.max(0, Math.min(100, (d.hp / d.maxHp) * 100)).toFixed(1)}%`;
    this.set('hp', f, 'width');
    this.set('hplag', f, 'width');
    this.set('vigor', `${Math.max(0, (d.vigor / d.maxVigor) * 100).toFixed(1)}%`, 'width');
    this.set('xp', `${(d.xp * 100).toFixed(1)}%`, 'width');
    const hp = Math.ceil(d.hp);
    const vg = Math.round(d.vigor);
    const nums = this.g.settings.hudNumbers;
    this.set('hpN', nums ? `${hp} / ${d.maxHp}` : '');
    this.set('vigorN', nums ? `${vg} / ${Math.round(d.maxVigor)}` : '');
    this.set('xpN', nums ? (d.xpLeft > 0 ? `faltam ${Math.ceil(d.xpLeft)} de experiência` : 'nível máximo') : '');
    this.aria('hpM', hp, d.maxHp, `${hp} de ${d.maxHp}`);
    this.aria('vigorM', vg, Math.round(d.maxVigor), `${vg} de ${Math.round(d.maxVigor)}`);
    this.aria('xpM', Math.round(d.xp * 100), 100, d.xpLeft > 0 ? `faltam ${Math.ceil(d.xpLeft)} pontos para o próximo nível` : 'nível máximo');
    // vida baixa: um aviso por queda, lido por leitor de tela
    const low = d.hp / d.maxHp < 0.3;
    if (low && !this.wasLow) this.announce(`Vida baixa: ${hp} de ${d.maxHp}.`);
    this.wasLow = low;
    this.set('coins', `${d.coins} moedas`);
    // pontos esperando no caderno: o aviso fica até serem gastos, com a tecla que abre a página
    const pend: string[] = [];
    if (d.points > 0) pend.push(`${d.points} ponto${d.points > 1 ? 's' : ''} de habilidade`);
    if (d.crivoPoints > 0) pend.push(`${d.crivoPoints} do Crivo`);
    this.set('pending', pend.length ? `${pend.join(' · ')} · ${this.key('habilidades')}` : '');
    this.$['k:pending'].classList.toggle('hidden', !pend.length);
    this.set('quest', d.quest);
    this.set('step', d.step);
    this.$['k:step'].style.display = d.step ? '' : 'none';
    // o atalho usa caldo e, sem caldo, limão: o contador mostra o que de fato será usado
    const useLimao = d.caldo <= 0 && d.limao > 0;
    this.set('caldo', String(useLimao ? d.limao : d.caldo));
    this.set('itemNm', useLimao ? 'Limão' : 'Caldo');
    this.touch.setHud(d);
    this.set('kItem', this.key('item'));
    this.set('kCrivo', this.key('crivo'));
    this.set('ability', d.ability === 'pulso' ? 'Pulso' : 'Lupa');
    this.set('iCrivo', icon(d.ability), 'html');
    this.set('cd', `${(d.abilityCd * 100).toFixed(0)}%`, 'height');
    this.show('boss', !!d.boss);
    if (d.boss) {
      this.set('bossNm', d.boss.name);
      this.set('bossHp', `${(d.boss.frac * 100).toFixed(1)}%`, 'width');
      this.aria('bossM', Math.round(d.boss.frac * 100), 100, `${d.boss.name}: ${Math.round(d.boss.frac * 100)} por cento`);
      this.$['k:reciteBox'].classList.toggle('hidden', d.boss.recite <= 0);
      this.set('recite', `${(d.boss.recite * 100).toFixed(0)}%`, 'width');
    }
  }
  private wasLow = false;
  private aria(key: string, now: number, max: number, text: string): void {
    const ck = key + 'aria';
    if (this.cache[ck] === text) return;
    this.cache[ck] = text;
    const e = this.$['k:' + key];
    e.setAttribute('aria-valuenow', String(now));
    e.setAttribute('aria-valuemax', String(max));
    e.setAttribute('aria-valuetext', text);
  }
  prompt(text: string | null): void {
    const key = text ?? '';
    if (this.cache.prompt === key) return;
    this.cache.prompt = key;
    this.show('prompt', !!text);
    this.touch.setPrompt(text);
    if (text) this.$.prompt.innerHTML = `<span class="kbd">${esc(this.g.input.usingPad ? 'A' : this.key('interagir'))}</span><span>${esc(text)}</span>`;
  }
  marker(x: number, y: number, label: string, on: boolean): void {
    const m = this.$.marker;
    m.classList.toggle('hidden', !on);
    if (!on) return;
    m.style.transform = `translate(${x.toFixed(0)}px,${y.toFixed(0)}px)`;
    const s = m.lastElementChild as HTMLElement;
    if (s.textContent !== label) s.textContent = label;
  }
  lock(x: number, y: number, on: boolean): void {
    this.$.lock.classList.toggle('hidden', !on);
    if (on) this.$.lock.style.transform = `translate(${x.toFixed(0)}px,${y.toFixed(0)}px)`;
  }

  // ---------- diálogo ----------
  get dialogueOpen(): boolean {
    return !this.$.dialogue.classList.contains('hidden');
  }
  /** nome de quem fala agora (o retrato que chega atrasado só entra se a fala ainda é dele) */
  speaker = '';
  portrait(c: HTMLCanvasElement | null): void {
    const box = this.$.dialogue.querySelector('.retrato') as HTMLElement;
    this.$.dialogue.classList.toggle('com-retrato', !!c);
    if (!c) return void box.replaceChildren();
    if (box.firstChild !== c) box.replaceChildren(c);
  }
  say(who: string, role: string, text: string): Promise<void> {
    const d = this.$.dialogue;
    this.speaker = who;
    this.show('dialogue', true);
    (d.querySelector('.nm') as HTMLElement).textContent = who;
    (d.querySelector('.role') as HTMLElement).textContent = role;
    (d.querySelector('.who') as HTMLElement).style.display = who ? '' : 'none';
    (d.querySelector('.choices') as HTMLElement).innerHTML = '';
    (d.querySelector('.next') as HTMLElement).textContent = `${this.key('interagir')} · continuar   Esc · sair`;
    const txt = d.querySelector('.txt') as HTMLElement;
    txt.style.fontStyle = who ? '' : 'italic';
    if (this.instant) {
      txt.textContent = text;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.sayResolve = resolve;
      if (this.g.settings.reduceMotion) {
        txt.textContent = text;
        this.typing = null;
      } else {
        txt.textContent = '';
        this.typing = { full: text, i: 0, el: txt, done: () => (this.typing = null) };
      }
    });
  }
  choose(options: Array<{ text: string; tag?: string }>, pre?: number): Promise<number> {
    const d = this.$.dialogue;
    this.show('dialogue', true);
    const box = d.querySelector('.choices') as HTMLElement;
    (d.querySelector('.next') as HTMLElement).textContent = 'Esc · sair';
    box.innerHTML = options.map((o, i) => `<button class="btn" data-i="${i}"><span class="n">${i + 1}</span><span>${esc(o.text)}</span>${o.tag ? `<span class="tag">${esc(o.tag)}</span>` : ''}</button>`).join('');
    this.choiceCount = options.length;
    if (this.instant) {
      box.innerHTML = '';
      return Promise.resolve(Math.min(pre ?? 0, options.length - 1));
    }
    return new Promise((resolve) => {
      this.chooseResolve = resolve;
      box.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => this.pick(Number((b as HTMLElement).dataset.i))));
      this.focusFirst(box);
    });
  }
  private pick(i: number): void {
    if (!this.chooseResolve || i < 0 || i >= this.choiceCount) return;
    const r = this.chooseResolve;
    this.chooseResolve = null;
    this.sfx('ui');
    (this.$.dialogue.querySelector('.choices') as HTMLElement).innerHTML = '';
    r(i);
  }
  advance(): void {
    if (this.typing) {
      this.typing.el.textContent = this.typing.full;
      this.typing = null;
      return;
    }
    if (this.chooseResolve) {
      const a = document.activeElement as HTMLElement | null;
      if (a?.dataset.i) this.pick(Number(a.dataset.i));
      return;
    }
    if (this.sayResolve) {
      const r = this.sayResolve;
      this.sayResolve = null;
      this.sfx('texto');
      r();
    }
  }
  /** solta qualquer fala ou escolha pendente: o roteiro percebe o cancelamento e se desfaz */
  abortDialogue(): void {
    this.typing = null;
    const r = this.chooseResolve;
    const q = this.sayResolve;
    this.chooseResolve = null;
    this.sayResolve = null;
    r?.(-1);
    q?.();
  }
  endDialogue(): void {
    this.show('dialogue', false);
    this.typing = null;
    if (this.bannerQueue) {
      const q = this.bannerQueue;
      this.bannerQueue = null;
      this.banner(...q);
    }
  }
  update(dt: number): void {
    this.touch.update(dt, this.g.mode);
    if (this.typing) {
      const t = this.typing;
      const before = Math.floor(t.i);
      t.i += dt * 62;
      if (Math.floor(t.i) !== before) {
        t.el.textContent = t.full.slice(0, Math.floor(t.i));
        if (Math.floor(t.i) % 3 === 0) this.g.audio.sfx('texto', 0.5);
      }
      if (t.i >= t.full.length) this.typing = null;
    }
  }

  // ---------- tela inicial, menu, criação ----------
  splash(on: boolean): void {
    this.show('splash', on);
    if (on)
      this.$.splash.innerHTML = `<div class="title-block"><div class="brasao">${glyphSvg('brasao', 72)}</div><div class="label over">Uma aventura de método, dúvida e companhia</div><h1>Interprete<i>.</i></h1><div class="subtitle">O Crivo e a Névoa das Conclusões</div></div><div class="press">${this.touch.enabled ? 'Toque para começar' : 'Pressione qualquer tecla'}</div>`;
  }
  menu(on: boolean): void {
    this.show('menu', on);
    if (!on) return;
    const rec = this.g.recoverSave();
    const has = this.g.hasSave();
    const note = rec === 'recuperado' ? '<p class="warn" role="alert">O registro mais recente estava ilegível. O jogo voltou para a gravação anterior.</p>' : rec === 'ilegivel' ? '<p class="warn" role="alert">Há um registro gravado que não pôde ser lido. Ele foi guardado à parte e não será apagado enquanto você não começar um novo caminho.</p>' : '';
    this.$.menu.innerHTML = `<div class="side"><div class="brasao">${glyphSvg('brasao', 56)}</div><h1>Interprete<i>.</i></h1><div class="subtitle">O Crivo e a Névoa das Conclusões</div>
      ${has ? `<button class="btn" data-a="continue" data-focus>Continuar<small>${esc(this.g.saveSummary())}</small></button>` : ''}
      <button class="btn" data-a="new" ${has ? '' : 'data-focus'}>Novo caminho<small>${has ? 'Substitui o registro atual depois de confirmar' : 'Escolha um ofício e conheça o Crivo'}</small></button>
      <button class="btn" data-a="config">Configurações<small>Imagem, som, controles e acessibilidade</small></button>
      <div class="row save-tools">${has ? '<button class="btn small" data-a="export">Baixar registro</button>' : ''}<button class="btn small" data-a="import">Importar registro</button><input type="file" accept="application/json,.json" hidden aria-hidden="true" tabindex="-1"></div>${note}
      <div class="foot">Versão 0.1 · um jogador. A cooperação entra numa fase posterior.<br>Os casos são simulações fictícias e não orientam decisões de saúde.</div></div><div></div>`;
    this.$.menu.querySelectorAll('button').forEach((b) =>
      b.addEventListener('click', () => {
        this.sfx('uiAbrir');
        const a = (b as HTMLElement).dataset.a;
        if (a === 'continue') this.g.continueGame();
        else if (a === 'new') {
          if (has) this.confirm('Começar um novo caminho?', 'O registro atual será substituído quando você confirmar o nome do novo viajante.', 'Começar de novo', () => this.g.openCreate());
          else this.g.openCreate();
        } else if (a === 'export') this.downloadSave();
        else if (a === 'import') file.click();
        else this.openBook('config');
      }),
    );
    const file = this.$.menu.querySelector('input[type=file]') as HTMLInputElement;
    file.addEventListener('change', () => {
      const f = file.files?.[0];
      if (!f) return;
      void f.text().then((txt) => {
        const go = () => {
          if (this.g.importSave(txt)) {
            this.toast('Registro importado.', 'Registro');
            this.menu(true);
          } else this.toast('Este arquivo não é um registro válido do jogo, ou o navegador recusou a gravação.', 'Registro', 8);
        };
        if (has) this.confirm('Substituir o registro atual?', 'O registro deste navegador dá lugar ao do arquivo. A gravação anterior fica guardada como cópia.', 'Substituir', go);
        else go();
      });
    });
    this.focusFirst(this.$.menu);
  }
  confirm(title: string, text: string, yes: string, onYes: () => void): void {
    const p = this.$.pause;
    p.innerHTML = `<div class="card"><div class="label">Confirmar</div><h2>${esc(title)}</h2><p>${esc(text)}</p><button class="btn primary" data-a="y">${esc(yes)}</button><button class="btn" data-a="no" data-focus>Voltar</button></div>`;
    this.show('pause', true);
    p.querySelectorAll('button').forEach((b) =>
      b.addEventListener('click', () => {
        this.show('pause', false);
        if ((b as HTMLElement).dataset.a === 'y') onYes();
      }),
    );
    this.focusFirst(p);
  }
  createScreen(on: boolean): void {
    this.show('create', on);
    if (!on) return;
    const c = this.create;
    const render = () => {
      const prof = PROFESSIONS.find((p) => p.id === c.prof)!;
      const coats = COAT_COLORS;
      this.$.create.innerHTML = `<div class="side"><div><div class="label">Novo caminho</div><h2>Quem chega ao Pátio?</h2></div>
        <div><div class="label" style="margin-bottom:8px">Ofício</div><div class="profs">${PROFESSIONS.map((p) => `<button class="chip" data-prof="${p.id}" aria-pressed="${p.id === c.prof}">${esc(p.name)}</button>`).join('')}</div></div>
        <div class="prof-line">${esc(prof.line)}<br><span class="label" style="font-style:normal">Objeto de ofício · ${esc(prof.tool)}</span></div>
        <div class="row"><span class="label">Nome</span><input type="text" maxlength="18" placeholder="Viajante" value="${esc(c.name)}" style="flex:1;width:auto" aria-label="Nome"></div>
        <div class="row"><span class="label">Corpo</span>${(['fem', 'masc'] as const).map((b) => `<button class="chip" data-body="${b}" aria-pressed="${b === c.body}">${b === 'fem' ? 'Feminino' : 'Masculino'}</button>`).join('')}</div>
        <div class="row"><span class="label">Pele</span>${SKINS.map((s, i) => `<button class="swatch" data-skin="${i}" aria-pressed="${i === c.skin}" aria-label="Pele: ${SKIN_NAMES[i] ?? `tom ${i + 1}`}" title="${SKIN_NAMES[i] ?? ``}" style="background:${hex(s)}"></button>`).join('')}</div>
        <div class="row"><span class="label">Cabelo</span>${HAIRS.map((s, i) => `<button class="swatch" data-hair="${i}" aria-pressed="${i === c.hair}" aria-label="Cabelo: ${HAIR_NAMES[i] ?? `cor ${i + 1}`}" title="${HAIR_NAMES[i] ?? ``}" style="background:${hex(s)}"></button>`).join('')}</div>
        <div class="row"><span class="label">Corte</span>${['Curto', 'Coque', 'Longo', 'Capuz'].map((s, i) => `<button class="chip" data-style="${i}" aria-pressed="${i === c.style}">${s}</button>`).join('')}</div>
        <div class="row"><span class="label">Casaco</span>${coats.map((s, i) => `<button class="swatch" data-coat="${i}" aria-pressed="${i === c.coat}" aria-label="Casaco: ${COAT_NAMES[i] ?? `cor ${i + 1}`}" title="${COAT_NAMES[i] ?? ``}" style="background:${hex(s)}"></button>`).join('')}</div>
        <div class="row" style="margin-top:auto"><button class="btn" data-a="back">Voltar</button><button class="btn primary" data-a="go" style="margin-left:auto">Entrar no Pátio</button></div>
        <div class="foot" style="color:var(--g-mute);font-size:12px">Nenhum ofício é melhor que outro. Mudam algumas falas e o que cabe a você fazer em cada caso.</div></div><div></div>`;
      const inp = this.$.create.querySelector('input') as HTMLInputElement;
      inp.addEventListener('input', () => (c.name = inp.value));
      inp.addEventListener('keydown', (e) => e.stopPropagation());
      this.$.create.querySelectorAll<HTMLElement>('button').forEach((b) =>
        b.addEventListener('click', () => {
          const d = b.dataset;
          this.sfx('ui');
          if (d.a === 'back') return this.g.openMenu();
          if (d.a === 'go') return this.g.startNew(c.name, c.prof, this.look());
          if (d.prof) {
            c.prof = d.prof as ProfessionId;
            c.coat = Math.max(0, COAT_COLORS.indexOf(PROFESSIONS.find((x) => x.id === c.prof)!.coat));
          }
          if (d.body === 'fem' || d.body === 'masc') c.body = d.body;
          if (d.skin) c.skin = Number(d.skin);
          if (d.hair) c.hair = Number(d.hair);
          if (d.style) c.style = Number(d.style);
          if (d.coat) c.coat = Number(d.coat);
          this.g.previewAvatar(this.look(), c.prof);
          render();
        }),
      );
    };
    render();
    this.g.previewAvatar(this.look(), c.prof);
  }
  private look() {
    const c = this.create;
    return { skin: c.skin, hair: c.hair + c.style * HAIRS.length, coat: c.coat, body: c.body };
  }

  // ---------- pausa, derrota, final ----------
  pause(on: boolean): void {
    this.show('pause', on);
    if (!on) return;
    const p = this.$.pause;
    p.innerHTML = `<div class="card"><div class="label">Pausa</div><h2>O Pátio espera.</h2><p>O caminho é registrado ao descansar, ao mudar de região, a cada objetivo cumprido e, fora de combate, a cada 45 segundos.</p>${this.g.saveFailed ? '<p class="warn" role="alert">O navegador recusou a última gravação (armazenamento cheio, bloqueado ou janela anônima). Baixe uma cópia do registro para não perder esta sessão.</p>' : ''}
      <button class="btn primary" data-a="resume" data-focus>Continuar</button><button class="btn" data-a="config">Configurações</button>${document.fullscreenEnabled ? '<button class="btn" data-a="full">Tela cheia</button>' : ''}<button class="btn" data-a="export">Baixar cópia do registro</button><button class="btn" data-a="title">Registrar e voltar ao título</button></div>`;
    p.querySelectorAll<HTMLElement>('button').forEach((b) =>
      b.addEventListener('click', () => {
        this.sfx('ui');
        if (b.dataset.a === 'full') {
          if (document.fullscreenElement) void document.exitFullscreen();
          else
            void document.documentElement
              .requestFullscreen?.()
              // Esc fecha painéis sem derrubar a tela cheia; segurar Esc ainda sai dela (Chromium)
              .then(() => (navigator as unknown as { keyboard?: { lock?: (k: string[]) => Promise<void> } }).keyboard?.lock?.(['Escape']))
              .catch(() => undefined);
        } else if (b.dataset.a === 'export') this.downloadSave();
        else if (b.dataset.a === 'resume') this.g.closeOverlay();
        else if (b.dataset.a === 'config') {
          this.show('pause', false);
          this.bookFromPause = true;
          this.openBook('config');
        } else this.g.toTitle();
      }),
    );
    this.focusFirst(p);
  }
  downloadSave(): void {
    const data = this.g.exportSave();
    if (!data) return this.toast('Ainda não há registro para copiar.');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    a.download = 'interprete-rpg-registro.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    this.toast('Cópia do registro baixada. No menu inicial, "Importar registro" traz esse arquivo de volta.', 'Registro', 8);
  }
  defeat(on: boolean): void {
    this.show('defeat', on);
    if (!on) return;
    const p = this.$.defeat;
    p.innerHTML = `<div class="card"><div class="label">A névoa fechou</div><h2>Você perdeu o fio.</h2><p>Nada do que você aprendeu ou recolheu foi perdido. O Crivo leva você de volta ao último ponto seguro registrado, com a vida refeita.</p><button class="btn primary" data-focus>Retomar o caminho</button></div>`;
    p.querySelector('button')!.addEventListener('click', () => this.g.respawn());
    this.focusFirst(p);
  }
  ending(on: boolean, lines: string[] = []): void {
    this.show('ending', on);
    if (!on) return;
    const p = this.$.ending;
    p.innerHTML = `<div class="card" style="width:min(620px,92vw)"><div class="label">Fim do primeiro caminho</div><h2>A Névoa ficou do tamanho certo.</h2>${lines.map((l) => `<p>${esc(l)}</p>`).join('')}<button class="btn primary" data-focus>Continuar explorando o Pátio</button></div>`;
    p.querySelector('button')!.addEventListener('click', () => {
      this.show('ending', false);
      this.g.closeOverlay();
    });
    this.focusFirst(p);
  }

  // ---------- loja ----------
  shop(on: boolean): void {
    this.show('shop', on);
    if (!on) return;
    const s = this.g.state!;
    const p = this.$.shop;
    p.innerHTML = `<div class="card" style="width:min(640px,94vw)"><div class="label">Banca de Dalva · ${s.coins} moedas</div><h2>O que dá para consertar, eu conserto.</h2>
      <div>${SHOP.map((id) => {
        const it = ITEMS[id];
        const price = this.g.priceOf(id);
        const owned = it.type !== 'consumivel' && countItem(s, id) > 0;
        return `<button class="shop-row" data-id="${id}" ${owned || s.coins < price ? 'disabled' : ''}>${icon(it.glyph)}<span><b>${esc(it.name)}</b><small>${esc(it.effect)}</small></span><span class="p">${owned ? 'adquirido' : glyphSvg('custo', 12) + ' ' + price + ' moedas'}</span></button>`;
      }).join('')}</div>
      <button class="btn" data-a="close" data-focus style="margin-top:12px">Fechar</button></div>`;
    p.querySelectorAll<HTMLElement>('button').forEach((b) =>
      b.addEventListener('click', () => {
        if (b.dataset.a === 'close') return this.g.closeOverlay();
        if (b.dataset.id && this.g.buyItem(b.dataset.id)) this.shop(true);
      }),
    );
    this.focusFirst(p);
  }

  // ---------- livro ----------
  openBook(tab: BookTab): void {
    this.bookTab = tab;
    this.g.enterOverlay('book');
    this.show('book', true);
    this.sfx('uiAbrir');
    this.renderBook();
  }
  closeBook(): void {
    this.show('book', false);
  }
  closeAll(): void {
    for (const id of ['book', 'shop', 'case', 'pause', 'defeat', 'menu', 'create', 'splash']) this.show(id, false);
  }
  get bookOpen(): boolean {
    return !this.$.book.classList.contains('hidden');
  }

  renderBook(): void {
    const s = this.g.state;
    const tabs: Array<[BookTab, string]> = s
      ? [['inventario', 'Inventário'], ['habilidades', 'Habilidades'], ['mapa', 'Mapa'], ['diario', 'Diário'], ['codice', 'Códice'], ['config', 'Configurações']]
      : [['config', 'Configurações']];
    if (!s) this.bookTab = 'config';
    const b = this.$.book;
    b.innerHTML = `<div class="frame"><nav><div class="brand">Interprete<i>.</i></div>${tabs.map(([id, n]) => `<button data-tab="${id}" aria-current="${id === this.bookTab}">${n}</button>`).join('')}<div class="foot"><button data-a="close" style="padding:8px 0;color:var(--g-text)"><span class="kbd">Esc</span> Fechar</button></div></nav><div class="page"></div></div>`;
    b.querySelectorAll<HTMLElement>('nav button').forEach((x) =>
      x.addEventListener('click', () => {
        if (x.dataset.a === 'close') return this.g.closeOverlay();
        this.bookTab = x.dataset.tab as BookTab;
        this.sfx('ui');
        this.renderBook();
      }),
    );
    const page = b.querySelector('.page') as HTMLElement;
    if (this.bookTab === 'inventario') this.pageInventory(page);
    else if (this.bookTab === 'habilidades') this.pageSkills(page);
    else if (this.bookTab === 'mapa') this.pageMap(page);
    else if (this.bookTab === 'diario') this.pageJournal(page);
    else if (this.bookTab === 'codice') this.pageCodex(page);
    else this.pageConfig(page);
  }

  private pageInventory(page: HTMLElement): void {
    const s = this.g.state!;
    const ids = Object.keys(s.inventory);
    const sel = this.sel.item && s.inventory[this.sel.item] ? this.sel.item : ids[0];
    const slots: Array<['arma' | 'ferramenta' | 'traje' | 'calcado' | 'amuleto', string]> = [['arma', 'Arma'], ['ferramenta', 'Ferramenta'], ['traje', 'Traje'], ['calcado', 'Calçado'], ['amuleto', 'Amuleto']];
    const cells: string[] = [];
    for (let i = 0; i < Math.max(20, Math.ceil(ids.length / 5) * 5); i++) {
      const id = ids[i];
      if (!id) cells.push('<div class="cell empty"></div>');
      else cells.push(`<button class="cell${ITEMS[id]?.rarity ? ' r-' + ITEMS[id].rarity : ''}" data-id="${id}" aria-pressed="${id === sel}" aria-label="${esc(ITEMS[id]?.name ?? id)}${s.inventory[id] > 1 ? `, ${s.inventory[id]} unidades` : ''}${isEquipped(s, id) ? ', em uso' : ''}">${icon(ITEMS[id]?.glyph ?? 'vazio')}${s.inventory[id] > 1 ? `<span class="n">${s.inventory[id]}</span>` : ''}${isEquipped(s, id) ? '<span class="eq">EM USO</span>' : ''}</button>`);
    }
    let detail = '<div class="empty-state">A bolsa está vazia. O que você recolher pelo caminho aparece aqui, com o que faz e de onde veio.</div>';
    if (sel && ITEMS[sel]) {
      const it = ITEMS[sel];
      const typeName = { consumivel: 'Consumível', ferramenta: 'Ferramenta', equipamento: 'Equipamento', missao: 'Item de missão', melhoria: 'Melhoria permanente' }[it.type];
      let action = '';
      if (it.slot) action = `<button class="btn primary" data-a="equip">${isEquipped(s, sel) ? 'Guardar' : 'Equipar'}</button>`;
      else if (it.type === 'consumivel') action = `<button class="btn primary" data-a="use">Usar</button>`;
      detail = `<div class="big">${icon(it.glyph)}</div><div><div class="label">${typeName}${it.rarity ? ` · <span class="rar r-${it.rarity}">${RARITY_LABEL[it.rarity]}</span>` : ''}</div><h3>${esc(it.name)}</h3></div><p>${esc(it.desc)}</p><p class="fx">${esc(it.effect)}</p>${it.ref ? `<p class="ref">Conceito · ${esc(it.ref)}</p>` : ''}<div style="margin-top:auto">${action}</div>`;
    }
    page.innerHTML = `<div class="label">${s.coins} moedas · ${esc(s.name)}, nível ${s.level}</div><h2>Inventário</h2><div class="cols"><div class="scroll"><div class="equip">${slots.map(([k, n]) => `<button class="cell" data-slot="${k}" ${s.equipment[k] ? '' : 'disabled'}>${icon(s.equipment[k] ? ITEMS[s.equipment[k]!].glyph : 'vazio')}<small>${n}</small></button>`).join('')}</div><div class="grid">${cells.join('')}</div></div><div class="detail">${detail}</div></div>`;
    page.querySelectorAll<HTMLElement>('button').forEach((x) =>
      x.addEventListener('click', () => {
        const d = x.dataset;
        if (d.id) this.sel.item = d.id;
        else if (d.slot && s.equipment[d.slot as 'traje']) this.sel.item = s.equipment[d.slot as 'traje']!;
        else if (d.a === 'equip' && sel) this.g.toggleEquip(sel);
        else if (d.a === 'use' && sel) this.g.useItem(sel);
        this.sfx('ui');
        this.renderBook();
      }),
    );
  }

  private pageSkills(page: HTMLElement): void {
    const s = this.g.state!;
    const crivo = this.skillTab === 'crivo';
    const defs = crivo ? CRIVO_SKILLS : PLAYER_SKILLS;
    const owned = crivo ? s.crivoSkills : s.skills;
    const pts = crivo ? s.crivoPoints : s.skillPoints;
    const branches = [...new Set(defs.map((d) => d.branch))];
    const selId = this.sel['skill' + this.skillTab] ?? defs[0].id;
    const selDef = defs.find((d) => d.id === selId) ?? defs[0];
    const chk = canUnlock(selDef, owned, pts, s.level);
    const node = (d: SkillDef) => {
      const on = owned.includes(d.id);
      const can = !on && canUnlock(d, owned, pts, s.level).ok;
      return `<button class="node ${on ? 'on' : can ? 'can' : ''}" data-id="${d.id}" aria-pressed="${d.id === selDef.id}"><b>${esc(d.name)}</b><small>${on ? 'ativa' : d.locked ? 'em breve' : d.cost === 0 ? 'inata' : d.cost + (d.cost > 1 ? ' pontos' : ' ponto')}</small></button>`;
    };
    const looks = crivo && (s.flags.includes('crivo_laco') || s.flags.includes('crivo_capa'))
      ? `<div class="set"><label for="look-laco">Laço dourado</label><input type="checkbox" id="look-laco" data-look="laco" ${s.crivoLook.laco ? 'checked' : ''} ${s.flags.includes('crivo_laco') ? '' : 'disabled'}></div><div class="set"><label for="look-capa">Capa esmeralda</label><input type="checkbox" id="look-capa" data-look="capa" ${s.crivoLook.capa ? 'checked' : ''} ${s.flags.includes('crivo_capa') ? '' : 'disabled'}></div>`
      : '';
    page.innerHTML = `<div class="label">${crivo ? 'O companheiro cresce com as missões' : 'Um ponto a cada nível'}</div><h2>Habilidades</h2>
      <div class="tabs" role="tablist"><button role="tab" data-t="jogador" aria-selected="${!crivo}">${esc(s.name)}</button><button role="tab" data-t="crivo" aria-selected="${crivo}">Crivo</button><span class="pts">${pts} ${pts === 1 ? 'PONTO DISPONÍVEL' : 'PONTOS DISPONÍVEIS'}</span></div>
      <div class="cols"><div class="scroll"><div class="tree">${branches.map((br) => `<div class="branch"><h4>${esc(br)}</h4>${defs.filter((d) => d.branch === br).sort((a, b2) => a.tier - b2.tier).map(node).join('')}</div>`).join('')}</div></div>
      <div class="detail"><div><div class="label">${esc(selDef.branch)}</div><h3>${esc(selDef.name)}</h3></div><p>${esc(selDef.desc)}</p><p class="fx">${esc(selDef.effect)}</p>
      ${owned.includes(selDef.id) ? '<p class="ref">Ativa</p>' : chk.ok ? '<button class="btn primary" data-a="unlock">Aprender</button>' : `<p class="ref">${esc((chk as { reason: string }).reason)}</p>`}${looks ? `<div style="margin-top:auto"><div class="label" style="margin-bottom:6px">Aparência do Crivo</div>${looks}</div>` : ''}</div></div>`;
    page.querySelectorAll<HTMLElement>('button, input').forEach((x) =>
      x.addEventListener(x.tagName === 'INPUT' ? 'change' : 'click', () => {
        const d = x.dataset;
        if (d.t) this.skillTab = d.t as 'jogador' | 'crivo';
        else if (d.id) this.sel['skill' + this.skillTab] = d.id;
        else if (d.a === 'unlock') this.g.unlock(selDef, crivo);
        else if (d.look) this.g.setCrivoLook(d.look as 'laco' | 'capa', (x as HTMLInputElement).checked);
        this.renderBook();
      }),
    );
  }

  private pageJournal(page: HTMLElement): void {
    const s = this.g.state!;
    const ids = Object.keys(s.quests).sort((a, b) => Number(s.quests[a].status === 'concluida') - Number(s.quests[b].status === 'concluida'));
    if (!ids.length) {
      page.innerHTML = `<div class="label">Diário</div><h2>Nada anotado ainda</h2><div class="empty-state">Converse com quem está no Pátio. O que você aceitar investigar fica registrado aqui, sem prazo.</div>`;
      return;
    }
    const sel = this.sel.quest && s.quests[this.sel.quest] ? this.sel.quest : (this.g.trackedQuest()?.id ?? ids[0]);
    const q = QUESTS[sel];
    const st = s.quests[sel];
    const notes = s.skills.includes('anotacoes');
    page.innerHTML = `<div class="label">Sem cronômetro, sem ordem obrigatória entre as paralelas</div><h2>Diário</h2><div class="cols"><div class="scroll">${ids
      .map((id) => `<button class="quest ${s.quests[id].status === 'concluida' ? 'done' : ''}" data-id="${id}" aria-pressed="${id === sel}"><small>${glyphSvg(QUESTS[id].kind === 'principal' ? 'alvo' : 'pergunta', 12)} ${QUESTS[id].kind === 'principal' ? 'Caminho principal' : 'Paralela'}${s.quests[id].status === 'concluida' ? ' · concluída' : ''}</small><b>${esc(QUESTS[id].title)}</b></button>`)
      .join('')}</div><div class="detail scroll"><div><div class="label">${q.kind === 'principal' ? 'Caminho principal' : 'Missão paralela'}</div><h3>${esc(q.title)}</h3></div><p>${esc(st.status === 'concluida' ? q.done : q.summary)}</p>
      <ul class="steps">${q.steps
        .map((p, i) => {
          const done = st.status === 'concluida' || i < st.step;
          const cur = st.status === 'ativa' && i === st.step;
          if (!done && !cur) return '';
          return `<li class="${done ? 'done' : 'cur'}">${esc(p.text)}${cur && p.hint && notes ? `<em>${esc(p.hint)}</em>` : ''}</li>`;
        })
        .join('')}</ul>${st.status === 'ativa' ? `<button class="btn" data-a="track" style="margin-top:12px">${this.g.trackedQuest()?.id === sel ? 'Acompanhando no objetivo' : 'Acompanhar esta missão'}</button>` : ''}${this.log.length ? `<details class="recent" style="margin-top:18px"><summary>Avisos e dicas recentes (${this.log.length})</summary><ul class="log-list">${this.log.map((l) => `<li><span class="label">${esc(l.label)}</span>${esc(l.text)}</li>`).join('')}</ul></details>` : ''}</div></div>`;
    page.querySelectorAll<HTMLElement>('button').forEach((x) =>
      x.addEventListener('click', () => {
        if (x.dataset.id) this.sel.quest = x.dataset.id;
        else if (x.dataset.a === 'track') this.g.track(sel);
        this.sfx('ui');
        this.renderBook();
      }),
    );
  }

  private pageCodex(page: HTMLElement): void {
    const s = this.g.state!;
    const groups = ['Mundo', 'Pessoas', 'Criaturas', 'Método', 'Mestres', 'Obras'] as const;
    const groupGlyph: Record<(typeof groups)[number], Ps2Glyph> = { Mundo: 'descoberta', Pessoas: 'comparacao', Criaturas: 'incerteza', Método: 'crivo', Mestres: 'pergunta', Obras: 'evidencia' };
    const have = s.codex.filter((id) => CODEX[id]);
    const sel = this.sel.codex && have.includes(this.sel.codex) ? this.sel.codex : have[0];
    const e = CODEX[sel];
    page.innerHTML = `<div class="label">${have.length} de ${Object.keys(CODEX).length} verbetes · leitura opcional</div><h2>Códice</h2><div class="cols"><div class="scroll">${groups
      .map((gname) => {
        const list = have.filter((id) => CODEX[id].group === gname);
        return list.length ? `<div class="label" style="margin:10px 12px 4px">${glyphSvg(groupGlyph[gname], 14)} ${gname}</div>${list.map((id) => `<button class="quest" data-id="${id}" aria-pressed="${id === sel}"><b>${esc(CODEX[id].title)}</b></button>`).join('')}` : '';
      })
      .join('')}</div><div class="detail scroll codex-body"><div><div class="label">${e.group}</div><h3>${esc(e.title)}</h3></div>${e.body.map((p) => `<p>${esc(p)}</p>`).join('')}${e.note ? `<div class="note"><span class="label">Para quem quiser saber mais</span>${esc(e.note)}</div>` : ''}${e.refs?.length ? `<div class="note refs"><span class="label">Onde conferir</span><ul class="case-src">${e.refs.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></div>` : ''}</div></div>`;
    page.querySelectorAll<HTMLElement>('button').forEach((x) =>
      x.addEventListener('click', () => {
        this.sel.codex = x.dataset.id!;
        this.sfx('ui');
        this.renderBook();
      }),
    );
  }

  private pageMap(page: HTMLElement): void {
    const r = this.g.region;
    page.innerHTML = `<div class="label">${esc(r.subtitle)}</div><h2>${esc(r.name)}</h2><div class="map-tools"><button class="btn" data-z="1" aria-label="Aproximar">+</button><button class="btn" data-z="-1" aria-label="Afastar">−</button><button class="btn" data-z="0">Centralizar em mim</button><span class="map-hint">${this.touch.enabled ? 'Arraste para mover · use + e − para aproximar' : this.g.input.usingPad ? 'Use os botões + e − e "Centralizar em mim"' : 'Arraste ou use as setas para mover · roda do mouse ou + e − para aproximar'}</span></div><canvas id="map-canvas" tabindex="0"></canvas>`;
    const cv = page.querySelector('canvas') as HTMLCanvasElement;
    const v = this.mapView;
    const redraw = () => this.drawMap(cv);
    const px = this.g.player?.pos;
    v.zoom = 1;
    v.x = 0;
    v.z = 0;
    const zoomBy = (f: number) => {
      v.zoom = Math.min(5, Math.max(0.7, v.zoom * f));
      redraw();
    };
    page.querySelectorAll<HTMLElement>('[data-z]').forEach((b) =>
      b.addEventListener('click', () => {
        const d = Number(b.dataset.z);
        if (d === 0) {
          v.zoom = 1.8;
          const bb = r.bounds;
          v.x = (px?.x ?? 0) - (bb.minX + bb.maxX) / 2;
          v.z = (px?.z ?? 0) - (bb.minZ + bb.maxZ) / 2;
          redraw();
        } else zoomBy(d > 0 ? 1.35 : 1 / 1.35);
      }),
    );
    cv.addEventListener('wheel', (e) => {
      e.preventDefault();
      zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15);
    }, { passive: false });
    let drag: { x: number; y: number } | null = null;
    cv.addEventListener('pointerdown', (e) => {
      drag = { x: e.clientX, y: e.clientY };
      cv.setPointerCapture(e.pointerId);
      cv.classList.add('grab');
    });
    cv.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const k = this.mapScale || 1;
      v.x -= ((e.clientX - drag.x) * 2) / k;
      v.z -= ((e.clientY - drag.y) * 2) / k;
      drag = { x: e.clientX, y: e.clientY };
      redraw();
    });
    const end = () => {
      drag = null;
      cv.classList.remove('grab');
    };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);
    cv.addEventListener('keydown', (e) => {
      const st = 40 / (this.mapScale || 1);
      const m: Record<string, [number, number]> = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, -st], ArrowDown: [0, st] };
      if (m[e.code]) {
        v.x += m[e.code][0] * 3;
        v.z += m[e.code][1] * 3;
        e.preventDefault();
        e.stopPropagation();
        redraw();
      } else if (e.key === '+' || e.key === '=') zoomBy(1.35);
      else if (e.key === '-') zoomBy(1 / 1.35);
    });
    requestAnimationFrame(redraw);
  }
  private mapView = { zoom: 1, x: 0, z: 0 };
  private mapScale = 1;
  private drawMap(cv: HTMLCanvasElement): void {
    const r = this.g.region;
    if (!cv.isConnected || cv.clientWidth < 80 || cv.clientHeight < 80) return;
    const w = (cv.width = cv.clientWidth * 2);
    const h = (cv.height = cv.clientHeight * 2);
    const c = cv.getContext('2d')!;
    const css = getComputedStyle(document.documentElement);
    const ink = css.getPropertyValue('--crimson-violet').trim() || '#43061e';
    const b = r.bounds;
    const pad = 60;
    const sc = Math.min((w - pad * 2) / (b.maxX - b.minX), (h - pad * 2) / (b.maxZ - b.minZ)) * this.mapView.zoom;
    this.mapScale = sc;
    const ox = w / 2 - ((b.minX + b.maxX) / 2 + this.mapView.x) * sc;
    const oz = h / 2 - ((b.minZ + b.maxZ) / 2 + this.mapView.z) * sc;
    const X = (x: number) => ox + x * sc;
    const Z = (z: number) => oz + z * sc;
    c.fillStyle = '#f0e5d3';
    c.fillRect(0, 0, w, h);
    // áreas caminháveis
    c.fillStyle = 'rgba(67,6,30,0.07)';
    if (r.baseGround !== null) c.fillRect(X(b.minX), Z(b.minZ), (b.maxX - b.minX) * sc, (b.maxZ - b.minZ) * sc);
    for (const p of r.platforms) {
      c.save();
      c.translate(X(p.x), Z(p.z));
      c.rotate(-p.rot);
      c.fillStyle = r.baseGround === null ? 'rgba(67,6,30,0.09)' : 'rgba(67,6,30,0.06)';
      c.fillRect(-p.hx * sc, -p.hz * sc, p.hx * 2 * sc, p.hz * 2 * sc);
      c.restore();
    }
    // construções
    c.fillStyle = 'rgba(67,6,30,0.5)';
    for (const k of r.colliders) {
      if (k.yMax - k.yMin < 2.4) continue;
      if (k.kind === 'circle') {
        if (k.r < 0.6) continue;
        c.beginPath();
        c.arc(X(k.x), Z(k.z), k.r * sc, 0, 7);
        c.fill();
      } else {
        if (k.hx > 25 || k.hz > 25) continue;
        c.save();
        c.translate(X(k.x), Z(k.z));
        c.rotate(-k.rot);
        c.fillRect(-k.hx * sc, -k.hz * sc, k.hx * 2 * sc, k.hz * 2 * sc);
        c.restore();
      }
    }
    c.strokeStyle = ink;
    c.lineWidth = 2;
    c.strokeRect(14, 14, w - 28, h - 28);
    c.font = '500 18px "IBM Plex Mono", monospace';
    c.textAlign = 'center';
    // glifos da direção PS2 no lugar dos losangos: passagem, gente a quem perguntar, ponto de interesse
    const redraw = () => this.drawMap(cv);
    c.imageSmoothingEnabled = false;
    for (const m of r.mapPoints) {
      const gl = MAP_GLYPH[m.kind];
      const col = m.kind === 'portal' ? '#8c1535' : ink;
      const im = glyphImage(gl, col, redraw);
      if (im) c.drawImage(im, Math.round(X(m.x) - 16), Math.round(Z(m.z) - 16), 32, 32);
      else {
        c.fillStyle = col;
        c.fillRect(X(m.x) - 5, Z(m.z) - 5, 10, 10);
      }
      c.fillStyle = ink;
      c.fillText(m.label.toUpperCase(), X(m.x), Z(m.z) - 24);
    }
    const t = this.g.targetPos();
    if (t) {
      const im = glyphImage('alvo', '#d62839', redraw);
      if (im) c.drawImage(im, Math.round(X(t.x) - 20), Math.round(Z(t.z) - 20), 40, 40);
      else {
        c.strokeStyle = '#d62839';
        c.lineWidth = 4;
        c.beginPath();
        c.arc(X(t.x), Z(t.z), 16, 0, 7);
        c.stroke();
      }
    }
    const p = this.g.player;
    if (p) {
      c.save();
      c.translate(X(p.pos.x), Z(p.pos.z));
      c.rotate(-p.yaw + Math.PI);
      c.fillStyle = '#d62839';
      c.beginPath();
      c.moveTo(0, -16);
      c.lineTo(11, 12);
      c.lineTo(0, 6);
      c.lineTo(-11, 12);
      c.closePath();
      c.fill();
      c.restore();
    }
    c.fillStyle = ink;
    c.textAlign = 'left';
    c.fillText('N ↑', 34, 50);
  }

  private pageConfig(page: HTMLElement): void {
    const st = this.g.settings;
    const fmt: Partial<Record<keyof typeof st, (v: number) => string>> = {
      fov: (v) => `${v}°`,
      sens: (v) => `${v.toFixed(1)}×`,
      touchScale: (v) => `${Math.round(v * 100)}%`,
      padDeadzone: (v) => `${Math.round(v * 100)}%`,
      noticeTime: (v) => `${v.toFixed(1)}×`,
    };
    const show = (k: keyof typeof st, v: number) => (fmt[k] ?? ((x: number) => `${Math.round(x * 100)}%`))(v);
    const range = (k: keyof typeof st, label: string, min: number, max: number, step: number, note = '') =>
      `<div class="set"><label for="cfg-${k}">${label}${note ? `<small>${note}</small>` : ''}</label><span class="rng"><input type="range" id="cfg-${k}" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${st[k]}"><output for="cfg-${k}">${show(k, Number(st[k]))}</output></span></div>`;
    const check = (k: keyof typeof st, label: string, note = '') => `<div class="set"><label for="cfg-${k}">${label}${note ? `<small>${note}</small>` : ''}</label><input type="checkbox" id="cfg-${k}" data-k="${k}" ${st[k] ? 'checked' : ''}></div>`;
    const select = (k: keyof typeof st, label: string, opts: Array<[string, string]>, note = '') =>
      `<div class="set"><label for="cfg-${k}">${label}${note ? `<small>${note}</small>` : ''}</label><select id="cfg-${k}" data-k="${k}">${opts.map(([v, n]) => `<option value="${v}" ${String(st[k]) === v ? 'selected' : ''}>${n}</option>`).join('')}</select></div>`;
    const acts = Object.keys(ACTION_LABEL) as ActionName[];
    const inp = this.g.input;
    const padActs = acts.filter((a) => !['frente', 'tras', 'esquerda', 'direita', 'camEsq', 'camDir', 'habilidades'].includes(a));
    const bindRow = (a: ActionName) =>
      `<div class="set"><label>${ACTION_LABEL[a]}</label><span class="binds"><button class="btn" data-bind="${a}" aria-label="${ACTION_LABEL[a]}: tecla ${inp.keys[a].map(keyLabel).join(' ou ') || 'nenhuma'}. Acione para trocar.">${inp.keys[a].map(keyLabel).join(' · ') || 'sem tecla'}</button>${padActs.includes(a) ? `<button class="btn" data-bindpad="${a}" aria-label="${ACTION_LABEL[a]}: botão do controle ${padLabel(inp.pad[a])}. Acione para trocar.">${padLabel(inp.pad[a])}</button>` : '<span class="btn ghost" aria-hidden="true">analógico</span>'}</span></div>`;
    page.innerHTML = `<div class="label">Valem para este navegador</div><h2>Configurações</h2><div class="scroll"><div class="settings">
      <h4>Imagem</h4>${select('aparencia', 'Aparência', [['ps2', 'Era PS2'], ['limpa', 'Limpa']], 'Era PS2: resolução baixa, névoa e pontilhado de época. Limpa: imagem mais nítida. A troca recarrega o jogo.')}${select('quality', 'Qualidade', [['baixa', 'Baixa'], ['media', 'Média'], ['alta', 'Alta']], 'Baixa desliga sombras e brilho. A troca pode levar um instante.')}${range('fov', 'Campo de visão', 48, 75, 1)}${check('grain', 'Grão de filme')}${check('vignette', 'Vinheta')}
      <h4>Som</h4>${range('volGeral', 'Volume geral', 0, 1, 0.05)}${range('volMusica', 'Música', 0, 1, 0.05)}${range('volEfeitos', 'Efeitos', 0, 1, 0.05)}${range('volAmbiente', 'Ambiente', 0, 1, 0.05)}
      <h4>Jogo</h4>${select('difficulty', 'Encontros', [['padrao', 'Padrão'], ['historia', 'História']], 'História reduz o dano recebido')}${range('sens', this.touch.enabled ? 'Sensibilidade da câmera e do toque' : 'Sensibilidade da câmera', 0.3, 2.5, 0.1)}${range('touchScale', 'Tamanho dos botões de toque', 0.8, 1.4, 0.05, this.touch.enabled ? '' : 'Vale quando a tela for tocada')}${check('touchEasyRun', 'Correr sem levar o dedo à borda', 'No toque, a corrida começa a 60% do curso do analógico, em vez de 94%')}${check('invertY', 'Inverter eixo vertical')}${check('hud', 'Mostrar interface durante o jogo')}${check('hudNumbers', 'Números nas barras', 'Vida, vigor e experiência que falta, em números')}
      <h4>Acessibilidade</h4>${select('textScale', 'Tamanho do texto', [['0.9', 'Menor'], ['1', 'Padrão'], ['1.15', 'Maior'], ['1.3', 'Muito maior'], ['1.6', 'Máximo']])}${check('highContrast', 'Alto contraste')}${check('reduceMotion', 'Reduzir movimento', 'Sem tremor de câmera, clarões e texto animado. Começa igual à preferência do sistema.')}${range('noticeTime', 'Duração de avisos e dicas', 0.5, 4, 0.5, 'Avisos passados ficam no Diário')}
      <h4>Controles · acione para remapear</h4><div class="set"><label>Teclado e mouse à esquerda, controle à direita<small>Depois de acionar, pressione a tecla, o botão do mouse ou o botão do controle. Esc cancela. Se a escolha já for de outra ação, as duas trocam e um aviso diz o que mudou.</small></label></div></div><div class="keys">${acts.map(bindRow).join('')}</div>
      <div class="settings"><h4>Controle</h4>${range('padDeadzone', 'Zona morta dos analógicos', 0.05, 0.45, 0.01, 'Aumente se o personagem ou a câmera andarem sozinhos')}<div class="set"><label>Analógico esquerdo move, direito olha, RT também corre. Nos menus, direcional ou analógico percorrem, A aciona e B volta.</label></div><div class="set"><button class="btn" data-a="reset">Restaurar padrões</button></div>
      ${problems.length ? `<div class="settings"><h4>Diagnóstico</h4><div class="set"><label>${problems.length} ${problems.length === 1 ? 'arquivo não carregou' : 'arquivos não carregaram'} nesta sessão. O jogo usa a versão de reserva deles.<small>${problems.map(esc).join('<br>')}</small></label></div></div>` : ''}
      <div class="settings credits"><h4>Créditos</h4>
      <div class="set"><label>Música<small>"Night Vigil", "Equatorial Complex", "Aquarium", "Ether Vox" e "That Zen Moment", de Kevin MacLeod (incompetech.com). Licenciadas sob Creative Commons Atribuição 4.0, creativecommons.org/licenses/by/4.0/. Alterações: arquivos recomprimidos; "That Zen Moment" cortada em cinco minutos.</small></label></div>
      <div class="set"><label>Captura de movimento<small>The data used in this project was obtained from mocap.cs.cmu.edu. The database was created with funding from NSF EIA-0196217. Conversão BVH de B. Hahne.</small></label></div>
      <div class="set"><label>Modelos, texturas e céu<small>Poly Haven (polyhaven.com), CC0. Humanos montados com MakeHuman e MPFB2, com roupas e cabelos CC0 de Donitz, MargaretToigo, Elvaerwyn, RehmanPolanski, jujube, frankyaye, grinsegold e WDG.</small></label></div>
      <div class="set"><label>Sons<small>Freesound (freesound.org): "766206" de dolineh, "789860" de klankbeeld, "877794" e "877796" de isalreky, "877860" de incrediblesgm, "877999", "878005" e "878006" de starsoundzzz, "878026" de duranburrus, "878286" de loganzsound. Cortados, normalizados e convertidos. A licença de cada um ainda está em conferência; ver docs/game/REGISTRO_DE_ASSETS.md.</small></label></div>
      </div></div>`;
    page.querySelectorAll<HTMLElement>('input, select').forEach((x) =>
      x.addEventListener('input', () => {
        const k = x.dataset.k as keyof typeof st;
        const inp = x as HTMLInputElement;
        const v = inp.type === 'checkbox' ? inp.checked : inp.type === 'range' || k === 'textScale' ? Number(inp.value) : inp.value;
        (st as unknown as Record<string, unknown>)[k] = v;
        if (k === 'reduceMotion') st.reduceMotionSet = true;
        if (inp.type === 'range') {
          const out = inp.parentElement?.querySelector('output');
          if (out) out.textContent = show(k, Number(v));
        }
        this.g.applySettings();
      }),
    );
    page.querySelectorAll<HTMLElement>('button').forEach((x) =>
      x.addEventListener('click', () => {
        if (x.dataset.bind) {
          this.rebinding = x.dataset.bind as ActionName;
          this.rebindPad = false;
          x.textContent = 'Tecla ou botão do mouse…';
        } else if (x.dataset.bindpad) {
          this.rebinding = x.dataset.bindpad as ActionName;
          this.rebindPad = true;
          x.textContent = 'Botão do controle…';
          this.g.input.capturePad = (b) => this.finishRebind(null, b);
        } else if (x.dataset.a === 'reset') {
          this.g.resetSettings();
          this.renderBook();
        }
      }),
    );
  }
}

export { xpForLevel };

const MAP_GLYPH: Record<'portal' | 'npc' | 'poi', Ps2Glyph> = { portal: 'descoberta', npc: 'pergunta', poi: 'evidencia' };
const glyphCache = new Map<string, HTMLImageElement>();
/** glifo como imagem para o canvas do mapa; devolve null até carregar e então chama onReady */
function glyphImage(name: Ps2Glyph, color: string, onReady: () => void): HTMLImageElement | null {
  const key = name + color;
  let im = glyphCache.get(key);
  if (!im) {
    im = new Image();
    im.onload = onReady;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 16 16" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="miter" stroke-linecap="square" shape-rendering="crispEdges" color="${color}">${PS2_GLYPHS[name]}</svg>`;
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    glyphCache.set(key, im);
  }
  return im.complete && im.naturalWidth ? im : null;
}
