// instalado na página pelos cenários: simulação acelerada e jogador automático
window.T = {
  log: [],
  async sim(sec, fn) {
    const g = __game;
    g.engine.render = () => {};
    const n = Math.round(sec * 30);
    for (let i = 0; i < n; i++) {
      if (fn && fn(i) === false) break;
      g.tick(1 / 30);
      g.input.endFrame();
      if (i % 6 === 0) await new Promise((r) => setTimeout(r, 0));
    }
    delete g.engine.render;
    await new Promise((r) => setTimeout(r, 0));
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
      if (s.hp < 40 && s.inventory.caldo) { g.input.inject('item'); used++; }
    });
    g.input.hold('KeyW', false); g.input.hold('KeyS', false); g.input.hold('KeyA', false);
    const left = g.enemies.filter((e) => e.alive && (!group || e.group === group)).length;
    const res = { group, seg: +t.toFixed(1), hpAntes: hp0, hpDepois: s.hp, caldos: used, mortes: deaths, restam: left, nivel: s.level };
    T.log.push('luta ' + JSON.stringify(res));
    return res;
  },
  st() { const s = __game.state; return { quests: Object.fromEntries(Object.entries(s.quests).map(([k, v]) => [k, v.status === 'concluida' ? 'ok' : v.step])), lvl: s.level, xp: s.xp, hp: s.hp, coins: s.coins, inv: s.inventory, flags: s.flags.filter((f) => !f.startsWith('limpo') && !f.startsWith('tutorial')), codex: s.codex.length }; },
};
