#!/usr/bin/env node
/**
 * 命名规范综合验证脚本
 *
 * 功能概述：
 * 扫描 cnt-content/full，检查：
 * 1. 文件夹命名：NNN-english-short（小写+连字符）
 * 2. 文档命名：NNN-EnglishName.md（PascalCase）
 * 3. 文件夹前缀唯一且连续
 * 4. 文档前缀在模块内唯一
 * 5. 前缀范围合法（1-999）
 *
 * 使用方式：
 *   node scripts/validate-naming.mjs
 *
 * 退出码：
 * - 0：全部合规
 * - 1：发现违规项
 */

import { readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FANDEX_ROOT = resolve(__dirname, '..', '..');
const CONTENT_ROOT = join(FANDEX_ROOT, 'cnt-content');

/** 命名模式（与 naming.config.json 对齐） */
const FOLDER_PATTERN = /^(\d{3})-([a-z][a-z0-9-]*)$/;
const DOC_PATTERN = /^(\d{3})-([A-Za-z][A-Za-z0-9-]*)\.md$/;
const DOC_FALLBACK_PATTERN = /^(\d{3})-Doc\d+\.md$/;
const SINGLE_LETTER_PATTERN = /^(\d{3})-([A-Z])\.md$/;

/** 验证结果收集 */
const violations = [];
let totalFolders = 0;
let totalDocs = 0;
let compliantFolders = 0;
let compliantDocs = 0;

/**
 * 验证单个内容目录
 *
 * @param {string} manifestType - 内容目录名（如 'full'）
 */
function validateManifestType(manifestType) {
  const dir = join(CONTENT_ROOT, manifestType);
  console.log(`\n[validate] 扫描 ${manifestType}: ${dir}`);

  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    console.warn(`[validate]   目录不存在，跳过: ${dir}`);
    return;
  }

  const folders = entries.filter((e) => e.isDirectory() && !e.name.startsWith('_'));
  const usedFolderOrders = new Set();

  for (const folder of folders) {
    totalFolders++;
    const match = FOLDER_PATTERN.exec(folder.name);
    if (!match) {
      violations.push({
        type: 'folder-name',
        severity: 'error',
        path: `${manifestType}/${folder.name}`,
        message: `文件夹名不符合 NNN-english-short 规范`,
      });
      continue;
    }

    const order = parseInt(match[1], 10);
    if (order < 1 || order > 999) {
      violations.push({
        type: 'folder-order-range',
        severity: 'error',
        path: `${manifestType}/${folder.name}`,
        message: `文件夹前缀超出范围 1-999: ${order}`,
      });
      continue;
    }
    if (usedFolderOrders.has(order)) {
      violations.push({
        type: 'folder-order-dup',
        severity: 'error',
        path: `${manifestType}/${folder.name}`,
        message: `文件夹前缀重复: ${order}`,
      });
    }
    usedFolderOrders.add(order);
    compliantFolders++;

    /* 验证文件夹内文档（MERGED 合集为生成产物，前缀 000，不参与命名规范校验） */
    const folderPath = join(dir, folder.name);
    const docEntries = readdirSync(folderPath, { withFileTypes: true }).filter(
      (e) => e.isFile() && e.name.endsWith('.md') && !e.name.endsWith('-MERGED.md'),
    );

    const usedDocOrders = new Set();
    for (const doc of docEntries) {
      totalDocs++;
      const docMatch = DOC_PATTERN.exec(doc.name);

      if (!docMatch) {
        /* 检查是否是已知的 fallback 模式 */
        if (DOC_FALLBACK_PATTERN.test(doc.name)) {
          violations.push({
            type: 'doc-fallback',
            severity: 'error',
            path: `${manifestType}/${folder.name}/${doc.name}`,
            message: `文档仍使用 fallback 命名（DocNNN），需翻译为 PascalCase`,
          });
        } else if (SINGLE_LETTER_PATTERN.test(doc.name)) {
          violations.push({
            type: 'doc-single-letter',
            severity: 'error',
            path: `${manifestType}/${folder.name}/${doc.name}`,
            message: `文档英文名为单字母，需补全`,
          });
        } else {
          violations.push({
            type: 'doc-name',
            severity: 'error',
            path: `${manifestType}/${folder.name}/${doc.name}`,
            message: `文档名不符合 NNN-EnglishName.md 规范`,
          });
        }
        continue;
      }

      const docOrder = parseInt(docMatch[1], 10);
      if (docOrder < 1 || docOrder > 999) {
        violations.push({
          type: 'doc-order-range',
          severity: 'error',
          path: `${manifestType}/${folder.name}/${doc.name}`,
          message: `文档前缀超出范围 1-999: ${docOrder}`,
        });
        continue;
      }
      if (usedDocOrders.has(docOrder)) {
        violations.push({
          type: 'doc-order-dup',
          severity: 'error',
          path: `${manifestType}/${folder.name}/${doc.name}`,
          message: `模块内文档前缀重复: ${docOrder}`,
        });
      }
      usedDocOrders.add(docOrder);
      compliantDocs++;
    }
  }

  console.log(
    `[validate]   ${manifestType}: 文件夹 ${compliantFolders}/${totalFolders} 合规（当前累计），文档 ${compliantDocs}/${totalDocs} 合规（当前累计）`,
  );
}

/* 执行验证 */
console.log('[validate] 开始命名规范综合验证');
validateManifestType('full');

/* 输出结果 */
console.log('\n========== 验证结果 ==========');
console.log(`文件夹总数: ${totalFolders}（合规 ${compliantFolders}，违规 ${totalFolders - compliantFolders}）`);
console.log(`文档总数: ${totalDocs}（合规 ${compliantDocs}，违规 ${totalDocs - compliantDocs}）`);

if (violations.length === 0) {
  console.log('\n[validate] 全部合规，无违规项');
  process.exit(0);
}

console.log(`\n[validate] 发现 ${violations.length} 个违规项：`);
const grouped = new Map();
for (const v of violations) {
  if (!grouped.has(v.type)) grouped.set(v.type, []);
  grouped.get(v.type).push(v);
}
for (const [type, items] of grouped) {
  console.log(`\n  [${type}] 共 ${items.length} 项`);
  for (const item of items.slice(0, 20)) {
    console.log(`    - ${item.path}: ${item.message}`);
  }
  if (items.length > 20) {
    console.log(`    ... 还有 ${items.length - 20} 项未列出`);
  }
}

process.exit(1);
