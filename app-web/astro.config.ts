
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';
import { remarkAdmonition } from './src/plugins/remark-admonition';
import { remarkInternalLinks } from './src/plugins/remark-internal-links';
import { rehypeLazyImages } from './src/plugins/rehype-lazy-images';
import { rehypeWrapTables } from './src/plugins/rehype-wrap-tables';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkEmoji from 'remark-emoji';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import { unified } from '@astrojs/markdown-remark';

const SITE_BASE = process.env.DESKTOP_BUILD === '1' ? '/' : '/FANDEX/';

export default defineConfig({
  site: 'https://fanquanpp.github.io',
  base: SITE_BASE,
  build: {
    inlineStylesheets: 'auto',
  },
  redirects: Object.fromEntries(
    Object.entries({
      '/algorithms/problems/': '/algorithms/?view=problems',
      '/redis/320-MongoDBOverviewQuickStart': '/mongodb/010-MongoDBOverviewQuickStart',
      '/redis/330-MongoDBCRUDOperations': '/mongodb/020-MongoDBCRUDOperations',
      '/redis/340-MongoDBAggregationPipeline': '/mongodb/030-MongoDBAggregationPipeline',
      '/redis/350-MongoDBIndexPerformance': '/mongodb/040-MongoDBIndexPerformance',
      '/redis/360-MongoDBSchemaDesign': '/mongodb/050-MongoDBSchemaDesign',
      '/redis/370-MongoDBTransactionSession': '/mongodb/060-MongoDBTransactionSession',
      '/redis/380-MongoDBReplicaSetSharding': '/mongodb/070-MongoDBReplicaSetSharding',
      '/redis/390-MongoDBSecurityUserManagement': '/mongodb/080-MongoDBSecurityUserManagement',
      '/redis/400-MongoDBChangeStreamRealtime': '/mongodb/090-MongoDBChangeStreamRealtime',
    }).map(([from, to]) => [from, `${SITE_BASE}${to}`.replace(/\/{2,}/g, '/')]),
  ),
  vite: {
    resolve: {
      extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
    },
    plugins: [
      tailwindcss(),
      ...(process.env.ANALYZE_BUNDLE === 'true'
        ? [
            visualizer({
              filename: 'reports/bundle-stats.html',
              template: 'treemap',
              gzipSize: true,
              brotliSize: true,
              open: false,
            }),
          ]
        : []),
    ],
    build: {
      rollupOptions: {
        output: {
          assetFileNames: 'assets/[name].[hash][extname]',
          chunkFileNames: 'assets/[name].[hash].js',
          entryFileNames: 'assets/[name].[hash].js',
        },
      },
    },
  },
  prefetch: {
    prefetchAll: false, // 不预取所有页面（视口策略已足够，避免带宽浪费）
    defaultStrategy: 'viewport', // 视口内链接自动预取，点击时命中缓存
  },
  integrations: [
    mdx(),
    sitemap({ filter: (page) => !page.includes('/design-system/') }),
    react(),
  ],
  markdown: {
    processor: unified({
      remarkPlugins: [
        remarkEmoji, // Emoji 短代码转换
        remarkMath, // 数学公式语法解析（$...$ 和 $$...$$）
        remarkAdmonition, // 自定义提示块（GitHub 风格：> [!NOTE] / > [!TIP] / > [!WARNING] 等）
        [remarkInternalLinks, { base: SITE_BASE }], // 站内根相对链接补 base 前缀（GitHub Pages 项目站点必需）
      ],
      rehypePlugins: [
        rehypeSlug, // 为标题添加 id
        // 标题锚点：SSR 直接在 h2/h3 末尾追加 '#' 锚点。此前 behavior:'wrap' 会把整个
        // 标题文本包进链接，继承 .prose a 样式导致标题看起来像超链接，且客户端
        // initHeadingAnchors 再追加一个 # 会产生嵌套 <a> 的非法结构
        [
          rehypeAutolinkHeadings,
          {
            behavior: 'append',
            test: (element: { tagName: string }) =>
              element.tagName === 'h2' || element.tagName === 'h3',
            content: { type: 'text', value: '#' },
            properties: { class: 'heading-anchor', ariaHidden: 'true', tabIndex: -1 },
          },
        ],
        [rehypeKatex, { output: 'mathml' }],
        rehypeLazyImages, // 图片懒加载（添加 loading="lazy"）
        rehypeWrapTables, // 表格包裹：将 table 包入 <div class="table-wrap"> 以承担横向滚动，规避 display:table 与 overflow-x:auto 冲突
      ],
    }),
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
      wrap: true,
      langAlias: {
        gitignore: 'bash', // .gitignore 文件使用 bash 语法
        sshconfig: 'plaintext', // SSH 配置文件使用纯文本
        gitattributes: 'plaintext', // .gitattributes 使用纯文本
        text: 'plaintext', // text 类型使用纯文本
      },
    },
  },
  trailingSlash: 'always',
  server: {
    port: 3000,
  },
});
