import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE } from '@/lib/constants';

export async function GET(context) {
  const docs = await getCollection('docs');
  return rss({
    title: SITE.title,
    description: SITE.subtitle,
    site: context.site,
    items: docs.map((doc) => ({
      title: doc.data.title,
      description: doc.data.description,
      pubDate: doc.data.updated || doc.data.created,
      // Astro 7 glob loader 中 doc.id 已包含 module 前缀（形如 "agent/A2A协议"），
      // 对应路由 /[module]/[slug]/，故直接拼接 id 并补尾斜杠（与 trailingSlash: 'always' 对齐）
      link: `${import.meta.env.BASE_URL}${doc.id}/`,
    })),
  });
}
