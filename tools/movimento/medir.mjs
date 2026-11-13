/**
 * Medidas objetivas de movimento: deslize do pé de apoio (m/s) do protagonista andando e correndo, dos
 * inimigos perseguindo e dos moradores virando. Uso: com o preview no ar, node tools/movimento/medir.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
let chromium;
try { ({ chromium } = createRequire(import.meta.url)('playwright')); } catch { ({ chromium } = createRequire('/')('playwright')); }
const URL0 = (process.env.E2E_URL ?? 'http://127.0.0.1:4173/') + '?teste';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 320, height: 200 } });
p.on('pageerror', (e) => console.log('  erro de página:', e.message));
const E = (fn, a) => p.evaluate(fn, a);
const waitMode = async (m) => { for (let i = 0; i < 960; i++) { if ((await E(() => window.__game?.mode)) === m) return; await p.waitForTimeout(250); } throw new Error('modo ' + m); };
await p.goto(URL0);
await waitMode('splash');
await E(() => localStorage.clear());
await p.keyboard.press('Enter');
await waitMode('menu');
await p.click('#menu [data-a=new]');
await waitMode('create');
await p.click('#create [data-prof=enfermagem]');
await p.fill('#create input', 'Teste');
await p.click('#create [data-a=go]');
await waitMode('play');
await E(fs.readFileSync(path.join(root, 'tests/e2e/page-helpers.js'), 'utf8'));
await E(() => {
  // deslize: velocidade horizontal do pé mais baixo enquanto ele está a menos de 6 cm do seu mínimo
  // deslize: mediana da velocidade horizontal de cada pé nos quadros em que ele está a menos de 2,5 cm do próprio mínimo
  window.SLIP = (obj, base) => {
    const V = __game.player.pos.constructor;
    const L = obj.getObjectByName('LeftFoot'), R = obj.getObjectByName('RightFoot');
    const tr = [[], []];
    return {
      step() {
        obj.updateWorldMatrix(true, true);
        [L, R].forEach((f, i) => { const v = new V().setFromMatrixPosition(f.matrixWorld); tr[i].push([v.x, v.y - base(), v.z]); });
      },
      get res() {
        const sp = [];
        for (const t of tr) {
          const min = Math.min(...t.map((x) => x[1]));
          for (let i = 1; i < t.length; i++) if (t[i][1] < min + 0.025 && t[i - 1][1] < min + 0.025) sp.push(Math.hypot(t[i][0] - t[i - 1][0], t[i][2] - t[i - 1][2]) * 30);
        }
        sp.sort((a, b) => a - b);
        return { medianaMs: +(sp[Math.floor(sp.length / 2)] ?? 0).toFixed(2), p90Ms: +(sp[Math.floor(sp.length * 0.9)] ?? 0).toFixed(2), amostras: sp.length };
      },
    };
  };
});
const r = await E(async () => {
  const g = __game; const p = g.player; const I = g.input; const out = {};
  for (const e of g.enemies) g.engine.scene.remove(e.root); g.enemies = [];
  for (const [nome, keys] of [['andar', ['KeyD']], ['correr', ['KeyD', 'ShiftLeft']]]) {
    p.teleport(-8, 0, 8, Math.PI / 2); p.camYaw = 0;
    await T.sim(0.4);
    for (const k of keys) I.hold(k, true);
    await T.sim(1.0, () => { p.camYaw = 0; });
    const s = SLIP(p.fig.root, () => p.pos.y);
    let sp = 0, n = 0;
    await T.sim(1.5, () => { p.camYaw = 0; s.step(); sp += p.speed; n++; });
    for (const k of keys) I.hold(k, false);
    out[nome] = { ...s.res, velocidade: +(sp / n).toFixed(2) };
  }
  // morador vira para o jogador que passa
  const n = g.npcs.find((x) => x.fig.external);
  p.teleport(n.pos.x + 3, n.pos.y, n.pos.z + 3, 0);
  const s = SLIP(n.fig.root, () => n.pos.y);
  await T.sim(2, () => { s.step(); });
  out['morador_vira_' + n.def.id] = s.res;
  for (const kind of ['erudito', 'errante', 'suplicante', 'duelista', 'carcereiro', 'eco', 'veredito']) {
    p.teleport(0, 0, 14, Math.PI); p.frozen = true;
    const e = g.spawnEnemy(kind, 0, 0, 'medida');
    for (let i = 0; i < 80 && !e.body; i++) await new Promise((r) => setTimeout(r, 250));
    e.aggro = true;
    await T.sim(0.6, () => { p.iframes = 9; });
    const s2 = SLIP(e.root, () => e.pos.y);
    let sp = 0, k = 0, last = e.pos.clone();
    await T.sim(1.2, () => { p.iframes = 9; if (e.state === 'chase') { s2.step(); sp += e.pos.distanceTo(last) * 30; k++; } last = e.pos.clone(); return e.pos.distanceTo(p.pos) > 4; });
    out['inimigo_' + kind] = { ...s2.res, velocidade: +(sp / Math.max(1, k)).toFixed(2) };
    g.engine.scene.remove(e.root); g.enemies = [];
    p.frozen = false;
  }
  return out;
});
console.log(JSON.stringify(r, null, 1));
await b.close();
