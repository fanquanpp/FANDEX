/* URL 恒定 /javascript/，无 restore。那 54 的 dump url=/010 是怎么回事？
   —— 54 里 goto 在 waitForURL 25s 超时分支后执行：waitForURL .catch 后立即 goto。
   但 54 打印 NAV…… wait, 54 循环体：if (!page.url().startsWith(url)) goto。
   第一轮 page.url() = /javascript/ → 不 goto，直接点 card1。NAV 后 URL=010。
   第二轮 startsWith(url)=false → goto + 800ms。但 dump 显示 010！
   —— goto 竟然没生效？page.goto 返回 response，但如果 Astro ClientRouter 在 goto
   请求到达前用 history.pushState 抢先？不可能改 URL 到 010。
   —— 除非 goto 的 response 是 010 的 HTML！dev server 对 /javascript/ 的请求被
   Astro dev 的 client-router-aware 缓存/重定向搞错？
   直接验证：goto 后立即 dump response.status() 和 response.url()。 */
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
for (let i = 0; i < 3; i++) {
  const resp = await page.goto(url, { waitUntil: 'load' });
  console.log('goto resp:', resp && resp.status(), resp && resp.url(), '| page.url:', page.url());
  const st = await page.evaluate(() => ({ path: location.pathname, cards: document.querySelectorAll('a.doc-list-link').length, title: document.title.slice(0,30) }));
  console.log('  dom:', JSON.stringify(st));
  await page.waitForTimeout(600);
}
await browser.close();
