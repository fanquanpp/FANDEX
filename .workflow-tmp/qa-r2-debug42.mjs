/* 上一轮 4s 后 URL 已变成 020！说明导航慢（dev 按需编译 2-4s）。verify 套件 900ms 等待太短？
   但 verify 报的是 locator.click TIMEOUT（点击本身超时），不是 URL 未变。
   click timeout 6s + dev 首次编译新页面 → Astro dev 的 client router fetch 会 pending 很久，
   click() 等待 actionability + 导航？不，Playwright click 不等导航。
   timeout 或许因为上一页导航后 hydration 未完成（astro-island pending），click actionability
   等 stable boundingbox？回归实测：量每次点击耗时 */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.setDefaultTimeout(8000);
const url = 'http://localhost:4321/FANDEX/javascript/';
const hrefs = ['/010-WhatIsJavaScript/','/020-JavaScriptOverviewRuntimeEnv/','/030-ProgramStructureBasicSyntax/','/040-VariableDataType/','/050-DataTypeOperator/'];
for (let i = 0; i < hrefs.length; i++) {
  const full = '/FANDEX/javascript' + hrefs[i];
  if (!page.url().startsWith(url)) { const t=Date.now(); await page.goto(url, { waitUntil: 'load' }); await page.waitForTimeout(400); }
  const card = page.locator(`a.doc-list-link[href="${full}"]`).first();
  const t0 = Date.now();
  try {
    await card.click({ timeout: 30000 });
    const clickMs = Date.now()-t0;
    await page.waitForURL('**'+hrefs[i], { timeout: 30000 }).catch(()=>{});
    console.log(i, hrefs[i], 'click '+clickMs+'ms, final NAV=' + page.url().includes(hrefs[i].replace(/\//g,'')));
  } catch (e) { console.log(i, 'TIMEOUT', String(e).split('\n')[0].slice(0,80)); }
}
await browser.close();
