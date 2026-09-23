import { test, expect } from '@playwright/test';

const BASE = '/';

test.describe('功能页扁平化与 UX 交互验证', () => {
  test('在线前端直达工作台 + 旧 editor 路径查询保留重定向', async ({ page }) => {
    await page.goto(`${BASE}playground/editor/?showcase=demo&panel=gallery`);
    await page.waitForURL(/playground\/\?/, { timeout: 5000 });
    expect(page.url()).toContain('showcase=demo');
    await page.waitForSelector('.pg-toolbar', { timeout: 10000 });
  });

  test('功能页共享入口一致 + 算法教学页内直切题图鉴', async ({ page }) => {
    const pages = ['syntax/', 'learning-path/', 'algorithms/'];
    for (const path of pages) {
      await page.goto(`${BASE}${path}`);
      const entries = page.locator('.hero-entries .entry-name');
      const labels = (await entries.allTextContents()).map((s) => s.trim());
      for (const required of ['首页', '语法速览', '学习路线', '算法教学', '在线前端']) {
        expect(labels, `${path} 缺少入口 ${required}`).toContain(required);
      }
    }

    await page.goto(`${BASE}algorithms/`);
    await expect(page.locator('[data-algo-view="tutorials"]')).toBeVisible();
    await expect(page.locator('[data-algo-view="problems"]')).toBeHidden();
    await page.locator('[data-view-tab="problems"]').click();
    await expect(page.locator('[data-algo-view="problems"]')).toBeVisible();
    await expect(page.locator('[data-algo-view="tutorials"]')).toBeHidden();
    expect(page.url()).toContain('view=problems');
    await page.locator('[data-view-tab="tutorials"]').click();
    await expect(page.locator('[data-algo-view="tutorials"]')).toBeVisible();
    expect(page.url()).not.toContain('view=problems');

    await page.goto(`${BASE}algorithms/?view=problems`);
    await expect(page.locator('[data-algo-view="problems"]')).toBeVisible();

    await page.goto(`${BASE}algorithms/problems/`);
    await page.waitForURL(/view=problems/, { timeout: 5000 });
    await expect(page.locator('[data-algo-view="problems"]')).toBeVisible();
  });

  test('算法教学页外部平台推荐：外链新窗口 + 免责声明', async ({ page }) => {
    await page.goto(`${BASE}algorithms/`);
    const section = page.locator('[data-algo-ext]');
    await expect(section).toBeVisible();
    for (const host of ['leetcode.cn', 'prachub.com']) {
      const link = section.locator(`a[href*="${host}"]`);
      await expect(link).toBeVisible();
      expect(await link.getAttribute('target')).toBe('_blank');
      expect((await link.getAttribute('rel')) ?? '').toContain('noopener');
    }
    await expect(section).toContainText('不构成合作或背书');
    const disclaimerLink = section.locator('a[href$="disclaimer/"]');
    await expect(disclaimerLink).toBeVisible();
    const resp = await page.request.get((await disclaimerLink.getAttribute('href')) ?? '');
    expect(resp.ok()).toBeTruthy();
  });

  test('语法速览：筛选 + URL 状态 + 面板切换', async ({ page }) => {
    await page.goto(`${BASE}syntax/`);
    const grid = page.locator('.syntax-grid');
    await expect(grid).toBeVisible();
    await page.waitForFunction(() => document.querySelectorAll('.syntax-grid .syntax-card').length > 0);

    const input = page.locator('.syntax-filter__input');
    await input.fill('数组');
    await expect(page.locator('.syntax-meta')).toContainText('命中', { timeout: 3000 });
    await expect(page).toHaveURL(/q=/);
    await page.locator('.syntax-grid .syntax-card').first().click();
    await expect(page.locator('.syntax-panel')).toBeVisible();
    await expect(page.locator('.syntax-panel__nav-pos')).toBeVisible();
    const before = await page.locator('.syntax-panel__nav-pos').textContent();
    await page.keyboard.press('ArrowRight');
    const after = await page.locator('.syntax-panel__nav-pos').textContent();
    expect(before).not.toBe(after);
    const url = page.url();
    await page.goto(url);
    await expect(page.locator('.syntax-filter__input')).toHaveValue(/数组/);
  });

  test('题图鉴视图：本机标记 + 状态筛选 + 空态恢复', async ({ page }) => {
    await page.goto(`${BASE}algorithms/?view=problems`);
    const firstItem = page.locator('[data-algo-item]').first();
    await expect(firstItem).toBeVisible();
    const slug = await firstItem.getAttribute('data-slug');
    expect(slug).toBeTruthy();

    const solvedBtn = firstItem.locator('[data-mark="solved"]');
    await solvedBtn.click();
    await expect(solvedBtn).toHaveClass(/is-on/);
    const stored = await page.evaluate(() => localStorage.getItem('fandex-ap-progress'));
    expect(stored).toContain(slug!);
    await expect(page.locator('[data-ap-status-count="solved"]')).toHaveText('1');

    await page.locator('[data-filter-status="solved"]').click();
    await expect(page.locator('[data-filter-count]')).toContainText('命中 1 /');
    await page.locator('[data-filter-status="review"]').click();
    await expect(page.locator('[data-ap-empty]')).toBeVisible();
    await page.locator('[data-ap-reset]').click();
    await expect(page.locator('[data-ap-empty]')).toBeHidden();
    await expect(page).toHaveURL((u) => !u.search.includes('status='));

    await page.evaluate(() => localStorage.removeItem('fandex-ap-progress'));
  });

  test('在线前端工作台：指南面板 + Ctrl+S 另存', async ({ page }) => {
    // 首访引导会自动弹出并覆盖编辑器（fandex-pg-guide-v1 未写入时），
    // 本测试针对「? 手动打开指南」路径，先种子已阅标记跳过自动弹出
    await page.addInitScript(() => {
      try {
        localStorage.setItem('fandex-pg-guide-v1', '1');
      } catch {
        /* 忽略 */
      }
    });
    await page.goto(`${BASE}playground/`);
    await page.waitForSelector('.pg-toolbar');
    await page.keyboard.press('Shift+Slash');
    await expect(page.locator('.pg-keys-mask .pg-guide')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.pg-keys-mask')).toBeHidden();
    await page.keyboard.press('Control+s');
    await page.waitForFunction(() => new URLSearchParams(location.search).has('pen'), undefined, {
      timeout: 5000,
    });
    await expect(page.locator('.pg-save-state')).toContainText('已保存', { timeout: 5000 });
    await page.keyboard.press('Control+s');
    await expect(page.locator('.pg-save-state')).toContainText('已保存', { timeout: 5000 });
    await page.evaluate(() => localStorage.clear());
    await page.evaluate(async () => {
      const req = indexedDB.deleteDatabase('fandex-playground');
      await new Promise((resolve) => {
        req.onsuccess = req.onerror = req.onblocked = resolve;
      });
    });
  });

  test('在线前端工作台：草稿自动保存与刷新恢复', async ({ page }) => {
    // 同上：跳过首访自动引导，避免其遮罩拦截编辑器点击
    await page.addInitScript(() => {
      try {
        localStorage.setItem('fandex-pg-guide-v1', '1');
      } catch {
        /* 忽略 */
      }
    });
    await page.goto(`${BASE}playground/`);
    await page.waitForSelector('.pg-toolbar');
    const jsEditor = page.locator('.pg-pane-body .cm-content').nth(2);
    await jsEditor.click();
    await page.keyboard.press('Control+End');
    await page.keyboard.type('/* DRAFT_MARKER_FANDEX */');
    // 自动保存防抖 800ms：等待足够时间确保草稿真正落库，再刷新验证恢复
    await page.waitForTimeout(1500);
    await page.reload();
    await page.waitForSelector('.pg-toolbar');
    await expect(page.locator('.pg-pane-body .cm-content').nth(2)).toContainText(
      'DRAFT_MARKER_FANDEX',
      { timeout: 5000 },
    );
    await page.evaluate(() => localStorage.clear());
    await page.evaluate(async () => {
      const req = indexedDB.deleteDatabase('fandex-playground');
      await new Promise((resolve) => {
        req.onsuccess = req.onerror = req.onblocked = resolve;
      });
    });
  });

  test('文档页阅读体验：标题锚点、面包屑与模块入口', async ({ page }) => {
    await page.goto(`${BASE}typescript/210-KeyofTypeofIndexedAccessTypes/`);
    await page.waitForSelector('.prose');

    // 标题文本不再是超链接（此前 behavior:wrap 会把整个标题包进 a 标签），
    // '#' 锚点由构建期注入且不带嵌套结构
    const heading = page.locator('.prose h2').first();
    await expect(heading).not.toContainText('[');
    const anchorInHeading = heading.locator('> a');
    await expect(anchorInHeading).toHaveClass(/heading-anchor/);
    await expect(heading.locator('> a')).toHaveCount(1);

    // 点击 '#' 锚点：复制链接并把 hash 写入地址栏
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await anchorInHeading.click();
    await expect
      .poll(() => page.evaluate(() => decodeURIComponent(window.location.hash)))
      .not.toBe('');

    // 前置知识区修复后的站内链接可直达（此前带 /module/ 前缀 404）
    const resp = await page.request.get(
      `${BASE}typescript/080-BasicTypeSystem/`,
    );
    expect(resp.status()).toBe(200);

    // 模块首页有面包屑且当前项标记 aria-current
    await page.goto(`${BASE}typescript/`);
    await expect(page.locator('nav.breadcrumb .bc-current')).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  test('学习路径：D/L/S 进度快捷键 + 重置按钮', async ({ page }) => {
    await page.goto(`${BASE}learning-path/javascript/`);
    await page.waitForSelector('.lp-map');
    await page.locator('.lp-node[role="button"]').first().click();
    await page.waitForTimeout(300);
    await page.keyboard.press('d');
    await expect(page.locator('.lp-progress__num')).toContainText(/^1\//, { timeout: 3000 });
    await page.keyboard.press('l');
    await expect(page.locator('.lp-progress__learning')).toContainText('学习中 1');
    page.on('dialog', (dialog) => void dialog.accept());
    await page.locator('[aria-label="重置学习进度"]').click();
    await expect(page.locator('.lp-progress__num')).toContainText(/^0\//, { timeout: 3000 });
    await expect(page.locator('[aria-label="重置学习进度"]')).toBeDisabled();
  });

  test('学习路径总览：继续上次直达 + 卡片本机进度徽章', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'fandex-lp-last',
        JSON.stringify({ module: 'javascript', title: 'JavaScript', ts: Date.now() }),
      );
      localStorage.setItem(
        'fandex-lp-progress',
        JSON.stringify({ javascript: { intro: 'done', variables: 'learning' } }),
      );
    });
    await page.goto(`${BASE}learning-path/`);
    const resume = page.locator('[data-lp-resume]');
    await expect(resume).toBeVisible();
    await expect(resume.locator('[data-lp-resume-link]')).toHaveAttribute(
      'href',
      /learning-path\/javascript\//,
    );
    const card = page.locator('[data-lp-module="javascript"]');
    await expect(card.locator('[data-lp-progress]')).toContainText('已完成 1');
    await expect(card.locator('[data-lp-progress]')).toContainText('学习中 1');
    await page.evaluate(() => {
      localStorage.removeItem('fandex-lp-last');
      localStorage.removeItem('fandex-lp-progress');
    });
  });
});
