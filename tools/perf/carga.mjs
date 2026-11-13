/**
 * Mede a primeira carga: bytes e pedidos até o menu, tempo até o menu e tempo de "Novo jogo" até jogar.
 * Uso: npm run build && npx vite preview --port 4173 (outro terminal), depois node tools/perf/carga.mjs
 * REDE=mbps limita a banda (ex.: REDE=20 simula 20 Mbit/s com 40 ms de latência). SwiftShader: os tempos
 * de compilação de shader valem como comparação relativa, não como número de GPU real.
 */
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = createRequire(import.meta.url)('playwright')); } catch { ({ chromium } = createRequire('/')('playwright')); }
const URL0 = (process.env.E2E_URL ?? 'http://127.0.0.1:4173/') + '?teste';
const mbps = Number(process.env.REDE ?? 0);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 640, height: 360 } });
const p = await ctx.newPage();
if (mbps) {
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 40, downloadThroughput: (mbps * 1e6) / 8, uploadThroughput: (mbps * 1e6) / 8 });
}
const logs = [];
p.on('console', (m) => { const t = m.text(); if (t.includes('[carga]')) logs.push(t); });
let phase = 'menu';
const net = { menu: { n: 0, bytes: 0, kinds: {} }, novo: { n: 0, bytes: 0, kinds: {} } };
p.on('response', async (r) => {
  if (!r.url().startsWith('http')) return;
  const ph = phase;
  try {
    const buf = await r.body();
    const u = new URL(r.url()).pathname;
    const k = u.endsWith('.glb') ? (u.includes('personagens') ? 'glb-personagem' : 'glb-prop') : u.split('.').pop();
    const e = net[ph];
    e.n++; e.bytes += buf.length;
    e.kinds[k] = (e.kinds[k] ?? 0) + buf.length;
  } catch { /* redirecionado ou cancelado */ }
});
const E = (fn, a) => p.evaluate(fn, a);
const waitMode = async (m, ms = 400000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if ((await E(() => window.__game?.mode).catch(() => null)) === m) return; await p.waitForTimeout(100); }
  throw new Error('tempo esgotado: ' + m);
};
const t0 = Date.now();
await p.goto(URL0);
await waitMode('splash');
const tMenu = Date.now() - t0;
const atSplash = { n: net.menu.n, bytes: net.menu.bytes };
await E(() => { const eng = __game.engine; const r0 = eng.render.bind(eng); window.__slow = []; eng.render = (dt, f) => { const t = performance.now(); const tx0 = eng.renderer.info.memory.textures, pg0 = eng.renderer.info.programs.length; r0(dt, f); const ms = performance.now() - t; if (ms > 400) window.__slow.push({ ms: Math.round(ms), mode: __game.mode, tris: eng.renderer.info.render.triangles, texNovas: eng.renderer.info.memory.textures - tx0, progNovos: eng.renderer.info.programs.length - pg0 }); }; });
await E(() => localStorage.clear());
await p.keyboard.press('Enter');
await waitMode('menu');
// quem lê o menu por alguns segundos: espera os shaders pendentes da abertura terminarem (até 90 s)
const td0 = Date.now();
for (let i = 0; i < 900; i++) { if (!(await E(() => __game.engine.pendingLinks ?? 0))) break; await p.waitForTimeout(100); }
const tDrain = Date.now() - td0;
await p.click('#menu [data-a=new]');
const tc0 = Date.now();
await waitMode('create');
const tCreate = Date.now() - tc0;
await p.click('#create [data-prof=enfermagem]');
await p.fill('#create input', 'Teste');
phase = 'novo';
const tn0 = Date.now();
await p.click('#create [data-a=go]');
await waitMode('play');
const tNovo = Date.now() - tn0;
await p.waitForTimeout(500);
const fps = await E(() => new Promise((res) => { let n = 0; const s = performance.now(); const f = () => { n++; if (performance.now() - s < 3000) requestAnimationFrame(f); else res(Math.round((n / (performance.now() - s)) * 10000) / 10); }; requestAnimationFrame(f); }));
const mb = (x) => (x / 1048576).toFixed(2) + ' MB';
const fmt = (e) => `${e.n} pedidos, ${mb(e.bytes)} (${Object.entries(e.kinds).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${mb(v)}`).join(', ')})`;
console.log(JSON.stringify({ rede: mbps || 'local', menuMs: tMenu, shadersNoMenuMs: tDrain, criacaoMs: tCreate, novoJogoMs: tNovo, fps }));
console.log('rede até a tela de abertura:', atSplash.n, 'pedidos,', mb(atSplash.bytes));
console.log('rede até clicar em Novo jogo (inclui segundo plano):', fmt(net.menu));
console.log('quadros lentos:', JSON.stringify(await E(() => window.__slow)));
console.log('rede no novo jogo:', fmt(net.novo));
for (const l of logs) console.log(l);
await b.close();
