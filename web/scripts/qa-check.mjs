/**
 * FANDEX 发布前质量检查脚本
 *
 * 功能概述：
 * 对构建产物（dist 目录）和源代码执行多维度质量检查，涵盖文件审计、
 * Web 架构、内容处理、阅读体验、CI/CD 和质量控制六大维度。
 * 检查结果分为 PASS（通过）、FAIL（失败，阻断发布）和 WARN（警告）。
 * 存在 FAIL 项时以非零退出码退出。
 *
 * 检查维度：
 * 1. 文件审计：.nojekyll、robots.txt、大文件检测
 * 2. Web 架构：index.html、404.html、base href、绝对根链接、视口、暗色模式、预连接、懒加载
 * 3. 内容处理：页面数量、Pagefind 搜索索引
 * 4. 阅读体验：Shiki 代码高亮、JSON-LD 结构化数据
 * 5. CI/CD：sitemap-index.xml
 * 6. 质量控制：100vh 使用检查、console.log 残留检查
 */

import { readdir, stat, readFile } from 'node:fs/promises';
import { join } from 'node:path';

/** 构建产物目录 */
const DIST = 'dist';
/** 源代码目录 */
const SRC = 'src';
/** GitHub Pages 部署基础路径 */
const BASE = '/FANDEX-web/';
/** 失败计数器 */
let errors = 0;
/** 警告计数器 */
let warnings = 0;

/**
 * 记录通过项
 * @param {string} msg - 通过信息
 */
function pass(msg) {
  console.log(`  [PASS] ${msg}`);
}

/**
 * 记录失败项并递增错误计数
 * @param {string} msg - 失败信息
 */
function fail(msg) {
  errors++;
  console.error(`  [FAIL] ${msg}`);
}

/**
 * 记录警告项并递增警告计数
 * @param {string} msg - 警告信息
 */
function warn(msg) {
  warnings++;
  console.warn(`  [WARN] ${msg}`);
}

/**
 * 检查文件是否存在
 * @param {string} path - 文件路径
 * @returns {Promise<boolean>} 文件是否存在
 */
async function fileExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * 递归遍历目录，对匹配扩展名的文件执行回调
 * @param {string} dir - 要遍历的目录路径
 * @param {string} ext - 文件扩展名（空字符串表示所有文件）
 * @param {Function} fn - 对每个匹配文件执行的异步回调
 */
async function walkDir(dir, ext, fn) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await walkDir(full, ext, fn);
    else if (ext === '' || entry.name.endsWith(ext)) await fn(full);
  }
}

/**
 * 检查 .nojekyll 文件是否存在
 * GitHub Pages 需要 .nojekyll 来避免忽略下划线开头的文件
 */
async function checkNojekyll() {
  if (await fileExists(join(DIST, '.nojekyll'))) pass('.nojekyll exists');
  else fail('.nojekyll missing - GitHub Pages may ignore underscore-prefixed files');
}

/**
 * 检查 index.html 是否存在
 * 确保首页可正常访问
 */
async function checkIndexHtml() {
  if (await fileExists(join(DIST, 'index.html'))) pass('index.html exists');
  else fail('index.html missing - homepage will 404');
}

/**
 * 检查 404.html 是否存在
 * 确保自定义 404 页面可用
 */
async function check404Html() {
  if (await fileExists(join(DIST, '404.html'))) pass('404.html exists');
  else fail('404.html missing - custom 404 page unavailable');
}

/**
 * 检查 HTML 页面数量
 * 确保构建产物包含足够的页面（预期 200+）
 */
async function checkPageCount() {
  const htmlFiles = [];
  await walkDir(DIST, '.html', (f) => htmlFiles.push(f));
  if (htmlFiles.length >= 200) pass(`Page count: ${htmlFiles.length}`);
  else warn(`Page count low: ${htmlFiles.length} (expected 200+)`);
}

/**
 * 检查 Pagefind 搜索索引是否存在
 * 确保站内搜索功能可用
 */
async function checkPagefindIndex() {
  const pagefindDir = join(DIST, 'pagefind');
  if (await fileExists(pagefindDir)) {
    const files = await readdir(pagefindDir);
    const hasIndex = files.some((f) => f.startsWith('pagefind.') && f.endsWith('.js'));
    if (hasIndex) pass('Pagefind search index exists');
    else warn('Pagefind directory exists but no index JS found');
  } else {
    warn('Pagefind index not found - search will not work');
  }
}

/**
 * 检查 index.html 中是否包含正确的 base href
 * 确保 GitHub Pages 上的链接路径正确
 */
async function checkBaseHref() {
  const indexHtml = await readFile(join(DIST, 'index.html'), 'utf-8');
  const hasBase = indexHtml.includes(BASE) || indexHtml.includes('href="/FANDEX/"');
  if (hasBase) pass(`Base URL ${BASE} found in index.html`);
  else fail(`Base URL ${BASE} not found - links may be broken on GitHub Pages`);
}

/**
 * 检查是否存在绝对根路径链接
 * 在 GitHub Pages 项目站点中，绝对根路径链接会导致 404
 */
async function checkNoAbsoluteRootLinks() {
  let brokenCount = 0;
  await walkDir(DIST, '.html', async (full) => {
    const content = await readFile(full, 'utf-8');
    // 匹配 href="/" 开头但不以 /FANDEX/ 开头的链接
    const broken = content.match(/href="\/(?!FANDEX)[^"]+"/g);
    if (broken) brokenCount += broken.length;
  });
  if (brokenCount === 0) pass('No absolute root links found');
  else warn(`Found ${brokenCount} potential absolute root links (may 404 on GitHub Pages)`);
}

/**
 * 检查 sitemap-index.xml 是否存在
 * 确保 SEO 站点地图可用
 */
async function checkSitemap() {
  if (await fileExists(join(DIST, 'sitemap-index.xml'))) pass('sitemap-index.xml exists');
  else warn('sitemap-index.xml missing - SEO may be affected');
}

/**
 * 检查 robots.txt 是否存在
 * 确保搜索引擎爬虫配置可用
 */
async function checkRobotsTxt() {
  if (await fileExists(join(DIST, 'robots.txt'))) pass('robots.txt exists');
  else warn('robots.txt missing');
}

/**
 * 检查是否存在超过 500KB 的大文件
 * 大文件会影响加载性能
 */
async function checkLargeFiles() {
  const LARGE_THRESHOLD = 500 * 1024; // 500KB
  const largeFiles = [];
  await walkDir(DIST, '', async (full) => {
    const s = await stat(full);
    if (s.size > LARGE_THRESHOLD) largeFiles.push({ path: full, size: s.size });
  });
  if (largeFiles.length === 0) pass('No files over 500KB');
  else {
    for (const f of largeFiles) {
      warn(`Large file: ${f.path} (${(f.size / 1024).toFixed(0)}KB)`);
    }
  }
}

/**
 * 检查暗色模式支持
 * 确保包含主题切换开关和防闪烁脚本
 */
async function checkDarkModeSupport() {
  let hasDarkToggle = false;
  let hasFlashPrevention = false;
  await walkDir(DIST, '.html', async (full) => {
    const content = await readFile(full, 'utf-8');
    if (content.includes('data-theme')) hasDarkToggle = true;
    if (content.includes('fandex-theme')) hasFlashPrevention = true;
  });
  if (hasDarkToggle) pass('Dark mode toggle present');
  else fail('Dark mode toggle missing');
  if (hasFlashPrevention) pass('Dark mode flash prevention present');
  else warn('Dark mode flash prevention may be missing');
}

/**
 * 检查视口 meta 标签
 * 确保移动端布局正常
 */
async function checkResponsiveMeta() {
  const indexHtml = await readFile(join(DIST, 'index.html'), 'utf-8');
  if (indexHtml.includes('viewport')) pass('Viewport meta tag present');
  else fail('Viewport meta tag missing - mobile layout broken');
}

/**
 * 检查 Shiki 代码语法高亮
 * 确保代码块正确渲染
 */
async function checkShikiHighlighting() {
  let hasShiki = false;
  await walkDir(DIST, '.html', async (full) => {
    const content = await readFile(full, 'utf-8');
    if (content.includes('shiki') || content.includes('--shiki')) hasShiki = true;
  });
  if (hasShiki) pass('Shiki syntax highlighting present');
  else warn('No Shiki highlighting detected in output');
}

/**
 * 检查 JSON-LD 结构化数据
 * 确保 SEO 结构化数据可用
 */
async function checkJsonLd() {
  let hasJsonLd = false;
  await walkDir(DIST, '.html', async (full) => {
    const content = await readFile(full, 'utf-8');
    if (content.includes('application/ld+json')) hasJsonLd = true;
  });
  if (hasJsonLd) pass('JSON-LD structured data present');
  else warn('No JSON-LD structured data found - SEO may be affected');
}

/**
 * 检查源代码中是否存在裸 100vh 使用
 * 应使用 100dvh 作为移动端适配的回退方案
 */
async function checkNo100vh() {
  const srcDirs = [join(SRC, 'styles'), join(SRC, 'components'), join(SRC, 'pages')];
  let found = [];
  for (const dir of srcDirs) {
    if (!(await fileExists(dir))) continue;
    // 检查 CSS 文件
    await walkDir(dir, '.css', async (full) => {
      const content = await readFile(full, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        if (line.includes('100vh') && !line.includes('100dvh')) {
          // 检查下一行是否有 100dvh 回退
          const nextLine = lines[i + 1] || '';
          if (!nextLine.includes('100dvh')) {
            found.push(`${full}:${i + 1}: ${line.trim()}`);
          }
        }
      });
    });
    // 检查 Astro 组件中的 <style> 块
    await walkDir(dir, '.astro', async (full) => {
      const content = await readFile(full, 'utf-8');
      const styleMatch = content.match(/<style[^>]*>([\s\S]*?)<\/style>/g);
      if (!styleMatch) return;
      styleMatch.forEach((block) => {
        const lines = block.split('\n');
        lines.forEach((line, i) => {
          if (line.includes('100vh') && !line.includes('100dvh')) {
            const nextLine = lines[i + 1] || '';
            if (!nextLine.includes('100dvh')) {
              found.push(`${full}:style:${i + 1}: ${line.trim()}`);
            }
          }
        });
      });
    });
  }
  if (found.length === 0) pass('No bare 100vh usage (all use 100dvh fallback)');
  else {
    for (const f of found) warn(`Bare 100vh: ${f}`);
  }
}

/**
 * 检查源代码中是否残留 console.log/debug 调用
 * 生产代码不应包含调试日志
 */
async function checkNoConsoleLog() {
  let found = [];
  await walkDir(SRC, '.ts', async (full) => {
    const content = await readFile(full, 'utf-8');
    const lines = content.split('\n');
    lines.forEach((line, i) => {
      // 匹配 console.log/debug，排除注释行
      if (/\bconsole\.(log|debug)\b/.test(line) && !line.includes('//')) {
        found.push(`${full}:${i + 1}: ${line.trim()}`);
      }
    });
  });
  if (found.length === 0) pass('No console.log/debug in source');
  else {
    for (const f of found) warn(`Console log: ${f}`);
  }
}

/**
 * 检查资源预连接提示
 * 确保字体等外部资源预加载
 */
async function checkPreconnect() {
  const indexHtml = await readFile(join(DIST, 'index.html'), 'utf-8');
  if (indexHtml.includes('preconnect')) pass('Resource preconnect hints present');
  else warn('No preconnect hints - font loading may be slow');
}

/**
 * 检查图片懒加载
 * 确保图片使用 loading="lazy" 属性
 */
async function checkLazyLoading() {
  let hasLazy = false;
  await walkDir(DIST, '.html', async (full) => {
    const content = await readFile(full, 'utf-8');
    if (content.includes('loading="lazy"')) hasLazy = true;
  });
  if (hasLazy) pass('Image lazy loading present');
  else warn('No lazy loading detected (no images or not configured)');
}

// ===== 执行检查 =====

console.log('\n+------------------------------------------+');
console.log('|     FANDEX PRE-LAUNCH QUALITY CHECK      |');
console.log('+------------------------------------------+\n');

console.log('[Dimension 1: File Audit]');
await checkNojekyll();
await checkRobotsTxt();
await checkLargeFiles();

console.log('\n[Dimension 2: Web Architecture]');
await checkIndexHtml();
await check404Html();
await checkBaseHref();
await checkNoAbsoluteRootLinks();
await checkResponsiveMeta();
await checkDarkModeSupport();
await checkPreconnect();
await checkLazyLoading();

console.log('\n[Dimension 3: Content Processing]');
await checkPageCount();
await checkPagefindIndex();

console.log('\n[Dimension 4: Reading Experience]');
await checkShikiHighlighting();
await checkJsonLd();

console.log('\n[Dimension 5: CI/CD]');
await checkSitemap();

console.log('\n[Dimension 6: Quality Control]');
await checkNo100vh();
await checkNoConsoleLog();

console.log(`\n+------------------------------------------+`);
console.log(`|  Results: ${errors} errors, ${warnings} warnings`);
console.log(`+------------------------------------------+\n`);

// 存在错误时以非零退出码退出，阻断部署
process.exit(errors > 0 ? 1 : 0);
