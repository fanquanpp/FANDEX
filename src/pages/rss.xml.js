import rss from '@astrojs/rss'
import { getCollection } from 'astro:content'
import { SITE } from '@/lib/constants'

export async function GET(context) {
  const docs = await getCollection('docs')
  return rss({
    title: SITE.title,
    description: SITE.subtitle,
    site: context.site,
    items: docs.map(doc => ({
      title: doc.data.title,
      description: doc.data.description,
      pubDate: doc.data.updated || doc.data.created,
      link: `${import.meta.env.BASE_URL}${doc.data.module}/${doc.slug}`,
    })),
  })
}
