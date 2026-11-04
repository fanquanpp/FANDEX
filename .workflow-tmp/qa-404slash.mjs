import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const { chromium } = createRequire('C:/Atian/Project/FANDEX/app-web/package.json')('playwright');
const SHOTS = 'C:/Atian/Project/FANDEX/.workflow-tmp/shots/r1';
mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--disable-blink-features=AutomationControlled'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
for (const theme of ['light', 'dark']) {
  await page.goto('http://localhost:4321/FANDEX/404/', { waitUntil: 'load' });
  await page.evaluate((t) => {
    localStorage.setItem('fandex-theme', t);
    document.documentElement.setAttribute('data-theme', t);
    document.documentElement.style.colorScheme = t;
  }, theme);
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SHOTS}/404_slash--desktop-${theme}.png` });
  const info = await page.evaluate(() => ({
    theme: document.documentElement.getAttribute('data-theme'),
    h1: document.querySelector('h1')?.textContent ?? null,
    path: document.getElementById('error-path-value')?.textContent ?? null,
  }));
  console.log(theme, JSON.stringify(info));
}
/* 核对 query 保留 */
await page.goto('http://localhost:4321/FANDEX/algorithms/?view=problems', { waitUntil: 'load' });
console.log('finalUrl:', page.url());
await browser.close();
