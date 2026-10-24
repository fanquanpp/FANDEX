#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(scriptDir, '..', '..', 'shd-shared', 'styles', 'tokens.css');
const COPY = join(scriptDir, '..', 'src', 'styles', 'shared', 'tokens.css');

function parseScopedDeclarations(path) {
  const scopes = new Map();
  let scope = 'root';
  let depth = 0;
  for (const raw of readFileSync(path, 'utf8').split('\n')) {
    const line = raw.trim();
    const selector = line.match(/^([^{]+)\{\s*$/);
    if (selector) {
      depth += 1;
      const s = selector[1];
      if (/data-theme=['"]dark['"]/.test(s)) scope = 'dark';
      else if (/data-theme=['"]light['"]/.test(s)) scope = 'light';
      continue;
    }
    if (line.startsWith('}')) {
      depth -= 1;
      if (depth <= 0) {
        depth = 0;
        scope = 'root';
      }
      continue;
    }
    const decl = line.match(/^(--[\w-]+)\s*:\s*([^;]+);?$/);
    if (decl && depth >= 1) {
      if (!scopes.has(scope)) scopes.set(scope, new Map());
      const bucket = scopes.get(scope);
      if (!bucket.has(decl[1])) bucket.set(decl[1], decl[2].replace(/\s+/g, ' ').trim());
    }
  }
  return scopes;
}

const source = parseScopedDeclarations(SOURCE);
const copy = parseScopedDeclarations(COPY);
const scopeNames = [...new Set([...source.keys(), ...copy.keys()])];

const problems = [];
for (const scope of scopeNames) {
  const a = source.get(scope) ?? new Map();
  const b = copy.get(scope) ?? new Map();
  for (const [name, value] of a) {
    if (!b.has(name)) problems.push(`[${scope}] 仅真源有: ${name}: ${value}`);
    else if (b.get(name) !== value) {
      problems.push(`[${scope}] 值漂移: ${name}\n    真源: ${value}\n    副本: ${b.get(name)}`);
    }
  }
  for (const [name, value] of b) {
    if (!a.has(name)) problems.push(`[${scope}] 仅副本有: ${name}: ${value}`);
  }
}

if (problems.length > 0) {
  console.error(
    `[check-tokens-drift] FAIL：web 副本与 shd-shared 真源存在 ${problems.length} 处漂移\n` +
      `  真源: shd-shared/styles/tokens.css\n` +
      `  副本: app-web/src/styles/shared/tokens.css\n\n` +
      problems.map((p) => `  - ${p}`).join('\n') +
      `\n\n  修复方式：修改 DTCG JSON 源后运行 pnpm --filter @fandex/tokens build:css，\n` +
      `  并将生成值同步到副本（见副本文件头同步规则）。`,
  );
  process.exit(1);
}

const total = [...source.values()].reduce((n, m) => n + m.size, 0);
console.log(`[check-tokens-drift] OK：副本与真源一致（${total} 个令牌，作用域 ${scopeNames.join('/')}）`);

// Flutter 移动端硬校验：app-mobile/lib/core/token_colors.dart 由 shd-shared/tokens
// 生成（generate-tokens-dart.ts），这里按同一算法重算期望内容并逐字节比对——
// 手改生成文件或改 JSON 未重新生成都会被拦截。
// 算法与 generate-tokens-dart.ts 保持一致（扁平化 -> 解析引用 -> 0xFFRRGGBB ->
// colorXxxYyy 命名），若生成器算法调整，请同步本文件。
function flattenDart(node, prefix, acc) {
  if (typeof node.$value === 'string') {
    acc.push({ path: prefix, value: node.$value });
    return;
  }
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith('$')) continue;
    if (child === null || typeof child !== 'object') continue;
    flattenDart(child, prefix ? `${prefix}.${key}` : key, acc);
  }
}

function toCamelPath(path) {
  return path
    .split('.')
    .map((segment, i) => {
      const parts = segment.split('-');
      return parts
        .map((part, j) => (i === 0 && j === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
        .join('');
    })
    .join('');
}

function buildExpectedTokenColorsDart() {
  const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
  const primitiveFlat = [];
  flattenDart(readJson(join(scriptDir, '..', '..', 'shd-shared', 'tokens', 'primitive', 'color.json')), '', primitiveFlat);
  const primitives = new Map(primitiveFlat.map((t) => [t.path, t.value]));
  const resolveValue = (value) =>
    value.replace(/\{([^}]+)\}/g, (_m, ref) => {
      const hex = primitives.get(ref);
      if (!hex) throw new Error(`未解析的令牌引用: ${ref}`);
      return hex;
    });
  const emit = (name, flat, resolveRefs) => {
    const lines = flat.map((t) => {
      const value = resolveRefs ? resolveValue(t.value) : t.value;
      const hex = value.replace('#', '').toUpperCase();
      return `  static const Color ${toCamelPath(t.path)} = Color(0xFF${hex});`;
    });
    return `class ${name} {\n${lines.join('\n')}\n}`;
  };
  const light = [];
  flattenDart(readJson(join(scriptDir, '..', '..', 'shd-shared', 'tokens', 'semantic', 'color.light.json')), '', light);
  const dark = [];
  flattenDart(readJson(join(scriptDir, '..', '..', 'shd-shared', 'tokens', 'semantic', 'color.dark.json')), '', dark);
  return [emit('TokenPrimitive', primitiveFlat, false), emit('TokenLight', light, true), emit('TokenDark', dark, true)].join('\n');
}

try {
  const tokenColorsPath = join(
    scriptDir, '..', '..',
    'app-mobile', 'lib', 'core', 'token_colors.dart',
  );
  const actual = readFileSync(tokenColorsPath, 'utf8');
  // 比对前把两侧都剥掉注释与空行，只比对类体本身
  const strip = (s) =>
    s
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .filter((line) => !line.trim().startsWith('//') && line.trim() !== '')
      .join('\n')
      .trim();
  const classBodies = (s) => {
    const cleaned = strip(s);
    return cleaned.slice(cleaned.indexOf('class TokenPrimitive')).split(/\n(?=class )/).map((p) => p.trim());
  };
  const expected = classBodies(buildExpectedTokenColorsDart());
  const actualBodies = classBodies(actual);
  const mismatch =
    expected.length !== actualBodies.length ||
    expected.some((body, i) => body !== actualBodies[i]);
  if (mismatch) {
    console.error(
      '[check-tokens-drift] FAIL：app-mobile token_colors.dart 与令牌真源不一致。\n' +
        '  修复方式：修改 DTCG JSON 后运行 pnpm --filter @fandex/tokens generate:dart 重新生成，\n' +
        '  不要手改 token_colors.dart（tokens.dart 中的组件角色映射文件除外）。',
    );
    process.exit(1);
  }
  console.log('[check-tokens-drift] OK：app-mobile token_colors.dart 与令牌真源逐值一致。');
} catch (err) {
  console.error(`[check-tokens-drift] FAIL：Flutter 移动端令牌校验失败：${err.message}`);
  process.exit(1);
}
