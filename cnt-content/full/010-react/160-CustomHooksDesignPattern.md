---
order: 210
title: 自定义 Hooks 设计模式：把逻辑抽成可复用的函数
module: 'react'
category: 前端技术
difficulty: intermediate
description: 从给 FANDEX 前端实验室加「执行计时器、断点感知、搜索防抖」讲起：手写 useInterval 掌握稳定引用模式，总结「第二遍出现才抽、单一职责、稳定返回」的设计四问，再用 useMediaQuery 与 useDebouncedCallback 演练 SSR 安全与 cancel/flush，附 renderHook 测试与 ref 冒充 state 的调试实录。
author: fanquanpp
updated: '2026-09-29'
related:
  - 'react/150-HooksPrinciple'
  - 'react/450-CustomHooksReuseLogic'
  - 'react/170-StateManagementSolutionComparison'
  - 'react/180-ReactPerformance'
prerequisites:
  - 'react/150-HooksPrinciple'
---

## 前置知识

- [Hooks 原理](/react/150-HooksPrinciple)：知道 hook 按顺序内联进组件链表、闭包捕获的是「当次渲染的快照」——本篇的设计纪律全部由它推出；
- [自定义 Hooks 复用逻辑](/react/450-CustomHooksReuseLogic)：写过 useFetch / useDebounce / useLocalStorage 的基础版更好，没有也能跟上。

## 学习目标

读完本文你将能够：

1. 说出「什么逻辑值得抽成 Hook」的判断标准，拒绝为单一使用点的代码强造抽象；
2. 手写 useInterval 并解释 savedCallback 为什么必须存在（闭包陷阱在 Hook 设计里的正面战场）；
3. 用「元组还是对象」的规则决定 Hook 返回值形态，并用稳定引用让消费者敢做性能优化；
4. 写出 SSR 安全的 useMediaQuery 与支持 cancel / flush 的 useDebouncedCallback；
5. 用 renderHook + act 给自定义 Hook 补上 mount / update / unmount 三个场景的测试。

预计 60 到 80 分钟。

## 1. 你现在要解决什么问题

FANDEX 前端实验室最近要加三个功能：代码运行的「耗时计时器」（可暂停）、编辑区的「移动端双栏收起」（断点感知）、题库搜索的「停顿 300ms 才发请求」（防抖）。三个需求分给三个人做，交回来的代码长这样：

- 计时器：组件里 `setInterval` + `clearInterval`，暂停逻辑靠一个布尔变量硬控；
- 断点感知：`window.addEventListener('resize', ...)` 手写监听，忘了卸载，离开页面后还在跑；
- 搜索防抖：setTimeout + 全局变量存 timer id，切换页面后旧 timer 照样触发请求。

三份代码的共同点：**订阅/定时逻辑和组件生命周期缠在一起，每处都要手写一遍「注册 + 清理」**。这正是自定义 Hook 要解决的问题——Hooks 出现之前（React 16.8 前），这类逻辑复用靠 HOC（层层包裹组件）和 render props（回调嵌套），复用一个「监听窗口尺寸」要套一层组件；Hook 时代它退化成一个函数调用：`useWindowSize()`。自定义 Hook 不是新机制，就是「调用了其他 Hook 的普通函数」——状态照样内联进调用组件的链表（150 篇），但「注册与清理」这件事从此只写一次。

## 2. 设计四问：动手前先过一遍

抽 Hook 之前问四个问题，能省掉一半的坏抽象：

1. **出现第二遍了吗？** 只有一处使用的逻辑先别抽——抽象的成本（命名、参数化、文档）要靠复用次数摊还。三处计时逻辑各写第二遍时，才是抽 useInterval 的时机；
2. **它是一件事吗？** 一个 Hook 聚合一类关注点（计时、订阅、持久化），「计时器 + 上报 + 权限」混在一个 useTimerTimerReporter 里就拆开；
3. **调用方拿到什么？** 返回值形态有约定（第 4 节）；
4. **返回的东西稳定吗？** 消费者会把它放进 useMemo 依赖、传给 memo 子组件——不稳定就是给别人埋雷（第 8 节实录）。

## 3. 手写 useInterval：一个 Hook 的完整推导

先做错版本，看它怎么坏：

```jsx
function Timer() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (running) {
      const id = setInterval(() => {
        setElapsed(elapsed + 1);   // 问题在这
      }, 1000);
      return () => clearInterval(id);
    }
  }, [running]);                 // 依赖不含 elapsed

  return <p>{elapsed}s</p>;
}
```

现象：计时到 1 就停了。150 篇的结构解释：effect 闭包捕获**首次渲染**的 elapsed（值恒为 0），依赖数组只有 running，effect 永不重建——每秒执行的都是「setElapsed(0 + 1)」。这个案例的三种修法在 150 篇列过，定时器场景的标准答案是函数式更新 `setElapsed((e) => e + 1)`。

现在把它抽成通用 Hook。难点升级：回调是**调用方传进来的函数**，每次渲染都是新引用，你不能要求调用方保证稳定——所以用 ref 镜像最新回调，让定时器**永远调到最新版本**的函数，而定时器本身只在 delay 变化时重建：

```jsx
import { useEffect, useRef } from 'react';

function useInterval(callback, delay) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;   // 每次渲染后更新为最新回调
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;         // delay 传 null：暂停
    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);     // delay 变化或卸载时清理重建
  }, [delay]);
}
```

计时器需求变成三行：

```jsx
function RunTimer() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(true);

  useInterval(() => setElapsed((e) => e + 1), running ? 1000 : null);

  return (
    <div>
      <p>耗时 {elapsed}s</p>
      <button onClick={() => setRunning(!running)}>
        {running ? '暂停' : '继续'}
      </button>
    </div>
  );
}
```

预期行为：每秒 +1，点暂停立刻停，点继续从当前值续跑。`delay: number | null` 这个接口设计是 Dan Abramov 在《Making setInterval Declarative》里确立的经典——**null 表示「这个 effect 现在不存在」**，比调用方自己 if-else 包裹干净得多。savedCallback 模式（ref 存最新值）是 Hook 库的万能扳手，第 6 节还会用到两次。

## 4. 返回值约定：元组还是对象

Hook 返回值有两种形态，选择规则一句话：**值的个数少且地位对等用元组，字段多或会继续加用对象。**

```jsx
// 元组：仿 useState，解构时随意重命名
const [elapsed, setElapsed] = useState(0);

// 对象：字段多、按名取用，未来加字段不破坏解构
const { data, loading, error, refetch } = useFetch(url);
```

配合 TypeScript 的 `as const`，元组能拿到精确的只读类型：

```tsx
function useToggle(initial = false) {
  const [on, setOn] = useState(initial);
  const toggle = useCallback(() => setOn((v) => !v), []);
  return [on, toggle] as const;   // readonly [boolean, () => void]
}
```

坑点：对象返回值每次渲染都是新引用，消费者把它放进依赖就废了——稳定化手段见第 8 节实录。

## 5. useMediaQuery：SSR 安全与惰性初始化

断点感知用 resize 监听是下策（分辨率颗粒度太粗且高频触发），标准做法是 matchMedia：

```jsx
import { useEffect, useState } from 'react';

function useMediaQuery(query) {
  // 惰性初始化：函数只在 mount 时执行，SSR 下返回安全默认值
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    setMatches(mql.matches);            // query 变化时同步一次
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

// 实验室双栏布局
const isNarrow = useMediaQuery('(max-width: 768px)');
```

两个设计点都有来头：`useState(() => ...)` 惰性初始化省掉每次渲染的白算（150 篇）；`typeof window` 检查是 SSR 的生存条件——服务端没有 window，直接访问就崩。这套「外部世界状态进 React」的骨架（读初始值 + 订阅变化 + 卸载清理）和 130 篇的 useSyncExternalStore 是同构的：浏览器 API 只求「读到值」，用本节写法即可；**会被并发渲染读到、或由库管理的外部 store，必须走 useSyncExternalStore**（见第 9 节）。

## 6. useDebouncedCallback：给动作防抖，带 cancel 与 flush

搜索场景要防抖的不是「值」而是「发请求这个动作」，且工程上还需要两个控制钮：cancel（组件卸载前取消未决请求）和 flush（立即执行挂起的调用）。savedCallback 模式第三连击：

```jsx
import { useCallback, useEffect, useRef } from 'react';

function useDebouncedCallback(callback, delay) {
  const callbackRef = useRef(callback);
  const timerRef = useRef(null);
  const lastArgsRef = useRef(null);

  useEffect(() => {
    callbackRef.current = callback;    // 永远调最新回调
  }, [callback]);

  useEffect(() => () => {              // 卸载时清理定时器
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const cancel = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    lastArgsRef.current = null;
  }, []);

  const flush = useCallback(() => {    // 立即执行挂起的调用
    if (timerRef.current && lastArgsRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      callbackRef.current(...lastArgsRef.current);
      lastArgsRef.current = null;
    }
  }, []);

  const run = useCallback((...args) => {
    lastArgsRef.current = args;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      lastArgsRef.current = null;
      callbackRef.current(...args);
    }, delay);
  }, [delay]);

  return Object.assign(run, { cancel, flush });
}
```

用法与验收：

```jsx
const search = useDebouncedCallback((q) => fetchResults(q), 300);
search.cancel();   // 路由离开时挂起的搜索作废
search('fiber');   // 300ms 内连续调用只发最后一次
```

返回的函数引用稳定（只在 delay 变化时重建），可以作为 prop 传给 memo 子组件。为什么回调用 ref 镜像而不是直接进闭包？因为 run 的依赖只有 delay——若把 callback 放进依赖，父组件每次渲染传新函数都会重建 run，稳定引用就没了。

## 7. 组合：Hook 复用 Hook

自定义 Hook 之间可以自由组合，组合时遵守同一条纪律——**每个内部 Hook 都要在顶层调用**：

```jsx
function useSearch(initial = '') {
  const [keyword, setKeyword] = useState(initial);
  const debounced = useDebounce(keyword, 300);   // 450 篇的值防抖
  const query = useFetch(`/api/search?q=${debounced}`);
  return { keyword, setKeyword, ...query };
}
```

组合层只做编排，不做业务——发现自己在组合层里写 effect，通常是下层 Hook 的职责没切干净。更多组合实例（useLocalStorage 跨标签同步、useEventListener 基础版）在 [自定义 Hooks 复用逻辑](/react/450-CustomHooksReuseLogic)；useClickAway、useIntersectionObserver、useEvent 模式等进阶配方集中在 [自定义 Hook 进阶配方](/react/165-CustomHooksAdvancedRecipes)。

## 8. 常见错误与调试实录

**错误一：ref 冒充 state。** 计数按钮显示永远为 0：

```jsx
const countRef = useRef(0);
return <button onClick={() => countRef.current++}>{countRef.current}</button>;
```

三步定位：读现象——点击后数字不变、控制台无报错；验真身——ref 变化不触发渲染（150 篇：useRef 永不比较、永不调度），渲染进 JSX 的值在下次渲染前不会刷新；修正——参与渲染的数据用 useState，ref 只存「不进画布」的值（timer id、最新回调、DOM 句柄）。

**错误二：返回值不稳定，消费者的优化失效。** Hook 返回 `{ data, loading }` 字面量对象，消费者 `useMemo(() => heavy(data, info), [info])` 依赖了它——每次渲染都是新对象，memo 形同虚设。定位：React DevTools Profiler 里 heavy 反复重算；修正：Hook 内部用 `useMemo(() => ({ data, loading }), [data, loading])` 稳定返回，或者改返回元组。原则：**你发的每个引用，都假设会被别人放进依赖数组。**

**错误三：effect 依赖函数导致反复绑定。** 子组件 `useEffect(() => { window.addEventListener('click', onEvent); ... }, [onEvent])`，父组件每次渲染传新函数，监听器疯狂解绑重绑。修正二选一：父组件用 useCallback 稳定引用；或子组件内部用 savedCallback 模式（或 React 19.2 的 useEffectEvent）把 handler 摘出依赖。谁更靠近问题谁改——库作者选后者（不把稳定负担甩给用户），业务代码选前者。

## 9. 实际项目中的使用场景

- **团队 Hook 库的分层**：基础层（useToggle、usePrevious）、DOM 层（useEventListener、useMediaQuery）、数据层（useFetch、useLocalStorage）、表单层（useForm）分目录维护，ESLint 配 `react-hooks/exhaustive-deps` 的 additionalHooks 把自定义异步 Hook 也纳入依赖检查；
- **命名即纪律**：Hook 必须以 use 开头——这不只是风格，Linter 靠前缀识别并应用规则检查；
- **与全局状态的边界**：Hook 状态属于「组件树内的逻辑复用」；当状态需要跨组件树、被多处细粒度订阅时，把第 5 节骨架升级成 createStore + useSyncExternalStore 的外部 store（写法见 165 篇），方案选型对比在 [状态管理方案对比](/react/170-StateManagementSolutionComparison)；
- **React Compiler 时代**：编译器能自动给组件与 Hook 插入记忆化（[React Compiler 自动记忆化](/react/390-ReactCompilerAutoMemoization)），手写 useCallback 的频率在下降——但稳定返回值的「约定」不变，编译器优化的正是「引用稳定」这个前提。

## 10. 小练习

预测题（3 分钟）：把第 3 节 useInterval 里的 `savedCallback.current = callback` 从 effect 挪到组件体直接赋值，功能会坏吗？违反哪条纪律？（多数场合仍能用，但渲染期写 ref 属于渲染期副作用——并发重跑下写多次无害但 StrictMode 会暴露这类写法的不纯；规范做法是放 effect。）

修改题（10 分钟）：给 useInterval 加第 三个能力——立即执行一次回调（immediate 参数），验证：`useInterval(tick, 1000, { immediate: true })` 挂载瞬间先 tick 一次再进入循环。

修 Bug 题（15 分钟）：下面的 useWindowSize 在切换路由后仍在更新（DevTools 里监听器没释放），并且首次渲染时 SSR 报 `window is not defined`。两处都修：

```jsx
function useWindowSize() {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize);
  }, []);
  return size;
}
```

（漏了 removeEventListener 清理；useState 初始化直接访问 window，改惰性初始化 + typeof window 检查——第 5 节两课的正反教材。）

挑战题（30 分钟）：写 usePagination({ pageSize, initial })，返回 { page, nextPage, prevPage, canNext, canPrev, slice(items) }，要求 slice 用 useMemo 缓存、canNext/canPrev 是纯计算、全部函数引用稳定。验收：消费组件对 slice 结果的 useMemo 不因无关 state 变化而重算。

## 11. 与之前和之后的知识的关系

- 往前：150 篇的链表结构解释了「自定义 Hook 是内联」与全部顺序纪律；450 篇给了数据类 Hook 的基础配方，本篇给设计方法；
- 往后：[自定义 Hook 进阶配方](/react/165-CustomHooksAdvancedRecipes) 集中交付出本篇省略的交互类配方与 Hook 测试完整示例；[状态管理方案对比](/react/170-StateManagementSolutionComparison) 划定「什么时候不该用 Hook 而该用外部 store」；[React 性能优化](/react/180-ReactPerformance) 消费本篇的「稳定引用」成果。

## 12. 官方文档

- 用自定义 Hook 复用逻辑：https://zh-hans.react.dev/learn/reusing-logic-with-custom-hooks
- useCallback：https://zh-hans.react.dev/reference/react/useCallback
- renderHook 测试：https://testing-library.com/docs/react-testing-library/api/#renderhook
- Making setInterval Declarative（Dan Abramov）：https://overreacted.io/making-setinterval-declarative-with-react-hooks/

## 13. 自我检查

- 能说出设计四问，并对一段重复代码判断「该不该抽、抽成几个 Hook」；
- 能白板写出 useInterval 并解释 savedCallback 与 delay 为 null 的语义；
- 能用「元组 vs 对象」规则为 usePagination 选返回形态并给出理由；
- 能解释 SSR 下 Hook 为什么必须惰性初始化 + typeof window 检查；
- 拿到「ref 显示 0」「对象依赖失效」「监听器反复重绑」三个现场能各给出一套修法。

## 本章总结

自定义 Hook 是「调用了其他 Hook 的普通函数」，复用的是注册与清理的编排，状态照样内联进调用组件。设计靠四问把关：第二遍出现才抽、单一职责、返回形态有约定（少而对等用元组，多而会扩用对象）、返回引用必须稳定。savedCallback 模式是 Hook 库的万能扳手：ref 镜像最新回调，让定时器、防抖、事件绑定的 effect 依赖收敛到真正会变的参数上；SSR 安全靠惰性初始化加 typeof window。ref 永不触发渲染，别让它冒充 state。Hook 之间自由组合但共享顺序纪律。

## 下一步

进入 [自定义 Hook 进阶配方](/react/165-CustomHooksAdvancedRecipes)：useClickAway、useIntersectionObserver、useEvent 模式、createStore 外部状态，以及一套可直接抄进项目的 renderHook 测试模板。
