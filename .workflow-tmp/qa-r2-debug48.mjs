/* waitForURL 后页面停在 010（card1 目标页）——card1 NAV 确认；然后 goto 回列表页再点 card2 依然 timeout。
   与 debug46（clicked ok）差异：46 在 goto 回跳前多等了 400ms？不，47 也是 goto load+600ms。
   46 与 47 唯一区别：46 的 waitForURL 是 15s，47 是 20s 且 46 里 waitForURL 成功与否未知。
   —— 深挖：回跳 goto 时 Astro dev 服务端还在处理 client router 的 fetch？服务端单线程卡住？
   检查 dev server log 是否有 500。另外试：回跳后先 waitForLoadState('networkidle') 再点 */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.setDefaultTimeout(8000);
const url = 'http://localhost:4321/FANDEX/javascript/';
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(600);
const hrefs = await page.evaluate(() => [...document.querySelectorAll('a.doc-list-link')].map(a => a.getAttribute('href')).slice(0, 6));
let bad = 0;
for (const href of hrefs) {
  if (!page.url().startsWith(url)) {
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForLoadState('networkidle').catch(()=>{});
    await page.waitForTimeout(600);
  }
  const card = page.locator(`a.doc-list-link[href="${href}"]`).first();
  try {
    await card.click({ timeout: 12000 });
    await page.waitForURL('**' + new URL('http://x'+href).pathname, { timeout: 20000 }).catch(()=>{});
    await page.waitForLoadState('networkidle').catch(()=>{});
    const ok = page.url().includes(new URL('http://x'+href).pathname);
    console.log(href.split('/').pop(), ok ? 'NAV' : 'STAYED ' + page.url());
    if (!ok) bad++;
  } catch (e) { bad++; console.log(href.split('/').pop(), 'CLICK-TIMEOUT'); }
}
console.log('bad:', bad, '/', hrefs.length);
await browser.close();
