/**
 * 子功能页 UX 迭代（2026-09-17）交互验证脚本
 * -----------------------------------------------------------------------------
 * 覆盖本轮四组新交互，全部对 dist 产物实测（非 dev server）：
 * 1. 子页功能入口一致性：六个子页 hero-entries 数量一致且包含标准兄弟入口
 * 2. 语法速览：关键词筛选（全量命中 + URL ?lang=&q=）+ 面板上一条/下一条
 * 3. 题图鉴：本机标记（localStorage + 状态 chip 计数）+ 空态恢复动作
 * 4. 工作台：? 快捷键面板 + Ctrl+S 另存
 * 5. 学习路径：D/L/S 进度快捷键 + 重置进度按钮
 */
import { test, expect } from '@playwright/test';

const BASE = '/';

test.describe('子功能页 UX 迭代验证', () => {
  test('六个子页共享功能入口一致', async ({ page }) => {
    const pages = [
      'playground/',
      'syntax/',
      'learning-path/',
      'learning-path/javascript/',
      'algorithms/',
      'algorithms/problems/',
    ];
    for (const path of pages) {
      await page.goto(`${BASE}${path}`);
      const entries = page.locator('.hero-entries .entry-name');
      const labels = (await entries.allTextContents()).map((s) => s.trim());
      for (const required of ['首页', '语法速览', '学习路线', '算法教学', '在线编程']) {
        expect(labels, `${path} 缺少入口 ${required}`).toContain(required);
      }
    }
  });

  test('语法速览：筛选 + URL 状态 + 面板切换', async ({ page }) => {
    await page.goto(`${BASE}syntax/`);
    const grid = page.locator('.syntax-grid');
    await expect(grid).toBeVisible();
    // 等首屏卡片渲染完成
    await page.waitForFunction(() => document.querySelectorAll('.syntax-grid .syntax-card').length > 0);

    const input = page.locator('.syntax-filter__input');
    await input.fill('数组');
    // 防抖后：元信息行出现命中计数，URL 同步 q 参数
    await expect(page.locator('.syntax-meta')).toContainText('命中', { timeout: 3000 });
    await expect(page).toHaveURL(/q=/);
    // 面板：点击第一张卡，出现上一条/下一条导航
    await page.locator('.syntax-grid .syntax-card').first().click();
    await expect(page.locator('.syntax-panel')).toBeVisible();
    await expect(page.locator('.syntax-panel__nav-pos')).toBeVisible();
    // 右方向键切到下一条，位置读数 +1
    const before = await page.locator('.syntax-panel__nav-pos').textContent();
    await page.keyboard.press('ArrowRight');
    const after = await page.locator('.syntax-panel__nav-pos').textContent();
    expect(before).not.toBe(after);
    // URL 带 lang/q 时刷新恢复
    const url = page.url();
    await page.goto(url);
    await expect(page.locator('.syntax-filter__input')).toHaveValue(/数组/);
  });

  test('题图鉴：本机标记 + 状态筛选 + 空态恢复', async ({ page }) => {
    await page.goto(`${BASE}algorithms/problems/`);
    const firstItem = page.locator('[data-algo-item]').first();
    await expect(firstItem).toBeVisible();
    const slug = await firstItem.getAttribute('data-slug');
    expect(slug).toBeTruthy();

    // 标记已掌握：按钮态 + localStorage + 状态 chip 计数
    const solvedBtn = firstItem.locator('[data-mark="solved"]');
    await solvedBtn.click();
    await expect(solvedBtn).toHaveClass(/is-on/);
    const stored = await page.evaluate(() => localStorage.getItem('fandex-ap-progress'));
    expect(stored).toContain(slug!);
    await expect(page.locator('[data-ap-status-count="solved"]')).toHaveText('1');

    // 状态筛选"已掌握"：仅命中 1 题；切"待复习"进入空态
    await page.locator('[data-filter-status="solved"]').click();
    await expect(page.locator('[data-filter-count]')).toContainText('命中 1 /');
    await page.locator('[data-filter-status="review"]').click();
    await expect(page.locator('[data-ap-empty]')).toBeVisible();
    // 空态恢复动作：重置全部筛选
    await page.locator('[data-ap-reset]').click();
    await expect(page.locator('[data-ap-empty]')).toBeHidden();
    await expect(page).toHaveURL((u) => !u.search.includes('status='));

    // 清理本机标记
    await page.evaluate(() => localStorage.removeItem('fandex-ap-progress'));
  });

  test('在线编程工作台：快捷键面板 + Ctrl+S 另存', async ({ page }) => {
    await page.goto(`${BASE}playground/editor/`);
    await page.waitForSelector('.pg-toolbar');
    // ? 打开快捷键面板，Esc 关闭
    await page.keyboard.press('Shift+Slash');
    await expect(page.locator('.pg-keys')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.pg-keys')).toBeHidden();
    // Ctrl+S：草稿另存为新作品（URL 出现 ?pen= 且保存态为已保存）
    await page.keyboard.press('Control+s');
    await page.waitForFunction(() => new URLSearchParams(location.search).has('pen'), undefined, {
      timeout: 5000,
    });
    await expect(page.locator('.pg-save-state')).toContainText('已保存', { timeout: 5000 });
    // 再按 Ctrl+S：原地更新，不新增作品副本
    await page.keyboard.press('Control+s');
    await expect(page.locator('.pg-save-state')).toContainText('已保存', { timeout: 5000 });
    // 清理
    await page.evaluate(() => localStorage.clear());
    await page.evaluate(async () => {
      const req = indexedDB.deleteDatabase('fandex-playground');
      await new Promise((resolve) => {
        req.onsuccess = req.onerror = req.onblocked = resolve;
      });
    });
  });

  test('学习路径：D/L/S 进度快捷键 + 重置按钮', async ({ page }) => {
    await page.goto(`${BASE}learning-path/javascript/`);
    await page.waitForSelector('.lp-map');
    // 打开第一个知识点节点的详情面板（lp-node 为节点，避开阶段折叠按钮）
    await page.locator('.lp-node[role="button"]').first().click();
    await page.waitForTimeout(300);
    // D 标记已完成：进度环读数出现 1/
    await page.keyboard.press('d');
    await expect(page.locator('.lp-progress__num')).toContainText(/^1\//, { timeout: 3000 });
    // L 切学习中
    await page.keyboard.press('l');
    await expect(page.locator('.lp-progress__learning')).toContainText('学习中 1');
    // 重置进度按钮可用并点击（原生 confirm 自动接受）
    page.on('dialog', (dialog) => void dialog.accept());
    await page.locator('[aria-label="重置学习进度"]').click();
    await expect(page.locator('.lp-progress__num')).toContainText(/^0\//, { timeout: 3000 });
    await expect(page.locator('[aria-label="重置学习进度"]')).toBeDisabled();
  });
});
