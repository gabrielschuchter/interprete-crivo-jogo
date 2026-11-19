/**
 * Números do jogo. Cada valor vem do modelo 2D Survivors Roguelike (Summer Engine, MIT), arquivo e
 * campo anotados ao lado, para que a jogabilidade seja a mesma do original. Mudar um número aqui é
 * divergir do original: registre a mudança em docs/game/SURVIVORS.md.
 */

export const MUNDO = {
  meio: 1500, // world_half_size (player.gd, enemy_spawner.gd, boss_system.gd)
  paredeInterna: 1480, // paredes de 40 px centradas em ±1500 (main.tscn, World/Walls)
  baseW: 1280, // display/window/size/viewport_width (project.godot), stretch canvas_items + expand
  baseH: 720,
  fisicaHz: 60,
};

export const JOGADOR = {
  raioCorpo: 23, // player.tscn, CircleShape2D "body", deslocado +34 em y
  pesCorpo: 34,
  raioFerida: 28, // Hurtbox
  regenBase: 2, // base_regen
  danoContato: 30, // contact_hit_damage (padrão quando o inimigo não declara o seu)
  invulneravel: 2, // invuln_time
  passo: 0.3, // STEP_INTERVAL
};

export interface Personagem {
  id: 'rogue' | 'knight';
  nome: string;
  resumo: string;
  vida: number;
  velocidade: number;
  ima: number;
  escala: number;
  quadros: 'mago' | 'cav';
  retrato: string;
  armas: Array<'homing' | 'arrows'>;
  serras: number;
  especiais: string[];
  empurraoAoSofrer: number;
}

/** run_state.gd, CHARACTERS */
export const PERSONAGENS: Record<'rogue' | 'knight', Personagem> = {
  rogue: {
    id: 'rogue',
    nome: 'Mago',
    resumo: 'Equilibrado. Ágil, com flechas e um orbe teleguiado.',
    vida: 100,
    velocidade: 160,
    ima: 140,
    escala: 0.18,
    quadros: 'mago',
    retrato: 'retrato_mago',
    armas: ['homing', 'arrows'],
    serras: 0,
    especiais: [],
    empurraoAoSofrer: 0,
  },
  knight: {
    id: 'knight',
    nome: 'Cavaleiro',
    resumo: 'Blindado e pesado. Começa com duas serras e orbes teleguiados.',
    vida: 150,
    velocidade: 120,
    ima: 200,
    escala: 0.21,
    quadros: 'cav',
    retrato: 'retrato_cav',
    armas: ['homing'],
    serras: 2,
    especiais: ['flaming'],
    empurraoAoSofrer: 200,
  },
};

export interface DefArma {
  id: 'homing' | 'arrows';
  cadencia: number; // fire_rate, segundos entre disparos
  mira: 'maisProximo' | 'aleatoria';
  dano: number;
  velocidade: number;
  teleguiado: boolean;
  vida: number;
  sprite: 'orbe' | 'flecha';
  escala: number;
  raioExplosao: number;
  morreNaParede: boolean;
  ricochetes: number;
}

/** resources/weapons/homing_missile.tres e random_missile.tres */
export const ARMAS: Record<'homing' | 'arrows', DefArma> = {
  homing: { id: 'homing', cadencia: 1.0, mira: 'maisProximo', dano: 15, velocidade: 300, teleguiado: true, vida: 3, sprite: 'orbe', escala: 0.06, raioExplosao: 0, morreNaParede: false, ricochetes: 0 },
  arrows: { id: 'arrows', cadencia: 0.9, mira: 'aleatoria', dano: 30, velocidade: 350, teleguiado: false, vida: 2, sprite: 'flecha', escala: 0.04, raioExplosao: 0, morreNaParede: true, ricochetes: 0 },
};

export const PROJETIL = {
  raio: 6, // projectile.tscn
  giro: 6, // TURN_RATE
  fatorExplosao: 0.5, // EXPLOSION_DAMAGE_FACTOR
  margemParede: 10, // WALL_MARGIN
  espalhamento: 0.18, // ±0,18 rad (weapon_system.gd, _fire)
};

export interface DefInimigo {
  tipo: 'normal' | 'rapido' | 'gigante' | 'chefe';
  velocidade: number;
  vida: number;
  danoContato: number;
  gira: boolean;
  raio: number; // CircleShape2D compartilhado pelo corpo e pela Hitbox
  pes: number; // foot_offset e deslocamento do corpo físico
  corpoY: number;
  quadros: string;
  nQuadros: number;
  fps: number;
  escala: number;
}

/** scenes/enemy.tscn, enemy_fast.tscn, enemy_giant.tscn, boss.tscn; enemy.gd para os padrões */
export const INIMIGOS: Record<'normal' | 'rapido' | 'gigante' | 'chefe', DefInimigo> = {
  normal: { tipo: 'normal', velocidade: 80, vida: 30, danoContato: 30, gira: true, raio: 14, pes: 0, corpoY: 0, quadros: 'morcego', nQuadros: 4, fps: 9, escala: 0.08 },
  rapido: { tipo: 'rapido', velocidade: 170, vida: 24, danoContato: 30, gira: true, raio: 10, pes: 0, corpoY: 0, quadros: 'escorpiao', nQuadros: 2, fps: 9, escala: 0.05 },
  gigante: { tipo: 'gigante', velocidade: 50, vida: 450, danoContato: 40, gira: false, raio: 40, pes: 72, corpoY: 62, quadros: 'gigante', nQuadros: 4, fps: 6, escala: 0.2 },
  chefe: { tipo: 'chefe', velocidade: 55, vida: 3000, danoContato: 50, gira: false, raio: 70, pes: 145, corpoY: 130, quadros: 'chefe', nQuadros: 1, fps: 0, escala: 0.3 },
};

export const INIMIGO = {
  empurrao: 260, // KNOCK_STRENGTH
  decaimento: 900, // KNOCK_DECAY
  crescimento: 1.0, // spawn_grow_time
};

export const GERADOR = {
  intervaloInicial: 1.0, // start_interval
  decaimentoPorNivel: 0.92, // decay_per_level
  distMin: 600,
  distMax: 1000,
  maxPorQuadro: 30,
  chanceGigante: 0.05,
  chanceRapido: 0.25,
  rajadaInicial: 10, // main.gd, _opening_rush: spawn_burst(10) um segundo depois do início
  atrasoRajada: 1.0,
};

export const XP = {
  primeiro: 5, // xp_to_next inicial
  porNivel: 3, // _needed_for: 5 + (lv - 1) * 3
  raioGema: 9, // xp_gem.tscn
  voo: 500, // fly_speed
  coleta: 16, // COLLECT_DIST
  giro: 4, // spin_speed
  escala: 0.07,
};

export const SERRAS = {
  raioBase: 70, // saw_system.gd
  passoRaio: 22,
  crescimentoRaio: 5,
  giro: 2.6,
  dps: 75,
  raio: 17, // saw.tscn
  giroVisual: 12, // SPIN_SPEED
  quadrosPorToque: 2, // FEEDBACK_FRAMES
  escala: 0.036,
};

export const RAIOS = {
  dano: 500, // LIGHTNING_DAMAGE
  intervalo: 4,
  alcance: 450, // strike_radius
};

export const CHEFE = {
  primeiro: 120, // boss_system.gd, first_boss_time
  repeticao: 120,
  vidaBase: 500,
  vidaPorNivel: 100,
  passoBase: 60,
  passoPorNivel: 2,
  descansoBase: 2,
  descansoDecai: 0.99,
  distancia: 750,
  escalaGeracao: 0.2, // alive_spawn_scale
  // boss.gd
  preparoInvestida: 0.6,
  investida: 0.45,
  velInvestida: 600,
  preparoSalto: 0.5,
  ar: 0.6,
  pouso: 0.4,
  saltoMax: 600,
  danoSalto: 40,
  raioOnda: 185,
  antecipacao: 0.85, // jump_lead
  preparoRajada: 0.5,
  ondas: 3,
  porOnda: 10,
  intervaloOndas: 0.35,
  velProjetil: 300,
  danoProjetil: 28,
  recuperacao: 0.6,
  raioProjetil: 16,
  velOnda: 950,
};

export interface Melhoria {
  id: string;
  nome: string;
  desc: string;
  descProx?: string;
  max?: number;
  precisaArma?: 'arrows' | 'homing';
  precisaEspecial?: string;
  icone: string;
}

/** main.gd, UPGRADES (mesma ordem, mesmos efeitos; texto em português) */
export const MELHORIAS: Melhoria[] = [
  { id: 'missiles', nome: 'Mais flechas', desc: 'Flechas disparam 15% mais rápido.', precisaArma: 'arrows', icone: 'flechas' },
  { id: 'homing', nome: 'Mais orbes teleguiados', desc: 'Orbes teleguiados disparam 15% mais rápido.', icone: 'orbe' },
  { id: 'speed', nome: 'Velocidade', desc: 'Mova-se 20% mais rápido.', icone: 'passo' },
  { id: 'maxhp', nome: '+50 de vida máxima', desc: 'Aumenta a vida máxima em 50.', icone: 'vida' },
  { id: 'xprate', nome: 'Surto de experiência', desc: 'Ganhe +1 de experiência por segundo, sem fazer nada.', icone: 'surto' },
  { id: 'regen', nome: 'Regeneração', desc: 'Regenera +1,5 de vida por segundo.', icone: 'regen' },
  { id: 'explode', nome: 'Flechas explosivas', desc: 'Flechas explodem no impacto.', descProx: 'Raio de explosão maior.', precisaArma: 'arrows', icone: 'explosao' },
  { id: 'bounce', nome: 'Flechas ricocheteantes', desc: 'Flechas ricocheteiam nas paredes.', descProx: 'Flechas passam a ricochetear para sempre.', max: 2, precisaArma: 'arrows', icone: 'ricochete' },
  { id: 'saw', nome: 'Serra giratória', desc: 'Uma serra orbita você e retalha os inimigos que toca.', descProx: 'Acrescenta outra serra.', icone: 'serra' },
  { id: 'lightning', nome: 'Chamado da tempestade', desc: 'Um raio atinge um inimigo a cada poucos segundos.', descProx: 'Mais um raio ao mesmo tempo.', icone: 'raio' },
  { id: 'flaming', nome: 'Flechas flamejantes', desc: 'Comece a disparar flechas flamejantes a cada segundo. Libera as melhorias de flecha.', precisaEspecial: 'flaming', max: 1, icone: 'chama' },
];

/** sfx.gd, SOUNDS: chave, arquivo, volume em dB, variação de tom (±). arrow_shoot e orb_cast trocados como no original. */
export const SONS: Record<string, [string, number, number]> = {
  arrow_shoot: ['orb_cast', -20, 0.12],
  orb_cast: ['arrow_shoot', -18, 0.12],
  enemy_hit: ['enemy_hit', -6, 0.18],
  enemy_death: ['enemy_death', -17, 0.15],
  explosion: ['explosion', -5, 0.1],
  saw_hit: ['saw_hit', -17, 0.2],
  lightning: ['lightning', -4, 0.1],
  player_hurt: ['player_hurt', -3, 0.08],
  player_death: ['player_death', 0, 0],
  ui_click: ['ui_click', -6, 0],
  ui_hover: ['ui_hover', -12, 0.05],
  footstep: ['footstep', -16, 0.18],
  boss_charge: ['boss_charge', -7, 0.08],
  boss_jump: ['boss_jump', -8, 0.08],
  boss_land: ['boss_slam', 0, 0.08],
  boss_fireball: ['boss_fireball', -9, 0.1],
  // nós de som do main.tscn
  xp: ['pling', -6, 0],
  nivel: ['pitched', 0, 0],
  melhoria: ['xp_gain', 0, 0],
  rugido: ['boss_roar', 0, 0],
};

export const MUSICAS = {
  menu: ['menu_music', -12],
  combate: ['music_combat', -10],
  derrota: ['death_music', -8],
} as const;
