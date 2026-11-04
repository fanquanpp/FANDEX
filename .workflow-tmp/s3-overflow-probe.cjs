const { chromium } = require('C:/Atian/Project/FANDEX/app-web/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:4399/FANDEX/markdown/090-CodeBlockSyntaxHighlight/', { waitUntil: 'load' });
  const d = await page.evaluate(() => {
    const block = document.querySelector('figure.code-block');
    const pre = block.querySelector('pre');
    const code = block.querySelector('pre code');
    const span = document.createElement('span');
    span.textContent = 'x'.repeat(400);
    span.style.whiteSpace = 'nowrap';
    code.appendChild(span);
    const before = {
      preWs: pre.style.whiteSpace,
      preOw: pre.style.overflowWrap,
      preOx: pre.style.overflowX,
      preScrollW: pre.scrollWidth,
      preClientW: pre.clientWidth,
      codeScrollW: code.scrollWidth,
      codeDisplay: getComputedStyle(code).display,
      blockOverflow: getComputedStyle(block).overflow,
    };
    pre.style.whiteSpace = 'pre';
    pre.style.overflowWrap = 'normal';
    pre.style.wordWrap = 'normal';
    pre.dispatchEvent(new Event('scroll'));
    const after = {
      preScrollW: pre.scrollWidth,
      preClientW: pre.clientWidth,
      marked: block.classList.contains('has-overflow'),
      inlineStyle: pre.getAttribute('style').slice(0, 160),
    };
    span.remove();
    return { before, after };
  });
  console.log(JSON.stringify(d, null, 2));
  await browser.close();
})();
