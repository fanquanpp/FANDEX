/* 找 sweep 时真实失败因子：sweep 中 click 用 el.label.slice(0,24) 但 label 有 40 字符
   且 contains intro 描述。失败日志是 "waiting for locator('a').fil..." —— hasText filter。
   差异还有：sweep 的 ENUMERATE label = textContent(40) 但卡内 span 结构 click 目标点
   = 元素中心 (281+1142/2, 247+54/2) = (852, 274)。中心或被 .doc-list-icon/desc 覆盖？
   但 elementFromPoint 已验证 hitIsSelf。
   还有一种：sweep 点击第 0 个元素是 40 字 label 的整卡；但失败 log 是 waiting for
   locator('a').fil —— 说明 locator 从未 resolve 出可见稳定状态。
   复刻 40 字 label： */
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
// 完整 40 字 label（同 sweep）
const label = '001入门JavaScript 是什么：你的第一门编程语言面向完全零基础读者，讲';
const loc = page.locator('a', { hasText: label.slice(0, 24) }).first();
console.log('slice24 of 40:', JSON.stringify(label.slice(0,24)));
const n = await loc.count();
console.log('count:', n);
try { await loc.click({ timeout: 5000 }); await page.waitForTimeout(1200); console.log('clicked ->', page.url().includes('010') ? 'NAV' : 'STAYED'); }
catch (e) { console.log('TIMEOUT'); }
await browser.close();
