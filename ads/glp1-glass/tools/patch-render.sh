#!/usr/bin/env bash
# Re-render only frames [FROM, TO) of a version and splice them into its existing out/<v>/video_only.mp4, instead of
# re-rendering whole 216-frame chunks. Splits the range across WORKERS (default 4 = this machine's cores).
#   tools/patch-render.sh v7 639 732 [WORKERS]
# Then run the version's mix (./mix_v7.sh) as usual. Afterwards video_only.mp4 is the master: the old chunk files are
# removed (a full ./render-v7.sh rebuilds everything).
set -euo pipefail
cd "$(dirname "$0")/.."
V=$1; FROM=$2; TO=$3; NW=${4:-4}; TLF=src/$V/timeline.mjs; OUT=out/$V
N=$(node -e "import('./$TLF').then(t=>console.log(Math.round(t.DURATION*t.FPS)))")
rm -f $OUT/patch_*
STEP=$(( (TO - FROM + NW - 1) / NW )); pids=()
for ((a = FROM; a < TO; a += STEP)); do b=$(( a + STEP < TO ? a + STEP : TO ))
  node render.mjs --tl $TLF --prefix $V/patch --page $V/film --layout $V/layout.json --from $a --to $b > $OUT/patch_$a.log 2>&1 & pids+=($!); done
for p in "${pids[@]}"; do wait $p; done
for f in $OUT/patch_*.log; do grep -q "^wrote" $f || { echo "patch render failed: $f"; tail -c 300 $f; exit 1; }; done
# splice: old [0, FROM) + the new frames + old [TO, N), one near-lossless re-encode (same settings as render.mjs)
ins=(-i $OUT/video_only.mp4); lab=""; k=1
for f in $(ls $OUT/patch_*.mp4 | sort); do ins+=(-i $f); lab="$lab[$k:v]"; k=$((k+1)); done
FC="[0:v]trim=end_frame=$FROM,setpts=PTS-STARTPTS[a];[0:v]trim=start_frame=$TO,setpts=PTS-STARTPTS[c];[a]${lab}[c]concat=n=$((k+1)):v=1[v]"
ffmpeg -v error -y "${ins[@]}" -filter_complex "$FC" -map "[v]" -r 30 -c:v libx264 -preset fast -crf 6 -pix_fmt yuv444p \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 $OUT/video_new.mp4
M=$(ffprobe -v error -count_frames -select_streams v -show_entries stream=nb_read_frames -of csv=p=0 $OUT/video_new.mp4)
[ "$M" -eq "$N" ] || { echo "spliced video has $M frames, expected $N"; exit 1; }
mv $OUT/video_new.mp4 $OUT/video_only.mp4
node -e "const fs=require('fs');const d='$OUT/';const m=JSON.parse(fs.readFileSync(d+'frame_meta.json'));for(const f of fs.readdirSync(d).filter(f=>/^patch_.*\.meta\.json$/.test(f)))Object.assign(m,JSON.parse(fs.readFileSync(d+f)));fs.writeFileSync(d+'frame_meta.json',JSON.stringify(m));console.log('meta frames',Object.keys(m).length)"
rm -f $OUT/patch_* $OUT/part_*
echo "patched frames $FROM-$((TO-1)) into $OUT/video_only.mp4 ($M frames)"
