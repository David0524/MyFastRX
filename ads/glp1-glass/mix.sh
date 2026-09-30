#!/usr/bin/env bash
# Mix + final encode for Version A.
#   ./mix.sh            -> out/MyFastRx_LiquidGlass_A.mp4 and out/stems/*.wav
# VO: when vo/hook_A.wav and vo/body.wav exist they are placed at HOOK_AT / BODY_AT seconds, the music is side-chain ducked
# from the VO itself, and the full mix is loudness-normalized to -16 LUFS integrated, -1.5 dBTP.
# Without VO (current state) the output carries music + SFX at their under-VO bed level (NOT raised to -16 LUFS, because
# that would push the bed up ~12 dB and it would then fight the voice).
set -euo pipefail
cd "$(dirname "$0")"
HOOK_AT=${HOOK_AT:-0.35}; BODY_AT=${BODY_AT:-4.55}
V=out/A_video_only.mp4; M=audio/stems/A_music.wav; S=audio/stems/A_sfx.wav
OUT=out/MyFastRx_LiquidGlass_A.mp4
mkdir -p out/stems
cp "$M" out/stems/A_music.wav; cp "$S" out/stems/A_sfx.wav
if [[ -f vo/hook_A.wav && -f vo/body.wav ]]; then
  ffmpeg -v error -y -i vo/hook_A.wav -i vo/body.wav -filter_complex \
    "[0]aresample=48000,aformat=channel_layouts=stereo,adelay=$(awk "BEGIN{print $HOOK_AT*1000}"):all=1[h];[1]aresample=48000,aformat=channel_layouts=stereo,adelay=$(awk "BEGIN{print $BODY_AT*1000}"):all=1[b];[h][b]amix=inputs=2:normalize=0,apad,atrim=0:25[v]" \
    -map "[v]" -c:a pcm_s24le out/stems/A_vo.wav
  GRAPH="[0][2]sidechaincompress=threshold=0.03:ratio=4:attack=20:release=300[md];[md][1][2]amix=inputs=3:normalize=0,atrim=0:25"
  ffmpeg -v error -y -i out/stems/A_music.wav -i out/stems/A_sfx.wav -i out/stems/A_vo.wav -filter_complex "$GRAPH" -c:a pcm_s24le out/A_premix.wav
  # two-pass loudnorm to -16 LUFS
  J=$(ffmpeg -hide_banner -nostats -i out/A_premix.wav -af loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
  g(){ echo "$J" | sed -n "s/.*\"$1\" : \"\(.*\)\".*/\1/p"; }
  ffmpeg -v error -y -i out/A_premix.wav -af "loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true,aresample=48000" -c:a pcm_s24le out/A_mix.wav
else
  echo "NOTE: no VO in vo/ - mixing music + SFX only, at bed level (no -16 LUFS normalization)."
  ffmpeg -v error -y -i out/stems/A_music.wav -i out/stems/A_sfx.wav -filter_complex "[0][1]amix=inputs=2:normalize=0,alimiter=limit=0.84:level=false,atrim=0:25" -c:a pcm_s24le out/A_mix.wav
fi
# Final: H.264 High, 1080x1920, 30 fps CFR, progressive, 4:2:0, Rec.709 SDR (tv range), 12.5 Mbps CBR (HRD-signalled,
# because this bright, clean picture would otherwise encode far below the 10-15 Mbps spec); AAC-LC 48 kHz stereo.
VF="scale=1080:1920:in_color_matrix=bt709:out_color_matrix=bt709:in_range=tv:out_range=tv:flags=lanczos,format=yuv420p,setsar=1"
X264="-c:v libx264 -preset slow -profile:v high -level 4.2 -b:v 12.5M -minrate 12.5M -maxrate 12.5M -bufsize 12.5M -r 30 -g 60 -bf 2 -x264-params nal-hrd=cbr:force-cfr=1"
COL="-color_primaries bt709 -color_trc bt709 -colorspace bt709 -color_range tv"
ffmpeg -v error -y -i "$V" -vf "$VF" $X264 $COL -pass 1 -passlogfile out/x264A -an -f mp4 /dev/null
ffmpeg -v error -y -i "$V" -i out/A_mix.wav -map 0:v -map 1:a -vf "$VF" $X264 $COL -pass 2 -passlogfile out/x264A \
  -c:a aac -b:a 256k -ar 48000 -ac 2 -movflags +faststart -shortest "$OUT"
rm -f out/x264A*
ffprobe -v error -show_entries stream=codec_name,profile,width,height,pix_fmt,r_frame_rate,field_order,bit_rate,color_space,color_primaries,color_transfer,sample_rate,channels -show_entries format=duration,bit_rate -of compact "$OUT"
