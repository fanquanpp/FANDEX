/* 重新还原 sweep 时 label 到底是什么：枚举时 textContent 包含 icon svg？ 
   复刻 ENUMERATE 的 label 构造对 doc-list-link 的值 */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto('http://localhost:4321/FANDEX/javascript/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(400);
const probe = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll('a.doc-list-link').forEach((a, i) => {
    if (i > 1) return;
    const text = (a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    out.push({ i, text, len: text.length });
  });
  // sidebar 里第一个链接
  const sb = document.querySelector('#app-sidebar a, .fndx-sidebar a');
  if (sb) out.push({ sidebar: true, text: (sb.textContent||'').trim().replace(/\s+/g,' ').slice(0,40) });
  return out;
});
console.log(JSON.stringify(probe, null, 1));
// 用这个 label slice(0,24) 去 hasText 匹配，看 first() 是谁
const label = probe[0].text.slice(0, 24);
console.log('slice24:', JSON.stringify(label));
const loc = page.locator('a', { hasText: label }).first();
const info = await loc.evaluate(el => ({cls: el.className.toString().slice(0,40), rect: JSON.stringify(el.getBoundingClientRect())})).catch(e=>String(e).slice(0,100));
console.log('first match:', JSON.stringify(info));
try { await loc.click({timeout: 4000}); console.log('clicked ->', page.url()); }
catch (e) { console.log('TIMEOUT'); }
await browser.close();
