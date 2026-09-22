
const CHAR_INTERVAL_MS = 18;

const LINE_PAUSE_MS = 260;

const START_DELAY_MS = 600;

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
    '> ready. pick a module and start',
  ];
}

interface TerminalHandle {
  timer: number | null;
  onBeforeSwap: () => void;
}

function bindTerminal(root: HTMLElement): TerminalHandle | null {
  const codeEl = root.querySelector<HTMLElement>('[data-terminal-log]');
  const inputEl = root.querySelector<HTMLInputElement>('[data-terminal-input]');
  if (!codeEl || !inputEl) return null;
  if (root.dataset.terminalBound === 'true') return null;
  root.dataset.terminalBound = 'true';

  const lines = buildLines();
  const bodyLines = lines.slice(0, -1);
  const promptLine = lines[lines.length - 1] ?? '';

  const focusInput = (): void => {
    inputEl.focus({ preventScroll: true });
  };

  const SCROLL_KEYS = new Set(['PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown', ' ']);

  const onInputKeyDown = (event: KeyboardEvent): void => {
    if (!SCROLL_KEYS.has(event.key)) return;
    const target: Element | null = root.closest('main') ?? document.scrollingElement;
    if (!target) return;
    event.preventDefault();
    const step = target.clientHeight * 0.9;
    if (event.key === 'PageDown' || event.key === ' ') {
      target.scrollBy({ top: step });
    } else if (event.key === 'PageUp') {
      target.scrollBy({ top: -step });
    } else if (event.key === 'Home') {
      target.scrollTo({ top: 0 });
    } else if (event.key === 'End') {
      target.scrollTo({ top: target.scrollHeight });
    } else {
      target.scrollBy({ top: event.key === 'ArrowDown' ? 80 : -80 });
    }
  };
  inputEl.addEventListener('keydown', onInputKeyDown);

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) {
    codeEl.textContent = bodyLines.join('\n');
    inputEl.value = promptLine;
    focusInput();
    return null;
  }

  codeEl.textContent = '';
  inputEl.value = '';

  let line = 0;
  let char = 0;
  let timer: number | null = null;

  const tick = (): void => {
    if (line >= bodyLines.length) {
      if (!promptLine) return;
      char += 1;
      inputEl.value = promptLine.slice(0, char);
      if (char >= promptLine.length) return;
      timer = window.setTimeout(tick, CHAR_INTERVAL_MS);
      return;
    }
    const current = bodyLines[line];
    if (current === undefined) return;
    char += 1;
    codeEl.textContent =
      bodyLines.slice(0, line).join('\n') + '\n' + current.slice(0, char);
    if (char >= current.length) {
      line += 1;
      char = 0;
      timer = window.setTimeout(tick, line >= bodyLines.length ? 0 : LINE_PAUSE_MS);
    } else {
      timer = window.setTimeout(tick, CHAR_INTERVAL_MS);
    }
  };
  focusInput();
  timer = window.setTimeout(tick, START_DELAY_MS);

  const onRootClick = (): void => focusInput();
  root.addEventListener('click', onRootClick);

  const onBeforeSwap = (): void => {
    if (timer !== null) window.clearTimeout(timer);
    inputEl.removeEventListener('keydown', onInputKeyDown);
    root.removeEventListener('click', onRootClick);
    document.removeEventListener('astro:before-swap', onBeforeSwap);
  };
  document.addEventListener('astro:before-swap', onBeforeSwap);

  return { timer, onBeforeSwap };
}

function initHeroTerminal(): void {
  document.querySelectorAll<HTMLElement>('.hero-terminal[data-terminal], .hero-terminal').forEach(
    (root) => {
      bindTerminal(root);
    },
  );
}

if (!import.meta.env.SSR && typeof document !== 'undefined') {
  initHeroTerminal();
  document.addEventListener('astro:page-load', initHeroTerminal);
}
