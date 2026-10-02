#!/usr/bin/env python3
"""The client's music track -> the music bed stem (v6: audio/stems/v6_music_track.wav; v7: MUSIC_TRACK.stem).
  python3 tools/music-from-track.py [src/v6/timeline.mjs]
Places the track so its drop lands on MUSIC_TRACK.at (src/v6/timeline.mjs), trims it to the film, fades the head in, lifts the
soft start of its build (MUSIC_TRACK.lift) and the tail out over the last `fadeOut` s, ducks it under the measured VO windows
(80 ms in, 300 ms out, as the coded bed did), and sets it to the coded bed's integrated loudness so the mix balance holds."""
import json, subprocess, numpy as np
import sys
TLF = sys.argv[1] if len(sys.argv) > 1 else 'src/v6/timeline.mjs'
TL = json.loads(subprocess.check_output(['node', '-e', "import('./'+process.argv[1]).then(t=>console.log(JSON.stringify({M:t.MUSIC_TRACK,VO:t.VO,D:t.DURATION})))", TLF]))
M, VO, D, SR = TL['M'], TL['VO'], TL['D'], 48000
off = M['drop'] - M['at']
x = np.frombuffer(subprocess.check_output(['ffmpeg', '-v', 'error', '-i', M['src'], '-ss', f'{max(0, off):.4f}', '-t', f'{D:.4f}', '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-']), np.float32).reshape(-1, 2).copy()
N = round(D * SR); y = np.zeros((N, 2), np.float32); y[:min(N, len(x))] = x[:N]
t = np.arange(N) / SR
env = np.clip(t / .05, 0, 1) * np.clip((D - .02 - t) / M['fadeOut'], 0, 1) ** 1.5
duck = np.ones(N); g = 10 ** (M['duckDb'] / 20)
for k, v in enumerate(VO):   # 1 inside a window, ramps: 80 ms before, 300 ms after
    a, b = v['t0'], v['t1']; g = 10 ** ((M['endDuckDb'] if k == len(VO) - 1 else M['duckDb']) / 20)
    w = np.clip(np.minimum((t - (a - .08)) / .08, ((b + .3) - t) / .3), 0, 1)
    duck = np.minimum(duck, 1 - w * (1 - g))
lt, ld = zip(*M['lift']); lift = 10 ** (np.interp(t, lt, ld) / 20)
y *= (env * duck * lift)[:, None]
tmp = 'out/music_track_raw.wav'; import wave, os; os.makedirs('out', exist_ok=True)
def write(path, a):
    with wave.open(path, 'wb') as f: f.setnchannels(2); f.setsampwidth(3); f.setframerate(SR); q = np.clip(a, -1, 1 - 2**-23); i = (q * 2**23).astype('<i4'); f.writeframes(np.stack([i & 255, (i >> 8) & 255, (i >> 16) & 255], -1).astype(np.uint8).tobytes())
write(tmp, y)
lufs = float(subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', tmp, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr.split('Integrated loudness:')[1].split('I:')[1].split('LUFS')[0])
y *= 10 ** ((M['lufs'] - lufs) / 20); write(M.get('stem', 'audio/stems/v6_music_track.wav'), y); os.remove(tmp)
print(f'offset {off:.2f} s, measured {lufs:.1f} LUFS -> {M["lufs"]} LUFS, peak {20*np.log10(np.abs(y).max()):.1f} dBFS')
