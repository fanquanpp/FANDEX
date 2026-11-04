/**
 * FANDEX web 终版抽检（dist preview）。
 *
 * 协议来源：.workflow-tmp/uiux-run-constraints.md 第 4 节
 *   - SW 全注销 + caches 全删 + reload
 *   - 逐页 goto（尾斜杠）-> 核对 URL -> DOM 探查 -> 截图
 *   - 明暗两套（localStorage fandex-theme -> data-theme）
 *   - 视口：桌面 1440x900；窄屏 375x1700
 *
 * 抽样页面 = 前几轮发现过问题的页面 + 首页 + 一个文档页。
 * 运行：node .workflow-tmp/qa-final.mjs
 */
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const { chromium } = createRequire('C:/Atian/Project/FANDEX/app-web/package.json')('playwright');
const ROOT = 'C:/Atian/Project/FANDEX';
const SHOTS_DIR = path.join(ROOT, '.workflow-tmp/shots/final');
const BASE = 'http://localhost:4321/FANDEX/';

/* 前几轮问题页 + 首页 + 文档页抽样 */
const PAGES = [
  { slug: '', label: 'home' },
  { slug: 'javascript/010-WhatIsJavaScript/', label: 'doc-010' },
  { slug: 'algorithm/290-NetworkFlow/', label: 'doc-nf' },
  { slug: 'playground/', label: 'playground' },
  { slug: 'playground/editor/', label: 'pg-editor' },
  { slug: 'syntax/', label: 'syntax' },
  { slug: 'algorithms/', label: 'algorithms' },
  { slug: 'algorithms/?view=problems', label: 'alg-problems' },
  { slug: 'learning-path/javascript/', label: 'lp-js' },
  { slug: 'ai/', label: 'ai' },
  { slug: 'disclaimer/', label: 'disclaimer' },
  { slug: 'design-system/', label: 'design-system' },
  { slug: '404.html', label: '404' },
];

const THEMES = ['light', 'dark'];
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'narrow', width: 375, height: 1700 },
];

mkdirSync(SHOTS_DIR, { recursive: true });

const findings = [];
const pageErrors = [];
const log = (...a) => console.log(...a);

function finding(page, theme, problem, severity) {
  findings.push({ page, theme, problem, severity });
  log(`  [FINDING ${severity}] ${theme} ${page} :: ${problem}`);
}

async function probe(page) {
  return await page.evaluate(() => {
    const cs = (el, prop) => (el ? getComputedStyle(el).getPropertyValue(prop).trim() : null);
    const backdrop = document.querySelector('.fx-backdrop');
    const glitchHost = document.querySelector('[data-fx="letter-glitch"]');
    const glitchCanvas = glitchHost ? glitchHost.querySelector('canvas') : null;
    const header = document.querySelector('[data-site-header]');
    const footer = document.querySelector('footer.fndx-footer, footer');
    return {
      finalUrl: location.href,
      theme: document.documentElement.getAttribute('data-theme'),
      bodyTextLen: (document.body.innerText || '').length,
      fx: {
        backdropPresent: !!backdrop,
        backdropPosition: cs(backdrop, 'position'),
        backdropZIndex: cs(backdrop, 'z-index'),
        glitchCanvasMounted: !!glitchCanvas,
        glitchCanvasW: glitchCanvas ? glitchCanvas.width : null,
        glitchCanvasH: glitchCanvas ? glitchCanvas.height : null,
      },
      nav: {
        headerPresent: !!header,
        footerPresent: !!footer,
      },
      swActive: navigator.serviceWorker?.controller ? true : false,
    };
  });
}

const browser = await chromium.launch({ headless: true, args: ['--disable-blink-features=AutomationControlled'] });
try {
  /* SW 清理：源 localhost:4321 */
  const prep = await browser.newContext();
  const prepPage = await prep.newPage();
  await prepPage.goto(BASE, { waitUntil: 'domcontentloaded' });
  const cleared = await prepPage.evaluate(async () => {
    const regs = (await navigator.serviceWorker?.getRegistrations?.()) || [];
    for (const r of regs) await r.unregister();
    const keys = (await caches?.keys?.()) || [];
    for (const k of keys) await caches.delete(k);
    return { sw: regs.length, caches: keys.length };
  });
  await prep.close();
  log(`[prep] SW 注销=${cleared.sw} caches 删除=${cleared.caches}`);

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  for (const { slug, label } of PAGES) {
    const urlStr = BASE + slug;
    for (const vp of VIEWPORTS) {
      for (const theme of THEMES) {
        const page = await ctx.newPage();
        const errs = [];
        page.on('pageerror', (e) => errs.push('pageerror: ' + e.message.slice(0, 200)));
        page.on('console', (m) => {
          if (m.type() === 'error') errs.push('console.error: ' + m.text().slice(0, 200));
        });
        try {
          await page.setViewportSize({ width: vp.width, height: vp.height });
          await page.goto(urlStr, { waitUntil: 'load', timeout: 60000 });
          await page.waitForTimeout(500);
          await page.evaluate((t) => {
            localStorage.setItem('fandex-theme', t);
            document.documentElement.setAttribute('data-theme', t);
            document.documentElement.style.colorScheme = t;
          }, theme);
          await page.reload({ waitUntil: 'load' });
          await page.waitForTimeout(800);
          const p = await probe(page);
          const shot = path.join(SHOTS_DIR, `${label}--${vp.name}-${theme}.png`);
          await page.screenshot({ path: shot });
          writeFileSync(path.join(SHOTS_DIR, `${label}--${vp.name}-${theme}.json`), JSON.stringify({ url: urlStr, theme, viewport: vp.name, probe: p, errors: errs }, null, 2));

          if (p.theme !== theme) finding(urlStr, theme, `data-theme 实际为 ${p.theme}`, 'medium');
          const isStandalone = ['ai/', 'disclaimer/', '404.html'].includes(slug);
          if (!isStandalone && p.fx.backdropZIndex !== '-1') {
            finding(urlStr, theme, `.fx-backdrop z-index=${p.fx.backdropZIndex}（应为 -1）`, 'high');
          }
          if (p.bodyTextLen < 50) finding(urlStr, theme, `正文文本过短（${p.bodyTextLen} 字符）`, 'high');
          for (const e of errs) {
            /* 页面本体 404 状态码属预期（/404.html 自身即错误页） */
            if (slug === '404.html' && e.includes('Failed to load resource') && e.includes('404')) continue;
            pageErrors.push({ page: urlStr, theme, viewport: vp.name, error: e });
          }
        } catch (e) {
          finding(urlStr, theme, `加载/探查失败: ${String(e).slice(0, 150)}`, 'high');
        }
        await page.close();
      }
    }
  }
  await ctx.close();
} finally {
  await browser.close();
}

writeFileSync(path.join(ROOT, '.workflow-tmp/qa-final-report.json'), JSON.stringify({ findings, pageErrors }, null, 2));
log(`\n[done] findings=${findings.length} pageErrors=${pageErrors.length}`);
log(`[done] shots=${SHOTS_DIR}`);
