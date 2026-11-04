/* 3 个 pageerror (Cannot read properties of undefined (reading 'replace')) 复现尝试：
   learning-path/javascript/、playground/?pen=frontend、syntax/ —— 纯加载 3 次 + 关键交互 */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const BASE = 'http://localhost:4321/FANDEX/';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
let errs = [];
page.on('pageerror', e => errs.push({ url: page.url(), msg: String(e).slice(0,300), stack: (e.stack||'').slice(0,400) }));

const targets = [BASE+'learning-path/javascript/', BASE+'playground/?pen=frontend', BASE+'syntax/'];
for (const t of targets) {
  for (let i = 0; i < 3; i++) {
    await page.goto(t, { waitUntil: 'load' }).catch(()=>{});
    await page.waitForTimeout(2500);
  }
}
console.log('errors after 9 loads:', JSON.stringify(errs, null, 1));

// syntax 快速交互连击
await page.goto(BASE+'syntax/', { waitUntil: 'load' });
await page.waitForTimeout(1500);
for (const lang of ['python','sql','cpp','javascript']) {
  await page.locator(`.syntax-quick__chip[href="?lang=${lang}"]`).click().catch(()=>{});
  await page.waitForTimeout(600);
}
const card = page.locator('.syntax-card').first();
if (await card.count()) { await card.click(); await page.waitForTimeout(500); await page.keyboard.press('Escape'); }
console.log('after syntax stress errors:', errs.length);

// playground ?pen=frontend stress
await page.goto(BASE+'playground/?pen=frontend', { waitUntil: 'load' });
await page.waitForTimeout(2500);
const runBtn = page.locator('.pg-toolbar button', { hasText: /运行|Run/ }).first();
if (await runBtn.count()) { await runBtn.click(); await page.waitForTimeout(1500); }
console.log('after playground stress errors:', errs.length);
console.log(JSON.stringify(errs.slice(0,5), null, 1));
await browser.close();
