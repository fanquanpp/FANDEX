/* 收尾验证：
   A) 首页此前 skip 的元素（hero/footer 链接、分类折叠、滚动按钮、主题切换、性能面板、返回顶部）
   B) /javascript/ 文档页 role=tab（Chapters/All）
   C) ds 锚点（locator 精确点击，判 hash 与滚动） */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const BASE = 'http://localhost:4321/FANDEX/';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost:4321' });
const page = await ctx.newPage();
page.setDefaultTimeout(8000);
const out = [];
const log = (n, ok, note) => { out.push({ n, ok, note }); console.log((ok ? 'ok  ' : 'BUG ') + n + ' :: ' + String(note).slice(0, 130)); };

/* A1 hero entries */
await page.goto(BASE, { waitUntil: 'load' });
await page.waitForTimeout(1200);
const heroHrefs = await page.evaluate(() => [...document.querySelectorAll('.hero-entries a[href]')].map(a => ({ h: a.getAttribute('href'), t: (a.textContent || '').trim().slice(0, 12) })));
for (const he of heroHrefs) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(800);
  const loc = page.locator(`.hero-entries a[href="${he.h}"]`).first();
  await loc.click({ timeout: 6000 }).catch(e => log('hero ' + he.t, false, String(e).split('\n')[0].slice(0, 80)));
  await page.waitForTimeout(1100);
  const ok = he.h.startsWith('/FANDEX/') ? page.url() === 'http://localhost:4321' + he.h : true;
  log('hero ' + he.t, ok, '-> ' + page.url());
}

/* A2 footer links */
const footerLinks = await page.evaluate(async () => { return null; });
await page.goto(BASE, { waitUntil: 'load' });
await page.waitForTimeout(1000);
const fl = await page.evaluate(() => [...document.querySelectorAll('footer a[href^="/FANDEX/"]')].map(a => ({ h: a.getAttribute('href'), t: (a.textContent || '').trim().slice(0, 12) })));
for (const f of fl) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(700);
  const loc = page.locator(`footer a[href="${f.h}"]`).first();
  try {
    await loc.click({ timeout: 6000 });
    await page.waitForTimeout(1000);
    log('footer ' + f.t, page.url() === 'http://localhost:4321' + f.h, '-> ' + page.url());
  } catch (e) { log('footer ' + f.t, false, String(e).split('\n')[0].slice(0, 80)); }
}

/* A3 分类折叠按钮 */
await page.goto(BASE, { waitUntil: 'load' });
await page.waitForTimeout(1200);
const catBtns = await page.evaluate(() => [...document.querySelectorAll('.category-header__lead[data-toggle]')].map(b => ({ label: b.getAttribute('aria-label'), sec: b.closest('.category-section')?.querySelector('.category-section__title, h2')?.textContent?.trim().slice(0, 10) || '' })));
for (let i = 0; i < catBtns.length; i++) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(900);
  const before = await page.evaluate(() => document.querySelectorAll('.category-section.collapsed').length);
  await page.locator('.category-header__lead[data-toggle]').nth(i).click({ timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => document.querySelectorAll('.category-section.collapsed').length);
  log('category toggle [' + catBtns[i].label.slice(5, 12) + ']', before !== after, before + '->' + after + ' collapsed');
}

/* A4 滚动按钮（第一个分类的左右） */
await page.goto(BASE, { waitUntil: 'load' });
await page.waitForTimeout(1200);
const navBefore = await page.evaluate(() => Math.round(document.querySelector('.feature-scroller')?.scrollLeft ?? -1));
await page.locator('.category-nav-btn[data-nav="1"]').first().click({ timeout: 6000 }).catch(() => {});
await page.waitForTimeout(1400);
const navAfter = await page.evaluate(() => Math.round(document.querySelector('.feature-scroller')?.scrollLeft ?? -1));
log('scroller next btn', navAfter !== navBefore, navBefore + '->' + navAfter);

/* A5 主题切换 */
await page.goto(BASE, { waitUntil: 'load' });
await page.waitForTimeout(900);
const th0 = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
await page.locator('.fndx-theme-toggle').first().click();
await page.waitForTimeout(600);
const th1 = await page.evaluate(() => ({ t: document.documentElement.getAttribute('data-theme'), stored: localStorage.getItem('fandex-theme') }));
log('theme toggle', th1.t !== th0, th0 + '->' + th1.t + ' stored=' + th1.stored);
await page.locator('.fndx-theme-toggle').first().click();
await page.waitForTimeout(500);

/* A6 性能面板开关 + 关闭 */
const pmT = await page.evaluate(() => !!document.getElementById('perf-monitor-toggle'));
if (pmT) {
  await page.locator('#perf-monitor-toggle').click();
  await page.waitForTimeout(600);
  const open1 = await page.evaluate(() => { const p = document.querySelector('.perf-monitor'); return p && !p.classList.contains('collapsed') && p.getBoundingClientRect().width > 0; });
  await page.locator('#perf-monitor-close').click().catch(() => {});
  await page.waitForTimeout(600);
  const open2 = await page.evaluate(() => { const p = document.querySelector('.perf-monitor'); return p && p.getBoundingClientRect().width > 0 && !p.classList.contains('collapsed'); });
  log('perf monitor toggle+close', open1 && !open2, 'open=' + open1 + ' visibleAfterClose=' + open2);
}

/* A7 返回顶部 */
await page.goto(BASE, { waitUntil: 'load' });
await page.waitForTimeout(900);
await page.evaluate(() => { const m = document.getElementById('app-main') || document.scrollingElement; m.scrollTo(0, 800); });
await page.waitForTimeout(500);
await page.locator('#nav-back-to-top').click().catch(() => {});
await page.waitForTimeout(900);
const backTop = await page.evaluate(() => (document.getElementById('app-main') || document.scrollingElement).scrollTop);
log('back-to-top', backTop < 50, 'scrollTop=' + backTop);

/* B doc 页 tabs */
await page.goto(BASE + 'javascript/010-WhatIsJavaScript/', { waitUntil: 'load' });
await page.waitForTimeout(1600);
const tabs = await page.evaluate(() => [...document.querySelectorAll('[role="tab"]')].map(t => ({ id: t.id, text: (t.textContent || '').trim().slice(0, 12), selected: t.getAttribute('aria-selected') })));
for (let i = 0; i < tabs.length; i++) {
  await page.goto(BASE + 'javascript/010-WhatIsJavaScript/', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  await page.locator('[role="tab"]').nth(i).click().catch(() => {});
  await page.waitForTimeout(800);
  const st = await page.evaluate(() => ({
    sel: [...document.querySelectorAll('[role="tab"]')].map(t => t.getAttribute('aria-selected')).join(','),
    visible: [...document.querySelectorAll('[role="tabpanel"]')].filter(p => !p.hidden && p.getBoundingClientRect().height > 0).length,
  }));
  log('doc tab ' + tabs[i].text, /true/.test(st.sel) && st.visible >= 1, 'selected=' + st.sel + ' visiblePanels=' + st.visible);
}

/* C ds 锚点 */
await page.goto(BASE + 'design-system/', { waitUntil: 'load' });
await page.waitForTimeout(900);
const dsAnchors = await page.evaluate(() => [...new Set([...document.querySelectorAll('a[href^="#"]')].map(a => a.getAttribute('href')))]);
for (const an of dsAnchors) {
  await page.goto(BASE + 'design-system/', { waitUntil: 'load' });
  await page.waitForTimeout(700);
  const r = await page.evaluate((h) => { const a = document.querySelector(`a[href="${h}"]`); if (!a) return null; a.scrollIntoView({ block: 'center' }); return true; }, an);
  if (!r) { log('ds anchor ' + an, false, 'anchor element gone'); continue; }
  await page.waitForTimeout(250);
  const loc = page.locator(`a[href="${an}"]`).first();
  await loc.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(900);
  const st = await page.evaluate((h) => ({ hash: decodeURIComponent(location.hash), target: !!document.getElementById(h.slice(1)), scrolled: (document.getElementById('app-main') || document.scrollingElement).scrollTop }), an);
  log('ds anchor ' + an, st.hash === an || st.scrolled > 0, 'hash=' + JSON.stringify(st.hash) + ' targetExists=' + st.target + ' scroll=' + st.scrolled);
}
console.log('==== final2: ' + out.filter(o => o.ok).length + ' ok / ' + out.length + ' ====');
await browser.close();
