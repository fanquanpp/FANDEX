/* menu items=0：guide Escape 关闭后 menu 未开。直接点 new-wrap 按钮（DOM click）开菜单。 */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const BASE = 'http://localhost:4321/FANDEX/';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.setDefaultTimeout(8000);
await page.goto(BASE + 'playground/', { waitUntil: 'load' });
await page.locator('.pg-toolbar').waitFor({ timeout: 15000 }).catch(() => {});
await page.waitForTimeout(1200);
if (await page.locator('.pg-guide').count()) { await page.keyboard.press('Escape'); await page.waitForTimeout(600); }
console.log('guide still open:', await page.evaluate(() => !!document.querySelector('.pg-guide')));
await page.evaluate(() => document.querySelector('.pg-new-wrap > button')?.click());
await page.waitForTimeout(500);
const items = await page.evaluate(() => [...document.querySelectorAll('.pg-menu .pg-menu-item')].map(i => (i.textContent || '').trim().slice(0, 16)));
console.log('menu items:', JSON.stringify(items));
for (let i = 0; i < items.length; i++) {
  // reopen menu each iteration
  if (i > 0) {
    await page.evaluate(() => document.querySelector('.pg-new-wrap > button')?.click());
    await page.waitForTimeout(400);
  }
  const before = await page.evaluate(() => document.querySelector('.pg-title-input')?.value || '');
  const code0 = await page.evaluate(() => (document.querySelector('.cm-content')?.textContent || '').length);
  await page.evaluate((idx) => { const el = [...document.querySelectorAll('.pg-menu .pg-menu-item')][idx]; if (el) el.click(); }, i);
  await page.waitForTimeout(1500);
  const after = await page.evaluate(() => document.querySelector('.pg-title-input')?.value || '');
  const code1 = await page.evaluate(() => (document.querySelector('.cm-content')?.textContent || '').length);
  console.log(`item[${i}] "${items[i]}" title "${before}"->"${after}" codeLen ${code0}->${code1}`);
}
await browser.close();
