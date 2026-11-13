// Captura a prancha de um GLB: node tools/chars/shot.mjs <saida.png> "<query da prancha>" [porta]
import { createRequire } from 'node:module';
import fs from 'node:fs';
const { chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright');
const [,, out, qs, port = '5173'] = process.argv;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1800, height: 1000 } });
p.on('console', (m) => m.type() === 'error' && console.log('ERR', m.text().slice(0, 300)));
p.on('pageerror', (e) => console.log('PAGEERR', String(e).slice(0, 300)));
const t0 = Date.now();
await p.goto(`http://127.0.0.1:${port}/prancha.html?${qs}`);
await p.waitForFunction(() => window.pronto, null, { timeout: 240000 });
const info = await p.evaluate(() => window.info);
const data = await p.evaluate(() => document.querySelector('canvas:last-of-type').toDataURL('image/png'));
fs.writeFileSync(out, Buffer.from(data.split(',')[1], 'base64'));
console.log(JSON.stringify({ ...info, ms: Date.now() - t0 }));
await b.close();
