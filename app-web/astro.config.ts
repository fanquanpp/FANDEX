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

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx'; // MDX 支持：在 Markdown 中使用 JSX 组件
import sitemap from '@astrojs/sitemap'; // 站点地图：自动生成 sitemap.xml
import react from '@astrojs/react'; // React 集成：在 Astro 中使用 React 组件（三端统一 React 生态）
import pagefind from 'astro-pagefind'; // Pagefind 静态站点搜索集成：构建期生成索引至 dist/pagefind/
import tailwindcss from '@tailwindcss/vite'; // Tailwind CSS v4 Vite 插件（CSS-first 配置，无需 tailwind.config.js）
import { visualizer } from 'rollup-plugin-visualizer'; // Bundle 体积可视化分析：构建后生成 reports/bundle-stats.html
import { remarkAdmonition } from './src/lib/remark-admonition'; // 自定义提示块解析器
import { rehypeLazyImages } from './src/lib/rehype-lazy-images'; // 图片懒加载处理器
import { rehypeWrapTables } from './src/lib/rehype-wrap-tables'; // 表格包裹处理器：将 table 包入 <div class="table-wrap"> 以承担横向滚动
import { remarkCodeRunner } from './src/plugins/remark-code-runner'; // 代码运行器：识别 ```lang runnable 标记
import { remarkTermTooltip } from './src/plugins/remark-term-tooltip'; // 术语悬浮：扫描文档中已知术语并包裹 data-term-tooltip 容器
import { remarkExercise } from './src/plugins/remark-exercise'; // 习题与测验：识别 :::exercise / :::quiz 提示块并替换为 data-exercise / data-quiz 容器
import remarkMath from 'remark-math'; // 数学公式语法解析（LaTeX 语法）
import rehypeKatex from 'rehype-katex'; // KaTeX 数学公式渲染
import remarkGfm from 'remark-gfm'; // GitHub Flavored Markdown 支持（表格、删除线等）
import remarkEmoji from 'remark-emoji'; // Emoji 短代码转换（如 :smile: → 😄）
import rehypeSlug from 'rehype-slug'; // 为标题自动添加 id 属性
import rehypeAutolinkHeadings from 'rehype-autolink-headings'; // 为标题添加锚点链接

/** 项目根目录（app-web 子项目根，用于定位 shd-shared 等共享资源） */
const projectRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // 站点地址，用于生成 sitemap 和规范链接
  site: 'https://fanquanpp.github.io',
  // 部署基础路径（GitHub Pages 项目站点，单仓库仓库名 FANDEX）
  // 注意：base 必须与 GitHub Pages URL 路径一致，否则资源加载 404
  base: '/FANDEX/',
  build: {
    // 样式内联策略：auto 由 Astro 自动决定（小文件内联，大文件外部引用）
    inlineStylesheets: 'auto',
  },
  // Vite 构建选项：控制 Rollup 输出文件名格式
  vite: {
    // 扩展名解析：三端统一 React 生态后，.tsx 为 Islands 主扩展名
    // 使共享 mdx 文件中不带扩展名的 import '@/islands/CheatSheet'
    // 能正确解析到 CheatSheet.tsx（web/desktop 统一）
    resolve: {
      extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
      alias: {
        // cheatsheets 数据三端共享（仓库整理后已从 app-web/src/data/cheatsheets/ 迁移至 shd-shared/metadata/cheatsheets/）
        // MDX 中通过 @/data/cheatsheets/<name>.json 引用，保持引用路径不变
        '@/data/cheatsheets': resolve(
          projectRoot,
          '..',
          'shd-shared',
          'metadata',
          'cheatsheets',
        ),
      },
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
  // 预取配置：悬停时预加载页面，提升页面切换速度
  prefetch: {
    prefetchAll: false, // 不预取所有页面（节省带宽）
    defaultStrategy: 'hover', // 鼠标悬停时触发预取
  },
  // 集成：MDX 支持、站点地图生成、React 组件支持、Pagefind 静态搜索索引
  // pagefind() 在 astro build 阶段自动扫描 dist/ 生成搜索索引至 dist/pagefind/，
  // 替代原 build 脚本中手动 `pagefind --site dist` 步骤；同时在 astro dev 模式下
  // 自动复用上次构建的索引，便于本地开发调试搜索功能。
  integrations: [mdx(), sitemap(), react(), pagefind()],
  markdown: {
    // Remark 插件（Markdown → MDAST 转换阶段）
    remarkPlugins: [
      remarkGfm, // GFM 语法：表格、任务列表、删除线等
      remarkEmoji, // Emoji 短代码转换
      remarkMath, // 数学公式语法解析（$...$ 和 $$...$$）
      remarkAdmonition, // 自定义提示块（:::note、:::tip 等）
      remarkCodeRunner, // 代码运行器：识别 ```lang runnable 标记并替换为容器
      remarkTermTooltip, // 术语悬浮：扫描文档中已知术语并包裹 data-term-tooltip 容器
      remarkExercise, // 习题与测验：识别 :::exercise / :::quiz 提示块并替换为容器
    ],
    // Rehype 插件（MDAST → HAST → HTML 转换阶段）
    rehypePlugins: [
      rehypeSlug, // 为标题添加 id
      [rehypeAutolinkHeadings, { behavior: 'wrap' }], // 标题锚点链接（包裹整个标题）
      rehypeKatex, // KaTeX 数学公式渲染为 HTML
      rehypeLazyImages, // 图片懒加载（添加 loading="lazy"）
      rehypeWrapTables, // 表格包裹：将 table 包入 <div class="table-wrap"> 以承担横向滚动，规避 display:table 与 overflow-x:auto 冲突
    ],
    // 代码高亮配置：Shiki 双主题支持亮色/暗色模式切换
    shikiConfig: {
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
