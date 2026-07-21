/**
 * FANDEX 搜索索引构建脚本
 *
 * 功能概述：
 * 扫描 src/content/docs 下所有 .md 文件，提取 frontmatter 中的元数据
 * （标题、描述、标签、模块、排序、难度、更新日期），生成 JSON 格式的
 * 搜索索引文件，输出到 public/data/search-index.json。
 * 当索引文件超过 100KB 时，自动压缩字段名以减小体积。
 */

import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, dirname, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** 当前脚本所在目录 */
const __dirname = dirname(fileURLToPath(import.meta.url));
/** 文档源文件目录 */
const DOCS_DIR = join(__dirname, '..', 'src', 'content', 'docs');
/** 索引输出目录 */
const OUTPUT_DIR = join(__dirname, '..', 'public', 'data');
/** 索引输出文件路径 */
const OUTPUT_FILE = join(OUTPUT_DIR, 'search-index.json');
/** 索引文件最大允许大小（100KB） */
const MAX_SIZE = 100 * 1024;

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
 * 解析 Markdown 文件的 frontmatter
 * 简易 YAML 解析器，支持键值对和数组格式
 *
 * @param {string} content - Markdown 文件完整内容
 * @returns {Object} 解析后的 frontmatter 键值对对象
 */
export function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const raw = match[1];
  const data = {};
  let key = null; // 当前正在解析的键名
  let inArray = false; // 是否正在解析数组
  let arrayVals = []; // 数组值收集器

  // 按 LF 或 CRLF 分行，确保 Windows 风格换行符不会在行尾残留 \r
  // 否则后续正则 (.*)$ 会因 . 不匹配 \r 而失败
  for (const line of raw.split(/\r?\n/)) {
    if (inArray) {
      // 尝试匹配数组项 "  - value"
      const itemMatch = line.match(/^\s+-\s+['"]?(.+?)['"]?\s*$/);
      if (itemMatch) {
        arrayVals.push(itemMatch[1]);
        continue;
      }
      // 数组结束，保存收集到的值
      data[key] = arrayVals;
      inArray = false;
      key = null;
      arrayVals = [];
    }
    // 匹配键值对
    const kvMatch = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (kvMatch) {
      const k = kvMatch[1];
      const v = kvMatch[2].trim();
      if (v === '') {
        // 空值表示数组开始
        key = k;
        inArray = true;
        arrayVals = [];
      } else {
        // 有值则直接存储，去除引号
        data[k] = v.replace(/^['"]|['"]$/g, '');
      }
    }
  }
  // 处理文件末尾仍在解析的数组
  if (inArray && key) data[key] = arrayVals;
  return data;
}

/**
 * 从文件路径生成 URL slug
 * 将绝对路径转换为相对于文档目录的路径，并去除扩展名
 *
 * @param {string} filePath - 文件绝对路径
 * @param {string} baseDir - 基准目录路径，用于计算相对路径（默认为 DOCS_DIR）
 * @returns {string} URL slug（如 "javascript/basics"）
 */
export function slugFromPath(filePath, baseDir = DOCS_DIR) {
  const rel = filePath.replace(baseDir + sep, '').replace(/[/\\]/g, '/');
  return rel.replace(/\.md$/, '');
}

/**
 * 主函数：构建搜索索引
 * @param {Object} options - 可选配置，用于覆盖默认的输入输出路径（测试时使用）
 * @param {string} options.docsDir - 文档源文件目录
 * @param {string} options.outputDir - 索引输出目录
 * @param {string} options.outputFile - 索引输出文件路径
 */
export async function main(options = {}) {
  const docsDir = options.docsDir || DOCS_DIR;
  const outputDir = options.outputDir || OUTPUT_DIR;
  const outputFile = options.outputFile || OUTPUT_FILE;

  const entries = [];

  // 遍历所有 .md 文件，提取元数据
  await walkDir(docsDir, '.md', async (filePath) => {
    const content = await readFile(filePath, 'utf-8');
    const fm = parseFrontmatter(content);
    if (!fm.title) return; // 跳过无标题的文件

    entries.push({
      slug: slugFromPath(filePath, docsDir),
      title: fm.title || '',
      description: fm.description || '',
      tags: Array.isArray(fm.tags) ? fm.tags : [],
      module: fm.module || '',
      order: Number(fm.order) || 0,
      difficulty: fm.difficulty || '',
      updated: fm.updated || '',
    });
  });

  // 按模块名和排序号排序
  entries.sort((a, b) => a.module.localeCompare(b.module) || a.order - b.order);

  // 确保输出目录存在
  await mkdir(outputDir, { recursive: true });

  // 生成完整 JSON
  const json = JSON.stringify(entries);
  const size = Buffer.byteLength(json, 'utf-8');

  // 如果超过大小限制，使用压缩字段名重新生成
  if (size > MAX_SIZE) {
    const trimmed = entries.map((e) => ({
      s: e.slug, // slug → s
      t: e.title, // title → t
      d: e.description.slice(0, 80), // description 截断至 80 字符
      g: e.tags, // tags → g
      m: e.module, // module → m
      o: e.order, // order → o
      f: e.difficulty, // difficulty → f
      u: e.updated, // updated → u
    }));
    const compressed = JSON.stringify(trimmed);
    const cSize = Buffer.byteLength(compressed, 'utf-8');
    if (cSize <= MAX_SIZE) {
      await writeFile(outputFile, compressed, 'utf-8');
      console.log(
        `Search index: ${entries.length} docs written (${(cSize / 1024).toFixed(1)}KB, compressed keys) to ${outputFile}`
      );
      return;
    }
  }

  // 未超限或压缩后仍超限，写入完整 JSON
  await writeFile(outputFile, json, 'utf-8');
  console.log(
    `Search index: ${entries.length} docs written (${(size / 1024).toFixed(1)}KB) to ${outputFile}`
  );
}

// 仅在直接运行时执行构建，被 import 时不自动执行（便于单元测试）
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch(console.error);
}
