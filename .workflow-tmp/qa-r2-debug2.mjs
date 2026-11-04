import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const BASE = 'http://localhost:4321/FANDEX/';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

// case A: /javascript/ "Next" 链接
await page.goto(BASE+'javascript/', { waitUntil: 'load' });
await page.waitForTimeout(700);
const nextLocs = page.locator('a', { hasText: 'Next' });
const n = await nextLocs.count();
console.log('Next-contains anchors:', n);
for (let i = 0; i < Math.min(n, 5); i++) {
  const info = await nextLocs.nth(i).evaluate(el => ({t:(el.textContent||'').trim().slice(0,30), h:el.getAttribute('href'), rect:(r=>({x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width)}))(el.getBoundingClientRect())}));
  console.log(' ', i, JSON.stringify(info));
}
// the one matched by hasText 'Next' first
const first = nextLocs.first();
const h = await first.getAttribute('href');
console.log('first hasText-Next href:', h);
await first.click({timeout:6000}).catch(e=>console.log('  click err', String(e).slice(0,100)));
await page.waitForTimeout(1100);
console.log('after click:', page.url());

// case B: /javascript/page/2/ "JavaScript" - find all anchors whose text has JavaScript
await page.goto(BASE+'javascript/page/2/', { waitUntil: 'load' });
await page.waitForTimeout(700);
const jlocs = page.locator('a', { hasText: 'JavaScript' });
const jn = await jlocs.count();
console.log('JS-contains anchors:', jn);
for (let i = 0; i < Math.min(jn, 6); i++) {
  const info = await jlocs.nth(i).evaluate(el => ({t:(el.textContent||'').trim().slice(0,26), h:el.getAttribute('href')}));
  console.log(' ', i, JSON.stringify(info));
}
await browser.close();
