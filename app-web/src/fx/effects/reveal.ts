/**
 * reveal — 滚动显现（data-fx-reveal / data-fx-reveal-group）。
 *
 * 用法：
 *   <div class="fx-reveal" data-fx-reveal data-fx-reveal-delay="80">...</div>
 *   <div data-fx-reveal-group data-fx-reveal-step="70">
 *     <div class="fx-reveal">...</div>  (子元素按序自动错峰)
 *   </div>
 *
 * 防闪烁约定：BaseLayout 头部的内联脚本先于首帧写入
 * html[data-fx-ready]，隐藏态样式只在 [data-fx-ready] 下生效——
 * 无 JS（爬虫 / 禁脚本）时内容始终完整可见。视口内元素挂载即显形，
 * 不等 Observer 回调，避免后台标签页里首屏内容永远蒙灰。
 */

import { prefersReducedMotion } from '../capabilities';

import type { FxDispose } from '../registry';

const revealHosts = new WeakSet<HTMLElement>();

function show(el: HTMLElement, delay: number): void {
  el.style.transitionDelay = delay > 0 ? `${Math.round(delay)}ms` : '';
  el.dataset.shown = 'true';
}

export function mountRevealGroup(host: HTMLElement): FxDispose {
  if (revealHosts.has(host)) return () => {};
  revealHosts.add(host);

  const children = Array.from(host.querySelectorAll<HTMLElement>('.fx-reveal[data-fx-reveal]'));
  const step = Number.parseFloat(host.dataset.fxRevealStep ?? '') || 60;
  children.forEach((child, index) => {
    if (!child.style.transitionDelay && child.dataset.fxRevealDelay === undefined) {
      child.style.transitionDelay = `${index * step}ms`;
    }
  });
  return () => {};
}

export function mountReveal(host: HTMLElement): FxDispose {
  if (revealHosts.has(host)) return () => {};
  revealHosts.add(host);

  if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
    host.dataset.shown = 'true';
    return () => {};
  }

  /* 首屏元素直接显形：rect 判定先于 Observer，后台标签页 / 打印场景
     不会出现永远隐形的上屏内容。 */
  const rect = host.getBoundingClientRect();
  const viewportH = window.innerHeight || document.documentElement.clientHeight;
  if (rect.top < viewportH * 0.96 && rect.bottom > 0) {
    show(host, 0);
    return () => {};
  }

  const observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[entries.length - 1];
      if (entry?.isIntersecting) {
        observer.disconnect();
        show(host, Number.parseFloat(host.dataset.fxRevealDelay ?? '') || 0);
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
  );
  observer.observe(host);
  return () => observer.disconnect();
}
