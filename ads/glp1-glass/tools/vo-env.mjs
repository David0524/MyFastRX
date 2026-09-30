// Speech map of a VO file: every sound/silence boundary (10 ms RMS, gate relative to the file's loudest 10 ms).
//   node tools/vo-env.mjs vo/body.wav [gate_dB=-38] [min_gap_s=0.09]
import {execFileSync} from 'node:child_process';
const [f, gate = -38, gap = .09] = process.argv.slice(2);
const pcm = execFileSync('ffmpeg', ['-v', 'error', '-i', f, '-ac', '1', '-ar', '48000', '-f', 'f32le', '-'], {maxBuffer: 1 << 28});
const x = new Float32Array(pcm.buffer, pcm.byteOffset, pcm.length / 4), H = 480, rms = [];
for (let i = 0; i + H <= x.length; i += H) { let s = 0; for (let k = 0; k < H; k++) s += x[i + k] ** 2; rms.push(Math.sqrt(s / H)); }
const pk = Math.max(...rms), th = pk * 10 ** (+gate / 20);
const segs = []; let on = -1, off = -1;
rms.forEach((r, i) => { if (r > th) { if (on < 0) on = i; else if (off >= 0 && (i - off) * .01 < +gap) {} else if (off >= 0) { segs.push([on, off]); on = i; } off = -1; } else if (on >= 0 && off < 0) off = i; });
if (on >= 0) segs.push([on, off < 0 ? rms.length : off]);
console.log(f, 'duration', (x.length / 48000).toFixed(3));
segs.forEach(([a, b], k) => console.log(`${k}: ${(a * .01).toFixed(2)} - ${(b * .01).toFixed(2)}  (${((b - a) * .01).toFixed(2)} s)${k ? '  gap ' + ((a - segs[k - 1][1]) * .01).toFixed(2) : ''}`));
