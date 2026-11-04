/* 破案关键：goto 回跳后 cards in dom = 0，且 URL 检查 page.url() 是 /javascript/？不——
   打印显示 "before click url: .../010-WhatIsJavaScript/ cards in dom: 0"，即 goto 后
   page.url() 仍是 010！page.goto('/javascript/') 请求发生了（server log 200 /javascript/ 8ms）
   但 page.url() 没变 —— Astro ClientRouter 劫持了 goto？
   不，goto 是顶层导航。更可能：goto 后页面 URL 变成 /javascript/，但 Astro client router
   在浏览器里又把 URL 推回 010（history restoration! Astro Router 的 scroll/URL restore）。
   —— Astro view transitions 会 restore 之前的 history entry！
   验证：goto 后读 URL 两个时间点。 */
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
await page.waitForURL('**/010-WhatIsJavaScript/', {timeout: 20000}).catch(()=>{});
console.log('at doc page:', page.url());
await page.goto(url, { waitUntil: 'load' });
console.log('immediately after goto:', page.url());
await page.waitForTimeout(1500);
console.log('after 1.5s:', page.url());
await page.waitForTimeout(1500);
console.log('after 3s:', page.url());
const cards = await page.locator('a.doc-list-link').count();
console.log('cards in dom:', cards);
await browser.close();
