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

// 翻页按钮一次滚动 2 张卡（与旧实现步长一致）
const NAV_STEP_CARDS = 2;

const NAV_ANIM_DURATION_MS = 300;

const SETTLE_ANIM_DURATION_MS = 180;

// 拖拽超过该位移即判定为滚动意图，拦截拖拽结束后的卡片点击
const DRAG_CLICK_SUPPRESS_PX = 6;

// 触屏抬手后延迟恢复常滚动，给原生动量滚动留出缓冲
const TOUCH_RESUME_DELAY_MS = 1800;

// 滚动事件静默该时长后，认为手势/动量已结束
const SCROLL_QUIET_MS = 260;

// 引擎写入与浏览器取整的容差：差值小于它视为引擎自己写的 scroll 事件
const ENGINE_WRITE_EPSILON = 1.5;

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
  // 虚拟滚动位（浮点，[0, cardSetWidth) 环绕）。scrollLeft 只能整数步进，
  // 常滚动速度 0.3px/帧必须靠这个浮点累加器才不会卡死在整数上。
  pos: number;
  // 引擎上一次期望写入的 scrollLeft，用于区分引擎自身触发的 scroll 事件
  expectedScroll: number;
  cardSetWidth: number;
  direction: 'left' | 'right';
  speed: number;
  isPaused: boolean;
  isHovering: boolean;
  isDragging: boolean;
  // 左键按下但尚未越过拖拽阈值：期间不 capture、不挂 is-dragging，
  // 让静止点击的 click 正常落到卡片 anchor（I1）。
  pendingLeftDrag: boolean;
  rafId: number | null;
  inertiaVelocity: number;
  isInertiaActive: boolean;
  inertiaRafId: number | null;
  inertiaStartTime: number;
  startAt: number;
  navRafId: number | null;
  navActive: boolean;
  settleRafId: number | null;
  snapSuspended: boolean;
  userHold: boolean;
  quietTimer: number | null;
}

/*
 * 滚动引擎说明（规格 5.2.3 / 验收 8.2）：
 * 旧实现用 transform + overflow:hidden 的无限跑马灯，触屏完全无法手动滚动。
 * 现改为容器原生 scrollLeft 驱动：
 * - 触屏横滑 / 触控板横滚 / 滚动条 / 键盘滚动全部原生可用；
 * - CSS scroll-snap(x proximity) + 卡片 scroll-snap-align:start 负责手势结束吸附；
 * - JS 程序化驱动（常滚动/拖拽/惯性/翻页）期间以行内样式临时悬挂 snap，
 *   驱动结束先动画对齐到最近卡片栅格再恢复——恢复点必在吸附位上，无跳变；
 * - 原生滚动（触屏/滚轮/滚动条）与引擎通过 expectedScroll 区分并回同步，
 *   两类来源可以无缝接续。
 */

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

  if (originalCardSetWidth <= 0) return;

  const viewportWidth = scroller.clientWidth;

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
    pos: 0,
    expectedScroll: 0,
    cardSetWidth: originalCardSetWidth,
    direction,
    speed,
    isPaused: reduceMotion,
    isHovering: false,
    isDragging: false,
    pendingLeftDrag: false,
    rafId: null,
    inertiaVelocity: 0,
    isInertiaActive: false,
    inertiaRafId: null,
    inertiaStartTime: 0,
    startAt: performance.now() + AUTO_START_DELAY_MS,
    navRafId: null,
    navActive: false,
    settleRafId: null,
    snapSuspended: false,
    userHold: false,
    quietTimer: null,
  };

  state.cardSetWidth = measureCardSetWidth();

  const normalize = (raw: number): number => {
    let result = raw;
    while (result >= state.cardSetWidth) {
      result -= state.cardSetWidth;
    }
    while (result < 0) {
      result += state.cardSetWidth;
    }
    return result;
  };

  const suspendSnap = (): void => {
    if (state.snapSuspended) return;
    state.snapSuspended = true;
    scroller.style.scrollSnapType = 'none';
  };

  const restoreSnap = (): void => {
    state.snapSuspended = false;
    scroller.style.scrollSnapType = '';
  };

  const applyEngineScroll = (value: number): void => {
    suspendSnap();
    state.expectedScroll = value;
    scroller.scrollLeft = value;
  };

  // 卡片栅格吸附位：所有卡片等宽（flex-basis 固定），栅格距 = 首卡宽 + gap
  const snapRound = (current: number): number => {
    const first = track.children[0] as HTMLElement | undefined;
    const stride = first ? first.getBoundingClientRect().width + gap : state.cardSetWidth;
    if (stride <= 0) return current;
    return Math.round(current / stride) * stride;
  };

  // 环绕等价类里挑一个落在 [0, maxScroll] 内、离 start 最近的代表值
  const pickRawTarget = (visualTarget: number, start: number): number => {
    const max = scroller.scrollWidth - scroller.clientWidth;
    let best = Math.min(Math.max(visualTarget, 0), Math.max(0, max));
    let bestDist = Number.POSITIVE_INFINITY;
    for (let k = -4; k <= 4; k++) {
      const candidate = visualTarget + k * state.cardSetWidth;
      if (candidate < 0 || candidate > max) continue;
      const dist = Math.abs(candidate - start);
      if (dist < bestDist) {
        bestDist = dist;
        best = candidate;
      }
    }
    return best;
  };

  /*
   * 程序化驱动收尾：先动画对齐到最近吸附位，再恢复 CSS snap。
   * 恢复时位置已在栅格上，浏览器的重新吸附是空操作，因此不会出现跳变。
   */
  const settleToSnapGrid = (): void => {
    if (!state.snapSuspended) return;

    if (reduceMotion) {
      const target = normalize(snapRound(scroller.scrollLeft));
      state.pos = target;
      state.expectedScroll = target;
      scroller.scrollLeft = target;
      restoreSnap();
      return;
    }

    if (state.settleRafId !== null) return;

    const start = scroller.scrollLeft;
    const target = pickRawTarget(normalize(snapRound(start)), start);
    const delta = target - start;

    if (Math.abs(delta) < 1) {
      state.pos = normalize(target);
      state.expectedScroll = target;
      restoreSnap();
      return;
    }

    const startTime = performance.now();
    const stepSettle = (now: number): void => {
      const progress = Math.min(1, (now - startTime) / SETTLE_ANIM_DURATION_MS);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = start + delta * eased;
      state.expectedScroll = value;
      scroller.scrollLeft = value;
      if (progress < 1) {
        state.settleRafId = requestAnimationFrame(stepSettle);
      } else {
        state.settleRafId = null;
        state.pos = normalize(target);
        state.expectedScroll = target;
        restoreSnap();
      }
    };
    state.settleRafId = requestAnimationFrame(stepSettle);
  };

  const cancelSettle = (): void => {
    if (state.settleRafId !== null) {
      cancelAnimationFrame(state.settleRafId);
      state.settleRafId = null;
    }
  };

  const cancelInertia = (): void => {
    if (state.inertiaRafId !== null) {
      cancelAnimationFrame(state.inertiaRafId);
      state.inertiaRafId = null;
    }
    state.isInertiaActive = false;
    state.inertiaVelocity = 0;
  };

  const cancelNav = (): void => {
    if (state.navRafId !== null) {
      cancelAnimationFrame(state.navRafId);
      state.navRafId = null;
    }
    state.navActive = false;
  };

  // 翻页/拖拽结束后：能续跑常滚动就保持 snap 悬挂，否则对齐栅格并恢复
  const afterProgrammatic = (resumeAmbient: boolean): void => {
    if (resumeAmbient && !reduceMotion && performance.now() >= state.startAt) {
      state.isPaused = false;
      return;
    }
    state.isPaused = true;
    settleToSnapGrid();
  };

  const animate = (): void => {
    state.isHovering = scroller.matches(':hover');

    if (!state.isDragging && !state.isInertiaActive && !state.navActive) {
      state.isPaused =
        state.isHovering || state.userHold || reduceMotion || performance.now() < state.startAt;
    }

    if (!state.isPaused && !state.isDragging && !state.isInertiaActive && !state.navActive) {
      if (state.direction === 'left') {
        state.pos += state.speed;
        if (state.pos >= state.cardSetWidth) {
          state.pos -= state.cardSetWidth;
        }
      } else {
        state.pos -= state.speed;
        if (state.pos <= 0) {
          state.pos += state.cardSetWidth;
        }
      }
      applyEngineScroll(state.pos);
    }
    state.rafId = requestAnimationFrame(animate);
  };

  // 常滚动启动前：悬挂 snap 并把反向行的起点挪过一个克隆组（视觉等价）
  if (!reduceMotion) {
    suspendSnap();
    if (direction === 'right') {
      state.pos = state.cardSetWidth;
      state.expectedScroll = state.cardSetWidth;
      scroller.scrollLeft = state.cardSetWidth;
    }
  }

  state.rafId = requestAnimationFrame(animate);

  let dragStartX = 0;
  let dragStartPos = 0;
  let pointerId: number | null = null;
  let suppressClick = false;
  let lastMoveTime = 0;
  let lastMoveX = 0;

  const animateInertia = (): void => {
    if (!state.isInertiaActive) return;

    const elapsed = performance.now() - state.inertiaStartTime;
    if (elapsed > INERTIA_MAX_DURATION || Math.abs(state.inertiaVelocity) < INERTIA_STOP_VELOCITY) {
      state.isInertiaActive = false;
      state.inertiaRafId = null;
      const pausedAfter = state.isDragging || state.isHovering || reduceMotion;
      state.isPaused = pausedAfter;
      state.inertiaVelocity = 0;
      if (pausedAfter) {
        settleToSnapGrid();
      }
      return;
    }

    // 惯性速度沿用旧的 offset 空间符号约定，scrollLeft 空间取负
    state.pos = normalize(state.pos - state.inertiaVelocity);
    applyEngineScroll(state.pos);

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

  const onPointerDown = (e: PointerEvent): void => {
    if (e.pointerType === 'touch') {
      // 触屏交给原生横滑（overflow-x: auto），这里只暂停常滚动避免双写打架
      state.userHold = true;
      return;
    }
    if (e.pointerType !== 'mouse') return;
    // 左键拖拽（配合 click 拦截）+ 中键拖拽（沿用旧能力并屏蔽自动滚动）
    if (e.button !== 0 && e.button !== 1) return;
    // preventDefault 保留：抑制卡片链接的原生拖拽与文本选择（不阻 click
    // 与导航），否则原生 dragstart 会吞掉后续 pointermove，左键拖拽失灵。
    e.preventDefault();
    cancelSettle();
    cancelNav();
    cancelInertia();
    // 中键立即 capture（无点击语义）；左键延后到真正拖过阈值才 capture：
    // pointer capture 会把 pointerup/click 的 target 重定向到 scroller，
    // 立即 capture 会让静止左键点击永远到不了卡片 anchor（视检交互
    // 第 1 轮 I1：左键点卡片无响应，回归自 4f1a1e04 引入左键拖拽）。
    state.isDragging = e.button === 1;
    state.pendingLeftDrag = e.button === 0;
    state.isHovering = true;
    state.isPaused = true;
    suppressClick = false;
    dragStartX = e.clientX;
    dragStartPos = normalize(scroller.scrollLeft);
    state.pos = dragStartPos;
    state.expectedScroll = scroller.scrollLeft;
    lastMoveTime = performance.now();
    lastMoveX = e.clientX;
    pointerId = e.pointerId;
    if (e.button === 1) {
      scroller.classList.add('is-dragging');
      try {
        scroller.setPointerCapture(e.pointerId);
      } catch {
        // 安全降级
      }
    }
  };

  const onPointerMove = (e: PointerEvent): void => {
    // 左键待定拖拽：越过阈值才转正——此刻才 capture 并挂 is-dragging。
    // capture 会重定向 pointerup/click 的 target 到 scroller，静止点击
    // 必须保持无 capture 状态让 click 落回卡片 anchor（I1）。
    if (state.pendingLeftDrag && e.pointerId === pointerId) {
      const dxPending = e.clientX - dragStartX;
      if (Math.abs(dxPending) > DRAG_CLICK_SUPPRESS_PX) {
        state.pendingLeftDrag = false;
        state.isDragging = true;
        suppressClick = true;
        scroller.classList.add('is-dragging');
        try {
          scroller.setPointerCapture(e.pointerId);
        } catch {
          // 安全降级
        }
      }
      return;
    }
    if (!state.isDragging || e.pointerId !== pointerId) return;
    const dx = e.clientX - dragStartX;
    if (Math.abs(dx) > DRAG_CLICK_SUPPRESS_PX) {
      suppressClick = true;
    }

    // 拖拽：内容跟手，scrollLeft 空间 = 起点 - 位移
    const next = normalize(dragStartPos - dx);
    state.pos = next;
    applyEngineScroll(next);

    const now = performance.now();
    const dt = now - lastMoveTime;
    if (dt > 0) {
      state.inertiaVelocity = ((e.clientX - lastMoveX) / dt) * 16.67;
    }
    lastMoveTime = now;
    lastMoveX = e.clientX;
  };

  const onPointerUp = (e: PointerEvent): void => {
    if (e.pointerType === 'touch') {
      if (state.userHold) {
        state.userHold = false;
        state.startAt = performance.now() + TOUCH_RESUME_DELAY_MS;
      }
      return;
    }
    // 左键待定拖拽在未越过阈值时结束 = 一次静止点击：清标记即可，
    // click 事件正常派发到卡片 anchor 完成跳转。
    if (state.pendingLeftDrag && e.pointerId === pointerId) {
      state.pendingLeftDrag = false;
      pointerId = null;
      return;
    }
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
      afterProgrammatic(!state.isHovering);
    }
  };

  const onClickCapture = (e: MouseEvent): void => {
    if (!suppressClick) return;
    suppressClick = false;
    e.preventDefault();
    e.stopPropagation();
  };

  scroller.addEventListener('mousedown', (e: MouseEvent) => {
    if (e.button === 1) e.preventDefault();
  });

  scroller.addEventListener('pointerdown', onPointerDown);
  scroller.addEventListener('pointermove', onPointerMove);
  scroller.addEventListener('pointerup', onPointerUp);
  scroller.addEventListener('pointercancel', onPointerUp);
  scroller.addEventListener('click', onClickCapture, true);

  const onScroll = (): void => {
    if (Math.abs(scroller.scrollLeft - state.expectedScroll) > ENGINE_WRITE_EPSILON) {
      // 原生滚动（触屏/滚轮/滚动条/键盘）接管：虚拟位回同步到实际值
      state.pos = normalize(scroller.scrollLeft);
      state.expectedScroll = scroller.scrollLeft;
    }
    if (state.quietTimer !== null) {
      window.clearTimeout(state.quietTimer);
    }
    state.quietTimer = window.setTimeout(onScrollQuiet, SCROLL_QUIET_MS);
  };

  const onScrollQuiet = (): void => {
    state.quietTimer = null;
    const busy =
      state.isDragging || state.isInertiaActive || state.navActive || state.userHold;
    if (state.snapSuspended && !busy) {
      settleToSnapGrid();
    }
  };

  scroller.addEventListener('scroll', onScroll, { passive: true });

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
        const step = (cardWidth + gap) * NAV_STEP_CARDS;

        const wasPaused = state.isPaused;
        cancelSettle();
        cancelInertia();
        state.isPaused = true;
        state.navActive = true;

        const start = scroller.scrollLeft;
        // 旧语义：offset -= dir * step，scrollLeft 空间取反得 start + dir * step；
        // 目标吸附到卡片栅格（snapRound），让翻页精确落在卡片起点上
        const target = pickRawTarget(normalize(snapRound(start + dir * step)), start);
        const delta = target - start;

        if (Math.abs(delta) < 1) {
          state.navActive = false;
          afterProgrammatic(!wasPaused);
          return;
        }

        if (reduceMotion) {
          state.pos = normalize(target);
          state.expectedScroll = target;
          scroller.scrollLeft = target;
          state.navActive = false;
          afterProgrammatic(!wasPaused);
          return;
        }

        suspendSnap();
        const startTime = performance.now();

        const stepNav = (now: number): void => {
          const elapsed = now - startTime;
          const progress = Math.min(1, elapsed / NAV_ANIM_DURATION_MS);
          const eased = 1 - Math.pow(1 - progress, 3);
          const value = start + delta * eased;
          state.expectedScroll = value;
          scroller.scrollLeft = value;
          if (progress < 1) {
            state.navRafId = requestAnimationFrame(stepNav);
          } else {
            state.navRafId = null;
            state.pos = normalize(target);
            state.expectedScroll = target;
            state.navActive = false;
            afterProgrammatic(!wasPaused);
          }
        };
        state.navRafId = requestAnimationFrame(stepNav);
      });
    });
  }

  // resize 触发的量宽 + 克隆补位是读-写-读布局抖动，用 rAF 合帧并设克隆上限
  let resizeRafId: number | null = null;
  const handleResize = (): void => {
    if (resizeRafId !== null) return;
    resizeRafId = window.requestAnimationFrame(() => {
      resizeRafId = null;
      state.cardSetWidth = measureCardSetWidth();
      let guard = 0;
      while (track.scrollWidth < scroller.clientWidth + state.cardSetWidth && guard < 10) {
        cloneSet();
        guard += 1;
      }
      state.pos = normalize(scroller.scrollLeft);
      state.expectedScroll = scroller.scrollLeft;
    });
  };
  window.addEventListener('resize', handleResize);

  const cleanup = (): void => {
    if (state.rafId !== null) {
      cancelAnimationFrame(state.rafId);
    }
    if (state.inertiaRafId !== null) {
      cancelAnimationFrame(state.inertiaRafId);
    }
    if (state.navRafId !== null) {
      cancelAnimationFrame(state.navRafId);
    }
    if (state.settleRafId !== null) {
      cancelAnimationFrame(state.settleRafId);
    }
    if (state.quietTimer !== null) {
      window.clearTimeout(state.quietTimer);
    }
    if (resizeRafId !== null) {
      cancelAnimationFrame(resizeRafId);
    }
    restoreSnap();
    window.removeEventListener('resize', handleResize);
    scroller.removeEventListener('scroll', onScroll);
    scroller.removeEventListener('click', onClickCapture, true);
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

// SSR 预渲染期会求值页面脚本模块：顶层 DOM 访问必须带守卫（工程约束 3）
if (!import.meta.env.SSR && typeof document !== 'undefined') {
  initHomeInteractions();
  initScrollers();
  initTextMarqueeWithResize('.card-title');
  document.addEventListener('astro:page-load', () => {
    initHomeInteractions();
    initScrollers();
    initTextMarqueeWithResize('.card-title');
  });
}
