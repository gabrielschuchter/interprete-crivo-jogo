/**
 * Missões clínicas: esquema do caso (documento-matriz, seção 9.2) e avaliação.
 * Regra central: a qualidade do processo decisório é avaliada à parte do
 * desfecho realizado, que inclui acaso. Nenhuma opção é "o gabarito".
 */
import type { ProfessionId } from './state';

export type ProcessStep = 'preferencias' | 'evidencia' | 'danos' | 'aplicabilidade' | 'custo' | 'incerteza' | 'compartilhada';

export interface CaseOption {
  id: string;
  label: string;
  /** rótulo alternativo quando a ação está fora do escopo da profissão */
  scopeLabel?: Partial<Record<ProfessionId, string>>;
  detail: string;
  /** melhora por 100 pessoas no horizonte do caso: estimativa pontual do estudo fictício */
  improvePer100: number;
  /**
   * Faixa em que a chance real pode estar (intervalo do ensaio, ou incerteza maior do estudo sem sorteio).
   * O simulador sorteia primeiro um valor dentro dela e só depois o desfecho: a estimativa de um grupo
   * não é tratada como a probabilidade exata de uma pessoa.
   */
  improveRange?: [number, number];
  /** risco absoluto total do efeito indesejado por 100 pessoas, já incluído o risco de base de quem não trata */
  harmPer100: number;
  costPerWeek: number;
  /** passos de processo sem os quais a escolha fica frágil */
  fragileWithout: ProcessStep[];
  fragileNote: string;
  reasonableNote: string;
}

export interface ClinicalCase {
  id: string;
  version: string;
  reviewed_at: string;
  reviewer: string;
  fictional: true;
  discipline: string;
  scope_of_practice: string;
  case_summary: string;
  fictional_patient_statement: string;
  question: string;
  population: string;
  intervention: string;
  comparison: string;
  outcomes: string;
  /** semanas até a medida de desfecho, igual à dos estudos fictícios */
  horizon_weeks: number;
  /** nome do efeito indesejado acompanhado */
  harm_label: string;
  /** risco de base do efeito indesejado por 100 pessoas, sem a intervenção */
  baseline_harm_per100: number;
  /** id da opção que serve de comparador (não tratar) */
  comparator: string;
  /** premissas do sorteio de desfecho, mostradas ao jogador */
  simulation_notes: string[];
  sources: Array<{ label: string; note: string }>;
  evidence_summary: string[];
  quality_considerations: string[];
  preferences: string[];
  cost_access: string[];
  options: CaseOption[];
  uncertainty: string[];
  safety_note: string;
}

export interface CaseOutcome {
  improved: boolean;
  harmed: boolean;
}

export interface CaseFeedback {
  option: CaseOption;
  recognized: ProcessStep[];
  missed: ProcessStep[];
  fragile: boolean;
  processNote: string;
  outcome: CaseOutcome;
  outcomeNote: string;
  xp: number;
}

export const PROCESS_LABEL: Record<ProcessStep, string> = {
  preferencias: 'Perguntou o que importa para a pessoa',
  evidencia: 'Leu o resumo da evidência em números absolutos',
  danos: 'Considerou os danos, e não só o benefício',
  aplicabilidade: 'Verificou se o estudo incluía gente como ela',
  custo: 'Considerou custo e acesso',
  incerteza: 'Disse em voz alta o que não se sabe',
  compartilhada: 'Decidiu junto, e não por ela',
};

export const ALL_STEPS = Object.keys(PROCESS_LABEL) as ProcessStep[];

/** Gerador determinístico (mulberry32) para desfechos reproduzíveis em teste. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function drawOutcome(option: CaseOption, rand: () => number): CaseOutcome {
  const [lo, hi] = option.improveRange ?? [option.improvePer100, option.improvePer100];
  const p = lo + rand() * (hi - lo);
  return { improved: rand() * 100 < p, harmed: rand() * 100 < option.harmPer100 };
}

/** Efeito indesejado a mais por 100 pessoas, em relação a não tratar. */
export function excessHarm(c: ClinicalCase, o: CaseOption): number {
  return Math.max(0, o.harmPer100 - c.baseline_harm_per100);
}

/**
 * Avalia o processo. O XP depende só do processo; o desfecho não entra na conta.
 */
export function evaluateCase(c: ClinicalCase, optionId: string, done: ProcessStep[], rand: () => number): CaseFeedback {
  const option = c.options.find((o) => o.id === optionId);
  if (!option) throw new Error(`opção desconhecida: ${optionId}`);
  const recognized = ALL_STEPS.filter((s) => done.includes(s));
  const missed = ALL_STEPS.filter((s) => !done.includes(s));
  const fragile = option.fragileWithout.some((s) => !done.includes(s));
  const outcome = drawOutcome(option, rand);
  const processNote = fragile ? option.fragileNote : option.reasonableNote;
  let outcomeNote: string;
  if (outcome.improved && !outcome.harmed) outcomeNote = 'Desta vez, ela melhorou. Isso sozinho não prova que a escolha foi a melhor: parte de quem não faz nada também melhora.';
  else if (outcome.harmed && excessHarm(c, option) === 0)
    outcomeNote = `${outcome.improved ? 'Ela melhorou' : 'Desta vez não houve melhora perceptível'}, e teve ${c.harm_label}. Nesta opção isso não vem do tratamento: cerca de ${c.baseline_harm_per100} em cada 100 pessoas têm o mesmo sem tratar nada.`;
  else if (outcome.improved && outcome.harmed) outcomeNote = `Ela melhorou e teve ${c.harm_label}. Benefício e dano não se excluem, e não dá para saber, numa pessoa só, se o efeito veio do tratamento ou viria de qualquer jeito.`;
  else if (!outcome.improved && outcome.harmed) outcomeNote = `Desta vez não houve melhora e apareceu ${c.harm_label}. Um desfecho ruim não torna ruim, por si só, uma decisão bem conduzida.`;
  else outcomeNote = 'Desta vez não houve melhora perceptível. Acontece com boa parte das pessoas em qualquer das opções.';
  const xp = 20 + recognized.length * 12 + (fragile ? 0 : 16);
  return { option, recognized, missed, fragile, processNote, outcome, outcomeNote, xp };
}

export function optionLabel(o: CaseOption, p: ProfessionId): string {
  return o.scopeLabel?.[p] ?? o.label;
}
