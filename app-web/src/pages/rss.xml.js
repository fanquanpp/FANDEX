import rss from '@astrojs/rss';
import { SITE } from '@/lib/constants';
// RSS 通过 Service 层获取全量文档，避免 UI 层直连 Data 层（getCollection），
// 同时复用 doc-service 的统一排序与错误兜底逻辑。
import { getAllDocs, docSlug } from '@/services';

export async function GET(context) {
  const docs = await getAllDocs();
  return rss({
    title: SITE.title,
    description: SITE.subtitle,
    site: context.site,
    items: docs.map((doc) => ({
      title: doc.data.title,
      description: doc.data.description,
      // schema 仅含 updated 字段（无 created），缺失时省略 pubDate
      pubDate: doc.data.updated ? new Date(doc.data.updated) : undefined,
      // 链接必须与 [module]/[slug] 路由保持一致：
      // module 取自 frontmatter.module（规范短名），slug 取自文件名（docSlug），
      // 不能直接拼接 doc.id（物理目录路径含编号前缀与扩展名，会生成 404 链接）。
      link: `${import.meta.env.BASE_URL}${doc.data.module}/${docSlug(doc.id)}/`,
    })),
  });
}
