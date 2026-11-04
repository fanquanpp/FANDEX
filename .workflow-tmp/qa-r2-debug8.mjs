import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const BASE = 'http://localhost:4321/FANDEX/';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(BASE+'javascript/page/2/', { waitUntil: 'load' });
await page.waitForTimeout(1500);
const s1 = await page.evaluate(() => {
  const fab = document.getElementById('sidebar-expand-fab');
  const sb = document.getElementById('app-sidebar');
  return { fabCls: fab ? fab.className.toString().slice(0,60) : null, fabVisible: fab ? fab.getBoundingClientRect().width>0 : false, sbCls: sb ? sb.className.toString().slice(0,50) : null };
});
console.log('expand-fab before:', JSON.stringify(s1));
await page.locator('#sidebar-expand-fab').click({timeout:5000}).catch(e=>console.log('  err', String(e).slice(0,80)));
await page.waitForTimeout(800);
const s2 = await page.evaluate(() => {
  const fab = document.getElementById('sidebar-expand-fab');
  const sb = document.getElementById('app-sidebar');
  return { fabCls: fab ? fab.className.toString().slice(0,60) : null, sbCls: sb ? sb.className.toString().slice(0,50) : null };
});
console.log('expand-fab after :', JSON.stringify(s2));
await browser.close();
