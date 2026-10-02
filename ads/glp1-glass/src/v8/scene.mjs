// MyFastRx v8 "No strings" - the 10 s product-hero spot (src/v8/timeline.mjs has the beat map).
// One locked shot, readable as a poster on frame 1: the wordmark, the headline, the price (with its qualification) on a
// teal glass pane, and the client's vial standing on a sunlit counter, tied with two twine strings and tags
// ("Membership fees", "Automatic refills"). As the VO says "No membership fees." / "No automatic refills." each string
// lets go and falls out of frame; the headline says the line word for word. The vial, free, takes one light across its
// glass; "$69" springs once on its word; the frosted end card rises with the logo, MyFastRx.com and the disclaimer.
// Layers: plate (Higgsfield footage, slow push) + the strings' back halves -> WebGL (the photo-vial pass: the label is
// copied pixel-exact, the clear glass refracts the live plate; the teal glass pane) -> strings, tags, text on top.
import * as TL from './timeline.mjs';
import {createGlass} from '../glass.mjs';
import {drawBlobs, drawGradient, makeDither, GRID} from '../v7/backdrop.mjs';

const {W, H, CUES: C, WORDS} = TL;
export const COLORS = {navy: '#001D45', blue: '#0071FE', teal: '#14A3B8', white: '#FFFFFF'};
export const COPY = {
  disclaimer: 'Compounded medication. Not FDA-approved. Results may vary. Not all patients qualify. Prescription issued only if medically appropriate following provider review. MyFastRx does not manufacture medications; product appearance and labeling may vary. Actor portrayal.',
  qual: ['Introductory offer.', 'Regular pricing', 'varies by plan.'],   // three lines, each no wider than "$69"
  startingAt: 'Starting at', price: '$69',
  heads: [['GLP-1 care,', 'without the strings.'], ['No membership', 'fees.'], ['No automatic', 'refills.'], ['GLP-1 care,', 'without the strings.']],
  tags: [['Membership', 'fees'], ['Automatic', 'refills']],
  url: 'MyFastRx.com',
};
const CX = 510;
const DISC = {w: 820, pad: 14, size: 22, lh: 1.25, bottom: 1236, r: 12};
export const L = {
  mark: {cy: 306, h: 46, pad: [26, 13], r: 24},                     // the wordmark chip, top centre (below the platform UI band)
  headY: [458, 548],
  pane: {c: [292, 842], half: [192, 186], r: 64},                    // the teal glass price pane (x 100..484)
  priceY: {start: 742, price: 884, qual: [936, 974, 1012]},
  vial: {cx: 596, base: 1420, s: .68},                               // the hero: base on the counter (its surface runs y ~1220..1580)
  tag: {w: 176},
  cam: {c: [596, 1150], k: .045},                                    // the slow push
  logo: {c: [510, 470], scale: .5}, url: {c: [510, 706], half: [300, 66], r: 66}, badge: {cx: 510, y: 820, w: 260},
  endVial: {cx: 510, base: 1660, s: .36},                           // the product again, standing under the disclaimer
};
// the two strings: tied round the neck at source rows 440 / 472 (crop rows from tools/prep-vial.mjs), tags hanging right
const STR = [
  {row: 208, knot: .30, eye: [832, 968], sway: .9, drop: C.drop1, label: COPY.tags[0], dir: 1},
  {row: 240, knot: .52, eye: [818, 1118], sway: 1.3, drop: C.drop2, label: COPY.tags[1], dir: -1},
];

// ---------- math ----------
const clamp = (v, a = 0, z = 1) => Math.min(z, Math.max(a, v));
const lerp = (a, z, t) => a + (z - a) * t;
const prog = (t, t0, t1) => clamp((t - t0) / (t1 - t0));
const eOut = u => u >= 1 ? 1 : (1 - 2 ** (-10 * u)) / (1 - 2 ** -10);
const eIn = u => u <= 0 ? 0 : (2 ** (10 * u - 10) - 2 ** -10) / (1 - 2 ** -10);
const eIO = u => u < .5 ? 4 * u ** 3 : 1 - (-2 * u + 2) ** 3 / 2;
const spring = (t, t0, per = .34, dec = .085) => { const d = t - t0; return d <= 0 ? 0 : 1 - Math.exp(-d / dec) * Math.cos(2 * Math.PI * d / per); };

let cv, G, img = {}, VM = null, disc = null, meta = null, hw = null;
const mk = (w = W, h = H) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
function setFont(ctx, px, wt) { ctx.font = `${wt} ${px}px G${wt}`; ctx.letterSpacing = px >= 64 ? `${(-0.022 * px).toFixed(2)}px` : '0px'; }
function measure(s, px, wt) { const c = cv.hud.getContext('2d'); setFont(c, px, wt); return c.measureText(s).width; }
const fit = (lines, maxPx, wt, maxW) => Math.floor(Math.min(maxPx, ...lines.map(s => maxPx * maxW / measure(s, maxPx, wt))));
// a line of text that rises out of (enter) or leaves through (exit) a mask line under its baseline; no opacity changes
function line(ctx, s, x, y, px, wt, color, {align = 'center', enter = 1, exit = 0} = {}) {
  if (enter <= 0 || exit >= 1) return;
  ctx.save(); ctx.beginPath(); ctx.rect(-4000, y - px * 1.02, 9000, px * 1.32); ctx.clip();
  setFont(ctx, px, wt); ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  ctx.fillText(s, x, y + (1 - enter) * px * 1.25 - exit * px * 1.3); ctx.restore();
}
function wrap(s, px, wt, maxW) { const out = []; let cur = ''; for (const w of s.split(' ')) { const tt = cur ? cur + ' ' + w : w; if (measure(tt, px, wt) <= maxW) cur = tt; else { out.push(cur); cur = w; } } if (cur) out.push(cur); return out; }

// plate frames (tools/extract-gen.sh counter_take1_1080p counter): 121 frames at 24 fps, played at half speed with a
// cross-blend between neighbours (the only motion is the light, so the blend reads as continuous)
const PLATE = {dir: 'counter', n: 121, rate: 12};
const plateCache = new Map();
async function plateFrame(k) {
  k = clamp(k, 0, PLATE.n - 1) + 1; if (plateCache.has(k)) return plateCache.get(k);
  const im = await new Promise((res, rej) => { const m = new Image(); m.onload = () => res(m); m.onerror = rej; m.src = `../../footage/frames/${PLATE.dir}/${String(k).padStart(4, '0')}.jpg`; });
  if (plateCache.size > 6) plateCache.delete(plateCache.keys().next().value);
  plateCache.set(k, im); return im;
}

export async function init() {
  for (const [wt, f] of [[500, 'Medium'], [600, 'SemiBold'], [700, 'Bold']]) { const ff = new FontFace('G' + wt, `url(../../assets/fonts/Geist-${f}.ttf)`, {weight: String(wt)}); await ff.load(); document.fonts.add(ff); }
  const load = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  img.logo = await load('../../images/logo_myfastrx_official.jpg');
  img.badge = await load('../../images/badge_bbb_a_rating_horizontal.jpg');
  img.tag = await load('../../plates/hang_tag.png');      // the client's price tag with its eyelet moved to the top centre
  img.twine = await load('../../plates/twine_v6.png');
  cv = {bg: mk(), decor: mk(), content: mk(), fg: mk(), hud: mk(), gl: mk(), out: mk(), tA: mk(), tB: mk(), tS: mk(108, 192), dither: makeDither(document, W, H)};
  for (const k of ['bg', 'content', 'fg', 'hud', 'out', 'tA', 'tB']) cv[k].getContext('2d', {willReadFrequently: true});
  G = createGlass(cv.gl);
  VM = await (await fetch('../../assets/vial/vial_meta.json')).json();
  const raw = async u => new Uint8Array(await (await fetch(u)).arrayBuffer());
  const mask = await raw('../../assets/vial/vial_mask_full.rgba');
  G.setVial(await raw('../../assets/vial/vial_color_full.rgba'), mask, VM.full.w, VM.full.h);   // the source pixels, uncropped resolution
  hw = []; for (let j = 0; j < VM.full.h; j++) { let n = 0; for (let i = 0; i < VM.full.w; i++) n += mask[(j * VM.full.w + i) * 4]; hw.push(n / 255 / 2); }   // silhouette half width per row
  const lines = wrap(COPY.disclaimer, DISC.size, 500, DISC.w - 2 * DISC.pad), lh = Math.round(DISC.size * DISC.lh), h = lines.length * lh + 2 * DISC.pad + 4;
  disc = {lines, lh, h, w: DISC.w, x: CX - DISC.w / 2, y: DISC.bottom - h};
  L.px = {head: fit(COPY.heads.flat(), 92, 700, 820), price: 150, start: 40, qual: 32, tag: 27};
  const pw = measure(COPY.price, L.px.price, 700), qw = Math.max(...COPY.qual.map(s => measure(s, L.px.qual, 500)));
  L.priceBox = [Math.round(L.pane.c[0] - pw / 2 - 6), L.priceY.price - 112, Math.round(L.pane.c[0] + pw / 2 + 6), L.priceY.price + 6];
  L.qualBox = [Math.round(L.pane.c[0] - qw / 2 - 6), L.priceY.qual[0] - 28, Math.round(L.pane.c[0] + qw / 2 + 6), L.priceY.qual[2] + 9];
  return {W, H, L, disc: {x: disc.x, y: disc.y, w: disc.w, h: disc.h, lines: disc.lines}, priceW: pw, qualW: qw};
}
export const frameMeta = () => meta;

// ---------- glass presets (as v7) ----------
const SH = (amt = .16, col = [.70, .74, .82]) => ({off: [5, 12], blur: 18, amt, col});
const CLEAR = {sigma: [.02, .013, .006], refr: 24, disp: .22, rim: .9, spec: 1, glow: .03, glowCol: [.4, .6, 1], lift: .02, shadow: SH()};
const TEAL = {...CLEAR, sigma: [.19, .01, 0], refr: 30, glow: .05, glowCol: [.25, .85, .95], lift: .012, shadow: SH(.18, [.60, .80, .84]), caustic: .35, sheenAmt: .10};
const glass = o => G.glass({...o, bevel: o.bevel ?? o.r, shadow: o.shadow || SH()});

// ---------- camera (the plate, the vial and the strings share it; the text does not move) ----------
const camK = t => 1 + L.cam.k * eIO(prog(t, ...C.push));
const toS = (p, k) => [L.cam.c[0] + (p[0] - L.cam.c[0]) * k, L.cam.c[1] + (p[1] - L.cam.c[1]) * k];

// ---------- the vial (world coords) ----------
const V = () => { const s = L.vial.s, w = VM.full.w * s, h = VM.full.h * s; return {s, w, h, top: L.vial.base - h, x0: L.vial.cx - w / 2}; };
const rowY = r => V().top + r * L.vial.s;
const rowHW = r => hw[Math.round(r)] * L.vial.s;

// ---------- twine ----------
// a rope along a polyline: the twine photo strip, sliced along the path (each slice rotated to its segment)
function rope(ctx, pts, thick = 8) {
  const T = img.twine, sc = thick / T.height, m0 = ctx.getTransform(); let u = 0;
  ctx.save(); ctx.imageSmoothingQuality = 'high';
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], len = Math.hypot(x1 - x0, y1 - y0); if (len < .01) continue;
    const sw = len / sc + 2, sx = (u / sc) % (T.width - sw - 2);
    ctx.setTransform(m0); ctx.translate(x0, y0); ctx.rotate(Math.atan2(y1 - y0, x1 - x0));
    ctx.drawImage(T, Math.max(0, sx), 0, Math.min(sw, T.width), T.height, -.5, -thick / 2, len + 1, thick);
    u += len;
  }
  ctx.restore();
}
const quad = (a, c, b, n = 24) => Array.from({length: n + 1}, (_, i) => { const u = i / n, v = 1 - u; return [v * v * a[0] + 2 * v * u * c[0] + u * u * b[0], v * v * a[1] + 2 * v * u * c[1] + u * u * b[1]]; });
// the loop round the neck: an ellipse (camera a little above, so the front half sits lower); half 'front' or 'back'
function loopPts(S, half) {
  const y = rowY(S.row), rx = rowHW(S.row) + 3, ry = rx * .16, out = [];
  for (let i = 0; i <= 28; i++) { const a = half === 'front' ? Math.PI * i / 28 : Math.PI + Math.PI * i / 28; out.push([L.vial.cx + rx * Math.cos(a), y + ry * Math.sin(a)]); }
  return out;
}
const knotAt = S => { const y = rowY(S.row), rx = rowHW(S.row) + 3, a = Math.PI * (.5 - S.knot); return [L.vial.cx + rx * Math.cos(a), y + rx * .16 * Math.sin(a) + 2]; };
// each string's state at t: attached (a gentle sway) or falling (released: the tag drops and turns, the string trails)
function strState(S, t) {
  const sw = Math.sin((t + S.sway) * 2.1) * 2.2 * (1 - prog(t, S.drop - .3, S.drop));
  const eye0 = [S.eye[0] + sw, S.eye[1]], knot0 = knotAt(S);
  if (t < S.drop) return {attached: true, eye: eye0, knot: knot0, rot: sw * .006};
  const d = t - S.drop, g = 5200;
  const eye = [eye0[0] + S.dir * 70 * d, eye0[1] - 120 * d + .5 * g * d * d];   // a small kick up as it lets go, then gravity
  const dk = Math.max(0, d - .05), knot = [knot0[0] + 260 * dk + S.dir * 30 * dk, knot0[1] + .5 * g * dk * dk - 60 * dk];
  return {attached: false, eye, knot, rot: S.dir * (1.8 * d + 2.4 * d * d)};
}
function drawTag(ctx, S, st) {
  const T = img.tag, w = L.tag.w, h = w * T.height / T.width, ex = w / 2, ey = 85 / T.height * h;
  ctx.save(); ctx.translate(st.eye[0], st.eye[1]); ctx.rotate(st.rot);
  ctx.shadowColor = 'rgba(0,29,69,0.16)'; ctx.shadowBlur = 16; ctx.shadowOffsetX = 8; ctx.shadowOffsetY = 10;   // the window light is on the left
  ctx.drawImage(T, -ex, -ey, w, h); ctx.shadowColor = 'transparent';
  setFont(ctx, L.px.tag, 600); ctx.fillStyle = COLORS.navy; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(S.label[0], 0, -ey + h * .56); ctx.fillText(S.label[1], 0, -ey + h * .56 + L.px.tag * 1.12);
  ctx.restore();
}

// ---------- the poster text ----------
const HEADS = [[-1, C.chip1.t0], [C.chip1.t0, C.chip2.t0], [C.chip2.t0, WORDS.price69 - .58], [WORDS.price69 - .58, 1e9]];   // [in, out]
function heads(ctx, t) {
  HEADS.forEach(([a, b], i) => {
    if (t < a || t > b + .3) return;
    const exit = eIn(prog(t, b, b + .16));   // the old line leaves through its mask first, then the new one rises
    COPY.heads[i].forEach((s, j) => line(ctx, s, CX, L.headY[j], L.px.head, 700, COLORS.navy, {enter: a < 0 ? 1 : eOut(prog(t, a + .17 + j * .05, a + .5 + j * .05)), exit}));
  });
}
function priceText(ctx, t) {
  const c = L.pane.c, s = t < C.pricePop ? 1 : 1 + .07 * Math.exp(-(t - C.pricePop) / .12) * Math.sin(Math.PI * Math.min(1, (t - C.pricePop) / .16));
  line(ctx, COPY.startingAt, c[0], L.priceY.start, L.px.start, 600, COLORS.navy);
  ctx.save(); ctx.translate(c[0], L.priceY.price - 52); ctx.scale(s, s); ctx.translate(-c[0], -(L.priceY.price - 52));
  line(ctx, COPY.price, c[0], L.priceY.price, L.px.price, 700, COLORS.navy); ctx.restore();
  COPY.qual.forEach((q, i) => line(ctx, q, c[0], L.priceY.qual[i], L.px.qual, 500, COLORS.navy));
}
function markChip(ctx) {   // the official file, cropped to the wordmark (pixels untouched), on a chip of its own #F7F7F7
  const Mk = L.mark, src = [136, 141, 1278, 261], lh = Mk.h, lw = lh * src[2] / src[3], w = lw + 2 * Mk.pad[0], h = lh + 2 * Mk.pad[1], x = CX - w / 2, y = Mk.cy - h / 2;
  ctx.save(); ctx.shadowColor = 'rgba(0,29,69,0.14)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 4; ctx.fillStyle = '#F7F7F7'; ctx.beginPath(); ctx.roundRect(x, y, w, h, Mk.r); ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(img.logo, ...src, x + Mk.pad[0], y + Mk.pad[1], lw, lh); ctx.restore();
}

// ---------- the scene ----------
async function scene(t) {
  const k = camK(t), bg = cv.bg.getContext('2d'), out = cv.out.getContext('2d');
  bg.setTransform(1, 0, 0, 1, 0, 0); bg.globalAlpha = 1;
  // the plate at half speed (cross-blended), under the push
  const f = Math.min(t, C.finalStill) * PLATE.rate, k0 = Math.floor(f), a = f - k0;
  const A = await plateFrame(k0), B = await plateFrame(k0 + 1);
  bg.save(); bg.translate(L.cam.c[0], L.cam.c[1]); bg.scale(k, k); bg.translate(-L.cam.c[0], -L.cam.c[1]);
  bg.drawImage(A, 0, 0, W, H); if (a > .001) { bg.globalAlpha = a; bg.drawImage(B, 0, 0, W, H); bg.globalAlpha = 1; }
  // the vial's cast shadow on the counter, away from the window light (left): a long soft wedge to the right
  const v = V(); bg.save(); bg.translate(L.vial.cx + v.w * .55, L.vial.base - 6); bg.scale(1, .16);
  const sg = bg.createRadialGradient(0, 0, 0, 0, 0, v.w * 1.1); sg.addColorStop(0, 'rgba(60,72,80,0.20)'); sg.addColorStop(1, 'rgba(60,72,80,0)');
  bg.fillStyle = sg; bg.fillRect(-v.w * 1.2, -v.w * 1.2, v.w * 2.4, v.w * 2.4); bg.restore();
  // the strings' back halves (behind the neck: the vial's glass refracts them)
  for (const S of STR) if (t < S.drop) rope(bg, loopPts(S, 'back'), 9);
  bg.restore();
  // WebGL: the photo vial (label pixel-exact) and the teal glass price pane
  const cc = cv.content.getContext('2d'); cc.setTransform(1, 0, 0, 1, 0, 0); cc.clearRect(0, 0, W, H);
  G.begin(cv.bg, cv.content);
  const base = toS([L.vial.cx, L.vial.base], k), s = L.vial.s * k;
  const specU = lerp(-1.4, 1.4, eIO(prog(t, ...C.glint)));
  G.vial({pos: [base[0] - VM.full.w / 2, base[1] - VM.full.h], scale: s, rot: 0, specU: t > C.glint[0] && t < C.glint[1] ? specU : -.45, floorY: base[1], reflA: 1, refr: 12});
  glass({type: 'rect', ...TEAL, c: L.pane.c, half: L.pane.half, r: L.pane.r, bevel: 44, refr: 26, shadow: SH(.20, [.55, .72, .78])});
  G.finish();
  out.setTransform(1, 0, 0, 1, 0, 0); out.globalAlpha = 1; out.drawImage(cv.gl, 0, 0);
  // strings and tags in front (world -> screen through the push)
  for (const S of STR) {
    const st = strState(S, t);
    if (!st.attached && st.eye[1] > H + 300) continue;
    out.save(); out.translate(L.cam.c[0], L.cam.c[1]); out.scale(k, k); out.translate(-L.cam.c[0], -L.cam.c[1]);
    const m = out.getTransform(); const T2 = p => [m.a * p[0] + m.c * p[1] + m.e, m.b * p[0] + m.d * p[1] + m.f]; out.restore();
    if (st.attached) rope(out, loopPts(S, 'front').map(T2), 9 * k);
    const eyeTop = [st.eye[0] - Math.sin(st.rot) * 0, st.eye[1]];
    const mid = [(st.knot[0] + eyeTop[0]) / 2, (st.knot[1] + eyeTop[1]) / 2 + (st.attached ? 34 : 10)];
    rope(out, quad(T2(st.knot), T2(mid), T2(eyeTop)), 9 * k);
    out.save(); out.translate(L.cam.c[0], L.cam.c[1]); out.scale(k, k); out.translate(-L.cam.c[0], -L.cam.c[1]); drawTag(out, S, st); out.restore();
  }
  markChip(out); heads(out, t); priceText(out, t);
}

// ---------- the end card (a frosted sheet over the counter) ----------
function endCard(ctx, t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const lw = Math.round(img.logo.width * L.logo.scale), lh = Math.round(img.logo.height * L.logo.scale), x = Math.round(L.logo.c[0] - lw / 2), y = Math.round(L.logo.c[1] - lh / 2);
  drawGradient(ctx);
  const d = cv.decor.getContext('2d'); d.setTransform(1, 0, 0, 1, 0, 0); d.clearRect(0, 0, W, H);
  drawBlobs(d, [[1040, 1180, 560, 'teal', .14], [60, 1420, 620, 'blue', .13], [980, 120, 420, 'teal', .07]]);
  d.strokeStyle = 'rgba(0,29,69,0.045)'; d.lineWidth = 1.5; d.beginPath();
  for (let gx = GRID.x0; gx <= W; gx += GRID.step) { d.moveTo(gx, 0); d.lineTo(gx, H); }
  for (let gy = GRID.y0; gy <= H; gy += GRID.step) { d.moveTo(0, gy); d.lineTo(W, gy); }
  d.stroke();
  // calm zone: a feathered hole round the logo (cast as a shadow from an off-canvas shape), so the file's own #F7F7F7 is the page
  d.globalCompositeOperation = 'destination-out'; d.shadowColor = '#000'; d.shadowBlur = 150; d.shadowOffsetX = 20000; d.fillStyle = '#000';
  d.beginPath(); d.roundRect(x - 40 - 20000, y - 30, lw + 80, lh + 60, 50); d.fill(); d.shadowColor = 'transparent'; d.shadowOffsetX = 0; d.globalCompositeOperation = 'source-over';
  ctx.drawImage(cv.decor, 0, 0);
  ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.drawImage(cv.dither, 0, 0); ctx.restore();
  ctx.fillStyle = '#F7F7F7'; ctx.fillRect(x, y, lw, lh);
  if (t >= C.logoIn.t0) { const u = eOut(prog(t, C.logoIn.t0, C.logoIn.land)); ctx.save(); ctx.beginPath(); ctx.rect(x, y, lw, lh); ctx.clip(); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(img.logo, x, y + Math.round((1 - u) * lh * .75), lw, lh); ctx.restore(); }
  if (t >= C.urlIn.t0) {   // MyFastRx.com, on a blue pill (spoken: "MyFastRx.com.")
    const Q = L.url, s = t >= C.finalStill ? 1 : spring(t, C.urlIn.t0, .34, .08);
    ctx.save(); ctx.translate(Q.c[0], Q.c[1]); ctx.scale(s, s); ctx.shadowColor = 'rgba(0,60,160,0.28)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
    const g = ctx.createLinearGradient(0, -Q.half[1], 0, Q.half[1]); g.addColorStop(0, '#2A8BFF'); g.addColorStop(1, COLORS.blue);
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-Q.half[0], -Q.half[1], 2 * Q.half[0], 2 * Q.half[1], Q.r); ctx.fill(); ctx.shadowColor = 'transparent';
    const hl = ctx.createLinearGradient(0, -Q.half[1], 0, 0); hl.addColorStop(0, 'rgba(255,255,255,0.35)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hl; ctx.beginPath(); ctx.roundRect(-Q.half[0] + 6, -Q.half[1] + 4, 2 * Q.half[0] - 12, Q.half[1], [Q.r - 6, Q.r - 6, 8, 8]); ctx.fill();
    ctx.restore();
    line(ctx, COPY.url, Q.c[0], Q.c[1] + 19, 54, 600, COLORS.white, {enter: eOut(prog(t, C.urlIn.t0 + .1, C.urlIn.land + .1))});
  }
  if (t >= C.logoIn.land) { const bw = L.badge.w, bh = Math.round(img.badge.height * bw / img.badge.width); ctx.save(); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(img.badge, Math.round(L.badge.cx - bw / 2), L.badge.y, bw, bh); ctx.restore(); }
  if (t >= C.discIn.t0) {   // end card only: rises out of its mask line once, then identical pixels every frame
    const u = eOut(prog(t, C.discIn.t0, C.discIn.land));
    ctx.save(); ctx.beginPath(); ctx.rect(disc.x - 4, disc.y - 4, DISC.w + 8, disc.h + 8); ctx.clip(); ctx.translate(0, Math.round((1 - u) * (disc.h + 12)));
    ctx.fillStyle = COLORS.navy; ctx.beginPath(); ctx.roundRect(disc.x, disc.y, DISC.w, disc.h, DISC.r); ctx.fill();
    setFont(ctx, DISC.size, 500); ctx.fillStyle = COLORS.white; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    disc.lines.forEach((s, i) => ctx.fillText(s, disc.x + DISC.pad, disc.y + DISC.pad + 2 + DISC.size * .92 + i * disc.lh)); ctx.restore();
  }
}

export async function render(t) {
  const o = cv.out.getContext('2d');
  if (t < C.sheet[1]) {   // the counter (until the end card covers it)
    await scene(t);
  }
  if (t >= C.sheet[0]) {
    const u = eOut(prog(t, ...C.sheet)), y = Math.round(H * (1 - u)), r = 64 * (y / H) ** .5;
    const A = cv.tA.getContext('2d'); A.setTransform(1, 0, 0, 1, 0, 0);
    if (u < 1) A.drawImage(cv.out, 0, 0);
    const B = cv.tB.getContext('2d'); endCard(B, t);
    { const E = L.endVial, u2 = t >= C.finalStill ? 1 : spring(t, C.logoIn.land - .1, .42, .1), cc = cv.content.getContext('2d'); cc.setTransform(1, 0, 0, 1, 0, 0); cc.clearRect(0, 0, W, H);
      const vh = VM.full.h * E.s, yb = E.base + (1 - Math.min(1, u2)) * (vh + 20);
      G.begin(cv.tB, cv.content);
      if (t >= C.logoIn.land - .1) G.vial({pos: [E.cx - VM.full.w / 2, yb - VM.full.h], scale: E.s, rot: 0, specU: -.45, floorY: E.base, clipY: E.base, reflA: u2 > .98 ? 1 : 0, refr: 10});
      G.finish(); B.setTransform(1, 0, 0, 1, 0, 0); B.drawImage(cv.gl, 0, 0); }
    o.setTransform(1, 0, 0, 1, 0, 0);
    if (u < 1) {
      o.fillStyle = '#F7F7F7'; o.fillRect(0, 0, W, H);
      o.save(); o.translate(W / 2, H * .45); o.scale(1 - .05 * u, 1 - .05 * u); o.translate(-W / 2, -H * .45); o.drawImage(cv.tA, 0, 0); o.restore();
      o.fillStyle = `rgba(0,29,69,${(.18 * u).toFixed(3)})`; o.fillRect(0, 0, W, H);
      o.save(); o.shadowColor = 'rgba(0,29,69,0.28)'; o.shadowBlur = 40; o.shadowOffsetY = -6; o.beginPath(); o.roundRect(0, y, W, H + r, [r, r, 0, 0]); o.fillStyle = '#F7F7F7'; o.fill(); o.restore();
      o.save(); o.beginPath(); o.roundRect(0, y, W, H + r, [r, r, 0, 0]); o.clip(); o.drawImage(cv.tB, 0, y); o.restore();
    } else o.drawImage(cv.tB, 0, 0);
  }
  const priceOn = t < C.sheet[0] + .2;
  meta = {t, price: priceOn ? {box: L.priceBox, qual: L.qualBox} : null, end: t >= C.sheet[1]};
  return cv.out;
}
