import type { Quality } from './engine';

/**
 * Qualidade de render escolhida pelo jogo, sem opção nos Ajustes. A imagem é sempre a PS2 tardia; a qualidade
 * só decide as linhas internas (576, 512 ou 448), as sombras e o brilho das luzes.
 *
 * Começa alta no computador e baixa no aparelho de toque, que é o que poupa bateria e segura o quadro num
 * celular comum. Durante o jogo, se o ritmo médio ficar abaixo de 28 quadros por segundo por quatro segundos
 * seguidos, desce um degrau, no máximo até a baixa, e nunca sobe de volta na mesma sessão: subir e descer
 * recompila os shaders e troca um tropeço contínuo por vários.
 */
export const FPS_MINIMO = 28;
const JANELA_S = 4;
/** depois de uma troca, o tropeço da recompilação não conta */
const RESPIRO_S = 6;

export function initialQuality(touch: boolean): Quality {
  return touch ? 'baixa' : 'alta';
}

export function stepDown(q: Quality): Quality | null {
  return q === 'alta' ? 'media' : q === 'media' ? 'baixa' : null;
}

export class QualityGovernor {
  private sum = 0;
  private frames = 0;
  private rest = RESPIRO_S;

  constructor(public quality: Quality) {}

  /**
   * Um quadro de jogo. Devolve a qualidade nova quando é hora de descer, senão null. Quadros longos demais
   * (aba em segundo plano, carga, depurador) não entram na conta.
   */
  frame(dt: number): Quality | null {
    if (!(dt > 0) || dt > 0.25) return null;
    if (this.rest > 0) {
      this.rest -= dt;
      return null;
    }
    this.sum += dt;
    this.frames++;
    if (this.sum < JANELA_S) return null;
    const fps = this.frames / this.sum;
    this.sum = 0;
    this.frames = 0;
    if (fps >= FPS_MINIMO) return null;
    const next = stepDown(this.quality);
    if (!next) return null;
    this.quality = next;
    this.rest = RESPIRO_S;
    return next;
  }

  /** a medição recomeça (região nova, volta da pausa) */
  reset(): void {
    this.sum = 0;
    this.frames = 0;
    this.rest = Math.max(this.rest, 2);
  }
}
