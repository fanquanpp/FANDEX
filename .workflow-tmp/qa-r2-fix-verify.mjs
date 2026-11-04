import { createRequire } from 'node:module';
const { chromium } = createRequire('C:/Atian/Project/FANDEX/app-web/package.json')('playwright');
const browser = await chromium.launch({ headless: true, args: ['--disable-blink-features=AutomationControlled'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

/* 专项 3：dev 工具栏是否关闭 */
await page.goto('http://localhost:4321/FANDEX/', { waitUntil: 'load' });
await page.waitForTimeout(800);
const toolbar = await page.evaluate(() => !!document.querySelector('astro-dev-toolbar'));
console.log('devToolbar present:', toolbar);

/* 专项 4：性能监控浮窗默认折叠 */
const perf = await page.evaluate(() => {
  const el = document.getElementById('fandex-perf-monitor');
  return el ? { exists: true, collapsed: el.classList.contains('collapsed'), w: el.getBoundingClientRect().width } : { exists: false };
});
console.log('perfMonitor:', JSON.stringify(perf));

/* 专项 5：面包屑吸顶偏移 —— 文档页窄屏滚动后面包屑应贴容器顶而不盖 H1 */
const p2 = await ctx.newPage();
await p2.setViewportSize({ width: 375, height: 900 });
await p2.goto('http://localhost:4321/FANDEX/javascript/010-WhatIsJavaScript/', { waitUntil: 'load' });
await p2.waitForTimeout(800);
const crumb = await p2.evaluate(() => {
  const b = document.querySelector('.breadcrumb');
  if (!b) return { present: false };
  const cs = getComputedStyle(b);
  const r = b.getBoundingClientRect();
  const main = document.getElementById('app-main') || document.querySelector('main');
  const mr = main ? main.getBoundingClientRect() : null;
  return {
    present: true,
    top: cs.top,
    stickyZ: cs.zIndex,
    rectTop: Math.round(r.top),
    mainTop: mr ? Math.round(mr.top) : null,
    overlapsH1: (() => {
      const h1 = document.querySelector('h1');
      if (!h1) return null;
      const hr = h1.getBoundingClientRect();
      return hr.top < r.bottom && r.top < hr.bottom && hr.width > 0;
    })(),
  };
});
console.log('breadcrumb(375x900 pre-scroll):', JSON.stringify(crumb));
/* 滚动到中部再测吸顶位置 */
await p2.evaluate(() => { const m = document.getElementById('app-main'); if (m) m.scrollTop = 600; window.scrollTo(0, 600); });
await p2.waitForTimeout(400);
const crumb2 = await p2.evaluate(() => {
  const b = document.querySelector('.breadcrumb');
  if (!b) return { present: false };
  const r = b.getBoundingClientRect();
  const main = document.getElementById('app-main') || document.querySelector('main');
  const mr = main ? main.getBoundingClientRect() : null;
  return { rectTop: Math.round(r.top), mainTop: mr ? Math.round(mr.top) : null, gap: mr ? Math.round(r.top - mr.top) : null };
});
console.log('breadcrumb(after scroll 600):', JSON.stringify(crumb2));
await browser.close();
