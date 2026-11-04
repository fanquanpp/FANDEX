/* /404/ 页 console error 404 资源定位：哪个 URL 404？ */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const BASE = 'http://localhost:4321/FANDEX/';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const bad = [];
page.on('response', r => { if (r.status() >= 400) bad.push({ url: r.url().replace('http://localhost:4321',''), status: r.status() }); });
await page.goto(BASE + '404/', { waitUntil: 'load' });
await page.waitForTimeout(2000);
console.log('resources >=400 on /404/:', JSON.stringify(bad, null, 1));
await browser.close();
