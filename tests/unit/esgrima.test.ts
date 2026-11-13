import { describe, it, expect } from 'vitest';
import { GOLPES, amostra, avancoAte, giroAte, saltoEm, firmePorFoco, danoPorFoco, GUARDA } from '../../src/entities/esgrima';

describe('esgrima: dados dos golpes', () => {
  for (const g of Object.values(GOLPES)) {
    it(`${g.id}: tempos coerentes`, () => {
      // chaves em ordem e cobrindo o golpe inteiro
      for (let i = 1; i < g.keys.length; i++) expect(g.keys[i].t).toBeGreaterThan(g.keys[i - 1].t);
      expect(g.keys[g.keys.length - 1].t).toBeCloseTo(g.dur, 5);
      // contatos dentro do golpe e em ordem; o próximo leve só sai depois do último contato
      for (let i = 0; i < g.hits.length; i++) {
        expect(g.hits[i].t).toBeGreaterThanOrEqual(0);
        expect(g.hits[i].t).toBeLessThan(g.dur);
        if (i) expect(g.hits[i].t).toBeGreaterThan(g.hits[i - 1].t);
      }
      const last = g.hits[g.hits.length - 1].t;
      expect(g.chain).toBeGreaterThan(last);
      expect(g.chain).toBeLessThanOrEqual(g.dur);
      // o rastro cobre os contatos
      for (const h of g.hits) {
        expect(h.t).toBeGreaterThanOrEqual(g.trail[0]);
        expect(h.t).toBeLessThanOrEqual(g.trail[1]);
      }
      // compromisso: o firme não cancela em esquiva antes do contato
      if (g.lock) expect(g.lock[1]).toBeGreaterThan(g.hits[0].t);
      // volta à guarda (golpes que começam da raiz ou do mergulho também terminam nela)
      expect(g.keys[g.keys.length - 1].pose).toBe(GUARDA);
    });
  }

  it('leves: antecipação curta, firme: antecipação longa e legível', () => {
    for (const id of ['l1', 'l2'] as const) expect(GOLPES[id].hits[0].t).toBeLessThanOrEqual(0.2);
    expect(GOLPES.firme.hits[0].t).toBeGreaterThanOrEqual(0.4);
    // o leve é mais rápido e mais leve que o firme em tudo
    expect(GOLPES.l1.dur).toBeLessThan(GOLPES.firme.dur);
    expect(GOLPES.l1.hits[0].pausa).toBeLessThan(GOLPES.firme.hits[0].pausa);
    expect(GOLPES.l1.vigor).toBeLessThan(GOLPES.firme.vigor);
  });

  it('a sequência de leves fecha em quatro e recomeça', () => {
    const seq = ['l1'];
    let g = GOLPES.l1;
    for (let i = 0; i < 4; i++) {
      g = GOLPES[g.next!];
      seq.push(g.id);
    }
    expect(seq).toEqual(['l1', 'l2', 'l3', 'l4', 'l1']);
  });

  it('avanço, giro e salto chegam ao valor final', () => {
    expect(avancoAte(GOLPES.l3, 99)).toBeCloseTo(GOLPES.l3.avanco[2]);
    expect(avancoAte(GOLPES.l3, 0)).toBe(0);
    expect(giroAte(GOLPES.l4, 99)).toBeCloseTo(-Math.PI * 2);
    expect(saltoEm(GOLPES.lua, 0)).toBe(0);
    expect(saltoEm(GOLPES.lua, 0.25)).toBeGreaterThan(0.4);
    expect(saltoEm(GOLPES.lua, 0.5)).toBe(0);
  });

  it('amostra interpola sem buracos e a tocha ganha antebraço', () => {
    for (let t = 0; t <= GOLPES.l1.dur; t += 0.02) {
      const a = amostra(GOLPES.l1, t);
      expect(Number.isFinite(a.arma.yaw)).toBe(true);
      expect(a.pose.aR).toBeDefined();
      if (a.pose.aL) expect(a.pose.fL).toBeDefined();
    }
  });

  it('foco escolhe o firme e multiplica o dano', () => {
    expect(firmePorFoco(0)).toBe('firme');
    expect(firmePorFoco(0.99)).toBe('firme');
    expect(firmePorFoco(1)).toBe('lua');
    expect(firmePorFoco(2.5)).toBe('lua');
    expect(firmePorFoco(3)).toBe('pilar');
    expect(danoPorFoco(0)).toBe(1);
    expect(danoPorFoco(3)).toBeCloseTo(2.35);
  });
});
