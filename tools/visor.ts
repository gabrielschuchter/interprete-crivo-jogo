// Visor de desenvolvimento: ?m=models/x.glb&clip=walk&t=0.5&yaw=0&dist=3
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
const q = new URLSearchParams(location.search);
const r = new THREE.WebGLRenderer({ antialias: true });
r.setSize(innerWidth, innerHeight);
r.toneMapping = THREE.ACESFilmicToneMapping;
r.shadowMap.enabled = true;
document.body.appendChild(r.domElement);
const s = new THREE.Scene();
s.background = new THREE.Color(0x2a2630);
const cam = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.05, 500);
const sun = new THREE.DirectionalLight(0xfff0e0, 2.5);
sun.position.set(2, 4, 3);
sun.castShadow = true;
s.add(sun, new THREE.HemisphereLight(0xb0c0ff, 0x302020, 0.8));
const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: 0x555055 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
s.add(ground);
const info = document.getElementById('i')!;
new RGBELoader().load('textures/zavelstein_2k.hdr', (t) => {
  t.mapping = THREE.EquirectangularReflectionMapping;
  s.environment = t;
  if (q.has('hdri')) s.background = t;
});
const l = new GLTFLoader();
l.setMeshoptDecoder(MeshoptDecoder);
l.load(q.get('m') ?? 'models/_teste.glb', (g) => {
  const o = g.scene;
  o.rotation.y = Number(q.get('yaw') ?? 0);
  o.traverse((m) => {
    const me = m as THREE.Mesh;
    if (!me.isMesh) return;
    me.castShadow = true;
    const mt = me.material as THREE.MeshStandardMaterial;
    const fino = /hair|bob|eyebrow|eyelash|long|short|braid|bun|ponytail|afro/i.test(mt.name);
    mt.transparent = false;
    mt.depthWrite = true;
    mt.alphaTest = fino ? 0.45 : 0;
    if (fino) mt.alphaToCoverage = true;
    mt.metalness = 0;
    mt.roughness = /body|skin/i.test(mt.name) ? 0.55 : /eye|high-poly/i.test(mt.name) ? 0.15 : 0.88;
  });
  s.add(o);
  const box = new THREE.Box3().setFromObject(o);
  const c = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3()).length();
  const d = Number(q.get('dist') ?? size * 1.2);
  const ca = Number(q.get('cam') ?? 0.5);
  cam.position.set(c.x + Math.sin(ca) * d, c.y + d * 0.25, c.z + Math.cos(ca) * d);
  if (q.has('ty')) c.y = Number(q.get('ty'));
  cam.position.y = c.y + Number(q.get('cy') ?? d * 0.25);
  cam.lookAt(c);
  const mixer = new THREE.AnimationMixer(o);
  const clip = g.animations.find((a) => a.name === q.get('clip'));
  if (clip) {
    const a = mixer.clipAction(clip).play();
    a.time = Number(q.get('t') ?? 0) * clip.duration;
    mixer.update(0);
  }
  info.textContent = `${g.animations.map((a) => a.name + ':' + a.duration.toFixed(2)).join(' ')} | ${JSON.stringify(box.min.toArray().map((v) => +v.toFixed(2)))} ${JSON.stringify(box.max.toArray().map((v) => +v.toFixed(2)))}`;
  r.render(s, cam);
  (window as any).pronto = true;
});
