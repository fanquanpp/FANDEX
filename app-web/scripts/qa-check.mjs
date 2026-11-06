
import { spawnSync } from 'node:child_process';
import { readdir, stat, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = 'dist';
const SRC = 'src';
// 与 astro.config.ts 的 SITE_BASE 同源：桌面变体（DESKTOP_BUILD=1）base 为 /
const BASE = process.env.DESKTOP_BUILD === '1' ? '/' : '/FANDEX/';
let errors = 0;
let warnings = 0;

function pass(msg) {
  console.log(`  [PASS] ${msg}`);
}

function fail(msg) {
  errors++;
  console.error(`  [FAIL] ${msg}`);
}

function warn(msg) {
  warnings++;
  console.warn(`  [WARN] ${msg}`);
}

async function fileExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function walkDir(dir, ext, fn) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await walkDir(full, ext, fn);
    else if (ext === '' || entry.name.endsWith(ext)) await fn(full);
  }
}

async function checkNojekyll() {
  if (await fileExists(join(DIST, '.nojekyll'))) pass('.nojekyll exists');
  else fail('.nojekyll missing - GitHub Pages may ignore underscore-prefixed files');
}

async function checkIndexHtml() {
  if (await fileExists(join(DIST, 'index.html'))) pass('index.html exists');
  else fail('index.html missing - homepage will 404');
}

async function check404Html() {
  if (await fileExists(join(DIST, '404.html'))) pass('404.html exists');
  else fail('404.html missing - custom 404 page unavailable');
}

async function checkPageCount() {
  const htmlFiles = [];
  await walkDir(DIST, '.html', (f) => htmlFiles.push(f));
  if (htmlFiles.length >= 200) pass(`Page count: ${htmlFiles.length}`);
  else warn(`Page count low: ${htmlFiles.length} (expected 200+)`);
}

async function checkMermaidRendered() {
  let bareCount = 0;
  let barePageCount = 0;
  const shownPages = [];
  await walkDir(DIST, '.html', async (full) => {
    const content = await readFile(full, 'utf-8');
    // 构建期渲染后的页面：figure 内带有隐藏的 <pre class="mermaid-source" data-language="mermaid">；
    // 渲染失败的页面：Shiki 高亮的 <pre class="astro-code ..." data-language="mermaid"> 裸块，
    // 访问时会触发客户端动态加载约 600KB mermaid 兜底，属构建产物缺陷
    const tags = content.match(/<pre\b[^>]*data-language="mermaid"[^>]*>/g) ?? [];
    const bare = tags.filter((tag) => !tag.includes('mermaid-source'));
    if (bare.length > 0) {
      bareCount += bare.length;
      barePageCount += 1;
      if (shownPages.length < 10) shownPages.push(`${full} (${bare.length})`);
    }
  });
  if (bareCount === 0) pass('All mermaid blocks pre-rendered (no bare source blocks)');
  else {
    for (const p of shownPages) {
      fail(`Unrendered mermaid block (client fallback would load ~600KB mermaid): ${p}`);
    }
    if (barePageCount > shownPages.length) {
      warn(`... and ${barePageCount - shownPages.length} more pages with unrendered mermaid blocks (total bare: ${bareCount})`);
    }
  }
}

async function checkBaseHref() {
  const indexHtml = await readFile(join(DIST, 'index.html'), 'utf-8');
  const hasBase = indexHtml.includes(BASE) || indexHtml.includes('href="/FANDEX/"');
  if (hasBase) pass(`Base URL ${BASE} found in index.html`);
  else fail(`Base URL ${BASE} not found - links may be broken on GitHub Pages`);
}

async function checkNoAbsoluteRootLinks() {
  let brokenCount = 0;
  await walkDir(DIST, '.html', async (full) => {
    const content = await readFile(full, 'utf-8');
    // 只检查真实 <a> 标签的 href：<pre> 剥离兜不住 <code>/shiki 转义文本里的
    // 教学示例（如 nextjs 文档中的 <Link href="/about">），曾造成大量误报
    const anchors = content.match(/<a\s[^>]*>/g) ?? [];
    const broken = anchors
      .map((tag) => tag.match(/href="([^"]*)"/)?.[1] ?? '')
      .filter((href) => href.startsWith('/') && !href.startsWith('//') && !href.startsWith(BASE));
    if (broken.length > 0) brokenCount += broken.length;
  });
  if (brokenCount === 0) pass('No absolute root links found');
  else warn(`Found ${brokenCount} potential absolute root links (may 404 on GitHub Pages)`);
}

async function checkSitemap() {
  if (await fileExists(join(DIST, 'sitemap-index.xml'))) pass('sitemap-index.xml exists');
  else warn('sitemap-index.xml missing - SEO may be affected');
}

async function checkModuleConsistency() {
  try {
    const [indexRaw, modulesRaw] = await Promise.all([
      readFile(join(SRC, 'data', 'doc-index.json'), 'utf-8'),
      readFile(join('..', 'shd-shared', 'metadata', 'modules.json'), 'utf-8'),
    ]);
    const index = JSON.parse(indexRaw);
    const modules = JSON.parse(modulesRaw);
    const ids = new Set((modules.modules || []).map((m) => m.id));
    const bad = new Map();
    for (const doc of index) {
      const mod = doc.module;
      if (!ids.has(mod)) bad.set(mod, (bad.get(mod) || 0) + 1);
    }
    if (bad.size === 0) pass(`Module consistency: ${ids.size} modules, all docs matched`);
    else {
      const detail = [...bad.entries()].map(([k, n]) => `${k}(${n})`).join(', ');
      fail(`Module consistency broken: ${detail}`);
    }
  } catch (err) {
    fail(`Module consistency check error: ${err.message}`);
  }
}

async function checkNoNumberedModuleDirs() {
  const entries = await readdir(DIST, { withFileTypes: true });
  const ghosts = entries
    .filter((e) => e.isDirectory() && /^\d{3}-/.test(e.name))
    .map((e) => e.name);
  if (ghosts.length === 0) pass('No numbered module dirs in dist');
  else fail(`Ghost module dirs found: ${ghosts.join(', ')}`);
}

async function checkNoPrerenderDir() {
  if (await fileExists(join(DIST, '.prerender'))) {
    fail('dist/.prerender exists - run scripts/clean-prerender.mjs (build script does it)');
  } else {
    pass('No .prerender intermediate dir in dist');
  }
}

async function checkOversizedPages() {
  const PAGE_THRESHOLD = 1536 * 1024;
  const big = [];
  await walkDir(DIST, '.html', async (full) => {
    const s = await stat(full);
    if (s.size > PAGE_THRESHOLD) big.push({ path: full, size: s.size });
  });
  if (big.length === 0) pass('No HTML page over 1.5MB');
  else {
    big.sort((a, b) => b.size - a.size);
    for (const f of big.slice(0, 10)) {
      warn(`Oversized page: ${f.path} (${(f.size / 1024).toFixed(0)}KB)`);
    }
    if (big.length > 10) warn(`... and ${big.length - 10} more oversized pages`);
  }
}

async function checkRobotsTxt() {
  if (await fileExists(join(DIST, 'robots.txt'))) pass('robots.txt exists');
  else warn('robots.txt missing');
}

async function checkLargeFiles() {
  const LARGE_THRESHOLD = 500 * 1024;
  const largeFiles = [];
  await walkDir(DIST, '', async (full) => {
    // HTML 页面体积由 checkOversizedPages（1.5MB）单独把关；
    // 长文档页内联 Shiki/KaTeX 常态超 500KB，逐条告警只会淹没真信号
    if (full.endsWith('.html')) return;
    const s = await stat(full);
    if (s.size > LARGE_THRESHOLD) largeFiles.push({ path: full, size: s.size });
  });
  if (largeFiles.length === 0) pass('No non-HTML assets over 500KB');
  else {
    for (const f of largeFiles) {
      warn(`Large file: ${f.path} (${(f.size / 1024).toFixed(0)}KB)`);
    }
  }
}

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

async function checkResponsiveMeta() {
  const indexHtml = await readFile(join(DIST, 'index.html'), 'utf-8');
  if (indexHtml.includes('viewport')) pass('Viewport meta tag present');
  else fail('Viewport meta tag missing - mobile layout broken');
}

async function checkShikiHighlighting() {
  let hasShiki = false;
  await walkDir(DIST, '.html', async (full) => {
    const content = await readFile(full, 'utf-8');
    if (content.includes('shiki') || content.includes('--shiki')) hasShiki = true;
  });
  if (hasShiki) pass('Shiki syntax highlighting present');
  else warn('No Shiki highlighting detected in output');
}

async function checkJsonLd() {
  let hasJsonLd = false;
  await walkDir(DIST, '.html', async (full) => {
    const content = await readFile(full, 'utf-8');
    if (content.includes('application/ld+json')) hasJsonLd = true;
  });
  if (hasJsonLd) pass('JSON-LD structured data present');
  else warn('No JSON-LD structured data found - SEO may be affected');
}

async function checkNo100vh() {
  const srcDirs = [join(SRC, 'styles'), join(SRC, 'components'), join(SRC, 'pages')];
  let found = [];
  for (const dir of srcDirs) {
    if (!(await fileExists(dir))) continue;
    await walkDir(dir, '.css', async (full) => {
      const content = await readFile(full, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        if (line.includes('100vh') && !line.includes('100dvh')) {
          const nextLine = lines[i + 1] || '';
          if (!nextLine.includes('100dvh')) {
            found.push(`${full}:${i + 1}: ${line.trim()}`);
          }
        }
      });
    });
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

async function checkNoConsoleLog() {
  let found = [];
  // 同时覆盖 .tsx（React 岛屿）与 .astro（组件 frontmatter），只扫 .ts 会漏掉大部分源码
  for (const ext of ['.ts', '.tsx', '.astro']) {
    await walkDir(SRC, ext, async (full) => {
      const content = await readFile(full, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        if (/\bconsole\.(log|debug)\b/.test(line) && !line.includes('//')) {
          found.push(`${full}:${i + 1}: ${line.trim()}`);
        }
      });
    });
  }
  if (found.length === 0) pass('No console.log/debug in source');
  else {
    for (const f of found) warn(`Console log: ${f}`);
  }
}

async function checkPreconnect() {
  // 字体为同源 + preload 预热；跨域 preconnect（jsdelivr）仅 playground 页按需注入，
  // 这里只验证首页存在任意资源预热提示即可
  const indexHtml = await readFile(join(DIST, 'index.html'), 'utf-8');
  if (indexHtml.includes('preconnect') || indexHtml.includes('rel="preload"')) {
    pass('Resource hints present (preload/preconnect)');
  } else {
    warn('No resource hints (preload/preconnect) - first paint may be slow');
  }
}

async function checkLazyLoading() {
  let hasLazy = false;
  await walkDir(DIST, '.html', async (full) => {
    const content = await readFile(full, 'utf-8');
    if (content.includes('loading="lazy"')) hasLazy = true;
  });
  if (hasLazy) pass('Image lazy loading present');
  else warn('No lazy loading detected (no images or not configured)');
}

// 产物新鲜度门禁（第 2 期 S5，spec 第 8 节 / 评审 OR1 钉死方案 b）：
// 以零写入子进程运行各生产者的 --check（spec 第 4 节 CLI 约定：--check 只报告
// 待算项、零写入，待算项 > 0 时生产者自行 exit 1）。任一生产者非零退出即 fail。
// 刻意不在这里重新推导 inputsHash——缓存键逻辑只存在于生产者单份，qa 只消费
// 退出码与输出，杜绝第三份键实现漂移；「pending > 0」与「非零退出」在生产者
// 的 --check 语义下是同一件事，无需解析输出文案。
// 指引（评审 N-(d)）：本地冷缓存（fresh clone / 刚清空 node_modules/.cache）下
// 前置段待算项 > 0 属预期，不是代码缺陷——先跑 pnpm dev 或数据前置链再 qa。
const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));
const FRESHNESS_PRODUCERS = [
  { name: 'content-sync', script: 'content-sync.mjs' },
  { name: 'build-stats', script: 'build-stats.mjs' },
  { name: 'build-syntax', script: 'build-syntax.mjs' },
  { name: 'build-learning-path', script: 'build-learning-path.mjs' },
];
const FRESHNESS_TIMEOUT_MS = 5 * 60 * 1000;

function checkDataFreshness() {
  const failGuidance =
    '指引: 先跑 pnpm dev 或数据前置链（content-sync / build-stats / build-syntax / ' +
    'build-learning-path）再 qa；CI 中这些步骤已在部署构建链内自动执行。';
  const staleProducers = [];
  for (const producer of FRESHNESS_PRODUCERS) {
    // 脚本路径锚定在本文件所在目录，cwd 维持 app-web（与 pnpm qa 调用契约一致）
    const result = spawnSync(process.execPath, [join(SCRIPTS_DIR, producer.script), '--check'], {
      cwd: process.cwd(),
      encoding: 'utf-8',
      timeout: FRESHNESS_TIMEOUT_MS,
      maxBuffer: 32 * 1024 * 1024,
    });
    if (result.status === 0 && !result.error) {
      console.log(`  [check] ${producer.name}: 0 待算`);
      continue;
    }
    staleProducers.push(producer.name);
    const reason = result.error
      ? `spawn 失败: ${result.error.message}`
      : `exit ${result.status ?? 'signal ' + result.signal}`;
    fail(`产物新鲜度门禁未过: ${producer.name}（${reason}）`);
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.split('\n').filter(Boolean);
    for (const line of output.slice(-6)) {
      console.error(`         | ${line}`);
    }
  }
  if (staleProducers.length > 0) {
    fail(
      `数据产物待重建（${staleProducers.join(', ')}）。` +
        `本地冷缓存下待算项 > 0 属预期而非代码缺陷。${failGuidance}`,
    );
  } else {
    pass(`产物新鲜度: ${FRESHNESS_PRODUCERS.length} 个生产者 --check 全部 0 待算`);
  }
}

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
await checkMermaidRendered();

console.log('\n[Dimension 4: Reading Experience]');
await checkShikiHighlighting();
await checkJsonLd();

console.log('\n[Dimension 5: CI/CD]');
await checkSitemap();
await checkModuleConsistency();
await checkNoNumberedModuleDirs();
await checkNoPrerenderDir();

console.log('\n[Dimension 6: Quality Control]');
await checkOversizedPages();
await checkNo100vh();
await checkNoConsoleLog();

console.log('\n[Dimension 7: Data Pipeline Freshness]');
checkDataFreshness();

console.log(`\n+------------------------------------------+`);
console.log(`|  Results: ${errors} errors, ${warnings} warnings`);
console.log(`+------------------------------------------+\n`);

process.exit(errors > 0 ? 1 : 0);
