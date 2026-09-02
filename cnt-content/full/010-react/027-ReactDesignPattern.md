---
order: 270
title: React 设计模式
module: 'react'
category: 前端技术
difficulty: intermediate
description: React组件设计模式
author: fanquanpp
updated: '2026-08-01'
related:
  - 'react/025-ReactAnimation'
  - 'react/026-ReactSSR'
  - 'react/028-ReactWebAssembly'
  - 'react/029-ReactWebSocket'
prerequisites:
  - 'react/001-OverviewEnvSetup'
---

## 前置知识

- [React 服务端渲染](/react/026-ReactSSR)：建议先完成前一篇的学习

## 学习目标

- 掌握「概述」的核心机制、典型用法与常见陷阱
- 掌握「基础概念」的核心机制、典型用法与常见陷阱
- 掌握「快速上手」的核心机制、典型用法与常见陷阱
- 掌握「详细用法」的核心机制、典型用法与常见陷阱
- 掌握「常见场景」的核心机制、典型用法与常见陷阱


## 概述

React组件设计模式。本文将从基础概念、快速上手、详细用法、常见场景、注意事项和进阶用法六个方面全面介绍React设计模式。

## 基础概念

React设计模式涉及以下核心概念：

- **核心原理**：理解React设计模式的底层工作机制和设计理念
- **关键术语**：掌握相关术语和概念，建立知识框架
- **适用场景**：明确何时使用React设计模式，何时选择其他方案

```jsx
// React设计模式的基本结构示例
function Example() {
  return <div>React设计模式示例</div>;
}
```

## 快速上手

### 安装与配置

```bash
# 安装相关依赖
npm install react react-dom
```

### 基本使用

```jsx
import { useState, useEffect } from 'react';

// React设计模式的最简示例
function BasicExample() {
  const [value, setValue] = useState('');
  return (
    <div>
      <input value={value} onChange={(e) => setValue(e.target.value)} />
      <p>当前值: {value}</p>
    </div>
  );
}
```

## 详细用法

### 核心功能

```jsx
// React设计模式的核心功能演示
function DetailedExample() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // 数据获取
  useEffect(() => {
    setLoading(true);
    fetchData().then((result) => {
      setData(result);
      setLoading(false);
    });
  }, []);

  if (loading) return <div>加载中...</div>;
  return (
    <ul>
      {data.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}
```

### 配置选项

```jsx
// 常用配置选项
const config = {
  timeout: 5000, // 超时时间
  retries: 3, // 重试次数
  cache: true, // 启用缓存
  debug: false, // 调试模式
};
```

### 与其他功能集成

```jsx
// React设计模式与 React 生态集成
import { useQuery, useMutation } from '@tanstack/react-query';

function IntegratedExample() {
  const { data, isLoading } = useQuery({
    queryKey: ['items'],
    queryFn: fetchItems,
  });

  const mutation = useMutation({
    mutationFn: updateItem,
    onSuccess: () => {
      /* 刷新数据 */
    },
  });

  if (isLoading) return <div>加载中...</div>;
  return (
    <ul>
      {data?.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}
```

## 常见场景

### 场景一：数据处理

```jsx
function DataProcessor() {
  const [items, setItems] = useState([]);

  // 过滤和排序
  const processedItems = useMemo(() => {
    return items.filter((item) => item.active).sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  return (
    <ul>
      {processedItems.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}
```

### 场景二：表单处理

```jsx
function FormExample() {
  const [formData, setFormData] = useState({ name: '', email: '' });

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('提交:', formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" value={formData.name} onChange={handleChange} />
      <input name="email" value={formData.email} onChange={handleChange} />
      <button type="submit">提交</button>
    </form>
  );
}
```

### 场景三：错误处理

```jsx
function ErrorHandlingExample() {
  const [error, setError] = useState(null);

  if (error) {
    return (
      <div role="alert">
        <h2>出错了</h2>
        <p>{error.message}</p>
        <button onClick={() => setError(null)}>重试</button>
      </div>
    );
  }

  return <Content onError={setError} />;
}
```

## 注意事项

- 使用React设计模式时需要注意性能影响，避免不必要的重渲染
- 在生产环境中应正确处理错误和异常情况
- 注意浏览器兼容性，必要时使用 polyfill
- 遵循 React 的最佳实践，保持组件的纯函数特性
- 注意内存泄漏，在 useEffect 的清理函数中取消订阅和定时器
- 大型列表应使用虚拟化方案（如 react-window）避免性能问题
- 服务端渲染场景需要确保代码在 Node.js 环境中可运行

## 进阶用法

### 性能优化

```jsx
import { memo, useMemo, useCallback } from 'react';

// 使用 memo 避免不必要的重渲染
const OptimizedComponent = memo(function OptimizedComponent({ data, onClick }) {
  return <div onClick={onClick}>{data.name}</div>;
});

function Parent() {
  const [items, setItems] = useState([]);

  // 使用 useCallback 缓存回调
  const handleClick = useCallback((id) => {
    console.log('点击:', id);
  }, []);

  // 使用 useMemo 缓存计算结果
  const processedItems = useMemo(() => {
    return items.filter((item) => item.active);
  }, [items]);

  return (
    <div>
      {processedItems.map((item) => (
        <OptimizedComponent key={item.id} data={item} onClick={() => handleClick(item.id)} />
      ))}
    </div>
  );
}
```

### 自定义 Hook 封装

```jsx
function useCustomHook(initialValue) {
  const [state, setState] = useState(initialValue);
  const [error, setError] = useState(null);

  const update = useCallback(async (value) => {
    try {
      setError(null);
      setState(value);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  // 重置状态
  const reset = useCallback(() => {
    setState(initialValue);
    setError(null);
  }, [initialValue]);

  return { state, error, update, reset };
}
```

### 测试策略

```jsx
import { render, screen, fireEvent } from '@testing-library/react';

// 组件测试
test('示例组件正常渲染', () => {
  render(<ExampleComponent />);
  expect(screen.getByText('示例')).toBeInTheDocument();
});

// 交互测试
test('点击按钮触发回调', () => {
  const handleClick = jest.fn();
  render(<Button onClick={handleClick}>点击</Button>);
  fireEvent.click(screen.getByText('点击'));
  expect(handleClick).toHaveBeenCalledTimes(1);
});
```
## 高阶组件 HOC

**基本写法：包装组件增强功能**
`function <withX>>(<组件>) { return function <增强组件>(<props>) { return <<组件> {...<props>} /> } }`
```tsx
// 通用日志增强
function withLogger(Wrapped) {
  return function New(props) {
    useEffect(() => console.log('render'), []);
    return <Wrapped {...props} />;
  };
}
```

---

**基本写法：HOC 注入额外 props**
`function <withX>(<组件>) { return (props) => <<组件> {...props} <额外字段>={<值>} /> }`
```tsx
// 注入用户信息
function withUser(Wrapped) {
  return props => <Wrapped {...props} user={useUser()} />;
}
```

---

**基本写法：组合多个 HOC**
`const <增强> = <withA>(<withB>(<组件>))`
```tsx
// 自下而上依次包装
const App = withAuth(withLogger(Base));
```

---

## Render Props 模式

**基本写法：通过 prop 函数共享渲染逻辑**
`<组件 render={<渲染函数>} />`
```tsx
// 调用方决定渲染内容
<Mouse render={({ x, y }) => <p>{x},{y}</p>} />
```

---

**基本写法：children as function**
`<组件>{<渲染函数>}</组件>`
```tsx
// 使用 children 函数
<Mouse>{({ x, y }) => <Dot x={x} y={y} />}</Mouse>
```

---

**基本写法：实现 Render Props 组件**
`function <组件>(<props>) { return props.children(<状态>); }`
```tsx
// 提供者暴露内部状态
function Mouse({ children }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  return children(pos);
}
```

---

## Compound Components 复合组件

**基本写法：通过 Context 共享内部状态**
`<容器> <子A /> <子B /> </容器>`
```tsx
// 灵活组合但状态联动
<Select>
  <Select.Trigger />
  <Select.Option value="1" />
</Select>
```

---

**基本写法：父组件提供 Context**
`const <Ctx> = createContext(); <Ctx.Provider value={<状态>}>`
```tsx
// 内部状态共享给子组件
const SelectCtx = createContext();
function Select({ children }) {
  const [open, setOpen] = useState(false);
  return <SelectCtx.Provider value={{ open, setOpen }}>{children}</SelectCtx.Provider>;
}
```

---

## 自定义 Hook 替代 HOC

**基本写法：用 Hook 复用逻辑**
`const <逻辑> = use<名称>();`
```tsx
// 替代 HOC 的更优方案
const user = useUser();
return <Profile user={user} />;
```

---

## Provider 模式

**基本写法：顶层 Provider 注入依赖**
`<Provider value={<服务>}> <App /> </Provider>`
```tsx
// 依赖注入
const ApiContext = createContext();
<ApiContext.Provider value={api}><App /></ApiContext.Provider>
```

---

## 受控与非受控组件

**基本写法：受控组件由 props 驱动**
`<input value={<值>} onChange={<处理>} />`
```tsx
// 父组件完全控制
<input value={text} onChange={e => setText(e.target.value)} />
```

---

**基本写法：非受控组件使用 defaultValue**
`<input defaultValue={<值>} ref={<ref>} />`
```tsx
// 内部状态由 DOM 管理
<input defaultValue={init} ref={inputRef} />
```

---

## Forwarding Refs

**基本写法：forwardRef 转发 ref**
`const <组件> = forwardRef((<props>, <ref>) => <JSX>)`
```tsx
// 让父组件访问内部 DOM
const Input = forwardRef((props, ref) => <input ref={ref} {...props} />);
```

---

## Container/Presentational 模式

**基本写法：容器组件负责数据**
`function <容器>() { const <数据> = <获取>(); return <展示 <数据>={<数据>} /> }`
```tsx
// 数据与视图分离
function UserContainer() {
  const user = useUser();
  return <UserView user={user} />;
}
```

---

**基本写法：展示组件纯渲染**
`function <展示>({ <数据> }) { return <JSX>; }`
```tsx
// 不含副作用只渲染 props
function UserView({ user }) { return <div>{user.name}</div>; }
```

---

## 状态提升

**基本写法：共享状态放到共同父级**
`function <父>() { const [<共享>, <设置>] = useState(); <<A> <共享>={<共享>} /> <<B> <设置>={<设置>} /> }`
```tsx
// 多子组件共享数据
function App() {
  const [text, setText] = useState('');
  return <><Input value={text} onChange={setText} /><Preview text={text} /></>;
}
```

---

## 组合优于继承

**基本写法：通过 props.children 组合**
`function <布局>(<props>) { return <div>{<props>.children}</div>; }`
```tsx
// 灵活嵌套内容
function Card({ children }) { return <div className="card">{children}</div>; }
```

---

## Specialization 特化

**基本写法：基于通用组件派生专用组件**
`function <特化>(<props>) { return <通用 <特定字段>={<值>} {...<props>} /> }`
```tsx
// 派生特定按钮
function PrimaryButton(props) {
  return <Button color="blue" {...props} />;
}
```

---

## Render Optimization 模式

**基本写法：memo 避免重渲染**
`const <组件> = React.memo(<基础组件>)`
```tsx
// props 不变时跳过渲染
const List = React.memo(ListBase);
```

---

## Error Boundary 模式

**基本写法：class 组件捕获子树错误**
`class <Boundary> extends React.Component { static getDerivedStateFromError() {} }`
```tsx
// 捕获渲染错误降级 UI
class SafeArea extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() { return this.state.hasError ? <Fallback /> : this.props.children; }
}
```

---

## Slot 模式

**基本写法：通过具名 props 实现插槽**
`<布局 <header>={<A>} <body>={<B>} />`
```tsx
// 多处内容注入
<Layout header={<Header />} body={<Content />} />
```

---

## Hooks 复用模式

**基本写法：将副作用抽成 Hook**
`function use<名称>(<参数>) { useEffect(() => <副作用>, [<依赖>]); }`
```tsx
// 逻辑复用统一入口
function useTrack(event) { useEffect(() => log(event), [event]); }
```

---

## Context Selector 模式

**基本写法：拆分 Context 或使用 selector 库**
`const <部分> = useContextSelector(<Ctx>, <选择器>)`
```tsx
// 精确订阅避免多余渲染
const value = useContextSelector(Ctx, s => s.field);
```

---

## Factory Component 模式

**基本写法：动态创建组件**
`function create<组件>(<配置>) { return function <组件>(<props>) { /* */ }; }`
```tsx
// 按配置生成组件
function createInput(type) {
  return props => <input type={type} {...props} />;
}
```

---

## 容器组合模式

**基本写法：组合多个 Provider**
`const <App> = <withA>(<withB>(<根>))`
```tsx
// 串联多个 Provider
function withProviders(...providers) {
  return Comp => props => providers.reduceRight((acc, P) => <P>{acc}</P>, <Comp {...props} />);
}
```
