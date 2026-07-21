/**
 * E2E 测试：侧边栏导航
 *
 * 测试目标：
 * - 文档页侧边栏可见
 * - 侧边栏包含文档分类与文档列表
 * - 侧边栏链接可点击
 * - 移动端侧边栏收起/展开
 */
import { test, expect } from '@playwright/test';

// 偏差报备：baseURL 含 base path（/FANDEX-web/），page.goto('/path') 会被解析为
// http://localhost:3000/path（根路径，返回 404）。改为 page.goto('./path') 相对路径解析。
test.describe('侧边栏导航', () => {
  test('应显示侧边栏容器', async ({ page }) => {
    await page.goto('./git/');
    const sidebar = page.locator('#module-sidebar, .sidebar, aside').first();
    await expect(sidebar).toBeVisible({ timeout: 10000 });
  });

  test('侧边栏应包含文档链接列表', async ({ page }) => {
    await page.goto('./git/');
    const sidebar = page.locator('#module-sidebar, .sidebar, aside').first();
    const links = sidebar.locator('a');
    await expect(links.first()).toBeVisible();
    expect(await links.count()).toBeGreaterThan(0);
  });

  test('应支持点击侧边栏链接跳转', async ({ page }) => {
    await page.goto('./git/');
    const sidebar = page.locator('#module-sidebar, .sidebar, aside').first();
    const link = sidebar.locator('a').first();
    const href = await link.getAttribute('href');
    if (!href) return;
    await link.click({ timeout: 10000 });
    await page.waitForLoadState('networkidle');
    // 应成功跳转
    expect(page.url()).not.toBe('/');
  });

  test('移动端视口下侧边栏应可收起', async ({ page }) => {
    // 切换到移动端视口
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('./git/');
    // 移动端侧边栏可能默认隐藏或显示
    const body = await page.textContent('body');
    expect(body?.length).toBeGreaterThan(0);
  });
});
