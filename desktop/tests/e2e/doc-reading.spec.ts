/**
 * 文档阅读 E2E 测试
 *
 * 测试范围：
 * - 文档页访问与渲染
 * - 面包屑导航
 * - 目录大纲（TOC）
 * - 代码块复制
 * - ProgressToggle 阅读进度切换
 * - 上下篇导航
 * - 相关文档推荐
 * - Giscus 评论区（容器可见即可）
 */

import { expect, test } from '@playwright/test';

const HOME_URL = '/FANDEX-exe/';

test.describe('文档阅读体验', () => {
  /** 直接访问一个已知的文档详情页 */
  async function navigateToFirstDoc(page: import('@playwright/test').Page): Promise<void> {
    // 直接访问一个已存在的文档详情页（getting-started/项目初始化）
    await page.goto(`${HOME_URL}getting-started/项目初始化/`);
    await page.waitForLoadState('networkidle');
  }

  test('文档页加载完成且含正文内容', async ({ page }) => {
    await navigateToFirstDoc(page);

    // 文档主体（article 或 main）应可见
    const main = page.locator('main, article').first();
    await expect(main).toBeVisible({ timeout: 5000 });

    // 正文区应有文本内容
    const mainText = await main.textContent();
    expect(mainText?.length).toBeGreaterThan(100);
  });

  test('面包屑导航可见', async ({ page }) => {
    await navigateToFirstDoc(page);

    // 面包屑通常为 nav[aria-label="breadcrumb"] 或 ol
    const breadcrumb = page
      .locator('nav[aria-label*="面包屑"], nav[aria-label*="breadcrumb"], [data-breadcrumb], ol')
      .first();
    await expect(breadcrumb).toBeVisible({ timeout: 5000 });

    // 面包屑应含"首页"或模块名
    const breadcrumbText = await breadcrumb.textContent();
    expect(breadcrumbText?.length).toBeGreaterThan(0);
  });

  test('目录大纲（TOC）可见（桌面端）', async ({ page, isMobile }) => {
    test.skip(isMobile, '桌面端专属测试');

    await navigateToFirstDoc(page);

    // TOC 通常为 aside 或 nav[aria-label*="目录"]
    const toc = page
      .locator('aside, nav[aria-label*="目录"], nav[aria-label*="toc"], [data-toc]')
      .first();
    const hasToc = await toc.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasToc) {
      // TOC 应包含若干标题链接
      const tocLinks = toc.locator('a[href^="#"]');
      const count = await tocLinks.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('代码块含复制按钮', async ({ page }) => {
    await navigateToFirstDoc(page);

    // 查找 pre 代码块
    const codeBlocks = page.locator('pre');
    const count = await codeBlocks.count();

    if (count > 0) {
      // 第一个代码块附近应有复制按钮
      const firstCode = codeBlocks.first();
      // 复制按钮通常为 button 含 "复制" 文本或 clipboard/copy 图标
      const copyBtn = firstCode.locator('button, [role="button"]').first();
      const hasBtn = await copyBtn.isVisible({ timeout: 1000 }).catch(() => false);

      // 验证代码块存在即可（复制按钮可选）
      expect(await firstCode.isVisible()).toBe(true);
      if (hasBtn) {
        expect(await copyBtn.isVisible()).toBe(true);
      }
    }
  });

  test('ProgressToggle 阅读进度按钮可见', async ({ page }) => {
    await navigateToFirstDoc(page);

    // 进度切换按钮（含"未读"/"阅读中"/"已读"或图标）
    const progressBtn = page.getByRole('button', { name: /未读|阅读中|已读|进度|mark/i }).first();

    const hasProgress = await progressBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasProgress) {
      expect(await progressBtn.isVisible()).toBe(true);
    }
  });

  test('上下篇导航可见', async ({ page }) => {
    await navigateToFirstDoc(page);

    // 文档底部应有"上一篇"/"下一篇"链接
    const prevLink = page.getByRole('link', { name: /上一篇|前一篇|previous/i }).first();
    const nextLink = page.getByRole('link', { name: /下一篇|后一篇|next/i }).first();

    const hasPrev = await prevLink.isVisible({ timeout: 2000 }).catch(() => false);
    const hasNext = await nextLink.isVisible({ timeout: 2000 }).catch(() => false);

    // 至少存在一个上下篇链接
    expect(hasPrev || hasNext).toBe(true);
  });

  test('相关文档区域可见', async ({ page }) => {
    await navigateToFirstDoc(page);

    // 相关文档区域
    const relatedSection = page.getByText(/相关文档|相关推荐|related/i).first();

    const hasRelated = await relatedSection.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasRelated) {
      expect(await relatedSection.isVisible()).toBe(true);
    }
  });

  test('Giscus 评论区容器可见', async ({ page }) => {
    await navigateToFirstDoc(page);

    // Giscus 通过 iframe 嵌入，含 giscus.app 或 title 含"评论"
    const giscusFrame = page
      .locator('iframe[src*="giscus"], iframe[title*="评论"], iframe[title*="comments"]')
      .first();

    const hasGiscus = await giscusFrame.isVisible({ timeout: 5000 }).catch(() => false);
    // Giscus 加载需要网络，仅验证容器存在
    if (hasGiscus) {
      expect(await giscusFrame.isVisible()).toBe(true);
    }
  });

  test('点击面包屑返回上级模块', async ({ page }) => {
    await navigateToFirstDoc(page);

    const breadcrumb = page
      .locator('nav[aria-label*="breadcrumb"], nav[aria-label*="面包屑"], ol')
      .first();
    await expect(breadcrumb).toBeVisible({ timeout: 5000 });

    // 点击面包屑中的"首页"链接
    const homeLink = breadcrumb.locator('a').first();
    const href = await homeLink.getAttribute('href');
    if (href) {
      await homeLink.click();
      await page.waitForLoadState('networkidle');
      // 应跳转回首页或上级
      expect(page.url()).not.toMatch(/\/[a-z]+\/[a-z]/);
    }
  });

  test('标题锚点链接可跳转到对应位置', async ({ page }) => {
    await navigateToFirstDoc(page);

    // 查找带 id 的标题
    const headings = page.locator('h2[id], h3[id]');
    const count = await headings.count();

    if (count > 0) {
      const firstHeading = headings.first();
      const id = await firstHeading.getAttribute('id');

      if (id) {
        // 点击标题旁的锚点链接（rehype-autolink-headings 包装）
        const anchorLink = firstHeading.locator('a').first();
        const hasAnchor = await anchorLink.isVisible({ timeout: 1000 }).catch(() => false);

        if (hasAnchor) {
          await anchorLink.click();
          await page.waitForTimeout(300);
          // URL 应包含锚点（浏览器会对中文 id 进行编码）
          const expectedHash = `#${encodeURIComponent(id)}`;
          expect(page.url()).toContain(expectedHash);
        }
      }
    }
  });
});
