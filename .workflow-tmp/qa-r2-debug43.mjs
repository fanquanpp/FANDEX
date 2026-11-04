/* click 等什么？ 打开 playwright debug 日志级别不可行。改测 actionability 子项：
   visible/stable/enabled/receives events。
   在 timeout 场景下检查 locator 状态：card2 的 boundingbox 是否持续变化（stable 失败）？
   首页 reveal 动画 stroke-dashoffset 0.8s…… 但 rAF 动画让 bbox 变化？ bbox 是 a 元素。
   检查 fndx-scroll-reveal-fade 初始 opacity 0 -> 动画后 1？若动画未跑（IntersectionObserver
   因 scroll restoration 未触发），a 一直 opacity 0.001？可是 rect/hit 都正常。
   —— 重新想：click 前 waitForURL 等 URL 变成 010 后，页面是 doc 页；再 goto 回列表页。
   Astro client router 的 <html> 上可能有 astro-transition 状态……
   直接量：回跳后 locator.click 期间每 200ms 采样 bbox。 */
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
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(400);
// 采样 card2 bbox 3 秒
const samples = await page.evaluate(() => new Promise((resolve) => {
  const a = document.querySelector('a.doc-list-link[href="/FANDEX/javascript/020-JavaScriptOverviewRuntimeEnv/"]');
  const out = [];
  let n = 0;
  const iv = setInterval(() => {
    const r = a.getBoundingClientRect();
    const cs = getComputedStyle(a);
    out.push({ y: Math.round(r.y*10)/10, h: Math.round(r.h||r.height*10)/10, opacity: cs.opacity, vis: cs.visibility, cls: a.className.toString().slice(0,30) });
    if (++n >= 10) { clearInterval(iv); resolve(out); }
  }, 300);
}));
console.log(JSON.stringify(samples, null, 1).slice(0, 1200));
await browser.close();
