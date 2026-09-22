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

  const categoryLabels = new Map(categories.map((c) => [c.id, c.label]));

  const docsByModule = new Map<string, typeof docs>();
  for (const doc of docs) {
    const list = docsByModule.get(doc.data.module) ?? [];
    list.push(doc);
    docsByModule.set(doc.data.module, list);
  }

  const siteUrl = (context.site ?? new URL(SITE.url)).href.replace(/\/$/, '');
  const base = import.meta.env.BASE_URL;
  const docUrl = (module: string, id: string): string =>
    `${siteUrl}${base}${module}/${docSlug(id)}/`;

  const lines: string[] = [];

  lines.push(`# ${SITE.title}`);
  lines.push('');
  lines.push(`> ${SITE.subtitle}`);
  lines.push('');
  lines.push(
    `FANDEX 是面向中文开发者的结构化学习站点，覆盖 ${docsByModule.size} 个模块、` +
      `${docs.length} 篇技术文档。全站更新可通过 RSS 订阅：${siteUrl}${base}rss.xml`,
  );

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

  return new Response(`${lines.join('\n')}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
