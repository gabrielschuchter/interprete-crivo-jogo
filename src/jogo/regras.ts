/** Regras puras do survivors, testáveis sem navegador. Fórmulas do original, arquivo anotado. */
import { CHEFE, GERADOR, MELHORIAS, XP, type Melhoria } from './config';

/** level_system.gd, _needed_for */
export const xpParaNivel = (nivel: number): number => XP.primeiro + (nivel - 1) * XP.porNivel;

/** enemy_spawner.gd, set_level: sem piso, aperta para sempre */
export const intervaloGeracao = (nivel: number): number => GERADOR.intervaloInicial * Math.pow(GERADOR.decaimentoPorNivel, Math.max(1, nivel) - 1);

/** enemy_spawner.gd, _pick_scene: 5% gigante, 25% rápido, 70% normal */
export function sortearInimigo(r: number): 'gigante' | 'rapido' | 'normal' {
  if (r < GERADOR.chanceGigante) return 'gigante';
  if (r < GERADOR.chanceGigante + GERADOR.chanceRapido) return 'rapido';
  return 'normal';
}

/** boss_system.gd, spawn_boss */
export function atributosChefe(nivel: number): { vida: number; passo: number; descanso: number } {
  return {
    vida: CHEFE.vidaBase + CHEFE.vidaPorNivel * nivel,
    passo: CHEFE.passoBase + CHEFE.passoPorNivel * nivel,
    descanso: CHEFE.descansoBase * Math.pow(CHEFE.descansoDecai, nivel - 1),
  };
}

/** boss.gd, _enter_barrage: 3 + floor(nível × 0,1) anéis */
export const ondasRajada = (nivel: number): number => CHEFE.ondas + Math.floor(nivel * 0.1);

/** main.gd, _show_levelup: tira as esgotadas, as de outro personagem e as de arma que o jogador não tem */
export function filtrarMelhorias(pilhas: Record<string, number>, especiais: string[], temArma: (id: string) => boolean): Melhoria[] {
  return MELHORIAS.filter((u) => {
    if (u.max !== undefined && (pilhas[u.id] ?? 0) >= u.max) return false;
    if (u.precisaEspecial && !especiais.includes(u.precisaEspecial)) return false;
    if (u.precisaArma && !temArma(u.precisaArma)) return false;
    return true;
  });
}

/** Array.shuffle do Godot (Fisher-Yates) seguido de slice(0, 3) */
export function sortearTres<T>(lista: T[], rnd: () => number = Math.random): T[] {
  const a = lista.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, 3);
}

/** main.gd, _desc_for */
export const descricaoMelhoria = (u: Melhoria, pilhas: Record<string, number>): string => ((pilhas[u.id] ?? 0) > 0 && u.descProx ? u.descProx : u.desc);

/** Tween.TRANS_BACK + EASE_OUT do Godot */
export function voltaSaida(t: number): number {
  const s = 1.70158;
  const u = t - 1;
  return u * u * ((s + 1) * u + s) + 1;
}

/** Vector2.move_toward / move_toward escalar */
export function aproximar(v: number, alvo: number, passo: number): number {
  return Math.abs(alvo - v) <= passo ? alvo : v + Math.sign(alvo - v) * passo;
}
