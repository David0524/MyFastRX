#!/usr/bin/env python3
"""The branded opening line -> vo/body_v4_l1.wav (or --out), from the client's take
vo/source_line1_brand_elevenlabs.mp3 (-> vo/line1_brand.wav): "MyFastRx. GLP-1 care, without the strings."
Only "GLP-1" (1.66-2.88 s: G, L, the P's closure + burst, "1") is sped up (--tempo, default 1.2, the client's ask;
rubberband, pitch and formants kept); "MyFastRx" before it and "care, without the strings." after it are untouched.
8 ms crossfades at the two joins. Prints where things land in the new file."""
import subprocess, json, sys
a = sys.argv[1:]; OUT = a[a.index('--out') + 1] if '--out' in a else 'vo/body_v4_l1.wav'
TEMPO = float(a[a.index('--tempo') + 1]) if '--tempo' in a else 1.2
SRC, G, X = 'vo/line1_brand.wav', (1.66, 2.88), 0.008
fc = (f"[0:a]atrim=0:{G[0]},asetpts=PTS-STARTPTS[a];"
      f"[1:a]atrim={G[0]}:{G[1]},asetpts=PTS-STARTPTS,rubberband=tempo={TEMPO}:formant=preserved:pitchq=quality[g];"
      f"[2:a]atrim={G[1]},asetpts=PTS-STARTPTS[c];[a][g]acrossfade=d={X}:c1=tri:c2=tri[ag];[ag][c]acrossfade=d={X}:c1=tri:c2=tri[out]")
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', SRC, '-i', SRC, '-i', SRC, '-filter_complex', fc, '-map', '[out]', '-ar', '48000', '-c:a', 'pcm_s24le', OUT], check=True)
d = (G[1] - G[0]) - (G[1] - G[0]) / TEMPO + 2 * X        # time removed
total = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', OUT]))
print(json.dumps({'tempo': TEMPO, 'removed': round(d, 3), 'speech_start': 0.02, 'glp': G[0], 'care': round(2.97 - d, 3),
                  'without': round(3.63 - d, 3), 'speech_end': round(4.76 - d, 3), 'length': round(total, 3)}))
