/* useLang 订阅把 detail ?? readLangFromDom() 传入；detail = {lang:'en'} 对象真值 →
   callback 收到 {lang:'en'}，React state lang 变成对象。t(key, undefined, lang) 里
   entry[lang] = undefined → text.replace 炸。验证 useLang 收到的值。 */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto('http://localhost:4321/FANDEX/syntax/', { waitUntil: 'load' });
await page.waitForTimeout(1500);
// 在页面上下文订阅同一事件，复刻 subscribeLang 逻辑确认 callback 参数
const r = await page.evaluate(() => {
  return new Promise((resolve) => {
    const seen = [];
    document.addEventListener('fandex:langchange', (e) => {
      // 复刻 i18n.ts subscribeLang handler
      const cbArg = (e).detail ?? document.documentElement.getAttribute('data-lang');
      seen.push({ cbArgType: typeof cbArg, cbArg: JSON.stringify(cbArg).slice(0,40) });
    }, { once: true });
    document.querySelector('[data-lang-toggle]').click();
    setTimeout(() => resolve(seen), 250);
  });
});
console.log('subscribeLang handler receives:', JSON.stringify(r, null, 1));
// 再确认 html.lang 属性 vs data-lang
const attrs = await page.evaluate(() => ({ htmlLang: document.documentElement.getAttribute('lang'), dataLang: document.documentElement.getAttribute('data-lang') }));
console.log('after click attrs:', JSON.stringify(attrs));
await browser.close();
