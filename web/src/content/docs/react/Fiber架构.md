---
order: 51
title: Fiber架构
module: react
category: React
difficulty: advanced
description: 'React Fiber协调引擎'
author: fanquanpp
updated: '2026-06-14'
related:
  - react/Next.js全栈开发
  - react/JSX深度解析
  - react/Concurrent模式
  - react/服务端组件
prerequisites:
  - react/概述与环境配置
---

## 概述

Fiber 是 React 16 引入的全新协调引擎，替代了原有的 Stack Reconciler。Fiber 的核心目标是实现可中断的异步渲染：将渲染工作拆分为小的工作单元（Fiber 节点），在每次处理完一个单元后检查是否需要让出主线程，从而避免长时间阻塞用户交互。Fiber 架构是 React 并发模式、Suspense 和服务端流式渲染的基础。

## 基础概念

### Fiber 节点结构

每个 React 元素对应一个 Fiber 节点，Fiber 节点通过链表结构组织：

```
Fiber 节点结构：
{
  type,        // 组件类型（函数/类/标签名）
  key,         // 列表中的唯一标识
  props,       // 属性对象
  stateNode,   // 关联的实例或 DOM 节点
  return,      // 父 Fiber 节点
  child,       // 第一个子 Fiber 节点
  sibling,     // 下一个兄弟 Fiber 节点
  alternate,   // 双缓冲对应的 Fiber 节点
  effectTag,   // 副作用标记（插入/更新/删除）
  flags,       // 副作用标志位
  lanes,       // 优先级车道
}
```

### Fiber 树的结构

Fiber 节点通过 child、sibling 和 return 指针形成树结构：

```
        App (Fiber)
       /           \
  Header          Main
                  /    \
            Sidebar  Content
```

- child 指向第一个子节点
- sibling 指向下一个兄弟节点
- return 指向父节点

## 快速上手

### Fiber 的工作流程

React 的渲染分为两个阶段：

1. **Render 阶段**（可中断）：遍历 Fiber 树，计算变更，构建 workInProgress 树
2. **Commit 阶段**（不可中断）：将变更应用到 DOM

```
Render 阶段（可中断）：
  处理 Fiber 节点 → 检查是否需要让出 → 继续或中断

Commit 阶段（不可中断）：
  BeforeMutation → Mutation → LayoutEffect
```

### 双缓冲机制

React 使用两棵 Fiber 树实现双缓冲：

- **current 树**：当前屏幕上显示的内容
- **workInProgress 树**：正在构建的新树

两棵树通过 alternate 指针互指。当 workInProgress 树构建完成后，React 交换根指针，workInProgress 变为 current。

## 详细用法

### 工作循环详解

```javascript
// 简化的 Fiber 工作循环
function workLoop() {
  // 是否需要让出主线程
  while (nextUnitOfWork && !shouldYield()) {
    // 处理一个工作单元
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
  }

  if (nextUnitOfWork) {
    // 还有未完成的工作，请求下次空闲时继续
    requestIdleCallback(workLoop);
  } else {
    // 所有工作完成，提交变更
    commitRoot();
  }
}

// 处理单个 Fiber 节点
function performUnitOfWork(fiber) {
  // 1. 处理当前节点（beginWork）
  const children = reconcileChildren(fiber);

  // 2. 优先处理子节点（深度优先）
  if (fiber.child) {
    return fiber.child;
  }

  // 3. 没有子节点，处理兄弟节点
  let nextFiber = fiber;
  while (nextFiber) {
    // 完成当前节点的工作（completeWork）
    completeWork(nextFiber);

    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    // 回到父节点继续处理
    nextFiber = nextFiber.return;
  }
}
```

### 优先级调度（Lanes 模型）

React 使用 Lanes 模型管理更新优先级：

| Lane                | 优先级 | 说明                       |
| ------------------- | ------ | -------------------------- |
| SyncLane            | 最高   | 同步更新，如 flushSync     |
| InputContinuousLane | 高     | 连续输入，如拖拽           |
| DefaultLane         | 普通   | 默认状态更新               |
| TransitionLane      | 低     | 过渡更新，如 useTransition |
| IdleLane            | 最低   | 空闲时执行                 |

```javascript
// 优先级调度示例
function ensureRootIsScheduled(root) {
  // 获取最高优先级的待处理更新
  const nextLanes = getNextLanes(root);

  if (nextLanes === NoLanes) {
    // 没有待处理的更新
    return;
  }

  // 根据优先级调度回调
  const newCallbackPriority = getHighestPriorityLane(nextLanes);

  if (newCallbackPriority === SyncLane) {
    // 同步优先级：立即执行
    scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root));
  } else {
    // 其他优先级：调度到空闲时执行
    scheduleCallback(priorityLevel, performConcurrentWorkOnRoot.bind(null, root));
  }
}
```

### Reconciliation 协调过程

```javascript
// 简化的子节点协调算法
function reconcileChildren(fiber, elements) {
  let index = 0;
  let oldFiber = fiber.alternate?.child;
  let prevSibling = null;

  while (index < elements.length || oldFiber != null) {
    const element = elements[index];
    const sameType = oldFiber && element && element.type === oldFiber.type;

    if (sameType) {
      // 类型相同：更新属性
      const newFiber = {
        type: oldFiber.type,
        props: element.props,
        return: fiber,
        alternate: oldFiber,
        effectTag: 'UPDATE',
      };
    } else if (element && !sameType) {
      // 新元素：插入
      const newFiber = {
        type: element.type,
        props: element.props,
        return: fiber,
        effectTag: 'PLACEMENT',
      };
    } else if (oldFiber && !sameType) {
      // 旧元素不存在于新列表：删除
      oldFiber.effectTag = 'DELETION';
      deletions.push(oldFiber);
    }

    index++;
    oldFiber = oldFiber?.sibling;
  }
}
```

## 常见场景

### 理解 key 的作用

```jsx
// key 帮助 Fiber 识别哪些元素可以复用
function List({ items }) {
  return (
    <ul>
      {items.map((item) => (
        // key 让 Fiber 知道同一 key 的节点可以复用
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}

// 错误用法：使用索引作为 key
// 当列表顺序变化时，Fiber 无法正确复用节点，导致不必要的 DOM 操作
// <li key={index}>{item.name}</li>
```

### 理解 useEffect 的执行时机

```jsx
// useEffect 在 Commit 阶段的 LayoutEffect 之后异步执行
function Component() {
  useEffect(() => {
    // 在 DOM 更新完成后异步调用
    // 不阻塞浏览器绘制
    console.log('副作用执行');
    return () => {
      console.log('清理函数执行');
    };
  }, []);

  useLayoutEffect(() => {
    // 在 DOM 更新后同步调用
    // 阻塞浏览器绘制
    console.log('布局副作用执行');
  }, []);
}
```

## 注意事项

- Fiber 的 Render 阶段可能执行多次（中断后重新开始），不应在 Render 阶段产生副作用
- Commit 阶段不可中断，应避免在此阶段执行耗时操作
- key 的稳定性很重要，不要使用随机值或索引作为 key
- Fiber 架构的内部实现细节可能随版本变化，开发者应关注公开 API 而非内部实现
- React DevTools 的 Profiler 面板可以可视化 Fiber 树的渲染过程

## 进阶用法

### 自定义调度器

```javascript
// 使用 Scheduler API 控制任务优先级
import { scheduleCallback, NormalPriority } from 'scheduler';

function scheduleCustomTask(callback) {
  scheduleCallback(NormalPriority, () => {
    // 在正常优先级下执行任务
    const result = callback();
    return result;
  });
}
```

### Fiber 与并发模式的关系

```jsx
// 并发模式依赖 Fiber 的可中断渲染能力
// useTransition 标记的更新会被分配较低的 Lane 优先级
// 高优先级更新（如用户输入）可以中断低优先级渲染

function SearchPage() {
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState('');

  function handleInput(e) {
    // 紧急更新：高优先级 Lane
    setQuery(e.target.value);

    // 过渡更新：低优先级 Lane，可被中断
    startTransition(() => {
      setSearchResults(search(e.target.value));
    });
  }
}
```

### 调试 Fiber 树

```javascript
// 在 React DevTools 中查看 Fiber 节点
// 或通过 __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED 访问

// 获取组件对应的 Fiber 节点（仅调试用）
function getFiberFromDOM(domElement) {
  const key = Object.keys(domElement).find((k) => k.startsWith('__reactFiber$'));
  return domElement[key];
}
```
