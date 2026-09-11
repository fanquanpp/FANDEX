---
order: 720
title: TypeScript 高频疑问 FAQ 合集
module: 'typescript'
category: 前端技术
difficulty: beginner
description: 按主题整理 TypeScript 学习中的高频疑问：any/unknown、interface/type、as/satisfies、import type、推断与收窄等。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'typescript/020-HowToReadThisCourse'
  - 'typescript/080-BasicTypeSystem'
  - 'typescript/100-InterfaceTypeAlias'
  - 'typescript/180-SatisfiesOperator'
  - 'typescript/320-ImportTypeVerbatimModuleSyntax'
prerequisites: []
---

## 0. 使用说明

本篇是**按主题查阅**的 FAQ 合集，不按顺序读。学习过程中遇到疑问，先在目录找对应小节；找不到再回对应正文章节查。每个问题都给出"一句话答案"和"详细说明"。

## 1. any、unknown、never 到底什么区别

**一句话答案**：`any` 关闭检查；`unknown` 是"未知但必须验证"；`never` 是"不存在"。三者分别对应"随便用""先用后验""不可能有值"。

```typescript
let a: any = 1;
a.toUpperCase(); // 不报错（运行时可能崩溃）

let u: unknown = "hi";
// u.toUpperCase(); // 报错：unknown 必须先收窄
if (typeof u === "string") {
  u.toUpperCase(); // 合法：收窄后是 string
}

function fail(): never {
  throw new Error("必然失败");
}
```

**详细说明**：`any` 是类型系统的"逃生门"，能不用就不用；`unknown` 是类型安全的"未知"，从外部来的数据都应该先用它接住，再通过类型守卫收窄（见 `016-TypeGuardCustomGuard`）；`never` 的完整语义见 `NeverTypeSemantics`。

## 2. interface 和 type 到底用哪个

**一句话答案**：能用 interface 就用 interface，需要联合、交叉、映射、条件等"类型运算"时用 type；两者绝大多数场景可以互换。

| 能力 | interface | type 别名 |
| --- | --- | --- |
| 描述对象/函数形状 | 支持 | 支持 |
| 联合类型 | 不支持 | 支持 |
| 交叉合并 | 通过 extends | 通过 & |
| 声明合并（同名自动合并） | 支持 | 不支持 |
| 映射/条件/模板字面量类型 | 不支持 | 支持 |

**详细说明**：interface 的声明合并让库的全局扩展成为可能（如给 `Window` 增加属性）；type 更灵活，是"给任何类型起名字"。社区惯例：先 interface，需要类型运算时换 type。完整对比见 `007-InterfaceTypeAlias`。

## 3. as 断言、satisfies、类型注解什么区别

**一句话答案**：注解声明"我想要什么类型"；`as` 强制"我说是什么就是什么"；`satisfies` 只校验"形状对不对"而不改变推断。

```typescript
const a: string = "x"; // 注解：把值放进 string 格子
const b = "x" as string; // 断言：绕过检查声明它是 string
const c = { mode: "dev" } satisfies Record<string, string>;
// 校验通过，且 c.mode 的类型是 "dev"（保留字面量，不拓宽）
```

**详细说明**：`as` 能双向收窄/放宽类型，但也可能掩盖真实错误，能用注解或 satisfies 就别用 as；`satisfies` 是 TS 4.9+ 的"校验不改变"工具，完整讲解见 `049-SatisfiesOperator`。

## 4. import type 和普通 import 什么区别

**一句话答案**：普通 import 会生成运行时代码，`import type` 只导入类型，编译后完全消失。

```typescript
import { createUser, type User } from "./models";
// createUser 是值，运行时保留
// User 是类型，编译后剔除
```

**详细说明**：开启 `verbatimModuleSyntax` 后，类型必须显式写 `type`，否则报错。class 既是值又是类型，普通导入即可。详见 `ImportTypeVerbatimModuleSyntax`。

## 5. 为什么 let 推断成 number，const 推断成 1

**一句话答案**：`let` 允许重新赋值，类型必须放宽；`const` 不可变，可以保留最精确的字面量类型。

```typescript
let x = 1; // number
const y = 1; // 1
```

**详细说明**：这是"字面量拓宽"规则。对象属性、数组元素默认也会拓宽；想保留字面量用 `as const`（见 `ConstAssertion`）或 `satisfies`。完整机制见 `TypeInferenceDeepDive`。

## 6. 为什么对象字面量多一个属性报错，变量不报错

**一句话答案**：因为"多余属性检查"只针对新鲜的对象字面量；通过变量中转后只做结构化兼容检查。

```typescript
interface User { name: string; age: number }

// 报错：多余属性检查
// const u1: User = { name: "A", age: 1, email: "x" };

// 不报错：变量中转
const person = { name: "A", age: 1, email: "x" };
const u2: User = person;
```

**详细说明**：多余属性检查是防拼写错误的额外防线，兼容规则本身允许"多余属性"。详见 `TypeCompatibility`。

## 7. 函数参数什么时候协变、什么时候逆变

**一句话答案**：返回值永远协变（返回子类型安全）；参数在 `strictFunctionTypes` 下逆变（参数要更宽），方法语法默认双变。

```typescript
type Animal = { name: string };
type Dog = Animal & { bark(): void };

const getDog: () => Dog = () => ({ name: "d", bark() {} });
const getAnimal: () => Animal = getDog; // 合法：返回 Dog 是 Animal 的子类型
```

**详细说明**：参数逆变的直觉是"调用方可能传入任何 Animal"，所以处理函数必须能接受所有 Animal。完整理论见 `026-CovarianceContravariance`，入门版见 `TypeCompatibility`。

## 8. enum 和 as const 对象怎么选

**一句话答案**：需要反向映射或大量运行时特性用 enum；只需要一组常量值和联合类型用 `as const` 对象，更轻量。

```typescript
// as const 方案：类型与值一体，编译后就是普通对象
const Status = {
  Pending: "pending",
  Done: "done",
} as const;
type StatusValue = (typeof Status)[keyof typeof Status]; // "pending" | "done"
```

**详细说明**：enum 在运行时生成额外对象，`const enum` 又被单文件编译限制；`as const` 对象与结构化类型天然兼容，现代项目更常用。详见 `030-EnumAdvanced` 与 `ConstAssertion`。

## 9. 泛型箭头函数在 .tsx 里怎么写

**一句话答案**：在尖括号加逗号，避免与 JSX 语法冲突。

```tsx
// 报错：<T> 被 JSX 解析器当成标签
// const id = <T>(x: T) => x;

// 正确：<T,> 或 extends 约束
const id = <T,>(x: T): T => x;
const id2 = <T extends unknown>(x: T): T => x;
```

**详细说明**：这只影响 .tsx 文件；.ts 文件不需要逗号。泛型基础见 `005-TSBasicsGenerics`。

## 10. strict 模式到底开不开

**一句话答案**：开。`strict` 是全家桶开关，包含 `strictNullChecks`、`noImplicitAny` 等；新项目一律开启，老项目逐步迁移。

**详细说明**：`strict` 关掉后，null 可以赋给任何类型、隐式 any 不报错，类型安全形同虚设。每个开关的作用见 `057-TsconfigStrictMode`，迁移策略见 `050-TypeScriptMigrationPractice`。

## 11. 报错信息看不懂怎么办

**一句话答案**：先看错误码（如 TS2322），再看"期望类型 vs 实际类型"两行，最后定位文件与行号。

**常见错误码速查**：

| 错误码 | 含义 | 常见原因 |
| --- | --- | --- |
| TS2322 | 类型不能赋给目标类型 | 形状不兼容、缺属性、类型太窄 |
| TS2554 | 参数数量不匹配 | 少传或多传参数 |
| TS2531 | 可能为 null/undefined | strictNullChecks 下未收窄 |
| TS2339 | 属性不存在 | 拼写错误或类型太宽 |
| TS2345 | 实参类型不匹配 | 传参类型与形参不兼容 |
| TS2769 | 没有匹配的重载 | 参数组合不在重载签名内 |

**详细说明**：报错信息里的"Type X is not assignable to type Y"就是兼容规则（见 `TypeCompatibility`）的应用；把两边的类型展开对比，绝大多数问题一眼可见。

## 12. 声明文件 .d.ts 和 .ts 怎么选

**一句话答案**：实现代码放 .ts，给第三方库补类型或声明全局变量用 .d.ts。

**详细说明**：.d.ts 只含类型声明，不产生运行时代码；手写第三方类型适配、全局变量声明、模块扩展都需要它。完整讲解见 `021-DeclarationFileWriting`。

## 13. 学了这么多类型，实战里怎么用

**一句话答案**：从边界开始：接口输入输出用类型建模，外部数据先 unknown 再守卫，状态用联合类型，分支用穷尽检查。

**详细说明**：完整可运行的例子见 `TypeScriptProjectExampleTodoApp`（前后端 TODO）与 `059-TypeScriptProjectExampleTypeSafeAPIClient`（类型安全 API 客户端）。

## 14. 一句话记住

> 遇到疑问先查 FAQ：any/unknown/never 分清楚，interface 优先、type 灵活，as 慎用、satisfies 校验，import type 只留类型，strict 必须开。

## 扩展阅读

- 各问题对应正文章节已在文中给出；
- 学习路线与阅读规则见 `001-HowToReadThisCourse`；
- 术语速查见 `001-TypeScriptOverviewEnvSetup` 末尾的核心术语表。
