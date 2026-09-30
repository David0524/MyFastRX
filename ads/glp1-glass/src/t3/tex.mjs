// Procedural textures for the table film: whitewashed oak, paper, kraft card, twine; plus text helpers for printed cards.
import * as THREE from 'three';

export const NAVY = '#001D45', BLUE = '#0071FE', TEAL = '#14A3B8';
const clamp = (v, a = 0, z = 1) => Math.min(z, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// ---------- value noise (deterministic) ----------
function hash(x, y, s) { let h = (x * 374761393 + y * 668265263 + s * 144665) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
export function noise(x, y, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x, y, s, o = 3) => { let v = 0, a = .5, f = 1; for (let i = 0; i < o; i++) { v += a * noise(x * f, y * f, s + i * 17); a *= .5; f *= 2.03; } return v; };

// ---------- whitewashed flat-sawn oak: 2 planks across x, grain along z; tileable along z ----------
// returns {map, rough, bump, size: [sx, sz]} in metres (world units)
export function oak({px = 4096, sx = 2.8, sz = 2.8} = {}) {
  const W = px, H = px, c = document.createElement('canvas'); c.width = W; c.height = H;
  const cr = document.createElement('canvas'); cr.width = W / 2; cr.height = H / 2;
  const x2 = c.getContext('2d'), img = x2.createImageData(W, H), d = img.data;
  const rimg = cr.getContext('2d').createImageData(W / 2, H / 2), rd = rimg.data;
  const planks = 2, pw = W / planks;
  const early = [232, 226, 215], late = [196, 184, 164], pore = [170, 157, 136];
  for (let y = 0; y < H; y++) {
    const zv = y / H * sz;                                          // metres along the grain
    const ang = zv / sz * Math.PI * 2, cz = Math.cos(ang) * 1.6, sz2 = Math.sin(ang) * 1.6;   // tileable along z: noise sampled on a circle
    // per plank: the log's pith sits under the board and its depth wanders along z -> cathedral arches
    const rowP = [];
    for (let p = 0; p < planks; p++) { const seed = p * 31 + 7; rowP.push({seed, depth: .10 + .09 * fbm(cz + p * 5, sz2, seed, 2), xc: .70 + .28 * (fbm(cz * .7 + 3, sz2 * .7, seed + 3, 2) - .5)}); }
    for (let x = 0; x < W; x++) {
      const p = Math.floor(x / pw), lx = (x - p * pw) / pw * (sx / planks), {seed, depth, xc} = rowP[p];
      const warp = .018 * (fbm(lx * 9, cz * 3 + sz2 * 3, seed + 5, 2) - .5);
      const r = Math.hypot(lx - xc + warp, depth);
      const ring = r / .026 + .9 * fbm(lx * 3, cz + sz2, seed + 9, 2);
      const f = ring - Math.floor(ring);
      const lw = smooth(.62, .86, f) * (1 - smooth(.9, 1, f));     // latewood band
      // fine pores: short dark streaks stretched along the grain
      const pn = noise(lx * 520, (cz + sz2) * 18 + zv * 38, seed + 21);
      const pores = smooth(.78, .95, pn) * (.35 + .65 * lw);
      const tone = .92 + .08 * noise(lx * 1.5, cz * .8 + sz2 * .8, seed + 13);
      const i = (y * W + x) * 4;
      for (let k = 0; k < 3; k++) {
        let v = early[k] + (late[k] - early[k]) * lw * .8;
        v = v + (pore[k] - v) * pores * .55;
        d[i + k] = clamp(v * tone, 0, 255);
      }
      const edge = Math.min(x - p * pw, (p + 1) * pw - x);          // plank seam
      if (edge < 3) { const s = edge < 1.5 ? .72 : .86; d[i] *= s; d[i + 1] *= s; d[i + 2] *= s; }
      d[i + 3] = 255;
      if (!(x & 1) && !(y & 1)) { const j = ((y >> 1) * (W >> 1) + (x >> 1)) * 4, rv = 150 + 70 * lw + 60 * pores; rd[j] = rd[j + 1] = rd[j + 2] = rv; rd[j + 3] = 255; }
    }
  }
  x2.putImageData(img, 0, 0); cr.getContext('2d').putImageData(rimg, 0, 0);
  const map = new THREE.CanvasTexture(c), rough = new THREE.CanvasTexture(cr);
  for (const t of [map, rough]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 16; }
  map.colorSpace = THREE.SRGBColorSpace;
  return {map, rough, size: [sx, sz]};
}

// ---------- paper ----------
export function paperCanvas(w, h, {color = '#FBFAF7', fibers = true, ruled = null} = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  x.fillStyle = color; x.fillRect(0, 0, w, h);
  if (fibers) {
    const img = x.getImageData(0, 0, w, h), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const p = i / 4, px = p % w, py = (p / w) | 0; const n = (noise(px * .35, py * .35, 3) - .5) * 5 + (noise(px * .05, py * .05, 5) - .5) * 4; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    x.putImageData(img, 0, 0);
  }
  if (ruled) {   // {top, step, color, margin}
    x.strokeStyle = ruled.color || 'rgba(0,113,254,0.16)'; x.lineWidth = ruled.width || 2;
    for (let y = ruled.top; y < h - 10; y += ruled.step) { x.beginPath(); x.moveTo(0, y); x.lineTo(w, y); x.stroke(); }
    if (ruled.margin) { x.strokeStyle = 'rgba(220,70,90,0.22)'; x.beginPath(); x.moveTo(ruled.margin, 0); x.lineTo(ruled.margin, h); x.stroke(); }
  }
  return c;
}
export function kraftCanvas(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  const img = x.createImageData(w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const p = i / 4, px = p % w, py = (p / w) | 0; const n = (fbm(px * .02, py * .02, 11, 3) - .5) * 22 + (noise(px * .6, py * .6, 13) - .5) * 10; d[i] = 196 + n; d[i + 1] = 160 + n * .9; d[i + 2] = 118 + n * .7; d[i + 3] = 255; }
  x.putImageData(img, 0, 0);
  return c;
}
export function twineTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 512; const x = c.getContext('2d');
  x.fillStyle = '#C9A77C'; x.fillRect(0, 0, 64, 512);
  for (let i = -8; i < 40; i++) { x.strokeStyle = i % 2 ? 'rgba(120,88,52,0.55)' : 'rgba(236,214,180,0.6)'; x.lineWidth = 5; x.beginPath(); x.moveTo(0, i * 16); x.lineTo(64, i * 16 + 40); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function softDisc(stops, size = 256) {   // radial gradient texture; stops: [[pos, 'rgba()'], ...]
  const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d');
  const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2); for (const [p, col] of stops) g.addColorStop(p, col);
  x.fillStyle = g; x.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------- text ----------
export function setFont(ctx, px, wt, fam = 'G') { ctx.font = `${wt} ${px}px ${fam === 'G' ? 'G' + wt : fam}`; ctx.letterSpacing = fam === 'G' && px >= 64 ? `${(-0.022 * px).toFixed(2)}px` : '0px'; }
// a line of text that rises out of a mask line under its baseline (enter 0 -> 1); no opacity changes
export function maskLine(ctx, s, x, y, px, wt, color, {align = 'center', enter = 1, exit = 0} = {}) {
  if (enter <= 0 || exit >= 1) return;
  ctx.save(); ctx.beginPath(); ctx.rect(-4000, y - px * 1.02, 9000, px * 1.32); ctx.clip();
  setFont(ctx, px, wt); ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  ctx.fillText(s, x, y + (1 - enter) * px * 1.25 + exit * px * 1.3); ctx.restore();
}
