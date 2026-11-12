import { describe, expect, it } from 'vitest';
import { CODEX, CRIVO_SKILLS, ITEMS, PAGES, PLAYER_SKILLS, QUESTS, SHOP } from '../../src/content/data';

describe('integridade do conteúdo', () => {
  it('a loja só vende itens com preço', () => {
    for (const id of SHOP) expect(ITEMS[id]?.price, id).toBeGreaterThan(0);
  });
  it('itens equipáveis têm slot e todos têm ícone', () => {
    for (const it of Object.values(ITEMS)) {
      expect(it.glyph, it.id).toBeTruthy();
      if (it.type === 'equipamento' || it.type === 'ferramenta') expect(it.slot, it.id).toBeTruthy();
    }
  });
  it('pré-requisitos de habilidades existem na mesma árvore', () => {
    for (const tree of [PLAYER_SKILLS, CRIVO_SKILLS]) {
      const ids = new Set(tree.map((s) => s.id));
      expect(ids.size).toBe(tree.length);
      for (const s of tree) for (const r of s.requires ?? []) expect(ids.has(r), `${s.id} -> ${r}`).toBe(true);
    }
  });
  it('as páginas soltas existem no códice', () => {
    for (const p of PAGES) expect(CODEX[p], p).toBeTruthy();
  });
  it('missões têm passos e alvos bem formados', () => {
    for (const q of Object.values(QUESTS)) {
      expect(q.steps.length, q.id).toBeGreaterThan(0);
      for (const s of q.steps) if (s.target) expect(s.target).toMatch(/^(npc|prop|group):[a-z_0-9]+$/);
    }
  });
  it('a voz evita os termos vetados pelo design system', () => {
    const all = JSON.stringify({ ITEMS, CODEX, QUESTS, PLAYER_SKILLS, CRIVO_SKILLS }).toLowerCase();
    for (const w of ['jornada', 'transforme', 'desbloqueie', 'incrível']) expect(all.includes(w), w).toBe(false);
  });
});
