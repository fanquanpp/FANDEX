// learnpath 域视检探针：明暗两套 x 恰 768 / 恰 1024 / 1440 视口
// 前置：astro dev 于 4321；SW 供旧清除按 constraints 4.52 执行
import { createRequire } from 'node:module';
import fs from 'node:fs';

const require = createRequire('C:/Atian/Project/FANDEX/app-web/package.json');
const { chromium } = require('playwright');

const BASE = 'http://localhost:4321/FANDEX';
const OUT = '.workflow-tmp/shots/learnpath';
fs.mkdirSync(OUT, { recursive: true });

const results = [];
const probe = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${name} | ${detail}`);
};

const themes = ['light', 'dark'];
const viewports = [
  { w: 1440, h: 900, tag: 'desktop' },
  { w: 1024, h: 900, tag: 'exact1024' },
  { w: 768, h: 1200, tag: 'exact768' },
];

const browser = await chromium.launch();
try {
  for (const vp of viewports) {
    for (const theme of themes) {
      const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
      await ctx.addInitScript((t) => {
        try { localStorage.setItem('fandex-theme', t); } catch {}
      }, theme);
      const page = await ctx.newPage();

      // ---- 总览页 ----
      await page.goto(`${BASE}/learning-path/`, { waitUntil: 'networkidle' });
      await purgeSw(page);
      const ovTag = `${vp.tag}-${theme}`;
      await shot(page, `${OUT}/overview-${ovTag}.png`);

      const fb = await page.evaluate(() => {
        const el = document.querySelector('.fx-backdrop');
        return el ? getComputedStyle(el).zIndex : 'missing';
      });
      probe(`overview ${ovTag} fx-backdrop z=-1`, fb === '-1', `z=${fb}`);

      const overflow = await page.evaluate(() => ({
        sw: document.scrollingElement.scrollWidth,
        cw: document.scrollingElement.clientWidth,
      }));
      probe(`overview ${ovTag} 无横向溢出`, overflow.sw <= overflow.cw, `scroll=${overflow.sw} client=${overflow.cw}`);

      const cards = await page.locator('.lp-tech-card').count();
      probe(`overview ${ovTag} 技术卡渲染`, cards >= 40, `count=${cards}`);

      const badgeColor = await page.evaluate(() => {
        const el = document.querySelector('.lp-tech-card__progress:not([hidden])');
        return el ? getComputedStyle(el).color : 'none-visible';
      });
      console.log(`INFO | overview ${ovTag} 进度徽章色(如有本地进度) | ${badgeColor}`);

      // ---- 地图页 ----
      await page.goto(`${BASE}/learning-path/javascript/`, { waitUntil: 'networkidle' });
      await shot(page, `${OUT}/map-${ovTag}.png`);

      const chipsZ = await page.evaluate(() => {
        const el = document.querySelector('.lp-tech-chips');
        return el ? getComputedStyle(el).zIndex : 'missing';
      });
      probe(`map ${ovTag} chips z-index=--z-sticky(10)`, chipsZ === '10', `z=${chipsZ}`);

      const nodeStroke = await page.evaluate(() => {
        const el = document.querySelector('.lp-node__rect');
        return el ? getComputedStyle(el).stroke : 'missing';
      });
      probe(`map ${ovTag} 节点描边=neutral-600`, /115,\s*115,\s*115/.test(nodeStroke), nodeStroke);

      const edgeStroke = await page.evaluate(() => {
        const el = document.querySelector('.lp-edge');
        return el ? getComputedStyle(el).stroke + ' op=' + getComputedStyle(el).opacity : 'missing';
      });
      probe(`map ${ovTag} 连线提档`, /115,\s*115,\s*115/.test(edgeStroke) && edgeStroke.includes('op=1'), edgeStroke);

      const bodyCols = await page.evaluate(() => {
        const el = document.querySelector('.lp-map__body');
        return el ? getComputedStyle(el).gridTemplateColumns : 'missing';
      });
      const expectTwo = vp.w >= 1024;
      const isTwo = bodyCols.trim().split(' ').length >= 2;
      probe(`map ${ovTag} ${expectTwo ? '双列(恰1024走桌面档)' : '单列'}`, isTwo === expectTwo, `cols="${bodyCols}"`);

      const hydrated = await page.evaluate(() => !!document.querySelector('.lp-map'));
      const btns = await page.locator('.lp-controls .fndx-icon-btn').count();
      probe(`map ${ovTag} 岛水合 + MapControls 图标钮`, hydrated && btns === 5, `map=${hydrated} iconBtns=${btns}`);

      const mapOverflow = await page.evaluate(() => ({
        sw: document.scrollingElement.scrollWidth,
        cw: document.scrollingElement.clientWidth,
      }));
      probe(`map ${ovTag} 无横向溢出`, mapOverflow.sw <= mapOverflow.cw, `scroll=${mapOverflow.sw} client=${mapOverflow.cw}`);

      // DetailPanel：点选节点 -> 反色墨水选中
      // 真实命中验证（elementFromPoint 落在节点内）+ 合成 click 触发面板
      const hit = await page.evaluate(() => {
        const g = document.querySelector('.lp-node');
        const r = g.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const el = document.elementFromPoint(cx, cy);
        const inside = !!el && (!!el.closest('.lp-node') || el.classList.contains('lp-node__rect'));
        g.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        return { inside, hit: el ? el.tagName + '.' + (el.getAttribute('class') || '') : 'null' };
      });
      probe(`map ${ovTag} 节点真实命中可点`, hit.inside, hit.hit);
      await page.waitForTimeout(300);
      const ink = await page.evaluate(() => {
        const btn = document.querySelector('.lp-panel__progress-btn.is-active');
        if (!btn) return { bg: 'no-active', fg: '' };
        const s = getComputedStyle(btn);
        return { bg: s.backgroundColor, fg: s.color };
      });
      const dark = theme === 'dark';
      // 反色墨水：暗色 active bg = rgb(235,239,243) fg = rgb(10,10,10)；亮色相反
      const bgOk = dark ? ink.bg.includes('235, 239, 243') : ink.bg.includes('10, 10, 10');
      const fgOk = dark ? ink.fg.includes('10, 10, 10') : ink.fg.includes('235, 239, 243');
      probe(`map ${ovTag} DetailPanel 选中反色墨水`, bgOk && fgOk, `bg=${ink.bg} fg=${ink.fg}`);
      await shot(page, `${OUT}/map-panel-${ovTag}.png`);
      await page.keyboard.press('Escape');

      await ctx.close();
    }
  }
} finally {
  await browser.close();
}

async function purgeSw(page) {
  await page.evaluate(async () => {
    try {
      const regs = await navigator.serviceWorker?.getRegistrations?.() ?? [];
      await Promise.all(regs.map((r) => r.unregister()));
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch {}
  });
  await page.reload({ waitUntil: 'networkidle' });
}

async function shot(page, path) {
  await page.screenshot({ path, fullPage: false });
}

const fails = results.filter((r) => !r.ok);
console.log(`\n==== ${results.length} probes, ${fails.length} failed ====`);
process.exit(fails.length ? 1 : 0);
