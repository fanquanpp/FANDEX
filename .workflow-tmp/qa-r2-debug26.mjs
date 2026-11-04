/* 复刻 main 阶段 doc-list-link 点击路径：buildLocator 用 hasText 前 24 字，
   freshGoto 用 domcontentloaded + 400ms。找出 timeout 原因。 */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.setDefaultTimeout(8000);
const label = '01JavaScript 是什么：你的第一门编程语言';
await page.goto('http://localhost:4321/FANDEX/javascript/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(400);
const loc = page.locator('a', { hasText: label.slice(0, 24) }).first();
console.log('count:', await loc.count());
try {
  await loc.click({ timeout: 5000 });
  console.log('clicked, url:', page.url());
} catch (e) {
  console.log('TIMEOUT as in sweep:', String(e).split('\n')[0]);
  // 检查 locator 状态
  const n = await loc.count();
  console.log('count after timeout:', n);
  const st = await loc.first().evaluate(el => ({rect: el.getBoundingClientRect().toJSON(), cls: el.className})).catch(e2=>String(e2).slice(0,150));
  console.log('state:', JSON.stringify(st).slice(0,300));
}
await browser.close();
