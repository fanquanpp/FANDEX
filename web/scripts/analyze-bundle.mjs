#!/usr/bin/env node
/**
 * Bundle 大小分析构建脚本
 *
 * 功能概述：
 * 在 npm run build 完成后自动执行，扫描 dist/assets 目录下的 JS/CSS 文件，
 * 计算 gzipped 大小，标记超出预算的文件（JS > 150KB gzipped、CSS > 30KB gzipped），
 * 输出结构化报告到控制台。若存在超预算文件，以非零退出码终止（CI 阻断）。
 *
 * 设计说明：
 * 此脚本是 src/utils/bundle-analyzer.ts 的 Node.js 运行时镜像，
 * 避免在构建期引入 TypeScript 编译依赖。两份实现保持逻辑一致。
 *
 * 使用方式：
 *   node scripts/analyze-bundle.mjs            # 默认分析 dist/assets
 *   node scripts/analyze-bundle.mjs dist/assets # 指定目录
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { gzipSync } from 'node:zlib';

/** JS 文件 gzipped 预算阈值：150KB */
const JS_BUDGET_BYTES = 150 * 1024;
/** CSS 文件 gzipped 预算阈值：30KB */
const CSS_BUDGET_BYTES = 30 * 1024;

/**
 * 计算文件内容的 gzipped 大小
 * @param {string} content - 文件内容
 * @returns {number} gzipped 字节数
 */
function computeGzipSize(content) {
  try {
    const buf = Buffer.from(content, 'utf-8');
    return gzipSync(buf).length;
  } catch {
    return Buffer.byteLength(content, 'utf-8');
  }
}

/**
 * 根据扩展名判断 Bundle 类型
 * @param {string} ext - 文件扩展名（含点）
 * @returns {'js' | 'css' | null}
 */
function detectBundleType(ext) {
  if (ext === '.js' || ext === '.mjs') return 'js';
  if (ext === '.css') return 'css';
  return null;
}

/**
 * 递归收集目录下的 Bundle 文件
 * @param {string} currentDir - 当前扫描目录
 * @param {string} rootDir - 根目录（用于计算相对路径）
 * @param {number} jsBudget - JS 预算
 * @param {number} cssBudget - CSS 预算
 * @returns {Array<{file: string, type: 'js'|'css', rawSize: number, gzipSize: number, overBudget: boolean, budget: number}>}
 */
function collectBundleFiles(currentDir, rootDir, jsBudget, cssBudget) {
  const results = [];
  let entries;
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
      results.push(...collectBundleFiles(fullPath, rootDir, jsBudget, cssBudget));
      continue;
    }
    if (!stat.isFile()) continue;
    const ext = extname(entry).toLowerCase();
    const type = detectBundleType(ext);
    if (type === null) continue;

    let content;
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
 * 分析指定目录下的 Bundle 文件
 * @param {string} assetsDir - 资源目录路径
 * @returns {{files: Array, summary: Object, passed: boolean}}
 */
function analyzeBundle(assetsDir) {
  if (!existsSync(assetsDir)) {
    return {
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
  }
  const files = collectBundleFiles(assetsDir, assetsDir, JS_BUDGET_BYTES, CSS_BUDGET_BYTES);
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
 * 格式化字节数为人类可读字符串
 * @param {number} bytes
 * @returns {string}
 */
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

/**
 * 格式化报告为人类可读字符串
 * @param {Object} report
 * @returns {string}
 */
function formatBundleReport(report) {
  const lines = [];
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

// ========== 主入口 ==========
const targetDir = process.argv[2] || 'dist/assets';
const report = analyzeBundle(targetDir);
console.log(formatBundleReport(report));
// 超预算时以非零码退出，CI 流水线据此阻断
process.exit(report.passed ? 0 : 1);
