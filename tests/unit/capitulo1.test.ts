import { describe, expect, it } from 'vitest';
import { CODEX, ITEMS, QUESTS } from '../../src/content/data';
import * as D from '../../src/domain/state';

describe('capítulo 1 · A estrada', () => {
  it('a missão tem os três passos da bíblia, na estrada e no Átrio', () => {
    const q = QUESTS.capitulo1;
    expect(q.kind).toBe('principal');
    expect(q.steps.map((s) => s.region)).toEqual(['estrada', 'atrio', 'atrio']);
    expect(q.steps.map((s) => s.target)).toEqual(['npc:guarda', 'prop:cap1_anfiteatro', 'prop:cap1_dormitorio']);
  });
  it('o pote e o verbete de Iolanda existem', () => {
    expect(ITEMS.pote_unguento.type).toBe('missao');
    expect(CODEX.iolanda.group).toBe('Pessoas');
  });
  it('a fala escolhida na aula fica gravada no registro', () => {
    const s = D.newGame('Teste', 'enfermagem', { body: 'fem', skin: 0, hair: 0, coat: 0 } as D.Look);
    expect(D.startQuest(s, 'capitulo1')).toBe(true);
    D.setQuestVar(s, 'capitulo1', 'fala', 2);
    expect(D.advanceQuest(s, 'capitulo1', 2)).toBe(true);
    const back = D.deserialize(JSON.stringify(s))!;
    expect(D.questVar(back, 'capitulo1', 'fala')).toBe(2);
    expect(D.questStep(back, 'capitulo1')).toBe(2);
  });
});
