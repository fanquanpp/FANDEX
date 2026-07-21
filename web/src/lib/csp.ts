/**
 * Content-Security-Policy 配置
 *
 * 统一管理 CSP 策略，避免 404 页面与主页面 CSP 不一致导致的资源加载行为差异。
 * 每个常量保留原有策略的精确指令集，不做收紧或放宽，仅做抽取复用。
 *
 * 设计原则：
 * - MAIN_CSP 用于主站点（含 Astro 岛屿水合、CDN 资源、Pagefind 搜索等场景）
 * - MINIMAL_CSP 用于 404 页面（无岛屿水合，但保留内联 script 用于暗色模式初始化）
 * - 任意指令调整必须同步评估对页面资源加载的影响
 */

/**
 * 主站点 CSP
 *
 * 用于 BaseLayout.astro，覆盖所有通过该布局渲染的页面。
 * - script-src 允许 'unsafe-inline'：Astro 岛屿水合与暗色模式初始化脚本依赖内联脚本
 * - script-src 允许 https://cdn.jsdelivr.net：部分第三方资源从 jsDelivr CDN 加载
 * - style-src 允许 'unsafe-inline' 与 https://cdn.jsdelivr.net：内联样式与 CDN 样式资源
 * - font-src 允许 data:：Base64 内嵌字体
 * - img-src 允许 data:：Base64 内嵌图片（如 SVG 数据 URI）
 * - connect-src 仅 'self'：XHR/Fetch 仅允许同源
 */
export const MAIN_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "font-src 'self' data:",
  "img-src 'self' data:",
  "connect-src 'self'",
].join('; ');

/**
 * 404 页面精简 CSP
 *
 * 用于 src/pages/404.astro，无岛屿水合需求。
 * - script-src 保留 'unsafe-inline'：404 页面含暗色模式初始化内联脚本与模块搜索过滤脚本
 * - 不包含 cdn.jsdelivr.net：404 页面不加载 CDN 资源
 * - frame-ancestors 'none'：禁止任何页面通过 iframe 嵌入 404 页面，降低点击劫持风险
 * - font-src 仅 'self'：404 页面字体均来自同源，无 data: 字体
 */
export const MINIMAL_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
].join('; ');
