/**
 * Mede o tremor do chão: congela o jogo no Pátio, anda a câmera em passos de 5 mm e compara quadros vizinhos
 * na faixa de baixo da tela (chão). Um chão estável muda pouco e de modo regular; tremor aparece como saltos.
 * Uso: build + vite preview na 4173; node tools/perf/tremor.mjs [saida.png]
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
let chromium;
try { ({ chromium } = createRequire(import.meta.url)('playwright')); } catch { ({ chromium } = createRequire('/')('playwright')); }
const URL0 = (process.env.E2E_URL ?? 'http://127.0.0.1:4173/') + '?teste';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 640, height: 360 } });
const E = (fn, a) => p.evaluate(fn, a);
const waitMode = async (m) => { for (;;) { if ((await E(() => window.__game?.mode).catch(() => null)) === m) return; await p.waitForTimeout(200); } };
if (process.env.SO) await p.addInitScript(() => { window.SO = 1; });
await p.goto(URL0);
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
await p.waitForTimeout(1500);
const regions = (process.env.REGIOES ?? 'atrio').split(',');
for (const reg of regions) {
  if (reg !== 'atrio') { await E((r) => __game.travel(r, null), reg); await p.waitForTimeout(400); await waitMode('play'); await p.waitForTimeout(1500); }
  const r = await E(async () => {
    const G = window.__game;
    G.tick = () => {};
    const eng = G.engine;
    eng.settings.reduceMotion = true; // sem grão animado nem tremor de câmera na medida
    eng.scene.traverse((o) => { if (o.material === eng.rainMat) o.visible = false; });
    const gl = eng.renderer.getContext();
    const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
    const buf = new Uint8Array(W * H * 4);
    const P = G.player.pos.clone();
    const cam = eng.camera;
    const grab = () => { gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, buf); return buf.slice(0, W * Math.floor(H * 0.35) * 4); }; // linhas de baixo (origem GL embaixo)
    const shot = (k, yaw) => {
      cam.position.set(P.x + 0.005 * k, P.y + 2.2, P.z + 4.5);
      cam.lookAt(P.x + 0.005 * k, P.y + 0.6, P.z - 2);
      eng.time = 10; // céu e névoa parados
      eng.render(0, P);
      return grab();
    };
    const series = () => {
      const d = [];
      let prev = shot(0);
      const again = shot(0);
      let st = 0; for (let i = 0; i < prev.length; i += 4) st += Math.abs(prev[i] - again[i]) + Math.abs(prev[i + 1] - again[i + 1]);
      for (let k = 1; k <= 24; k++) {
        const cur = shot(k);
        let s = 0, n = 0, x0 = W, x1 = 0, y0 = H, y1 = 0;
        for (let i = 0; i < cur.length; i += 4) { const dd = Math.abs(cur[i] - prev[i]) + Math.abs(cur[i + 1] - prev[i + 1]) + Math.abs(cur[i + 2] - prev[i + 2]); s += dd; if (dd > 60) { n++; const px = (i / 4) % W, py = Math.floor(i / 4 / W); x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py); } }
        d.push([Math.round((s / (cur.length / 4)) * 100) / 100, Math.round((n / (cur.length / 4)) * 1000) / 10, `${x0}-${x1}x${y0}-${y1}`]);
        prev = cur;
      }
      const mean = d.reduce((a, x) => a + x[0], 0) / d.length;
      const sd = Math.sqrt(d.reduce((a, x) => a + (x[0] - mean) ** 2, 0) / d.length);
      return { parado: st, media: Math.round(mean * 100) / 100, dp: Math.round(sd * 100) / 100, max: Math.max(...d.map((x) => x[0])), pctSalto: Math.max(...d.map((x) => x[1])), serie: d.map((x) => x[0]).join(' '), caixaPior: d.sort((a, b) => b[0] - a[0])[0][2], W, H };
    };
    const ps2 = eng.ps2;
    const out = { region: G.region.id, comSnap: series() };
    if (ps2 && !window.SO) { const v = ps2.snapRes.value.clone(); ps2.snapRes.value.set(1e7, 1e7); out.semSnap = series(); ps2.snapRes.value.copy(v); }
    if (!window.SO) { const sh = eng.sun.castShadow; eng.sun.castShadow = false; out.semSombra = series(); eng.sun.castShadow = sh; }
    return out;
  });
  console.log(JSON.stringify(r, null, 1));
}
await b.close();
