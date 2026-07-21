/**
 * 术语提示运行时交互模块（Phase 5）
 *
 * 功能概述：
 * - 为文档中的术语节点（.term-tip[data-term]）绑定交互事件
 * - 桌面端：mouseenter 显示 popup 浮窗，mouseleave 隐藏
 * - 移动端：click 显示全屏 modal 弹窗
 * - 键盘：Enter/Space 触发对应交互
 * - 术语信息从 .term-tip 元素的 data 属性读取（data-term, data-module, data-def, data-slug）
 * - 性能优化：debounce、IntersectionObserver 懒加载、popup 复用
 *
 * 设计要点：
 * - 构建时由 remark-term-link 插件在 HTML 中嵌入 .term-tip 节点
 * - 运行时仅需绑定事件，无需扫描 DOM 或加载术语数据
 * - 桌面端 popup 元素复用（避免重复创建/销毁）
 * - 移动端 modal 每次创建新元素（确保状态干净）
 * - 提供 destroy() 方法移除所有事件监听（用于页面切换）
 *
 * 兼容性：
 * - 参考备份 `.fandex-backup/packages/search/term-tooltip.ts` 实现
 * - 增强点：debounce、IntersectionObserver 懒加载、destroy 清理
 *
 * 使用示例：
 *   import { initTermTooltip, destroyTermTooltip } from '@/lib/term-tooltip';
 *   initTermTooltip();
 *   // 页面切换时
 *   destroyTermTooltip();
 */

import { logger } from '@/lib/logger';
import { withBase } from '@/lib/url';

/** 移动端断点（与 CSS 媒体查询保持一致） */
const MOBILE_BREAKPOINT = 768;

/** popup 显示 debounce 延迟（毫秒） */
const POPUP_DEBOUNCE_MS = 100;

/** 当前活跃的 popup 元素（桌面端复用，避免重复创建） */
let activePopup: HTMLElement | null = null;

/** 当前关联的 term-tip 元素 */
let activeTip: HTMLElement | null = null;

/** 已绑定事件的 term-tip 元素集合（用于 destroy） */
const boundTips = new Set<HTMLElement>();

/** 已绑定的事件处理器引用（用于 destroy 时移除监听） */
const tipHandlers = new Map<
  HTMLElement,
  Array<{ type: string; handler: EventListenerOrEventListenerObject }>
>();

/** IntersectionObserver 实例（用于懒加载视口内术语） */
let lazyObserver: IntersectionObserver | null = null;

/** debounce 定时器 */
let debounceTimer: number | null = null;

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
 * 关闭术语详情弹窗（移动端）
 *
 * 实现说明：
 * - 移除弹窗 DOM 元素
 * - 恢复页面滚动
 */
function closeTermModal(): void {
  const existing = document.querySelector('.term-modal');
  if (existing) {
    existing.remove();
    document.body.style.overflow = '';
  }
}

/**
 * 显示术语详情弹窗（移动端）
 *
 * @param term - 术语名称
 * @param def - 术语定义
 * @param module - 术语所属模块 ID
 * @param slug - 术语页面 slug
 */
function showTermModal(term: string, def: string, _module: string, slug: string): void {
  closeTermModal();

  const modal = document.createElement('div');
  modal.className = 'term-modal';

  const overlay = document.createElement('div');
  overlay.className = 'term-modal-overlay';

  const content = document.createElement('div');
  content.className = 'term-modal-content';

  // 头部：术语名 + 关闭按钮
  const header = document.createElement('div');
  header.className = 'term-modal-header';

  const h3 = document.createElement('h3');
  h3.className = 'term-modal-title';
  h3.textContent = term;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'term-modal-close';
  closeBtn.setAttribute('aria-label', '关闭');
  closeBtn.textContent = '\u2715';

  header.appendChild(h3);
  header.appendChild(closeBtn);

  // 术语定义
  const defDiv = document.createElement('div');
  defDiv.className = 'term-modal-def';
  defDiv.textContent = def;

  // 查看详情链接
  const link = document.createElement('a');
  link.className = 'term-modal-link';
  link.href = withBase(`${slug}/`);
  link.textContent = '查看详情 \u2192';

  content.appendChild(header);
  content.appendChild(defDiv);
  content.appendChild(link);
  modal.appendChild(overlay);
  modal.appendChild(content);
  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';

  closeBtn.addEventListener('click', closeTermModal);
  overlay.addEventListener('click', (e: Event) => {
    if (e.target === overlay) closeTermModal();
  });

  // ESC 键关闭
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeTermModal();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

/**
 * 隐藏当前活跃的桌面端 popup
 */
function hidePopup(): void {
  if (activePopup) {
    activePopup.remove();
    activePopup = null;
  }
  activeTip = null;
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

/**
 * 为术语节点创建并显示桌面端 popup
 *
 * 实现说明：
 * - 若 popup 已显示且关联同一术语节点，不重复创建
 * - 隐藏之前的 popup
 * - 读取 data 属性获取术语信息
 * - 创建 popup DOM 元素并定位
 * - 绑定 mouseleave 事件
 *
 * @param tip - 术语节点元素（.term-tip）
 */
function showPopup(tip: HTMLElement): void {
  if (activeTip === tip) return;
  hidePopup();

  const _term = tip.dataset.term ?? '';
  const def = tip.dataset.def ?? '';
  const slug = tip.dataset.slug ?? '';

  const popup = document.createElement('span');
  popup.className = 'term-popup';

  const defSpan = document.createElement('span');
  defSpan.className = 'term-popup-def';
  defSpan.textContent = def;
  popup.appendChild(defSpan);

  const link = document.createElement('a');
  link.className = 'term-popup-link';
  link.href = withBase(`${slug}/`);
  link.textContent = '查看详情';
  popup.appendChild(link);

  tip.appendChild(popup);
  activePopup = popup;
  activeTip = tip;

  // 定位 popup（基于 .term-abbr 子元素的位置）
  const abbr = tip.querySelector<HTMLElement>('.term-abbr');
  if (abbr) {
    const rect = abbr.getBoundingClientRect();
    const popupWidth = Math.min(320, window.innerWidth - 16);
    let left = rect.left;
    let top = rect.bottom + 6;
    if (left + popupWidth > window.innerWidth - 8) {
      left = window.innerWidth - popupWidth - 8;
    }
    if (left < 8) left = 8;
    if (top + 200 > window.innerHeight) {
      top = rect.top - 6;
      popup.style.transform = 'translateY(-100%)';
    } else {
      popup.style.transform = '';
    }
    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
    popup.style.maxWidth = `${popupWidth}px`;
  }

  // 鼠标离开术语节点或 popup 时隐藏
  const hideHandler = (e: MouseEvent) => {
    const related = e.relatedTarget as HTMLElement | null;
    if (related && (related === popup || popup.contains(related))) return;
    if (related && (related === tip || tip.contains(related))) return;
    hidePopup();
    tip.removeEventListener('mouseleave', hideHandler);
    popup.removeEventListener('mouseleave', hideHandler);
  };
  tip.addEventListener('mouseleave', hideHandler);
  popup.addEventListener('mouseleave', hideHandler);
}

/**
 * 显示 popup（带 debounce）
 *
 * @param tip - 术语节点元素
 */
function showPopupDebounced(tip: HTMLElement): void {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = window.setTimeout(() => {
    showPopup(tip);
    debounceTimer = null;
  }, POPUP_DEBOUNCE_MS);
}

/**
 * 为单个 term-tip 元素绑定交互事件
 *
 * 实现说明：
 * - 根据设备类型绑定 hover 或 click 事件
 * - 桌面端：mouseenter 触发 debounced 显示
 * - 移动端：click 显示 modal
 * - 键盘：Enter/Space 触发对应交互
 *
 * @param tip - 术语节点元素
 */
function bindTipEvents(tip: HTMLElement): void {
  if (boundTips.has(tip)) return;

  const handlers: Array<{ type: string; handler: EventListenerOrEventListenerObject }> = [];

  if (isMobile()) {
    // 移动端：点击显示 modal
    tip.style.cursor = 'pointer';
    const clickHandler = ((e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      showTermModal(
        tip.dataset.term ?? '',
        tip.dataset.def ?? '',
        tip.dataset.module ?? '',
        tip.dataset.slug ?? '',
      );
    }) as EventListener;
    tip.addEventListener('click', clickHandler);
    handlers.push({ type: 'click', handler: clickHandler });
  } else {
    // 桌面端：悬停显示 popup（debounced）
    const mouseEnterHandler = (() => {
      showPopupDebounced(tip);
    }) as EventListener;
    tip.addEventListener('mouseenter', mouseEnterHandler);
    handlers.push({ type: 'mouseenter', handler: mouseEnterHandler });
  }

  // 键盘交互：Enter/Space 触发
  const keydownHandler = ((e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (isMobile()) {
        showTermModal(
          tip.dataset.term ?? '',
          tip.dataset.def ?? '',
          tip.dataset.module ?? '',
          tip.dataset.slug ?? '',
        );
      } else {
        showPopup(tip);
        // 键盘触发时短暂显示 popup 后自动隐藏
        if (activePopup) {
          activePopup.style.visibility = 'visible';
          activePopup.style.opacity = '1';
          setTimeout(() => {
            if (activePopup) {
              activePopup.style.visibility = '';
              activePopup.style.opacity = '';
            }
          }, 3000);
        }
      }
    }
  }) as EventListener;
  tip.addEventListener('keydown', keydownHandler);
  handlers.push({ type: 'keydown', handler: keydownHandler });

  tipHandlers.set(tip, handlers);
  boundTips.add(tip);
}

/**
 * 初始化术语提示交互
 *
 * 实现说明：
 * 1. 查找所有 .term-tip[data-term] 元素（构建时已标记）
 * 2. 使用 IntersectionObserver 懒加载：仅绑定进入视口的术语节点
 * 3. 对首屏术语节点立即绑定（避免初始可见性延迟）
 * 4. SSR 环境直接返回
 *
 * @param root - 查找根节点（默认 document.body）
 */
export function initTermTooltip(root: ParentNode = document.body): void {
  if (typeof window === 'undefined') return;

  const tips = root.querySelectorAll<HTMLElement>('.term-tip[data-term]');
  if (tips.length === 0) return;

  logger.debug(`[term-tooltip] found ${tips.length} term-tip elements`);

  // 创建 IntersectionObserver 实现懒加载
  if (typeof IntersectionObserver !== 'undefined') {
    lazyObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const tip = entry.target as HTMLElement;
            bindTipEvents(tip);
            lazyObserver?.unobserve(tip);
          }
        }
      },
      { rootMargin: '100px' },
    );

    tips.forEach((tip) => {
      lazyObserver?.observe(tip);
    });
  } else {
    // 降级：直接绑定所有术语节点
    tips.forEach((tip) => {
      bindTipEvents(tip);
    });
  }
}

/**
 * 销毁术语提示交互
 *
 * 实现说明：
 * - 移除所有已绑定的事件监听
 * - 清理 IntersectionObserver
 * - 隐藏活跃的 popup 与 modal
 * - 清空内部状态集合
 *
 * 使用场景：Astro View Transitions 切换页面时调用，避免内存泄漏
 */
export function destroyTermTooltip(): void {
  // 移除所有事件监听
  for (const [tip, handlers] of tipHandlers.entries()) {
    for (const { type, handler } of handlers) {
      tip.removeEventListener(type, handler);
    }
  }
  tipHandlers.clear();
  boundTips.clear();

  // 清理 Observer
  if (lazyObserver) {
    lazyObserver.disconnect();
    lazyObserver = null;
  }

  // 隐藏活跃的 popup 与 modal
  hidePopup();
  closeTermModal();

  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

export default {
  initTermTooltip,
  destroyTermTooltip,
};
