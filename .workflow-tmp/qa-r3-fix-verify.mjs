import { createRequire } from 'node:module';
const { chromium } = createRequire('C:/Atian/Project/FANDEX/app-web/package.json')('playwright');
const browser = await chromium.launch({ headless: true, args: ['--disable-blink-features=AutomationControlled'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

/* 修复 1：首页顶栏 srgb 混合后应为冷雾灰 #EBEFF3 系（不再偏红粉） */
await page.goto('http://localhost:4321/FANDEX/', { waitUntil: 'load' });
await page.waitForTimeout(800);
const navBg = await page.evaluate(() => {
  const nav = document.querySelector('[data-site-header]');
  const v = nav ? getComputedStyle(nav).backgroundColor : null;
  const m = v ? v.match(/\d+/g) : null;
  return { raw: v, hex: m ? '#' + m.slice(0, 3).map((x) => (+x).toString(16).padStart(2, '0')).join('') : null };
});
console.log('home nav bg (light):', JSON.stringify(navBg));

/* 修复 2：卡片 CJK 标题与下划线不相交（取样标题元素盒与线的位置关系） */
const card = await page.evaluate(() => {
  const t = document.querySelector('.card-title');
  if (!t) return null;
  const r = t.getBoundingClientRect();
  const cs = getComputedStyle(t);
  return { pb: cs.paddingBottom, boxH: Math.round(r.height), text: t.textContent.trim().slice(0, 12) };
});
console.log('card-title:', JSON.stringify(card));

/* 修复 3：ai/disclaimer 语言选中态为反色墨水 */
const p2 = await ctx.newPage();
await p2.goto('http://localhost:4321/FANDEX/ai/', { waitUntil: 'load' });
await p2.waitForTimeout(600);
const aiLang = await p2.evaluate(() => {
  const b = document.querySelector('.ai-lang-btn.is-active');
  if (!b) return null;
  const cs = getComputedStyle(b);
  return { bg: cs.backgroundColor, color: cs.color };
});
console.log('ai lang active:', JSON.stringify(aiLang));
const p3 = await ctx.newPage();
await p3.goto('http://localhost:4321/FANDEX/disclaimer/', { waitUntil: 'load' });
await p3.waitForTimeout(600);
const legalLang = await p3.evaluate(() => {
  const b = document.querySelector('.legal-lang-btn.is-active');
  if (!b) return null;
  const cs = getComputedStyle(b);
  return { bg: cs.backgroundColor, color: cs.color };
});
console.log('legal lang active:', JSON.stringify(legalLang));

/* 修复 4：性能浮窗折叠态收窄 + 半透明，且 toggle 点击只翻转一次（防重入验证） */
const p4 = await ctx.newPage();
const errs4 = [];
p4.on('pageerror', (e) => errs4.push(e.message.slice(0, 80)));
await p4.goto('http://localhost:4321/FANDEX/javascript/010-WhatIsJavaScript/', { waitUntil: 'load' });
await p4.waitForTimeout(1000);
const perfState = async () => await p4.evaluate(() => {
  const el = document.getElementById('fandex-perf-monitor');
  if (!el) return { exists: false };
  const cs = getComputedStyle(el);
  return { exists: true, collapsed: el.classList.contains('collapsed'), opacity: cs.opacity, w: Math.round(el.getBoundingClientRect().width) };
});
console.log('perf initial:', JSON.stringify(await perfState()));
const toggle = await p4.evaluate(() => {
  const btn = document.getElementById('perf-monitor-toggle');
  if (!btn) return 'no-btn';
  btn.click();
  return 'clicked';
});
await p4.waitForTimeout(300);
console.log('perf after 1 click:', toggle, JSON.stringify(await perfState()));
await p4.evaluate(() => document.getElementById('perf-monitor-toggle')?.click());
await p4.waitForTimeout(300);
console.log('perf after 2 clicks:', JSON.stringify(await perfState()));
console.log('perf pageerrors:', errs4.length ? errs4 : 'clean');
await browser.close();
