---
order: 80
title: 性能优化
module: 'react'
category: 前端技术
difficulty: advanced
description: React.memo、useMemo/useCallback、代码分割、虚拟化、并发特性、Profiler 与性能分析。
author: fanquanpp
updated: '2026-08-01'
related:
  - 'react/006-React19NewFeatures'
  - 'react/007-RouteDataFetch'
  - 'react/009-TestEngineering'
  - 'react/010-NextJSFullStack'
prerequisites: []
---

## 前置知识

- [路由与数据获取](/react/007-RouteDataFetch)：建议先完成前一篇的学习

## 学习目标

- 掌握「1. React.memo」的核心机制、典型用法与常见陷阱
- 掌握「2. useMemo / useCallback」的核心机制、典型用法与常见陷阱
- 掌握「3. 代码分割（lazy/Suspense）」的核心机制、典型用法与常见陷阱
- 掌握「4. 虚拟化」的核心机制、典型用法与常见陷阱
- 掌握「5. 并发特性」的核心机制、典型用法与常见陷阱


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
## React.memo 组件记忆化

**基本写法：对函数组件进行浅比较记忆化**
`const <组件> = React.memo(<组件> [, <对比函数>])`
```tsx
// 仅当 props 变化时才重新渲染
const UserCard = React.memo(function UserCard({ name, age }) {
  return <div>{name} - {age}</div>;
});
```

---

**基本写法：自定义对比函数**
`React.memo(<组件>, (<prevProps>, <nextProps>) => <是否相等>)`
```tsx
// 返回 true 表示跳过渲染
const Item = React.memo(ItemBase, (prev, next) => prev.id === next.id);
```

---

## useMemo 缓存计算结果

**基本写法：缓存昂贵计算的结果**
`const <值> = useMemo(() => <计算>, [<依赖>])`
```tsx
// 仅当 deps 变化时重新计算
const sorted = useMemo(() => list.sort(), [list]);
```

---

**基本写法：缓存对象引用**
`const <对象> = useMemo(() => ({ <字段> }), [<依赖>])`
```tsx
// 避免每次渲染生成新对象引用
const style = useMemo(() => ({ color: 'red' }), []);
```

---

## useCallback 缓存函数引用

**基本写法：缓存函数实例避免子组件重渲染**
`const <函数> = useCallback((<参数>) => <逻辑>, [<依赖>])`
```tsx
// 配合 React.memo 子组件使用
const handleClick = useCallback(() => doAction(id), [id]);
```

---

## lazy 与 Suspense 延迟加载

**基本写法：动态导入组件**
`const <组件> = lazy(() => import(<路径>))`
```tsx
// 按需加载路由级组件
const Detail = lazy(() => import('./Detail'));
```

---

**基本写法：配合 Suspense 显示降级 UI**
`<Suspense fallback={<占位>}> <组件 /> </Suspense>`
```tsx
// 加载期间显示 fallback
<Suspense fallback={<Spinner />}>
  <Detail />
</Suspense>
```

---

**基本写法：嵌套 Suspense 边界**
`<Suspense fallback={<外层占位>}> <<父组件> /> </Suspense>`
```tsx
// 子组件独立Suspense避免整页阻塞
<Suspense fallback={<PageSkeleton />}>
  <Header />
  <Suspense fallback={<ListSkeleton />}>
    <List />
  </Suspense>
</Suspense>
```

---

## 列表虚拟化

**基本写法：长列表只渲染可见项**
`<虚拟列表 <数据>={数据} />`
```tsx
// 使用 react-window 减少 DOM 节点数量
import { FixedSizeList } from 'react-window';
<FixedSizeList height={600} itemCount={10000} itemSize={40} width={400}>
  {({ index, style }) => <div style={style}>行 {index}</div>}
</FixedSizeList>
```

---

## key 优化列表渲染

**基本写法：为列表项提供稳定唯一 key**
`<列表项 key={<唯一标识>} />`
```tsx
// 使用业务 id 而非数组索引
{todos.map(t => <TodoItem key={t.id} todo={t} />)}
```

---

## 状态拆分降低渲染范围

**基本写法：将高频更新状态隔离到独立子组件**
`function <子组件>() { const [<状态>, <设置>] = useState(<初值>); }`
```tsx
// 输入框高频更新不触发父组件渲染
function SearchInput() {
  const [text, setText] = useState('');
  return <input value={text} onChange={e => setText(e.target.value)} />;
}
```

---

## useDeferredValue 延迟更新

**基本写法：将非紧急更新标记为可延迟**
`const <延迟值> = useDeferredValue(<值>)`
```tsx
// 搜索结果可延迟，输入框保持流畅
const deferredQuery = useDeferredValue(query);
const results = useMemo(() => filter(deferredQuery), [deferredQuery]);
```

---

## 批量更新 Automatic Batching

**基本写法：同一事件中多次 setState 自动合并**
`<设置1>(<值1>); <设置2>(<值2>);`
```tsx
// React 18+ 自动批量合并为一次渲染
function handleClick() {
  setCount(c => c + 1);
  setFlag(f => !f);
}
```

---

**基本写法：flushSync 强制同步刷新**
`flushSync(() => { <更新> })`
```tsx
// 需要立即反映 DOM 时使用
import { flushSync } from 'react-dom';
flushSync(() => setScrollTop(0));
```

---

## Profiler 性能分析

**基本写法：测量组件渲染耗时**
`<Profiler id={<标识>} onRender={<回调>}> <子组件 /> </Profiler>`
```tsx
// 收集渲染阶段与耗时
<Profiler id="App" onRender={(id, phase, actualTime) => console.log(id, phase, actualTime)}>
  <App />
</Profiler>
```

---

## 图片与资源懒加载

**基本写法：图片原生懒加载**
`<img src={<路径>} loading="lazy" />`
```tsx
// 视口进入时再加载图片
<img src="/a.jpg" loading="lazy" alt="封面" />
```

---

## 代码分割按路由

**基本写法：路由配置级懒加载**
`const <页面> = lazy(() => import(<页面路径>))`
```tsx
// 每个路由独立 chunk
const Home = lazy(() => import('./pages/Home'));
const User = lazy(() => import('./pages/User'));
```

---

## Context 渲染优化

**基本写法：拆分 Context 避免无关消费者更新**
`const <静态Context> = createContext(<静态值>); const <动态Context> = createContext(<动态值>);`
```tsx
// 静态与高频更新状态分离
const ThemeContext = createContext('light');
const UserContext = createContext(null);
```

---

## ref 读取而非订阅

**基本写法：频繁变化的值不进 state**
`const <ref> = useRef(<初值>); <ref>.current = <新值>;`
```tsx
// 不触发渲染的容器
const timerRef = useRef(null);
timerRef.current = setInterval(tick, 1000);
```

---

## 使用 Production 构建

**基本写法：生产环境去除开发警告**
`npm run build`
```bash
# 生产构建自动启用优化
npm run build
```

---

## Strict Mode 排查副作用

**基本写法：开发期双重渲染检测副作用**
`<React.StrictMode> <根组件 /> </React.StrictMode>`
```tsx
// 开发环境帮助发现不纯渲染
<React.StrictMode>
  <App />
</React.StrictMode>
```

---

## Web Worker 卸载计算

**基本写法：将繁重任务交给 Worker**
`const <worker> = new Worker(new URL(<脚本>, import.meta.url))`
```tsx
// 主线程保持响应
const worker = new Worker(new URL('./heavy.js', import.meta.url));
worker.postMessage(data);
```

---

## useSyncExternalStore 订阅外部源

**基本写法：安全订阅外部 store**
`const <值> = useSyncExternalStore(<订阅>, <快照>, [<服务端快照>])`
```tsx
// 避免 tearing 撕裂问题
const width = useSyncExternalStore(subscribeResize, () => window.innerWidth);
```

---

## 避免内联对象与函数

**基本写法：将常量对象提到组件外**
`const <常量对象> = { <字段> };`
```tsx
// 防止每次渲染新建对象破坏 memo
const HEADER_STYLE = { padding: 8 };
function Header() { return <div style={HEADER_STYLE} />; }
```

---

## useTransition 降低更新优先级

**基本写法：将昂贵更新标记为过渡**
`const [<isPending>, <startTransition>] = useTransition()`
```tsx
// 切换标签页时保持交互响应
const [isPending, startTransition] = useTransition();
startTransition(() => setTab(target));
```

---

## 虚拟化表格优化

**基本写法：表格按行虚拟化**
`<FixedSizeList <数据>={行} itemSize={<行高>} >`
```tsx
// 万行数据表格仍流畅
<FixedSizeList height={500} itemCount={rows.length} itemSize={36} width="100%">
  {({ index, style, data }) => <Row style={style} data={data[index]} />}
</FixedSizeList>
```

---

## tree shaking 减小体积

**基本写法：按命名导入而非整体引入**
`import { <命名> } from <库>`
```tsx
// 仅打包使用到的工具函数
import { debounce } from 'lodash-es';
```

---

## 预加载关键资源

**基本写法：在入口注入资源预取**
`<link rel="preload" href=<资源> as=<类型> />`
```tsx
// 关键字体提前加载
<link rel="preload" href="/fonts.woff2" as="font" type="font/woff2" crossOrigin />
```
