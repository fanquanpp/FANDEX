#!/usr/bin/env tsx
/**
 * FANDEX 设计令牌 CSS 生成器
 *
 * 功能概述：
 * 将 W3C Design Tokens Format Module（2025.10）格式的 JSON 令牌转换为 CSS Variables。
 * - 读取 primitive/semantic/component 三层 JSON 令牌
 * - 解析 {reference} 花括号引用语法
 * - 合并浅色/深色主题为 CSS light-dark() 函数
 * - 处理 W3C 复合类型（shadow/transition）转为 CSS shorthand
 * - 输出到 shd-shared/styles/tokens.css
 *
 * 生成策略：
 * 1. primitive 层：直接输出原值（如 --color-neutral-1050: #FFFFFF）
 * 2. semantic 层颜色：解析引用为 primitive 变量，合并 light/dark 为 light-dark()
 * 3. semantic 层非颜色：解析引用为 primitive 变量（如 --space-page-x: var(--space-4)）
 * 4. component 层：解析引用为 semantic 变量（如 --button-primary-default-bg: var(--color-accent-base)）
 *
 * CSS 变量命名规则：
 * - 路径点号转为破折号：color.bg.primary → --color-bg-primary
 * - 数字保留：color.neutral.1050 → --color-neutral-1050
 * - camelCase 转为 kebab-case：paddingX → padding-x
 *
 * 运行方式：pnpm --filter @fandex/tokens run build:css
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// ============================================================================
// 类型定义
// ============================================================================

/** 令牌节点：W3C DTCG 格式的令牌对象 */
interface TokenNode {
  $value?: TokenRawValue;
  $type?: string;
  $description?: string;
  [key: string]: TokenNode | TokenRawValue | string | undefined;
}

/** 令牌原始值：可能是字符串、数字、数组、对象 */
type TokenRawValue = string | number | boolean | object | Array<object | string | number>;

/** 扁平化后的令牌条目 */
interface FlatToken {
  /** 令牌路径（如 color.neutral.1050） */
  path: string;
  /** 原始 $value */
  value: TokenRawValue;
  /** $type 声明（可能继承自父节点） */
  type?: string;
  /** $description 描述 */
  description?: string;
}

/** shadow 复合类型的维度值结构 */
interface DimensionValue {
  value: number;
  unit: string;
}

/** shadow 复合类型结构 */
interface ShadowComposite {
  color: string;
  offsetX: DimensionValue;
  offsetY: DimensionValue;
  blur: DimensionValue;
  spread: DimensionValue;
}

/** transition 复合类型结构 */
interface TransitionComposite {
  duration: string;
  delay: string;
  timingFunction: string | number[];
}

// ============================================================================
// 路径与文件工具
// ============================================================================

/** 当前脚本所在目录（shd-shared/tokens/scripts/） */
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
/** 令牌根目录（shd-shared/tokens/） */
const TOKENS_DIR = resolve(SCRIPT_DIR, '..');
/** 共享层根目录（shd-shared/） */
const SHARED_DIR = resolve(TOKENS_DIR, '..');
/** CSS 输出路径（shd-shared/styles/tokens.css） */
const CSS_OUTPUT = join(SHARED_DIR, 'styles', 'tokens.css');

/**
 * 将令牌路径转换为 CSS 变量名
 * - color.neutral.1050 → --color-neutral-1050
 * - color.bg.primary → --color-bg-primary
 * - button.primary.default.bg → --button-primary-default-bg
 * - space.page.x-lg → --space-page-x-lg（已是 kebab）
 * - font.letterSpacing.label → --font-letter-spacing-label（camelCase 转 kebab）
 */
function pathToVarName(path: string): string {
  return (
    '--' +
    path
      .split('.')
      .map((segment) => segment.replace(/([A-Z])/g, '-$1').toLowerCase())
      .join('-')
  );
}

/**
 * 读取指定层目录下的所有 JSON 令牌文件
 * @param layer - primitive | semantic | component
 * @returns 文件名（不含扩展名）到解析后 JSON 对象的映射
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

/** W3C DTCG 保留属性前缀，扁平化时跳过 */
const RESERVED_KEYS = new Set(['$value', '$type', '$description']);

/**
 * 递归扁平化令牌树，收集所有带 $value 的叶子节点
 * @param node - 当前令牌节点
 * @param prefix - 当前路径前缀（如 "color"）
 * @param parentType - 继承自父节点的 $type
 * @returns 扁平化后的令牌条目数组
 */
function flattenTokens(
  node: TokenNode,
  prefix: string,
  parentType?: string,
): FlatToken[] {
  const tokens: FlatToken[] = [];

  // 当前节点的 $type（优先使用自身声明，否则继承父节点）
  const currentType = node.$type ?? parentType;

  // 如果当前节点有 $value，说明是叶子令牌
  if (node.$value !== undefined) {
    tokens.push({
      path: prefix,
      value: node.$value,
      type: currentType,
      description: typeof node.$description === 'string' ? node.$description : undefined,
    });
    return tokens;
  }

  // 递归处理子节点
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

/**
 * 构建全量令牌查找表
 * key 为令牌路径（如 color.neutral.1050），value 为 FlatToken
 */
function buildTokenMap(allTokens: FlatToken[]): Map<string, FlatToken> {
  const map = new Map<string, FlatToken>();
  for (const token of allTokens) {
    map.set(token.path, token);
  }
  return map;
}

/**
 * 判断值是否为引用字符串（形如 {path.to.token}）
 */
function isReference(value: unknown): value is string {
  return typeof value === 'string' && REFERENCE_PATTERN.test(value);
}

/**
 * 提取引用路径（{color.neutral.1050} → color.neutral.1050）
 */
function extractRefPath(ref: string): string {
  const match = REFERENCE_PATTERN.exec(ref);
  return match ? match[1] : ref;
}

// ============================================================================
// 值转 CSS 字符串
// ============================================================================

/**
 * 将 W3C shadow 复合对象转为 CSS box-shadow shorthand
 * 单层：{color, offsetX, offsetY, blur, spread} → "offsetX offsetY blur spread color"
 * 多层：数组 → "layer1, layer2"
 */
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

/**
 * 将 W3C transition 复合对象转为 CSS transition shorthand
 * {duration, delay, timingFunction} → "duration delay timingFunction"
 * timingFunction 可能是引用（var()）或 cubicBezier 数组
 */
function transitionToCss(value: TokenRawValue, tokenMap: Map<string, FlatToken>): string {
  const trans = value as TransitionComposite;
  // 解析 duration：可能是引用或原值
  const duration = resolveValueToCss(trans.duration, tokenMap);
  // 解析 delay
  const delay = resolveValueToCss(trans.delay, tokenMap);
  // 解析 timingFunction：可能是引用或 cubicBezier 数组
  const timing = resolveValueToCss(trans.timingFunction, tokenMap);
  return `${duration} ${delay} ${timing}`;
}

/**
 * 将 cubicBezier 数组 [x1, y1, x2, y2] 转为 CSS cubic-bezier() 函数
 */
function cubicBezierToCss(points: number[]): string {
  return `cubic-bezier(${points.join(', ')})`;
}

/**
 * 将单个令牌值解析为 CSS 字符串（递归解析引用）
 *
 * 解析规则：
 * - 字符串原值（#000000、1rem、150ms）→ 直接返回
 * - 数字 → 直接返回字符串形式
 * - 引用字符串（{path}）→ 查找令牌表，递归解析
 *   - 若引用的是 primitive 层令牌 → 返回 var(--primitive-var)
 *   - 若引用的是 semantic/component 层令牌 → 返回 var(--semantic-var)
 * - 数组（cubicBezier）→ cubic-bezier()
 * - shadow 复合对象 → box-shadow shorthand
 * - transition 复合对象 → transition shorthand
 */
function resolveValueToCss(value: TokenRawValue, tokenMap: Map<string, FlatToken>): string {
  // 1. 字符串：可能是原值或引用
  if (typeof value === 'string') {
    if (isReference(value)) {
      const refPath = extractRefPath(value);
      const refToken = tokenMap.get(refPath);
      if (!refToken) {
        console.warn(`[警告] 未找到引用: ${refPath}`);
        return `var(${pathToVarName(refPath)})`;
      }
      // 引用解析为 var()，保持 CSS 变量引用关系
      return `var(${pathToVarName(refPath)})`;
    }
    // 原值字符串直接返回
    return value;
  }

  // 2. 数字
  if (typeof value === 'number') {
    return String(value);
  }

  // 3. 数组：可能是 cubicBezier 或双层 shadow
  if (Array.isArray(value)) {
    // 判断是否为 cubicBezier（4 个数字）
    if (value.length === 4 && value.every((v) => typeof v === 'number')) {
      return cubicBezierToCss(value as number[]);
    }
    // 判断是否为 shadow 数组（元素是对象且含 color 字段）
    if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null && 'color' in value[0]) {
      return shadowToCss(value);
    }
    // 其他数组：逐项解析后逗号连接
    return value.map((v) => resolveValueToCss(v, tokenMap)).join(', ');
  }

  // 4. 对象：可能是 shadow 或 transition 复合类型
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    // shadow 复合类型：含 color 和 offsetX 字段
    if ('color' in obj && 'offsetX' in obj) {
      return shadowToCss(value);
    }
    // transition 复合类型：含 duration 和 timingFunction 字段
    if ('duration' in obj && 'timingFunction' in obj) {
      return transitionToCss(value, tokenMap);
    }
    // 未知对象类型：JSON 序列化（兜底）
    console.warn(`[警告] 未知复合类型: ${JSON.stringify(value)}`);
    return JSON.stringify(value);
  }

  // 5. 布尔值或其他类型（兜底）
  return String(value);
}

// ============================================================================
// CSS 生成
// ============================================================================

/** CSS 变量条目 */
interface CssVarEntry {
  name: string;
  value: string;
  description?: string;
}

/**
 * 生成 primitive 层 CSS 变量
 * primitive 层令牌直接输出原值
 */
function generatePrimitiveVars(primitiveTokens: FlatToken[]): CssVarEntry[] {
  const entries: CssVarEntry[] = [];
  for (const token of primitiveTokens) {
    // primitive 层值不包含引用，直接解析为 CSS 字符串
    const cssValue = resolveValueToCss(token.value, new Map());
    entries.push({
      name: pathToVarName(token.path),
      value: cssValue,
      description: token.description,
    });
  }
  return entries;
}

/**
 * 生成 semantic 层 CSS 变量
 * - 颜色令牌：合并 light/dark 为 light-dark()
 * - 非颜色令牌：解析引用为 var()
 */
function generateSemanticVars(
  semanticTokens: Record<string, TokenNode>,
  tokenMap: Map<string, FlatToken>,
): CssVarEntry[] {
  const entries: CssVarEntry[] = [];

  // 分离颜色 light/dark 与其他令牌
  const colorLight = semanticTokens['color.light'];
  const colorDark = semanticTokens['color.dark'];
  const otherSemanticKeys = Object.keys(semanticTokens).filter(
    (k) => k !== 'color.light' && k !== 'color.dark',
  );

  // 1. 处理颜色语义令牌（合并 light/dark）
  if (colorLight && colorDark) {
    // 使用空前缀扁平化：flattenTokens 会自动包含顶层 "color" 键
    // 生成的路径如 "color.bg.primary"（与引用路径一致）
    const lightFlat = flattenTokens(colorLight, '');
    const darkFlat = flattenTokens(colorDark, '');

    // 构建 dark 令牌查找表（path -> value）
    const darkMap = new Map<string, FlatToken>();
    for (const t of darkFlat) {
      darkMap.set(t.path, t);
    }

    for (const lightToken of lightFlat) {
      // lightToken.path 已是完整路径（如 "color.bg.primary"），无需补前缀
      const fullPath = lightToken.path;
      const darkToken = darkMap.get(lightToken.path);

      // 解析 light 值为 CSS（引用解析为 var()）
      const lightCss = resolveValueToCss(lightToken.value, tokenMap);

      if (darkToken) {
        // 合并为 light-dark(light, dark)
        const darkCss = resolveValueToCss(darkToken.value, tokenMap);
        entries.push({
          name: pathToVarName(fullPath),
          value: `light-dark(${lightCss}, ${darkCss})`,
          description: lightToken.description,
        });
      } else {
        // 仅 light 有定义（dark 未定义同名令牌）
        entries.push({
          name: pathToVarName(fullPath),
          value: lightCss,
          description: lightToken.description,
        });
      }
    }

    // 检查 dark 中有但 light 中没有的令牌
    const lightPaths = new Set(lightFlat.map((t) => t.path));
    for (const darkToken of darkFlat) {
      if (!lightPaths.has(darkToken.path)) {
        const fullPath = darkToken.path;
        const darkCss = resolveValueToCss(darkToken.value, tokenMap);
        entries.push({
          name: pathToVarName(fullPath),
          value: darkCss,
          description: darkToken.description,
        });
      }
    }
  }

  // 2. 处理非颜色语义令牌（space/size/font/radius/shadow/motion）
  // 使用空前缀扁平化：文件顶层键即作为路径首段（如 space.page.x）
  for (const key of otherSemanticKeys) {
    const node = semanticTokens[key];
    const flat = flattenTokens(node, '');
    for (const token of flat) {
      // 跳过自引用令牌：semantic 路径与 primitive 同名令牌路径相同时，
      // 生成的 CSS 变量名（--size-icon-sm）与引用目标（var(--size-icon-sm)）相同，
      // 自引用无意义，primitive 层已定义该变量，无需重复输出
      if (isReference(token.value)) {
        const refPath = extractRefPath(token.value as string);
        if (refPath === token.path) {
          continue;
        }
      }
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

/**
 * 生成 component 层 CSS 变量
 * component 层令牌引用 semantic 层，解析为 var()
 */
function generateComponentVars(
  componentTokens: Record<string, TokenNode>,
  tokenMap: Map<string, FlatToken>,
): CssVarEntry[] {
  const entries: CssVarEntry[] = [];

  for (const [key, node] of Object.entries(componentTokens)) {
    // 使用空前缀扁平化：文件顶层键即作为路径首段（如 button.primary.default.bg）
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

/**
 * 将 CSS 变量条目数组渲染为 CSS 文本块
 */
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

// ============================================================================
// 主函数
// ============================================================================

function main(): void {
  console.log('========================================');
  console.log('FANDEX 设计令牌 CSS 生成器');
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
  for (const [key, node] of Object.entries(semanticRaw)) {
    // 颜色 light/dark 特殊处理：扁平化时路径需保留区分
    if (key === 'color.light' || key === 'color.dark') {
      // 颜色语义令牌在 generateSemanticVars 中单独处理
      // 但仍需加入 tokenMap 供 component 层引用
      // 使用空前缀扁平化，路径为 color.bg.primary（与引用路径一致）
      const flat = flattenTokens(node, '');
      // 注意：light/dark 同路径会冲突，这里以 light 为准（component 层引用的是语义名）
      for (const t of flat) {
        if (!allFlat.some((existing) => existing.path === t.path)) {
          allFlat.push(t);
        }
      }
    } else {
      // 非颜色语义令牌：扁平化后去重，不覆盖 primitive 层已存在的同名令牌
      // 原因：semantic/size.json 中 size.icon.sm 引用 {size.icon.sm}（primitive 同名令牌），
      // 若 semantic 覆盖 primitive，tokenMap 中该路径的值变为引用字符串，导致自引用循环
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

  // 3. 生成各层 CSS 变量
  console.log('\n[步骤 3] 生成 CSS 变量...');

  const primitiveFlat: FlatToken[] = [];
  for (const [key, node] of Object.entries(primitiveRaw)) {
    // 使用空前缀扁平化：文件顶层键即作为路径首段（如 color.neutral.1050）
    primitiveFlat.push(...flattenTokens(node, ''));
  }
  const primitiveVars = generatePrimitiveVars(primitiveFlat);
  console.log(`[信息] primitive 层: ${primitiveVars.length} 个变量`);

  const semanticVars = generateSemanticVars(semanticRaw, tokenMap);
  console.log(`[信息] semantic 层: ${semanticVars.length} 个变量`);

  const componentVars = generateComponentVars(componentRaw, tokenMap);
  console.log(`[信息] component 层: ${componentVars.length} 个变量`);

  // 4. 组装完整 CSS 文件
  console.log('\n[步骤 4] 组装 CSS 文件...');

  const header = `/**
 * FANDEX 设计令牌（自动生成，请勿手动修改）
 *
 * 生成来源：shd-shared/tokens/ 下的 W3C DTCG JSON 令牌
 * 生成脚本：shd-shared/tokens/scripts/generate-tokens-css.ts
 * 生成时间：${new Date().toISOString()}
 *
 * 令牌分层：
 * - primitive：原始值（颜色、间距、尺寸等原值，无语义）
 * - semantic：语义层（引用 primitive，含 light/dark 主题）
 * - component：组件层（引用 semantic，定义组件专属令牌）
 *
 * 主题策略：
 * - 颜色语义令牌使用 CSS light-dark() 函数实现双主题
 * - 需在 :root 设置 color-scheme: light dark 以启用 light-dark()
 * - 通过 [data-theme="dark"] 覆盖 color-scheme 可强制深色模式
 */

`;

  const cssContent = `${header}@layer tokens {
  :root {
    color-scheme: light dark;

    /* ============================================================
       1. Primitive 层 — 原始令牌值
       ============================================================ */
${renderCssBlock(primitiveVars, '    ')}

    /* ============================================================
       2. Semantic 层 — 语义令牌（含 light-dark() 主题合并）
       ============================================================ */
${renderCssBlock(semanticVars, '    ')}

    /* ============================================================
       3. Component 层 — 组件级令牌
       ============================================================ */
${renderCssBlock(componentVars, '    ')}
  }

  /* 强制深色模式：覆盖 color-scheme 使 light-dark() 取深色值 */
  [data-theme='dark'] {
    color-scheme: dark;
  }

  /* 强制浅色模式 */
  [data-theme='light'] {
    color-scheme: light;
  }
}
`;

  // 5. 写入文件
  console.log(`\n[步骤 5] 写入 CSS 文件: ${CSS_OUTPUT}`);
  const outputDir = dirname(CSS_OUTPUT);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
    console.log(`[信息] 创建输出目录: ${outputDir}`);
  }
  writeFileSync(CSS_OUTPUT, cssContent, 'utf-8');
  console.log(`[成功] CSS 令牌已生成: ${CSS_OUTPUT}`);
  console.log(`[统计] primitive=${primitiveVars.length}, semantic=${semanticVars.length}, component=${componentVars.length}`);
  console.log(`[总计] ${primitiveVars.length + semanticVars.length + componentVars.length} 个 CSS 变量\n`);
}

main();
