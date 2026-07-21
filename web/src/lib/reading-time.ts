/**
 * 阅读时长估算工具
 * 提供 Markdown 文档预计阅读时长的计算逻辑
 *
 * 设计原则：
 * - 纯函数无副作用，可被 Service 层与 UI 层共享
 * - 优先使用 frontmatter 中的显式声明值，否则按字符数估算
 */

/**
 * 计算预计阅读时长（分钟）
 * 核心执行流程：
 *   1. 若 readingTime 有效（大于 0）则直接返回
 *   2. 去除代码块（```...```）和 Markdown 标记符号
 *   3. 按非空白字符数除以 300 估算阅读时长，最少 1 分钟
 * @param body - 文档正文（Markdown 原始内容）
 * @param readingTime - frontmatter 中指定的阅读时长（可选）
 * @returns 预计阅读时长（分钟，最少 1 分钟）
 */
export function computeReadingTime(body: string, readingTime?: number): number {
  if (readingTime && readingTime > 0) return readingTime;
  // 去除代码块（```...```）和 Markdown 标记符号
  const stripped = body.replace(/```[\s\S]*?```/g, '').replace(/[#*`~\[\]()>_\-!|]/g, '');
  const chars = stripped.replace(/\s/g, '').length;
  return Math.max(1, Math.ceil(chars / 300));
}
