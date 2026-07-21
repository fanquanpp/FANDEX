---
order: 54
title: Hooks原理
module: react
category: React
difficulty: advanced
description: 'React Hooks底层实现原理'
author: fanquanpp
updated: '2026-06-14'
related:
  - react/Concurrent模式
  - react/服务端组件
  - react/自定义Hooks设计模式
  - react/状态管理方案对比
prerequisites:
  - react/概述与环境配置
---

## 概述

React Hooks 的底层实现基于 Fiber 架构。每个函数组件对应的 Fiber 节点上挂载了一个 Hooks 链表，Hooks 按调用顺序以链表形式串联。理解 Hooks 的底层原理有助于避免常见的使用错误（如条件调用 Hooks），也能帮助开发者编写更高效的自定义 Hooks。

## 基础概念

### Hooks 链表结构

Hooks 在 Fiber 上以链表形式存储，每个 Hook 节点包含当前状态和更新队列：

```
Fiber.memoizedState → Hook1 → Hook2 → Hook3 → null

每个 Hook 节点：
{
  memoizedState,  // 当前状态值
  baseState,      // 初始状态
  queue,          // 更新队列
  next,           // 指向下一个 Hook
}
```

### 为什么 Hooks 有使用规则

- **只在顶层调用**：Hooks 按链表顺序匹配，条件调用会破坏顺序，导致状态错乱
- **只在函数组件中调用**：Hooks 依赖 Fiber 上下文，普通函数中没有 Fiber

## 快速上手

### useState 的实现原理

```javascript
// 简化的 useState 实现
function useState(initialState) {
  // 获取或创建 Hook 节点
  const hook = mountWorkInProgressHook();

  // 初始化状态
  hook.memoizedState = initialState;

  // 创建更新队列
  hook.queue = {
    pending: null, // 待处理的更新
    dispatch: null, // dispatch 函数
    lastRenderedState: initialState, // 上次渲染的状态
  };

  // 创建 dispatch 函数
  const dispatch = dispatchSetState.bind(null, currentlyRenderingFiber, hook.queue);
  hook.queue.dispatch = dispatch;

  return [hook.memoizedState, dispatch];
}
```

### dispatch 的实现

```javascript
// dispatch 函数：将更新加入队列并调度渲染
function dispatchSetState(fiber, queue, action) {
  // 创建更新对象
  const update = {
    action, // 新值或更新函数
    lane: requestUpdateLane(), // 优先级
    next: null, // 指向下一个更新（环形链表）
  };

  // 将更新加入队列（环形链表）
  const pending = queue.pending;
  if (pending === null) {
    update.next = update; // 指向自己
  } else {
    update.next = pending.next;
    pending.next = update;
  }
  queue.pending = update;

  // 调度渲染
  scheduleUpdateOnFiber(fiber, lane);
}
```

## 详细用法

### useEffect 的实现原理

```javascript
// 简化的 useEffect 实现
function useEffect(create, deps) {
  const hook = mountWorkInProgressHook();

  // 存储副作用信息
  hook.memoizedState = {
    create, // 副作用函数
    deps, // 依赖数组
    destroy: undefined, // 清理函数
  };

  // 标记 Fiber 有 Passive 副作用
  currentlyRenderingFiber.flags |= PassiveEffect;
}

// 更新时的 useEffect
function updateEffect(create, deps) {
  const hook = updateWorkInProgressHook();

  // 比较依赖是否变化
  const prevDeps = hook.memoizedState.deps;
  if (areHookInputsEqual(deps, prevDeps)) {
    // 依赖未变化，跳过
    return;
  }

  // 依赖变化，更新副作用
  hook.memoizedState = { create, deps, destroy: undefined };
  currentlyRenderingFiber.flags |= PassiveEffect;
}
```

### useRef 的实现原理

```javascript
// useRef 本质上是一个始终返回同一对象的 Hook
function useRef(initialValue) {
  const hook = mountWorkInProgressHook();

  // 创建一个可变对象，跨渲染保持引用
  hook.memoizedState = { current: initialValue };
  return hook.memoizedState;
}

// 更新时直接返回同一对象
function updateRef(initialValue) {
  const hook = updateWorkInProgressHook();
  return hook.memoizedState;
}

// 这就是为什么修改 ref.current 不会触发重渲染
// React 不追踪 ref 的变化，只保持引用不变
```

### useMemo 和 useCallback 的实现

```javascript
// useMemo：缓存计算结果
function useMemo(nextCreate, deps) {
  const hook = mountWorkInProgressHook();
  const nextValue = nextCreate();
  hook.memoizedState = [nextValue, deps];
  return nextValue;
}

function updateMemo(nextCreate, deps) {
  const hook = updateWorkInProgressHook();
  const [prevValue, prevDeps] = hook.memoizedState;

  if (areHookInputsEqual(deps, prevDeps)) {
    return prevValue; // 依赖未变，返回缓存值
  }

  const nextValue = nextCreate();
  hook.memoizedState = [nextValue, deps];
  return nextValue;
}

// useCallback 本质上是 useMemo 的特例
function useCallback(callback, deps) {
  return useMemo(() => callback, deps);
}
```

## 常见场景

### 理解闭包陷阱

```jsx
// 闭包陷阱：事件处理器中捕获了旧的状态值
function Counter() {
  const [count, setCount] = useState(0);

  function handleClick() {
    // 这里的 count 是渲染时的快照，不是最新值
    setTimeout(() => {
      console.log(count); // 可能是旧值
    }, 1000);
  }

  // 解决方案一：使用函数式更新
  function handleClickFixed() {
    setTimeout(() => {
      setCount((prev) => prev + 1); // 基于最新状态更新
    }, 1000);
  }

  // 解决方案二：使用 ref 保持最新值
  const countRef = useRef(count);
  countRef.current = count;

  function handleClickWithRef() {
    setTimeout(() => {
      console.log(countRef.current); // 始终是最新值
    }, 1000);
  }
}
```

### 理解批量更新

```jsx
// React 18 自动批量更新：所有状态更新合并为一次渲染
function handleClick() {
  setCount((c) => c + 1); // 不会立即渲染
  setFlag((f) => !f); // 不会立即渲染
  setName('张三'); // 不会立即渲染
  // 三次更新合并为一次渲染
}

// 在 React 17 中，只有 React 事件处理器内才会批量更新
// setTimeout 中的更新不会批量处理
// React 18 中所有场景都自动批量更新
```

## 注意事项

- Hooks 的调用顺序必须稳定，不能在条件语句、循环或嵌套函数中调用
- useEffect 的清理函数在下次 effect 执行前或组件卸载时调用
- useState 的函数式更新可以避免闭包陷阱，应优先使用
- useRef 修改 current 不会触发重渲染，适合存储不参与渲染的可变值
- useMemo 和 useCallback 应在性能分析后使用，不要过度优化
- React 18 中所有更新都自动批量处理，不再需要 unstable_batchedUpdates

## 进阶用法

### 自定义 Hook 的底层原理

```jsx
// 自定义 Hook 只是复用 Hooks 逻辑的函数
// 调用自定义 Hook 时，其中的 Hooks 会被添加到当前 Fiber 的链表中
function useWindowSize() {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    function handleResize() {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}

// 使用时，useState 和 useEffect 被添加到调用组件的 Fiber 链表中
function App() {
  const size = useWindowSize(); // Hooks 被合并到 App 的链表
  return (
    <div>
      {size.width} x {size.height}
    </div>
  );
}
```

### useSyncExternalStore 的实现

```jsx
import { useSyncExternalStore } from 'react';

// 用于订阅外部数据源，确保并发模式下的数据一致性
function useOnlineStatus() {
  return useSyncExternalStore(
    // subscribe：订阅函数
    (callback) => {
      window.addEventListener('online', callback);
      window.addEventListener('offline', callback);
      return () => {
        window.removeEventListener('online', callback);
        window.removeEventListener('offline', callback);
      };
    },
    // getSnapshot：获取当前值
    () => navigator.onLine,
    // getServerSnapshot：服务端渲染时的值
    () => true
  );
}
```
