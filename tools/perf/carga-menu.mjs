/**
 * Carga em camadas e menu principal (docs/game/CARGA_E_MENU.md): tempo até o menu, preparo da região em segundo
 * plano, compilação das outras regiões, Novo jogo e Continuar, e programas de shader criados depois do menu.
 * Uso: build, `npx vite preview --port 4173`, depois `node tools/perf/carga-menu.mjs [url]`.
 * Variáveis: REDE=20 limita a banda (Mbit/s); CELULAR=1 emula um celular em pé; FOTOS=pasta grava capturas.
 * No SwiftShader os tempos de parede só servem para comparar versões; bytes e programas valem para qualquer máquina.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
let chromium, devices;
try { ({ chromium, devices } = createRequire(import.meta.url)('playwright')); } catch { ({ chromium, devices } = createRequire('/')('playwright')); }
const base = process.argv[2] ?? 'http://127.0.0.1:4173/';
const fotos = process.env.FOTOS;
if (fotos) fs.mkdirSync(fotos, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext(process.env.CELULAR ? { ...devices['Pixel 7'] } : { viewport: { width: 1280, height: 720 } });
const p = await ctx.newPage();
if (process.env.REDE) {
  const c = await ctx.newCDPSession(p);
  const bps = (Number(process.env.REDE) * 1e6) / 8;
  await c.send('Network.emulateNetworkConditions', { offline: false, latency: 40, downloadThroughput: bps, uploadThroughput: bps });
}
let bytes = 0, reqs = 0, phase = 'menu';
const porFase = {};
p.on('response', async (r) => { if (!r.url().startsWith('http')) return; try { const n = (await r.body()).length; porFase[phase] = (porFase[phase] ?? 0) + n; if (phase === 'menu') { bytes += n; reqs++; } } catch {} });
const erros = [];
p.on('pageerror', (e) => erros.push(String(e)));
const E = (fn, a) => p.evaluate(fn, a);
const until = async (fn, a, ms = 600000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await E(fn, a).catch(() => false)) return true; await p.waitForTimeout(50); } return false; };
const progs = () => E(() => __game.engine.renderer.info.programs.length);
const shot = async (n) => fotos && p.screenshot({ path: `${fotos}/${n}.png`, timeout: 180000 });

const t0 = Date.now();
await p.goto(base);
await p.waitForTimeout(250);
await shot('01-carga');
await until(() => window.__game?.mode === 'menu');
const menuMs = Date.now() - t0;
phase = 'preparo';
await p.waitForTimeout(500);
await shot('02-menu-sem-registro');
const antes = await progs();
await until(() => __game.prepProgress >= 1);
const preparoMs = Date.now() - t0 - menuMs;
const aposPreparo = await progs();
phase = 'aquecer';
await until(() => __game.warmed.size >= 4, undefined, 900000);
const aquecido = { ms: Date.now() - t0 - menuMs - preparoMs, programas: await progs(), regioes: await E(() => [...__game.warmed]) };
const timesPagina = await E(() => __game.bootTimes);
const bytesAteMenu = await E(() => { let n = 0, k = 0; for (const r of performance.getEntriesByType('resource')) if (r.responseEnd <= __game.bootTimes.menu) { n += r.encodedBodySize || r.transferSize || 0; k++; } return { MB: +(n / 1048576).toFixed(2), pedidos: k }; });

phase = 'novo';
const tn = Date.now();
await p.click('#menu [data-a=new]');
await until(() => __game.mode === 'create');
const criacaoMs = Date.now() - tn;
await p.waitForTimeout(600);
await shot('03-criacao');
await p.fill('#create input', 'Teste');
const tj = Date.now();
await p.click('#create [data-a=go]');
await until(() => __game.mode === 'play' || __game.mode === 'dialogue');
const jogoMs = Date.now() - tj;
const noJogo = await progs();

// troca de região: com tudo aquecido, nenhum programa novo deveria nascer
const viagens = {};
for (const r of ['bosque', 'arquivo', 'observatorio', 'atrio']) {
  const pr0 = await progs();
  const tr = Date.now();
  await E(async (r) => {
    const g = __game;
    await g.loadRegion(r, new Set(g.state.flags));
    g.spawnPlayer(Object.keys(g.region.spawns)[0]);
    await g.warmScene();
    g.engine.render(0.016, g.player.pos);
  }, r);
  viagens[r] = { ms: Date.now() - tr, programasNovos: (await progs()) - pr0 };
}

// voltar ao menu e continuar
await E(() => { __game.checkpoint(); });
phase = 'continuar';
await p.reload();
await until(() => window.__game?.mode === 'menu');
const menu2Ms = await E(() => __game.bootTimes.menu - __game.bootTimes.carga);
await p.waitForTimeout(300);
await shot('04-menu-com-registro');
const tc = Date.now();
const segPreparo = E(async () => { while (__game.prepProgress < 1) await new Promise((r) => setTimeout(r, 50)); return __game.bootTimes.preparado - __game.bootTimes.preparo; });
await p.click('#menu [data-a=continue]');
await until(() => __game.mode === 'play' || __game.mode === 'dialogue');
const continuarMs = Date.now() - tc;
await p.waitForTimeout(800);
await shot('05-jogo');

console.log(JSON.stringify({
  menu: { msPagina: timesPagina.menu, ...bytesAteMenu, programas: antes, marcos: timesPagina },
  preparo: { ms: preparoMs, programas: aposPreparo },
  aquecido,
  novoJogo: { ateCriacaoMs: criacaoMs, ateJogarMs: jogoMs, programasAoJogar: noJogo },
  viagens,
  segundaVisita: { menuMs: menu2Ms, preparoMs: await segPreparo.catch(() => null), continuarMs },
  MBporFase: Object.fromEntries(Object.entries(porFase).map(([k, v]) => [k, +(v / 1048576).toFixed(2)])),
  erros,
}, null, 1));
await b.close();
