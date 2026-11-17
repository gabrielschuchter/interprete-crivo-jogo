/**
 * Capítulo 1 · A estrada (bíblia v3, docs/game/CAPITULO_1.md).
 *
 * O controle volta na Estrada da Serra, com Caio nas costas e Marta ao lado. No portão o guarda lê o sobrenome e
 * Marta se ajoelha; na enfermaria Celeste recebe o menino; no pátio da Academia os estudantes se calam; no
 * refeitório há uma gravura na parede; na aula inaugural o Reitor pede a história; no dormitório está o pote.
 * Depois do dormitório, a campanha antiga segue como ponte provisória (missão `chegada`).
 */
import * as THREE from 'three';
import type { Game } from './game';
import * as D from './domain/state';
import { Npc, NPCS } from './entities/npc';
import { Figure, SKINS } from './entities/figure';
import { CARREGA, NAS_COSTAS } from './entities/player';
import { groundAt, type PropPlacement } from './world/region';
import { ESTRADA, xEstrada } from './world/estrada';
import { Cine, type Plano, type V3 } from './cine/cine';
import type { Ator } from './cine/ator';
import type { Som } from './cine/som';
import { ANF, DORM, ENF_ACAD, REF, anfiteatro, dormitorio, enfermariaAcademia, gravura, refeitorio } from './cine/cenarios';
import { AJOELHADA, AJOELHADA_RUA, ESTENDE, SENTADO, caio, figurante, maosSemJeito, protagonista } from './cine/elenco';

type G = Game;
const Q = 'capitulo1';

/** concordância com o corpo escolhido na criação: o feminino quando o corpo é fem, o masculino nos outros casos */
function txt(g: G) {
  const fem = g.state!.look.body === 'fem';
  return {
    fem,
    ele: fem ? 'ela' : 'ele',
    Ele: fem ? 'Ela' : 'Ele',
    dele: fem ? 'dela' : 'dele',
    o: fem ? 'a' : 'o',
    moco: fem ? 'moça' : 'moço',
    calouro: fem ? 'caloura' : 'calouro',
    Menino: fem ? 'Menina' : 'Menino',
    /** "o Menino da Janela" / "a Menina da Janela" */
    janela: fem ? 'a Menina da Janela' : 'o Menino da Janela',
  };
}

const v = (g: G, k: string) => D.questVar(g.state!, Q, k);
const setV = (g: G, k: string, n: number) => D.setQuestVar(g.state!, Q, k, n);
const P = (de: V3, alvo: V3, dur: number, x: Partial<Plano> = {}): Plano => ({ de, alvo, dur, fov: 50, ...x });
/** anima de 0 a 1 em `s` segundos de cena (no avanço rápido, vai direto ao fim) */
function animar(c: Cine, s: number, f: (k: number) => void): void {
  if (c.ff) return f(1);
  let t = 0;
  const fn = (dt: number) => {
    t += dt;
    f(Math.min(1, t / s));
    if (t >= s) c.extra.splice(c.extra.indexOf(fn), 1);
  };
  c.extra.push(fn);
}
const alturaDe = (g: G) => (g.state!.look.body === 'masc' ? 1.8 : g.state!.look.body === 'fem' ? 1.68 : 1.74);
const caioAtor = () => caio();
const martaAtor = () => figurante('Marta', 'npc_02_acendedora', { coat: 0x3a2e24, altura: 1.62 });
/** Caio preso às costas do ator do protagonista, como no jogo (Player.carregar) */
function nasCostas(eu: Ator, caio: Ator, altura: number): void {
  const k = altura / 1.74;
  eu.base.add(caio.base);
  caio.base.position.set(0, 0.36 * k, -0.27 * k);
  caio.base.rotation.set(0, 0, 0);
  caio.posar(NAS_COSTAS, 50);
  eu.posar(CARREGA, 50);
}
/** tira Caio das costas e devolve ao cenário */
function descer(c: Cine, caio: Ator): void {
  c.host.engine.scene.add(caio.base);
}
function papel(w: number, h: number, cor = 0xd8ccb0): THREE.Mesh {
  return new THREE.Mesh(new THREE.BoxGeometry(w, 0.004, h), new THREE.MeshStandardMaterial({ color: cor, roughness: 1 }));
}
function gravuraNaMao(): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.18), new THREE.MeshStandardMaterial({ map: gravura(), roughness: 1, side: THREE.DoubleSide }));
  return m;
}

// ===================== começo: controle na estrada =====================
export function comeco(g: G): void {
  const t = txt(g);
  const mov = g.ui.isTouch
    ? 'Arraste na metade esquerda para andar · arraste na direita para olhar · Interagir fala com quem está perto'
    : `${g.ui.key('frente')} ${g.ui.key('esquerda')} ${g.ui.key('tras')} ${g.ui.key('direita')} para andar · mouse para olhar · ${g.ui.key('interagir')} para falar`;
  g.ui.hint(`${mov}. Com o menino nas costas não dá para correr nem pular. Pedra Alta fica estrada acima.`, `${t.Ele} desceu da carroça`, 9);
}

// ===================== eventos de região =====================
export function aoEntrar(g: G, region: string): void {
  if (region === 'estrada' && g.step(Q) === 0) montarEstrada(g);
}

/** Caio nas costas, Marta ao lado: ao começar o capítulo e ao continuar um registro gravado na estrada */
function montarEstrada(g: G): void {
  const p = g.player;
  if (!p) return;
  // o mesmo corpo da forja da abertura (cine_caio), com o morador como reserva
  p.carregar(new Figure({ skin: SKINS[1], hair: 0x3a2a1e, coat: 0x4a3a2a, height: 1.38, model: 'cine_caio', modelAlt: 'npc_09_orfao', persona: 'npc_09_orfao' }));
  if (!g.npcs.some((n) => n.def.id === 'marta')) {
    const x = p.pos.x + Math.cos(p.yaw) * 1.0;
    const z = p.pos.z - Math.sin(p.yaw) * 1.0 + 0.6;
    const m = new Npc(NPCS.marta, x, groundAt(g.region, x, z, 50) ?? p.pos.y, z, p.yaw);
    m.ground = (gx, gz, gy) => groundAt(g.region, gx, gz, gy);
    m.goalSpeed = 1.5;
    g.engine.scene.add(m.fig.root);
    g.npcs.push(m);
  }
}

/** falas da estrada, uma a cada trecho (z cai para o norte); o índice da próxima fica na missão */
function falasEstrada(g: G): Array<{ z: number; quem: string; texto: string }> {
  const t = txt(g);
  return [
    { z: 32, quem: 'Marta', texto: 'Ele caiu do meu lado. Tava andando e caiu.' },
    { z: 27.5, quem: 'Marta', texto: 'Ele é leve, né? Antes não era.' },
    { z: 22, quem: 'Marta', texto: 'A gente é de Vau do Ribeiro. Três semanas a pé, dormindo em igreja.' },
    { z: 17, quem: 'Caio', texto: 'Cento e quarenta e um. Cento e quarenta e dois.' },
    { z: 11, quem: 'Marta', texto: 'Ele conta os passos desde pequeno. Diz que assim a estrada acaba.' },
    { z: 5, quem: 'Marta', texto: `Olha ali no oratório. É ${t.janela}.` },
    { z: -5, quem: 'Marta', texto: `A mãe ${t.dele} cuidou sete noites, e no oitavo dia ${t.ele} levantou e foi até a janela. Todo mundo em Vau sabe.` },
    { z: -15, quem: 'Marta', texto: `Dizem que ${t.ele} estuda lá em cima agora. Se eu acho ${t.ele}, ${t.ele} põe a mão no Caio.` },
    { z: -25, quem: 'Caio', texto: 'Mãe, tem um passarinho na pedra.' },
    { z: -29, quem: 'Marta', texto: 'Tem, filho. Fica quietinho.' },
    { z: -37, quem: 'Marta', texto: `E você, sobe por quê? Estudar? Então vai ver ${t.ele} todo dia.` },
    { z: -46, quem: 'Marta', texto: 'Eu pago o que pedirem. Lavo roupa até morrer, mas pago.' },
  ];
}

const FALAS_PATIO: Record<string, { longe: string; perto: (t: ReturnType<typeof txt>) => string }> = {
  estudante_a: { longe: 'Dizem que chega hoje, na carroça da serra.', perto: (t) => `É ${t.ele}.` },
  estudante_c: { longe: 'Minha avó tem a gravura na cozinha, do lado do fogão.', perto: () => 'Fala baixo.' },
  estudante_e: { longe: 'Eu vi a carroça parar lá embaixo. Tinha uma mulher gritando.', perto: () => 'Boa tarde.' },
};

/** a cada quadro de jogo (Game.updateWorld, modo 'play') */
export function tick(g: G, _dt: number): void {
  const s = g.state;
  const p = g.player;
  if (!s || !p || g.busy || !D.questActive(s, Q)) return;
  const st = g.step(Q);
  if (g.region.id === 'estrada' && st === 0) {
    // Marta anda do lado esquerdo, um passo atrás
    const m = g.npcs.find((n) => n.def.id === 'marta');
    if (m) {
      const lx = Math.cos(p.yaw);
      const lz = -Math.sin(p.yaw);
      const fx = Math.sin(p.yaw);
      const fz = Math.cos(p.yaw);
      (m.goal ??= new THREE.Vector3()).set(p.pos.x + lx * 0.95 - fx * 0.55, p.pos.y, p.pos.z + lz * 0.95 - fz * 0.55);
    }
    const falas = falasEstrada(g);
    const i = v(g, 'b');
    if (i < falas.length && p.pos.z < falas[i].z && !g.ui.legendaOcupada) {
      g.ui.bark(falas[i].quem, falas[i].texto);
      setV(g, 'b', i + 1);
    }
    if (p.pos.z < ESTRADA.gatilho && !v(g, 'portao')) {
      setV(g, 'portao', 1);
      void portao(g);
    }
    return;
  }
  if (g.region.id === 'atrio' && st >= 1) {
    const t = txt(g);
    for (const n of g.npcs) {
      const f = FALAS_PATIO[n.def.id];
      if (!f) continue;
      const d = Math.hypot(n.pos.x - p.pos.x, n.pos.z - p.pos.z);
      const k = n.def.id;
      if (g.ui.legendaOcupada) break;
      if (d < 4.5 && !v(g, 'q_' + k)) {
        setV(g, 'q_' + k, 1);
        setV(g, 'l_' + k, 1);
        g.ui.bark(n.def.name, f.perto(t));
      } else if (d < 11 && !v(g, 'l_' + k)) {
        setV(g, 'l_' + k, 1);
        g.ui.bark(n.def.name, f.longe);
      }
    }
  }
}

// ===================== conversas e objetos =====================
export async function conversa(g: G, id: string): Promise<boolean> {
  const t = txt(g);
  switch (id) {
    case 'marta':
      if (v(g, 'b') < 5) await g.say('marta', 'Não para, não, que ele esfria. Pedra Alta é logo ali em cima.');
      else await g.say('marta', `Se eu acho ${t.janela}, tá tudo resolvido. Anda, ${t.moco}, por favor.`);
      return true;
    case 'guarda':
      await g.say('guarda', 'O portão grande abre de manhã. Gente da Academia passa pela porta pequena.');
      return true;
    case 'estudante_a':
      await g.say('estudante_a', 'Desculpa. A gente tava falando de outra coisa. Bem-vindo à Academia.');
      return true;
    case 'estudante_b':
      await g.say('estudante_b', 'A aula inaugural é no anfiteatro, lá no alto da escada. Todo mundo vai.');
      return true;
    case 'estudante_c':
      await g.say('estudante_c', `Minha avó vai querer saber se eu falei com você. Posso dizer que falei?`);
      return true;
    case 'estudante_d':
      await g.say('estudante_d', 'O refeitório fica no beco do sul, a porta da esquerda. O dormitório é a da direita.');
      return true;
    case 'estudante_e':
      await g.say('estudante_e', 'A mulher da carroça entrou com o menino? Que bom.');
      return true;
  }
  return false;
}

export async function examinar(g: G, p: PropPlacement): Promise<boolean> {
  const t = txt(g);
  const N = (s: string) => g.say('', s);
  switch (p.data?.cap1) {
    case 'oratorio':
      await N('Um oratório de beira de estrada. No lugar do santo, uma gravura: uma criança de mãos postas numa janela e, atrás, uma mulher com luz nas mãos.');
      await N(`Embaixo, escrito a carvão: "${t.Menino} da Janela. Remanso." Você conhece aquela janela.`);
      return true;
    case 'carroca':
      await N('O carroceiro esperou um pouco e seguiu sem você. A sua mala vai com ele até a Academia.');
      return true;
    case 'iolanda':
      D.unlockCodex(g.state!, 'iolanda');
      await N('Mestra Iolanda Ferro. Segura duas bacias iguais, uma em cada mão, à mesma altura.');
      await N('Aos pés dela há velas acesas e velas gastas, e bilhetes presos com cera. Num deles: "Mestra, cura o meu pai."');
      await N('A placa está coberta de cera de muitos anos. Dá para ler o nome e mais nada.');
      return true;
    case 'arco':
      await N('Hoje não. A aula inaugural é agora, e o sino já tocou duas vezes.');
      return true;
  }
  return false;
}

// ===================== cenas =====================
export async function cena(g: G, nome: string): Promise<void> {
  if (g.busy || !g.state) return;
  const st = g.step(Q);
  if (nome === 'refeitorio') {
    if (g.has('cap1_refeitorio')) return void g.runScript(() => g.say('', 'O refeitório já esvaziou. Sobrou o cheiro de sopa e a vela embaixo da gravura.'));
    await g.cena((c, som) => refeitorioCena(g, c, som));
    g.flag('cap1_refeitorio');
    return g.voltarAoJogo();
  }
  if (nome === 'anfiteatro') {
    if (st !== 1) return void g.runScript(() => g.say('', st > 1 ? 'O anfiteatro está vazio. Alguém esqueceu um cachecol na primeira fila.' : 'Fechado.'));
    await g.cena((c, som) => aulaCena(g, c, som), { escolha: 0 });
    g.flag('cap1_aula');
    g.advance(Q, 2);
    return g.voltarAoJogo();
  }
  if (nome === 'dormitorio') {
    if (st < 2) return void g.runScript(() => g.say('', 'A aula inaugural vem primeiro. A mala pode esperar no quarto.'));
    await g.cena((c, som) => dormitorioCena(g, c, som));
    g.give('pote_unguento');
    g.flag('cap1_fim');
    g.completeQuest(Q);
    await ponte(g);
  }
}

/** portão de Pedra Alta, na própria estrada; segue direto para a enfermaria e o pátio */
async function portao(g: G): Promise<void> {
  const t = txt(g);
  const alt = alturaDe(g);
  const look = g.state!.look;
  const passagem = g.region.handles.passagem;
  const gy = (x: number, z: number) => groundAt(g.region, x, z, 50) ?? 0;
  await g.cena(async (c, som) => {
    const [ex, ez] = [3.1, -57.6];
    const eu = c.ator(protagonista(look)).em(ex, gy(ex, ez), ez, Math.PI);
    const caio = c.ator(caioAtor()).em(0, 0, 0);
    nasCostas(eu, caio, alt);
    const marta = c.ator(martaAtor()).em(1.9, gy(1.9, -57.1), -57.1, Math.PI - 0.3);
    const [gx, gz] = ESTRADA.guarda;
    const guarda = c.ator(figurante('O guarda', 'npc_03_vigia', { coat: 0x2a2a26, altura: 1.84 })).em(gx, gy(gx, gz), gz, Math.atan2(ex - gx, ez - gz));
    guarda.olharPara = eu;
    c.marca('portao');
    c.corte(P([6.8, 1.75, -53.4], [3.4, 1.35, -58.6], 30, { para: [6.4, 1.7, -54.0] }));
    await c.preto(false, 0.8);
    await c.fala('Alto. Romeiro entra pelo portão grande, de manhã.', { ator: guarda });
    marta.olharPara = guarda;
    await c.fala('O menino caiu na estrada, moço. Pelo amor de Deus.', { ator: marta });
    await c.fala('E você?', { ator: guarda });
    // põe o menino sentado no chão para tirar a carta do bolso
    c.corte(P([ex - 2.4, 1.3, ez + 2.2], [ex, 0.9, ez - 0.6], 10, { fov: 46 }));
    descer(c, caio);
    caio.em(ex - 0.9, gy(ex - 0.9, ez - 0.4), ez - 0.4, Math.PI / 2).posar(SENTADO, 50);
    eu.posar(null, 4);
    marta.em(ex - 1.5, gy(ex - 1.5, ez - 0.2), ez - 0.2, Math.PI / 2).posar(AJOELHADA, 4);
    marta.olharPara = caio;
    await c.espera(1.2);
    const carta = papel(0.2, 0.14);
    eu.gesto('reach');
    await c.espera(0.6);
    eu.segurar(carta, 'Right');
    eu.posar(ESTENDE, 3);
    await c.espera(1.2);
    eu.segurar(null);
    guarda.segurar(carta, 'Right');
    guarda.posar(ESTENDE, 3);
    c.corte(P([gx + 0.9, 1.75, gz + 1.3], [gx, 1.55, gz], 10, { fov: 40 }));
    await c.espera(1.5);
    await c.fala('Carta de admissão. Academia de Medicina, primeiro ano.', { ator: guarda });
    await c.espera(1);
    animar(c, 0.5, (k) => (guarda.rosto = { sobrancelha_erguer: 0.6 * k }));
    await c.fala('Avelar.', { ator: guarda });
    await c.fala('Avelar de Remanso?', { ator: guarda });
    await c.fala('É.', { ator: eu });
    guarda.posar(null, 3);
    guarda.segurar(null);
    guarda.rosto = null;
    eu.segurar(carta, 'Right');
    await c.fala('Pela porta dos professores. Vai, vai, que o menino não espera.', { ator: guarda });
    eu.segurar(null);
    void guarda.andar([[ESTRADA.passagem[0] - 0.2, ESTRADA.passagem[1] + 1.2]], 1.1);
    som.porta();
    if (passagem) {
      const r0 = passagem.rotation.y;
      animar(c, 1.6, (k) => (passagem.rotation.y = r0 + k * 1.75));
    }
    await c.espera(1.4);
    // Marta ouviu o nome: tira a gravura do bolso e compara
    c.marca('gravura');
    const grav = gravuraNaMao();
    marta.posar(null, 3);
    marta.em(ex - 1.2, gy(ex - 1.2, ez + 0.6), ez + 0.6, Math.atan2(1.2, -0.6));
    marta.olharPara = eu;
    marta.segurar(grav, 'Right', [0, 0.05, 0.04]);
    marta.posar(ESTENDE, 3);
    eu.olharPara = marta;
    c.corte(P([ex - 2.6, 1.55, ez + 1.9], [ex - 1.0, 1.35, ez + 0.4], 9, { fov: 38 }));
    await c.espera(2.4);
    marta.olharPara = new THREE.Vector3(ex - 1.1, 1.2, ez + 0.9);
    await c.espera(1.4);
    marta.olharPara = eu;
    await c.espera(1.2);
    await c.fala('Avelar.', { ator: marta });
    // ajoelha no meio da rua
    marta.segurar(null);
    marta.posar(AJOELHADA_RUA, 2.5);
    c.corte(P([ex + 1.9, 1.7, ez + 2.6], [ex - 0.6, 0.9, ez + 0.2], 14, { fov: 44, para: [ex + 1.7, 1.68, ez + 2.3] }));
    await c.espera(1.6);
    await c.fala(`Deus me mandou você na estrada.`, { ator: marta });
    eu.poseFn = maosSemJeito;
    await c.espera(3.5);
    caio.olharPara = marta;
    await c.fala('Mãe, levanta. Tá todo mundo olhando.', { ator: caio });
    await c.espera(1.5);
    eu.poseFn = null;
    void t;
  }, { regiao: true });
  await enfermaria(g);
}

/** enfermaria da Academia: Celeste recebe o menino e manda o protagonista sair do caminho */
async function enfermaria(g: G): Promise<void> {
  const t = txt(g);
  const alt = alturaDe(g);
  const look = g.state!.look;
  await g.cena(async (c) => {
    c.montar(enfermariaAcademia());
    c.marca('enfermaria');
    const [px, pz] = ENF_ACAD.porta;
    const [bx, bz] = [0.65, ENF_ACAD.cama7[1]];
    const eu = c.ator(protagonista(look)).em(px + 0.4, 0, pz, Math.PI / 2);
    const caio = c.ator(caioAtor()).em(0, 0, 0);
    nasCostas(eu, caio, alt);
    const marta = c.ator(martaAtor()).em(px + 0.2, 0, pz + 0.9, Math.PI / 2);
    const [mx, mz] = ENF_ACAD.mesa;
    const cel = c.ator(figurante('Celeste', 'npc_05_enfermeira', { coat: 0x2a2630, altura: 1.66 })).em(mx - 0.1, 0, mz + 0.65, Math.PI);
    c.corte(P([4.8, 1.7, 2.6], [-2.0, 1.1, -0.6], 16, { alvoPara: [0.8, 0.9, -2.0], curva: 'suave' }));
    await c.preto(false, 0.8);
    void marta.andar([[-2.0, 0.6], [bx - 0.9, -1.6]], 1.0);
    await eu.andar([[-2.0, 0], [bx, -1.5]], 1.0);
    cel.olharPara = eu;
    await c.fala('Na sete. Deita ele de lado.', { ator: cel });
    // deita Caio na cama sete
    descer(c, caio);
    caio.posar(null, 50);
    caio.em(bx, 0.5, bz, 0).deitar(1);
    eu.posar(null, 3);
    eu.em(bx, 0, -1.6, Math.PI);
    marta.em(bx - 0.85, 0, bz + 0.3, Math.PI / 2).posar(AJOELHADA, 3);
    marta.olharPara = caio;
    void cel.andar([[3, -1.0], [bx + 0.9, bz + 0.2]], 1.2);
    c.corte(P([bx + 3.0, 1.5, -0.6], [bx, 0.75, bz], 20, { fov: 46 }));
    await c.espera(c.ff ? 0 : 3);
    cel.em(bx + 0.9, 0, bz + 0.2, -Math.PI / 2);
    cel.olharPara = caio;
    cel.gesto('reach');
    await c.espera(1.4);
    await c.fala('Quantos dias de febre?', { ator: cel });
    await c.fala('Dezenove.', { ator: caio });
    marta.olharPara = caio;
    await c.fala('Ele conta tudo, doutora.', { ator: marta });
    await c.fala('Eu sou enfermeira. Dezenove, então.', { ator: cel });
    cel.olharPara = eu;
    await c.espera(0.8);
    await c.fala(`Você tá no meu caminho, ${t.calouro}. Vai pra aula, que daqui eu cuido.`, { ator: cel });
    eu.olharPara = marta;
    marta.olharPara = eu;
    c.corte(P([bx - 0.4, 1.0, bz + 1.6], [bx - 0.6, 1.2, -1.4], 8, { fov: 40 }));
    await c.espera(2.4);
  });
  g.flag('cap1_academia');
  g.advance(Q, 1);
  await g.trocarRegiao('atrio', 'cap1');
  g.ui.hint('A aula inaugural é no anfiteatro, no alto da escadaria. O refeitório e o dormitório ficam no beco ao sul.', 'Academia de Medicina', 9);
}

async function refeitorioCena(g: G, c: Cine, _som: Som): Promise<void> {
  const t = txt(g);
  const look = g.state!.look;
  c.montar(refeitorio());
  c.marca('refeitorio');
  const [px, pz] = REF.porta;
  const eu = c.ator(protagonista(look)).em(px + 0.4, 0, pz, Math.PI / 2);
  const coz = c.ator(figurante('A cozinheira', 'npc_12_acolita', { coat: 0x3a3028, altura: 1.6 })).em(REF.balcao[0] + 0.7, 0, -0.4, -Math.PI / 2);
  c.corte(P([-3, 1.7, -2.6], [4, 1.2, 0.6], 16, { para: [-1, 1.7, -2.8], alvoPara: [6.5, 1.3, 0] }));
  await c.preto(false, 0.8);
  await eu.andar([[2, 0], [REF.balcao[0] - 0.8, 0]], 1.0);
  coz.olharPara = eu;
  // a gravura na parede, com vela embaixo
  c.corte(P([6.2, 2.0, 1.3], [REF.gravura[0], 2.5, REF.gravura[1]], 9, { fov: 38, para: [6.4, 2.1, 1.0] }));
  eu.olharPara = new THREE.Vector3(REF.gravura[0], 2.6, REF.gravura[1]);
  await c.espera(3.5);
  await c.fala('Minha mãe pendurou essa aí no ano da febre. Nunca mais tirou.', { ator: coz });
  c.corte(P([REF.balcao[0] - 2.6, 1.6, 1.8], [REF.balcao[0], 1.3, 0], 10, { fov: 44 }));
  eu.olharPara = coz;
  await c.fala('Quanto é?', { ator: eu });
  await c.fala(`De você eu não cobro, não. Senta, que eu levo.`, { ator: coz });
  await c.espera(0.8);
  // ele se senta no lugar vazio; a mesa abre espaço e baixa a voz
  const [lx, lz] = REF.lugar;
  eu.olharPara = null;
  eu.em(lx, 0.04, lz + 0.15, Math.PI).posar(SENTADO, 50);
  const prato = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.04, 12), new THREE.MeshStandardMaterial({ color: 0x8a8070, roughness: 0.8 }));
  prato.position.set(lx, 0.84, lz - 0.5);
  c.host.engine.scene.add(prato);
  c.corte(P([lx + 2.2, 1.45, lz + 1.6], [lx, 1.0, lz - 0.2], 12, { fov: 46 }));
  await c.espera(2);
  await c.fala(`É ${t.ele} mesmo?`, { quem: 'Alguém na mesa' });
  await c.fala('Fala baixo.', { quem: 'Outra pessoa' });
  await c.espera(3);
  prato.parent?.remove(prato);
}

async function aulaCena(g: G, c: Cine, som: Som): Promise<void> {
  const t = txt(g);
  const look = g.state!.look;
  c.montar(anfiteatro());
  c.marca('aula');
  const [lx, lz] = ANF.lugar;
  const eu = c.ator(protagonista(look)).em(lx, 0.04, lz + 0.1, Math.PI).posar(SENTADO, 50);
  const [tx, tz] = ANF.tribuna;
  const varga = c.ator(figurante('Reitor Varga', 'npc_10_professor', { coat: 0x1e1a1c, altura: 1.76, cabelo: 0x8a8078 })).em(tx, ANF.altura, tz - 0.55, 0);
  // na última fila, um homem de casaco gasto, que não aplaude
  const ult = ANF.fileira(5);
  const homem = c.ator(figurante('homem de casaco gasto', 'npc_11_detetive', { coat: 0x2a2a30, altura: 1.76 })).em(-8.7, ult.y + 0.04, ult.z + 0.1, Math.PI).posar(SENTADO, 50);
  c.corte(P([8.6, 2.7, 6.8], [-0.6, 1.5, 0.2], 22, { para: [7.8, 2.5, 5.2], curva: 'suave' }));
  await c.preto(false, 1);
  await c.fala('Bem-vindos à Academia de Medicina de Pedra Alta. Aqui se aprende a costurar, a fazer parto, a montar tala.', { ator: varga });
  await c.fala(`Este ano, entre os calouros, há alguém que vocês já conhecem de gravura.`, { ator: varga });
  c.corte(P([lx + 1.8, 1.2, lz + 2.4], [lx, 1.0, lz], 8, { fov: 40 }));
  await c.fala('Avelar. Venha até aqui, por favor.', { ator: varga });
  // sobe ao estrado
  eu.posar(null, 4);
  await c.espera(0.6);
  await eu.andar([[lx - 1.2, 1.9], [0.8, 1.8]], 1.0);
  eu.em(0.4, ANF.altura, 0.9, 0);
  varga.olharPara = eu;
  c.corte(P([0.6, 1.95, 5.5], [0.2, 1.35, 0.6], 18, { fov: 42, para: [0.6, 1.9, 4.9] }));
  await c.espera(1);
  await c.fala('Conte com as suas palavras. Os livros já contaram com as deles.', { ator: varga });
  const falas = [
    'Eu tive a febre cinzenta aos sete anos. Minha mãe ficou sete noites comigo, e eu levantei.',
    'Eu lembro pouco. Lembro da janela e da luz. Minha mãe me curou.',
    'Vocês conhecem a história, e ela é verdade: minha mãe me curou.',
  ];
  const i = Math.max(0, Math.min(2, await c.escolha(falas)));
  setV(g, 'fala', i + 1);
  c.log.push('fala ' + (i + 1));
  eu.olharPara = new THREE.Vector3(0, 2.2, 8);
  await c.fala(falas[i], { ator: eu });
  // aplausos; o homem do fundo se levanta e sai pela porta do alto
  som.aplauso(7);
  c.corte(P([0.4, 1.9, 3.2], [0.4, 1.6, 0.9], 9, { fov: 34 }));
  animar(c, 1.2, (k) => (eu.rosto = { sorriso: 0.45 * k }));
  await c.espera(3.5);
  c.corte(P([-4.5, 3.6, 7.0], [-8.6, 2.8, 10.8], 9, { fov: 40 }));
  homem.posar(null, 3);
  await c.espera(1);
  await homem.andar([[-9.4, ult.z + 0.6], [-9.9, ANF.portaAlto[1]]], 1.0);
  homem.ver(false);
  c.corte(P([0.4, 1.9, 3.2], [0.4, 1.6, 0.9], 6, { fov: 34 }));
  await c.espera(1.4);
  eu.rosto = null;
  await c.fala(`É por isso que a gente está aqui. Pode sentar, Avelar.`, { ator: varga });
  c.corte(P([8.6, 3.4, 9.0], [-1, 1.5, 0.2], 12, { fov: 50 }));
  await c.fala('Primeira lição do ano: o Método Avelar. Unguento, panos frios trocados de hora em hora e sete noites de vigília.', { ator: varga });
  await c.espera(2);
  void t;
}

async function dormitorioCena(g: G, c: Cine, som: Som): Promise<void> {
  const look = g.state!.look;
  const cen = dormitorio();
  c.montar(cen);
  c.marca('dormitorio');
  const [px, pz] = DORM.porta;
  const eu = c.ator(protagonista(look)).em(px + 0.3, 0, pz, Math.PI / 2);
  c.corte(P([1.9, 1.75, 1.7], [-0.6, 1.1, -0.4], 12, { para: [1.7, 1.7, 1.5] }));
  await c.preto(false, 0.8);
  som.porta();
  await eu.andar([[-0.6, 0.4], [DORM.mala[0], -0.5]], 0.9);
  eu.em(DORM.mala[0], 0, -0.5, Math.PI);
  c.corte(P([DORM.mala[0] + 0.9, 1.55, -0.2], [DORM.mala[0], 0.6, DORM.mala[1]], 30, { fov: 40, mao: 0.004 }));
  const mala = cen.h.mala;
  const roupa = mala.getObjectByName('roupa');
  const embr = mala.getObjectByName('embrulho');
  for (let k = 0; k < 2; k++) {
    eu.gesto('pickup');
    await c.espera(1.6);
  }
  if (roupa) roupa.visible = false;
  await c.espera(0.8);
  eu.gesto('pickup');
  await c.espera(1.4);
  if (embr) embr.visible = false;
  const pote = cen.h.pote;
  pote.visible = true;
  eu.segurar(pote, 'Right', [0, -0.03, 0]);
  eu.olharPara = new THREE.Vector3(DORM.mala[0], 1.0, -0.2);
  await c.espera(2.2);
  const bilhete = papel(0.1, 0.07, 0xe0d4b8);
  eu.segurar(bilhete, 'Left');
  await c.espera(1.2);
  await c.fala('Pra você nunca precisar. Coma direito.', { quem: 'O bilhete, na letra da sua mãe' });
  await c.espera(2);
  // ele guarda o pote sem abrir e olha para a janela fechada
  eu.segurar(null);
  bilhete.parent?.remove(bilhete);
  eu.olharPara = new THREE.Vector3(DORM.janela[0], 1.5, DORM.janela[1]);
  eu.base.rotation.y = Math.PI / 2;
  c.corte(P([-1.6, 1.6, 1.2], [DORM.janela[0], 1.4, DORM.janela[1]], 12, { fov: 46 }));
  await c.espera(4);
  await c.letreiro('Fim do capítulo 1 · A estrada', 4);
}

/**
 * Ponte provisória para a campanha antiga até os capítulos seguintes existirem: o Pátio de noite, com chuva, e o
 * Crivo, que chega mudo e não olha para o rosto do protagonista (plantio do capítulo 3 da bíblia).
 */
async function ponte(g: G): Promise<void> {
  await g.trocarRegiao('atrio', 'inicio');
  await g.runScript(async () => {
    await g.say('', 'Mais tarde, chove no pátio. As velas aos pés de Iolanda apagaram, e não sobrou ninguém para parar de conversar quando você passa.');
    await g.say('', 'Algo pequeno, cor de vinho, saltita entre as poças na sua direção. Tem um olho só.');
    g.crivo.cheer();
    await g.say('', 'Ele olha as suas mãos, o bolso onde está o pote, os seus sapatos. Para o seu rosto, não. Dá uma volta ao seu redor e se põe ao seu lado.');
    g.startQuest('chegada');
  });
}
