/**
 * lint-staged 配置
 *
 * 功能：在 git commit 之前对暂存区文件执行 Biome 检查/格式化，
 * 阻止不合规代码进入仓库。与根目录 .husky/pre-commit 配合使用。
 *
 * 规则：
 * - JS/TS/Astro 文件：执行 `biome check --write`（自动修复可修复项）
 * - JSON/CSS 文件：仅执行格式化（避免破坏 JSON 结构）
 */
export default {
  '*.{ts,tsx,js,mjs,astro}': ['biome check --write'],
  '*.{json,css}': ['biome format --write'],
};
