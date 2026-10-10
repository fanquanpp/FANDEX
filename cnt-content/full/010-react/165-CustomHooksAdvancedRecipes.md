---
order: 220
title: 自定义 Hook 进阶配方：交互订阅、外部 Store 与 Hook 测试
module: 'react'
category: 前端技术
difficulty: beginner
description: 与 160 篇配套的配方库：useClickAway 与 useIntersectionObserver 处理点击外部与视口曝光，useEvent 模式与 usePrevious 稳定引用，createStore 加 useSyncExternalStore 写最小外部状态，renderHook 与 act 组成的 Hook 测试模板，以及 Hook 库的目录、导出与 ESLint 配置。
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 前置知识

- [自定义 Hooks 设计模式](/react/160-CustomHooksDesignPattern)：savedCallback 模式、稳定返回值约定——本篇全部配方建立在这两条纪律上；
- [Concurrent 模式](/react/130-ConcurrentRendering)：tearing 与 useSyncExternalStore 的动机。

## 1. 这篇是干什么的

160 篇讲了「怎么设计」，本篇是「直接拿走」的配方集。每个配方都按同一骨架写：读初始值、订阅变化、卸载清理。它们都来自原 160 篇拆出的进阶内容，覆盖三类场景：DOM 交互类（点击外部、视口曝光）、引用稳定类（useEvent、usePrevious）、外部状态类（createStore）。

## 2. useClickAway：点外面就关

下拉菜单、抽屉、命令面板的标配。实现要点是**回调走 ref 镜像**（否则 handler 每次渲染变化都会重绑 mousedown）：

```jsx
import { useEffect, useRef } from 'react';

function useClickAway(ref, handler) {
  const saved = useRef(handler);
  useEffect(() => {
    saved.current = handler;
  }, [handler]);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) saved.current(e);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [ref]);

  return ref;
}

// 用法：把返回的 ref 挂到面板根元素上
const panelRef = useClickAway(useRef(null), () => setOpen(false));
```

坑：用 `click` 事件时，打开面板的那个按钮点击会**冒泡到 document**，刚打开就立刻关闭。修法：按钮的 onClick 里 `e.stopPropagation()`，或改监听 `mousedown`（打开动作通常由 click 触发，时序天然错开）。

## 3. useIntersectionObserver：视口曝光与懒加载

无限滚动、埋点曝光、图片懒加载都靠它。它把「元素进入视口」变成 React 状态：

```jsx
import { useEffect, useRef, useState } from 'react';

function useIntersectionObserver(options = {}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      options
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [options.root, options.rootMargin, options.threshold]);

  return [ref, visible];
}

// 用法：列表尾部哨兵，进入视口就加载下一页
const [sentinelRef, visible] = useIntersectionObserver({ threshold: 0.1 });
useEffect(() => {
  if (visible) loadMore();
}, [visible]);
```

注意依赖数组拆的是 options 的具体字段而不是 options 对象本身——调用方每次传字面量，整对象进依赖会反复 disconnect/observe。

## 4. useEvent 模式：稳定引用的「最新函数」

父组件传来的回调想绑定成事件监听，又不想每次渲染重绑。160 篇的 savedCallback 泛化成通用 Hook：

```jsx
import { useCallback, useEffect, useRef } from 'react';

function useEvent(handler) {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  });

  return useCallback((...args) => handlerRef.current(...args), []);
}
```

返回的函数引用永远稳定，内部永远调用最新 handler。React 19.2 已内置 `useEffectEvent` 承担「在 effect 里读最新值且不进依赖」的角色，语义上更专一；useEvent 模式适合的是「对外暴露稳定回调」的场景（组件 props、自定义 Hook 返回值），两者互补而不是替代。

## 5. usePrevious、useTitle、useMount / useUnmount：三件小工具

```jsx
// 上一次渲染的值：diff 展示（「从 980 涨到 1020」）的常用件
function usePrevious(value) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;   // effect 在渲染后才跑，所以返回的是「上一帧」的值
  }, [value]);
  return ref.current;
}

// 同步文档标题（React 19 也可在组件里直接 <title> 标签）
function useTitle(title) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}

// 一次性副作用：语义化包装，内部注意 savedCallback
function useMount(fn) {
  const saved = useRef(fn);
  useEffect(() => {
    saved.current = fn;
  }, [fn]);
  useEffect(() => {
    saved.current();
  }, []);
}

function useUnmount(fn) {
  const saved = useRef(fn);
  useEffect(() => {
    saved.current = fn;
  }, [fn]);
  useEffect(() => () => saved.current(), []);
}
```

usePrevious 的返回时机容易误读：渲染期间拿到的是**上一次**提交的值（本帧更新发生在 effect 阶段），这正是「previous」的语义，别在渲染体里期望它等于当前值。

## 6. createStore + useSyncExternalStore：十行写一个合规外部状态

组件树内的状态用 useState；**跨组件、跨岛屿**共享且要躲开并发 tearing（130 篇）的状态，走外部 store。最小合规实现：

```jsx
import { useSyncExternalStore } from 'react';

function createStore(initialState) {
  let state = initialState;
  const listeners = new Set();

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);   // 必须返回退订函数
    },
    getSnapshot() {
      return state;                              // 必须返回缓存对象，不能现造
    },
    setState(next) {
      state = typeof next === 'function' ? next(state) : next;
      listeners.forEach((l) => l());
    },
  };
}

const themeStore = createStore({ mode: 'light' });

function useTheme() {
  return useSyncExternalStore(
    themeStore.subscribe,
    themeStore.getSnapshot,
    () => ({ mode: 'light' })   // getServerSnapshot：SSR 必须给确定值
  );
}

// 任意组件里
const theme = useTheme();
themeStore.setState((s) => ({ mode: s.mode === 'light' ? 'dark' : 'light' }));
```

两条铁律决定它能躲开 tearing：getSnapshot 必须返回**同一引用**（对象每次现造会让 React 以为快照一直变化）；getServerSnapshot 必须与服务端渲染结果一致（否则 hydration 报 mismatch）。 Zustand 这类库就是这套骨架的工业级包装；要不要上库，看 170 篇的选型对比。

## 7. renderHook 测试模板：mount / update / unmount 三连

自定义 Hook 的测试用 @testing-library/react 的 renderHook，三个场景各一条：

```jsx
import { renderHook, act } from '@testing-library/react';
import { useToggle } from './useToggle';

test('mount：默认值与切换', () => {
  const { result } = renderHook(() => useToggle(false));
  expect(result.current[0]).toBe(false);

  act(() => result.current[1]());        // 触发更新必须包 act
  expect(result.current[0]).toBe(true);
});

test('update：rerender 换初始值不影响已切换状态', () => {
  const { result, rerender } = renderHook(({ init }) => useToggle(init), {
    initialProps: { init: false },
  });
  act(() => result.current[1]());
  rerender({ init: true });              // 初始值参数变化不应重置状态
  expect(result.current[0]).toBe(true);
});

test('unmount：清理函数执行', () => {
  const cleanup = vi.fn();
  const { unmount } = renderHook(() => useMountCleanup(cleanup));
  unmount();
  expect(cleanup).toHaveBeenCalled();
});
```

异步 Hook（useFetch 类）用 `waitFor` 等状态落地，用 `vi.fn()` / mock 替换全局 fetch。覆盖标准就三条：mount 对不对、update 不重置、unmount 有清理——对应 Hook 最常见的三类事故。

## 8. Hook 库工程化清单

- **目录分层**：core（useToggle、usePrevious）、dom（useEventListener、useMediaQuery、useClickAway）、data（useFetch、useLocalStorage）、form（useForm）分目录，方便按需引用与摇树；
- **package.json**：`"sideEffects": false` 放心摇树；exports 字段按子路径导出（`./use-fetch`），让消费者只装自己用的；
- **ESLint**：`react-hooks/rules-of-hooks` 设 error、`exhaustive-deps` 设 warn，并用 additionalHooks 把自定义异步 Hook 纳入依赖检查：

```js
// eslint.config.js 片段
rules: {
  'react-hooks/rules-of-hooks': 'error',
  'react-hooks/exhaustive-deps': ['warn', {
    additionalHooks: '(useAsync|useFetch|useLocalStorage)',
  }],
}
```

- **文档**：每个 Hook 注明参数、返回值形态（元组/对象）、触发的副作用与清理行为——调用方最需要的三件事。

## 9. 小练习

预测题（3 分钟）：useClickAway 换成监听 click 并在打开按钮上不阻止冒泡，面板打开后会立刻关闭吗？为什么？

修改题（10 分钟）：给 useIntersectionObserver 加 once 参数——首次可见后自动 disconnect，适配「懒加载一次」场景。

修 Bug 题（15 分钟）：下面 createStore 的 setState 后组件不更新，找出两处错误：

```jsx
const store = {
  state: { count: 0 },
  getSnapshot() {
    return { ...this.state };        // A
  },
  setState(next) {
    this.state = next;
  },                                  // B
};
```

（A：每次返回新对象，React 判定快照永远变了，陷入无限重渲染防护；B：改完不通知监听者。修法：getSnapshot 返回 this.state 原引用，setState 里遍历 listeners。）

挑战题（30 分钟）：用 createStore + useSyncExternalStore 实现 useCart：add(item)、remove(id)、total（派生值放 selector 里算）。验收：两个组件同时订阅，一处 add 另一处同步更新；React DevTools Profiler 里未订阅的组件不重渲染。

## 10. 官方文档

- useSyncExternalStore：https://zh-hans.react.dev/reference/react/useSyncExternalStore
- useEffectEvent：https://zh-hans.react.dev/reference/react/useEffectEvent
- IntersectionObserver（MDN）：https://developer.mozilla.org/zh-CN/docs/Web/API/IntersectionObserver
- Testing Library renderHook：https://testing-library.com/docs/react-testing-library/api/#renderhook

## 本章总结

本篇是 160 篇设计方法落地后的配方库：useClickAway 与 useIntersectionObserver 覆盖点击外部与视口曝光（注意 click 冒泡与 options 拆依赖两个坑）；useEvent 模式与 useEffectEvent 分工「对外稳定回调」与「effect 内读最新值」；usePrevious 拿的是上一帧的值。外部状态最小合规实现是 createStore 加 useSyncExternalStore，getSnapshot 返回同一引用、getServerSnapshot 给确定值，Zustand 是它的工业形态。Hook 测试三连：mount 值、update 不重置、unmount 清理；工程上分目录、sideEffects false、additionalHooks 纳入依赖检查。
