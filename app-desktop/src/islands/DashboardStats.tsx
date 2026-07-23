/**
 * DashboardStats 仪表盘统计组件（React Island）
 *
 * 功能概述：
 * - 站点整体学习进度概览：环形 SVG 进度图 + 关键指标卡片
 * - 连续学习天数（Streak）展示，Motion 数字滚动动画
 * - 已读 / 在读 / 未读 三态统计
 * - 各模块完成度 Top N 概览（基于 docId 前缀匹配模块 ID）
 * - 最近阅读活动时间线（最近 5 篇）
 * - 集成 progress-store（订阅式响应式更新）
 *
 * 使用方式（Astro island）：
 *   <DashboardStats client:load allDocIds={allDocIds} />
 *   <DashboardStats client:load allDocIds={allDocIds} topModules={5} recentCount={5} />
 *
 * 数据流：
 * 1. 组件订阅 progress-store 的 progress / lastReadAt / recentDocs 字段
 * 2. 任一字段变化时重新计算统计指标
 * 3. Motion 数字动画在数值变化时触发滚动效果
 */

import {
  BookOpen,
  CheckCircle2,
  CircleDashed,
  Clock,
  Flame,
  History,
  TrendingUp,
} from 'lucide-react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/cn';
import type { ProgressStatus } from '@/lib/constants';
import { MODULES } from '@/lib/modules';
import { getStreakDays } from '@/lib/progress';
import { useProgressStore } from '@/lib/store/progress-store';

/** DashboardStats 组件 Props 类型 */
export interface DashboardStatsProps {
  /** 全站所有文档 ID 列表（用于计算总体进度） */
  allDocIds?: readonly string[];
  /** 显示模块完成度 Top N（默认 5） */
  topModules?: number;
  /** 最近活动展示数量（默认 5） */
  recentCount?: number;
  /** 额外类名 */
  className?: string;
  /** 是否显示"查看全部"链接（默认 true） */
  showViewAll?: boolean;
}

/** 模块进度统计内部类型 */
interface ModuleStat {
  /** 模块 ID */
  id: string;
  /** 模块名 */
  name: string;
  /** 模块图标 */
  icon: string;
  /** 模块主色 */
  color: string;
  /** 总文档数 */
  total: number;
  /** 已读文档数 */
  read: number;
  /** 完成百分比（0-100） */
  percent: number;
}

/** 最近活动项内部类型 */
interface ActivityItem {
  /** 文档 ID */
  docId: string;
  /** 最后阅读时间戳 */
  ts: number;
  /** 阅读状态 */
  status: ProgressStatus;
}

/** 环形进度图配置 */
const RING_SIZE = 144;
const RING_STROKE = 10;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

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
  // 超过 7 天显示具体日期
  const d = new Date(ts);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

/** 从 docId 中提取模块 ID（如 frontend/javascript/概述 → frontend/javascript） */
function extractModuleId(docId: string): string | null {
  const parts = docId.split('/');
  if (parts.length < 2) return null;
  return `${parts[0]}/${parts[1]}`;
}

/**
 * 动画数字 Hook：使用 Motion 实现数字滚动动画
 *
 * @param value - 目标数字
 * @returns MotionValue，可直接渲染到 DOM
 */
function useAnimatedNumber(value: number) {
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 120, damping: 20 });
  const display = useTransform(spring, (v) => Math.round(v));

  useEffect(() => {
    motionValue.set(value);
  }, [motionValue, value]);

  return display;
}

/**
 * DashboardStats 仪表盘统计组件
 *
 * @param props.allDocIds - 全站文档 ID 列表
 * @param props.topModules - 显示模块完成度 Top N
 * @param props.recentCount - 最近活动展示数量
 * @param props.className - 外部类名
 * @param props.showViewAll - 是否显示查看全部链接
 */
export function DashboardStats({
  allDocIds,
  topModules = 5,
  recentCount = 5,
  className,
  showViewAll = true,
}: DashboardStatsProps) {
  // 订阅 progress-store 的关键字段（响应式更新）
  const progress = useProgressStore((state) => state.progress);
  const lastReadAt = useProgressStore((state) => state.lastReadAt);
  const recentDocs = useProgressStore((state) => state.recentDocs);
  const initialized = useProgressStore((state) => state.initialized);
  const initialize = useProgressStore((state) => state.initialize);

  // 组件挂载时确保 store 已初始化
  useEffect(() => {
    if (!initialized) {
      void initialize();
    }
  }, [initialized, initialize]);

  // 客户端渲染标志（SSR 兼容）
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  /** 总体进度统计 */
  const overall = useMemo(() => {
    const docIds = allDocIds ?? Object.keys(progress);
    let read = 0;
    let reading = 0;
    let unread = 0;
    for (const docId of docIds) {
      const status = progress[docId] ?? 'unread';
      if (status === 'read') read++;
      else if (status === 'reading') reading++;
      else unread++;
    }
    const total = docIds.length;
    const percent = total === 0 ? 0 : Math.round((read / total) * 100);
    return { total, read, reading, unread, percent };
  }, [progress, allDocIds]);

  /** 连续学习天数（Streak） */
  const streak = useMemo(() => (mounted ? getStreakDays() : 0), [mounted, progress, lastReadAt]);

  /** 各模块完成度（基于 docId 前缀分组） */
  const moduleStats = useMemo<ModuleStat[]>(() => {
    const docIds = allDocIds ?? Object.keys(progress);
    // 按 moduleId 分组
    const groupByModule = new Map<string, string[]>();
    for (const docId of docIds) {
      const moduleId = extractModuleId(docId);
      if (!moduleId) continue;
      const arr = groupByModule.get(moduleId);
      if (arr) arr.push(docId);
      else groupByModule.set(moduleId, [docId]);
    }

    // 计算每个模块的进度
    const stats: ModuleStat[] = [];
    for (const [moduleId, ids] of groupByModule) {
      const module = MODULES.find((m) => m.id === moduleId);
      let read = 0;
      for (const id of ids) {
        if (progress[id] === 'read') read++;
      }
      const total = ids.length;
      const percent = total === 0 ? 0 : Math.round((read / total) * 100);
      stats.push({
        id: moduleId,
        name: module?.name ?? moduleId,
        icon: module?.icon ?? '◆',
        color: module?.color ?? '#4f5bd5',
        total,
        read,
        percent,
      });
    }

    // 按完成度降序，完成度相同的按模块名升序
    stats.sort((a, b) => {
      if (b.percent !== a.percent) return b.percent - a.percent;
      return a.name.localeCompare(b.name);
    });

    return stats;
  }, [progress, allDocIds]);

  /** 最近活动列表 */
  const recentActivity = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];
    const limit = Math.min(recentCount, recentDocs.length);
    for (let i = 0; i < limit; i++) {
      const docId = recentDocs[i];
      const ts = lastReadAt[docId];
      const status = progress[docId] ?? 'unread';
      if (ts !== undefined) {
        items.push({ docId, ts, status });
      }
    }
    return items;
  }, [recentDocs, lastReadAt, progress, recentCount]);

  // 动画数字
  const animatedPercent = useAnimatedNumber(overall.percent);
  const animatedRead = useAnimatedNumber(overall.read);
  const animatedReading = useAnimatedNumber(overall.reading);
  const animatedUnread = useAnimatedNumber(overall.unread);
  const animatedStreak = useAnimatedNumber(streak);

  // 环形进度图的 strokeDashoffset
  const ringOffset = RING_CIRCUMFERENCE - (overall.percent / 100) * RING_CIRCUMFERENCE;

  // 顶部模块
  const topModuleStats = moduleStats.slice(0, topModules);

  return (
    <div className={cn('dashboard-stats space-y-4', className)}>
      {/* 第一行：环形进度图 + 关键指标 */}
      <div className="grid gap-4 md:grid-cols-[auto_1fr] md:items-center">
        {/* 环形 SVG 进度图 */}
        <Card className="flex flex-col items-center justify-center p-6 md:w-56">
          <div className="relative" style={{ width: RING_SIZE, height: RING_SIZE }}>
            <svg
              width={RING_SIZE}
              height={RING_SIZE}
              viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
              className="-rotate-90"
              aria-label={`总体学习进度 ${overall.percent}%`}
              role="img"
            >
              {/* 背景圆环 */}
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                strokeWidth={RING_STROKE}
                className="stroke-muted"
              />
              {/* 进度圆环（动画过渡） */}
              <motion.circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                strokeWidth={RING_STROKE}
                strokeLinecap="round"
                className="stroke-primary"
                strokeDasharray={RING_CIRCUMFERENCE}
                initial={{ strokeDashoffset: RING_CIRCUMFERENCE }}
                animate={{ strokeDashoffset: ringOffset }}
                transition={{ type: 'spring', stiffness: 80, damping: 20 }}
              />
            </svg>
            {/* 中心数字 */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span className="text-3xl font-bold tabular-nums">
                <AnimatedNumber value={animatedPercent} />
                <span className="text-lg text-muted-foreground">%</span>
              </motion.span>
              <span className="text-xs text-muted-foreground mt-0.5">总体进度</span>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-sm">
            <Flame className="h-4 w-4 text-orange-500" aria-hidden="true" />
            <span className="text-muted-foreground">连续学习</span>
            <motion.span className="font-semibold tabular-nums">
              <AnimatedNumber value={animatedStreak} />
            </motion.span>
            <span className="text-muted-foreground">天</span>
          </div>
        </Card>

        {/* 三态统计卡片 */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            label="已读"
            value={animatedRead}
            icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden="true" />}
            tone="emerald"
          />
          <StatCard
            label="在读"
            value={animatedReading}
            icon={<Clock className="h-4 w-4 text-blue-500" aria-hidden="true" />}
            tone="blue"
          />
          <StatCard
            label="未读"
            value={animatedUnread}
            icon={<CircleDashed className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
            tone="muted"
          />
          {/* 总文档数提示 */}
          <div className="col-span-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              共记录 <span className="font-medium text-foreground">{overall.total}</span> 篇文档
            </span>
          </div>
        </div>
      </div>

      {/* 第二行：模块完成度概览 + 最近活动时间线 */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* 模块完成度概览 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4" aria-hidden="true" />
                模块完成度
              </CardTitle>
              {showViewAll && (
                <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
                  <a href="/dashboard/modules" aria-label="查看全部模块进度">
                    查看全部
                  </a>
                </Button>
              )}
            </div>
            <CardDescription className="text-xs">
              按完成度排序，展示前 {topModules} 个模块
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topModuleStats.length === 0 ? (
              <EmptyState
                icon={<BookOpen className="h-8 w-8" />}
                title="暂无学习记录"
                hint="开始阅读文档后，这里将展示模块完成度"
              />
            ) : (
              topModuleStats.map((stat, index) => (
                <motion.div
                  key={stat.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.06, duration: 0.2 }}
                  className="space-y-1.5"
                >
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-xs"
                        style={{ backgroundColor: `${stat.color}20`, color: stat.color }}
                        aria-hidden="true"
                      >
                        {stat.icon}
                      </span>
                      <span className="truncate font-medium">{stat.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="tabular-nums">
                        {stat.read}/{stat.total}
                      </span>
                      <span className="tabular-nums font-medium text-foreground">
                        {stat.percent}%
                      </span>
                    </div>
                  </div>
                  <Progress
                    value={stat.percent}
                    className="h-1.5"
                    style={
                      {
                        // 通过 CSS 变量覆盖进度条颜色
                        '--progress-color': stat.color,
                      } as React.CSSProperties
                    }
                  />
                </motion.div>
              ))
            )}
          </CardContent>
        </Card>

        {/* 最近活动时间线 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4" aria-hidden="true" />
                最近活动
              </CardTitle>
              {showViewAll && (
                <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
                  <a href="/dashboard/activity" aria-label="查看全部最近活动">
                    查看全部
                  </a>
                </Button>
              )}
            </div>
            <CardDescription className="text-xs">最近 {recentCount} 篇阅读记录</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <EmptyState
                icon={<History className="h-8 w-8" />}
                title="暂无阅读记录"
                hint="开始阅读文档后，这里将展示最近活动"
              />
            ) : (
              <ol className="relative space-y-3">
                {/* 时间线竖线 */}
                <div
                  className="absolute left-[7px] top-2 bottom-2 w-px bg-border"
                  aria-hidden="true"
                />
                {recentActivity.map((item, index) => (
                  <motion.li
                    key={`${item.docId}-${item.ts}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.2 }}
                    className="relative flex gap-3 pl-0"
                  >
                    {/* 时间线节点 */}
                    <span
                      className={cn(
                        'mt-1 h-3.5 w-3.5 flex-shrink-0 rounded-full border-2 border-background',
                        item.status === 'read'
                          ? 'bg-emerald-500'
                          : item.status === 'reading'
                            ? 'bg-blue-500'
                            : 'bg-muted-foreground/40',
                      )}
                      aria-hidden="true"
                    />
                    <div className="flex-1 min-w-0">
                      <a
                        href={`/docs/${item.docId}`}
                        className="block text-sm font-medium hover:text-primary transition-colors truncate"
                        title={item.docId}
                      >
                        {item.docId.split('/').pop()?.replace(/-/g, ' ') ?? item.docId}
                      </a>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(item.ts)}
                        </span>
                        <Badge variant="outline" className="h-4 px-1 text-[10px] font-normal">
                          {item.status === 'read'
                            ? '已读'
                            : item.status === 'reading'
                              ? '在读'
                              : '未读'}
                        </Badge>
                      </div>
                    </div>
                  </motion.li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * StatCard 单项统计卡片（内部组件）
 *
 * @param props.label - 标签文案
 * @param props.value - 数值（MotionValue）
 * @param props.icon - 图标
 * @param props.tone - 色调
 */
function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: ReturnType<typeof useAnimatedNumber>;
  icon: React.ReactNode;
  tone: 'emerald' | 'blue' | 'muted';
}) {
  const toneClasses: Record<typeof tone, string> = {
    emerald: 'border-emerald-500/20 bg-emerald-500/5',
    blue: 'border-blue-500/20 bg-blue-500/5',
    muted: 'border-border bg-muted/30',
  };
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border p-3 text-center',
        toneClasses[tone],
      )}
    >
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <motion.span className="mt-1 text-2xl font-bold tabular-nums">
        <AnimatedNumber value={value} />
      </motion.span>
    </div>
  );
}

/**
 * AnimatedNumber 渲染 MotionValue 数字（内部组件）
 *
 * 使用 useTransform 提取 rounded 字符串，再通过 motion.span 渲染。
 *
 * @param props.value - MotionValue<number>
 */
function AnimatedNumber({ value }: { value: ReturnType<typeof useAnimatedNumber> }) {
  return <motion.span>{value}</motion.span>;
}

/**
 * EmptyState 空状态展示（内部组件）
 */
function EmptyState({ icon, title, hint }: { icon: React.ReactNode; title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="text-muted-foreground/40 mb-3">{icon}</div>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

export default DashboardStats;
