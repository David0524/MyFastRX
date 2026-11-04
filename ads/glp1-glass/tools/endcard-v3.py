#!/usr/bin/env python3
"""End card v3 (client, Nov 4: "the end card needs to be cleaned up"). One clean column, one job per block, nothing below the
safe zone. v2 (tools/endcard-v2.py) stays as it was for the earlier videos.
  logo (official file) -> product name -> $129 / first month -> Introductory offer -> the same-price line with a check
  -> CTA "Check if I qualify" -> MyFastRx.com + BBB badge on one row -> one fine-print card: the promo terms (bold) and the
  client's disclaimer + Rx line, at one size, inside x 100-920 and above y ~1440.
  No vial (no approved Tirzepatide vial), no heartbeat line through the text, no empty glow. Ivory -> soft blue gradient
  (end card v2's), a soft blue halo behind the price only. Elements ease in top to bottom; the button gives one soft pulse.
  python3 tools/endcard-v3.py [--dur 3] [--fmt 45] [--product tirz|sema] -> footage/broll/endcard_v3_<product>[_4x5].mp4 (+ _still.png)"""
import argparse, math, os, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
ap = argparse.ArgumentParser(); ap.add_argument('--dur', type=float, default=3.0)
ap.add_argument('--fmt', choices=['916', '45'], default='916'); ap.add_argument('--product', choices=['tirz', 'sema'], default='tirz')
a = ap.parse_args(); FMT45 = a.fmt == '45'
W, H, FPS = (1080, 1350, 30) if FMT45 else (1080, 1920, 30)
CX = 540 if FMT45 else 510                      # 9:16 centres on 510 (clear of the right-hand button rail)
F = lambda wt, px: ImageFont.truetype(f'assets/fonts/Geist-{wt}.ttf', px)
NAVY, BLUE, INK2, INK3 = (0, 29, 69), (32, 99, 235), (84, 98, 120), (98, 108, 124)
NAME, PRICE = ('Compounded Tirzepatide', '$129') if a.product == 'tirz' else ('Compounded Semaglutide', '$69')
TERMS = 'Introductory pricing applies to the first month only. $70 savings auto-applied.'
DISC = ('Introductory pricing shown. Regular pricing applies to future orders. MyFastRx does not manufacture medications; '
        'product appearance and labeling may vary. Compounded medication. Not FDA-approved. Results may vary. '
        'Prescription required. Subject to provider approval. AI-generated actor portrayal.')
def layer(): return Image.new('RGBA', (W, H), (0, 0, 0, 0))
def ctext(d, y, s, f, fill): w = d.textlength(s, font=f); d.text((CX - w / 2, y), s, font=f, fill=fill); return w
def wrap(d, s, f, width):
    out, cur = [], ''
    for wd in s.split():
        t = (cur + ' ' + wd).strip()
        if d.textlength(t, font=f) <= width: cur = t
        else: out.append(cur); cur = wd
    return out + [cur]

# ---- background
yy = np.linspace(0, 1, H)[:, None, None]
top, bot = np.array([251, 249, 245]), np.array([228, 238, 252])
bg = Image.fromarray(((top + (bot - top) * yy ** 1.3) * np.ones((1, W, 1))).astype(np.uint8), 'RGB').convert('RGBA')

# ---- layout: blocks stacked with fixed gaps, the whole column centred in the usable band
S = 0.86 if FMT45 else 1.0                      # 4:5 is shorter: everything a touch smaller
LOGO_W = round(430 * S); PRICE_PX = round(196 * S)
lg = np.array(Image.open('images/logo_myfastrx_official.jpg').convert('RGB')).astype(np.float32)   # official logo, alpha recovered
bgc = np.median(lg[:20, :20].reshape(-1, 3), 0); al = np.clip((bgc.mean() - lg.min(2)) / (bgc.mean() - 40), 0, 1)
col = np.clip((lg - (1 - al[..., None]) * bgc) / np.maximum(al[..., None], 1e-3), 0, 255)
logo = Image.fromarray(np.dstack([col, al * 255]).astype(np.uint8), 'RGBA')
logo = logo.crop(Image.fromarray((al > 0.05).astype(np.uint8) * 255).getbbox())
logo = logo.resize((LOGO_W, round(logo.height * LOGO_W / logo.width)), Image.LANCZOS)
bd = Image.open('images/badge_bbb_a_rating_horizontal.jpg').convert('RGB')
arr = np.array(bd).astype(int); white = (arr.min(axis=2) > 228).astype(np.uint8) * 255
fill = Image.fromarray(white, 'L').copy()
for pnt in [(0, 0), (bd.width - 1, bd.height - 1), (bd.width - 1, 0), (0, bd.height - 1)]: ImageDraw.floodfill(fill, pnt, 128)
alpha = Image.fromarray(np.where(np.array(fill) == 128, 0, 255).astype(np.uint8), 'L').filter(ImageFilter.GaussianBlur(0.8))
badge = bd.convert('RGBA'); badge.putalpha(alpha); badge = badge.crop(alpha.point(lambda q: 255 if q > 8 else 0).getbbox())
BW = round(210 * S); badge = badge.resize((BW, round(badge.height * BW / badge.width)), Image.LANCZOS)

blocks = []                                      # (name, height, gap_after)
def block(name, h, gap): blocks.append((name, h, gap))
block('logo', logo.height, round(70 * S)); block('name', round(56 * S), round(30 * S)); block('price', round(PRICE_PX * 1.0), round(18 * S))
block('intro', round(48 * S), round(44 * S)); block('same', round(48 * S), round(52 * S)); block('cta', round(122 * S), round(40 * S))
block('trust', max(badge.height, round(48 * S)), round(44 * S)); block('fine', 0, 0)
fd = ImageDraw.Draw(layer()); ffine, fterm = F('Medium', round(23 * S)), F('SemiBold', round(23 * S))
FINE_W = 760 if not FMT45 else 820
term_lines = wrap(fd, TERMS, fterm, FINE_W); disc_lines = wrap(fd, DISC, ffine, FINE_W); LH = round(31 * S)
fine_h = 30 + LH * len(term_lines) + 12 + LH * len(disc_lines) + 26
blocks[-1] = ('fine', fine_h, 0)
total_h = sum(h + g for _, h, g in blocks)
BAND = (60, 1290) if FMT45 else (150, 1460)       # 9:16: below the top UI, above the bottom UI / caption zone
y = BAND[0] + max(0, (BAND[1] - BAND[0] - total_h) // 2)
Y = {}
for name, h, g in blocks: Y[name] = y; y += h + g

# ---- layers
L_logo = layer(); L_logo.alpha_composite(logo, (CX - logo.width // 2, Y['logo']))
L_price = layer(); d = ImageDraw.Draw(L_price)
ctext(d, Y['name'], NAME, F('SemiBold', round(48 * S)), NAVY)
fp, fs = F('Bold', PRICE_PX), F('SemiBold', round(52 * S))
wp = d.textlength(PRICE, font=fp); ws = max(d.textlength('first', font=fs), d.textlength('month', font=fs)); gap = round(26 * S)
x0 = CX - (wp + gap + ws) / 2; py = Y['price'] - round(PRICE_PX * 0.16)
d.text((x0, py), PRICE, font=fp, fill=NAVY)
d.text((x0 + wp + gap, Y['price'] + round(PRICE_PX * 0.18)), 'first', font=fs, fill=BLUE)
d.text((x0 + wp + gap, Y['price'] + round(PRICE_PX * 0.18) + round(56 * S)), 'month', font=fs, fill=BLUE)
fi = F('Medium', round(32 * S)); wi = d.textlength('Introductory offer', font=fi)
d.rounded_rectangle((CX - wi / 2 - 22, Y['intro'], CX + wi / 2 + 22, Y['intro'] + round(48 * S)), round(24 * S), fill=(32, 99, 235, 26))
ctext(d, Y['intro'] + round(7 * S), 'Introductory offer', fi, (32, 80, 190))
halo = layer(); hm = Image.new('L', (W, H), 0)
ImageDraw.Draw(hm).ellipse((CX - 360, Y['price'] - 120, CX + 360, Y['price'] + PRICE_PX + 110), fill=90)
halo = Image.new('RGBA', (W, H), (120, 168, 255, 0)); halo.putalpha(hm.filter(ImageFilter.GaussianBlur(90)))
L_same = layer(); d = ImageDraw.Draw(L_same); f = F('SemiBold', round(36 * S)); s = 'Same price at any dose within your plan'
while d.textlength(s, font=f) > 740: f = F('SemiBold', f.size - 1)
w = d.textlength(s, font=f); r = round(17 * S); tx = CX - (w + 2 * r + 16) / 2; cy = Y['same'] + round(24 * S)
d.ellipse((tx, cy - r, tx + 2 * r, cy + r), fill=BLUE)
d.line([(tx + r * 0.55, cy), (tx + r * 0.9, cy + r * 0.38), (tx + r * 1.5, cy - r * 0.4)], fill='white', width=max(3, round(4 * S)), joint='curve')
d.text((tx + 2 * r + 16, cy - f.size * 0.62), s, font=f, fill=NAVY)

def cta(scale=1.0):
    im = layer(); f = F('Bold', round(54 * S)); s = 'Check if I qualify'
    tw = ImageDraw.Draw(im).textlength(s, font=f); aw = round(40 * S); bw = (tw + 26 + aw + 120) * scale; bh = round(118 * S) * scale; y = Y['cta']
    sh = layer(); ImageDraw.Draw(sh).rounded_rectangle((CX - bw / 2, y + 14, CX + bw / 2, y + bh + 14), bh / 2, fill=(32, 99, 235, 80))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(18)))
    ImageDraw.Draw(im).rounded_rectangle((CX - bw / 2, y, CX + bw / 2, y + bh), bh / 2, fill=BLUE + (255,))
    d = ImageDraw.Draw(im); tx = CX - (tw + 26 + aw) / 2; ty = y + bh / 2 - f.size * 0.63
    d.text((tx, ty), s, font=f, fill=(255, 255, 255))
    axx = tx + tw + 26; ay = y + bh / 2
    d.line([(axx, ay), (axx + aw, ay)], fill='white', width=7); d.line([(axx + aw - 16, ay - 16), (axx + aw, ay), (axx + aw - 16, ay + 16)], fill='white', width=7, joint='curve')
    return im

L_trust = layer(); d = ImageDraw.Draw(L_trust); fu = F('SemiBold', round(40 * S)); wu = d.textlength('MyFastRx.com', font=fu)
row_w = wu + 36 + badge.width; rx = CX - row_w / 2; ty = Y['trust'] + (blocks[[b[0] for b in blocks].index('trust')][1]) / 2
d.text((rx, ty - fu.size * 0.62), 'MyFastRx.com', font=fu, fill=NAVY)
L_trust.alpha_composite(badge, (round(rx + wu + 36), round(ty - badge.height / 2)))

L_fine = layer(); d = ImageDraw.Draw(L_fine)
fx0, fx1 = CX - FINE_W / 2 - 30, CX + FINE_W / 2 + 30
d.rounded_rectangle((fx0, Y['fine'], fx1, Y['fine'] + fine_h), 22, fill=(255, 255, 255, 200), outline=(32, 99, 235, 30), width=2)
yy_ = Y['fine'] + 18
for s in term_lines: ctext(d, yy_, s, fterm, NAVY); yy_ += LH
yy_ += 12
for s in disc_lines: ctext(d, yy_, s, ffine, INK3); yy_ += LH

# ---- animation
def ease(x): x = min(max(x, 0), 1); return 1 - (1 - x) ** 3
def fade(im, t0, t1, t, rise=22):
    p = ease((t - t0) / (t1 - t0))
    if p <= 0: return None, 0
    o = im.copy(); o.putalpha(o.getchannel('A').point(lambda q: int(q * p))); return o, int(rise * (1 - p))
out = f'footage/broll/endcard_v3_{a.product}' + ('_4x5' if FMT45 else '') + '.mp4'
proc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                         '-c:v', 'libx264', '-crf', '14', '-pix_fmt', 'yuv420p', out], stdin=subprocess.PIPE)
n = int(a.dur * FPS)
for i in range(n):
    t = i / FPS; fr = bg.copy()
    o, _ = fade(halo, 0.1, 0.7, t, 0)
    if o is not None: fr.alpha_composite(o)
    for im, t0, t1 in [(L_logo, 0.0, 0.35), (L_price, 0.15, 0.55), (L_same, 0.35, 0.7), (L_trust, 0.55, 0.9), (L_fine, 0.0, 0.3)]:
        o, dy = fade(im, t0, t1, t)
        if o is not None: fr.alpha_composite(o, (0, dy))
    pulse = 1 + 0.02 * math.sin(math.pi * min(max((t - 1.3) / 0.5, 0), 1))
    o, dy = fade(cta(pulse), 0.45, 0.8, t)
    if o is not None: fr.alpha_composite(o, (0, dy))
    if i == n - 1: fr.convert('RGB').save(out.replace('.mp4', '_still.png'))
    proc.stdin.write(fr.convert('RGB').tobytes())
proc.stdin.close(); proc.wait(); print(out, {k: v for k, v in Y.items()}, 'bottom', Y['fine'] + fine_h)
