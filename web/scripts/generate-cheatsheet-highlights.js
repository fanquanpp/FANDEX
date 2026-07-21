/**
 * FANDEX 速查表代码高亮生成脚本
 *
 * 功能概述：
 * 读取 src/data/cheatsheets 下的速查表 JSON 文件，使用 Shiki 为其中
 * 尚未生成高亮的代码片段（代码字段）生成 HTML 高亮代码（高亮代码字段）。
 * 支持增量处理：仅处理自上次运行后修改过的文件，通过 .cache/cheatsheet-flags
 * 目录中的标记文件追踪处理状态。
 */

import { createHighlighter } from 'shiki';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/** 当前脚本所在目录 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** 速查表 JSON 文件目录 */
const cheatsheetDir = path.resolve(__dirname, '../src/data/cheatsheets');
/** 增量处理标记文件目录 */
const processedFlagDir = path.resolve(__dirname, '../.cache/cheatsheet-flags');

/**
 * 模块名到 Shiki 语言标识的映射
 * 根据模块名推断代码块应使用的语法高亮语言
 */
const langMap = {
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

// 确保缓存目录存在
if (!fs.existsSync(processedFlagDir)) {
  fs.mkdirSync(processedFlagDir, { recursive: true });
}

/**
 * 获取文件的修改时间戳（毫秒）
 * @param {string} filePath - 文件路径
 * @returns {number} 修改时间戳（毫秒）
 */
function getFileMtime(filePath) {
  return fs.statSync(filePath).mtimeMs;
}

/**
 * 判断文件是否需要处理
 * 通过比较文件修改时间与上次处理时间来决定
 *
 * @param {string} filePath - 速查表文件路径
 * @param {string} moduleName - 模块名
 * @returns {boolean} 是否需要重新处理
 */
function shouldProcess(filePath, moduleName) {
  const flagPath = path.join(processedFlagDir, `${moduleName}.json`);
  if (!fs.existsSync(flagPath)) return true; // 无标记文件，需要处理
  const flag = JSON.parse(fs.readFileSync(flagPath, 'utf-8'));
  const currentMtime = getFileMtime(filePath);
  return currentMtime > flag.lastProcessed; // 文件修改时间晚于上次处理时间
}

/**
 * 标记文件已处理
 * 记录当前文件的修改时间戳
 *
 * @param {string} filePath - 速查表文件路径
 * @param {string} moduleName - 模块名
 */
function markProcessed(filePath, moduleName) {
  const flagPath = path.join(processedFlagDir, `${moduleName}.json`);
  fs.writeFileSync(
    flagPath,
    JSON.stringify({
      lastProcessed: getFileMtime(filePath),
    })
  );
}

/**
 * 主函数：为速查表生成代码高亮
 */
async function main() {
  // 检查速查表目录是否存在
  if (!fs.existsSync(cheatsheetDir)) {
    console.log('速查表目录不存在，跳过高亮生成');
    return;
  }

  // 收集所有速查表 JSON 文件
  const files = fs.readdirSync(cheatsheetDir).filter((f) => f.endsWith('.json'));

  if (files.length === 0) {
    console.log('未找到速查表 JSON 文件');
    return;
  }

  // 收集所有需要的语言，去重后初始化 Shiki 高亮器
  const neededLangs = [
    ...new Set(files.map((f) => langMap[f.replace('.json', '').toLowerCase()] || 'bash')),
  ];
  const highlighter = await createHighlighter({
    themes: ['github-light'],
    langs: neededLangs,
  });

  // 逐个处理速查表文件
  for (const file of files) {
    const filePath = path.join(cheatsheetDir, file);
    const moduleName = file.replace('.json', '').toLowerCase();

    // 增量处理：跳过未修改的文件
    if (!shouldProcess(filePath, moduleName)) {
      console.log(`跳过未修改的速查表: ${file}`);
      continue;
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    const lang = langMap[moduleName] || 'bash'; // 获取对应语言，默认 bash
    let modified = false;

    // 遍历所有分组和条目，为未高亮的代码生成高亮 HTML
    for (const group of data.分组) {
      for (const item of group.条目) {
        if (item.代码 && !item.高亮代码) {
          try {
            item.高亮代码 = highlighter.codeToHtml(item.代码, { lang, theme: 'github-light' });
            modified = true;
          } catch (err) {
            console.warn(`高亮失败 [${file}] [${item.描述}]: ${err.message}`);
            item.高亮代码 = ''; // 高亮失败时置空，避免重复尝试
            modified = true;
          }
        }
      }
    }

    // 仅在内容有变更时写回文件
    if (modified) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`已生成高亮: ${file}`);
    } else {
      console.log(`无需更新: ${file}`);
    }

    // 更新处理标记
    markProcessed(filePath, moduleName);
  }
}

main().catch(console.error);
