---
order: 1
tags:
  - react
difficulty: beginner
title: 概述与环境配置
module: react
category: React
description: 'React 概述、发展历史、React 19 新特性、环境搭建与 JSX 语法基础。'
author: fanquanpp
updated: '2026-06-14'
related:
  - react/组件与Props
  - react/状态与事件
  - javascript/语法速查
prerequisites: []
---

## 1. React 概述

React 是由 Meta（原 Facebook）开发并维护的开源 JavaScript UI 库，于 2013 年 5 月首次开源。它采用声明式编程范式，以组件化思想构建用户界面，是目前全球使用最广泛的前端框架之一。

### 1.1 核心理念

| 理念                   | 说明                                                         |
| :--------------------- | :----------------------------------------------------------- |
| **声明式**             | 描述 UI 应该是什么样子，而非如何一步步操作 DOM               |
| **组件化**             | 将 UI 拆分为独立、可复用的组件，每个组件管理自己的状态和渲染 |
| **一次学习，到处编写** | React 可用于 Web、Native（React Native）、VR 等多个平台      |
| **单向数据流**         | 数据从父组件通过 Props 向下流动，状态变更通过回调向上传递    |

### 1.2 发展历史

| 版本       | 时间    | 里程碑                                                   |
| :--------- | :------ | :------------------------------------------------------- |
| React 0.3  | 2013.05 | 首次开源                                                 |
| React 0.14 | 2015.10 | 拆分 react-dom，引入无状态函数组件                       |
| React 15   | 2016.04 | 正式版本号，Fiber 架构开始酝酿                           |
| React 16   | 2017.09 | Fiber 架构落地，Error Boundaries、Portals、Fragment      |
| React 16.8 | 2019.02 | **Hooks** 正式发布，函数组件成为主流                     |
| React 17   | 2020.10 | 事件委托机制变更，为并发特性铺路                         |
| React 18   | 2022.03 | 并发渲染、Automatic Batching、Suspense、useId 等         |
| React 19   | 2024.12 | Server Components、Actions、use() Hook、useOptimistic 等 |

### 1.3 React 19 核心新特性概览

React 19 是一次重大更新，主要围绕以下方向：

- **React Server Components (RSC)**：服务端组件正式稳定，减少客户端 JavaScript 体积
- **Actions**：简化表单提交和异步状态管理
- **新 Hooks**：`use()`、`useFormStatus`、`useOptimistic`、`useActionState`
- **改进的 Suspense**：支持服务端流式渲染
- **ref 作为 prop**：函数组件不再需要 `forwardRef`
- **文档元数据支持**：`<title>`、`<meta>` 等标签可直接在组件中声明
- **样式表支持**：通过 `precedence` 控制样式表加载顺序

## 2. 环境搭建

### 2.1 使用 Vite 创建项目（推荐）

Vite 是目前最流行的前端构建工具，启动速度极快，热更新即时。

```bash
# 使用 npm
npm create vite@latest my-react-app -- --template react-ts

# 使用 pnpm
pnpm create vite my-react-app --template react-ts

# 进入项目并安装依赖
cd my-react-app
npm install
npm run dev
```

Vite 项目默认结构：

```
my-react-app/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── public/
│   └── vite.svg
└── src/
    ├── App.tsx
    ├── App.css
    ├── main.tsx
    ├── index.css
    └── vite-env.d.ts
```

### 2.2 使用 Next.js 创建项目

Next.js 是 React 全栈框架，支持 SSR、SSG、App Router 等特性。

```bash
# 创建 Next.js 15 项目
npx create-next-app@latest my-next-app --typescript --app --tailwind --eslint

# 或使用 pnpm
pnpm create next-app my-next-app --typescript --app --tailwind --eslint
```

Next.js App Router 项目结构：

```
my-next-app/
├── next.config.ts
├── package.json
├── tsconfig.json
├── public/
└── src/
    ├── app/
    │   ├── layout.tsx       # 根布局
    │   ├── page.tsx         # 首页
    │   ├── globals.css
    │   └── favicon.ico
    └── components/
```

### 2.3 使用 Remix 创建项目

Remix 是一个专注于 Web 标准的全栈 React 框架。

```bash
npx create-remix@latest my-remix-app
```

### 2.4 开发工具配置

**VS Code 推荐扩展：**

- ESLint — 代码规范检查
- Prettier — 代码格式化
- TypeScript Importer — 自动导入
- Error Lens — 行内错误提示
- React Developer Tools — 浏览器调试扩展

**推荐 VS Code settings.json 配置：**

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

## 3. JSX 语法

JSX 是 JavaScript 的语法扩展，允许在 JavaScript 中编写类似 HTML 的代码。React 19 中 JSX Transform 已完全内置，无需手动引入 React。

### 3.1 基本语法

```tsx
// JSX 基本结构
const element = <h1>Hello, React 19!</h1>;

// 使用表达式
const name = 'FANDEX';
const greeting = <h1>Hello, {name}!</h1>;

// 调用函数
function formatName(user: { firstName: string; lastName: string }) {
  return `${user.firstName} ${user.lastName}`;
}

const user = { firstName: '张', lastName: '三' };
const element = <h1>Hello, {formatName(user)}!</h1>;
```

### 3.2 JSX 属性与样式

```tsx
// 属性使用 camelCase
const element = (
  <div className="container" htmlFor="input" tabIndex={0}>
    内容
  </div>
);

// 内联样式使用对象
const styleObj: React.CSSProperties = {
  color: 'red',
  fontSize: '16px',
  backgroundColor: '#f0f0f0',
};

const styledElement = <div style={styleObj}>带样式的文本</div>;
```

### 3.3 条件渲染

```tsx
// 三元表达式
const element = isLoggedIn ? <Dashboard /> : <LoginPage />;

// 逻辑与 (&&)
const element = <div>{items.length > 0 && <ItemList items={items} />}</div>;

// 提前返回
function UserGreeting({ name }: { name?: string }) {
  if (!name) {
    return <p>请先登录</p>;
  }
  return <h1>欢迎回来，{name}！</h1>;
}
```

### 3.4 列表渲染

```tsx
const fruits = [
  { id: 1, name: '苹果' },
  { id: 2, name: '香蕉' },
  { id: 3, name: '橙子' },
];

const fruitList = (
  <ul>
    {fruits.map((fruit) => (
      <li key={fruit.id}>{fruit.name}</li>
    ))}
  </ul>
);
```

> **注意**：`key` 应使用稳定且唯一的标识符，避免使用数组索引作为 key，尤其在列表会增删时。

## 4. Hello World

### 4.1 最简 React 应用

```tsx
// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

```tsx
// src/App.tsx
function App() {
  return (
    <div>
      <h1>Hello, React 19!</h1>
      <p>欢迎使用 FANDEX React 知识库</p>
    </div>
  );
}

export default App;
```

### 4.2 React 19 新的客户端渲染 API

React 19 对 `createRoot` 的使用方式做了调整，`render` 方法已被弃用，推荐使用新的 API：

```tsx
// React 18 方式（仍可用但已弃用）
// createRoot(container).render(<App />);

// React 19 推荐方式
import { createRoot } from 'react-dom/client';

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
```

### 4.3 StrictMode 说明

`StrictMode` 是开发模式下的辅助工具，它不会渲染任何可见 UI，但会：

- 识别不安全的生命周期方法
- 检测过时的 API 用法
- 检测意外的副作用（组件会被渲染两次）
- 检测过时的 Context API 用法

> **提示**：`StrictMode` 的双重渲染仅在开发模式下生效，生产构建中不会触发。

## 5. TypeScript 与 React

### 5.1 类型定义

React 19 内置了 TypeScript 类型支持，无需额外安装 `@types/react`：

```bash
npm install react react-dom
npm install -D typescript @types/react @types/react-dom
```

### 5.2 常用类型

```tsx
import type { FC, ReactNode, CSSProperties, ChangeEvent } from 'react';

// 函数组件类型
const MyComponent: FC<{ title: string; children?: ReactNode }> = ({ title, children }) => {
  return (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  );
};

// 事件类型
const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
  console.log(e.target.value);
};

// 样式类型
const styles: CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
};
```

## 6. 包管理器选择

| 包管理器 | 特点                    | 推荐场景           |
| :------- | :---------------------- | :----------------- |
| **npm**  | Node.js 内置，最通用    | 初学者、CI 环境    |
| **pnpm** | 硬链接机制，磁盘占用少  | 大型项目、Monorepo |
| **yarn** | 确定性安装，Plug'n'Play | 团队协作           |
| **bun**  | 极速安装，内置运行时    | 追求极致性能       |

```bash
# 使用 pnpm（推荐）
corepack enable
corepack prepare pnpm@latest --activate

# 使用 bun
npm install -g bun
```
