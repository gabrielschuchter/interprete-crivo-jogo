import { beforeEach, describe, expect, it } from 'vitest';
import * as D from '../../src/domain/state';
import { allSlots, clearSlot, freeSlot, latestSlot, playtimeLabel, recoverSlot, slotAdapter, slotKey } from '../../src/core/registros';

const mem = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
  key: () => null,
  length: 0,
} as Storage;

const gravado = (name: string, savedAt: number) => JSON.stringify({ ...JSON.parse(D.serialize(D.newGame(name, 'nutricao', { skin: 1, hair: 0, coat: 0 }))), savedAt });

describe('três espaços de registro', () => {
  beforeEach(() => mem.clear());

  it('o espaço 1 é a chave de sempre: quem já jogava continua de onde estava', () => {
    expect(slotKey(1)).toBe('interprete-rpg-registro-v1');
    mem.set('interprete-rpg-registro-v1', gravado('Antiga', 10));
    expect(latestSlot()).toBe(1);
    expect(freeSlot()).toBe(2);
  });

  it('Continuar leva ao mais recente, pela data de gravação', () => {
    slotAdapter(1).save(gravado('Ana', 100));
    slotAdapter(3).save(gravado('Bia', 300));
    slotAdapter(2).save(gravado('Caio', 200));
    expect(latestSlot()).toBe(3);
    expect(allSlots().map((i) => i.name)).toEqual(['Ana', 'Caio', 'Bia']);
    expect(freeSlot()).toBeNull();
  });

  it('sem registro, não há o que continuar', () => {
    expect(latestSlot()).toBeNull();
    expect(freeSlot()).toBe(1);
  });

  it('gravar guarda a anterior como cópia, e um registro estragado volta para ela', () => {
    const a = slotAdapter(2);
    a.save(gravado('Primeira', 1));
    a.save('{"version":4,"name":"trunc');
    expect(latestSlot()).toBeNull();
    expect(recoverSlot(2)).toBe('recuperado');
    expect(allSlots()[1].name).toBe('Primeira');
    expect(mem.has(slotKey(2) + '-ilegivel')).toBe(true);
  });

  it('registro ilegível sem cópia fica guardado e ocupa o espaço', () => {
    mem.set(slotKey(1), 'lixo');
    expect(recoverSlot(1)).toBe('ilegivel');
    expect(allSlots()[0]).toMatchObject({ used: true, ok: false });
    expect(freeSlot()).toBe(2);
  });

  it('apagar leva o registro e as cópias', () => {
    const a = slotAdapter(3);
    a.save(gravado('X', 1));
    a.save(gravado('X', 2));
    clearSlot(3);
    expect([...mem.keys()].filter((k) => k.startsWith(slotKey(3)))).toEqual([]);
  });

  it('tempo de jogo em texto curto', () => {
    expect(playtimeLabel(8 * 60)).toBe('8 min');
    expect(playtimeLabel(3 * 3600 + 12 * 60)).toBe('3 h 12 min');
  });
});
