
const COUNT_UP_DURATION_MS = 950;

const COUNT_START_DELAY_MS = 260;

const pendingTimers = new Set<number>();
const pendingFrames = new Set<number>();

function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function animateCount(el: HTMLElement): void {
  const target = Number.parseInt(el.dataset.countup ?? '', 10);
  if (Number.isNaN(target) || target <= 0) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  el.textContent = '0';

  const startAt = performance.now();
  let frameId = 0;
  const tick = (now: number): void => {
    pendingFrames.delete(frameId);
    const progress = Math.min((now - startAt) / COUNT_UP_DURATION_MS, 1);
    el.textContent = String(Math.round(easeOutExpo(progress) * target));
    if (progress < 1) {
      frameId = requestAnimationFrame(tick);
      pendingFrames.add(frameId);
    } else {
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

function initStatCountUp(): void {
  document.querySelectorAll<HTMLElement>('.stat-num[data-countup]').forEach((el) => {
    if (el.dataset.countBound === 'true') return;
    el.dataset.countBound = 'true';
    animateCount(el);
  });
}

if (!import.meta.env.SSR && typeof document !== 'undefined') {
  initStatCountUp();
  document.addEventListener('astro:page-load', initStatCountUp);
  document.addEventListener('astro:before-swap', () => {
    for (const id of pendingTimers) window.clearTimeout(id);
    for (const id of pendingFrames) cancelAnimationFrame(id);
    pendingTimers.clear();
    pendingFrames.clear();
  });
}
