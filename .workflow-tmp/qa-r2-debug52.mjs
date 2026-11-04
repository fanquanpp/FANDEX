/* 这次 3s 后 URL 保持 /javascript/ 且 60 卡在 DOM —— 之前 debug50 的问题是
   goto 等待不充分（waitForURL 20s 超时后立即 goto，路由器还在换页中）。
   现在把节奏固定：click -> waitForURL(确认或超时) -> goto 回跳 -> 等 URL 稳定 800ms
   -> 验证 cards>0 -> CDP 点击。全量 15 卡跑通。 */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
page.setDefaultTimeout(8000);
const url = 'http://localhost:4321/FANDEX/javascript/';
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(800);
const cards = await page.evaluate(() => [...document.querySelectorAll('a.doc-list-link')].map(a => a.getAttribute('href')).slice(0, 15));
let bad = 0;
for (const href of cards) {
  if (!page.url().startsWith(url)) {
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(800);
    // URL 稳定性确认（防 client router 复写）
    for (let i = 0; i < 5; i++) {
      if (page.url().startsWith(url) && (await page.locator('a.doc-list-link').count()) > 0) break;
      await page.waitForTimeout(400);
    }
  }
  const pos = await page.evaluate((h) => {
    const a = document.querySelector(`a.doc-list-link[href="${h}"]`);
    if (!a) return null;
    const r = a.getBoundingClientRect();
    if (r.y < 60 || r.y > 860) window.scrollTo(0, window.scrollY + r.y - 300);
    const r2 = a.getBoundingClientRect();
    return { x: Math.round(r2.x + r2.width/2), y: Math.round(r2.y + r2.height/2) };
  }, href);
  if (!pos) { bad++; console.log(href, 'NOT FOUND'); continue; }
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: pos.x, y: pos.y, button: 'left', clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pos.x, y: pos.y, button: 'left', clickCount: 1 });
  await page.waitForURL('**' + new URL('http://x'+href).pathname, { timeout: 25000 }).catch(()=>{});
  await page.waitForTimeout(400);
  const ok = page.url().includes(new URL('http://x'+href).pathname);
  console.log(href.split('/').pop(), ok ? 'NAV' : 'STAYED ' + page.url());
  if (!ok) bad++;
}
console.log('RESULT: bad', bad, '/', cards.length);
await browser.close();
