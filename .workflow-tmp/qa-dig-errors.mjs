import { createRequire } from 'node:module';
const { chromium } = createRequire('C:/Atian/Project/FANDEX/app-web/package.json')('playwright');
const browser = await chromium.launch({ headless: true, args: ['--disable-blink-features=AutomationControlled'] });

/* 探查 1：404 页哪些资源 404 */
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const missing = [];
page.on('response', (r) => { if (r.status() >= 400) missing.push(r.status() + ' ' + r.url()); });
await page.goto('http://localhost:4321/FANDEX/404', { waitUntil: 'load' });
await page.waitForTimeout(1200);
console.log('== 404 page failing requests ==');
for (const m of missing) console.log(' ', m);
const dom404 = await page.evaluate(() => ({
  title: document.title,
  h1: document.querySelector('h1')?.textContent?.slice(0, 60) ?? null,
  hasThemeAttr: document.documentElement.getAttribute('data-theme'),
  bodyLen: document.body.innerText.length,
  btns: [...document.querySelectorAll('a,button')].slice(0, 6).map((b) => b.textContent.trim().slice(0, 20)),
}));
console.log('== 404 page dom ==', JSON.stringify(dom404, null, 1));
await page.close();

/* 探查 2：playground 水合不匹配的具体 diff 与 stroke-width 来源 */
const p2 = await browser.newPage({ viewport: { width: 375, height: 1700 } });
const msgs = [];
p2.on('console', (m) => { if (m.type() === 'error') msgs.push(m.text()); });
p2.on('pageerror', (e) => msgs.push('PAGEERROR ' + e.message.slice(0, 200)));
await p2.goto('http://localhost:4321/FANDEX/playground/', { waitUntil: 'load' });
await p2.waitForTimeout(1500);
console.log('== playground console errors ==');
for (const m of msgs.slice(0, 6)) console.log(' ', m.slice(0, 400).replace(/\n/g, ' | '));
await p2.close();

/* 探查 3：各壳页 header/footer/fx 的源码事实核查（dev server 静态拉取） */
for (const slug of ['syntax/', 'algorithms/', 'playground/', 'learning-path/', 'ai/', 'disclaimer/', '404']) {
  const r = await fetch('http://localhost:4321/FANDEX/' + slug);
  const html = await r.text();
  const has = {
    header: html.includes('data-site-header'),
    footer: html.includes('fndx-footer'),
    backdrop: html.includes('fx-backdrop'),
    glitch: html.includes('data-fx="letter-glitch"'),
  };
  console.log('==', slug, JSON.stringify(has));
}
await browser.close();
