/* hover 深检：首页卡片 CSS tooltip、ds radix tooltip、模块页卡片 hover 背景 */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const BASE = 'http://localhost:4321/FANDEX/';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

// 1) 首页 module-card hover：::after tooltip（data-tooltip attr + CSS content）
await page.goto(BASE, { waitUntil: 'load' });
await page.waitForTimeout(1200);
const card = page.locator('a.module-card').first();
const before = await card.evaluate(el => getComputedStyle(el, '::after').content);
await card.hover();
await page.waitForTimeout(500);
const after = await card.evaluate(el => ({
  content: getComputedStyle(el, '::after').content,
  opacity: getComputedStyle(el, '::after').opacity,
  bg: getComputedStyle(el).backgroundColor,
}));
console.log('module-card ::after before:', before, 'after:', JSON.stringify(after));

// 2) ds radix tooltip hover（Trigger 上方）
await page.goto(BASE+'design-system/', { waitUntil: 'load' });
await page.waitForTimeout(1500);
const tipTriggers = page.locator('[data-side], button[data-radix-collection-item]');
const n = await tipTriggers.count();
console.log('ds tooltip trigger candidates:', n);
// 找 Tooltip 触发器：文本含 hover/Tooltip
const tBtn = page.locator('button', { hasText: /Hover|Tooltip|悬停/i }).first();
if (await tBtn.count()) {
  await tBtn.hover();
  await page.waitForTimeout(800);
  const tip = await page.evaluate(() => {
    const t = document.querySelector('[data-radix-popper-content-wrapper], [role="tooltip"]');
    return t ? { vis: t.getBoundingClientRect().width > 0, text: t.textContent.slice(0,40) } : null;
  });
  console.log('ds tooltip after hover:', JSON.stringify(tip));
} else console.log('no tooltip trigger button found');

// 3) 模块列表页 doc 卡片 hover 背景
await page.goto(BASE+'javascript/', { waitUntil: 'load' });
await page.waitForTimeout(900);
const dc = page.locator('a.doc-list-link').first();
const bg1 = await dc.evaluate(el => getComputedStyle(el).backgroundColor);
await dc.hover();
await page.waitForTimeout(400);
const bg2 = await dc.evaluate(el => getComputedStyle(el).backgroundColor);
console.log('doc-list-link bg before:', bg1, 'after:', bg2, bg1 !== bg2 ? '(hover feedback OK)' : '(no change)');
await browser.close();
