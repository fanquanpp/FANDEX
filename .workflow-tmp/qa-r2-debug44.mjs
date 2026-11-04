/* bbox 稳定、可见、可命中。click 却 30s timeout。
   Playwright click 流程：wait actionability -> mouse down/up -> 等 created navigations?
   不：click 不等导航。剩下唯一卡点：Playwright 内部 autoscroll？或 <html> 有
   pointer-events: none？（Astro view transition 期间 html[data-astro-transition] 常加
   ::view-transition 层；astro-dev 的 ClientRouter 可能在 swap 后留下 transition 状态。）
   检查 html/body pointer-events + ::view-transition 伪元素。 */
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
await page.waitForTimeout(400);
await page.locator('a.doc-list-link[href="/FANDEX/javascript/010-WhatIsJavaScript/"]').first().click({timeout: 8000});
await page.waitForURL('**/010-WhatIsJavaScript/', {timeout: 15000}).catch(()=>{});
await page.waitForTimeout(500);
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(400);
const st = await page.evaluate(() => ({
  htmlPE: getComputedStyle(document.documentElement).pointerEvents,
  bodyPE: getComputedStyle(document.body).pointerEvents,
  htmlAttrs: [...document.documentElement.attributes].map(a=>a.name+'='+a.value).join(' '),
  vt: document.getAnimations ? document.getAnimations().length : -1,
  hasVtRoot: !!document.querySelector('::view-transition'),
  astroIslandPending: [...document.querySelectorAll('astro-island')].filter(i=>!i.getAttribute('ssr')).length,
}));
console.log(JSON.stringify(st, null, 1));
// 真实鼠标事件点击（绕过 actionability）
await page.mouse.click(852, 333);
await page.waitForTimeout(2500);
console.log('after raw mouse click:', page.url());
await browser.close();
