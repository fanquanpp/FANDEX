const { chromium } = require('C:/Atian/Project/FANDEX/app-web/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:4399/FANDEX/design-system/', { waitUntil: 'load' });
  const d = await page.evaluate(() => {
    const fig = document.querySelector('.ds-code-grid figure.code-block');
    const head = fig.querySelector('.code-block__head');
    const pre = fig.querySelector('pre');
    const demo = fig.parentElement;
    return {
      figH: fig.getBoundingClientRect().height,
      headH: head.getBoundingClientRect().height,
      preH: pre.getBoundingClientRect().height,
      preScrollH: pre.scrollHeight,
      codeH: pre.querySelector('code').getBoundingClientRect().height,
      demoH: demo.getBoundingClientRect().height,
      figStyle: { display: getComputedStyle(fig).display, height: getComputedStyle(fig).height },
      preStyleH: getComputedStyle(pre).height,
      preMinH: getComputedStyle(pre).minHeight,
      demoAlign: getComputedStyle(demo).alignItems,
      gridAlign: getComputedStyle(fig.closest('.ds-code-grid')).alignItems,
      figFlex: getComputedStyle(fig).flex,
      extraChildren: fig.children.length,
      preLineCount: pre.querySelectorAll('.line').length,
      preTextLen: pre.textContent.length,
    };
  });
  console.log(JSON.stringify(d, null, 2));
  await browser.close();
})();
