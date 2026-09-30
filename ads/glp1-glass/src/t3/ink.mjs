// Doctor's scrawl -> clean type. A scrawl (Homemade Apple, squashed, slanted, jittered word by word) writes itself
// behind a moving pen; then every ink pixel of it flows, as a particle, to a pixel of the typeset target, left to right
// in a wave, and the particles settle into the crisp text. Deterministic (seeded), drawn into a 2D canvas each frame.
import {setFont} from './tex.mjs';

const clamp = (v, a = 0, z = 1) => Math.min(z, Math.max(a, v));
const eIO = u => u < .5 ? 4 * u ** 3 : 1 - (-2 * u + 2) ** 3 / 2;
const eOut = u => 1 - (1 - u) ** 3;
let seed = 7; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

function sample(canvas, step) {
  const x = canvas.getContext('2d', {willReadFrequently: true}), {width: w, height: h} = canvas, d = x.getImageData(0, 0, w, h).data, pts = [];
  for (let y = 0; y < h; y += step) for (let i = 0; i < w; i += step) if (d[(y * w + i) * 4 + 3] > 110) pts.push([i, y]);
  return pts;
}
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

// w, h: the ink canvas (canvas px). scrawl: [{s, x, y, px}] (left edge x, baseline y). target: [{s, x, y, px, wt, align}]
export function makeInk({w, h, scrawl, target, color = '#001D45', inkColor = '#1C2A4A', seedN = 7, step = 2}) {
  seed = seedN;
  const sc = mk(w, h), sx = sc.getContext('2d');
  sx.fillStyle = inkColor; sx.textBaseline = 'alphabetic';
  const bounds = [];
  for (const L of scrawl) {           // write word by word: each word squashed, slanted and shifted a little differently
    let x = L.x; const words = L.s.split(' ');
    for (const wd of words) {
      const sq = .78 + rnd() * .3, rot = (rnd() - .5) * .10, dy = (rnd() - .5) * L.px * .18, sk = -.18 - rnd() * .16;
      sx.save(); sx.translate(x, L.y + dy); sx.rotate(rot); sx.transform(sq, 0, sk, 1, 0, 0);
      sx.font = `${L.px}px HA`; sx.fillText(wd, 0, 0); const ww = sx.measureText(wd).width * sq; sx.restore();
      bounds.push([x, x + ww, L.y]); x += ww + L.px * (.28 + rnd() * .2);
    }
    // the doctor's closing flourish: a fast underline swoosh
    if (L.flourish) { sx.save(); sx.strokeStyle = inkColor; sx.lineWidth = L.px * .07; sx.lineCap = 'round'; sx.beginPath(); sx.moveTo(L.x, L.y + L.px * .32); sx.bezierCurveTo(L.x + (x - L.x) * .3, L.y + L.px * .5, L.x + (x - L.x) * .7, L.y + L.px * .12, x, L.y + L.px * .26); sx.stroke(); sx.restore(); }
  }
  const tc = mk(w, h), tx = tc.getContext('2d');
  tx.fillStyle = color; tx.textBaseline = 'alphabetic';
  for (const T of target) { setFont(tx, T.px, T.wt || 700); tx.textAlign = T.align || 'center'; tx.fillText(T.s, T.x, T.y); }
  // particles: both pixel sets in reading order (by line band, then x), resampled to the same count
  const S = sample(sc, step), Tp = sample(tc, step);
  const lineOf = (y, list) => { let b = 0, bd = 1e9; list.forEach((l, i) => { const dd = Math.abs(y - l); if (dd < bd) { bd = dd; b = i; } }); return b; };
  const sLines = scrawl.map(l => l.y - l.px * .3), tLines = target.map(t => t.y - t.px * .35);
  const key = (p, lines) => lineOf(p[1], lines) * 1e5 + p[0] + p[1] * .02;
  S.sort((a, b) => key(a, sLines) - key(b, sLines)); Tp.sort((a, b) => key(a, tLines) - key(b, tLines));
  const N = Math.min(14000, Math.max(S.length, Tp.length));
  const P = new Float32Array(N * 6);   // sx, sy, tx, ty, delay, curl
  const tx0 = Math.min(...Tp.map(p => p[0])), tx1 = Math.max(...Tp.map(p => p[0]));
  for (let i = 0; i < N; i++) {
    const s = S[Math.floor(i * S.length / N)], t = Tp[Math.floor(i * Tp.length / N)];
    P[i * 6] = s[0]; P[i * 6 + 1] = s[1]; P[i * 6 + 2] = t[0]; P[i * 6 + 3] = t[1];
    P[i * 6 + 4] = (t[0] - tx0) / Math.max(1, tx1 - tx0) * .45 + rnd() * .08;
    P[i * 6 + 5] = (rnd() - .5) * 60;
  }
  const minX = Math.min(...bounds.map(b => b[0])), maxX = Math.max(...bounds.map(b => b[1]));
  return {
    // write: [t0, t1] pen progress; morph: [m0, m1]
    draw(ctx, t, write, morph) {
      if (t < write[0]) return;
      if (t < morph[0]) {                           // the pen writes: reveal the scrawl left to right (per line, in order)
        const u = clamp((t - write[0]) / (write[1] - write[0]));
        const perLine = scrawl.length, k = u * perLine;
        scrawl.forEach((L, li) => {
          const lu = clamp(k - li); if (lu <= 0) return;
          const lb = bounds.filter(b => b[2] === L.y), x0 = Math.min(...lb.map(b => b[0])) - 10, x1 = Math.max(...lb.map(b => b[1])) + L.px * .5;
          const xr = x0 + (x1 - x0) * eIO(lu);
          ctx.save(); ctx.beginPath(); ctx.rect(0, L.y - L.px * 1.4, xr, L.px * 2.2); ctx.clip(); ctx.drawImage(sc, 0, 0); ctx.restore();
        });
        return;
      }
      const m = clamp((t - morph[0]) / (morph[1] - morph[0]));
      if (m >= 1) { ctx.drawImage(tc, 0, 0); return; }
      ctx.fillStyle = inkColor;
      const sz = step * 1.15;
      for (let i = 0; i < N; i++) {
        const o = i * 6, u = eIO(clamp((m - P[o + 4]) / .5));
        const x = P[o] + (P[o + 2] - P[o]) * u, y = P[o + 1] + (P[o + 3] - P[o + 1]) * u + Math.sin(Math.PI * u) * P[o + 5];
        ctx.fillRect(x, y, sz, sz);
      }
      const settle = clamp((m - .82) / .18);        // the particles resolve into the crisp type
      if (settle > 0) { ctx.globalAlpha = eOut(settle); ctx.drawImage(tc, 0, 0); ctx.globalAlpha = 1; }
    },
  };
}
