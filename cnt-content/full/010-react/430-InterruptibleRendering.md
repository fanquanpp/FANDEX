---
order: 430
title: 并发渲染与可中断更新
module: 'react'
category: 前端技术
difficulty: advanced
description: React 并发渲染原理：可中断的 Render 阶段、优先级插队、中断重做语义与 startTransition/useDeferredValue 的底层关系。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'react/120-FiberArchitecture'
  - 'react/130-ConcurrentRendering'
  - 'react/420-React19NewAPI'
  - 'react/470-RenderingPriorityAndScheduling'
prerequisites:
  - 'react/130-ConcurrentRendering'
---

## 1. 一句话理解

并发渲染 = **渲染过程可以被暂停、丢弃、换优先级重做**：React 把一次渲染拆成若干小片，每片之间检查"有没有更紧急的事要做"，有就让路——紧急更新先完成，非紧急的渲染直接作废重来。用户感知到的区别是：长列表切换不再卡住输入框。

## 2. 为什么同步渲染会卡

React 17 及以前的渲染是同步的：`setState` 触发后，React 必须一口气算完整棵树、提交 DOM，中间无法让出主线程。

```text
同步渲染时间线：
用户点击 ──► 渲染(30ms) ──► 提交 ──► 浏览器绘制 ──► 才能响应下一次输入
              ▲
              这 30ms 内键盘/鼠标事件全部排队
```

一帧的预算只有 16.7ms（60Hz），一次大更新直接击穿多帧，表现为输入延迟、掉帧。并发渲染把"必须一口气做完"变成了"可以分片做、做一半可以扔"。

## 3. 可中断性的三个前提

### 3.1 Render 与 Commit 分离

Fiber 架构把渲染分成两个阶段（详见 [Fiber 架构](/react/120-FiberArchitecture)）：

- **Render 阶段（可中断）**：执行组件函数、diff 出变更。纯计算，不碰 DOM，可以随时丢弃。
- **Commit 阶段（不可中断）**：把变更一次性应用到 DOM 并执行生命周期/Effect 注册。同步完成，否则屏幕会出现"半个 UI"。

**只有 Render 阶段可中断**。这也是"Render 阶段必须保持纯函数"这一规则的根源：如果组件函数里写副作用，被中断重做一次，副作用就执行两次。

### 3.2 双缓冲树

current 树（屏幕上显示的）与 workInProgress 树（正在算的）分离。中断时扔掉 workInProgress 树即可，屏幕上的 current 树毫发无损；重做时从最新状态重新开始——所以**中断不会造成状态丢失，只浪费一些 CPU**。

### 3.3 调度器让出主线程

React 内置的 Scheduler 用 `MessageChannel` 宏任务调度工作循环：每个时间片（约 5ms）结束检查 `shouldYield()`，需要让出就保存进度、把控制权还给浏览器（处理输入、绘制），下一个宏任务继续。

```text
WorkLoop（简化）：
while (workInProgress && !shouldYield()) {
  workInProgress = performUnitOfWork(workInProgress); // 处理一个 Fiber 节点
}
if (workInProgress) {
  // 让出：MessageChannel 安排下一片继续；期间浏览器可响应用户输入
  scheduleContinuation(workLoop);
} else {
  commitRoot(); // 完整提交
}
```

## 4. 中断的完整生命周期

一次被"插队"的低优先级渲染，实际经历了：

1. **低优先级渲染开始**：例如 `startTransition` 内的 `setResults`，React 以 TransitionLane 记账并开始渲染
2. **高优先级更新插入**：用户输入触发 `setInput`，以 SyncLane 记账，优先级更高
3. **低优先级渲染作废**：React 发现存在更高优先级任务，丢弃当前 workInProgress 树
4. **高优先级渲染完成**：输入框立即更新、提交、绘制
5. **低优先级重做**：基于**最新的输入值**重新渲染搜索结果（这也是为什么 transition 内的渲染函数可能执行多次）

```tsx
import { useState, useTransition } from 'react';

function SearchPage({ items }: { items: string[] }) {
  const [query, setQuery] = useState('');
  const [list, setList] = useState(items);
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setQuery(value); // 紧急：输入框立刻跟上

    startTransition(() => {
      // 非紧急：可被下一次输入打断、作废、用最新 query 重做
      setList(items.filter((i) => i.includes(value)));
    });
  }

  return (
    <>
      <input value={query} onChange={handleChange} />
      {isPending && <span>结果更新中...</span>}
      <List data={list} />
    </>
  );
}
```

## 5. 优先级模型（Lane）

React 用位图车道表达优先级，从高到低：

| Lane | 触发场景 | 是否可中断 |
| :--- | :--- | :--- |
| SyncLane | `flushSync`、离散输入（点击/键入）的默认更新 | 否 |
| InputContinuousLane | 连续事件（滚动、拖拽）驱动的更新 | 是 |
| DefaultLane | 普通状态更新 | 是 |
| TransitionLane | `useTransition` / `useDeferredValue` / Action | 是 |
| IdleLane | 离屏预渲染等空闲工作 | 是（最容易被让路） |

两个关键语义：

- **高优先级可以打断低优先级**，反之不行——transition 不会打断你的输入
- **重做基于最新状态**：transition 内的渲染被多次打断后，最终结果只取决于最终状态，中间白算的部分不会泄漏到 UI

## 6. 与 Suspense 的配合

中断 + Suspense 构成了"切换不闪 loading"的体验：

```tsx
startTransition(() => {
  setRoute('/detail'); // 新路由组件挂起时，因为处于 transition，
});                    // React 会继续展示旧页面，而不是立刻掉进 fallback
```

规则：**紧急更新**中子树挂起 → 显示最近的 Suspense fallback；**transition 更新**中挂起 → 保留旧 UI 直到新内容就绪（`isPending` 可用于加视觉提示）。React 19 的 Actions 之所以"提交期间不闪加载态"，底层正是这套机制。

## 7. 常见陷阱

### 7.1 Render 阶段产生副作用

```tsx
// 错误：并发渲染可能执行多次，localStorage 会被写两次
function Bad({ value }: { value: number }) {
  localStorage.setItem('last', String(value)); // 副作用进了渲染体
  return <p>{value}</p>;
}

// 正确：副作用只属于 Effect
function Good({ value }: { value: number }) {
  useEffect(() => {
    localStorage.setItem('last', String(value));
  }, [value]);
  return <p>{value}</p>;
}
```

### 7.2 期望 transition"更快"

`useTransition` 不加速计算，只降级优先级。重型计算仍然会占用主线程，需要配合 `useMemo`、React Compiler 或算法优化；transition 的价值是"不阻塞紧急交互"。

### 7.3 把紧急更新包进 transition

路由跳转、表单提交后的关键反馈等"用户正在等结果"的更新不该包 transition——它会主动延后展示。原则：**只有"用户允许等一等"的内容才进 transition**。

### 7.4 在 transition 里读取渲染后状态

`startTransition` 的回调应只做状态更新（React 19 起允许 async，因为异步 Action 有专门语义）；在回调里同步读取 DOM 或打印"更新后"的值是拿不到新值的。

## 8. 调试与观测

- **React DevTools Profiler**：查看每次提交的耗时与组件渲染原因（props/state/hooks 变化）
- **Performance 面板 + React Tracks（19.2）**：React 19.2 起在 Chrome DevTools 中提供专属性能轨道，可视化调度、渲染与 Effect 时序
- **isPending 与 `query !== deferredQuery`**：给用户提供"更新中"的视觉信号，是调试过渡语义最直接的窗口

## 9. 小结

- 可中断性 = Render/Commit 分离 + 双缓冲 + 调度器时间片，三者缺一不可
- 中断的是"渲染过程"，不是"状态"：低优先级渲染作废后基于最新状态重做
- Lane 模型决定谁能插队；transition/deferred 是把更新降级到可中断车道的公开 API
- Render 阶段必须纯净——这是并发语义对组件函数的硬性要求，不是风格建议
