/**
 * 内容扫描模块
 *
 * 功能概述：
 * 扫描 content/full/ 或 content/mobile/ 目录，提取模块与文档的物理元数据。
 * 仅负责文件层面的扫描与哈希计算，不涉及 ID 分配（ID 由 id-registry 管理）。
 *
 * 输出结构：
 * - 扫描结果按目录组织，每个子目录对应一个模块（english_short = 目录名）
 * - 每个模块下的 .md 文件对应一篇文档
 * - 文档元数据：title（取文件名或 frontmatter title）、source_path、sha256、size、updated_at
 *
 * 与 generate-manifest 的协作：
 * - content-scanner 输出物理扫描结果
 * - generate-manifest 结合 id-registry 将物理结果映射为带 ID 的 manifest
 * - 映射规则：english_short 匹配 id-registry 中的模块，文件路径匹配 id-registry 中的文档
 */

import { createHash } from 'node:crypto';
import { readFile, stat, readdir } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import fg from 'fast-glob';

/** 扫描出的文档元数据（不含 ID） */
export interface ScannedDoc {
  /** 文档标题（取 frontmatter title 或文件名，去除扩展名） */
  title: string;
  /** 文档相对路径（相对于 content/full/ 或 content/mobile/） */
  source_path: string;
  /** 文档文件内容的 SHA-256 哈希值（小写 hex） */
  sha256: string;
  /** 文档文件大小（字节） */
  size: number;
  /** 文档最近更新时间（ISO 8601 UTC，取文件 mtime） */
  updated_at: string;
  /** 文档 frontmatter 中的 tags（可选） */
  tags?: string[];
  /** 文档 frontmatter 中的 compat_version（可选） */
  compat_version?: string;
}

/** 扫描出的模块元数据（不含 ID） */
export interface ScannedModule {
  /** 模块英文简称（小写，来自目录名） */
  english_short: string;
  /** 模块显示名称（默认取目录名，可由 modules.json 覆盖） */
  name: string;
  /** 模块下的文档列表 */
  docs: ScannedDoc[];
}

/** 扫描结果 */
export interface ScanResult {
  /** 内容根目录绝对路径 */
  content_root: string;
  /** 扫描的模块列表 */
  modules: ScannedModule[];
}

/**
 * 扫描内容目录
 *
 * 输入：内容目录绝对路径（content/full/ 或 content/mobile/）
 * 输出：ScanResult（含所有模块与文档的物理元数据）
 * 流程：
 * 1. 使用 fast-glob 扫描所有 .md 文件
 * 2. 按一级目录分组（每个一级目录对应一个模块）
 * 3. 对每个文件计算 sha256、size、mtime
 * 4. 解析 frontmatter 提取 title、tags、compat_version
 *
 * @param contentDir - 内容目录绝对路径
 * @returns 扫描结果
 */
export async function scanContentDir(contentDir: string): Promise<ScanResult> {
  /* 扫描所有 .md 文件（排除 _ 开头的目录与文件，如 _drafts、_template） */
  const mdFiles = await fg.glob('**/*.md', {
    cwd: contentDir,
    onlyFiles: true,
    ignore: ['_*', '_*/**', 'node_modules/**'],
    dot: false,
  });

  /* 按一级目录分组 */
  const moduleMap = new Map<string, ScannedModule>();

  for (const relativePath of mdFiles) {
    /* 提取一级目录名作为 english_short */
    const pathParts = relativePath.split('/');
    if (pathParts.length < 2) {
      /* 根目录下的 .md 文件不属于任何模块，跳过 */
      continue;
    }
    const englishShort = pathParts[0]!;
    if (!englishShort) {
      continue;
    }

    /* 跳过非合法 english_short（非小写字母开头） */
    if (!/^[a-z][a-z0-9]*$/.test(englishShort)) {
      continue;
    }

    /* 获取或创建模块 */
    let module = moduleMap.get(englishShort);
    if (!module) {
      module = {
        english_short: englishShort,
        name: englishShort,
        docs: [],
      };
      moduleMap.set(englishShort, module);
    }

    /* 扫描文件元数据 */
    const absolutePath = join(contentDir, relativePath);
    const doc = await scanDocFile(absolutePath, relativePath);
    module.docs.push(doc);
  }

  /* 转换为数组并按 english_short 排序 */
  const modules = Array.from(moduleMap.values()).sort((a, b) =>
    a.english_short.localeCompare(b.english_short),
  );

  return {
    content_root: contentDir,
    modules,
  };
}

/**
 * 扫描单个文档文件
 *
 * 输入：文件绝对路径、相对路径
 * 输出：ScannedDoc（含 sha256、size、updated_at、title、tags 等）
 * 流程：
 * 1. 读取文件内容
 * 2. 计算 sha256
 * 3. 获取文件 stat（size、mtime）
 * 4. 解析 frontmatter 提取 title、tags、compat_version
 *
 * @param absolutePath - 文件绝对路径
 * @param relativePath - 文件相对路径（相对于 content 目录）
 * @returns 文档元数据
 */
async function scanDocFile(
  absolutePath: string,
  relativePath: string,
): Promise<ScannedDoc> {
  const content = await readFile(absolutePath);
  const fileStat = await stat(absolutePath);

  /* 计算 sha256 */
  const sha256 = createHash('sha256').update(content).digest('hex');

  /* 解析 frontmatter */
  const contentStr = content.toString('utf-8');
  const frontmatter = parseFrontmatter(contentStr);

  /* 提取 title：优先 frontmatter.title，其次文件名（去扩展名） */
  const fileName = relativePath.split('/').pop() ?? relativePath;
  const fileNameWithoutExt = fileName.replace(/\.md$/i, '');
  const title = frontmatter.title || fileNameWithoutExt;

  /* 标准化路径分隔符（统一使用 / ） */
  const normalizedPath = relativePath.split(sep).join('/');

  return {
    title,
    source_path: normalizedPath,
    sha256,
    size: fileStat.size,
    updated_at: fileStat.mtime.toISOString(),
    tags: frontmatter.tags,
    compat_version: frontmatter.compat_version,
  };
}

/**
 * 解析 Markdown frontmatter
 *
 * 输入：Markdown 文件内容
 * 输出：frontmatter 字段对象（title、tags、compat_version 等）
 * 流程：简易 YAML 解析，仅支持键值对与数组
 *
 * @param content - Markdown 文件内容
 * @returns frontmatter 字段对象
 */
function parseFrontmatter(content: string): {
  title?: string;
  tags?: string[];
  compat_version?: string;
  [key: string]: unknown;
} {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match?.[1]) {
    return {};
  }
  const raw = match[1];
  const data: { title?: string; tags?: string[]; compat_version?: string; [key: string]: unknown } = {};

  let currentKey: string | null = null;
  let inArray = false;

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();

    /* 数组项 */
    if (inArray && currentKey && trimmed.startsWith('- ')) {
      const item = trimmed.slice(2).trim().replace(/^['"]|['"]$/g, '');
      const arr = data[currentKey];
      if (Array.isArray(arr)) {
        arr.push(item);
      }
      continue;
    }

    /* 退出数组 */
    if (inArray && !trimmed.startsWith('- ') && trimmed !== '') {
      inArray = false;
      currentKey = null;
    }

    /* 键值对 */
    const kvMatch = trimmed.match(/^(\w[\w-]*):\s*(.*)$/);
    if (kvMatch) {
      const k = kvMatch[1]!;
      const v = kvMatch[2]!.trim();

      if (v === '') {
        /* 可能是数组起始 */
        data[k] = [];
        currentKey = k;
        inArray = true;
      } else {
        /* 普通键值对 */
        const cleaned = v.replace(/^['"]|['"]$/g, '');
        if (cleaned) {
          data[k] = cleaned;
        }
        currentKey = k;
        inArray = false;
      }
    }
  }

  return data;
}
