/**
 * Travadas da página com o menu na tela (tarefas longas do processo principal), no navegador com janela e GPU real.
 * Uso: npm run build && npx vite preview --port 4173, depois node tools/perf/travadas.mjs [url] [vezes]
 * Do menu aparecer até 9 s depois: maior tarefa, soma das tarefas acima de 50 ms e quadros acima de 100 ms.
 */
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = createRequire(import.meta.url)('playwright')); } catch { ({ chromium } = createRequire('/')('playwright')); }
const URL = process.argv[2] ?? process.env.E2E_URL ?? 'http://127.0.0.1:4173/';
const N = Number(process.argv[3] ?? 3);
const b = await chromium.launch({ headless: process.env.JANELA === '0', args: ['--ignore-gpu-blocklist', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'] });
const out = [];
for (let i = 0; i < N; i++) {
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  await p.addInitScript(() => {
    window.__lt = []; window.__lf = []; let last = 0;
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push([e.startTime, e.duration]); }).observe({ type: 'longtask', buffered: true });
    const f = (t) => { if (last && t - last > 100) window.__lf.push([last, t - last]); last = t; requestAnimationFrame(f); }; requestAnimationFrame(f);
  });
  await p.goto(URL);
  let t0 = 0;
  for (let k = 0; k < 1200; k++) { const m = await p.evaluate(() => window.__game?.mode).catch(() => null); if (m === 'menu') { t0 = await p.evaluate(() => performance.now()); break; } await p.waitForTimeout(50); }
  await p.waitForTimeout(9000);
  const r = await p.evaluate((t0) => {
    const lt = window.__lt.filter(([s]) => s >= t0 - 20 && s < t0 + 9000);
    const lf = window.__lf.filter(([s]) => s >= t0 - 20 && s < t0 + 9000);
    return { ate_menu_ms: Math.round(t0), maior_ms: Math.round(Math.max(0, ...lt.map((x) => x[1]))), soma_ms: Math.round(lt.reduce((a, x) => a + x[1], 0)), tarefas: lt.length, quadros_100ms: lf.length };
  }, t0);
  out.push(r);
  console.log(JSON.stringify(r));
  await p.close();
}
const med = (k) => [...out].map((r) => r[k]).sort((a, c) => a - c)[Math.floor(out.length / 2)];
console.log('mediana', JSON.stringify({ ate_menu_ms: med('ate_menu_ms'), maior_ms: med('maior_ms'), soma_ms: med('soma_ms'), quadros_100ms: med('quadros_100ms') }));
await b.close();
