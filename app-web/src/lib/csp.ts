/**
 * Content-Security-Policy 配置
 *
 * 统一管理 CSP 策略，避免 404 页面与主页面 CSP 不一致导致的资源加载行为差异。
 * 每个常量保留原有策略的精确指令集，不做收紧或放宽，仅做抽取复用。
 *
 * 设计原则：
 * - MAIN_CSP 用于主站点（含 Astro 岛屿水合、CDN 资源等场景）
 * - MINIMAL_CSP 用于 404 页面（无岛屿水合，但保留内联 script 用于暗色模式初始化）
 * - 任意指令调整必须同步评估对页面资源加载的影响
 */

/**
 * 主站点 CSP
 *
 * 用于 BaseLayout.astro，覆盖所有通过该布局渲染的页面。
 * - script-src 允许 'unsafe-inline'：Astro 岛屿水合与暗色模式初始化脚本依赖内联脚本
 * - script-src 允许 https://cdn.jsdelivr.net：playground（前端实验室）运行时
 *   从 jsDelivr 按需加载 prettier 格式化器；mermaid 已改为 npm 依赖
 *   由 Vite 代码分割自托管，不再依赖 CDN
 * - script-src 允许 data:：Astro ClientRouter (View Transitions) 在 prefetch 启用时
 *   会注入 data:application/javascript, URL 的预取脚本，被 CSP 阻止会导致
 *   路由切换无响应（用户反馈：点击模块卡片多次才反应）。data: 在 script-src 中
 *   虽属较高风险，但该脚本由 Astro 框架内部生成，非用户可控输入，风险可控
 * - style-src 允许 'unsafe-inline' 与 https://cdn.jsdelivr.net：内联样式与 CDN 样式资源；
 *   品牌字体已全部自托管，不再依赖 Google Fonts 域
 * - font-src 允许 data:：Base64 内嵌字体；品牌字体（Chakra Petch / IBM Plex Sans /
 *   JetBrains Mono）全部来自同源 /fonts/ 目录
 * - img-src 允许 data:：Base64 内嵌图片（如 SVG 数据 URI）
 * - connect-src 'self' + jsDelivr：XHR/Fetch 允许同源与 playground prettier
 *   的 CDN 运行时（mermaid 渲染、语法速览语言分块均为同源资源）
 */
export const MAIN_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net data:",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "font-src 'self' data:",
  "img-src 'self' data:",
  "connect-src 'self' https://cdn.jsdelivr.net",
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
