/* 复核模块列表页 doc 卡片（如 /FANDEX/konado/ 第一张卡）：
   1) 枚举阶段用的匹配是 sidebar 链接还是主列表卡片？2) 主列表卡片手动点击是否跳转？ */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const BASE = 'http://localhost:4321/FANDEX/';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(BASE+'konado/', { waitUntil: 'load' });
await page.waitForTimeout(1000);
const probe = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll('a[href="/FANDEX/konado/010-KonadoOverviewAndInstall/"]').forEach((a, i) => {
    const r = a.getBoundingClientRect();
    out.push({ i, cls: a.className.slice(0,50), inSidebar: !!a.closest('#app-sidebar'), rect: {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width)} });
  });
  return out;
});
console.log('matching anchors for konado 010:', JSON.stringify(probe, null, 1));
// 主列表卡片（非 sidebar）手动点击
const card = page.locator('a.doc-list-link[href="/FANDEX/konado/010-KonadoOverviewAndInstall/"], a[href="/FANDEX/konado/010-KonadoOverviewAndInstall/"]').last();
await card.scrollIntoViewIfNeeded().catch(()=>{});
await card.click({ timeout: 6000 }).catch(e=>console.log('card click err', String(e).slice(0,100)));
await page.waitForTimeout(1200);
console.log('after card click:', page.url());
await browser.close();
