/**
 * useSearch Hook：搜索 UI 状态
 *
 * 功能概述：
 * - 集成 search-store
 * - 提供 query / results / isOpen / setQuery / open / close / moveSelection 接口
 * - 通过 selector 订阅最小化重渲染
 * - 提供 addRecentSearch / clearRecentSearches 接口管理搜索历史
 *
 * 使用示例：
 *   function SearchDialog() {
 *     const { query, results, isOpen, setQuery, close, moveSelection } = useSearch();
 *     if (!isOpen) return null;
 *     return (
 *       <div>
 *         <input value={query} onChange={(e) => setQuery(e.target.value)} />
 *         {results.map(r => <div key={r.id}>{r.title}</div>)}
 *       </div>
 *     );
 *   }
 */

import { useCallback, useMemo } from 'react';
import { type SearchResult, useSearchStore } from '@/lib/store/search-store';

/** useSearch 返回值类型 */
export interface UseSearchReturn {
  /** 当前搜索关键词 */
  query: string;
  /** 搜索结果列表 */
  results: SearchResult[];
  /** 搜索面板是否展开 */
  isOpen: boolean;
  /** 是否正在搜索 */
  isLoading: boolean;
  /** 当前选中索引 */
  selectedIndex: number;
  /** 最近搜索关键词列表 */
  recentSearches: string[];

  /** 设置搜索关键词 */
  setQuery: (query: string) => void;
  /** 设置搜索结果 */
  setResults: (results: SearchResult[]) => void;
  /** 设置 loading 状态 */
  setLoading: (loading: boolean) => void;
  /** 打开搜索面板 */
  open: () => void;
  /** 关闭搜索面板 */
  close: () => void;
  /** 切换搜索面板可见性 */
  toggle: () => void;
  /** 添加最近搜索 */
  addRecentSearch: (query: string) => void;
  /** 清空最近搜索 */
  clearRecentSearches: () => void;
  /** 移动选中索引 */
  moveSelection: (direction: 'up' | 'down') => void;
  /** 重置选中索引 */
  resetSelection: () => void;
}

/**
 * useSearch Hook
 *
 * 实现说明：
 * - 分别订阅各字段，避免无关字段更新触发重渲染
 * - 方法通过 useCallback 包装，引用稳定
 *
 * @returns 搜索状态与方法集合
 */
export function useSearch(): UseSearchReturn {
  const query = useSearchStore((state) => state.query);
  const results = useSearchStore((state) => state.results);
  const isOpen = useSearchStore((state) => state.isOpen);
  const isLoading = useSearchStore((state) => state.isLoading);
  const selectedIndex = useSearchStore((state) => state.selectedIndex);
  const recentSearches = useSearchStore((state) => state.recentSearches);

  const setQueryAction = useSearchStore((state) => state.setQuery);
  const setResultsAction = useSearchStore((state) => state.setResults);
  const setLoadingAction = useSearchStore((state) => state.setLoading);
  const openAction = useSearchStore((state) => state.open);
  const closeAction = useSearchStore((state) => state.close);
  const toggleAction = useSearchStore((state) => state.toggle);
  const addRecentSearchAction = useSearchStore((state) => state.addRecentSearch);
  const clearRecentSearchesAction = useSearchStore((state) => state.clearRecentSearches);
  const moveSelectionAction = useSearchStore((state) => state.moveSelection);
  const resetSelectionAction = useSearchStore((state) => state.resetSelection);

  const setQuery = useCallback((q: string) => setQueryAction(q), [setQueryAction]);
  const setResults = useCallback((r: SearchResult[]) => setResultsAction(r), [setResultsAction]);
  const setLoading = useCallback((l: boolean) => setLoadingAction(l), [setLoadingAction]);
  const open = useCallback(() => openAction(), [openAction]);
  const close = useCallback(() => closeAction(), [closeAction]);
  const toggle = useCallback(() => toggleAction(), [toggleAction]);
  const addRecentSearch = useCallback(
    (q: string) => addRecentSearchAction(q),
    [addRecentSearchAction],
  );
  const clearRecentSearches = useCallback(
    () => clearRecentSearchesAction(),
    [clearRecentSearchesAction],
  );
  const moveSelection = useCallback(
    (d: 'up' | 'down') => moveSelectionAction(d),
    [moveSelectionAction],
  );
  const resetSelection = useCallback(() => resetSelectionAction(), [resetSelectionAction]);

  return useMemo(
    () => ({
      query,
      results,
      isOpen,
      isLoading,
      selectedIndex,
      recentSearches,
      setQuery,
      setResults,
      setLoading,
      open,
      close,
      toggle,
      addRecentSearch,
      clearRecentSearches,
      moveSelection,
      resetSelection,
    }),
    [
      query,
      results,
      isOpen,
      isLoading,
      selectedIndex,
      recentSearches,
      setQuery,
      setResults,
      setLoading,
      open,
      close,
      toggle,
      addRecentSearch,
      clearRecentSearches,
      moveSelection,
      resetSelection,
    ],
  );
}

export default useSearch;
