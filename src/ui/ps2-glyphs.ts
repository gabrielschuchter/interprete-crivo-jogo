/**
 * Vocabulário de glifos e brasão da direção PS2 (docs/game/DIRECAO_DE_ARTE_PS2.md, seção 8).
 * Grade de 16 por 16, traço de 2 px, cantos retos; herdam a cor do texto (currentColor).
 * Cada glifo diz algo sobre o método: nada de símbolo ocultista genérico.
 */
export type Ps2Glyph = 'crivo' | 'evidencia' | 'descoberta' | 'alvo' | 'incerteza' | 'comparacao' | 'pergunta' | 'custo' | 'brasao';

const furos = (cx: number, cy: number, r: number, n: number): string =>
  Array.from({ length: n }, (_, i) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return `<rect x="${(cx + Math.cos(a) * r - 0.6).toFixed(2)}" y="${(cy + Math.sin(a) * r - 0.6).toFixed(2)}" width="1.2" height="1.2" fill="currentColor" stroke="none"/>`;
  }).join('');

export const PS2_GLYPHS: Record<Ps2Glyph, string> = {
  // disco perfurado de sete furos: o Crivo como peneira, o método
  crivo: `<circle cx="8" cy="8" r="6.5"/><rect x="7.4" y="7.4" width="1.2" height="1.2" fill="currentColor" stroke="none"/>${furos(8, 8, 3.4, 6)}`,
  // disco com ponto: evidência
  evidencia: '<circle cx="8" cy="8" r="6.5"/><circle cx="8" cy="8" r="2" fill="currentColor" stroke="none"/>',
  // chave aberta: descoberta
  descoberta: '<circle cx="5" cy="5" r="3.2"/><path d="M7.4 7.4 14 14M11 11l2-2M12.5 12.5l1.5-1.5"/>',
  // losango: alvo e interesse
  alvo: '<path d="M8 1.5 14.5 8 8 14.5 1.5 8Z"/>',
  // triângulo de vértice para baixo com ponto: incerteza
  incerteza: '<path d="M2 3h12L8 14Z"/><rect x="7.2" y="5.8" width="1.6" height="1.6" fill="currentColor" stroke="none"/>',
  // dois círculos que se tocam: comparação
  comparacao: '<circle cx="5.5" cy="8" r="4"/><circle cx="10.5" cy="8" r="4"/>',
  // espiral de ponto aberto: pergunta
  pergunta: '<path d="M8 8.5a1.2 1.2 0 1 1 1.2-1.2 2.8 2.8 0 1 1-2.8 2.8 4.6 4.6 0 1 1 4.6-4.6"/>',
  // balança de braços desiguais: custo e dano
  custo: '<path d="M8 3v11M5 14h6M2 5.5 14 3.5"/><path d="M2 5.5 .8 9.5h2.4ZM14 3.5l-1.2 4h2.4Z"/>',
  // escudo de topo reto com o disco perfurado e a brasa do ponto do nome
  brasao: `<path d="M2 1.5h12V8c0 3.6-2.8 5.6-6 6.8C4.8 13.6 2 11.6 2 8Z"/><circle cx="8" cy="7.2" r="3.4"/>${furos(8, 7.2, 2, 6)}<rect x="12" y="1.5" width="2.4" height="2.4" fill="var(--brasa-3, #e5a85f)" stroke="none"/>`,
};

export function glyphSvg(name: Ps2Glyph, size = 24): string {
  return `<svg class="glifo" width="${size}" height="${size}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" stroke-linecap="square" shape-rendering="crispEdges" aria-hidden="true">${PS2_GLYPHS[name]}</svg>`;
}
