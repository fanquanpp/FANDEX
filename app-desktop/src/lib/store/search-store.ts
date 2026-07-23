/**
 * 搜索状态管理 Store（Zustand v5）
 *
 * 功能概述：
 * - 使用 Zustand v5 `create` + `persist` 中间件管理搜索 UI 状态
 * - 状态字段：query / results / isOpen / recentSearches / selectedIndex / isLoading
 * - persist 持久化 recentSearches（最多 10 个，去重）
 * - 提供键盘导航支持：moveSelection('up' | 'down')
 *
 * 设计要点：
 * - 搜索结果 SearchResult 类型与全局搜索索引兼容
 * - selectedIndex 在 results 变化时自动重置
 * - recentSearches 仅持久化非空且去重的查询
 * - open/close/toggle 控制搜索面板可见性
 *
 * 使用示例：
 *   import { useSearchStore } from '@/lib/store/search-store';
 *   const { query, setQuery, results, isOpen, open, close, moveSelection } = useSearchStore();
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** 搜索结果类型 */
export interface SearchResult {
  /** 文档 ID */
  id: string;
  /** 标题 */
  title: string;
  /** 描述（摘要） */
  description?: string;
  /** 所属模块 */
  module?: string;
  /** URL slug */
  slug?: string;
  /** 完整 URL */
  url?: string;
  /** 结果类型：文档 / 术语表 / 速查表 */
  type: 'doc' | 'glossary' | 'cheatsheet';
  /** 相关性分数（0-1，越高越相关） */
  score?: number;
}

/** recentSearches 持久化键名 */
const STORAGE_KEY = 'fandex-recent-searches';

/** recentSearches 最大长度 */
const MAX_RECENT_SEARCHES = 10;

/** 搜索 Store 状态接口 */
export interface SearchStoreState {
  /** 当前搜索关键词 */
  query: string;
  /** 搜索结果列表 */
  results: SearchResult[];
  /** 搜索面板是否展开 */
  isOpen: boolean;
  /** 最近搜索关键词列表（最新在前，最多 10 个，去重） */
  recentSearches: string[];
  /** 当前选中结果索引（键盘导航） */
  selectedIndex: number;
  /** 是否正在搜索 */
  isLoading: boolean;

  /** 设置搜索关键词（自动重置选中索引） */
  setQuery: (query: string) => void;
  /** 设置搜索结果（自动重置选中索引） */
  setResults: (results: SearchResult[]) => void;
  /** 设置 loading 状态 */
  setLoading: (loading: boolean) => void;
  /** 打开搜索面板 */
  open: () => void;
  /** 关闭搜索面板 */
  close: () => void;
  /** 切换搜索面板可见性 */
  toggle: () => void;
  /** 添加最近搜索关键词（去重、最多 10 个） */
  addRecentSearch: (query: string) => void;
  /** 清空最近搜索列表 */
  clearRecentSearches: () => void;
  /** 移动选中索引（键盘上下箭头导航） */
  moveSelection: (direction: 'up' | 'down') => void;
  /** 重置选中索引为 0 */
  resetSelection: () => void;
}

/**
 * 搜索 Store 实现
 *
 * 设计要点：
 * 1. persist 持久化 recentSearches 字段
 * 2. setQuery / setResults 自动重置 selectedIndex
 * 3. moveSelection 在 results 范围内循环
 * 4. addRecentSearch 自动去除前后空白、去重、限制长度
 */
export const useSearchStore = create<SearchStoreState>()(
  persist(
    (set, get) => ({
      query: '',
      results: [],
      isOpen: false,
      recentSearches: [],
      selectedIndex: 0,
      isLoading: false,

      /**
       * 设置搜索关键词
       *
       * @param query - 搜索关键词
       */
      setQuery: (query) => {
        set({ query, selectedIndex: 0 });
      },

      /**
       * 设置搜索结果
       *
       * @param results - 搜索结果列表
       */
      setResults: (results) => {
        set({ results, selectedIndex: 0 });
      },

      /**
       * 设置 loading 状态
       *
       * @param loading - 是否正在搜索
       */
      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      /** 打开搜索面板 */
      open: () => set({ isOpen: true }),

      /** 关闭搜索面板 */
      close: () => set({ isOpen: false }),

      /** 切换搜索面板可见性 */
      toggle: () => set((state) => ({ isOpen: !state.isOpen })),

      /**
       * 添加最近搜索关键词
       *
       * 实现说明：
       * - 去除前后空白
       * - 空字符串不添加
       * - 已存在的关键词移到列表头部
       * - 列表长度限制为 MAX_RECENT_SEARCHES
       *
       * @param query - 搜索关键词
       */
      addRecentSearch: (query) => {
        const trimmed = query.trim();
        if (!trimmed) return;

        set((state) => {
          // 移除已存在的相同关键词
          const filtered = state.recentSearches.filter((s) => s !== trimmed);
          // 插入到头部，限制长度
          const newList = [trimmed, ...filtered].slice(0, MAX_RECENT_SEARCHES);
          return { recentSearches: newList };
        });
      },

      /** 清空最近搜索列表 */
      clearRecentSearches: () => set({ recentSearches: [] }),

      /**
       * 移动选中索引（键盘上下箭头导航）
       *
       * 实现说明：
       * - 上箭头：到顶部时循环到底部
       * - 下箭头：到底部时循环到顶部
       * - 无结果时不操作
       *
       * @param direction - 移动方向 'up' | 'down'
       */
      moveSelection: (direction) => {
        const { results, selectedIndex } = get();
        if (results.length === 0) return;

        if (direction === 'up') {
          set({ selectedIndex: selectedIndex <= 0 ? results.length - 1 : selectedIndex - 1 });
        } else {
          set({ selectedIndex: selectedIndex >= results.length - 1 ? 0 : selectedIndex + 1 });
        }
      },

      /** 重置选中索引为 0 */
      resetSelection: () => set({ selectedIndex: 0 }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // 仅持久化 recentSearches 字段
      partialize: (state) => ({ recentSearches: state.recentSearches }),
    },
  ),
);

export default useSearchStore;
