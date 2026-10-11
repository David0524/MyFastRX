#!/usr/bin/env python3
"""Coded background sound for the indoor / in-car UGC videos (client, Oct 11: the group chat and the car rant need
"some music or background noise"); sits ~30 dB under the voice, under the music bed.
  --kind home : quiet room tone (low HVAC-like rumble, faint air), a fridge-like hum, a distant car now and then
  --kind car  : parked car interior: low cabin rumble, muffled traffic passing outside, faint indicator-free hiss
  --pops t ... : soft message "pop" sounds (the group-chat bubbles)
  python3 tools/room-tone.py --kind home --dur 22.6 --out audio/ugc/vid1_ambience.wav [--pops 3.3 4.2]"""
import argparse, os, subprocess
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
ap = argparse.ArgumentParser()
ap.add_argument('--kind', choices=['home', 'car'], required=True); ap.add_argument('--dur', type=float, required=True)
ap.add_argument('--out', required=True); ap.add_argument('--pops', type=float, nargs='*', default=[])
a = ap.parse_args()
SR = 48000; N = int(a.dur * SR); t = np.arange(N) / SR
rng = np.random.default_rng(7 if a.kind == 'home' else 9)

def band(x, lo, hi):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    g = 1 / np.sqrt(1 + (f / hi) ** 4) * ((1 - 1 / np.sqrt(1 + (f / lo) ** 4)) if lo else 1)
    return np.fft.irfft(X * g, len(x))
def norm(x): return x / (np.sqrt((x ** 2).mean()) + 1e-9)
def swell(k, lo, hi): return np.interp(t, np.linspace(0, a.dur, k), rng.uniform(lo, hi, k))

if a.kind == 'home':
    rumble = norm(band(np.cumsum(rng.normal(0, 1, N)), 30, 180)) * swell(5, 0.8, 1.0)
    air = norm(band(rng.normal(0, 1, N), 300, 2500)) * swell(6, 0.6, 1.0)
    hum = norm(np.sin(2 * np.pi * 60 * t) + 0.4 * np.sin(2 * np.pi * 120 * t + 1)) * swell(4, 0.5, 1.0)
    cars = np.zeros(N)
    for c in rng.uniform(2, a.dur - 2, 2): cars += np.exp(-((t - c) / 1.4) ** 2)
    cars = norm(band(rng.normal(0, 1, N), 80, 500)) * cars
    L = 0.010 * rumble + 0.004 * air + 0.0025 * hum + 0.004 * cars
    R = 0.010 * np.roll(rumble, 700) + 0.004 * np.roll(air, 300) + 0.0025 * hum + 0.0045 * cars
else:
    cabin = norm(band(np.cumsum(rng.normal(0, 1, N)), 25, 140)) * swell(6, 0.8, 1.0)
    hiss = norm(band(rng.normal(0, 1, N), 400, 1800)) * 0.5
    cars = np.zeros(N)
    for c in rng.uniform(1, a.dur - 1, 4):                   # muffled pass-bys outside the closed car
        cars += np.exp(-((t - c) / rng.uniform(0.9, 1.6)) ** 2) * rng.uniform(0.6, 1.0)
    cars = norm(band(rng.normal(0, 1, N), 60, 380)) * cars
    L = 0.012 * cabin + 0.003 * hiss + 0.008 * cars
    R = 0.012 * np.roll(cabin, 500) + 0.003 * np.roll(hiss, 200) + 0.007 * np.roll(cars, 1200)
for p in a.pops:                                             # soft two-tone message pop
    i0 = int(p * SR); n = int(0.16 * SR)
    if i0 + n > N: continue
    tt = np.arange(n) / SR; f = np.where(tt < 0.06, 1050, 1580)
    pop = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.045) * np.minimum(1, tt / 0.003) * 0.05
    L[i0:i0 + n] += pop; R[i0:i0 + n] += pop
mix = np.stack([L, R], 1) * np.clip(t / 0.2, 0, 1)[:, None] * np.clip((a.dur - t) / 0.6, 0, 1)[:, None]
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s16le', a.out],
               input=mix.astype(np.float32).tobytes(), check=True)
print(a.out)
