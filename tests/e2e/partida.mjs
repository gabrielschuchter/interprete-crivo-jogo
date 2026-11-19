// Partida de ponta a ponta no Chromium: menu, seleção, jogo, subida de nível, chefe, pausa, derrota.
// Uso: npm run build, npm run preview (outra janela) e depois npm run e2e. URL=... troca o endereço;
// SHOTS=pasta grava capturas; TOQUE=1 emula celular em pé.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let pw;
try {
  pw = require('playwright');
} catch {
  pw = require('/opt/node-tools/node_modules/playwright');
}
const { chromium, devices } = pw;

const URL = process.env.URL ?? 'http://localhost:4173/';
const SHOTS = process.env.SHOTS;
const TOQUE = !!process.env.TOQUE;
const falhas = [];
const ok = (cond, msg) => {
  console.log(`${cond ? 'ok   ' : 'FALHA'} ${msg}`);
  if (!cond) falhas.push(msg);
};
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const foto = async (page, nome) => SHOTS && page.screenshot({ path: `${SHOTS}/${TOQUE ? 'celular-' : ''}${nome}.png` });

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage(TOQUE ? { ...devices['Pixel 7'] } : { viewport: { width: 1280, height: 720 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
await page.goto(URL);
await page.waitForSelector('#menu:not(.hidden) .mb', { timeout: 30000 });
ok(true, 'carga termina no menu');
const botoes = await page.$$eval('#menu .mb', (b) => b.map((x) => [x.textContent.trim(), x.disabled]));
ok(botoes.length === 3 && botoes[0][0] === 'Novo jogo' && botoes[1][1] === true && botoes[2][0] === 'Configurações', `menu de três botões, Continuar apagado: ${JSON.stringify(botoes)}`);
await espera(500);
await foto(page, '01-menu');
await page.click('#menu [data-a=novo]');
await page.waitForSelector('#selecao:not(.hidden) .pers');
ok((await page.$$('#selecao .pers')).length === 2, 'seleção com Mago e Cavaleiro');
await foto(page, '02-selecao');
await page.click('#selecao [data-a=rogue]');
await page.waitForSelector('#hud:not(.hidden)');
const estado = () =>
  page.evaluate(() => {
    const p = window.__jogo.partida;
    return p && { vida: p.vida, nivel: p.nivel, abates: p.abates, tempo: p.tempo, inimigos: p.inimigos.length, armas: p.armas.map((a) => a.id), emNivel: p.emNivel, fim: p.fim, chefe: !!p.chefe(), pausada: p.pausada, x: p.x, y: p.y };
  });
const fecharNivel = async () => {
  while (await page.evaluate(() => window.__jogo.partida?.emNivel)) {
    await page.click('#nivel .carta[data-a="0"]');
    await espera(150);
  }
};
await espera(2500);
let s = await estado();
ok(s.inimigos >= 10, `rajada inicial gerou inimigos (${s.inimigos})`);
ok(s.armas.join() === 'homing,arrows', `Mago com orbe e flechas (${s.armas})`);
if (TOQUE) {
  // joystick flutuante: dedo na tela e arrasto para a direita
  const cdp = await page.context().newCDPSession(page);
  const pt = (x, y) => [{ x, y, id: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(200, 600) });
  for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(200 + i * 12, 600) });
  await espera(1200);
  await foto(page, '03b-joystick');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
} else {
  await page.keyboard.down('KeyD');
  await espera(1500);
  await page.keyboard.up('KeyD');
}
const s2 = await estado();
ok(s2.x > 100, `jogador anda para a direita (x = ${s2.x.toFixed(0)})`);
await espera(3000);
s = await estado();
ok(s.tempo > 4, `tempo corre (${s.tempo.toFixed(1)} s)`);
ok(s.abates > 0, `armas automáticas abatem (${s.abates})`);
await foto(page, '03-jogo');
await fecharNivel();
await page.evaluate(() => window.__jogo.partida.forcarNivel());
await page.waitForSelector('#nivel:not(.hidden) .carta');
ok((await page.$$('#nivel .carta')).length === 3, 'subida de nível mostra três cartas');
s = await estado();
ok(s.emNivel, 'jogo congela na escolha');
await foto(page, '04-nivel');
const nivelAntes = s.nivel;
await page.click('#nivel .carta[data-a="0"]');
await espera(200);
s = await estado();
ok(!s.emNivel && s.nivel === nivelAntes, 'escolha fecha o painel');
await page.evaluate(() => window.__jogo.partida.gerarChefe());
await espera(1800);
s = await estado();
ok(s.chefe, 'chefe surge');
await foto(page, '05-chefe');
await fecharNivel();
if (TOQUE) await page.click('#hud .pausar');
else await page.keyboard.press('Escape');
await page.waitForSelector('#pausa:not(.hidden)');
ok((await estado()).pausada, 'pausa congela');
await page.click('#pausa [data-a=menu]');
await page.waitForSelector('#menu:not(.hidden)');
ok(!(await page.$eval('#menu [data-a=continuar]', (b) => b.disabled)), 'Continuar acende com a partida deixada pela pausa');
await page.click('#menu [data-a=continuar]');
await page.waitForSelector('#hud:not(.hidden)');
ok(!(await estado()).pausada, 'Continuar retoma a partida');
await fecharNivel();
await page.evaluate(() => {
  const p = window.__jogo.partida;
  p.invul = 0;
  p.sofrer(99999);
});
await page.waitForSelector('#derrota:not(.hidden)', { timeout: 5000 });
ok(true, 'derrota mostra o fim da partida');
await foto(page, '06-derrota');
await page.click('#derrota [data-a=recomecar]');
await espera(500);
s = await estado();
ok(s && !s.fim && s.tempo < 1, 'Recomeçar abre partida nova');
ok(erros.length === 0, `sem erros no console ${erros.join(' | ')}`);
await browser.close();
if (falhas.length) {
  console.log(`\n${falhas.length} falha(s)`);
  process.exit(1);
}
console.log('\nTudo certo.');
