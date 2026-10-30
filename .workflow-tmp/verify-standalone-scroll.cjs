/* design-system 分区滚屏截图（.home-main 为内部滚动容器，fullPage 捕不到，
 * 按 constraints 4:51 用滚屏 + 视口截图；?astroDisableToolbar=true 藏 dev toolbar） */
const { chromium } = require('C:/Atian/Project/FANDEX/app-web/node_modules/playwright');
const OUT = 'C:/Atian/Project/FANDEX/.workflow-tmp/shots/standalone';

(async () => {
  const browser = await chromium.launch({ headless: true });
  for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 960 } });
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:4321/FANDEX/design-system/?astroDisableToolbar=true`, { waitUntil: 'load' });
    await page.evaluate((t) => localStorage.setItem('fandex-theme', t), theme);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(600);
    const scroller = '.home-main';
    const total = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      return el.scrollHeight - el.clientHeight;
    }, scroller);
    let i = 0;
    for (let top = 0; top <= total; top += 860) {
      await page.evaluate(({ sel, top }) => {
        document.querySelector(sel).scrollTop = top;
      }, { sel: scroller, top });
      await page.waitForTimeout(250);
      await page.screenshot({ path: `${OUT}/ds-scroll-${theme}-${String(i).padStart(2, '0')}.png` });
      i += 1;
      if (i > 12) break;
    }
    await context.close();
    console.log(`${theme}: ${i} scroll shots, scrollable ${total}px`);
  }
  await browser.close();
})().catch((e) => {
  console.error('CRASH:', e);
  process.exit(1);
});
