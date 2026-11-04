/* 模板点击后 title 未变（""->""）：r1 曾验证 title 会变为模板名。查 pg-menu item 点击
   是否真的触发加载（可能 4 个 item 里第一个是"空白"）。列出 item 文本逐个点击。 */
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
if (await page.locator('.pg-guide').count()) { await page.keyboard.press('Escape'); await page.waitForTimeout(500); }
const items = await page.evaluate(() => [...document.querySelectorAll('.pg-menu .pg-menu-item')].map(i => (i.textContent || '').trim().slice(0, 16)));
console.log('menu items:', JSON.stringify(items));
for (let i = 0; i < items.length; i++) {
  await page.evaluate((idx) => document.querySelector('.pg-new-wrap > button')?.click(), i);
  await page.waitForTimeout(400);
  const before = await page.evaluate(() => document.querySelector('.pg-title-input')?.value || '');
  const codeLen0 = await page.evaluate(() => (document.querySelector('.cm-content')?.textContent || '').length);
  await page.evaluate((idx) => { const el = [...document.querySelectorAll('.pg-menu .pg-menu-item')][idx]; if (el) el.click(); }, i);
  await page.waitForTimeout(1400);
  const after = await page.evaluate(() => document.querySelector('.pg-title-input')?.value || '');
  const codeLen1 = await page.evaluate(() => (document.querySelector('.cm-content')?.textContent || '').length);
  console.log(`item[${i}] "${items[i]}" title "${before}"->"${after}" codeLen ${codeLen0}->${codeLen1}`);
}
await browser.close();
