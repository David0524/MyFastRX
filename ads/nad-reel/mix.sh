#!/usr/bin/env bash
# Mixes licensed samples (see audio_sources.txt) against the film's cue times and muxes the final mp4.
set -euo pipefail
cd "$(dirname "$0")"
A=audio
cue() { echo "[$1]adelay=$(awk "BEGIN{printf \"%d\", $2*1000}")|$(awk "BEGIN{printf \"%d\", $2*1000}"),volume=$3[$4]"; }
ffmpeg -v error -y \
  -ss 5.5 -t 18.5 -i $A/music.mp3 \
  -i $A/sfx_whoosh.mp3 -i $A/sfx_click.ogg -i $A/sfx_click2.ogg -i $A/sfx_thump_soft.ogg \
  -i $A/sfx_thump_box.mp3 -i $A/sfx_whoosh_short.mp3 -i $A/sfx_chime.mp3 \
  -filter_complex "
  [0]aresample=48000,asplit[m1][m2];
  [m1]lowpass=f=700,volume=1.3,atrim=0:2.6,afade=t=out:st=2.35:d=0.25[mlo];
  [m2]afade=t=in:st=2.3:d=0.25,afade=t=out:st=16.9:d=1.6[mhi];
  [mlo][mhi]amix=inputs=2:normalize=0,volume=0.55[music];
  [1]aresample=48000,asplit[w1][w0];[w0]anullsink;
  $(cue w1 1.62 0.9 sw);
  [2]aresample=48000,asplit=4[c1][c2][c3][c4];
  $(cue c1 2.85 0.8 k1);$(cue c2 3.23 0.8 k2);$(cue c3 3.61 0.8 k3);$(cue c4 8.85 0.7 k4);
  [3]aresample=48000,asplit=3[d1][d2][d3];
  $(cue d1 4.05 0.9 t1);$(cue d2 9.08 0.7 t2);$(cue d3 14.80 0.9 t3);
  [4]aresample=48000[st];$(cue st 5.30 1.0 stamp);
  [5]aresample=48000[bx];$(cue bx 6.99 1.0 box);
  [6]aresample=48000[ws];$(cue ws 8.05 0.8 dive);
  [7]aresample=48000[ch];$(cue ch 15.42 0.9 chime);
  [music][sw][k1][k2][k3][k4][t1][t2][t3][stamp][box][dive][chime]amix=inputs=13:normalize=0:duration=first,
  loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[out]" \
  -map "[out]" -ac 2 -t 18.5 out/nad-reel-audio.wav
ffmpeg -v error -y -i out/nad-reel.mp4 -i out/nad-reel-audio.wav -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart out/nad-reel-final.mp4
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height -of compact out/nad-reel-final.mp4
