/**
 * Tabela de equilíbrio por dificuldade (skill rpg, passo 7): para cada encontro da campanha, quantos golpes o
 * jogador precisa para derrubar a criatura e quantos golpes dela aguenta, em dois retratos de jogador:
 * "direto" (só o caminho principal: arma inicial, sem traje, sem pontos gastos) e "completo" (missões paralelas feitas:
 * pontos nos ramos de encontro, gibão comprado, arma achada). Os níveis vêm das medições de campanha de 13/11/2026.
 * BALANCE=1 npx vitest run tests/unit/balance.test.ts imprime a tabela.
 */
import { describe, expect, it } from 'vitest';
import * as D from '../../src/domain/state';
import { DIFFICULTIES, DIFFICULTY_IDS, foeTier, scaleEnemyHp, type DifficultyId } from '../../src/domain/difficulty';
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
  { nome: 'Erudito do foco', kind: 'erudito', nivel: { direto: 7, completo: 8 } },
  { nome: 'Errante do foco', kind: 'errante', nivel: { direto: 7, completo: 8 } },
  { nome: 'Suplicante do foco', kind: 'suplicante', nivel: { direto: 7, completo: 8 } },
  { nome: 'O Eco', kind: 'eco', nivel: { direto: 4, completo: 6 } },
  { nome: 'O Veredito', kind: 'veredito', nivel: { direto: 6, completo: 7 } },
  { nome: 'Duelista das Cinzas', kind: 'duelista', nivel: { direto: 7, completo: 8 } },
  { nome: 'Carcereiro dos Trilhos', kind: 'carcereiro', nivel: { direto: 7, completo: 8 } },
  { nome: 'Matriarca do Coro Velado', kind: 'matriarca', nivel: { direto: 7, completo: 8 } },
];
const COMUNS = ['Fiapo', 'Vulto', 'Erudito', 'Errante', 'Suplicante'];
const MINIS = ['Duelista', 'Carcereiro', 'Matriarca'];
const ehComum = (n: string) => COMUNS.some((c) => n.startsWith(c));
const ehMini = (n: string) => MINIS.some((c) => n.startsWith(c));
const ehChefe = (n: string) => n === 'O Eco' || n === 'O Veredito';

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

/** golpe-base da criatura no nível: os comuns levam o dano próprio do nível */
function golpeDela(cfg: { dmg: number; boss?: boolean }, d: (typeof DIFFICULTIES)[DifficultyId]): number {
  return cfg.boss ? cfg.dmg : cfg.dmg * d.mobDmg;
}

function linha(e: Encontro, id: DifficultyId, perfil: 'direto' | 'completo') {
  const cfg = ENEMY_CFG[e.kind];
  const d = DIFFICULTIES[id];
  const st = jogador(id, e.nivel[perfil], perfil);
  const golpe = st.damage * (1 + st.crit * (st.critMult - 1));
  const hp = scaleEnemyHp(cfg.hp, foeTier(cfg), d);
  return {
    encontro: e.nome,
    dificuldade: id,
    perfil,
    nivel: e.nivel[perfil],
    vidaJogador: st.maxHp,
    vidaCriatura: hp,
    golpesParaVencer: Math.ceil(hp / golpe),
    golpesParaSobreviver: +(st.maxHp / D.damageTaken(golpeDela(cfg, d), st, id)).toFixed(1),
    /** golpes que a criatura dá por ataque: 1 + chance de emendar o segundo (só comuns) */
    golpesPorAtaque: 1 + (cfg.boss ? 0 : d.mobChain),
  };
}

const tabela = ENCONTROS.flatMap((e) => DIFFICULTY_IDS.flatMap((id) => (['direto', 'completo'] as const).map((p) => linha(e, id, p))));

describe('equilíbrio por dificuldade', () => {
  if ((globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.BALANCE) it('imprime a tabela', () => console.table(tabela));

  it('criaturas comuns caem em poucos golpes e o jogador aguenta alguns, em qualquer dificuldade e perfil', () => {
    for (const r of tabela.filter((x) => ehComum(x.encontro))) {
      expect(r.golpesParaVencer, JSON.stringify(r)).toBeLessThanOrEqual(10);
      expect(r.golpesParaSobreviver, JSON.stringify(r)).toBeGreaterThanOrEqual(r.dificuldade === 'dificil' ? 2.5 : 3);
    }
  });
  it('mini-chefes e chefes pedem de 8 a 75 golpes para vencer (6 em História) e pelo menos 3 de sobrevivência', () => {
    for (const r of tabela.filter((x) => ehMini(x.encontro) || ehChefe(x.encontro))) {
      expect(r.golpesParaVencer, JSON.stringify(r)).toBeGreaterThanOrEqual(r.dificuldade === 'historia' ? 6 : ehMini(r.encontro) ? 8 : 10);
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
  it('mais dificuldade pede mais golpes para vencer e aguenta menos, nos quatro níveis e em todo tipo de inimigo', () => {
    for (const e of ENCONTROS) {
      for (const perfil of ['direto', 'completo'] as const) {
        const rs = DIFFICULTY_IDS.map((id) => linha(e, id, perfil));
        for (let i = 1; i < rs.length; i++) {
          expect(rs[i].golpesParaVencer, `${e.nome} ${perfil} ${rs[i].dificuldade}`).toBeGreaterThanOrEqual(rs[i - 1].golpesParaVencer);
          expect(rs[i].golpesParaSobreviver, `${e.nome} ${perfil} ${rs[i].dificuldade}`).toBeLessThan(rs[i - 1].golpesParaSobreviver);
        }
      }
    }
  });
  it('no Difícil os comuns ameaçam de verdade: pedem ao menos tantos golpes quanto no Médio e cobram bem mais por golpe', () => {
    for (const e of ENCONTROS.filter((x) => ehComum(x.nome))) {
      for (const perfil of ['direto', 'completo'] as const) {
        const m = linha(e, 'medio', perfil);
        const d = linha(e, 'dificil', perfil);
        // dano por ataque (golpe × golpes emendados) pelo menos 1,6 vez o do Médio
        const cobranca = (d.golpesPorAtaque / d.golpesParaSobreviver) / (m.golpesPorAtaque / m.golpesParaSobreviver);
        expect(cobranca, `${e.nome} ${perfil}`).toBeGreaterThanOrEqual(1.6);
        expect(d.golpesParaVencer, `${e.nome} ${perfil}`).toBeGreaterThanOrEqual(m.golpesParaVencer);
      }
    }
  });
  it('o Médio pede pelo menos 25% mais esforço que a campanha de antes dos níveis em cada chefe e mini-chefe', () => {
    // esforço = golpes para vencer ÷ golpes para sobreviver; "antes" = multiplicadores 1 (vida e dano-base)
    for (const e of ENCONTROS.filter((x) => ENEMY_CFG[x.kind].boss)) {
      const cfg = ENEMY_CFG[e.kind];
      const st = jogador('medio', e.nivel.direto, 'direto');
      const golpe = st.damage * (1 + st.crit * (st.critMult - 1));
      const antes = Math.ceil(cfg.hp / golpe) / (st.maxHp / Math.max(1, Math.round(cfg.dmg * (1 - Math.min(0.6, st.defense)))));
      const r = linha(e, 'medio', 'direto');
      const agora = r.golpesParaVencer / r.golpesParaSobreviver;
      expect(agora / antes, e.nome).toBeGreaterThanOrEqual(1.25);
    }
  });
});
