/* tooltip 机制：[data-tooltip]:hover::before 300ms delay；首页 hero 与 ds 用 computed ::before opacity 验证 */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const BASE = 'http://localhost:4321/FANDEX/';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

// 首页 module-card 是否带 data-tooltip
await page.goto(BASE, { waitUntil: 'load' });
await page.waitForTimeout(1000);
const withTip = await page.evaluate(() => [...document.querySelectorAll('[data-tooltip]')].slice(0,6).map(e => ({tag: e.tagName, cls: (e.className||'').toString().slice(0,40), tip: e.getAttribute('data-tooltip').slice(0,30)})));
console.log('home [data-tooltip]:', JSON.stringify(withTip));
const tipEl = page.locator('[data-tooltip]').first();
if (await tipEl.count()) {
  await tipEl.hover();
  await page.waitForTimeout(700);
  const o = await tipEl.evaluate(el => ({ beforeOp: getComputedStyle(el, '::before').opacity, beforeContent: getComputedStyle(el, '::before').content.slice(0,40) }));
  console.log('home tooltip hover:', JSON.stringify(o));
}

// ds [data-tooltip] hover
await page.goto(BASE+'design-system/', { waitUntil: 'load' });
await page.waitForTimeout(1200);
const dsTip = page.locator('[data-tooltip]').first();
console.log('ds [data-tooltip] count:', await page.locator('[data-tooltip]').count());
if (await dsTip.count()) {
  const info = await dsTip.evaluate(el => ({cls: el.className.toString().slice(0,50), tip: el.getAttribute('data-tooltip').slice(0,30)}));
  await dsTip.hover();
  await page.waitForTimeout(700);
  const o = await dsTip.evaluate(el => ({ beforeOp: getComputedStyle(el, '::before').opacity, content: getComputedStyle(el, '::before').content.slice(0,30) }));
  console.log('ds tooltip', JSON.stringify(info), 'hover:', JSON.stringify(o));
}

// ds radix Tooltip 组件（若有）：找 TooltipDemo
const radixTrig = page.locator('[data-radix-collection-item], [data-state]').first();
if (await radixTrig.count()) {
  await radixTrig.hover();
  await page.waitForTimeout(900);
  const t = await page.evaluate(() => {
    const el = document.querySelector('[role="tooltip"], [data-radix-popper-content-wrapper]');
    return el ? { text: el.textContent.slice(0,40), vis: el.getBoundingClientRect().width > 0 } : null;
  });
  console.log('ds radix tooltip:', JSON.stringify(t));
}
await browser.close();
