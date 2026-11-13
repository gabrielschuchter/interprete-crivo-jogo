/**
 * Tabela de equilíbrio por dificuldade (skill rpg, passo 7): para cada encontro da campanha, quantos golpes o
 * jogador precisa para derrubar a criatura e quantos golpes dela aguenta, em dois retratos de jogador:
 * "direto" (só o caminho principal: arma inicial, sem traje, sem pontos gastos) e "completo" (missões paralelas feitas:
 * pontos nos ramos de encontro, gibão comprado, arma achada). Os níveis vêm das medições de campanha de 13/11/2026.
 * BALANCE=1 npx vitest run tests/unit/balance.test.ts imprime a tabela.
 */
import { describe, expect, it } from 'vitest';
import * as D from '../../src/domain/state';
import { DIFFICULTIES, DIFFICULTY_IDS, scaleEnemyHp, type DifficultyId } from '../../src/domain/difficulty';
import { ENEMY_CFG, type EnemyKind } from '../../src/entities/enemy';

interface Encontro {
  nome: string;
  kind: EnemyKind;
  /** nível do jogador ao chegar nele, por perfil */
  nivel: { direto: number; completo: number };
}
const ENCONTROS: Encontro[] = [
  { nome: 'Fiapo da trilha', kind: 'fiapo', nivel: { direto: 1, completo: 1 } },
  { nome: 'Vulto da clareira', kind: 'vulto', nivel: { direto: 2, completo: 2 } },
  { nome: 'Vulto do Arquivo', kind: 'vulto', nivel: { direto: 4, completo: 5 } },
  { nome: 'O Eco', kind: 'eco', nivel: { direto: 4, completo: 6 } },
  { nome: 'O Veredito', kind: 'veredito', nivel: { direto: 6, completo: 7 } },
];

function jogador(id: DifficultyId, nivel: number, perfil: 'direto' | 'completo'): D.Stats {
  const s = D.newGame('Balanço', 'enfermagem', { skin: 1, hair: 0, coat: 0 }, id);
  s.level = nivel;
  if (perfil === 'completo') {
    s.skills = ['folego', 'esquiva_limpa', ...(nivel >= 4 ? ['golpe_decidido'] : [])];
    s.inventory.gibao_sigilo = 1;
    s.equipment.traje = 'gibao_sigilo';
    if (nivel >= 6) {
      s.inventory.machado_nnt = 1;
      s.equipment.arma = 'machado_nnt';
    }
  }
  return D.computeStats(s);
}

function linha(e: Encontro, id: DifficultyId, perfil: 'direto' | 'completo') {
  const cfg = ENEMY_CFG[e.kind];
  const d = DIFFICULTIES[id];
  const st = jogador(id, e.nivel[perfil], perfil);
  const golpe = st.damage * (1 + st.crit * (st.critMult - 1));
  const hp = scaleEnemyHp(cfg.hp, !!cfg.boss, d);
  return {
    encontro: e.nome,
    dificuldade: id,
    perfil,
    nivel: e.nivel[perfil],
    vidaJogador: st.maxHp,
    vidaCriatura: hp,
    golpesParaVencer: Math.ceil(hp / golpe),
    golpesParaSobreviver: +(st.maxHp / D.damageTaken(cfg.dmg, st, id)).toFixed(1),
  };
}

const tabela = ENCONTROS.flatMap((e) => DIFFICULTY_IDS.flatMap((id) => (['direto', 'completo'] as const).map((p) => linha(e, id, p))));

describe('equilíbrio por dificuldade', () => {
  if ((globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.BALANCE) it('imprime a tabela', () => console.table(tabela));

  it('criaturas comuns caem em poucos golpes e o jogador aguenta alguns, em qualquer dificuldade e perfil', () => {
    for (const r of tabela.filter((x) => x.encontro.startsWith('Fiapo') || x.encontro.startsWith('Vulto'))) {
      expect(r.golpesParaVencer, JSON.stringify(r)).toBeLessThanOrEqual(10);
      expect(r.golpesParaSobreviver, JSON.stringify(r)).toBeGreaterThanOrEqual(3);
    }
  });
  it('chefes pedem de 10 a 75 golpes para vencer (6 em História) e pelo menos 3 golpes de sobrevivência', () => {
    for (const r of tabela.filter((x) => x.encontro === 'O Eco' || x.encontro === 'O Veredito')) {
      expect(r.golpesParaVencer, JSON.stringify(r)).toBeGreaterThanOrEqual(r.dificuldade === 'historia' ? 6 : 10);
      expect(r.golpesParaVencer, JSON.stringify(r)).toBeLessThanOrEqual(75);
      expect(r.golpesParaSobreviver, JSON.stringify(r)).toBeGreaterThanOrEqual(3);
    }
  });
  it('quem se preparou vence em menos golpes e aguenta mais do que quem foi direto, em todos os encontros', () => {
    for (const e of ENCONTROS.filter((x) => x.nivel.completo >= x.nivel.direto)) {
      for (const id of DIFFICULTY_IDS) {
        const d = linha(e, id, 'direto');
        const c = linha(e, id, 'completo');
        expect(c.golpesParaVencer, `${e.nome} ${id}`).toBeLessThanOrEqual(d.golpesParaVencer);
        expect(c.golpesParaSobreviver, `${e.nome} ${id}`).toBeGreaterThanOrEqual(d.golpesParaSobreviver);
      }
    }
  });
  it('mais dificuldade pede mais golpes para vencer e aguenta menos', () => {
    for (const e of ENCONTROS) {
      for (const perfil of ['direto', 'completo'] as const) {
        const [h, p, r] = DIFFICULTY_IDS.map((id) => linha(e, id, perfil));
        expect(p.golpesParaVencer, `${e.nome} ${perfil}`).toBeGreaterThanOrEqual(h.golpesParaVencer);
        expect(r.golpesParaVencer, `${e.nome} ${perfil}`).toBeGreaterThanOrEqual(p.golpesParaVencer);
        expect(p.golpesParaSobreviver, `${e.nome} ${perfil}`).toBeLessThan(h.golpesParaSobreviver);
        expect(r.golpesParaSobreviver, `${e.nome} ${perfil}`).toBeLessThan(p.golpesParaSobreviver);
      }
    }
  });
  it('o Padrão pede pelo menos 25% mais esforço que a campanha de antes dos níveis em cada chefe', () => {
    // esforço = golpes para vencer ÷ golpes para sobreviver; "antes" = multiplicadores 1 (vida e dano-base)
    for (const e of ENCONTROS.filter((x) => ENEMY_CFG[x.kind].boss)) {
      const cfg = ENEMY_CFG[e.kind];
      const st = jogador('padrao', e.nivel.direto, 'direto');
      const golpe = st.damage * (1 + st.crit * (st.critMult - 1));
      const antes = Math.ceil(cfg.hp / golpe) / (st.maxHp / Math.max(1, Math.round(cfg.dmg * (1 - Math.min(0.6, st.defense)))));
      const r = linha(e, 'padrao', 'direto');
      const agora = r.golpesParaVencer / r.golpesParaSobreviver;
      expect(agora / antes, e.nome).toBeGreaterThanOrEqual(1.25);
    }
  });
});
