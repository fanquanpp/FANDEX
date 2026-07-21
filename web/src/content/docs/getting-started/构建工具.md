---
order: 58
title: 构建工具
module: 'getting-started'
category: 入门指南
difficulty: beginner
description: 构建工具对比：Make、CMake、Vite的工作原理、配置方法与适用场景。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'getting-started/版本控制系统选型'
  - 'getting-started/项目初始化'
  - 'getting-started/编程范式基础'
  - 'getting-started/调试思想'
prerequisites:
  - 'getting-started/入门指南'
---

## 1. 构建工具概述

### 1.1 为什么需要构建工具

构建工具自动化了从**源代码到可交付产物**的转换过程，解决以下问题：

- **编译转换**：TypeScript → JavaScript、SCSS → CSS、JSX → JS
- **模块打包**：将多个模块合并为少量文件，减少 HTTP 请求
- **代码优化**：压缩、Tree Shaking、代码分割
- **资源处理**：图片压缩、字体处理、SVG 优化
- **开发体验**：热更新、源码映射、实时预览

### 1.2 构建工具分类

| 类型           | 代表                     | 特点                     |
| :------------- | :----------------------- | :----------------------- |
| **任务运行器** | Make、npm scripts        | 定义和执行构建任务       |
| **打包器**     | Webpack、Rollup、esbuild | 模块依赖分析与打包       |
| **构建系统**   | CMake、Bazel、Ninja      | 管理复杂构建流程         |
| **全功能构建** | Vite、Turbopack          | 开发服务器 + 构建 + 优化 |

## 2. Make

### 2.1 Make 基础

Make 是最经典的构建工具，通过 `Makefile` 定义任务和依赖关系：

```makefile
# Makefile
.PHONY: all build test clean install

# 默认目标
all: build

# 变量
SRC_DIR = src
BUILD_DIR = dist
CC = gcc
CFLAGS = -Wall -O2

# 构建目标
build: $(BUILD_DIR)/app

$(BUILD_DIR)/app: $(SRC_DIR)/main.c $(SRC_DIR)/utils.c
	$(CC) $(CFLAGS) -o $@ $^

# 测试
test: build
	./$(BUILD_DIR)/app --test

# 安装
install: build
	cp $(BUILD_DIR)/app /usr/local/bin/

# 清理
clean:
	rm -rf $(BUILD_DIR)
```

### 2.2 Make 核心概念

| 概念                      | 说明                  | 示例                |
| :------------------------ | :-------------------- | :------------------ |
| **目标（Target）**        | 要生成的文件或任务名  | `build:`            |
| **依赖（Prerequisites）** | 目标依赖的文件        | `build: main.c`     |
| **命令（Recipe）**        | 生成目标的 Shell 命令 | `gcc -o app main.c` |
| **变量**                  | 可复用的值            | `CC = gcc`          |
| **模式规则**              | 通用的构建模式        | `%.o: %.c`          |
| **伪目标**                | 不对应文件的任务      | `.PHONY: clean`     |

### 2.3 前端项目中的 Make

```makefile
# 前端项目 Makefile
.PHONY: dev build test lint deploy

dev:
	npm run dev

build:
	npm run build

test:
	npm run test

lint:
	npm run lint

deploy: build
	rsync -avz dist/ server:/var/www/app/

# 安装依赖
install:
	npm ci

# 清理
clean:
	rm -rf node_modules dist
```

## 3. CMake

### 3.1 CMake 基础

CMake 是 C/C++ 项目的**元构建系统**，它不直接构建项目，而是生成特定平台的构建文件（Makefile、Ninja 文件、Visual Studio 项目等）。

```cmake
# CMakeLists.txt
cmake_minimum_required(VERSION 3.20)
project(MyApp VERSION 1.0.0 LANGUAGES CXX)

# C++ 标准
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# 源文件
add_executable(myapp
    src/main.cpp
    src/utils.cpp
    src/parser.cpp
)

# 头文件目录
target_include_directories(myapp PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/include
)

# 链接库
target_link_libraries(myapp PRIVATE
    fmt::fmt
    Boost::filesystem
)

# 测试
enable_testing()
add_subdirectory(tests)
```

### 3.2 CMake 构建流程

```
CMakeLists.txt
      ↓ cmake
  构建文件（Makefile / .ninja / .sln）
      ↓ cmake --build
  编译产物（可执行文件 / 库文件）
      ↓ ctest
  测试结果
      ↓ cpack
  安装包（.deb / .rpm / .msi）
```

```bash
# 标准构建流程
mkdir build && cd build
cmake ..                          # 配置，生成构建文件
cmake --build .                   # 构建
ctest                             # 测试
cmake --install . --prefix=/usr   # 安装
```

### 3.3 现代 CMake 特性

```cmake
# 目标导向的现代 CMake
add_library(mylib STATIC
    src/lib.cpp
)

# 目标级别的属性设置（推荐）
target_compile_features(mylib PUBLIC cxx_std_17)
target_include_directories(mylib PUBLIC
    $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
    $<INSTALL_INTERFACE:include>
)

# 生成器表达式
target_compile_options(mylib PRIVATE
    $<$<CONFIG:Debug>:-g -O0>
    $<$<CONFIG:Release>:-O3>
)
```

## 4. Vite

### 4.1 Vite 核心原理

Vite 利用浏览器原生 ES Module 实现极速开发体验：

**开发模式**：

- 不打包，直接利用浏览器 ESM 加载
- 按需编译，只编译当前页面用到的模块
- 使用 esbuild 预构建依赖（比 Webpack 快 10-100 倍）

**生产构建**：

- 使用 Rollup 打包
- Tree Shaking、代码分割、CSS 代码分割

```
传统打包器（Webpack）:
  启动 → 打包所有模块 → 启动开发服务器 → 浏览器加载
  （启动时间随项目规模线性增长）

Vite:
  启动 → 直接启动开发服务器 → 浏览器按需请求 → esbuild 即时编译
  （启动时间几乎不随项目规模增长）
```

### 4.2 Vite 配置

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },

  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },

  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia'],
        },
      },
    },
  },
});
```

### 4.3 Vite 插件系统

```typescript
// 自定义 Vite 插件
export default function myPlugin() {
  return {
    name: 'my-plugin',

    // 开发服务器配置
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // 自定义中间件
        next();
      });
    },

    // 转换钩子
    transform(code, id) {
      if (id.endsWith('.custom')) {
        return {
          code: transformCode(code),
          map: null,
        };
      }
    },

    // 构建钩子
    buildStart() {
      console.log('Build started');
    },

    buildEnd() {
      console.log('Build ended');
    },
  };
}
```

## 5. 构建工具对比

### 5.1 前端构建工具

| 特性             | Vite     | Webpack  | Rollup | esbuild  |
| :--------------- | :------- | :------- | :----- | :------- |
| **开发服务器**   | 原生 ESM | 需配置   |        |          |
| **HMR 速度**     | 极快     | 中等     | —      | —        |
| **构建速度**     | 快       | 慢       | 中等   | 极快     |
| **Tree Shaking** |          |          | 最佳   |          |
| **代码分割**     |          |          |        |          |
| **插件生态**     | 丰富     | 最丰富   | 中等   | 较少     |
| **适用场景**     | 应用开发 | 复杂应用 | 库开发 | 极速编译 |

### 5.2 选型建议

| 场景                  | 推荐                   | 理由                  |
| :-------------------- | :--------------------- | :-------------------- |
| **新前端项目**        | Vite                   | 开发体验最佳          |
| **遗留 Webpack 项目** | Webpack                | 迁移成本高，保持稳定  |
| **开发组件库**        | Rollup / Vite lib 模式 | Tree Shaking 效果最好 |
| **C/C++ 项目**        | CMake + Ninja          | 行业标准              |
| **通用任务自动化**    | Make / npm scripts     | 简单直接              |
| **大型 monorepo**     | Turborepo + Vite       | 增量构建、任务缓存    |

## 6. 构建优化

### 6.1 构建速度优化

```typescript
// Vite 构建优化
export default defineConfig({
  build: {
    // 启用 Rollup 缓存
    cacheDir: 'node_modules/.vite',

    // 禁用 sourcemap（生产环境）
    sourcemap: false,

    // 分包策略
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },

    // 压缩选项
    minify: 'esbuild', // 比 terser 快 20x
  },
});
```

### 6.2 产物体积优化

- **Tree Shaking**：移除未使用的导出代码
- **代码分割**：按路由或功能拆分，按需加载
- **动态导入**：`import()` 实现懒加载
- **资源压缩**：图片（Sharp）、CSS（cssnano）、HTML（html-minifier）
- **CDN 外置**：大型库（Vue、React）使用 CDN 加载
