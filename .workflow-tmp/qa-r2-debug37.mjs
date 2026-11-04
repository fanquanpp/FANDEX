/* sidebar 第一条（y=143, 可见）点击后 STAYED？—— sidebar link 点击被 scroll-spy/
   active 高亮逻辑处理了？检查 sidebar link 点击是否真的导航。
   （doc 页 sidebar 是章节内导航；模块列表页 sidebar = 全文档列表，点击应该导航） */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.setDefaultTimeout(8000);
await page.goto('http://localhost:4321/FANDEX/javascript/', { waitUntil: 'load' });
await page.waitForTimeout(900);
const link = page.locator('.fndx-sidebar__link', { hasText: '01JavaScript 是什么' }).first();
const info = await link.evaluate(el => ({y: Math.round(el.getBoundingClientRect().y), h: el.getBoundingClientRect().height, href: el.getAttribute('href')}));
console.log('link info:', JSON.stringify(info));
await link.click({ timeout: 5000 }).catch(e=>console.log('click err', String(e).split('\n')[0]));
await page.waitForTimeout(1500);
console.log('after sidebar link click:', page.url());
await browser.close();
