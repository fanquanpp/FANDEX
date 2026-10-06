---
order: 500
title: 映射类型进阶：修饰符与同态性
module: 'typescript'
category: '前端技术'
difficulty: advanced
description: 从「草稿全可选、归档全只读」两个真实需求讲映射类型的进阶语法：修饰符加减（+?/-?）、同态映射为什么能保留原类型的 optional 与 readonly、never 键过滤，以及递归映射入门。
author: fanquanpp
updated: '2026-09-29'
related:
  - 'typescript/480-MappedTypeKeyRemap'
  - 'typescript/490-UtilityTypePrinciple'
  - 'typescript/460-ConditionalMappedType'
  - 'typescript/210-KeyofTypeofIndexedAccessTypes'
prerequisites:
  - 'typescript/210-KeyofTypeofIndexedAccessTypes'
  - 'typescript/110-LiteralUnionTypes'
---

## 0. 真实场景：同一个文档，三种形态

FANDEX 的文档实体在生命周期里有三种类型需求：

1. **草稿**：所有字段都可以先不填，编辑器需要一个「全可选」版；
2. **已发布**：字段齐全；
3. **归档快照**：落库后谁也不许改，需要一个「全只读」版。

手写三个接口当然可以，但字段一改就得改三处，迟早漂移。需求本质上是一句变换：**「拿 Doc，把每个属性都变成可选 / 都变成只读，其他保持原样」**。这句话的类型层写法就是映射类型（mapped type）。

## 1. 一句话理解

> 映射类型 = 类型层的 `for` 循环。`{ [K in keyof T]: ... }` 遍历 T 的每个键 K，值的位置按规则变换。基础用法在[类型体操实用模式](/typescript/530-TypeGymnasticsPracticalPatterns)见过；本篇讲进阶三件事：**修饰符怎么加减、同态映射为什么能原样保留 optional/readonly、怎么用 never 删键**。

## 2. 动手：把草稿和归档写出来

### 2.1 全可选（手写 Partial）

```typescript
interface Doc {
  title: string;
  wordCount: number;
  tags: string[];
}

type Draft = {
  [K in keyof Doc]?: Doc[K];
};

const draft: Draft = {};                    // 一个字段都不填也合法
draft.wordCount = 100;                      // 补一个也行
```

逐块拆解 `[K in keyof Doc]`：

- `keyof Doc` 得到键联合 `'title' | 'wordCount' | 'tags'`；
- `K in` 把这个联合「摊开」，每个成员生成一行属性；
- `?` 把每一行变成可选属性；
- 值的位置 `Doc[K]` 是索引访问：K 是谁，就取 Doc 里对应字段的类型。

### 2.2 全只读（手写 Readonly）

```typescript
type Archive = {
  readonly [K in keyof Doc]: Doc[K];
};

const snap: Archive = { title: 'x', wordCount: 1, tags: [] };
// snap.title = 'y';   // 报错：title 是只读属性
```

### 2.3 修饰符可以加，也可以减

`?` 与 `readonly` 是**修饰符**，映射时可以用 `+`/`-` 显式增删（不写符号默认是 `+`）：

```typescript
// 把所有可选属性变必选（去掉 ?）——这就是 Required<T> 的实现
type Concrete<T> = {
  [K in keyof T]-?: T[K];
};

// 把所有只读属性变可写（去掉 readonly）
type Mutable<T> = {
  -readonly [K in keyof T]: T[K];
};
```

`-?` 还有一个隐藏效果：可选属性去掉 `?` 后，`undefined` 也从类型里被拿掉了（`strictNullChecks` 下）。「草稿转正式」就是这么写的。

## 3. 为什么：同态映射能保留原类型的细节

试一下这个实验：给 Doc 加一个可选字段，再看映射结果：

```typescript
interface Doc2 {
  title: string;
  excerpt?: string;          // 可选
}

type Draft2 = { [K in keyof Doc2]?: Doc2[K] };
// Draft2 等价于 { title?: string; excerpt?: string }
```

关键现象：**`[K in keyof T]` 形式的映射是「同态」的（homomorphic）**——编译器认得「我在遍历 T 自己的键」，于是把 T 上每个键的 `?` 和 `readonly` 原样复制到结果上，除非你用 `-` 显式去掉。所以 `Readonly<T>`、`Partial<T>` 挂在任意 T 上都行为正确：修饰符不用你操心。

对照：**非同态映射**。一旦键的位置不是 `keyof T` 而是别的联合（比如手写字符串联合），同态性消失，修饰符全部归零：

```typescript
type CopyKeys = { [K in 'title' | 'excerpt']: string };
// { title: string; excerpt: string } —— excerpt 的 ? 丢了
```

判断口诀：**看到 `[K in keyof T]`（或 `keyof T` 的变体），修饰符会跟过来；看到别的键来源，一切从零开始**。`Record<K, V>` 就是非同态的典型：它不携带任何「来源类型」的修饰符信息。

## 4. 键过滤：never 是删除键的开关

配合 `as` 子句（[下一篇](/typescript/480-MappedTypeKeyRemap)的主角）可以做「按条件删键」——键的变换结果为 `never` 时，该键从结果中消失：

```typescript
type PickByType<T, V> = {
  [K in keyof T as T[K] extends V ? K : never]: T[K];
};

interface Doc {
  title: string;
  wordCount: number;
  likes: number;
}

type NumberFields = PickByType<Doc, number>;
// { wordCount: number; likes: number }  —— title 被筛掉了
```

`never` 在这里的行为来自它的「空类型」本质：映射出 never 键等于「这个属性不存在」，编译器直接把它从结果里抹掉。完整语义见[never 类型完整语义](/typescript/190-NeverTypeSemantics)。

## 5. 递归映射：深一层怎么做

映射默认只处理一层。「深度只读」需要映射时递归调用自己：

```typescript
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object
    ? T[K] extends (...args: never[]) => unknown
      ? T[K]                    // 函数不展开
      : DeepReadonly<T[K]>      // 对象继续深入
    : T[K];
};

interface Section { heading: string; paragraphs: string[] }
interface DocTree { meta: Doc; sections: Section[] }

const tree: DeepReadonly<DocTree> = /* ... */;
// tree.meta.title = 'x';          // 报错：层层只读
```

注意分支设计：函数也是 object，不排除的话方法签名会被拆烂；数组、Map 等特例的完整处理与递归深度限制（TS2589）在[组合实战](/typescript/450-TypeCompositionPractice)与[类型体操深水区](/typescript/540-TypeGymnasticsBoundaries)专门实测过，此处不重复。

## 6. 坑点与自检

### 坑 1：非同态映射丢修饰符还以为是 bug

`{ [K in SomeUnion]: T[K] }` 不会保留 optional/readonly（键来源不是 keyof T）。需要保留就走同态形式：`[K in keyof T as ...]`（as 变换键名仍算同态，见 480 篇）。

### 坑 2：-? 以为只去掉问号

`-?` 同时移除 `undefined`。给「可能有显式 undefined」的 API 做类型时要意识到这个差别（`exactOptionalPropertyTypes` 开启后差异更明显）。

### 坑 3：值的位置写错索引对象

```typescript
type Bad<T> = { [K in keyof T]: Bad[K] };    // 报错：Bad 是类型不是对象
type Good<T> = { [K in keyof T]: T[K] };     // 值永远从「被遍历的那个 T」取
```

`K` 只是循环变量，取值要用「源类型[K]」，源类型是谁就用谁。

### 坑 4：在映射里做了运行时假设

映射类型只存在于编译期。别指望 `{ [K in keyof T]: ... }` 会生成任何运行时代码——需要运行时的映射请写普通函数（`Object.fromEntries` 等）。

### 自检清单

- [ ] 能手写 Partial、Readonly、Required、Mutable 四个工具类型的映射版
- [ ] 能解释「同态」判断口诀，预测一个映射会不会保留 `?` 和 readonly
- [ ] 会用 `-?` / `-readonly` 做减法
- [ ] 能用条件类型 + never 实现按类型筛键
- [ ] 能写出两层以内的 DeepReadonly，并说出函数分支为什么必须存在

## 7. 练习

1. 手写 `Nullable<T>`：每个属性类型变成 `T[K] | null`（提示：值的位置是表达式，可以做并集运算）。
2. 给第 5 节的 `DeepReadonly` 加一个测试：构造 `tags: string[]` 的对象，验证数组元素也被收进只读（想想数组在 `T[K] extends object` 里走哪个分支）。
3. 写 `WithId<T>`：给任意类型追加一个 `id: string` 字段（提示：映射与交叉类型两种写法都可以，比较两种写法的悬停可读性）。

## 8. 承接速查：修饰符增删与手写三件套（自杂糅篇 520）

> 已归并的 520-AdvancedTypeCalculus 有一章「映射类型」。其手写 `Readonly/Partial/Required` 的完整原理见[内置工具类型原理](/typescript/490-UtilityTypePrinciple)，键重映射与按值筛键分别见[键重映射](/typescript/480-MappedTypeKeyRemap)与本篇第 4 节（均已去重）。这里保留本篇此前没展开的增量：**修饰符可以用 `-` 删掉**。

映射类型里的修饰符有三种玩法：加 `readonly`/`?`、不加、用 `-` 显式移除。移除是其他章节都没讲到的那一半：

```typescript
interface Person {
  readonly name: string;
  age?: number;
  email: string;
}

// 移除 readonly：得到全可写版本
type Mutable<T> = { -readonly [P in keyof T]: T[P] };
// 移除可选：得到全必填版本
type HardRequired<T> = { [P in keyof T]-?: T[P] };
// 两个一起移除
type MutableRequired<T> = { -readonly [P in keyof T]-?: T[P] };

const mutablePerson: Mutable<Person> = { name: 'Alice', age: 30, email: 'a@b.c' };
mutablePerson.name = 'Bob'; // 现在可以改（原 Person 的 name 是 readonly）

const required: HardRequired<Partial<Person>> = {
  name: 'Charlie', age: 30, email: 'c@d.e', // Partial 补上的 ? 被清掉
};
```

为什么 `-?` 有实用价值：草稿类型（`Partial`）转提交类型时，`Required` 内置工具类型干的就是这件事，读它的源码就是 `{ [P in keyof T]-?: T[P] }` 一行。**易错点**：写 `-readonly` 时负号要贴着修饰符（`-readonly` 中间不能有空格），且修饰符只作用于键，不动值的类型。

## 9. 下一步

- [映射类型与键重映射](/typescript/480-MappedTypeKeyRemap)：`as` 子句改键名、拼事件名
- [工具类型实现原理](/typescript/490-UtilityTypePrinciple)：Partial/Pick/Omit 全家桶的逐个拆解
- [条件类型与映射类型](/typescript/460-ConditionalMappedType)：两个武器组合的更多模式
- [索引签名与动态属性](/typescript/140-IndexSignatureDynamicProperty)：键集合开放的另一条路
<!-- 恢复自 cnt-content/full/008-typescript/520-AdvancedTypeCalculus.md（实施前 HEAD 62c90663 版本）；拆分时该小节未随迁，2026-10-07 内容保全复核恢复 -->

## 映射类型的最佳实践


- **复用现有类型**: 利用映射类型基于现有类型创建新类型，减少重复定义。
- **清晰命名**: 为映射类型选择清晰、描述性的名称。
- **合理使用修饰符**: 根据需要使用 `readonly`、`?` 和 `-` 修饰符。
- **键重映射**: 在需要修改属性键时使用键重映射功能。

