---
order: 290
title: React 测试
module: 'react'
category: 前端技术
difficulty: intermediate
description: React 组件测试与 E2E 专篇：Vitest + Testing Library 技术栈、按角色查询的行为测试法、异步与网络 mock（MSW）、Hook 测试、Playwright 端到端测试、常见反模式与调试技巧。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'react/200-ReactForm'
  - 'react/210-ReactTypeScript'
  - 'react/230-ReactRouteAdvanced'
  - 'react/240-ReactI18n'
  - 'react/090-LintFormatAndProjectStructure'
  - 'react/360-ReactStorybook'
  - 'react/370-ReactCICD'
prerequisites:
  - 'react/010-OverviewEnvSetup'
---

## 知识点地图

- **知识类别**：工程化 / 测试（组件测试、Hook 测试与端到端测试）。
- **解决什么问题**：重构不敢动手、回归靠手点，是缺测试项目的通病。本篇给出 React 2025-2026 的收敛答案：Vitest + Testing Library 测组件行为，renderHook 测自定义 Hook，MSW 拦截网络，Playwright 守住整站关键路径。
- **什么时候用到**：写完一个组件/Hook 要验证行为时；重构前补测试网时；CI 里需要分层测试策略（金字塔）时。Storybook 属于组件工作台与视觉回归，见 [React 与 Storybook](/react/360-ReactStorybook)；测试进流水线见 [React 与 CI/CD](/react/370-ReactCICD)。

本文由原「测试与工程化」的组件测试、Hook 测试与 Playwright E2E 三节归并而来，与本篇既有的行为测试法、MSW、测试金字塔内容去重合并。

## 1. 一句话理解

React 测试的当代共识是一句话：**像用户一样测试，而不是像程序员一样测试**。用户不关心你组件里叫 `isOpen` 还是 `visible`，他们看按钮文字、按键盘、等加载结束——所以断言应落在"角色、文本、行为"上。技术栈在 2025-2026 已收敛为四件套：**Vitest**（跑测试，Jest 的现代替代）、**@testing-library/react**（渲染与查询）、**@testing-library/user-event**（模拟真实交互）、**@testing-library/jest-dom**（增强断言）；网络请求交给 **MSW**（在 service worker 层拦截）。

```bash
npm i -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

### 1.1 安装配置清单

四件套装完还差三份配置，缺一不可：

```ts
// vitest.config.ts — jsdom 环境是 DOM 测试的前提，默认 node 环境没有 document
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true, // describe/it 免导入；团队偏好显式导入可关掉
    setupFiles: ['./src/test/setup.ts'],
    css: true, // 处理 CSS 导入；toBeVisible 这类断言依赖样式计算
  },
});
```

```ts
// src/test/setup.ts — jest-dom 的匹配器要显式注册，否则 toBeInTheDocument 不存在
import '@testing-library/jest-dom/vitest';
```

```json
// package.json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

易错点：`environment: 'jsdom'` 忘配时报 `document is not defined`；`setup.ts` 忘配时报 `toBeInTheDocument is not a function`——两个报错都指向配置而不是测试代码，先查这里。

## 2. 核心心法：测行为，不测实现

对比同一需求的三种写法，前两种都是反模式：

```tsx
// 反模式一：断言实现细节（内部 state）——重构改名即挂，用户毫无感知
expect(component.state.count).toBe(1);

// 反模式二：断言实现细节（props 传递）——同上
expect(onClickMock).toHaveBeenCalledWith('add');

// 正确：断言用户能看到、能操作的结果
render(<Counter />);
await userEvent.click(screen.getByRole('button', { name: '加一' }));
expect(screen.getByText('1')).toBeInTheDocument();
```

判别标准：把组件整个重写（换掉 useState、换掉类库），测试若仍全绿，说明测的是行为；若挂了一片，说明绑死了实现。

## 3. 查询优先级：为什么是 getByRole

Testing Library 对查询方法有明确的推荐顺序，本质是**可访问性优先**：

1. `getByRole('button', { name: '提交' })`——可访问性树，最能代表用户视角；查不到往往说明组件本身无障碍有问题
2. `getByLabelText('邮箱')`——表单字段
3. `getByPlaceholderText` / `getByText` / `getByAltText` / `getByTitle`
4. `getByTestId`——**最后手段**，与用户感知无关的兜底

`getBy` 变体规则：`getBy` 找不到立刻抛错；`queryBy` 找不到返回 null（专用于断言"不存在"）；`findBy` 返回 Promise 等待出现（专用于异步）。

## 4. 完整示例：购物车条目组件

```tsx
//CartItem.tsx
import { useState } from 'react';

interface Props {
  name: string;
  price: number;
  onRemove: (name: string) => void;
}

export function CartItem({ name, price, onRemove }: Props) {
  const [qty, setQty] = useState(1);
  const total = qty * price;

  return (
    <div>
      <span>{name}</span>
      <span>单价 {price} 元</span>
      <button onClick={() => setQty((q) => q + 1)}>增加数量</button>
      <output>共 {total} 元</output>
      <button onClick={() => onRemove(name)}>移除商品</button>
    </div>
  );
}
```

```tsx
//CartItem.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CartItem } from './CartItem';

describe('CartItem', () => {
  it('默认数量为 1，显示单价', () => {
    render(<CartItem name="钢笔" price={10} onRemove={() => {}} />);
    // toBeInTheDocument 来自 @testing-library/jest-dom
    expect(screen.getByText('钢笔')).toBeInTheDocument();
    expect(screen.getByText('共 10 元')).toBeInTheDocument();
  });

  it('点击"增加数量"后金额按数量累加', async () => {
    const user = userEvent.setup(); // 必须先 setup，模拟真实事件序列
    render(<CartItem name="钢笔" price={10} onRemove={() => {}} />);

    await user.click(screen.getByRole('button', { name: '增加数量' }));
    await user.click(screen.getByRole('button', { name: '增加数量' }));

    expect(screen.getByText('共 30 元')).toBeInTheDocument(); // 1 -> 3 件
  });

  it('移除时把商品名回传给父组件', async () => {
    const onRemove = vi.fn(); // Vitest 的 mock 函数（Jest 里是 jest.fn）
    const user = userEvent.setup();
    render(<CartItem name="钢笔" price={10} onRemove={onRemove} />);

    await user.click(screen.getByRole('button', { name: '移除商品' }));

    expect(onRemove).toHaveBeenCalledExactlyOnceWith('钢笔');
  });
});
```

预期运行结果：3 个用例全部通过。注意第二条用例断言的是界面上的"共 30 元"而非内部 `qty === 3`——这就是行为测试。

## 5. 异步与网络：findBy 与 MSW

异步 UI（加载态、请求结果）是组件测试的主要难点。组件内 `await` 的渲染结果用 `findBy*` 等待：

```tsx
it('加载完成后显示用户名', async () => {
  render(<UserProfile id={1} />);
  // findByText 会轮询等待元素出现（默认 1 秒超时）
  expect(await screen.findByText('张三')).toBeInTheDocument();
});

it('加载失败显示错误提示', async () => {
  render(<UserProfile id={-1} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('加载失败');
});
```

请求本身用 MSW 拦截——不 mock 你的代码（不替换 fetch 函数），而是 mock **网络**，测试代码与生产代码走完全一样的路径：

```ts
// test/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/user/:id', ({ params }) =>
    params.id === '-1'
      ? HttpResponse.json({ message: 'not found' }, { status: 404 })
      : HttpResponse.json({ id: params.id, name: '张三' }),
  ),
];
// 在 vitest 的 setupFiles 中：setupServer(...handlers).listen()
```

### 5.1 对照组：手写 fetch mock 的问题

理解 MSW 的价值，最快的方式是看它取代了什么。不引入 MSW 时的经典写法——直接替换 `globalThis.fetch`：

```tsx
describe('UserList', () => {
  beforeEach(() => {
    // 手写 fetch mock：必须凭空拼出一个 Response 形状
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve([
            { id: 1, name: '张三' },
            { id: 2, name: '李四' },
          ]),
      } as Response)
    );
  });

  afterEach(() => {
    vi.restoreAllMocks(); // 不还原会污染后续所有用例
  });

  it('显示加载状态', () => {
    render(<UserList />);
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('加载完成后显示用户列表', async () => {
    render(<UserList />);
    await waitFor(() => {
      expect(screen.getByText('张三')).toBeInTheDocument();
      expect(screen.getByText('李四')).toBeInTheDocument();
    });
  });
});
```

这段代码能跑，但三处代价随项目增长放大：`as Response` 的形状是你想象出来的，真实响应有 `ok`、`status`、headers——组件一旦检查 `res.ok`，假响应直接抛错；mock 的是 fetch 这个**实现细节**，换成 axios 或自定义封装后全部测试重写；每个 describe 都要重复 beforeEach/restoreAllMocks 样板。MSW 在网络层拦截，上述三点全部消失，且 handlers 可按用例覆写（`server.use`）。

## 6. Mock 与定时器

```ts
import { afterEach, vi } from 'vitest';

// 替换整个模块（如工具函数、第三方 SDK）
vi.mock('@/api/user', () => ({
  fetchUser: vi.fn().mockResolvedValue({ id: 1, name: '张三' }),
}));

// 只替换对象上的某个方法，并防止测试期间真的打日志
const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
afterEach(() => spy.mockRestore()); // 必须 restore，否则污染其他用例

// 假定时器：测试防抖/节流不真的等 300ms
vi.useFakeTimers();
// ...渲染带防抖的组件
vi.advanceTimersByTime(300); // 时间快进
vi.useRealTimers();
```

不需要手动 cleanup：Testing Library 会在每个用例后自动卸载组件（Vitest/Jest 均已内置）。

## 7. Hook 测试：renderHook 与 act

自定义 Hook 不能脱离组件调用，`renderHook` 替你把它挂进一个隐形宿主组件：

```tsx
// src/hooks/useCounter.ts
import { useState, useCallback } from 'react';

export function useCounter(initialValue = 0) {
  const [count, setCount] = useState(initialValue);
  const increment = useCallback(() => setCount((c) => c + 1), []);
  const decrement = useCallback(() => setCount((c) => c - 1), []);
  const reset = useCallback(() => setCount(initialValue), [initialValue]);

  return { count, increment, decrement, reset };
}
```

```tsx
// src/hooks/__tests__/useCounter.test.ts
import { renderHook, act } from '@testing-library/react';
import { useCounter } from '../useCounter';

describe('useCounter', () => {
  it('初始值', () => {
    const { result } = renderHook(() => useCounter(5));
    expect(result.current.count).toBe(5);
  });

  it('增加', () => {
    const { result } = renderHook(() => useCounter());
    act(() => result.current.increment()); // act：告诉 React「这里发生了状态更新，去处理它」
    expect(result.current.count).toBe(1);
  });

  it('重置', () => {
    const { result } = renderHook(() => useCounter(10));
    act(() => result.current.increment());
    act(() => result.current.reset());
    expect(result.current.count).toBe(10);
  });
});
```

- `result.current` 每次读取都是最新渲染的返回值——Hook 重渲染后它自动更新，不要把 `result.current` 解构成局部变量再断言（解构捕获的是旧对象）。
- 状态更新必须包在 `act` 里，否则 React 会警告「更新未包裹 act」，且 `result.current` 可能还没刷新。
- 带 Effect 的 Hook（如 `useDebounce`）配合假定时器测试：`renderHook` 后 `act(() => vi.advanceTimersByTime(300))` 推进时间。
- 判断标准：Hook 逻辑薄（只是两个 useState 的组合）时，通过消费它的组件测试间接覆盖即可；有独立规则（重置、边界、防抖时序）的 Hook 才值得专属测试文件。

## 8. E2E 测试（Playwright）

组件测试回答「这个组件对不对」，E2E 回答「整站关键路径通不通」——登录、下单、搜索到详情。E2E 跑真实浏览器、真实路由、真实构建产物，慢且脆，所以只保关键路径。

### 8.1 安装与配置

```bash
npm install -D @playwright/test
npx playwright install
```

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0, // 本地不重试（要立刻暴露问题），CI 重试两次抗抖动
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry', // 重试时自动留轨迹，失败排查的救命文件
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI, // 本地复用已起的服务，CI 里自动起新的
  },
});
```

`webServer` 是最值得的一项配置：跑 E2E 不再需要「先手动起 dev server」的记忆负担，CI 里也自动就绪。

### 8.2 编写 E2E 测试

```tsx
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('认证流程', () => {
  test('登录成功后跳转到首页', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/');
    await expect(page.locator('h1')).toContainText('欢迎');
  });

  test('登录失败显示错误信息', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[name="email"]', 'wrong@example.com');
    await page.fill('[name="password"]', 'wrong');
    await page.click('button[type="submit"]');

    await expect(page.locator('.error')).toBeVisible();
  });
});
```

```tsx
// e2e/todo.spec.ts
import { test, expect } from '@playwright/test';

test.describe('待办事项', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/todos');
  });

  test('添加待办事项', async ({ page }) => {
    await page.fill('[name="todo"]', '学习 React 19');
    await page.click('button[type="submit"]');

    await expect(page.locator('li')).toContainText('学习 React 19');
  });

  test('完成待办事项', async ({ page }) => {
    await page.fill('[name="todo"]', '学习 React 19');
    await page.click('button[type="submit"]');

    const item = page.locator('li').last();
    await item.click();

    await expect(item).toHaveClass(/completed/);
  });
});
```

选择器建议与组件测试一致：优先 `getByRole`/`getByLabel` 这类面向用户的定位（`page.getByRole('button', { name: '提交' })`），CSS 选择器（`[name="email"]`）是这里的简化写法，真实项目建议统一角色定位——它同时逼你把可访问性做好。测试账号与后端数据用测试环境种子数据，绝不连生产库。

### 8.3 E2E 进 CI 的编排

E2E job 依赖构建产物、失败要留证据，编排细节（`needs: verify`、trace 归档、只装用到的浏览器）见 [React 与 CI/CD](/react/370-ReactCICD)。

## 9. 测试金字塔怎么落地

- **单测（多数）**：纯函数、自定义 Hook（用 `renderHook`，见第 7 节）、组件交互——毫秒级，随提交跑
- **集成（少量）**：整页 + 路由 + MSW，覆盖关键用户流程（登录、下单）
- **E2E（极少）**：Playwright 跑冒烟路径，见上文第 8 节；CI 编排见[React 与 CI/CD](/react/370-ReactCICD)

不值得测的东西也要想清楚：第三方库的内部（`<Link>` 怎么渲染）、样式类名、纯展示的静态文本——这些交给类型检查、Lint 与视觉回归工具。

## 10. 常见陷阱

- **`userEvent.click` 忘了 `await`**：事件处理与状态更新是异步的，漏 await 会读到旧 UI；也不要混用 `fireEvent` 与 `userEvent`（后者是前者的高级封装，含焦点/键盘序列）。
- **act 警告**：几乎总是"状态更新发生在测试的 await 之外"——用 `findBy*`/`waitFor` 等待，而不是手动包 `act()`。
- **断言"不存在"用 getBy**：`getByText('x')` 找不到直接抛错，断言不存在必须用 `expect(queryByText('x')).not.toBeInTheDocument()`。
- **遮罩/动画导致 userEvent 失败**：pointer-events 检查报错时，通常是元素被遮挡或正在动画；修测试环境样式而非加 `force`。
- **多个匹配元素抛错**：`getByText('删除')` 命中多个按钮时用 `getAllBy*` 或用更精确的 `within(row).getByRole(...)` 收窄范围。
- **console.error 被吞**：为了输出干净 mock 掉 `console.error` 却忘了 `mockRestore`，会掩盖真实错误（包括 React 的 key 警告）。
- **快照滥用**：整组件 snapshot 测试"永远绿"或"永远红"，失去回归价值；只对小而稳定的 DOM 片段使用。

## 11. 小结

初学者要点：

- 四件套：Vitest + @testing-library/react + user-event + jest-dom；网络 mock 用 MSW。
- 查询优先 `getByRole`，断言"不存在"用 `queryBy`，等异步用 `findBy`/`waitFor`。
- 测用户看到的行为（文本、角色、交互结果），不断言 state/props 这类实现细节。

进阶注意：

- `userEvent.setup()` 后所有交互都要 `await`；假定时器测试防抖时与 `userEvent` 组合需 `advanceTimersByTime`。
- MSW 在网络层拦截，测试与生产代码同路径；handlers 可按用例覆写（`server.use`）。
- 自定义 Hook 用 `renderHook` 测试；组件级无障碍与文案问题顺带由 `getByRole` 与 jest-axe 兜住。
- E2E 只保关键路径，`webServer` 自动起服务、CI 重试 + trace 留证据；组件测试、Storybook 与 E2E 三者的分工见各专篇。

## 速查

**jest-dom 常用断言**

```tsx
expect(el).toBeInTheDocument();
expect(el).toHaveTextContent('文本');
expect(el).toHaveAttribute('href', '/a');
expect(el).toHaveClass('active');
expect(screen.getByRole('button')).toBeDisabled();
expect(screen.getByRole('button')).toBeEnabled();
expect(screen.getByText('visible')).toBeVisible();
```

**query 三兄弟**

```tsx
screen.getByRole('button', { name: '提交' });  // 立即取，找不到抛错
screen.queryByText('加载中');                  // 取不到返回 null（断言不存在）
await screen.findByText('完成');               // 等待出现（异步）
```

**Mock 工具（Vitest / Jest 对照）**

```tsx
vi.mock('@/api/user', () => ({ fetchUser: vi.fn().mockResolvedValue({ id: 1 }) }));
// Jest 等价：jest.mock('@/api/user', () => ({ fetchUser: jest.fn()... }))

const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
afterEach(() => spy.mockRestore());

const mockFn = vi.fn();
mockFn.mockImplementation((id: string) => ({ id }));
mockFn.mockResolvedValue({ ok: true });
mockFn.mockRejectedValue(new Error('fail'));
```

**自定义 Hook 测试**

```tsx
import { renderHook, act } from '@testing-library/react';
const { result } = renderHook(() => useCounter());
act(() => result.current.increment());
expect(result.current.count).toBe(1);
```
