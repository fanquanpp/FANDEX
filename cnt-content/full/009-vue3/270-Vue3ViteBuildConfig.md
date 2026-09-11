---
order: 270
title: Vue 3 Vite 构建配置与命令
module: 'vue3'
category: 前端技术
difficulty: beginner
description: Vue 3 Vite 构建配置与命令 的完整教学讲解。
author: fanquanpp
updated: '2026-09-12'
related: []
prerequisites: []
---

## 创建 Vue 项目

**基本写法：使用 create-vue 脚手架**
`npm create vue@latest <项目名>`
```bash
# 官方推荐脚手架基于 Vite
npm create vue@latest my-app
```

---

**基本写法：使用 Vite 模板**
`npm create vite@latest <项目名> -- --template vue`
```bash
# 纯 Vite 模板
npm create vite@latest my-app -- --template vue
```

---

**基本写法：TypeScript 模板**
`npm create vite@latest <项目名> -- --template vue-ts`
```bash
# TS + Vue 模板
npm create vite@latest my-app -- --template vue-ts
```

---

**基本写法：pnpm 创建**
`pnpm create vue <项目名>`
```bash
# pnpm 创建项目
pnpm create vue my-app
```

---

## vite.config.js 配置

**基本写法：基本配置**
`export default defineConfig({ plugins: [vue()] })`
```js
// 引入 Vue 插件
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
export default defineConfig({
  plugins: [vue()]
});
```

---

**基本写法：配置路径别名**
`resolve: { alias: { '@': <路径> } }`
```js
// 配置 @ 指向 src
import path from 'path';
resolve: {
  alias: { '@': path.resolve(__dirname, './src') }
}
```

---

**基本写法：开发服务器端口**
`server: { port: <端口>, open: true }`
```js
// 自定义端口与自动打开
server: { port: 5173, open: true }
```

---

**基本写法：代理配置**
`server: { proxy: { <前缀>: { target, changeOrigin } } }`
```js
// 解决开发跨域
server: {
  proxy: { '/api': { target: 'http://localhost:8080', changeOrigin: true } }
}
```

---

**基本写法：启用 HTTPS**
`server: { https: true }`
```js
// 本地 HTTPS 调试
server: { https: true }
```

---

## 开发命令

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
# 本地预览构建产物
npm run preview
```

---

## 环境变量

**基本写法：读取环境变量**
`import.meta.env.VITE_<名称>`
```js
// 客户端读取 VITE_ 前缀
const apiKey = import.meta.env.VITE_API_KEY;
```

---

**基本写法：定义环境文件**
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

**基本写法：define 替换全局常量**
`define: { __APP_VERSION__: JSON.stringify(<版本>) }`
```js
// 编译期替换
define: { __APP_VERSION__: JSON.stringify('1.0.0') }
```

---

## 构建优化

**基本写法：手动分块**
`build: { rollupOptions: { output: { manualChunks: { <名>: [<模块>] } } } }`
```js
// 拆分大依赖
build: {
  rollupOptions: {
    output: { manualChunks: { vue: ['vue', 'vue-router', 'pinia'] } }
  }
}
```

---

**基本写法：压缩配置**
`build: { minify: '<esbuild|terser>' }`
```js
// 选择压缩器
build: { minify: 'esbuild' }
```

---

**基本写法：chunk 大小警告**
`build: { chunkSizeWarningLimit: <字节> }`
```js
// 调整警告阈值
build: { chunkSizeWarningLimit: 1000 }
```

---

**基本写法：rollupOptions 输出配置**
`build: { rollupOptions: { output: { dir, format } } }`
```js
// 自定义输出
build: { rollupOptions: { output: { dir: 'dist', format: 'es' } } }
```

---

## 静态资源处理

**基本写法：public 目录绝对引用**
`<img src="/<文件>" />`
```vue
<!-- public 下文件原样保留 -->
<img src="/favicon.ico" />
```

---

**基本写法：import 资源**
`import <logo> from '<路径>'`
```vue
<!-- import 得到 URL -->
<script setup>
import logo from './logo.png';
</script>
<template><img :src="logo" /></template>
```

---

**基本写法：new URL 资源路径**
`new URL('<相对路径>', import.meta.url).href`
```js
// 动态拼接资源路径
const url = new URL('./assets/icon.png', import.meta.url).href;
```

---

## CSS 处理

**基本写法：CSS 模块**
`<style module>`
```vue
<!-- 局部作用域 -->
<style module>
.title { color: red; }
</style>
<template><h1 :class="$style.title">标题</h1></template>
```

---

**基本写法：Scoped 样式**
`<style scoped>`
```vue
<!-- 组件作用域 -->
<style scoped>
.btn { color: blue; }
</style>
```

---

**基本写法：使用 Sass**
`<style lang="scss">`
```vue
<!-- 需安装 sass -->
<style lang="scss">
$color: red;
.title { color: $color; }
</style>
```

---

**基本写法：CSS 变量注入**
`<style vars="{ <变量> }">`
```vue
<!-- 响应式 CSS 变量 -->
<script setup>
import { ref } from 'vue';
const color = ref('red');
</script>
<style vars="{ color }">
.text { color: var(--color); }
</style>
```

---

## 别名与导入

**基本写法：自动导入组件**
`unplugin-vue-components`
```bash
# 自动注册组件
npm install -D unplugin-vue-components
```

---

**基本写法：配置自动导入**
`Components({ resolvers: [<解析器>] })`
```js
// 自动导入 Element Plus 等
import Components from 'unplugin-vue-components/vite';
plugins: [
  vue(),
  Components({ resolvers: [ElementPlusResolver()] })
]
```

---

**基本写法：自动导入 API**
`AutoImport({ imports: ['vue'] })`
```js
// 自动导入 ref computed 等
import AutoImport from 'unplugin-auto-import/vite';
plugins: [vue(), AutoImport({ imports: ['vue', 'vue-router'] })]
```

---

## 插件配置

**基本写法：jsx 支持**
`@vitejs/plugin-vue-jsx`
```bash
# 启用 JSX 语法
npm install -D @vitejs/plugin-vue-jsx
```

---

**基本写法：启用 jsx**
`vueJsx()`
```js
// 配置 JSX 插件
import vueJsx from '@vitejs/plugin-vue-jsx';
plugins: [vue(), vueJsx()]
```

---

## SSR 配置

**基本写法：SSR 构建配置**
`ssr: { noExternal: [<包>] }`
```js
// 服务端构建配置
ssr: { noExternal: ['some-pkg'] }
```

---

**基本写法：SSR 入口**
`build: { ssr: '<入口文件>' }`
```js
// 指定服务端入口
build: { ssr: 'src/entry-server.js' }
```

---

## 依赖优化

**基本写法：预构建依赖**
`optimizeDeps: { include: [<包>] }`
```js
// 强制预构建
optimizeDeps: { include: ['lodash-es'] }
```

---

**基本写法：排除依赖**
`optimizeDeps: { exclude: [<包>] }`
```js
// 排除预构建
optimizeDeps: { exclude: ['my-local-pkg'] }
```

---

## Worker 支持

**基本写法：使用 Web Worker**
`new Worker(new URL('<脚本>', import.meta.url))`
```js
// 直接使用 Worker
const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
```

---

## HMR 热更新

**基本写法：Vue HMR 自动支持**
`<style>` 修改即时生效
```vue
<!-- 模板与样式修改保留状态
<script setup>
import { ref } from 'vue';
const count = ref(0);
</script>
```

---

## Vue CLI 迁移

**基本写法：从 Vue CLI 迁移到 Vite**
`npm create vue@latest`
```bash
# 推荐使用 create-vue 替代 vue-cli
npm create vue@latest
```

---

## 测试集成

**基本写法：安装 Vitest**
`npm install -D vitest @vue/test-utils`
```bash
# Vite 原生测试框架
npm install -D vitest @vue/test-utils jsdom
```

---

**基本写法：Vitest 配置**
`test: { environment: 'jsdom' }`
```js
// vite.config.ts 中添加
test: { environment: 'jsdom', globals: true }
```

---

## 部署配置

**基本写法：base 路径配置**
`base: '<子路径>/'`
```js
// 部署到子目录
base: '/app/'
```

---

**基本写法：构建输出目录**
`build: { outDir: '<目录>' }`
```js
// 自定义输出目录
build: { outDir: 'dist' }
```
