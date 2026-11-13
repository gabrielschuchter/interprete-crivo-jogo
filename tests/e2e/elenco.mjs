/**
 * Elenco PS2 em jogo: moradores carregam o modelo, ficam longe dos objetos de missão e conversam nos quatro tempos;
 * cada inimigo novo detecta, persegue, ataca, recebe dano e morre; mini-chefes entram na segunda fase e mostram o
 * padrão próprio; Vulto, Eco e Veredito usam os corpos novos. Uso: npm run dev e depois npm run e2e:elenco.
 * Capturas em tests/e2e/out/elenco_*.png (SHOTS=0 desliga).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
let chromium;
try {
  ({ chromium } = createRequire(import.meta.url)('playwright'));
} catch {
  ({ chromium } = createRequire('/')('playwright'));
}
const URL0 = (process.env.E2E_URL ?? 'http://127.0.0.1:5173/') + '?teste';
const SHOTS = process.env.SHOTS !== '0';
const outDir = path.join(here, 'out');
fs.mkdirSync(outDir, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 640, height: 360 } });
const fails = [];
const fail = (m) => (fails.push(m), console.log('  ✗', m));
const ok = (cond, m) => (cond ? console.log('  ✓', m) : fail(m));
p.on('pageerror', (e) => fail('erro de página: ' + e.message));
const E = (fn, a) => p.evaluate(fn, a);
const mode = () => E(() => window.__game?.mode);
const waitMode = async (m, ms = 240000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if ((await mode()) === m) return;
    await p.waitForTimeout(250);
  }
  throw new Error(`tempo esgotado esperando o modo ${m} (atual: ${await mode()})`);
};
const travel = async (to, spawn) => {
  await E(([to, spawn]) => __game.travel(to, spawn), [to, spawn]);
  await p.waitForTimeout(400);
  await waitMode('play');
};
const shot = async (name) => {
  if (!SHOTS) return;
  await E(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await p.screenshot({ path: path.join(outDir, `elenco_${name}.png`), timeout: 240000 }).catch((e) => console.log('  (captura falhou: ' + String(e).slice(0, 80) + ')'));
};

const MORADORES = { atrio: ['custodia', 'amelia', 'dito', 'vera'], arquivo: ['bartolomeu', 'aurelio'], bosque: ['gloria', 'matias'], observatorio: ['severino', 'rosario', 'celeste', 'inacio'] };

try {
  console.log('Abertura');
  await p.goto(URL0);
  await waitMode('splash');
  await E(() => localStorage.clear());
  await p.keyboard.press('Enter');
  await waitMode('menu');
  await p.click('#menu [data-a=new]');
  await waitMode('create');
  await p.click('#create [data-prof=enfermagem]');
  await p.click('#create [data-skin="3"]');
  await p.fill('#create input', 'Teste');
  await p.click('#create [data-a=go]');
  await waitMode('play');
  await E(fs.readFileSync(path.join(here, 'page-helpers.js'), 'utf8'));
  ok(await E(() => !!__game.player.fig.ext), 'o protagonista usa o modelo do elenco PS2');
  ok(await E(() => __game.player.fig.ext.clips.has('torch_idle') && __game.player.fig.ext.clips.has('jump')), 'o protagonista traz clipes de tocha e de pulo');
  const EXPR = ['piscar', 'sobrancelha_erguer', 'sobrancelha_franzir', 'boca_abrir', 'sorriso', 'tristeza'];
  const exprDe = (alvo) => { let d = null; alvo.traverse((o) => { if (o.morphTargetDictionary && o.material && /body/i.test(o.material.name)) d = Object.keys(o.morphTargetDictionary); }); return d || []; };
  const exprOk = (l) => EXPR.every((n) => l.includes(n));
  ok(exprOk(await E(`(${exprDe})(__game.player.fig.root)`)), 'o protagonista tem as seis expressões faciais no corpo');
  const pele = await E(() => new Promise((res) => { const t0 = performance.now(); const f = () => { let src = '', w = 0; __game.player.fig.root.traverse((o) => { if (o.material && /^human\.body$/i.test(o.material.name) && o.material.map) { src = o.material.map.image?.src ?? ''; w = o.material.map.image?.width ?? 0; } }); if ((src && w) || performance.now() - t0 > 8000) res({ src, w }); else setTimeout(f, 100); }; f(); }));
  ok(/pele\/fem_3\.webp/.test(pele.src) && pele.w > 0, `o tom de pele escolhido (escura) vira a textura do corpo (${pele.src.split('/').pop()}, ${pele.w} px)`);

  console.log('Moradores');
  for (const [reg, ids] of Object.entries(process.env.SO === 'inimigos' ? {} : MORADORES)) {
    if (reg !== 'atrio') await travel(reg, 'de_atrio');
    for (const id of ids) {
      const r = await E((id) => {
        const g = __game;
        const n = g.npcs.find((x) => x.def.id === id);
        if (!n) return { falta: true };
        const props = g.props.filter((x) => x.def.kind !== 'trail').map((x) => ({ id: x.def.id, d: Math.hypot(x.pos.x - n.pos.x, x.pos.z - n.pos.z) }));
        const perto = props.filter((x) => x.d < 3.2);
        let expr = [];
        n.fig.root.traverse((o) => { if (o.morphTargetDictionary && o.material && /body/i.test(o.material.name)) expr = Object.keys(o.morphTargetDictionary); });
        return { expr, modelo: !!n.fig.ext, clipes: n.fig.ext ? [...n.fig.ext.clips.keys()] : [], perto, y: n.pos.y, alt: n.fig.height };
      }, id);
      if (r.falta) { fail(`${id} ausente em ${reg}`); continue; }
      ok(r.modelo, `${id}: modelo carregado (${reg})`);
      ok(exprOk(r.expr), `${id}: expressões faciais (${r.expr.length})`);
      ok(['talk', 'wave', 'point', 'listen', 'shrug'].every((c) => r.clipes.includes(c)), `${id}: clipes de gesto`);
      ok(!r.perto.length, `${id}: longe de objetos de missão ${r.perto.length ? JSON.stringify(r.perto) : ''}`);
      const said = await E(async (id) => {
        const g = __game; const lines = [];
        const say0 = g.ui.say.bind(g.ui);
        g.ui.say = async (nm, role, t) => { lines.push(nm + ': ' + t); return say0(nm, role, t); };
        try { await T.talk(id); await T.sim(0.5); } finally { g.ui.say = say0; }
        return lines;
      }, id);
      ok(said.length >= 4, `${id}: conversa com ${said.length} falas (saudação, assunto, andamento, despedida)`);
      ok(said.every((l) => !/jornada/i.test(l)), `${id}: texto sem termos vetados`);
    }
    if (reg !== 'atrio') {
      // retrato do primeiro morador da região, câmera na altura do rosto
      await E((id) => { const g = __game; const n = g.npcs.find((x) => x.def.id === id); g.player.teleport(n.pos.x + Math.sin(n.yaw) * 2.6, n.pos.y, n.pos.z + Math.cos(n.yaw) * 2.6, n.yaw + Math.PI); }, ids[0]);
      await E(() => T.sim(1));
      await shot('morador_' + reg);
      await travel('atrio', 'de_' + reg);
    } else {
      await E(() => { const g = __game; const n = g.npcs.find((x) => x.def.id === 'amelia'); g.player.teleport(n.pos.x, n.pos.y, n.pos.z + 3, Math.PI); });
      await E(() => T.sim(1));
      await shot('morador_atrio');
    }
  }

  console.log('Inimigos comuns: detectar, perseguir, atacar, sofrer dano, morrer');
  await travel('bosque', 'de_atrio');
  for (const kind of ['erudito', 'errante', 'suplicante', 'vulto']) {
    const r = await E(async (kind) => {
      const g = __game; const p = g.player; const s = g.state;
      for (const e of g.enemies) e.hp = 0;
      g.enemies = g.enemies.filter(() => false);
      p.teleport(-30, 0, 0, Math.PI / 2);
      s.hp = s.maxHp ?? 100;
      const e = g.spawnEnemy(kind, kind === 'vulto' ? -20 : -24, 0, 'teste_' + kind);
      // tipo fora da região: o corpo baixa sob demanda
      for (let i = 0; i < 80 && !e.body; i++) await new Promise((r) => setTimeout(r, 250));
      await T.sim(0.2);
      const corpo = !!e.body;
      const own = e.body?.own ?? false;
      const x0 = e.pos.x;
      const seen = new Set();
      let hp0 = s.hp, feriu = false;
      await T.sim(10, () => { seen.add(e.state); if (s.hp < hp0) feriu = true; if (s.hp < 40) s.hp = 90; hp0 = Math.min(hp0, s.hp); });
      const andou = Math.abs(e.pos.x - x0) > 0.8;
      const hpE = e.hp;
      e.damage(10, false, false);
      const levou = e.hp < hpE;
      e.damage(9999, true, true);
      await T.sim(1.6);
      return { corpo, own, estados: [...seen], andou, feriu, levou, morto: e.state === 'dead' || e.state === 'dying', mats: e.body?.mats.length ?? 0 };
    }, kind);
    ok(r.corpo && r.own, `${kind}: corpo do elenco carregado`);
    ok(r.estados.includes('chase'), `${kind}: detecta e persegue (${r.estados.join(',')})`);
    ok(r.andou, `${kind}: se move`);
    ok(r.estados.includes('windup') || r.estados.includes('cast'), `${kind}: prepara ataque`);
    ok(r.feriu, `${kind}: acerta o jogador`);
    ok(r.levou && r.morto, `${kind}: recebe dano e morre`);
  }
  // retrato dos quatro comuns lado a lado, parados
  await E(async () => {
    const g = __game; const p = g.player;
    p.teleport(-30, 0, 4, Math.PI);
    const ks = ['erudito', 'errante', 'suplicante', 'vulto'];
    ks.forEach((k, i) => { const e = g.spawnEnemy(k, -33 + i * 2, 0, 'retrato'); e.state = 'recover'; e.yaw = 0; });
    await T.sim(0.4, () => { for (const e of g.enemies) { e.state = 'recover'; e.aggro = false; } });
  });
  await shot('comuns');
  await E(() => { const g = __game; for (const e of g.enemies) g.engine.scene.remove(e.root); g.enemies = []; });

  console.log('Mini-chefes: segunda fase a 50% e padrão próprio');
  for (const kind of ['duelista', 'carcereiro', 'matriarca']) {
    const r = await E(async (kind) => {
      const g = __game; const p = g.player; const s = g.state;
      p.teleport(-30, 0, 0, Math.PI / 2);
      s.hp = 100;
      const e = g.spawnEnemy(kind, -24, 0, 'teste_' + kind);
      for (let i = 0; i < 80 && !e.body; i++) await new Promise((r) => setTimeout(r, 250));
      await T.sim(0.2);
      const seen = new Set(); let maxCombo = 0; let tiros = 0; const n0 = g.enemies.length;
      const shoot0 = g.projectiles.length;
      await T.sim(8, () => { seen.add(e.state); maxCombo = Math.max(maxCombo, e.combo ?? 0); if (s.hp < 40) s.hp = 100; });
      const f1 = { estados: [...seen], combo: maxCombo };
      e.damage(Math.ceil(e.hp - e.maxHp * 0.45), false, false);
      seen.clear(); maxCombo = 0;
      let picoTiros = 0;
      await T.sim(12, () => { seen.add(e.state); maxCombo = Math.max(maxCombo, e.combo ?? 0); picoTiros = Math.max(picoTiros, g.projectiles.length); if (s.hp < 40) s.hp = 100; });
      const invocados = g.enemies.filter((x) => x.kind === 'fiapo' && x.group === 'teste_' + kind).length;
      const r = { corpo: !!e.body?.own, fase: e.phase, f1, f2: { estados: [...seen], combo: maxCombo }, invocados, picoTiros, chefe: !!e.cfg.boss };
      e.damage(99999, true, true);
      await T.sim(1.5);
      r.morto = !e.alive;
      for (const x of g.enemies) x.hp = 0;
      for (const x of g.enemies) g.engine.scene.remove(x.root);
      g.enemies = []; g.projectiles.length = 0;
      return r;
    }, kind);
    ok(r.corpo, `${kind}: corpo do elenco carregado`);
    ok(r.chefe, `${kind}: barra de chefe`);
    ok(r.fase === 2, `${kind}: entra na segunda fase a 50%`);
    if (kind === 'duelista') ok(r.f2.combo >= 2, `duelista: encadeia três estocadas na segunda fase (máx. ${r.f2.combo})`);
    if (kind === 'carcereiro') ok(r.invocados >= 2 && r.f2.estados.includes('ring'), `carcereiro: chama reforços e bate em anel (${r.invocados}, ${r.f2.estados.join(',')})`);
    if (kind === 'matriarca') ok(r.picoTiros >= 4, `matriarca: leque de sopros na segunda fase (pico de ${r.picoTiros} projéteis)`);
    ok(r.morto, `${kind}: morre`);
  }

  console.log('Chefes com corpo novo');
  for (const kind of ['eco', 'veredito']) {
    const r = await E(async (kind) => {
      const g = __game;
      const e = g.spawnEnemy(kind, -24, 0, 'teste_' + kind);
      for (let i = 0; i < 80 && !e.body; i++) await new Promise((r) => setTimeout(r, 250));
      await T.sim(0.3);
      const out = { own: !!e.body?.own, clips: e.body ? [...e.body.clips.keys()] : [] };
      g.engine.scene.remove(e.root); g.enemies = g.enemies.filter((x) => x !== e);
      return out;
    }, kind);
    ok(r.own && ['idle', 'walk', 'heavy', 'attack', 'cast', 'hit', 'die'].every((c) => r.clips.includes(c)), `${kind}: corpo novo com os clipes de combate`);
  }
  await E(async () => {
    const g = __game; const p = g.player;
    p.teleport(-30, 0, 7, Math.PI);
    ['duelista', 'carcereiro', 'matriarca'].forEach((k, i) => { const e = g.spawnEnemy(k, -34 + i * 3.2, 0, 'retrato'); e.yaw = 0; });
    await T.sim(0.4, () => { for (const e of g.enemies) { e.state = 'recover'; e.aggro = false; } });
  });
  await shot('mini_chefes');
} catch (e) {
  fail('exceção: ' + (e?.stack ?? e));
}
await b.close();
console.log(fails.length ? `\n${fails.length} falha(s)` : '\nElenco ok');
process.exit(fails.length ? 1 : 0);
