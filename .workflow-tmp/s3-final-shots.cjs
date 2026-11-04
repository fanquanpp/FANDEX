const { chromium } = require('C:/Atian/Project/FANDEX/app-web/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const shots = 'C:/Atian/Project/FANDEX/.workflow-tmp/shots';
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:4399/FANDEX/design-system/', { waitUntil: 'load' });
  await page.evaluate(async () => {
    try {
      (await navigator.serviceWorker.getRegistrations()).forEach((r) => r.unregister());
      (await caches.keys()).forEach((k) => caches.delete(k));
    } catch (e) {}
  });
  const grid = page.locator('.ds-code-grid');
  await grid.scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    localStorage.setItem('fandex-theme', 'light');
    document.documentElement.setAttribute('data-theme', 'light');
  });
  await page.waitForTimeout(300);
  await grid.screenshot({ path: shots + '/s3-final-grid-light.png' });
  await page.evaluate(() => {
    localStorage.setItem('fandex-theme', 'dark');
    document.documentElement.setAttribute('data-theme', 'dark');
  });
  await page.waitForTimeout(300);
  await grid.screenshot({ path: shots + '/s3-final-grid-dark.png' });
  // 文档页首块特写（明暗）
  await page.goto('http://localhost:4399/FANDEX/markdown/090-CodeBlockSyntaxHighlight/', { waitUntil: 'load' });
  const fig = page.locator('figure.code-block').first();
  await fig.scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    localStorage.setItem('fandex-theme', 'light');
    document.documentElement.setAttribute('data-theme', 'light');
  });
  await page.waitForTimeout(300);
  await fig.screenshot({ path: shots + '/s3-final-doc-light.png' });
  await page.evaluate(() => {
    localStorage.setItem('fandex-theme', 'dark');
    document.documentElement.setAttribute('data-theme', 'dark');
  });
  await page.waitForTimeout(300);
  await fig.screenshot({ path: shots + '/s3-final-doc-dark.png' });
  await ctx.close();
  await browser.close();
  console.log('final shots done');
})();
