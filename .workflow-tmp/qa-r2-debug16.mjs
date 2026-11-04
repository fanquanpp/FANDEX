/* 精准复现：syntax 页 lang toggle 期间 useLang 订阅触发重渲染；
   active 引用来自 languages（props）。怀疑 i18n 重渲染时 active 短暂 undefined？
   不对——t() 只在 entry[lang] 为 undefined 时炸，即 UI_STRINGS[key][lang]，
   lang 只能是 zh/en。除非 text 本身 undefined：entry[lang] undefined。
   -> 是哪个 key 在 zh/en 之外？或 entry 存在但 entry[lang] undefined？
   用代理打桩：init script 无法拦截 ESM 模块内部。
   改思路：二分调用点 —— 页面里 hook CustomEvent LANG_CHANGE，
   在每次派发后记录 SyntaxExplorer meta 行文本。真正炸点渲染时 text=undefined。
   直接假设：t('syntax.meta'...) 传入的 entry OK。
   另一种可能：SyntaxExplorer.tsx:346 是转译行号，源行 ~363/372/378/400/427/440/452/460/470/475 的 t()。
   其中 427/440: copiedId === selected.id 时 t('syntax.copied')… selected 非 null 时才渲染，OK。
   看 460-490 全部 t() 调用与 UI_STRINGS 对照已全 defined。
   → 动态验证：在浏览器里逐个 t(key) 调 zh/en 看 undefined。 */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto('http://localhost:4321/FANDEX/syntax/', { waitUntil: 'load' });
await page.waitForTimeout(1500);
// vite dev 下可直接 import 模块
const res = await page.evaluate(async () => {
  const mod = await import('/src/lib/i18n-strings.ts');
  const S = mod.UI_STRINGS;
  const bad = [];
  for (const [k, v] of Object.entries(S)) {
    if (!v || typeof v.zh !== 'string' || typeof v.en !== 'string') bad.push({ k, v: JSON.stringify(v).slice(0,80) });
  }
  return { total: Object.keys(S).length, bad };
});
console.log(JSON.stringify(res, null, 1));
await browser.close();
