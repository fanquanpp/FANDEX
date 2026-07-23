---
order: 8
tags:
  - react
difficulty: advanced
title: 性能优化
module: react
category: React
description: 'React.memo、useMemo/useCallback、代码分割、虚拟化、并发特性、Profiler 与性能分析。'
author: fanquanpp
updated: '2026-06-14'
related:
  - react/React19新特性
  - react/路由与数据获取
  - react/测试与工程化
  - react/Next.js全栈开发
prerequisites: []
---

## 1. React.memo

`React.memo` 是高阶组件，对组件进行浅比较，避免不必要的重渲染。

### 1.1 基本用法

```tsx
import { memo } from 'react';

interface UserCardProps {
  name: string;
  avatar: string;
  onClick: (id: string) => void;
}

// 使用 memo 包裹，props 不变时跳过渲染
const UserCard = memo(function UserCard({ name, avatar }: UserCardProps) {
  console.log('UserCard 渲染'); // 仅在 props 变化时打印
  return (
    <div className="user-card">
      <img src={avatar} alt={name} />
      <span>{name}</span>
    </div>
  );
});
```

### 1.2 自定义比较函数

```tsx
interface ItemProps {
  item: {
    id: string;
    name: string;
    tags: string[];
  };
  selected: boolean;
}

const Item = memo(
  function Item({ item, selected }: ItemProps) {
    return <div className={selected ? 'selected' : ''}>{item.name}</div>;
  },
  (prevProps, nextProps) => {
    // 自定义浅比较逻辑
    return (
      prevProps.item.id === nextProps.item.id &&
      prevProps.item.name === nextProps.item.name &&
      prevProps.selected === nextProps.selected
    );
  }
);
```

### 1.3 何时使用 memo

```tsx
//  场景一：频繁重渲染的父组件中的子组件
function Parent() {
  const [count, setCount] = useState(0); // 频繁变化
  return (
    <div>
      <p>{count}</p>
      <button onClick={() => setCount((c) => c + 1)}>+1</button>
      <ExpensiveChild /> {/* memo 包裹后不会随 count 变化而重渲染 */}
    </div>
  );
}

//  场景二：列表项组件
const ListItem = memo(function ListItem({ item }: { item: Item }) {
  return <li>{item.name}</li>;
});

//  不需要 memo：props 经常变化
//  不需要 memo：组件很轻量，重渲染成本极低
```

## 2. useMemo / useCallback

### 2.1 避免不必要的计算

```tsx
function ProductTable({ products, filterText, sortBy }: Props) {
  //  缓存计算结果
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => p.name.includes(filterText))
      .sort((a, b) => {
        if (sortBy === 'price') return a.price - b.price;
        return a.name.localeCompare(b.name);
      });
  }, [products, filterText, sortBy]);

  return (
    <table>
      {filteredProducts.map((p) => (
        <ProductRow key={p.id} product={p} />
      ))}
    </table>
  );
}
```

### 2.2 稳定引用

```tsx
function SearchPage() {
  const [query, setQuery] = useState('');

  //  缓存对象引用，避免子组件因新引用而重渲染
  const searchOptions = useMemo(() => ({ query, pageSize: 20, includeArchived: false }), [query]);

  //  缓存函数引用
  const handleSearch = useCallback((newQuery: string) => {
    setQuery(newQuery);
  }, []);

  return (
    <div>
      <SearchInput onSearch={handleSearch} />
      <SearchResults options={searchOptions} />
    </div>
  );
}
```

## 3. 代码分割（lazy/Suspense）

### 3.1 React.lazy 动态导入

```tsx
import { lazy, Suspense } from 'react';

// 懒加载组件
const Dashboard = lazy(() => import('./Dashboard'));
const Settings = lazy(() => import('./Settings'));
const Profile = lazy(() => import('./Profile'));

function App() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}
```

### 3.2 路由级代码分割

```tsx
import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router';

const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const Users = lazy(() => import('./pages/Users'));

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>;
}

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <SuspenseWrapper>
        <Home />
      </SuspenseWrapper>
    ),
  },
  {
    path: '/about',
    element: (
      <SuspenseWrapper>
        <About />
      </SuspenseWrapper>
    ),
  },
  {
    path: '/users',
    element: (
      <SuspenseWrapper>
        <Users />
      </SuspenseWrapper>
    ),
  },
]);
```

### 3.3 命名导出懒加载

```tsx
// utils/lazy.ts
import { lazy, type ComponentType } from 'react';

function lazyNamed<T extends ComponentType<any>>(
  factory: () => Promise<{ [key: string]: T }>,
  name: string
) {
  return lazy(() => factory().then((module) => ({ default: module[name] })));
}

// 使用
const MyComponent = lazyNamed(() => import('./components'), 'MyComponent');
```

## 4. 虚拟化

### 4.1 为什么需要虚拟化

当列表数据量很大时（如 10000+ 条），直接渲染所有 DOM 节点会导致严重卡顿。虚拟化只渲染可视区域内的元素。

### 4.2 @tanstack/react-virtual

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

function VirtualList({ items }: { items: Array<{ id: string; name: string }> }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50, // 每行预估高度
    overscan: 5, // 可视区域外额外渲染的行数
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              transform: `translateY(${virtualItem.start}px)`,
              height: `${virtualItem.size}px`,
              width: '100%',
            }}
          >
            {items[virtualItem.index].name}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 4.3 react-window

```tsx
import { FixedSizeList as List } from 'react-window';

function BigList({ items }: { items: string[] }) {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>{items[index]}</div>
  );

  return (
    <List height={600} itemCount={items.length} itemSize={50} width="100%">
      {Row}
    </List>
  );
}
```

## 5. 并发特性

### 5.1 useTransition

`useTransition` 将状态更新标记为非紧急，允许 UI 保持响应。

```tsx
import { useTransition, useState } from 'react';

function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const handleSearch = (value: string) => {
    // 紧急更新：输入框立即响应
    setQuery(value);

    // 非紧急更新：搜索结果可以延迟
    startTransition(() => {
      const filtered = hugeData.filter((item) =>
        item.name.toLowerCase().includes(value.toLowerCase())
      );
      setResults(filtered);
    });
  };

  return (
    <div>
      <input value={query} onChange={(e) => handleSearch(e.target.value)} placeholder="搜索..." />
      {isPending && <Spinner />}
      <ul>
        {results.map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ul>
    </div>
  );
}
```

### 5.2 useDeferredValue

`useDeferredValue` 延迟更新某个值的渲染，与 `useTransition` 类似但适用于接收延迟值的场景。

```tsx
import { useDeferredValue, useState, useMemo } from 'react';

function SearchResults({ query }: { query: string }) {
  const deferredQuery = useDeferredValue(query);

  const results = useMemo(() => {
    return hugeData.filter((item) => item.name.toLowerCase().includes(deferredQuery.toLowerCase()));
  }, [deferredQuery]);

  return (
    <ul>
      {results.map((r) => (
        <li key={r.id}>{r.name}</li>
      ))}
    </ul>
  );
}

function SearchPage() {
  const [query, setQuery] = useState('');

  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <SearchResults query={query} />
    </div>
  );
}
```

### 5.3 useTransition vs useDeferredValue

| 特性           | useTransition  | useDeferredValue    |
| :------------- | :------------- | :------------------ |
| 控制粒度       | 控制更新过程   | 控制值的延迟        |
| 获取 isPending | 可以           | 不可以              |
| 使用方式       | 包裹 setState  | 包裹值              |
| 适用场景       | 主动触发的更新 | 接收 props 的子组件 |

## 6. Profiler

### 6.1 React DevTools Profiler

React DevTools 提供了 Profiler 面板，可以可视化组件渲染性能：

1. 安装 React DevTools 浏览器扩展
2. 切换到 Profiler 标签
3. 点击录制按钮
4. 操作应用
5. 停止录制，查看火焰图

### 6.2 编程式 Profiler

```tsx
import { Profiler } from 'react';

function onRenderCallback(
  id: string,
  phase: 'mount' | 'update' | 'nested-update',
  actualDuration: number,
  baseDuration: number,
  startTime: number,
  commitTime: number
) {
  // 记录渲染性能数据
  console.log(`${id} ${phase} 耗时：${actualDuration.toFixed(2)}ms`);
}

function App() {
  return (
    <Profiler id="App" onRender={onRenderCallback}>
      <Dashboard />
    </Profiler>
  );
}
```

## 7. 性能分析

### 7.1 Chrome DevTools Performance

1. 打开 Chrome DevTools → Performance
2. 点击录制
3. 操作应用
4. 停止录制
5. 分析 Main 线程中的长任务

### 7.2 React Compiler

React Compiler（原 React Forget）是 React 团队开发的编译器，自动优化组件重渲染：

```bash
# 安装 React Compiler
npm install babel-plugin-react-compiler
```

```js
// babel.config.js
module.exports = {
  presets: ['@babel/preset-react'],
  plugins: ['react-compiler'],
};
```

```tsx
// 使用 Compiler 后，无需手动 useMemo/useCallback
function SearchPage() {
  const [query, setQuery] = useState('');

  // Compiler 自动优化，无需 useCallback
  const handleSearch = (value: string) => {
    setQuery(value);
  };

  // Compiler 自动优化，无需 useMemo
  const results = hugeData.filter((item) => item.name.includes(query));

  return (
    <div>
      <SearchInput onSearch={handleSearch} />
      <ResultList results={results} />
    </div>
  );
}
```

### 7.3 性能优化清单

| 优化项       | 方法                             | 优先级 |
| :----------- | :------------------------------- | :----- |
| 减少重渲染   | React.memo + useMemo/useCallback | 高     |
| 代码分割     | React.lazy + Suspense            | 高     |
| 虚拟化长列表 | @tanstack/react-virtual          | 高     |
| 图片优化     | next/image 或懒加载              | 中     |
| 非紧急更新   | useTransition / useDeferredValue | 中     |
| Bundle 分析  | webpack-bundle-analyzer          | 中     |
| 缓存数据     | React Query / SWR                | 中     |
| 预加载       | preload / prefetch               | 低     |
| Web Worker   | 计算密集型任务移出主线程         | 低     |
| SSR/SSG      | 服务端渲染减少客户端工作         | 视场景 |
