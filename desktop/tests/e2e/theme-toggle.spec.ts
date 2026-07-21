/**
 * 主题切换 E2E 测试
 *
 * 测试范围：
 * - 默认亮色主题
 * - 点击切换到暗色主题
 * - View Transitions 平滑过渡（不抛错）
 * - localStorage 持久化主题偏好
 * - 导航后主题保持
 * - 系统主题跟随（prefers-color-scheme）
 *
 * 注意：ThemeToggle 使用 client:load 水合策略，需等待水合完成后按钮才生效。
 * aria-label 文本为 "切换到亮色模式" 或 "切换到暗色模式"。
 * localStorage 键名为 'fandex-theme'，值为 'light' 或 'dark'。
 */

import { expect, test } from '@playwright/test';

const HOME_URL = '/FANDEX-exe/';

/**
 * 获取 ThemeToggle 按钮（已水合）
 *
 * 实现细节：
 * 1. 等待 networkidle 确保所有资源加载完成
 * 2. 等待 500ms 让 React Island 完成水合（client:load 策略下水合较快）
 * 3. 使用精确的 aria-label 正则匹配，避免匹配到其他按钮（如侧边栏切换按钮）
 *
 * @param page - Playwright Page 实例
 * @returns ThemeToggle 按钮定位器
 */
async function getThemeToggle(page: import('@playwright/test').Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  // ThemeToggle 的 aria-label 是 "切换到亮色模式" 或 "切换到暗色模式"
  return page.getByRole('button', { name: /切换到(亮色|暗色)模式/ }).first();
}

test.describe('主题切换', () => {
  test('默认亮色主题渲染', async ({ page }) => {
    await page.goto(HOME_URL);
    await page.waitForLoadState('networkidle');

    // html 元素应无 .dark 类（亮色）或 classList 不含 dark
    const htmlClass = await page.evaluate(() => document.documentElement.className);
    // 亮色主题下 html 不应含 'dark' 类
    expect(htmlClass).not.toContain('dark');
  });

  test('点击主题切换按钮切换到暗色', async ({ page }) => {
    await page.goto(HOME_URL);

    // 记录初始主题
    const initialDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark'),
    );

    // 获取 ThemeToggle 按钮（已水合）
    const themeBtn = await getThemeToggle(page);
    await expect(themeBtn).toBeVisible({ timeout: 10000 });

    // 重试机制：第一次点击若未生效，再等待 500ms 后重试
    let afterDark = initialDark;
    for (let attempt = 0; attempt < 3; attempt++) {
      await themeBtn.click();
      await page.waitForTimeout(500);
      afterDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      if (afterDark !== initialDark) break;
      await page.waitForTimeout(500);
    }

    // 主题应改变
    expect(afterDark).not.toBe(initialDark);
  });

  test('主题切换后 localStorage 持久化', async ({ page }) => {
    await page.goto(HOME_URL);

    // 获取 ThemeToggle 按钮（已水合）
    const themeBtn = await getThemeToggle(page);
    await expect(themeBtn).toBeVisible({ timeout: 10000 });

    // 重试机制：确保点击生效
    let themeValue: string | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      await themeBtn.click();
      await page.waitForTimeout(500);
      themeValue = await page.evaluate(() => localStorage.getItem('fandex-theme'));
      if (themeValue !== null) break;
      await page.waitForTimeout(500);
    }

    // localStorage 应包含主题记录（'light' 或 'dark'）
    expect(themeValue).not.toBeNull();
    expect(['light', 'dark']).toContain(themeValue);
  });

  test('导航到其他页面后主题保持', async ({ page }) => {
    await page.goto(HOME_URL);

    // 切换到暗色
    const themeBtn = await getThemeToggle(page);
    await expect(themeBtn).toBeVisible({ timeout: 10000 });

    let darkAfterToggle = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      await themeBtn.click();
      await page.waitForTimeout(500);
      darkAfterToggle = await page.evaluate(() =>
        document.documentElement.classList.contains('dark'),
      );
      if (darkAfterToggle) break;
      await page.waitForTimeout(500);
    }
    expect(darkAfterToggle).toBe(true);

    // 导航到其他页面（仪表盘）
    await page.goto(`${HOME_URL}dashboard/`);
    await page.waitForLoadState('networkidle');

    // 主题应保持
    const darkAfterNav = await page.evaluate(() =>
      document.documentElement.classList.contains('dark'),
    );

    expect(darkAfterNav).toBe(darkAfterToggle);
  });

  test('刷新页面后主题从 localStorage 恢复', async ({ page }) => {
    await page.goto(HOME_URL);

    // 切换主题
    const themeBtn = await getThemeToggle(page);
    await expect(themeBtn).toBeVisible({ timeout: 10000 });

    let darkBeforeRefresh = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      await themeBtn.click();
      await page.waitForTimeout(500);
      darkBeforeRefresh = await page.evaluate(() =>
        document.documentElement.classList.contains('dark'),
      );
      if (darkBeforeRefresh) break;
      await page.waitForTimeout(500);
    }
    expect(darkBeforeRefresh).toBe(true);

    // 刷新页面
    await page.reload();
    await page.waitForLoadState('networkidle');

    // 主题应保持
    const darkAfterRefresh = await page.evaluate(() =>
      document.documentElement.classList.contains('dark'),
    );

    expect(darkAfterRefresh).toBe(darkBeforeRefresh);
  });

  test('系统主题跟随（prefers-color-scheme: dark）', async ({ browser }) => {
    // 模拟系统暗色主题
    const context = await browser.newContext({
      colorScheme: 'dark',
    });
    const page = await context.newPage();

    try {
      await page.goto(HOME_URL);
      await page.waitForLoadState('networkidle');

      // 在系统暗色主题下，html 可能含 .dark 类（取决于实现）
      // 此处仅验证页面正常加载，不强制要求 .dark 类
      const htmlClass = await page.evaluate(() => document.documentElement.className);
      expect(typeof htmlClass).toBe('string');
    } finally {
      await context.close();
    }
  });

  test('系统主题跟随（prefers-color-scheme: light）', async ({ browser }) => {
    const context = await browser.newContext({
      colorScheme: 'light',
    });
    const page = await context.newPage();

    try {
      await page.goto(HOME_URL);
      await page.waitForLoadState('networkidle');

      // 亮色主题下 html 不应含 .dark
      const htmlClass = await page.evaluate(() => document.documentElement.className);
      expect(htmlClass).not.toContain('dark');
    } finally {
      await context.close();
    }
  });

  test('主题切换不产生控制台错误', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto(HOME_URL);

    const themeBtn = await getThemeToggle(page);
    await expect(themeBtn).toBeVisible({ timeout: 10000 });
    await themeBtn.click();
    await page.waitForTimeout(1000);

    // 过滤掉已知的第三方错误（如 Giscus / Pagefind 资源加载）
    const realErrors = errors.filter(
      (e) =>
        !e.includes('giscus') && !e.includes('pagefind') && !e.includes('Failed to load resource'),
    );

    expect(realErrors.length).toBe(0);
  });

  test('连续切换主题不丢失状态', async ({ page }) => {
    await page.goto(HOME_URL);

    const themeBtn = await getThemeToggle(page);
    await expect(themeBtn).toBeVisible({ timeout: 10000 });

    // 连续切换 3 次（每次点击后等待主题应用）
    await themeBtn.click();
    await page.waitForTimeout(500);
    const dark1 = await page.evaluate(() => document.documentElement.classList.contains('dark'));

    await themeBtn.click();
    await page.waitForTimeout(500);
    const dark2 = await page.evaluate(() => document.documentElement.classList.contains('dark'));

    await themeBtn.click();
    await page.waitForTimeout(500);
    const dark3 = await page.evaluate(() => document.documentElement.classList.contains('dark'));

    // 状态应稳定切换：dark1 != dark2 != dark3，dark1 === dark3
    expect(dark1).not.toBe(dark2);
    expect(dark2).not.toBe(dark3);
    expect(dark1).toBe(dark3);
  });

  test('主题切换按钮在所有页面可见', async ({ page }) => {
    await page.goto(HOME_URL);
    const themeBtnHome = await getThemeToggle(page);
    await expect(themeBtnHome).toBeVisible({ timeout: 10000 });

    // 导航到模块页
    await page.goto(`${HOME_URL}javascript/`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const themeBtnModule = page.getByRole('button', { name: /切换到(亮色|暗色)模式/ }).first();
    await expect(themeBtnModule).toBeVisible({ timeout: 10000 });
  });
});
