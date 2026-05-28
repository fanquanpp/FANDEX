---
order: 100
tags:
  - 'typescript'
  - 'oop'
  - 'database'
difficulty: 'advanced'
title: 'TypeScript 编译与性能优化'
module: 'typescript'
category: 'TypeScript Basics'
description: 'TypeScript 编译与性能优化'
author: 'fanquanpp'
updated: 2026-05-03
---

## 目录

1. [编译配置优化](#编译配置优化)
2. [增量编译](#增量编译)
3. [类型检查优化](#类型检查优化)
4. [工程化优化](#工程化优化)
5. [CI/CD 优化](#ci/cd-优化)
6. [性能监控](#性能监控)
7. [常见问题与解决方案](#常见问题与解决方案)
8. [最佳实践](#最佳实践)
9. [迁移策略](#迁移策略)
10. [性能优化案例](#性能优化案例)

---

## 1. 编译配置优化

### 1.1 基础配置优化

```json
 {
  "compilerOptions": {
  "target": "ES2020",
  "module": "ESNext",
  "moduleResolution": "node",
  "esModuleInterop": true,
  "skipLibCheck": true,
  "forceConsistentCasingInFileNames": true,
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true,
  "strictFunctionTypes": true,
  "strictBindCallApply": true,
  "strictPropertyInitialization": true,
  "noImplicitThis": true,
  "useUnknownInCatchVariables": true,
  "alwaysStrict": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "noImplicitReturns": true,
  "noFallthroughCasesInSwitch": true,
  "noUncheckedIndexedAccess": true,
  "noImplicitOverride": true,
  "noPropertyAccessFromIndexSignature": true,
  "allowUnusedLabels": false,
  "allowUnreachableCode": false,
  "exactOptionalPropertyTypes":
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "build"]
 True}
```

### 1.2 性能相关配置

```json
 {
  "compilerOptions": {
  "incremental": true,
  "tsBuildInfoFile": "./.tsbuildinfo",
  "composite": true,
  "declarationMap": false,
  "sourceMap": false,
  "inlineSourceMap": false,
  "inlineSources": false,
  "isolatedModules": true,
  "skipLibCheck": true,
  "skipDefaultLibCheck": true,
  "preserveWatchOutput":
  }
 True}
```

## 2. 增量编译

### 2.1 配置增量编译

```json
 {
  "compilerOptions": {
  "incremental": true,
  "tsBuildInfoFile": "./.tsbuildinfo"
  }
 True}
```

### 2.2 验证增量编译效果

```bash
 # 首次编译
 npx tsc --diagnostics
 # 再次编译（应该更快）
 npx tsc --diagnostics
```

### 2.3 增量编译最佳实践

- 将 `tsBuildInfoFile` 加入 `.gitignore`
- 在 CI/CD 环境中清理 `tsBuildInfoFile` 以确保一致性
- 对于大型项目，考虑使用项目引用（Project References）

## 3. 类型检查优化

### 3.1 减少类型复杂度

- **避免深度递归类型**：复杂的递归类型会显著拖慢编译速度
- **使用类型别名**：将复杂类型提取为可重用的类型别名
- **限制泛型复杂度**：避免过度使用嵌套泛型

### 3.2 优化类型定义

```typescript
 // 不好的做法：深度嵌套的类型
 type DeepNested<T> = {
  [K in keyof T]: T[K] extends object
  ? DeepNested<T[K]>
  : T[K]
 True};
 // 好的做法：限制递归深度或使用更简单的类型
 type ShallowNested<T> = {
  [K in keyof T]: T[K]
 True};
```

## 4. 工程化优化

### 4.1 项目结构优化

- **使用项目引用**：将大型项目拆分为多个子项目
- **合理组织文件结构**：按功能或模块组织代码
- **控制文件大小**：单个文件不宜过大，建议不超过 500 行

### 4.2 构建工具集成

#### 4.2.1 Vite 集成

```typescript
 // vite.config.ts
 import { defineConfig } from 'vite';
 import vue from '@vitejs/plugin-vue';
 import tsconfigPaths from 'vite-tsconfig-paths';
 export default defineConfig({
  plugins: [vue(), tsconfigPaths()],
  build: {
  target: 'es2020',
  minify: 'terser',
  sourcemap: false
  }
 True});
```

#### 4.2.2 Webpack 集成

```typescript
 // webpack.config.ts
 import path from 'path';
 import { Configuration } from 'webpack';
 import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
 export default {
  entry: './src/index.ts',
  output: {
  path: path.resolve(__dirname, 'dist'),
  filename: 'bundle.js'
  },
  resolve: {
  extensions: ['.ts', '.tsx', '.js', '.jsx']
  },
  module: {
  rules: [
  {
  test: /\.tsx?$/,
  use: {
  loader: 'ts-loader',
  options: {
  transpileOnly:  // 开发模式下跳过类型检查
  }
  }
  }
  ]
  },
  plugins: [
  new ForkTsCheckerWebpackPlugin() // 单独进程进行类型检查
  ]
 True} as Configuration;
```

## 5. CI/CD 优化

### 5.1 快速类型检查

```bash
 # 仅进行类型检查，不生成输出
 npx tsc --noEmit
 # 检查特定文件或目录
 npx tsc --noEmit src/**/*.ts
```

### 5.2 缓存策略

- **缓存 node_modules**：使用 CI 缓存机制
- **缓存编译结果**：对于自托管 CI，可缓存 `.tsbuildinfo`
- **增量构建**：只构建变更的文件

## 6. 性能监控

### 6.1 编译诊断

```bash
 # 查看详细的编译时间
 npx tsc --diagnostics
 # 查看特定文件的编译时间
 npx tsc --extendedDiagnostics
```

### 6.2 性能分析

```bash
 # 生成编译性能分析文件
 npx tsc --generateTrace traceDir
```

然后使用 Chrome DevTools 的 Performance 面板打开生成的 trace 文件进行分析。

## 7. 常见问题与解决方案

### 7.1 编译速度慢

| 问题           | 原因           | 解决方案                                  |
| -------------- | -------------- | ----------------------------------------- |
| 类型检查时间长 | 复杂的类型定义 | 简化类型定义，使用类型别名                |
| 编译时间长     | 未启用增量编译 | 启用 `incremental` 选项                   |
| 内存占用高     | 大型项目       | 拆分项目，使用项目引用                    |
| 构建时间长     | 未优化构建配置 | 使用 `transpileOnly` 和单独的类型检查进程 |

### 7.2 类型错误多

| 问题         | 原因                  | 解决方案                         |
| ------------ | --------------------- | -------------------------------- |
| 类型不匹配   | 类型定义不准确        | 修正类型定义，使用更精确的类型   |
| 空值错误     | 未处理 null/undefined | 使用严格的空值检查，添加类型守卫 |
| 类型推断失败 | 复杂的类型关系        | 显式标注类型，使用类型断言       |

## 8. 最佳实践

### 8.1 配置最佳实践

- **开发环境**：启用 `transpileOnly`，使用单独的类型检查进程
- **生产环境**：完整的类型检查，优化输出代码
- **CI/CD**：使用 `--noEmit` 快速检查类型

### 8.2 代码最佳实践

- **使用明确的类型标注**：避免过度依赖类型推断
- **合理使用泛型**：不要过度复杂化泛型类型
- **模块化类型定义**：将类型定义放在单独的文件中
- **定期清理未使用的类型**：使用 `noUnusedLocals` 和 `noUnusedParameters`

### 8.3 工具链最佳实践

- **使用现代构建工具**：Vite、ESBuild 等
- **集成类型检查工具**：ESLint、Prettier
- **自动化测试**：Jest、Vitest 等
- **持续集成**：GitHub Actions、CI/CD 流水线

## 9. 迁移策略

### 9.1 从 JavaScript 迁移到 TypeScript

1. **渐进式迁移**：先添加 `// @ts-nocheck`，然后逐步添加类型
2. **类型定义**：为第三方库添加类型定义
3. **代码清理**：使用 `noUnusedLocals` 和 `noUnusedParameters` 清理代码
4. **测试**：确保所有测试通过

### 9.2 TypeScript 版本升级

1. **检查兼容性**：使用 `tsc --noEmit` 检查类型错误
2. **逐步升级**：先升级到中间版本，再升级到最新版本
3. **更新配置**：根据新版本的推荐配置更新 `tsconfig.json`
4. **测试**：确保所有测试通过

## 10. 性能优化案例

### 10.1 大型项目优化

**问题**：大型 monorepo 项目编译时间长
**解决方案**：

1. 使用项目引用（Project References）拆分项目
2. 启用增量编译
3. 配置 `skipLibCheck` 和 `isolatedModules`
4. 使用 Vite 或 ESBuild 进行快速开发
   **结果**：编译时间从 3 分钟减少到 30 秒

### 10.2 类型检查优化

**问题**：复杂的类型定义导致类型检查速度慢
**解决方案**：

1. 简化递归类型定义
2. 使用类型别名减少重复
3. 限制泛型复杂度
4. 避免过度使用条件类型
   **结果**：类型检查时间从 1 分钟减少到 10 秒

---

[深入理解 TypeScript](https://jkchao.github.io/typescript-book-chinese/)<!-- nofollow -->
