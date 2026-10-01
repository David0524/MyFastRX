// v6 "Touch": original music bed + UI sound effects, composed in code. 48 kHz stereo.
//   node audio/compose_v6.mjs  ->  audio/stems/v6_music.wav, audio/stems/v6_sfx.wav, audio/sfx_v6/*.wav, audio/sfx_onsets_v6.json
// Tempo, arrangement marks and cue times come from src/v6/timeline.mjs, so every hit sits on its picture.
//
// A launch-sizzle bed at 120 BPM that still leaves the voice room: four-on-the-floor kick and sub bass (pumping off the
// kick), 16th hats and off-beat snaps above 2 kHz, the melody as small glass keys above 3.5 kHz, soft low-passed piano
// chords. The hook is just the glass sounds over a swelling pad and a riser into the drop at 3.0 s; a fill before the
// covers section, a one-beat break before the price lands on 15.0 s, and the drums stop for the end card.
// The bed ducks under the measured VO windows.
import {writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import * as TL from '../src/v6/timeline.mjs';

const SR = 48000, DUR = TL.DURATION, N = Math.round(SR * DUR);
const ROOT = path.dirname(new URL(import.meta.url).pathname);
mkdirSync(path.join(ROOT, 'stems'), {recursive: true}); mkdirSync(path.join(ROOT, 'sfx_v6'), {recursive: true});
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
// the opening: a quiet room (soft low noise), the pad swelling under her moment, a riser into the drop
{ const n = Math.round(TL.TAP.at * SR) + SR, x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = rnd() * 2 - 1;
  onePoleLP(onePoleLP(x, 500), 500); for (let i = 0; i < n; i++) { const t = i / SR; x[i] *= .5 * Math.min(1, t / .6) * Math.max(0, Math.min(1, (TL.TAP.at + .6 - t) / .8)); }
  add(music, x, 0, 1, -.15); add(music, x.slice().reverse(), 0, 1, .15); }
add(music, pad([50, 57, 61, 64], D0 + .2, .05), .4, 1, 0);
{ const [r0, r1] = TL.MUSIC.riser, n = Math.round((r1 - r0) * SR), x = new Float32Array(n), B = 256;
  for (let s = 0; s < n; s += B) { const u = s / n, blk = new Float32Array(Math.min(B, n - s)); for (let i = 0; i < blk.length; i++) blk[i] = rnd() * 2 - 1; biquadBP(blk, 800 * 12 ** u, 1.6); x.set(blk, s); }
  for (let i = 0; i < n; i++) { const u = i / n; x[i] *= .5 * u ** 2.2; }
  add(music, x, r0, 1, -.2); add(music, x, r0 + .004, 1, .2);
}
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
  // (no glass-key melody: the client found it chime-y; the piano, pad, bass and drums carry the bed)
}
// fills: snaps on 16ths rising into the next section
for (const [f0, f1] of TL.MUSIC.fill) for (let tt = f0, k = 0; tt < f1 - 1e-6; tt += BT / 4, k++) add(music, snapHit(.12 + .2 * (tt - f0) / (f1 - f0)), tt, 1, k % 2 ? .3 : -.3);
// the end card: drums out, one resolving chord + shimmer that rings to the last frame
CH[0].tones.forEach((m, j) => add(music, piano(midi(m), DUR - END - .4, .12 - j * .015), END + j * .012, 1, -.25 + j * .17));
add(music, pad([38 + 12, ...CH[0].tones], DUR - END, .04), END, 1, 0);
// (no glass keys on the end card: the resolving chord carries it)
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
  duck[i] = 1 - g * (1 - db(-7));
}
music.forEach(ch => { for (let i = 0; i < N; i++) ch[i] *= duck[i]; });

// ---------- sound effects ----------
// Modern UI sound, not glassware: short muted transients, soft low "thocks", airy noise moves. Nothing rings: no
// sustained partials above 1 kHz (the v5 set's bell-like glass taps and chimes read as "chime-y").
const env = (n, a, d) => { const e = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / SR; e[i] = Math.min(1, t / a) * Math.exp(-t / d); } return e; };
function sine(n, f0, f1, k, ph = 0) { const x = new Float32Array(n); let p = ph; for (let i = 0; i < n; i++) { const t = i / SR, f = f1 + (f0 - f1) * Math.exp(-t / k); p += 2 * Math.PI * f / SR; x[i] = Math.sin(p); } return x; }
function noise(n) { const x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = rnd() * 2 - 1; return x; }
function mixInto(dst, src, g = 1, o = 0) { for (let i = 0; i < src.length && i + o < dst.length; i++) dst[i + o] += src[i] * g; return dst; }
function tap(vel = .7) {            // a fingertip on glass, muted: a soft click and a short low body, no ring
  const n = Math.round(SR * .16), x = new Float32Array(n), e = env(n, .0008, .028);
  const body = sine(n, 520, 190, .012), clk = onePoleLP(onePoleHP(noise(n), 1200), 4500), ec = env(n, .0003, .004);
  for (let i = 0; i < n; i++) x[i] = vel * (.8 * body[i] * e[i] + .55 * clk[i] * ec[i]);
  return x;
}
function thock(vel = .7) {          // a soft, low landing
  const n = Math.round(SR * .3), x = new Float32Array(n), e = env(n, .001, .07), nz = onePoleLP(noise(n), 700), en = env(n, .0005, .012);
  const s1 = sine(n, 160, 68, .03);
  for (let i = 0; i < n; i++) x[i] = vel * (s1[i] * e[i] + .35 * nz[i] * en[i]);
  return x;
}
function uiClick(vel = .6) {        // a short dry click (two tiny transients), above the voice's body but not bright
  const n = Math.round(SR * .06), x = new Float32Array(n);
  for (const [o, v] of [[0, 1], [Math.round(SR * .014), .5]]) { const c = onePoleLP(onePoleHP(noise(Math.round(SR * .006)), 1500), 5000); for (let i = 0; i < c.length; i++) x[o + i] += vel * v * c[i] * Math.exp(-i / (SR * .0011)); }
  return x;
}
function press(vel = .65) { return mixInto(thock(vel * .8), uiClick(vel * .7), 1, 0); }
function toggle(vel = .75) { const x = mixInto(uiClick(vel), uiClick(vel * .7), 1, Math.round(SR * .045)); const t = thock(vel * .45); const out = new Float32Array(Math.max(x.length, t.length + Math.round(SR * .045))); mixInto(out, x); mixInto(out, t, 1, Math.round(SR * .045)); return out; }
function tick(vel = .5) { return uiClick(vel * .8); }
function slide(len, f0, f1, vel = .5) {   // a band-passed air move (time-varying)
  const n = Math.round(SR * len), x = noise(n), out = new Float32Array(n), B = 256;
  for (let s = 0; s < n; s += B) { const u = s / n, blk = x.slice(s, s + B); biquadBP(blk, f0 * (f1 / f0) ** u, 1.1); out.set(blk, s); }
  for (let i = 0; i < n; i++) { const u = i / n; out[i] *= vel * Math.sin(Math.PI * Math.min(1, u * 1.15)) ** 1.6; }
  return onePoleLP(out, 6000);
}
function glide(len) {               // something smooth moving: low, soft friction
  const n = Math.round(SR * len), out = new Float32Array(n), B = 256;
  for (let st = 0; st < n; st += B) { const u = st / n, blk = noise(Math.min(B, n - st)); biquadBP(blk, 1800 * (1 - .6 * u), 1.6); out.set(blk, st); }
  for (let i = 0; i < n; i++) { const u = i / n; out[i] *= .3 * Math.min(1, u * 30) * Math.exp(-u * 3); }
  return out;
}
function airSwell(vel = .35) {      // replaces the old glass shimmer: a short rising breath of air
  const x = slide(.55, 900, 5000, vel); for (let i = 0; i < x.length; i++) x[i] *= Math.min(1, i / (SR * .4)); return x;
}
function bloom(vel = .5) {          // replaces the end chime: a soft low swell under the badge
  const n = Math.round(SR * 1.2), x = new Float32Array(n), s1 = sine(n, 82, 82, 1), nz = onePoleLP(onePoleLP(noise(n), 900), 900);
  for (let i = 0; i < n; i++) { const t = i / SR, e = Math.min(1, t / .25) * Math.exp(-Math.max(0, t - .25) / .35); x[i] = vel * e * (.6 * s1[i] + .5 * nz[i]); }
  return x;
}
function impact(vel = .8) {         // the drop: a deep boom with a pitch fall and a soft noise burst (no glass on top)
  const n = Math.round(SR * 1.2), x = new Float32Array(n), s1 = sine(n, 110, 40, .07), e = env(n, .002, .42);
  const nz = onePoleLP(noise(Math.round(SR * .3)), 1800), en = env(nz.length, .001, .05);
  for (let i = 0; i < n; i++) x[i] = vel * s1[i] * e[i];
  for (let i = 0; i < nz.length; i++) x[i] += vel * .4 * nz[i] * en[i];
  return x;
}
function heart(vel = .6) {          // the opening's pulse: a low "lub-dub", felt more than heard
  const n = Math.round(SR * .55), x = new Float32Array(n);
  for (const [o, f, v] of [[0, 62, 1], [.17, 54, .7]]) { const k = Math.round(o * SR), m = Math.round(SR * .3), s1 = sine(m, f * 1.6, f, .02), e = env(m, .004, .06); for (let i = 0; i < m; i++) x[k + i] += vel * v * s1[i] * e[i]; }
  return onePoleLP(x, 400);
}
function whoosh(len = .5, vel = .38) { return slide(len, 350, 3200, vel); }
function swish(vel = .35) { return slide(.24, 900, 4200, vel); }
function snapString(vel = .6) {     // a taut string letting go: a dry crack and a little fibre noise (no twang)
  const n = Math.round(SR * .3), x = new Float32Array(n);
  const c = onePoleHP(noise(Math.round(SR * .006)), 800); for (let i = 0; i < c.length; i++) x[i] += vel * c[i] * Math.exp(-i / (SR * .0012));
  mixInto(x, slide(.18, 2400, 700, vel * .35), 1, Math.round(SR * .004)); mixInto(x, thock(vel * .35));
  return x;
}
const LIB = {
  tap_glass: () => tap(.7), tap_low: () => thock(.6), slide_soft: () => slide(.5, 500, 2000, .32), slide_long: () => glide(1.4), glide: () => glide(2.5),
  press: () => press(.65), click: () => uiClick(.7), toggle: () => toggle(.75), chime_end: () => bloom(.5),
  impact: () => impact(.8), whoosh: () => whoosh(.5, .38), swish: () => swish(.35), snap: () => snapString(.6), tick: () => tick(.5), shimmer: () => airSwell(.3),
  heart: () => heart(.6),
};
// measure where each sound is actually heard: first sample within 30 dB of its peak
const onsets = {};
for (const [id, fn] of Object.entries(LIB)) {
  const x = fn(); let pk = 0; for (const v of x) pk = Math.max(pk, Math.abs(v));
  const th = pk * db(-30); let k = 0; while (k < x.length && Math.abs(x[k]) < th) k++;
  onsets[id] = +(k / SR).toFixed(4);
  writeWav(path.join(ROOT, 'sfx_v6', id + '.wav'), [x, x]);
}
const sfx = [new Float32Array(N), new Float32Array(N)];
seed = 777;
for (const s of TL.SFX) {
  const x = LIB[s.id](); let pk = 0; for (const v of x) pk = Math.max(pk, Math.abs(v));
  add(sfx, x, s.at - onsets[s.id], db(s.gain) / pk, 0);
}
writeFileSync(path.join(ROOT, 'sfx_onsets_v6.json'), JSON.stringify({onsets_s: onsets, placements: TL.SFX.map(s => ({...s, file_start: +(s.at - onsets[s.id]).toFixed(4)}))}, null, 2));
// the bed to a fixed peak (it sits under the VO; the hype bed runs a little hotter than v3's); SFX at their cue gains
let mp = 0; for (const ch of music) for (const v of ch) mp = Math.max(mp, Math.abs(v));
music.forEach(ch => { for (let i = 0; i < N; i++) ch[i] *= db(-9) / mp; });   // +2 dB vs v5: the bed sits a little more forward
writeWav(path.join(ROOT, 'stems', 'v6_music.wav'), music);
writeWav(path.join(ROOT, 'stems', 'v6_sfx.wav'), sfx);
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
