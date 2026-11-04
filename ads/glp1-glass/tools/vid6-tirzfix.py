#!/usr/bin/env python3
"""Video 6 "Higher dose. Same price.": free fix for the front-steps take's "tir-zep-a-TEEDE" (client, Nov 4).
The word is swapped for Hook A's correct "tirzepatide" (same voice reference, same session), cut in the silences around
it (50 ms RMS), level-matched to the word it replaces, with 15 ms crossfades; the rest of the take keeps its own timing,
so her lips stay in sync before and after. A 2 s price card covers her mouth while the patched word plays.
  python3 tools/vid6-tirzfix.py -> audio/ugc/vid6_steps_tirzfix.wav + footage/broll/vid6_price_card.png
                                   + previews/ugc/vid6_steps_patch_preview.mp4 (the take at 1080x1920 with the card)"""
import os, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
SR = 48000
STEPS, HOOK = 'footage/gen/host2_v6_steps_720p.mp4', 'footage/gen/host2_v6_hookA_720p.mp4'
OUT_WAV, CARD, PREVIEW = 'audio/ugc/vid6_steps_tirzfix.wav', 'footage/broll/vid6_price_card.png', 'previews/ugc/vid6_steps_patch_preview.mp4'
# boundaries read off the 50 ms RMS envelope (both sides sit in silence, below -37 dB)
DST0, DST1 = 3.62, 4.62          # steps: the closure before the word .. the pause before "starts"
SRC0, SRC1 = 1.82, 2.64          # hook A: the closure before the word .. just before "doses"
CARD0, CARD1 = 3.45, 5.45        # the card holds 2 s (house rule), word fully covered
W, H, CX = 1080, 1920, 510
F = lambda wt, px: ImageFont.truetype(f'assets/fonts/Geist-{wt}.ttf', px)
NAVY, BLUE, INK2 = (0, 29, 69), (32, 99, 235), (84, 98, 120)

def load(f):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768

def rms(x): return np.sqrt((x ** 2).mean() + 1e-12)

# ---- audio
steps, hook = load(STEPS), load(HOOK)
d0, d1, s0, s1 = (round(t * SR) for t in (DST0, DST1, SRC0, SRC1))
word = hook[s0:s1].copy()
old = steps[d0:d1]
loud = lambda x: x[np.abs(x) > 0.01]                       # speech samples only, for the level match
word *= rms(loud(old)) / rms(loud(word))
fill = np.zeros(d1 - d0, np.float32); fill[:len(word)] = word[:d1 - d0]
fade = round(0.015 * SR); ramp = np.linspace(0, 1, fade, dtype=np.float32)
out = steps.copy()
seg = out[d0:d1].copy()
seg[:fade] = seg[:fade] * (1 - ramp) + fill[:fade] * ramp
seg[fade:-fade] = fill[fade:-fade]
seg[-fade:] = fill[-fade:] * (1 - ramp) + seg[-fade:] * ramp
out[d0:d1] = seg
os.makedirs(os.path.dirname(OUT_WAV), exist_ok=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', OUT_WAV], input=out.tobytes(), check=True)

# ---- price card (end card v2's gradient, centred on CX; $129 with its qualifier directly beneath)
yy = np.linspace(0, 1, H)[:, None, None]
top, bot = np.array([251, 249, 245]), np.array([228, 238, 252])
card = Image.fromarray(((top + (bot - top) * yy ** 1.3) * np.ones((1, W, 1))).astype(np.uint8), 'RGB')
d = ImageDraw.Draw(card)
def ctext(s, f, col, y): d.text((CX - d.textlength(s, font=f) / 2, y), s, font=f, fill=col)
ctext('Compounded Tirzepatide', F('Bold', 70), NAVY, 640)
ctext('$129', F('Bold', 230), BLUE, 740)
ctext('first month', F('SemiBold', 56), NAVY, 1000)
ctext('Introductory offer', F('Medium', 36), INK2, 1080)
os.makedirs(os.path.dirname(CARD), exist_ok=True); card.save(CARD)

# ---- preview: the take at 1080x1920 with the card over CARD0..CARD1 and the patched audio
os.makedirs(os.path.dirname(PREVIEW), exist_ok=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', STEPS, '-loop', '1', '-i', CARD, '-i', OUT_WAV, '-filter_complex',
                f'[0:v]scale={W}:{H}:flags=lanczos,fps=30[v];[1:v]fps=30,format=yuv420p[c];'
                f"[v][c]overlay=enable='between(t,{CARD0},{CARD1})':shortest=1[o]",
                '-map', '[o]', '-map', '2:a', '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k',
                '-shortest', '-movflags', '+faststart', PREVIEW], check=True)
print(OUT_WAV, CARD, PREVIEW, f'word {SRC1 - SRC0:.2f} s into a {DST1 - DST0:.2f} s gap; level x{rms(loud(old)) / rms(loud(hook[s0:s1])):.2f}')
