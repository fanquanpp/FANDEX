/* 精查两个疑点：1) NetworkFlow 侧栏"图算法"（y=-114 滚动到可见再点） 2) syntax 快捷 chip ?lang= */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const BASE = 'http://localhost:4321/FANDEX/';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

// 1) NetworkFlow sidebar 图算法（scrollIntoView 后点击）
await page.goto(BASE+'algorithm/290-NetworkFlow/', { waitUntil: 'load' });
await page.waitForTimeout(900);
const link = page.locator('.fndx-sidebar__link', { hasText: '图算法' }).first();
await link.scrollIntoViewIfNeeded().catch(()=>{});
await page.waitForTimeout(300);
await link.click({ timeout: 6000 }).catch(e => console.log('sidebar 图算法 click err', String(e).slice(0,90)));
await page.waitForTimeout(1200);
console.log('sidebar 图算法 after scrollIntoView+click:', page.url());

// 2) syntax JS quick chip：检查点击后 URL/DOM
await page.goto(BASE+'syntax/', { waitUntil: 'load' });
await page.waitForTimeout(1500);
const chip = page.locator('.syntax-quick__chip[href="?lang=javascript"]').first();
const before = await page.evaluate(() => ({url: location.href, active: [...document.querySelectorAll('.is-active')].map(e=>e.className.toString().slice(0,30)).slice(0,6)}));
await chip.click({ timeout: 6000 }).catch(e => console.log('chip click err', String(e).slice(0,90)));
await page.waitForTimeout(1500);
const after = await page.evaluate(() => ({url: location.href, active: [...document.querySelectorAll('.is-active')].map(e=>e.className.toString().slice(0,30)).slice(0,6), cards: document.querySelectorAll('.syntax-card').length}));
console.log('syntax chip before:', JSON.stringify(before));
console.log('syntax chip after :', JSON.stringify(after));
await browser.close();
