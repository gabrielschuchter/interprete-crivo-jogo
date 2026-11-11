/**
 * Orquestração: modos de jogo, regiões, entidades, combate, interações,
 * missões, salvamento. As regras puras ficam em domain/; a narrativa em story.ts.
 */
import * as THREE from 'three';
import { Engine } from './core/engine';
import { Input, DEFAULT_KEYS, type ActionName } from './core/input';
import { AudioSys } from './core/audio';
import { DEFAULT_SETTINGS, loadSettings, storeSettings, type Settings } from './core/settings';
import { UI, type BookTab } from './ui/ui';
import { Player } from './entities/player';
import { Crivo } from './entities/crivo';
import { Enemy, Projectile, ENEMY_CFG, type EnemyCtx, type EnemyKind } from './entities/enemy';
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
      localStorage.setItem(SAVE_KEY, d);
    } catch {
      /* sem armazenamento: o jogo segue sem registro */
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
}

interface Spark {
  s: THREE.Sprite;
  v: THREE.Vector3;
  life: number;
  max: number;
  size: number;
}

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
  private abrigoCd = 0;
  lupaT = 0;
  private tracked: string | null = null;
  private secret: { pos: THREE.Vector3; t: number } | null = null;
  private interestId = '';
  private interestTick = 0;
  private menuAngle = 0.4;
  private preview: Player | null = null;
  private wasLocked = false;
  private focus = new THREE.Vector3();
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
    this.engine = new Engine(canvas);
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
    window.addEventListener('pointerdown', wake);
    this.input.onAnyKey = wake;
    window.addEventListener('error', (e) => this.errors.push(String(e.message)));
    window.addEventListener('unhandledrejection', (e) => this.errors.push(String(e.reason)));
    window.addEventListener('beforeunload', () => this.save());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.mode === 'play') this.pauseGame();
    });
    this.applySettings();
  }

  // ---------- inicialização ----------
  async boot(): Promise<void> {
    this.ui.loading(true, 0.1);
    await this.nextPaint();
    const flags = new Set<string>(D.deserialize(this.adapter.load())?.flags ?? []);
    await this.loadRegion('atrio', flags, (p) => this.ui.loading(true, p));
    this.ui.loading(false);
    this.mode = 'splash';
    this.ui.splash(true);
    this.audio.setMood('menu');
    requestAnimationFrame((t) => this.frame(t));
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
    document.documentElement.style.setProperty('--ui-scale', String(s.textScale));
    for (const a of Object.keys(DEFAULT_KEYS) as ActionName[]) this.input.keys[a] = s.keys[a] ?? [...DEFAULT_KEYS[a]];
    this.applyAudio();
    storeSettings(s);
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
  save(): void {
    if (!this.state) return;
    this.adapter.save(D.serialize(this.state));
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
    this.ui.closeAll();
    this.clearPreview();
    await this.loadRegion('atrio', new Set());
    this.spawnPlayer('inicio');
    this.save();
    this.enterPlay();
    await this.ui.fade(false);
    this.busy = false;
    this.ui.regionTitle(this.region.name, this.region.subtitle);
    this.runScript(() => Story.opening(this));
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
    for (const p of this.projectiles) sc.remove(p.mesh);
    for (const p of this.props) if (p.own && p.obj) sc.remove(p.obj);
    this.npcs = [];
    this.enemies = [];
    this.projectiles = [];
    this.props = [];
    this.crivo.model.root.visible = false;
  }

  private async loadRegion(id: RegionId, flags: Set<string>, progress?: (p: number) => void): Promise<void> {
    const sc = this.engine.scene;
    this.despawn();
    if (this.region) {
      sc.remove(this.region.root);
      this.region.root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
      });
    }
    progress?.(0.3);
    await this.nextPaint();
    this.region = buildRegion(id, { flags, quality: this.settings.quality });
    sc.add(this.region.root);
    this.engine.applyEnv(this.region.env);
    this.engine.setFogAmount(1);
    this.engine.setLamps(this.region.lamps);
    this.audio.setAmbience(this.region.env.rain, this.region.env.interior ? 0.05 : 0.35);
    progress?.(0.8);
    await this.nextPaint();
    // compila os materiais antes de revelar a cena
    this.engine.render(0.016, this.focus);
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
    p.onStep = () => this.audio.sfx(r.env.rain > 0.5 ? 'passoMolhado' : 'passo', 0.7);
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
        if (def.data?.item === 'moedas') {
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
  refreshProps(): void {
    for (const p of this.props) {
      if (p.obj) p.obj.visible = this.propVisible(p);
      if (p.lid) p.lid.rotation.x = this.state!.collected.includes(p.def.id) ? -1.9 : 0;
    }
  }
  prop(id: string): PropRt | undefined {
    return this.props.find((p) => p.def.id === id);
  }

  // ---------- diálogo e roteiros ----------
  private talkingNpc: Npc | null = null;
  async runScript(fn: () => Promise<void>, npc: Npc | null = null): Promise<void> {
    if (this.mode !== 'play') return;
    this.mode = 'dialogue';
    this.input.releaseLock();
    this.ui.prompt(null);
    this.talkingNpc = npc;
    if (npc) npc.talking = true;
    if (this.player) this.player.frozen = true;
    try {
      await fn();
    } catch (err) {
      this.errors.push(String(err));
      console.error(err);
    }
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
  say(who: string, text: string): Promise<void> {
    const def = NPCS[who];
    return this.ui.say(def?.name ?? who, def?.role ?? '', text);
  }
  choose(options: Array<{ text: string; tag?: string }>, pre?: number): Promise<number> {
    return this.ui.choose(options, this.autoChoice ?? pre);
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
    this.ui.closeAll();
    this.audio.sfx('ui');
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
      if (d - e.radius > range || Math.abs(e.pos.y - (origin.y - 1)) > 2.6) continue;
      if (d > 0.6 && (dx * dir.x + dz * dir.z) / d < Math.cos(arc)) continue;
      const dealt = e.damage(heavy ? st.heavyDamage : st.damage, heavy, st.heavyStagger);
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
    p.hurt();
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
    if (this.player?.lockTarget === e) this.player.lockTarget = null;
    if (!this.enemies.some((o) => o !== e && o.alive && o.group === e.group)) {
      if (D.setFlag(s, `limpo:${r.id}:${e.group}`)) Story.onGroupCleared(this, r.id, e.group);
      this.refreshProps();
      this.checkpoint();
    }
  }

  private fell(): void {
    const p = this.player!;
    const s = this.state!;
    p.teleport(p.lastSafe.x, p.lastSafe.y, p.lastSafe.z, p.yaw);
    s.hp = Math.max(1, s.hp - 15);
    this.ui.hurt(15);
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
      p.yaw = Math.atan2(n.pos.x - p.pos.x, n.pos.z - p.pos.z);
      this.runScript(() => Story.talk(this, n.def.id), n);
      return;
    }
    const x = t.prop!;
    const s = this.state!;
    const d = x.def;
    const data = d.data ?? {};
    p.fig.play('interact');
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
    this.refreshProps();
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
    this.ui.update(dt);
    this.audio.update();

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
      } else if (m === 'book' || m === 'pause' || m === 'shop') {
        if (inp.took('pausa')) this.closeOverlay();
        else if (m === 'book') {
          if (inp.took('inventario')) this.openBookTab('inventario');
          else if (inp.took('diario')) this.openBookTab('diario');
          else if (inp.took('mapa')) this.openBookTab('mapa');
          else if (inp.took('habilidades')) this.openBookTab('habilidades');
        }
      }
      if (inp.usingPad && m !== 'play') {
        if (inp.took('interagir')) m === 'dialogue' ? this.ui.advance() : this.ui.activate();
        if (inp.padMove.y > 0.6 && !this.padNav) this.ui.moveFocus(1);
        if (inp.padMove.y < -0.6 && !this.padNav) this.ui.moveFocus(-1);
        this.padNav = Math.abs(inp.padMove.y) > 0.6;
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
    this.updateSparks(dt);
    this.engine.render(dt, this.focus);
  }
  private padNav = false;

  private updateTitle(dt: number, m: Mode): void {
    const cam = this.engine.camera;
    if (m === 'create' && this.preview) {
      const t = new THREE.Vector3(0.55, 1.45, 15.7);
      if (this.snapCreateCam) {
        cam.position.copy(t);
        this.snapCreateCam = false;
      } else cam.position.lerp(t, Math.min(1, dt * 2.5));
      cam.lookAt(-1.05, 1.0, 13.4);
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

  private updateWorld(dt: number, controls: boolean): void {
    const s = this.state!;
    const p = this.player!;
    const r = this.region;
    const inp = this.input;
    const st = this.stats;
    const cam = this.engine.camera;
    s.playtime += dt;
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
        const c = this.enemies.filter((e) => e.alive && e.pos.distanceTo(p.pos) < 16).sort((a, b) => a.pos.distanceTo(p.pos) - b.pos.distanceTo(p.pos))[0];
        p.lockTarget = c ?? null;
        this.audio.sfx(c ? 'ui' : 'uiNegar');
      }
    }
    if (p.lockTarget && (!p.lockTarget.alive || p.lockTarget.pos.distanceTo(p.pos) > 20)) p.lockTarget = null;

    p.sensitivity = this.settings.sens;
    p.invertY = this.settings.invertY;
    const lantern = D.isEquipped(s, 'lanterna_transparencia');
    p.light.intensity = lantern ? 26 : 9;
    p.light.distance = lantern ? 16 : 9;
    p.update(dt, inp, r, st, cam, controls);
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
        this.projectiles.splice(i, 1);
      }
    }
    const fighting = this.enemies.some((e) => e.alive && e.aggro && e.pos.distanceTo(p.pos) < 26);
    if (fighting && !this.inCombat && !this.combatSeen) {
      this.combatSeen = true;
      if (!s.flags.includes('tutorial_combate')) {
        D.setFlag(s, 'tutorial_combate');
        this.ui.hint(`${this.ui.key('ataque')} golpe leve · ${this.ui.key('golpe')} golpe firme · ${this.ui.key('esquiva')} esquiva · ${this.ui.key('crivo')} pulso do Crivo · ${this.ui.key('travar')} trava a mira`, 'Encontro', 10);
      }
    }
    this.inCombat = fighting;
    this.audio.setCombat(fighting ? 1 : 0);

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
      if (inp.took('item')) this.useItem('caldo');
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
      if (near && !p.fig.busy && inp.took('interagir')) this.interact(near);
    } else this.ui.prompt(null);

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
      coins: s.coins,
      quest: tq ? tq.def.title : 'Sem objetivo acompanhado',
      step: stepText,
      ability: s.crivoActive === 'lupa' && s.crivoSkills.includes('lupa') ? 'lupa' : 'pulso',
      abilityCd: Math.min(1, this.abilityCd / cdMax),
      caldo: D.countItem(s, 'caldo'),
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
