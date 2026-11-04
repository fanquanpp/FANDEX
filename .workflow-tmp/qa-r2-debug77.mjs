/* 补充受影响面：learning-path/javascript/ 与 syntax 已证；测 /algorithms/（React island?
   状态计数器在 main 阶段 pass）与 /ai/ 页 lang 点击 island 存活（这两个 r1 pass）。
   同时精确测 doc 页（sidebar_modules island 也用 useLang，但 010 页无 sidebar 模块树?）
   用 /javascript/ 列表页 SidebarModules（r1 有 view tabs = React island）。 */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const BASE = 'http://localhost:4321/FANDEX/';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push({ url: page.url().replace('http://localhost:4321/FANDEX',''), msg: String(e).slice(0, 80) }));
// /javascript/ 列表页（SidebarModules view tabs 是 React island）
await page.goto(BASE + 'javascript/', { waitUntil: 'load' });
await page.waitForTimeout(1700);
const b1 = await page.evaluate(() => ({ tabs: document.querySelectorAll('[role="tab"]').length, links: document.querySelectorAll('.fndx-sidebar__link').length }));
await page.locator('[data-lang-toggle]').first().click();
await page.waitForTimeout(1500);
const a1 = await page.evaluate(() => ({ tabs: document.querySelectorAll('[role="tab"]').length, links: document.querySelectorAll('.fndx-sidebar__link').length }));
console.log('/javascript/ island:', JSON.stringify(b1), '->', JSON.stringify(a1), 'errors:', errs.length, errs[0]?.msg || '');
errs.length = 0;
// /algorithms/
await page.goto(BASE + 'algorithms/', { waitUntil: 'load' });
await page.waitForTimeout(1500);
const b2 = await page.evaluate(() => ({ items: document.querySelectorAll('[data-algo-item]').length }));
await page.locator('[data-lang-toggle]').first().click();
await page.waitForTimeout(1500);
const a2 = await page.evaluate(() => ({ items: document.querySelectorAll('[data-algo-item]').length }));
console.log('/algorithms/ island:', JSON.stringify(b2), '->', JSON.stringify(a2), 'errors:', errs.length, errs[0]?.msg || '');
errs.length = 0;
// /ai/
await page.goto(BASE + 'ai/', { waitUntil: 'load' });
await page.waitForTimeout(1500);
const b3 = await page.evaluate(() => ({ inputs: document.querySelectorAll('input').length, btns: document.querySelectorAll('button').length }));
await page.locator('[data-lang-toggle]').first().click();
await page.waitForTimeout(1500);
const a3 = await page.evaluate(() => ({ inputs: document.querySelectorAll('input').length, btns: document.querySelectorAll('button').length }));
console.log('/ai/ island:', JSON.stringify(b3), '->', JSON.stringify(a3), 'errors:', errs.length, errs[0]?.msg || '');
await browser.close();
