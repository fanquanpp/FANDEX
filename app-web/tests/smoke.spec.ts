import { expect, test, type Page } from '@playwright/test';

function trackPageErrors(page: Page): Error[] {
  const errors: Error[] = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

test('首页渲染：标题、入口按钮与模块卡片', async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto('/FANDEX/');
  await expect(page).toHaveTitle(/FANDEX/i);
  await expect(page.locator('a.entry-btn', { hasText: '语法速览' })).toBeVisible();
  await expect(page.locator('a.entry-btn', { hasText: '学习路线' })).toBeVisible();
  expect(await page.locator('a.entry-btn').count()).toBeGreaterThanOrEqual(3);
  expect(errors, '首页不应有未捕获异常').toEqual([]);
});

test('模块页渲染：文档列表可见', async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto('/FANDEX/algorithm/');
  await expect(page.locator('h1').first()).toBeVisible();
  expect(errors, '模块页不应有未捕获异常').toEqual([]);
});

test('文档页渲染：正文容器、侧栏与目录', async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto('/FANDEX/algorithm/290-NetworkFlow/');
  await expect(page.locator('#doc-root')).toBeVisible();
  await expect(page.locator('aside').first()).toBeVisible();
  expect(errors, '文档页不应有未捕获异常').toEqual([]);
});

test('公式 MathML 渲染守卫（KaTeX output:mathml）', async ({ page }) => {
  await page.goto('/FANDEX/algorithm/290-NetworkFlow/');
  const mathCount = await page.locator('.katex math').count();
  expect(mathCount, '该页含数十条公式，mathml 输出不应为空').toBeGreaterThan(10);
  const blockCount = await page.locator('.katex math[display="block"]').count();
  expect(blockCount, '块级公式应存在').toBeGreaterThan(0);
});

test('语法速览：React 岛屿挂载', async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto('/FANDEX/syntax/');
  await expect(page.locator('astro-island').first()).toBeAttached();
  expect(errors, '语法速览页不应有未捕获异常').toEqual([]);
});

test('在线前端工作台：FrontendLab 冒烟', async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto('/FANDEX/playground/');
  await expect(page.locator('.pg-toolbar')).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(2_000);
  expect(errors, '工作台不应有未捕获异常（FrontendLab 冒烟守卫）').toEqual([]);
});
