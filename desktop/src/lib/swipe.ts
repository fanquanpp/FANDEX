/**
 * 移动端滑动手势识别（Phase 5）
 *
 * 功能概述：
 * - 监听 touchstart / touchmove / touchend 事件，识别用户滑动方向
 * - 支持四个方向回调：onSwipeLeft / onSwipeRight / onSwipeUp / onSwipeDown
 * - 阈值控制：水平 >50px、垂直 <75px（防误触）、速度 >0.3 px/ms
 * - 边缘检测：从左边缘 20px 开始的右滑可单独识别（用于打开侧边栏）
 * - 提供 `useSwipe(element, options)` hook 形式（基于 React useEffect）
 *
 * 设计要点：
 * - 使用 passive event listener 提升滚动性能
 * - 仅在 touchstart 时记录起点，touchend 时计算位移与速度
 * - 不阻止默认行为（避免影响页面滚动）
 * - 多触点忽略（仅处理单指滑动）
 * - 支持取消绑定（返回 unbind 函数）
 *
 * 使用示例：
 *   import { useSwipe } from '@/lib/swipe';
 *   useSwipe(document.body, {
 *     onSwipeLeft: () => nextArticle(),
 *     onSwipeRight: () => prevArticle(),
 *     onEdgeSwipeRight: () => openSidebar(),
 *   });
 */

import type { RefObject } from 'react';
import { useEffect } from 'react';

/** 滑动方向类型 */
export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

/** 滑动手势配置 */
export interface SwipeOptions {
  /** 向左滑动回调（如下一页） */
  onSwipeLeft?: () => void;
  /** 向右滑动回调（如上一页） */
  onSwipeRight?: () => void;
  /** 向上滑动回调 */
  onSwipeUp?: () => void;
  /** 向下滑动回调 */
  onSwipeDown?: () => void;
  /** 从左边缘右滑回调（用于打开侧边栏） */
  onEdgeSwipeRight?: () => void;
  /** 水平滑动最小距离阈值（默认 50px） */
  horizontalThreshold?: number;
  /** 垂直滑动最大距离阈值（默认 75px，超过则视为垂直滚动） */
  verticalThreshold?: number;
  /** 最小滑动速度（px/ms，默认 0.3） */
  minSpeed?: number;
  /** 左边缘检测宽度（默认 20px） */
  edgeWidth?: number;
  /** 是否启用（默认 true） */
  enabled?: boolean;
}

/** 触摸事件起点信息 */
interface TouchStart {
  /** 起点X坐标 */
  x: number;
  /** 起点Y坐标 */
  y: number;
  /** 起点时间戳（ms） */
  time: number;
}

/**
 * 绑定滑动手势监听
 *
 * 实现说明：
 * - 在指定元素上绑定 touchstart / touchend 事件
 * - touchstart 记录起点（仅单指时）
 * - touchend 计算位移、速度、方向，触发对应回调
 * - 使用 passive 监听器提升滚动性能
 *
 * @param element - 目标元素（默认 document.body）
 * @param options - 滑动配置
 * @returns 取消绑定函数
 */
export function bindSwipe(element: HTMLElement, options: SwipeOptions): () => void {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onEdgeSwipeRight,
    horizontalThreshold = 50,
    verticalThreshold = 75,
    minSpeed = 0.3,
    edgeWidth = 20,
    enabled = true,
  } = options;

  if (!enabled) return () => {};

  let touchStart: TouchStart | null = null;

  /**
   * 处理 touchstart 事件
   *
   * 实现说明：
   * - 仅记录单指触摸（touches.length === 1）
   * - 记录起点坐标与时间戳
   */
  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) {
      touchStart = null;
      return;
    }
    const touch = e.touches[0];
    if (!touch) return;
    touchStart = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  };

  /**
   * 处理 touchend 事件
   *
   * 实现说明：
   * - 读取起点信息，若不存在则忽略
   * - 计算 X/Y 位移与时长
   * - 判断方向：水平位移 > 垂直位移 且水平位移 > 阈值 → 水平滑动
   * - 判断速度：位移/时长 > 最小速度 → 触发回调
   * - 边缘检测：起点在左边缘 edgeWidth 内且右滑 → 触发 onEdgeSwipeRight
   */
  const handleTouchEnd = (e: TouchEvent) => {
    if (!touchStart) return;

    const touch = e.changedTouches[0];
    if (!touch) {
      touchStart = null;
      return;
    }

    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    const duration = Date.now() - touchStart.time;

    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // 速度计算（避免除零）
    const speed = duration > 0 ? absDeltaX / duration : 0;

    // 水平滑动判定
    if (
      absDeltaX > absDeltaY &&
      absDeltaX > horizontalThreshold &&
      absDeltaY < verticalThreshold &&
      speed > minSpeed
    ) {
      if (deltaX > 0) {
        // 向右滑
        // 边缘检测：起点在左边缘内
        if (touchStart.x <= edgeWidth && onEdgeSwipeRight) {
          onEdgeSwipeRight();
        } else if (onSwipeRight) {
          onSwipeRight();
        }
      } else if (onSwipeLeft) {
        onSwipeLeft();
      }
    }
    // 垂直滑动判定
    else if (
      absDeltaY > absDeltaX &&
      absDeltaY > horizontalThreshold &&
      absDeltaX < verticalThreshold
    ) {
      const verticalSpeed = duration > 0 ? absDeltaY / duration : 0;
      if (verticalSpeed > minSpeed) {
        if (deltaY < 0 && onSwipeUp) {
          onSwipeUp();
        } else if (deltaY > 0 && onSwipeDown) {
          onSwipeDown();
        }
      }
    }

    touchStart = null;
  };

  // 使用 passive 监听器提升滚动性能
  element.addEventListener('touchstart', handleTouchStart, { passive: true });
  element.addEventListener('touchend', handleTouchEnd, { passive: true });

  return () => {
    element.removeEventListener('touchstart', handleTouchStart);
    element.removeEventListener('touchend', handleTouchEnd);
  };
}

/**
 * React Hook：在组件中绑定滑动手势
 *
 * 实现说明：
 * - 通过 useEffect 在组件挂载时绑定，卸载时自动解绑
 * - 支持传入 ref 或 DOM 元素
 * - options 变化时重新绑定（通过 deps 控制）
 *
 * @param target - 目标元素或 RefObject（默认 document.body）
 * @param options - 滑动配置
 */
export function useSwipe(
  target: HTMLElement | RefObject<HTMLElement> | null,
  options: SwipeOptions,
): void {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 解析目标元素
    let element: HTMLElement | null = null;
    if (target instanceof HTMLElement) {
      element = target;
    } else if (target && 'current' in target) {
      element = target.current;
    } else {
      element = document.body;
    }

    if (!element) return;

    const unbind = bindSwipe(element, options);
    return unbind;
  }, [target, options]);
}

export default {
  bindSwipe,
  useSwipe,
};
