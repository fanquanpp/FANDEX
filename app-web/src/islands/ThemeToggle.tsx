/**
 * 主题切换组件 (ThemeToggle)
 * ========================
 * 功能概述：
 * - 在亮色(light)和暗色(dark)模式之间切换
 * - 主题状态持久化到 localStorage（键名: fandex-theme），刷新页面后保持用户选择
 * - 首次访问时跟随系统偏好（prefers-color-scheme）
 * - SSR 阶段渲染不可见占位按钮（保留布局空间避免 CLS），
 *   客户端挂载后填充实际图标，避免水合后布局偏移
 *
 * 动效体系（纯 CSS，零运行时依赖）：
 * - 日/月双图标常驻叠放，通过 is-visible 类切换
 * - 透明度 + 旋转过渡由 ThemeToggle.css 驱动（200ms ease-out）
 * - prefers-reduced-motion 下动画自动关闭（见 ThemeToggle.css）
 * - 历史说明：曾使用 Motion React（whileTap/AnimatePresence）驱动图标动画，
 *   为摘除全站关键路径上的 motion 运行时改为纯 CSS 实现，交互效果不变
 *
 * 数据流：
 * - 挂载时从 localStorage 读取已保存的主题，无保存值时检测系统偏好
 * - 切换时同步更新：theme(state) → document.documentElement data-theme 属性 → localStorage
 * - 通过 data-theme 属性驱动全局 CSS 变量切换（在全局样式中定义）
 *
 * 使用场景：
 * - 放置在页面顶部导航栏，作为全局主题控制入口
 * - 配合 Astro 群岛架构，仅客户端交互
 */
import { useState, useEffect, useCallback } from 'react';
import { getSavedTheme, prefersDarkMode, setTheme as persistTheme, type Theme } from '@/lib/theme';
import '@/styles/islands/ThemeToggle.css';

/**
 * 组件 props 接口
 * ThemeToggle 无外部 props，定义空接口以保持组件接口一致性
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- 岛屿约定保留空接口：Record<string, never> 会拒绝 Astro 的 client:* 属性传递
interface ThemeToggleProps {}

/** 太阳图标（暗色模式下显示，提示可切换到亮色） */
function SunIcon({ visible }: { visible: boolean }) {
  return (
    <svg
      className={`fndx-theme-icon${visible ? ' is-visible' : ''}`}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

/** 月亮图标（亮色模式下显示，提示可切换到暗色） */
function MoonIcon({ visible }: { visible: boolean }) {
  return (
    <svg
      className={`fndx-theme-icon fndx-theme-icon--moon${visible ? ' is-visible' : ''}`}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

/**
 * 主题切换组件
 * 在亮色与暗色模式间切换，状态持久化到 localStorage
 */
export function ThemeToggle(_props: ThemeToggleProps) {
  /**
   * 当前主题状态：'light' 亮色 | 'dark' 暗色
   * 初始值为 'light'，在 useEffect 中根据 localStorage 或系统偏好修正
   */
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  /**
   * 是否已完成客户端挂载
   * 用于控制图标的可见性：
   * - SSR 阶段渲染透明占位按钮（保留 32x32 布局空间，CLS=0）
   * - 客户端挂载后通过 opacity 平滑显示图标
   */
  const [mounted, setMounted] = useState(false);

  /**
   * 组件挂载后的初始化逻辑
   * 1. 标记已挂载，触发图标淡入
   * 2. 从 localStorage 读取用户保存的主题偏好
   * 3. 如果没有保存值，则检测系统暗色模式偏好
   * 4. 根据结果设置 theme 值，并同步刷新 data-theme 属性与 colorScheme
   *    （作为 BaseLayout 初始化脚本的二次保险：当组件被重新挂载、
   *    或初始化脚本因故未执行时，确保 data-theme 始终处于显式声明状态，
   *    避免 tokens.css 的 :root:not([data-theme]) 兜底逻辑误覆盖用户选择）
   */
  useEffect(() => {
    // 通过统一主题模块读取已保存的主题偏好，无保存值时跟随系统
    const saved = getSavedTheme();
    const initial: Theme = saved ?? (prefersDarkMode() ? 'dark' : 'light');
    // SSR 下无法在 useState 初始化器读 localStorage，两段式初始化是必要模式（豁免 set-state-in-effect）
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(initial);
    // 同步显式声明 data-theme，消除"无属性"中间态
    // 作为 BaseLayout 内联脚本的二次保险（FOUC 四层防护 · 第四层）
    document.documentElement.setAttribute('data-theme', initial);
    document.documentElement.style.colorScheme = initial;
    // 下一帧标记挂载完成，触发 opacity 过渡（避免初始渲染闪烁）
    const rafId = requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, []);

  /**
   * 切换主题并持久化到 localStorage
   *
   * 实现说明：
   * - 直接调用 persistTheme 同步更新 DOM data-theme 属性与 localStorage
   * - CSS 变量即时切换，CSS 过渡驱动图标旋转交叉淡入淡出提供视觉过渡
   */
  const toggle = useCallback(() => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    persistTheme(next);
    setTheme(next);
  }, [theme]);

  return (
    /*
     * 始终渲染按钮以保留布局空间（避免水合后 CLS）：
     * - SSR 阶段：按钮透明不可点击（mounted=false）
     * - 客户端挂载后：opacity 过渡到 1，pointer-events 启用
     * - 悬停/按下微交互由 .fndx-icon-btn 统一 CSS 驱动（与全站图标按钮一致）
     */
    <button
      type="button"
      className={`fndx-theme-toggle fndx-icon-btn${mounted ? ' fndx-theme-toggle--ready' : ''}`}
      onClick={mounted ? toggle : undefined}
      data-tooltip={theme === 'dark' ? '亮色模式' : '暗色模式'}
      data-tooltip-pos="bottom"
      aria-label={theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'}
      tabIndex={mounted ? 0 : -1}
      aria-hidden={!mounted}
    >
      {/* 暗色模式下显示太阳图标（提示用户可切换到亮色） */}
      <SunIcon visible={mounted && theme === 'dark'} />
      {/* 亮色模式下显示月亮图标（提示用户可切换到暗色） */}
      <MoonIcon visible={mounted && theme === 'light'} />
    </button>
  );
}

export default ThemeToggle;
