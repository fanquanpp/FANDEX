/**
 * rss.xml.ts RSS Feed 端点（Phase 8a 新建）
 *
 * 功能概述：
 * - 输出全站最新 50 篇文档的 RSS 2.0 Feed
 * - 数据源：astro:content 的 docs 集合（约 1900+ 篇结构化文档）
 * - 排序：按 updated 优先，回退 created 日期，降序排列
 * - 字段：title / description / pubDate / link / categories
 * - 自定义数据：language=zh-CN
 * - 完全移除 Vue 与旧版依赖
 *
 * 路由：
 * - 文件路径：apps/web/src/pages/rss.xml.ts
 * - 输出 URL：/rss.xml（构建后生成静态文件）
 *
 * 使用方式：
 * - 用户可在 RSS 阅读器中订阅 https://fanquanpp.github.io/FANDEX-exe/rss.xml
 * - 浏览器访问该 URL 会下载/预览 XML 格式的 Feed
 *
 * Tauri 兼容：
 * - RSS Feed 为构建期生成的静态文件，Tauri 端通过相对路径访问
 * - 链接使用 SITE.url（含 base 路径）拼接绝对 URL，确保 RSS 阅读器可正确跳转
 *
 * 数据流：
 * 1. 构建期：getCollection('docs') 加载所有文档
 * 2. 过滤：仅保留有 created 或 updated 日期的文档
 * 3. 排序：按日期降序
 * 4. 截断：取前 50 篇
 * 5. 序列化：@astrojs/rss 的 rss() 函数生成 RSS 2.0 XML
 */

import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { SITE } from '@/lib/constants';

/** RSS Feed 最大条目数 */
const MAX_ITEMS = 50;

/**
 * RSS Feed GET 端点
 *
 * @returns RSS 2.0 XML 响应
 */
export const GET: APIRoute = async () => {
  /** 加载所有文档（构建期执行，无运行时开销） */
  const allDocs = await getCollection('docs');

  /**
   * 过滤 + 排序 + 截断
   *
   * 过滤：仅保留有 created 或 updated 日期的文档（无日期的文档无法按时间排序）
   * 排序：按 updated 优先，回退 created，降序（最新优先）
   * 截断：取前 MAX_ITEMS 篇
   */
  const recentDocs = allDocs
    .filter((doc) => doc.data.updated !== undefined || doc.data.created !== undefined)
    .sort((a, b) => {
      const aDate = a.data.updated ?? a.data.created ?? new Date(0);
      const bDate = b.data.updated ?? b.data.created ?? new Date(0);
      return bDate.getTime() - aDate.getTime();
    })
    .slice(0, MAX_ITEMS);

  /**
   * 生成 RSS 2.0 Feed
   *
   * - site：站点 URL（含 base 路径，用于解析相对链接）
   * - items：文档条目数组
   * - customData：附加 RSS 元素（语言、版权等）
   */
  return rss({
    title: `${SITE.name} - 最新文档`,
    description: SITE.description,
    site: SITE.url,
    items: recentDocs.map((doc) => {
      /** 优先使用 updated 作为发布时间，回退 created */
      const pubDate = doc.data.updated ?? doc.data.created ?? new Date();

      /** 分类列表：模块 ID + 标签数组 */
      const categories = [doc.data.module, ...doc.data.tags].filter(
        (value): value is string => typeof value === 'string' && value.length > 0,
      );

      /** 文档绝对 URL（new URL 自动处理中文字符编码） */
      const link = new URL(`${doc.id}/`, SITE.url).toString();

      return {
        title: doc.data.title,
        description: doc.data.description ?? '',
        pubDate,
        link,
        categories,
        /** 作者字段（部分 RSS 阅读器会展示） */
        author: doc.data.author ?? SITE.author,
      };
    }),
    customData: `<language>zh-CN</language>`,
  });
};
