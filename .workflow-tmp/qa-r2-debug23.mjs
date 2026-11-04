/* 单次点击复现细节：error 是否影响 UI（文案是否已切换、面板是否仍工作）+ 恢复路径（再点一次） */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e).slice(0,60)));
await page.goto('http://localhost:4321/FANDEX/syntax/', { waitUntil: 'load' });
await page.locator('.syntax-lang-chip.is-active').waitFor({timeout: 10000}).catch(()=>{});
await page.waitForTimeout(1500);
const before = await page.evaluate(() => ({
  placeholder: document.querySelector('.syntax-filter__input')?.placeholder,
  meta: document.querySelector('.syntax-meta')?.textContent?.slice(0,50),
  dataLang: document.documentElement.getAttribute('data-lang'),
}));
await page.locator('[data-lang-toggle]').first().click().catch(()=>{});
await page.waitForTimeout(1500);
const after1 = await page.evaluate(() => ({
  placeholder: document.querySelector('.syntax-filter__input')?.placeholder,
  meta: document.querySelector('.syntax-meta')?.textContent?.slice(0,50),
  dataLang: document.documentElement.getAttribute('data-lang'),
  cards: document.querySelectorAll('.syntax-card').length,
}));
// 再点一次（翻回 zh）
await page.locator('[data-lang-toggle]').first().click().catch(()=>{});
await page.waitForTimeout(1500);
const after2 = await page.evaluate(() => ({
  placeholder: document.querySelector('.syntax-filter__input')?.placeholder,
  dataLang: document.documentElement.getAttribute('data-lang'),
  cards: document.querySelectorAll('.syntax-card').length,
}));
console.log('before:', JSON.stringify(before));
console.log('after 1 click:', JSON.stringify(after1), 'errors:', errs.length);
console.log('after 2 clicks:', JSON.stringify(after2), 'errors:', errs.length);
await browser.close();
