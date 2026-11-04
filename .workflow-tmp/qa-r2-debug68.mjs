/* pg guide dialog（首次访问指引）挡住工具栏 —— 正常产品行为。先关掉 guide 再继续。
   （注意此前 main 阶段 pg toolbar 点击通过了，因为那时 guide 可能已被 localStorage 标记已读；
    本会话新 context 首次访问弹 guide。也解释了 main 阶段部分 pg skip） */
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
const errs = [];
page.on('pageerror', e => errs.push({ url: page.url().replace('http://localhost:4321/FANDEX',''), msg: String(e).slice(0, 120) }));
page.on('console', m => { if (m.type() === 'error') errs.push({ url: page.url().replace('http://localhost:4321/FANDEX',''), msg: '[console] ' + m.text().slice(0, 100) }); });

await page.goto(BASE + 'playground/', { waitUntil: 'load' });
await page.locator('.pg-toolbar').waitFor({ timeout: 15000 }).catch(() => {});
await page.waitForTimeout(1000);
// 关 guide
const guide = page.locator('.pg-guide');
if (await guide.count()) {
  const closeBtn = page.locator('.pg-guide button', { hasText: /开始|知道了|关闭|Got|开始使用/ }).first();
  if (await closeBtn.count()) { await closeBtn.click().catch(() => {}); }
  else await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
  console.log('guide closed:', await page.evaluate(() => !document.querySelector('.pg-guide')?.getBoundingClientRect().width || !document.querySelector('.pg-guide')));
}
// console toggle
const conBtn = page.locator('.pg-toolbar button[title="控制台"]').first();
const c0 = await page.evaluate(() => !!document.querySelector('.pg-console'));
await conBtn.click().catch(e => console.log('console btn err', String(e).split('\n')[0].slice(0, 60)));
await page.waitForTimeout(700);
const c1 = await page.evaluate(() => !!document.querySelector('.pg-console'));
console.log('pg console toggle:', c0, '->', c1);
await page.locator('.pg-toolbar button[title="控制台"]').first().click().catch(() => {});
// template menu
const newBtn = page.locator('.pg-new-wrap > button').first();
if (await newBtn.count()) {
  await newBtn.click();
  await page.waitForTimeout(500);
  const items = await page.locator('.pg-menu .pg-menu-item').count();
  console.log('pg template menu items:', items);
  if (items) {
    const t0 = await page.evaluate(() => document.querySelector('.pg-title-input')?.value || '');
    await page.locator('.pg-menu .pg-menu-item').first().click();
    await page.waitForTimeout(1300);
    const t1 = await page.evaluate(() => document.querySelector('.pg-title-input')?.value || '');
    console.log('pg template load:', JSON.stringify(t0), '->', JSON.stringify(t1));
  }
}
// gallery
const galBtn = page.locator('.pg-toolbar button', { hasText: '灵感库' }).first();
if (await galBtn.count()) {
  await galBtn.click();
  await page.waitForTimeout(1000);
  const cards = await page.evaluate(() => document.querySelectorAll('.pg-sc-card').length);
  console.log('pg gallery cards:', cards);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  console.log('pg gallery closed:', await page.evaluate(() => !document.querySelector('.pg-sc-mask')));
}

/* sidebar collapse/expand 闭环 */
await page.goto(BASE + 'javascript/page/2/', { waitUntil: 'load' });
await page.waitForTimeout(1400);
await page.locator('#sidebar-collapse-btn').click().catch(e => console.log('sb err', String(e).split('\n')[0].slice(0, 50)));
await page.waitForTimeout(700);
const col = await page.evaluate(() => /is-collapsed/.test(document.getElementById('app-sidebar')?.className || ''));
await page.locator('#sidebar-expand-fab').click().catch(e => console.log('fab err', String(e).split('\n')[0].slice(0, 50)));
await page.waitForTimeout(700);
const exp = await page.evaluate(() => /is-collapsed/.test(document.getElementById('app-sidebar')?.className || ''));
console.log('page/2 sidebar collapse->expand:', col, '->', !exp);

/* ai key toggle */
await page.goto(BASE + 'ai/', { waitUntil: 'load' });
await page.waitForTimeout(1400);
const keyBtn = page.locator('button[aria-pressed]').first();
if (await keyBtn.count()) {
  const p0 = await keyBtn.getAttribute('aria-pressed');
  await keyBtn.click();
  await page.waitForTimeout(600);
  const p1 = await keyBtn.getAttribute('aria-pressed');
  console.log('ai key toggle:', p0, '->', p1);
}
console.log('==== session errors:', errs.length);
for (const e of errs.slice(0, 8)) console.log('  [', e.url, ']', e.msg);
await browser.close();
