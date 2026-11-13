/** Capturas fixas para comparar antes e depois (Pátio e Bosque). Uso: node tools/perf/vistas.mjs <prefixo> */
import { createRequire } from 'node:module';
import fs from 'node:fs';
let chromium;
try { ({ chromium } = createRequire(import.meta.url)('playwright')); } catch { ({ chromium } = createRequire('/')('playwright')); }
const pre = process.argv[2] ?? 'vista';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const E = (fn, a) => p.evaluate(fn, a);
const waitMode = async (m) => { for (;;) { if ((await E(() => window.__game?.mode).catch(() => null)) === m) return; await p.waitForTimeout(200); } };
await p.goto((process.env.E2E_URL ?? 'http://127.0.0.1:4173/') + '?teste');
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
const views = { atrio: [[0, 2.2, 10, 0, 1.5, -10], [-12, 3, 18, -22, 3, 4]], bosque: [[0, 2.5, 6, 0, 2, -20]] };
for (const reg of Object.keys(views)) {
  if (reg !== 'atrio') { await E((r) => __game.travel(r, null), reg); await p.waitForTimeout(400); await waitMode('play'); }
  await p.waitForTimeout(1500);
  let i = 0;
  for (const v of views[reg]) {
    const url = await E((v) => { const G = __game; G.tick = () => {}; const e = G.engine; const P = G.player.pos; e.camera.position.set(P.x + v[0], P.y + v[1], P.z + v[2]); e.camera.lookAt(P.x + v[3], P.y + v[4], P.z + v[5]); e.time = 10; e.render(0, P); e.render(0, P); return e.renderer.domElement.toDataURL('image/jpeg', 0.85); }, v);
    fs.writeFileSync(`${pre}-${reg}-${i++}.jpg`, Buffer.from(url.split(',')[1], 'base64'));
    await E(() => { delete __game.tick; });
  }
}
await b.close();
