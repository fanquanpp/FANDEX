/* 动画已 finished，bbox 稳定，pointer-events auto，hit 自身 —— locator.click 仍 timeout？
   最后一招：捕获 locator.click timeout 时 Playwright 的完整 call log（含卡在哪一步）*/
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
await page.waitForTimeout(400);
await page.locator('a.doc-list-link[href="/FANDEX/javascript/010-WhatIsJavaScript/"]').first().click({timeout: 8000});
await page.waitForURL('**/010-WhatIsJavaScript/', {timeout: 15000}).catch(()=>{});
await page.waitForTimeout(400);
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(400);
const card = page.locator('a.doc-list-link[href="/FANDEX/javascript/020-JavaScriptOverviewRuntimeEnv/"]').first();
try {
  await card.click({ timeout: 8000, trial: false });
  console.log('clicked ok');
} catch (e) {
  console.log('FULL ERROR:\n', String(e).slice(0, 1500));
}
await browser.close();
