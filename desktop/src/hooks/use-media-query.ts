/**
 * useMediaQuery Hook：媒体查询状态
 *
 * 功能概述：
 * - 使用 React 19 useSyncExternalStore 实现 SSR 安全的媒体查询
 * - 监听 window.matchMedia 变化，自动响应断点切换
 * - 返回 boolean 表示当前是否匹配查询条件
 *
 * 使用场景：
 * - 响应式组件渲染（如根据屏幕宽度切换 UI）
 * - 检测用户偏好（如 prefers-color-scheme、prefers-reduced-motion）
 * - 检测设备类型（如 pointer: coarse 触屏设备）
 *
 * 使用示例：
 *   const isDesktop = useMediaQuery('(min-width: 768px)');
 *   const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
 *   const isTouch = useMediaQuery('(pointer: coarse)');
 *
 *   return isDesktop ? <DesktopLayout /> : <MobileLayout />;
 */

import { useCallback, useSyncExternalStore } from 'react';

/**
 * 订阅媒体查询变化
 *
 * @param query - 媒体查询字符串（如 '(min-width: 768px)'）
 * @param callback - 状态变化时的回调
 * @returns 取消订阅函数
 */
function subscribe(query: string, callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const mediaQueryList = window.matchMedia(query);
  // 现代浏览器使用 addEventListener，旧版使用 addListener
  mediaQueryList.addEventListener('change', callback);

  return () => {
    mediaQueryList.removeEventListener('change', callback);
  };
}

/**
 * 获取客户端快照：当前是否匹配查询
 *
 * @param query - 媒体查询字符串
 * @returns 是否匹配
 */
function getClientSnapshot(query: string): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(query).matches;
}

/**
 * 服务端快照：SSR 时返回 false 避免hydration mismatch
 */
function getServerSnapshot(): boolean {
  return false;
}

/**
 * useMediaQuery Hook
 *
 * @param query - 媒体查询字符串（如 '(min-width: 768px)'）
 * @returns 是否匹配当前媒体查询条件
 */
export function useMediaQuery(query: string): boolean {
  // 使用 useCallback 包装 subscribe，确保 query 变化时重新订阅
  const subscribeWithQuery = useCallback(
    (callback: () => void) => subscribe(query, callback),
    [query],
  );
  // 使用 useCallback 包装 getSnapshot，确保 query 变化时重新计算
  const getSnapshot = useCallback(() => getClientSnapshot(query), [query]);

  return useSyncExternalStore(subscribeWithQuery, getSnapshot, getServerSnapshot);
}

export default useMediaQuery;
