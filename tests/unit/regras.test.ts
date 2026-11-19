import { describe, expect, it } from 'vitest';
import { MELHORIAS } from '../../src/jogo/config';
import { aproximar, atributosChefe, filtrarMelhorias, intervaloGeracao, ondasRajada, sortearInimigo, sortearTres, voltaSaida, xpParaNivel } from '../../src/jogo/regras';

describe('regras do survivors', () => {
  it('XP: 5 no primeiro nível e +3 por nível', () => {
    expect(xpParaNivel(1)).toBe(5);
    expect(xpParaNivel(4)).toBe(14);
  });
  it('geração aperta 8% por nível, sem piso', () => {
    expect(intervaloGeracao(1)).toBeCloseTo(1);
    expect(intervaloGeracao(3)).toBeCloseTo(0.8464);
    expect(intervaloGeracao(0)).toBeCloseTo(1);
  });
  it('sorteio de inimigo: 5% gigante, 25% rápido', () => {
    expect(sortearInimigo(0.04)).toBe('gigante');
    expect(sortearInimigo(0.2)).toBe('rapido');
    expect(sortearInimigo(0.31)).toBe('normal');
  });
  it('chefe cresce com o nível', () => {
    const c = atributosChefe(3);
    expect(c.vida).toBe(800);
    expect(c.passo).toBe(66);
    expect(c.descanso).toBeCloseTo(2 * 0.99 ** 2);
    expect(ondasRajada(9)).toBe(3);
    expect(ondasRajada(10)).toBe(4);
  });
  it('melhorias filtram esgotadas, especiais e armas ausentes', () => {
    const todas = filtrarMelhorias({}, ['flaming'], () => true);
    const semNada = filtrarMelhorias({}, [], () => false);
    expect(todas.length).toBe(MELHORIAS.length);
    expect(semNada.every((u) => !u.precisaEspecial && !u.precisaArma)).toBe(true);
    const comMax = MELHORIAS.find((u) => u.max !== undefined);
    if (comMax) expect(filtrarMelhorias({ [comMax.id]: comMax.max! }, ['flaming'], () => true).includes(comMax)).toBe(false);
  });
  it('sorteio de três cartas sem repetição', () => {
    const r = sortearTres([1, 2, 3, 4, 5], () => 0.5);
    expect(r.length).toBe(3);
    expect(new Set(r).size).toBe(3);
    expect(sortearTres([1, 2]).length).toBe(2);
  });
  it('curvas auxiliares', () => {
    expect(voltaSaida(0)).toBeCloseTo(0);
    expect(voltaSaida(1)).toBeCloseTo(1);
    expect(voltaSaida(0.7)).toBeGreaterThan(1);
    expect(aproximar(0, 10, 3)).toBe(3);
    expect(aproximar(9, 10, 3)).toBe(10);
  });
});
