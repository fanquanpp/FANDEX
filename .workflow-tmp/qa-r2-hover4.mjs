/* 首页 hero entry（.hero-entries a[data-tooltip]）hover tooltip + doc 卡片 hover 背景 */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const BASE = 'http://localhost:4321/FANDEX/';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

// hero entry tooltip
await page.goto(BASE, { waitUntil: 'load' });
await page.waitForTimeout(1000);
const hero = page.locator('.hero-entries a[data-tooltip]').first();
console.log('hero entries with tooltip:', await page.locator('.hero-entries a[data-tooltip]').count());
if (await hero.count()) {
  await hero.hover();
  await page.waitForTimeout(700);
  const o = await hero.evaluate(el => ({ op: getComputedStyle(el, '::before').opacity, c: getComputedStyle(el, '::before').content.slice(0,40) }));
  console.log('hero tooltip on hover:', JSON.stringify(o));
}

// module-card hover：卡片本身有没有 hover 样式（bg/transform）
const card = page.locator('a.module-card').first();
const c1 = await card.evaluate(el => { const s = getComputedStyle(el); return {bg: s.backgroundColor, tf: s.transform, bc: s.borderColor, sh: s.boxShadow.slice(0,40)}; });
await card.hover();
await page.waitForTimeout(500);
const c2 = await card.evaluate(el => { const s = getComputedStyle(el); return {bg: s.backgroundColor, tf: s.transform, bc: s.borderColor, sh: s.boxShadow.slice(0,40)}; });
console.log('module-card hover:', JSON.stringify(c1), '->', JSON.stringify(c2));

// doc-list-link hover（模块列表页卡片）
await page.goto(BASE+'javascript/', { waitUntil: 'load' });
await page.waitForTimeout(900);
const dl = page.locator('a.doc-list-link').first();
const d1 = await dl.evaluate(el => { const s = getComputedStyle(el); return {bg: s.backgroundColor, tf: s.transform, sh: s.boxShadow.slice(0,30)}; });
await dl.hover();
await page.waitForTimeout(500);
const d2 = await dl.evaluate(el => { const s = getComputedStyle(el); return {bg: s.backgroundColor, tf: s.transform, sh: s.boxShadow.slice(0,30)}; });
console.log('doc-list-link hover:', JSON.stringify(d1), '->', JSON.stringify(d2));
await browser.close();
