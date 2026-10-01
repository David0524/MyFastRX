# Cut the client's glass heartbeat render (images/heartbeat_glass_src.png, unaltered) off its studio background into an
# RGBA plate (images/heartbeat_glass.png) for the v5 film, keeping its soft blue shadow and the white rim highlights.
#   python3 tools/prep-heartbeat.py
# Difference matte: the background is a smooth light gradient, so it is modelled by a 2D quadratic fitted to the pixels
# far from the tube; alpha = how far a pixel departs from that model, colour = un-mixed from it (so composited back on
# a similar light background the plate reproduces the photo, and the grid shows through its shadow).
import json, os
import numpy as np
from PIL import Image
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'images')
I = np.asarray(Image.open(os.path.join(D, 'heartbeat_glass_src.png')).convert('RGB')).astype(np.float64)
h, w, _ = I.shape
yy, xx = np.mgrid[0:h, 0:w]; X, Y = xx / w, yy / h
blue = I[..., 2] - I[..., 0]
bgm = (blue < 10) & (I.mean(-1) > 225)
# keep only background samples well away from the tube (dilate the non-background region by ~40 px, cheaply)
far = ~bgm
for _ in range(40):
    far = far | np.roll(far, 1, 0) | np.roll(far, -1, 0) | np.roll(far, 1, 1) | np.roll(far, -1, 1)
s = ~far
A = np.stack([np.ones(s.sum()), X[s], Y[s], X[s] ** 2, Y[s] ** 2, X[s] * Y[s]], 1)
F = np.stack([np.ones_like(X), X, Y, X ** 2, Y ** 2, X * Y], -1)
B = np.stack([F @ np.linalg.lstsq(A, I[..., c][s], rcond=None)[0] for c in range(3)], -1)
diff = np.abs(I - B).max(-1)
alpha = np.clip((diff - 3) / 55, 0, 1)
col = np.where(alpha[..., None] > 1e-3, (I - (1 - alpha[..., None]) * B) / np.maximum(alpha[..., None], 1e-3), 0)
rgba = np.dstack([np.clip(col, 0, 255), alpha * 255]).astype(np.uint8)
print('bg residual (|I-B| max over channels) on background samples: p50/p99 =', np.percentile(diff[s], [50, 99]).round(1))
ys, xs = np.where(alpha > .06)
x0, x1, y0, y1 = max(0, xs.min() - 6), min(w, xs.max() + 7), max(0, ys.min() - 6), min(h, ys.max() + 7)
Image.fromarray(rgba[y0:y1, x0:x1], 'RGBA').save(os.path.join(D, 'heartbeat_glass.png'))
# geometry for the animation (plate px): the flat line's centre height, the tube's ends, the spike's span
core = blue > 190
rows = np.where(core[:, 150:400].any(1))[0]
base = float((rows.min() + rows.max()) / 2) - y0
cols = np.where(core.any(0))[0]
meta = {'size': [int(x1 - x0), int(y1 - y0)], 'baseline': round(float(base), 1), 'tube': [int(cols.min() - x0), int(cols.max() - x0)],
        'thickness': int(rows.max() - rows.min() + 1), 'offset': [int(x0), int(y0)],
        # the tube's centreline (plate px), traced from the source render: flat, small dip, spike, deep dip, flat
        'path': [[int(px - x0), int(py - y0)] for px, py in [[135, 520], [528, 520], [612, 556], [764, 262], [884, 690], [968, 506], [1400, 506]]],
        'bg_model_rgb_center': [round(v) for v in B[h // 2, w // 2]]}
json.dump(meta, open(os.path.join(D, 'heartbeat_glass.json'), 'w'), indent=1)
print(meta)
