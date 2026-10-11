#!/usr/bin/env python3
"""Video 5 background sound (coded, no generations): an autumn street.
  1. wind bed: low brown noise with slow swells; 2. leaf rustle: short bursts of high, soft noise; 3. a few birds
  (short frequency sweeps); 4. distant traffic rumble; 5. over the time-lapse (--tl0..--tl1): a wind gust (and, with --rewind, a whoosh on the fast rewind) that rises and
  turns colder/brighter (the season passing), birds drop out, then settles back for the sidewalk.
  python3 tools/vid5-ambience.py --dur 18.6 --tl0 6.2 --tl1 9.2 -> audio/ugc/vid5_ambience.wav (48 kHz stereo)"""
import argparse, os, subprocess
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
ap = argparse.ArgumentParser()
for k in ('--dur', '--tl0', '--tl1'): ap.add_argument(k, type=float, required=True)
ap.add_argument('--rewind', type=float, default=None, help='start of the fast rewind at the end of the time-lapse (whoosh)')
a = ap.parse_args()
SR = 48000; N = int(a.dur * SR); t = np.arange(N) / SR
rng = np.random.default_rng(23)
os.makedirs('audio/ugc', exist_ok=True)

def band(x, lo, hi):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    g = 1 / np.sqrt(1 + (f / hi) ** 4) * (1 - 1 / np.sqrt(1 + (f / max(lo, 1)) ** 4) if lo else 1)
    return np.fft.irfft(X * g, len(x))
def norm(x): return x / (np.sqrt((x ** 2).mean()) + 1e-9)
def smooth_env(n_knots, lo, hi):
    k = rng.uniform(lo, hi, n_knots); return np.interp(t, np.linspace(0, a.dur, n_knots), k)

tl = np.clip((t - a.tl0) / (a.tl1 - a.tl0), 0, 1); in_tl = ((t >= a.tl0) & (t <= a.tl1)).astype(float)
gust = np.sin(np.pi * tl) ** 2                                         # rises and falls across the time-lapse

wind = norm(band(rng.normal(0, 1, N), 0, 500)) * smooth_env(9, 0.6, 1.0) * (1 + 1.6 * gust)
whoosh = norm(band(rng.normal(0, 1, N), 900, 4000)) * gust * 0.9        # the bright, cold part of the gust
rust = np.zeros(N)
for c in rng.uniform(0, a.dur, 22):                                    # dry leaves skittering
    env = np.exp(-((t - c) / rng.uniform(0.08, 0.25)) ** 2); rust += env * rng.uniform(0.5, 1.0)
rust = norm(band(rng.normal(0, 1, N), 2000, 7000)) * rust * (1 - 0.7 * in_tl)
birds = np.zeros(N)
for c in [0.9, 2.6, 4.8, 10.4, 12.9, 15.6]:
    if a.tl0 - 0.3 < c < a.tl1 + 0.3: continue
    for j in range(rng.integers(2, 4)):                                 # a two- or three-note call
        s0 = c + j * 0.14; i0 = int(s0 * SR); L = int(0.09 * SR)
        if i0 + L >= N: continue
        tt = np.arange(L) / SR; f0, f1 = rng.uniform(3200, 4200), rng.uniform(4300, 5200)
        ph = 2 * np.pi * np.cumsum(np.linspace(f0, f1, L)) / SR
        birds[i0:i0 + L] += np.sin(ph) * np.sin(np.pi * tt / tt[-1]) ** 2
traffic = norm(band(np.cumsum(rng.normal(0, 1, N)), 20, 250)) * smooth_env(6, 0.5, 1.0)

L_ = 0.020 * wind + 0.010 * whoosh + 0.006 * rust + 0.0045 * birds + 0.008 * traffic
R_ = 0.020 * np.roll(wind, 900) + 0.010 * np.roll(whoosh, 400) + 0.006 * np.roll(rust, 300) + 0.0035 * birds + 0.008 * traffic
if a.rewind is not None:                                  # rewind whoosh: bright noise sweeping up, swelling into the cut
    rw = np.clip((t - a.rewind) / (a.tl1 - a.rewind), 0, 1) * (t <= a.tl1 + 0.08)
    sweep = np.zeros(N); i0 = int(a.rewind * SR); i1 = min(N, int((a.tl1 + 0.08) * SR))
    seg = rng.normal(0, 1, i1 - i0); n = len(seg)
    for j, (lo, hi) in enumerate([(400, 1500), (900, 3000), (2000, 6000), (3500, 9000)]):   # four bands opening up
        w = np.clip(np.linspace(-j, 4 - j, n), 0, 1) * np.clip(np.linspace(4 - j, -j, n) + 1, 0, 1)
        sweep[i0:i1] += norm(band(seg, lo, hi)) * w
    sweep *= rw ** 1.5
    L_ = L_ + 0.016 * sweep; R_ = R_ + 0.016 * np.roll(sweep, 240)
mix = np.stack([L_, R_], 1)
mix *= np.clip(t / 0.3, 0, 1)[:, None] * np.clip((a.dur - t) / 0.6, 0, 1)[:, None]
out = 'audio/ugc/vid5_ambience.wav'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s16le', out],
               input=mix.astype(np.float32).tobytes(), check=True)
print(out)
