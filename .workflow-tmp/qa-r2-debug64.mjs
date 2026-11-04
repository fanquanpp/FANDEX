/* back-to-top 只在 doc 变体 header 渲染（SiteHeader.astro:50 variant==='doc'）。
   首页 variant 非 doc → 无按钮（前面 debug60 "missing" 符合设计，非缺陷）。
   在文档页验证它：app-main 滚动 + 点击回顶。 */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const BASE = 'http://localhost:4321/FANDEX/';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.setDefaultTimeout(8000);
await page.goto(BASE + 'javascript/010-WhatIsJavaScript/', { waitUntil: 'load' });
await page.waitForTimeout(1400);
const v0 = await page.evaluate(() => { const b = document.getElementById('nav-back-to-top'); return b ? b.getBoundingClientRect().width > 0 : false; });
await page.evaluate(() => { const m = document.getElementById('app-main'); if (m) m.scrollTo(0, 900); });
await page.waitForTimeout(500);
await page.locator('#nav-back-to-top').click({ timeout: 5000 }).catch(e => console.log('click err', String(e).split('\n')[0].slice(0, 60)));
await page.waitForTimeout(1300);
const top = await page.evaluate(() => document.getElementById('app-main')?.scrollTop);
console.log('doc page: bt visible=' + v0 + ' scrollTop after click=' + top);
// ds 锚点：ds-toc__link 点击
await page.goto(BASE + 'design-system/', { waitUntil: 'load' });
await page.waitForTimeout(1000);
const tocLink = page.locator('a.ds-toc__link[href="#ds-toctitle"]').first();
await tocLink.scrollIntoViewIfNeeded().catch(() => {});
await tocLink.click({ timeout: 5000 }).catch(e => console.log('toc click err', String(e).split('\n')[0].slice(0, 60)));
await page.waitForTimeout(1000);
const dsSt = await page.evaluate(() => ({ hash: decodeURIComponent(location.hash), scrolled: (document.getElementById('app-main') || document.scrollingElement).scrollTop }));
console.log('ds toc link click:', JSON.stringify(dsSt));
await browser.close();
