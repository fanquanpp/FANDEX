---
order: 200
title: Hooks 原理：状态藏在 Fiber 的链表里
module: 'react'
category: 前端技术
difficulty: advanced
description: 从「Rendered fewer hooks than expected」崩溃实录讲起：用 30 行 mini useState 亲手验证「按顺序认人」，再对照真实结构——Fiber 上的 hook 链表、环形更新队列、effect 环链与 Object.is 比较，附闭包陷阱四种修法与 useEffectEvent。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'react/120-FiberArchitecture'
  - 'react/130-ConcurrentRendering'
  - 'react/040-HooksDeep'
  - 'react/160-CustomHooksDesignPattern'
prerequisites:
  - 'react/120-FiberArchitecture'
---

## 前置知识

- [Fiber 架构](/react/120-FiberArchitecture)：知道组件对应 Fiber 节点、Render 阶段可能整段重跑——hook 就住在这棵树上；
- [Hooks 深入](/react/040-HooksDeep)：会用 useState / useEffect / useRef，本篇回答「它们凭什么工作」。

## 学习目标

读完本文你将能够：

1. 用 30 行代码写一个 mini useState，运行并验证「Hooks 按调用顺序匹配」；
2. 亲手把 Hook 塞进 if 分支制造错位，从结构上解释为什么规则禁止条件调用；
3. 说出 hook 节点的字段构成，解释 useState 的更新队列为什么是环形链表；
4. 用「effect 环链 + Object.is 浅比较」解释 useEffect 的触发与跳过机制；
5. 对闭包陷阱给出四种修法（补依赖、函数式更新、ref、useEffectEvent）并说出各自适用边界。

预计 60 到 80 分钟。

## 1. 你现在要解决什么问题

接手同事的代码，详情页加了个「折叠侧栏」功能，他顺手把新状态写进了折叠判断里：

```jsx
function DetailPage() {
  const [collapsed, setCollapsed] = useState(false);
  const [doc, setDoc] = useState(null);

  if (collapsed) {                    // 问题代码
    const [draft, setDraft] = useState('');
  }
  // ...
}
```

一展开侧栏、再折叠，页面当场崩掉，控制台：

```text
Uncaught Error: Rendered fewer hooks than expected. This may be caused by an
accidental early return statement.
```

040 篇给过规矩「Hook 只能写在顶层」，但规矩背后是什么？为什么 React 连「条件里用个 Hook」都不允许，而 `if (cond) setCount(1)`（调用 setState）却完全合法？答案藏在数据结构里：**Hooks 不是存在组件里的，是存在 Fiber 节点的一条链表上，React 靠调用顺序认领它们。** 本篇先动手把这个结构造出来，再对照真实源码逐个拆 Hook。

## 2. 动手：30 行 mini useState

不碰 React，在浏览器控制台或 FANDEX 前端实验室直接跑。核心问题只有一个：函数组件每次渲染都从头执行一遍，**没有实例、没有 this，上一次的值存哪？** 答案：存在组件外面——真实的 React 存在 Fiber 节点上，我们用一个数组模拟：

```js
// 模拟一个 Fiber 节点：hook 状态都挂在它身上
const fiber = { hooks: [] };
let hookIndex = 0;          // 本次渲染进行到第几个 hook

function miniUseState(initialValue) {
  const index = hookIndex++;                    // 1. 按调用顺序领号
  if (fiber.hooks[index] === undefined) {       // 2. 首次：初始化（mount）
    fiber.hooks[index] = { value: initialValue };
  }
  const hook = fiber.hooks[index];              // 3. 非首次：按号取回旧值（update）

  function setState(action) {                   // dispatch 的雏形
    hook.value = typeof action === 'function' ? action(hook.value) : action;
    render();
  }
  return [hook.value, setState];
}

function Counter() {                            // 组件：每次渲染整个重跑
  const [count, setCount] = miniUseState(0);
  const [show, setShow] = miniUseState(true);
  console.log(`渲染时 count = ${count}, show = ${show}`);
  return { count, setCount, show, setShow };
}

function render() {         // 模拟 React 重渲染组件
  hookIndex = 0;            // 关键：每次渲染前把「发号器」清零
  Counter();
}

render();                   // 渲染时 count = 0, show = true
Counter().setCount(5);      // 渲染时 count = 5, show = true
Counter().setShow(false);   // 渲染时 count = 5, show = false
```

跑通了就做一个破坏性实验——把第二个 Hook 塞进条件：

```js
function BrokenCounter({ collapsed }) {
  const [count] = miniUseState(0);
  if (collapsed) {
    miniUseState('draft');    // 条件里的 Hook
  }
  return { count };
}

render();                     // collapsed = false：发出去 1 个号
// 现在 collapsed 变 true 再渲染：
// 第 0 号还是 count，但「draft」以为自己是第 1 号——上次它根本不存在
```

预期行为：条件翻转的瞬间，mini 实现会读错槽位——真实 React 直接拒绝并抛出第 1 节那个错误。现在规矩不需要背了：**hookIndex 就是身份，顺序一变，身份就变**。这也解释了为什么 `setState`（调 dispatch）可以放条件里——dispatch 只往队列里塞更新，不动链表结构。

## 3. 真实结构：Fiber 上的 hook 链表

真实实现比数组精致，但骨架一致。每个函数组件的 Fiber 节点上，`memoizedState` 字段存着**本组件 hook 链表的头节点**：

```text
Fiber.memoizedState → Hook(count) → Hook(show) → Hook(effect) → null

Hook 节点：
{
  memoizedState,  // useState 存值；useEffect 存 effect 对象；useRef 存 { current }
  baseState,      // 重算的起点状态
  queue,          // 更新队列（见第 4 节）
  next,           // 下一个 Hook
}
```

React 内部有两套取 Hook 的路径：首次渲染走 mount 系列（创建节点、串链表），更新渲染走 update 系列（顺着链表逐个认领）。维护的不是 mini 版的全局发号器，而是一个 `workInProgressHook` 指针——每调一个 Hook 指针前移一格，等价于 hookIndex 自增。自定义 Hook 没有任何特殊存储：`useWindowSize` 里的 useState 就**并入调用组件的链表**，展开即内联，所以「自定义 Hook 只是函数复用」在结构上也成立。

由此得出两条铁律的真实版本：Hook 只能在函数组件（或自定义 Hook）里调用——普通函数没有 Fiber 上下文，链表无处安放；Hook 调用顺序必须每次渲染一致——链表按位置匹配，不看名字。`eslint-plugin-react-hooks` 就是在编译期替你盯着这两条。

## 4. setState 的真身：环形更新队列

`setCount(5)` 没有改任何「状态」，它做的是**排队**。dispatch 把更新包成 update 节点，塞进 hook.queue 的环形链表，然后调度渲染：

```js
// 简化的 dispatchSetState
function dispatchSetState(fiber, queue, action) {
  const update = {
    action,                        // 新值，或 (prev) => next 形式的函数
    lane: requestUpdateLane(),     // 优先级：事件里同步、transition 里低车道
    next: null,
  };
  const pending = queue.pending;
  if (pending === null) {
    update.next = update;          // 空队列：指向自己形成环
  } else {
    update.next = pending.next;    // 插入队尾
    pending.next = update;
  }
  queue.pending = update;          // pending 恒指向最后一个

  scheduleUpdateOnFiber(fiber, update.lane); // 排完队才触发调度
}
```

为什么是环？单指针就能 O(1) 追加（pending 即尾，pending.next 即头），下次 Render 时从头遍历整个环，把 update 逐个作用到 state 上。**函数式更新 `setCount(c => c + 1)` 的意义此刻显形**：action 是函数时，重算会拿「上一步的结果」当参数，连续三次点击即使排在同一队列里也各自生效；直写值则三次都基于同一个旧快照。这也顺带解释了 React 18+ 的自动批处理：dispatch 只是入队，渲染由调度器统一安排，同一次事件里排几个更新都只触发一次 Render（130 篇）。

一个小陷阱顺带拆掉：`useState(heavyInit())` 每次渲染都会执行 `heavyInit()`（结果被丢弃），换成 `useState(heavyInit)` 传函数，React 只在 mount 时调用它——惰性初始化，省的是每次渲染的初始化成本。

## 5. useEffect 的真身：effect 环链与 Object.is

useEffect 的 hook.memoizedState 里存的不是值，是一个 effect 对象：

```text
Effect { tag, create, destroy, deps, next }
  create:  副作用函数
  destroy: 上一次的清理函数
  deps:    依赖数组
```

同一组件的多个 effect 串成环挂在 updateQueue 上。Render 阶段 React 只做记录，真正的执行推迟到 Commit 之后的 passive 阶段（所以不阻塞绘制，120 篇）。**要不要执行，靠 deps 浅比较决定**：

```js
// 简化的 updateEffect
function updateEffect(create, deps) {
  const hook = updateHook();               // 按顺序认领旧 effect
  const prevDeps = hook.memoizedState.deps;
  const changed = !deps.every((d, i) => Object.is(d, prevDeps[i])); // 逐项 Object.is
  if (!changed) return;                    // 没变：本 effect 跳过
  hook.memoizedState = { create, destroy: undefined, deps };
  fiber.flags |= PassiveEffect;            // 变了：标记待执行
}
```

执行时先跑上一次的 `destroy()` 清理，再跑新的 `create()`。依赖数组是比较的**参照物**而非条件表达式——「依赖里该放什么」的答案永远是「effect 里读到的所有响应式值」，这不是风格，是比较算法决定的：放少了，变了也测不出来。

useRef 就 simplest：mount 时 `hook.memoizedState = { current: initial }`，此后每次渲染原样返回同一个对象，永不比较、永不触发渲染——改 current 不重渲染的根源就在这。useMemo 是「deps 变了就重算并缓存」；useCallback 则干脆是 `useMemo(() => fn, deps)` 的特例，缓存的是函数本身。

## 6. 修改实验

实验一：给 mini 版加「渲染计数」，验证同一个事件里连续调三次 setState 只重渲染一次（把 render 换成微任务里合并执行）。

实验二：给 mini 版的 hook 节点加 `queue: []`，把 setState 改成先入队、render 时统一结算，然后验证 `setCount(c => c + 1)` 连调三次从 0 到 3，而 `setCount(count + 1)` 连调三次只到 1。

实验三：在真实项目里给 useEffect 打断点，观察「先 destroy 后 create」的顺序，以及依赖不变时根本不进 effect——对照第 5 节的判断逻辑。

## 7. 常见错误与调试实录

**错误一：setInterval 闭包陷阱。** 经典现场：定时器永远打印 0。

```jsx
function Timer() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const id = setInterval(() => console.log(count), 1000); // 捕获首次渲染的 count
    return () => clearInterval(id);
  }, []);   // 依赖为空，effect 只建一次，闭包里的 count 冻结在 0
}
```

三步定位：读现象——打印值停在首次渲染的快照；验真身——effect 闭包捕获的是**那一次渲染**的变量，依赖数组空意味着这个 effect 及其闭包永不重建；修复四选一，按场景挑：

1. 补依赖 `[count]`：每秒重建定时器，逻辑最直白但开销与计时误差最大；
2. 函数式更新 `setCount(c => c + 1)`：不需要读 count 时首选（第 4 节的队列机制保证正确）；
3. ref 镜像：`countRef.current = count` 放在渲染体里，定时器读 `countRef.current`，始终最新；
4. `useEffectEvent`（React 19.2 转正）：`const onTick = useEffectEvent(() => console.log(count))`，函数体内**始终读到最新值且不进依赖数组**——专为此场景设计，语义最清楚。

根因一句话：组件函数每次渲染是一个**全新的作用域**，闭包捕获的是本次渲染的常量，不是「变量本身」。

**错误二：依赖数组里放对象/数组字面量。** `useEffect(..., [{ id }])` 每次渲染都是新对象，Object.is 永不相等，effect 每次渲染都跑，等于没写依赖。定位：Effect 面板（或 console）看到 effect 高频重跑；修正：放原始值（`[id]`）或 useMemo 稳定引用。useMemo/useCallback 的 deps 同理——这也是 180 篇「先测性能再上缓存」的底层依据：缓存键不稳定，缓存形同虚设。

**错误三：渲染期读 ref 当 state 用。** 把 `ref.current` 渲染进 JSX，StrictMode 下双渲染时界面偶尔「倒退」——ref 变化不触发渲染，读它的时机又因并发重跑而不定（130 篇 tearing 的近亲）。修正：参与渲染的数据走 useState，ref 只存不进画布的可变量（定时器 id、上一次值）。

## 8. 实际项目中的使用场景

- **排查 Hook 顺序崩溃**：看到「Rendered fewer hooks than expected」或「Rendered more hooks than during the previous render」，直接找**提前 return**、条件/循环/嵌套里的 Hook，或组件内部用 Hook 的早退分支——结构决定报错点必在顺序漂移处；
- **自定义 Hook 的正确心智**：它不是「把状态存在别处」，是把若干 Hook **内联进调用者的链表**——所以自定义 Hook 同样受顺序纪律约束，内部逻辑变了（多调一个 Hook），所有调用组件的链表形状跟着变，好在这在同一组件的生命周期内是稳定的；
- **并发下的状态一致性**：transition 更新走低 lane（第 4 节 requestUpdateLane），配合 130 篇的 useSyncExternalStore 防 tearing——外部数据进 React 必须走那扇门；
- **StrictMode 双渲染**：开发模式故意把组件函数调两遍，不纯的渲染（渲染期副作用、依赖渲染顺序的逻辑）立刻现形——它赌的就是你读完本篇后知道「组件函数本来就可能被调多次」。

## 9. 小练习

预测题（3 分钟）：mini 版里，组件写成 `useState(0); if (x) return null; useState('a')`，x 从 false 变 true 再变 false，链表会发生什么？（真实 React 会在 x 为 true 时少认领一个 Hook，下次渲染报「Rendered fewer hooks」——早退分支后面的 Hook 时有时无，正是官方报错文案点名的原因。）

修改题（10 分钟）：把 Timer 例子用 useEffectEvent 重写，验收：定时器只建一次（Network/console 验证），打印值实时更新，依赖数组保持 `[]`。

修 Bug 题（10 分钟）：下面代码想实现「父组件刷新时子组件重置表单」，结果死循环。用第 5 节的比较逻辑解释原因并修复：

```jsx
useEffect(() => {
  form.reset();
}, [{ timestamp }]);   // 父组件每次渲染都传新对象字面量
```

挑战题（30 分钟）：给 mini 版实现 `useMemo(fn, deps)` 与 `useRef(initial)`，并用「条件调用 useMemo 导致缓存值串位」的实验验证它们同样受顺序约束。

## 10. 与之前和之后的知识的关系

- 往前：120 篇的 Fiber 节点是 hook 链表的宿主；130 篇的批处理与 lane 在 dispatch 里接力；040 篇的使用经验在本篇拿到结构解释；
- 往后：[自定义 Hooks 设计模式](/react/160-CustomHooksDesignPattern) 在「内联进调用者链表」的心智上展开设计方法论；[状态管理方案对比](/react/170-StateManagementSolutionComparison) 讨论什么时候该跳出组件级 hook 链表，改用外部 store。

## 11. 官方文档

- Hook 规则：https://zh-hans.react.dev/reference/rules/rules-of-hooks
- useRef：https://zh-hans.react.dev/reference/react/useRef
- 在 Effect 中读取最新值（useEffectEvent）：https://zh-hans.react.dev/learn/separating-events-from-effects
- Queueing a Series of State Updates：https://zh-hans.react.dev/learn/queueing-a-series-of-state-updates

## 12. 自我检查

- 能不看笔记写出 mini useState 并指出 hookIndex 清零的位置对应 React 的哪一步；
- 能画出 hook 链表挂在 Fiber 哪个字段上，说出 hook 节点四个字段各自的用途；
- 能解释为什么 dispatch 用环形链表、为什么函数式更新在批处理下依然正确；
- 能说出 effect 执行的完整时序（deps 比较 → destroy → create）与 Object.is 的局限；
- 拿到闭包陷阱能当场给出两种以上修法并说出取舍。

## 本章总结

Hooks 没有魔法容器：状态按调用顺序挂在 Fiber.memoizedState 指向的链表上，每次渲染重跑组件函数、按序认领。setState 是入队（环形链表 O(1) 追加）加调度，函数式更新因此在批处理下依然正确；useEffect 是 effect 环链加 Object.is 浅比较，先清理后执行；useRef 是永不换的对象，useMemo/useCallback 是带缓存的求值。所有 Hook 规则——只写顶层、顺序稳定、依赖完整——都是这条链表的生存条件；闭包陷阱的本质是「每次渲染一个新作用域」，四种修法按语义选。

## 下一步

进入 [自定义 Hooks 设计模式](/react/160-CustomHooksDesignPattern)：结构已经透明，接下来是把重复逻辑抽成 Hook 的设计手艺——什么值得抽、怎么命名、怎么让调用方用得舒服。
