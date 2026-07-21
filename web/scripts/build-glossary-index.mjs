/**
 * FANDEX 术语表索引构建脚本
 *
 * 功能概述：
 * 扫描 src/content/glossary 下各模块目录中的 .md 文件，解析术语定义，
 * 提取术语名称和定义文本，生成 JSON 格式的术语索引文件，
 * 输出到 public/data/glossary-index.json。供前端术语提示/弹窗功能使用。
 */

import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** 当前脚本所在目录 */
const __dirname = dirname(fileURLToPath(import.meta.url));
/** 术语表源文件目录 */
const GLOSSARY_DIR = join(__dirname, '..', 'src', 'content', 'glossary');
/** 索引输出目录 */
const OUTPUT_DIR = join(__dirname, '..', 'public', 'data');
/** 索引输出文件路径 */
const OUTPUT_FILE = join(OUTPUT_DIR, 'glossary-index.json');

/**
 * 递归遍历目录，对匹配扩展名的文件执行回调
 * @param {string} dir - 要遍历的目录路径
 * @param {string} ext - 文件扩展名（如 '.md'）
 * @param {Function} fn - 对每个匹配文件执行的异步回调
 */
export async function walkDir(dir, ext, fn) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory())
      await walkDir(full, ext, fn); // 递归子目录
    else if (entry.name.endsWith(ext)) await fn(full);
  }
}

/**
 * 从术语表 Markdown 内容中提取术语定义
 * 解析三级标题（### 序号.术语名）和定义段落
 *
 * @param {string} content - Markdown 文件完整内容
 * @param {string} moduleId - 所属模块标识
 * @returns {Object} 术语索引对象，键为术语名，值为 { module, def, slug }
 */
export function extractTerms(content, moduleId) {
  const terms = {};
  const lines = content.split('\n');
  let currentTerm = null; // 当前正在处理的术语名
  let state = 'seek_heading'; // 状态机当前状态
  let defLines = []; // 定义文本行收集器

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 匹配三级标题格式：### 序号.术语名
    const headingMatch = trimmed.match(/^###\s+\d+\.\d+\s+(.+)$/);
    if (headingMatch) {
      // 遇到新标题时，先保存上一个术语的定义
      if (currentTerm && defLines.length > 0) {
        const def = defLines.join(' ').trim();
        // 仅保留长度合理的定义（过长可能解析错误）
        if (def.length > 0 && def.length < 200) {
          terms[currentTerm] = { module: moduleId, def, slug: `${moduleId}/glossary` };
        }
      }

      // 提取术语名，去除括号内的英文/别名
      let termName = headingMatch[1].trim();
      const parenMatch = termName.match(/^(.+?)\s*[（(]/);
      if (parenMatch) termName = parenMatch[1].trim();
      currentTerm = termName;
      state = 'seek_def'; // 切换到寻找定义状态
      defLines = [];
      continue;
    }

    // 寻找定义标记（**定义**： 或 定义：）
    if (state === 'seek_def' && /(\*\*定义\*\*[：:]|定义[：:])\s*/.test(trimmed)) {
      state = 'capture_def'; // 切换到捕获定义状态
      // 提取定义标记之后的文本
      const afterDef = trimmed.replace(/.*?(?:\*\*定义\*\*[：:]|定义[：:])\s*/, '').trim();
      if (afterDef) defLines.push(afterDef);
      continue;
    }

    // 捕获定义文本，遇到特定标记时停止
    if (state === 'capture_def') {
      if (
        trimmed.startsWith('**详解') ||
        trimmed.startsWith('**名称') ||
        trimmed.startsWith('**首次') ||
        trimmed === '---' ||
        trimmed.startsWith('###')
      ) {
        state = 'seek_heading'; // 定义结束，回到寻找标题状态
        if (trimmed.startsWith('###')) {
          i--; // 回退一行，让外层循环重新处理这个标题
        }
        continue;
      }
      // 收集定义文本行
      if (trimmed && !trimmed.startsWith('**首次') && !trimmed.startsWith('**名称')) {
        defLines.push(trimmed);
      }
    }
  }

  // 处理文件末尾最后一个术语的定义
  if (currentTerm && defLines.length > 0) {
    const def = defLines.join(' ').trim();
    if (def.length > 0 && def.length < 200) {
      terms[currentTerm] = { module: moduleId, def, slug: `${moduleId}/glossary` };
    }
  }

  return terms;
}

/**
 * 主函数：构建术语表索引
 * @param {Object} options - 可选配置，用于覆盖默认的输入输出路径（测试时使用）
 * @param {string} options.glossaryDir - 术语表源文件目录
 * @param {string} options.outputDir - 索引输出目录
 * @param {string} options.outputFile - 索引输出文件路径
 */
export async function main(options = {}) {
  const glossaryDir = options.glossaryDir || GLOSSARY_DIR;
  const outputDir = options.outputDir || OUTPUT_DIR;
  const outputFile = options.outputFile || OUTPUT_FILE;

  const allTerms = {};

  // 遍历术语表目录下的各模块子目录
  const dirs = await readdir(glossaryDir, { withFileTypes: true });

  for (const entry of dirs) {
    if (!entry.isDirectory()) continue;
    const moduleId = entry.name; // 目录名即为模块标识
    const moduleDir = join(glossaryDir, moduleId);

    // 遍历模块目录下的所有 .md 文件
    await walkDir(moduleDir, '.md', async (filePath) => {
      const content = await readFile(filePath, 'utf-8');
      const terms = extractTerms(content, moduleId);
      // 逐项合并到全局索引，检测术语跨模块重复定义
      // 冲突策略：保留首次定义，记录警告日志便于后续核对
      for (const [termName, entry] of Object.entries(terms)) {
        const existing = allTerms[termName];
        if (existing) {
          console.warn(
            `[glossary] 术语 "${termName}" 重复定义：` +
              `已保留 ${existing.module} 模块的定义，忽略 ${moduleId} 模块的同名术语`
          );
          continue;
        }
        allTerms[termName] = entry;
      }
    });
  }

  // 确保输出目录存在并写入索引文件
  await mkdir(outputDir, { recursive: true });
  const json = JSON.stringify(allTerms);
  await writeFile(outputFile, json, 'utf-8');

  const count = Object.keys(allTerms).length;
  console.log(`Glossary index: ${count} terms written to ${outputFile}`);
}

// 仅在直接运行时执行构建，被 import 时不自动执行（便于单元测试）
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch(console.error);
}
