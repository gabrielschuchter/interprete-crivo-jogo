/**
 * Áudio em Web Audio: trilha (arquivos CC-BY de Kevin MacLeod, com a trilha generativa como reserva),
 * ambiência gravada em laço, passos por superfície e golpes gravados, mais efeitos sintetizados.
 * Origem e licença de cada arquivo em docs/game/REGISTRO_DE_ASSETS.md.
 * Só inicia após um gesto do usuário (política de autoplay).
 */
import { report } from './diag';

export type MusicMood = 'menu' | 'atrio' | 'bosque' | 'arquivo' | 'observatorio';
export type Surface = 'pedra' | 'terra' | 'entulho' | 'agua';
export type AmbienceLoop = 'sala' | 'salao' | 'agua' | 'poca';

const BASE = import.meta.env.BASE_URL + 'audio/';

const SCALES: Record<MusicMood, { root: number; chords: number[][]; scale: number[]; tempo: number }> = {
  // graus em semitons a partir da tônica
  menu: { root: 50, chords: [[0, 7, 15], [-4, 3, 12], [-7, 5, 12], [-2, 5, 14]], scale: [0, 2, 3, 7, 10, 12, 14, 15], tempo: 7 },
  atrio: { root: 50, chords: [[0, 7, 15], [-4, 3, 12], [5, 12, 20], [-2, 5, 14]], scale: [0, 2, 3, 5, 7, 10, 12, 15], tempo: 6.5 },
  bosque: { root: 45, chords: [[0, 7, 14], [3, 10, 15], [-2, 5, 12], [0, 7, 12]], scale: [0, 2, 3, 7, 8, 12, 14], tempo: 8 },
  arquivo: { root: 48, chords: [[0, 7, 16], [-3, 4, 12], [5, 9, 16], [-5, 2, 11]], scale: [0, 2, 4, 7, 9, 12, 14, 16], tempo: 7.5 },
  observatorio: { root: 43, chords: [[0, 7, 15], [1, 8, 13], [-4, 3, 8], [-2, 5, 10]], scale: [0, 1, 3, 7, 8, 12, 13], tempo: 5 },
};

function mtof(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

export class AudioSys {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private ambBus!: GainNode;
  private reverb!: ConvolverNode;
  private rainGain!: GainNode;
  private windGain!: GainNode;
  private combatGain!: GainNode;
  private noiseBuf!: AudioBuffer;
  private mood: MusicMood = 'menu';
  private chordI = 0;
  private nextChord = 0;
  private nextNote = 0;
  private nextBeat = 0;
  private combat = 0;
  volumes = { geral: 0.8, musica: 0.6, efeitos: 0.85, ambiente: 0.7 };
  private rainTarget = 0;
  private windTarget = 0.3;
  started = false;
  /** amostras curtas: bytes baixados na abertura, decodificados quando o contexto nasce */
  private raw = new Map<string, ArrayBuffer>();
  private bufs = new Map<string, AudioBuffer[]>();
  private musicEl: { el: HTMLAudioElement; gain: GainNode; mood: MusicMood } | null = null;
  private fileMusic = false;
  private ambLoops = new Map<AmbienceLoop, { el: HTMLAudioElement; gain: GainNode }>();
  private ambWanted: Partial<Record<AmbienceLoop, number>> = {};
  private lastPick = new Map<string, number>();
  private blocked = new Set<HTMLAudioElement>();

  /** Baixa os efeitos gravados (pequenos). Música e ambiência vêm por streaming. */
  async preload(): Promise<void> {
    try {
      const idx = (await (await fetch(BASE + 'efeitos/indice.json')).json()) as Record<string, number>;
      const files: string[] = ['energia'];
      for (const [k, n] of Object.entries(idx)) for (let i = 1; i <= n; i++) files.push(`${k}-${i}`);
      await Promise.all(
        files.map(async (f) => {
          try {
            const r = await fetch(BASE + `efeitos/${f}.mp3`);
            if (r.ok) this.raw.set(f, await r.arrayBuffer());
            else report('áudio', `efeitos/${f}.mp3`, `HTTP ${r.status}; vale o efeito sintetizado`);
          } catch {
            report('áudio', `efeitos/${f}.mp3`, 'sem resposta; vale o efeito sintetizado');
          }
        }),
      );
    } catch {
      report('áudio', 'efeitos/indice.json', 'índice ausente; todos os efeitos gravados caem na síntese');
    }
  }

  private decodeAll(): void {
    const ctx = this.ctx!;
    for (const [f, ab] of this.raw) {
      const key = f.replace(/-\d+$/, '');
      void ctx
        .decodeAudioData(ab.slice(0))
        .then((b) => {
          const list = this.bufs.get(key) ?? [];
          list.push(b);
          this.bufs.set(key, list);
        })
        .catch(() => report('áudio', `efeitos/${f}.mp3`, 'não decodificou'));
    }
  }

  /** Toca uma amostra do grupo, sem repetir a última, com leve variação de altura. */
  private sample(group: string, vol: number, rate = 1, spread = 0.08): boolean {
    const ctx = this.ctx;
    const list = this.bufs.get(group);
    if (!ctx || ctx.state !== 'running' || !list?.length) return false;
    let i = Math.floor(Math.random() * list.length);
    if (list.length > 1 && i === this.lastPick.get(group)) i = (i + 1) % list.length;
    this.lastPick.set(group, i);
    const s = ctx.createBufferSource();
    s.buffer = list[i];
    s.playbackRate.value = rate * (1 - spread / 2 + Math.random() * spread);
    const g = ctx.createGain();
    g.gain.value = vol;
    s.connect(g).connect(this.sfxBus);
    s.start();
    return true;
  }

  /** Elemento de áudio em laço ligado a um barramento (streaming, sem decodificar o arquivo inteiro). */
  private stream(url: string, bus: GainNode, loop: boolean): { el: HTMLAudioElement; gain: GainNode } | null {
    const ctx = this.ctx;
    if (!ctx) return null;
    const el = new Audio();
    el.crossOrigin = 'anonymous';
    el.preload = 'auto';
    el.loop = loop;
    el.src = url;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    try {
      ctx.createMediaElementSource(el).connect(gain).connect(bus);
    } catch {
      return null;
    }
    // reprodução recusada (política de autoplay): fica na fila e toca no próximo gesto do jogador
    void el.play().catch(() => this.blocked.add(el));
    el.addEventListener('error', () => report('áudio', url.replace(BASE, ''), 'não carregou'));
    return { el, gain };
  }

  private fadeOut(x: { el: HTMLAudioElement; gain: GainNode }, secs: number): void {
    const t = this.ctx!.currentTime;
    x.gain.gain.cancelScheduledValues(t);
    x.gain.gain.setTargetAtTime(0, t, secs / 4);
    setTimeout(() => {
      x.el.pause();
      x.el.removeAttribute('src');
      x.el.load();
      x.gain.disconnect();
    }, secs * 1000 + 200);
  }

  private startMusic(): void {
    if (!this.ctx || this.musicEl?.mood === this.mood) return;
    if (this.musicEl) this.fadeOut(this.musicEl, 3);
    const m = this.stream(BASE + `musica/${this.mood}.mp3`, this.musicBus, true);
    if (!m) {
      this.fileMusic = false;
      this.musicEl = null;
      return;
    }
    const mood = this.mood;
    this.musicEl = { ...m, mood };
    // a trilha gravada só substitui a generativa quando de fato começa a tocar
    this.fileMusic = false;
    m.el.addEventListener('playing', () => {
      if (this.musicEl?.mood === mood) this.fileMusic = true;
    });
    m.el.addEventListener('error', () => {
      if (this.musicEl?.mood === mood) this.fileMusic = false;
    });
    m.gain.gain.setTargetAtTime(0.9, this.ctx.currentTime + 0.5, 1.2);
  }

  /** Laços gravados por região; volume 0 desliga. */
  setLoops(want: Partial<Record<AmbienceLoop, number>>): void {
    this.ambWanted = want;
    this.syncLoops();
  }

  private syncLoops(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    for (const k of ['sala', 'salao', 'agua', 'poca'] as AmbienceLoop[]) {
      const v = this.ambWanted[k] ?? 0;
      let cur = this.ambLoops.get(k);
      if (v > 0 && !cur) {
        cur = this.stream(BASE + `ambiente/${k}.mp3`, this.ambBus, true) ?? undefined;
        if (cur) this.ambLoops.set(k, cur);
      }
      if (cur) {
        cur.gain.gain.setTargetAtTime(v, ctx.currentTime, 1.0);
        if (v <= 0) {
          this.fadeOut(cur, 3);
          this.ambLoops.delete(k);
        }
      }
    }
  }

  /** Passo gravado por superfície; sem amostra, cai no ruído filtrado. */
  step(surface: Surface, p = 1): void {
    const group = surface === 'agua' ? 'passo-agua' : `passo-${surface}`;
    if (!this.sample(group, 0.55 * p, 1, 0.14)) this.sfx(surface === 'agua' ? 'passoMolhado' : 'passo', p);
  }

  start(): void {
    if (this.started) {
      void this.ctx?.resume();
      for (const el of this.blocked) {
        this.blocked.delete(el);
        if (el.src) void el.play().catch(() => this.blocked.add(el));
      }
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.started = true;
    this.master = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);
    this.musicBus = ctx.createGain();
    this.sfxBus = ctx.createGain();
    this.ambBus = ctx.createGain();
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.impulse(3.2);
    const wet = ctx.createGain();
    wet.gain.value = 0.55;
    this.reverb.connect(wet).connect(this.master);
    this.musicBus.connect(this.master);
    this.musicBus.connect(this.reverb);
    this.sfxBus.connect(this.master);
    const sfxWet = ctx.createGain();
    sfxWet.gain.value = 0.22;
    this.sfxBus.connect(sfxWet).connect(this.reverb);
    this.ambBus.connect(this.master);

    this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    // chuva: ruído em duas bandas
    this.rainGain = ctx.createGain();
    this.rainGain.gain.value = 0;
    const rn = this.loopNoise();
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1800;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 9000;
    rn.connect(hp).connect(lp).connect(this.rainGain).connect(this.ambBus);
    const rn2 = this.loopNoise();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 480;
    bp.Q.value = 0.6;
    const g2 = ctx.createGain();
    g2.gain.value = 0.5;
    rn2.connect(bp).connect(g2).connect(this.rainGain);

    // vento: ruído grave com varredura lenta
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0;
    const wn = this.loopNoise();
    const wf = ctx.createBiquadFilter();
    wf.type = 'bandpass';
    wf.frequency.value = 260;
    wf.Q.value = 1.4;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lg = ctx.createGain();
    lg.gain.value = 140;
    lfo.connect(lg).connect(wf.frequency);
    lfo.start();
    wn.connect(wf).connect(this.windGain).connect(this.ambBus);

    this.combatGain = ctx.createGain();
    this.combatGain.gain.value = 0;
    this.combatGain.connect(this.musicBus);
    this.applyVolumes();
    this.nextChord = this.nextNote = this.nextBeat = ctx.currentTime + 0.3;
    this.decodeAll();
    this.startMusic();
    this.syncLoops();
  }

  private impulse(seconds: number): AudioBuffer {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    return b;
  }

  private loopNoise(): AudioBufferSourceNode {
    const s = this.ctx!.createBufferSource();
    s.buffer = this.noiseBuf;
    s.loop = true;
    s.start(0, Math.random() * 1.5);
    return s;
  }

  applyVolumes(): void {
    if (!this.ctx) return;
    this.master.gain.value = this.volumes.geral;
    this.musicBus.gain.value = this.volumes.musica * 0.5;
    this.sfxBus.gain.value = this.volumes.efeitos;
    this.ambBus.gain.value = this.volumes.ambiente * 0.6;
  }

  setMood(m: MusicMood): void {
    if (m !== this.mood) {
      this.mood = m;
      this.chordI = 0;
      this.startMusic();
    }
  }

  setAmbience(rain: number, wind: number): void {
    this.rainTarget = rain;
    this.windTarget = wind;
  }

  setCombat(v: number): void {
    this.combat = v;
  }

  /** chamado a cada quadro: agenda acordes e notas com antecedência */
  update(): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    this.rainGain.gain.setTargetAtTime(this.rainTarget * 0.22, t, 0.8);
    this.windGain.gain.setTargetAtTime(this.windTarget * 0.5, t, 1.2);
    this.combatGain.gain.setTargetAtTime(this.combat, t, 0.5);
    const sc = SCALES[this.mood];
    if (this.fileMusic) {
      // trilha gravada no ar: o gerador só marca o tempo para a percussão de combate
      this.nextChord = this.nextNote = t + 0.5;
    }
    if (t > this.nextChord - 0.2) {
      const chord = sc.chords[this.chordI % sc.chords.length];
      this.pad(chord.map((n) => sc.root + n), this.nextChord, sc.tempo);
      this.pad([sc.root + chord[0] - 12], this.nextChord, sc.tempo, 0.07, 'sine');
      this.chordI++;
      this.nextChord += sc.tempo;
    }
    if (t > this.nextNote - 0.2) {
      if (Math.random() < 0.72) {
        const n = sc.root + 12 + sc.scale[Math.floor(Math.random() * sc.scale.length)];
        this.pluck(n, this.nextNote, 0.05 + Math.random() * 0.05);
        if (Math.random() < 0.3) this.pluck(n + 7, this.nextNote + 0.18, 0.03);
      }
      this.nextNote += sc.tempo / (Math.random() < 0.5 ? 4 : 8) + Math.random() * 0.4;
    }
    if (t > this.nextBeat - 0.1) {
      if (this.combat > 0.05) {
        this.drum(this.nextBeat, 1);
        this.drum(this.nextBeat + 0.27, 0.45);
        this.drum(this.nextBeat + 0.54, 0.7);
      }
      this.nextBeat += 0.81;
    }
  }

  private pad(notes: number[], at: number, dur: number, vol = 0.045, type: OscillatorType = 'sawtooth'): void {
    const ctx = this.ctx!;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0, at);
    out.gain.linearRampToValueAtTime(vol, at + dur * 0.35);
    out.gain.linearRampToValueAtTime(0, at + dur * 1.25);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(380, at);
    f.frequency.linearRampToValueAtTime(900, at + dur * 0.5);
    f.frequency.linearRampToValueAtTime(320, at + dur * 1.25);
    f.connect(out).connect(this.musicBus);
    for (const n of notes) {
      for (const det of [-6, 5]) {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = mtof(n);
        o.detune.value = det;
        o.connect(f);
        o.start(at);
        o.stop(at + dur * 1.3);
      }
    }
  }

  private pluck(note: number, at: number, vol: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = mtof(note);
    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = mtof(note) * 2.01;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(vol, at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 2.4);
    const g2 = ctx.createGain();
    g2.gain.value = 0.25;
    o.connect(g);
    o2.connect(g2).connect(g);
    g.connect(this.musicBus);
    o.start(at);
    o2.start(at);
    o.stop(at + 2.5);
    o2.stop(at + 2.5);
  }

  private drum(at: number, vol: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(110, at);
    o.frequency.exponentialRampToValueAtTime(42, at + 0.16);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5 * vol, at);
    g.gain.exponentialRampToValueAtTime(0.001, at + 0.3);
    o.connect(g).connect(this.combatGain);
    o.start(at);
    o.stop(at + 0.32);
  }

  private noise(dur: number, vol: number, type: BiquadFilterType, f0: number, f1: number, q = 1): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    const s = ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f).connect(g).connect(this.sfxBus);
    s.start(t, Math.random());
    s.stop(t + dur + 0.02);
  }

  private tone(freq: number, dur: number, vol: number, type: OscillatorType = 'sine', slide = 1, delay = 0): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide !== 1) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g).connect(this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  sfx(name: string, p = 1): void {
    switch (name) {
      case 'passo':
        this.noise(0.07, 0.07 * p, 'bandpass', 900 + Math.random() * 500, 300, 1.2);
        break;
      case 'passoMolhado':
        this.noise(0.09, 0.08 * p, 'bandpass', 1600 + Math.random() * 800, 500, 0.9);
        this.noise(0.05, 0.04 * p, 'highpass', 4000, 3000);
        break;
      case 'golpe':
        if (!this.sample('espada', 0.5, 1.05, 0.12)) this.noise(0.2, 0.2, 'bandpass', 500, 2600, 1.6);
        break;
      case 'golpeFirme':
        if (!this.sample('lamina', 0.62, 0.86, 0.06)) this.noise(0.34, 0.26, 'bandpass', 260, 2200, 1.3);
        else this.noise(0.3, 0.12, 'bandpass', 260, 1800, 1.3);
        break;
      case 'impacto':
        this.noise(0.12, 0.4, 'lowpass', 2400, 300);
        this.tone(170, 0.18, 0.32, 'triangle', 0.5);
        break;
      case 'impactoChao':
        this.noise(0.3, 0.5, 'lowpass', 900, 80);
        this.tone(70, 0.4, 0.5, 'sine', 0.5);
        break;
      case 'dano':
        this.tone(220, 0.22, 0.3, 'sawtooth', 0.45);
        this.noise(0.14, 0.25, 'lowpass', 1200, 200);
        break;
      case 'esquiva':
        this.noise(0.26, 0.16, 'bandpass', 1800, 420, 0.8);
        break;
      case 'crivo':
        this.tone(880 + Math.random() * 240, 0.07, 0.07 * p, 'sine', 1.35);
        break;
      case 'crivoCurioso':
        this.tone(700, 0.08, 0.09, 'sine', 1.5);
        this.tone(1050, 0.1, 0.09, 'sine', 1.25, 0.09);
        break;
      case 'crivoAlegre':
        [0, 4, 7, 12].forEach((n, i) => this.tone(mtof(76 + n), 0.12, 0.09, 'sine', 1.02, i * 0.07));
        break;
      case 'pulso':
        this.sample('energia', 0.42, 1.1, 0.1);
        this.tone(1300, 0.5, 0.2, 'sine', 0.16);
        this.noise(0.5, 0.18, 'bandpass', 3000, 240, 2);
        break;
      case 'lupa':
        this.tone(520, 0.6, 0.12, 'triangle', 2.2);
        this.tone(780, 0.6, 0.08, 'sine', 2.2, 0.05);
        break;
      case 'pegar':
        this.tone(mtof(79), 0.14, 0.12, 'triangle');
        this.tone(mtof(86), 0.24, 0.12, 'triangle', 1, 0.07);
        break;
      case 'moeda':
        this.tone(mtof(91), 0.08, 0.1, 'square');
        this.tone(mtof(96), 0.2, 0.1, 'square', 1, 0.06);
        break;
      case 'ui':
        this.tone(660, 0.05, 0.06, 'triangle');
        break;
      case 'uiAbrir':
        this.noise(0.18, 0.08, 'bandpass', 700, 2400, 0.7);
        break;
      case 'uiNegar':
        this.tone(160, 0.16, 0.14, 'square', 0.8);
        break;
      case 'texto':
        this.tone(420 + Math.random() * 60, 0.025, 0.025, 'square');
        break;
      case 'missao':
        [0, 7, 12, 16].forEach((n, i) => this.tone(mtof(62 + n), 1.4, 0.12, 'triangle', 1, i * 0.16));
        this.tone(mtof(50), 2.2, 0.16, 'sine');
        break;
      case 'nivel':
        [0, 4, 7, 12, 16, 19].forEach((n, i) => this.tone(mtof(64 + n), 0.5, 0.1, 'triangle', 1, i * 0.08));
        break;
      case 'sino':
        this.tone(mtof(57), 3.2, 0.2, 'sine');
        this.tone(mtof(57) * 2.76, 2.2, 0.07, 'sine');
        this.tone(mtof(57) * 5.4, 1.2, 0.03, 'sine');
        break;
      case 'mecanismo':
        this.noise(0.5, 0.3, 'lowpass', 500, 90);
        this.tone(90, 0.6, 0.3, 'sawtooth', 0.7);
        for (let i = 0; i < 5; i++) this.tone(300 + i * 20, 0.04, 0.12, 'square', 1, 0.12 * i);
        break;
      case 'erro':
        this.tone(140, 0.5, 0.25, 'sawtooth', 0.6);
        this.noise(0.4, 0.2, 'lowpass', 400, 80);
        break;
      case 'porta':
        this.noise(0.9, 0.3, 'lowpass', 300, 70);
        this.tone(60, 0.9, 0.3, 'sine', 0.8);
        break;
      case 'portal':
        this.noise(1.1, 0.16, 'bandpass', 300, 2600, 0.6);
        this.tone(110, 1.2, 0.14, 'sine', 2);
        break;
      case 'fiapo':
        this.noise(0.5, 0.14, 'bandpass', 2200, 500, 3);
        break;
      case 'fiapoAviso':
        this.tone(330, 0.3, 0.12, 'sawtooth', 1.6);
        break;
      case 'dissipar':
        this.noise(0.8, 0.22, 'highpass', 1200, 6000);
        this.tone(500, 0.6, 0.1, 'sine', 0.3);
        break;
      case 'chefe':
        this.tone(55, 2.0, 0.4, 'sawtooth', 0.7);
        this.noise(1.6, 0.3, 'lowpass', 600, 60);
        break;
      case 'curar':
        this.tone(mtof(72), 0.3, 0.1, 'sine', 1.5);
        this.tone(mtof(79), 0.4, 0.08, 'sine', 1.2, 0.1);
        break;
      case 'salvar':
        this.tone(mtof(69), 0.5, 0.08, 'sine');
        this.tone(mtof(76), 0.8, 0.08, 'sine', 1, 0.15);
        break;
      default:
        break;
    }
  }
}
