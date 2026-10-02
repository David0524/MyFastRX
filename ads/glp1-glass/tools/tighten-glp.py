#!/usr/bin/env python3
"""VO line 1 with a tighter "G-L-P-1" (client: the letters were slow and the L-P gap clunky) -> vo/body_v3_l1.wav.
From vo/body_v3.wav: the vowels of "G", "L" and "1" are sped up (rubberband, formants kept), most of the hole between
"L" and "P" and of the pause before "care" are cut, and the "P" itself (its closure and burst) is left untouched:
time-stretching it, or cutting its closure too short, makes it read as "T" ("GLT", caught by speech-to-text).
"care" onward is untouched. Prints where "care" lands in the new file, so the line is placed with "care" unmoved."""
import subprocess, json
SRC, OUT, TV = 'vo/body_v3.wav', 'vo/body_v3_l1.wav', 1.22
RB = 'rubberband=tempo=%.2f:transients=crisp:detector=compound:window=short:formant=preserved:pitchq=quality' % TV
P = (0.595, 0.765)   # the "P": ~70 ms of its closure (the L-P hole is 0.505-0.645) + the burst and vowel onset
X = 0.008            # crossfades
g = (f"[0:a]atrim=0:0.335,asetpts=PTS-STARTPTS,{RB}[g];[0:a]atrim=0.335:0.525,asetpts=PTS-STARTPTS,{RB}[l];"
     f"[0:a]atrim={P[0]}:{P[1]},asetpts=PTS-STARTPTS[p];[0:a]atrim={P[1]}:1.065,asetpts=PTS-STARTPTS,{RB}[one];"
     f"[0:a]atrim=1.125:2.75,asetpts=PTS-STARTPTS[rest];[g][l]acrossfade=d={X}:c1=tri:c2=tri[gl];[gl][p]acrossfade=d={X}:c1=tri:c2=tri[glp];"
     f"[glp][one]acrossfade=d={X}:c1=tri:c2=tri[glp1];[glp1][rest]acrossfade=d=0.01:c1=tri:c2=tri[out]")
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', SRC, '-filter_complex', g, '-map', '[out]', '-ar', '48000', '-c:a', 'pcm_s24le', OUT], check=True)
glp1 = .335 / TV + (.525 - .335) / TV + (P[1] - P[0]) + (1.065 - P[1]) / TV - 3 * X
care = glp1 - .01 + (1.15 - 1.125)
total = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', OUT]))
print(json.dumps({'glp1': round(glp1, 3), 'care_in_file': round(care, 3), 'length': round(total, 3), 'speech_end': round(2.70 - 1.15 + care, 3)}))
