/**
 * URL 拼接与运行环境检测工具（Phase 5）
 *
 * 功能概述：
 * - 兼容 Tauri 桌面端与 Web 部署（GitHub Pages）两种运行环境
 * - 提供 `withBase(path)` 在不同环境下正确拼接基础路径
 * - 提供 `isTauri()` 检测当前是否运行在 Tauri WebView 中
 * - 提供 `getCurrentBase()` 获取当前环境下的基础路径
 * - 提供 `isExternal(url)` 判断是否外部链接
 * - 提供 `resolveUrl(url, base)` 安全的 URL 解析
 *
 * 设计要点：
 * - Tauri 环境下 `window.__TAURI__` 存在，base 路径为 `/`
 * - Web 部署环境下 base 路径由 Astro `import.meta.env.BASE_URL` 决定
 *   （GitHub Pages 项目站点通常为 `/FANDEX-exe/`）
 * - 所有函数均做 SSR 安全处理（typeof window === 'undefined' 时返回合理默认值）
 *
 * 使用示例：
 *   import { withBase, isTauri } from '@/lib/url';
 *   const link = withBase('/frontend/javascript/'); // '/FANDEX-exe/frontend/javascript/'
 *   if (isTauri()) { ... }
 */

/**
 * 检测当前是否运行在 Tauri 桌面端环境
 *
 * 实现说明：
 * - Tauri v1 在 window 上挂载 `__TAURI__` 对象
 * - Tauri v2 使用 `__TAURI_INTERNALS__` 或在 `window.isTauri` 标记
 * - SSR 环境直接返回 false
 *
 * @returns 是否为 Tauri 环境
 */
export function isTauri(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    '__TAURI__' in window ||
    '__TAURI_INTERNALS__' in window ||
    (window as unknown as { isTauri?: boolean }).isTauri === true
  );
}

/**
 * 获取当前环境下的基础路径
 *
 * 实现说明：
 * - Tauri 环境：返回 '/'（桌面端资源在 tauri://localhost 根下）
 * - Web 环境：返回 Astro 配置的 BASE_URL（如 '/FANDEX-exe/'）
 * - SSR 环境：返回 '/' 作为安全默认值
 *
 * @returns 基础路径（始终以 '/' 开头，以 '/' 结尾，根路径返回 '/'）
 */
export function getCurrentBase(): string {
  if (typeof window === 'undefined') return '/';

  if (isTauri()) return '/';

  // Astro 注入的 BASE_URL 环境变量（构建时确定）
  const astroBase = import.meta.env.BASE_URL;
  if (typeof astroBase === 'string' && astroBase.length > 0) {
    return normalizeBase(astroBase);
  }

  return '/';
}

/**
 * 规范化基础路径
 *
 * 规则：
 * - 空字符串或未提供 → 返回 '/'
 * - 不以 '/' 开头 → 补齐前导 '/'
 * - 不以 '/' 结尾 → 补齐尾随 '/'
 * - 已经规范化的 → 原样返回
 *
 * @param base - 待规范化的基础路径
 * @returns 规范化后的基础路径
 */
function normalizeBase(base: string): string {
  if (!base) return '/';
  let normalized = base;
  if (!normalized.startsWith('/')) normalized = `/${normalized}`;
  if (!normalized.endsWith('/')) normalized = `${normalized}/`;
  return normalized;
}

/**
 * 拼接基础路径到给定路径
 *
 * 实现说明：
 * - 外部链接（http/https/协议）直接返回，不拼接 base
 * - 锚点（#开头）直接返回
 * - 绝对路径（/开头）会与 base 拼接
 * - 相对路径会先补齐前导 '/'
 * - 处理前后斜杠避免重复
 *
 * @param path - 待拼接的路径
 * @returns 拼接后的完整路径
 */
export function withBase(path: string): string {
  // 空路径或仅斜杠直接返回 base
  if (!path || path === '/') {
    return getCurrentBase();
  }

  // 外部链接、协议、锚点、邮件等直接返回
  if (isExternal(path) || path.startsWith('#') || path.startsWith('mailto:')) {
    return path;
  }

  const base = getCurrentBase();
  // 根路径 base 直接返回规范化后的 path
  if (base === '/') {
    return normalizePath(path);
  }

  // 拼接 base 与 path，去除中间重复的 '/'
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${cleanBase}/${cleanPath}`;
}

/**
 * 规范化路径（确保以 '/' 开头）
 *
 * @param path - 待规范化的路径
 * @returns 以 '/' 开头的路径
 */
function normalizePath(path: string): string {
  if (!path.startsWith('/')) return `/${path}`;
  return path;
}

/**
 * 判断是否为外部链接
 *
 * 实现说明：
 * - 以 http://、https://、// 开头视为外部链接
 * - mailto:、tel:、data: 等协议也视为外部链接
 * - 其他视为内部路径
 *
 * @param url - 待判断的 URL
 * @returns 是否为外部链接
 */
export function isExternal(url: string): boolean {
  if (!url) return false;
  return (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('//') ||
    url.startsWith('mailto:') ||
    url.startsWith('tel:') ||
    url.startsWith('data:')
  );
}

/**
 * 安全的 URL 解析
 *
 * 实现说明：
 * - 优先使用原生 URL 构造器
 * - 提供基础路径用于解析相对 URL
 * - 解析失败时返回原始字符串
 *
 * @param url - 待解析的 URL
 * @param base - 基础路径（默认使用当前环境 base）
 * @returns 解析后的 URL 字符串
 */
export function resolveUrl(url: string, base: string = getCurrentBase()): string {
  if (typeof url !== 'string' || !url) return '';

  // 外部链接直接返回
  if (isExternal(url)) return url;

  try {
    // 浏览器环境下使用原生 URL 解析
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      const fullBase = `${origin}${base.startsWith('/') ? base : `/${base}`}`;
      const resolved = new URL(url, fullBase);
      return resolved.pathname + resolved.search + resolved.hash;
    }
    // SSR 环境降级为字符串拼接
    return withBase(url);
  } catch {
    // 解析失败时降级为 withBase
    return withBase(url);
  }
}

export default {
  isTauri,
  getCurrentBase,
  withBase,
  isExternal,
  resolveUrl,
};
