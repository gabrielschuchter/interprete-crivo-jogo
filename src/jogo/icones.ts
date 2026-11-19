/**
 * Glifos das melhorias, desenhados para o Interprete no lugar dos ícones coloridos do original
 * (assets/images/img-*.png): grade de 16 por 16, traço de 2 px, junções em esquadro, herdam a cor
 * do texto, como os glifos de método de src/ui/ps2-glyphs.ts.
 */
const dentes = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2;
  const x1 = 8 + Math.cos(a) * 5.2, y1 = 8 + Math.sin(a) * 5.2, x2 = 8 + Math.cos(a) * 7.4, y2 = 8 + Math.sin(a) * 7.4;
  return `M${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}`;
}).join('');

const GLIFOS: Record<string, string> = {
  flechas: '<path d="M1.5 4 4.5 8l-3 4M6.5 4l3 4-3 4M11.5 4l3 4-3 4"/>',
  orbe: '<circle cx="10.5" cy="5.5" r="3.5"/><path d="M1.5 14.5c1.5-4 3.5-6.5 5.5-7.5"/>',
  passo: '<path d="M5 1.5v8l-3 2.5v2.5h12V13c0-1.6-2.2-2.4-4.5-3V1.5Z"/>',
  vida: '<path d="M2 1.5h12V8c0 3.6-2.8 5.6-6 6.8C4.8 13.6 2 11.6 2 8Z"/><path d="M8 4.5v6M5 7.5h6"/>',
  surto: '<path d="M8 4.2 11.8 8 8 11.8 4.2 8Z"/><path d="M8 .5v1.8M8 13.7v1.8M.5 8h1.8M13.7 8h1.8"/>',
  regen: '<path d="M6 15V2.5M2 6.5l4-4 4 4"/><path d="M10.5 11.5h5M13 9v5"/>',
  explosao: '<path d="M8 1v4M8 11v4M1 8h4M11 8h4M3 3l2.5 2.5M10.5 10.5 13 13M13 3l-2.5 2.5M5.5 10.5 3 13"/>',
  ricochete: '<path d="M14.5 1v14"/><path d="M1.5 2.5l11 5.5-11 5.5"/>',
  serra: `<circle cx="8" cy="8" r="4.6"/><rect x="7.2" y="7.2" width="1.6" height="1.6" fill="currentColor" stroke="none"/><path d="${dentes}"/>`,
  raio: '<path d="M10 1 4 9h4l-2 6 6-8H8Z"/>',
  chama: '<path d="M8 15c-3 0-5-2-5-5 0-3 3-4.5 3-8.5 2 1 3.5 3 3.5 5.2 1-.8 1.2-1.8 1.2-3 2 1.8 3.3 4 3.3 6.3 0 3-2 5-5 5Z"/>',
};

export function iconeMelhoria(nome: string, tam = 48): string {
  return `<svg class="glifo" width="${tam}" height="${tam}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="miter" stroke-linecap="square" aria-hidden="true">${GLIFOS[nome] ?? ''}</svg>`;
}
