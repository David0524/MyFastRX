#!/usr/bin/env bash
# Render the 750 frames in 3 parallel chunks, then join them losslessly into out/A_video_only.mp4
set -euo pipefail
cd "$(dirname "$0")"
rm -f out/part_*.mp4
node render.mjs --from 0 --to 250 > out/render_0.log 2>&1 &
node render.mjs --from 250 --to 500 > out/render_1.log 2>&1 &
node render.mjs --from 500 --to 750 > out/render_2.log 2>&1 &
wait
printf "file '%s'\n" part_0000_250.mp4 part_0250_500.mp4 part_0500_750.mp4 > out/parts.txt
ffmpeg -v error -y -f concat -safe 0 -i out/parts.txt -c copy out/A_video_only.mp4
ffprobe -v error -count_frames -select_streams v -show_entries stream=nb_read_frames -of csv=p=0 out/A_video_only.mp4
