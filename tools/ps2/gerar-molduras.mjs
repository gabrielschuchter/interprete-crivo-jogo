// Gera as molduras 9-slice da interface PS2 a partir das rampas dos tokens.
// Uso: node tools/ps2/gerar-molduras.mjs   (saída: public/ui/ps2/moldura-*.svg)
import fs from 'node:fs';
import path from 'node:path';
const raiz = path.resolve(import.meta.dirname, '..', '..');
const T = JSON.parse(fs.readFileSync(path.join(raiz, 'design/ps2/ps2.tokens.json'), 'utf8')).rampas;
const out = path.join(raiz, 'public/ui/ps2');
fs.mkdirSync(out, { recursive: true });

// Grade de 48 px; fatia de 16 px. Cantos carregam o ornamento, bordas repetem um filete.
const S = 48, F = 16;
const rect = (x, y, w, h, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
const svg = (corpo) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}" shape-rendering="crispEdges">${corpo}</svg>\n`;

function moldura({ fora, corpo, fio, tacha, miolo }) {
  const p = [];
  p.push(rect(0, 0, S, S, fora));            // filete externo escuro (2 px)
  p.push(rect(2, 2, S - 4, S - 4, corpo));   // faixa do material
  p.push(rect(5, 5, S - 10, S - 10, fio));   // fio interno de 1 px
  p.push(rect(6, 6, S - 12, S - 12, miolo)); // miolo (fica transparente via border-image sem fill)
  // tachas nos quatro cantos
  for (const [x, y] of [[4, 4], [S - 12, 4], [4, S - 12], [S - 12, S - 12]]) {
    p.push(rect(x, y, 8, 8, fora), rect(x + 1, y + 1, 6, 6, tacha), rect(x + 2, y + 2, 2, 2, fio));
  }
  return svg(p.join(''));
}

// O miolo é recortado: border-image sem "fill" descarta a fatia central; mesmo assim deixamos cor neutra.
const defs = {
  pedra: { fora: T.breu[0], corpo: T.ardosia?.[2] ?? '#2c3138', fio: T.ouro[2], tacha: T.ouro[3], miolo: T.breu[2] },
  bronze: { fora: T.breu[0], corpo: T.madeira[3], fio: T.ouro[3], tacha: T.ouro[4], miolo: T.breu[2] },
  papel: { fora: T.breu[0], corpo: T.osso[2], fio: T.osso[1], tacha: T.vinho[2], miolo: T.osso[4] },
};
for (const [nome, d] of Object.entries(defs)) {
  fs.writeFileSync(path.join(out, `moldura-${nome}.svg`), moldura(d));
  console.log(`moldura-${nome}.svg`);
}
