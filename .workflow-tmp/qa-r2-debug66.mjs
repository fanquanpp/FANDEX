/* ds TOC 链接在 <details class="ds-toc"> 内 —— 面板未展开（details 未 open）时链接
   不可见 → Playwright click 等待可见超时（这是 main sweep 里 4 条 ds [low] 的解释）。
   正确流程：先 open details，再点链接。这同时验证 details 交互。 */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const BASE = 'http://localhost:4321/FANDEX/';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.setDefaultTimeout(8000);
await page.goto(BASE + 'design-system/', { waitUntil: 'load' });
await page.waitForTimeout(1100);
const details = page.locator('details.ds-toc').first();
await details.scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
// open details via summary click
await page.locator('summary.ds-toc__bar').click();
await page.waitForTimeout(500);
const isOpen = await page.evaluate(() => document.querySelector('details.ds-toc')?.open);
console.log('details open after summary click:', isOpen);
// 点第一条 TOC 链接
const link = page.locator('a.ds-toc__link').first();
const before = await page.evaluate(() => (document.getElementById('app-main') || document.scrollingElement).scrollTop);
await link.click({ timeout: 6000 });
await page.waitForTimeout(1000);
const after = await page.evaluate(() => ({ scroll: (document.getElementById('app-main') || document.scrollingElement).scrollTop, hash: decodeURIComponent(location.hash) }));
console.log('before scroll:', before, 'after:', JSON.stringify(after), 'jumped:', after.scroll > before + 100 || after.hash === '#ds-toctitle');
// 关闭 details（再次点 summary）
await page.locator('summary.ds-toc__bar').click();
await page.waitForTimeout(400);
const closed = await page.evaluate(() => !document.querySelector('details.ds-toc')?.open);
console.log('details closed after second summary click:', closed);
// ds accordion（若存在）
const acc = page.locator('[data-state="open"], .ds-acc__item, details').nth(1);
console.log('details count:', await page.locator('details').count());
await browser.close();
