/**
 * /llms.txt 端点：面向 AI 助手与编码代理的站点结构索引
 *
 * 遵循 llmstxt.org 提案：以纯 Markdown 列出全站文档的标题、链接与描述，
 * 使 LLM 与 AI 编码助手（ChatGPT、Cursor、Claude Code 等）无需解析 HTML
 * 即可索引与检索站点内容。2026 年起已成为文档站服务 AI 生态的通行做法
 * （Mintlify、Snowflake、ZenML 等均已支持）。
 *
 * 输出结构（llms.txt 规范格式）：
 *   # 站点名
 *   > 副标题
 *   概览段（模块数 / 文档数 / RSS 订阅地址）
 *   ## 分类中文名
 *   ### 模块标题（模块 id）
 *   - [文档标题](绝对 URL): 一句话描述
 *
 * 说明：
 * - design-system 为内部开发页（robots.txt 已 Disallow），且不属于 docs
 *   collection，天然不会出现在本文件
 * - URL 拼接方式与 rss.xml.js 保持一致：BASE_URL 兼容 GitHub Pages
 *   项目站点（/FANDEX/）与桌面端（/）两种 base
 */
import type { APIContext } from 'astro';
import { SITE } from '@/lib/constants';
import {
  getAllDocs,
  getAllModules,
  getPrimaryCategory,
  getCategories,
  docSlug,
} from '@/services';

export async function GET(context: APIContext): Promise<Response> {
  const docs = await getAllDocs();
  const modules = getAllModules();
  const categories = getCategories();

  // 分类 ID → 中文名映射，用于模块分组标题
  const categoryLabels = new Map(categories.map((c) => [c.id, c.label]));

  // 文档按模块分组（getAllDocs 已按 module + order 排序，保持组内顺序即可）
  const docsByModule = new Map<string, typeof docs>();
  for (const doc of docs) {
    const list = docsByModule.get(doc.data.module) ?? [];
    list.push(doc);
    docsByModule.set(doc.data.module, list);
  }

  // 站点根 URL：优先使用构建注入的 context.site，回退到 SITE 常量
  const siteUrl = (context.site ?? new URL(SITE.url)).href.replace(/\/$/, '');
  const base = import.meta.env.BASE_URL;
  // 拼接文档绝对 URL（与 [module]/[slug] 路由一致，trailingSlash: 'always'）
  const docUrl = (module: string, id: string): string =>
    `${siteUrl}${base}${module}/${docSlug(id)}/`;

  const lines: string[] = [];

  // 头部：站点标识 + 概览段（llms.txt 规范的 blockquote 描述）
  lines.push(`# ${SITE.title}`);
  lines.push('');
  lines.push(`> ${SITE.subtitle}`);
  lines.push('');
  lines.push(
    `FANDEX 是面向中文开发者的结构化学习站点，覆盖 ${docsByModule.size} 个模块、` +
      `${docs.length} 篇技术文档。全站更新可通过 RSS 订阅：${siteUrl}${base}rss.xml`,
  );

  // 主体：按「分类 → 模块 → 文档」三级分组输出
  for (const mod of modules) {
    const modDocs = docsByModule.get(mod.id);
    if (!modDocs || modDocs.length === 0) continue;

    const primaryCategory = getPrimaryCategory(mod.id);
    const categoryLabel = primaryCategory ? categoryLabels.get(primaryCategory) : undefined;

    lines.push('');
    lines.push(`## ${categoryLabel ?? '其他'}`);
    lines.push('');
    lines.push(`### ${mod.title}（${mod.id}）`);
    if (mod.description && mod.description !== mod.title) {
      lines.push('');
      lines.push(mod.description);
    }
    lines.push('');
    for (const doc of modDocs) {
      const desc = doc.data.description ? `: ${doc.data.description}` : '';
      lines.push(`- [${doc.data.title}](${docUrl(doc.data.module, doc.id)})${desc}`);
    }
  }

  // llms.txt 以纯文本返回；Cache-Control 交由 GitHub Pages 默认策略
  return new Response(`${lines.join('\n')}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
