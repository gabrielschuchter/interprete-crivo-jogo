/**
 * Taxa de quadros real (GPU da máquina) no menu, em planos da abertura e nas quatro regiões do jogo.
 * Uso: npm run build && npx vite preview --port 4173, depois node tools/perf/fps.mjs [rotulo]
 *   JANELA=1 abre o navegador com janela e vsync (número do jogador, até a taxa da tela)
 *   CELULAR=1 emula um telefone (390x844, DPR 3, toque, CPU 4x mais lenta pelo DevTools)
 *   CENAS=1.3,2.4 escolhe os planos; REGIOES=atrio,bosque as regiões; SEG=10 a janela de medida
 * Mede pelo requestAnimationFrame, sem limite de vsync: média, p95 e p99 do tempo de quadro, pior quadro,
 * quadros acima de 50 ms. Imprime JSON por cenário e uma tabela no fim.
 */
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = createRequire(import.meta.url)('playwright')); } catch { ({ chromium } = createRequire('/')('playwright')); }
const BASE = process.env.E2E_URL ?? 'http://127.0.0.1:4173/';
const CEL = process.env.CELULAR === '1';
const SEG = Number(process.env.SEG ?? 10);
const CENAS = (process.env.CENAS ?? '1.1,1.3,2.4,3.4').split(',').filter(Boolean);
const REGS = (process.env.REGIOES ?? 'atrio,bosque,arquivo,observatorio').split(',').filter(Boolean);
// JANELA=1: navegador com janela e vsync (o que o jogador vê, limitado à taxa da tela). Sem ela, sem janela e sem
// limite de quadros: mostra a folga da GPU nas cenas 3D, mas páginas só de DOM (o menu) caem para 30 a 40 fps por
// artefato do modo sem janela, e esse número não vale para o jogador.
const JANELA = process.env.JANELA === '1';
const b = await chromium.launch(JANELA ? { headless: false, args: ['--ignore-gpu-blocklist', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'] } : { args: ['--ignore-gpu-blocklist', '--use-angle=d3d11', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
const ctxOpts = CEL
  ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' }
  : { viewport: { width: 1280, height: 720 } };
const res = [];

async function pagina() {
  const ctx = await b.newContext(ctxOpts);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('  erro:', String(e).slice(0, 160)));
  if (CEL) { const s = await ctx.newCDPSession(p); await s.send('Emulation.setCPUThrottlingRate', { rate: 4 }); }
  const E = (fn, a) => p.evaluate(fn, a);
  const waitMode = async (ms, ...m) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (m.includes(await E(() => window.__game?.mode).catch(() => null))) return true; await p.waitForTimeout(200); } return false; };
  return { ctx, p, E, waitMode };
}

async function medir(nome, E, extra = {}) {
  const r = await E(async (seg) => {
    const ts = [];
    await new Promise((ok) => { const t0 = performance.now(); const f = (t) => { ts.push(t); if (t - t0 < seg * 1000) requestAnimationFrame(f); else ok(); }; requestAnimationFrame(f); });
    const d = ts.slice(1).map((t, i) => t - ts[i]).sort((a, c) => a - c);
    const soma = d.reduce((a, c) => a + c, 0);
    const pc = (q) => d[Math.min(d.length - 1, Math.floor(d.length * q))];
    const g = window.__game, inf = g?.engine?.renderer?.info;
    return { fps: +(1000 * d.length / soma).toFixed(1), media_ms: +(soma / d.length).toFixed(2), p95_ms: +pc(0.95).toFixed(1), p99_ms: +pc(0.99).toFixed(1), pior_ms: +d[d.length - 1].toFixed(1), acima50: d.filter((x) => x > 50).length, quadros: d.length,
      qualidade: g?.engine?.quality, chamadas: inf?.render?.calls, tris: inf?.render?.triangles, programas: inf?.programs?.length, modo: g?.mode };
  }, SEG);
  const o = { cena: nome, ...r, ...extra };
  res.push(o);
  console.log(JSON.stringify(o));
}

// menu
{
  const { ctx, p, E, waitMode } = await pagina();
  const t0 = Date.now();
  await p.goto(BASE);
  await waitMode(240000, 'menu');
  const ateMenu = Date.now() - t0;
  await p.waitForTimeout(3000);
  await medir('menu', E, { ate_menu_ms: ateMenu });
  await ctx.close();
}
// abertura, plano a plano
for (const c of CENAS) {
  const { ctx, p, E, waitMode } = await pagina();
  await p.goto(`${BASE}?cena=${c}`);
  await waitMode(240000, 'cine');
  await p.waitForTimeout(2500);
  await medir('abertura ' + c, E);
  await ctx.close();
}
// jogo: quatro regiões, jogador andando em círculo
{
  const { ctx, p, E, waitMode } = await pagina();
  await p.goto(BASE + '?teste');
  await waitMode(240000, 'menu');
  await E(() => localStorage.clear());
  await E(() => document.querySelector('#menu [data-a=new]').click());
  await waitMode(60000, 'create');
  await p.fill('#create input', 'Teste');
  await E(() => document.querySelector('#create [data-a=go]').click());
  await waitMode(240000, 'play', 'dialogue');
  for (const reg of REGS) {
    if (reg !== 'atrio') { await E((r) => window.__game.travel(r, null), reg); await p.waitForTimeout(400); await waitMode(240000, 'play', 'dialogue'); }
    await p.waitForTimeout(2500);
    if (!CEL) await p.keyboard.down('KeyW');
    await medir('jogo ' + reg, E);
    if (!CEL) await p.keyboard.up('KeyW');
  }
  await ctx.close();
}
await b.close();
console.log('\n| Cena | fps | média ms | p95 ms | p99 ms | pior ms | >50 ms | chamadas | triângulos | qualidade |\n|---|---|---|---|---|---|---|---|---|---|');
for (const r of res) console.log(`| ${r.cena} | ${r.fps} | ${r.media_ms} | ${r.p95_ms} | ${r.p99_ms} | ${r.pior_ms} | ${r.acima50} | ${r.chamadas ?? ''} | ${r.tris ?? ''} | ${r.qualidade ?? ''} |`);
