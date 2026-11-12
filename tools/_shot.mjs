import { createRequire } from 'node:module';
const { chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright');
const [,, out, ...qs] = process.argv;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 640, height: 720 } });
p.on('console', m => m.type()==='error' && console.log('ERR', m.text()));
let i = 0;
for (const q of qs) {
  await p.goto('http://127.0.0.1:5173/visor.html?' + q);
  await p.waitForFunction(() => window.pronto, null, { timeout: 120000 });
  await p.waitForTimeout(800);
  console.log(await p.textContent('#i'));
  await p.screenshot({ path: `${out}-${i++}.jpg`, quality: 80 });
}
await b.close();
