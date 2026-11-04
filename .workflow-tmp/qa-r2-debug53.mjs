/* "NOT FOUND"：goto 回跳后 a.doc-list-link 不存在！看回跳后 DOM 到底是什么页面
   （也许 Astro ClientRouter 把 goto 变成 soft nav 且渲染了 010 的 DOM？） */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.setDefaultTimeout(8000);
const url = 'http://localhost:4321/FANDEX/javascript/';
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(600);
// 点击 card1（不用 waitForURL，等 1.2s 就 goto —— 制造"路由器仍在途"场景）
await page.locator('a.doc-list-link[href="/FANDEX/javascript/010-WhatIsJavaScript/"]').first().click({timeout: 8000});
await page.waitForTimeout(1200);
console.log('url after 1.2s:', page.url());
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(900);
const state = await page.evaluate(() => ({
  url: location.pathname,
  cards: document.querySelectorAll('a.doc-list-link').length,
  title: document.title.slice(0, 40),
  isDocPage: !!document.querySelector('.prose'),
  sidebarLinks: document.querySelectorAll('.fndx-sidebar__link').length,
}));
console.log('after goto back:', JSON.stringify(state));
await browser.close();
