/* 破案：page.url() 显示 /javascript/010（card1 的目标页），而 location.pathname 同样是 010。
   即 goto('/javascript/') 之后浏览器真实停在 010！上一次 51 测出"goto 后 URL 正常"，
   但那次 card1 点击后 waitForURL 成功（完整到达）。54 中 waitForURL(25s) 成功 NAV ——
   可 dump 显示 URL 又回到 010……矛盾。唯一解释：Astro ClientRouter 的 history restore
   在 goto 落地后又把 URL 换回 010（popstate 恢复）。
   验证：goto 回跳后每 200ms 记录 URL，看是否先 /javascript/ 后变 010。 */
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
await page.locator('a.doc-list-link[href="/FANDEX/javascript/010-WhatIsJavaScript/"]').first().click({timeout: 8000});
await page.waitForURL('**/010-WhatIsJavaScript/', {timeout: 25000}).catch(()=>{});
console.log('on doc:', page.url());
await page.goto(url, { waitUntil: 'load' });
// 立即高频采样
const urlLog = await page.evaluate(() => new Promise((res) => {
  const log = [];
  const t0 = Date.now();
  const iv = setInterval(() => {
    log.push(((Date.now()-t0)) + 'ms:' + location.pathname.split('/').slice(-2).join('/'));
    if (Date.now()-t0 > 3000) { clearInterval(iv); res(log); }
  }, 200);
}));
console.log(urlLog.join('\n'));
await browser.close();
