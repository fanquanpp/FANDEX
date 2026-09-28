---
order: 460
title: 组合实战：把条件类型与 infer 拼成真实工具
module: 'typescript'
category: 前端技术
difficulty: advanced
description: 430 的分发与 440 的 infer 在本篇组装：完整推导 DeepReadonly、MyAwaited、ParametersToObject 三个工具类型，每个都走「目标、思路、实现、用例与预期」流程，含 TS2589 深度限制调试实录与类型体操的可维护性边界。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'typescript/430-ConditionalTypeDistribute'
  - 'typescript/440-ConditionalTypeInfer'
  - 'typescript/460-ConditionalMappedType'
  - 'typescript/510-RecursiveTypeDeepOperation'
  - 'typescript/550-TypeTestingAndAssertions'
prerequisites:
  - 'typescript/440-ConditionalTypeInfer'
---

## 前置知识

- 已完成 [440 infer 专题](/typescript/440-ConditionalTypeInfer)：会写 UnwrapPromise、MyReturnType，会写 DeepPromise；430 的分发默认也会了。

分工一句话：**本篇不教新语法，430 的分发、440 的 infer 在这里组装成三个真实工具，每个走「目标、思路、实现、用例与预期」四步。**

正文反复出现映射类型 `{ [K in keyof T]: ... }`（遍历 T 的每个键），先混个眼熟，[460 篇](/typescript/460-ConditionalMappedType) 起讲透。

## 学习目标

读完本文你将能够：

1. 走完「目标、思路、实现、验收」流程，组装出 DeepReadonly、MyAwaited、ParametersToObject；
2. 在递归类型里放对终止条件，处理函数、数组等特例；
3. 读懂 TS2589 报错，说出尾递归与非尾递归的实测差异与解法；
4. 判断一个需求该不该用复杂类型，给出可维护性论证。

预计 60 到 90 分钟。

## 1. 你现在要解决什么问题

你接手一个游戏存档模块，code review 记下三个痛点：

1. GameConfig 一路传到渲染层，谁都能改它，出过「音量莫名变了」的 bug——想要整棵对象只读的类型；
2. 接口层层包装出 `Promise<Promise<GameConfig>>`，没人答得上 await 拿到什么——想要把 Promise 拆到底的工具；
3. 老代码全是 `(slot: number, overwrite: boolean) => void` 回调，想逐参数做校验和日志——想要参数变逐位对象的工具。

方法论：每个工具从「零件能拼到哪一步、还差什么」开始推，不凭空给答案。

```typescript
type GameConfig = { audio: { volume: number }; graphics: { fps: number } };
```

## 2. 工具一：DeepReadonly

**目标**：GameConfig 这样的嵌套对象，整棵树全部只读。

**推导思路**。内置 Readonly 只处理一层：

```typescript
type Shallow = Readonly<GameConfig>;
// { readonly audio: { volume: number }; readonly graphics: { fps: number } }
// audio 里面的 volume 依然是可变的
```

差的是「对还是对象的值再来一遍 Readonly」：判断对象用 430 的 `T extends object`，逐键加 readonly 用映射类型（眼熟），「再来一遍」套 440 的递归三要素。特例：函数也是 object，直接映射会毁掉函数签名，要原样放行。

**完整实现**：

```typescript
type DeepReadonly<T> = T extends Function
  ? T
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;
```

**用例与预期**：

```typescript
type LockedConfig = DeepReadonly<GameConfig>;
// { readonly audio: { readonly volume: number }; readonly graphics: { readonly fps: number } }

const config: LockedConfig = { audio: { volume: 3 }, graphics: { fps: 60 } };
config.audio.volume = 10;
config.graphics.fps = 120;
```

两行赋值全部报错（TypeScript 6.0 实测）：

```text
error TS2540: Cannot assign to 'volume' because it is a read-only property.
error TS2540: Cannot assign to 'fps' because it is a read-only property.
```

readonly 是编译期锁。已知行为：数组被映射成只读数组（push 报 `Property 'push' does not exist on type 'readonly string[]'`），要不要放开见修改实验一。

## 3. 工具二：MyAwaited 复刻

**目标**：把 Promise 拆到底，非 Promise 原样返回：

```text
Promise<number>           -> number
Promise<Promise<string>>  -> string
string | Promise<number>  -> string | number   （分发，430 的规则）
null                      -> null              （不是 Promise，原样返回）
```

**推导思路**。440 的 UnwrapPromise 只拆一层，把假分支出口换成递归调用即可；再加守卫：null 和 undefined 不是 Promise，原样放行。真实内置版还兼容 thenable，本篇只处理 Promise。

**完整实现**：

```typescript
type MyAwaited<T> = T extends null | undefined
  ? T
  : T extends Promise<infer V> ? MyAwaited<V> : T;
```

**用例与预期**（编译验证通过）：

```typescript
type A1 = MyAwaited<Promise<number>>;           // number
type A2 = MyAwaited<Promise<Promise<string>>>;  // string
type A3 = MyAwaited<string | Promise<number>>;  // string | number（分发）
type A4 = MyAwaited<null>;                      // null

type Profile = { id: number; nickname: string };
async function loadProfile(): Promise<Profile> { return { id: 1, nickname: "ada" }; }
type Loaded = MyAwaited<ReturnType<typeof loadProfile>>; // Profile
```

最后一行是真实工作流：async 函数返回 `Promise<Profile>`，想拿 await 之后的类型，ReturnType 加 MyAwaited 两步搞定。

### 3.1 泛型递归的深度与栈限制

递归写出来只是第一步，跑得动才算及格。实测（TypeScript 6.0）：

- MyAwaited 形态（递归调用独占真分支，即**尾递归**）：120 层嵌套 Promise 通过；TS 4.5 起上限约 1000 层；
- 递归结果被展开拼接的形态（递归调用写进元组展开 `[...Flatten<F>, ...Flatten<R>]`，**非尾递归**）：60 层嵌套元组就报错：

```text
error TS2589: Type instantiation is excessively deep and possibly infinite.
```

读报错三步：TS2589 只说「太深」不说哪层——先列出所有递归调用点，再逐个检查出口是否齐全、会不会被特例挡住，最后能改尾递归就改，不能就拆成有名字的中间类型分步算。性能细节见 [编译性能优化](/typescript/380-TypeScriptCompilePerformanceOptimization)。

## 4. 工具三：ParametersToObject

**目标**：给回调参数逐位包一层对象，方便做校验清单和参数日志：

```text
(slot: number, overwrite: boolean) => void
-> [{ value: number }, { value: boolean }]
```

**第一次尝试（会翻车）**：用映射类型对参数元组逐键包一层。

```typescript
type ParametersToObjectBroken<T extends (...args: any) => any> = {
  [K in keyof Parameters<T>]: { value: Parameters<T>[K] };
};

type SaveHandler = (slot: number, overwrite: boolean) => void;
type Checklist = ParametersToObjectBroken<SaveHandler>;
const bad: Checklist = [{ value: 1 }, { value: true }];
```

```text
error TS2322: Type '[{ value: number; }, { value: true; }]' is not assignable to type 'Checklist'.
  Types of property 'length' are incompatible.
    Type 'number' is not assignable to type '{ value: 2; }'.
```

离谱在第二行：length 竟然是 `{ value: 2 }`。定位：keyof 遍历的不只是 0、1 下标，还有 length、push 这些数组自带成员；`Parameters<T>["length"]` 是字面量 2，也被卷进 `{ value: ... }`——裸映射对元组连内置属性一起处理。

**修正思路**：逐位处理元组，用 440 的元组模式递归——每次拿走第一个参数、包一层、对剩下的继续。

**完整实现**：

```typescript
type ChecklistOf<P extends readonly any[]> =
  P extends readonly [infer F, ...infer R] ? [{ value: F }, ...ChecklistOf<R>] : [];

type ParametersToObject<T extends (...args: any) => any> = ChecklistOf<Parameters<T>>;
```

**用例与预期**：

```typescript
type Checklist = ParametersToObject<SaveHandler>;
// [{ value: number }, { value: boolean }]

const checklist: Checklist = [{ value: 1 }, { value: true }]; // 通过
```

「提取元组、逐位递归、展开拼接」是标准组合，几乎所有元组变换工具都是这个骨架换掉处理函数。

## 5. 修改实验

实验一：删掉 DeepReadonly 的 Function 分支，对函数使用：

```typescript
type DeepReadonlyNoGuard<T> = T extends object
  ? { readonly [K in keyof T]: DeepReadonlyNoGuard<T[K]> }
  : T;
declare const f: DeepReadonlyNoGuard<() => number>;
const n: number = f();
```

参考结果：报 `error TS2349: This expression is not callable. Type '{}' has no call signatures.`——函数被映射毁了。特例分支不是装饰，是正确性的一部分。

实验二：把递归调用换回 440 的单层写法：

```typescript
type MyAwaitedFlat<T> = T extends Promise<infer V> ? V : T;
const flat: string = null as unknown as MyAwaitedFlat<Promise<Promise<string>>>;
```

参考结果：报 `error TS2322: Type 'Promise<string>' is not assignable to type 'string'.`——少一层递归就多一层没拆完的 Promise。

实验三：把 `{ value: F }` 改成 `{ type: F; index: number }`，悬停观察新结构，体会「处理函数」和「递归骨架」是分离的。

## 6. 常见错误与调试实录速查

- TS2589：按 3.1 三步法处理；预防靠递归出口、尾递归、拆中间步骤；
- 结果异常：用 never 探针或赋值探针确认是不是 never 或 any；
- 映射卷进数组内置成员：见工具三翻车实录，逐位变换用元组递归；
- 改了类型没生效：条件类型在实参确定后才求值。

## 7. 何时不该写复杂类型：可维护性边界

动手前过三个问题：

1. **三个月后的自己看得懂吗**。DeepReadonly 十行以内、结构同构，值得写；四五层嵌套加双递归就先找便宜方案——函数重载、简单泛型、把判断挪到运行时（配合 [运行时校验](/typescript/660-RuntimeSchemaValidation) 的 schema 库）；
2. **报错还读得懂吗**。TS2589 只说「太深」不指路，每个撞上它的人都要重走你的推导；
3. **有没有测试锁定行为**。类型也要写用例：赋值探针断言结果，或用类型测试工具（见 [类型测试与断言](/typescript/550-TypeTestingAndAssertions)）。没有验收的重构就是裸奔。

练手去 type-challenges 这类开源题库（MIT 许可），工作代码里克制是美德：体操的荣誉属于题库，不属于 code review。

## 8. 小练习

预测题（5 分钟，先写答案，再悬停或编译验证）：

```typescript
type P1 = MyAwaited<Promise<string> | null>;        // 预测：？
type P2 = ParametersToObject<(a: string) => void>;  // 预测：？
```

挑战题（30 分钟）：实现 DeepPartial，让嵌套对象每层可选。验收断言（不报错即通过）：

```typescript
const p: DeepPartial<GameConfig> = { audio: { volume: 3 } };
```

提示：递归结构和 DeepReadonly 同构，改的是映射那一行的修饰符。展开提示：`{ [K in keyof T]?: DeepPartial<T[K]> }`。

进阶挑战（15 分钟）：用 430 的 Exclude 和内置 Pick 组合出 `MyOmit<T, K>`。验收断言：

```typescript
type SaveMeta = { id: number; name: string; checksum: string };
const pub: { id: number; name: string } = null as unknown as MyOmit<SaveMeta, "checksum">;
```

提示：Omit 等于保留「键名联合里没被排除的部分」。展开提示：`Pick<T, Exclude<keyof T, K>>`。

## 9. 与之前和之后的知识的关系

- 往前：430 提供分发与 never 过滤，440 提供 infer 占位与元组递归；三个工具是三种组合；
- 往后：460 起讲透映射语法，键重映射（as 子句）能让工具三不再依赖递归；510 篇系统化递归设计，530 篇收录更多组合模式；
- 模块出口：550 篇把本篇的探针手法工程化。

## 10. 官方文档

- 条件类型（Handbook）：https://www.typescriptlang.org/docs/handbook/2/conditional-types.html
- infer 一节：https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#inferring-within-conditional-types
- 工具类型（Awaited/Readonly/Parameters 定义）：https://www.typescriptlang.org/docs/handbook/utility-types.html

## 11. 自我检查

- 能不看本篇默写 DeepReadonly，说出 Function 分支和数组行为两个特例；
- 能默写 MyAwaited，说出它和 440 DeepPromise 的差异（null 守卫、分发行为）；
- 能复述 TS2589 三步定位法与尾递归、非尾递归的差异；
- 能解释工具三第一次翻车的原因（keyof 卷进数组内置成员）；
- 能对着「三个月后的自己」论证一个类型该不该写。

## 本章总结

三个工具、三种组合：DeepReadonly「条件判型、映射逐键、递归下钻」，特例原样放行；MyAwaited「infer 拆包 + 递归 + 分发」，尾递归撑得起上百层，非尾递归五十层左右撞 TS2589；ParametersToObject 踩过裸映射的坑，落回元组递归骨架。类型也是代码：要有目标、思路、验收，也有「不写」的边界。

## 下一步

进入 [460 条件类型与映射类型](/typescript/460-ConditionalMappedType)：本篇「先混个眼熟」的映射语法在那里转正，组合后三个工具能写得更短。
