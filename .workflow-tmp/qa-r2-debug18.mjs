/* 决定性判定：hook t() 不可能，但 hook UI_STRINGS 的入口可以——
   vite dev 支持模块级 import；但 SyntaxExplorer 里 t 是绑定引用。
   换个角度：直接给 entry[lang] 打 undefined 概率监测不可行。
   决定性方案：CDP 对 i18n.ts:56 设断点（Debugger.setBreakpointByUrl），
   命中时求值 {key, lang, entry, text}，脚本自动 continue。 */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Debugger.enable');
await cdp.send('Debugger.setInstrumentationBreakpoint', { instrumentation: 'beforeScriptExecution' }).catch(()=>{});
// 用 setBreakpointByUrl 按 url 正则
const bp = await cdp.send('Debugger.setBreakpointByUrl', {
  urlRegex: '.*\/src\/lib\/i18n\.ts.*',
  lineNumber: 55, columnNumber: 2, condition: 'text === undefined'
}).catch(e => { console.log('bp err', String(e).slice(0,200)); return null; });
console.log('breakpoint:', JSON.stringify(bp).slice(0,200));

const hits = [];
cdp.on('Debugger.paused', async (ev) => {
  try {
    const frames = ev.callFrames || [];
    const f0 = frames[0];
    if (f0) {
      const r = await cdp.send('Debugger.evaluateOnCallFrame', { callFrameId: f0.callFrameId, expression: 'JSON.stringify({key, lang, entry: entry ? entry[lang] : null, text, params})' });
      hits.push(r.result.value);
      console.log('HIT:', r.result.value);
    }
  } catch (e) { console.log('eval err', String(e).slice(0,150)); }
  await cdp.send('Debugger.resume').catch(()=>{});
});

const errs = [];
page.on('pageerror', e => errs.push(String(e).slice(0,100)));
await page.goto('http://localhost:4321/FANDEX/syntax/', { waitUntil: 'load' });
await page.waitForTimeout(1800);
const lang = page.locator('[data-lang-toggle]').first();
for (let i = 0; i < 12; i++) { lang.click({timeout:2000}).catch(()=>{}); await page.waitForTimeout(120); }
await page.waitForTimeout(1500);
console.log('hits:', hits.length, 'pageerrors:', errs.length);
await browser.close();
