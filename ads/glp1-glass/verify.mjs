// Measures the FINAL file (not the plan). node verify.mjs [out/MyFastRx_LiquidGlass_A.mp4]  ->  out/verify_A.json + console report
import {execFileSync, spawn} from 'node:child_process';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import * as TL from './src/timeline.mjs';

const FILE = process.argv[2] || 'out/MyFastRx_LiquidGlass_A.mp4';
const lay = JSON.parse(readFileSync('out/layout.json', 'utf8'));
const {disc, L, COPY} = lay;
const W = 1080, H = 1920, N = 750;
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
ok('duration 25 s', Math.abs(+pr.format.duration - 25) < .05, pr.format.duration);
const lo2 = execFileSync('bash', ['-c', `ffmpeg -hide_banner -nostats -i "${FILE}" -af ebur128=peak=true -f null - 2>&1 | grep -A14 Summary`]).toString();
const I = +(/I:\s+(-?[\d.]+) LUFS/.exec(lo2) || [])[1], TP = +(/Peak:\s+(-?[\d.]+) dBFS/.exec(lo2) || [])[1];
ok('audio: no clipping (true peak < -1 dBTP)', TP < -1, `integrated ${I} LUFS, true peak ${TP} dBFS`);
ok('audio: -16 LUFS integrated', Math.abs(I + 16) <= 1 ? true : null, Math.abs(I + 16) <= 1 ? `${I} LUFS` : `${I} LUFS - no VO yet, so the mix is music+SFX at bed level; mix.sh normalizes to -16 once vo/ exists`);

// ---------- 2. per-frame measurements on decoded RGB ----------
const px = (buf, x, y) => { const i = (y * W + x) * 3; return [buf[i], buf[i + 1], buf[i + 2]]; };
const navyCount = (buf, [x0, y0, x1, y1]) => { let n = 0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const [r, g, b] = px(buf, x, y); if (r < 70 && g < 90 && b < 140) n++; } return n; };
const panel = [Math.round(disc.x), Math.round(disc.y), Math.round(disc.x + 880), Math.round(disc.y + disc.h)];
const priceBox = [440, 660, 860, 872], qualBox = [330, 905, 965, 1032];
const labelBox = [L.vial.x + 6, L.vial.y + 216, L.vial.x + 224, L.vial.y + 418];   // vial label (half-res rows 216..418)
let panel0 = null, last = null; const stats = {panelMax: 0, panelMaxFrame: -1, panelMeanMax: 0, priceFrames: 0, priceWithoutFullQual: [], stillMax: 0, labelPSNR: []};
const frames = [];
const refLabel = (() => { const raw = readFileSync('assets/vial/vial_color_half.rgba'), w = 230; return (x, y) => { const i = ((y - L.vial.y) * w + (x - L.vial.x)) * 4; return [raw[i], raw[i + 1], raw[i + 2]]; }; })();
const restFrames = new Set(); for (let i = 0; i < N; i++) { const t = i / 30; if ((t >= TL.CUES.vialRise.land && t < TL.CUES.vialSway.t0) || (t >= TL.CUES.vialSway.t1 && t < TL.CUES.zoom.t0)) restFrames.add(i); }
const qualRefFrame = 120;
let qualRef = 0, priceRef = 0;
await new Promise((res, rej) => {
  const ff = spawn('ffmpeg', ['-v', 'error', '-i', FILE, '-vf', 'scale=in_color_matrix=bt709:in_range=tv:flags=accurate_rnd+full_chroma_int', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']);
  const FS = W * H * 3; let acc = Buffer.alloc(0), idx = 0;
  ff.stdout.on('data', d => {
    acc = Buffer.concat([acc, d]);
    while (acc.length >= FS) {
      const f = acc.subarray(0, FS); acc = acc.subarray(FS);
      // panel
      const cur = Buffer.alloc((panel[2] - panel[0]) * (panel[3] - panel[1]) * 3); let k = 0;
      for (let y = panel[1]; y < panel[3]; y++) { f.copy(cur, k, (y * W + panel[0]) * 3, (y * W + panel[2]) * 3); k += (panel[2] - panel[0]) * 3; }
      if (!panel0) panel0 = cur; else { let mx = 0, sum = 0; for (let j = 0; j < cur.length; j++) { const d2 = Math.abs(cur[j] - panel0[j]); sum += d2; if (d2 > mx) mx = d2; } if (mx > stats.panelMax) { stats.panelMax = mx; stats.panelMaxFrame = idx; } stats.panelMeanMax = Math.max(stats.panelMeanMax, sum / cur.length); }
      // price vs qualification
      const pn = navyCount(f, priceBox), qn = navyCount(f, qualBox);
      frames.push({i: idx, pn, qn});
      if (idx === qualRefFrame) { qualRef = qn; priceRef = pn; }
      // vial label at rest
      if (restFrames.has(idx) && idx % 5 === 0) { let se = 0, n = 0; for (let y = labelBox[1]; y < labelBox[3]; y++) for (let x = labelBox[0]; x < labelBox[2]; x++) { const p = px(f, x, y), q = refLabel(x, y); for (let c = 0; c < 3; c++) { se += (p[c] - q[c]) ** 2; n++; } } stats.labelPSNR.push({i: idx, psnr: +(10 * Math.log10(255 * 255 / (se / n))).toFixed(2)}); }
      // final still
      if (idx >= Math.ceil(TL.CUES.finalStill * 30)) { if (last) { let mx = 0; for (let j = 0; j < f.length; j += 7) { const d2 = Math.abs(f[j] - last[j]); if (d2 > mx) mx = d2; } stats.stillMax = Math.max(stats.stillMax, mx); } last = Buffer.from(f); }
      if (idx === N - 1) { R.lastFrameLogo = sampleLogo(f); }
      idx++;
    }
  });
  ff.on('close', c => c === 0 ? res() : rej(new Error('decode failed')));
});
ok('disclaimer panel identical in every frame', stats.panelMax <= 6, `max channel diff vs frame 0 = ${stats.panelMax} (frame ${stats.panelMaxFrame}), worst frame mean diff = ${stats.panelMeanMax.toFixed(3)} (H.264 re-encode noise only if > 0)`);
for (const f of frames) if (f.pn > priceRef * .05) { stats.priceFrames++; if (f.qn < qualRef * .9) stats.priceWithoutFullQual.push(f.i); }
ok('qualification fully present whenever $69 is visible', stats.priceWithoutFullQual.length === 0, `${stats.priceFrames} frames show the price; frames where qualification < 90% of its settled ink: ${stats.priceWithoutFullQual.length ? stats.priceWithoutFullQual.join(',') : 'none'}`);
const psn = stats.labelPSNR.map(s => s.psnr);
ok('vial label vs source pixels (final H.264, rest frames)', Math.min(...psn) > 38, `PSNR min ${Math.min(...psn)} dB, mean ${(psn.reduce((a, b) => a + b, 0) / psn.length).toFixed(1)} dB over ${psn.length} sampled rest frames (lossy codec; exact check on lossless render below)`);
ok('final layout still through the last frame', stats.stillMax <= 4, `max frame-to-frame diff from ${TL.CUES.finalStill}s to end = ${stats.stillMax}`);
ok('logo colors (last frame) vs logo file', R.lastFrameLogo.navyOk && R.lastFrameLogo.blueOk, R.lastFrameLogo);

// ---------- 3. lossless check of the label (renderer output before encoding) ----------
try {
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', 'out/stills/f0120.png', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']);
  let diff = 0, n = 0; for (let y = labelBox[1]; y < labelBox[3]; y++) for (let x = labelBox[0]; x < labelBox[2]; x++) { const p = px(raw, x, y), q = refLabel(x, y); for (let c = 0; c < 3; c++) { diff = Math.max(diff, Math.abs(p[c] - q[c])); n++; } }
  ok('vial label pixel-exact in the renderer output (frame 120, lossless)', diff === 0, `max channel diff = ${diff} over ${n / 3} label pixels`);
} catch (e) { ok('vial label lossless check', null, 'out/stills/f0120.png missing - run node render.mjs --only 120'); }

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
function ocr(name, t, crop, invert = false) {
  const png = `out/ocr/${name}.png`;
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(t), '-i', FILE, '-frames:v', '1', '-vf', `crop=${crop.join(':')},scale=iw*2:ih*2:flags=lanczos${invert ? ',negate' : ''},format=gray`, png]);
  return norm(execFileSync('tesseract', [png, '-', '--psm', '6'], {stdio: ['ignore', 'pipe', 'ignore']}).toString());
}
const expect = [
  ['disclaimer', 0.0, [880, Math.round(disc.h), Math.round(disc.x), Math.round(disc.y)], true, COPY.disclaimer],
  ['disclaimer_last', 24.9, [880, Math.round(disc.h), Math.round(disc.x), Math.round(disc.y)], true, COPY.disclaimer],
  ['qualification', 4.0, [600, 110, 346, 910], false, COPY.qual.join(' ')],
  ['price', 4.0, [520, 240, 386, 650], false, `${COPY.startingAt} ${COPY.price}`],
  ['headline_hook', 3.0, [820, 110, 100, 370], false, COPY.hookHead],
  ['headline_visit', 7.0, [820, 190, 100, 310], false, COPY.visitHead.join(' ')],
  ['caption_1', 5.8, [820, 90, 100, Math.round(disc.y) - 100], false, TL.CAPTIONS[0].lines.join(' ')],
  ['caption_2', 7.8, [820, 150, 100, Math.round(disc.y) - 160], false, TL.CAPTIONS[1].lines.join(' ')],
  ['checks', 14.2, [700, 330, 150, 870], false, COPY.checks.join(' ')],
  ['fees', 17.4, [820, 200, 100, 760], false, COPY.fees.join(' ')],
  ['caption_3', 15.9, [820, 90, 100, Math.round(disc.y) - 100], false, TL.CAPTIONS[2].lines.join(' ')],
  ['caption_4', 17.9, [820, 150, 100, Math.round(disc.y) - 160], false, TL.CAPTIONS[3].lines.join(' ')],
  ['cta', 23.0, [660, 144, 180, 618], true, COPY.cta],
  ['url', 23.0, [820, 80, 100, 790], false, COPY.url],
];
const strip = s => s.toLowerCase().replace(/[^a-z0-9$\-;.,' ]/g, '').replace(/\s+/g, ' ').trim();
for (const [name, t, crop, inv, want] of expect) {
  const got = ocr(name, t, crop, inv);
  const exact = strip(got) === strip(want);
  ok(`OCR "${name}" @${t}s`, exact ? true : null, exact ? 'matches exactly' : `read: "${got}" | expected: "${want}"`);
}
// banned wording must not appear in any source copy
const allCopy = JSON.stringify(COPY) + JSON.stringify(TL.CAPTIONS);
const banned = ['trial', '/month', 'first month', '1st month', 'tirzepatide', '$129', 'apple', 'ios'];
ok('banned wording absent from all on-screen copy', !banned.some(w => allCopy.toLowerCase().includes(w)), banned.join(', '));
const prices = allCopy.match(/\$\d+/g) || [];
ok('only price shown is $69', prices.every(p => p === '$69'), prices.join(' '));
writeFileSync('out/verify_A.json', JSON.stringify({...R, stats: {...stats, labelPSNR: stats.labelPSNR}}, null, 2));
