#!/usr/bin/env bash
# Ingest a licensed clip for a footage slot: trims, crops to the photo frame's aspect (820x560), writes 30 fps JPG frames.
#   tools/extract-footage.sh footage/laptop.mov laptop 3.2      (clip, slot id, start second in the source)
# Then set FOOTAGE[<slot>].frames = 'footage/frames/<slot>' and the person's box in FOOTAGE[<slot>].protect (src/scene.mjs),
# and add per-frame loading in scene.render (see the TODO there). The grade itself is applied in the renderer.
set -euo pipefail
IN=$1; ID=$2; SS=${3:-0}; OUT=footage/frames/$ID
mkdir -p "$OUT"
ffmpeg -v error -y -ss "$SS" -i "$IN" -t 6 -vf "fps=30,scale=1640:1120:force_original_aspect_ratio=increase,crop=1640:1120" -q:v 2 "$OUT/%04d.jpg"
ls "$OUT" | wc -l
