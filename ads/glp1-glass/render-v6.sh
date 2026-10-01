#!/usr/bin/env bash
# Render v6 "Touch" in four parallel parts (every frame is the 2D film page, footage included), then join them
# losslessly into out/v6/video_only.mp4 and merge the per-frame meta for verify_v6.mjs.
set -euo pipefail
cd "$(dirname "$0")"
TLF=src/v6/timeline.mjs
N=$(node -e "import('./$TLF').then(t=>console.log(Math.round(t.DURATION*t.FPS)))")
mkdir -p out/v6; rm -f out/v6/part_*.mp4 out/v6/part_*.meta.json
R="node render.mjs --tl $TLF --prefix v6/part --page v6/film --layout v6/layout.json"
Q=$((N / 4))
for k in 0 1 2 3; do a=$((k * Q)); b=$(( k == 3 ? N : (k + 1) * Q )); $R --from $a --to $b > out/v6/render_$k.log 2>&1 & done
wait
ls out/v6/part_*.mp4 | sort | sed "s#out/v6/\(.*\)#file '\1'#" > out/v6/parts.txt
ffmpeg -v error -y -f concat -safe 0 -i out/v6/parts.txt -c copy out/v6/video_only.mp4
node -e "const fs=require('fs');const m={};for(const f of fs.readdirSync('out/v6').filter(f=>/^part_.*\.meta\.json$/.test(f)))Object.assign(m,JSON.parse(fs.readFileSync('out/v6/'+f)));fs.writeFileSync('out/v6/frame_meta.json',JSON.stringify(m));console.log('meta frames',Object.keys(m).length)"
ffprobe -v error -count_frames -select_streams v -show_entries stream=nb_read_frames -of csv=p=0 out/v6/video_only.mp4
