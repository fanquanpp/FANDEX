/**
 * 交互轮 1 第三批排查（r1c）：
 * - 404 返回首页链接（r1b 显示页面上没有指向 base 的链接？重新枚举）
 * - sidebar backdrop 点击关闭（375px，is-visible 检查 + 真实坐标点击）
 * - algo reset-all：不触发空态，直接用 cat 筛选 + 找 body 内 reset（reset 在空态外还有吗）
 * - pg editor tab / template menu：改用 evaluate 直接 click
 * - ds dialog：不用 has-text 进 evaluate
 * - mermaid：检查 dev 下 mermaid 容器实际渲染状态与控制台报错
 * 运行：node .workflow-tmp/qa-interact-r1c.mjs
 */
import path from 'node:path';
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';

const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const OUT = path.join(ROOT, '.workflow-tmp/qa-interact-r1c-report.json');
const BASE = 'http://localhost:4321/FANDEX/';

const results = [];
const pageErrors = [];

async function reset(page, url, wait = 800) {
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(wait);
}

async function check(name, fn) {
  try {
    const r = await fn();
    results.push({ name, ...r });
    console.log(`${r.verdict === 'pass' ? 'ok  ' : r.verdict === 'bug' ? 'BUG ' : 'SKIP'} ${name} :: ${String(r.actual).slice(0, 240)}`);
  } catch (err) {
    results.push({ name, verdict: 'error', actual: String(err).slice(0, 240) });
    console.log(`ERR ${name} :: ${String(err).slice(0, 200)}`);
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => pageErrors.push({ url: page.url(), message: String(e).slice(0, 300) }));

  /* 404 全链接枚举（含 rollout 后真实 DOM） */
  await check('404 all links enumerated', async () => {
    await reset(page, BASE + '404', 900);
    const links = await page.evaluate(() =>
      [...document.querySelectorAll('a')].map((a) => ({
        text: (a.textContent || '').trim().slice(0, 24),
        href: a.getAttribute('href'),
        cls: (a.className || '').slice(0, 50),
      })),
    );
    const home = links.find((l) => l.href === '/FANDEX/' || l.href === '/FANDEX');
    return { verdict: home ? 'pass' : 'bug', actual: JSON.stringify({ home, all: links }) };
  });

  /* backdrop 点击关闭（375px，验证 is-visible 与点击坐标） */
  await check('sidebar backdrop closes drawer (375px, real click)', async () => {
    await page.setViewportSize({ width: 375, height: 1700 });
    await reset(page, BASE + 'javascript/010-WhatIsJavaScript/', 1100);
    await page.locator('#mobile-sidebar-btn').click();
    await page.waitForTimeout(600);
    const st1 = await page.evaluate(() => {
      const bd = document.getElementById('sidebar-backdrop');
      const r = bd.getBoundingClientRect();
      return {
        visible: bd.classList.contains('is-visible'),
        opacity: getComputedStyle(bd).opacity,
        visibility: getComputedStyle(bd).visibility,
        rect: { x: r.x, y: r.y, w: r.width, h: r.height },
        pointerEvents: getComputedStyle(bd).pointerEvents,
      };
    });
    // 点页面左上（在 backdrop 覆盖内、sidebar 之外、且 header 之下）
    await page.mouse.click(360, 500);
    await page.waitForTimeout(600);
    const st2 = await page.evaluate(() => ({
      body: document.body.classList.contains('sidebar-open'),
      visible: document.getElementById('sidebar-backdrop')?.classList.contains('is-visible'),
    }));
    await page.setViewportSize({ width: 1440, height: 900 });
    const ok = st1.visible && st1.pointerEvents !== 'none' && !st2.body;
    return { verdict: ok ? 'pass' : 'bug', actual: JSON.stringify({ backdrop: st1, afterClick: st2 }) };
  });

  /* algo reset-all：cat 筛选后点重置（reset 按钮位于空态内，用 cat 使结果为空） */
  await check('algo reset-all via empty-inducing cat filter', async () => {
    await reset(page, BASE + 'algorithms/?view=problems', 900);
    // 找一个筛选后必为空的 cat：把 status=solved（无标记时全部隐藏 -> 空态出现）
    const statusSolved = page.locator('[data-filter-status="solved"]');
    await statusSolved.click();
    await page.waitForTimeout(700);
    const emptyShown = await page.evaluate(() => !document.querySelector('[data-ap-empty]')?.hidden);
    const resetVisible = await page.locator('[data-ap-reset]').evaluate((el) => el.getBoundingClientRect().width > 0);
    if (!emptyShown || !resetVisible) {
      return { verdict: 'skip', actual: JSON.stringify({ emptyShown, resetVisible }) };
    }
    await page.locator('[data-ap-reset]').click();
    await page.waitForTimeout(700);
    const s = await page.evaluate(() => ({
      url: location.search,
      shown: [...document.querySelectorAll('[data-algo-item]')].filter((el) => !el.hidden).length,
      total: document.querySelectorAll('[data-algo-item]').length,
      solvedActive: document.querySelector('[data-filter-status="solved"]')?.classList.contains('is-active') || false,
      allActive: document.querySelector('[data-filter-status="all"]')?.classList.contains('is-active') || false,
    }));
    const ok = !s.url.includes('status=solved') && s.shown === s.total && !s.solvedActive && s.allActive;
    return { verdict: ok ? 'pass' : 'bug', actual: JSON.stringify(s) };
  });

  /* pg editor tab：直接 DOM click */
  await check('pg editor tab toggles pane (dom click)', async () => {
    await reset(page, BASE + 'playground/', 2200);
    const r = await page.evaluate(() => {
      const tabs = [...document.querySelectorAll('.pg-editor-tab')];
      if (tabs.length < 2) return { error: 'tabs<2: ' + tabs.length };
      const tab = tabs[1];
      const read = () => ({
        pressed: tab.getAttribute('aria-pressed'),
        panes: document.querySelectorAll('.pg-pane').length,
        paneKeys: [...document.querySelectorAll('.pg-pane')].map((p) => p.querySelector('.pg-pane-title')?.textContent),
      });
      const before = read();
      tab.click();
      return { before };
    });
    await page.waitForTimeout(700);
    const after = await page.evaluate(() => ({
      pressed: document.querySelectorAll('.pg-editor-tab')[1]?.getAttribute('aria-pressed'),
      panes: document.querySelectorAll('.pg-pane').length,
      paneKeys: [...document.querySelectorAll('.pg-pane')].map((p) => p.querySelector('.pg-pane-title')?.textContent),
    }));
    if (r.error) return { verdict: 'bug', actual: r.error };
    // 复原
    await page.evaluate(() => document.querySelectorAll('.pg-editor-tab')[1]?.click());
    const changed = r.before.pressed !== after.pressed || r.before.panes !== after.panes;
    return { verdict: changed ? 'pass' : 'bug', actual: `${JSON.stringify(r.before)} -> ${JSON.stringify(after)}` };
  });

  /* pg template menu：DOM click + menu item */
  await check('pg template menu creates draft (dom click)', async () => {
    await reset(page, BASE + 'playground/', 2200);
    const before = await page.evaluate(() => document.querySelector('.pg-title-input')?.value || '');
    const opened = await page.evaluate(() => {
      const btn = document.querySelector('.pg-new-wrap > button');
      if (!btn) return { error: 'no new btn' };
      btn.click();
      return { ok: true };
    });
    await page.waitForTimeout(500);
    if (opened.error) return { verdict: 'bug', actual: opened.error };
    const items = await page.evaluate(() => document.querySelectorAll('.pg-menu .pg-menu-item').length);
    if (items === 0) return { verdict: 'bug', actual: 'menu did not open' };
    await page.evaluate(() => document.querySelector('.pg-menu .pg-menu-item')?.click());
    await page.waitForTimeout(1100);
    const after = await page.evaluate(() => document.querySelector('.pg-title-input')?.value || '');
    return { verdict: after !== before ? 'pass' : 'bug', actual: `items=${items} title "${before}" -> "${after}"` };
  });

  /* ds dialog：修正 evaluate 选择器 */
  await check('ds dialog opens/closes', async () => {
    await reset(page, BASE + 'design-system/', 1500);
    const trigger = page.locator('button', { hasText: '打开对话框' }).first();
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();
    await page.waitForTimeout(800);
    const s = await page.evaluate(() => {
      const dlg = document.querySelector('[role="dialog"]');
      return {
        dlgPresent: !!dlg,
        dlgText: dlg?.textContent?.slice(0, 40) || '',
        title: dlg?.querySelector('h2, [class*="title"]')?.textContent?.slice(0, 20) || '',
      };
    });
    const cancel = page.locator('button', { hasText: '取消' }).first();
    await cancel.click();
    await page.waitForTimeout(700);
    const closed = await page.evaluate(() => !document.querySelector('[role="dialog"]'));
    return { verdict: s.dlgPresent && closed ? 'pass' : 'bug', actual: JSON.stringify({ ...s, closed }) };
  });

  /* mermaid dev 渲染：读取容器内部与全局报错 */
  await check('mermaid blocks state on NetworkFlow (dev)', async () => {
    await reset(page, BASE + 'algorithm/290-NetworkFlow/', 2500);
    const s = await page.evaluate(() => {
      const blocks = [...document.querySelectorAll('.mermaid, [data-language="mermaid"], pre[data-language="mermaid"]')];
      return {
        count: blocks.length,
        samples: blocks.slice(0, 5).map((b) => ({
          tag: b.tagName,
          cls: (b.className || '').toString().slice(0, 50),
          childTags: [...b.children].map((c) => c.tagName).join(','),
          textSample: (b.textContent || '').trim().slice(0, 40),
          dataProcessed: b.getAttribute('data-processed'),
        })),
        windowMermaid: typeof window.mermaid,
        easypaisa: 0,
      };
    });
    // 滚动到底再回来
    await page.evaluate(() => new Promise((res) => {
      const main = document.getElementById('app-main') || document.scrollingElement;
      let y = 0;
      const step = () => {
        y += 900; main.scrollTo(0, y);
        if (y < main.scrollHeight) setTimeout(step, 180); else { main.scrollTo(0, 0); setTimeout(res, 800); }
      };
      step();
    }));
    await page.waitForTimeout(2000);
    const s2 = await page.evaluate(() => ({
      svgs: document.querySelectorAll('.mermaid svg, [data-mermaid] svg').length,
      proseSvg: document.querySelectorAll('.prose svg').length,
      dataProcessed: [...document.querySelectorAll('[data-language="mermaid"], .mermaid')].slice(0, 5).map((b) => b.getAttribute('data-processed')),
    }));
    return { verdict: s2.svgs > 0 ? 'pass' : 'inconclusive', actual: JSON.stringify({ initial: s, afterScroll: s2, pageErrors: pageErrors.slice(-4) }).slice(0, 500) };
  });

  /* 404 trailing slash：/404/ vs /404 */
  await check('404 with trailing slash', async () => {
    const resp = await page.goto(BASE + '404/', { waitUntil: 'domcontentloaded' });
    const status = resp ? resp.status() : 0;
    const links = await page.evaluate(() => [...document.querySelectorAll('a')].map((a) => ({ t: (a.textContent || '').trim().slice(0, 16), h: a.getAttribute('href') })));
    return { verdict: status === 404 || status === 200 ? 'pass' : 'bug', actual: `status=${status} links=${JSON.stringify(links).slice(0, 220)}` };
  });

  await browser.close();
  writeFileSync(OUT, JSON.stringify({ results, pageErrors }, null, 2));
  console.log(`\n==== r1c done: ${results.filter((r) => r.verdict === 'pass').length} pass, ${results.filter((r) => r.verdict === 'bug').length} bug ====`);
  if (pageErrors.length) console.log('pageErrors:', JSON.stringify(pageErrors.slice(0, 6), null, 1));
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
