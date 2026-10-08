#!/usr/bin/env python3
"""Video 4 background sound (client: "we also need background noise"), built without new generations:
  1. station room tone: the 5 s ambience track of the rejected AI pump B-roll (footage/gen/vid4_pump_broll.mp4, no speech),
     looped forward/reversed with crossfades so the repeat is not audible;
  2. traffic: low brown-noise rumble with slow swells + a few cars passing;
  3. the pump: motor whir while she is filling up, a shut-off click at --stop (when "the price doesn't"), then quiet.
  python3 tools/vid4-ambience.py --dur 24.32 --stop 18.54 -> audio/ugc/vid4_ambience.wav (48 kHz stereo, about -31 LUFS: ~15 dB under the voice)"""
import argparse, os, subprocess
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
ap = argparse.ArgumentParser(); ap.add_argument('--dur', type=float, required=True); ap.add_argument('--stop', type=float, required=True)
a = ap.parse_args()
SR = 48000; N = int(a.dur * SR); t = np.arange(N) / SR
rng = np.random.default_rng(11)
os.makedirs('audio/ugc', exist_ok=True)

# 1. room tone loop
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', 'footage/gen/vid4_pump_broll.mp4', '-vn', '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'],
                     capture_output=True, check=True).stdout
src = np.frombuffer(raw, np.float32).reshape(-1, 2)[int(0.2 * SR):-int(0.2 * SR)]
xf = int(0.6 * SR); bed = np.zeros((N + len(src), 2), np.float32); pos = 0; k = 0
ramp = np.linspace(0, 1, xf)[:, None]
while pos < N:
    seg = src if k % 2 == 0 else src[::-1]
    seg = seg.copy(); seg[:xf] *= ramp; seg[-xf:] *= ramp[::-1]
    bed[pos:pos + len(seg)] += seg; pos += len(seg) - xf; k += 1
bed = bed[:N]

# 2. traffic rumble + pass-bys
def brown(n):
    w = rng.normal(0, 1, n); b = np.cumsum(w); b -= np.convolve(b, np.ones(4801) / 4801, 'same'); return b / (np.abs(b).max() + 1e-9)
def lowpass(x, fc):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    return np.fft.irfft(X / np.sqrt(1 + (f / fc) ** 4), len(x))           # 2nd-order-like roll-off
rumble = lowpass(brown(N), 300) * (0.75 + 0.25 * np.sin(2 * np.pi * t / 7.3))
cars = np.zeros(N)
for c in (4.6, 11.8, 20.4):
    env = np.exp(-((t - c) / 1.1) ** 2)
    cars += lowpass(rng.normal(0, 1, N), 900) * env
traffic = np.stack([rumble * 0.9 + cars * 0.8, rumble * 0.8 + cars * 0.9], 1)

# 3. pump motor whir (until the stop) + shut-off click
run = np.clip((a.stop - t) / 0.08, 0, 1)                               # motor cuts at the stop
whir = (0.5 * np.sin(2 * np.pi * 118 * t) + 0.25 * np.sin(2 * np.pi * 236 * t + 1) + 0.12 * np.sin(2 * np.pi * 354 * t)) \
       * (0.85 + 0.15 * np.sin(2 * np.pi * 3.1 * t))
whir = whir * 0.5 + lowpass(rng.normal(0, 1, N), 1800) * 0.6          # motor tone + fuel-flow hiss
whir *= run
click = np.zeros(N); i0 = int(a.stop * SR); L = int(0.09 * SR)
click[i0:i0 + L] = rng.normal(0, 1, L) * np.exp(-np.arange(L) / (0.012 * SR)) + 0.6 * np.sin(2 * np.pi * 900 * np.arange(L) / SR) * np.exp(-np.arange(L) / (0.02 * SR))
pump = np.stack([whir + click * 2.2, whir * 0.9 + click * 2.0], 1)

def norm(x): return x / (np.sqrt((x ** 2).mean()) + 1e-9)
mix = 0.020 * norm(bed) + 0.012 * norm(traffic)
pump_n = pump / (np.sqrt((pump[:i0] ** 2).mean()) + 1e-9)   # level set by the running motor, the click rides on top
mix = mix + 0.011 * pump_n
fade = np.clip((a.dur - t) / 0.6, 0, 1)[:, None]                         # fade into the end card
mix = (mix * fade).astype(np.float32)
out = 'audio/ugc/vid4_ambience.wav'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s16le', out],
               input=mix.tobytes(), check=True)
print(out)
