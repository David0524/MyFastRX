// Original music bed + glass/UI sound effects, composed in code for Version A. 48 kHz stereo.
//   node audio/compose.mjs  ->  audio/stems/A_music.wav, audio/stems/A_sfx.wav, audio/sfx/*.wav (single hits), audio/sfx_onsets.json
// Tempo and cue times come from src/timeline.mjs, so every landing sound sits on its visual landing.
//
// Arrangement is built around a voice that is not recorded yet: the only melodic line lives ABOVE 3.5 kHz (small glass-like
// plucked keys); piano chords and plucked bass sit low (fundamentals under ~300 Hz, softened above); light kick + shaker.
// Nothing melodic lives in the 300-3500 Hz speech band. The bed ducks under the planned VO windows (mix.sh re-ducks from the
// real VO stem once it exists).
import {writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import * as TL from '../src/timeline.mjs';

const SR = 48000, DUR = TL.DURATION, N = Math.round(SR * DUR);
const ROOT = path.dirname(new URL(import.meta.url).pathname);
mkdirSync(path.join(ROOT, 'stems'), {recursive: true}); mkdirSync(path.join(ROOT, 'sfx'), {recursive: true});
let seed = 12345; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const midi = m => 440 * 2 ** ((m - 69) / 12);
const db = d => 10 ** (d / 20);

// ---------- tiny DSP ----------
function onePoleLP(x, fc) { const a = Math.exp(-2 * Math.PI * fc / SR); let y = 0; for (let i = 0; i < x.length; i++) { y = (1 - a) * x[i] + a * y; x[i] = y; } return x; }
function onePoleHP(x, fc) { const a = Math.exp(-2 * Math.PI * fc / SR); let y = 0, px = 0; for (let i = 0; i < x.length; i++) { y = a * (y + x[i] - px); px = x[i]; x[i] = y; } return x; }
function biquadBP(x, f0, q) {  // RBJ band-pass, constant 0 dB peak
  const w = 2 * Math.PI * f0 / SR, al = Math.sin(w) / (2 * q), a0 = 1 + al;
  const b0 = al / a0, b2 = -al / a0, a1 = -2 * Math.cos(w) / a0, a2 = (1 - al) / a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) { const y = b0 * x[i] + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = y; x[i] = y; } return x;
}
const add = (dst, src, at, g = 1, pan = 0) => {   // dst = [L, R]
  const o = Math.round(at * SR), gl = g * Math.cos((pan + 1) * Math.PI / 4), gr = g * Math.sin((pan + 1) * Math.PI / 4);
  for (let i = 0; i < src.length; i++) { const k = o + i; if (k < 0 || k >= dst[0].length) continue; dst[0][k] += src[i] * gl; dst[1][k] += src[i] * gr; }
};

// ---------- instruments ----------
// Soft felt piano: inharmonic partials, per-partial decay, gentle hammer; brightness kept low.
function piano(f, dur, vel = .5) {
  const n = Math.round(SR * (dur + 1.6)), x = new Float32Array(n), B = .00012;
  for (let k = 1; k <= 10; k++) {
    const fk = f * k * Math.sqrt(1 + B * k * k); if (fk > 5000) break;
    const amp = vel * (1 / k ** 1.5) * (fk > 300 ? .35 : 1);           // tame partials in the speech band
    const dec = 2.8 / (1 + .45 * k), ph = rnd() * 6.28;
    for (let i = 0; i < n; i++) {
      const t = i / SR; const rel = t > dur ? Math.exp(-(t - dur) / .35) : 1;
      x[i] += amp * Math.sin(2 * Math.PI * fk * t + ph) * Math.exp(-t / dec) * rel * Math.min(1, t / .006);
    }
  }
  return onePoleLP(x, 1400);
}
// Karplus-Strong pluck (bass and the high glass keys)
function pluck(f, dur, bright = .5, damp = .996) {
  const n = Math.round(SR * dur), x = new Float32Array(n), L = Math.max(2, Math.round(SR / f));
  const buf = new Float32Array(L); for (let i = 0; i < L; i++) buf[i] = (rnd() * 2 - 1);
  onePoleLP(buf, 200 + bright * 8000);
  let idx = 0;
  for (let i = 0; i < n; i++) { const a = buf[idx], b2 = buf[(idx + 1) % L]; const v = damp * (a * (.5 + bright * .2) + b2 * (.5 - bright * .2)); buf[idx] = v; x[i] = a; idx = (idx + 1) % L; }
  for (let i = 0; i < n; i++) x[i] *= Math.min(1, (n - i) / (SR * .05));
  return x;
}
// small glass-like key (bell partials), fundamentals >= 3.5 kHz
function glassKey(f, dur = 1.2, vel = .3) {
  const n = Math.round(SR * dur), x = new Float32Array(n);
  for (const [r, a, d] of [[1, 1, .55], [2.01, .25, .25], [2.76, .12, .16]]) {
    const fk = f * r; if (fk > 16000) continue; const ph = rnd() * 6.28;
    for (let i = 0; i < n; i++) { const t = i / SR; x[i] += vel * a * Math.sin(2 * Math.PI * fk * t + ph) * Math.exp(-t / d) * Math.min(1, t / .002); }
  }
  return x;
}
function kick(vel = .5) {
  const n = Math.round(SR * .45), x = new Float32Array(n); let ph = 0;
  for (let i = 0; i < n; i++) { const t = i / SR, f = 48 + 60 * Math.exp(-t / .03); ph += 2 * Math.PI * f / SR; x[i] = vel * Math.sin(ph) * Math.exp(-t / .16) * Math.min(1, t / .003); }
  return x;
}
function shaker(vel = .1, len = .09) {
  const n = Math.round(SR * len), x = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = i / SR; x[i] = (rnd() * 2 - 1) * vel * Math.min(1, t / .012) * Math.exp(-t / .03); }
  return biquadBP(onePoleHP(x, 5000), 8500, .9);
}

// ---------- music ----------
const music = [new Float32Array(N), new Float32Array(N)];
const bar = 4 * TL.BEAT;                                   // 2.5 s
// D major bed: D - Bm - G - A, x2, then G - D (end card)
const CH = [
  {root: 38, tones: [50, 57, 61, 64]},   // Dmaj9-ish: D2 | D3 A3 C#4 E4
  {root: 35, tones: [47, 54, 57, 62]},   // Bm7:  B1 | B2 F#3 A3 D4
  {root: 31, tones: [43, 50, 54, 57]},   // Gmaj7: G1 | G2 D3 F#3 A3
  {root: 33, tones: [45, 52, 57, 59]},   // Asus: A1 | A2 E3 A3 B3
];
const prog = [0, 1, 2, 3, 0, 1, 2, 3, 0, 2, 0];   // 11 bars = 27.5 s
prog.forEach((ci, bi) => {
  const t0 = bi * bar, c = CH[ci], last = bi === prog.length - 1;
  const len = last ? DUR - t0 - .2 : bar * .95;
  // piano: chord on 1, a softer re-voice on the "and" of 2
  c.tones.forEach((m, j) => add(music, piano(midi(m), len, .16 - j * .018), t0 + j * .012, 1, -.25 + j * .17));
  if (!last) c.tones.slice(1).forEach((m, j) => add(music, piano(midi(m), bar * .4, .07), t0 + 1.5 * TL.BEAT + j * .01, 1, .2 - j * .15));
  // plucked bass on 1 and 3 (enters bar 2)
  if (bi >= 1) { add(music, pluck(midi(c.root + 12), bar * .5, .25, .9985), t0, .34, 0); if (!last) add(music, pluck(midi(c.root + 12), bar * .45, .2, .9985), t0 + 2 * TL.BEAT, .24, 0); }
  // light percussion from bar 2 to bar 9
  if (bi >= 1 && bi <= 8) {
    add(music, kick(.32), t0, 1, 0); add(music, kick(.22), t0 + 2 * TL.BEAT, 1, 0);
    for (let e = 0; e < 8; e++) add(music, shaker(e % 2 ? .05 : .08), t0 + e * TL.BEAT / 2, 1, .35);
  }
});
// the melody: small glass keys above 3.5 kHz (A7 = 3520 Hz and up), a two-bar motif
const MOTIF = [[0, 105], [1.5, 107], [2.5, 109], [4, 105], [5.5, 104], [6.5, 102]];   // [beat, midi] ; 105 = A7
for (let rep = 0; rep < 5; rep++) {
  const tb = rep * 2 * bar;
  MOTIF.forEach(([bt, m], k) => { add(music, glassKey(midi(m), 1.1, .075), tb + bt * TL.BEAT, 1, k % 2 ? .4 : -.4); });
}
// final shimmer on the end card, then the tail fades out by the last frame
add(music, glassKey(midi(105), 2.5, .06), 10 * bar, 1, -.3); add(music, glassKey(midi(110), 2.5, .045), 10 * bar + .02, 1, .3);
const fadeOut = (x, t0, t1) => { for (let i = Math.round(t0 * SR); i < x.length; i++) x[i] *= Math.max(0, 1 - (i / SR - t0) / (t1 - t0)); };
music.forEach(ch => fadeOut(ch, DUR - 1.2, DUR - .02));
// duck under the planned VO windows (-7 dB, 80 ms in, 300 ms out)
const duck = new Float32Array(N).fill(1);
for (let i = 0; i < N; i++) {
  const t = i / SR; let g = 0;
  for (const v of TL.VO) { const a = Math.min(1, Math.max(0, (t - (v.t0 - .08)) / .08)), r = Math.min(1, Math.max(0, ((v.t1 + .3) - t) / .3)); g = Math.max(g, Math.min(a, r)); }
  duck[i] = 1 - g * (1 - db(-7));
}
music.forEach(ch => { for (let i = 0; i < N; i++) ch[i] *= duck[i]; });
// glass intro: the bed eases in after the first tap
if (TL.MUSIC_IN) music.forEach(ch => { for (let i = 0; i < N; i++) { const u = Math.min(1, Math.max(0, (i / SR - TL.MUSIC_IN.t0) / (TL.MUSIC_IN.t1 - TL.MUSIC_IN.t0))); ch[i] *= u * u * (3 - 2 * u); } });

// ---------- sound effects ----------
function tapGlass(vel = .6) {
  const n = Math.round(SR * .6), x = new Float32Array(n);
  for (const [f, a, d] of [[2380, 1, .22], [3740, .6, .14], [5230, .35, .09], [6980, .2, .06]]) { const ph = rnd() * 6.28; for (let i = 0; i < n; i++) { const t = i / SR; x[i] += vel * a * .5 * Math.sin(2 * Math.PI * f * t + ph) * Math.exp(-t / d); } }
  for (let i = 0; i < SR * .004; i++) x[i] += (rnd() * 2 - 1) * vel * .4 * (1 - i / (SR * .004));
  return x;
}
function tapLow(vel = .6) {
  const n = Math.round(SR * .4), x = new Float32Array(n);
  for (const [f, a, d] of [[180, 1, .07], [540, .5, .08], [1220, .3, .06], [2450, .25, .05]]) { const ph = rnd() * 6.28; for (let i = 0; i < n; i++) { const t = i / SR; x[i] += vel * a * .5 * Math.sin(2 * Math.PI * f * t + ph) * Math.exp(-t / d) * Math.min(1, t / .0015); } }
  return x;
}
function slide(len, f0, f1, vel = .5) {
  const n = Math.round(SR * len), x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = rnd() * 2 - 1;
  // time-varying band-pass (block-wise)
  const out = new Float32Array(n), B = 256;
  for (let s = 0; s < n; s += B) { const u = s / n, blk = x.slice(s, s + B); biquadBP(blk, f0 * (f1 / f0) ** u, 1.4); out.set(blk, s); }
  for (let i = 0; i < n; i++) { const u = i / n; out[i] *= vel * Math.sin(Math.PI * Math.min(1, u * 1.25)) ** 1.5; }
  return out;
}
// glass gliding on a table: soft band-passed friction noise, bright at first, darker and quieter as it slows
function glide(len) {
  const n = Math.round(SR * len), out = new Float32Array(n), B = 256;
  for (let st = 0; st < n; st += B) {
    const u = st / n, blk = new Float32Array(Math.min(B, n - st)); for (let i = 0; i < blk.length; i++) blk[i] = rnd() * 2 - 1;
    biquadBP(blk, 5200 * (1 - .7 * u), 2.2); out.set(blk, st);
  }
  for (let i = 0; i < n; i++) { const u = i / n; out[i] *= .35 * Math.min(1, u * 40) * Math.exp(-u * 3.2); }
  return out;
}
function press(vel = .6) { const a = tapLow(vel * .8), b = tapGlass(vel * .5); for (let i = 0; i < b.length && i < a.length; i++) a[i] += b[i] * (i > SR * .012 ? 1 : 0); return a; }
function toggle(vel = .7) {
  const n = Math.round(SR * .5), x = new Float32Array(n);
  const click = (o, v) => { for (let i = 0; i < SR * .006; i++) x[o + i] += (rnd() * 2 - 1) * v * Math.exp(-i / (SR * .0012)); };
  click(0, vel); click(Math.round(SR * .038), vel * .6);
  const t2 = tapGlass(vel * .45); for (let i = 0; i < t2.length && i + Math.round(SR * .038) < n; i++) x[i + Math.round(SR * .038)] += t2[i];
  return onePoleHP(x, 400);
}
function click(vel = .7) {   // a short, soft mouse click: two tiny transients + a faint glass tick
  const n = Math.round(SR * .12), x = new Float32Array(n);
  for (const [o, v] of [[0, vel], [Math.round(SR * .018), vel * .45]]) for (let i = 0; i < SR * .004 && o + i < n; i++) x[o + i] += (rnd() * 2 - 1) * v * Math.exp(-i / (SR * .0009));
  const tk = tapGlass(vel * .18); for (let i = 0; i < n; i++) x[i] += tk[i];
  return onePoleHP(x, 900);
}
function chime(vel = .4) { const a = glassKey(midi(98), 2.2, vel), c = glassKey(midi(105), 2.2, vel * .7); for (let i = 0; i < a.length; i++) a[i] += c[i]; return a; }
const LIB = {
  tap_glass: () => tapGlass(.6), tap_low: () => tapLow(.6), slide_soft: () => slide(.55, 700, 2600, .35), slide_air: () => slide(.95, 2200, 6500, .25), slide_long: () => glide(2.3),
  press: () => press(.65), click: () => click(.7), toggle: () => toggle(.75), chime_end: () => chime(.35),
};
// measure where each sound is actually heard: first sample within 30 dB of its peak
const onsets = {};
for (const [id, fn] of Object.entries(LIB)) {
  const x = fn(); let pk = 0; for (const v of x) pk = Math.max(pk, Math.abs(v));
  const th = pk * db(-30); let k = 0; while (k < x.length && Math.abs(x[k]) < th) k++;
  onsets[id] = +(k / SR).toFixed(4);
  writeWav(path.join(ROOT, 'sfx', id + '.wav'), [x, x]);
}
const sfx = [new Float32Array(N), new Float32Array(N)];
seed = 777;
for (const s of TL.SFX) {
  const x = LIB[s.id](); let pk = 0; for (const v of x) pk = Math.max(pk, Math.abs(v));
  add(sfx, x, s.at - onsets[s.id], db(s.gain) / pk, 0);
}
writeFileSync(path.join(ROOT, 'sfx_onsets.json'), JSON.stringify({onsets_s: onsets, placements: TL.SFX.map(s => ({...s, file_start: +(s.at - onsets[s.id]).toFixed(4)}))}, null, 2));

// normalize the music bed to a fixed peak so it sits well under the VO; SFX kept at their cue gains
let mp = 0; for (const ch of music) for (const v of ch) mp = Math.max(mp, Math.abs(v));
music.forEach(ch => { for (let i = 0; i < N; i++) ch[i] *= db(-14) / mp; });
writeWav(path.join(ROOT, 'stems', 'A_music.wav'), music);
writeWav(path.join(ROOT, 'stems', 'A_sfx.wav'), sfx);
console.log('onsets', onsets);

function writeWav(file, [l, r]) {
  const n = l.length, buf = Buffer.alloc(44 + n * 8);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 8, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(3, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 8, 28);
  buf.writeUInt16LE(8, 32); buf.writeUInt16LE(32, 34); buf.write('data', 36); buf.writeUInt32LE(n * 8, 40);
  for (let i = 0; i < n; i++) { buf.writeFloatLE(l[i], 44 + i * 8); buf.writeFloatLE(r[i], 48 + i * 8); }
  const tmp = file + '.f32.wav'; writeFileSync(tmp, buf);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', tmp, '-c:a', 'pcm_s24le', file]); execFileSync('rm', [tmp]);
}
