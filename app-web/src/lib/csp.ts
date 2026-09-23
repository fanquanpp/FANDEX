
export const MAIN_CSP = [
  "default-src 'self'",
  // script-src 的 jsdelivr 供前端实验室按需 import prettier 格式化插件（script-src 管控动态 import）；
  // 不放行 data: 脚本、CDN 样式与 CDN connect（站点无对应加载行为）
  "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data:",
  "connect-src 'self'",
].join('; ');

export const DESKTOP_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data:",
  "connect-src 'self'",
].join('; ');

export const MINIMAL_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
].join('; ');

// 仅 AI 设置页（/ai/）使用：在 MINIMAL_CSP 基础上放行用户自选的
// OrcaRouter API 域名（浏览器直连 BYOK 通道）。桌面端构建会剔除该页，
// 桌面 / 免责声明等页面维持 connect-src 'self'，完全离线。
export const AI_SETTINGS_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data:",
  "connect-src 'self' https://api.orcarouter.ai",
  "frame-ancestors 'none'",
].join('; ');
