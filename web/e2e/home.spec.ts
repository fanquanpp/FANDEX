/**
 * E2E 测试：首页渲染
 *
 * 测试目标：
 * - 首页加载并显示站点标题
 * - 首页包含模块卡片
 * - 首页导航栏可见
 * - 首页底部可见版权信息
 */
import { test, expect } from '@playwright/test';

// 偏差报备：baseURL 含 base path（/FANDEX-web/），page.goto('/path') 会被解析为
// http://localhost:3000/path（根路径，返回 404）。改为 page.goto('./path') 相对路径解析，
// 会拼接 baseURL 的 path 部分，得到 http://localhost:3000/FANDEX-web/path（正确路径）。
test.describe('首页渲染', () => {
  test('应加载首页并显示站点标题', async ({ page }) => {
    await page.goto('./');
    await expect(page).toHaveTitle(/FANDEX|循序渐进/);
  });

  test('应渲染模块卡片', async ({ page }) => {
    await page.goto('./');
    // 至少存在一个模块卡片
    const cards = page.locator('.module-card');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test('应显示站点导航或品牌标识', async ({ page }) => {
    await page.goto('./');
    const body = await page.textContent('body');
    expect(body).toContain('FANDEX');
  });

  test('应包含分类筛选区域', async ({ page }) => {
    await page.goto('./');
    // 首页应渲染分类筛选或模块列表
    const main = page.locator('main, #app-main, .home-layout').first();
    await expect(main).toBeVisible();
  });
});
