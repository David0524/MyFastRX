#!/usr/bin/env python3
"""Video 5 music bed, coded (Higgsfield has no standalone music model; no licensing needed). Warm fingerpicked acoustic
guitar (Karplus-Strong), 80 bpm, one chord per 3 s bar, bars locked to the edit:
  porch: guitar arpeggios + light shaker (C, Am)
  time-lapse (--tl): strummed F, a soft pad swell and a riser into the cut (under the voice-over)
  sidewalk: the beat comes in on the cut back to her (soft kick, brushed snare, bass): C, Am, F
  end card (--endcard, snapped to the beat): G -> resolves to C, rings out
Ducking under her voice is done in the edit (sidechain). Warmth: gentle low-pass, light saturation, small room reverb.
  python3 tools/vid5-music.py --dur 20.7 --bar0 0.233 --tl 6.23 10.23 --endcard 18.2 -> audio/ugc/vid5_music.wav (48 kHz stereo)"""
import argparse, os, subprocess
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
ap = argparse.ArgumentParser(); ap.add_argument('--dur', type=float, required=True); ap.add_argument('--bar0', type=float, default=0.233)
ap.add_argument('--tl', type=float, nargs=2, required=True, help='time-lapse start/end: the swell bar')
ap.add_argument('--endcard', type=float, required=True)
ap.add_argument('--lift', type=float, nargs='*', default=[], help='t0 t1 pairs where she is silent (time-lapse, end card): music +4 dB')
a = ap.parse_args()
SR = 48000; N = int(a.dur * SR) + SR; BAR = 3.0; E = BAR / 8
rng = np.random.default_rng(80)
L = np.zeros(N); R = np.zeros(N)
def hz(m): return 440 * 2 ** ((m - 69) / 12)
def add(sig, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N: return
    s = sig[:N - i] * gain
    L[i:i + len(s)] += s * np.sqrt(0.5 * (1 - pan)); R[i:i + len(s)] += s * np.sqrt(0.5 * (1 + pan))

def pluck(m, dur=2.6, bright=0.5):
    """Karplus-Strong string, processed one period at a time (vectorised)."""
    P = int(round(SR / hz(m))); n = int(dur * SR)
    buf = rng.uniform(-1, 1, P); buf = np.convolve(buf, [bright, 1 - bright], 'same')
    out = np.empty(n + P); out[:P] = buf; k = P
    while k < n + P:
        prev = out[k - P:k]; nxt = 0.5 * (prev + np.roll(prev, 1)) * 0.996
        m_ = min(P, n + P - k); out[k:k + m_] = nxt[:m_]; k += m_
    env = np.minimum(1, np.arange(n) / (0.004 * SR))
    return out[P:P + n] * env * np.exp(-np.arange(n) / SR / 1.6)

CH = {'C': [48, 55, 64, 67, 71], 'Am': [45, 52, 60, 64, 67], 'F': [41, 48, 57, 60, 64], 'G': [43, 50, 59, 62, 67]}
PAT = [0, 2, 3, 4, 2, 3, 1, 3]                          # fingerpicking order over 8 eighths
# bars as (start time, chord, mode, length): picking until the time-lapse, one swell bar the length of the time-lapse,
# full bars after it, then G on the beat nearest the end card and a ringing C
bars = []; t_ = a.bar0; cyc = ['C', 'Am']
while t_ + 0.01 < a.tl[0]: bars.append((t_, cyc[len(bars) % 2], 'pick', BAR)); t_ += BAR
bars.append((a.tl[0], 'F', 'swell', a.tl[1] - a.tl[0])); t_ = a.tl[1]; cyc = ['C', 'Am', 'F']; k = 0
t_end = a.tl[1] + round((a.endcard - a.tl[1]) / (BAR / 4)) * (BAR / 4)
while t_ + 0.01 < t_end: bars.append((t_, cyc[k % 3], 'full', min(BAR, t_end - t_))); t_ += BAR; k += 1
bars += [(t_end, 'G', 'end', BAR / 2), (t_end + BAR / 2, 'C', 'ring', 3.0)]

def kick():
    n = int(0.35 * SR); tt = np.arange(n) / SR; f = 50 + 70 * np.exp(-tt / 0.03)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.12)
def brush():
    n = int(0.3 * SR); x = rng.normal(0, 1, n); X = np.fft.rfft(x); f = np.fft.rfftfreq(n, 1 / SR)
    x = np.fft.irfft(X * ((f > 1500) & (f < 8000)), n); return x / np.abs(x).max() * np.exp(-np.arange(n) / SR / 0.09)
def shaker():
    n = int(0.08 * SR); x = rng.normal(0, 1, n); X = np.fft.rfft(x); f = np.fft.rfftfreq(n, 1 / SR)
    x = np.fft.irfft(X * (f > 5000), n); return x / np.abs(x).max() * np.sin(np.pi * np.arange(n) / n) ** 2
def bass(m, dur):
    n = int(dur * SR); tt = np.arange(n) / SR; f = hz(m - 12)
    return (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(4 * np.pi * f * tt)) * np.minimum(1, tt / 0.01) * np.exp(-tt / 0.9)
def pad(ms, dur):
    n = int(dur * SR); tt = np.arange(n) / SR; x = np.zeros(n)
    for m in ms[1:]:
        for d in (-0.08, 0.08): x += np.sin(2 * np.pi * hz(m + 12 + d) * tt + rng.uniform(0, 6))
    return x / len(ms) * np.sin(np.pi * np.clip(tt / dur, 0, 1)) ** 1.5

for t0, ch, mode, blen in bars:
    ms = CH[ch]
    if mode in ('pick', 'full'):
        for e, idx in enumerate(PAT):
            if e * E >= blen - 0.01: break
            add(pluck(ms[idx], bright=0.45), t0 + e * E + rng.normal(0, 0.006), 0.55 if e % 2 else 0.7, pan=[-0.3, 0.2, 0.35, 0.1, -0.1][idx])
        for e in range(int(round(blen / E))): add(shaker(), t0 + e * E + 0.004, 0.10 if mode == 'pick' else 0.14, pan=0.5)
    if mode == 'full':
        for q in range(int(round(blen / (2 * E)))):
            if q in (0, 2): add(kick(), t0 + q * 2 * E, 0.55)
            if q in (1, 3): add(brush(), t0 + q * 2 * E, 0.22, pan=-0.15)
        add(bass(ms[0], 1.4), t0, 0.35)
        if blen > 4 * E: add(bass(ms[0], 1.4), t0 + 4 * E, 0.3)
    if mode == 'swell':                                 # time-lapse bar: one slow strum + pad + riser into the cut
        for j, m in enumerate(ms): add(pluck(m, blen + 0.2, 0.4), t0 + j * 0.035, 0.7, pan=(j - 2) * 0.15)
        add(pad(ms, blen + 0.3), t0, 0.35)
        n = int(blen * SR); x = rng.normal(0, 1, n); X = np.fft.rfft(x); f = np.fft.rfftfreq(n, 1 / SR)
        riser = np.fft.irfft(X * ((f > 600) & (f < 7000)), n) * (np.arange(n) / n) ** 3
        add(riser / np.abs(riser).max(), t0, 0.12); add(kick(), t0 + blen, 0.5)   # lands on "Or..."
    if mode == 'end':
        for j, m in enumerate(ms): add(pluck(m, 1.6, 0.45), t0 + j * 0.03, 0.6, pan=(j - 2) * 0.15)
        add(kick(), t0, 0.45); add(bass(ms[0], 1.4), t0, 0.3)
    if mode == 'ring':
        for j, m in enumerate(ms + [76]): add(pluck(m, 3.5, 0.4), t0 + j * 0.04, 0.6, pan=(j - 2.5) * 0.12)
        add(bass(ms[0], 3.0), t0, 0.3); add(pad(ms, 3.0), t0, 0.25)

x = np.stack([L, R], 1)
# small room: convolve with a short decaying noise tail (FFT), 20% wet
ir_n = int(0.9 * SR); ir = rng.normal(0, 1, (ir_n, 2)) * np.exp(-np.arange(ir_n) / SR / 0.25)[:, None]; ir /= np.sqrt((ir ** 2).sum(0))
M = 1 << int(np.ceil(np.log2(N + ir_n)))
wet = np.stack([np.fft.irfft(np.fft.rfft(x[:, c], M) * np.fft.rfft(ir[:, c], M), M)[:N] for c in range(2)], 1)
x = x + 0.2 * wet
X = np.fft.rfft(x, axis=0); f = np.fft.rfftfreq(N, 1 / SR); X *= (1 / np.sqrt(1 + (f / 7000) ** 4))[:, None]   # warmth
x = np.fft.irfft(X, N, axis=0)
x = np.tanh(1.4 * x / np.abs(x).max()) / np.tanh(1.4)
n_out = int(a.dur * SR); x = x[:n_out]
tt = np.arange(n_out) / SR; x *= np.clip(tt / 0.15, 0, 1)[:, None] * np.clip((a.dur - tt) / 1.2, 0, 1)[:, None]
x = x / np.sqrt((x ** 2).mean()) * 0.1
g = np.ones(n_out)                                       # +4 dB where there is no voice, 0.2 s ramps
for t0, t1 in zip(a.lift[::2], a.lift[1::2]): g += 0.58 * np.clip(np.minimum((tt - t0 + 0.1) / 0.2, (t1 + 0.1 - tt) / 0.2), 0, 1)
x *= g[:, None]
out = 'audio/ugc/vid5_music.wav'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s16le', out],
               input=x.astype(np.float32).tobytes(), check=True)
print(out)
