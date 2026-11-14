import { describe, expect, it } from 'vitest';
import { sanitizeSettings, DEFAULT_SETTINGS, hudScaleFor } from '../../src/core/settings';
import { PS2_IMAGEM } from '../../src/core/ps2';
import { QualityGovernor, initialQuality, stepDown } from '../../src/core/quality';

describe('imagem única', () => {
  it('a PS2 tardia é a imagem do jogo e fica dentro da era', () => {
    expect(PS2_IMAGEM.nome).toBe('PS2 tardia');
    const l = PS2_IMAGEM.alturaPorQualidade;
    expect(l.baixa).toBe(448);
    expect(l.alta).toBeGreaterThan(l.media);
    expect(l.alta).toBeLessThanOrEqual(720);
    expect(PS2_IMAGEM.niveis).toBeLessThanOrEqual(64);
    expect(PS2_IMAGEM.snap).toBeGreaterThan(0);
    expect(PS2_IMAGEM.saturacao).toBeLessThan(1);
  });
});

describe('ajustes antigos migram em silêncio', () => {
  it('campos que saíram dos Ajustes somem e o resto se mantém', () => {
    const old = {
      aparencia: 'crua', quality: 'baixa', fov: 70, grain: false, vignette: false, sensY: 1.8, camDist: 6, hud: false, hudNumbers: true,
      touchEasyRun: true, padDeadzone: 0.3, noticeTime: 3, volAmbiente: 0.2, volGeral: 0.5, sens: 1.4, invertY: true, textScale: 1.3, difficulty: 'rigor',
    };
    const s = sanitizeSettings(old) as unknown as Record<string, unknown>;
    for (const k of ['aparencia', 'quality', 'fov', 'grain', 'vignette', 'sensY', 'camDist', 'hud', 'hudScale', 'hudNumbers', 'touchEasyRun', 'padDeadzone', 'noticeTime', 'volAmbiente'])
      expect(s[k]).toBeUndefined();
    expect([s.volGeral, s.sens, s.invertY, s.textScale, s.difficulty, s.brilho]).toEqual([0.5, 1.4, true, 1.3, 'dificil', DEFAULT_SETTINGS.brilho]);
  });
  it('quem só tinha aumentado a interface em jogo passa a texto Maior', () => {
    expect(sanitizeSettings({ hudScale: 1.3 }).textScale).toBe(1.15);
    expect(sanitizeSettings({ hudScale: 1.3, textScale: 1.6 }).textScale).toBe(1.6);
    expect(hudScaleFor(1)).toBe(1);
    expect(hudScaleFor(1.6)).toBeLessThanOrEqual(1.3);
  });
});

describe('qualidade automática', () => {
  it('começa alta no computador e baixa no toque', () => {
    expect(initialQuality(false)).toBe('alta');
    expect(initialQuality(true)).toBe('baixa');
    expect(stepDown('baixa')).toBeNull();
  });
  it('desce um degrau quando o quadro não segura, e nunca abaixo da baixa', () => {
    const g = new QualityGovernor('alta');
    const run = (fps: number, s: number) => {
      const out: string[] = [];
      for (let t = 0; t < s; t += 1 / fps) {
        const q = g.frame(1 / fps);
        if (q) out.push(q);
      }
      return out;
    };
    expect(run(60, 30)).toEqual([]);
    expect(run(20, 12)).toEqual(['media']);
    expect(run(20, 40)).toEqual(['baixa']);
    expect(g.quality).toBe('baixa');
    // quadro perdido de aba oculta não conta
    expect(g.frame(2)).toBeNull();
  });
});
