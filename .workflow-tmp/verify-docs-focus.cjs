const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const OUT = '.workflow-tmp/shots/docs';
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.goto('http://localhost:4321/FANDEX/algorithm/290-NetworkFlow/', { waitUntil: 'load' });
  await page.evaluate(() => { try { localStorage.setItem('fandex-theme', 'dark'); } catch (e) {} });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(600);

  const linkTexts = await page.evaluate(() => {
    const links = [...document.querySelectorAll('.fndx-toc__link')].slice(0, 4);
    return links.map((l) => JSON.stringify(l.textContent));
  });
  const echoText = await page.evaluate(() => document.querySelector('[data-toc-current]')?.textContent);

  // 深滚 3 屏触发 back-top 解禁
  await page.evaluate(() => {
    const m = document.getElementById('app-main');
    m.scrollTop = m.clientHeight * 3;
    m.dispatchEvent(new Event('scroll'));
  });
  await page.waitForTimeout(400);
  const backTop1 = await page.evaluate(() => {
    const b = document.querySelector('.fndx-toc__back-top');
    return { disabled: b.hasAttribute('disabled') };
  });
  await page.click('.fndx-toc__mobile-toggle');
  await page.waitForTimeout(250);
  // dev 性能悬浮窗（--z-overlay-top 1000）会拦截指针，按真实事件派发
  await page.evaluate(() => document.querySelector('.fndx-toc__back-top').click());
  await page.waitForTimeout(1100);
  const backTop2 = await page.evaluate(() => ({
    scrollTop: Math.round(document.getElementById('app-main').scrollTop),
    panelOpen: document.querySelector('.fndx-toc').classList.contains('is-open'),
    disabledAgain: document.querySelector('.fndx-toc__back-top').hasAttribute('disabled'),
  }));

  // 桌面回归：滚动后 back-top 可用 + 点击回顶
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const m = document.getElementById('app-main');
    m.scrollTop = m.clientHeight * 3;
    m.dispatchEvent(new Event('scroll'));
  });
  await page.waitForTimeout(400);
  const deskBackTop = await page.evaluate(() => ({
    disabled: document.querySelector('.fndx-toc__back-top').hasAttribute('disabled'),
  }));
  await page.evaluate(() => document.querySelector('.fndx-toc__back-top').click());
  await page.waitForTimeout(1100);
  const deskTop = await page.evaluate(() => Math.round(document.getElementById('app-main').scrollTop));
  await page.screenshot({ path: `${OUT}/backtop-desktop-after.png` });

  console.log(JSON.stringify({ linkTexts, echoText, backTop1, backTop2, deskBackTop, deskTop, errors }, null, 1));
  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
