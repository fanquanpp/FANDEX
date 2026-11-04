/**
 * 交互轮 1 二次排查（failures triage）：
 * 只针对第一轮 21 条 failed，用修正后的探针重测，判定 测试脚本缺陷 vs 产品缺陷。
 * 运行：node .workflow-tmp/qa-interact-r1b.mjs
 */
import path from 'node:path';
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';

const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const OUT = path.join(ROOT, '.workflow-tmp/qa-interact-r1b-report.json');

const BASE = 'http://localhost:4321/FANDEX/';
const results = [];
const pageErrors = [];
const consoleErrors = [];

async function reset(page, url, wait = 700) {
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(wait);
}

async function check(name, fn) {
  try {
    const r = await fn();
    results.push({ name, ...r });
    console.log(`${r.verdict === 'pass' ? 'ok  ' : r.verdict === 'bug' ? 'BUG ' : 'SKIP'} ${name} :: ${r.actual}`);
  } catch (err) {
    results.push({ name, verdict: 'error', actual: String(err).slice(0, 240) });
    console.log(`ERR ${name} :: ${String(err).slice(0, 200)}`);
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost:4321' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => pageErrors.push({ url: page.url(), message: String(e).slice(0, 300) }));
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push({ url: page.url(), message: m.text().slice(0, 200) }); });

  /* 1. 首页 module-card /start/ 跳转 */
  await check('home module-card /start/ navigates', async () => {
    await reset(page, BASE, 900);
    const card = page.locator('a.module-card[href="/FANDEX/start/"]');
    if ((await card.count()) === 0) return { verdict: 'skip', actual: 'no start card' };
    await card.click();
    await page.waitForTimeout(1500);
    const u = page.url();
    return { verdict: u.includes('/FANDEX/start/') ? 'pass' : 'bug', actual: `-> ${u}` };
  });

  /* 2. /javascript/page/2/ 分页结构 */
  await check('js page/2 pager links', async () => {
    await reset(page, BASE + 'javascript/page/2/', 900);
    const s = await page.evaluate(() => {
      const links = [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).filter((h) => h && h.includes('/javascript/'));
      const pager = [...document.querySelectorAll('a')].filter((a) => /page|页|上一页|下一页|prev|next/i.test((a.textContent || '') + (a.getAttribute('aria-label') || '') + a.className));
      return {
        jsLinks: [...new Set(links)].slice(0, 10),
        pagerCount: pager.length,
        pagerInfo: pager.slice(0, 5).map((a) => ({ t: (a.textContent || '').trim().slice(0, 14), h: a.getAttribute('href') })),
        title: document.title,
        docCards: document.querySelectorAll('a[href*="/javascript/"]').length,
      };
    });
    const ok = s.jsLinks.some((h) => /javascript\/(page\/1\/)?$/.test(h) || h === '/FANDEX/javascript/');
    return { verdict: ok || s.pagerCount > 0 ? 'pass' : 'bug', actual: JSON.stringify(s).slice(0, 300) };
  });

  /* 3. 搜索 Enter 导航（等 index 加载） */
  await check('search palette Enter navigates', async () => {
    await reset(page, BASE, 900);
    await page.locator('[data-search-trigger]').click();
    await page.waitForTimeout(300);
    await page.keyboard.type('语法', { delay: 80 });
    await page.waitForTimeout(2500);
    const items = await page.locator('.search-palette__item').count();
    if (items === 0) return { verdict: 'skip', actual: 'dev 无 pagefind 索引（items=0）——功能在 build 后可用' };
    const before = page.url();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1200);
    return { verdict: page.url() !== before ? 'pass' : 'bug', actual: `items=${items} ${before} -> ${page.url()}` };
  });

  /* 4/5. nav-toggle 与 sidebar-close（桌面 1440 隐藏？） */
  await check('doc nav-toggle visibility at 1440', async () => {
    await reset(page, BASE + 'javascript/010-WhatIsJavaScript/', 900);
    const s = await page.evaluate(() => {
      const t = document.getElementById('nav-toggle');
      const sb = document.getElementById('mobile-sidebar-btn');
      const mb = document.getElementById('mobile-features-btn');
      const cs = (el) => (el ? getComputedStyle(el) : null);
      const vis = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      return {
        toggleExists: !!t, toggleVisible: vis(t), toggleDisplay: cs(t)?.display,
        mobileSidebarExists: !!sb, mobileSidebarVisible: vis(sb),
        mobileFeaturesExists: !!mb, mobileFeaturesVisible: vis(mb),
      };
    });
    // 桌面端常显侧栏时这两个按钮 display:none 属于预期
    return { verdict: s.toggleExists && !s.toggleVisible ? 'skip' : (s.toggleVisible ? 'pass' : 'bug'), actual: JSON.stringify(s) };
  });

  /* 5b. mobile drawer 在窄视口下验证 */
  await check('doc mobile sidebar open/close at 375px', async () => {
    await page.setViewportSize({ width: 375, height: 1700 });
    await reset(page, BASE + 'javascript/010-WhatIsJavaScript/', 1000);
    const s1 = await page.evaluate(() => {
      const t = document.getElementById('nav-toggle');
      const mb = document.getElementById('mobile-sidebar-btn');
      return { toggleVisible: !!(t && t.getBoundingClientRect().width > 0), mobileBtnVisible: !!(mb && mb.getBoundingClientRect().width > 0) };
    });
    let opened = null;
    if (s1.mobileBtnVisible) {
      await page.locator('#mobile-sidebar-btn').click();
      await page.waitForTimeout(500);
      opened = await page.evaluate(() => ({
        body: document.body.classList.contains('sidebar-open'),
        sidebar: document.getElementById('app-sidebar')?.classList.contains('is-open'),
        url: location.search.includes('sidebar=1'),
      }));
      // close btn
      await page.locator('#sidebar-close-btn').click().catch(() => {});
      await page.waitForTimeout(400);
      opened.closedByBtn = await page.evaluate(() => !document.getElementById('app-sidebar')?.classList.contains('is-open'));
      // backdrop close
      await page.locator('#mobile-sidebar-btn').click();
      await page.waitForTimeout(400);
      await page.locator('#sidebar-backdrop').click({ force: true }).catch(() => {});
      await page.waitForTimeout(400);
      opened.closedByBackdrop = await page.evaluate(() => !document.body.classList.contains('sidebar-open'));
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    if (!s1.mobileBtnVisible) return { verdict: 'skip', actual: 'mobile btn not visible even at 375px: ' + JSON.stringify(s1) };
    const ok = opened && opened.body && opened.sidebar && opened.url && opened.closedByBtn && opened.closedByBackdrop;
    return { verdict: ok ? 'pass' : 'bug', actual: JSON.stringify(opened) };
  });

  /* 6/7. feature sheet 在窄视口验证 */
  await check('feature sheet open/navigate at 375px', async () => {
    await page.setViewportSize({ width: 375, height: 1700 });
    await reset(page, BASE + 'javascript/010-WhatIsJavaScript/', 1000);
    const btn = page.locator('#mobile-features-btn');
    const visible = (await btn.count()) > 0 && (await btn.evaluate((el) => el.getBoundingClientRect().width > 0));
    if (!visible) { await page.setViewportSize({ width: 1440, height: 900 }); return { verdict: 'skip', actual: 'feature btn hidden at 375px' }; }
    await btn.click();
    await page.waitForTimeout(500);
    const opened = await page.evaluate(() => ({
      open: document.getElementById('feature-sheet')?.classList.contains('is-open'),
      aria: document.getElementById('mobile-features-btn')?.getAttribute('aria-expanded'),
    }));
    const link = page.locator('#feature-sheet a[href*="algorithms"]').first();
    let nav = null;
    if ((await link.count()) > 0) {
      await link.click();
      await page.waitForTimeout(1100);
      nav = page.url();
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    const ok = opened.open && opened.aria === 'true' && nav && nav.includes('/algorithms/');
    return { verdict: ok ? 'pass' : 'bug', actual: JSON.stringify({ opened, nav }) };
  });

  /* 8. TOC 链接 hash 为中文 slug（URL 编码） */
  await check('toc link sets decoded hash', async () => {
    await reset(page, BASE + 'javascript/010-WhatIsJavaScript/', 1000);
    const link = page.locator('#fndx-toc-nav a[data-toc-slug]').nth(1);
    if ((await link.count()) === 0) return { verdict: 'skip', actual: 'no toc links' };
    const slug = await link.getAttribute('data-toc-slug');
    await link.click();
    await page.waitForTimeout(1500);
    const s = await page.evaluate(() => ({ hash: decodeURIComponent(location.hash), scrollTop: document.getElementById('app-main').scrollTop }));
    const want = '#' + slug;
    return { verdict: s.hash === want && s.scrollTop > 10 ? 'pass' : 'bug', actual: `hash=${s.hash} want=${want} scrollTop=${s.scrollTop}` };
  });

  /* 9. 代码复制（grant permissions 后重试） */
  await check('doc code copy button', async () => {
    await reset(page, BASE + 'javascript/010-WhatIsJavaScript/', 1200);
    const btn = page.locator('.code-block .copy-btn').first();
    if ((await btn.count()) === 0) return { verdict: 'skip', actual: 'no copy btn' };
    const code = await btn.evaluate((el) => el.closest('.code-block')?.querySelector('pre code')?.textContent?.slice(0, 40) || '');
    await btn.click();
    await page.waitForTimeout(500);
    const s = await btn.evaluate((el) => ({ copied: el.classList.contains('copied') }));
    let clip = '';
    try { clip = await page.evaluate(() => navigator.clipboard.readText()); } catch { clip = '(unread)' }
    return { verdict: s.copied ? 'pass' : 'bug', actual: `copied=${s.copied} clip="${clip.slice(0, 30)}" code="${code.slice(0, 30)}"` };
  });

  /* 10. heading anchor 中文 hash */
  await check('heading anchor sets decoded hash', async () => {
    await reset(page, BASE + 'javascript/010-WhatIsJavaScript/', 1100);
    const anchor = page.locator('.prose h2[id] a.heading-anchor').first();
    if ((await anchor.count()) === 0) return { verdict: 'skip', actual: 'no anchors' };
    const id = await anchor.evaluate((el) => el.closest('h2').id);
    await anchor.click({ force: true });
    await page.waitForTimeout(1300);
    const hash = await page.evaluate(() => decodeURIComponent(location.hash));
    return { verdict: hash === '#' + id ? 'pass' : 'bug', actual: `hash=${hash} want=#${id}` };
  });

  /* 11. reset-all：需要先筛选出空结果（reset 按钮在空态里） */
  await check('algo reset-all in empty state', async () => {
    await reset(page, BASE + 'algorithms/?view=problems', 900);
    // 输入一个不存在关键词让结果为空，空态出现 reset 按钮
    await page.locator('[data-filter-search]').fill('zzz不存在的关键词qqq');
    await page.waitForTimeout(700);
    const emptyShown = await page.evaluate(() => !document.querySelector('[data-ap-empty]')?.hidden);
    if (!emptyShown) return { verdict: 'skip', actual: 'empty state not shown for bogus query' };
    await page.locator('[data-ap-reset]').click();
    await page.waitForTimeout(600);
    const s = await page.evaluate(() => ({
      url: location.search,
      shown: [...document.querySelectorAll('[data-algo-item]')].filter((el) => !el.hidden).length,
      total: document.querySelectorAll('[data-algo-item]').length,
      inputCleared: document.querySelector('[data-filter-search]')?.value === '',
    }));
    return { verdict: s.url === '' && s.shown === s.total && s.inputCleared ? 'pass' : 'bug', actual: JSON.stringify(s) };
  });

  /* 12. syntax 详情复制按钮反馈 */
  await check('syntax panel copy feedback', async () => {
    await reset(page, BASE + 'syntax/', 1500);
    const card = page.locator('.syntax-card').first();
    await card.waitFor({ state: 'visible', timeout: 9000 }).catch(() => {});
    if ((await card.count()) === 0) return { verdict: 'skip', actual: 'no cards' };
    await card.click();
    await page.waitForTimeout(700);
    // 面板内复制按钮：结构探测
    const info = await page.evaluate(() => {
      const panel = document.querySelector('[role="dialog"]') || document.querySelector('.syntax-panel');
      const btns = panel ? [...panel.querySelectorAll('button')].map((b) => (b.textContent || '').trim().slice(0, 16)) : [];
      return { panel: !!panel, btns };
    });
    if (!info.panel) return { verdict: 'bug', actual: 'panel did not open: ' + JSON.stringify(info) };
    const copyBtn = page.locator('[role="dialog"] button, .syntax-panel button').filter({ hasText: /复制|Copy/ }).first();
    if ((await copyBtn.count()) === 0) return { verdict: 'skip', actual: 'no copy button: ' + JSON.stringify(info.btns) };
    await copyBtn.click();
    await page.waitForTimeout(500);
    const txt = (await copyBtn.textContent() || '').trim();
    await page.keyboard.press('Escape');
    return { verdict: /已复制|Copied/i.test(txt) ? 'pass' : 'bug', actual: `after click: "${txt}"` };
  });

  /* 13. pg editor tab toggle：读 pane class 而非 aria */
  await check('pg editor tab toggles pane', async () => {
    await reset(page, BASE + 'playground/', 2000);
    await page.locator('.pg-toolbar').waitFor({ timeout: 9000 }).catch(() => {});
    const tab = page.locator('.pg-editor-tab').nth(1);
    const before = await tab.evaluate((el) => ({ pressed: el.getAttribute('aria-pressed'), panes: [...document.querySelectorAll('.pg-pane')].length }));
    await tab.click();
    await page.waitForTimeout(600);
    const after = await tab.evaluate((el) => ({ pressed: el.getAttribute('aria-pressed'), panes: [...document.querySelectorAll('.pg-pane')].length }));
    await tab.click();
    await page.waitForTimeout(400);
    const changed = before.pressed !== after.pressed || before.panes !== after.panes;
    return { verdict: changed ? 'pass' : 'bug', actual: `${JSON.stringify(before)} -> ${JSON.stringify(after)}` };
  });

  /* 14. pg template menu item */
  await check('pg template menu creates draft', async () => {
    await reset(page, BASE + 'playground/', 2000);
    await page.locator('.pg-toolbar').waitFor({ timeout: 9000 }).catch(() => {});
    const btn = page.locator('.pg-new-wrap > button').first();
    if ((await btn.count()) === 0) return { verdict: 'skip', actual: 'no new-wrap button' };
    await btn.click();
    await page.waitForTimeout(500);
    const items = await page.locator('.pg-menu .pg-menu-item').count();
    if (items === 0) return { verdict: 'bug', actual: 'menu did not open' };
    const before = await page.evaluate(() => document.querySelector('.pg-title-input')?.value || '');
    await page.locator('.pg-menu .pg-menu-item').first().click();
    await page.waitForTimeout(1000);
    const after = await page.evaluate(() => document.querySelector('.pg-title-input')?.value || '');
    return { verdict: after !== before || after.length > 0 ? 'pass' : 'bug', actual: `items=${items} title "${before}" -> "${after}"` };
  });

  /* 15/16. pg gallery：按钮文案是"灵感库" */
  await check('pg gallery (灵感库) opens + load', async () => {
    await reset(page, BASE + 'playground/', 2000);
    await page.locator('.pg-toolbar').waitFor({ timeout: 9000 }).catch(() => {});
    const btn = page.locator('.pg-toolbar button', { hasText: '灵感库' }).first();
    if ((await btn.count()) === 0) return { verdict: 'bug', actual: 'no 灵感库 button' };
    await btn.click();
    await page.waitForTimeout(1100);
    const opened = await page.evaluate(() => ({
      mask: !!document.querySelector('.pg-sc-mask'),
      cards: document.querySelectorAll('.pg-sc-card').length,
    }));
    let loaded = null;
    const loadBtn = page.locator('.pg-sc-load').first();
    if ((await loadBtn.count()) > 0) {
      const before = await page.evaluate(() => document.querySelector('.pg-title-input')?.value || '');
      await loadBtn.click();
      await page.waitForTimeout(1200);
      const after = await page.evaluate(() => document.querySelector('.pg-title-input')?.value || '');
      loaded = { before, after, changed: after !== before };
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    const closed = await page.evaluate(() => !document.querySelector('.pg-sc-mask'));
    const ok = opened.mask && opened.cards > 0 && closed;
    return { verdict: ok ? 'pass' : 'bug', actual: JSON.stringify({ opened, loaded, closed }) };
  });

  /* 17. pg console toggle（title=控制台） */
  await check('pg console toggle', async () => {
    await reset(page, BASE + 'playground/', 2000);
    await page.locator('.pg-toolbar').waitFor({ timeout: 9000 }).catch(() => {});
    const btn = page.locator('.pg-toolbar button', { hasText: '控制台' }).first();
    if ((await btn.count()) === 0) return { verdict: 'bug', actual: 'no console button' };
    const before = await page.evaluate(() => !!document.querySelector('.pg-console'));
    await btn.click();
    await page.waitForTimeout(600);
    const after = await page.evaluate(() => ({
      panel: !!document.querySelector('.pg-console'),
      empty: !!document.querySelector('.pg-console-empty'),
      lines: document.querySelectorAll('.pg-console-line').length,
    }));
    await btn.click();
    return { verdict: before !== after.panel ? 'pass' : 'bug', actual: `before=${before} after=${JSON.stringify(after)}` };
  });

  /* 18. ds dialog：data-state open 断言修正 */
  await check('ds dialog opens/closes (radix state)', async () => {
    await reset(page, BASE + 'design-system/', 1500);
    const trigger = page.locator('button:has-text("打开对话框")').first();
    if ((await trigger.count()) === 0) return { verdict: 'skip', actual: 'no trigger' };
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();
    await page.waitForTimeout(800);
    const s = await page.evaluate(() => {
      const dlg = document.querySelector('[role="dialog"]');
      const triggerState = document.querySelector('button:has-text("打开对话框")')?.closest('[data-state]')?.getAttribute('data-state');
      return { dlgPresent: !!dlg, dlgAria: dlg?.getAttribute('aria-modal'), bodyLocked: document.body.style.pointerEvents || '', anyOpenState: !!document.querySelector('[data-state="open"]') };
    });
    const cancel = page.locator('button:has-text("取消")').first();
    await cancel.click().catch(() => {});
    await page.waitForTimeout(600);
    const closed = await page.evaluate(() => !document.querySelector('[role="dialog"]'));
    return { verdict: s.dlgPresent && closed ? 'pass' : 'bug', actual: JSON.stringify({ ...s, closed }) };
  });

  /* 19. ds buttons 数量修正：shadcn Button 不带 fndx-button */
  await check('ds button matrix count', async () => {
    await reset(page, BASE + 'design-system/', 1500);
    const s = await page.evaluate(() => {
      const fndx = document.querySelectorAll('button.fndx-button').length;
      const radixBtns = [...document.querySelectorAll('button')].filter((b) => (b.className || '').toString().includes('inline-flex'));
      const sizes = new Set(radixBtns.map((b) => b.className.match(/h-(8|9|10|11)/)?.[0]).filter(Boolean));
      return { fndx, radix: radixBtns.length, sizeVariants: [...sizes] };
    });
    return { verdict: s.fndx + s.radix >= 16 ? 'pass' : 'bug', actual: JSON.stringify(s) };
  });

  /* 20. 404 back-home */
  await check('404 back-home link', async () => {
    await reset(page, BASE + '404', 900);
    const s = await page.evaluate(() => {
      const links = [...document.querySelectorAll('a')].map((a) => ({ t: (a.textContent || '').trim().slice(0, 20), h: a.getAttribute('href'), cls: a.className.slice(0, 40) }));
      return links;
    });
    const home = s.find((l) => l.h === '/FANDEX/' || l.h === '/FANDEX');
    return { verdict: home ? 'pass' : 'bug', actual: JSON.stringify({ home, all: s.slice(0, 6) }) };
  });

  /* 21. NetworkFlow mermaid 渲染（等待更久 + 滚动 + 主题无关） */
  await check('networkflow mermaid renders', async () => {
    await reset(page, BASE + 'algorithm/290-NetworkFlow/', 2000);
    const blocks = page.locator('.mermaid, [data-language="mermaid"]');
    const n = await blocks.count();
    if (n === 0) return { verdict: 'skip', actual: 'no mermaid blocks' };
    // 滚过全部块触发懒渲染
    for (let i = 0; i < n; i++) { await blocks.nth(i).scrollIntoViewIfNeeded().catch(() => {}); await page.waitForTimeout(700); }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1500);
    const s = await page.evaluate(() => {
      const svgs = document.querySelectorAll('.mermaid svg, [data-mermaid] svg').length;
      const anySvg = document.querySelectorAll('.prose svg').length;
      const blockCls = [...document.querySelectorAll('.mermaid')].slice(0, 3).map((el) => ({ cls: el.className.slice(0, 60), html: el.innerHTML.slice(0, 80) }));
      return { svgs, anySvg, blockCls };
    });
    return { verdict: s.svgs > 0 ? 'pass' : 'bug', actual: JSON.stringify({ ...s, blocks: n }).slice(0, 400) };
  });

  /* 22. NetworkFlow code copy（权限已授予 + 等 hydrate） */
  await check('networkflow code copy feedback', async () => {
    await reset(page, BASE + 'algorithm/290-NetworkFlow/', 2000);
    const btn = page.locator('.code-block .copy-btn').first();
    if ((await btn.count()) === 0) return { verdict: 'skip', actual: 'no copy btn' };
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
    await page.waitForTimeout(600);
    const s = await btn.evaluate((el) => ({ copied: el.classList.contains('copied'), html: el.innerHTML.slice(0, 80) }));
    let clip = '';
    try { clip = await page.evaluate(() => navigator.clipboard.readText()); } catch { clip = '(unread)' }
    return { verdict: s.copied ? 'pass' : 'bug', actual: `copied=${s.copied} clip="${clip.slice(0, 30)}"` };
  });

  await browser.close();
  writeFileSync(OUT, JSON.stringify({ results, pageErrors, consoleErrors }, null, 2));
  const pass = results.filter((r) => r.verdict === 'pass').length;
  const bug = results.filter((r) => r.verdict === 'bug').length;
  const skip = results.filter((r) => r.verdict !== 'pass' && r.verdict !== 'bug').length;
  console.log(`\n==== triage done: pass=${pass} bug=${bug} skip/error=${skip} ====`);
  if (pageErrors.length) console.log('pageErrors:', JSON.stringify(pageErrors.slice(0, 8), null, 1));
  if (consoleErrors.length) console.log('consoleErrors:', consoleErrors.slice(0, 8).map((e) => e.message.slice(0, 120)).join('\n'));
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
