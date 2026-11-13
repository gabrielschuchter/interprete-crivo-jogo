import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type { LampSpec } from '../world/builder';
import { Ps2, readPs2Preset } from './ps2';

export interface EnvPreset {
  skyTop: number;
  skyHorizon: number;
  cloud: number;
  cloudAmount: number;
  fog: number;
  fogDensity: number;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  sun: number;
  sunIntensity: number;
  sunDir: [number, number, number];
  rain: number;
  exposure: number;
  bloom: number;
  /** cor de tonalização das sombras e das altas luzes */
  tintShadow: [number, number, number];
  tintLight: [number, number, number];
  envIntensity: number;
  interior?: boolean;
  moon?: boolean;
  /** lua de olho único (Observatório): disco com íris e pupila em fenda */
  moonEye?: boolean;
}

export type Quality = 'baixa' | 'media' | 'alta';

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uVignette: { value: 1 },
    uGrain: { value: 1 },
    uShadow: { value: new THREE.Vector3(0.96, 0.98, 1.06) },
    uLight: { value: new THREE.Vector3(1.05, 1.0, 0.94) },
    uContrast: { value: 1.08 },
    uFlash: { value: 0 },
    uDesat: { value: 0 },
    uHighContrast: { value: 0 },
    uLevels: { value: 31 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime, uVignette, uGrain, uContrast, uFlash, uDesat, uHighContrast, uLevels;
    uniform vec3 uShadow, uLight; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    // matriz de Bayer 4x4: o pontilhado ordenado dos quadros de 16 bits da era PS2
    float b2(vec2 a){ a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
    float bayer4(vec2 a){ return b2(0.5 * a) * 0.25 + b2(a); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.299,0.587,0.114));
      c.rgb *= mix(uShadow, uLight, smoothstep(0.0, 0.55, l));
      c.rgb = (c.rgb - 0.18) * uContrast + 0.18;
      c.rgb = mix(c.rgb, vec3(l), uDesat);
      c.rgb = mix(c.rgb, c.rgb * 1.35 + 0.03, uHighContrast);
      vec2 d = vUv - 0.5;
      float v = smoothstep(0.85, 0.25, length(d * vec2(1.0, 0.82)));
      c.rgb *= mix(1.0, mix(0.42, 1.0, v), uVignette);
      c.rgb += (hash(vUv * 900.0 + uTime) - 0.5) * 0.035 * uGrain;
      c.rgb = mix(c.rgb, vec3(0.95,0.9,0.85), uFlash);
      // cor de 15 bits com pontilhado: degradês do céu e da névoa ganham a textura de tela antiga
      if (uLevels > 0.5) c.rgb = floor(max(c.rgb, 0.0) * uLevels + bayer4(gl_FragCoord.xy)) / uLevels;
      gl_FragColor = vec4(max(c.rgb, 0.0), 1.0);
    }`,
};

const SkyShader = {
  uniforms: {
    uTop: { value: new THREE.Color() },
    uHorizon: { value: new THREE.Color() },
    uCloud: { value: new THREE.Color() },
    uAmount: { value: 0.6 },
    uTime: { value: 0 },
    uMoon: { value: new THREE.Vector3(0.3, 0.5, -0.8) },
    uMoonOn: { value: 1 },
    uEye: { value: 0 },
  },
  vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position.z = gl_Position.w; }`,
  fragmentShader: `
    uniform vec3 uTop, uHorizon, uCloud, uMoon; uniform float uAmount, uTime, uMoonOn, uEye; varying vec3 vDir;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
    float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
      return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
    float fbm(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<5;i++){ s+=a*noise(p); p*=2.03; a*=0.5; } return s; }
    void main(){
      vec3 d = normalize(vDir);
      float h = clamp(d.y, -0.2, 1.0);
      vec3 col = mix(uHorizon, uTop, pow(clamp(h,0.0,1.0), 0.55));
      vec2 uv = d.xz / (abs(d.y) + 0.35);
      float n = fbm(uv * 1.3 + vec2(uTime*0.006, uTime*0.003));
      float n2 = fbm(uv * 3.1 - vec2(uTime*0.01, 0.0));
      float c = smoothstep(1.0 - uAmount, 1.25 - uAmount * 0.6, n * 0.75 + n2 * 0.35);
      float md = max(dot(d, normalize(uMoon)), 0.0);
      float glow = pow(md, 24.0) * 0.55 + pow(md, 600.0) * 3.0;
      vec3 lit = uCloud * (0.55 + 0.9 * pow(md, 6.0) * uMoonOn);
      col = mix(col, lit * (0.5 + 0.7 * n2), c * smoothstep(-0.05, 0.25, d.y));
      col += vec3(0.75,0.8,0.9) * glow * uMoonOn * (1.0 - c * 0.85) * (1.0 - 0.8 * uEye);
      if (uEye > 0.5) {
        // lua de olho único: disco pálido, íris fria e pupila em fenda que acompanha o céu devagar
        vec3 m = normalize(uMoon);
        vec3 rt = normalize(cross(vec3(0.0,1.0,0.0), m));
        vec3 up2 = cross(m, rt);
        vec2 q = vec2(dot(d, rt), dot(d, up2)) / 0.13;
        float on = step(0.0, md) * step(0.0, dot(d, m));
        float r = length(q);
        vec2 g = vec2(sin(uTime*0.07), cos(uTime*0.05)) * 0.06;
        float disc = (1.0 - smoothstep(0.96, 1.0, r)) * on;
        float iris = 1.0 - smoothstep(0.42, 0.46, length(q - g));
        float ring = smoothstep(0.30, 0.42, length(q - g)) * iris;
        float slit = 1.0 - smoothstep(0.045, 0.075, abs(q.x - g.x) * (1.0 + 2.2 * abs(q.y - g.y)));
        slit *= 1.0 - smoothstep(0.30, 0.34, abs(q.y - g.y));
        vec3 sclera = vec3(0.58, 0.63, 0.76);
        vec3 eye = mix(sclera, vec3(0.35, 0.45, 0.70), iris);
        eye = mix(eye, vec3(0.16, 0.20, 0.36), ring * 0.8);
        eye = mix(eye, vec3(0.02, 0.02, 0.05), slit);
        eye *= 0.55 + 0.45 * smoothstep(1.0, 0.2, r);
        col = mix(col, eye, disc * (1.0 - c * 0.8));
      }
      gl_FragColor = vec4(col, 1.0);
    }`,
};

const MAX_LAMPS = 6;

export class Engine {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.18, 600);
  composer: EffectComposer;
  bloom: UnrealBloomPass;
  grade: ShaderPass;
  hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 0.5);
  sun = new THREE.DirectionalLight(0xffffff, 1);
  sky: THREE.Mesh;
  private skyMat: THREE.ShaderMaterial;
  private pmrem: THREE.PMREMGenerator;
  private envTarget: THREE.WebGLRenderTarget | null = null;
  private lampPool: THREE.PointLight[] = [];
  private lampTargets: Array<LampSpec | null> = [];
  lamps: LampSpec[] = [];
  rain: THREE.LineSegments;
  private rainMat: THREE.ShaderMaterial;
  env!: EnvPreset;
  quality: Quality = 'alta';
  /** camada PS2 (padrão); null quando a Aparência é Limpa */
  ps2: Ps2 | null = null;
  time = 0;
  shake = 0;
  flash = 0;
  private fogAmount = 1;
  settings = { vignette: true, grain: true, reduceMotion: false, highContrast: false, fov: 58 };

  /** Aparência com que a cena foi montada; trocar exige recarregar, porque a camada altera os materiais */
  readonly aparencia: 'ps2' | 'limpa';

  constructor(canvas: HTMLCanvasElement, aparencia: 'ps2' | 'limpa' = 'ps2') {
    this.aparencia = aparencia;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    // sombras de borda dura e mapa menor: mais perto do visual da época e mais barato
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene.fog = new THREE.FogExp2(0x101418, 0.02);
    this.scene.add(this.hemi);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.06;
    const sc = this.sun.shadow.camera;
    sc.left = -32;
    sc.right = 32;
    sc.top = 32;
    sc.bottom = -32;
    sc.near = 1;
    sc.far = 160;
    this.scene.add(this.sun, this.sun.target);

    this.skyMat = new THREE.ShaderMaterial({ ...SkyShader, uniforms: THREE.UniformsUtils.clone(SkyShader.uniforms), side: THREE.BackSide, depthWrite: false, fog: false });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(400, 24, 16), this.skyMat);
    this.sky.frustumCulled = false;
    this.sky.renderOrder = -10;
    this.scene.add(this.sky);
    this.pmrem = new THREE.PMREMGenerator(this.renderer);

    for (let i = 0; i < MAX_LAMPS; i++) {
      const l = new THREE.PointLight(0xffb060, 0, 14, 1.6);
      this.lampPool.push(l);
      this.lampTargets.push(null);
      this.scene.add(l);
    }

    // chuva: riscos em volume ao redor da câmera, animados no vertex shader
    const N = 2600;
    const pos = new Float32Array(N * 6);
    const seed = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) {
      const x = (Math.random() - 0.5) * 44;
      const y = Math.random() * 22;
      const z = (Math.random() - 0.5) * 44;
      pos.set([x, y, z, x, y, z], i * 6);
      seed.set([0, 1], i * 2);
    }
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    rg.setAttribute('end', new THREE.BufferAttribute(seed, 1));
    this.rainMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uAmount: { value: 0 } },
      vertexShader: `uniform float uTime; uniform vec3 uCam; attribute float end; varying float vA;
        void main(){ vec3 p = position; float sp = 17.0 + fract(p.x * 7.13) * 6.0;
          // cada gota tem comprimento e opacidade próprios; as distantes somem antes
          float h = fract(position.z * 3.71 + position.x * 1.37);
          p.y = mod(p.y - uTime * sp, 22.0);
          p.xz = mod(p.xz - uCam.xz + 22.0, 44.0) - 22.0 + uCam.xz; p.y += uCam.y - 7.0 + end * (0.2 + 0.42 * h); p.x += end * 0.05;
          float d = distance(p.xz, uCam.xz);
          vA = (1.0 - end * 0.6) * (0.3 + 0.7 * fract(h * 7.0)) * (0.35 + 0.65 * smoothstep(22.0, 5.0, d)); gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0); }`,
      fragmentShader: `uniform float uAmount; varying float vA; void main(){ gl_FragColor = vec4(0.72, 0.78, 0.88, 0.2 * vA * uAmount); }`,
      transparent: true,
      depthWrite: false,
    });
    this.rain = new THREE.LineSegments(rg, this.rainMat);
    this.rain.frustumCulled = false;
    this.scene.add(this.rain);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(640, 360), 0.6, 0.7, 0.82);
    this.composer.addPass(this.bloom);
    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(new OutputPass());
    this.composer.addPass(this.grade);
    const art = readPs2Preset(aparencia);
    if (art) {
      this.ps2 = new Ps2(art);
      this.composer.addPass(this.ps2.pass);
      this.scene.fog = new THREE.Fog(0x101418, 6, 70);
      canvas.style.imageRendering = art.ampliacao === 'pixel' ? 'pixelated' : 'auto';
      document.documentElement.dataset.arte = 'ps2';
      // a camada PS2 já quantiza com dither: o do GradeShader sai para não pontilhar duas vezes
      this.grade.uniforms.uLevels.value = 0;
    } else {
      // Aparência Limpa (ou ?arte=off): a interface também volta à versão sem moldura de época
      document.documentElement.removeAttribute('data-arte');
    }
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    // resolução interna de console antigo: 540, 480 ou 400 linhas, ampliadas com filtro suave (direção PS2 e o
    // maior ganho de desempenho). Com ?arte=, a camada opcional de src/core/ps2.ts decide a proporção.
    const lines = this.quality === 'baixa' ? 400 : this.quality === 'media' ? 480 : 540;
    const ratio = this.ps2 ? this.ps2.pixelRatioFor(h) : Math.min(window.devicePixelRatio, lines / Math.max(1, h));
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(w, h, false);
    this.ps2?.setSize(w, h, ratio);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.fov = this.settings.fov;
    this.camera.updateProjectionMatrix();
  }

  setQuality(q: Quality): void {
    this.quality = q;
    this.renderer.shadowMap.enabled = q !== 'baixa';
    this.sun.castShadow = q !== 'baixa';
    this.sun.shadow.mapSize.set(q === 'alta' ? 1024 : 512, q === 'alta' ? 1024 : 512);
    this.sun.shadow.map?.dispose();
    this.sun.shadow.map = null as unknown as THREE.WebGLRenderTarget;
    this.bloom.enabled = q !== 'baixa';
    this.scene.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | undefined;
      if (m) m.needsUpdate = true;
    });
    this.resize();
  }

  /**
   * Compila os shaders da cena em paralelo (KHR_parallel_shader_compile) e espera ficarem prontos, sem travar a
   * tela de carga. Não usa renderer.compileAsync: se um material for descartado durante a espera, ele lança erro
   * dentro de um setTimeout próprio e a promessa nunca resolve. Aqui o material sem programa sai da lista.
   */
  async precompile(scene: THREE.Object3D, maxMs = 15000): Promise<void> {
    let mats: Set<THREE.Material>;
    try {
      mats = this.renderer.compile(scene, this.camera) as unknown as Set<THREE.Material>;
    } catch {
      return;
    }
    const t0 = performance.now();
    while (mats.size && performance.now() - t0 < maxMs) {
      for (const m of mats) {
        const prog = (this.renderer.properties.get(m) as { currentProgram?: { isReady(): boolean } }).currentProgram;
        if (!prog || prog.isReady()) mats.delete(m);
      }
      if (mats.size) await new Promise((r) => setTimeout(r, 16));
    }
  }

  applyEnv(e: EnvPreset): void {
    this.env = e;
    const u = this.skyMat.uniforms;
    u.uTop.value.set(e.skyTop);
    u.uHorizon.value.set(e.skyHorizon);
    u.uCloud.value.set(e.cloud);
    u.uAmount.value = e.cloudAmount;
    u.uMoonOn.value = e.moon === false ? 0 : 1;
    u.uEye.value = e.moonEye ? 1 : 0;
    u.uMoon.value.set(...e.sunDir).normalize();
    if (this.ps2) this.ps2.fog(this.scene, e.fog, e.fogDensity * this.fogAmount);
    else {
      (this.scene.fog as THREE.FogExp2).color.set(e.fog);
      (this.scene.fog as THREE.FogExp2).density = e.fogDensity * this.fogAmount;
    }
    this.hemi.color.set(e.hemiSky);
    this.hemi.groundColor.set(e.hemiGround);
    this.hemi.intensity = e.hemiIntensity;
    this.sun.color.set(e.sun);
    this.sun.intensity = e.sunIntensity;
    this.renderer.toneMappingExposure = e.exposure;
    this.bloom.strength = this.ps2 ? Math.min(e.bloom, this.ps2.preset.bloom) : e.bloom;
    this.rainMat.uniforms.uAmount.value = e.rain;
    this.rain.visible = e.rain > 0.01;
    this.sky.visible = !e.interior;
    this.scene.background = e.interior ? new THREE.Color(e.fog) : null;
    (this.grade.uniforms.uShadow.value as THREE.Vector3).set(...e.tintShadow);
    (this.grade.uniforms.uLight.value as THREE.Vector3).set(...e.tintLight);
    // mapa de ambiente a partir do próprio céu: reflexos coerentes na pedra molhada
    const envScene = new THREE.Scene();
    const s2 = new THREE.Mesh(this.sky.geometry, this.skyMat);
    envScene.add(s2);
    if (e.interior) envScene.background = new THREE.Color(e.hemiSky).multiplyScalar(0.5);
    this.envTarget?.dispose();
    this.envTarget = this.pmrem.fromScene(envScene, 0.02, 1, 500);
    this.scene.environment = this.envTarget.texture;
    this.scene.environmentIntensity = e.envIntensity;
  }

  setFogAmount(a: number): void {
    this.fogAmount = a;
    if (this.env && this.ps2) this.ps2.fog(this.scene, this.env.fog, this.env.fogDensity * a);
    else if (this.env) (this.scene.fog as THREE.FogExp2).density = this.env.fogDensity * a;
  }

  setLamps(lamps: LampSpec[]): void {
    this.lamps = lamps;
    for (let i = 0; i < MAX_LAMPS; i++) {
      this.lampTargets[i] = null;
      this.lampPool[i].intensity = 0;
    }
  }

  /** Distribui o pool de luzes pontuais pelas lamparinas mais próximas do foco. */
  private updateLamps(focus: THREE.Vector3, dt: number): void {
    const sorted = this.lamps
      .map((l) => ({ l, d: l.pos.distanceToSquared(focus) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, MAX_LAMPS)
      .map((o) => o.l);
    // mantém atribuições estáveis para evitar saltos
    for (let i = 0; i < MAX_LAMPS; i++) {
      const cur = this.lampTargets[i];
      if (cur && !sorted.includes(cur)) {
        this.lampPool[i].intensity = Math.max(0, this.lampPool[i].intensity - dt * 30);
        if (this.lampPool[i].intensity <= 0.01) this.lampTargets[i] = null;
      }
    }
    for (const l of sorted) {
      if (this.lampTargets.includes(l)) continue;
      const free = this.lampTargets.indexOf(null);
      if (free < 0) break;
      this.lampTargets[free] = l;
      this.lampPool[free].position.copy(l.pos);
      this.lampPool[free].color.set(l.color);
      this.lampPool[free].distance = l.range;
      this.lampPool[free].intensity = 0;
    }
    for (let i = 0; i < MAX_LAMPS; i++) {
      const l = this.lampTargets[i];
      if (!l || !sorted.includes(l)) continue;
      const fl = 1 + Math.sin(this.time * 9 + i * 2.1) * l.flicker + Math.sin(this.time * 23 + i) * l.flicker * 0.5;
      const target = l.intensity * 26 * fl;
      const p = this.lampPool[i];
      p.intensity += (target - p.intensity) * Math.min(1, dt * 6);
    }
  }

  render(dt: number, focus: THREE.Vector3): void {
    this.time += dt;
    this.skyMat.uniforms.uTime.value = this.time;
    this.rainMat.uniforms.uTime.value = this.time;
    (this.rainMat.uniforms.uCam.value as THREE.Vector3).copy(this.camera.position);
    this.sky.position.copy(this.camera.position);
    this.updateLamps(focus, dt);
    // a luz direcional acompanha o foco para manter a sombra nítida perto do jogador
    const d = this.env.sunDir;
    this.sun.position.set(focus.x + d[0] * 60, focus.y + d[1] * 60, focus.z + d[2] * 60);
    this.sun.target.position.copy(focus);
    const g = this.grade.uniforms;
    g.uTime.value = this.time;
    g.uVignette.value = this.settings.vignette ? 1 : 0;
    g.uGrain.value = this.settings.grain ? 1 : 0;
    g.uHighContrast.value = this.settings.highContrast ? 1 : 0;
    this.flash = Math.max(0, this.flash - dt * 2.5);
    g.uFlash.value = this.settings.reduceMotion ? 0 : this.flash;
    if (this.shake > 0 && !this.settings.reduceMotion) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake * 0.25;
      this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.25;
      this.shake = Math.max(0, this.shake - dt * 2.2);
    } else this.shake = 0;
    this.ps2?.sweep(this.scene, dt);
    if (this.quality === 'baixa' && !this.ps2) this.renderer.render(this.scene, this.camera);
    else this.composer.render(dt);
  }
}
