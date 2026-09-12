---
order: 210
title: React 与 TypeScript
module: 'react'
category: 前端技术
difficulty: intermediate
description: React + TypeScript 实战：Props 与事件类型、Hooks 泛型、Context 类型安全模式、React 19 类型系统变化（ref 即 prop、useRef 必传初始值、JSX 命名空间迁移）与常用类型速查。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'react/190-ReactErrorBoundary'
  - 'react/200-ReactForm'
  - 'react/220-ReactTest'
  - 'react/230-ReactRouteAdvanced'
prerequisites:
  - 'react/010-OverviewEnvSetup'
---
## 前置知识

建议先阅读以下内容再进入本文：

- [概述与环境配置](/react/010-OverviewEnvSetup)

## 1. 一句话理解

React 组件是"函数 + props 契约"，TypeScript 的作用就是把这份契约变成**编译期可检查的**：props 少传、传错、拼错字段名，写代码时就报错，而不是等到运行时白屏。心智模型很简单——把 props 当函数参数签名写，把事件处理器当 DOM 事件类型写，剩下的交给类型推断。新版 Vite 模板（`pnpm create vite@latest my-app -- --template react-ts`）开箱即含 `@types/react`，无需额外配置即可开始。

## 2. 基础配置：四个关键开关

```jsonc
// tsconfig.json 中与 React 相关的关键项
{
  "compilerOptions": {
    "jsx": "react-jsx",     // 新 JSX 转换：无需 import React
    "strict": true,         // 严格模式全家桶（null 检查、noImplicitAny 等）
    "moduleResolution": "bundler", // 打包器解析语义，Vite 项目标配
    "skipLibCheck": true    // 跳过第三方 .d.ts 内部检查，加快编译
  }
}
```

`strict: true` 是底线。React 生态的类型质量整体很高，关掉严格模式等于主动放弃 80% 的收益。

## 3. Props 类型：从 interface 到可辨识联合

```tsx
import { type ReactNode } from 'react';

interface ButtonProps {
  variant?: 'primary' | 'ghost'; // 字面量联合：拼错 'primay' 直接编译报错
  disabled?: boolean;
  children?: ReactNode;          // children 必须显式声明（FC 已不含隐式 children）
  onClick?: () => void;
}

export function Button({ variant = 'primary', disabled, children, onClick }: ButtonProps) {
  return (
    <button className={variant} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}
```

进阶利器是**可辨识联合**：用同一字段把互斥的 props 分组，调用处写错组合会被编译器指出：

```tsx
type LinkProps =
  | { kind: 'external'; href: string }            // 外链必须给 href
  | { kind: 'route'; to: string; replace?: boolean }; // 内跳必须给 to

function Nav(props: LinkProps) {
  // props.kind === 'external' 的分支里只有 href，没有 to——TS 自动收窄
  return props.kind === 'external'
    ? <a href={props.href} target="_blank">{props.href}</a>
    : <RouteLink to={props.to} replace={props.replace} />;
}
```

不想手写长 props 时，用工具类型从现有组件或 DOM 元素"抄"：`React.ComponentProps<typeof Button>`（组件）、`React.ComponentProps<'input'>`（原生元素），详见文末速查。

## 4. 事件类型：只记四个

React 事件类型统一是 `React.XxxEvent<目标元素类型>`，日常只用到四个：

```tsx
import { useState } from 'react';

export function Form() {
  const [value, setValue] = useState('');

  return (
    <form
      onSubmit={(e: React.FormEvent<HTMLFormElement>) => e.preventDefault()}
    >
      <input
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
      />
      <button onClick={(e: React.MouseEvent<HTMLButtonElement>) => e.stopPropagation()}>
        提交
      </button>
      <input onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') submit(value);
      }} />
    </form>
  );
}
```

省事技巧：内联在 JSX 上的处理器（如上）可以完全省略类型标注——`onChange` 的位置已让 TS 推断出 `e` 的类型。只有把处理器**提取成独立函数**时才必须标注。

## 5. Hooks 的类型：推断优先，显式兜底

```tsx
import { useRef, useState } from 'react';

export function Counter() {
  // useState 从初值推断出 number；setState((n) => n + 1) 也自动约束
  const [count, setCount] = useState(0);

  // 初值是 null/空对象等"不完整"值时，显式给泛型
  const [user, setUser] = useState<{ id: number; name: string } | null>(null);

  // useRef 三种形态（React 19 类型起必须传初始值）：
  const inputRef = useRef<HTMLInputElement>(null);   // 挂 DOM：初值 null
  const timerRef = useRef<number | undefined>(undefined); // 存可变量
  const countRef = useRef(0);                        // 从初值推断 RefObject<number>（19 起可写）

  return (
    <div>
      <span>{count}</span>
      <input ref={inputRef} />
      {/* user 可能为 null：strict 模式强制先收窄再使用 */}
      {user && <p>{user.name}</p>}
      <button onClick={() => setCount((n) => n + 1)}>+1</button>
    </div>
  );
}
```

React 19 类型系统的三个变化要记牢：`useRef` **必须**传一个参数（无参调用编译报错）；`useRef(initial)` 返回的 `RefObject` 的 `current` 是**可写**的（旧版 MutableRefObject 的职责并入其中，旧类型仍兼容但推荐直接用新形态）；挂 DOM 的 ref 写 `useRef<HTMLDivElement>(null)`，使用处 TS 会提示 `current` 可能为 `null`。

## 6. Context 的类型安全模式

Context 的问题是 `createContext<T>(null)` 会让消费者拿到 `T | null`，到处非空断言。标准解法是**把 Provider 和 useXxxContext 一起封装，null 检查只做一次**：

```tsx
import { createContext, useContext, useState, type ReactNode } from 'react';

interface AuthCtx {
  user: string | null;
  login: (name: string) => void;
  logout: () => void;
}

// 默认值给 null，但绝不导出这个 Context 本体
const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<string | null>(null);
  return (
    <AuthContext.Provider
      value={{ user, login: setUser, logout: () => setUser(null) }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// 对外只暴露这个 Hook：出了 Provider 范围直接抛清晰错误
export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 必须在 <AuthProvider> 内使用');
  return ctx; // 此处之后类型收窄为 AuthCtx，null 消失
}
```

预期收益：组件里写 `const { user } = useAuth()` 时没有任何 `| null` 噪音；漏包 Provider 时报错信息指名道姓，而不是莫名其妙的 `undefined` 解构崩溃。

## 7. 泛型组件：一个组件适配多种数据

列表、表格、下拉这类"结构相同、数据类型不同"的组件适合写成泛型：

```tsx
interface ListProps<T> {
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T) => React.ReactNode;
}

export function List<T>({ items, getKey, renderItem }: ListProps<T>) {
  return (
    <ul>
      {items.map((item) => (
        <li key={getKey(item)}>{renderItem(item)}</li>
      ))}
    </ul>
  );
}

// 使用处：T 自动推断为 { id: number; name: string }
<List
  items={[{ id: 1, name: '钢笔' }, { id: 2, name: '笔记本' }]}
  getKey={(item) => String(item.id)} // item 已知有 id 字段
  renderItem={(item) => item.name}
/>;
```

推断失误（比如初始 `items` 传空数组导致 `T = never`）时，用 `<List<MyItem> ... />` 显式标注即可。

## 8. React 19 类型变化清单

- **ref 即 prop**：函数组件可以直接接收 `ref`，绝大多数场景不再需要 `forwardRef`；需要操作 ref 的子组件像写普通 prop 一样声明 `ref?: React.Ref<HTMLInputElement>`。
- **useRef 必须传参**：`useRef()` 改为 `useRef(undefined)` 或带初值；错误在编译期暴露。
- **JSX 命名空间迁移**：全局 `JSX.Element` 移入 `React.JSX`，推荐统一写 `React.JSX.Element`（或干脆用 `ReactNode` 声明渲染结果）；自定义 JSX 命名空间的库需在 `declare module 'react'` 里扩展。
- **FC 不含 children**（18 起已生效）：`React.FC<Props>` 不再隐式带 `children`，需要时写 `PropsWithChildren<Props>`。

## 9. 常见陷阱

- **事件参数标成 `any` 或 DOM 原生事件**：`onChange(e: React.ChangeEvent<HTMLInputElement>)` 才对；标成原生 `Event` 会拿不到 `e.target.value` 的正确类型，标 `any` 则失去全部保护。
- **滥用 `as` 断言**：`as SomeType` 是"闭嘴指令"不是转换；接口边界（API 响应、localStorage）之外出现成片 `as` 时应改写类型或加运行时校验。
- **useState 存复杂对象后直接改字段**：`user.name = 'x'` 不会触发更新且类型不报错；用 `setUser((u) => ({ ...u, name: 'x' }))`。
- **样式对象写 CSS 属性名驼峰**：`React.CSSProperties` 只认驼峰（`backgroundColor`）；确需 CSS 变量用 `as React.CSSProperties`（见速查），确需连字符属性用 `PropertiesHyphen`。
- **给 `ReactNode` 的 prop 传布尔用于条件渲染导致结构歧义**：`{flag && <X/>}` 里 `flag` 为 0 时会渲染出 "0"——`ReactNode` 包含 number，与 TS 无关但常在 TS 项目里被忽略，条件渲染用三元或 `!!flag`。
- **第三方库类型缺失就 `any`**：优先看包是否带 `types` 字段或 `@types/*`；都没有再写最小局部声明（`declare module 'lib'`），保持项目主体强类型。

## 10. 小结

初学者要点：

- Props 用 interface 声明、字面量联合约束枚举值、`children` 用 `ReactNode`；内联事件处理器不用标类型。
- `useState` 尽量靠推断，初值不完整（null/空对象）时给显式泛型；挂 DOM 的 ref 写 `useRef<HTMLDivElement>(null)`。
- Context 封装成 `Provider + useXxxContext`，null 检查只做一次。

进阶注意：

- React 19 类型：ref 即 prop（弃用 `forwardRef`）、`useRef` 必传参、`JSX` 命名空间移到 `React.JSX`、`RefObject.current` 可变。
- 可辨识联合与泛型组件是把"能编译"提升到"类型即文档"的两件核心武器；工具类型（`ComponentProps`/`ReturnType`/`Awaited`）能从现有代码反推类型，避免重复手写。

## 速查

## ComponentProps 提取属性

**ComponentProps**
`type <Props> = React.ComponentProps<<ElementType>>;`
```tsx
type DivProps = React.ComponentProps<'div'>;
type BtnProps = React.ComponentProps<'button'>;
type CompProps = React.ComponentProps<typeof MyComponent>;
```

**ComponentPropsWithRef 含 ref**
`React.ComponentPropsWithRef<<ElementType>>`
```tsx
type InputProps = React.ComponentPropsWithRef<'input'>;
```

**ComponentPropsWithoutRef 排除 ref**
`React.ComponentPropsWithoutRef<<ElementType>>`
```tsx
type PureProps = React.ComponentPropsWithoutRef<'div'>;
```

---

## ReactNode 节点类型

**ReactNode 任意节点**
`type <V> = React.ReactNode;`
```tsx
type Props = {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
};
```

**ReactElement 单元素**
`React.ReactElement`
```tsx
const el: React.ReactElement = <div>hello</div>;
```

**ReactElement 带泛型**
`React.ReactElement<<T>>`
```tsx
const el: React.ReactElement<{ value: string }> = <Comp value="x" />;
```

---

## FC 函数组件类型

**FC 基础（18+ 不含隐式 children）**
`const <Component>: React.FC<<Props>>`
```tsx
type Props = { title: string };
const Title: React.FC<Props> = ({ title }) => <h1>{title}</h1>;
```

**FC 含 children**
`React.FC<React.PropsWithChildren<<Props>>>`
```tsx
const Card: React.FC<React.PropsWithChildren<{ title: string }>> = ({
  title,
  children,
}) => <section><h2>{title}</h2>{children}</section>;
```

---

## ChangeEvent 事件类型

**ChangeEvent 表单**
`React.ChangeEvent<<Element>>`
```tsx
const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setValue(e.target.value);
};
```

**MouseEvent 鼠标**
`React.MouseEvent<<Element>>`
```tsx
const onClick = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.preventDefault();
};
```

**KeyboardEvent 键盘**
`React.KeyboardEvent<<Element>>`
```tsx
const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === 'Enter') submit();
};
```

**FormEvent 表单提交**
`React.FormEvent<<FormElement>>`
```tsx
const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
};
```

**EventHandler 处理器类型**
```tsx
type Change = React.ChangeEventHandler<HTMLInputElement>;
type Click = React.MouseEventHandler<HTMLButtonElement>;
type KeyDown = React.KeyboardEventHandler<HTMLInputElement>;
```

---

## CSSProperties 样式类型

**CSSProperties 内联样式（驼峰属性名）**
`React.CSSProperties`
```tsx
const style: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  color: '#333',
};
<div style={style} />;
```

**自定义 CSS 变量**
```tsx
const style = {
  '--brand': '#0066ff',
  width: '100%',
} as React.CSSProperties;
```

**PropertiesHyphen 长划线（需 csstype 的独立类型）**
`React.CSSProperties` 只认驼峰属性名，连字符写法要用 csstype 的 `PropertiesHyphen`
```tsx
import type { PropertiesHyphen } from 'csstype'; // csstype 是 React 类型属性的来源库
const style: PropertiesHyphen = {
  'background-color': 'red',   // 与 CSS 文件写法一致
  'font-size': '14px',
};
```

---

## Ref 类型（React 19 形态）

**挂 DOM 的 ref（必须传初值 null）**
`useRef<<Element>>(null)`
```tsx
const inputRef = useRef<HTMLInputElement>(null); // current: HTMLInputElement | null
```

**RefObject（19 起 current 可变）**
`React.RefObject<<T>>`
```tsx
const counterRef = useRef(0); // RefObject<number>，current 可写
counterRef.current += 1;
```

**RefCallback 回调 ref**
`React.RefCallback<<Element>>`
```tsx
const callback: React.RefCallback<HTMLDivElement> = (el) => {
  if (el) observe(el);
};
```

---

## 常用类型别名

**Dispatch 派发器**
`React.Dispatch<<Action>>`
```tsx
const dispatch: React.Dispatch<Action> = useDispatch();
```

**Reducer**
`React.Reducer<<State>, <Action>>`
```tsx
const reducer: React.Reducer<State, Action> = (state, action) => state;
```

**Awaited 异步结果类型**
```tsx
type User = Awaited<ReturnType<typeof fetchUser>>;
```

---

## JSX 命名空间类型（19 起在 React.JSX 下）

**React.JSX.Element**
```tsx
const heading: React.JSX.Element = <h1>Title</h1>;
```

**React.JSX.IntrinsicElements 内置元素**
`React.JSX.IntrinsicElements['<tag>']`
```tsx
const divProps: React.JSX.IntrinsicElements['div'] = { id: 'root', className: 'box' };
```

**ElementRef 提取元素类型**
`React.ElementRef<<ElementType>>`
```tsx
type InputEl = React.ElementRef<'input'>; // HTMLInputElement
```
