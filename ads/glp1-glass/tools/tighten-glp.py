#!/usr/bin/env python3
"""VO line 1 with shorter gaps in "G-L-P-1" (client: the gap between the letters was clunky) -> vo/body_v3_l1.wav.
Silence cuts only - the voice itself is untouched (no time-stretching: it made the letters sound robotic):
  - the hole between "L" and "P" (0.505-0.645 s): 55 ms cut, 85 ms kept - any shorter and, under the music, the "P" reads as "T"
  - the pause before "care" (1.04-1.14 s): 60 ms cut
8 ms crossfades at each cut. Prints where "care" lands in the new file, so the line is placed with "care" unmoved."""
import subprocess, json
SRC, OUT, X = 'vo/body_v3.wav', 'vo/body_v3_l1.wav', 0.008
CUTS = [(0.540, 0.595), (1.065, 1.125)]
g = (f"[0:a]atrim=0:{CUTS[0][0]},asetpts=PTS-STARTPTS[a];[0:a]atrim={CUTS[0][1]}:{CUTS[1][0]},asetpts=PTS-STARTPTS[b];"
     f"[0:a]atrim={CUTS[1][1]}:2.75,asetpts=PTS-STARTPTS[c];[a][b]acrossfade=d={X}:c1=tri:c2=tri[ab];[ab][c]acrossfade=d={X}:c1=tri:c2=tri[out]")
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', SRC, '-filter_complex', g, '-map', '[out]', '-ar', '48000', '-c:a', 'pcm_s24le', OUT], check=True)
cut = sum(b - a for a, b in CUTS) + 2 * X
total = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', OUT]))
print(json.dumps({'removed': round(cut, 3), 'care_in_file': round(1.15 - cut, 3), 'without_in_file': round(1.76 - cut, 3), 'speech_end': round(2.70 - cut, 3), 'length': round(total, 3)}))
