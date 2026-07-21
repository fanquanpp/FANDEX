/**
 * ModuleProgressList 模块完成度列表组件（React Island）
 *
 * 功能概述：
 * - 按完成度排序展示模块阅读进度
 * - 模块图标 / 名称 / 进度条 / 百分比 / 已读数 - 总数
 * - 按分类分组折叠展示（无 Collapsible 组件时使用 Motion 自实现）
 * - 完成度颜色分级：0% / 1-49% / 50-99% / 100%
 * - 集成 progress-store，订阅式响应式更新
 * - Motion 进度条增长动画 + stagger 列表入场
 *
 * 使用方式（Astro island）：
 *   <ModuleProgressList client:visible modules={MODULES} allDocIds={allDocIds} />
 *
 * 数据流：
 * 1. 组件订阅 progress-store 的 progress 字段
 * 2. 进度变化时按 docId 前缀匹配模块 ID，重新计算每个模块的完成度
 * 3. 按完成度降序排序，再按分类分组
 */

import { ChevronDown, CircleCheck, CircleDashed, CircleDot, Inbox } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/cn';
import { MODULE_CATEGORIES, type Module, type ModuleCategory } from '@/lib/modules';
import { useProgressStore } from '@/lib/store/progress-store';

/** ModuleProgressList 组件 Props 类型 */
export interface ModuleProgressListProps {
  /** 模块列表（必填，通常传入 MODULES） */
  modules: readonly Module[];
  /** 全站文档 ID 列表（用于计算每个模块的进度，可选） */
  allDocIds?: readonly string[];
  /** 是否按完成度排序（默认 true，false 时按模块原顺序） */
  sortByProgress?: boolean;
  /** 额外类名 */
  className?: string;
  /** 空状态文案 */
  emptyText?: string;
}

/** 模块进度项内部类型 */
interface ModuleProgressItem {
  /** 模块对象 */
  module: Module;
  /** 模块下文档总数 */
  total: number;
  /** 已读文档数 */
  read: number;
  /** 在读文档数 */
  reading: number;
  /** 完成百分比（0-100） */
  percent: number;
}

/** 分类分组内部类型 */
interface CategoryGroup {
  /** 分类对象 */
  category: ModuleCategory;
  /** 该分类下所有模块的进度项 */
  items: ModuleProgressItem[];
  /** 分类总体完成百分比 */
  totalPercent: number;
}

/** 完成度等级 */
type ProgressLevel = 'empty' | 'low' | 'mid' | 'done';

/**
 * 根据完成度获取等级
 *
 * - empty: 0%
 * - low: 1-49%
 * - mid: 50-99%
 * - done: 100%
 */
function getProgressLevel(percent: number): ProgressLevel {
  if (percent === 0) return 'empty';
  if (percent < 50) return 'low';
  if (percent < 100) return 'mid';
  return 'done';
}

/** 完成度等级对应的视觉样式 */
const LEVEL_STYLES: Record<
  ProgressLevel,
  { color: string; badgeClass: string; Icon: typeof CircleDashed }
> = {
  empty: {
    color: 'rgb(100 116 139)', // slate-500
    badgeClass: 'bg-muted text-muted-foreground',
    Icon: CircleDashed,
  },
  low: {
    color: 'rgb(249 115 22)', // orange-500
    badgeClass: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
    Icon: CircleDot,
  },
  mid: {
    color: 'rgb(59 130 246)', // blue-500
    badgeClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    Icon: CircleDot,
  },
  done: {
    color: 'rgb(16 185 129)', // emerald-500
    badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    Icon: CircleCheck,
  },
};

/**
 * ModuleProgressList 模块完成度列表组件
 *
 * @param props.modules - 模块列表
 * @param props.allDocIds - 全站文档 ID 列表
 * @param props.sortByProgress - 是否按完成度排序
 * @param props.className - 外部类名
 * @param props.emptyText - 空状态文案
 */
export function ModuleProgressList({
  modules,
  allDocIds,
  sortByProgress = true,
  className,
  emptyText = '暂无模块进度数据',
}: ModuleProgressListProps) {
  // 订阅 progress-store
  const progress = useProgressStore((state) => state.progress);
  const initialized = useProgressStore((state) => state.initialized);
  const initialize = useProgressStore((state) => state.initialize);

  // 组件挂载时确保 store 已初始化
  useEffect(() => {
    if (!initialized) {
      void initialize();
    }
  }, [initialized, initialize]);

  // 折叠状态：按分类 ID 记录，默认所有分类展开（空集合表示无折叠）
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(() => new Set());

  /** 切换分类折叠状态 */
  const toggleCategory = (categoryId: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  /** 全部展开 / 全部折叠 */
  const expandAll = () => setCollapsedCategories(new Set());
  const collapseAll = () => {
    setCollapsedCategories(new Set(MODULE_CATEGORIES.map((c) => c.id)));
  };

  /** 计算每个模块的进度项 */
  const items = useMemo<ModuleProgressItem[]>(() => {
    // 构建 moduleId → docIds 映射
    const docIdsByModule = new Map<string, string[]>();
    const allIds = allDocIds ?? Object.keys(progress);
    for (const docId of allIds) {
      const parts = docId.split('/');
      if (parts.length < 2) continue;
      const moduleId = `${parts[0]}/${parts[1]}`;
      const arr = docIdsByModule.get(moduleId);
      if (arr) arr.push(docId);
      else docIdsByModule.set(moduleId, [docId]);
    }

    return modules.map((module) => {
      const ids = docIdsByModule.get(module.id) ?? [];
      let read = 0;
      let reading = 0;
      for (const id of ids) {
        const status = progress[id];
        if (status === 'read') read++;
        else if (status === 'reading') reading++;
      }
      const total = ids.length;
      const percent = total === 0 ? 0 : Math.round((read / total) * 100);
      return { module, total, read, reading, percent };
    });
  }, [modules, progress, allDocIds]);

  /** 按分类分组 + 排序 */
  const groups = useMemo<CategoryGroup[]>(() => {
    return MODULE_CATEGORIES.map((category) => {
      // 该分类下的所有模块进度项
      let categoryItems = items.filter((item) => item.module.category === category.id);

      // 按完成度降序排序（可选）
      if (sortByProgress) {
        categoryItems = [...categoryItems].sort((a, b) => {
          if (b.percent !== a.percent) return b.percent - a.percent;
          return a.module.order - b.module.order;
        });
      } else {
        categoryItems = [...categoryItems].sort((a, b) => a.module.order - b.module.order);
      }

      // 分类总体完成度（基于所有模块的 read/total 求和）
      const totalRead = categoryItems.reduce((sum, item) => sum + item.read, 0);
      const totalDocs = categoryItems.reduce((sum, item) => sum + item.total, 0);
      const totalPercent = totalDocs === 0 ? 0 : Math.round((totalRead / totalDocs) * 100);

      return { category, items: categoryItems, totalPercent };
    }).filter((group) => group.items.length > 0);
  }, [items, sortByProgress]);

  // 整体统计
  const totalModules = items.length;
  const completedModules = items.filter((i) => i.percent === 100).length;
  const inProgressModules = items.filter((i) => i.percent > 0 && i.percent < 100).length;

  return (
    <div className={cn('module-progress-list space-y-4', className)}>
      {/* 顶部工具栏：统计 + 折叠按钮 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            共 <span className="font-medium text-foreground">{totalModules}</span> 个模块
          </span>
          <span className="text-border">|</span>
          <span className="flex items-center gap-1">
            <CircleCheck className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
            <span className="font-medium text-foreground">{completedModules}</span> 完成
          </span>
          <span className="text-border">|</span>
          <span className="flex items-center gap-1">
            <CircleDot className="h-3.5 w-3.5 text-blue-500" aria-hidden="true" />
            <span className="font-medium text-foreground">{inProgressModules}</span> 进行中
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={expandAll} className="h-7 text-xs">
            全部展开
          </Button>
          <Button variant="ghost" size="sm" onClick={collapseAll} className="h-7 text-xs">
            全部折叠
          </Button>
        </div>
      </div>

      {/* 空状态 */}
      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox className="h-12 w-12 text-muted-foreground/40 mb-3" aria-hidden="true" />
          <p className="text-sm font-medium">{emptyText}</p>
          <p className="mt-1 text-xs text-muted-foreground">开始阅读文档后，进度将自动记录</p>
        </div>
      ) : (
        /* 分类分组列表 */
        <div className="space-y-3">
          {groups.map((group, groupIndex) => {
            const isCollapsed = collapsedCategories.has(group.category.id);
            return (
              <motion.section
                key={group.category.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: groupIndex * 0.04, duration: 0.2 }}
                className="overflow-hidden rounded-lg border bg-card/50"
              >
                {/* 分类标题栏（可点击折叠） */}
                <button
                  type="button"
                  onClick={() => toggleCategory(group.category.id)}
                  className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-expanded={!isCollapsed}
                  aria-controls={`category-content-${group.category.id}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <motion.span
                      animate={{ rotate: isCollapsed ? -90 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-muted-foreground"
                      aria-hidden="true"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </motion.span>
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded text-xs font-medium"
                      style={{
                        backgroundColor: `${group.category.color}20`,
                        color: group.category.color,
                      }}
                      aria-hidden="true"
                    >
                      {group.category.icon}
                    </span>
                    <span className="font-medium text-sm">{group.category.name}</span>
                    <Badge variant="outline" className="text-[10px] font-normal h-4 px-1">
                      {group.items.length} 个模块
                    </Badge>
                  </div>
                  {/* 分类总体进度 */}
                  <div className="flex items-center gap-2.5 text-xs">
                    <div className="hidden sm:block w-32">
                      <Progress
                        value={group.totalPercent}
                        className="h-1.5"
                        style={
                          {
                            '--progress-color': group.category.color,
                          } as React.CSSProperties
                        }
                      />
                    </div>
                    <span className="tabular-nums font-medium text-foreground w-10 text-right">
                      {group.totalPercent}%
                    </span>
                  </div>
                </button>

                {/* 分类内容（AnimatePresence 折叠动画） */}
                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.div
                      id={`category-content-${group.category.id}`}
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <ul className="divide-y divide-border/60">
                        {group.items.map((item, itemIndex) => (
                          <ModuleProgressRow key={item.module.id} item={item} index={itemIndex} />
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.section>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * ModuleProgressRow 模块进度行（内部组件）
 *
 * @param props.item - 模块进度项
 * @param props.index - 列表索引（用于 stagger 动画延迟）
 */
function ModuleProgressRow({ item, index }: { item: ModuleProgressItem; index: number }) {
  const level = getProgressLevel(item.percent);
  const style = LEVEL_STYLES[level];
  const { Icon } = style;

  return (
    <motion.li
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.18 }}
      className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/30"
    >
      {/* 模块图标 + 名称 */}
      <a
        href={`/modules/${item.module.id}`}
        className="flex min-w-0 flex-1 items-center gap-2.5"
        title={item.module.description}
      >
        <span
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded text-xs"
          style={{
            backgroundColor: `${item.module.color}20`,
            color: item.module.color,
          }}
          aria-hidden="true"
        >
          {item.module.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium">{item.module.name}</span>
            <Icon
              className="h-3 w-3 flex-shrink-0"
              style={{ color: style.color }}
              aria-hidden="true"
            />
          </div>
          <p className="truncate text-xs text-muted-foreground">{item.module.description}</p>
        </div>
      </a>

      {/* 进度条 + 数值 */}
      <div className="flex flex-shrink-0 items-center gap-2.5" style={{ minWidth: 160 }}>
        <div className="flex-1">
          <Progress
            value={item.percent}
            className="h-1.5"
            style={
              {
                '--progress-color': style.color,
              } as React.CSSProperties
            }
          />
        </div>
        <span
          className="tabular-nums text-xs font-medium w-9 text-right"
          style={{ color: style.color }}
        >
          {item.percent}%
        </span>
        <span className="hidden md:inline tabular-nums text-xs text-muted-foreground w-12 text-right">
          {item.read}/{item.total}
        </span>
      </div>
    </motion.li>
  );
}

export default ModuleProgressList;
