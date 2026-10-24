---
order: 50
title: Hooks 深入
module: 'react'
category: 前端技术
difficulty: intermediate
description: useMemo、useCallback、useContext、useState、自定义 Hook、Hooks 规则与常见陷阱；useEffect 与 useRef 已拆为专篇。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'react/020-ComponentProps'
  - 'react/030-StateEvent'
  - 'react/050-ContextGlobalState'
  - 'react/060-React19NewFeatures'
  - 'react/042-UseReducerAndStateLogic'
  - 'react/044-EffectsLifecycleBestPractice'
  - 'react/046-RefsAndImperativeHandle'
prerequisites: []
---

## 前置知识

- [状态与事件](/react/030-StateEvent)：建议先完成前一篇的学习

## 学习目标

- 掌握「1. useMemo」的核心机制、典型用法与常见陷阱
- 掌握「2. useCallback」的核心机制、典型用法与常见陷阱
- 掌握「3. useContext」的核心机制、典型用法与常见陷阱
- 掌握「4. 自定义 Hook」的核心机制、典型用法与常见陷阱


## 入口：拆分出去的三篇

副作用（Effect）与引用（Ref）是两条独立的逃生舱，各自成篇：

- **useEffect / useLayoutEffect**：依赖数组语义、清理函数时序、useEffectEvent 与官方「你可能不需要 Effect」反模式判例，见 [Effect 生命周期与「你可能不需要 Effect」](/react/044-EffectsLifecycleBestPractice)；
- **useRef / useImperativeHandle**：ref 与 state 的选择、ref 回调、ref 即 prop（React 19），见 [Refs 与命令式逃生舱](/react/046-RefsAndImperativeHandle)；
- **useReducer 与状态逻辑抽取**：reducer 三件套、action 语义化与 reducer + Context 组合，见 [useReducer 与状态逻辑抽取](/react/042-UseReducerAndStateLogic)。

本篇保留与「渲染期计算」和「逻辑复用」直接相关的 Hook：useMemo、useCallback、useContext、自定义 Hook 与 Hooks 规则。

## 1. useMemo

`useMemo` 缓存计算结果，仅在依赖变化时重新计算。

### 1.1 基本用法

```tsx
import { useMemo } from 'react';

function ExpensiveList({ items, filter }: { items: Item[]; filter: string }) {
  // 仅在 items 或 filter 变化时重新计算
  const filteredItems = useMemo(() => {
    console.log('重新过滤');
    return items.filter((item) => item.name.includes(filter));
  }, [items, filter]);

  return (
    <ul>
      {filteredItems.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}
```

### 1.2 何时使用 useMemo

```tsx
//  场景一：昂贵计算
const sortedData = useMemo(() => {
  return [...data].sort((a, b) => a.name.localeCompare(b.name));
}, [data]);

//  场景二：引用相等性（作为其他 Hook 的依赖或传给 memo 组件）
const options = useMemo(() => ({ pageSize: 10, sortBy: 'name' }), []);

//  场景三：创建对象/数组避免每次渲染创建新引用
const style = useMemo(() => ({ color: 'red', fontSize: 16 }), []);

//  不需要 useMemo：简单计算
const sum = a + b; // 直接计算即可

//  不需要 useMemo：原始值
const name = 'hello'; // 原始值天然引用稳定
```

## 2. useCallback

`useCallback` 缓存函数引用，仅在依赖变化时创建新函数。

### 2.1 基本用法

```tsx
import { useCallback } from 'react';

function ProductList({ products }: { products: Product[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 缓存回调函数，避免每次渲染创建新函数
  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  return (
    <div>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onSelect={handleSelect}
          isSelected={product.id === selectedId}
        />
      ))}
    </div>
  );
}

// 配合 React.memo 使用
const ProductCard = React.memo(({ product, onSelect, isSelected }: ProductCardProps) => {
  return (
    <div className={isSelected ? 'selected' : ''} onClick={() => onSelect(product.id)}>
      {product.name}
    </div>
  );
});
```

### 2.2 useCallback vs useMemo

```tsx
// useCallback — 缓存函数
const handleClick = useCallback(() => {
  setCount((c) => c + 1);
}, []);

// 等价于 useMemo — 缓存函数
const handleClick = useMemo(
  () => () => {
    setCount((c) => c + 1);
  },
  []
);
```

> **提示**：在 React 19 中，编译器（React Compiler）可以自动优化这些场景，减少手动使用 `useMemo`/`useCallback` 的需求。

## 3. useContext

`useContext` 用于消费 Context 值，详见 Context与全局状态。

```tsx
import { createContext, useContext } from 'react';

const ThemeContext = createContext<'light' | 'dark'>('light');

function ThemedButton() {
  const theme = useContext(ThemeContext);
  return <button className={`btn-${theme}`}>主题按钮</button>;
}
```

## 4. 自定义 Hook

自定义 Hook 是以 `use` 开头的函数，用于提取和复用组件逻辑。

### 4.1 命名与规范

- 函数名必须以 `use` 开头（如 `useAuth`、`useFetch`）
- 内部可以调用其他 Hook
- 遵循 Hooks 规则

### 4.2 常用自定义 Hook 示例

```tsx
// useFetch — 数据获取
function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return { data, loading, error };
}

// 使用
function UserPage({ userId }: { userId: string }) {
  const { data: user, loading, error } = useFetch<User>(`/api/users/${userId}`);

  if (loading) return <Spinner />;
  if (error) return <Error message={error.message} />;
  return <div>{user!.name}</div>;
}
```

```tsx
// useLocalStorage — 持久化状态
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    const valueToStore = value instanceof Function ? value(storedValue) : value;
    setStoredValue(valueToStore);
    window.localStorage.setItem(key, JSON.stringify(valueToStore));
  };

  return [storedValue, setValue] as const;
}
```

```tsx
// useDebounce — 防抖
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// 使用
function SearchInput() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery) {
      // 发起搜索请求
      searchAPI(debouncedQuery);
    }
  }, [debouncedQuery]);

  return <input value={query} onChange={(e) => setQuery(e.target.value)} />;
}
```

```tsx
// useToggle — 布尔切换
function useToggle(initial = false): [boolean, () => void] {
  const [value, setValue] = useState(initial);
  const toggle = useCallback(() => setValue((v) => !v), []);
  return [value, toggle];
}
```

## 5. Hooks 规则

### 5.1 两条核心规则

1. **只在顶层调用 Hook** — 不要在循环、条件或嵌套函数中调用
2. **只在 React 函数中调用 Hook** — 函数组件或自定义 Hook 中

```tsx
//  错误：在条件中调用 Hook
function BadComponent({ isLoggedIn }: { isLoggedIn: boolean }) {
  if (isLoggedIn) {
    const [user, setUser] = useState(null); // 违反规则
  }
}

//  正确：将条件放在 Hook 内部
function GoodComponent({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (isLoggedIn) {
      fetchUser().then(setUser);
    }
  }, [isLoggedIn]);
}
```

### 5.2 ESLint 规则

安装 `eslint-plugin-react-hooks` 自动检查：

```bash
npm install -D eslint-plugin-react-hooks
```

```json
{
  "plugins": ["react-hooks"],
  "rules": {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

## 6. 常见陷阱

### 6.1 闭包陷阱（Stale Closure）

```tsx
//  错误：定时器中的 count 是闭包捕获的旧值
function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      console.log(count); // 永远是 0
      setCount(count + 1); // 永远设置为 1
    }, 1000);
    return () => clearInterval(timer);
  }, []); // 空依赖，count 被闭包捕获为 0

  return <p>{count}</p>;
}

//  正确：使用函数式更新
function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCount((c) => c + 1); // 始终基于最新值
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return <p>{count}</p>;
}
```

### 6.2 无限循环

```tsx
//  错误：每次渲染都创建新对象，导致 useEffect 无限触发
useEffect(() => {
  doSomething({ name: 'test' });
}, [{ name: 'test' }]); // 每次渲染都是新对象

//  正确：提取到组件外部或使用 useMemo
const options = useMemo(() => ({ name: 'test' }), []);
useEffect(() => {
  doSomething(options);
}, [options]);
```

### 6.3 依赖遗漏

```tsx
//  错误：缺少依赖
useEffect(() => {
  fetchData(userId); // userId 变化时不会重新执行
}, []); // 缺少 userId

//  正确：添加所有依赖
useEffect(() => {
  fetchData(userId);
}, [userId]);
```

### 6.4 对象依赖比较

```tsx
//  对象引用每次都不同
const obj = { a: 1, b: 2 };
useEffect(() => {
  /* ... */
}, [obj]); // 每次渲染都执行

//  方式一：拆分为原始值依赖
useEffect(() => {
  /* ... */
}, [obj.a, obj.b]);

//  方式二：useMemo 缓存对象
const memoizedObj = useMemo(() => ({ a: 1, b: 2 }), []);
useEffect(() => {
  /* ... */
}, [memoizedObj]);
```
## useState 状态钩子

**useState**
`const [<state>, <setState>] = useState(<initialValue>);`
```tsx
const [count, setCount] = useState(0);
setCount(count + 1);
setCount(prev => prev + 1);
```

**useState 泛型**
`const [<state>, <setState>] = useState<<T>>(<initialValue>);`
```tsx
const [user, setUser] = useState<User | null>(null);
```

---

## useMemo 计算缓存

**useMemo**
`const <value> = useMemo(() => <compute>, [<deps>]);`
```tsx
const sorted = useMemo(() => list.sort(), [list]);
const total = useMemo(() => items.reduce((s, i) => s + i.price, 0), [items]);
```

---

## useCallback 函数缓存

**useCallback**
`const <handler> = useCallback((<args>) => <fn>, [<deps>]);`
```tsx
const handleClick = useCallback((id: string) => {
  select(id);
}, [select]);
```

---

## useContext 上下文钩子

**useContext**
`const <value> = useContext<<T>>(<Context>);`
```tsx
const theme = useContext(ThemeContext);
const user = useContext(UserContext) as User;
```

---

---

## 拆分说明

本文原为 Hooks 大全。useEffect 系（含 useLayoutEffect 速查）、useRef 系（含 useImperativeHandle 速查）与 useReducer 速查已分别扩为三篇专文（042/044/046）；useTransition、useDeferredValue、useId 三节速查已落位到并发篇与无障碍篇。本篇保留 useMemo、useCallback、useContext、useState 速查与自定义 Hook、规则、陷阱主题。
