/* S3（代码块 SSR 化）验收脚本：跑在生产 dist 的 preview 服务上。
 * 用法：node verify-s3-ssr.cjs <baseURL>
 * 检查项：
 *  (a) 关 JS：figure.code-block 框架 + 语言名 + copy 按钮在 HTML 源码
 *  (b) copy 交互：点击复制 + copied 态 2s 回退（委托）
 *  (c) mermaid 页无双层框架
 *  (d) 行高亮/diff/focus/title/行号 类名在产物 HTML 存在
 *  (e) has-overflow 联合回归（滚动出现/滚到底消失）
 */
const path = 'C:/Atian/Project/FANDEX/app-web/node_modules/playwright';
const { chromium } = require(path);
const fs = require('fs');

const BASE = process.argv[2] || 'http://localhost:4399';
const DOC = BASE + '/FANDEX/markdown/090-CodeBlockSyntaxHighlight/';
const MERMAID = BASE + '/FANDEX/markdown/220-Mermaid/';
const DS = BASE + '/FANDEX/design-system/';
const SHOTS = 'C:/Atian/Project/FANDEX/.workflow-tmp/shots';
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
function record(id, ok, detail) {
  results.push({ id, ok, detail });
  console.log((ok ? 'PASS' : 'FAIL') + ' [' + id + '] ' + detail);
}

async function fetchHtml(url) {
  const res = await fetch(url);
  return await res.text();
}

async function unregisterSw(page) {
  await page.evaluate(async () => {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const r of regs) await r.unregister();
      const keys = await caches.keys();
      for (const k of keys) await caches.delete(k);
    } catch (e) {
      /* ignore */
    }
  });
}

(async () => {
  // ---------- (a1) 原始 HTML 源码断言（无浏览器） ----------
  {
    const html = await fetchHtml(DOC);
    const hasFigure = /<figure[^>]*class="code-block"/.test(html);
    const hasLang = /code-block__lang/.test(html);
    const hasBtn = /<button[^>]*class="copy-btn fndx-icon-btn"[^>]*aria-label="Copy code"/.test(html);
    const hasDataLang = /figure[^>]*data-lang="(ts|js|bash|json|css|html|yaml|md|vue|tsx|python)"/.test(html);
    record('a1.raw-figure', hasFigure, 'figure class="code-block" in raw HTML');
    record('a1.raw-lang', hasLang, 'code-block__lang in raw HTML');
    record('a1.raw-btn', hasBtn, 'button.copy-btn aria-label="Copy code" in raw HTML');
    record('a1.raw-datalang', hasDataLang, 'data-lang attribute on figure');
    const wrapped = (html.match(/<figure[^>]*class="code-block"/g) || []).length;
    console.log('INFO code-block count in raw HTML:', wrapped);
  }

  // ---------- (a2) mermaid 源码块的 raw HTML 检查（生产：hidden pre 不被包裹） ----------
  {
    const html = await fetchHtml(MERMAID);
    const badWrap = /class="mermaid-figure"[\s\S]*?<figure[^>]*class="code-block"/.test(html);
    record('c.raw-mermaid-not-wrapped', !badWrap, 'no figure.code-block inside mermaid-figure (raw)');
    const mermaidFig = /<figure[^>]*class="mermaid-figure"/.test(html);
    record('c.raw-mermaid-figure', mermaidFig, 'mermaid-figure present in prod HTML');
  }

  const browser = await chromium.launch();

  // ---------- (a3) 关 JS 浏览器渲染断言 + 截图 ----------
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(DOC, { waitUntil: 'load' });
    const info = await page.evaluate(() => {
      const fig = document.querySelector('figure.code-block');
      if (!fig) return null;
      const head = fig.querySelector('.code-block__head');
      const lang = fig.querySelector('.code-block__lang');
      const btn = fig.querySelector('button.copy-btn');
      const pre = fig.querySelector('pre');
      return {
        dataLang: fig.getAttribute('data-lang'),
        hasHead: !!head,
        langText: lang ? lang.textContent : '',
        hasBtn: !!btn,
        btnAria: btn ? btn.getAttribute('aria-label') : '',
        hasPre: !!pre,
        preClass: pre ? pre.className.slice(0, 40) : '',
        headVisible: head ? getComputedStyle(head).height : '',
      };
    });
    record('a3.nojs-figure', !!info, info ? 'figure.code-block in no-JS DOM' : 'missing figure');
    if (info) {
      record('a3.nojs-datalang', !!info.dataLang, 'data-lang=' + info.dataLang);
      record('a3.nojs-head', info.hasHead, 'head bar in DOM');
      record('a3.nojs-lang', !!info.langText, 'lang text: ' + info.langText);
      record('a3.nojs-btn', info.hasBtn && info.btnAria === 'Copy code', 'copy button aria: ' + info.btnAria);
      record('a3.nojs-pre', info.hasPre, 'pre inside figure: ' + info.preClass);
    }
    await page.screenshot({ path: SHOTS + '/s3-doc-nojs-light.png', fullPage: false });
    await page.evaluate(() => {}).catch(() => {});
    // 暗色（关 JS：SW/localStorage 均不可用，用 URL 查询无法切主题，改 data-theme 属性注入不可行
    // ——关 JS 下主题由初始内联脚本设置，页面默认 light，此格仅记录 light 证据）
    await ctx.close();
  }

  // ---------- (b) copy 交互（JS on，委托 + copied 2s 回退） ----------
  {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      permissions: ['clipboard-read', 'clipboard-write'],
    });
    const page = await ctx.newPage();
    await page.goto(DOC, { waitUntil: 'load' });
    await unregisterSw(page);

    const first = page.locator('figure.code-block').first();
    await first.scrollIntoViewIfNeeded();
    const expected = await first.locator('pre code').first().textContent();
    const btn = first.locator('button.copy-btn');
    await btn.click();
    await page.waitForTimeout(300);
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    record('b.clipboard', clipboard === (expected || '').replace(/\n$/, '') || clipboard.trim() === (expected || '').trim(),
      'clipboard match: ' + (clipboard === expected ? 'exact' : 'trimmed-compare, len=' + clipboard.length));
    const copiedState = await page.evaluate(() => {
      const b = document.querySelector('figure.code-block button.copy-btn');
      return { cls: b.classList.contains('copied'), checkIcon: b.innerHTML.includes('polyline points="20 6 9 17 4 12"') };
    });
    record('b.copied-state', copiedState.cls && copiedState.checkIcon, 'copied class + check icon: ' + JSON.stringify(copiedState));
    await page.waitForTimeout(2300);
    const reverted = await page.evaluate(() => {
      const b = document.querySelector('figure.code-block button.copy-btn');
      return { cls: b.classList.contains('copied'), clipboardIcon: b.innerHTML.includes('rect x="9" y="9"') };
    });
    record('b.revert-2s', !reverted.cls && reverted.clipboardIcon, 'reverted after 2s: ' + JSON.stringify(reverted));

    // has-overflow 联合回归：注入不可断行长 token 制造溢出，验证 has-overflow 出现/滚到底消失
    const overflow = await page.evaluate(() => {
      const block = document.querySelector('figure.code-block');
      if (!block) return { found: false };
      const pre = block.querySelector('pre');
      if (!pre) return { found: false };
      // pre-wrap + break-word 会把注入内容折行，这里临时切回 no-wrap +
      // overflow-wrap:normal 模拟真实站点中不可折行的宽代码块，验证机制本体
      pre.dataset.s3ws = pre.style.whiteSpace;
      pre.dataset.s3ow = pre.style.wordWrap;
      pre.style.whiteSpace = 'pre';
      pre.style.wordWrap = 'normal';
      const span = document.createElement('span');
      span.className = 's3-inject';
      span.textContent = 'x'.repeat(400);
      span.style.whiteSpace = 'nowrap';
      (block.querySelector('pre code') || pre).appendChild(span);
      pre.dispatchEvent(new Event('scroll'));
      return {
        found: true,
        overflowed: pre.scrollWidth - pre.clientWidth > 8,
        marked: block.classList.contains('has-overflow'),
        maskOn: getComputedStyle(pre).maskImage !== 'none',
      };
    });
    record('e.has-overflow-on', overflow.found && overflow.overflowed && overflow.marked,
      'inject overflow -> has-overflow: ' + JSON.stringify(overflow));
    if (overflow.found) {
      const end = await page.evaluate(() => {
        const block = document.querySelector('figure.code-block');
        const pre = block.querySelector('pre');
        pre.scrollLeft = pre.scrollWidth;
        return new Promise((resolve) => setTimeout(() => {
          const marked = block.classList.contains('has-overflow');
          pre.querySelector('.s3-inject').remove();
          pre.scrollLeft = 0;
          if (pre.dataset.s3ws !== undefined) {
            pre.style.whiteSpace = pre.dataset.s3ws;
            pre.style.wordWrap = pre.dataset.s3ow || '';
            delete pre.dataset.s3ws;
            delete pre.dataset.s3ow;
          }
          return resolve(marked);
        }, 200));
      });
      record('e.has-overflow-end', end === false, 'has-overflow removed at scroll end: ' + end);
    }
    await page.screenshot({ path: SHOTS + '/s3-doc-js-light.png' });
    await ctx.close();
  }

  // ---------- (c) mermaid 页（JS on）无双层框架 ----------
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(MERMAID, { waitUntil: 'load' });
    await unregisterSw(page);
    const m = await page.evaluate(() => ({
      mermaidFigure: document.querySelectorAll('.mermaid-figure').length,
      nested: document.querySelectorAll('.mermaid-figure .code-block, .mermaid-figure figure').length,
      totalCodeBlocks: document.querySelectorAll('figure.code-block').length,
      hiddenSource: document.querySelectorAll('.mermaid-figure pre[data-language="mermaid"]').length,
    }));
    record('c.mermaid-figures', m.mermaidFigure > 0, 'mermaid-figure count: ' + m.mermaidFigure);
    record('c.no-double-frame', m.nested === 0, 'no .code-block nested in mermaid-figure');
    record('c.source-preserved', m.hiddenSource > 0, 'hidden mermaid source pre preserved: ' + m.hiddenSource);
    await page.screenshot({ path: SHOTS + '/s3-mermaid-light.png' });
    await ctx.close();
  }

  // ---------- (d) 设计系统页四样例（明暗两套） ----------
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(DS, { waitUntil: 'load' });
    await unregisterSw(page);
    const d = await page.evaluate(() => {
      const grid = document.querySelector('.ds-code-grid');
      const figs = grid ? grid.querySelectorAll('figure.code-block') : [];
      const first = figs[0];
      return {
        count: figs.length,
        title: first ? (first.querySelector('.code-block__title') || {}).textContent || '' : '',
        lang: first ? (first.querySelector('.code-block__lang') || {}).textContent || '' : '',
        btn: grid ? grid.querySelectorAll('button.copy-btn').length : 0,
        highlighted: grid ? grid.querySelectorAll('.line.highlighted').length : 0,
        add: grid ? grid.querySelectorAll('.line.diff.add').length : 0,
        remove: grid ? grid.querySelectorAll('.line.diff.remove').length : 0,
        focused: grid ? grid.querySelectorAll('.line.focused').length : 0,
        hasFocused: grid ? grid.querySelectorAll('pre.has-focused').length : 0,
        lineNumbers: grid ? grid.querySelectorAll('pre[data-line-numbers]').length : 0,
        astroCode: grid ? grid.querySelectorAll('.astro-code').length : 0,
        markerLeft: Array.from(grid ? grid.querySelectorAll('pre') : []).some(
          (pre) => pre.textContent.includes('[!code'),
        ),
      };
    });
    record('d.four-specimens', d.count === 4, 'specimen count: ' + d.count);
    record('d.title-head', d.title === 'api-client.ts', 'title: ' + d.title);
    record('d.lang-label', d.lang === 'TypeScript', 'lang: ' + d.lang);
    record('d.copy-btns', d.btn === 4, 'copy buttons: ' + d.btn);
    record('d.highlight', d.highlighted >= 2, 'highlighted lines: ' + d.highlighted);
    record('d.diff', d.add >= 1 && d.remove >= 1, 'diff add/remove: ' + d.add + '/' + d.remove);
    record('d.focus', d.focused >= 1 && d.hasFocused >= 1, 'focused/has-focused: ' + d.focused + '/' + d.hasFocused);
    record('d.line-numbers', d.lineNumbers >= 1, 'pre[data-line-numbers]: ' + d.lineNumbers);
    record('d.shiki-dual', d.astroCode === 4, 'astro-code pre count: ' + d.astroCode);
    record('d.markers-stripped', !d.markerLeft, '[!code markers stripped from output');

    // 明暗两套截图（视检协议：先注销 SW 与缓存）
    await page.screenshot({ path: SHOTS + '/s3-ds-light.png' });
    await page.evaluate(() => {
      localStorage.setItem('fandex-theme', 'dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: SHOTS + '/s3-ds-dark.png' });
    // 标本区局部特写（明暗）
    const section = page.locator('.ds-code-grid');
    await section.screenshot({ path: SHOTS + '/s3-ds-grid-light.png' }).catch(() => {});
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('fandex-theme', 'light');
    });
    await page.waitForTimeout(300);
    await ctx.close();
  }

  // ---------- (d2) 设计系统页 copy 交互（标本页委托生效） ----------
  {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      permissions: ['clipboard-read', 'clipboard-write'],
    });
    const page = await ctx.newPage();
    await page.goto(DS, { waitUntil: 'load' });
    await unregisterSw(page);
    const btn = page.locator('.ds-code-grid figure.code-block button.copy-btn').first();
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
    await page.waitForTimeout(300);
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    record('d2.ds-copy', clip.includes('fetchDoc'), 'design-system copy works: ' + clip.slice(0, 40));
    await ctx.close();
  }

  await browser.close();
  const fails = results.filter((r) => !r.ok);
  console.log('---');
  console.log('SUMMARY: ' + (results.length - fails.length) + '/' + results.length + ' pass');
  fs.writeFileSync('C:/Atian/Project/FANDEX/.workflow-tmp/s3-verify-report.json', JSON.stringify(results, null, 2));
  process.exit(fails.length ? 1 : 0);
})().catch((err) => {
  console.error('SCRIPT ERROR:', err);
  process.exit(2);
});
