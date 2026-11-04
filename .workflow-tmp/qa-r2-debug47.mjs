/* 这次 clicked ok！抖动 = 时序敏感。差异：本次 waitForURL 15s 后页面完全加载完才回跳。
   之前 timeout 场景 waitForURL(catch) 可能提前失败（页面还没 NAV 完）就 goto 了。
   —— 也就是说：card1 点击后 900ms 内（dev 慢编译）URL 还没变，verify 就 goto 回列表页，
   但 goto 发生在 client router fetch 进行中，随后 router 完成换页把 URL 拉回 010 详情页？
   不。真实机制不重要了——修复方向明确：每张卡点击后 waitForURL 确认到达，
   且 goto 回跳后等 load+500ms（让 astro:page-load 完成）。
   重跑修正节奏验证 */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.setDefaultTimeout(8000);
const url = 'http://localhost:4321/FANDEX/javascript/';
const cards = await (async () => {
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(800);
  return page.evaluate(() => [...document.querySelectorAll('a.doc-list-link')].map(a => a.getAttribute('href')).slice(0, 15));
})();
let bad = 0;
for (const href of cards) {
  if (!page.url().startsWith(url)) {
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(600);
  }
  const card = page.locator(`a.doc-list-link[href="${href}"]`).first();
  try {
    await card.click({ timeout: 10000 });
    await page.waitForURL('**' + new URL('http://x' + href).pathname, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(600);
    if (!page.url().includes(new URL('http://x' + href).pathname)) { bad += 1; console.log('STAYED', href); }
  } catch (e) { bad += 1; console.log('ERR', href, String(e).split('\n')[0].slice(0,60)); }
}
console.log('cards checked:', cards.length, 'bad:', bad);
await browser.close();
