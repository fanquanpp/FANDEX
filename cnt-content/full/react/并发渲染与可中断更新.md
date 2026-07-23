---
order: 104
title: 并发渲染与可中断更新
module: react
category: 'dev-lang'
difficulty: advanced
description: 'React并发渲染与可中断更新详解：Concurrent Rendering原理。'
author: fanquanpp
updated: '2026-06-14'
related:
  - react/Next.js应用路由
  - 'react/React-19新增API'
  - react/错误边界与Sentry集成
  - react/自定义Hooks复用逻辑
prerequisites:
  - react/概述与环境配置
---

## 1. 并发渲染原理

### 1.1 同步 vs 并发

**同步渲染**：一旦开始，不可中断，直到完成。

**并发渲染**：可暂停、恢复、放弃渲染工作。

```
同步:  ────渲染───────→ 用户可交互
并发:  ──渲染──╳──高优先级──→──恢复渲染──→ 用户可交互
```

### 1.2 Fiber 架构

Fiber 将渲染工作拆分为小单元（Fiber 节点），每个单元可在 5ms 时间片内完成：

```
Work Loop:
  while (nextUnitOfWork && !shouldYield()) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
  }
```

## 2. 优先级调度

### 2.1 优先级等级

| 优先级 | 场景       | Lane                |
| ------ | ---------- | ------------------- |
| 立即   | 用户输入   | SyncLane            |
| 高     | 受控输入   | InputContinuousLane |
| 默认   | 数据获取   | DefaultLane         |
| 低     | 离屏预渲染 | IdleLane            |

### 2.2 优先级插队

```jsx
// 低优先级更新进行中
startTransition(() => {
  setSearchResults(heavyFilter(query));
});

// 用户输入插队（高优先级）
setInputValue(e.target.value);
```

## 3. startTransition

```jsx
import { useState, startTransition } from 'react';

function Search() {
  const [input, setInput] = useState('');
  const [results, setResults] = useState([]);

  function handleChange(e) {
    // 高优先级：立即更新输入框
    setInput(e.target.value);

    // 低优先级：延迟更新搜索结果
    startTransition(() => {
      setResults(filterItems(e.target.value));
    });
  }
}
```

## 4. useDeferredValue

```jsx
import { useDeferredValue } from 'react';

function Search() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <Results query={deferredQuery} />
    </>
  );
}
```

`useDeferredValue` 返回一个延迟版本的值，当有更高优先级更新时，延迟更新。

## 5. Suspense 与并发

```jsx
<Suspense fallback={<Loading />}>
  <UserProfile /> {/* 异步获取数据 */}
</Suspense>
```

并发模式下，Suspense 不会阻塞整个树，只显示最近的 fallback。
