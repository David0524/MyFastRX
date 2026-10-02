#!/usr/bin/env python3
"""VO line 1 with the client's re-recorded "GLP-1" -> vo/body_v3_l1.wav.
vo/source_glp1_takes_elevenlabs.mp3 (-> vo/glp1_takes.wav) holds six takes of "GLP-1"; the client chose the 4th
(4.52-5.64 s; speech 4.55-5.60). It replaces the original "GLP-1" (vo/body_v3.wav 0.00-1.04), level-matched (+4.4 dB:
-30.0 vs -25.6 LUFS), then the original take resumes 60 ms before "care" (1.15 s), with a 10 ms crossfade.
Untouched voice: no time-stretching. Prints where "care" and the line's speech end land in the new file."""
import subprocess, json
TAKES, BODY, OUT, X = 'vo/glp1_takes.wav', 'vo/body_v3.wav', 'vo/body_v3_l1.wav', 0.010
T4, GAIN, RESUME = (4.52, 5.64), 4.4, 1.09
g = (f"[0:a]atrim={T4[0]}:{T4[1]},asetpts=PTS-STARTPTS,volume={GAIN}dB,aresample=48000,aformat=channel_layouts=mono[a];"
     f"[1:a]atrim={RESUME}:2.75,asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=mono[b];[a][b]acrossfade=d={X}:c1=tri:c2=tri[out]")
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', TAKES, '-i', BODY, '-filter_complex', g, '-map', '[out]', '-ar', '48000', '-c:a', 'pcm_s24le', OUT], check=True)
head = T4[1] - T4[0] - X
total = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', OUT]))
print(json.dumps({'speech_start': round(4.55 - T4[0], 3), 'care_in_file': round(head + 1.15 - RESUME, 3), 'without_in_file': round(head + 1.76 - RESUME, 3),
                  'speech_end': round(head + 2.70 - RESUME, 3), 'length': round(total, 3)}))
