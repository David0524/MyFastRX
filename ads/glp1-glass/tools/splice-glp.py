#!/usr/bin/env python3
"""VO line 1 with the client's re-recorded "GLP-1" -> vo/body_v3_l1.wav (the client picked demo 4 of
previews/glp1_demos/, made by tools/glp1-demo.sh).
vo/source_glp1_takes_elevenlabs.mp3 (-> vo/glp1_takes.wav) holds six takes of "GLP-1"; the client chose the 4th
(4.52-5.64 s; speech 4.55-5.60). It replaces the original "GLP-1" (vo/body_v3.wav 0.00-1.04): level-matched (+4.4 dB:
-30.0 vs -25.6 LUFS) and 4% faster as a whole (rubberband, pitch and formants kept); then 80 ms of room tone from
between the takes (so "care" isn't crowded onto it), then the original take from 60 ms before "care" (1.15 s).
Prints where the speech starts, "care" lands and the line's speech ends in the new file."""
import subprocess, json
TAKES, BODY, OUT = 'vo/glp1_takes.wav', 'vo/body_v3.wav', 'vo/body_v3_l1.wav'
T4, GAIN, TEMPO, PAUSE, RESUME, X1, X2 = (4.52, 5.64), 4.4, 1.04, 0.08, 1.09, 0.010, 0.012
g = (f"[0:a]atrim={T4[0]}:{T4[1]},asetpts=PTS-STARTPTS,volume={GAIN}dB,aresample=48000,aformat=channel_layouts=mono,"
     f"rubberband=tempo={TEMPO}:formant=preserved:pitchq=quality[a];"
     f"[2:a]atrim=4.15:{4.15 + PAUSE},asetpts=PTS-STARTPTS,volume={GAIN}dB,aresample=48000,aformat=channel_layouts=mono[r];"   # (a second input: one input feeding two branches stalls ffmpeg)
     f"[1:a]atrim={RESUME}:2.75,asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=mono[b];"
     f"[a][r]acrossfade=d={X1}:c1=tri:c2=tri[ar];[ar][b]acrossfade=d={X2}:c1=tri:c2=tri[out]")
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', TAKES, '-i', BODY, '-i', TAKES, '-filter_complex', g, '-map', '[out]', '-ar', '48000', '-c:a', 'pcm_s24le', OUT], check=True)
head = (T4[1] - T4[0]) / TEMPO + PAUSE - X1 - X2          # where the original take resumes
total = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', OUT]))
print(json.dumps({'speech_start': round((4.55 - T4[0]) / TEMPO, 3), 'care_in_file': round(head + 1.15 - RESUME, 3), 'without_in_file': round(head + 1.76 - RESUME, 3),
                  'speech_end': round(head + 2.70 - RESUME, 3), 'length': round(total, 3)}))
