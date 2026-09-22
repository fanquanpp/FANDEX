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
