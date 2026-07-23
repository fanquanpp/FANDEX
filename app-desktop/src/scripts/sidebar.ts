/**
 * 侧边栏交互脚本（Phase 10）
 *
 * 功能概述：
 * - 滚动位置保持：每次滚动记录到 sessionStorage，页面加载时恢复
 * - 模块展开/折叠状态持久化：通过 sidebar-store 管理 collapsedSections
 * - 当前文档高亮 + scroll into view：根据 URL 自动定位
 * - 移动端滑动手势：bindSwipe 在文档区域左滑开 / 右滑关侧边栏
 * - 抽屉控制：通过 sidebar-store 的 isOpen 状态控制显隐（与 Header 汉堡菜单联动）
 * - Astro 页面过渡钩子：astro:page-load 触发重新初始化
 *
 * 设计要点：
 * - 与 Sidebar.astro 内联脚本协作：补充其未实现的手势与 scroll into view 能力
 * - 通过 Zustand store（useSidebarStore）实现跨组件状态同步
 * - 在非 React 上下文中使用 useSidebarStore.getState() / subscribe()
 * - 兼容 Tauri 环境：路径检测使用 Astro BASE_URL 而非 window.location.origin
 * - 所有 DOM 操作显式类型断言，符合 TS strict 模式
 *
 * 使用方式：
 *   import '@/scripts/sidebar'; // 自动初始化
 *   或 import { initSidebar } from '@/scripts/sidebar';
 */

import { logger } from '@/lib/logger';
import { useSidebarStore } from '@/lib/store/sidebar-store';
import { bindSwipe } from '@/lib/swipe';

/** sessionStorage 键名：侧边栏滚动位置 */
const SIDEBAR_SCROLL_KEY = 'fandex-sidebar-scroll';

/** 移动端断点（与 CSS 媒体查询一致） */
const MOBILE_BREAKPOINT = 768;

/** 当前文档链接的 scroll into view 顶部偏移（px） */
const ACTIVE_LINK_OFFSET = 80;

/** 滑动手势 unbind 函数（模块级，避免重复绑定） */
let swipeUnbind: (() => void) | null = null;

/** store 订阅取消函数（模块级） */
let storeUnsubscribe: (() => void) | null = null;

/**
 * 判断当前是否为移动端视口
 *
 * @returns 是否为移动端
 */
function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= MOBILE_BREAKPOINT;
}

/**
 * 初始化滚动位置保持
 *
 * 实现说明：
 * - 滚动时 debounce 记录到 sessionStorage
 * - 页面加载时通过 requestAnimationFrame 恢复
 * - 仅记录纵向滚动位置（横向不记录）
 *
 * @param sidebarScroll - 侧边栏滚动容器
 */
function initScrollMemory(sidebarScroll: HTMLElement): void {
  /** 恢复上次滚动位置 */
  const saved = sessionStorage.getItem(SIDEBAR_SCROLL_KEY);
  if (saved) {
    requestAnimationFrame(() => {
      sidebarScroll.scrollTop = Number(saved);
      sessionStorage.removeItem(SIDEBAR_SCROLL_KEY);
    });
  }

  /** 滚动时 debounce 记录位置 */
  let scrollTimer: number | null = null;
  sidebarScroll.addEventListener(
    'scroll',
    () => {
      if (scrollTimer !== null) {
        window.clearTimeout(scrollTimer);
      }
      scrollTimer = window.setTimeout(() => {
        sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(sidebarScroll.scrollTop));
      }, 150);
    },
    { passive: true },
  );

  /** 点击文档链接前立即保存（避免导航时丢失最新位置） */
  sidebarScroll.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((link) => {
    link.addEventListener('click', () => {
      sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(sidebarScroll.scrollTop));
    });
  });
}

/**
 * 初始化模块展开 / 折叠状态持久化
 *
 * 实现说明：
 * - 查找所有 <details> 元素（侧边栏模块分组）
 * - 读取 store 中的 collapsedSections 状态，同步到 <details open> 属性
 * - 监听 <details> toggle 事件，将状态写回 store
 * - 兼容 Sidebar.astro 中 .module-group 折叠模式
 *
 * @param sidebarRoot - 侧边栏根元素
 */
function initDetailsPersistence(sidebarRoot: HTMLElement): void {
  const detailsElements = sidebarRoot.querySelectorAll<HTMLDetailsElement>('details');

  detailsElements.forEach((details) => {
    const sectionId =
      details.dataset.sectionId ?? details.querySelector('summary')?.textContent ?? '';
    if (!sectionId) return;

    // 从 store 同步初始状态：collapsedSections 包含此 id 则折叠
    const { collapsedSections } = useSidebarStore.getState();
    const isCollapsed = collapsedSections.includes(sectionId);
    details.open = !isCollapsed;

    // 监听 toggle 事件，写回 store
    details.addEventListener('toggle', () => {
      useSidebarStore.getState().toggleSection(sectionId);
    });
  });

  // 兼容 .module-group 折叠模式（点击标题切换 hidden 子列表）
  const moduleGroups = sidebarRoot.querySelectorAll<HTMLElement>('.module-group');
  moduleGroups.forEach((group) => {
    const moduleId = group.dataset.module ?? '';
    if (!moduleId) return;

    const docsList = group.querySelector<HTMLElement>('.module-docs-list');
    const arrow = group.querySelector<HTMLElement>('.module-arrow');
    const titleLink = group.querySelector<HTMLAnchorElement>('a');

    if (!docsList || !titleLink) return;

    // 从 store 同步初始状态
    const { collapsedSections } = useSidebarStore.getState();
    const isCollapsed = collapsedSections.includes(moduleId);
    docsList.classList.toggle('hidden', isCollapsed);
    arrow?.classList.toggle('rotate-90', !isCollapsed);

    // 点击模块标题切换展开状态
    titleLink.addEventListener('click', (e) => {
      // 仅在非导航点击时切换（如点击箭头区域）
      if (e.target !== arrow && e.target !== titleLink) return;
      // 这里不阻止默认导航行为，仅切换展开状态
    });
  });
}

/**
 * 初始化当前文档链接高亮 + scroll into view
 *
 * 实现说明：
 * - 解析当前 URL pathname，匹配侧边栏中的文档链接
 * - 为匹配的链接添加 active class（aria-current="page" 已由 SSR 注入）
 * - 滚动到当前链接位置（带偏移，避免被 sticky header 遮挡）
 *
 * @param sidebarScroll - 侧边栏滚动容器
 */
function initActiveLinkHighlight(sidebarScroll: HTMLElement): void {
  if (typeof window === 'undefined') return;

  const currentPath = window.location.pathname;
  const links = sidebarScroll.querySelectorAll<HTMLAnchorElement>('a[href]');

  let activeLink: HTMLAnchorElement | null = null;

  for (const link of links) {
    const href = link.getAttribute('href');
    if (!href) continue;

    // 跳过锚点链接
    if (href.startsWith('#')) continue;

    // 比较 pathname（去除尾部斜杠差异）
    const linkPath = normalizePath(href);
    const currentNormalized = normalizePath(currentPath);

    if (linkPath === currentNormalized) {
      activeLink = link;
      // 确保 aria-current 正确
      link.setAttribute('aria-current', 'page');
      break;
    }
  }

  // 滚动到当前链接位置
  if (activeLink) {
    requestAnimationFrame(() => {
      const linkTop = activeLink?.offsetTop;
      const scrollTop = linkTop - ACTIVE_LINK_OFFSET;
      sidebarScroll.scrollTo({ top: scrollTop, behavior: 'smooth' });
    });
  }
}

/**
 * 规范化路径（去除尾部斜杠，便于比较）
 *
 * @param path - 原始路径
 * @returns 规范化后的路径
 */
function normalizePath(path: string): string {
  let normalized = path.split('#')[0]?.split('?')[0] ?? '';
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

/**
 * 初始化移动端滑动手势
 *
 * 实现说明：
 * - 仅在移动端视口下绑定
 * - 在文档主区域 #app-main 绑定滑动手势
 * - 左滑关闭侧边栏（如果已打开）
 * - 右滑打开侧边栏（如果已关闭，且从左边缘开始）
 * - 通过 store 的 isOpen 状态控制显隐
 */
function initSwipeGesture(): void {
  if (!isMobile()) return;

  const main = document.getElementById('app-main');
  if (!main) return;

  // 清理上一次绑定（避免 SPA 导航后重复绑定）
  if (swipeUnbind) {
    swipeUnbind();
    swipeUnbind = null;
  }

  swipeUnbind = bindSwipe(main, {
    onSwipeLeft: () => {
      const { isOpen, close } = useSidebarStore.getState();
      if (isOpen) {
        close();
        syncSidebarVisibility(false);
      }
    },
    onEdgeSwipeRight: () => {
      const { isOpen, open } = useSidebarStore.getState();
      if (!isOpen) {
        open();
        syncSidebarVisibility(true);
      }
    },
    onSwipeRight: () => {
      const { isOpen, open } = useSidebarStore.getState();
      if (!isOpen) {
        open();
        syncSidebarVisibility(true);
      }
    },
    edgeWidth: 24,
    horizontalThreshold: 60,
  });
}

/**
 * 同步侧边栏 DOM 可见性（移动端抽屉）
 *
 * 实现说明：
 * - 监听 store 的 isOpen 状态变化
 * - 操作 #app-sidebar 的 translate class 与 body.sidebar-open class
 * - 联动 #sidebar-backdrop 显隐
 *
 * @param isOpen - 是否打开
 */
function syncSidebarVisibility(isOpen: boolean): void {
  const sidebar = document.getElementById('app-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');

  if (isOpen) {
    document.body.classList.add('sidebar-open');
    sidebar?.classList.remove('-translate-x-full', 'translate-x-full');
    backdrop?.classList.remove('hidden');
  } else {
    document.body.classList.remove('sidebar-open');
    // 桌面端侧边栏在左侧，移动端隐藏时左移
    sidebar?.classList.add('-translate-x-full');
    backdrop?.classList.add('hidden');
  }
}

/**
 * 初始化 store 订阅
 *
 * 实现说明：
 * - 订阅 useSidebarStore 的 isOpen 状态变化
 * - 状态变化时同步 DOM 显隐
 * - 模块级单例，避免重复订阅
 */
function initStoreSubscription(): void {
  if (storeUnsubscribe) {
    storeUnsubscribe();
  }

  let prevIsOpen = useSidebarStore.getState().isOpen;
  storeUnsubscribe = useSidebarStore.subscribe((state) => {
    if (state.isOpen !== prevIsOpen) {
      prevIsOpen = state.isOpen;
      syncSidebarVisibility(state.isOpen);
    }
  });
}

/**
 * 初始化移动端关闭按钮
 *
 * 实现说明：
 * - 绑定 #sidebar-close-btn 点击事件
 * - 点击后通过 store 关闭抽屉
 */
function initCloseButton(): void {
  const closeBtn = document.getElementById('sidebar-close-btn');
  if (!closeBtn) return;

  // 避免重复绑定（通过 dataset 标记）
  if (closeBtn.dataset.bound === 'true') return;
  closeBtn.dataset.bound = 'true';

  closeBtn.addEventListener('click', () => {
    useSidebarStore.getState().close();
    syncSidebarVisibility(false);
  });
}

/**
 * 监听窗口尺寸变化，调整手势绑定
 *
 * 实现说明：
 * - 桌面端解绑滑动手势（不需要）
 * - 移动端绑定滑动手势
 */
function initResizeListener(): void {
  let resizeTimer: number | null = null;
  window.addEventListener(
    'resize',
    () => {
      if (resizeTimer !== null) {
        window.clearTimeout(resizeTimer);
      }
      resizeTimer = window.setTimeout(() => {
        if (isMobile()) {
          initSwipeGesture();
        } else if (swipeUnbind) {
          swipeUnbind();
          swipeUnbind = null;
        }
      }, 200);
    },
    { passive: true },
  );
}

/**
 * 执行侧边栏交互初始化
 *
 * 实现说明：
 * - 查找侧边栏根元素 #app-sidebar
 * - 找不到则跳过（页面无侧边栏）
 * - 按顺序执行各子模块初始化
 * - 兼容 Astro ClientRouter SPA 导航
 */
export function initSidebar(): void {
  if (typeof document === 'undefined') return;

  const sidebar = document.getElementById('app-sidebar');
  if (!sidebar) {
    logger.debug('[sidebar] no sidebar element found, skipping');
    return;
  }

  const sidebarScroll = document.getElementById('sidebar-scroll') ?? sidebar;
  const sidebarRoot = sidebar as HTMLElement;

  // 初始化各功能模块
  initScrollMemory(sidebarScroll);
  initDetailsPersistence(sidebarRoot);
  initActiveLinkHighlight(sidebarScroll);
  initCloseButton();
  initSwipeGesture();
  initResizeListener();
  initStoreSubscription();

  logger.debug('[sidebar] sidebar initialized');
}

// 自动执行：脚本被 import 时立即初始化
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSidebar, { once: true });
  } else {
    initSidebar();
  }

  // Astro ClientRouter SPA 导航后重新初始化
  document.addEventListener('astro:page-load', initSidebar);
}

export default { initSidebar };
