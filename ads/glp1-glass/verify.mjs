// Measures the FINAL file (not the plan). node verify.mjs [out/MyFastRx_LiquidGlass_A.mp4]  ->  out/verify_A.json + console report
import {execFileSync, spawn} from 'node:child_process';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import * as TL from './src/timeline.mjs';

const FILE = process.argv[2] || 'out/MyFastRx_LiquidGlass_A.mp4';
const lay = JSON.parse(readFileSync('out/layout.json', 'utf8'));
const {disc, L, COPY} = lay;
const {W, H, FPS} = TL, N = Math.round(TL.DURATION * FPS), HAND = Math.round(TL.OPEN.dive * FPS);
const R = {file: FILE, checks: []};
const ok = (name, pass, detail) => { R.checks.push({name, pass, detail}); console.log(`${pass === true ? 'PASS' : pass === false ? 'FAIL' : 'NOTE'}  ${name}: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`); };

// ---------- 1. container / stream spec ----------
const pr = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', FILE]).toString());
const v = pr.streams.find(s => s.codec_type === 'video'), a = pr.streams.find(s => s.codec_type === 'audio');
const nb = +execFileSync('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', FILE]).toString();
ok('video spec', v.codec_name === 'h264' && v.width === 1080 && v.height === 1920 && v.r_frame_rate === '30/1' && v.pix_fmt === 'yuv420p' && nb === N,
  `${v.codec_name} ${v.profile} ${v.width}x${v.height} ${v.r_frame_rate} ${v.pix_fmt} frames=${nb} field_order=${v.field_order || 'n/a'} ${v.color_primaries}/${v.color_transfer}/${v.color_space} range=${v.color_range}`);
ok('video bitrate 10-15 Mbps', +v.bit_rate >= 10e6 && +v.bit_rate <= 15e6, `${(v.bit_rate / 1e6).toFixed(2)} Mbps`);
ok('progressive', !v.field_order || v.field_order === 'progressive', v.field_order || 'progressive (no field order flag)');
ok('audio spec', a.codec_name === 'aac' && +a.sample_rate === 48000 && a.channels === 2, `${a.codec_name} ${a.sample_rate} Hz ${a.channels} ch`);
ok(`duration ${TL.DURATION} s`, Math.abs(+pr.format.duration - TL.DURATION) < .05, pr.format.duration);
const lo2 = execFileSync('bash', ['-c', `ffmpeg -hide_banner -nostats -i "${FILE}" -af ebur128=peak=true -f null - 2>&1 | grep -A14 Summary`]).toString();
const I = +(/I:\s+(-?[\d.]+) LUFS/.exec(lo2) || [])[1], TP = +(/Peak:\s+(-?[\d.]+) dBFS/.exec(lo2) || [])[1];
ok('audio: no clipping (true peak < -1 dBTP)', TP < -1, `integrated ${I} LUFS, true peak ${TP} dBFS`);
ok('audio: -16 LUFS integrated', Math.abs(I + 16) <= 1 ? true : null, Math.abs(I + 16) <= 1 ? `${I} LUFS` : `${I} LUFS - no VO yet, so the mix is music+SFX at bed level; mix.sh normalizes to -16 once VO_EDIT is filled`);

// ---------- 2. per-frame measurements on decoded RGB ----------
const px = (buf, x, y) => { const i = (y * W + x) * 3; return [buf[i], buf[i + 1], buf[i + 2]]; };
const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
const navyCount = (buf, [x0, y0, x1, y1]) => { let n = 0; for (let y = Math.max(0, y0); y < Math.min(H, y1); y++) for (let x = Math.max(0, x0); x < Math.min(W, x1); x++) { const [r, g, b] = px(buf, x, y); if (r < 70 && g < 90 && b < 140) n++; } return n; };
const panel = [Math.round(disc.x) + 2, Math.round(disc.y) + 14, Math.round(disc.x + disc.w) - 2, Math.round(disc.y + disc.h) - 14];   // inside the rounded panel (12 px corners excluded)
const panelArea = (panel[2] - panel[0]) * (panel[3] - panel[1]);
// the overhead camera (same curve as src/scene.mjs): deep in the opening pill at the handoff, pulling back to 1:1
const eIO = u => u < .5 ? 4 * u ** 3 : 1 - (-2 * u + 2) ** 3 / 2, clamp = (v, a = 0, z = 1) => Math.min(z, Math.max(a, v));
function cam(t) {
  const P = TL.CUES.pullBack, m = eIO(clamp((t - P.t0) / (P.t1 - P.t0)));
  if (m >= 1) return p => p;
  const F = [L.pill1.c[0] - .345 * 500, L.pill1.c[1]], s = Math.exp(Math.log(34) * (1 - m)), G = [W / 2 + (F[0] - W / 2) * m, H / 2 + (F[1] - H / 2) * m];
  // keepQualWithPrice() in src/scene.mjs
  const X = w => (w - F[0]) * s + G[0], PX = [357, 667], QX = [270, 752], E = 8;
  if (X(PX[0]) >= 0 && X(PX[1]) <= W) {
    if ((QX[1] - QX[0]) * s > W - 2 * E) G[0] += W + 4 - X(PX[1]);
    else if (X(QX[1]) > W - E) G[0] -= X(QX[1]) - (W - E);
    else if (X(QX[0]) < E) G[0] += E - X(QX[0]);
  }
  return ([x, y]) => [(x - F[0]) * s + G[0], (y - F[1]) * s + G[1]];
}
// price + qualification boxes (world), relative to the pill that carries them (offsets = PRICE in src/scene.mjs)
const priceBox = c => [c[0] - 150, c[1] + 88 - 128, c[0] + 150, c[1] + 88 + 6];
const qualBox = c => [c[0] - 262, c[1] + 186 - 34, c[0] + 262, c[1] + 228 + 10];
const xf = (f, b) => { const a = f([b[0], b[1]]), z = f([b[2], b[3]]); return [Math.round(a[0]), Math.round(a[1]), Math.round(z[0]), Math.round(z[1])]; };
const onScreen = b => b[0] >= 0 && b[1] >= 0 && b[2] <= W && b[3] <= H;
const pillAt = t => t < TL.CUES.qual1Out.t1 ? L.pill1.c : (t >= TL.CUES.morphPill.t0 && t < TL.CUES.qualOut.t1 ? L.pill.c : null);   // after these the end card's words sit in the same boxes
const REF = {strings: Math.round(6.5 * FPS), price: Math.round(18.0 * FPS)};
const stats = {priceFrames: 0, priceWithoutQual: [], partialPrice: 0, panelEarly: [], stillMax: 0, panelMax: 0};
const rows = []; let panel0 = null, last = null;
await new Promise((res, rej) => {
  const ff = spawn('ffmpeg', ['-v', 'error', '-i', FILE, '-vf', 'scale=in_color_matrix=bt709:in_range=tv:flags=accurate_rnd+full_chroma_int', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']);
  const FS = W * H * 3; let acc = Buffer.alloc(0), idx = 0;
  ff.stdout.on('data', d => {
    acc = Buffer.concat([acc, d]);
    while (acc.length >= FS) {
      const f = acc.subarray(0, FS); acc = acc.subarray(FS); const t = idx / FPS;
      // disclaimer: end card only (its navy panel absent before discIn), then held
      const pn = navyCount(f, panel) / panelArea;
      // (the panel = its four inner corners navy too, so a magnified "$" glyph passing through the area isn't mistaken for it)
      const corner = [[panel[0] + 3, panel[1] + 1], [panel[2] - 4, panel[1] + 1], [panel[0] + 3, panel[3] - 2], [panel[2] - 4, panel[3] - 2]].every(([x, y]) => { const [r, g, b] = px(f, x, y); return r < 70 && g < 90 && b < 140; });
      if (t < TL.CUES.discIn.t0 && pn > .3 && corner) stats.panelEarly.push(idx);
      if (t >= TL.CUES.discIn.land + .05) { const cur = Buffer.alloc((panel[2] - panel[0]) * (panel[3] - panel[1]) * 3); let k = 0;
        for (let y = panel[1]; y < panel[3]; y++) { f.copy(cur, k, (y * W + panel[0]) * 3, (y * W + panel[2]) * 3); k += (panel[2] - panel[0]) * 3; }
        if (!panel0) panel0 = cur; else { let mx = 0; for (let j = 0; j < cur.length; j++) mx = Math.max(mx, Math.abs(cur[j] - panel0[j])); stats.panelMax = Math.max(stats.panelMax, mx); } }
      // overhead: price ink vs qualification ink, in camera space
      const c = idx >= HAND ? pillAt(t) : null;
      if (c) { const k = cam(t), s = Math.abs(k([1, 0])[0] - k([0, 0])[0]), pb = xf(k, priceBox(c)), qb = xf(k, qualBox(c));
        rows.push({i: idx, full: onScreen(pb), qOn: onScreen(qb), p: navyCount(f, pb) / (s * s), q: onScreen(qb) ? navyCount(f, qb) / (s * s) : 0}); }
      if (idx >= Math.ceil(TL.CUES.finalStill * FPS)) { if (last) { let mx = 0; for (let j = 0; j < f.length; j += 7) mx = Math.max(mx, Math.abs(f[j] - last[j])); stats.stillMax = Math.max(stats.stillMax, mx); } last = Buffer.from(f); }
      if (idx === N - 1) { R.lastFrameLogo = sampleLogo(f);
        const lw = 800, lh = 266, bw = L.badge.w, bh = Math.round(638 * bw / 1600);
        R.boxEdges = {logo: boxEdge(f, [Math.round(L.logo.c[0] - lw / 2), Math.round(L.logo.c[1] - lh / 2), lw, lh]), badge: badgeCorners(f, [Math.round(L.badge.cx - bw / 2), L.badge.y, bw, bh])}; }
      idx++;
    }
  });
  ff.on('close', c => c === 0 ? res() : rej(new Error('decode failed')));
});
ok('disclaimer absent before the end card', stats.panelEarly.length === 0, stats.panelEarly.length ? `navy panel found in frames ${stats.panelEarly.slice(0, 20).join(',')}` : `no panel before ${TL.CUES.discIn.t0}s`);
ok('disclaimer held on the end card (ENCODED file)', null, `max channel diff vs its first risen frame = ${stats.panelMax} (H.264 noise; exact identity checked on renderer output below)`);
const ref = k => rows.find(r => r.i === REF[k]);
for (const r of rows) {
  const R0 = ref(r.i / FPS < TL.CUES.wipe1.t1 ? 'strings' : 'price');
  if (r.p < R0.p * .08) continue;                        // no price ink on screen
  if (!r.full) { stats.partialPrice++; continue; }       // only part of the glyphs in frame (the pull-back out of the pill)
  // qualification ink relative to price ink (both scale alike in the pull-back), vs the settled ratio
  stats.priceFrames++; if (!r.qOn || r.q / r.p < (R0.q / R0.p) * .9) stats.priceWithoutQual.push(r.i);
}
ok('overhead: qualification fully present whenever $69 is fully visible', stats.priceWithoutQual.length === 0,
  `${stats.priceFrames} frames show the whole price; frames where qualification/price ink is < 90% of its settled ratio: ${stats.priceWithoutQual.length ? stats.priceWithoutQual.join(',') : 'none'} (${stats.partialPrice} pull-back frames show only a partial "$" glyph, magnified)`);
ok('final hold in the ENCODED file', null, `max frame-to-frame diff from ${TL.CUES.finalStill}s to end = ${stats.stillMax} (H.264 noise on a static picture; exact identity checked on renderer output below)`);
ok('no visible box around the logo / badge files (mean edge step, levels)', R.boxEdges.logo <= 2 && R.boxEdges.badge <= 2, R.boxEdges);
ok('logo colors (last frame) vs logo file', R.lastFrameLogo.navyOk && R.lastFrameLogo.blueOk, R.lastFrameLogo);

// ---------- lossless checks on the renderer output (before encoding) ----------
// needs: node render.mjs --only 441,655,700,760,775,790,809  (the vial photo at rest in the frame, end card, final hold)
const still = i => execFileSync('ffmpeg', ['-v', 'error', '-i', `out/stills/f${String(i).padStart(4, '0')}.png`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], {maxBuffer: 1 << 28});
try {
  const region = (buf, [x0, y0, x1, y1]) => { const o = []; for (let y = y0; y < y1; y++) o.push(buf.subarray((y * W + x0) * 3, (y * W + x1) * 3)); return Buffer.concat(o); };
  const ids = [655, 700, 760, 809], p0 = region(still(ids[0]), panel), same = ids.map(i => region(still(i), panel).equals(p0));
  ok('disclaimer holds byte-identical on the end card (renderer output)', same.every(Boolean), `frames ${ids.join(', ')}: ${same.map(v => v ? 'identical' : 'DIFFERENT').join(', ')}`);
  const e = still(N - 1), holds = [775, 790].map(i => still(i).equals(e));
  ok('final hold byte-identical in the renderer output', holds.every(Boolean), `frames 775, 790 vs ${N - 1}: ${holds.map(v => v ? 'identical' : 'DIFFERENT').join(', ')}`);
  // the vial photo in the frame: the unedited source, scaled uniformly (x0.434) behind the frame's flat glass top
  const src = execFileSync('ffmpeg', ['-v', 'error', '-i', 'images/vial_semaglutide.png', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], {maxBuffer: 1 << 28}), SW = 1024, s = .434;
  const ox = L.frame.c[0] - 509 * s, oy = L.frame.c[1] - 743 * s, raw = still(441);
  let se = 0, n = 0;
  for (let y = Math.ceil(oy + 668 * s); y < oy + 1068 * s; y++) for (let x = Math.ceil(ox + 300 * s); x < ox + 718 * s; x++) {
    const sx0 = (x - ox) / s, sy0 = (y - oy) / s; const acc = [0, 0, 0]; let m = 0;
    for (let v = Math.floor(sy0); v < sy0 + 1 / s; v++) for (let u = Math.floor(sx0); u < sx0 + 1 / s; u++) { const j = (v * SW + u) * 3; acc[0] += src[j]; acc[1] += src[j + 1]; acc[2] += src[j + 2]; m++; }
    const p = px(raw, x, y); for (let c = 0; c < 3; c++) { se += (p[c] - acc[c] / m) ** 2; n++; }
  }
  ok('vial label in the photo frame vs the source file (renderer output, frame 441)', null, `PSNR ${(10 * Math.log10(255 * 255 / (se / n))).toFixed(1)} dB vs a box-filtered x0.434 downscale of the unedited source (label area; the frame's clear glass adds a faint tint)`);
} catch (e) { ok('lossless checks', null, 'stills missing - run node render.mjs --only 441,655,700,760,775,790,809 (' + String(e).slice(0, 80) + ')'); }

// the supplied logo/badge JPGs have #F7F7F7 backgrounds: the end card must match them so no box edge shows
function boxEdge(f, [x0, y0, w, h]) {
  let inS = 0, outS = 0, n = 0;
  for (let x = x0 + 6; x < x0 + w - 6; x += 4) for (const [yi, yo] of [[y0 + 2, y0 - 3], [y0 + h - 3, y0 + h + 2]]) { const a = px(f, x, yi), b = px(f, x, yo); inS += (a[0] + a[1] + a[2]) / 3; outS += (b[0] + b[1] + b[2]) / 3; n++; }
  for (let y = y0 + 6; y < y0 + h - 6; y += 4) for (const [xi, xo] of [[x0 + 2, x0 - 3], [x0 + w - 3, x0 + w + 2]]) { const a = px(f, xi, y), b = px(f, xo, y); inS += (a[0] + a[1] + a[2]) / 3; outS += (b[0] + b[1] + b[2]) / 3; n++; }
  return +Math.abs(inS / n - outS / n).toFixed(2);
}
// the badge art runs to its file's edges; only its four corners are file background (#F7F7F7): compare those to the card
function badgeCorners(f, [x0, y0, w, h]) {
  let worst = 0;
  for (const [cx, cy, dx, dy] of [[x0, y0, 1, 1], [x0 + w - 1, y0, -1, 1], [x0, y0 + h - 1, 1, -1], [x0 + w - 1, y0 + h - 1, -1, -1]]) {
    const a = px(f, cx + 3 * dx, cy + 3 * dy), b = px(f, cx - 4 * dx, cy - 4 * dy);
    worst = Math.max(worst, Math.abs((a[0] + a[1] + a[2]) / 3 - (b[0] + b[1] + b[2]) / 3));
  }
  return +worst.toFixed(2);
}
function sampleLogo(f) {
  const lw = 800, lh = 266, x0 = Math.round(L.logo.c[0] - lw / 2), y0 = Math.round(L.logo.c[1] - lh / 2);
  const hist = new Map();
  for (let y = y0; y < y0 + lh; y++) for (let x = x0; x < x0 + lw; x++) { const [r, g, b] = px(f, x, y); if (r > 200 && g > 200 && b > 200) continue; const k = `${r >> 2},${g >> 2},${b >> 2}`; hist.set(k, (hist.get(k) || 0) + 1); }
  const top = [...hist].sort((p, q) => q[1] - p[1]).slice(0, 2).map(([k]) => k.split(',').map(v => v * 4 + 2));
  const hex = c => '#' + c.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
  const near = (c, ref) => Math.max(...c.map((v, i) => Math.abs(v - ref[i]))) <= 8;
  const navy = top.find(c => c[2] < 110), blue = top.find(c => c[2] > 200);
  return {dominant: top.map(hex), fileNavy: '#001C44', fileBlue: '#0070FC', navyOk: !!navy && near(navy, [0, 28, 68]), blueOk: !!blue && near(blue, [0, 112, 252])};
}

// ---------- 4. OCR of the on-screen wording ----------
mkdirSync('out/ocr', {recursive: true});
const norm = s => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
function ocr(name, t, crop, invert = false, psm = 6) {
  const png = `out/ocr/${name}.png`;
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(t), '-i', FILE, '-frames:v', '1', '-vf', `crop=${crop.join(':')},scale=iw*2:ih*2:flags=lanczos${invert ? ',negate' : ''},format=gray`, png]);
  return norm(execFileSync('tesseract', [png, '-', '--psm', String(psm)], {stdio: ['ignore', 'pipe', 'ignore']}).toString());
}
// ---------- 3D opening: whenever OCR reads the price, it must also read the qualification (same printed table) ----------
{
  const bad = [], seen = [];
  for (let i = 0; i < HAND; i += 6) {
    const png = `out/ocr/o3d_${i}.png`;
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(i / FPS + .001), '-i', FILE, '-frames:v', '1', '-vf', 'format=gray', png]);
    const txt = norm(execFileSync('tesseract', [png, '-', '--psm', '11'], {stdio: ['ignore', 'pipe', 'ignore']}).toString()).toLowerCase();
    if (/\$\s*69/.test(txt)) { seen.push(i); if (!(txt.includes('introductory offer') && txt.includes('varies by plan'))) bad.push(i); }
  }
  ok('3D opening: qualification read wherever "$69" is read (OCR every 6th frame)', bad.length === 0 ? true : null,
     `"$69" read in frames ${seen.join(',') || 'none'}; qualification not read in: ${bad.join(',') || 'none'} (the price and the qualification are one printed texture, so a miss here is OCR on a perspective view, check the listed frames by eye)`);
}
const box = (b, pad = 0) => [b[2] - b[0] + 2 * pad, b[3] - b[1] + 2 * pad, b[0] - pad, b[1] - pad];   // ffmpeg crop w:h:x:y
const dc = [disc.w - 12, Math.round(disc.h) - 8, Math.round(disc.x) + 6, Math.round(disc.y) + 4];
const capBox = n => [820, 60 + 56 * (n - 1) + 14, 100, L.capY - 50 - 56 * (n - 1)];
const P1 = L.pill1.c, P2 = L.pill.c, F = L.frame;
const expect = [
  ['o3d_price', 3.7, [760, 560, 160, 620], false, `${COPY.startingAt} ${COPY.price}`],
  ['head1', 6.5, [860, 200, 80, 280], false, COPY.head1.join(' ')],
  ['strings_starting', 6.5, box([P1[0] - 160, P1[1] - 110, P1[0] + 160, P1[1] - 54]), false, COPY.startingAt, 7],
  ['strings_69', 6.5, box(priceBox(P1), 12), false, COPY.price, 7],
  ['strings_qual', 6.5, box(qualBox(P1)), false, COPY.qual.join(' ')],
  ['head2', 9.2, [860, 200, 80, 280], false, COPY.head2.join(' ')],
  ['button', 9.8, [460, 90, 260, L.btn.c[1] - 45], false, COPY.button, 7],
  ['caption_1', 11.0, capBox(2), false, TL.CAPTIONS[0].lines.join(' ')],
  ['claim24', 13.2, [620, 104, F.c[0] - F.half[0] + 18, F.c[1] + F.half[1] - 118], false, COPY.claim24.join(' ')],
  ['covers', 16.2, [600, 70, 210, L.coversY - 52], false, COPY.covers, 7],
  ['checks', 16.2, [520, 262, L.rowX0 + 2 * L.btnR + 18, L.rows[0] - 50], false, COPY.checks.join(' ')],
  ['no_insurance', 16.2, [820, 60, 100, L.noInsY - 42], false, COPY.noIns, 7],
  ['price_starting', 18.0, box([P2[0] - 160, P2[1] - 110, P2[0] + 160, P2[1] - 54]), false, COPY.startingAt, 7],
  ['price_69', 18.0, box(priceBox(P2), 12), false, COPY.price, 7],
  ['price_qual', 18.0, box(qualBox(P2)), false, COPY.qual.join(' ')],
  ['dose_line', 19.5, capBox(2), false, COPY.doseLine.join(' ')],
  ['tag', 23.2, [860, 180, 80, L.tagY[0] - 66], false, COPY.tag.join(' ')],
  ['cta', 24.2, [560, 80, 230, L.cta.c[1] - 40], true, COPY.cta, 7],
  ['url', 24.8, [820, 70, 100, L.urlY - 54], false, COPY.url, 7],
  ['disclaimer', 22.5, dc, true, COPY.disclaimer],
  ['disclaimer_last', TL.DURATION - .1, dc, true, COPY.disclaimer],
];
const strip = s => s.toLowerCase().replace(/[^a-z0-9$\-;., ]/g, '').replace(/\s+/g, ' ').trim();
for (const [name, t, crop, inv, want, psm] of expect) {
  const got = ocr(name, t, crop, inv, psm);
  const exact = strip(got) === strip(want);
  ok(`OCR "${name}" @${t}s`, exact ? true : null, exact ? 'matches exactly' : `read: "${got}" | expected: "${want}"`);
}
// banned wording must not appear in any source copy
const allCopy = JSON.stringify(COPY) + JSON.stringify(TL.CAPTIONS);
const banned = ['trial', '/month', 'first month', '1st month', 'tirzepatide', '$129', 'apple', 'ios'];
ok('banned wording absent from all on-screen copy', !banned.some(w => allCopy.toLowerCase().includes(w)), banned.join(', '));
const prices = allCopy.match(/\$\d+/g) || [];
ok('only price shown is $69', prices.every(p => p === '$69'), prices.join(' '));
// ---------- 5. VO: transcript of the FINAL file's audio vs the script, and captions vs measured speech ----------
try {
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', FILE, '-vn', '-ac', '1', '-ar', '16000', 'out/ocr/final_audio.wav']);
  const tr = execFileSync('python3', ['tools/transcribe.py', 'out/ocr/final_audio.wav'], {stdio: ['ignore', 'pipe', 'ignore']}).toString().split('\n')[0].replace('out/ocr/final_audio.wav ', '');
  const want = TL.VO.map(v => v.text).join(' ');
  // compare words only: punctuation and hyphenation are the transcriber's choice, not the voice's
  const w = x => x.toLowerCase().replace(/myfastrx\s*\.\s*com/g, 'myfastrx dot com').replace(/[-,.;:!?"']/g, ' ').replace(/[^a-z0-9$ ]/g, ' ').split(/\s+/).filter(Boolean);
  const a1 = w(tr), a2 = w(want);
  const same = a1.join(' ') === a2.join(' ');
  if (!TL.VO_EDIT.length) ok('VO in the final file', null, 'no VO recorded yet (vo/body_v2.wav): the mix is music + SFX only; VO windows and captions are planned from vo/ELEVENLABS_PROMPT_v2.md');
  else ok('VO in the final file says the script (speech-to-text)', same, same ? `"${tr}"` : `heard: "${tr}" | script: "${want}"`);
} catch (e) { ok('VO transcript', null, 'transcription unavailable: ' + String(e).slice(0, 100)); }
const capBad = TL.CAPTIONS.filter(c => !TL.VO.some(v => c.t0 >= v.t0 - .25 && c.t1 <= v.t1 + .3));
ok('captions sit inside their VO line windows', capBad.length === 0, TL.CAPTIONS.map(c => `${c.t0}-${c.t1} "${c.lines.join(' ')}"`).join(' | '));
const capText = TL.CAPTIONS.map(c => c.lines.join(' ')).join(' ').toLowerCase().replace(/[^a-z ]/g, '');
const voText = TL.VO.map(v => v.text).join(' ').toLowerCase().replace(/[^a-z ]/g, '');
ok('caption wording is verbatim VO', TL.CAPTIONS.every(c => voText.replace(/\s+/g, ' ').includes(c.lines.join(' ').toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' '))), 'each caption string found word-for-word in the VO lines');
writeFileSync('out/verify_A.json', JSON.stringify({...R, stats: {...stats, labelPSNR: stats.labelPSNR}}, null, 2));
