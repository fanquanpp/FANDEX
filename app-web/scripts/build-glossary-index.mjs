/**
 * FANDEX 术语表索引构建脚本
 *
 * 功能概述：
 * 扫描 shd-shared/metadata/glossary 下各模块的 .json 文件，解析术语定义，
 * 生成 JSON 格式的术语索引文件，输出到 public/data/glossary-index.json。
 * 供前端术语提示/弹窗功能使用。
 *
 * 偏差报备（仓库整理后路径与格式变更）：
 * - 原：app-web/src/content/glossary/<module>/glossary.md（Markdown 表格格式）
 * - 新：shd-shared/metadata/glossary/<module>.json（JSON 格式，顶层结构 { moduleId, terms[] }）
 * - 解析逻辑由 Markdown 状态机改为 JSON 直接读取
 */

import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** 当前脚本所在目录 */
const __dirname = dirname(fileURLToPath(import.meta.url));
/** 单仓库根目录（app-web 的上一级） */
const MONO_ROOT = join(__dirname, '..', '..');
/** 术语表源文件目录（共享元数据） */
const GLOSSARY_DIR = join(MONO_ROOT, 'shd-shared', 'metadata', 'glossary');
/** 索引输出目录 */
const OUTPUT_DIR = join(__dirname, '..', 'public', 'data');
/** 索引输出文件路径 */
const OUTPUT_FILE = join(OUTPUT_DIR, 'glossary-index.json');

/**
 * 从单个 glossary JSON 文件解析术语条目
 *
 * 输入：JSON 文件路径、模块 ID（fallback）
 * 输出：术语索引对象，键为术语名，值为 { module, def, slug }
 *
 * @param {string} filePath - JSON 文件绝对路径
 * @param {string} moduleId - 模块 ID（fallback，优先使用 JSON 内 moduleId）
 * @returns {Promise<Object>} 术语索引对象
 */
async function parseGlossaryJson(filePath, moduleId) {
  let raw;
  try {
    raw = await readFile(filePath, 'utf-8');
  } catch (err) {
    console.warn(`[glossary] 读取文件失败: ${filePath} - ${err.message}`);
    return {};
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    console.warn(`[glossary] JSON 解析失败: ${filePath} - ${err.message}`);
    return {};
  }

  const resolvedModule = data.moduleId || moduleId;
  const terms = Array.isArray(data.terms) ? data.terms : [];
  const result = {};

  for (const term of terms) {
    const name = term?.name;
    if (!name) continue;
    result[name] = {
      module: resolvedModule,
      def: term.definition || '',
      slug: `${resolvedModule}/glossary`,
    };
  }

  return result;
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

  // 读取 glossary 目录下的所有 .json 文件
  let entries;
  try {
    entries = await readdir(glossaryDir, { withFileTypes: true });
  } catch (err) {
    console.warn(`[glossary] 读取目录失败: ${glossaryDir} - ${err.message}`);
    await mkdir(outputDir, { recursive: true });
    await writeFile(outputFile, '{}', 'utf-8');
    console.log(`Glossary index: 0 terms written (empty) to ${outputFile}`);
    return;
  }

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    const moduleId = entry.name.replace(/\.json$/, '');
    const filePath = join(glossaryDir, entry.name);

    const terms = await parseGlossaryJson(filePath, moduleId);
    // 逐项合并到全局索引，检测术语跨模块重复定义
    // 冲突策略：保留首次定义，记录警告日志便于后续核对
    for (const [termName, termEntry] of Object.entries(terms)) {
      const existing = allTerms[termName];
      if (existing) {
        console.warn(
          `[glossary] 术语 "${termName}" 重复定义：` +
            `已保留 ${existing.module} 模块的定义，忽略 ${moduleId} 模块的同名术语`,
        );
        continue;
      }
      allTerms[termName] = termEntry;
    }
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
