/* 定时差异验证：domcontentloaded+400ms 时点击是否慢路由（Astro dev 视图转换？）。
   跑 5 次统计 URL 变化延时 */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.setDefaultTimeout(8000);
const label = '01JavaScript 是什么：你的第一门编程语言';
for (let i = 0; i < 5; i++) {
  await page.goto('http://localhost:4321/FANDEX/javascript/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  const loc = page.locator('a', { hasText: label.slice(0, 24) }).first();
  const t0 = Date.now();
  try {
    await loc.click({ timeout: 5000 });
    // 等 URL 变化（最长 5s）
    await page.waitForURL('**/010-WhatIsJavaScript/', { timeout: 5000 }).catch(() => {});
    console.log(i, 'click+' + (Date.now()-t0) + 'ms url=', page.url().includes('010') ? 'NAVIGATED' : page.url());
  } catch (e) { console.log(i, 'CLICK TIMEOUT', String(e).split('\n')[0]); }
  await page.waitForTimeout(600);
}
await browser.close();
