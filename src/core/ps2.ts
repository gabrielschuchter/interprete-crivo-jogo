/**
 * Camada de aparência PS2, opt-in. Protótipo de comparação da direção de arte
 * (docs/game/DIRECAO_DE_ARTE_PS2.md); sem o parâmetro ?arte=, nada muda no jogo.
 *
 * Quatro peças, na ordem em que atuam: resolução interna baixa com ampliação sem
 * suavização, vértices presos a uma grade de tela, texturas sem filtro suave e
 * névoa linear colorida, e um passe final que quantiza as cores com dither ordenado.
 * Os números de cada predefinição vêm de design/ps2/ps2.tokens.json.
 */
import * as THREE from 'three';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import tokens from '../../design/ps2/ps2.tokens.json';

export interface Ps2Preset {
  nome: string;
  alturaInterna: number;
  niveis: number;
  dither: number;
  snap: number;
  saturacao: number;
  crush: number;
  nevoaPerto: number;
  nevoaLonge: number;
  bloom: number;
  textura: 'nearest' | 'linear';
  ampliacao: 'pixel' | 'suave';
}

const PRESETS = tokens.render.predefinicoes as Record<string, Ps2Preset>;

/** Lê ?arte=a|b|c|ps2 (ou o valor guardado em localStorage). 'off' ou ausente desliga. */
export function readPs2Preset(): Ps2Preset | null {
  let q = '';
  try {
    q = new URLSearchParams(location.search).get('arte') ?? localStorage.getItem('interprete-arte') ?? '';
  } catch {
    /* sem acesso ao armazenamento: segue desligado */
  }
  if (q === '' || q === 'off') return null;
  if (q === '1' || q === 'on') q = tokens.render.padrao;
  return PRESETS[q] ?? null;
}

const Ps2Shader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uRes: { value: new THREE.Vector2(640, 448) },
    uLevels: { value: 32 },
    uDither: { value: 0.7 },
    uSat: { value: 0.72 },
    uCrush: { value: 0.03 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uLevels, uDither, uSat, uCrush; varying vec2 vUv;
    float bayer4(vec2 p){
      vec2 q = mod(p, 4.0);
      float x = q.x, y = q.y;
      float a = mod(x, 2.0), b = mod(y, 2.0);
      float lo = (a == 0.0) ? ((b == 0.0) ? 0.0 : 2.0) : ((b == 0.0) ? 3.0 : 1.0);
      float hx = floor(x / 2.0), hy = floor(y / 2.0);
      float hi = (hx == 0.0) ? ((hy == 0.0) ? 0.0 : 2.0) : ((hy == 0.0) ? 3.0 : 1.0);
      return (lo * 4.0 + hi) / 16.0;
    }
    void main(){
      vec2 px = floor(vUv * uRes);
      vec3 c = texture2D(tDiffuse, (px + 0.5) / uRes).rgb;
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      c = mix(vec3(l), c, uSat);
      c = max(c - uCrush, 0.0) / (1.0 - uCrush);
      c += (bayer4(px) - 0.5) * uDither / uLevels;
      c = floor(c * uLevels + 0.5) / uLevels;
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`,
};

export class Ps2 {
  readonly pass: ShaderPass;
  /** compartilhado por todos os materiais que prendem vértices */
  private snapRes = { value: new THREE.Vector2(320, 224) };
  private done = new WeakSet<THREE.Material>();
  private lastCount = -1;
  private sweepClock = 0;

  constructor(readonly preset: Ps2Preset) {
    this.pass = new ShaderPass(Ps2Shader);
    const u = this.pass.uniforms;
    u.uLevels.value = preset.niveis;
    u.uDither.value = preset.dither;
    u.uSat.value = preset.saturacao;
    u.uCrush.value = preset.crush;
  }

  /** Ajusta o buffer de desenho para a altura interna do preset e devolve a razão de pixels. */
  pixelRatioFor(cssHeight: number): number {
    return this.preset.alturaInterna / Math.max(1, cssHeight);
  }

  setSize(cssW: number, cssH: number, ratio: number): void {
    const w = Math.max(1, Math.round(cssW * ratio));
    const h = Math.max(1, Math.round(cssH * ratio));
    this.pass.uniforms.uRes.value.set(w, h);
    // grade em coordenadas normalizadas (-1..1): w/2 passos por pixel interno, multiplicado pelo fator
    const f = this.preset.snap;
    this.snapRes.value.set((w * f) / 2, (h * f) / 2);
  }

  /** Névoa linear colorida, como nos motores da época. Troca a FogExp2 do motor na primeira chamada. */
  fog(scene: THREE.Scene, color: number, density: number): void {
    const far = this.preset.nevoaLonge / Math.max(0.004, density);
    const near = far * this.preset.nevoaPerto;
    if (!(scene.fog instanceof THREE.Fog)) scene.fog = new THREE.Fog(color, near, far);
    const f = scene.fog as THREE.Fog;
    f.color.set(color);
    f.near = near;
    f.far = far;
  }

  /** Varre a cena de tempos em tempos e aplica snap e filtro de textura aos materiais novos. */
  sweep(scene: THREE.Scene, dt: number, force = false): void {
    this.sweepClock += dt;
    if (!force && this.sweepClock < 0.5) return;
    this.sweepClock = 0;
    let count = 0;
    scene.traverse((o) => {
      count++;
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || (o as THREE.LineSegments).isLineSegments) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) if (m && !this.done.has(m)) this.retro(m);
    });
    this.lastCount = count;
  }

  private retro(m: THREE.Material): void {
    this.done.add(m);
    if ((m as THREE.ShaderMaterial).isShaderMaterial || (m as THREE.RawShaderMaterial).isRawShaderMaterial) return;
    const std = m as THREE.MeshStandardMaterial;
    for (const k of ['map', 'emissiveMap', 'alphaMap', 'lightMap', 'aoMap'] as const) {
      const t = std[k] as THREE.Texture | null | undefined;
      if (!t) continue;
      t.magFilter = this.preset.textura === 'nearest' ? THREE.NearestFilter : THREE.LinearFilter;
      t.minFilter = THREE.LinearMipmapNearestFilter;
      t.anisotropy = 1;
      t.needsUpdate = true;
    }
    // sem mapa de normais nem de rugosidade: o visual da era não os tinha, e eles custam sombra fina que não pertence
    if (std.normalMap) std.normalScale?.set(0, 0);
    if (std.roughnessMap) std.roughness = Math.max(std.roughness ?? 1, 0.85);
    if (std.metalnessMap) std.metalness = Math.min(std.metalness ?? 0, 0.2);
    if (this.preset.snap > 0) {
      const prev = m.onBeforeCompile;
      const prevKey = m.customProgramCacheKey?.bind(m);
      const uni = this.snapRes;
      m.onBeforeCompile = (shader, renderer) => {
        prev?.call(m, shader, renderer);
        shader.uniforms.uPs2Res = uni;
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', `#include <common>\nuniform vec2 uPs2Res;\nvec4 ps2Snap(vec4 p){ vec3 n = p.xyz / p.w; n.xy = floor(n.xy * uPs2Res + 0.5) / uPs2Res; return vec4(n * p.w, p.w); }`)
          .replace('#include <project_vertex>', `#include <project_vertex>\n gl_Position = ps2Snap(gl_Position);`);
      };
      m.customProgramCacheKey = () => (prevKey ? prevKey() : '') + '|ps2snap' + this.preset.snap;
      m.needsUpdate = true;
    }
  }
}
