---
order: 540
title: React 渲染优先级与调度
module: 'react'
category: 前端技术
difficulty: advanced
description: React 如何决定"先渲染谁、能不能中断、中断后怎么办"：Lane 优先级、Scheduler 时间片与 startTransition/useDeferredValue 的分工。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'react/120-FiberArchitecture'
  - 'react/130-ConcurrentRendering'
  - 'react/430-InterruptibleRendering'
prerequisites:
  - 'react/120-FiberArchitecture'
---

## 1. 一句话理解

React 的渲染不是"一次做到底"，而是"**按优先级排队、可中断、可重做**"：紧急更新（输入、点击）插队先跑，非紧急更新（大列表过滤）被打断后基于最新状态稍后重做。理解这套规则后，`useTransition` 和 `useDeferredValue` 不再是魔法，只是"把更新放进低优先级队列"的两种入口。

## 2. 为什么需要优先级

一帧只有 16.7ms 预算。一次大列表更新可能占用主线程几十毫秒，期间键盘、鼠标事件全部排队——用户感知到的"卡"，本质是**低优先级工作抢占了高优先级交互**。调度系统的存在意义就是保证交互不被长任务饿死：

- 每个 `setState` 都携带优先级信息（从触发它的事件类型推断，或由 API 显式指定）
- 渲染工作被切成小片，片与片之间检查"有没有更高优先级的事"
- 有 → 当前工作作废，高优先级先做；没有 → 继续做、做完提交

## 3. Lane：更新的优先级账本

React 内部用位图（Lane 模型）给每次更新记账，从高到低：

| Lane | 场景 | 说明 |
| :--- | :--- | :--- |
| SyncLane | `flushSync`、离散输入（点击/键入）默认更新 | 最高，同步渲染不可中断 |
| InputContinuousLane | 连续事件（滚动、拖拽、hover）驱动的更新 | 略低于离散输入 |
| DefaultLane | 普通状态更新（setTimeout、请求回调中的 setState） | 常规并发优先级 |
| TransitionLane | `useTransition` / `useDeferredValue` / Action | 可被以上所有车道打断 |
| IdleLane | 离屏预渲染等空闲工作 | 最容易被让路 |

规则的直观形式：**紧急更新永远先于 transition 完成；同一时间片内同时存在多车道更新时，React 只按最高优先级车道渲染一次**（这正是"自动批处理"在并发模型下的表达）。

## 4. Scheduler：什么时候做、做多久

优先级决定"谁先"，调度器决定"什么时候、做多久"：

- Scheduler 内部维护**按到期时间排序的任务队列**：SyncLane 立即同步执行；其余车道映射为不同超时时间（transition 约 5 秒不饿死即可）的常规任务
- 每个任务运行一个时间片（约 5ms），结束后通过 `shouldYield()` 检查是否让出
- 让出与继续都基于 **`MessageChannel` 宏任务**——它比 `setTimeout` 更快进入下一次调度，又真实地让浏览器有机会处理输入与绘制
- 更高优先级任务随时可以从队列"插队"，正在进行的低优先级渲染被丢弃（见[并发渲染与可中断更新](/react/430-InterruptibleRendering)）

## 5. API 到优先级的映射

| 你写的代码 | 实际优先级 | 典型用途 |
| :--- | :--- | :--- |
| `<input>` 的 onChange 里 `setInput(v)` | SyncLane | 受控输入必须跟手 |
| `flushSync(() => setX())` | 强制 SyncLane | 需要 DOM 立即更新（如测量、拖拽锚点） |
| setTimeout/Promise 里的 `setX()` | DefaultLane | 普通数据回填 |
| `startTransition(() => setX())` | TransitionLane | 大列表、路由内容切换 |
| `useDeferredValue(value)` | 内部以 TransitionLane 重渲染 | 组件内部消化延迟，不改调用方代码 |
| Action（async transition） | TransitionLane | 表单提交等异步更新 |

`useTransition` 与 `useDeferredValue` 的分工：

- **useTransition**：调用方**知道**哪个更新不紧急，主动声明——`startTransition(() => setList(next))`
- **useDeferredValue**：调用方只想给"某个值"一个延迟版本，常用于把第三方组件或大组件的 props 更新降级——`const deferredQuery = useDeferredValue(query)`

两者产生的都是可中断的过渡渲染，多数场景二选一即可。

## 6. 完整示例：搜索页的正确分工

```tsx
import { useMemo, useState, useTransition } from 'react';

function SearchPage({ items }: { items: string[] }) {
  // query：紧急车道，输入框永远跟手
  const [query, setQuery] = useState('');
  // filtered：过渡车道，可被下一次输入打断并重做
  const [filtered, setFiltered] = useState(items);
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string) {
    setQuery(value); // 紧急：立即渲染输入框
    startTransition(() => {
      setFiltered(heavyFilter(items, value)); // 非紧急：可中断、可重做
    });
  }

  return (
    <div>
      <input value={query} onChange={(e) => handleChange(e.target.value)} />
      {isPending ? <p>更新中…</p> : null}
      <ul>
        {filtered.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
```

两个容易写反的地方：

1. `startTransition` 应包住**重型计算的结果更新**（本例的 `setFiltered`），输入框自身的更新保持紧急——包反了打字就会延迟
2. `isPending` 用于视觉提示（透明度、角标），不要用它卸载旧内容——transition 的意义就是"保留旧 UI 直到新内容就绪"

## 7. flushSync：主动选择紧急

需要"这次更新必须立刻上屏"的场景（拖拽中测量 DOM、第三方组件强依赖同步 DOM）可以反向操作——把默认批处理/过渡的更新强制提升为同步：

```tsx
import { flushSync } from 'react-dom';

function handleDrop(e: React.DragEvent) {
  flushSync(() => setDropTarget(null)); // 立即提交，DOM 可测
  const rect = dropRef.current?.getBoundingClientRect(); // 拿到的是最新布局
}
```

代价是击穿批处理并放弃可中断性，一帧内多次 `flushSync` 会造成多次完整渲染——仅作为局部逃生舱，不要成片使用。

## 8. 与 React Compiler 的关系

调度与记忆化是性能的两条正交轴：

- **调度（本文）** 决定"这次渲染什么时候跑、能不能被打断"
- **记忆化（React Compiler，见[编译器自动记忆化](/react/390-ReactCompilerAutoMemoization)）** 决定"这次渲染要算多少东西"

两者组合才是完整答案：transition 让大更新不阻塞输入，Compiler 自动缓存让每次渲染的计算量趋近最小。历史上手动 `useMemo` + `useTransition` 组合的样板代码，在 Compiler 时代只剩后者需要手写。

## 9. 常见误区

| 误区 | 真相 |
| :--- | :--- |
| useTransition 能自动加速代码 | 它只降优先级；重型计算仍需 memo/算法/Compiler 配合 |
| 并发渲染 = 并行执行 | 是"可中断 + 交错"，始终只有一个主线程 |
| 所有 setState 都该包 startTransition | 紧急交互必须保持 SyncLane，滥用反而延迟关键反馈 |
| 渲染中断了状态会丢 | 中断的是本次渲染；重做基于最新状态，结果不丢 |
| transition 里能同步读到新状态 | 回调只应做状态更新；要读新值请用 Effect 或渲染期读取 |

## 10. 动手练习

预测题（5 分钟）：连续输入时列表渲染几次。

**任务**：以较快速度连续键入 `ab` 两个字符，每次键入都触发第 6 节示例
的 `handleChange`（先 `setQuery` 紧急更新，再 `startTransition` 里
`setFiltered`）。问题：`heavyFilter` 里的列表组件最多渲染几次？屏幕
最终显示的过滤结果一定对应哪个输入值？

**提示**：每次 `startTransition` 都申请一个 TransitionLane 渲染任务；
上一次还没跑完时，下一次紧急输入会怎么处理它（见第 4 节）。

**参考答案**：列表组件最多渲染 2 次（每次键入启动一次过渡渲染；若第
二次输入打断了第一次的渲染，作废的那次不算完成，重做的那次基于
`ab`）。最终屏幕显示的一定是 `ab` 的过滤结果——插队丢掉的是「渲染
过程」，不是「结果正确性」。

修改题（15 分钟）：改写成 useDeferredValue 版本。

**任务**：把第 6 节的搜索页改成 `useDeferredValue` 写法，要求：不改
`onChange` 里的任何逻辑，重型过滤的降级由组件内部消化；并回答两个
写法的分工差异（对照第 5 节）。

**提示**：`useDeferredValue` 接的是「值」——先给 `query` 一个延迟
版本，再把延迟版本交给记忆化的过滤。

**参考答案**：

```tsx
import { useDeferredValue, useMemo, useState } from 'react';

function SearchPage({ items }: { items: string[] }) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query); // 过渡车道上的旧值
  const filtered = useMemo(
    () => heavyFilter(items, deferredQuery),
    [items, deferredQuery],
  );

  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      {query !== deferredQuery ? <p>更新中…</p> : null}
      <ul>{filtered.map((i) => <li key={i}>{i}</li>)}</ul>
    </div>
  );
}
```

分工：`useTransition` 是「调用方知道这次更新可以等」，把**更新动作**
包起来；`useDeferredValue` 是「只想给某个值一个延迟版本」，把**值**
降级，适合第三方组件或不便改回调的场景。`query !== deferredQuery`
充当 `isPending` 的等价物。

修 Bug 题（15 分钟）：拖拽锚点为什么量出旧坐标。

**任务**：一个看板组件，拖拽结束时需要立刻读取目标卡片的
`getBoundingClientRect` 做落点动画。症状：测量值偶尔是**上一次**布局
的坐标，动画跳位。代码如下，定位并修复：

```tsx
function Board() {
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  function handleDrop() {
    setDropTarget(null); // 隐藏占位提示
    const rect = dropRef.current?.getBoundingClientRect();
    playLandingAnimation(rect);
  }
  // ...
}
```

**提示**：`setDropTarget` 触发的更新默认走哪条车道？状态更新后
`dropRef` 指向的 DOM 是立刻变，还是等 React 提交后才变？第 7 节有
现成的逃生舱。

**参考答案**：`setDropTarget` 的更新进入普通批处理，`handleDrop`
同步执行的此刻 DOM 还没提交，量到的是旧布局。修复：

```tsx
import { flushSync } from 'react-dom';

function handleDrop() {
  flushSync(() => setDropTarget(null)); // 强制同步提交，DOM 立即可测
  const rect = dropRef.current?.getBoundingClientRect();
  playLandingAnimation(rect);
}
```

要点：`flushSync` 是局部逃生舱——击穿批处理、放弃可中断性，只用在
"读最新 DOM"这类无法延后的场景；同一次回调里出现两个以上 `flushSync`
就是设计要改的信号（把测量挪进 `useLayoutEffect` 通常更干净）。

挑战题（20 分钟）：给「谁在拖慢输入」做一次体检。

**任务**：为第 6 节示例写一个最小性能验证：构造 2 万条数据，分别测量
「不加 transition」与「加 transition」两版从按键到输入框上屏的延迟，
各记录 10 次，报告最大值与中位数。

**提示（步骤）**：`onChange` 首行 `performance.mark('key-' + i)`，
`useLayoutEffect` 里 `performance.measure` 量到上屏；两版各跑 10 次取
中位数。展开（观察点）：不加 transition 的版本，输入延迟会被上一轮
`heavyFilter` 的长任务拉高；加 transition 后输入走 SyncLane 插队，
延迟应显著下降，而列表完成的总时间略升——这正是用总耗时换交互
跟手。

**参考做法**（量测骨架，两版共用）：

```tsx
function handleChange(value: string) {
  performance.mark(`key:${value}`);
  setQuery(value);
  startTransition(() => setFiltered(heavyFilter(items, value)));
}

useLayoutEffect(() => {
  if (query) {
    performance.measure('input-latency', `key:${query}`);
  }
}, [query]);
```

读取方式：DevTools Performance 面板的 User Timing 轨道，或
`performance.getEntriesByName('input-latency')`。合格结论要包含一句
归因：延迟下降的原因是紧急更新不再排队于过渡渲染之后，而不是
`heavyFilter` 变快了——它的耗时一毫秒都没少。

## 11. 小结

- 优先级（Lane）决定谁先跑，调度器（Scheduler + MessageChannel 时间片）决定何时跑、跑多久
- 离散输入 > 连续输入 > 普通更新 > transition > idle，是插队顺序的记忆口诀
- `useTransition` 显式声明"这个更新可以等"，`useDeferredValue` 给"值"降级；两者都让渲染变得可中断
- 紧急的保持紧急、可等的放进 transition——这条分工原则是并发时代性能优化的第一决策

## 自我检查

- 能默写五条 Lane 的插队顺序（离散输入 > 连续输入 > 普通更新 >
  transition > idle），并说出每条对应的典型触发场景；
- 能解释「同一时间片内多车道更新只按最高优先级渲染一次」与自动批处理
  的关系；
- 拿到一个卡输入的页面，能按「先分清紧急/可等 -> 再选 useTransition
  或 useDeferredValue -> 最后才考虑 flushSync」的顺序给出改法；
- 能说出 transition 与记忆化是两条正交轴，以及 React Compiler 接管
  的是哪一条；
- 能现场口算「连续快速输入时过渡渲染被打断重做」的最终结果，并解释
  为什么中间结果不会泄漏到 UI。
