---
order: 190
title: React 错误边界
module: 'react'
category: 前端技术
difficulty: intermediate
description: 错误边界与异常处理
author: fanquanpp
updated: '2026-08-01'
related:
  - 'react/017-StateManagementSolutionComparison'
  - 'react/018-ReactPerformance'
  - 'react/020-ReactForm'
  - 'react/021-ReactTypeScript'
prerequisites:
  - 'react/001-OverviewEnvSetup'
---

## 前置知识

- [React 性能优化](/react/018-ReactPerformance)：建议先完成前一篇的学习

## 学习目标

- 掌握「概述」的核心机制、典型用法与常见陷阱
- 掌握「基础概念」的核心机制、典型用法与常见陷阱
- 掌握「快速上手」的核心机制、典型用法与常见陷阱
- 掌握「详细用法」的核心机制、典型用法与常见陷阱
- 掌握「常见场景」的核心机制、典型用法与常见陷阱


## 概述

错误边界与异常处理。本文将从基础概念、快速上手、详细用法、常见场景、注意事项和进阶用法六个方面全面介绍React错误边界。

## 基础概念

React错误边界涉及以下核心概念：

- **核心原理**：理解React错误边界的底层工作机制和设计理念
- **关键术语**：掌握相关术语和概念，建立知识框架
- **适用场景**：明确何时使用React错误边界，何时选择其他方案

```jsx
// React错误边界的基本结构示例
function Example() {
  return <div>React错误边界示例</div>;
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

// React错误边界的最简示例
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
// React错误边界的核心功能演示
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
// React错误边界与 React 生态集成
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

- 使用React错误边界时需要注意性能影响，避免不必要的重渲染
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
## ErrorBoundary 类组件

**React.Component 错误边界**
`class <Boundary> extends React.Component<<Props>, <State>>`
```tsx
import { Component, ReactNode, ReactElement } from 'react';

type Props = { children: ReactNode; fallback?: ReactElement };
type State = { hasError: boolean; error: Error | null };

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error(error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <h1>出错了</h1>;
    }
    return this.props.children;
  }
}
```

---

## 错误边界生命周期

**getDerivedStateFromError 渲染阶段**
`static getDerivedStateFromError(<error>): <state>`
```tsx
static getDerivedStateFromError(error: Error): State {
  return { hasError: true, error };
}
```

**componentDidCatch 提交阶段**
`componentDidCatch(<error>, <info>)`
```tsx
componentDidCatch(error: Error, info: { componentStack: string | null }) {
  Sentry.captureException(error, { extra: info });
}
```

---

## 错误边界使用

**包裹组件**
`<ErrorBoundary fallback={<node>}>...</ErrorBoundary>`
```tsx
<ErrorBoundary fallback={<ErrorView />}>
  <App />
</ErrorBoundary>
```

**带 fallback render**
```tsx
type Props = {
  children: ReactNode;
  fallback: (error: Error, reset: () => void) => ReactNode;
};

class Boundary extends Component<Props, State> {
  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError && this.state.error) {
      return this.props.fallback(this.state.error, this.reset);
    }
    return this.props.children;
  }
}
```

---

## Component 类类型

**Component 类型签名**
`class <C> extends React.Component<<Props>, [<State>]>`
```tsx
class Counter extends React.Component<{ initial: number }, { count: number }> {
  state = { count: this.props.initial };
  render() {
    return <button onClick={() => this.setState({ count: this.state.count + 1 })}>
      {this.state.count}
    </button>;
  }
}
```

**PureComponent 浅比较**
`class <C> extends React.PureComponent<<Props>, [<State>]>`
```tsx
class Row extends React.PureComponent<{ id: string; name: string }> {
  render() {
    return <div>{this.props.name}</div>;
  }
}
```

**生命周期方法签名**
```tsx
componentDidMount(): void
componentDidUpdate(prevProps: Props, prevState: State): void
componentWillUnmount(): void
shouldComponentUpdate(nextProps: Props, nextState: State): boolean
getSnapshotBeforeUpdate(prevProps: Props, prevState: State): Snapshot | null
```

---

## Suspense 悬挂组件

**Suspense 基础**
`<Suspense fallback={<node>}>...</Suspense>`
```tsx
import { Suspense } from 'react';

<Suspense fallback={<Spinner />}>
  <LazyComponent />
</Suspense>
```

**嵌套 Suspense**
```tsx
<Suspense fallback={<PageSkeleton />}>
  <Header />
  <Suspense fallback={<ListSkeleton />}>
    <AsyncList />
  </Suspense>
  <Suspense fallback={<CommentsSkeleton />}>
    <AsyncComments />
  </Suspense>
</Suspense>
```

**Suspense + use(promise)**
```tsx
import { Suspense, use } from 'react';

function User({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise);
  return <h1>{user.name}</h1>;
}

function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <User userPromise={fetchUser()} />
    </Suspense>
  );
}
```

---

## React.lazy 懒加载

**React.lazy**
`const <Component> = React.lazy(() => import('<path>'));`
```tsx
import { lazy, Suspense } from 'react';

const Settings = lazy(() => import('./Settings'));

<Suspense fallback={<Spinner />}>
  <Settings />
</Suspense>
```

**lazy props 类型**
```tsx
type Props = { userId: string };
const User = lazy(() => import('./User')) as React.ComponentType<Props>;
```

---

## SuspenseList (实验性)

**SuspenseList 配置**
```tsx
import { SuspenseList } from 'react';

<SuspenseList revealOrder="forwards" tail="collapsed">
  <Suspense fallback={<Spinner />}><Item1 /></Suspense>
  <Suspense fallback={<Spinner />}><Item2 /></Suspense>
</SuspenseList>
```

---

## 边界组件组合

**ErrorBoundary + Suspense**
```tsx
<ErrorBoundary fallback={<ErrorView />}>
  <Suspense fallback={<Spinner />}>
    <AsyncData />
  </Suspense>
</ErrorBoundary>
```

---

## ErrorBoundary 上下文

**unstable_handleError 旧 API**
```tsx
// React 16+ 已使用 getDerivedStateFromError
static getDerivedStateFromError(error: Error) {
  return { hasError: true };
}
```

---

## 边界边界捕获限制

**捕获范围**
- 渲染期间错误 √
- 生命周期错误 √
- 子组件树错误 √
- 事件处理器错误 ×
- 异步代码错误 ×
- 懒加载错误 √

**事件错误处理**
```tsx
// 事件处理器错误需 try/catch
const onClick = async () => {
  try {
    await api.fetch();
  } catch (err) {
    setError(err);
  }
};
```
