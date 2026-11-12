/** Ícones de traço, autorais, em SVG. Herdam a cor do texto. */
const P: Record<string, string> = {
  caldo: '<path d="M4 11h16a8 8 0 0 1-16 0Z"/><path d="M9 7c0-1.5 1.5-1.5 1.5-3M13.5 7c0-1.5 1.5-1.5 1.5-3"/>',
  selo: '<circle cx="12" cy="12" r="7.5"/><path d="M12 4.5v15M4.5 12h15"/><circle cx="12" cy="12" r="2.2"/>',
  lupa: '<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5.5 5.5"/><path d="M7.5 10.5a3 3 0 0 1 3-3"/>',
  lanterna: '<path d="M8 8h8v10H8Z"/><path d="M9.5 8V5.5h5V8M7 18h10M12 3v2.5"/><path d="M12 11.5v3.5"/>',
  botas: '<path d="M8 3v10l-3 3v3h14v-3c0-2-3-2-5-4V3Z"/><path d="M5 17h14M10.5 6h3M10.5 9h3"/>',
  capa: '<path d="M8 4h8l4 16H4Z"/><path d="M10 4a2 2 0 0 0 4 0M12 8v12"/>',
  pingente: '<path d="M8 3 12 9l4-6"/><circle cx="12" cy="14" r="1.6"/><path d="M5.5 14h13M5.5 12v4M18.5 12v4"/>',
  ponteira: '<path d="M12 21 8.5 9h7Z"/><path d="M9 6h6M9.5 3h5v6h-5Z"/>',
  ficha: '<path d="M5 4h14v16H5Z"/><path d="M8 8h8M8 11.5h8M8 15h4"/><circle cx="16" cy="16" r="1.6"/>',
  oleo: '<path d="M9 3h6v3l2.5 4v10h-11V10L9 6Z"/><path d="M6.5 13h11"/>',
  caixa: '<path d="M4 8h16v11H4Z"/><path d="M4 8 7 4h10l3 4M12 8v11M9.5 12.5h5"/>',
  moedas: '<ellipse cx="12" cy="7" rx="6.5" ry="2.8"/><path d="M5.5 7v5c0 1.5 3 2.8 6.5 2.8s6.5-1.3 6.5-2.8V7M5.5 12v5c0 1.5 3 2.8 6.5 2.8s6.5-1.3 6.5-2.8v-5"/>',
  pulso: '<circle cx="12" cy="12" r="2.4"/><circle cx="12" cy="12" r="6"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22"/>',
  pagina: '<path d="M6 3h9l4 4v14H6Z"/><path d="M15 3v4h4M9 11h7M9 14.5h7M9 18h4"/>',
  chave: '<circle cx="7.5" cy="12" r="3.5"/><path d="M11 12h10M17 12v3.5M20 12v2.5"/>',
  espada: '<path d="M19 3 9.5 12.5M19 3h-3.5M19 3v3.5"/><path d="m7 10 7 7M9.5 14.5 5 19M4 18l2 2"/>',
  escudo: '<path d="M12 3 5 6v6c0 4.5 3.2 7.5 7 9 3.8-1.5 7-4.5 7-9V6Z"/><path d="M12 7v10"/>',
  vazio: '<path d="M12 5v14M5 12h14" opacity=".35"/>',
};

export function icon(name: string): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] ?? P.vazio}</svg>`;
}
