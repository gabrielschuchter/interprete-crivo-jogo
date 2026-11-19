// Gera, no Chromium e com as fontes do design system, as imagens com texto do projeto Godot que no
// original vinham em inglês (título, "LEVEL UP", "YOU DIED") e os ícones das melhorias, a partir dos
// glifos de src/jogo/icones.ts e src/ui/ps2-glyphs.ts. Mesmas dimensões dos arquivos originais.
// Uso: node --experimental-strip-types tools/survivors/gerar-godot-textos.mjs
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { writeFileSync, mkdtempSync } from 'node:fs';
import os from 'node:os';

const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node-tools/node_modules/playwright'); }
const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const { iconeMelhoria } = await import(pathToFileURL(path.join(RAIZ, 'src/jogo/icones.ts')));
const { glyphSvg } = await import(pathToFileURL(path.join(RAIZ, 'src/ui/ps2-glyphs.ts')));
const F = pathToFileURL(path.join(RAIZ, 'design/fonts')).href;
const A = path.join(RAIZ, 'godot/assets');

const css = `
@font-face{font-family:Cinzel;src:url(${F}/cinzel-latin-700-normal.woff2);font-weight:700}
@font-face{font-family:Fell;src:url(${F}/im-fell-english-latin-400-italic.woff2);font-style:italic}
@font-face{font-family:Fraktur;src:url(${F}/unifrakturcook-latin-700-normal.woff2);font-weight:700}
html,body{margin:0;background:transparent}
.q{width:1408px;height:768px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.t{font:700 150px/1 Cinzel;letter-spacing:.05em;text-transform:uppercase;color:#f0e5d3;text-shadow:6px 6px 0 #0b0709,0 0 24px rgba(11,7,9,.9)}
.s{margin-top:28px;font:italic 400 64px/1.2 Fell;color:#c2ad86;text-shadow:4px 4px 0 #0b0709}
.p{color:#D62839}
.logo{font:700 210px/1 Fraktur;color:#f0e5d3;text-shadow:6px 6px 0 #0b0709}
.logo i{font-style:normal;color:#ffc27a;text-shadow:0 0 18px #e5a85f}
.brasao{color:#bd9a61;--brasa-3:#e5a85f;margin-bottom:34px}
.ico{width:1024px;height:1024px;display:flex;align-items:center;justify-content:center;color:#bd9a61}
`;
const quadros = {
  'title_logo.png': `<div class="q"><div class="brasao">${glyphSvg('brasao', 260)}</div><div class="logo">Interprete<i>.</i></div></div>`,
  'levelup_title.png': `<div class="q"><div class="t">Subiu de nível</div><div class="s">Escolha uma melhoria</div></div>`,
  'death_title.png': `<div class="q"><div class="t p">A névoa fechou</div><div class="s">Fim da partida</div></div>`,
};
// ícones na ordem de main.gd (UPGRADES); o de flechas flamejantes ganha arquivo próprio
const icones = [
  ['img-1781615983941-0', 'flechas'], ['img-1781615985513-0', 'orbe'], ['img-1781615986659-0', 'passo'],
  ['img-1781616016450-0', 'vida'], ['img-1781616018039-0', 'surto'], ['img-1781616019151-0', 'regen'],
  ['img-1781616020680-0', 'explosao'], ['img-1781616035254-0', 'ricochete'], ['img-1781616037839-0', 'serra'],
  ['img-1781616038564-0', 'raio'], ['img-chama', 'chama'],
];

const TMP = path.join(mkdtempSync(path.join(os.tmpdir(), 'gd-')), 'q.html');
const browser = await pw.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1408, height: 1024 } });
const foto = async (html, alvo, w, h) => {
  // página em arquivo: o Chromium só carrega as fontes file:// a partir de outra página file://
  writeFileSync(TMP, `<!doctype html><meta charset="utf-8"><style>${css}</style>${html}`);
  await page.goto(pathToFileURL(TMP).href);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: alvo, omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
};
for (const [nome, html] of Object.entries(quadros)) await foto(html, path.join(A, nome), 1408, 768);
for (const [arq, g] of icones) await foto(`<div class="ico">${iconeMelhoria(g, 860)}</div>`, path.join(A, 'images', arq + '.png'), 1024, 1024);
await browser.close();
console.log('textos e ícones gerados');
