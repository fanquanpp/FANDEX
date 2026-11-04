/* theme 三态：pref 保存 'light'（saved=light, resolved=light, data-theme=light）。
   点击 → preference 'dark' → setThemePreference('dark') → storage fandex-theme='dark'
   applyTheme('dark') → data-theme='dark'。
   但实测：aria 变为"切换到暗色模式"（说明 React state 已到 dark），而 data-theme 仍 light、
   stored 仍 'light'？ —— setItem 写入失败？或 setThemePreference 的 storage 值读回 light？
  getItem/setItem 来自 ./storage —— 检查其实现（可能 isServer 判断或 key 前缀）。
   另一个可能：r2 环境 localStorage 有 fandex-theme='light' 残留 + onStorageChange 覆写。
   直接在浏览器里调 module 函数验证。 */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const BASE = 'http://localhost:4321/FANDEX/';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(BASE, { waitUntil: 'load' });
await page.waitForTimeout(1500);
const r = await page.evaluate(async () => {
  localStorage.removeItem('fandex-theme');
  const mod = await import('/src/lib/theme.ts');
  const before = document.documentElement.getAttribute('data-theme');
  mod.setThemePreference('dark');
  const after = {
    dataTheme: document.documentElement.getAttribute('data-theme'),
    stored: localStorage.getItem('fandex-theme'),
    colorScheme: document.documentElement.style.colorScheme,
  };
  mod.setThemePreference('system');
  const sys = { dataTheme: document.documentElement.getAttribute('data-theme'), stored: localStorage.getItem('fandex-theme') };
  return { before, after, sys };
});
console.log(JSON.stringify(r, null, 1));
// 然后再点击真实按钮（当前无 saved pref）
const t0 = await page.evaluate(() => ({ aria: document.querySelector('.fndx-theme-toggle')?.getAttribute('aria-label'), theme: document.documentElement.getAttribute('data-theme'), stored: localStorage.getItem('fandex-theme') }));
await page.locator('.fndx-theme-toggle').first().click();
await page.waitForTimeout(700);
const t1 = await page.evaluate(() => ({ aria: document.querySelector('.fndx-theme-toggle')?.getAttribute('aria-label'), theme: document.documentElement.getAttribute('data-theme'), stored: localStorage.getItem('fandex-theme') }));
console.log('real click before:', JSON.stringify(t0));
console.log('real click after :', JSON.stringify(t1));
await browser.close();
