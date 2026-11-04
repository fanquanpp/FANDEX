/* 唯一剩余差异：sweep 的 seen 去重 key 或点击顺序 —— 在测第 0 张卡之前，
   sweep 已测过 header 里若干元素（theme/lang btns skipped），skip 元素不 goto。
   但第 0 个 doc 卡是文档卡片中第一个被点击的。然而 sweep 枚举顺序 = DOM 顺序：
   header(搜索/返回顶部/安装/lang/theme) → feature nav → sidebar links(第一个就是 001入门? no sidebar collapsed?)
   实际 sweep log /javascript/ 第一个 [low] 就是 a "01JavaScript 是什么…" 
   —— 注意 label 是 "01JavaScript 是什么"（无 00 前缀/无入门），不是 "001入门JavaScript"！
   enumerate 时 textContent 是 "001入门JavaScript..."？ log 显示 "01JavaScript 是什么：你的第一门编程语言"
   说明当时 DOM 里卡片 textContent 与现在不同（seq span "001" + difficulty "入门"）。
   那时点击的匹配 first() 可能是 sidebar 或 TOC 的链接！
   验证：TOC 里也有 "01JavaScript 是什么"？在 javascript 列表页没有 TOC。
   但 sidebar 第一个链接 = "01JavaScript 是什么：你的第一门编程语言"（text 无序号前缀？）
   之前 sidebar 链接样例 = "01JavaScript 是什么：你的第一门编程语言" —— 正是！
   sweep 定位到了 SIDEBAR 链接（y<0 不可滚动区外？sidebar overflow 隐藏 → click 等待 stable 失败 → timeout）。
   而 sidebar link y=-114 类（debug4 已见 y=-114）。elementFromPoint 无遮挡，但 Playwright click 要求
   元素在视口内稳定 —— scrollIntoView 由 Playwright 自动做，但 sidebar overflow:hidden 的容器
   使 scrollIntoViewIfNeeded 无效 → timeout。这就是全部 [low] 的真相。 */
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.setDefaultTimeout(8000);
await page.goto('http://localhost:4321/FANDEX/javascript/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(500);
// sidebar 第一条
const probe = await page.evaluate(() => {
  const links = [...document.querySelectorAll('.fndx-sidebar__link, #app-sidebar a')].slice(0, 3).map(a => ({t: (a.textContent||'').trim().slice(0,30), h: a.getAttribute('href'), y: Math.round(a.getBoundingClientRect().y)}));
  const sidebar = document.getElementById('app-sidebar');
  const cs = sidebar ? getComputedStyle(sidebar) : null;
  return { links, sidebarOverflow: cs ? cs.overflow + '/' + cs.overflowY : null, sidebarRect: sidebar ? sidebar.getBoundingClientRect().toJSON() : null };
});
console.log(JSON.stringify(probe, null, 1));
const first = page.locator('.fndx-sidebar__link').first();
try { await first.click({ timeout: 4000 }); console.log('sidebar first clicked ->', page.url()); }
catch (e) { console.log('sidebar first click TIMEOUT (expected - overflow hidden):', String(e).split('\n')[0]); }
await browser.close();
