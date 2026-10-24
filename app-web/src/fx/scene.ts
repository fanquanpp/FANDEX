/**
 * fx 场景令牌读取 — canvas 层与 CSS 之间的桥梁。
 *
 * 场景颜色定义在 variables.css 的 --fx-scene-* 令牌（随 data-theme 切换），
 * WebGL uniform 只认数值，这里负责把 CSS 变量解析为 [r, g, b]（0-1）。
 * 解析用 canvas fillStyle 探针：hex / rgb() / color-mix() 一律经浏览器归一。
 *
 * 主题切换沿用全局约定：theme.ts 派发 fandex:themechange 事件；
 * 另挂 data-theme 属性 MutationObserver 兜底，双通道只触发一次回调。
 */

type Rgb = [number, number, number];

let probe: CanvasRenderingContext2D | null | undefined;

function styleProbe(): CanvasRenderingContext2D | null {
  if (probe !== undefined) return probe;
  try {
    probe = document.createElement('canvas').getContext('2d');
  } catch {
    probe = null;
  }
  return probe;
}

function parseCssColor(raw: string, fallback: Rgb): Rgb {
  const value = raw.trim();
  if (!value) return fallback;
  if (/^#[0-9a-fA-F]{6}$/.test(value)) {
    const num = Number.parseInt(value.slice(1), 16);
    return [((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255];
  }
  const ctx = styleProbe();
  if (!ctx) return fallback;
  try {
    ctx.fillStyle = '#000000';
    ctx.fillStyle = value;
    const normalized = ctx.fillStyle;
    if (typeof normalized === 'string' && normalized.startsWith('#')) {
      return parseCssColor(normalized, fallback);
    }
  } catch {
    return fallback;
  }
  return fallback;
}

export function readSceneColor(name: string, fallback: Rgb): Rgb {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
  return parseCssColor(raw, fallback);
}

/**
 * 读取空格分隔的多色令牌（如 --fx-ambient-accents: #00E5FF #00D6C7），
 * 逐色归一；令牌缺失时返回空数组，由调用方决定兜底色板。
 */
export function readSceneColorList(name: string, fallback: Rgb): Rgb[] {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!raw) return [];
  return raw.split(/\s+/).map((entry) => parseCssColor(entry, fallback));
}

const themeListeners = new Set<() => void>();
let themeBound = false;

function bindThemeChannel(): void {
  if (themeBound || typeof document === 'undefined') return;
  themeBound = true;
  document.addEventListener('fandex:themechange', () => {
    for (const listener of themeListeners) listener();
  });
  // 兜底：直接改 data-theme 而未经 theme.ts 的路径（如历史脚本）
  new MutationObserver(() => {
    for (const listener of themeListeners) listener();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}

/** 订阅主题变化（含首帧外的任何 data-theme 切换），返回退订函数。 */
export function onThemeChange(listener: () => void): () => void {
  bindThemeChannel();
  themeListeners.add(listener);
  return () => themeListeners.delete(listener);
}
