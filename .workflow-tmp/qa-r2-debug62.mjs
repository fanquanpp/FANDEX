/* 实锤差异：真实按钮点击 stored 变 'light' 而 data-theme 不变。
   setThemePreference(preference) 里 setItem(key, preference) + applyTheme(getResolvedTheme())。
   stored='light' 说明点击时 preference='light'？即 React state preference='light'，
   nextThemePreference('light')='dark' 应该是 'dark'。
   除非点击时 React state 还是 'system'→ next='light'（THEME_CYCLE[1]='dark'…
   等等 THEME_CYCLE=['light','dark','system']，next('system')='light'。
   stored='system' → 点击后 'light' 证明 React state 是 'system'（ hydration 对齐失败！）
   —— useEffect 里 setPreference(initial)：initial = getSavedThemePreference() ?? 'system'。
   但 r2 会话 localStorage 无 pref（我 removeItem 后 reload? 没有 reload）。
   真实场景：用户当前 saved='light'（先前 toggle 过）→ island hydrate 后 preference 应为 'light'，
   点击 → 'dark'。但 debug61 显示 stored 从 'system'（我手动设置的）→ 点击后 'light'。
   说明点击时 island 的 preference = 'system'（useEffect setPreference(initial) 没生效？）
   或点击处理器用了 stale state。另一个线索：aria 在点击后变"切换到暗色模式"= 
   next('light')='dark' → 渲染时 preference 已经是 'light'。即：
   点击前 state='system'（aria 显示"切换到亮色模式"= next('system')='light'）。
   点击 → next('system')='light' → setThemePreference('light') → stored='light'，
   applyTheme(getResolvedTheme()) → saved='light' → resolved='light' → data-theme='light'（不变）。
   然后渲染 preference='light' → aria="切换到暗色模式"。
   所以行为完全自洽：三态循环 system→light→dark→system。
   data-theme 未变是因为 system(light)→light 的确同色。这 NOT a bug ——
   我的 final2 断言 (th1.t !== th0) 错误：system→light 的过渡 data-theme 不翻转。
   正确断言：连续点 2 次应到 dark。 */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const BASE = 'http://localhost:4321/FANDEX/';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(BASE, { waitUntil: 'load' });
await page.waitForTimeout(1600);
const seq = [];
for (let i = 0; i < 3; i++) {
  await page.locator('.fndx-theme-toggle').first().click();
  await page.waitForTimeout(600);
  seq.push(await page.evaluate(() => ({ theme: document.documentElement.getAttribute('data-theme'), stored: localStorage.getItem('fandex-theme') })));
}
console.log('cycle:', JSON.stringify(seq));
// 恢复：清 storage reload，确认回 system 默认
await page.evaluate(() => localStorage.removeItem('fandex-theme'));
await browser.close();
