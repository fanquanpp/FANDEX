/* 交叉验证 r1 两个产品缺陷在当前分支是否已修复：
   IR1-1 首页 module-card 真实鼠标点击不跳转（home-interactions.ts setPointerCapture）
   IR1-2 复制按钮 execCommand fallback Illegal invocation（layout-interactions.ts Reflect.get） */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const BASE = 'http://localhost:4321/FANDEX/';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost:4321' });
const page = await ctx.newPage();
page.setDefaultTimeout(8000);
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).slice(0, 120)));

// IR1-1
await page.goto(BASE, { waitUntil: 'load' });
await page.waitForTimeout(1300);
const card = page.locator('a.module-card[href="/FANDEX/start/"]').first();
const box = await card.boundingBox();
if (box) {
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(1500);
  console.log('IR1-1 home card real mouse click ->', page.url().includes('/start/') ? 'NAVIGATED (regression fixed)' : 'STAYED (still buggy)');
} else console.log('IR1-1: start card not found');

// IR1-2 正常路径复制无 Illegal invocation
errs.length = 0;
await page.goto(BASE + 'javascript/010-WhatIsJavaScript/', { waitUntil: 'load' });
await page.waitForTimeout(1500);
const cp = page.locator('.code-block .copy-btn').first();
if (await cp.count()) {
  await cp.scrollIntoViewIfNeeded();
  await cp.click();
  await page.waitForTimeout(600);
  const copied = await cp.evaluate((el) => el.classList.contains('copied'));
  const illegal = errs.filter((e) => /Illegal invocation/.test(e));
  console.log('IR1-2 copy btn: copied=' + copied + ' illegalInvocationErrors=' + illegal.length);
} else console.log('IR1-2: no copy btn');
await browser.close();
