---
order: 90
title: Context 与全局状态
module: 'react'
category: 前端技术
difficulty: intermediate
description: Context API、Provider 模式、useContext 优化与状态机；第三方状态管理库的横向对比与选型见状态管理方案对比篇。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'react/030-StateEvent'
  - 'react/040-HooksDeep'
  - 'react/060-React19NewFeatures'
  - 'react/070-ReactRouterRouting'
  - 'react/170-StateManagementSolutionComparison'
prerequisites: []
---

## 前置知识

- [Hooks 深入](/react/040-HooksDeep)：建议先完成前一篇的学习

## 学习目标

- 掌握「1. Context API」的核心机制、典型用法与常见陷阱
- 掌握「2. Provider 模式」的核心机制、典型用法与常见陷阱
- 掌握「3. useContext 优化」的核心机制、典型用法与常见陷阱
- 掌握「4. 状态机」的核心机制、典型用法与常见陷阱


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

> 归并说明：第三方状态管理库（Zustand、Jotai、Redux Toolkit、Valtio）的机制差异、渲染性能与选型决策已收归专篇——见[状态管理方案对比](/react/170-StateManagementSolutionComparison)。本篇聚焦 Context 本身：它是依赖注入而非订阅系统，只适合低频全局值；高频共享状态何时该换库、换哪个库，读那一篇。

## 4. 状态机

### 4.1 为什么需要状态机

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

### 4.2 使用 XState

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

## 教学自检（遮住代码先作答）

按遮码自检法：先遮住每题的代码与答案，自己写或说出结论，再对照。全对才算过本篇。

1. **预测题**：`<ThemeContext.Provider value={{ mode: 'dark' }}>` ——value 直接内联对象字面量，消费组件会怎样？
   答案：每次 Provider 渲染 value 都是新引用，所有消费该 Context 的组件跟着重渲染，与子组件是否用到具体字段无关。解法是 useMemo 包 value 或把 value 提升出渲染体。
2. **修 Bug 题**：组件里 `const theme = useContext(ThemeContext)` 永远拿到初始值 `'light'`，界面上层明明换了 Provider，为什么？
   答案：useContext 认的是「组件树上离得最近的 Provider」——该组件渲染在 Provider 之外（或 Provider 与消费者之间隔了一个另建 Context 的文件/双包实例）。检查组件位置与 Context 对象是否同一来源。
3. **辨析题**：Context 与 Zustand 这类外部 store，通知粒度的本质差别是什么？各适合什么频率的更新？
   答案：Context 是依赖注入，value 一变全量通知所有消费者（拿什么字段都得重渲染）；store + `useSyncExternalStore` + selector 只通知「选中的切片变了」的组件。一年改几次的低频全局值（主题、语言、当前用户）用 Context，一秒改几次的高频状态用 store（详见 170 篇）。
4. **预测题**：用两个布尔值 `isLoading`/`isError` 组合表达请求状态，为什么会出现渲染不出来的「无效状态」？换成 `'idle' | 'loading' | 'success' | 'error'` 单一状态后为什么不会？
   答案：布尔组合的状态空间是 2 的 n 次方个，其中若干个组合（同时 loading 与 error）没有合法含义却可达；单一状态变量的取值空间里每个值都有意义，非法转移在类型与写法上直接不存在——这就是状态机思想的入口（XState 是它的工业形态）。

## 速查

**Consumer 渲染属性写法**

`<Context.Consumer>{(value) => node}</Context.Consumer>`

```tsx
<ThemeContext.Consumer>
  {(theme) => <div className={theme}>...</div>}
</ThemeContext.Consumer>
```

**displayName 调试名**

`<Context>.displayName = <name>;`

```tsx
const ThemeContext = createContext<Theme>('light');
ThemeContext.displayName = 'ThemeContext';
```

**Context 类型签名**

`type <Ctx> = React.Context<T>;` / `React.ProviderProps<T>`

```tsx
type ThemeCtx = React.Context<Theme>;
const ctx: ThemeCtx = ThemeContext;

function Provider({ value, children }: React.ProviderProps<Theme>) {
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
```

> createContext、Provider、useContext、useReducer 与 Context 组合的完整示例见上文第 1-3 节；Zustand、Jotai、Redux Toolkit、Valtio 等外部方案的速查与选型见[状态管理方案对比](/react/170-StateManagementSolutionComparison)。
