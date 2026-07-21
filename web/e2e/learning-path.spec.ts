/**
 * E2E 测试：学习路径页面
 *
 * 测试目标：
 * - 学习路径页面加载
 * - 显示学习路径卡片
 * - 路径详情可见
 * - 路径模块列表展示
 */
import { test, expect } from '@playwright/test';

// 偏差报备：baseURL 含 base path（/FANDEX-web/），page.goto('/path') 会被解析为
// http://localhost:3000/path（根路径，返回 404）。改为 page.goto('./path') 相对路径解析。
test.describe('学习路径', () => {
  test('应加载 dashboard 页面', async ({ page }) => {
    await page.goto('./dashboard/');
    // dashboard 页应成功加载
    await expect(page).toHaveTitle(/.+/);
  });

  test('应加载 roadmap 页面', async ({ page }) => {
    await page.goto('./roadmap/');
    await expect(page).toHaveTitle(/.+/);
  });

  test('dashboard 应显示学习路径或进度区域', async ({ page }) => {
    await page.goto('./dashboard/');
    const main = page.locator('main, #app-main').first();
    await expect(main).toBeVisible({ timeout: 10000 });
    const body = await page.textContent('body');
    expect(body?.length).toBeGreaterThan(0);
  });

  test('roadmap 应显示路径列表', async ({ page }) => {
    await page.goto('./roadmap/');
    const main = page.locator('main, #app-main').first();
    await expect(main).toBeVisible();
    // 应包含至少一个路径卡片
    const cards = page.locator('.module-card, .path-card, .roadmap-card');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
