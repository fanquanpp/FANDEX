import { createRequire } from 'node:module';
const { chromium } = createRequire('C:/Atian/Project/FANDEX/app-web/package.json')('playwright');
const browser = await chromium.launch({ headless: true, args: ['--disable-blink-features=AutomationControlled'] });
const ctx = await browser.newContext({ viewport: { width: 375, height: 1700 } });

/* 历史 1：playground 窄屏水合（r1 高频报错点） */
const p1 = await ctx.newPage();
const e1 = [];
p1.on('pageerror', (e) => e1.push('PE ' + e.message.slice(0, 100)));
p1.on('console', (m) => { if (m.type() === 'error') e1.push('CE ' + m.text().slice(0, 100)); });
await p1.goto('http://localhost:4321/FANDEX/playground/', { waitUntil: 'load' });
await p1.waitForTimeout(1500);
console.log('playground narrow:', e1.length ? e1 : 'clean');

/* 历史 2：syntax strokeWidth 告警 */
const p2 = await ctx.newPage();
const e2 = [];
p2.on('console', (m) => { if (m.type() === 'error') e2.push(m.text().slice(0, 100)); });
await p2.setViewportSize({ width: 1440, height: 900 });
await p2.goto('http://localhost:4321/FANDEX/syntax/', { waitUntil: 'load' });
await p2.waitForTimeout(1200);
console.log('syntax desktop:', e2.length ? e2 : 'clean');

/* 历史 3：面包屑吸顶不盖 H1 */
const p3 = await ctx.newPage();
await p3.setViewportSize({ width: 375, height: 900 });
await p3.goto('http://localhost:4321/FANDEX/javascript/010-WhatIsJavaScript/', { waitUntil: 'load' });
await p3.waitForTimeout(800);
const crumb = await p3.evaluate(() => {
  const b = document.querySelector('.breadcrumb');
  const h1 = document.querySelector('h1');
  if (!b || !h1) return { present: false };
  const br = b.getBoundingClientRect();
  const hr = h1.getBoundingClientRect();
  return {
    top: getComputedStyle(b).top,
    overlapsH1: hr.top < br.bottom && br.top < hr.bottom,
    h1Text: h1.textContent.trim().slice(0, 14),
  };
});
console.log('breadcrumb 375:', JSON.stringify(crumb));

/* 历史 4：性能浮窗折叠态收窄 */
const p4 = await ctx.newPage();
await p4.setViewportSize({ width: 1440, height: 900 });
await p4.goto('http://localhost:4321/FANDEX/javascript/010-WhatIsJavaScript/', { waitUntil: 'load' });
await p4.waitForTimeout(800);
const perf = await p4.evaluate(() => {
  const el = document.getElementById('fandex-perf-monitor');
  if (!el) return { exists: false };
  return { exists: true, collapsed: el.classList.contains('collapsed'), opacity: getComputedStyle(el).opacity, w: Math.round(el.getBoundingClientRect().width) };
});
console.log('perf collapsed:', JSON.stringify(perf));

/* 历史 5：语言切换反色（ai 页） */
const p5 = await ctx.newPage();
await p5.setViewportSize({ width: 375, height: 1700 });
await p5.goto('http://localhost:4321/FANDEX/ai/', { waitUntil: 'load' });
await p5.waitForTimeout(600);
const lang = await p5.evaluate(() => {
  const b = document.querySelector('.ai-lang-btn.is-active');
  if (!b) return null;
  const cs = getComputedStyle(b);
  return { bg: cs.backgroundColor, color: cs.color };
});
console.log('ai lang active:', JSON.stringify(lang));

/* 历史 6：首页顶栏 srgb + 卡片标题下划线净空 */
const p6 = await ctx.newPage();
await p6.setViewportSize({ width: 1440, height: 900 });
await p6.goto('http://localhost:4321/FANDEX/', { waitUntil: 'load' });
await p6.waitForTimeout(800);
const home = await p6.evaluate(() => {
  const nav = document.querySelector('[data-site-header]');
  const navBg = nav ? getComputedStyle(nav).backgroundColor : null;
  const t = document.querySelector('.card-title');
  const pb = t ? getComputedStyle(t).paddingBottom : null;
  return { navBg, cardTitlePaddingBottom: pb };
});
console.log('home nav/card:', JSON.stringify(home));
await browser.close();
