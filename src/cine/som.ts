/**
 * Som da abertura, todo sintetizado em Web Audio na hora (autoral, sem arquivo de terceiros): tosse, cama,
 * sinos, choro abafado, respiração, pano, porta, prensa, carroça, passarinho, o pedal grave, o tema em cordas e a
 * cantiga cantarolada. A chuva e o vento são os do próprio AudioSys. Tudo passa pelos barramentos do jogo
 * (música, efeitos, ambiente), então os volumes dos Ajustes valem aqui também.
 *
 * A cantiga é original deste jogo: melodia de oito compassos em ré dórico, 3/4, e quatro versos. Enquanto não
 * houver voz gravada com autorização (pendência em docs/game/ABERTURA.md), ela é cantarolada por síntese de
 * formantes, e a letra aparece na legenda.
 */
import type { AudioSys } from '../core/audio';

/** letra da cantiga, um verso a cada dois compassos */
export const CANTIGA = ['Dorme, dorme, passarinho,', 'a chuva vai passar.', 'Conta as telhas do caminho,', 'uma a uma, até sonhar.'];
/** melodia: [nota MIDI, tempos]; 0 = pausa. Oito compassos de três tempos. */
const MELODIA: Array<[number, number]> = [
  [69, 1], [69, 1], [65, 1], [67, 1], [69, 2],
  [69, 1], [72, 1], [69, 1], [67, 1], [65, 2],
  [65, 1], [67, 1], [69, 1], [67, 1], [64, 1], [62, 1],
  [64, 1], [65, 1], [64, 1], [62, 3],
];
/** em que nota começa cada verso */
export const VERSO_NOTA = [0, 5, 10, 16];

const mtof = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

export interface Toque {
  parar(s?: number): void;
}
const NADA: Toque = { parar: () => undefined };

export class Som {
  /** avanço rápido: nada toca */
  mudo = false;
  constructor(private audio: AudioSys) {}

  private get c() {
    return this.mudo ? null : this.audio.cena();
  }

  /** ruído filtrado com envelope curto */
  private ruido(at: number, dur: number, vol: number, tipo: BiquadFilterType, f: number, q: number, bus: 'efeitos' | 'ambiente' = 'efeitos', f1?: number): void {
    const c = this.c;
    if (!c) return;
    const s = c.ctx.createBufferSource();
    s.buffer = c.ruido;
    const bq = c.ctx.createBiquadFilter();
    bq.type = tipo;
    bq.frequency.setValueAtTime(f, at);
    if (f1) bq.frequency.exponentialRampToValueAtTime(f1, at + dur);
    bq.Q.value = q;
    const g = c.ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + Math.min(0.02, dur * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    s.connect(bq).connect(g).connect(c[bus]);
    s.start(at, Math.random() * 1.5, dur + 0.05);
  }
  private tom(at: number, f: number, dur: number, vol: number, tipo: OscillatorType = 'sine', f1?: number, bus: 'efeitos' | 'musica' = 'efeitos'): void {
    const c = this.c;
    if (!c) return;
    const o = c.ctx.createOscillator();
    o.type = tipo;
    o.frequency.setValueAtTime(f, at);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, at + dur);
    const g = c.ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g).connect(c[bus]);
    o.start(at);
    o.stop(at + dur + 0.05);
  }
  private get agora(): number {
    return this.c?.ctx.currentTime ?? 0;
  }

  /** chuva e vento do AudioSys (0..1) */
  tempo(chuva: number, vento: number): void {
    this.audio.setAmbience(chuva, vento);
  }

  /** tosse de criança; longe = 0 (perto) a 1 (fundo da sala) */
  tosse(longe = 0.5): void {
    const t = this.agora;
    const v = 0.5 * (1 - longe * 0.8);
    const f = 900 - longe * 400;
    const n = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < n; i++) this.ruido(t + i * 0.28 + Math.random() * 0.05, 0.2, v * (1 - i * 0.2), 'bandpass', f, 1.6, 'efeitos', f * 0.6);
  }
  /** cama de madeira rangendo */
  rangido(vol = 0.25): void {
    const c = this.c;
    if (!c) return;
    const t = this.agora;
    const o = c.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(95, t);
    o.frequency.linearRampToValueAtTime(140, t + 0.25);
    o.frequency.linearRampToValueAtTime(110, t + 0.5);
    const bq = c.ctx.createBiquadFilter();
    bq.type = 'bandpass';
    bq.frequency.value = 1300;
    bq.Q.value = 6;
    const g = c.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    o.connect(bq).connect(g).connect(c.efeitos);
    o.start(t);
    o.stop(t + 0.6);
  }
  /** sino: pequeno (vila) ou grande (cidade) */
  sino(grande = false, vol = 0.3): void {
    const t = this.agora;
    const f0 = grande ? 98 : 523;
    const dur = grande ? 7 : 3.2;
    for (const [k, a] of [[1, 1], [2.0, 0.5], [2.41, 0.6], [3.0, 0.3], [4.5, 0.25], [5.93, 0.15]] as Array<[number, number]>) this.tom(t, f0 * k, dur / Math.sqrt(k), vol * a * 0.4, 'sine');
    this.ruido(t, 0.05, vol * 0.3, 'highpass', 2000, 0.7);
  }
  /** passarinho: dois piados descendentes */
  passarinho(): void {
    const t = this.agora;
    for (let i = 0; i < 3; i++) this.tom(t + i * 0.18, 4200 - i * 300, 0.09, 0.06, 'sine', 3000 - i * 200);
    this.tom(t + 0.9, 3600, 0.14, 0.05, 'sine', 4300);
  }
  /** choro de mulher, abafado por uma parede e pela chuva */
  choro(dur = 4, vol = 0.12): Toque {
    const c = this.c;
    if (!c) return NADA;
    const t = this.agora;
    const s = c.ctx.createBufferSource();
    s.buffer = c.ruido;
    s.loop = true;
    const f1 = c.ctx.createBiquadFilter();
    f1.type = 'bandpass';
    f1.frequency.value = 520;
    f1.Q.value = 5;
    const lp = c.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 700;
    const g = c.ctx.createGain();
    g.gain.value = 0;
    // soluços: subidas irregulares
    let x = t + 0.2;
    while (x < t + dur) {
      const d = 0.5 + Math.random() * 0.7;
      g.gain.setTargetAtTime(vol * (0.6 + Math.random() * 0.4), x, 0.08);
      g.gain.setTargetAtTime(vol * 0.15, x + d * 0.6, 0.15);
      x += d;
    }
    g.gain.setTargetAtTime(0, t + dur, 0.3);
    const o = c.ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = 330;
    const og = c.ctx.createGain();
    og.gain.value = 0.25;
    o.connect(og).connect(f1);
    s.connect(f1).connect(lp).connect(g).connect(c.efeitos);
    s.start(t);
    o.start(t);
    s.stop(t + dur + 1.5);
    o.stop(t + dur + 1.5);
    return { parar: () => g.gain.setTargetAtTime(0, this.agora, 0.2) };
  }
  /** respiração curta e pesada (criança se arrastando) */
  respirar(vol = 0.08): void {
    const t = this.agora;
    this.ruido(t, 0.45, vol, 'bandpass', 1400, 1.2, 'efeitos', 900);
    this.ruido(t + 0.55, 0.6, vol * 0.7, 'bandpass', 900, 1.2, 'efeitos', 600);
  }
  /** aplauso de sala cheia: palmas de ruído em tempos soltos, crescendo e morrendo em `dur` segundos */
  aplauso(dur = 6, vol = 0.16): void {
    if (!this.c) return;
    const t = this.agora;
    const n = Math.round(dur * 55);
    for (let i = 0; i < n; i++) {
      const at = Math.random() * dur;
      const env = Math.sin(Math.PI * Math.min(1, at / dur * 1.15)) ** 0.6;
      this.ruido(t + at, 0.045 + Math.random() * 0.03, vol * (0.35 + Math.random() * 0.65) * env + 0.0002, 'bandpass', 1100 + Math.random() * 1700, 1.1);
    }
  }
  /** pano torcido sobre a bacia: água pingando */
  pano(): void {
    const t = this.agora;
    this.ruido(t, 0.6, 0.12, 'highpass', 1800, 0.8, 'efeitos', 3000);
    for (let i = 0; i < 6; i++) this.tom(t + 0.4 + i * 0.13 + Math.random() * 0.05, 1500 + Math.random() * 600, 0.05, 0.05, 'sine', 700);
  }
  /** batida na porta */
  bater(): void {
    const t = this.agora;
    for (let i = 0; i < 3; i++) {
      this.tom(t + i * 0.32, 110, 0.12, 0.35, 'sine', 70);
      this.ruido(t + i * 0.32, 0.06, 0.2, 'bandpass', 600, 1.5);
    }
  }
  /** porta de madeira rangendo ao abrir */
  porta(): void {
    const c = this.c;
    if (!c) return;
    const t = this.agora;
    const o = c.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(60, t);
    o.frequency.linearRampToValueAtTime(48, t + 1.2);
    const bq = c.ctx.createBiquadFilter();
    bq.type = 'bandpass';
    bq.frequency.setValueAtTime(900, t);
    bq.frequency.linearRampToValueAtTime(1400, t + 1.2);
    bq.Q.value = 8;
    const g = c.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.15, t + 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
    o.connect(bq).connect(g).connect(c.efeitos);
    o.start(t);
    o.stop(t + 1.4);
  }
  /** prensa: madeira contra madeira */
  prensa(): void {
    const t = this.agora;
    this.tom(t, 70, 0.4, 0.5, 'sine', 40);
    this.ruido(t, 0.12, 0.25, 'lowpass', 900, 1);
  }
  /** passo (piso de madeira ou pedra) */
  passo(vol = 0.18): void {
    this.audio.step('pedra', vol * 4);
  }
  /** queda no chão (a criança) */
  queda(): void {
    const t = this.agora;
    this.tom(t, 90, 0.25, 0.35, 'sine', 50);
    this.ruido(t, 0.18, 0.18, 'lowpass', 700, 1);
  }
  /** carroça andando: rodas na pedra e cascos, em laço até parar */
  carroca(vol = 0.2): Toque {
    const c = this.c;
    if (!c) return NADA;
    let vivo = true;
    let prox = this.agora + 0.1;
    let i = 0;
    const tick = () => {
      if (!vivo || !this.c) return;
      const t = this.agora;
      while (prox < t + 0.6) {
        // casco (dois tempos) e chacoalho das rodas
        this.ruido(prox, 0.07, vol * 0.8, 'bandpass', 700 + (i % 2) * 150, 3);
        if (i % 3 === 0) this.ruido(prox + 0.1, 0.18, vol * 0.4, 'lowpass', 300, 0.7);
        prox += i % 2 ? 0.42 : 0.24;
        i++;
      }
      setTimeout(tick, 250);
    };
    tick();
    return { parar: () => (vivo = false) };
  }

  /** pedal grave por baixo da chuva (bloco 1) */
  pedal(vol = 0.06): Toque {
    const c = this.c;
    if (!c) return NADA;
    const t = this.agora;
    const out = c.ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(vol, t + 6);
    const lp = c.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 320;
    lp.connect(out).connect(c.musica);
    const os: OscillatorNode[] = [];
    for (const [f, d] of [[mtof(38), 0], [mtof(45), 3], [mtof(38) * 1.003, -2]] as Array<[number, number]>) {
      const o = c.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = d;
      o.connect(lp);
      o.start(t);
      os.push(o);
    }
    return {
      parar: (s = 3) => {
        const n = this.agora;
        out.gain.cancelScheduledValues(n);
        out.gain.setTargetAtTime(0.0001, n, s / 3);
        for (const o of os) o.stop(n + s + 0.5);
      },
    };
  }

  /**
   * Cantiga cantarolada: voz de menina por formantes (ressonâncias de "u" e "m"), com vibrato. `perto` de 0 a 1
   * muda volume e brilho. `ate` corta no meio (índice de nota), como no plano 2.2.
   */
  cantiga(o: { perto?: number; ate?: number; bpm?: number; desde?: number } = {}): Toque {
    const c = this.c;
    if (!c) return NADA;
    const perto = o.perto ?? 0.5;
    const bpm = o.bpm ?? 72;
    const beat = 60 / bpm;
    const t0 = this.agora + 0.1;
    const ctx = c.ctx;
    const voz = ctx.createOscillator();
    voz.type = 'sawtooth';
    const vib = ctx.createOscillator();
    vib.frequency.value = 5.2;
    const vg = ctx.createGain();
    vg.gain.value = 5;
    vib.connect(vg).connect(voz.detune);
    const f1 = ctx.createBiquadFilter();
    f1.type = 'bandpass';
    f1.frequency.value = 340;
    f1.Q.value = 6;
    const f2 = ctx.createBiquadFilter();
    f2.type = 'bandpass';
    f2.frequency.value = 1000 + perto * 600;
    f2.Q.value = 8;
    const mixG = ctx.createGain();
    const g2 = ctx.createGain();
    g2.gain.value = 0.35 + perto * 0.3;
    const env = ctx.createGain();
    env.gain.value = 0;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1200 + perto * 2400;
    voz.connect(f1).connect(mixG);
    voz.connect(f2).connect(g2).connect(mixG);
    mixG.connect(env).connect(lp).connect(c.efeitos);
    const vol = 0.06 + perto * 0.22;
    let t = t0;
    const ate = Math.min(MELODIA.length, o.ate ?? MELODIA.length);
    for (let i = o.desde ?? 0; i < ate; i++) {
      const [n, b] = MELODIA[i];
      const d = b * beat;
      voz.frequency.setTargetAtTime(mtof(n), t, 0.03);
      env.gain.setTargetAtTime(vol, t, 0.04);
      env.gain.setTargetAtTime(vol * 0.55, t + d * 0.7, 0.08);
      t += d;
    }
    // corte no meio: a voz para de repente; no fim do verso, apaga
    env.gain.setTargetAtTime(0, t, o.ate !== undefined && o.ate < MELODIA.length ? 0.01 : 0.25);
    voz.start(t0);
    vib.start(t0);
    voz.stop(t + 1.5);
    vib.stop(t + 1.5);
    return {
      parar: () => {
        env.gain.cancelScheduledValues(this.agora);
        env.gain.setTargetAtTime(0, this.agora, 0.01);
      },
    };
  }
  /** duração da cantiga inteira no andamento dado, em segundos */
  static duracaoCantiga(bpm = 72, de = 0, ate = MELODIA.length): number {
    return MELODIA.slice(de, ate).reduce((a, [, b]) => a + b, 0) * (60 / bpm);
  }

  /** tema da cantiga em cordas (bloco 2 na janela, bloco 3 mais lento) */
  tema(o: { bpm?: number; vol?: number; oitava?: number } = {}): Toque {
    const c = this.c;
    if (!c) return NADA;
    const ctx = c.ctx;
    const bpm = o.bpm ?? 54;
    const beat = 60 / bpm;
    const vol = o.vol ?? 0.07;
    const t0 = this.agora + 0.2;
    const out = ctx.createGain();
    out.gain.value = 1;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1500;
    lp.connect(out).connect(c.musica);
    const env = ctx.createGain();
    env.gain.value = 0;
    env.connect(lp);
    const vozes = [-7, 0, 7].map((det) => {
      const os = ctx.createOscillator();
      os.type = 'sawtooth';
      os.detune.value = det;
      os.connect(env);
      return os;
    });
    // baixo: tônica e quinta em notas longas
    const baixo = ctx.createOscillator();
    baixo.type = 'triangle';
    const bg = ctx.createGain();
    bg.gain.value = 0;
    baixo.connect(bg).connect(lp);
    let t = t0;
    const oit = (o.oitava ?? 0) * 12;
    let compasso = 0;
    let acc = 0;
    for (const [n, b] of MELODIA) {
      const d = b * beat;
      for (const v of vozes) v.frequency.setTargetAtTime(mtof(n - 12 + oit), t, 0.12);
      env.gain.setTargetAtTime(vol, t, 0.25);
      env.gain.setTargetAtTime(vol * 0.6, t + d * 0.6, 0.4);
      if (acc % 3 === 0) {
        baixo.frequency.setTargetAtTime(mtof(compasso % 4 === 3 ? 33 : 38), t, 0.2);
        bg.gain.setTargetAtTime(vol * 1.4, t, 0.3);
        compasso++;
      }
      acc += b;
      t += d;
    }
    env.gain.setTargetAtTime(0, t, 1.2);
    bg.gain.setTargetAtTime(0, t, 1.5);
    for (const v of vozes) {
      v.start(t0);
      v.stop(t + 6);
    }
    baixo.start(t0);
    baixo.stop(t + 6);
    return {
      parar: (s = 2) => {
        const n = this.agora;
        out.gain.setTargetAtTime(0, n, s / 3);
      },
    };
  }
}
