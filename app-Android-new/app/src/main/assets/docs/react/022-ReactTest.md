---
order: 220
title: React 测试
module: 'react'
category: 前端技术
difficulty: intermediate
description: React组件测试策略
author: fanquanpp
updated: '2026-08-01'
related:
  - 'react/020-ReactForm'
  - 'react/021-ReactTypeScript'
  - 'react/023-ReactRouteAdvanced'
  - 'react/024-ReactI18n'
prerequisites:
  - 'react/001-OverviewEnvSetup'
---

## 前置知识

- [React 与 TypeScript](/react/021-ReactTypeScript)：建议先完成前一篇的学习

## 学习目标

- 掌握「概述」的核心机制、典型用法与常见陷阱
- 掌握「基础概念」的核心机制、典型用法与常见陷阱
- 掌握「快速上手」的核心机制、典型用法与常见陷阱
- 掌握「详细用法」的核心机制、典型用法与常见陷阱
- 掌握「常见场景」的核心机制、典型用法与常见陷阱


## 概述

React组件测试策略。本文将从基础概念、快速上手、详细用法、常见场景、注意事项和进阶用法六个方面全面介绍React测试。

## 基础概念

React测试涉及以下核心概念：

- **核心原理**：理解React测试的底层工作机制和设计理念
- **关键术语**：掌握相关术语和概念，建立知识框架
- **适用场景**：明确何时使用React测试，何时选择其他方案

```jsx
// React测试的基本结构示例
function Example() {
  return <div>React测试示例</div>;
}
```

## 快速上手

### 安装与配置

```bash
# 安装相关依赖
npm install react react-dom
```

### 基本使用

```jsx
import { useState, useEffect } from 'react';

// React测试的最简示例
function BasicExample() {
  const [value, setValue] = useState('');
  return (
    <div>
      <input value={value} onChange={(e) => setValue(e.target.value)} />
      <p>当前值: {value}</p>
    </div>
  );
}
```

## 详细用法

### 核心功能

```jsx
// React测试的核心功能演示
function DetailedExample() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // 数据获取
  useEffect(() => {
    setLoading(true);
    fetchData().then((result) => {
      setData(result);
      setLoading(false);
    });
  }, []);

  if (loading) return <div>加载中...</div>;
  return (
    <ul>
      {data.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}
```

### 配置选项

```jsx
// 常用配置选项
const config = {
  timeout: 5000, // 超时时间
  retries: 3, // 重试次数
  cache: true, // 启用缓存
  debug: false, // 调试模式
};
```

### 与其他功能集成

```jsx
// React测试与 React 生态集成
import { useQuery, useMutation } from '@tanstack/react-query';

function IntegratedExample() {
  const { data, isLoading } = useQuery({
    queryKey: ['items'],
    queryFn: fetchItems,
  });

  const mutation = useMutation({
    mutationFn: updateItem,
    onSuccess: () => {
      /* 刷新数据 */
    },
  });

  if (isLoading) return <div>加载中...</div>;
  return (
    <ul>
      {data?.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}
```

## 常见场景

### 场景一：数据处理

```jsx
function DataProcessor() {
  const [items, setItems] = useState([]);

  // 过滤和排序
  const processedItems = useMemo(() => {
    return items.filter((item) => item.active).sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  return (
    <ul>
      {processedItems.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}
```

### 场景二：表单处理

```jsx
function FormExample() {
  const [formData, setFormData] = useState({ name: '', email: '' });

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('提交:', formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" value={formData.name} onChange={handleChange} />
      <input name="email" value={formData.email} onChange={handleChange} />
      <button type="submit">提交</button>
    </form>
  );
}
```

### 场景三：错误处理

```jsx
function ErrorHandlingExample() {
  const [error, setError] = useState(null);

  if (error) {
    return (
      <div role="alert">
        <h2>出错了</h2>
        <p>{error.message}</p>
        <button onClick={() => setError(null)}>重试</button>
      </div>
    );
  }

  return <Content onError={setError} />;
}
```

## 注意事项

- 使用React测试时需要注意性能影响，避免不必要的重渲染
- 在生产环境中应正确处理错误和异常情况
- 注意浏览器兼容性，必要时使用 polyfill
- 遵循 React 的最佳实践，保持组件的纯函数特性
- 注意内存泄漏，在 useEffect 的清理函数中取消订阅和定时器
- 大型列表应使用虚拟化方案（如 react-window）避免性能问题
- 服务端渲染场景需要确保代码在 Node.js 环境中可运行

## 进阶用法

### 性能优化

```jsx
import { memo, useMemo, useCallback } from 'react';

// 使用 memo 避免不必要的重渲染
const OptimizedComponent = memo(function OptimizedComponent({ data, onClick }) {
  return <div onClick={onClick}>{data.name}</div>;
});

function Parent() {
  const [items, setItems] = useState([]);

  // 使用 useCallback 缓存回调
  const handleClick = useCallback((id) => {
    console.log('点击:', id);
  }, []);

  // 使用 useMemo 缓存计算结果
  const processedItems = useMemo(() => {
    return items.filter((item) => item.active);
  }, [items]);

  return (
    <div>
      {processedItems.map((item) => (
        <OptimizedComponent key={item.id} data={item} onClick={() => handleClick(item.id)} />
      ))}
    </div>
  );
}
```

### 自定义 Hook 封装

```jsx
function useCustomHook(initialValue) {
  const [state, setState] = useState(initialValue);
  const [error, setError] = useState(null);

  const update = useCallback(async (value) => {
    try {
      setError(null);
      setState(value);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  // 重置状态
  const reset = useCallback(() => {
    setState(initialValue);
    setError(null);
  }, [initialValue]);

  return { state, error, update, reset };
}
```

### 测试策略

```jsx
import { render, screen, fireEvent } from '@testing-library/react';

// 组件测试
test('示例组件正常渲染', () => {
  render(<ExampleComponent />);
  expect(screen.getByText('示例')).toBeInTheDocument();
});

// 交互测试
test('点击按钮触发回调', () => {
  const handleClick = jest.fn();
  render(<Button onClick={handleClick}>点击</Button>);
  fireEvent.click(screen.getByText('点击'));
  expect(handleClick).toHaveBeenCalledTimes(1);
});
```
## render 渲染组件

**render 基础**
`render(<node>, [<options>])`
```tsx
import { render } from '@testing-library/react';

test('renders hello', () => {
  render(<App />);
});
```

**render 返回值**
`const { container, getByText, ... } = render(<node>);`
```tsx
const { container, getByText, queryByText, rerender, unmount } = render(<App />);

expect(container.firstChild).toHaveClass('app');
expect(getByText('Hello')).toBeInTheDocument();
```

**render options**
`render(<node>, { container, hydrate, wrapper, ... })`
```tsx
const { container } = render(<App />, {
  container: document.createElement('div'),
  wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
});
```

**rerender 重新渲染**
`<result>.rerender(<node>)`
```tsx
const { rerender } = render(<Counter count={0} />);
rerender(<Counter count={1} />);
```

**unmount 卸载**
`<result>.unmount()`
```tsx
const { unmount } = render(<App />);
unmount();
```

**cleanup 清理**
`cleanup();`
```tsx
import { cleanup } from '@testing-library/react';

afterEach(() => cleanup());
```

---

## screen 屏幕查询

**screen 通过全局**
`import { screen } from '@testing-library/react';`
```tsx
import { screen } from '@testing-library/react';

render(<App />);
expect(screen.getByText('Hello')).toBeInTheDocument();
```

**getByText 文本查询**
`screen.getByText(<text>)`
```tsx
screen.getByText('Hello');
screen.getByText(/hello/i);
screen.getByText((content, element) => content.includes('Hello'));
```

**getByRole 角色**
`screen.getByRole(<role>, [<options>])`
```tsx
screen.getByRole('button');
screen.getByRole('button', { name: '提交' });
screen.getByRole('button', { name: /submit/i, hidden: true });
```

**getByPlaceholderText**
```tsx
screen.getByPlaceholderText('请输入用户名');
```

**getByLabelText**
```tsx
screen.getByLabelText('邮箱');
screen.getByLabelText(/email/i);
```

**getByDisplayValue**
```tsx
screen.getByDisplayValue('hello');
```

**getByAltText**
```tsx
screen.getByAltText('logo');
```

**getByTitle**
```tsx
screen.getByTitle('提示');
```

**getByTestId**
`screen.getByTestId(<id>)`
```tsx
screen.getByTestId('submit-button');
```

---

## queryBy* 不抛异常查询

**queryByText**
`screen.queryByText(<text>)`
```tsx
const el = screen.queryByText('不存在');
expect(el).not.toBeInTheDocument();
```

**queryByTestId**
`screen.queryByTestId(<id>)`
```tsx
const btn = screen.queryByTestId('optional');
expect(btn).toBeNull();
```

**getAllByText 多匹配**
`screen.getAllByText(<text>)`
```tsx
const items = screen.getAllByText(/item/);
expect(items).toHaveLength(3);
```

**findAllBy 异步查询**
`await screen.findAllByText(<text>)`
```tsx
test('async list', async () => {
  render(<App />);
  const items = await screen.findAllByText(/item/);
  expect(items).toHaveLength(5);
});
```

**findBy 异步查询**
`await screen.findByRole(<role>)`
```tsx
test('loads user', async () => {
  render(<App />);
  const user = await screen.findByRole('heading', { name: /张三/ });
  expect(user).toBeInTheDocument();
});
```

---

## userEvent 用户事件

**userEvent.setup**
`const <user> = userEvent.setup();`
```tsx
import userEvent from '@testing-library/user-event';

test('click', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button'));
});
```

**user.click 点击**
`await <user>.click(<element>)`
```tsx
await user.click(screen.getByText('提交'));
await user.click(screen.getByRole('button', { name: '删除' }));
```

**user.type 输入**
`await <user>.type(<element>, <text>)`
```tsx
await user.type(screen.getByLabelText('邮箱'), 'user@example.com');
await user.type(screen.getByPlaceholderText('密码'), 'p@ssw0rd{Enter}');
```

**user.clear 清空**
`await <user>.clear(<element>)`
```tsx
await user.clear(screen.getByLabelText('姓名'));
```

**user.selectOptions 选择**
`await <user>.selectOptions(<element>, <value>)`
```tsx
await user.selectOptions(screen.getByRole('listbox'), 'option1');
await user.selectOptions(screen.getByRole('listbox'), ['a', 'b']);
```

**user.upload 上传**
`await <user>.upload(<input>, <file>)`
```tsx
const file = new File(['content'], 'test.png', { type: 'image/png' });
await user.upload(screen.getByLabelText('头像'), file);
```

**user.keyboard 键盘**
`await <user>.keyboard(<text>)`
```tsx
await user.keyboard('hello');
await user.keyboard('{Shift}{ArrowLeft>4}{/Shift}');
```

**user.tab 切换焦点**
`await <user>.tab()`
```tsx
await user.tab();
expect(screen.getByRole('button')).toHaveFocus();
```

**user.hover / unhover**
```tsx
await user.hover(screen.getByText('菜单'));
await user.unhover(screen.getByText('菜单'));
```

**user.paste 粘贴**
```tsx
await user.paste(screen.getByRole('textbox'), 'pasted text');
```

---

## fireEvent 原生事件

**fireEvent 触发**
`fireEvent.<event>(<element>, [<eventInit>])`
```tsx
import { fireEvent } from '@testing-library/react';

fireEvent.click(screen.getByText('提交'));
fireEvent.change(screen.getByRole('textbox'), { target: { value: 'new value' } });
fireEvent.submit(screen.getByRole('form'));
fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });
```

---

## waitFor 异步等待

**waitFor**
`await waitFor(() => <expect>)`
```tsx
import { waitFor } from '@testing-library/react';

await waitFor(() => {
  expect(screen.getByText('已加载')).toBeInTheDocument();
});
```

**waitFor 选项**
`await waitFor(<fn>, { timeout, interval })`
```tsx
await waitFor(() => expect(screen.queryByText('loaded')).toBeInTheDocument(), {
  timeout: 5000,
  interval: 100,
});
```

**waitForElementToBeRemoved**
`await waitForElementToBeRemoved(<fn>)`
```tsx
import { waitForElementToBeRemoved } from '@testing-library/react';

await waitForElementToBeRemoved(() => screen.queryByText('加载中'));
```

---

## act 同步行为

**act 包装**
`act(() => <fn>)`
```tsx
import { act } from 'react';

act(() => {
  render(<App />);
});
```

**async act**
`await act(async () => <fn>)`
```tsx
await act(async () => {
  await user.click(button);
});
```

---

## within 容器内查询

**within 范围查询**
`within(<container>).getByText(<text>)`
```tsx
import { within } from '@testing-library/react';

const { container } = render(<App />);
const section = container.querySelector('section')!;
const title = within(section).getByText('标题');
```

---

## 常用断言

**toBeInTheDocument**
`expect(<el>).toBeInTheDocument()`
```tsx
expect(screen.getByText('hello')).toBeInTheDocument();
```

**toHaveTextContent**
`expect(<el>).toHaveTextContent(<text>)`
```tsx
expect(screen.getByRole('heading')).toHaveTextContent('Hello, World');
```

**toHaveAttribute**
`expect(<el>).toHaveAttribute(<name>, [<value>])`
```tsx
expect(screen.getByRole('button')).toHaveAttribute('disabled');
expect(screen.getByRole('link')).toHaveAttribute('href', '/login');
```

**toHaveClass**
`expect(<el>).toHaveClass(<className>)`
```tsx
expect(screen.getByRole('button')).toHaveClass('active');
```

**toBeDisabled / toBeEnabled**
```tsx
expect(screen.getByRole('button')).toBeDisabled();
expect(screen.getByRole('button')).toBeEnabled();
```

**toBeVisible**
`expect(<el>).toBeVisible()`
```tsx
expect(screen.getByText('visible')).toBeVisible();
```

---

## Mock 工具

**jest.mock**
`jest.mock('<module>', <factory>)`
```tsx
jest.mock('@/api/user', () => ({
  fetchUser: jest.fn().mockResolvedValue({ id: 1, name: '张三' }),
}));
```

**jest.spyOn**
`jest.spyOn(<obj>, '<method>')`
```tsx
const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
afterEach(() => spy.mockRestore());
```

**mockImplementation**
`<mock>.mockImplementation(<fn>)`
```tsx
const mockFn = jest.fn();
mockFn.mockImplementation((id: string) => ({ id }));
mockFn.mockResolvedValue({ ok: true });
mockFn.mockRejectedValue(new Error('fail'));
```
