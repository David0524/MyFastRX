#!/usr/bin/env bash
# Refraction proof sheet from the FINAL file: the same crop across consecutive moments, so the live bending is visible.
#   row 1: teal pill sliding over "Starting at $69" (the price bends at the pill's rim, then sits flat and sharp)
#   row 2: glass pulse tube sliding behind the vial (seen through the vial's clear neck/shoulder and base, bent by it)
#   row 3: the photo frame's rim over footage (placeholder) as the pill morphs into it
set -euo pipefail
cd "$(dirname "$0")/.."
IN=${1:-out/MyFastRx_LiquidGlass_A.mp4}; mkdir -p previews
row(){ local crop=$1; shift; local ins=() f=""; local i=0; for t in "$@"; do ins+=(-ss "$t" -i "$IN"); f+="[$i:v]crop=$crop,drawtext=fontfile=assets/fonts/Geist-SemiBold.ttf:text='${t}s':x=10:y=10:fontsize=28:fontcolor=white:box=1:boxcolor=black@0.6[c$i];"; i=$((i+1)); done
  f+="$(for j in $(seq 0 $((i-1))); do printf '[c%d]' $j; done)hstack=$i[o]"; ffmpeg -v error -y "${ins[@]}" -frames:v 1 -filter_complex "$f" -map "[o]" -frames:v 1 "$OUT_ROW"; }
OUT_ROW=previews/_r1.png row 560:300:370:620 1.70 1.90 2.10 2.30 2.60 3.00
OUT_ROW=previews/_r2.png row 560:300:0:560 5.20 5.45 5.70 5.95 6.20 7.00
OUT_ROW=previews/_r3.png row 560:300:360:440 8.95 9.05 9.15 9.25 9.40 9.80
ffmpeg -v error -y -i previews/_r1.png -i previews/_r2.png -i previews/_r3.png -filter_complex "[0][1][2]vstack=3,scale=-2:1350" previews/A_refraction_proof.png
rm previews/_r*.png; echo previews/A_refraction_proof.png
