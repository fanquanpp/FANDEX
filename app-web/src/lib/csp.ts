
export const MAIN_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net data:",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "font-src 'self' data:",
  "img-src 'self' data:",
  "connect-src 'self' https://cdn.jsdelivr.net",
].join('; ');

export const DESKTOP_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' data:",
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
