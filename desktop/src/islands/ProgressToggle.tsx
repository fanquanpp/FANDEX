/**
 * ProgressToggle 阅读进度切换组件（React Island）
 *
 * 功能概述：
 * - 三态切换按钮组：未读（unread）/ 在读（reading）/ 已读（read）
 * - 集成 use-progress hook（Phase 4），自动同步 progress-store
 * - 三种状态对应不同图标与配色：
 *   - 未读：Circle（灰色）
 *   - 在读：Clock（蓝色）
 *   - 已读：CheckCircle（绿色）
 * - 基于 shadcn/ui ToggleGroup 实现单选切换
 * - Motion 动画：状态切换时图标 spring 弹性反馈
 * - Tooltip 提示各状态语义
 *
 * 使用方式（Astro island）：
 *   <ProgressToggle client:load docId="frontend/javascript/概述" />
 *
 * 数据流：
 * 1. 用户点击 ToggleGroup 项 → 调用 useProgress().setProgress(status)
 * 2. progress-store 同步内存 + localStorage + IndexedDB + BroadcastChannel
 * 3. 组件订阅 store，自动重渲染为最新状态
 */

import { CheckCircle, Circle, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { useCallback, useMemo } from 'react';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useProgress } from '@/hooks/use-progress';
import { cn } from '@/lib/cn';
import type { ProgressStatus } from '@/lib/constants';

/** ProgressToggle 组件 Props 类型 */
export interface ProgressToggleProps {
  /** 文档 ID（必填，对应 content collection 的 entry id） */
  docId: string;
  /** 额外类名 */
  className?: string;
  /** 尺寸变体（默认 'default'） */
  size?: 'sm' | 'default' | 'lg';
  /** 是否显示文字标签（默认 false，仅图标） */
  showLabels?: boolean;
}

/** 进度状态配置：图标、配色、tooltip 文案 */
interface StatusConfig {
  /** 状态值 */
  value: ProgressStatus;
  /** 显示文案 */
  label: string;
  /** tooltip 文案 */
  tooltip: string;
  /** lucide 图标组件 */
  Icon: typeof Circle;
  /** 激活态的 Tailwind 类名（图标颜色 + 背景色） */
  activeClass: string;
  /** 默认（未激活）图标颜色 */
  idleIconClass: string;
}

/** 三态配置常量（避免每次渲染重新创建） */
const STATUS_CONFIGS: StatusConfig[] = [
  {
    value: 'unread',
    label: '未读',
    tooltip: '标记为未读',
    Icon: Circle,
    activeClass:
      'bg-muted text-muted-foreground hover:bg-muted/80 data-[state=on]:bg-muted data-[state=on]:text-muted-foreground',
    idleIconClass: 'text-muted-foreground',
  },
  {
    value: 'reading',
    label: '在读',
    tooltip: '标记为在读',
    Icon: Clock,
    activeClass:
      'bg-blue-500/15 text-blue-600 hover:bg-blue-500/25 data-[state=on]:bg-blue-500/20 data-[state=on]:text-blue-600 dark:text-blue-400 dark:data-[state=on]:text-blue-400',
    idleIconClass: 'text-blue-500/60',
  },
  {
    value: 'read',
    label: '已读',
    tooltip: '标记为已读',
    Icon: CheckCircle,
    activeClass:
      'bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 data-[state=on]:bg-emerald-500/20 data-[state=on]:text-emerald-600 dark:text-emerald-400 dark:data-[state=on]:text-emerald-400',
    idleIconClass: 'text-emerald-500/60',
  },
];

/** 尺寸映射：图标大小与高度 */
const SIZE_CLASSES: Record<
  NonNullable<ProgressToggleProps['size']>,
  { wrap: string; icon: string }
> = {
  sm: { wrap: 'h-7', icon: 'h-3.5 w-3.5' },
  default: { wrap: 'h-9', icon: 'h-4 w-4' },
  lg: { wrap: 'h-10', icon: 'h-5 w-5' },
};

/**
 * ProgressToggle 阅读进度切换组件
 *
 * @param props.docId - 文档 ID
 * @param props.className - 外部类名
 * @param props.size - 尺寸变体
 * @param props.showLabels - 是否显示文字标签
 */
export function ProgressToggle({
  docId,
  className,
  size = 'default',
  showLabels = false,
}: ProgressToggleProps) {
  const { status, setProgress } = useProgress(docId);
  const sizeClass = SIZE_CLASSES[size];

  /** 切换处理：点击已激活状态时不取消（保证始终有状态） */
  const handleValueChange = useCallback(
    (value: string) => {
      if (!value) return;
      setProgress(value as ProgressStatus);
    },
    [setProgress],
  );

  /** spring 动画配置（仅在状态切换时触发） */
  const springTransition = useMemo(
    () => ({ type: 'spring' as const, stiffness: 400, damping: 22 }),
    [],
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <ToggleGroup
          type="single"
          value={status}
          onValueChange={handleValueChange}
          className={cn('gap-1', className)}
          aria-label="阅读进度"
        >
          {STATUS_CONFIGS.map((config) => {
            const isActive = status === config.value;
            const { Icon } = config;
            return (
              <ToggleGroupItem
                key={config.value}
                value={config.value}
                aria-label={config.tooltip}
                className={cn(
                  'gap-1.5 px-2 rounded-md transition-colors',
                  sizeClass.wrap,
                  config.activeClass,
                )}
              >
                <motion.span
                  key={isActive ? `${config.value}-on` : `${config.value}-off`}
                  initial={{ scale: 0.6, opacity: 0.4 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={springTransition}
                  className="inline-flex"
                >
                  <Icon
                    className={cn(sizeClass.icon, !isActive && config.idleIconClass)}
                    aria-hidden="true"
                  />
                </motion.span>
                {showLabels && <span className="text-xs font-medium">{config.label}</span>}
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>
      </TooltipTrigger>
      <TooltipContent side="top">
        {STATUS_CONFIGS.find((c) => c.value === status)?.tooltip ?? '切换阅读进度'}
      </TooltipContent>
    </Tooltip>
  );
}

export default ProgressToggle;
