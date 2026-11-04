/* 打桩 text.replace 捕获 receiver：init script 无法改 ESM 内部，但可以
   在 pageerror 发生前用 Error.stack 之外的途径：给页面 window 挂
   unhandledrejection/error 已经有了。改为：vite dev 模块 URL 特定——
   fetch /src/lib/i18n.ts 的内容在浏览器端 eval 前打桩不可能。
   替代：用 CDP Debugger.setInstrumentationBreakpoint 太复杂。
   简化：复现并记录——每次 pageerror 的 URL + 最近 5 次点击序列 + html data-lang，
   以及 SyntaxExplorer meta 行内容。若 error 出现在 data-lang 翻转帧，
   则是 t(key, params, lang) 中 lang 为 'en' 而 entry[lang] undefined → bad=0 已排除；
   或 params 中 title 为 undefined？ 不——replace receiver 是 text。
   text=entry[lang]=undefined 只能 entry[lang] undefined；而两语言都 string。
   除非 key 不在 UI_STRINGS → 早 return key，不会炸。
   还有一种：t() 的另一个实现/另一个 t 导入（如 localist）。grep SyntaxExplorer 其他 t 定义。 */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push({url: page.url(), msg: String(e), stack: (e.stack||'').slice(0,600)}));
await page.goto('http://localhost:4321/FANDEX/syntax/', { waitUntil: 'load' });
await page.waitForTimeout(1800);
// 快速连点 lang toggle 且不做等待，制造 useLang 更新与 fetch 竞态
const lang = page.locator('[data-lang-toggle]').first();
for (let round = 0; round < 4; round++) {
  for (let i = 0; i < 6; i++) { lang.click({timeout:2000}).catch(()=>{}); }
  await page.waitForTimeout(500);
}
console.log('errs:', errs.length);
for (const e of errs) console.log('STACK:', e.stack, '\n--');
await browser.close();
