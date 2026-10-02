// The v5 background light: a few large, very soft teal/blue pools (#14A3B8, #0071FE) drifting on the gradient.
// Shared by the 2D film (src/v5/scene.mjs) and the 3D hook's printed tabletop (src/v5/opening3d.mjs), so the
// match-cut at 3.0 s has the same light in the same place. Screen coordinates (1080 x 1920).
const clamp = (v, a = 0, z = 1) => Math.min(z, Math.max(a, v));
const lerp = (a, z, t) => a + (z - a) * t;
const eIO = u => u < .5 ? 4 * u ** 3 : 1 - (-2 * u + 2) ** 3 / 2;
export const GRID = {step: 60, x0: 30, y0: 40};     // lines through the hook pill's centre (510, 820), 60 px = 0.12 m
export const BLOBS = [   // [x, y, r, color, alpha]: big radii + gaussian falloff, so they read as light, not spots
  {t: 0,     b: [[900, 520, 640, 'teal', .17], [120, 1240, 620, 'blue', .14], [980, 1500, 520, 'teal', .10]]},
  {t: 7.0,   b: [[940, 360, 620, 'teal', .16], [100, 900, 640, 'blue', .15], [900, 1420, 540, 'teal', .10]]},
  {t: 14.0,  b: [[980, 300, 600, 'teal', .16], [80, 880, 620, 'blue', .14], [960, 1300, 520, 'teal', .10]]},
  {t: 17.6,  b: [[900, 600, 620, 'teal', .16], [140, 1140, 620, 'blue', .14], [960, 1500, 520, 'teal', .09]]},
  {t: 23.4,  b: [[1000, 1000, 640, 'blue', .12], [90, 760, 600, 'teal', .12], [1000, 260, 520, 'teal', .08]]},
];
export function blobsAt(t, tStill = 1e9) {
  let i = 0; while (i < BLOBS.length - 1 && t >= BLOBS[i + 1].t) i++;
  let set = BLOBS[i].b;
  if (i < BLOBS.length - 1) { const nx = BLOBS[i + 1], m = eIO(clamp((t - (nx.t - .9)) / .9)); if (m > 0) set = set.map((bb, j) => bb.map((v, q) => typeof v === 'number' ? lerp(v, nx.b[j][q], m) : v)); }
  const td = Math.min(t, tStill);
  return set.map(([x, y, r, c, a], j) => [x + 40 * Math.sin(td * .45 + j * 2.1), y + 30 * Math.cos(td * .35 + j * 1.3), r, c, a]);
}
// gaussian falloff in 12 stops (a 2-3 stop radial gradient shows rings and blotches once encoded)
export function drawBlobs(ctx, blobs) {
  for (const [x, y, r, c, a] of blobs) {
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r), col = c === 'teal' ? '20,163,184' : '0,113,254';
    for (let k = 0; k <= 11; k++) { const u = k / 11; rg.addColorStop(u, `rgba(${col},${(a * Math.exp(-3.6 * u * u) * (1 - u ** 6)).toFixed(4)})`); }
    ctx.fillStyle = rg; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
}
export function drawGradient(ctx, x0 = 0, x1 = 1080) {
  const g = ctx.createLinearGradient(0, 0, 0, 1920); g.addColorStop(0, '#F7F7F7'); g.addColorStop(.55, '#F7F7F7'); g.addColorStop(1, '#EEF3FA');
  ctx.fillStyle = g; ctx.fillRect(x0, -6000, x1 - x0, 14000);
}
// static zero-mean noise, drawn with 'overlay': it dithers the soft light (no banding once encoded) without shifting the
// average level, so the flat #F7F7F7 logo/badge files still sit on exactly their own background
export function makeDither(doc, w, h) {
  const c = doc.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'), d = x.createImageData(w, h);
  let s = 99991; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < d.data.length; i += 4) { const v = 128 + Math.round((rnd() - rnd()) * 14); d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  x.putImageData(d, 0, 0); return c;
}
