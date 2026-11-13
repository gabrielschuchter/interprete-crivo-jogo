import type { EnvPreset } from '../core/engine';

/** Atmosferas. A noite nunca é invisível; cada área tem uma cor de acento. */
export const ENV: Record<string, EnvPreset> = {
  atrioNoiteChuva: {
    skyTop: 0x0c1220, skyHorizon: 0x3a465e, cloud: 0x66758f, cloudAmount: 0.8,
    fog: 0x222b3c, fogDensity: 0.015,
    hemiSky: 0x7f95c0, hemiGround: 0x2a1e20, hemiIntensity: 1.0,
    sun: 0xa9c0ea, sunIntensity: 2.1, sunDir: [0.42, 0.72, 0.5],
    rain: 1, exposure: 1.05, bloom: 0.62,
    tintShadow: [0.94, 0.99, 1.1], tintLight: [1.07, 1.0, 0.9], envIntensity: 0.75, moon: true,
  },
  atrioEntardecer: {
    skyTop: 0x1c1c33, skyHorizon: 0x9a5a48, cloud: 0x8a5a5a, cloudAmount: 0.6,
    fog: 0x3a2a36, fogDensity: 0.012,
    hemiSky: 0x8a7a9c, hemiGround: 0x2a1c1a, hemiIntensity: 0.7,
    sun: 0xffb27a, sunIntensity: 2.0, sunDir: [-0.7, 0.35, 0.3],
    rain: 0, exposure: 1.0, bloom: 0.55,
    tintShadow: [0.96, 0.95, 1.1], tintLight: [1.08, 1.0, 0.9], envIntensity: 0.8, moon: true,
  },
  atrioAmanhecer: {
    skyTop: 0x4a5f86, skyHorizon: 0xe2b58c, cloud: 0xd8c0b0, cloudAmount: 0.42,
    fog: 0x8f8f9c, fogDensity: 0.008,
    hemiSky: 0xb9c4dc, hemiGround: 0x4a3a34, hemiIntensity: 0.95,
    sun: 0xffd9a8, sunIntensity: 2.6, sunDir: [0.75, 0.42, 0.25],
    rain: 0, exposure: 0.92, bloom: 0.4,
    tintShadow: [0.97, 0.98, 1.06], tintLight: [1.05, 1.0, 0.93], envIntensity: 0.9, moon: true,
  },
  bosque: {
    skyTop: 0x07110f, skyHorizon: 0x1e3a33, cloud: 0x2f5348, cloudAmount: 0.85,
    fog: 0x142a26, fogDensity: 0.034,
    hemiSky: 0x5d9483, hemiGround: 0x1a1a12, hemiIntensity: 0.6,
    sun: 0x9fd6c0, sunIntensity: 1.1, sunDir: [-0.3, 0.8, 0.4],
    rain: 0.25, exposure: 1.08, bloom: 0.7,
    tintShadow: [0.92, 1.04, 1.02], tintLight: [1.06, 1.0, 0.9], envIntensity: 0.6, moon: true,
  },
  bosqueLimpo: {
    skyTop: 0x0c1a22, skyHorizon: 0x3d5f58, cloud: 0x55786c, cloudAmount: 0.6,
    fog: 0x23403a, fogDensity: 0.02,
    hemiSky: 0x7fb3a2, hemiGround: 0x20200f, hemiIntensity: 0.75,
    sun: 0xc8e6d0, sunIntensity: 1.5, sunDir: [-0.3, 0.8, 0.4],
    rain: 0, exposure: 1.05, bloom: 0.6,
    tintShadow: [0.94, 1.03, 1.02], tintLight: [1.06, 1.0, 0.92], envIntensity: 0.7, moon: true,
  },
  arquivo: {
    skyTop: 0x0a0806, skyHorizon: 0x120c08, cloud: 0x000000, cloudAmount: 0,
    fog: 0x0e0a08, fogDensity: 0.022,
    hemiSky: 0x6a4f3a, hemiGround: 0x1a100c, hemiIntensity: 0.42,
    sun: 0x6f86c0, sunIntensity: 0.5, sunDir: [0.5, 0.75, -0.3],
    rain: 0, exposure: 1.1, bloom: 0.75,
    tintShadow: [0.98, 0.97, 1.05], tintLight: [1.08, 1.0, 0.88], envIntensity: 0.35, interior: true, moon: false,
  },
  observatorio: {
    skyTop: 0x060914, skyHorizon: 0x1c2a4a, cloud: 0x39466a, cloudAmount: 0.7,
    fog: 0x131a2c, fogDensity: 0.02,
    hemiSky: 0x6478b0, hemiGround: 0x1c1420, hemiIntensity: 0.6,
    sun: 0xa8baf0, sunIntensity: 1.4, sunDir: [-0.4, 0.7, -0.45],
    rain: 0.6, exposure: 1.05, bloom: 0.7,
    tintShadow: [0.93, 0.97, 1.12], tintLight: [1.05, 1.0, 0.94], envIntensity: 0.8, moon: true, moonEye: true,
  },
};
