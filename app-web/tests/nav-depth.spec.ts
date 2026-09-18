/**
 * 子级功能页入口扁平化回归（2026-09-19 导航深度优化）
 * -----------------------------------------------------------------------------
 * 背景：文档页（Layout 布局）此前无任何子级功能页可见入口，唯一通路是
 * 回首页找 hero 入口，入口深度过高。
 * 1. 桌面文档页（≥768px）：顶栏常驻四个功能直达链接，且链接真实可达
 * 2. 窄屏文档页（<768px）：底部导航「功能」按钮唤起直达面板
 *    （含题图鉴次级页直达），Esc 与遮罩均可关闭
 * -----------------------------------------------------------------------------
 */
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
  // 直达链接逐一探活：静态 preview 下所有子功能页都应 200
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
  // 初始为关闭态（面板无 is-open 类）
  await expect(sheet).not.toHaveClass(/is-open/);
  // 唤起后共 5 个直达项：四个顶级功能 + 题图鉴次级页（绕过父级页中转）
  await btn.click();
  await expect(sheet).toHaveClass(/is-open/);
  expect(await sheet.locator('.feature-sheet__link').count()).toBe(5);
  await expect(sheet.locator('a', { hasText: '算法题图鉴' })).toBeVisible();
  // Esc 关闭
  await page.keyboard.press('Escape');
  await expect(sheet).not.toHaveClass(/is-open/);
  // 再唤起，点遮罩关闭
  await btn.click();
  await expect(sheet).toHaveClass(/is-open/);
  await page.locator('#feature-sheet-backdrop').click({ position: { x: 10, y: 10 } });
  await expect(sheet).not.toHaveClass(/is-open/);
});
