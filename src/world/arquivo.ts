import * as THREE from 'three';
import { RegionBuilder, trs } from './builder';
import { M } from './mats';
import * as K from './kit';
import { ENV } from './envs';
import { emptyRegion, type BuiltRegion, type RegionCtx } from './region';

/**
 * Arquivo das Perguntas (Atlas E-06, E-17). Biblioteca gótica de nave única,
 * estantes altas, luminárias de latão e a Sala dos Originais ao fundo.
 * Três registros, três rastros de tinta: a lição é de procedência.
 */
/** Seis estantes expositoras de obras. Autores vivos aparecem como obra citada, sem busto. */
export const OBRAS_ARQUIVO: Array<{ id: string; placa: string; rotulo: string; x: number; z: number; texto: string }> = [
  { id: 'obra_ebm', placa: 'EBM WORKING GROUP · 1992', rotulo: 'a nova abordagem de 1992', x: -14, z: -14, texto: 'Um periódico aberto em 1992: o grupo de trabalho propõe ensinar a prática por perguntas, busca e avaliação crítica, e não por decoreba.' },
  { id: 'obra_chalmers', placa: 'ENKIN · KEIRSE · CHALMERS · 1989', rotulo: 'o guia de cuidado efetivo', x: -14, z: -6, texto: 'Um volume grosso de revisões sobre gravidez e parto. Cada capítulo diz o que ajuda, o que atrapalha e o que ainda ninguém testou.' },
  { id: 'obra_greenhalgh', placa: 'GREENHALGH · COMO LER UM ARTIGO', rotulo: 'o manual de leitura crítica', x: -14, z: 2, texto: 'Uma série transformada em livro. A primeira pergunta é qual era a pergunta do estudo. Os números ficam para depois.' },
  { id: 'obra_gigerenzer', placa: 'GIGERENZER · RISCO EM CEM PESSOAS', rotulo: 'o estudo sobre entender risco', x: 14, z: -14, texto: 'Dois cartões lado a lado: um diz "10%", o outro diz "10 em cada 100". Quase todo mundo entende melhor o segundo.' },
  { id: 'obra_ioannidis', placa: 'IOANNIDIS · 2005', rotulo: 'o artigo de 2005', x: 14, z: 8, texto: 'Um artigo marcado de lápis por muitos leitores. Diz que estudos pequenos, flexíveis e com muito em jogo tendem a produzir achados que não se confirmam.' },
  { id: 'obra_cochrane_br', placa: 'CENTRO COCHRANE DO BRASIL · 1996', rotulo: 'o registro do Centro Cochrane', x: 10, z: 18, texto: 'Uma placa de fundação: em 1996 o Centro Cochrane do Brasil começou a reunir e a traduzir revisões sistemáticas para o português.' },
];

export function buildArquivo(ctx: RegionCtx): BuiltRegion {
  const b = new RegionBuilder();
  const r = emptyRegion('arquivo', 'Arquivo das Perguntas', 'Os livros são guardados pela pergunta que respondem', b, ENV.arquivo);
  r.music = 'arquivo';
  r.bounds = { minX: -15.4, maxX: 15.4, minZ: -40.4, maxZ: 21.4 };
  const H = 11;

  // piso, tapete, teto
  b.add(new THREE.PlaneGeometry(34, 46), M.flag, trs(0, 0, 0, 0, -Math.PI / 2), false, false);
  b.add(new THREE.PlaneGeometry(26, 24), M.wood, trs(0, 0, -30, 0, -Math.PI / 2), false, false);
  b.add(new THREE.PlaneGeometry(3.2, 36), M.wine, trs(0, 0.03, 2, 0, -Math.PI / 2), false, false);
  b.add(new THREE.PlaneGeometry(34, 46), M.stoneDark, trs(0, H, 0, 0, Math.PI / 2), false, false);
  b.add(new THREE.PlaneGeometry(26, 24), M.stoneDark, trs(0, 9, -30, 0, Math.PI / 2), false, false);
  // paredes do salão
  b.box(M.stoneDark, 1, H, 46, -16.5, 0, 0, 0, true);
  b.box(M.stoneDark, 1, H, 46, 16.5, 0, 0, 0, true);
  b.box(M.stoneDark, 14.6, H, 1, -9.3, 0, 22.5, 0, true);
  b.box(M.stoneDark, 14.6, H, 1, 9.3, 0, 22.5, 0, true);
  b.box(M.stoneDark, 4, H - 6, 1, 0, 6, 22.5, 0);
  b.box(M.woodDark, 4, 6, 0.3, 0, 0, 22.3, 0);
  b.collideBox(0, 22.3, 2, 0.4, 0, -1, 8);
  // parede norte com a porta da Sala dos Originais
  b.box(M.stoneDark, 14.8, H, 1, -9.4, 0, -18.5, 0, true);
  b.box(M.stoneDark, 14.8, H, 1, 9.4, 0, -18.5, 0, true);
  b.box(M.stoneDark, 4, H - 5.4, 1, 0, 5.4, -18.5, 0);
  b.add(new THREE.BoxGeometry(4.6, 0.3, 1.2), M.carved, trs(0, 5.5, -18.5));
  K.plaque(b, 'SALA DOS ORIGINAIS', 0, 6.3, -17.95, 0, 3.6, 0.42, '#cdb98e');
  K.plaque(b, 'Abre para o registro que não copiou de ninguém', 0, 5.86, -17.95, 0, 3.6, 0.2, '#b9a6ae', null, 'italic 400 44px "Source Serif 4", Georgia, serif');
  // Sala dos Originais
  b.box(M.stoneDark, 1, 9, 23, -12.5, 0, -30, 0, true);
  b.box(M.stoneDark, 1, 9, 23, 12.5, 0, -30, 0, true);
  b.box(M.stoneDark, 26, 9, 1, 0, 0, -41, 0, true);

  // porta
  const door = new THREE.Mesh(new THREE.BoxGeometry(3.9, 5.4, 0.3), M.woodDark);
  const opened = ctx.flags.has('originais_aberta');
  door.position.set(0, opened ? 8 : 2.7, -18.5);
  door.castShadow = true;
  b.dynamic(door);
  for (const y of [1, 2.7, 4.4]) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.14, 0.36), M.bronze);
    band.position.y = y - 2.7;
    door.add(band);
  }
  if (!opened) b.collideBox(0, -18.5, 2, 0.5, 0, -1, 8, 'porta_originais');
  let lift = -1;
  r.actions.porta = () => {
    if (lift < 0) lift = 0;
    r.colliders = r.colliders.filter((c) => c.tag !== 'porta_originais');
  };
  b.updaters.push((dt) => {
    if (lift < 0 || lift >= 1) return;
    lift = Math.min(1, lift + dt * 0.45);
    door.position.y = 2.7 + 5.3 * lift * lift * (3 - 2 * lift);
  });

  // nave: colunas, abóbadas, lustres
  const zs = [16, 8, 0, -8, -16];
  for (const z of zs) for (const x of [-7, 7]) K.column(b, x, z, 7.2, 0.42);
  for (let i = 0; i < zs.length - 1; i++) K.ribVault(b, 0, (zs[i] + zs[i + 1]) / 2, 14, 8, 7.2, 3.6);
  for (const z of [12, 4, -4, -12]) {
    b.add(new THREE.CylinderGeometry(0.02, 0.02, 4.4, 4), M.iron, trs(0, 8.6, z));
    b.add(new THREE.TorusGeometry(0.9, 0.04, 10, 28), M.bronze, trs(0, 6.4, z, 0, Math.PI / 2), false);
    for (let k = 0; k < 6; k++) K.candle(b, Math.sin((k / 6) * Math.PI * 2) * 0.9, 6.42, z + Math.cos((k / 6) * Math.PI * 2) * 0.9, false);
    b.lamp(0, 6.1, z, 0xffa860, 1.1, 17, 0.1);
  }
  // estantes de parede e janelas altas
  for (const z of [16.5, 9.5, 2.5, -4.5, -11.5]) {
    K.bookshelf(b, -15.6, z, Math.PI / 2, 6.2, 6.2);
    K.bookshelf(b, 15.6, z, -Math.PI / 2, 6.2, 6.2);
    K.gothicWindow(b, -15.96, 6.9, z, Math.PI / 2, 1.6, 3.4, true);
    K.gothicWindow(b, 15.96, 6.9, z, -Math.PI / 2, 1.6, 3.4, true);
  }
  // estantes transversais: formam os nichos onde as fichas se escondem
  for (const z of [13, 5, -3, -11]) {
    K.bookshelf(b, -11.6, z, 0, 5.2, 4.4, 0, true);
    K.bookshelf(b, 11.6, z, 0, 5.2, 4.4, 0, true);
  }
  // mesas de leitura
  for (const [x, z] of [[-3.6, 13], [3.6, 13], [-3.6, -11], [3.6, -11]] as Array<[number, number]>) {
    K.table(b, x, z, 0, 2.6, 1.2);
    K.deskLamp(b, x - 0.7, 0.92, z, true);
    b.add(new THREE.BoxGeometry(0.5, 0.06, 0.36), M.parchment, trs(x + 0.3, 0.95, z + 0.1, 0.3), false, false);
    K.bench(b, x, z + 1.2, 0);
  }
  K.table(b, 4.6, 19.2, 0, 2.2, 1.0);
  K.deskLamp(b, 5.2, 0.92, 19.2, false);
  b.add(new THREE.BoxGeometry(0.6, 0.05, 0.42), M.parchment, trs(4.3, 0.95, 19.2, -0.2), false, false);

  // púlpitos dos três registros
  const lectern = (x: number, z: number, rot: number) => {
    b.box(M.woodDark, 0.5, 1.05, 0.5, x, 0, z, rot);
    b.add(new THREE.BoxGeometry(0.9, 0.08, 0.66), M.wood, trs(x, 1.16, z, rot, -0.5));
    b.add(new THREE.BoxGeometry(0.68, 0.04, 0.5), M.parchment, trs(x, 1.21, z, rot, -0.5), false, false);
    K.candle(b, x + 0.52 * Math.cos(rot), 1.05, z - 0.52 * Math.sin(rot), false);
    b.collideCircle(x, z, 0.45, -1, 1.5);
  };
  lectern(-3.6, 5.4, 0);
  lectern(3.6, 5.4, 0);
  lectern(0, -5, 0);

  // rastros de tinta (visíveis só com a Lupa curiosa)
  const trail = (pts: Array<[number, number]>, color: number): THREE.Group => {
    const g = new THREE.Group();
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i];
      const [bx, bz] = pts[i + 1];
      const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.7);
      for (let k = 0; k < n; k++) {
        const h = K.halo(0.95, color, 1);
        h.position.set(ax + ((bx - ax) * k) / n + Math.sin(k * 2.3 + i) * 0.12, 0.12, az + ((bz - az) * k) / n + Math.cos(k * 1.7) * 0.12);
        g.add(h);
      }
    }
    g.visible = false;
    b.dynamic(g);
    return g;
  };
  const ta = trail([[-3.6, 5.4], [-8.6, 9], [-13.4, 9]], 0x7fd8ff);
  const tb = trail([[3.6, 5.4], [8.6, 1], [13.4, 1]], 0x7fd8ff);
  const tc = trail([[0, -5], [-4, -9], [-9, -15.4]], 0x7fd8ff);

  // console das alavancas
  const lever = (x: number, name: string) => {
    b.box(M.stoneDark, 0.7, 1.0, 0.5, x, 0, -17.6, 0, true);
    b.add(new THREE.CylinderGeometry(0.035, 0.035, 0.9, 16), M.iron, trs(x, 1.36, -17.5, 0, 0.5), false);
    b.add(new THREE.SphereGeometry(0.08, 8, 6), M.bronze, trs(x, 1.76, -17.28), false);
    K.plaque(b, name, x, 0.6, -17.34, 0, 0.62, 0.2, '#e7d8b4', '#2a1418', '500 150px "IBM Plex Mono", monospace');
  };
  lever(3.4, 'SINO');
  lever(4.8, 'MARÉ');
  lever(6.2, 'FAROL');

  // Sala dos Originais: estantes, pódio e velas
  for (const z of [-24, -30, -36]) {
    K.bookshelf(b, -11.7, z, Math.PI / 2, 5, 5.4);
    K.bookshelf(b, 11.7, z, -Math.PI / 2, 5, 5.4);
  }
  b.add(new THREE.CylinderGeometry(3.2, 3.4, 0.24, 24), M.stone, trs(0, 0.12, -38.2), false);
  b.platform(0, -38.2, 2.3, 2.3, 0, 0.24);
  for (const x of [-8, 8]) {
    K.column(b, x, -22, 6.4, 0.36);
    K.column(b, x, -38, 6.4, 0.36);
  }
  for (const [x, z] of [[-5, -39.6], [5, -39.6], [-9.5, -21], [9.5, -21]] as Array<[number, number]>) {
    b.box(M.iron, 0.12, 1.5, 0.12, x, 0, z, 0);
    K.candle(b, x, 1.5, z, true);
  }
  b.lamp(0, 5.5, -30, 0xffb070, 0.9, 20, 0.15);
  K.gothicWindow(b, 0, 2.6, -40.46, 0, 3, 5.6, true);

  // marco de descanso
  b.add(new THREE.CylinderGeometry(0.34, 0.42, 1.0, 22), M.carved, trs(-5.4, 0.5, 18.6), false);
  b.add(new THREE.CylinderGeometry(0.46, 0.34, 0.14, 22), M.bronze, trs(-5.4, 1.06, 18.6), false);
  K.candle(b, -5.4, 1.13, 18.6, true);
  b.collideCircle(-5.4, 18.6, 0.45, -1, 1.3);
  K.crate(b, -13.6, 19.6, 0.8, 0.2);
  K.crate(b, 13.4, -15.6, 0.7, 0.5);

  // estantes expositoras de obras (Passeio dos Mestres, parte do Arquivo)
  for (const o of OBRAS_ARQUIVO) {
    const rot = Math.abs(o.x) > 12 ? (o.x < 0 ? Math.PI / 2 : -Math.PI / 2) : Math.PI;
    const c = Math.cos(rot);
    const sn = Math.sin(rot);
    const at = (lx: number, lz: number) => [o.x + lx * c + lz * sn, o.z - lx * sn + lz * c] as const;
    b.box(M.woodDark, 0.7, 0.95, 0.5, o.x, 0, o.z, rot, true);
    const [tx, tz] = at(0, 0.02);
    b.add(new THREE.BoxGeometry(0.86, 0.06, 0.62), M.wood, trs(tx, 1.0, tz, rot, -0.38));
    const [bx, bz] = at(0, 0.03);
    b.add(new THREE.BoxGeometry(0.5, 0.025, 0.36), M.parchment, trs(bx, 1.045, bz, rot, -0.38));
    const [px, pz] = at(0, 0.27);
    K.plaque(b, o.placa, px, 0.48, pz, rot, 0.66, 0.14, '#e7d8b4', '#2a1418', '500 52px "IBM Plex Mono", monospace');
    const [lx2, lz2] = at(0.3, -0.05);
    K.candle(b, lx2, 1.1, lz2, false);
  }

  b.finalize();

  r.spawns = { de_atrio: { x: 0, z: 16.4, yaw: Math.PI } };
  r.enemies = [
    { kind: 'vulto', x: -11.4, z: 1, group: 'estantes' },
    { kind: 'vulto', x: 11.4, z: -7, group: 'estantes' },
    { kind: 'fiapo', x: 0, z: -12.5, group: 'estantes' },
    { kind: 'eco', x: 0, z: -31, group: 'eco', ifFlag: 'originais_aberta' },
  ];
  r.props = [
    ...OBRAS_ARQUIVO.map((o) => ({ id: 'obra_' + o.id, kind: 'examine' as const, x: o.x, z: o.z, label: `Ler ${o.rotulo}`, radius: 1.9, data: { text: o.texto, codex: o.id, xp: 10, obra: true } })),
    { id: 'portal_atrio', kind: 'portal', x: 0, z: 21.2, label: 'Voltar ao Pátio dos Caminhos', radius: 2.0, data: { to: 'atrio', spawn: 'de_arquivo' } },
    { id: 'pulpito_a', kind: 'examine', x: -3.6, z: 5.4, label: 'Ler o Registro do Sino', radius: 1.7 },
    { id: 'pulpito_b', kind: 'examine', x: 3.6, z: 5.4, label: 'Ler o Registro da Maré', radius: 1.7 },
    { id: 'pulpito_c', kind: 'examine', x: 0, z: -5, label: 'Ler o Registro do Farol', radius: 1.7 },
    { id: 'rastro_a', kind: 'trail', x: -8.6, z: 9, label: '', object: ta },
    { id: 'rastro_b', kind: 'trail', x: 8.6, z: 1, label: '', object: tb },
    { id: 'rastro_c', kind: 'trail', x: -4, z: -9, label: '', object: tc },
    { id: 'ficha_a', kind: 'pickup', x: -13.6, z: 9, label: 'Pegar a ficha de procedência', hidden: true, data: { item: 'ficha_a', lupa: true } },
    { id: 'ficha_b', kind: 'pickup', x: 13.6, z: 1, label: 'Pegar a ficha de procedência', hidden: true, data: { item: 'ficha_b', lupa: true } },
    { id: 'ficha_c', kind: 'pickup', x: -9.4, z: -15.8, label: 'Pegar a ficha de procedência', hidden: true, data: { item: 'ficha_c', lupa: true } },
    { id: 'alavanca_a', kind: 'lever', x: 3.4, z: -16.9, label: 'Alavanca do Sino', radius: 0.9 },
    { id: 'alavanca_b', kind: 'lever', x: 4.8, z: -16.9, label: 'Alavanca da Maré', radius: 0.9 },
    { id: 'alavanca_c', kind: 'lever', x: 6.2, z: -16.9, label: 'Alavanca do Farol', radius: 0.9 },
    { id: 'bau_lanterna', kind: 'chest', x: 0, z: -38.4, y: 0.24, label: 'Abrir o baú', radius: 2.0, data: { item: 'lanterna_transparencia', requiresGroup: 'eco' } },
    { id: 'pagina_5', kind: 'page', x: -10, z: -36.5, label: 'Recolher a página solta', radius: 1.6, data: { page: 'desenho' } },
    { id: 'descanso_arquivo', kind: 'rest', x: -5.4, z: 18.6, label: 'Descansar e registrar o caminho', radius: 1.8 },
    { id: 'caderno_arquivo', kind: 'examine', x: 4.4, z: 19.8, label: 'Ler o caderno da entrada', radius: 1.6, data: { text: 'O caderno de entrada lista os livros pela pergunta que respondem: "Para quem?", "Comparado com o quê?", "Medido como?". Não há coluna para "assunto".', xp: 10 } },
    { id: 'moedas_arquivo_1', kind: 'pickup', x: 13.8, z: 17.4, label: 'Pegar moedas', data: { item: 'moedas', qty: 16 } },
    { id: 'caldo_arquivo', kind: 'pickup', x: 9.6, z: -20.6, label: 'Pegar o caldo', data: { item: 'caldo', qty: 1 } },
    { id: 'rastro_arquivo', kind: 'pickup', x: 13.6, z: -8, label: 'Pegar o que o rastro escondia', data: { item: 'moedas', qty: 45, needsCrivo: 'rastro' } },
  ];
  r.mapPoints = [
    { x: 0, z: 21, label: 'Saída', kind: 'portal' },
    { x: 0, z: 2, label: 'Salão dos púlpitos', kind: 'poi' },
    { x: 0, z: -30, label: 'Sala dos Originais', kind: 'poi' },
  ];
  return r;
}
