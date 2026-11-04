/* 最后差异：sweep 的 ctx.grantPermissions(clipboard) + console/pageerror listeners +
   每元素之间有 beforeState evaluate。也许 beforeState 的 extraSignals 的
   querySelectorAll('.feature-scroller') 慢？不至于。
   直接复刻 testElement 完整路径含 beforeState： */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost:4321' });
const page = await ctx.newPage();
page.setDefaultTimeout(8000);
page.on('pageerror', () => {});
page.on('console', () => {});

async function beforeState(page) {
  return page.evaluate(() => ({
    url: location.pathname + location.search + location.hash,
    dialogs: [...document.querySelectorAll('dialog[open], [role="dialog"]')].map((d) => (d.id || d.className.toString().slice(0, 30))),
    openStates: [...document.querySelectorAll('[data-state="open"], .is-open, [aria-expanded="true"]')].length,
    activeEls: [...document.querySelectorAll('.is-active, [aria-selected="true"], [aria-pressed="true"], [aria-current]')].map((e) => (e.id || e.className.toString().split(/\s+/).slice(0, 2).join('.') || e.tagName)).slice(0, 14),
    bodyCls: document.body.className,
    htmlAttrs: [document.documentElement.getAttribute('data-theme'), document.documentElement.getAttribute('data-lang')].join(','),
    focused: document.activeElement ? (document.activeElement.id || document.activeElement.tagName) : '',
    extra: {
      collapsedSections: document.querySelectorAll('.category-section.collapsed').length,
      scrollerLefts: [...document.querySelectorAll('.feature-scroller')].slice(0, 8).map((s) => Math.round(s.scrollLeft)),
      visibleItems: [...document.querySelectorAll('[data-algo-item], .doc-card, .module-card')].filter((e) => e.getBoundingClientRect().width > 0).length,
      openDetails: document.querySelectorAll('details[open]').length,
    },
  }));
}
const label = '001入门JavaScript 是什么：你的第一';
for (let i = 0; i < 3; i++) {
  await page.goto('http://localhost:4321/FANDEX/javascript/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  const before = await beforeState(page);
  const loc = page.locator('a', { hasText: label }).first();
  try {
    await loc.click({ timeout: 5000 });
    await page.waitForTimeout(700);
    const after = await beforeState(page);
    console.log(i, after.url !== before.url ? 'URL CHANGED -> ' + after.url : 'URL SAME ' + after.url);
  } catch (e) { console.log(i, 'TIMEOUT', String(e).split('\n')[0].slice(0,80)); }
}
await browser.close();
