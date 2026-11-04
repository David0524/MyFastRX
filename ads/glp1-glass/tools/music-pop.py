#!/usr/bin/env python3
"""Music bed v2 (client, Nov 4, on Video 7: "I do not like the music. Redo it with something new and different"). Coded, so it is
ours outright (no licence question for paid ads). A completely different style from the fingerpicked guitar (tools/vid5-music.py):
bright, warm modern electronic pop, 104 bpm, F major, I-iii-vi-IV (Fmaj7 Am7 Dm7 Bbmaj7):
  intro    (0 .. --beat): electric-piano chords + airy pad only
  groove   (--beat ..): soft four-on-the-floor kick, claps on 2 and 4, 16th shaker, round sub bass, a high pluck motif
  break    (--break t0 t1, optional): drums out, keys + pluck carry (a lift for a B-roll moment)
  ending   (--endcard ..): one last bar, then the I chord rings out under the end card
Electric piano = 2-operator FM with a decaying index (Rhodes-like bell + body) and a slow tremolo; pad = detuned saws through a
one-pole low-pass; bus: soft saturation + a small stereo room (Schroeder) + gentle high-shelf air. Ducking is done in the edit.
  python3 tools/music-pop.py --dur 30.25 --beat 4.75 --break 16.5 20.1 --endcard 27.25 --out audio/ugc/vid7_music_v2.wav"""
import argparse, os, subprocess
import numpy as np
from scipy.signal import fftconvolve, lfilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
ap = argparse.ArgumentParser(); ap.add_argument('--dur', type=float, required=True); ap.add_argument('--beat', type=float, required=True)
ap.add_argument('--break', dest='brk', type=float, nargs=2, default=None); ap.add_argument('--endcard', type=float, required=True)
ap.add_argument('--bpm', type=float, default=104); ap.add_argument('--out', required=True); a = ap.parse_args()
SR = 48000; N = int((a.dur + 1.5) * SR); BEAT = 60 / a.bpm; BAR = 4 * BEAT
rng = np.random.default_rng(104)
L = np.zeros(N); R = np.zeros(N)
def hz(m): return 440 * 2 ** ((m - 69) / 12)
def add(sig, t, pan=0.0, g=1.0):
    i = int(t * SR)
    if i >= N or i + len(sig) <= 0: return
    s = sig[max(0, -i):max(0, min(len(sig), N - i))]; i = max(0, i)
    L[i:i + len(s)] += s * g * np.sqrt(0.5 * (1 - pan)); R[i:i + len(s)] += s * g * np.sqrt(0.5 * (1 + pan))

def epiano(m, d, vel=1.0):
    n = int((d + 1.2) * SR); t = np.arange(n) / SR; f = hz(m)
    idx = 2.2 * vel * np.exp(-t * 6) + 0.35                           # bright attack, mellow body
    mod = np.sin(2 * np.pi * f * t) * idx
    car = np.sin(2 * np.pi * f * t + mod) + 0.25 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 9)
    env = np.minimum(t / 0.004, 1) * np.exp(-t * 1.6) * np.where(t < d, 1, np.exp(-(t - d) * 9))
    return car * env * (1 + 0.12 * np.sin(2 * np.pi * 5.2 * t)) * 0.16 * vel
def pad(ms, d):
    n = int((d + 0.6) * SR); t = np.arange(n) / SR; s = np.zeros(n)
    for m in ms:
        for det in (-0.08, 0.0, 0.07):
            ph = (hz(m) * 2 ** (det / 12) * t + rng.random()) % 1; s += 2 * ph - 1
    y = lfilter([0.04], [1, -0.96], s)                                # one-pole low-pass: soft, airy
    env = np.minimum(t / 0.5, 1) * np.where(t < d, 1, np.exp(-(t - d) * 6))
    return y * env * 0.018
def sub(m, d):
    n = int(d * SR); t = np.arange(n) / SR
    s = np.tanh(1.6 * np.sin(2 * np.pi * hz(m) * t)) * np.minimum(t / 0.006, 1) * np.exp(-t * 2.2) * np.minimum((d - t) / 0.03, 1)
    return s * 0.30
def kick():
    n = int(0.32 * SR); t = np.arange(n) / SR; f = 45 + 75 * np.exp(-t * 35)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 11) * 0.55
def clap():
    n = int(0.22 * SR); t = np.arange(n) / SR; nz = rng.standard_normal(n)
    nz = np.diff(np.concatenate([[0], nz]))                          # crude high-pass
    env = sum(np.exp(-np.maximum(t - o, 0) * 60) * (t >= o) for o in (0, 0.012, 0.024)) * np.exp(-t * 12)
    return nz * env * 0.09
def shaker(acc=1.0):
    n = int(0.06 * SR); t = np.arange(n) / SR; nz = np.diff(np.concatenate([[0], rng.standard_normal(n)]))
    return nz * np.minimum(t / 0.008, 1) * np.exp(-t * 70) * 0.035 * acc
def pluck(m, d=0.35):
    n = int(d * SR); t = np.arange(n) / SR; f = hz(m)
    s = (np.abs(((f * t) % 1) * 4 - 2) - 1) + 0.3 * np.sin(2 * np.pi * 2 * f * t)   # triangle + octave
    return s * np.minimum(t / 0.002, 1) * np.exp(-t * 9) * 0.07

CHORDS = [  # (bass, voicing) F major: Fmaj7 Am7 Dm7 Bbmaj7
    (41, [57, 60, 64, 65]), (45, [57, 60, 64, 67]), (38, [57, 60, 62, 65]), (46, [58, 62, 65, 69])]
MOTIF = [(0, 72), (0.75, 74), (1.5, 76), (2.5, 74), (3.0, 72)]        # beats within the bar, MIDI notes (C5 D5 E5)
in_brk = lambda t: a.brk is not None and a.brk[0] <= t < a.brk[1]
# bars are locked to --beat (a bar starts exactly there); the intro counts back from it
b0 = a.beat - BAR * np.ceil(a.beat / BAR)
end_bar = a.endcard + BAR                                              # one last bar into the end card, then ring out
t = b0; k = 0
while t < end_bar:
    bass, voic = CHORDS[k % 4]; groove = t >= a.beat - 1e-6; last = t + BAR > end_bar
    if t + BAR > 0:
        # electric piano: chord on 1, a pushed re-hit on the "and" of 2 in the groove
        for m in voic: add(epiano(m, BAR * (1.0 if last else 0.45), 0.9), t, pan=(m - 62) / 14)
        if groove and not last:
            for m in voic[1:]: add(epiano(m, BEAT * 0.8, 0.55), t + 1.5 * BEAT, pan=(m - 62) / 14)
        add(pad([m + 12 for m in voic[:3]], BAR * (1.6 if last else 1.0)), t, pan=0)
        if groove:
            drums = not in_brk(t + 0.01) and not last
            for bt in range(4):
                tb = t + bt * BEAT
                if drums:
                    add(kick(), tb)
                    if bt in (1, 3): add(clap(), tb, pan=0.05)
                    for s16 in range(4): add(shaker(1.0 if s16 % 2 else 0.6), tb + s16 * BEAT / 4 + (0.012 if s16 % 2 else 0), pan=0.35)
            if not last:
                add(sub(bass, BEAT * 1.8), t); add(sub(bass, BEAT * 0.9), t + 2.5 * BEAT); add(sub(bass + 7 if k % 2 else bass, BEAT * 0.8), t + 3.5 * BEAT)
                for bt, m in MOTIF: add(pluck(m - (0 if k % 4 != 2 else 2)), t + bt * BEAT, pan=-0.3, g=1.15 if in_brk(t) else 0.85)
            else:
                add(sub(bass, BAR * 1.2), t)
    t += BAR; k += 1
# ---- bus: soft saturation, Schroeder room, air, fades
def room(x, seed):
    """Small stereo room: convolution with a 0.9 s exponentially decaying noise impulse (different noise per side)."""
    r = np.random.default_rng(seed); n = int(0.9 * SR); t = np.arange(n) / SR
    ir = r.standard_normal(n) * np.exp(-t * 5.5); ir[:int(0.012 * SR)] = 0; ir /= np.sqrt((ir ** 2).sum())
    return fftconvolve(x, ir)[:len(x)]
mix = np.stack([L, R], 1)
wet = np.stack([room(L, 1), room(R, 2)], 1) * 0.22
mix = np.tanh(1.3 * (mix + wet)) / 1.3
tt = np.arange(N) / SR
mix *= (np.minimum(tt / 0.4, 1) * np.clip((a.dur + 1.2 - tt) / 1.0, 0, 1))[:, None]
mix = mix[:int(a.dur * SR)] / (np.abs(mix).max() + 1e-9) * 0.89
os.makedirs(os.path.dirname(a.out), exist_ok=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f64le', '-ar', str(SR), '-ac', '2', '-i', '-', '-af', 'highshelf=f=8000:g=2',
                '-c:a', 'pcm_s16le', a.out], input=mix.astype(np.float64).tobytes(), check=True)
print(a.out, f'{a.dur} s, {a.bpm} bpm, groove from {a.beat:.2f}, bars from {b0:.2f}')
