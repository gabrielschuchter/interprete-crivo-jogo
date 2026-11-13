// instalado na página pelos cenários: simulação acelerada e jogador automático
window.T = {
  log: [],
  async sim(sec, fn) {
    const g = __game;
    g.engine.render = () => {};
    // o laço de quadros do navegador fica parado durante a simulação: sem isso, o tempo real
    // entre as pausas vira tempo de jogo sem o jogador automático, e o resultado passa a
    // depender da velocidade da máquina
    const tick = g.tick;
    g.tick = () => {};
    const n = Math.round(sec * 30);
    try {
      for (let i = 0; i < n; i++) {
        if (fn && fn(i) === false) break;
        tick.call(g, 1 / 30);
        g.input.endFrame();
        if (i % 6 === 0) await new Promise((r) => setTimeout(r, 0));
      }
    } finally {
      delete g.tick;
      delete g.engine.render;
    }
    await new Promise((r) => setTimeout(r, 0));
  },
  /** recolhe as peças que as criaturas deixaram cair (o que uma pessoa faria ao ver o facho de luz) */
  async loot() {
    const g = __game; const pegas = [];
    for (let k = 0; k < 6; k++) {
      const x = g.props.find((q) => q.def.id.startsWith('drop_') && g.propVisible(q) && !g.state.collected.includes(q.def.id));
      if (!x) break;
      await T.use(x.def.id);
      pegas.push(x.def.data.gear);
    }
    if (pegas.length) T.log.push('peças recolhidas ' + pegas.join(','));
    return pegas;
  },
  async settle() { for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0)); },
  async talk(id, choice) {
    const g = __game; const n = g.npcs.find((x) => x.def.id === id);
    if (!n) throw new Error('npc ausente: ' + id);
    g.autoChoice = choice;
    g.player.teleport(n.pos.x + Math.sin(n.yaw) * 1.4, n.pos.y, n.pos.z + Math.cos(n.yaw) * 1.4, n.yaw + Math.PI);
    await T.sim(1.5); g.input.inject('interagir'); await T.sim(0.3); await T.settle();
    g.autoChoice = undefined;
    if (g.mode !== 'play' && !['shop', 'case', 'ending'].includes(g.mode)) throw new Error('modo inesperado após conversa: ' + g.mode);
  },
  async use(id, choice, dx = 0, dz = 0.9) {
    const g = __game; const x = g.prop(id);
    if (!x) throw new Error('objeto ausente: ' + id);
    g.autoChoice = choice;
    g.player.teleport(x.pos.x + dx, x.pos.y, x.pos.z + dz, Math.atan2(-dx, -dz));
    await T.sim(1.7);
    const near = g.nearest();
    if (!near || near.prop !== x) T.log.push(`aviso: perto de ${id} o alvo era ${near ? (near.prop?.def.id ?? near.npc?.def.id) : 'nenhum'}`);
    g.input.inject('interagir'); await T.sim(0.4); await T.settle();
    g.autoChoice = undefined;
  },
  async fight(group, maxSec = 120) {
    const g = __game; const p = g.player; const s = g.state;
    const hp0 = s.hp; let t = 0; let deaths = 0; let used = 0;
    s.crivoActive = 'pulso';
    await T.sim(maxSec, (i) => {
      t = i / 30;
      if (g.mode === 'dead') { deaths++; return false; }
      if (p.dead) return;
      const es = g.enemies.filter((e) => e.alive && (!group || e.group === group));
      if (!es.length) return false;
      const e = es.sort((a, b) => a.pos.distanceTo(p.pos) - b.pos.distanceTo(p.pos))[0];
      const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z; const d = Math.hypot(dx, dz);
      p.camYaw = Math.atan2(-dx, -dz);
      const tele = g.enemies.some((o) => o.alive && o.telegraphing && o.pos.distanceTo(p.pos) < 4.2 + o.radius);
      g.input.hold('KeyW', false); g.input.hold('KeyS', false); g.input.hold('KeyA', false);
      if (g.enemies.some((o) => o.alive && o.state === 'recite')) g.input.inject('crivo');
      if (tele) { g.input.hold('KeyS', true); if (i % 9 === 0) g.input.inject('esquiva'); }
      else if (d > 2.1 + e.radius) { g.input.hold('KeyW', true); if (g.projectiles.length || (p.speed < 0.8 && i % 60 < 30)) g.input.hold('KeyA', true); }
      else if (i % 7 === 0) g.input.inject(e.state === 'stunned' ? 'golpe' : 'ataque');
      if (i % 240 === 100) g.input.inject('crivo');
      if (s.hp < Math.max(40, g.stats.maxHp * 0.4) && s.inventory.caldo) { g.input.inject('item'); used++; }
    });
    g.input.hold('KeyW', false); g.input.hold('KeyS', false); g.input.hold('KeyA', false);
    const left = g.enemies.filter((e) => e.alive && (!group || e.group === group)).length;
    const res = { group, seg: +t.toFixed(1), hpAntes: hp0, hpDepois: s.hp, caldos: used, mortes: deaths, restam: left, nivel: s.level };
    T.log.push('luta ' + JSON.stringify(res));
    return res;
  },
  /**
   * Prepara o jogador como uma pessoa que explorou: gasta os pontos de habilidade nos ramos de encontro,
   * compra na banca o que couber (traje de maior defesa primeiro, depois caldos) e equipa a melhor arma e o melhor traje.
   * Devolve um resumo para o relatório.
   */
  preparar() {
    const g = __game; const s = g.state; const d = __data; const out = { habilidades: [], compras: [], arma: '', traje: '' };
    for (const id of ['folego', 'esquiva_limpa', 'golpe_decidido', 'passo_firme']) {
      const def = d.PLAYER_SKILLS.find((x) => x.id === id);
      if (def && !s.skills.includes(id)) { g.unlock(def, false); if (s.skills.includes(id)) out.habilidades.push(id); }
    }
    // a banca só vende o que a missão da ponte e a encomenda já abriram; o bot compra sem se preocupar com a loja
    for (const id of ['cota_amostra', 'jaleco_semmelweis', 'gibao_sigilo']) {
      const def = d.ITEMS[id];
      if (!def || s.inventory[id]) continue;
      if (s.coins >= g.priceOf(id) && g.buyItem(id)) out.compras.push(id);
    }
    while (s.coins >= g.priceOf('caldo') && (s.inventory.caldo ?? 0) < 4) { if (!g.buyItem('caldo')) break; out.compras.push('caldo'); }
    const best = (slot, score) => {
      let top = null; let topScore = -1;
      for (const id of Object.keys(s.inventory)) {
        const it = d.ITEMS[id];
        if (!it || it.slot !== slot) continue;
        if (!s.equipment[slot] || s.equipment[slot] !== id) g.toggleEquip(id);
        if (s.equipment[slot] !== id) continue;
        const v = score(g.stats);
        if (v > topScore) { topScore = v; top = id; }
      }
      if (top && s.equipment[slot] !== top) g.toggleEquip(top);
      return top ?? s.equipment[slot] ?? '';
    };
    out.arma = best('arma', (st) => (st.damage + st.heavyDamage * 0.5) * (1 + st.crit * (st.critMult - 1)) * (st.special === 'desfecho' ? 1.1 : 1) * (st.special === 'replicacao' ? 1.2 : 1));
    out.traje = best('traje', (st) => st.defense);
    T.log.push('preparo ' + JSON.stringify(out));
    return out;
  },
  st() { const s = __game.state; return { quests: Object.fromEntries(Object.entries(s.quests).map(([k, v]) => [k, v.status === 'concluida' ? 'ok' : v.step])), lvl: s.level, xp: s.xp, hp: s.hp, coins: s.coins, inv: s.inventory, flags: s.flags.filter((f) => !f.startsWith('limpo') && !f.startsWith('tutorial')), codex: s.codex.length }; },
};
