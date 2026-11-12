/**
 * Dossiê de caso clínico simulado (Atlas O-01, O-03, O-13, O-18; matriz §9).
 * À esquerda, o papel: o que se sabe, revelado conforme o jogador pergunta.
 * À direita, a mesa: o que ele pode fazer. Não há resposta certa nem cronômetro.
 * O processo é avaliado à parte do desfecho, que inclui acaso.
 */
import type { Game } from '../game';
import { PROCESS_LABEL, ALL_STEPS, evaluateCase, excessHarm, optionLabel, rng, type CaseFeedback, type ClinicalCase, type ProcessStep } from '../domain/clinical';
import { professionName } from '../content/data';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);

function dots(base: number, extra = 0, uncertain = 0): string {
  let h = '<div class="dots" aria-hidden="true">';
  for (let i = 0; i < 100; i++) h += `<i class="${i < base ? 'a' : i < base + extra ? 'b' : i < base + extra + uncertain ? 'u' : ''}"></i>`;
  return h + '</div>';
}

const ACTIONS: Array<{ step: ProcessStep; label: string; said: string }> = [
  { step: 'preferencias', label: 'Perguntar o que importa para ela', said: '"Importa eu continuar subindo. Se for para ficar lerda lá em cima, prefiro a tontura, que pelo menos eu conheço."' },
  { step: 'evidencia', label: 'Ler o resumo da evidência', said: 'Você abre o resumo e lê os números em cada cem pessoas, não em porcentagem de melhora.' },
  { step: 'danos', label: 'Olhar o que a tintura cobra', said: '"Sonolência de dia? Eu trabalho numa escada de pedra, a sessenta metros."' },
  { step: 'aplicabilidade', label: 'Conferir quem estava no estudo', said: 'Você procura sineiros, telhadores, gente de altura. Não acha nenhum na lista de participantes.' },
  { step: 'custo', label: 'Perguntar sobre custo e acesso', said: '"Seis moedas por semana eu pago, apertando. Ir à Vila três vezes... depende da ponte, não é?"' },
  { step: 'incerteza', label: 'Dizer o que não se sabe', said: 'Você diz em voz alta: ninguém estudou isso em quem trabalha em altura, nem além de oito semanas. Lia assente devagar.' },
];

export class CaseView {
  private done = new Set<ProcessStep>();
  private said = '';
  private c!: ClinicalCase;
  private resolve: ((f: CaseFeedback | null) => void) | null = null;
  private feedback: CaseFeedback | null = null;
  private shared = false;
  /** opção clicada sem os passos que a sustentam, à espera de confirmação */
  private pendingOpt: string | null = null;

  constructor(private root: HTMLElement, private g: Game) {}

  open(c: ClinicalCase): Promise<CaseFeedback | null> {
    this.c = c;
    this.feedback = null;
    this.pendingOpt = null;
    this.said = `"${c.fictional_patient_statement}"`;
    this.restore();
    this.root.classList.remove('hidden');
    this.render();
    return new Promise((r) => (this.resolve = r));
  }

  /** usado pelos testes automatizados */
  act(step: ProcessStep): void {
    this.done.add(step);
    this.pendingOpt = null;
    this.store();
    const a = ACTIONS.find((x) => x.step === step);
    if (a) this.said = a.said;
    if (this.resolve) this.render();
  }
  decide(optionId: string): void {
    const s = this.g.state!;
    const seed = (Date.now() ^ (s.playtime * 1000)) >>> 0;
    this.feedback = evaluateCase(this.c, optionId, [...this.done], rng(seed));
    this.g.recordCase(this.c, this.feedback);
    this.pendingOpt = null;
    this.clearStore();
    this.render();
  }
  close(): void {
    this.root.classList.add('hidden');
    const r = this.resolve;
    this.resolve = null;
    r?.(this.feedback);
    if (this.feedback) {
      this.done.clear();
      this.shared = false;
    }
  }

  // o que já foi perguntado sobrevive a "Voltar depois" e a uma recarga da página
  private get storeKey(): string {
    return `interprete-rpg-caso-${this.c.id}`;
  }
  private store(): void {
    try {
      localStorage.setItem(this.storeKey, JSON.stringify({ v: this.c.version, done: [...this.done], shared: this.shared }));
    } catch {
      /* sem armazenamento: vale a memória da sessão */
    }
  }
  private restore(): void {
    try {
      const d = JSON.parse(localStorage.getItem(this.storeKey) ?? 'null') as { v: string; done: string[]; shared: boolean } | null;
      if (!d || d.v !== this.c.version || !Array.isArray(d.done)) return;
      for (const s of d.done) if ((ALL_STEPS as string[]).includes(s)) this.done.add(s as ProcessStep);
      this.shared = !!d.shared && this.done.has('compartilhada');
    } catch {
      /* idem */
    }
  }
  private clearStore(): void {
    try {
      localStorage.removeItem(this.storeKey);
    } catch {
      /* idem */
    }
  }

  private paper(): string {
    const c = this.c;
    const d = this.done;
    const lock = (t: string) => `<p class="locked">${t}</p>`;
    const list = (a: string[]) => `<ul>${a.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
    return `<span class="stamp">Caso simulado · dados fictícios</span>
      <h2>Uma decisão para Lia</h2>
      <p>${esc(c.case_summary)}</p>
      <blockquote>${esc(c.fictional_patient_statement)}</blockquote>
      <div class="notice">${esc(c.safety_note)}</div>
      <h3>A pergunta</h3><p>${esc(c.question)}</p>
      <h3>O que importa para ela</h3>${d.has('preferencias') ? list(c.preferences) : lock('Você ainda não perguntou.')}
      <h3>O que os estudos fictícios sugerem</h3>${d.has('evidencia') ? this.evidence() : lock('O resumo está fechado sobre a mesa.')}
      <h3>O que pode custar</h3>${d.has('danos') ? this.harms() : lock('Você ainda não olhou os efeitos indesejados.')}
      ${d.has('custo') ? list(c.cost_access) : ''}
      <h3>O estudo fala de gente como ela?</h3>${d.has('aplicabilidade') ? list(c.quality_considerations) : lock('Você ainda não conferiu quem participou.')}
      <h3>O que não se sabe</h3>${d.has('incerteza') ? list(c.uncertainty) : lock('Ninguém disse ainda.')}
      <p style="font-size:13px;margin-top:22px">Caso ${esc(c.id)} · versão ${esc(c.version)} · ${esc(c.reviewer)}.</p>`;
  }

  /** Figuras e frases de benefício, geradas das opções do caso: a tela não guarda número próprio. */
  private evidence(): string {
    const c = this.c;
    const w = c.horizon_weeks;
    const base = c.options.find((o) => o.id === c.comparator)!;
    const rows = c.options.map((o) => {
      if (o.id === base.id) return `<div class="dots-row">${dots(base.improvePer100)}<span><b>Sem tratar:</b> cerca de ${base.improvePer100} em cada 100 melhoraram em ${w} semanas.</span></div>`;
      const extra = o.improvePer100 - base.improvePer100;
      const [lo, hi] = o.improveRange ?? [o.improvePer100, o.improvePer100];
      const dLo = lo - base.improvePer100;
      const dHi = hi - base.improvePer100;
      const faixa = dLo <= 0 ? `a diferença pode ir de ${dLo === 0 ? 'nenhuma' : `${-dLo} a menos`} até ${dHi} a mais` : `a diferença pode ir de ${dLo} a ${dHi} a mais`;
      const name = o.id === 'tintura' ? 'Com tintura' : o.id === 'exercicios' ? 'Com exercícios' : esc(o.label);
      const how = o.id === 'exercicios' ? ' Vem de acompanhamento sem sorteio: parte disso pode ser de quem escolheu se exercitar.' : '';
      return `<div class="dots-row">${dots(base.improvePer100, Math.max(0, extra), Math.max(0, hi - o.improvePer100))}<span><b>${name}:</b> cerca de ${o.improvePer100} em cada 100 em ${w} semanas, ${extra} a mais. Pelos dados, ${faixa}.${how}</span></div>`;
    });
    return `${rows.join('')}
      <p style="font-size:13px">Pontos cheios: quem melhora de qualquer jeito. Pontos de cor: os que a opção acrescenta na estimativa. Pontos listrados: até onde a incerteza alcança.</p>
      <ul class="case-src">${c.sources.map((s) => `<li><b>${esc(s.label)}.</b> ${esc(s.note)}</li>`).join('')}</ul>`;
  }

  private harms(): string {
    const c = this.c;
    const worst = c.options.reduce((a, b) => (b.harmPer100 > a.harmPer100 ? b : a));
    const ex = excessHarm(c, worst);
    return `<div class="dots-row">${dots(c.baseline_harm_per100, ex)}<span><b>${c.harm_label[0].toUpperCase() + c.harm_label.slice(1)}:</b> cerca de ${c.baseline_harm_per100} em cada 100 sem tintura e ${worst.harmPer100} em cada 100 com ela. São ${ex} a mais em cada 100.</span></div>`;
  }

  private desk(): string {
    const c = this.c;
    const prof = this.g.state!.profession;
    if (this.feedback) {
      const f = this.feedback;
      return `<div class="label">O que você fez · avaliado à parte do que aconteceu</div><h3>O processo</h3>
        <ul class="check">${ALL_STEPS.map((s) => `<li class="${f.recognized.includes(s) ? 'y' : ''}">${esc(PROCESS_LABEL[s])}</li>`).join('')}</ul>
        <p style="color:var(--g-text)">${esc(f.processNote)}</p>
        <div class="sep"></div>
        <div class="label">${c.horizon_weeks} semanas depois · inclui acaso</div><h3>O desfecho</h3>
        <p style="color:var(--g-text)">${esc(f.outcomeNote)}</p>
        <details><summary>Como o desfecho foi sorteado</summary><ul class="case-src">${c.simulation_notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul></details>
        <p>A experiência que você recebe vem do processo (${f.xp} pontos), não do desfecho. Refazer o caso com outra escolha não paga de novo.</p>
        <button class="btn primary" data-a="close" style="margin-top:auto" data-focus>Fechar o dossiê</button>`;
    }
    const acts = ACTIONS.map((a) => `<button class="btn ${this.done.has(a.step) ? 'done' : ''}" data-step="${a.step}"><span>${esc(a.label)}</span><small>${this.done.has(a.step) ? 'feito' : ''}</small></button>`).join('');
    const opts = c.options
      .map((o) => `<button class="btn ${this.pendingOpt === o.id ? 'primary' : ''}" data-opt="${o.id}"><span>${this.pendingOpt === o.id ? 'Confirmar: ' : ''}${esc(optionLabel(o, prof))}<br><small style="color:var(--g-dim);text-transform:none;letter-spacing:0;font-family:var(--font-sans);font-size:13px;white-space:normal">${esc(o.detail)}</small></span></button>`)
      .join('');
    return `<div class="label">${esc(professionName(prof))} · ${esc(c.scope_of_practice)}</div><h3>Na mesa, com Lia</h3>
      <div class="said">${esc(this.said)}</div>${acts}
      <div class="sep"></div>
      <h3>Decidir</h3><p>Nenhuma opção é o gabarito. Cada uma cobra uma coisa diferente.</p>
      <button class="btn ${this.shared ? 'done' : ''}" data-a="share"><span>Pôr as opções na mesa e decidir com ela</span><small>${this.shared ? 'feito' : ''}</small></button>
      ${opts}
      <button class="btn" data-a="leave" style="margin-top:10px">Voltar depois</button>`;
  }

  private render(): void {
    // a tela é refeita a cada ação: guarda rolagem e foco para a leitura não voltar ao topo
    const scroll = ['.paper', '.desk'].map((q) => this.root.querySelector<HTMLElement>(q)?.scrollTop ?? 0);
    const act = document.activeElement as HTMLElement | null;
    const focusKey = act && this.root.contains(act) ? (act.dataset.step ? `[data-step="${act.dataset.step}"]` : act.dataset.opt ? `[data-opt="${act.dataset.opt}"]` : act.dataset.a ? `[data-a="${act.dataset.a}"]` : null) : null;
    this.root.innerHTML = `<div class="frame"><div class="paper" tabindex="0" aria-label="Dossiê">${this.paper()}</div><div class="desk">${this.desk()}</div></div>`;
    ['.paper', '.desk'].forEach((q, i) => {
      const e = this.root.querySelector<HTMLElement>(q);
      if (e) e.scrollTop = scroll[i];
    });
    this.root.querySelectorAll<HTMLElement>('button').forEach((b) =>
      b.addEventListener('click', () => {
        const d = b.dataset;
        this.g.audio.sfx('ui');
        if (d.step) this.act(d.step as ProcessStep);
        else if (d.a === 'share') this.share();
        else if (d.opt) this.choose(d.opt);
        else if (d.a === 'leave' || d.a === 'close') this.close();
      }),
    );
    requestAnimationFrame(() => (this.root.querySelector<HTMLElement>('[data-focus]') ?? (focusKey ? this.root.querySelector<HTMLElement>(focusKey) : null) ?? this.root.querySelector<HTMLElement>('.desk button'))?.focus());
  }

  /**
   * Decidir junto só conta quando há o que pôr na mesa: o que importa para ela e ao menos
   * benefício ou dano. Antes disso Lia devolve a pergunta, e o passo não é creditado.
   */
  private share(): void {
    const d = this.done;
    const ready = d.has('preferencias') && (d.has('evidencia') || d.has('danos'));
    this.pendingOpt = null;
    if (ready) {
      this.shared = true;
      d.add('compartilhada');
      this.said = d.has('danos') ? '"Posta assim, eu começaria pelo que não me deixa lerda. Mas quero ouvir o que você faria no meu lugar, e por quê."' : '"Entendi o que posso ganhar. Só não entendi ainda o que cada coisa me cobra. Você sabe?"';
    } else this.said = d.has('preferencias') ? '"Decidir junto eu quero. Mas entre o quê? Você ainda não me mostrou o que cada caminho dá e o que cobra."' : '"Não sei escolher entre coisas que eu não entendi direito. E você ainda nem me perguntou o que pesa para mim."';
    this.store();
    this.render();
  }

  /** Uma opção sem os passos que a sustentam pede um segundo clique: evita decisão por acidente sem proibir a escolha. */
  private choose(id: string): void {
    const o = this.c.options.find((x) => x.id === id);
    const missing = o ? o.fragileWithout.filter((s) => !this.done.has(s)) : [];
    if (missing.length && this.pendingOpt !== id) {
      this.pendingOpt = id;
      const falta: Partial<Record<ProcessStep, string>> = { preferencias: 'perguntou o que importa para ela', danos: 'olhou o que a opção pode cobrar', custo: 'perguntou sobre custo e acesso', evidencia: 'leu o resumo da evidência', aplicabilidade: 'conferiu quem estava no estudo', incerteza: 'disse o que não se sabe' };
      this.said = `Antes de fechar: você ainda não ${missing.map((m) => falta[m] ?? PROCESS_LABEL[m].toLowerCase()).join(' nem ')}. Dá para decidir assim mesmo; acione a opção de novo para confirmar.`;
      this.render();
      return;
    }
    this.decide(id);
  }
}
