/**
 * Campanha de ponta a ponta em navegador real (Chromium, WebGL por software).
 * Uso: npm run dev (em outro terminal) e depois npm run e2e.
 * URL alternativa: E2E_URL=http://127.0.0.1:4173/ npm run e2e
 * O modo ?teste resolve diálogos sem espera; lutas usam um jogador automático
 * simples (page-helpers.js) sobre as mesmas entradas do jogador humano.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
let chromium;
try {
  ({ chromium } = createRequire(import.meta.url)('playwright'));
} catch {
  ({ chromium } = createRequire('/')('playwright'));
}
const URL0 = (process.env.E2E_URL ?? 'http://127.0.0.1:5173/') + '?teste';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 640, height: 360 } });
p.on('pageerror', (e) => fail('erro de página: ' + e.message));
const fails = [];
const fail = (m) => (fails.push(m), console.log('  ✗', m));
const ok = (cond, m) => (cond ? console.log('  ✓', m) : fail(m));
const E = (fn, a) => p.evaluate(fn, a);
const mode = () => E(() => window.__game?.mode);
const waitMode = async (m, ms = 240000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if ((await mode()) === m) return;
    await p.waitForTimeout(250);
  }
  throw new Error(`tempo esgotado esperando o modo ${m} (atual: ${await mode()})`);
};
const travel = async (to, spawn) => {
  await E(([to, spawn]) => __game.travel(to, spawn), [to, spawn]);
  await p.waitForTimeout(400);
  await waitMode('play');
};
const step = (q) => E((q) => { const s = __game.state.quests[q]; return s ? (s.status === 'concluida' ? 'ok' : s.step) : -1; }, q);
const fight = async (group, tries = 8) => {
  for (let k = 0; k < tries; k++) {
    const r = await E((g) => T.fight(g, 150), group);
    if (r.restam && !r.mortes) {
      // o jogador automático não contorna estantes: recoloca ao lado do inimigo mais próximo
      await E((g) => { const G = __game; const e = G.enemies.filter((x) => x.alive && x.group === g).sort((a, b) => a.pos.distanceTo(G.player.pos) - b.pos.distanceTo(G.player.pos))[0]; if (e) G.player.teleport(e.pos.x, e.pos.y, e.pos.z + 1.8 + e.radius, Math.PI); }, group);
      continue;
    }
    if (r.mortes || r.restam) console.log('   luta', JSON.stringify(r));
    if (!r.mortes && !r.restam) return r;
    if (r.mortes) {
      await p.waitForTimeout(200);
      await E(() => __game.respawn());
      await waitMode('play');
      await E(() => { __game.state.inventory.caldo = 2; });
      if (group === 'veredito') await E(() => __game.player.teleport(0, 0, -12, 3.14));
    }
  }
  fail('luta não vencida: ' + group);
};

try {
  console.log('Abertura');
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
  await E(fs.readFileSync(path.join(here, 'page-helpers.js'), 'utf8'));
  ok((await step('chegada')) === 0, 'a abertura inicia a chegada ao Pátio');

  console.log('Pátio e Bosque');
  await E(async () => { await T.talk('heloisa'); await T.talk('iris'); });
  // no SwiftShader o laço de quadros anda devagar: um quadro forçado tira o retrato pedido na conversa
  await E(() => __game.engine.render(0.016, __game.focus));
  ok(await E(() => { const c = __game.portraits.get('heloisa'); return c instanceof HTMLCanvasElement && c.width === 48; }), 'a primeira fala de Heloísa gera o retrato de busto a partir da figura 3D');
  ok(await E(() => { const c = __game.portraits.get('heloisa'); const d = c.getContext('2d').getImageData(0, 0, 48, 48).data; let v = 0; for (let i = 0; i < d.length; i += 4) v += d[i] + d[i + 1] + d[i + 2]; return v / (48 * 48 * 3) > 18; }), 'o retrato não sai preto');
  ok((await step('ponte')) === 1, 'Heloísa e Íris abrem a missão da ponte');
  await travel('bosque', 'de_atrio');
  await E(() => __game.player.teleport(-27, 0, 2, 1.57));
  await fight('trilha');
  await E(() => __game.player.teleport(-5, 0, -11, 3.14));
  await fight('clareira');
  await E(() => T.use('bau_selo'));
  ok((await step('ponte')) === 4, 'o baú da clareira entrega o Selo do Contexto');
  await E(() => T.use('mec_a', 0));
  ok(await E(() => __game.state.inventory.selo_contexto === 1), 'mecanismo errado devolve o selo, sem punição definitiva');
  await fight('ruido');
  await E(async () => { await T.use('mec_b', 0); await T.sim(7); });
  ok(await E(() => __game.region.platforms.some((x) => x.tag === 'ponte')), 'o mecanismo do passo estende a ponte');
  await E(() => __game.player.teleport(41, 0, 0, 1.57));
  await fight('margem');
  ok(await E(() => !__game.enemies.some((e) => e.alive && e.group === 'margem')), 'margem limpa antes do marco');
  // Interagir apertado no meio de um golpe fica guardado, e quem sai da narração com Esc logo na primeira
  // fala não deixa a missão presa no marco
  const busy = await E(async () => {
    const g = __game; const say = g.say; const x = g.prop('marco');
    g.say = async function (w, t) { g.say = say; this.cancelScript(); return say.call(this, w, t); };
    try {
      g.player.teleport(x.pos.x - 1.2, x.pos.y, x.pos.z, Math.PI / 2);
      await T.sim(1.7);
      g.input.inject('ataque'); await T.sim(0.1);
      const b = g.player.fig.busy;
      g.input.inject('interagir'); await T.sim(1.2); await T.settle();
      return b;
    } finally { g.say = say; }
  });
  ok(busy, 'o golpe estava em curso quando Interagir foi apertado');
  ok((await E(() => __game.state.flags.includes('ponte_aberta'))) && (await step('ponte')) === 6, 'o marco aceso fecha a travessia mesmo com a narração encerrada no Esc');
  ok((await E(() => __game.mode)) === 'play', 'sair da narração do marco devolve o controle');
  await E(async () => { await T.use('caixa_dalva'); await T.use('pagina_4'); });

  console.log('Pátio, paralelas e caso simulado');
  await travel('atrio', 'de_bosque');
  await E(async () => { await T.talk('iris'); await T.talk('dalva', 1); });
  ok((await step('ponte')) === 'ok' && (await step('encomenda')) === 'ok', 'ponte e encomenda concluídas');
  const xpBefore = await E(() => __game.state.xp);
  await E(async () => {
    const g = __game;
    const n = g.npcs.find((x) => x.def.id === 'lia');
    g.player.teleport(n.pos.x + Math.sin(n.yaw) * 1.4, 0, n.pos.z + Math.cos(n.yaw) * 1.4, n.yaw + Math.PI);
    await T.sim(1.5); g.autoChoice = 0; g.input.inject('interagir'); await T.sim(0.3); await T.settle(); g.autoChoice = undefined;
    for (const s of ['preferencias', 'evidencia', 'danos', 'custo']) g.ui.caseView.act(s);
    g.ui.caseView.decide('exercicios'); g.ui.caseView.close(); await T.settle();
  });
  ok((await step('lia')) === 'ok' && (await E(() => __game.state.cases.length)) === 1, 'caso de Lia decidido e registrado');
  const xpCase = (await E(() => __game.state.xp)) - xpBefore;
  await E(async () => {
    const g = __game;
    const n = g.npcs.find((x) => x.def.id === 'lia');
    g.player.teleport(n.pos.x + Math.sin(n.yaw) * 1.4, 0, n.pos.z + Math.cos(n.yaw) * 1.4, n.yaw + Math.PI);
    await T.sim(1.5); g.autoChoice = 0; g.input.inject('interagir'); await T.sim(0.3); await T.settle(); g.autoChoice = undefined;
    g.ui.caseView.decide('tintura'); g.ui.caseView.close(); await T.settle();
  });
  ok((await E(() => __game.state.xp)) - xpBefore === xpCase, 'refazer o caso não paga experiência de novo');
  await E(async () => { await T.talk('noemia'); await T.talk('tome'); await T.use('vento_terraco'); await T.use('vento_beco'); await T.talk('noemia'); });
  ok((await step('vento')) === 'ok' && (await E(() => __game.state.inventory.lupa_contexto === 1)), 'duas versões do vento resolvida, lupa recebida');
  await E(async () => { for (const id of ['pagina_1', 'pagina_2', 'pagina_3']) await T.use(id); });
  const coins = await E(() => { const g = __game; g.state.coins = 100; g.buyItem('ponteira_latao'); return g.state.coins; });
  ok(coins === 40, 'compra na banca com o desconto de Dalva (75 → 60)');

  console.log('Arquivo');
  await E(() => T.talk('anselmo'));
  ok(await E(() => __game.state.crivoSkills.includes('lupa')), 'Anselmo ensina a Lupa curiosa ao Crivo');
  await travel('arquivo', 'de_atrio');
  await fight('estantes');
  ok(await E(() => !__game.propVisible(__game.prop('ficha_a'))), 'fichas ficam ocultas sem a lupa');
  await E(async () => {
    const g = __game; g.state.crivoActive = 'lupa';
    for (const [id, x, z] of [['a', -8, 8], ['b', 8, 2], ['c', -6, -12]]) { g.player.teleport(x, 0, z, 0); g.abilityCd = 0; g.input.inject('crivo'); await T.sim(0.3); await T.use('ficha_' + id); }
  });
  ok((await step('arquivo')) === 3, 'a lupa revela as três fichas');
  await E(() => T.use('alavanca_c', 0, 0, 0.6));
  await fight('ruido');
  await E(async () => { await T.use('alavanca_b', 0, 0, 0.6); await T.sim(3); });
  ok((await step('arquivo')) === 4, 'a alavanca do registro original abre a sala');
  await E(async () => { __game.player.teleport(0, 0, -21, 3.14); await T.sim(2); });
  ok(await E(() => __game.enemies.some((e) => e.alive && e.group === 'eco')), 'o Eco aguarda na sala dos originais');
  await fight('eco');
  await E(async () => { await T.use('bau_lanterna', undefined, 0, 1.4); await T.use('pagina_5'); });
  ok(await E(() => __game.state.inventory.lanterna_transparencia === 1), 'a lanterna sai do baú dos originais');
  await travel('atrio', 'de_arquivo');
  await E(async () => { await T.talk('anselmo'); await T.talk('heloisa'); });
  ok((await step('arquivo')) === 'ok' && (await step('veredito')) === 1, 'Arquivo concluído, Veredito iniciado');

  console.log('Mestres, obras e conversas de ofício');
  await travel('atrio', 'inicio');
  await E(async () => { __game.wasLocked = true; await __game.runScript(async () => {}); await T.sim(0.5); });
  ok((await mode()) === 'play', 'terminar uma conversa não abre a pausa (ponteiro solto de propósito)');
  await E(async () => { for (const id of ['lind', 'nightingale', 'semmelweis', 'fisher', 'hill', 'cochrane', 'sackett', 'altman']) await T.use('mestre_' + id, undefined, 0, 1.6); });
  ok((await step('mestres')) === 'ok' && (await E(() => __game.state.inventory.anel_duplo_cego === 1)), 'oito bustos lidos: Passeio dos Mestres concluído, anel recebido');
  await E(async () => { await T.talk('iris', 0); });
  ok(await E(() => __game.state.codex.includes('vies_publicacao')), 'conversa de ofício com Íris rende o verbete de viés de publicação');
  await travel('arquivo', 'de_atrio');
  await E(async () => { for (const id of ['obra_ebm', 'obra_chalmers', 'obra_greenhalgh', 'obra_gigerenzer', 'obra_ioannidis', 'obra_cochrane_br']) await T.use('obra_' + id, undefined, 1.4, 0); });
  ok(await E(() => __game.state.inventory.bussola_cochrane === 1), 'seis obras lidas: Bússola de Cochrane recebida');
  await E(() => { const g = __game; g.state.inventory.limao_lind = 1; g.state.hp = 40; g.useItem('limao_lind'); });
  ok(await E(() => __game.state.hp === 70), 'o Limão de Lind recupera 30 de fôlego');
  console.log('Controles e atalhos');
  await E(() => { const s = __game.state; s.inventory.caldo = 0; s.inventory.limao_lind = 1; s.hp = 40; });
  ok((await E(() => __game.quickItem())) === 'limao_lind', 'F usa o limão quando não há caldo');
  await E(() => { const s = __game.state; s.inventory.caldo = 2; s.hp = 30; });
  ok((await E(() => __game.quickItem())) === 'caldo', 'F prefere o caldo quando há ferimento');
  const yaw0 = await E(() => __game.player.camYaw);
  await E(async () => { __game.input.hold('KeyZ', true); await T.sim(0.5); __game.input.hold('KeyZ', false); });
  ok((await E(() => __game.player.camYaw)) > yaw0, 'Z gira a câmera sem pointer lock');
  await E(() => { __game.pauseGame(); });
  await p.locator('#pause [data-a=config]').click({ force: true, noWaitAfter: true });
  ok((await mode()) === 'book', 'Configurações abrem pela pausa');
  await E(() => __game.closeOverlay());
  ok((await mode()) === 'pause', 'fechar Configurações volta à pausa');
  await E(() => __game.closeOverlay());
  ok((await mode()) === 'play', 'Continuar volta ao jogo');
  await travel('atrio', 'de_arquivo');

  console.log('Registro');
  const before = await E(() => { __game.checkpoint(); return JSON.stringify(__game.state.quests); });
  await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); // a cena pesada demora a descarregar no WebGL por software
  await waitMode('splash');
  await p.keyboard.press('Enter');
  await waitMode('menu');
  await p.click('#menu [data-a=continue]');
  await waitMode('play');
  await E(fs.readFileSync(path.join(here, 'page-helpers.js'), 'utf8'));
  ok((await E(() => JSON.stringify(__game.state.quests))) === before, 'recarregar a página preserva o progresso');

  console.log('Observatório e final');
  await travel('observatorio', 'de_atrio');
  await E(() => T.use('lua_obs'));
  ok(await E(() => __game.state.collected.includes('visto:lua_obs')), 'a lua de olho único pode ser examinada no Observatório');
  await E(async () => { await T.use('pagina_6'); await T.use('braseiro_terraco', 0, 0, 1.3); await T.sim(1); });
  ok((await step('veredito')) === 3 && (await E(() => !__game.state.inventory.oleo_lamparina)), 'um braseiro aceso gasta o único frasco');
  await E(() => __game.player.teleport(0, 0, -12, 3.14));
  await fight('veredito', 8);
  await E(async () => { await T.sim(3); await T.use('bau_pingente', undefined, 0, 1.2); });
  ok((await step('veredito')) === 4, 'o Veredito cede');
  await travel('atrio', 'de_observatorio');
  await E(() => T.talk('heloisa'));
  ok((await mode()) === 'ending', 'tela final exibida');
  await p.click('#ending button');
  await E(async () => { await T.settle(); await T.talk('anselmo'); });
  if ((await step('paginas')) !== 'ok') console.log('diag', JSON.stringify(await E(() => { const g = __game; const n = g.npcs.find((x) => x.def.id === 'anselmo'); return { mode: g.mode, region: g.region.id, npc: n && [n.pos.x, n.pos.z, n.fig.action], pl: [g.player.pos.x, g.player.pos.z], near: g.nearest()?.label, errs: g.errors, scripting: g.scripting, busy: g.busy, frozen: g.player.frozen }; })));
  ok((await step('paginas')) === 'ok', 'as seis páginas entregues a Anselmo');
  const end = await E(() => ({ s: T.st(), err: __game.errors, log: T.log }));
  ok(end.err.length === 0, 'nenhum erro de execução registrado');
  console.log(JSON.stringify(end.s));
  for (const l of end.log) console.log('  ', l);
} catch (e) {
  fail(String(e?.message ?? e));
  try { console.log(JSON.stringify(await E(() => ({ log: window.T?.log, err: __game.errors, mode: __game.mode })))); } catch { /* página indisponível */ }
}
await b.close();
console.log(fails.length ? `\n${fails.length} falha(s)` : '\nCampanha completa sem falhas');
process.exit(fails.length ? 1 : 0);
