import { describe, expect, it } from 'vitest';
import { ALL_STEPS, evaluateCase, optionLabel, rng } from '../../src/domain/clinical';
import { CASE_LIA } from '../../src/content/data';

describe('caso clínico simulado', () => {
  it('é declaradamente fictício e traz aviso de segurança', () => {
    expect(CASE_LIA.fictional).toBe(true);
    expect(CASE_LIA.safety_note).toMatch(/Simulação não clínica/);
    expect(CASE_LIA.options.length).toBeGreaterThanOrEqual(3);
  });
  it('a experiência depende do processo, nunca do desfecho', () => {
    const done = [...ALL_STEPS];
    const xs = new Set<number>();
    const outcomes = new Set<string>();
    for (let seed = 1; seed <= 60; seed++) {
      const f = evaluateCase(CASE_LIA, 'tintura', done, rng(seed));
      xs.add(f.xp);
      outcomes.add(`${f.outcome.improved}/${f.outcome.harmed}`);
    }
    expect(xs.size).toBe(1);
    expect(outcomes.size).toBeGreaterThan(1);
  });
  it('nenhuma opção é gabarito: todas são defensáveis com o processo completo', () => {
    const xp = CASE_LIA.options.map((o) => {
      const f = evaluateCase(CASE_LIA, o.id, [...ALL_STEPS], rng(7));
      expect(f.fragile).toBe(false);
      return f.xp;
    });
    expect(new Set(xp).size).toBe(1);
  });
  it('escolher sem pesar o que importa deixa a decisão frágil', () => {
    const f = evaluateCase(CASE_LIA, 'tintura', ['evidencia'], rng(3));
    expect(f.fragile).toBe(true);
    expect(f.missed).toContain('danos');
    expect(f.xp).toBeLessThan(evaluateCase(CASE_LIA, 'tintura', [...ALL_STEPS], rng(3)).xp);
  });
  it('as frequências sorteadas acompanham os números do caso', () => {
    const r = rng(42);
    let imp = 0;
    const n = 4000;
    for (let i = 0; i < n; i++) if (evaluateCase(CASE_LIA, 'espera', [], r).outcome.improved) imp++;
    expect(imp / n).toBeGreaterThan(0.27);
    expect(imp / n).toBeLessThan(0.33);
  });
  it('o rótulo respeita o escopo da profissão', () => {
    const t = CASE_LIA.options[0];
    expect(optionLabel(t, 'medicina')).toBe(t.label);
    expect(optionLabel(t, 'nutricao')).toMatch(/Encaminhar/);
  });
  it('opção desconhecida é erro', () => {
    expect(() => evaluateCase(CASE_LIA, 'nada', [], rng(1))).toThrow();
  });
});
