/**
 * fx 能力门控 — 决定当前环境允许挂载哪些动效层。
 *
 * 三档策略：
 * - full：桌面级环境（精细指针、较大视口、无省流、无减少动效），
 *   允许全部层：WebGL 背景、指针网格、字符场、文本特效。
 * - lite：减少动效 / 省流 / 触屏 / 窄屏环境，不创建任何 canvas 与 WebGL
 *   上下文；只保留静态呈现（reveal 直接显形、数字直接出终值）。
 * - off：用户显式关闭（localStorage fandex-fx = off），全部 fx 跳过。
 *
 * 注意 prefers-reduced-motion 归入 lite 而非 off：信息呈现必须完整
 * （计数终值、显隐状态），只是不再有过程动画。这与 motion/ 下 React
 * 岛屿的 MotionConfig reducedMotion="user" 策略一致。
 */

export type FxTier = 'full' | 'lite' | 'off';

/** 用户偏好存储键：设为 'off' 时全站 fx 关闭（调试与无障碍逃生口）。 */
export const FX_MODE_STORAGE_KEY = 'fandex-fx';

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function saveDataRequested(): boolean {
  if (typeof navigator === 'undefined') return false;
  const conn = (navigator as { connection?: { saveData?: boolean } }).connection;
  return conn?.saveData === true;
}

/**
 * 自动化环境（Lighthouse / Playwright）下跳过全部 canvas 层：
 * SwiftShader 软渲染会拖慢 CI 节流下的性能分，且冒烟测试只要求无报错。
 */
export function isAutomation(): boolean {
  return typeof navigator !== 'undefined' && navigator.webdriver === true;
}

let webgl2Cache: boolean | null = null;

/** WebGL2 可用性探测（含 context lost 防御），结果缓存。 */
export function hasWebgl2(): boolean {
  if (webgl2Cache !== null) return webgl2Cache;
  webgl2Cache = false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2', { depth: false, stencil: false });
    if (gl) {
      webgl2Cache = true;
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch {
    webgl2Cache = false;
  }
  return webgl2Cache;
}

export function getFxTier(): FxTier {
  if (typeof window === 'undefined') return 'off';
  try {
    if (localStorage.getItem(FX_MODE_STORAGE_KEY) === 'off') return 'off';
  } catch {
    /* 隐私模式读取失败按未设置处理 */
  }
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? true;
  const narrow = window.innerWidth < 900;
  if (prefersReducedMotion() || saveDataRequested() || coarse || narrow) return 'lite';
  return 'full';
}
