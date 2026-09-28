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

// Android 端硬校验：TokenColors.kt 由 shd-shared/tokens 生成（generate-tokens-kt.ts），
// 这里按同一算法重算期望内容并逐字节比对——手改生成文件或改 JSON 未重新生成都会
// 被拦截。算法与 generate-tokens-kt.ts 保持一致（扁平化 -> 解析引用 -> 0xFFRRGGBB），
// 若生成器算法调整，请同步本文件。
function flattenKt(node, prefix, acc) {
  if (typeof node.$value === 'string') {
    acc.push({ path: prefix, value: node.$value });
    return;
  }
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith('$')) continue;
    if (child === null || typeof child !== 'object') continue;
    flattenKt(child, prefix ? `${prefix}.${key}` : key, acc);
  }
}

function toPascalPath(path) {
  return path
    .split('.')
    .map((segment) =>
      segment
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(''),
    )
    .join('');
}

function buildExpectedTokenColorsKt() {
  const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
  const primitiveFlat = [];
  flattenKt(readJson(join(scriptDir, '..', '..', 'shd-shared', 'tokens', 'primitive', 'color.json')), '', primitiveFlat);
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
      return `    val ${toPascalPath(t.path)} = Color(0xFF${hex})`;
    });
    return `object ${name} {\n${lines.join('\n')}\n}`;
  };
  const light = [];
  flattenKt(readJson(join(scriptDir, '..', '..', 'shd-shared', 'tokens', 'semantic', 'color.light.json')), '', light);
  const dark = [];
  flattenKt(readJson(join(scriptDir, '..', '..', 'shd-shared', 'tokens', 'semantic', 'color.dark.json')), '', dark);
  return [emit('TokenPrimitive', primitiveFlat, false), emit('TokenLight', light, true), emit('TokenDark', dark, true)].join('\n');
}

try {
  const tokenColorsPath = join(
    scriptDir, '..', '..',
    'app-Android-new', 'app', 'src', 'main', 'java', 'com', 'fandex', 'app', 'ui', 'theme', 'TokenColors.kt',
  );
  const actual = readFileSync(tokenColorsPath, 'utf8');
  // 比对前把两侧都剥掉注释与空行，只比对对象体本身
  const strip = (s) =>
    s
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .filter((line) => !line.trim().startsWith('//') && line.trim() !== '')
      .join('\n')
      .trim();
  const objectBodies = (s) => {
    const cleaned = strip(s);
    return cleaned.slice(cleaned.indexOf('object TokenPrimitive')).split(/\n(?=object )/).map((p) => p.trim());
  };
  const expected = objectBodies(buildExpectedTokenColorsKt());
  const actualBodies = objectBodies(actual);
  const mismatch =
    expected.length !== actualBodies.length ||
    expected.some((body, i) => body !== actualBodies[i]);
  if (mismatch) {
    console.error(
      '[check-tokens-drift] FAIL：Android TokenColors.kt 与令牌真源不一致。\n' +
        '  修复方式：修改 DTCG JSON 后运行 pnpm --filter @fandex/tokens generate:kt 重新生成，\n' +
        '  不要手改 TokenColors.kt（Theme.kt 中的 Material 角色映射文件除外）。',
    );
    process.exit(1);
  }
  console.log('[check-tokens-drift] OK：Android TokenColors.kt 与令牌真源逐值一致。');
} catch (err) {
  console.error(`[check-tokens-drift] FAIL：Android 令牌校验失败：${err.message}`);
  process.exit(1);
}
