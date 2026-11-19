/** Carga das imagens (public/sv) e dos sons (public/sv/sons). */
import manifesto from './sprites.json';
import { MUSICAS, SONS } from './config';

export interface Quadro {
  img: HTMLImageElement;
  /** silhueta branca para o clarão de dano (shaders/hit_flash.gdshader do original) */
  branco: HTMLCanvasElement | null;
  w: number;
  h: number;
  W: number;
  H: number;
  ox: number;
  oy: number;
}

const BASE = `${import.meta.env.BASE_URL}sv/`;
export const quadros: Record<string, Quadro> = {};
export const imagens: Record<string, HTMLImageElement> = {};
export const buffers: Record<string, AudioBuffer> = {};

const COM_CLARAO = /^(morcego|escorpiao|gigante|chefe)_/;

function carregarImagem(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, falha) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => ok(img);
    img.onerror = () => falha(new Error(`imagem ${src}`));
    img.src = src;
  });
}

function silhueta(img: HTMLImageElement): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = '#fff';
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

export async function carregarTudo(ctx: AudioContext | null, progresso: (p: number) => void): Promise<void> {
  const nomes = Object.keys(manifesto.quadros) as Array<keyof typeof manifesto.quadros>;
  const extras = ['retrato_mago', 'retrato_cav', 'derrota'];
  const sons = new Set<string>([...Object.values(SONS).map((s) => s[0]), ...Object.values(MUSICAS).map((m) => m[0])]);
  const total = nomes.length + extras.length + sons.size;
  let feitos = 0;
  const um = () => progresso(++feitos / total);
  const tarefas: Promise<void>[] = [];
  for (const n of nomes) {
    tarefas.push(
      carregarImagem(`${BASE}${n}.webp`).then((img) => {
        const m = manifesto.quadros[n];
        quadros[n] = { img, branco: COM_CLARAO.test(n) ? silhueta(img) : null, w: m.w, h: m.h, W: m.W, H: m.H, ox: m.ox, oy: m.oy };
        um();
      }),
    );
  }
  for (const n of extras) tarefas.push(carregarImagem(`${BASE}${n}.webp`).then((img) => void ((imagens[n] = img), um())));
  for (const s of sons) {
    tarefas.push(
      fetch(`${BASE}sons/${s}.mp3`)
        .then((r) => {
          if (!r.ok) throw new Error(`som ${s}`);
          return r.arrayBuffer();
        })
        .then((ab) => (ctx ? ctx.decodeAudioData(ab) : null))
        .then((b) => {
          if (b) buffers[s] = b;
          um();
        }),
    );
  }
  await Promise.all(tarefas);
}
