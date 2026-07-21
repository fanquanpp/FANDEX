---
order: 4
tags:
  - react
difficulty: intermediate
title: Hooks深入
module: react
category: React
description: 'useEffect、useRef、useMemo、useCallback、useContext、自定义 Hook、Hooks 规则与常见陷阱。'
author: fanquanpp
updated: '2026-06-14'
related:
  - react/组件与Props
  - react/状态与事件
  - react/Context与全局状态
  - react/React19新特性
prerequisites: []
---

## 1. useEffect

`useEffect` 用于处理副作用：数据获取、DOM 操作、订阅、定时器等。

### 1.1 基本用法与生命周期

```tsx
import { useEffect, useState } from 'react';

function DataFetcher({ url }: { url: string }) {
  const [data, setData] = useState(null);

  // 每次渲染后执行
  useEffect(() => {
    fetch(url)
      .then((res) => res.json())
      .then(setData);
  }); //  无依赖数组，每次渲染都执行

  return <div>{JSON.stringify(data)}</div>;
}
```

### 1.2 依赖数组

```tsx
// 空依赖 — 仅挂载时执行（相当于 componentDidMount）
useEffect(() => {
  console.log('组件挂载');
}, []);

// 有依赖 — 依赖变化时执行
useEffect(() => {
  console.log('userId 变化：', userId);
}, [userId]);

// 无依赖 — 每次渲染后执行
useEffect(() => {
  console.log('每次渲染后执行');
});
```

### 1.3 清理函数

```tsx
function ChatRoom({ roomId }: { roomId: string }) {
  useEffect(() => {
    const connection = createConnection(roomId);
    connection.connect();

    // 清理函数：组件卸载或依赖变化前执行
    return () => {
      connection.disconnect();
    };
  }, [roomId]);

  return <div>聊天室：{roomId}</div>;
}
```

### 1.4 常见副作用模式

```tsx
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);

  // 数据获取
  useEffect(() => {
    let cancelled = false;

    async function fetchUser() {
      const response = await fetch(`/api/users/${userId}`);
      const data = await response.json();
      if (!cancelled) {
        setUser(data);
      }
    }

    fetchUser();

    return () => {
      cancelled = true; // 防止竞态条件
    };
  }, [userId]);

  // 事件监听
  useEffect(() => {
    const handleResize = () => {
      console.log('窗口大小变化');
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 定时器
  useEffect(() => {
    const timer = setInterval(() => {
      console.log('定时执行');
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return <div>{user?.name}</div>;
}
```

### 1.5 useEffect 的执行时机

React 18+ 中 `useEffect` 在**渲染提交到屏幕之后**异步执行。如果需要同步执行副作用（如测量 DOM 布局），使用 `useLayoutEffect`：

```tsx
import { useLayoutEffect, useRef } from 'react';

function Tooltip() {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    // 在浏览器绘制前同步执行，避免闪烁
    const { height } = ref.current!.getBoundingClientRect();
    ref.current!.style.top = `${-height}px`;
  }, []);

  return <div ref={ref}>提示内容</div>;
}
```

## 2. useRef

`useRef` 返回一个可变的 ref 对象，其 `.current` 属性可以持有任何值，且**变更不会触发重渲染**。

### 2.1 访问 DOM 元素

```tsx
function TextInputWithFocus() {
  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = () => {
    inputRef.current?.focus();
  };

  return (
    <div>
      <input ref={inputRef} type="text" />
      <button onClick={focusInput}>聚焦输入框</button>
    </div>
  );
}
```

### 2.2 保存可变值

```tsx
function Timer() {
  const [count, setCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCount((c) => c + 1);
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, []);

  const pause = () => clearInterval(timerRef.current);

  return (
    <div>
      <p>{count}</p>
      <button onClick={pause}>暂停</button>
    </div>
  );
}
```

### 2.3 保存前一次渲染的值

```tsx
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

// 使用
function Counter() {
  const [count, setCount] = useState(0);
  const prevCount = usePrevious(count);

  return (
    <div>
      <p>
        当前：{count}，上一次：{prevCount}
      </p>
      <button onClick={() => setCount((c) => c + 1)}>+1</button>
    </div>
  );
}
```

### 2.4 React 19 中的 ref 改进

React 19 中 `ref` 可以作为 prop 直接传递，不再需要 `forwardRef`：

```tsx
// React 18 — 需要 forwardRef
const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => (
  <input ref={ref} {...props} />
));

// React 19 — ref 作为普通 prop
function Input({ ref, ...props }: InputProps & { ref?: React.Ref<HTMLInputElement> }) {
  return <input ref={ref} {...props} />;
}
```

## 3. useMemo

`useMemo` 缓存计算结果，仅在依赖变化时重新计算。

### 3.1 基本用法

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

### 3.2 何时使用 useMemo

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

## 4. useCallback

`useCallback` 缓存函数引用，仅在依赖变化时创建新函数。

### 4.1 基本用法

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

### 4.2 useCallback vs useMemo

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

## 5. useContext

`useContext` 用于消费 Context 值，详见 [Context与全局状态](./Context与全局状态.md)。

```tsx
import { createContext, useContext } from 'react';

const ThemeContext = createContext<'light' | 'dark'>('light');

function ThemedButton() {
  const theme = useContext(ThemeContext);
  return <button className={`btn-${theme}`}>主题按钮</button>;
}
```

## 6. 自定义 Hook

自定义 Hook 是以 `use` 开头的函数，用于提取和复用组件逻辑。

### 6.1 命名与规范

- 函数名必须以 `use` 开头（如 `useAuth`、`useFetch`）
- 内部可以调用其他 Hook
- 遵循 Hooks 规则

### 6.2 常用自定义 Hook 示例

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

## 7. Hooks 规则

### 7.1 两条核心规则

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

### 7.2 ESLint 规则

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

## 8. 常见陷阱

### 8.1 闭包陷阱（Stale Closure）

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

### 8.2 无限循环

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

### 8.3 依赖遗漏

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

### 8.4 对象依赖比较

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
