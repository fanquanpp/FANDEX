/* 模板加载实际把代码写进 CodeMirror（codeLen 变化 195->72->118->29），但 .pg-title-input
   value 未变（""）—— 检查 title input 是否存在/有值语义（也许 title 默认就是空且模板
   不设 title，或者 title input 是另一个节点）。核对 r1 结论 "title applied"。 */
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
await page.evaluate(() => document.querySelector('.pg-new-wrap > button')?.click());
await page.waitForTimeout(400);
await page.evaluate(() => { const el = [...document.querySelectorAll('.pg-menu .pg-menu-item')][1]; if (el) el.click(); });
await page.waitForTimeout(1500);
const st = await page.evaluate(() => ({
  titleInput: document.querySelector('.pg-title-input')?.value,
  titlePlaceholder: document.querySelector('.pg-title-input')?.placeholder,
  titleInputs: document.querySelectorAll('.pg-title-input, input[class*=title]').length,
  cmLen: (document.querySelector('.cm-content')?.textContent || '').length,
  headTitle: document.title,
}));
console.log(JSON.stringify(st, null, 1));
await browser.close();
