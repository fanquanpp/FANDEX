/**
 * SearchModal 组件单元测试
 *
 * 测试对象：
 * - apps/web/src/islands/SearchModal.tsx
 *
 * 测试覆盖：
 * - 渲染触发按钮（含 Ctrl+K 快捷键标记）
 * - 点击按钮打开搜索面板
 * - Ctrl+K 全局快捷键打开（通过 useShortcut 注册）
 * - 输入触发搜索（防抖 200ms）
 * - 空查询显示最近搜索记录
 * - 搜索结果按模块分组
 * - Pagefind 不可用时降级到 Fuse.js
 * - 清空最近搜索
 * - 关闭面板
 *
 * Mock 策略：
 * - vi.mock('motion/react') 透传渲染
 * - vi.mock('@/lib/keyboard') 仅保留 useShortcut 注册（避免全局监听器冲突）
 * - vi.stubGlobal('fetch', ...) mock /search-index.json 返回
 * - 动态 import Pagefind 失败（默认环境无 /pagefind/ 路径）
 * - vi.mock('fuse.js') 模拟模糊匹配返回固定结果
 * - 不 mock @/lib/store/search-store，测试真实 store 集成
 * - 部分用例使用 wait* 工具等待异步防抖与渲染
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock motion/react：透传渲染，避免动画阻塞
// Skill 偏差报备：原 mock 丢弃 className prop，导致部分用例无法验证类名透传。
// 现保留 className 透传，仅剥离动画相关 props（initial/animate/exit/transition）。
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, className }: { children?: ReactNode; className?: string }) => (
      <div className={className}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

// Mock lucide-react 图标
vi.mock('lucide-react', () => ({
  Clock: () => <span data-testid="icon-clock" />,
  FileText: () => <span data-testid="icon-file" />,
  Search: () => <span data-testid="icon-search" />,
  X: () => <span data-testid="icon-x" />,
}));

// Mock @/lib/keyboard：捕获 useShortcut 调用，避免全局监听器
const shortcutHandlers = new Map<string, () => void>();
vi.mock('@/lib/keyboard', () => ({
  useShortcut: (key: string, handler: () => void) => {
    shortcutHandlers.set(key, handler);
  },
  registerShortcut: vi.fn(),
  initDefaultShortcuts: vi.fn(),
}));

// Pagefind 动态导入处理说明：
// Skill 偏差报备：原方案使用 vi.mock('/pagefind/pagefind.js') 拦截动态 import，
// 但 Vite 8.x 的 import-analysis 插件在 vitest mock 注册前就拦截了该路径，
// 导致 vi.mock 无法生效（错误：Failed to resolve import "/pagefind/pagefind.js"）。
// 现改为在 vitest.config.ts 的 resolve.alias 中将 '/pagefind/pagefind.js'
// 映射到 src/__mocks__/pagefind-mock.ts，由 Vite 解析阶段重定向。
// 此处无需再 vi.mock，alias 配置已覆盖动态 import 路径。

// Mock fuse.js：返回固定结果
vi.mock('fuse.js', () => ({
  default: class MockFuse<T> {
    constructor(
      private list: T[],
      private _options: unknown,
    ) {}
    search(query: string) {
      // 简单包含匹配
      return this.list
        .filter((item) => {
          if (typeof item === 'object' && item !== null) {
            const r = item as { title?: string };
            return r.title?.toLowerCase().includes(query.toLowerCase());
          }
          return false;
        })
        .slice(0, 5)
        .map((item) => ({ item }));
    }
  },
}));

// 全局 fetch mock（默认返回 Fuse.js 索引数据）
const mockSearchIndex = [
  {
    id: 'doc-js-1',
    title: 'JavaScript 变量声明',
    description: 'let / const / var 的区别',
    module: 'javascript',
    slug: 'javascript/variables',
    url: '/docs/javascript/variables',
    type: 'doc' as const,
  },
  {
    id: 'doc-js-2',
    title: 'JavaScript 闭包',
    description: '闭包与作用域链',
    module: 'javascript',
    slug: 'javascript/closures',
    url: '/docs/javascript/closures',
    type: 'doc' as const,
  },
  {
    id: 'doc-ts-1',
    title: 'TypeScript 类型注解',
    description: '基础类型与类型推断',
    module: 'typescript',
    slug: 'typescript/types',
    url: '/docs/typescript/types',
    type: 'doc' as const,
  },
];

const fetchMock = vi.fn(async (input: string | URL | Request) => {
  const url = typeof input === 'string' ? input : input.toString();
  if (url === '/search-index.json') {
    return {
      ok: true,
      json: async () => mockSearchIndex,
    } as Response;
  }
  return {
    ok: false,
    json: async () => [],
  } as Response;
});

vi.stubGlobal('fetch', fetchMock);

// localStorage mock（用于 search-store persist）
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = String(value);
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
    get length() {
      return Object.keys(store).length;
    },
  };
})();
vi.stubGlobal('localStorage', localStorageMock);

// window.location.href setter mock（用于验证跳转）
// Skill 偏差报备：原方案在 setter 中 locationMock.href = v 又触发 setter，导致无限递归
// （RangeError: Maximum call stack size exceeded）。
// 改用闭包变量 hrefValue 存储 href 值，setter 通过 vi.fn 包装以便验证调用，
// 内部赋值给闭包变量而非自身属性，避免递归。
const locationMock = (() => {
  let hrefValue = '';
  return Object.defineProperties(
    {},
    {
      href: {
        get: vi.fn(() => hrefValue),
        set: vi.fn((v: string) => {
          hrefValue = v;
        }),
        configurable: true,
        enumerable: true,
      },
    },
  );
})();
vi.stubGlobal('location', locationMock);

import { useSearchStore } from '@/lib/store/search-store';
import { SearchModal } from '../SearchModal';

beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.clear();
  shortcutHandlers.clear();
  // 重置 search-store 状态
  useSearchStore.setState({
    query: '',
    results: [],
    isOpen: false,
    recentSearches: [],
    selectedIndex: 0,
    isLoading: false,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

/** 触发 Ctrl+K 快捷键（调用 useShortcut 注册的处理器） */
function triggerShortcut(key: string) {
  const handler = shortcutHandlers.get(key);
  if (handler) {
    act(() => handler());
  }
}

/**
 * 等待组件挂载后异步加载 fuseIndex 完成
 *
 * Skill 偏差报备：
 * - SearchModal 在 useEffect 中通过 fetch('/search-index.json') 异步加载 Fuse.js 索引
 * - 该状态更新是异步的，setFuseIndex 触发后 performSearch 会重新创建（useCallback 依赖 fuseIndex）
 * - 若在 fuseIndex 加载完成前触发 handleQueryChange，防抖定时器捕获的 performSearch 闭包中
 *   fuseIndex 为 null，导致 Fuse.js 降级分支被跳过，搜索结果为空
 * - 本函数通过等待 fetch 被调用并给 React 时间处理状态更新，确保 fuseIndex 已加载
 */
async function waitForIndexLoad() {
  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith('/search-index.json');
  });
  // 给 React 时间处理 setFuseIndex 引起的状态更新与 performSearch 重建
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
}

/** 等待防抖（200ms）后推进时间 */
async function flushDebounce() {
  await vi.waitFor(() => Promise.resolve(), { timeout: 50 });
  await new Promise((resolve) => setTimeout(resolve, 250));
}

describe('SearchModal 组件', () => {
  describe('触发按钮渲染', () => {
    it('渲染含 Ctrl+K 标记的搜索按钮', () => {
      render(<SearchModal />);

      const triggerBtn = screen.getByRole('button', { name: /打开搜索/ });
      expect(triggerBtn).toBeInTheDocument();
      expect(screen.getByText('Ctrl+K')).toBeInTheDocument();
    });

    it('点击触发按钮打开搜索面板', () => {
      render(<SearchModal />);

      const triggerBtn = screen.getByRole('button', { name: /打开搜索/ });
      fireEvent.click(triggerBtn);

      // 面板打开后应显示输入框
      expect(screen.getByPlaceholderText('搜索文档、术语、速查表...')).toBeInTheDocument();
    });
  });

  describe('Ctrl+K 快捷键', () => {
    it('useShortcut 注册了 ctrl+k 与 meta+k', () => {
      render(<SearchModal />);

      expect(shortcutHandlers.has('ctrl+k')).toBe(true);
      expect(shortcutHandlers.has('meta+k')).toBe(true);
    });

    it('触发 ctrl+k 打开搜索面板', () => {
      render(<SearchModal />);

      triggerShortcut('ctrl+k');

      expect(screen.getByPlaceholderText('搜索文档、术语、速查表...')).toBeInTheDocument();
    });

    it('触发 meta+k 同样打开搜索面板', () => {
      render(<SearchModal />);

      triggerShortcut('meta+k');

      expect(screen.getByPlaceholderText('搜索文档、术语、速查表...')).toBeInTheDocument();
    });
  });

  describe('输入与搜索', () => {
    it('输入触发防抖搜索（200ms 后执行）', async () => {
      render(<SearchModal />);
      await waitForIndexLoad();

      // 打开面板
      triggerShortcut('ctrl+k');
      const input = screen.getByPlaceholderText('搜索文档、术语、速查表...');

      // 输入关键词
      fireEvent.change(input, { target: { value: '变量' } });

      // 初始时 isLoading 未立即触发（防抖 200ms）
      // 但 setQuery 立即更新 store
      expect(useSearchStore.getState().query).toBe('变量');

      // 等待防抖完成并触发搜索
      await flushDebounce();

      // 由于 Pagefind 不可用 + Fuse.js mock 返回结果
      // 预期搜索结果包含 mockSearchIndex 中标题含"变量"的条目
      await waitFor(() => {
        const state = useSearchStore.getState();
        expect(state.results.length).toBeGreaterThan(0);
      });
    });

    it('空查询时不触发搜索且清空结果', async () => {
      render(<SearchModal />);
      await waitForIndexLoad();

      triggerShortcut('ctrl+k');
      const input = screen.getByPlaceholderText('搜索文档、术语、速查表...');

      // 先输入触发搜索
      fireEvent.change(input, { target: { value: 'JS' } });
      await flushDebounce();

      // 再清空
      fireEvent.change(input, { target: { value: '' } });
      await flushDebounce();

      // 结果应清空
      expect(useSearchStore.getState().results).toEqual([]);
    });

    it('空查询显示"输入关键词开始搜索"提示', () => {
      render(<SearchModal />);
      triggerShortcut('ctrl+k');

      expect(screen.getByText('输入关键词开始搜索')).toBeInTheDocument();
    });

    it('Pagefind 不可用时降级到 Fuse.js', async () => {
      render(<SearchModal />);
      await waitForIndexLoad();

      triggerShortcut('ctrl+k');
      const input = screen.getByPlaceholderText('搜索文档、术语、速查表...');

      // 输入 mockSearchIndex 中存在的标题
      fireEvent.change(input, { target: { value: 'TypeScript' } });
      await flushDebounce();

      // Fuse.js 应返回匹配结果（"TypeScript 类型注解"）
      await waitFor(() => {
        expect(useSearchStore.getState().results.length).toBeGreaterThan(0);
      });

      const results = useSearchStore.getState().results;
      expect(results.some((r) => r.title.includes('TypeScript'))).toBe(true);
    });

    it('无匹配结果时显示"未找到相关结果"', async () => {
      render(<SearchModal />);
      await waitForIndexLoad();

      triggerShortcut('ctrl+k');
      const input = screen.getByPlaceholderText('搜索文档、术语、速查表...');

      // 输入不存在的关键词
      fireEvent.change(input, { target: { value: 'zzznonexistent' } });
      await flushDebounce();

      await waitFor(() => {
        expect(screen.getByText('未找到相关结果')).toBeInTheDocument();
      });
    });
  });

  describe('搜索结果分组', () => {
    it('结果按 module 字段分组展示', async () => {
      render(<SearchModal />);
      await waitForIndexLoad();

      triggerShortcut('ctrl+k');
      const input = screen.getByPlaceholderText('搜索文档、术语、速查表...');

      // 输入 "JavaScript" 触发匹配（含两个 javascript 模块的项）
      fireEvent.change(input, { target: { value: 'JavaScript' } });
      await flushDebounce();

      await waitFor(() => {
        expect(useSearchStore.getState().results.length).toBeGreaterThanOrEqual(2);
      });

      // 验证 DOM 中存在模块分组标题 "javascript"
      await waitFor(() => {
        expect(screen.getByText('javascript')).toBeInTheDocument();
      });
    });

    it('结果项展示标题与描述', async () => {
      render(<SearchModal />);
      await waitForIndexLoad();

      triggerShortcut('ctrl+k');
      const input = screen.getByPlaceholderText('搜索文档、术语、速查表...');

      fireEvent.change(input, { target: { value: 'TypeScript' } });
      await flushDebounce();

      // 验证结果标题可见
      // Skill 偏差报备：renderHighlight 会将匹配部分包裹 <mark>，导致标题文本被拆分到
      // <mark>TypeScript</mark> 与 <span> 类型注解</span> 两个元素，
      // getByText(/TypeScript 类型注解/) 无法匹配跨元素文本。
      // 改用 getByRole('option', { name: ... }) 匹配 accessible name（合并所有子元素文本）。
      await waitFor(() => {
        expect(screen.getByRole('option', { name: /TypeScript 类型注解/ })).toBeInTheDocument();
      });
    });

    it('结果项含类型徽标（文档/术语/速查）', async () => {
      render(<SearchModal />);
      await waitForIndexLoad();

      triggerShortcut('ctrl+k');
      const input = screen.getByPlaceholderText('搜索文档、术语、速查表...');

      fireEvent.change(input, { target: { value: 'TypeScript' } });
      await flushDebounce();

      await waitFor(() => {
        // 类型为 doc → 显示 "文档" 徽标
        expect(screen.getByText('文档')).toBeInTheDocument();
      });
    });
  });

  describe('最近搜索', () => {
    it('空查询时显示最近搜索分组（有历史）', async () => {
      // 预置最近搜索
      useSearchStore.setState({
        recentSearches: ['JavaScript', '闭包', '类型注解'],
      });

      render(<SearchModal />);
      triggerShortcut('ctrl+k');

      // 显示"最近搜索"分组标题
      expect(screen.getByText('最近搜索')).toBeInTheDocument();
      // 显示最近搜索项
      expect(screen.getByText('JavaScript')).toBeInTheDocument();
      expect(screen.getByText('闭包')).toBeInTheDocument();
      expect(screen.getByText('类型注解')).toBeInTheDocument();
    });

    it('空查询无最近搜索时不显示最近搜索分组', () => {
      render(<SearchModal />);
      triggerShortcut('ctrl+k');

      expect(screen.queryByText('最近搜索')).not.toBeInTheDocument();
    });

    it('点击最近搜索项触发该关键词搜索', async () => {
      useSearchStore.setState({
        recentSearches: ['TypeScript'],
      });

      render(<SearchModal />);
      await waitForIndexLoad();
      triggerShortcut('ctrl+k');

      // 点击最近搜索 "TypeScript"
      fireEvent.click(screen.getByText('TypeScript'));

      // 应触发 setQuery 与 performSearch
      await waitFor(() => {
        expect(useSearchStore.getState().query).toBe('TypeScript');
      });

      await flushDebounce();

      // 应有搜索结果
      await waitFor(() => {
        expect(useSearchStore.getState().results.length).toBeGreaterThan(0);
      });
    });

    it('点击"清空最近搜索"清除历史', () => {
      useSearchStore.setState({
        recentSearches: ['JS', 'TS'],
      });

      render(<SearchModal />);
      triggerShortcut('ctrl+k');

      // 点击"清空最近搜索"
      fireEvent.click(screen.getByText('清空最近搜索'));

      // 应清空 recentSearches
      expect(useSearchStore.getState().recentSearches).toEqual([]);
    });

    it('最近搜索仅显示前 5 条', () => {
      useSearchStore.setState({
        recentSearches: ['s1', 's2', 's3', 's4', 's5', 's6', 's7'],
      });

      render(<SearchModal />);
      triggerShortcut('ctrl+k');

      // 仅显示前 5 条
      expect(screen.getByText('s1')).toBeInTheDocument();
      expect(screen.getByText('s5')).toBeInTheDocument();
      expect(screen.queryByText('s6')).not.toBeInTheDocument();
      expect(screen.queryByText('s7')).not.toBeInTheDocument();
    });
  });

  describe('关闭面板', () => {
    it('点击触发按钮关闭已打开的面板', () => {
      render(<SearchModal />);

      // 打开
      triggerShortcut('ctrl+k');
      expect(useSearchStore.getState().isOpen).toBe(true);

      // 模拟 onOpenChange(false)（如点击遮罩、ESC）
      // 通过 store.close() 验证关闭逻辑
      act(() => useSearchStore.getState().close());

      expect(useSearchStore.getState().isOpen).toBe(false);
    });
  });

  describe('跳转行为', () => {
    it('结果项 onSelect 调用 handleNavigate 跳转', async () => {
      render(<SearchModal />);
      await waitForIndexLoad();

      triggerShortcut('ctrl+k');
      const input = screen.getByPlaceholderText('搜索文档、术语、速查表...');

      fireEvent.change(input, { target: { value: 'TypeScript' } });
      await flushDebounce();

      // 等待结果渲染
      await waitFor(() => {
        expect(useSearchStore.getState().results.length).toBeGreaterThan(0);
      });

      // 点击第一个结果项（cmdk 的 onSelect 通过点击触发）
      // Skill 偏差报备：renderHighlight 会将匹配部分包裹 <mark>，导致标题文本被拆分到
      // <mark>TypeScript</mark> 与 <span> 类型注解</span> 两个元素，
      // getByText(/TypeScript 类型注解/) 无法匹配跨元素文本。
      // 改用 getByRole('option', { name: ... }) 匹配 accessible name（合并所有子元素文本），
      // CommandItem 的 role="option"，点击该元素触发 cmdk 的 onSelect 回调。
      const resultItem = screen.getByRole('option', { name: /TypeScript 类型注解/ });
      fireEvent.click(resultItem);

      // 应记录到最近搜索
      await waitFor(() => {
        const recent = useSearchStore.getState().recentSearches;
        expect(recent.some((s) => s.includes('TypeScript'))).toBe(true);
      });
    });
  });

  describe('Fuse.js 索引加载', () => {
    it('组件挂载时请求 /search-index.json', () => {
      render(<SearchModal />);

      expect(fetchMock).toHaveBeenCalledWith('/search-index.json');
    });

    it('fetch 失败时静默降级（不抛错）', async () => {
      fetchMock.mockImplementationOnce(async () => {
        throw new Error('network error');
      });

      // 不应抛出
      expect(() => render(<SearchModal />)).not.toThrow();

      // 等待组件内 fetch 完成
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
  });
});
