#!/usr/bin/env python3
"""Video 6 "Higher dose. Same price.": free fix for the front-steps take's "tir-zep-a-TEEDE" (client, Nov 4).
v1 (whole word from Hook A + a 2 s price card) was rejected: "clunky on both ends, particularly the end", and the card
"looks clunky". v2 swaps only the last syllable, "-teede" -> Hook A's "-tide", over her untouched video:
  - cut at the "t" burst on both sides (the closure before it stays the steps take's own silence), so no noise-floor jump;
  - Hook A's syllable is EQ-matched to the steps take (long-term speech spectrum ratio), level-matched, and gently
    time-stretched (rubberband, formants kept) to fill the original syllable's length, so "starts" stays on time;
  - 6 ms fade-in at the burst, 20 ms fade-out into the steps take's own room tone.
  python3 tools/vid6-tirzfix.py [--stretch 1.25] -> audio/ugc/vid6_steps_tirzfix.wav
                                   + previews/ugc/vid6_steps_patch_preview.mp4 (the original take with the patched audio)"""
import argparse, os, subprocess
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
ap = argparse.ArgumentParser(); ap.add_argument('--stretch', type=float, default=None,
                                                help='time-stretch of the syllable (default: fill the original length)')
ap.add_argument('--out', default='previews/ugc/vid6_steps_patch_preview.mp4'); a = ap.parse_args()
SR = 48000
STEPS, HOOK = 'footage/gen/host2_v6_steps_720p.mp4', 'footage/gen/host2_v6_hookA_720p.mp4'
OUT_WAV = 'audio/ugc/vid6_steps_tirzfix.wav'
# from the 10 ms RMS envelope: steps "-teede" = burst 4.29 .. end 4.59; hook A "-tide" = burst 2.425 .. 2.635 (before "doses")
DST0, DST1 = 4.29, 4.59
SRC0, SRC1 = 2.425, 2.635

def load(f):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768

def rms(x): return np.sqrt((x ** 2).mean() + 1e-12)

def speech_spectrum(x, n=2048):
    fr = [x[i:i + n] for i in range(0, len(x) - n, n // 2) if rms(x[i:i + n]) > 0.02]
    return np.mean([np.abs(np.fft.rfft(f * np.hanning(n))) for f in fr], 0)

steps, hook = load(STEPS), load(HOOK)
# EQ: the steps take's long-term speech spectrum over Hook A's, smoothed, applied to the syllable
n = 2048
ratio = speech_spectrum(steps, n) / (speech_spectrum(hook, n) + 1e-9)
ratio = np.convolve(ratio, np.ones(15) / 15, 'same'); ratio = np.clip(ratio, 0.4, 2.5)
syl = hook[round(SRC0 * SR):round(SRC1 * SR)].copy()
L = 1 << int(np.ceil(np.log2(len(syl) + n)))
spec = np.fft.rfft(syl, L); f_src = np.linspace(0, 1, len(ratio)); f_dst = np.linspace(0, 1, len(spec))
syl = np.fft.irfft(spec * np.interp(f_dst, f_src, ratio), L)[:len(syl)].astype(np.float32)
# stretch to fill the original syllable (rubberband keeps formants)
st = a.stretch or (DST1 - DST0) / (SRC1 - SRC0)
syl = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-af',
                                    f'rubberband=tempo={1 / st:.4f}:formant=preserved:pitchq=quality', '-f', 'f32le', '-'],
                                   input=syl.tobytes(), capture_output=True, check=True).stdout, np.float32).copy()
# level: match the steps take's own voiced level just before the cut ("tir-zep-a")
syl *= rms(steps[round(3.73 * SR):round(4.18 * SR)][np.abs(steps[round(3.73 * SR):round(4.18 * SR)]) > 0.01]) / rms(syl[np.abs(syl) > 0.01])
d0, d1 = round(DST0 * SR), round(DST1 * SR)
fi, fo = round(0.006 * SR), round(0.020 * SR)
syl[:fi] *= np.linspace(0, 1, fi); syl[-fo:] *= np.linspace(1, 0, fo)
out = steps.copy()
room = steps[round(4.62 * SR):round(4.74 * SR)]                     # her own room tone, after the word
gap = np.resize(room, d1 - d0)                                       # what sits under / after the new syllable
seg = gap.copy(); k = min(len(syl), len(seg)); seg[:k] = syl[:k] + gap[:k] * np.linspace(0, 1, k) ** 4
out[d0:d1] = seg
xf = round(0.004 * SR); out[d0 - xf:d0] *= np.linspace(1, 0.3, xf)  # soften the original closure into the new burst
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', OUT_WAV], input=out.tobytes(), check=True)

# preview: her original take (untouched picture), 1080x1920, with the patched audio
os.makedirs(os.path.dirname(a.out), exist_ok=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', STEPS, '-i', OUT_WAV, '-map', '0:v', '-map', '1:a',
                '-vf', 'scale=1080:1920:flags=lanczos', '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p',
                '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', a.out], check=True)
print(OUT_WAV, a.out, f'syllable {SRC1 - SRC0:.3f} s x{st:.2f} -> {len(syl) / SR:.3f} s into {DST1 - DST0:.2f} s')
