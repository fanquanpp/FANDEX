/**
 * animations 工具单元测试
 *
 * 测试目标：覆盖 src/lib/animations.ts 中的 initAnimations 函数
 * - 为 .module-card 元素绑定 mouseenter / mouseleave 事件
 * - 为 a[href^="#"] 锚点绑定 click 事件并实现平滑滚动
 * - click 处理器在 href="#" 或目标不存在时安全跳过
 * - 为 #module-sidebar 添加 sidebar-animated 类
 *
 * 设计说明：
 * animations.ts 直接操作 document API，本测试通过 vi.stubGlobal 注入伪造的
 * document 对象与元素，验证事件绑定与回调逻辑。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

/** 伪造的元素：记录事件监听器与 DOM 操作 */
interface FakeElement {
  tagName: string;
  _listeners: Record<string, Array<(e: unknown) => void>>;
  _classList: Set<string>;
  href: string | null;
  textContent: string;
  scrollTop: number;
  getAttribute: (name: string) => string | null;
  setAttribute: (name: string, value: string) => void;
  addEventListener: (event: string, handler: (e: unknown) => void) => void;
  removeEventListener: (event: string, handler: (e: unknown) => void) => void;
  classList: {
    add: (cls: string) => void;
    remove: (cls: string) => void;
    contains: (cls: string) => boolean;
  };
  getBoundingClientRect: () => { top: number };
  scrollTo: (opts: { top: number; behavior: string }) => void;
  click: () => void;
  mouseenter: () => void;
  mouseleave: () => void;
}

/** 创建伪造元素 */
function makeFakeElement(
  options: {
    selector?: string;
    href?: string | null;
    asAnchor?: boolean;
  } = {}
): FakeElement {
  const listeners: Record<string, Array<(e: unknown) => void>> = {};
  const classSet = new Set<string>();
  const attrs: Record<string, string> = {};
  if (options.href !== undefined && options.href !== null) {
    attrs['href'] = options.href;
  }
  const el: FakeElement = {
    tagName: options.asAnchor ? 'A' : 'DIV',
    _listeners: listeners,
    _classList: classSet,
    href: options.href ?? null,
    textContent: '',
    scrollTop: 0,
    getAttribute: (name: string) => attrs[name] ?? null,
    setAttribute: (name: string, value: string) => {
      attrs[name] = value;
    },
    addEventListener: (event: string, handler: (e: unknown) => void) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
    },
    removeEventListener: (event: string, handler: (e: unknown) => void) => {
      const arr = listeners[event];
      if (!arr) return;
      const idx = arr.indexOf(handler);
      if (idx >= 0) arr.splice(idx, 1);
    },
    classList: {
      add: (cls: string) => classSet.add(cls),
      remove: (cls: string) => classSet.delete(cls),
      contains: (cls: string) => classSet.has(cls),
    },
    getBoundingClientRect: () => ({ top: 100 }),
    scrollTo: vi.fn(),
    click: () => {
      const handlers = listeners['click'] ?? [];
      const fakeEvent = {
        preventDefault: vi.fn(),
      };
      handlers.forEach((h) => h(fakeEvent));
    },
    mouseenter: () => {
      const handlers = listeners['mouseenter'] ?? [];
      handlers.forEach((h) => h({}));
    },
    mouseleave: () => {
      const handlers = listeners['mouseleave'] ?? [];
      handlers.forEach((h) => h({}));
    },
  };
  return el;
}

/** 模拟 document 对象 */
interface MockDocument {
  querySelectorAll: (selector: string) => FakeElement[];
  querySelector: (selector: string) => FakeElement | null;
  getElementById: (id: string) => FakeElement | null;
}

/** 构建测试用 mock document */
function buildMockDocument(opts: {
  cards?: FakeElement[];
  anchors?: FakeElement[];
  sidebar?: FakeElement | null;
  targetMap?: Record<string, FakeElement>;
  main?: FakeElement | null;
}): MockDocument {
  const targetMap = opts.targetMap ?? {};
  return {
    querySelectorAll: (selector: string) => {
      if (selector === '.module-card') return opts.cards ?? [];
      if (selector === 'a[href^="#"]') return opts.anchors ?? [];
      return [];
    },
    querySelector: (selector: string) => targetMap[selector] ?? null,
    getElementById: (id: string) => {
      if (id === 'module-sidebar') return opts.sidebar ?? null;
      if (id === 'app-main') return opts.main ?? null;
      return null;
    },
  };
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('initAnimations', () => {
  it('应为 .module-card 元素绑定 mouseenter 与 mouseleave 事件', async () => {
    const card = makeFakeElement();
    const mockDoc = buildMockDocument({ cards: [card] });
    vi.stubGlobal('document', mockDoc);

    const { initAnimations } = await import('@/lib/animations');
    initAnimations();

    expect(card._listeners['mouseenter']).toBeDefined();
    expect(card._listeners['mouseenter']!.length).toBeGreaterThan(0);
    expect(card._listeners['mouseleave']).toBeDefined();
    expect(card._listeners['mouseleave']!.length).toBeGreaterThan(0);
  });

  it('mouseenter 回调应添加 card-hovered 类，mouseleave 应移除', async () => {
    const card = makeFakeElement();
    const mockDoc = buildMockDocument({ cards: [card] });
    vi.stubGlobal('document', mockDoc);

    const { initAnimations } = await import('@/lib/animations');
    initAnimations();

    card.mouseenter();
    expect(card._classList.has('card-hovered')).toBe(true);

    card.mouseleave();
    expect(card._classList.has('card-hovered')).toBe(false);
  });

  it('应为 a[href^="#"] 锚点绑定 click 事件', async () => {
    const anchor = makeFakeElement({ asAnchor: true, href: '#section-1' });
    const mockDoc = buildMockDocument({ anchors: [anchor] });
    vi.stubGlobal('document', mockDoc);

    const { initAnimations } = await import('@/lib/animations');
    initAnimations();

    expect(anchor._listeners['click']).toBeDefined();
    expect(anchor._listeners['click']!.length).toBeGreaterThan(0);
  });

  it('click 回调在 href="#" 时应提前返回不触发滚动', async () => {
    const anchor = makeFakeElement({ asAnchor: true, href: '#' });
    const target = makeFakeElement();
    const main = makeFakeElement();
    const mockDoc = buildMockDocument({
      anchors: [anchor],
      targetMap: { '#': target },
      main,
    });
    vi.stubGlobal('document', mockDoc);

    const { initAnimations } = await import('@/lib/animations');
    initAnimations();

    // click 不应抛错，也不应触发滚动
    anchor.click();
    expect(main.scrollTo).not.toHaveBeenCalled();
  });

  it('click 回调在目标元素不存在时应安全跳过', async () => {
    const anchor = makeFakeElement({ asAnchor: true, href: '#missing' });
    const main = makeFakeElement();
    const mockDoc = buildMockDocument({
      anchors: [anchor],
      targetMap: {}, // 目标不存在
      main,
    });
    vi.stubGlobal('document', mockDoc);

    const { initAnimations } = await import('@/lib/animations');
    initAnimations();

    anchor.click();
    expect(main.scrollTo).not.toHaveBeenCalled();
  });

  it('click 回调在目标存在且 #app-main 可用时应触发 scrollTo', async () => {
    const anchor = makeFakeElement({ asAnchor: true, href: '#target' });
    const target = makeFakeElement();
    const main = makeFakeElement();
    const mockDoc = buildMockDocument({
      anchors: [anchor],
      targetMap: { '#target': target },
      main,
    });
    vi.stubGlobal('document', mockDoc);

    const { initAnimations } = await import('@/lib/animations');
    initAnimations();

    anchor.click();
    expect(main.scrollTo).toHaveBeenCalledTimes(1);
    expect(main.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));
  });

  it('应为 #module-sidebar 元素添加 sidebar-animated 类', async () => {
    const sidebar = makeFakeElement();
    const mockDoc = buildMockDocument({ sidebar });
    vi.stubGlobal('document', mockDoc);

    const { initAnimations } = await import('@/lib/animations');
    initAnimations();

    expect(sidebar._classList.has('sidebar-animated')).toBe(true);
  });

  it('当 #module-sidebar 不存在时不应抛错', async () => {
    const mockDoc = buildMockDocument({ sidebar: null });
    vi.stubGlobal('document', mockDoc);

    const { initAnimations } = await import('@/lib/animations');
    expect(() => initAnimations()).not.toThrow();
  });
});
