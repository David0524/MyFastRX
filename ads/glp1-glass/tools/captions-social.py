#!/usr/bin/env python3
"""Social-native captions (client, Nov 4: "captions look amateurish... mimic actual social media platforms' captions"; "the
caption can interfere/blend in with the other text on screen"). Replaces the full-sentence white-with-black-stroke captions.
Style (TikTok / CapCut auto-caption look): TikTok Sans (OFL, assets/fonts/TikTokSans-*), short chunks of 1-3 words that follow
her speech word by word, the word being said sits on a brand-blue pill, the chunk on a dark translucent rounded box so it reads
on her footage AND on the light screens/graphics without blending into their text, a quick pop-in per chunk.
Placement: one caption band per stretch of the edit (--zones), chosen so the box never overlaps other on-screen text; a chunk
that shows a price gets "Introductory offer" directly beneath it (compliance), and the pair still ends inside the safe zone.
Input: words JSON [{"w": "Considering", "t0": 0.05, "t1": 0.56}, ...] on the edit's timeline (before any speed change).
  python3 tools/captions-social.py --words w.json --dur 27.25 --zones "0:1236" --out caps.mov   (qtrle with alpha, 30 fps)"""
import argparse, json, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ap = argparse.ArgumentParser(); ap.add_argument('--words', required=True); ap.add_argument('--dur', type=float, required=True)
ap.add_argument('--zones', default='0:1236', help='"t0:ybottom,t1:ybottom,...": from time t the caption block ends at ybottom')
ap.add_argument('--cx', type=int, default=510); ap.add_argument('--out', required=True); a = ap.parse_args()
W, H, FPS = 1080, 1920, 30
FT = ImageFont.truetype('assets/fonts/TikTokSans-ExtraBold.ttf', 66)
FQ = ImageFont.truetype('assets/fonts/TikTokSans-SemiBold.ttf', 34)
BOX, PILL, WHITE = (12, 14, 22, 190), (37, 99, 235, 255), (255, 255, 255, 255)
MAXW = 820                                   # safe zone x 100-920
words = json.load(open(a.words))
zones = sorted((float(t), int(y)) for t, y in (z.split(':') for z in a.zones.split(',')))

# ---- chunks: up to 3 words / ~18 characters, break after punctuation, never across a pause > 0.35 s
chunks, cur = [], []
for i, w in enumerate(words):
    cur.append(w)
    nxt = words[i + 1] if i + 1 < len(words) else None
    text = ' '.join(x['w'] for x in cur)
    if (nxt is None or w['w'][-1] in ',.?!' or len(cur) >= 3 or len(text) + 1 + len(nxt['w']) > 18
            or nxt['t0'] - w['t1'] > 0.35):
        chunks.append(cur); cur = []
WEAK = {'a', 'an', 'the', 'at', 'to', 'of', 'if', 'you', 'your', 'my', 'for', 'first', 'so', 'and', 'with', 'how', 'it'}
k = 0                                         # never leave a chunk hanging on a small word: move it to the next chunk
while k < len(chunks) - 1:
    c = chunks[k]
    if len(c) > 1 and c[-1]['w'].lower() in WEAK and len(chunks[k + 1]) < 4 and chunks[k + 1][0]['t0'] - c[-1]['t1'] < 0.35:
        chunks[k + 1].insert(0, c.pop())
    else: k += 1
for k, c in enumerate(chunks):                # a chunk stays up until the next starts (or 0.35 s after its last word)
    nxt = chunks[k + 1][0]['t0'] if k + 1 < len(chunks) else a.dur
    c_end = min(nxt, c[-1]['t1'] + 0.35) if nxt - c[-1]['t1'] > 0.35 else nxt
    for w in c: w['chunk_end'] = c_end

def zone_bottom(t):
    yb = zones[0][1]
    for t0, y in zones:
        if t >= t0 - 1e-6: yb = y
    return yb

def render_chunk(c, active, pop):
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    space = d.textlength(' ', font=FT); ws = [d.textlength(w['w'], font=FT) for w in c]
    tw = sum(ws) + space * (len(c) - 1); padx, pady, th = 26, 16, 78
    has_price = any('$' in w['w'] for w in c)
    yb = zone_bottom(c[0]['t0']) - (62 if has_price else 0)
    bw, bh = tw + 2 * padx, th + 2 * pady
    s = 0.92 + 0.08 * pop
    x0 = a.cx - bw * s / 2; y0 = yb - bh * s
    d.rounded_rectangle((x0, y0, x0 + bw * s, y0 + bh * s), radius=26 * s, fill=BOX)
    f = ImageFont.truetype('assets/fonts/TikTokSans-ExtraBold.ttf', max(10, round(66 * s)))
    x = x0 + padx * s; ty = y0 + (pady + 2) * s
    for i, w in enumerate(c):
        wl = d.textlength(w['w'], font=f)
        if i == active:
            d.rounded_rectangle((x - 10 * s, y0 + 9 * s, x + wl + 10 * s, y0 + bh * s - 9 * s), radius=18 * s, fill=PILL)
        d.text((x, ty), w['w'], font=f, fill=WHITE)
        x += wl + space * s
    if has_price:                             # the qualifier directly beneath the price, every frame the price shows
        q = 'Introductory offer'; qw = d.textlength(q, font=FQ)
        d.rounded_rectangle((a.cx - qw / 2 - 16, yb + 12, a.cx + qw / 2 + 16, yb + 62), radius=14, fill=BOX)
        d.text((a.cx - qw / 2, yb + 17), q, font=FQ, fill=WHITE)
    return im

proc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                         '-c:v', 'qtrle', a.out], stdin=subprocess.PIPE)
blank = Image.new('RGBA', (W, H), (0, 0, 0, 0)).tobytes()
cache = {}
for i in range(round(a.dur * FPS)):
    t = i / FPS; frame = None
    for k, c in enumerate(chunks):
        if c[0]['t0'] - 0.03 <= t < c[-1]['chunk_end']:
            act = max([j for j, w in enumerate(c) if w['t0'] - 0.03 <= t] or [0])
            pop = min(1.0, max(0.0, (t - c[0]['t0'] + 0.03) / 0.09))
            key = (k, act, round(pop, 2))
            if key not in cache: cache[key] = render_chunk(c, act, pop).tobytes()
            frame = cache[key]; break
    proc.stdin.write(frame or blank)
proc.stdin.close(); proc.wait()
print(a.out, f'{len(chunks)} chunks:', ' | '.join(' '.join(w['w'] for w in c) for c in chunks))
