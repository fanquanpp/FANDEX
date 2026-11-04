/* 最后一组残留验证：
   1) playground 与 algorithms 页此前 skip 的关键交互元素补测（用精确选择器）
   2) /javascript/page/2/ 的 sidebar-collapse / perf-monitor 闭环（在正确页面状态）
   3) ai 页 key 显示/保存等在 final2 未覆盖（r1 已过，r2 main pass 已覆盖 focus），快速抽查
   4) 收集全程 pageerror/console error */
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

/* 1) playground：模板菜单、灵感库、控制台、运行（精确选择器，等 hydration） */
await page.goto(BASE + 'playground/', { waitUntil: 'load' });
await page.locator('.pg-toolbar').waitFor({ timeout: 15000 }).catch(() => {});
await page.waitForTimeout(1200);
const pgHasToolbar = await page.locator('.pg-toolbar').count();
console.log('pg toolbar:', pgHasToolbar);
if (pgHasToolbar) {
  // run
  const runBtn = page.locator('.pg-toolbar button', { hasText: /运行|刷新预览/ }).first();
  if (await runBtn.count()) {
    const frameBefore = await page.evaluate(() => document.querySelectorAll('.pg-preview iframe, iframe').length);
    await runBtn.click().catch(() => {});
    await page.waitForTimeout(1500);
    console.log('pg run clicked (iframes before/after):', frameBefore, await page.evaluate(() => document.querySelectorAll('.pg-preview iframe, iframe').length));
  }
  // console toggle
  const conBtn = page.locator('.pg-toolbar button', { hasText: '控制台' }).first();
  if (await conBtn.count()) {
    const c0 = await page.evaluate(() => !!document.querySelector('.pg-console'));
    await conBtn.click();
    await page.waitForTimeout(700);
    const c1 = await page.evaluate(() => !!document.querySelector('.pg-console'));
    console.log('pg console toggle:', c0, '->', c1);
    await conBtn.click();
  }
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
}

/* 2) /javascript/page/2/ sidebar collapse 闭环 */
await page.goto(BASE + 'javascript/page/2/', { waitUntil: 'load' });
await page.waitForTimeout(1400);
const sb = await page.evaluate(() => document.getElementById('app-sidebar')?.className || '');
await page.locator('#sidebar-collapse-btn').click().catch(e => console.log('sb err'));
await page.waitForTimeout(700);
const sbAfter = await page.evaluate(() => document.getElementById('app-sidebar')?.className || '');
console.log('page/2 sidebar collapse:', /is-collapsed/.test(sb), '->', /is-collapsed/.test(sbAfter));
await page.locator('#sidebar-expand-fab').click().catch(e => console.log('fab err', String(e).split('\n')[0].slice(0, 60)));
await page.waitForTimeout(700);
const sbBack = await page.evaluate(() => document.getElementById('app-sidebar')?.className || '');
console.log('page/2 sidebar re-expand:', /is-collapsed/.test(sbBack));

/* 3) ai key toggle */
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
console.log('==== errors this session:', errs.length);
for (const e of errs.slice(0, 8)) console.log('  [', e.url, ']', e.msg);
await browser.close();
