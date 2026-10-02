// MyFastRx "Liquid Glass" v7 "Without the strings" - the performance cut (src/v7/timeline.mjs has the beat map).
// Real footage of her (Higgsfield / Seedance) is the connective tissue; the claims are glass UI on the white:
//   hook     her at the island, "GLP-1 care / without the strings." over a soft navy scrim, from the first frames
//   price    her tap: a liquid-glass ring opens from her fingertip, a teal drop grows into the price pill
//   control  "No / membership / fees."; the "Automatic refills" row flicks OFF and becomes "Request refill", pressed
//   tea      a quiet cutaway of her at home
//   covers   large products on the white, "One price covers" and each label on frosted glass; the frame contracts into
//            the price pill: the dose slider steps lower -> higher while "$69" holds ("Your price doesn't increase /
//            as your dose does.")
//   walk     her walk outdoors, no copy;  end  logo, the tagline, "See if you qualify", MyFastRx.com, disclaimer
// Layers: bg (backdrop, footage, plates, fills under glass) -> glass passes (WebGL) -> fg (text, logo, badge) -> hud
// (end-card disclaimer). Screen coordinates throughout (no camera).
import * as TL from './timeline.mjs';
import {createGlass} from '../glass.mjs';
import {blobsAt, drawBlobs, drawGradient, makeDither, GRID} from './backdrop.mjs';

const {W, H, CUES: C, CAPTIONS, TOUCHES, WORDS, TAP, HOOK} = TL;
export const COLORS = {navy: '#001D45', blue: '#0071FE', teal: '#14A3B8', white: '#FFFFFF'};
export const COPY = {
  disclaimer: 'Compounded medication. Not FDA-approved. Results may vary. Not all patients qualify. Prescription issued only if medically appropriate following provider review. MyFastRx does not manufacture medications; product appearance and labeling may vary. Actor portrayal.',
  qual: ['Introductory offer.', 'Regular pricing', 'varies by plan.'],   // three lines, each no wider than "$69"
  startingAt: 'Starting at', price: '$69',
  head0: ['GLP-1 care', 'without the strings.'],   // the hook and the tagline (VO: "GLP-1 care, without the strings.")
  head2: ['No', 'membership', 'fees.'],
  head3: ['No automatic', 'refills.'],
  toggle: 'Automatic refills',
  button: 'Request refill',
  head4: ['You request treatment', "when you're ready."],
  covers: 'One price covers',
  labels: ['Provider review', 'Medication', 'Shipping'],
  dose: ['Lower dose', 'Higher dose'],
  doseLine: ["Your price doesn't increase", 'as your dose does.'],   // the proof point (VO: "And your price doesn't increase ...")
  tag: ['GLP-1 care', 'without the strings.'],
  cta: 'See if you qualify', url: 'MyFastRx.com',
};
const CX = 510;                                    // visual center of the safe area (x 100..920)
const DISC = {w: 820, pad: 14, size: 22, lh: 1.25, bottom: 1236, r: 12};
export const L = {
  pill1: {c: [510, 820], half: [250, 140], r: 140},   // where the 3D hook leaves its pill (the lock framing)
  head0Y: [1078, 1188],                                         // over her, on a soft navy scrim (the island; clear of her face)
  head2Y: [640, 820, 1000],                                    // "No / membership / fees.", big, a word a line
  head3Y: [430, 548],                                          // the headlines sit up top, phone-UI style, over the row
  row: {c: [510, 860], half: [400, 112], r: 56}, rowLabelX: 156,   // the "Automatic refills" settings row (a glass card)
  track: {c: [750, 860], half: [104, 60], r: 60}, knobR: 50,   // its switch, at the row's right
  btn: {c: [510, 860], half: [340, 100], r: 100}, head4Y: [430, 538],
  frame: {c: [540, 960], half: [600, 1020], r: 80},             // the product shots, full bleed (the rim sits off screen)
  coversPane: {c: [510, 280], half: [380, 80], r: 40}, coversY: 308,   // frosted glass panes on the photo
  labelPane: {c: [510, 1178], half: [300, 58], r: 58}, labelY: 1199,   // clear of the heartbeat band (spike top ~y 1266)
  pill: {c: [510, 700], half: [250, 140], r: 140},
  slider: {c: [510, 1084], half: [320, 22], r: 22}, knobSR: 42, doseY: 1162, doseLineY: [372, 462],
  logo: {c: [510, 372], scale: .5}, tagY: [570, 656],
  cta: {c: [510, 790], half: [330, 70], r: 70}, ctaPx: 50, urlY: 930, urlPx: 52, badge: {cx: 510, y: 956, w: 280},
  endVial: {cx: 510, base: 1634, s: .30},              // standing under the disclaimer (134 x 364 px, top ~y 1270), clear of the logo
  pulseY: 1470,
};
// price block, relative to the pill's center (as v3)
const PRICE = {start: -66, price: 88, qual: [186, 228, 270]};

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

let cv, G, img = {}, disc = null, meta = null;
// footage frames (tools/extract-gen.sh): 1080x1920 graded JPEGs at the clip's own rate; frame i of a clip at time ts
const footCache = {};
async function footFrame(dir, i, n) {
  const k = clamp(Math.round(i), 0, n - 1) + 1, key = dir + k;
  if (footCache[dir]?.key === key) return footCache[dir].img;
  const im = await new Promise((res, rej) => { const m = new Image(); m.onload = () => res(m); m.onerror = rej; m.src = `../../footage/frames/${dir}/${String(k).padStart(4, '0')}.jpg`; });
  footCache[dir] = {key, img: im}; return im;
}
const WALK = {dir: 'walk', fps: 24, n: 121, from: 2.35};     // the walk clip from 2.35 s: the phone goes in the tote, she looks up and smiles
const mk = (w = W, h = H) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const font = (px, wt) => `${wt} ${px}px G${wt}`;
function setFont(ctx, px, wt) { ctx.font = font(px, wt); ctx.letterSpacing = px >= 64 ? `${(-0.022 * px).toFixed(2)}px` : '0px'; }
function measure(s, px, wt) { const c = cv.hud.getContext('2d'); setFont(c, px, wt); return c.measureText(s).width; }
const fit = (lines, maxPx, wt, maxW = 800) => Math.floor(Math.min(maxPx, ...lines.map(s => maxPx * maxW / measure(s, maxPx, wt))));
// a line of text that rises out of (enter) or leaves through (exit) a mask line under its baseline; no opacity changes
function line(ctx, s, x, y, px, wt, color, {align = 'center', enter = 1, exit = 0, exitDir = -1} = {}) {
  if (enter <= 0 || exit >= 1 || globalThis.NOTEXT) return;   // NOTEXT: text-free keyframes for the Higgsfield plates (src/v7/plate.html)
  ctx.save(); ctx.beginPath(); ctx.rect(-4000, y - px * 1.02, 9000, px * 1.32); ctx.clip();
  setFont(ctx, px, wt); ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  ctx.fillText(s, x, y + (1 - enter) * px * 1.25 + exit * exitDir * px * 1.3); ctx.restore();
}
function wrap(s, px, wt, maxW) { const out = []; let cur = ''; for (const w of s.split(' ')) { const tt = cur ? cur + ' ' + w : w; if (measure(tt, px, wt) <= maxW) cur = tt; else { out.push(cur); cur = w; } } if (cur) out.push(cur); return out; }
const clipped = (ctx, [y0, y1], fn) => { ctx.save(); if (y0 > -1e5 || y1 < 1e5) { ctx.beginPath(); ctx.rect(-4000, y0, 9000, y1 - y0); ctx.clip(); } fn(); ctx.restore(); };

export async function init() {
  for (const [wt, f] of [[500, 'Medium'], [600, 'SemiBold'], [700, 'Bold']]) { const ff = new FontFace('G' + wt, `url(../../assets/fonts/Geist-${f}.ttf)`, {weight: String(wt)}); await ff.load(); document.fonts.add(ff); }
  const load = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  img.logo = await load('../../images/logo_myfastrx_official.jpg');
  img.badge = await load('../../images/badge_bbb_a_rating_horizontal.jpg');
  for (const k of ['ship_box_v6', 'rx_clipboard', 'vial_lying', 'twine_v6']) img[k] = await load(`../../plates/${k}.png`);   // v6 cut-outs: tools/prep-plates-v6.py
  cv = {bg: mk(), content: mk(), fg: mk(), hud: mk(), gl: mk(), out: mk(), decor: mk(), grid: mk(), dither: makeDither(document, W, H), vial: mk(img.vial_lying.width, img.vial_lying.height), frost: mk(108, 192), world: mk()};
  for (const k of ['bg', 'content', 'fg', 'hud', 'out', 'decor', 'grid', 'vial']) cv[k].getContext('2d', {willReadFrequently: true});
  G = createGlass(cv.gl);
  const lines = wrap(COPY.disclaimer, DISC.size, 500, DISC.w - 2 * DISC.pad), lh = Math.round(DISC.size * DISC.lh), h = lines.length * lh + 2 * DISC.pad + 4;
  disc = {lines, lh, h, w: DISC.w, x: CX - DISC.w / 2, y: DISC.bottom - h};
  L.px = {head0: fit(COPY.head0, 104, 700, 820), tag: fit(COPY.tag, 74, 700, 820), dose: fit(COPY.doseLine, 80, 700, 840), head2: fit(COPY.head2, 176, 700, 840), head3: fit([...COPY.head3, ...COPY.head4], 104, 700, 820), covers: fit([COPY.covers], 78, 700, 720), label: fit(COPY.labels, 60, 700, 560)};
  L.px.head4 = L.px.head3;
  L.knobX = [L.slider.c[0] - L.slider.half[0] + 10, L.slider.c[0] + L.slider.half[0] - 10];
  L.touch = {btn: [L.btn.c[0] + 120, L.btn.c[1] + 8], cta: [L.cta.c[0] + 150, L.cta.c[1] + 6]};
  // the price + qualification ink boxes (verify_v5.mjs measures navy ink inside them on every frame)
  const pw = measure(COPY.price, 172, 700), qw = Math.max(...COPY.qual.map(s => measure(s, 34, 500)));
  L.priceBox = [Math.round(CX - pw / 2 - 6), L.pill.c[1] + PRICE.price - 128, Math.round(CX + pw / 2 + 6), L.pill.c[1] + PRICE.price + 6];
  L.qualBox = [Math.round(CX - qw / 2 - 6), L.pill.c[1] + PRICE.qual[0] - 30, Math.round(CX + qw / 2 + 6), L.pill.c[1] + PRICE.qual[2] + 9];
  return info();
}

// ---------- glass presets ----------
const SH = (amt = .16, col = [.70, .74, .82]) => ({off: [5, 12], blur: 18, amt, col});
const CLEAR = {sigma: [.02, .013, .006], refr: 24, disp: .22, rim: .9, spec: 1, glow: .03, glowCol: [.4, .6, 1], lift: .02, shadow: SH()};
const TEAL = {...CLEAR, sigma: [.19, .01, 0], refr: 30, glow: .05, glowCol: [.25, .85, .95], lift: .012, shadow: SH(.18, [.60, .80, .84]), caustic: .35, sheenAmt: .10};
const LOCKTEAL = {...TEAL, sigma: [.45, .12, .10], lift: 0};   // the 3D pill's tint at the lock (sampled ~RGB 157,219,224 on #F7F7F7)
const PULSE = {sigma: [2.3, 1.05, .07], refr: 14, disp: .25, rim: 1.1, spec: 1.3, glow: .14, glowCol: [.4, .65, 1], lift: .035, shadow: {off: [0, 16], blur: 22, amt: .30, col: [.55, .68, 1]}};   // deep blue glass, bright rim, a blue shadow
const lerpMat = (a, z, m) => ({...z, sigma: lerp3(a.sigma, z.sigma, m), refr: lerp(a.refr, z.refr, m), caustic: lerp(a.caustic || 0, z.caustic || 0, m), sheenAmt: lerp(a.sheenAmt || 0, z.sheenAmt || 0, m), glowCol: lerp3(a.glowCol, z.glowCol, m), shadow: {...z.shadow, col: lerp3(a.shadow.col, z.shadow.col, m), amt: lerp(a.shadow.amt, z.shadow.amt, m)}});
const glass = o => G.glass({...o, bevel: o.bevel ?? o.r, shadow: o.shadow || SH()});

// ---------- background system (src/v5/backdrop.mjs: the same light is printed on the 3D hook's table) ----------
function calmZones(t, sec) {
  // [x0, y0, x1, y1, feather, a]: each zone clears just before its text arrives
  const z = [], by = t0 => clamp((t - t0 + .45) / .4);
  if (sec === 'hook') z.push([100, 560, 920, 1130, 60, 1]);
  if (sec === 'control') z.push([90, 480, 930, 1060, 60, by(C.head2[0].t0)], [100, 330, 920, 590, 50, by(C.head3[0].t0)], [110, 748, 910, 972, 40, by(C.toggleIn.t0)]);
  if (sec === 'covers') z.push([330, 590, 690, 800, 40, by(C.priceIn.t0)], [200, 846, 820, 984, 40, by(C.priceIn.t0)], [170, 1052, 850, 1116, 30, by(C.sliderIn.t0)], [100, 1124, 920, 1176, 30, by(C.sliderIn.t0)], [100, 290, 920, 486, 50, by(C.doseLine[0].t0)]);
  if (sec === 'end') z.push([40, 240, 980, 560, 70, 1], [80, 490, 940, 690, 50, by(C.tag[0].t0)], [140, 860, 880, 1090, 50, by(C.urlIn.t0)]);
  return z.filter(q => q[5] > 0);
}
function punch(d, zones, strength, featherK) {   // feathered holes, cast as a shadow from an off-canvas shape
  d.globalCompositeOperation = 'destination-out'; d.fillStyle = '#000';
  for (const [x0, y0, x1, y1, f, a] of zones) {
    d.shadowColor = `rgba(0,0,0,${a * strength})`; d.shadowBlur = f * featherK; d.shadowOffsetX = 20000;
    d.beginPath(); d.roundRect(x0 - 20000, y0, x1 - x0, y1 - y0, f * .6); d.fill();
  }
  d.shadowColor = 'transparent'; d.shadowOffsetX = 0; d.shadowBlur = 0; d.globalCompositeOperation = 'source-over';
}
function backdrop(bg, t, sec) {
  drawGradient(bg);
  const zones = calmZones(t, sec);
  // the light: a few big, soft pools (gaussian falloff), only gently lifted behind text, so it never reads as blotches
  const d = cv.decor.getContext('2d'); d.setTransform(1, 0, 0, 1, 0, 0); d.clearRect(0, 0, W, H);
  drawBlobs(d, blobsAt(t, C.finalStill)); punch(d, zones, sec === 'end' ? 1 : .45, sec === 'end' ? .9 : 2.2);   // end card: flat #F7F7F7 behind the logo/badge files
  bg.drawImage(cv.decor, 0, 0);
  // faint graph-paper grid (it curves through every glass piece), fully cleared behind text
  const g = cv.grid.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
  g.strokeStyle = 'rgba(0,29,69,0.045)'; g.lineWidth = 1.5; g.beginPath();
  for (let x = GRID.x0; x <= W; x += GRID.step) { g.moveTo(x, 0); g.lineTo(x, H); }
  for (let y = GRID.y0 - GRID.step; y <= H; y += GRID.step) { g.moveTo(0, y); g.lineTo(W, y); }
  g.stroke(); punch(g, zones, 1, 1.1);
  bg.drawImage(cv.grid, 0, 0);
  bg.save(); bg.globalCompositeOperation = 'overlay'; bg.drawImage(cv.dither, 0, 0); bg.restore();   // zero-mean dither: no banding
}

// ---------- touch ----------
// a fingertip on glass (no cursor): a frosted glass disc lands just before the press, presses in, and a glass ripple
// spreads from it; on the slider it holds the knob through the drag
const TOUCH_R = 50;
// the dose slider moves in detents (lower -> higher dose): each step travels for 60% of its slot, then holds
const knobXAt = t => { const n = C.detents - 1, u = prog(t, C.drag.t0, C.drag.t1) * n, k = Math.min(n - 1, Math.floor(u));
  return lerp(L.knobX[0], L.knobX[1], u >= n ? 1 : (k + eIO(clamp((u - k) / .6))) / n); };
function touches(t, top) {
  for (const T of TOUCHES) {
    const t1 = T.hold ?? T.at;
    if (t < T.at - .3 || t > T.at + .7 && t > t1 + .3) continue;
    const pos = tt => T.target === 'knob' ? [knobXAt(tt), L.slider.c[1]] : L.touch[T.target];
    const p = pos(t), land = eOut(prog(t, T.at - .3, T.at - .05)), lift = eIn(prog(t, t1 + .08, t1 + .28));
    const pr = prog(t, T.at - .06, T.at) * (1 - prog(t, t1 + .02, t1 + .1)), s = land * (1 - lift) * (1 - .12 * pr);
    if (s > .01) top.push(() => glass({type: 'rect', ...CLEAR, c: p, half: [TOUCH_R, TOUCH_R], r: TOUCH_R, bevel: TOUCH_R, scale: [s, s], anchor: p,
      sigma: [.34, .28, .16], refr: 22, disp: .25, rim: 1.25, spec: 1.3, lift: .12, glow: .08, glowCol: [.4, .65, 1], shadow: SH(.2 * s)}));
    const u = prog(t, T.at, T.at + .55);   // the ripple, from where the finger first pressed
    if (u > 0 && u < 1) { const R = lerp(TOUCH_R * .9, 190, eOut(u)), w = 11 * (1 - u) ** 1.4, p0 = pos(T.at);
      if (w > .6) top.push(() => glass({type: 'ring', ...CLEAR, c: p0, half: [R, 0], r: w, bevel: w, refr: 26, disp: .3, rim: 1.2, spec: 1.3, sigma: [.04, .02, .01], glow: .08, glowCol: [.35, .7, 1], shadow: SH(0)})); }
  }
}
function drawCheck(ctx, c, s, lw = 7, col = COLORS.navy) {
  ctx.save(); ctx.translate(c[0], c[1]); ctx.scale(s, s); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-14, 1); ctx.lineTo(-4, 11); ctx.lineTo(15, -10); ctx.stroke(); ctx.restore();
}
// a photo plate (alpha PNG) with a soft navy contact shadow
function plate(ctx, im, cx, cy, s, rot = 0, sh = 1) {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
  ctx.shadowColor = `rgba(0,29,69,${(.22 * sh).toFixed(3)})`; ctx.shadowBlur = 34 * s / .6; ctx.shadowOffsetY = 18 * s / .6; ctx.shadowOffsetX = 6;
  ctx.imageSmoothingQuality = 'high'; ctx.drawImage(im, -im.width * s / 2, -im.height * s / 2, im.width * s, im.height * s); ctx.restore();
}
function cover(ctx, im, box, zoom = 1, dy = 0) {   // fill a box with a photo (center crop), zoomed about its center
  const [x0, y0, x1, y1] = box, bw = x1 - x0, bh = y1 - y0, s = Math.max(bw / im.width, bh / im.height) * zoom;
  ctx.imageSmoothingQuality = 'high'; ctx.drawImage(im, (x0 + x1) / 2 - im.width * s / 2, (y0 + y1) / 2 - im.height * s / 2 + dy, im.width * s, im.height * s);
}
function priceBlock(ctx, cx, cy, {enter = 1, qEnter = 1, exit = 0, qExit = 0} = {}) {
  line(ctx, COPY.startingAt, cx, cy + PRICE.start, 44, 500, COLORS.navy, {enter, exit, exitDir: 1});
  line(ctx, COPY.price, cx, cy + PRICE.price, 172, 700, COLORS.navy, {enter, exit, exitDir: 1});
  COPY.qual.forEach((q, i) => line(ctx, q, cx, cy + PRICE.qual[i], 34, 500, COLORS.navy, {enter: qEnter, exit: qExit, exitDir: 1}));
}

// ===================== scenes =====================
// each draws into bg/fg and queues glass passes; `cl` = the y range it owns while a wipe passes
const shiftBox = (b, dy) => [b[0], b[1] + dy, b[2], b[3] + dy];
function sceneControl(t, cl, ops, top, bg, fg) {
  // "No / membership / fees." a word a line, big; then the headlines move up top, over phone-UI glass: a settings row
  // whose switch flicks off on "refills", which becomes the "Request refill" button a fingertip presses
  clipped(fg, cl, () => {
    const o2 = eIn(prog(t, C.head2Out.t0, C.head2Out.t1)), o3 = eIn(prog(t, C.head3Out.t0, C.head3Out.t1));
    COPY.head2.forEach((q, i) => line(fg, q, CX, L.head2Y[i], L.px.head2, 700, COLORS.navy, {enter: eOut(prog(t, C.head2[i].t0, C.head2[i].land)), exit: o2}));
    COPY.head3.forEach((q, i) => line(fg, q, CX, L.head3Y[i], L.px.head3, 700, COLORS.navy, {enter: eOut(prog(t, C.head3[0].t0 + i * .08, C.head3[0].land + i * .08)), exit: o3}));
  });
  if (t < C.toggleIn.t0) return;
  const R0 = L.row, B = L.btn, T0 = L.track, mm = eIO(prog(t, C.morphBtn.t0, C.morphBtn.land));
  const s0 = spring(t, C.toggleIn.t0, .36, .085) * (1 - pressAt(t, C.btnPress, .05));
  const c = lerp2(R0.c, B.c, mm), half = lerp2(R0.half, B.half, mm), r = lerp(R0.r, B.r, mm);
  const off = eIO(prog(t, C.toggleOff.t0, C.toggleOff.t1)), sw = 1 - eIn(prog(t, C.morphBtn.t0, C.morphBtn.t0 + .2));   // the switch folds away into the morph
  const tc = [c[0] + (T0.c[0] - R0.c[0]) * s0 * sw, c[1]], kx = tc[0] + lerp(T0.half[0] - 60, -(T0.half[0] - 60), off) * s0 * sw;
  clipped(bg, cl, () => {
    // the card's body under its glass: frosted white (the settings row) -> brand blue (the button)
    bg.fillStyle = `rgba(${Math.round(lerp(255, 0, mm))},${Math.round(lerp(255, 113, mm))},${Math.round(lerp(255, 254, mm))},${lerp(.74, 1, mm).toFixed(3)})`;
    bg.beginPath(); bg.roundRect(c[0] - (half[0] - 8) * s0, c[1] - (half[1] - 8) * s0, 2 * (half[0] - 8) * s0, 2 * (half[1] - 8) * s0, Math.max(0, (r - 8) * s0)); bg.fill();
    const k = s0 * sw;
    if (k > .01) {   // the switch: teal (on) -> grey (off), a white knob under its glass
      bg.fillStyle = `rgb(${Math.round(lerp(20, 205, off))},${Math.round(lerp(163, 212, off))},${Math.round(lerp(184, 222, off))})`;
      bg.beginPath(); bg.roundRect(tc[0] - T0.half[0] * k, tc[1] - T0.half[1] * k, 2 * T0.half[0] * k, 2 * T0.half[1] * k, T0.r * k); bg.fill();
      bg.fillStyle = '#FFFFFF'; bg.beginPath(); bg.arc(kx, tc[1], (L.knobR - 4) * k, 0, 2 * Math.PI); bg.fill();
    }
  });
  ops.push(() => glass({type: 'rect', ...CLEAR, c, half, r, bevel: 40, scale: [s0, s0], anchor: c, sigma: [.02, .015, .008], refr: 18, shadow: SH(lerp(.14, .2, mm), lerp3([.70, .74, .82], [.55, .64, .84], mm)), clip: cl}));
  const kk = s0 * sw;
  if (kk > .01) { const ks = squish(t, C.toggleOff.t1, .1);
    top.push(() => glass({type: 'rect', ...CLEAR, c: [kx, tc[1]], half: [L.knobR, L.knobR], r: L.knobR, bevel: L.knobR, scale: [kk * (1 + ks), kk * (1 - ks)], anchor: [kx, tc[1]], refr: 26, disp: .25, sigma: [.01, .008, .004], lift: .05, shadow: SH(.24), clip: cl})); }
  clipped(fg, cl, () => {
    line(fg, COPY.toggle, L.rowLabelX + (c[0] - R0.c[0]), c[1] + 17, 48, 600, COLORS.navy, {align: 'left', enter: eOut(prog(t, C.toggleIn.t0 + .06, C.toggleIn.land + .06)), exit: eIn(prog(t, C.morphBtn.t0, C.morphBtn.t0 + .14))});
    if (mm >= 1) { fg.save(); fg.beginPath(); fg.roundRect(c[0] - half[0] * s0, c[1] - half[1] * s0, 2 * half[0] * s0, 2 * half[1] * s0, r * s0); fg.clip();
      line(fg, COPY.button, c[0] - 30 * s0, c[1] + 20, 58, 600, COLORS.white, {enter: eOut(prog(t, C.morphBtn.land - .1, C.morphBtn.land + .18))}); fg.restore(); }
    COPY.head4.forEach((q, i) => line(fg, q, CX, L.head4Y[i], L.px.head4, 700, COLORS.navy, {enter: eOut(prog(t, [WORDS.you, WORDS.when][i] - .05, [WORDS.you, WORDS.when][i] + .22))}));
  });
  const ck = spring(t, C.checkPop, .3, .07);   // the check that pops when it is pressed
  if (ck > 0) { const cc = [B.c[0] + 262, B.c[1]]; top.push(() => glass({type: 'rect', ...TEAL, c: cc, half: [38, 38], r: 38, bevel: 26, scale: [ck, ck], anchor: cc, refr: 14, clip: cl})); clipped(fg, cl, () => drawCheck(fg, cc, ck, 6, COLORS.white)); }
}

function sceneCovers(t, cl, ops, top, bg, fg, M) {
  // the products, large, on the film's own white backdrop (the frame's rim sits off screen); glints sweep the full height
  // to swap them on the words; the words sit on frosted glass panes; then the frame contracts into the teal price pill
  const F = L.frame, P = L.pill, outC = eIn(prog(t, C.coversOut.t0, C.coversOut.t1));
  const mp = eIO(prog(t, C.morphPill.t0, C.morphPill.land)), sq = squish(t, C.morphPill.land, .06);
  const c = lerp2(F.c, P.c, mp), half = lerp2(F.half, P.half, mp), r = lerp(F.r, P.r, mp), sc = [1 + sq, 1 - sq], anchor = [c[0], c[1] + half[1]];
  if (mp < 1) clipped(bg, cl, () => {
    const cx = W / 2, cy = 742;
    bg.save(); bg.beginPath(); bg.roundRect(c[0] - half[0], c[1] - half[1], 2 * half[0], 2 * half[1], r); bg.clip();
    const drop = eIn(prog(t, C.morphPill.t0, C.morphPill.t0 + .35)) * 900;   // the last shot drops out as the frame contracts
    const shot = (id, x0, x1) => {
      const k = C.shots.findIndex(q => q.id === id), t0 = C.shots[k].t0, zoom = 1 + .06 * eOut(prog(t, t0, t0 + 1.6));   // push-in
      bg.save(); bg.beginPath(); bg.rect(x0, -4000, x1 - x0, 9000); bg.clip(); bg.translate(0, drop);
      bg.translate(cx, cy); bg.scale(zoom, zoom); bg.translate(-cx, -cy);
      if (id === 'vial') {
        const v = img.vial_lying, s = .56, base = 1092, vx = cx - v.width * s / 2, vy = base - v.height * s;
        const sg = bg.createRadialGradient(cx + 8, base, 0, cx + 8, base, v.width * s * .8);   // contact shadow
        sg.addColorStop(0, 'rgba(0,29,69,0.30)'); sg.addColorStop(1, 'rgba(0,29,69,0)');
        bg.save(); bg.translate(0, base); bg.scale(1, .16); bg.translate(0, -base); bg.fillStyle = sg; bg.fillRect(cx - 400, base - 400, 800, 800); bg.restore();
        const vc = cv.vial.getContext('2d'); vc.setTransform(1, 0, 0, 1, 0, 0); vc.globalCompositeOperation = 'source-over'; vc.clearRect(0, 0, v.width, v.height); vc.drawImage(v, 0, 0);
        const gu = prog(t, t0 + .12, t0 + .62);
        if (gu > 0 && gu < 1) { vc.globalCompositeOperation = 'source-atop'; const gx = lerp(-200, v.width + 200, eIO(gu)), lg = vc.createLinearGradient(gx - 90, 0, gx + 90, 0);
          lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(.5, 'rgba(255,255,255,0.42)'); lg.addColorStop(1, 'rgba(255,255,255,0)'); vc.fillStyle = lg; vc.fillRect(0, 0, v.width, v.height); }
        bg.imageSmoothingQuality = 'high'; bg.drawImage(cv.vial, vx, vy, v.width * s, v.height * s);
      } else {
        if (id === 'rx') plate(bg, img.rx_clipboard, cx, cy, 720 / img.rx_clipboard.height, .02, 1.2);
        if (id === 'box') plate(bg, img.ship_box_v6, cx, cy + 10, 780 / img.ship_box_v6.width, 0, 1.2);
      }
      bg.restore();
    };
    const sw = C.shots, gx = k => lerp(-60, W + 60, eIO(prog(t, sw[k].t0 - .15, sw[k].t0 + .15)));
    let cur = 0; for (let k = 1; k < sw.length; k++) if (t >= sw[k].t0 - .15) cur = k;
    if (cur > 0 && t < sw[cur].t0 + .15) { const g = gx(cur); shot(sw[cur - 1].id, g, 5000); shot(sw[cur].id, -5000, g); }
    else shot(sw[cur].id, -5000, 5000);
    bg.restore();
    for (let k = 1; k < sw.length; k++) if (t >= sw[k].t0 - .15 && t < sw[k].t0 + .15)
      top.push(() => glass({type: 'rect', ...CLEAR, c: [gx(k), H / 2], half: [36, H / 2 + 60], r: 34, bevel: 34, refr: 24, rim: 1, spec: 1.2, sheenAmt: .2, sheen: 0, shadow: SH(0), clip: cl}));
  });
  ops.push(() => glass({type: 'rect', ...lerpMat({...CLEAR, rim: 1, spec: 1.1, sigma: [0, 0, 0]}, TEAL, mp), c, half, r, bevel: lerp(28, 32, mp), scale: sc, anchor, clip: cl}));
  // the frosted panes: "One price covers" up top, each item's label below the product
  const panes = [[L.coversPane, spring(t, C.coversIn.t0 - .1, .36, .09)], [L.labelPane, spring(t, C.labels[0].t0 - .12, .36, .09)]];
  for (const [Pn, sp] of panes) {
    const k = sp * (1 - outC); if (k <= .01 || mp >= 1) continue;
    clipped(bg, cl, () => frostPane(bg, cv.bg, {c: Pn.c, half: [Pn.half[0] * k, Pn.half[1] * k], r: Pn.r * k}));
    ops.push(() => glass({type: 'rect', ...CLEAR, c: Pn.c, half: Pn.half, r: Pn.r, bevel: 30, scale: [k, k], anchor: Pn.c, refr: 14, rim: 1, sigma: [.01, .008, .004], shadow: SH(.16), clip: cl}));
  }
  clipped(fg, cl, () => {
    line(fg, COPY.covers, CX, L.coversY, L.px.covers, 700, COLORS.navy, {enter: eOut(prog(t, C.coversIn.t0, C.coversIn.land)), exit: outC, exitDir: 1});
    C.labels.forEach((lb, i) => {   // each rises on its word; the one before leaves upward as it does
      const nx = C.labels[i + 1], ex = nx ? eIn(prog(t, nx.t0 - .13, nx.t0 - .01)) : outC;
      line(fg, COPY.labels[i], CX, L.labelY, L.px.label, 700, COLORS.navy, {enter: eOut(prog(t, lb.t0, lb.land)), exit: ex, exitDir: nx ? -1 : 1});
    });
  });
  // the price: "Starting at $69" with its qualification (the qualification rises a beat ahead and leaves after the price)
  if (mp >= 1) {
    const en = eOut(prog(t, C.priceIn.t0, C.priceIn.land)), qe = eOut(prog(t, C.priceIn.t0 - .06, C.priceIn.land - .06));
    const ex = eIn(prog(t, C.priceOut.t0, C.priceOut.t1)), qx = eIn(prog(t, C.qualOut.t0, C.qualOut.t1));
    clipped(fg, cl, () => priceBlock(fg, P.c[0], P.c[1], {enter: en, qEnter: qe, exit: ex, qExit: qx}));
    M.price = {box: L.priceBox, qbox: L.qualBox, enter: en, exit: ex, qEnter: qe, qExit: qx};
  }
  // the dose slider (a fingertip drags the dose up; the price holds still)
  if (t >= C.sliderIn.t0) {
    const S = L.slider, s = spring(t, C.sliderIn.t0, .34, .08), kx = knobXAt(t);
    clipped(bg, cl, () => {
      const x0 = S.c[0] - (S.half[0] - 8) * s;
      bg.fillStyle = '#DDE4EC'; bg.beginPath(); bg.roundRect(x0, S.c[1] - 9, 2 * (S.half[0] - 8) * s, 18, 9); bg.fill();
      bg.fillStyle = COLORS.blue; bg.beginPath(); bg.roundRect(x0, S.c[1] - 9, Math.max(18, (kx - x0) * s), 18, 9); bg.fill();
    });
    ops.push(() => glass({type: 'rect', ...CLEAR, c: S.c, half: S.half, r: S.r, bevel: 18, scale: [s, s], anchor: S.c, refr: 12, clip: cl}));
    // detent marks on the track (the dose steps)
    clipped(bg, cl, () => { for (let k = 0; k < C.detents; k++) { const x = lerp(L.knobX[0], L.knobX[1], k / (C.detents - 1));
      bg.fillStyle = x <= kx + 1 ? '#FFFFFF' : '#AFC0D4'; bg.beginPath(); bg.arc(x, S.c[1], 5 * s, 0, 2 * Math.PI); bg.fill(); } });
    // on each step the price holds: a light glint crosses the pill, the figure never moves
    for (const td of TL.DETENTS.slice(1)) { const gu = prog(t, td, td + .32); if (gu > 0 && gu < 1) { const gx = lerp(P.c[0] - P.half[0] + 20, P.c[0] + P.half[0] - 20, eIO(gu));
      top.push(() => glass({type: 'rect', ...CLEAR, c: [gx, P.c[1]], half: [16, P.half[1] - 14], r: 16, bevel: 16, refr: 16, rim: .9, spec: 1.2, sheenAmt: .2, sheen: 0, shadow: SH(0), clip: [P.c[1] - P.half[1], P.c[1] + P.half[1]]})); } }
    const ksq = squish(t, C.drag.t1, .08);
    ops.push(() => glass({type: 'rect', ...CLEAR, c: [kx, S.c[1]], half: [L.knobSR, L.knobSR], r: L.knobSR, bevel: L.knobSR, scale: [s * (1 + ksq), s * (1 - ksq)], anchor: [kx, S.c[1]], refr: 26, disp: .25, shadow: SH(.24), clip: cl}));
    clipped(fg, cl, () => { const e = eOut(prog(t, C.sliderIn.t0 + .1, C.sliderIn.land + .1));
      const dx = eIO(prog(t, C.drag.t0, C.drag.t1)), mix = (a, z) => `rgb(${[0, 1, 2].map(j => Math.round(lerp(a[j], z[j], dx))).join(',')})`;
      line(fg, COPY.dose[0].toUpperCase(), S.c[0] - S.half[0], L.doseY, 34, 600, mix([0, 29, 69], [120, 138, 160]), {align: 'left', enter: e});
      line(fg, COPY.dose[1].toUpperCase(), S.c[0] + S.half[0], L.doseY, 34, 600, mix([120, 138, 160], [0, 29, 69]), {align: 'right', enter: e});
      const ox = eIn(prog(t, C.priceOut.t0, C.qualOut.t1));
      COPY.doseLine.forEach((q, i) => line(fg, q, CX, L.doseLineY[i], L.px.dose, 700, COLORS.navy, {enter: eOut(prog(t, C.doseLine[i].t0, C.doseLine[i].land)), exit: ox})); });
  }
}

function sceneEnd(t, cl, ops, top, bg, fg) {
  clipped(fg, cl, () => {
    if (t >= C.logoIn.t0) { const u = eOut(prog(t, C.logoIn.t0, C.logoIn.land)), lw = Math.round(img.logo.width * L.logo.scale), lh = Math.round(img.logo.height * L.logo.scale), x = Math.round(L.logo.c[0] - lw / 2), y = Math.round(L.logo.c[1] - lh / 2);
      fg.save(); fg.beginPath(); fg.rect(x, y, lw, lh); fg.clip(); fg.imageSmoothingQuality = 'high'; fg.drawImage(img.logo, x, y + Math.round((1 - u) * lh * .75), lw, lh); fg.restore(); }
    COPY.tag.forEach((s, i) => line(fg, s, CX, L.tagY[i], L.px.tag, 700, COLORS.navy, {enter: eOut(prog(t, C.tag[i].t0, C.tag[i].land))}));
    if (t >= C.urlIn.t0) line(fg, COPY.url, CX, L.urlY, L.urlPx, 600, COLORS.navy, {enter: eOut(prog(t, C.urlIn.t0, C.urlIn.land))});
    if (t >= C.badgePop - .35) { const s = t >= C.finalStill - .1 ? 1 : spring(t, C.badgePop - .35, .36, .09), bw = L.badge.w, bh = Math.round(img.badge.height * bw / img.badge.width), cx = L.badge.cx, cy = L.badge.y + bh / 2;
      fg.save(); fg.imageSmoothingQuality = 'high'; if (Math.abs(s - 1) < 1e-4) fg.drawImage(img.badge, Math.round(cx - bw / 2), L.badge.y, bw, bh); else { fg.translate(cx, cy); fg.scale(s, s); fg.drawImage(img.badge, -bw / 2, -bh / 2, bw, bh); } fg.restore(); }
    // the vial, standing under the disclaimer: rises out of a line at its base on a spring, one glint across it, then still
    if (t >= C.vialIn.t0) {
      const V = L.endVial, v = img.vial_lying, u = t >= C.finalStill - .1 ? 1 : spring(t, C.vialIn.t0, .42, .1), w = v.width * V.s, h = v.height * V.s;
      const vc = cv.vial.getContext('2d'); vc.setTransform(1, 0, 0, 1, 0, 0); vc.globalCompositeOperation = 'source-over'; vc.clearRect(0, 0, v.width, v.height); vc.drawImage(v, 0, 0);
      const gu = prog(t, ...C.vialGlint);
      if (gu > 0 && gu < 1) { vc.globalCompositeOperation = 'source-atop'; const gx = lerp(-200, v.width + 200, eIO(gu)), lg = vc.createLinearGradient(gx - 90, 0, gx + 90, 0);
        lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(.5, 'rgba(255,255,255,0.40)'); lg.addColorStop(1, 'rgba(255,255,255,0)'); vc.fillStyle = lg; vc.fillRect(0, 0, v.width, v.height); }
      const sg = fg.createRadialGradient(V.cx + 6, V.base, 0, V.cx + 6, V.base, w * .9);   // contact shadow on the line it stands on
      sg.addColorStop(0, `rgba(0,29,69,${(.22 * Math.min(1, u)).toFixed(3)})`); sg.addColorStop(1, 'rgba(0,29,69,0)');
      fg.save(); fg.translate(0, V.base); fg.scale(1, .14); fg.translate(0, -V.base); fg.fillStyle = sg; fg.fillRect(V.cx - w, V.base - w, 2 * w, 2 * w); fg.restore();
      fg.save(); fg.beginPath(); fg.rect(0, V.base - h - 40, W, h + 40); fg.clip();
      fg.imageSmoothingQuality = 'high'; fg.drawImage(cv.vial, V.cx - w / 2, V.base - h + (1 - u) * (h + 20), w, h); fg.restore();
    }
  });
  if (t >= C.ctaIn.t0) {
    const Q = L.cta, s = t >= C.finalStill - .1 ? 1 : spring(t, C.ctaIn.t0, .34, .08) * (1 - pressAt(t, C.ctaClick, .03));
    clipped(bg, cl, () => { bg.fillStyle = COLORS.blue; bg.beginPath(); bg.roundRect(Q.c[0] - (Q.half[0] - 6) * s, Q.c[1] - (Q.half[1] - 6) * s, 2 * (Q.half[0] - 6) * s, 2 * (Q.half[1] - 6) * s, Math.max(0, (Q.r - 6) * s)); bg.fill(); });
    ops.push(() => glass({type: 'rect', ...CLEAR, c: Q.c, half: Q.half, r: Q.r, bevel: 40, scale: [s, s], anchor: Q.c, sigma: [.02, .01, 0], refr: 14, rim: .7, shadow: SH(.13, [.55, .64, .84]), clip: cl}));   // light: the badge file below sits on flat #F7F7F7
    clipped(fg, cl, () => { fg.save(); fg.beginPath(); fg.roundRect(Q.c[0] - Q.half[0] * s, Q.c[1] - Q.half[1] * s, 2 * Q.half[0] * s, 2 * Q.half[1] * s, Q.r * s); fg.clip();
      line(fg, COPY.cta, Q.c[0], Q.c[1] + 18, L.ctaPx, 600, COLORS.white, {enter: eOut(prog(t, C.ctaIn.t0 + .15, C.ctaIn.land + .15))}); fg.restore(); });
  }
}


// ===================== the hook: her tap, and the ring =====================
// Footage outside the ring, the glass world inside it. The ring is glass that refracts only its inside (the glass world),
// never the footage with her in it. A teal drop left at the touch point glides up and grows into the price pill.
const RMAX = Math.hypot(Math.max(TAP.finger[0], W - TAP.finger[0]), Math.max(TAP.finger[1], H - TAP.finger[1])) + 90;
function sceneHook(t, cl, ops, top, bg, fg, M) {
  const F = TAP.finger, u = prog(t, ...HOOK.ring), R = t < TAP.at ? 0 : RMAX * (1 - (1 - u) ** 2.6);
  if (R < RMAX - 1) bg.drawImage(img.tapFrame, 0, 0, W, H);
  if (t < TL.OPEN.cut) {   // the proposition, from the first frames: over a soft navy scrim on the island, clear of her face
    const a = eOut(prog(t, ...C.scrim)), g = bg.createLinearGradient(0, 860, 0, 1420);
    g.addColorStop(0, 'rgba(0,29,69,0)'); g.addColorStop(.45, `rgba(0,29,69,${(.50 * a).toFixed(3)})`); g.addColorStop(1, `rgba(0,29,69,${(.62 * a).toFixed(3)})`);
    bg.fillStyle = g; bg.fillRect(0, 860, W, 1060);
    const ex = eIn(prog(t, C.head0Out.t0, C.head0Out.t1));
    clipped(fg, cl, () => COPY.head0.forEach((q, i) => line(fg, q, CX, L.head0Y[i], L.px.head0, 700, COLORS.white, {enter: eOut(prog(t, C.head0[i].t0, C.head0[i].land)), exit: ex})));
  }
  if (R > 0) {
    // the glass world on its own canvas, masked to the circle, then laid over the footage (a clip region + the dither's
    // 'overlay' blend directly on bg left the footage black outside the clip's bounding box on some frames)
    const wc = cv.world.getContext('2d'); wc.setTransform(1, 0, 0, 1, 0, 0); wc.globalCompositeOperation = 'source-over'; wc.clearRect(0, 0, W, H);
    backdrop(wc, t, 'hook');
    wc.globalCompositeOperation = 'destination-in'; wc.fillStyle = '#000'; wc.beginPath(); wc.arc(F[0], F[1], R, 0, 2 * Math.PI); wc.fill();
    wc.globalCompositeOperation = 'source-over'; bg.drawImage(cv.world, 0, 0);
    if (R < RMAX - 1) { const w = lerp(12, 34, Math.min(1, u * 3)) * (1 - .35 * u);
      ops.push(() => glass({type: 'ring', ...CLEAR, c: F, half: [R, 0], r: w, bevel: w, refr: 46, disp: .32, rim: 1.15, spec: 1.35, sigma: [.05, .02, .01], glow: .1, glowCol: [.35, .8, 1], oneSided: true, shadow: SH(.10)})); }
  }
  // the drop -> the price pill (it only ever sits inside the ring, on the glass world)
  if (t >= HOOK.bead.t0) {
    const Q = L.pill1, g = eIO(prog(t, ...HOOK.glide)), b = spring(t, HOOK.bead.t0, .34, .08), sq = squish(t, HOOK.glide[1], .07);
    const out = eIn(prog(t, C.pillOut.t0, C.pillOut.t1));   // after the price has left, the pill shrinks away into the UI section
    const rb = 66 * b, c = lerp2(F, Q.c, g), half = [lerp(rb, Q.half[0], g), lerp(rb, Q.half[1], g)], r = lerp(rb, Q.r, g);
    if (rb > .5 && out < 1) ops.push(() => glass({type: 'rect', ...LOCKTEAL, c, half, r, bevel: Math.min(40, r), scale: [(1 + sq) * (1 - out), (1 - sq) * (1 - out)], anchor: c, clip: cl}));
    if (t >= HOOK.qualIn[0] && t < C.qualOut0.t1) {
      const qe = eOut(prog(t, ...HOOK.qualIn)), en = eOut(prog(t, ...HOOK.priceIn));
      const ex = eIn(prog(t, C.priceOut0.t0, C.priceOut0.t1)), qx = eIn(prog(t, C.qualOut0.t0, C.qualOut0.t1));
      clipped(fg, cl, () => priceBlock(fg, Q.c[0], Q.c[1], {enter: en, qEnter: qe, exit: ex, qExit: qx}));
      M.price = {box: shiftBox(L.priceBox, Q.c[1] - L.pill.c[1]), qbox: shiftBox(L.qualBox, Q.c[1] - L.pill.c[1]), enter: en, qEnter: qe, exit: ex, qExit: qx};
    }
  }
  M.ring = R;
}

// ===================== the outro: her walk, the tagline on frosted glass =====================
function frostPane(bg, im, P) {   // a frosted-glass backing: the footage under the pane, blurred (down- and up-sampled) and lifted
  const fc = cv.frost.getContext('2d'); fc.imageSmoothingQuality = 'high'; fc.drawImage(im, 0, 0, 108, 192);
  bg.save(); bg.beginPath(); bg.roundRect(P.c[0] - P.half[0], P.c[1] - P.half[1], 2 * P.half[0], 2 * P.half[1], P.r); bg.clip();
  bg.imageSmoothingEnabled = true; bg.imageSmoothingQuality = 'high'; bg.drawImage(cv.frost, 0, 0, W, H);
  bg.fillStyle = 'rgba(247,249,252,0.55)'; bg.fillRect(0, 0, W, H); bg.restore();
}
function sceneFootage(key) {   // a full-frame footage scene (her); no glass over her, no copy
  return (t, cl, ops, top, bg) => clipped(bg, cl, () => bg.drawImage(img[key], 0, 0, W, H));
}

// ---------- frame ----------
const SPANS = [   // scene, the time it is on screen (footage scenes draw their own picture)
  {id: 'hook',    fn: sceneHook,             t0: 0,               t1: C.pillOut.t1, footage: true},
  {id: 'control', fn: sceneControl,          t0: TL.OPEN.dive,    t1: C.wipe1.t1},
  {id: 'tea',     fn: sceneFootage('teaFrame'), t0: C.wipe1.t0,   t1: C.wipe2.t1, footage: true},
  {id: 'covers',  fn: sceneCovers,           t0: C.wipe2.t0,      t1: C.wipe3.t1},
  {id: 'walk',    fn: sceneFootage('walkFrame'), t0: C.wipe3.t0,  t1: C.wipe4.t1, footage: true},
  {id: 'end',     fn: sceneEnd,              t0: C.wipe4.t0,      t1: 1e9},
];
// wipes: a clear glass bar sweeping down (new scene above it) or up (new scene below it)
const WIPES = [{...C.wipe1, kind: 'bar'}, {...C.wipe2, kind: 'barUp'}, {...C.wipe3, kind: 'bar'}, {...C.wipe4, kind: 'barUp'}];
export async function render(t) {
  const bg = cv.bg.getContext('2d'), fg = cv.fg.getContext('2d'), hud = cv.hud.getContext('2d');
  for (const c of [bg, fg, hud, cv.content.getContext('2d')]) { c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H); }
  const ops = [], top = [], M = {t, price: null};
  const wp = WIPES.find(w => t >= w.t0 && t < w.t1);
  let wy = null, splitNew = null, splitOld = null;
  if (wp) {
    const u = eIO(prog(t, wp.t0, wp.t1));
    if (wp.kind === 'bar') { wy = lerp(-120, H + 120, u); splitNew = [-1e6, wy]; splitOld = [wy, 1e6]; }
    else { wy = lerp(H + 120, -120, u); splitNew = [wy, 1e6]; splitOld = [-1e6, wy]; }
  }
  const live = SPANS.filter(s => t >= s.t0 && t < s.t1);
  if (live.some(s => s.id === 'hook')) img.tapFrame = t < TL.OPEN.cut   // the opening shot, then (cut on the action) the tap close-up
    ? await footFrame(TL.OPENING.dir, (TL.OPENING.from + t) * TL.OPENING.fps, TL.OPENING.n)
    : await footFrame(TAP.dir, TAP.contact + (t - TAP.at) * TAP.fps, TAP.n);
  if (live.some(s => s.id === 'tea')) img.teaFrame = await footFrame(TL.TEA.dir, (TL.TEA.from + t - C.wipe1.t0) * TL.TEA.fps, TL.TEA.n);
  if (live.some(s => s.id === 'walk')) img.walkFrame = await footFrame(WALK.dir, (WALK.from + t - C.wipe3.t0) * WALK.fps, WALK.n);
  for (const s of live) {
    const cl = live.length > 1 && wp ? (s === live[live.length - 1] ? splitNew : splitOld) : [-1e6, 1e6];   // (the hook's pill shrinks away over the UI's first frames: no split)
    if (!s.footage) clipped(bg, cl, () => backdrop(bg, t, s.id));
    s.fn(t, cl, ops, top, bg, fg, M);
  }
  if (wp) top.push(() => glass({type: 'rect', ...CLEAR, c: [W / 2, wy], half: [W / 2 + 80, 46], r: 46, bevel: 40, refr: 34, rim: 1, spec: 1.2, sheenAmt: .15, sheen: 0, shadow: SH(.14)}));

  touches(t, top);
  captions(hud, t);
  drawDisclaimer(hud, t);

  G.begin(cv.bg, cv.content);
  for (const op of ops) op();
  for (const op of top) op();
  G.finish();
  const out = cv.out.getContext('2d', {willReadFrequently: true});
  out.drawImage(cv.gl, 0, 0); out.drawImage(cv.fg, 0, 0); out.drawImage(cv.hud, 0, 0);
  meta = M;
  return cv.out;
}

function captions(ctx, t) {
  const c = CAPTIONS.find(c => t >= c.t0 && t < c.t1); if (!c) return;
  const enter = eOut(prog(t, c.t0, c.t0 + .28)), exit = eIn(prog(t, c.t1 - .16, c.t1));
  c.lines.forEach((s, i) => line(ctx, s, CX, 1206 - (c.lines.length - 1 - i) * 56, 44, 500, COLORS.navy, {enter, exit, exitDir: 1}));
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
export const frameMeta = () => meta;
