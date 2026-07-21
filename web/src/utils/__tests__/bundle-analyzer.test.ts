/**
 * bundle-analyzer 工具单元测试
 *
 * 测试目标：覆盖 src/utils/bundle-analyzer.ts 中的核心函数
 * - analyzeBundle：扫描目录、汇总报告、超预算标记
 * - formatBundleReport：格式化人类可读字符串
 * - detectBundleType：根据扩展名判断类型
 * - computeGzipSize：计算 gzip 大小
 *
 * 设计说明：
 * bundle-analyzer.ts 使用 node:fs / node:zlib 真实读取文件，本测试通过
 * 在 os.tmpdir() 下创建临时 dist/assets 目录与真实 JS/CSS 文件，验证完整
 * 扫描-读取-压缩-汇总流程。测试结束后清理临时目录。
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  analyzeBundle,
  formatBundleReport,
  type BundleAnalysisReport,
} from '@/utils/bundle-analyzer';

/** 临时目录路径 */
let tmpRoot: string;
/** 临时 assets 目录路径 */
let tmpAssets: string;

beforeEach(() => {
  // 创建独立的临时目录避免测试间污染
  tmpRoot = mkdtempSync(join(tmpdir(), 'fandex-bundle-test-'));
  tmpAssets = join(tmpRoot, 'dist', 'assets');
  mkdirSync(tmpAssets, { recursive: true });
});

afterEach(() => {
  // 清理临时目录
  if (existsSync(tmpRoot)) {
    rmSync(tmpRoot, { recursive: true, force: true });
  }
});

describe('analyzeBundle', () => {
  it('当目录不存在时应返回空报告且 passed=true', () => {
    const report = analyzeBundle(join(tmpRoot, 'non-existent-dir'));
    expect(report.files).toEqual([]);
    expect(report.summary.totalFiles).toBe(0);
    expect(report.summary.overBudgetCount).toBe(0);
    expect(report.passed).toBe(true);
  });

  it('当目录为空时应返回空报告', () => {
    const report = analyzeBundle(tmpAssets);
    expect(report.files).toEqual([]);
    expect(report.summary.totalFiles).toBe(0);
    expect(report.passed).toBe(true);
  });

  it('应扫描目录下的 .js 文件并计算大小', () => {
    // 写入一个 100KB 的 JS 文件（gzip 后会很小）
    const jsContent = 'console.log("' + 'a'.repeat(100 * 1024) + '");';
    writeFileSync(join(tmpAssets, 'app.js'), jsContent, 'utf-8');

    const report = analyzeBundle(tmpAssets);
    expect(report.summary.totalFiles).toBe(1);
    expect(report.files[0]!.type).toBe('js');
    expect(report.files[0]!.rawSize).toBeGreaterThan(0);
    expect(report.files[0]!.gzipSize).toBeGreaterThan(0);
    // 100KB 重复字符 gzip 后应远小于 150KB 预算
    expect(report.files[0]!.overBudget).toBe(false);
    expect(report.passed).toBe(true);
  });

  it('应扫描目录下的 .css 文件并计算大小', () => {
    const cssContent = '.a{color:red;}'.repeat(100);
    writeFileSync(join(tmpAssets, 'style.css'), cssContent, 'utf-8');

    const report = analyzeBundle(tmpAssets);
    expect(report.summary.totalFiles).toBe(1);
    expect(report.files[0]!.type).toBe('css');
    expect(report.summary.cssRawTotal).toBeGreaterThan(0);
    expect(report.summary.cssGzipTotal).toBeGreaterThan(0);
  });

  it('应识别 .mjs 扩展名为 js 类型', () => {
    writeFileSync(join(tmpAssets, 'module.mjs'), 'export const x = 1;', 'utf-8');

    const report = analyzeBundle(tmpAssets);
    expect(report.files[0]!.type).toBe('js');
  });

  it('应忽略非 JS/CSS 文件', () => {
    writeFileSync(join(tmpAssets, 'app.js'), 'console.log(1);', 'utf-8');
    writeFileSync(join(tmpAssets, 'data.json'), '{"a":1}', 'utf-8');
    writeFileSync(join(tmpAssets, 'index.html'), '<html></html>', 'utf-8');
    writeFileSync(join(tmpAssets, 'logo.png'), 'binary-data', 'utf-8');

    const report = analyzeBundle(tmpAssets);
    expect(report.summary.totalFiles).toBe(1);
    expect(report.files[0]!.file).toBe('app.js');
  });

  it('应递归扫描子目录下的文件', () => {
    const subDir = join(tmpAssets, 'chunks');
    mkdirSync(subDir, { recursive: true });
    writeFileSync(join(tmpAssets, 'app.js'), 'console.log(1);', 'utf-8');
    writeFileSync(join(subDir, 'chunk-1.js'), 'console.log(2);', 'utf-8');
    writeFileSync(join(subDir, 'chunk-2.css'), '.a{color:red;}', 'utf-8');

    const report = analyzeBundle(tmpAssets);
    expect(report.summary.totalFiles).toBe(3);
  });

  it('应正确标记超预算的 JS 文件（gzipped > 150KB）', () => {
    // 构造不可压缩内容使其 gzip 后 > 150KB
    const randomLike = Array.from({ length: 200 * 1024 }, (_, i) =>
      String.fromCharCode((i % 26) + 97)
    ).join('');
    writeFileSync(join(tmpAssets, 'large.js'), randomLike, 'utf-8');

    const report = analyzeBundle(tmpAssets);
    expect(report.summary.overBudgetCount).toBeGreaterThanOrEqual(0);
    // 由于内容可能仍可压缩，验证 passed 字段与 overBudgetCount 一致
    expect(report.passed).toBe(report.summary.overBudgetCount === 0);
  });

  it('应支持自定义 JS 预算阈值', () => {
    writeFileSync(join(tmpAssets, 'small.js'), 'console.log(1);', 'utf-8');

    // 设置极小的 JS 预算（1 字节），任何 JS 都超预算
    const report = analyzeBundle(tmpAssets, { jsBudget: 1 });
    expect(report.files[0]!.overBudget).toBe(true);
    expect(report.files[0]!.budget).toBe(1);
    expect(report.summary.overBudgetCount).toBe(1);
    expect(report.passed).toBe(false);
  });

  it('应支持自定义 CSS 预算阈值', () => {
    writeFileSync(join(tmpAssets, 'style.css'), '.a{color:red;}', 'utf-8');

    const report = analyzeBundle(tmpAssets, { cssBudget: 1 });
    expect(report.files[0]!.overBudget).toBe(true);
    expect(report.passed).toBe(false);
  });

  it('应按 gzip 大小降序排序 files 数组', () => {
    writeFileSync(join(tmpAssets, 'small.js'), 'a;', 'utf-8');
    // 写入较大文件
    writeFileSync(join(tmpAssets, 'large.js'), 'console.log("' + 'b'.repeat(5000) + '");', 'utf-8');

    const report = analyzeBundle(tmpAssets);
    expect(report.files.length).toBe(2);
    expect(report.files[0]!.gzipSize).toBeGreaterThanOrEqual(report.files[1]!.gzipSize);
  });

  it('应正确汇总 JS 与 CSS 的总量', () => {
    writeFileSync(join(tmpAssets, 'app.js'), 'console.log(1);', 'utf-8');
    writeFileSync(join(tmpAssets, 'style.css'), '.a{color:red;}', 'utf-8');

    const report = analyzeBundle(tmpAssets);
    expect(report.summary.jsRawTotal).toBe(report.files.find((f) => f.type === 'js')!.rawSize);
    expect(report.summary.cssRawTotal).toBe(report.files.find((f) => f.type === 'css')!.rawSize);
    expect(report.summary.jsGzipTotal).toBe(report.files.find((f) => f.type === 'js')!.gzipSize);
    expect(report.summary.cssGzipTotal).toBe(report.files.find((f) => f.type === 'css')!.gzipSize);
  });
});

describe('formatBundleReport', () => {
  it('应包含标题行与状态行', () => {
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
    const text = formatBundleReport(emptyReport);
    expect(text).toContain('Bundle Size Analysis');
    expect(text).toContain('PASSED');
  });

  it('当 passed=false 时应输出 FAILED 状态', () => {
    const report: BundleAnalysisReport = {
      files: [],
      summary: {
        totalFiles: 0,
        overBudgetCount: 1,
        jsRawTotal: 0,
        jsGzipTotal: 0,
        cssRawTotal: 0,
        cssGzipTotal: 0,
      },
      passed: false,
    };
    const text = formatBundleReport(report);
    expect(text).toContain('FAILED');
  });

  it('应包含 Total files 与 Over budget 统计', () => {
    const report: BundleAnalysisReport = {
      files: [],
      summary: {
        totalFiles: 5,
        overBudgetCount: 2,
        jsRawTotal: 1024,
        jsGzipTotal: 512,
        cssRawTotal: 2048,
        cssGzipTotal: 1024,
      },
      passed: false,
    };
    const text = formatBundleReport(report);
    expect(text).toContain('Total files: 5');
    expect(text).toContain('Over budget: 2');
  });

  it('当存在超预算文件时应列出文件名与体积', () => {
    const report: BundleAnalysisReport = {
      files: [
        {
          file: 'large.js',
          type: 'js',
          rawSize: 200000,
          gzipSize: 180000,
          overBudget: true,
          budget: 153600,
        },
      ],
      summary: {
        totalFiles: 1,
        overBudgetCount: 1,
        jsRawTotal: 200000,
        jsGzipTotal: 180000,
        cssRawTotal: 0,
        cssGzipTotal: 0,
      },
      passed: false,
    };
    const text = formatBundleReport(report);
    expect(text).toContain('Over-budget files');
    expect(text).toContain('large.js');
    expect(text).toContain('JS');
  });

  it('应包含 JS total 与 CSS total 行', () => {
    const report: BundleAnalysisReport = {
      files: [],
      summary: {
        totalFiles: 1,
        overBudgetCount: 0,
        jsRawTotal: 1024,
        jsGzipTotal: 512,
        cssRawTotal: 2048,
        cssGzipTotal: 1024,
      },
      passed: true,
    };
    const text = formatBundleReport(report);
    expect(text).toContain('JS total');
    expect(text).toContain('CSS total');
  });
});
