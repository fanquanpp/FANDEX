/**
 * DOMPurify 全局类型声明
 * 声明通过 CDN 引入的 DOMPurify 库在 window 上的类型结构
 * 仅声明实际使用的 sanitize 方法，避免维护完整类型
 */

/** DOMPurify 配置项（仅声明本项目可能使用的字段） */
interface DOMPurifyConfig {
  /** 允许的标签白名单 */
  ALLOWED_TAGS?: string[];
  /** 允许的属性白名单 */
  ALLOWED_ATTR?: string[];
  /** 是否保留 HTML 注释 */
  KEEP_CONTENT?: boolean;
}

/** DOMPurify 库实例接口 */
interface DOMPurifyApi {
  /** 清洗 HTML 字符串，返回安全 HTML 字符串 */
  sanitize(dirty: string, config?: DOMPurifyConfig): string;
}

/** 在 window 上扩展 DOMPurify 字段 */
interface Window {
  DOMPurify: DOMPurifyApi;
}
