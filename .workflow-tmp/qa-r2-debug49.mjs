/* dev server 正常响应。click 卡死但 raw mouse click 成功 —— 这是 Playwright
   actionability 的 "stable" 检测在回跳页面持续失败。用 injected rAF 观测 bbox
   不能复现 Playwright 内部视角。替代：用 CDP Input.dispatchMouseEvent（与 raw mouse
   等价、绕过 actionability）完成全量导航验证——真实用户等效。 */
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
const cards = await page.evaluate(() => [...document.querySelectorAll('a.doc-list-link')].map(a => {
  const r = a.getBoundingClientRect();
  return { href: a.getAttribute('href'), cx: Math.round(r.x + r.width/2), cy: Math.round(r.y + r.height/2) };
}).slice(0, 12));
let bad = 0;
for (const c of cards) {
  if (!page.url().startsWith(url)) {
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(600);
  }
  // CDP 真实点击序列（滚动到可见）
  const vis = await page.evaluate((cy) => cy > 60 && cy < 860, c.cy);
  if (!vis) { await page.evaluate((y) => window.scrollTo(0, y), Math.max(0, c.cy - 400)); await page.waitForTimeout(300); }
  const pos = await page.evaluate((sel) => {
    const a = document.querySelector(`a.doc-list-link[href="${sel}"]`);
    const r = a.getBoundingClientRect();
    return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) };
  }, c.href);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: pos.x, y: pos.y, button: 'left', clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pos.x, y: pos.y, button: 'left', clickCount: 1 });
  await page.waitForURL('**' + new URL('http://x'+c.href).pathname, { timeout: 20000 }).catch(()=>{});
  await page.waitForTimeout(500);
  const ok = page.url().includes(new URL('http://x'+c.href).pathname);
  console.log(c.href.split('/').pop(), ok ? 'NAV' : 'STAYED ' + page.url());
  if (!ok) bad++;
}
console.log('CDP click result: bad', bad, '/', cards.length);
await browser.close();
