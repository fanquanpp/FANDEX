const { chromium } = require('C:/Atian/Project/FANDEX/app-web/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3001/FANDEX/design-system/', { waitUntil: 'load' });
  const d = await page.evaluate(() => {
    const figs = document.querySelectorAll('.ds-code-grid figure.code-block');
    const f1 = figs[0];
    const f3 = figs[2];
    const f2 = figs[1];
    const f4 = figs[3];
    const add = f3.querySelector('.line.diff.add');
    const remove = f3.querySelector('.line.diff.remove');
    const hl = f2.querySelector('.line.highlighted');
    const unfocused = f4.querySelector('.line:not(.focused)');
    return {
      count: figs.length,
      figH: f1.getBoundingClientRect().height,
      headH: f1.querySelector('.code-block__head').getBoundingClientRect().height,
      preH: f1.querySelector('pre').getBoundingClientRect().height,
      hlBg: getComputedStyle(hl).backgroundColor,
      hlShadow: getComputedStyle(hl).boxShadow.slice(0, 60),
      addBg: getComputedStyle(add).backgroundColor,
      removeBg: getComputedStyle(remove).backgroundColor,
      unfocusedOpacity: getComputedStyle(unfocused).opacity,
      focusedOpacity: getComputedStyle(f4.querySelector('.line.focused')).opacity,
      counter: getComputedStyle(f2.querySelector('.line'), '::before').content,
      lnBeforeW: getComputedStyle(f2.querySelector('.line'), '::before').width,
    };
  });
  console.log(JSON.stringify(d, null, 2));
  // 明暗两张截图（显式主题）
  const grid = page.locator('.ds-code-grid');
  await page.evaluate(() => {
    localStorage.setItem('fandex-theme', 'light');
    document.documentElement.setAttribute('data-theme', 'light');
  });
  await page.waitForTimeout(300);
  await grid.screenshot({ path: 'C:/Atian/Project/FANDEX/.workflow-tmp/shots/s3-ds-grid-light2.png' });
  await page.evaluate(() => {
    localStorage.setItem('fandex-theme', 'dark');
    document.documentElement.setAttribute('data-theme', 'dark');
  });
  await page.waitForTimeout(300);
  await grid.screenshot({ path: 'C:/Atian/Project/FANDEX/.workflow-tmp/shots/s3-ds-grid-dark2.png' });
  await browser.close();
  console.log('done');
})();
