/**
 * Orquestração: modos de jogo, regiões, entidades, combate, interações,
 * missões, salvamento. As regras puras ficam em domain/; a narrativa em story.ts.
 */
import * as THREE from 'three';
import { Engine } from './core/engine';
import { Input, DEFAULT_KEYS, type ActionName } from './core/input';
import { AudioSys, type AmbienceLoop, type Surface } from './core/audio';
import { DEFAULT_SETTINGS, loadSettings, storeSettings, type Settings } from './core/settings';
import { UI, type BookTab } from './ui/ui';
import { Player } from './entities/player';
import { loadExternalModel, preloadModels, playerModelKey, HAIRS, type Action } from './entities/figure';
import { DEFAULT_PAD } from './core/input';
import { loadGltf, preloadProps, PROPS_FIRST } from './core/assets';
import { Crivo } from './entities/crivo';
import { Enemy, Projectile, ENEMY_CFG, enemyModelPath, type EnemyCtx, type EnemyKind } from './entities/enemy';
import { Npc, NPCS } from './entities/npc';
import { buildRegion } from './world/index';
import { groundAt, pointBlocked, type BuiltRegion, type PropPlacement, type RegionId } from './world/region';
import { glowSprite } from './world/textures';
import { M } from './world/mats';
import { halo } from './world/kit';
import { ITEMS, PAGES, QUESTS, CASE_LIA, type QuestDef } from './content/data';
import * as D from './domain/state';
import type { GameState, Look, ProfessionId, Reward, SaveAdapter, SkillDef, Stats } from './domain/state';
import type { CaseFeedback, ClinicalCase } from './domain/clinical';
import * as Story from './story';
import { GEAR, RARITY_COLOR, RARITY_LABEL, rollDrop } from './domain/gear';
import { buildWeapon, WEAPON_LOOKS } from './entities/weapons';

/** Piso e laços gravados de cada região. */
const REGION_SOUND: Record<RegionId, { surface: Surface; loops: Partial<Record<AmbienceLoop, number>> }> = {
  atrio: { surface: 'pedra', loops: { salao: 0.12, poca: 0.35 } },
  bosque: { surface: 'terra', loops: { agua: 0.4 } },
  // sala.mp3 é ruído largo (centroide perto de 2 kHz) e soa como chuva no telhado: fora do Arquivo, que é interior seco
  arquivo: { surface: 'pedra', loops: { salao: 0.14 } },
  observatorio: { surface: 'entulho', loops: { poca: 0.3 } },
};

export type Mode = 'boot' | 'splash' | 'menu' | 'create' | 'play' | 'dialogue' | 'book' | 'shop' | 'case' | 'pause' | 'dead' | 'transition' | 'ending';

const SAVE_KEY = 'interprete-rpg-registro-v1';
const localAdapter: SaveAdapter = {
  load: () => {
    try {
      return localStorage.getItem(SAVE_KEY);
    } catch {
      return null;
    }
  },
  save: (d) => {
    try {
      // a gravação anterior fica como cópia: se a nova sair truncada, ainda há de onde retomar
      const prev = localStorage.getItem(SAVE_KEY);
      localStorage.setItem(SAVE_KEY, d);
      if (prev) {
        try {
          localStorage.setItem(SAVE_KEY + '-anterior', prev);
        } catch {
          /* a cópia é opcional */
        }
      }
      return true;
    } catch {
      return false;
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      /* idem */
    }
  },
};

interface PropRt {
  def: PropPlacement;
  obj: THREE.Object3D | null;
  pos: THREE.Vector3;
  own: boolean;
  lid?: THREE.Object3D;
  /** tampa abrindo: tempo desde o gesto (negativo = espera a mão chegar) */
  lidT?: number;
}

interface Spark {
  s: THREE.Sprite;
  v: THREE.Vector3;
  life: number;
  max: number;
  size: number;
}

const SCRIPT_CANCEL = Symbol('cancelado');

export class Game {
  engine: Engine;
  input: Input;
  audio = new AudioSys();
  settings: Settings = loadSettings();
  state: GameState | null = null;
  region!: BuiltRegion;
  player: Player | null = null;
  crivo = new Crivo();
  npcs: Npc[] = [];
  enemies: Enemy[] = [];
  projectiles: Projectile[] = [];
  props: PropRt[] = [];
  mode: Mode = 'boot';
  private prevMode: Mode = 'play';
  private adapter: SaveAdapter = localAdapter;
  private last = performance.now();
  private hitstop = 0;
  private sparks: Spark[] = [];
  private sparkTex = glowSprite(64, 'rgba(255,255,255,1)', 'rgba(255,255,255,0)');
  private pulseRing: THREE.Mesh;
  private pulseT = 0;
  private abilityCd = 0;
  private viewShifted = false;
  private abrigoCd = 0;
  /** puxão lateral acumulado para trocar de alvo travado, em px que decaem em 0,25 s */
  private lockFlick = 0;
  private lockPadPrev = 0;
  lupaT = 0;
  private tracked: string | null = null;
  private secret: { pos: THREE.Vector3; t: number } | null = null;
  private interestId = '';
  private interestTick = 0;
  private menuAngle = 0.4;
  private preview: Player | null = null;
  private wasLocked = false;
  private focus = new THREE.Vector3();
  private lookHint = new THREE.Vector3();
  inCombat = false;
  /** último texto examinado (habilidade Contraste do Crivo) */
  lastExamined = '';
  private combatSeen = false;
  private saveTimer = 0;
  private busy = false;
  frames = 0;
  fps = 0;
  private fpsAcc = 0;
  private fpsN = 0;
  /** registro de erros para os testes */
  errors: string[] = [];

  constructor(canvas: HTMLCanvasElement, public ui: UI) {
    this.engine = new Engine(canvas, this.settings.aparencia);
    this.input = new Input(canvas);
    ui.bind(this);
    this.pulseRing = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1, 64),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff5a78).multiplyScalar(2), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }),
    );
    this.pulseRing.rotation.x = -Math.PI / 2;
    this.pulseRing.visible = false;
    this.engine.scene.add(this.pulseRing, this.crivo.model.root);
    this.crivo.model.root.visible = false;
    this.crivo.onHop = () => this.mode === 'play' && this.audio.sfx('crivo', 0.35);
    canvas.addEventListener('click', () => {
      if (this.mode === 'play' && !this.input.locked) this.input.requestLock();
    });
    const wake = () => {
      this.audio.start();
      this.applyAudio();
      if (this.mode === 'splash') this.openMenu();
    };
    window.addEventListener('keydown', wake);
    window.addEventListener('pointerdown', () => {
      // o toque que abre o menu não pode virar clique no botão que surge sob o dedo
      if (this.mode === 'splash') this.ui.swallowClicks(450);
      wake();
    });
    this.input.onAnyKey = wake;
    window.addEventListener('error', (e) => this.errors.push(String(e.message)));
    window.addEventListener('unhandledrejection', (e) => this.errors.push(String(e.reason)));
    // ao sair, grava também a posição quando ela é segura; em celular quem avisa é pagehide ou a aba oculta
    const leaving = () => (this.mode === 'play' ? this.checkpoint() : this.save());
    window.addEventListener('beforeunload', leaving);
    window.addEventListener('pagehide', leaving);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) return;
      leaving();
      if (this.mode === 'play') this.pauseGame();
    });
    this.input.uiOpen = () => this.mode !== 'play';
    if (this.ui.instant) this.input.enabled = false;
    this.applySettings();
  }

  // ---------- inicialização ----------
  private booting = false;
  async boot(): Promise<void> {
    this.booting = true;
    this.ui.loading(true, 0.1);
    await this.nextPaint();
    const saved = D.deserialize(this.adapter.load());
    const flags = new Set<string>(saved?.flags ?? []);
    // antes do menu, só o corpo que a criação mostra primeiro (feminino, coque) e o do jogo salvo;
    // os outros seis protagonistas descem depois que o menu aparece
    const firstBodies = [...new Set(['player_fem_coque', ...(saved ? [playerModelKey(saved.look)] : [])])];
    // props, personagens e texturas de alta resolução vêm antes da primeira região
    // antes do menu vem só o que o Pátio usa; o resto dos props desce em segundo plano,
    // e uma troca de região espera por ele se o jogador chegar antes
    await Promise.all([
      preloadProps((f) => this.ui.loading(true, 0.1 + f * 0.6), PROPS_FIRST),
      preloadModels(firstBodies),
      this.audio.preload(),
    ]);
    await this.loadRegion('atrio', flags, (p) => this.ui.loading(true, 0.7 + p * 0.3));
    // o boneco da criação (corpo padrão) e o Crivo compilam aqui, atrás da barra: a tela de criação abria com
    // vinte e tantos shaders novos de uma vez
    this.previewAvatar({ skin: 1, hair: 1 + HAIRS.length, coat: 0, body: 'fem' }, 'nutricao');
    await this.warmScene();
    this.clearPreview();
    this.booting = false;
    this.ui.loading(false);
    this.mode = 'splash';
    this.ui.splash(true);
    this.audio.setMood('menu');
    requestAnimationFrame((t) => this.frame(t));
    // o resto dos props e os outros protagonistas descem com o menu já na tela, sem disputar a banda da abertura
    this.restProps = preloadProps();
    void this.restProps.then(() => preloadModels());
  }

  private restProps: Promise<void> = Promise.resolve();
  /**
   * Jogador, Crivo, moradores e inimigos entram na cena depois da região: compila os shaders deles e sobe as
   * texturas ainda com a tela escura, para a travada não cair nos primeiros passos.
   */
  private async warmScene(): Promise<void> {
    // os corpos glTF já estão em cache; a troca do boneco provisório pelo modelo acontece em microtarefas
    await new Promise((r) => setTimeout(r, 0));
    const t0 = performance.now();
    await this.engine.precompile(this.engine.scene, !this.booting);
    this.loadTimes.warm = Math.round(performance.now() - t0);
  }
  private nextPaint(): Promise<void> {
    return new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
  }

  get stats(): Stats {
    return D.computeStats(this.state!);
  }

  // ---------- configurações ----------
  applySettings(): void {
    const s = this.settings;
    const e = this.engine;
    if (e.quality !== s.quality) e.setQuality(s.quality);
    e.settings.vignette = s.vignette;
    e.settings.grain = s.grain;
    e.settings.reduceMotion = s.reduceMotion;
    e.settings.highContrast = s.highContrast;
    if (e.settings.fov !== s.fov) {
      e.settings.fov = s.fov;
      e.resize();
    }
    document.body.classList.toggle('hc', s.highContrast);
    document.body.classList.toggle('rm', s.reduceMotion);
    document.body.classList.toggle('nohud', !s.hud);
    document.body.classList.toggle('big', s.textScale >= 1.3);
    document.documentElement.style.setProperty('--ui-scale', String(s.textScale));
    document.documentElement.style.setProperty('--touch-scale', String(s.touchScale ?? 1));
    document.documentElement.style.setProperty('--hud-scale', String(s.hudScale ?? 1));
    for (const a of Object.keys(DEFAULT_KEYS) as ActionName[]) this.input.keys[a] = s.keys[a] ?? [...DEFAULT_KEYS[a]];
    this.input.pad = { ...(s.pad ?? DEFAULT_PAD) };
    this.input.padDeadzone = s.padDeadzone;
    this.ui.touch.easyRun = s.touchEasyRun;
    this.applyAudio();
    storeSettings(s);
    if (s.aparencia !== e.aparencia) {
      // a camada PS2 mexe nos materiais ao montar a cena; a troca grava o progresso e recarrega
      this.save();
      location.reload();
    }
  }
  private applyAudio(): void {
    const s = this.settings;
    this.audio.volumes = { geral: s.volGeral, musica: s.volMusica, efeitos: s.volEfeitos, ambiente: s.volAmbiente };
    this.audio.applyVolumes();
  }
  resetSettings(): void {
    this.settings = { ...DEFAULT_SETTINGS, keys: {} };
    this.applySettings();
  }

  // ---------- registro ----------
  hasSave(): boolean {
    return !!D.deserialize(this.adapter.load());
  }
  saveSummary(): string {
    const s = D.deserialize(this.adapter.load());
    if (!s) return '';
    const min = Math.round(s.playtime / 60);
    return `${s.name}, nível ${s.level} · ${min < 60 ? min + ' min' : Math.floor(min / 60) + ' h ' + (min % 60) + ' min'}`;
  }
  /** verdadeiro enquanto a última tentativa de gravar falhou */
  saveFailed = false;
  save(): void {
    if (!this.state) return;
    const ok = this.adapter.save(D.serialize(this.state)) !== false;
    if (!ok && !this.saveFailed) this.ui.toast('O navegador recusou a gravação. O progresso desta sessão não está salvo; na pausa há como baixar uma cópia.', 'Registro', 12);
    if (ok && this.saveFailed) this.ui.toast('A gravação voltou a funcionar.', 'Registro');
    this.saveFailed = !ok;
  }
  /** Registro atual em texto, para cópia de segurança fora do navegador. */
  exportSave(): string | null {
    return this.state ? D.serialize(this.state) : this.adapter.load();
  }
  /** Substitui o registro por um arquivo exportado. Devolve falso se o conteúdo não for um registro válido. */
  importSave(text: string): boolean {
    if (!D.deserialize(text)) return false;
    return this.adapter.save(text) !== false;
  }
  /** Há dado gravado que não pôde ser lido? Tenta a cópia anterior antes de desistir. */
  recoverSave(): 'ok' | 'recuperado' | 'ilegivel' {
    const raw = this.adapter.load();
    if (!raw || D.deserialize(raw)) return 'ok';
    try {
      localStorage.setItem(SAVE_KEY + '-ilegivel', raw);
      const prev = localStorage.getItem(SAVE_KEY + '-anterior');
      if (prev && D.deserialize(prev)) {
        localStorage.setItem(SAVE_KEY, prev);
        return 'recuperado';
      }
    } catch {
      /* sem armazenamento */
    }
    return 'ilegivel';
  }
  /** grava também a posição, se for seguro retomar dali */
  checkpoint(): void {
    const s = this.state;
    const p = this.player;
    if (!s || !p) return;
    if (!this.inCombat && !p.falling && !p.dead) {
      s.region = this.region.id;
      s.pos = { x: p.lastSafe.x, y: p.lastSafe.y, z: p.lastSafe.z, yaw: p.yaw };
    }
    this.save();
  }

  // ---------- telas de entrada ----------
  openMenu(): void {
    this.ui.closeAll();
    this.clearPreview();
    this.mode = 'menu';
    this.ui.menu(true);
  }
  openCreate(): void {
    this.ui.closeAll();
    this.mode = 'create';
    this.snapCreateCam = true;
    this.ui.createScreen(true);
  }
  private snapCreateCam = false;
  private clearPreview(): void {
    if (this.preview) this.preview.removeFrom(this.engine.scene);
    this.preview = null;
    if (!this.state) this.crivo.model.root.visible = false;
  }
  previewAvatar(look: Look, prof: ProfessionId): void {
    if (this.preview) this.preview.removeFrom(this.engine.scene);
    const p = (this.preview = new Player(look, prof));
    p.addTo(this.engine.scene);
    p.teleport(0, 0, 13.4, 0.35);
    this.crivo.model.root.visible = true;
    this.crivo.place(1.05, 0, 13.9);
    this.crivo.yaw = 0.2;
  }

  async startNew(name: string, prof: ProfessionId, look: Look): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.state = D.newGame(name, prof, look);
    this.tracked = null;
    this.mode = 'transition';
    await this.ui.fade(true);
    // o corpo escolhido pode ainda estar descendo: o jogo começa com ele, não com o boneco provisório
    await loadExternalModel(playerModelKey(look));
    this.ui.closeAll();
    this.clearPreview();
    await this.loadRegion('atrio', new Set());
    this.spawnPlayer('inicio');
    await this.warmScene();
    this.save();
    this.enterPlay();
    await this.ui.fade(false);
    this.busy = false;
    this.ui.regionTitle(this.region.name, this.region.subtitle);
    this.runScript(() => Story.opening(this), null, true);
  }

  async continueGame(): Promise<void> {
    const s = D.deserialize(this.adapter.load());
    if (!s || this.busy) return;
    this.busy = true;
    this.state = s;
    this.mode = 'transition';
    await this.ui.fade(true);
    this.ui.closeAll();
    this.clearPreview();
    const id = (['atrio', 'bosque', 'arquivo', 'observatorio'].includes(s.region) ? s.region : 'atrio') as RegionId;
    await this.loadRegion(id, new Set(s.flags));
    this.spawnPlayer(null);
    await this.warmScene();
    this.enterPlay();
    await this.ui.fade(false);
    this.busy = false;
    this.ui.regionTitle(this.region.name, this.region.subtitle);
  }

  async toTitle(): Promise<void> {
    this.checkpoint();
    this.mode = 'transition';
    await this.ui.fade(true);
    this.ui.closeAll();
    this.ui.hudVisible(false);
    this.ui.endDialogue();
    const flags = new Set(this.state?.flags ?? []);
    this.despawn();
    this.state = null;
    await this.loadRegion('atrio', flags);
    this.audio.setMood('menu');
    this.audio.setCombat(0);
    this.openMenu();
    await this.ui.fade(false);
  }

  private enterPlay(): void {
    this.mode = 'play';
    this.ui.hudVisible(true);
    this.audio.setMood(this.region.music);
    if (!this.ui.instant) this.input.requestLock();
  }

  // ---------- regiões ----------
  private despawn(): void {
    const sc = this.engine.scene;
    if (this.player) this.player.removeFrom(sc);
    this.player = null;
    for (const n of this.npcs) sc.remove(n.fig.root);
    for (const e of this.enemies) sc.remove(e.root);
    for (const p of this.projectiles) {
      sc.remove(p.mesh);
      p.dispose();
    }
    for (const p of this.props) if (p.own && p.obj) sc.remove(p.obj);
    this.npcs = [];
    this.enemies = [];
    this.projectiles = [];
    this.props = [];
    this.crivo.model.root.visible = false;
  }

  /** tempos da última troca de região, em ms (diagnóstico de desempenho) */
  loadTimes: Record<string, string | number> = {};
  private async loadRegion(id: RegionId, flags: Set<string>, progress?: (p: number) => void): Promise<void> {
    const sc = this.engine.scene;
    this.despawn();
    if (this.region) {
      sc.remove(this.region.root);
      this.region.root.traverse((o) => {
        const m = o as THREE.Mesh;
        // geometria de prop é compartilhada com o cache de glTF
        if (m.geometry && !m.geometry.userData.shared) m.geometry.dispose();
      });
    }
    progress?.(0.3);
    await this.nextPaint();
    const t0 = performance.now();
    if (id !== 'atrio') await this.restProps;
    const t1 = performance.now();
    this.region = buildRegion(id, { flags, quality: this.settings.quality, ps2: !!this.engine.ps2 });
    // corpos de quem mora ou ronda a região: baixam aqui, não na abertura
    const bodies = new Set<string>();
    for (const e of this.region.enemies) {
      if (e.ifFlag && !flags.has(e.ifFlag)) continue;
      const m = enemyModelPath(e.kind);
      if (m) bodies.add(m);
    }
    await Promise.all([...[...bodies].map((m) => loadGltf(m)), ...this.region.npcs.map((n) => loadExternalModel(NPCS[n.id]?.model ?? n.id))]);
    const t2 = performance.now();
    sc.add(this.region.root);
    this.engine.applyEnv(this.region.env);
    this.engine.setFogAmount(1);
    this.engine.setLamps(this.region.lamps);
    this.audio.setAmbience(this.region.env.rain, this.region.env.interior ? 0.05 : 0.35);
    this.audio.setLoops(REGION_SOUND[id].loops);
    progress?.(0.8);
    const t2b = performance.now();
    const progs0 = this.engine.renderer.info.programs?.length ?? 0;
    // na abertura o menu aparece antes: o que a câmera do menu não vê termina de compilar nos quadros do menu
    await this.engine.precompile(sc, !this.booting);
    const t2c = performance.now();
    await this.nextPaint();
    // compila os materiais antes de revelar a cena
    const t3 = performance.now();
    this.engine.render(0.016, this.focus);
    const t4 = performance.now();
    this.loadTimes = { region: id, props: Math.round(t1 - t0), build: Math.round(t2 - t1), env: Math.round(t2b - t2), compile: Math.round(t2c - t2b), paint: Math.round(t3 - t2c), firstFrame: Math.round(t4 - t3), programs: `${progs0}>${this.engine.renderer.info.programs?.length ?? 0}` };
    console.info('[carga]', JSON.stringify(this.loadTimes));
    progress?.(1);
  }

  private spawnPlayer(spawn: string | null): void {
    const s = this.state!;
    const r = this.region;
    const sc = this.engine.scene;
    const p = (this.player = new Player(s.look, s.profession));
    p.addTo(sc);
    if (spawn) {
      const sp = r.spawns[spawn] ?? Object.values(r.spawns)[0];
      p.teleport(sp.x, sp.y ?? groundAt(r, sp.x, sp.z, 50) ?? 0, sp.z, sp.yaw);
      s.region = r.id;
      s.pos = { x: p.pos.x, y: p.pos.y, z: p.pos.z, yaw: sp.yaw };
    } else p.teleport(s.pos.x, s.pos.y, s.pos.z, s.pos.yaw);
    const st = this.stats;
    p.vigor = st.maxVigor;
    s.hp = Math.min(Math.max(1, s.hp), st.maxHp);
    const surf = REGION_SOUND[r.id].surface;
    p.onStep = () => this.audio.step(r.env.rain > 0.5 && !r.env.interior ? 'agua' : surf, 0.7);
    p.onSwing = (h) => this.audio.sfx(h ? 'golpeFirme' : 'golpe');
    p.onDodge = () => this.audio.sfx('esquiva');
    p.onAttack = (e) => this.resolveAttack(e.heavy, e.origin, e.dir, e.range, e.arc);
    p.onFall = () => this.fell();
    this.crivo.model.root.visible = true;
    this.crivo.model.setCosmetics(s.crivoLook.laco, s.crivoLook.capa);
    this.crivo.place(p.pos.x + Math.cos(p.yaw) * 0.9, p.pos.y, p.pos.z - Math.sin(p.yaw) * 0.9);
    for (const n of r.npcs) {
      const def = NPCS[n.id];
      if (!def) continue;
      const npc = new Npc(def, n.x, n.y ?? groundAt(r, n.x, n.z, 50) ?? 0, n.z, n.yaw);
      sc.add(npc.fig.root);
      this.npcs.push(npc);
    }
    for (const d of r.props) this.props.push(this.makeProp(d));
    this.spawnEnemies();
    this.refreshProps();
    Story.onEnterRegion(this, r.id);
  }

  spawnEnemies(): void {
    const s = this.state!;
    const r = this.region;
    for (const e of this.enemies) this.engine.scene.remove(e.root);
    this.enemies = [];
    for (const pl of r.enemies) {
      if (s.flags.includes(`limpo:${r.id}:${pl.group}`)) continue;
      if (pl.ifFlag && !s.flags.includes(pl.ifFlag)) continue;
      if (pl.unlessFlag && s.flags.includes(pl.unlessFlag)) continue;
      this.spawnEnemy(pl.kind, pl.x, pl.z, pl.group, pl.y);
    }
  }

  spawnEnemy(kind: EnemyKind, x: number, z: number, group: string, y?: number): Enemy {
    const r = this.region;
    const gy = y ?? groundAt(r, x, z, 50) ?? 0;
    const e = new Enemy(kind, group, x, gy, z);
    e.onDeath = () => this.enemyDied(e);
    this.engine.scene.add(e.root);
    this.enemies.push(e);
    return e;
  }

  async travel(to: RegionId, spawn: string): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.mode = 'transition';
    this.audio.sfx('portal');
    await this.ui.fade(true);
    this.ui.prompt(null);
    await this.loadRegion(to, new Set(this.state!.flags));
    this.spawnPlayer(spawn);
    await this.warmScene();
    this.save();
    this.enterPlay();
    await this.ui.fade(false);
    this.busy = false;
    this.ui.regionTitle(this.region.name, this.region.subtitle);
  }

  // ---------- objetos de cena ----------
  private makeProp(def: PropPlacement): PropRt {
    const r = this.region;
    const y = def.y ?? groundAt(r, def.x, def.z, 50) ?? 0;
    const pos = new THREE.Vector3(def.x, y, def.z);
    let obj: THREE.Object3D | null = def.object ?? null;
    let own = false;
    let lid: THREE.Object3D | undefined;
    if (!obj) {
      own = true;
      const g = new THREE.Group();
      g.position.copy(pos);
      if (def.kind === 'pickup') {
        if (def.data?.gear) {
          const gd = GEAR[String(def.data.gear)];
          const col = RARITY_COLOR[gd.rarity];
          const w = gd.look ? buildWeapon(gd.look) : null;
          if (w) {
            // arma deitada no chão
            w.rotation.set(0, 0, Math.PI / 2);
            w.position.set(-(WEAPON_LOOKS[gd.look!].length * 0.3), 0.06, 0);
            g.add(w);
          } else {
            // armadura dobrada: peitoral simples, de poucas faces, como nos jogos da época
            const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.2, 0.42, 8, 1, true, -Math.PI / 2, Math.PI), M.iron);
            plate.rotation.set(Math.PI / 2, 0, 0);
            plate.position.y = 0.12;
            g.add(plate);
          }
          const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.3, 3.2, 10, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: true }));
          beam.position.y = 1.6;
          g.add(beam);
          const h = halo(1.4, col, 0.55);
          h.position.y = 0.2;
          g.add(h);
        } else if (def.data?.item === 'moedas') {
          for (let i = 0; i < 5; i++) {
            const c = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 10), M.bronze);
            c.position.set(Math.sin(i * 2.4) * 0.09, 0.02 + i * 0.021, Math.cos(i * 2.4) * 0.09);
            c.rotation.y = i;
            g.add(c);
          }
        } else {
          const b = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.26), M.woodDark);
          b.position.y = 0.11;
          b.castShadow = true;
          g.add(b);
        }
        const h = halo(1.0, 0xffd28a, 0.42);
        h.position.y = 0.25;
        g.add(h);
      } else if (def.kind === 'page') {
        const pg = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.44), M.parchment);
        pg.position.y = 0.95;
        pg.rotation.set(-0.3, 0.6, 0.1);
        pg.name = 'folha';
        (pg.material as THREE.Material).side = THREE.DoubleSide;
        g.add(pg);
        const h = halo(1.5, 0xfff0c8, 0.5);
        h.position.y = 0.95;
        g.add(h);
      } else if (def.kind === 'chest') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.56), M.woodDark);
        body.position.y = 0.25;
        body.castShadow = true;
        const band = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.08, 0.6), M.bronze);
        band.position.y = 0.44;
        lid = new THREE.Group();
        lid.position.set(0, 0.5, -0.28);
        const top = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.16, 0.56), M.woodDark);
        top.position.set(0, 0.08, 0.28);
        const lock = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.05), M.bronze);
        lock.position.set(0, 0.02, 0.57);
        lid.add(top, lock);
        g.add(body, band, lid);
        g.rotation.y = Number(def.data?.rot ?? 0);
      } else {
        own = false;
        obj = null;
      }
      if (own) {
        obj = g;
        this.engine.scene.add(g);
      }
    }
    return { def, obj, pos, own, lid };
  }

  propVisible(p: PropRt): boolean {
    const s = this.state!;
    const d = p.def;
    const data = d.data ?? {};
    if (data.ifFlag && !s.flags.includes(String(data.ifFlag))) return false;
    if (data.unlessFlag && s.flags.includes(String(data.unlessFlag))) return false;
    if (data.needsCrivo && !s.crivoSkills.includes(String(data.needsCrivo))) return false;
    if (d.kind === 'trail') return this.lupaT > 0;
    if ((d.kind === 'pickup' || d.kind === 'page') && s.collected.includes(d.id)) return false;
    if (d.hidden && !s.collected.includes('rev:' + d.id)) return false;
    return true;
  }
  propUsable(p: PropRt): boolean {
    if (!this.propVisible(p) || p.def.kind === 'trail') return false;
    if (p.def.kind === 'chest' && this.state!.collected.includes(p.def.id)) return false;
    return true;
  }
  private lidAnim = false;
  /** tampas de baú em movimento: sobem com aceleração, passam um pouco e assentam */
  private updateLids(dt: number): void {
    for (const p of this.props) {
      if (!p.lid || p.lidT === undefined) continue;
      p.lidT += dt;
      const u = Math.min(1, Math.max(0, p.lidT / 0.55));
      const back = 1 + 2.4 * Math.pow(u - 1, 3) + 1.4 * Math.pow(u - 1, 2);
      p.lid.rotation.x = -1.9 * back;
      if (u >= 1) p.lidT = undefined;
    }
  }
  refreshProps(): void {
    for (const p of this.props) {
      if (p.obj) p.obj.visible = this.propVisible(p);
      if (p.lid) {
        const open = this.state!.collected.includes(p.def.id);
        // baú aberto agora: a tampa espera as mãos chegarem e sobe com o gesto; os já abertos ficam abertos
        if (open && this.lidAnim && p.lid.rotation.x === 0) p.lidT = -0.45;
        else if (p.lidT === undefined || !open) p.lid.rotation.x = open ? -1.9 : 0;
      }
    }
  }
  prop(id: string): PropRt | undefined {
    return this.props.find((p) => p.def.id === id);
  }

  // ---------- diálogo e roteiros ----------
  private talkingNpc: Npc | null = null;
  private cancelled = false;
  private scriptLocked = false;
  /** Esc, B ou o botão de sair: encerra a conversa ou o exame em curso (ver say). Cenas essenciais (abertura) não cancelam. */
  cancelScript(): void {
    if (this.mode !== 'dialogue' || this.scriptLocked) return;
    this.cancelled = true;
    this.ui.abortDialogue();
  }
  async runScript(fn: () => Promise<void>, npc: Npc | null = null, essential = false): Promise<void> {
    if (this.mode !== 'play') return;
    this.mode = 'dialogue';
    this.cancelled = false;
    this.scriptLocked = essential;
    this.input.releaseLock();
    this.ui.prompt(null);
    this.talkingNpc = npc;
    if (npc) npc.talking = true;
    if (this.player) this.player.frozen = true;
    try {
      await fn();
    } catch (err) {
      if (err !== SCRIPT_CANCEL) {
        this.errors.push(String(err));
        console.error(err);
      }
    }
    this.cancelled = false;
    this.ui.endDialogue();
    if (npc) npc.talking = false;
    this.talkingNpc = null;
    if (this.player) this.player.frozen = false;
    if (this.mode === 'dialogue') {
      this.mode = 'play';
      this.wasLocked = false;
      if (!this.ui.instant) this.input.requestLock();
    }
    this.refreshProps();
    this.checkpoint();
  }
  /** who: id de NPC, ou '' para narração */
  /** Depois de Esc ou Sair as falas restantes são puladas, não interrompidas: o roteiro segue até o fim e
   *  grava o que já tinha decidido (passo de missão, recompensa). Só uma escolha ainda por fazer encerra o roteiro. */
  async say(who: string, text: string): Promise<void> {
    if (this.cancelled) return;
    const def = NPCS[who];
    this.ui.portrait(who ? this.portraitOf(who) : null);
    // quem fala gesticula e mexe a boca; os outros na cena escutam e acenam no fim da frase
    for (const n of this.npcs) n.speaking = n.def.id === who;
    try {
      await this.ui.say(def?.name ?? who, def?.role ?? '', text);
    } finally {
      for (const n of this.npcs) {
        if (n.speaking) n.speaking = false;
        else if (n.talking) n.fig.nod();
      }
      this.player?.fig.nod();
    }
  }
  /** busto do NPC que fala, tirado da própria figura 3D na primeira fala e guardado para as próximas */
  portraits = new Map<string, HTMLCanvasElement | 'pendente'>();
  private portraitOf(who: string): HTMLCanvasElement | null {
    const got = this.portraits.get(who);
    if (got instanceof HTMLCanvasElement) return got;
    const n = this.npcs.find((x) => x.def.id === who);
    if (!n || got === 'pendente') return null;
    const f = n.fig;
    const head = new THREE.Vector3();
    const bone = f.headBone;
    f.root.updateMatrixWorld(true);
    if (bone) bone.getWorldPosition(head);
    else head.set(n.pos.x, n.pos.y + f.height * 0.9, n.pos.z);
    this.portraits.set(who, 'pendente');
    this.engine.requestPortrait(f.root, head, f.root.rotation.y, (c) => {
      this.portraits.set(who, c);
      if (this.mode === 'dialogue' && this.ui.speaker === (NPCS[who]?.name ?? who)) this.ui.portrait(c);
    });
    return null;
  }
  async choose(options: Array<{ text: string; tag?: string }>, pre?: number): Promise<number> {
    if (this.cancelled) throw SCRIPT_CANCEL;
    const r = await this.ui.choose(options, this.autoChoice ?? pre);
    if (this.cancelled || r < 0) throw SCRIPT_CANCEL;
    return r;
  }
  /** escolha forçada nos testes automatizados */
  autoChoice: number | undefined;

  // ---------- operações de estado usadas pela narrativa e pela interface ----------
  has(flag: string): boolean {
    return this.state!.flags.includes(flag);
  }
  flag(f: string): boolean {
    return D.setFlag(this.state!, f);
  }
  toast(text: string, label = ''): void {
    this.ui.toast(text, label);
  }
  give(item: string, qty = 1): void {
    D.addItem(this.state!, item, qty);
    this.audio.sfx('pegar');
    this.ui.toast(`${ITEMS[item]?.name ?? item}${qty > 1 ? ' × ' + qty : ''}`, 'Recebido');
  }
  reward(r: Reward & { talk?: boolean }): boolean {
    const s = this.state!;
    const st = this.stats;
    const xp = Math.round((r.xp ?? 0) * (r.talk && s.skills.includes('pergunta_aberta') ? 1.3 : 1));
    const coins = Math.round((r.coins ?? 0) * (1 + st.coinBonus));
    const res = D.grantReward(s, { ...r, xp, coins });
    if (!res.granted) return false;
    const parts: string[] = [];
    if (xp) parts.push(`+${xp} de experiência`);
    if (coins) parts.push(`+${coins} moedas`);
    if (r.crivoPoints) parts.push(`+${r.crivoPoints} ponto do Crivo`);
    if (parts.length) this.ui.toast(parts.join(' · '));
    for (const [k, v] of Object.entries(r.items ?? {})) this.ui.toast(`${ITEMS[k]?.name ?? k}${v > 1 ? ' × ' + v : ''}`, 'Recebido');
    if (res.leveled) this.levelUp();
    return true;
  }
  private gainXp(n: number): void {
    if (D.addXp(this.state!, n).leveled) this.levelUp();
  }
  private levelUp(): void {
    const s = this.state!;
    s.hp = this.stats.maxHp;
    this.audio.sfx('nivel');
    this.crivo.cheer();
    if (this.player && !this.player.fig.busy && this.player.fig.action === 'none') this.player.fig.play('cheer');
    this.ui.banner('Você subiu de nível', `Nível ${s.level}`, `Um ponto de habilidade disponível. Abra as habilidades com ${this.ui.key('habilidades')}.`);
  }
  startQuest(id: string): boolean {
    if (!D.startQuest(this.state!, id)) return false;
    this.audio.sfx('missao');
    this.ui.banner(QUESTS[id].kind === 'principal' ? 'Novo caminho' : 'Missão paralela', QUESTS[id].title, QUESTS[id].summary);
    if (!this.tracked || QUESTS[id].kind === 'principal') this.tracked = id;
    return true;
  }
  advance(id: string, step: number): boolean {
    if (!D.advanceQuest(this.state!, id, step)) return false;
    this.audio.sfx('ui');
    const t = QUESTS[id].steps[step]?.text;
    if (t) this.ui.toast(t, 'Objetivo atualizado');
    return true;
  }
  completeQuest(id: string, r?: Omit<Reward, 'id'> & { talk?: boolean }): boolean {
    if (!D.completeQuest(this.state!, id)) return false;
    this.audio.sfx('missao');
    this.crivo.cheer();
    this.ui.banner('Missão concluída', QUESTS[id].title, QUESTS[id].done);
    if (r) this.reward({ id: 'missao:' + id, ...r });
    if (this.tracked === id) this.tracked = null;
    return true;
  }
  step(id: string): number {
    return D.questStep(this.state!, id);
  }
  trackedQuest(): { id: string; def: QuestDef; step: number } | null {
    const s = this.state;
    if (!s) return null;
    let id = this.tracked && D.questActive(s, this.tracked) ? this.tracked : null;
    if (!id) {
      const act = Object.keys(s.quests).filter((q) => D.questActive(s, q));
      id = act.find((q) => QUESTS[q].kind === 'principal') ?? act[0] ?? null;
      this.tracked = id;
    }
    return id ? { id, def: QUESTS[id], step: s.quests[id].step } : null;
  }
  track(id: string): void {
    this.tracked = id;
  }

  /** posição do objetivo acompanhado na região atual (ou do portal que leva a ele) */
  targetPos(): THREE.Vector3 | null {
    const tq = this.trackedQuest();
    if (!tq) return null;
    const st = tq.def.steps[tq.step];
    if (!st?.target) return null;
    const r = this.region;
    if (st.region && st.region !== r.id) {
      const direct = this.props.find((p) => p.def.kind === 'portal' && p.def.data?.to === st.region);
      const back = this.props.find((p) => p.def.kind === 'portal' && p.def.data?.to === 'atrio');
      return (direct ?? back)?.pos ?? null;
    }
    const [kind, id] = st.target.split(':');
    if (kind === 'npc') return this.npcs.find((n) => n.def.id === id)?.pos ?? null;
    if (kind === 'prop') {
      const p = this.prop(id);
      return p && this.propVisible(p) ? p.pos : null;
    }
    if (kind === 'group') {
      const alive = this.enemies.filter((e) => e.alive && e.group === id);
      if (alive.length) {
        const c = new THREE.Vector3();
        for (const e of alive) c.add(e.pos);
        return c.multiplyScalar(1 / alive.length);
      }
      const ps = this.props.filter((p) => p.def.data?.group === id && this.propVisible(p));
      if (ps.length && this.player) return ps.sort((a, b) => a.pos.distanceTo(this.player!.pos) - b.pos.distanceTo(this.player!.pos))[0].pos;
    }
    return null;
  }

  toggleEquip(id: string): void {
    const s = this.state!;
    const it = ITEMS[id];
    if (!it?.slot) return;
    if (D.isEquipped(s, id)) D.unequip(s, it.slot);
    else D.equip(s, it.slot, id);
    this.audio.sfx('pegar');
    this.save();
  }
  /** Item da tecla rápida: caldo primeiro; sem caldo útil, o limão de Lind quando ele ainda ajuda */
  quickItem(): string {
    const s = this.state!;
    const hurt = s.hp < this.stats.maxHp;
    if (D.countItem(s, 'caldo') > 0 && (hurt || D.countItem(s, 'limao_lind') === 0)) return 'caldo';
    const tired = !!this.player && this.player.vigor < this.stats.maxVigor;
    if (D.countItem(s, 'limao_lind') > 0 && (hurt || tired)) return 'limao_lind';
    return 'caldo';
  }
  useItem(id: string): boolean {
    const s = this.state!;
    if (!D.countItem(s, id)) return false;
    if (id === 'caldo') {
      const max = this.stats.maxHp;
      if (s.hp >= max) {
        this.ui.toast('Você está inteiro. O caldo fica para depois.');
        return false;
      }
      D.removeItem(s, id);
      s.hp = Math.min(max, s.hp + 45);
      this.audio.sfx('curar');
      if (this.player) this.burst(this.player.pos.clone().setY(this.player.pos.y + 1.1), 0x9fe0c0, 10, 1.2);
      return true;
    }
    if (id === 'limao_lind' || id === 'cha_fisher') {
      const max = this.stats.maxHp;
      if (id === 'limao_lind' && s.hp >= max && this.player && this.player.vigor >= this.stats.maxVigor) {
        this.ui.toast('Você está inteiro. O limão fica para depois.');
        return false;
      }
      D.removeItem(s, id);
      if (id === 'limao_lind') {
        s.hp = Math.min(max, s.hp + 30);
        if (this.player) this.player.vigor = this.stats.maxVigor;
      } else this.abilityCd = 0;
      this.audio.sfx('curar');
      if (this.player) this.burst(this.player.pos.clone().setY(this.player.pos.y + 1.1), id === 'limao_lind' ? 0xe8e070 : 0xf0e0c0, 10, 1.2);
      return true;
    }
    if (id === 'selo_pergunta') {
      const p = this.player;
      if (!p) return false;
      const cand = this.props
        .filter((x) => ['pickup', 'page', 'chest'].includes(x.def.kind) && !s.collected.includes(x.def.id) && !x.def.data?.ifFlag)
        .sort((a, b) => a.pos.distanceTo(p.pos) - b.pos.distanceTo(p.pos))[0];
      if (!cand) {
        this.ui.toast('O Crivo olha em volta e não acha nada escondido por aqui.');
        return false;
      }
      D.removeItem(s, id);
      this.secret = { pos: cand.pos, t: 25 };
      this.crivo.point(4);
      this.audio.sfx('crivoCurioso');
      this.ui.hint('Há algo ainda não recolhido naquela direção. O losango acompanha por alguns instantes.', 'Selo da Pergunta');
      return true;
    }
    return false;
  }
  unlock(def: SkillDef, crivo: boolean): void {
    const r = crivo ? D.unlockCrivoSkill(this.state!, def) : D.unlockSkill(this.state!, def);
    if (r.ok) {
      this.audio.sfx('nivel');
      this.refreshProps();
      this.save();
    } else this.audio.sfx('uiNegar');
  }
  learnCrivo(id: string): void {
    const s = this.state!;
    if (!s.crivoSkills.includes(id)) s.crivoSkills.push(id);
  }
  setCrivoLook(k: 'laco' | 'capa', v: boolean): void {
    const s = this.state!;
    s.crivoLook[k] = v;
    this.crivo.model.setCosmetics(s.crivoLook.laco, s.crivoLook.capa);
    this.save();
  }
  priceOf(id: string): number {
    const base = ITEMS[id]?.price ?? 0;
    return this.state!.flags.includes('desconto_dalva') ? Math.round(base * 0.8) : base;
  }
  buyItem(id: string): boolean {
    if (!D.buy(this.state!, id, this.priceOf(id))) {
      this.audio.sfx('uiNegar');
      return false;
    }
    this.audio.sfx('moeda');
    this.save();
    return true;
  }
  recordCase(c: ClinicalCase, f: CaseFeedback): void {
    const s = this.state!;
    s.cases.push({ caseId: c.id, caseVersion: c.version, option: f.option.id, process: f.recognized, outcome: `${f.outcome.improved ? 'melhora' : 'sem melhora'}${f.outcome.harmed ? ', efeito indesejado' : ''}`, at: Math.round(s.playtime) });
    this.reward({ id: 'caso:' + c.id, xp: f.xp, talk: true });
    this.save();
  }
  async openCase(): Promise<CaseFeedback | null> {
    this.ui.endDialogue();
    const f = await this.ui.caseView.open(CASE_LIA);
    return f;
  }
  openShop(): void {
    this.enterOverlay('shop');
    this.ui.shop(true);
  }
  showEnding(lines: string[]): void {
    this.enterOverlay('ending');
    this.ui.ending(true, lines);
  }

  // ---------- sobreposições ----------
  enterOverlay(kind: 'book' | 'shop' | 'pause' | 'ending'): void {
    if (this.mode === kind) return;
    if (this.mode === 'play' || this.mode === 'menu' || this.mode === 'dialogue') this.prevMode = this.mode === 'dialogue' ? 'play' : this.mode;
    this.mode = kind;
    this.input.releaseLock();
    this.ui.prompt(null);
  }
  closeOverlay(): void {
    // Configurações abertas a partir da pausa voltam para a pausa, não direto ao jogo
    const backToPause = this.mode === 'book' && this.ui.bookFromPause;
    this.ui.bookFromPause = false;
    this.ui.closeAll();
    this.audio.sfx('ui');
    if (backToPause) {
      this.mode = 'pause';
      this.ui.pause(true);
      return;
    }
    if (this.prevMode === 'menu' && !this.state) return this.openMenu();
    this.mode = 'play';
    if (!this.ui.instant) this.input.requestLock();
    this.wasLocked = false;
    this.refreshProps();
  }
  pauseGame(): void {
    if (this.mode !== 'play') return;
    this.enterOverlay('pause');
    this.ui.pause(true);
  }
  private openBookTab(tab: BookTab): void {
    if (this.mode === 'book') {
      if (this.ui.bookTab === tab) return this.closeOverlay();
      this.ui.bookTab = tab;
      this.ui.renderBook();
    } else this.ui.openBook(tab);
  }

  // ---------- combate ----------
  private burst(pos: THREE.Vector3, color: number, n: number, speed = 3, size = 0.35): void {
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.sparkTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      s.position.copy(pos);
      const v = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.9, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.4 + Math.random()));
      const max = 0.35 + Math.random() * 0.35;
      this.engine.scene.add(s);
      this.sparks.push({ s, v, life: max, max, size: size * (0.6 + Math.random() * 0.8) });
    }
  }
  private updateSparks(dt: number): void {
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const p = this.sparks[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.engine.scene.remove(p.s);
        p.s.material.dispose();
        this.sparks.splice(i, 1);
        continue;
      }
      p.v.y -= 5 * dt;
      p.s.position.addScaledVector(p.v, dt);
      const k = p.life / p.max;
      p.s.scale.setScalar(p.size * k);
      p.s.material.opacity = k;
    }
  }

  private resolveAttack(heavy: boolean, origin: THREE.Vector3, dir: THREE.Vector3, range: number, arc: number): void {
    const st = this.stats;
    let hit = false;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = e.pos.x - origin.x;
      const dz = e.pos.z - origin.z;
      const d = Math.hypot(dx, dz);
      // alcance da arma equipada; o Martelo da Síntese fecha o círculo no golpe firme
      const reach = range + (st.reach - 2.5);
      if (d - e.radius > reach || Math.abs(e.pos.y - (origin.y - 1)) > 2.6) continue;
      const fullCircle = heavy && st.special === 'sintese';
      if (!fullCircle && d > 0.6 && (dx * dir.x + dz * dir.z) / d < Math.cos(arc)) continue;
      const dealt = e.damage(this.weaponDamage(e, heavy), heavy, st.heavyStagger);
      if (dealt > 0) {
        hit = true;
        this.burst(new THREE.Vector3(e.pos.x, e.pos.y + 1.1 * e.cfg.scale, e.pos.z), e.cfg.eye, heavy ? 12 : 7, heavy ? 4.5 : 3);
      }
    }
    if (hit) {
      this.hitstop = heavy ? 0.1 : 0.055;
      this.engine.shake = Math.max(this.engine.shake, heavy ? 0.55 : 0.25);
      this.audio.sfx('impacto', heavy ? 1.2 : 1);
    } else if (heavy) this.audio.sfx('impactoChao');
  }

  private nntCount = 0;
  private repTarget: Enemy | null = null;
  private repStack = 0;
  /** Dano de um golpe com a arma equipada: variação, crítico e o efeito especial de cada peça. */
  private weaponDamage(e: Enemy, heavy: boolean): number {
    const st = this.stats;
    let dmg = heavy ? st.heavyDamage : st.damage;
    dmg *= 1 + (Math.random() * 2 - 1) * st.variance;
    let crit = Math.random() < st.crit;
    if (st.special === 'nnt' && ++this.nntCount >= 3) {
      this.nntCount = 0;
      dmg *= 2.2 / st.critMult;
      crit = true;
    }
    if (crit) {
      dmg *= st.critMult;
      this.engine.flash = Math.max(this.engine.flash, 0.12);
    }
    if (st.special === 'desfecho' && e.cfg.boss) dmg *= 1.3;
    if (st.special === 'replicacao') {
      if (this.repTarget === e) this.repStack = Math.min(5, this.repStack + 1);
      else {
        this.repTarget = e;
        this.repStack = 0;
      }
      dmg *= 1 + 0.12 * this.repStack;
    }
    return Math.max(1, Math.round(dmg));
  }

  private hitPlayer(dmg: number, from: THREE.Vector3): void {
    const p = this.player!;
    const s = this.state!;
    if (p.dead || this.mode !== 'play' || p.iframes > 0) return;
    let d = D.damageTaken(dmg, this.stats, this.settings.difficulty);
    if (s.hp - d <= 0 && s.crivoSkills.includes('abrigo') && this.abrigoCd <= 0) {
      this.abrigoCd = 90;
      this.crivo.pulse();
      this.crivo.tired = 8;
      this.burst(p.pos.clone().setY(p.pos.y + 1), 0xff5a78, 16, 4);
      this.ui.toast('O Crivo se pôs na frente. Ele precisa de um tempo antes de fazer isso de novo.', 'Abrigo');
      this.audio.sfx('pulso');
      p.iframes = 1.2;
      return;
    }
    s.hp = Math.max(0, s.hp - d);
    p.hurt(from, Math.min(1.6, 0.6 + d / 20));
    p.iframes = 0.55;
    const kx = p.pos.x - from.x;
    const kz = p.pos.z - from.z;
    const kl = Math.hypot(kx, kz) || 1;
    p.vel.x += (kx / kl) * 5;
    p.vel.z += (kz / kl) * 5;
    this.ui.hurt(d);
    this.audio.sfx('dano');
    this.engine.shake = Math.max(this.engine.shake, 0.5);
    if (s.hp <= 0) {
      p.die();
      p.lockTarget = null;
      this.mode = 'dead';
      this.input.releaseLock();
      this.audio.setCombat(0);
      setTimeout(() => this.mode === 'dead' && this.ui.defeat(true), this.ui.instant ? 10 : 1600);
    }
  }

  private enemyDied(e: Enemy): void {
    const s = this.state!;
    const r = this.region;
    this.audio.sfx(e.cfg.boss ? 'chefe' : 'dissipar');
    this.burst(new THREE.Vector3(e.pos.x, e.pos.y + 1.2 * e.cfg.scale, e.pos.z), e.cfg.eye, e.cfg.boss ? 40 : 14, 4, 0.5);
    if (e.cfg.boss) this.engine.flash = 0.6;
    this.gainXp(e.cfg.xp);
    const [a, b] = e.cfg.coins;
    s.coins += Math.round((a + Math.random() * (b - a)) * (1 + this.stats.coinBonus));
    if (D.unlockCodex(s, e.kind)) this.ui.toast(`Novo verbete no códice: ${ENEMY_CFG[e.kind].name}`);
    const drop = rollDrop(e.kind, (id) => D.countItem(s, id) > 0 || this.props.some((p) => p.def.data?.gear === id && this.propVisible(p)), Math.random(), Math.random());
    if (drop) this.spawnDrop(drop, e.pos.x, e.pos.y + 1.2 * e.cfg.scale, e.pos.z);
    if (this.player?.lockTarget === e) this.player.lockTarget = null;
    if (!this.enemies.some((o) => o !== e && o.alive && o.group === e.group)) {
      if (D.setFlag(s, `limpo:${r.id}:${e.group}`)) Story.onGroupCleared(this, r.id, e.group);
      this.refreshProps();
      this.checkpoint();
    }
  }

  /** Peça de equipamento que cai do inimigo: desce girando, assenta no chão e fica marcada por um facho da cor da raridade. */
  private spawnDrop(id: string, x: number, y: number, z: number): void {
    const g = GEAR[id];
    const def: PropPlacement = { id: `drop_${id}_${Math.round(performance.now())}`, kind: 'pickup', x, z, y: groundAt(this.region, x, z, y) ?? 0, label: `Pegar ${g.name} (${RARITY_LABEL[g.rarity]})`, radius: 1.9, data: { item: id, gear: id } };
    this.region.props.push(def);
    const rt = this.makeProp(def);
    this.props.push(rt);
    if (rt.obj) {
      rt.obj.position.y = y;
      this.drops.push({ obj: rt.obj, vy: 2.4, ground: rt.pos.y, spin: 7 });
    }
    this.audio.sfx('pegar', 0.6);
    this.ui.toast(`${g.name} caiu no chão`, RARITY_LABEL[g.rarity]);
  }
  private drops: Array<{ obj: THREE.Object3D; vy: number; ground: number; spin: number }> = [];
  private updateDrops(dt: number): void {
    for (const d of this.drops) {
      d.vy -= 14 * dt;
      d.obj.position.y += d.vy * dt;
      d.obj.rotation.y += d.spin * dt;
      if (d.obj.position.y <= d.ground) {
        d.obj.position.y = d.ground;
        if (Math.abs(d.vy) > 2) d.vy = -d.vy * 0.3;
        else d.vy = 0;
        d.spin *= 0.5;
      }
    }
    this.drops = this.drops.filter((d) => d.vy !== 0 || d.obj.position.y > d.ground);
  }

  private fell(): void {
    const p = this.player!;
    const s = this.state!;
    p.teleport(p.lastSafe.x, p.lastSafe.y, p.lastSafe.z, p.yaw);
    const before = s.hp;
    s.hp = Math.max(1, s.hp - 15);
    this.ui.hurt(before - s.hp);
    this.audio.sfx('dano');
    this.ui.toast('A névoa devolveu você à borda. Sem ponte, não há passagem.');
  }

  async respawn(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    const s = this.state!;
    this.ui.defeat(false);
    this.mode = 'transition';
    await this.ui.fade(true);
    s.hp = this.stats.maxHp;
    const id = s.region as RegionId;
    if (id !== this.region.id) await this.loadRegion(id, new Set(s.flags));
    else this.despawn();
    this.spawnPlayer(null);
    await this.warmScene();
    this.enterPlay();
    await this.ui.fade(false);
    this.busy = false;
  }

  rest(): void {
    const s = this.state!;
    const p = this.player!;
    s.hp = this.stats.maxHp;
    p.vigor = this.stats.maxVigor;
    this.spawnEnemies();
    p.lastSafe.copy(p.pos);
    this.checkpoint();
    this.audio.sfx('salvar');
    this.crivo.model.mood = 'descanso';
    this.ui.toast('Fôlego recuperado e caminho registrado. O que a névoa deixou pelo caminho pode ter voltado.', 'Descanso');
  }

  // ---------- habilidades do Crivo ----------
  private crivoAbility(): void {
    const s = this.state!;
    const p = this.player!;
    if (this.abilityCd > 0) {
      this.audio.sfx('uiNegar');
      return;
    }
    const st = this.stats;
    if (s.crivoActive === 'lupa' && s.crivoSkills.includes('lupa')) {
      this.lupaT = 7;
      this.abilityCd = st.lupaCooldown;
      this.audio.sfx('lupa');
      this.crivo.pulse();
      let found = 0;
      for (const x of this.props) {
        if (x.def.hidden && x.def.data?.lupa && !s.collected.includes('rev:' + x.def.id) && x.pos.distanceTo(p.pos) < 14) {
          s.collected.push('rev:' + x.def.id);
          found++;
        }
      }
      if (found) this.ui.toast('A lupa do Crivo trouxe algo à vista.');
      this.refreshProps();
    } else {
      this.abilityCd = st.pulseCooldown;
      this.crivo.pulse();
      this.pulseT = 0.6;
      this.pulseRing.position.set(this.crivo.pos.x, this.crivo.pos.y + 0.1, this.crivo.pos.z);
      this.audio.sfx('pulso');
      let n = 0;
      for (const e of this.enemies) if (e.alive && e.pos.distanceTo(this.crivo.pos) < st.pulseRadius + e.radius && e.stun(2.4)) n++;
      if (n) this.engine.flash = 0.25;
    }
  }

  private askHint(): void {
    const tq = this.trackedQuest();
    const t = this.targetPos();
    this.crivo.point(3.5);
    this.audio.sfx('crivoCurioso');
    if (!tq) {
      this.ui.hint('O Crivo olha em volta, sem pressa. Não há nada pendente; fale com quem está por perto.');
      return;
    }
    const st = tq.def.steps[tq.step];
    if (t) this.secret = { pos: t, t: 6 };
    this.ui.hint(st.hint ?? (t ? 'Ele vira o olho para o losango no horizonte.' : 'Ele inclina o corpo: desta vez, a pista não está à vista. Procure com calma.'));
  }

  // ---------- interação ----------
  nearest(): { npc?: Npc; prop?: PropRt; label: string } | null {
    const p = this.player!;
    const s = this.state!;
    let best: { npc?: Npc; prop?: PropRt; label: string } | null = null;
    let bd = 1e9;
    for (const n of this.npcs) {
      const d = n.pos.distanceTo(p.pos);
      if (d < 2.6 && d < bd) {
        bd = d;
        best = { npc: n, label: `Falar com ${n.def.name.split(' ')[0]}` };
      }
    }
    const wide = D.isEquipped(s, 'lupa_contexto') ? 2 : 1;
    for (const x of this.props) {
      if (!this.propUsable(x)) continue;
      if (Math.abs(x.pos.y - p.pos.y) > 2.4) continue;
      const d = Math.hypot(x.pos.x - p.pos.x, x.pos.z - p.pos.z);
      const rad = (x.def.radius ?? (x.def.kind === 'pickup' ? this.stats.pickupRadius : 1.7)) * (x.def.kind === 'examine' ? wide : 1);
      if (d < rad && d - rad * 0.5 < bd) {
        bd = d - rad * 0.5;
        best = { prop: x, label: x.def.label };
      }
    }
    return best;
  }

  private interact(t: { npc?: Npc; prop?: PropRt }): void {
    const p = this.player!;
    if (t.npc) {
      const n = t.npc;
      p.faceTo = Math.atan2(n.pos.x - p.pos.x, n.pos.z - p.pos.z);
      this.runScript(() => Story.talk(this, n.def.id), n);
      return;
    }
    const x = t.prop!;
    const s = this.state!;
    const d = x.def;
    const data = d.data ?? {};
    // vira para o objeto antes de estender a mão
    if (Math.hypot(x.pos.x - p.pos.x, x.pos.z - p.pos.z) > 0.2) p.faceTo = Math.atan2(x.pos.x - p.pos.x, x.pos.z - p.pos.z);
    // cada objeto pede um gesto: abaixar para pegar, erguer a tampa, puxar a alavanca, empurrar a grade
    const ges: Record<string, Action> = { pickup: (x.pos.y - p.pos.y > 0.5 ? 'reach' : 'pickup'), page: 'reach', chest: 'open', lever: 'examine', door: 'push', examine: 'examine', board: 'examine', mechanism: 'reach', brazier: 'reach', rest: 'examine' };
    if (d.kind !== 'portal' && d.kind !== 'trail') p.fig.play(ges[d.kind] ?? 'reach');
    // descobertas puxam a câmera para perto do que foi achado
    if (d.kind === 'chest' || d.kind === 'pickup' || d.kind === 'page' || d.kind === 'examine') p.focus(new THREE.Vector3(x.pos.x, x.pos.y + (d.kind === 'page' ? 0.95 : 0.35), x.pos.z), d.kind === 'examine' ? 2.2 : 1.8);
    if (d.kind === 'pickup' && !Story.CUSTOM_PICKUPS.has(d.id)) {
      D.markCollected(s, d.id);
      if (data.item === 'moedas') {
        const n = Math.round(Number(data.qty ?? 5) * (1 + this.stats.coinBonus));
        s.coins += n;
        this.audio.sfx('moeda');
        this.ui.toast(`+${n} moedas`);
      } else this.give(String(data.item), Number(data.qty ?? 1));
      this.refreshProps();
      Story.onCollected(this, d.id);
      return;
    }
    if (d.kind === 'page') {
      D.markCollected(s, d.id);
      D.unlockCodex(s, String(data.page));
      this.audio.sfx('pegar');
      this.refreshProps();
      this.runScript(() => Story.page(this, String(data.page)));
      return;
    }
    if (d.kind === 'portal') {
      if (data.requires && !s.flags.includes(String(data.requires))) {
        this.audio.sfx('uiNegar');
        this.runScript(() => this.say('', String(data.lockedMsg ?? 'Fechado.')));
        return;
      }
      this.travel(data.to as RegionId, String(data.spawn));
      return;
    }
    if (d.kind === 'rest') return this.rest();
    this.runScript(() => Story.useProp(this, x.def));
  }

  /** abre um baú genérico; devolve false se ainda estiver guardado */
  openChest(id: string): boolean {
    const s = this.state!;
    if (!D.markCollected(s, id)) return false;
    this.audio.sfx('porta');
    this.lidAnim = true;
    this.refreshProps();
    this.lidAnim = false;
    return true;
  }

  // ---------- laço principal ----------
  private frame(now: number): void {
    requestAnimationFrame((t) => this.frame(t));
    const raw = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.frames++;
    this.fpsAcc += raw;
    if (++this.fpsN >= 30) {
      this.fps = this.fpsN / this.fpsAcc;
      this.fpsAcc = this.fpsN = 0;
    }
    // menu parado: termina, um a um, os shaders que a abertura deixou pendentes (ver Engine.linkPending)
    if (this.mode === 'splash' || this.mode === 'menu' || this.mode === 'create') this.engine.linkPending(12);
    try {
      this.tick(Math.min(0.05, raw));
    } catch (err) {
      const m = String((err as Error)?.stack ?? err);
      if (!this.errors.includes(m)) {
        this.errors.push(m);
        console.error(err);
      }
    }
    this.input.endFrame();
  }

  /** avança a simulação; exposto para testes determinísticos */
  tick(dt: number): void {
    const inp = this.input;
    inp.pollGamepad();
    const m = this.mode;
    // uma sobreposição ou conversa solta o ponteiro de propósito: ao voltar ao jogo não é perda de foco
    if (m !== 'play') this.wasLocked = false;
    // retrato: o painel de criação ocupa a metade de baixo, então a cena sobe para o personagem aparecer acima dele
    const shift = m === 'create' && window.innerHeight > window.innerWidth * 1.1;
    if (shift !== this.viewShifted) {
      this.viewShifted = shift;
      const cam = this.engine.camera;
      if (shift) cam.setViewOffset(window.innerWidth, window.innerHeight, 0, window.innerHeight * 0.2, window.innerWidth, window.innerHeight);
      else cam.clearViewOffset();
    }
    this.ui.update(dt);
    this.audio.update();
    this.padMenus(m);

    if (m === 'splash' || m === 'menu' || m === 'create' || (m === 'book' && !this.state)) {
      this.updateTitle(dt, m);
    } else if (this.state && this.player) {
      if (m === 'play') {
        if (this.wasLocked && !inp.locked) this.pauseGame();
        this.wasLocked = inp.locked;
        if (inp.took('pausa')) this.pauseGame();
        else if (inp.took('inventario')) this.openBookTab('inventario');
        else if (inp.took('diario')) this.openBookTab('diario');
        else if (inp.took('mapa')) this.openBookTab('mapa');
        else if (inp.took('habilidades')) this.openBookTab('habilidades');
      } else if (m === 'dialogue') {
        if (inp.took('pausa')) this.cancelScript();
      } else if (m === 'book' || m === 'pause' || m === 'shop') {
        if (inp.took('pausa')) this.closeOverlay();
        else if (m === 'book') {
          if (inp.took('inventario')) this.openBookTab('inventario');
          else if (inp.took('diario')) this.openBookTab('diario');
          else if (inp.took('mapa')) this.openBookTab('mapa');
          else if (inp.took('habilidades')) this.openBookTab('habilidades');
        }
      }
      const live = this.mode === 'play' || this.mode === 'dialogue' || this.mode === 'dead' || this.mode === 'transition';
      if (live) {
        let wdt = dt;
        if (this.hitstop > 0) {
          this.hitstop -= dt;
          wdt = dt * 0.06;
        }
        this.updateWorld(wdt, this.mode === 'play');
      }
    }
    for (const u of this.region.updaters) u(dt, this.engine.time);
    this.updateLids(dt);
    this.updateSparks(dt);
    // telas paradas (pausa, caderno, loja, dossiê) redesenham a 15 quadros por segundo: poupa bateria e GPU
    const still = this.mode === 'pause' || this.mode === 'shop' || this.mode === 'case' || (this.mode === 'book' && !!this.state);
    this.renderAcc += dt;
    if (!still || this.renderAcc >= 1 / 15) {
      this.engine.render(still ? this.renderAcc : dt, this.focus);
      this.renderAcc = 0;
    }
  }
  private renderAcc = 0;
  private padNavPrev = { x: 0, y: 0 };
  private padNavRepeat = 0;
  /** Menus pelo controle, do título ao epílogo: direcional ou analógico percorrem, A aciona, B volta. */
  private padMenus(m: Mode): void {
    const inp = this.input;
    const nav = inp.padNav;
    if (m === 'play' || m === 'boot' || m === 'transition' || !inp.usingPad || inp.capturePad) {
      this.padNavPrev.x = nav.x;
      this.padNavPrev.y = nav.y;
      return;
    }
    if (inp.took('interagir')) m === 'dialogue' ? this.ui.advance() : this.ui.activate();
    if (inp.took('esquiva')) {
      if (m === 'book' || m === 'pause' || m === 'shop') this.closeOverlay();
      else this.ui.back();
    }
    // segurar repete, com pausa inicial maior
    const now = performance.now();
    const fresh = nav.x !== this.padNavPrev.x || nav.y !== this.padNavPrev.y;
    if ((nav.x || nav.y) && (fresh || now > this.padNavRepeat)) {
      this.padNavRepeat = now + (fresh ? 420 : 140);
      if (nav.y) this.ui.moveFocus(nav.y);
      else this.ui.adjust(nav.x);
    }
    this.padNavPrev.x = nav.x;
    this.padNavPrev.y = nav.y;
  }
  /** há parede ou móvel alto entre os dois pontos? amostragem a cada 0,5 m */
  /** Inimigo vivo mais próximo em ângulo à direita (dir = 1) ou à esquerda (dir = -1) do alvo atual, visto do jogador. */
  private neighborTarget(cur: { pos: THREE.Vector3 }, dir: 1 | -1): Enemy | null {
    const p = this.player;
    if (!p) return null;
    const base = Math.atan2(cur.pos.x - p.pos.x, cur.pos.z - p.pos.z);
    let best: Enemy | null = null;
    let bestA = Infinity;
    for (const e of this.enemies) {
      if (e === cur || !e.alive || e.pos.distanceTo(p.pos) > 16) continue;
      let d = Math.atan2(e.pos.x - p.pos.x, e.pos.z - p.pos.z) - base;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      // vista de trás do jogador, a direita da tela é ângulo negativo em torno de +Y
      const a = -d * dir;
      if (a > 0.02 && a < bestA) {
        bestA = a;
        best = e;
      }
    }
    return best;
  }

  private blocked(a: THREE.Vector3, b: THREE.Vector3): boolean {
    const d = Math.hypot(b.x - a.x, b.z - a.z);
    const n = Math.ceil(d / 0.5);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const x = a.x + (b.x - a.x) * t;
      const z = a.z + (b.z - a.z) * t;
      if (pointBlocked(this.region.colliders, x, a.y + 1.2, z, 0.05)) return true;
    }
    return false;
  }

  private updateTitle(dt: number, m: Mode): void {
    const cam = this.engine.camera;
    if (m === 'create' && this.preview) {
      const tall = window.innerHeight > window.innerWidth * 1.1;
      const t = tall ? new THREE.Vector3(0.45, 1.4, 17.8) : new THREE.Vector3(0.55, 1.45, 15.7);
      if (this.snapCreateCam) {
        cam.position.copy(t);
        this.snapCreateCam = false;
      } else cam.position.lerp(t, Math.min(1, dt * 2.5));
      cam.lookAt(tall ? 0.45 : -1.05, 1.0, 13.4);
      this.preview.fig.speed = 0;
      this.preview.fig.update(dt);
      this.crivo.model.root.rotation.y = 0.25;
      this.crivo.model.lookAt(0.3, 0.2);
      this.crivo.model.update(dt);
      this.focus.set(0, 0, 13.4);
      return;
    }
    if (!this.settings.reduceMotion) this.menuAngle += dt * 0.025;
    const a = this.menuAngle;
    const t = new THREE.Vector3(-7 + Math.sin(a) * 6, 4.2 + Math.sin(a * 2) * 0.5, 15 + Math.cos(a) * 2);
    cam.position.lerp(t, Math.min(1, dt * 1.5));
    cam.lookAt(m === 'splash' ? 0 : 5, 7.5, -22);
    this.focus.set(0, 0, 4);
  }

  private interactBuffer = 0;
  private interactHeld = 0;
  private updateWorld(dt: number, controls: boolean): void {
    const s = this.state!;
    const p = this.player!;
    const r = this.region;
    const inp = this.input;
    const st = this.stats;
    const cam = this.engine.camera;
    // tempo de jogo: só enquanto se joga ou conversa, não em derrota nem em troca de região
    if (this.mode === 'play' || this.mode === 'dialogue') s.playtime += dt;
    this.abilityCd = Math.max(0, this.abilityCd - dt);
    this.abrigoCd = Math.max(0, this.abrigoCd - dt);
    if (this.lupaT > 0) {
      this.lupaT -= dt;
      if (this.lupaT <= 0) this.refreshProps();
    }

    // travar a mira
    if (controls && inp.took('travar')) {
      if (p.lockTarget) p.lockTarget = null;
      else {
        // prefere quem está à frente da câmera e sem parede no meio; a distância desempata
        const fx = -Math.sin(p.camYaw);
        const fz = -Math.cos(p.camYaw);
        const score = (e: Enemy): number => {
          const dx = e.pos.x - p.pos.x;
          const dz = e.pos.z - p.pos.z;
          const d = Math.hypot(dx, dz) || 1e-3;
          const facing = (dx * fx + dz * fz) / d;
          let sc = d + (1 - facing) * 7;
          if (this.blocked(p.pos, e.pos)) sc += 30;
          return sc;
        };
        const c = this.enemies.filter((e) => e.alive && e.pos.distanceTo(p.pos) < 16).sort((a, b) => score(a) - score(b))[0];
        p.lockTarget = c ?? null;
        this.audio.sfx(c ? 'ui' : 'uiNegar');
      }
    }
    // com a mira travada, um puxão lateral da câmera (mouse, toque, analógico ou Z/C) passa para o vizinho
    if (controls && p.lockTarget) {
      this.lockFlick = this.lockFlick * Math.exp(-dt / 0.25) + inp.mouseDX + inp.touchLookX * 1.6;
      const padX = inp.padLook.x;
      let dir: 0 | 1 | -1 = 0;
      if (inp.took('camDir') || this.lockFlick > 140 || (padX > 0.75 && this.lockPadPrev <= 0.75)) dir = 1;
      else if (inp.took('camEsq') || this.lockFlick < -140 || (padX < -0.75 && this.lockPadPrev >= -0.75)) dir = -1;
      this.lockPadPrev = padX;
      if (dir) {
        this.lockFlick = 0;
        const next = this.neighborTarget(p.lockTarget, dir);
        if (next) {
          p.lockTarget = next;
          this.audio.sfx('ui');
        }
      }
    } else {
      this.lockFlick = 0;
      this.lockPadPrev = 0;
    }
    if (p.lockTarget && (!p.lockTarget.alive || p.lockTarget.pos.distanceTo(p.pos) > 20)) {
      // a trava se desfaz sozinha: avisa, para a câmera solta não parecer defeito
      if (p.lockTarget.alive) {
        this.audio.sfx('uiNegar');
        this.ui.toast('Alvo fora de alcance: mira solta.');
      }
      p.lockTarget = null;
    }

    p.sensitivity = this.settings.sens;
    p.invertY = this.settings.invertY;
    p.sensitivityY = this.settings.sensY;
    p.camDist = this.settings.camDist;
    const lantern = D.isEquipped(s, 'lanterna_transparencia');
    // 9 estourava o rosto visto de frente (auditoria, item 3); a lanterna segue sendo o ganho de alcance
    // a tocha tremula; a Lanterna da Transparência pende do cinto e soma uma luz fria e estável
    const fl = 1 + Math.sin(this.engine.time * 11) * 0.06 + Math.sin(this.engine.time * 27.3) * 0.04;
    p.light.intensity = (lantern ? 16 : 7) * fl;
    p.light.distance = lantern ? 16 : 10;
    p.setLantern(lantern);
    if (p.fig.weaponKind !== st.weaponLook) void p.fig.equipWeapon(st.weaponLook);
    p.update(dt, inp, r, st, cam, controls);
    this.updateDrops(dt);
    this.focus.copy(p.pos);

    // inimigos e projéteis
    const ctx: EnemyCtx = {
      playerPos: p.pos,
      playerAlive: !p.dead && this.mode !== 'dialogue',
      colliders: r.colliders,
      groundAt: (x, z, y) => groundAt(r, x, z, y),
      hitPlayer: (dmg, from) => this.hitPlayer(dmg, from),
      shoot: (from, dir, dmg, speed) => {
        const pr = new Projectile(from.clone(), dir.clone(), dmg, speed);
        this.engine.scene.add(pr.mesh);
        this.projectiles.push(pr);
        this.audio.sfx('fiapoAviso', 0.7);
      },
      summon: (kind, x, z, group) => {
        const e = this.spawnEnemy(kind, x, z, group);
        e.aggro = true;
        this.burst(new THREE.Vector3(x, e.pos.y + 1, z), 0x7fffd0, 10, 2);
      },
      sfx: (n) => this.audio.sfx(n),
      shake: (a) => (this.engine.shake = Math.max(this.engine.shake, a)),
      others: this.enemies,
    };
    const frozenWorld = this.mode === 'dialogue' || this.mode === 'transition';
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (!frozenWorld || !e.alive) e.update(dt, ctx, cam.quaternion, this.engine.time);
      if (e.state === 'dead') {
        this.engine.scene.remove(e.root);
        this.enemies.splice(i, 1);
      }
    }
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      if (!frozenWorld) pr.update(dt);
      const dx = pr.pos.x - p.pos.x;
      const dz = pr.pos.z - p.pos.z;
      let gone = pr.life <= 0 || pointBlocked(r.colliders, pr.pos.x, pr.pos.y, pr.pos.z, 0.1);
      if (!gone && Math.hypot(dx, dz) < 0.75 && Math.abs(pr.pos.y - (p.pos.y + 1)) < 1.3) {
        this.hitPlayer(pr.dmg, pr.pos);
        gone = true;
      }
      if (gone) {
        this.burst(pr.pos, 0xd62839, 6, 2);
        this.engine.scene.remove(pr.mesh);
        pr.dispose();
        this.projectiles.splice(i, 1);
      }
    }
    const fighting = this.enemies.some((e) => e.alive && e.aggro && e.pos.distanceTo(p.pos) < 26);
    if (fighting && !this.inCombat && !this.combatSeen) {
      this.combatSeen = true;
      if (!s.flags.includes('tutorial_combate')) {
        D.setFlag(s, 'tutorial_combate');
        this.ui.hint(this.ui.isTouch ? 'Golpe, Firme, Esquiva, Pulso e Mira ficam nos botões à direita. Com a mira travada, arraste o olhar para o lado para trocar de alvo. Esquive no instante em que o aviso vermelho aparece.' : `${this.ui.key('ataque')} golpe leve · ${this.ui.key('golpe')} golpe firme · ${this.ui.key('esquiva')} esquiva · ${this.ui.key('crivo')} pulso do Crivo · ${this.ui.key('travar')} trava a mira (${this.ui.key('camEsq')} e ${this.ui.key('camDir')} trocam de alvo)`, 'Encontro', 10);
      }
    }
    this.inCombat = fighting;
    this.audio.setCombat(fighting ? 1 : 0);

    if (this.mode === 'dialogue' && this.talkingNpc) p.lookHint = this.lookHint.set(this.talkingNpc.pos.x, this.talkingNpc.pos.y + this.talkingNpc.fig.height * 0.9, this.talkingNpc.pos.z);
    p.frame = this.mode === 'dialogue' && this.talkingNpc ? this.lookHint : null;
    Npc.cam.copy(cam.position);
    Npc.typing = this.ui.isTyping || this.ui.instant;
    for (const n of this.npcs) n.update(dt, p.pos);

    // habilidades e itens
    if (controls && !p.dead) {
      if (inp.took('crivo')) this.crivoAbility();
      if (inp.took('trocarCrivo')) {
        if (s.crivoSkills.includes('lupa')) {
          s.crivoActive = s.crivoActive === 'pulso' ? 'lupa' : 'pulso';
          this.audio.sfx('ui');
        } else this.ui.toast('O Crivo ainda só conhece o pulso.');
      }
      if (inp.took('dica')) this.askHint();
      if (inp.took('item')) this.useItem(this.quickItem());
    }
    if (this.pulseT > 0) {
      this.pulseT -= dt;
      const k = 1 - this.pulseT / 0.6;
      this.pulseRing.visible = true;
      this.pulseRing.scale.setScalar(0.5 + k * st.pulseRadius);
      (this.pulseRing.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.9;
    } else this.pulseRing.visible = false;

    // interesse do Crivo
    this.interestTick -= dt;
    if (this.secret) {
      this.secret.t -= dt;
      if (this.secret.t <= 0) this.secret = null;
    }
    if (this.interestTick <= 0) {
      this.interestTick = 0.3;
      this.computeInterest();
    }
    const env = r.env;
    this.crivo.model.setLighting(
      new THREE.Vector3(...env.sunDir).normalize(),
      new THREE.Color(env.sun).multiplyScalar(Math.min(1.1, env.sunIntensity / 2)),
      new THREE.Color(env.hemiSky).multiplyScalar(0.3 * env.hemiIntensity + (env.interior ? 0.12 : 0)),
      p.light.position,
    );
    this.crivo.update(dt, {
      playerPos: p.pos,
      playerYaw: p.yaw,
      playerSpeed: p.speed,
      interest: this.interestPos,
      interestKind: this.interestKind,
      groundAt: (x, z, y) => groundAt(r, x, z, y) ?? p.pos.y,
      cameraPos: cam.position,
      inCombat: this.inCombat,
    });

    // o Crivo some quando a câmera encosta nele, para não tapar a cena
    this.crivo.model.root.visible = cam.position.distanceTo(this.crivo.pos) > 1.25;

    // objetos: animação leve
    const t = this.engine.time;
    for (const x of this.props) {
      if (!x.own || !x.obj || !x.obj.visible) continue;
      if (x.def.kind === 'page') {
        const f = x.obj.getObjectByName('folha');
        if (f) {
          f.position.y = 0.95 + Math.sin(t * 1.6 + x.pos.x) * 0.08;
          f.rotation.y = t * 0.7;
        }
      }
    }

    // interação
    if (controls && !p.dead) {
      const near = this.nearest();
      this.ui.prompt(near ? near.label : null);
      // a cabeça vira para o que se pode usar ou para quem se pode ouvir
      const np = near?.npc?.pos ?? near?.prop?.pos;
      p.lookHint = np ? this.lookHint.set(np.x, np.y + (near?.npc ? near.npc.fig.height * 0.9 : 0.6), np.z) : null;
      // o toque em Interagir fica guardado por um instante: apertar no fim de um golpe ou de um tranco não se perde
      if (inp.took('interagir')) {
        this.interactBuffer = 0.35;
        this.interactHeld = 0;
      }
      // o prazo só corre com o personagem livre: um golpe longo não come o toque
      if (this.interactBuffer > 0) {
        if (p.fig.busy) this.interactHeld += dt;
        else if (near) {
          this.interactBuffer = 0;
          this.interact(near);
        } else this.interactBuffer -= dt;
        if (this.interactHeld > 1.5) this.interactBuffer = 0;
      } else this.interactHeld = 0;
    } else {
      this.ui.prompt(null);
      this.interactBuffer = 0;
    }

    // marcador de objetivo
    const tgt = this.secret?.pos ?? this.targetPos();
    if (tgt && this.mode === 'play') {
      const v = new THREE.Vector3(tgt.x, tgt.y + 2.3, tgt.z);
      const dist = Math.hypot(tgt.x - p.pos.x, tgt.z - p.pos.z);
      v.project(cam);
      const behind = v.z > 1;
      let x = v.x;
      let y = v.y;
      if (behind) {
        x = -x;
        y = -1;
      }
      const off = behind || Math.abs(x) > 0.92 || Math.abs(y) > 0.86;
      if (off) {
        const k = Math.max(Math.abs(x) / 0.92, Math.abs(y) / 0.86, 1e-3);
        x /= k;
        y /= k;
      }
      this.ui.marker((x * 0.5 + 0.5) * innerWidth, (-y * 0.5 + 0.5) * innerHeight, `${Math.round(dist)} m`, dist > 3.2);
    } else this.ui.marker(0, 0, '', false);
    if (p.lockTarget) {
      const lt = p.lockTarget;
      const v = new THREE.Vector3(lt.pos.x, lt.pos.y + 1.2 * (lt.radius / 0.5), lt.pos.z).project(cam);
      this.ui.lock((v.x * 0.5 + 0.5) * innerWidth, (-v.y * 0.5 + 0.5) * innerHeight, v.z < 1);
    } else this.ui.lock(0, 0, false);

    // HUD
    const tq = this.trackedQuest();
    let stepText = tq ? (tq.def.steps[tq.step]?.text ?? '') : '';
    if (tq?.id === 'paginas' && tq.step === 0) stepText += ` (${PAGES.filter((pg) => s.codex.includes(pg)).length} de ${PAGES.length})`;
    const boss = this.enemies.find((e) => e.alive && e.cfg.boss && e.aggro);
    const cdMax = s.crivoActive === 'lupa' ? st.lupaCooldown : st.pulseCooldown;
    this.ui.hud({
      name: s.name,
      level: s.level,
      hp: s.hp,
      maxHp: st.maxHp,
      vigor: p.vigor,
      maxVigor: st.maxVigor,
      xp: s.level >= D.MAX_LEVEL ? 1 : (s.xp - D.xpForLevel(s.level)) / (D.xpForLevel(s.level + 1) - D.xpForLevel(s.level)),
      xpLeft: s.level >= D.MAX_LEVEL ? 0 : D.xpForLevel(s.level + 1) - s.xp,
      limao: D.countItem(s, 'limao_lind'),
      coins: s.coins,
      quest: tq ? tq.def.title : 'Sem objetivo acompanhado',
      step: stepText,
      ability: s.crivoActive === 'lupa' && s.crivoSkills.includes('lupa') ? 'lupa' : 'pulso',
      abilityCd: Math.min(1, this.abilityCd / cdMax),
      caldo: D.countItem(s, 'caldo'),
      points: s.skillPoints,
      crivoPoints: s.crivoPoints,
      boss: boss ? { name: boss.cfg.name, frac: boss.hp / boss.maxHp, recite: boss.reciteProgress } : null,
    });

    // registro periódico
    this.saveTimer += dt;
    if (this.saveTimer > 45 && this.mode === 'play') {
      this.saveTimer = 0;
      this.checkpoint();
    }
  }

  private interestPos: THREE.Vector3 | null = null;
  private interestKind: 'pista' | 'perigo' | 'pessoa' | null = null;
  private computeInterest(): void {
    const s = this.state!;
    const p = this.player!;
    for (const n of this.npcs) n.marker.visible = Story.npcHasBusiness(this, n.def.id);
    const danger = this.enemies.filter((e) => e.alive && e.aggro && e.pos.distanceTo(p.pos) < 14).sort((a, b) => Number(b.telegraphing) - Number(a.telegraphing) || a.pos.distanceTo(p.pos) - b.pos.distanceTo(p.pos))[0];
    if (danger) {
      this.interestPos = danger.pos;
      this.interestKind = 'perigo';
      this.interestId = '';
      return;
    }
    if (this.secret) {
      this.interestPos = this.secret.pos;
      this.interestKind = 'pista';
      return;
    }
    const far = s.crivoSkills.includes('faro_moedas');
    let best: PropRt | null = null;
    let bd = 1e9;
    for (const x of this.props) {
      const k = x.def.kind;
      const hiddenClue = x.def.hidden && x.def.data?.lupa && !s.collected.includes('rev:' + x.def.id);
      if (!hiddenClue && !this.propUsable(x)) continue;
      let range = 0;
      if (k === 'page' || k === 'pickup') range = far ? 20 : 9;
      else if (k === 'chest') range = 10;
      else if (k === 'examine' || k === 'mechanism' || k === 'lever' || k === 'brazier') range = s.collected.includes('visto:' + x.def.id) ? 0 : 7;
      if (hiddenClue) range = 8;
      const d = x.pos.distanceTo(p.pos);
      if (d < range && d < bd) {
        bd = d;
        best = x;
      }
    }
    if (best) {
      this.interestPos = best.pos;
      this.interestKind = 'pista';
      if (this.interestId !== best.def.id) {
        this.interestId = best.def.id;
        this.crivo.point(2.5);
        if (this.mode === 'play') this.audio.sfx('crivoCurioso', 0.6);
      }
    } else {
      this.interestPos = null;
      this.interestKind = null;
      this.interestId = '';
    }
  }
}
