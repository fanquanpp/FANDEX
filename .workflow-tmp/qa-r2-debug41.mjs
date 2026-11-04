/* card2 单独点击后 STAYED！第一张卡后回跳，第二张卡点击无效——可复现。
   现在：点击后监听 Astro client router 是否吞掉；检查 astro:page-load / before-prevent。
   试：click 后手动 dispatch navigate？先看 click 后 5s 内 URL 是否最终变化（迟滞导航）*/
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
await page.waitForTimeout(500);
await page.locator('a.doc-list-link[href="/FANDEX/javascript/010-WhatIsJavaScript/"]').first().click({timeout:6000});
await page.waitForTimeout(900);
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(500);
const events = [];
page.exposeFunction('logEvt', (s) => events.push(s)).catch(()=>{});
await page.evaluate(() => {
  ['astro:before-preparation','astro:after-preparation','astro:before-swap','astro:after-swap','astro:page-load','click'].forEach((n) =>
    document.addEventListener(n, (e) => { if (n==='click' || e.isTrusted !== false) window.logEvt(n + (n==='click' ? ' target='+(e.target.tagName||'') : '')); }, true));
  // 拦截 fetch（Astro client router 用 fetch 换页）
  const of = window.fetch;
  window.fetch = function(...args) { window.logEvt('fetch ' + String(args[0]).slice(0,60)); return of.apply(this, args); };
});
const card = page.locator('a.doc-list-link[href="/FANDEX/javascript/020-JavaScriptOverviewRuntimeEnv/"]').first();
await card.click({ timeout: 5000 }).catch(e=>console.log('click err'));
await page.waitForTimeout(4000);
console.log('url:', page.url());
console.log('events:', events.slice(0, 20));
await browser.close();
