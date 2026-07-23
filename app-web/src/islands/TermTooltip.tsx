/**
 * 术语悬浮提示组件 (TermTooltip)
 * ===============================
 * 功能概述：
 * - 全页单例岛屿（client:load），通过事件委托统一管理文档中所有术语触发元素
 * - remark 插件（src/plugins/remark-term-tooltip.ts）扫描 markdown 文本节点，
 *   将命中的术语包裹为 <span class="term-tooltip-trigger" data-term="...">...</span>
 * - 本组件挂载后扫描这些触发元素，附加交互：
 *   * 桌面端（matchMedia 检测 hover 能力）：hover 触发自定义定位 Tooltip，debounce 200ms 显示
 *     Tooltip 视觉风格与 shadcn-vue Tooltip 对齐（elevated 背景、阴影、圆角、淡入动画）
 *     内容含术语、英文、词源、定义、参考链接
 *   * 移动端（touch 设备）：点击触发 shadcn-vue Dialog，展示完整释义
 * - 数据来源：通过 @services/glossary-service 的同步 lookup() API 读取
 *   shd-shared/metadata/glossary/ 共享元数据，无运行期网络请求
 *
 * 设计说明：
 * - 桌面端不使用 radix-vue Tooltip 的原因是触发元素由 remark 注入、不在 Vue 组件树中，
 *   radix-vue TooltipTrigger 要求真实子元素。改用自定义定位 Tooltip 实现等效视觉与交互。
 * - 移动端 Dialog 由本组件受控开关，shadcn-vue Dialog 完美契合此场景。
 *
 * 三层架构：
 * - UI 层（本组件）：交互、状态、视觉呈现
 * - Service 层：glossary-service.ts 的 lookup() 函数
 * - Data 层：shd-shared/metadata/glossary/ 共享元数据
 *
 * 使用方式：
 * - 在 Layout.astro 中通过 client:load 水合一次（全页单例）
 * - 由 remark 插件自动注入触发元素，无需手动编写 <TermTooltip>
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/ui/components';
import { lookup } from '@/services/glossary-service';
import type { GlossaryEntry } from '@/types/glossary';
import { ExternalLink } from 'lucide-react';
import '@/styles/islands/TermTooltip.css';

// ============================================================================
// 常量
// ============================================================================

/** hover 触发的 debounce 延迟（毫秒），避免鼠标快速滑过时闪烁 */
const HOVER_DEBOUNCE_MS = 200;

/** 触发元素选择器（与 remark 插件输出的 HTML 结构对齐） */
const TRIGGER_SELECTOR = '.term-tooltip-trigger';

/** Tooltip 最大宽度（像素） */
const TOOLTIP_MAX_WIDTH = 360;

/** Tooltip 与触发元素的间距（像素） */
const TOOLTIP_GAP = 8;

/** Tooltip 视口边距（像素，避免溢出屏幕） */
const TOOLTIP_VIEWPORT_MARGIN = 8;

/** Tooltip 定位样式接口 */
interface TooltipStyle {
  top: string;
  left: string;
  maxWidth: string;
}

/** 触发元素事件处理器集合 */
interface TriggerHandlers {
  enter: (e: Event) => void;
  leave: (e: Event) => void;
  click: (e: Event) => void;
  focus: (e: Event) => void;
  blur: (e: Event) => void;
}

export function TermTooltip() {
  // ============================================================================
  // 响应式状态
  // ============================================================================

  /** 当前 hover 显示的术语条目（用于 Tooltip 内容） */
  const [activeEntry, setActiveEntry] = useState<GlossaryEntry | null>(null);

  /** Tooltip 是否可见 */
  const [tooltipVisible, setTooltipVisible] = useState<boolean>(false);

  /** Tooltip 定位样式（top/left，单位 px） */
  const [tooltipStyle, setTooltipStyle] = useState<TooltipStyle>({
    top: '0px',
    left: '0px',
    maxWidth: TOOLTIP_MAX_WIDTH + 'px',
  });

  /** Tooltip 是否在触发元素上方（默认在下方，空间不足时翻转到上方） */
  const [tooltipPlacement, setTooltipPlacement] = useState<'bottom' | 'top'>('bottom');

  /** 当前 Dialog 打开状态（移动端使用） */
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);

  /** Dialog 中展示的术语条目 */
  const [dialogEntry, setDialogEntry] = useState<GlossaryEntry | null>(null);

  /** 是否为触摸设备（决定走 hover 还是 click 路径） */
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(false);

  // ============================================================================
  // 内部状态（非响应式，使用 useRef）
  // ============================================================================

  /** debounce 定时器句柄 */
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** 当前 hover 中的触发元素 */
  const currentTriggerElRef = useRef<HTMLElement | null>(null);

  /** MutationObserver 实例（监听 DOM 变化以处理视图切换后的新触发元素） */
  const observerRef = useRef<MutationObserver | null>(null);

  /** 触发元素 -> 事件处理器映射，便于卸载时精确移除 */
  const triggerHandlersRef = useRef<Map<HTMLElement, TriggerHandlers>>(new Map());

  /** isTouchDevice 的 ref 镜像，便于事件处理器读取最新值（避免 stale closure） */
  const isTouchDeviceRef = useRef<boolean>(false);
  useEffect(() => {
    isTouchDeviceRef.current = isTouchDevice;
  }, [isTouchDevice]);

  // ============================================================================
  // 计算属性
  // ============================================================================

  /** Dialog 标题 */
  const dialogTitleText = useMemo<string>(() => dialogEntry?.term ?? '术语详情', [dialogEntry]);

  /** Dialog 副标题（英文） */
  const dialogEnglish = useMemo<string>(() => dialogEntry?.english ?? '', [dialogEntry]);

  // ============================================================================
  // 设备检测与事件绑定
  // ============================================================================

  /**
   * 检测当前设备是否为触摸设备
   * 使用 matchMedia 检测 hover 能力与 pointer 类型
   */
  const detectDeviceType = (): void => {
    try {
      const hoverMatch = window.matchMedia('(hover: none)');
      const pointerMatch = window.matchMedia('(pointer: coarse)');
      setIsTouchDevice(hoverMatch.matches || pointerMatch.matches);
    } catch {
      setIsTouchDevice(false);
    }
  };

  /**
   * 扫描文档内容区中所有触发元素，绑定事件监听
   * 仅在 article.prose 范围内查找，避免误绑定非术语元素
   */
  const bindAllTriggers = (): void => {
    const article = document.querySelector('article.prose');
    const root: ParentNode = article ?? document;
    const triggers = root.querySelectorAll<HTMLElement>(TRIGGER_SELECTOR);
    triggers.forEach((el) => bindTrigger(el));
  };

  /**
   * 为单个触发元素绑定事件
   * - 桌面端：mouseenter/leave + focus/blur（键盘可达性）
   * - 移动端：click 触发 Dialog
   */
  const bindTrigger = (el: HTMLElement): void => {
    if (triggerHandlersRef.current.has(el)) return;

    const enter = (e: Event): void => {
      if (isTouchDeviceRef.current) return;
      const target = e.currentTarget as HTMLElement;
      scheduleHoverShow(target);
    };
    const leave = (e: Event): void => {
      if (isTouchDeviceRef.current) return;
      const target = e.currentTarget as HTMLElement;
      scheduleHoverHide(target);
    };
    const click = (e: Event): void => {
      e.preventDefault();
      e.stopPropagation();
      if (!isTouchDeviceRef.current) return;
      const target = e.currentTarget as HTMLElement;
      const term = target.getAttribute('data-term') ?? '';
      const entry = lookup(term);
      if (entry) {
        setDialogEntry(entry);
        setDialogOpen(true);
      }
    };
    const focus = (e: Event): void => {
      if (isTouchDeviceRef.current) return;
      const target = e.currentTarget as HTMLElement;
      scheduleHoverShow(target);
    };
    const blur = (e: Event): void => {
      if (isTouchDeviceRef.current) return;
      const target = e.currentTarget as HTMLElement;
      scheduleHoverHide(target);
    };

    el.addEventListener('mouseenter', enter);
    el.addEventListener('mouseleave', leave);
    el.addEventListener('click', click);
    el.addEventListener('focus', focus);
    el.addEventListener('blur', blur);

    triggerHandlersRef.current.set(el, { enter, leave, click, focus, blur });
  };

  /**
   * 移除所有触发元素的事件监听
   */
  const unbindAllTriggers = (): void => {
    for (const [el, handlers] of triggerHandlersRef.current) {
      el.removeEventListener('mouseenter', handlers.enter);
      el.removeEventListener('mouseleave', handlers.leave);
      el.removeEventListener('click', handlers.click);
      el.removeEventListener('focus', handlers.focus);
      el.removeEventListener('blur', handlers.blur);
    }
    triggerHandlersRef.current.clear();
  };

  // ============================================================================
  // hover debounce 与 Tooltip 定位
  // ============================================================================

  /**
   * 安排 hover 显示：debounce 200ms 后展示 Tooltip
   * 200ms 内鼠标移出则取消展示，避免误触
   *
   * @param el - 触发 hover 的元素
   */
  const scheduleHoverShow = (el: HTMLElement): void => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    currentTriggerElRef.current = el;
    hoverTimerRef.current = setTimeout(() => {
      const term = el.getAttribute('data-term') ?? '';
      const entry = lookup(term);
      if (!entry || currentTriggerElRef.current !== el) return;
      setActiveEntry(entry);
      // 先设为可见再计算位置，否则无法获取 Tooltip 实际高度做翻转判断
      setTooltipVisible(true);
      // requestAnimationFrame 等 Tooltip 渲染到 DOM 后再计算定位
      requestAnimationFrame(() => positionTooltip(el));
    }, HOVER_DEBOUNCE_MS);
  };

  /**
   * 安排 hover 隐藏：立即清除待展示定时器，关闭 Tooltip
   *
   * @param el - 当前移出的元素
   */
  const scheduleHoverHide = (el: HTMLElement): void => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    if (currentTriggerElRef.current === el) {
      setTooltipVisible(false);
      setActiveEntry(null);
      currentTriggerElRef.current = null;
    }
  };

  /**
   * 计算 Tooltip 浮层位置
   * 默认放在触发元素下方，空间不足时翻转到上方；同时做水平边界裁剪
   *
   * @param triggerEl - 触发元素
   */
  const positionTooltip = (triggerEl: HTMLElement): void => {
    const triggerRect = triggerEl.getBoundingClientRect();
    const tooltipEl = document.querySelector<HTMLElement>('.term-tooltip-floating');
    if (!tooltipEl) return;

    const tooltipRect = tooltipEl.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    // 垂直定位：默认下方，空间不足翻转到上方
    let top: number;
    let placement: 'bottom' | 'top';
    const spaceBelow = viewportH - triggerRect.bottom;
    const spaceAbove = triggerRect.top;
    if (
      spaceBelow >= tooltipRect.height + TOOLTIP_GAP + TOOLTIP_VIEWPORT_MARGIN ||
      spaceBelow >= spaceAbove
    ) {
      top = triggerRect.bottom + TOOLTIP_GAP;
      placement = 'bottom';
    } else {
      top = triggerRect.top - tooltipRect.height - TOOLTIP_GAP;
      placement = 'top';
    }
    setTooltipPlacement(placement);

    // 水平定位：默认左对齐触发元素，溢出右侧时左移
    let left = triggerRect.left;
    if (left + tooltipRect.width + TOOLTIP_VIEWPORT_MARGIN > viewportW) {
      left = viewportW - tooltipRect.width - TOOLTIP_VIEWPORT_MARGIN;
    }
    if (left < TOOLTIP_VIEWPORT_MARGIN) {
      left = TOOLTIP_VIEWPORT_MARGIN;
    }

    setTooltipStyle({
      top: top + 'px',
      left: left + 'px',
      maxWidth: TOOLTIP_MAX_WIDTH + 'px',
    });
  };

  // ============================================================================
  // Astro 页面切换与 MutationObserver
  // ============================================================================

  /**
   * 处理 Astro 视图切换事件：DOM 已替换，需重新绑定触发元素
   */
  const handlePageLoad = (): void => {
    detectDeviceType();
    unbindAllTriggers();
    // 隐藏可能残留的 Tooltip
    setTooltipVisible(false);
    setActiveEntry(null);
    requestAnimationFrame(() => bindAllTriggers());
  };

  /**
   * 注册 MutationObserver 监听 article.prose 子树变化
   * 用于动态加载内容（如 Mermaid 渲染后）扫描新的触发元素
   */
  const registerMutationObserver = (): void => {
    if (typeof MutationObserver === 'undefined') return;
    const article = document.querySelector('article.prose');
    if (!article) return;
    observerRef.current = new MutationObserver((mutations) => {
      let hasNewNodes = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          hasNewNodes = true;
          break;
        }
      }
      if (!hasNewNodes) return;
      // 防抖：避免连续 mutation 触发多次扫描
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
      hoverTimerRef.current = setTimeout(() => {
        bindAllTriggers();
      }, 100);
    });
    observerRef.current.observe(article, { childList: true, subtree: true });
  };

  // ============================================================================
  // 生命周期（onMounted + onBeforeUnmount 合并为单个 useEffect）
  // ============================================================================

  useEffect(() => {
    // 挂载：
    // 1. 检测设备类型（touch / non-touch）
    detectDeviceType();
    // 2. 扫描 DOM 中的触发元素并绑定事件
    bindAllTriggers();
    // 3. 注册 Astro 页面切换事件
    window.addEventListener('astro:page-load', handlePageLoad);
    // 4. 注册 MutationObserver 监听 DOM 变化
    registerMutationObserver();

    // 卸载前：清理所有事件、observer、定时器
    return () => {
      unbindAllTriggers();
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
      window.removeEventListener('astro:page-load', handlePageLoad);
      window.removeEventListener('resize', detectDeviceType);
    };
    // 仅在挂载/卸载时执行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================================
  // 渲染
  // ============================================================================

  return (
    <>
      {/*
        桌面端 Tooltip：固定定位浮层，由 tooltipVisible 控制显隐
        使用 createPortal 到 body 避免 z-index 与父容器裁剪问题
        视觉风格与 shadcn-vue Tooltip 对齐：elevated 背景、阴影、淡入动画
      */}
      {tooltipVisible &&
        activeEntry &&
        createPortal(
          <div
            className={`term-tooltip-floating term-tooltip-placement-${tooltipPlacement}`}
            style={tooltipStyle}
            role="tooltip"
            onMouseLeave={() =>
              scheduleHoverHide(currentTriggerElRef.current ?? document.body)
            }
          >
            <div className="term-tooltip-body">
              {/* 头部：术语 + 英文 */}
              <div className="term-tooltip-header">
                <span className="term-tooltip-term">{activeEntry.term}</span>
                {activeEntry.english && (
                  <span className="term-tooltip-english">{activeEntry.english}</span>
                )}
              </div>
              {/* 词源（可选） */}
              {activeEntry.etymology && (
                <p className="term-tooltip-etymology">{activeEntry.etymology}</p>
              )}
              {/* 定义 */}
              <p className="term-tooltip-definition">{activeEntry.definition}</p>
              {/* 参考链接 */}
              {activeEntry.references && activeEntry.references.length > 0 && (
                <div className="term-tooltip-refs">
                  {activeEntry.references.map((ref, i) => (
                    <a
                      key={i}
                      href={ref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="term-tooltip-ref-link"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="size-3" />
                      <span>{ref}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
            {/* 小箭头（指向触发元素） */}
            <span
              className={`term-tooltip-arrow term-tooltip-arrow-${tooltipPlacement}`}
            ></span>
          </div>,
          document.body
        )}

      {/*
        移动端 Dialog：基于 shadcn Dialog
        由 dialogOpen 受控，dialogEntry 提供内容
      */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="term-dialog-content">
          <DialogTitle className="term-dialog-title">{dialogTitleText}</DialogTitle>
          <DialogDescription className="term-dialog-english">{dialogEnglish}</DialogDescription>
          {dialogEntry && (
            <div className="term-dialog-body">
              {dialogEntry.etymology && (
                <div className="term-dialog-section">
                  <h4 className="term-dialog-section-title">词源</h4>
                  <p className="term-dialog-section-text">{dialogEntry.etymology}</p>
                </div>
              )}
              <div className="term-dialog-section">
                <h4 className="term-dialog-section-title">定义</h4>
                <p className="term-dialog-section-text">{dialogEntry.definition}</p>
              </div>
              {dialogEntry.references && dialogEntry.references.length > 0 && (
                <div className="term-dialog-section">
                  <h4 className="term-dialog-section-title">参考</h4>
                  <ul className="term-dialog-ref-list">
                    {dialogEntry.references.map((ref, i) => (
                      <li key={i}>
                        <a
                          href={ref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="term-dialog-ref-link"
                        >
                          <ExternalLink className="size-3.5" />
                          <span>{ref}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default TermTooltip;
