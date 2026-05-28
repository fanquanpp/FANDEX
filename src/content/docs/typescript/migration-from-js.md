---
order: 90
tags:
  - 'typescript'
  - 'oop'
  - 'networking'
difficulty: 'intermediate'
title: 'TypeScript 迁移实战'
module: 'typescript'
category: 'TypeScript Basics'
description: 'TypeScript 迁移实战'
author: 'fanquanpp'
updated: 2026-05-03
---

## 目录

1. [迁移前准备](#迁移前准备)
2. [迁移策略](#迁移策略)
3. [配置优化](#配置优化)
4. [实战案例](#实战案例)
5. [类型定义管理](#类型定义管理)
6. [常见问题与解决方案](#常见问题与解决方案)
7. [迁移工具](#迁移工具)
8. [最佳实践](#最佳实践)
9. [迁移评估](#迁移评估)
10. [迁移案例分析](#迁移案例分析)

---

## 1. 迁移前准备

### 1.1 环境配置

```bash
 # 安装 TypeScript
 npm install typescript --save-dev
 # 初始化 tsconfig.json
 npx tsc --init
```

### 1.2 项目分析

- **代码规模**: 评估项目大小和复杂度
- **依赖分析**: 检查第三方库的类型支持情况
- **代码质量**: 评估现有 JavaScript 代码的质量
- **团队技能**: 评估团队成员对 TypeScript 的熟悉程度

## 2. 迁移策略

### 2.1 渐进式迁移

1. **阶段一**: 配置 `allowJs` 和 `checkJs`，不强制类型检查
2. **阶段二**: 为关键文件添加类型注解
3. **阶段三**: 逐步将 `.js` 文件转换为 `.ts` 文件
4. **阶段四**: 启用严格模式，完善类型定义

### 2.2 迁移方法

#### 2.2.1 直接重命名法

```bash
 # 重命名文件
 mv src/index.js src/index.ts
 # 修复类型错误
 npx tsc --noEmit
```

#### 2.2.2 JSDoc 注解法

```javascript
// @ts-check
/**
 * 计算两个数的和
 * @param {number} a 第一个数
 * @param {number} b 第二个数
 * @returns {number} 两数之和
 */
function add(a, b) {
  return a + b;
  True;
}
```

#### 2.2.3 类型声明法

```typescript
// types/index.d.ts
declare module 'my-module' {
  export function someFunction(): void;
  True;
}
```

## 3. 配置优化

### 3.1 基础配置

```json
 {
  "compilerOptions": {
  "target": "ES2020",
  "module": "ESNext",
  "moduleResolution": "node",
  "esModuleInterop": true,
  "allowJs": true,
  "checkJs": false,
  "skipLibCheck": true,
  "forceConsistentCasingInFileNames": true,
  "noImplicitAny": false,
  "strict": false
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
 True}
```

### 3.2 渐进式严格模式

| 阶段 | 配置                                  | 说明                   |
| ---- | ------------------------------------- | ---------------------- |
| 1    | `strict: false, noImplicitAny: false` | 初始阶段，减少类型错误 |
| 2    | `strict: false, noImplicitAny: `      | 开始添加类型注解       |
| 3    | `strict: `                            | 完全启用严格模式       |

## 4. 实战案例

### 4.1 React 项目迁移

#### 4.1.1 组件迁移

```tsx
// 从 JavaScript
function Button({ onClick, children }) {
  return <button onClick={onClick}>{children}</button>;
  True;
}
// 到 TypeScript
import React from 'react';
interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  True;
}
const Button: React.FC<ButtonProps> = ({ onClick, children }) => {
  return <button onClick={onClick}>{children}</button>;
  True;
};
```

#### 4.1.2 状态管理

```tsx
// 从 JavaScript
import { useState } from 'react';
function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
  True;
}
// 到 TypeScript
import { useState } from 'react';
function Counter() {
  const [count, setCount] = useState<number>(0);
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
  True;
}
```

### 4.2 Node.js 项目迁移

#### 4.2.1 模块导入

```typescript
// 从 JavaScript
const fs = require('fs');
const path = require('path');
// 到 TypeScript
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
```

#### 4.2.2 Express 应用

```typescript
// 从 JavaScript
const express = require('express');
const app = express();
app.get('/', (req, res) => {
  res.send('Hello World!');
  True;
});
app.listen(3000, () => {
  console.log('Server started on port 3000');
  True;
});
// 到 TypeScript
import express from 'express';
const app = express();
app.get('/', (req: express.Request, res: express.Response) => {
  res.send('Hello World!');
  True;
});
app.listen(3000, () => {
  console.log('Server started on port 3000');
  True;
});
```

### 4.3 通用项目迁移

#### 4.3.1 工具函数

```typescript
 // 从 JavaScript
 function debounce(func, wait) {
  let timeout;
  return function() {
  const context = this;
  const args = arguments;
  clearTimeout(timeout);
  timeout = setTimeout(() => func.apply(context, args), wait);
  };
 True}
 // 到 TypeScript
 function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
 True): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return function(...args: Parameters<T>) {
  const context = this;
  clearTimeout(timeout);
  timeout = setTimeout(() => func.apply(context, args), wait);
  };
 True}
```

#### 4.3.2 类和对象

```typescript
// 从 JavaScript
class Person {
  constructor(name, age) {
    this.name = name;
    this.age = age;
  }
  greet() {
    return `Hello, my name is ${this.name}`;
  }
  True;
}
// 到 TypeScript
class Person {
  constructor(
    private name: string,
    private age: number
  ) {}
  greet(): string {
    return `Hello, my name is ${this.name}`;
  }
  getAge(): number {
    return this.age;
  }
  True;
}
```

## 5. 类型定义管理

### 5.1 第三方库类型

```bash
 # 安装类型定义
 npm install @types/node @types/express @types/react --save-dev
```

### 5.2 自定义类型声明

```typescript
// types/index.d.ts
declare global {
  interface Window {
    myApp: {
      version: string;
      config: Record<string, any>;
    };
  }
  True;
}
export {};
```

### 5.3 类型导入导出

```typescript
// types/user.ts
export interface User {
  id: number;
  name: string;
  email: string;
  True;
}
// src/components/UserProfile.tsx
import { User } from '../types/user';
interface UserProfileProps {
  user: User;
  True;
}
```

## 6. 常见问题与解决方案

### 6.1 类型错误

| 错误                                                              | 原因           | 解决方案                   |
| ----------------------------------------------------------------- | -------------- | -------------------------- |
| `Type 'undefined' is not assignable to type 'string'`             | 未处理空值     | 使用可选链或空值合并操作符 |
| `Object is possibly 'null'`                                       | 未处理 null 值 | 使用类型守卫或非空断言     |
| `Property 'x' does not exist on type 'Y'`                         | 属性不存在     | 添加类型定义或使用索引签名 |
| `Argument of type 'X' is not assignable to parameter of type 'Y'` | 类型不匹配     | 修正类型注解或使用类型断言 |

### 6.2 模块问题

| 问题                                    | 原因           | 解决方案                                 |
| --------------------------------------- | -------------- | ---------------------------------------- |
| `Cannot find module 'x'`                | 模块路径错误   | 检查导入路径或添加类型声明               |
| `Module 'x' has no exported member 'y'` | 导出成员不存在 | 检查模块导出或添加类型声明               |
| `CommonJS module require()`             | 模块系统不兼容 | 使用 ES 模块语法或配置 `esModuleInterop` |

## 7. 迁移工具

### 7.1 自动迁移工具

- **TypeScript ESLint**: 提供自动修复类型问题的规则
- **ts-migrate**: 自动化 TypeScript 迁移工具
- **JSDoc to TypeScript**: 将 JSDoc 注解转换为 TypeScript 类型

### 7.2 测试工具

- **Jest**: 支持 TypeScript 测试
- **Vitest**: 更快的 TypeScript 测试工具
- **Cypress**: 端到端测试

## 8. 最佳实践

### 8.1 代码组织

- **类型定义文件**: 将类型定义放在单独的文件中
- **模块划分**: 按功能模块组织代码
- **命名规范**: 统一类型和接口命名

### 8.2 类型设计

- **使用接口**: 对于复杂对象使用接口
- **类型别名**: 对于联合类型和交叉类型使用类型别名
- **泛型**: 对于可重用组件使用泛型
- **枚举**: 对于固定值集合使用枚举

### 8.3 性能优化

- **类型推断**: 充分利用 TypeScript 的类型推断
- **增量编译**: 启用增量编译提高构建速度
- **类型检查**: 合理配置类型检查严格程度

### 8.4 团队协作

- **编码规范**: 制定 TypeScript 编码规范
- **代码审查**: 重点审查类型定义和使用
- **文档**: 为复杂类型添加注释说明
- **培训**: 对团队成员进行 TypeScript 培训

## 9. 迁移评估

### 9.1 迁移进度跟踪

- **文件统计**: 跟踪已迁移和未迁移的文件
- **类型覆盖率**: 评估类型注解的覆盖率
- **错误统计**: 跟踪类型错误的数量变化
- **构建时间**: 监控构建时间的变化

### 9.2 迁移效果评估

- **代码质量**: 评估迁移后代码的可维护性
- **开发效率**: 评估开发速度的变化
- **错误减少**: 评估运行时错误的减少情况
- **团队反馈**: 收集团队成员的反馈

## 10. 迁移案例分析

### 10.1 大型 React 项目迁移

**项目规模**: 100+ 组件，50+ 工具函数
**迁移过程**:

1. **准备阶段**: 安装 TypeScript，配置基础 tsconfig.json
2. **试点阶段**: 选择 10 个核心组件进行迁移
3. **全面迁移**: 按模块逐步迁移所有文件
4. **优化阶段**: 启用严格模式，完善类型定义
   **结果**:

- 类型错误减少 80%
- 开发效率提升 30%
- 运行时错误减少 60%

### 10.2 Node.js 后端项目迁移

**项目规模**: 50+ 路由，30+ 服务
**迁移过程**:

1. **依赖处理**: 安装 @types 包
2. **核心模块**: 迁移数据库和认证模块
3. **路由层**: 迁移所有 API 路由
4. **工具类**: 迁移工具函数和中间件
   **结果**:

- 代码可读性提升 40%
- 维护成本降低 35%
- 团队协作效率提升 25%

---

[深入理解 TypeScript](https://jkchao.github.io/typescript-book-chinese/)<!-- nofollow -->
