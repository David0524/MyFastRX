// Build the vial's render assets from images/vial_semaglutide.png WITHOUT touching its pixels:
//   assets/vial/vial_color_half.rgba  - the source cropped to the vial, then 2x2 box-averaged (exact half size). Pixels only resampled, never edited.
//   assets/vial/vial_mask_half.rgba   - R silhouette alpha, G clear-glass weight (0 on cap, crimp and label), B/A surface normal x/y (0.5 = flat)
//   assets/vial/vial_meta.json        - sizes and the source rows used for each zone
import {load} from './raw.mjs';
import {writeFileSync, mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const src = load('images/vial_semaglutide.png');
const {w, data} = src;
const px = (x, y) => { const i = (y * w + x) * 4; return [data[i], data[i + 1], data[i + 2]]; };
// Crop (even numbers so the half-size map is exact). Source rows: cap top ~236, crimp ends ~414, label 662-1072, glass base ends ~1164.
const X0 = 280, X1 = 740, Y0 = 232, Y1 = 1166;         // crop box in source pixels
const CW = X1 - X0, CH = Y1 - Y0;
const ZONES = {capEnd: 415, labelTop: 661, labelBot: 1073, baseEnd: 1164};
// Per-row silhouette edges: first/last column that differs from the row's backdrop.
const hwRaw = [];
let cxs = [];
for (let y = Y0; y < Y1; y++) {
  const bl = px(40, y), br = px(w - 40, y), bg = bl.map((v, i) => (v + br[i]) / 2);
  let L = -1, R = -1;
  for (let x = X0 - 10; x < X1 + 10; x++) {
    const p = px(x, y); const d = Math.abs(p[0] - bg[0]) + Math.abs(p[1] - bg[1]) + Math.abs(p[2] - bg[2]);
    if (d > 18) { if (L < 0) L = x; R = x; }
  }
  hwRaw.push(L < 0 ? 0 : (R - L + 1) / 2);
  if (L >= 0 && y > 300 && y < 1140) cxs.push((L + R + 1) / 2);
}
cxs.sort((a, b) => a - b);
const CX = cxs[cxs.length >> 1];
// Median-smooth the half widths over +-3 rows.
const hw = hwRaw.map((_, i) => { const a = hwRaw.slice(Math.max(0, i - 3), i + 4).sort((p, q) => p - q); return a[a.length >> 1]; });
for (let y = ZONES.baseEnd; y < Y1; y++) hw[y - Y0] = 0;       // below the glass base is floor, not vial
const report = [236, 240, 250, 260, 300, 414, 420, 500, 560, 700, 1100, 1140, 1150, 1156, 1160, 1163].map(y => `${y}:${hw[y - Y0]?.toFixed(1)}`);
console.log('CX', CX, 'hw', report.join(' '));
// Full-res mask, then 2x2 average.
const smooth = (e0, e1, v) => { const t = Math.min(1, Math.max(0, (v - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
const full = new Float32Array(CW * CH * 4);
for (let j = 0; j < CH; j++) {
  const y = Y0 + j, h = hw[j];
  const dh = (hw[Math.min(CH - 1, j + 4)] - hw[Math.max(0, j - 4)]) / 8;   // slope of the profile (shoulder/neck)
  // clear glass: neck + shoulder + upper body above the label, and the base below it
  const g = y < ZONES.capEnd ? 0 : y < ZONES.labelTop ? smooth(ZONES.capEnd, ZONES.capEnd + 3, y) * (1 - smooth(ZONES.labelTop - 3, ZONES.labelTop, y))
          : y <= ZONES.labelBot ? 0 : smooth(ZONES.labelBot, ZONES.labelBot + 3, y);
  // round off the bottom corners of the base a little (the photo's base is rounded)
  for (let i = 0; i < CW; i++) {
    const x = X0 + i + 0.5, u = h > 0 ? (x - CX) / h : 0;
    let a = Math.min(1, Math.max(0, h - Math.abs(x - CX) + 0.5));
    const k = (j * CW + i) * 4;
    const nx = Math.max(-1, Math.min(1, u));
    const ny = Math.max(-1, Math.min(1, -dh * 1.2 * Math.abs(nx)));
    full[k] = a; full[k + 1] = g * a; full[k + 2] = nx; full[k + 3] = ny;
  }
}
const HW = CW / 2, HH = CH / 2;
const color = Buffer.alloc(HW * HH * 4), mask = Buffer.alloc(HW * HH * 4);
for (let j = 0; j < HH; j++) for (let i = 0; i < HW; i++) {
  const o = (j * HW + i) * 4; const acc = [0, 0, 0, 0], m = [0, 0, 0, 0];
  for (const [di, dj] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
    const sx = X0 + 2 * i + di, sy = Y0 + 2 * j + dj; const s = (sy * w + sx) * 4;
    for (let c = 0; c < 3; c++) acc[c] += data[s + c];
    const f = ((2 * j + dj) * CW + 2 * i + di) * 4;
    for (let c = 0; c < 4; c++) m[c] += full[f + c];
  }
  for (let c = 0; c < 3; c++) color[o + c] = Math.round(acc[c] / 4);
  color[o + 3] = 255;
  mask[o] = Math.round(m[0] / 4 * 255); mask[o + 1] = Math.round(m[1] / 4 * 255);
  mask[o + 2] = Math.round((m[2] / 4 * 0.5 + 0.5) * 255); mask[o + 3] = Math.round((m[3] / 4 * 0.5 + 0.5) * 255);
}
mkdirSync('assets/vial', {recursive: true});
writeFileSync('assets/vial/vial_color_half.rgba', color);
writeFileSync('assets/vial/vial_mask_half.rgba', mask);
const meta = {source: 'images/vial_semaglutide.png', crop: {x0: X0, y0: Y0, x1: X1, y1: Y1}, half: {w: HW, h: HH}, centerX_src: CX,
  zones_src_rows: ZONES, zones_half_rows: Object.fromEntries(Object.entries(ZONES).map(([k, v]) => [k, (v - Y0) / 2])),
  srcBackdrop: [238, 242, 245], note: 'color = 2x2 box average of the source crop; no pixel edited. mask/normals derived from the silhouette.'};
writeFileSync('assets/vial/vial_meta.json', JSON.stringify(meta, null, 2));
// Previews for a human check
for (const [n, b, f] of [['color', color, 'rgba'], ['mask', mask, 'rgba']])
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', f, '-s', `${HW}x${HH}`, '-i', '-', ...(n === 'mask' ? ['-vf', 'format=rgb24'] : []), `assets/vial/preview_${n}.png`], {input: b});
console.log('half size', HW, HH);
