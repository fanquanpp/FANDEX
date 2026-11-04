/* 决定性对照：debug30 点了但 URL 未变（与 sweep [low] 一致）；debug28 却 98ms 导航。
   差异 = debug28 的 label 不含 "001入门" 前缀。点同一个元素为何结果不同？
   —— debug28 hasText '01JavaScript 是什么：你的第一门编程语言' first() 匹配到的可能是
   另一个元素（主列表的 title span 的父级 a？）。
   本次调查：page 上有多少个 a 含 "001入门JavaScript 是什么" 子串；每个的 rect；逐个点击。 */
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
const all = page.locator('a', { hasText: '001入门JavaScript 是什么' });
const n = await all.count();
console.log('anchors matching:', n);
for (let i = 0; i < n; i++) {
  const info = await all.nth(i).evaluate(el => ({cls: el.className.toString().slice(0,60), y: Math.round(el.getBoundingClientRect().y), h: Math.round(el.getBoundingClientRect().height)}));
  console.log(' ', i, JSON.stringify(info));
}
// 点击第 0 个并等 2.5s
const t0 = Date.now();
await all.first().click({ timeout: 5000 }).catch(e=>console.log('  click err', String(e).split('\n')[0]));
await page.waitForURL('**/010-WhatIsJavaScript/', {timeout: 5000}).catch(()=>{});
console.log('after click first():', page.url().includes('010') ? 'NAVIGATED in '+(Date.now()-t0)+'ms' : 'STAYED ' + page.url());
await browser.close();
