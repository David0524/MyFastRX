#!/usr/bin/env bash
# Mix + final encode for v6 "Touch".   ./mix_v6.sh  ->  out/MyFastRx_Touch_v6.mp4 and out/stems/v6_*.wav
# VO placed per src/v6/timeline.mjs VO_EDIT (tools/build-vo.mjs); two-pass loudnorm to -16 LUFS / -1.5 dBTP; H.264 12.5 Mbps CBR.
set -euo pipefail
cd "$(dirname "$0")"
V=out/v6/video_only.mp4; M=audio/stems/v6_music.wav; S=audio/stems/v6_sfx.wav
OUT=out/MyFastRx_Touch_v6.mp4; TLF=src/v6/timeline.mjs
mkdir -p out/stems
cp "$M" out/stems/v6_music.wav; cp "$S" out/stems/v6_sfx.wav
D=$(node -e "import('./'+process.argv[1]).then(t=>console.log(t.DURATION))" $TLF)
if node -e "import('./'+process.argv[1]).then(t=>process.exit(t.VO_EDIT.length ? 0 : 1))" $TLF; then
  # VO lines placed per VO_EDIT; the music bed is already ducked under the measured VO windows
  node tools/build-vo.mjs $TLF out/stems/v6_vo.wav
  ffmpeg -v error -y -i out/stems/v6_music.wav -i out/stems/v6_sfx.wav -i out/stems/v6_vo.wav -filter_complex "[0][1][2]amix=inputs=3:normalize=0,atrim=0:$D" -c:a pcm_s24le out/v6/premix.wav
  # two-pass loudnorm to -16 LUFS integrated, -1.5 dBTP
  J=$(ffmpeg -hide_banner -nostats -i out/v6/premix.wav -af loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
  g(){ echo "$J" | sed -n "s/.*\"$1\" : \"\(.*\)\".*/\1/p"; }
  ffmpeg -v error -y -i out/v6/premix.wav -af "loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true,aresample=48000" -c:a pcm_s24le out/v6/mix.wav
else
  rm -f out/stems/v6_vo.wav
  echo "NOTE: no VO in vo/ - mixing music + SFX only, at bed level (no -16 LUFS normalization)."
  ffmpeg -v error -y -i out/stems/v6_music.wav -i out/stems/v6_sfx.wav -filter_complex "[0][1]amix=inputs=2:normalize=0,alimiter=limit=0.84:level=false,atrim=0:$D" -c:a pcm_s24le out/v6/mix.wav
fi
# Final: H.264 High, 1080x1920, 30 fps CFR, progressive, 4:2:0, Rec.709 SDR (tv range), 12.5 Mbps CBR (HRD-signalled,
# because this bright, clean picture would otherwise encode far below the 10-15 Mbps spec); AAC-LC 48 kHz stereo.
VF="scale=1080:1920:in_color_matrix=bt709:out_color_matrix=bt709:in_range=tv:out_range=tv:flags=lanczos,format=yuv420p,setsar=1"
X264="-c:v libx264 -preset slow -profile:v high -level 4.2 -b:v 12.5M -minrate 12.5M -maxrate 12.5M -bufsize 12.5M -r 30 -g 60 -bf 2 -x264-params nal-hrd=cbr:force-cfr=1"
COL="-color_primaries bt709 -color_trc bt709 -colorspace bt709 -color_range tv"
ffmpeg -v error -y -i "$V" -vf "$VF" $X264 $COL -pass 1 -passlogfile out/v6/x264 -an -f mp4 /dev/null
ffmpeg -v error -y -i "$V" -i out/v6/mix.wav -map 0:v -map 1:a -vf "$VF" $X264 $COL -pass 2 -passlogfile out/v6/x264 \
  -c:a aac -b:a 256k -ar 48000 -ac 2 -movflags +faststart -shortest "$OUT"
rm -f out/v6/x264*
ffprobe -v error -show_entries stream=codec_name,profile,width,height,pix_fmt,r_frame_rate,field_order,bit_rate,color_space,color_primaries,color_transfer,sample_rate,channels -show_entries format=duration,bit_rate -of compact "$OUT"
