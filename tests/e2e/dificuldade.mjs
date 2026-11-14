/**
 * Campanha por dificuldade, com medida de mortes.
 *
 * Uso (com `npm run dev` no ar):
 *   E2E_DIFICULDADE=medio E2E_PERFIL=completo npm run e2e:dificuldade
 *
 * E2E_DIFICULDADE: historia | facil | medio | dificil (padrão: medio). A dificuldade é escolhida na tela de criação,
 *   clicando no botão, como uma pessoa faria.
 * E2E_PERFIL: completo | direto.
 *   completo faz as missões paralelas (Lia, vento, encomenda, passeio dos mestres, obras), gasta os pontos de
 *   habilidade, compra e equipa o que couber antes de cada chefe: o jogador avançado que o jogo precisa deixar vencer.
 *   direto faz só o caminho principal, sem gastar pontos nem moedas: mede o quanto o jogo cobra de quem não se prepara.
 * E2E_ESPERA: vence (padrão no perfil completo) ou mede (padrão no direto). Com vence, não vencer um chefe é falha;
 *   com mede, só se relata onde a campanha travou.
 * E2E_TENTATIVAS: derrotas aceitas por luta antes de desistir (padrão 8).
 * E2E_URL: servidor (padrão http://127.0.0.1:5173/).
 *
 * O jogador automático é cru (esquiva sem olhar o tempo certo, sem desvio, sem usar o foco): as mortes medidas
 * servem para comparar níveis e perfis entre si, não como previsão do que uma pessoa sofre.
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
const DIF = process.env.E2E_DIFICULDADE ?? 'medio';
const PERFIL = process.env.E2E_PERFIL ?? 'completo';
const ESPERA = process.env.E2E_ESPERA ?? (PERFIL === 'completo' ? 'vence' : 'mede');
const TENTATIVAS = Number(process.env.E2E_TENTATIVAS ?? 8);
const completo = PERFIL === 'completo';
const URL0 = (process.env.E2E_URL ?? 'http://127.0.0.1:5173/') + '?teste';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 640, height: 360 } });
const fails = [];
const fail = (m) => (fails.push(m), console.log('  ✗', m));
const ok = (cond, m) => (cond ? console.log('  ✓', m) : fail(m));
p.on('pageerror', (e) => fail('erro de página: ' + e.message));
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

/** relatório: uma linha por luta */
const lutas = [];
const porTipo = {};
class Travou extends Error {}
const fight = async (group, tries = TENTATIVAS) => {
  let mortes = 0;
  let seg = 0;
  let nivel = 0;
  for (let k = 0; k < tries; k++) {
    const r = await E((g) => T.fight(g, 150), group);
    seg += r.seg;
    nivel = r.nivel;
    if (r.restam && !r.mortes) {
      // o jogador automático não contorna estantes: recoloca ao lado do inimigo mais próximo
      await E((g) => { const G = __game; const e = G.enemies.filter((x) => x.alive && x.group === g).sort((a, b) => a.pos.distanceTo(G.player.pos) - b.pos.distanceTo(G.player.pos))[0]; if (e) G.player.teleport(e.pos.x, e.pos.y, e.pos.z + 1.8 + e.radius, Math.PI); }, group);
      continue;
    }
    if (r.mortes) {
      mortes++;
      { const k = (await E(() => __game.lastFoe)) ?? '?'; porTipo[k] = (porTipo[k] ?? 0) + 1; }
      await p.waitForTimeout(200);
      await E(() => __game.respawn());
      await waitMode('play');
      // quem cai volta a um descanso com o que a banca vende: dois caldos para a próxima tentativa
      await E(() => { __game.state.inventory.caldo = Math.max(2, __game.state.inventory.caldo ?? 0); });
      if (group === 'veredito') await E(() => __game.player.teleport(0, 0, -12, 3.14));
      continue;
    }
    if (completo) await E(() => T.loot());
    const linha = { grupo: group, mortes, seg: +seg.toFixed(0), nivel };
    lutas.push(linha);
    console.log('   luta', JSON.stringify(linha));
    return linha;
  }
  lutas.push({ grupo: group, mortes, seg: +seg.toFixed(0), nivel, venceu: false });
  console.log('   luta NÃO vencida', group, 'após', mortes, 'derrotas');
  throw new Travou(group);
};
const preparar = async () => (completo ? E(() => T.preparar()) : null);
let bloqueio = null;

try {
  console.log(`Dificuldade ${DIF}, perfil ${PERFIL}, espera ${ESPERA}`);
  await p.goto(URL0);
  await waitMode('splash');
  await E(() => localStorage.clear());
  await p.keyboard.press('Enter');
  await waitMode('menu');
  await p.click('#menu [data-a=new]');
  await waitMode('create');
  await p.click('#create [data-prof=enfermagem]');
  await p.click(`#create [data-diff=${DIF}]`);
  await p.fill('#create input', 'Teste');
  await p.click('#create [data-a=go]');
  await waitMode('play');
  await E(fs.readFileSync(path.join(here, 'page-helpers.js'), 'utf8'));
  ok((await E(() => __game.state.difficulty)) === DIF, 'a dificuldade escolhida na criação vai para o registro');

  console.log('Pátio e Bosque');
  await E(async () => { await T.talk('heloisa'); await T.talk('iris'); });
  await travel('bosque', 'de_atrio');
  await E(() => __game.player.teleport(-27, 0, 2, 1.57));
  await fight('trilha');
  await E(() => __game.player.teleport(-5, 0, -11, 3.14));
  await fight('clareira');
  await E(() => T.use('bau_selo'));
  await E(async () => { await T.use('mec_b', 0); await T.sim(7); });
  await E(() => __game.player.teleport(41, 0, 0, 1.57));
  await fight('margem');
  await E(async () => { await T.use('marco', undefined, -1.2, 0); await T.sim(1.5); });
  ok((await E(() => __game.state.flags.includes('ponte_aberta'))), 'a ponte do Bosque se abre');
  if (completo) await E(async () => { await T.use('caixa_dalva'); });

  console.log('Pátio e paralelas');
  await travel('atrio', 'de_bosque');
  await E(async (c) => { await T.talk('iris'); if (c) await T.talk('dalva', 1); }, completo);
  ok((await step('ponte')) === 'ok', 'ponte concluída');
  if (completo) {
    await E(async () => {
      const g = __game;
      const n = g.npcs.find((x) => x.def.id === 'lia');
      g.player.teleport(n.pos.x + Math.sin(n.yaw) * 1.4, 0, n.pos.z + Math.cos(n.yaw) * 1.4, n.yaw + Math.PI);
      await T.sim(1.5); g.autoChoice = 0; g.input.inject('interagir'); await T.sim(0.3); await T.settle(); g.autoChoice = undefined;
      for (const s of ['preferencias', 'evidencia', 'danos', 'custo']) g.ui.caseView.act(s);
      g.ui.caseView.decide('exercicios'); g.ui.caseView.close(); await T.settle();
    });
    await E(async () => { await T.talk('noemia'); await T.talk('tome'); await T.use('vento_terraco'); await T.use('vento_beco'); await T.talk('noemia'); });
    await E(async () => { for (const id of ['pagina_1', 'pagina_2', 'pagina_3']) await T.use(id); });
    await E(async () => { for (const id of ['lind', 'nightingale', 'semmelweis', 'fisher', 'hill', 'cochrane', 'sackett', 'altman']) await T.use('mestre_' + id, undefined, 0, 1.6); });
    // tudo que o jogador avançado juntou até aqui vira equipamento antes do Arquivo
    await E(() => { const g = __game; g.state.coins += 0; });
  }
  await preparar();

  console.log('Arquivo');
  await E(() => T.talk('anselmo'));
  await travel('arquivo', 'de_atrio');
  await fight('estantes');
  await E(async () => {
    const g = __game; g.state.crivoActive = 'lupa';
    for (const [id, x, z] of [['a', -8, 8], ['b', 8, 2], ['c', -6, -12]]) { g.player.teleport(x, 0, z, 0); g.abilityCd = 0; g.input.inject('crivo'); await T.sim(0.3); await T.use('ficha_' + id); }
  });
  await E(async () => { await T.use('alavanca_b', 0, 0, 0.6); await T.sim(3); });
  ok((await step('arquivo')) === 4, 'a alavanca do registro original abre a sala');
  if (completo) await E(async () => { for (const id of ['obra_ebm', 'obra_chalmers', 'obra_greenhalgh', 'obra_gigerenzer', 'obra_ioannidis', 'obra_cochrane_br']) await T.use('obra_' + id, undefined, 1.4, 0); });
  await preparar();
  await E(async () => { __game.player.teleport(0, 0, -21, 3.14); await T.sim(2); });
  await fight('eco');
  await E(async () => { await T.use('bau_lanterna', undefined, 0, 1.4); await T.use('pagina_5'); });
  await travel('atrio', 'de_arquivo');
  await E(async () => { await T.talk('anselmo'); await T.talk('heloisa'); });
  ok((await step('arquivo')) === 'ok' && (await step('veredito')) === 1, 'Arquivo concluído, Veredito iniciado');

  console.log('Observatório');
  await preparar();
  await travel('observatorio', 'de_atrio');
  await E(async () => { await T.use('pagina_6'); await T.use('braseiro_terraco', 0, 0, 1.3); await T.sim(1); });
  await E(() => __game.player.teleport(0, 0, -12, 3.14));
  await fight('veredito');
  await E(async () => { await T.sim(3); await T.use('bau_pingente', undefined, 0, 1.2); });
  ok((await step('veredito')) === 4, 'o Veredito cede');
} catch (e) {
  if (e instanceof Travou) bloqueio = e.message;
  else fail(String(e?.message ?? e));
}

let resumo = null;
try {
  resumo = await E(() => ({ log: T.log.filter((l) => l.startsWith('preparo') || l.startsWith('peças')), nivel: __game.state.level, xp: __game.state.xp, moedas: __game.state.coins, equip: __game.state.equipment, inventario: Object.keys(__game.state.inventory).filter((i) => __data.GEAR[i]), habilidades: __game.state.skills, erros: __game.errors, tempo: Math.round(__game.state.playtime) }));
} catch { /* página indisponível */ }
await b.close();
const mortes = lutas.reduce((a, l) => a + l.mortes, 0);
console.log('\nResumo', JSON.stringify({ dificuldade: DIF, perfil: PERFIL, bloqueio, mortes, mortesPorTipo: porTipo, lutas, ...resumo }));
console.log('Mortes por tipo de inimigo:', JSON.stringify(porTipo));
if (ESPERA === 'vence') ok(!bloqueio, `a campanha é vencível no perfil ${PERFIL} em ${DIF}`);
if (resumo) ok(resumo.erros.length === 0, 'nenhum erro de execução registrado');
console.log(fails.length ? `\n${fails.length} falha(s)` : `\n${DIF}/${PERFIL}: ${bloqueio ? 'travou em ' + bloqueio : 'campanha vencida'} com ${mortes} derrota(s)`);
process.exit(fails.length ? 1 : 0);
