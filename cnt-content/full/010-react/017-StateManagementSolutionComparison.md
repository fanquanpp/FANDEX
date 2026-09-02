---
order: 170
title: 状态管理方案对比
module: 'react'
category: 前端技术
difficulty: intermediate
description: Redux、Zustand、Jotai等方案对比
author: fanquanpp
updated: '2026-08-01'
related:
  - 'react/015-HooksPrinciple'
  - 'react/016-CustomHooksDesignPattern'
  - 'react/018-ReactPerformance'
  - 'react/019-ReactErrorBoundary'
prerequisites:
  - 'react/001-OverviewEnvSetup'
---

## 前置知识

- [自定义 Hooks 设计模式](/react/016-CustomHooksDesignPattern)：建议先完成前一篇的学习

## 学习目标

- 掌握「概述」的核心机制、典型用法与常见陷阱
- 掌握「基础概念」的核心机制、典型用法与常见陷阱
- 掌握「快速上手」的核心机制、典型用法与常见陷阱
- 掌握「详细用法」的核心机制、典型用法与常见陷阱
- 掌握「常见场景」的核心机制、典型用法与常见陷阱


## 概述

Redux、Zustand、Jotai等方案对比。本文将从基础概念、快速上手、详细用法、常见场景、注意事项和进阶用法六个方面全面介绍状态管理方案对比。

## 基础概念

状态管理方案对比涉及以下核心概念：

- **核心原理**：理解状态管理方案对比的底层工作机制和设计理念
- **关键术语**：掌握相关术语和概念，建立知识框架
- **适用场景**：明确何时使用状态管理方案对比，何时选择其他方案

```jsx
// 状态管理方案对比的基本结构示例
function Example() {
  return <div>状态管理方案对比示例</div>;
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

// 状态管理方案对比的最简示例
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
// 状态管理方案对比的核心功能演示
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
// 状态管理方案对比与 React 生态集成
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

- 使用状态管理方案对比时需要注意性能影响，避免不必要的重渲染
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
## useState 状态

**基本写法：基本状态**
`const [<值>, <设置函数>] = useState(<初始值>);`
```typescript
// 基础状态
import { useState } from 'react';
const [count, setCount] = useState(0);
setCount(count + 1);
```

---

**基本写法：函数式更新**
`<set函数>((<旧值>) => <新值>);`
```typescript
// 基于前值更新
setCount(prev => prev + 1);
```

---

**基本写法：对象状态**
`const [<状态>, <设置函数>] = useState({ <字段>: <值> });`
```typescript
// 对象状态
const [user, setUser] = useState({ name: '', age: 0 });
setUser(prev => ({ ...prev, name: 'Alice' }));
```

---

**基本写法：懒初始化**
`const [<值>, <setter>] = useState(() => <计算>);`
```typescript
// 惰性初始化（仅首次渲染计算）
const [data, setData] = useState(() => loadDataFromStorage());
```

---

## useEffect 副作用

**基本写法：每次渲染后执行**
`useEffect(() => { <副作用> });`
```typescript
// 无依赖，每次渲染后执行
useEffect(() => {
    console.log('rendered');
});
```

---

**基本写法：挂载时执行一次**
`useEffect(() => { <副作用> }, []);`
```typescript
// 仅挂载时执行
useEffect(() => {
    fetchData();
}, []);
```

---

**基本写法：依赖变化时执行**
`useEffect(() => { <副作用> }, [<依赖>...]);`
```typescript
// 依赖变化时执行
useEffect(() => {
    fetchUser(userId);
}, [userId]);
```

---

**基本写法：清理副作用**
`useEffect(() => { return () => <清理>; }, [<依赖>]);`
```typescript
// 清理定时器
useEffect(() => {
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
}, []);
```

---

## useRef 引用

**基本写法：引用 DOM**
`const <ref> = useRef(<初始值>);`
```typescript
// DOM 引用
const inputRef = useRef<HTMLInputElement>(null);
useEffect(() => {
    inputRef.current?.focus();
}, []);
```

---

**基本写法：可变值容器**
`const <ref> = useRef(<初始值>);`
```typescript
// 保存可变值（不触发重渲染）
const timerRef = useRef<number>();
timerRef.current = setInterval(tick, 1000);
```

---

## useMemo 与 useCallback

**基本写法：useMemo 缓存计算**
`const <值> = useMemo(() => <计算>, [<依赖>]);`
```typescript
// 缓存昂贵计算
const sorted = useMemo(() => {
    return [...data].sort((a, b) => a - b);
}, [data]);
```

---

**基本写法：useCallback 缓存函数**
`const <函数> = useCallback(() => { }, [<依赖>]);`
```typescript
// 缓存函数引用
const handleClick = useCallback(() => {
    setCount(c => c + 1);
}, []);
```

---

## useContext 上下文

**基本写法：创建 Context**
`const <Context> = createContext(<默认值>);`
```typescript
// 创建 Context
import { createContext } from 'react';
const ThemeContext = createContext('light');
```

---

**基本写法：Provider 提供值**
`<<Context>.Provider value={<值>}>`
```tsx
// 提供上下文值
<ThemeContext.Provider value="dark">
    <App />
</ThemeContext.Provider>
```

---

**基本写法：useContext 消费**
`const <值> = useContext(<Context>);`
```typescript
// 消费上下文
import { useContext } from 'react';
const theme = useContext(ThemeContext);
```

---

## useReducer 复杂状态

**基本写法：useReducer**
`const [<状态>, <dispatch>] = useReducer(<reducer>, <初始值>);`
```typescript
// 复杂状态管理
import { useReducer } from 'react';
type State = { count: number };
type Action = { type: 'inc' } | { type: 'dec' };
function reducer(state: State, action: Action): State {
    switch (action.type) {
        case 'inc': return { count: state.count + 1 };
        case 'dec': return { count: state.count - 1 };
    }
}
const [state, dispatch] = useReducer(reducer, { count: 0 });
dispatch({ type: 'inc' });
```

---

## 自定义 Hook

**基本写法：自定义 Hook**
`function use<名称>(<参数>) { return <值>; }`
```typescript
// 自定义 Hook
function useLocalStorage(key: string, initial: string) {
    const [value, setValue] = useState(() => localStorage.getItem(key) || initial);
    useEffect(() => {
        localStorage.setItem(key, value);
    }, [key, value]);
    return [value, setValue] as const;
}
```

---

## 状态管理库

**基本写法：Zustand 创建 Store**
`const use<Store> = create((<set>) => ({ }));`
```typescript
// Zustand Store
import { create } from 'zustand';
interface BearStore {
    bears: number;
    addBear: () => void;
}
const useBearStore = create<BearStore>((set) => ({
    bears: 0,
    addBear: () => set((s) => ({ bears: s.bears + 1 })),
}));
// 使用
const bears = useBearStore((s) => s.bears);
const addBear = useBearStore((s) => s.addBear);
```

---

**基本写法：Jotai 原子状态**
`const <atom> = atom(<初始值>);`
```typescript
// Jotai 原子
import { atom, useAtom } from 'jotai';
const countAtom = atom(0);
function Counter() {
    const [count, setCount] = useAtom(countAtom);
    return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

---

## React 19 新特性

**基本写法：useActionState 表单状态**
`const [<状态>, <action>, <是否提交中>] = useActionState(<action>, <初始>);`
```typescript
// React 19 表单
import { useActionState } from 'react';
async function submitAction(prevState: string, formData: FormData) {
    return await save(formData);
}
const [state, action, isPending] = useActionState(submitAction, '');
```

---

**基本写法：use 读取 Promise**
`const <值> = use(<Promise>);`
```typescript
// React 19 use 读取异步值
import { use } from 'react';
function Message({ messagePromise }) {
    const message = use(messagePromise);
    return <p>{message}</p>;
}
```

---

**基本写法：useOptimistic 乐观更新**
`const [<optimisticValue>, <addOptimistic>] = useOptimistic(<实际值>, <reducer>);`
```typescript
// 乐观更新
import { useOptimistic } from 'react';
const [optimisticCount, addOptimistic] = useOptimistic(
    count,
    (state, newCount) => newCount
);
```
