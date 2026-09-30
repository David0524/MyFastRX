// Generates the table's whitewashed oak once: assets/table/oak_color.jpg (4096x8192, 2.8 x 5.6 m) + oak_rough.jpg.
//   node tools/gen-wood.mjs [--small]   (--small: a 1024x2048 preview into the scratch dir)
import {createRequire} from 'node:module'; import http from 'node:http'; import {readFileSync, writeFileSync, existsSync, statSync} from 'node:fs'; import path from 'node:path';
const require = createRequire('/opt/node22/lib/node_modules/'); const {chromium} = require('playwright');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const MIME = {'.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript'};
const server = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (!existsSync(f) || statSync(f).isDirectory()) { r.statusCode = 404; return r.end(); } r.setHeader('Content-Type', MIME[path.extname(f)] || 'application/octet-stream'); r.end(readFileSync(f)); });
await new Promise(r => server.listen(0, r));
const b = await chromium.launch({executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox']});
const pg = await b.newPage(); pg.setDefaultTimeout(0);
await pg.goto(`http://127.0.0.1:${server.address().port}/src/t3/gen-wood.html`); await pg.waitForFunction('window.__ready === true');
const small = process.argv.includes('--small'), out = small ? (process.env.SCRATCH || '/tmp') : path.join(ROOT, 'assets/table');
const t0 = Date.now(); const r = await pg.evaluate(o => window.__gen(o), small ? {W: 1024, H: 2048} : {});
for (const k of ['color', 'rough']) writeFileSync(path.join(out, `oak_${k}.jpg`), Buffer.from(r[k].split(',')[1], 'base64'));
console.log(`wrote ${out}/oak_{color,rough}.jpg in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
await b.close(); server.close();
