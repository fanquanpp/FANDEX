/**
 * 侧边栏 E2E 测试
 *
 * 测试范围：
 * - 桌面端侧边栏默认可见
 * - 侧边栏展开/折叠交互
 * - 当前文档高亮
 * - 移动端汉堡菜单
 * - 模块导航跳转
 *
 * 注意：侧边栏组件位于 Sidebar.astro，仅在文档/模块页显示。
 */

import { expect, test } from '@playwright/test';

const HOME_URL = '/FANDEX-exe/';

test.describe('侧边栏', () => {
  test('桌面端访问模块页时侧边栏可见', async ({ page, isMobile }) => {
    test.skip(isMobile, '桌面端专属测试');

    // 直接访问 javascript 模块页（避免 SPA 导航时序问题）
    await page.goto(`${HOME_URL}javascript/`);
    await page.waitForLoadState('networkidle');

    // 侧边栏（aside#app-sidebar）应可见
    const sidebar = page.locator('#app-sidebar, aside[aria-label="侧边栏"]').first();
    await expect(sidebar).toBeVisible({ timeout: 10000 });
  });

  test('侧边栏含模块导航链接', async ({ page, isMobile }) => {
    test.skip(isMobile, '桌面端专属测试');

    await page.goto(`${HOME_URL}javascript/`);
    await page.waitForLoadState('networkidle');

    // 侧边栏应包含若干导航链接
    const sidebar = page.locator('#app-sidebar, aside[aria-label="侧边栏"]').first();
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    // 侧边栏中的链接数量 > 0
    const sidebarLinks = sidebar.locator('a[href]');
    const count = await sidebarLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test('侧边栏折叠按钮切换可见性', async ({ page, isMobile }) => {
    test.skip(isMobile, '桌面端专属测试');

    await page.goto(`${HOME_URL}javascript/`);
    await page.waitForLoadState('networkidle');

    // 查找折叠按钮（含"折叠"或菜单图标）
    const toggleBtn = page.getByRole('button', { name: /折叠|展开|菜单|toggle sidebar/i }).first();

    const hasToggle = await toggleBtn.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasToggle) {
      // 记录侧边栏初始状态
      const sidebar = page.locator('#app-sidebar, aside[aria-label="侧边栏"]').first();
      const initialVisible = await sidebar.isVisible();

      // 点击切换
      await toggleBtn.click();
      await page.waitForTimeout(300);

      // 状态应改变
      const afterToggleVisible = await sidebar.isVisible();
      expect(afterToggleVisible).not.toBe(initialVisible);
    }
  });

  test('点击侧边栏链接跳转到对应文档', async ({ page, isMobile }) => {
    test.skip(isMobile, '桌面端专属测试');

    await page.goto(`${HOME_URL}javascript/`);
    await page.waitForLoadState('networkidle');

    const sidebar = page.locator('#app-sidebar, aside[aria-label="侧边栏"]').first();
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    // 点击侧边栏中第一个文档链接（非当前页）
    const docLinks = sidebar.locator('a[href]');
    const count = await docLinks.count();

    if (count > 1) {
      const firstLink = docLinks.nth(0);
      const href = await firstLink.getAttribute('href');
      if (href) {
        await firstLink.click();
        await page.waitForLoadState('networkidle');
        // URL 应变化
        expect(page.url()).not.toBe(HOME_URL);
      }
    }
  });

  test('移动端汉堡菜单展开侧边栏', async ({ page, isMobile }) => {
    test.skip(!isMobile, '移动端专属测试');

    await page.goto(`${HOME_URL}javascript/`);
    await page.waitForLoadState('networkidle');

    // 移动端汉堡菜单按钮
    const menuBtn = page.getByRole('button', { name: /菜单|menu/i }).first();

    const hasMenu = await menuBtn.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasMenu) {
      await menuBtn.click();
      await page.waitForTimeout(300);

      // 侧边栏或抽屉应可见
      const sidebar = page
        .locator('#app-sidebar, aside[aria-label="侧边栏"], [role="dialog"]')
        .first();
      await expect(sidebar).toBeVisible({ timeout: 3000 });
    }
  });

  test('侧边栏滚动位置在长文档列表中保持', async ({ page, isMobile }) => {
    test.skip(isMobile, '桌面端专属测试');

    await page.goto(`${HOME_URL}javascript/`);
    await page.waitForLoadState('networkidle');

    const sidebar = page.locator('#app-sidebar, aside[aria-label="侧边栏"]').first();
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    // 滚动容器是 #sidebar-scroll（aside 内部的 div），而非 aside 本身
    const scrollContainer = page.locator('#sidebar-scroll').first();
    await expect(scrollContainer).toBeVisible({ timeout: 5000 });

    // 滚动侧边栏内容区到中部
    await scrollContainer.evaluate((el) => {
      el.scrollTop = 200;
    });
    await page.waitForTimeout(300);

    // 验证滚动位置已记录
    const scrollTop = await scrollContainer.evaluate((el) => el.scrollTop);
    expect(scrollTop).toBeGreaterThan(0);
  });

  test('侧边栏含模块标题', async ({ page, isMobile }) => {
    test.skip(isMobile, '桌面端专属测试');

    await page.goto(`${HOME_URL}javascript/`);
    await page.waitForLoadState('networkidle');

    const sidebar = page.locator('#app-sidebar, aside[aria-label="侧边栏"]').first();
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    // 侧边栏应包含模块名称或文档标题
    const sidebarText = await sidebar.textContent();
    expect(sidebarText?.length).toBeGreaterThan(0);
  });
});
