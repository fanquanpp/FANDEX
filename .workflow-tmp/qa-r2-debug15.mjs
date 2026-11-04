/* 用 CDP Runtime 断点太重；直接打桩 UI_STRINGS 入口无法跨模块。改用：
   在页面里给 String.prototype.replace 打包装 replace 的 undefined receiver 调用栈。
   但 replace 是方法不是独立函数…… 改为：hook SyntaxExplorer 渲染入口？
   最简：hook console + error 时机，在 pageerror 前 dump 最近的 lang 变化。
   或者：用 playwright 的 init script 覆盖 i18n.ts 模块（dev 下 vite 模块 URL 可直接 fetch 源码分析）。
   先直接读 i18n.ts:56 原始行。 */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
// fetch 转译后的 i18n.ts 模块源码看 56 行
await page.goto('http://localhost:4321/FANDEX/syntax/', { waitUntil: 'domcontentloaded' });
const src = await page.evaluate(async () => {
  const r = await fetch('/src/lib/i18n.ts');
  return r.text();
});
const lines = src.split('\n');
console.log('i18n.ts (served) lines 48-64:');
for (let i = 47; i < 64; i++) console.log(i+1, '|', lines[i]);
await browser.close();
