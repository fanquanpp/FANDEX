/* pg-menu-mask 挡住的是"模板菜单已打开"状态的触发按钮（aria-expanded=true，菜单开着）。
   上一段脚本 guide 关闭时 pg-menu 已经打开？直接测：进入页面后枚举 menu 状态；
   若 menu 开着，直接点 menu item；若无 menu，点按钮开。 */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const BASE = 'http://localhost:4321/FANDEX/';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost:4321' });
const page = await ctx.newPage();
page.setDefaultTimeout(8000);
const errs = [];
page.on('pageerror', e => errs.push({ url: page.url().replace('http://localhost:4321/FANDEX',''), msg: String(e).slice(0, 120) }));
page.on('console', m => { if (m.type() === 'error') errs.push({ url: page.url().replace('http://localhost:4321/FANDEX',''), msg: '[console] ' + m.text().slice(0, 100) }); });

await page.goto(BASE + 'playground/', { waitUntil: 'load' });
await page.locator('.pg-toolbar').waitFor({ timeout: 15000 }).catch(() => {});
await page.waitForTimeout(1200);
// guide 若在，关
if (await page.locator('.pg-guide').count()) {
  const cb = page.locator('.pg-guide button', { hasText: /开始|知道了|关闭|使用/ }).first();
  if (await cb.count()) await cb.click().catch(() => page.keyboard.press('Escape'));
  else await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
}
const state0 = await page.evaluate(() => ({
  guideOpen: !!document.querySelector('.pg-guide'),
  menuOpen: !!document.querySelector('.pg-menu-mask'),
  menuItems: document.querySelectorAll('.pg-menu .pg-menu-item').length,
  ariaExpanded: document.querySelector('.pg-new-wrap > button')?.getAttribute('aria-expanded'),
}));
console.log('pg initial state:', JSON.stringify(state0));
// 菜单若未开，点开
if (!state0.menuOpen) {
  await page.evaluate(() => document.querySelector('.pg-new-wrap > button')?.click());
  await page.waitForTimeout(500);
}
const menuItems = await page.locator('.pg-menu .pg-menu-item').count();
console.log('menu items:', menuItems);
if (menuItems) {
  const t0 = await page.evaluate(() => document.querySelector('.pg-title-input')?.value || '');
  await page.evaluate(() => document.querySelector('.pg-menu .pg-menu-item')?.click());
  await page.waitForTimeout(1300);
  const t1 = await page.evaluate(() => document.querySelector('.pg-title-input')?.value || '');
  console.log('template load:', JSON.stringify(t0), '->', JSON.stringify(t1));
}
// console toggle（DOM click 绕 mask）
const c0 = await page.evaluate(() => !!document.querySelector('.pg-console'));
await page.evaluate(() => document.querySelector('.pg-toolbar button[title="控制台"]')?.click());
await page.waitForTimeout(700);
const c1 = await page.evaluate(() => !!document.querySelector('.pg-console'));
await page.evaluate(() => document.querySelector('.pg-toolbar button[title="控制台"]')?.click());
await page.waitForTimeout(500);
console.log('console toggle:', c0, '->', c1, '-> back', await page.evaluate(() => !!document.querySelector('.pg-console')));
// gallery
await page.evaluate(() => { const b = [...document.querySelectorAll('.pg-toolbar button')].find(b => (b.textContent || '').includes('灵感库')); if (b) b.click(); });
await page.waitForTimeout(1000);
const gCards = await page.evaluate(() => document.querySelectorAll('.pg-sc-card').length);
console.log('gallery cards:', gCards);
await page.keyboard.press('Escape');
await page.waitForTimeout(500);
console.log('gallery closed:', await page.evaluate(() => !document.querySelector('.pg-sc-mask')));
await browser.close();
console.log('errors:', errs.length);
for (const e of errs.slice(0, 6)) console.log('  [', e.url, ']', e.msg);
