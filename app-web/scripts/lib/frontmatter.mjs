/**
 * 共享 frontmatter 解析助手（build-stats / content-audit 等脚本统一入口）
 * =============================================================================
 * 使用 gray-matter（社区事实标准，内置 js-yaml 完整 YAML 解析）替代此前
 * 两个脚本各自维护的正则/逐行解析实现，消除解析规则不一致的风险。
 *
 * 仅负责：
 *   1. 判定文件是否携带 frontmatter 分隔块（`---` 起始，此处无法由库替代判定）
 *   2. 调用 gray-matter 解析出结构化 data 与正文
 * 字段白名单校验等业务规则由调用方负责。
 */

import matter from 'gray-matter';

/**
 * 解析 Markdown 文本的 frontmatter
 * @param {string} raw - 文件完整内容
 * @returns {{ present: boolean, data: Record<string, unknown>, content: string, fm: string }}
 *   - present：是否存在 `---` 起始的 frontmatter 块
 *   - data：解析后的 YAML 字段对象（无 frontmatter 时为空对象）
 *   - content：frontmatter 之后的正文
 *   - fm：frontmatter 原始文本块（便于调用方做行级检查）
 */
export function parseFrontmatter(raw) {
  // 分隔块判定：以 --- 起始（容忍 BOM 与 CRLF），与 Astro glob loader 行为一致
  const present = /^\uFEFF?---\r?\n/.test(raw);
  if (!present) {
    return { present: false, data: {}, content: raw, fm: '' };
  }
  const parsed = matter(raw);
  return { present: true, data: parsed.data ?? {}, content: parsed.content, fm: parsed.matter };
}
