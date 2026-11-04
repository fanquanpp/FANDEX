/* 复刻 sweep 全局时序：sweep 在点击前做过 SW 注销+reload 与别的页面循环，
   可能有 astro:page-load 后 scrollTo/scroll restoration 或侧栏 is-visible 干扰。
   直接最小复刻 sweep 的 testElement（freshGoto domcontentloaded+400）对 /javascript/ 第一卡，
   但在之前先访问别的页 + SW 清理。 */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.setDefaultTimeout(8000);
// sweep-like: 先首页（含 SW 清理），再 javascript
const BASE = 'http://localhost:4321/FANDEX/';
await page.goto(BASE, { waitUntil: 'load' });
await page.evaluate(async () => {
  const regs = await navigator.serviceWorker.getRegistrations();
  for (const r of regs) await r.unregister();
  const keys = await caches.keys();
  for (const k of keys) await caches.delete(k);
});
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(500);
// 枚举后跳第 2 页
const label = '001入门JavaScript 是什么：你的第一';
for (let i = 0; i < 4; i++) {
  await page.goto(BASE + 'javascript/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  const loc = page.locator('a', { hasText: label }).first();
  try {
    await loc.click({ timeout: 5000 });
    await page.waitForTimeout(1200);
    console.log(i, page.url().includes('010') ? 'NAV' : 'STAYED ' + page.url());
  } catch (e) { console.log(i, 'TIMEOUT'); }
}
await browser.close();
