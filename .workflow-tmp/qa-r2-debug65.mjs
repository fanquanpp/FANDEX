/* ds toc link click timeout 但 scrolled=3510 —— 说明点击前页面已滚动（scrollIntoViewIfNeeded），
   然后点击动作本身因元素移动而 timeout？可 scroll=3510 表明真的滚过去了。检查 hash 与
   TOC 链接是否真的把视口带到目标。换成精确两步：先读元素位置，click 后对比。 */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const BASE = 'http://localhost:4321/FANDEX/';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.setDefaultTimeout(8000);
await page.goto(BASE + 'design-system/', { waitUntil: 'load' });
await page.waitForTimeout(1200);
// 列出 TOC 链接和目标
const toc = await page.evaluate(() => [...document.querySelectorAll('a.ds-toc__link')].slice(0, 4).map(a => {
  const href = a.getAttribute('href');
  const target = href && href.startsWith('#') ? document.getElementById(href.slice(1)) : null;
  return { href, targetExists: !!target, targetTop: target ? Math.round(target.getBoundingClientRect().top + (document.getElementById('app-main')?.scrollTop || 0)) : null, text: (a.textContent || '').trim().slice(0, 14) };
}));
console.log('toc:', JSON.stringify(toc, null, 1));
// 点击第 2 个
const second = page.locator('a.ds-toc__link').nth(1);
const before = await page.evaluate(() => (document.getElementById('app-main') || document.scrollingElement).scrollTop);
await second.click({ timeout: 8000, force: false }).catch(e => { console.log('click2 err:', String(e).split('\n').slice(0, 6).join(' ').slice(0, 300)); });
await page.waitForTimeout(1000);
const after = await page.evaluate(() => ({ scroll: (document.getElementById('app-main') || document.scrollingElement).scrollTop, hash: decodeURIComponent(location.hash) }));
console.log('before scroll:', before, 'after:', JSON.stringify(after));
await browser.close();
