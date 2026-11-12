import { describe, expect, it } from 'vitest';
import * as D from '../../src/domain/state';

const novo = () => D.newGame('  Marina  ', 'nutricao', { skin: 1, hair: 2, coat: 0 });

describe('progressão', () => {
  it('a curva de experiência é crescente e o nível sobe com pontos', () => {
    for (let n = 1; n < D.MAX_LEVEL; n++) expect(D.xpForLevel(n + 1)).toBeGreaterThan(D.xpForLevel(n));
    const s = novo();
    const r = D.addXp(s, D.xpForLevel(4));
    expect(s.level).toBe(4);
    expect(r.leveled).toBe(3);
    expect(s.skillPoints).toBe(3);
  });
  it('não passa do nível máximo', () => {
    const s = novo();
    D.addXp(s, 1e7);
    expect(s.level).toBe(D.MAX_LEVEL);
  });
  it('normaliza o nome', () => {
    expect(novo().name).toBe('Marina');
    expect(D.newGame('', 'aprendiz', { skin: 0, hair: 0, coat: 0 }).name).toBe('Viajante');
  });
});

describe('recompensas idempotentes', () => {
  it('a mesma recompensa não paga duas vezes', () => {
    const s = novo();
    const r = { id: 'missao:ponte', xp: 50, coins: 30, items: { caldo: 2 }, crivoPoints: 1 };
    expect(D.grantReward(s, r).granted).toBe(true);
    expect(D.grantReward(s, r).granted).toBe(false);
    expect(s.coins).toBe(40);
    expect(s.xp).toBe(50);
    expect(s.inventory.caldo).toBe(3);
    expect(s.crivoPoints).toBe(1);
  });
  it('sobrevive a salvar e carregar', () => {
    const s = novo();
    D.grantReward(s, { id: 'x', coins: 5 });
    const back = D.deserialize(D.serialize(s))!;
    expect(D.grantReward(back, { id: 'x', coins: 5 }).granted).toBe(false);
    expect(back.coins).toBe(15);
  });
});

describe('inventário e equipamento', () => {
  it('equipa só o que possui e desequipa ao perder o item', () => {
    const s = novo();
    expect(D.equip(s, 'calcado', 'botas_bradford')).toBe(false);
    D.addItem(s, 'botas_bradford');
    expect(D.equip(s, 'calcado', 'botas_bradford')).toBe(true);
    expect(D.computeStats(s).runSpeed).toBeGreaterThan(D.computeStats(novo()).runSpeed);
    D.removeItem(s, 'botas_bradford');
    expect(s.equipment.calcado).toBeUndefined();
  });
  it('compra exige moedas', () => {
    const s = novo();
    expect(D.buy(s, 'capa_parcimonia', 110)).toBe(false);
    s.coins = 110;
    expect(D.buy(s, 'capa_parcimonia', 110)).toBe(true);
    expect(s.coins).toBe(0);
  });
  it('remover mais do que há falha sem alterar', () => {
    const s = novo();
    expect(D.removeItem(s, 'caldo', 2)).toBe(false);
    expect(s.inventory.caldo).toBe(1);
  });
});

describe('missões', () => {
  it('avança sem retroceder e conclui uma vez', () => {
    const s = novo();
    expect(D.questStep(s, 'ponte')).toBe(-1);
    expect(D.startQuest(s, 'ponte')).toBe(true);
    expect(D.startQuest(s, 'ponte')).toBe(false);
    expect(D.advanceQuest(s, 'ponte', 3)).toBe(true);
    expect(D.advanceQuest(s, 'ponte', 2)).toBe(false);
    expect(D.questStep(s, 'ponte')).toBe(3);
    expect(D.completeQuest(s, 'ponte')).toBe(true);
    expect(D.completeQuest(s, 'ponte')).toBe(false);
    expect(D.advanceQuest(s, 'ponte', 5)).toBe(false);
    expect(D.questDone(s, 'ponte')).toBe(true);
  });
});

describe('habilidades', () => {
  const def: D.SkillDef = { id: 'b', name: 'B', branch: 'X', desc: '', effect: '', cost: 2, requires: ['a'], minLevel: 4, tier: 1 };
  it('explica por que um nó não pode ser aprendido', () => {
    expect(D.canUnlock(def, [], 5, 1)).toEqual({ ok: false, reason: 'Requer nível 4.' });
    expect(D.canUnlock(def, [], 5, 4).ok).toBe(false);
    expect(D.canUnlock(def, ['a'], 1, 4)).toEqual({ ok: false, reason: 'Requer 2 pontos.' });
    expect(D.canUnlock(def, ['a'], 2, 4).ok).toBe(true);
    expect(D.canUnlock({ ...def, locked: 'Em breve.' }, ['a'], 2, 4).ok).toBe(false);
  });
  it('gasta pontos ao aprender', () => {
    const s = novo();
    s.skillPoints = 1;
    const folego: D.SkillDef = { id: 'folego', name: '', branch: '', desc: '', effect: '', cost: 1, tier: 0 };
    expect(D.unlockSkill(s, folego).ok).toBe(true);
    expect(s.skillPoints).toBe(0);
    expect(D.computeStats(s).maxVigor).toBe(125);
    expect(D.unlockSkill(s, folego).ok).toBe(false);
  });
});

describe('dano', () => {
  it('nunca é menor que 1 e o modo história reduz', () => {
    const st = D.computeStats(novo());
    expect(D.damageTaken(20, st, 'padrao')).toBe(20);
    expect(D.damageTaken(20, st, 'historia')).toBe(9);
    expect(D.damageTaken(0.1, st, 'historia')).toBe(1);
  });
});

describe('registro versionado', () => {
  it('migra um registro da versão 1', () => {
    const v1 = { version: 1, name: 'Ana', profession: 'medicina', look: { skin: 0, hair: 0, coat: 0 }, level: 3, xp: 200, questsDone: ['ponte'], flags: ['ponte_aberta'] };
    const s = D.migrate(v1)!;
    expect(s.version).toBe(D.SAVE_VERSION);
    expect(s.level).toBe(3);
    expect(D.questDone(s, 'ponte')).toBe(true);
    expect(s.cases).toEqual([]);
    expect(s.crivoSkills).toContain('farejar');
  });
  it('recusa lixo e versões futuras', () => {
    expect(D.deserialize('{')).toBeNull();
    expect(D.deserialize(null)).toBeNull();
    expect(D.migrate({ version: 99, name: 'x' })).toBeNull();
    expect(D.migrate({ foo: 1 })).toBeNull();
  });
});
