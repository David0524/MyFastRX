#!/usr/bin/env bash
# Render v7 "Without the strings" in four parallel parts (every frame is the 2D film page, footage included), then join them
# losslessly into out/v7/video_only.mp4 and merge the per-frame meta for verify_v7.mjs.
set -euo pipefail
cd "$(dirname "$0")"
TLF=src/v7/timeline.mjs
N=$(node -e "import('./$TLF').then(t=>console.log(Math.round(t.DURATION*t.FPS)))")
mkdir -p out/v7; rm -f out/v7/part_*.mp4 out/v7/part_*.meta.json
R="node render.mjs --tl $TLF --prefix v7/part --page v7/film --layout v7/layout.json"
Q=$((N / 4))
for k in 0 1 2 3; do a=$((k * Q)); b=$(( k == 3 ? N : (k + 1) * Q )); $R --from $a --to $b > out/v7/render_$k.log 2>&1 & done
wait
ls out/v7/part_*.mp4 | sort | sed "s#out/v7/\(.*\)#file '\1'#" > out/v7/parts.txt
ffmpeg -v error -y -f concat -safe 0 -i out/v7/parts.txt -c copy out/v7/video_only.mp4
node -e "const fs=require('fs');const m={};for(const f of fs.readdirSync('out/v7').filter(f=>/^part_.*\.meta\.json$/.test(f)))Object.assign(m,JSON.parse(fs.readFileSync('out/v7/'+f)));fs.writeFileSync('out/v7/frame_meta.json',JSON.stringify(m));console.log('meta frames',Object.keys(m).length)"
ffprobe -v error -count_frames -select_streams v -show_entries stream=nb_read_frames -of csv=p=0 out/v7/video_only.mp4
