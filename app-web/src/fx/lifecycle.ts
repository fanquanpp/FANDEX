/**
 * fx 页面生命周期 — 与 Astro ClientRouter 对齐。
 *
 * ClientRouter 下模块脚本全站只执行一次，DOM 随导航整体替换：
 * - astro:page-load：新文档就绪（含首次加载），重新扫描挂载；
 * - astro:before-swap：旧文档即将销毁，回收全部实例。
 *
 * 挂载幂等性由 registry 保证，page-load 在首次加载时也会触发一次，
 * 与这里的直接调用重叠无害。
 */

import { getFxTier, FX_MODE_STORAGE_KEY } from './capabilities';
import { mountFxTree, unmountAllFx } from './registry';

let booted = false;

export function initFxLifecycle(): void {
  if (booted || typeof document === 'undefined') return;
  if (getFxTier() === 'off') return;
  booted = true;

  mountFxTree(document);
  document.addEventListener('astro:page-load', () => mountFxTree(document));
  document.addEventListener('astro:before-swap', () => unmountAllFx());

  // 运行中关闭 fx：回收实例，且本次会话不再挂载（刷新后生效重开）
  window.addEventListener('storage', (event) => {
    if (event.key !== FX_MODE_STORAGE_KEY || event.newValue !== 'off') return;
    unmountAllFx();
    document.documentElement.dataset.fxDead = '1';
  });
}
