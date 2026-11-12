/**
 * Dossiê de caso clínico simulado (Atlas O-01, O-03, O-13, O-18; matriz §9).
 * À esquerda, o papel: o que se sabe, revelado conforme o jogador pergunta.
 * À direita, a mesa: o que ele pode fazer. Não há resposta certa nem cronômetro.
 * O processo é avaliado à parte do desfecho, que inclui acaso.
 */
import type { Game } from '../game';
import { PROCESS_LABEL, ALL_STEPS, evaluateCase, optionLabel, rng, type CaseFeedback, type ClinicalCase, type ProcessStep } from '../domain/clinical';
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

  constructor(private root: HTMLElement, private g: Game) {}

  open(c: ClinicalCase): Promise<CaseFeedback | null> {
    this.c = c;
    this.feedback = null;
    this.said = `"${c.fictional_patient_statement}"`;
    this.root.classList.remove('hidden');
    this.render();
    return new Promise((r) => (this.resolve = r));
  }

  /** usado pelos testes automatizados */
  act(step: ProcessStep): void {
    this.done.add(step);
    const a = ACTIONS.find((x) => x.step === step);
    if (a) this.said = a.said;
    if (this.resolve) this.render();
  }
  decide(optionId: string): void {
    const s = this.g.state!;
    const seed = (Date.now() ^ (s.playtime * 1000)) >>> 0;
    this.feedback = evaluateCase(this.c, optionId, [...this.done], rng(seed));
    this.g.recordCase(this.c, this.feedback);
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
      <h3>O que os estudos fictícios sugerem</h3>${
        d.has('evidencia')
          ? `<div class="dots-row">${dots(30)}<span><b>Sem tintura:</b> cerca de 30 em cada 100 melhoraram em 8 semanas.</span></div>
             <div class="dots-row">${dots(30, 12)}<span><b>Com tintura:</b> cerca de 42 em cada 100. São 12 a mais, mas os dados são compatíveis com algo entre nenhuma e 24 a mais.</span></div>
             <div class="dots-row">${dots(30, 8, 0)}<span><b>Exercícios:</b> cerca de 38 em cada 100, em acompanhamento sem sorteio. Incerteza maior.</span></div>
             <p style="font-size:13px">Fontes: ${c.sources.map((s) => esc(s.label)).join('; ')}.</p>`
          : lock('O resumo está fechado sobre a mesa.')
      }
      <h3>O que pode custar</h3>${d.has('danos') ? `<div class="dots-row">${dots(0, 9)}<span><b>Sonolência de dia:</b> 9 pessoas a mais em cada 100 com a tintura.</span></div>` : lock('Você ainda não olhou os efeitos indesejados.')}
      ${d.has('custo') ? list(c.cost_access) : ''}
      <h3>O estudo fala de gente como ela?</h3>${d.has('aplicabilidade') ? list(c.quality_considerations) : lock('Você ainda não conferiu quem participou.')}
      <h3>O que não se sabe</h3>${d.has('incerteza') ? list(c.uncertainty) : lock('Ninguém disse ainda.')}
      <p style="font-size:13px;margin-top:22px">Caso ${esc(c.id)} · versão ${esc(c.version)} · ${esc(c.reviewer)}.</p>`;
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
        <div class="label">Quatro semanas depois · inclui acaso</div><h3>O desfecho</h3>
        <p style="color:var(--g-text)">${esc(f.outcomeNote)}</p>
        <p>A experiência que você recebe vem do processo (${f.xp} pontos), não do desfecho. Refazer o caso com outra escolha não paga de novo.</p>
        <button class="btn primary" data-a="close" style="margin-top:auto" data-focus>Fechar o dossiê</button>`;
    }
    const acts = ACTIONS.map((a) => `<button class="btn ${this.done.has(a.step) ? 'done' : ''}" data-step="${a.step}"><span>${esc(a.label)}</span><small>${this.done.has(a.step) ? 'feito' : ''}</small></button>`).join('');
    const opts = c.options
      .map((o) => `<button class="btn" data-opt="${o.id}"><span>${esc(optionLabel(o, prof))}<br><small style="color:var(--g-dim);text-transform:none;letter-spacing:0;font-family:var(--font-sans);font-size:13px;white-space:normal">${esc(o.detail)}</small></span></button>`)
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
    this.root.innerHTML = `<div class="frame"><div class="paper">${this.paper()}</div><div class="desk">${this.desk()}</div></div>`;
    this.root.querySelectorAll<HTMLElement>('button').forEach((b) =>
      b.addEventListener('click', () => {
        const d = b.dataset;
        this.g.audio.sfx('ui');
        if (d.step) this.act(d.step as ProcessStep);
        else if (d.a === 'share') {
          this.shared = true;
          this.done.add('compartilhada');
          this.said = this.done.has('danos') || this.done.has('preferencias') ? '"Posta assim, eu começaria pelo que não me deixa lerda. Mas quero ouvir o que você faria no meu lugar, e por quê."' : '"Não sei escolher entre coisas que eu não entendi direito. Me explica o que cada uma custa?"';
          this.render();
        } else if (d.opt) this.decide(d.opt);
        else if (d.a === 'leave' || d.a === 'close') this.close();
      }),
    );
    requestAnimationFrame(() => this.root.querySelector<HTMLElement>('[data-focus]')?.focus());
  }
}
