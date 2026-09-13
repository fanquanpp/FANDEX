#!/usr/bin/env node
/**
 * 设计令牌漂移门禁（check-tokens-drift）
 * -----------------------------------------------------------------------------
 * 背景：web 端消费的设计令牌是 app-web/src/styles/shared/tokens.css——
 * shd-shared/styles/tokens.css（DTCG JSON 生成物）的手工同步副本。
 * 历史上副本与真源曾长期漂移（旧色板未跟进），且无任何机制拦截。
 *
 * 职责：
 * - 逐作用域（:root / [data-theme='dark'] / [data-theme='light']）提取两份
 *   文件的全部自定义属性声明，比较名称集合与值；
 * - 完全一致时静默通过；存在漂移时打印差异清单并以非零退出码阻断构建。
 *
 * 接入：app-web package.json 的 dev / build 脚本链（content-sync 之后），
 * 本地推送前 `pnpm dev:web` / `pnpm build:web` 与全部 CI 构建自动执行。
 *
 * 约定：
 * - 零依赖（node:fs 仅）；值比较前做空白归一化；
 * - 只比较声明，注释差异不视为漂移（注释允许副本自行扩充）。
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(scriptDir, '..', '..', 'shd-shared', 'styles', 'tokens.css');
const COPY = join(scriptDir, '..', 'src', 'styles', 'shared', 'tokens.css');

/**
 * 按作用域解析 CSS 自定义属性声明
 * @param {string} path CSS 文件路径
 * @returns {Map<string, Map<string, string>>} 作用域名 -> (变量名 -> 值)
 */
function parseScopedDeclarations(path) {
  const scopes = new Map();
  let scope = 'root';
  let depth = 0;
  for (const raw of readFileSync(path, 'utf8').split('\n')) {
    const line = raw.trim();
    // 进入选择器块：跟踪 data-theme 作用域（root/light/dark）
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
      // 同名变量取首次出现（两份文件均无同块重复声明，防御性处理）
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

/** 漂移报告行集合 */
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
