#!/usr/bin/env bash
# Render v5 in parallel parts, then join them losslessly into out/v5/video_only.mp4.
# Frames before the handoff (3.0 s) come from the three.js hook (src/v5/opening3d.html); the rest from the 2D film.
set -euo pipefail
cd "$(dirname "$0")"
TLF=src/v5/timeline.mjs
read -r N HAND < <(node -e "import('./$TLF').then(t=>console.log(Math.round(t.DURATION*t.FPS), Math.round(t.OPEN.dive*t.FPS)))")
mkdir -p out/v5; rm -f out/v5/part_*.mp4 out/v5/part_*.meta.json
M=$((HAND / 2)); A=$(( HAND + (N - HAND) / 2 ))
R="node render.mjs --tl $TLF --prefix v5/part"
$R --page v5/opening3d --from 0 --to $M > out/v5/render_3d0.log 2>&1 &
$R --page v5/opening3d --from $M --to $HAND > out/v5/render_3d1.log 2>&1 &
$R --page v5/film --layout v5/layout.json --from $HAND --to $A > out/v5/render_0.log 2>&1 &
$R --page v5/film --layout v5/layout.json --from $A --to $N > out/v5/render_1.log 2>&1 &
wait
ls out/v5/part_*.mp4 | sort | sed "s#out/v5/\(.*\)#file '\1'#" > out/v5/parts.txt
ffmpeg -v error -y -f concat -safe 0 -i out/v5/parts.txt -c copy out/v5/video_only.mp4
node -e "const fs=require('fs');const m={};for(const f of fs.readdirSync('out/v5').filter(f=>f.endsWith('.meta.json')))Object.assign(m,JSON.parse(fs.readFileSync('out/v5/'+f)));fs.writeFileSync('out/v5/frame_meta.json',JSON.stringify(m));console.log('meta frames',Object.keys(m).length)"
ffprobe -v error -count_frames -select_streams v -show_entries stream=nb_read_frames -of csv=p=0 out/v5/video_only.mp4
