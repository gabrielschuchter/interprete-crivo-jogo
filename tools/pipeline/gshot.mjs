import { createRequire } from 'node:module';
const { chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright');
// uso: node gshot.mjs out region "px,py,pz,tx,ty,tz" ...
const [,, out, region, ...views] = process.argv;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
p.on('console', m => m.type()==='error' && console.log('ERR', m.text().slice(0,300)));
p.on('pageerror', e => console.log('PAGEERR', String(e).slice(0,300)));
const t0 = Date.now();
await p.goto('http://127.0.0.1:5173/?teste');
await p.waitForFunction(() => window.__game && window.__game.mode === 'splash', null, { timeout: 300000 });
console.log('boot s', (Date.now()-t0)/1000);
await p.evaluate(async (region) => {
  const g = window.__game;
  document.getElementById('ui').style.display = 'none';
  g.updateTitle = () => { const c = window.CAM; if (c) { g.engine.camera.position.set(c[0], c[1], c[2]); g.engine.camera.lookAt(c[3], c[4], c[5]); g.focus.set(c[3], c[4], c[5]); } };
  if (region !== 'atrio') await g.loadRegion(region, new Set());
  g.frame = () => {};
}, region);
await p.waitForTimeout(500);
let i = 0;
for (const v of views) {
  const ms = await p.evaluate((v) => { window.CAM = v.split(',').map(Number); const g = window.__game; const t = performance.now(); for (let k = 0; k < 3; k++) g.tick(0.03); return performance.now() - t; }, v);
  console.log('render ms', Math.round(ms / 3));
  await p.screenshot({ path: `${out}-${i++}.jpg`, quality: 82, timeout: 120000 });
}
const errs = await p.evaluate(() => window.__game.errors);
if (errs.length) console.log('GAMEERR', errs.join('\n').slice(0, 800));
await b.close();
