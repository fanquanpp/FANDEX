## 前置知识

- [Fiber 架构](/react/012-FiberArchitecture)：建议先完成前一篇的学习

## 学习目标

- 掌握「概述」的核心机制、典型用法与常见陷阱
- 掌握「基础概念」的核心机制、典型用法与常见陷阱
- 掌握「快速上手」的核心机制、典型用法与常见陷阱
- 掌握「详细用法」的核心机制、典型用法与常见陷阱
- 掌握「常见场景」的核心机制、典型用法与常见陷阱


## 概述

Concurrent 模式是 React 18 引入的核心特性，允许 React 在渲染过程中中断、暂停和恢复工作。传统模式下 React 的渲染是同步不可中断的，一旦开始就会执行到底，这可能导致长时间的任务阻塞用户交互。并发渲染通过可中断的渲染机制，使 React 能够优先处理高优先级更新（如用户输入），将低优先级更新（如数据获取）推迟到空闲时执行。

并发模式不是一个新的 API 或模式，而是一组功能的统称，包括 useTransition、useDeferredValue、Suspense 和流式 SSR 等。

## 基础概念

### 同步渲染 vs 并发渲染

| 特性     | 同步渲染           | 并发渲染             |
| -------- | ------------------ | -------------------- |
| 渲染方式 | 不可中断，一气呵成 | 可中断、可恢复       |
| 优先级   | 所有更新同等优先   | 区分紧急和非紧急更新 |
| 用户感知 | 长任务可能导致卡顿 | 高优先级更新立即响应 |
| 兼容性   | React 17 及之前    | React 18+            |

### 优先级模型

React 将更新分为不同优先级，高优先级更新可以中断低优先级渲染：

- **紧急更新**（UserBlocking）：用户交互，如输入、点击
- **普通更新**（Normal）：数据请求结果
- **过渡更新**（Transition）：UI 切换，如标签页切换
- **空闲更新**（Idle）：预加载、分析上报

## 快速上手

### useTransition 标记非紧急更新

```jsx
import { useTransition, useState } from 'react';

function SearchPage() {
  const [isPending, startTransition] = useTransition();
  const [inputValue, setInputValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  function handleChange(e) {
    // 紧急更新：输入框立即响应
    setInputValue(e.target.value);

    // 非紧急更新：搜索结果可以延迟显示
    startTransition(() => {
      setSearchQuery(e.target.value);
    });
  }

  return (
    <div>
      <input value={inputValue} onChange={handleChange} />
      {isPending && <span>搜索中...</span>}
      <SearchResults query={searchQuery} />
    </div>
  );
}
```

### useDeferredValue 延迟更新

```jsx
import { useDeferredValue, useMemo } from 'react';

function SearchPage({ query }) {
  // 延迟版本的查询值，让紧急更新优先
  const deferredQuery = useDeferredValue(query);

  // 使用延迟值计算结果，避免阻塞输入
  const results = useMemo(() => search(deferredQuery), [deferredQuery]);

  return (
    <div>
      <input value={query} onChange={handleChange} />
      <ResultList results={results} />
    </div>
  );
}
```

## 详细用法

### Suspense 与并发渲染

```jsx
import { Suspense } from 'react';

// 数据获取组件，使用 Suspense 等待
function UserProfile({ userId }) {
  const user = useFetchUser(userId); // 抛出 Promise 触发 Suspense
  return <div>{user.name}</div>;
}

// 使用 Suspense 包裹
function App() {
  return (
    <div>
      <h1>用户中心</h1>
      <Suspense fallback={<Loading />}>
        <UserProfile userId={1} />
      </Suspense>
    </div>
  );
}
```

### Suspense 与多数据源

```jsx
import { Suspense } from 'react';

function Dashboard() {
  return (
    <div className="dashboard">
      {/* 每个区域独立加载，互不影响 */}
      <section>
        <Suspense fallback={<Skeleton />}>
          <UserProfile />
        </Suspense>
      </section>

      <section>
        <Suspense fallback={<ChartSkeleton />}>
          <AnalyticsChart />
        </Suspense>
      </section>

      <section>
        <Suspense fallback={<ListSkeleton />}>
          <RecentActivities />
        </Suspense>
      </section>
    </div>
  );
}
```

### useTransition 与列表过滤

```jsx
import { useTransition, useState } from 'react';

function FilterableList({ items }) {
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState('');

  const filteredItems = useMemo(() => {
    return items.filter((item) => item.name.toLowerCase().includes(filter.toLowerCase()));
  }, [items, filter]);

  function handleFilterChange(e) {
    // 输入框立即响应
    const value = e.target.value;

    // 过滤操作标记为过渡更新
    startTransition(() => {
      setFilter(value);
    });
  }

  return (
    <div>
      <input onChange={handleFilterChange} placeholder="搜索..." />
      <ul style={{ opacity: isPending ? 0.7 : 1 }}>
        {filteredItems.map((item) => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

## 常见场景

### 标签页切换

```jsx
import { useTransition, useState } from 'react';

function TabContainer() {
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState('overview');

  function switchTab(tab) {
    // 标签切换标记为过渡更新
    startTransition(() => {
      setActiveTab(tab);
    });
  }

  return (
    <div>
      <nav>
        <button onClick={() => switchTab('overview')}>概览</button>
        <button onClick={() => switchTab('details')}>详情</button>
        <button onClick={() => switchTab('settings')}>设置</button>
      </nav>
      <div style={{ opacity: isPending ? 0.7 : 1 }}>
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'details' && <DetailsTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
}
```

### 流式 SSR

```jsx
// 服务端：使用 renderToPipeableStream 实现流式渲染
import { renderToPipeableStream } from 'react-dom/server';

app.get('/', (req, res) => {
  const stream = renderToPipeableStream(<App />, {
    onShellReady() {
      // HTML 骨架就绪，开始流式传输
      res.setHeader('content-type', 'text/html');
      stream.pipe(res);
    },
    onShellError(error) {
      // 骨架渲染失败
      res.status(500).send('服务端渲染失败');
    },
    onError(error) {
      console.error(error);
    },
  });
});
```

## 注意事项

- useTransition 和 useDeferredValue 不能用于受控输入的值，输入框的值必须同步更新
- isPending 为 true 时不要隐藏或卸载旧内容，应使用透明度等视觉提示
- Suspense 的 fallback 不应过于复杂，否则会增加首屏渲染时间
- 并发特性不会改变代码的执行结果，只改变渲染的时机和优先级
- React 18 默认启用了并发特性，不再需要 ConcurrentMode 包裹
- startTransition 中的状态更新不能用于紧急的副作用（如路由跳转）

## 进阶用法

### Suspense 与错误边界结合

```jsx
import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

function SafeDataComponent({ userId }) {
  return (
    <ErrorBoundary
      fallback={<div>数据加载失败，请重试</div>}
      onReset={() => {
        /* 重置逻辑 */
      }}
    >
      <Suspense fallback={<Loading />}>
        <UserProfile userId={userId} />
      </Suspense>
    </ErrorBoundary>
  );
}
```

### Selective Hydration

```jsx
// React 18 的选择性水合：Suspense 边界内的组件不会阻塞其他组件的水合
function Page() {
  return (
    <Layout>
      {/* 这部分立即水合 */}
      <NavBar />

      {/* 这部分可以延迟水合 */}
      <Suspense fallback={<CommentsSkeleton />}>
        <Comments />
      </Suspense>

      {/* 这部分也立即水合 */}
      <Footer />
    </Layout>
  );
}
```

### useTransition 与乐观更新

```jsx
import { useTransition, useState } from 'react';

function LikeButton({ postId, initialLiked }) {
  const [isPending, startTransition] = useTransition();
  const [liked, setLiked] = useState(initialLiked);

  function handleLike() {
    // 乐观更新：立即反映用户操作
    startTransition(async () => {
      setLiked(!liked);
      try {
        await toggleLike(postId);
      } catch {
        // 失败时回滚
        setLiked(liked);
      }
    });
  }

  return (
    <button onClick={handleLike} disabled={isPending}>
      {liked ? '已点赞' : '点赞'}
    </button>
  );
}
```
## useTransition 过渡更新

**基本写法：将状态更新标记为低优先级**
`const [<isPending>, <startTransition>] = useTransition()`
```tsx
// 切换标签页保持输入框响应
const [isPending, startTransition] = useTransition();
function changeTab(next) {
  startTransition(() => setTab(next));
}
```

---

**基本写法：展示过渡中状态**
`{<isPending> && <占位>}`
```tsx
// 显示加载指示
{isPending ? <Spinner /> : <Content />}
```

---

**基本写法：异步 Action**
`startTransition(async () => { <异步逻辑> })`
```tsx
// React 19 支持异步过渡
startTransition(async () => {
  const data = await fetchData();
  setResult(data);
});
```

---

## startTransition 全局函数

**基本写法：在组件外标记过渡更新**
`startTransition(() => <更新>)`
```tsx
// 从非组件代码触发过渡
import { startTransition } from 'react';
startTransition(() => store.setFilter('active'));
```

---

## useDeferredValue 延迟值

**基本写法：延迟非紧急值的更新**
`const <延迟值> = useDeferredValue(<值>)`
```tsx
// 搜索框输入即时响应结果延迟
const deferredQuery = useDeferredValue(query);
const results = useMemo(() => search(deferredQuery), [deferredQuery]);
```

---

**基本写法：检测是否处于滞后状态**
`const <是否滞后> = <值> !== <延迟值>`
```tsx
// 显示旧数据淡化效果
const isStale = query !== deferredQuery;
<div style={{ opacity: isStale ? 0.7 : 1 }}>{results}</div>
```

---

## Suspense 数据等待

**基本写法：包裹异步组件显示降级**
`<Suspense fallback={<占位>}> <异步组件 /> </Suspense>`
```tsx
// 数据未就绪时显示骨架
<Suspense fallback={<Skeleton />}>
  <Profile userId={id} />
</Suspense>
```

---

**基本写法：嵌套 Suspense 边界**
`<Suspense fallback={<外层>}> <Suspense fallback={<内层>}> <组件/> </Suspense> </Suspense>`
```tsx
// 不同区域独立 loading
<Suspense fallback={<PageFallback />}>
  <Header />
  <Suspense fallback={<ListFallback />}>
    <List />
  </Suspense>
</Suspense>
```

---

## Suspense 配合 lazy

**基本写法：路由级代码分割**
`const <组件> = lazy(() => import(<路径>))`
```tsx
// 按需加载并显示 fallback
const Settings = lazy(() => import('./Settings'));
<Suspense fallback={<Spinner />}><Settings /></Suspense>
```

---

## 并发更新优先级

**基本写法：紧急更新直接 setState**
`<设置>(<值>)`
```tsx
// 输入框立即响应属于高优先级
setInput(e.target.value);
```

---

**基本写法：非紧急更新放入 transition**
`startTransition(() => <设置>(<值>))`
```tsx
// 搜索结果可延迟
startTransition(() => setResults(filtered));
```

---

## 避免不必要的 loading

**基本写法：使用 useTransition 避免跳到 fallback**
`startTransition(() => <切换>)`
```tsx
// 切换 tab 时保留当前内容直到新内容就绪
startTransition(() => setTab(next));
```

---

## 并发渲染可中断

**基本写法：渲染过程可被打断让位高优先级**
`startTransition(() => <更新>)`
```tsx
// 用户输入打断后台渲染
function onType(v) {
  setInput(v); // 紧急
  startTransition(() => setMatches(filter(v))); // 可中断
}
```

---

## useSyncExternalStore 订阅外部

**基本写法：安全订阅外部 store 避免 tearing**
`const <快照> = useSyncExternalStore(<订阅>, <取值>, [<服务端取值>])`
```tsx
// 订阅 window 尺寸
const width = useSyncExternalStore(
  cb => window.addEventListener('resize', cb),
  () => window.innerWidth
);
```

---

**基本写法：提供 getServerSnapshot 支持 SSR**
`useSyncExternalStore(<订阅>, <取值>, <服务端取值>)`
```tsx
// 服务端返回默认值
const theme = useSyncExternalStore(subscribe, getSnapshot, () => 'light');
```

---

## 自动批处理

**基本写法：同一事件多次更新合并**
`<设置1>(<值1>); <设置2>(<值2>);`
```tsx
// React 18+ 自动合并为一次渲染
function handleClick() {
  setCount(c => c + 1);
  setFlag(f => !f);
}
```

---

**基本写法：异步代码也自动批处理**
`await <异步>; <设置>(<值>);`
```tsx
// Promise 内的更新也会合并
async function load() {
  const data = await fetch();
  setList(data);
  setLoading(false);
}
```

---

## flushSync 强制同步

**基本写法：跳过批处理立即刷新**
`flushSync(() => <更新>)`
```tsx
// 需要立即读取 DOM 时使用
import { flushSync } from 'react-dom';
flushSync(() => setScroll(0));
window.scrollTo(0, 0);
```

---

## selectNode 调度提示

**基本写法：useDeferredValue 实现非阻塞渲染**
`const <延迟> = useDeferredValue(<值>)`
```tsx
// 大列表过滤不阻塞输入
const deferred = useDeferredValue(text);
const items = useMemo(() => heavyFilter(deferred), [deferred]);
```

---

## Offscreen 隐藏组件

**基本写法：保留组件状态但隐藏显示**
`<Offscreen mode="hidden"> <组件 /> </Offscreen>`
```tsx
// 切换标签保留滚动位置（实验性）
<Offscreen mode={visible ? 'visible' : 'hidden'}>
  <ExpensiveList />
</Offscreen>
```

---

## useOptimistic 乐观更新

**基本写法：在请求期间乐观展示结果**
`const [<乐观值>, <添加>] = useOptimistic(<状态>, <更新函数>)`
```tsx
// 立即显示新消息
const [messages, addOptimistic] = useOptimistic(messages, (state, newMsg) => [...state, newMsg]);
```

---

## Suspense List 协调多个 Suspense

**基本写法：控制多个 Suspense 揭示顺序**
`<SuspenseList revealOrder="forwards"> <Suspense>...</Suspense> </SuspenseList>`
```tsx
// 按顺序揭示内容（实验性 API）
<SuspenseList revealOrder="forwards">
  <Suspense fallback={<S1 />}><A /></Suspense>
  <Suspense fallback={<S2 />}><B /></Suspense>
</SuspenseList>
```

---

## React 19 Actions

**基本写法：在 startTransition 中执行异步函数即 Action**
`startTransition(async () => <异步>)`
```tsx
// Actions 自动管理 pending 与错误
const [isPending, startTransition] = useTransition();
startTransition(async () => await submitForm(data));
```

---

## 并发模式注意事项

**基本写法：transition 内不可包含读取状态副作用**
`startTransition(() => { <设置>; })`
```tsx
// 仅做状态更新不读取
startTransition(() => setTab(next));
```

---

## transition 与 Suspense 配合

**基本写法：transition 内挂起会显示当前 UI 而非 fallback**
`startTransition(() => <切换挂起组件>)`
```tsx
// 切换路由不闪烁 loading
startTransition(() => setRoute('/detail'));
```

---

## 性能权衡

**基本写法：仅对昂贵非紧急更新使用 transition**
`startTransition(() => <昂贵更新>)`
```tsx
// 简单更新无需 transition 开销
setCount(c => c + 1);
```
