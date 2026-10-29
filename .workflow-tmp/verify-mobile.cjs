/* 375 窄视口快查 */
const { createRequire } = require('module');
const req = createRequire('C:/Atian/Project/FANDEX/app-web/package.json');
const { chromium } = req('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 375, height: 812 }, hasTouch: true });
  await page.goto('http://localhost:4321/FANDEX/', { waitUntil: 'load' });
  await page.evaluate(() => localStorage.setItem('fandex-theme', 'dark'));
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const probe = await page.evaluate(() => {
    const s = document.querySelector('.feature-scroller');
    return {
      overflowX: getComputedStyle(s).overflowX,
      scrollable: s.scrollWidth > s.clientWidth,
      docOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      heroEntries: document.querySelectorAll('.hero-entries .entry-btn').length,
      cta: document.querySelectorAll('.entry-btn--cta').length,
    };
  });
  console.log(JSON.stringify(probe));
  await page.screenshot({ path: 'C:/Atian/Project/FANDEX/.workflow-tmp/shots/home/home-dark-375.png', fullPage: false });
  await browser.close();
  process.exit(probe.docOverflow || !probe.scrollable || probe.cta !== 1 ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
