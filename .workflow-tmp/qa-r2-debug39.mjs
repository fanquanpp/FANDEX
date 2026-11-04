/* 关键差异定位：verify 套件里每张卡之间 goto 回跳，第一张卡（010）通过，第二张起全部 timeout。
   debug30 证明单卡点击 OK。现在精确复刻 verify 节奏：goto -> click card[0] -> 回跳 -> click card[1] */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.setDefaultTimeout(8000);
const url = 'http://localhost:4321/FANDEX/javascript/';
const hrefs = [
  '/FANDEX/javascript/010-WhatIsJavaScript/',
  '/FANDEX/javascript/020-JavaScriptOverviewRuntimeEnv/',
  '/FANDEX/javascript/030-ProgramStructureBasicSyntax/',
];
for (let i = 0; i < hrefs.length; i++) {
  // verify 的回跳条件: page.url() !== url 才 goto。第一轮 goto 后 url === url，直接点
  if (!page.url().startsWith(url)) { await page.goto(url, { waitUntil: 'load' }); await page.waitForTimeout(0); }
  const card = page.locator(`a.doc-list-link[href="${hrefs[i]}"]`).first();
  const t0 = Date.now();
  try {
    await card.click({ timeout: 6000 });
    await page.waitForTimeout(900);
    console.log(i, hrefs[i].split('/').pop(), page.url() === 'http://localhost:4321'+hrefs[i] ? 'NAV' : 'STAYED ' + page.url(), (Date.now()-t0)+'ms');
  } catch (e) { console.log(i, 'TIMEOUT after', Date.now()-t0, 'ms'); }
}
await browser.close();
