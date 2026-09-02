---
order: 320
title: React 无障碍
module: 'react'
category: 前端技术
difficulty: intermediate
description: React应用可访问性
author: fanquanpp
updated: '2026-08-01'
related:
  - 'react/030-ReactGraphQL'
  - 'react/031-ReactMicroFrontend'
  - 'react/033-ReactPWA'
  - 'react/034-ReactCanvas'
prerequisites:
  - 'react/001-OverviewEnvSetup'
---

## 前置知识

- [React 与微前端](/react/031-ReactMicroFrontend)：建议先完成前一篇的学习

## 学习目标

- 掌握「概述」的核心机制、典型用法与常见陷阱
- 掌握「基础概念」的核心机制、典型用法与常见陷阱
- 掌握「快速上手」的核心机制、典型用法与常见陷阱
- 掌握「详细用法」的核心机制、典型用法与常见陷阱
- 掌握「常见场景」的核心机制、典型用法与常见陷阱


## 概述

React应用可访问性。本文将从基础概念、快速上手、详细用法、常见场景、注意事项和进阶用法六个方面全面介绍React无障碍。

## 基础概念

React无障碍涉及以下核心概念：

- **核心原理**：理解React无障碍的底层工作机制和设计理念
- **关键术语**：掌握相关术语和概念，建立知识框架
- **适用场景**：明确何时使用React无障碍，何时选择其他方案

```jsx
// React无障碍的基本结构示例
function Example() {
  return <div>React无障碍示例</div>;
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

// React无障碍的最简示例
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
// React无障碍的核心功能演示
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
// React无障碍与 React 生态集成
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

- 使用React无障碍时需要注意性能影响，避免不必要的重渲染
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
## 语义化 HTML

**基本写法：使用语义化标签**
`<<语义标签> >`
```tsx
// 提升屏幕阅读器体验
<header><nav>导航</nav></header>
<main><article>正文</article></main>
<footer>页脚</footer>
```

---

**基本写法：button 与 a 区分**
`<button onClick={<处理>}>`
```tsx
// 行为触发用 button 跳转用 a
<button onClick={save}>保存</button>
<a href="/about">关于</a>
```

---

## aria-label 标签

**基本写法：为图标按钮添加标签**
`<button aria-label="<描述>">`
```tsx
// 无文字按钮需可访问名称
<button aria-label="关闭" onClick={close}><IconX /></button>
```

---

## aria-labelledby 引用

**基本写法：用 ID 关联标题**
`<div aria-labelledby="<标题id>">`
```tsx
// 区域由标题描述
<div aria-labelledby="title">
  <h2 id="title">用户信息</h2>
</div>
```

---

## aria-describedby 描述

**基本写法：补充详细描述**
`<input aria-describedby="<提示id>" />`
```tsx
// 输入框补充说明
<input aria-describedby="pwd-tip" type="password" />
<p id="pwd-tip">至少 8 位含数字字母</p>
```

---

## 表单可访问性

**基本写法：label 关联 input**
`<label htmlFor="<id>"> <input id="<id>" />`
```tsx
// 点击 label 聚焦 input
<label htmlFor="email">邮箱</label>
<input id="email" type="email" />
```

---

**基本写法：label 包裹 input**
`<label> <文本> <input /> </label>`
```tsx
// 隐式关联
<label>用户名 <input type="text" /></label>
```

---

**基本写法：必填字段**
`<input required aria-required="true" />`
```tsx
// 标记必填字段
<input required aria-required="true" />
```

---

**基本写法：错误提示**
`<input aria-invalid="true" aria-describedby="<错误id>" />`
```tsx
// 字段错误状态
<input aria-invalid="true" aria-describedby="err" />
<p id="err" role="alert">邮箱格式错误</p>
```

---

## 图像可访问性

**基本写法：img 必须有 alt**
`<img src="<路径>" alt="<描述>" />`
```tsx
// 装饰性图片用空 alt
<img src="/bg.jpg" alt="" />
<img src="/logo.png" alt="公司标志" />
```

---

**基本写法：role 处理装饰图**
`<img alt="" role="presentation" />`
```tsx
// 屏幕阅读器跳过
<img src="/deco.png" alt="" role="presentation" />
```

---

## 键盘导航

**基本写法：保证 tab 顺序合理**
`<button>自然 tab 顺序</button>`
```tsx
// DOM 顺序即 tab 顺序
<div>
  <button>1</button>
  <button>2</button>
</div>
```

---

**基本写法：tabindex 控制焦点**
`<div tabIndex={0}>可聚焦</div>`
```tsx
// tabindex 0 表示可聚焦 tabindex -1 表示仅 JS 可聚焦
<div tabIndex={0}>自定义可聚焦区域</div>
```

---

**基本写法：处理 Enter 与 Space**
`onKeyDown={(e) => { if (e.key === 'Enter') <处理>; }}`
```tsx
// 自定义按钮需处理键盘事件
<div role="button" tabIndex={0} onKeyDown={e => {
  if (e.key === 'Enter' || e.key === ' ') activate();
}}>
```

---

## 焦点管理

**基本写法：弹窗打开聚焦**
`useEffect(() => <ref>.current.focus(), [])`
```tsx
// 模态框打开自动聚焦
useEffect(() => inputRef.current.focus(), []);
```

---

**基本写法：focus trap 焦点陷阱**
`onKeyDown={(e) => { if (e.key === 'Tab') <限制>; }}`
```tsx
// 弹窗内循环焦点
function trapFocus(e, container) {
  if (e.key !== 'Tab') return;
  // 限制在容器内
}
```

---

**基本写法：关闭后恢复焦点**
`const <lastFocused> = document.activeElement;`
```tsx
// 关闭弹窗后焦点回到触发按钮
const trigger = document.activeElement;
// 关闭时 trigger.focus()
```

---

## 隐藏内容

**基本写法：仅视觉隐藏保留可访问**
`className="sr-only"`
```tsx
// 屏幕阅读器可见视觉隐藏
<span className="sr-only">附加说明</span>
```

---

**基本写法：aria-hidden 隐藏装饰**
`<div aria-hidden="true">`
```tsx
// 装饰元素对辅助技术隐藏
<div aria-hidden="true"><Decoration /></div>
```

---

## role 角色

**基本写法：自定义组件标注角色**
`<div role="<角色>">`
```tsx
// 自定义下拉框标注 listbox
<div role="listbox">
  <div role="option" aria-selected="true">选项</div>
</div>
```

---

**基本写法：dialog 角色**
`<div role="dialog" aria-modal="true">`
```tsx
// 模态框角色
<div role="dialog" aria-modal="true">
  <h2>标题</h2>
</div>
```

---

## 动态通知 aria-live

**基本写法：实时区域播报变化**
`<div aria-live="polite">`
```tsx
// 异步提示礼貌播报
<div aria-live="polite">{message}</div>
```

---

**基本写法：assertive 紧急播报**
`<div aria-live="assertive" role="alert">`
```tsx
// 错误立即播报
<div role="alert" aria-live="assertive">{error}</div>
```

---

## 跳过导航链接

**基本写法：skip to main content**
`<a href="#<主内容id>" className="skip-link">跳到主内容</a>`
```tsx
// 键盘用户快速跳过导航
<a href="#main" className="skip-link">跳到主内容</a>
<main id="main">...</main>
```

---

## 颜色对比度

**基本写法：保证文字与背景对比度**
`color: <深色>; background: <浅色>;`
```tsx
// WCAG AA 标准对比度 4.5:1
<span style={{ color: '#333', background: '#fff' }}>文本</span>
```

---

## 焦点可见样式

**基本写法：保留 outline 焦点环**
`<button>默认 outline 可见</button>`
```tsx
// 不要移除 outline 提供替代方案
button:focus-visible { outline: 2px solid blue; }
```

---

## 表格可访问性

**基本写法：使用 th 与 scope**
`<th scope="col">`
```tsx
// 表头关联单元格
<table>
  <tr><th scope="col">姓名</th><th scope="col">年龄</th></tr>
  <tr><td>张三</td><td>20</td></tr>
</table>
```

---

## 动画与运动

**基本写法：尊重 prefers-reduced-motion**
`const <reduce> = matchMedia('(prefers-reduced-motion: reduce)').matches`
```tsx
// 用户偏好减少动画
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!reduce) animate();
```

---

## ESLint 可访问性插件

**基本写法：安装 eslint-plugin-jsx-a11y**
`npm install -D eslint-plugin-jsx-a11y`
```bash
# 静态检测可访问性问题
npm install -D eslint-plugin-jsx-a11y
```

---

**基本写法：配置规则**
`plugins: ['jsx-a11y']`
```json
// .eslintrc
{
  "plugins": ["jsx-a11y"],
  "extends": ["plugin:jsx-a11y/recommended"]
}
```

---

## 测试可访问性

**基本写法：使用 jest-axe 检测**
`expect(await axe(<容器>)).toHaveNoViolations()`
```tsx
// 自动化无障碍测试
import { axe } from 'jest-axe';
const results = await axe(container);
expect(results).toHaveNoViolations();
```
