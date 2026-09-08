---
order: 150
title: as const 完整讲解（const 断言）
module: 'typescript'
category: 前端技术
difficulty: intermediate
description: as const 的完整语义：字面量收窄、递归只读、数组转元组，以及与类型注解、satisfies、enum 的取舍。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'typescript/014-TypeInferenceDeepDive'
  - 'typescript/052-SatisfiesOperator'
  - 'typescript/033-EnumAdvanced'
  - 'typescript/013-LiteralUnionTypes'
prerequisites:
  - 'typescript/008-BasicTypeSystem'
  - 'typescript/013-LiteralUnionTypes'
---

## 0. 学习目标（可验证）

- [ ] 能说出 `as const` 的三个核心效果
- [ ] 能解释 `as const` 与类型注解（`: "dev"`）的区别
- [ ] 能说明 `as const` 为什么让对象属性变成 readonly、数组变成元组
- [ ] 能组合使用 `as const` 与 `satisfies`
- [ ] 能根据场景在 enum、as const 对象、联合类型之间做选择

## 1. 一句话理解

> `as const` = 告诉编译器："这个东西永远不会变，请给我最精确的类型。" 它同时做三件事：字面量收窄、递归只读、数组变元组。

## 2. 为什么需要 as const

默认情况下，编译器会把字面量**拓宽**：`let x = 1` 推断为 `number`，对象属性 `{ mode: "dev" }` 的属性推断为 `string`。这在大多数时候是合理的，但当你需要"精确类型"时（比如路由表、配置映射、联合类型来源），拓宽反而碍事。

```typescript
// 默认：mode 被拓宽成 string
const config = { mode: "dev" };
// config.mode 的类型是 string

// as const：mode 保留为字面量 "dev"，并且整个对象只读
const strictConfig = { mode: "dev" } as const;
// strictConfig.mode 的类型是 "dev"
```

**拆解化讲解：**

（1）没有 `as const` 时，对象属性可能被重新赋值，所以编译器放宽类型；

（2）`as const` 表达"这个对象及其所有嵌套内容都不变"，编译器因此敢保留最精确的字面量；

（3）代价是属性变成 readonly，尝试赋值 `strictConfig.mode = "prod"` 会报错——这正是"不变"承诺的一部分。

## 3. 三个核心效果

### 效果一：字面量收窄

```typescript
const direction = "up" as const; // 类型是 "up"
let port = 8080 as const; // 类型是 8080
const enabled = true as const; // 类型是 true
```

注意 `as const` 可以作用于 `let` 变量：`let port = 8080 as const` 的变量类型是 `8080`，之后 `port = 9090` 会报错。

### 效果二：递归只读

```typescript
const settings = {
  theme: {
    dark: true,
    colors: ["#111", "#eee"],
  },
} as const;

// settings.theme.dark 的类型是 true
// settings.theme.colors 的类型是 readonly ["#111", "#eee"]
// settings.theme.dark = false; // 报错：只读
// settings.theme.colors.push("#fff"); // 报错：readonly 元组没有 push
```

**拆解化讲解：**

（1）`as const` 是**递归**的，嵌套对象、嵌套数组全部生效；

（2）数组变成 `readonly` 元组：长度和元素类型都被锁死，且失去 `push` 等修改方法；

（3）这与"顶层 const"不同：普通 `const` 只锁变量名，`as const` 锁的是整个值结构。

### 效果三：数组变元组

```typescript
const fruits = ["apple", "banana"] as const;
// 类型：readonly ["apple", "banana"]

const first = fruits[0]; // 类型是 "apple"（不再是 string）
// fruits.push("cherry"); // 报错：readonly
```

普通数组 `string[]` 只告诉你"元素是字符串"，元组 `["apple", "banana"]` 还告诉你"第一个是 apple、第二个是 banana"。`as const` 把数组精确到元素级别。

## 4. as const 与类型注解的区别

```typescript
// 类型注解：只约束最外层，属性仍然是 string
const config: { mode: "dev" | "prod" } = { mode: "dev" };
// config.mode 可以读取，但不能改成 "test"

// as const：保留字面量，同时递归只读
const config2 = { mode: "dev" } as const;
// config2.mode 是 "dev"
```

**拆解化讲解：**

（1）注解定义"格子长什么样"，`as const` 定义"值有多精确"；

（2）注解不会让对象只读，`as const` 会；

（3）注解适合"值可变、但范围受限"的场景（如运行时配置），`as const` 适合"值不变、且类型要精确"的场景（如常量表）。

## 5. as const 与 satisfies 配合

`satisfies` 负责"校验但不改变推断"，`as const` 负责"锁死精确类型"，两者组合是 TypeScript 4.9+ 的经典配方。

```typescript
const routes = {
  home: "/",
  user: (id: number) => `/user/${id}`,
} as const satisfies Record<string, string | ((id: number) => string)>;

// 校验通过：每个值都是 string 或函数
// 类型保留：routes.home 是 "/"，routes.user 是 (id: number) => string
const home = routes.home; // 类型是 "/"
const path = routes.user(1); // 类型是 string
```

**拆解化讲解：**

（1）单独用 `satisfies`：校验形状，但不改变推断（不拓宽也不收窄字面量）；

（2）单独用 `as const`：锁死字面量，但不校验形状；

（3）合用时，`as const` 在左、`satisfies` 在右，先锁死再校验，二者各司其职。顺序写反会导致 `satisfies` 的结果被 `as const` 重新收窄，校验仍然有效但类型语义不同，容易误解。

## 6. 常见错误与修正（错-对对比）

**错误 1：顺序写反**

```typescript
// 错：先 satisfies 再 as const，语义混乱
// const a = { x: 1 } satisfies Record<string, number> as const;
// 语法上也不允许这样组合

// 对：as const 在前
const b = { x: 1 } as const satisfies Record<string, number>;
```

**错误 2：以为 as const 能阻止运行时修改**

```typescript
const arr = [1, 2] as const;
// 类型上 readonly，但运行时仍然可以修改（类型层面会报错）
// 类型安全 ≠ 运行时保护：需要运行时冻结请用 Object.freeze
```

**错误 3：把 as const 用在函数返回值上**

```typescript
// 错：as const 不能直接修饰函数返回表达式来改变函数签名
// function f() {
//   return { x: 1 } as const;
// }
// 这其实是合法的（返回字面量类型），但常见误解是它会影响函数参数或 this

// 对：需要精确返回类型时，配合显式返回注解更清晰
function f(): { readonly x: 1 } {
  return { x: 1 } as const;
}
```

**错误 4：过度使用导致类型僵化**

```typescript
// 错：所有对象都加 as const，API 变得无法扩展
// 对：只在需要精确字面量、只读语义的常量表/配置映射中使用
```

## 7. 动手试试

**入门版**：

1. 声明 `const c = { a: 1, b: ["x", "y"] }`，查看类型；
2. 加上 `as const` 再看类型，对比差异；
3. 尝试修改 `c.a` 和 `c.b[0]`，观察报错。

**进阶版**：用 `as const satisfies` 定义一个支持中英文的页面标题映射：

```typescript
const titles = {
  home: { zh: "首页", en: "Home" },
  about: { zh: "关于", en: "About" },
} as const satisfies Record<string, { zh: string; en: string }>;
```

验证：`titles.home.zh` 的类型是 `"首页"`，而传入不完整对象会报错。

## 8. 常见疑问 FAQ

**Q1：as const 和 readonly 有什么关系？**

`as const` 是"语法糖式断言"，效果之一是让所有属性变成 readonly；`readonly` 是类型层面的修饰符，可以单独用于接口/类型别名。`as const` 更适合字面量值，`readonly` 更适合类型定义。

**Q2：as const 能用在哪些值上？**

字符串、数字、布尔、对象字面量、数组、元组。不能用于变量引用（`const x = y as const` 中 `y` 必须是字面量或已被推断的字面量结构），对类实例等引用值没有"递归冻结"语义。

**Q3：enum 和 as const 对象怎么选？**

需要运行时值 + 反向映射用 enum；只需要一组字面量联合和常量表时，`as const` 对象更轻量、没有运行时开销且与结构化类型更融洽。详见 `030-EnumAdvanced`。

**Q4：as const 会影响性能吗？**

不会。它纯粹是编译期类型操作，不生成任何运行时代码。

**Q5：什么时候不该用 as const？**

值需要在运行时被修改、需要动态扩展（如插件注册表）、或类型需要保持宽松时，都不该用。

## 9. 自测（小测验）

**第 1 题（填空）**：`const x = [1, 2] as const` 的类型是____。

**第 2 题（判断）**：`as const` 能让对象在运行时不可修改。

**第 3 题（单选）**：下面哪种写法同时做到"校验形状且保留字面量类型"？

```typescript
// A. { x: 1 } as const satisfies Record<string, number>
// B. { x: 1 } satisfies Record<string, number> as const
// C. const a: Record<string, number> = { x: 1 }
```

<details>
<summary>点击查看答案</summary>

1. `readonly [1, 2]`。
2. 错误。类型层面只读，运行时修改仍然可能发生；需要运行时保护用 Object.freeze。
3. A。先 as const 锁死字面量，再 satisfies 校验形状。

</details>

## 10. 一句话记住

> as const 三件事：字面量收窄、递归只读、数组变元组；配合 satisfies 先锁死再校验。

## 扩展阅读

- `TypeInferenceDeepDive`：拓宽机制与 let/const 推断差异；
- `049-SatisfiesOperator`：satisfies 与 as 的完整对比；
- `030-EnumAdvanced`：enum 与 as const 对象的取舍；
- `010-LocalTypeInference`：字面量类型与联合类型的应用。
