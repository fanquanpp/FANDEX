#!/usr/bin/env tsx

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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

interface TransitionComposite {
  duration: string;
  delay: string;
  timingFunction: string | number[];
}

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const TOKENS_DIR = resolve(SCRIPT_DIR, '..');
const SHARED_DIR = resolve(TOKENS_DIR, '..');
const CSS_OUTPUT = join(SHARED_DIR, 'styles', 'tokens.css');

function pathToVarName(path: string): string {
  return (
    '--' +
    path
      .split('.')
      .map((segment) => segment.replace(/([A-Z])/g, '-$1').toLowerCase())
      .join('-')
  );
}

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

const RESERVED_KEYS = new Set(['$value', '$type', '$description']);

function flattenTokens(
  node: TokenNode,
  prefix: string,
  parentType?: string,
): FlatToken[] {
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

function shadowToCss(value: TokenRawValue, isInset = false): string {
  const formatSingle = (shadow: ShadowComposite): string => {
    const x = `${shadow.offsetX.value}${shadow.offsetX.unit}`;
    const y = `${shadow.offsetY.value}${shadow.offsetY.unit}`;
    const blur = `${shadow.blur.value}${shadow.blur.unit}`;
    const spread = `${shadow.spread.value}${shadow.spread.unit}`;
    const inset = isInset ? 'inset ' : '';
    return `${inset}${x} ${y} ${blur} ${spread} ${shadow.color}`;
  };

  if (Array.isArray(value)) {
    return value.map((layer) => formatSingle(layer as ShadowComposite)).join(', ');
  }
  return formatSingle(value as ShadowComposite);
}

function transitionToCss(value: TokenRawValue, tokenMap: Map<string, FlatToken>): string {
  const trans = value as TransitionComposite;
  const duration = resolveValueToCss(trans.duration, tokenMap);
  const delay = resolveValueToCss(trans.delay, tokenMap);
  const timing = resolveValueToCss(trans.timingFunction, tokenMap);
  return `${duration} ${delay} ${timing}`;
}

function cubicBezierToCss(points: number[]): string {
  return `cubic-bezier(${points.join(', ')})`;
}

function resolveValueToCss(value: TokenRawValue, tokenMap: Map<string, FlatToken>): string {
  if (typeof value === 'string') {
    if (isReference(value)) {
      const refPath = extractRefPath(value);
      const refToken = tokenMap.get(refPath);
      if (!refToken) {
        console.warn(`[警告] 未找到引用: ${refPath}`);
        return `var(${pathToVarName(refPath)})`;
      }
      return `var(${pathToVarName(refPath)})`;
    }
    return value;
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 4 && value.every((v) => typeof v === 'number')) {
      return cubicBezierToCss(value as number[]);
    }
    if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null && 'color' in value[0]) {
      return shadowToCss(value);
    }
    return value.map((v) => resolveValueToCss(v, tokenMap)).join(', ');
  }

  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    if ('color' in obj && 'offsetX' in obj) {
      return shadowToCss(value);
    }
    if ('duration' in obj && 'timingFunction' in obj) {
      return transitionToCss(value, tokenMap);
    }
    console.warn(`[警告] 未知复合类型: ${JSON.stringify(value)}`);
    return JSON.stringify(value);
  }

  return String(value);
}

interface CssVarEntry {
  name: string;
  value: string;
  description?: string;
}

function generatePrimitiveVars(primitiveTokens: FlatToken[]): CssVarEntry[] {
  const entries: CssVarEntry[] = [];
  for (const token of primitiveTokens) {
    const cssValue = resolveValueToCss(token.value, new Map());
    entries.push({
      name: pathToVarName(token.path),
      value: cssValue,
      description: token.description,
    });
  }
  return entries;
}

interface SemanticVarsResult {
  root: CssVarEntry[];
  dark: CssVarEntry[];
}

function generateSemanticVars(
  semanticTokens: Record<string, TokenNode>,
  tokenMap: Map<string, FlatToken>,
): SemanticVarsResult {
  const rootEntries: CssVarEntry[] = [];
  const darkEntries: CssVarEntry[] = [];

  const colorLight = semanticTokens['color.light'];
  const colorDark = semanticTokens['color.dark'];
  const otherSemanticKeys = Object.keys(semanticTokens).filter(
    (k) => k !== 'color.light' && k !== 'color.dark',
  );

  if (colorLight && colorDark) {
    const lightFlat = flattenTokens(colorLight, '');
    const darkFlat = flattenTokens(colorDark, '');

    const darkMap = new Map<string, FlatToken>();
    for (const t of darkFlat) {
      darkMap.set(t.path, t);
    }

    for (const lightToken of lightFlat) {
      const fullPath = lightToken.path;
      const lightCss = resolveValueToCss(lightToken.value, tokenMap);
      rootEntries.push({
        name: pathToVarName(fullPath),
        value: lightCss,
        description: lightToken.description,
      });
    }

    for (const darkToken of darkFlat) {
      const fullPath = darkToken.path;
      const darkCss = resolveValueToCss(darkToken.value, tokenMap);
      darkEntries.push({
        name: pathToVarName(fullPath),
        value: darkCss,
        description: darkToken.description,
      });
    }
  }

  for (const key of otherSemanticKeys) {
    const node = semanticTokens[key];
    const flat = flattenTokens(node, '');
    for (const token of flat) {
      if (isReference(token.value)) {
        const refPath = extractRefPath(token.value as string);
        if (refPath === token.path) {
          continue;
        }
      }
      const cssValue = resolveValueToCss(token.value, tokenMap);
      rootEntries.push({
        name: pathToVarName(token.path),
        value: cssValue,
        description: token.description,
      });
    }
  }

  return { root: rootEntries, dark: darkEntries };
}

function generateComponentVars(
  componentTokens: Record<string, TokenNode>,
  tokenMap: Map<string, FlatToken>,
): CssVarEntry[] {
  const entries: CssVarEntry[] = [];

  for (const [key, node] of Object.entries(componentTokens)) {
    const flat = flattenTokens(node, '');
    for (const token of flat) {
      const cssValue = resolveValueToCss(token.value, tokenMap);
      entries.push({
        name: pathToVarName(token.path),
        value: cssValue,
        description: token.description,
      });
    }
  }

  return entries;
}

function renderCssBlock(entries: CssVarEntry[], indent = '  '): string {
  const lines: string[] = [];
  for (const entry of entries) {
    if (entry.description) {
      lines.push(`${indent}/* ${entry.description} */`);
    }
    lines.push(`${indent}${entry.name}: ${entry.value};`);
  }
  return lines.join('\n');
}

function main(): void {
  console.log('========================================');
  console.log('FANDEX 设计令牌 CSS 生成器');
  console.log('========================================\n');

  console.log('[步骤 1] 加载 JSON 令牌文件...');
  const primitiveRaw = loadLayerTokens('primitive');
  const semanticRaw = loadLayerTokens('semantic');
  const componentRaw = loadLayerTokens('component');

  console.log('\n[步骤 2] 扁平化令牌并构建引用查找表...');
  const allFlat: FlatToken[] = [];

  for (const [key, node] of Object.entries(primitiveRaw)) {
    allFlat.push(...flattenTokens(node, ''));
  }
  for (const [key, node] of Object.entries(semanticRaw)) {
    if (key === 'color.light' || key === 'color.dark') {
      const flat = flattenTokens(node, '');
      for (const t of flat) {
        if (!allFlat.some((existing) => existing.path === t.path)) {
          allFlat.push(t);
        }
      }
    } else {
      const flat = flattenTokens(node, '');
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

  console.log('\n[步骤 3] 生成 CSS 变量...');

  const primitiveFlat: FlatToken[] = [];
  for (const [key, node] of Object.entries(primitiveRaw)) {
    primitiveFlat.push(...flattenTokens(node, ''));
  }
  const primitiveVars = generatePrimitiveVars(primitiveFlat);
  console.log(`[信息] primitive 层: ${primitiveVars.length} 个变量`);

  const semanticVars = generateSemanticVars(semanticRaw, tokenMap);
  console.log(`[信息] semantic 层: ${semanticVars.root.length} 个根变量, ${semanticVars.dark.length} 个深色覆盖`);

  const componentVars = generateComponentVars(componentRaw, tokenMap);
  console.log(`[信息] component 层: ${componentVars.length} 个变量`);

  console.log('\n[步骤 4] 组装 CSS 文件...');

  const header = `/**
 * FANDEX 设计令牌（自动生成，请勿手动修改）
 *
 * 生成来源：shd-shared/tokens/ 下的 W3C DTCG JSON 令牌
 * 生成脚本：shd-shared/tokens/scripts/generate-tokens-css.ts
 * 由脚本全量生成，输出确定性可复现（不写入时间戳，避免重建产生无意义 diff）
 *
 * 令牌分层：
 * - primitive：原始值（颜色、间距、尺寸等原值，无语义）
 * - semantic：语义层（引用 primitive，含 light/dark 主题）
 * - component：组件层（引用 semantic，定义组件专属令牌）
 *
 * 主题策略（[data-theme] 选择器方案，不使用 light-dark()）：
 * - :root 定义浅色模式默认值（color-scheme: light）
 * - [data-theme='dark'] 覆盖深色值（color-scheme: dark）
 * - [data-theme='light'] 显式浅色（color-scheme: light）
 * - 由 BaseLayout.astro 内联脚本在页面加载前设置 data-theme 属性
 * - 不使用 CSS light-dark() 函数，因 Tailwind v4 解析器在 @theme 块外
 *   不支持 light-dark() 与 var() 混合写法
 */

`;

  const cssContent = `${header}@layer tokens {
  :root {
    color-scheme: light;

    /* ============================================================
       1. Primitive 层 — 原始令牌值
       ============================================================ */
${renderCssBlock(primitiveVars, '    ')}

    /* ============================================================
       2. Semantic 层 — 语义令牌（浅色默认值）
       ============================================================ */
${renderCssBlock(semanticVars.root, '    ')}

    /* ============================================================
       3. Component 层 — 组件级令牌
       ============================================================ */
${renderCssBlock(componentVars, '    ')}
  }

  /* ============================================================
     深色模式覆盖：[data-theme='dark'] 选择器
     ------------------------------------------------------------
     由 BaseLayout.astro 内联脚本设置 data-theme 属性触发。
     仅覆盖颜色语义令牌，非颜色令牌（间距/字号/圆角等）无主题差异。
     ============================================================ */
  [data-theme='dark'] {
    color-scheme: dark;
${renderCssBlock(semanticVars.dark, '    ')}
  }

  /* 显式浅色模式（data-theme='light' 时无需覆盖值，仅声明 color-scheme） */
  [data-theme='light'] {
    color-scheme: light;
  }
}
`;

  console.log(`\n[步骤 5] 写入 CSS 文件: ${CSS_OUTPUT}`);
  const outputDir = dirname(CSS_OUTPUT);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
    console.log(`[信息] 创建输出目录: ${outputDir}`);
  }
  writeFileSync(CSS_OUTPUT, cssContent, 'utf-8');
  console.log(`[成功] CSS 令牌已生成: ${CSS_OUTPUT}`);
  const semanticTotal = semanticVars.root.length + semanticVars.dark.length;
  console.log(`[统计] primitive=${primitiveVars.length}, semantic=${semanticTotal} (root=${semanticVars.root.length}, dark=${semanticVars.dark.length}), component=${componentVars.length}`);
  console.log(`[总计] ${primitiveVars.length + semanticTotal + componentVars.length} 个 CSS 变量\n`);
}

main();
