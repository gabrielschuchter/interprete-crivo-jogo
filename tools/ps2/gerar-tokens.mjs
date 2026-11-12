// Gera design/ps2/tokens-ps2.css a partir de design/ps2/ps2.tokens.json.
// Uso: node tools/ps2/gerar-tokens.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const t = JSON.parse(fs.readFileSync(path.join(raiz, 'design/ps2/ps2.tokens.json'), 'utf8'));
const L = [];
const p = (k, v) => L.push(`  --${k}:${v};`);

L.push('/* Interprete RPG · camada PS2. Gerado de ps2.tokens.json por tools/ps2/gerar-tokens.mjs. Não editar à mão. */', '');
const fontes = [
  ['UnifrakturCook', 'unifrakturcook-latin-700-normal.woff2', '700', 'normal'],
  ['Cinzel', 'cinzel-latin-500-normal.woff2', '500', 'normal'],
  ['Cinzel', 'cinzel-latin-700-normal.woff2', '700', 'normal'],
  ['IM Fell English', 'im-fell-english-latin-400-normal.woff2', '400', 'normal'],
  ['IM Fell English', 'im-fell-english-latin-400-italic.woff2', '400', 'italic'],
];
for (const [fam, arq, peso, estilo] of fontes)
  L.push(`@font-face{font-family:"${fam}";src:url("../fonts/${arq}") format("woff2");font-weight:${peso};font-style:${estilo};font-display:swap}`);
L.push('', ':root{');
for (const [nome, cores] of Object.entries(t.rampas)) cores.forEach((c, i) => p(`${nome}-${i + 1}`, c));
for (const [r, d] of Object.entries(t.regioes)) {
  p(`reg-${r}-bruma`, d.bruma);
  p(`reg-${r}-fria`, d.luzFria);
  p(`reg-${r}-quente`, d.luzQuente);
}
const f = t.tipografia.familias;
p('ps2-font-logotipo', `"${f.logotipo}", "${f.titulo}", serif`);
p('ps2-font-titulo', `"${f.titulo}", "Source Serif 4", Georgia, serif`);
p('ps2-font-texto', `"${f.texto}", Georgia, serif`);
p('ps2-font-manuscrito', `"${f.manuscrito}", "${f.texto}", Georgia, serif`);
p('ps2-font-dado', `"${f.dado}", Menlo, Consolas, monospace`);
for (const [k, v] of Object.entries(t.tipografia.escala)) p(`ps2-size-${k}`, `${v}px`);
p('ps2-lh-corpo', t.tipografia.entrelinha.corpo);
p('ps2-lh-titulo', t.tipografia.entrelinha.titulo);
p('ps2-tracking-rotulo', t.tipografia.rastreio.rotulo);
p('ps2-tracking-titulo', t.tipografia.rastreio.titulo);
p('ps2-radius', `${t.forma.raio}px`);
p('ps2-filete', `${t.forma.filete}px`);
t.forma.espaco.forEach((v, i) => p(`ps2-space-${i + 1}`, `${v}px`));
p('ps2-dur-rapido', `${t.movimento.rapido}ms`);
p('ps2-dur-base', `${t.movimento.base}ms`);
p('ps2-dur-lento', `${t.movimento.lento}ms`);
p('ps2-ease', t.movimento.curva);
L.push('}', '');
fs.writeFileSync(path.join(raiz, 'design/ps2/tokens-ps2.css'), L.join('\n'));
console.log('design/ps2/tokens-ps2.css gerado com', L.length, 'linhas');
