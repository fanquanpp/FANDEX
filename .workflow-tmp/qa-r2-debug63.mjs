/* theme 三态闭环确认（system->light->dark->system 完整）。剩余疑点收尾：
   A7 back-to-top：首页 nav-back-to-top 在 window.scrollY=900 时 missing —— 出现条件？
      读 src（layout-interactions 或 nav 相关）确认显隐逻辑，然后按正确触发条件验证。
   B doc tabs：aria-selected 正确翻转（章节/全部）—— final2 的 visiblePanels=0 是我的
      selector [role=tabpanel] 不匹配（该组件不用 tabpanel role）。确认列表切换实际发生。
   C ds 锚点：a[href="#app-main"] 点击后 hash 空且 scroll 0 —— 是否 preventDefault？
      查 ds 页 TOC 链接的处理。 */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const BASE = 'http://localhost:4321/FANDEX/';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.setDefaultTimeout(8000);

/* A7: main 滚动容器滚动 800 */
await page.goto(BASE, { waitUntil: 'load' });
await page.waitForTimeout(1100);
const vis0 = await page.evaluate(() => { const b = document.getElementById('nav-back-to-top'); return b ? b.getBoundingClientRect().width > 0 : false; });
console.log('bt visible at top:', vis0);
await page.evaluate(() => { const m = document.getElementById('app-main'); if (m) m.scrollTo(0, 800); });
await page.waitForTimeout(600);
const vis1 = await page.evaluate(() => { const b = document.getElementById('nav-back-to-top'); return b ? b.getBoundingClientRect().width > 0 : false; });
console.log('bt visible after app-main scroll 800:', vis1);
if (vis1) {
  await page.locator('#nav-back-to-top').click({ timeout: 5000 });
  await page.waitForTimeout(1100);
  const top = await page.evaluate(() => document.getElementById('app-main')?.scrollTop);
  console.log('after click app-main scrollTop:', top);
}

/* B: doc tab 切换后侧栏列表真实变化（章节视图 vs 全部视图） */
await page.goto(BASE + 'javascript/010-WhatIsJavaScript/', { waitUntil: 'load' });
await page.waitForTimeout(1700);
const listBefore = await page.evaluate(() => ({
  chapters: [...document.querySelectorAll('[role="tab"]')].map(t => t.getAttribute('aria-selected')).join(','),
  groupCount: document.querySelectorAll('.fndx-sidebar__group, .fndx-sidebar__chapter').length,
  linkCount: document.querySelectorAll('.fndx-sidebar__link').length,
}));
await page.locator('[role="tab"]').nth(1).click();
await page.waitForTimeout(900);
const listAfter = await page.evaluate(() => ({
  selected: [...document.querySelectorAll('[role="tab"]')].map(t => t.getAttribute('aria-selected')).join(','),
  groupCount: document.querySelectorAll('.fndx-sidebar__group, .fndx-sidebar__chapter').length,
  linkCount: document.querySelectorAll('.fndx-sidebar__link').length,
}));
console.log('doc tab before:', JSON.stringify(listBefore));
console.log('doc tab after :', JSON.stringify(listAfter));
const tabOk = listBefore.selected !== listAfter.selected && (listBefore.groupCount !== listAfter.groupCount || listBefore.linkCount !== listAfter.linkCount);
console.log('tab switch real:', tabOk);
// 切回
await page.locator('[role="tab"]').nth(0).click();
await page.waitForTimeout(700);
const back = await page.evaluate(() => [...document.querySelectorAll('[role="tab"]')].map(t => t.getAttribute('aria-selected')).join(','));
console.log('tab back:', back);

/* C: ds 锚点行为检查 */
await page.goto(BASE + 'design-system/', { waitUntil: 'load' });
await page.waitForTimeout(900);
const anchorInfo = await page.evaluate(() => [...document.querySelectorAll('a[href^="#"]')].slice(0, 3).map(a => ({ h: a.getAttribute('href'), cls: a.className.toString().slice(0, 40) })));
console.log('ds anchors:', JSON.stringify(anchorInfo));
await browser.close();
