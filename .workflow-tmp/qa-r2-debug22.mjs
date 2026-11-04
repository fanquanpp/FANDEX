/* 终验：单次点击是否复现（真实用户路径） */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push({url: page.url().replace('http://localhost:4321/FANDEX',''), msg: String(e).slice(0,80)}));
for (const t of ['/syntax/','/learning-path/javascript/','/playground/?pen=frontend','/algorithms/','/javascript/010-WhatIsJavaScript/']) {
  await page.goto('http://localhost:4321/FANDEX'+t, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const btn = page.locator('[data-lang-toggle]').first();
  await btn.click().catch(()=>{});
  await page.waitForTimeout(1200);
}
console.log('single-click-per-page errors:', JSON.stringify(errs, null, 1));
await browser.close();
