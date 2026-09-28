---
order: 540
title: "类型体操深水区：递归的边界、infer 的暗流与停手的时机"
module: 'typescript'
category: 前端技术
difficulty: advanced
description: "530 讲实用模式，本篇讲机制与边界：DeepMutable 一例实测惰性与急切递归的 TS2589 分野、递归终止条件设计、infer 双占位的联合与交叉、可维护性三问与类型测试惯用法——什么时候该写，什么时候该停手。"
author: fanquanpp
updated: '2026-09-28'
related:
  - 'typescript/530-TypeGymnasticsPracticalPatterns'
  - 'typescript/450-InferTypeDeepDive'
  - 'typescript/510-RecursiveTypeDeepOperation'
  - 'typescript/260-CovarianceContravariance'
  - 'typescript/550-TypeTestingAndAssertions'
prerequisites:
  - 'typescript/530-TypeGymnasticsPracticalPatterns'
  - 'typescript/440-ConditionalTypeInfer'
---

## 前置知识

- 已完成 [类型体操实用模式](/typescript/530-TypeGymnasticsPracticalPatterns)：会写索引访问提取、keyof + in 映射、手写 Pick/Omit；
- 已完成 [infer 专题](/typescript/440-ConditionalTypeInfer)：认识 `infer U` 在 extends 右侧占位的写法。

类型体操两篇的分工：**530 讲「用」——五个五行以内的实用模式；本篇讲「底」——递归怎么设计、编译器在哪里设限、从工程角度什么时候不该写。** 两篇示例不重复；450 篇实测过的尾递归与非尾递归深度（120/60 层）本篇不复述，换 DeepMutable 重新实测。

## 学习目标

读完本文你将能够：

1. 为递归类型写出明确的终止条件，解释 Function 分支缺失时函数属性为什么退化成 `{}`；
2. 复述「惰性递归」与「急切递归」的实测差异，并说出本篇 DeepMutable 的两个实测边界数字；
3. 预测同一个 `infer U` 出现在协变位置与逆变位置时分别得到联合还是交叉；
4. 用「报错可读性、悬停长度、团队水平」三问判断一个类型体操该不该写；
5. 用 Expect/Equal 与 @ts-expect-error 给递归类型建立最小回归防线。

预计 50 到 70 分钟，包含 2 组修改实验、2 道预测题与 1 道挑战题。

## 1. 你现在要解决什么问题

项目的主题配置是全只读的——为了防手滑，每一层都挂了 `readonly`：

```typescript
type ThemeConfig = {
  readonly id: string;
  readonly colors: { readonly bg: string; readonly fg: string };
  readonly apply: () => void;
};
```

现在要做主题编辑器：用户改 `bg`、改完点「应用」。需要一个可编辑副本。手写展开：

```typescript
type EditableTheme = {
  id: string; colors: { bg: string; fg: string }; apply: () => void;
};
```

三行还行，可主题有十几个、字段上百个，每加字段要同步改两处。530 的五个模式在这里全部失效：字段要**原样保留**，只是每层去掉 `readonly`，而层数事先不知道。这是递归的活——写得对有甜头，写错了编译器只会丢给你一句「太深了」。

## 2. 核心概念：递归与终止条件

第一版顺着直觉写——「是对象就逐键去掉 readonly，再递归」：

```typescript
type DeepMutable<T> = T extends object ? { -readonly [K in keyof T]: DeepMutable<T[K]> } : T;

type Editable = DeepMutable<ThemeConfig>;
```

悬停乍看正确，直到编辑器里的 `apply` 不再是函数。430 篇的赋值探针照出真实结果：

```typescript
const probe: number = null as unknown as Editable;
```

```text
error TS2322: Type '{ id: string; colors: { bg: string; fg: string; }; apply: {}; }' is not assignable to type 'number'.
```

注意 `apply: {}`——函数没了。原因：函数类型也满足 `extends object`，递归进了函数内部；而 `keyof (() => void)` 是空联合，映射出一个空对象。这不是报错，是**静默退化**，最危险的一类。

递归类型和运行时递归一样需要终止条件，而且特判要**放在递归之前**：

```typescript
type DeepMutable<T> =
  T extends Function ? T :
  T extends object ? { -readonly [K in keyof T]: DeepMutable<T[K]> } :
  T;

type Editable = DeepMutable<ThemeConfig>;
const editor: Editable = { id: "dark", colors: { bg: "#000", fg: "#fff" }, apply: () => {} };
editor.colors.bg = "#111"; // 通过
editor.apply = () => {};   // 通过，apply 仍是函数
```

设计口诀三条：**基线情形先行**（函数、Date 这类碰不得的原样放行，450 篇 DeepReadonly 的特判清单同样适用）；**每步结构变小**（逐键下钻，层数有限必然停）；**出口是原始类型**（落到最后的 T）。

## 3. 惰性与急切：同一份 DeepMutable 的两种命运

DeepMutable 到底能递归多深？在 TS 6.0 实测两组实验（报错文本同此版本）。

实验一：对象嵌套。生成 `Nest1 = { readonly next: Nest0 }` 这样的链一路嵌到底，套上 DeepMutable：

```typescript
type Nest0 = { readonly value: string };
// Nest1、Nest2 ... 每层多包一层，一路到 Nest1000
type M = DeepMutable<Nest1000>;
```

嵌到 **1000 层，安静通过**——停手不是因为报错。映射类型 `{ [K in keyof T]: ... }` 是**惰性**的：编译器不立刻展开每层，访问到哪个属性才算哪一支。

实验二：把同一个工具改成重建元组的版本——递归调用写进元组展开：

```typescript
type DeepMutableTuple<T> =
  T extends readonly [infer H, ...infer R] ? [DeepMutableTuple<H>, ...DeepMutableTuple<R>] :
  T extends Function ? T : T extends object ? { -readonly [K in keyof T]: DeepMutableTuple<T[K]> } : T;

type N0 = readonly [string]; // N1 到 N48 每层多包一层
type M = DeepMutableTuple<N48>;
```

**47 层通过，48 层报错**：

```text
error TS2589: Type instantiation is excessively deep and possibly infinite.
```

差别在：元组展开是**急切**的——`[A, ...B]` 要立刻知道每个成员，编译器一层层同步实例化，撞上实例化深度上限。450 篇测的是尾递归分野，本篇补上另一半：**限制看的不是数据多深，而是类型实例化多急。**

读 TS2589 三步：它只说「太深」不指认哪层——先列出所有递归调用点，逐个问「出口齐全吗、会被特例挡住吗」，能把递归独占真分支就改尾递归，不能就拆成有名字的中间类型分步算。本例的对象分支就是逃生门。

## 4. infer 双占位：联合与交叉的暗流

infer 自己也有边界行为：**同一个占位符出现两次**，结果由占位符的位置决定。

协变位置（属性、返回值这类「输出」）出现两次，结果是**联合**：

```typescript
type Common<T> = T extends { a: infer U; b: infer U } ? U : never;

type C1 = Common<{ a: string; b: string }>; // string
type C2 = Common<{ a: string; b: number }>; // string | number
```

编译器要找一个 U 同时「装得下」两个位置的实际类型——输出位置取并集即可。逆变位置（函数参数这类「输入」）出现两次，结果反过来是**交叉**：

```typescript
type UnionToIntersection<U> =
  (U extends unknown ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

type I1 = UnionToIntersection<{ id: number } | { name: string }>;
// { id: number } & { name: string }
```

左边把联合分发成「一个参数一种类型」的函数联合，右边从参数位置反推 I——输入位置要满足所有调用方，只能取交集。协变逆变的完整语义见 [协变与逆变](/typescript/260-CovarianceContravariance)；这个交叉技巧就是社区 UnionToIntersection 工具的全部原理。

## 5. 修改实验

先预测，再悬停或编译验证。

实验一：把 DeepMutable 的 Function 分支删掉，换成 Date：`T extends Date ? T :` 放在 object 前，再喂一个带 `onClick: () => void` 的配置。参考结果：onClick 退化成 `{}`——退化规律与分支内容无关，与「递归进了不该进的类型」有关。

实验二：把 `Common` 的两个占位符改成不同名字 `infer U` 和 `infer V`，返回 `[U, V]`。参考结果：C1 场景得 `[string, string]`，C2 场景得 `[string, number]`——不再联合，占位符各自独立后就没有合并这回事。双占位行为完全由「同名」触发。

## 6. 常见错误与调试实录

错误一：TS2589，读法与逃生门见第 3 节三步法；急切分支改惰性或改尾递归，通常能把可用深度翻倍以上。

错误二：没有报错，但结果悄悄不对。第 2 节的 `apply: {}` 是范本：悬停看不出来（太长被折叠），调用时才爆运行时错误。规律：**递归类型 + 特判缺失 = 某类成员静默变形**。防御靠下一节的类型测试——把「函数必须原样放行」锁成断言，变形即编译失败。

## 7. 实际场景与可维护性三问

实战里 DeepMutable 这类工具的正当用途：给全只读配置、as const 常量表派生可编辑副本；反向的 DeepReadonly/DeepPartial 用在「把可变实体冻结后下发」。它们都该待在项目统一的 `types/` 目录里，写清注释与限制。

动手前过三问，任何一问答不上来就停手：

1. **类型报错还读得懂吗**。故意造一个错误，看报错是否指回可修的位置；TS2589 级别的不指路报错，每次都要人肉重走推导；
2. **IDE 悬停有多长**。结果悬停一屏内放得下，团队才养得起；出现滚动条就换「运行时克隆 + 宽松类型」的便宜方案；
3. **团队平均 TS 水平接得住吗**。infer 双占位、逆变交叉这类机制，你解释得清不等于团队读得懂。类型是写给下一个维护者的合同，不是写给编译器的谜语。

这三问与 450 篇的三问（值不值得写、报错读不读得懂、有没有测试）互补：450 篇决定「要不要开工」，本篇决定「开工后养不养得起」。

## 8. 类型测试惯用法

递归类型必须有回归防线。零依赖两件套（完整工具箱见 [类型测试与断言](/typescript/550-TypeTestingAndAssertions)）：

```typescript
type Expect<T extends true> = T;
type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false;

// DeepMutable 定义同第 2 节（带 Function 特判的版本）
type Cases = [
  Expect<Equal<DeepMutable<{ readonly a: string }>, { a: string }>>,
  Expect<Equal<DeepMutable<{ readonly f: () => void }>, { f: () => void }>>,
];
const _cases: Cases = [true, true];
```

第二条正是锁住 `apply: {}` 退化的那根针：函数分支被删，Equal 变 false，`_cases` 当场报错。反向断言用 @ts-expect-error，注意它只覆盖紧随的一行：

```typescript
const bad: ThemeConfig = { id: "x", colors: { bg: "", fg: "" }, apply: () => {} };
// @ts-expect-error 原类型仍是只读：写入必须报错，注释才算用对
bad.colors.bg = "#000";
```

哪天只读修饰符被意外弄丢，这行写入不再报错，@ts-expect-error 反过来报「Unused directive」——防线是双向的。

## 9. 小练习

预测题（5 分钟，接着第 4 节文件里的 Common 与 UnionToIntersection 写，先写答案再悬停验证）：

```typescript
type P1 = Common<{ a: number; b: number }>;                   // 预测：？
type P2 = UnionToIntersection<{ x: number } | { y: string }>; // 预测：？
```

挑战题（30 分钟）：给 DeepMutable 补上只读数组分支——`readonly string[]` 要变成可写的 `string[]`，对象与函数行为不变。验收（不报错即通过）：

```typescript
type Tags = { readonly items: readonly string[]; readonly count: number };
type EditTags = DeepMutable<Tags>;
const t: EditTags = { items: ["a"], count: 1 };
t.items.push("b");
```

提示：在 Function 分支之后、object 分支之前插一个分支，用 infer 取元素。展开提示：`T extends readonly (infer E)[] ? DeepMutable<E>[] : ...`——注意元组也会误匹配此分支，区分元组与数组是 510 篇的话题。

参考答案（先做完再看）：P1 是 `number`（两个位置同类型，联合自动坍缩）；P2 是 `{ x: number } & { y: string }`。

## 10. 与之前和之后的知识的关系

- 往前：530 的五个模式是最初的工具箱，本篇回答它们不够用时怎么办；430 的分发与 440 的 infer 是两个边界行为的共同前提；450 已给出尾递归视角的深度实测，本篇补映射惰性视角；
- 往后：510 篇系统化递归设计（元组与数组区分、循环引用）；550 篇把两件套工程化成完整类型测试；380 篇教你监控体操的编译开销。

## 11. 官方文档

- 条件类型（Handbook）：https://www.typescriptlang.org/docs/handbook/2/conditional-types.html
- TS2589 等编译器诊断的官方说明：https://github.com/microsoft/TypeScript/wiki/FAQ
- tsd 类型测试框架：https://tsd.run/
- type-challenges 题库（含 utils 断言工具，MIT 许可）：https://github.com/type-challenges/type-challenges

## 12. 自我检查

- 能默写带 Function 特判的 DeepMutable，解释缺失特判时 `apply: {}` 的成因；
- 能复述惰性与急切的实测差异，说出本篇两个边界数字（对象嵌套 1000 层、元组重建 48 层）与 450 篇两个数字（120/60）各对应什么形态；
- 能预测 infer 双占位在协变与逆变位置的结果，并用集合运算解释；
- 能背出可维护性三问，并用 Equal 断言锁住函数原样放行的行为。

## 本章总结

深水区三条铁律：递归必须有特判在前的终止条件，否则函数这类成员静默退化成 `{}`；深度限制针对急切实例化而非数据深度——映射惰性千层无恙，元组急切四十八层即碎；infer 双占位按协变逆变分别给出联合与交叉。最重要的边界不在类型系统里，在团队里：报错读不懂、悬停放不下、同事接不住的类型，再正确也不该存在。写类型测试，让防线替你盯着。

## 下一步

进入 [550 类型测试与断言](/typescript/550-TypeTestingAndAssertions)：本篇的两件套在那里扩展成完整的类型回归方案——tsd、satisfies、never 穷尽检查，给所有体操上保险。
