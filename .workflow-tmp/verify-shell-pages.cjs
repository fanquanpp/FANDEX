/* shell 域补充冒烟：多壳页顶栏 + 搜索面板开合 + console 错误收集 */
const path = require('node:path');
const { chromium } = require(path.join(process.cwd(), 'node_modules', 'playwright'));

const BASE = 'http://localhost:4321/FANDEX/';
const ROUTES = [
  { name: 'playground', url: BASE + 'playground/', sel: '.home-nav' },
  { name: 'learning-path', url: BASE + 'learning-path/', sel: '.home-nav' },
  { name: 'syntax', url: BASE + 'syntax/', sel: '.home-nav' },
  { name: 'module', url: BASE + 'algorithm/', sel: '.app-nav' },
  { name: '404', url: BASE + 'not-exist-page/', sel: null },
];

(async () => {
  const userDataDir = path.join(__dirname, 'pw-profile-2');
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    viewport: { width: 1280, height: 800 },
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
  });

  let failed = 0;
  for (const route of ROUTES) {
    await page.goto(route.url, { waitUntil: 'load' });
    await page.evaluate(async () => {
      const regs = (await navigator.serviceWorker?.getRegistrations?.()) ?? [];
      for (const r of regs) await r.unregister();
      for (const k of await caches.keys()) await caches.delete(k);
    });
    await page.waitForTimeout(500);
    const probe = await page.evaluate((sel) => {
      const header = sel ? document.querySelector(sel) : null;
      const trigger = document.querySelector('[data-search-trigger]') ?? null;
      return {
        header: !!header,
        variant: header ? header.dataset.siteHeader : null,
        hasTrigger: !!trigger,
        url: location.pathname,
      };
    }, route.sel);
    const ok = route.sel ? probe.header && probe.hasTrigger : true;
    if (!ok) failed += 1;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${route.name} :: ${JSON.stringify(probe)}`);
  }

  // 搜索面板开合（doc 页触发）
  await page.goto(BASE + 'algorithm/', { waitUntil: 'load' });
  await page.waitForTimeout(600);
  await page.click('[data-search-trigger]');
  await page.waitForTimeout(300);
  const palette = await page.evaluate(() => {
    const dlg = document.querySelector('dialog.search-palette');
    return dlg ? { open: dlg.open, topLayerMatches: dlg === document.activeElement || !!dlg.querySelector('input') } : { open: false };
  });
  const paletteOk = palette.open === true;
  if (!paletteOk) failed += 1;
  console.log(`${paletteOk ? 'PASS' : 'FAIL'} search-palette opens :: ${JSON.stringify(palette)}`);
  await page.screenshot({ path: path.join(__dirname, 'shots', 'shell-search-palette.png') });

  const realErrors = errors.filter(
    (e) => !e.includes('favicon') && !e.includes('pagefind') && !e.includes('Failed to load resource'),
  );
  console.log(`console/page errors (filtered): ${realErrors.length}`);
  for (const e of realErrors.slice(0, 10)) console.log('  ', e.slice(0, 200));
  if (realErrors.length > 0) failed += realErrors.length;

  await page.close();
  await ctx.close();
  console.log(`FAILED TOTAL: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((err) => {
  console.error('SCRIPT_ERROR', err);
  process.exit(2);
});
