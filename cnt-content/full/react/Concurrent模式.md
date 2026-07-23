---
order: 52
title: Concurrent模式
module: react
category: React
difficulty: advanced
description: 并发渲染与Suspense集成
author: fanquanpp
updated: '2026-06-14'
related:
  - react/JSX深度解析
  - react/Fiber架构
  - react/服务端组件
  - react/Hooks原理
prerequisites:
  - react/概述与环境配置
---

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
