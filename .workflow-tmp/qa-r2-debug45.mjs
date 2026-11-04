/* raw mouse click 立即导航成功！说明真实用户点击没问题；locator.click 卡在
   Playwright 的 actionability 某一步（很可能是 "receives events" 命中测试：
   card 中心被 elementFromPoint=hitIsSelf 通过……但 Playwright 用的是
   document.elementFromPoint? 或 hit target check 走 injected script 有差）。
   document.getAnimations() = 2 —— dev 下 stroke-dashoffset transition 未完成？
   running animations 使 Playwright 判定元素 "not stable"（动画中 bbox 不变但
   Playwright 的 stable 检测用 rAF 连续两帧相同 bbox —— transition 动画本身不改变 bbox）。
   getAnimations 2 个是什么动画？在 timeout 场景持续存在？ */
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
await page.waitForTimeout(400);
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(400);
const anims = await page.evaluate(() => document.getAnimations().map(a => ({
  name: a.animationName || a.transitionProperty || a.constructor.name,
  target: a.effect && a.effect.target ? a.effect.target.tagName + '.' + (a.effect.target.className||'').toString().slice(0,30) : '?',
  state: a.playState, time: a.currentTime,
})));
console.log('animations:', JSON.stringify(anims, null, 1));
await browser.close();
