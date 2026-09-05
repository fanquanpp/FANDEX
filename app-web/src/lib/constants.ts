/**
 * 站点级常量定义
 * 定义 FANDEX 站点的元信息（标题、副标题、URL、作者、语言），
 * 供 SEO、Layout、Footer 等场景统一引用。
 */
import { RUNTIME } from '@/config/runtime';

export const SITE = {
  title: 'FANDEX',
  subtitle: '循序渐进',
  url: RUNTIME.siteUrl,
  author: 'fanquanpp',
  lang: 'zh-CN',
};

/**
 * 桌面端构建标记
 * app-desktop/build-desktop.mjs 会设置 DESKTOP_BUILD=1 构建 Tauri 前端产物：
 * 桌面端不提供在线编程，需隐藏"在线编程"（playground）入口，避免死链。
 * 构建期常量：Astro 前置脚本中读取，静态条件下渲染为无该入口的 HTML。
 */
export const IS_DESKTOP_BUILD = process.env.DESKTOP_BUILD === '1';

/**
 * 模块文档列表每页条数
 * 模块列表页分页使用（[module]/index.astro 与 [module]/page/[page].astro）：
 * 60 篇在列表可扫读性与页面体积间取得平衡，超大模块（300+ 篇）不再单页输出
 */
export const MODULE_PAGE_SIZE = 60;
