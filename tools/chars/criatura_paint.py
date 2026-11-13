# Tecido de espectro (compartilhado entre criatura.py e build.py).
import math
import numpy as np
import paint


def sm(t):
    t = max(0.0, min(1.0, t)); return t * t * (3 - 2 * t)


def paint_shroud(AT, key, col='5a5866', vein='8a8aa0', seed=3):
    """tecido de espectro: mármore frio de veios largos, rasgos escuros, barra apodrecida (v=0 barra)"""
    A = AT.view(key); h, w, _ = A.shape
    rng = AT.rng
    t = paint.fbm(rng, h, w, base=4, oct=4)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    v = 1 - yy / max(h - 1, 1); u = xx / max(w - 1, 1)
    veins = np.abs(np.sin((u * 9 + t * 2.5) * math.pi))  # rasgos verticais, não mármore
    lum = 0.55 + 0.35 * (1 - veins) ** 4 + (t - 0.5) * 0.3
    streak = paint.value_noise(rng, 1, w, w // 4)[0][None, :]
    lum *= 0.85 + 0.3 * streak
    vv = np.clip(v * 1.6, 0, 1)
    lum *= 0.5 + 0.5 * vv * vv * (3 - 2 * vv)  # barra mais escura
    rgb = paint.hexrgb(col)[None, None] * lum[..., None]
    rgb = rgb * (1 - 0.35 * (1 - veins[..., None]) ** 6) + paint.hexrgb(vein)[None, None] * 0.35 * (1 - veins[..., None]) ** 6
    holes = paint.fbm(rng, h, w, base=7, oct=3) > 0.7
    rgb[holes & (v < 0.6)] *= 0.25
    A[:] = np.clip(rgb, 0, 1)


