#!/usr/bin/env python3
"""Video 5, clip C2: Seedance said "My Fast R-P" (no closing "ks"; Whisper hears "RP" even when prompted with "Rx").
Free fix: swap the 0.52 s "R-P" (2.60-3.12 s) for Dana's "R-x" from the approved Video 4 take (footage/gen/vid4_clip2.mp4,
2.90-3.42 s; same length, so nothing after it moves), level-matched on the vowel, 12 ms crossfades.
  python3 tools/vid5-rxfix.py -> audio/ugc/vid5_c2_rxfix.wav (48 kHz stereo, full 10 s clip audio; used by vid5-edit)"""
import os, subprocess
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
SR = 48000
def load(f):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-vn', '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()
c = load('footage/gen/vid5_sidewalk_c2.mp4'); v = load('footage/gen/vid4_clip2.mp4')
a0, a1 = int(2.60 * SR), int(3.12 * SR); b0 = int(2.90 * SR); L = a1 - a0
def rms(x): return np.sqrt((x ** 2).mean())
patch = v[b0:b0 + L] * (rms(c[int(2.62 * SR):int(2.74 * SR)]) / rms(v[int(2.92 * SR):int(3.10 * SR)]))
xf = int(0.012 * SR); r = np.linspace(0, 1, xf)[:, None]; seg = c[a0:a1]
seg[:xf] = seg[:xf] * (1 - r) + patch[:xf] * r; seg[xf:-xf] = patch[xf:-xf]; seg[-xf:] = seg[-xf:] * r + patch[-xf:] * (1 - r)
os.makedirs('audio/ugc', exist_ok=True); out = 'audio/ugc/vid5_c2_rxfix.wav'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s16le', out], input=c.tobytes(), check=True)
print(out)
