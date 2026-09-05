/**
 * Astro 项目配置文件
 *
 * 功能概述：
 * 定义 FANDEX 项目的核心配置，包括站点地址、构建选项、Markdown 渲染管线、
 * 代码高亮、集成插件等。该文件是 Astro 框架的入口配置，所有构建和开发
 * 行为均受此文件控制。
 *
 * 关键配置说明：
 * - 部署目标：GitHub Pages（项目站点，基础路径 /FANDEX/）
 * - Markdown 插件：GFM 语法、Emoji、数学公式（KaTeX）、自定义提示块、图片懒加载
 * - 代码高亮：Shiki 双主题（github-light / github-dark），通过 CSS 变量切换
 * - 集成：MDX 支持、站点地图生成、React 组件支持
 */

import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx'; // MDX 支持：在 Markdown 中使用 JSX 组件
import sitemap from '@astrojs/sitemap'; // 站点地图：自动生成 sitemap.xml
import react from '@astrojs/react'; // React 集成：在 Astro 中使用 React 组件（三端统一 React 生态）
import tailwindcss from '@tailwindcss/vite'; // Tailwind CSS v4 Vite 插件（CSS-first 配置，无需 tailwind.config.js）
import { visualizer } from 'rollup-plugin-visualizer'; // Bundle 体积可视化分析：构建后生成 reports/bundle-stats.html
import { remarkAdmonition } from './src/plugins/remark-admonition'; // 自定义提示块解析器
import { rehypeLazyImages } from './src/plugins/rehype-lazy-images'; // 图片懒加载处理器
import { rehypeWrapTables } from './src/plugins/rehype-wrap-tables'; // 表格包裹处理器：将 table 包入 <div class="table-wrap"> 以承担横向滚动
import remarkMath from 'remark-math'; // 数学公式语法解析（LaTeX 语法）
import rehypeKatex from 'rehype-katex'; // KaTeX 数学公式渲染
import remarkEmoji from 'remark-emoji'; // Emoji 短代码转换（如 :smile: → 😄）
import rehypeSlug from 'rehype-slug'; // 为标题自动添加 id 属性
import rehypeAutolinkHeadings from 'rehype-autolink-headings'; // 为标题添加锚点链接
import { unified } from '@astrojs/markdown-remark'; // Astro 7.3+ 的 remark/rehype Markdown 处理器

export default defineConfig({
  // 站点地址，用于生成 sitemap 和规范链接
  site: 'https://fanquanpp.github.io',
  // 部署基础路径（GitHub Pages 项目站点，单仓库仓库名 FANDEX）
  // 注意：base 必须与 GitHub Pages URL 路径一致，否则资源加载 404
  // 桌面端构建（DESKTOP_BUILD=1，由 app-desktop/build-desktop.mjs 设置）使用
  // 根路径 base：Tauri 的 frontendDist 服务在根路径，/FANDEX/ 前缀会 404
  base: process.env.DESKTOP_BUILD === '1' ? '/' : '/FANDEX/',
  build: {
    // 样式内联策略：auto 由 Astro 自动决定（小文件内联，大文件外部引用）
    inlineStylesheets: 'auto',
  },
  // Vite 构建选项：控制 Rollup 输出文件名格式
  vite: {
    // 扩展名解析：.tsx 为 Islands 主扩展名，使不带扩展名的 import 能正确解析
    resolve: {
      extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
    },
    plugins: [
      // Tailwind CSS v4 Vite 插件：CSS-first 配置，自动扫描源码生成工具类
      // 配置文件位于 src/styles/tailwind.css（通过 @import "tailwindcss" 引入）
      tailwindcss(),
      // Bundle 体积可视化分析：构建后在 reports/bundle-stats.html 生成可交互的 treemap
      // 仅在 ANALYZE_BUNDLE=true 时启用，避免 dev/常规 CI 构建增加开销
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
          // 静态资源文件名格式：包含 hash 以实现长期缓存
          assetFileNames: 'assets/[name].[hash][extname]',
          chunkFileNames: 'assets/[name].[hash].js',
          entryFileNames: 'assets/[name].[hash].js',
        },
      },
    },
  },
  // 预取配置：视口内预加载页面，提升页面切换速度
  // -------------------------------------------------------------------------
  // 策略选择 viewport 而非 hover：
  // - hover 策略在鼠标悬停时才触发预取，若用户快速点击（hover 时间不足），
  //   页面尚未预取完成，导致首次点击响应延迟高（用户反馈：首次点击反应慢）
  // - viewport 策略利用 IntersectionObserver 自动预取进入视口的链接，
  //   用户滚动时链接已被预取缓存，点击时直接命中缓存，显著降低首点击延迟
  // - 对所有页面安全：仅预取视口内可见链接，非全站预取，带宽与内存可控
  // - 链接级覆盖：个别链接可通过 data-astro-prefetch="hover" 单独降级为 hover 策略
  prefetch: {
    prefetchAll: false, // 不预取所有页面（视口策略已足够，避免带宽浪费）
    defaultStrategy: 'viewport', // 视口内链接自动预取，点击时命中缓存
  },
  // 集成：MDX 支持、站点地图生成、React 组件支持
  // 偏差报备：原含 pagefind() 静态搜索索引集成，搜索页（search.astro）已删除，
  // astro-pagefind 集成及相关脚本已移除（站内搜索改由 pagefind 构建脚本 + 命令面板提供）
  // sitemap 过滤：design-system 为内部开发页（robots.txt 已 Disallow），同步从站点地图排除
  integrations: [
    mdx(),
    sitemap({ filter: (page) => !page.includes('/design-system/') }),
    react(),
  ],
  markdown: {
    // Markdown 处理器：Astro 7.3 起默认处理器为 Sätteri，remark/rehype 插件
    // 需显式挂载到 unified 处理器（@astrojs/markdown-remark）上，
    // 旧的 markdown.remarkPlugins 顶层写法已废弃并将在下个大版本移除。
    // gfm/smartypants 由处理器内建（默认开启），不再单独引入 remark-gfm。
    processor: unified({
      // Remark 插件（Markdown → MDAST 转换阶段）
      remarkPlugins: [
        remarkEmoji, // Emoji 短代码转换
        remarkMath, // 数学公式语法解析（$...$ 和 $$...$$）
        remarkAdmonition, // 自定义提示块（:::note、:::tip 等）
      ],
      // Rehype 插件（MDAST → HAST → HTML 转换阶段）
      rehypePlugins: [
        rehypeSlug, // 为标题添加 id
        [rehypeAutolinkHeadings, { behavior: 'wrap' }], // 标题锚点链接（包裹整个标题）
        rehypeKatex, // KaTeX 数学公式渲染为 HTML
        rehypeLazyImages, // 图片懒加载（添加 loading="lazy"）
        rehypeWrapTables, // 表格包裹：将 table 包入 <div class="table-wrap"> 以承担横向滚动，规避 display:table 与 overflow-x:auto 冲突
      ],
    }),
    // 代码高亮配置：Shiki 双主题支持亮色/暗色模式切换
    shikiConfig: {
      // 引擎说明：Astro 7 的内部高亮器（@astrojs/internal-helpers/shiki）
      // 不再透传 shikiConfig.engine，始终按环境自选引擎（Node 下为 oniguruma WASM）。
      // 若未来全站连续高亮再现 WASM 内存越界（CI 曾报 "memory access out of bounds"），
      // 迁移路径：markdown.syntaxHighlight: false + 自定义 rehype-shiki 插件，
      // 内部使用 shiki 的 createJavaScriptRegexEngine({ forgiving: true })。
      themes: { light: 'github-light', dark: 'github-dark' },
      // 不输出内联 color 属性，通过 CSS 变量（--shiki-light / --shiki-dark）控制主题切换
      defaultColor: false,
      // 长代码自动换行，避免横向滚动
      wrap: true,
      // 语言别名映射：将非标准语言标识映射到 Shiki 支持的语言
      langAlias: {
        gitignore: 'bash', // .gitignore 文件使用 bash 语法
        sshconfig: 'plaintext', // SSH 配置文件使用纯文本
        gitattributes: 'plaintext', // .gitattributes 使用纯文本
        text: 'plaintext', // text 类型使用纯文本
      },
    },
  },
  // URL 尾部斜杠：始终添加，确保路径一致性（避免 /path 和 /path/ 被视为不同页面）
  trailingSlash: 'always',
  // 开发服务器端口
  server: {
    port: 3000,
  },
});
