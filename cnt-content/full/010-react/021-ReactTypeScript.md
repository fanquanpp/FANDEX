---
order: 210
title: React 与 TypeScript
module: 'react'
category: 前端技术
difficulty: intermediate
description: React TypeScript最佳实践
author: fanquanpp
updated: '2026-08-30'
related:
  - 'react/019-ReactErrorBoundary'
  - 'react/020-ReactForm'
  - 'react/022-ReactTest'
  - 'react/023-ReactRouteAdvanced'
prerequisites:
  - 'react/001-OverviewEnvSetup'
---

## 概述

React TypeScript最佳实践。本文将从基础概念、快速上手、详细用法、常见场景、注意事项和进阶用法六个方面全面介绍React与TypeScript。

## 基础概念

React与TypeScript涉及以下核心概念：

- **核心原理**：理解React与TypeScript的底层工作机制和设计理念
- **关键术语**：掌握相关术语和概念，建立知识框架
- **适用场景**：明确何时使用React与TypeScript，何时选择其他方案

```jsx
// React与TypeScript的基本结构示例
function Example() {
  return <div>React与TypeScript示例</div>;
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

// React与TypeScript的最简示例
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
// React与TypeScript的核心功能演示
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
// React与TypeScript与 React 生态集成
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

- 使用React与TypeScript时需要注意性能影响，避免不必要的重渲染
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
## ComponentProps 提取属性

**ComponentProps**
`type <Props> = React.ComponentProps<<ElementType>>;`
```tsx
type DivProps = React.ComponentProps<'div'>;
type BtnProps = React.ComponentProps<'button'>;
type CompProps = React.ComponentProps<typeof MyComponent>;
```

**ComponentPropsWithRef 含 ref**
`React.ComponentPropsWithRef<<ElementType>>`
```tsx
type InputProps = React.ComponentPropsWithRef<'input'>;
```

**ComponentPropsWithoutRef 排除 ref**
`React.ComponentPropsWithoutRef<<ElementType>>`
```tsx
type PureProps = React.ComponentPropsWithoutRef<'div'>;
```

---

## ReactNode 节点类型

**ReactNode 任意节点**
`type <V> = React.ReactNode;`
```tsx
type Props = {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
};
```

**ReactElement 单元素**
`React.ReactElement`
```tsx
const el: React.ReactElement = <div>hello</div>;
```

**ReactElement 带泛型**
`React.ReactElement<<T>>`
```tsx
const el: React.ReactElement<{ value: string }> = <Comp value="x" />;
```

---

## FC 函数组件类型

**FC 基础**
`const <Component>: React.FC<<Props>>`
```tsx
type Props = { title: string };
const Title: React.FC<Props> = ({ title }) => <h1>{title}</h1>;
```

**FC 含 children**
`React.FC<React.PropsWithChildren<<Props>>>`
```tsx
const Card: React.FC<React.PropsWithChildren<{ title: string }>> = ({
  title,
  children,
}) => <section><h2>{title}</h2>{children}</section>;
```

**VFC 无 children**
```tsx
const Icon: React.FC<{ name: string }> = ({ name }) => <i className={name} />;
```

---

## ChangeEvent 事件类型

**ChangeEvent 表单**
`React.ChangeEvent<<Element>>`
```tsx
const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setValue(e.target.value);
};
```

**MouseEvent 鼠标**
`React.MouseEvent<<Element>>`
```tsx
const onClick = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.preventDefault();
};
```

**KeyboardEvent 键盘**
`React.KeyboardEvent<<Element>>`
```tsx
const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === 'Enter') submit();
};
```

**FormEvent 表单提交**
`React.FormEvent<<FormElement>>`
```tsx
const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
};
```

**EventHandler 处理器类型**
```tsx
type Change = React.ChangeEventHandler<HTMLInputElement>;
type Click = React.MouseEventHandler<HTMLButtonElement>;
type KeyDown = React.KeyboardEventHandler<HTMLInputElement>;
```

---

## CSSProperties 样式类型

**CSSProperties 内联样式**
`React.CSSProperties`
```tsx
const style: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  color: '#333',
};
<div style={style} />;
```

**自定义 CSS 变量**
```tsx
const style = {
  '--brand': '#0066ff',
  width: '100%',
} as React.CSSProperties;
```

**PropertiesHyphen 长划线**
```tsx
const style: React.CSSProperties = {
  'background-color': 'red',
  'font-size': '14px',
};
```

---

## Ref 类型

**Ref 类型**
`React.Ref<<Element>>`
```tsx
const inputRef: React.Ref<HTMLInputElement> = useRef(null);
```

**RefObject**
`React.RefObject<<Element>>`
```tsx
const ref: React.RefObject<HTMLDivElement> = { current: null };
```

**MutableRefObject**
`React.MutableRefObject<<T>>`
```tsx
const counterRef: React.MutableRefObject<number> = useRef(0);
```

**RefCallback**
`React.RefCallback<<Element>>`
```tsx
const callback: React.RefCallback<HTMLDivElement> = (el) => {
  if (el) observe(el);
};
```

---

## 常用类型别名

**Dispatch 派发器**
`React.Dispatch<<Action>>`
```tsx
const dispatch: React.Dispatch<Action> = useDispatch();
```

**Reducer**
`React.Reducer<<State>, <Action>>`
```tsx
const reducer: React.Reducer<State, Action> = (state, action) => state;
```

**MutableRefObject / RefObject**
```tsx
const counter: React.MutableRefObject<number> = useRef(0);
const div: React.RefObject<HTMLDivElement> = useRef(null);
```

**Awaited 异步结果类型**
```tsx
type User = Awaited<ReturnType<typeof fetchUser>>;
```

---

## JSX 命名空间类型

**JSX.Element**
`JSX.Element`
```tsx
const heading: JSX.Element = <h1>Title</h1>;
```

**JSX.IntrinsicElements 内置元素**
`JSX.IntrinsicElements['<tag>']`
```tsx
const divProps: JSX.IntrinsicElements['div'] = { id: 'root', className: 'box' };
```

**ElementRef 提取元素类型**
`React.ElementRef<<ElementType>>`
```tsx
type InputEl = React.ElementRef<'input'>; // HTMLInputElement
```
