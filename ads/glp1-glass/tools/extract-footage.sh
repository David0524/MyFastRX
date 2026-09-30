#!/usr/bin/env bash
# Ingest the licensed clips into per-frame JPGs at 30 fps, cropped to the shape they fill on screen, with one shared grade.
#   tools/extract-footage.sh      -> footage/frames/<slot>/0001.jpg ...
# Grade (all clips): bright, soft, slightly cool, natural skin: lift + gentle contrast cut + slight desaturation +
# a small cool shift in shadows/mids. Per clip only the exposure (brightness) differs, to match them to each other.
set -euo pipefail
cd "$(dirname "$0")/.."
GRADE="eq=contrast=0.93:saturation=0.9:gamma=1.04,colorbalance=rs=-0.02:bs=0.03:rm=-0.015:bm=0.02"
one(){ local src=$1 slot=$2 ss=$3 dur=$4 crop=$5 size=$6 bright=$7
  rm -rf footage/frames/$slot; mkdir -p footage/frames/$slot
  ffmpeg -v error -y -ss "$ss" -i "$src" -t "$dur" -vf "fps=30,crop=$crop,scale=$size:flags=lanczos,eq=brightness=$bright,$GRADE" -q:v 2 "footage/frames/$slot/%04d.jpg"
  echo "$slot: $(ls footage/frames/$slot | wc -l) frames"; }
#    source                                          slot     in    dur  crop (w:h:x:y)      out size   exposure
one footage/src/mixkit-5072_latte-pour.mp4           latte    0.30  5.2  1080:1920:0:0       1080:1920  0.03
one footage/src/mixkit-4939_hands-typing-laptop.mp4  laptop   5.50  3.6  1080:632:0:534      820:480    0.09
one footage/src/mixkit-31155_package-to-door.mp4     package  3.20  3.9  1400:820:120:260    820:480    0.04
