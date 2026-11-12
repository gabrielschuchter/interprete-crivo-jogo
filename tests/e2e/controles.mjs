/**
 * Teclado, remapeamento, controle e registro (auditoria de 12/11/2026, itens 1, 11 a 13, 18 a 22, 51, 57, 58).
 * Uso: npm run dev (em outro terminal) e depois npm run e2e:controles.
 * O controle é simulado trocando navigator.getGamepads: cobre a lógica, não o hardware.
 */
import { createRequire } from 'node:module';

let chromium;
try {
  ({ chromium } = createRequire(import.meta.url)('playwright'));
} catch {
  ({ chromium } = createRequire('/')('playwright'));
}
const URL0 = (process.env.E2E_URL ?? 'http://127.0.0.1:5173/') + '?teste';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 900, height: 560 } });
const fails = [];
const fail = (m) => (fails.push(m), console.log('  ✗', m));
const ok = (cond, m) => (cond ? console.log('  ✓', m) : fail(m));
p.on('pageerror', (e) => fail('erro de página: ' + e.message));
const E = (fn, a) => p.evaluate(fn, a);
const mode = () => E(() => window.__game?.mode);
const until = async (fn, a, ms = 60000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await E(fn, a)) return true;
    await p.waitForTimeout(120);
  }
  return false;
};
const waitMode = (m, ms = 240000) => until((m) => window.__game?.mode === m, m, ms);
const focusInfo = () => E(() => { const a = document.activeElement; return a ? (a.id || a.dataset?.a || a.dataset?.bind || a.dataset?.k || a.tagName) : ''; });

// controle virtual
await p.addInitScript(() => {
  const pad = { connected: false, index: 0, id: 'Controle de teste', mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
  window.__pad = pad;
  navigator.getGamepads = () => (pad.connected ? [pad] : []);
});
// aperta e solta dentro de quadros avançados à mão: não depende da taxa de quadros do WebGL por software
const press = (i) =>
  E((i) => {
    __pad.buttons[i] = { pressed: true, value: 1 };
    __game.tick(0.016);
    __game.input.endFrame();
    __pad.buttons[i] = { pressed: false, value: 0 };
    __game.tick(0.016);
    __game.input.endFrame();
  }, i);

try {
  await p.goto(URL0);
  await waitMode('splash');

  console.log('Controle desde o primeiro acesso');
  await E(() => { __pad.connected = true; __game.tick(0.016); __game.input.endFrame(); });
  await press(0);
  ok(await waitMode('menu', 20000), 'um botão do controle sai da tela de abertura');
  await p.waitForTimeout(800);
  const f0 = await focusInfo();
  await press(13);
  const f1 = await focusInfo();
  ok(f0 !== f1 && !!f1, `direcional percorre o menu inicial (${f0} → ${f1})`);
  await press(12);
  ok((await focusInfo()) === f0, 'direcional para cima volta ao primeiro item');
  await press(0);
  ok(await waitMode('create', 20000), 'A aciona "Novo caminho" e abre a criação');
  await press(1);
  ok(await waitMode('menu', 20000), 'B volta da criação para o menu');
  ok(await E(() => __game.input.usingPad), 'entrada ativa: controle');
  await p.keyboard.press('ArrowDown');
  ok(await E(() => !__game.input.usingPad), 'ao usar o teclado, a indicação de controle se desfaz');

  console.log('Entrada no jogo');
  await p.waitForTimeout(700);
  await p.click('#menu [data-a=new]');
  await waitMode('create');
  await p.click('#create [data-a=go]');
  await waitMode('play');
  await p.waitForTimeout(500);

  console.log('Teclado nos painéis');
  await E(() => __game.pauseGame());
  await p.locator('#pause [data-a=config]').click({ force: true, noWaitAfter: true });
  await until(() => __game.mode === 'book');
  await p.waitForTimeout(300);
  await p.locator('#cfg-quality').focus();
  await p.keyboard.press('Tab');
  await p.waitForTimeout(200);
  ok((await E(() => __game.ui.bookTab)) === 'config' && (await mode()) === 'book', 'Tab dentro de Configurações não abre o Inventário');
  ok((await E(() => document.activeElement?.id)) === 'cfg-fov', 'Tab leva o foco ao controle seguinte');
  await p.keyboard.press('Shift+Tab');
  ok((await E(() => document.activeElement?.id)) === 'cfg-quality', 'Shift+Tab volta ao controle anterior');
  const fov0 = await E(() => __game.settings.fov);
  await p.locator('#cfg-fov').focus();
  await p.keyboard.press('ArrowRight');
  ok((await E(() => __game.settings.fov)) === fov0 + 1, 'seta ajusta a barra em foco');
  ok((await E(() => document.querySelector('#cfg-fov').parentElement.querySelector('output').textContent)) === `${fov0 + 1}°`, 'a barra mostra o valor em texto');
  const q0 = await E(() => __game.settings.quality);
  await p.locator('#cfg-quality').focus();
  await p.keyboard.press(q0 === 'baixa' ? 'ArrowDown' : 'ArrowUp');
  await p.waitForTimeout(300);
  ok((await E(() => __game.settings.quality)) !== q0 && (await E(() => document.activeElement?.id)) === 'cfg-quality', 'setas trocam a opção do seletor sem roubar o foco');
  await E((q) => { __game.settings.quality = q; __game.applySettings(); }, q0);

  console.log('Remapeamento');
  await p.locator('[data-bind=esquiva]').click({ force: true, noWaitAfter: true });
  await p.keyboard.press('KeyK');
  await p.waitForTimeout(200);
  const k = await E(() => ({ e: __game.input.keys.esquiva, g: __game.input.keys.golpe, t: document.querySelector('#toasts').textContent }));
  ok(k.e[0] === 'KeyK' && k.g.includes('Space') && !k.g.includes('KeyK'), 'tecla em conflito troca de ação, sem ficar perdida');
  ok(/Golpe firme/.test(k.t), 'o conflito é avisado na tela');
  await p.locator('[data-bind=dica]').click({ force: true, noWaitAfter: true });
  await p.mouse.click(450, 20, { button: 'middle' });
  await p.waitForTimeout(200);
  ok((await E(() => __game.input.keys.dica[0])) === 'Mouse1', 'botão do mouse pode ser escolhido');
  await p.locator('[data-bind=mapa]').click({ force: true, noWaitAfter: true });
  await p.keyboard.press('Escape');
  await p.waitForTimeout(200);
  ok((await E(() => __game.input.keys.mapa[0])) === 'KeyM' && (await mode()) === 'book', 'Esc cancela o remapeamento sem fechar o painel');
  await p.locator('[data-bindpad=ataque]').click({ force: true, noWaitAfter: true });
  await press(3);
  const pd = await E(() => ({ a: __game.input.pad.ataque, g: __game.input.pad.golpe }));
  ok(pd.a === 3 && pd.g === 2, 'botão do controle remapeado, com troca no conflito');
  await E(() => { __game.resetSettings(); __game.ui.renderBook(); });
  ok(await E(() => __game.input.keys.esquiva[0] === 'Space' && __game.input.pad.ataque === 2), 'Restaurar padrões desfaz teclas e botões');

  console.log('Controle: reconexão e zona morta');
  await E(() => __game.closeOverlay());
  await E(() => __game.closeOverlay());
  await until(() => __game.mode === 'play');
  await E(() => { __pad.connected = false; });
  await p.waitForTimeout(400);
  await E(() => { __pad.buttons[9] = { pressed: true, value: 1 }; __pad.connected = true; });
  await p.waitForTimeout(700);
  ok((await mode()) === 'play', 'reconectar com Start apertado não dispara a pausa');
  await E(() => { __pad.buttons[9] = { pressed: false, value: 0 }; });
  await p.waitForTimeout(300);
  await E(() => { __pad.axes = [0.12, 0.1, 0, 0]; });
  await p.waitForTimeout(900);
  ok(await E(() => __game.input.padMove.x === 0 && __game.input.padMove.y === 0), 'folga do analógico dentro da zona morta não move');
  await E(() => { __pad.axes = [0, 0, 0.9, 0]; });
  await until(() => __game.input.padLook.x > 0.8, undefined, 8000);
  ok(await E(() => __game.input.usingPad && __game.input.padLook.x > 0.8), 'analógico direito também marca o controle como entrada ativa');
  await E(() => { __pad.axes = [0, 0, 0, 0]; });
  await press(9);
  ok(await waitMode('pause', 10000), 'Start pausa');
  await press(1);
  ok(await waitMode('play', 10000), 'B fecha a pausa');
  await E(() => { __pad.connected = false; });

  console.log('Registro');
  await E(() => { __game.checkpoint(); });
  await E(() => {
    window.__set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) { if (String(k).includes('registro')) throw new DOMException('cheio', 'QuotaExceededError'); return window.__set.call(this, k, v); };
    document.querySelector('#toasts').textContent = '';
    __game.save();
  });
  ok(await E(() => __game.saveFailed && /recusou a gravação/.test(document.querySelector('#toasts').textContent)), 'falha de gravação é avisada na tela');
  await E(() => __game.pauseGame());
  ok(await E(() => !!document.querySelector('#pause .warn') && !!document.querySelector('#pause [data-a=export]')), 'a pausa mostra o aviso e oferece a cópia do registro');
  const exported = await E(() => __game.exportSave());
  ok(!!exported && JSON.parse(exported).name !== undefined, 'a cópia exportada é um registro legível');
  await E(() => { Storage.prototype.setItem = window.__set; __game.save(); });
  ok(await E(() => !__game.saveFailed), 'a gravação volta a funcionar quando o armazenamento volta');
  await E(() => __game.closeOverlay());
  await E(() => { __game.checkpoint(); localStorage.setItem('interprete-rpg-registro-v1', '{"version":2,"name":'); });
  ok((await E(() => __game.recoverSave())) === 'recuperado' && (await E(() => __game.hasSave())), 'registro truncado é trocado pela gravação anterior');
  ok(await E((txt) => __game.importSave(txt), exported), 'um registro exportado pode ser importado');
  ok(!(await E(() => __game.importSave('{"oi":1}'))), 'arquivo que não é registro é recusado');

  console.log('Caso de Lia');
  await E(() => { __game.runScript(() => Promise.resolve()); });
  const html = await E(async () => {
    const { CASE_LIA } = await import('/src/content/data.ts');
    const v = __game.ui.caseView;
    localStorage.removeItem('interprete-rpg-caso-' + CASE_LIA.id);
    void v.open(CASE_LIA);
    document.querySelector('#case [data-a=share]').click();
    const early = v.done.has('compartilhada');
    v.act('preferencias'); v.act('evidencia'); v.act('danos');
    document.querySelector('#case [data-a=share]').click();
    const late = v.done.has('compartilhada');
    const paper = document.querySelector('#case .paper').textContent;
    v.close();
    void v.open(CASE_LIA);
    const kept = v.done.has('danos');
    document.querySelector('#case [data-opt=exercicios]').click();
    const pending = !v.feedback;
    document.querySelector('#case [data-opt=exercicios]').click();
    const decided = !!v.feedback;
    const desk = document.querySelector('#case .desk').textContent;
    v.close();
    return { early, late, paper, kept, pending, decided, desk };
  });
  ok(!html.early && html.late, 'decidir junto só é creditado depois de ouvir preferências e mostrar benefício ou dano');
  ok(/6 em cada 100 sem tintura e 15 em cada 100 com ela/.test(html.paper), 'dano mostrado como risco de base e risco total');
  ok(/Comparação com sorteio, 240 pessoas/.test(html.paper), 'notas metodológicas das fontes aparecem no dossiê');
  ok(html.kept, 'o que já foi perguntado continua ao sair e voltar');
  ok(html.pending && html.decided, 'opção sem o passo que a sustenta pede confirmação, e a confirmação decide');
  ok(/8 semanas depois/.test(html.desk), 'o desfecho é dado no mesmo horizonte dos estudos');

  const errs = await E(() => __game.errors);
  ok(errs.length === 0, 'nenhum erro de execução registrado' + (errs.length ? ': ' + errs.join(' | ').slice(0, 400) : ''));
  const probs = await E(async () => (await import('/src/core/diag.ts')).problems);
  ok(probs.length === 0, 'nenhum asset faltou' + (probs.length ? ': ' + probs.join(' | ').slice(0, 600) : ''));
} catch (e) {
  fail('exceção: ' + (e?.stack ?? e));
}
await b.close();
console.log(fails.length ? `\n${fails.length} falha(s)` : '\nControles e registro sem falhas');
process.exit(fails.length ? 1 : 0);
