---
order: 490
title: 条件类型遇上映射类型：值位置的变换
module: 'typescript'
category: '前端技术'
difficulty: advanced
description: 条件类型三部曲到映射类型的桥梁篇：把条件类型放进映射的值位置，实现逐字段清洗（去 null 变可选）、按条件筛键与逐元素变换，并给出「先循环还是先判断」的设计顺序。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'typescript/470-MappedTypeAdvanced'
  - 'typescript/430-ConditionalTypeDistribute'
  - 'typescript/450-TypeCompositionPractice'
  - 'typescript/480-MappedTypeKeyRemap'
prerequisites:
  - 'typescript/450-TypeCompositionPractice'
---

## 0. 真实场景：带 null 的 API 响应怎么清洗

FANDEX 的搜索接口对缺失字段返回 `null`，前端拿到的类型长这样：

```typescript
interface SearchHit {
  id: string;
  title: string | null;
  excerpt: string | null;
  tags: string[] | null;
}
```

调用方痛恨 `hit.title!.trim()` 这种代码。想要的目标类型是：**能确定一定有的字段保持原样；可能为 null 的字段，类型里去掉 null、属性变成可选**——逼调用方写 `hit.title?.trim()` 而不是断言。这是一个「逐字段按条件变换」的需求：循环（映射）每个字段，对每个字段的类型做判断（条件类型）。

## 1. 一句话理解

> 映射类型负责「逐字段循环」，条件类型负责「对每个字段做判断」。冒号左边写 `[K in keyof T]`，冒号右边写 `T[K] extends ... ? ... : ...`——两个原语各站一边，组合就成立了。本篇是[条件类型三部曲](/typescript/450-TypeCompositionPractice)与[映射类型进阶](/typescript/470-MappedTypeAdvanced)之间的桥。

## 2. 动手：写出字段清洗器

### 2.1 第一步：单个字段怎么判断

先把「一个字段的类型」的变换规则写清楚，不涉及循环：

```typescript
// string | null 应该变成 string（并且外面要加 ?）
// string 应该保持 string
type StripNull<V> = V extends null | undefined ? never : V;

type A = StripNull<string | null>;  // string | never = string
type B = StripNull<string>;         // string
```

注意 `V extends null | undefined` 对**联合**会分发：`string | null` 拆成 `string` 和 `null` 分别判断，null 那份变成 never，合并后剩 `string`。分发在这里正好是我们想要的「逐成员清洗」。

### 2.2 第二步：套进映射循环

先来一个直接版：所有字段统一可选，值清洗掉 null。

```typescript
type Cleaned<T> = {
  [K in keyof T]?: StripNull<T[K]>;
};

type CleanHit = Cleaned<SearchHit>;
// {
//   id?: string;          // 等等，id 为什么也可选了？
//   title?: string;
//   excerpt?: string;
//   tags?: string[];
// }
```

能用了，但 **id 本来必有，也被加上了 `?`**——「统一可选」太粗。要区分「必有」和「可空」，判断条件要换成 `null extends T[K]`（值**可能**是 null）：

```typescript
type Cleaned2<T> = {
  [K in keyof T]: null extends T[K] ? StripNull<T[K]> | undefined : T[K];
};

type CleanHit2 = Cleaned2<SearchHit>;
// {
//   id: string;
//   title: string | undefined;
//   excerpt: string | undefined;
//   tags: string[] | undefined;
// }
```

`Cleaned2` 是干净版：值可能为 null 的字段变成「清洗后的类型 | undefined」，调用方写 `hit.title?.trim()`；必有字段原样保留。真想做成可选属性（`?` 而不是 `| undefined`），用[键重映射](/typescript/480-MappedTypeKeyRemap)的 as 条件筛键配合处理——一层映射只干一件事，别在一行里塞全部逻辑。

### 2.3 第三步：按值类型筛键（组合最常见形态）

「只要函数字段」「只要 string 字段」这类需求，是组合模式的标准应用：

```typescript
type PickByType<T, V> = {
  [K in keyof T as T[K] extends V ? K : never]: T[K];
};

interface DocActions {
  save: () => void;
  revert: () => void;
  version: number;
}

type Actions = PickByType<DocActions, (...args: never[]) => unknown>;
// { save: () => void; revert: () => void }
```

逐层读：循环每个键 K → 条件类型问「T[K] 兼容 V 吗」→ 是，保留键名；否，给 never → never 键被映射类型吸收删除。as 子句的更多键变换玩法见[键重映射](/typescript/480-MappedTypeKeyRemap)。

## 3. 设计顺序：先判断，后循环

写组合类型时新手常见卡点是「一行写到底写不动」。可靠的工作流：

1. **先写单字段变换**：`type StripNull<V> = ...`，拿两三个具体类型喂它验证（如 `StripNull<string | null>`）；
2. **再套循环**：`{ [K in keyof T]: StripNull<T[K]> }`，悬停看一个真实接口的结果；
3. **最后加筛键/改键**：需要删除或改名时再引入 as 条件，一次只加一层。

反向（先写整体后拆）在类型不工作时极难调试——你分不清是条件写错还是循环写错。分层还能让每层都有名字，报错信息可读得多（坑点 4）。

## 4. 坑点与自检

### 坑 1： extends 的方向写反

`T[K] extends null` 问的是「值整体就是 null」；`null extends T[K]` 问的是「null 是值类型的一员（可能是 null）」。一字之差，语义全变。判断字段「可空性」用后者。

### 坑 2：忘了分发对联合的作用

`StripNull<string | null>` 能得到 `string` 是因为分发。若用 `[V] extends [null | undefined]` 阻止分发，同样的输入会得到 `never`——联合整体不兼容。两种写法都对，但要清楚自己在用哪种（分发细节见[条件类型与分发](/typescript/430-ConditionalTypeDistribute)）。

### 坑 3：循环里对每个键做了重判断

条件类型的判断成本乘以键的数量，嵌套映射里再套一层就是平方级。字段特别多的类型上出现编辑器卡顿，先怀疑组合层数（性能对策见[编译与性能优化](/typescript/380-TypeScriptCompilePerformanceOptimization)）。

### 坑 4：匿名组合类型不可调试

报错指向「某行映射」时没有名字可查。给每层起名（`StripNull`、`Cleaned`），并在开发期用 [550 篇](/typescript/550-TypeTestingAndAssertions)的 `Expect<Equal<...>>` 断言验证中间结果。

### 自检清单

- [ ] 能写出「值位置条件变换」的最小骨架并在真实接口上验证
- [ ] 能区分 `T[K] extends null` 与 `null extends T[K]` 的语义
- [ ] 能解释 PickByType 逐层发生了什么（循环、判断、never 吸收）
- [ ] 遇到组合类型写不动时，会按「先判断后循环」的顺序拆层

## 5. 练习

1. 写 `NonNullableFields<T>`：只保留「值不可能为 null」的字段（组合 as 筛键与 `null extends T[K]`）。
2. 写 `StringifyKeys<T>`：值是 string 的字段保持，其他字段全部变成 `string`（值位置条件变换的另一方向）。
3. 把 2.3 的 `PickByType` 改成 `OmitByType<T, V>`：删除值兼容 V 的字段。用 `DocActions` 验证结果只剩 `version`。

## 6. 下一步

- [映射类型进阶](/typescript/470-MappedTypeAdvanced)：修饰符加减与同态性的完整规则
- [映射类型与键重映射](/typescript/480-MappedTypeKeyRemap)：as 子句的键改名玩法
- [工具类型实现原理](/typescript/490-UtilityTypePrinciple)：组合模式的成品合集
- [类型体操实用模式](/typescript/530-TypeGymnasticsPracticalPatterns)：五行以内的组合速查
