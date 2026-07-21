/**
 * Bundle 大小分析工具
 *
 * 功能概述：
 * 扫描构建产物 dist/assets 目录下的 JS/CSS 文件，计算 gzipped 大小，
 * 标记超出预算的文件（JS > 150KB gzipped、CSS > 30KB gzipped），
 * 输出结构化报告。在 npm run build 后自动运行，也可手动调用。
 *
 * 设计原则：
 * - 纯函数工具：相同输入（目录内容）产生相同输出
 * - 仅在 Node.js 构建期运行，不参与运行时
 * - 不依赖任何业务逻辑，符合 utils 目录职责
 *
 * 使用方式：
 *   import { analyzeBundle } from '@/utils/bundle-analyzer';
 *   const report = analyzeBundle('dist/assets');
 *   console.log(report.summary);
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { gzipSync } from 'node:zlib';

/** Bundle 文件类型 */
export type BundleType = 'js' | 'css';

/** 单个 Bundle 文件的分析结果 */
export interface BundleFileReport {
  /** 文件相对路径 */
  file: string;
  /** 文件类型（js / css） */
  type: BundleType;
  /** 原始大小（字节） */
  rawSize: number;
  /** Gzip 压缩后大小（字节） */
  gzipSize: number;
  /** 是否超出预算 */
  overBudget: boolean;
  /** 预算阈值（字节，gzipped） */
  budget: number;
}

/** Bundle 分析汇总报告 */
export interface BundleAnalysisReport {
  /** 全部文件分析结果（按 gzip 大小降序） */
  files: BundleFileReport[];
  /** 汇总统计 */
  summary: {
    /** 文件总数 */
    totalFiles: number;
    /** 超预算文件数 */
    overBudgetCount: number;
    /** JS 文件总原始大小（字节） */
    jsRawTotal: number;
    /** JS 文件总 gzip 大小（字节） */
    jsGzipTotal: number;
    /** CSS 文件总原始大小（字节） */
    cssRawTotal: number;
    /** CSS 文件总 gzip 大小（字节） */
    cssGzipTotal: number;
  };
  /** 是否通过预算检查（无超预算文件时为 true） */
  passed: boolean;
}

/** JS 文件 gzipped 预算阈值：150KB */
const JS_BUDGET_BYTES = 150 * 1024;
/** CSS 文件 gzipped 预算阈值：30KB */
const CSS_BUDGET_BYTES = 30 * 1024;

/**
 * 计算文件的 gzipped 大小
 * @param content - 文件内容 Buffer 或字符串
 * @returns gzipped 字节数
 */
function computeGzipSize(content: string | Buffer): number {
  try {
    const buf = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
    return gzipSync(buf).length;
  } catch {
    // gzip 失败时回退到原始大小
    return typeof content === 'string' ? Buffer.byteLength(content, 'utf-8') : content.length;
  }
}

/**
 * 根据文件扩展名判断 Bundle 类型
 * @param ext - 文件扩展名（含点，如 .js）
 * @returns Bundle 类型；非 JS/CSS 返回 null
 */
function detectBundleType(ext: string): BundleType | null {
  if (ext === '.js' || ext === '.mjs') return 'js';
  if (ext === '.css') return 'css';
  return null;
}

/**
 * 分析指定目录下的 Bundle 文件大小
 *
 * 执行流程：
 * 1. 检查目录是否存在，不存在返回空报告
 * 2. 递归扫描目录下所有 .js/.mjs/.css 文件
 * 3. 读取文件内容，计算原始大小与 gzip 大小
 * 4. 比对预算阈值，标记超预算文件
 * 5. 汇总统计并按 gzip 大小降序返回
 *
 * @param assetsDir - 资源目录绝对或相对路径（如 'dist/assets'）
 * @param options - 可选配置：自定义 JS/CSS 预算
 * @returns Bundle 分析报告
 */
export function analyzeBundle(
  assetsDir: string,
  options?: { jsBudget?: number; cssBudget?: number }
): BundleAnalysisReport {
  const jsBudget = options?.jsBudget ?? JS_BUDGET_BYTES;
  const cssBudget = options?.cssBudget ?? CSS_BUDGET_BYTES;
  const emptyReport: BundleAnalysisReport = {
    files: [],
    summary: {
      totalFiles: 0,
      overBudgetCount: 0,
      jsRawTotal: 0,
      jsGzipTotal: 0,
      cssRawTotal: 0,
      cssGzipTotal: 0,
    },
    passed: true,
  };

  if (!existsSync(assetsDir)) {
    return emptyReport;
  }

  const files = collectBundleFiles(assetsDir, assetsDir, jsBudget, cssBudget);
  // 按 gzip 大小降序排序
  files.sort((a, b) => b.gzipSize - a.gzipSize);

  let jsRawTotal = 0;
  let jsGzipTotal = 0;
  let cssRawTotal = 0;
  let cssGzipTotal = 0;
  let overBudgetCount = 0;
  for (const f of files) {
    if (f.type === 'js') {
      jsRawTotal += f.rawSize;
      jsGzipTotal += f.gzipSize;
    } else {
      cssRawTotal += f.rawSize;
      cssGzipTotal += f.gzipSize;
    }
    if (f.overBudget) overBudgetCount++;
  }

  return {
    files,
    summary: {
      totalFiles: files.length,
      overBudgetCount,
      jsRawTotal,
      jsGzipTotal,
      cssRawTotal,
      cssGzipTotal,
    },
    passed: overBudgetCount === 0,
  };
}

/**
 * 递归收集目录下的 Bundle 文件
 * @param currentDir - 当前扫描目录
 * @param rootDir - 根目录（用于计算相对路径）
 * @param jsBudget - JS 预算
 * @param cssBudget - CSS 预算
 * @returns 文件分析结果数组
 */
function collectBundleFiles(
  currentDir: string,
  rootDir: string,
  jsBudget: number,
  cssBudget: number
): BundleFileReport[] {
  const results: BundleFileReport[] = [];
  let entries: string[];
  try {
    entries = readdirSync(currentDir);
  } catch {
    return results;
  }
  for (const entry of entries) {
    const fullPath = join(currentDir, entry);
    let stat;
    try {
      stat = statSync(fullPath);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      // 递归处理子目录
      results.push(...collectBundleFiles(fullPath, rootDir, jsBudget, cssBudget));
      continue;
    }
    if (!stat.isFile()) continue;
    const ext = extname(entry).toLowerCase();
    const type = detectBundleType(ext);
    if (type === null) continue;

    let content: string;
    try {
      content = readFileSync(fullPath, 'utf-8');
    } catch {
      continue;
    }
    const rawSize = Buffer.byteLength(content, 'utf-8');
    const gzipSize = computeGzipSize(content);
    const budget = type === 'js' ? jsBudget : cssBudget;
    results.push({
      file: fullPath.replace(rootDir, '').replace(/^[\\/]/, ''),
      type,
      rawSize,
      gzipSize,
      overBudget: gzipSize > budget,
      budget,
    });
  }
  return results;
}

/**
 * 将 Bundle 分析报告格式化为人类可读的字符串
 * 用于构建后控制台输出或日志记录
 * @param report - Bundle 分析报告
 * @returns 格式化字符串
 */
export function formatBundleReport(report: BundleAnalysisReport): string {
  const lines: string[] = [];
  lines.push('========== Bundle Size Analysis ==========');
  lines.push(`Total files: ${report.summary.totalFiles}`);
  lines.push(`Over budget: ${report.summary.overBudgetCount}`);
  lines.push(
    `JS total: ${formatBytes(report.summary.jsRawTotal)} raw / ${formatBytes(report.summary.jsGzipTotal)} gzip`
  );
  lines.push(
    `CSS total: ${formatBytes(report.summary.cssRawTotal)} raw / ${formatBytes(report.summary.cssGzipTotal)} gzip`
  );
  lines.push(`Status: ${report.passed ? 'PASSED' : 'FAILED'}`);
  if (report.summary.overBudgetCount > 0) {
    lines.push('');
    lines.push('Over-budget files:');
    for (const f of report.files) {
      if (!f.overBudget) continue;
      lines.push(
        `  [${f.type.toUpperCase()}] ${f.file} — ${formatBytes(f.gzipSize)} gzip > ${formatBytes(f.budget)} budget`
      );
    }
  }
  lines.push('==========================================');
  return lines.join('\n');
}

/**
 * 将字节数格式化为人类可读字符串（KB / MB）
 * @param bytes - 字节数
 * @returns 格式化字符串
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}
