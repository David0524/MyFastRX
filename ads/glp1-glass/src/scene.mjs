// MyFastRx "Liquid Glass" - Version A. One continuous take: nothing fades or cuts. Text rises out of mask lines,
// objects pop on springs, the price pill morphs into the photo frame, the frame contracts into the toggle track,
// and a navy flood contracts into the CTA button. A cursor drives the clicks and the drag.
//
// Layers per frame:
//   bg   (2D, world/camera space): canvas, text that glass is passing over, footage inside the frame, fills
//   glass (WebGL): vial, tube, pill/frame/track, check buttons, knob, CTA - each refracts everything behind it
//   fg   (2D, world): landed text, check marks, logo, badge, cursor
//   top  (2D, world): the navy flood
//   hud  (2D, screen - never zoomed, never covered): captions + the static disclaimer panel
import * as TL from './timeline.mjs';
import {createGlass} from './glass.mjs';

const {W, H, CUES: C, CAPTIONS, CURSOR} = TL;
export const COLORS = {off1: '#F7F7F7', off2: '#F2F3F5', navy: '#001D45', blue: '#0071FE', teal: '#14A3B8', white: '#FFFFFF'};

export const COPY = {
  disclaimer: 'Compounded medication. Not FDA-approved. Results may vary. Not all patients qualify. Prescription issued only if medically appropriate following provider review. MyFastRx does not manufacture medications; product appearance and labeling may vary. Actor portrayal.',
  qual: ['Introductory offer.', 'Regular pricing varies by plan.'],
  hookHead: 'GLP-1 care',
  visitHead: ['GLP-1 weight-loss', 'care'],
  startingAt: 'Starting at', price: '$69',
  checks: ['Provider review', 'Medication', 'Shipping included'],
  fees: ['No membership fees', 'No automatic refills'],
  cta: 'See if you qualify', url: 'MyFastRx.com',
};

// Footage: licensed Mixkit clips (Mixkit Stock Video Free License), graded frames from tools/extract-footage.sh.
// start = ad time of frame 1. hasPerson: glass never refracts that footage (hands and bodies are never bent).
export const FOOTAGE = {
  latte:   {frames: 'footage/frames/latte',   n: 155, start: 0,    hasPerson: false, label: 'Latte pour'},
  laptop:  {frames: 'footage/frames/laptop',  n: 108, start: null, hasPerson: true,  label: 'Hands on a laptop'},
  package: {frames: 'footage/frames/package', n: 117, start: null, hasPerson: true,  label: 'Package at the door'},
};

const CX = 510;                                   // visual center of the safe area (x 100..920)
// Fine print: 22 px, sitting above the Reels caption/controls zone (bottom 35%) so no platform UI covers it.
const DISC = {w: 820, pad: 14, size: 22, lh: 1.25, bottom: 1236, r: 12};   // spans the safe area x 100-920, clear of the Reels right rail
export const L = {
  vial: {x: 100, y: 460},                          // half-size vial 230x509, integer top-left at rest
  hookY: 420, head2Y: [340, 424],
  startY: 646, priceY: 800, priceX: 646,
  pill: {c: [646, 712], half: [250, 140], r: 140},
  qualY: [898, 940],
  tubeY: 645,
  frame: {c: [510, 510], half: [410, 240], r: 44},
  rows: [850, 950, 1050], btnR: 40,
  track: {c: [510, 560], half: [230, 110], r: 110}, knobR: 84,
  feesY: [800, 886],
  logo: {c: [510, 430], scale: .5},
  cta: {c: [510, 650], half: [330, 72], r: 72},
  urlY: 800, badge: {cx: 510, y: 850, w: 380},
};

// ---------- math ----------
const clamp = (v, a = 0, z = 1) => Math.min(z, Math.max(a, v));
const lerp = (a, z, t) => a + (z - a) * t;
const lerp2 = (a, z, t) => [lerp(a[0], z[0], t), lerp(a[1], z[1], t)];
const lerp3 = (a, z, t) => a.map((v, i) => lerp(v, z[i], t));
const prog = (t, t0, t1) => clamp((t - t0) / (t1 - t0));
const eOut = u => u >= 1 ? 1 : (1 - 2 ** (-10 * u)) / (1 - 2 ** -10);          // expo out, exact at 1
const eIn = u => u <= 0 ? 0 : (2 ** (10 * u - 10) - 2 ** -10) / (1 - 2 ** -10);
const eIO = u => u < .5 ? 4 * u ** 3 : 1 - (-2 * u + 2) ** 3 / 2;
const spring = (t, t0, per = .34, dec = .085) => { const d = t - t0; return d <= 0 ? 0 : 1 - Math.exp(-d / dec) * Math.cos(2 * Math.PI * d / per); };
const squish = (t, t0, amp) => { const d = t - t0; return d < 0 ? 0 : amp * Math.exp(-d / .08) * Math.sin(2 * Math.PI * d / .22); };

let cv, G, img = {}, disc = null, camS = 1, camF = [0, 0];
const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
const font = (px, wt) => `${wt} ${px}px G${wt}`;
const T = p => [(p[0] - camF[0]) * camS + camF[0], (p[1] - camF[1]) * camS + camF[1]];
const worldXf = ctx => ctx.setTransform(camS, 0, 0, camS, camF[0] * (1 - camS), camF[1] * (1 - camS));

function setFont(ctx, px, wt) { ctx.font = font(px, wt); ctx.letterSpacing = px >= 64 ? `${(-0.022 * px).toFixed(2)}px` : '0px'; }
function measure(s, px, wt) { const c = cv.hud.getContext('2d'); setFont(c, px, wt); return c.measureText(s).width; }
// A line of text that rises out of (enter) or leaves through (exit) a mask line under its baseline. No opacity change.
function line(ctx, s, x, y, px, wt, color, {align = 'center', enter = 1, exit = 0, exitDir = -1, dx = 0} = {}) {
  if (enter <= 0 || exit >= 1) return;
  ctx.save();
  ctx.beginPath(); ctx.rect(-4000, y - px * 1.02, 9000, px * 1.32); ctx.clip();
  setFont(ctx, px, wt); ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  const dy = (1 - enter) * px * 1.25 + exit * exitDir * px * 1.3;
  ctx.fillText(s, x + dx, y + dy);
  ctx.restore();
}
function wrap(s, px, wt, maxW) {
  const words = s.split(' '), out = []; let cur = '';
  for (const w of words) { const tt = cur ? cur + ' ' + w : w; if (measure(tt, px, wt) <= maxW) cur = tt; else { out.push(cur); cur = w; } }
  if (cur) out.push(cur); return out;
}

const footCache = {};
async function footFrame(id, t) {
  const f = FOOTAGE[id]; if (!f.frames || f.start == null) return null;
  const i = clamp(Math.floor((t - f.start) * TL.FPS + 1e-6) + 1, 1, f.n);
  if (footCache[id]?.i === i) return footCache[id].img;
  const im = await new Promise((res, rej) => { const m = new Image(); m.onload = () => res(m); m.onerror = rej; m.src = `../${f.frames}/${String(i).padStart(4, '0')}.jpg`; });
  footCache[id] = {i, img: im}; return im;
}
export async function init() {
  for (const [wt, f] of [[500, 'Medium'], [600, 'SemiBold'], [700, 'Bold']]) {
    const ff = new FontFace('G' + wt, `url(../assets/fonts/Geist-${f}.ttf)`, {weight: String(wt)}); await ff.load(); document.fonts.add(ff);
  }
  const load = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  img.logo = await load('../images/logo_myfastrx_official.jpg');
  img.badge = await load('../images/badge_bbb_a_rating_horizontal.jpg');
  const meta = await (await fetch('../assets/vial/vial_meta.json')).json();
  const raw = async f => new Uint8Array(await (await fetch(f)).arrayBuffer());
  cv = {bg: mk(), content: mk(), fg: mk(), top: mk(), hud: mk(), gl: mk(), out: mk()};
  // every 2D layer CPU-backed: a GPU-backed layer can hand drawImage a stale snapshot in headless Chrome
  for (const k of ['bg', 'content', 'fg', 'top', 'hud', 'out']) cv[k].getContext('2d', {willReadFrequently: true});
  G = createGlass(cv.gl);
  G.setVial(await raw('../assets/vial/vial_color_half.rgba'), await raw('../assets/vial/vial_mask_half.rgba'), meta.half.w, meta.half.h);
  img.vialW = meta.half.w; img.vialH = meta.half.h;
  const lines = wrap(COPY.disclaimer, DISC.size, 500, DISC.w - 2 * DISC.pad);
  const lh = Math.round(DISC.size * DISC.lh), h = lines.length * lh + 2 * DISC.pad + 4;
  disc = {lines, lh, h, w: DISC.w, x: CX - DISC.w / 2, y: DISC.bottom - h};
  const labW = Math.max(...COPY.checks.map(s => measure(s, 50, 600)));
  L.rowX0 = Math.round(CX - (2 * L.btnR + 28 + labW) / 2);
  L.knobX = [L.track.c[0] - L.track.half[0] + 26 + L.knobR, L.track.c[0] + L.track.half[0] - 26 - L.knobR];
  L.targets = {c0: [L.rowX0 + L.btnR + 6, L.rows[0] + 8], c1: [L.rowX0 + L.btnR + 6, L.rows[1] + 8], c2: [L.rowX0 + L.btnR + 6, L.rows[2] + 8],
    knob0: [L.knobX[0] + 10, L.track.c[1] + 12], knob1: [L.knobX[1] + 10, L.track.c[1] + 12]};
  return info();
}

// ---------- glass presets ----------
const SH = (amt = .16, col = [.70, .74, .82]) => ({off: [5, 12], blur: 18, amt, col});
const CLEAR = {sigma: [.02, .013, .006], refr: 24, disp: .22, rim: .9, spec: 1, glow: .03, glowCol: [.4, .6, 1], lift: .02, shadow: SH()};
const TEAL = {...CLEAR, sigma: [.62, .17, .12], refr: 36, glow: .05, glowCol: [.2, .8, .9], lift: 0, shadow: SH(.18, [.60, .80, .84])};
// apply the camera to a glass object (all lengths scale with the zoom)
function cg(o) {
  const s = camS, q = {...o, c: T(o.c), r: o.r * s, bevel: (o.bevel ?? o.r) * s, refr: (o.refr ?? 24) * s};
  if (o.half) q.half = [o.half[0] * s, o.half[1] * s];
  if (o.pts) q.pts = o.pts.map(p => T(p)), q.c = [0, 0];
  if (o.anchor) q.anchor = T(o.anchor);
  const sh = o.shadow || SH(); q.shadow = {...sh, off: [sh.off[0] * s, sh.off[1] * s], blur: sh.blur * s};
  if (o.protect) { const a = T([o.protect[0], o.protect[1]]), z = T([o.protect[2], o.protect[3]]); q.protect = [a[0], a[1], z[0], z[1]]; }
  return q;
}
function lerpMat(a, z, m) { return {...z, sigma: lerp3(a.sigma, z.sigma, m), refr: lerp(a.refr, z.refr, m), glowCol: lerp3(a.glowCol, z.glowCol, m), shadow: {...z.shadow, col: lerp3(a.shadow.col, z.shadow.col, m), amt: lerp(a.shadow.amt, z.shadow.amt, m)}}; }

// ---------- the pill -> photo frame -> toggle track shape ----------
function mainShape(t) {
  const P = L.pill, F = L.frame, K = L.track;
  if (t < C.pillSlide.t0) return null;
  if (t < C.morphFrame.t0) {
    const u = prog(t, C.pillSlide.t0, C.pillSlide.land);            // falls onto the screen: accelerates, stops dead, squishes
    const c = [P.c[0], lerp(-P.half[1] - 60, P.c[1], u * u)];
    const sq = squish(t, C.pillSlide.land, .08);
    let press = 0;
    if (t > 8.6) press = t < C.pillClick ? .035 * eOut(prog(t, 8.62, 8.7)) : .035 * (1 - spring(t, C.pillClick, .3, .06));
    return {kind: 'pill', c, half: P.half, r: P.r, bevel: 32, scale: [1 + sq - press, 1 - sq - press], anchor: press ? c : [c[0], c[1] + P.half[1]], mat: TEAL, content: t < C.pillCrisp};
  }
  if (t < C.morphTrack.t0) {
    const m = eIO(prog(t, C.morphFrame.t0, C.morphFrame.land)), sq = squish(t, C.morphFrame.land, .012);
    const c = lerp2(P.c, F.c, m), half = lerp2(P.half, F.half, m);
    return {kind: 'frame', c, half, r: lerp(P.r, F.r, m), bevel: lerp(32, 30, m), scale: [1 + sq, 1 - sq], anchor: [c[0], c[1] + half[1]], mat: lerpMat(TEAL, CLEAR, m)};
  }
  const m = eIO(prog(t, C.morphTrack.t0, C.morphTrack.land)), sq = squish(t, C.morphTrack.land, .04);
  const c = lerp2(F.c, K.c, m), half = lerp2(F.half, K.half, m);
  return {kind: 'track', c, half, r: lerp(F.r, K.r, m), bevel: lerp(30, 40, m), scale: [1 + sq, 1 - sq], anchor: [c[0], c[1] + half[1]], mat: CLEAR};
}

// ---------- cursor ----------
function cursorAt(t) {
  const K = CURSOR.map(k => ({t: k[0], p: k[4] ? L.targets[k[4]] : [k[1], k[2]], d: k[3]}));
  if (t < K[0].t || t > K[K.length - 1].t) return null;
  let i = 0; while (i < K.length - 2 && t > K[i + 1].t) i++;
  const a = K[i], z = K[i + 1], u = eIO(prog(t, a.t, z.t));
  const dist = Math.hypot(z.p[0] - a.p[0], z.p[1] - a.p[1]);
  const mid = Math.sin(Math.PI * u) * Math.min(40, dist * .08);           // a slight hand-drawn arc between keys
  const p = [lerp(a.p[0], z.p[0], u) - mid * .35, lerp(a.p[1], z.p[1], u) + mid];
  const down = a.d && z.d ? 1 : a.d ? 1 - prog(t, a.t, a.t + .06) : z.d ? prog(t, z.t - .06, z.t) : 0;
  return {p, down};
}
function drawCursor(ctx, c) {
  if (c.p[0] > 1130) return;
  const s = 1.3 * (1 - .12 * c.down);
  const pts = [[0, 0], [0, 33], [8.5, 25.5], [14, 38], [20, 35.5], [14.5, 23.5], [26, 23.5]];
  ctx.save(); ctx.translate(c.p[0], c.p[1]); ctx.scale(s, s);
  ctx.shadowColor = 'rgba(0,29,69,0.28)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
  ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath();
  ctx.fillStyle = COLORS.navy; ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.lineJoin = 'round'; ctx.lineWidth = 2.2; ctx.strokeStyle = COLORS.white; ctx.stroke();
  ctx.restore();
}

// ---------- footage inside the frame ----------
function footage(ctx, id, box, dx, dy) {
  const f = FOOTAGE[id]; const [x0, y0, x1, y1] = box;
  ctx.save(); ctx.translate(dx, dy);
  if (f.frames && img['foot_' + id]) {
    ctx.drawImage(img['foot_' + id], x0, y0, x1 - x0, y1 - y0);          // already graded at ingest
  } else {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, id === 'laptop' ? '#E6E1DA' : '#DFE3E6'); g.addColorStop(1, id === 'laptop' ? '#CDD5DE' : '#C9D1D8');
    ctx.fillStyle = g; ctx.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4);
    ctx.strokeStyle = 'rgba(0,29,69,0.07)'; ctx.lineWidth = 10; ctx.beginPath();
    for (let k = x0 - 800; k < x1 + 200; k += 56) { ctx.moveTo(k, y1); ctx.lineTo(k + 560, y0); }
    ctx.stroke();
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    ctx.fillStyle = 'rgba(0,29,69,0.55)'; ctx.textAlign = 'center';
    setFont(ctx, 30, 600); ctx.fillText('FOOTAGE PLACEHOLDER', cx, cy - 22);
    setFont(ctx, 28, 500); ctx.fillText(f.label, cx, cy + 22);
    setFont(ctx, 22, 500); ctx.fillText('Licensed clip goes here. Glass never refracts the person.', cx, cy + 60);
  }
  ctx.restore();
}

// ---------- tube (the logo's heartbeat as a glass tube) ----------
function tubePts(dx) {
  const sx = L.vial.x + img.vialW / 2;
  return [[-640, 0], [-120, 0], [-92, -30], [-62, 40], [-18, -100], [18, 26], [48, 0], [130, 0]].map(([x, y]) => [x + sx + dx, y + L.tubeY]);
}

// ---------- frame ----------
export async function render(t) {
  const bg = cv.bg.getContext('2d'), fg = cv.fg.getContext('2d'), top = cv.top.getContext('2d'), hud = cv.hud.getContext('2d');
  for (const c of [fg, top, hud, cv.content.getContext('2d')]) { c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H); }
  bg.setTransform(1, 0, 0, 1, 0, 0); bg.fillStyle = COLORS.off1; bg.fillRect(0, 0, W, H);
  // camera: exactly identity whenever text is being read; one push-in on the price-pill click
  const Z = C.zoom;
  const zu = t < Z.peak ? eIO(prog(t, Z.t0, Z.peak)) : 1 - eIO(prog(t, Z.peak + .2, Z.t1));
  camS = 1 + (Z.s - 1) * zu; camF = camS === 1 ? [0, 0] : [L.pill.c[0], L.pill.c[1]];
  worldXf(bg); worldXf(fg); worldXf(top);
  const ops = [];
  const push = eIn(prog(t, C.pushOut.t0, C.pushOut.t1)) * -1150;
  FOOTAGE.laptop.start = C.morphFrame.t0; FOOTAGE.package.start = C.footPush.t0;
  for (const id of Object.keys(FOOTAGE)) img['foot_' + id] = await footFrame(id, t);

  // ===== opening: full-frame footage card, native word stickers; pushes up at footOut to reveal the glass world =====
  if (t < C.footOut.t1) {
    const off = -eIO(prog(t, C.footOut.t0, C.footOut.t1)) * (H + 80);
    bg.save(); bg.beginPath(); bg.roundRect(-10, -80 + off, W + 20, H + 80, off < 0 ? 64 : 0); bg.clip();
    footage(bg, 'latte', [0, 0, W, H], 0, off);
    // word stickers (the VO words as they are spoken): white label pops on a spring, the word rises inside it
    const ws = C.hookWords, px = 64, pad = 22, gap = 16;
    const wd = ws.map(w => measure(w.w, px, 700) + 2 * pad), tot = wd.reduce((a, b) => a + b, 0) + gap * (ws.length - 1);
    let x = CX - tot / 2;
    ws.forEach((w, i) => {
      const s = spring(t, w.t, .3, .07);
      if (s > 0) {
        const cx = x + wd[i] / 2, cy = L.hookY - px * .36 + off;
        bg.save(); bg.translate(cx, cy); bg.scale(s, s);
        bg.shadowColor = 'rgba(0,29,69,0.18)'; bg.shadowBlur = 18; bg.shadowOffsetY = 6;
        bg.fillStyle = COLORS.white; bg.beginPath(); bg.roundRect(-wd[i] / 2, -px * .72, wd[i], px * 1.44, 18); bg.fill(); bg.restore();
        line(bg, w.w, cx, L.hookY + off, px, 700, COLORS.navy, {enter: eOut(prog(t, w.t + .03, w.t + .25))});
      }
      x += wd[i] + gap;
    });
    bg.restore();
    if (off < 0) ops.push(() => G.glass(cg({type: 'rect', ...CLEAR, c: [W / 2, H / 2 - 40 + off], half: [W / 2 + 60, H / 2 + 40], r: 64, bevel: 40, refr: 16, lift: .01})));
  }

  // ===== vial + tube =====
  if (t >= C.vialRise.t0 && t < C.pushOut.t1) {
    const u = eOut(prog(t, C.vialRise.t0, C.vialRise.land));
    const floor = L.vial.y + img.vialH;
    let vx = L.vial.x + push, vy = L.vial.y + (1 - u) * (img.vialH + 12), rot = 0;
    const sw = prog(t, C.vialSway.t0, C.vialSway.t1);
    if (sw > 0 && sw < 1) { const e = eIO(sw), env = Math.sin(Math.PI * e); rot = -0.018 * Math.sin(2 * Math.PI * e) * env; vx += 4 * Math.sin(2 * Math.PI * e) * env; }
    const specU = -.52 + (vx - L.vial.x) * .004 - rot * 9 + (1 - u) * .35;
    if (t >= C.tubeSlide.t0) {
      const tu = eOut(prog(t, C.tubeSlide.t0, C.tubeSlide.land));
      ops.push(() => G.glass(cg({type: 'tube', c: [0, 0], pts: tubePts(-560 * (1 - tu) + push), r: 11, bevel: 11, refr: 8, disp: .2,
        sigma: [1.9, .95, .1], rim: .8, spec: 1, glow: .08, glowCol: [.3, .55, 1], lift: .02, shadow: SH(.16, [.62, .70, .92])})));
    }
    ops.push(() => {
      const pivot = T([vx + img.vialW / 2, vy + img.vialH]), fl = T([0, floor])[1];
      G.vial({pos: [pivot[0] - img.vialW / 2, pivot[1] - img.vialH], scale: camS, rot, specU, clipY: fl, floorY: fl, reflA: u});
    });
  }

  // ===== headline =====
  if (t >= C.headSwap.t0 && t < C.pushOut.t1)
    COPY.visitHead.forEach((s, i) => line(fg, s, CX + push, L.head2Y[i], 80, 700, COLORS.navy, {enter: eOut(prog(t, C.headSwap.t0 + i * .08, C.headSwap.land + i * .08))}));

  // ===== price + qualification =====
  if (t < C.qualOut.t1) {
    const px = eIn(prog(t, C.priceOut.t0, C.priceOut.t1));
    // while the pill falls, the price lives on the pill's top face (content layer): seen only through the glass
    const pc = t < C.pillCrisp ? cv.content.getContext('2d') : fg;
    if (t >= C.pillSlide.t0) {
      line(pc, COPY.startingAt, L.priceX, L.startY, 44, 500, COLORS.navy, {exit: px, exitDir: 1});
      line(pc, COPY.price, L.priceX, L.priceY, 172, 700, COLORS.navy, {exit: px, exitDir: 1});
    }
    const qe = eOut(prog(t, C.qualIn.t0, C.qualIn.land)), qx = eIn(prog(t, C.qualOut.t0, C.qualOut.t1));
    if (qe > 0 && qx < 1) {
      // white label (native text-sticker style) keeps it legible over footage and canvas alike
      const qw = Math.max(...COPY.qual.map(q => measure(q, 34, 500))) + 44, qs = spring(t, C.qualIn.t0, .3, .07) * (1 - qx);
      fg.save(); fg.translate(L.priceX, (L.qualY[0] + L.qualY[1]) / 2 - 12); fg.scale(qs, qs);
      fg.shadowColor = 'rgba(0,29,69,0.14)'; fg.shadowBlur = 16; fg.shadowOffsetY = 4;
      fg.fillStyle = COLORS.white; fg.beginPath(); fg.roundRect(-qw / 2, -54, qw, 108, 18); fg.fill(); fg.restore();
      if (qs > .98 || t > C.qualIn.land) COPY.qual.forEach((q, i) => line(fg, q, L.priceX, L.qualY[i], 34, 500, COLORS.navy, {enter: qe, exit: qx, exitDir: 1}));
    }
  }

  // ===== the main glass shape (pill / frame / track) and what lives inside it =====
  const shape = mainShape(t);
  if (shape && t < C.flood.full) {
    if (shape.kind !== 'pill') {
      const box = [L.frame.c[0] - L.frame.half[0], L.frame.c[1] - L.frame.half[1], L.frame.c[0] + L.frame.half[0], L.frame.c[1] + L.frame.half[1]];
      bg.save(); bg.beginPath(); bg.roundRect(shape.c[0] - shape.half[0], shape.c[1] - shape.half[1], 2 * shape.half[0], 2 * shape.half[1], shape.r); bg.clip();
      const span = 2 * L.frame.half[0] + 40, fp = eIO(prog(t, C.footPush.t0, C.footPush.t1)) * span;
      const down = shape.kind === 'track' ? eIn(prog(t, C.morphTrack.t0, C.morphTrack.t0 + .55)) * 900 : 0;
      if (shape.kind === 'track') { bg.fillStyle = '#E4E9F0'; bg.fillRect(-500, -500, W + 1000, H + 1000); }
      if (down < 900) {
        if (fp < span) footage(bg, 'laptop', box, -fp, down);
        if (fp > 0) footage(bg, 'package', box, span - fp, down);
      }
      if (shape.kind === 'track' && t >= C.drag.t0) {
        const kx = knobX(t), x0 = L.track.c[0] - L.track.half[0] + 16;
        bg.fillStyle = COLORS.blue; bg.beginPath();
        bg.roundRect(x0, L.track.c[1] - L.track.half[1] + 16, Math.max(kx + L.knobR + 10 - x0, 2 * L.knobR), 2 * L.track.half[1] - 32, L.track.half[1] - 16); bg.fill();
      }
      bg.restore();
    }
    const prot = shape.kind === 'frame' ? [L.frame.c[0] - L.frame.half[0] - 60, L.frame.c[1] - L.frame.half[1] - 60, L.frame.c[0] + L.frame.half[0] + 60, L.frame.c[1] + L.frame.half[1] + 60] : null;   // hands/bodies: no bending
    ops.push(() => G.glass(cg({type: 'rect', ...shape.mat, c: shape.c, half: shape.half, r: shape.r, bevel: shape.bevel, scale: shape.scale, anchor: shape.anchor, protect: prot, content: shape.content})));
  }

  // ===== check rows =====
  if (t >= C.checks[0] - .5 && t < C.checksOut.t1) {
    const out = eIn(prog(t, C.checksOut.t0, C.checksOut.t1));
    C.checks.forEach((land, i) => {
      const y = L.rows[i], bc = [L.rowX0 + L.btnR, y];
      const pop = spring(t, land - .45) * (1 - out);
      if (pop <= 0) return;
      const press = t > land - .08 && t < land ? .06 * prog(t, land - .08, land) : t >= land ? .06 * (1 - spring(t, land, .26, .05)) : 0;
      const s = pop * (1 - press);
      ops.push(() => G.glass(cg({type: 'rect', ...CLEAR, c: bc, half: [L.btnR, L.btnR], r: L.btnR, bevel: 30, scale: [s, s], anchor: bc, refr: 18, sigma: [.10, .05, .02]})));
      const ck = spring(t, land, .3, .07) * (1 - out);
      if (ck > 0) drawCheck(fg, bc, ck);
      line(fg, COPY.checks[i], L.rowX0 + 2 * L.btnR + 28, y + 18, 50, 600, COLORS.navy, {align: 'left', enter: eOut(prog(t, land - .05, land + .3)), exit: out, exitDir: 1});
    });
  }

  // ===== toggle knob + fees text =====
  if (t >= C.knobPop && t < C.flood.full) {
    const kx = knobX(t), sq = squish(t, C.drag.t1, .07), s = spring(t, C.knobPop, .32, .08);
    ops.push(() => G.glass(cg({type: 'rect', ...CLEAR, c: [kx, L.track.c[1]], half: [L.knobR, L.knobR], r: L.knobR, bevel: L.knobR, scale: [s * (1 + sq), s * (1 - sq)], anchor: [kx, L.track.c[1]], refr: 30, disp: .25, shadow: SH(.24)})));
  }
  if (t >= C.feesIn[0].t0 && t < C.feesOut.t1 + .1)
    COPY.fees.forEach((s, i) => line(fg, s, CX, L.feesY[i], 72, 700, COLORS.navy, {enter: eOut(prog(t, C.feesIn[i].t0, C.feesIn[i].land)), exit: eIn(prog(t, C.feesOut.t0 + i * .04, C.feesOut.t1 + i * .04))}));

  // ===== navy flood -> CTA button =====
  const F = C.flood;
  if (t >= F.t0) {
    const kc = [L.knobX[1], L.track.c[1]];
    let c, w, h, r;
    if (t < F.full) { const R = lerp(L.knobR, 2400, eIn(prog(t, F.t0, F.full))); c = kc; w = h = 2 * R; r = R; }
    else { const m = eOut(prog(t, F.full, F.t1)); c = lerp2(kc, L.cta.c, m); w = lerp(4800, 2 * L.cta.half[0], m); h = lerp(4800, 2 * L.cta.half[1], m); r = lerp(2400, L.cta.r, m); }
    const done = t >= F.t1;
    const press = t > C.ctaClick - .08 && t < C.ctaClick ? .03 * prog(t, C.ctaClick - .08, C.ctaClick) : t >= C.ctaClick ? .03 * (1 - spring(t, C.ctaClick, .26, .05)) : 0;
    const ps = 1 - press;
    const target = done ? bg : top;
    target.save(); target.fillStyle = COLORS.navy; target.beginPath();
    target.roundRect(c[0] - w / 2 * ps, c[1] - h / 2 * ps, w * ps, h * ps, r * ps); target.fill(); target.restore();
    if (done) {
      ops.push(() => G.glass(cg({type: 'rect', ...CLEAR, c: L.cta.c, half: L.cta.half, r: L.cta.r, bevel: 40, scale: [ps, ps], anchor: L.cta.c, sigma: [0, 0, 0], refr: 10, rim: .55, spec: .9, lift: 0, shadow: SH(.2, [.62, .66, .76])})));
      fg.save(); fg.beginPath(); fg.roundRect(c[0] - w / 2, c[1] - h / 2, w, h, r); fg.clip();
      line(fg, COPY.cta, L.cta.c[0], L.cta.c[1] + 18, 50, 600, COLORS.white, {enter: eOut(prog(t, C.ctaText.t0, C.ctaText.land))});
      fg.restore();
    }
  }
  // ===== end card: logo, URL, badge =====
  if (t >= C.logoIn.t0) {
    const u = eOut(prog(t, C.logoIn.t0, C.logoIn.land));
    const lw = Math.round(img.logo.width * L.logo.scale), lh = Math.round(img.logo.height * L.logo.scale);
    const x = Math.round(L.logo.c[0] - lw / 2), y = Math.round(L.logo.c[1] - lh / 2);
    fg.save(); fg.beginPath(); fg.rect(x, y, lw, lh); fg.clip(); fg.imageSmoothingQuality = 'high';
    fg.drawImage(img.logo, x, y + Math.round((1 - u) * lh * .75), lw, lh); fg.restore();
  }
  if (t >= C.urlIn.t0) line(fg, COPY.url, CX, L.urlY, 52, 600, COLORS.navy, {enter: eOut(prog(t, C.urlIn.t0, C.urlIn.land))});
  if (t >= C.badgePop - .35) {
    const s = t >= C.finalStill - .1 ? 1 : spring(t, C.badgePop - .35, .36, .09);   // exactly at rest before the final hold
    const bw = L.badge.w, bh = Math.round(img.badge.height * bw / img.badge.width), cx = L.badge.cx, cy = L.badge.y + bh / 2;
    fg.save(); fg.imageSmoothingQuality = 'high';
    if (Math.abs(s - 1) < 1e-4) fg.drawImage(img.badge, Math.round(cx - bw / 2), L.badge.y, bw, bh);   // at rest: integer-placed, unscaled draw
    else { fg.translate(cx, cy); fg.scale(s, s); fg.drawImage(img.badge, -bw / 2, -bh / 2, bw, bh); }
    fg.restore();
  }

  // ===== cursor (world space: it scales with the zoom) =====
  const cur = cursorAt(t);
  if (cur) drawCursor(fg, cur);

  // ===== hud: captions + disclaimer (screen space, static) =====
  captions(hud, t);
  drawDisclaimer(hud, t);

  // ===== composite =====
  G.begin(cv.bg, cv.content);
  for (const op of ops) op();
  G.finish();
  const out = cv.out.getContext('2d', {willReadFrequently: true});
  out.drawImage(cv.gl, 0, 0); out.drawImage(cv.fg, 0, 0); out.drawImage(cv.top, 0, 0); out.drawImage(cv.hud, 0, 0);
  return cv.out;
}

function knobX(t) {
  if (t < C.drag.t0) return L.knobX[0];
  if (t >= C.drag.t1) return L.knobX[1];
  const cur = cursorAt(t);
  return clamp(cur ? cur.p[0] - 10 : L.knobX[1], L.knobX[0], L.knobX[1]);
}
function drawCheck(ctx, c, s) {
  ctx.save(); ctx.translate(c[0], c[1]); ctx.scale(s, s);
  ctx.strokeStyle = COLORS.navy; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-15, 1); ctx.lineTo(-4, 12); ctx.lineTo(16, -11); ctx.stroke(); ctx.restore();
}
function captions(ctx, t) {
  const c = CAPTIONS.find(c => t >= c.t0 && t < c.t1); if (!c) return;
  const enter = eOut(prog(t, c.t0, c.t0 + .28)), exit = eIn(prog(t, c.t1 - .16, c.t1));
  const lh = 56, yB = disc.y - 30;
  c.lines.forEach((s, i) => line(ctx, s, CX, yB - (c.lines.length - 1 - i) * lh, 44, 500, COLORS.navy, {enter, exit, exitDir: 1}));
}
function drawDisclaimer(ctx, t) {
  // End card only: rises out of its mask line once, then identical pixels on every frame to the end.
  // Drawn last, on the screen-space layer nothing else is drawn over.
  if (t < C.discIn.t0) return;
  const u = eOut(prog(t, C.discIn.t0, C.discIn.land));
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.beginPath(); ctx.rect(disc.x - 4, disc.y - 4, DISC.w + 8, disc.h + 8); ctx.clip();
  ctx.translate(0, Math.round((1 - u) * (disc.h + 12)));
  ctx.fillStyle = COLORS.navy; ctx.beginPath(); ctx.roundRect(disc.x, disc.y, DISC.w, disc.h, DISC.r); ctx.fill();
  setFont(ctx, DISC.size, 500); ctx.fillStyle = COLORS.white; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  disc.lines.forEach((s, i) => ctx.fillText(s, disc.x + DISC.pad, disc.y + DISC.pad + 2 + DISC.size * .92 + i * disc.lh));
  ctx.restore();
}
export const layers = () => ({bg: cv.bg, fg: cv.fg, top: cv.top, hud: cv.hud, out: cv.out});
export const info = () => ({disc, L: {...L}, COPY});
