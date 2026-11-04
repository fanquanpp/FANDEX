/* 1) NF sidebar y=-627（在滚动容器上方视口外）。我的 clickEl 有 scrollTo 逻辑，
   但 window.scrollTo 对内部滚动容器（#app-sidebar 自身滚动）无效！
   NF sidebar 是 overflow 容器，需滚动容器本身。这解释 NF 10/10 STAYED
   （点到了视口外的坐标或点空）。也解释部分卡片 STAYED（滚动到中部的卡片坐标
   计算后又被 scrollTo 改变？）。
   修复版：定位前先 scrollIntoView 被测元素，再取中心坐标做 CDP 点击。
   重验 5 个失败点：js 卡 090/100、NF sidebar 010、lp networking、ds #ds-toctitle。 */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
page.setDefaultTimeout(8000);
const BASE = 'http://localhost:4321/FANDEX/';
async function robustClick(page, sel) {
  const ok = await page.evaluate((s) => {
    const a = document.querySelector(s);
    if (!a) return false;
    a.scrollIntoView({ block: 'center', behavior: 'instant' });
    return true;
  }, sel);
  if (!ok) return null;
  await page.waitForTimeout(250);
  const pos = await page.evaluate((s) => {
    const a = document.querySelector(s);
    const r = a.getBoundingClientRect();
    return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) };
  }, sel);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: pos.x, y: pos.y, button: 'left', clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pos.x, y: pos.y, button: 'left', clickCount: 1 });
  return pos;
}
// NF sidebar 010
await page.goto(BASE + 'algorithm/290-NetworkFlow/', { waitUntil: 'load' });
await page.waitForTimeout(900);
await robustClick(page, '.fndx-sidebar__link[href="/FANDEX/algorithm/010-AlgorithmAnalysisBasics/"]');
await page.waitForURL('**/010-AlgorithmAnalysisBasics/', { timeout: 20000 }).catch(()=>{});
console.log('NF sidebar 010:', page.url());
// js 卡 090
await page.goto(BASE + 'javascript/', { waitUntil: 'load' });
await page.waitForTimeout(800);
await robustClick(page, 'a.doc-list-link[href="/FANDEX/javascript/090-ArrayHigherOrderMethod/"]');
await page.waitForURL('**/090-ArrayHigherOrderMethod/', { timeout: 20000 }).catch(()=>{});
console.log('js card 090:', page.url());
// lp networking
await page.goto(BASE + 'learning-path/', { waitUntil: 'load' });
await page.waitForTimeout(800);
await robustClick(page, 'a[href="/FANDEX/learning-path/networking/"]');
await page.waitForURL('**/learning-path/networking/', { timeout: 20000 }).catch(()=>{});
console.log('lp networking:', page.url());
// ds #ds-toctitle
await page.goto(BASE + 'design-system/', { waitUntil: 'load' });
await page.waitForTimeout(700);
await robustClick(page, 'a[href="#ds-toctitle"]');
await page.waitForTimeout(700);
const hash = await page.evaluate(() => decodeURIComponent(location.hash));
console.log('ds anchor #ds-toctitle hash:', JSON.stringify(hash));
await browser.close();
