/**
 * RecentActivity 最近阅读活动时间线组件（React Island）
 *
 * 功能概述：
 * - 展示最近 N 篇阅读记录的时间线
 * - 每条记录显示：文档名 / 阅读状态 / 相对时间 / 所属模块标签
 * - 点击条目跳转到对应文档页
 * - 空状态友好提示（含 CTA 按钮）
 * - 集成 progress-store 的 recentDocs / lastReadAt / progress 字段
 * - Motion 时间线节点 + 条目 stagger 入场动画
 *
 * 使用方式（Astro island）：
 *   <RecentActivity client:visible limit={5} />
 *   <RecentActivity client:load limit={10} showModuleTag={true} />
 *
 * 数据流：
 * 1. 组件订阅 progress-store 的 recentDocs / lastReadAt / progress
 * 2. 任一字段变化时重新计算最近活动列表
 * 3. 用户点击条目跳转到 /docs/<docId>
 */

import { BookOpen, CheckCircle2, Clock, Eye, History, Inbox } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import type { ProgressStatus } from '@/lib/constants';
import { getModule } from '@/lib/modules';
import { useProgressStore } from '@/lib/store/progress-store';

/** RecentActivity 组件 Props 类型 */
export interface RecentActivityProps {
  /** 显示的最大条目数（默认 5） */
  limit?: number;
  /** 是否显示所属模块标签（默认 true） */
  showModuleTag?: boolean;
  /** 额外类名 */
  className?: string;
  /** 空状态时显示的 CTA 跳转链接（默认 '/modules'） */
  emptyCtaHref?: string;
  /** 空状态 CTA 文案（默认 '浏览模块'） */
  emptyCtaText?: string;
}

/** 最近活动条目内部类型 */
interface ActivityEntry {
  /** 文档 ID（如 frontend/javascript/概述） */
  docId: string;
  /** 最后阅读时间戳（毫秒） */
  timestamp: number;
  /** 阅读状态 */
  status: ProgressStatus;
  /** 文档标题（取自 docId 末段） */
  title: string;
  /** 所属模块 ID */
  moduleId: string | null;
  /** 所属模块名（若有） */
  moduleName: string | null;
  /** 所属模块颜色 */
  moduleColor: string | null;
}

/** 相对时间格式化（如 "刚刚"、"5 分钟前"、"3 天前"） */
function formatRelativeTime(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return '刚刚';
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`;
  // 超过 7 天显示日期
  const d = new Date(ts);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

/** 从 docId 中提取模块 ID（如 frontend/javascript/概述 → frontend/javascript） */
function extractModuleId(docId: string): string | null {
  const parts = docId.split('/');
  if (parts.length < 2) return null;
  return `${parts[0]}/${parts[1]}`;
}

/** 从 docId 末段提取标题 */
function extractTitle(docId: string): string {
  const parts = docId.split('/');
  const last = parts[parts.length - 1];
  // 将连字符替换为空格，首字母大写
  return last.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * RecentActivity 最近阅读活动时间线组件
 *
 * @param props.limit - 显示的最大条目数
 * @param props.showModuleTag - 是否显示所属模块标签
 * @param props.className - 外部类名
 * @param props.emptyCtaHref - 空状态 CTA 跳转链接
 * @param props.emptyCtaText - 空状态 CTA 文案
 */
export function RecentActivity({
  limit = 5,
  showModuleTag = true,
  className,
  emptyCtaHref = '/modules',
  emptyCtaText = '浏览模块',
}: RecentActivityProps) {
  // 订阅 progress-store
  const recentDocs = useProgressStore((state) => state.recentDocs);
  const lastReadAt = useProgressStore((state) => state.lastReadAt);
  const progress = useProgressStore((state) => state.progress);
  const initialized = useProgressStore((state) => state.initialized);
  const initialize = useProgressStore((state) => state.initialize);

  // 组件挂载时确保 store 已初始化
  useEffect(() => {
    if (!initialized) {
      void initialize();
    }
  }, [initialized, initialize]);

  /** 计算最近活动列表 */
  const entries = useMemo<ActivityEntry[]>(() => {
    const result: ActivityEntry[] = [];
    const maxCount = Math.min(limit, recentDocs.length);
    for (let i = 0; i < maxCount; i++) {
      const docId = recentDocs[i];
      const ts = lastReadAt[docId];
      if (ts === undefined) continue;
      const status = progress[docId] ?? 'unread';
      const moduleId = extractModuleId(docId);
      const module = moduleId ? getModule(moduleId) : undefined;

      result.push({
        docId,
        timestamp: ts,
        status,
        title: extractTitle(docId),
        moduleId,
        moduleName: module?.name ?? null,
        moduleColor: module?.color ?? null,
      });
    }
    return result;
  }, [recentDocs, lastReadAt, progress, limit]);

  // 空状态
  if (entries.length === 0) {
    return (
      <div
        className={cn(
          'recent-activity-empty flex flex-col items-center justify-center py-12 px-4 text-center',
          className,
        )}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="rounded-full bg-muted/50 p-4 mb-4"
        >
          <Inbox className="h-8 w-8 text-muted-foreground/60" aria-hidden="true" />
        </motion.div>
        <h3 className="text-base font-medium">暂无阅读记录</h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-xs">
          开始阅读文档后，这里将展示你最近浏览过的内容，方便快速回到上次阅读的位置。
        </p>
        <Button asChild variant="default" size="sm" className="mt-4">
          <a href={emptyCtaHref}>
            <BookOpen className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {emptyCtaText}
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('recent-activity', className)}>
      {/* 时间线头部 */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <History className="h-4 w-4" aria-hidden="true" />
          <span>最近 {entries.length} 篇阅读记录</span>
        </div>
      </div>

      {/* 时间线列表 */}
      <AnimatePresence initial={false} mode="popLayout">
        <ol className="relative space-y-1">
          {/* 时间线竖线 */}
          <div
            className="absolute left-[11px] top-3 bottom-3 w-px bg-gradient-to-b from-border via-border to-transparent"
            aria-hidden="true"
          />

          {entries.map((entry, index) => (
            <motion.li
              key={`${entry.docId}-${entry.timestamp}`}
              layout
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{
                delay: index * 0.04,
                duration: 0.2,
                layout: { duration: 0.2 },
              }}
            >
              <a
                href={`/docs/${entry.docId}`}
                className="group flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {/* 时间线节点 */}
                <span
                  className={cn(
                    'relative z-10 mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 border-background',
                    entry.status === 'read'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : entry.status === 'reading'
                        ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                        : 'bg-muted text-muted-foreground',
                  )}
                  aria-hidden="true"
                >
                  {entry.status === 'read' ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : entry.status === 'reading' ? (
                    <Clock className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </span>

                {/* 内容区 */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="truncate text-sm font-medium group-hover:text-primary transition-colors">
                      {entry.title}
                    </h4>
                    <time
                      dateTime={new Date(entry.timestamp).toISOString()}
                      className="flex-shrink-0 text-xs text-muted-foreground tabular-nums"
                    >
                      {formatRelativeTime(entry.timestamp)}
                    </time>
                  </div>

                  {/* 副信息行：模块标签 + 状态徽标 */}
                  <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                    {showModuleTag && entry.moduleName && entry.moduleColor && (
                      <Badge
                        variant="outline"
                        className="h-4 px-1.5 text-[10px] font-normal gap-1"
                        style={{
                          borderColor: `${entry.moduleColor}40`,
                          color: entry.moduleColor,
                        }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: entry.moduleColor }}
                          aria-hidden="true"
                        />
                        {entry.moduleName}
                      </Badge>
                    )}
                    <span className="text-[11px] text-muted-foreground truncate">
                      {entry.docId}
                    </span>
                  </div>
                </div>
              </a>
            </motion.li>
          ))}
        </ol>
      </AnimatePresence>

      {/* 底部：查看更多（当记录数超过 limit 时显示） */}
      {recentDocs.length > limit && (
        <div className="mt-3 pt-3 border-t border-border/60 text-center">
          <Button asChild variant="ghost" size="sm" className="text-xs">
            <a href="/dashboard/activity">
              查看全部 {recentDocs.length} 条记录
              <History className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}

export default RecentActivity;
