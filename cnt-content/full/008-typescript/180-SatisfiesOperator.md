---
order: 180
title: satisfies 操作符
module: 'typescript'
category: 前端技术
difficulty: intermediate
description: 用真实项目里的主题令牌与路由表切入，讲清 satisfies「只验证、不拓宽」的语义：与类型注解、as 断言的三方对比，as const satisfies 组合模式，以及拓宽、数组、泛型推断等典型坑点。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'typescript/185-SatisfiesTypeTheory'
  - 'typescript/170-ConstAssertion'
  - 'typescript/670-TypeScript5xNewFeatures'
  - 'typescript/350-TypeScriptEngineeringConfig'
  - 'typescript/590-TypeSafeEnvVar'
prerequisites:
  - 'typescript/170-ConstAssertion'
  - 'typescript/110-LiteralUnionTypes'
---

## 学习目标

- [ ] 能说出 satisfies 与类型注解 `: T`、断言 `as T` 的核心区别（验证谁、结果类型是谁）
- [ ] 能用 `as const satisfies` 写一份既校验字段、又保留字面量类型的配置表
- [ ] 能解释「satisfies 不拓宽，但也不加深」这句话的含义
- [ ] 能避免函数返回值注解、书写顺序、数组字面量三个高频坑
- [ ] 能判断一个场景该用 `: T`、`as T` 还是 `satisfies T`

## 一句话理解

> `satisfies` = 「按 `T` 检查一遍，但表达式的类型保持原样」。类型注解 `: T` 是「检查并改成 `T`」，断言 `as T` 是「不检查，直接说是 `T`」。satisfies 是唯一一个「检查了，但什么都没改」的写法。

## 0. 真实场景：一份主题令牌表

FANDEX 这个文档站是双主题设计：亮色 / 暗色两套配色令牌。令牌表的理想要求有三条：

1. 每个令牌值必须符合约定格式（颜色是 `#rrggbb`，别把拼写错误放进来）；
2. 想用 `keyof` 把「令牌名」提取成联合类型，供组件 Props 使用；
3. 在组件里写 `tokens.color.surface` 时，自动补全要能列出全部令牌名。

先写第一版：

```typescript
// theme.ts —— 第一版：只用类型注解
type TokenMap = Record<string, string>;

export const tokens: TokenMap = {
  'color.surface': '#ffffff',
  'color.text': '#1a1a2e',
  'color.accent': '#4f6df5',
};
```

这版能编译，但两个需求立刻落空：

```typescript
// 问题一：tokens 的类型就是 TokenMap（Record<string, string>），
// keyof 只能拿到 string，令牌名的联合类型无从谈起
type TokenName = keyof typeof tokens; // string —— 没用

// 问题二：多写、少写、拼错键名，编译器一概不管
export const tokens2: TokenMap = {
  'color.sruface': '#ffffff', // 拼错了，没有任何提示
};
```

注解 `: TokenMap` 把整个对象的类型「拍平」成了注解的类型——键名信息全丢了。换成 `satisfies`，三条需求一次满足：

```typescript
// theme.ts —— 第二版：satisfies
type TokenMap = Record<`color.${string}`, string>;

export const tokens = {
  'color.surface': '#ffffff',
  'color.text': '#1a1a2e',
  'color.accent': '#4f6df5',
} satisfies TokenMap;

// 1. 类型验证仍然生效：键名必须以 color. 开头
export const broken = {
  'bg.surface': '#ffffff', // 错误：对象字面量只能指定已知属性，
  //      且 '"bg.surface"' 不符合索引签名 `color.${string}`
} satisfies TokenMap;

// 2. 具体类型被完整保留
type TokenName = keyof typeof tokens;
// 'color.surface' | 'color.text' | 'color.accent' —— 正是想要的联合类型

// 3. 编辑器补全 tokens. 时，会列出全部三个令牌名
```

`satisfies` 只在编译期做了一次「赋值兼容性检查」，检查完就退到一边，不改变表达式的类型。这就是它全部的价值来源。

## 1. 动手：三种写法对照实验

同一个对象，分别用三种写法落地，观察类型差异。建议在 [TypeScript Playground](https://www.typescriptlang.org/play) 里跟着敲一遍，鼠标悬停看推断结果。

```typescript
type RouteConfig = {
  path: string;
  auth: boolean;
};

// 写法一：类型注解 —— 检查通过后，类型变成 RouteConfig
const r1: RouteConfig = { path: '/docs', auth: false };
r1.path; // string —— 字面量 '/docs' 没了

// 写法二：类型断言 —— 不检查，类型被强行声明为 RouteConfig
const r2 = { path: '/docs', auth: false, typo: 'yes' } as RouteConfig;
// 多出来的 typo 属性、任何字段错误都不会被发现（as 只在两个类型
// 「互有重叠」时才拒绝，重叠面宽得很）

// 写法三：satisfies —— 检查，且保留原类型
const r3 = { path: '/docs', auth: false } satisfies RouteConfig;
r3.path; // '/docs' —— 字面量还在（对象在 const 声明下，属性不再拓宽）
//        （严格说：字符串字面量在对象属性位置本会拓宽为 string，
//         见第 3 节的精确规则；这里 r3 的效果与 as const 组合有关）

const r4 = {
  path: '/docs',
  auth: 'no', // 错误：string 不能赋给 boolean —— 检查确实发生了
} satisfies RouteConfig;
```

把结论压缩成一张表，后面所有场景都从这张表推出来：

| 写法 | 做不做赋值检查 | 表达式最终类型 | 适合场景 |
| --- | --- | --- | --- |
| `: T` 注解 | 做 | `T`（拓宽） | 函数参数、公共接口——需要「宽进」 |
| `as T` 断言 | 基本不做 | `T`（强行覆盖） | 从 `unknown` 收窄的最后手段 |
| `satisfies T` | 做 | 原类型（保留） | 配置表、映射表——既要验证又要精确类型 |

一个直观的记法：**注解是「把水倒进杯子」，断言是「宣布这是杯子」，satisfies 是「确认水能倒进杯子，然后水还是水」。**

## 2. 讲为什么：satisfies 到底改变了什么

### 2.1 类型拓宽：问题的根源

TypeScript 对「新写的字面量」有一套拓宽（widening）规则：单独的 `let x = 'dev'` 推断为 `string` 而不是 `'dev'`，因为编译器认为你以后可能会改。规则可以概括成一句话：

- `const` 直接声明的基本类型字面量：保留字面量类型（`const x = 42` 是 `42`）；
- 对象属性、数组元素里的字面量：拓宽为基类型（`{ x: 42 }` 的 `x` 是 `number`）；
- 加了 `as const`：整个递归结构全部收窄为只读字面量。

类型注解 `: T` 的效果是「把推断结果替换成 `T`」——所以键名、字面量这些细节全部被 `T` 覆盖。`satisfies` 的效果是「检查推断结果与 `T` 兼容，然后返回推断结果」——所以细节全部保留。想要完整的形式化描述（求值规则、与子类型关系的形式推导），见下一篇 [185：satisfies 的形式语义](/typescript/185-SatisfiesTypeTheory)。

### 2.2 为什么错误信息更友好

satisfies 的检查发生在「对象字面量」上，编译器此时还知道每个属性的具体来源，报错能精确到属性：

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const config = {
  api: { url: 'https://api.example.com', level: 'warn' },
} satisfies Record<string, { url: string; level: LogLevel }>;
// 若 level 写成 'warrn'，报错直接指向这一行这个字段：
// Type '"warrn"' is not assignable to type '"debug" | "info" | "warn" | "error"'
```

而 `as` 的检查面宽得多（允许任何「有重叠」的方向转换），大多数手误根本到不了报错那一步——这是「优先 satisfies、慎用 as」的根本理由。

### 2.3 与 zod 的分工：编译期与运行期各管一段

FANDEX 的内容管线里，frontmatter 走 zod schema 在构建期校验。satisfies 与 zod 是互补关系，不是替代：

```typescript
import { z } from 'zod';

const DocMeta = z.object({
  title: z.string(),
  order: z.number(),
  updated: z.string(),
});
type DocMeta = z.infer<typeof DocMeta>;

// satisfies 管编译期：这份测试数据字段对不对，写的时候就报错
const fixture = {
  title: '学习笔记',
  order: 180,
  updated: '2026-09-12',
} satisfies DocMeta;

// zod 管运行期：来自网络、文件、用户的不可信数据，必须走 parse
const parsed = DocMeta.parse(JSON.parse(rawInput));
```

记住分界线：**类型系统（含 satisfies）只保护「你自己写出来的字面量」；凡是运行时进来的数据，一律走 zod 这类运行时校验。** 把 `as DocMeta` 用在网络响应上，等于把门拆了。

## 3. 坑点与自检

### 坑一：satisfies 不拓宽，但也不加深

`satisfies` 保留的是「表达式本来的推断类型」，不会替你做 `as const` 的事：

```typescript
const a = { x: 42 } satisfies { x: number };
a.x; // number —— 对象属性位置的字面量本来就会拓宽，satisfies 原样保留了这个拓宽

const b = { x: 42 } as const satisfies { x: number };
b.x; // 42 —— 想要字面量，加 as const
```

还有一处容易误判，边界在 `const` 与 `let` 之间（以下结果用 tsc 实测验证）：

```typescript
const a = 42 satisfies number;
// a: 42 —— const 声明从不拓宽字面量，satisfies 只是没拦它

let b = 42 satisfies number;
// b: number —— satisfies 会剥掉字面量的「新鲜性」，let 声明随即拓宽
// 想在 let 下也保住字面量，只能 as const：let c = 42 as const; // c: 42
```

自检方法：鼠标悬停在变量上，看到的类型和预期不符时，先分清「哪一层拓宽发生了」，再决定加不加 `as const`。

### 坑二：as const 必须写在 satisfies 前面

两个操作符有固定顺序，写反是语法错误：

```typescript
// 错误：'as' expected —— satisfies 后面只能跟类型，不能跟 as const
const bad = { home: '/' } satisfies Record<string, string> as const;

// 正确：先 as const（改类型），再 satisfies（做验证）
const good = { home: '/' } as const satisfies Record<string, string>;
```

记忆：satisfies 是整个表达式的「最后一道关」，永远写在最右边。

### 坑三：函数返回值位置不能写 satisfies

`satisfies` 是表达式操作符，只能出现在能写表达式的地方，不能出现在函数签名的类型注解位置：

```typescript
// 错误：语法不合法
function getUser(): User satisfies User { /* ... */ }

// 正确：在 return 的表达式上验证
function getUser(): User {
  return { name: 'Alice', age: 30 } satisfies User;
}
```

### 坑四：数组字面量会「吃掉」字面量元素

```typescript
const ids = [101, 102] satisfies number[];
// number[] —— 元素拓宽，101/102 的信息没了

const idsFrozen = [101, 102] as const satisfies readonly number[];
// readonly [101, 102] —— 元组 + 字面量，注意目标是 readonly number[] 才兼容
```

### 坑五：期望「枚举」却忘了提取联合类型

`satisfies` 验证完只是「不丢信息」，联合类型还得自己用 `typeof` 提出来。这个「常量对象 + keyof 提取」的组合是替代 enum 的标准写法（为什么替代、替代到什么程度，见 [130：枚举的当代用法](/typescript/130-EnumAdvanced)）：

```typescript
const STATUS = {
  ok: 200,
  notFound: 404,
} as const satisfies Record<string, number>;

type StatusCode = (typeof STATUS)[keyof typeof STATUS]; // 200 | 404
function handle(code: StatusCode) { /* ... */ }
handle(STATUS.ok); // 通过
handle(500);       // 错误：500 不在联合类型里 —— 正是想要的效果
```

### 自检清单

- [ ] 用了 satisfies 之后，`typeof 变量` 能拿到具体键名联合类型吗？
- [ ] 需要字面量的地方（路由、事件名），加 `as const` 了吗？顺序是 `as const satisfies` 吗？
- [ ] 有没有把 satisfies 误写到函数返回类型注解位置？
- [ ] 运行时数据（接口响应、用户输入）是不是仍然走 zod，而不是 `as` 强转？

## 4. 练习

1. 把下面的注解写法改写成 satisfies 写法，使 `MODES` 的类型保留键名联合类型，并让 `setMode('producton')` 在编译期报错：

   ```typescript
   type Mode = 'dev' | 'preview' | 'prod';
   const MODES: Record<string, Mode> = { dev: 'dev', preview: 'preview', prod: 'prod' };
   function setMode(m: Mode) {}
   ```

2. 给第 0 节的令牌表加一组 `font.size.*` 令牌（值为 number），要求：同一张 satisfies 表同时容纳 `color.*`（string）与 `font.size.*`（number）两类键，键名格式错误照样编译报错。提示：用模板字面量类型做键约束。

3. 找出 FANDEX 仓库 `app-web/src` 目录下任意一处对象常量，判断它用的是注解、断言还是 satisfies；如果不加 satisfies 会丢失哪些类型信息？写三句话说明。

4. （挑错）下面代码有两个问题，指出来并改正：

   ```typescript
   function createRoutes(): Record<string, { path: string }> satisfies Record<string, { path: string }> {
     return { home: { path: '/' } };
   }
   ```

## 5. 下一步

- [185：satisfies 的形式语义](/typescript/185-SatisfiesTypeTheory)：本文结论的严格版本——求值规则、与子类型关系的形式推导、性质的记忆框架；
- [170：const 断言 as const](/typescript/170-ConstAssertion)：satisfies 的黄金搭档，先读它再看本文会非常顺；
- [590：类型安全的环境变量](/typescript/590-TypeSafeEnvVar)：`as const satisfies` 在配置校验里的完整工程化落地；
- [670：TypeScript 5.x 新特性演进](/typescript/670-TypeScript5xNewFeatures)：satisfies 之后语言还往哪个方向走（const 类型参数等）。

## 附：常见报错速查

| 报错 | 原因 | 处理 |
| --- | --- | --- |
| `Type 'X' does not satisfy the expected type 'Y'` | 表达式与目标类型不兼容 | 按报错指向的属性逐个修 |
| `'as' expected` | satisfies 后面误写了 `as const` | 调整顺序为 `as const satisfies` |
| `Cannot find name 'satisfies'` | TS 版本低于 4.9 | 升级 TypeScript（4.9 引入） |
| 对象字面量只能指定已知属性 | 多写了 schema 外的键 | 补进类型定义，或确认是否真的需要 |
