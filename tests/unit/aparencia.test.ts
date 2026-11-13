import { describe, expect, it } from 'vitest';
import { sanitizeSettings, DEFAULT_SETTINGS } from '../../src/core/settings';
import { readPs2Preset } from '../../src/core/ps2';
import tokens from '../../design/ps2/ps2.tokens.json';

describe('aparência da imagem', () => {
  it('a PS2 tardia é o padrão e o antigo padrão gravado passa a ela', () => {
    expect(DEFAULT_SETTINGS.aparencia).toBe('tardia');
    expect(tokens.render.padrao).toBe('tardia');
    expect(sanitizeSettings({ aparencia: 'ps2' }).aparencia).toBe('tardia');
    expect(sanitizeSettings({ aparencia: 'crua' }).aparencia).toBe('crua');
    expect(sanitizeSettings({ aparencia: 'limpa' }).aparencia).toBe('limpa');
    expect(sanitizeSettings({ aparencia: 'ultra' }).aparencia).toBe('tardia');
  });

  it('cada opção dos Ajustes escolhe a predefinição certa', () => {
    expect(readPs2Preset('tardia')?.nome).toBe('PS2 tardia');
    expect(readPs2Preset('crua')?.nome).toBe('Luz de estudo');
    expect(readPs2Preset('limpa')).toBeNull();
  });

  it('a tardia melhora a crua sem sair da era', () => {
    const crua = readPs2Preset('crua')!;
    const tardia = readPs2Preset('tardia')!;
    const linhas = tardia.alturaPorQualidade!;
    // mais linhas que a crua só onde há folga; em Qualidade baixa (padrão no celular) o custo é o mesmo
    expect(linhas.baixa).toBe(crua.alturaInterna);
    expect(linhas.alta).toBeGreaterThan(crua.alturaInterna);
    expect(linhas.alta).toBeLessThanOrEqual(720);
    // dither mais fino, mas ainda quantizado; grade de vértices mais fina, mas ainda ligada
    expect(tardia.niveis).toBeGreaterThan(crua.niveis);
    expect(tardia.niveis).toBeLessThanOrEqual(64);
    expect(tardia.snap).toBeGreaterThan(crua.snap);
    expect(tardia.saturacao).toBeLessThan(1);
    expect(tardia.suavizar).toBeGreaterThan(0);
    expect(tardia.suavizar).toBeLessThanOrEqual(1);
  });
});
