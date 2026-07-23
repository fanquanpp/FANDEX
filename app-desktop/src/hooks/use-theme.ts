/**
 * useTheme Hook：主题切换
 *
 * 功能概述：
 * - 使用 React 19 useSyncExternalStore 实现主题状态同步
 * - 监听 document.documentElement.classList 的 .dark class 变化
 * - 通过 localStorage 持久化用户偏好（key: 'fandex-theme'）
 * - 集成 View Transitions API（如浏览器支持）实现平滑主题切换
 * - 返回当前主题、设置主题、切换主题方法
 *
 * 与 Layout.astro 中 is:inline 脚本协作：
 * - Layout 在页面渲染前已读取 localStorage 并应用 .dark class
 * - 本 hook 仅在客户端水合后接管主题状态管理
 *
 * 使用示例：
 *   function ThemeToggle() {
 *     const { theme, toggleTheme } = useTheme();
 *     return <button onClick={toggleTheme}>{theme === 'dark' ? '🌙' : '☀️'}</button>;
 *   }
 */

import { useCallback, useSyncExternalStore } from 'react';

/** 主题类型 */
type Theme = 'light' | 'dark';

/** localStorage 持久化键名 */
const STORAGE_KEY = 'fandex-theme';

/**
 * 从 document.documentElement.classList 读取当前主题
 *
 * @returns 当前主题（'light' 或 'dark'）
 */
function getThemeFromDom(): Theme {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

/**
 * 服务端快照：SSR 时无法访问 document，默认返回 'light'
 * 与客户端首次渲染保持一致，避免 hydration mismatch
 */
function getServerSnapshot(): Theme {
  return 'light';
}

/**
 * 订阅主题变化：监听 .dark class 的添加/移除
 * 通过 MutationObserver 监听 class 属性变化
 *
 * @param callback - 主题变化时的回调函数
 * @returns 取消订阅函数
 */
function subscribe(callback: () => void): () => void {
  if (typeof document === 'undefined') return () => {};

  // 监听 document.documentElement 的 class 属性变化
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.attributeName === 'class') {
        callback();
        return;
      }
    }
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });

  // 同时监听 localStorage 跨标签页变化
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  window.addEventListener('storage', handleStorage);

  return () => {
    observer.disconnect();
    window.removeEventListener('storage', handleStorage);
  };
}

/** useTheme 返回值类型 */
interface UseThemeReturn {
  /** 当前主题 */
  theme: Theme;
  /** 设置主题（会持久化到 localStorage 并应用 .dark class） */
  setTheme: (theme: Theme) => void;
  /** 切换主题（light ↔ dark） */
  toggleTheme: () => void;
}

/**
 * useTheme Hook
 *
 * 实现细节：
 * 1. 使用 useSyncExternalStore 订阅 DOM class 变化
 * 2. setTheme 通过 document.startViewTransition 实现平滑过渡
 * 3. 通过 localStorage 持久化用户偏好
 *
 * @returns { theme, setTheme, toggleTheme }
 */
export function useTheme(): UseThemeReturn {
  // 使用 useSyncExternalStore 同步外部 DOM 状态
  const theme = useSyncExternalStore(subscribe, getThemeFromDom, getServerSnapshot);

  /**
   * 应用主题到 DOM 与 localStorage
   *
   * @param newTheme - 目标主题
   */
  const applyTheme = useCallback((newTheme: Theme) => {
    const root = document.documentElement;
    const isDark = newTheme === 'dark';

    // 使用 View Transitions API 实现平滑切换（如浏览器支持）
    const applyChanges = () => {
      if (isDark) {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
      }
      // 持久化到 localStorage
      try {
        localStorage.setItem(STORAGE_KEY, newTheme);
      } catch {
        // localStorage 不可用时静默忽略
      }
    };

    // 检查 View Transitions API 支持
    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
      document.startViewTransition(applyChanges);
    } else {
      applyChanges();
    }
  }, []);

  /**
   * 设置指定主题
   */
  const setTheme = useCallback(
    (newTheme: Theme) => {
      applyTheme(newTheme);
    },
    [applyTheme],
  );

  /**
   * 切换主题（light ↔ dark）
   */
  const toggleTheme = useCallback(() => {
    const current = getThemeFromDom();
    applyTheme(current === 'dark' ? 'light' : 'dark');
  }, [applyTheme]);

  return { theme, setTheme, toggleTheme };
}

export default useTheme;
