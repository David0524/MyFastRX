// UGC pitch sample - static ad A, "Without the strings." (Meta / Instagram feed, 1080 x 1350). The brand line leads;
// "No subscription" is one of the proof points (it is also tested as a hook on its own).
// An editorial still in an earthier key than the films: the brand navy as a deep wall, a warm sand floor, late light
// from the right. The client's vial (images/vial_semaglutide.png, label pixel-exact via the glass engine's photo-vial
// pass; its clear glass shows this backdrop) stands on the floor; never a real-life setting. Type is Geist.
// Copy is only what the site and the client have cleared: the brand line, no subscription / membership fees / automatic
// refills, free express shipping, "Starting at $69" with the qualification directly beneath, the approved disclaimer verbatim.
import * as TL from './timeline.mjs';
import {createGlass} from '../../glass.mjs';
import {makeDither} from '../../v7/backdrop.mjs';

const {W, H} = TL;
export const C = {navy: '#001D45', navyDeep: '#00142F', sand: '#E6D9C6', sandDeep: '#CDBBA2', clay: '#B8714F', cream: '#F6F0E6', blue: '#0071FE'};
export const COPY = {
  head: ['Without', 'the strings.'],
  sub: ['GLP-1 care you request', "when you're ready."],
  checks: ['No subscription', 'No membership fees', 'No automatic refills', 'Free express shipping'],
  startingAt: 'Starting at', price: '$69', qual: 'Introductory offer. Regular pricing varies by plan.',
  cta: 'See if you qualify',
  disclaimer: 'Compounded medication. Not FDA-approved. Results may vary. Not all patients qualify. Prescription issued only if medically appropriate following provider review. MyFastRx does not manufacture medications; product appearance and labeling may vary. Actor portrayal.',
};
const X = 76;                                   // the type's left edge
export const L = {
  floorY: 905,                                  // where the navy wall meets the sand floor (a soft horizon, no edge)
  vial: {cx: 826, base: 1040, s: .52},
  mark: {x: X, y: 76, h: 34, pad: [20, 11], r: 20},
  headY: [300, 418], headPx: 124,
  subY: [500, 546], subPx: 34,
  checkY: [636, 692, 748, 804], checkPx: 32,
  priceY: {start: 1010, price: 1128, qual: 1176}, pricePx: 128,
  cta: {x1: 1004, cy: 1112, h: 76},
  disc: {y0: 1222, size: 19, lh: 1.27, w: 928},
};

let cv, G, img = {}, VM = null;
const mk = (w = W, h = H) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
function setFont(ctx, px, wt) { ctx.font = `${wt} ${px}px G${wt}`; ctx.letterSpacing = px >= 64 ? `${(-0.03 * px).toFixed(2)}px` : `${(-0.005 * px).toFixed(2)}px`; }
function wrap(ctx, s, px, wt, maxW) { setFont(ctx, px, wt); const out = []; let cur = ''; for (const w of s.split(' ')) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width <= maxW) cur = t; else { out.push(cur); cur = w; } } if (cur) out.push(cur); return out; }

export async function init() {
  for (const [wt, f] of [[500, 'Medium'], [600, 'SemiBold'], [700, 'Bold']]) { const ff = new FontFace('G' + wt, `url(../../../assets/fonts/Geist-${f}.ttf)`, {weight: String(wt)}); await ff.load(); document.fonts.add(ff); }
  const load = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  img.logo = await load('../../../images/logo_myfastrx_official.jpg');
  cv = {bg: mk(), content: mk(), gl: mk(), out: mk(), dither: makeDither(document, W, H)};
  cv.out.getContext('2d', {willReadFrequently: true});
  G = createGlass(cv.gl);
  VM = await (await fetch('../../../assets/vial/vial_meta.json')).json();
  const raw = async u => new Uint8Array(await (await fetch(u)).arrayBuffer());
  G.setVial(await raw('../../../assets/vial/vial_color_full.rgba'), await raw('../../../assets/vial/vial_mask_full.rgba'), VM.full.w, VM.full.h);
  return {W, H, L};
}
export const frameMeta = () => null;

function radial(ctx, x, y, r, rgb, a, sy = 1) {   // gaussian light pool (12 stops: no rings once encoded)
  ctx.save(); ctx.translate(x, y); ctx.scale(1, sy);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  for (let k = 0; k <= 11; k++) { const u = k / 11; g.addColorStop(u, `rgba(${rgb},${(a * Math.exp(-3.6 * u * u) * (1 - u ** 6)).toFixed(4)})`); }
  ctx.fillStyle = g; ctx.fillRect(-r, -r, 2 * r, 2 * r); ctx.restore();
}

function backdrop(b) {
  // the wall: brand navy, deepening toward the top-left, warmed by the light on the right
  const g = b.createLinearGradient(0, 0, W * .35, L.floorY); g.addColorStop(0, C.navyDeep); g.addColorStop(1, C.navy);
  b.fillStyle = g; b.fillRect(0, 0, W, H);
  radial(b, 930, 640, 720, '201,140,96', .26);                       // late, warm light behind the vial
  radial(b, 1060, 300, 520, '232,196,150', .10);
  // the floor: sand, lit from the right, its far edge dissolving into the wall (a seamless sweep, no table edge)
  const f = b.createLinearGradient(0, L.floorY - 110, 0, H);   // navy -> warm clay dusk -> sand (no grey band where they meet)
  f.addColorStop(0, 'rgba(150,96,66,0)'); f.addColorStop(.12, 'rgba(150,96,66,0.55)'); f.addColorStop(.22, 'rgba(214,190,160,1)'); f.addColorStop(.32, C.sand); f.addColorStop(1, C.sandDeep);
  b.fillStyle = f; b.fillRect(0, L.floorY - 110, W, H);
  const fl = b.createLinearGradient(0, 0, W, 0); fl.addColorStop(0, 'rgba(120,86,60,0.10)'); fl.addColorStop(.6, 'rgba(255,240,220,0)'); fl.addColorStop(1, 'rgba(255,236,210,0.16)');
  b.fillStyle = fl; b.fillRect(0, L.floorY - 20, W, H);
  // the vial's long shadow, thrown left by the light on the right
  const v = L.vial, w = VM.full.w * v.s;
  b.save(); b.translate(v.cx - 8, v.base + 2); b.transform(1, 0, -1.9, .16, 0, 0);
  const sg = b.createLinearGradient(0, 0, 0, -VM.full.h * v.s); sg.addColorStop(0, 'rgba(92,62,40,0.34)'); sg.addColorStop(1, 'rgba(92,62,40,0)');
  b.filter = 'blur(6px)'; b.fillStyle = sg; b.beginPath(); b.roundRect(-w * .42, -VM.full.h * v.s, w * .84, VM.full.h * v.s, 30); b.fill(); b.restore();
  radial(b, v.cx - 6, v.base + 2, w * .62, '70,46,30', .34, .14);   // contact shadow
  b.save(); b.globalCompositeOperation = 'overlay'; b.globalAlpha = .9; b.drawImage(cv.dither, 0, 0); b.restore();   // grain
}

function markChip(o) {   // the official file, cropped to the wordmark (pixels untouched), on its own cream chip
  const M = L.mark, src = [136, 141, 1278, 261], lw = M.h * src[2] / src[3], w = lw + 2 * M.pad[0], h = M.h + 2 * M.pad[1];
  o.save(); o.fillStyle = '#F7F7F7'; o.beginPath(); o.roundRect(M.x, M.y, w, h, M.r); o.fill();
  o.imageSmoothingQuality = 'high'; o.drawImage(img.logo, ...src, M.x + M.pad[0], M.y + M.pad[1], lw, M.h); o.restore();
}

function text(o, s, x, y, px, wt, color, align = 'left') { setFont(o, px, wt); o.fillStyle = color; o.textAlign = align; o.textBaseline = 'alphabetic'; o.fillText(s, x, y); }

function check(o, x, y, px) {   // a clay disc with a cream tick
  const r = px * .46, cx = x + r, cy = y - px * .34;
  o.save(); o.fillStyle = C.clay; o.beginPath(); o.arc(cx, cy, r, 0, 2 * Math.PI); o.fill();
  o.strokeStyle = C.cream; o.lineWidth = px * .1; o.lineCap = 'round'; o.lineJoin = 'round';
  o.beginPath(); o.moveTo(cx - r * .42, cy + r * .02); o.lineTo(cx - r * .1, cy + r * .34); o.lineTo(cx + r * .46, cy - r * .3); o.stroke(); o.restore();
  return 2 * r + px * .45;
}

export async function render() {
  const b = cv.bg.getContext('2d'); b.setTransform(1, 0, 0, 1, 0, 0); backdrop(b);
  const cc = cv.content.getContext('2d'); cc.clearRect(0, 0, W, H);
  G.begin(cv.bg, cv.content);
  const v = L.vial;
  G.vial({pos: [v.cx - VM.full.w / 2, v.base - VM.full.h], scale: v.s, rot: 0, specU: .38, floorY: v.base, reflA: .55, refr: 12});
  G.finish();
  const o = cv.out.getContext('2d'); o.setTransform(1, 0, 0, 1, 0, 0); o.drawImage(cv.gl, 0, 0);

  markChip(o);
  COPY.head.forEach((s, i) => text(o, s, X - 6, L.headY[i], L.headPx, 700, C.cream));
  COPY.sub.forEach((q, i) => text(o, q, X, L.subY[i], L.subPx, 500, 'rgba(246,240,230,0.82)'));
  COPY.checks.forEach((s, i) => { const dx = check(o, X, L.checkY[i], L.checkPx); text(o, s, X + dx, L.checkY[i], L.checkPx, 600, C.cream); });

  // the price, on the floor, with its qualification directly beneath
  text(o, COPY.startingAt, X, L.priceY.start, 36, 600, C.navy);
  text(o, COPY.price, X - 6, L.priceY.price, L.pricePx, 700, C.navy);
  text(o, COPY.qual, X, L.priceY.qual, 30, 500, C.navy);

  // CTA pill (navy on sand), right-aligned under the vial
  setFont(o, 34, 600); const tw = o.measureText(COPY.cta + '  →').width, Q = L.cta, pw = tw + 64, x0 = Q.x1 - pw;
  o.save(); o.fillStyle = C.navy; o.beginPath(); o.roundRect(x0, Q.cy - Q.h / 2, pw, Q.h, Q.h / 2); o.fill(); o.restore();
  text(o, COPY.cta + '  →', x0 + 32, Q.cy + 12, 34, 600, C.cream);

  // the approved disclaimer, verbatim, as fine print on the floor
  const D = L.disc, lines = wrap(o, COPY.disclaimer, D.size, 500, D.w), lh = Math.round(D.size * D.lh);
  lines.forEach((s, i) => text(o, s, X, D.y0 + D.size + i * lh, D.size, 500, 'rgba(0,29,69,0.78)'));
  return cv.out;
}
