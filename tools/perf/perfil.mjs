/** Perfil de CPU do "Novo jogo" (do clique até jogar): funções com mais tempo próprio. Uso como carga.mjs. */
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = createRequire(import.meta.url)('playwright')); } catch { ({ chromium } = createRequire('/')('playwright')); }
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 640, height: 360 } });
const p = await ctx.newPage();
const E = (fn, a) => p.evaluate(fn, a);
const waitMode = async (m) => { for (;;) { if ((await E(() => window.__game?.mode).catch(() => null)) === m) return; await p.waitForTimeout(100); } };
const cdp = await ctx.newCDPSession(p);
await p.goto((process.env.E2E_URL ?? 'http://127.0.0.1:4173/') + '?teste');
const alvo = process.env.ALVO ?? 'novo';
await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: 1000 });
if (alvo === 'menu') await cdp.send('Profiler.start');
await waitMode('splash');
if (alvo === 'menu') var prof = (await cdp.send('Profiler.stop')).profile;
else {
  await E(() => localStorage.clear());
  await p.keyboard.press('Enter');
  await waitMode('menu');
  await p.click('#menu [data-a=new]');
  await waitMode('create');
  await p.click('#create [data-prof=enfermagem]');
  await p.fill('#create input', 'Teste');
  await cdp.send('Profiler.start');
  await p.click('#create [data-a=go]');
  await waitMode('play');
  await p.waitForTimeout(3000);
  var prof = (await cdp.send('Profiler.stop')).profile;
}
const byId = new Map(prof.nodes.map((n) => [n.id, n]));
const self = new Map();
const dt = (prof.endTime - prof.startTime) / prof.samples.length / 1000;
for (const s of prof.samples) { const n = byId.get(s); const k = `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.split('/').pop()}:${n.callFrame.lineNumber}`; self.set(k, (self.get(k) ?? 0) + dt); }
console.log('total ms', Math.round((prof.endTime - prof.startTime) / 1000));
for (const [k, v] of [...self].sort((a, b) => b[1] - a[1]).slice(0, 30)) console.log(Math.round(v), k);

// quem chama as funções nativas que bloqueiam (compilação de shader): cadeia de chamada resumida
if (process.env.PILHA) {
  const parent = new Map();
  for (const n of prof.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
  const chains = new Map();
  for (const s of prof.samples) {
    const n = byId.get(s);
    if (!/InfoLog|getProgramParameter|getShaderParameter|texSubImage2D|texImage2D/.test(n.callFrame.functionName)) continue;
    const ch = [];
    let id = parent.get(n.id);
    while (id && ch.length < 14) { const q = byId.get(id); ch.push(`${q.callFrame.functionName || '?'}:${q.callFrame.lineNumber}:${q.callFrame.columnNumber}`); id = parent.get(id); }
    const k = ch.join(' < ');
    chains.set(k, (chains.get(k) ?? 0) + dt);
  }
  for (const [k, v] of [...chains].sort((a, b) => b[1] - a[1]).slice(0, 8)) console.log(Math.round(v), k);
}
await b.close();
