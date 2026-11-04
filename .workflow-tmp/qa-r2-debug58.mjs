/* 残留疑点逐个落锤：
   1) 卡片随机 STAYED（090/100 等）→ 与前面验证的真实点击 NAV 矛盾。可能 CDP 点击
      发生时页面仍在 hydration 或 transition。加长 NAV 等待 + 失败重试 1 次后再判。
   2) NF sidebar 10/10 STAYED —— NF 页 sidebar 是"章节内滚动导航"？检查 href 目标是
      站内文档，点击应该 NAV。手动复测一条。
   3) pager href=null —— .pager-link 有两个变体（disabled 占位 button?）。检查结构。
   4) lp 3 条失败（networking/cloud/cybersecurity）—— 这 3 个模块可能没有 lp 页面？
      curl 状态。
   5) ds anchors #app-main/#ds-toctitle —— 目标元素不存在（引用坏锚点）→ 真实缺陷 */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.setDefaultTimeout(8000);
const BASE = 'http://localhost:4321/FANDEX/';

// 2) NF sidebar 一条
await page.goto(BASE + 'algorithm/290-NetworkFlow/', { waitUntil: 'load' });
await page.waitForTimeout(1000);
const nfInfo = await page.evaluate(() => {
  const a = document.querySelector('.fndx-sidebar__link[href="/FANDEX/algorithm/010-AlgorithmAnalysisBasics/"]');
  if (!a) return { missing: true };
  const r = a.getBoundingClientRect();
  const cs = getComputedStyle(a);
  return { rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width) }, pe: cs.pointerEvents, vis: cs.visibility };
});
console.log('NF sidebar link state:', JSON.stringify(nfInfo));

// 3) pager 结构
await page.goto(BASE + 'javascript/', { waitUntil: 'load' });
await page.waitForTimeout(800);
const pagerInfo = await page.evaluate(() => [...document.querySelectorAll('.pager-link')].map(a => ({ tag: a.tagName, href: a.getAttribute('href'), cls: a.className.toString().slice(0, 40), text: (a.textContent || '').trim().slice(0, 14) })));
console.log('pager elements:', JSON.stringify(pagerInfo, null, 1));

// 4) lp 失败目标页状态
for (const p of ['networking', 'cloud-computing', 'cybersecurity']) {
  const r = await page.goto(BASE + 'learning-path/' + p + '/', { waitUntil: 'load' });
  console.log('lp/' + p + '/ status:', r ? r.status() : 'null', 'title:', (await page.title()).slice(0, 30));
}

// 5) ds 锚点目标存在性
await page.goto(BASE + 'design-system/', { waitUntil: 'load' });
await page.waitForTimeout(700);
const dsT = await page.evaluate(() => ['#app-main', '#ds-toctitle'].map(id => ({ id, exists: !!document.getElementById(id.slice(1)) })));
console.log('ds anchor targets:', JSON.stringify(dsT));
await browser.close();
