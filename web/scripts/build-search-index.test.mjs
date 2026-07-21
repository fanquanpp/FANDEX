/**
 * build-search-index 单元测试
 *
 * 测试目标：覆盖搜索索引生成脚本的关键逻辑
 * - parseFrontmatter：Markdown frontmatter 解析（键值对、数组、无 frontmatter 等边界情况）
 * - slugFromPath：从文件路径生成 URL slug（含自定义 baseDir 参数）
 * - walkDir：递归目录遍历（嵌套目录、扩展名过滤）
 * - main：端到端索引生成（使用临时目录，验证输出 JSON 结构与排序）
 *
 * 测试策略：
 * parseFrontmatter 与 slugFromPath 为纯函数，直接断言输入输出。
 * walkDir 使用 os.tmpdir() 创建临时目录结构进行集成测试。
 * main 通过传入自定义 options 指向临时目录，验证完整的索引生成流程，
 * 避免修改真实文档目录与 public/data 输出路径。
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';

// 导入待测函数（脚本已通过 import.meta.url 守卫，import 时不会自动执行 main）
const { parseFrontmatter, slugFromPath, walkDir, main } = await import('./build-search-index.mjs');

describe('parseFrontmatter', () => {
  it('应解析简单的键值对 frontmatter', () => {
    const content = `---
title: JavaScript 基础
description: JS 入门教程
---
正文内容`;
    const fm = parseFrontmatter(content);
    expect(fm.title).toBe('JavaScript 基础');
    expect(fm.description).toBe('JS 入门教程');
  });

  it('应解析带引号的字符串值（去除引号）', () => {
    const content = `---
title: "带引号的标题"
description: '单引号描述'
---
正文`;
    const fm = parseFrontmatter(content);
    expect(fm.title).toBe('带引号的标题');
    expect(fm.description).toBe('单引号描述');
  });

  it('应解析数组类型的 frontmatter（如 tags）', () => {
    const content = `---
title: 文档标题
tags:
  - javascript
  - beginner
  - es6
---
正文`;
    const fm = parseFrontmatter(content);
    expect(fm.title).toBe('文档标题');
    expect(Array.isArray(fm.tags)).toBe(true);
    expect(fm.tags).toEqual(['javascript', 'beginner', 'es6']);
  });

  it('当 Markdown 无 frontmatter 时应返回空对象', () => {
    const content = '这是一篇没有 frontmatter 的文档';
    const fm = parseFrontmatter(content);
    expect(fm).toEqual({});
  });

  it('当 frontmatter 为空时应返回空对象', () => {
    const content = `---
---
正文`;
    const fm = parseFrontmatter(content);
    expect(fm).toEqual({});
  });

  it('应解析数值类型的 frontmatter（以字符串形式存储）', () => {
    const content = `---
title: 测试文档
order: 5
---
正文`;
    const fm = parseFrontmatter(content);
    expect(fm.title).toBe('测试文档');
    expect(fm.order).toBe('5');
  });

  it('应处理带连字符的键名', () => {
    const content = `---
title: 测试
custom-key: 值
---
正文`;
    const fm = parseFrontmatter(content);
    expect(fm.title).toBe('测试');
    expect(fm['custom-key']).toBe('值');
  });

  it('应处理 CRLF 换行符（Windows 风格）', () => {
    const content = `---\r\ntitle: CRLF 文档\r\ndescription: Windows 风格\r\n---\r\n正文`;
    const fm = parseFrontmatter(content);
    expect(fm.title).toBe('CRLF 文档');
    expect(fm.description).toBe('Windows 风格');
  });

  it('应处理数组项带引号的情况', () => {
    const content = `---
tags:
  - "quoted-tag"
  - 'single-quoted'
---
正文`;
    const fm = parseFrontmatter(content);
    expect(fm.tags).toEqual(['quoted-tag', 'single-quoted']);
  });
});

describe('slugFromPath', () => {
  it('应从嵌套路径中提取相对 slug', () => {
    const filePath = join('docs', 'javascript', 'basics.md');
    const baseDir = join('docs');
    const slug = slugFromPath(filePath, baseDir);
    // 路径分隔符被统一为正斜杠
    expect(slug).toBe('javascript/basics');
  });

  it('应去除 .md 扩展名', () => {
    const filePath = join('docs', 'basics.md');
    const baseDir = 'docs';
    expect(slugFromPath(filePath, baseDir)).toBe('basics');
  });

  it('应处理多级嵌套路径', () => {
    const filePath = join('docs', 'a', 'b', 'c', 'd.md');
    const baseDir = join('docs');
    expect(slugFromPath(filePath, baseDir)).toBe('a/b/c/d');
  });

  it('当路径与 baseDir 相同时应返回纯文件名', () => {
    const filePath = join('docs', 'file.md');
    const baseDir = 'docs';
    expect(slugFromPath(filePath, baseDir)).toBe('file');
  });

  it('应将 Windows 路径分隔符统一为正斜杠', () => {
    // 模拟 Windows 路径
    const filePath = 'docs' + sep + 'javascript' + sep + 'intro.md';
    const baseDir = 'docs';
    const slug = slugFromPath(filePath, baseDir);
    expect(slug).toBe('javascript/intro');
    expect(slug).not.toContain('\\');
  });
});

describe('walkDir', () => {
  let tempDir;

  beforeEach(async () => {
    // 创建临时目录结构用于测试
    tempDir = await mkdtemp(join(tmpdir(), 'fandex-walk-'));
    await mkdir(join(tempDir, 'subdir'), { recursive: true });
    await mkdir(join(tempDir, 'subdir', 'nested'), { recursive: true });
    await writeFile(join(tempDir, 'file1.md'), '# File 1');
    await writeFile(join(tempDir, 'file2.txt'), 'text file');
    await writeFile(join(tempDir, 'subdir', 'file3.md'), '# File 3');
    await writeFile(join(tempDir, 'subdir', 'nested', 'file4.md'), '# File 4');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('应递归遍历目录并找到所有 .md 文件', async () => {
    const files = [];
    await walkDir(tempDir, '.md', async (filePath) => {
      files.push(filePath);
    });
    expect(files).toHaveLength(3);
    const names = files.map((f) => f.split(sep).pop());
    expect(names).toContain('file1.md');
    expect(names).toContain('file3.md');
    expect(names).toContain('file4.md');
  });

  it('应跳过不匹配扩展名的文件', async () => {
    const files = [];
    await walkDir(tempDir, '.md', async (filePath) => {
      files.push(filePath);
    });
    // file2.txt 不应出现在结果中
    const hasTxt = files.some((f) => f.endsWith('.txt'));
    expect(hasTxt).toBe(false);
  });

  it('应处理空目录', async () => {
    const emptyDir = await mkdtemp(join(tmpdir(), 'fandex-empty-'));
    const files = [];
    await walkDir(emptyDir, '.md', async (filePath) => {
      files.push(filePath);
    });
    expect(files).toEqual([]);
    await rm(emptyDir, { recursive: true, force: true });
  });

  it('应对回调函数传入完整文件路径', async () => {
    const files = [];
    await walkDir(tempDir, '.md', async (filePath) => {
      files.push(filePath);
    });
    // 所有路径应以 tempDir 开头
    for (const f of files) {
      expect(f.startsWith(tempDir)).toBe(true);
    }
  });
});

describe('main', () => {
  let tempDocsDir;
  let tempOutputDir;
  let tempOutputFile;

  beforeEach(async () => {
    // 创建临时文档目录与输出目录
    tempDocsDir = await mkdtemp(join(tmpdir(), 'fandex-docs-'));
    tempOutputDir = await mkdtemp(join(tmpdir(), 'fandex-out-'));
    tempOutputFile = join(tempOutputDir, 'search-index.json');

    // 创建测试文档文件
    await mkdir(join(tempDocsDir, 'javascript'), { recursive: true });
    await writeFile(
      join(tempDocsDir, 'javascript', 'basics.md'),
      `---
title: JavaScript 基础
description: JS 入门
tags:
  - js
  - beginner
module: javascript
order: 1
difficulty: easy
updated: 2024-01-01
---
正文`
    );
    await writeFile(
      join(tempDocsDir, 'javascript', 'advanced.md'),
      `---
title: JavaScript 进阶
description: JS 高级特性
module: javascript
order: 2
difficulty: hard
---
正文`
    );
    // 无 frontmatter 的文件（应被跳过）
    await writeFile(join(tempDocsDir, 'javascript', 'no-meta.md'), '无 frontmatter');
    // 无 title 的文件（应被跳过）
    await writeFile(
      join(tempDocsDir, 'javascript', 'no-title.md'),
      `---
description: 缺少 title
---
正文`
    );
  });

  afterEach(async () => {
    await rm(tempDocsDir, { recursive: true, force: true });
    await rm(tempOutputDir, { recursive: true, force: true });
  });

  it('应生成包含正确文档条目的搜索索引', async () => {
    await main({
      docsDir: tempDocsDir,
      outputDir: tempOutputDir,
      outputFile: tempOutputFile,
    });

    const content = await readFile(tempOutputFile, 'utf-8');
    const entries = JSON.parse(content);
    // 仅 2 个有效文档（有 title 的）
    expect(entries).toHaveLength(2);
  });

  it('应跳过无 frontmatter 或无 title 的文件', async () => {
    await main({
      docsDir: tempDocsDir,
      outputDir: tempOutputDir,
      outputFile: tempOutputFile,
    });

    const content = await readFile(tempOutputFile, 'utf-8');
    const entries = JSON.parse(content);
    const titles = entries.map((e) => e.title);
    expect(titles).toContain('JavaScript 基础');
    expect(titles).toContain('JavaScript 进阶');
    expect(titles).not.toContain(undefined);
  });

  it('应按 module 与 order 排序文档条目', async () => {
    await main({
      docsDir: tempDocsDir,
      outputDir: tempOutputDir,
      outputFile: tempOutputFile,
    });

    const content = await readFile(tempOutputFile, 'utf-8');
    const entries = JSON.parse(content);
    // basics (order=1) 应在 advanced (order=2) 之前
    expect(entries[0].title).toBe('JavaScript 基础');
    expect(entries[0].order).toBe(1);
    expect(entries[1].title).toBe('JavaScript 进阶');
    expect(entries[1].order).toBe(2);
  });

  it('应正确提取 frontmatter 中的所有字段', async () => {
    await main({
      docsDir: tempDocsDir,
      outputDir: tempOutputDir,
      outputFile: tempOutputFile,
    });

    const content = await readFile(tempOutputFile, 'utf-8');
    const entries = JSON.parse(content);
    const basics = entries.find((e) => e.title === 'JavaScript 基础');
    expect(basics.slug).toBe('javascript/basics');
    expect(basics.description).toBe('JS 入门');
    expect(basics.tags).toEqual(['js', 'beginner']);
    expect(basics.module).toBe('javascript');
    expect(basics.order).toBe(1);
    expect(basics.difficulty).toBe('easy');
    expect(basics.updated).toBe('2024-01-01');
  });

  it('应生成有效的 JSON 文件', async () => {
    await main({
      docsDir: tempDocsDir,
      outputDir: tempOutputDir,
      outputFile: tempOutputFile,
    });

    const content = await readFile(tempOutputFile, 'utf-8');
    expect(() => JSON.parse(content)).not.toThrow();
  });

  it('应处理空文档目录', async () => {
    const emptyDocsDir = await mkdtemp(join(tmpdir(), 'fandex-empty-docs-'));
    await main({
      docsDir: emptyDocsDir,
      outputDir: tempOutputDir,
      outputFile: tempOutputFile,
    });

    const content = await readFile(tempOutputFile, 'utf-8');
    const entries = JSON.parse(content);
    expect(entries).toEqual([]);
    await rm(emptyDocsDir, { recursive: true, force: true });
  });
});
