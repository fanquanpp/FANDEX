/* debug30 STAYED vs debug31 NAVIGATED：差异在 click 后等待方式。
   debug30: click 后立即 console.log(page.url()) —— Playwright click 返回时
   导航可能尚未开始？不，click 会等导航稳定。也可能 debug30 点时页面刚 domcontentloaded+400ms，
   hydration 中途 click 落在 href 变更前？
   控制变量实验：domcontentloaded+400ms vs load+700ms，各 6 次，统计 STAYED 比例 */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.setDefaultTimeout(8000);
const label = '001入门JavaScript 是什么：你的第一';
for (const mode of ['dcl+400', 'load+700']) {
  let stayed = 0, navigated = 0;
  for (let i = 0; i < 6; i++) {
    if (mode === 'dcl+400') { await page.goto('http://localhost:4321/FANDEX/javascript/', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(400); }
    else { await page.goto('http://localhost:4321/FANDEX/javascript/', { waitUntil: 'load' }); await page.waitForTimeout(700); }
    const loc = page.locator('a', { hasText: label }).first();
    try {
      await loc.click({ timeout: 5000 });
      await page.waitForTimeout(1500);
      if (page.url().includes('010-WhatIsJavaScript')) navigated += 1; else stayed += 1;
    } catch { stayed += 1; }
  }
  console.log(mode, '-> navigated', navigated, 'stayed', stayed);
}
await browser.close();
