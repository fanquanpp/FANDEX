/* 在 sweep 同款时序（domcontentloaded+400ms）下点第一张卡 + 检查 rAF/动画 reveal 干扰。
   sweep 用 hasText(24) 但 label 取自 textContent（含 difficulty chip 等拼接文本）。
   label.slice(0,24) 可能横跨多个元素 → hasText 子串匹配但 first() 是侧栏链接？
   检查：sweep 的 el.label 是 aria-label || title || textContent —— 对 doc 卡片 textContent
   = "BeginnerJSJavaScript 是什么：你的第一门编程语言…"。slice(0,24)="BeginnerJSJavaScript 是"
   这会匹配 sidebar 里的同文档链接（也在 DOM 中先出现）！sidebar link 在 y<0 或滚动外 → click 等待失败？ */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.setDefaultTimeout(8000);
await page.goto('http://localhost:4321/FANDEX/javascript/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(400);
const loc = page.locator('a', { hasText: 'BeginnerJSJavaScript 是什么：' }).first();
const n = await loc.count();
console.log('hasText BeginnerJS... count:', n);
if (n) {
  const info = await loc.evaluate(el => ({cls: el.className.toString().slice(0,50), rect: el.getBoundingClientRect().toJSON()}));
  console.log('matched element:', JSON.stringify(info));
  try { await loc.click({timeout: 4000}); console.log('clicked ->', page.url()); }
  catch (e) { console.log('TIMEOUT:', String(e).split('\n')[0]); }
}
await browser.close();
