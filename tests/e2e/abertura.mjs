/**
 * Abertura do Novo jogo (docs/game/ABERTURA.md) em navegador real: do menu até o jogo.
 * Uso: npm run build && npm run preview (em outro terminal) e depois npm run e2e:abertura.
 * O relógio da cena anda à mão (sem render), o trecho jogável anda sozinho (cine.auto) e o teste confere a ordem
 * dos planos, as falas com concordância, o pulo de bloco pela pausa e a entrega para o jogo.
 */
import { createRequire } from 'node:module';

let chromium;
try {
  ({ chromium } = createRequire(import.meta.url)('playwright'));
} catch {
  ({ chromium } = createRequire('/')('playwright'));
}
const BASE = process.env.E2E_URL ?? 'http://127.0.0.1:4173/';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const fails = [];
const fail = (m) => (fails.push(m), console.log('  ✗', m));
const ok = (cond, m) => (cond ? console.log('  ✓', m) : fail(m));

async function abrir(corpo) {
  const p = await b.newPage({ viewport: { width: 640, height: 360 } });
  p.on('pageerror', (e) => fail('erro de página: ' + e.message));
  const E = (fn, a) => p.evaluate(fn, a);
  const waitMode = async (m, ms = 240000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      if ((await E(() => window.__game?.mode)) === m) return;
      await p.waitForTimeout(250);
    }
    throw new Error(`tempo esgotado esperando o modo ${m}`);
  };
  await p.goto(BASE + '?teste&abertura');
  await waitMode('splash');
  await E(() => localStorage.clear());
  await p.keyboard.press('Enter');
  await waitMode('menu');
  await p.click('#menu [data-a=new]');
  await waitMode('create');
  if (corpo === 'masc') await p.click('#create [data-body=masc]').catch(() => E(() => {}));
  await p.fill('#create input', 'Teste');
  await p.click('#create [data-a=go]');
  await waitMode('cine', 120000);
  return { p, E, waitMode };
}

/** avança `s` segundos de cena sem desenhar */
const avancar = (E, s) =>
  E(async (s) => {
    const g = window.__game;
    const tick = g.tick;
    g.tick = () => {};
    try {
      for (let i = 0; i < s * 30 && g.cine; i++) {
        g.cine.update(1 / 30);
        if (i % 30 === 0) await new Promise((r) => setTimeout(r, 0));
      }
    } finally {
      delete g.tick;
    }
    return g.cine ? { marca: g.cine.marcaAtual, bloco: g.cine.blocoAtual, t: g.cine.t } : null;
  }, s);

try {
  console.log('Abertura inteira, corpo padrão');
  {
    const { p, E, waitMode } = await abrir('fem');
    await E(() => (window.__game.cine.auto = true));
    ok(await E(() => document.querySelector('#cine').classList.contains('lb')), 'letterbox no ar');
    ok(await E(() => document.querySelector('#cine [data-a=tudo]').hidden), 'primeira vez: só "pular esta parte"');
    let r = await avancar(E, 60);
    ok(r?.bloco === '1', 'bloco 1 em curso aos 60 s: ' + JSON.stringify(r));
    // até o fim, de minuto em minuto
    let ult = r;
    for (let k = 0; k < 60 && r; k++) {
      r = await avancar(E, 20);
      if (r) ult = r;
    }
    console.log('   ', JSON.stringify(ult));
    const min = ult.t / 60;
    ok(min > 9 && min < 14, `duração de ${min.toFixed(1)} min (plano: 11 a 13, com o trecho jogável rápido)`);
    await waitMode('play', 60000);
    ok((await E(() => window.__game.region.id)) === 'atrio', 'entrega para o jogo no Átrio');
    ok(await E(() => localStorage.getItem('interprete-rpg-abertura-vista') === '1'), 'abertura marcada como vista');
    ok((await E(() => window.__game.errors.length)) === 0, 'sem erros registrados');
    await p.close();
  }

  console.log('Ordem dos planos, falas e pulo de bloco');
  {
    const { p, E, waitMode } = await abrir('fem');
    const c = () => E(() => ({ log: window.__game.cine?.log ?? [] }));
    await E(() => (window.__game.cine.auto = true));
    await avancar(E, 30);
    // pausa e segura "Pular esta parte": vai para o bloco 2
    await E(() => window.__game.cine.pausar(true));
    ok(await E(() => document.querySelector('#cine .pausa').classList.contains('on')), 'pausa abre');
    await E(() => window.__game.cine.pular(false));
    let r = await avancar(E, 3);
    ok(r?.bloco === '2' && r.marca === '2.1', 'pular a febre leva à janela: ' + JSON.stringify(r));
    r = await avancar(E, 150);
    const { log } = await c();
    const marcas = log.map((l) => l.split(' ')[1]).filter((m) => /^\d\.\d$/.test(m));
    const ordem = ['2.1', '2.2', '2.3', '2.4'];
    ok(ordem.every((m, i) => marcas.indexOf(m) >= 0 && (i === 0 || marcas.indexOf(m) > marcas.indexOf(ordem[i - 1]))), 'janela em ordem: ' + marcas.join(','));
    ok(log.some((l) => l.includes('silhueta')), 'silhueta na luz');
    ok(log.some((l) => l.includes('Foi o unguento da doutora.')), 'falas da porta');
    ok(log.some((l) => l.includes('Eu vi minha filha levantar.')), 'concordância no feminino');
    // depois de ver uma vez, a pausa oferece pular a abertura inteira
    await E(() => window.__game.cine.pausar(true));
    await E(() => window.__game.cine.pular(true));
    await waitMode('play', 90000);
    ok(true, 'pular a abertura entrega o jogo');
    await p.close();
  }

  console.log('Entrada direta ?cena=3.5');
  {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    p.on('pageerror', (e) => fail('erro de página: ' + e.message));
    await p.goto(BASE + '?cena=3.5&corpo=masc');
    await p.waitForFunction(() => window.__game?.cine?.marcaAtual === '3.5', null, { timeout: 180000 });
    const E = (fn, a) => p.evaluate(fn, a);
    await avancar(E, 12);
    const log = await E(() => window.__game.cine?.log ?? []);
    ok(log.some((l) => l.includes('Ajuda! Pelo amor de Deus')), 'fala da Marta');
    await p.close();
  }
} catch (e) {
  fail(String(e?.stack ?? e));
}
await b.close();
console.log(fails.length ? `\n${fails.length} falha(s)` : '\nAbertura ok');
process.exit(fails.length ? 1 : 0);
