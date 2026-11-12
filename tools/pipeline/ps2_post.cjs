// Pós-processo dos personagens PS2: modo de alfa vindo do Blender (extras.ps2_alpha), limpeza e compressão meshopt.
// Uso: node ps2_post.cjs entrada.glb saida.glb [regex de clipes a descartar]
// Os módulos vêm da instalação global do @gltf-transform/cli (npm i -g @gltf-transform/cli).
const path = require('path');
const { execSync } = require('child_process');
const G = path.join(execSync('npm root -g').toString().trim(), '@gltf-transform/cli/node_modules');
const req = (m) => require(path.join(G, m));
const { NodeIO } = req('@gltf-transform/core');
const { ALL_EXTENSIONS } = req('@gltf-transform/extensions');
const { prune, dedup, weld, meshopt, quantize } = req('@gltf-transform/functions');
const { MeshoptEncoder, MeshoptDecoder } = req('meshoptimizer');

(async () => {
  const [src, out, drop] = process.argv.slice(2);
  await MeshoptEncoder.ready;
  await MeshoptDecoder.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
  const doc = await io.read(src);
  for (const m of doc.getRoot().listMaterials()) {
    const mode = (m.getExtras() || {}).ps2_alpha;
    if (mode === 'MASK') {
      m.setAlphaMode('MASK');
      m.setAlphaCutoff(0.5);
    } else if (mode === 'OPAQUE') m.setAlphaMode('OPAQUE');
    m.setRoughnessFactor(Math.max(m.getRoughnessFactor(), 0.3));
  }
  // NPCs não usam os clipes de combate e tocha do protagonista
  if (drop) for (const a of doc.getRoot().listAnimations()) if (new RegExp(drop).test(a.getName())) a.dispose();
  await doc.transform(dedup(), prune(), weld(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  await io.write(out, doc);
  const tris = doc.getRoot().listMeshes().reduce((a, me) => a + me.listPrimitives().reduce((b, p) => b + (p.getIndices()?.getCount() ?? 0) / 3, 0), 0);
  console.log('POS', path.basename(out), Math.round(tris), 'triângulos');
})();
