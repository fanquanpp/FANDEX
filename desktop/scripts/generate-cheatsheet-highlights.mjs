/**
 * FANDEX 速查表语法高亮预渲染脚本（Phase 11）
 *
 * 功能概述：
 * 遍历 ./src/data/cheatsheets/*.json（9 个速查表），
 * 提取所有代码示例（items[].代码 或 items[].code），使用 Shiki 预渲染为 HTML，
 * 支持双主题（github-light / github-dark），输出高亮后的数据 JSON 文件。
 *
 * 数据源：./src/data/cheatsheets/*.json
 * 输出：./public/data/cheatsheet-highlights/{name}.json
 *
 * 输出格式（每文件）：
 * {
 *   "name": "git",
 *   "generatedAt": "...",
 *   "items": [
 *     { "group": "基础操作", "description": "...", "code": "git init",
 *       "highlight": { "light": "<pre...>...</pre>", "dark": "<pre...>...</pre>" } }
 *   ]
 * }
 *
 * Shiki 使用：
 *   - import { codeToHtml } from 'shiki'
 *   - 双主题 github-light / github-dark
 *   - 如 Shiki 不可用或失败，输出警告并跳过该代码块
 */

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** 当前脚本所在目录 */
const __dirname = dirname(fileURLToPath(import.meta.url));
/** 项目根目录 */
const PROJECT_ROOT = resolve(__dirname, '..');
/** 速查表源目录 */
const CHEATSHEETS_DIR = join(PROJECT_ROOT, 'src', 'data', 'cheatsheets');
/** 输出目录 */
const OUTPUT_DIR = join(PROJECT_ROOT, 'public', 'data', 'cheatsheet-highlights');

/**
 * 模块名到 Shiki 语言标识的映射
 * 根据速查表文件名推断代码块应使用的语法高亮语言
 */
const LANG_MAP = {
  mysql: 'sql',
  postgresql: 'sql',
  sqlite: 'sql',
  mongodb: 'javascript',
  redis: 'bash',
  git: 'bash',
  linux: 'bash',
  docker: 'bash',
  python: 'python',
  javascript: 'javascript',
  typescript: 'typescript',
  vue3: 'vue',
  react: 'jsx',
  java: 'java',
  cpp: 'cpp',
  c: 'c',
  go: 'go',
  rust: 'rust',
  csharp: 'csharp',
  kotlin: 'kotlin',
  html5: 'html',
  css: 'css',
};

/**
 * 从速查表数据中提取所有代码示例
 * 兼容两种字段命名：中文（分组/条目/代码/描述）与英文（groups/items/code/description）
 *
 * @param {Object} data - 速查表 JSON 数据
 * @returns {Array<{group: string, description: string, code: string}>} 代码示例数组
 */
function extractCodeItems(data) {
  const items = [];
  // 兼容中文结构
  const groups = data.分组 || data.groups || [];
  for (const group of groups) {
    const groupName = group.分组名 || group.name || '';
    const entries = group.条目 || group.items || [];
    for (const entry of entries) {
      const code = entry.代码 || entry.code || entry.example || '';
      const description = entry.描述 || entry.description || '';
      if (code && typeof code === 'string') {
        items.push({ group: groupName, description, code });
      }
    }
  }
  return items;
}

/**
 * 主函数：生成速查表代码高亮
 */
async function main() {
  console.log('[generate-cheatsheet-highlights] 开始生成速查表代码高亮...');

  // 1. 动态导入 Shiki（若未安装则跳过）
  let codeToHtml;
  try {
    const shiki = await import('shiki');
    codeToHtml = shiki.codeToHtml;
  } catch (err) {
    console.warn(
      `[generate-cheatsheet-highlights] 警告: Shiki 未安装或无法加载 (${err.message})。`,
    );
    console.warn('[generate-cheatsheet-highlights] 跳过高亮生成。请运行: npm install -D shiki');
    return;
  }

  // 2. 读取所有速查表 JSON 文件
  const files = await readdir(CHEATSHEETS_DIR);
  const jsonFiles = files.filter((f) => f.endsWith('.json'));
  console.log(
    `[generate-cheatsheet-highlights] 发现 ${jsonFiles.length} 个速查表文件: ${CHEATSHEETS_DIR}`,
  );

  await mkdir(OUTPUT_DIR, { recursive: true });

  let totalHighlighted = 0;
  let totalFailed = 0;

  // 3. 逐文件处理
  for (const file of jsonFiles) {
    const filePath = join(CHEATSHEETS_DIR, file);
    const name = file.replace(/\.json$/, '');
    const lang = LANG_MAP[name.toLowerCase()] || 'bash';

    console.log(`[generate-cheatsheet-highlights]   处理 ${file}（语言: ${lang}）`);

    let raw;
    try {
      raw = await readFile(filePath, 'utf-8');
    } catch (err) {
      console.warn(`[generate-cheatsheet-highlights]     读取失败: ${err.message}`);
      continue;
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      console.warn(`[generate-cheatsheet-highlights]     JSON 解析失败: ${err.message}`);
      continue;
    }

    const items = extractCodeItems(data);
    const outputItems = [];

    for (const item of items) {
      // 双主题高亮：github-light 与 github-dark
      let light = '';
      let dark = '';
      try {
        light = codeToHtml(item.code, { lang, theme: 'github-light' });
      } catch (err) {
        totalFailed += 1;
        console.warn(
          `[generate-cheatsheet-highlights]     light 高亮失败 [${item.description}]: ${err.message}`,
        );
      }
      try {
        dark = codeToHtml(item.code, { lang, theme: 'github-dark' });
      } catch (err) {
        totalFailed += 1;
        console.warn(
          `[generate-cheatsheet-highlights]     dark 高亮失败 [${item.description}]: ${err.message}`,
        );
      }

      outputItems.push({
        group: item.group,
        description: item.description,
        code: item.code,
        highlight: { light, dark },
      });
      totalHighlighted += 1;
    }

    // 输出每文件 JSON
    const outputFile = join(OUTPUT_DIR, `${name}.json`);
    const output = {
      name,
      generatedAt: new Date().toISOString(),
      items: outputItems,
    };
    const json = JSON.stringify(output, null, 2);
    await writeFile(outputFile, json, 'utf-8');
  }

  console.log('[generate-cheatsheet-highlights] 高亮生成完成。');
  console.log(`[generate-cheatsheet-highlights]   成功高亮代码块: ${totalHighlighted}`);
  console.log(`[generate-cheatsheet-highlights]   失败次数: ${totalFailed}`);
  console.log(`[generate-cheatsheet-highlights]   输出目录: ${OUTPUT_DIR}`);
}

main().catch((err) => {
  console.error('[generate-cheatsheet-highlights] 生成失败:', err);
  process.exit(1);
});
