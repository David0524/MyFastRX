# Cut the supplied photo plates (plates/src/*.png) into clean RGBA plates (plates/*.png), cropped to the object.
#  - files with real transparency: cropped to their alpha bounds
#  - files with a baked-in checkerboard (the tool could not export transparency): the object is found by colour
#    (warm / dark vs the neutral checker), then masked with a clean rounded rectangle (tag, card, box) or a feathered
#    colour mask (twine)
#   python3 tools/prep-plates.py
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

S = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'plates', 'src')
O = os.path.join(S, '..')


def save(name, rgba):
    a = np.asarray(rgba)[..., 3]
    ys, xs = np.where(a > 8)
    box = (max(0, xs.min() - 2), max(0, ys.min() - 2), min(rgba.width, xs.max() + 3), min(rgba.height, ys.max() + 3))
    c = rgba.crop(box)
    c.save(os.path.join(O, name + '.png'))
    print(name, c.size)


for n in ['vial_lying', 'vial_lying_blank', 'notepad', 'card_blank', 'rx_pad']:
    save(n, Image.open(os.path.join(S, n + '.png')).convert('RGBA'))


def bounds(a, thr=.3):
    r, g, b = [a[..., i].astype(int) for i in range(3)]
    obj = ((r - b) >= 4) | ((r + g + b) / 3 < 200)
    ys = np.where(obj.mean(1) > thr)[0]
    xs = np.where(obj.mean(0) > thr)[0]
    return xs.min(), ys.min(), xs.max(), ys.max()


def rounded(name, radius, inset=1):
    im = Image.open(os.path.join(S, name + '.png')).convert('RGB')
    x0, y0, x1, y1 = bounds(np.asarray(im))
    k = 4   # supersampled mask for a smooth edge
    m = Image.new('L', (im.width * k, im.height * k), 0)
    ImageDraw.Draw(m).rounded_rectangle(((x0 + inset) * k, (y0 + inset) * k, (x1 - inset + 1) * k, (y1 - inset + 1) * k), radius * k, fill=255)
    out = im.convert('RGBA')
    m = m.resize(im.size, Image.LANCZOS)
    if name == 'price_tag':   # the eyelet's hole: the neutral checker seen through it becomes transparent (the table shows)
        a = np.asarray(im).astype(int); ma = np.asarray(m).copy()
        cx, cy, R = x0 + 70, y0 + 66, 44
        yy, xx = np.mgrid[0:im.height, 0:im.width]
        near = (xx - cx) ** 2 + (yy - cy) ** 2 < R ** 2
        chk = near & (np.abs(a[..., 0] - a[..., 2]) < 4) & (a.mean(-1) > 226)
        ys, xs = np.where(chk); hx, hy = xs.mean(), ys.mean(); hr = np.sqrt(chk.sum() / np.pi)
        hole = Image.new('L', (im.width * 4, im.height * 4), 0)
        ImageDraw.Draw(hole).ellipse(((hx - hr - .5) * 4, (hy - hr - .5) * 4, (hx + hr + .5) * 4, (hy + hr + .5) * 4), fill=255)
        hole = np.asarray(hole.resize(im.size, Image.LANCZOS)).astype(int)
        m = Image.fromarray(np.clip(ma.astype(int) - hole, 0, 255).astype(np.uint8))
        print('eyelet hole', round(hx), round(hy), round(hr, 1))
    out.putalpha(m)
    save(name, out)


rounded('price_tag', 30, inset=3)
rounded('member_card', 28, inset=3)
rounded('ship_box', 5, inset=4)

# twine: colour mask, closed and feathered, limited to its band
im = Image.open(os.path.join(S, 'twine.png')).convert('RGB')
a = np.asarray(im).astype(int)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
m = ((((r - b) >= 8) | ((r + g + b) / 3 < 215)) * 255).astype(np.uint8)
band = np.zeros_like(m)
band[440:580, 90:1450] = 1
mi = Image.fromarray(m * band).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(.8))
out = im.convert('RGBA')
out.putalpha(mi)
save('twine', out)

for n in ['table_top', 'room_back']:
    Image.open(os.path.join(S, n + '.png')).convert('RGB').save(os.path.join(O, n + '.jpg'), quality=95)
    print(n, 'jpg')

# table tile: rows 0..705 (two boards; the seam at 703-704 lands on the wrap), the photo's left-to-right light falloff
# flattened, and the ends cross-faded along the grain so it repeats without a visible join
t = np.asarray(Image.open(os.path.join(S, 'table_top.png')).convert('RGB')).astype(float)[0:705]
col = t.mean(axis=(0, 2))
k = 301; pad = np.pad(col, (k // 2, k // 2), mode='edge'); smooth = np.convolve(pad, np.ones(k) / k, mode='valid')
t = t * (smooth.mean() / smooth)[None, :, None]
OV = 240; L = t.shape[1] - OV
w = (np.arange(OV) / OV)[None, :, None]
tile = t[:, :L].copy()
tile[:, :OV] = t[:, L:L + OV] * (1 - w) + t[:, :OV] * w
Image.fromarray(np.clip(tile, 0, 255).astype(np.uint8)).save(os.path.join(O, 'table_tile.jpg'), quality=95)
print('table_tile', tile.shape[1], 'x', tile.shape[0], '(grain along x; one tile = 2 boards)')
