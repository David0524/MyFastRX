#!/usr/bin/env bash
# Audio for line-reel: CC0 music + effects (see audio_sources.txt), on the film's beat grid.
# Every effect is placed by its measured audible onset: file start = cue - onset.
set -euo pipefail
cd "$(dirname "$0")"
A=audio; O=out
MUSIC_OFFSET=6.014   # puts a beat of "Happy Dance" exactly on frame 0; 120 BPM, bar = 2.0 s
# cue time (film s) | file | onset in file (s) | gain
CUES=(
  "1.720 sfx_whoosh_short.mp3 0.0028 0.55"
  "2.500 sfx_click.ogg        0.0000 0.8"
  "3.000 sfx_click.ogg        0.0000 0.8"
  "3.500 sfx_click.ogg        0.0000 0.8"
  "5.000 sfx_thump_soft.ogg   0.0003 1.0"
  "7.000 sfx_thump_box.mp3    0.1114 1.0"
  "8.500 sfx_click2.ogg       0.0092 0.8"
  "9.000 sfx_click2.ogg       0.0092 0.8"
  "14.000 sfx_chime.mp3       0.0711 1.0"
  "15.000 sfx_click2.ogg      0.0092 0.9"
)
inputs=(); filt=""; labels=""; k=0
for c in "${CUES[@]}"; do read -r t f on g <<<"$c"; inputs+=(-i "$A/$f")
  ms=$(awk "BEGIN{printf \"%.1f\", ($t-$on)*1000}")
  filt+="[$k:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=${ms}|${ms},volume=$g[s$k];"; labels+="[s$k]"; k=$((k+1)); done
ffmpeg -v error -y "${inputs[@]}" -filter_complex "${filt}${labels}amix=inputs=$k:normalize=0:duration=longest,atrim=0:18,apad=whole_dur=18[fx]" -map "[fx]" -c:a pcm_s16le $O/line-reel-sfx.wav
ffmpeg -v error -y -ss $MUSIC_OFFSET -t 18 -i $A/wav/music.wav -filter_complex "
  [0]aformat=sample_rates=48000:channel_layouts=stereo,asplit[a][b];
  [a]lowpass=f=650,lowpass=f=650,volume=1.4,afade=t=out:st=1.95:d=0.05[lo];
  [b]afade=t=in:st=1.95:d=0.05,afade=t=out:st=16.2:d=1.8[hi];
  [lo][hi]amix=inputs=2:normalize=0,volume=0.6,atrim=0:18[m]" -map "[m]" -c:a pcm_s16le $O/line-reel-music.wav
ffmpeg -v error -y -i $O/line-reel-music.wav -i $O/line-reel-sfx.wav -filter_complex "[0][1]amix=inputs=2:normalize=0[x]" -map "[x]" -c:a pcm_s16le $O/line-reel-premix.wav
# two-pass loudnorm in linear mode (a single gain, so timing is untouched)
J=$(ffmpeg -hide_banner -i $O/line-reel-premix.wav -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
g() { echo "$J" | sed -n "s/.*\"$1\" : \"\([^\"]*\)\".*/\1/p"; }
ffmpeg -v error -y -i $O/line-reel-premix.wav -af "loudnorm=I=-14:TP=-1.5:LRA=11:linear=true:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset),aresample=48000" -c:a pcm_s16le $O/line-reel-audio.wav
ffmpeg -v error -y -i $O/line-reel.mp4 -i $O/line-reel-audio.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart $O/line-reel-final.mp4
echo "final: $O/line-reel-final.mp4"
