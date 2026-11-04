import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const BASE = 'http://localhost:4321/FANDEX/';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(BASE + 'javascript/', { waitUntil: 'load' });
await page.waitForTimeout(800);
const enumBtns = await page.evaluate(() => {
  return [...document.querySelectorAll('button')].filter(b => (b.getAttribute('aria-label')||'').length > 0).map(b => ({
    aria: b.getAttribute('aria-label'),
    id: b.id, cls: b.className.slice(0,50),
    visible: b.getBoundingClientRect().width > 0,
  }));
});
console.log('enumerated aria buttons:', JSON.stringify(enumBtns, null, 1));
// pick theme button, fresh goto, then locate
await page.goto(BASE + 'javascript/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(400);
for (const cand of ['[aria-label="Switch to light mode"]', '[aria-label="切换到亮色模式"]', 'button[data-theme-toggle]', '#theme-toggle']) {
  const n = await page.locator(cand).count();
  console.log(`locator ${cand} count=${n}`);
}
await browser.close();
