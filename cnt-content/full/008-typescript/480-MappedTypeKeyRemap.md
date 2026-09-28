---
order: 490
title: 映射类型与键重映射（as 子句）
module: 'typescript'
category: '前端技术'
difficulty: advanced
description: 映射类型的 as 子句专篇：改键名（加前缀、生成 getter/事件处理器名）、模板字面量拼键、按条件筛键，以及「键在映射里丢了」等报错的排查。
author: fanquanpp
updated: '2026-09-29'
related:
  - 'typescript/470-MappedTypeAdvanced'
  - 'typescript/500-TemplateLiteralType'
  - 'typescript/440-ConditionalTypeInfer'
  - 'typescript/490-UtilityTypePrinciple'
prerequisites:
  - 'typescript/470-MappedTypeAdvanced'
  - 'typescript/110-LiteralUnionTypes'
---

## 0. 真实场景：两份配置，两套键名

FANDEX 的主题令牌要服务两拨消费者：组件想用 `colorSurface` 这种驼峰属性；CSS 变量层想要 `--color-surface` 这种短横线键。底层只有一份源配置：

```typescript
const tokens = {
  colorSurface: '#ffffff',
  colorText: '#1a1a1a',
  fontSizeBase: '16px',
} as const;
```

需求：**不复制粘贴**，从 `tokens` 的键派生出两套键名各异的类型。改「值」用 `[K in keyof T]: ...` 就够；改「键」需要 TS 4.1 引入的 `as` 子句——本篇主角。

## 1. 一句话理解

> `as` 子句是映射循环里的「键加工站」：`[K in keyof T as NewKey]` 先取出每个键 K，经过 as 右边的表达式换成新键，再按新键生成属性。加工结果为 `never` 时，这个键被整个删掉——所以 as 子句同时是改名器和过滤器。

## 2. 动手：三个由浅入深的重映射

### 2.1 加前缀：键名批量改造

```typescript
type Prefixed<T, P extends string> = {
  [K in keyof T as `${P}${string & K}`]: T[K];
};

interface Theme {
  surface: string;
  text: string;
}

type CssVar = Prefixed<Theme, '--'>;
// { '--surface': string; '--text': string }
```

拆解 `${P}${string & K}`：

- `K` 在模板字面量里可以直接插入，但 K 的类型可能含 `symbol`（不能进模板字符串），`string & K` 是「把 K 收窄成 string 形态」的惯用守门写法——symbol 键交集为 never，正好被模板字面量拒收；
- 模板字面量类型把 `'--'` 和 `'surface'` 拼成字面量类型 `'--surface'`。

模板字面量类型的完整玩法见[模板字面量类型](/typescript/500-TemplateLiteralType)。

### 2.2 筛键：as 结果为 never 就删

```typescript
// 只保留 string 类型的属性
type StringsOnly<T> = {
  [K in keyof T as T[K] extends string ? K : never]: T[K];
};

interface Config {
  mode: string;
  retries: number;
  label: string;
}

type S = StringsOnly<Config>;
// { mode: string; label: string }  —— retries 消失了
```

注意结构：as 后面的表达式是**条件类型**，条件成立保留原键名 `K`，不成立给 `never`。470 篇讲过「值变换 + 条件」，这里是「键变换 + 条件」，分工更清晰：**as 管键，冒号后面管值**。

### 2.3 改名 + 筛键 + 值变换，一气呵成

经典综合题：把对象的所有方法名加上 `on` 前缀，生成事件处理器表：

```typescript
type Handlers<T> = {
  [K in keyof T as T[K] extends (...args: never[]) => void
    ? `on${string & K}`
    : never
  ]: T[K];
};

interface DocActions {
  save: () => void;
  revert: () => void;
  version: number;
}

type DocHandlers = Handlers<DocActions>;
// { onsave: () => void; onrevert: () => void }
```

再进一步，用模板字面量的内置工具做大小写转换，把 `save` 变成 `onSave`：

```typescript
type OnHandlers<T> = {
  [K in keyof T as T[K] extends (...args: never[]) => void
    ? `on${Capitalize<string & K>}`
    : never
  ]: T[K];
};
// { onSave: () => void; onRevert: () => void }
```

`Capitalize` 是 TS 内置的四个字符串工具类型之一（`Uppercase`/`Lowercase`/`Uncapitalize`），在 500 篇有完整清单。

## 3. 为什么：as 之前，键是「只读的循环变量」

没有 as 的年代，映射只能改值、不能改键——因为 `K in keyof T` 里 K 只是循环变量，冒号左边没地方放表达式。as 子句的语义就一句话：**循环变量 K 在进入属性名位置之前，先过一遍变换**。这把映射类型从「值的变换器」升级成「键值双变换器」，两件以前做不到的事变得顺理成章：

1. **键名跟随业务命名规范**（前缀、大小写、单复数），类型层自动同步；
2. **键过滤有了标准姿势**（条件给 never），不用再绕「Optional 化再剔除」的弯路。

同态性不受影响：只要 in 右边仍是 `keyof T`，原类型的修饰符照常保留（470 篇口诀）。

## 4. 坑点与自检

### 坑 1：symbol 键炸了模板字面量

```typescript
type Bad<T> = { [K in keyof T as `${K}`]: T[K] };
// 含 symbol 键的 T 会报错：symbol 不能用于模板字面量
type Good<T> = { [K in keyof T as `${string & K}`]: T[K] };  // 惯用防御
```

### 坑 2：以为 as 会保留修饰符——会，但键名变了

`{ [K in keyof T as ...]?: T[K] }` 的 `?` 仍会随原键带过来（同态），但 renamed 之后的键与原键的可选性一一对应。若 as 把两个键映射成同一个新键，后者覆盖前者——别这么写。

### 坑 3：条件写反，键全没了

`as` 里条件不成立给的是 `never`，不是「保持原样」。写出 `T[K] extends V ? never : K` 这种反向逻辑时，测试一个样例输入，悬停看结果类型。

### 坑 4：复杂 as 链导致悬停不可读

连续两层键重映射（重命名再过滤）会把 hover 提示变成一长串条件类型。超过一层就拆成两个命名工具类型，中间类型起名字。

### 自检清单

- [ ] 能说出 as 子句的两个作用：改键名与删键（never）
- [ ] 会写 `${string & K}` 并解释它防什么
- [ ] 能用条件类型在 as 里筛出函数属性 / string 属性
- [ ] 会用 Capitalize 等内置字符串工具类型拼新键名
- [ ] 知道 as 不破坏同态性（in 右边仍是 keyof T 时）

## 5. 练习

1. 写 `Unprefixed<T, P extends string>`：把 `Prefixed<T, P>` 的键去掉前缀还原（提示：模板字面量在 extends 左侧可以模式匹配：`` `${P}${infer Rest}` ``，配合 440 篇的 infer）。
2. FANDEX 的 i18n 词条对象 `{ 'nav.home': string; 'nav.about': string; 'footer': string }`：用 as 子句筛出所有 `nav.` 开头的键，并把前缀去掉，得到 `{ home: string; about: string }`。
3. 给 2.3 的 `OnHandlers` 加约束，要求 T 至少有一个函数属性，否则编译报错（想想 `keyof T` 与条件类型怎么合作）。

## 6. 下一步

- [模板字面量类型](/typescript/500-TemplateLiteralType)：键名拼接背后的字符串类型系统
- [工具类型实现原理](/typescript/490-UtilityTypePrinciple)：用 as 重写 Omit
- [类型体操实用模式](/typescript/530-TypeGymnasticsPracticalPatterns)：映射类型的模式速查
- [infer 专题](/typescript/440-ConditionalTypeInfer)：练习 1 需要的模式匹配能力
