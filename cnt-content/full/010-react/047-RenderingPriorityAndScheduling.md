---
order: 470
title: React 渲染优先级与调度
module: 'react'
category: 前端技术
difficulty: advanced
description: '从 update 优先级、调度器到并发渲染，讲清 React 如何决定"先渲染谁、能不能中断、中断后怎么办"。'
author: fanquanpp
updated: '2026-08-30'
related:
  - 'react/013-ConcurrentMode'
  - 'react/012-FiberArchitecture'
prerequisites:
  - 'react/012-FiberArchitecture'
---


## 一句话理解

React 的渲染不是"一次做到底"，而是"按优先级排队、可中断、可重来"：
紧急更新（输入、点击）插队先跑，非紧急更新（大列表切换）被打断后稍后重做。

## 为什么需要

- 一个大型列表更新可能占用主线程几十毫秒，期间输入卡顿。
- 用户感知的"卡"来自低优先级工作抢占高优先级交互。
- 有了优先级调度，React 可以在每帧之间让出主线程，保证交互响应。

## 三个关键概念

**1. 更新优先级（Update Priority）**

每次 setState 都带着优先级：离散事件（点击/输入）最高，连续事件（滚动）次之，
`useTransition` 标记的更新最低，空闲时执行。

**2. 调度器（Scheduler）**

负责把渲染工作切成可让出的小片（time slice），
用 `MessageChannel` 在浏览器空闲时继续工作，每片结束检查是否有更高优先级任务。

**3. 中断与重做（Abort & Restart）**

低优先级渲染进行到一半，如果来了高优先级更新，低优先级工作直接丢弃，
高优先级先渲染，随后低优先级重新开始。这就是"可中断渲染"。

## 用法示例

```tsx
import { useState, useTransition } from 'react';

function SearchPage({ items }: { items: string[] }) {
  const [query, setQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  // 输入更新：紧急，立即渲染
  const handleChange = (value: string) => setQuery(value);

  // 过滤结果：非紧急，可中断
  const filtered = useMemo(() => {
    let result = items;
    if (query) {
      result = items.filter((item) => item.includes(query));
    }
    return result;
  }, [items, query]);

  return (
    <div>
      <input value={query} onChange={(e) => handleChange(e.target.value)} />
      {isPending ? <p>更新中…</p> : null}
      <ul>{filtered.map((item) => <li key={item}>{item}</li>)}</ul>
    </div>
  );
}
```

注意：`useTransition` 里的 `startTransition` 应包住**重型计算或异步后的状态更新**，
输入框自身的值更新保持紧急，这样打字永远跟手。

## 与并发渲染的关系

| 概念 | 回答的问题 |
| --- | --- |
| Fiber | 渲染工作的数据结构，可暂停/恢复 |
| 优先级 | 谁先执行 |
| 调度器 | 什么时候执行、执行多久 |
| 并发渲染 | 渲染过程可以被更高优先级工作打断并重做 |

## 常见误区

| 误区 | 真相 |
| --- | --- |
| useTransition 能自动加速代码 | 它只改变优先级，重型计算仍要配合 memo/拆分 |
| 并发模式是并行执行 | 是"可中断 + 交错"，不是多线程并行 |
| 所有 setState 都该包 startTransition | 紧急交互必须保持高优先级，滥用反而延迟反馈 |
| 渲染中断了状态会丢 | 中断的是本次渲染，最终会以最新状态重做，不会丢 |

## 小结

调度系统的存在意义是"保证交互不被长任务饿死"。
理解优先级与中断后，`useTransition` 不再神秘：它只是把"不着急"的更新放进低优先级队列。
继续深入可看 并发模式 与
Fiber 架构。
