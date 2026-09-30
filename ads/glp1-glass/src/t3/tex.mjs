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

// ---------- 3D value noise (for textures that tile along z: z is sampled on a circle) ----------
function h3(x, y, z, s) { let h = (x * 374761393 + y * 668265263 + z * 1440662683 + s * 144665) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function noise3(x, y, z, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const L = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => h3(xi + dx, yi + dy, zi + dz, s);
  return L(L(L(c(0, 0, 0), c(1, 0, 0), u), L(c(0, 1, 0), c(1, 1, 0), u), v), L(L(c(0, 0, 1), c(1, 0, 1), u), L(c(0, 1, 1), c(1, 1, 1), u), v), w);
}

// ---------- whitewashed oak: `planks` boards across x, grain along z; tiles in x (at a seam) and in z ----------
// Irregular grain: ring density and line darkness vary per line, long low waves along the board, fine fibres and pores.
// Returns two canvases: colour and roughness. Slow (generated once by tools/gen-wood.mjs into assets/table/).
export function oakCanvases({W = 4096, H = 8192, sx = 2.8, sz = 5.6, planks = 2} = {}) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const cr = document.createElement('canvas'); cr.width = W / 2; cr.height = H / 2;
  const x2 = c.getContext('2d'), img = x2.createImageData(W, H), d = img.data;
  const rimg = cr.getContext('2d').createImageData(W / 2, H / 2), rd = rimg.data;
  const pw = W / planks, bw = sx / planks;
  const early = [232, 225, 213], late = [194, 180, 159], pore = [146, 134, 114];
  const TWO = Math.PI * 2;
  for (let y = 0; y < H; y++) {
    const ang = y / H * TWO, co = Math.cos(ang), si = Math.sin(ang);
    const Z = f => [co * f * sz / TWO, si * f * sz / TWO];     // circle radius for f cycles per metre along z
    const [a1, b1] = Z(.35), [a2, b2] = Z(1.2), [a3, b3] = Z(4), [a4, b4] = Z(40), [a5, b5] = Z(160);
    for (let x = 0; x < W; x++) {
      const p = Math.floor(x / pw), lx = (x - p * pw) / pw * bw, seed = p * 31 + 7;
      // long gentle waves + a little local wander (the grain stays mostly straight)
      const warp = .045 * (noise3(lx * 1.1, a1, b1, seed) - .5) + .016 * (noise3(lx * 3, a2, b2, seed + 1) - .5) + .003 * (noise3(lx * 18, a3, b3, seed + 2) - .5);
      const dens = 58 * (.75 + .5 * noise3(lx * 2.2, a1, b1, seed + 3));             // lines per metre, varying across the board
      // flat-sawn figure: where the board cut near the pith, rings arch into cathedrals (the arch depth wanders along z)
      const xc = bw * (.3 + .4 * noise3(p * 3.1, a1, b1, seed + 11)), dep = .04 + .22 * noise3(p * 1.7 + .5, a2 * .6, b2 * .6, seed + 12);
      const arch = Math.hypot(lx + warp - xc, dep), aw = smooth(.35, .75, noise3(lx * .8, a1, b1, seed + 13));
      const ring = ((lx + warp) * (1 - aw) + arch * aw) * dens + 1.5 * noise3(lx * .9, a2, b2, seed + 4);
      const ri = Math.floor(ring), f = ring - ri;
      const str = .25 + .75 * h3(ri, p, 0, seed + 5) ** 1.6;                           // each line its own darkness
      const lw = str * smooth(.5, .93, f) ** 1.4 * (1 - smooth(.93, 1, f));
      const fib = noise3(lx * 1300, a4, b4, seed + 6), pn = noise3(lx * 900, a5, b5, seed + 7);
      const pores = smooth(.8, .97, pn) * (.3 + .7 * lw);
      const tone = .955 + .07 * (noise3(lx * 1.6, a2, b2, seed + 8) - .5) + .025 * (fib - .5);
      const i = (y * W + x) * 4;
      for (let k = 0; k < 3; k++) { let v = early[k] + (late[k] - early[k]) * lw * .8; v += (pore[k] - v) * pores * .5; d[i + k] = clamp(v * tone, 0, 255); }
      const edge = Math.min(x - p * pw, (p + 1) * pw - x);                              // plank seam (a fine dark joint)
      if (edge < 2.5) { const s = edge < 1.2 ? .70 : .85; d[i] *= s; d[i + 1] *= s; d[i + 2] *= s; }
      d[i + 3] = 255;
      if (!(x & 1) && !(y & 1)) { const j = ((y >> 1) * (W >> 1) + (x >> 1)) * 4, rv = 140 + 60 * lw + 70 * pores + 20 * (fib - .5); rd[j] = rd[j + 1] = rd[j + 2] = clamp(rv, 0, 255); rd[j + 3] = 255; }
    }
  }
  x2.putImageData(img, 0, 0); cr.getContext('2d').putImageData(rimg, 0, 0);
  return {color: c, rough: cr};
}
export async function oak({sx = 2.8, sz = 5.6} = {}) {   // the pre-generated oak (tools/gen-wood.mjs)
  const load = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const [ci, ri] = await Promise.all([load('../../assets/table/oak_color.jpg'), load('../../assets/table/oak_rough.jpg')]);
  const map = new THREE.Texture(ci), rough = new THREE.Texture(ri);
  for (const t of [map, rough]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 16; t.needsUpdate = true; }
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
