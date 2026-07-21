---
order: 71
title: React无障碍
module: react
category: React
difficulty: intermediate
description: React应用可访问性
author: fanquanpp
updated: '2026-06-14'
related:
  - react/React与GraphQL
  - react/React与微前端
  - react/React与PWA
  - react/React与Canvas
prerequisites:
  - react/概述与环境配置
---

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
