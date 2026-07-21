/**
 * useMounted Hook：组件挂载状态
 *
 * 功能概述：
 * - 用于防止 SSR/CSR 场景下的 hydration mismatch
 * - 返回 boolean，组件挂载后为 true
 * - 在 Astro + React 19 的水合场景中尤其重要
 * - 可用于条件渲染依赖客户端状态的内容
 *
 * 使用场景：
 * - 主题切换按钮（避免 SSR/CSR 主题状态不一致）
 * - localStorage 读取（SSR 时无法访问）
 * - 客户端专属 UI（如拖拽提示、动态尺寸）
 *
 * 使用示例：
 *   function ClientOnly() {
 *     const mounted = useMounted();
 *     if (!mounted) return null;
 *     return <div>{window.innerWidth}</div>;
 *   }
 *
 *   function ThemeToggle() {
 *     const mounted = useMounted();
 *     const { theme } = useTheme();
 *     // 服务端渲染图标占位，水合后显示真实图标
 *     return mounted ? <Icon name={theme === 'dark' ? 'moon' : 'sun'} /> : <IconPlaceholder />;
 *   }
 */

import { useEffect, useState } from 'react';

/**
 * useMounted Hook
 *
 * 实现说明：
 * - 使用 useState + useEffect 而非 useSyncExternalStore
 * - 原因：useEffect 仅在客户端执行，SSR 时直接返回 false
 * - 简单可靠，符合 React 19 的最佳实践
 *
 * @returns boolean - 组件是否已挂载（客户端首次渲染后为 true）
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // 仅在客户端执行，组件挂载后设置状态为 true
    setMounted(true);
  }, []);

  return mounted;
}

export default useMounted;
