/**
 * Números de carga que valem fora do SwiftShader: bytes até a abertura, programas de shader, triângulos e
 * chamadas de desenho no Pátio (abertura e jogo), mais os tempos de parede (estes, só comparação relativa).
 * Uso: node tools/perf/metricas.mjs [url]   (padrão http://127.0.0.1:4173/)
 */
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = createRequire(import.meta.url)('playwright')); } catch { ({ chromium } = createRequire('/')('playwright')); }
const base = process.argv[2] ?? 'http://127.0.0.1:4173/';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 640, height: 360 } });
let bytes = 0, reqs = 0, open = true;
p.on('response', async (r) => { if (!r.url().startsWith('http')) return; try { const n = (await r.body()).length; if (open) { bytes += n; reqs++; } } catch {} });
const E = (fn, a) => p.evaluate(fn, a);
const waitMode = async (m) => { for (;;) { if ((await E(() => window.__game?.mode).catch(() => null)) === m) return; await p.waitForTimeout(100); } };
const cena = () => E(() => {
  const e = __game.engine, r = e.renderer;
  r.info.autoReset = false; r.info.reset();
  e.render(0.016, __game.player?.pos ?? e.camera.position);
  const calls = r.info.render.calls, tris = r.info.render.triangles;
  r.info.autoReset = true;
  let malhas = 0; e.scene.traverse((o) => { if (o.isMesh && o.visible) malhas++; });
  return { programas: r.info.programs.length, texturas: r.info.memory.textures, chamadas: calls, triangulosDesenhados: tris, malhas };
});
const t0 = Date.now();
await p.goto(base + '?teste');
await waitMode('splash');
const tMenu = Date.now() - t0;
open = false;
const abertura = { ms: tMenu, pedidos: reqs, MB: +(bytes / 1048576).toFixed(2), ...(await cena()) };
await E(() => localStorage.clear());
await p.keyboard.press('Enter');
await waitMode('menu');
await p.waitForTimeout(4000);
await p.click('#menu [data-a=new]');
await waitMode('create');
await p.click('#create [data-prof=enfermagem]');
await p.fill('#create input', 'Teste');
const tn = Date.now();
await p.click('#create [data-a=go]');
await waitMode('play');
const novo = Date.now() - tn;
await p.waitForTimeout(1500);
const jogo = { novoJogoMs: novo, ...(await cena()) };
console.log(JSON.stringify({ abertura, jogo }));
await b.close();
