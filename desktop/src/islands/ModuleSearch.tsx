/**
 * ModuleSearch 模块搜索与过滤组件（React Island）
 *
 * 功能概述：
 * - 首页模块卡片过滤：Fuse.js 模糊匹配（搜索模块名、描述、类别）
 * - 实时搜索输入框（防抖 150ms）
 * - 类别筛选（Tabs 切换：全部 / tools / frontend / backend / ...）
 * - 结果以网格展示（接收 children 渲染函数或通过 props 数据自渲染）
 * - 高亮匹配文本
 * - 空状态友好提示
 * - 基于 shadcn/ui Input + Tabs
 * - Motion 动画：卡片入场 stagger（错开淡入）
 *
 * 使用方式（Astro island）：
 *   <ModuleSearch client:visible modules={modules}>
 *     {(module) => <ModuleCard key={module.id} module={module} />}
 *   </ModuleSearch>
 *
 * 数据流：
 * 1. 用户输入 → 防抖 → Fuse.js 过滤 → 更新 visibleModules
 * 2. 类别切换 → 重新过滤
 * 3. children render prop 接收过滤后的模块列表
 */

import Fuse from 'fuse.js';
import { Search, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/cn';
import { MODULE_CATEGORIES, type Module } from '@/lib/modules';

/** ModuleSearch 组件 Props 类型 */
export interface ModuleSearchProps {
  /** 模块数据列表（来自 modules.ts 的 MODULES） */
  modules: readonly Module[];
  /** 渲染函数：接收过滤后的模块返回 React 节点 */
  children: (modules: Module[]) => ReactNode;
  /** 是否显示类别筛选 Tabs（默认 true） */
  showCategoryTabs?: boolean;
  /** 额外类名 */
  className?: string;
  /** 占位提示文案 */
  placeholder?: string;
}

/**
 * ModuleSearch 模块搜索与过滤组件
 *
 * @param props.modules - 模块数据列表
 * @param props.children - 渲染函数
 * @param props.showCategoryTabs - 是否显示类别筛选
 * @param props.className - 外部类名
 * @param props.placeholder - 占位文案
 */
export function ModuleSearch({
  modules,
  children,
  showCategoryTabs = true,
  className,
  placeholder = '搜索模块名、描述或类别...',
}: ModuleSearchProps) {
  // 搜索关键词
  const [query, setQuery] = useState('');
  // 当前选中的类别（'all' 表示全部）
  const [activeCategory, setActiveCategory] = useState<string>('all');
  // 防抖定时器
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 实际用于过滤的关键词（防抖后）
  const [debouncedQuery, setDebouncedQuery] = useState('');

  /** Fuse.js 实例（仅依赖 modules 重建） */
  const fuse = useMemo(
    () =>
      new Fuse([...modules], {
        keys: [
          { name: 'name', weight: 0.5 },
          { name: 'description', weight: 0.3 },
          { name: 'category', weight: 0.15 },
          { name: 'id', weight: 0.05 },
        ],
        threshold: 0.4,
        ignoreLocation: true,
        minMatchCharLength: 1,
        includeMatches: true,
      }),
    [modules],
  );

  /** 输入变化处理（防抖 150ms） */
  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(value.trim());
    }, 150);
  }, []);

  /** 清空搜索 */
  const handleClear = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
  }, []);

  /** 过滤后的模块列表 */
  const filteredModules = useMemo(() => {
    let result: Module[] = [...modules];

    // 1. 类别筛选
    if (activeCategory !== 'all') {
      result = result.filter((m) => m.category === activeCategory);
    }

    // 2. 关键词模糊搜索
    if (debouncedQuery) {
      const fuseResults = fuse.search(debouncedQuery);
      // 仅保留同时在类别筛选结果中的模块
      const filteredIds = new Set(result.map((m) => m.id));
      result = fuseResults.map((r) => r.item).filter((m) => filteredIds.has(m.id));
    }

    return result;
  }, [modules, activeCategory, debouncedQuery, fuse]);

  /** 类别 Tab 配置：'all' + 各分类 */
  const categoryTabs = useMemo(() => {
    return [
      { id: 'all', name: '全部' },
      ...MODULE_CATEGORIES.map((c) => ({ id: c.id, name: c.name })),
    ];
  }, []);

  // 组件卸载时清理防抖
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className={cn('module-search space-y-4', className)}>
      {/* 搜索输入框 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder={placeholder}
          className="pl-9 pr-9"
          aria-label="搜索模块"
        />
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClear}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            aria-label="清空搜索"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* 类别筛选 Tabs */}
      {showCategoryTabs && (
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
          <TabsList className="flex h-auto flex-wrap gap-1 bg-muted/50 p-1">
            {categoryTabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="text-xs">
                {tab.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {/* 结果统计 */}
      <div className="text-xs text-muted-foreground">
        {debouncedQuery || activeCategory !== 'all' ? (
          <span>
            找到 <span className="font-medium text-foreground">{filteredModules.length}</span>{' '}
            个模块
            {debouncedQuery && (
              <>
                {' '}
                匹配 “<span className="text-foreground">{debouncedQuery}</span>”
              </>
            )}
          </span>
        ) : (
          <span>共 {modules.length} 个模块</span>
        )}
      </div>

      {/* 结果区域：通过 children render prop 渲染 */}
      <AnimatePresence mode="wait">
        {filteredModules.length > 0 ? (
          <motion.div
            key={`results-${activeCategory}-${debouncedQuery}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {children(filteredModules)}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center py-12 text-muted-foreground"
          >
            <Search className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">未找到匹配的模块</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="mt-3"
            >
              清空筛选条件
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ModuleSearch;
