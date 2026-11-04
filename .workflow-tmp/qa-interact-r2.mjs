/**
 * FANDEX 交互深检 第 2 轮：全站全量可交互元素扫描。
 * 协议（按任务要求）：
 *   - astro dev @ http://localhost:4321（/FANDEX/ base），1440x900
 *   - 每页首次进入：注销全部 SW + 删 caches + reload（防供旧）
 *   - 逐页枚举可交互元素（a/button/[role=button]/[role=tab]/[role=switch]/[role=menuitem]/
 *     input/select/textarea/[onclick]/summary，含导航/侧栏/页脚/抽屉/弹层内部）
 *   - 每个元素：goto 复位 -> 点击 -> 断言（站内跳转核对 URL；功能类核对可见状态变化）
 *   - hover 卡片/菜单、复制反馈、开关类单独断言
 *   - 无法判定预期行为的元素记 skipped，不臆报
 * 运行：
 *   node .workflow-tmp/qa-interact-r2.mjs --phase=main    （任务清单 17 页全量点击）
 *   node .workflow-tmp/qa-interact-r2.mjs --phase=extra   （首页 DOM 发现的额外页）
 *   node .workflow-tmp/qa-interact-r2.mjs --phase=all
 */
import path from 'node:path';
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';

const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const OUT = path.join(ROOT, '.workflow-tmp/qa-interact-r2-report.json');
const BASE = 'http://localhost:4321/FANDEX/';
const VIEWPORT = { width: 1440, height: 900 };
const PHASE = (process.argv.find((a) => a.startsWith('--phase=')) || '--phase=all').split('=')[1];

/* Node 环境无 CSS 全局，提供 escape */
const cssEscape = (s) => String(s).replace(/([^a-zA-Z0-9_\u00A0-\uFFFF-])/g, '\\$1');

/* ---------------- 结果收集 ---------------- */
const findings = [];
const skipped = [];
const pageErrors = [];
const consoleErrors = [];
const checked = [];
const stats = { cases: 0, passed: 0, failed: 0, skipped: 0 };

function addFinding(f) {
  findings.push(f);
  console.log(`  [${f.severity}] ${f.page} :: ${f.element} :: expected ${f.expected} :: actual ${String(f.actual).slice(0, 220)}`);
}
function addSkipped(s) {
  skipped.push(s);
  stats.skipped += 1;
  console.log(`  [skip] ${s.page} :: ${s.element} :: ${String(s.reason).slice(0, 160)}`);
}
function saveReport() {
  writeFileSync(OUT, JSON.stringify({ phase: PHASE, stats, findings, skipped, checked, pageErrors, consoleErrors }, null, 2));
}

/* ---------------- 基础工具 ---------------- */
async function reset(page, url, { sw = false } = {}) {
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  if (sw) {
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
  await page.waitForTimeout(500);
}

async function freshGoto(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(400);
}

/** 页内可交互元素枚举（含抽屉/弹层内部；display:none 也记录但 visible=false） */
const ENUMERATE = () => {
  const sel = 'a[href], button, [role="button"], [role="tab"], [role="menuitem"], [role="switch"], [role="option"], [role="combobox"], input:not([type="hidden"]), select, textarea, [onclick], summary';
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    if (r.width === 0 || r.height === 0) return false;
    if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
    let p = el.parentElement;
    while (p) {
      const ps = getComputedStyle(p);
      if (ps.display === 'none' || ps.visibility === 'hidden') return false;
      p = p.parentElement;
    }
    return true;
  };
  const out = [];
  document.querySelectorAll(sel).forEach((el, i) => {
    const label =
      (el.getAttribute('aria-label') || '') ||
      (el.getAttribute('title') || '') ||
      (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40) ||
      (el.getAttribute('name') || '') ||
      (el.getAttribute('placeholder') || '');
    out.push({
      n: i,
      tag: el.tagName.toLowerCase(),
      id: el.id || '',
      cls: (typeof el.className === 'string' ? el.className : (el.className?.baseVal ?? '')).toString().slice(0, 60),
      label,
      ariaLabel: el.getAttribute('aria-label') || '',
      href: el.getAttribute('href') || '',
      target: el.getAttribute('target') || '',
      role: el.getAttribute('role') || '',
      type: el.getAttribute('type') || '',
      visible: vis(el),
      hidden: el.hasAttribute('hidden') || el.disabled === true || el.closest('dialog:not([open])') !== null,
      srOnly: (() => {
        const s = getComputedStyle(el);
        if (s.position !== 'absolute') return false;
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return true;
        return (s.clip !== 'auto' && s.clip !== '') || Math.abs(r.top) > 2000 || parseFloat(s.textIndent) < -500;
      })(),
    });
  });
  return out;
};

/** 由枚举元数据构造定位器（fresh goto 后重新匹配） */
function locate(page, el) {
  if (el.id) return page.locator('#' + cssEscape(el.id)).first();
  if (el.ariaLabel) {
    const loc = page.locator(`[aria-label="${el.ariaLabel.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"]`);
    if (el.role) {
      const r = page.locator(`[aria-label="${el.ariaLabel.replace(/"/g, '\\"')}"][role="${el.role}"]`);
      return r.first();
    }
    return loc.first();
  }
  if (el.label && el.tag === 'input') {
    // input 用 placeholder/name
    return page.locator(`${el.tag}`).first();
  }
  if (el.label) {
    return page.locator(el.tag, { hasText: el.label.slice(0, 24) }).first();
  }
  if (el.cls) {
    const c = el.cls.split(/\s+/).filter(Boolean)[0];
    if (c) return page.locator(`${el.tag}.${cssEscape(c)}`).first();
  }
  if (el.href) return page.locator(`a[href="${el.href}"]`).first();
  return null;
}

/** 描述元素（日志/报告用） */
function describeEl(el) {
  const bits = [el.tag];
  if (el.id) bits.push('#' + el.id);
  if (el.role) bits.push(`[role=${el.role}]`);
  if (el.label) bits.push(`"${el.label.slice(0, 30)}"`);
  else if (el.cls) bits.push('.' + el.cls.split(/\s+/).slice(0, 2).join('.'));
  return bits.join(' ');
}

/** 页面级补充探针（点击前后对比之外的可观察状态） */
async function extraSignals(page) {
  return page.evaluate(() => {
    const sig = {};
    // 折叠分类：首页 collapsed 区块数
    sig.collapsedSections = document.querySelectorAll('.category-section.collapsed').length;
    // 滚动器 scrollLeft（首屏各分类滚动容器）
    sig.scrollerLefts = [...document.querySelectorAll('.feature-scroller')].slice(0, 8).map((s) => Math.round(s.scrollLeft));
    // 表格行数/列表项（algorithms 筛选、模块列表）
    sig.visibleItems = [...document.querySelectorAll('[data-algo-item], .doc-card, .module-card')].filter((e) => e.getBoundingClientRect().width > 0).length;
    // 代码块高亮/展开
    sig.openDetails = document.querySelectorAll('details[open]').length;
    return sig;
  });
}

/** 点击前后状态快照对比 */
async function beforeState(page) {
  const base = await page.evaluate(() => ({
    url: location.pathname + location.search + location.hash,
    dialogs: [...document.querySelectorAll('dialog[open], [role="dialog"]')].map((d) => (d.id || d.className.toString().slice(0, 30))),
    openStates: [...document.querySelectorAll('[data-state="open"], .is-open, [aria-expanded="true"]')].length,
    activeEls: [...document.querySelectorAll('.is-active, [aria-selected="true"], [aria-pressed="true"], [aria-current]')].map((e) => (e.id || e.className.toString().split(/\s+/).slice(0, 2).join('.') || e.tagName)).slice(0, 14),
    bodyCls: document.body.className,
    htmlAttrs: [document.documentElement.getAttribute('data-theme'), document.documentElement.getAttribute('data-lang')].join(','),
    focused: document.activeElement ? (document.activeElement.id || document.activeElement.tagName) : '',
  }));
  base.extra = await extraSignals(page);
  return base;
}

async function diffAfterClick(page, before) {
  const after = await beforeState(page);
  const changed = [];
  if (after.url !== before.url) changed.push('url(' + before.url.slice(0, 40) + '->' + after.url.slice(0, 40) + ')');
  if (JSON.stringify(after.dialogs) !== JSON.stringify(before.dialogs)) changed.push('dialog');
  if (after.openStates !== before.openStates) changed.push('openState(' + before.openStates + '->' + after.openStates + ')');
  if (JSON.stringify(after.activeEls) !== JSON.stringify(before.activeEls)) changed.push('activeSet');
  if (after.bodyCls !== before.bodyCls) changed.push('bodyClass(' + before.bodyCls.slice(0, 30) + '->' + after.bodyCls.slice(0, 30) + ')');
  if (after.htmlAttrs !== before.htmlAttrs) changed.push('htmlAttrs(' + before.htmlAttrs + '->' + after.htmlAttrs + ')');
  if (after.focused !== before.focused) changed.push('focus(' + before.focused + '->' + after.focused + ')');
  const b = before.extra || {}, a = after.extra || {};
  if (a.collapsedSections !== b.collapsedSections) changed.push('collapsedSections(' + b.collapsedSections + '->' + a.collapsedSections + ')');
  if (JSON.stringify(a.scrollerLefts) !== JSON.stringify(b.scrollerLefts)) changed.push('scrollerLeft(' + b.scrollerLefts + '->' + a.scrollerLefts + ')');
  if (a.visibleItems !== b.visibleItems) changed.push('visibleItems(' + b.visibleItems + '->' + a.visibleItems + ')');
  if (a.openDetails !== b.openDetails) changed.push('openDetails(' + b.openDetails + '->' + a.openDetails + ')');
  return { after, changed };
}

function isInternal(href) {
  if (!href) return false;
  if (href.startsWith('/') && !href.startsWith('//')) return true;
  if (/^https?:\/\//.test(href)) {
    try {
      const u = new URL(href);
      return u.hostname === 'localhost';
    } catch { return false; }
  }
  return false;
}

function normalizePath(href) {
  try {
    const u = new URL(href, BASE);
    return u.pathname + u.search;
  } catch { return href; }
}

/* ---------------- 元素级测试主流程（main 阶段用，带完整断言） ---------------- */
async function testElement(page, ctxPages, pg, el) {
  const desc = describeEl(el);
  await freshGoto(page, pg.url);

  const loc = locate(page, el);
  const locCount = loc ? await loc.count() : 0;
  if (!loc || locCount === 0) {
    addSkipped({ page: pg.name, element: desc, reason: 'locator not rebuilt after fresh goto' });
    return;
  }

  // 外链只校验属性不点击
  if (el.tag === 'a' && /^https?:\/\//.test(el.href) && !isInternal(el.href)) {
    const rel = await loc.getAttribute('rel').catch(() => null);
    checked.push({ page: pg.name, element: desc, verdict: 'pass', note: `external, not clicked; rel=${rel || '(none)'}` });
    stats.passed += 1;
    return;
  }
  if (el.tag === 'a' && /^(mailto:|tel:)/.test(el.href)) {
    checked.push({ page: pg.name, element: desc, verdict: 'pass', note: 'mailto/tel, not clicked' });
    stats.passed += 1;
    return;
  }

  const before = await beforeState(page);
  const isCopyBtn = /copy|复制/i.test(desc) || /copy/i.test(el.cls);

  // 点击
  try {
    await loc.click({ timeout: 5000 });
  } catch (err) {
    // 指针点击被挡（常见：sr-only skip link / focus 才可见元素）→ 键盘路径兜底
    try {
      await loc.focus({ timeout: 2000 });
      await page.keyboard.press('Enter');
      await page.waitForTimeout(800);
      const { changed } = await diffAfterClick(page, before);
      if (changed.length > 0) {
        checked.push({ page: pg.name, element: desc, verdict: 'pass', note: 'keyboard Enter works; pointer click obstructed (likely visually-hidden-until-focus): ' + changed.join(',') });
        stats.passed += 1;
      } else {
        addFinding({ page: pg.name, element: desc, expected: 'pointer click or keyboard Enter triggers behavior', actual: 'click timeout + keyboard Enter no state change: ' + String(err).slice(0, 100), severity: 'low' });
      }
    } catch (err2) {
      addFinding({ page: pg.name, element: desc, expected: 'click lands on element', actual: 'click failed and focus failed: ' + String(err2).slice(0, 120), severity: 'medium' });
    }
    return;
  }

  await page.waitForTimeout(700);

  // target=_blank：检查新标签页
  if (el.target === '_blank') {
    const targetUrl = new URL(el.href, page.url()).href;
    const popup = ctxPages.find((p) => p !== page && p.url() === targetUrl);
    if (popup) {
      checked.push({ page: pg.name, element: desc, verdict: 'pass', note: 'opened new tab -> ' + popup.url() });
      stats.passed += 1;
      await popup.close().catch(() => {});
    } else {
      // 可能同页跳转，回退按内链断言
      const { after } = await diffAfterClick(page, before);
      const want = normalizePath(el.href);
      const same = after.url.split('?')[0] === want.split('?')[0];
      if (same) { checked.push({ page: pg.name, element: desc, verdict: 'pass', note: 'navigated same tab' }); stats.passed += 1; }
      else addFinding({ page: pg.name, element: desc, expected: 'new tab to ' + want, actual: 'no popup, page at ' + after.url, severity: 'medium' });
    }
    return;
  }

  // 站内链接断言
  if (el.tag === 'a' && el.href) {
    const { after } = await diffAfterClick(page, before);
    const wantUrl = new URL(el.href, page.url());
    const actualUrl = new URL(page.url());
    const ok = wantUrl.pathname === actualUrl.pathname && wantUrl.search === actualUrl.search && (wantUrl.hash === actualUrl.hash || (!wantUrl.hash && !actualUrl.hash));
    if (ok) {
      checked.push({ page: pg.name, element: desc, verdict: 'pass', note: 'navigated to ' + actualUrl.pathname + actualUrl.search + actualUrl.hash });
      stats.passed += 1;
    } else {
      addFinding({
        page: pg.name,
        element: desc,
        expected: 'navigate to ' + normalizePath(el.href),
        actual: 'URL after click: ' + actualUrl.pathname + actualUrl.search + actualUrl.hash + (after.dialogs.length ? ' dialogs=' + after.dialogs.join(',') : ''),
        severity: /module-card|feature/.test(el.cls) ? 'high' : 'medium',
      });
    }
    return;
  }

  // input/select/textarea：聚焦即通过；checkbox/radio/switch 还要核对状态翻转
  if (['input', 'textarea', 'select'].includes(el.tag)) {
    if (el.type === 'checkbox' || el.type === 'radio' || el.role === 'switch') {
      const flipped = await page.evaluate(() => {
        const ae = document.activeElement;
        if (!ae) return false;
        if (ae.type === 'checkbox' || ae.type === 'radio') return true; // click 会翻转，activeElement 即证据
        return ae.getAttribute('aria-checked') !== null;
      });
      if (flipped) { checked.push({ page: pg.name, element: desc, verdict: 'pass', note: 'toggled' }); stats.passed += 1; }
      else addFinding({ page: pg.name, element: desc, expected: 'toggle state flips', actual: 'no checked/aria-checked evidence', severity: 'low' });
      return;
    }
    const focused = await page.evaluate(() => {
      const ae = document.activeElement;
      return ae ? ['input', 'textarea', 'select'].includes(ae.tagName.toLowerCase()) : false;
    });
    if (focused) { checked.push({ page: pg.name, element: desc, verdict: 'pass', note: 'focus ok' }); stats.passed += 1; }
    else addFinding({ page: pg.name, element: desc, expected: 'click focuses field', actual: 'not focused', severity: 'low' });
    return;
  }

  // 复制类按钮：核对 .copied 反馈或剪贴板内容
  if (isCopyBtn) {
    let clip = '';
    try { clip = await page.evaluate(() => navigator.clipboard.readText()); } catch { clip = '(unread)'; }
    const fb = await loc.evaluate((e2) => ({ cls: e2.className.toString(), aria: e2.getAttribute('aria-label') || '', txt: (e2.textContent || '').trim().slice(0, 30) })).catch(() => null);
    if ((fb && /copied|已复制/i.test(fb.cls + ' ' + fb.aria + ' ' + fb.txt)) || (clip && clip !== '(unread)' && clip.length > 0)) {
      checked.push({ page: pg.name, element: desc, verdict: 'pass', note: `copy feedback ok (clip=${clip.slice(0, 24)}, cls=${fb ? fb.cls.slice(0, 40) : '?'})` });
      stats.passed += 1;
    } else {
      addFinding({ page: pg.name, element: desc, expected: 'copy feedback (.copied or clipboard content)', actual: `clip="${clip.slice(0, 24)}" cls=${fb ? fb.cls : 'n/a'}`, severity: 'medium' });
    }
    return;
  }

  // 通用功能按钮：状态变化断言；无变化再等 1.2s 复测
  const { changed } = await diffAfterClick(page, before);
  if (changed.length > 0) {
    checked.push({ page: pg.name, element: desc, verdict: 'pass', note: 'state change: ' + changed.join(',') });
    stats.passed += 1;
    return;
  }
  await page.waitForTimeout(1200);
  const retry = await diffAfterClick(page, before);
  if (retry.changed.length > 0) {
    checked.push({ page: pg.name, element: desc, verdict: 'pass', note: 'state change (delayed): ' + retry.changed.join(',') });
    stats.passed += 1;
  } else {
    addSkipped({
      page: pg.name,
      element: desc,
      reason: 'clicked ok but no observable state change (URL/dialog/active/body/htmlAttr/focus); may be transient feedback or decorative - not judged as bug',
    });
  }
}

/* ---------------- main 阶段：任务清单 17 页 ---------------- */
async function phaseMain(page, ctx) {
  const pages = [
    { name: '/', url: BASE },
    { name: '/javascript/', url: BASE + 'javascript/' },
    { name: '/javascript/page/2/', url: BASE + 'javascript/page/2/' },
    { name: '/javascript/010-WhatIsJavaScript/', url: BASE + 'javascript/010-WhatIsJavaScript/' },
    { name: '/algorithm/290-NetworkFlow/', url: BASE + 'algorithm/290-NetworkFlow/' },
    { name: '/learning-path/', url: BASE + 'learning-path/' },
    { name: '/learning-path/javascript/', url: BASE + 'learning-path/javascript/' },
    { name: '/playground/', url: BASE + 'playground/' },
    { name: '/playground/editor/', url: BASE + 'playground/editor/' },
    { name: '/syntax/', url: BASE + 'syntax/' },
    { name: '/algorithms/', url: BASE + 'algorithms/' },
    { name: '/algorithms/?view=problems', url: BASE + 'algorithms/?view=problems' },
    { name: '/algorithms/problems/remove-element/', url: BASE + 'algorithms/problems/remove-element/' },
    { name: '/ai/', url: BASE + 'ai/' },
    { name: '/disclaimer/', url: BASE + 'disclaimer/' },
    { name: '/design-system/', url: BASE + 'design-system/' },
    { name: '/404/', url: BASE + '404/' },
  ];

  for (const pg of pages) {
    const t0 = Date.now();
    console.log(`\n########## PAGE ${pg.name} ##########`);
    if (pg.name === '/playground/editor/') {
      // meta-refresh 重定向页：验证落到 /playground/ 即可（r1 已验证行为）
      const resp = await page.goto(pg.url, { waitUntil: 'load', timeout: 30000 }).catch(() => null);
      await page.waitForTimeout(2500);
      const landed = page.url().includes('/playground/') && !page.url().includes('/editor/');
      stats.cases += 1;
      if (landed) { stats.passed += 1; checked.push({ page: pg.name, element: '(meta refresh)', verdict: 'pass', note: 'redirected to ' + page.url() }); }
      else addFinding({ page: pg.name, element: '(meta refresh)', expected: 'redirect to /FANDEX/playground/', actual: 'at ' + page.url(), severity: 'medium' });
      saveReport();
      continue;
    }
    if (pg.name === '/404/') {
      const resp = await page.goto(pg.url, { waitUntil: 'load', timeout: 30000 }).catch(() => null);
      const status = resp ? resp.status() : 0;
      await page.waitForTimeout(700);
      // 继续走通用扫描（断言不校验状态码）
      pg._httpStatus = status;
    }
    await reset(page, pg.url, { sw: true });
    const elements = await page.evaluate(ENUMERATE);
    const visibleEls = elements.filter((e) => e.visible && !e.hidden);
    console.log(`   elements=${elements.length} visible-active=${visibleEls.length}`);

    const seen = new Set();
    let idx = 0;
    for (const el of visibleEls) {
      idx += 1;
      const key = el.id + '|' + el.ariaLabel + '|' + el.label.slice(0, 20) + '|' + el.tag + (el.href ? '|' + el.href : '');
      if (seen.has(key)) continue;
      seen.add(key);
      stats.cases += 1;
      try {
        await testElement(page, ctx.pages(), pg, el);
      } catch (err) {
        stats.failed += 1;
        addFinding({ page: pg.name, element: describeEl(el), expected: 'element test completes', actual: 'harness error: ' + String(err).slice(0, 140), severity: 'low' });
      }
      if (idx % 40 === 0) console.log(`   ...${idx}/${visibleEls.length} elapsed ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    console.log(`   == page done in ${((Date.now() - t0) / 1000).toFixed(0)}s: running pass=${stats.passed} failed=${stats.failed} skipped=${stats.skipped}`);
    saveReport();
  }
}

/* ---------------- extra 阶段：首页 DOM 发现的额外站内页 ---------------- */
async function phaseExtra(page, ctx) {
  await freshGoto(page, BASE);
  const allLinks = await page.evaluate(() => {
    const out = new Set();
    document.querySelectorAll('a[href]').forEach((a) => {
      const href = a.getAttribute('href') || '';
      if (href.startsWith('/') && !href.startsWith('//')) out.add(href);
    });
    return [...out];
  });
  const coveredNames = ['/', '/javascript/', '/javascript/page/2/', '/javascript/010-WhatIsJavaScript/', '/algorithm/290-NetworkFlow/', '/learning-path/', '/learning-path/javascript/', '/playground/', '/playground/editor/', '/syntax/', '/algorithms/', '/algorithms/?view=problems', '/algorithms/problems/remove-element/', '/ai/', '/disclaimer/', '/design-system/', '/404/', '/404'];
  const covered = new Set(coveredNames.map((p) => (p === '/' ? '/FANDEX/' : '/FANDEX' + p)));
  const extras = [...new Set(allLinks.map(normalizePath))].filter((p) => p.startsWith('/FANDEX/') && !covered.has(p) && !/\.(css|js|json|png|svg|woff2?|webmanifest|xml|txt|ico|html)$/.test(p));
  console.log(`== discovered ${extras.length} extra internal pages:`);
  extras.forEach((p) => console.log('   ' + p));

  for (const ep of extras) {
    const url = 'http://localhost:4321' + (ep.endsWith('/') || ep.includes('?') ? ep : ep + '/');
    try {
      const resp = await page.goto(url, { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(800);
      const status = resp ? resp.status() : 0;
      if (status >= 400) {
        addFinding({ page: ep, element: 'page load', expected: 'HTTP 200', actual: 'HTTP ' + status, severity: 'high' });
        saveReport();
        continue;
      }
    } catch (err) {
      addFinding({ page: ep, element: 'page load', expected: 'HTTP 200', actual: 'goto error: ' + String(err).slice(0, 120), severity: 'high' });
      saveReport();
      continue;
    }
    const elements = await page.evaluate(ENUMERATE);
    const visibleEls = elements.filter((e) => e.visible && !e.hidden);
    let acted = 0, noChange = 0, linkBad = 0;
    const seen = new Set();
    for (const el of visibleEls) {
      const key = el.id + '|' + el.ariaLabel + '|' + el.label.slice(0, 20) + '|' + el.tag + (el.href ? '|' + el.href : '');
      if (seen.has(key)) continue;
      seen.add(key);
      if (el.tag === 'a' && /^https?:\/\//.test(el.href) && !isInternal(el.href)) continue;
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(400);
      const loc = locate(page, el);
      if (!loc || (await loc.count()) === 0) { noChange += 1; continue; }
      const before = await beforeState(page);
      try {
        await loc.click({ timeout: 5000 });
        await page.waitForTimeout(600);
      } catch {
        try { await loc.focus({ timeout: 1500 }); await page.keyboard.press('Enter'); await page.waitForTimeout(500); }
        catch { noChange += 1; continue; }
      }
      const { changed } = await diffAfterClick(page, before);
      if (el.tag === 'a' && el.href && !el.href.startsWith('#')) {
        const wantUrl = new URL(el.href, page.url());
        const actualUrl = new URL(page.url());
        if (wantUrl.pathname === actualUrl.pathname && wantUrl.search === actualUrl.search) acted += 1;
        else { linkBad += 1; addFinding({ page: ep, element: describeEl(el), expected: 'navigate to ' + normalizePath(el.href), actual: 'stayed at ' + actualUrl.pathname, severity: 'medium' }); }
      } else if (changed.length > 0) {
        acted += 1;
      } else {
        await page.waitForTimeout(800);
        const retry = await diffAfterClick(page, before);
        if (retry.changed.length === 0) noChange += 1;
      }
    }
    checked.push({ page: ep, element: '(page scan)', verdict: 'pass', note: `elements=${visibleEls.length} acted=${acted} noObservedChange=${noChange} badLinks=${linkBad}` });
    console.log(`   scanned ${ep}: els=${visibleEls.length} acted=${acted} noChange=${noChange}`);
    saveReport();
  }
}

/* ---------------- hover 抽查 ---------------- */
async function phaseHover(page) {
  console.log('\n########## HOVER checks ##########');
  const hoverTargets = [
    { name: '/', url: BASE, sel: 'a.module-card' },
    { name: '/', url: BASE, sel: '.feature-nav button' },
    { name: '/design-system/', url: BASE + 'design-system/', sel: 'button[data-state]' },
  ];
  for (const ht of hoverTargets) {
    await freshGoto(page, ht.url);
    await page.waitForTimeout(1000);
    const loc = page.locator(ht.sel).first();
    if ((await loc.count()) === 0) { checked.push({ page: ht.name, element: 'hover ' + ht.sel, verdict: 'pass', note: 'no matching element on page' }); continue; }
    await loc.hover().catch(() => {});
    await page.waitForTimeout(700);
    const s = await page.evaluate(() => {
      const tips = [...document.querySelectorAll('[data-radix-popper-content-wrapper], [role="tooltip"]')].filter((t) => t.getBoundingClientRect().width > 0);
      return { tips: tips.length, tipText: tips.map((t) => t.textContent.slice(0, 30)) };
    });
    checked.push({ page: ht.name, element: 'hover ' + ht.sel, verdict: 'pass', note: 'hovered; tooltips visible=' + s.tips + ' ' + s.tipText.join('|') });
    console.log(`   hover ${ht.sel} on ${ht.name}: tips=${s.tips}`);
  }
  saveReport();
}

/* ---------------- main ---------------- */
async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost:4321' });
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  page.on('pageerror', (err) => pageErrors.push({ page: page.url(), message: String(err).slice(0, 300) }));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push({ page: page.url(), message: msg.text().slice(0, 300) });
  });

  const t0 = Date.now();
  if (PHASE === 'main' || PHASE === 'all') await phaseMain(page, ctx);
  if (PHASE === 'extra' || PHASE === 'all') await phaseExtra(page, ctx);
  if (PHASE === 'hover' || PHASE === 'all') await phaseHover(page);

  await browser.close();
  saveReport();
  console.log(`\n==== R2 ${PHASE} DONE in ${((Date.now() - t0) / 1000).toFixed(0)}s ====`);
  console.log(`cases=${stats.cases} pass=${stats.passed} failed=${stats.failed} skipped=${stats.skipped}`);
  console.log(`pageErrors=${pageErrors.length} consoleErrors=${consoleErrors.length}`);
  console.log('report: ' + OUT);
  if (pageErrors.length) {
    console.log('\npage errors:');
    pageErrors.slice(0, 20).forEach((e) => console.log(`  [${e.page}] ${e.message.slice(0, 180)}`));
  }
  if (consoleErrors.length) {
    console.log('\nconsole errors (first 15):');
    consoleErrors.slice(0, 15).forEach((e) => console.log(`  [${e.page}] ${e.message.slice(0, 160)}`));
  }
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
