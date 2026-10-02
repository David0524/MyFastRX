#!/usr/bin/env python3
"""v8 SFX stem: the v7 sound set (audio/sfx_v7/*.wav, composed in audio/compose_v7.mjs) placed per src/v8/timeline.mjs SFX.
  python3 tools/sfx-v8.py  ->  audio/stems/v8_sfx.wav (48 kHz / 24-bit stereo, DURATION s)"""
import json, subprocess, wave, numpy as np
TL = json.loads(subprocess.check_output(['node', '-e', "import('./src/v8/timeline.mjs').then(t=>console.log(JSON.stringify({S:t.SFX,D:t.DURATION})))"]))
SR = 48000; N = round(TL['D'] * SR); y = np.zeros((N, 2), np.float32)
def load(p):
    return np.frombuffer(subprocess.check_output(['ffmpeg', '-v', 'error', '-i', p, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-']), np.float32).reshape(-1, 2)
for s in TL['S']:
    x = load(f"audio/sfx_v7/{s['id']}.wav"); pk = np.abs(x).max() or 1
    x = x / pk * 10 ** (s['gain'] / 20); o = round(s['at'] * SR); n = min(len(x), N - o)
    if n > 0: y[o:o + n] += x[:n]
q = (np.clip(y, -1, 1 - 2**-23) * 2**23).astype('<i4')
with wave.open('audio/stems/v8_sfx.wav', 'wb') as f:
    f.setnchannels(2); f.setsampwidth(3); f.setframerate(SR); f.writeframes(np.stack([q & 255, (q >> 8) & 255, (q >> 16) & 255], -1).astype(np.uint8).tobytes())
print('v8 sfx', len(TL['S']), 'hits, peak', round(20 * np.log10(np.abs(y).max() + 1e-9), 1), 'dBFS')
