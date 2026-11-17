/**
 * Elenco da abertura sobre os corpos que a forja já gerou (nenhum representa pessoa real). Enquanto a forja não
 * tem corpo infantil, a criança é o corpo jovem do protagonista escolhido, encolhido a 1,42 m com a cabeça 12%
 * maior; Helena e os outros são receitas do elenco PS2 com cor de figurino e de cabelo trocadas por tinta.
 * Pendência registrada em docs/game/ABERTURA.md: corpos infantis e Helena próprios na forja.
 *
 * Poses de cena no espaço do personagem (x para a esquerda da figura, y para cima, z para a frente).
 */
import * as THREE from 'three';
import { HAIRS, SKINS } from '../entities/figure';
import type { Pose } from '../entities/motion';
import type { Look } from '../domain/state';
import { Ator } from './ator';

const CORTES = ['curto', 'coque', 'longo', 'capuz'] as const;
function corte(look: Look): (typeof CORTES)[number] {
  return CORTES[Math.floor(look.hair / HAIRS.length) % 4] ?? 'curto';
}
function pele(look: Look): { skinMap?: string; tintSkin?: number } {
  return look.body ? { skinMap: `textures/ps2/pele/${look.body}_${look.skin % SKINS.length}.webp` } : { tintSkin: SKINS[look.skin % SKINS.length] };
}

/** O protagonista aos doze anos: corpo jovem escolhido, menor, de camisola de linho */
export function crianca(look: Look): Ator {
  const c = corte(look) === 'capuz' ? 'curto' : corte(look);
  const a = new Ator('criança', {
    skin: SKINS[look.skin % SKINS.length],
    hair: HAIRS[look.hair % HAIRS.length],
    coat: 0x8f7c5e,
    height: 1.42,
    model: look.body ? `player_${look.body}_${c}` : `player_${c}`,
    modelAlt: 'player_curto',
    ...pele(look),
    tintHair: new THREE.Color(HAIRS[look.hair % HAIRS.length]).multiplyScalar(2.4).getHex(),
    tintCoat: 0xd8ccb4,
    persona: 'cine_crianca',
  });
  a.cabeca = 1.12;
  return a;
}

/** O protagonista aos vinte anos, de roupa de viagem, sem arma (é a casa da mãe) */
export function protagonista(look: Look): Ator {
  const COATS = [0x2a1a22, 0x1c2430, 0x2a2a1c, 0x301c14, 0x1a1a1e];
  const coat = COATS[look.coat % COATS.length];
  return new Ator('protagonista', {
    skin: SKINS[look.skin % SKINS.length],
    hair: HAIRS[look.hair % HAIRS.length],
    coat,
    height: look.body === 'masc' ? 1.8 : look.body === 'fem' ? 1.68 : 1.74,
    model: look.body ? `player_${look.body}_${corte(look)}` : `player_${corte(look)}`,
    modelAlt: 'player_curto',
    ...pele(look),
    tintHair: new THREE.Color(HAIRS[look.hair % HAIRS.length]).multiplyScalar(2.4).getHex(),
    tintCoat: new THREE.Color(coat).multiplyScalar(2.2).getHex(),
  });
}

/** Dra. Helena Avelar: a viúva da estalagem do elenco, de avental; aos 53, cabelo grisalho */
export function helena(velha: boolean): Ator {
  return new Ator('Helena', {
    skin: SKINS[1],
    hair: velha ? 0x8a8078 : 0x2a1a12,
    coat: 0x2a1420,
    height: 1.64,
    model: 'npc_04_estalajadeira',
    tintHair: velha ? 0x9a948c : 0x3a2618,
    persona: 'npc_04_estalajadeira',
  });
}

/** Figura do elenco com tinta de figurino; nome é só rótulo de cena */
export function figurante(nome: string, modelo: string, o: { altura?: number; coat?: number; cabelo?: number } = {}): Ator {
  return new Ator(nome, {
    skin: SKINS[1],
    hair: HAIRS[1],
    coat: o.coat ?? 0x2a2226,
    height: o.altura ?? 1.7,
    model: modelo,
    tintCoat: o.coat,
    tintHair: o.cabelo,
    persona: modelo,
  });
}

// ---------- poses ----------
/** deitado: braços ao longo do corpo, pernas retas */
export const DEITADO: Pose = { aL: [0.15, -0.98, 0.05], fL: [0.1, -0.95, 0.25], aR: [-0.15, -0.98, 0.05], fR: [-0.1, -0.95, 0.25], lL: [0.05, -1, 0], sL: [0, -1, 0], lR: [-0.05, -1, 0], sR: [0, -1, 0], head: [-0.15, 0, 0] };
/** encolhido de lado, febre */
export const ENCOLHIDO: Pose = { aL: [0.1, -0.4, 0.9], fL: [-0.4, 0.3, 0.8], aR: [-0.1, -0.4, 0.9], fR: [0.4, 0.3, 0.8], lL: [0.05, -0.5, 0.86], sL: [0, -0.95, -0.3], lR: [-0.05, -0.5, 0.86], sR: [0, -0.95, -0.3], spine: [0.3, 0, 0], head: [0.25, 0, 0] };
/** ajoelhada ao lado da cama, mãos à frente, na altura do colchão */
export const AJOELHADA: Pose = {
  lL: [0.08, -0.1, 0.99], sL: [0, -1, -0.05], lR: [-0.08, -0.1, 0.99], sR: [0, -1, -0.05],
  drop: 0.5, spine: [0.32, 0, 0], neck: [0.15, 0, 0], head: [0.2, 0, 0],
  aL: [0.22, -0.55, 0.8], fL: [-0.1, -0.2, 0.97], aR: [-0.22, -0.55, 0.8], fR: [0.1, -0.2, 0.97],
};
/** ajoelhada, torcendo pano na bacia: duas mãos juntas, fase gira os punhos */
export function torcer(t: number): Pose {
  const s = Math.sin(t * 3.1) * 0.2;
  return { ...AJOELHADA, spine: [0.45, 0, 0], head: [0.35, 0, 0], aL: [0.12, -0.7, 0.7], fL: [-0.45 + s, -0.3, 0.85], aR: [-0.12, -0.7, 0.7], fR: [0.45 + s, -0.3, 0.85] };
}
/** sentada numa cadeira baixa, cochilando; acordar = cabeça sobe */
export function sentadaCochilo(acorda: number): Pose {
  return {
    lL: [0.1, 0.05, 0.99], sL: [0, -1, 0.05], lR: [-0.1, 0.05, 0.99], sR: [0, -1, 0.05], drop: 0.45,
    spine: [0.28 - acorda * 0.3, 0, 0], neck: [0.5 - acorda * 0.6, 0, 0.1 - acorda * 0.1], head: [0.3 - acorda * 0.35, 0, 0],
    aL: [0.3, -0.85, 0.4], fL: [-0.5, -0.3, 0.8], aR: [-0.3, -0.85, 0.4], fR: [0.5, -0.3, 0.8],
  };
}
/** sentado à mesa, escrevendo com a direita */
export function escrever(t: number): Pose {
  const s = Math.sin(t * 5.3) * 0.06;
  return {
    lL: [0.1, 0.05, 0.99], sL: [0, -1, 0.05], lR: [-0.1, 0.05, 0.99], sR: [0, -1, 0.05], drop: 0.45,
    spine: [0.35, 0, 0], neck: [0.2, 0, 0], head: [0.25, 0, 0],
    aL: [0.35, -0.6, 0.7], fL: [-0.6, -0.1, 0.8], aR: [-0.25, -0.6, 0.75], fR: [0.25 + s, -0.25, 0.93 + s],
  };
}
/** estende algo à frente, à altura do peito */
export const ESTENDE: Pose = { aR: [-0.15, -0.35, 0.92], fR: [0, -0.05, 1], spine: [0.08, 0, 0] };
/** segura um chapéu contra o peito com as duas mãos */
export const CHAPEU_NO_PEITO: Pose = { aL: [0.25, -0.85, 0.45], fL: [-0.6, 0.35, 0.7], aR: [-0.25, -0.85, 0.45], fR: [0.6, 0.35, 0.7], spine: [0.1, 0, 0], head: [0.1, 0, 0] };
/** abraça alguém mais baixo à frente */
export const ABRACO: Pose = { aL: [0.3, -0.45, 0.85], fL: [-0.85, -0.2, 0.45], aR: [-0.3, -0.45, 0.85], fR: [0.85, -0.2, 0.45], spine: [0.2, 0, 0], neck: [0.2, 0, 0], head: [0.25, 0.2, 0.1] };
/** segura pelos braços, por trás: mãos à frente na altura da cintura de uma criança */
export const SEGURA: Pose = { aL: [0.35, -0.55, 0.75], fL: [-0.25, -0.15, 0.95], aR: [-0.35, -0.55, 0.75], fR: [0.25, -0.15, 0.95], spine: [0.35, 0, 0], head: [0.2, 0, 0], drop: 0.12 };
/** mãos no trinco da janela, à frente e no alto */
export const TRINCO: Pose = { aL: [0.2, 0.05, 0.98], fL: [-0.15, 0.2, 0.97], aR: [-0.2, 0.05, 0.98], fR: [0.15, 0.2, 0.97], spine: [-0.05, 0, 0], head: [-0.15, 0, 0] };
/** de pé no parapeito, braços abertos para o batente */
export const NO_PARAPEITO: Pose = { aL: [0.75, 0.3, 0.55], fL: [0.6, 0.6, 0.5], aR: [-0.75, 0.3, 0.55], fR: [-0.6, 0.6, 0.5], head: [-0.2, 0, 0] };
/** dobrando roupa sobre a mala: mãos baixas à frente, um movimento de dobra */
export function dobrar(t: number): Pose {
  const k = (Math.sin(t * 1.6) + 1) / 2;
  return { spine: [0.4, 0, 0], neck: [0.15, 0, 0], head: [0.2, 0, 0], aL: [0.25, -0.75, 0.6], fL: [-0.2 + k * 0.4, -0.3 + k * 0.5, 0.85], aR: [-0.25, -0.75, 0.6], fR: [0.2 - k * 0.4, -0.3 + k * 0.5, 0.85] };
}
/** ajeita a gola de alguém à frente, mais alto */
export const GOLA: Pose = { aL: [0.3, -0.1, 0.95], fL: [-0.35, 0.55, 0.75], aR: [-0.3, -0.1, 0.95], fR: [0.35, 0.55, 0.75], head: [-0.25, 0, 0] };
/** mãos sem saber o que fazer: uma esfrega a outra à frente da barriga */
export function maosSemJeito(t: number): Pose {
  const s = Math.sin(t * 2.2) * 0.12;
  return { aL: [0.2, -0.9, 0.35], fL: [-0.7 + s, -0.1, 0.7], aR: [-0.2, -0.9, 0.35], fR: [0.7 + s, -0.1, 0.7], head: [0.2, 0, 0], spine: [0.06, 0, 0] };
}
/** segura a manga de alguém ao lado */
export const SEGURA_MANGA: Pose = { aR: [-0.5, -0.55, 0.65], fR: [-0.35, -0.2, 0.9], spine: [0.15, 0, 0], head: [0.05, 0, 0] };
/** sentado na boleia da carroça (pernas à frente, mãos nas rédeas) */
export const BOLEIA: Pose = {
  lL: [0.12, 0.05, 0.99], sL: [0, -0.9, 0.4], lR: [-0.12, 0.05, 0.99], sR: [0, -0.9, 0.4], drop: 0.45,
  aL: [0.2, -0.75, 0.6], fL: [-0.1, -0.2, 0.97], aR: [-0.2, -0.75, 0.6], fR: [0.1, -0.2, 0.97], spine: [0.15, 0, 0],
};
/** sentado no banco da carroça, de lado */
export const SENTADO: Pose = { lL: [0.1, 0.05, 0.99], sL: [0, -1, 0.05], lR: [-0.1, 0.05, 0.99], sR: [0, -1, 0.05], drop: 0.45, aL: [0.25, -0.9, 0.3], fL: [0.05, -0.6, 0.8], aR: [-0.25, -0.9, 0.3], fR: [-0.05, -0.6, 0.8] };
/** ajoelhada na rua sobre alguém deitado */
export const AJOELHADA_RUA: Pose = { ...AJOELHADA, spine: [0.6, 0, 0], neck: [0.3, 0, 0], aL: [0.25, -0.85, 0.45], fL: [0.1, -0.9, 0.4], aR: [-0.25, -0.85, 0.45], fR: [-0.1, -0.9, 0.4] };

/**
 * Rastejar (a criança arrastando-se de bruços, o corpo inclinado pela base): braços se alternam à frente,
 * pernas arrastam. `fase` avança com a distância percorrida.
 */
export function rastejar(fase: number): Pose {
  const s = Math.sin(fase);
  const c = Math.cos(fase);
  return {
    // com o corpo deitado de bruços, "baixo" do personagem aponta para o chão à frente: braços vão para +y (cabeça) e para baixo (-z)
    aL: [0.35, 0.55 + 0.35 * Math.max(0, s), -0.6], fL: [0.15, 0.85, -0.3 + 0.2 * s],
    aR: [-0.35, 0.55 + 0.35 * Math.max(0, -s), -0.6], fR: [-0.15, 0.85, -0.3 - 0.2 * s],
    lL: [0.12, -0.98, -0.1 + 0.15 * Math.max(0, c)], sL: [0, -0.95, 0.25], lR: [-0.12, -0.98, -0.1 + 0.15 * Math.max(0, -c)], sR: [0, -0.95, 0.25],
    head: [-0.7, 0, 0], neck: [-0.35, 0, 0],
  };
}
/** de joelhos, apoiada com as mãos na parede ou no móvel à frente, tentando subir (k de 0 a 1) */
export function apoiar(k: number): Pose {
  return {
    lL: [0.08, -0.1 - k * 0.6, 0.99 - k * 0.5], sL: [0, -1, -0.05], lR: [-0.08, -0.1 - k * 0.5, 0.99 - k * 0.5], sR: [0, -1, -0.05],
    drop: 0.5 * (1 - k * 0.7),
    spine: [0.2 - k * 0.15, 0, 0], head: [-0.2, 0, 0],
    aL: [0.25, 0.35 + k * 0.2, 0.9], fL: [0.1, 0.55, 0.82], aR: [-0.25, 0.35 + k * 0.2, 0.9], fR: [-0.1, 0.55, 0.82],
  };
}

/** chapéu de abas largas, preso à mão que a cena indicar */
export function chapeu(): THREE.Group {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: 0x1e1814, roughness: 0.9 });
  const aba = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.015, 14), m);
  const copa = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.13, 0.13, 12), m);
  copa.position.y = 0.07;
  g.add(aba, copa);
  return g;
}
/** folha dobrada com lacre vinho */
export function folhaLacrada(): THREE.Group {
  const g = new THREE.Group();
  const p = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.004, 0.22), new THREE.MeshStandardMaterial({ color: 0xd8c8a8, roughness: 0.95 }));
  const l = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.008, 10), new THREE.MeshStandardMaterial({ color: 0x6e0f29, roughness: 0.5 }));
  l.position.y = 0.005;
  g.add(p, l);
  return g;
}
/** lanterna presa num cajado (a silhueta da rua) */
export function cajadoLanterna(): THREE.Group {
  const g = new THREE.Group();
  const preto = new THREE.MeshBasicMaterial({ color: 0x050304 });
  const vara = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 2.2, 6), preto);
  vara.position.y = 1.1;
  const luz = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.12), new THREE.MeshBasicMaterial({ color: 0xffd28a }));
  luz.position.set(0, 2.1, 0.12);
  g.add(vara, luz);
  return g;
}
