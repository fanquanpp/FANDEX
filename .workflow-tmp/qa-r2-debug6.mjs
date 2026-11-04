/* syntax 快捷 chip：等 island 水合后再点击，看 history.replaceState 行为 */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const BASE = 'http://localhost:4321/FANDEX/';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(BASE+'syntax/', { waitUntil: 'load' });
// 等 island 完全水合
await page.locator('.syntax-lang-chip.is-active').waitFor({ timeout: 15000 }).catch(()=>{});
await page.waitForTimeout(2000);
const chip = page.locator('.syntax-quick__chip[href="?lang=javascript"]').first();
// 点其他语言的 chip（SQL），效果更明显
const sqlChip = page.locator('.syntax-quick__chip[href="?lang=sql"]').first();
await sqlChip.click({ timeout: 6000 }).catch(e => console.log('sql chip click err', String(e).slice(0,90)));
await page.waitForTimeout(1800);
const st = await page.evaluate(() => ({
  url: location.href,
  activeChips: [...document.querySelectorAll('.syntax-lang-chip.is-active')].map(e => e.textContent.trim().slice(0,16)),
  quickActive: [...document.querySelectorAll('.syntax-quick__chip.is-active, .syntax-quick__chip[aria-current]')].map(e => e.textContent.trim().slice(0,20)),
  cards: document.querySelectorAll('.syntax-card').length,
}));
console.log('after SQL quick chip:', JSON.stringify(st, null, 1));
await browser.close();
