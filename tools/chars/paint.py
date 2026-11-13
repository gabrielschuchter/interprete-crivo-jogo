# Pintura procedural de texturas na linguagem PS2 "Luz de estudo": tecido granulado, dobras verticais escuras,
# barra gasta, bordado de faixa em dourado velho, sujeira na barra, sem mapa normal. Trabalha em numpy (linear 0..1 sRGB).
import math
import numpy as np


def hexrgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)], np.float32)


class Atlas:
    """atlas quadrado com empacotamento em prateleiras"""

    def __init__(self, size=512, seed=1):
        self.size = size
        self.px = np.zeros((size, size, 3), np.float32)
        self.px[:] = 0.08
        self.cells = {}
        self.x = self.y = self.row = 0
        self.rng = np.random.default_rng(seed)

    def alloc(self, key, w, h):
        if key in self.cells: return self.cells[key]
        if self.x + w > self.size:
            self.x = 0; self.y += self.row; self.row = 0
        if self.y + h > self.size:
            raise RuntimeError('atlas cheio: ' + key)
        r = (self.x, self.y, w, h)
        self.cells[key] = r
        self.x += w; self.row = max(self.row, h)
        return r

    def uv_map(self, key, u, v):
        """(u,v) local 0..1 -> uv global do glTF/Blender (v para cima). meio texel de margem."""
        x, y, w, h = self.cells[key]
        S = self.size
        mu = 1.0 / w; mv = 1.0 / h
        uu = (x + (mu + u * (1 - 2 * mu)) * w) / S
        vv = 1 - (y + (1 - (mv + v * (1 - 2 * mv))) * h) / S
        return uu, vv

    def view(self, key):
        x, y, w, h = self.cells[key]
        return self.px[y:y + h, x:x + w]


def value_noise(rng, h, w, n):
    g = rng.random((n + 1, n + 1)).astype(np.float32)
    ys = np.linspace(0, n, h, endpoint=False); xs = np.linspace(0, n, w, endpoint=False)
    y0 = ys.astype(int); x0 = xs.astype(int)
    fy = (ys - y0)[:, None]; fx = (xs - x0)[None, :]
    fy = fy * fy * (3 - 2 * fy); fx = fx * fx * (3 - 2 * fx)
    a = g[y0][:, x0]; b = g[y0][:, x0 + 1]; c = g[y0 + 1][:, x0]; d = g[y0 + 1][:, x0 + 1]
    return a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy


def fbm(rng, h, w, base=4, oct=4):
    t = np.zeros((h, w), np.float32); amp = 1; s = 0
    for o in range(oct):
        t += value_noise(rng, h, w, base * 2 ** o) * amp; s += amp; amp *= 0.5
    return t / s


def blur(a, k=1):
    for _ in range(k):
        a = (a * 4 + np.roll(a, 1, 0) + np.roll(a, -1, 0) + np.roll(a, 1, 1) + np.roll(a, -1, 1)) / 8
    return a


def motif(kind, h, w, scale=1.0):
    """máscara 0..1 de um motivo repetido para faixas bordadas"""
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    p = max(4, int(h * 1.6 * scale))
    u = (xx % p) / p; v = yy / max(h - 1, 1)
    if kind == 'cruz':      # cruzeta ficcional do Interprete (círculo com mira)
        cx, cy = u - 0.5, v - 0.5
        r = np.sqrt(cx ** 2 + (cy * 1.0) ** 2)
        m = (np.abs(r - 0.28) < 0.07) | ((np.abs(cx) < 0.04) & (np.abs(cy) < 0.42)) | ((np.abs(cy) < 0.04) & (np.abs(cx) < 0.42))
    elif kind == 'losango':
        m = (np.abs(u - 0.5) + np.abs(v - 0.5)) < 0.32
        m &= ~((np.abs(u - 0.5) + np.abs(v - 0.5)) < 0.18)
    elif kind == 'arco':    # arcos góticos em fila
        cx = (u - 0.5) * 2
        arch = (v < 0.75) & (np.abs(cx) > 0.6) | ((v >= 0.55) & (np.abs(np.sqrt((np.abs(cx) + 0.6) ** 2 + ((v - 0.55) * 2.2) ** 2) - 1.25) < 0.16))
        m = arch
    elif kind == 'fungo':
        cx, cy = u - 0.5, v - 0.35
        m = ((cx ** 2 / 0.12 + (cy - 0.25) ** 2 / 0.03) < 1) & (cy > 0.12) | ((np.abs(cx) < 0.05) & (cy < 0.2) & (cy > -0.3))
    else:                   # listras
        m = (np.abs(v - 0.5) < 0.18)
    edge = (v < 0.1) | (v > 0.9)
    return np.clip(m.astype(np.float32) + edge * 0.85, 0, 1)


def paint_cloth(atlas, key, col, kind='la', trim=None, trim_w=0.06, motif_kind=None, folds=0.55, grime=0.5,
                hem_ragged=False, top_dark=0.15, stripes=None, patches=0, seams=True, emboss=None, grime_col=None):
    """pinta uma célula de tecido. v=0 é a barra (base da peça), v=1 o topo."""
    A = atlas.view(key)
    h, w, _ = A.shape
    rng = atlas.rng
    base = hexrgb(col)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    v = 1 - yy / max(h - 1, 1); u = xx / max(w - 1, 1)
    grain_f = {'la': (h // 2, 2), 'linho': (h, 1), 'couro': (h // 3, 3), 'veludo': (h // 4, 3), 'brocado': (h // 2, 2)}.get(kind, (h // 2, 2))
    g = fbm(rng, h, w, base=6, oct=4)
    fine = rng.random((h, w)).astype(np.float32)
    fine = blur(fine, 1)
    lum = 0.82 + (g - 0.5) * 0.35 + (fine - 0.5) * (0.22 if kind != 'couro' else 0.12)
    if kind in ('la', 'linho'):
        # trama: linhas finas cruzadas
        lum *= 1 - 0.06 * ((yy.astype(int) % 2) == 0) - 0.04 * ((xx.astype(int) % 3) == 0)
    if kind == 'couro':
        cr = fbm(rng, h, w, base=10, oct=3)
        lum *= 0.9 + 0.25 * (cr > 0.62) - 0.18 * (np.abs(cr - 0.5) < 0.02)
    if kind == 'veludo':
        lum *= 0.85 + 0.3 * blur(fbm(rng, h, w, base=3, oct=2), 2)
    if kind == 'brocado':
        lum *= 0.92 + 0.12 * motif('losango', h, w, scale=0.25)
    # dobras verticais: senoides com ruído, mais fortes perto da barra
    if folds:
        ph = fbm(rng, 1, w, base=5, oct=2)[0] * 6
        nf = rng.integers(5, 9)
        fold = np.sin((u * nf + ph * 0.25) * math.tau + g * 2.0)
        fold = np.sign(fold) * np.abs(fold) ** 0.6
        k = folds * (0.35 + 0.65 * (1 - v) ** 1.2)
        lum *= 1 + fold * 0.22 * k
    # topo mais escuro (oclusão sob gola / cinto), barra gasta
    lum *= 1 - top_dark * np.clip((v - 0.85) / 0.15, 0, 1)
    if grime:
        gr = np.clip((0.22 - v) / 0.22, 0, 1) ** 1.4 * (0.6 + 0.4 * g)
        if grime_col is None: lum *= 1 - grime * 0.55 * gr
    rgb = base[None, None, :] * lum[:, :, None]
    if grime and grime_col is not None:
        k_ = (grime * gr)[:, :, None]
        rgb = rgb * (1 - k_) + hexrgb(grime_col)[None, None, :] * (0.8 + 0.3 * fine[:, :, None]) * k_
    if stripes:
        sc, sw, sn = stripes  # cor, largura relativa, número
        sm = (np.abs(((u * sn) % 1) - 0.5) < sw / 2).astype(np.float32)
        rgb = rgb * (1 - sm[:, :, None] * 0.6) + hexrgb(sc)[None, None, :] * lum[:, :, None] * sm[:, :, None] * 0.6
    for _ in range(patches):
        cx, cy = rng.random() * w, rng.random() * h * 0.7 + h * 0.1
        rx, ry = rng.integers(4, max(5, w // 8)), rng.integers(4, max(5, h // 10))
        m = (np.abs(xx - cx) < rx) & (np.abs(yy - cy) < ry)
        rgb[m] *= np.array([0.86, 0.82, 0.78], np.float32)
        edge = m & ((np.abs(np.abs(xx - cx) - rx) < 1) | (np.abs(np.abs(yy - cy) - ry) < 1))
        rgb[edge] *= 0.6
    if trim:
        tc = hexrgb(trim)
        tw = trim_w
        band = (v < tw).astype(np.float32)
        if motif_kind:
            bh = max(4, int(h * tw))
            mm = np.zeros((h, w), np.float32)
            mm[h - bh:, :] = motif(motif_kind, bh, w)
            band = band * (0.35 + 0.65 * mm)
        band = blur(band, 1)
        shade = 0.75 + 0.35 * fine
        rgb = rgb * (1 - band[:, :, None]) + (tc[None, None, :] * shade[:, :, None]) * band[:, :, None]
    if emboss:  # símbolo central (ex.: cruz da enfermeira, cruzeta) em u,v
        ec, eu, ev, es, ek = emboss
        bh = max(6, int(h * es)); bw = bh
        y0 = int((1 - ev) * h) - bh // 2; x0 = int(eu * w) - bw // 2
        if 0 <= y0 and y0 + bh <= h and 0 <= x0 and x0 + bw <= w:
            mm = motif(ek, bh, bw, scale=1 / 1.6)
            mm = np.clip(mm - ((np.mgrid[0:bh, 0:bw][0] < bh * 0.1) | (np.mgrid[0:bh, 0:bw][0] > bh * 0.9)) * 0.85, 0, 1)
            sub = rgb[y0:y0 + bh, x0:x0 + bw]
            rgb[y0:y0 + bh, x0:x0 + bw] = sub * (1 - mm[:, :, None]) + hexrgb(ec)[None, None, :] * mm[:, :, None]
    if seams:
        s = (np.abs(u - 0.5) < 0.5 / w * 1.2) | (u < 1.0 / w) | (u > 1 - 1.0 / w)
        rgb[s] *= 0.72
    A[:] = np.clip(rgb, 0, 1)


def paint_metal(atlas, key, col='8a6a3a', rust=0.3):
    A = atlas.view(key); h, w, _ = A.shape
    rng = atlas.rng
    g = fbm(rng, h, w, base=4, oct=3)
    yy = np.mgrid[0:h, 0:w][0] / max(h - 1, 1)
    lum = 0.55 + 0.6 * (1 - yy) ** 0.7 * (0.7 + 0.3 * g)
    rgb = hexrgb(col)[None, None, :] * lum[:, :, None]
    r = (fbm(rng, h, w, base=8, oct=3) > 1 - rust * 0.6)
    rgb[r] = rgb[r] * 0.4 + np.array([0.25, 0.14, 0.08], np.float32) * 0.6
    A[:] = np.clip(rgb, 0, 1)


def paint_flat(atlas, key, col, noise=0.12):
    A = atlas.view(key); h, w, _ = A.shape
    g = fbm(atlas.rng, h, w, base=4, oct=3)
    A[:] = np.clip(hexrgb(col)[None, None, :] * (1 + (g[:, :, None] - 0.5) * noise * 2), 0, 1)


def paint_glow(atlas, key, col='ffb35a'):
    A = atlas.view(key); h, w, _ = A.shape
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    r = np.sqrt(((xx / w) - 0.5) ** 2 + ((yy / h) - 0.55) ** 2)
    lum = np.clip(1.15 - r * 1.6, 0.35, 1.2)
    A[:] = np.clip(hexrgb(col)[None, None, :] * lum[:, :, None], 0, 1)


def paint_hair(atlas, key, col, streak=0.35):
    A = atlas.view(key); h, w, _ = A.shape
    rng = atlas.rng
    base = hexrgb(col)
    xx = np.mgrid[0:h, 0:w][1].astype(np.float32)
    yy = np.mgrid[0:h, 0:w][0].astype(np.float32)
    s = value_noise(rng, 1, w, w // 3)[0]
    s2 = value_noise(rng, 1, w, w // 7)[0]
    strands = (s * 0.6 + s2 * 0.4)[None, :].repeat(h, 0)
    wav = np.sin(yy / h * math.tau * 2 + xx / w * 9) * 0.03
    lum = 0.7 + (strands - 0.5) * streak * 2 + wav
    # faixa de brilho perto do topo (v alto = topo)
    v = 1 - yy / max(h - 1, 1)
    lum += 0.18 * np.exp(-((v - 0.72) / 0.08) ** 2) * (0.5 + strands)
    lum *= 0.75 + 0.25 * v
    A[:] = np.clip(base[None, None, :] * lum[:, :, None], 0, 1)


def ps2_grade(px, sat=0.8, contrast=1.06, levels=None):
    """grading da direção: sombras para cinza azulado, luzes para bege velho; quantização opcional (pontilhado 16 bits)"""
    rgb = px[..., :3]
    lum = rgb @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    rgb = lum[..., None] + (rgb - lum[..., None]) * sat
    t = np.clip(lum, 0, 1)[..., None]
    cold = np.array([0.88, 0.91, 1.0], np.float32); warm = np.array([1.04, 0.99, 0.9], np.float32)
    rgb = rgb * (cold * (1 - t) + warm * t)
    rgb = np.clip((rgb - 0.5) * contrast + 0.5, 0, 1)
    if levels:
        h, w = rgb.shape[:2]
        bayer = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], np.float32) / 16 - 0.5
        d = np.tile(bayer, (h // 4 + 1, w // 4 + 1))[:h, :w][..., None]
        rgb = np.clip(np.round(rgb * levels + d) / levels, 0, 1)
    px[..., :3] = rgb
    return px
