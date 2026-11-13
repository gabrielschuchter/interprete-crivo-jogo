/**
 * Capturas na câmera real de jogo, uma por região, com a interface na tela.
 * Uso: node tools/perf/regioes.mjs <prefixo>
 * Exige o build no ar (npm run build && npm run preview) ou E2E_URL apontando para o servidor.
 */
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = createRequire(import.meta.url)('playwright')); } catch { ({ chromium } = createRequire('/')('playwright')); }
const pre = process.argv[2] ?? 'regiao';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const vw = Number(process.env.VW ?? 1280), vh = Number(process.env.VH ?? 720);
const p = await b.newPage({ viewport: { width: vw, height: vh } });
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
// a entrada do Observatório põe a câmera contra a porta: o jogador anda 8 m para dentro antes da captura
const posicao = { observatorio: [0, 4.4, Math.PI] };
const regs = (process.env.REGIOES ?? 'atrio,bosque,arquivo,observatorio').split(',');
for (const reg of regs) {
  if (reg !== 'atrio') { await E((r) => __game.travel(r, null), reg); await p.waitForTimeout(400); await waitMode('play'); }
  if (posicao[reg]) await E((v) => { const P = __game.player; P.teleport(v[0], P.pos.y, v[1], v[2]); }, posicao[reg]);
  await p.waitForTimeout(7500);
  await p.screenshot({ path: `${pre}-${reg}.jpg`, quality: 88, timeout: 180000 });
}
await b.close();
