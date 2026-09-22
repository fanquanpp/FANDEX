import { expect, test } from '@playwright/test';

const DOC_PAGE = '/FANDEX/algorithm/290-NetworkFlow/';
const TOP_ENTRIES = ['在线前端', '语法速览', '学习路线', '算法教学'];

test('文档页顶栏功能直达链接（≥768px）', async ({ page }) => {
  const errors: Error[] = [];
  page.on('pageerror', (err) => errors.push(err));
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(DOC_PAGE);
  const links = page.locator('.header-feature-links .header-feature-link');
  await expect(page.locator('.header-feature-links')).toBeVisible();
  expect(await links.count()).toBe(4);
  for (const name of TOP_ENTRIES) {
    await expect(links.filter({ hasText: name })).toBeVisible();
  }
  const hrefs = await links.evaluateAll((els) =>
    els.map((el) => (el as HTMLAnchorElement).href),
  );
  expect(hrefs).toHaveLength(4);
  for (const href of hrefs) {
    const resp = await page.request.get(href);
    expect(resp.ok(), `直达链接应可达: ${href}`).toBeTruthy();
  }
  expect(errors, '文档页不应有未捕获异常').toEqual([]);
});

test('窄屏功能直达面板：唤起、次级页直达与双通道关闭', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 720 });
  await page.goto(DOC_PAGE);
  const btn = page.locator('#mobile-features-btn');
  const sheet = page.locator('#feature-sheet');
  await expect(btn).toBeVisible();
  await expect(sheet).not.toHaveClass(/is-open/);
  await btn.click();
  await expect(sheet).toHaveClass(/is-open/);
  expect(await sheet.locator('.feature-sheet__link').count()).toBe(5);
  await expect(sheet.locator('a', { hasText: '算法题图鉴' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(sheet).not.toHaveClass(/is-open/);
  await btn.click();
  await expect(sheet).toHaveClass(/is-open/);
  await page.locator('#feature-sheet-backdrop').click({ position: { x: 10, y: 10 } });
  await expect(sheet).not.toHaveClass(/is-open/);
});
