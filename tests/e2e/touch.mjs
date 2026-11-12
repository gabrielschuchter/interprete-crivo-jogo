/**
 * Controles de toque em celular emulado (Chromium com toque real via CDP).
 * Uso: npm run dev (em outro terminal) e depois npm run e2e:touch
 * Cobre: joystick (parcial, corrida, histerese), olhar com o outro dedo, botões de ação,
 * conversa por toque, caderno, pausa e ausência de sobreposição dos botões em vários tamanhos.
 */
import { createRequire } from 'node:module';
let chromium;
try {
  ({ chromium } = createRequire(import.meta.url)('playwright'));
} catch {
  ({ chromium } = createRequire('/')('playwright'));
}
const URL0 = process.env.E2E_URL ?? 'http://127.0.0.1:5173/';
const SIZES = [[844, 390], [390, 844], [667, 375], [360, 640]];
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const fails = [];
const ok = (c, m) => (c ? console.log('  ✓', m) : (fails.push(m), console.log('  ✗', m)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function session(W, H, full) {
  console.log(`Toque ${W}x${H}`);
  const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  p.on('pageerror', (e) => ok(false, 'erro de página: ' + e.message));
  const E = (f, a) => p.evaluate(f, a);
  // espera em tempo de jogo, não de relógio: com a cena pesada o WebGL por software roda a poucos quadros por segundo
  // e o dt é limitado a 50 ms, então 1,5 s de relógio podem valer bem menos de 1,5 s de simulação
  const gsleep = async (ms) => {
    const t0 = await E(() => __game.state.playtime);
    for (let k = 0; k < 400; k++) {
      if ((await E(() => __game.state.playtime)) - t0 >= ms / 1000) return;
      await sleep(100);
    }
  };
  const mode = () => E(() => window.__game?.mode);
  const waitMode = async (m, ms = 240000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      if ((await mode()) === m) return;
      await sleep(250);
    }
    throw new Error('timeout esperando ' + m + ' (atual ' + (await mode()) + ')');
  };
  const send = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y, id]) => ({ x, y, id, radiusX: 8, radiusY: 8, force: 1 })) });
  const tap = async (x, y) => { await send('touchStart', [[x, y, 9]]); await sleep(60); await send('touchEnd', []); await sleep(150); };
  const tapEl = async (sel) => {
    await p.locator(sel).first().scrollIntoViewIfNeeded();
    const bb = await p.locator(sel).first().boundingBox();
    await tap(bb.x + bb.width / 2, bb.y + bb.height / 2);
  };
  await p.goto(URL0 + '?teste');
  await waitMode('splash');
  await E(() => localStorage.clear());
  await tap(W / 2, H / 2);
  await waitMode('menu');
  ok(true, 'tocar na abertura leva ao menu sem acionar botão sob o dedo');
  await sleep(700);
  await p.click('#menu [data-a=new]');
  await waitMode('create');
  await p.fill('#create input', 'Marina');
  await p.click('#create [data-a=go]');
  await waitMode('play');
  // a interface de toque aparece quando o modo de jogo assenta; com a cena pesada isso leva mais de 1,5 s no software
  await p.waitForFunction(() => document.getElementById('touch') && !document.getElementById('touch').classList.contains('hidden'), null, { timeout: 60000 }).catch(() => {});
  await sleep(500);
  ok(await E(() => document.body.classList.contains('touch') && !document.getElementById('touch').classList.contains('hidden')), 'controles de toque ativos e visíveis em jogo');

  // layout: sem sobreposição, tudo dentro da tela, alvos de pelo menos 34px
  const boxes = await E(() => [...document.querySelectorAll('#touch .t-btn')].map((e) => { const r = e.getBoundingClientRect(); return { id: e.dataset.b, x: r.x, y: r.y, w: r.width, h: r.height }; }));
  const bad = [];
  for (const q of boxes) {
    if (q.x < 0 || q.y < 0 || q.x + q.w > W + 0.5 || q.y + q.h > H + 0.5) bad.push('fora:' + q.id);
    if (q.w < 34 || q.h < 34) bad.push('pequeno:' + q.id);
  }
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) { const a = boxes[i], d = boxes[j]; if (a.x < d.x + d.w && d.x < a.x + a.w && a.y < d.y + d.h && d.y < a.y + a.h) bad.push(`${a.id}/${d.id}`); }
  ok(bad.length === 0, 'botões sem sobreposição e dentro da tela ' + bad.join(' '));
  const hudBad = await E(() => { const q = (s) => document.querySelector(s)?.getBoundingClientRect(); const o = q('#hud .objective'), t = q('#touch .t-top'), s = q('#hud .status'); const hit = (a, c) => a && c && a.x < c.x + c.width && c.x < a.x + a.width && a.y < c.y + c.height && c.y < a.y + a.height; return [hit(o, t) && 'objetivo/topo', hit(s, t) && 'status/topo', hit(o, s) && 'objetivo/status'].filter(Boolean); });
  ok(hudBad.length === 0, 'HUD do topo sem sobreposição ' + hudBad.join(' '));
  if (!full) return ctx.close();

  await E(fs0);
  const st = () => E(() => { const p = __game.player; return { v: p.speed, yaw: p.camYaw, run: __game.input.touchRun, mx: __game.input.touchMove.x, my: __game.input.touchMove.y }; });
  const sx = 110, sy = H - 110;
  await send('touchStart', [[sx, sy, 1]]);
  await send('touchMove', [[sx, sy - 30, 1]]);
  await gsleep(1500);
  let s = await st();
  ok(s.v > 1.5 && s.v < 3.2 && !s.run && s.my < -0.3 && s.my > -0.7, `joystick parcial anda sem correr (v ${s.v.toFixed(2)}, eixo ${s.my.toFixed(2)})`);
  const walk = s.v;
  await send('touchMove', [[sx, sy - 90, 1]]);
  await gsleep(1200);
  s = await st();
  ok(s.run && s.v > walk + 0.8, `empurrar até a borda corre (v ${s.v.toFixed(2)})`);
  await send('touchMove', [[sx, sy - 78, 1]]);
  await gsleep(900);
  ok(!(await st()).run, 'histerese: voltar ao meio desliga a corrida');
  const y0 = (await st()).yaw;
  await send('touchStart', [[sx, sy - 78, 1], [W * 0.7, H * 0.4, 2]]);
  await send('touchMove', [[sx, sy - 78, 1], [W * 0.7 + 100, H * 0.4, 2]]);
  await gsleep(800);
  s = await st();
  ok(Math.abs(s.yaw - y0 + 0.46) < 0.12 && s.v > 1, `arrasto de 100px gira ~0,46 rad com o outro dedo andando (Δ ${(s.yaw - y0).toFixed(2)})`);
  await send('touchEnd', []);
  await gsleep(900);
  s = await st();
  ok(s.v < 0.3 && s.mx === 0 && s.my === 0, 'soltar o joystick para o personagem');

  const btn = async (id) => { await p.locator(`#touch [data-b=${id}]`).waitFor({ state: 'visible', timeout: 20000 }); const bb = await p.locator(`#touch [data-b=${id}]`).boundingBox(); await tap(bb.x + bb.width / 2, bb.y + bb.height / 2); };
  await E(() => { __game.state.hp = 60; __game.player.vigor = 100; __game.state.inventory.caldo = 2; });
  await btn('ataque'); await sleep(200);
  ok(await E(() => __game.player.fig.action.startsWith('attack')), 'botão Golpe ataca');
  await sleep(800); await E(() => { __game.player.vigor = 100; });
  await btn('esquiva'); await sleep(150);
  ok(await E(() => __game.player.fig.action === 'dodge'), 'botão Esquiva esquiva');
  await sleep(900);
  await btn('crivo'); await sleep(300);
  ok(await E(() => __game.abilityCd > 0), 'botão Pulso aciona o Crivo');
  await btn('item'); await sleep(300);
  ok(await E(() => __game.state.hp > 60 && __game.state.inventory.caldo === 1), 'botão Item toma o caldo');

  // conversa real (sem modo de teste), avançando só por toque
  await E(() => { __game.ui.instant = false; const g = __game; const n = g.npcs.find((x) => x.def.id === 'anselmo'); g.player.teleport(n.pos.x + Math.sin(n.yaw) * 1.4, n.pos.y, n.pos.z + Math.cos(n.yaw) * 1.4, n.yaw + Math.PI); });
  await sleep(2000);
  ok((await E(() => document.querySelector('#touch [data-b=interagir] .l').textContent)) === 'Falar', 'botão de interação mostra o verbo do alvo');
  await btn('interagir'); await sleep(900);
  ok((await mode()) === 'dialogue', 'Interagir abre a conversa');
  for (let i = 0; i < 14 && (await mode()) === 'dialogue'; i++) {
    if (await p.locator('#dialogue .choices button').count()) await tapEl('#dialogue .choices button');
    else { const d = await p.locator('#dialogue').boundingBox(); await tap(d.x + d.width / 2, d.y + 20); }
    await sleep(300);
  }
  ok((await mode()) === 'play', 'tocar no diálogo avança até o fim e devolve o jogo');

  await btn('caderno'); await sleep(500);
  ok((await mode()) === 'book', 'botão Caderno abre o caderno');
  await tapEl('#book nav [data-tab=mapa]'); await sleep(300);
  ok((await E(() => __game.ui.bookTab)) === 'mapa', 'aba por toque');
  await tapEl('#book nav [data-a=close]'); await sleep(400);
  ok((await mode()) === 'play', 'fechar o caderno por toque');
  await btn('pausa'); await sleep(400);
  ok((await mode()) === 'pause', 'botão Pausa pausa');
  await tapEl('#pause [data-a=resume]'); await sleep(400);
  ok((await mode()) === 'play', 'Continuar retoma o jogo');
  ok((await E(() => __game.errors)).length === 0, 'nenhum erro de execução');
  await ctx.close();
}
const fs0 = await (await import('node:fs/promises')).readFile(new URL('./page-helpers.js', import.meta.url), 'utf8');
try {
  for (const [i, [w, h]] of SIZES.entries()) await session(w, h, i === 0);
} catch (e) {
  ok(false, String(e?.message ?? e));
}
await b.close();
console.log(fails.length ? `\n${fails.length} falha(s)` : '\nToque completo sem falhas');
process.exit(fails.length ? 1 : 0);
