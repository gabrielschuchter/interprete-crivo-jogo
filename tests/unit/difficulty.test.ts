import { describe, expect, it } from 'vitest';
import * as D from '../../src/domain/state';
import {
  DEFAULT_DIFFICULTY,
  DIFFICULTIES,
  DIFFICULTY_IDS,
  coinsLostOnDeath,
  difficultyDef,
  isDifficulty,
  normalizeDifficulty,
  type DifficultyId,
  scaleCoins,
  scaleHeal,
  scalePrice,
  scaleXp,
} from '../../src/domain/difficulty';
import { DROPS, rollDrop } from '../../src/domain/gear';
import { sanitizeSettings, DEFAULT_SETTINGS } from '../../src/core/settings';

const novo = (d?: Parameters<typeof D.newGame>[3]) => D.newGame('Marina', 'nutricao', { skin: 1, hair: 2, coat: 0 }, d);

describe('tabela de dificuldades', () => {
  it('o padrão do jogo é o Médio e os quatro níveis existem', () => {
    expect(DEFAULT_DIFFICULTY).toBe('medio');
    expect(DEFAULT_SETTINGS.difficulty).toBe('medio');
    expect([...DIFFICULTY_IDS]).toEqual(['historia', 'facil', 'medio', 'dificil']);
    for (const id of DIFFICULTY_IDS) expect(DIFFICULTIES[id].id).toBe(id);
  });
  it('cada eixo cresce de História a Fácil, Médio e Difícil, no sentido de mais difícil', () => {
    const ds = DIFFICULTY_IDS.map((id) => DIFFICULTIES[id]);
    // quanto mais alto, mais difícil (vida e dano nunca descem; velocidade, alcance e fase também)
    for (const k of ['foeHp', 'miniHp', 'bossHp', 'foeDmg', 'mobDmg', 'mobChain', 'mobPack', 'foeSpeed', 'foeSight', 'phaseAt', 'price', 'deathCoins'] as const) {
      for (let i = 1; i < ds.length; i++) expect(ds[i][k], `${k} ${ds[i].id}`).toBeGreaterThanOrEqual(ds[i - 1][k]);
      expect(ds[3][k], k).toBeGreaterThan(ds[0][k]);
    }
    // quanto mais baixo, mais difícil
    for (const k of ['foeWindup', 'foeRecover', 'foeGap', 'deflect', 'perfect', 'vigorRegen', 'xp', 'coins', 'drops', 'heal'] as const) {
      for (let i = 1; i < ds.length; i++) expect(ds[i][k], `${k} ${ds[i].id}`).toBeLessThanOrEqual(ds[i - 1][k]);
      expect(ds[3][k], k).toBeLessThan(ds[0][k]);
    }
  });
  it('o Médio é o jogo difícil de antes dos quatro níveis; o Difícil endurece os comuns além dos chefes', () => {
    const m = DIFFICULTIES.medio;
    expect(m.foeDmg).toBeGreaterThanOrEqual(1.25);
    expect(m.foeHp).toBeGreaterThanOrEqual(1.15);
    expect(m.bossHp).toBeGreaterThanOrEqual(1.25);
    expect(m.deflect).toBeLessThan(1);
    expect(DIFFICULTIES.historia.foeDmg).toBeLessThanOrEqual(0.55);
    const d = DIFFICULTIES.dificil;
    // os comuns no Difícil: bem mais vida e dano que no Médio, golpes emendados e grupos maiores
    expect(d.foeHp / m.foeHp).toBeGreaterThanOrEqual(1.35);
    expect((d.foeDmg * d.mobDmg) / (m.foeDmg * m.mobDmg)).toBeGreaterThanOrEqual(1.4);
    expect(d.mobChain).toBeGreaterThanOrEqual(0.4);
    expect(d.mobPack).toBeGreaterThanOrEqual(0.4);
    expect(DIFFICULTIES.facil.mobPack).toBe(0);
  });
  it('janelas e avisos continuam legíveis até no Difícil', () => {
    for (const id of DIFFICULTY_IDS) {
      const st = D.computeStats(novo(id));
      expect(st.deflectWindow, id).toBeGreaterThanOrEqual(0.13);
      expect(st.perfectWindow, id).toBeGreaterThanOrEqual(0.14);
      expect(st.vigorRegen, id).toBeGreaterThan(20);
    }
  });
  it('valor desconhecido cai no Médio, e os ids antigos são traduzidos', () => {
    expect(difficultyDef('impossivel').id).toBe('medio');
    expect(difficultyDef(undefined).id).toBe('medio');
    expect(isDifficulty('dificil')).toBe(true);
    expect(isDifficulty('rigor')).toBe(false);
    expect(isDifficulty('DIFICIL')).toBe(false);
    expect(normalizeDifficulty('padrao')).toBe('medio');
    expect(normalizeDifficulty('rigor')).toBe('dificil');
    expect(normalizeDifficulty('historia')).toBe('historia');
    expect(normalizeDifficulty('facil')).toBe('facil');
    expect(normalizeDifficulty('x')).toBeNull();
    expect(isDifficulty(3)).toBe(false);
  });
});

describe('efeito nos atributos e na economia', () => {
  it('as janelas de desvio e esquiva perfeita seguem a dificuldade', () => {
    const w = (id: DifficultyId) => D.computeStats(novo(id));
    expect(w('medio').deflectWindow).toBeCloseTo(0.2 * DIFFICULTIES.medio.deflect, 5);
    expect(w('medio').perfectWindow).toBeCloseTo(0.22 * DIFFICULTIES.medio.perfect, 5);
    expect(w('historia').deflectWindow).toBeGreaterThan(w('medio').deflectWindow);
    expect(w('medio').deflectWindow).toBeGreaterThan(w('dificil').deflectWindow);
    expect(w('historia').vigorRegen).toBeGreaterThan(w('dificil').vigorRegen);
  });
  it('dano recebido sobe com a dificuldade e a defesa continua valendo', () => {
    const s = novo('medio');
    const st = D.computeStats(s);
    const taken = (id: DifficultyId) => D.damageTaken(20, st, id);
    expect(taken('historia')).toBeLessThan(taken('medio'));
    expect(taken('medio')).toBeLessThan(taken('dificil'));
    const semDefesa = taken('medio');
    st.defense = 0.22;
    expect(D.damageTaken(20, st, 'medio')).toBeLessThan(semDefesa);
    // aceita a tabela inteira e nunca devolve menos de 1
    expect(D.damageTaken(0.01, st, DIFFICULTIES.historia)).toBe(1);
  });
  it('experiência de recompensa e de criaturas passa pela dificuldade; addXp segue cru', () => {
    for (const id of DIFFICULTY_IDS) {
      const s = novo(id);
      const r = D.gainXp(s, 100);
      expect(r.xp).toBe(Math.round(100 * DIFFICULTIES[id].xp));
      expect(s.xp).toBe(r.xp);
    }
    const s = novo('dificil');
    D.addXp(s, 100);
    expect(s.xp).toBe(100);
    expect(scaleXp(0, DIFFICULTIES.dificil)).toBe(0);
    expect(scaleXp(1, DIFFICULTIES.dificil)).toBe(1);
  });
  it('grantReward devolve a experiência de fato concedida e continua idempotente', () => {
    const s = novo('medio');
    const a = D.grantReward(s, { id: 'r1', xp: 200 });
    expect(a.xp).toBe(180);
    expect(D.grantReward(s, { id: 'r1', xp: 200 })).toMatchObject({ granted: false, xp: 0 });
    expect(s.xp).toBe(180);
  });
  it('moedas, cura, preço e perda na derrota', () => {
    const [h, , p, r] = DIFFICULTY_IDS.map((id) => DIFFICULTIES[id]);
    expect(scaleCoins(10, h)).toBeGreaterThan(scaleCoins(10, p));
    expect(scaleCoins(10, p)).toBeGreaterThan(scaleCoins(10, r));
    // o bônus de habilidades soma antes do fator
    expect(scaleCoins(10, p, 0.25)).toBe(Math.round(10 * 1.25 * p.coins));
    expect(scaleHeal(45, p)).toBe(Math.round(45 * p.heal));
    expect(scaleHeal(45, h)).toBeGreaterThan(45);
    expect(scalePrice(100, r)).toBeGreaterThan(scalePrice(100, p));
    expect(scalePrice(100, h)).toBeLessThan(100);
    expect(coinsLostOnDeath(200, h)).toBe(0);
    expect(coinsLostOnDeath(200, p)).toBe(20);
    expect(coinsLostOnDeath(200, r)).toBe(50);
    expect(coinsLostOnDeath(0, r)).toBe(0);
  });
  it('a sorte de queda mexe nas criaturas comuns e nunca nos chefes', () => {
    const none = () => false;
    // r1 logo abaixo da chance base do fiapo: cai no normal e deixa de cair com a sorte reduzida
    const r1 = DROPS.fiapo.chance * 0.9;
    expect(rollDrop('fiapo', none, r1, 0.5, 1)).not.toBeNull();
    expect(rollDrop('fiapo', none, r1, 0.5, DIFFICULTIES.dificil.drops)).toBeNull();
    expect(rollDrop('fiapo', none, r1, 0.5, DIFFICULTIES.historia.drops)).not.toBeNull();
    // chefe: chance 1, sempre entrega, qualquer que seja a sorte
    expect(rollDrop('veredito', none, 0.999, 0.1, DIFFICULTIES.dificil.drops)).toBe(DROPS.veredito.first);
    expect(rollDrop('eco', none, 0.999, 0.1, DIFFICULTIES.dificil.drops)).toBe(DROPS.eco.first);
  });
});

describe('dificuldade no registro', () => {
  it('a partida nasce com a dificuldade escolhida, e o Médio se nada for dito', () => {
    expect(novo().difficulty).toBe('medio');
    for (const id of DIFFICULTY_IDS) expect(novo(id).difficulty).toBe(id);
    // valor inválido na criação não contamina o registro
    expect(D.newGame('x', 'aprendiz', { skin: 0, hair: 0, coat: 0 }, 'impossivel' as never).difficulty).toBe('medio');
  });
  it('sobrevive a salvar e carregar, na versão atual', () => {
    expect(D.SAVE_VERSION).toBe(4);
    for (const id of DIFFICULTY_IDS) {
      const back = D.deserialize(D.serialize(novo(id)))!;
      expect(back.difficulty).toBe(id);
      expect(back.version).toBe(4);
    }
  });
  it('registro da versão 2, sem dificuldade, segue a preferência que a pessoa tinha', () => {
    const v2 = JSON.parse(D.serialize(novo('medio')));
    delete v2.difficulty;
    v2.version = 2;
    v2.level = 5;
    const txt = JSON.stringify(v2);
    expect(D.hasDifficulty(txt)).toBe(false);
    expect(D.deserialize(txt, 'historia')!.difficulty).toBe('historia');
    expect(D.deserialize(txt, 'rigor' as never)!.difficulty).toBe('dificil');
    expect(D.deserialize(txt, 'dificil')!.difficulty).toBe('dificil');
    expect(D.deserialize(txt)!.difficulty).toBe('medio');
    const back = D.deserialize(txt, 'historia')!;
    expect(back.level).toBe(5);
    expect(back.version).toBe(4);
    // a dificuldade já gravada vence a preferência
    expect(D.hasDifficulty(D.serialize(novo('dificil')))).toBe(true);
    expect(D.deserialize(D.serialize(novo('dificil')), 'historia')!.difficulty).toBe('dificil');
  });
  it('registro da versão 1 também ganha dificuldade', () => {
    const v1 = { version: 1, name: 'Ana', profession: 'medicina', look: { skin: 0, hair: 0, coat: 0 }, level: 3, xp: 200, questsDone: ['ponte'] };
    expect(D.migrate(v1, 'historia')!.difficulty).toBe('historia');
    expect(D.migrate(v1)!.difficulty).toBe('medio');
  });
  it('valor corrompido no registro volta ao que a preferência indicar', () => {
    const raw = JSON.parse(D.serialize(novo('dificil')));
    raw.difficulty = 'impossivel';
    expect(D.deserialize(JSON.stringify(raw), 'historia')!.difficulty).toBe('historia');
    raw.difficulty = 7;
    expect(D.deserialize(JSON.stringify(raw))!.difficulty).toBe('medio');
    expect(D.hasDifficulty(JSON.stringify(raw))).toBe(false);
    expect(D.hasDifficulty('{')).toBe(false);
    expect(D.hasDifficulty(null)).toBe(false);
  });
});

describe('dificuldade nas configurações', () => {
  it('aceita os quatro níveis, traduz os ids antigos e recusa o resto', () => {
    for (const id of DIFFICULTY_IDS) expect(sanitizeSettings({ difficulty: id }).difficulty).toBe(id);
    expect(sanitizeSettings({ difficulty: 'padrao' }).difficulty).toBe('medio');
    expect(sanitizeSettings({ difficulty: 'rigor' }).difficulty).toBe('dificil');
    expect(sanitizeSettings({ difficulty: 'impossivel' }).difficulty).toBe('medio');
    expect(sanitizeSettings({ difficulty: 2 }).difficulty).toBe('medio');
    expect(sanitizeSettings({}).difficulty).toBe('medio');
  });
  it('registro da versão 3 com os ids antigos migra para os novos', () => {
    const v3 = JSON.parse(D.serialize(novo('medio')));
    v3.version = 3;
    for (const [velho, novoId] of [['padrao', 'medio'], ['rigor', 'dificil'], ['historia', 'historia']] as const) {
      v3.difficulty = velho;
      expect(D.deserialize(JSON.stringify(v3))!.difficulty).toBe(novoId);
      expect(D.hasDifficulty(JSON.stringify(v3))).toBe(true);
    }
  });
});
