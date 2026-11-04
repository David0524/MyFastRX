#!/usr/bin/env python3
"""UGC Video 6 "Higher dose. Same price." (Tirzepatide; PLAN_TIRZ_NAD_2026-10.md, STORYBOARD_UGC.md): the edit. The new host
(footage/ref/host2_v2_B1_4.png, voice ref vo/ugc/host2_voice_Naomi.wav), three Seedance 2.5 720p takes + the coded dose graphic.
  kitchen hook (A: "Okay so... tirzepatide doses usually go up over time. At My Fast Rx? The price doesn't."
                B: "The tirzepatide price thing nobody really explains." then Hook A from "doses...")
  -> the dose-vs-price graphic (tools/dose-graphic.py) takes over from "usually go up over time" (lines step up in sync),
     then her voice-over "No surprise refill charges either." (Seed Audio, Naomi) on the "No automatic refill billing" chip
  -> front steps: "I actually double-checked that. Compounded tirzepatide starts at a hundred and twenty-nine dollars, first
     month. Check if you qualify... takes like a minute." (audio: tools/vid6-tirzfix.py, the last syllable of "tirzepatide" fixed)
  -> end card v2, Tirzepatide version, no vial (tools/endcard-v2.py --product tirz), 3 s.
Headline HIGHER DOSE. SAME PRICE. from frame 1 (client's concept). No MY70, no regular price (client, Oct 29).
Room tone in the kitchen, outdoor ambience on the steps, the coded music bed (beat comes in on the steps), ducked under her.
  python3 tools/vid6-edit.py [--hook A|B]   (FMT=45 for the 4:5 Feed version)
  -> out/ugc/vid6_higher_dose/MyFastRx_UGC6_HigherDose_<hook>_v1[_4x5].mp4 + previews/ugc/..._review.mp4"""
import argparse, json, os, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
ap = argparse.ArgumentParser(); ap.add_argument('--hook', choices=['A', 'B'], default='A'); a = ap.parse_args()
FMT45 = os.environ.get('FMT') == '45'; Y0 = 150; SUF = '_4x5' if FMT45 else ''
CHIP_Y = Y0 + 1190 if FMT45 else 1500
EC = 'footage/broll/endcard_v2_tirz_4x5.mp4' if FMT45 else 'footage/broll/endcard_v2_tirz.mp4'
EC_SCALE = f'scale=1080:1350,pad=1080:1920:0:{Y0}' if FMT45 else 'scale=1080:1920'
PREV_SCALE = 'scale=720:900:flags=lanczos' if FMT45 else 'scale=720:1280:flags=lanczos'
W, H = 1080, 1920
F = lambda wt, px: ImageFont.truetype(f'assets/fonts/Geist-{wt}.ttf', px)
NAVY, BLUE, WHITE = (0, 29, 69), (32, 99, 235), (255, 255, 255)
CX, CAP_Y = 510, 1236
src = open('tools/vid1-edit.py').read()          # the series' chip and caption styles, exactly as Videos 1/4/5 have them
exec(src[src.index('def chip_png'):src.index('def status_bar')])
v4 = open('tools/vid4-edit.py').read()
exec(v4[v4.index('def caption_png'):v4.index('def headline_png')])

OUT = 'out/ugc/vid6_higher_dose'; OV = f'{OUT}/overlays_{a.hook}{SUF}'
for d in (OUT, OV, 'previews/ugc', 'footage/broll'): os.makedirs(d, exist_ok=True)
HA, HB, ST = 'footage/gen/host2_v6_hookA_720p.mp4', 'footage/gen/host2_v6_hookB_720p.mp4', 'footage/gen/host2_v6_steps_720p.mp4'
STA = 'audio/ugc/vid6_steps_tirzfix.wav'           # the steps take's audio with "tirzepatide" fixed
VO = 'vo/ugc/host2_v6_vo_dose.wav'
VO_T = (5.02, 7.30)                                # "No surprise refill charges either." (the file ends inside "either": faded)
VO_GAP = 0.12
END = 3.0
# Word times (faster-whisper, checked against the 10 ms energy envelope):
#   Hook A: Okay 0.6-1.02 | so 1.54 | tirzepatide 1.68-2.60 | doses 2.60-3.00 | usually 3.00 | go up over time 3.48-4.84 |
#           At My Fast Rx 5.48-6.56 | the price doesn't 7.02-7.84
#   Hook B: The tirzepatide price thing 0.3-2.80 | nobody really explains 3.28-4.38 (fades out by 4.72)
#   Steps:  I actually double-checked that 0.3-2.20 | Compounded tirzepatide 3.00-4.46 | starts at $129 4.46-6.28 |
#           first month 7.02-8.20 | Check if you qualify 8.86-10.04 | takes like a minute 10.64-11.58
G0 = 3.00 if a.hook == 'A' else 2.62               # Hook A source time where the graphic takes over
if a.hook == 'A': HOOK = [(HA, 0.45, G0)]
else:             HOOK = [(HB, 0.00, 4.65)]
G_LEN = (7.95 - G0) + VO_GAP + (VO_T[1] - VO_T[0])
PIECES = HOOK + [('G', 0.0, G_LEN), (ST, 0.0, 11.80)]
PIECES = [(f, round(x * 30) / 30, round(y * 30) / 30) for f, x, y in PIECES]
starts = []; t = 0.0
for f, x, y in PIECES: starts.append(t); t += y - x
TOTAL_A = t; TOTAL = t + END
T_G, T_ST = starts[-2], starts[-1]
ha = lambda s: T_G + (s - G0)                      # Hook A source time -> timeline, inside the graphic piece
st = lambda s: T_ST + s
T_VO = ha(7.95) + VO_GAP

# ---- the graphic: steps rise under "usually go up over time", chip 1 on "the price doesn't", chip 2 with the voice-over
DOSE = f'footage/broll/vid6_dose_{a.hook}.mp4'
subprocess.run(['python3', 'tools/dose-graphic.py', '--dur', f'{G_LEN + 0.05:.3f}', '--out', DOSE,
                '--chips', f'{7.0 - G0:.2f}', f'{T_VO - T_G + 0.05:.2f}'], check=True)

if a.hook == 'A':
    CAPS = [['Okay so...', starts[0], starts[0] + 1.5 - 0.45, None],
            ['tirzepatide doses', starts[0] + 1.5 - 0.45, T_G, None]]
else:
    CAPS = [['The tirzepatide price thing', 0.0, 3.0, None],
            ['nobody really explains.', 3.0, T_G, None],
            ['Doses', T_G, ha(3.0), None]]
CAPS += [['usually go up over time.', ha(3.0), ha(5.3), None],
         ['At MyFastRx?', ha(5.3), ha(6.9), None],
         ["The price doesn't.", ha(6.9), T_VO, None],
         ['No surprise refill charges either.', T_VO, T_ST, None],
         ['I actually double-checked that.', st(0.0), st(2.9), None],
         ['Compounded tirzepatide', st(2.9), st(4.46), None],
         ['starts at $129, first month.', st(4.46), st(8.5), 'Introductory offer'],
         ['Check if you qualify,', st(8.5), st(10.4), None],
         ['takes like a minute.', st(10.4), TOTAL_A, None]]
CHIPS = [(['Compounded Tirzepatide', '$129 first month · Introductory offer'], st(4.46), st(8.5))]

def headline_png(path):
    """HIGHER DOSE. / SAME PRICE. on a white panel at the top, from frame 1 (the graphic repeats it as its title)."""
    # v2 (client, Nov 4: "covering her face"): moved from y 300 (eyes) to below her chin, above the captions (her chin ~820,
    # captions 1172-1236 in the 1920 frame), and a little smaller
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im); f = F('Bold', 72)
    l1, l2 = 'HIGHER DOSE.', 'SAME PRICE.'; w = max(d.textlength(l1, font=f), d.textlength(l2, font=f)); y = 890
    d.rounded_rectangle((CX - w / 2 - 36, y - 20, CX + w / 2 + 36, y + 186), 30, fill=(255, 255, 255, 240))
    d.text((CX - d.textlength(l1, font=f) / 2, y), l1, font=f, fill=NAVY)
    d.text((CX - d.textlength(l2, font=f) / 2, y + 86), l2, font=f, fill=BLUE); im.save(path)

ov = []
for i, (tx, x, y, q) in enumerate(CAPS):
    p = f'{OV}/cap_{i:02d}.png'; caption_png(tx, p, q); ov.append((p, x, y))
for i, (lines, x, y) in enumerate(CHIPS):
    p = f'{OV}/chip_{i}.png'; chip_png(lines, p, CHIP_Y); ov.append((p, x, y))
headline_png(f'{OV}/headline.png'); ov.append((f'{OV}/headline.png', 0.0, T_G))

# ---- sound beds
subprocess.run(['python3', 'tools/endcard-v2.py', '--dur', str(END), '--product', 'tirz'] + (['--fmt', '45'] if FMT45 else []), check=True)
MUS, ROOM, OUTD = f'audio/ugc/vid6_music_{a.hook}.wav', f'audio/ugc/vid6_room_{a.hook}.wav', 'audio/ugc/vid6_outdoor.wav'
subprocess.run(['python3', 'tools/vid5-music.py', '--dur', f'{TOTAL:.3f}', '--bar0', '0.0', '--beat', f'{T_ST:.3f}',
                '--endcard', f'{TOTAL_A:.3f}', '--lift', f'{TOTAL_A:.3f}', f'{TOTAL + 1:.3f}', '--out', MUS], check=True)  # beat on the move outside
subprocess.run(['python3', 'tools/room-tone.py', '--kind', 'home', '--dur', f'{T_ST:.3f}', '--out', ROOM], check=True)
LEN_ST = PIECES[-1][2] - PIECES[-1][1]
subprocess.run(['python3', 'tools/vid5-ambience.py', '--dur', f'{LEN_ST:.3f}', '--tl0', f'{LEN_ST + 1:.3f}',
                '--tl1', f'{LEN_ST + 2:.3f}', '--out', OUTD], check=True)          # birds, leaves, distant traffic; no gust

def _rms(f, x=None, y=None):
    ex = ['-ss', str(x), '-to', str(y)] if x is not None else []
    raw = subprocess.run(['ffmpeg', '-v', 'error'] + ex + ['-i', f, '-f', 'f32le', '-ac', '1', '-ar', '16000', '-'], capture_output=True, check=True).stdout
    v = np.frombuffer(raw, np.float32); v = v[np.abs(v) > 0.01]; return np.sqrt((v ** 2).mean())
VO_GAIN = _rms(HA, 1.5, 7.9) / _rms(VO, *VO_T)

# ---- compose
args = ['ffmpeg', '-v', 'error', '-y', '-i', HA, '-i', HB, '-i', ST, '-i', STA, '-i', VO, '-i', DOSE, '-i', EC,
        '-i', MUS, '-i', ROOM, '-i', OUTD]
for p, _, _ in ov: args += ['-loop', '1', '-t', str(TOTAL), '-i', p]
VIN = {HA: 0, HB: 1, ST: 2}
fc, vl, al = [], [], []
for k, (f, x, y) in enumerate(PIECES):
    if f == 'G':
        fc.append(f'[5:v]fps=30,trim=0:{y:.5f},setpts=PTS-STARTPTS,scale={W}:{H},setsar=1,format=yuv420p[v{k}]')
        vo_d = int((T_VO - T_G) * 1000)
        fc.append(f'[0:a]atrim={G0:.5f}:7.95,asetpts=PTS-STARTPTS,aformat=sample_rates=48000:channel_layouts=stereo,afade=t=out:st={7.95 - G0 - 0.04:.3f}:d=0.04[gh]')
        fc.append(f'[4:a]atrim={VO_T[0]:.3f}:{VO_T[1]:.3f},asetpts=PTS-STARTPTS,aformat=sample_rates=48000:channel_layouts=stereo,'
                  f'highpass=f=90,volume={VO_GAIN:.3f},afade=t=out:st={VO_T[1] - VO_T[0] - 0.08:.3f}:d=0.08,adelay={vo_d}|{vo_d}[gv]')
        fc.append(f'[gh][gv]amix=inputs=2:duration=longest:normalize=0,apad,atrim=0:{y:.5f}[a{k}]')
    else:
        fc.append(f'[{VIN[f]}:v]fps=30,trim={x:.5f}:{y:.5f},setpts=PTS-STARTPTS,scale={W}:{H}:flags=lanczos,setsar=1,format=yuv420p[v{k}]')
        ain = '3:a' if f == ST else f'{VIN[f]}:a'
        fc.append(f'[{ain}]atrim={x:.5f}:{y:.5f},asetpts=PTS-STARTPTS,aformat=sample_rates=48000:channel_layouts=stereo,'
                  f'afade=t=in:d=0.02,afade=t=out:st={y - x - 0.04:.3f}:d=0.04[a{k}]')
    vl.append(f'[v{k}]'); al.append(f'[a{k}]')
fc.append(f'[6:v]{EC_SCALE},fps=30,format=yuv420p,setsar=1[ve]')
fc.append(f'anullsrc=r=48000:cl=stereo,atrim=0:{END}[ae]')
fc.append(''.join(vl) + f'[ve]concat=n={len(vl) + 1}:v=1:a=0[b0]')
last = 'b0'
for k, (p, x, y) in enumerate(ov):
    fc.append(f"[{last}][{10 + k}:v]overlay=0:0:shortest=0:enable='between(t,{x:.3f},{y - 0.001:.3f})'[o{k}]"); last = f'o{k}'
fc.append(''.join(al) + f'[ae]concat=n={len(PIECES) + 1}:v=0:a=1[voice]')
d_st = int(T_ST * 1000)
fc.append(f'[8:a]aformat=sample_rates=48000:channel_layouts=stereo,afade=t=out:st={T_ST - 0.3:.3f}:d=0.3[room]')
fc.append(f'[9:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay={d_st}|{d_st}[outd]')
fc.append('[voice]asplit=2[vo][vsc]')
fc.append('[7:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=0.35[mu]')
fc.append('[mu][vsc]sidechaincompress=threshold=0.015:ratio=4:attack=30:release=350[mud]')
fc.append('[vo][room][outd][mud]amix=inputs=4:duration=first:normalize=0,highpass=f=40,loudnorm=I=-16:TP=-1.5:LRA=11,'
          'alimiter=limit=0.80:level=false[aout]')
name = f'MyFastRx_UGC6_HigherDose_{a.hook}_v1{SUF}'
mp4 = f'{OUT}/{name}.mp4'
if FMT45: fc.append(f'[{last}]crop=1080:1350:0:{Y0}[fmt45]'); last = 'fmt45'
args += ['-filter_complex', ';'.join(fc), '-map', f'[{last}]', '-map', '[aout]', '-t', f'{TOTAL:.3f}', '-r', '30',
         '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-b:v', '12M', '-maxrate', '12.5M', '-bufsize', '25M',
         '-c:a', 'aac', '-ar', '48000', '-b:a', '256k', '-movflags', '+faststart', mp4]
subprocess.run(args, check=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', mp4, '-vf', PREV_SCALE, '-c:v', 'libx264', '-crf', '24', '-preset', 'medium',
                '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', f'previews/ugc/{name}_review.mp4'], check=True)
print(json.dumps({'total_s': round(TOTAL, 2), 'pieces': [round(s, 2) for s in starts], 'graphic': [round(T_G, 2), round(T_ST, 2)],
                  'vo_at': round(T_VO, 2), 'out': mp4}))
