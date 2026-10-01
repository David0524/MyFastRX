// v5 "Hype": original music bed + glass/UI sound effects, composed in code. 48 kHz stereo.
//   node audio/compose_v5.mjs  ->  audio/stems/v5_music.wav, audio/stems/v5_sfx.wav, audio/sfx_v5/*.wav, audio/sfx_onsets_v5.json
// Tempo, arrangement marks and cue times come from src/v5/timeline.mjs, so every hit sits on its picture.
//
// A launch-sizzle bed at 120 BPM that still leaves the voice room: four-on-the-floor kick and sub bass (pumping off the
// kick), 16th hats and off-beat snaps above 2 kHz, the melody as small glass keys above 3.5 kHz, soft low-passed piano
// chords. The hook is just the glass sounds over a swelling pad and a riser into the drop at 3.0 s; a fill before the
// covers section, a one-beat break before the price lands on 15.0 s, and the drums stop for the end card.
// The bed ducks under the measured VO windows.
import {writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import * as TL from '../src/v5/timeline.mjs';

const SR = 48000, DUR = TL.DURATION, N = Math.round(SR * DUR);
const ROOT = path.dirname(new URL(import.meta.url).pathname);
mkdirSync(path.join(ROOT, 'stems'), {recursive: true}); mkdirSync(path.join(ROOT, 'sfx_v5'), {recursive: true});
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
const BT = TL.BEAT, BAR = 4 * BT, D0 = TL.MUSIC.drop, END = TL.MUSIC.endAt;
// D - Bm - G - A (as v3), one chord per bar from the drop
const CH = [
  {root: 38, tones: [50, 57, 61, 64]}, {root: 35, tones: [47, 54, 57, 62]},
  {root: 31, tones: [43, 50, 54, 57]}, {root: 33, tones: [45, 52, 57, 59]},
];
const chordAt = t => CH[((Math.floor((t - D0) / BAR) % 4) + 4) % 4];
function snapHit(vel = .3) {      // a dry finger snap / clap, kept above 2 kHz
  const n = Math.round(SR * .16), x = new Float32Array(n);
  for (const o of [0, .008, .017]) { const k0 = Math.round(o * SR); for (let i = 0; k0 + i < n; i++) x[k0 + i] += (rnd() * 2 - 1) * vel * Math.exp(-i / (SR * (o ? .006 : .028))); }
  return biquadBP(onePoleHP(x, 2200), 3400, .7);
}
function hat(vel = .06, open = false) { const n = Math.round(SR * (open ? .22 : .05)), x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = (rnd() * 2 - 1) * vel * Math.exp(-i / (SR * (open ? .07 : .012))); return onePoleHP(onePoleHP(x, 7000), 7000); }
function sub(f, len, vel = .5) { const n = Math.round(SR * len), x = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / SR; x[i] = vel * Math.sin(2 * Math.PI * f * t) * Math.min(1, t / .01) * Math.min(1, (len - t) / .03); } return x; }
function pad(tones, len, vel = .05) {   // soft detuned saw pad, low-passed under the speech band
  const n = Math.round(SR * len), x = new Float32Array(n);
  for (const m of tones) for (const dt of [-.06, .06]) { const f = midi(m + dt); let ph = rnd(); for (let i = 0; i < n; i++) { ph += f / SR; ph -= Math.floor(ph); x[i] += vel * (2 * ph - 1) / tones.length; } }
  for (let i = 0; i < n; i++) { const t = i / SR; x[i] *= Math.min(1, t / .35) * Math.min(1, (len - t) / .4); }
  return onePoleLP(onePoleLP(x, 900), 900);
}
// the hook: a pad swells under the glass sounds, a riser into the drop
add(music, pad([50, 57, 61, 64], D0 + .2, .05), .4, 1, 0);
{ const [r0, r1] = TL.MUSIC.riser, n = Math.round((r1 - r0) * SR), x = new Float32Array(n), B = 256;
  for (let s = 0; s < n; s += B) { const u = s / n, blk = new Float32Array(Math.min(B, n - s)); for (let i = 0; i < blk.length; i++) blk[i] = rnd() * 2 - 1; biquadBP(blk, 800 * 12 ** u, 1.6); x.set(blk, s); }
  for (let i = 0; i < n; i++) { const u = i / n; x[i] *= .5 * u ** 2.2; }
  add(music, x, r0, 1, -.2); add(music, x, r0 + .004, 1, .2);
  for (let k = 0; k < 8; k++) add(music, glassKey(midi(98 + k * 2), .5, .02 + .006 * k), r0 + .3 + k * (r1 - r0 - .35) / 8, 1, k % 2 ? .4 : -.4); }
// the body: from the drop to the end card
const brk = t => t >= TL.MUSIC.breakAt && t < TL.MUSIC.breakAt + .4;   // the break before the price
for (let t0 = D0; t0 < END - 1e-6; t0 += BAR) {
  const c = chordAt(t0 + .01), lastBar = t0 + BAR > END - 1e-6;
  // piano on 1, a softer re-voice on the "and" of 2 (as v3)
  c.tones.forEach((m, j) => add(music, piano(midi(m), BAR * .9, .13 - j * .016), t0 + j * .01, 1, -.25 + j * .17));
  c.tones.slice(1).forEach((m, j) => add(music, piano(midi(m), BAR * .35, .06), t0 + 1.5 * BT + j * .01, 1, .2 - j * .15));
  add(music, pad(c.tones, BAR, .035), t0, 1, 0);
  for (let b = 0; b < 4; b++) {
    const tb = t0 + b * BT; if (brk(tb)) continue;
    add(music, kick(.42), tb, 1, 0);
    // sub bass on the off-beat 8ths (the kick owns the downbeat)
    add(music, sub(midi(c.root + 12), BT * .42, .2), tb + BT / 2, 1, 0);
    if (b % 2 === 1) add(music, snapHit(.32), tb, 1, .1);
    for (let s = 0; s < 4; s++) add(music, hat(s === 2 ? .07 : .035, s === 2 && b === 3), tb + s * BT / 4, 1, .35);
  }
  // glass-key motif above 3.5 kHz, every other bar
  if (Math.round((t0 - D0) / BAR) % 2 === 0) [[0, 105], [1.5, 107], [2.5, 109], [4, 105], [5.5, 104], [6.5, 102]].forEach(([bt, m], k) => { const tt = t0 + bt * BT; if (tt < END - .1 && !brk(tt)) add(music, glassKey(midi(m), 1.0, .07), tt, 1, k % 2 ? .4 : -.4); });
}
// fills: snaps on 16ths rising into the next section
for (const [f0, f1] of TL.MUSIC.fill) for (let tt = f0, k = 0; tt < f1 - 1e-6; tt += BT / 4, k++) add(music, snapHit(.12 + .2 * (tt - f0) / (f1 - f0)), tt, 1, k % 2 ? .3 : -.3);
// the end card: drums out, one resolving chord + shimmer that rings to the last frame
CH[0].tones.forEach((m, j) => add(music, piano(midi(m), DUR - END - .4, .12 - j * .015), END + j * .012, 1, -.25 + j * .17));
add(music, pad([38 + 12, ...CH[0].tones], DUR - END, .04), END, 1, 0);
add(music, glassKey(midi(105), 2.5, .06), END + .02, 1, -.3); add(music, glassKey(midi(110), 2.5, .045), END + .5, 1, .3);
// pump: everything but the kick dips under each kick (a gentle sidechain feel)
{ const env = new Float32Array(N).fill(1);
  for (let tb = D0; tb < END; tb += BT) { if (brk(tb)) continue; const o = Math.round(tb * SR); for (let i = 0; i < SR * .22 && o + i < N; i++) env[o + i] = Math.min(env[o + i], 1 - .35 * Math.exp(-i / (SR * .07))); }
  music.forEach(ch => { for (let i = 0; i < N; i++) ch[i] *= env[i]; });
  for (let tb = D0; tb < END; tb += BT) if (!brk(tb)) add(music, kick(.42), tb, .0001, 0); }
const fadeOut = (x, t0, t1) => { for (let i = Math.round(t0 * SR); i < x.length; i++) x[i] *= Math.max(0, 1 - (i / SR - t0) / (t1 - t0)); };
music.forEach(ch => fadeOut(ch, DUR - 1.0, DUR - .02));
// duck under the VO windows (-8 dB, 80 ms in, 300 ms out)
const duck = new Float32Array(N).fill(1);
for (let i = 0; i < N; i++) {
  const t = i / SR; let g = 0;
  for (const v of TL.VO) { const a = Math.min(1, Math.max(0, (t - (v.t0 - .08)) / .08)), r = Math.min(1, Math.max(0, ((v.t1 + .3) - t) / .3)); g = Math.max(g, Math.min(a, r)); }
  duck[i] = 1 - g * (1 - db(-8));
}
music.forEach(ch => { for (let i = 0; i < N; i++) ch[i] *= duck[i]; });

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
function impact(vel = .8) {   // the drop: a low boom with a pitch fall, a noise burst, a glass tap on top
  const n = Math.round(SR * 1.1), x = new Float32Array(n); let ph = 0;
  for (let i = 0; i < n; i++) { const t = i / SR, f = 42 + 70 * Math.exp(-t / .06); ph += 2 * Math.PI * f / SR; x[i] = vel * Math.sin(ph) * Math.exp(-t / .38) * Math.min(1, t / .002); }
  const nz = new Float32Array(Math.round(SR * .25)); for (let i = 0; i < nz.length; i++) nz[i] = (rnd() * 2 - 1) * vel * .35 * Math.exp(-i / (SR * .05));
  onePoleLP(nz, 2500); for (let i = 0; i < nz.length; i++) x[i] += nz[i];
  const tg = tapGlass(vel * .5); for (let i = 0; i < tg.length; i++) x[i] += tg[i];
  return x;
}
function whoosh(len = .5, vel = .4) { const x = slide(len, 500, 5200, vel); return x; }
function swish(vel = .4) { return slide(.26, 1800, 7000, vel); }
function snapString(vel = .7) {   // a taut string letting go: a sharp crack, a short low twang, a little fibre noise
  const n = Math.round(SR * .5), x = new Float32Array(n);
  for (let i = 0; i < SR * .005; i++) x[i] += (rnd() * 2 - 1) * vel * Math.exp(-i / (SR * .0009));
  const tw = pluck(196, .45, .6, .993); for (let i = 0; i < tw.length && i < n; i++) x[i] += tw[i] * vel * .55 * Math.exp(-i / (SR * .12));
  const nz = slide(.18, 3000, 900, vel * .3); for (let i = 0; i < nz.length; i++) x[i + Math.round(SR * .004)] += nz[i];
  return onePoleHP(x, 120);
}
function tick(vel = .5) { const n = Math.round(SR * .06), x = new Float32Array(n); for (let i = 0; i < SR * .003; i++) x[i] += (rnd() * 2 - 1) * vel * Math.exp(-i / (SR * .0006)); const g = glassKey(midi(100), .06, vel * .25); for (let i = 0; i < n && i < g.length; i++) x[i] += g[i]; return onePoleHP(x, 1800); }
function shimmer(vel = .3) { const n = Math.round(SR * .9), x = new Float32Array(n); [98, 102, 105, 110].forEach((m, k) => { const g = glassKey(midi(m), .7, vel * (1 - k * .15)); const o = Math.round(k * .045 * SR); for (let i = 0; i < g.length && o + i < n; i++) x[o + i] += g[i]; }); return x; }
const LIB = {
  tap_glass: () => tapGlass(.6), tap_low: () => tapLow(.6), slide_soft: () => slide(.55, 700, 2600, .35), slide_long: () => glide(1.4),
  press: () => press(.65), click: () => click(.7), toggle: () => toggle(.75), chime_end: () => chime(.35),
  impact: () => impact(.8), whoosh: () => whoosh(.5, .4), swish: () => swish(.4), snap: () => snapString(.7), tick: () => tick(.5), shimmer: () => shimmer(.3),
};
// measure where each sound is actually heard: first sample within 30 dB of its peak
const onsets = {};
for (const [id, fn] of Object.entries(LIB)) {
  const x = fn(); let pk = 0; for (const v of x) pk = Math.max(pk, Math.abs(v));
  const th = pk * db(-30); let k = 0; while (k < x.length && Math.abs(x[k]) < th) k++;
  onsets[id] = +(k / SR).toFixed(4);
  writeWav(path.join(ROOT, 'sfx_v5', id + '.wav'), [x, x]);
}
const sfx = [new Float32Array(N), new Float32Array(N)];
seed = 777;
for (const s of TL.SFX) {
  const x = LIB[s.id](); let pk = 0; for (const v of x) pk = Math.max(pk, Math.abs(v));
  add(sfx, x, s.at - onsets[s.id], db(s.gain) / pk, 0);
}
writeFileSync(path.join(ROOT, 'sfx_onsets_v5.json'), JSON.stringify({onsets_s: onsets, placements: TL.SFX.map(s => ({...s, file_start: +(s.at - onsets[s.id]).toFixed(4)}))}, null, 2));
// the bed to a fixed peak (it sits under the VO; the hype bed runs a little hotter than v3's); SFX at their cue gains
let mp = 0; for (const ch of music) for (const v of ch) mp = Math.max(mp, Math.abs(v));
music.forEach(ch => { for (let i = 0; i < N; i++) ch[i] *= db(-11) / mp; });
writeWav(path.join(ROOT, 'stems', 'v5_music.wav'), music);
writeWav(path.join(ROOT, 'stems', 'v5_sfx.wav'), sfx);
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
