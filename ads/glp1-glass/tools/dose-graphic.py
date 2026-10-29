#!/usr/bin/env python3
"""Tirzepatide "Higher dose. Same price." (PLAN_TIRZ_NAD_2026-10.md, Video 1): the dose-vs-price graphic, coded
(no generations). 1080x1920 @ 30 fps, end card v2's ivory -> soft blue gradient, Geist, CX = 510.
  - title HIGHER DOSE. / SAME PRICE.
  - "Prescribed dose" (teal) steps up four times while "Your plan price" (navy) runs flat with a lock that pulses at
    each step. No dollar figure on the flat line (the brief: never imply the $129 intro price continues), no mg numbers,
    no months (no dosing schedule), and "Dose set by your provider" beneath (doses only with provider review).
  - two chips: "Same price at any dose within your plan" (client's end-card line) and "No automatic refill billing"
    (client confirmed Oct 29: no auto rebilling)
  - y 1150-1260 stays clear for the edit's captions (caption bottom 1236)
  python3 tools/dose-graphic.py [--dur 5] -> footage/broll/dose_same_price.mp4 (+ _still.png)"""
import argparse, os, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
ap = argparse.ArgumentParser(); ap.add_argument('--dur', type=float, default=5.0); a = ap.parse_args()
W, H, FPS, CX = 1080, 1920, 30, 510
F = lambda wt, px: ImageFont.truetype(f'assets/fonts/Geist-{wt}.ttf', px)
NAVY, BLUE, TEAL, INK2 = (0, 29, 69), (32, 99, 235), (20, 163, 184), (84, 98, 120)
OUT = 'footage/broll/dose_same_price.mp4'

def layer(): return Image.new('RGBA', (W, H), (0, 0, 0, 0))
def ease(x): x = min(max(x, 0), 1); return 1 - (1 - x) ** 3
def fade(im, p):
    im = im.copy(); im.putalpha(im.getchannel('A').point(lambda q: int(q * p))); return im

# ---- background: end card v2's gradient + a faint grid behind the chart (static)
yy = np.linspace(0, 1, H)[:, None, None]
top, bot = np.array([251, 249, 245]), np.array([228, 238, 252])
bg = Image.fromarray(((top + (bot - top) * yy ** 1.3) * np.ones((1, W, 1))).astype(np.uint8), 'RGB').convert('RGBA')
X0, X1, Y_PRICE, Y_DOSE0, Y_DOSE1 = 150, 860, 650, 1010, 760     # chart box; dose rises from Y_DOSE0 to Y_DOSE1
grid = layer(); g = ImageDraw.Draw(grid)
for x in range(X0, X1 + 1, 71): g.line([(x, 590), (x, 1060)], fill=(32, 99, 235, 16), width=1)
for y in range(590, 1061, 67): g.line([(X0, y), (X1, y)], fill=(32, 99, 235, 16), width=1)
bg.alpha_composite(grid)

# ---- static pieces
def text_layer(lines):
    im = layer(); d = ImageDraw.Draw(im)
    for s, f, col, y in lines: d.text((CX - d.textlength(s, font=f) / 2, y), s, font=f, fill=col)
    return im
title = text_layer([('HIGHER DOSE.', F('Bold', 108), NAVY, 270), ('SAME PRICE.', F('Bold', 108), BLUE, 390)])
labels = layer(); d = ImageDraw.Draw(labels)
d.text((X0, Y_PRICE - 62), 'Your plan price', font=F('SemiBold', 40), fill=NAVY)
d.text((X0, Y_DOSE0 + 20), 'Prescribed dose', font=F('SemiBold', 40), fill=TEAL)     # under the line: clear of the first step
note = text_layer([('Dose set by your provider', F('Medium', 32), INK2, 1104)])

def chip(s, y):
    f = F('SemiBold', 40); im = layer(); d = ImageDraw.Draw(im); w = d.textlength(s, font=f)
    box = (CX - w / 2 - 40, y, CX + w / 2 + 40, y + 84)
    sh = layer(); ImageDraw.Draw(sh).rounded_rectangle((box[0], box[1] + 8, box[2], box[3] + 8), 42, fill=(20, 40, 80, 40))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(10)))
    d.rounded_rectangle(box, 42, fill=(255, 255, 255, 245), outline=(32, 99, 235, 70), width=2)
    d.text((CX - w / 2, y + 18), s, font=f, fill=NAVY); return im
chip1, chip2 = chip('Same price at any dose within your plan', 1300), chip('No automatic refill billing', 1408)

def lock(cx, cy, s):
    """A small padlock in a navy disc, scale s."""
    im = layer(); d = ImageDraw.Draw(im); r = 34 * s
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=NAVY)
    sw = max(3, round(5 * s)); white = (255, 255, 255)
    d.arc((cx - 10 * s, cy - 22 * s, cx + 10 * s, cy - 2 * s), 180, 360, fill=white, width=sw)          # shackle
    for x in (cx - 10 * s + sw / 2, cx + 10 * s - sw / 2): d.line([(x, cy - 12 * s), (x, cy)], fill=white, width=sw)
    d.rounded_rectangle((cx - 15 * s, cy - 2 * s, cx + 15 * s, cy + 18 * s), 4 * s, fill=white)        # body
    d.ellipse((cx - 3 * s, cy + 4 * s, cx + 3 * s, cy + 10 * s), fill=NAVY)                            # keyhole
    return im

# ---- the two lines, drawn left to right; the dose steps up at three risers
RISERS = [X0 + (X1 - X0) * k / 4 for k in (1, 2, 3)]
LEVELS = [Y_DOSE0 + (Y_DOSE1 - Y_DOSE0) * k / 3 for k in range(4)]
T_LINE0, T_LINE1 = 0.6, 3.3
def lines_layer(t):
    p = ease((t - T_LINE0) / (T_LINE1 - T_LINE0)) if t > T_LINE0 else 0
    xe = X0 + (X1 - X0 - 50) * p
    im = layer(); d = ImageDraw.Draw(im)
    if p > 0:
        d.line([(X0, Y_PRICE), (xe, Y_PRICE)], fill=NAVY, width=9)
        pts, lvl = [(X0, LEVELS[0])], 0
        for k, rx in enumerate(RISERS):
            if xe <= rx: break
            # each riser snaps up over ~0.25 s of line travel
            q = ease((xe - rx) / 40); y_new = LEVELS[k] + (LEVELS[k + 1] - LEVELS[k]) * q
            pts += [(rx, LEVELS[k]), (rx, y_new)]; lvl = y_new
        pts.append((xe, lvl if len(pts) > 1 else LEVELS[0]))
        d.line(pts, fill=TEAL, width=9, joint='curve')
        for x, y in pts[2:-1:2]: d.ellipse((x - 9, y - 9, x + 9, y + 9), fill=TEAL)
    gl = im.filter(ImageFilter.GaussianBlur(6)); gl.alpha_composite(im)
    # lock rides the end of the price line; a small pulse each time the dose steps up
    pulse = max([max(0, 1 - abs(xe - rx - 20) / 30) for rx in RISERS] + [0])
    if p > 0: gl.alpha_composite(lock(xe + 44, Y_PRICE, 1 + 0.12 * pulse))
    return gl

# ---- render
proc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                         '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT],
                        stdin=subprocess.PIPE)
n = round(a.dur * FPS)
for i in range(n):
    t = i / FPS; fr = bg.copy()
    pt = ease(t / 0.5); tl = layer(); tl.alpha_composite(fade(title, pt), (0, int(30 * (1 - pt)))); fr.alpha_composite(tl)
    fr.alpha_composite(fade(labels, ease((t - 0.4) / 0.5)))
    fr.alpha_composite(lines_layer(t))
    fr.alpha_composite(fade(note, ease((t - 1.2) / 0.5)))
    for c, t0 in ((chip1, 3.3), (chip2, 3.8)):
        pc = ease((t - t0) / 0.45); cl = layer(); cl.alpha_composite(fade(c, pc), (0, int(24 * (1 - pc)))); fr.alpha_composite(cl)
    proc.stdin.write(fr.convert('RGB').tobytes())
    if i == n - 1: fr.convert('RGB').save(OUT.replace('.mp4', '_still.png'))
proc.stdin.close(); proc.wait()
print(OUT, f'{a.dur} s')
