/* 卡片点击后 URL 不变 —— 复现了 main 的 [low] 现象。检查点击后是否 client 路由吞了。
   对比：直接 href 导航 vs click。检查 js 错误 */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.setDefaultTimeout(8000);
let reqs = [];
page.on('request', r => { if (r.url().includes('localhost:4321')) reqs.push(r.url().replace('http://localhost:4321','').slice(0,80)); });
const label = '01JavaScript 是什么：你的第一门编程语言';
await page.goto('http://localhost:4321/FANDEX/javascript/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(400);
const loc = page.locator('a', { hasText: label.slice(0, 24) }).first();
await loc.click({ timeout: 5000 });
await page.waitForTimeout(2500);
console.log('url now:', page.url());
console.log('recent requests:', reqs.slice(-6));
// href 属性
const href = await loc.getAttribute('href');
console.log('href attr:', href);
// 再试手动 goto href
await page.goto('http://localhost:4321' + href, { waitUntil: 'load' });
await page.waitForTimeout(1000);
console.log('direct goto works:', page.url());
await browser.close();
