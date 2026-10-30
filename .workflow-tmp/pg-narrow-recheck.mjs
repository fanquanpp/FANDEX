// 375px 窄屏复检（左右布局 pen 的预览头行挤压）
import { chromium } from 'file:///C:/Atian/Project/FANDEX/app-web/node_modules/playwright/index.mjs';
import fs from 'node:fs';

const OUT = 'C:/Atian/Project/FANDEX/.workflow-tmp/shots/playground';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 375, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 150)));
await page.goto('http://localhost:4321/FANDEX/playground/', { waitUntil: 'networkidle' });
await page.waitForSelector('.pg-toolbar .fndx-button', { timeout: 30000 });
await page.evaluate(async () => {
  const regs = await navigator.serviceWorker?.getRegistrations?.() ?? [];
  await Promise.all(regs.map((r) => r.unregister()));
  const keys = await caches.keys();
  await Promise.all(keys.map((k) => caches.delete(k)));
});
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(800);
// 强制左右布局（窄屏默认 top，需验证用户存档为 left 的 pen 不挤压）
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('.pg-toolbar .fndx-button')]
    .find((b) => (b.getAttribute('title') ?? '').includes('布局') || (b.getAttribute('title') ?? '').includes('排列'));
  if (btn) btn.click();
});
await page.waitForTimeout(400);
const probe = await page.evaluate(() => ({
  layout: document.querySelector('.pg-editors')?.className,
  titleOverflow: (() => {
    const el = document.querySelector('.pg-preview-title');
    if (!el) return 'missing';
    return el.scrollWidth > el.clientWidth ? 'clipped-with-ellipsis' : 'fits';
  })(),
  headScrollOverflow: (() => {
    const el = document.querySelector('.pg-preview-head');
    return el ? el.scrollWidth > el.clientWidth : 'missing';
  })(),
  pageOverflow: document.documentElement.scrollWidth > 375,
}));
await page.screenshot({ path: `${OUT}/375-dark-left-layout.png`, clip: { x: 0, y: 0, width: 375, height: 320 } });
console.log(JSON.stringify({ probe, errors }));
await browser.close();
