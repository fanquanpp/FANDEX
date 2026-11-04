const { chromium } = require('C:/Atian/Project/FANDEX/app-web/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:4399/FANDEX/design-system/', { waitUntil: 'load' });
  const d = await page.evaluate(() => {
    const fig = document.querySelector('.ds-code-grid figure.code-block');
    const nodes = Array.from(fig.childNodes).map((n) => ({
      type: n.nodeType,
      name: n.nodeName,
      len: (n.textContent || '').length,
      preview: (n.textContent || '').slice(0, 60).replace(/\n/g, '\n'),
    }));
    return {
      figWhiteSpace: getComputedStyle(fig).whiteSpace,
      panelWhiteSpace: getComputedStyle(fig.closest('.ds-panel')).whiteSpace,
      pageWs: getComputedStyle(document.querySelector('.ds-page')).whiteSpace,
      nodes,
    };
  });
  console.log(JSON.stringify(d, null, 2));
  await browser.close();
})();
