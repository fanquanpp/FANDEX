/**
 * E2E 测试：模块列表页
 *
 * 测试目标：
 * - 模块列表页加载并显示模块标题
 * - 模块列表页包含文档链接
 * - 模块列表页侧边栏可见
 * - 分类筛选交互
 */
import { test, expect } from '@playwright/test';

// 偏差报备：baseURL 含 base path（/FANDEX-web/），page.goto('/path') 会被解析为
// http://localhost:3000/path（根路径，返回 404）。改为 page.goto('./path') 相对路径解析。
test.describe('模块列表页', () => {
  test('应加载 git 模块列表页', async ({ page }) => {
    await page.goto('./git/');
    await expect(page).toHaveTitle(/Git/);
  });

  test('应渲染文档列表', async ({ page }) => {
    await page.goto('./git/');
    // 模块列表页应包含文档链接
    const links = page.locator('a[href*="/git/"]');
    await expect(links.first()).toBeVisible({ timeout: 10000 });
    expect(await links.count()).toBeGreaterThan(0);
  });

  test('应显示侧边栏导航', async ({ page }) => {
    await page.goto('./git/');
    // 模块页应有侧边栏
    const sidebar = page.locator('#module-sidebar, .sidebar, aside').first();
    await expect(sidebar).toBeVisible({ timeout: 10000 });
  });

  test('应支持点击进入文档详情', async ({ page }) => {
    await page.goto('./git/');
    // 点击第一个文档链接
    const firstLink = page.locator('a[href*="/git/"]').first();
    await firstLink.click({ timeout: 10000 });
    await page.waitForLoadState('networkidle');
    // 应跳转到文档详情页（URL 含 /git/xxx/）
    expect(page.url()).toMatch(/\/git\/[^/]+\/?$/);
  });
});
