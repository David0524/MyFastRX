#!/usr/bin/env bash
# Phone previews with platform safe-zone overlays (review only - never burned into the deliverable).
#   tools/preview.sh out/MyFastRx_LiquidGlass_A.mp4 A  ->  previews/A_reels_safezones.png, previews/A_stories_safezones.png
# Zones follow Meta's published 9:16 guidance: Reels keep the top 14% (269 px), bottom 35% (672 px) and 6% sides clear of
# key content; Stories keep the top and bottom 14% (269 px) clear. Mock UI (right rail, caption, reply bar) is approximate.
set -euo pipefail
cd "$(dirname "$0")/.."
IN=$1; V=$2; mkdir -p previews
F=assets/fonts/Geist-SemiBold.ttf
TIMES=(3.5 7.5 13.8 17.4 23.0)
for mode in reels stories; do
  inputs=(); filt=""
  for i in "${!TIMES[@]}"; do inputs+=(-ss "${TIMES[$i]}" -i "$IN"); done
  for i in "${!TIMES[@]}"; do
    if [[ $mode == reels ]]; then
      Z="drawbox=x=0:y=0:w=1080:h=269:color=red@0.22:t=fill,drawbox=x=0:y=1248:w=1080:h=672:color=red@0.22:t=fill,drawbox=x=0:y=269:w=65:h=979:color=red@0.22:t=fill,drawbox=x=1015:y=269:w=65:h=979:color=red@0.22:t=fill"
      Z="$Z,drawbox=x=955:y=1150:w=100:h=500:color=black@0.35:t=fill,drawbox=x=40:y=1560:w=820:h=60:color=black@0.35:t=fill,drawbox=x=40:y=1640:w=700:h=44:color=black@0.25:t=fill,drawbox=x=40:y=60:w=300:h=60:color=black@0.25:t=fill"
      Z="$Z,drawtext=fontfile=$F:text='REELS UNSAFE':x=30:y=1860:fontsize=34:fontcolor=white:box=1:boxcolor=red@0.7"
    else
      Z="drawbox=x=0:y=0:w=1080:h=269:color=red@0.22:t=fill,drawbox=x=0:y=1651:w=1080:h=269:color=red@0.22:t=fill"
      Z="$Z,drawbox=x=30:y=40:w=1020:h=8:color=white@0.8:t=fill,drawbox=x=40:y=80:w=420:h=70:color=black@0.25:t=fill,drawbox=x=40:y=1760:w=820:h=100:color=black@0.3:t=fill"
      Z="$Z,drawtext=fontfile=$F:text='STORIES UNSAFE':x=30:y=1860:fontsize=34:fontcolor=white:box=1:boxcolor=red@0.7"
    fi
    filt+="[$i:v]$Z,drawtext=fontfile=$F:text='${TIMES[$i]}s':x=30:y=290:fontsize=36:fontcolor=white:box=1:boxcolor=black@0.6,pad=1120:1960:20:20:color=0x1a1a1a[p$i];"
  done
  filt+="$(for i in "${!TIMES[@]}"; do printf '[p%d]' $i; done)hstack=${#TIMES[@]},scale=-2:1100[o]"
  ffmpeg -v error -y "${inputs[@]}" -frames:v 1 -filter_complex "$filt" -map "[o]" -frames:v 1 "previews/${V}_${mode}_safezones.png"
done
ls -la previews
