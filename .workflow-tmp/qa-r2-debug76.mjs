/* playground 的 pg-keys-mask（AI keys 面板?）挡 lang toggle —— 需先关闭（Esc）。
   完成 playground island 崩溃验证。 */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const BASE = 'http://localhost:4321/FANDEX/';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e).slice(0, 100)));
await page.goto(BASE + 'playground/', { waitUntil: 'load' });
await page.locator('.pg-toolbar').waitFor({ timeout: 15000 }).catch(() => {});
await page.waitForTimeout(900);
if (await page.locator('.pg-guide').count()) { await page.keyboard.press('Escape'); await page.waitForTimeout(500); }
// 关 keys 面板
await page.keyboard.press('Escape');
await page.waitForTimeout(500);
const maskGone = await page.evaluate(() => { const m = document.querySelector('.pg-keys-mask'); return !m || getComputedStyle(m).pointerEvents === 'none' || m.getBoundingClientRect().width === 0; });
console.log('keys mask gone:', maskGone);
await page.locator('[data-lang-toggle]').first().click({ timeout: 6000 }).catch(async () => { await page.evaluate(() => document.querySelector('[data-lang-toggle]')?.click()); });
await page.waitForTimeout(1600);
const pgAfter = await page.evaluate(() => ({ toolbar: !!document.querySelector('.pg-toolbar'), cm: !!document.querySelector('.cm-content') }));
console.log('playground island after lang click:', JSON.stringify(pgAfter), 'errors:', errs.length, errs[0] || '');
await browser.close();
