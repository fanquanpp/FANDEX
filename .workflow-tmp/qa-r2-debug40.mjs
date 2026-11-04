/* 第一张卡点击 -> NAV 后 page.url() 已变但 goto 条件 url().startsWith(url) 为 FALSE
   （当前在 /010-.../），于是回跳 goto javascript/。第二张卡却 timeout。
   手动检查：回跳后第二张卡 a.doc-list-link[href=020...] 的 rect / elementFromPoint / sidebar 状态。
   疑点：Astro View Transitions 下回跳后 scroll 位置恢复 + sidebar? 或 doc-list reveal 动画
   stroke-dashoffset 期间 pointer-events? */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.setDefaultTimeout(8000);
const url = 'http://localhost:4321/FANDEX/javascript/';
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(500);
// 点第一张卡
await page.locator('a.doc-list-link[href="/FANDEX/javascript/010-WhatIsJavaScript/"]').first().click({timeout:6000});
await page.waitForTimeout(900);
// 回跳
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(500);
const probe = await page.evaluate(() => {
  const a = document.querySelector('a.doc-list-link[href="/FANDEX/javascript/020-JavaScriptOverviewRuntimeEnv/"]');
  if (!a) return { missing: true };
  const r = a.getBoundingClientRect();
  const hit = document.elementFromPoint(r.x + r.width/2, r.y + r.height/2);
  const cs = getComputedStyle(a);
  return { rect: {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height)},
    pointerEvents: cs.pointerEvents, hitTag: hit ? hit.tagName : null, hitIsSelf: hit === a,
    hitCls: hit ? (hit.className||'').toString().slice(0,60) : '',
    scrollY: window.scrollY, mainScroll: (document.getElementById('app-main')||{}).scrollTop };
});
console.log('card2 state after back-jump:', JSON.stringify(probe, null, 1));
try {
  await page.locator('a.doc-list-link[href="/FANDEX/javascript/020-JavaScriptOverviewRuntimeEnv/"]').first().click({timeout: 5000});
  console.log('clicked ->', page.url());
} catch (e) {
  console.log('TIMEOUT. Click log tail:', String(e).split('\n').slice(0,12).join(' | ').slice(0, 600));
}
await browser.close();
