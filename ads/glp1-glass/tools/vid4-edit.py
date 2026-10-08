#!/usr/bin/env python3
"""UGC Video 4 "The pump": the edit. Coded pump counter (tools/pump-counter.py) as the hook and the "price doesn't" beat,
three Seedance 2.5 720p takes of Dana at the pump, word-for-word captions, the client's pricing qualifiers, the client's
headline "Same price. Any dose." and the end card shared with Video 1 (helpers reused from tools/vid1-edit.py).
  python3 tools/vid4-edit.py  -> out/ugc/vid4_pump/MyFastRx_UGC4_Pump_v1.mp4 (+ previews/ugc/ review copy)
Long pauses (> ~0.6 s) are trimmed to short jump cuts, the native UGC rhythm; every cut point is checked against the
audio energy (a word can ring out past its transcript end time, as "dollars" did)."""
import json, os, subprocess
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
W, H = 1080, 1920
F = lambda wt, px: ImageFont.truetype(f'assets/fonts/Geist-{wt}.ttf', px)
NAVY, WHITE = (0, 29, 69), (255, 255, 255)
CX, CAP_Y = 510, 1236
src = open('tools/vid1-edit.py').read()          # reuse chip_png + endcard_png exactly as Video 1 has them
exec(src[src.index('def chip_png'):src.index('def status_bar')]); exec(src[src.index('def endcard_png'):src.index('# ---- overlays')])

OUT = 'out/ugc/vid4_pump'; OV = f'{OUT}/overlays'; os.makedirs(OV, exist_ok=True)
C1, C2, C3 = 'footage/gen/vid4_clip1.mp4', 'footage/gen/vid4_clip2.mp4', 'footage/gen/vid4_clip3.mp4'
CNT = 'footage/broll/pump_counter.mp4'          # coded counter: rolls up, stops at 3.4 s
PIECES = [(C1, 0.00, 3.62), (C1, 3.98, 5.30), (C1, 6.30, 7.95),
          (C2, 0.00, 9.95),   # no trim here: "dollars" rings out to ~7.05 s
          (C3, 0.00, 5.30), (C3, 5.52, 8.00)]
END = 2.5
starts = []; t = 0.0
for f, a, b in PIECES: starts.append(t); t += b - a
TOTAL_A = t; TOTAL = t + END

def film(f, s):
    """Source time s in clip f -> film time (the piece that contains it)."""
    for st, (ff, a, b) in zip(starts, PIECES):
        if ff == f and a - 1e-6 <= s <= b + 1e-6: return st + s - a
    for st, (ff, a, b) in zip(starts, PIECES):            # inside a trimmed gap: snap to the next piece
        if ff == f and s < a: return st
    raise ValueError((f, s))

T3 = film(C3, 0.0)
INSERTS = [(0.0, 0.00, 1.82), (T3, 1.40, 3.50)]   # (film start, counter in, counter out): hook; "when the dose goes up" -> stops
Q69, Q79 = 'Introductory offer', 'Month-to-month: $139/mo after first month'
CAPS = [
    ['Watching this number go up', 0.0, film(C1, 1.82), None],
    ['is my LEAST favorite thing.', film(C1, 1.82), film(C1, 3.62), None],
    ['Gas, groceries...', film(C1, 3.98), film(C1, 5.30), None],
    ['everything just goes up.', film(C1, 6.30), film(C2, 0.0), None],
    ['So this one actually surprised me.', film(C2, 0.0), film(C2, 2.44), None],
    ['MyFastRx, GLP-1.', film(C2, 2.44), film(C2, 4.82), None],
    ["First month's $69.", film(C2, 4.82), film(C2, 7.05), Q69],
    ['If you do the year,', film(C2, 7.05), film(C2, 8.68), None],
    ["it's $79 a month.", film(C2, 8.68), T3, Q79],
    ['And when the dose goes up...', T3, film(C3, 2.12), None],
    ["the price doesn't.", film(C3, 2.12), film(C3, 3.64), None],
    ['Every dose, same price.', film(C3, 3.64), film(C3, 5.30), None],
    ['Honestly? Rare.', film(C3, 5.52), film(C3, 7.40), None],
    ["Link's there.", film(C3, 7.40), TOTAL_A, None],
]
CHIPS = [(['First month $69', 'New customers · Introductory offer'], film(C2, 4.82), film(C2, 7.05)),
         (['12-month plan: $79/mo equivalent', '$948 billed upfront'], film(C2, 7.05), T3)]
HEADLINE = (film(C3, 2.12), film(C3, 7.40))      # the client's own headline, while she says it

def caption_png(text, path, qual=None):
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im); f = F('Bold', 64)
    w = d.textlength(text, font=f)
    d.text((CX - w / 2, CAP_Y - 64), text, font=f, fill=WHITE, stroke_width=7, stroke_fill=(0, 0, 0))
    if qual:
        fq = F('Medium', 34); qw = d.textlength(qual, font=fq); y = CAP_Y + 26
        d.rounded_rectangle((CX - qw / 2 - 16, y - 8, CX + qw / 2 + 16, y + 46), 12, fill=(0, 0, 0, 170))
        d.text((CX - qw / 2, y), qual, font=fq, fill=WHITE)
    im.save(path)

def headline_png(path):
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im); f = F('Bold', 84); s = 'Same price. Any dose.'
    w = d.textlength(s, font=f); y = 330
    d.rounded_rectangle((CX - w / 2 - 40, y - 24, CX + w / 2 + 40, y + 120), 34, fill=(255, 255, 255, 240))
    d.text((CX - w / 2, y), s, font=f, fill=NAVY); im.save(path)

ov = []
for i, (tx, a, b, q) in enumerate(CAPS):
    p = f'{OV}/cap_{i:02d}.png'; caption_png(tx, p, q); ov.append((p, a, b))
for i, (lines, a, b) in enumerate(CHIPS):
    p = f'{OV}/chip_{i}.png'; chip_png(lines, p, 1500); ov.append((p, a, b))
headline_png(f'{OV}/headline.png'); ov.append((f'{OV}/headline.png', *HEADLINE))
endcard_png(f'{OV}/endcard.png')

args = ['ffmpeg', '-v', 'error', '-y']
clips = [C1, C2, C3]
for f in clips: args += ['-i', f]
args += ['-i', CNT, '-loop', '1', '-t', str(END), '-i', f'{OV}/endcard.png']
for p, _, _ in ov: args += ['-loop', '1', '-t', str(TOTAL), '-i', p]
fc, vl, al = [], [], []
for k, (f, a, b) in enumerate(PIECES):
    i = clips.index(f)
    fc.append(f'[{i}:v]trim={a}:{b},setpts=PTS-STARTPTS,scale={W}:{H}:flags=lanczos,fps=30,setsar=1,format=yuv420p[v{k}]')
    fc.append(f'[{i}:a]atrim={a}:{b},asetpts=PTS-STARTPTS,aformat=sample_rates=48000:channel_layouts=stereo,'
              f'afade=t=in:d=0.02,afade=t=out:st={b - a - 0.04:.3f}:d=0.04[a{k}]')
    vl.append(f'[v{k}]'); al.append(f'[a{k}]')
fc.append(f'[4:v]scale={W}:{H},fps=30,format=yuv420p,setsar=1[ve]')
fc.append(f'anullsrc=r=48000:cl=stereo,atrim=0:{END}[ae]')
fc.append(''.join(vl) + f'[ve]concat=n={len(PIECES) + 1}:v=1:a=0[b0]')
fc.append(f'[3:v]split={len(INSERTS)}' + ''.join(f'[c{j}]' for j in range(len(INSERTS))))
last = 'b0'
for j, (t0, a, b) in enumerate(INSERTS):
    fc.append(f'[c{j}]trim={a}:{b},setpts=PTS-STARTPTS+{t0:.3f}/TB,fps=30,format=yuv420p[ci{j}]')
    fc.append(f'[{last}][ci{j}]overlay=0:0:eof_action=pass[bi{j}]'); last = f'bi{j}'
for k, (p, a, b) in enumerate(ov):
    fc.append(f"[{last}][{5 + k}:v]overlay=0:0:shortest=0:enable='between(t,{a:.3f},{b - 0.001:.3f})'[o{k}]"); last = f'o{k}'
fc.append(''.join(al) + f'[ae]concat=n={len(PIECES) + 1}:v=0:a=1,highpass=f=80,loudnorm=I=-16:TP=-1.5:LRA=11,'
          'alimiter=limit=0.84:level=false[aout]')
mp4 = f'{OUT}/MyFastRx_UGC4_Pump_v1.mp4'
args += ['-filter_complex', ';'.join(fc), '-map', f'[{last}]', '-map', '[aout]', '-t', f'{TOTAL:.3f}', '-r', '30',
         '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-b:v', '12M', '-maxrate', '12.5M', '-bufsize', '25M',
         '-c:a', 'aac', '-ar', '48000', '-b:a', '256k', '-movflags', '+faststart', mp4]
subprocess.run(args, check=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', mp4, '-vf', 'scale=720:1280:flags=lanczos', '-c:v', 'libx264', '-crf', '24',
                '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart',
                'previews/ugc/MyFastRx_UGC4_Pump_v1_review.mp4'], check=True)
print(json.dumps({'total_s': round(TOTAL, 2), 'pieces': [round(s, 2) for s in starts], 'inserts': INSERTS, 'out': mp4}))
