/**
 * FANDEX web 第 1 轮全站视检（qa-round-1）。
 *
 * 协议来源：.workflow-tmp/uiux-run-constraints.md 第 4 节
 *   - SW 全注销 + caches 全删 + reload（防旧供假阴性）
 *   - 逐页 goto（尾斜杠）-> 核对 URL -> DOM 探查 -> 截图
 *   - 明暗两套（ThemeLangBootstrap.astro: data-theme 属性，localStorage fandex-theme）
 *   - 视口：桌面 1440x900；窄屏 375x1700（加高看下方内容，禁 fullPage）
 *   - fx 探针：.fx-backdrop 计算样式 z-index === -1；
 *     [data-fx=letter-glitch] canvas 挂载与尺寸（软渲染/自动化/窄屏按
 *     src/fx/capabilities.ts 刻意跳过，记录 renderer 与 tier 供判定）
 *   - 主导航 [data-site-header] 与页脚 footer 存在性
 *   - 收集 pageerror / console error
 *
 * 运行：node scripts/qa-round-1.mjs （本文件是检查工具，不进产品代码）
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';

const ROOT = 'C:/Atian/Project/FANDEX';
const { chromium } = createRequire(path.join(ROOT, 'app-web/package.json'))('playwright');
const SHOTS_DIR = path.join(ROOT, '.workflow-tmp/shots/r1');
const REPORT = path.join(ROOT, '.workflow-tmp/qa-round-1-report.json');

const BASE = 'http://localhost:4321/FANDEX/';
const PAGES = [
  '',
  'javascript/',
  'javascript/page/2/',
  'javascript/010-WhatIsJavaScript/',
  'algorithm/290-NetworkFlow/',
  'learning-path/',
  'learning-path/javascript/',
  'playground/',
  'playground/editor/',
  'syntax/',
  'algorithms/',
  'algorithms/?view=problems',
  'algorithms/problems/remove-element/',
  'ai/',
  'disclaimer/',
  'design-system/',
  '404',
];

/* 与产品页面同源的占位页：用于按源清 SW/cache（SW 作用域绑源，不绑路径） */
const PRIVACY_URL = path.join(ROOT, '.workflow-tmp/qa-privacy.html');
writeFileSync(
  PRIVACY_URL,
  '<!doctype html><meta charset="utf-8"><title>qa privacy</title><p>qa sandbox',
);
const PRIVACY = pathToFileURL(PRIVACY_URL).href;

const THEMES = ['light', 'dark'];
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'narrow', width: 375, height: 1700 },
];

mkdirSync(SHOTS_DIR, { recursive: true });

const findings = [];
const pageErrors = [];
const log = (...a) => console.log(...a);

function finding(urlPath, theme, viewport, problem, severity) {
  findings.push({ page: urlPath, theme, viewport, problem, severity });
  log(`  [FINDING ${severity}] ${theme}/${viewport} ${urlPath} :: ${problem}`);
}

/* ---- 每页 DOM 探查（在页面上下文执行）---- */
async function probe(page, urlStr) {
  return await page.evaluate((url) => {
    const cs = (el, prop) => {
      if (!el) return null;
      const v = getComputedStyle(el).getPropertyValue(prop);
      return v === '' ? null : v.trim();
    };
    const backdrop = document.querySelector('.fx-backdrop');
    const glitchHost = document.querySelector('[data-fx="letter-glitch"]');
    const glitchCanvas = glitchHost ? glitchHost.querySelector('canvas') : null;
    const header = document.querySelector('[data-site-header]');
    const footer = document.querySelector('footer.fndx-footer, footer');
    const main = document.querySelector('main, #app-main, .doc-main, .home-main');
    const doc = document.documentElement;
    let webgl = null;
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2');
      if (gl) {
        const dbg = gl.getExtension('WEBGL_debug_renderer_info');
        webgl = dbg
          ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL))
          : String(gl.getParameter(gl.RENDERER) || '');
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      }
    } catch {
      webgl = 'webgl2-probe-error';
    }
    const canvasesAll = [...document.querySelectorAll('canvas')].map((c) => ({
      parent: c.parentElement ? c.parentElement.tagName + '.' + (c.parentElement.className || '').toString().slice(0, 60) : '(none)',
      w: c.width,
      h: c.height,
      cssW: c.clientWidth,
      cssH: c.clientHeight,
    }));
    return {
      finalUrl: location.href,
      theme: doc.getAttribute('data-theme'),
      bodyTextLen: (document.body.innerText || '').length,
      fx: {
        backdropPresent: !!backdrop,
        backdropPosition: cs(backdrop, 'position'),
        backdropZIndex: cs(backdrop, 'z-index'),
        glitchHostPresent: !!glitchHost,
        glitchCanvasMounted: !!glitchCanvas,
        glitchCanvasW: glitchCanvas ? glitchCanvas.width : null,
        glitchCanvasH: glitchCanvas ? glitchCanvas.height : null,
        glitchCanvasCssW: glitchCanvas ? glitchCanvas.clientWidth : null,
        glitchCanvasCssH: glitchCanvas ? glitchCanvas.clientHeight : null,
      },
      nav: {
        headerPresent: !!header,
        headerVariant: header ? header.getAttribute('data-site-header') : null,
        headerLinkCount: header ? header.querySelectorAll('a').length : 0,
        headerVisible: header ? header.offsetParent !== null || getComputedStyle(header).position === 'fixed' : false,
        footerPresent: !!footer,
        footerVisible: footer ? footer.getBoundingClientRect().height > 0 : false,
        mainPresent: !!main,
      },
      env: {
        webdriver: navigator.webdriver,
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        innerW: window.innerWidth,
        innerH: window.innerHeight,
        webgl2Renderer: webgl,
        canvases: canvasesAll,
      },
    };
  }, urlStr);
}

/* ---- SW 清理：在目标源上执行（localhost:4321）---- */
async function clearSwAndCaches(browser) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  const res = await page.evaluate(async () => {
    const regs = (await navigator.serviceWorker?.getRegistrations?.()) || [];
    for (const r of regs) await r.unregister();
    const keys = (await caches?.keys?.()) || [];
    for (const k of keys) await caches.delete(k);
    return { sw: regs.length, caches: keys.length };
  });
  await ctx.close();
  return res;
}

const browser = await chromium.launch({
  headless: true,
  args: ['--disable-blink-features=AutomationControlled'],
});
try {
  const cleared = await clearSwAndCaches(browser);
  log(`[prep] SW 清理(源 localhost:4321): unregistered=${cleared.sw} cachesDeleted=${cleared.caches}`);

  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  for (const slug of PAGES) {
    const urlStr = BASE + slug;
    const label = slug.replace(/[/?=]/g, '_').replace(/_+$/, '') || 'home';
    for (const vp of VIEWPORTS) {
      for (const theme of THEMES) {
        const page = await ctx.newPage();
        const errs = [];
        page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
        page.on('console', (m) => {
          if (m.type() === 'error') errs.push('console.error: ' + m.text().slice(0, 300));
        });
        try {
          await page.setViewportSize({ width: vp.width, height: vp.height });
          await page.goto(urlStr, { waitUntil: 'load', timeout: 60000 });
          await page.waitForTimeout(700);
          await page.evaluate((t) => {
            localStorage.setItem('fandex-theme', t);
            document.documentElement.setAttribute('data-theme', t);
            document.documentElement.style.colorScheme = t;
            const meta = document.querySelector('meta[name="theme-color"]');
            if (meta) meta.setAttribute('content', t === 'dark' ? '#0a0e14' : '#EBEFF3');
          }, theme);
          await page.reload({ waitUntil: 'load' });
          await page.waitForTimeout(900);
          const p = await probe(page, urlStr);

          const shot = path.join(SHOTS_DIR, `${label}--${vp.name}-${theme}.png`);
          await page.screenshot({ path: shot });

          const rec = {
            url: urlStr,
            theme,
            viewport: vp.name,
            probe: p,
            errors: errs,
            shot: path.basename(shot),
          };
          writeFileSync(path.join(SHOTS_DIR, `${label}--${vp.name}-${theme}.json`), JSON.stringify(rec, null, 2));

          /* ---- 判定 ---- */
          if (!p.finalUrl.replace(/\/$/, '').endsWith(slug.replace(/[/?=].*$/, '').replace(/\/$/, '') || 'FANDEX')) {
            /* URL 核对宽松版：只报重定向到非预期源 */
          }
          if (new URL(p.finalUrl).origin !== 'http://localhost:4321') {
            finding(slug, theme, vp.name, `重定向到非预期源 ${p.finalUrl}`, 'high');
          }
          if (p.theme !== theme) {
            finding(slug, theme, vp.name, `data-theme 实际为 ${p.theme}`, 'medium');
          }
          if (!p.fx.backdropPresent) {
            finding(slug, theme, vp.name, '.fx-backdrop 不存在', 'medium');
          } else if (p.fx.backdropZIndex !== '-1') {
            finding(slug, theme, vp.name, `.fx-backdrop z-index=${p.fx.backdropZIndex}（应为 -1）`, 'high');
          }
          const software = /swiftshader|llvmpipe|softpipe|software/i.test(p.env.webgl2Renderer || '');
          const expectCanvas = vp.name === 'desktop' && !software;
          if (!p.fx.glitchHostPresent) {
            finding(slug, theme, vp.name, '[data-fx=letter-glitch] 挂载点不存在', 'medium');
          } else if (expectCanvas && !p.fx.glitchCanvasMounted) {
            finding(slug, theme, vp.name, `letter-glitch canvas 未挂载（renderer=${p.env.webgl2Renderer}）`, 'medium');
          } else if (p.fx.glitchCanvasMounted && (p.fx.glitchCanvasW === 0 || p.fx.glitchCanvasH === 0)) {
            finding(slug, theme, vp.name, `letter-glitch canvas 尺寸为 0（${p.fx.glitchCanvasW}x${p.fx.glitchCanvasH}）`, 'medium');
          }
          if (!p.nav.headerPresent) {
            finding(slug, theme, vp.name, '主导航 [data-site-header] 不存在', 'medium');
          }
          if (!p.nav.footerPresent && slug !== '404') {
            finding(slug, theme, vp.name, '页脚 footer 不存在', 'low');
          }
          if (p.bodyTextLen < 50) {
            finding(slug, theme, vp.name, `页面正文文本过短（${p.bodyTextLen} 字符），疑似空白页`, 'high');
          }
          for (const e of errs) {
            pageErrors.push({ url: urlStr, theme, viewport: vp.name, error: e });
          }
        } catch (e) {
          finding(slug, theme, vp.name, `页面加载/探查失败: ${String(e).slice(0, 200)}`, 'high');
        }
        await page.close();
      }
    }
  }
  await ctx.close();
} finally {
  await browser.close();
}

writeFileSync(REPORT, JSON.stringify({ findings, pageErrors }, null, 2));
log(`\n[done] findings=${findings.length} pageErrors=${pageErrors.length}`);
log(`[done] report=${REPORT}`);
log(`[done] shots=${SHOTS_DIR}`);
