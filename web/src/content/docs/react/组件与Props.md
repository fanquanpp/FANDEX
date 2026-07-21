---
order: 2
tags:
  - react
difficulty: beginner
title: 组件与Props
module: react
category: React
description: '函数组件、Props 传递、children、组件组合模式、条件渲染、列表与 key、Fragment。'
author: fanquanpp
updated: '2026-06-14'
related:
  - react/概述与环境配置
  - react/状态与事件
  - react/Hooks深入
prerequisites: []
---

## 1. 函数组件

React 中组件是构建 UI 的基本单元。函数组件是现代 React 的主流写法，它是一个接收 Props 并返回 React 元素的纯函数。

### 1.1 基本定义

```tsx
// 最简函数组件
function Greeting() {
  return <h1>Hello, World!</h1>;
}

// 使用箭头函数
const Greeting = () => <h1>Hello, World!</h1>;

// 带类型注解的组件
import type { FC } from 'react';

const Greeting: FC = () => {
  return <h1>Hello, World!</h1>;
};
```

### 1.2 组件命名规范

- 组件名必须以**大写字母**开头（React 以此区分自定义组件和原生 HTML 标签）
- 文件名与组件名保持一致，使用 PascalCase
- 每个文件只导出一个主组件

```tsx
//  正确：大写开头
function UserProfile() {
  return <div>...</div>;
}

//  错误：小写开头，React 会将其视为 HTML 标签
function userProfile() {
  return <div>...</div>;
}
```

## 2. Props 传递

Props（Properties）是父组件向子组件传递数据的方式，具有**只读**特性。

### 2.1 基本 Props

```tsx
interface UserCardProps {
  name: string;
  age: number;
  email?: string; // 可选属性
}

function UserCard({ name, age, email }: UserCardProps) {
  return (
    <div className="user-card">
      <h2>{name}</h2>
      <p>年龄：{age}</p>
      {email && <p>邮箱：{email}</p>}
    </div>
  );
}

// 使用
<UserCard name="张三" age={25} email="zhangsan@example.com" />
<UserCard name="李四" age={30} /> // email 为 undefined，不会渲染
```

### 2.2 默认值

```tsx
// 方式一：解构默认值（推荐）
function Button({ text = '点击', color = 'blue' }: { text?: string; color?: string }) {
  return <button style={{ color }}>{text}</button>;
}

// 方式二：默认值属性
function Button({ text, color }: { text?: string; color?: string }) {
  return <button style={{ color: color ?? 'blue' }}>{text ?? '点击'}</button>;
}
```

### 2.3 展开传递 Props

```tsx
interface BaseInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

function Input({ value, onChange, ...rest }: BaseInputProps) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} {...rest} />;
}
```

### 2.4 传递回调函数

```tsx
interface ChildProps {
  onAction: (data: string) => void;
}

function Child({ onAction }: ChildProps) {
  return <button onClick={() => onAction('来自子组件的数据')}>触发回调</button>;
}

function Parent() {
  const handleAction = (data: string) => {
    console.log('收到：', data);
  };

  return <Child onAction={handleAction} />;
}
```

## 3. children

`children` 是 React 内置的特殊 Prop，用于在组件标签之间传递内容。

### 3.1 基本 children

```tsx
import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
}

function Card({ children }: CardProps) {
  return (
    <div className="card" style={{ padding: '16px', border: '1px solid #ddd' }}>
      {children}
    </div>
  );
}

// 使用
<Card>
  <h2>标题</h2>
  <p>内容</p>
</Card>;
```

### 3.2 多个插槽（具名插槽）

React 没有具名插槽的概念，但可以通过多个 Props 实现类似效果：

```tsx
interface LayoutProps {
  header: ReactNode;
  sidebar: ReactNode;
  children: ReactNode;
}

function Layout({ header, sidebar, children }: LayoutProps) {
  return (
    <div className="layout">
      <header>{header}</header>
      <div className="main">
        <aside>{sidebar}</aside>
        <main>{children}</main>
      </div>
    </div>
  );
}

// 使用
<Layout header={<nav>导航栏</nav>} sidebar={<div>侧边栏</div>}>
  <p>主内容区</p>
</Layout>;
```

### 3.3 children 的类型

```tsx
import type { ReactNode, ReactElement } from 'react';

// ReactNode — 最宽泛，接受任何可渲染内容
// 包括：string | number | boolean | null | undefined | ReactElement | ReactFragment | ReactPortal
interface Props1 {
  children: ReactNode;
}

// ReactElement — 仅接受 React 元素（排除原始类型）
interface Props2 {
  children: ReactElement;
}

// 函数作为 children（Render Props 模式）
interface Props3 {
  children: (data: string) => ReactNode;
}
```

## 4. 组件组合模式

### 4.1 容器与展示组件

```tsx
// 展示组件 — 只负责 UI
interface UserListProps {
  users: Array<{ id: number; name: string }>;
  onSelect: (id: number) => void;
}

function UserList({ users, onSelect }: UserListProps) {
  return (
    <ul>
      {users.map((user) => (
        <li key={user.id} onClick={() => onSelect(user.id)}>
          {user.name}
        </li>
      ))}
    </ul>
  );
}

// 容器组件 — 负责数据和逻辑
function UserListContainer() {
  const [users, setUsers] = useState<Array<{ id: number; name: string }>>([]);

  useEffect(() => {
    fetchUsers().then(setUsers);
  }, []);

  const handleSelect = (id: number) => {
    console.log('选中用户：', id);
  };

  return <UserList users={users} onSelect={handleSelect} />;
}
```

### 4.2 组合组件（Compound Components）

```tsx
import { createContext, useContext, type ReactNode } from 'react';

// 通过 Context 共享状态
interface TabsContextValue {
  activeTab: string;
  setActiveTab: (id: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tabs 组件必须在 TabsProvider 内使用');
  return ctx;
}

// 根组件
function Tabs({ defaultTab, children }: { defaultTab: string; children: ReactNode }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
}

// 子组件
function TabList({ children }: { children: ReactNode }) {
  return <div className="tab-list">{children}</div>;
}

function Tab({ id, label }: { id: string; label: string }) {
  const { activeTab, setActiveTab } = useTabsContext();
  return (
    <button className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}>
      {label}
    </button>
  );
}

function TabPanel({ id, children }: { id: string; children: ReactNode }) {
  const { activeTab } = useTabsContext();
  if (activeTab !== id) return null;
  return <div className="tab-panel">{children}</div>;
}

// 使用
<Tabs defaultTab="tab1">
  <TabList>
    <Tab id="tab1" label="标签一" />
    <Tab id="tab2" label="标签二" />
  </TabList>
  <TabPanel id="tab1">内容一</TabPanel>
  <TabPanel id="tab2">内容二</TabPanel>
</Tabs>;
```

### 4.3 Render Props 模式

```tsx
interface DataFetcherProps<T> {
  url: string;
  render: (data: T | null, loading: boolean, error: Error | null) => ReactNode;
}

function DataFetcher<T>({ url, render }: DataFetcherProps<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetch(url)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  }, [url]);

  return <>{render(data, loading, error)}</>;
}

// 使用
<DataFetcher<Array<User>>
  url="/api/users"
  render={(data, loading, error) => {
    if (loading) return <Spinner />;
    if (error) return <Error message={error.message} />;
    return <UserList users={data!} />;
  }}
/>;
```

## 5. 条件渲染

### 5.1 常见模式

```tsx
// if/else
function Content({ isLoggedIn }: { isLoggedIn: boolean }) {
  if (isLoggedIn) {
    return <Dashboard />;
  }
  return <LoginPage />;
}

// 三元表达式 — 适合简单的二选一
const element = isLoading ? <Spinner /> : <Content />;

// 逻辑与 (&&) — 适合显示/隐藏
const element = (
  <div>
    {hasError && <ErrorMessage />}
    {data && <DataView data={data} />}
  </div>
);

// 立即执行函数（IIFE）— 适合复杂逻辑
const element = (
  <div>
    {(() => {
      switch (status) {
        case 'loading':
          return <Spinner />;
        case 'error':
          return <Error />;
        case 'success':
          return <DataView />;
        default:
          return null;
      }
    })()}
  </div>
);
```

### 5.2 提取为子组件

```tsx
// 推荐做法：将条件渲染逻辑封装为独立组件
function Show({ when, children }: { when: boolean; children: ReactNode }) {
  return when ? <>{children}</> : null;
}

// 使用
<Show when={isLoggedIn}>
  <Dashboard />
</Show>;
```

## 6. 列表与 key

### 6.1 基本列表渲染

```tsx
interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

function TodoList({ todos }: { todos: Todo[] }) {
  return (
    <ul>
      {todos.map((todo) => (
        <li key={todo.id} className={todo.completed ? 'done' : ''}>
          {todo.text}
        </li>
      ))}
    </ul>
  );
}
```

### 6.2 key 的规则

| 规则               | 说明                                 |
| :----------------- | :----------------------------------- |
| **必须唯一**       | 同级兄弟节点之间 key 不能重复        |
| **必须稳定**       | key 不应随渲染变化（如随机数、索引） |
| **不使用索引**     | 列表增删时索引会变化，导致状态错乱   |
| **不需要全局唯一** | 只需在同级兄弟间唯一                 |

```tsx
//  错误：使用索引作为 key
{
  items.map((item, index) => <Item key={index} {...item} />);
}

//  正确：使用稳定唯一 ID
{
  items.map((item) => <Item key={item.id} {...item} />);
}
```

## 7. Fragment

Fragment 允许组件返回多个元素而不需要额外的 DOM 节点。

### 7.1 使用方式

```tsx
import { Fragment } from 'react';

// 方式一：显式 Fragment（可带 key）
function TableRows({ items }: { items: Item[] }) {
  return items.map((item) => (
    <Fragment key={item.id}>
      <td>{item.name}</td>
      <td>{item.value}</td>
    </Fragment>
  ));
}

// 方式二：短语法 <>...</>（不能带 key）
function MultipleElements() {
  return (
    <>
      <h1>标题</h1>
      <p>段落</p>
    </>
  );
}
```

### 7.2 何时使用 Fragment

- 组件需要返回多个同级元素
- 在 `<table>` 中返回多个 `<td>`
- 避免无意义的 `<div>` 包裹（减少 DOM 层级）

> **注意**：短语法 `<>...</>` 不支持 `key` 属性，在列表渲染中需要带 `key` 时必须使用 `<Fragment key={...}>`。
