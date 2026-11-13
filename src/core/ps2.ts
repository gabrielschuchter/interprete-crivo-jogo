/**
 * Imagem PS2 tardia "Luz de estudo" (docs/game/DIRECAO_DE_ARTE_PS2.md), a única do jogo: o fim da geração, com
 * God of War e RE4 como teto. Os números vêm de design/ps2/ps2.tokens.json (render.imagem).
 *
 * Peças, na ordem em que atuam: resolução interna baixa conforme a qualidade, ampliada com filtro suave;
 * vértices presos a uma grade fina de tela; texturas com mipmaps trilineares e anisotropia; névoa linear
 * colorida com uma camada rasteira por cima; e um passe final com anti-serrilhado leve por luma, que quantiza
 * as cores com dither ordenado.
 */
import * as THREE from 'three';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import tokens from '../../design/ps2/ps2.tokens.json';

export interface Ps2Preset {
  nome: string;
  alturaPorQualidade: { baixa: number; media: number; alta: number };
  niveis: number;
  dither: number;
  snap: number;
  saturacao: number;
  crush: number;
  nevoaPerto: number;
  nevoaLonge: number;
  bloom: number;
  anisotropia: number;
  suavizar: number;
  nevoaBaixa: number;
  nevoaAlturaM: number;
  contraste: number;
}

export const PS2_IMAGEM: Ps2Preset = tokens.render.imagem;

const Ps2Shader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uRes: { value: new THREE.Vector2(640, 448) },
    uLevels: { value: 32 },
    uDither: { value: 0.7 },
    uSat: { value: 0.72 },
    uCrush: { value: 0.03 },
    uSoft: { value: 0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uLevels, uDither, uSat, uCrush, uSoft; varying vec2 vUv;
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
      if (uSoft > 0.0) {
        // anti-serrilhado leve: só onde a luma muda de um vizinho para outro, a borda puxa para a média da cruz.
        // Amacia a escada das silhuetas como o filtro de saída das TVs de tubo, sem borrar a textura plana
        vec3 n = texture2D(tDiffuse, (px + vec2(0.5, 1.5)) / uRes).rgb;
        vec3 s = texture2D(tDiffuse, (px + vec2(0.5, -0.5)) / uRes).rgb;
        vec3 e = texture2D(tDiffuse, (px + vec2(1.5, 0.5)) / uRes).rgb;
        vec3 w = texture2D(tDiffuse, (px + vec2(-0.5, 0.5)) / uRes).rgb;
        vec3 k = vec3(0.299, 0.587, 0.114);
        float ln = dot(n, k), ls = dot(s, k), le = dot(e, k), lw = dot(w, k), lc = dot(c, k);
        float span = max(max(max(ln, ls), max(le, lw)), lc) - min(min(min(ln, ls), min(le, lw)), lc);
        float edge = smoothstep(0.03, 0.16, span);
        c = mix(c, (n + s + e + w + c * 2.0) / 6.0, edge * uSoft);
      }
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      c = mix(vec3(l), c, uSat);
      c = max(c - uCrush, 0.0) / (1.0 - uCrush);
      c += (bayer4(px) - 0.5) * uDither / uLevels;
      c = floor(c * uLevels + 0.5) / uLevels;
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`,
};

/** Conta cada `add` em qualquer Object3D: sinal barato de que a cena ganhou objetos desde a última varredura. */
let addVersion = 0;
let hooked = false;
function hookAdd(): void {
  if (hooked) return;
  hooked = true;
  const add = THREE.Object3D.prototype.add;
  THREE.Object3D.prototype.add = function (this: THREE.Object3D, ...objs: THREE.Object3D[]) {
    addVersion++;
    return add.apply(this, objs);
  };
}

export class Ps2 {
  readonly pass: ShaderPass;
  /** compartilhado por todos os materiais que prendem vértices */
  private snapRes = { value: new THREE.Vector2(320, 224) };
  private done = new WeakSet<THREE.Material>();
  private texDone = new WeakSet<THREE.Texture>();
  private lastCount = -1;
  private sweepClock = 0;
  private seenVersion = -1;

  constructor(readonly preset: Ps2Preset) {
    hookAdd();
    this.mist.value = preset.nevoaBaixa;
    this.mistH.value = preset.nevoaAlturaM;
    this.pass = new ShaderPass(Ps2Shader);
    const u = this.pass.uniforms;
    u.uLevels.value = preset.niveis;
    u.uDither.value = preset.dither;
    u.uSat.value = preset.saturacao;
    u.uCrush.value = preset.crush;
    u.uSoft.value = preset.suavizar;
  }

  /**
   * Altura interna do buffer conforme a qualidade (escolhida pelo jogo); nunca passa da altura real da tela,
   * para não desenhar pixels que o navegador vai descartar.
   */
  linhas(cssHeight: number, quality: 'baixa' | 'media' | 'alta' = 'alta'): number {
    const alvo = this.preset.alturaPorQualidade[quality];
    return Math.min(alvo, Math.max(1, cssHeight) * Math.min(2, window.devicePixelRatio || 1));
  }

  /** Ajusta o buffer de desenho para a altura interna do preset e devolve a razão de pixels. */
  pixelRatioFor(cssHeight: number, quality: 'baixa' | 'media' | 'alta' = 'alta'): number {
    return this.linhas(cssHeight, quality) / Math.max(1, cssHeight);
  }

  /** Névoa rasteira: força, altura em que some e o chão de referência, que acompanha o jogador. */
  private mist = { value: 0 };
  private mistH = { value: 1.8 };
  private mistBase = { value: 0 };
  private mistReady = false;
  /** O chão da névoa segue os pés do jogador devagar, para o pulo não levantar a camada junto. */
  follow(y: number, dt: number): void {
    if (!this.mistReady) {
      this.mistBase.value = y;
      this.mistReady = true;
    } else this.mistBase.value += (y - this.mistBase.value) * Math.min(1, dt * 1.5);
  }

  setSize(cssW: number, cssH: number, ratio: number): void {
    const w = Math.max(1, Math.round(cssW * ratio));
    const h = Math.max(1, Math.round(cssH * ratio));
    this.pass.uniforms.uRes.value.set(w, h);
    // grade em coordenadas normalizadas (-1..1): w/2 passos por pixel interno, multiplicado pelo fator
    const f = this.preset.snap;
    this.snapRes.value.set((w * f) / 2, (h * f) / 2);
  }

  /** Névoa linear colorida, como nos motores da época: perto e longe a partir da densidade de cada região. */
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
  sweep(scene: THREE.Object3D, dt: number, force = false): void {
    this.sweepClock += dt;
    // algo entrou na cena (jogador, inimigo, corpo glTF que acabou de chegar): varre já, antes do quadro, para o
    // objeto novo compilar uma vez só com o shader da era, e não primeiro o comum e depois o PS2
    const added = addVersion !== this.seenVersion;
    if (!force && !added && this.sweepClock < 0.5) return;
    this.seenVersion = addVersion;
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
      // cada textura é ajustada uma vez: materiais clonados por figura compartilham a textura, e marcar
      // needsUpdate de novo a cada clone fazia a mesma imagem subir para a placa outra vez a cada personagem
      if (!t || this.texDone.has(t)) continue;
      this.texDone.add(t);
      t.magFilter = THREE.LinearFilter;
      // trilinear: a troca de mipmap vira um degradê, sem a faixa que corria no piso à frente da câmera
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.anisotropy = this.preset.anisotropia;
      t.needsUpdate = true;
    }
    // sem mapa de normais nem de rugosidade: o visual da era não os tinha, e eles custam sombra fina que não pertence.
    // Os mapas saem do material (antes só zerava a escala): cada combinação de mapas é um programa de shader a
    // mais para compilar na carga, e cada mapa é uma textura a mais para subir para a placa de vídeo
    if (std.normalMap) std.normalMap = null;
    if (std.roughnessMap) {
      std.roughnessMap = null;
      std.roughness = Math.max(std.roughness ?? 1, 0.85);
    }
    if (std.metalnessMap) {
      std.metalnessMap = null;
      std.metalness = Math.min(std.metalness ?? 0, 0.2);
    }
    m.needsUpdate = true;
    const snap = this.preset.snap > 0;
    const mist = this.mist.value > 0;
    if (snap || mist) {
      const prev = m.onBeforeCompile;
      const prevKey = m.customProgramCacheKey?.bind(m);
      const uni = this.snapRes;
      const { mist: uMist, mistH, mistBase } = this;
      m.onBeforeCompile = (shader, renderer) => {
        prev?.call(m, shader, renderer);
        let vs = shader.vertexShader;
        let fs = shader.fragmentShader;
        if (snap) {
          shader.uniforms.uPs2Res = uni;
          vs = vs
            .replace('#include <common>', `#include <common>\nuniform vec2 uPs2Res;\nvec4 ps2Snap(vec4 p){ if (p.w < 0.5 || p.w > 30.0) return p; vec3 n = p.xyz / p.w; if (max(abs(n.x), abs(n.y)) > 1.25) return p; n.xy = floor(n.xy * uPs2Res + 0.5) / uPs2Res; return vec4(n * p.w, p.w); }`)
            .replace('#include <project_vertex>', `#include <project_vertex>\n gl_Position = ps2Snap(gl_Position);`);
        }
        if (mist && fs.includes('#include <fog_fragment>') && vs.includes('#include <project_vertex>')) {
          // névoa rasteira: uma segunda camada, presa ao chão e um pouco mais clara que a cor da névoa (vapor que pega a
          // luz baixa), aplicada antes da névoa linear de distância. Não começa
          // colada à câmera, para não velar os pés do personagem, e cresce até ~15 m
          shader.uniforms.uPs2Mist = uMist;
          shader.uniforms.uPs2MistH = mistH;
          shader.uniforms.uPs2Base = mistBase;
          vs = vs
            .replace('#include <common>', `#include <common>\nvarying float vPs2Y;`)
            .replace('#include <project_vertex>', `#include <project_vertex>\n{ vec4 ps2W = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\n ps2W = instanceMatrix * ps2W;\n#endif\n vPs2Y = (modelMatrix * ps2W).y; }`);
          fs = fs
            .replace('#include <common>', `#include <common>\nvarying float vPs2Y; uniform float uPs2Mist, uPs2MistH, uPs2Base;`)
            .replace(
              '#include <fog_fragment>',
              `#ifdef USE_FOG\n#ifdef FOG_EXP2\n#include <fog_fragment>\n#else\n float ps2Far = smoothstep(fogNear, fogFar, vFogDepth);\n float ps2Low = uPs2Mist * (1.0 - smoothstep(-0.4, uPs2MistH, vPs2Y - uPs2Base)) * smoothstep(1.2, 15.0, vFogDepth);\n vec3 ps2MistCol = min(fogColor * 1.7 + 0.02, vec3(1.0));\n gl_FragColor.rgb = mix(gl_FragColor.rgb, ps2MistCol, ps2Low * (1.0 - ps2Far));\n gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, ps2Far);\n#endif\n#endif`,
            );
        }
        shader.vertexShader = vs;
        shader.fragmentShader = fs;
      };
      m.customProgramCacheKey = () => (prevKey ? prevKey() : '') + '|ps2snap' + this.preset.snap + (mist ? 'mist' : '');
      m.needsUpdate = true;
    }
  }
}
