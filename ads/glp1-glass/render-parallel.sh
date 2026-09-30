#!/usr/bin/env bash
# Render Version A in parallel chunks, then join them losslessly into out/A_video_only.mp4.
# Frames before the handoff come from the three.js opening (src/opening3d.html); the rest from the overhead film.
set -euo pipefail
cd "$(dirname "$0")"
read -r N HAND < <(node -e "import('./src/timeline.mjs').then(t=>console.log(Math.round(t.DURATION*t.FPS), Math.round(t.OPEN.dive*t.FPS)))")
rm -f out/part_*.mp4
M=$((HAND / 2)); A=$(( HAND + (N - HAND) / 3 )); B=$(( HAND + 2 * (N - HAND) / 3 ))
node render.mjs --page opening3d --from 0 --to $M > out/render_3d0.log 2>&1 &
node render.mjs --page opening3d --from $M --to $HAND > out/render_3d1.log 2>&1 &
node render.mjs --from $HAND --to $A > out/render_0.log 2>&1 &
node render.mjs --from $A --to $B > out/render_1.log 2>&1 &
node render.mjs --from $B --to $N > out/render_2.log 2>&1 &
wait
ls out/part_*.mp4 | sort | sed "s#out/\(.*\)#file '\1'#" > out/parts.txt
ffmpeg -v error -y -f concat -safe 0 -i out/parts.txt -c copy out/A_video_only.mp4
ffprobe -v error -count_frames -select_streams v -show_entries stream=nb_read_frames -of csv=p=0 out/A_video_only.mp4
