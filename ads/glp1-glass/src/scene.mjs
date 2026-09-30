// MyFastRx "Liquid Glass" Version A v3 - the overhead table film (4.25 s -> end), after the 3D opening.
// The table seen from above: a gradient + graph-paper grid + drifting soft teal/blue light, calm behind all text.
// Glass pieces from the reference set carry the story:
//   the price pill (continues from the 3D shot), a glass heartbeat (underline, then the wipe between sections),
//   a "Request refill" glass button -> a glass digital photo frame (the footage lives on the table) -> the price pill,
//   check buttons, a dose slider, and a blue glass CTA.
// Layers: bg (world: backdrop, footage inside the frame) -> glass passes (WebGL) -> fg (world: text, marks, logo,
//         badge, cursor) -> hud (screen: captions, end-card disclaimer).
import * as TL from './timeline.mjs';
import {createGlass} from './glass.mjs';

const {W, H, CUES: C, CAPTIONS, CURSOR, SCENES} = TL;
export const COLORS = {navy: '#001D45', blue: '#0071FE', teal: '#14A3B8', white: '#FFFFFF'};
export const COPY = {
  disclaimer: 'Compounded medication. Not FDA-approved. Results may vary. Not all patients qualify. Prescription issued only if medically appropriate following provider review. MyFastRx does not manufacture medications; product appearance and labeling may vary. Actor portrayal.',
  qual: ['Introductory offer.', 'Regular pricing varies by plan.'],
  startingAt: 'Starting at', price: '$69',
  head1: ['GLP-1 care,', 'no strings attached.'],
  head2: ['No membership fees.', 'No automatic refills.'],
  button: 'Request refill',
  covers: 'One price covers',
  checks: ['Provider review', 'Medication', 'Shipping'],
  noIns: 'No insurance needed. No contracts.',
  claim24: ['Online visit in minutes.', 'Review typically within 24 hours.'],
  dose: ['Lower dose', 'Higher dose'],
  doseLine: ["Your price doesn't climb", 'as your dose does.'],   // on-screen claim (the read ends at "$69.")
  tag: ['Clear pricing.', 'Clear care.'],
  cta: 'See if you qualify', url: 'MyFastRx.com',
};
// footage (Mixkit Free License, graded at ingest by tools/extract-footage.sh); people appear only as hands / a back view
export const FOOTAGE = {
  laptop:  {frames: 'footage/frames/laptop',  n: 108, start: null},
  package: {frames: 'footage/frames/package', n: 117, start: null},
};
const CX = 510;                                    // visual center of the safe area (x 100..920)
const DISC = {w: 820, pad: 14, size: 22, lh: 1.25, bottom: 1236, r: 12};
export const L = {
  pill1: {c: [510, 820], half: [250, 140], r: 140},          // the opening pill, where the 3D shot leaves it
  head1Y: [356, 438], pulse1Y: 540,
  head2Y: [356, 438], btn: {c: [510, 700], half: [300, 80], r: 80},
  frame: {c: [510, 500], half: [410, 240], r: 40},
  coversY: 832, rows: [912, 1002, 1092], btnR: 36, noInsY: 1176,
  pill: {c: [510, 640], half: [250, 140], r: 140},           // the price pill in the price section
  slider: {c: [510, 1004], half: [300, 20], r: 20}, knobR: 40, doseY: 1076,
  logo: {c: [510, 400], scale: .5}, tagY: [606, 682],
  cta: {c: [510, 790], half: [330, 70], r: 70}, urlY: 930, badge: {cx: 510, y: 956, w: 280},
  capY: 1206,                                                // caption baseline (bottom line)
};
// price block, relative to a pill's center (the 3D print uses the same offsets)
const PRICE = {start: -66, price: 88, qual: [186, 228]};

// ---------- math ----------
const clamp = (v, a = 0, z = 1) => Math.min(z, Math.max(a, v));
const lerp = (a, z, t) => a + (z - a) * t;
const lerp2 = (a, z, t) => [lerp(a[0], z[0], t), lerp(a[1], z[1], t)];
const lerp3 = (a, z, t) => a.map((v, i) => lerp(v, z[i], t));
const prog = (t, t0, t1) => clamp((t - t0) / (t1 - t0));
const eOut = u => u >= 1 ? 1 : (1 - 2 ** (-10 * u)) / (1 - 2 ** -10);
const eIn = u => u <= 0 ? 0 : (2 ** (10 * u - 10) - 2 ** -10) / (1 - 2 ** -10);
const eIO = u => u < .5 ? 4 * u ** 3 : 1 - (-2 * u + 2) ** 3 / 2;
const spring = (t, t0, per = .34, dec = .085) => { const d = t - t0; return d <= 0 ? 0 : 1 - Math.exp(-d / dec) * Math.cos(2 * Math.PI * d / per); };
const squish = (t, t0, amp) => { const d = t - t0; return d < 0 ? 0 : amp * Math.exp(-d / .08) * Math.sin(2 * Math.PI * d / .22); };
const pressAt = (t, tc, amp) => t > tc - .1 && t < tc ? amp * prog(t, tc - .1, tc) : t >= tc ? amp * (1 - spring(t, tc, .26, .05)) : 0;

let cv, G, img = {}, disc = null, camS = 1, camF = [0, 0], camG = [0, 0];
const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
const font = (px, wt) => `${wt} ${px}px G${wt}`;
const T = p => [(p[0] - camF[0]) * camS + camG[0], (p[1] - camF[1]) * camS + camG[1]];
const worldXf = ctx => ctx.setTransform(camS, 0, 0, camS, camG[0] - camF[0] * camS, camG[1] - camF[1] * camS);
function setFont(ctx, px, wt) { ctx.font = font(px, wt); ctx.letterSpacing = px >= 64 ? `${(-0.022 * px).toFixed(2)}px` : '0px'; }
function measure(s, px, wt) { const c = cv.hud.getContext('2d'); setFont(c, px, wt); return c.measureText(s).width; }
// a line of text that rises out of (enter) or leaves through (exit) a mask line under its baseline; no opacity changes
function line(ctx, s, x, y, px, wt, color, {align = 'center', enter = 1, exit = 0, exitDir = -1} = {}) {
  if (enter <= 0 || exit >= 1) return;
  ctx.save(); ctx.beginPath(); ctx.rect(-4000, y - px * 1.02, 9000, px * 1.32); ctx.clip();
  setFont(ctx, px, wt); ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  ctx.fillText(s, x, y + (1 - enter) * px * 1.25 + exit * exitDir * px * 1.3); ctx.restore();
}
function wrap(s, px, wt, maxW) { const out = []; let cur = ''; for (const w of s.split(' ')) { const tt = cur ? cur + ' ' + w : w; if (measure(tt, px, wt) <= maxW) cur = tt; else { out.push(cur); cur = w; } } if (cur) out.push(cur); return out; }
const footCache = {};
async function footFrame(id, t) {
  const f = FOOTAGE[id]; if (f.start == null) return null;
  const i = clamp(Math.floor((t - f.start) * TL.FPS + 1e-6) + 1, 1, f.n);
  if (footCache[id]?.i === i) return footCache[id].img;
  const im = await new Promise((res, rej) => { const m = new Image(); m.onload = () => res(m); m.onerror = rej; m.src = `../${f.frames}/${String(i).padStart(4, '0')}.jpg`; });
  footCache[id] = {i, img: im}; return im;
}

export async function init() {
  for (const [wt, f] of [[500, 'Medium'], [600, 'SemiBold'], [700, 'Bold']]) { const ff = new FontFace('G' + wt, `url(../assets/fonts/Geist-${f}.ttf)`, {weight: String(wt)}); await ff.load(); document.fonts.add(ff); }
  const load = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  img.logo = await load('../images/logo_myfastrx_official.jpg');
  img.badge = await load('../images/badge_bbb_a_rating_horizontal.jpg');
  img.vial = await load('../images/vial_semaglutide.png');
  cv = {bg: mk(), content: mk(), fg: mk(), hud: mk(), gl: mk(), out: mk(), decor: mk()};
  for (const k of ['bg', 'content', 'fg', 'hud', 'out', 'decor']) cv[k].getContext('2d', {willReadFrequently: true});
  G = createGlass(cv.gl);
  const lines = wrap(COPY.disclaimer, DISC.size, 500, DISC.w - 2 * DISC.pad), lh = Math.round(DISC.size * DISC.lh), h = lines.length * lh + 2 * DISC.pad + 4;
  disc = {lines, lh, h, w: DISC.w, x: CX - DISC.w / 2, y: DISC.bottom - h};
  const labW = Math.max(...COPY.checks.map(s => measure(s, 48, 600)));
  L.rowX0 = Math.round(CX - (2 * L.btnR + 26 + labW) / 2);
  L.knobX = [L.slider.c[0] - L.slider.half[0] + 10, L.slider.c[0] + L.slider.half[0] - 10];
  L.targets = {btn: [L.btn.c[0] + 210, L.btn.c[1] + 30], knob0: [L.knobX[0] + 12, L.slider.c[1] + 14], knob1: [L.knobX[1] + 12, L.slider.c[1] + 14], cta: [L.cta.c[0] + 262, L.cta.c[1] + 30]};
  return info();
}

// ---------- glass presets ----------
const SH = (amt = .16, col = [.70, .74, .82]) => ({off: [5, 12], blur: 18, amt, col});
const CLEAR = {sigma: [.02, .013, .006], refr: 24, disp: .22, rim: .9, spec: 1, glow: .03, glowCol: [.4, .6, 1], lift: .02, shadow: SH()};
// the price pill's teal matches the 3D pill (sampled ~RGB 205,245,250 over the table)
const TEAL = {...CLEAR, sigma: [.19, .01, 0], refr: 30, glow: .05, glowCol: [.25, .85, .95], lift: .012, shadow: SH(.18, [.60, .80, .84]), caustic: .35, sheenAmt: .10};
const PULSE = {sigma: [1.6, .8, .08], refr: 9, disp: .2, rim: .8, spec: 1, glow: .08, glowCol: [.3, .55, 1], lift: .02, shadow: SH(.16, [.62, .70, .92])};
function cg(o) {   // camera -> glass params
  const s = camS, q = {...o, c: o.c ? T(o.c) : [0, 0], r: o.r * s, bevel: (o.bevel ?? o.r) * s, refr: (o.refr ?? 24) * s};
  if (o.half) q.half = [o.half[0] * s, o.half[1] * s];
  if (o.pts) { q.pts = o.pts.map(p => T(p)); q.c = [0, 0]; }
  if (o.anchor) q.anchor = T(o.anchor);
  const sh = o.shadow || SH(); q.shadow = {...sh, off: [sh.off[0] * s, sh.off[1] * s], blur: sh.blur * s};
  if (o.protect) { const a = T([o.protect[0], o.protect[1]]), z = T([o.protect[2], o.protect[3]]); q.protect = [a[0], a[1], z[0], z[1]]; }
  return q;
}
const lerpMat = (a, z, m) => ({...z, sigma: lerp3(a.sigma, z.sigma, m), refr: lerp(a.refr, z.refr, m), caustic: lerp(a.caustic || 0, z.caustic || 0, m), sheenAmt: lerp(a.sheenAmt || 0, z.sheenAmt || 0, m), glowCol: lerp3(a.glowCol, z.glowCol, m), shadow: {...z.shadow, col: lerp3(a.shadow.col, z.shadow.col, m), amt: lerp(a.shadow.amt, z.shadow.amt, m)}});

// ---------- heartbeat path (the logo's pulse, as a glass tube) ----------
function pulsePts(cx, cy, w) {
  const u = w / 520;
  return [[-260, 0], [-60, 0], [-40, -26], [-22, 30], [4, -84], [30, 40], [52, 0], [260, 0]].map(([x, y]) => [cx + x * u, cy + y * u]);
}
const wipePts = y => [[-120, y], [360, y], [390, y - 30], [420, y + 34], [458, y - 92], [496, y + 44], [526, y], [1200, y]];

// ---------- background system ----------
const BLOBS = [   // world coords per section; teal #14A3B8, blue #0071FE
  {t: 4.25,  b: [[800, 870, 330, 'teal', .20], [200, 560, 320, 'blue', .17], [930, 300, 260, 'teal', .10]]},
  {t: 7.85,  b: [[860, 720, 320, 'teal', .20], [170, 720, 300, 'blue', .17], [900, 1180, 280, 'teal', .10]]},
  {t: 12.2,  b: [[930, 290, 300, 'teal', .20], [110, 740, 300, 'blue', .17], [920, 1150, 260, 'teal', .10]]},
  {t: 16.45, b: [[850, 640, 320, 'teal', .20], [190, 1010, 300, 'blue', .17], [900, 1180, 260, 'teal', .10]]},
  {t: 21.4,  b: [[980, 1000, 320, 'blue', .15], [110, 760, 280, 'teal', .14], [990, 250, 240, 'teal', .09]]},
];
function blobsAt(t) {
  let i = 0; while (i < BLOBS.length - 1 && t >= BLOBS[i + 1].t) i++;
  let set = BLOBS[i].b;
  if (i < BLOBS.length - 1) { const nx = BLOBS[i + 1], m = eIO(prog(t, nx.t - .6, nx.t)); if (m > 0) set = set.map((bb, j) => bb.map((v, q) => typeof v === 'number' ? lerp(v, nx.b[j][q], m) : v)); }
  const td = Math.min(t, C.finalStill);
  return set.map(([x, y, r, c, a], j) => [x + 24 * Math.sin(td * .5 + j * 2.1), y + 18 * Math.cos(td * .4 + j * 1.3), r, c, a]);
}
function calmZones(t, sec) {
  // [x0, y0, x1, y1, feather, a]: a zone clears in (a 0 -> 1) just before its text arrives, so no empty patch waits for it
  const z = [], by = t0 => clamp((t - t0 + .45) / .4);
  if (sec === 'strings') z.push([140, 280, 880, 460, 50, 1], [380, 740, 640, 930, 40, 1], [200, 960, 820, 1060, 40, 1]);
  if (sec === 'control') z.push([120, 280, 900, 460, 50, 1]);
  if (sec === 'covers') z.push([L.rowX0 - 20, 790, 900, 1120, 40, by(C.coversIn.t0)], [150, 1140, 870, 1195, 30, by(C.noIns.t0)]);
  if (sec === 'price') z.push([380, 560, 640, 750, 40, 1], [200, 770, 820, 880, 40, 1], [180, 1050, 840, 1095, 30, by(C.sliderIn.t0)], [100, 1100, 920, 1225, 40, by(C.doseLine.t0)]);
  if (sec === 'end') z.push([60, 240, 960, 560, 70, 1], [120, 550, 900, 710, 50, by(C.tag[0].t0)], [160, 880, 860, 945, 40, by(C.urlIn.t0)], [220, 930, 800, 1100, 50, by(C.urlIn.t0)]);
  const cap = CAPTIONS.map(c => clamp(Math.min(t - c.t0 + .45, c.t1 + .45 - t) / .4)).reduce((a, v) => Math.max(a, v), 0);
  if (cap > 0) z.push([100, 1140, 920, 1225, 40, cap]);
  return z.filter(q => q[5] > 0);
}
function backdrop(bg, t, sec) {
  bg.save(); bg.setTransform(1, 0, 0, 1, 0, 0);
  const g = bg.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#F7F7F7'); g.addColorStop(.55, '#F7F7F7'); g.addColorStop(1, '#EEF3FA');
  bg.fillStyle = g; bg.fillRect(0, 0, W, H); bg.restore();
  const d = cv.decor.getContext('2d'); d.setTransform(1, 0, 0, 1, 0, 0); d.clearRect(0, 0, W, H); worldXf(d);
  for (const [x, y, r, c, a] of blobsAt(t)) {
    const rg = d.createRadialGradient(x, y, 0, x, y, r), col = c === 'teal' ? '20,163,184' : '0,113,254';
    rg.addColorStop(0, `rgba(${col},${a})`); rg.addColorStop(.55, `rgba(${col},${a * .55})`); rg.addColorStop(1, `rgba(${col},0)`);
    d.fillStyle = rg; d.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  // graph-paper grid, phased so lines cross the opening pill's center (as on the 3D table)
  // deep in the macro the line thins to the 3D table's printed width (3 tex px = 1.8 mm) so the match-cut holds
  d.strokeStyle = `rgba(0,29,69,${lerp(.075, .055, clamp((camS - 1) / 33)).toFixed(4)})`; d.lineWidth = lerp(1.5, .55, clamp((camS - 1) / 33)); d.beginPath();
  for (let x = L.pill1.c[0] - 60 * 30; x <= 2600; x += 60) { d.moveTo(x, -1500); d.lineTo(x, 3500); }
  for (let y = L.pill1.c[1] - 60 * 40; y <= 3500; y += 60) { d.moveTo(-1500, y); d.lineTo(2600, y); }
  d.stroke();
  d.globalCompositeOperation = 'destination-out';
  for (const [x0, y0, x1, y1, f, a] of calmZones(t, sec)) {
    d.globalAlpha = a; d.filter = `blur(${Math.round(f * camS * .9)}px)`; d.fillStyle = '#000'; d.beginPath(); d.roundRect(x0 - f * .3, y0 - f * .3, x1 - x0 + f * .6, y1 - y0 + f * .6, f); d.fill();
    d.filter = 'none'; d.fillRect(x0 + f * .6, y0 + f * .4, x1 - x0 - f * 1.2, y1 - y0 - f * .8);
  }
  d.globalAlpha = 1; d.globalCompositeOperation = 'source-over';
  bg.save(); bg.setTransform(1, 0, 0, 1, 0, 0); bg.drawImage(cv.decor, 0, 0); bg.restore();
}

// ---------- the hero glass shape: Request-refill button -> photo frame -> price pill ----------
function hero(t) {
  const B = L.btn, F = L.frame, P = L.pill;
  if (t < C.btnIn.t0 || t >= C.wipe2.t1) return null;
  if (t < C.morphFrame.t0) {
    const s = spring(t, C.btnIn.t0, .34, .08) * (1 - pressAt(t, C.btnPress, .05));
    return {kind: 'button', m: 0, c: B.c, half: B.half, r: B.r, bevel: 40, scale: [s, s], anchor: B.c, mat: CLEAR};
  }
  if (t < C.morphPill.t0) {
    const m = eIO(prog(t, C.morphFrame.t0, C.morphFrame.land)), sq = squish(t, C.morphFrame.land, .015);
    const c = lerp2(B.c, F.c, m), half = lerp2(B.half, F.half, m);
    return {kind: 'frame', m, c, half, r: lerp(B.r, F.r, m), bevel: lerp(40, 28, m), scale: [1 + sq, 1 - sq], anchor: [c[0], c[1] + half[1]], mat: {...CLEAR, rim: 1, spec: 1.1, sigma: [.03, .02, .01]}};
  }
  const m = eIO(prog(t, C.morphPill.t0, C.morphPill.land)), sq = squish(t, C.morphPill.land, .06);
  const c = lerp2(F.c, P.c, m), half = lerp2(F.half, P.half, m);
  return {kind: m < 1 ? 'frame' : 'pill', m: 1 - m, c, half, r: lerp(F.r, P.r, m), bevel: lerp(28, 32, m), scale: [1 + sq, 1 - sq], anchor: [c[0], c[1] + half[1]], mat: lerpMat(CLEAR, TEAL, m)};
}

// ---------- cursor ----------
function cursorAt(t) {
  const K = CURSOR.map(k => ({t: k[0], p: k[4] ? L.targets[k[4]] : [k[1], k[2]], d: k[3]}));
  let i = -1; for (let k = 0; k < K.length - 1; k++) if (t >= K[k].t && t <= K[k + 1].t) { i = k; break; }
  if (i < 0) return null;
  const a = K[i], z = K[i + 1]; if (z.t - a.t > 3) return null;          // between its three appearances it is off screen
  const u = eIO(prog(t, a.t, z.t)), dist = Math.hypot(z.p[0] - a.p[0], z.p[1] - a.p[1]);
  const mid = Math.sin(Math.PI * u) * Math.min(40, dist * .08);
  const p = [lerp(a.p[0], z.p[0], u) - mid * .35, lerp(a.p[1], z.p[1], u) + mid];
  const down = a.d && z.d ? 1 : a.d ? 1 - prog(t, a.t, a.t + .06) : z.d ? prog(t, z.t - .06, z.t) : 0;
  return {p, down};
}
function drawCursor(ctx, c) {
  if (c.p[0] > 1130) return;
  const s = 1.3 * (1 - .12 * c.down), pts = [[0, 0], [0, 33], [8.5, 25.5], [14, 38], [20, 35.5], [14.5, 23.5], [26, 23.5]];
  ctx.save(); ctx.translate(c.p[0], c.p[1]); ctx.scale(s, s);
  ctx.shadowColor = 'rgba(0,29,69,0.28)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
  ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath();
  ctx.fillStyle = COLORS.navy; ctx.fill(); ctx.shadowColor = 'transparent'; ctx.lineJoin = 'round'; ctx.lineWidth = 2.2; ctx.strokeStyle = COLORS.white; ctx.stroke();
  ctx.restore();
}
function drawCheck(ctx, c, s, lw = 7) {
  ctx.save(); ctx.translate(c[0], c[1]); ctx.scale(s, s); ctx.strokeStyle = COLORS.navy; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-14, 1); ctx.lineTo(-4, 11); ctx.lineTo(15, -10); ctx.stroke(); ctx.restore();
}
function priceBlock(ctx, cx, cy, {enter = 1, exit = 0, qExit = 0} = {}) {
  line(ctx, COPY.startingAt, cx, cy + PRICE.start, 44, 500, COLORS.navy, {enter, exit, exitDir: 1});
  line(ctx, COPY.price, cx, cy + PRICE.price, 172, 700, COLORS.navy, {enter, exit, exitDir: 1});
  COPY.qual.forEach((q, i) => line(ctx, q, cx, cy + PRICE.qual[i], 34, 500, COLORS.navy, {exit: qExit, exitDir: 1}));
}
const clipped = (ctx, [y0, y1], fn) => { ctx.save(); if (y0 > -1e5 || y1 < 1e5) { ctx.beginPath(); ctx.rect(-4000, y0, 9000, y1 - y0); ctx.clip(); } fn(); ctx.restore(); };

// Mid pull-back the frame never shows the whole "$69" without the whole qualification (the qualification line is wider
// than the price): while the line can't fit, the camera keeps the price's right edge just out of frame; once it can,
// the camera keeps the line's right end in frame. Both are nudges of a few px in a fast zoom. Extents measured at 1:1.
const PRICE_X = [357, 667], QUAL_X = [270, 752], EDGE = 8;
function keepQualWithPrice() {
  const X = w => (w - camF[0]) * camS + camG[0];
  const priceIn = X(PRICE_X[0]) >= 0 && X(PRICE_X[1]) <= W;
  if (!priceIn) return;
  if ((QUAL_X[1] - QUAL_X[0]) * camS > W - 2 * EDGE) camG[0] += W + 4 - X(PRICE_X[1]);   // line can't fit yet: keep the price cropped
  else if (X(QUAL_X[1]) > W - EDGE) camG[0] -= X(QUAL_X[1]) - (W - EDGE);
  else if (X(QUAL_X[0]) < EDGE) camG[0] += EDGE - X(QUAL_X[0]);
}
// ---------- frame ----------
export async function render(t) {
  const bg = cv.bg.getContext('2d'), fg = cv.fg.getContext('2d'), hud = cv.hud.getContext('2d');
  for (const c of [fg, hud, cv.content.getContext('2d')]) { c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H); }
  // camera: starts deep in the pill's left end (where the 3D dive ends: ~42 world px across the frame), pulls back
  const m0 = eIO(prog(t, C.pullBack.t0, C.pullBack.t1));
  if (m0 < 1) { const F = [L.pill1.c[0] - .345 * 500, L.pill1.c[1]]; camS = Math.exp(lerp(Math.log(34), 0, m0)); camF = F; camG = lerp2([W / 2, H / 2], F, m0); keepQualWithPrice(); }
  else { camS = 1; camF = camG = [0, 0]; }
  worldXf(bg); worldXf(fg);
  FOOTAGE.laptop.start = C.morphFrame.t0; FOOTAGE.package.start = C.frameSwap[1] - .2;
  for (const id of Object.keys(FOOTAGE)) img['foot_' + id] = await footFrame(id, t);
  const ops = [], top = [];
  const sec = (SCENES.find(s => t >= s.t0 && t < s.t1) || SCENES[SCENES.length - 1]).id;

  // wipes: a glass heartbeat sweeps up the table; above it the old section, below it the new one
  const w1 = t >= C.wipe1.t0 && t < C.wipe1.t1, w2 = t >= C.wipe2.t0 && t < C.wipe2.t1;
  const wy = w1 ? lerp(H + 120, -140, eIO(prog(t, C.wipe1.t0, C.wipe1.t1))) : w2 ? lerp(H + 120, -140, eIO(prog(t, C.wipe2.t0, C.wipe2.t1))) : null;
  const ALL = [-1e6, 1e6], OLD = wy == null ? ALL : [-1e6, wy], NEW = wy == null ? ALL : [wy, 1e6];
  if (wy == null) backdrop(bg, t, sec);
  else {
    backdrop(bg, t, w1 ? 'strings' : 'price');
    bg.save(); bg.setTransform(1, 0, 0, 1, 0, 0); bg.beginPath(); bg.rect(0, wy, W, H); bg.clip(); worldXf(bg); backdrop(bg, t, w1 ? 'control' : 'end'); bg.restore(); worldXf(bg);
    top.push(() => G.glass(cg({type: 'tube', ...PULSE, pts: wipePts(wy), r: 12, bevel: 12, refr: 16, shadow: SH(.14, [.62, .70, .92])})));
  }

  // ===== strings: the opening pill + price, "GLP-1 care, / no strings attached.", the heartbeat underline =====
  if (t < C.wipe1.t1) {
    const cl = w1 ? OLD : ALL, P = L.pill1;
    const z = clamp((camS - 1) / 33);   // inside the macro the 3D pill reads a touch deeper teal (thicker glass at the dive end)
    ops.push(() => G.glass(cg({type: 'rect', ...TEAL, sigma: [TEAL.sigma[0] * (1 + .6 * z), TEAL.sigma[1] * (1 + .6 * z), 0], c: P.c, half: P.half, r: P.r, bevel: 32, clip: cl})));
    if (z > 0) top.push(() => {   // the 3D key light's soft reflection on the pill top, fading as the camera leaves the glass
      const h = cv.hud.getContext('2d'), a = .62 * z * z, g = h.createRadialGradient(567, 918, 0, 567, 918, 190);
      g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)'); h.fillStyle = g; h.fillRect(377, 728, 380, 380);
    });
    clipped(fg, cl, () => {
      priceBlock(fg, P.c[0], P.c[1], {exit: eIn(prog(t, C.price1Out.t0, C.price1Out.t1)), qExit: eIn(prog(t, C.qual1Out.t0, C.qual1Out.t1))});
      COPY.head1.forEach((s, i) => line(fg, s, CX, L.head1Y[i], 72, 700, COLORS.navy, {enter: eOut(prog(t, C.head1[i].t0, C.head1[i].land))}));
    });
    if (t >= C.pulseIn.t0) { const u = eOut(prog(t, C.pulseIn.t0, C.pulseIn.land)); ops.push(() => G.glass(cg({type: 'tube', ...PULSE, pts: pulsePts(CX - (1 - u) * 900, L.pulse1Y, 520), r: 10, bevel: 10, clip: cl}))); }
  }

  // ===== control: "No membership fees. / No automatic refills." =====
  if (t >= C.wipe1.t0 && t < C.head2Out.t1) {
    const cl = w1 ? NEW : ALL, out = eIn(prog(t, C.head2Out.t0, C.head2Out.t1));
    clipped(fg, cl, () => COPY.head2.forEach((s, i) => line(fg, s, CX, L.head2Y[i], 72, 700, COLORS.navy, {enter: eOut(prog(t, C.head2[i].t0, C.head2[i].land)), exit: out})));
  }

  // ===== hero: button -> frame -> pill =====
  const hs = hero(t);
  if (hs) {
    const cl = w2 ? OLD : ALL;
    const ps = hs.scale[0], rx = hs.c[0] - hs.half[0] * ps, ry = hs.c[1] - hs.half[1] * ps, rw = 2 * hs.half[0] * ps, rh = 2 * hs.half[1] * ps;
    if (hs.kind === 'button') {
      clipped(fg, cl, () => { fg.save(); fg.translate(hs.c[0], hs.c[1]); fg.scale(ps, ps); setFont(fg, 50, 600); fg.fillStyle = COLORS.navy; fg.textAlign = 'center'; fg.textBaseline = 'alphabetic'; fg.fillText(COPY.button, -26, 18); fg.restore(); });
      const ck = spring(t, C.checkPop, .3, .07) * (1 - eIn(prog(t, C.morphFrame.t0 - .15, C.morphFrame.t0)));   // the check that pops when you press it
      if (ck > 0) { const cc = [hs.c[0] + 226, hs.c[1]]; top.push(() => G.glass(cg({type: 'rect', ...CLEAR, c: cc, half: [34, 34], r: 34, bevel: 24, scale: [ck, ck], anchor: cc, refr: 14, sigma: [.10, .05, .02], clip: cl}))); clipped(fg, cl, () => drawCheck(fg, cc, ck, 6)); }
    }
    if (hs.kind === 'frame') {
      // the glass digital photo frame: the footage lives on the table, inside the glass
      const box = [L.frame.c[0] - L.frame.half[0], L.frame.c[1] - L.frame.half[1], L.frame.c[0] + L.frame.half[0], L.frame.c[1] + L.frame.half[1]];
      const sw = C.frameSwap, g1 = lerp(box[0] - 40, box[2] + 40, eIO(prog(t, sw[0] - .15, sw[0] + .15))), g2 = lerp(box[0] - 40, box[2] + 40, eIO(prog(t, sw[1] - .15, sw[1] + .15)));
      const slot = (which, x0, x1) => { bg.save(); bg.beginPath(); bg.rect(x0, -4000, x1 - x0, 9000); bg.clip();
        if (which === 'laptop' && img.foot_laptop) bg.drawImage(img.foot_laptop, box[0], box[1], box[2] - box[0], box[3] - box[1]);
        if (which === 'package' && img.foot_package) bg.drawImage(img.foot_package, box[0], box[1], box[2] - box[0], box[3] - box[1]);
        if (which === 'vial') { const s = .434; bg.fillStyle = '#EEF2F5'; bg.fillRect(box[0], box[1], box[2] - box[0], box[3] - box[1]); bg.imageSmoothingQuality = 'high'; bg.drawImage(img.vial, L.frame.c[0] - 509 * s, L.frame.c[1] - 743 * s, img.vial.width * s, img.vial.height * s); }
        bg.restore(); };
      clipped(bg, cl, () => {
        bg.save(); bg.beginPath(); bg.roundRect(rx, ry, rw, rh, Math.max(0, hs.r * ps)); bg.clip();
        bg.fillStyle = '#EDF1F5'; bg.fillRect(box[0] - 80, box[1] - 80, box[2] - box[0] + 160, box[3] - box[1] + 160);
        if (t < sw[0]) slot('laptop', -5000, 5000);
        else if (t < sw[0] + .15) { slot('laptop', g1, 5000); slot('vial', -5000, g1); }
        else if (t < sw[1] - .15) slot('vial', -5000, 5000);
        else if (t < sw[1] + .15) { slot('vial', g2, 5000); slot('package', -5000, g2); }
        else slot('package', -5000, 5000);
        bg.restore();
      });
      for (const [k, gx] of [[0, g1], [1, g2]]) if (t >= sw[k] - .15 && t < sw[k] + .15)   // glints sweep the photos (no bending: people)
        top.push(() => G.glass(cg({type: 'rect', ...CLEAR, c: [gx, L.frame.c[1]], half: [30, L.frame.half[1] - 6], r: 28, bevel: 28, refr: 0, rim: 1, spec: 1.2, sheenAmt: .2, sheen: 0, shadow: SH(0), protect: [0, 0, W, H], clip: cl})));
      // on the laptop photo: "Online visit in minutes. / Review typically within 24 hours."
      const ca = eOut(prog(t, C.claim24.t0, C.claim24.t0 + .3)) * (1 - eIn(prog(t, C.claim24.t1 - .2, C.claim24.t1)));
      if (ca > 0 && hs.m >= 1 - 1e-6) clipped(fg, cl, () => {
        const w = Math.max(...COPY.claim24.map(s => measure(s, 30, 500))) + 40, x0 = box[0] + 24, y0 = box[3] - 112;
        fg.save(); fg.beginPath(); fg.rect(box[0], box[1], box[2] - box[0], box[3] - box[1]); fg.clip(); fg.translate(0, Math.round((1 - ca) * 140));
        fg.fillStyle = 'rgba(255,255,255,0.93)'; fg.beginPath(); fg.roundRect(x0, y0, w, 88, 16); fg.fill();
        setFont(fg, 30, 500); fg.fillStyle = COLORS.navy; fg.textAlign = 'left'; fg.textBaseline = 'alphabetic'; COPY.claim24.forEach((s, i) => fg.fillText(s, x0 + 20, y0 + 36 + i * 36)); fg.restore();
      });
    }
    const protect = hs.kind === 'frame' ? [rx - 80, ry - 80, rx + rw + 80, ry + rh + 80] : null;   // hands / a person: never bent
    ops.push(() => G.glass(cg({type: 'rect', ...hs.mat, c: hs.c, half: hs.half, r: hs.r, bevel: hs.bevel, scale: hs.scale, anchor: hs.anchor, protect, clip: cl})));
    if (hs.kind === 'pill') clipped(fg, cl, () => priceBlock(fg, L.pill.c[0], L.pill.c[1], {enter: eOut(prog(t, C.priceIn.t0, C.priceIn.land)), exit: eIn(prog(t, C.priceOut.t0, C.priceOut.t1)), qExit: eIn(prog(t, C.qualOut.t0, C.qualOut.t1))}));
  }

  // ===== covers: "One price covers" + checks + no insurance =====
  if (t >= C.coversIn.t0 && t < C.coversOut.t1) {
    const out = eIn(prog(t, C.coversOut.t0, C.coversOut.t1));
    line(fg, COPY.covers, CX, L.coversY, 48, 600, COLORS.navy, {enter: eOut(prog(t, C.coversIn.t0, C.coversIn.land)), exit: out, exitDir: 1});
    C.checks.forEach((land, i) => {
      const y = L.rows[i], bc = [L.rowX0 + L.btnR, y], pop = spring(t, land - .4) * (1 - out);
      if (pop <= 0) return;
      const s = pop * (1 - pressAt(t, land, .06));
      ops.push(() => G.glass(cg({type: 'rect', ...CLEAR, c: bc, half: [L.btnR, L.btnR], r: L.btnR, bevel: 26, scale: [s, s], anchor: bc, refr: 16, sigma: [.10, .05, .02]})));
      const ck = spring(t, land, .3, .07) * (1 - out); if (ck > 0) drawCheck(fg, bc, ck * .9, 6.5);
      line(fg, COPY.checks[i], L.rowX0 + 2 * L.btnR + 26, y + 17, 48, 600, COLORS.navy, {align: 'left', enter: eOut(prog(t, land - .05, land + .3)), exit: out, exitDir: 1});
    });
    line(fg, COPY.noIns, CX, L.noInsY, 38, 500, COLORS.navy, {enter: eOut(prog(t, C.noIns.t0, C.noIns.land)), exit: out, exitDir: 1});
  }

  // ===== price: the dose slider (the cursor drags the dose up; the price holds still) =====
  if (t >= C.sliderIn.t0 && t < C.wipe2.t1) {
    const cl = w2 ? OLD : ALL, S = L.slider, s = spring(t, C.sliderIn.t0, .34, .08);
    const kx = t < C.drag.t0 ? L.knobX[0] : t >= C.drag.t1 ? L.knobX[1] : clamp((cursorAt(t)?.p[0] ?? L.knobX[1]) - 12, L.knobX[0], L.knobX[1]);
    clipped(bg, cl, () => {
      const x0 = S.c[0] - (S.half[0] - 8) * s;
      bg.fillStyle = '#DDE4EC'; bg.beginPath(); bg.roundRect(x0, S.c[1] - 9, 2 * (S.half[0] - 8) * s, 18, 9); bg.fill();
      bg.fillStyle = COLORS.blue; bg.beginPath(); bg.roundRect(x0, S.c[1] - 9, Math.max(18, (kx - x0) * s), 18, 9); bg.fill();
    });
    ops.push(() => G.glass(cg({type: 'rect', ...CLEAR, c: S.c, half: S.half, r: S.r, bevel: 18, scale: [s, s], anchor: S.c, refr: 12, clip: cl})));
    const ksq = squish(t, C.drag.t1, .08);
    ops.push(() => G.glass(cg({type: 'rect', ...CLEAR, c: [kx, S.c[1]], half: [L.knobR, L.knobR], r: L.knobR, bevel: L.knobR, scale: [s * (1 + ksq), s * (1 - ksq)], anchor: [kx, S.c[1]], refr: 26, disp: .25, shadow: SH(.24), clip: cl})));
    clipped(fg, cl, () => { const e = eOut(prog(t, C.sliderIn.t0 + .1, C.sliderIn.land + .1));
      line(fg, COPY.dose[0], S.c[0] - S.half[0], L.doseY, 32, 500, COLORS.navy, {align: 'left', enter: e}); line(fg, COPY.dose[1], S.c[0] + S.half[0], L.doseY, 32, 500, COLORS.navy, {align: 'right', enter: e});
      COPY.doseLine.forEach((q, i) => line(fg, q, CX, L.capY - 56 + i * 56, 46, 600, COLORS.navy, {enter: eOut(prog(t, C.doseLine.t0 + i * .1, C.doseLine.land + i * .1))})); });
  }

  // ===== end card =====
  if (t >= C.wipe2.t0) {
    const cl = w2 ? NEW : ALL;
    clipped(fg, cl, () => {
      if (t >= C.logoIn.t0) { const u = eOut(prog(t, C.logoIn.t0, C.logoIn.land)), lw = Math.round(img.logo.width * L.logo.scale), lh = Math.round(img.logo.height * L.logo.scale), x = Math.round(L.logo.c[0] - lw / 2), y = Math.round(L.logo.c[1] - lh / 2);
        fg.save(); fg.beginPath(); fg.rect(x, y, lw, lh); fg.clip(); fg.imageSmoothingQuality = 'high'; fg.drawImage(img.logo, x, y + Math.round((1 - u) * lh * .75), lw, lh); fg.restore(); }
      COPY.tag.forEach((s, i) => line(fg, s, CX, L.tagY[i], 72, 700, COLORS.navy, {enter: eOut(prog(t, C.tag[i].t0, C.tag[i].land))}));
      if (t >= C.urlIn.t0) line(fg, COPY.url, CX, L.urlY, 52, 600, COLORS.navy, {enter: eOut(prog(t, C.urlIn.t0, C.urlIn.land))});
      if (t >= C.badgePop - .35) { const s = t >= C.finalStill - .1 ? 1 : spring(t, C.badgePop - .35, .36, .09), bw = L.badge.w, bh = Math.round(img.badge.height * bw / img.badge.width), cx = L.badge.cx, cy = L.badge.y + bh / 2;
        fg.save(); fg.imageSmoothingQuality = 'high'; if (Math.abs(s - 1) < 1e-4) fg.drawImage(img.badge, Math.round(cx - bw / 2), L.badge.y, bw, bh); else { fg.translate(cx, cy); fg.scale(s, s); fg.drawImage(img.badge, -bw / 2, -bh / 2, bw, bh); } fg.restore(); }
    });
    if (t >= C.ctaIn.t0) {
      const Q = L.cta, s = t >= C.finalStill - .1 ? 1 : spring(t, C.ctaIn.t0, .34, .08) * (1 - pressAt(t, C.ctaClick, .03));
      clipped(bg, cl, () => { bg.fillStyle = COLORS.blue; bg.beginPath(); bg.roundRect(Q.c[0] - (Q.half[0] - 6) * s, Q.c[1] - (Q.half[1] - 6) * s, 2 * (Q.half[0] - 6) * s, 2 * (Q.half[1] - 6) * s, Math.max(0, (Q.r - 6) * s)); bg.fill(); });
      ops.push(() => G.glass(cg({type: 'rect', ...CLEAR, c: Q.c, half: Q.half, r: Q.r, bevel: 40, scale: [s, s], anchor: Q.c, sigma: [.02, .01, 0], refr: 14, rim: .7, shadow: SH(.2, [.55, .64, .84]), clip: cl})));
      clipped(fg, cl, () => { fg.save(); fg.beginPath(); fg.roundRect(Q.c[0] - Q.half[0] * s, Q.c[1] - Q.half[1] * s, 2 * Q.half[0] * s, 2 * Q.half[1] * s, Q.r * s); fg.clip();
        line(fg, COPY.cta, Q.c[0], Q.c[1] + 18, 50, 600, COLORS.white, {enter: eOut(prog(t, C.ctaIn.t0 + .15, C.ctaIn.land + .15))}); fg.restore(); });
    }
  }

  const cur = cursorAt(t); if (cur) drawCursor(fg, cur);
  captions(hud, t);
  drawDisclaimer(hud, t);

  G.begin(cv.bg, cv.content);
  for (const op of ops) op();
  for (const op of top) op();
  G.finish();
  const out = cv.out.getContext('2d', {willReadFrequently: true});
  out.drawImage(cv.gl, 0, 0); out.drawImage(cv.fg, 0, 0); out.drawImage(cv.hud, 0, 0);
  return cv.out;
}

function captions(ctx, t) {
  const c = CAPTIONS.find(c => t >= c.t0 && t < c.t1); if (!c) return;
  const enter = eOut(prog(t, c.t0, c.t0 + .28)), exit = eIn(prog(t, c.t1 - .16, c.t1));
  c.lines.forEach((s, i) => line(ctx, s, CX, L.capY - (c.lines.length - 1 - i) * 56, 44, 500, COLORS.navy, {enter, exit, exitDir: 1}));
}
function drawDisclaimer(ctx, t) {
  // end card only: rises out of its mask line once, then identical pixels every frame to the end
  if (t < C.discIn.t0) return;
  const u = eOut(prog(t, C.discIn.t0, C.discIn.land));
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.beginPath(); ctx.rect(disc.x - 4, disc.y - 4, DISC.w + 8, disc.h + 8); ctx.clip();
  ctx.translate(0, Math.round((1 - u) * (disc.h + 12)));
  ctx.fillStyle = COLORS.navy; ctx.beginPath(); ctx.roundRect(disc.x, disc.y, DISC.w, disc.h, DISC.r); ctx.fill();
  setFont(ctx, DISC.size, 500); ctx.fillStyle = COLORS.white; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  disc.lines.forEach((s, i) => ctx.fillText(s, disc.x + DISC.pad, disc.y + DISC.pad + 2 + DISC.size * .92 + i * disc.lh));
  ctx.restore();
}
export const info = () => ({disc, L: {...L}, COPY});
