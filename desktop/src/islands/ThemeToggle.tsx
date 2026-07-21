/**
 * ThemeToggle 主题切换按钮（React Island）
 *
 * 功能概述：
 * - 亮/暗主题切换按钮，集成 use-theme hook
 * - 集成 View Transitions API 实现平滑主题切换（由 useTheme 内部处理）
 * - 使用 Motion（motion/react）实现太阳/月亮图标的 spring 物理切换动画
 * - 使用 lucide-react 的 Sun / Moon 图标
 * - 基于 shadcn/ui Button + Tooltip 组件
 * - 完整的无障碍支持：aria-label、键盘聚焦环、tooltip 提示
 *
 * 使用方式（Astro island）：
 *   <ThemeToggle client:load />
 *
 * 或在 React 中直接使用：
 *   import { ThemeToggle } from '@/islands/ThemeToggle';
 */

import { Moon, Sun } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTheme } from '@/hooks/use-theme';

/** ThemeToggle 组件 Props 类型 */
export interface ThemeToggleProps {
  /** 额外类名（用于定制按钮尺寸/位置） */
  className?: string;
  /** Tooltip 显示位置（默认 'top'） */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** 是否显示 tooltip（默认 true） */
  showTooltip?: boolean;
}

/**
 * ThemeToggle 主题切换按钮组件
 *
 * 实现细节：
 * 1. 通过 useTheme 读取当前主题并调用 toggleTheme
 * 2. AnimatePresence + mode='wait' 确保旧图标退场后再渲染新图标
 * 3. spring 物理动画（stiffness 300, damping 25）模拟自然弹性切换
 * 4. rotate + scale 组合动画强化视觉反馈
 * 5. Tooltip 提示当前操作含义（"切换到暗色/亮色模式"）
 *
 * @param props.className - 外部类名
 * @param props.side - tooltip 位置
 * @param props.showTooltip - 是否显示 tooltip
 */
export function ThemeToggle({ className, side = 'top', showTooltip = true }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  /** tooltip 文本：根据当前主题描述"将切换到的目标主题" */
  const tooltipText = isDark ? '切换到亮色模式' : '切换到暗色模式';
  /** aria-label：与 tooltip 一致，确保屏幕阅读器友好 */
  const ariaLabel = isDark ? '切换到亮色模式' : '切换到暗色模式';

  /** Motion spring 配置：弹性自然，避免过度回弹 */
  const springTransition = useMemo(
    () => ({ type: 'spring' as const, stiffness: 300, damping: 25 }),
    [],
  );

  /** 触发器元素：包裹 Button 以承载 Tooltip */
  const trigger = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={className}
      aria-label={ariaLabel}
      aria-pressed={isDark}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.span
            key="moon"
            initial={{ rotate: -90, scale: 0.4, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 90, scale: 0.4, opacity: 0 }}
            transition={springTransition}
            className="inline-flex"
            aria-hidden="true"
          >
            <Moon className="h-[1.2rem] w-[1.2rem]" />
          </motion.span>
        ) : (
          <motion.span
            key="sun"
            initial={{ rotate: 90, scale: 0.4, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: -90, scale: 0.4, opacity: 0 }}
            transition={springTransition}
            className="inline-flex"
            aria-hidden="true"
          >
            <Sun className="h-[1.2rem] w-[1.2rem]" />
          </motion.span>
        )}
      </AnimatePresence>
    </Button>
  );

  // 未启用 tooltip 时直接返回按钮
  if (!showTooltip) return trigger;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{trigger}</TooltipTrigger>
      <TooltipContent side={side}>{tooltipText}</TooltipContent>
    </Tooltip>
  );
}

export default ThemeToggle;
