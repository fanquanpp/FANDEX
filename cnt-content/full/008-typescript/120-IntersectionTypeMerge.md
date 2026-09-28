---
order: 120
title: 交叉类型与类型合并
module: 'typescript'
category: '前端技术'
difficulty: intermediate
description: 从「给组件 Props 追加字段」讲交叉类型：AND 语义、同名属性冲突变 never、接口声明合并，以及与联合类型、Partial 组合的实用模式。
author: fanquanpp
updated: '2026-09-29'
related:
  - 'typescript/110-LiteralUnionTypes'
  - 'typescript/100-InterfaceTypeAlias'
  - 'typescript/340-ModuleDeclarationGlobalAugmentation'
  - 'typescript/230-GenericConstraintDefault'
prerequisites:
  - 'typescript/100-InterfaceTypeAlias'
  - 'typescript/110-LiteralUnionTypes'
---

## 0. 真实场景：组件 Props 要「额外支持」几个字段

FANDEX 的文档卡片组件 `DocCard` 有自己的 Props；营销团队要求所有卡片都能额外传一个 `trackId` 做埋点；无障碍审计又要求支持任意 `aria-*` 属性。改 `DocCard` 的接口？每次需求都改核心类型，迟早失控。更好的表达是：**「原有 Props，再要求这些」**——交叉类型（intersection type）：

```typescript
interface DocCardProps {
  title: string;
  excerpt?: string;
}

type TrackedProps = { trackId: string };

function DocCard(props: DocCardProps & TrackedProps) {
  // props 既有 title 也有 trackId
}
```

`A & B` 读作「A 并且 B」：值必须同时满足两边。它是 `A | B`（或）的对偶——联合是「三选一」，交叉是「全都要」。

## 1. 一句话理解

> 交叉类型 = 类型层的 AND。成员属性取并集，同名属性取交叉；如果同名属性的类型不相容，结果那个属性变成 never——这是交叉类型最反直觉也最有用的一条规则。

## 2. 动手：四个高频用法

### 2.1 组合小接口，避免巨型接口

```typescript
interface WithId    { id: string }
interface WithAudit { createdBy: string; createdAt: string }

type DocRecord = WithId & WithAudit & { title: string };
```

比一个 8 字段大接口好在：字段按「职责」命名，`auditLog<T extends WithId & WithAudit>` 这类约束（见[泛型约束与默认值](/typescript/230-GenericConstraintDefault)）可以直接复用小接口。

### 2.2 追加字段而不改原类型

开头埋点需求的完整版，不动 `DocCardProps` 一个字：

```typescript
type TrackedDocCardProps = DocCardProps & { trackId: string };

// 更进一步：所有字段可选的「覆盖包」
type DocCardOverrides = Partial<DocCardProps>;
```

`A & Partial<B>` 是「继承 B 的形状、允许部分覆盖」的惯用法，React 组件包装里天天见。

### 2.3 同名属性冲突：never 的探测价值

```typescript
type A = { value: string };
type B = { value: number };

type C = A & B;
// C 的 value 类型是 string & number = never
// 任何值都同时不是 string 和 number → 这个属性没法赋值
```

这不是 bug，是**设计**：交叉要求「同时满足」，而没有任何值能既是 string 又是 number，TS 用 never 如实记录了这个矛盾（never 的语义见[never 类型完整语义](/typescript/190-NeverTypeSemantics)）。实战意义：`A & B` 编译后给 value 赋值会报错，等于**在类型层拦下了不兼容的合并**。想「覆盖」而不是「并存」，用 Omit 先摘掉旧字段：

```typescript
type Overridden = Omit<A, 'value'> & { value: number };
```

### 2.4 接口声明合并：交叉的「时间维度」亲戚

同名 interface 声明两次，字段自动合并——这不是交叉类型，是**声明合并**，但效果相似：

```typescript
interface Window {
  __FANDEX__: { version: string };
}
// 与 lib.dom.d.ts 里的 Window 合并，window.__FANDEX__ 有了类型
```

用场合：给全局对象、第三方库补字段（`declare global` / `declare module` 里写，机制详见[模块声明与全局类型增强](/typescript/340-ModuleDeclarationGlobalAugmentation)）。interface 能合并、type 别名同名会报错——这是「interface vs type」少数几个硬性差异之一。

## 3. 为什么：交叉是「交集」，属性冲突自然变 never

把类型当集合看：`A & B` 是集合的交集，值必须落在两个集合里。对同名属性：

- `string & string` 还是 `string`；
- `string & number` 是空集，即 never；
- `'a' | 'b' & ...` 联合相遇时逐成员取交（`('a'|'b') & ('a'|'c')` 得 `'a'`）。

这解释了交叉与联合的一条分配律：`A & (B | C)` 等价于 `(A & B) | (A & C)`——把公共要求 A 分摊到每个分支上。理解了「交集」，函数类型的交叉也不再神秘：两个函数类型的交叉，调用时必须同时满足两者的参数要求，行为上近似重载，标准库的 `Array.prototype.sort` 类型就用了这招。

**交叉不是继承**：`extends` 建立的是「is-a」关系、可被 `instanceof` 检测；交叉只是形状的交集，任何长得像的对象都能通过结构兼容赋值进来。

## 4. 坑点与自检

### 坑 1：以为交叉能「合并时后者覆盖前者」

`{ a: string } & { a: number }` 不会得到 `{ a: number }`，会得到 `{ a: never }`。要覆盖语义，`Omit` 旧字段再交叉新字段。

### 坑 2：交叉一个带可选和一个不带可选的同名属性

`{ a?: string } & { a: string }` 结果 `a` 是必选的 `string`——必选性「就高不就低」。预测交叉结果的修饰符时按「更严格的赢」判断。

### 坑 3：把交叉当继承用

交叉不出现在原型链上，`instanceof` 检测不了，也没有 `super`。要运行时继承语义用 class extends；纯类型组合才用交叉。

### 坑 4：疯狂交叉导致报错不可读

五六层交叉嵌套后，报错会把整条链展开。组合层次深时给中间类型命名，别写匿名长链。

### 自检清单

- [ ] 能说出交叉与联合的语义对偶（AND 与 OR）
- [ ] 能预测同名属性冲突、修饰符不同时的交叉结果
- [ ] 会用 `Omit & {...}` 表达「覆盖」
- [ ] 能区分声明合并（interface）与交叉类型，知道各自用在哪
- [ ] 能解释 `A & (B | C)` 的分配律

## 5. 练习

1. 写 `WithTimestamp<T>`：给任意类型追加 `createdAt: Date` 与 `updatedAt: Date`，然后故意交叉一个 `{ updatedAt: string }` 观察结果。
2. 用 `Omit` + 交叉写 `OverrideProps<Base, Over>`：Base 的字段被 Over 的同名字段覆盖，其余保留（Over 的键必须来自 Base，想想泛型约束怎么写）。
3. 在 FANDEX 仓库找一个 React 组件（如 app-web/src 下任意组件），看它的 Props 是 interface、type 还是交叉组合，判断换成 `Base & Partial<Override>` 是否更合适。

## 6. 下一步

- [索引签名与动态属性](/typescript/140-IndexSignatureDynamicProperty)：aria-* 这类开放键怎么建模
- [模块声明与全局类型增强](/typescript/340-ModuleDeclarationGlobalAugmentation)：声明合并的完整机制
- [泛型约束与默认值](/typescript/230-GenericConstraintDefault)：`T extends A & B` 的约束写法
- [类型兼容性](/typescript/200-TypeCompatibility)：交叉结果为什么能赋给原类型
