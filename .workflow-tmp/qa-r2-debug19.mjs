/* 轻量断点：不用 instrumentation（会拦所有脚本）。先 goto 再下断点（此时 i18n.ts 已加载，
   locations 会解析出实际位置），然后连点。 */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Debugger.enable');
await page.goto('http://localhost:4321/FANDEX/syntax/', { waitUntil: 'load' });
await page.waitForTimeout(1200);
const bp = await cdp.send('Debugger.setBreakpointByUrl', {
  urlRegex: '.*/src/lib/i18n\.ts.*',
  lineNumber: 55, columnNumber: 2, condition: 'text === undefined'
}).catch(e => { console.log('bp err', String(e).slice(0,150)); return null; });
console.log('bp locations:', JSON.stringify(bp && bp.locations || []).slice(0,200));

const hits = [];
cdp.on('Debugger.paused', async (ev) => {
  try {
    const f0 = (ev.callFrames || [])[0];
    if (f0) {
      const r = await cdp.send('Debugger.evaluateOnCallFrame', { callFrameId: f0.callFrameId, expression: 'JSON.stringify({key, lang, entryVal: typeof entry !== "undefined" ? entry[lang] : null, text, paramKeys: params ? Object.keys(params) : null})' }).catch(()=>null);
      if (r) { hits.push(r.result.value); console.log('HIT:', r.result.value); }
    }
  } catch (e) { console.log('paused-eval err', String(e).slice(0,120)); }
  await cdp.send('Debugger.resume').catch(()=>{});
});

const errs = [];
page.on('pageerror', e => errs.push(String(e).slice(0,80)));
const lang = page.locator('[data-lang-toggle]').first();
for (let i = 0; i < 14; i++) { lang.click({timeout:2000}).catch(()=>{}); await page.waitForTimeout(130); }
await page.waitForTimeout(2000);
console.log('hits:', hits.length, 'pageerrors:', errs.length, errs.slice(0,3));
await browser.close();
