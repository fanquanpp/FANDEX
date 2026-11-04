/* CDP 第一张 NAV，第二张 querySelector null —— 因为 waitForURL 后页面在 010，
   goto 回跳后 document 里 .doc-list-link 应存在。null 说明回跳页面 DOM 结构不同？
   打印 URL + document 状态。 */
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
await page.waitForTimeout(700);
const cards = await page.evaluate(() => [...document.querySelectorAll('a.doc-list-link')].map(a => a.getAttribute('href')).slice(0, 5));
for (const href of cards) {
  if (!page.url().startsWith(url)) {
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(700);
  }
  console.log('before click url:', page.url(), 'cards in dom:', await page.locator('a.doc-list-link').count());
  const pos = await page.evaluate((h) => {
    const a = document.querySelector(`a.doc-list-link[href="${h}"]`);
    if (!a) return null;
    const r = a.getBoundingClientRect();
    if (r.y < 60 || r.y > 860) { window.scrollTo(0, window.scrollY + r.y - 300); }
    const r2 = a.getBoundingClientRect();
    return { x: Math.round(r2.x + r2.width/2), y: Math.round(r2.y + r2.height/2) };
  }, href).catch(e => { console.log('eval err', String(e).slice(0,60)); return null; });
  if (!pos) { console.log(href, 'CARD NOT FOUND after goto'); bad++; continue; }
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: pos.x, y: pos.y, button: 'left', clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pos.x, y: pos.y, button: 'left', clickCount: 1 });
  await page.waitForURL('**' + new URL('http://x'+href).pathname, { timeout: 20000 }).catch(()=>{});
  await page.waitForTimeout(500);
  const ok = page.url().includes(new URL('http://x'+href).pathname);
  console.log('   ', href.split('/').pop(), ok ? 'NAV' : 'STAYED ' + page.url());
}
await browser.close();
