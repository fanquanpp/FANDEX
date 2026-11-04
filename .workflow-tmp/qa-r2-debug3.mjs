import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const BASE = 'http://localhost:4321/FANDEX/';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

// case C: NetworkFlow sidebar：枚举所有含 "算法与数据结构"/"图算法" 文本的 a
await page.goto(BASE+'algorithm/290-NetworkFlow/', { waitUntil: 'load' });
await page.waitForTimeout(900);
const m = await page.evaluate(() => [...document.querySelectorAll('a')].filter(a => /算法与数据结构|图算法/.test((a.textContent||''))).map(a => ({t:(a.textContent||'').trim().slice(0,30), h:a.getAttribute('href'), cls:a.className.slice(0,40), parentCls:a.parentElement?.className?.slice?.(0,40) || ''})));
console.log(JSON.stringify(m, null, 1));

// case D: syntax "JSJavaScript315"
await page.goto(BASE+'syntax/', { waitUntil: 'load' });
await page.waitForTimeout(1500);
const s = await page.evaluate(() => [...document.querySelectorAll('a')].filter(a => /JSJavaScript|315/.test((a.textContent||'').replace(/\s+/g,''))).map(a => ({t:(a.textContent||'').trim().slice(0,30), h:a.getAttribute('href'), cls:a.className.slice(0,50)})));
console.log('syntax matches:', JSON.stringify(s, null, 1));

// case E: learning-path Git（列出全部 learning-path 链接）
await page.goto(BASE+'learning-path/', { waitUntil: 'load' });
await page.waitForTimeout(900);
const g = await page.evaluate(() => [...document.querySelectorAll('a[href*="learning-path"]')].map(a => ({t:(a.textContent||'').trim().slice(0,22), h:a.getAttribute('href')})).slice(0,25));
console.log('lp links:', JSON.stringify(g.slice(0,20), null, 1));
await browser.close();
