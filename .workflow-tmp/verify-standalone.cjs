/* standalone 域视检探针（规格 5.7 / 验收 8.7）
 * 用法：node .workflow-tmp/verify-standalone.cjs  （需 astro dev 已在 127.0.0.1:4321）
 * 输出：DOM 探针结果 + 明暗截图至 .workflow-tmp/shots/standalone/
 */
const { chromium } = require('C:/Atian/Project/FANDEX/app-web/node_modules/playwright');
const fs = require('fs');

const BASE = 'http://127.0.0.1:4321/FANDEX/';
const OUT = 'C:/Atian/Project/FANDEX/.workflow-tmp/shots/standalone';

async function withPage(browser, viewport, fn) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const fxRequests = [];
  page.on('request', (req) => {
    const url = req.url();
    if (/\/fx|fx\?|letter-glitch|fxReady/i.test(url)) fxRequests.push(url);
  });
  try {
    await fn(page, fxRequests);
  } finally {
    await context.close();
  }
}

async function flushSw(page) {
  await page.evaluate(async () => {
    if (navigator.serviceWorker) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const r of regs) await r.unregister();
    }
    const keys = await caches.keys();
    for (const k of keys) await caches.delete(k);
  });
}

async function gotoUrl(page, url) {
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  await flushSw(page);
}

async function setThemeAndReload(page, url, theme) {
  await page.evaluate((t) => localStorage.setItem('fandex-theme', t), theme);
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => (document.fonts ? document.fonts.ready : null));
  await page.waitForTimeout(400);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const report = { pages: [] };
  const failures = [];
  const assert = (cond, label) => {
    if (!cond) failures.push(label);
    return cond ? 'PASS' : 'FAIL';
  };

  // ---------- design-system ----------
  await withPage(browser, { width: 1280, height: 1000 }, async (page) => {
    const url = `${BASE}design-system/`;
    await gotoUrl(page, url);
    for (const theme of ['light', 'dark']) {
      await setThemeAndReload(page, url, theme);
      const p = await page.evaluate(() => {
        const cs = (sel, prop) => {
          const el = document.querySelector(sel);
          return el ? getComputedStyle(el)[prop] : null;
        };
        const checkedText = document.querySelector('.ds-seg input:checked + .ds-seg__text');
        return {
          path: location.pathname,
          theme: document.documentElement.getAttribute('data-theme'),
          sections: document.querySelectorAll('.ds-section').length,
          fndxButtons: document.querySelectorAll('.fndx-button').length,
          radiusSwatches: document.querySelectorAll('.ds-radius-swatch').length,
          radiusControl: cs('.ds-radius-swatch:nth-of-type(1)', 'borderRadius'),
          swatch2Radius: document.querySelectorAll('.ds-radius-swatch')[1]
            ? getComputedStyle(document.querySelectorAll('.ds-radius-swatch')[1]).borderRadius
            : null,
          swatch4Radius: document.querySelectorAll('.ds-radius-swatch')[3]
            ? getComputedStyle(document.querySelectorAll('.ds-radius-swatch')[3]).borderRadius
            : null,
          inkCheckedBg: checkedText ? getComputedStyle(checkedText).backgroundColor : null,
          inkCheckedColor: checkedText ? getComputedStyle(checkedText).color : null,
          segCheckedLabel: checkedText ? checkedText.textContent : null,
          codeFigures: document.querySelectorAll('.ds-code').length,
          highlighted: document.querySelectorAll('.is-highlighted').length,
          diffAdd: document.querySelectorAll('.is-add').length,
          diffDel: document.querySelectorAll('.is-del').length,
          blur: document.querySelectorAll('.is-blur').length,
          tableThBg: cs('.ds-table th', 'backgroundColor'),
          tableThBorder: cs('.ds-table th', 'borderBottomWidth'),
          tocOpen: document.querySelector('.ds-toc')?.hasAttribute('open') ?? null,
          islandHeader: document.querySelector('h2') ? Array.from(document.querySelectorAll('h2')).map((h) => h.textContent.trim()).join(' | ').slice(0, 160) : null,
          fxBackdropZ: (() => {
            const el = document.querySelector('.fx-backdrop');
            return el ? getComputedStyle(el).zIndex : null;
          })(),
          hOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        };
      });
      p.fxRequests = [];
      p.checks = [
        assert(p.sections === 8, 'ds: 8 specimen sections'),
        assert(p.fndxButtons === 16, 'ds: 16 fndx-button (4 levels x (3 sizes + disabled))'),
        assert(p.radiusSwatches === 5, 'ds: 5 radius swatches'),
        assert(p.codeFigures === 4, 'ds: 4 code figures'),
        assert(p.highlighted === 2 && p.diffAdd === 1 && p.diffDel === 1 && p.blur === 2, 'ds: code line classes'),
        assert(p.segCheckedLabel === '题库', 'ds: segmented checked label'),
        assert(p.fxBackdropZ === '-1', 'ds: fx-backdrop z-index -1'),
        assert(!p.hOverflow, 'ds: no horizontal overflow'),
      ];
      report.pages.push(p);
      await page.screenshot({ path: `${OUT}/ds-${theme}.png` });
      await page.screenshot({ path: `${OUT}/ds-${theme}-full.png`, fullPage: true });
    }

    // 反色墨水交互：点击第一段后选中态迁移（纯 CSS radio）
    const after = await page.evaluate(() => {
      const first = document.querySelector('.ds-seg__item input');
      first.click();
      return new Promise((resolve) => setTimeout(() => {
        const checkedText = document.querySelector('.ds-seg input:checked + .ds-seg__text');
        resolve({
          label: checkedText ? checkedText.textContent : null,
          bg: checkedText ? getComputedStyle(checkedText).backgroundColor : null,
        });
      }, 100));
    });
    const inkOk = after.label === '教程' && after.bg && after.bg !== 'rgba(0, 0, 0, 0)';
    report.pages.push({ probe: 'ds ink toggle', after, check: assert(inkOk, 'ds: inverse-ink toggles by click') });

    // 移动端目录 details 交互
    const toc = await page.evaluate(() => {
      const d = document.querySelector('.ds-toc');
      const before = d.hasAttribute('open');
      d.querySelector('summary').click();
      return new Promise((resolve) => setTimeout(() => resolve({ before, after: d.hasAttribute('open') }), 100));
    });
    report.pages.push({ probe: 'ds toc details', toc, check: assert(toc.before === false && toc.after === true, 'ds: toc details opens') });

    // 恰 768px（走桌面档，无横向溢出）
    await page.setViewportSize({ width: 768, height: 1000 });
    await page.waitForTimeout(200);
    const at768 = await page.evaluate(() => ({
      hOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      panelPad: getComputedStyle(document.querySelector('.ds-panel')).padding,
    }));
    report.pages.push({ probe: 'ds @768', at768, check: assert(!at768.hOverflow, 'ds @768: no horizontal overflow') });
  });

  // ---------- 404 ----------
  await withPage(browser, { width: 1280, height: 1000 }, async (page, fxRequests) => {
    const url = `${BASE}no-such-page-standalone-probe/`;
    await gotoUrl(page, url);
    for (const theme of ['light', 'dark']) {
      await setThemeAndReload(page, url, theme);
      const p = await page.evaluate(() => {
        const code = document.querySelector('.error-code');
        return {
          path: location.pathname,
          theme: document.documentElement.getAttribute('data-theme'),
          is404: code ? code.textContent.trim() : null,
          codeFont: code ? getComputedStyle(code).fontFamily : null,
          fxBackdrop: document.querySelectorAll('.fx-backdrop').length,
          canvases: document.querySelectorAll('canvas').length,
          fxReady: document.documentElement.dataset.fxReady ?? null,
          fndxButtons: document.querySelectorAll('.error-actions .fndx-button').length,
          cta: !!document.querySelector('.error-cta.fndx-button--ghost'),
          ctaArrow: document.querySelector('.error-cta__arrow')?.textContent ?? null,
          legacyBtn: !!document.querySelector('.error-btn'),
          pathShown: document.querySelector('#error-path-value')?.textContent ?? null,
          hOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        };
      });
      p.fxRequests = fxRequests.slice();
      p.checks = [
        assert(p.is404 === '404', '404: big number rendered'),
        assert(p.codeFont && p.codeFont.includes('Chakra Petch'), '404: display font family'),
        assert(p.fxBackdrop === 0 && p.canvases === 0 && p.fxReady === null, '404: no fx layer / canvas / fxReady'),
        assert(p.fxRequests.length === 0, '404: zero fx script requests'),
        assert(p.fndxButtons === 2 && p.cta && !p.legacyBtn, '404: fndx-button exits, CTA ghost, legacy class gone'),
        assert(p.ctaArrow === '→', '404: CTA arrow glyph'),
        assert((p.pathShown || '').includes('no-such-page-standalone-probe'), '404: invalid path echoed'),
        assert(!p.hOverflow, '404: no horizontal overflow'),
      ];
      report.pages.push(p);
      await page.screenshot({ path: `${OUT}/404-${theme}.png` });
    }
    // 移动端 375
    await page.setViewportSize({ width: 375, height: 1600 });
    await page.reload({ waitUntil: 'load' });
    const m = await page.evaluate(() => ({
      hOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      btnWidthFull: (() => {
        const b = document.querySelector('.error-actions .fndx-button');
        return b ? Math.abs(b.getBoundingClientRect().width - (window.innerWidth - 2 * 24 - 2 * 24)) < 60 : null;
      })(),
    }));
    report.pages.push({ probe: '404 @375', m, check: assert(!m.hOverflow, '404 @375: no horizontal overflow') });
    await page.screenshot({ path: `${OUT}/404-mobile.png` });
  });

  // ---------- disclaimer ----------
  await withPage(browser, { width: 1280, height: 1000 }, async (page, fxRequests) => {
    const url = `${BASE}disclaimer/`;
    await gotoUrl(page, url);
    for (const theme of ['light', 'dark']) {
      await setThemeAndReload(page, url, theme);
      const p = await page.evaluate(() => ({
        path: location.pathname,
        theme: document.documentElement.getAttribute('data-theme'),
        fxBackdrop: document.querySelectorAll('.fx-backdrop').length,
        canvases: document.querySelectorAll('canvas').length,
        ghost: !!document.querySelector('.legal-actions .fndx-button--ghost'),
        legacyBtn: !!document.querySelector('.legal-btn'),
        langToggle: document.querySelectorAll('.legal-lang-btn').length,
        articles: document.querySelectorAll('[data-legal-article]').length,
        hOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      }));
      p.fxRequests = fxRequests.slice();
      p.checks = [
        assert(p.fxBackdrop === 0 && p.canvases === 0, 'disclaimer: no fx layer / canvas'),
        assert(p.fxRequests.length === 0, 'disclaimer: zero fx script requests'),
        assert(p.ghost && !p.legacyBtn, 'disclaimer: ghost fndx-button, legacy class gone'),
        assert(p.langToggle === 2 && p.articles === 2, 'disclaimer: bilingual blocks intact'),
        assert(!p.hOverflow, 'disclaimer: no horizontal overflow'),
      ];
      report.pages.push(p);
      await page.screenshot({ path: `${OUT}/disclaimer-${theme}.png` });
    }
  });

  // ---------- ai（保持独立壳，仅回归） ----------
  await withPage(browser, { width: 1280, height: 1000 }, async (page) => {
    const url = `${BASE}ai/`;
    await gotoUrl(page, url);
    for (const theme of ['light', 'dark']) {
      await setThemeAndReload(page, url, theme);
      const p = await page.evaluate(() => ({
        path: location.pathname,
        theme: document.documentElement.getAttribute('data-theme'),
        title: document.querySelector('.ai-title')?.textContent ?? null,
        primary: !!document.querySelector('#ai-save.ai-btn--primary'),
        inputs: document.querySelectorAll('.ai-input').length,
        dormant: !!document.querySelector('.ai-dormant'),
        hOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      }));
      p.checks = [
        assert(p.title === 'AI 设置', 'ai: title rendered'),
        assert(p.primary && p.inputs >= 2, 'ai: form intact'),
        assert(!p.hOverflow, 'ai: no horizontal overflow'),
      ];
      report.pages.push(p);
      await page.screenshot({ path: `${OUT}/ai-${theme}.png` });
    }
  });

  await browser.close();
  fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
  console.log('=== failures:', failures.length);
  failures.forEach((f) => console.log('FAIL:', f));
  console.log('=== report written to', `${OUT}/report.json`);
})().catch((e) => {
  console.error('PROBE CRASH:', e);
  process.exit(1);
});
