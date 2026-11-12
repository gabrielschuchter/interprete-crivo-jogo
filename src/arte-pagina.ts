// Página navegável da direção de arte: monta rampas, regiões, contrastes e abas de captura a partir dos tokens.
import tokens from '../design/ps2/ps2.tokens.json';

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
const legivel = (hex: string) => (contrast(hex, '#140a12') > contrast(hex, '#f0e5d3') ? '#140a12' : '#f0e5d3');

const rampas = $('rampas');
for (const [nome, cores] of Object.entries(tokens.rampas)) {
  const linha = document.createElement('div');
  linha.className = 'rampa';
  linha.innerHTML = `<span class="rotulo">${nome}</span><div class="amostras">${cores
    .map((c, i) => `<div class="amostra" style="background:${c};color:${legivel(c)}"><span>${nome}-${i + 1}</span><span>${c}</span></div>`)
    .join('')}</div>`;
  rampas.appendChild(linha);
}

const regioes = $('regioes');
for (const [nome, r] of Object.entries(tokens.regioes)) {
  const el = document.createElement('div');
  el.className = 'regiao';
  el.style.background = r.bruma;
  el.innerHTML = `<span class="rotulo">${nome}</span><div class="pontos"><i style="background:${r.luzFria}"></i><i style="background:${r.luzQuente};box-shadow:0 0 14px ${r.luzQuente}"></i></div><small>bruma ${r.bruma}<br>fria ${r.luzFria}<br>quente ${r.luzQuente}</small>`;
  regioes.appendChild(el);
}

const pares: Array<[string, string, string]> = [
  ['osso-5 sobre painel', '#e3d5b3', '#140a12'],
  ['marfim sobre painel', '#f0e5d3', '#140a12'],
  ['ouro-4 sobre painel', '#bd9a61', '#140a12'],
  ['brasa-4 sobre painel', '#ffc27a', '#140a12'],
  ['marfim sobre vinho-3', '#f0e5d3', '#6e0f29'],
  ['tinta ferrogálica sobre osso-5', '#3b2a1c', '#e3d5b3'],
  ['carmesim clássico sobre painel', '#d62839', '#140a12'],
  ['espectro-3 sobre painel', '#5b4a8a', '#140a12'],
];
$('contrastes').innerHTML = pares
  .map(([n, a, b]) => {
    const c = contrast(a, b);
    return `<div class="par" style="background:${b};color:${a}"><span>${n}</span><b>${c.toFixed(1).replace('.', ',')}:1</b><small>${c >= 4.5 ? 'texto' : c >= 3 ? 'só elemento grande' : 'só ornamento'}</small></div>`;
  })
  .join('');

// abas de captura
const presets = ['off', 'a', 'b', 'c', 'ps2'] as const;
const nomes: Record<string, string> = { off: 'Atual (sem camada)', a: 'A · Necrópole fria', b: 'B · Sala de vela', c: 'C · Vitral regional', ps2: 'Luz de estudo (consolidada)' };
const cenas: Array<[string, string]> = [['10-atrio', 'Átrio'], ['30-bosque', 'Bosque'], ['50-observatorio', 'Observatório'], ['20-inventario', 'Inventário'], ['01-menu', 'Menu']];
// o Átrio existe para todas as predefinições; as demais cenas só para a consolidada (capturas por software são lentas)
const disponiveis = (p: string) => (p === 'ps2' ? cenas : cenas.slice(0, 1));
let preset: string = 'ps2';
let cena = '10-atrio';
const abas = $('abas');
const quadro = $('quadro') as HTMLImageElement;
function montar(): void {
  abas.innerHTML = [
    ...presets.map((p) => `<button role="tab" aria-selected="${p === preset}" data-p="${p}">${nomes[p]}</button>`),
    `<span class="sep"></span>`,
    ...disponiveis(preset).map(([c, n]) => `<button role="tab" aria-selected="${c === cena}" data-c="${c}">${n}</button>`),
  ].join('');
  quadro.src = `./direcao-de-arte/img/${preset}-${cena}.jpg`;
  $('legenda-quadro').textContent = `${nomes[preset]} · ${cenas.find((x) => x[0] === cena)?.[1]}`;
}
abas.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest('button');
  if (!b) return;
  if (b.dataset.p) {
    preset = b.dataset.p;
    if (!disponiveis(preset).some((x) => x[0] === cena)) cena = '10-atrio';
  }
  if (b.dataset.c) cena = b.dataset.c;
  montar();
});
quadro.addEventListener('error', () => {
  $('legenda-quadro').textContent += ' (captura indisponível)';
});
montar();

// quadro comparativo das direções
const crit: Array<[string, string, string, string]> = [
  ['Fidelidade ao briefing', 'alta', 'média', 'média'],
  ['Aderência à paleta pedida', 'baixa', 'alta', 'baixa'],
  ['Legibilidade de jogo', 'baixa', 'média', 'alta'],
  ['Continuidade com a Escola Interprete', 'baixa', 'alta', 'baixa'],
  ['Diferenciação entre regiões', 'baixa', 'baixa', 'alta'],
  ['Custo de produção de material', 'baixo', 'médio', 'alto'],
  ['Risco de monotonia em sessão longa', 'alto', 'médio', 'baixo'],
];
$('comparativo').innerHTML = `<table class="tabela"><thead><tr><th>Critério</th><th>A</th><th>B</th><th>C</th></tr></thead><tbody>${crit
  .map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`)
  .join('')}</tbody></table>`;
