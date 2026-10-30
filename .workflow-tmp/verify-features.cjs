/* features 域视检（规格 8.6 + 通用前置）：明暗双套 DOM 探针 + 截图留档
   运行：node .workflow-tmp/verify-features.cjs （需 dev 服务器 4321 已起） */
const { chromium } = require('C:/Atian/Project/FANDEX/app-web/node_modules/playwright');
const path = require('path');

const ROOT = 'http://localhost:4321/FANDEX';
const SHOTS = path.join(__dirname, 'shots');
const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -- ' + detail : ''}`);
};

async function freshPage(ctx) {
  const page = await ctx.newPage();
  return page;
}

async function clearSw(page) {
  // SW 供旧清除协议（constraints 4:52）：unregister 全部 + caches 全删 + reload
  await page.evaluate(async () => {
    if (navigator.serviceWorker) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  });
}

(async () => {
  const browser = await chromium.launch();
  for (const theme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await freshPage(ctx);

    // ---- algorithms 教程视图（SSR 默认） ----
    await page.goto(`${ROOT}/algorithms/`, { waitUntil: 'networkidle' });
    await page.evaluate((t) => { document.documentElement.setAttribute('data-theme', t); }, theme);
    await clearSw(page);
    await page.reload({ waitUntil: 'networkidle' });
    await page.evaluate((t) => {
      document.documentElement.setAttribute('data-theme', t);
      localStorage.setItem('fandex-theme', t);
    }, theme);
    await page.waitForTimeout(300);

    const fxZ = await page.evaluate(() => {
      const el = document.querySelector('.fx-backdrop');
      return el ? getComputedStyle(el).zIndex : 'missing';
    });
    ok(`[${theme}] fx-backdrop z-index = -1`, fxZ === '-1', String(fxZ));

    const viewsZ = await page.evaluate(() => {
      const el = document.querySelector('.algo-views');
      return el ? getComputedStyle(el).zIndex : 'missing';
    });
    ok(`[${theme}] .algo-views sticky z-index = 10 (--z-sticky)`, viewsZ === '10', String(viewsZ));

    const tutorialsVisible = await page.evaluate(() => {
      const t = document.querySelector('[data-algo-view="tutorials"]');
      const p = document.querySelector('[data-algo-view="problems"]');
      return { t: !t.hidden, p: p.hidden };
    });
    ok(
      `[${theme}] SSR 默认教程视图：tutorials 可见 / problems 隐藏`,
      tutorialsVisible.t && tutorialsVisible.p,
      JSON.stringify(tutorialsVisible),
    );

    // 选中段反色墨水探针
    const activeInk = await page.evaluate(() => {
      const el = document.querySelector('.algo-views__tab.is-active');
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { bg: cs.backgroundColor, color: cs.color, bgVar: cs.getPropertyValue('background') };
    });
    ok(
      `[${theme}] 教程 tab 选中态 = 反色墨水`,
      !!activeInk && activeInk.bg !== 'rgba(0, 0, 0, 0)',
      JSON.stringify(activeInk),
    );

    // ---- 切换到题图鉴视图（客户端切换 + URL 同步） ----
    await page.click('[data-view-tab="problems"]');
    await page.waitForTimeout(250);
    const afterSwitch = await page.evaluate(() => {
      const t = document.querySelector('[data-algo-view="tutorials"]');
      const p = document.querySelector('[data-algo-view="problems"]');
      const active = document.querySelector('.algo-views__tab.is-active');
      const cs = active ? getComputedStyle(active) : null;
      return {
        url: location.search,
        tHidden: t.hidden,
        pHidden: p.hidden,
        activeTab: active?.dataset.viewTab,
        activeBg: cs?.backgroundColor,
        activeColor: cs?.color,
      };
    });
    ok(
      `[${theme}] 切换后：problems 可见 / tutorials 隐藏 / URL 带 ?view=problems`,
      afterSwitch.pHidden === false && afterSwitch.tHidden === true && afterSwitch.url.includes('view=problems'),
      JSON.stringify(afterSwitch),
    );
    await page.screenshot({ path: path.join(SHOTS, `features-algo-problems-${theme}.png`) });

    // ---- ?view=problems 直达 ----
    await page.goto(`${ROOT}/algorithms/?view=problems`, { waitUntil: 'networkidle' });
    await page.evaluate((t) => { document.documentElement.setAttribute('data-theme', t); }, theme);
    await page.waitForTimeout(400);
    const deepLink = await page.evaluate(() => {
      const t = document.querySelector('[data-algo-view="tutorials"]');
      const p = document.querySelector('[data-algo-view="problems"]');
      return { tHidden: t.hidden, pHidden: p.hidden };
    });
    ok(
      `[${theme}] ?view=problems 直达：problems 可见`,
      deepLink.pHidden === false && deepLink.tHidden === true,
      JSON.stringify(deepLink),
    );

    // ---- 题目详情页：measure 帽 + 排版 ----
    await page.goto(`${ROOT}/algorithms/problems/remove-element/`, { waitUntil: 'networkidle' });
    await page.evaluate((t) => { document.documentElement.setAttribute('data-theme', t); }, theme);
    await page.waitForTimeout(300);
    const measure = await page.evaluate(() => {
      const p = document.querySelector('.apd-statement p');
      const li = document.querySelector('.apd-idea li');
      const apd = document.querySelector('.apd');
      const px = (v) => (v && v.endsWith('px') ? parseFloat(v) : NaN);
      const pMax = px(p ? getComputedStyle(p).maxWidth : '');
      const liMax = px(li ? getComputedStyle(li).maxWidth : '');
      const apdMax = px(apd ? getComputedStyle(apd).maxWidth : '');
      return { pMax, liMax, apdMax, drift: pMax && liMax ? Math.abs(pMax - liMax) / pMax : NaN };
    });
    ok(
      `[${theme}] 题面/思路帽宽 = 68ch 解析值（同带全角字数，互差 <= 5%，帽 < 容器）`,
      Number.isFinite(measure.pMax) &&
        Number.isFinite(measure.liMax) &&
        measure.pMax > 480 &&
        measure.pMax < 620 &&
        measure.drift <= 0.05 &&
        measure.pMax < measure.apdMax,
      JSON.stringify(measure),
    );
    await page.screenshot({ path: path.join(SHOTS, `features-problem-${theme}.png`) });

    // ---- syntax 岛：吸顶工具栏 + 模态层级 ----
    await page.goto(`${ROOT}/syntax/`, { waitUntil: 'networkidle' });
    await page.evaluate((t) => { document.documentElement.setAttribute('data-theme', t); }, theme);
    await page.waitForTimeout(600);
    const langsZ = await page.evaluate(() => {
      const el = document.querySelector('.syntax-langs');
      return el ? getComputedStyle(el).zIndex : 'missing';
    });
    ok(`[${theme}] .syntax-langs sticky z-index = 10`, langsZ === '10', String(langsZ));

    // 等待 island 水合 + 数据加载（client:visible，需滚动触发）
    await page.evaluate(() => {
      document.querySelector('.syntax-explorer')?.scrollIntoView({ block: 'center' });
    });
    await page.waitForSelector('.syntax-card', { timeout: 15000 });
    const cardCount = await page.locator('.syntax-card').count();
    ok(`[${theme}] syntax 卡片网格已渲染`, cardCount > 0, `count=${cardCount}`);

    await page.click('.syntax-card >> nth=0');
    await page.waitForTimeout(400);
    const panelZ = await page.evaluate(() => {
      const overlay = document.querySelector('.syntax-panel-overlay');
      const panel = document.querySelector('.syntax-panel');
      return {
        overlay: overlay ? getComputedStyle(overlay).zIndex : 'missing',
        panel: panel ? getComputedStyle(panel).zIndex : 'missing',
        overlayVisible: overlay ? getComputedStyle(overlay).display !== 'none' : false,
      };
    });
    ok(
      `[${theme}] syntax 模态层级：遮罩 200 / 面板 201（全局 --z-modal 刻度）`,
      panelZ.overlay === '200' && panelZ.panel === '201',
      JSON.stringify(panelZ),
    );
    await page.screenshot({ path: path.join(SHOTS, `features-syntax-panel-${theme}.png`) });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Esc 关闭后主滚动容器 class 清理（island 清理逻辑回归）
    const mainClean = await page.evaluate(() => {
      const main = document.querySelector('.home-main');
      return main ? !main.classList.contains('syntax-panel-open') : 'no-main';
    });
    ok(`[${theme}] Esc 关闭后 syntax-panel-open 清理`, mainClean === true, String(mainClean));

    await ctx.close();
  }

  // ---- 恰 768px：algorithms 视图 tab 移动档（767.98px 归一后 768 整数走桌面档） ----
  const ctx768 = await browser.newContext({ viewport: { width: 768, height: 1024 } });
  const page768 = await ctx768.newPage();
  await page768.goto(`${ROOT}/algorithms/`, { waitUntil: 'networkidle' });
  await page768.waitForTimeout(400);
  const at768 = await page768.evaluate(() => {
    const views = document.querySelector('.algo-views');
    const cs = views ? getComputedStyle(views) : null;
    return {
      display: cs?.display,
      width: cs?.width,
      hasHScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  ok(
    '[768] 恰 768px：.algo-views 桌面档 inline-flex（不被 767.98 规则命中）且无横向溢出',
    at768.display === 'inline-flex' && !at768.hasHScroll,
    JSON.stringify(at768),
  );
  await ctx768.close();

  await browser.close();
  const fails = results.filter((r) => !r.pass);
  console.log(`\n==== ${results.length - fails.length}/${results.length} passed ====`);
  process.exit(fails.length ? 1 : 0);
})();
