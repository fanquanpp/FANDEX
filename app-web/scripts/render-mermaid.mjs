#!/usr/bin/env node
/**
 * Mermaid 预渲染脚本：把 cnt-content 全部 mermaid 代码块渲染成亮 / 暗两套 SVG，
 * 写入 node_modules/.cache/mermaid-dual/ 供构建期插件（rehype-mermaid-dual.ts）直读。
 *
 * 为什么独立于 astro build：构建期渲染需要 headless Chromium，与 Astro 主进程
 * 同时抢内存时在大库上会出现 page.goto 超时。把渲染拆成前置的串行批次脚本后，
 * astro build 只做缓存命中，浏览器完全不参与主构建。
 *
 * 用法：
 *   node scripts/render-mermaid.mjs            # 增量渲染缺失的图（按源码哈希缓存）
 *   node scripts/render-mermaid.mjs --check    # 只报告统计，不渲染
 *
 * 环境变量 FANDEX_MERMAID_CLIENT=1 时直接退出（客户端渲染模式，不需要缓存）。
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const MONO_ROOT = join(scriptDir, '..', '..');
const CONTENT_DIR = join(MONO_ROOT, 'cnt-content', 'full');
const CACHE_DIR = join(scriptDir, '..', '..', 'node_modules', '.cache', 'mermaid-dual');
const CACHE_VERSION = 'v1';
const BATCH_SIZE = 8;

// 与 rehype-mermaid-dual.ts 保持一致的主题配置
const sharedConfig = {
  startOnLoad: false,
  securityLevel: 'strict',
  layout: 'dagre',
  look: 'classic',
  fontSize: 15,
  flowchart: { curve: 'basis', nodeSpacing: 24, rankSpacing: 40, useMaxWidth: true, padding: 12 },
  sequence: { diagramMarginX: 12, diagramMarginY: 12, boxMargin: 12, useMaxWidth: true },
};

const lightConfig = {
  ...sharedConfig,
  theme: 'neutral',
  themeVariables: {
    primaryColor: '#EEFCFB', primaryTextColor: '#10403C', primaryBorderColor: '#14716A',
    lineColor: '#26ABA2', secondaryColor: '#E6F5F2', tertiaryColor: '#F2FAF8',
    textColor: '#2A3538', mainBkg: '#EEFCFB', nodeBorder: '#14716A',
    clusterBkg: 'transparent', clusterBorder: '#BCC8D0', titleColor: '#141414',
    edgeLabelBackground: '#FFFFFF', noteBkgColor: '#E6F5F2', noteTextColor: '#10403C',
    noteBorderColor: '#14716A',
  },
};

const darkConfig = {
  ...sharedConfig,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#0E5560', primaryTextColor: '#EBEFF3', primaryBorderColor: '#39C5BB',
    lineColor: '#39C5BB', secondaryColor: '#0E3B38', tertiaryColor: '#10201D',
    textColor: '#CCD5DB', mainBkg: '#0E5560', nodeBorder: '#39C5BB',
    clusterBkg: 'transparent', clusterBorder: '#2A3538', titleColor: '#EBEFF3',
    edgeLabelBackground: '#141414', noteBkgColor: '#123B36', noteTextColor: '#EBEFF3',
    noteBorderColor: '#39C5BB',
  },
};

const checkOnly = process.argv.includes('--check');

// 缓存键源码规范化：与 rehype-mermaid-dual.ts 的 canonicalSource 保持一致。
// 引用块/列表内代码块被 remark 剥掉 "> " 与缩进，按行剥掉行首空白与引用
// 标记后，脚本正则捕获的原文与构建期插件拿到的文本键值一致。
function canonicalSource(source) {
  return source
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/^[ \t>]+/, '').replace(/[ \t]+$/, ''))
    .join('\n')
    .trim();
}

function cacheKey(source, theme) {
  const hash = createHash('sha256')
    .update(CACHE_VERSION)
    .update(theme)
    .update(canonicalSource(source))
    .digest('hex');
  return `${theme}-${hash.slice(0, 32)}`;
}

function walkMarkdown(dir, acc) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkMarkdown(full, acc);
    else if (entry.name.endsWith('.md')) acc.push(full);
  }
  return acc;
}

function collectSources() {
  const files = walkMarkdown(CONTENT_DIR, []);
  const sources = new Map(); // source -> count
  // 兼容 3 个及以上的反引号围栏、语言标记后的行尾空白
  const blockPattern = /(`{3,})mermaid[ \t]*\r?\n([\s\S]*?)\1/g;
  for (const file of files) {
    const raw = readFileSync(file, 'utf-8');
    let match;
    while ((match = blockPattern.exec(raw)) !== null) {
      const source = match[2].trim();
      if (source) sources.set(source, (sources.get(source) ?? 0) + 1);
    }
  }
  return { files: files.length, sources: [...sources.keys()], total: [...sources.values()].reduce((a, b) => a + b, 0) };
}

function hasCache(source, theme) {
  return existsSync(join(CACHE_DIR, `${cacheKey(source, theme)}.svg`));
}

async function main() {
  if (process.env.FANDEX_MERMAID_CLIENT === '1') {
    console.log('[render-mermaid] FANDEX_MERMAID_CLIENT=1，客户端渲染模式，跳过预渲染。');
    process.exit(0);
  }

  const { files, sources, total } = collectSources();
  const missingLight = sources.filter((s) => !hasCache(s, 'light'));
  const missingDark = sources.filter((s) => !hasCache(s, 'dark'));
  console.log(
    `[render-mermaid] 扫描 ${files} 篇文档：去重后 ${sources.length} 张图（共出现 ${total} 处），` +
      `待渲染 light ${missingLight.length} / dark ${missingDark.length}`,
  );

  if (checkOnly || (missingLight.length === 0 && missingDark.length === 0)) {
    console.log('[render-mermaid] 缓存已就绪。');
    process.exit(0);
  }

  let createMermaidRenderer;
  let chromium;
  try {
    ({ createMermaidRenderer } = await import('mermaid-isomorphic'));
    ({ chromium } = await import('playwright'));
  } catch (err) {
    console.warn(`[render-mermaid] 渲染依赖不可用，跳过预渲染（构建将回退客户端渲染）: ${err.message}`);
    process.exit(0);
  }

  const renderer = createMermaidRenderer({ browserType: chromium });
  mkdirSync(CACHE_DIR, { recursive: true });

  function responsive(svg) {
    return svg.replace(/(<svg[^>]*?)\sstyle="([^"]*)"/i, (_m, head, style) =>
      `${head} style="${style.replace(/max-width:[^;"]*;?/i, '')}" data-mermaid-svg`);
  }

  async function renderSet(sourcesToRender, theme, config) {
    let ok = 0;
    for (let start = 0; start < sourcesToRender.length; start += BATCH_SIZE) {
      const batch = sourcesToRender.slice(start, start + BATCH_SIZE);
      let settled;
      try {
        settled = await renderer(batch, { mermaidConfig: config, prefix: `fandex-${theme}` });
      } catch (err) {
        // 浏览器实例偶发崩溃：重建后重试一次本批次
        console.warn(`[render-mermaid] ${theme} 批次异常，重试一次: ${err.message.split('\n')[0]}`);
        try {
          settled = await renderer(batch, { mermaidConfig: config, prefix: `fandex-${theme}` });
        } catch (err2) {
          console.warn(`[render-mermaid] ${theme} 批次重试仍失败，本批 ${batch.length} 张回退客户端: ${err2.message.split('\n')[0]}`);
          continue;
        }
      }
      settled.forEach((result, slot) => {
        if (result.status === 'fulfilled' && result.value.svg) {
          writeFileSync(join(CACHE_DIR, `${cacheKey(batch[slot], theme)}.svg`), responsive(result.value.svg));
          ok += 1;
        }
      });
      const done = Math.min(start + BATCH_SIZE, sourcesToRender.length);
      if (done % 160 === 0 || done === sourcesToRender.length) {
        console.log(`[render-mermaid] ${theme}: ${done}/${sourcesToRender.length}`);
      }
    }
    return ok;
  }

  const lightOk = await renderSet(missingLight, 'light', lightConfig);
  const darkOk = await renderSet(missingDark, 'dark', darkConfig);
  console.log(
    `[render-mermaid] 完成：light ${lightOk}/${missingLight.length}，dark ${darkOk}/${missingDark.length}` +
      `（失败项由构建期/客户端兜底）`,
  );
  process.exit(0);
}

main();
