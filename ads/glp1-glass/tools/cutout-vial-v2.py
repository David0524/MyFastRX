#!/usr/bin/env python3
"""The client's new vial (images/vial_semaglutide_v2.png, white backdrop) -> images/vial_semaglutide_v2_cutout.png (RGBA,
cropped to the vial). Pixels are never edited: only an alpha is added. The backdrop is the near-white region connected
to the image border (flood fill), so the clear glass, which is enclosed by the vial's outline, stays opaque and keeps
its own photographed look; place it on a light background (the brand off-white)."""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
src = Image.open('images/vial_semaglutide_v2.png').convert('RGB')
a = np.array(src).astype(int); h, w = a.shape[:2]
light = (a.min(axis=2) >= 244).astype(np.uint8) * 255          # candidate backdrop
cand = light > 0
bg = np.zeros_like(cand); bg[0, :] = cand[0, :]; bg[-1, :] = cand[-1, :]; bg[:, 0] |= cand[:, 0]; bg[:, -1] |= cand[:, -1]
while True:                                                       # grow the border seed through the light pixels
    g = bg.copy(); g[1:] |= bg[:-1]; g[:-1] |= bg[1:]; g[:, 1:] |= bg[:, :-1]; g[:, :-1] |= bg[:, 1:]; g &= cand
    if (g == bg).all(): break
    bg = g

alpha = Image.fromarray(np.where(bg, 0, 255).astype(np.uint8), 'L').filter(ImageFilter.GaussianBlur(0.7))
out = src.convert('RGBA'); out.putalpha(alpha)
box = alpha.point(lambda v: 255 if v > 10 else 0).getbbox(); out = out.crop(box)
out.save('images/vial_semaglutide_v2_cutout.png')
print('crop box', box, 'size', out.size)
