/**
 * Astro 7 项目配置文件（FANDEX Phase 2）
 *
 * 功能概述：
 * 定义 FANDEX Web 前端核心配置，包括站点地址、构建选项、Markdown 渲染管线、
 * 代码高亮、集成插件等。该文件是 Astro 框架的入口配置。
 *
 * 关键配置说明：
 * - 部署目标：Tauri 桌面端（基础路径 /，通过 tauri://localhost 加载）
 * - 集成：React 19、MDX、Sitemap（Phase 0 已移除旧前端框架依赖）
 * - Markdown 插件：GFM、Emoji、数学公式（KaTeX）、自定义提示块、图片懒加载、Mermaid、术语预编译
 * - 代码高亮：Shiki 双主题（github-light / github-dark），通过 CSS 变量切换
 * - 样式：Tailwind v4 通过 @tailwindcss/vite 插件接入
 *
 * 环境变量：
 * - BASE_PATH：构建基础路径，桌面端默认 /（tauri://localhost 协议加载）
 */

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import mdx from '@astrojs/mdx'; // MDX 支持：在 Markdown 中使用 JSX 组件
import react from '@astrojs/react'; // React 19 集成：在 Astro 中使用 React 组件
import sitemap from '@astrojs/sitemap'; // 站点地图：自动生成 sitemap.xml
import tailwindcss from '@tailwindcss/vite'; // Tailwind v4 Vite 插件
import { defineConfig } from 'astro/config';
import rehypeAutolinkHeadings from 'rehype-autolink-headings'; // 为标题添加锚点链接
import rehypeKatex from 'rehype-katex'; // KaTeX 数学公式渲染
import rehypeSlug from 'rehype-slug'; // 为标题自动添加 id 属性
import remarkEmoji from 'remark-emoji'; // Emoji 短代码转换（如 :smile: → 😄）
import remarkGfm from 'remark-gfm'; // GitHub Flavored Markdown 支持（表格、删除线等）
import remarkMath from 'remark-math'; // 数学公式语法解析（LaTeX 语法）
import { rehypeLazyImages } from './src/lib/rehype-lazy-images'; // 图片懒加载 + 防 CLS + 响应式 srcset
import { remarkAdmonition } from './src/lib/remark-admonition'; // 自定义提示块（:::note、:::tip 等）
import { createRemarkMermaid } from './src/lib/remark-mermaid'; // Mermaid 代码块构建时预渲染为 SVG
import { createRemarkTermLink } from './src/lib/remark-term-link'; // 术语预编译标记 [[term]] → 带 tooltip 链接

/** 项目根目录（desktop 子项目根，用于定位 metadata/glossary/ 等项目级资源） */
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = __dirname;

/**
 * 构建基础路径
 *
 * 优先级：
 * 1. 显式环境变量 BASE_PATH（最高优先级，用于强制覆盖）
 * 2. 默认 /（Tauri 桌面端通过 tauri://localhost/ 协议加载前端资源）
 *
 * 注意：Tauri 桌面端通过 tauri://localhost/ 协议加载前端资源，
 *       若 base path 非根路径，所有 CSS/JS 资源会 404 导致白屏。
 */
const basePath = process.env.BASE_PATH || '/';

/**
 * PostCSS 插件：KaTeX 字体显示策略优化
 *
 * 功能：将 KaTeX CSS 中的 font-display:block 替换为 font-display:swap，
 * 使浏览器在 KaTeX 字体加载期间先使用回退字体渲染文字，避免 FOIT（Flash of Invisible Text）。
 *
 * 输入：PostCSS 处理管线中的 CSS 根节点
 * 输出：替换 font-display 属性值后的 CSS
 * 流程：遍历所有 @font-face 规则，将 font-display: block 替换为 font-display: swap
 */
const postcssKatexFontDisplaySwap = {
  postcssPlugin: 'postcss-katex-font-display-swap',
  AtRule(rule: {
    name: string;
    params: string;
    nodes?: Array<{ type: string; prop?: string; value?: string }>;
  }) {
    /* 仅处理 @font-face 规则 */
    if (rule.name === 'font-face') {
      /* 在规则内容中替换 font-display:block 为 font-display:swap */
      if (typeof rule.nodes !== 'undefined') {
        for (const node of rule.nodes) {
          if (node.type === 'decl' && node.prop === 'font-display' && node.value === 'block') {
            node.value = 'swap';
          }
        }
      }
    }
  },
};

export default defineConfig({
  // 站点地址，用于生成 sitemap 和规范链接
  site: 'https://fanquanpp.github.io',
  // 部署基础路径（GitHub Pages 项目站点或桌面端相对路径）
  base: basePath,
  build: {
    // 样式内联策略：auto 由 Astro 自动决定（小文件内联，大文件外部引用）
    inlineStylesheets: 'auto',
  },
  // 预取配置：悬停时预加载页面，提升页面切换速度
  prefetch: {
    prefetchAll: false, // 不预取所有页面（节省带宽）
    defaultStrategy: 'hover', // 鼠标悬停时触发预取
  },
  // 集成：React 19、MDX 支持、站点地图生成
  integrations: [react(), mdx(), sitemap()],
  markdown: {
    // Remark 插件（Markdown → MDAST 转换阶段）
    remarkPlugins: [
      remarkGfm, // GFM 语法：表格、任务列表、删除线等
      remarkEmoji, // Emoji 短代码转换
      remarkMath, // 数学公式语法解析（$...$ 和 $$...$$）
      createRemarkMermaid({ theme: 'neutral' }), // Mermaid 图表构建时预渲染为 SVG（消除客户端 JS 依赖）
      remarkAdmonition, // 自定义提示块（:::note、:::tip 等）
      createRemarkTermLink({ baseDir: projectRoot }), // 术语预编译标记（构建时嵌入术语 HTML）
    ],
    // Rehype 插件（MDAST → HAST → HTML 转换阶段）
    rehypePlugins: [
      rehypeSlug, // 为标题添加 id
      [rehypeAutolinkHeadings, { behavior: 'wrap' }], // 标题锚点链接（包裹整个标题）
      [rehypeKatex, { output: 'html' }], // KaTeX 数学公式渲染为 HTML（不输出 MathML，减少 HTML 体积）
      // biome-ignore lint/suspicious/noExplicitAny: rehype 插件类型签名与 Astro 7 RehypePlugin 略有差异，运行时无影响
      rehypeLazyImages as any, // 图片懒加载（loading=lazy、防 CLS、响应式 srcset、占位 SVG）
    ],
    // 代码高亮配置：Shiki 双主题支持亮色/暗色模式切换
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      // 不输出内联 color 属性，通过 CSS 变量（--shiki-light / --shiki-dark）控制主题切换
      defaultColor: false,
      // 长代码自动换行，避免横向滚动
      wrap: true,
    },
  },
  // URL 尾部斜杠：始终添加，确保路径一致性（避免 /path 和 /path/ 被视为不同页面）
  trailingSlash: 'always',
  // 开发服务器端口
  server: {
    port: 4321,
  },
  // Vite 配置：Tailwind v4 插件、PostCSS 插件、构建产物命名、Tiptap 依赖排除
  vite: {
    plugins: [tailwindcss()],
    css: {
      postcss: {
        plugins: [
          postcssKatexFontDisplaySwap, // KaTeX 字体显示策略优化（font-display: swap）
        ],
      },
    },
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
    // Tiptap 编辑器依赖 SSR 时不参与预构建，避免 Vite 优化阶段报错
    optimizeDeps: {
      exclude: ['@tiptap/*'],
    },
    // 允许 Vite 访问项目根目录的 metadata/ 资源（modules.ts 导入 metadata/modules.json）
    server: {
      fs: {
        allow: [projectRoot],
      },
    },
    // 解析别名：将 @modules 指向项目根 metadata/modules.json，便于在 modules.ts 中导入
    resolve: {
      alias: {
        '@modules': resolve(projectRoot, 'metadata/modules.json'),
      },
    },
  },
});
