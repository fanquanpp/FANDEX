---
order: 5
tags:
  - react
difficulty: intermediate
title: Context与全局状态
module: react
category: React
description: 'Context API、Provider 模式、useContext 优化、状态管理方案对比与状态机。'
author: fanquanpp
updated: '2026-06-14'
related:
  - react/状态与事件
  - react/Hooks深入
  - react/React19新特性
  - react/路由与数据获取
prerequisites: []
---

## 1. Context API

Context 提供了一种在组件树中共享数据的方式，无需逐层传递 Props。

### 1.1 创建与使用

```tsx
import { createContext, useContext, useState, type ReactNode } from 'react';

// 1. 创建 Context（提供默认值）
interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// 2. 创建 Provider 组件
function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

// 3. 创建自定义 Hook 消费 Context
function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme 必须在 ThemeProvider 内使用');
  }
  return context;
}

// 4. 在组件中使用
function ThemedButton() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      style={{
        background: theme === 'light' ? '#fff' : '#333',
        color: theme === 'light' ? '#333' : '#fff',
      }}
    >
      当前主题：{theme}
    </button>
  );
}

// 5. 在应用顶层包裹 Provider
function App() {
  return (
    <ThemeProvider>
      <ThemedButton />
    </ThemeProvider>
  );
}
```

### 1.2 多个 Context 组合

```tsx
function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <LocaleProvider>{children}</LocaleProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

// 使用
function App() {
  return (
    <AppProviders>
      <Router />
    </AppProviders>
  );
}
```

### 1.3 Context 拆分模式

当 Context 值频繁变化时，将状态和 dispatch 拆分为两个 Context，避免不必要的重渲染：

```tsx
interface State {
  user: User | null;
  loading: boolean;
}

type Action = { type: 'SET_USER'; payload: User } | { type: 'SET_LOADING'; payload: boolean };

const StateContext = createContext<State>({ user: null, loading: false });
const DispatchContext = createContext<React.Dispatch<Action>>(() => {});

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    default:
      return state;
  }
}

function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { user: null, loading: false });

  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
    </StateContext.Provider>
  );
}

// 只需要 dispatch 的组件不会因 state 变化而重渲染
function LogoutButton() {
  const dispatch = useContext(DispatchContext);
  return <button onClick={() => dispatch({ type: 'SET_USER', payload: null! })}>退出</button>;
}
```

## 2. Provider 模式

### 2.1 工厂模式创建 Context

```tsx
function createContextWithHook<T>(defaultValue: T) {
  const Context = createContext<T | undefined>(undefined);

  function useContextValue() {
    const context = useContext(Context);
    if (context === undefined) {
      throw new Error('Context 必须在对应的 Provider 内使用');
    }
    return context;
  }

  return { Context, useContextValue };
}

// 使用
const { Context: AuthContext, useContextValue: useAuth } = createContextWithHook<AuthState>();

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // ...
  return <AuthContext.Provider value={{ user, setUser }}>{children}</AuthContext.Provider>;
}
```

### 2.2 带缓存的 Provider

```tsx
function UserProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<Map<string, User>>(new Map());

  const getUser = useCallback(
    (id: string) => {
      if (users.has(id)) return users.get(id)!;
      // 懒加载
      return fetchUser(id).then((user) => {
        setUsers((prev) => new Map(prev).set(id, user));
        return user;
      });
    },
    [users]
  );

  const value = useMemo(() => ({ users, getUser }), [users, getUser]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
```

## 3. useContext 优化

### 3.1 问题：Context 值变化导致所有消费者重渲染

```tsx
// 当 value 中任何字段变化时，所有消费者都会重渲染
<ThemeContext.Provider value={{ theme, toggleTheme, fontSize, locale }}>
  <Header /> {/* 只用 theme */}
  <Sidebar /> {/* 只用 locale */}
  <Content /> {/* 只用 fontSize */}
</ThemeContext.Provider>
```

### 3.2 优化方案

**方案一：拆分 Context**

```tsx
<ThemeProvider>
  <LocaleProvider>
    <FontSizeProvider>{children}</FontSizeProvider>
  </LocaleProvider>
</ThemeProvider>
```

**方案二：使用 selector 模式**

```tsx
function useContextSelector<T, R>(context: React.Context<T>, selector: (value: T) => R): R {
  const value = useContext(context);
  return useMemo(() => selector(value), [value, selector]);
}

// 使用 — 仅在 theme 变化时重渲染
function Header() {
  const theme = useContextSelector(ThemeContext, (v) => v.theme);
  return <header className={theme}>...</header>;
}
```

**方案三：使用 Zustand 等外部状态库**（自带 selector）

## 4. 状态管理方案对比

### 4.1 方案总览

| 方案                     | 体积   | 学习曲线 | 适用场景   | 核心理念           |
| :----------------------- | :----- | :------- | :--------- | :----------------- |
| **Context + useReducer** | 0 KB   | 低       | 小型应用   | React 内置         |
| **Zustand**              | ~1 KB  | 低       | 中大型应用 | 极简、无 Provider  |
| **Jotai**                | ~2 KB  | 低       | 原子化状态 | 原子模型、自底向上 |
| **Valtio**               | ~3 KB  | 低       | 代理式状态 | Proxy 响应式       |
| **Redux Toolkit**        | ~11 KB | 中       | 大型应用   | 单一 Store、不可变 |

### 4.2 Zustand

```tsx
import { create } from 'zustand';

interface BearState {
  bears: number;
  increase: () => void;
  reset: () => void;
}

const useBearStore = create<BearState>((set) => ({
  bears: 0,
  increase: () => set((state) => ({ bears: state.bears + 1 })),
  reset: () => set({ bears: 0 }),
}));

// 使用 — 无需 Provider
function BearCounter() {
  const bears = useBearStore((state) => state.bears); // selector 避免不必要渲染
  const increase = useBearStore((state) => state.increase);

  return (
    <div>
      <p>{bears} 只熊</p>
      <button onClick={increase}>增加</button>
    </div>
  );
}
```

Zustand 中间件：

```tsx
import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';

const useStore = create(
  devtools(
    persist(
      (set) => ({
        count: 0,
        increment: () => set((state) => ({ count: state.count + 1 })),
      }),
      { name: 'my-storage' }
    )
  )
);
```

### 4.3 Jotai

```tsx
import { atom, useAtom } from 'jotai';

// 定义原子状态
const countAtom = atom(0);
const doubleCountAtom = atom((get) => get(countAtom) * 2);

// 派生原子（可读可写）
const incrementAtom = atom(null, (get, set) => {
  set(countAtom, get(countAtom) + 1);
});

function Counter() {
  const [count] = useAtom(countAtom);
  const [double] = useAtom(doubleCountAtom);
  const [, increment] = useAtom(incrementAtom);

  return (
    <div>
      <p>
        {count} × 2 = {double}
      </p>
      <button onClick={increment}>+1</button>
    </div>
  );
}
```

### 4.4 Redux Toolkit

```tsx
import { createSlice, configureStore } from '@reduxjs/toolkit';
import { Provider, useSelector, useDispatch } from 'react-redux';

// Slice
const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    increment: (state) => {
      state.value += 1;
    },
    decrement: (state) => {
      state.value -= 1;
    },
    incrementByAmount: (state, action) => {
      state.value += action.payload;
    },
  },
});

const { increment, decrement, incrementByAmount } = counterSlice.actions;

// Store
const store = configureStore({
  reducer: { counter: counterSlice.reducer },
});

type RootState = ReturnType<typeof store.getState>;
type AppDispatch = typeof store.dispatch;

// 组件
function Counter() {
  const count = useSelector((state: RootState) => state.counter.value);
  const dispatch = useDispatch<AppDispatch>();

  return (
    <div>
      <p>{count}</p>
      <button onClick={() => dispatch(increment())}>+1</button>
      <button onClick={() => dispatch(decrement())}>-1</button>
    </div>
  );
}

// 应用
function App() {
  return (
    <Provider store={store}>
      <Counter />
    </Provider>
  );
}
```

### 4.5 Valtio

```tsx
import { proxy, useSnapshot } from 'valtio';

// 创建代理状态
const state = proxy({
  count: 0,
  text: 'hello',
});

function Counter() {
  // useSnapshot 创建不可变快照，自动追踪访问的属性
  const snap = useSnapshot(state);

  return (
    <div>
      <p>{snap.count}</p>
      <button onClick={() => state.count++}>+1</button>
    </div>
  );
}
```

## 5. 状态机

### 5.1 为什么需要状态机

复杂交互往往涉及多个互斥状态，用布尔值组合容易产生无效状态：

```tsx
//  布尔值组合 — 可能出现无效状态
const [isLoading, setIsLoading] = useState(false);
const [isError, setIsError] = useState(false);
const [isSuccess, setIsSuccess] = useState(false);
// isLoading && isError 同时为 true 是无效状态

//  状态机 — 每个时刻只有一个状态
type Status = 'idle' | 'loading' | 'success' | 'error';
const [status, setStatus] = useState<Status>('idle');
```

### 5.2 使用 XState

```tsx
import { setup, assign } from 'xstate';
import { useMachine } from '@xstate/react';

const toggleMachine = setup({
  types: {
    context: {} as { count: number },
    events: {} as { type: 'TOGGLE' } | { type: 'RESET' },
  },
  actions: {
    incrementCount: assign({ count: ({ context }) => context.count + 1 }),
    resetCount: assign({ count: 0 }),
  },
}).createMachine({
  id: 'toggle',
  initial: 'inactive',
  context: { count: 0 },
  states: {
    inactive: {
      on: { TOGGLE: { target: 'active', actions: 'incrementCount' } },
    },
    active: {
      on: { TOGGLE: { target: 'inactive' }, RESET: { target: 'inactive', actions: 'resetCount' } },
    },
  },
});

function Toggle() {
  const [state, send] = useMachine(toggleMachine);

  return (
    <div>
      <p>
        状态：{state.value}，切换次数：{state.context.count}
      </p>
      <button onClick={() => send({ type: 'TOGGLE' })}>切换</button>
      <button onClick={() => send({ type: 'RESET' })}>重置</button>
    </div>
  );
}
```

## 6. 选型建议

| 项目规模   | 推荐方案           | 理由                          |
| :--------- | :----------------- | :---------------------------- |
| 小型项目   | Context + useState | 无额外依赖，够用              |
| 中型项目   | Zustand            | 轻量、API 简洁、自带 selector |
| 复杂交互   | Jotai + XState     | 原子化状态 + 状态机           |
| 大型团队   | Redux Toolkit      | 规范化、中间件生态丰富        |
| 需要代理式 | Valtio             | 类 Vue 的响应式体验           |
