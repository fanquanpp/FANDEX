---
order: 20
title: 本课程使用指南（先读这里）
module: 'typescript'
category: 前端技术
difficulty: beginner
description: TypeScript 零基础学习路线：环境先行、跳过规则、分层阅读路径与验收标准。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'typescript/030-TypeScriptOverviewEnvSetup'
  - 'typescript/080-BasicTypeSystem'
  - 'typescript/100-InterfaceTypeAlias'
  - 'typescript/720-TypeScriptFAQ'
prerequisites: []
---

## 0.1 TypeScript 类型能力速查

### 从 JavaScript 到 TypeScript 的升级路径

| JavaScript 写法 | TypeScript 增强 | 解决的问题 | 学习位置 |
| --- | --- | --- | --- |
| `let count = 0` | 类型推断为 `number` | 减少显式标注，保留类型安全 | 基础类型系统 |
| `function add(a, b)` | `function add(a: number, b: number): number` | 防止参数和返回值误用 | 函数类型 |
| 普通对象 | `interface User { id: string; name: string }` | 约束数据结构 | 接口与类型别名 |
| 任意数组 | `Array<User>` 或 `User[]` | 约束集合元素类型 | 泛型基础 |
| 字符串分支 | `'loading' | 'success' | 'error'` | 限制状态取值 | 联合类型 |
| 手写校验 | 自定义类型守卫 | 让运行时判断反馈给类型系统 | 类型守卫 |

### 第一周必须掌握的编译器选项

| 选项 | 推荐值 | 为什么重要 |
| --- | --- | --- |
| `strict` | `true` | 一次打开严格空值、函数参数、隐式 any 等检查 |
| `noImplicitAny` | `true` | 避免类型系统退化成普通 JavaScript |
| `strictNullChecks` | `true` | 区分空值和正常值，减少线上空指针错误 |
| `moduleResolution` | `bundler` 或 `node16` | 与现代构建工具或 Node ESM 对齐 |
| `noEmit` | 按项目决定 | 只做类型检查时交给 Vite、tsup 或 swc 输出 |

### 类型设计小练习

```ts
type CourseStatus = 'draft' | 'published' | 'archived';

interface Course {
  id: string;
  title: string;
  status: CourseStatus;
  lessons: number;
}

function canPublish(course: Course): boolean {
  return course.status === 'draft' && course.lessons > 0;
}
```

练习重点不是语法，而是把业务约束提前写进类型，让编辑器在保存前发现错误。


## 0. 这份资料怎么用

本模块有 75 篇文档，文件名前缀（010、020……730）大致就是学习顺序。**不要跳着读，也不要一次读完**。文档分三类：

**必读（零基础主线，约 3-4 周）**

1. [TypeScript 概述与环境配置](/typescript/030-TypeScriptOverviewEnvSetup)：先装环境、跑通第一个 TypeScript 程序；
2. [变量与基础类型](/typescript/040-TSBasicsVariablesAndTypes)到[泛型基础](/typescript/070-TSBasicsGenerics)：变量、函数、类、泛型四篇前篇；
3. [基础类型系统](/typescript/080-BasicTypeSystem)到[索引签名与动态属性](/typescript/140-IndexSignatureDynamicProperty)：类型系统核心（接口、字面量与联合、交叉、枚举、守卫）；
4. [类型兼容性](/typescript/200-TypeCompatibility)、[类型推断深入](/typescript/160-TypeInferenceDeepDive)、[as const](/typescript/170-ConstAssertion)、[never 语义](/typescript/190-NeverTypeSemantics)：理解"为什么能赋值、为什么报错"；
5. [命名空间与模块](/typescript/290-NamespaceModule)到[模块声明与全局类型增强](/typescript/340-ModuleDeclarationGlobalAugmentation)：声明文件与模块解析；
6. [工程化配置](/typescript/350-TypeScriptEngineeringConfig)、[项目示例：API 客户端](/typescript/690-TypeScriptProjectExampleTypeSafeAPIClient)、[项目实战：TODO 应用](/typescript/700-TypeScriptProjectExampleTodoApp)：工程化与实战收尾。

**按需查阅（遇到问题再回来看）**

- [高频疑问 FAQ](/typescript/720-TypeScriptFAQ)：高频疑问合集，先查这里再搜；
- [tsc 编译命令速查](/typescript/370-TscCompilerCommands)：tsc 命令速查；
- [类型测试与断言](/typescript/550-TypeTestingAndAssertions)：类型测试与断言；
- [环境配置](/typescript/030-TypeScriptOverviewEnvSetup)末尾的核心术语表与进阶新特性速览。

**进阶原理（有项目经验后再读）**

- 类型论与理论：[TypeScript 理论知识点](/typescript/710-TypeScriptTheory)、[satisfies 的形式语义](/typescript/185-SatisfiesTypeTheory)、[协变与逆变](/typescript/260-CovarianceContravariance)、[this 类型与多态](/typescript/240-ThisTypePolymorphism)；
- 类型体操：[实用模式](/typescript/530-TypeGymnasticsPracticalPatterns)、[深水区](/typescript/540-TypeGymnasticsBoundaries)、[条件类型三部曲](/typescript/430-ConditionalTypeDistribute)、[模板字面量类型](/typescript/500-TemplateLiteralType)；
- 编译器与性能：[编译与性能优化](/typescript/380-TypeScriptCompilePerformanceOptimization)、[TS 6.0 与 7.0](/typescript/680-TypeScript6And7CompilerEvolution)。

## 1. 为什么环境配置排在最前面

早期版本把"概述与环境配置"排在四篇前篇之后，零基础学习者会在前四篇里反复追问："我写的代码在哪里运行？tsc 是什么？"。本版已经调整：**第 01 课先装环境、跑通 `tsc`，再学语法**。语法学完立刻能在真实工程里验证，认知负担最小。

```mermaid
flowchart LR
    A["020 本指南"] --> B["030 环境配置<br/>跑通 tsc"]
    B --> C["040-070 前篇<br/>变量/函数/类/泛型"]
    C --> D["080-150 类型系统核心"]
    D --> E["160-200 兼容性/推断/const/never"]
    E --> F["290-350 声明文件/模块/工程配置"]
    F --> G["690-700 项目实战"]
    G --> H["370/550/720 命令/类型测试/FAQ 按需查阅"]
```

## 2. 三条阅读规则

**规则一：环境先行。** 先读[环境配置](/typescript/030-TypeScriptOverviewEnvSetup)并完成安装；前四篇前篇里的每一段代码都建议放进自己的工程里跑一遍，而不是只读。

**规则二：看到公式直接跳过。** 少数进阶文档会使用类型论记号（如 `Γ ⊢ e : τ`）。零基础第一遍只读代码示例、表格和"动手试试"，公式一律跳过。正文不再出现这类记号，需要了解时再看各篇文末的"进阶附录"（如[基础类型系统](/typescript/080-BasicTypeSystem)附录 A）。

**规则三：新特性速览可跳过。** [环境配置](/typescript/030-TypeScriptOverviewEnvSetup)末尾的 TS 5.x 新特性速览（const 类型参数、satisfies、using、NoInfer 等）是给有基础的人看的，第一遍读到正文"9. 总结"即可。`satisfies` 与 `as const` 都有独立成篇的系统讲解（[satisfies 操作符](/typescript/180-SatisfiesOperator)、[as const 完整讲解](/typescript/170-ConstAssertion)）。

## 3. 术语不认识怎么办

1. 先查[环境配置](/typescript/030-TypeScriptOverviewEnvSetup)末尾的"核心术语表"（零基础速查版）；
2. 再查[高频疑问 FAQ](/typescript/720-TypeScriptFAQ)的"概念对比"小节；
3. 进阶术语在各篇末尾的"术语表/附录"中查找。

## 4. 常见误区

| 误区 | 真相 |
| --- | --- |
| 把语法全部背下来 | 语法随用随查，重点是理解类型规则 |
| 跳过环境搭建直接看代码 | 没有运行环境，代码无法验证，学完就忘 |
| 一上来读类型体操 | 先会写业务类型，再学条件类型与体操 |
| 看到公式就觉得自己学不会 | 公式是进阶附录，跳过不影响主线 |
| 只读不敲 | 每段代码都亲手敲一遍，改一改看报错 |

## 5. 预期时间与验收标准

| 阶段 | 预期时间 | 验收标准 |
| --- | --- | --- |
| 第 1 周（030-070 前篇） | 6-8 小时 | 能独立初始化 tsconfig，写出带类型的变量、函数、类、泛型代码 |
| 第 2 周（080-200 类型系统） | 6-8 小时 | 能解释"为什么这个赋值合法"，会用类型守卫和索引签名 |
| 第 3 周（290-350 模块与工程） | 5-7 小时 | 能读懂 .d.ts，正确使用 import type 与模块解析配置 |
| 第 4 周（690-700 项目实战） | 8-10 小时 | 能独立完成 TODO 项目实战，并解释关键类型设计 |

## 6. 一句话记住

> 先跑通环境，再学语法；公式跳过、代码必敲；遇到问题先查 FAQ 和术语表。
