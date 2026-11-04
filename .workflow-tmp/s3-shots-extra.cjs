const { chromium } = require('C:/Atian/Project/FANDEX/app-web/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const shots = 'C:/Atian/Project/FANDEX/.workflow-tmp/shots';
  // 文档页：375 移动 + 恰 768 断点，明暗两套
  for (const [name, w, h] of [['mobile', 375, 1700], ['w768', 768, 900]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    await page.goto('http://localhost:4399/FANDEX/markdown/090-CodeBlockSyntaxHighlight/', { waitUntil: 'load' });
    await page.evaluate(async () => {
      try {
        (await navigator.serviceWorker.getRegistrations()).forEach((r) => r.unregister());
        (await caches.keys()).forEach((k) => caches.delete(k));
      } catch (e) {}
    });
    const fig = page.locator('figure.code-block').first();
    await fig.scrollIntoViewIfNeeded();
    await fig.screenshot({ path: shots + '/s3-doc-' + name + '-light.png' });
    await page.evaluate(() => {
      localStorage.setItem('fandex-theme', 'dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    await page.waitForTimeout(250);
    await fig.screenshot({ path: shots + '/s3-doc-' + name + '-dark.png' });
    await ctx.close();
  }
  // 设计系统标本区：移动 375 明暗
  const ctx = await browser.newContext({ viewport: { width: 375, height: 1700 } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:4399/FANDEX/design-system/', { waitUntil: 'load' });
  const grid = page.locator('.ds-code-grid');
  await grid.scrollIntoViewIfNeeded();
  await grid.screenshot({ path: shots + '/s3-ds-mobile-light.png' });
  await page.evaluate(() => {
    localStorage.setItem('fandex-theme', 'dark');
    document.documentElement.setAttribute('data-theme', 'dark');
  });
  await page.waitForTimeout(250);
  await grid.screenshot({ path: shots + '/s3-ds-mobile-dark.png' });
  await ctx.close();
  await browser.close();
  console.log('shots done');
})();
