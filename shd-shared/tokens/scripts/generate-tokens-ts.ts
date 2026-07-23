#!/usr/bin/env tsx
/**
 * FANDEX 设计令牌 TypeScript 生成器
 *
 * 功能概述：
 * 将 W3C Design Tokens Format Module（2025.10）格式的 JSON 令牌转换为 TypeScript 对象。
 * - 读取 primitive/semantic/component 三层 JSON 令牌
 * - 解析 {reference} 花括号引用语法为实际值
 * - 分离浅色/深色主题令牌
 * - 单位转换：rem → px 数字、ms → 数字（适配 React Native 无单位样式）
 * - shadow 复合类型转为 RN shadow 对象
 * - 输出到 app-android/src/styles/tokens.ts
 *
 * 生成策略：
 * 1. primitive 层：输出嵌套对象，原值转换（rem→数字、ms→数字）
 * 2. semantic 层颜色：分别生成 lightTokens 和 darkTokens 两套
 * 3. semantic 层非颜色：输出为 semanticTokens（与主题无关）
 * 4. component 层：输出为 componentTokens（引用已解析为实际值）
 *
 * React Native 适配规则：
 * - rem 单位转 px 数字（1rem = 16px）：0.25rem → 4
 * - px 单位转数字：1px → 1
 * - ms 单位转数字：150ms → 150
 * - 颜色字符串保持不变：#FFFFFF → '#FFFFFF'
 * - cubicBezier 数组保持：[0.4, 0, 0.2, 1]
 * - shadow 复合 → { shadowColor, shadowOffset: {width, height}, shadowRadius, shadowOpacity, elevation }
 *
 * 运行方式：pnpm --filter @fandex/tokens run build:ts
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// ============================================================================
// 类型定义
// ============================================================================

interface TokenNode {
  $value?: TokenRawValue;
  $type?: string;
  $description?: string;
  [key: string]: TokenNode | TokenRawValue | string | undefined;
}

type TokenRawValue = string | number | boolean | object | Array<object | string | number>;

interface FlatToken {
  path: string;
  value: TokenRawValue;
  type?: string;
  description?: string;
}

interface DimensionValue {
  value: number;
  unit: string;
}

interface ShadowComposite {
  color: string;
  offsetX: DimensionValue;
  offsetY: DimensionValue;
  blur: DimensionValue;
  spread: DimensionValue;
}

interface RnShadowObject {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowRadius: number;
  shadowOpacity: number;
  elevation: number;
}

// ============================================================================
// 路径与文件工具
// ============================================================================

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const TOKENS_DIR = resolve(SCRIPT_DIR, '..');
const SHARED_DIR = resolve(TOKENS_DIR, '..');
/** 项目根目录 */
const PROJECT_ROOT = resolve(SHARED_DIR, '..');
/** TS 输出路径（app-android/src/styles/tokens.ts） */
const TS_OUTPUT = join(PROJECT_ROOT, 'app-android', 'src', 'styles', 'tokens.ts');

/**
 * 读取指定层目录下的所有 JSON 令牌文件
 */
function loadLayerTokens(layer: 'primitive' | 'semantic' | 'component'): Record<string, TokenNode> {
  const layerDir = join(TOKENS_DIR, layer);
  const result: Record<string, TokenNode> = {};

  if (!existsSync(layerDir)) {
    console.warn(`[警告] 令牌目录不存在: ${layerDir}`);
    return result;
  }

  const files = readdirSync(layerDir).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    const key = file.replace(/\.json$/, '');
    const filePath = join(layerDir, file);
    const content = readFileSync(filePath, 'utf-8');
    try {
      result[key] = JSON.parse(content) as TokenNode;
      console.log(`[加载] ${layer}/${file}`);
    } catch (err) {
      console.error(`[错误] 解析失败: ${filePath} - ${(err as Error).message}`);
      throw err;
    }
  }
  return result;
}

// ============================================================================
// 令牌扁平化
// ============================================================================

const RESERVED_KEYS = new Set(['$value', '$type', '$description']);

/**
 * 递归扁平化令牌树
 */
function flattenTokens(node: TokenNode, prefix: string, parentType?: string): FlatToken[] {
  const tokens: FlatToken[] = [];
  const currentType = node.$type ?? parentType;

  if (node.$value !== undefined) {
    tokens.push({
      path: prefix,
      value: node.$value,
      type: currentType,
      description: typeof node.$description === 'string' ? node.$description : undefined,
    });
    return tokens;
  }

  for (const [key, child] of Object.entries(node)) {
    if (RESERVED_KEYS.has(key)) continue;
    if (child === null || typeof child !== 'object') continue;
    const childPath = prefix ? `${prefix}.${key}` : key;
    const childTokens = flattenTokens(child as TokenNode, childPath, currentType);
    tokens.push(...childTokens);
  }

  return tokens;
}

// ============================================================================
// 引用解析
// ============================================================================

/** 引用语法正则：匹配 {path.to.token}（注意结尾必须是 } 而非 )） */
const REFERENCE_PATTERN = /^\{(.+)\}$/;

function buildTokenMap(allTokens: FlatToken[]): Map<string, FlatToken> {
  const map = new Map<string, FlatToken>();
  for (const token of allTokens) {
    map.set(token.path, token);
  }
  return map;
}

function isReference(value: unknown): value is string {
  return typeof value === 'string' && REFERENCE_PATTERN.test(value);
}

function extractRefPath(ref: string): string {
  const match = REFERENCE_PATTERN.exec(ref);
  return match ? match[1] : ref;
}

// ============================================================================
// 单位转换（React Native 适配）
// ============================================================================

/** 1rem = 16px（Web 标准基准） */
const REM_TO_PX = 16;

/**
 * 将带单位的 CSS 字符串转为 React Native 无单位数字
 * - "0.25rem" → 4（rem 转 px）
 * - "1px" → 1
 * - "150ms" → 150
 * - "0" → 0
 * - "transparent" → "transparent"（非数值字符串保持不变）
 */
function dimensionToNumber(value: string): number | string {
  // 纯数字
  if (/^-?\d+$/.test(value)) {
    return parseInt(value, 10);
  }
  // rem 单位
  const remMatch = /^(-?[\d.]+)rem$/.exec(value);
  if (remMatch) {
    return Math.round(parseFloat(remMatch[1]) * REM_TO_PX);
  }
  // px 单位
  const pxMatch = /^(-?[\d.]+)px$/.exec(value);
  if (pxMatch) {
    return Math.round(parseFloat(pxMatch[1]));
  }
  // ms 单位
  const msMatch = /^(-?[\d.]+)ms$/.exec(value);
  if (msMatch) {
    return parseInt(msMatch[1], 10);
  }
  // 百分比或其他单位：保持字符串（RN 部分支持百分比字符串）
  return value;
}

/**
 * 将 hex8 颜色（#RRGGBBAA）解析为颜色和透明度
 * RN 支持 #RRGGBBAA 格式，但 shadowOpacity 需要单独的 0-1 数值
 */
function parseHexAlpha(hex: string): { color: string; opacity: number } {
  if (/^#[0-9A-Fa-f]{8}$/.test(hex)) {
    // #RRGGBBAA 格式
    const color = hex.substring(0, 7); // #RRGGBB
    const alphaHex = hex.substring(7, 9);
    const opacity = parseInt(alphaHex, 16) / 255;
    return { color, opacity };
  }
  return { color: hex, opacity: 1 };
}

/**
 * 将 W3C shadow 复合对象转为 React Native shadow 对象
 * RN shadow 属性：shadowColor, shadowOffset, shadowRadius, shadowOpacity, elevation
 */
function shadowToRn(value: TokenRawValue): RnShadowObject | RnShadowObject[] {
  const formatSingle = (shadow: ShadowComposite): RnShadowObject => {
    const { color, opacity } = parseHexAlpha(shadow.color);
    return {
      shadowColor: color,
      shadowOffset: {
        width: shadow.offsetX.value,
        height: shadow.offsetY.value,
      },
      shadowRadius: shadow.blur.value,
      shadowOpacity: opacity,
      // elevation 近似 blur 值（Android 阴影模型简化）
      elevation: Math.max(1, Math.round(shadow.blur.value / 2)),
    };
  };

  if (Array.isArray(value)) {
    // RN 不支持多层阴影，取第一层
    return formatSingle(value[0] as ShadowComposite);
  }
  return formatSingle(value as ShadowComposite);
}

// ============================================================================
// 值转 TypeScript 值
// ============================================================================

/**
 * 将令牌值解析为 TypeScript 值（递归解析引用，转换单位适配 RN）
 *
 * 解析规则：
 * - 引用字符串（{path}）→ 查找令牌表，递归解析为实际值
 * - 颜色字符串（#XXXXXX）→ 保持字符串
 * - 尺寸字符串（Xrem/Xpx）→ 数字
 * - 时长字符串（Xms）→ 数字
 * - 数字 → 保持数字
 * - cubicBezier 数组 → 保持数组
 * - shadow 复合 → RN shadow 对象
 *
 * 循环引用保护：通过 visited 路径集合检测并中断循环
 */
function resolveValueToTs(
  value: TokenRawValue,
  tokenMap: Map<string, FlatToken>,
  visited?: Set<string>,
): unknown {
  // 1. 字符串：可能是引用、颜色、尺寸、时长
  if (typeof value === 'string') {
    if (isReference(value)) {
      const refPath = extractRefPath(value);
      // 循环引用检测
      const currentVisited = visited ?? new Set<string>();
      if (currentVisited.has(refPath)) {
        console.warn(`[警告] 检测到循环引用: ${refPath}，已中断递归`);
        return null;
      }
      const refToken = tokenMap.get(refPath);
      if (!refToken) {
        console.warn(`[警告] 未找到引用: ${refPath}`);
        return null;
      }
      // 递归解析引用，传递已访问路径集合
      const nextVisited = new Set(currentVisited);
      nextVisited.add(refPath);
      return resolveValueToTs(refToken.value, tokenMap, nextVisited);
    }
    // 颜色字符串（# 开头）
    if (value.startsWith('#')) {
      return value;
    }
    // transparent 关键字
    if (value === 'transparent') {
      return 'transparent';
    }
    // 尺寸/时长字符串转数字
    return dimensionToNumber(value);
  }

  // 2. 数字
  if (typeof value === 'number') {
    return value;
  }

  // 3. 数组：cubicBezier 或 shadow 数组
  if (Array.isArray(value)) {
    // cubicBezier（4 个数字）
    if (value.length === 4 && value.every((v) => typeof v === 'number')) {
      return value;
    }
    // shadow 数组
    if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null && 'color' in value[0]) {
      return shadowToRn(value);
    }
    // 其他数组
    return value.map((v) => resolveValueToTs(v, tokenMap));
  }

  // 4. 对象：shadow 或 transition 复合类型
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    // shadow 复合
    if ('color' in obj && 'offsetX' in obj) {
      return shadowToRn(value);
    }
    // transition 复合：解析为 { duration, delay, timingFunction } 对象
    if ('duration' in obj && 'timingFunction' in obj) {
      const trans = value as { duration: unknown; delay: unknown; timingFunction: unknown };
      return {
        duration: resolveValueToTs(trans.duration as TokenRawValue, tokenMap),
        delay: resolveValueToTs(trans.delay as TokenRawValue, tokenMap),
        timingFunction: resolveValueToTs(trans.timingFunction as TokenRawValue, tokenMap),
      };
    }
    // 未知对象
    console.warn(`[警告] 未知复合类型: ${JSON.stringify(value)}`);
    return value;
  }

  return value;
}

// ============================================================================
// 嵌套对象重建
// ============================================================================

/**
 * 将扁平化路径重建为嵌套对象
 * 如 "color.bg.primary" -> { color: { bg: { primary: value } } }
 *
 * 路径段为纯数字时，在对象中使用字符串键（如 neutral["1050"]）
 */
function rebuildNestedObject(entries: Array<{ path: string; value: unknown }>): object {
  const root: Record<string, unknown> = {};

  for (const { path, value } of entries) {
    const segments = path.split('.');
    let current: Record<string, unknown> = root;

    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i];
      if (current[seg] === undefined || current[seg] === null) {
        current[seg] = {};
      }
      current = current[seg] as Record<string, unknown>;
    }

    const lastSeg = segments[segments.length - 1];
    current[lastSeg] = value;
  }

  return root;
}

// ============================================================================
// TypeScript 代码生成
// ============================================================================

/**
 * 将 JS 值序列化为 TypeScript 代码字符串
 * - 字符串 → 'value'（单引号）
 * - 数字 → 直接输出
 * - 数组 → [a, b, c]
 * - 对象 → { key: value }
 * - null → null
 */
function serializeTs(value: unknown, indent = 0): string {
  const pad = '  '.repeat(indent);
  const childPad = '  '.repeat(indent + 1);

  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value === 'string') {
    // 转义单引号
    const escaped = value.replace(/'/g, "\\'");
    return `'${escaped}'`;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const items = value.map((v) => serializeTs(v, indent + 1));
    return `[\n${childPad}${items.join(`,\n${childPad}`)},\n${pad}]`;
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj);
    if (keys.length === 0) return '{}';

    const entries = keys.map((key) => {
      // 数字键需用引号
      const quotedKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `'${key}'`;
      const valStr = serializeTs(obj[key], indent + 1);
      return `${childPad}${quotedKey}: ${valStr}`;
    });

    return `{\n${entries.join(',\n')},\n${pad}}`;
  }

  return String(value);
}

/**
 * 将嵌套对象生成为 TypeScript 导出常量
 */
function generateTsExport(varName: string, obj: object, description: string): string {
  const tsValue = serializeTs(obj, 0);
  return `/** ${description} */\nexport const ${varName} = ${tsValue};\n`;
}

// ============================================================================
// 主函数
// ============================================================================

function main(): void {
  console.log('========================================');
  console.log('FANDEX 设计令牌 TypeScript 生成器');
  console.log('========================================\n');

  // 1. 加载所有层令牌
  console.log('[步骤 1] 加载 JSON 令牌文件...');
  const primitiveRaw = loadLayerTokens('primitive');
  const semanticRaw = loadLayerTokens('semantic');
  const componentRaw = loadLayerTokens('component');

  // 2. 扁平化所有令牌，构建查找表
  console.log('\n[步骤 2] 扁平化令牌并构建引用查找表...');
  const allFlat: FlatToken[] = [];

  for (const [key, node] of Object.entries(primitiveRaw)) {
    allFlat.push(...flattenTokens(node, ''));
  }

  // semantic 层颜色：以 light 为基准加入 tokenMap（用于引用解析）
  // 但同时保留 dark 的扁平化数据用于生成 darkTokens
  const colorLightFlat: FlatToken[] = [];
  const colorDarkFlat: FlatToken[] = [];
  const otherSemanticFlat: FlatToken[] = [];

  for (const [key, node] of Object.entries(semanticRaw)) {
    if (key === 'color.light') {
      // 使用空前缀扁平化：路径为 color.bg.primary（与引用路径一致）
      const flat = flattenTokens(node, '');
      colorLightFlat.push(...flat);
      // 加入全量查找表（light 优先）
      for (const t of flat) {
        if (!allFlat.some((existing) => existing.path === t.path)) {
          allFlat.push(t);
        }
      }
    } else if (key === 'color.dark') {
      // 使用空前缀扁平化：路径为 color.bg.primary（与引用路径一致）
      const flat = flattenTokens(node, '');
      colorDarkFlat.push(...flat);
    } else {
      // 使用空前缀扁平化：文件顶层键即作为路径首段（如 space.page.x）
      const flat = flattenTokens(node, '');
      otherSemanticFlat.push(...flat);
      // 加入全量查找表时去重：不覆盖 primitive 层已存在的同名令牌
      // 原因：semantic 层某些令牌路径与 primitive 相同（如 motion.easing.default），
      // 但 semantic 值是引用字符串，会覆盖 primitive 的实际值导致循环引用
      for (const t of flat) {
        if (!allFlat.some((existing) => existing.path === t.path)) {
          allFlat.push(t);
        }
      }
    }
  }

  for (const [key, node] of Object.entries(componentRaw)) {
    allFlat.push(...flattenTokens(node, ''));
  }

  const tokenMap = buildTokenMap(allFlat);
  console.log(`[信息] 共加载 ${allFlat.length} 个令牌`);

  // 3. 解析令牌值为 TS 值
  console.log('\n[步骤 3] 解析令牌值为 TypeScript 值...');

  // 3.1 primitive 层
  const primitiveEntries: Array<{ path: string; value: unknown }> = [];
  for (const [key, node] of Object.entries(primitiveRaw)) {
    // 使用空前缀扁平化：文件顶层键即作为路径首段（如 color.neutral.1050）
    const flat = flattenTokens(node, '');
    for (const t of flat) {
      primitiveEntries.push({ path: t.path, value: resolveValueToTs(t.value, tokenMap) });
    }
  }
  const primitiveObj = rebuildNestedObject(primitiveEntries);
  console.log(`[信息] primitive 层解析完成`);

  // 3.2 semantic 层颜色（light）
  const lightEntries: Array<{ path: string; value: unknown }> = [];
  for (const t of colorLightFlat) {
    lightEntries.push({ path: t.path, value: resolveValueToTs(t.value, tokenMap) });
  }
  const lightObj = rebuildNestedObject(lightEntries);
  console.log(`[信息] semantic 层浅色主题解析完成`);

  // 3.3 semantic 层颜色（dark）
  const darkEntries: Array<{ path: string; value: unknown }> = [];
  for (const t of colorDarkFlat) {
    darkEntries.push({ path: t.path, value: resolveValueToTs(t.value, tokenMap) });
  }
  const darkObj = rebuildNestedObject(darkEntries);
  console.log(`[信息] semantic 层深色主题解析完成`);

  // 3.4 semantic 层非颜色
  const otherSemanticEntries: Array<{ path: string; value: unknown }> = [];
  for (const t of otherSemanticFlat) {
    otherSemanticEntries.push({ path: t.path, value: resolveValueToTs(t.value, tokenMap) });
  }
  const semanticObj = rebuildNestedObject(otherSemanticEntries);
  console.log(`[信息] semantic 层非颜色令牌解析完成`);

  // 3.5 component 层
  const componentEntries: Array<{ path: string; value: unknown }> = [];
  for (const [key, node] of Object.entries(componentRaw)) {
    // 使用空前缀扁平化：文件顶层键即作为路径首段（如 button.primary.default.bg）
    const flat = flattenTokens(node, '');
    for (const t of flat) {
      componentEntries.push({ path: t.path, value: resolveValueToTs(t.value, tokenMap) });
    }
  }
  const componentObj = rebuildNestedObject(componentEntries);
  console.log(`[信息] component 层解析完成`);

  // 4. 组装 TypeScript 文件
  console.log('\n[步骤 4] 组装 TypeScript 文件...');

  const header = `/**
 * FANDEX 设计令牌 — TypeScript 版本（自动生成，请勿手动修改）
 *
 * 生成来源：shd-shared/tokens/ 下的 W3C DTCG JSON 令牌
 * 生成脚本：shd-shared/tokens/scripts/generate-tokens-ts.ts
 * 生成时间：${new Date().toISOString()}
 *
 * 适用平台：React Native（Android）
 *
 * 单位转换规则：
 * - rem → px 数字（1rem = 16px）：0.25rem → 4
 * - px → 数字：1px → 1
 * - ms → 数字：150ms → 150
 * - 颜色保持字符串：#FFFFFF → '#FFFFFF'
 * - shadow 复合 → { shadowColor, shadowOffset, shadowRadius, shadowOpacity, elevation }
 *
 * 使用方式：
 *   import { lightTokens, darkTokens } from './styles/tokens';
 *   const colors = isDark ? darkTokens.color : lightTokens.color;
 *   <View style={{ backgroundColor: colors.bg.primary }} />
 */

`;

  const tsContent =
    header +
    '// ============================================================================\n' +
    '// Primitive 层 — 原始令牌值\n' +
    '// ============================================================================\n\n' +
    generateTsExport('primitiveTokens', primitiveObj, '原始令牌值（颜色原值、间距数字、尺寸数字等）') +
    '\n' +
    '// ============================================================================\n' +
    '// Semantic 层 — 浅色主题\n' +
    '// ============================================================================\n\n' +
    generateTsExport('lightTokens', lightObj, '浅色主题语义令牌（bg/fg/accent/border 等语义颜色）') +
    '\n' +
    '// ============================================================================\n' +
    '// Semantic 层 — 深色主题\n' +
    '// ============================================================================\n\n' +
    generateTsExport('darkTokens', darkObj, '深色主题语义令牌（bg/fg/accent/border 等语义颜色）') +
    '\n' +
    '// ============================================================================\n' +
    '// Semantic 层 — 非颜色令牌（主题无关）\n' +
    '// ============================================================================\n\n' +
    generateTsExport('semanticTokens', semanticObj, '语义令牌（间距/尺寸/字体/圆角/阴影/动效，与主题无关）') +
    '\n' +
    '// ============================================================================\n' +
    '// Component 层 — 组件级令牌\n' +
    '// ============================================================================\n\n' +
    generateTsExport('componentTokens', componentObj, '组件级令牌（button/card/input 等，引用已解析为实际值）') +
    '\n' +
    '// ============================================================================\n' +
    '// 工具函数\n' +
    '// ============================================================================\n\n' +
    `/**
 * 根据当前主题获取语义令牌
 * @param isDark - 是否深色模式
 * @returns 对应主题的语义令牌对象
 */
export function getTokens(isDark: boolean) {
  return {
    color: isDark ? darkTokens.color : lightTokens.color,
    ...semanticTokens,
    component: componentTokens,
  };
}

/**
 * 获取 primitive 层令牌
 * primitive 层与主题无关，直接导出
 */
export type PrimitiveTokens = typeof primitiveTokens;
export type LightTokens = typeof lightTokens;
export type DarkTokens = typeof darkTokens;
export type SemanticTokens = typeof semanticTokens;
export type ComponentTokens = typeof componentTokens;
`;

  // 5. 写入文件
  console.log(`\n[步骤 5] 写入 TypeScript 文件: ${TS_OUTPUT}`);
  const outputDir = dirname(TS_OUTPUT);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
    console.log(`[信息] 创建输出目录: ${outputDir}`);
  }
  writeFileSync(TS_OUTPUT, tsContent, 'utf-8');
  console.log(`[成功] TypeScript 令牌已生成: ${TS_OUTPUT}`);
  console.log(`[统计] primitive=${primitiveEntries.length}, light=${lightEntries.length}, dark=${darkEntries.length}, semantic(非颜色)=${otherSemanticEntries.length}, component=${componentEntries.length}`);
  console.log(`[总计] ${primitiveEntries.length + lightEntries.length + darkEntries.length + otherSemanticEntries.length + componentEntries.length} 个令牌\n`);
}

main();
