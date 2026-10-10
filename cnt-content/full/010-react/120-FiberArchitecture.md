---
order: 180
title: Fiber 架构：渲染为什么能随时停下
module: 'react'
category: 前端技术
difficulty: advanced
description: 从命令面板敲字卡顿讲起：用 mini 工作循环亲手感受时间切片，再拆解 Fiber 节点链表、双缓冲、Render 与 Commit 两阶段、Scheduler 调度与 Lanes 优先级，附「渲染期副作用」与「key 不稳定」两则调试实录。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'react/110-JSXDeepAnalysis'
  - 'react/130-ConcurrentRendering'
  - 'react/150-HooksPrinciple'
  - 'react/180-ReactPerformance'
prerequisites:
  - 'react/110-JSXDeepAnalysis'
---

## 前置知识

- [JSX 深度解析](/react/110-JSXDeepAnalysis)：知道 JSX 会被编译成 `createElement` / `jsx` 调用，产出「界面描述对象」；
- [React 性能优化](/react/180-ReactPerformance) 读过最好，没读过也不影响——本篇解释的是它背后的机制。

## 学习目标

读完本文你将能够：

1. 用一段 30 行的 mini 工作循环，亲手验证「切片干活 + 让出主线程」为什么不会卡死页面；
2. 说出 Fiber 节点的 child / sibling / return 链表结构，解释它为什么比递归树更适合「可中断」；
3. 画出 current 树与 workInProgress 树的双缓冲关系，解释提交后角色如何互换；
4. 区分 Render（可中断）与 Commit（同步）两个阶段，说出 flags 与 subtreeFlags 的作用；
5. 解释 Lanes 优先级模型如何让「输入」插队「过滤计算」，并定位渲染期副作用的报错。

预计 60 到 80 分钟。

## 1. 你现在要解决什么问题

FANDEX 网页端右上角有个命令面板（快捷键 Ctrl+K）：敲一个字，就在几万条文档索引里过滤。每次敲键都是一次完整的 React 更新——组件函数重跑、新描述树生成、对比、更新 DOM。如果 React 像 React 15 那样「一口气递归到底、中途不停」，一次大过滤就要霸占主线程几百毫秒，你下一个键按下去没反应，输入框先是丢字、后是卡死。

React 16 起换掉的正是这个「栈式协调器」。新引擎叫 **Fiber**，目标一句话：**把一次大渲染拆成小片，片与片之间把主线程还回去，急事来了随时插队。** 本篇就拆开看它怎么做到，先动手感受，再讲结构。

## 2. 动手：两个循环，两种命运

不碰 React，先用纯 JS 在浏览器里（FANDEX 前端实验室或控制台都行）把 Fiber 的核心思路演一遍。准备 3000 个耗时任务，模拟「渲染 3000 个组件节点」：

```js
// 模拟处理一个 Fiber 节点的成本（约 0.05ms）
const tasks = Array.from({ length: 3000 }, (_, i) => () => {
  let x = 0;
  for (let j = 0; j < 20000; j++) x += j;
});

// 版本 A：一口气干完 —— React 15 栈式协调器的思路
function runBlocking() {
  const start = performance.now();
  tasks.forEach((task) => task());
  console.log(`A 阻塞版：${(performance.now() - start).toFixed(0)}ms 全部完成`);
}

// 版本 B：切片 + 让出 —— Fiber 工作循环的思路
let nextIndex = 0;
function workLoop() {
  const sliceStart = performance.now();
  // 干到 5ms 就停手
  while (nextIndex < tasks.length && performance.now() - sliceStart < 5) {
    tasks[nextIndex++]();
  }
  if (nextIndex < tasks.length) {
    setTimeout(workLoop, 0); // 还有活：让出主线程，稍后被唤醒接着干
  } else {
    console.log('B 切片版：全部完成');
  }
}
```

先跑 `runBlocking()`，紧接着狂敲键盘：**每个键都延迟一两百毫秒才响应**——循环占着主线程，浏览器没空处理输入。再跑 `workLoop()` 同样狂敲：每个键都即时上屏，但总耗时和 A 差不多。

两种命运的差别只在一处：**B 每干 5ms 就主动让出，把输入事件的机会让出来。** 这就是「可中断渲染」的全部直觉。React 真正的工作循环和这段代码同构，只是「一个任务」从裸函数换成了「处理一个 Fiber 节点」，`setTimeout` 换成了更精密的调度器。

预期行为：A 期间页面冻结，B 期间页面照常响应。亲手跑过一次，后面所有结构设计都变得顺理成章。

## 3. 为什么是链表：让「随时停下」成为可能

要能停下来，React 必须回答一个问题：**停了之后再从哪继续？** 递归做不到——递归的「下一次」藏在 JS 调用栈里，栈一断进度就没了。Fiber 的做法是放弃递归，把组件树改造成**链表**，进度就变成了一个指针。

每个组件对应一个 Fiber 节点，三个指针描述整棵树：

```text
Fiber 节点的关键结构：
{
  type,          // 组件类型（函数/类/标签名）
  key,           // 列表里的唯一标识
  props,         // 属性
  stateNode,     // 对应的真实 DOM 节点（宿主组件才有）
  return,        // 父 Fiber
  child,         // 第一个子 Fiber
  sibling,       // 下一个兄弟 Fiber
  alternate,     // 指向另一棵树上的对应节点（双缓冲，见第 4 节）
  flags,         // 本节点要做的 DOM 变更（插入/更新/删除）
  subtreeFlags,  // 整棵子树的变更汇总，避免提交时全树扫描
  lanes,         // 本节点待处理的更新优先级（见第 6 节）
}
```

「树」的样子没变，只是遍历方式变成了显式的指针跳转：

```text
        App
       /    \
   Header    Main
            /    \
        Sidebar  Content

遍历顺序（深度优先）：
App → Header → Header 完成回溯 → Main → Sidebar → Sidebar 完成 → Content → 完成
```

用一个只有孩子指针的简化版看这段遍历怎么写：

```js
// 简化的 performUnitOfWork：处理一个节点，返回下一个节点
function performUnitOfWork(fiber) {
  const children = reconcileChildren(fiber); // 1. 算出子节点（beginWork 的核心）
  if (fiber.child) return fiber.child;       // 2. 有孩子先下潜
  let node = fiber;
  while (node) {
    completeWork(node);                      // 3. 没孩子：完成自己（completeWork）
    if (node.sibling) return node.sibling;   // 4. 有兄弟：去兄弟
    node = node.return;                      // 5. 都没有：回到父节点继续找
  }
  return null;                               // 整棵树完成
}
```

回到开头的问题：无论停在哪一个节点，`nextUnitOfWork` 这个指针就保存了全部进度。停了再启动，从指针继续跳。**递归把进度存在调用栈里，链表把进度存在一个变量里**——这就是「随时停下、随时恢复」的结构基础。

## 4. 双缓冲：为什么渲染时屏幕不会闪

切片带来一个新麻烦：渲染到一半时，界面上既有旧结果又有半成品。如果直接在正在显示的树上改，用户会看到中间状态——列表过滤到一半的残屏。

Fiber 的解法是**双缓冲**：内存里永远维护两棵树。

- **current 树**：当前显示中的版本，`stateNode` 指着真实 DOM；
- **workInProgress 树**：正在构建的版本，构建完才一次性提交。

每对镜像节点用 `alternate` 互相指着：

```text
   current 树（屏幕上）          workInProgress 树（内存中）
   App                          App'
    └── List                     └── List'
         └── Item x N                 └── Item' x N（正在构建）

   List.alternate === List'
   List'.alternate === List     （互为镜像）
```

构建开始时，workInProgress 树的骨架不是从零建，而是顺着 alternate 从 current 树**复用**节点——上一次渲染的成果就是这一次的底稿。全部算完、提交到 DOM 之后，workInProgress 树转正变成新的 current 树，两棵树的角色互换，进入下一轮。屏幕上永远只有完整的 current 树，中间状态用户永远看不到。

这个设计还有个副产品：渲染中断后如果输入又变了，React 可以直接把半成品 workInProgress 树**整个丢掉重来**——反正在内存里，没人见过它。

## 5. 两个阶段：Render 随便停，Commit 不许停

整次更新被切成两个纪律完全不同的阶段：

```text
Render 阶段（可中断，可能整段重来）：
  beginWork：自顶向下，调用组件函数，算出子 Fiber，diff 子节点
  completeWork：自底向上，创建/复用 DOM 描述，打 flags，汇总 subtreeFlags

  ↓ 全部算完，进入提交 ↓

Commit 阶段（同步、不可中断，一鼓作气）：
  beforeMutation：读 DOM 前的准备工作
  mutation：按 flags 真正增删改 DOM
  layout：同步执行 useLayoutEffect、类组件生命周期
```

Render 阶段算的是「变成什么样」，只产出内存里的 workInProgress 树和一堆标记，不碰 DOM——所以停多少次、重来多少次都安全。Commit 阶段动的是真实 DOM，做一半停下用户就会看到半成品，所以必须同步一口气做完。这也解释了为什么 `useLayoutEffect` 会阻塞绘制：它排在 layout 子阶段里，属于那次「不许停」的冲刺。

标记靠两个位字段传递：

```js
// flags：本节点要做的事（旧版本源码叫 effectTag，已更名）
fiber.flags |= Placement;  // 插入
fiber.flags |= Update;     // 更新
fiber.flags |= ChildDeletion; // 删除子节点

// subtreeFlags：completeWork 完成节点时自底向上汇总
parent.subtreeFlags |= child.flags | child.subtreeFlags;
```

subtreeFlags 的价值在 Commit 阶段兑现：mutation 需要处理「某个深层子节点要更新」，但不想全树扫描找它——只要从根往下看 subtreeFlags，哪棵子树没活儿就整棵跳过。**flags 记自己的活，subtreeFlags 记子孙的活**，一层递归就能定位全部待办。

## 6. 调度与优先级：让敲字插队大过滤

回到第 1 节的场景：输入框敲字和大列表过滤同时在进行，谁该先跑？Fiber 用**车道（Lanes）模型**给更新分级——一个 31 位二进制位图，一个位是一条车道：

| 车道                 | 优先级 | 典型来源                        |
| -------------------- | ------ | ------------------------------- |
| SyncLane             | 最高   | flushSync 包裹的同步更新        |
| InputContinuousLane  | 高     | 连续输入事件，如拖拽、移动      |
| DefaultLane          | 普通   | 大多数 setState                 |
| TransitionLane       | 低     | useTransition 标记的过渡更新    |
| IdleLane             | 最低   | 空闲时才执行的更新              |

一次更新从 `scheduleUpdateOnFiber(fiber, lane)` 进入：给沿途 Fiber 打上 lane 标记，合并到根节点，再由 `ensureRootIsScheduled` 挑出**最高的那条车道**决定调度方式。SyncLane 直接同步执行；其余交给独立的 Scheduler 包，按优先级排队、以约 5ms 的时间片跑第 2 节那种工作循环。

Scheduler 让出主线程的实现细节值得知道：它不用 `requestIdleCallback`（触发太慢、频率不稳），而是用 `MessageChannel` 宏任务——每让出一次，浏览器就有机会处理输入、绘制，然后再被唤醒继续干活。

车道叠起来才是完整故事：命令面板敲字走 DefaultLane，过滤几千条结果用 `useTransition` 标成 TransitionLane。切片间隙一旦敲键事件进来，React 发现高优先级车道有活，**丢掉正在构建的低优先级 workInProgress 树，先处理输入**，之后再重启过滤渲染——这就是 130 篇并发渲染的机制底座。

## 7. 协调 diff：同层比较，key 认人

「新旧两棵树怎么对比」发生在 Render 阶段。为了保住可中断性，diff 只做**同层比较**：类型不同或 key 不同就整个换掉子树，绝不跨层挪动。规则三条：

1. 类型不同：卸载旧子树，新建新子树（所以 `<div>` 改 `<span>`，里面全部重来）；
2. 类型相同：复用 Fiber 节点，只更新变化的 props；
3. 列表靠 key：同 key 视为同一节点，可复用、可移动。

```jsx
// key 是 diff 的身份证
{players.map((p) => <PlayerCard key={p.id} player={p} />)}
```

这就是 020 篇「key 要唯一且稳定」的底层原因：Fiber 靠 key 匹配新旧节点。用数组下标当 key 时，中间插入一项，后面所有下标平移，Fiber 以为「2 号位还是那个人」，把旧状态安到错误的组件头上——内容串位、输入框错位，都从这来。

## 8. 修改实验

实验一：把第 2 节版本 B 的时间片从 5ms 改成 50ms 再跑，敲键响应明显变钝——体会时间片大小在「吞吐」与「响应」之间的取舍，React 选 5ms 正是这个折中。

实验二：给版本 B 加一个「急事插队」：循环外放一个按钮，点击时往队首插入 10 个高优先级任务，切片间隙优先处理它们，验证插队生效（简化版 Lanes）。

实验三：在 FANDEX 网页端打开 React DevTools 的 Profiler，进命令面板敲几个字，回放录制：能看到每次敲键产生的 commit 火焰图，以及列表岛屿的重渲染范围。

## 9. 常见错误与调试实录

**错误一：渲染期副作用。** 在组件体里直接改外部变量：

```jsx
const logs = [];
function PlayerList({ players }) {
  logs.push('render');           // 副作用写在渲染路径上
  return <ul>{/* ... */}</ul>;
}
```

开发模式（StrictMode）下控制台两次推送、生产一次；一旦列表渲染被并发打断重跑，可能更多。更典型的翻车是反过来——渲染时去更新别的组件的状态：

```text
Warning: Cannot update a component (`App`) while rendering a different component (`PlayerList`).
```

三步定位：读警告——「渲染 PlayerList 的同时去更新 App」，React 直接点名两边；验真身——渲染路径（组件体、子组件构造期）里有没有直接调 setState / 改外部可变数据；修正——把这类动作挪进事件处理器或 `useEffect`。根源就是第 5 节的纪律：**Render 阶段可能跑多次甚至整段重来，副作用放这里，重跑就是重复执行**。StrictMode 故意双调渲染，就是为了让这类代码在开发期现形。

**错误二：Commit 阶段太重，掉帧。** 在 `useLayoutEffect` 里同步做几万次 DOM 读写（强制布局抖动），页面点击到绘制之间出现肉眼可见的迟滞。定位：DevTools Performance 面板里看到一段同步的 Commit 块横在「输入事件」和「绘制」之间。修正：把非视觉必需的工作挪进 `useEffect`（异步、不阻塞绘制），或用 180 篇的 `startTransition` 把重计算降到低优先级。记住第 5 节的结论——Commit 不许停，它的重量就是用户感受到的卡顿。

**错误三：key 不稳定导致状态串位。** 列表项里放了个 input，用下标当 key，在中间插入一项后，发现输入框里的字「上移了一格」。定位：打印每项 key，插入前后对比，key 全体平移；修正：换成数据自带的稳定 id（020 篇同款修法，这里补上了它的底层解释——第 7 节）。

## 10. 实际项目中的使用场景

- **代码里没有 Fiber API，但处处是它的纪律**：组件保持纯函数、不写渲染期副作用、key 稳定——这些「规范」都是 Fiber 可中断渲染的生存条件；
- **自定渲染器**：`react-reconciler` 包把整套协调器开放出来，换掉「操作 DOM」的宿主配置就能渲染到别的世界——react-three-fiber 把场景图当 Fiber 树管理，Ink 用它把组件渲染进终端。你天天用的蓝图，别人拿去画了 3D 和命令行；
- **调试黑盒**：DOM 节点上挂着 `__reactFiber$` 开头的属性指向对应 Fiber，控制台里 `Object.keys(dom).find(k => k.startsWith('__reactFiber$'))` 可以取出节点做现场勘查。React 19 把内部对象改挂在 `__CLIENT_INTERNALS_*` 下，键名随版本会变——只用于调试，业务代码永远别依赖；
- **状态存哪**：hooks 状态就挂在 Fiber 节点的 `memoizedState` 链表上，更新队列、effect 链表也都在 Fiber 身上——这是 [Hooks 原理](/react/150-HooksPrinciple) 的入口。

## 11. 小练习

预测题（5 分钟）：给定树 `A → (B, C)`，`B → (D, E)`，按 performUnitOfWork 的下潜/回溯规则，节点处理顺序是？（答案藏在「有孩子先下潜，没孩子做完成，有兄弟去兄弟」三句话里：A、B、D、E、C。）

修改题（10 分钟）：给第 2 节版本 B 加一个进度显示——每完成 10% 在控制台打一行 `进度 30%`，并在最后一个任务完成时报告总耗时。验收：耗时与版本 A 同量级，但期间敲键不卡。

修 Bug 题（10 分钟）：下面的组件在开发模式每次渲染都把一条日志推进外部数组，StrictMode 下数组长度是渲染次数的两倍。按第 9 节三步定位，把日志动作挪到正确位置：

```jsx
const renderLog = [];
function Counter({ count }) {
  renderLog.push(`render ${count}`);
  return <p>{count}</p>;
}
```

挑战题（30 分钟）：给版本 B 的任务加 `priority: 'high' | 'normal'` 两档，切片间隙总是先取最高优先级任务（实现一个极简的「车道」）。验收：跑一半时插入一批 high 任务，它们先于剩余 normal 任务完成。做不下去再想第 6 节：ensureRootIsScheduled 挑的正是「最高那条车道」。

## 12. 与之前和之后的知识的关系

- 往前：110 篇的 JSX 编译产物「描述对象」就是 Fiber 节点的原料；020 篇 key 的规矩、040 篇 effect 时机的规矩，本篇都给了底层解释；
- 往后：[Concurrent 模式](/react/130-ConcurrentRendering) 讲优先级怎么被业务代码用起来（useTransition / useDeferredValue / Suspense 挂起）；[Hooks 原理](/react/150-HooksPrinciple) 拆 Fiber 上的 memoizedState 链表；[渲染优先级与调度](/react/470-RenderingPriorityAndScheduling) 深入 Scheduler 的 lane 位运算。

## 13. 官方文档

- 渲染与提交：https://zh-hans.react.dev/learn/render-and-commit
- 作为 UI 树：https://zh-hans.react.dev/learn/understanding-your-ui-as-a-tree
- state 更新批处理与调度：https://zh-hans.react.dev/learn/queueing-a-series-of-state-updates
- react-reconciler（自定渲染器入口）：https://www.npmjs.com/package/react-reconciler

## 14. 自我检查

- 能不看笔记复述第 2 节两个循环的差异，说出「可中断」依赖哪三个要素（链表、指针进度、时间片让出）；
- 能画出双缓冲两棵树与 alternate 的关系，说清提交后角色如何互换；
- 能说出 Render 与 Commit 各自的可中断性，以及 flags / subtreeFlags 的分工；
- 能解释 useTransition 的更新为什么能被敲字打断（车道 + 丢树重来）；
- 拿到「Cannot update a component while rendering a different component」能在 30 秒内定位到渲染期副作用。

## 本章总结

Fiber 把组件树改成 child / sibling / return 链表，把渲染进度从调用栈里搬到一个指针上，于是渲染可以被切成约 5ms 的片、片间让出主线程（Scheduler 用 MessageChannel 唤醒），急事（高 Lanes）来了就丢掉半成品 workInProgress 树先办急事。屏幕永远只看 current 树：Render 阶段在内存里算新树打 flags、汇总 subtreeFlags，Commit 阶段同步完成 beforeMutation、mutation、layout 三步。所有日常纪律——组件要纯、渲染无副作用、key 要稳定——都是这套机制能安全中断的前提。

## 下一步

进入 [Concurrent 模式](/react/130-ConcurrentRendering)：机制你已经懂了，接下来是业务代码怎么用它——useTransition、useDeferredValue 与 Suspense 挂起，让「慢数据」不再拖住「快交互」。
