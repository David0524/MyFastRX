#!/usr/bin/env python3
"""Music bed v3 (client, Nov 4: "music is too boring... consider what other GLP-1 companies would do, like Ozempic commercials").
Reference energy, not melody: the category's big TV spots run bright, sing-along, feel-good pop (Ozempic's long-running jingle
rides a 1970s pop-rock tune with handclaps). This is an ORIGINAL tune in that spirit; it copies no song, jingle or melody.
Coded, so it is ours outright for paid ads. 124 bpm, A major, I-iii-IV-V (A C#m D E):
  intro  (0 .. --beat): handclaps + tambourine + bouncy bass + piano stabs (energy from frame 1, quiet enough for her hook)
  groove (--beat ..): + kick/snare backbeat, strummed guitar, the whistle-synth hook (a 2-bar original motif), "ooh" vocal pad
  break  (--break t0 t1, optional): drums out, claps + oohs + hook carry
  ending (--endcard ..): two bars of full groove into a big A chord with a cymbal swell, ringing out under the end card
  python3 tools/music-upbeat.py --dur 29.3 --beat 4.28 [--break 14.5 17.3] --endcard 26.3 --out audio/ugc/x.wav"""
import argparse, os, subprocess
import numpy as np
from scipy.signal import fftconvolve, lfilter, butter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
ap = argparse.ArgumentParser(); ap.add_argument('--dur', type=float, required=True); ap.add_argument('--beat', type=float, required=True)
ap.add_argument('--break', dest='brk', type=float, nargs=2, default=None); ap.add_argument('--endcard', type=float, required=True)
ap.add_argument('--bpm', type=float, default=124); ap.add_argument('--out', required=True); a = ap.parse_args()
SR = 48000; N = int((a.dur + 2.0) * SR); BEAT = 60 / a.bpm; BAR = 4 * BEAT
rng = np.random.default_rng(124)
L = np.zeros(N); R = np.zeros(N)
def hz(m): return 440 * 2 ** ((m - 69) / 12)
def add(sig, t, pan=0.0, g=1.0):
    i = int(round(t * SR))
    if i >= N or i + len(sig) <= 0: return
    s = sig[max(0, -i):max(0, min(len(sig), N - i))]; i = max(0, i)
    L[i:i + len(s)] += s * g * np.sqrt(0.5 * (1 - pan)); R[i:i + len(s)] += s * g * np.sqrt(0.5 * (1 + pan))
def env(n, att, dec): t = np.arange(n) / SR; return np.minimum(t / att, 1) * np.exp(-t * dec)
def bp(x, lo, hi, order=2):
    b, a_ = butter(order, [lo / (SR / 2), hi / (SR / 2)], btype='band'); return lfilter(b, a_, x)
def hp(x, f):
    b, a_ = butter(2, f / (SR / 2), btype='high'); return lfilter(b, a_, x)
def lp(x, f):
    b, a_ = butter(2, f / (SR / 2), btype='low'); return lfilter(b, a_, x)

# ---- instruments
def kick():
    n = int(0.35 * SR); t = np.arange(n) / SR; f = 48 + 90 * np.exp(-t * 32)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) + 0.25 * hp(rng.standard_normal(n), 2000) * np.exp(-t * 120)) * 0.6
def snare():
    n = int(0.3 * SR); t = np.arange(n) / SR
    body = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 25) * 0.35
    return (body + bp(rng.standard_normal(n), 1500, 7000) * np.exp(-t * 18) * 0.5) * 0.5
def clap():
    n = int(0.25 * SR); t = np.arange(n) / SR; nz = bp(rng.standard_normal(n), 900, 5000)
    e = sum(np.exp(-np.maximum(t - o, 0) * 70) * (t >= o) for o in (0, 0.011, 0.022, 0.034)) * np.exp(-t * 10)
    return nz * e * 0.55
def tamb(acc):
    n = int(0.12 * SR); nz = hp(rng.standard_normal(n), 6000)
    jingle = sum(np.sin(2 * np.pi * f * np.arange(n) / SR) for f in (7200, 9100, 10600)) * 0.15
    return (nz + jingle) * env(n, 0.002, 38) * 0.10 * acc
def bass(m, d):
    n = int(d * SR); t = np.arange(n) / SR; ph = (hz(m) * t) % 1
    s = lp(2 * ph - 1, 900) * 0.8 + 0.5 * np.sin(2 * np.pi * hz(m) * t)
    return np.tanh(2.2 * s) * env(n, 0.004, 4.5) * np.minimum((d - t) / 0.02, 1) * 0.30
def stab(ms, d=0.16):
    n = int((d + 0.25) * SR); t = np.arange(n) / SR; s = np.zeros(n)
    for m in ms:
        f = hz(m); mod = np.sin(2 * np.pi * f * t) * (1.8 * np.exp(-t * 14) + 0.3)
        s += np.sin(2 * np.pi * f * t + mod) + 0.3 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 12)
    return s * env(n, 0.003, 7) * np.where(t < d, 1, np.exp(-(t - d) * 25)) * 0.07
def strum(ms, d, down=True):
    """Karplus-Strong strum (bright electric-acoustic), strings 12 ms apart."""
    out = np.zeros(int((d + 0.6) * SR))
    order = ms if down else ms[::-1]
    for j, m in enumerate(order):
        p = int(SR / hz(m)); n = len(out) - int(j * 0.012 * SR)
        buf = rng.uniform(-1, 1, p); y = np.zeros(n)
        for i in range(n):
            y[i] = buf[i % p]; buf[i % p] = 0.5 * (buf[i % p] + buf[(i + 1) % p]) * 0.996
        out[int(j * 0.012 * SR):] += y
    tt = np.arange(len(out)) / SR
    return hp(out, 180) * np.where(tt < d, 1, np.exp(-(tt - d) * 12)) * 0.05
def whistle(m, d):
    n = int((d + 0.08) * SR); t = np.arange(n) / SR; vib = 1 + 0.006 * np.sin(2 * np.pi * 5.5 * t) * np.minimum(t / 0.25, 1)
    ph = np.cumsum(hz(m) * vib) / SR
    s = np.sin(2 * np.pi * ph) + 0.12 * np.sin(4 * np.pi * ph) + 0.03 * hp(rng.standard_normal(n), 3000)
    return s * np.minimum(t / 0.02, 1) * np.where(t < d, 1, np.exp(-(t - d) * 30)) * 0.10
def ooh(ms, d):
    n = int((d + 0.4) * SR); t = np.arange(n) / SR; s = np.zeros(n)
    for m in ms:
        for det in (-0.07, 0.07):
            ph = (hz(m) * 2 ** (det / 12) * t + rng.random()) % 1; s += 2 * ph - 1
    v = bp(s, 300, 900) * 1.0 + bp(s, 700, 1300) * 0.5                 # "oo" formants
    return v * np.minimum(t / 0.15, 1) * np.where(t < d, 1, np.exp(-(t - d) * 6)) * 0.035
def swell(d):
    n = int(d * SR); t = np.arange(n) / SR
    return hp(rng.standard_normal(n), 4000) * (t / d) ** 2 * 0.08

CH = [(45, [57, 61, 64, 69]), (49, [56, 61, 64, 68]), (50, [57, 62, 66, 69]), (52, [56, 59, 64, 68])]   # A C#m D E
# the hook: an original 2-bar motif in A major pentatonic, (beat, midi, length in beats)
HOOK = [(0, 76, 0.5), (0.5, 78, 0.5), (1, 76, 0.75), (2, 73, 0.5), (2.5, 71, 0.5), (3, 69, 1.0),
        (4, 76, 0.5), (4.5, 78, 0.5), (5, 81, 0.75), (6, 78, 0.5), (6.5, 76, 0.5), (7, 73, 1.0)]
in_brk = lambda t: a.brk is not None and a.brk[0] - 1e-6 <= t < a.brk[1] - 1e-6
b0 = a.beat - BAR * np.ceil(a.beat / BAR)              # bars locked to --beat
end_t = a.endcard + 0.0
t = b0; k = 0
while t < a.dur + BAR:
    bass_m, ch = CH[k % 4]; groove = t >= a.beat - 1e-6; final = t >= end_t - 1e-6
    if final:                                           # the big ending: one A chord, swell into it
        add(swell(BEAT * 1.0), t - BEAT * 1.0, g=1.0)
        add(kick(), t); add(clap(), t, g=0.8); add(bass(45, BAR * 2.2), t)
        add(strum([57, 61, 64, 69, 73], BAR * 2.2), t, pan=-0.25); add(ooh([69, 73, 76], BAR * 2.5), t)
        add(whistle(81, BEAT * 3.0), t, pan=0.2)
        break
    for bt in range(4):
        tb = t + bt * BEAT; brk = in_brk(tb)
        for e8 in range(2):
            add(tamb(1.0 if e8 else 0.55), tb + e8 * BEAT / 2 + (0.008 if e8 else 0), pan=0.45)
        if bt in (1, 3): add(clap(), tb, pan=-0.05, g=1.0)
        if groove and not brk:
            if bt in (0, 2): add(kick(), tb)
            if bt == 1 and k % 2: add(kick(), tb + BEAT / 2, g=0.7)
            if bt in (1, 3): add(snare(), tb, g=0.9)
        if not brk:                                      # bouncy octave bass on eighths
            for e8 in range(2): add(bass(bass_m + (12 if e8 else 0), BEAT / 2 * 0.85), tb + e8 * BEAT / 2, g=1.0 if groove else 0.75)
        add(stab(ch[1:]), tb + BEAT / 2, pan=0.15, g=0.9 if groove else 1.1)                 # offbeat piano stabs
        if groove and not brk: add(strum(ch, BEAT * 0.45, down=bt % 2 == 0), tb, pan=-0.3)
    if groove:
        add(ooh(ch[1:], BAR), t, pan=0, g=1.3 if in_brk(t) else 0.8)
        if k % 2 == 0:                                   # the hook every two bars, louder in the break
            for bt_, m, ln in HOOK:
                add(whistle(m, ln * BEAT * 0.9), t + bt_ * BEAT, pan=0.2, g=1.25 if in_brk(t) else 1.0)
    t += BAR; k += 1

# ---- bus: glue, small room, brightness, fades
def room(x, seed):
    r = np.random.default_rng(seed); n = int(0.7 * SR); tt = np.arange(n) / SR
    ir = r.standard_normal(n) * np.exp(-tt * 7); ir[:int(0.01 * SR)] = 0; ir /= np.sqrt((ir ** 2).sum())
    return fftconvolve(x, ir)[:len(x)]
mix = np.stack([L, R], 1); wet = np.stack([room(L, 3), room(R, 4)], 1) * 0.16
mix = np.tanh(1.5 * (mix + wet)) / 1.5
tt = np.arange(N) / SR
mix *= (np.minimum(tt / 0.05, 1) * np.clip((a.dur + 1.0 - tt) / 1.2, 0, 1))[:, None]
mix = mix[:int(a.dur * SR)]; mix = mix / (np.abs(mix).max() + 1e-9) * 0.89
os.makedirs(os.path.dirname(a.out), exist_ok=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f64le', '-ar', str(SR), '-ac', '2', '-i', '-', '-af', 'highshelf=f=7000:g=2.5',
                '-c:a', 'pcm_s16le', a.out], input=mix.astype(np.float64).tobytes(), check=True)
print(a.out, f'{a.dur:.2f} s, {a.bpm} bpm, groove from {a.beat:.2f}, ending at {a.endcard:.2f}')
