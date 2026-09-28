---
order: 140
title: 索引签名与动态属性
module: 'typescript'
category: '前端技术'
difficulty: intermediate
description: 从「aria-* 属性与标签计数表」讲索引签名：键集合开放的类型怎么写、Record 的取舍、动态访问的 undefined 风险与 noUncheckedIndexedAccess，以及与映射类型的分工。
author: fanquanpp
updated: '2026-09-29'
related:
  - 'typescript/120-IntersectionTypeMerge'
  - 'typescript/470-MappedTypeAdvanced'
  - 'typescript/490-UtilityTypePrinciple'
  - 'typescript/360-TsconfigStrictMode'
prerequisites:
  - 'typescript/100-InterfaceTypeAlias'
  - 'typescript/110-LiteralUnionTypes'
---

## 0. 真实场景：键名事先列不全的对象

FANDEX 有两类数据，属性名写不成固定清单：

1. 文档卡片的透传属性：`aria-label`、`aria-describedby`、`data-track`……键名开放，值多是 string；
2. 标签统计表：`{ ts: 12, astro: 8, css: 3 }`，键是所有出现过的标签，运行时才知道。

用固定接口描述它们都会卡在同一个问题：**TS 默认认为「对象只能有接口里写过的键」**，多一个键就报错。索引签名（index signature）就是官方答案：声明「键符合某规则，值符合某类型」的对象。

## 1. 一句话理解

> 索引签名 = 「键集合开放」的声明：`{ [key: string]: T }` 读作「任意 string 键都行，值必须是 T」。它是接口的补集——接口管「键是已知且固定的」，索引签名管「键是运行时才定的」。

## 2. 动手：两类数据的类型化

### 2.1 透传属性：string 索引签名

```typescript
interface DocCardProps {
  title: string;
  excerpt?: string;
  // 任意其他属性，键是 string，值是 string
  [key: string]: string | undefined;
}

const props: DocCardProps = {
  title: '收窄',
  'aria-label': '文档卡片',        // 合法：没在接口里声明过
  'data-track': 'card_click',
};
```

注意值类型 `string | undefined`：写 `[key: string]: string` 后，`title: string` 仍合法（string 是它的子类型），但**其他已声明属性的类型必须兼容索引签名的值类型**——这是索引签名的硬规则：具名属性不能比签名更宽。

### 2.2 计数表：Record 一行搞定

`Record<K, V>` 是索引签名的标准库封装（`Record<string, number>` 等价于 `{ [k: string]: number }`）：

```typescript
type TagCount = Record<string, number>;

const counts: TagCount = { ts: 12, astro: 8 };
counts.css = (counts.css ?? 0) + 1;

// 键集合已知时，Record 更能发挥：键用字面量联合
type Tag = 'ts' | 'astro' | 'css';
type TagTable = Record<Tag, number>;
const table: TagTable = { ts: 0, astro: 0, css: 0 };
// table.rust = 1;   // 报错：'rust' 不在键集合里
```

`Record<string, number>`（开放）与 `Record<Tag, number>`（封闭）是两个世界：前者运行时任意长，后者键拼错直接报错。**键能列全就别用 string**——这是索引签名使用的第一纪律。

### 2.3 数字键与从对象读取

```typescript
type Sparse = { [index: number]: string };   // 类数组/稀疏映射

// 最常见的「string 键开放对象」其实来自 JSON/表单
type FormValue = string | number | boolean;
type FormDraft = Record<string, FormValue>;
const draft: FormDraft = { title: 'x', stars: 5 };
const v = draft['stars'];     // v: FormValue | undefined？
```

最后那行的真相取决于一个编译选项，看下一节。

## 3. 为什么：开放键的类型系统「知道得少」

索引签名的本质代价：**类型系统失去了「某个键一定存在」的知识**。`counts.css` 在 `Record<string, number>` 里类型是 `number`，但运行时完全可能 `undefined`——TS 老版本选择「装作不知道」，把访问结果标成 `number`，这是历史上无数「undefined is not a function」的来源。

`noUncheckedIndexedAccess`（strict 不包含、需手动开的编外选项）修正了这个谎言：开了之后，**所有经索引签名/数组的下标访问，结果类型自动附加 `| undefined`**：

```typescript
type TagCount = Record<string, number>;
const counts: TagCount = { ts: 12 };

// 关闭 noUncheckedIndexedAccess：counts.css 类型 number（谎言）
// 开启后：counts.css 类型 number | undefined —— 逼你写 counts.css ?? 0
```

FANDEX 的根 tsconfig 就开了这一项。团队决策建议：**新项目直接开**，多写几个 `??` 换取真实；老项目按模块渐进开。strict 全家桶的其余选项见[tsconfig 严格模式](/typescript/360-TsconfigStrictMode)。

与映射类型的分工（为什么两个都要学）：

| | 索引签名 / Record | 映射类型 `[K in keyof T]` |
| --- | --- | --- |
| 键集合 | 开放（string）或给定联合 | 来自另一个类型（keyof T） |
| 解决的问题 | 描述运行时动态数据 | 从已知类型**派生**新类型 |
| 例子 | 表单草稿、缓存、字典 | Partial、Readonly、变换 |

「描述外部来的数据」用索引签名，「从类型造类型」用映射——搞反了就会用 `Record<string, unknown>` 去描述明明有固定结构的实体，丢掉全部补全。

## 4. 坑点与自检

### 坑 1：给有固定结构的实体写 string 索引签名

```typescript
// 反例：把结构化数据当字典，全部访问失去类型
type Doc = Record<string, unknown>;

// 正例：固定字段用接口，开放部分才加签名
interface Doc {
  title: string;
  [extra: string]: unknown;   // 只有额外字段走 unknown
}
```

### 坑 2：具名属性比签名值类型宽

```typescript
interface Bad {
  tags: string[];
  [key: string]: string;      // 报错：tags 与签名不兼容
}
interface Good {
  tags: string[];
  [key: string]: string[] | string;   // 兼容了
}
```

### 坑 3：开放键对象直接点访问

`obj['some-key']` 没问题，`obj.someKey` 对「约定键」是赌运气——键不存在时看的是 noUncheckedIndexedAccess 开没开。开放键访问后统一接收窄或默认值。

### 坑 4：Record 键写联合后又想加新键

`Record<'a'|'b', number>` 是封闭类型，加 `c` 报错。需求是「这些键必有 + 可能更多」时写交叉：`Record<'a'|'b', number> & Record<string, number>`。

### 自检清单

- [ ] 能写出 string 索引签名并说出「具名属性必须兼容签名值类型」规则
- [ ] 能区分开放 Record 与封闭 Record 的适用场景
- [ ] 知道 noUncheckedIndexedAccess 改变了什么、自己项目开没开
- [ ] 能说出索引签名与映射类型的分工边界

## 5. 练习

1. 把 2.3 的 `FormDraft` 补一个 `getField(draft, key): FormValue | undefined` 函数，让返回类型诚实反映「可能没这个键」。
2. 写一个 `increment(table: TagCount, tag: string): TagCount`，在 noUncheckedIndexedAccess 开启的项目里编译通过（想想 `?? 0` 放哪）。
3. 在 FANDEX 根 tsconfig 确认 `noUncheckedIndexedAccess` 的值，然后写一行明知有风险的 `counts.css + 1`，对比开关前后的报错。

## 6. 下一步

- [映射类型进阶](/typescript/470-MappedTypeAdvanced)：从类型造类型的另一半
- [tsconfig 严格模式](/typescript/360-TsconfigStrictMode)：noUncheckedIndexedAccess 的决策上下文
- [类型守卫与自定义守卫](/typescript/150-TypeGuardCustomGuard)：开放键数据进门后的收窄
- [工具类型实现原理](/typescript/490-UtilityTypePrinciple)：Record 的手写实现
