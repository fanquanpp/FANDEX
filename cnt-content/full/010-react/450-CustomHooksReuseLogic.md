---
order: 450
title: 自定义 Hooks 复用逻辑
module: 'react'
category: 前端技术
difficulty: advanced
description: 高频自定义 Hook 实现与设计准则：useFetch、useDebounce、useLocalStorage、useEventListener 的可运行实现与常见陷阱。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'react/160-CustomHooksDesignPattern'
  - 'react/430-InterruptibleRendering'
  - 'react/440-ErrorBoundarySentry'
  - 'react/040-HooksDeep'
prerequisites:
  - 'react/040-HooksDeep'
---

## 1. 一句话理解

自定义 Hook 就是一个**名字以 `use` 开头、内部调用其他 Hook 的普通函数**：状态与副作用留在 Hook 里，UI 留在组件里，逻辑以"组合"而不是"继承"的方式复用。本文给出 5 个高频 Hook 的生产级实现与提取准则；系统化的模式分类见[自定义 Hooks 设计模式](/react/160-CustomHooksDesignPattern)。

## 2. useFetch：数据获取的三道必答题

一个能上生产的 `useFetch` 必须同时处理**竞态、卸载中断、错误**三件事：

```tsx
import { useEffect, useState } from 'react';

interface FetchState<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
}

export function useFetch<T>(url: string, init?: RequestInit): FetchState<T> {
  const [state, setState] = useState<FetchState<T>>({ data: null, error: null, loading: true });

  useEffect(() => {
    const controller = new AbortController();
    let alive = true; // 双保险：abort 不一定立即停止 then 链

    setState((s) => ({ ...s, loading: true }));

    fetch(url, { ...init, signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<T>;
      })
      .then((data) => {
        if (alive) setState({ data, error: null, loading: false });
      })
      .catch((err: unknown) => {
        // abort 误差不是错误，静默忽略
        if (alive && !(err instanceof DOMException && err.name === 'AbortError')) {
          setState({ data: null, error: err as Error, loading: false });
        }
      });

    return () => {
      alive = false;
      controller.abort(); // url 变化或卸载时中断旧请求
    };
  }, [url]); // init 若是对象引用需自行 useMemo，见第 8 节

  return state;
}
```

三道题的答案：

- **竞态**：`url` 快速变化时，旧请求比新请求晚回来会覆盖新数据——`abort` + `alive` 标志保证只有"最新一次 Effect"能写入状态
- **卸载中断**：清理函数里 `abort`，避免组件消失后还占用连接、触发 setState 警告
- **错误**：`!res.ok` 不抛错是 `fetch` 的设计，必须手动检查并转成 Error

> 现代替代：如果项目使用 TanStack Query/SWR，数据获取优先用它们（缓存、去重、重试都是现成的）；React 19 中 Server Component + `use()` 能让大部分"首屏数据"彻底离开客户端 Hook。`useFetch` 适合理解原理与轻量场景。

## 3. useDebounce：防抖值的原子实现

```tsx
import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer); // 值再变就重置计时器
  }, [value, delay]);

  return debounced;
}

// 用法：搜索请求跟随防抖值而非原始输入
function Search() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery) searchAPI(debouncedQuery);
  }, [debouncedQuery]);

  return <input value={query} onChange={(e) => setQuery(e.target.value)} />;
}
```

姊妹版 `useThrottle`（节流）用时间戳 + 定时器组合实现，适合滚动/resize 等连续事件。

## 4. useLocalStorage：外部存储与 React 状态的桥

```tsx
import { useCallback, useState } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  // 惰性初始化：只在首次渲染读一次存储
  const [value, setValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item !== null ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = next instanceof Function ? next(prev) : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          // 隐私模式/配额满：状态照常更新，存储失败降级
        }
        return resolved;
      });
    },
    [key]
  );

  return [value, set] as const;
}
```

要点：读取放在 `useState` 的惰性初始化里（避免每次渲染都碰存储）；写入用函数式更新（避免闭包旧值）；`try/catch` 包住两侧（JSON 损坏、隐私模式都会抛错）。跨标签页同步再加一个 `storage` 事件监听即可。

## 5. useEventListener：订阅浏览器事件的通用外壳

```tsx
import { useEffect, useRef } from 'react';

export function useEventListener<K extends keyof WindowEventMap>(
  eventName: K,
  handler: (event: WindowEventMap[K]) => void,
  target: Window | HTMLElement = window
) {
  // 用 ref 持有最新 handler：订阅只需建立一次，回调永远是最新的
  const saved = useRef(handler);
  useEffect(() => {
    saved.current = handler;
  }, [handler]);

  useEffect(() => {
    const listener = (e: Event) => saved.current(e as WindowEventMap[K]);
    target.addEventListener(eventName, listener);
    return () => target.removeEventListener(eventName, listener);
  }, [eventName, target]);
}

// 用法
function KeyLogger() {
  const [keys, setKeys] = useState<string[]>([]);
  useEventListener('keydown', (e) => setKeys((k) => [...k.slice(-9), e.key]));
  return <p>{keys.join(' ')}</p>;
}
```

这里展示了自定义 Hook 的经典手法——**用 ref 隔离"会变的回调"与"不应重建的订阅"**。React 19.2 的 `useEffectEvent` 是该手法的官方化（详见[React 19 新增 API](/react/420-React19NewAPI)）。

## 6. useToggle 与状态机味的小 Hook

```tsx
import { useCallback, useState } from 'react';

export function useToggle(initial = false) {
  const [on, setOn] = useState(initial);
  const toggle = useCallback(() => setOn((v) => !v), []);
  const setTrue = useCallback(() => setOn(true), []);
  const setFalse = useCallback(() => setOn(false), []);
  return { on, toggle, setTrue, setFalse } as const;
}
```

所有 setter 都 `useCallback` 并写函数式更新，保证它们可以被安全地传给 memo 子组件或放进依赖数组。

## 7. 设计准则

1. **命名即契约**：`use` 前缀不只是约定——ESLint 依赖检查与编译器都按它识别 Hook 边界
2. **一次专注一件事**：数据获取、防抖、存储各自独立，比"万能 useApp"更可测试
3. **返回值形态固定**：两三个相关值用元组（`[value, set]`），字段多且要扩展用对象；发布后不要改形态
4. **进依赖的东西要稳定**：接受对象/函数参数时，要么文档要求调用方 `useMemo`，要么内部用 `useRef`/序列化比较兜底
5. **清理逻辑对称**：每个订阅、定时器、AbortController 都要有对应的清理函数——并发渲染下 Effect 可能重复执行，不对称的清理会放大成真实 bug
6. **SSR 安全**：涉及 `window`/`localStorage` 的 Hook 要保证首次渲染输出与服务端一致（惰性初始化读不到时回退默认值）

## 8. 常见陷阱

```tsx
// 陷阱一：对象参数导致 Effect 每次渲染都重跑
useFetch('/api/list', { headers: { token } }); // 每次渲染都是新对象
// 修法：调用方 useMemo，或 Hook 内仅依赖 url 等原始值

// 陷阱二：Hook 内更新依赖了闭包旧值
useEffect(() => {
  const id = setInterval(() => setCount(count + 1), 1000); // count 永远是首次的值
  return () => clearInterval(id);
}, []);
// 修法：setCount((c) => c + 1)

// 陷阱三：在普通函数里调用 Hook
function formatUser(user) {
  useMemo(() => normalize(user), [user]); // 违反 Hooks 规则，直接报错
}
// 修法：把格式化做成纯函数，或把整个流程封装成 useUser(user)
```

## 9. 小结

- 自定义 Hook 的本质是"逻辑的组合单元"：状态与 Effect 封装进去，组件只消费结果
- 数据获取 Hook 必须回答竞态、中断、错误三道题；生产项目优先 TanStack Query / RSC
- ref 隔离回调 + 函数式更新 + 对称清理，是稳定自定义 Hook 的三板斧
- 命名、依赖、清理都有对应的工具护栏（eslint-plugin-react-hooks、StrictMode 双跑）——把它们开成 error 而不是靠自觉
