// Assemble the VO stem from src/timeline.mjs VO_EDIT: cut each line out of its take (cuts sit in breaths/silence),
// 12 ms fades at every cut, place at `at`, high-pass 70 Hz, set the stem to -16.5 LUFS integrated, and a transparent peak limiter at -2 dBFS.
//   node tools/build-vo.mjs  ->  out/stems/A_vo.wav (48 kHz / 24-bit stereo, 25.000 s)
//   node tools/build-vo.mjs src/v5/timeline.mjs out/stems/v5_vo.wav   (another version's timeline / stem)
import {execFileSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import path from 'node:path';
const TL = await import(path.resolve(process.argv[2] || 'src/timeline.mjs'));
const OUT = process.argv[3] || 'out/stems/A_vo.wav', RAW = OUT.replace(/\.wav$/, '_raw.wav');
mkdirSync('out/stems', {recursive: true});
const files = TL.VO_EDIT.map(e => e.file);   // one input per segment: a shared input feeding several delayed branches stalls ffmpeg
const parts = TL.VO_EDIT.map((e, i) => {
  const k = i, len = e.src[1] - e.src[0];
  return `[${k}:a]atrim=${e.src[0]}:${e.src[1]},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=mono,afade=t=in:d=0.012,afade=t=out:st=${(len - 0.012).toFixed(3)}:d=0.012,adelay=${Math.round(e.at * 1000)}[p${i}]`;
});
const graph = parts.join(';') + ';' + TL.VO_EDIT.map((_, i) => `[p${i}]`).join('') + `amix=inputs=${TL.VO_EDIT.length}:normalize=0,highpass=f=70,apad,atrim=0:${TL.DURATION},aformat=channel_layouts=stereo[v]`;
execFileSync('ffmpeg', ['-v', 'error', '-y', ...files.flatMap(f => ['-i', f]), '-filter_complex', graph, '-map', '[v]', '-c:a', 'pcm_s24le', '-ar', '48000', RAW]);
const meas = execFileSync('bash', ['-c', 'ffmpeg -hide_banner -nostats -i ' + RAW + ' -af ebur128 -f null - 2>&1 | grep -A3 Summary | grep "I:"']).toString();
const I = +/I:\s+(-?[\d.]+)/.exec(meas)[1], g = -16.5 - I;
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', RAW, '-af', `volume=${g.toFixed(2)}dB,alimiter=limit=0.79:attack=3:release=60:level=false`, '-c:a', 'pcm_s24le', OUT]);
execFileSync('rm', [RAW]);
console.log(`VO stem: measured ${I} LUFS, gain ${g.toFixed(2)} dB -> -16.5 LUFS`);
