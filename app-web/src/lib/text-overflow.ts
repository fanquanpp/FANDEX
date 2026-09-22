
const RESIZE_DEBOUNCE_MS = 150;

const registeredSelectors = new Set<string>();

let resizeRegistered = false;

function checkOverflow(el: HTMLElement): void {
  const isOverflowing = el.scrollWidth > el.clientWidth + 1;
  el.classList.toggle('text-marquee', isOverflowing);
}

export function initTextMarqueeWithResize(selector: string): void {
  registeredSelectors.add(selector);

  const elements = document.querySelectorAll<HTMLElement>(selector);
  elements.forEach(checkOverflow);

  if (resizeRegistered) return;
  resizeRegistered = true;

  let resizeTimer: ReturnType<typeof setTimeout> | null = null;
  window.addEventListener(
    'resize',
    () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        registeredSelectors.forEach((sel) => {
          const els = document.querySelectorAll<HTMLElement>(sel);
          els.forEach(checkOverflow);
        });
      }, RESIZE_DEBOUNCE_MS);
    },
    { passive: true },
  );
}
