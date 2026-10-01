// MyFastRx "Liquid Glass" v5 "Hype" - the 2D glass film (3.0 s -> end), after the three.js hook.
// Kinetic type and glass UI on the beat (src/glass.mjs), the photo plates (plates/) as the product shots.
//   strings  the glass we dived into contracts into a teal title pane: "GLP-1 care, / no strings / attached." over a
//            taut string, which snaps on "attached".
//   control  a glass bar sweeps down: the navy card ("No membership fees.") is flicked away; a glass "Automatic refills"
//            toggle flicks OFF ("No automatic refills."); the toggle becomes the "Request refill" button the cursor
//            presses ("You request each one / when you're ready.").
//   covers   a glass heartbeat sweeps up: "One price covers" over a glass product frame; glints swap the shots on the
//            words (Rx pad / vial / box); the frame contracts into the teal price pill: "Starting at $69" + its
//            qualification, the dose slider ("Your price doesn't climb / as your dose does.").
//   end      a second heartbeat into the v3 end card.
// Layers: bg (backdrop, plates, fills under glass) -> glass passes (WebGL) -> fg (text, logo, badge, cursor) -> hud
// (end-card disclaimer). Screen coordinates throughout (no camera).
import * as TL from './timeline.mjs';
import {createGlass} from '../glass.mjs';

const {W, H, CUES: C, CAPTIONS, CURSOR, WORDS} = TL;
export const COLORS = {navy: '#001D45', blue: '#0071FE', teal: '#14A3B8', white: '#FFFFFF'};
export const COPY = {
  disclaimer: 'Compounded medication. Not FDA-approved. Results may vary. Not all patients qualify. Prescription issued only if medically appropriate following provider review. MyFastRx does not manufacture medications; product appearance and labeling may vary. Actor portrayal.',
  qual: ['Introductory offer.', 'Regular pricing', 'varies by plan.'],   // three lines, each no wider than "$69"
  startingAt: 'Starting at', price: '$69',
  head1: ['GLP-1 care,', 'with no strings', 'attached.'],   // word for word with the VO
  head2: ['No membership', 'fees.'],
  head3: ['No automatic', 'refills.'],
  toggle: 'Automatic refills',
  button: 'Request refill',
  head4: ['You request each one', "when you're ready."],
  covers: 'One price covers',
  labels: ['Provider review', 'Medication', 'Shipping'],
  dose: ['Lower dose', 'Higher dose'],
  doseLine: ["Your price doesn't climb", 'as your dose does.'],   // on-screen claim (the read ends at "$69.")
  tag: ['Clear pricing.', 'Clear care.'],
  cta: 'See if you qualify', url: 'MyFastRx.com',
};
const CX = 510;                                    // visual center of the safe area (x 100..920)
const DISC = {w: 820, pad: 14, size: 22, lh: 1.25, bottom: 1236, r: 12};
export const L = {
  pane: {c: [510, 800], half: [440, 268], r: 72}, head1Y: [712, 842, 972], twineY: 1152,
  card: {c: [510, 560], w: 640}, head2Y: [966, 1080],
  track: {c: [510, 590], half: [210, 104], r: 104}, knobR: 86, toggleLabelY: 420,
  btn: {c: [510, 600], half: [300, 84], r: 84}, head4Y: [946, 1040],
  coversY: 350, frame: {c: [510, 780], half: [380, 350], r: 46}, labelY: 1208,
  pill: {c: [510, 640], half: [250, 140], r: 140},
  slider: {c: [510, 1004], half: [300, 20], r: 20}, knobSR: 40, doseY: 1076, doseLineY: [1150, 1206],
  logo: {c: [510, 400], scale: .5}, tagY: [606, 682],
  cta: {c: [510, 790], half: [330, 70], r: 70}, urlY: 930, badge: {cx: 510, y: 956, w: 280},
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
const mk = (w = W, h = H) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const font = (px, wt) => `${wt} ${px}px G${wt}`;
function setFont(ctx, px, wt) { ctx.font = font(px, wt); ctx.letterSpacing = px >= 64 ? `${(-0.022 * px).toFixed(2)}px` : '0px'; }
function measure(s, px, wt) { const c = cv.hud.getContext('2d'); setFont(c, px, wt); return c.measureText(s).width; }
const fit = (lines, maxPx, wt, maxW = 800) => Math.floor(Math.min(maxPx, ...lines.map(s => maxPx * maxW / measure(s, maxPx, wt))));
// a line of text that rises out of (enter) or leaves through (exit) a mask line under its baseline; no opacity changes
function line(ctx, s, x, y, px, wt, color, {align = 'center', enter = 1, exit = 0, exitDir = -1} = {}) {
  if (enter <= 0 || exit >= 1) return;
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
  for (const k of ['member_card', 'ship_box', 'rx_pad', 'vial_lying', 'twine']) img[k] = await load(`../../plates/${k}.png`);
  for (const k of ['table_top', 'room_back']) img[k] = await load(`../../plates/${k}.jpg`);
  cv = {bg: mk(), content: mk(), fg: mk(), hud: mk(), gl: mk(), out: mk(), decor: mk(), vial: mk(img.vial_lying.width, img.vial_lying.height)};
  for (const k of ['bg', 'content', 'fg', 'hud', 'out', 'decor', 'vial']) cv[k].getContext('2d', {willReadFrequently: true});
  G = createGlass(cv.gl);
  const lines = wrap(COPY.disclaimer, DISC.size, 500, DISC.w - 2 * DISC.pad), lh = Math.round(DISC.size * DISC.lh), h = lines.length * lh + 2 * DISC.pad + 4;
  disc = {lines, lh, h, w: DISC.w, x: CX - DISC.w / 2, y: DISC.bottom - h};
  L.px = {head1: fit(COPY.head1, 124, 700, 780), head2: fit([...COPY.head2, ...COPY.head3], 112, 700), head4: fit(COPY.head4, 78, 700), covers: fit([COPY.covers], 92, 700), label: fit(COPY.labels, 68, 700, 700)};
  L.knobX = [L.slider.c[0] - L.slider.half[0] + 10, L.slider.c[0] + L.slider.half[0] - 10];
  L.targets = {btn: [L.btn.c[0] + 190, L.btn.c[1] + 34], knob0: [L.knobX[0] + 12, L.slider.c[1] + 14], knob1: [L.knobX[1] + 12, L.slider.c[1] + 14], cta: [L.cta.c[0] + 262, L.cta.c[1] + 30]};
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
const DEEP = {...TEAL, sigma: [.28, .016, 0]};      // inside the 3D pill at the end of the dive (sampled ~RGB 187,243,249)
const PULSE = {sigma: [1.6, .8, .08], refr: 9, disp: .2, rim: .8, spec: 1, glow: .08, glowCol: [.3, .55, 1], lift: .02, shadow: SH(.16, [.62, .70, .92])};
const lerpMat = (a, z, m) => ({...z, sigma: lerp3(a.sigma, z.sigma, m), refr: lerp(a.refr, z.refr, m), caustic: lerp(a.caustic || 0, z.caustic || 0, m), sheenAmt: lerp(a.sheenAmt || 0, z.sheenAmt || 0, m), glowCol: lerp3(a.glowCol, z.glowCol, m), shadow: {...z.shadow, col: lerp3(a.shadow.col, z.shadow.col, m), amt: lerp(a.shadow.amt, z.shadow.amt, m)}});
const glass = o => G.glass({...o, bevel: o.bevel ?? o.r, shadow: o.shadow || SH()});

// ---------- heartbeat paths ----------
const wipePts = y => [[-120, y], [360, y], [390, y - 30], [420, y + 34], [458, y - 92], [496, y + 44], [526, y], [1200, y]];

// ---------- background system ----------
const BLOBS = [   // [x, y, r, color, alpha]; teal #14A3B8, blue #0071FE
  {t: 3.0,   b: [[860, 560, 330, 'teal', .22], [160, 1080, 320, 'blue', .17], [920, 1250, 260, 'teal', .12]]},
  {t: 6.0,   b: [[900, 380, 320, 'teal', .20], [150, 760, 300, 'blue', .18], [880, 1200, 280, 'teal', .12]]},
  {t: 11.1,  b: [[940, 280, 300, 'teal', .20], [110, 760, 300, 'blue', .17], [920, 1150, 260, 'teal', .12]]},
  {t: 15.0,  b: [[850, 640, 320, 'teal', .20], [190, 1010, 300, 'blue', .17], [900, 1180, 260, 'teal', .10]]},
  {t: 19.2,  b: [[980, 1000, 320, 'blue', .15], [110, 760, 280, 'teal', .14], [990, 250, 240, 'teal', .09]]},
];
function blobsAt(t) {
  let i = 0; while (i < BLOBS.length - 1 && t >= BLOBS[i + 1].t) i++;
  let set = BLOBS[i].b;
  if (i < BLOBS.length - 1) { const nx = BLOBS[i + 1], m = eIO(prog(t, nx.t - .6, nx.t)); if (m > 0) set = set.map((bb, j) => bb.map((v, q) => typeof v === 'number' ? lerp(v, nx.b[j][q], m) : v)); }
  const td = Math.min(t, C.finalStill);
  return set.map(([x, y, r, c, a], j) => [x + 30 * Math.sin(td * .7 + j * 2.1), y + 22 * Math.cos(td * .55 + j * 1.3), r, c, a]);
}
function calmZones(t, sec) {
  // [x0, y0, x1, y1, feather, a]: each zone clears just before its text arrives
  const z = [], by = t0 => clamp((t - t0 + .45) / .4);
  if (sec === 'strings') z.push([100, 560, 920, 1040, 60, 1]);
  if (sec === 'control') z.push([100, 880, 920, 1110, 50, 1], [180, 370, 840, 440, 30, by(C.toggleIn.t0)]);
  if (sec === 'covers') z.push([110, 262, 910, 380, 40, by(C.coversIn.t0)], [130, 1146, 890, 1232, 40, by(C.labels[0].t0)],
    [380, 560, 640, 750, 40, by(C.priceIn.t0)], [200, 770, 820, 922, 40, by(C.priceIn.t0)], [180, 1050, 840, 1095, 30, by(C.sliderIn.t0)], [100, 1100, 920, 1225, 40, by(C.doseLine.t0)]);
  if (sec === 'end') z.push([60, 240, 960, 560, 70, 1], [120, 550, 900, 710, 50, by(C.tag[0].t0)], [160, 880, 860, 945, 40, by(C.urlIn.t0)], [220, 930, 800, 1100, 50, by(C.urlIn.t0)]);
  return z.filter(q => q[5] > 0);
}
function backdrop(bg, t, sec) {
  const g = bg.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#F7F7F7'); g.addColorStop(.55, '#F7F7F7'); g.addColorStop(1, '#EEF3FA');
  bg.fillStyle = g; bg.fillRect(0, 0, W, H);
  const d = cv.decor.getContext('2d'); d.setTransform(1, 0, 0, 1, 0, 0); d.clearRect(0, 0, W, H);
  for (const [x, y, r, c, a] of blobsAt(t)) {
    const rg = d.createRadialGradient(x, y, 0, x, y, r), col = c === 'teal' ? '20,163,184' : '0,113,254';
    rg.addColorStop(0, `rgba(${col},${a})`); rg.addColorStop(.55, `rgba(${col},${a * .55})`); rg.addColorStop(1, `rgba(${col},0)`);
    d.fillStyle = rg; d.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  // faint graph-paper grid (it curves through every glass piece)
  d.strokeStyle = 'rgba(0,29,69,0.075)'; d.lineWidth = 1.5; d.beginPath();
  for (let x = 30; x <= W; x += 60) { d.moveTo(x, 0); d.lineTo(x, H); }
  for (let y = 20; y <= H; y += 60) { d.moveTo(0, y); d.lineTo(W, y); }
  d.stroke();
  d.globalCompositeOperation = 'destination-out';
  // feathered with a shadow cast from an off-canvas shape (canvas filters are unreliable in the headless renderer)
  for (const [x0, y0, x1, y1, f, a] of calmZones(t, sec)) {
    d.shadowColor = `rgba(0,0,0,${a})`; d.shadowBlur = f * 1.1; d.shadowOffsetX = 20000; d.fillStyle = '#000';
    d.beginPath(); d.roundRect(x0 - 20000, y0, x1 - x0, y1 - y0, f * .6); d.fill();
  }
  d.shadowColor = 'transparent'; d.shadowOffsetX = 0; d.shadowBlur = 0; d.globalCompositeOperation = 'source-over';
  bg.drawImage(cv.decor, 0, 0);
}

// ---------- cursor ----------
function cursorAt(t) {
  const K = CURSOR.map(k => ({t: k[0], p: k[4] ? L.targets[k[4]] : [k[1], k[2]], d: k[3]}));
  let i = -1; for (let k = 0; k < K.length - 1; k++) if (t >= K[k].t && t <= K[k + 1].t) { i = k; break; }
  if (i < 0) return null;
  const a = K[i], z = K[i + 1]; if (z.t - a.t > 3) return null;          // between its appearances it is off screen
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
function sceneStrings(t, cl, ops, top, bg, fg) {
  const P = L.pane, m = spring(t, C.paneForm.t0, .40, .09), me = eOut(prog(t, C.paneForm.t0, C.paneForm.land));
  // from frame-filling (we are inside the 3D pill's glass) to the title pane
  const half = [lerp(W * .78, P.half[0], m), lerp(H * .62, P.half[1], m)], r = lerp(260, P.r, me);
  const snapU = prog(t, C.snap, C.snap + .3), kick = squish(t, C.snap + .02, .05);
  ops.push(() => glass({type: 'rect', ...lerpMat(DEEP, TEAL, me), c: [P.c[0], lerp(H / 2, P.c[1], me)], half, r, bevel: lerp(60, 34, me), scale: [1 - kick * .4, 1 + kick], anchor: [P.c[0], P.c[1] + P.half[1]], clip: cl}));
  clipped(fg, cl, () => COPY.head1.forEach((s, i) => line(fg, s, CX, L.head1Y[i], L.px.head1, 700, COLORS.navy, {enter: eOut(prog(t, C.head1[i].t0, C.head1[i].land))})));
  // the string: drawn across under the title, a glass bead on its middle; on "attached" it snaps and both halves whip away
  if (t >= C.twineIn.t0) {
    const tw = img.twine, s = .46, len = tw.width * s, th = tw.height * s, y = L.twineY;
    const grow = eOut(prog(t, C.twineIn.t0, C.twineIn.land)), fly = eOut(snapU);
    clipped(bg, cl, () => {
      bg.save(); bg.beginPath(); bg.rect(-10, -4000, (W + 20) * grow, 9000); bg.clip();
      for (const side of [-1, 1]) {
        if (fly >= 1) continue;
        bg.save();
        const pivot = side < 0 ? [CX - len, y] : [CX + len, y];          // each half recoils toward its own (off-screen) anchor
        bg.translate(pivot[0] + side * 1400 * fly, pivot[1] - 180 * fly * fly); bg.rotate(side * .55 * fly);
        bg.shadowColor = 'rgba(0,29,69,0.18)'; bg.shadowBlur = 6; bg.shadowOffsetY = 5;
        if (side < 0) bg.drawImage(tw, 0, -th / 2, len, th); else { bg.scale(-1, 1); bg.drawImage(tw, 0, -th / 2, len, th); }
        bg.restore();
      }
      bg.restore();
    });
    const bead = (t < C.snap ? spring(t, C.twineIn.land - .12, .3, .07) : 1 - eIn(prog(t, C.snap - .02, C.snap + .1))) * (grow >= .5 ? 1 : 0);
    if (bead > 0) top.push(() => glass({type: 'rect', ...TEAL, c: [CX, L.twineY], half: [26, 26], r: 26, bevel: 22, scale: [bead, bead], anchor: [CX, L.twineY], refr: 14, shadow: SH(.2, [.6, .8, .84]), clip: cl}));
  }
}

function sceneControl(t, cl, ops, top, bg, fg) {
  // the navy card ("no membership fees"): slides in, then is flicked away
  if (t < C.cardOut.t1) {
    const inn = spring(t, C.cardIn.t0, .38, .09), out = eIn(prog(t, C.cardOut.t0, C.cardOut.t1)), s = L.card.w / img.member_card.width;
    clipped(bg, cl, () => plate(bg, img.member_card, L.card.c[0] + (1 - inn) * 760 - out * 1300, L.card.c[1] - out * 260, s, -.05 - (1 - inn) * .12 - out * .7, 1));
  }
  clipped(fg, cl, () => {
    const o2 = eIn(prog(t, C.head2Out.t0, C.head2Out.t1)), o3 = eIn(prog(t, C.head3Out.t0, C.head3Out.t1));
    COPY.head2.forEach((s, i) => line(fg, s, CX, L.head2Y[i], L.px.head2, 700, COLORS.navy, {enter: eOut(prog(t, C.head2[0].t0 + i * .08, C.head2[0].land + i * .08)), exit: o2}));
    COPY.head3.forEach((s, i) => line(fg, s, CX, L.head2Y[i], L.px.head2, 700, COLORS.navy, {enter: eOut(prog(t, C.head3[0].t0 + i * .08, C.head3[0].land + i * .08)), exit: o3}));
  });
  // the toggle -> the "Request refill" button
  if (t >= C.toggleIn.t0) {
    const T0 = L.track, B = L.btn, mm = eIO(prog(t, C.morphBtn.t0, C.morphBtn.land));
    const s0 = spring(t, C.toggleIn.t0, .34, .08) * (1 - pressAt(t, C.btnPress, .05));
    const c = lerp2(T0.c, B.c, mm), half = lerp2(T0.half, B.half, mm), r = lerp(T0.r, B.r, mm);
    const off = eIO(prog(t, C.toggleOff.t0, C.toggleOff.t1));
    // the track fill under the glass: teal (on) -> grey (off) -> the button's pale fill
    clipped(bg, cl, () => {
      const fill = mm > 0 ? `rgba(221,228,236,${(1 - mm).toFixed(3)})` : `rgb(${Math.round(lerp(20, 221, off))},${Math.round(lerp(163, 228, off))},${Math.round(lerp(184, 236, off))})`;
      if (mm < 1) { bg.fillStyle = fill; bg.beginPath(); bg.roundRect(c[0] - (half[0] - 10) * s0, c[1] - (half[1] - 10) * s0, 2 * (half[0] - 10) * s0, 2 * (half[1] - 10) * s0, Math.max(0, (r - 10) * s0)); bg.fill(); }
    });
    ops.push(() => glass({type: 'rect', ...CLEAR, c, half, r, bevel: 40, scale: [s0, s0], anchor: c, sigma: [.03, .02, .01], clip: cl}));
    // the knob: right (on) -> left (off), squish on arrival; shrinks away as the track becomes the button
    const kgo = 1 - eIn(prog(t, C.morphBtn.t0, C.morphBtn.t0 + .18));
    if (kgo > 0) {
      const kx = lerp(T0.c[0] + T0.half[0] - 104, T0.c[0] - T0.half[0] + 104, off), ks = squish(t, C.toggleOff.t1, .1), kk = s0 * kgo;
      top.push(() => glass({type: 'rect', ...CLEAR, c: [kx, T0.c[1]], half: [L.knobR, L.knobR], r: L.knobR, bevel: L.knobR, scale: [kk * (1 + ks), kk * (1 - ks)], anchor: [kx, T0.c[1]], refr: 30, disp: .25, sigma: [.01, .008, .004], lift: .06, shadow: SH(.26), clip: cl}));
    }
    clipped(fg, cl, () => {
      line(fg, COPY.toggle, CX, L.toggleLabelY, 40, 600, COLORS.navy, {enter: eOut(prog(t, C.toggleIn.t0 + .05, C.toggleIn.land + .05)), exit: eIn(prog(t, C.morphBtn.t0, C.morphBtn.t0 + .14))});
      if (mm >= 1) { fg.save(); fg.beginPath(); fg.roundRect(c[0] - half[0] * s0, c[1] - half[1] * s0, 2 * half[0] * s0, 2 * half[1] * s0, r * s0); fg.clip();
        line(fg, COPY.button, c[0] - 26 * s0, c[1] + 18, 52, 600, COLORS.navy, {enter: eOut(prog(t, C.morphBtn.land - .1, C.morphBtn.land + .18))}); fg.restore(); }
      COPY.head4.forEach((s, i) => line(fg, s, CX, L.head4Y[i], L.px.head4, 700, COLORS.navy, {enter: eOut(prog(t, [WORDS.you, 9.68][i] - .05, [WORDS.you, 9.68][i] + .22))}));
    });
    const ck = spring(t, C.checkPop, .3, .07);   // the check that pops when you press it
    if (ck > 0) { const cc = [B.c[0] + 226, B.c[1]]; top.push(() => glass({type: 'rect', ...TEAL, c: cc, half: [36, 36], r: 36, bevel: 26, scale: [ck, ck], anchor: cc, refr: 14, clip: cl})); clipped(fg, cl, () => drawCheck(fg, cc, ck, 6)); }
  }
}

function sceneCovers(t, cl, ops, top, bg, fg, M) {
  const F = L.frame, P = L.pill, outC = eIn(prog(t, C.coversOut.t0, C.coversOut.t1));
  line(fg, COPY.covers, CX, L.coversY, L.px.covers, 700, COLORS.navy, {enter: eOut(prog(t, C.coversIn.t0, C.coversIn.land)), exit: outC, exitDir: 1});
  // labels: each rises on its word; the one before leaves upward as it does
  C.labels.forEach((lb, i) => {
    const nx = C.labels[i + 1], ex = nx ? eIn(prog(t, nx.t0 - .13, nx.t0 - .01)) : outC;   // out before the next one rises
    line(fg, COPY.labels[i], CX, L.labelY, L.px.label, 700, COLORS.navy, {enter: eOut(prog(t, lb.t0, lb.land)), exit: ex, exitDir: nx ? -1 : 1});
  });
  // the hero shape: product frame -> teal price pill
  const mp = eIO(prog(t, C.morphPill.t0, C.morphPill.land)), sq = squish(t, C.morphPill.land, .06);
  const fs = spring(t, C.frameIn.t0, .38, .09);
  const c = lerp2(F.c, P.c, mp), half = lerp2(F.half, P.half, mp), r = lerp(F.r, P.r, mp), sc = mp > 0 ? [1 + sq, 1 - sq] : [fs, fs];
  const anchor = mp > 0 ? [c[0], c[1] + half[1]] : F.c;
  // the photos live inside the frame; glints swap them on the words
  if (mp < 1) clipped(bg, cl, () => {
    const box = [F.c[0] - F.half[0], F.c[1] - F.half[1], F.c[0] + F.half[0], F.c[1] + F.half[1]];
    const rw = 2 * half[0] * sc[0], rh = 2 * half[1] * sc[1], rx = anchor[0] + (c[0] - half[0] - anchor[0]) * sc[0], ry = anchor[1] + (c[1] - half[1] - anchor[1]) * sc[1];
    bg.save(); bg.beginPath(); bg.roundRect(rx, ry, rw, rh, Math.max(0, r * Math.min(...sc))); bg.clip();
    const drop = eIn(prog(t, C.morphPill.t0, C.morphPill.t0 + .35)) * 900;   // the last shot drops out as the frame contracts
    const shot = (id, x0, x1) => {
      const k = C.shots.findIndex(s => s.id === id), t0 = C.shots[k].t0, zoom = 1 + .07 * eOut(prog(t, t0, t0 + 1.6));   // push-in
      bg.save(); bg.beginPath(); bg.rect(x0, -4000, x1 - x0, 9000); bg.clip(); bg.translate(0, drop);
      const cx = (box[0] + box[2]) / 2, cy = (box[1] + box[3]) / 2;
      if (id === 'vial') {
        cover(bg, img.room_back, box, 1.04 * zoom, 40);
        const v = img.vial_lying, s = .54 * zoom, vx = cx - v.width * s / 2, vy = box[3] - 52 - v.height * s;
        // contact shadow on the table edge, then the vial (pixels as supplied) with a glint sweeping its glass
        const sg = bg.createRadialGradient(cx + 8, box[3] - 52, 0, cx + 8, box[3] - 52, v.width * s * .75);
        sg.addColorStop(0, 'rgba(0,29,69,0.28)'); sg.addColorStop(1, 'rgba(0,29,69,0)');
        bg.save(); bg.translate(0, box[3] - 52); bg.scale(1, .16); bg.translate(0, -(box[3] - 52)); bg.fillStyle = sg; bg.fillRect(cx - 300, box[3] - 52 - 300, 600, 600); bg.restore();
        const vc = cv.vial.getContext('2d'); vc.setTransform(1, 0, 0, 1, 0, 0); vc.globalCompositeOperation = 'source-over'; vc.clearRect(0, 0, v.width, v.height); vc.drawImage(v, 0, 0);
        const gu = prog(t, t0 + .12, t0 + .62);
        if (gu > 0 && gu < 1) { vc.globalCompositeOperation = 'source-atop'; const gx = lerp(-200, v.width + 200, eIO(gu)), lg = vc.createLinearGradient(gx - 90, 0, gx + 90, 0);
          lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(.5, 'rgba(255,255,255,0.42)'); lg.addColorStop(1, 'rgba(255,255,255,0)'); vc.fillStyle = lg; vc.fillRect(0, 0, v.width, v.height); }
        bg.imageSmoothingQuality = 'high'; bg.drawImage(cv.vial, vx, vy, v.width * s, v.height * s);
      } else {
        cover(bg, img.table_top, box, 1.0 * zoom);
        if (id === 'rx') plate(bg, img.rx_pad, cx, cy + 4, .58 * zoom, .05);
        if (id === 'box') plate(bg, img.ship_box, cx, cy + 6, .66 * zoom, -.06);
      }
      bg.restore();
    };
    const sw = C.shots, gx = k => lerp(box[0] - 40, box[2] + 40, eIO(prog(t, sw[k].t0 - .15, sw[k].t0 + .15)));
    let cur = 0; for (let k = 1; k < sw.length; k++) if (t >= sw[k].t0 - .15) cur = k;
    if (cur > 0 && t < sw[cur].t0 + .15) { const g = gx(cur); shot(sw[cur - 1].id, g, 5000); shot(sw[cur].id, -5000, g); }
    else shot(sw[cur].id, -5000, 5000);
    bg.restore();
    for (let k = 1; k < sw.length; k++) if (t >= sw[k].t0 - .15 && t < sw[k].t0 + .15)
      top.push(() => glass({type: 'rect', ...CLEAR, c: [gx(k), F.c[1]], half: [32, F.half[1] - 6], r: 30, bevel: 30, refr: 22, rim: 1, spec: 1.2, sheenAmt: .2, sheen: 0, shadow: SH(0), clip: cl}));
  });
  ops.push(() => glass({type: 'rect', ...lerpMat({...CLEAR, rim: 1, spec: 1.1, sigma: [.03, .02, .01]}, TEAL, mp), c, half, r, bevel: lerp(28, 32, mp), scale: sc, anchor, clip: cl}));
  // the price: "Starting at $69" with its qualification (the qualification rises a beat ahead and leaves after the price)
  if (mp >= 1) {
    const en = eOut(prog(t, C.priceIn.t0, C.priceIn.land)), qe = eOut(prog(t, C.priceIn.t0 - .06, C.priceIn.land - .06));
    const ex = eIn(prog(t, C.priceOut.t0, C.priceOut.t1)), qx = eIn(prog(t, C.qualOut.t0, C.qualOut.t1));
    clipped(fg, cl, () => priceBlock(fg, P.c[0], P.c[1], {enter: en, qEnter: qe, exit: ex, qExit: qx}));
    M.price = {enter: en, exit: ex, qEnter: qe, qExit: qx, clip: cl};
  }
  // the dose slider (the cursor drags the dose up; the price holds still)
  if (t >= C.sliderIn.t0) {
    const S = L.slider, s = spring(t, C.sliderIn.t0, .34, .08);
    const kx = t < C.drag.t0 ? L.knobX[0] : t >= C.drag.t1 ? L.knobX[1] : clamp((cursorAt(t)?.p[0] ?? L.knobX[1]) - 12, L.knobX[0], L.knobX[1]);
    clipped(bg, cl, () => {
      const x0 = S.c[0] - (S.half[0] - 8) * s;
      bg.fillStyle = '#DDE4EC'; bg.beginPath(); bg.roundRect(x0, S.c[1] - 9, 2 * (S.half[0] - 8) * s, 18, 9); bg.fill();
      bg.fillStyle = COLORS.blue; bg.beginPath(); bg.roundRect(x0, S.c[1] - 9, Math.max(18, (kx - x0) * s), 18, 9); bg.fill();
    });
    ops.push(() => glass({type: 'rect', ...CLEAR, c: S.c, half: S.half, r: S.r, bevel: 18, scale: [s, s], anchor: S.c, refr: 12, clip: cl}));
    const ksq = squish(t, C.drag.t1, .08);
    ops.push(() => glass({type: 'rect', ...CLEAR, c: [kx, S.c[1]], half: [L.knobSR, L.knobSR], r: L.knobSR, bevel: L.knobSR, scale: [s * (1 + ksq), s * (1 - ksq)], anchor: [kx, S.c[1]], refr: 26, disp: .25, shadow: SH(.24), clip: cl}));
    clipped(fg, cl, () => { const e = eOut(prog(t, C.sliderIn.t0 + .1, C.sliderIn.land + .1));
      line(fg, COPY.dose[0], S.c[0] - S.half[0], L.doseY, 32, 500, COLORS.navy, {align: 'left', enter: e}); line(fg, COPY.dose[1], S.c[0] + S.half[0], L.doseY, 32, 500, COLORS.navy, {align: 'right', enter: e});
      COPY.doseLine.forEach((q, i) => line(fg, q, CX, L.doseLineY[i], 46, 600, COLORS.navy, {enter: eOut(prog(t, C.doseLine.t0 + i * .1, C.doseLine.land + i * .1))})); });
  }
}

function sceneEnd(t, cl, ops, top, bg, fg) {
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
    ops.push(() => glass({type: 'rect', ...CLEAR, c: Q.c, half: Q.half, r: Q.r, bevel: 40, scale: [s, s], anchor: Q.c, sigma: [.02, .01, 0], refr: 14, rim: .7, shadow: SH(.2, [.55, .64, .84]), clip: cl}));
    clipped(fg, cl, () => { fg.save(); fg.beginPath(); fg.roundRect(Q.c[0] - Q.half[0] * s, Q.c[1] - Q.half[1] * s, 2 * Q.half[0] * s, 2 * Q.half[1] * s, Q.r * s); fg.clip();
      line(fg, COPY.cta, Q.c[0], Q.c[1] + 18, 50, 600, COLORS.white, {enter: eOut(prog(t, C.ctaIn.t0 + .15, C.ctaIn.land + .15))}); fg.restore(); });
  }
}

// ---------- frame ----------
const SPANS = [   // scene, the time it is on screen, its backdrop zones
  {id: 'strings', fn: sceneStrings, t0: 3.0,           t1: C.wipeA.t1},
  {id: 'control', fn: sceneControl, t0: C.wipeA.t0,    t1: C.wipeB.t1},
  {id: 'covers',  fn: sceneCovers,  t0: C.wipeB.t0,    t1: C.wipeC.t1},
  {id: 'end',     fn: sceneEnd,     t0: C.wipeC.t0,    t1: 1e9},
];
// wipes: A, a clear glass bar sweeping down (new scene above it); B and C, a glass heartbeat sweeping up (new scene below it)
const WIPES = [{...C.wipeA, kind: 'bar'}, {...C.wipeB, kind: 'pulse'}, {...C.wipeC, kind: 'pulse'}];
export async function render(t) {
  const bg = cv.bg.getContext('2d'), fg = cv.fg.getContext('2d'), hud = cv.hud.getContext('2d');
  for (const c of [bg, fg, hud, cv.content.getContext('2d')]) { c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H); }
  const ops = [], top = [], M = {t, price: null};
  const wp = WIPES.find(w => t >= w.t0 && t < w.t1);
  let wy = null, splitNew = null, splitOld = null;
  if (wp) {
    const u = eIO(prog(t, wp.t0, wp.t1));
    if (wp.kind === 'bar') { wy = lerp(-120, H + 120, u); splitNew = [-1e6, wy]; splitOld = [wy, 1e6]; }
    else { wy = lerp(H + 120, -140, u); splitNew = [wy, 1e6]; splitOld = [-1e6, wy]; }
  }
  const live = SPANS.filter(s => t >= s.t0 && t < s.t1);
  for (const s of live) {
    const cl = live.length > 1 ? (s === live[live.length - 1] ? splitNew : splitOld) : [-1e6, 1e6];
    clipped(bg, cl, () => backdrop(bg, t, s.id));
    s.fn(t, cl, ops, top, bg, fg, M);
  }
  if (wp?.kind === 'bar') top.push(() => glass({type: 'rect', ...CLEAR, c: [W / 2, wy], half: [W / 2 + 80, 46], r: 46, bevel: 40, refr: 34, rim: 1, spec: 1.2, sheenAmt: .15, sheen: 0, shadow: SH(.14)}));
  if (wp?.kind === 'pulse') top.push(() => glass({type: 'tube', ...PULSE, c: [0, 0], pts: wipePts(wy), r: 12, bevel: 12, refr: 16, shadow: SH(.14, [.62, .70, .92])}));

  const cur = cursorAt(t); if (cur) drawCursor(fg, cur);
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
