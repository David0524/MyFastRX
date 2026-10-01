#!/usr/bin/env bash
# Generated footage (footage/gen/*.mp4) -> graded 1080x1920 JPEG frames at the source rate, for the v6 film.
#   tools/extract-gen.sh tap_take1_1080p tap      -> footage/frames/tap/0001.jpg ...  (the _1080p files are Higgsfield AI upscales)
# Upscale (lanczos + a light unsharp), then a gentle grade toward the ad's palette: a touch brighter and cooler,
# slightly less saturated, so the real world and the glass world sit in one light.
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=footage/gen/$1.mp4; OUT=footage/frames/$2
rm -rf "$OUT"; mkdir -p "$OUT"
SW=$(ffprobe -v error -select_streams v -show_entries stream=width -of csv=p=0 "$SRC")
SHARP=$([ "$SW" -ge 1080 ] && echo "" || echo "unsharp=5:5:0.45:5:5:0,")   # AI-upscaled 1080p sources need no extra sharpening
ffmpeg -v error -y -i "$SRC" -vf "scale=1080:1920:flags=lanczos,${SHARP}eq=brightness=0.015:saturation=0.93:gamma=1.03,colorbalance=rs=-0.02:bs=0.03:rm=-0.01:bm=0.02" -q:v 2 -start_number 1 "$OUT/%04d.jpg"
echo "$OUT: $(ls "$OUT" | wc -l) frames"
