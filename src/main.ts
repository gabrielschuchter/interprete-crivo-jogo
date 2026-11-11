import '../design/tokens.css';
import './ui/game.css';
import * as THREE from 'three';
import { Engine } from './core/engine';
import { buildAtrio } from './world/atrio';

const eng = new Engine(document.getElementById('stage') as HTMLCanvasElement);
const t0 = performance.now();
const r = buildAtrio({ flags: new Set(location.hash.slice(1).split(',')), quality: 'alta' });
console.log('build ms', performance.now() - t0);
eng.scene.add(r.root);
eng.applyEnv(r.env);
eng.setLamps(r.lamps);
const q = new URLSearchParams(location.search).get('cam')?.split(',').map(Number) ?? [0, 2.2, 21, 0, 4, 0];
eng.camera.position.set(q[0], q[1], q[2]);
eng.camera.lookAt(q[3], q[4], q[5]);
const focus = new THREE.Vector3(q[3], 0, q[5]);
import('./entities/figure').then(({ Figure }) => import('./entities/crivo').then(({ CrivoModel }) => {
  const f = new Figure({ skin: 0xd9a47c, hair: 0x3d2416, hairStyle: 'coque', coat: 0x4a1830, scarf: 0x8c1535, cape: 0x1b1a22, staff: true, satchel: true });
  f.root.position.set(0, 0, 14); f.root.rotation.y = Number(new URLSearchParams(location.search).get('ry') ?? 3.6);
  f.speed = Number(new URLSearchParams(location.search).get('sp') ?? 0);
  const act = new URLSearchParams(location.search).get('act'); if (act) { f.play(act as any); f.actionT = Number(new URLSearchParams(location.search).get('at') ?? 0.2); }
  eng.scene.add(f.root);
  const c = new CrivoModel(); c.root.position.set(1.0, 0, 14.3); c.root.rotation.y = 3.3; eng.scene.add(c.root);
  const c2 = new CrivoModel(); c2.root.position.set(-1.0, 0, 14.6); c2.root.rotation.y = 0.5; c2.mood='curioso'; eng.scene.add(c2.root);
  r.updaters.push((dt) => { if(!act) f.update(dt); c.update(dt); c2.update(dt); });
}));
let last = performance.now();
(window as any).__eng = eng;
function loop(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  for (const u of r.updaters) u(dt, eng.time);
  eng.render(dt, focus);
  (window as any).__frames = ((window as any).__frames ?? 0) + 1;
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
