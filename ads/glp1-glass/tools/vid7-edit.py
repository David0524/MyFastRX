#!/usr/bin/env python3
"""UGC Video 7 "Tirzepatide online, step by step" (client concept #2, Oct 29; PLAN_TIRZ_NAD_2026-10.md): the edit. New host,
her desk (footage/ref/host2_v7_desk1.png), the coded checkout walkthrough (tools/vid7-screens.py), a doorstep delivery shot
(small white insulated mailer, gloved hand only) and the Tirzepatide end card with promo terms.
  0     hook on camera: "Considering tirzepatide? Here's exactly how getting started online works."
  ~4.8  cut to the website: HOW TO GET STARTED, then stage labels 1 / 2 / 3 above a phone-screen panel; her voice-over (cloned
        from her on-camera voice) line by line on its screen: eligibility, plan, checkout -> medical intake -> provider review
  ~16.5 doorstep: "If prescribed, the pharmacy ships your medication to your door."
  ~20   back to her: "Compounded tirzepatide, starting at a hundred and twenty-nine dollars. Check if you qualify."
  end card (Tirzepatide, no vial, promo terms), 3 s.
Every caption, label and chip stays in the safe zone (x 100-920, captions ending at y 1236); the screen panel sits above them.
  python3 tools/vid7-edit.py   (FMT=45 for the 4:5 Feed version) -> out/ugc/vid7_step_by_step/MyFastRx_UGC7_StepByStep_v1[_4x5].mp4"""
import json, os, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
FMT45 = os.environ.get('FMT') == '45'; Y0 = 150; SUF = '_4x5' if FMT45 else ''
CHIP_Y = Y0 + 1190 if FMT45 else 1500
EC = 'footage/broll/endcard_v3_tirz_4x5.mp4' if FMT45 else 'footage/broll/endcard_v3_tirz.mp4'   # v3 (client, Nov 4: "clean up" the end card)
EC_SCALE = f'scale=1080:1350,pad=1080:1920:0:{Y0}' if FMT45 else 'scale=1080:1920'
PREV_SCALE = 'scale=720:900:flags=lanczos' if FMT45 else 'scale=720:1280:flags=lanczos'
W, H, FPS = 1080, 1920, 30
F = lambda wt, px: ImageFont.truetype(f'assets/fonts/Geist-{wt}.ttf', px)
NAVY, BLUE, WHITE, INK2 = (0, 29, 69), (32, 99, 235), (255, 255, 255), (84, 98, 120)
CX, CAP_Y = 510, 1236
src = open('tools/vid1-edit.py').read(); exec(src[src.index('def chip_png'):src.index('def status_bar')])
v4 = open('tools/vid4-edit.py').read(); exec(v4[v4.index('def caption_png(text'):v4.index('def headline_png(path)')])

OUT = 'out/ugc/vid7_step_by_step'; OV = f'{OUT}/overlays{SUF}'
for d in (OUT, OV, 'previews/ugc'): os.makedirs(d, exist_ok=True)
HOOK, CLOSE, DOOR = 'footage/gen/host2_v7_hook_720p.mp4', 'footage/gen/host2_v7_close_720p.mp4', 'footage/gen/v7_doorstep_720p.mp4'
VO, SCR = 'vo/ugc/host2_v7_vo_steps.wav', 'footage/broll/vid7_screens.mp4'
CLOSE_A = 'audio/ugc/vid7_close_tirzfix.wav'     # client, Nov 4: "tir-zep-a-TADE" -> last syllable from the hook's "-tide" (tools/vid6-tirzfix.py)
# cut points from the 10 ms energy envelope
HOOK_T = (0.0, 4.92)                                   # speech 0.05-4.88: v4 keeps the quiet final "s" of "works" (4.74-4.88; v1-v3 cut it at 4.75)
CLOSE_T = [(0.0, 5.80), (6.15, 7.75)]                  # "...starting at $129." | (pause trimmed) "Check if you qualify."
                                                       # v4: keeps the final "s" of "dollars" (5.60-5.74; v1-v3 cut it at 5.55)
S_LIFT = {'hook': (4.72, 4.90), 'close': (5.58, 5.78)}
RX_LIFT = (1.53, 1.80)    # client, Nov 4 (v5): "cut out a little soon on My Fast Rx": the VO's final "k-s" of "Rx" (27 dB under the vowel) +10 dB  # client, Nov 4: "she misses the plural s twice": the two s's, +8 dB
DOOR_T = (1.82, 5.00)                                  # v4: 0.42 s shorter, pays for the two s's (total stays 30.25 s)                                  # the hand comes in ~1 s into the shot, the mailer settles by the end
VOSEG = {'v1': (0.45, 2.97), 'v2': (3.20, 4.07), 'v3': (4.17, 4.78), 'L2': (5.40, 8.93), 'L3': (9.32, 12.58)}
L2_SPLIT = 6.84 - 5.40                                 # "for a licensed provider to review" starts this far into L2
DURS = [3.0, 1.9, 2.2, 2.05, 2.6]                      # screens: about you, plan, checkout, intake, submitted
END = 3.0

subprocess.run(['python3', 'tools/vid7-screens.py', '--durs'] + [str(d) for d in DURS], check=True)
subprocess.run(['python3', 'tools/endcard-v3.py', '--dur', str(END), '--product', 'tirz'] + (['--fmt', '45'] if FMT45 else []), check=True)

# ---- timeline
T_SCR = HOOK_T[1] - HOOK_T[0]
S = list(np.cumsum([T_SCR] + DURS[:-1]))               # screen starts
T_DOOR = T_SCR + sum(DURS)
T_CL = T_DOOR + (DOOR_T[1] - DOOR_T[0])
T_CL2 = T_CL + (CLOSE_T[0][1] - CLOSE_T[0][0])
TOTAL_A = T_CL2 + (CLOSE_T[1][1] - CLOSE_T[1][0]); TOTAL = TOTAL_A + END
VOAT = {'v1': S[0] + 0.25, 'v2': S[1] + 0.25, 'v3': S[2] + 0.25, 'L2': S[3] + 0.60, 'L3': T_DOOR + 0.12}
assert abs((VOAT['L2'] + L2_SPLIT) - S[4]) < 0.05, 'screen 5 should land on "for a licensed provider"'
cl = lambda s: T_CL + s if s < CLOSE_T[0][1] else T_CL2 + (s - CLOSE_T[1][0])

# ---- the screen panel: brand backdrop (end card gradient + faint grid), the recording cropped to address bar..buttons,
# rounded corners and a soft shadow, placed between the title slot and the captions
CROP_Y0, CROP_Y1 = 120, 1536                           # address pill .. below the buttons (3x of 40..512 pt)
PH = 860; PW = round(W * PH / (CROP_Y1 - CROP_Y0)); PX, PY = CX - PW // 2, 296
yy = np.linspace(0, 1, H)[:, None, None]
top, bot = np.array([251, 249, 245]), np.array([228, 238, 252])
bg = Image.fromarray(((top + (bot - top) * yy ** 1.3) * np.ones((1, W, 1))).astype(np.uint8), 'RGB').convert('RGBA')
grid = Image.new('RGBA', (W, H), (0, 0, 0, 0)); g = ImageDraw.Draw(grid)   # faint: composited, not drawn straight onto the RGB
for x in range(0, W, 72): g.line([(x, 0), (x, H)], fill=(32, 99, 235, 14))
for y in range(0, H, 72): g.line([(0, y), (W, y)], fill=(32, 99, 235, 14))
bg.alpha_composite(grid)
sh = Image.new('RGBA', (W, H), (0, 0, 0, 0)); ImageDraw.Draw(sh).rounded_rectangle((PX, PY + 18, PX + PW, PY + PH + 18), 40, fill=(20, 40, 80, 70))
bg.alpha_composite(sh.filter(ImageFilter.GaussianBlur(26)))
ImageDraw.Draw(bg).rounded_rectangle((PX - 3, PY - 3, PX + PW + 3, PY + PH + 3), 42, outline=(225, 231, 239, 255), width=3)
bg.convert('RGB').save(f'{OV}/panel_bg.png')
mask = Image.new('L', (PW, PH), 0); ImageDraw.Draw(mask).rounded_rectangle((0, 0, PW - 1, PH - 1), 38, fill=255); mask.save(f'{OV}/panel_mask.png')

def title_png(path, s, px=96):
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im); f = F('Bold', px)
    while d.textlength(s, font=f) > 800: px -= 2; f = F('Bold', px)     # safe zone x 100-920 (centre 510)
    w = d.textlength(s, font=f); d.text((CX - w / 2, 200 - px / 2), s, font=f, fill=NAVY); im.save(path)

def stage_png(path, n, label):
    """Numbered stage label in the title slot: blue disc with the number + the stage, on a white pill."""
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im); f = F('Bold', 54); w = d.textlength(label, font=f)
    r = 40; bw = 2 * r + 24 + w + 56; x0 = CX - bw / 2; y0 = 172
    sh_ = Image.new('RGBA', (W, H), (0, 0, 0, 0)); ImageDraw.Draw(sh_).rounded_rectangle((x0, y0 + 10, x0 + bw, y0 + 2 * r + 30), 52, fill=(20, 40, 80, 45))
    im.alpha_composite(sh_.filter(ImageFilter.GaussianBlur(14))); d = ImageDraw.Draw(im)
    d.rounded_rectangle((x0, y0, x0 + bw, y0 + 2 * r + 20), 52, fill=(255, 255, 255, 248))
    cx, cy = x0 + 10 + r, y0 + 10 + r; d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=BLUE)
    fn = F('Bold', 50); s = str(n); d.text((cx - d.textlength(s, font=fn) / 2, cy - 30), s, font=fn, fill=WHITE)
    d.text((cx + r + 24, cy - 34), label, font=f, fill=NAVY); im.save(path)

ov = []
title_png(f'{OV}/title.png', 'HOW TO GET STARTED'); ov.append((f'{OV}/title.png', S[0], S[0] + 1.7))
for n, lab, a_, b_ in [(1, 'Start online', S[0] + 1.7, S[3]), (2, 'Medical intake', S[3], T_DOOR),
                       (3, 'Delivery if prescribed', T_DOOR, T_CL)]:
    p = f'{OV}/stage_{n}.png'; stage_png(p, n, lab); ov.append((p, a_, b_))
CAPS = [['Considering tirzepatide?', 0.0, 1.75, None],
        ["Here's exactly how", 1.75, 3.05, None],
        ['getting started online works.', 3.05, T_SCR, None],
        ['With MyFastRx, check eligibility,', S[0], S[1], None],
        ['choose your plan,', S[1], S[2], None],
        ['and check out.', S[2], S[3], None],
        ['Then complete your medical intake', S[3], S[4], None],
        ['for a licensed provider to review.', S[4], T_DOOR, None],
        ['If prescribed, the pharmacy', T_DOOR, T_DOOR + 1.55, None],
        ['ships your medication to your door.', T_DOOR + 1.55, T_CL, None],
        ['Compounded tirzepatide,', T_CL, cl(2.85), None],
        ['starting at $129.', cl(2.85), T_CL2, 'Introductory offer'],
        ['Check if you qualify.', T_CL2, TOTAL_A, None]]
for i, (tx, a_, b_, q) in enumerate(CAPS):
    p = f'{OV}/cap_{i:02d}.png'; caption_png(tx, p, q); ov.append((p, a_, b_))
p = f'{OV}/chip_price.png'; chip_png(['Compounded Tirzepatide', '$129 first month · Introductory offer'], p, CHIP_Y); ov.append((p, cl(2.85), TOTAL_A))

# ---- sound beds
MUS, ROOM, OUTD = 'audio/ugc/vid7_music_v2.wav', 'audio/ugc/vid7_room.wav', 'audio/ugc/vid7_outdoor.wav'
subprocess.run(['python3', 'tools/music-pop.py', '--dur', f'{TOTAL:.3f}', '--beat', f'{T_SCR:.3f}', '--break', f'{T_DOOR:.3f}', f'{T_CL:.3f}',
                '--endcard', f'{TOTAL_A:.3f}', '--out', MUS], check=True)   # v2 (client, Nov 4: "new and different"): electronic pop, beat in on the website, drums out on the doorstep
subprocess.run(['python3', 'tools/room-tone.py', '--kind', 'home', '--dur', f'{TOTAL_A:.3f}', '--out', ROOM], check=True)
LD = DOOR_T[1] - DOOR_T[0]
subprocess.run(['python3', 'tools/vid5-ambience.py', '--dur', f'{LD:.3f}', '--tl0', f'{LD + 1:.3f}', '--tl1', f'{LD + 2:.3f}', '--out', OUTD], check=True)

def _rms(f, x=None, y=None):
    ex = ['-ss', str(x), '-to', str(y)] if x is not None else []
    raw = subprocess.run(['ffmpeg', '-v', 'error'] + ex + ['-i', f, '-f', 'f32le', '-ac', '1', '-ar', '16000', '-'], capture_output=True, check=True).stdout
    v = np.frombuffer(raw, np.float32); v = v[np.abs(v) > 0.01]; return np.sqrt((v ** 2).mean())
VO_GAIN = _rms(HOOK, 0.1, 4.6) / _rms(VO, 0.45, 12.6)

# ---- compose
ins = [HOOK, CLOSE, DOOR, SCR, f'{OV}/panel_bg.png', f'{OV}/panel_mask.png', EC, VO, MUS, ROOM, OUTD, CLOSE_A]
args = ['ffmpeg', '-v', 'error', '-y']
for i, f in enumerate(ins): args += (['-loop', '1', '-t', str(TOTAL)] if f.endswith('.png') else []) + ['-i', f]
for p, _, _ in ov: args += ['-loop', '1', '-t', str(TOTAL), '-i', p]
OV0 = len(ins)
fc = []
vsc = f'scale={W}:{H}:flags=lanczos,fps={FPS},setsar=1,format=yuv420p'
fc.append(f'[0:v]trim={HOOK_T[0]}:{HOOK_T[1]},setpts=PTS-STARTPTS,{vsc}[vh]')
fc.append(f'[3:v]crop={W}:{CROP_Y1 - CROP_Y0}:0:{CROP_Y0},scale={PW}:{PH}:flags=lanczos,format=rgba[sc]')
fc.append(f'[5:v]format=gray,scale={PW}:{PH}[mk]'); fc.append('[sc][mk]alphamerge[scm]')
fc.append(f'[4:v]trim=0:{sum(DURS):.3f},setpts=PTS-STARTPTS,fps={FPS},format=rgba[pb]')
fc.append(f'[pb][scm]overlay={PX}:{PY}:shortest=1,setsar=1,format=yuv420p[vs]')
fc.append(f'[2:v]trim={DOOR_T[0]}:{DOOR_T[1]},setpts=PTS-STARTPTS,{vsc}[vd]')
for k, (x, y) in enumerate(CLOSE_T): fc.append(f'[1:v]trim={x}:{y},setpts=PTS-STARTPTS,{vsc}[vc{k}]')
fc.append(f'[6:v]{EC_SCALE},fps={FPS},format=yuv420p,setsar=1[ve]')
fc.append('[vh][vs][vd][vc0][vc1][ve]concat=n=6:v=1:a=0[b0]')
last = 'b0'
for k, (p, x, y) in enumerate(ov):
    fc.append(f"[{last}][{OV0 + k}:v]overlay=0:0:shortest=0:enable='between(t,{x:.3f},{y - 0.001:.3f})'[o{k}]"); last = f'o{k}'
# voice: her takes at their places + the voice-over lines on their screens
st = 'aformat=sample_rates=48000:channel_layouts=stereo'
def at(label, src, x, y, t, extra=''):
    ms = int(t * 1000)
    fc.append(f'[{src}]atrim={x:.3f}:{y:.3f},asetpts=PTS-STARTPTS,{st}{extra},afade=t=in:d=0.02,afade=t=out:st={y - x - 0.05:.3f}:d=0.05,adelay={ms}|{ms}[{label}]')
fc.append(f'[0:a]asplit=1[h0]'); fc.append(f'[11:a]asplit=2[c0][c1]'); fc.append(f'[7:a]asplit=5[w0][w1][w2][w3][w4]')
at('ah', 'h0', *HOOK_T, 0.0, f",volume=enable='between(t,{S_LIFT['hook'][0]},{S_LIFT['hook'][1]})':volume=2.5")
at('ac0', 'c0', *CLOSE_T[0], T_CL, f",volume=enable='between(t,{S_LIFT['close'][0]},{S_LIFT['close'][1]})':volume=2.5"); at('ac1', 'c1', *CLOSE_T[1], T_CL2)
for k, key in enumerate(['v1', 'v2', 'v3', 'L2', 'L3']):
    lift = f",volume=enable='between(t,{RX_LIFT[0] - VOSEG['v1'][0]:.3f},{RX_LIFT[1] - VOSEG['v1'][0]:.3f})':volume=3.2" if key == 'v1' else ''
    at(f'av{k}', f'w{k}', *VOSEG[key], VOAT[key], f',highpass=f=90,volume={VO_GAIN:.3f}{lift}')
at('ad', '2:a', *DOOR_T, T_DOOR, ',volume=0.45')                                      # the mailer landing on the mat
fc.append('[ah][ac0][ac1][av0][av1][av2][av3][av4]amix=inputs=8:duration=longest:normalize=0,apad,atrim=0:' + f'{TOTAL:.3f}[voice]')
ms = int(T_DOOR * 1000)
fc.append(f'[9:a]{st},volume=0.9[room]')
fc.append(f'[10:a]{st},adelay={ms}|{ms}[outd]')
fc.append('[voice]asplit=2[vo][vsc]')
fc.append(f'[8:a]{st},volume=0.35[mu]')
fc.append('[mu][vsc]sidechaincompress=threshold=0.015:ratio=4:attack=30:release=350[mud]')
fc.append('[vo][ad][room][outd][mud]amix=inputs=5:duration=first:normalize=0,highpass=f=40,loudnorm=I=-16:TP=-1.5:LRA=11,'
          'alimiter=limit=0.80:level=false[aout]')
name = f'MyFastRx_UGC7_StepByStep_v5{SUF}'; mp4 = f'{OUT}/{name}.mp4'   # v2: closing "tirzepatide" fixed; v3: new music + end card v3
if FMT45: fc.append(f'[{last}]crop=1080:1350:0:{Y0}[fmt45]'); last = 'fmt45'
args += ['-filter_complex', ';'.join(fc), '-map', f'[{last}]', '-map', '[aout]', '-t', f'{TOTAL:.3f}', '-r', str(FPS),
         '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-b:v', '12M', '-maxrate', '12.5M', '-bufsize', '25M',
         '-c:a', 'aac', '-ar', '48000', '-b:a', '256k', '-movflags', '+faststart', mp4]
subprocess.run(args, check=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', mp4, '-vf', PREV_SCALE, '-c:v', 'libx264', '-crf', '24', '-preset', 'medium',
                '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', f'previews/ugc/{name}_review.mp4'], check=True)
print(json.dumps({'total_s': round(TOTAL, 2), 'screens': [round(x, 2) for x in S], 'door': round(T_DOOR, 2), 'close': round(T_CL, 2), 'out': mp4}))
