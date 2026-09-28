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

// Android 端信息性核查：Color.kt 是从 DTCG JSON 手工镜像的 Compose 色板，
// 这里报告它与令牌真源不一致的色值（不阻断构建——Android 色板含 Material
// 适配扩展，统一需要专门的映射层，见 README「共享层」说明）。
function collectTokenHexes(node, acc) {
  for (const value of Object.values(node ?? {})) {
    if (value && typeof value === 'object') {
      const hex = typeof value.$value === 'string' ? value.$value.toUpperCase() : null;
      if (hex && /^#[0-9A-F]{6}$/.test(hex)) acc.add(hex);
      collectTokenHexes(value, acc);
    }
  }
}

try {
  const tokenRoots = [
    join(scriptDir, '..', '..', 'shd-shared', 'tokens', 'primitive', 'color.json'),
    join(scriptDir, '..', '..', 'shd-shared', 'tokens', 'semantic', 'color.light.json'),
    join(scriptDir, '..', '..', 'shd-shared', 'tokens', 'semantic', 'color.dark.json'),
  ];
  const tokenHexes = new Set();
  for (const path of tokenRoots) collectTokenHexes(JSON.parse(readFileSync(path, 'utf8')), tokenHexes);

  const colorKt = readFileSync(
    join(scriptDir, '..', '..', 'app-Android-new', 'app', 'src', 'main', 'java', 'com', 'fandex', 'app', 'ui', 'theme', 'Color.kt'),
    'utf8',
  );
  const ktHexes = new Set(
    [...colorKt.matchAll(/Color\(\s*0x FF([0-9A-Fa-f]{6})\s*\)/g)].map((m) => `#${m[1].toUpperCase()}`),
  );
  const diverged = [...ktHexes].filter((hex) => !tokenHexes.has(hex));
  if (diverged.length > 0) {
    console.log(
      `[check-tokens-drift] NOTE：Android Color.kt 有 ${diverged.length} 个色值与令牌真源不一致` +
        `（信息性提示，不阻断）：${diverged.slice(0, 12).join(', ')}${diverged.length > 12 ? ' ...' : ''}`,
    );
  } else {
    console.log('[check-tokens-drift] NOTE：Android Color.kt 与令牌真源色值一致。');
  }
} catch (err) {
  console.log(`[check-tokens-drift] NOTE：Android 色值核查跳过（${err.message}）`);
}
