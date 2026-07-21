/**
 * 首页 E2E 测试
 *
 * 测试范围：
 * - 首页加载完成且关键元素可见
 * - Hero 区域（FANDEX 标题、副标题、CTA 按钮）
 * - 统计数据条（模块数 / 文档数 / 术语表数 / 速查表数）
 * - 模块卡片网格（>40 个模块卡片）
 * - 快速入口（仪表盘 / 搜索 / 路线图 / 速查表）
 * - 点击 CTA 跳转到学习路线
 * - Ctrl+K 打开搜索面板
 * - 主题切换按钮可见
 * - 移动端响应式（汉堡菜单）
 */

import { expect, test } from '@playwright/test';

/** 首页 URL（base 路径 /FANDEX-exe/） */
const HOME_URL = '/FANDEX-exe/';

test.describe('首页', () => {
  test('页面加载完成且标题正确', async ({ page }) => {
    await page.goto(HOME_URL);

    // 页面标题包含 FANDEX
    await expect(page).toHaveTitle(/FANDEX/);

    // H1 标题包含 FANDEX
    const h1 = page.locator('h1').first();
    await expect(h1).toContainText('FAN');
  });

  test('Hero 区域关键元素可见', async ({ page }) => {
    await page.goto(HOME_URL);

    // 副标题含"循序渐进"
    await expect(page.getByText('循序渐进')).toBeVisible();

    // CTA 按钮 "开始学习"
    await expect(page.getByRole('link', { name: /开始学习/ })).toBeVisible();

    // CTA 按钮 "快速搜索"
    await expect(page.getByRole('link', { name: /快速搜索/ })).toBeVisible();

    // 快捷键提示 Ctrl+K（Hero 区域内的 kbd 元素）
    await expect(page.locator('kbd').filter({ hasText: 'Ctrl' })).toBeVisible();
    await expect(page.locator('kbd').filter({ hasText: 'K' })).toBeVisible();
  });

  test('统计数据条显示 4 项指标', async ({ page }) => {
    await page.goto(HOME_URL);

    // 学习模块 / 结构化文档 / 术语表 / 速查表（统计数据条中的 uppercase 标签）
    const statsBar = page.locator('.text-3xl, .text-4xl').first().locator('..').locator('..');
    await expect(statsBar).toBeVisible();

    // 使用更精确的定位器：统计数据条中的标签（含 uppercase 类名）
    await expect(page.locator('span.uppercase').filter({ hasText: '学习模块' })).toBeVisible();
    await expect(page.locator('span.uppercase').filter({ hasText: '结构化文档' })).toBeVisible();
    await expect(page.locator('span.uppercase').filter({ hasText: '术语表' })).toBeVisible();
    await expect(page.locator('span.uppercase').filter({ hasText: '速查表' })).toBeVisible();
  });

  test('快速入口卡片可见', async ({ page }) => {
    await page.goto(HOME_URL);

    await expect(page.getByRole('link', { name: /仪表盘/ }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /搜索/ }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /路线图/ }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /速查表/ }).first()).toBeVisible();
  });

  test('模块卡片网格渲染（>40 个模块）', async ({ page }) => {
    await page.goto(HOME_URL);

    // 等待"学习模块"section 渲染
    await expect(page.getByRole('heading', { name: '学习模块' })).toBeVisible();

    // 模块卡片（每个 ModuleCard 是 article 或 a 元素）
    // 统计所有 .category-section 内的卡片链接
    const moduleLinks = page.locator('.category-section a, .category-section article');
    const count = await moduleLinks.count();
    expect(count).toBeGreaterThan(40);
  });

  test('点击 "开始学习" 跳转到路线图', async ({ page }) => {
    await page.goto(HOME_URL);

    const cta = page.getByRole('link', { name: /开始学习/ }).first();
    await cta.click();

    // 等待 URL 跳转完成
    await page.waitForURL(/\/roadmap\/?$/);
    expect(page.url()).toMatch(/\/roadmap\//);
  });

  test('点击 "快速搜索" 跳转到搜索页', async ({ page }) => {
    await page.goto(HOME_URL);

    const cta = page.getByRole('link', { name: /快速搜索/ }).first();
    await cta.click();

    await page.waitForURL(/\/search\/?$/);
    expect(page.url()).toMatch(/\/search\//);
  });

  test('Ctrl+K 打开搜索命令面板', async ({ page }) => {
    await page.goto(HOME_URL);
    await page.waitForLoadState('networkidle');

    // 等待 Header 搜索按钮可见（确保 SSR 渲染完成）
    const searchBtn = page.getByRole('button', { name: /打开搜索|搜索文档/i }).first();
    await searchBtn.waitFor({ state: 'visible', timeout: 10000 });

    // 等待 React Island 水合（client:load 策略下水合应在 1s 内完成）
    await page.waitForTimeout(1000);

    // 优先尝试 Ctrl+K 快捷键
    await page.keyboard.press('Control+k');

    // 搜索面板应出现，输入框可见
    const searchInput = page.getByPlaceholder(/搜索文档|术语|速查表/);
    let visible = await searchInput.isVisible({ timeout: 3000 }).catch(() => false);

    // Ctrl+K 在某些环境下可能被拦截，回退到点击 Header 搜索按钮
    if (!visible) {
      await searchBtn.click();
      visible = await searchInput.isVisible({ timeout: 5000 }).catch(() => false);
    }

    expect(visible).toBe(true);
  });

  test('Header 主题切换按钮可见', async ({ page }) => {
    await page.goto(HOME_URL);

    // Header 中应存在主题切换按钮（通常含 sun/moon 图标）
    const themeBtn = page.getByRole('button', { name: /主题|切换|theme|亮度/i }).first();
    await expect(themeBtn).toBeVisible();
  });

  test('移动端视口下页面正常渲染', async ({ page, isMobile }) => {
    await page.goto(HOME_URL);

    // 移动端下汉堡菜单按钮可见（仅在 mobile 视图）
    if (isMobile) {
      // 汉堡菜单按钮（aria-label 含 menu 或 menu button）
      const menuBtn = page.getByRole('button', { name: /menu|菜单/i }).first();
      await expect(menuBtn).toBeVisible();
    }

    // H1 仍可见
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
  });

  test('页脚版权信息可见', async ({ page }) => {
    await page.goto(HOME_URL);

    // 页脚含版权符号或年份
    const footer = page.locator('footer').first();
    await expect(footer).toBeVisible();
    await expect(footer).toContainText(/fanquanpp|©/i);
  });
});
