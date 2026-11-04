/* 检查 [data-lang-toggle] 是否存在双绑定（i18n-dom 委托 + 组件内 addEventListener 双触发）。
   直接观测：点击一次后 fandex:langchange 派发几次、detail 形状。 */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto('http://localhost:4321/FANDEX/syntax/', { waitUntil: 'load' });
await page.waitForTimeout(1500);
const probe = await page.evaluate(() => {
  const events = [];
  document.addEventListener('fandex:langchange', (e) => {
    events.push({ detail: e.detail, detailKeys: e.detail ? Object.keys(e.detail) : null });
  });
  const btn = document.querySelector('[data-lang-toggle]');
  btn.click();
  return new Promise((res) => setTimeout(() => res({ events, dataLang: document.documentElement.getAttribute('data-lang') }), 300));
});
console.log(JSON.stringify(probe, null, 1));
await browser.close();
