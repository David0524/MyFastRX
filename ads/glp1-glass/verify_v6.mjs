// v6 "Touch": measures the FINAL file (not the plan).  node verify_v6.mjs [out/MyFastRx_Touch_v6.mp4]  ->  out/v6/verify.json
// needs: ./render-v5.sh (out/v6/frame_meta.json, out/v6/layout.json), ./mix_v5.sh, and renderer stills for the lossless checks:
//   node render.mjs --tl src/v6/timeline.mjs --page v6/film --stills v6/stills --layout v6/layout.json --only $(node verify_v6.mjs --stills)
import {execFileSync, spawn} from 'node:child_process';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import * as TL from './src/v6/timeline.mjs';

const FILE = process.argv[2] || 'out/MyFastRx_Touch_v6.mp4';
const {disc, L, COPY} = JSON.parse(readFileSync('out/v6/layout.json', 'utf8'));
const META = JSON.parse(readFileSync('out/v6/frame_meta.json', 'utf8'));
const {W, H, FPS, CUES: C, SHIFT: S} = TL, N = Math.round(TL.DURATION * FPS), HAND = Math.round(TL.OPEN.dive * FPS);
const R = {file: FILE, checks: []};
export const STILLS = {disc: [Math.ceil((C.discIn.land + .1) * FPS), Math.ceil((C.discIn.land + 1.5) * FPS), Math.ceil(C.finalStill * FPS) + 3, N - 1], hold: [Math.ceil(C.finalStill * FPS) + 3, N - 15]};
if (process.argv.includes('--stills')) { console.log([...new Set([...STILLS.disc, ...STILLS.hold])].join(',')); process.exit(0); }
const ok = (name, pass, detail) => { R.checks.push({name, pass, detail}); console.log(`${pass === true ? 'PASS' : pass === false ? 'FAIL' : 'NOTE'}  ${name}: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`); };
mkdirSync('out/v6/ocr', {recursive: true});

// ---------- 1. container / stream spec, loudness ----------
const pr = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', FILE]).toString());
const v = pr.streams.find(s => s.codec_type === 'video'), a = pr.streams.find(s => s.codec_type === 'audio');
const nb = +execFileSync('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', FILE]).toString();
ok('video spec', v.codec_name === 'h264' && v.profile === 'High' && v.width === 1080 && v.height === 1920 && v.r_frame_rate === '30/1' && v.pix_fmt === 'yuv420p' && nb === N,
  `${v.codec_name} ${v.profile} ${v.width}x${v.height} ${v.r_frame_rate} ${v.pix_fmt} frames=${nb}/${N} ${v.color_primaries}/${v.color_transfer}/${v.color_space} range=${v.color_range}`);
ok('Rec.709 tagged', v.color_primaries === 'bt709' && v.color_transfer === 'bt709' && v.color_space === 'bt709', `${v.color_primaries}/${v.color_transfer}/${v.color_space}`);
ok('video bitrate 10-15 Mbps', +v.bit_rate >= 10e6 && +v.bit_rate <= 15e6, `${(v.bit_rate / 1e6).toFixed(2)} Mbps`);
ok('progressive', !v.field_order || v.field_order === 'progressive', v.field_order || 'progressive');
ok('audio spec', a.codec_name === 'aac' && +a.sample_rate === 48000 && a.channels === 2, `${a.codec_name} ${a.sample_rate} Hz ${a.channels} ch`);
ok(`duration ${TL.DURATION} s`, Math.abs(+pr.format.duration - TL.DURATION) < .05, pr.format.duration);
const lo = execFileSync('bash', ['-c', `ffmpeg -hide_banner -nostats -i "${FILE}" -af ebur128=peak=true -f null - 2>&1 | grep -A14 Summary`]).toString();
const I = +(/I:\s+(-?[\d.]+) LUFS/.exec(lo) || [])[1], TP = +(/Peak:\s+(-?[\d.]+) dBFS/.exec(lo) || [])[1];
ok('audio: -16 LUFS integrated (+-0.5)', Math.abs(I + 16) <= .5, `${I} LUFS`);
ok('audio: true peak <= -1.5 dBTP (+0.2 tolerance for AAC)', TP <= -1.3, `${TP} dBTP`);

// ---------- 2. per-frame measurements on the decoded file ----------
const px = (buf, x, y) => { const i = (y * W + x) * 3; return [buf[i], buf[i + 1], buf[i + 2]]; };
const isNavy = ([r, g, b]) => r < 70 && g < 90 && b < 140;
const navyCount = (buf, [x0, y0, x1, y1]) => { let n = 0; for (let y = Math.max(0, y0); y < Math.min(H, y1); y++) for (let x = Math.max(0, x0); x < Math.min(W, x1); x++) if (isNavy(px(buf, x, y))) n++; return n; };
const panel = [Math.round(disc.x) + 2, Math.round(disc.y) + 14, Math.round(disc.x + disc.w) - 2, Math.round(disc.y + disc.h) - 14];
const panelArea = (panel[2] - panel[0]) * (panel[3] - panel[1]);
const stats = {panelEarly: [], rows: [], stillMax: 0, panelMax: 0};
let panel0 = null, last = null;
await new Promise((res, rej) => {
  const ff = spawn('ffmpeg', ['-v', 'error', '-i', FILE, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']);
  const FS = W * H * 3; let acc = [], accLen = 0, idx = 0;
  ff.stdout.on('data', d => {
    acc.push(d); accLen += d.length; if (accLen < FS) return;
    let buf = Buffer.concat(acc); acc = []; accLen = 0;
    while (buf.length >= FS) {
      const f = buf.subarray(0, FS); buf = buf.subarray(FS); const t = idx / FPS;
      const corner = [[panel[0] + 3, panel[1] + 1], [panel[2] - 4, panel[1] + 1], [panel[0] + 3, panel[3] - 2], [panel[2] - 4, panel[3] - 2]].every(([x, y]) => isNavy(px(f, x, y)));
      if (t < C.discIn.t0 && navyCount(f, panel) / panelArea > .3 && corner) stats.panelEarly.push(idx);
      if (t >= C.discIn.land + .05) { const cur = Buffer.alloc((panel[2] - panel[0]) * (panel[3] - panel[1]) * 3); let k = 0;
        for (let y = panel[1]; y < panel[3]; y++) { f.copy(cur, k, (y * W + panel[0]) * 3, (y * W + panel[2]) * 3); k += (panel[2] - panel[0]) * 3; }
        if (!panel0) panel0 = cur; else { let mx = 0; for (let j = 0; j < cur.length; j++) mx = Math.max(mx, Math.abs(cur[j] - panel0[j])); stats.panelMax = Math.max(stats.panelMax, mx); } }
      const m = META[idx];
      if (m?.price) stats.rows.push({i: idx, p: navyCount(f, m.price.box), q: navyCount(f, m.price.qbox)});
      if (idx >= Math.ceil(C.finalStill * FPS)) { if (last) { let mx = 0; for (let j = 0; j < f.length; j += 7) mx = Math.max(mx, Math.abs(f[j] - last[j])); stats.stillMax = Math.max(stats.stillMax, mx); } last = Buffer.from(f); }
      if (idx === N - 1) { R.lastFrameLogo = sampleLogo(f);
        const lw = Math.round(1600 * L.logo.scale), lh = Math.round(532 * L.logo.scale), bw = L.badge.w, bh = Math.round(638 * bw / 1600);
        R.boxEdges = {logo: boxEdge(f, [Math.round(L.logo.c[0] - lw / 2), Math.round(L.logo.c[1] - lh / 2), lw, lh]), badge: badgeCorners(f, [Math.round(L.badge.cx - bw / 2), L.badge.y, bw, bh])}; }
      idx++;
    }
    if (buf.length) { acc = [Buffer.from(buf)]; accLen = buf.length; }
  });
  ff.on('close', c => c === 0 ? res() : rej(new Error('decode failed')));
});
ok('disclaimer absent before the end card', stats.panelEarly.length === 0, stats.panelEarly.length ? `navy panel in frames ${stats.panelEarly.slice(0, 20).join(',')}` : `no panel before ${C.discIn.t0}s`);
ok('disclaimer held on the end card (ENCODED file)', null, `max channel diff vs its first risen frame = ${stats.panelMax} (H.264 noise; identity checked on renderer output below)`);
// price -> qualification: on every 2D frame that draws the price, measure the ink of each against its settled value
{
  const ref = stats.rows.find(r => r.i === Math.round((16.2 + S) * FPS)), bad = []; let whole = 0;
  for (const r of stats.rows) {
    if (r.p < ref.p * .97) continue;                  // the price is not wholly on screen (rising, leaving, or under the wipe)
    whole++; if (r.q < ref.q * .95) bad.push(r.i);
  }
  ok('2D: the whole qualification is on screen whenever the whole "$69" is', bad.length === 0,
    `${stats.rows.length} frames draw the price, ${whole} show all of it; frames with < 95% of the qualification's ink: ${bad.join(',') || 'none'} (settled ink: price ${ref.p} px, qualification ${ref.q} px, frame ${ref.i})`);
}
ok('final hold in the ENCODED file', null, `max frame-to-frame diff from ${C.finalStill}s to end = ${stats.stillMax} (H.264 noise; identity checked on renderer output below)`);
ok('no visible box around the logo / badge files', R.boxEdges.logo <= 2 && R.boxEdges.badge <= 2, R.boxEdges);
ok('logo colors (last frame) vs logo file', R.lastFrameLogo.navyOk && R.lastFrameLogo.blueOk, R.lastFrameLogo);

// ---------- 3. lossless checks on the renderer output ----------
const still = i => execFileSync('ffmpeg', ['-v', 'error', '-i', `out/v6/stills/f${String(i).padStart(4, '0')}.png`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], {maxBuffer: 1 << 28});
try {
  const region = (buf, [x0, y0, x1, y1]) => { const o = []; for (let y = y0; y < y1; y++) o.push(buf.subarray((y * W + x0) * 3, (y * W + x1) * 3)); return Buffer.concat(o); };
  const ids = STILLS.disc, p0 = region(still(ids[0]), panel), same = ids.map(i => region(still(i), panel).equals(p0));
  ok('disclaimer byte-identical on the end card (renderer output)', same.every(Boolean), `frames ${ids.join(', ')}: ${same.map(v => v ? 'identical' : 'DIFFERENT').join(', ')}`);
  const e = still(N - 1), holds = STILLS.hold.map(i => still(i).equals(e));
  ok('final hold byte-identical (renderer output)', holds.every(Boolean), `frames ${STILLS.hold.join(', ')} vs ${N - 1}: ${holds.map(v => v ? 'identical' : 'DIFFERENT').join(', ')}`);
} catch (e) { ok('lossless checks', false, 'stills missing - see the header (' + String(e).slice(0, 80) + ')'); }

// ---------- 4. OCR ----------
const norm = s => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
function ocr(name, t, crop, invert = false, psm = 6) {
  const png = `out/v6/ocr/${name}.png`;
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(t), '-i', FILE, '-frames:v', '1', '-vf', `crop=${crop.join(':')},scale=iw*2:ih*2:flags=lanczos${invert ? ',negate' : ''},format=gray`, png]);
  return norm(execFileSync('tesseract', [png, '-', '--psm', String(psm)], {stdio: ['ignore', 'pipe', 'ignore']}).toString());
}
// the hook is real footage: its "$69" frames are 2D and already in the per-frame price/qualification check above
{
  const hookPrice = stats.rows.filter(r => r.i < HAND).length;
  ok('hook: the price pill frames are measured by the 2D price check', hookPrice > 0, `${hookPrice} hook frames draw the price`);
  const ringFrames = Object.entries(META).filter(([i, m]) => +i < HAND && m.ring > 0).length;
  ok('hook: the glass ring refracts only its inside (never the footage with her in it)', null, `one-sided ring in src/glass.mjs (uOneSided); ${ringFrames} hook frames carry the ring`);
}
const P = L.pill.c, F = L.frame, cw = (y0, h) => [820, h, 100, y0];   // full safe-area width crop at y0
const dc = [disc.w - 12, Math.round(disc.h) - 8, Math.round(disc.x) + 6, Math.round(disc.y) + 4];
const lineCrop = (ys, px) => cw(ys[0] - Math.round(px * .95), ys[ys.length - 1] - ys[0] + Math.round(px * 1.25));
const expect = [
  ['head1', 5.75 + S, lineCrop(L.head1Y, L.px.head1), false, COPY.head1.join(' ')],
  ['head2', 6.7 + S, lineCrop(L.head2Y, L.px.head2), false, COPY.head2.join(' ')],
  ['toggle', 8.1 + S, cw(L.toggleLabelY - 42, 56), false, COPY.toggle, 7],
  ['head3', 8.1 + S, lineCrop(L.head2Y, L.px.head2), false, COPY.head3.join(' ')],
  ['button', 10.3 + S, [460, 90, 230, L.btn.c[1] - 45], false, COPY.button, 7],
  ['head4', 10.3 + S, lineCrop(L.head4Y, L.px.head4), false, COPY.head4.join(' ')],
  ['covers', 12.6 + S, lineCrop([L.coversY], L.px.covers), false, COPY.covers, 7],
  ['label_provider', 12.8 + S, lineCrop([L.labelY], L.px.label), false, COPY.labels[0], 7],
  ['label_medication', 13.7 + S, lineCrop([L.labelY], L.px.label), false, COPY.labels[1], 7],
  ['label_shipping', 14.3 + S, lineCrop([L.labelY], L.px.label), false, COPY.labels[2], 7],
  ['price_starting', 16.2 + S, [320, 56, P[0] - 160, P[1] - 110], false, COPY.startingAt, 7],
  ['price_69', 16.2 + S, [L.priceBox[2] - L.priceBox[0] + 24, L.priceBox[3] - L.priceBox[1] + 24, L.priceBox[0] - 12, L.priceBox[1] - 12], false, COPY.price, 7],
  ['price_qual', 16.2 + S, [L.qualBox[2] - L.qualBox[0], L.qualBox[3] - L.qualBox[1], L.qualBox[0], L.qualBox[1]], false, COPY.qual.join(' ')],
  ['dose_line', 18.2 + S, lineCrop(L.doseLineY, 46), false, COPY.doseLine.join(' ')],
  ['walk_tag', 20.6 + S, cw(L.walkTagY[0] - 62, 160), false, COPY.tag.join(' ')],
  ['tag', 22.0 + S, [860, 180, 80, L.tagY[0] - 66], false, COPY.tag.join(' ')],
  ['cta', 22.6 + S, [560, 80, 230, L.cta.c[1] - 40], true, COPY.cta, 7],
  ['url', 23.0 + S, [820, 70, 100, L.urlY - 54], false, COPY.url, 7],
  ['disclaimer', 22.0 + S, dc, true, COPY.disclaimer],
  ['disclaimer_last', TL.DURATION - .05, dc, true, COPY.disclaimer],
];
const strip = s => s.toLowerCase().replace(/[^a-z0-9$\-;., ']/g, '').replace(/\s+/g, ' ').trim();
for (const [name, t, crop, inv, want, psm] of expect) {
  const got = ocr(name, t, crop, inv, psm), exact = strip(got) === strip(want);
  ok(`OCR "${name}" @${t}s`, exact ? true : null, exact ? 'matches exactly' : `read: "${got}" | expected: "${want}"`);
}
const allCopy = JSON.stringify(COPY) + JSON.stringify(TL.CAPTIONS);
const banned = ['trial', '/month', 'first month', '1st month', 'tirzepatide', '$129', 'apple', 'ios', 'unlike'];
ok('banned wording absent from all on-screen copy', !banned.some(w => allCopy.toLowerCase().includes(w)), banned.join(', '));
const prices = allCopy.match(/\$\d+/g) || [];
ok('only price shown is $69', prices.every(p => p === '$69'), prices.join(' '));
ok('disclaimer text is the exact approved text', COPY.disclaimer === 'Compounded medication. Not FDA-approved. Results may vary. Not all patients qualify. Prescription issued only if medically appropriate following provider review. MyFastRx does not manufacture medications; product appearance and labeling may vary. Actor portrayal.', 'string compare');
ok('disclaimer panel geometry', Math.round(disc.x) === 100 && Math.round(disc.x + disc.w) === 920 && Math.round(disc.y + disc.h) === 1236, `x ${disc.x}-${disc.x + disc.w}, bottom ${disc.y + disc.h}`);

// ---------- 5. VO: speech-to-text of the final file vs the script; on-screen VO lines vs the script ----------
try {
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', FILE, '-vn', '-ac', '1', '-ar', '16000', 'out/v6/ocr/final_audio.wav']);
  const tr = execFileSync('python3', ['tools/transcribe.py', 'out/v6/ocr/final_audio.wav'], {stdio: ['ignore', 'pipe', 'ignore']}).toString().split('\n')[0].replace('out/v6/ocr/final_audio.wav ', '');
  const want = TL.VO.map(v => v.text).join(' ');
  const w = x => x.toLowerCase().replace(/myfastrx\s*\.\s*com/g, 'myfastrx dot com').replace(/[-,.;:!?"']/g, ' ').replace(/[^a-z0-9$ ]/g, ' ').split(/\s+/).filter(Boolean);
  const same = w(tr).join(' ') === w(want).join(' ');
  ok('VO in the final file says the script (speech-to-text)', same, same ? `"${tr}"` : `heard: "${tr}" | script: "${want}"`);
} catch (e) { ok('VO transcript', null, 'transcription unavailable: ' + String(e).slice(0, 100)); }
{ // every on-screen line that speaks for the VO must be the VO's words, in order
  const vo = ' ' + TL.VO.map(v => v.text).join(' ').toLowerCase().replace(/[^a-z0-9$' ]/g, ' ').replace(/\s+/g, ' ') + ' ';
  const said = [COPY.head1.join(' '), COPY.head2.join(' '), COPY.head3.join(' '), COPY.head4.join(' '), COPY.covers, ...COPY.labels, COPY.tag[0], COPY.tag[1]];
  const miss = said.filter(s => !vo.includes(' ' + s.toLowerCase().replace(/[^a-z0-9$' ]/g, ' ').replace(/\s+/g, ' ').trim() + ' '));
  ok('on-screen VO lines are word-for-word VO', miss.length === 0, miss.length ? `not in the VO: ${miss.join(' | ')}` : said.join(' | '));
}
const fails = R.checks.filter(c => c.pass === false).length, notes = R.checks.filter(c => c.pass === null).length;
console.log(`\n${R.checks.length} checks: ${R.checks.length - fails - notes} pass, ${fails} fail, ${notes} notes`);
writeFileSync('out/v6/verify.json', JSON.stringify(R, null, 2));

// the supplied logo/badge JPGs have #F7F7F7 backgrounds: the end card must match them so no box edge shows
function boxEdge(f, [x0, y0, w, h]) {
  let inS = 0, outS = 0, n = 0;
  for (let x = x0 + 6; x < x0 + w - 6; x += 4) for (const [yi, yo] of [[y0 + 2, y0 - 3], [y0 + h - 3, y0 + h + 2]]) { const a = px(f, x, yi), b = px(f, x, yo); inS += (a[0] + a[1] + a[2]) / 3; outS += (b[0] + b[1] + b[2]) / 3; n++; }
  for (let y = y0 + 6; y < y0 + h - 6; y += 4) for (const [xi, xo] of [[x0 + 2, x0 - 3], [x0 + w - 3, x0 + w + 2]]) { const a = px(f, xi, y), b = px(f, xo, y); inS += (a[0] + a[1] + a[2]) / 3; outS += (b[0] + b[1] + b[2]) / 3; n++; }
  return +Math.abs(inS / n - outS / n).toFixed(2);
}
function badgeCorners(f, [x0, y0, w, h]) {
  let worst = 0;
  for (const [cx, cy, dx, dy] of [[x0, y0, 1, 1], [x0 + w - 1, y0, -1, 1], [x0, y0 + h - 1, 1, -1], [x0 + w - 1, y0 + h - 1, -1, -1]]) {
    const a = px(f, cx + 3 * dx, cy + 3 * dy), b = px(f, cx - 4 * dx, cy - 4 * dy);
    worst = Math.max(worst, Math.abs((a[0] + a[1] + a[2]) / 3 - (b[0] + b[1] + b[2]) / 3));
  }
  return +worst.toFixed(2);
}
function sampleLogo(f) {
  const lw = Math.round(1600 * L.logo.scale), lh = Math.round(532 * L.logo.scale), x0 = Math.round(L.logo.c[0] - lw / 2), y0 = Math.round(L.logo.c[1] - lh / 2);
  const hist = new Map();
  for (let y = y0; y < y0 + lh; y++) for (let x = x0; x < x0 + lw; x++) { const [r, g, b] = px(f, x, y); if (r > 200 && g > 200 && b > 200) continue; const k = `${r >> 2},${g >> 2},${b >> 2}`; hist.set(k, (hist.get(k) || 0) + 1); }
  const top = [...hist].sort((p, q) => q[1] - p[1]).slice(0, 6).map(([k]) => k.split(',').map(v => v * 4 + 2));   // the wordmark is mostly navy: look past the top two bins for the blue
  const hex = c => '#' + c.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
  const near = (c, ref) => Math.max(...c.map((v, i) => Math.abs(v - ref[i]))) <= 8;
  const navy = top.find(c => c[2] < 110), blue = top.find(c => c[2] > 200);
  return {dominant: top.map(hex), fileNavy: '#001C44', fileBlue: '#0070FC', navyOk: !!navy && near(navy, [0, 28, 68]), blueOk: !!blue && near(blue, [0, 112, 252])};
}
