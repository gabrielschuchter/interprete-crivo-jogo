import { describe, expect, it } from 'vitest';
import { PS2_GLYPHS, glyphSvg } from '../../src/ui/ps2-glyphs';

describe('glifos PS2', () => {
  it('traz os nove símbolos do vocabulário', () => {
    expect(Object.keys(PS2_GLYPHS).sort()).toEqual(['alvo', 'brasao', 'comparacao', 'crivo', 'custo', 'descoberta', 'evidencia', 'incerteza', 'pergunta']);
  });
  it('gera SVG na grade de 16 sem cor fixa de texto', () => {
    for (const k of Object.keys(PS2_GLYPHS) as Array<keyof typeof PS2_GLYPHS>) {
      const s = glyphSvg(k, 32);
      expect(s.startsWith('<svg')).toBe(true);
      expect(s).toContain('viewBox="0 0 16 16"');
      expect(s).toContain('aria-hidden="true"');
      expect(s.endsWith('</svg>')).toBe(true);
    }
  });
});
