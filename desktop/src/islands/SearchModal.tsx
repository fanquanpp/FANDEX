/**
 * SearchModal 全局搜索命令面板（React Island）
 *
 * 功能概述：
 * - Ctrl+K 触发的 Command Palette 命令面板
 * - 集成 search-store（Phase 4）管理搜索状态
 * - 双层搜索：Pagefind 全文索引（生产构建产物）+ Fuse.js 模糊匹配（运行时降级）
 * - 完整键盘导航：↑↓ 选择、Enter 跳转、Esc 关闭、Ctrl+K 切换
 * - 搜索结果按模块分组显示，支持匹配高亮
 * - 显示最近搜索记录（持久化于 search-store）
 * - 基于 shadcn/ui CommandDialog（cmdk）+ Dialog 实现
 * - Motion 弹窗淡入 + 缩放动画
 *
 * 使用方式（Astro island）：
 *   <SearchModal client:load />
 *
 * 数据流：
 * 1. 用户输入 → search-store.setQuery
 * 2. 防抖（200ms）触发 search-store.setLoading(true)
 * 3. 优先尝试 Pagefind 全文搜索；不可用时降级为 Fuse.js 本地索引
 * 4. 结果通过 search-store.setResults 写入，自动按 module 字段分组渲染
 * 5. Enter 跳转到选中结果的 URL，并记录到 recentSearches
 */

import { Clock, FileText, Search, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { useSearch } from '@/hooks/use-search';
import { useShortcut } from '@/lib/keyboard';
import { logger } from '@/lib/logger';
import type { SearchResult } from '@/lib/store/search-store';

/** SearchModal 组件 Props 类型 */
export interface SearchModalProps {
  /** 额外类名 */
  className?: string;
}

/** Pagefind 模块类型（运行时动态加载，类型宽松） */
interface PagefindModule {
  search: (query: string) => Promise<{
    results: Array<{
      id: string;
      data: () => Promise<{
        url: string;
        excerpt: string;
        meta: {
          title: string;
          [key: string]: string;
        };
        sub_results?: Array<{
          title: string;
          url: string;
          excerpt: string;
        }>;
      }>;
    }>;
  }>;
}

/** Pagefind 单例缓存（避免重复加载） */
let pagefindInstance: PagefindModule | null = null;
/** Pagefind 加载失败标志 */
let pagefindLoadFailed = false;

/**
 * 异步加载 Pagefind 索引（生产构建后存在于 /pagefind/ 目录）
 *
 * 实现说明：
 * - 仅在浏览器环境且未加载失败时尝试加载
 * - 失败时设置标志位，后续不再重试，统一降级到 Fuse.js
 * - 通过 Vite 的 /* @vite-ignore *\/ 注释避免构建时尝试解析该路径
 *
 * @returns Pagefind 模块，加载失败返回 null
 */
async function loadPagefind(): Promise<PagefindModule | null> {
  if (typeof window === 'undefined') return null;
  if (pagefindInstance) return pagefindInstance;
  if (pagefindLoadFailed) return null;

  try {
    // @vite-ignore 避免构建期处理该动态路径
    const mod = (await import(
      /* @vite-ignore */ '/pagefind/pagefind.js'
    )) as unknown as PagefindModule & {
      init?: () => Promise<void>;
    };
    if (typeof mod.init === 'function') {
      await mod.init();
    }
    pagefindInstance = mod;
    return mod;
  } catch (err) {
    logger.warn('[search-modal] Pagefind not available, fallback to Fuse.js:', err);
    pagefindLoadFailed = true;
    return null;
  }
}

/**
 * 调用 Pagefind 执行全文搜索
 *
 * @param query - 搜索关键词
 * @returns 搜索结果数组（已映射为 SearchResult 类型）
 */
async function searchWithPagefind(query: string): Promise<SearchResult[]> {
  const pagefind = await loadPagefind();
  if (!pagefind) return [];

  try {
    const response = await pagefind.search(query);
    const limit = response.results.slice(0, 20);
    const mapped = await Promise.all(
      limit.map(async (item) => {
        const data = await item.data();
        return {
          id: item.id,
          title: data.meta?.title ?? data.url,
          description: data.excerpt?.replace(/<[^>]+>/g, '').slice(0, 160),
          url: data.url,
          module: data.meta?.module,
          slug: data.url,
          type: 'doc' as const,
          score: 1,
        } satisfies SearchResult;
      }),
    );
    return mapped;
  } catch (err) {
    logger.error('[search-modal] Pagefind search failed:', err);
    return [];
  }
}

/**
 * 渲染高亮文本（在匹配位置包裹 <mark>）
 *
 * @param text - 原始文本
 * @param query - 搜索关键词
 * @returns React 节点（含高亮标记）
 */
function renderHighlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  // 转义正则特殊字符
  const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${safeQuery})`, 'ig');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-yellow-200/70 dark:bg-yellow-500/40 rounded px-0.5 text-inherit">
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

/**
 * SearchModal 全局搜索命令面板组件
 *
 * @param props.className - 外部类名
 */
export function SearchModal({ className }: SearchModalProps) {
  // 通过 useSearch hook 集成 search-store
  const {
    query,
    results,
    isOpen,
    isLoading,
    recentSearches,
    setQuery,
    setResults,
    setLoading,
    open,
    close,
    addRecentSearch,
    clearRecentSearches,
  } = useSearch();

  // 本地搜索索引（Fuse.js 降级路径用，懒加载）
  const [fuseIndex, setFuseIndex] = useState<SearchResult[] | null>(null);
  // 防抖定时器引用
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** 关闭搜索面板 */
  const handleClose = useCallback(() => {
    close();
  }, [close]);

  /** 跳转到搜索结果对应的 URL */
  const handleNavigate = useCallback(
    (result: SearchResult) => {
      const targetUrl = result.url ?? (result.slug ? `/${result.slug}` : undefined);
      if (!targetUrl) return;
      // 记录到 recentSearches
      if (query.trim()) {
        addRecentSearch(query.trim());
      }
      // 延迟跳转以便状态写入持久化
      setTimeout(() => {
        window.location.href = targetUrl;
      }, 50);
    },
    [query, addRecentSearch],
  );

  /** 执行搜索（Pagefind 优先，Fuse.js 降级） */
  const performSearch = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // 优先使用 Pagefind
        const pfResults = await searchWithPagefind(trimmed);
        if (pfResults.length > 0) {
          setResults(pfResults);
          return;
        }

        // 降级到 Fuse.js 本地索引
        if (fuseIndex && fuseIndex.length > 0) {
          const Fuse = (await import('fuse.js')).default;
          const fuse = new Fuse(fuseIndex, {
            keys: [
              { name: 'title', weight: 0.6 },
              { name: 'description', weight: 0.25 },
              { name: 'module', weight: 0.15 },
            ],
            threshold: 0.4,
            ignoreLocation: true,
            minMatchCharLength: 2,
          });
          const fuseResults = fuse.search(trimmed).slice(0, 20);
          setResults(fuseResults.map((r) => r.item));
          return;
        }

        // 两种索引都不可用，返回空结果
        setResults([]);
      } catch (err) {
        logger.error('[search-modal] search failed:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [fuseIndex, setResults, setLoading],
  );

  /** 输入变化处理：防抖 200ms 后执行搜索 */
  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        void performSearch(value);
      }, 200);
    },
    [setQuery, performSearch],
  );

  // 组件挂载时尝试加载本地搜索索引（作为 Pagefind 降级方案）
  useEffect(() => {
    if (fuseIndex) return;
    void (async () => {
      try {
        const res = await fetch('/search-index.json');
        if (res.ok) {
          const data = (await res.json()) as SearchResult[];
          if (Array.isArray(data)) {
            setFuseIndex(data);
          }
        }
      } catch {
        // 静默失败，仅作为降级方案
      }
    })();
  }, [fuseIndex]);

  // 组件卸载时清理防抖定时器
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // 注册 Ctrl+K 全局快捷键
  useShortcut('ctrl+k', open, [open]);
  useShortcut('meta+k', open, [open]);

  // 按模块分组结果
  const groupedResults = useMemo(() => {
    const groups = new Map<string, SearchResult[]>();
    for (const r of results) {
      const key = r.module ?? '其他';
      const list = groups.get(key) ?? [];
      list.push(r);
      groups.set(key, list);
    }
    return Array.from(groups.entries());
  }, [results]);

  return (
    <>
      {/* 隐藏的触发按钮：仅作为可选触发点，主入口为 Ctrl+K 快捷键 */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={open}
        className={`gap-2 ${className ?? ''}`}
        aria-label="打开搜索"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">搜索文档</span>
        <CommandShortcut>Ctrl+K</CommandShortcut>
      </Button>

      <CommandDialog open={isOpen} onOpenChange={(v) => (v ? open() : handleClose())}>
        <Command shouldFilter={false} className="max-h-[80vh]">
          <CommandInput
            placeholder="搜索文档、术语、速查表..."
            value={query}
            onValueChange={handleQueryChange}
          />
          <CommandList>
            <CommandEmpty>
              {isLoading ? '搜索中...' : query.trim() ? '未找到相关结果' : '输入关键词开始搜索'}
            </CommandEmpty>

            {/* 最近搜索（仅在无输入时显示） */}
            {!query.trim() && recentSearches.length > 0 && (
              <CommandGroup heading="最近搜索">
                {recentSearches.slice(0, 5).map((s) => (
                  <CommandItem
                    key={`recent-${s}`}
                    value={`recent-${s}`}
                    onSelect={() => {
                      setQuery(s);
                      void performSearch(s);
                    }}
                  >
                    <Clock className="h-4 w-4 opacity-60" />
                    <span className="flex-1 truncate">{s}</span>
                  </CommandItem>
                ))}
                <CommandSeparator />
                <CommandItem
                  value="__clear_recent__"
                  onSelect={() => clearRecentSearches()}
                  className="text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                  <span>清空最近搜索</span>
                </CommandItem>
              </CommandGroup>
            )}

            {/* 搜索结果按模块分组 */}
            {query.trim() && groupedResults.length > 0 && (
              <AnimatePresence>
                {groupedResults.map(([moduleName, items]) => (
                  <motion.div
                    key={`group-${moduleName}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    <CommandGroup heading={moduleName}>
                      {items.map((r) => (
                        <CommandItem key={r.id} value={r.id} onSelect={() => handleNavigate(r)}>
                          <FileText className="h-4 w-4 opacity-70" />
                          <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                            <span className="truncate text-sm font-medium">
                              {renderHighlight(r.title, query)}
                            </span>
                            {r.description && (
                              <span className="truncate text-xs text-muted-foreground">
                                {renderHighlight(r.description, query)}
                              </span>
                            )}
                          </div>
                          <Badge variant="outline" className="ml-2 shrink-0">
                            {r.type === 'doc' ? '文档' : r.type === 'glossary' ? '术语' : '速查'}
                          </Badge>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}

export default SearchModal;
