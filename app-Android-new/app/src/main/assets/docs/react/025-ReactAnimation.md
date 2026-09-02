---
order: 250
title: React 动画
module: 'react'
category: 前端技术
difficulty: intermediate
description: React动画实现方案
author: fanquanpp
updated: '2026-08-01'
related:
  - 'react/023-ReactRouteAdvanced'
  - 'react/024-ReactI18n'
  - 'react/026-ReactSSR'
  - 'react/027-ReactDesignPattern'
prerequisites:
  - 'react/001-OverviewEnvSetup'
---

## 前置知识

- [React 国际化](/react/024-ReactI18n)：建议先完成前一篇的学习

## 学习目标

- 掌握「概述」的核心机制、典型用法与常见陷阱
- 掌握「基础概念」的核心机制、典型用法与常见陷阱
- 掌握「快速上手」的核心机制、典型用法与常见陷阱
- 掌握「详细用法」的核心机制、典型用法与常见陷阱
- 掌握「常见场景」的核心机制、典型用法与常见陷阱


## 概述

React动画实现方案。本文将从基础概念、快速上手、详细用法、常见场景、注意事项和进阶用法六个方面全面介绍React动画。

## 基础概念

React动画涉及以下核心概念：

- **核心原理**：理解React动画的底层工作机制和设计理念
- **关键术语**：掌握相关术语和概念，建立知识框架
- **适用场景**：明确何时使用React动画，何时选择其他方案

```jsx
// React动画的基本结构示例
function Example() {
  return <div>React动画示例</div>;
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

// React动画的最简示例
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
// React动画的核心功能演示
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
// React动画与 React 生态集成
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

- 使用React动画时需要注意性能影响，避免不必要的重渲染
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
## CSS Transitions

**transition 基础**
`transition: <property> <duration> [<timing-function>] [<delay>];`
```tsx
<div style={{
  transition: 'transform 0.3s ease, opacity 0.2s',
}} />
```

**transition-property 多属性**
```tsx
const style: React.CSSProperties = {
  transitionProperty: 'transform, opacity',
  transitionDuration: '300ms, 200ms',
  transitionTimingFunction: 'ease-in-out',
  transitionDelay: '0s, 100ms',
};
```

---

## CSS Animations

**@keyframes**
```tsx
const spin = `@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}`;

<div style={{ animation: 'spin 1s linear infinite' }} />;
```

**animation 简写**
`animation: <name> <duration> <timing> <delay> <count> <direction> <fill-mode>;`
```tsx
<div style={{
  animation: 'fade-in 0.5s ease-out 0s 1 normal forwards',
}} />;
```

---

## React Transition API

**useTransition**
`const [<isPending>, <startTransition>] = useTransition();`
```tsx
import { useTransition } from 'react';

function Tabs() {
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState('home');

  const onChange = (next: string) => {
    startTransition(() => setTab(next));
  };

  return (
    <>
      <button onClick={() => onChange('profile')} disabled={isPending}>
        {isPending ? '加载中...' : '个人资料'}
      </button>
      <Content tab={tab} />
    </>
  );
}
```

**useDeferredValue**
`const <deferred> = useDeferredValue(<value>);`
```tsx
import { useDeferredValue, useMemo } from 'react';

function Search({ query }: { query: string }) {
  const deferredQuery = useDeferredValue(query);
  const results = useMemo(() => search(deferredQuery), [deferredQuery]);
  return <List items={results} />;
}
```

---

## Transition 组件 (react-transition-group)

**CSSTransition**
`<CSSTransition in={<bool>} timeout={<ms>} classNames=<name>>`
```tsx
import { CSSTransition } from 'react-transition-group';

<CSSTransition
  in={isVisible}
  timeout={300}
  classNames="fade"
  unmountOnExit
>
  <div className="modal">...</div>
</CSSTransition>
```

**classNames 对象形式**
```tsx
<CSSTransition
  in={show}
  timeout={300}
  classNames={{
    enter: 'fade-enter',
    enterActive: 'fade-enter-active',
    exit: 'fade-exit',
    exitActive: 'fade-exit-active',
  }}
>
  <div />
</CSSTransition>
```

**SwitchTransition**
```tsx
import { SwitchTransition, CSSTransition } from 'react-transition-group';

<SwitchTransition mode="out-in">
  <CSSTransition key={currentId} timeout={300} classNames="fade">
    <div>{current.name}</div>
  </CSSTransition>
</SwitchTransition>
```

**TransitionGroup**
```tsx
import { TransitionGroup, CSSTransition } from 'react-transition-group';

<TransitionGroup>
  {items.map(item => (
    <CSSTransition key={item.id} timeout={300} classNames="item">
      <li>{item.text}</li>
    </CSSTransition>
  ))}
</TransitionGroup>
```

---

## framer-motion API

**motion 组件**
`import { motion } from 'framer-motion';`
```tsx
import { motion } from 'framer-motion';

<motion.div
  animate={{ opacity: 1, x: 0 }}
  initial={{ opacity: 0, x: -100 }}
  transition={{ duration: 0.3 }}
/>
```

**animate 属性**
`animate={{ <prop>: <value> }}`
```tsx
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  animate={{ rotate: isRotated ? 180 : 0 }}
/>
```

**variants 变体**
```tsx
const variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

<motion.div
  variants={variants}
  initial="hidden"
  animate="visible"
  transition={{ duration: 0.3 }}
/>;
```

**stagger 子元素序列**
```tsx
const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

<motion.ul variants={container} initial="hidden" animate="visible">
  {items.map(i => (
    <motion.li key={i.id} variants={item}>{i.text}</motion.li>
  ))}
</motion.ul>;
```

**AnimatePresence 退场动画**
```tsx
import { AnimatePresence, motion } from 'framer-motion';

<AnimatePresence>
  {isOpen && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    />
  )}
</AnimatePresence>
```

**useAnimation 控制器**
```tsx
import { useAnimation } from 'framer-motion';

function Box() {
  const controls = useAnimation();
  return (
    <>
      <motion.div animate={controls} />
      <button onClick={() => controls.start({ x: 100 })}>移动</button>
    </>
  );
}
```

**useInView 视图触发**
```tsx
import { useInView } from 'framer-motion';
import { useRef } from 'react';

function Section() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return <motion.div ref={ref} animate={{ opacity: inView ? 1 : 0 }} />;
}
```

**drag 拖拽**
```tsx
<motion.div
  drag
  dragConstraints={{ left: 0, right: 300, top: 0, bottom: 300 }}
  onDragEnd={(e, info) => console.log(info.offset.x, info.offset.y)}
/>
```

**layout 动画**
```tsx
<motion.div layout>内容</motion.div>
<motion.div layoutId="shared">共享布局</motion.div>
```

---

## requestAnimationFrame

**rAF 动画循环**
`const <id> = requestAnimationFrame(<callback>);`
```tsx
useEffect(() => {
  let rafId: number;
  const tick = () => {
    setAngle(a => (a + 1) % 360);
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(rafId);
}, []);
```

---

## Web Animations API

**element.animate**
`<el>.animate(<keyframes>, <options>);`
```tsx
const ref = useRef<HTMLDivElement>(null);
useEffect(() => {
  const el = ref.current;
  if (!el) return;
  const anim = el.animate(
    [
      { transform: 'translateX(0px)' },
      { transform: 'translateX(100px)' },
    ],
    { duration: 500, iterations: Infinity, easing: 'ease-in-out' }
  );
  return () => anim.cancel();
}, []);
```
