import rss from '@astrojs/rss';
import { SITE } from '@/lib/constants';
import { getAllDocs, docSlug } from '@/services';

// 全量 1811 条一次性输出约 820KB，对订阅器与首次拉取都偏重；
// 只输出最近更新的 N 条（getAllDocs 按模块排序，这里复制后按 updated 重排）
const RSS_ITEM_LIMIT = 200;

export async function GET(context) {
  const docs = await getAllDocs();
  const items = [...docs]
    .sort(
      (a, b) =>
        (b.data.updated?.getTime() ?? 0) - (a.data.updated?.getTime() ?? 0),
    )
    .slice(0, RSS_ITEM_LIMIT);
  return rss({
    title: SITE.title,
    description: SITE.subtitle,
    site: new URL(import.meta.env.BASE_URL, context.site).href,
    items: items.map((doc) => ({
      title: doc.data.title,
      description: doc.data.description,
      pubDate: doc.data.updated || undefined,
      link: `${import.meta.env.BASE_URL}${doc.data.module}/${docSlug(doc.id)}/`,
    })),
  });
}
