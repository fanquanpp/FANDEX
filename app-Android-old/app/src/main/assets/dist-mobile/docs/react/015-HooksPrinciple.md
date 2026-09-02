## 前置知识

- [Server Components](/react/014-ServerComponents)：建议先完成前一篇的学习

## 学习目标

- 掌握「概述」的核心机制、典型用法与常见陷阱
- 掌握「基础概念」的核心机制、典型用法与常见陷阱
- 掌握「快速上手」的核心机制、典型用法与常见陷阱
- 掌握「详细用法」的核心机制、典型用法与常见陷阱
- 掌握「常见场景」的核心机制、典型用法与常见陷阱


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
## Hooks 链表存储

**基本写法：组件对应 Fiber 的 memoizedState**
`<fiber>.memoizedState = <hook链表>`
```tsx
// 每次渲染按顺序构建链表
fiber.memoizedState = hook1;
hook1.next = hook2;
```

---

**基本写法：Hook 对象结构**
`type <Hook> = { memoizedState, baseState, baseQueue, queue, next }`
```tsx
// Hook 节点字段
{
  memoizedState: 0,
  queue: { pending: null },
  next: nextHook
}
```

---

## Hook 调用顺序约束

**基本写法：必须保证每次渲染调用顺序一致**
`use<A>(); use<B>();`
```tsx
// 顺序错乱会导致状态错位
function App() {
  const [a] = useState(0);
  const [b] = useState(0);
}
```

---

**基本写法：禁止在条件分支中调用**
`if (<条件>) useState(); // 错误`
```tsx
// 正确做法条件放在 hook 之后
const [v, setV] = useState(0);
if (cond) setV(1);
```

---

## mount 与 update 两套实现

**基本写法：首次挂载走 mount 队列**
`const <dispatch> = mountState(<初值>)`
```tsx
// 初次创建 hook 并初始化
const [state, dispatch] = mountState(initial);
```

---

**基本写法：更新走 update 队列**
`const <dispatch> = updateState()`
```tsx
// 复用已有 hook 处理更新
const [state, dispatch] = updateState();
```

---

## useState 实现

**基本写法：dispatchAction 创建 update**
`function <dispatchAction>(<hook>, <action>) { <update>.next = <update>; }`
```tsx
// 环形链表追加 update
const update = { action };
update.next = update;
hook.queue.pending = update;
```

---

**基本写法：render 时遍历 queue 计算新状态**
`while (<update> !== <first>) { <state> = <reducer>(<state>, <update>.action); }`
```tsx
// 逐一应用 action 得到最新 state
let newState = state;
while (update) {
  newState = reducer(newState, update.action);
  update = update.next;
}
```

---

## useReducer 实现

**基本写法：与 useState 类似但用 reducer**
`const [state, dispatch] = mountReducer(<reducer>, <初值>)`
```tsx
// dispatch 调用 reducer 计算新状态
dispatch({ type: 'INC' });
```

---

## useEffect 实现

**基本写法：effect 对象挂在 updateQueue**
`<hook>.updateQueue.lastEffect = <effect>`
```tsx
// effect 形成环形链表
effect.next = effect;
hook.updateQueue.lastEffect = effect;
```

---

**基本写法：effect 包含 create 与 destroy**
`type <Effect> = { tag, create, destroy, deps, next }`
```tsx
// create 是副作用函数 destroy 是清理函数
{
  create: () => subscribe(),
  destroy: () => unsubscribe(),
  deps: [id]
}
```

---

## deps 依赖比较

**基本写法：浅比较决定是否执行 effect**
`if (!<shallowEqual>(<prevDeps>, <nextDeps>)) <执行>`
```tsx
// Object.is 逐项比较
const areEqual = prevDeps.every((d, i) => Object.is(d, nextDeps[i]));
```

---

## useRef 实现

**基本写法：ref 对象首次创建后保持引用**
`const <ref> = { current: <初值> }`
```tsx
// ref 直接存入 memoizedState 不参与更新
hook.memoizedState = { current: initial };
```

---

## useMemo useCallback 实现

**基本写法：依赖不变返回缓存值**
`if (<depsChanged>) <重新计算> else <返回缓存>`
```tsx
// 缓存结果与依赖
if (depsChanged) {
  hook.memoizedState = [factory(), deps];
}
return hook.memoizedState[0];
```

---

## 闭包陷阱成因

**基本写法：effect 捕获旧值导致 stale closure**
`useEffect(() => <使用旧值>, [])`
```tsx
// 空依赖导致捕获首次渲染的 count
const [count] = useState(0);
useEffect(() => {
  const id = setInterval(() => console.log(count), 1000);
  return () => clearInterval(id);
}, []);
```

---

## 闭包陷阱解决依赖

**基本写法：补全依赖项**
`useEffect(() => <逻辑>, [<依赖>])`
```tsx
// 加入 count 让每次更新重建 effect
useEffect(() => {
  const id = setInterval(() => console.log(count), 1000);
  return () => clearInterval(id);
}, [count]);
```

---

## 使用 ref 规避闭包

**基本写法：ref.current 始终是最新值**
`const <latest> = useRef(<值>); <latest>.current = <值>;`
```tsx
// 通过 ref 读取最新 count
const countRef = useRef(count);
countRef.current = count;
useEffect(() => {
  const id = setInterval(() => console.log(countRef.current), 1000);
  return () => clearInterval(id);
}, []);
```

---

## useEffectEvent 规避闭包

**基本写法：使用实验性 useEffectEvent 抽离非响应式逻辑**
`const <fn> = useEffectEvent(<回调>)`
```tsx
// 内部访问最新 props 不进依赖
const onTick = useEffectEvent(() => console.log(count));
useEffect(() => {
  const id = setInterval(onTick, 1000);
  return () => clearInterval(id);
}, []);
```

---

## useReducer 解决闭包

**基本写法：dispatch 引用稳定不捕获旧值**
`dispatch({ type: 'INC' })`
```tsx
// dispatch 永远是最新的不进依赖
useEffect(() => {
  const id = setInterval(() => dispatch({ type: 'INC' }), 1000);
  return () => clearInterval(id);
}, [dispatch]);
```

---

## setState 函数式更新

**基本写法：使用函数式更新读取最新 state**
`setCount(c => c + 1)`
```tsx
// 避免依赖外部 count
setInterval(() => setCount(c => c + 1), 1000);
```

---

## Hook 规则 ESLint 校验

**基本写法：eslint-plugin-react-hooks 强制规则**
`npm i -D eslint-plugin-react-hooks`
```bash
# 安装后自动检测违反规则的写法
npm install --save-dev eslint-plugin-react-hooks
```

---

## 自定义 Hook 闭包

**基本写法：自定义 Hook 也要注意依赖**
`function use<名称>(<值>) { useEffect(() => <用值>, [<值>]); }`
```tsx
// 内部依赖必须完整
function useTimer(cb) {
  useEffect(() => {
    const id = setInterval(cb, 1000);
    return () => clearInterval(id);
  }, [cb]);
}
```

---

## useState 惰性初始化

**基本写法：传入函数仅首次调用**
`useState(() => <昂贵计算>)`
```tsx
// 避免每次渲染重复计算
const [data] = useState(() => heavyCompute());
```

---

## bailout 优化

**基本写法：props 与 state 未变跳过渲染**
`if (<oldProps> === <newProps>) bailout`
```tsx
// 浅比较决定是否跳过子树处理
if (Object.is(prevProps, nextProps)) return bailout;
```

---

## 并发模式下 Hook 行为

**基本写法：transition 内 setState 走低优先级 lane**
`startTransition(() => <setState>)`
```tsx
// 标记为非紧急更新
startTransition(() => setList(bigData));
```

---

## 严格模式双重渲染

**基本写法：开发环境两次渲染检测副作用**
`<React.StrictMode> <App/> </React.StrictMode>`
```tsx
// 帮助发现不纯函数副作用
<React.StrictMode><App /></React.StrictMode>
```

---

## Hook 与 Fiber 关系

**基本写法：每次渲染重建 hook 链表**
`<render> -> <遍历hook链表> -> <执行hook函数>`
```tsx
// 通过 current.memoizedState 复用上次状态
renderHooks(fiber);
```
