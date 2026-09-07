---
order: 660
title: TypeScript 类型测试与断言
module: 'typescript'
category: 前端技术
difficulty: advanced
description: 类型也是代码，也要测试。用 tsd 写 expectType、expectError 断言，在重构时守住类型行为不回归。
author: fanquanpp
updated: '2026-08-30'
related:
  - 'typescript/034-UtilityTypePrinciple'
  - 'typescript/053-TypeScriptMigrationPractice'
prerequisites:
  - 'typescript/011-FunctionGeneric'
---


## 概述

类型测试是"类型层 API"的回归测试：运行时测试验证值的行为，类型测试验证编译器眼中的形状。工具类型、泛型函数与声明文件是暴露给其他开发者的"类型层 API"，重构时最容易悄悄改变推断结果，而普通单测根本覆盖不到编译期错误。为此 tsd 提供 `expectType`、`expectAssignable`、`expectError` 三种断言，让类型测试像单元测试一样写在 `.test-d.ts` 文件中；TypeScript 编译器本身也提供 `@ts-expect-error` 注释，用于断言"下一行必须报错"。本文从最小示例到进阶用例，说明如何为工具类型和泛型函数建立可回归的类型契约，并指出 `as` 断言等常见误区。

## 为什么需要

- 工具类型、泛型函数是"类型层面的 API"，重构时容易悄悄改变推断结果。
- 类型错误只在编译时报，普通单测覆盖不到。
- 发布库给他人用时，类型行为就是文档，必须可验证。

## 核心 API：三个断言

| 辅助函数 | 作用 |
| --- | --- |
| `expectType<T>(value)` | 断言 value 的类型与 T 完全一致 |
| `expectAssignable<T>(value)` | 断言 value 可以赋值给 T（宽松版） |
| `expectError(value)` | 断言这行代码**必须**产生类型错误 |

## 最小示例

先安装并配置：

```bash
pnpm add -D tsd
json
// package.json 增加测试脚本
{
  "scripts": {
    "test:types": "tsd"
  },
  "types": "./dist/index.d.ts"
}
```

编写类型测试文件（默认放在 `index.test-d.ts`，与被测声明文件对应）：

```typescript
import { expectType, expectError } from 'tsd';
import { createPair } from './index';

// 断言返回值类型
expectType<{ first: string; second: number }>(createPair('a', 1));

// 断言推断失败：传错类型应该报错
expectError(createPair('a', 'b'));
```

被测代码：

```typescript
// index.ts
export function createPair<A, B>(first: A, second: B) {
  return { first, second };
}
```

运行 `pnpm test:types`，类型不匹配或该报错没报错都会让测试失败。

## 进阶：给工具类型写契约

```typescript
import { expectType, expectError } from 'tsd';

// 自定义工具类型：取出数组元素类型
type ElementOf<T extends readonly unknown[]> = T[number];

expectType<string>(null as unknown as ElementOf<string[]>);
expectType<number | boolean>(null as unknown as ElementOf<Array<number | boolean>>);
expectError<ElementOf<string>>(); // 非数组类型应触发约束错误
```

## 常见误区

| 误区 | 真相 |
| --- | --- |
| 用 `as` 断言测类型 | 双重断言会绕过类型检查，测了个寂寞 |
| `expectError` 越多越好 | 每一行 `expectError` 都必须是**有意**的错误，防止"误伤" |
| 类型测试放在运行时测试里 | 建议独立脚本，运行时测试与类型测试关注点不同 |
| 只测库不测应用 | 应用的复杂泛型同样值得写契约测试 |

## 小结

类型测试的成本很低：一个断言文件 + 一个脚本命令。
对工具类型、泛型函数、声明文件这些"类型 API"建立契约，重构时 `pnpm test:types`
就能替你守住边界。下一步可结合 声明文件编写
理解断言与声明的关系。
