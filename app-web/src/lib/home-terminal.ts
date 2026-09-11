/**
 * 首页 Hero 终端模拟（工业科幻品牌签名）
 * -----------------------------------------------------------------------------
 * 职责：
 * - 在 .hero-terminal 面板内逐字输出一段初始化序列，营造"开机自检"仪式感
 * - 输出中的模块/文档数从页面 .stat-num[data-countup] 实时读取，不硬编码，
 *   与统计区永远一致，内容更新零维护
 * - prefers-reduced-motion: reduce 时跳过逐字动画，直接静态显示全文
 *
 * 实现要点：
 * - 逐字输出用 setTimeout 链驱动（字符间隔约 18ms，行间停顿 260ms），
 *   结束后追加闪烁块光标（光标闪烁由 CSS 动画承担）
 * - astro:page-load 重绑（dataset 标记防重入）；astro:before-swap 清理定时器，
 *   避免 View Transitions 切页后定时器写入已脱离文档的节点
 * - 顶层执行以 SSR 守卫包裹，避免构建期求值报错
 */

/** 每个字符的输出间隔（毫秒） */
const CHAR_INTERVAL_MS = 18;

/** 每行输出完成后的停顿（毫秒） */
const LINE_PAUSE_MS = 260;

/** 首行输出前的等待（毫秒），与首页入场动画时序衔接 */
const START_DELAY_MS = 600;

/** 终端输出内容构建：从页面统计元素读取实时数字 */
function buildLines(): string[] {
  const nums = Array.from(
    document.querySelectorAll<HTMLElement>('.hero-stats .stat-num[data-countup]'),
  ).map((el) => el.getAttribute('data-countup') || el.textContent?.trim() || '0');
  const modules = nums[0] ?? '0';
  const docs = nums[1] ?? '0';
  return [
    '$ fandex init --learner guest',
    `> index.scan      modules: ${modules}  docs: ${docs}`,
    '> paths.resolve   3 entries loaded',
    '> ready. pick a module and start_',
  ];
}

/** 单个终端实例的清理句柄 */
interface TerminalHandle {
  timer: number | null;
  onBeforeSwap: () => void;
}

/** 绑定单个终端面板，返回清理句柄 */
function bindTerminal(root: HTMLElement): TerminalHandle | null {
  const codeEl = root.querySelector('code');
  if (!codeEl) return null;
  // 防重入：已初始化的面板直接跳过
  if (root.dataset.terminalBound === 'true') return null;
  root.dataset.terminalBound = 'true';

  const lines = buildLines();
  const fullText = lines.join('\n');

  // 减少动效偏好：跳过逐字动画，静态显示全文（光标由 CSS 保持闪烁）
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) {
    codeEl.textContent = fullText;
    return null;
  }

  codeEl.textContent = '';

  let line = 0;
  let char = 0;
  let timer: number | null = null;

  /** 逐步输出：字符间隔 CHAR_INTERVAL_MS，行尾停顿 LINE_PAUSE_MS */
  const tick = (): void => {
    // noUncheckedIndexedAccess：数组索引访问返回 string | undefined，需显式收窄
    const current = lines[line];
    if (current === undefined) return;
    char += 1;
    codeEl.textContent = lines.slice(0, line).join('\n') + '\n' + current.slice(0, char);
    if (char >= current.length) {
      line += 1;
      char = 0;
      timer = window.setTimeout(tick, line >= lines.length ? 0 : LINE_PAUSE_MS);
    } else {
      timer = window.setTimeout(tick, CHAR_INTERVAL_MS);
    }
  };
  timer = window.setTimeout(tick, START_DELAY_MS);

  /** View Transitions 切页清理：终止输出链 */
  const onBeforeSwap = (): void => {
    if (timer !== null) window.clearTimeout(timer);
    document.removeEventListener('astro:before-swap', onBeforeSwap);
  };
  document.addEventListener('astro:before-swap', onBeforeSwap);

  return { timer, onBeforeSwap };
}

/** 初始化页面内所有终端面板 */
function initHeroTerminal(): void {
  document.querySelectorAll<HTMLElement>('.hero-terminal[data-terminal], .hero-terminal').forEach(
    (root) => {
      bindTerminal(root);
    },
  );
}

// 浏览器环境守卫（Astro 预渲染期不求值）
if (!import.meta.env.SSR && typeof document !== 'undefined') {
  initHeroTerminal();
  document.addEventListener('astro:page-load', initHeroTerminal);
}
