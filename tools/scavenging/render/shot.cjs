const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  for (const m of ['raw','ps2']) {
    const p = await b.newPage({ viewport: { width: 1280, height: 640 } });
    p.on('console', x => { if (x.type()==='error') console.log(m, 'ERR', x.text().slice(0,200)); });
    p.on('pageerror', e => console.log(m, 'PAGEERR', e.message.slice(0,300)));
    await p.goto('http://localhost:8765/index.html?m=' + m);
    await p.waitForFunction('window.__done===true', null, { timeout: 90000 }).catch(e => console.log(m, 'timeout'));
    await p.screenshot({ path: `kaykit-${m}.png` });
    await p.close();
  }
  await b.close();
})();
