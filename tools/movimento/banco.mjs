/**
 * Banco de captura de movimento: roda cenas curtas com a câmera real de gameplay e grava tiras de quadros
 * (um quadro a cada N passos de simulação) em docs/game/capturas/movimento/<nome>_<rotulo>.jpg.
 * Uso: npm run build && npx vite preview --port 4173, depois
 *   node tools/movimento/banco.mjs [cena ...]   (sem argumento: todas)
 * Variáveis: E2E_URL (padrão http://127.0.0.1:4173/), ROTULO (padrão "depois").
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
let chromium;
try {
  ({ chromium } = createRequire(import.meta.url)('playwright'));
} catch {
  ({ chromium } = createRequire('/')('playwright'));
}
const URL0 = (process.env.E2E_URL ?? 'http://127.0.0.1:4173/') + '?teste';
const ROT = process.env.ROTULO ?? 'depois';
const out = path.join(root, 'docs/game/capturas/movimento');
const tmp = path.join(root, 'tests/e2e/out/movimento');
fs.mkdirSync(out, { recursive: true });
fs.mkdirSync(tmp, { recursive: true });
const want = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 480, height: 300 } });
p.on('pageerror', (e) => console.log('  erro de página:', e.message));
p.on('console', (m) => m.type() === 'error' && console.log('  console:', m.text().slice(0, 300)));
const E = (fn, a) => p.evaluate(fn, a);
const waitMode = async (m, ms = 240000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if ((await E(() => window.__game?.mode)) === m) return;
    await p.waitForTimeout(250);
  }
  throw new Error('tempo esgotado esperando ' + m);
};

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
await E(fs.readFileSync(path.join(root, 'tests/e2e/page-helpers.js'), 'utf8'));
// filme: simula `sec` segundos a 30 quadros por segundo e guarda um quadro a cada `every` passos
await E(() => {
  window.FILM = async (sec, every, fn, cam) => {
    const g = __game;
    const tick = g.tick;
    const render = g.engine.render.bind(g.engine);
    g.engine.render = () => {};
    g.tick = () => {};
    const frames = [];
    const n = Math.round(sec * 30);
    try {
      for (let i = 0; i < n; i++) {
        if (fn && fn(i) === false) break;
        tick.call(g, 1 / 30);
        g.input.endFrame();
        if (i % every === every - 1) {
          if (cam) cam(g.engine.camera);
          render(1 / 30, g.player ? g.player.pos : new (__game.player.pos.constructor)());
          frames.push(g.engine.renderer.domElement.toDataURL('image/jpeg', 0.85));
        }
        if (i % 6 === 0) await new Promise((r) => setTimeout(r, 0));
      }
    } finally {
      delete g.tick;
      delete g.engine.render;
    }
    return frames;
  };
});
const strip = (name, frames, cols = 6) => {
  const files = frames.map((d, i) => {
    const f = path.join(tmp, `${name}_${i}.jpg`);
    fs.writeFileSync(f, Buffer.from(d.split(',')[1], 'base64'));
    return f;
  });
  const dest = path.join(out, `${name}_${ROT}.jpg`);
  execFileSync('python3', ['-I', path.join(here, 'tira.py'), dest, String(cols), ...files]);
  console.log('  ->', path.relative(root, dest), `(${frames.length} quadros)`);
};
const travel = async (to, spawn) => {
  await E(([to, spawn]) => __game.travel(to, spawn), [to, spawn]);
  await p.waitForTimeout(400);
  await waitMode('play');
};
const clearEnemies = () => E(() => { const g = __game; for (const e of g.enemies) g.engine.scene.remove(e.root); g.enemies = []; g.projectiles.length = 0; });

const CENAS = {
  // sonda: pés e quadril do jogador parado, sem imagem (pé acima de 0,1 m no idle indica pose quebrada)
  async sonda() {
    const r = await E(async () => {
      const g = __game; const p = g.player;
      p.teleport(0, 0, 10, Math.PI);
      p.frozen = true;
      const V = p.pos.constructor;
      const w = (n) => { const v = new V(); p.fig.root.getObjectByName(n).getWorldPosition(v); return [+v.x.toFixed(2), +v.y.toFixed(2), +v.z.toFixed(2)]; };
      const rows = [];
      for (let k = 0; k < 8; k++) {
        await T.sim(0.37);
        rows.push({ t: k, act: p.fig.action, hips: w('Hips'), lf: w('LeftFoot'), rf: w('RightFoot') });
      }
      p.frozen = false;
      return rows;
    });
    for (const x of r) console.log(JSON.stringify(x));
  },
  // mãos de perto: punho na espada e na tocha
  async maos() {
    await clearEnemies();
    const fr = await E(async () => {
      const g = __game; const p = g.player;
      p.teleport(0, 0, 8, 0);
      await T.sim(0.6);
      const V = p.pos.constructor;
      const at = (name, off) => (c) => {
        const b = p.fig.root.getObjectByName(name); const v = new V(); b.getWorldPosition(v);
        c.position.set(v.x + off[0], v.y + off[1], v.z + off[2]); c.lookAt(v);
      };
      const out = [];
      for (const off of [[0.05, 0.08, 0.45], [-0.4, 0.1, 0.1]]) out.push(...(await FILM(0.1, 3, null, at('RightHand', off))));
      for (const off of [[0.05, 0.08, 0.45], [0.4, 0.1, 0.1]]) out.push(...(await FILM(0.1, 3, null, at('LeftHand', off))));
      g.input.inject('ataque');
      out.push(...(await FILM(0.45, 4, null, at('Spine1', [0.2, 0.3, 2.2]))));
      p.fig.gripTest = null;
      return out;
    });
    strip('maos', fr, 6);
  },
  // protagonista anda e corre de lado para a câmera: passada, pés, tocha e espada
  async locomocao() {
    await clearEnemies();
    const fr = await E(async () => {
      const g = __game; const p = g.player; const I = g.input;
      p.teleport(-6, 0, 8, Math.PI / 2);
      p.camYaw = 0; p.camPitch = 0.1;
      await T.sim(0.6);
      const a = await FILM(1.2, 3, () => { I.hold('KeyD', true); p.camYaw = 0; });
      const b = await FILM(1.0, 3, () => { I.hold('ShiftLeft', true); p.camYaw = 0; });
      I.hold('KeyD', false); I.hold('ShiftLeft', false);
      const c = await FILM(1.0, 3, () => { p.camYaw = 0; });
      return [...a, ...b, ...c];
    });
    strip('locomocao', fr, 8);
  },
  // golpes do protagonista vistos de lado e de trás
  async golpes() {
    await clearEnemies();
    const fr = await E(async () => {
      const g = __game; const p = g.player; const I = g.input;
      p.teleport(0, 0, 8, Math.PI / 2);
      p.camYaw = 0; p.camPitch = 0.12;
      await T.sim(0.5);
      let out = [];
      for (const act of ['ataque', 'ataque', 'golpe', 'esquiva']) {
        I.inject(act);
        out = out.concat(await FILM(act === 'golpe' ? 0.9 : 0.55, 2, () => { p.camYaw = 0; }));
      }
      return out;
    });
    strip('golpes', fr, 8);
  },
  // conversa com moradores: quem fala, quem escuta
  async conversa() {
    await clearEnemies();
    const fr = await E(async () => {
      const g = __game; const p = g.player;
      const n = g.npcs.find((x) => x.def.id === 'vera') ?? g.npcs[0];
      p.teleport(n.pos.x + Math.sin(n.yaw) * 1.8, n.pos.y, n.pos.z + Math.cos(n.yaw) * 1.8, n.yaw + Math.PI);
      p.camYaw = n.yaw + 0.5; p.camPitch = 0.1;
      await T.sim(1.0);
      const a = await FILM(1.2, 4, () => { p.camYaw = n.yaw + 0.5; });
      n.talking = true;
      const b = await FILM(3.0, 6, () => { p.camYaw = n.yaw + 0.5; });
      n.talking = false;
      return [...a, ...b];
    });
    strip('conversa', fr, 8);
  },
  // conversa real: o jogador fala com o morador mais próximo pelo próprio jogo; a câmera vai para trás do ombro
  async dialogo() {
    await clearEnemies();
    const fr = await E(async () => {
      const g = __game; const p = g.player;
      const n = g.npcs.filter((x) => x.fig.external)[0] ?? g.npcs[0];
      p.teleport(n.pos.x + Math.sin(n.yaw) * 2.2, n.pos.y, n.pos.z + Math.cos(n.yaw) * 2.2, n.yaw + Math.PI);
      p.camYaw = n.yaw + 1.6; p.camPitch = 0.22;
      await T.sim(1.0);
      const a = await FILM(0.4, 4);
      // no modo de teste a fala corre instantânea; uma cena que espera mantém a conversa aberta durante o filme
      let solta;
      p.faceTo = Math.atan2(n.pos.x - p.pos.x, n.pos.z - p.pos.z);
      g.runScript(() => new Promise((r) => { solta = r; n.speaking = true; }), n);
      const b = await FILM(3.6, 6);

      n.speaking = false;
      solta();
      await new Promise((r) => setTimeout(r, 0));
      const c = await FILM(1.2, 6);
      return [...a, ...b, ...c];
    });
    strip('dialogo', fr, 8);
  },
  // cada morador parado, na distância de jogo, um quadro por segundo
  async moradores() {
    await clearEnemies();
    const all = [];
    for (const [reg, spawn] of [['atrio', null], ['arquivo', 'de_atrio'], ['bosque', 'de_atrio'], ['observatorio', 'de_atrio']]) {
      if (spawn) await travel(reg, spawn);
      const fr = await E(async () => {
        const g = __game; const p = g.player; const out = [];
        for (const n of g.npcs.filter((x) => x.fig.external)) {
          p.teleport(n.pos.x + Math.sin(n.yaw) * 3.6, n.pos.y, n.pos.z + Math.cos(n.yaw) * 3.6, n.yaw + Math.PI);
          p.camYaw = n.yaw; p.camPitch = 0.14;
          await T.sim(0.8);
          out.push(...(await FILM(2.0, 20, () => { p.camYaw = n.yaw; })));
        }
        return out;
      });
      all.push(...fr);
    }
    await travel('atrio', 'de_observatorio').catch(() => travel('atrio', 'de_bosque'));
    strip('moradores', all, 8);
  },
};
// inimigos: ataque visto de trás do jogador, que fica parado e invulnerável
for (const kind of ['erudito', 'errante', 'suplicante', 'vulto', 'duelista', 'carcereiro', 'matriarca', 'eco', 'veredito']) {
  CENAS['inimigo_' + kind] = async () => {
    await clearEnemies();
    const fr = await E(async (kind) => {
      const g = __game; const p = g.player; const s = g.state;
      p.teleport(0, 0, 10, Math.PI);
      const e = g.spawnEnemy(kind, 0.6, 10 - (kind === 'veredito' ? 4.6 : kind === 'eco' ? 3.6 : 2.6), 'filme');
      for (let i = 0; i < 80 && !e.body; i++) await new Promise((r) => setTimeout(r, 250));
      e.aggro = true;
      p.camYaw = 0.35; p.camPitch = 0.12;
      p.frozen = true;
      await T.sim(0.3, () => { p.iframes = 9; });
      // espera o primeiro aviso
      await T.sim(6, () => { p.iframes = 9; s.hp = 100; p.camYaw = 0.35; return e.state !== 'windup' && e.state !== 'ring' && e.state !== 'cast'; });
      const out = await FILM(2.4, 2, () => { p.iframes = 9; s.hp = 100; p.camYaw = 0.35; });
      // reação a impacto
      const hit = await FILM(0.6, 2, (i) => { p.iframes = 9; if (i === 0) e.damage(5, false, false); p.camYaw = 0.35; });
      p.frozen = false;
      return [...out, ...hit];
    }, kind);
    strip('inimigo_' + kind, fr, 9);
  };
}
for (const [k, fn] of Object.entries(CENAS)) {
  if (want.length && !want.includes(k)) continue;
  console.log('cena', k);
  try {
    await fn();
  } catch (e) {
    console.log('  falhou:', String(e).slice(0, 300));
  }
}
await b.close();
