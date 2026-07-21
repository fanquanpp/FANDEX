/**
 * View Transitions 增强脚本（Phase 10）
 *
 * 功能概述：
 * - 页面过渡回调：astro:before-swap 事件中保留主题 class（核心：修复主题重置 bug）
 * - 过渡类型扩展：为不同导航类型添加 transition-name
 * - 系统主题监听：当用户未手动设置主题时跟随系统偏好
 *
 * 设计要点：
 * - 主题切换动画由 use-theme.ts 内部 startViewTransition 处理，本脚本不再负责
 * - 与 Astro ClientRouter 协作：astro:before-swap / astro:after-swap / astro:page-load 钩子
 * - 兼容 Tauri 环境：不依赖 window.location.origin
 * - 单一持久化路径：use-theme.ts 写纯字符串到 localStorage['fandex-theme']，
 *   BaseHead.astro FOUC 脚本读取纯字符串，本脚本不再持久化任何内容
 *
 * 使用方式：
 *   import '@/scripts/view-transitions'; // 自动初始化
 *   或 import { initViewTransitions } from '@/scripts/view-transitions';
 */

import { logger } from '@/lib/logger';

/** 主题 class（documentElement 上的暗色标记） */
const DARK_CLASS = 'dark';

/** localStorage 持久化键名（与 use-theme.ts、BaseHead.astro 共用） */
const THEME_STORAGE_KEY = 'fandex-theme';

/** transition-name 标记：返回导航 */
const TRANSITION_BACK = 'vt-back';

/** transition-name 标记：前进导航 */
const TRANSITION_FORWARD = 'vt-forward';

/** navigation 类型记录（用于判定前进 / 后退） */
interface NavigationRecord {
  url: string;
  timestamp: number;
}

/** 导航历史栈（最多保留 20 条，用于判定前进 / 后退） */
const navigationStack: NavigationRecord[] = [];

/** 导航栈最大长度 */
const NAV_STACK_MAX = 20;

/** 系统主题变化监听清理函数（模块级单例） */
let systemThemeCleanup: (() => void) | null = null;

/** 是否已初始化（避免重复绑定） */
let viewTransitionsInitialized = false;

/**
 * 初始化 Astro 页面过渡回调
 *
 * 实现说明：
 * - astro:before-swap：直接操作 event.newDocument.documentElement 保留主题 class
 *   （不再覆盖 event.swap，避免依赖未文档化的 Astro 内部 API）
 * - astro:after-swap：日志记录（主题监听由 use-theme.ts 的 MutationObserver 自动恢复）
 * - astro:before-preparation：根据导航类型设置 transition-name
 *
 * 兼容 Astro ClientRouter（Astro 7 替代旧版 ViewTransitions）
 */
function initAstroTransitionHooks(): void {
  if (viewTransitionsInitialized) return;
  viewTransitionsInitialized = true;

  /**
   * astro:before-swap：DOM 替换前保留主题 class
   *
   * 实现说明：
   * - 读取 swap 前的 documentElement class 与 colorScheme
   * - 直接应用到 event.newDocument.documentElement
   * - 新 document 进入 DOM 时即带有正确的 dark class，避免闪烁
   *
   * 注意：不覆盖 event.swap，让 Astro 执行默认的 swap 流程，
   *      仅在 swap 前预先设置 newDocument 的主题状态
   */
  document.addEventListener('astro:before-swap', (event) => {
    const beforeSwapTheme = document.documentElement.classList.contains(DARK_CLASS);
    const beforeSwapColorScheme = document.documentElement.style.colorScheme;

    const newDoc = (event as Event & { newDocument: Document }).newDocument;
    if (beforeSwapTheme) {
      newDoc.documentElement.classList.add(DARK_CLASS);
    } else {
      newDoc.documentElement.classList.remove(DARK_CLASS);
    }
    newDoc.documentElement.style.colorScheme = beforeSwapColorScheme;

    logger.debug(
      `[view-transitions] astro:before-swap preserved theme: ${beforeSwapTheme ? 'dark' : 'light'}`,
    );
  });

  /**
   * astro:after-swap：DOM 替换后日志记录
   *
   * 实现说明：
   * - 主题状态已在 before-swap 中应用到 newDocument
   * - use-theme.ts 的 MutationObserver 会自动重新绑定到新 document
   * - 无需在此重新初始化主题监听
   */
  document.addEventListener('astro:after-swap', () => {
    logger.debug('[view-transitions] astro:after-swap completed');
  });

  /**
   * astro:before-preparation：根据导航类型设置 transition-name
   *
   * 实现说明：
   * - 比较当前 URL 与历史栈，判定前进 / 后退
   * - 为 <main> 元素临时添加 transition-name
   * - astro:page-load 后清除
   */
  document.addEventListener('astro:before-preparation', (event) => {
    const navEvent = event as Event & {
      to: URL;
      from: URL;
      navigationType: NavigationType | 'push' | 'replace' | 'traverse';
    };

    const toUrl = navEvent.to?.pathname ?? '';
    const _fromUrl = navEvent.from?.pathname ?? '';

    // 判定前进 / 后退
    const isBack = isBackwardNavigation(toUrl);

    // 记录到导航栈
    pushNavigationStack(toUrl);

    // 为 <main> 元素临时添加 transition-name
    const main = document.getElementById('app-main');
    if (main) {
      main.style.viewTransitionName = isBack ? TRANSITION_BACK : TRANSITION_FORWARD;
    }
  });

  /**
   * astro:page-load：清除临时 transition-name
   */
  document.addEventListener('astro:page-load', () => {
    const main = document.getElementById('app-main');
    if (main) {
      main.style.viewTransitionName = '';
    }
  });
}

/**
 * 判定是否为后退导航
 *
 * 实现说明：
 * - 检查目标 URL 是否在导航栈中（且是当前 URL 的前一个）
 * - 若是则判定为后退
 *
 * @param targetUrl - 目标 URL
 * @returns 是否为后退导航
 */
function isBackwardNavigation(targetUrl: string): boolean {
  if (navigationStack.length < 2) return false;
  const currentIdx = navigationStack.length - 1;
  const prevRecord = navigationStack[currentIdx - 1];
  if (!prevRecord) return false;
  return prevRecord.url === targetUrl;
}

/**
 * 推入导航栈
 *
 * 实现说明：
 * - 限制栈最大长度，超出则丢弃最旧记录
 * - 记录 URL 与时间戳
 *
 * @param url - 导航目标 URL
 */
function pushNavigationStack(url: string): void {
  navigationStack.push({ url, timestamp: Date.now() });
  if (navigationStack.length > NAV_STACK_MAX) {
    navigationStack.shift();
  }
}

/**
 * 初始化系统主题监听
 *
 * 实现说明：
 * - 监听 prefers-color-scheme 变化
 * - 仅当用户未手动设置主题时（localStorage 无 'dark'/'light' 值）跟随系统
 * - 用户手动设置后，localStorage 有值，不再响应系统变化
 *
 * 与 BaseHead.astro FOUC 脚本协作：
 * - FOUC 脚本在页面加载时读取 localStorage，无值时跟随系统
 * - 本监听器在运行时跟随系统变化（仅当 localStorage 无值时）
 */
function initSystemThemeListener(): void {
  // 清理上一次监听
  if (systemThemeCleanup) {
    systemThemeCleanup();
    systemThemeCleanup = null;
  }

  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  /** 系统主题变化处理函数 */
  const handleChange = () => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      // 用户已手动设置主题（纯字符串 'dark' 或 'light'），不响应系统变化
      if (stored === 'dark' || stored === 'light') return;

      // 无用户偏好，跟随系统主题切换
      const isDark = mediaQuery.matches;
      const root = document.documentElement;
      if (isDark) {
        root.classList.add(DARK_CLASS);
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove(DARK_CLASS);
        root.style.colorScheme = 'light';
      }
    } catch {
      // localStorage 不可用时静默忽略
    }
  };

  mediaQuery.addEventListener('change', handleChange);
  systemThemeCleanup = () => {
    mediaQuery.removeEventListener('change', handleChange);
  };
}

/**
 * 执行 View Transitions 初始化
 *
 * 实现说明：
 * - 注册 Astro 页面过渡回调（保留主题 class）
 * - 初始化系统主题监听
 */
export function initViewTransitions(): void {
  if (typeof document === 'undefined') return;

  initAstroTransitionHooks();
  initSystemThemeListener();

  logger.debug('[view-transitions] view transitions initialized');
}

// 自动执行：脚本被 import 时立即初始化
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initViewTransitions, { once: true });
  } else {
    initViewTransitions();
  }
}

export default { initViewTransitions };
