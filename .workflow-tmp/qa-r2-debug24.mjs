/* 灾难确认：click 后 React 树是否卸载（island 死亡：chip 按钮/卡片网格全部消失？） */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto('http://localhost:4321/FANDEX/syntax/', { waitUntil: 'load' });
await page.locator('.syntax-lang-chip.is-active').waitFor({timeout: 10000}).catch(()=>{});
await page.waitForTimeout(1200);
const before = await page.evaluate(() => ({
  chips: document.querySelectorAll('.syntax-lang-chip').length,
  filter: !!document.querySelector('.syntax-filter__input'),
  cards: document.querySelectorAll('.syntax-card').length,
  moreBtn: document.querySelectorAll('.syntax-more').length,
  meta: document.querySelectorAll('.syntax-meta').length,
}));
await page.locator('[data-lang-toggle]').first().click();
await page.waitForTimeout(1800);
const after = await page.evaluate(() => ({
  chips: document.querySelectorAll('.syntax-lang-chip').length,
  filter: !!document.querySelector('.syntax-filter__input'),
  cards: document.querySelectorAll('.syntax-card').length,
  moreBtn: document.querySelectorAll('.syntax-more').length,
  meta: document.querySelectorAll('.syntax-meta').length,
  explorerHtmlLen: document.querySelector('.syntax-explorer')?.innerHTML.length || 0,
}));
console.log('island before:', JSON.stringify(before));
console.log('island after :', JSON.stringify(after));
// learning-path/javascript/ island
await page.goto('http://localhost:4321/FANDEX/learning-path/javascript/', { waitUntil: 'load' });
await page.waitForTimeout(2200);
const lpBefore = await page.evaluate(() => ({ canvas: !!document.querySelector('canvas'), nodes: document.querySelectorAll('[class*=lp-node], [class*=map-node]').length }));
await page.locator('[data-lang-toggle]').first().click();
await page.waitForTimeout(1800);
const lpAfter = await page.evaluate(() => ({ canvas: !!document.querySelector('canvas'), nodes: document.querySelectorAll('[class*=lp-node], [class*=map-node]').length }));
console.log('lp island before:', JSON.stringify(lpBefore), 'after:', JSON.stringify(lpAfter));
await browser.close();
