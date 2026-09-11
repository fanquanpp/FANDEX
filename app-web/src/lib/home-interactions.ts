/**
 * 首页交互脚本（回转寿司式自动滚动 + 真·无限循环）
 * -----------------------------------------------------------------------------
 * 负责：
 * - 分类区域折叠/展开
 * - 横向滑动器自动滚动（conveyor belt 效果）
 * - 真·双向无限循环（requestAnimationFrame 驱动，无 scroll 边界）
 * - 奇偶反向滚动 + 速度差异（模块数量越少越快）
 * - 悬停暂停（各模块独立）
 * - 鼠标中键拖拽 + 物理惯性 + 触控板水平滑动
 * - 导航按钮控制（平移 2 张卡片宽度）
 * - 卡片标题溢出时 marquee 滚动
 *
 * 核心实现：
 * - transform: translateX(offset) 驱动，offset 取模回绕实现无缝循环
 * - 克隆卡片集确保总宽度 ≥ 视窗 + 单份宽度，避免回绕空窗
 * - 悬停/拖拽时暂停自动滚动，由 mouseleave 恢复
 * - 鼠标中键（button === 1）专用于拖拽滑动，左键保留给链接点击导航
 * ----------------------------------------------------------------------------- */
import { initTextMarqueeWithResize } from '@/lib/text-overflow';

/** 基础滚动速度（像素/帧），用于计算每个分类的滚动速度 */
const BASE_SPEED_PX_PER_FRAME = 0.3;

/** 速度随机加速因子上限（0.25 = 最多加速 25%） */
const SPEED_RANDOM_FACTOR = 0.25;

/** 物理惯性：摩擦系数（每帧速度衰减比例，0.95 = 每帧保留 95% 速度） */
const INERTIA_FRICTION = 0.95;

/** 物理惯性：悬停时加速衰减系数（用户悬停时惯性更快停止） */
const INERTIA_HOVER_ACCELERATE = 0.85;

/** 物理惯性：触发阈值（释放时速度低于此值不启用惯性，单位 px/帧） */
const INERTIA_MIN_VELOCITY = 2;

/** 物理惯性：最小停止速度（速度低于此值时惯性终止） */
const INERTIA_STOP_VELOCITY = 0.1;

/** 物理惯性：最大持续时间（毫秒），防止无限惯性 */
const INERTIA_MAX_DURATION = 2500;

/** 卡片数量对速度的影响系数（数量越少速度越快） */
const CARD_COUNT_SPEED_BOOST = 0.04;

/** 最大速度提升（卡片极少时速度上限） */
const MAX_SPEED_BOOST = 0.6;

/** 自动滚动延迟启动（毫秒）：首屏先静止呈现完整卡片，
 *  让访客先完成视觉定位，滚动再缓缓开始，消除"一进页面就在动"的躁动感 */
const AUTO_START_DELAY_MS = 2600;

/**
 * 初始化首页分类区域的折叠交互
 */
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

/**
 * 单个滑动器实例的状态与控制逻辑
 */
interface ScrollerState {
  /** 当前 translateX 偏移量（像素） */
  offset: number;
  /** 单份卡片集宽度（像素），用于取模回绕 */
  cardSetWidth: number;
  /** 滚动方向：'left' 向左（offset 递减）| 'right' 向右（offset 递增） */
  direction: 'left' | 'right';
  /** 每帧移动速度（像素/帧） */
  speed: number;
  /** 是否暂停自动滚动（悬停或拖拽时） */
  isPaused: boolean;
  /** 鼠标是否悬停在 scroller 内
   *  用于 onPointerUp / animateInertia 判断是否应保持暂停：
   *  鼠标在 scroller 内时由 mouseenter 设置为 true，pointerup 后不恢复自动滚动，
   *  避免 track 位移导致 <a> 跳转失败；mouseleave 时恢复 */
  isHovering: boolean;
  /** 鼠标中键是否按下（中键专用于拖拽滑动，左键保留给链接导航） */
  isDragging: boolean;
  /** requestAnimationFrame 的 ID，用于取消 */
  rafId: number | null;
  /** 物理惯性：当前惯性速度（px/帧，正负代表方向） */
  inertiaVelocity: number;
  /** 物理惯性：是否正在惯性滑动中
   *  惯性期间禁用自动滚动 animate，由 animateInertia 接管 offset 更新 */
  isInertiaActive: boolean;
  /** 物理惯性：惯性动画 rafId，用于取消 */
  inertiaRafId: number | null;
  /** 物理惯性：惯性开始时间戳，用于限制最大持续时间 */
  inertiaStartTime: number;
  /** 自动滚动允许开始的时间戳（performance.now() 之后才启动） */
  startAt: number;
}

/**
 * 初始化单个滑动器的自动滚动、无限循环、拖拽与导航按钮
 */
function initScroller(scroller: HTMLElement, rowIndex: number): void {
  const track = scroller.querySelector<HTMLElement>('[data-track]');
  if (!track) return;

  // 首次初始化标记
  if (track.dataset.initialized === 'true') return;

  const cards = Array.from(track.children) as HTMLElement[];
  if (cards.length === 0) return;

  // 测量单份卡片集宽度（在克隆前使用原始卡片计算）
  // 动态计算克隆份数，确保总宽度 ≥ 视窗 + 单份宽度，避免回绕空窗
  const gapStr = getComputedStyle(track).gap;
  const gap = parseFloat(gapStr) || 16;
  let originalCardSetWidth = 0;
  for (const card of cards) {
    originalCardSetWidth += card.getBoundingClientRect().width + gap;
  }
  const viewportWidth = scroller.clientWidth;

  // 静态模式：单份卡片集宽度不超过视口时（小分类）无需克隆与自动滚动，
  // 轨道交由 CSS 居中展示（.feature-scroller.is-static），导航按钮一并隐藏
  if (originalCardSetWidth <= viewportWidth) {
    scroller.classList.add('is-static');
    track.dataset.initialized = 'true';
    return;
  }

  // 计算需要的份数：总宽度 ≥ 视窗宽度 + 单份宽度
  // 保证 offset 从 0 回绕到 -cardSetWidth 时视窗始终有内容
  // 最少 2 份（原始 + 1 份克隆），卡片少时自动增加至 3 份或更多
  const neededCopies = Math.max(
    2,
    Math.ceil((viewportWidth + originalCardSetWidth) / originalCardSetWidth),
  );

  // 克隆 neededCopies - 1 份（原始已有 1 份），实现无缝循环
  for (let i = 1; i < neededCopies; i++) {
    cards.forEach((card) => {
      const clone = card.cloneNode(true) as HTMLElement;
      clone.setAttribute('aria-hidden', 'true');
      clone.setAttribute('tabindex', '-1');
      clone.style.animation = 'none';
      track.appendChild(clone);
    });
  }

  track.dataset.initialized = 'true';

  // 确定滚动方向：rowIndex 0, 2, 4... 向左；1, 3, 5... 向右
  const direction: 'left' | 'right' = rowIndex % 2 === 0 ? 'left' : 'right';

  // 计算单份卡片集宽度（总宽度 / 份数）
  // 无论克隆多少份，除以份数即为单份宽度，取模回绕逻辑不变
  const measureCardSetWidth = (): number => {
    return track.scrollWidth / neededCopies;
  };

  // 计算滚动速度：卡片数量越少速度越快
  // speed = BASE_SPEED * (1 + boost) * (1 - random * 0.25)
  // boost = min(MAX_SPEED_BOOST, CARD_COUNT_SPEED_BOOST * (20 - cardCount))
  const cardCount = cards.length;
  const speedBoost = Math.min(MAX_SPEED_BOOST, CARD_COUNT_SPEED_BOOST * Math.max(0, 20 - cardCount));
  const randomFactor = 1 - Math.random() * SPEED_RANDOM_FACTOR;
  const speed = BASE_SPEED_PX_PER_FRAME * (1 + speedBoost) * randomFactor;

  // 尊重用户减少动效偏好
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
    // 首屏静止期：延迟 AUTO_START_DELAY_MS 再启动自动滚动
    startAt: performance.now() + AUTO_START_DELAY_MS,
  };

  /**
   * 将 offset 取模回绕到 [-cardSetWidth, 0] 范围，保持无缝循环
   * @param rawOffset 原始偏移量
   * @returns 规范化后的偏移量
   */
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

  /**
   * 自动滚动动画循环
   * 每帧更新 offset 并应用到 transform，取模回绕实现无缝循环
   *
   * 悬停暂停策略（修复方案）：
   * - 原实现依赖 mouseenter/mouseleave 事件管理 isHovering 标志
   * - 问题：页面加载时鼠标若已在 scroller 区域内，mouseenter 不触发，
   *   但浏览器可能在渲染时合成 mouseenter，导致 isPaused 被设为 true 后
   *   mouseleave 未触发，动画永久暂停
   * - 修复：改用 scroller.matches(':hover') 在每帧检查实际悬停状态，
   *   :hover 伪类始终反映浏览器真实的鼠标位置，无事件丢失风险
   * - isHovering 供 onPointerUp / animateInertia 判断释放后是否恢复自动滚动
   *
   * 惯性激活时跳过自动滚动，由 animateInertia 接管
   */
  const animate = (): void => {
    // 每帧通过 :hover 伪类更新悬停状态（比 mouseenter/mouseleave 事件更可靠）
    state.isHovering = scroller.matches(':hover');

    // 非拖拽、非惯性期间，根据悬停状态动态调整 isPaused
    //（含首屏静止期：startAt 之前保持静止，让访客先看清卡片）
    if (!state.isDragging && !state.isInertiaActive) {
      state.isPaused =
        state.isHovering || reduceMotion || performance.now() < state.startAt;
    }

    if (!state.isPaused && !state.isDragging && !state.isInertiaActive) {
      // 更新偏移量
      if (state.direction === 'left') {
        state.offset -= state.speed;
        // 向左滚动：offset 超过 -cardSetWidth 时回绕到 0
        if (state.offset <= -state.cardSetWidth) {
          state.offset += state.cardSetWidth;
        }
      } else {
        state.offset += state.speed;
        // 向右滚动：offset 超过 0 时回绕到 -cardSetWidth
        if (state.offset >= 0) {
          state.offset -= state.cardSetWidth;
        }
      }
      // 应用 transform
      track.style.transform = `translateX(${state.offset}px)`;
    }
    state.rafId = requestAnimationFrame(animate);
  };

  // 启动动画循环
  state.rafId = requestAnimationFrame(animate);

  // ========== 悬停暂停 ==========
  // 原 mouseenter/mouseleave 事件监听已移除，改为在 animate 函数中通过
  // scroller.matches(':hover') 每帧检查实际悬停状态。
  // 原因：mouseenter 在页面加载时可能被浏览器合成触发，导致 isPaused=true
  // 后 mouseleave 未触发，动画永久暂停。:hover 伪类无此问题。

  // ========== 鼠标中键拖拽 + 物理惯性 ==========
  // 中键（button === 1）专用于拖拽滑动，左键保留给 <a> 链接点击导航
  // 因此无需 click 抑制逻辑与拖拽阈值：中键按下即开始拖拽，不会触发链接跳转
  let startX = 0;
  let startOffset = 0;
  let pointerId: number | null = null;
  // 速度追踪：记录最近一次 move 的时间戳与位置，用于计算释放瞬时速度
  let lastMoveTime = 0;
  let lastMoveX = 0;

  /**
   * 物理惯性动画循环
   * - 每帧 offset += inertiaVelocity，并应用摩擦系数衰减
   * - 悬停时使用 INERTIA_HOVER_ACCELERATE 加速衰减，快速停止
   * - 速度低于 INERTIA_STOP_VELOCITY 或超过 INERTIA_MAX_DURATION 时终止
   * - 终止后恢复自动滚动
   */
  const animateInertia = (): void => {
    if (!state.isInertiaActive) return;

    const elapsed = performance.now() - state.inertiaStartTime;
    // 终止条件：超时或速度过低
    if (elapsed > INERTIA_MAX_DURATION || Math.abs(state.inertiaVelocity) < INERTIA_STOP_VELOCITY) {
      state.isInertiaActive = false;
      state.inertiaVelocity = 0;
      state.inertiaRafId = null;
      // 惯性结束，恢复自动滚动：鼠标仍在 scroller 内时保持暂停
      // isHovering 由 animate 函数每帧通过 :hover 伪类更新，此处读取最近一帧的值
      state.isPaused = state.isDragging || state.isHovering || reduceMotion;
      return;
    }

    // 更新 offset
    state.offset = normalizeOffset(state.offset + state.inertiaVelocity);
    track.style.transform = `translateX(${state.offset}px)`;

    // 摩擦衰减：悬停时加速衰减，否则标准摩擦
    const friction = state.isPaused ? INERTIA_HOVER_ACCELERATE : INERTIA_FRICTION;
    state.inertiaVelocity *= friction;

    state.inertiaRafId = requestAnimationFrame(animateInertia);
  };

  /**
   * 启动物理惯性滑动
   * @param releaseVelocity 释放时的瞬时速度（px/帧，正负代表方向）
   * 速度低于 INERTIA_MIN_VELOCITY 不启用惯性
   */
  const startInertia = (releaseVelocity: number): void => {
    if (Math.abs(releaseVelocity) < INERTIA_MIN_VELOCITY) {
      // 慢速无惯性，直接恢复自动滚动
      state.isInertiaActive = false;
      state.inertiaVelocity = 0;
      return;
    }
    state.isInertiaActive = true;
    state.inertiaVelocity = releaseVelocity;
    state.inertiaStartTime = performance.now();
    // 惯性期间暂停自动滚动
    state.isPaused = true;
    if (state.inertiaRafId !== null) {
      cancelAnimationFrame(state.inertiaRafId);
    }
    state.inertiaRafId = requestAnimationFrame(animateInertia);
  };

  /**
   * 中键按下：开始拖拽
   * 仅响应鼠标中键（button === 1），preventDefault 阻止浏览器默认自动滚动光标行为
   * 立即捕获指针，确保拖拽中即使鼠标移出 scroller 仍能接收事件
   */
  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || e.button !== 1) return;
    // 阻止浏览器中键默认行为（自动滚动光标 / 新标签打开链接）
    e.preventDefault();
    // 拖拽开始时取消任何进行中的惯性
    if (state.inertiaRafId !== null) {
      cancelAnimationFrame(state.inertiaRafId);
      state.inertiaRafId = null;
    }
    state.isInertiaActive = false;
    state.inertiaVelocity = 0;
    state.isDragging = true;
    // pointerdown 时鼠标必然在 scroller 内，强制标记 isHovering = true
    // 防止页面加载时鼠标已在 scroller 内导致 mouseenter 未触发、isHovering 为 false
    state.isHovering = true;
    state.isPaused = true;
    startX = e.clientX;
    startOffset = state.offset;
    lastMoveTime = performance.now();
    lastMoveX = e.clientX;
    pointerId = e.pointerId;
    scroller.classList.add('is-dragging');
    // 中键专用于拖拽，立即捕获指针（无需像左键那样延迟以保护 click 派发）
    try {
      scroller.setPointerCapture(e.pointerId);
    } catch {
      // 安全降级
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!state.isDragging || e.pointerId !== pointerId) return;
    const dx = e.clientX - startX;

    // 手动更新 offset，实时跟手
    let newOffset = startOffset + dx;
    // 取模回绕，保持 offset 在 [-cardSetWidth, 0] 范围内
    newOffset = normalizeOffset(newOffset);
    state.offset = newOffset;
    track.style.transform = `translateX(${state.offset}px)`;

    // 速度追踪：基于最近一次 move 的位移与时间差计算瞬时速度（px/帧，约 16ms）
    const now = performance.now();
    const dt = now - lastMoveTime;
    if (dt > 0) {
      const moveDx = e.clientX - lastMoveX;
      // 换算为 px/帧（假设 60fps，1 帧 ≈ 16.67ms）
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
    // 启动物理惯性（慢速 < 2px/帧 时无惯性，由 startInertia 内部判断）
    startInertia(state.inertiaVelocity);

    // 若未启用惯性，恢复自动滚动：鼠标仍在 scroller 内时保持暂停
    // isHovering 由 animate 函数每帧通过 :hover 伪类更新，此处读取的是最近一帧的值
    // 下一帧 animate 会再次更新 isPaused，确保状态最终一致
    if (!state.isInertiaActive) {
      state.isPaused = state.isHovering || reduceMotion;
    }
  };

  // 中键按下时阻止默认的 mousedown 行为（部分浏览器在 pointerdown 之外仍触发自动滚动）
  scroller.addEventListener('mousedown', (e: MouseEvent) => {
    if (e.button === 1) e.preventDefault();
  });

  scroller.addEventListener('pointerdown', onPointerDown);
  scroller.addEventListener('pointermove', onPointerMove);
  scroller.addEventListener('pointerup', onPointerUp);
  scroller.addEventListener('pointercancel', onPointerUp);

  // ========== 导航按钮 ==========
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

        // 导航按钮：暂停自动滚动，平滑过渡到新 offset，然后恢复
        const wasPaused = state.isPaused;
        state.isPaused = true;
        const targetOffset = state.offset - dir * step;
        const startOffset = state.offset;
        const duration = 300; // ms
        const startTime = performance.now();

        const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3);

        const animateNav = (now: number): void => {
          const elapsed = now - startTime;
          const progress = Math.min(1, elapsed / duration);
          const eased = easeOut(progress);
          let newOffset = startOffset + (targetOffset - startOffset) * eased;
          // 取模回绕
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
            // 恢复自动滚动（仍处于首屏静止期时维持静止）
            state.isPaused =
              wasPaused || performance.now() < state.startAt;
          }
        };
        requestAnimationFrame(animateNav);
      });
    });
  }

  // ========== 触控板双指水平滑动 ==========
  // 触控板双指水平滑动触发 wheel 事件（deltaX），而非 pointer 事件
  // 当 deltaX 绝对值大于 deltaY 时认定为水平滑动，更新 offset 并暂停自动滚动
  const onWheel = (e: WheelEvent) => {
    // 仅处理水平为主的滑动（deltaX 绝对值大于 deltaY）
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    if (Math.abs(e.deltaX) < 2) return;
    e.preventDefault();
    // 暂停自动滚动，让用户手动控制
    state.isPaused = true;
    // 更新 offset（deltaX 为正表示向右滑动，track 应向左移动）
    state.offset = normalizeOffset(state.offset - e.deltaX);
    track.style.transform = `translateX(${state.offset}px)`;
  };
  scroller.addEventListener('wheel', onWheel, { passive: false });

  // ========== 响应窗口大小变化 ==========
  // 窗口大小变化时重新计算 cardSetWidth
  const handleResize = (): void => {
    state.cardSetWidth = measureCardSetWidth();
  };
  window.addEventListener('resize', handleResize);

  // ========== View Transitions 清理 ==========
  // 页面切换时取消动画帧（含自动滚动与物理惯性），避免内存泄漏
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

/**
 * 初始化所有横向滑动器
 */
function initScrollers(): void {
  const scrollers = document.querySelectorAll<HTMLElement>('[data-scroller]');
  scrollers.forEach((scroller, index) => {
    initScroller(scroller, index);
  });
}

// 初始化（首次加载与 View Transitions 后触发）
initHomeInteractions();
initScrollers();
// 卡片标题溢出检测与 marquee 启用（在 scroller 初始化含卡片克隆后执行）
initTextMarqueeWithResize('.card-title');
document.addEventListener('astro:page-load', () => {
  initHomeInteractions();
  initScrollers();
  initTextMarqueeWithResize('.card-title');
});
