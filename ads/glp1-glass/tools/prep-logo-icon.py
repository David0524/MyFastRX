#!/usr/bin/env python3
"""The heartbeat icon from the official logo (images/logo_myfastrx_official.jpg, x 150-420) as transparent PNGs:
images/logo_icon_blue.png (its own colour, unchanged) and images/logo_icon_white.png (one-colour white, for the blue
button). The JPG's flat #F7F7F7 background is keyed out by colour distance (anti-aliased edges kept); nothing else
about the mark is altered. The wordmark itself is always drawn straight from the official file."""
import numpy as np
from PIL import Image
im = np.array(Image.open('images/logo_myfastrx_official.jpg').convert('RGB')).astype(float)
crop = im[150:395, 150:420]                       # the icon (the heartbeat line), with a margin
bg = np.array([247, 247, 247.]); d = np.linalg.norm(crop - bg, axis=2)
core = crop[d > 120]; col = np.median(core, axis=0)   # the icon's own blue
a = np.clip(d / np.linalg.norm(col - bg), 0, 1)
ys, xs = np.where(a > .02); y0, y1, x0, x1 = ys.min() - 2, ys.max() + 3, xs.min() - 2, xs.max() + 3
a = a[y0:y1, x0:x1]
for name, rgb in [('blue', col), ('white', np.array([255, 255, 255.]))]:
    out = np.zeros(a.shape + (4,), np.uint8); out[..., :3] = rgb.astype(np.uint8); out[..., 3] = (a * 255).round().astype(np.uint8)
    Image.fromarray(out, 'RGBA').save(f'images/logo_icon_{name}.png')
print('icon colour', col.round(), 'size', a.shape[::-1])
