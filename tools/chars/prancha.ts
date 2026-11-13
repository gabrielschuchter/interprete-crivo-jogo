// Prancha de verificação de personagem (desenvolvimento): renderiza vistas e poses de clipes de um GLB
// em resolução interna baixa, com a luz da direção PS2 (lua fria + um ponto quente), e compõe uma folha.
// ?m=models/personagens/x.glb&poses=idle:0,walk:0.3,talk:0.5&w=220&h=330&luz=ps2|neutra
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

const q = new URLSearchParams(location.search);
const W = Number(q.get('w') ?? 220), H = Number(q.get('h') ?? 330), UP = Number(q.get('up') ?? 2);
const views: { yaw: number; clip?: string; t?: number; label: string; morph?: string }[] = [
  { yaw: 0, label: 'frente' }, { yaw: -0.8, label: 'tres-quartos' }, { yaw: -Math.PI / 2, label: 'lado' }, { yaw: Math.PI, label: 'costas' },
];
for (const s of (q.get('poses') ?? 'idle:0.3,walk:0.25,talk:0.5,point:0.55').split(',').filter(Boolean)) {
  const [c, t] = s.split(':');
  views.push({ yaw: -0.5, clip: c, t: Number(t ?? 0.5), label: c });
}
// ?expr=neutro,piscar,sorriso: uma vista por expressão (morph target do corpo em 1), de frente e em repouso
if (q.get('expr')) {
  views.length = 0;
  for (const e of q.get('expr')!.split(',')) views.push({ yaw: -0.25, clip: q.get('base') ?? 'idle', t: 0.3, label: e, morph: e });
}
const cols = Number(q.get('cols') ?? Math.min(views.length, 8));
const rows = Math.ceil(views.length / cols);
const r = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
r.setPixelRatio(1);
r.setSize(W, H);
r.toneMapping = THREE.ACESFilmicToneMapping;
r.toneMappingExposure = 1.05;
r.shadowMap.enabled = true;
const sheet = document.createElement('canvas');
sheet.width = cols * W * UP;
sheet.height = rows * (H * UP + 18);
document.body.appendChild(sheet);
const g2 = sheet.getContext('2d')!;
g2.imageSmoothingEnabled = true;
g2.fillStyle = '#0d0b10';
g2.fillRect(0, 0, sheet.width, sheet.height);
const s = new THREE.Scene();
const ps2 = (q.get('luz') ?? 'ps2') === 'ps2';
s.background = new THREE.Color(ps2 ? 0x15121c : 0x3a3640);
if (ps2) s.fog = new THREE.Fog(0x1a1824, 4, 11);
const cam = new THREE.PerspectiveCamera(30, W / H, 0.05, 60);
const moon = new THREE.DirectionalLight(ps2 ? 0x9aa8d8 : 0xffffff, ps2 ? 1.5 : 2.2);
moon.position.set(-2.5, 4, 3);
moon.castShadow = true;
moon.shadow.mapSize.set(512, 512);
s.add(moon, new THREE.HemisphereLight(ps2 ? 0x46506e : 0xc0c8ff, ps2 ? 0x1c1414 : 0x504040, ps2 ? 0.9 : 1.1));
const warm = new THREE.PointLight(0xffa860, ps2 ? 7 : 0, 6, 1.6);
warm.position.set(1.1, 1.5, 1.4);
s.add(warm);
const floor = new THREE.Mesh(new THREE.CircleGeometry(3, 24), new THREE.MeshStandardMaterial({ color: ps2 ? 0x2a2630 : 0x55505a, roughness: 1 }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
s.add(floor);
const info: Record<string, unknown> = {};
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
loader.load(q.get('m') ?? 'models/personagens/vulto.glb', (g) => {
  let tris = 0;
  const mats = new Set<string>();
  g.scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.castShadow = true;
    m.frustumCulled = false;
    const idx = m.geometry.index;
    tris += (idx ? idx.count : m.geometry.attributes.position.count) / 3;
    for (const mt of (Array.isArray(m.material) ? m.material : [m.material]) as THREE.MeshStandardMaterial[]) {
      mats.add(mt.name);
      if (q.get('esconde') && mt.name === q.get('esconde')) m.visible = false;
      if (q.get('marca') && mt.name === q.get('marca')) { mt.map = null; mt.color.set(0x00ff00); mt.emissive?.set(0x003300); }
      mt.transparent = false;
      mt.alphaTest = mt.alphaTest || 0;
      if (mt.map) { mt.map.magFilter = THREE.LinearFilter; mt.map.minFilter = THREE.LinearMipMapLinearFilter; }
    }
  });
  const alt = (g.scene.userData.ps2_altura as number) ?? 1.7;
  info.tris = tris;
  info.mats = [...mats];
  info.clips = g.animations.map((a) => `${a.name}:${a.duration.toFixed(2)}`);
  info.altura = alt;
  views.forEach((v, i) => {
    const o = SkeletonUtils.clone(g.scene);
    o.rotation.y = v.yaw;
    s.add(o);
    const mixer = new THREE.AnimationMixer(o);
    const clip = v.clip === 'rest' ? undefined : g.animations.find((a) => a.name === (v.clip ?? q.get('base') ?? 'idle'));
    if (clip) {
      const a = mixer.clipAction(clip).play();
      a.time = (v.t ?? 0.3) * clip.duration;
      mixer.update(0);
    }
    if (v.morph) {
      o.traverse((m) => {
        const me = m as THREE.Mesh;
        const d = me.morphTargetDictionary;
        if (!d || !me.morphTargetInfluences) return;
        me.morphTargetInfluences.fill(0);
        if (d[v.morph!] !== undefined) me.morphTargetInfluences[d[v.morph!]] = 1;
      });
    }
    o.updateMatrixWorld(true);
    if (q.get('caixas') && i === 0) {
      const cx: Record<string, number[]> = {};
      o.traverse((m) => { const sm = m as THREE.SkinnedMesh; if (!sm.isMesh) return; const b = new THREE.Box3().setFromObject(sm, true); cx[(sm.material as THREE.Material).name] = [...b.min.toArray(), ...b.max.toArray()].map((x) => +x.toFixed(3)); });
      const hd = o.getObjectByName('Head'); const hp = new THREE.Vector3(); hd?.getWorldPosition(hp);
      const inv = o.matrixWorld.clone().invert();
      const pts = (nm: string) => { const out: THREE.Vector3[] = []; o.traverse((m) => { const sm = m as THREE.SkinnedMesh; if (!sm.isMesh || (sm.material as THREE.Material).name !== nm) return; const n = sm.geometry.attributes.position.count; for (let k = 0; k < n; k++) { const v = new THREE.Vector3(); sm.getVertexPosition(k, v); sm.localToWorld(v); v.applyMatrix4(inv); out.push(v); } }); return out; };
      const E = pts('Human.low-poly'), B = pts('Human.body');
      const olhos: unknown[] = [];
      for (const sd of [1, -1]) {
        const e = E.filter((v) => v.x * sd > 0); const c = e.reduce((a, v) => a.add(v), new THREE.Vector3()).multiplyScalar(1 / e.length);
        const fz = Math.max(...e.map((v) => v.z));
        const near = B.filter((v) => Math.hypot(v.x - c.x, v.y - c.y) < 0.006).map((v) => +(v.z - c.z).toFixed(4));
        olhos.push({ c: c.toArray().map((x) => +x.toFixed(3)), frente: +(fz - c.z).toFixed(4), corpo: near.sort() });
      }
      info.olhos = olhos;
      info.caixas = cx; info.head = hp.toArray().map((x) => +x.toFixed(3));
    }
    const box = new THREE.Box3().setFromObject(o);
    const c = box.getCenter(new THREE.Vector3());
    const hgt = Math.max(alt, box.max.y - box.min.y);
    const zoom = Number(q.get('zoom') ?? 0);
    if (zoom) {
      // close no rosto: mira na cabeça do esqueleto
      const hd = o.getObjectByName('Head');
      if (hd) hd.getWorldPosition(c);
      c.y += Number(q.get('zy') ?? 0.07);
      cam.position.set(c.x, c.y + 0.02, c.z + zoom);
    } else cam.position.set(c.x, c.y + hgt * 0.04, c.z + hgt * 2.05);
    cam.lookAt(c.x, c.y, c.z);
    r.render(s, cam);
    const x = (i % cols) * W * UP, y = Math.floor(i / cols) * (H * UP + 18);
    g2.drawImage(r.domElement, x, y, W * UP, H * UP);
    g2.fillStyle = '#cbbfa8';
    g2.fillText(v.label + (v.clip && !v.morph ? ` ${v.t}` : ''), x + 6, y + H * UP + 13);
    s.remove(o);
  });
  (window as any).info = info;
  (window as any).pronto = true;
}, undefined, (e) => { (window as any).info = { erro: String(e) }; (window as any).pronto = true; });
