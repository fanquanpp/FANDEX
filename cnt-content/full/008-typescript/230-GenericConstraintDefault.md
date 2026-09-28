---
order: 240
title: 泛型约束与默认类型参数
module: 'typescript'
category: '前端技术'
difficulty: intermediate
description: 从「按任意字段排序」的真实需求切入，讲透 extends 约束、keyof 约束、多重约束与默认类型参数，以及约束过宽、过严、顺序错误三类高频坑。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'typescript/220-FunctionGeneric'
  - 'typescript/210-KeyofTypeofIndexedAccessTypes'
  - 'typescript/430-ConditionalTypeDistribute'
  - 'typescript/070-TSBasicsGenerics'
prerequisites:
  - 'typescript/220-FunctionGeneric'
  - 'typescript/210-KeyofTypeofIndexedAccessTypes'
---

## 0. 真实场景：按任意字段排序

FANDEX 的文档列表要支持排序：按标题、按更新时间、按字数。第一版写死了字段：

```typescript
function sortByDate(docs: Doc[]): Doc[] {
  return [...docs].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
}
```

产品说「再加个按标题排」，你复制一个 `sortByTitle`；按字数排，再复制一个。三个函数只有属性名不同——把属性名参数化就行：

```typescript
function sortBy<T>(items: T[], key: string) {
  return [...items].sort((a, b) => String(a[key]).localeCompare(String(b[key])));
}
//                          ~~~~~ 报错：T 上没有索引签名，key: string 也太宽
```

TS 拒绝了：`T` 是「任意类型」，凭什么都取 `a[key]`？解决它的机制就是本篇主题：**约束（constraint）**——告诉编译器「T 至少长成什么样子」。

## 1. 一句话理解

> 约束 = 给类型参数画底线。`T extends U` 读作「T 必须是 U 的子类型」：调用方只能传满足 U 的类型，函数体内你获得了 U 上的全部能力。没有约束的 T 是「一无所知的类型」，写了约束的 T 才「有基础能力可用」。

## 2. 动手：三级约束，逐步收紧

### 2.1 第一级：结构约束，换取字段访问权

先解决「T 什么都干不了」。如果函数体只需要「有 id 字段」，就只约束这一点：

```typescript
interface Doc {
  id: string;
  title: string;
  wordCount: number;
  updatedAt: string;
}

function exportCsv<T extends { id: string }>(items: T[]): string {
  return items.map((item) => item.id).join(',');   // 约束给了 item.id 的访问权
}

exportCsv(docs);                       // Doc 有 id，通过
exportCsv([{ name: 'tag' }]);          // 报错：缺少 id 属性
```

约束写在 `extends` 后面，内容是「最低要求」：传 `Doc`、`Tag`、任何带 `id: string` 的类型都能通过，还能保留各自更完整的类型（T 仍然是 `Doc` 而不是退化成 `{ id: string }`——这一点比把参数直接写成 `{ id: string }` 强）。

### 2.2 第二级：keyof 约束，把 key 锁进已知键

回到排序场景。`key: string` 意味着能传 `'ttile'` 这种拼错的键，运行时排了个寂寞。把键约束成 T 的已知键：

```typescript
function sortBy<T>(items: T[], key: keyof T): T[] {
  return [...items].sort((a, b) => {
    const va = a[key];
    const vb = b[key];
    if (typeof va === 'string' && typeof vb === 'string') {
      return va.localeCompare(vb);
    }
    if (typeof va === 'number' && typeof vb === 'number') {
      return va - vb;
    }
    return 0;
  });
}

const docs: Doc[] = [/* ... */];
sortBy(docs, 'updatedAt');   // 正常
sortBy(docs, 'ttile');       // 编译报错：'"ttile"' 不能赋给 keyof Doc
```

变化点：`key` 的类型从 `string` 变成 `keyof T`（T 的全部键的联合），`a[key]` 的类型也自动是 `T[keyof T]`。**拼错键名从「运行时静默失败」变成「编译期红线」**，这是 keyof 约束最常用的姿势。`keyof` 的完整语义见[keyof、typeof 与索引访问类型](/typescript/210-KeyofTypeofIndexedAccessTypes)。

### 2.3 第三级：接口约束，要求「会做某件事」

如果想让 `sortBy` 拒绝不可比较的字段，可以要求值类型自己会比较——约束指向接口，而不是写死结构：

```typescript
interface Comparable {
  compareTo(other: Comparable): number;
}

function sortByC<T extends Record<string, Comparable>>(items: T[], key: keyof T): T[] {
  return [...items].sort((a, b) => a[key].compareTo(b[key]));
}
```

三种约束覆盖日常九成需求：**结构约束**（有这些字段）、**keyof 约束**（键必须是已知键）、**接口约束**（有这些方法）。

## 3. 多重约束：一个 T，两份要求

约束可以叠加：`T extends A & B`，T 必须同时满足两者。

```typescript
// 同时要求：能被序列化（有 id），且带有审计字段
type Auditable = { createdBy: string; createdAt: string };

function auditLog<T extends { id: string } & Auditable>(item: T): string[] {
  return [
    `entity=${item.id}`,
    `by=${item.createdBy}`,
    `at=${item.createdAt}`,
  ];
}
```

`A & B` 是交叉类型，这里充当「要求清单」。实践中更常见的写法是把要求提取成命名接口（如上面的 `Auditable`），约束处写 `T extends Entity & Auditable`——需求变化时只改接口。

## 4. 默认类型参数：让调用方少写尖括号

类型参数可以带默认值，规则与函数默认参数一致：**有默认值的参数必须排在无默认值的后面**。

```typescript
// 分页请求：元素类型必填，排序方向默认 'desc'，页大小默认 20
interface PageQuery<T, Order extends 'asc' | 'desc' = 'desc', Size extends number = 20> {
  items: T[];
  order: Order;
  size: Size;
}

const p1: PageQuery<Doc> = { items: [], order: 'desc', size: 20 };
const p2: PageQuery<Doc, 'asc', 50> = { items: [], order: 'asc', size: 50 };
// const p3: PageQuery = ... 报错：T 没有默认值，必须显式传
```

两个典型用途：

1. **统一约定**：`Repo<T, ID = string>` 把「主键都是 string」这个团队约定写进类型，调用方 `Repo<Doc>` 两个词说完；
2. **约束收紧默认值**：注意 `Order extends 'asc' | 'desc' = 'desc'` 的结构——约束在前、默认值在后，等号右边的值必须满足左边的约束。

## 5. 为什么：约束解决的是「信息不足」

无约束泛型的本质困境：函数体内对 T **一无所知**，任何属性访问、方法调用都没有依据。约束的本质是**递给函数一张最低配置单**：

- `T extends { id: string }`：保证「至少有个 string 类型的 id」；
- `key extends keyof T`：保证「键都在我认知范围内」；
- `T extends Comparable`：保证「会自我比较」。

调用方视角则相反：约束是**准入门槛**，传进来的类型不满足就报错。设计和评审泛型 API 时，先问两个问题：函数体需要 T 的哪些能力（决定约束内容）？调用方最常见的类型能不能直接通过（决定约束别过严）？

TypeScript 的泛型是「擦除式」的：编译后类型参数消失，运行时没有任何泛型痕迹。这与 Java 的类型擦除类似、与 C# 的具现化泛型不同——所以**别在泛型代码里试图对 T 做运行时判断**（如 `value instanceof T` 编译不过），需要运行时类型信息时把「类型的构造器」作为普通参数传进来。

## 6. 坑点与自检

### 坑 1：约束过宽，形同虚设

```typescript
function sortBy<T extends Record<string, any>>(items: T[], key: string) { /* ... */ }
// key 是 string：拼错键名照样编译通过，运行时拿 undefined 排序
```

`any` 约束等于没约束。能用 `keyof T` 就别用 `string`。

### 坑 2：约束过严，调用方被逼断言

```typescript
// 要求太多字段，调用方手里只有部分数据时被迫 as
function publish<T extends Doc & { review: Review }>(d: T) { /* ... */ }
// 实际调用：publish(draft as Doc & { review: Review })  —— 断言文化就是这么养成的
```

约束只写「函数体真正用到」的字段，多的要求是给调用方加税。评审时逐个字段问「函数体用了吗」。

### 坑 3：默认类型参数顺序错误

```typescript
interface Bad<Size = 20, T> { }          // 报错：必选参数不能跟在可选参数后面
interface Good<T, Size = 20> { }         // 正确
```

### 坑 4：在擦除式泛型里找运行时类型

```typescript
function clone<T>(value: T): T {
  // return new T();  // 编译不过：运行时没有 T
  return structuredClone(value);         // 用能干这事的运行时 API 替代
}
```

### 坑 5：默认值不满足自己的约束

```typescript
interface Q<T extends { id: string } = { name: string }> { }
// 报错：默认值 { name: string } 不满足约束 { id: string }
```

### 自检清单

- [ ] 能说出 `T extends U` 对「函数体」和「调用方」分别意味着什么
- [ ] 能用 `keyof T` 约束把键参数化，并解释它防住了什么
- [ ] 会写多重约束 `T extends A & B` 和带默认值的类型参数
- [ ] 知道默认类型参数必须排在必选参数之后、默认值必须满足约束
- [ ] 知道泛型是擦除式的，运行时拿不到 T

## 7. 练习

1. 把第 2.2 节的 `sortBy` 升级：新增 `direction: 'asc' | 'desc' = 'asc'` 参数。想想它适合放函数参数层还是类型参数层，说出理由。
2. 复刻标准库 `Pick<T, K extends keyof T>` 的签名（不用写实现），解释为什么第二个参数要写 `extends keyof T` 而不是 `keyof T`。
3. 给 FANDEX 场景设计一个 `createRepo<T extends { id: string }, ID = string>()` 工厂签名：T 约束必须有 id，ID 默认 string。试着故意写出违反约束的调用，观察报错信息。

## 8. 下一步

- [条件类型与分发](/typescript/430-ConditionalTypeDistribute)：类型层的 if 语句，泛型的下一站
- [映射类型进阶](/typescript/470-MappedTypeAdvanced)：约束在类型变换里的用法
- [类型推断深入](/typescript/160-TypeInferenceDeepDive)：T 是怎么被推断出来的
- [协变与逆变](/typescript/260-CovarianceContravariance)：约束背后的子类型方向问题
