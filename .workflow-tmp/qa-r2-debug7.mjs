/* 核查两件"no observable change"疑点：
   1) #perf-monitor-close 点击后面板是否仍挂载/可见
   2) #sidebar-expand-fab / #sidebar-collapse-btn 状态 */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const BASE = 'http://localhost:4321/FANDEX/';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(BASE+'javascript/', { waitUntil: 'load' });
await page.waitForTimeout(1500);

// perf monitor close
const pm = await page.evaluate(() => {
  const panel = document.querySelector('.perf-monitor, #perf-monitor, [data-perf-monitor]');
  const t = document.getElementById('perf-monitor-toggle');
  const c = document.getElementById('perf-monitor-close');
  return {
    panelExists: !!panel, panelVisible: panel ? panel.getBoundingClientRect().width > 0 : false,
    panelCls: panel ? panel.className.slice(0,60) : '',
    toggleExists: !!t, closeExists: !!c,
  };
});
console.log('perf monitor before close:', JSON.stringify(pm));
await page.locator('#perf-monitor-close').click({timeout:5000}).catch(e=>console.log('  err', String(e).slice(0,80)));
await page.waitForTimeout(800);
const pm2 = await page.evaluate(() => {
  const panel = document.querySelector('.perf-monitor, #perf-monitor, [data-perf-monitor]');
  return { panelExists: !!panel, panelVisible: panel ? panel.getBoundingClientRect().width > 0 : false, panelCls: panel ? panel.className.slice(0,60) : '', bodyCls: document.body.className.slice(0,80) };
});
console.log('perf monitor after close:', JSON.stringify(pm2));

// sidebar collapse
await page.goto(BASE+'javascript/', { waitUntil: 'load' });
await page.waitForTimeout(1200);
const sb1 = await page.evaluate(() => {
  const sb = document.getElementById('app-sidebar');
  return { cls: sb ? sb.className : null, body: document.body.className.slice(0,60), collapsed: sb ? sb.classList.contains('is-collapsed') : null };
});
await page.locator('#sidebar-collapse-btn').click({timeout:5000}).catch(e=>console.log('  err', String(e).slice(0,80)));
await page.waitForTimeout(800);
const sb2 = await page.evaluate(() => {
  const sb = document.getElementById('app-sidebar');
  return { cls: sb ? sb.className : null, body: document.body.className.slice(0,60), collapsed: sb ? sb.classList.contains('is-collapsed') : null };
});
console.log('sidebar before collapse:', JSON.stringify(sb1));
console.log('sidebar after collapse :', JSON.stringify(sb2));
await browser.close();
