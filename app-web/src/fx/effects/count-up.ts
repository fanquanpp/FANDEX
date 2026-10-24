/**
 * count-up — 数字滚动（吸收自 lib/stat-count-up.ts，纳入 fx 注册表）。
 *
 * 兼容两种宿主属性：历史 `.stat-num[data-countup]` 与新的
 * `[data-fx-count]`，值从 dataset 读取。easeOutExpo 出终值；
 * prefers-reduced-motion / 数值非法时保持 SSR 渲染的静态终值。
 */

import type { FxDispose } from '../registry';

const DURATION_MS = 950;
const START_DELAY_MS = 260;

function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function bindCount(el: HTMLElement): FxDispose {
  const raw = el.dataset.fxCount ?? el.dataset.countup ?? '';
  const target = Number.parseInt(raw, 10);
  if (!Number.isFinite(target) || target <= 0) return () => {};
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  el.textContent = '0';
  let frameId = 0;
  let timerId = 0;

  const tick = (now: number): void => {
    const progress = Math.min((now - startAt) / DURATION_MS, 1);
    el.textContent = String(Math.round(easeOutExpo(progress) * target));
    if (progress < 1) {
      frameId = requestAnimationFrame(tick);
    } else {
      el.textContent = String(target);
    }
  };
  const startAt = performance.now() + START_DELAY_MS;
  timerId = window.setTimeout(() => {
    timerId = 0;
    frameId = requestAnimationFrame(tick);
  }, START_DELAY_MS);

  return () => {
    if (timerId) window.clearTimeout(timerId);
    if (frameId) cancelAnimationFrame(frameId);
    el.textContent = String(target);
  };
}

export function mountCountUp(el: HTMLElement): FxDispose {
  if (el.dataset.fxBound === 'true') return () => {};
  el.dataset.fxBound = 'true';
  return bindCount(el);
}
