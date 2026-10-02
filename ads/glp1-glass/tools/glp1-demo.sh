#!/usr/bin/env bash
# One demo of VO line 1 with the 4th re-recorded "GLP-1" take: an extra pause (room tone) before "care" and an optional
# gentle tempo on "GLP-1", mixed with the v7 music + SFX for the first 4.6 s -> previews/glp1_demos/<name>.m4a
#   tools/glp1-demo.sh <name> <extra pause s> <tempo>
# $1 name, $2 extra pause (s) before "care", $3 tempo for "GLP-1" (1 = untouched)
cd "$(dirname "$0")/.."; S=$(mktemp -d)
TEMPO=""; [ "$3" != "1" ] && TEMPO=",rubberband=tempo=$3:formant=preserved:pitchq=quality"
# room tone for the extra pause: from a silence between takes (4.15-4.48 s)
ffmpeg -v error -y -i vo/glp1_takes.wav -i vo/body_v3.wav -i vo/glp1_takes.wav -filter_complex "[0:a]atrim=4.52:5.64,asetpts=PTS-STARTPTS,volume=4.4dB,aresample=48000,aformat=channel_layouts=mono$TEMPO[a];[2:a]atrim=4.15:$(python3 -c "print(4.15+max(0.02,$2))"),asetpts=PTS-STARTPTS,volume=4.4dB,aresample=48000,aformat=channel_layouts=mono[r];[1:a]atrim=1.09:2.75,asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=mono[b];[a][r]acrossfade=d=0.01:c1=tri:c2=tri[ar];[ar][b]acrossfade=d=0.012:c1=tri:c2=tri[o]" -map "[o]" -ar 48000 $S/l1_$1.wav
# the voice starts at 0.25 s (speech 0.03 s into the take, scaled by the tempo)
at=$(python3 -c "print(round(0.25-0.03/$3,3))")
ffmpeg -v error -y -i $S/l1_$1.wav -i out/stems/v7_music.wav -i out/stems/v7_sfx.wav -filter_complex "[0:a]adelay=$(python3 -c "print(int($at*1000))"),volume=2.1,aformat=channel_layouts=stereo[v];[v][1:a][2:a]amix=inputs=3:normalize=0,atrim=0:4.6,afade=t=out:st=4.2:d=0.4,loudnorm=I=-16:TP=-1.5[o]" -map "[o]" -ar 48000 -c:a aac -b:a 192k previews/glp1_demos/$1.m4a
care=$(python3 -c "print(round($at + (1.12-0.01)/$3 + max(0.02,$2) - 0.01 + 0.06 - 0.012, 2))")
echo "$1: pause +$2 s, GLP-1 tempo $3 -> 'care' at ${care} s; heard: $(python3 tools/transcribe.py $S/l1_$1.wav 2>/dev/null | head -1 | cut -d' ' -f2-)"
