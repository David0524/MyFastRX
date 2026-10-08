// Captures the real MyFastRx offer page at iPhone size (full-page PNG) for the UGC "Screen" shots.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const url = process.argv[2] || 'https://www.myfastrx.com/weight-loss/special/';
const out = process.argv[3] || 'footage/screens/offer_page_full.png';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1' });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
// trigger lazy images
for (let y = 0; y < 20000; y += 600) { await page.evaluate(v => window.scrollTo(0, v), y); await page.waitForTimeout(120); }
await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(800);
await page.screenshot({ path: out, fullPage: true });
const texts = await page.evaluate(() => document.body.innerText);
console.log(texts.slice(0, 3000));
await browser.close();
