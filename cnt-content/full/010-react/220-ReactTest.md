---
order: 220
title: React 测试
module: 'react'
category: 前端技术
difficulty: intermediate
description: React 组件测试实战：Vitest + Testing Library 技术栈、按角色查询的行为测试法、异步与网络 mock（MSW）、常见反模式与调试技巧。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'react/200-ReactForm'
  - 'react/210-ReactTypeScript'
  - 'react/230-ReactRouteAdvanced'
  - 'react/240-ReactI18n'
prerequisites:
  - 'react/010-OverviewEnvSetup'
---

## 1. 一句话理解

React 测试的当代共识是一句话：**像用户一样测试，而不是像程序员一样测试**。用户不关心你组件里叫 `isOpen` 还是 `visible`，他们看按钮文字、按键盘、等加载结束——所以断言应落在"角色、文本、行为"上。技术栈在 2025-2026 已收敛为四件套：**Vitest**（跑测试，Jest 的现代替代）、**@testing-library/react**（渲染与查询）、**@testing-library/user-event**（模拟真实交互）、**@testing-library/jest-dom**（增强断言）；网络请求交给 **MSW**（在 service worker 层拦截）。

```bash
npm i -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

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

## 7. 测试金字塔怎么落地

- **单测（多数）**：纯函数、自定义 Hook（用 `renderHook`）、组件交互——毫秒级，随提交跑
- **集成（少量）**：整页 + 路由 + MSW，覆盖关键用户流程（登录、下单）
- **E2E（极少）**：Playwright 跑冒烟路径，见[React 与 CI/CD](/react/370-ReactCICD)

不值得测的东西也要想清楚：第三方库的内部（`<Link>` 怎么渲染）、样式类名、纯展示的静态文本——这些交给类型检查、Lint 与视觉回归工具。

## 8. 常见陷阱

- **`userEvent.click` 忘了 `await`**：事件处理与状态更新是异步的，漏 await 会读到旧 UI；也不要混用 `fireEvent` 与 `userEvent`（后者是前者的高级封装，含焦点/键盘序列）。
- **act 警告**：几乎总是"状态更新发生在测试的 await 之外"——用 `findBy*`/`waitFor` 等待，而不是手动包 `act()`。
- **断言"不存在"用 getBy**：`getByText('x')` 找不到直接抛错，断言不存在必须用 `expect(queryByText('x')).not.toBeInTheDocument()`。
- **遮罩/动画导致 userEvent 失败**：pointer-events 检查报错时，通常是元素被遮挡或正在动画；修测试环境样式而非加 `force`。
- **多个匹配元素抛错**：`getByText('删除')` 命中多个按钮时用 `getAllBy*` 或用更精确的 `within(row).getByRole(...)` 收窄范围。
- **console.error 被吞**：为了输出干净 mock 掉 `console.error` 却忘了 `mockRestore`，会掩盖真实错误（包括 React 的 key 警告）。
- **快照滥用**：整组件 snapshot 测试"永远绿"或"永远红"，失去回归价值；只对小而稳定的 DOM 片段使用。

## 9. 小结

初学者要点：

- 四件套：Vitest + @testing-library/react + user-event + jest-dom；网络 mock 用 MSW。
- 查询优先 `getByRole`，断言"不存在"用 `queryBy`，等异步用 `findBy`/`waitFor`。
- 测用户看到的行为（文本、角色、交互结果），不断言 state/props 这类实现细节。

进阶注意：

- `userEvent.setup()` 后所有交互都要 `await`；假定时器测试防抖时与 `userEvent` 组合需 `advanceTimersByTime`。
- MSW 在网络层拦截，测试与生产代码同路径；handlers 可按用例覆写（`server.use`）。
- 自定义 Hook 用 `renderHook` 测试；组件级无障碍与文案问题顺带由 `getByRole` 与 jest-axe 兜住。

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
