import rss from '@astrojs/rss';
import { SITE } from '@/lib/constants';
import { getAllDocs, docSlug } from '@/services';

export async function GET(context) {
  const docs = await getAllDocs();
  return rss({
    title: SITE.title,
    description: SITE.subtitle,
    site: new URL(import.meta.env.BASE_URL, context.site).href,
    items: docs.map((doc) => ({
      title: doc.data.title,
      description: doc.data.description,
      pubDate: doc.data.updated ? new Date(doc.data.updated) : undefined,
      link: `${import.meta.env.BASE_URL}${doc.data.module}/${docSlug(doc.id)}/`,
    })),
  });
}
