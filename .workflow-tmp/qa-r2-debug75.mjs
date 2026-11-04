/* 交叉验证唯一真实候选缺陷：lang toggle 单击导致 island 卸载崩溃。
   复核因果链（引用代码）：
   - i18n.ts:44 派发 detail={lang}
   - i18n.ts:57 subscribeLang: (event as CustomEvent<Lang>).detail ?? readLangFromDom()
     → callback 收到 {lang:'en'} 对象（truthy，?? 不走右侧）
   - use-lang.ts:7-13 subscribeLang(setLang) → React state lang = 对象
   - t(key, params, lang) i18n.ts:69-73: entry[lang] → entry[{lang}] = undefined → text.replace 抛 TypeError
   - React 渲染崩溃 → island 整树卸载
   已实测：单次点击 5 页中 3 页（syntax/lp-map/playground）island 清空 + pageerror；
   其他页（/、/javascript/、/algorithms/、/ai/、/disclaimer/）无 island 消费 useLang 或
   t() 在 lang 上下文使用但未崩（r2 main lang pass 记录）。最终确认哪些 island 受影响：
   useLang 消费者 = SyntaxExplorer / SidebarModules / ThemeToggle / learning-path/*(6) /
   playground FrontendLab+ShowcaseGallery。
   再验证 SidebarModules（doc 页 sidebar 模块树）在 lang 点击后是否也崩。 */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const BASE = 'http://localhost:4321/FANDEX/';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push({ url: page.url().replace('http://localhost:4321/FANDEX',''), msg: String(e).slice(0, 90) }));
// doc 页 SidebarModules
await page.goto(BASE + 'javascript/010-WhatIsJavaScript/', { waitUntil: 'load' });
await page.waitForTimeout(1800);
const before = await page.evaluate(() => ({ moduleTree: document.querySelectorAll('.fndx-sidebar__group, .fndx-sidebar__module, [class*=sidebar-module]').length, links: document.querySelectorAll('.fndx-sidebar__link').length }));
await page.locator('[data-lang-toggle]').first().click();
await page.waitForTimeout(1500);
const after = await page.evaluate(() => ({ links: document.querySelectorAll('.fndx-sidebar__link').length }));
console.log('doc page island before:', JSON.stringify(before), 'after:', JSON.stringify(after), 'errors:', errs.length);
// playground FrontendLab
errs.length = 0;
await page.goto(BASE + 'playground/', { waitUntil: 'load' });
await page.locator('.pg-toolbar').waitFor({ timeout: 15000 }).catch(() => {});
await page.waitForTimeout(800);
const pgBefore = await page.evaluate(() => ({ toolbar: !!document.querySelector('.pg-toolbar'), cm: !!document.querySelector('.cm-content') }));
await page.locator('[data-lang-toggle]').first().click();
await page.waitForTimeout(1500);
const pgAfter = await page.evaluate(() => ({ toolbar: !!document.querySelector('.pg-toolbar'), cm: !!document.querySelector('.cm-content') }));
console.log('playground island before:', JSON.stringify(pgBefore), 'after:', JSON.stringify(pgAfter), 'errors:', errs.length, errs[0] ? errs[0].msg : '');
await browser.close();
