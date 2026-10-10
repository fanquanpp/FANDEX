---
order: 190
title: Concurrent 模式：让慢更新别拖住快交互
module: 'react'
category: 前端技术
difficulty: advanced
description: 从全站搜索页「敲字卡 + 切页闪」讲起：useTransition 拆分紧急与非紧急更新、useDeferredValue 与选型规则、Suspense 挂起与防 fallback 闪烁、tearing 与 useSyncExternalStore、自动批处理与 flushSync，附受控输入延迟与 transition 副作用两则调试实录。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'react/120-FiberArchitecture'
  - 'react/060-React19NewFeatures'
  - 'react/180-ReactPerformance'
  - 'react/260-ReactSSR'
prerequisites:
  - 'react/120-FiberArchitecture'
---

## 前置知识

- [Fiber 架构](/react/120-FiberArchitecture)：知道渲染可切片、Lanes 分优先级、TransitionLane 低优先级可被打断——本篇是把这套机制用起来的 API 面；
- [状态与事件](/react/030-StateEvent)：useState 的基本用法。

## 学习目标

读完本文你将能够：

1. 用 useTransition 把一次「又急又重」的更新拆成两层，输入框不再丢字；
2. 在「自己持有输入」和「接收父组件值」两种场景里正确选择 useTransition 或 useDeferredValue；
3. 用 Suspense 划出独立加载区，并用 transition 消灭切换时的 fallback 闪烁；
4. 解释 tearing 是什么，知道外部 store 订阅为什么必须用 useSyncExternalStore；
5. 说出自动批处理覆盖哪些场合，什么时候需要 flushSync 强制同步。

预计 60 到 80 分钟。

## 1. 你现在要解决什么问题

给 FANDEX 做全站搜索页：顶部搜索框，下方结果列表（数据源是几万条文档索引），列表上方「文档 / 代码 / 题解」三个标签页，切标签要异步拉数据。上线前自测出两个卡点：

- **敲字卡**：每敲一键，几千条结果重新过滤重渲染，输入框跟不上手速，快打时丢字；
- **切页闪**：点「题解」标签，旧列表瞬间消失，白晃晃的骨架屏闪一下，再弹出新列表——来回切就像页面在眨眼。

两个卡点的根因相同：React 把「输入」和「重结果」当成**同等紧急**的一件事一口气做。而事实是它们根本不同级——输入必须立刻反馈，结果晚半秒没人计较。并发渲染（Concurrent Rendering）就是给更新分级的 API 面：**你告诉 React 哪些更新可以慢，它就用 120 篇讲的调度机制让它们真的能被插队、被打断。**

## 2. 最小可运行示例：一次更新拆成两层

先解决敲字卡。核心一行：把过滤结果的更新包进 `startTransition`。

```jsx
import { useState, useTransition, useMemo } from 'react';

function SearchPage({ docs }) {
  const [isPending, startTransition] = useTransition();
  const [input, setInput] = useState('');       // 紧急层：输入框自己的值
  const [query, setQuery] = useState('');       // 非紧急层：驱动过滤的值

  function handleChange(e) {
    setInput(e.target.value);                   // 不包装：立即上屏，绝不丢字
    startTransition(() => {
      setQuery(e.target.value);                 // 包装：低优先级，可被打断
    });
  }

  const results = useMemo(
    () => docs.filter((d) => d.title.includes(query)),
    [docs, query]
  );

  return (
    <div>
      <input value={input} onChange={handleChange} />
      <ul style={{ opacity: isPending ? 0.6 : 1 }}>
        {results.map((d) => <li key={d.id}>{d.title}</li>)}
      </ul>
    </div>
  );
}
```

预期行为：狂敲键盘每个字立刻上屏；结果列表短暂变淡（isPending），随后更新为过滤结果。两个 state 是这套模式的关键——**input 管输入框（急），query 管列表（缓）**，一个事件里一次 setState 直写、一次包 transition，就完成了分级。

发生了什么：`setQuery` 的更新被标进 TransitionLane（120 篇的车道表），渲染切片间隙你继续敲键，React 丢掉半成品列表渲染、先处理输入，敲完了再从头算列表。旧列表在过渡期间**留在屏幕上**，只是淡一点——不是骨架屏，是上一帧的真实内容。

`isPending` 的约定用法是视觉提示（透明度、角标），**不要拿它卸载或替换旧内容**——那就退化回骨架屏闪烁了。

## 3. useDeferredValue：收不到事件时的等价物

2 节的写法有个前提：过滤参数在**本组件**的 onChange 里。如果搜索框是父组件传下来的 prop，你根本碰不到事件，怎么拆？

```jsx
import { useState, useDeferredValue, useMemo } from 'react';

function ResultList({ query, docs }) {
  const deferredQuery = useDeferredValue(query); // 延迟副本
  const results = useMemo(
    () => docs.filter((d) => d.title.includes(deferredQuery)),
    [docs, deferredQuery]
  );
  const isStale = query !== deferredQuery;       // 滞后检测

  return (
    <ul style={{ opacity: isStale ? 0.6 : 1 }}>
      {results.map((d) => <li key={d.id}>{d.title}</li>)}
    </ul>
  );
}
```

`useDeferredValue(query)` 返回一个「慢半拍」的值：query 一变，React 先用**旧 deferred 值渲染一帧**（列表瞬间返回旧结果，输入框不等它），再在低优先级里用新值重渲染。`isStale` 就是这套内置延迟暴露出来的状态，淡显旧内容和 2 节的 isPending 效果一致。

选型规则一句话：**值在自己手里就 useTransition，值是 prop 就 useDeferredValue。** 两者底层是同一条 TransitionLane，效果几乎等价；deferred 版少一个 state，transition 版还能顺手拿到 isPending。

## 4. Suspense：数据没到，让这一块先「挂起」

再解决切页闪。标签内容是异步数据，React 19 时代的读法是：组件直接读数据源，数据没就绪就往**最近的 Suspense 边界**抛一个 Promise，边界显示 fallback；Promise 结算后 React 恢复渲染，展示真身。

```jsx
import { Suspense, useState, useTransition } from 'react';

function SolutionList({ tab }) {
  const data = use(fetchSolutions(tab));   // use() 读 Promise；未就绪则挂起
  return <ul>{data.map((s) => <li key={s.id}>{s.title}</li>)}</ul>;
}

function SearchPage() {
  const [tab, setTab] = useState('docs');
  const [isPending, startTransition] = useTransition();

  return (
    <div>
      <nav>
        {['docs', 'code', 'solutions'].map((t) => (
          <button key={t} onClick={() => startTransition(() => setTab(t))}>
            {t}
          </button>
        ))}
      </nav>
      <Suspense fallback={<ListSkeleton />}>
        <SolutionList tab={tab} />
      </Suspense>
    </div>
  );
}
```

预期行为：点「题解」，旧列表**停留原地**（不闪骨架），数据就绪后一次性换新。关键正是 `startTransition` 包住 setTab：transition 里发生的挂起，React 选择**继续显示旧内容**而不是跳 fallback——fallback 只在「首次挂载且非 transition」时出现。这一行就是「切页闪」的解药。

边界划分按内容块来，各块独立挂起互不拖累：

```jsx
<section>
  <Suspense fallback={<ProfileSkeleton />}><UserProfile /></Suspense>
</section>
<section>
  <Suspense fallback={<ChartSkeleton />}><AnalyticsChart /></Suspense>
</section>
```

fallback 本身要轻：它是加载路径上的额外渲染成本，放个几十行动画就违背了初衷。挂起抛 Promise、边界接 Promise 的完整机制在 120 篇 Suspense 一节埋过线，数据层用法（use、缓存、竞态）在 070 篇。

## 5. 修改实验

实验一：把 2 节的 `useMemo` 过滤换成 5000 条数据和重计算（循环里再套循环），对比包装前后的敲字体验，用 DevTools Performance 面板看 transition 更新如何被输入切片打断。

实验二：把 4 节里 setTab 的 `startTransition` 壳去掉再切标签，观察骨架屏闪烁回归；再加回来验证消失。体会「防闪」这一行代码的分量。

实验三：给 3 节的列表加「新数据就绪」角标：isStale 为 true 时右上角显示小圆点，false 时隐藏——不卸载内容，只做提示。

## 6. 常见错误与调试实录

**错误一：把受控输入的值交给 deferred。** 有人嫌输入卡，直接 `const v = useDeferredValue(value)` 然后把 v 绑回 input：

```jsx
<input value={deferredInput} onChange={(e) => setInput(e.target.value)} />
```

现象：快打时输入框内容明显滞后、删字迟钝——deferred 的使命是让**重结果**慢，不是让输入慢；输入框必须绑紧急值。修正：回到 2 节的双 state 模式，deferred 只喂给过滤计算。同理，路由跳转这类用户一眼确认的操作也别包 transition——它不觉得那是「可以等」的事。

**错误二：transition 回调里做副作用。** `startTransition(() => { setTab(t); log('切到' + t); })`——回调可能被打断**重跑多次**（120 篇 Render 纪律的镜像），日志重复上报，严格模式下更明显。修正：transition 回调里只放状态更新；副作用放事件处理器本体或 effect 里。另外 transition 更新只是「可打断」，**不改变最终结果**——数据该是多少还是多少，变的只是时机。

**错误三：fallback 里的循环请求。** Suspense 边界里放了一个每次渲染都重新发起请求的组件，fallback 和内容来回横跳。定位：Network 面板同请求连发；修正：请求要有缓存/幂等（070 篇的数据获取层），Suspense 只负责「等待」不负责「去拿」。

## 7. 实际项目中的使用场景

**外部 store 订阅与 tearing。** 并发渲染把一次更新切成多片，中途可能插入高优先级更新——如果你用 `window.addEventListener` 手写订阅外部数据源，切片前后读到的快照可能不一致，页面上半部分显示状态 A、下半部分显示状态 B，这就是 **tearing（撕裂）**。React 的对策是专用 Hook：

```jsx
import { useSyncExternalStore } from 'react';

const width = useSyncExternalStore(
  (cb) => {
    window.addEventListener('resize', cb);
    return () => window.removeEventListener('resize', cb);
  },
  () => window.innerWidth,   // getSnapshot
  () => 1024                 // getServerSnapshot（SSR 用，返回确定值）
);
```

React 通过它保证整个渲染期间读到同一份快照。凡是 Redux/Zustand 这类库的 React 绑定，底层都是它；自己写订阅也必须走它，不能用 useEffect + setState 凑合。

**自动批处理与 flushSync。** React 18 起批处理全自动：事件处理器、Promise 回调、setTimeout 里的多次 setState 都合并成一次渲染，不用再想「会不会多次 render」。极少数场合需要绕过——比如在 setState 后立刻读取已更新的 DOM 布局：

```jsx
import { flushSync } from 'react-dom';

flushSync(() => setSubmitted(true));  // 立即同步完成一次渲染 + 提交
formRef.current.querySelector('input').focus(); // 能拿到刚更新的 DOM
```

flushSync 是同步冲刺，等于把一整段 Commit（120 篇）当场做完，高频调用反而制造卡顿，只用在「必须先落 DOM 再继续」的缝隙里。

**Activity 与双状态标签页。** React 19.2 的 `<Activity mode="hidden">` 把组件藏起来但不销毁：state 保留、effect 卸载。适合「切走再切回、状态和滚动位置都在」的重内容标签页，比手动 KeepAlive 干净。

**乐观更新与 Actions。** 点赞先变红、请求失败再回滚，这类模式 React 19 用 useOptimistic 一等公民化（060 篇有完整实战）；`startTransition(async () => ...)` 的异步形态就是 Actions 的入口，自动管理 pending 与错误，420 篇细讲。多个 Suspense 的揭示顺序控制（SuspenseList）仍属实验性 API，生产代码先别依赖。

## 8. 小练习

预测题（3 分钟）：2 节里如果把 `setInput` 也包进 startTransition，快打时会发生什么？（输入更新降为可打断，敲键期间渲染反复被下一次敲键打断重启，输入框明显滞后丢字——「紧急」判断错了。）

修改题（10 分钟）：给 2 节加一个「共 N 条结果」计数器，要求计数在过渡期间保持旧值、过渡结束更新。验收：敲字时角标数字不闪烁跳变。

修 Bug 题（15 分钟）：下面的代码切标签时依然闪骨架屏，且快切三个标签时上报日志出现两条。找两处问题并修复：

```jsx
function switchTab(next) {
  setTab(next);
  reportAnalytics('switch', next);
  startTransition(() => setTab(next)); // 第二次设置，试图「补救」闪烁
}
```

（第一处：副作用 reportAnalytics 在渲染路径外没问题，但包在 transition 里重跑会重复——移出；第二处：第一次裸 setTab 不受 transition 保护，直接引发 fallback 闪烁——删掉裸调用，只留 startTransition 一层。）

挑战题（30 分钟）：把 2 节搜索页改成 useDeferredValue 版本（搜索框上移到父组件），保持淡显与体验完全一致；再写 100 字说明两种写法各自的适用边界。

## 9. 与之前和之后的知识的关系

- 往前：120 篇给了机制（切片、车道、丢树重来），本篇是它的 API 消费面；070 篇的数据获取层是 Suspense 挂起的前提；
- 往后：[React 性能优化](/react/180-ReactPerformance) 把 transition 放进完整优化工具箱；[React 服务端渲染](/react/260-ReactSSR) 讲流式 SSR 与选择性水合——Suspense 边界在服务端同样决定「哪块先到」；[Server 和 Client 组件](/react/400-ServerClientComponents) 是另一种「等待」的归宿。

## 10. 官方文档

- useTransition：https://zh-hans.react.dev/reference/react/useTransition
- useDeferredValue：https://zh-hans.react.dev/reference/react/useDeferredValue
- Suspense：https://zh-hans.react.dev/reference/react/Suspense
- useSyncExternalStore：https://zh-hans.react.dev/reference/react/useSyncExternalStore

## 11. 自我检查

- 能复述「双 state 拆层」模式并说出 input 与 query 各自的职责；
- 能说出 useTransition 与 useDeferredValue 的选型规则，并各写一个最小例子；
- 能解释 transition 为什么能防 fallback 闪烁（挂起时保留旧内容）；
- 能向同事解释 tearing 的一句话版本，并说出 useSyncExternalStore 三个参数各是什么；
- 能说出 flushSync 的唯一适用场景与滥用代价。

## 速查（承接自 Hooks 深入速查段）

**useTransition 过渡更新**

```tsx
const [isPending, startTransition] = useTransition();

const handleTab = (tab: string) => {
  startTransition(() => {
    setActiveTab(tab); // 标记为可打断的低优先级更新
  });
};
```

**useDeferredValue 延迟值**

```tsx
const deferredQuery = useDeferredValue(query);
const filtered = useMemo(() => filter(deferredQuery), [deferredQuery]);
```

## 本章总结

并发渲染的 API 面只有几件武器，共同点是「给更新分级」：useTransition 把自己持有的重更新标成可打断（isPending 淡显旧内容），useDeferredValue 是 prop 场景的等价物（isStale 检测滞后），Suspense 用抛 Promise 划出独立等待区且 transition 内挂起不闪 fallback。配套纪律：受控输入永远绑紧急值，transition 回调只放 setState。外部数据订阅必须 useSyncExternalStore 防 tearing；批处理全自动，flushSync 只在「先落 DOM 再继续」的缝隙用；Activity 保留隐藏组件的状态；乐观更新交给 useOptimistic 与 Actions。

## 下一步

进入 [Hooks 原理](/react/150-HooksPrinciple)：这些 API 全是函数调用，没有实例——状态到底存在哪？拆开 Fiber 节点上的 memoizedState 链表，看看 useState 的真身。
