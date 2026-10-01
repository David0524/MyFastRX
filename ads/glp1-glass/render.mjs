// Deterministic frame-by-frame render: headless Chromium draws frame i at t = i/30 s, posts raw RGBA to this
// process, which pipes it straight into ffmpeg (no screenshots, no real-time playback).
// Usage: node render.mjs                     -> out/A_video_only.mp4 (video stream, lossless-ish intermediate)
//        node render.mjs --only 0,60,130     -> stills in out/stills/*.png
//        node render.mjs --from 0 --to 120   -> partial
import {createRequire} from 'node:module';
import http from 'node:http';
import {readFileSync, existsSync, mkdirSync, writeFileSync, statSync} from 'node:fs';
import {spawn} from 'node:child_process';
import path from 'node:path';
const require = createRequire('/opt/node22/lib/node_modules/');
const {chromium} = require('playwright');
const ROOT = path.dirname(new URL(import.meta.url).pathname);
const argv = process.argv.slice(2), flag = k => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
// --tl src/v5/timeline.mjs selects a version's timeline (default: src/timeline.mjs); --out names the video file;
// a page may expose window.__meta() (per-frame data for verify), saved next to the video as <name>.meta.json
const TL = await import(path.resolve(ROOT, flag('--tl') || 'src/timeline.mjs'));
const only = flag('--only')?.split(',').map(Number);
const N = Math.round(TL.DURATION * TL.FPS);
const from = +(flag('--from') ?? 0), to = +(flag('--to') ?? N);
const outDir = path.join(ROOT, 'out'), stillDir = path.join(outDir, flag('--stills') || 'stills'); mkdirSync(stillDir, {recursive: true});
const MIME = {'.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf', '.jpeg': 'image/jpeg', '.woff2': 'font/woff2'};
let onFrame = null;
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (req.method === 'POST' && u.pathname === '/frame') {
    const chunks = []; req.on('data', c => chunks.push(c)); req.on('end', async () => { await onFrame(+u.searchParams.get('i'), Buffer.concat(chunks)); res.end('ok'); });
    return;
  }
  const f = path.join(ROOT, decodeURIComponent(u.pathname));
  if (!f.startsWith(ROOT) || !existsSync(f) || statSync(f).isDirectory()) { res.statusCode = 404; return res.end(); }
  res.setHeader('Content-Type', MIME[path.extname(f)] || 'application/octet-stream'); res.end(readFileSync(f));
});
await new Promise(r => server.listen(0, r));
const port = server.address().port;
const browser = await chromium.launch({executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--ignore-certificate-errors']});
const page = await browser.newPage();
const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
const PAGE = flag('--page') || 'film';
await page.goto(`http://127.0.0.1:${port}/src/${PAGE}.html?intro=${TL.INTRO}`);
await page.waitForFunction('window.__ready === true').catch(e => { console.error([...new Set(errs)].join('\n')); throw e; });
const info = await page.evaluate(() => window.__init());
if (info && Object.keys(info).length) writeFileSync(path.join(outDir, flag('--layout') || 'layout.json'), JSON.stringify(info, null, 2));   // the 3D page has no 2D layout
if (errs.length) console.error(errs.join('\n'));
if (only) {
  for (const i of only) {
    await page.evaluate(t => window.__render(t), i / TL.FPS);
    const d = await page.evaluate(() => window.__png());
    writeFileSync(path.join(stillDir, `f${String(i).padStart(4, '0')}.png`), Buffer.from(d.split(',')[1], 'base64'));
    const mt = await page.evaluate(() => window.__meta ? window.__meta() : null);
    console.log('still', i, mt ? JSON.stringify(mt).slice(0, 160) : '');
  }
} else {
  const file = path.join(outDir, flag('--from') || flag('--to') ? `${flag('--prefix') || 'part'}_${String(from).padStart(4, '0')}_${to}.mp4` : (flag('--out') || 'A_video_only.mp4'));
  const meta = {};   // the 3D opening renders into its own parts too (same frame numbering)
  // Intermediate: near-lossless H.264 (crf 8, yuv444 -> converted at final mux). Final encode happens in mix.sh.
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${TL.W}x${TL.H}`, '-r', String(TL.FPS), '-i', '-',
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv', '-c:v', 'libx264', '-preset', 'medium', '-crf', '6', '-pix_fmt', 'yuv444p', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', file], {stdio: ['pipe', 'inherit', 'inherit']});
  onFrame = (i, buf) => new Promise(r => { if (buf.length !== TL.W * TL.H * 4) throw new Error('bad frame ' + i); ff.stdin.write(buf) ? r() : ff.stdin.once('drain', r); });
  const t0 = Date.now();
  for (let i = from; i < to; i++) {
    await page.evaluate(t => window.__render(t), i / TL.FPS);
    await page.evaluate(i => window.__post(i), i);
    const mt = await page.evaluate(() => window.__meta ? window.__meta() : null); if (mt) meta[i] = mt;
    if (i % 15 === 0) process.stdout.write(`\rframe ${i}/${to}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  if (Object.keys(meta).length) writeFileSync(file.replace(/\.mp4$/, '.meta.json'), JSON.stringify(meta));
  console.log(`\nwrote ${file}`);
}
if (errs.length) console.error('page errors:\n' + [...new Set(errs)].join('\n'));
await browser.close(); server.close();
