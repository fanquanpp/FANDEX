import { initTextMarqueeWithResize } from '@/lib/text-overflow';

const BASE_SPEED_PX_PER_FRAME = 0.3;

const SPEED_RANDOM_FACTOR = 0.25;

const INERTIA_FRICTION = 0.95;

const INERTIA_HOVER_ACCELERATE = 0.85;

const INERTIA_MIN_VELOCITY = 2;

const INERTIA_STOP_VELOCITY = 0.1;

const INERTIA_MAX_DURATION = 2500;

const CARD_COUNT_SPEED_BOOST = 0.04;

const MAX_SPEED_BOOST = 0.6;

const AUTO_START_DELAY_MS = 2600;

function initHomeInteractions(): void {
  const leads = document.querySelectorAll<HTMLElement>('.category-header__lead[data-toggle]');
  leads.forEach((lead) => {
    if (lead.dataset.bound === 'true') return;
    lead.dataset.bound = 'true';

    lead.addEventListener('click', () => {
      const section = lead.closest('.category-section');
      if (section) {
        section.classList.toggle('collapsed');
      }
    });
  });
}

interface ScrollerState {
  offset: number;
  cardSetWidth: number;
  direction: 'left' | 'right';
  speed: number;
  isPaused: boolean;
  isHovering: boolean;
  isDragging: boolean;
  rafId: number | null;
  inertiaVelocity: number;
  isInertiaActive: boolean;
  inertiaRafId: number | null;
  inertiaStartTime: number;
  startAt: number;
}

function initScroller(scroller: HTMLElement, rowIndex: number): void {
  const track = scroller.querySelector<HTMLElement>('[data-track]');
  if (!track) return;

  if (track.dataset.initialized === 'true') return;

  const cards = Array.from(track.children) as HTMLElement[];
  if (cards.length === 0) return;

  const gapStr = getComputedStyle(track).gap;
  const gap = parseFloat(gapStr) || 16;
  let originalCardSetWidth = 0;
  for (const card of cards) {
    originalCardSetWidth += card.getBoundingClientRect().width + gap;
  }
  const viewportWidth = scroller.clientWidth;

  if (originalCardSetWidth <= 0) return;

  const cloneSet = (): void => {
    cards.forEach((card) => {
      const clone = card.cloneNode(true) as HTMLElement;
      clone.setAttribute('aria-hidden', 'true');
      clone.setAttribute('tabindex', '-1');
      clone.style.animation = 'none';
      track.appendChild(clone);
    });
  };

  const neededCopies = Math.max(
    2,
    Math.ceil((viewportWidth + originalCardSetWidth) / originalCardSetWidth),
  );

  for (let i = 1; i < neededCopies; i++) {
    cloneSet();
  }

  track.dataset.initialized = 'true';

  const direction: 'left' | 'right' = rowIndex % 2 === 0 ? 'left' : 'right';

  const measureCardSetWidth = (): number => {
    let width = 0;
    for (let i = 0; i < cards.length; i++) {
      const el = track.children[i] as HTMLElement | undefined;
      if (!el) break;
      width += el.getBoundingClientRect().width + gap;
    }
    return width;
  };

  const cardCount = cards.length;
  const speedBoost = Math.min(MAX_SPEED_BOOST, CARD_COUNT_SPEED_BOOST * Math.max(0, 20 - cardCount));
  const randomFactor = 1 - Math.random() * SPEED_RANDOM_FACTOR;
  const speed = BASE_SPEED_PX_PER_FRAME * (1 + speedBoost) * randomFactor;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const state: ScrollerState = {
    offset: 0,
    cardSetWidth: measureCardSetWidth(),
    direction,
    speed,
    isPaused: reduceMotion,
    isHovering: false,
    isDragging: false,
    rafId: null,
    inertiaVelocity: 0,
    isInertiaActive: false,
    inertiaRafId: null,
    inertiaStartTime: 0,
    startAt: performance.now() + AUTO_START_DELAY_MS,
  };

  const normalizeOffset = (rawOffset: number): number => {
    let result = rawOffset;
    while (result > 0) {
      result -= state.cardSetWidth;
    }
    while (result < -state.cardSetWidth) {
      result += state.cardSetWidth;
    }
    return result;
  };

  const animate = (): void => {
    state.isHovering = scroller.matches(':hover');

    if (!state.isDragging && !state.isInertiaActive) {
      state.isPaused =
        state.isHovering || reduceMotion || performance.now() < state.startAt;
    }

    if (!state.isPaused && !state.isDragging && !state.isInertiaActive) {
      if (state.direction === 'left') {
        state.offset -= state.speed;
        if (state.offset <= -state.cardSetWidth) {
          state.offset += state.cardSetWidth;
        }
      } else {
        state.offset += state.speed;
        if (state.offset >= 0) {
          state.offset -= state.cardSetWidth;
        }
      }
      track.style.transform = `translateX(${state.offset}px)`;
    }
    state.rafId = requestAnimationFrame(animate);
  };

  state.rafId = requestAnimationFrame(animate);

  let startX = 0;
  let startOffset = 0;
  let pointerId: number | null = null;
  let lastMoveTime = 0;
  let lastMoveX = 0;

  const animateInertia = (): void => {
    if (!state.isInertiaActive) return;

    const elapsed = performance.now() - state.inertiaStartTime;
    if (elapsed > INERTIA_MAX_DURATION || Math.abs(state.inertiaVelocity) < INERTIA_STOP_VELOCITY) {
      state.isInertiaActive = false;
      state.inertiaVelocity = 0;
      state.inertiaRafId = null;
      state.isPaused = state.isDragging || state.isHovering || reduceMotion;
      return;
    }

    state.offset = normalizeOffset(state.offset + state.inertiaVelocity);
    track.style.transform = `translateX(${state.offset}px)`;

    const friction = state.isPaused ? INERTIA_HOVER_ACCELERATE : INERTIA_FRICTION;
    state.inertiaVelocity *= friction;

    state.inertiaRafId = requestAnimationFrame(animateInertia);
  };

  const startInertia = (releaseVelocity: number): void => {
    if (Math.abs(releaseVelocity) < INERTIA_MIN_VELOCITY) {
      state.isInertiaActive = false;
      state.inertiaVelocity = 0;
      return;
    }
    state.isInertiaActive = true;
    state.inertiaVelocity = releaseVelocity;
    state.inertiaStartTime = performance.now();
    state.isPaused = true;
    if (state.inertiaRafId !== null) {
      cancelAnimationFrame(state.inertiaRafId);
    }
    state.inertiaRafId = requestAnimationFrame(animateInertia);
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || e.button !== 1) return;
    e.preventDefault();
    if (state.inertiaRafId !== null) {
      cancelAnimationFrame(state.inertiaRafId);
      state.inertiaRafId = null;
    }
    state.isInertiaActive = false;
    state.inertiaVelocity = 0;
    state.isDragging = true;
    state.isHovering = true;
    state.isPaused = true;
    startX = e.clientX;
    startOffset = state.offset;
    lastMoveTime = performance.now();
    lastMoveX = e.clientX;
    pointerId = e.pointerId;
    scroller.classList.add('is-dragging');
    try {
      scroller.setPointerCapture(e.pointerId);
    } catch {
      // 安全降级
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!state.isDragging || e.pointerId !== pointerId) return;
    const dx = e.clientX - startX;

    let newOffset = startOffset + dx;
    newOffset = normalizeOffset(newOffset);
    state.offset = newOffset;
    track.style.transform = `translateX(${state.offset}px)`;

    const now = performance.now();
    const dt = now - lastMoveTime;
    if (dt > 0) {
      const moveDx = e.clientX - lastMoveX;
      state.inertiaVelocity = (moveDx / dt) * 16.67;
    }
    lastMoveTime = now;
    lastMoveX = e.clientX;
  };

  const onPointerUp = (e: PointerEvent) => {
    if (!state.isDragging || e.pointerId !== pointerId) return;
    state.isDragging = false;
    try {
      scroller.releasePointerCapture(e.pointerId);
    } catch {
      // 安全降级
    }
    pointerId = null;
    scroller.classList.remove('is-dragging');
    startInertia(state.inertiaVelocity);

    if (!state.isInertiaActive) {
      state.isPaused = state.isHovering || reduceMotion;
    }
  };

  scroller.addEventListener('mousedown', (e: MouseEvent) => {
    if (e.button === 1) e.preventDefault();
  });

  scroller.addEventListener('pointerdown', onPointerDown);
  scroller.addEventListener('pointermove', onPointerMove);
  scroller.addEventListener('pointerup', onPointerUp);
  scroller.addEventListener('pointercancel', onPointerUp);

  const section = scroller.closest('.category-section');
  if (section) {
    const navBtns = section.querySelectorAll<HTMLButtonElement>('[data-nav]');
    navBtns.forEach((btn) => {
      if (btn.dataset.bound === 'true') return;
      btn.dataset.bound = 'true';

      btn.addEventListener('click', () => {
        const dir = parseInt(btn.dataset.nav || '1', 10);
        const firstCard = cards[0];
        if (!firstCard) return;
        const cardWidth = firstCard.getBoundingClientRect().width;
        const gapStr = getComputedStyle(track).gap;
        const gap = parseFloat(gapStr) || 16;
        const step = (cardWidth + gap) * 2;

        const wasPaused = state.isPaused;
        state.isPaused = true;
        const targetOffset = state.offset - dir * step;
        const startOffset = state.offset;
        const duration = 300;
        const startTime = performance.now();

        const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3);

        const animateNav = (now: number): void => {
          const elapsed = now - startTime;
          const progress = Math.min(1, elapsed / duration);
          const eased = easeOut(progress);
          let newOffset = startOffset + (targetOffset - startOffset) * eased;
          while (newOffset > 0) {
            newOffset -= state.cardSetWidth;
          }
          while (newOffset < -state.cardSetWidth) {
            newOffset += state.cardSetWidth;
          }
          state.offset = newOffset;
          track.style.transform = `translateX(${state.offset}px)`;
          if (progress < 1) {
            requestAnimationFrame(animateNav);
          } else {
            state.isPaused =
              wasPaused || performance.now() < state.startAt;
          }
        };
        requestAnimationFrame(animateNav);
      });
    });
  }

  const onWheel = (e: WheelEvent) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    if (Math.abs(e.deltaX) < 2) return;
    e.preventDefault();
    state.isPaused = true;
    state.offset = normalizeOffset(state.offset - e.deltaX);
    track.style.transform = `translateX(${state.offset}px)`;
  };
  scroller.addEventListener('wheel', onWheel, { passive: false });

  const handleResize = (): void => {
    state.cardSetWidth = measureCardSetWidth();
    while (track.scrollWidth < scroller.clientWidth + state.cardSetWidth) {
      cloneSet();
    }
  };
  window.addEventListener('resize', handleResize);

  const cleanup = (): void => {
    if (state.rafId !== null) {
      cancelAnimationFrame(state.rafId);
    }
    if (state.inertiaRafId !== null) {
      cancelAnimationFrame(state.inertiaRafId);
    }
    window.removeEventListener('resize', handleResize);
    scroller.removeEventListener('wheel', onWheel);
    document.removeEventListener('astro:before-swap', cleanup);
  };
  document.addEventListener('astro:before-swap', cleanup);
}

function initScrollers(): void {
  const scrollers = document.querySelectorAll<HTMLElement>('[data-scroller]');
  scrollers.forEach((scroller, index) => {
    initScroller(scroller, index);
  });
}

initHomeInteractions();
initScrollers();
initTextMarqueeWithResize('.card-title');
document.addEventListener('astro:page-load', () => {
  initHomeInteractions();
  initScrollers();
  initTextMarqueeWithResize('.card-title');
});
