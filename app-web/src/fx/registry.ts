/**
 * fx 注册表 — 动效组件化的核心。
 *
 * 两种挂载方式：
 * - 命名挂载：元素标 `data-fx="cursor-grid letter-field"`（空格分隔多值），
 *   注册表按名分发。
 * - 选择器挂载：registerFx 提供 selector（如计数器 `.stat-num[data-countup]`），
 *   mountFxTree 全树扫描，适合历史属性兼容。
 *
 * 每个挂载必须幂等：mountFxTree 会在 astro:page-load 反复触发，用宿主上的
 * `data-fx-mounted` 标记（可序列化、克隆后可见、DOM 可查）防重复绑定。
 * mount 返回的清理函数在 astro:before-swap 统一回收，页面级 rAF、监听器、
 * 定时器不得越过页面生命周期存活。
 */

export type FxDispose = () => void;

export type FxMount = (host: HTMLElement) => void | FxDispose;

interface FxEntry {
  mount: FxMount;
  selector?: string;
}

const registry = new Map<string, FxEntry>();

/** 已挂载实例的清理句柄；swap 时全部回收。 */
const liveDisposers = new Set<FxDispose>();

export function registerFx(name: string, mount: FxMount, selector?: string): void {
  registry.set(name, selector ? { mount, selector } : { mount });
}

export function getFxEntry(name: string): FxEntry | undefined {
  return registry.get(name);
}

function isMounted(host: HTMLElement, name: string): boolean {
  const mounted = host.dataset.fxMounted ?? '';
  return mounted.split(/\s+/).includes(name);
}

function markMounted(host: HTMLElement, name: string): void {
  const mounted = host.dataset.fxMounted ?? '';
  host.dataset.fxMounted = mounted ? `${mounted} ${name}` : name;
}

function bind(host: HTMLElement, name: string): void {
  const entry = registry.get(name);
  if (!entry || isMounted(host, name)) return;
  try {
    const dispose = entry.mount(host);
    if (dispose) liveDisposers.add(dispose);
  } catch (error) {
    // 单个特效挂载失败不拖垮页面（Playwright 冒烟要求零未捕获异常）
    console.error(`[fx] 挂载 ${name} 失败`, error);
  }
  markMounted(host, name);
}

/** 扫描并挂载 root 下全部已注册特效（幂等，可反复调用）。 */
export function mountFxTree(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-fx]').forEach((host) => {
    for (const name of (host.dataset.fx ?? '').split(/\s+/)) {
      if (name) bind(host, name);
    }
  });
  for (const [name, entry] of registry) {
    if (!entry.selector || name.includes(' ')) continue;
    root.querySelectorAll<HTMLElement>(entry.selector).forEach((host) => bind(host, name));
  }
}

/** 回收全部已挂载实例（astro:before-swap 调用）。 */
export function unmountAllFx(): void {
  for (const dispose of liveDisposers) {
    try {
      dispose();
    } catch (error) {
      console.error('[fx] 清理失败', error);
    }
  }
  liveDisposers.clear();
}
