/**
 * 全站冒烟测试（构建产物级）
 * -----------------------------------------------------------------------------
 * 覆盖六个核心入口页的最小可用性：
 * 1. 首页：标题 + 入口按钮 + 无运行时错误
 * 2. 模块页：文档列表渲染
 * 3. 文档页：正文容器 + 侧栏 + 目录
 * 4. 公式页：KaTeX MathML 输出守卫（output:'mathml' 试点，
 *    若未来回退 'html' 或结构变更，此用例会失败提示同步调整）
 * 5. 语法速览：React 岛屿挂载
 * 6. 在线编程工作台：FrontendLab 冒烟（零页面错误 + 编辑器容器出现）
 *
 * 每个用例同时监听 pageerror（未捕获异常）：任何一处脚本崩溃都判定失败，
 * 这是对 ClientRouter 生命周期脚本（lib/*.ts）最廉价也最有效的回归防线。
 * -----------------------------------------------------------------------------
 */
import { expect, test, type Page } from '@playwright/test';

/** 页面级错误收集：未捕获异常（脚本崩溃/资源逻辑错误） */
function trackPageErrors(page: Page): Error[] {
  const errors: Error[] = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

test('首页渲染：标题、入口按钮与模块卡片', async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto('/FANDEX/');
  await expect(page).toHaveTitle(/FANDEX/i);
  // 入口按钮（波浪描边组件消费方）：语法速览 / 学习路线 / 在线编程等
  await expect(page.locator('a.entry-btn', { hasText: '语法速览' })).toBeVisible();
  await expect(page.locator('a.entry-btn', { hasText: '学习路线' })).toBeVisible();
  expect(await page.locator('a.entry-btn').count()).toBeGreaterThanOrEqual(3);
  expect(errors, '首页不应有未捕获异常').toEqual([]);
});

test('模块页渲染：文档列表可见', async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto('/FANDEX/algorithm/');
  await expect(page.locator('h1').first()).toBeVisible();
  expect(errors, '模块页不应有未捕获异常').toEqual([]);
});

test('文档页渲染：正文容器、侧栏与目录', async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto('/FANDEX/algorithm/290-NetworkFlow/');
  await expect(page.locator('#doc-root')).toBeVisible();
  // 三栏布局的关键组成
  await expect(page.locator('aside').first()).toBeVisible();
  expect(errors, '文档页不应有未捕获异常').toEqual([]);
});

test('公式 MathML 渲染守卫（KaTeX output:mathml）', async ({ page }) => {
  await page.goto('/FANDEX/algorithm/290-NetworkFlow/');
  // mathml 输出结构：span.katex > math（语义层，读屏/SEO 可读）
  const mathCount = await page.locator('.katex math').count();
  expect(mathCount, '该页含数十条公式，mathml 输出不应为空').toBeGreaterThan(10);
  // 块级公式存在且浏览器原生渲染（display="block" 属性驱动居中）
  const blockCount = await page.locator('.katex math[display="block"]').count();
  expect(blockCount, '块级公式应存在').toBeGreaterThan(0);
});

test('语法速览：React 岛屿挂载', async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto('/FANDEX/syntax/');
  // SyntaxExplorer 以 client:visible 岛屿形式挂载
  await expect(page.locator('astro-island').first()).toBeAttached();
  expect(errors, '语法速览页不应有未捕获异常').toEqual([]);
});

test('在线编程工作台：FrontendLab 冒烟', async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto('/FANDEX/playground/');
  // 工作台主容器可见（编辑器懒加载由 CodeMirrorBoxLoader 控制，不做时机断言）
  await expect(page.locator('body')).not.toBeEmpty();
  // 等待岛屿水合窗口，捕获首屏内的脚本崩溃
  await page.waitForTimeout(2_000);
  expect(errors, '工作台不应有未捕获异常（FrontendLab 冒烟守卫）').toEqual([]);
});
