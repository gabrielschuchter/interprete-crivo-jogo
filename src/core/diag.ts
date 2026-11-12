/**
 * Diagnóstico de assets: tudo o que faltou ou falhou ao carregar fica listado aqui,
 * vai para o console e aparece em Configurações. O jogo segue com a versão de reserva,
 * mas a queda de qualidade deixa de ser silenciosa.
 */
export const problems: string[] = [];

export function report(kind: 'modelo' | 'peça' | 'animação' | 'áudio' | 'textura', what: string, detail = ''): void {
  const line = `${kind}: ${what}${detail ? ` (${detail})` : ''}`;
  if (problems.includes(line)) return;
  problems.push(line);
  if (problems.length > 60) problems.shift();
  console.warn('[assets] ' + line);
}
