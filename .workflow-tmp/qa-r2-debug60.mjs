/* 复核 final2 的 5 个 BUG 疑点：
   A5 主题：loc .fndx-theme-toggle 匹配到 button（aria-label 变化），点击后 data-theme 仍 light？
      —— r2 main 阶段曾观测 htmlAttrs(light,zh->light,en) 证明点击有效（那次点的是 lang?）。
      手工单测：点击前读 aria-label，点击后再读 data-theme + aria-label。
   A7 返回顶部：main 滚动 800 后点击无效果？也许滚动容器不是 #app-main。
   B doc tab：tabpanel 选择器可能不对（React island Tabs?）。
   C ds 锚点：锚点 href="#app-main" 点击后 hash 空 —— 可能有 preventDefault 的 smooth scroll。 */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const BASE = 'http://localhost:4321/FANDEX/';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.setDefaultTimeout(8000);

/* A5 theme */
await page.goto(BASE, { waitUntil: 'load' });
await page.waitForTimeout(1000);
const t0 = await page.evaluate(() => ({ theme: document.documentElement.getAttribute('data-theme'), aria: document.querySelector('.fndx-theme-toggle')?.getAttribute('aria-label'), ls: localStorage.getItem('fandex-theme') }));
await page.locator('.fndx-theme-toggle').first().click();
await page.waitForTimeout(800);
const t1 = await page.evaluate(() => ({ theme: document.documentElement.getAttribute('data-theme'), aria: document.querySelector('.fndx-theme-toggle')?.getAttribute('aria-label'), ls: localStorage.getItem('fandex-theme') }));
console.log('theme before:', JSON.stringify(t0));
console.log('theme after :', JSON.stringify(t1));

/* A7 back-to-top：找真正的滚动容器 */
await page.goto(BASE, { waitUntil: 'load' });
await page.waitForTimeout(1000);
const scrollInfo = await page.evaluate(() => {
  const cands = ['#app-main', 'main', document.scrollingElement];
  const out = [];
  for (const c of cands) {
    const el = typeof c === 'string' ? document.querySelector(c) : c;
    if (el) out.push({ sel: typeof c === 'string' ? c : 'scrollingElement', scrollTop: el.scrollTop, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight });
  }
  return out;
});
console.log('scroll containers:', JSON.stringify(scrollInfo));
// 滚 window
await page.evaluate(() => window.scrollTo(0, 900));
await page.waitForTimeout(400);
const btVisible = await page.evaluate(() => { const b = document.getElementById('nav-back-to-top'); return b ? { vis: b.getBoundingClientRect().width > 0, cls: b.className.toString().slice(0,50) } : { missing: true }; });
console.log('back-to-top after window scroll:', JSON.stringify(btVisible));
await page.locator('#nav-back-to-top').click().catch(e => console.log('  bt click err', String(e).split('\n')[0].slice(0,70)));
await page.waitForTimeout(1200);
const st = await page.evaluate(() => ({ winY: window.scrollY, mainTop: document.getElementById('app-main')?.scrollTop, se: document.scrollingElement.scrollTop }));
console.log('after bt click:', JSON.stringify(st));

/* B tabs 检查 role=tab 所在组件 */
await page.goto(BASE + 'javascript/010-WhatIsJavaScript/', { waitUntil: 'load' });
await page.waitForTimeout(1800);
const tabInfo = await page.evaluate(() => [...document.querySelectorAll('[role="tab"]')].map(t => ({ id: t.id, cls: t.className.toString().slice(0, 40), text: (t.textContent || '').trim().slice(0, 10), parentCls: t.parentElement?.className?.toString?.().slice(0, 40) })));
console.log('doc tabs:', JSON.stringify(tabInfo));
await page.locator('[role="tab"]').nth(1).click().catch(e => console.log('  tab click err'));
await page.waitForTimeout(900);
const tabAfter = await page.evaluate(() => ({
  selected: [...document.querySelectorAll('[role="tab"]')].map(t => t.getAttribute('aria-selected')),
  panels: [...document.querySelectorAll('[role="tabpanel"]')].map(p => ({ hidden: p.hidden, h: Math.round(p.getBoundingClientRect().height) })),
  anyListChanged: document.querySelectorAll('.fndx-sidebar__link').length,
}));
console.log('after tab2 click:', JSON.stringify(tabAfter).slice(0, 300));
await browser.close();
