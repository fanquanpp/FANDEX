import Fuse, { type IFuseOptions } from 'fuse.js';
// Web Worker 中 Vite 的 worker-import-meta-url 插件无法解析 tsconfig 的 `@/` 别名，
// 因此使用相对路径导入集中配置
import { RUNTIME } from '../config/runtime';

/**
 * 搜索索引条目类型
 * 描述每篇文档在搜索索引中的字段结构，供 Fuse.js 与过滤逻辑使用
 */
interface SearchEntry {
  /** 文档 slug（模块/文件名） */
  slug: string;
  /** 文档标题 */
  title: string;
  /** 文档描述 */
  description?: string;
  /** 文档标签列表 */
  tags?: string[];
  /** 所属模块 ID */
  module: string;
  /** 难度等级 */
  difficulty?: string;
  /** 更新时间字符串 */
  updated?: string;
}

let fuse: Fuse<SearchEntry> | null = null;

/**
 * Fuse.js 搜索选项
 * threshold 从 `RUNTIME.fuseThreshold` 读取（默认 0.4），
 * 可通过环境变量 PUBLIC_FUSE_THRESHOLD 覆盖
 */
const FUSE_OPTIONS: IFuseOptions<SearchEntry> = {
  keys: [
    { name: 'title', weight: 0.4 },
    { name: 'tags', weight: 0.25 },
    { name: 'slug', weight: 0.15 },
    { name: 'description', weight: 0.2 },
  ],
  threshold: RUNTIME.fuseThreshold,
  distance: 200,
  minMatchCharLength: 2,
  includeScore: true,
  useExtendedSearch: false,
};

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === 'init') {
    fuse = new Fuse(payload.index as SearchEntry[], FUSE_OPTIONS);
    self.postMessage({ type: 'ready' });
    return;
  }

  if (type === 'search') {
    if (!fuse) {
      self.postMessage({ type: 'results', payload: { results: [], query: payload.query } });
      return;
    }

    let results = fuse.search(payload.query);

    if (payload.moduleFilter) {
      results = results.filter((r) => r.item.module === payload.moduleFilter);
    }

    const items = results.map((r) => ({
      ...r.item,
      score: r.score ? 1 - r.score : 1,
    }));

    if (payload.sortMode === 'date') {
      items.sort((a, b) => {
        const da = a.updated || '';
        const db = b.updated || '';
        return db.localeCompare(da) || b.score - a.score;
      });
    }

    self.postMessage({
      type: 'results',
      payload: { results: items.slice(0, 50), query: payload.query },
    });
  }
};
