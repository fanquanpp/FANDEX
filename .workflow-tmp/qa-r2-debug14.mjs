/* 捕获 error.stack 定位 replace 报错源头 */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const BASE = 'http://localhost:4321/FANDEX/';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
let errs = [];
page.on('pageerror', e => errs.push({ url: page.url(), msg: String(e), stack: (e.stack || '').slice(0, 900) }));
// 只做 lang toggle 连击
await page.goto(BASE+'syntax/', { waitUntil: 'load' });
await page.waitForTimeout(1500);
const lang = page.locator('[data-lang-toggle]').first();
for (let i = 0; i < 8; i++) { await lang.click({timeout:3000}).catch(()=>{}); await page.waitForTimeout(200); }
console.log('after lang stress:', errs.length);
for (const e of errs) console.log('URL:', e.url, '\nMSG:', e.msg.slice(0,200), '\nSTACK:', e.stack, '\n----');
await browser.close();
