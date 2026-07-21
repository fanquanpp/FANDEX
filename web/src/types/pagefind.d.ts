/**
 * Pagefind 全局类型声明
 * Pagefind 通过动态 import 从 CDN/本地加载，无 npm 包类型定义。
 * 此声明提供搜索 UI 与 API 的最小类型骨架，供 search.astro 使用。
 */

/** Pagefind 搜索过滤器（键为过滤维度，值为过滤值） */
type PagefindFilter = Record<string, string>;

/** Pagefind 搜索 UI 实例 */
interface PagefindUI {
  /** 触发搜索 */
  triggerSearch(query: string): void;
  /** 应用过滤器 */
  filter(filters: PagefindFilter): void;
}

/** Pagefind UI 构造函数选项 */
interface PagefindUIOptions {
  /** 挂载元素选择器 */
  element: string;
  /** 是否显示子结果 */
  showSubResults?: boolean;
  /** 是否显示图片 */
  showImages?: boolean;
}

/** Pagefind UI 构造函数 */
interface PagefindUIConstructor {
  new (options: PagefindUIOptions): PagefindUI;
}

/** Pagefind 模块导出 */
interface PagefindModule {
  /** 配置选项 */
  options(opts: { baseUrl?: string; basePath?: string }): Promise<void>;
  /** 初始化搜索索引 */
  init(): Promise<void>;
  /** 搜索 UI 构造函数 */
  UI: PagefindUIConstructor;
}

/** 通过动态 import 加载的 pagefind 模块 */
declare module '*pagefind/pagefind.js' {
  const pagefind: PagefindModule;
  export default pagefind;
  export const options: PagefindModule['options'];
  export const init: PagefindModule['init'];
  export const UI: PagefindUIConstructor;
}
