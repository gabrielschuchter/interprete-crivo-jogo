import { NodeIO } from '@gltf-transform/core';
import { KHRMeshQuantization, EXTMeshoptCompression, KHRTextureBasisu, EXTTextureWebP } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions([KHRMeshQuantization, EXTMeshoptCompression, KHRTextureBasisu, EXTTextureWebP]).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
for (const f of process.argv.slice(2)) {
  const d = await io.read(f); const r = d.getRoot();
  const sk = r.listSkins()[0];
  console.log('==', f.split('/').pop(), '| clips', r.listAnimations().length, '| joints', sk ? sk.listJoints().length : 0);
  if (sk) console.log('  bones:', sk.listJoints().map(j => j.getName()).join(' '));
  for (const a of r.listAnimations()) { let mx = 0; for (const s of a.listSamplers()) { const t = s.getInput(); mx = Math.max(mx, t.getMax([])[0]); } console.log('   ', a.getName().padEnd(34), mx.toFixed(2)+'s', a.listChannels().length+'ch'); }
}
