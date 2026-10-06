---
order: 520
title: 工具类型实现原理：手写 Partial 到 Omit
module: 'typescript'
category: '前端技术'
difficulty: intermediate
description: 把 Partial、Pick、Omit、Record、ReturnType 逐个徒手复刻，看清映射类型、条件类型与 infer 怎么拼出标准库工具类型，并补上 Omit 的联合类型坑与精确值匹配两个进阶细节。
author: fanquanpp
updated: '2026-09-29'
related:
  - 'typescript/470-MappedTypeAdvanced'
  - 'typescript/480-MappedTypeKeyRemap'
  - 'typescript/430-ConditionalTypeDistribute'
  - 'typescript/440-ConditionalTypeInfer'
prerequisites:
  - 'typescript/470-MappedTypeAdvanced'
  - 'typescript/430-ConditionalTypeDistribute'
---

## 0. 真实场景：内置工具类型差点坑了这次发布

FANDEX 的文档实体要做一个「只更新部分字段」的接口，同事顺手写了：

```typescript
interface Doc {
  id: string;
  meta: string;
  status: 'draft' | 'published';
}

type DocPatch = Partial<Doc>;
function applyPatch(doc: Doc, patch: DocPatch): Doc { /* ... */ }
```

能跑。但 code review 提了一个问题：如果某天 `Doc` 变成联合类型（比如不同栏目有不同字段），`Partial<Doc>` 会发生什么？没人答得上来。**会用工具类型和懂工具类型的分界线就在这里**——本篇把五个最常用的工具类型徒手复刻一遍，以后看到任何工具类型行为异常，你都能拆开看。

## 1. 一句话理解

> 工具类型 = 标准库用三个原语（映射类型、条件类型、infer）预写好的「类型级函数」。`Partial<T>` 展开是一行映射，`ReturnType<T>` 展开是一行 infer。所有工具类型都写得出来，只是有的要用到分发和递归。

## 2. 动手：从两行代码的工具类型开始

### 2.1 Partial / Required / Readonly：一行映射

```typescript
type MyPartial<T>   = { [K in keyof T]?: T[K] };
type MyRequired<T>  = { [K in keyof T]-?: T[K] };
type MyReadonly<T>  = { readonly [K in keyof T]: T[K] };
```

这三行的完整拆解（`in keyof`、修饰符、同态性）在[映射类型进阶](/typescript/470-MappedTypeAdvanced)刚讲过，直接复用。

### 2.2 Pick：映射 + keyof 约束

```typescript
type MyPick<T, K extends keyof T> = {
  [P in K]: T[P];
};

type DocCard = MyPick<Doc, 'id' | 'status'>;
// { id: string; status: 'draft' | 'published' }
```

注意细节：循环的是 **K**（传入的键联合），不是 `keyof T`。`K extends keyof T` 是准入约束——传进来的键必须真的存在于 T。这决定了两件事：多传的键编译报错；`[P in K]` 只生成你点名的行。

### 2.3 Omit：一行，但藏着一个坑

```typescript
type MyOmit<T, K extends keyof T> = MyPick<T, Exclude<keyof T, K>>;
```

Omit = 「Pick 掉剩下的」。`Exclude` 来自条件类型分发（下一节）。先看它的坑：

```typescript
type Ab = { a: 1 } | { a: 2; b: string };
type X = MyOmit<Ab, 'a'>;
// 结果不可用：keyof 作用在联合上只取公共键，'a' 被排除后所剩无几
```

原因：`keyof` 作用在**联合**上只取「公共键」——两个成员都有 `a`，`keyof Ab` 是 `'a'`，`Exclude<keyof Ab, 'a'>` 变成 `never`，Pick 一个 never 键得到空结果。**内置 `Omit<T, K>` 故意把 K 约束放宽为 `string | number | symbol`**，换取联合输入时的可用性，代价是不再校验键名拼写：

```typescript
// 标准库源码
type Omit<T, K extends string | number | symbol> = Pick<T, Exclude<keyof T, K>>;

Omit<{ a: 1 }, 'typo'>;  // 编译不报错！拼错的键被静默忽略
```

工程结论：对象场景用 `Omit` 图省事可以，但**键名拼写安全就没了**；要拼写检查就用 `MyOmit`（约束 `extends keyof T`），要处理联合就先想清楚键集合。取舍要自己做主。

### 2.4 Record：键值表的最短实现

```typescript
type MyRecord<K extends string | number | symbol, V> = {
  [P in K]: V;
};

type TagCount = MyRecord<'ts' | 'rust', number>;
// { ts: number; rust: number }
```

值的类型是统一的 V，所以它天生非同态：没有「来源类型」可保留修饰符。常见用途是枚举映射表（配合 as const 对象，见[枚举进阶](/typescript/130-EnumAdvanced)）。

### 2.5 ReturnType / Parameters：infer 的舞台

```typescript
type MyReturnType<T extends (...args: never[]) => unknown> = T extends (
  ...args: never[]
) => infer R
  ? R
  : never;

type MyParameters<T extends (...args: never[]) => unknown> = T extends (
  ...args: infer P
) => unknown
  ? P
  : never;

function loadDoc(id: string, deep: boolean) { return { id, deep } as const; }

type LoadArgs = MyParameters<typeof loadDoc>;   // [id: string, deep: boolean]
type LoadRet  = MyReturnType<typeof loadDoc>;   // { readonly id: string; readonly deep: boolean }
```

结构是标准的「条件类型 + infer 占位」：先约束 T 必须是函数，再用 `infer R` 在返回值位置挖洞。infer 的位置语义与推导规则在[infer 专题](/typescript/440-ConditionalTypeInfer)完整展开，这里记住「返回值位置放 infer 就能提取返回类型」即可。

## 3. 为什么：Exclude 背后的分发

```typescript
type MyExclude<T, U> = T extends U ? never : T;

type Keys = 'id' | 'status' | 'meta';
type Rest = MyExclude<Keys, 'id'>;
// 'status' | 'meta'
```

`T` 传入的是联合时，条件类型**逐成员分发**：`'id'` 分到 never，`'status'`、`'meta'` 原样通过，结果再并起来。分发是条件类型的默认行为（裸类型参数触发），`never` 负责把不要的成员吸收掉。完整的分发规则、`[T]` 阻止分发的写法见[条件类型与分发](/typescript/430-ConditionalTypeDistribute)。

## 4. 进阶两题：值匹配的精确性

按值筛属性（470 篇写过 `PickByType`）有个精度问题：`T[K] extends number` 判断的是「兼容」而不是「相等」，字面量类型会被宽类型误吸：

```typescript
type LoosePick<T, V> = {
  [K in keyof T as T[K] extends V ? K : never]: T[K];
};

interface Doc {
  status: 'draft' | 'published';
  version: number;
}
// LoosePick<Doc, string> 里 status 会因为成员兼容判断的边界情况而难以预期
```

精确匹配要用「双向」条件（社区通用写法）：

```typescript
type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

type ExactPickByValue<T, V> = {
  [K in keyof T as Equals<T[K], V> extends true ? K : never]: T[K];
};
```

`Equals` 这个「双函数 extends」写法比较的是类型函数的相互兼容性，能区分字面量与宽类型、可选与必选，[类型测试与断言](/typescript/550-TypeTestingAndAssertions)里有它的展开用法。

## 5. 坑点与自检

### 坑 1：Omit 传了拼错的键不报错

内置 Omit 的 K 约束很宽（见 2.3）。对拼写敏感的场合用 `keyof T` 约束版。

### 坑 2：对联合类型直接用 keyof

`keyof (A | B)` 只给公共键。处理联合先想清楚要「公共键」还是「逐成员处理」（后者用分发或 `[T] extends [U]` 包裹）。

### 坑 3：Partial 套 Partial 的误解

`Partial<Partial<T>>` 无害但无意义（幂等）。真正常见的是 `Partial<T> & { id: string }`：其余可选、id 必填的 patch 类型。

### 坑 4：约束写得比内置严导致不可用

复刻时给 T 加 `extends object` 之类内置没有的约束，会让边缘用法报错。复刻以标准库签名为准，别自由发挥。

### 自检清单

- [ ] 能徒手写出 Partial、Readonly、Pick、Record、Exclude、ReturnType
- [ ] 能解释 Omit 为什么对联合类型和拼写错误不设防，以及两种防御写法
- [ ] 能说出 Exclude 依赖分发、never 吸收这两个机制
- [ ] 能区分「兼容匹配」与「精确匹配」，写出或至少读懂 Equals

## 6. 练习

1. 手写 `NonNullable<T>`（提示：一行，Exclude 的特例），并用 `string | null | undefined` 验证。
2. 手写 `ConstructorParameters<T>`：提取构造函数参数元组（提示：模仿 MyParameters，把函数形状换成 `new (...args: infer P) => unknown`）。
3. 给 FANDEX 场景写 `Patchable<T>`：id 必填、其余全可选，然后用 `Equals` 写两条类型断言验证它确实等价于 `Partial<Doc> & { id: string }`。

## 7. 下一步

- [映射类型与键重映射](/typescript/480-MappedTypeKeyRemap)：用 as 重写更顺手的键变换
- [条件类型与分发](/typescript/430-ConditionalTypeDistribute)：Exclude 的底层机制
- [infer 专题](/typescript/440-ConditionalTypeInfer)：Parameters/ReturnType 的完整推导链
- [类型测试与断言](/typescript/550-TypeTestingAndAssertions)：给手写工具类型配回归防线
