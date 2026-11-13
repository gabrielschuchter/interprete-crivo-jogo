/**
 * Orçamento de triângulos da era PS2 para os props de cenário (docs/game/DIRECAO_DE_ARTE_PS2.md).
 * Os props vieram de escaneamentos Poly Haven com dezenas ou centenas de milhares de triângulos; o Pátio
 * chegava a 1,9 milhão de triângulos visíveis. Aqui cada malha passa por simplificação do meshoptimizer até
 * o orçamento e as folhas de árvore (cartões soltos) são raleadas por componente, como fazia tools/pipeline/tree.py.
 *
 * Uso: node tools/pipeline/ps2_lod.mjs [--dry] [arquivo.glb ...]   (sem arquivos: todos de public/models/props)
 * O original fica em tools/pipeline/.lod-orig/ (fora do git) na primeira passada; rodar de novo parte dele.
 */
import fs from 'node:fs';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { simplifyPrimitive, weld, dedup, prune, meshopt as meshoptCompress } from '@gltf-transform/functions';
import { MeshoptSimplifier, MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const propsDir = path.join(root, 'public/models/props');
const origDir = path.join(root, 'tools/pipeline/.lod-orig');
const dry = process.argv.includes('--dry');
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const files = args.length ? args.map((a) => path.resolve(a)) : fs.readdirSync(propsDir).filter((f) => f.endsWith('.glb')).map((f) => path.join(propsDir, f));

/** triângulos por malha (o prop inteiro, somando primitivas). Acima disso, simplifica. */
const BUDGET = { default: 6000, jacaranda_tree: 9000, modular_fort_01: 20000, coastal_cliff_01: 8000, coast_line_02: 8000, coast_rocks_01: 6000 };
/** fração de cartões de folha mantida; os que ficam crescem para a copa não ralear (área × 1/fração × 0,6) */
const LEAF_KEEP = 0.07;
const LEAF_GROW = Math.sqrt(0.6 / LEAF_KEEP);

await MeshoptSimplifier.ready;
await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });

const tris = (prim) => {
  const idx = prim.getIndices();
  return (idx ? idx.getCount() : prim.getAttribute('POSITION').getCount()) / 3;
};

/** Mantém só uma fração dos componentes conexos (cartões de folha) de uma primitiva indexada. */
function thinLeaves(prim, keep, grow, seed = 7) {
  const idx = prim.getIndices();
  if (!idx) return;
  const a = idx.getArray();
  const nv = prim.getAttribute('POSITION').getCount();
  const par = new Int32Array(nv).map((_, i) => i);
  const find = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  for (let i = 0; i < a.length; i += 3) {
    const r0 = find(a[i]), r1 = find(a[i + 1]), r2 = find(a[i + 2]);
    par[r1] = r0; par[find(r2)] = r0;
  }
  // centro de cada cartão, para o cartão mantido crescer em torno dele
  const pos = prim.getAttribute('POSITION');
  const v = [0, 0, 0];
  const cx = new Float64Array(nv), cy = new Float64Array(nv), cz = new Float64Array(nv), cn = new Float64Array(nv);
  for (let i = 0; i < nv; i++) { const r = find(i); pos.getElement(i, v); cx[r] += v[0]; cy[r] += v[1]; cz[r] += v[2]; cn[r]++; }
  let s = seed >>> 0;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const keepRoot = new Map();
  const out = [];
  for (let i = 0; i < a.length; i += 3) {
    const r = find(a[i]);
    let k = keepRoot.get(r);
    if (k === undefined) keepRoot.set(r, (k = rnd() < keep));
    if (k) out.push(a[i], a[i + 1], a[i + 2]);
  }
  const Arr = a.constructor;
  idx.setArray(new Arr(out));
  const moved = new Uint8Array(nv);
  for (const i of out) {
    if (moved[i]) continue;
    moved[i] = 1;
    const r = find(i);
    pos.getElement(i, v);
    const mx = cx[r] / cn[r], my = cy[r] / cn[r], mz = cz[r] / cn[r];
    pos.setElement(i, [mx + (v[0] - mx) * grow, my + (v[1] - my) * grow, mz + (v[2] - mz) * grow]);
  }
}

let before = 0, after = 0;
for (const f of files) {
  const name = path.basename(f, '.glb');
  fs.mkdirSync(origDir, { recursive: true });
  const orig = path.join(origDir, name + '.glb');
  if (!fs.existsSync(orig)) fs.copyFileSync(f, orig);
  const doc = await io.read(orig);
  const meshes = doc.getRoot().listMeshes();
  const total0 = meshes.reduce((s, m) => s + m.listPrimitives().reduce((t, p) => t + tris(p), 0), 0);
  const budget = BUDGET[name] ?? BUDGET.default;
  before += total0;
  if (total0 <= budget * 1.15) { after += total0; console.log(`${name}: ${total0} triângulos, dentro do orçamento`); continue; }
  // folhas primeiro (raleadas por cartão), depois simplificação geral até o orçamento
  for (const m of meshes) for (const p of m.listPrimitives()) {
    const mat = (p.getMaterial()?.getName() ?? '').toLowerCase();
    if (/leaves|leaf|branches/.test(mat)) thinLeaves(p, LEAF_KEEP, LEAF_GROW);
  }
  const mid = meshes.reduce((s, m) => s + m.listPrimitives().reduce((t, p) => t + tris(p), 0), 0);
  const leafTris = meshes.reduce((s, m) => s + m.listPrimitives().filter((p) => /leaves|leaf|branches/.test((p.getMaterial()?.getName() ?? '').toLowerCase())).reduce((t, p) => t + tris(p), 0), 0);
  const solid = mid - leafTris;
  const ratio = Math.min(1, Math.max(0.01, (budget - Math.min(leafTris, budget * 0.6)) / Math.max(1, solid)));
  await doc.transform(weld());
  // folhas já raleadas não passam pelo simplificador: colapsar cartões pequenos apaga a copa
  for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) {
    if (/leaves|leaf|branches/.test((p.getMaterial()?.getName() ?? '').toLowerCase())) continue;
    simplifyPrimitive(p, { simplifier: MeshoptSimplifier, ratio, error: 0.02, lockBorder: false });
  }
  await doc.transform(dedup(), prune());
  const total1 = doc.getRoot().listMeshes().reduce((s, m) => s + m.listPrimitives().reduce((t, p) => t + tris(p), 0), 0);
  after += total1;
  console.log(`${name}: ${total0} → ${total1} triângulos (folhas ${leafTris}, razão ${ratio.toFixed(3)})`);
  if (dry) continue;
  await doc.transform(meshoptCompress({ encoder: MeshoptEncoder, level: 'medium' }));
  await io.write(f, doc);
}
console.log(`total: ${before} → ${after} triângulos`);
