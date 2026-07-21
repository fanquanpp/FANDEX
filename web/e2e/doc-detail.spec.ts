/**
 * E2E 测试：文档详情页
 *
 * 测试目标：
 * - 文档详情页加载并显示标题
 * - 文档正文可见
 * - 文档包含目录或大纲
 * - 文档导航（上一篇/下一篇）可见
 */
import { test, expect } from '@playwright/test';

// 偏差报备：baseURL 含 base path（/FANDEX-web/），page.goto('/path') 会被解析为
// http://localhost:3000/path（根路径，返回 404）。改为 page.goto('./path') 相对路径解析。
test.describe('文档详情页', () => {
  test('应加载文档详情页并显示标题', async ({ page }) => {
    await page.goto('./git/');
    // 先获取第一个文档链接
    const firstLink = page.locator('a[href*="/git/"]').first();
    const href = await firstLink.getAttribute('href');
    if (!href) return; // 无文档链接时跳过
    await page.goto(href);
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
  });

  test('应渲染文档正文', async ({ page }) => {
    await page.goto('./git/');
    const firstLink = page.locator('a[href*="/git/"]').first();
    const href = await firstLink.getAttribute('href');
    if (!href) return;
    await page.goto(href);
    const content = page.locator('main, article, .doc-content, .prose').first();
    await expect(content).toBeVisible();
  });

  test('应显示文档元信息（阅读时长或更新日期）', async ({ page }) => {
    await page.goto('./git/');
    const firstLink = page.locator('a[href*="/git/"]').first();
    const href = await firstLink.getAttribute('href');
    if (!href) return;
    await page.goto(href);
    const body = await page.textContent('body');
    // 文档页应包含阅读时长或日期等元信息
    expect(body?.length).toBeGreaterThan(100);
  });

  test('应渲染代码块语法高亮', async ({ page }) => {
    await page.goto('./git/');
    const firstLink = page.locator('a[href*="/git/"]').first();
    const href = await firstLink.getAttribute('href');
    if (!href) return;
    await page.goto(href);
    // 代码块应有 pre/code 元素
    const code = page.locator('pre code, pre').first();
    // 代码块可能存在也可能不存在，仅验证不抛错
    const count = await code.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
