/**
 * Captura quadros comparativos das predefinições de arte (?arte=off|a|b|c|ps2).
 * Uso: npm run dev (outro terminal) e node tools/ps2/capturar.mjs [saida] [predefinicoes separadas por vírgula]
 * Renderização por software (SwiftShader): serve para comparar linguagem, não desempenho.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

let chromium;
try {
  ({ chromium } = createRequire(import.meta.url)('playwright'));
} catch {
  ({ chromium } = createRequire('/')('playwright'));
}
const base = process.env.E2E_URL ?? 'http://127.0.0.1:5173/';
const saida = process.argv[2] ?? 'docs/game/capturas/ps2';
const presets = (process.argv[3] ?? 'off,a,b,c,ps2').split(',');
const completo = process.argv[4] === 'completo'; // com menus, inventário e Arquivo; sem isso, só Átrio, Bosque e Observatório
fs.mkdirSync(saida, { recursive: true });

const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const arte of presets) {
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  p.on('pageerror', (e) => console.log('  erro de página:', e.message));
  const E = (fn, a) => p.evaluate(fn, a);
  const mode = () => E(() => window.__game?.mode);
  const waitMode = async (m, ms = 120000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      if ((await mode()) === m) return;
      await p.waitForTimeout(250);
    }
    throw new Error('tempo esgotado: ' + m);
  };
  const shot = async (nome) => {
    await p.waitForTimeout(1800);
    await p.screenshot({ path: path.join(saida, `${arte}-${nome}.jpg`), type: 'jpeg', quality: 86, timeout: 180000 });
    console.log('  ok', `${arte}-${nome}`);
  };
  console.log('predefinição', arte);
  await p.goto(`${base}?teste&arte=${arte}`);
  await waitMode('splash');
  await E(() => localStorage.clear());
  if (completo) await shot('00-abertura');
  await p.keyboard.press('Enter');
  await waitMode('menu');
  if (completo) await shot('01-menu');
  await p.click('#menu [data-a=new]');
  await waitMode('create');
  await p.click('#create [data-prof=enfermagem]');
  await p.fill('#create input', 'Marina');
  await p.click('#create [data-a=go]');
  await waitMode('play');
  await E(() => __game.player.teleport(0, 0, 6, 3.14));
  await shot('10-atrio');
  if (completo) {
    await E(() => __game.input.inject('inventario'));
    await p.waitForTimeout(600);
    await shot('20-inventario');
    await E(() => __game.input.inject('inventario'));
    await p.waitForTimeout(600);
  }
  if (process.env.SO_ATRIO) { await p.close(); continue; } // comparação rápida: só o Átrio
  for (const [reg, spawn, nome] of [['bosque', 'de_atrio', '30-bosque'], ['arquivo', 'de_atrio', '40-arquivo'], ['observatorio', 'de_atrio', '50-observatorio']]) {
    if (!completo && nome === '40-arquivo') continue;
    await E(([r, s]) => __game.travel(r, s), [reg, spawn]);
    await p.waitForTimeout(600);
    await waitMode('play');
    await shot(nome);
  }
  await p.close();
}
await b.close();
