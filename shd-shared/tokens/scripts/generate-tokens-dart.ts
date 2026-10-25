#!/usr/bin/env tsx

/**
 * 从 DTCG 令牌 JSON 生成 Flutter 色板（app-mobile/lib/core/token_colors.dart）。
 *
 * 这是 Flutter 移动端颜色的唯一生成源：primitive 调色板 + 亮/暗语义色全部
 * 由 shd-shared/tokens 的 JSON 解析而来，GeoPalette 只做语义令牌到组件角色的
 * 映射，不再手写十六进制值。`check-tokens-drift.mjs` 会校验生成文件与 JSON 逐值一致。
 *
 * 运行：pnpm --filter @fandex/tokens generate:dart
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const TOKENS_DIR = resolve(SCRIPT_DIR, '..');
const REPO_ROOT = resolve(TOKENS_DIR, '..', '..');
const OUTPUT = join(REPO_ROOT, 'app-mobile', 'lib', 'core', 'token_colors.dart');

interface TokenNode {
  $value?: string;
  $type?: string;
  $description?: string;
  [key: string]: unknown;
}

interface FlatToken {
  path: string;
  value: string;
}

function flatten(node: TokenNode, prefix: string, acc: FlatToken[]): void {
  if (typeof node.$value === 'string') {
    acc.push({ path: prefix, value: node.$value });
    return;
  }
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith('$')) continue;
    if (child === null || typeof child !== 'object') continue;
    flatten(child as TokenNode, prefix ? `${prefix}.${key}` : key, acc);
  }
}

function loadLayer(file: string): FlatToken[] {
  const json = JSON.parse(readFileSync(join(TOKENS_DIR, file), 'utf8')) as TokenNode;
  const acc: FlatToken[] = [];
  flatten(json, '', acc);
  return acc;
}

function toCamel(path: string): string {
  return path
    .split('.')
    .map((segment, i) => {
      const parts = segment.split('-');
      const joined = parts
        .map((part, j) => (i === 0 && j === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
        .join('');
      return joined;
    })
    .join('');
}

/** 解析 {color.x.y} 引用为 primitive 十六进制 */
function resolveValue(value: string, primitives: Map<string, string>): string {
  return value.replace(/\{([^}]+)\}/g, (_m, ref: string) => {
    const hex = primitives.get(ref);
    if (!hex) throw new Error(`未解析的令牌引用: ${ref}`);
    return hex;
  });
}

const primitiveFlat = loadLayer(join('primitive', 'color.json'));
// flatten 从根对象出发，路径已带 "color." 前缀（如 color.neutral.1050）
const primitives = new Map(primitiveFlat.map((t) => [t.path, t.value]));

function emitClass(name: string, flat: FlatToken[], resolveRefs: boolean, comment: string): string {
  const lines = flat.map((t) => {
    const value = resolveRefs ? resolveValue(t.value, primitives) : t.value;
    const hex = value.replace('#', '').toUpperCase();
    return `  static const Color ${toCamel(t.path)} = Color(0xFF${hex});`;
  });
  return `/// ${comment}\nclass ${name} {\n${lines.join('\n')}\n}\n`;
}

const semanticLight = loadLayer(join('semantic', 'color.light.json'));
const semanticDark = loadLayer(join('semantic', 'color.dark.json'));

// 注意：check-tokens-drift.mjs 里有一份同算法的轻量实现用于门禁校验，
// 两处算法必须保持一致（扁平化 -> 解析引用 -> 0xFFRRGGBB -> colorXxxYyy 命名）。

const header = `// 本文件由 shd-shared/tokens/scripts/generate-tokens-dart.ts 自动生成，
// 手动修改会在 check-tokens-drift 门禁中报错。重新生成：
//   pnpm --filter @fandex/tokens generate:dart

import 'package:flutter/material.dart' show Color;

`;

const body = [
  emitClass(
    'TokenPrimitive',
    primitiveFlat,
    false,
    '原始调色板（primitive/color.json）——无语义，仅供 GeoPalette 映射兜底。',
  ),
  emitClass(
    'TokenLight',
    semanticLight,
    true,
    '浅色语义色（semantic/color.light.json，引用已解析为最终十六进制）。',
  ),
  emitClass(
    'TokenDark',
    semanticDark,
    true,
    '深色语义色（semantic/color.dark.json，引用已解析为最终十六进制）。',
  ),
].join('\n');

writeFileSync(OUTPUT, header + body, 'utf-8');
console.log(`[generate-tokens-dart] 已写入 ${OUTPUT}`);
console.log(
  `[generate-tokens-dart] primitive ${primitiveFlat.length} 项，semantic light ${semanticLight.length} 项，dark ${semanticDark.length} 项`,
);
