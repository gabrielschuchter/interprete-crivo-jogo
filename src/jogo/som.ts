/**
 * Efeitos e música. Equivale ao autoload Sfx do original (scripts/sfx.gd): volume em dB por chave,
 * variação de tom e janela mínima entre repetições do mesmo som.
 */
import { MUSICAS, SONS } from './config';
import { buffers } from './recursos';

const db = (v: number): number => Math.pow(10, v / 20);

class Som {
  ctx: AudioContext | null = null;
  private mestre: GainNode | null = null;
  private ultimo: Record<string, number> = {};
  private musica: { chave: string; fonte: AudioBufferSourceNode; ganho: GainNode } | null = null;
  private unicos: Record<string, AudioBufferSourceNode> = {};
  volume = 1;

  iniciar(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    this.ctx = new C();
    this.mestre = this.ctx.createGain();
    this.mestre.gain.value = this.volume * this.volume;
    this.mestre.connect(this.ctx.destination);
    return this.ctx;
  }

  /** o navegador só libera o áudio depois de um gesto */
  destravar(): void {
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  definirVolume(v: number): void {
    this.volume = v;
    // HSlider linear do original passa por linear_to_db: a percepção acompanha o quadrado
    if (this.mestre) this.mestre.gain.value = v * v;
  }

  tocar(chave: string, extraDb = 0, janelaMs = 0): void {
    const cfg = SONS[chave];
    if (!cfg || !this.ctx || !this.mestre) return;
    const buf = buffers[cfg[0]];
    if (!buf) return;
    if (janelaMs > 0) {
      const agora = performance.now();
      if (agora - (this.ultimo[chave] ?? -1e9) < janelaMs) return;
      this.ultimo[chave] = agora;
    }
    const f = this.ctx.createBufferSource();
    f.buffer = buf;
    const pv = cfg[2];
    if (pv > 0) f.playbackRate.value = 1 + (Math.random() * 2 - 1) * pv;
    const g = this.ctx.createGain();
    g.gain.value = db(cfg[1] + extraDb);
    f.connect(g).connect(this.mestre);
    f.start();
  }

  /** um AudioStreamPlayer só, que recomeça a cada chamada (XPSound do main.tscn) */
  tocarUnico(chave: string): void {
    const cfg = SONS[chave];
    if (!cfg || !this.ctx || !this.mestre) return;
    const buf = buffers[cfg[0]];
    if (!buf) return;
    try {
      this.unicos[chave]?.stop();
    } catch {
      /* já parou */
    }
    const f = this.ctx.createBufferSource();
    f.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = db(cfg[1]);
    f.connect(g).connect(this.mestre);
    f.start();
    this.unicos[chave] = f;
  }

  musicaAtual(): string | null {
    return this.musica?.chave ?? null;
  }

  /** música em laço; idempotente para a mesma chave (ensure_menu_music) */
  tocarMusica(chave: keyof typeof MUSICAS): void {
    if (!this.ctx || !this.mestre) return;
    if (this.musica?.chave === chave) return;
    this.pararMusica();
    const [arq, vol] = MUSICAS[chave];
    const buf = buffers[arq];
    if (!buf) return;
    const f = this.ctx.createBufferSource();
    f.buffer = buf;
    f.loop = true;
    const g = this.ctx.createGain();
    g.gain.value = db(vol);
    f.connect(g).connect(this.mestre);
    f.start();
    this.musica = { chave, fonte: f, ganho: g };
  }

  pararMusica(): void {
    if (!this.musica) return;
    try {
      this.musica.fonte.stop();
    } catch {
      /* já parou */
    }
    this.musica = null;
  }
}

export const som = new Som();
