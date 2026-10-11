#!/usr/bin/env python3
"""UGC Video 5 "Don't wait for January" (autumn): the edit. Two Seedance 2.5 720p takes of Dana (porch C1, sidewalk C2),
the coded autumn -> winter time-lapse (tools/vid5-timelapse.py) as a full cutaway with the month in the caption style
(October -> January.), word-for-word captions, price chips, the client's headline "Same price. Any dose.", one punch-in on the CTA,
coded street ambience (tools/vid5-ambience.py), a coded music bed (tools/vid5-music.py) and the end card shared with Videos 1/4.
  python3 tools/vid5-edit.py -> out/ugc/vid5_autumn/MyFastRx_UGC5_Autumn_v1.mp4 (+ previews/ugc/ review copy)
Client, Oct 11: "...and then it's January. Again." is cut; the time-lapse + month captions carry that beat with no words.
C2's audio comes from audio/ugc/vid5_c2_rxfix.wav ("Fast R-P" -> "Fast Rx", tools/vid5-rxfix.py).
Cut points are checked against the audio energy (50 ms RMS), not only the transcript."""
import datetime, json, os, subprocess
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
W, H = 1080, 1920
F = lambda wt, px: ImageFont.truetype(f'assets/fonts/Geist-{wt}.ttf', px)
NAVY, WHITE = (0, 29, 69), (255, 255, 255)
CX, CAP_Y = 510, 1236
src = open('tools/vid1-edit.py').read()          # reuse chip_png + endcard_png exactly as Videos 1/4 have them
exec(src[src.index('def chip_png'):src.index('def status_bar')]); exec(src[src.index('def endcard_png'):src.index('# ---- overlays')])
v4 = open('tools/vid4-edit.py').read()           # and Video 4's caption (width guard) + headline
exec(v4[v4.index('def caption_png'):v4.index('ov = []')])

OUT = 'out/ugc/vid5_autumn'; OV = f'{OUT}/overlays'; os.makedirs(OV, exist_ok=True); os.makedirs('previews/ugc', exist_ok=True)
C1, C2, TL = 'footage/gen/vid5_porch_c1.mp4', 'footage/gen/vid5_sidewalk_c2.mp4', 'footage/broll/vid5_timelapse.mp4'
C2A = 'audio/ugc/vid5_c2_rxfix.wav'
PIECES = [(C1, 0.55, 3.45),     # "This is your sign to finally look into a GLP1." (lead-in silence cut)
          (C1, 4.05, 5.45),     # "Don't wait for January."  (0.84 s pause trimmed)
          (C1, 5.82, 7.75),     # "Everyone says 'after the holidays'..."  (cut before "and then it's January. Again.")
          (TL, 0.00, 3.00),     # time-lapse: the street, autumn -> snow, month captions October -> January.
          (C2, 0.12, 0.70),     # "Or..."
          (C2, 1.18, 7.95),     # "just start now. My Fast Rx, compounded GLP1, $69 the first month. Same price at every dose."
          (C2, 7.95, 10.05)]    # "Check if you qualify, it takes like a minute."  (punch-in)
# snap every cut to the 30 fps output grid so picture and sound stay frame-locked (the 24 fps sources otherwise drift ~2 frames)
PIECES = [(f, round(a * 30) / 30, round(b * 30) / 30) for f, a, b in PIECES]
PUNCH = {6: (1.20, 0.47, 0.32)}  # piece -> (zoom, face cx, face cy) as frame fractions
END = 2.5
starts = []; t = 0.0
for f, a, b in PIECES: starts.append(t); t += b - a
TOTAL_A = t; TOTAL = t + END

def film(f, s):
    for st, (ff, a, b) in zip(starts, PIECES):
        if ff == f and a - 1e-6 <= s <= b + 1e-6: return st + s - a
    for st, (ff, a, b) in zip(starts, PIECES):
        if ff == f and s < a: return st
    raise ValueError((f, s))

T_TL0, T_TL1 = film(TL, 0.0), film(TL, 3.0)
CAPS = [
    ['This is your sign', 0.0, film(C1, 1.52), None],
    ['to finally look into a GLP-1.', film(C1, 1.52), film(C1, 3.45), None],
    ["Don't wait for January.", film(C1, 4.05), film(C1, 5.45), None],
    ['Everyone says', film(C1, 5.82), film(C1, 6.52), None],
    ['"after the holidays"...', film(C1, 6.52), T_TL0, None],
    ['Or...', film(C2, 0.12), film(C2, 1.18), None],
    ['just start now.', film(C2, 1.18), film(C2, 2.25), None],
    ['MyFastRx, compounded GLP-1.', film(C2, 2.25), film(C2, 4.60), None],
    ['$69 the first month.', film(C2, 4.60), film(C2, 6.40), 'Introductory offer'],
    ['Same price at every dose.', film(C2, 6.40), film(C2, 7.95), None],
    ['Check if you qualify,', film(C2, 7.95), film(C2, 9.10), None],
    ['it takes like a minute.', film(C2, 9.10), TOTAL_A, None],
]
CHIPS = [(['Compounded Semaglutide', '$69 first month · Introductory offer'], film(C2, 4.60), film(C2, 6.40)),
         (['No subscription', 'Provider review online'], film(C2, 6.40), film(C2, 7.95))]
HEADLINE = (film(C2, 6.40), film(C2, 9.10))

# over the time-lapse: the month, in the caption style, changing with the season (client: the date stamp was "a bit gimmicky")
MONTHS = [('October', 0.0, 0.6), ('November', 0.6, 1.3), ('December', 1.3, 2.0), ('January.', 2.0, 3.0)]


ov = []
for i, (tx, a, b, q) in enumerate(CAPS):
    p = f'{OV}/cap_{i:02d}.png'; caption_png(tx, p, q); ov.append((p, a, b))
for i, (lines, a, b) in enumerate(CHIPS):
    p = f'{OV}/chip_{i}.png'; chip_png(lines, p, 1500); ov.append((p, a, b))
headline_png(f'{OV}/headline.png'); ov.append((f'{OV}/headline.png', *HEADLINE))
for i, (m, a, b) in enumerate(MONTHS):
    p = f'{OV}/month_{i}.png'; caption_png(m, p); ov.append((p, T_TL0 + a, T_TL0 + b))
endcard_png(f'{OV}/endcard.png')

subprocess.run(['python3', 'tools/vid5-music.py', '--dur', f'{TOTAL:.3f}', '--bar0', f'{starts[0] + (T_TL0 - 2 * 3.0):.3f}',
                '--lift', f'{T_TL0:.3f}', f'{T_TL1:.3f}', f'{TOTAL_A:.3f}', f'{TOTAL + 1:.3f}'], check=True)
subprocess.run(['python3', 'tools/vid5-ambience.py', '--dur', f'{TOTAL_A:.3f}', '--tl0', f'{T_TL0:.3f}', '--tl1', f'{T_TL1:.3f}'], check=True)
args = ['ffmpeg', '-v', 'error', '-y', '-i', C1, '-i', C2, '-i', TL, '-i', C2A,
        '-loop', '1', '-t', str(END), '-i', f'{OV}/endcard.png', '-i', 'audio/ugc/vid5_ambience.wav',
        '-i', 'audio/ugc/vid5_music.wav']                     # input 6: coded music bed (tools/vid5-music.py)
for p, _, _ in ov: args += ['-loop', '1', '-t', str(TOTAL), '-i', p]
VIN = {C1: 0, C2: 1, TL: 2}; AIN = {C1: 0, C2: 3}
fc, vl, al = [], [], []
for k, (f, a, b) in enumerate(PIECES):
    crop = ''
    if k in PUNCH:
        z, fx, fy = PUNCH[k]
        crop = f'crop=iw/{z}:ih/{z}:min(max(iw*{fx}-iw/{z}/2\\,0)\\,iw-iw/{z}):min(max(ih*{fy}-ih/{z}/2\\,0)\\,ih-ih/{z}),'
    fc.append(f'[{VIN[f]}:v]fps=30,trim={a:.5f}:{b:.5f},setpts=PTS-STARTPTS,{crop}scale={W}:{H}:flags=lanczos,setsar=1,format=yuv420p[v{k}]')
    if f in AIN:
        fc.append(f'[{AIN[f]}:a]atrim={a:.5f}:{b:.5f},asetpts=PTS-STARTPTS,aformat=sample_rates=48000:channel_layouts=stereo,'
                  f'afade=t=in:d=0.02,afade=t=out:st={b - a - 0.04:.3f}:d=0.04[a{k}]')
    else:
        fc.append(f'anullsrc=r=48000:cl=stereo,atrim=0:{b - a:.3f}[a{k}]')
    vl.append(f'[v{k}]'); al.append(f'[a{k}]')
fc.append(f'[4:v]scale={W}:{H},fps=30,format=yuv420p,setsar=1[ve]')
fc.append(f'anullsrc=r=48000:cl=stereo,atrim=0:{END}[ae]')
fc.append(''.join(vl) + f'[ve]concat=n={len(PIECES) + 1}:v=1:a=0[b0]')
last = 'b0'
for k, (p, a, b) in enumerate(ov):
    fc.append(f"[{last}][{7 + k}:v]overlay=0:0:shortest=0:enable='between(t,{a:.3f},{b - 0.001:.3f})'[o{k}]"); last = f'o{k}'
fc.append(''.join(al) + f'[ae]concat=n={len(PIECES) + 1}:v=0:a=1[voice]')
fc.append('[5:a]aformat=sample_rates=48000:channel_layouts=stereo[amb]')
fc.append('[voice]asplit=2[vo][vsc]')
# music: -9 dB, then ducked ~5 dB more while she talks; carries the time-lapse and the end card on its own
fc.append('[6:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=0.35[mu]')
fc.append('[mu][vsc]sidechaincompress=threshold=0.015:ratio=4:attack=30:release=350[mud]')
fc.append('[vo][amb][mud]amix=inputs=3:duration=first:normalize=0,highpass=f=40,loudnorm=I=-16:TP=-1.5:LRA=11,'
          'alimiter=limit=0.80:level=false[aout]')
mp4 = f'{OUT}/MyFastRx_UGC5_Autumn_v1.mp4'
args += ['-filter_complex', ';'.join(fc), '-map', f'[{last}]', '-map', '[aout]', '-t', f'{TOTAL:.3f}', '-r', '30',
         '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-b:v', '12M', '-maxrate', '12.5M', '-bufsize', '25M',
         '-c:a', 'aac', '-ar', '48000', '-b:a', '256k', '-movflags', '+faststart', mp4]
subprocess.run(args, check=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', mp4, '-vf', 'scale=720:1280:flags=lanczos', '-c:v', 'libx264', '-crf', '24',
                '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart',
                'previews/ugc/MyFastRx_UGC5_Autumn_v1_review.mp4'], check=True)
print(json.dumps({'total_s': round(TOTAL, 2), 'pieces': [round(s, 2) for s in starts], 'tl': [round(T_TL0, 2), round(T_TL1, 2)], 'out': mp4}))
