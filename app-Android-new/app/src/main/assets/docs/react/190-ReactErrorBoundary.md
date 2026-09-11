---
order: 190
title: React 错误边界
module: 'react'
category: 前端技术
difficulty: intermediate
description: 错误边界（ErrorBoundary）完整指南：getDerivedStateFromError 与 componentDidCatch 的捕获范围、React 19 错误处理变化、react-error-boundary 生产用法与常见陷阱。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'react/170-StateManagementSolutionComparison'
  - 'react/180-ReactPerformance'
  - 'react/200-ReactForm'
  - 'react/210-ReactTypeScript'
prerequisites:
  - 'react/010-OverviewEnvSetup'
---

## 1. 一句话理解

错误边界（Error Boundary）是 React 的"局部保险丝"：一个包住子组件树的类组件，当子树在**渲染期间**抛出错误时，捕获它并渲染一段降级 UI，而不是让整棵 React 树卸载白屏。类比楼宇的空气开关：某条线路短路只跳掉那条支路的闸，全楼不断电。与 Sentry 等监控平台的分工见[错误边界与 Sentry 集成](/react/440-ErrorBoundarySentry)，本文聚焦机制本身。

## 2. 为什么需要它：没有边界时会发生什么

React 的默认策略是"宁可全部卸载，也不渲染一棵状态损坏的树"。自 React 16 起，任何一个子组件在渲染中抛错且没有被任何边界捕获，React 会**卸载整棵组件树**——用户看到白屏，而控制台里可能只有一行不起眼的报错。这意味着一个小图表组件的数据格式错误，可以拖垮整个电商结账页。

两个关键认知：

- 错误边界只拦截"React 渲染管线"里的错误。渲染函数、生命周期方法、子组件构造函数中抛出的错误会沿组件树向上传播，被最近的边界接住。
- 事件处理器、`setTimeout`/Promise 回调、服务端渲染（`renderToString` 直接抛异常）都**不在**渲染管线内，边界管不到，需要传统的 `try/catch`。

## 3. 核心机制：两个生命周期方法

错误边界必须是一个类组件，且同时（或之一）实现两个方法：

```tsx
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;       // 被保护的子树
  fallback: ReactNode;       // 降级 UI
}
interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  // 阶段一（渲染阶段）：把错误转成 state，让本轮渲染直接输出降级 UI
  // 必须是纯函数：不能在里面做上报、跳转等副作用
  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  // 阶段二（提交阶段）：错误已被捕获后调用，适合做副作用——上报日志
  componentDidCatch(error: Error, info: ErrorInfo) {
    // info.componentStack 是"组件栈"（React 19 起为字符串，直接可上报）
    reportToMonitor(error, { componentStack: info.componentStack });
  }

  render() {
    if (this.state.hasError) return this.props.fallback; // 命中保险丝
    return this.props.children;
  }
}
```

分工记忆法：`getDerivedStateFromError` 负责"界面怎么办"，`componentDidCatch` 负责"记录与上报"。两者都会被调用（都实现时），只是时机不同：前者在渲染阶段（因此必须纯），后者在提交阶段（可以做副作用）。React 官方明确表示**暂时没有对应的 Hook**——这是类组件在 2026 年仍然不可替代的唯一场景。

## 4. 完整示例：让"会崩的图表"只崩自己

```tsx
import { useState } from 'react';

// 一个会在渲染期间抛错的子组件：数据格式不对就崩
function BuggyChart({ data }: { data: unknown }) {
  // 渲染期间访问了不存在的字段——这是"渲染期错误"
  const points = (data as { list: number[] }).list.map((v, i) => v * i);
  return <div>图表数据点数：{points.length}</div>;
}

function Dashboard() {
  const [bad, setBad] = useState(false);
  return (
    <div>
      <button onClick={() => setBad(true)}>加载坏数据</button>
      <ErrorBoundary fallback={<div role="alert">图表暂时不可用，请稍后重试</div>}>
        {bad ? <BuggyChart data={{}} /> : <BuggyChart data={{ list: [3, 1, 2] }} />}
      </ErrorBoundary>
      {/* 注意：这一行在图表崩溃后依然正常渲染——错误被隔离在边界内 */}
      <p>页面其他区域不受影响</p>
    </div>
  );
}
```

预期渲染行为：初始显示"图表数据点数：3"；点击"加载坏数据"后，只有图表区域变成"图表暂时不可用"，按钮与下方文字保持原样，控制台出现捕获记录。若去掉边界，整页白屏。

## 5. 边界管不到的错误与各自对策

| 错误来源 | 是否被边界捕获 | 对策 |
| :--- | :--- | :--- |
| 子组件渲染函数抛错 | 是 | 错误边界的本职 |
| 子组件生命周期/构造函数抛错 | 是 | 同上 |
| 事件处理器（onClick 等） | 否 | 回调内 `try/catch` 或把错误转入 state 再渲染 |
| `setTimeout` / Promise / async 回调 | 否 | 同上，或全局兜底 |
| 服务端渲染（renderToString） | 否 | 服务端自行 try/catch |
| 边界组件自身抛错 | 否（直接上抛） | 边界保持极简，不要放业务逻辑 |

事件处理器错误的正确姿势：

```tsx
function SaveButton() {
  const [error, setError] = useState<Error | null>(null);
  if (error) return <div role="alert">保存失败：{error.message}</div>;

  return (
    <button
      onClick={async () => {
        try {
          await saveApi(); // 异步错误同样不会被边界捕获
        } catch (e) {
          setError(e as Error); // 转成 state，走正常渲染路径展示
        }
      }}
    >
      保存
    </button>
  );
}
```

React 19 给了全局兜底的新开关：`createRoot` / `hydrateRoot` 支持 `onCaughtError`（被边界捕获的错误，默认 `console.error`）与 `onUncaughtError`（未被捕获的渲染错误，默认记录到 console 且**不再向 window 二次抛出**）。可以在这里统一接监控：

```tsx
createRoot(document.getElementById('root')!, {
  onCaughtError: (error, info) => reportToMonitor(error, info), // 已被边界处理，只上报
  onUncaughtError: (error, info) => reportToMonitor(error, info), // 兜底，需告警
}).render(<App />);
```

## 6. 生产方案：react-error-boundary

手写类组件适合理解原理，业务里更推荐社区标准库 `react-error-boundary`（API 就是官方模式的封装），它补上了手写版缺的两件事——**可重试**与**依赖变化自动重置**：

```tsx
import { ErrorBoundary, useErrorBoundary } from 'react-error-boundary';

// 局部降级 + 重置：resetKeys 变化（如切换商品）时自动清掉错误态重新渲染子树
function ProductPanel({ productId }: { productId: string }) {
  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <div role="alert">
          加载失败：{error.message}
          {/* 重试 = 清除错误态 + 重新渲染子树 */}
          <button onClick={resetErrorBoundary}>重试</button>
        </div>
      )}
      onReset={(details) => refetch(details.resetKeys)} // 可选：重置时顺带重新拉数据
      resetKeys={[productId]} // 依赖变化自动从错误态恢复
    >
      <ProductDetail id={productId} />
    </ErrorBoundary>
  );
}

// 深层组件主动"报告"错误给最近的边界：事件处理器的异步错误也能交给边界统一展示
function LikeButton() {
  const { showBoundary } = useErrorBoundary();
  return (
    <button
      onClick={async () => {
        try {
          await likeApi();
        } catch (e) {
          showBoundary(e as Error); // 边界接管，渲染降级 UI 并上报
        }
      }}
    >
      点赞
    </button>
  );
}
```

分层策略建议：路由级放一个粗粒度边界（整页降级 + 返回首页），功能区块各放细粒度边界（局部降级），关键交互用 `showBoundary` 把异步错误也汇入统一降级通道。

## 7. 常见陷阱

- **误以为边界能捕获一切**：事件处理器、异步回调、服务端渲染都不在内；见第 5 节对策表。
- **边界与 Suspense 的嵌套顺序**：希望"加载中显示骨架、失败显示错误"时，边界应在 `Suspense` **外层**——数据加载的 Promise 拒绝会先经 Suspense 流程转为渲染错误，再被边界捕获。
- **componentDidCatch 里引发循环**：上报时顺手把错误写进会触发本子树重渲染的 store，可能再次抛错形成循环；上报只做网络请求或入队，不碰会波及自身的状态。
- **fallback 里访问出错数据**：降级 UI 一旦再次抛错会继续向上传播到更外层边界；最外层没有边界就白屏——顶层永远兜底一个全局边界。
- **依赖旧的重试行为**：React 18 对渲染期抛错有一次静默重试，React 19 已移除该行为，错误只走一次报告流程；不要依赖"抛两次"来观察错误。
- **水合不匹配的误解**：React 19 起 hydration mismatch 降级为一条 `console.error` 并触发客户端重渲，**不会**被错误边界捕获，排查要看控制台而不是边界日志。
- **老教程的实验 API**：从未进入稳定版的 `SuspenseList` 等实验性 API 不要引入生产代码；边界与 Suspense 的组合只依赖 `getDerivedStateFromError` + Suspense 这条稳定路径。

## 8. 小结

初学者要点：

- 错误边界 = 包住子树的类组件，靠 `getDerivedStateFromError`（渲染降级 UI）+ `componentDidCatch`（上报日志）工作，目前没有 Hook 等价物。
- 它只救"渲染期间"的错误：事件处理器和异步代码请 `try/catch` 后转入 state 或交给 `showBoundary`。
- 没有边界时单个组件的渲染错误会白屏整页；给路由和关键区块各配一层边界。

进阶注意：

- React 19 变化：`onUncaughtError` / `onCaughtError` 根选项接管错误报告、不再二次抛出、移除渲染错误的自动重试、水合不匹配不再抛异常。
- 生产用 `react-error-boundary`：`fallbackRender` + `resetKeys` + `useErrorBoundary().showBoundary` 覆盖"局部降级、自动重置、异步错误上抛"三类需求。
- 与监控平台的集成点是 `componentDidCatch` / `onCaughtError`，组件栈（`info.componentStack`）是定位崩溃组件的关键字段。

## 速查

**手写错误边界（最小模板）**

```tsx
class ErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true }; // 渲染期：转 state
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    reportToMonitor(error, info); // 提交期：上报
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
```

**捕获范围速记**

- 捕获：子树渲染函数、生命周期方法、构造函数中的错误
- 不捕获：事件处理器回调、`setTimeout`/Promise/async、服务端渲染、边界自身、React 19 的水合不匹配（已降级为 console.error）

**react-error-boundary 常用 API**

```tsx
<ErrorBoundary fallback={<Err />} onReset={fn} resetKeys={[dep]} onError={report}>
  <Risky />
</ErrorBoundary>
// 函数式降级 + 重试
<ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => (
  <button onClick={resetErrorBoundary}>重试（{error.message}）</button>
)}>
  <Risky />
</ErrorBoundary>
// 深层异步错误上抛给边界
const { showBoundary } = useErrorBoundary();
try { await api(); } catch (e) { showBoundary(e); }
```

**React 19 根选项**

```tsx
createRoot(el, {
  onCaughtError: (error, errorInfo) => {},   // 被边界捕获的错误
  onUncaughtError: (error, errorInfo) => {}, // 未捕获的渲染错误
}).render(<App />);
```
