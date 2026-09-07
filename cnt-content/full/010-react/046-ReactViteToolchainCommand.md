---
order: 460
title: React Vite 与工具链命令
module: 'react'
category: 前端技术
difficulty: beginner
description: React Vite 与工具链命令 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related: []
prerequisites: []
---

## Vite 创建 React 项目

**基本写法：使用 create vite 模板**
`npm create vite@latest <项目名> -- --template react`
```bash
# 创建 React 项目
npm create vite@latest my-app -- --template react
```

---

**基本写法：TypeScript 模板**
`npm create vite@latest <项目名> -- --template react-ts`
```bash
# 创建 TS + React 项目
npm create vite@latest my-app -- --template react-ts
```

---

**基本写法：使用 yarn 或 pnpm**
`pnpm create vite <项目名> --template react-ts`
```bash
# pnpm 创建项目
pnpm create vite my-app --template react-ts
```

---

## Vite 配置文件

**基本写法：vite.config.ts 基本配置**
`export default defineConfig({ plugins: [react()] })`
```ts
// 配置 React 插件
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()]
});
```

---

**基本写法：配置路径别名**
`resolve: { alias: { '@': <路径> } }`
```ts
// 配置 @ 指向 src
resolve: {
  alias: { '@': path.resolve(__dirname, './src') }
}
```

---

**基本写法：配置开发服务器端口**
`server: { port: <端口>, open: true }`
```ts
// 自定义端口与自动打开
server: { port: 3000, open: true }
```

---

**基本写法：配置代理**
`server: { proxy: { <前缀>: { target, changeOrigin } } }`
```ts
// 解决开发环境跨域
server: {
  proxy: { '/api': { target: 'http://localhost:8080', changeOrigin: true } }
}
```

---

## Vite 开发命令

**基本写法：启动开发服务器**
`npm run dev`
```bash
# 启动 Vite 开发服务器
npm run dev
```

---

**基本写法：构建生产版本**
`npm run build`
```bash
# 输出到 dist 目录
npm run build
```

---

**基本写法：预览生产构建**
`npm run preview`
```bash
# 本地预览生产包
npm run preview
```

---

## Vite 环境变量

**基本写法：通过 import.meta.env 读取**
`const <key> = import.meta.env.VITE_<名称>`
```ts
// 客户端可访问 VITE_ 前缀变量
const apiKey = import.meta.env.VITE_API_KEY;
```

---

**基本写法：.env 文件定义**
`VITE_<名称>=<值>`
```bash
# .env 文件
VITE_API_BASE=/api
```

---

**基本写法：模式环境文件**
`.env.<mode>`
```bash
# .env.production 生产模式
VITE_API_BASE=https://api.prod.com
```

---

## Vite 静态资源

**基本写法：导入图片资源**
`import <img> from '<路径>'`
```tsx
// 直接 import 得到 URL
import logo from './logo.png';
<img src={logo} alt="logo" />
```

---

**基本写法：public 目录绝对引用**
`<img src="/<文件>" />`
```tsx
// public 下文件原样保留
<img src="/favicon.ico" />
```

---

## Vite CSS 处理

**基本写法：导入 CSS 模块**
`import <样式> from './<文件>.module.css'`
```tsx
// 局部作用域类名
import styles from './App.module.css';
<div className={styles.box} />
```

---

**基本写法：使用 Sass**
`import './<文件>.scss'`
```tsx
// 需安装 sass 依赖
import './App.scss';
```

---

## Vite 构建优化

**基本写法：手动分块**
`build: { rollupOptions: { output: { manualChunks: { <名>: [<模块>] } } } }`
```ts
// 拆分大依赖
build: {
  rollupOptions: {
    output: { manualChunks: { vendor: ['react', 'react-dom'] } }
  }
}
```

---

**基本写法：gzip 压缩**
`viteCompression({ algorithm: 'gzip' })`
```ts
// 使用 vite-plugin-compression
import compression from 'vite-plugin-compression';
plugins: [react(), compression({ algorithm: 'gzip' })]
```

---

## CRA Create React App

**基本写法：使用 npx 创建**
`npx create-react-app <项目名>`
```bash
# 创建 CRA 项目
npx create-react-app my-app
```

---

**基本写法：使用 TypeScript 模板**
`npx create-react-app <项目名> --template typescript`
```bash
# TS 模板
npx create-react-app my-app --template typescript
```

---

**基本写法：CRA 启动**
`npm start`
```bash
# 启动 CRA 开发服务器
npm start
```

---

**基本写法：CRA 构建**
`npm run build`
```bash
# 构建到 build 目录
npm run build
```

---

**基本写法：CRA 测试**
`npm test`
```bash
# 运行 Jest 测试
npm test
```

---

**基本写法：CRA 弹出配置**
`npm run eject`
```bash
# 暴露 webpack 配置不可逆
npm run eject
```

---

## Next.js 项目创建

**基本写法：创建 Next.js 应用**
`npx create-next-app@latest <项目名>`
```bash
# 创建 Next.js 15 项目
npx create-next-app@latest my-app
```

---

**基本写法：Next.js 开发命令**
`npm run dev`
```bash
# 启动 Next.js 开发服务器
npm run dev
```

---

**基本写法：Next.js 构建**
`npm run build`
```bash
# 构建生产版本
npm run build
```

---

**基本写法：Next.js 启动生产**
`npm start`
```bash
# 运行构建产物
npm start
```

---

## 依赖管理

**基本写法：安装运行时依赖**
`npm install <包>`
```bash
# 安装依赖
npm install axios
```

---

**基本写法：安装开发依赖**
`npm install -D <包>`
```bash
# 安装到 devDependencies
npm install -D eslint
```

---

**基本写法：pnpm 安装**
`pnpm add <包>`
```bash
# pnpm 安装
pnpm add axios
```

---

## 包管理器对比

**基本写法：根据团队选择**
`<npm|yarn|pnpm> install`
```bash
# npm：通用 yarn：缓存快 pnpm：磁盘省
pnpm install
```

---

## ESLint 配置

**基本写法：初始化 ESLint**
`npm init @eslint/config`
```bash
# 交互式创建配置
npm init @eslint/config
```

---

**基本写法：lint 命令**
`eslint <目录> --ext .ts,.tsx`
```bash
# 检查 TS 与 TSX
eslint src --ext .ts,.tsx
```

---

**基本写法：自动修复**
`eslint <文件> --fix`
```bash
# 自动修复可修复问题
eslint src --fix
```

---

## Prettier 格式化

**基本写法：安装 Prettier**
`npm install -D prettier`
```bash
# 安装 Prettier
npm install -D prettier
```

---

**基本写法：格式化命令**
`prettier --write <目录>`
```bash
# 格式化整个 src
prettier --write src
```

---

## TypeScript 配置

**基本写法：tsconfig.json 关键项**
`compilerOptions: { jsx: 'react-jsx', strict: true }`
```json
// tsconfig.json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "strict": true,
    "moduleResolution": "bundler"
  }
}
```

---

**基本写法：类型检查命令**
`tsc --noEmit`
```bash
# 只检查不输出
tsc --noEmit
```

---

## 测试工具

**基本写法：安装 Vitest**
`npm install -D vitest`
```bash
# Vite 项目推荐 Vitest
npm install -D vitest
```

---

**基本写法：运行测试**
`vitest`
```bash
# watch 模式运行测试
vitest
```

---

**基本写法：安装 Testing Library**
`npm install -D @testing-library/react`
```bash
# 组件测试库
npm install -D @testing-library/react @testing-library/jest-dom
```
