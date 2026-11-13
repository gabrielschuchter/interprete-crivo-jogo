import { env, span, type Pose } from './motion';

/**
 * Ações de interação do protagonista, desenhadas por pose sobre o idle: abaixar e pegar, examinar, puxar
 * alavanca, abrir baú, empurrar grade, estender a mão. Cada uma tem antecipação, contato (a mão fecha no
 * instante em que toca o objeto) e volta. `p` vai de 0 a 1 ao longo da ação.
 *
 * Mão direita segura a arma e a esquerda a tocha: nas interações a arma vai para a bainha no quadril e a mão
 * direita fica livre; a tocha baixa só o necessário.
 */
export type Interaction = 'pickup' | 'examine' | 'pull' | 'open' | 'push' | 'reach';

export interface GestoOut {
  pose: Pose;
  /** peso da pose sobre o clipe */
  w: number;
  /** mão direita: 0 aberta, 1 fechada */
  gripR: number;
  /** quadril desce (m) */
  drop: number;
  /** quanto a arma está guardada (0 na mão, 1 na bainha) */
  sheath: number;
}

// ajoelhar: perna esquerda à frente com o pé no chão, joelho direito quase tocando o chão
const AJOELHA: Pose = { lL: [0.12, -0.38, 0.92], sL: [0, -0.98, -0.12], lR: [-0.06, -0.86, 0.5], sR: [0, -0.25, -0.97] };

export function gesto(a: Interaction, p: number): GestoOut {
  switch (a) {
    case 'pickup': {
      // desce (0 a 0,4), a mão fecha no item (0,4 a 0,5), sobe trazendo o item à altura do peito e olha para ele
      const down = env(p, 0.0, 0.38, 0.6, 0.9);
      const look = env(p, 0.55, 0.75, 0.9, 1);
      const reach: Pose = { ...AJOELHA, spine: [0.42, 0, 0], neck: [0.2, 0, 0], head: [0.25, 0, 0], aR: [-0.18, -0.72, 0.67], fR: [-0.05, -0.88, 0.47], aL: [0.45, -0.6, 0.3], fL: [0.1, 0.5, 0.85] };
      const hold: Pose = { aR: [-0.25, -0.65, 0.6], fR: [0.35, 0.55, 0.75], head: [0.32, -0.15, 0] };
      const pose = down > 0.01 ? reach : hold;
      return { pose, w: Math.max(down, look), gripR: span(p, 0.36, 0.48) * (1 - span(p, 0.92, 1)), drop: 0.42 * down, sheath: env(p, 0, 0.2, 0.85, 1) };
    }
    case 'reach': {
      // estende a mão a meia altura (folha no atril, braseiro, mecanismo)
      const k = env(p, 0.0, 0.35, 0.65, 1);
      return { pose: { spine: [0.15, 0, 0], head: [0.15, 0, 0], aR: [-0.2, -0.25, 0.95], fR: [-0.05, 0.05, 1] }, w: k, gripR: span(p, 0.32, 0.45) * (1 - span(p, 0.8, 0.95)), drop: 0, sheath: env(p, 0, 0.2, 0.8, 1) };
    }
    case 'examine': {
      // inclina, aproxima o rosto, a mão livre no queixo; um tempo de quietude no meio
      const k = env(p, 0.0, 0.3, 0.75, 1);
      return { pose: { spine: [0.32, 0, 0], neck: [0.2, 0, 0], head: [0.2, 0.08, 0.06], aR: [-0.2, -0.78, 0.6], fR: [0.25, 0.85, 0.45] }, w: k, gripR: 0.6 * k, drop: 0.06 * k, sheath: env(p, 0, 0.2, 0.85, 1) };
    }
    case 'pull': {
      // agarra a alavanca no alto (0 a 0,3), puxa com o peso do corpo (0,3 a 0,6), solta
      const up = env(p, 0, 0.25, 0.32, 0.55);
      const pull = env(p, 0.3, 0.55, 0.75, 1);
      const pose: Pose = up >= pull ? { spine: [-0.05, 0, 0], aR: [-0.15, 0.35, 0.92], fR: [0, 0.5, 0.86], aL: [0.3, -0.4, 0.86] } : { spine: [0.35, 0, 0], hips: [0.1, 0, 0], aR: [-0.15, -0.55, 0.82], fR: [0, -0.6, 0.8], head: [0.15, 0, 0] };
      return { pose, w: Math.max(up, pull), gripR: span(p, 0.2, 0.3) * (1 - span(p, 0.78, 0.9)), drop: 0.18 * pull, sheath: env(p, 0, 0.15, 0.85, 1) };
    }
    case 'open': {
      // abaixa diante do baú, as duas mãos sob a tampa, ergue
      const down = env(p, 0, 0.3, 0.75, 1);
      const lift = span(p, 0.35, 0.65);
      const pose: Pose = { ...AJOELHA, spine: [0.4 - 0.25 * lift, 0, 0], head: [0.2 - 0.25 * lift, 0, 0], aR: [-0.1, -0.5 + 0.5 * lift, 0.86], fR: [0.15, -0.3 + 0.9 * lift, 0.9], aL: [0.4, -0.55 + 0.2 * lift, 0.7], fL: [-0.1, -0.2 + 0.6 * lift, 0.95] };
      return { pose, w: down, gripR: span(p, 0.28, 0.36) * (1 - span(p, 0.7, 0.8)), drop: 0.38 * down, sheath: env(p, 0, 0.15, 0.85, 1) };
    }
    case 'push': {
      // apoia o ombro e as mãos na grade e empurra
      const k = env(p, 0, 0.3, 0.7, 1);
      const shove = env(p, 0.3, 0.5, 0.6, 0.85);
      return { pose: { spine: [0.25 + 0.15 * shove, 0, 0], aR: [-0.25, -0.1, 0.96], fR: [-0.1, 0.25, 0.96], aL: [0.25, -0.15, 0.95], head: [0.1, 0, 0], hips: [0.08 * shove, 0, 0] }, w: k, gripR: 0.2, drop: 0.1 * shove, sheath: env(p, 0, 0.2, 0.85, 1) };
    }
  }
}
