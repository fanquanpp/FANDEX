/* 三类复核：
   A) hasText "Next" 在模块页匹配到的其实是 doc 卡片（误配）→ 手动点击 .pager-link.next 是否正常
   B) 模块页 sidebar 链接点击失配：枚举时 sidebar 链接可见（y>0），fresh goto 后第 N 个匹配元素位移 → 验证 hasText 匹配到了不可达副本
   C) /FANDEX/start/ 卡片手动点击（.doc-list-link） */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const BASE = 'http://localhost:4321/FANDEX/';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

// A: typescript pager
await page.goto(BASE+'typescript/', { waitUntil: 'load' });
await page.waitForTimeout(900);
const pagerNext = page.locator('.pager-link').filter({ hasText: '下一页' }).first();
console.log('ts pager next count:', await pagerNext.count());
if (await pagerNext.count()) {
  const h = await pagerNext.getAttribute('href');
  await pagerNext.click({ timeout: 6000 }).catch(e=>console.log('  err', String(e).slice(0,80)));
  await page.waitForTimeout(1200);
  console.log('ts pager next', h, '->', page.url());
}

// B: konado sidebar link scrollIntoView + click
await page.goto(BASE+'konado/', { waitUntil: 'load' });
await page.waitForTimeout(900);
const sb = page.locator('#app-sidebar a[href="/FANDEX/konado/010-KonadoOverviewAndInstall/"], .fndx-sidebar__link[href="/FANDEX/konado/010-KonadoOverviewAndInstall/"]').first();
console.log('konado sidebar link count:', await sb.count());
if (await sb.count()) {
  await sb.scrollIntoViewIfNeeded().catch(()=>{});
  await page.waitForTimeout(400);
  await sb.click({ timeout: 6000 }).catch(e=>console.log('  err', String(e).slice(0,80)));
  await page.waitForTimeout(1200);
  console.log('konado sidebar link ->', page.url());
}

// C: start doc-list-link 01
await page.goto(BASE+'start/', { waitUntil: 'load' });
await page.waitForTimeout(900);
const card = page.locator('a.doc-list-link[href*="/FANDEX/start/010-"], a[href*="/FANDEX/start/010-"]').last();
console.log('start card count:', await card.count());
if (await card.count()) {
  const ci = await card.evaluate(el => ({cls: el.className.slice(0,40), rect:(r=>({y:Math.round(r.y)}))(el.getBoundingClientRect())}));
  console.log('start card info', JSON.stringify(ci));
  await card.scrollIntoViewIfNeeded().catch(()=>{});
  await card.click({ timeout: 6000 }).catch(e=>console.log('  err', String(e).slice(0,80)));
  await page.waitForTimeout(1200);
  console.log('start card ->', page.url());
}
await browser.close();
