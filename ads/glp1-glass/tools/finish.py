#!/usr/bin/env python3
"""Finishing pass for the UGC edits (client, Nov 4): takes a body render (picture + her voice + ambience, captions burned in,
no music, no end card), speeds it up (client: "she's talking too slow... 1.15x"; atempo keeps her pitch), builds the music to
the sped-up timeline (tools/music-upbeat.py), ducks it under her, appends the end card at normal speed (so the fine print keeps
its full reading time) and masters to -16 LUFS / -1.5 dBTP.
  python3 tools/finish.py --body body.mp4 --speed 1.15 --endcard footage/broll/endcard_v3_tirz.mp4 --beat 2.53 [--break a b]
                          --name MyFastRx_UGC6_HigherDose_A_v5 --outdir out/ugc/vid6_higher_dose
  --beat / --break are times on the BODY's own (pre-speed) timeline; they are divided by --speed here."""
import argparse, json, os, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
ap = argparse.ArgumentParser()
for k in ('--body', '--endcard', '--name', '--outdir'): ap.add_argument(k, required=True)
ap.add_argument('--speed', type=float, default=1.15); ap.add_argument('--beat', type=float, required=True)
ap.add_argument('--break', dest='brk', type=float, nargs=2, default=None); ap.add_argument('--end', type=float, default=3.0)
a = ap.parse_args()
dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', a.body],
                           capture_output=True, text=True, check=True).stdout)
w, h = map(int, subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', a.body],
                               capture_output=True, text=True, check=True).stdout.strip().split(','))
LB = dur / a.speed; TOTAL = LB + a.end
MUS = f'audio/ugc/{a.name}_music.wav'
cmd = ['python3', 'tools/music-upbeat.py', '--dur', f'{TOTAL:.3f}', '--beat', f'{a.beat / a.speed:.3f}', '--endcard', f'{LB:.3f}', '--out', MUS]
if a.brk: cmd += ['--break', f'{a.brk[0] / a.speed:.3f}', f'{a.brk[1] / a.speed:.3f}']
subprocess.run(cmd, check=True)
os.makedirs(a.outdir, exist_ok=True); mp4 = f'{a.outdir}/{a.name}.mp4'
fc = [f'[0:v]setpts=PTS/{a.speed},fps=30,format=yuv420p,setsar=1[vb]',
      f'[1:v]scale={w}:{h},fps=30,format=yuv420p,setsar=1,trim=0:{a.end},setpts=PTS-STARTPTS[ve]',
      '[vb][ve]concat=n=2:v=1:a=0[v]',
      f'[0:a]atempo={a.speed},aformat=sample_rates=48000:channel_layouts=stereo,apad=whole_dur={TOTAL:.3f}[body]',
      '[body]asplit=2[vo][sc]',
      '[2:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=0.42[mu]',
      '[mu][sc]sidechaincompress=threshold=0.02:ratio=5:attack=20:release=300[mud]',
      '[vo][mud]amix=inputs=2:duration=first:normalize=0,highpass=f=40,loudnorm=I=-16:TP=-1.5:LRA=11,alimiter=limit=0.80:level=false[aout]']
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', a.body, '-i', a.endcard, '-i', MUS, '-filter_complex', ';'.join(fc),
                '-map', '[v]', '-map', '[aout]', '-t', f'{TOTAL:.3f}', '-r', '30',
                '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-b:v', '12M', '-maxrate', '12.5M', '-bufsize', '25M',
                '-c:a', 'aac', '-ar', '48000', '-b:a', '256k', '-movflags', '+faststart', mp4], check=True)
prev = 'scale=720:900:flags=lanczos' if h == 1350 else 'scale=720:1280:flags=lanczos'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', mp4, '-vf', prev, '-c:v', 'libx264', '-crf', '24', '-preset', 'medium', '-pix_fmt', 'yuv420p',
                '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', f'previews/ugc/{a.name}_review.mp4'], check=True)
print(json.dumps({'body_s': round(dur, 2), 'final_s': round(TOTAL, 2), 'out': mp4}))
