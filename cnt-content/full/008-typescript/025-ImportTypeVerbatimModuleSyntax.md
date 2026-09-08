---
order: 250
title: import type 与 verbatimModuleSyntax
module: 'typescript'
category: 前端技术
difficulty: intermediate
description: 值导入与类型导入的区别、import type 的写法、verbatimModuleSyntax 与 isolatedModules 的作用及常见陷阱。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'typescript/026-ModuleResolutionModernToolchains'
  - 'typescript/024-DeclarationFileWriting'
  - 'typescript/060-TsconfigStrictMode'
  - 'typescript/032-NamespaceModule'
prerequisites:
  - 'typescript/009-InterfaceTypeAlias'
  - 'typescript/011-FunctionGeneric'
---

## 0. 学习目标（可验证）

- [ ] 能区分"值导入"与"类型导入"，并说明编译后的差异
- [ ] 能写出 `import type` 的三种等价写法
- [ ] 能解释 `verbatimModuleSyntax` 的语义和它解决的问题
- [ ] 能说明 `isolatedModules` 为什么要求类型导入显式化
- [ ] 能避开 class、const enum 等"既是值又是类型"的陷阱

## 1. 一句话理解

> 普通 `import` 会生成运行时代码（真的去加载模块），`import type` 只导入类型，**编译后什么都不留下**。

## 2. 值导入与类型导入

```typescript
// models.ts
export interface User {
  name: string;
}

export function createUser(name: string): User {
  return { name };
}
```

```typescript
// app.ts
import { createUser, User } from "./models";

// createUser 是"值"：运行时真的存在，编译后保留 import
const user = createUser("Alice");

// User 是"类型"：只在编译期存在，编译后 import 里只留下 createUser
const u: User = { name: "Bob" };
```

**拆解化讲解：**

（1）`createUser` 是函数，JavaScript 运行时需要它，所以编译后的 `require("./models")` 必须保留；

（2）`User` 是接口，编译后不存在，TypeScript 会自动把它从 import 中剔除；

（3）"自动剔除"依赖编译器全局分析；当代码被拆成单文件独立编译（如 Babel、esbuild、ts-node 的部分模式）时，编译器看不到"这个标识符到底是不是类型"，就容易出错——这就是下一节的问题。

## 3. import type 的三种写法

```typescript
// 写法一：整体类型导入
import type { User } from "./models";
import { createUser } from "./models";

// 写法二：行内类型修饰符（同一行混合）
import { createUser, type User } from "./models";

// 写法三：默认导出的类型
import type DefaultType from "./types";
```

**拆解化讲解：**

（1）写法一最清晰：类型导入与值导入分开两行；

（2）写法二适合"一个模块既导值又导类型"的场景，`type` 关键字只修饰 `User`；

（3）三种写法编译后都不包含类型导入部分；如果整个 import 都是类型，编译后整行消失。

## 4. 什么时候必须用 import type

**场景一：isolatedModules（单文件独立编译）**

`isolatedModules` 开启时，每个文件都被当成独立单元编译。没有 `import type` 时，编译器无法确定 `User` 是类型还是值（它可能是个类），于是可能产生错误的运行时导入。

```typescript
// 开启 isolatedModules 后：
// 必须明确写出 type，让每个单文件编译器都知道该剔除什么
import type { User } from "./models";
```

**场景二：verbatimModuleSyntax（保留原样语义）**

`verbatimModuleSyntax` 要求 import 写法与最终运行时行为完全一致：

- 写成 `import type` 的，保证不生成运行时导入；
- 普通 `import` 中出现的标识符，必须是真正的值。

```typescript
// 开启 verbatimModuleSyntax 后，下面这行会报错：
// import { User } from "./models";
// User 是类型，却写在普通 import 里

// 正确写法：
import type { User } from "./models";
```

**场景三：const enum 与循环导入**

- `const enum` 在编译期被内联，如果普通导入它，单文件编译会找不到定义；
- 循环导入中，类型导入不会产生运行时依赖，可以打破循环。

## 5. verbatimModuleSyntax 完整语义

`verbatimModuleSyntax` 是 TypeScript 5.0 引入的开关，取代了旧的 `importsNotUsedAsValues` 与 `preserveValueImports`。它只有一条规则：**import 怎么写，运行时就是什么样**。

```typescript
// 开启后：
import { createUser, type User } from "./models";
// 编译产物（CommonJS 风格）：
// const models_1 = require("./models");
// const user = (0, models_1.createUser)("Alice");
// 类型 User 的导入没有任何运行时痕迹

// 错误示范：类型写进普通 import
// import { User } from "./models"; // 报错
```

**拆解化讲解：**

（1）开启前，编译器会自动分析并剔除类型导入，写法可以偷懒；

（2）开启后，类型必须用 `type` 标记，值必须用普通导入，两者泾渭分明；

（3）代价是写法更严格，收益是任何单文件编译器（Babel、esbuild、swc）都能得到与 tsc 一致的产物，且运行时导入列表完全可预测。

**推荐组合**：`"module": "nodenext"` 或 `"module": "preserve"` 时开启 `verbatimModuleSyntax`；使用 bundler 时开启 `isolatedModules`。两者不要同时依赖"自动剔除"的旧行为。

## 6. 常见陷阱

**陷阱一：class 既是值又是类型**

```typescript
// models.ts
export class Logger {
  log(msg: string) {
    console.log(msg);
  }
}

// app.ts
// Logger 同时是值（类构造函数）和类型（实例类型）
// 普通导入两个用途都需要：
import { Logger } from "./models";

const logger = new Logger(); // 作为值使用
function run(l: Logger): void { // 作为类型使用
  l.log("hi");
}
```

普通 `import` 对 class 是对的：既当构造函数又当类型。但如果你只把 `Logger` 当类型用（比如只写参数注解），应该用 `import type`，这样不会引入运行时依赖。

**陷阱二：值被当成类型导入**

```typescript
// 错：createUser 是函数（值），不能 import type
// import type { createUser } from "./models";
// 报错：createUser 是值，import type 只能导入类型

// 对：
import { createUser } from "./models";
```

**陷阱三：接口和类型别名在编译后消失，但运行时库可能要求"值"**

```typescript
// 错：把类型当值传给运行时 API
// api.register(User); // User 编译后不存在
// 对：运行时需要的是真实的值（类、函数、对象）
api.register(UserSchema); // 某个运行时校验器
```

**陷阱四：忘记开启开关，混合编译器下出现幽灵导入**

在 Vite/Babel 项目中，单文件编译与 tsc 类型检查并存；没有 `isolatedModules` 或 `verbatimModuleSyntax` 时，某些类型导入可能被保留为运行时导入，导致"模块不存在"的运行时错误。开启开关后这类问题会在编译期暴露。

## 7. 常见错误与修正（错-对对比）

```typescript
// 错：类型写在普通 import 里（verbatimModuleSyntax 开启时报错）
// import { User } from "./models";

// 对：类型用 type 标记
import { createUser, type User } from "./models";

// 错：把值导入写成类型导入
// import type { createUser } from "./models";

// 对：值用普通导入
import { createUser } from "./models";
```

## 8. 动手试试

**入门版**：

1. 新建 `models.ts`（含一个 interface 和一个 function）与 `app.ts`；
2. 分别用普通 import 和 `import type` 写一遍；
3. 执行 `npx tsc --module commonjs --outDir dist`，查看 `dist/app.js` 中 import 的差异。

**进阶版**：在 tsconfig 中依次开启 `isolatedModules` 与 `verbatimModuleSyntax`，把 `import { User }` 这类写法分别放进去，观察报错信息，再用 `type` 修正。

## 9. 常见疑问 FAQ

**Q1：import type 会提升性能吗？**

会减少运行时的模块加载，但更重要的是正确性：单文件编译时不会产生"幽灵导入"导致的运行时错误。

**Q2：interface 和 type 都用 import type，class 呢？**

class 是值，普通导入；如果只当类型注解用，可以用 `import type`，但要确认没有 `new` 调用。

**Q3：verbatimModuleSyntax 和 isolatedModules 有什么区别？**

`isolatedModules` 解决"每个文件独立编译时能否确定类型"的问题；`verbatimModuleSyntax` 解决"import 写法与运行时产物是否一致"的问题。前者更老、范围更大，后者语义更精确，现代项目优先开后者。

**Q4：import type 能导入默认导出的类吗？**

能，但只能当类型用：`import type Logger from "./logger"` 后 `new Logger()` 会报错，因为类型导入不产生运行时值。

**Q5：旧项目里 importsNotUsedAsValues 还要管吗？**

TS 5.0 起推荐直接迁移到 `verbatimModuleSyntax`，旧的三个开关（remove/preserve/error）已不推荐使用。

## 10. 自测（小测验）

**第 1 题（判断）**：`import type { User }` 编译后会生成 `require("./models")`。

**第 2 题（填空）**：class 在 import 场景中既是____又是____。

**第 3 题（单选）**：verbatimModuleSyntax 开启后，`import { User }`（User 是 interface）会怎样？

<details>
<summary>点击查看答案</summary>

1. 错误。import type 不生成任何运行时导入。
2. 值（构造函数）和类型（实例类型）。
3. 报错。类型必须用 `type` 标记，普通 import 只能导入值。

</details>

## 11. 一句话记住

> 值用普通 import，类型用 import type；verbatimModuleSyntax 让"怎么写"等于"运行时是什么"。

## 扩展阅读

- `023-ModuleResolutionInModernJavaScriptToolchains`：模块解析策略与 exports/imports 字段；
- `021-DeclarationFileWriting`：声明文件中的导入导出写法；
- `057-TsconfigStrictMode`：isolatedModules 等编译选项详解；
- `029-NamespaceModule`：命名空间与模块的边界。
