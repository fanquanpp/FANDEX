/**
 * 首页统计数字滚动计数
 * -----------------------------------------------------------------------------
 * 职责：
 * - Hero 区 .stat-num[data-countup] 在页面就绪后从 0 滚动计数到目标值
 * - easeOutExpo 缓动：起步极快、结尾缓慢归位，符合 ark-ui 克制有力的动效语言
 * - 服务端渲染的最终值保留为无 JS / 减少动效 / 搜索引擎的兜底展示
 * - 起跳时机与 Hero 入场编排对齐（统计栏滑入后立即起跳）
 *
 * 生命周期约定（与 home-interactions.ts 一致）：
 * - 模块加载即执行一次；astro:page-load 在 View Transitions 返回首页时重放
 * - dataset.countBound 守卫防止同一 DOM 重复初始化
 * - prefers-reduced-motion 用户直接看到最终值，不播放动画
 * -----------------------------------------------------------------------------
 */

/** 计数动画时长（毫秒）：略长于 --motion-duration-slower(600ms)，大数字仍清晰可读 */
const COUNT_UP_DURATION_MS = 950;

/** 起跳延迟（毫秒）：等待统计栏入场动画（0.16s 延迟 + 250ms 时长）基本落定 */
const COUNT_START_DELAY_MS = 260;

/** 未落定的计时器/动画帧登记：页面切换前统一取消，避免向已脱离文档的节点写入 */
const pendingTimers = new Set<number>();
const pendingFrames = new Set<number>();

/**
 * easeOutExpo 缓动曲线：前 30% 时间完成约 90% 的数值变化，尾部缓慢收势
 * @param t 归一化进度（0-1）
 */
function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

/**
 * 对单个数字元素执行滚动计数
 * @param el 目标元素，须带 data-countup="目标值" 属性
 */
function animateCount(el: HTMLElement): void {
  const target = Number.parseInt(el.dataset.countup ?? '', 10);
  // 无合法目标值时保留服务端渲染的文本，不做任何处理
  if (Number.isNaN(target) || target <= 0) return;
  // 减少动效偏好：跳过动画，保留服务端渲染的最终值
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // 绑定后立即归零：模块脚本先于首次绘制执行，用户不会看到最终值闪现
  el.textContent = '0';

  const startAt = performance.now();
  // 当前动画帧 id（let：每帧重排程时更新登记，before-swap 取消最新一帧即可）
  let frameId = 0;
  const tick = (now: number): void => {
    pendingFrames.delete(frameId);
    const progress = Math.min((now - startAt) / COUNT_UP_DURATION_MS, 1);
    el.textContent = String(Math.round(easeOutExpo(progress) * target));
    if (progress < 1) {
      frameId = requestAnimationFrame(tick);
      pendingFrames.add(frameId);
    } else {
      // 落定：精确写回目标值，避免缓动舍入误差
      el.textContent = String(target);
    }
  };
  const timerId = window.setTimeout(() => {
    pendingTimers.delete(timerId);
    frameId = requestAnimationFrame(tick);
    pendingFrames.add(frameId);
  }, COUNT_START_DELAY_MS);
  pendingTimers.add(timerId);
}

/**
 * 初始化首页统计数字计数（幂等，可安全重复调用）
 */
function initStatCountUp(): void {
  document.querySelectorAll<HTMLElement>('.stat-num[data-countup]').forEach((el) => {
    if (el.dataset.countBound === 'true') return;
    el.dataset.countBound = 'true';
    animateCount(el);
  });
}

// 仅浏览器环境执行（Astro 预渲染期会求值本模块，顶层禁止访问 DOM）
if (!import.meta.env.SSR && typeof document !== 'undefined') {
  initStatCountUp();
  document.addEventListener('astro:page-load', initStatCountUp);
  // 页面切换前取消未落定的计数：计时器与动画帧不再触达已脱离文档的节点
  document.addEventListener('astro:before-swap', () => {
    for (const id of pendingTimers) window.clearTimeout(id);
    for (const id of pendingFrames) cancelAnimationFrame(id);
    pendingTimers.clear();
    pendingFrames.clear();
  });
}
