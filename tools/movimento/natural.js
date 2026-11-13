// instalado na página: velocidade natural de cada clipe de locomoção (m/s), medida pelo pé de apoio
window.NATURAL = (fig, names) => {
  const e = fig.ext; const V = fig.root.position.constructor;
  const scene = e.mixer.getRoot();
  const L = scene.getObjectByName('LeftFoot'), R = scene.getObjectByName('RightFoot');
  const out = {};
  for (const n of names) {
    const a = e.clips.get(n); if (!a) continue;
    e.mixer.stopAllAction();
    a.reset(); a.setEffectiveWeight(1); a.setEffectiveTimeScale(1); a.play();
    const dur = a.getClip().duration; const dt = 1 / 120;
    let prev = null; let acc = 0, n2 = 0; let minY = 9; const ys = [];
    const pos = [];
    for (let t = 0; t < dur; t += dt) {
      e.mixer.setTime(t);
      scene.updateWorldMatrix(true, true);
      const a1 = new V().setFromMatrixPosition(L.matrixWorld); const b1 = new V().setFromMatrixPosition(R.matrixWorld);
      fig.root.worldToLocal(a1); fig.root.worldToLocal(b1);
      pos.push([a1, b1]);
      minY = Math.min(minY, a1.y, b1.y);
    }
    for (let i = 1; i < pos.length; i++) {
      for (const k of [0, 1]) {
        const c = pos[i][k], p = pos[i - 1][k];
        if (c.y < minY + 0.03 && p.y < minY + 0.03) { acc += (p.z - c.z) / dt; n2++; }
      }
    }
    out[n] = { nat: +(acc / Math.max(1, n2)).toFixed(2), dur: +dur.toFixed(2), amostras: n2 };
  }
  e.mixer.stopAllAction(); e.cur = '';
  return out;
};
