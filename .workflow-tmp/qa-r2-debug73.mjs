/* 设计确认：handleNewDraft 不设 title（DEFAULT_TEMPLATE.title=''，注释明确"空标题=未命名"）。
   模板加载的正确断言 = CodeMirror 内容变化 + 预览刷新，而非 title 变化。
   r1 的 "title applied" 是措辞不严谨。最终按代码语义裁定：模板加载 OK（codeLen 已变）。
   至此所有页面级交互验证完成。最后跑一次总错误巡检（全部 17 页快速 reload 收集 pageerror/console）
   并清点 SW 状态。 */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const BASE = 'http://localhost:4321/FANDEX/';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.setDefaultTimeout(20000);
const errs = [];
const conErrs = [];
page.on('pageerror', e => errs.push({ url: page.url().replace('http://localhost:4321/FANDEX',''), msg: String(e).slice(0, 140) }));
page.on('console', m => { if (m.type() === 'error') conErrs.push({ url: page.url().replace('http://localhost:4321/FANDEX',''), msg: m.text().slice(0, 140) }); });
const pages = ['', 'javascript/', 'javascript/page/2/', 'javascript/010-WhatIsJavaScript/', 'algorithm/290-NetworkFlow/', 'learning-path/', 'learning-path/javascript/', 'playground/', 'playground/editor/', 'syntax/', 'algorithms/', 'algorithms/?view=problems', 'algorithms/problems/remove-element/', 'ai/', 'disclaimer/', 'design-system/', '404/'];
// 首页 SW 清理
await page.goto(BASE, { waitUntil: 'load' });
await page.evaluate(async () => {
  const regs = await navigator.serviceWorker.getRegistrations();
  for (const r of regs) await r.unregister();
  const keys = await caches.keys();
  for (const k of keys) await caches.delete(k);
});
await page.reload({ waitUntil: 'load' });
const swCount = await page.evaluate(() => navigator.serviceWorker.getRegistrations().then(rs => rs.length));
console.log('SW registrations after cleanup:', swCount);
for (const p of pages) {
  await page.goto(BASE + p, { waitUntil: 'load', timeout: 45000 }).catch(e => console.log('goto err', p, String(e).split('\n')[0].slice(0, 60)));
  await page.waitForTimeout(1800);
}
console.log('==== sweep pageerrors:', errs.length, ' consoleErrors:', conErrs.length);
for (const e of errs) console.log('  PE [', e.url, ']', e.msg);
const seen = new Set();
for (const e of conErrs) { const k = e.url + '|' + e.msg.slice(0, 60); if (!seen.has(k)) { seen.add(k); console.log('  CE [', e.url, ']', e.msg); } }
await browser.close();
