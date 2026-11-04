/* 53 里一切正常（60 卡）。52 的差异：52 用 waitForURL 等 card1 到达（25s 预算），
   然后 goto 回跳 + 800ms + 稳定性循环。52 失败 "NOT FOUND" 且 pos=null。
   注意 52 的稳定性循环检查 page.url().startsWith(url) && cards>0 —— 打出 NOT FOUND
   说明循环通过（否则 continue 前无检查）……不对，循环 5 次后直接 querySelector = null。
   即 URL 对、cards>0，但具体 href 的 a 不存在？ 60 卡里必有 020！
   除非…… enumerate 的 cards 数组来自第一次访问时的 60 个 href，而回跳后页面是
   不同页（start? 崩了?）。加日志：回跳后 dump 前 3 个卡 href + location。
   另一可能：locator 60 但 querySelector 是在一个 <template> 或 shadowRoot 里？不可能。
   直接 dump。 */
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
const cards = await page.evaluate(() => [...document.querySelectorAll('a.doc-list-link')].map(a => a.getAttribute('href')).slice(0, 4));
for (const href of cards) {
  if (!page.url().startsWith(url)) {
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(800);
  }
  const dump = await page.evaluate(() => ({
    url: location.pathname,
    cards: document.querySelectorAll('a.doc-list-link').length,
    first3: [...document.querySelectorAll('a.doc-list-link')].slice(0,3).map(a=>a.getAttribute('href')),
    hasTarget: !!document.querySelector('a.doc-list-link[href="/FANDEX/javascript/020-JavaScriptOverviewRuntimeEnv/"]'),
  }));
  console.log('dump:', JSON.stringify(dump));
  const pos = await page.evaluate((h) => {
    const a = document.querySelector(`a.doc-list-link[href="${h}"]`);
    if (!a) return null;
    const r = a.getBoundingClientRect();
    if (r.y < 60 || r.y > 860) window.scrollTo(0, window.scrollY + r.y - 300);
    const r2 = a.getBoundingClientRect();
    return { x: Math.round(r2.x + r2.width/2), y: Math.round(r2.y + r2.height/2) };
  }, href);
  if (!pos) { console.log('  POS NULL for', href); continue; }
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: pos.x, y: pos.y, button: 'left', clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pos.x, y: pos.y, button: 'left', clickCount: 1 });
  await page.waitForURL('**' + new URL('http://x'+href).pathname, { timeout: 25000 }).catch(()=>{});
  await page.waitForTimeout(400);
  console.log('  ', href.split('/').pop(), page.url().includes(new URL('http://x'+href).pathname) ? 'NAV' : 'STAYED');
}
await browser.close();
