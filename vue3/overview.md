# 01-概述与环境 | Overview & Environment
 False
 False> @Author: fanquanpp
 False> @Category: Vue3 Basics
 False> @Description: 01-概述与环境 | Overview & Environment
 False> @Updated: 2026-05-03
 False
 False---
 False
 False## 目录
 False
 False1. [Vue3 概述 | Vue3 Overview](#vue3-概述-|-vue3-overview)
 False2. [环境搭建 | Environment Setup](#环境搭建-|-environment-setup)
 False3. [第一个 Vue3 应用 | First Vue3 App](#第一个-vue3-应用-|-first-vue3-app)
 False4. [开发工具推荐 | Recommended Tools](#开发工具推荐-|-recommended-tools)
 False5. [学习资源 | Learning Resources](#学习资源-|-learning-resources)
 False6. [常见问题 | Common Issues](#常见问题-|-common-issues)
 False7. [小结 | Summary](#小结-|-summary)
 False
 False---
 False
 False## 1. Vue3 概述 | Vue3 Overview
 False
 FalseVue3 是 Vue.js 框架的第三个主要版本，于 2020 年 9 月正式发布。它带来了许多重要的改进和新特性，包括：
 False
 False- **组合式 API (Composition API)**：提供了一种新的方式来组织组件逻辑，使代码更易于维护和复用
 False- **响应式系统重构**：使用 ES6 Proxy 替代 Object.defineProperty，提供更强大的响应式能力
 False- **更好的 TypeScript 支持**：全面提升了 TypeScript 类型推断能力
 False- **性能优化**：包括虚拟 DOM 重写、编译器优化等，性能显著提升
 False- **更小的包体积**：通过 tree-shaking 等技术，减小了运行时体积
 False
 False## 2. 环境搭建 | Environment Setup
 False
 False### 2.1 安装 Node.js
 False
 FalseVue3 项目需要 Node.js 18+ 环境。可以从 [Node.js 官网](https://nodejs.org/) 下载并安装最新版本。
 False
 False### 2.2 创建 Vue3 项目
 False
 False使用 Vite 创建 Vue3 项目是推荐的方式：
 False
```bash
 True# 使用 npm
 Truenpm create vite@latest my-vue3-app -- --template vue
 True
 True# 使用 yarn
 Trueyarn create vite my-vue3-app --template vue
 True
 True# 使用 pnpm
 Truepnpm create vite my-vue3-app --template vue
 True```

 False### 2.3 项目结构
 False
 False创建的 Vue3 项目结构如下：
 False
```
 Truemy-vue3-app/
 True├── node_modules/ # 依赖包
 True├── public/ # 静态资源
 True├── src/ # 源代码
 True│ ├── assets/ # 资源文件
 True│ ├── components/ # 组件
 True│ ├── router/ # 路由（需手动创建）
 True│ ├── store/ # 状态管理（需手动创建）
 True│ ├── views/ # 页面（需手动创建）
 True│ ├── App.vue # 根组件
 True│ └── main.js # 入口文件
 True├── .gitignore # Git 忽略文件
 True├── index.html # HTML 模板
 True├── package.json # 项目配置
 True├── vite.config.js # Vite 配置
 True└── README.md # 项目说明
 True```

 False### 2.4 安装常用依赖
 False
```bash
 True# 安装 Vue Router
 Truenpm install vue-router@4
 True
 True# 安装 Pinia（Vue3 推荐的状态管理库）
 Truenpm install pinia
 True
 True# 安装 TypeScript（可选）
 Truenpm install typescript
 True
 True# 安装 ESLint 和 Prettier（可选）
 Truenpm install eslint prettier
 True```

 False## 3. 第一个 Vue3 应用 | First Vue3 App
 False
 False### 3.1 修改 App.vue
 False
```vue
 True<template>
 True <div class="app">
 True <h1>Hello Vue3!</h1>
 True <button @click="count++">Count: {{ count }}</button>
 True </div>
 True</template>
 True
 True<script setup>
 Trueimport { ref } from 'vue'
 True
 Trueconst count = ref(0)
 True</script>
 True
 True<style scoped>
 True.app {
 True text-align: center;
 True margin-top: 50px;
 True}
 True
 Trueh1 {
 True color: #42b983;
 True}
 True
 Truebutton {
 True padding: 10px 20px;
 True font-size: 16px;
 True background-color: #42b983;
 True color: white;
 True border: none;
 True border-radius: 4px;
 True cursor: pointer;
 True}
 True
 Truebutton:hover {
 True background-color: #35495e;
 True}
 True</style>
 True```

 False### 3.2 运行项目
 False
```bash
 True# 进入项目目录
 Truecd my-vue3-app
 True
 True# 安装依赖
 Truenpm install
 True
 True# 启动开发服务器
 Truenpm run dev
 True```

 False访问终端中显示的地址（通常是 <http://localhost:5173），即可看到你的第一个> Vue3 应用。
 False
 False## 4. 开发工具推荐 | Recommended Tools
 False
 False- **VS Code**：推荐的代码编辑器
 False- **Volar**：Vue3 官方推荐的 VS Code 扩展，提供更好的 Vue3 支持
 False- **Vue DevTools**：浏览器扩展，用于调试 Vue 应用
 False- **ESLint**：代码质量检查工具
 False- **Prettier**：代码格式化工具
 False
 False## 5. 学习资源 | Learning Resources
 False
 False- [Vue3 官方文档](https://vuejs.org/docs/) <!-- nofollow -->
 False- [Vue3 组合式 API 文档](https://vuejs.org/api/composition-api.html) <!-- nofollow -->
 False- [Vite 官方文档](https://vitejs.dev/) <!-- nofollow -->
 False
 False## 6. 常见问题 | Common Issues
 False
 False### 6.1 无法启动开发服务器
 False
 False- 检查 Node.js 版本是否符合要求
 False- 检查端口是否被占用
 False- 检查依赖是否正确安装
 False
 False### 6.2 组件不显示
 False
 False- 检查组件是否正确导入
 False- 检查组件名称是否正确
 False- 检查模板语法是否正确
 False
 False### 6.3 响应式数据不更新
 False
 False- 检查是否使用了 `ref` 或 `reactive` 来创建响应式数据
 False- 检查是否正确访问响应式数据（对于 `ref`，需要使用 `.value`）
 False- 检查是否在模板中正确使用响应式数据（模板中自动解包，不需要 `.value`）
 False
 False## 7. 小结 | Summary
 False
 FalseVue3 带来了许多新特性和改进，使前端开发更加高效和愉快。通过本章节的学习，你已经了解了 Vue3 的基本概念和环境搭建方法，为后续的学习打下了基础。
 False
 False接下来，我们将深入学习 Vue3 的组合式 API、响应式系统、组件系统等核心特性，帮助你构建更加复杂和功能丰富的 Vue3 应用。

## 延伸阅读

- [[javascript/overview|JavaScript]]
- [[typescript/overview|TypeScript]]
- [[html5/overview-and-semantics|HTML5]]
- [[css/overview-and-syntax|CSS]]
 False