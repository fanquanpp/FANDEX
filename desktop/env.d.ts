/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly BASE_PATH?: string;
  /** Giscus 评论系统仓库 ID（可选，未配置则禁用评论） */
  readonly GISCUS_REPO_ID?: string;
  /** Giscus 评论系统分类 ID（可选，未配置则禁用评论） */
  readonly GISCUS_CATEGORY_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/**
 * Pagefind 模块声明
 *
 * Pagefind 静态搜索库的运行时模块位于 /pagefind/pagefind.js，
 * 由 Pagefind CLI 在构建后生成，无对应 npm 包类型声明。
 * 此声明允许 TypeScript 识别该动态导入。
 */
declare module '/pagefind/pagefind.js' {
  export interface PagefindSearchResult {
    id: string;
    data: () => Promise<{
      url: string;
      excerpt: string;
      meta: { title?: string; description?: string };
      sub_results: Array<{ url: string; excerpt: string; title: string }>;
    }>;
  }
  export interface PagefindSearchOptions {
    limit?: number;
    sort?: (a: PagefindSearchResult, b: PagefindSearchResult) => number;
  }
  export interface Pagefind {
    search: (
      query: string,
      options?: PagefindSearchOptions,
    ) => Promise<{ results: PagefindSearchResult[] }>;
    init?: () => Promise<void>;
  }
  const pagefind: Pagefind;
  export default pagefind;
}

/** 兼容带域名前缀的动态导入 */
declare module '*/pagefind/pagefind.js' {
  const pagefind: any;
  export default pagefind;
}
