#!/usr/bin/env python3
"""VO line 1 with a tighter "G-L-P-1" (client: the letters were slow and the L-P gap clunky) -> vo/body_v3_l1.wav.
From vo/body_v3.wav: the hole between "L" and "P" (0.505-0.625 s) and most of the pause before "care" (1.065-1.125 s)
are cut (10 ms crossfades), the letters are sped up 12% (atempo, pitch kept), and "care" onward is untouched.
Prints the length of the tightened "GLP-1" part, so the line can be placed with "care" exactly where it was."""
import subprocess, json
SRC, OUT, TEMPO = 'vo/body_v3.wav', 'vo/body_v3_l1.wav', 1.12
g = ("[0:a]atrim=0:0.505,asetpts=PTS-STARTPTS[a];[0:a]atrim=0.625:1.065,asetpts=PTS-STARTPTS[b];"
     "[a][b]acrossfade=d=0.01:c1=tri:c2=tri,atempo=%.3f[glp];[0:a]atrim=1.125:2.75,asetpts=PTS-STARTPTS[rest];"
     "[glp][rest]acrossfade=d=0.01:c1=tri:c2=tri[out]") % TEMPO
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', SRC, '-filter_complex', g, '-map', '[out]', '-ar', '48000', '-c:a', 'pcm_s24le', OUT], check=True)
glp = (0.505 + (1.065 - 0.625) - 0.01) / TEMPO - 0.01          # the tightened "GLP-1" (both crossfades overlap)
total = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', OUT]))
print(json.dumps({'glp': round(glp, 3), 'care_in_file': round(glp + 0.025, 3), 'length': round(total, 3)}))
