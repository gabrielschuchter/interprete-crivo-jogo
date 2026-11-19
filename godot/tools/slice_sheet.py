"""Slice a sprite sheet into N registered, white-keyed frames.

Each figure is extracted as a whole connected blob (body + cape + hand + legs),
so nothing gets cut by a fixed column slice. Frames are placed on one fixed
square canvas at ONE shared scale, registered by the head's x-center and the
boots' baseline (the cape/arms swing but the body stays put -> no drift). The
shared scale + anchor are sized so the WIDEST extent across all frames still
fits inside the canvas -> nothing is ever cropped.

Usage:
  py tools/slice_sheet.py --src <sheet.png> --out assets/knight_right_ \
     --frames 4 [--rows 2] [--flip] --target-h 600 --canvas 900
"""
import argparse
import numpy as np
from PIL import Image


def white_key(rgb, thresh=235, spread=18):
    r, g, b = rgb[..., 0].astype(int), rgb[..., 1].astype(int), rgb[..., 2].astype(int)
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    bg = (r >= thresh) & (g >= thresh) & (b >= thresh) & ((mx - mn) <= spread)
    return ~bg  # True = foreground


def erode1(mask):
    m = mask.copy()
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        m &= np.roll(mask, (dy, dx), (0, 1))
    return m


def components(mask, min_area_frac=0.15):
    """Label all 4-connected components; keep the big ones (the figures).

    Returns list of dicts: {mask, bbox=(x0,y0,x1,y1), cx, cy, area}.
    Small bits (loose daggers, ink specks) are dropped via the area filter.
    """
    H, W = mask.shape
    visited = np.zeros((H, W), bool)
    comps = []
    ys, xs = np.where(mask)
    for sy, sx in zip(ys.tolist(), xs.tolist()):
        if visited[sy, sx]:
            continue
        stack = [(sy, sx)]
        visited[sy, sx] = True
        pts = []
        while stack:
            y, x = stack.pop()
            pts.append((y, x))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < H and 0 <= nx < W and mask[ny, nx] and not visited[ny, nx]:
                    visited[ny, nx] = True
                    stack.append((ny, nx))
        comps.append(np.array(pts))
    if not comps:
        return []
    mx = max(len(c) for c in comps)
    out = []
    for c in comps:
        if len(c) < min_area_frac * mx:
            continue
        y, x = c[:, 0], c[:, 1]
        m = np.zeros((H, W), bool)
        m[y, x] = True
        out.append(
            {
                "mask": m,
                "bbox": (int(x.min()), int(y.min()), int(x.max()), int(y.max())),
                "cx": float(x.mean()),
                "cy": float(y.mean()),
                "area": len(c),
            }
        )
    return out


def anchors(comp):
    """Head x-center and boot y-baseline (local to the figure bbox)."""
    x0, y0, x1, y1 = comp["bbox"]
    m = comp["mask"][y0 : y1 + 1, x0 : x1 + 1]
    ch, cw = m.shape
    head_rows = m[: max(1, int(ch * 0.20))]
    hxs = np.where(head_rows.any(axis=0))[0]
    head_cx = (hxs[0] + hxs[-1]) / 2.0 if len(hxs) else (cw - 1) / 2.0
    bx0, bx1 = int(cw * 0.30), max(int(cw * 0.30) + 1, int(cw * 0.80))
    band = m[:, bx0:bx1]
    brows = np.where(band.any(axis=1))[0]
    boot_y = float(brows[-1]) if len(brows) else ch - 1.0
    return head_cx, boot_y


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True)
    ap.add_argument("--out", required=True, help="prefix -> _0.png ... ; exact .png if --frames 1")
    ap.add_argument("--frames", type=int, default=4)
    ap.add_argument("--rows", type=int, default=1)
    ap.add_argument("--canvas", type=int, default=900)
    ap.add_argument("--pad", type=int, default=40)
    ap.add_argument("--thresh", type=int, default=235)
    ap.add_argument("--target-h", type=int, default=0, dest="target_h",
                    help="character content HEIGHT in px (consistent across sheets). 0 = fit.")
    ap.add_argument("--flip", action="store_true")
    args = ap.parse_args()

    img = Image.open(args.src).convert("RGB")
    if args.flip:
        img = img.transpose(Image.FLIP_LEFT_RIGHT)
    rgb = np.asarray(img)
    H, W = rgb.shape[:2]
    fg = erode1(white_key(rgb, args.thresh))

    comps = components(fg)
    comps.sort(key=lambda c: -c["area"])
    comps = comps[: args.frames]
    # reading order: group into rows by y-center, then left-to-right within a row
    if args.rows > 1:
        comps.sort(key=lambda c: c["cy"])
        per = max(1, args.frames // args.rows)
        ordered = []
        for r in range(args.rows):
            band = comps[r * per : (r + 1) * per]
            band.sort(key=lambda c: c["cx"])
            ordered += band
        comps = ordered
    else:
        comps.sort(key=lambda c: c["cx"])
    print(f"figures found/used = {len(comps)}")

    # per-figure geometry
    figs = []
    for c in comps:
        x0, y0, x1, y1 = c["bbox"]
        hcx, by = anchors(c)
        figs.append({"comp": c, "cw": x1 - x0 + 1, "ch": y1 - y0 + 1, "hcx": hcx, "by": by})

    # ONE shared scale + anchor, sized so the widest/tallest extent fits the canvas
    avail = args.canvas - args.pad * 2
    leftE = max(f["hcx"] for f in figs)
    rightE = max(f["cw"] - f["hcx"] for f in figs)
    topE = max(f["by"] for f in figs)
    botE = max(f["ch"] - f["by"] for f in figs)
    base = (args.target_h / max(f["ch"] for f in figs)) if args.target_h > 0 else 1.0
    scale = min(base, avail / (leftE + rightE), avail / (topE + botE))
    # center the figure group horizontally (union of all frames), keep boots on a
    # common baseline vertically. Sized above so nothing overflows the canvas.
    union_w = (leftE + rightE) * scale
    head_x = (args.canvas - union_w) / 2.0 + leftE * scale
    boot_y = args.canvas - args.pad - botE * scale

    for i, f in enumerate(figs):
        c = f["comp"]
        x0, y0, x1, y1 = c["bbox"]
        cw, ch = f["cw"], f["ch"]
        # figure-only RGBA (mask out any neighbor pixels overlapping the bbox)
        sub = rgb[y0 : y1 + 1, x0 : x1 + 1]
        a = np.where(c["mask"][y0 : y1 + 1, x0 : x1 + 1], 255, 0).astype(np.uint8)
        rgba = np.dstack([sub, a])
        dw, dh = max(1, round(cw * scale)), max(1, round(ch * scale))
        crop = Image.fromarray(rgba, "RGBA").resize((dw, dh), Image.LANCZOS)
        canvas = Image.new("RGBA", (args.canvas, args.canvas), (0, 0, 0, 0))
        ox = round(head_x - f["hcx"] * scale)
        oy = round(boot_y - f["by"] * scale)
        canvas.alpha_composite(crop, (ox, oy))
        out = args.out if (args.frames == 1 and args.out.endswith(".png")) else f"{args.out}{i}.png"
        canvas.save(out)
        print(f"OK {out}  fig={cw}x{ch}  scale={scale:.3f}  ox={ox} oy={oy}")


if __name__ == "__main__":
    main()
