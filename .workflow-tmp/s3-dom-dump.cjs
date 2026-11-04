const { chromium } = require('C:/Atian/Project/FANDEX/app-web/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:4399/FANDEX/design-system/', { waitUntil: 'load' });
  const d = await page.evaluate(() => {
    const fig = document.querySelector('.ds-code-grid figure.code-block');
    const pre = fig.querySelector('pre');
    const head = fig.querySelector('.code-block__head');
    return {
      headBottom: head.getBoundingClientRect().bottom,
      preTop: pre.getBoundingClientRect().top,
      preBottom: pre.getBoundingClientRect().bottom,
      figTop: fig.getBoundingClientRect().top,
      figBottom: fig.getBoundingClientRect().bottom,
      figPadding: getComputedStyle(fig).padding,
      preMargin: getComputedStyle(pre).margin,
      headMargin: getComputedStyle(head).margin,
      figBeforeH: getComputedStyle(fig, '::before').height,
      figAfterH: getComputedStyle(fig, '::after').height,
      figAfterContent: getComputedStyle(fig, '::after').content,
      preDisplay: getComputedStyle(pre).display,
      prePadding: getComputedStyle(pre).padding,
      html: fig.outerHTML.slice(0, 400),
    };
  });
  console.log(JSON.stringify(d, null, 2));
  await browser.close();
})();
