#!/usr/bin/env python3
"""Coded fallback for Video 4's B-roll: an extreme close-up of a plain (unbranded) fuel-pump LCD whose dollar amount
counts up and then stops. Seven-segment digits drawn in code, with lens blur, grain and a slight handheld drift so it
reads as phone footage, not a graphic.
  python3 tools/pump-counter.py [--stop 3.4] [--final 48.73]  -> footage/broll/pump_counter.mp4 (1080x1920, 30 fps, 5 s)"""
import argparse, os, subprocess, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
ap = argparse.ArgumentParser(); ap.add_argument('--stop', type=float, default=3.4); ap.add_argument('--final', type=float, default=48.73)
ap.add_argument('--dur', type=float, default=5.0); a = ap.parse_args()
W, H, FPS = 1080, 1920, 30
os.makedirs('footage/broll/pump_frames', exist_ok=True)
SEG = {'0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc', '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg'}

def digit(d, x, y, w, h, ch, on, off):
    t = w * 0.16; g = t * 0.25
    segs = {'a': (x + t, y, x + w - t, y + t), 'g': (x + t, y + h / 2 - t / 2, x + w - t, y + h / 2 + t / 2),
            'd': (x + t, y + h - t, x + w - t, y + h), 'f': (x, y + t, x + t, y + h / 2 - g), 'b': (x + w - t, y + t, x + w, y + h / 2 - g),
            'e': (x, y + h / 2 + g, x + t, y + h - t), 'c': (x + w - t, y + h / 2 + g, x + w, y + h - t)}
    for k, r in segs.items():
        d.rounded_rectangle(r, radius=t * 0.35, fill=on if k in SEG[ch] else off)

def frame(t):
    v = a.final * min(1.0, t / a.stop) ** 0.92 if t < a.stop else a.final
    gal = v / 3.89
    im = Image.new('RGB', (W + 200, H + 200), (58, 60, 63)); d = ImageDraw.Draw(im)
    for y in range(0, H + 200, 6): d.line((0, y, W + 200, y), fill=(60 + (y // 6) % 2, 62, 65))   # brushed bezel
    for (top, val, lab, big) in [(300, f'{v:6.2f}', 'TOTAL SALE $', 1), (900, f'{gal:6.3f}', 'GALLONS', 0)]:   # captions sit below at ~1170-1240
        x0, x1, y0 = 140, W + 60, top; hh = 470 if big else 380
        d.rounded_rectangle((x0 - 30, y0 - 30, x1 + 30, y0 + hh + 30), 26, fill=(28, 29, 31))
        d.rounded_rectangle((x0, y0, x1, y0 + hh), 14, fill=(150, 162, 140))                    # LCD glass
        chars = val; n = len([c for c in chars if c != '.'])   # leading blanks stay unlit, like a real pump
        dw = (x1 - x0 - 120) / n; dh = hh - 120; x = x0 + 70
        for c in chars:
            if c == '.':
                d.ellipse((x - dw * 0.16, y0 + 60 + dh - dw * 0.14, x - dw * 0.02, y0 + 60 + dh), fill=(25, 30, 25)); continue
            digit(d, x + dw * 0.08, y0 + 60, dw * 0.74, dh, '8' if c == ' ' else c, (138, 150, 128) if c == ' ' else (25, 30, 25), (138, 150, 128)); x += dw
        d.text((x0, y0 - 92), lab, fill=(205, 205, 200), font=ImageFont.truetype('assets/fonts/Geist-SemiBold.ttf', 54))
    im = im.filter(ImageFilter.GaussianBlur(2.2))
    dx = 100 + 14 * math.sin(t * 1.3) + 6 * math.sin(t * 3.1); dy = 100 + 10 * math.cos(t * 1.1)
    im = im.crop((dx, dy, dx + W, dy + H))
    arr = np.asarray(im).astype(np.float32)
    yy, xx = np.mgrid[0:H, 0:W]; vig = 1 - 0.28 * (((xx - W / 2) / W) ** 2 + ((yy - H / 2) / H) ** 2) * 2.2
    arr = arr * vig[..., None] + np.random.normal(0, 5.5, arr.shape)
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))

n = int(a.dur * FPS)
for i in range(n): frame(i / FPS).save(f'footage/broll/pump_frames/{i:04d}.png')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(FPS), '-i', 'footage/broll/pump_frames/%04d.png', '-c:v', 'libx264',
                '-crf', '18', '-pix_fmt', 'yuv420p', 'footage/broll/pump_counter.mp4'], check=True)
for f in os.listdir('footage/broll/pump_frames'): os.remove(f'footage/broll/pump_frames/{f}')
os.rmdir('footage/broll/pump_frames')
print('footage/broll/pump_counter.mp4')
