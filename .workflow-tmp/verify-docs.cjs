/* 文档域视检脚本（规格 8.3 + constraints §4）
 * 覆盖：普通短文 / 长文 290-NetworkFlow / 分页 page/2 / 模块落地 / 公式页
 * 明暗两套 x 桌面 1440 / 移动 375 / 恰 768 / 恰 1024
 */
const { chromium } = require('playwright');
const fs = require('fs');

const BASE = 'http://localhost:4321/FANDEX/';
const OUT = '.workflow-tmp/shots/docs';
const pages = [
  { name: 'short', url: BASE + 'markdown/020-HeadingSyntax/' },
  { name: 'long', url: BASE + 'algorithm/290-NetworkFlow/' },
  { name: 'pager2', url: BASE + 'javascript/page/2/' },
  { name: 'module', url: BASE + 'javascript/' },
  { name: 'formula', url: BASE + 'cs-fundamentals/540-DiscreteMathematics/' },
];

async function cleanSw(page) {
  await page.evaluate(async () => {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const r of regs) await r.unregister();
      const keys = await caches.keys();
      for (const k of keys) await caches.delete(k);
    } catch (e) { /* ignore */ }
  });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const report = [];
  const probe = async (page, name, value) => {
    try { return await page.evaluate(value); } catch (e) { return 'ERR:' + e.message; }
  };

  for (const viewport of [
    { tag: 'desktop-1440', width: 1440, height: 900 },
    { tag: 'mobile-375', width: 375, height: 812 },
    { tag: 'exact-768', width: 768, height: 1024 },
    { tag: 'exact-1024', width: 1024, height: 768 },
  ]) {
    for (const theme of ['dark', 'light']) {
      const ctx = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
      page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

      for (const p of pages) {
        const label = `${p.name}-${theme}-${viewport.tag}`;
        try {
          await page.goto(p.url, { waitUntil: 'load', timeout: 45000 });
          await page.evaluate((t) => { try { localStorage.setItem('fandex-theme', t); } catch (e) {} }, theme);
          await page.reload({ waitUntil: 'load' });
        } catch (e) {
          report.push(`${label}: GOTO FAIL ${e.message.split('\n')[0]}`);
          continue;
        }
        await cleanSw(page);
        await page.reload({ waitUntil: 'load' });
        await page.waitForTimeout(700);

        const info = await probe(page, label, () => {
          const q = (s) => document.querySelector(s);
          const r = (el) => (el ? el.getBoundingClientRect() : null);
          const pEl = q('.prose p');
          const toc = q('.fndx-toc');
          const tocStyle = toc ? getComputedStyle(toc) : null;
          return {
            url: location.pathname,
            dataTheme: document.documentElement.getAttribute('data-theme'),
            bgCard: getComputedStyle(document.body).getPropertyValue('--color-bg-card').trim(),
            prosePWidth: pEl ? Math.round(r(pEl).width) : null,
            prosePFont: pEl ? getComputedStyle(pEl).fontSize : null,
            preWidth: q('.prose pre, .prose .astro-code') ? Math.round(r(q('.prose pre, .prose .astro-code')).width) : null,
            tableW: q('.prose .table-wrap') ? Math.round(r(q('.table-wrap')).width) : null,
            tocExists: !!toc,
            tocPosition: tocStyle ? tocStyle.position + '/' + tocStyle.zIndex : null,
            tocDisplay: tocStyle ? tocStyle.display : null,
            tocBar: !!q('.fndx-toc__mobile-toggle'),
            tocBarVisible: q('.fndx-toc__mobile-toggle') ? getComputedStyle(q('.fndx-toc__mobile-toggle')).display : null,
            tocOpen: toc ? toc.classList.contains('is-open') : null,
            tocCurrent: q('[data-toc-current]') ? q('[data-toc-current]').textContent : null,
            backTop: !!q('.fndx-toc__back-top'),
            backTopDisabled: q('.fndx-toc__back-top') ? q('.fndx-toc__back-top').hasAttribute('disabled') : null,
            breadcrumbZ: q('.breadcrumb') ? getComputedStyle(q('.breadcrumb')).zIndex : null,
            breadcrumbFs: q('.breadcrumb') ? getComputedStyle(q('.breadcrumb')).fontSize : null,
            titleRowZ: q('.doc-title-row') ? getComputedStyle(q('.doc-title-row')).zIndex : null,
            fxBackdrop: q('.fx-backdrop') ? getComputedStyle(q('.fx-backdrop')).zIndex : null,
            mainPadTop: q('#app-main') ? getComputedStyle(q('#app-main')).paddingTop : null,
            h4Style: (() => { const h = q('.prose h4'); if (!h) return null; const s = getComputedStyle(h); return s.fontSize + '/' + s.fontWeight + '/deco:' + s.textDecorationLine; })(),
            thBg: (() => { const th = q('.prose th'); return th ? getComputedStyle(th).backgroundColor : null; })(),
            admonitionBorder: (() => { const a = q('.prose .admonition'); return a ? getComputedStyle(a).borderLeftWidth : 'none-on-page'; })(),
            hrHeight: (() => { const h = q('.prose hr'); return h ? getComputedStyle(h).height : 'none-on-page'; })(),
            katex: !!q('.katex'),
            pager: !!q('.pager'),
            hScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
            sidebarHoverTick: (() => { const l = q('.fndx-sidebar__link'); if (!l) return null; return getComputedStyle(l, '::before').content !== 'none' ? 'hit-area-present' : 'none'; })(),
            sidebarZ: q('#app-sidebar') ? getComputedStyle(q('#app-sidebar')).zIndex : null,
          };
        });

        // 移动端目录交互（仅长文页 + 移动/窄视口）
        let tocInteract = null;
        if (p.name === 'long' && viewport.width < 1024) {
          try {
            await page.evaluate(() => {
              const m = document.getElementById('app-main');
              if (m) m.scrollTop = 800;
              m && m.dispatchEvent(new Event('scroll'));
            });
            await page.waitForTimeout(400);
            const cur = await page.evaluate(() => document.querySelector('[data-toc-current]')?.textContent || '');
            await page.click('.fndx-toc__mobile-toggle');
            await page.waitForTimeout(250);
            const openState = await page.evaluate(() => {
              const t = document.querySelector('.fndx-toc');
              const nav = document.querySelector('.fndx-toc__nav');
              return { open: t.classList.contains('is-open'), navDisplay: getComputedStyle(nav).display, panelH: Math.round(nav.getBoundingClientRect().height) };
            });
            await page.screenshot({ path: `${OUT}/${label}-panel-open.png` });
            // Esc 关闭
            await page.keyboard.press('Escape');
            await page.waitForTimeout(200);
            const afterEsc = await page.evaluate(() => document.querySelector('.fndx-toc').classList.contains('is-open'));
            // 再开 -> 点击外部关闭
            await page.click('.fndx-toc__mobile-toggle');
            await page.waitForTimeout(200);
            await page.mouse.click(10, 400);
            await page.waitForTimeout(200);
            const afterOutside = await page.evaluate(() => document.querySelector('.fndx-toc').classList.contains('is-open'));
            // 再开 -> 选链接关闭
            await page.click('.fndx-toc__mobile-toggle');
            await page.waitForTimeout(200);
            const linkCount = await page.evaluate(() => document.querySelectorAll('.fndx-toc__link').length);
            await page.click('.fndx-toc__link');
            await page.waitForTimeout(300);
            const afterLink = await page.evaluate(() => document.querySelector('.fndx-toc').classList.contains('is-open'));
            // 回到开头
            const backTopState = await page.evaluate(() => {
              const b = document.querySelector('.fndx-toc__back-top');
              return { disabled: b.hasAttribute('disabled') };
            });
            await page.click('.fndx-toc__back-top').catch(() => {});
            await page.waitForTimeout(900);
            const scrolledTop = await page.evaluate(() => document.getElementById('app-main').scrollTop < 50);
            tocInteract = { echoAfterScroll: cur, openState, afterEsc, afterOutside, afterLink, linkCount, backTopState, scrolledTop };
          } catch (e) {
            tocInteract = 'ERR:' + e.message.split('\n')[0];
          }
        }

        // 桌面 TOC 回到开头状态
        let deskBackTop = null;
        if (p.name === 'long' && viewport.width >= 1024) {
          deskBackTop = await probe(page, label, () => ({
            backTopDisabled: document.querySelector('.fndx-toc__back-top').hasAttribute('disabled'),
            tocPos: getComputedStyle(document.querySelector('.fndx-toc')).position,
          }));
        }

        await page.screenshot({ path: `${OUT}/${label}.png`, fullPage: false });
        report.push(`${label}: ${JSON.stringify({ ...info, ...(tocInteract ? { tocInteract } : {}), ...(deskBackTop ? { deskBackTop } : {}) }) }`);
        if (errors.length) report.push(`${label}: JS-ERRORS ${errors.slice(0, 3).join(' | ')}`);
      }
      await ctx.close();
    }
  }
  await browser.close();
  fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 1));
  for (const line of report) console.log(line.slice(0, 600));
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
