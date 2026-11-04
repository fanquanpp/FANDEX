/* lang toggle 8 连击 + theme 8 连击（r1 瞬态 error 的高危路径），各页验证 */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const BASE = 'http://localhost:4321/FANDEX/';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
let errs = [];
page.on('pageerror', e => errs.push({ url: page.url(), msg: String(e).slice(0,300) }));
for (const t of [BASE, BASE+'syntax/', BASE+'learning-path/javascript/', BASE+'playground/?pen=frontend', BASE+'javascript/010-WhatIsJavaScript/']) {
  await page.goto(t, { waitUntil: 'load' }).catch(()=>{});
  await page.waitForTimeout(1200);
  const lang = page.locator('[data-lang-toggle]').first();
  for (let i = 0; i < 8; i++) { await lang.click({timeout:3000}).catch(()=>{}); await page.waitForTimeout(150); }
  const theme = page.locator('[data-theme-toggle], .fndx-theme-toggle').first();
  for (let i = 0; i < 8; i++) { await theme.click({timeout:3000}).catch(()=>{}); await page.waitForTimeout(150); }
}
console.log('stress errors:', JSON.stringify(errs, null, 1).slice(0, 1500));
await browser.close();
