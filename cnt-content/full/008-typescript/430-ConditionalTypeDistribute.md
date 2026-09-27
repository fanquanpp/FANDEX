---
order: 430
title: 条件类型与分发：类型层的 if 语句
module: 'typescript'
category: 前端技术
difficulty: intermediate
description: "用「根据输入类型选返回类型的存档加载器」引入，讲透 T extends U ? X : Y、嵌套条件、分布式条件类型与 never 的空联合行为，并揭开 Exclude/Extract 的真面目，附可运行实验与真实报错调试实录。"
author: fanquanpp
updated: '2026-09-12'
related:
  - 'typescript/440-ConditionalTypeInfer'
  - 'typescript/450-InferTypeDeepDive'
  - 'typescript/190-NeverTypeSemantics'
  - 'typescript/490-UtilityTypePrinciple'
prerequisites:
  - 'typescript/070-TSBasicsGenerics'
  - 'typescript/110-LiteralUnionTypes'
---

## 前置知识

- 已完成 [泛型基础](/typescript/070-TSBasicsGenerics)：会写 `identity<T>` 这类泛型函数；
- 已完成 [字面量与联合类型](/typescript/110-LiteralUnionTypes)：认识 `"click" | "hover"` 这种联合类型。

条件类型拆成三篇接力：**本篇讲本体与分发；[440 篇](/typescript/440-ConditionalTypeInfer) 专讲 infer 的占位与推导；[450 篇](/typescript/450-InferTypeDeepDive) 把两者组装成真实工具。** 三篇示例互不重复。本文用到 never（不可能出现的类型），完整语义见 [never 类型](/typescript/190-NeverTypeSemantics)。

## 学习目标

读完本文你将能够：

1. 写出「按输入类型选返回类型」的条件类型，预测它在单个类型与联合输入下的结果；
2. 说出分发的触发条件（裸类型参数），预测 boolean、never 等边界输入的结果；
3. 用 `[T]` 包裹阻止分发，解释 `IsNever<never>` 为什么得到 never；
4. 说出 Exclude、Extract、NonNullable 就是条件类型的现成封装，并用它们过滤联合；
5. 遇到「结果莫名变成 never 或 boolean」的问题，三步内定位到分发行为。

预计 45 到 60 分钟，包含 3 组动手实验与 3 道练习。

## 1. 你现在要解决什么问题

你在给游戏写存档模块。存档有两个来源：本地是 JSON 字符串，云端是二进制 Uint8Array，解析出的结构不一样：

```typescript
type GameSave = { level: number; playedAt: string };
type CloudSave = { level: number; syncedAt: string };

declare function parseLocal(raw: string): GameSave;
declare function parseCloud(raw: Uint8Array): CloudSave;
```

第一版加载器这样写：

```typescript
function loadSaveUnion(source: string | Uint8Array): GameSave | CloudSave {
  return typeof source === "string" ? parseLocal(source) : parseCloud(source);
}

const save = loadSaveUnion('{"level":3}');
save.level;     // 没问题
save.playedAt;  // 编辑器直接划红线
```

报错（TypeScript 6.0 实测，本文报错文本同此版本）：

```text
Property 'playedAt' does not exist on type 'GameSave | CloudSave'.
  Property 'playedAt' does not exist on type 'CloudSave'.
```

函数体明明白白：字符串给 GameSave，二进制给 CloudSave，但签名只说了「给两者的联合」，编译器不知道这层对应关系。你想要的其实是一句类型层的 if：**输入是 string 就给 GameSave，否则给 CloudSave**。这就是条件类型。

## 2. 先不要看解释，先试试看

新建 .ts 文件，输入下面的类型别名，把鼠标悬停在类型名上：

```typescript
type LoadResult<T> = T extends string ? GameSave : CloudSave;

type R1 = LoadResult<string>;              // 悬停：GameSave
type R2 = LoadResult<Uint8Array>;          // 悬停：CloudSave
type R3 = LoadResult<string | Uint8Array>; // 悬停：？
```

R1、R2 符合直觉；R3 悬停出来的是 `GameSave | CloudSave`——逐个成员各判一次、结果再联合的自动展开，这就是**分发**，本篇的主角。

## 3. 核心概念：T extends U ? X : Y

条件类型像三元表达式：问「T 能赋值给 U 吗」，能取真分支，不能取假分支。extends 在泛型约束里（070 篇）是筛选调用方，在这里是向类型提问。分支不止两条时用嵌套条件，从上往下依次尝试：

```typescript
type SourceLabel<T> =
  T extends string ? "本地存档" :
  T extends Uint8Array ? "云端存档" :
  T extends number ? "槽位存档" :
  "未知来源";

type L1 = SourceLabel<string>;           // "本地存档"
type L2 = SourceLabel<number>;           // "槽位存档"
type L3 = SourceLabel<Date>;             // "未知来源"
type L4 = SourceLabel<string | number>;  // "本地存档" | "槽位存档"
```

L4 就是分发在工作：一个联合进去，两个结果出来，下一节拆开看。

## 4. 分发：联合的每个成员各判一次

规则一句话：**extends 左边是「裸的类型参数」（光秃秃的 T，没有包裹）且实参是联合时，联合被拆开，每个成员单独问一遍，答案再联合起来。**

把 L4 手动展开，就是编译器做的事：

```text
SourceLabel<string | number>
= SourceLabel<string> | SourceLabel<number>
= "本地存档" | "槽位存档"
```

分发最实用的场景是**按条件过滤联合**：把不要的成员映射成 never——「空联合」，放进联合里等于不存在：

```typescript
type OnlyStrings<T> = T extends string ? T : never;

type F1 = OnlyStrings<string | number | boolean>; // string
type F3 = OnlyStrings<number | boolean>;          // never（全部被滤掉）
```

F3 值得停一下：成员全部被过滤，结果就是空联合 never——分发的空集行为，第 5 节靠它抓一个经典陷阱。

## 5. never 与现成的封装：Exclude/Extract 的真面目

把 OnlyStrings 反过来写（保留不匹配的成员），你就重新发明了标准库的 Exclude：

```typescript
type MyExclude<T, U> = T extends U ? never : T;
type MyExtract<T, U> = T extends U ? T : never;

type E1 = MyExclude<"a" | "b" | "c", "a">;              // "b" | "c"
type E2 = MyExtract<string | number | boolean, string>; // string
```

TypeScript 内置工具类型里，Exclude、Extract、NonNullable 的定义一字不差就是这两个模式（出处：lib.es5.d.ts）：

```typescript
// TypeScript 标准库源码（lib.es5.d.ts 节选，仅供阅读，勿粘贴回项目重新声明）
type Exclude<T, U> = T extends U ? never : T;
type Extract<T, U> = T extends U ? T : never;
type NonNullable<T> = T extends null | undefined ? never : T;
```

全套内置工具的逐个拆解见 [工具类型实现原理](/typescript/490-UtilityTypePrinciple)。

### 5.1 陷阱：给 never 做判断会「空转」

有了过滤，自然会想写一个「T 是不是 never」的判断：

```typescript
type IsNeverBroken<T> = T extends never ? true : false;

type Q = IsNeverBroken<never>;  // 悬停显示：never，而不是 true
```

悬停出来是 never。原因正是空集行为：never 是空联合，分发时一个成员都拆不出来，问句没资格执行，直接返回空联合。

调试「怀疑结果是 never」有个通用探针——把值赋给 never 变量：never 能赋给一切，而除了 never 谁都赋不进去，不报错就坐实了：

```typescript
const probe: never = null as unknown as Q;  // 不报错，坐实 Q 是 never
```

修法是阻止分发：把 T 用元组 `[T]` 包起来，它就不再是「裸的类型参数」：

```typescript
type IsNever<T> = [T] extends [never] ? true : false;

type N1 = IsNever<never>;  // true
type N2 = IsNever<string>; // false
```

同样的包裹还能阻止 boolean 被拆开（分发里 boolean 是 `true | false` 两个成员），第 6 节实验里自己看。

## 6. 修改实验

先预测悬停结果，再对照参考结果。

实验一：boolean 会被拆成两个成员。

```typescript
type ToArray<T> = T extends any ? T[] : never;

type B1 = ToArray<string | number>; // 预测：？
type B2 = ToArray<boolean>;         // 预测：boolean[] 吗？
```

参考结果：B1 是 `string[] | number[]`；B2 是 `true[] | false[]`——分发把 boolean 拆成了 true 和 false。想保住 `boolean[]`，看实验三。

实验二：把 OnlyStrings 的 T 和 never 换个位置：`type KeepOthers<T> = T extends string ? never : T;`，悬停 `KeepOthers<string | number | boolean>`。参考结果：`number | boolean`——你第二次发明了 Exclude。

实验三：给「拆不拆」加个开关。

```typescript
type ToArrayNoDist<T> = [T] extends [any] ? T[] : never;

type D1 = ToArrayNoDist<string | number>; // 预测：？
type D2 = ToArrayNoDist<boolean>;         // 预测：？
```

参考结果：D1 是 `(string | number)[]`，D2 是 `boolean[]`——包裹后整包判定、整包返回。

## 7. 常见错误与调试实录

错误一：想要「整体判断」，却被分发拆成了逐个判断。

```typescript
type IsAllStrings<T> = T extends string ? true : false;

const ok: false = null as unknown as IsAllStrings<string | number>;
```

```text
error TS2322: Type 'boolean' is not assignable to type 'false'.
```

你想要「string | number 整体是不是 string」，应得 false，实际拿到 boolean。三步定位：报错说结果是 boolean；boolean 即 true | false，说明问句执行了两次；T 是裸类型参数触发了分发。修复：改成 `[T] extends [string]`。

错误二：结果悄悄变成 never（没有报错）。IsNeverBroken 就是典型：悬停才露馅。规律是「分发 + 过滤到全空 = never」，而 never 能赋给任何类型，问题往往拖到下游才爆。习惯：新写的过滤类条件类型，先用极端输入悬停看一眼。

## 8. 实际项目中的使用场景

- 权限收窄：过滤掉游客不可见的权限：

```typescript
type Perm = "read" | "write" | "admin" | "guest";
type StaffPerm = Exclude<Perm, "guest">;  // "read" | "write" | "admin"
```

- 清洗接口数据：`NonNullable<string | null>` 收掉可空字段再进业务逻辑；
- 事件名管理：Extract 出某一类事件，Exclude 掉已废弃的事件；
- 什么时候不用：运行时才能决定的事不要搬进条件类型，那是校验库的活；逻辑超过两层嵌套时先拆成有名字的中间类型，450 篇会划这条边界。

## 9. 小练习

预测题（5 分钟，先写答案，再悬停验证）：

```typescript
type Packed<T> = T extends string ? { open(): string } : { open(): number };

type P1 = Packed<"scroll" | 42 | "coin">; // 预测：？
type P2 = Packed<never>;                  // 预测：？
```

修改题（15 分钟）：给 LoadResult 增加第三种来源——number 槽位号对应 `type SlotSave = { level: number; slot: number }`。悬停验证 LoadResult<number> 与 LoadResult<string | number> 的结果。

修 Bug 题（15 分钟）：同事想从事件联合里去掉数字成员，编译报错附后。按读报错三步定位并修复：

```typescript
type DropNumbers<T> = T extends number ? T : never;
type Events = DropNumbers<"click" | "hover" | 42 | "scroll">;
const handler: "click" | "hover" | "scroll" = null as unknown as Events;
```

```text
error TS2322: Type '42' is not assignable to type '"click" | "scroll" | "hover"'.
```

参考答案（先做完再看）：P1 是 `{ open(): string } | { open(): number }`；P2 是 never。修 Bug 题条件写反了：`T extends number ? T` 保留的恰恰是数字，改成 `T extends number ? never : T`，或用内置 `Exclude<T, number>`。

## 10. 与之前和之后的知识的关系

- 往前：070 篇的 T 是类型层的形参，条件类型就是给它写函数体；110 篇的联合成了「逐个处理的集合」；190 篇的 never 语义解释了过滤与空转两个现象；
- 往后：440 篇装上 infer 后，条件类型从「选答案」升级到「取内容」；450 篇把两篇零件组装成真实工具。

## 11. 官方文档

- 条件类型（Handbook）：https://www.typescriptlang.org/docs/handbook/2/conditional-types.html
- 分发一节（Distributive Conditional Types）：https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#distributive-conditional-types
- 内置工具类型（Exclude/Extract/NonNullable 的官方定义）：https://www.typescriptlang.org/docs/handbook/utility-types.html

## 12. 自我检查

- 能不查资料写出「输入 string 给 A、否则给 B」的条件类型；
- 能口述分发规则，并预测联合、boolean、never 三种输入的结果；
- 知道 `[T]` 包裹解决什么问题，能修复 IsNever 陷阱；
- 知道 Exclude/Extract/NonNullable 就是条件类型，能徒手重写它们。

## 本章总结

`T extends U ? X : Y` 把 if 搬进类型层。裸类型参数遇到联合会分发：每个成员各判一次、结果联合——这正是 Exclude/Extract 的实现原理，也带来两个必记行为：过滤到全空得 never；整体判断用 `[T]` 包裹。下一篇给问句装上 infer，让条件类型学会「从类型里取东西」。

## 下一步

进入 [440 infer 专题](/typescript/440-ConditionalTypeInfer)。分工再念一遍：本篇负责条件类型本体与分发，440 只讲 infer 的占位与推导，450 负责把两者组装成真实工具。
