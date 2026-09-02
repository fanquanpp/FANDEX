---
order: 240
title: React 国际化
module: 'react'
category: 前端技术
difficulty: intermediate
description: React i18n实现方案
author: fanquanpp
updated: '2026-08-01'
related:
  - 'react/022-ReactTest'
  - 'react/023-ReactRouteAdvanced'
  - 'react/025-ReactAnimation'
  - 'react/026-ReactSSR'
prerequisites:
  - 'react/001-OverviewEnvSetup'
---

## 前置知识

- [React 路由进阶](/react/023-ReactRouteAdvanced)：建议先完成前一篇的学习

## 学习目标

- 掌握「概述」的核心机制、典型用法与常见陷阱
- 掌握「基础概念」的核心机制、典型用法与常见陷阱
- 掌握「快速上手」的核心机制、典型用法与常见陷阱
- 掌握「详细用法」的核心机制、典型用法与常见陷阱
- 掌握「常见场景」的核心机制、典型用法与常见陷阱


## 概述

React i18n实现方案。本文将从基础概念、快速上手、详细用法、常见场景、注意事项和进阶用法六个方面全面介绍React国际化。

## 基础概念

React国际化涉及以下核心概念：

- **核心原理**：理解React国际化的底层工作机制和设计理念
- **关键术语**：掌握相关术语和概念，建立知识框架
- **适用场景**：明确何时使用React国际化，何时选择其他方案

```jsx
// React国际化的基本结构示例
function Example() {
  return <div>React国际化示例</div>;
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

// React国际化的最简示例
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
// React国际化的核心功能演示
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
// React国际化与 React 生态集成
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

- 使用React国际化时需要注意性能影响，避免不必要的重渲染
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
## react-i18next 安装

**基本写法：安装 i18next 与 react-i18next**
`npm install i18next react-i18next`
```bash
# 安装国际化核心库
npm install i18next react-i18next
```

---

## 初始化配置

**基本写法：i18n 配置资源与语言**
`i18n.use(<adapter>).init({ resources, lng })`
```ts
// 初始化语言包与默认语言
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
i18n.use(initReactI18next).init({
  resources: {
    en: { translation: { hello: 'Hello' } },
    zh: { translation: { hello: '你好' } }
  },
  lng: 'zh',
  fallbackLng: 'en'
});
```

---

## 翻译资源结构

**基本写法：嵌套命名空间组织文案**
`{ <语言>: { <命名空间>: { <键>: <值> } } }`
```ts
// 按模块拆分文案
{
  en: {
    translation: {
      user: { login: 'Login', logout: 'Logout' }
    }
  }
}
```

---

## useTranslation Hook

**基本写法：组件内使用翻译**
`const { t } = useTranslation([<命名空间>])`
```tsx
// 获取翻译函数
const { t } = useTranslation();
return <h1>{t('hello')}</h1>;
```

---

**基本写法：指定命名空间**
`useTranslation('<命名空间>')`
```tsx
// 仅加载 user 命名空间
const { t } = useTranslation('user');
return <button>{t('login')}</button>;
```

---

## 变量插值

**基本写法：使用占位符插入变量**
`t('<键>', { <变量>: <值> })`
```tsx
// 文案中插入变量
t('welcome', { name: 'Alice' });
// 资源：welcome: '欢迎 {{name}}'
```

---

## 复数处理

**基本写法：根据数量选择文案**
`t('<键>', { count: <数量> })`
```tsx
// 自动选择单复数
t('items', { count: 5 });
// 资源：items_one: '1 item', items_other: '{{count}} items'
```

---

## 日期数字格式化

**基本写法：使用 Intl API 格式化**
`new Intl.DateTimeFormat(<语言>).format(<日期>)`
```tsx
// 按语言格式化日期
new Intl.DateTimeFormat('zh-CN').format(new Date());
```

---

**基本写法：数字格式化**
`new Intl.NumberFormat(<语言>).format(<数字>)`
```tsx
// 货币与千分位
new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(1234);
```

---

## 语言切换

**基本写法：动态切换语言**
`i18n.changeLanguage(<语言码>)`
```tsx
// 切换到英文
i18n.changeLanguage('en');
```

---

**基本写法：当前语言**
`i18n.language`
```tsx
// 读取当前语言
const current = i18n.language;
```

---

## 持久化语言选择

**基本写法：保存到 localStorage**
`localStorage.setItem('<键>', <语言>)`
```tsx
// 启动时读取并应用
const saved = localStorage.getItem('lang') || 'zh';
i18n.changeLanguage(saved);
```

---

**基本写法：语言检测插件**
`npm install i18next-browser-languagedetector`
```bash
# 自动检测浏览器语言
npm install i18next-browser-languagedetector
```

---

**基本写法：使用检测器**
`i18n.use(<LanguageDetector>)`
```ts
// 配置检测顺序与缓存
i18n.use(LanguageDetector).init({
  detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] }
});
```

---

## Trans 组件富文本

**基本写法：嵌入组件的翻译**
`<Trans i18nKey="<键>" <组件>={<元素>}>`
```tsx
// 文案中嵌入链接组件
<Trans i18nKey="terms" components={{ link: <a href="/t" /> }} />
// 资源：terms: '请阅读 <link>条款</link>'
```

---

## 延迟加载语言包

**基本写法：动态导入语言资源**
`i18n.loadLanguages(<语言>, <回调>)`
```tsx
// 切换时按需加载
import(`./locales/${lang}.json`).then(res => {
  i18n.addResourceBundle(lang, 'translation', res.default);
  i18n.changeLanguage(lang);
});
```

---

## 后端资源加载

**基本写法：使用 i18next-http-backend**
`npm install i18next-http-backend`
```bash
# 从服务端加载语言包
npm install i18next-http-backend
```

---

**基本写法：配置后端加载**
`i18n.use(<HttpBackend>).init({ backend: { loadPath } })`
```ts
// 配置资源加载路径
i18n.use(HttpBackend).init({
  backend: { loadPath: '/locales/{{lng}}/{{ns}}.json' }
});
```

---

## 复数与序数

**基本写法：序数词处理**
`t('<键>_ordinal', { count, ordinal: <函数> })`
```tsx
// 第 1 第 2 第 3
t('place_ordinal', { count: 2 });
```

---

## 上下文 Context

**基本写法：根据上下文选择文案**
`t('<键>', { context: '<上下文>' })`
```tsx
// 男版女版文案
t('greet', { context: 'male' });
// 资源：greet_male: '先生你好', greet_female: '女士你好'
```

---

## 命名空间拆分

**基本写法：按页面拆分命名空间**
`{ ns: ['<命名空间1>', '<命名空间2>'] }`
```ts
// 减少首屏加载量
{
  en: {
    common: { ok: 'OK' },
    home: { title: 'Home' }
  }
}
```

---

**基本写法：默认命名空间**
`defaultNS: '<命名空间>'`
```ts
// 配置默认命名空间
i18n.init({ defaultNS: 'common' });
```

---

## SSR 国际化

**基本写法：每请求独立 i18n 实例**
`const <instance> = i18n.createInstance()`
```tsx
// 避免请求间语言串扰
const instance = i18n.createInstance();
await instance.init({ lng: req.language, resources });
```

---

## ICU MessageFormat

**基本写法：复杂消息格式**
`npm install @formatjs/intl`
```bash
# 处理复数与选择
npm install @formatjs/intl
```

---

**基本写法：使用 intl 格式化**
`new Intl.MessageFormat(<消息>, <语言>).format(<参数>)`
```tsx
// 复杂复数选择
const msg = `{count, plural, =0 {无} one {# 项} other {# 项}}`;
```

---

## 排序与比较

**基本写法：本地化字符串排序**
`new Intl.Collator(<语言>).compare`
```tsx
// 中文拼音排序
['张三', '李四'].sort(new Intl.Collator('zh-Hans-CN').compare);
```

---

## 单复数默认规则

**基本写法：英文复数后缀**
`<键>_one / <键>_other`
```ts
// 自动判断单复数
{
  item_one: 'item',
  item_other: 'items'
}
```

---

## 测试与回退

**基本写法：缺失键回退语言**
`fallbackLng: '<语言>'`
```ts
// 当前语言缺失时回退
i18n.init({ fallbackLng: 'en' });
```

---

**基本写法：缺失键警告**
`saveMissing: true`
```ts
// 开发期收集缺失翻译
i18n.init({ saveMissing: true, missingKeyHandler: (lng, ns, key) => console.warn(key) });
```
