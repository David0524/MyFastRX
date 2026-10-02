#!/usr/bin/env python3
"""VO line 1 with the client's re-recorded "GLP-1" -> vo/body_v3_l1.wav (or another path: --out, --pitch).
vo/source_glp1_takes_elevenlabs.mp3 (-> vo/glp1_takes.wav) holds six takes of "GLP-1"; the client chose the 4th
(4.52-5.64 s) and demo 4 (+80 ms before "care", "GLP-1" 4% faster as a whole: rubberband, pitch/formants kept).
So the two recordings read as one:
  - tone: the take is EQ'd to the original "GLP-1" (vo/body_v3.wav 0.02-1.04): its long-term spectrum is measured in
    1/3-octave bands (100 Hz-14 kHz) against the original's and the difference applied as a smooth zero-phase curve
    (+-9 dB max, no boost below 160 Hz), plus a broad -4.5 dB at 220 Hz for its chestier fundamental - the take was ~5 dB boomier and 4-8 dB duller in the presence/air bands
  - level: then set to the original "GLP-1"'s loudness (-25.6 LUFS)
  - room tone: the pause before "care" is the ORIGINAL take's own room tone (2.74 s on), so the hiss doesn't change at the join
  - optional --pitch <semitones>: a gentle shift (the take sits ~1.5 semitones below the original "GLP-1")
then the original take from 60 ms before "care" (1.15 s). Prints where the speech starts, "care" lands, the speech ends."""
import subprocess, json, sys, os, tempfile, numpy as np, wave
args = sys.argv[1:]; OUT = args[args.index('--out') + 1] if '--out' in args else 'vo/body_v3_l1.wav'
PITCH = float(args[args.index('--pitch') + 1]) if '--pitch' in args else 0.0
TAKES, BODY, SR = 'vo/glp1_takes.wav', 'vo/body_v3.wav', 48000
T4, TEMPO, PAUSE, RESUME, X1, X2, REF = (4.52, 5.64), 1.04, 0.08, 1.09, 0.010, 0.012, (0.02, 1.04)
tmp = tempfile.mkdtemp()
def rd(path, a=None, b=None, filt=''):
    cmd = ['ffmpeg', '-v', 'error'] + (['-ss', str(a), '-to', str(b)] if a is not None else []) + ['-i', path, '-ac', '1', '-ar', str(SR)] + (['-af', filt] if filt else []) + ['-f', 'f32le', '-']
    return np.frombuffer(subprocess.check_output(cmd), np.float32).astype(np.float64)
def wr(path, x):
    with wave.open(path, 'wb') as f: f.setnchannels(1); f.setsampwidth(3); f.setframerate(SR); q = (np.clip(x, -1, 1 - 2**-23) * 2**23).astype('<i4'); f.writeframes(np.stack([q & 255, (q >> 8) & 255, (q >> 16) & 255], -1).astype(np.uint8).tobytes())
def lufs(path):
    o = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
    return float(o.split('Integrated loudness:')[1].split('I:')[1].split('LUFS')[0])
def spectrum(x, n=4096):   # Welch power spectrum
    w = np.hanning(n); fr = [x[i:i + n] * w for i in range(0, len(x) - n, n // 4)]
    return np.fft.rfftfreq(n, 1 / SR), np.mean([np.abs(np.fft.rfft(f)) ** 2 for f in fr], 0)
rb = f'rubberband=tempo={TEMPO}:formant=preserved:pitchq=quality' + (f':pitch={2 ** (PITCH / 12):.5f}' if PITCH else '')
new = rd(TAKES, T4[0], T4[1], rb); ref = rd(BODY, *REF)
# the EQ curve: 1/3-octave band ratios ref/new, smoothed, applied in the frequency domain (zero phase); two passes
# (the second catches what the first's smoothing left, e.g. the take's heavier ~200 Hz fundamental)
cent = 100 * 2 ** (np.arange(0, 25) / 3); cent = cent[cent < 14000]; _, Pr = spectrum(ref); y = new
for _pass in range(2):
    f, Pn = spectrum(y); g = []
    for c in cent:
        m = (f >= c / 2 ** (1 / 6)) & (f < c * 2 ** (1 / 6)); g.append(10 * np.log10(Pr[m].sum() / Pn[m].sum()))
    g = np.array(g); g -= np.interp(1000, cent, g); g = np.clip(np.convolve(np.pad(g, 1, mode='edge'), [.25, .5, .25], 'valid'), -9, 9)
    g[cent < 160] = np.minimum(g[cent < 160], 0)   # never boost below the voice (rumble/breath): cut only
    N = 1 << int(np.ceil(np.log2(len(y) + SR))); F = np.fft.rfftfreq(N, 1 / SR)
    curve = 10 ** (np.interp(np.log10(np.maximum(F, 20)), np.log10(cent), g) / 20)
    y = np.fft.irfft(np.fft.rfft(np.pad(y, (0, N - len(y)))) * curve, N)[:len(y)]
wr(f'{tmp}/eq0.wav', y)
# below ~300 Hz the band match compares single harmonics (the takes sit at different pitches), so the take's heavier
# fundamental (chestier read, ~4 dB) is taken down by hand: one broad, gentle cut around 220 Hz
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'{tmp}/eq0.wav', '-af', 'equalizer=f=220:t=o:w=1.2:g=-4.5', '-c:a', 'pcm_s24le', f'{tmp}/eq1.wav'], check=True)
y = rd(f'{tmp}/eq1.wav'); wr(f'{tmp}/eq.wav', y)
gain = -25.6 - lufs(f'{tmp}/eq.wav'); wr(f'{tmp}/eq.wav', y * 10 ** (gain / 20))
fl = ('[0:a]aresample=48000,aformat=channel_layouts=mono[a];'
      f'[1:a]atrim=2.74:{2.74 + PAUSE},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=mono[r];'
      f'[2:a]atrim={RESUME}:2.75,asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=mono[b];'
      f'[a][r]acrossfade=d={X1}:c1=tri:c2=tri[ar];[ar][b]acrossfade=d={X2}:c1=tri:c2=tri[out]')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'{tmp}/eq.wav', '-i', BODY, '-i', BODY, '-filter_complex', fl, '-map', '[out]', '-ar', str(SR), '-c:a', 'pcm_s24le', OUT], check=True)
head = len(new) / SR + PAUSE - X1 - X2
total = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', OUT]))
print(json.dumps({'speech_start': round((4.55 - T4[0]) / TEMPO, 3), 'care_in_file': round(head + 1.15 - RESUME, 3), 'without_in_file': round(head + 1.76 - RESUME, 3),
                  'speech_end': round(head + 2.70 - RESUME, 3), 'length': round(total, 3), 'eq_db': dict(zip([int(c) for c in cent[::3]], np.round(g[::3], 1).tolist())), 'level_gain_db': round(gain, 1)}))
