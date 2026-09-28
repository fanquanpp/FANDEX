---
order: 230
title: 函数重载与泛型函数
module: 'typescript'
category: '前端技术'
difficulty: intermediate
description: 从「一个搜索函数要兼容两种输入」切入，讲函数重载的正确姿势与泛型函数设计：多类型参数、约束、泛型类与常见错误修正。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'typescript/070-TSBasicsGenerics'
  - 'typescript/210-KeyofTypeofIndexedAccessTypes'
  - 'typescript/230-GenericConstraintDefault'
  - 'typescript/160-TypeInferenceDeepDive'
prerequisites:
  - 'typescript/070-TSBasicsGenerics'
---

## 0. 真实场景：一个搜索函数，两种输入

FANDEX 站内搜索有两个入口：顶部搜索框输入的是关键字字符串；侧栏标签点击传入的是标签 ID。最初写成了两套函数：

```typescript
function searchByKeyword(keyword: string): Doc[] { /* ... */ }
function searchByTagId(tagId: string): Doc[] { /* ... */ }
```

调用方还得记两个名字。理想形态是一个 `search(input)`：传字符串关键字按标题搜，传 `{ tagId }` 对象按标签搜，返回类型在两种情况下各自精确。解决它的两个工具正是本篇主角：**函数重载**（同一函数多套「接口说明书」）和**泛型函数**（类型跟着参数走）。

## 1. 一句话理解

> 函数重载是给同一个函数准备多张「参数-返回值」对照表，调用时编译器按实参挑表；泛型函数是给函数开「类型参数槽」，调用时由实参推断填充。重载解决「输入形状不同」，泛型解决「类型要保持联动」。

## 2. 动手：先用联合类型，不够再上重载

很多人一遇到多种输入就写重载，其实**联合类型经常够用**：

```typescript
type SearchInput = string | { tagId: string };

function search(input: SearchInput): Doc[] {
  if (typeof input === 'string') {
    return searchByKeyword(input);
  }
  return searchByTagId(input.tagId);
}

const byWord = search('收窄');          // Doc[]
const byTag  = search({ tagId: 'ts' }); // Doc[]
```

这里返回类型恰好相同，联合类型就是正解。重载的用武之地是「**输入不同，返回类型也不同**」的场景。看一个真实的：

```typescript
// 解析 frontmatter 日期：传字符串返回 Date，传 Date 原样返回
function parseDate(value: string): Date;
function parseDate(value: Date): Date;
function parseDate(value: string | Date): Date {
  return typeof value === 'string' ? new Date(value) : value;
}

const a = parseDate('2026-09-28');  // 类型是 Date，实参也能是 Date
const b = parseDate(new Date());    // 同一个函数
```

### 2.1 重载的三段结构

```typescript
function createElement(tag: 'div'): HTMLDivElement;
function createElement(tag: 'canvas'): HTMLCanvasElement;
function createElement(tag: string): HTMLElement;        // 兜底
function createElement(tag: string): HTMLElement {
  return document.createElement(tag);
}

const box = createElement('div');       // HTMLDivElement，自动补全是 div 专属属性
const cv  = createElement('canvas');    // HTMLCanvasElement
```

1. 前面若干行**重载签名**：只有类型，没有函数体，以分号结尾；
2. 最后一个**实现签名**：函数体所在，必须兼容所有重载签名，但它**对外不可见**——调用方只能匹配重载签名；
3. 调用时编译器从上到下找第一个匹配的重载。**把精确的放前面，宽的兜底放最后**，顺序反了就永远匹配到宽的那个。

### 2.2 重载的边界：什么时候该收手

重载条数随参数组合爆炸时（`add(a: number, b: number)` / `add(a: string, b: string)` / 混合共 4 种），通常说明该用泛型或联合参数了。经验法则：重载不超过 3 个，且每个重载对应「真实存在的调用习惯」；否则换方案。标准库里的 `document.createElement` 就是「每个标签一种返回类型」的合理重载；而「参数类型自由组合」的场景硬写重载只会得到一份维护不动的清单。

## 3. 泛型函数：让类型跟着参数走

[泛型基础](/typescript/070-TSBasicsGenerics)已经讲过 `identity<T>`。本节聚焦**设计**层面：一个泛型函数的类型参数应该怎么摆。

### 3.1 类型参数放哪：跟着需要联动的位置走

```typescript
// 反例：返回类型写死，类型参数形同虚设
function wrapBad<T>(value: T): Doc[] { /* ... */ }

// 正例：T 同时出现在参数与返回值，「传什么类型，拿回什么类型」才成立
function wrap<T>(value: T): { data: T; fetchedAt: Date } {
  return { data: value, fetchedAt: new Date() };
}
```

判断标准：**类型参数至少要在参数位置出现一次**，否则它要么是装饰（编译器只能推断成 `unknown`），要么应该显式传入。

### 3.2 多个类型参数：输入与输出分开

```typescript
// 映射文档集合：输入 T[]，输出 U[]，两个类型各自联动
function mapDocs<T, U>(docs: T[], fn: (item: T, index: number) => U): U[] {
  return docs.map(fn);
}

const titles = mapDocs([{ id: 1, title: 'A' }], (d) => d.title);  // string[]
```

T 描述输入元素，U 描述输出元素，`fn` 的签名把两者连起来——这正是 `Array.prototype.map` 的类型定义思路。

### 3.3 约束：不写 extends 的 T 什么都干不了

```typescript
function pickTitle<T>(obj: T) {
  return obj.title;    // 报错：T 上不一定有 title
}

// 加约束：T 必须至少有 title 属性
function pickTitleFixed<T extends { title: string }>(obj: T) {
  return obj.title;    // 合法，且返回类型是 string
}
```

约束的进阶玩法（`keyof` 约束实现类型安全的取属性函数、默认类型参数）在[泛型约束与默认值](/typescript/230-GenericConstraintDefault)专篇展开。

### 3.4 泛型类与泛型方法速览

泛型不只属于函数。类与接口同样能开类型参数槽：

```typescript
// 泛型接口：定义「取一批 T」的契约，ID 带默认值 string
interface Repo<T, ID = string> {
  get(id: ID): Promise<T | null>;
  list(): Promise<T[]>;
}

// 泛型类：内存版实现
class MemoryRepo<T extends { id: string }> implements Repo<T> {
  private items = new Map<string, T>();

  save(item: T): void {
    this.items.set(item.id, item);   // 约束保证 id 一定存在
  }
  async get(id: string): Promise<T | null> {
    return this.items.get(id) ?? null;
  }
  async list(): Promise<T[]> {
    return [...this.items.values()];
  }
}

const docs = new MemoryRepo<Doc>();
docs.save({ id: 'a1', title: 'x' });
```

注意一个硬限制：**泛型类的静态成员不能引用类的类型参数 T**。原因很直白：静态方法不经过实例，编译器无从知道 T 是什么。需要「静态 + 泛型」时，改成静态泛型方法、自己再开一个类型参数。

## 4. 常见错误与修正

### 错 1：把 T 当 any 用

```typescript
// 反例：T 与返回值无联动，等于 any
function firstBad<T>(arr: T[]): any { return arr[0]; }

// 正例
function first<T>(arr: T[]): T | undefined { return arr[0]; }
```

### 错 2：重载实现签名不兼容

```typescript
function f(x: string): number;
function f(x: number): string;
function f(x: string | number): boolean {  // 报错：实现签名与重载签名不兼容
  return typeof x === 'string' ? x.length : String(x);
}
// 修正：实现签名的参数与返回值要覆盖所有重载
function f2(x: string | number): number | string {
  return typeof x === 'string' ? x.length : String(x);
}
```

### 错 3：静态成员引用类的 T

```typescript
class Box<T> {
  static empty: T;           // 报错：静态成员不能引用类类型参数
  static emptyOf<U>(): Box<U> | null { return null; }  // 正确：自己开 U
}
```

### 错 4：约束写死键名导致不可复用

```typescript
// 反例：只能取 title
function getTitle(d: { title: string }): string { return d.title; }

// 正例：键也参数化，拼错键名编译期就报错
function getProp<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
```

`getProp` 用到的 `keyof` / 索引访问在[keyof、typeof 与索引访问类型](/typescript/210-KeyofTypeofIndexedAccessTypes)细讲。

### 自检清单

- [ ] 能判断一个「多输入」需求该用联合类型、重载还是泛型
- [ ] 能写出带实现签名的重载，并说出「精确在前、兜底在后」的原因
- [ ] 能解释类型参数为什么必须出现在参数位置
- [ ] 知道泛型类静态成员不能引用 T，以及替代写法
- [ ] 能把 `{ title: string }` 这类结构约束、`keyof` 约束用到自己的函数上

## 5. 练习

1. 给 `parseDate` 加第三个重载：传 `undefined` 返回 `null`，表示「frontmatter 没写日期」。注意重载顺序。
2. 用泛型给 `MemoryRepo` 补一个 `find(pred: (item: T) => boolean): T | undefined` 方法，思考为什么这个方法不需要新的类型参数。
3. FANDEX 的文档集合有 `Doc` 与 `Tag` 两种实体：用 `Repo<T>` 接口分别声明两个仓库变量，体会同一个接口约束不同实体时的补全体验。

## 6. 下一步

- [泛型约束与默认值](/typescript/230-GenericConstraintDefault)：`extends` 约束与默认类型参数的专篇
- [keyof、typeof 与索引访问类型](/typescript/210-KeyofTypeofIndexedAccessTypes)：`getProp` 背后的三个类型操作符
- [工具类型实现原理](/typescript/490-UtilityTypePrinciple)：泛型在类型层的高阶形态
- [类型推断深入](/typescript/160-TypeInferenceDeepDive)：编译器怎么推断 T
