import * as THREE from 'three';
import { BatchedRenderer, ParticleSystem, ConstantValue, IntervalValue, ConstantColor, PointEmitter, RenderMode, SizeOverLife, PiecewiseBezier, Bezier, ColorOverLife, ApplyForce } from 'three.quarks';
const batch = new BatchedRenderer();
const ps = new ParticleSystem({ duration: 1, looping: true, startLife: new IntervalValue(0.4, 0.8), startSpeed: new IntervalValue(2, 5), startSize: new IntervalValue(0.05, 0.15), startColor: new ConstantColor(new THREE.Vector4(1, 0.6, 0.2, 1)), worldSpace: true, maxParticle: 200, emissionOverTime: new ConstantValue(80), shape: new PointEmitter(), material: new THREE.MeshBasicMaterial({ transparent: true }), renderMode: RenderMode.BillBoard, behaviors: [new SizeOverLife(new PiecewiseBezier([[new Bezier(1, 0.5, 0.2, 0), 0]])), new ApplyForce(new THREE.Vector3(0, -9.8, 0), new ConstantValue(1))] });
batch.addSystem(ps);
const scene = new THREE.Scene(); scene.add(batch); scene.add(ps.emitter);
const t0 = performance.now(); for (let i = 0; i < 600; i++) batch.update(1/60);
console.log('three@' + THREE.REVISION, 'ok; 600 quadros de update em', (performance.now() - t0).toFixed(1), 'ms; partículas vivas:', ps.particleNum);
