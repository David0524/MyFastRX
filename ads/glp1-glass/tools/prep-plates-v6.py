#!/usr/bin/env python3
"""v6 product plates from the ChatGPT cut-outs in plates/src/*_chatgpt.png -> plates/{rx_clipboard,ship_box_v6,twine_v6}.png.
The cut-outs carry a faint low-alpha haze around the object (a baked glow/shadow); keep only the object: a mask of its solid
pixels, grown a few px and feathered, limits the alpha. Then crop to the object with a small margin."""
import numpy as np
from PIL import Image, ImageFilter
def clean(src, dst, solid=160, grow=4, pad=8):
    im = Image.open(src).convert('RGBA'); a = np.array(im); al = a[..., 3].astype(np.float32)
    m = Image.fromarray(((al > solid) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(2 * grow + 1)).filter(ImageFilter.GaussianBlur(1.2))
    al = np.minimum(al, np.array(m, np.float32)); al[al < 24] = 0
    a[..., 3] = al.astype(np.uint8); out = Image.fromarray(a); x0, y0, x1, y1 = out.getbbox()
    out.crop((max(0, x0 - pad), max(0, y0 - pad), min(out.width, x1 + pad), min(out.height, y1 + pad))).save(dst)
    print(dst, out.getbbox())
clean('plates/src/rx_clipboard_chatgpt.png', 'plates/rx_clipboard.png')
clean('plates/src/ship_box_chatgpt.png', 'plates/ship_box_v6.png')
clean('plates/src/twine_chatgpt.png', 'plates/twine_v6.png', solid=120, grow=2, pad=2)
