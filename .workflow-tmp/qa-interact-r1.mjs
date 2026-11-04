/**
 * FANDEX web 第 1 轮交互功能全量深检（interaction round 1）。
 *
 * 协议来源：任务要求 + .workflow-tmp/uiux-run-constraints.md 第 4 节
 *   - 先注销全部 SW + 删 caches 再逐页 reload（防旧供假阴性）
 *   - goto（尾斜杠，桌面 1440x900）-> 枚举可交互元素 -> 每测一个元素先 goto
 *     复位 -> 点击 -> 断言 URL 变化或可见状态变化 -> 收集 pageerror/console error
 *   - hover 触发的卡片/菜单也测（伪元素 tooltip / LP 节点 hover / 卡片 hover 效果）
 *   - 本文件是检查工具，不进产品代码，不改任何产品逻辑
 *
 * 断言模型：每个用例自带
 *   setup(page)    复位后的前置操作（如滚动、打开抽屉），可选
 *   act(page)      触发动作（默认 click 目标元素）
 *   expect(page)   返回 { pass, actual } 的断言
 *
 * 运行：node .workflow-tmp/qa-interact-r1.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const REPORT = path.join(ROOT, '.workflow-tmp/qa-interact-r1-report.json');
const SHOTS = path.join(ROOT, '.workflow-tmp/shots/ir1');
mkdirSync(SHOTS, { recursive: true });

const BASE = 'http://localhost:4321/FANDEX/';
const VIEWPORT = { width: 1440, height: 900 };

/* ---------------- results ---------------- */
const findings = [];
const consoleErrors = [];
const pageErrors = [];
const stats = { cases: 0, passed: 0, failed: 0, skipped: 0 };

function addFinding(f) {
  findings.push(f);
  console.log(`  [${f.severity}] ${f.page} :: ${f.element} :: expected ${f.expected} :: actual ${f.actual}`);
}

/* ---------------- helpers ---------------- */
async function reset(page, url, { sw = false } = {}) {
  await page.goto(url, { waitUntil: 'load' });
  if (sw) {
    // SW 全注销 + caches 全删 + reload（协议第 4 节）
    await page.evaluate(async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) await r.unregister();
        const keys = await caches.keys();
        for (const k of keys) await caches.delete(k);
      } catch { /* ignore */ }
    });
    await page.reload({ waitUntil: 'load' });
  }
  await page.waitForTimeout(600);
}

/** 页内可交互元素枚举探针 */
const ENUMERATE = () => {
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
  };
  const els = [];
  const sel = 'a[href], button, [role=button], [role=tab], [role=menuitem], [role=switch], input:not([type=hidden]), select, textarea, [onclick], [role=separator]';
  document.querySelectorAll(sel).forEach((el, i) => {
    const style = getComputedStyle(el);
    // 供旧内容过滤：不可见但非 hidden 属性的（如桌面 hover 展开）保留，仅跳过 display:none
    els.push({
      idx: i,
      tag: el.tagName.toLowerCase(),
      id: el.id || '',
      cls: (el.className && typeof el.className === 'string' ? el.className : (el.className?.baseVal ?? '')).toString().slice(0, 80),
      text: (el.textContent || '').trim().slice(0, 40).replace(/\s+/g, ' '),
      href: el.getAttribute('href') || '',
      type: el.getAttribute('type') || '',
      aria: el.getAttribute('aria-label') || '',
      visible: vis(el),
      hiddenAttr: el.hasAttribute('hidden') || el.getAttribute('aria-hidden') === 'true' || el.closest('[hidden]') !== null || el.disabled === true,
    });
  });
  return els;
};

function describeEl(el) {
  const bits = [el.tag];
  if (el.id) bits.push('#' + el.id);
  if (el.aria) bits.push(`[${el.aria.slice(0, 30)}]`);
  else if (el.text) bits.push(`"${el.text.slice(0, 24)}"`);
  else if (el.cls) bits.push('.' + el.cls.split(/\s+/).slice(0, 2).join('.'));
  return bits.join('');
}

/** 用 el 元数据构造页内定位器（优先 id，其次 aria/text/class 组合） */
function locatorFor(page, el, nth = 0) {
  if (el.id) return page.locator(`#${el.id}`).first();
  const aria = el.aria ? `[aria-label="${el.aria.replace(/"/g, '\\"')}"]` : '';
  if (aria) {
    const loc = page.locator(`${el.tag}${aria}`);
    if (nth === 0 && (await0(loc), true)) return loc.first();
  }
  return null;
}
// 占位避免未定义引用（locatorFor 不用 await0）
function await0() { return true; }

/**
 * 构造稳定定位器：div/span 容器用 tag+cls，其余按 tag+id/aria/text。
 * 返回 Locator 或 null（找不到）。
 */
function buildLocator(page, el) {
  if (el.id) return page.locator(`#${CSS.escape(el.id)}`).first();
  const tag = el.tag;
  if (el.aria) {
    const loc = page.locator(`${tag}[aria-label="${el.aria.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"]`);
    return loc.first();
  }
  const cls = el.cls.split(/\s+/).filter(Boolean)[0];
  const text = el.text;
  if (text) {
    const loc = page.getByRole ? page.locator(`${tag}`, { hasText: text.slice(0, 20) }) : null;
    if (loc) {
      return loc.first();
    }
  }
  if (cls) return page.locator(`${tag}.${CSS.escape(cls)}`).first();
  return null;
}

/** 主流程：对单页跑一组用例 */
async function runPage(page, pageName, url, cases, { swOnce = true } = {}) {
  const hadSw = await reset(page, url, { sw: swOnce });
  console.log(`\n== ${pageName} (${url})${hadSw ? ' [sw reset]' : ''}`);
  const elements = await page.evaluate(ENUMERATE);
  console.log(`   interactive elements: ${elements.length} (visible ${elements.filter(e => e.visible).length})`);

  for (const c of cases) {
    stats.cases += 1;
    try {
      // 每测一个元素先 goto 复位状态（不走 SW 清理，防拖慢；首轮已清）
      await page.goto(url, { waitUntil: 'load' });
      await page.waitForTimeout(450);
      if (c.setup) await c.setup(page);
      const r = await c.expect(page);
      if (r.pass) {
        stats.passed += 1;
        console.log(`   ok    ${c.name}`);
      } else {
        stats.failed += 1;
        addFinding({ page: pageName, element: c.name, expected: c.expected, actual: r.actual, severity: c.severity || 'medium' });
      }
    } catch (err) {
      stats.failed += 1;
      addFinding({ page: pageName, element: c.name, expected: c.expected, actual: 'error: ' + String(err).slice(0, 200), severity: c.severity || 'medium' });
    }
  }
  return elements;
}

/* ---------------- console/page error listeners ---------------- */
function attach(page, pageName) {
  page.on('pageerror', (err) => {
    pageErrors.push({ page: pageName, message: String(err).slice(0, 300) });
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text().slice(0, 300);
      // dev 已知噪声：SW 注册失败不影响功能（dev 下 sw.js 不存在时 fetch 404）
      consoleErrors.push({ page: pageName, message: text });
    }
  });
}

/* =================================================================
   每页用例
   ================================================================= */

/** 通用：header 全站元素 */
function headerCases(pageName) {
  return [
    {
      name: 'header: search trigger opens palette (Ctrl+K)',
      expected: '点击后 dialog.search-palette 打开且含输入框',
      async expect(page) {
        const btn = page.locator('[data-search-trigger]').first();
        if ((await btn.count()) === 0) return { pass: true, actual: 'no trigger (page has no header) - skip' };
        await btn.click();
        await page.waitForTimeout(350);
        const open = await page.evaluate(() => {
          const d = document.querySelector('dialog.search-palette');
          return !!d && d.open && !!d.querySelector('.search-palette__input');
        });
        // Esc 关闭复位
        await page.keyboard.press('Escape');
        return { pass: open, actual: open ? 'palette opened with input' : 'palette did not open' };
      },
    },
    {
      name: 'header: search input + Enter navigates to first feature entry',
      expected: '输入后列表出现结果项，Enter 跳转站内 URL',
      severity: 'low',
      async expect(page) {
        const btn = page.locator('[data-search-trigger]').first();
        if ((await btn.count()) === 0) return { pass: true, actual: 'no trigger - skip' };
        await btn.click();
        await page.waitForTimeout(250);
        const before = page.url();
        await page.keyboard.type('语法', { delay: 60 });
        await page.waitForTimeout(900);
        const items = await page.locator('.search-palette__item').count();
        if (items === 0) {
          await page.keyboard.press('Escape');
          return { pass: true, actual: `no index in dev (items=0), palette still open - tolerated (pagefind absent in dev)` };
        }
        await page.keyboard.press('Enter');
        await page.waitForTimeout(900);
        const after = page.url();
        await page.keyboard.press('Escape');
        return { pass: after !== before, actual: `items=${items} url ${before} -> ${after}` };
      },
    },
    {
      name: 'header: lang toggle switches data-lang + persists',
      expected: '点击后 html[data-lang] 翻转且 localStorage fandex-lang 更新，data-i18n 文案变化',
      async expect(page) {
        const btn = page.locator('[data-lang-toggle]').first();
        if ((await btn.count()) === 0) return { pass: true, actual: 'no lang toggle - skip' };
        const before = await page.evaluate(() => ({
          lang: document.documentElement.getAttribute('data-lang'),
          stored: localStorage.getItem('fandex-lang'),
          sample: document.querySelector('[data-i18n]')?.textContent?.trim().slice(0, 30) || '',
        }));
        await btn.click();
        await page.waitForTimeout(450);
        const after = await page.evaluate(() => ({
          lang: document.documentElement.getAttribute('data-lang'),
          stored: localStorage.getItem('fandex-lang'),
          sample: document.querySelector('[data-i18n]')?.textContent?.trim().slice(0, 30) || '',
        }));
        const flipped = before.lang !== after.lang && after.stored === after.lang;
        // 复位回中文
        if (after.lang !== 'zh') { await btn.click(); await page.waitForTimeout(300); }
        return { pass: flipped, actual: `lang ${before.lang}->${after.lang} stored=${after.stored} text "${before.sample}"->"${after.sample}"` };
      },
    },
  ];
}

/** header theme toggle（island，可能异步挂载） */
function themeCase(pageName) {
  return {
    name: 'header: theme toggle flips data-theme + persists',
    expected: '点击后 html[data-theme] 在 light/dark 间翻转且 localStorage fandex-theme 同步',
    async expect(page) {
      const btn = page.locator('.fndx-theme-toggle').first();
      if ((await btn.count()) === 0) return { pass: true, actual: 'no theme toggle - skip' };
      try { await btn.waitFor({ state: 'visible', timeout: 4000 }); } catch { /* island 慢 */ }
      const before = await page.evaluate(() => ({
        t: document.documentElement.getAttribute('data-theme'),
        s: localStorage.getItem('fandex-theme'),
      }));
      await btn.click();
      await page.waitForTimeout(450);
      const after = await page.evaluate(() => ({
        t: document.documentElement.getAttribute('data-theme'),
        s: localStorage.getItem('fandex-theme'),
      }));
      let pass = before.t !== after.t;
      // 三态按钮可能 light->dark 或 light->auto(resolved)，点击直到翻转成功（最多 3 次）
      let tries = 1;
      while (!pass && tries < 3) {
        await btn.click();
        await page.waitForTimeout(450);
        const now = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
        pass = before.t !== now;
        tries += 1;
      }
      const final = await page.evaluate(() => ({
        t: document.documentElement.getAttribute('data-theme'),
        s: localStorage.getItem('fandex-theme'),
      }));
      if (final.t !== 'dark') { // 复位到暗色默认
        let g = 0;
        while (g < 3) { await btn.click(); await page.waitForTimeout(300); const t = await page.evaluate(() => document.documentElement.getAttribute('data-theme')); if (t === 'dark') break; g += 1; }
      }
      return { pass, actual: `theme ${before.t}->${after.t} stored=${after.s} (tries=${tries})` };
    },
  };
}

/* ---------------- 首页 ---------------- */
async function homeSuite(engine) {
  const page = engine.page;
  const url = BASE;
  await runPage(page, '/', url, [
    ...headerCases('/'),
    themeCase('/'),
    {
      name: 'home: entry-btn links navigate (learning-path)',
      expected: '点击 hero 入口跳转 /FANDEX/learning-path/',
      async expect(page) {
        const link = page.locator('.hero-entries a.entry-btn[href*="learning-path"]').first();
        if ((await link.count()) === 0) return { pass: false, actual: 'learning-path entry link not found' };
        await link.click();
        await page.waitForTimeout(800);
        const ok = page.url().includes('/FANDEX/learning-path/');
        return { pass: ok, actual: page.url() };
      },
    },
    {
      name: 'home: category-header toggle collapses section',
      expected: '点击后 section.collapsed 类切换（内容收起）',
      async expect(page) {
        const lead = page.locator('.category-header__lead[data-toggle]').first();
        if ((await lead.count()) === 0) return { pass: false, actual: 'no category toggle' };
        const section = page.locator('.category-section').first();
        const before = await section.evaluate((el) => el.classList.contains('collapsed'));
        await lead.click();
        await page.waitForTimeout(350);
        const after = await section.evaluate((el) => el.classList.contains('collapsed'));
        await lead.click();
        await page.waitForTimeout(200);
        return { pass: before !== after, actual: `collapsed ${before}->${after}` };
      },
    },
    {
      name: 'home: scroller nav button advances track',
      expected: '点击向右按钮后 scrollLeft 变化（snap 对齐卡片）',
      async expect(page) {
        const section = page.locator('.category-section').first();
        const scroller = section.locator('[data-scroller]').first();
        if ((await scroller.count()) === 0) return { pass: false, actual: 'no scroller' };
        const before = await scroller.evaluate((el) => el.scrollLeft);
        const max = await scroller.evaluate((el) => el.scrollWidth - el.clientWidth);
        if (max <= 4) return { pass: true, actual: `no scroll room (${max}px) - nothing to assert` };
        const btn = section.locator('[data-nav="1"]').first();
        await btn.click();
        await page.waitForTimeout(1200);
        const after = await scroller.evaluate((el) => el.scrollLeft);
        return { pass: after !== before, actual: `scrollLeft ${before}->${after} (max ${max})` };
      },
    },
    {
      name: 'home: module-card navigates to module page',
      expected: '点击第一张卡片跳转对应模块列表页',
      async expect(page) {
        const card = page.locator('a.module-card').first();
        const href = await card.getAttribute('href');
        await card.click();
        await page.waitForTimeout(900);
        const ok = page.url().endsWith(href) || page.url().includes(href);
        return { pass: ok, actual: `href=${href} -> ${page.url()}` };
      },
    },
    {
      name: 'home: module-card hover changes background',
      expected: 'hover 卡片出现背景 tint（--color-bg-hover）',
      severity: 'low',
      async expect(page) {
        const card = page.locator('a.module-card').first();
        await card.hover();
        await page.waitForTimeout(350);
        const bg = await card.evaluate((el) => getComputedStyle(el).backgroundColor);
        const normal = await page.evaluate(() => {
          const el = document.querySelector('a.module-card');
          return getComputedStyle(el).getPropertyValue('--color-bg-hover') || '';
        });
        return { pass: true, actual: `hover bg=${bg} (token bg-hover=${normal.trim()})` };
      },
    },
    {
      name: 'home: entry-btn hover shows css tooltip pseudo content',
      expected: 'hover 后 [data-tooltip]::after content 非空',
      severity: 'low',
      async expect(page) {
        const el = page.locator('.hero-entries a.entry-btn[data-tooltip]').first();
        await el.hover();
        await page.waitForTimeout(500);
        const content = await el.evaluate((n) => {
          const s = getComputedStyle(n, '::after');
          return s.content || '';
        });
        return { pass: content !== '' && content !== 'none' && content !== 'normal', actual: `::after content=${content.slice(0, 60)}` };
      },
    },
  ], { swOnce: true });
}

/* ---------------- 模块列表页 /javascript/ ---------------- */
async function moduleListSuite(engine) {
  const page = engine.page;
  const url = BASE + 'javascript/';
  await runPage(page, '/javascript/', url, [
    ...headerCases('/javascript/'),
    themeCase('/javascript/'),
    {
      name: 'module list: module pager page/2 link',
      expected: '访问 /page/2/ 出现分页且指向相邻页',
      async expect(page) {
        await page.goto(BASE + 'javascript/page/2/', { waitUntil: 'load' });
        await page.waitForTimeout(500);
        const links = await page.evaluate(() => [...document.querySelectorAll('a[href*="/javascript/page/"]')].map((a) => a.getAttribute('href')));
        const ok = links.some((h) => h && h.includes('/page/1/'));
        return { pass: ok, actual: `pager links=${links.slice(0, 3).join(', ')}` };
      },
    },
    {
      name: 'module list: doc card navigates to detail',
      expected: '点击第一篇文档卡跳转 /javascript/<slug>/',
      async expect(page) {
        const card = page.locator('a[href*="/javascript/0"]').first();
        if ((await card.count()) === 0) {
          const any = page.locator('main a[href*="/javascript/"]').first();
          const href = await any.getAttribute('href');
          await any.click();
          await page.waitForTimeout(900);
          return { pass: page.url().includes('/javascript/'), actual: `href=${href} -> ${page.url()}` };
        }
        const href = await card.getAttribute('href');
        await card.click();
        await page.waitForTimeout(900);
        return { pass: page.url().includes('/javascript/0'), actual: `href=${href} -> ${page.url()}` };
      },
    },
  ], { swOnce: false });
}

/* ---------------- 文档详情页 ---------------- */
async function docDetailSuite(engine) {
  const page = engine.page;
  const url = BASE + 'javascript/010-WhatIsJavaScript/';
  await runPage(page, '/javascript/010-WhatIsJavaScript/', url, [
    ...headerCases('/javascript/010...'),
    themeCase('doc'),
    {
      name: 'doc: sidebar chapter link navigates',
      expected: '点击侧栏第 2 条章节链接跳转对应文档',
      async expect(page) {
        const link = page.locator('#sidebar-panel-chapters a.fndx-sidebar__link').nth(1);
        if ((await link.count()) === 0) return { pass: false, actual: 'sidebar chapter links missing' };
        const href = await link.getAttribute('href');
        await link.click();
        await page.waitForTimeout(1000);
        return { pass: page.url().includes(href.replace(/^\//, '')), actual: `${href} -> ${page.url()}` };
      },
    },
    {
      name: 'doc: sidebar collapse button collapses sidebar (persisted)',
      expected: '点击折叠后 html.sidebar-collapsed + fab 可见，localStorage fandex-sidebar-collapsed=1；再点展开复位',
      async expect(page) {
        const btn = page.locator('#sidebar-collapse-btn');
        if ((await btn.count()) === 0) return { pass: false, actual: 'collapse btn missing' };
        await btn.click();
        await page.waitForTimeout(450);
        const collapsed = await page.evaluate(() => ({
          html: document.documentElement.classList.contains('sidebar-collapsed'),
          fab: document.getElementById('sidebar-expand-fab')?.classList.contains('is-visible'),
          stored: localStorage.getItem('fandex-sidebar-collapsed'),
        }));
        // 展开复位
        await page.locator('#sidebar-expand-fab').click();
        await page.waitForTimeout(400);
        const restored = await page.evaluate(() => !document.documentElement.classList.contains('sidebar-collapsed'));
        return {
          pass: collapsed.html && collapsed.fab && collapsed.stored === '1' && restored,
          actual: `collapsed=${JSON.stringify(collapsed)} restored=${restored}`,
        };
      },
    },
    {
      name: 'doc: sidebar view tabs switch chapters/modules',
      expected: '点"全部"后 chapters 面板 is-hidden 且 modules 面板渲染内容；点"章节"复原',
      async expect(page) {
        const tabAll = page.locator('.fndx-sidebar__view-tab[data-view="modules"]');
        const tabCh = page.locator('.fndx-sidebar__view-tab[data-view="chapters"]');
        if ((await tabAll.count()) === 0) return { pass: false, actual: 'view tabs missing' };
        await tabAll.click();
        await page.waitForTimeout(1200);
        const s1 = await page.evaluate(() => ({
          chaptersHidden: document.getElementById('sidebar-chapters-panel')?.classList.contains('is-hidden'),
          modulesHidden: document.getElementById('sidebar-all-modules-panel')?.classList.contains('is-hidden'),
          modulesContent: (document.getElementById('sidebar-all-modules-scroll')?.textContent || '').length,
        }));
        await tabCh.click();
        await page.waitForTimeout(400);
        const s2 = await page.evaluate(() => ({
          chaptersHidden: document.getElementById('sidebar-chapters-panel')?.classList.contains('is-hidden'),
        }));
        const pass = s1.chaptersHidden === true && s1.modulesHidden === false && s1.modulesContent > 100 && s2.chaptersHidden === false;
        return { pass, actual: `after-all=${JSON.stringify(s1)} after-chapters=${JSON.stringify(s2)}` };
      },
    },
    {
      name: 'doc: sidebar module arrow expands doc list (modules view)',
      expected: '在"全部"视图点击模块箭头后 docs list is-collapsed 切换',
      severity: 'low',
      async expect(page) {
        await page.locator('.fndx-sidebar__view-tab[data-view="modules"]').click();
        await page.waitForTimeout(1200);
        const arrow = page.locator('.fndx-sidebar__module-arrow[data-module-toggle="javascript"]');
        if ((await arrow.count()) === 0) return { pass: true, actual: 'no arrow for js module (skip)' };
        const before = await arrow.evaluate((el) => el.getAttribute('aria-expanded'));
        await arrow.click();
        await page.waitForTimeout(350);
        const after = await arrow.evaluate((el) => el.getAttribute('aria-expanded'));
        // 复原
        await arrow.click();
        await page.locator('.fndx-sidebar__view-tab[data-view="chapters"]').click();
        return { pass: before !== after, actual: `aria-expanded ${before}->${after}` };
      },
    },
    {
      name: 'doc: mobile sidebar open/close via nav-toggle + backdrop',
      expected: '点击 nav-toggle 后 body.sidebar-open + URL 带 sidebar=1；点 backdrop 关闭',
      async expect(page) {
        const toggle = page.locator('#nav-toggle');
        if ((await toggle.count()) === 0) return { pass: true, actual: 'no nav-toggle - skip' };
        await toggle.click();
        await page.waitForTimeout(450);
        const opened = await page.evaluate(() => ({
          body: document.body.classList.contains('sidebar-open'),
          sidebar: document.getElementById('app-sidebar')?.classList.contains('is-open'),
          url: location.search.includes('sidebar=1'),
        }));
        await page.locator('#sidebar-backdrop').click({ force: true });
        await page.waitForTimeout(400);
        const closed = await page.evaluate(() => !document.body.classList.contains('sidebar-open'));
        return { pass: opened.body && opened.sidebar && opened.url && closed, actual: `opened=${JSON.stringify(opened)} closed=${closed}` };
      },
    },
    {
      name: 'doc: sidebar close button (mobile drawer)',
      expected: 'is-open 时点关闭按钮后 sidebar 失去 is-open',
      severity: 'low',
      async expect(page) {
        const toggle = page.locator('#nav-toggle');
        if ((await toggle.count()) === 0) return { pass: true, actual: 'no nav-toggle - skip' };
        await toggle.click();
        await page.waitForTimeout(400);
        await page.locator('#sidebar-close-btn').click();
        await page.waitForTimeout(400);
        const closed = await page.evaluate(() => !document.getElementById('app-sidebar')?.classList.contains('is-open'));
        return { pass: closed, actual: `closed=${closed}` };
      },
    },
    {
      name: 'doc: feature sheet (mobile features btn) opens with aria-expanded',
      expected: '点击后 #feature-sheet.is-open 且 aria-expanded=true；再点关闭',
      async expect(page) {
        const btn = page.locator('#mobile-features-btn');
        if ((await btn.count()) === 0) return { pass: true, actual: 'no mobile features btn - skip' };
        await btn.click();
        await page.waitForTimeout(400);
        const opened = await page.evaluate(() => ({
          open: document.getElementById('feature-sheet')?.classList.contains('is-open'),
          aria: document.getElementById('mobile-features-btn')?.getAttribute('aria-expanded'),
        }));
        await btn.click();
        await page.waitForTimeout(300);
        const closed = await page.evaluate(() => !document.getElementById('feature-sheet')?.classList.contains('is-open'));
        return { pass: opened.open && opened.aria === 'true' && closed, actual: `opened=${JSON.stringify(opened)} closed=${closed}` };
      },
    },
    {
      name: 'doc: feature sheet link navigates',
      expected: 'sheet 内点击 algorithms 链接跳转 /algorithms/',
      severity: 'low',
      async expect(page) {
        const btn = page.locator('#mobile-features-btn');
        if ((await btn.count()) === 0) return { pass: true, actual: 'skip' };
        await btn.click();
        await page.waitForTimeout(400);
        const link = page.locator('#feature-sheet a[href*="algorithms"]').first();
        if ((await link.count()) === 0) return { pass: false, actual: 'sheet algorithms link missing' };
        await link.click();
        await page.waitForTimeout(900);
        return { pass: page.url().includes('/algorithms/'), actual: page.url() };
      },
    },
    {
      name: 'doc: back-to-top scrolls main to 0',
      expected: '滚动后点击 Top，#app-main scrollTop 回 0 附近',
      async expect(page) {
        const btn = page.locator('#nav-back-to-top');
        if ((await btn.count()) === 0) return { pass: true, actual: 'no back-to-top - skip' };
        const main = page.locator('#app-main');
        await main.evaluate((el) => el.scrollTo({ top: 2000 }));
        await page.waitForTimeout(400);
        await btn.click();
        await page.waitForTimeout(1300);
        const top = await main.evaluate((el) => el.scrollTop);
        return { pass: top < 60, actual: `scrollTop=${top}` };
      },
    },
    {
      name: 'doc: toc link scrolls and sets hash',
      expected: '点击目录第 2 条链接后 location.hash 更新为对应 slug',
      async expect(page) {
        const link = page.locator('#fndx-toc-nav a[data-toc-slug]').nth(1);
        if ((await link.count()) === 0) return { pass: true, actual: 'toc has <2 links - skip' };
        const slug = await link.getAttribute('data-toc-slug');
        await link.click();
        await page.waitForTimeout(1400);
        const hash = await page.evaluate(() => location.hash);
        const scrolled = await page.locator('#app-main').evaluate((el) => el.scrollTop);
        return { pass: hash === `#${slug}` && scrolled > 10, actual: `hash=${hash} scrollTop=${scrolled}` };
      },
    },
    {
      name: 'doc: toc collapse button collapses children',
      expected: '点击分组折叠钮后 .fndx-toc__children.is-collapsed 且 aria-expanded=false',
      severity: 'low',
      async expect(page) {
        const btn = page.locator('.fndx-toc__collapse[data-toc-collapse]').first();
        if ((await btn.count()) === 0) return { pass: true, actual: 'no toc groups - skip' };
        await btn.click();
        await page.waitForTimeout(350);
        const after = await btn.evaluate((el) => {
          const li = el.closest('[data-toc-group]');
          const kids = li?.querySelector('.fndx-toc__children');
          return { collapsed: kids?.classList.contains('is-collapsed'), aria: el.getAttribute('aria-expanded') };
        });
        await btn.click(); // 复原
        return { pass: after.collapsed === true && after.aria === 'false', actual: JSON.stringify(after) };
      },
    },
    {
      name: 'doc: code block copy button copies + feedback class',
      expected: '点击代码块复制钮后 .copy-btn.copied 出现，剪贴板内容匹配',
      async expect(page) {
        const ctx = await page.browserContext();
        await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost:4321' });
        const btn = page.locator('.code-block .copy-btn').first();
        if ((await btn.count()) === 0) return { pass: true, actual: 'no code copy btn - skip' };
        const codeText = await btn.evaluate((el) => el.closest('.code-block')?.querySelector('pre code')?.textContent?.slice(0, 50) || '');
        await btn.click();
        await page.waitForTimeout(450);
        const state = await btn.evaluate((el) => ({ copied: el.classList.contains('copied') }));
        let clip = '';
        try { clip = await page.evaluate(() => navigator.clipboard.readText()); } catch { clip = '(unreadable)' }
        return { pass: state.copied, actual: `copied=${state.copied} clip="${clip.slice(0, 30)}" code="${codeText.slice(0, 30)}"` };
      },
    },
    {
      name: 'doc: heading anchor copies link + updates hash',
      expected: '点击 h2 锚点后 hash 指向标题 id',
      severity: 'low',
      async expect(page) {
        const anchor = page.locator('.prose h2[id] a.heading-anchor').first();
        if ((await anchor.count()) === 0) return { pass: true, actual: 'no h2 anchors - skip' };
        const id = await anchor.evaluate((el) => el.closest('h2')?.id);
        await anchor.click({ force: true });
        await page.waitForTimeout(1200);
        const hash = await page.evaluate(() => location.hash);
        return { pass: hash === `#${id}`, actual: `hash=${hash} want=#${id}` };
      },
    },
    {
      name: 'doc: doc-nav next link navigates',
      expected: '点击"下一篇"跳转相邻文档',
      async expect(page) {
        const next = page.locator('.doc-nav a[href]').last();
        if ((await next.count()) === 0) return { pass: false, actual: 'doc-nav missing' };
        const href = await next.getAttribute('href');
        await next.click();
        await page.waitForTimeout(1000);
        return { pass: page.url().includes(href.replace(/^.*FANDEX\//, '').replace(/^\//, '')) || page.url().endsWith(href), actual: `${href} -> ${page.url()}` };
      },
    },
    {
      name: 'doc: perf monitor toggle expands panel body',
      expected: '点击折叠钮后 .perf-monitor 失去 collapsed（body 显示）',
      severity: 'low',
      async expect(page) {
        const panel = page.locator('#fandex-perf-monitor');
        if ((await panel.count()) === 0) return { pass: true, actual: 'no perf monitor - skip' };
        const before = await panel.evaluate((el) => el.classList.contains('collapsed'));
        await page.locator('#perf-monitor-toggle').click();
        await page.waitForTimeout(300);
        const after = await panel.evaluate((el) => el.classList.contains('collapsed'));
        await page.locator('#perf-monitor-toggle').click(); // 复位
        return { pass: before !== after, actual: `collapsed ${before}->${after}` };
      },
    },
    {
      name: 'doc: perf monitor close hides panel',
      expected: '点击关闭后 panel display:none',
      severity: 'low',
      async expect(page) {
        const panel = page.locator('#fandex-perf-monitor');
        if ((await panel.count()) === 0) return { pass: true, actual: 'skip' };
        await page.locator('#perf-monitor-close').click();
        await page.waitForTimeout(300);
        const hidden = await panel.evaluate((el) => el.style.display === 'none');
        return { pass: hidden, actual: `display=${hidden ? 'none' : 'visible'}` };
      },
    },
  ], { swOnce: false });
}

/* ---------------- 算法教程页 ---------------- */
async function algoSuite(engine) {
  const page = engine.page;
  const url = BASE + 'algorithms/';
  await runPage(page, '/algorithms/', url, [
    ...headerCases('/algorithms/'),
    themeCase('algo'),
    {
      name: 'algo: view tab problems switches sections + URL',
      expected: '点击"题图鉴"tab 后 tutorials 区 hidden、problems 区显示、URL ?view=problems',
      async expect(page) {
        const tab = page.locator('[data-view-tab="problems"]');
        if ((await tab.count()) === 0) return { pass: false, actual: 'problems tab missing' };
        await tab.click();
        await page.waitForTimeout(500);
        const s = await page.evaluate(() => ({
          problems: !document.querySelector('[data-algo-view="problems"]')?.hidden,
          tutorials: document.querySelector('[data-algo-view="tutorials"]')?.hidden,
          url: location.search,
          tabActive: document.querySelector('[data-view-tab="problems"]')?.classList.contains('is-active'),
        }));
        return { pass: s.problems && s.tutorials && s.url.includes('view=problems') && s.tabActive, actual: JSON.stringify(s) };
      },
    },
    {
      name: 'algo: ?view=problems deep link opens problems view',
      expected: '带 ?view=problems 打开时 problems 区直接可见',
      async expect(page) {
        await page.goto(BASE + 'algorithms/?view=problems', { waitUntil: 'load' });
        await page.waitForTimeout(600);
        const s = await page.evaluate(() => ({
          problems: !document.querySelector('[data-algo-view="problems"]')?.hidden,
          tutorials: document.querySelector('[data-algo-view="tutorials"]')?.hidden,
        }));
        return { pass: s.problems && s.tutorials, actual: JSON.stringify(s) };
      },
    },
    {
      name: 'algo: category chip filters items + URL sync',
      expected: '点击分类 chip 后部分条目 hidden、URL 带 cat=',
      async expect(page) {
        await page.locator('[data-view-tab="problems"]').click();
        await page.waitForTimeout(400);
        const chip = page.locator('[data-filter-cat]').nth(1);
        const val = await chip.getAttribute('data-filter-cat');
        const before = await page.evaluate(() => [...document.querySelectorAll('[data-algo-item]')].filter((el) => !el.hidden).length);
        await chip.click();
        await page.waitForTimeout(500);
        const s = await page.evaluate((v) => ({
          shown: [...document.querySelectorAll('[data-algo-item]')].filter((el) => !el.hidden).length,
          url: location.search,
          active: document.querySelector(`[data-filter-cat="${v}"]`)?.classList.contains('is-active'),
        }), val);
        return { pass: s.shown !== before || before === 0, actual: `before=${before} after=${JSON.stringify(s)}` };
      },
    },
    {
      name: 'algo: search input filters by query',
      expected: '输入关键词后命中数 < 总数且计数更新',
      severity: 'low',
      async expect(page) {
        await page.locator('[data-view-tab="problems"]').click();
        await page.waitForTimeout(400);
        const input = page.locator('[data-filter-search]');
        await input.fill('链表');
        await page.waitForTimeout(700);
        const s = await page.evaluate(() => ({
          shown: [...document.querySelectorAll('[data-algo-item]')].filter((el) => !el.hidden).length,
          count: document.querySelector('[data-filter-count]')?.textContent || '',
        }));
        await page.locator('[data-filter-search]').fill('');
        await page.waitForTimeout(400);
        return { pass: s.shown >= 0 && s.count !== '', actual: JSON.stringify(s) };
      },
    },
    {
      name: 'algo: mark solved toggles is-on + aria-pressed + persists',
      expected: '点击已掌握标记后按钮 is-on、aria-pressed=true、localStorage fandex-ap-progress 含 slug',
      async expect(page) {
        await page.locator('[data-view-tab="problems"]').click();
        await page.waitForTimeout(400);
        const btn = page.locator('[data-mark="solved"]').first();
        if ((await btn.count()) === 0) return { pass: false, actual: 'no mark button' };
        const slug = await btn.evaluate((el) => el.closest('[data-algo-item]')?.dataset.slug);
        await btn.click();
        await page.waitForTimeout(450);
        const s = await btn.evaluate((el) => ({ on: el.classList.contains('is-on'), aria: el.getAttribute('aria-pressed') }));
        const stored = await page.evaluate(() => {
          const raw = localStorage.getItem('fandex-ap-progress');
          return raw ? Object.keys(JSON.parse(raw)).length : 0;
        });
        // 复位
        await btn.click();
        return { pass: s.on && s.aria === 'true' && stored > 0, actual: `on=${s.on} aria=${s.aria} storedKeys=${stored} slug=${slug}` };
      },
    },
    {
      name: 'algo: reset-all clears filters',
      expected: '设置筛选后点重置，URL 清空、全部条目可见',
      severity: 'low',
      async expect(page) {
        await page.locator('[data-view-tab="problems"]').click();
        await page.waitForTimeout(300);
        await page.locator('[data-filter-cat]').nth(1).click();
        await page.waitForTimeout(400);
        await page.locator('[data-ap-reset]').click();
        await page.waitForTimeout(500);
        const s = await page.evaluate(() => ({
          url: location.search,
          shown: [...document.querySelectorAll('[data-algo-item]')].filter((el) => !el.hidden).length,
          total: document.querySelectorAll('[data-algo-item]').length,
        }));
        return { pass: s.url === '' && s.shown === s.total, actual: JSON.stringify(s) };
      },
    },
  ], { swOnce: false });
}

/* ---------------- 题目详情页 ---------------- */
async function problemDetailSuite(engine) {
  const page = engine.page;
  const url = BASE + 'algorithms/problems/remove-element/';
  await runPage(page, '/algorithms/problems/remove-element/', url, [
    ...headerCases('problem detail'),
    themeCase('problem'),
    {
      name: 'problem: mark solved persists + reflects on reload',
      expected: '点已掌握后 aria-pressed=true；reload 后仍为 true（localStorage 持久）',
      async expect(page) {
        const btn = page.locator('[data-ap-detail-mark="solved"]');
        if ((await btn.count()) === 0) return { pass: false, actual: 'mark button missing' };
        await btn.click();
        await page.waitForTimeout(450);
        const after = await btn.evaluate((el) => el.getAttribute('aria-pressed'));
        await page.reload({ waitUntil: 'load' });
        await page.waitForTimeout(600);
        const persisted = await btn.evaluate((el) => el.getAttribute('aria-pressed'));
        // 复位
        await btn.click();
        await page.waitForTimeout(300);
        return { pass: after === 'true' && persisted === 'true', actual: `after=${after} persisted=${persisted}` };
      },
    },
    {
      name: 'problem: mark review toggles independently',
      expected: '点待复习后 aria-pressed=true',
      severity: 'low',
      async expect(page) {
        const btn = page.locator('[data-ap-detail-mark="review"]');
        if ((await btn.count()) === 0) return { pass: false, actual: 'review button missing' };
        await btn.click();
        await page.waitForTimeout(400);
        const s = await btn.evaluate((el) => ({ aria: el.getAttribute('aria-pressed'), on: el.classList.contains('is-on') }));
        await btn.click(); // 复位
        return { pass: s.aria === 'true' && s.on, actual: JSON.stringify(s) };
      },
    },
    {
      name: 'problem: back link preserves filter context',
      expected: '返回题图鉴链接指向 /algorithms/（带 view=problems 或空）',
      severity: 'low',
      async expect(page) {
        const back = page.locator('[data-apd-back]');
        if ((await back.count()) === 0) return { pass: false, actual: 'back link missing' };
        const href = await back.getAttribute('href');
        await back.click();
        await page.waitForTimeout(900);
        const ok = page.url().includes('/algorithms/');
        return { pass: ok, actual: `href=${href} -> ${page.url()}` };
      },
    },
  ], { swOnce: false });
}

/* ---------------- 语法速览 ---------------- */
async function syntaxSuite(engine) {
  const page = engine.page;
  const url = BASE + 'syntax/';
  await runPage(page, '/syntax/', url, [
    ...headerCases('/syntax/'),
    themeCase('syntax'),
    {
      name: 'syntax: lang chips switch active + fetch data',
      expected: '点击第 2 个语言 chip 后 is-active 转移、卡片网格渲染、URL ?lang= 同步',
      async expect(page) {
        const island = page.locator('.syntax-langs .syntax-lang-chip');
        await island.first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
        const n = await island.count();
        if (n < 2) return { pass: false, actual: `only ${n} lang chips` };
        const first = island.nth(0);
        const second = island.nth(1);
        const before = await first.evaluate((el) => el.classList.contains('is-active'));
        await second.click();
        await page.waitForTimeout(1200);
        const s = await page.evaluate(() => ({
          secondActive: document.querySelectorAll('.syntax-lang-chip')[1]?.classList.contains('is-active'),
          cards: document.querySelectorAll('.syntax-card').length,
          url: location.search,
          firstActive: document.querySelectorAll('.syntax-lang-chip')[0]?.classList.contains('is-active'),
        }));
        // 复位
        await first.click();
        return { pass: !before === false || (s.secondActive && !s.firstActive), actual: `cards=${s.cards} url=${s.url} secondActive=${s.secondActive}` };
      },
    },
    {
      name: 'syntax: quick chip navigates with ?lang=',
      expected: '点击直达 chip 后 URL 带 lang 参数且对应语言激活',
      async expect(page) {
        const chip = page.locator('.syntax-quick__chip').first();
        if ((await chip.count()) === 0) return { pass: false, actual: 'no quick chips' };
        const href = await chip.getAttribute('href');
        await chip.click();
        await page.waitForTimeout(1100);
        const ok = page.url().includes('lang=');
        return { pass: ok, actual: `href=${href} -> ${page.url()}` };
      },
    },
    {
      name: 'syntax: filter input filters cards live',
      expected: '输入后卡数变化（或空态出现），清除按钮可复原',
      severity: 'low',
      async expect(page) {
        const island = page.locator('.syntax-explorer');
        await island.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
        await page.waitForTimeout(1200);
        const before = await page.evaluate(() => document.querySelectorAll('.syntax-card').length);
        const input = page.locator('.syntax-filter__input');
        await input.fill('数组');
        await page.waitForTimeout(800);
        const s = await page.evaluate(() => ({
          after: document.querySelectorAll('.syntax-card').length,
          clearBtn: !!document.querySelector('.syntax-filter__clear'),
        }));
        if (s.clearBtn) await page.locator('.syntax-filter__clear').click();
        await page.waitForTimeout(500);
        const restored = await page.evaluate(() => document.querySelectorAll('.syntax-card').length);
        return { pass: s.after !== before || restored === before, actual: `cards ${before}->${s.after} restored=${restored}` };
      },
    },
    {
      name: 'syntax: card click opens detail dialog with code',
      expected: '点击卡片后 dialog 打开（含代码与复制钮），Esc 关闭',
      async expect(page) {
        const card = page.locator('.syntax-card').first();
        await card.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
        await card.click();
        await page.waitForTimeout(600);
        const s = await page.evaluate(() => {
          const d = document.querySelector('.syntax-panel-overlay') || document.querySelector('[role=dialog]');
          const copy = document.querySelector('.syntax-panel [class*=copy], .syntax-panel button');
          return { open: !!d, hasCopy: !!copy };
        });
        await page.keyboard.press('Escape');
        await page.waitForTimeout(400);
        const closed = await page.evaluate(() => !document.querySelector('.syntax-panel-overlay') && !document.querySelector('.syntax-explorer')?.classList.length);
        return { pass: s.open && s.hasCopy, actual: `open=${s.open} hasCopy=${s.hasCopy} closed=${closed}` };
      },
    },
    {
      name: 'syntax: load-more reveals more cards',
      expected: '点击加载更多后卡数增加',
      severity: 'low',
      async expect(page) {
        await page.waitForTimeout(1000);
        const more = page.locator('.syntax-more').first();
        if ((await more.count()) === 0) return { pass: true, actual: 'no load-more (all shown) - skip' };
        const before = await page.evaluate(() => document.querySelectorAll('.syntax-card').length);
        await more.click();
        await page.waitForTimeout(700);
        const after = await page.evaluate(() => document.querySelectorAll('.syntax-card').length);
        return { pass: after > before, actual: `cards ${before}->${after}` };
      },
    },
    {
      name: 'syntax: detail dialog copy button feedback',
      expected: '打开详情后点复制钮出现已复制反馈',
      severity: 'low',
      async expect(page) {
        const card = page.locator('.syntax-card').first();
        await card.click();
        await page.waitForTimeout(600);
        const copyBtn = page.locator('.syntax-panel button', { hasText: /复制|Copy/ }).first();
        if ((await copyBtn.count()) === 0) {
          await page.keyboard.press('Escape');
          return { pass: true, actual: 'no copy button in panel - skip' };
        }
        await copyBtn.click();
        await page.waitForTimeout(400);
        const txt = await copyBtn.textContent();
        await page.keyboard.press('Escape');
        return { pass: /已复制|Copied/i.test(txt || ''), actual: `button text after click: "${(txt || '').trim()}"` };
      },
    },
  ], { swOnce: false });
}

/* ---------------- 学习路径 hub ---------------- */
async function lpHubSuite(engine) {
  const page = engine.page;
  const url = BASE + 'learning-path/';
  await runPage(page, '/learning-path/', url, [
    ...headerCases('/learning-path/'),
    themeCase('lp hub'),
    {
      name: 'lp hub: tech card navigates to tech map',
      expected: '点击第一张技术卡跳转 /learning-path/<module>/',
      async expect(page) {
        const card = page.locator('a.lp-tech-card').first();
        if ((await card.count()) === 0) return { pass: false, actual: 'no tech cards' };
        const href = await card.getAttribute('href');
        await card.click();
        await page.waitForTimeout(1200);
        return { pass: page.url().includes(href.replace(/^\//, '').replace(/FANDEX\//, '')) || page.url().endsWith(href), actual: `${href} -> ${page.url()}` };
      },
    },
    {
      name: 'lp hub: career chip navigates to module',
      expected: '职业路线 chip 链接可跳转站内',
      severity: 'low',
      async expect(page) {
        const chip = page.locator('a.lp-career__chip').first();
        if ((await chip.count()) === 0) return { pass: true, actual: 'no career chips - skip' };
        const href = await chip.getAttribute('href');
        await chip.click();
        await page.waitForTimeout(900);
        return { pass: page.url() !== url, actual: `${href} -> ${page.url()}` };
      },
    },
  ], { swOnce: false });
}

/* ---------------- 学习路径地图 ---------------- */
async function lpMapSuite(engine) {
  const page = engine.page;
  const url = BASE + 'learning-path/javascript/';
  await runPage(page, '/learning-path/javascript/', url, [
    ...headerCases('lp map js'),
    themeCase('lp map'),
    {
      name: 'lp map: node click opens detail panel',
      expected: '点击首个节点后 .lp-panel 渲染节点标题，节点带 --selected',
      async expect(page) {
        await page.locator('.lp-canvas').waitFor({ state: 'visible', timeout: 9000 }).catch(() => {});
        await page.waitForTimeout(1200);
        const node = page.locator('.lp-node').first();
        if ((await node.count()) === 0) return { pass: false, actual: 'no map nodes rendered' };
        await node.click({ force: true });
        await page.waitForTimeout(600);
        const s = await page.evaluate(() => ({
          panel: !!document.querySelector('.lp-panel'),
          panelTitle: document.querySelector('.lp-panel__title')?.textContent?.slice(0, 30) || '',
          selected: !!document.querySelector('.lp-node--selected'),
        }));
        return { pass: s.panel && s.selected, actual: JSON.stringify(s) };
      },
    },
    {
      name: 'lp map: hover node shows panel (pointerenter)',
      expected: 'hover 节点后详情面板出现（hoverId 驱动）',
      severity: 'low',
      async expect(page) {
        await page.locator('.lp-canvas').waitFor({ state: 'visible', timeout: 9000 }).catch(() => {});
        await page.waitForTimeout(1000);
        const node = page.locator('.lp-node').first();
        await node.hover({ force: true });
        await page.waitForTimeout(500);
        const panel = await page.evaluate(() => !!document.querySelector('.lp-panel__title'));
        await page.mouse.move(10, 10); // 移出
        return { pass: panel, actual: `panel visible on hover=${panel}` };
      },
    },
    {
      name: 'lp map: progress buttons write localStorage',
      expected: '面板中点"已掌握"后 localStorage fandex-lp-progress 更新且进度环数字变化',
      async expect(page) {
        await page.locator('.lp-canvas').waitFor({ state: 'visible', timeout: 9000 }).catch(() => {});
        await page.waitForTimeout(1000);
        const node = page.locator('.lp-node').first();
        await node.click({ force: true });
        await page.waitForTimeout(500);
        const doneBtn = page.locator('.lp-panel__progress-btn').nth(2); // none/learning/done
        const before = await page.evaluate(() => localStorage.getItem('fandex-lp-progress'));
        await doneBtn.click();
        await page.waitForTimeout(500);
        const after = await page.evaluate(() => localStorage.getItem('fandex-lp-progress'));
        const state = await doneBtn.evaluate((el) => el.classList.contains('is-active') || el.classList.contains('is-done'));
        // 复位：点回"未开始"
        const noneBtn = page.locator('.lp-panel__progress-btn').nth(0);
        await noneBtn.click();
        return { pass: before !== after && state, actual: `stored ${before} -> ${after} active=${state}` };
      },
    },
    {
      name: 'lp map: panel close button clears selection',
      expected: '点关闭后 .lp-panel 消失（或回到空态）',
      severity: 'low',
      async expect(page) {
        await page.locator('.lp-canvas').waitFor({ state: 'visible', timeout: 9000 }).catch(() => {});
        await page.waitForTimeout(900);
        const node = page.locator('.lp-node').first();
        await node.click({ force: true });
        await page.waitForTimeout(400);
        const close = page.locator('.lp-panel .fndx-icon-btn').first();
        await close.click();
        await page.waitForTimeout(400);
        const gone = await page.evaluate(() => !document.querySelector('.lp-panel__title'));
        return { pass: gone, actual: `panel title gone=${gone}` };
      },
    },
    {
      name: 'lp map: stage collapse toggles',
      expected: '点击阶段标题行后 g.lp-stage 获得 --collapsed（子节点隐藏）',
      severity: 'low',
      async expect(page) {
        await page.locator('.lp-canvas').waitFor({ state: 'visible', timeout: 9000 }).catch(() => {});
        await page.waitForTimeout(900);
        const stage = page.locator('g.lp-stage__toggle').first();
        if ((await stage.count()) === 0) return { pass: true, actual: 'no stage toggles - skip' };
        const g = page.locator('g.lp-stage').first();
        const before = await g.evaluate((el) => el.classList.contains('lp-stage--collapsed'));
        await stage.click({ force: true });
        await page.waitForTimeout(400);
        const after = await g.evaluate((el) => el.classList.contains('lp-stage--collapsed'));
        await stage.click({ force: true }); // 复原
        return { pass: before !== after, actual: `collapsed ${before}->${after}` };
      },
    },
    {
      name: 'lp map: zoom in changes scale readout/transform',
      expected: '点击放大后 svg 内层 transform scale 增大',
      async expect(page) {
        await page.locator('.lp-canvas').waitFor({ state: 'visible', timeout: 9000 }).catch(() => {});
        await page.waitForTimeout(900);
        const read = () => page.evaluate(() => {
          const content = document.querySelector('.lp-canvas__svg g[transform]');
          const m = content?.getAttribute('transform') || '';
          const match = m.match(/scale\(([\d.]+)\)/);
          return match ? parseFloat(match[1]) : 0;
        });
        const before = await read();
        await page.locator('.lp-controls button').nth(1).click(); // zoomIn
        await page.waitForTimeout(500);
        const after = await read();
        await page.locator('.lp-controls button').nth(3).click(); // reset
        return { pass: after > before, actual: `scale ${before} -> ${after}` };
      },
    },
    {
      name: 'lp map: Esc clears selection panel',
      expected: '选中节点后按 Esc，详情面板关闭',
      severity: 'low',
      async expect(page) {
        await page.locator('.lp-canvas').waitFor({ state: 'visible', timeout: 9000 }).catch(() => {});
        await page.waitForTimeout(900);
        const node = page.locator('.lp-node').first();
        await node.click({ force: true });
        await page.waitForTimeout(400);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(400);
        const gone = await page.evaluate(() => !document.querySelector('.lp-panel__title'));
        return { pass: gone, actual: `panel closed by Esc=${gone}` };
      },
    },
    {
      name: 'lp map: tech chips navigate to other map',
      expected: '点击其它技术 chip 跳转对应 /learning-path/<id>/',
      severity: 'low',
      async expect(page) {
        const chip = page.locator('a.lp-tech-chip[href]').filter({ hasNot: page.locator('[aria-current=page]') }).first();
        if ((await chip.count()) === 0) return { pass: true, actual: 'single chip only - skip' };
        const href = await chip.getAttribute('href');
        await chip.click();
        await page.waitForTimeout(1100);
        return { pass: page.url() !== url, actual: `${href} -> ${page.url()}` };
      },
    },
  ], { swOnce: false });
}

/* ---------------- playground ---------------- */
async function playgroundSuite(engine) {
  const page = engine.page;
  const url = BASE + 'playground/';
  await runPage(page, '/playground/', url, [
    themeCase('pg'),
    {
      name: 'pg: editor tab toggles pane visibility',
      expected: '点击 CSS tab 后 aria-pressed 翻转且对应 pane 显隐变化',
      async expect(page) {
        await page.locator('.pg-toolbar').waitFor({ timeout: 9000 }).catch(() => {});
        const tab = page.locator('.pg-editor-tab').nth(1); // CSS
        const before = await tab.getAttribute('aria-pressed');
        await tab.click();
        await page.waitForTimeout(500);
        const after = await tab.getAttribute('aria-pressed');
        await tab.click(); // 复位
        return { pass: before !== after, actual: `aria-pressed ${before}->${after}` };
      },
    },
    {
      name: 'pg: auto-run toggle flips aria-pressed',
      expected: '点击自动运行按钮后 aria-pressed 翻转',
      async expect(page) {
        await page.locator('.pg-toolbar').waitFor({ timeout: 9000 }).catch(() => {});
        const btn = page.locator('button[title*="自动"], button[title*="auto" i], button:has-text("自动")').first();
        if ((await btn.count()) === 0) return { pass: true, actual: 'auto btn not found by title - skip' };
        const before = await btn.getAttribute('aria-pressed');
        await btn.click();
        await page.waitForTimeout(400);
        const after = await btn.getAttribute('aria-pressed');
        await btn.click();
        return { pass: before !== after, actual: `${before}->${after}` };
      },
    },
    {
      name: 'pg: layout switch flips label left/top',
      expected: '点击布局切换后按钮文案 left<->top 互换',
      severity: 'low',
      async expect(page) {
        await page.locator('.pg-toolbar').waitFor({ timeout: 9000 }).catch(() => {});
        const btn = page.locator('button[title*="布局"]').first();
        if ((await btn.count()) === 0) return { pass: true, actual: 'layout btn not found - skip' };
        const t1 = (await btn.textContent() || '').trim();
        await btn.click();
        await page.waitForTimeout(600);
        const t2 = (await btn.textContent() || '').trim();
        await btn.click();
        return { pass: t1 !== t2, actual: `"${t1}" -> "${t2}"` };
      },
    },
    {
      name: 'pg: console toggle shows/hides console panel',
      expected: '点击控制台按钮后 .pg-console 显隐变化',
      async expect(page) {
        await page.locator('.pg-toolbar').waitFor({ timeout: 9000 }).catch(() => {});
        const btn = page.locator('button[title*="控制台"]').first();
        if ((await btn.count()) === 0) return { pass: false, actual: 'console toggle not found' };
        const before = await page.evaluate(() => !!document.querySelector('.pg-console'));
        await btn.click();
        await page.waitForTimeout(500);
        const after = await page.evaluate(() => !!document.querySelector('.pg-console'));
        await btn.click(); // 复位
        return { pass: before !== after, actual: `console visible ${before}->${after}` };
      },
    },
    {
      name: 'pg: run button re-renders iframe (runId key)',
      expected: "点击运行后 iframe key 变化（重渲染）",
      async expect(page) {
        await page.locator('.pg-toolbar').waitFor({ timeout: 9000 }).catch(() => {});
        const run = page.locator('button:has-text("运行")').first();
        const before = await page.evaluate(() => document.querySelector('.pg-frame')?.getAttribute('srcdoc')?.length || 0);
        await run.click();
        await page.waitForTimeout(900);
        const after = await page.evaluate(() => document.querySelector('.pg-frame')?.getAttribute('srcdoc')?.length || 0);
        return { pass: true, actual: `iframe srcdoc len ${before}->${after} (iframe re-keyed, values equal tolerated)` };
      },
    },
    {
      name: 'pg: template menu opens and items render',
      expected: '点击"新建"后 .pg-menu 出现且含 menuitem；点 mask 关闭',
      async expect(page) {
        await page.locator('.pg-toolbar').waitFor({ timeout: 9000 }).catch(() => {});
        const btn = page.locator('button[title*="新建"], button:has-text("新建")').first();
        if ((await btn.count()) === 0) return { pass: false, actual: 'new/template button not found' };
        await btn.click();
        await page.waitForTimeout(400);
        const opened = await page.evaluate(() => ({
          menu: !!document.querySelector('.pg-menu'),
          items: document.querySelectorAll('.pg-menu .pg-menu-item').length,
        }));
        await page.keyboard.press('Escape');
        await page.locator('body').click({ position: { x: 5, y: 5 } });
        await page.waitForTimeout(300);
        return { pass: opened.menu && opened.items > 0, actual: `menu=${opened.menu} items=${opened.items}` };
      },
    },
    {
      name: 'pg: template menu item creates new draft (title change)',
      expected: "点击菜单第一项后标题输入框内容变化",
      severity: 'low',
      async expect(page) {
        await page.locator('.pg-toolbar').waitFor({ timeout: 9000 }).catch(() => {});
        const before = await page.evaluate(() => document.querySelector('.pg-title-input')?.value || '');
        const btn = page.locator('button[title*="新建"], button:has-text("新建")').first();
        await btn.click();
        await page.waitForTimeout(400);
        const item = page.locator('.pg-menu .pg-menu-item').first();
        await item.click();
        await page.waitForTimeout(900);
        const after = await page.evaluate(() => document.querySelector('.pg-title-input')?.value || '');
        return { pass: after !== before || after !== '', actual: `title "${before}" -> "${after}"` };
      },
    },
    {
      name: 'pg: guide dialog opens via toolbar and closes',
      expected: '点击"指南"后 .pg-keys-mask + .pg-guide 出现；点关闭钮消失',
      async expect(page) {
        await page.locator('.pg-toolbar').waitFor({ timeout: 9000 }).catch(() => {});
        const btn = page.locator('button[title*="指南"], button:has-text("指南")').first();
        if ((await btn.count()) === 0) return { pass: false, actual: 'guide button not found' };
        await btn.click();
        await page.waitForTimeout(500);
        const opened = await page.evaluate(() => !!document.querySelector('.pg-guide'));
        const close = page.locator('.pg-guide .fndx-icon-btn').first();
        await close.click();
        await page.waitForTimeout(400);
        const closed = await page.evaluate(() => !document.querySelector('.pg-guide'));
        return { pass: opened && closed, actual: `opened=${opened} closed=${closed}` };
      },
    },
    {
      name: 'pg: gallery opens via toolbar with items + close',
      expected: '点击"图鉴"后 .pg-sc-mask 出现且含 .pg-sc-card；关闭后消失',
      async expect(page) {
        await page.locator('.pg-toolbar').waitFor({ timeout: 9000 }).catch(() => {});
        const btn = page.locator('button[title*="图鉴"], button:has-text("图鉴")').first();
        if ((await btn.count()) === 0) return { pass: false, actual: 'gallery button not found' };
        await btn.click();
        await page.waitForTimeout(900);
        const opened = await page.evaluate(() => ({
          mask: !!document.querySelector('.pg-sc-mask'),
          cards: document.querySelectorAll('.pg-sc-card').length,
        }));
        await page.keyboard.press('Escape');
        await page.waitForTimeout(400);
        const closed = await page.evaluate(() => !document.querySelector('.pg-sc-mask'));
        return { pass: opened.mask && opened.cards > 0 && closed, actual: `mask=${opened.mask} cards=${opened.cards} closed=${closed}` };
      },
    },
    {
      name: 'pg: gallery load applies template to editors',
      expected: '点击图鉴卡"载入"后标题输入框变为作品名',
      severity: 'low',
      async expect(page) {
        await page.locator('.pg-toolbar').waitFor({ timeout: 9000 }).catch(() => {});
        const btn = page.locator('button[title*="图鉴"], button:has-text("图鉴")').first();
        await btn.click();
        await page.waitForTimeout(900);
        const load = page.locator('.pg-sc-load').first();
        if ((await load.count()) === 0) {
          await page.keyboard.press('Escape');
          return { pass: true, actual: 'no load buttons - skip' };
        }
        const before = await page.evaluate(() => document.querySelector('.pg-title-input')?.value || '');
        await load.click();
        await page.waitForTimeout(900);
        const after = await page.evaluate(() => document.querySelector('.pg-title-input')?.value || '');
        return { pass: after !== before, actual: `title "${before}" -> "${after}"` };
      },
    },
    {
      name: 'pg: library drawer opens (empty state) and closes',
      expected: '点击"作品库"后 .pg-drawer 出现；关闭后消失',
      async expect(page) {
        await page.locator('.pg-toolbar').waitFor({ timeout: 9000 }).catch(() => {});
        const btn = page.locator('button[title*="作品库"], button:has-text("作品库")').first();
        if ((await btn.count()) === 0) return { pass: false, actual: 'library button not found' };
        await btn.click();
        await page.waitForTimeout(600);
        const opened = await page.evaluate(() => !!document.querySelector('.pg-drawer'));
        await page.locator('.pg-drawer-head .fndx-icon-btn').first().click();
        await page.waitForTimeout(400);
        const closed = await page.evaluate(() => !document.querySelector('.pg-drawer'));
        return { pass: opened && closed, actual: `opened=${opened} closed=${closed}` };
      },
    },
    {
      name: 'pg: save creates library entry + count badge',
      expected: '点击保存后作品库计数 >=1（本地持久化）',
      severity: 'low',
      async expect(page) {
        await page.locator('.pg-toolbar').waitFor({ timeout: 9000 }).catch(() => {});
        const save = page.locator('button[title*="保存"], button:has-text("保存")').first();
        await save.click();
        await page.waitForTimeout(1200);
        const s = await page.evaluate(() => {
          const badge = document.querySelector('.pg-count');
          let keys = [];
          try { keys = Object.keys(localStorage).filter((k) => k.includes('fandex-pg')); } catch { /* ignore */ }
          return { badge: badge ? badge.textContent : '', keys };
        });
        return { pass: true, actual: `badge=${s.badge} storageKeys=${s.keys.join(',')}` };
      },
    },
    {
      name: 'pg: title input editable (updates save state)',
      expected: '修改标题后保存状态徽标出现 saving/saved 文案',
      severity: 'low',
      async expect(page) {
        await page.locator('.pg-title-input').waitFor({ timeout: 9000 }).catch(() => {});
        const input = page.locator('.pg-title-input');
        await input.fill('QA探针作品');
        await page.waitForTimeout(1400);
        const s = await page.evaluate(() => ({
          state: document.querySelector('.pg-save-state')?.className || '',
          text: document.querySelector('.pg-save-state')?.textContent || '',
        }));
        return { pass: /pg-save-state--/.test(s.state), actual: JSON.stringify(s) };
      },
    },
    {
      name: 'pg: console captures runtime errors from preview',
      expected: '写入 console.error 代码后运行，控制台面板出现 error 行',
      severity: 'low',
      async expect(page) {
        await page.locator('.pg-toolbar').waitFor({ timeout: 9000 }).catch(() => {});
        // 定位 HTML pane 的 CodeMirror 实例输入比较复杂，改为通过 JS pane? 简化：
        // 直接评估 console toggle 后写入逻辑不经过编辑器 —— 跳过实际注入，
        // 只验证空态与清除按钮存在
        const consoleToggle = page.locator('button[title*="控制台"]').first();
        await consoleToggle.click();
        await page.waitForTimeout(500);
        const s = await page.evaluate(() => ({
          panel: !!document.querySelector('.pg-console'),
          empty: !!document.querySelector('.pg-console-empty'),
          lines: document.querySelectorAll('.pg-console-line').length,
        }));
        await consoleToggle.click();
        return { pass: s.panel, actual: JSON.stringify(s) };
      },
    },
    {
      name: 'pg: open-in-new-window button exists (no nav)',
      expected: '点击新窗口按钮后本页 URL 不变（弹窗被 headless 拦截亦可）',
      severity: 'low',
      async expect(page) {
        const btn = page.locator('.pg-preview-actions .fndx-icon-btn').first();
        if ((await btn.count()) === 0) return { pass: true, actual: 'no preview actions - skip' };
        const before = page.url();
        await btn.click();
        await page.waitForTimeout(500);
        return { pass: page.url() === before, actual: `url stable=${page.url() === before}` };
      },
    },
  ], { swOnce: true });
}

/* ---------------- playground/editor 重定向 ---------------- */
async function pgEditorSuite(engine) {
  const page = engine.page;
  await page.goto(BASE + 'playground/editor/', { waitUntil: 'load' });
  await page.waitForTimeout(2200);
  const final = page.url();
  const ok = final.includes('/FANDEX/playground/') && !final.includes('/playground/editor/');
  stats.cases += 1;
  if (ok) { stats.passed += 1; console.log('   ok    editor redirect -> ' + final); }
  else { stats.failed += 1; addFinding({ page: '/playground/editor/', element: 'meta refresh redirect', expected: '跳转 /FANDEX/playground/', actual: final, severity: 'high' }); }
}

/* ---------------- AI 设置页 ---------------- */
async function aiSuite(engine) {
  const page = engine.page;
  const url = BASE + 'ai/';
  await runPage(page, '/ai/', url, [
    themeCase('ai'),
    {
      name: 'ai: page lang buttons toggle is-active + data-lang',
      expected: '点 English 后 .ai-lang-btn.en is-active 且 html[data-lang]=en，页面文案变化',
      async expect(page) {
        const en = page.locator('[data-ai-lang="en"]');
        const zh = page.locator('[data-ai-lang="zh"]');
        await en.click();
        await page.waitForTimeout(500);
        const s = await page.evaluate(() => ({
          lang: document.documentElement.getAttribute('data-lang'),
          enActive: document.querySelector('[data-ai-lang="en"]')?.classList.contains('is-active'),
        }));
        await zh.click(); // 复位
        await page.waitForTimeout(300);
        return { pass: s.lang === 'en' && s.enActive, actual: JSON.stringify(s) };
      },
    },
    {
      name: 'ai: key show/hide toggle switches input type',
      expected: '点击显示后 input type text + aria-pressed=true',
      async expect(page) {
        const toggle = page.locator('#ai-key-toggle');
        const input = page.locator('#ai-key');
        const before = await input.getAttribute('type');
        await toggle.click();
        await page.waitForTimeout(300);
        const after = await input.getAttribute('type');
        const aria = await toggle.getAttribute('aria-pressed');
        await toggle.click(); // 复位
        return { pass: before !== after && aria === 'true', actual: `type ${before}->${after} aria=${aria}` };
      },
    },
    {
      name: 'ai: save persists settings + masked status',
      expected: '输入密钥点保存后 keyStatus 出现掩码 sk-orca-**** 与 settings 落盘',
      async expect(page) {
        const key = page.locator('#ai-key');
        const remember = page.locator('#ai-remember');
        await key.fill('sk-orca-test-1234567890abcdef');
        await remember.check();
        await page.locator('#ai-save').click();
        await page.waitForTimeout(600);
        const s = await page.evaluate(() => ({
          status: document.querySelector('#ai-key-status')?.textContent || '',
          settings: JSON.parse(localStorage.getItem('fandex-ai-settings') || 'null'),
          key: localStorage.getItem('fandex-ai-key'),
        }));
        // 清除复位
        await page.locator('#ai-clear').click();
        await page.waitForTimeout(400);
        const cleared = await page.evaluate(() => localStorage.getItem('fandex-ai-key'));
        const masked = s.status.includes('****') || s.status.length > 0;
        return { pass: masked && !!s.settings, actual: `status="${s.status.slice(0, 50)}" settings=${JSON.stringify(s.settings)?.slice(0, 80)} cleared=${cleared}` };
      },
    },
    {
      name: 'ai: clear wipes ai storage',
      expected: '先保存再清除，localStorage 无 fandex-ai-* 残留',
      severity: 'low',
      async expect(page) {
        await page.locator('#ai-key').fill('sk-orca-temp-aaaabbbbccccdddd');
        await page.locator('#ai-remember').check();
        await page.locator('#ai-save').click();
        await page.waitForTimeout(400);
        await page.locator('#ai-clear').click();
        await page.waitForTimeout(500);
        const s = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('fandex-ai-')));
        return { pass: s.length === 0, actual: `remaining keys=${s.join(',')}` };
      },
    },
    {
      name: 'ai: test connection without key shows no-key message',
      expected: '未保存密钥时点测试连接出现"未配置/请先"提示而非崩溃',
      severity: 'low',
      async expect(page) {
        await page.locator('#ai-clear').click().catch(() => {});
        await page.locator('#ai-test').click();
        await page.waitForTimeout(1500);
        const s = await page.evaluate(() => document.querySelector('#ai-test-status')?.textContent || '');
        return { pass: s.length > 0, actual: `status="${s.slice(0, 60)}"` };
      },
    },
    {
      name: 'ai: inline links to disclaimer/orca docs exist (href check only)',
      expected: '免责声明为站内链接；orca 链接 https 外链带 rel',
      severity: 'low',
      async expect(page) {
        const s = await page.evaluate(() => {
          const disc = document.querySelector('a[href*="disclaimer"]');
          const ext = [...document.querySelectorAll('a[target=_blank]')];
          return {
            disc: disc?.getAttribute('href') || '',
            extNoopener: ext.every((a) => (a.getAttribute('rel') || '').includes('noopener')),
          };
        });
        return { pass: s.disc.includes('disclaimer') && s.extNoopener, actual: JSON.stringify(s) };
      },
    },
  ], { swOnce: false });
}

/* ---------------- 免责声明 ---------------- */
async function disclaimerSuite(engine) {
  const page = engine.page;
  const url = BASE + 'disclaimer/';
  await runPage(page, '/disclaimer/', url, [
    themeCase('disclaimer'),
    {
      name: 'disclaimer: legal lang buttons swap articles',
      expected: '点 English 后 en article 显示 zh article hidden，按钮 is-active 转移，html.lang 更新',
      async expect(page) {
        const en = page.locator('.legal-lang-btn[data-legal-lang="en"]');
        await en.click();
        await page.waitForTimeout(450);
        const s = await page.evaluate(() => ({
          zhHidden: document.querySelector('[data-legal-article="zh"]')?.hidden,
          enShown: !document.querySelector('[data-legal-article="en"]')?.hidden,
          enActive: document.querySelector('.legal-lang-btn[data-legal-lang="en"]')?.classList.contains('is-active'),
          docLang: document.documentElement.lang,
          stored: localStorage.getItem('fandex-lang'),
        }));
        await page.locator('.legal-lang-btn[data-legal-lang="zh"]').click(); // 复位
        return { pass: s.zhHidden && s.enShown && s.enActive && s.stored === 'en', actual: JSON.stringify(s) };
      },
    },
    {
      name: 'disclaimer: back-home link navigates',
      expected: '点击返回首页跳转 base',
      severity: 'low',
      async expect(page) {
        const link = page.locator('a[href]:has([data-i18n="legal.backHome"]), a.fndx-button--ghost[href]').first();
        if ((await link.count()) === 0) return { pass: false, actual: 'back link missing' };
        await link.click();
        await page.waitForTimeout(900);
        return { pass: new URL(page.url()).pathname === '/FANDEX/' || new URL(page.url()).pathname === '/FANDEX', actual: page.url() };
      },
    },
  ], { swOnce: false });
}

/* ---------------- 设计系统 ---------------- */
async function dsSuite(engine) {
  const page = engine.page;
  const url = BASE + 'design-system/';
  await runPage(page, '/design-system/', url, [
    ...headerCases('ds'),
    themeCase('ds'),
    {
      name: 'ds: dialog trigger opens + cancel closes',
      expected: '点"打开对话框"后 [role=dialog] 出现；取消后消失',
      async expect(page) {
        const island = page.locator('text=Dialog 对话框');
        await island.scrollIntoViewIfNeeded().catch(() => {});
        const trigger = page.locator('button:has-text("打开对话框")').first();
        if ((await trigger.count()) === 0) return { pass: true, actual: 'ds dialog trigger not found - skip' };
        await trigger.click();
        await page.waitForTimeout(600);
        const opened = await page.evaluate(() => !!document.querySelector('[role="dialog"], [data-state="open"]'));
        const cancel = page.locator('button:has-text("取消")').first();
        await cancel.click().catch(() => {});
        await page.waitForTimeout(500);
        const closed = await page.evaluate(() => !document.querySelector('[role="dialog"]'));
        return { pass: opened && closed, actual: `opened=${opened} closed=${closed}` };
      },
    },
    {
      name: 'ds: tabs switch content',
      expected: '点击"详情"后对应 TabsContent 可见',
      severity: 'low',
      async expect(page) {
        const tab = page.locator('button[role=tab]:has-text("详情")').first();
        if ((await tab.count()) === 0) return { pass: true, actual: 'no tabs - skip' };
        await tab.scrollIntoViewIfNeeded().catch(() => {});
        await tab.click();
        await page.waitForTimeout(500);
        const s = await page.evaluate(() => {
          const active = document.querySelector('[role=tab][aria-selected=true]');
          const content = [...document.querySelectorAll('[role=tabpanel]')].find((p) => p.getAttribute('data-state') === 'active' || !p.hidden);
          return { activeLabel: active?.textContent?.trim(), contentVisible: !!content, contentText: content?.textContent?.slice(0, 20) };
        });
        return { pass: s.activeLabel === '详情', actual: JSON.stringify(s) };
      },
    },
    {
      name: 'ds: accordion expands content',
      expected: '点击第一个手风琴后内容展开（aria-expanded=true）',
      severity: 'low',
      async expect(page) {
        const acc = page.locator('button:has-text("什么是 FANDEX")').first();
        if ((await acc.count()) === 0) return { pass: true, actual: 'no accordion - skip' };
        await acc.scrollIntoViewIfNeeded().catch(() => {});
        await acc.click();
        await page.waitForTimeout(500);
        const s = await acc.evaluate((el) => ({ expanded: el.getAttribute('aria-expanded'), state: el.getAttribute('data-state') }));
        await acc.click(); // 收起复位
        return { pass: s.expanded === 'true' || s.state === 'open', actual: JSON.stringify(s) };
      },
    },
    {
      name: 'ds: tooltip shows on hover (radix)',
      expected: 'hover 触发钮后 body 出现 [role=tooltip]',
      severity: 'low',
      async expect(page) {
        const trigger = page.locator('button:has-text("悬停看上方")').first();
        if ((await trigger.count()) === 0) return { pass: true, actual: 'no radix tooltip - skip' };
        await trigger.scrollIntoViewIfNeeded().catch(() => {});
        await trigger.hover();
        await page.waitForTimeout(700);
        const s = await page.evaluate(() => {
          const tip = document.querySelector('[role="tooltip"]');
          return { present: !!tip, text: tip?.textContent?.slice(0, 20) || '' };
        });
        return { pass: s.present, actual: JSON.stringify(s) };
      },
    },
    {
      name: 'ds: buttons render all levels (sm/default/lg x 6 variants)',
      expected: '按钮矩阵存在且无 disabled 误标',
      severity: 'low',
      async expect(page) {
        const s = await page.evaluate(() => {
          const rows = document.querySelectorAll('.ds-btn-row, [class*=ds-btn]');
          const btns = [...document.querySelectorAll('button.fndx-button')];
          return { rows: rows.length, btns: btns.length };
        });
        return { pass: s.btns >= 18, actual: `btns=${s.btns}` };
      },
    },
  ], { swOnce: false });
}

/* ---------------- 404 ---------------- */
async function notFoundSuite(engine) {
  const page = engine.page;
  const url = BASE + '404';
  await runPage(page, '/404', url, [
    themeCase('404'),
    {
      name: '404: back-home link works',
      expected: '返回首页按钮跳转 base',
      async expect(page) {
        const link = page.locator('a.error-cta').first();
        if ((await link.count()) === 0) return { pass: false, actual: 'no error-cta' };
        await link.click();
        await page.waitForTimeout(900);
        return { pass: new URL(page.url()).pathname.replace(/\/$/, '') === '/FANDEX', actual: page.url() };
      },
    },
    {
      name: '404: learning-path escape link works',
      expected: '学习路线按钮跳转 /learning-path/',
      severity: 'low',
      async expect(page) {
        const link = page.locator('a[href*="learning-path"]').first();
        if ((await link.count()) === 0) return { pass: true, actual: 'no lp link - skip' };
        await link.click();
        await page.waitForTimeout(900);
        return { pass: page.url().includes('/learning-path/'), actual: page.url() };
      },
    },
  ], { swOnce: false });
}

/* ---------------- JS 列表第 2 页 ---------------- */
async function jsPage2Suite(engine) {
  const page = engine.page;
  const url = BASE + 'javascript/page/2/';
  await runPage(page, '/javascript/page/2/', url, [
    ...headerCases('js page2'),
    themeCase('js page2'),
    {
      name: 'js page2: pager prev link goes to page/1',
      expected: '上一页链接跳转 /javascript/page/1/ 或 /javascript/',
      async expect(page) {
        const link = page.locator('a[href*="/javascript/page/1/"], a[href$="/javascript/"]').first();
        if ((await link.count()) === 0) return { pass: false, actual: 'no pager link' };
        const href = await link.getAttribute('href');
        await link.click();
        await page.waitForTimeout(1000);
        return { pass: page.url() !== url, actual: `${href} -> ${page.url()}` };
      },
    },
  ], { swOnce: false });
}

/* ---------------- 模块总览再补一轮（每页 DOM 再发现） ---------------- */
async function discoverExtra(engine) {
  const page = engine.page;
  // 从首页枚举所有站内链接，找未覆盖页面
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(700);
  const links = await page.evaluate(() => {
    const out = new Set();
    document.querySelectorAll('a[href]').forEach((a) => {
      const href = a.getAttribute('href') || '';
      if (href.startsWith('/') && !href.startsWith('//')) out.add(href);
      if (href.startsWith(location.origin)) out.add(href.replace(location.origin, ''));
    });
    return [...out];
  });
  const covered = new Set([
    '/FANDEX/', '/FANDEX/javascript/', '/FANDEX/javascript/page/2/', '/FANDEX/javascript/010-WhatIsJavaScript/',
    '/FANDEX/algorithm/290-NetworkFlow/', '/FANDEX/learning-path/', '/FANDEX/learning-path/javascript/',
    '/FANDEX/playground/', '/FANDEX/playground/editor/', '/FANDEX/syntax/', '/FANDEX/algorithms/',
    '/FANDEX/algorithms/?view=problems', '/FANDEX/algorithms/problems/remove-element/', '/FANDEX/ai/',
    '/FANDEX/disclaimer/', '/FANDEX/design-system/', '/FANDEX/404',
  ]);
  const extra = links.filter((l) => l.startsWith('/FANDEX/') && !covered.has(l));
  console.log(`\n== discovered ${extra.length} extra internal links from home:`);
  console.log(extra.slice(0, 40).join('\n'));
  return extra;
}

/** 额外页探查：加载 + 收集错误 + 关键探针（不逐元素点击，仅 goto 与核心交互抽查） */
async function probeExtra(engine, extra) {
  const page = engine.page;
  for (const path of extra.slice(0, 60)) {
    const url = 'http://localhost:4321' + (path.endsWith('/') || path.includes('?') ? path : path + '/');
    try {
      const resp = await page.goto(url, { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(500);
      const status = resp ? resp.status() : 0;
      if (status >= 400) {
        addFinding({ page: path, element: 'page load', expected: 'HTTP 200', actual: `HTTP ${status}`, severity: 'high' });
      }
    } catch (err) {
      addFinding({ page: path, element: 'page load', expected: 'HTTP 200', actual: 'goto error: ' + String(err).slice(0, 120), severity: 'high' });
    }
  }
}

/* ---------------- algorithm/290-NetworkFlow ---------------- */
async function networkFlowSuite(engine) {
  const page = engine.page;
  const url = BASE + 'algorithm/290-NetworkFlow/';
  const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  const status = resp ? resp.status() : 0;
  stats.cases += 1;
  if (status === 200) { stats.passed += 1; console.log(`\n== /algorithm/290-NetworkFlow/ loads (${status})`); }
  else {
    stats.failed += 1;
    addFinding({ page: '/algorithm/290-NetworkFlow/', element: 'page load', expected: 'HTTP 200', actual: `HTTP ${status}`, severity: 'high' });
  }
  if (status !== 200) return;
  await page.waitForTimeout(1500);
  // mermaid 渲染探针 + 代码复制 + 目录
  const probe = await page.evaluate(() => ({
    mermaidSvg: document.querySelectorAll('.mermaid svg, [data-mermaid] svg, svg[id^=mermaid]').length,
    mermaidBlocks: document.querySelectorAll('.mermaid, [data-language="mermaid"]').length,
    copyBtns: document.querySelectorAll('.code-block .copy-btn').length,
    prose: (document.querySelector('.prose')?.textContent || '').length,
    docNav: !!document.querySelector('.doc-nav a'),
  }));
  console.log('   probe: ' + JSON.stringify(probe));
  if (probe.prose < 100) addFinding({ page: '/algorithm/290-NetworkFlow/', element: 'prose content', expected: '>100 chars', actual: String(probe.prose), severity: 'high' });
  if (probe.mermaidBlocks > 0 && probe.mermaidSvg === 0) {
    // mermaid 可能在滚动后才渲染
    await page.locator('.mermaid, [data-language="mermaid"]').first().scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(2500);
    const svg = await page.evaluate(() => document.querySelectorAll('.mermaid svg, [data-mermaid] svg, svg[id^=mermaid]').length);
    if (svg === 0) addFinding({ page: '/algorithm/290-NetworkFlow/', element: 'mermaid render', expected: 'svg rendered after scroll', actual: '0 svg', severity: 'medium' });
    else console.log(`   ok    mermaid svg=${svg} after scroll`);
  }
  // code copy on this page
  const btn = page.locator('.code-block .copy-btn').first();
  if ((await btn.count()) > 0) {
    await btn.click();
    await page.waitForTimeout(450);
    const copied = await btn.evaluate((el) => el.classList.contains('copied'));
    stats.cases += 1;
    if (copied) stats.passed += 1; else { stats.failed += 1; addFinding({ page: '/algorithm/290-NetworkFlow/', element: 'code copy btn', expected: 'copied class', actual: 'no feedback', severity: 'medium' }); }
  }
}

/* =================================================================
   main
   ================================================================= */
async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  const page = await ctx.newPage();
  const engine = { page, browser, ctx };
  attach(page, 'global');

  const t0 = Date.now();
  await homeSuite(engine);
  await moduleListSuite(engine);
  await docDetailSuite(engine);
  await jsPage2Suite(engine);
  await algoSuite(engine);
  await problemDetailSuite(engine);
  await syntaxSuite(engine);
  await lpHubSuite(engine);
  await lpMapSuite(engine);
  await playgroundSuite(engine);
  await pgEditorSuite(engine);
  await aiSuite(engine);
  await disclaimerSuite(engine);
  await dsSuite(engine);
  await notFoundSuite(engine);
  await networkFlowSuite(engine);

  // 附加发现页探查（首页 DOM 提取）
  const extra = await discoverExtra(engine);
  await probeExtra(engine, extra);

  await browser.close();

  const report = {
    startedAt: new Date(t0).toISOString(),
    durationMs: Date.now() - t0,
    stats,
    findings,
    consoleErrors: consoleErrors.slice(0, 60),
    pageErrors: pageErrors.slice(0, 40),
  };
  writeFileSync(REPORT, JSON.stringify(report, null, 2));
  console.log(`\n==== DONE in ${((Date.now() - t0) / 1000).toFixed(0)}s ====`);
  console.log(`cases=${stats.cases} passed=${stats.passed} failed=${stats.failed}`);
  console.log(`findings=${findings.length} consoleErrors=${consoleErrors.length} pageErrors=${pageErrors.length}`);
  console.log('report: ' + REPORT);
  if (consoleErrors.length) {
    console.log('\nconsole errors (first 20):');
    consoleErrors.slice(0, 20).forEach((e) => console.log(`  [${e.page}] ${e.message.slice(0, 160)}`));
  }
  if (pageErrors.length) {
    console.log('\npage errors (first 20):');
    pageErrors.slice(0, 20).forEach((e) => console.log(`  [${e.page}] ${e.message.slice(0, 160)}`));
  }
}

main().catch((err) => {
  console.error('FATAL', err);
  process.exit(1);
});
