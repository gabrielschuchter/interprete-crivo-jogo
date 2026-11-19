// Referência visual do design system (design-system.html): monta rampas, regiões, glifos, ícones e contrastes
// a partir das mesmas fontes que o jogo usa, para que a página não guarde valores próprios.
import tokens from '../design/ps2/ps2.tokens.json';
import { glyphSvg, type Ps2Glyph } from './ui/ps2-glyphs';
import { icon } from './ui/icons';

const $ = (id: string) => document.getElementById(id) as HTMLElement;

function lum(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f((n >> 16) & 255) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255);
}
function contrast(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
const PAINEL = '#140a12';
const legivel = (hex: string) => (contrast(hex, PAINEL) > contrast(hex, '#f0e5d3') ? PAINEL : '#f0e5d3');

$('rampas').innerHTML = Object.entries(tokens.rampas)
  .map(
    ([nome, cores]) =>
      `<div class="rampa"><span class="nm">${nome}</span><div class="sw">${cores
        .map((c, i) => `<div style="background:${c};color:${legivel(c)}"><span>${nome}-${i + 1}</span><span>${c}</span></div>`)
        .join('')}</div></div>`,
  )
  .join('');

const NOMES: Record<string, string> = { atrio: 'Átrio', bosque: 'Bosque', arquivo: 'Arquivo', observatorio: 'Observatório', veredito: 'Veredito' };
$('reg').innerHTML = Object.entries(tokens.regioes)
  .map(
    ([id, r]) =>
      `<div style="background:${r.bruma}"><b>${NOMES[id] ?? id}</b><span style="background:${r.bruma}" title="bruma"></span><span style="background:${r.luzFria}" title="luz fria"></span><span style="background:${r.luzQuente}" title="luz quente"></span><small>bruma ${r.bruma} · fria ${r.luzFria} · quente ${r.luzQuente} · rampa ${r.rampa}</small></div>`,
  )
  .join('');

const GLIFOS: [Ps2Glyph, string][] = [
  ['brasao', 'brasão'], ['crivo', 'crivo · método'], ['evidencia', 'evidência'], ['descoberta', 'descoberta'],
  ['alvo', 'alvo · interesse'], ['incerteza', 'incerteza'], ['comparacao', 'comparação'], ['pergunta', 'pergunta'], ['custo', 'custo · dano'],
];
$('glifos').innerHTML = GLIFOS.map(([g, n]) => `<div>${glyphSvg(g, 32)}<small>${n}</small></div>`).join('');
$('brasao-menu').innerHTML = glyphSvg('brasao', 160);

const ICONES = ['caldo', 'selo', 'lupa', 'lanterna', 'botas', 'capa', 'pingente', 'ponteira', 'ficha', 'oleo', 'caixa', 'moedas', 'pulso', 'pagina', 'chave', 'espada', 'escudo'];
$('icones').innerHTML = ICONES.map((n) => `<div>${icon(n)}<small>${n}</small></div>`).join('');

// casas: comum, raridades, selecionada, em uso, vazia
$('casas').innerHTML = [
  `<button class="cell" aria-pressed="false" aria-label="Caldo">${icon('caldo')}<span class="n">3</span></button>`,
  `<button class="cell r-incomum" aria-pressed="false" aria-label="Botas, incomum">${icon('botas')}</button>`,
  `<button class="cell r-rara" aria-pressed="true" aria-label="Lupa, rara, selecionada">${icon('lupa')}</button>`,
  `<button class="cell r-epica" aria-pressed="false" aria-label="Capa, épica">${icon('capa')}<span class="eq">EM USO</span></button>`,
  `<button class="cell r-lendaria" aria-pressed="false" aria-label="Espada, lendária">${icon('espada')}</button>`,
  '<div class="cell empty"></div>', '<div class="cell empty"></div>',
].join('');

$('q1').innerHTML = `${glyphSvg('alvo', 12)} Caminho principal`;
$('loja1').innerHTML = `${icon('caldo')}<span><b>Caldo da cantina</b><small>Quente, salgado e honesto.</small></span><span class="p">${glyphSvg('custo', 12)} 14 moedas</span>`;
$('moedas').innerHTML = '120 moedas';
$('s1').innerHTML = `${icon('caldo')}<span class="nm">Item</span>`;
$('s2').innerHTML = `${icon('pulso')}<span class="nm">Pulso</span>`;

const PARES: [string, string, string, string][] = [
  ['marfim osso-6 sobre painel', '#f0e5d3', PAINEL, 'texto forte, selecionado'],
  ['pink-essence sobre painel', '#f1ebe8', PAINEL, 'corpo de texto'],
  ['osso-5 sobre painel', '#e3d5b3', PAINEL, 'texto, botões do menu'],
  ['secundário #b9a6ae sobre painel', '#b9a6ae', PAINEL, 'texto secundário'],
  ['ouro-4 sobre painel', '#bd9a61', PAINEL, 'rótulo, glifo'],
  ['ouro-3 sobre painel', '#8f7438', PAINEL, 'rótulo grande, fio; evitar em 12 px'],
  ['apagado #7d6a74 sobre painel', '#7d6a74', PAINEL, 'só desabilitado'],
  ['carmesim clássico sobre painel', '#d62839', PAINEL, 'só peça grande'],
  ['breu-1 sobre ouro-4 (inversão)', '#0b0709', '#bd9a61', 'foco de botão'],
  ['marfim sobre vinho-3', '#f0e5d3', '#6e0f29', 'botão primário'],
  ['osso-4 sobre preto', '#c2ad86', '#000000', 'legenda de cena'],
  ['ouro-3 sobre preto', '#8f7438', '#000000', 'nome na legenda'],
  ['ardósia-5 sobre ardósia-1', '#5b6779', '#0d1117', 'botão de menu desabilitado'],
  ['osso-2 sobre breu-2', '#5a4b3a', '#120910', 'nota do botão da pausa de cena: abaixo do mínimo'],
  ['tinta ferrogálica sobre osso-5', '#3b2a1c', '#e3d5b3', 'texto em papel'],
  ['carmesim sobre marfim do mapa', '#d62839', '#f0e5d3', 'alvo no mapa, peça grande'],
  ['raridade épica sobre breu-2', '#8a5a8f', '#120910', 'filete; nunca o único sinal'],
];
$('contr').innerHTML = PARES.map(([n, a, b, u]) => {
  const r = contrast(a, b);
  return `<tr><td><span style="display:inline-block;width:14px;height:14px;background:${a};box-shadow:0 0 0 2px ${b},0 0 0 3px #3a2e15;margin-right:10px;vertical-align:-2px"></span>${n}</td><td class="r">${r.toFixed(2).replace('.', ',')}:1</td><td class="${r < 4.5 ? 'x' : ''}">${u}</td></tr>`;
}).join('');
