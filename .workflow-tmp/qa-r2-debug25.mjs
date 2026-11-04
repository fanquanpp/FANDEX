/* doc-list-link a 卡片在 1440x900 首屏不可点：rect y=247? 但 click timeout ——
   检查 pointer-events / 遮挡（首帧动画 reveal？）*/
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto('http://localhost:4321/FANDEX/javascript/', { waitUntil: 'load' });
await page.waitForTimeout(700);
const info = await page.evaluate(() => {
  const a = document.querySelector('a.doc-list-link');
  const r = a.getBoundingClientRect();
  const cs = getComputedStyle(a);
  // elementFromPoint 检查遮挡
  const cx = r.x + r.width/2, cy = r.y + r.height/2;
  const hit = document.elementFromPoint(cx, cy);
  return {
    rect: {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height)},
    pointerEvents: cs.pointerEvents, opacity: cs.opacity, visibility: cs.visibility,
    animation: cs.animationName + ' ' + cs.animationDuration,
    hitTag: hit ? hit.tagName : null, hitIsSelf: hit === a, hitCls: hit ? (hit.className||'').toString().slice(0,50) : '',
  };
});
console.log(JSON.stringify(info, null, 1));
await page.waitForTimeout(3000);
const info2 = await page.evaluate(() => {
  const a = document.querySelector('a.doc-list-link');
  const r = a.getBoundingClientRect();
  const cs = getComputedStyle(a);
  const cx = r.x + r.width/2, cy = r.y + r.height/2;
  const hit = document.elementFromPoint(cx, cy);
  return { rect: {y: Math.round(r.y)}, opacity: cs.opacity, hitIsSelf: hit === a, hitTag: hit ? hit.tagName : null };
});
console.log('after 3s:', JSON.stringify(info2));
await browser.close();
