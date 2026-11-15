const jfxr = require('/tmp/scav/jfxr/lib/index.js');
const fs = require('fs');
const preset = jfxr.ALL_PRESETS.find(p => p.name === 'Hit/hurt');
const snd = new jfxr.Sound(); preset.applyTo(snd);
// ajuste para pancada grave de pedra/metal: onda ruído, queda de frequência, passa-baixa
const set = (k, v) => { snd[k].value = v; };
set('waveform', 'brownnoise'); set('frequency', 220); set('frequencySweep', -300); set('lowPassCutoff', 1800); set('attack', 0); set('sustain', 0.06); set('decay', 0.28);
console.log('params:', ['waveform','frequency','sustain','decay'].map(k=>k+'='+snd[k].value).join(' '));
const synth = new jfxr.Synth(snd.serialize());
const t0 = performance.now();
synth.run(function(clip){
  const f = clip.toFloat32Array();
  console.log('run:', (performance.now()-t0).toFixed(1)+' ms; sr', clip.sampleRate, 'dur', (f.length/clip.sampleRate).toFixed(2)+'s');
  const pcm = Buffer.alloc(44 + f.length*2);
  pcm.write('RIFF',0); pcm.writeUInt32LE(36+f.length*2,4); pcm.write('WAVEfmt ',8); pcm.writeUInt32LE(16,16); pcm.writeUInt16LE(1,20); pcm.writeUInt16LE(1,22); pcm.writeUInt32LE(clip.sampleRate,24); pcm.writeUInt32LE(clip.sampleRate*2,28); pcm.writeUInt16LE(2,32); pcm.writeUInt16LE(16,34); pcm.write('data',36); pcm.writeUInt32LE(f.length*2,40);
  for (let i=0;i<f.length;i++) pcm.writeInt16LE(Math.max(-1,Math.min(1,f[i]))*32767, 44+i*2);
  fs.writeFileSync('impacto-pedra.wav', pcm); console.log('wav', pcm.length, 'bytes; pico', f.reduce((m,x)=>Math.max(m,Math.abs(x)),0).toFixed(2));
});
