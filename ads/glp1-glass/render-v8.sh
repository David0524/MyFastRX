#!/usr/bin/env bash
# Render v8 (the 10 s hero) in 4 parallel chunks -> out/v8/video_only.mp4 (+ frame_meta.json). Then ./mix_v8.sh.
set -euo pipefail
cd "$(dirname "$0")"
OUT=out/v8; mkdir -p $OUT; rm -f $OUT/part_*
N=300; NW=${1:-4}; STEP=$(( (N + NW - 1) / NW )); pids=()
for ((a = 0; a < N; a += STEP)); do b=$(( a + STEP < N ? a + STEP : N ))
  node render.mjs --tl src/v8/timeline.mjs --prefix v8/part --page v8/film --layout v8/layout.json --from $a --to $b > $OUT/part_$a.log 2>&1 & pids+=($!); done
for p in "${pids[@]}"; do wait $p; done
for f in $OUT/part_*.log; do grep -q "^wrote" $f || { echo "render failed: $f"; tail -c 300 $f; exit 1; }; done
ls $OUT/part_*.mp4 | sort | sed 's/^/file /;s/file out\/v8\//file /' > $OUT/list.txt
ffmpeg -v error -y -f concat -safe 0 -i $OUT/list.txt -c copy $OUT/video_only.mp4
node -e "const fs=require('fs');const d='$OUT/';const m={};for(const f of fs.readdirSync(d).filter(f=>/^part_.*\.meta\.json$/.test(f)))Object.assign(m,JSON.parse(fs.readFileSync(d+f)));fs.writeFileSync(d+'frame_meta.json',JSON.stringify(m));console.log('meta frames',Object.keys(m).length)"
rm -f $OUT/part_* $OUT/list.txt
echo "wrote $OUT/video_only.mp4 ($(ffprobe -v error -count_frames -select_streams v -show_entries stream=nb_read_frames -of csv=p=0 $OUT/video_only.mp4) frames)"
