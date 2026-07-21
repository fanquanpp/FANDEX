---
order: 75
title: 类型安全的国际化
module: typescript
category: TypeScript
difficulty: intermediate
description: 构建类型安全的i18n系统
author: fanquanpp
updated: '2026-06-14'
related:
  - typescript/类型安全的表单验证
  - typescript/类型安全的路由
  - typescript/类型安全的配置系统
  - typescript/类型安全的数据库查询
prerequisites:
  - typescript/语法速查
---

## 第一章 概述

### 1.1 为什么需要类型安全的国际化

国际化（Internationalization，简称 i18n，因为首尾字符 i 与 n 之间共有 18 个字符）是现代前端应用支持多语言、多地区、多文化习惯的核心能力。一个完整的 i18n 系统需要处理翻译文本、日期格式、数字格式、货币符号、复数规则、性别、时区等众多维度。

传统的 i18n 方案（如 i18next、vue-i18n、react-intl 的早期版本）使用字符串键访问翻译文本：

```typescript
// 传统方案：字符串键，无类型保护
const t = (key: string, params?: Record<string, unknown>): string => { /* ... */ };

t('app.title');                    // OK，但无法验证键是否存在
t('user.greeting', { name: '张三' }); // OK，但无法验证参数类型
t('unknown.key');                  // 编译通过，运行时回退
t('user.greeting', { naem: '张三' }); // 拼写错误，编译通过
```

这种方案存在三大问题：

1. **键存在性无保证**：`t('unknown.key')` 在编译时不会报错，只在运行时返回回退值，掩盖了翻译键遗漏的真实问题。
2. **参数类型无约束**：`t('user.greeting', { naem: '张三' })` 中的 `naem` 是 `name` 的拼写错误，编译器无法发现。
3. **键重构困难**：重命名翻译键需要全文搜索字符串，容易遗漏，且无法通过 IDE 重构工具自动完成。

通过 TypeScript 的字面量类型（Literal Types）、条件类型（Conditional Types）、泛型约束（Generic Constraints）、模板字面量类型（Template Literal Types）和映射类型（Mapped Types），可以构建一个**完全类型安全**的 i18n 系统，实现：

- **键存在性编译时检查**：使用未定义的键会立即编译报错。
- **参数类型精确约束**：每个键的参数结构由类型定义，拼写错误与类型不匹配都会报错。
- **IDE 自动补全**：输入 `t('` 后，IDE 会列出所有可用键。
- **键重构支持**：重命名键时，IDE 能自动更新所有引用。
- **翻译完整性检查**：使用 `satisfies` 等机制确保所有语言的翻译键完整。

### 1.2 学习目标

完成本教程后，读者将能够：

1. 设计类型安全的翻译键类型系统，支持扁平键与嵌套键两种组织方式。
2. 实现参数化翻译函数，根据键自动推断参数类型与返回类型。
3. 处理复数形式（Plural Forms）、性别变体、上下文变体等复杂 i18n 场景。
4. 集成 ICU MessageFormat 与类型系统，支持复杂的消息格式化。
5. 实现类型安全的日期、数字、货币格式化。
6. 构建翻译完整性检查工具，确保多语言翻译键同步。
7. 在 React、Vue 等框架中集成类型安全的 i18n Hook。
8. 优化大型 i18n 系统的编译性能与运行时性能。

### 1.3 本教程的定位

本教程是 TypeScript "类型安全应用"系列的第四篇，与《类型安全的路由》、《类型安全的表单验证》、《类型安全的配置系统》形成互补。前者侧重特定领域的类型设计模式，本教程侧重"如何用类型系统约束字符串键访问"这一通用模式。

参考 Stanford CS142《Web Applications》课程对 i18n 的讲解方式：从基础的字符串替换到完整的 ICU MessageFormat，逐步构建一个生产可用的 i18n 系统。本教程将这一过程用 TypeScript 的类型系统加以约束，使每一步都有编译时保证。

### 1.4 i18n 的维度

完整的 i18n 系统涉及多个维度，本教程覆盖以下内容：

| 维度 | 说明 | 本教程覆盖 |
|------|------|-----------|
| 翻译文本 | 字符串文本的多语言映射 | 是 |
| 参数插值 | 动态参数嵌入翻译文本 | 是 |
| 复数形式 | 根据数量选择不同翻译 | 是 |
| 日期格式 | 不同地区的日期表示 | 是 |
| 数字格式 | 不同地区的数字表示 | 是 |
| 货币格式 | 不同地区的货币表示 | 是 |
| 性别变体 | 根据性别选择不同翻译 | 是 |
| 上下文变体 | 根据上下文选择不同翻译 | 是 |
| 文本方向 | RTL（从右到左）语言支持 | 否（运行时关注） |
| 时区 | 不同时区的时间表示 | 否（运行时关注） |
| 字符集 | 不同字符集编码 | 否（基础设施关注） |

### 1.5 核心问题导引

阅读本教程时请带着以下问题：

1. **键的组织方式**：扁平键（`'app.title'`）与嵌套键（`{ app: { title: ... } }`）各有什么优劣？如何在类型层面实现两者？
2. **参数类型推断**：如何让 `t('user.greeting', { name: '张三' })` 中的 `name` 参数由 `user.greeting` 键自动推断？
3. **复数规则**：不同语言的复数规则差异巨大（英语有 one/other，阿拉伯语有 six 种），如何在类型层面表达？
4. **完整性检查**：如何确保新增翻译键时，所有语言都有对应翻译？
5. **性能权衡**：复杂的类型约束会增加编译时间，如何在类型安全与编译性能间取得平衡？

## 第二章 基础概念

### 2.1 翻译键的类型化

翻译键（Translation Key）是 i18n 系统的核心标识符。在类型安全的 i18n 系统中，翻译键不是任意的 `string`，而是受限的联合类型（Union Type）：

```typescript
// 翻译键联合类型
type TranslationKey =
  | 'app.title'
  | 'app.subtitle'
  | 'user.greeting'
  | 'user.profile'
  | 'errors.required';

// 类型安全的翻译函数签名
declare function t(key: TranslationKey): string;

t('app.title');     // OK
t('unknown.key');   // 编译错误：'unknown.key' 不属于 TranslationKey
```

这一最基础的约束已经消除了"键不存在"的运行时错误。数学上，可以表示为：

$$
\mathrm{Key} \in \mathrm{TranslationKey} \iff \mathrm{t}(\mathrm{Key}) \text{ is well-typed}
$$

### 2.2 参数化翻译

许多翻译文本包含动态参数，如 `你好，{name}` 中的 `{name}`。参数化翻译要求每个键关联一个**参数类型**：

```typescript
// 翻译键及其参数类型映射
type TranslationKeys = {
  'app.title': string;                    // 无参数，值为字符串
  'user.greeting': { name: string };      // 需要 name 参数
  'user.profile': { name: string; age: number }; // 需要多个参数
  'items.count': { count: number };       // 需要数字参数
};
```

这里使用了"键到参数类型的映射"模式：值为 `string` 表示无参数，值为对象类型表示需要对应参数。

### 2.3 翻译函数的条件签名

基于参数类型映射，翻译函数的签名根据键的条件变化：

- 无参数键（值为 `string`）：`t(key) => string`
- 有参数键（值为对象）：`t(key, params) => string`

这一条件签名通过条件类型与可变元组实现：

```typescript
type Translate = <K extends keyof TranslationKeys>(
  key: K,
  ...args: TranslationKeys[K] extends string
    ? []
    : [params: TranslationKeys[K]]
) => string;
```

数学定义：

$$
\mathrm{t}(k, \ldots) : \begin{cases}
\mathrm{string} & \text{if } \mathrm{TranslationKeys}[k] = \mathrm{string} \\
\mathrm{string} & \text{if } \mathrm{TranslationKeys}[k] = P \text{ and } \mathrm{args} = [P]
\end{cases}
$$

### 2.4 语言类型

支持的语言定义为联合类型：

```typescript
type Locale = 'zh-CN' | 'en-US' | 'ja-JP' | 'ko-KR';
```

这一类型贯穿整个 i18n 系统，用于约束翻译数据、格式化器、语言切换等所有与语言相关的操作。

### 2.5 翻译数据结构

翻译数据是 `Locale -> Key -> Translation` 的嵌套映射：

```typescript
type TranslationData = Record<Locale, Record<keyof TranslationKeys, string | ((params: any) => string)>>;
```

每个语言对应一个键到翻译（字符串或参数化函数）的映射。这一结构是 i18n 系统的数据基础。

## 第三章 历史演变

### 3.1 早期：字符串键 + 运行时查找（2005-2010）

最早的 i18n 方案（如 GNU gettext、Java ResourceBundle）使用字符串键 + 运行时查找，无任何类型约束：

```javascript
// 早期方案：无类型约束
const translations = {
  'zh-CN': { 'app.title': '我的应用' },
  'en-US': { 'app.title': 'My App' },
};

function t(key) {
  return translations[currentLocale][key] || key;
}
```

这一方案的问题：键拼写错误、参数遗漏、翻译不完整等问题都只能在运行时发现。

### 3.2 中期：TypeScript + 索引签名（2015-2018）

TypeScript 兴起后，开发者用索引签名提供部分类型约束：

```typescript
interface Translations {
  [key: string]: string;
}

const translations: Record<Locale, Translations> = { /* ... */ };
function t(key: string): string { /* ... */ }
```

这一方案仅约束了 `key` 为 `string`，无法验证具体键的存在性，与无类型约束相差无几。

### 3.3 成熟期：联合类型键 + 条件类型签名（2018-2021）

TypeScript 2.8 引入条件类型后，开发者开始构建真正的类型安全 i18n：

```typescript
type TranslationKeys = {
  'app.title': string;
  'user.greeting': { name: string };
};

type Translate = <K extends keyof TranslationKeys>(
  key: K,
  ...args: TranslationKeys[K] extends string ? [] : [TranslationKeys[K]]
) => string;
```

这一方案实现了键存在性检查与参数类型约束，是现代类型安全 i18n 的基础。类型安全 i18n 库（如 lingui、@formatjs/intl、typesafe-i18n）大多采用这一思路。

### 3.4 现代期：模板字面量类型 + 嵌套键（2021 至今）

TypeScript 4.1 引入模板字面量类型后，i18n 类型系统支持了更复杂的场景：

- **嵌套键展开**：将 `{ app: { title: ... } }` 自动展开为 `'app.title'` 联合类型。
- **复数形式**：通过模板字面量类型生成 `items.zero`、`items.one`、`items.other` 等键。
- **ICU MessageFormat 解析**：通过模板字面量类型解析 ICU 消息中的参数占位符。

```typescript
// 嵌套键展开
type FlattenKeys<T, Prefix extends string = ''> = T extends object
  ? { [K in keyof T]: FlattenKeys<T[K], Prefix extends '' ? K : `${Prefix}.${K}`> }[keyof T]
  : Prefix;
```

### 3.5 类型安全 i18n 库的时间线

| 年份 | 库/工具 | 主要特性 |
|------|---------|---------|
| 2014 | i18next | 早期主流方案，字符串键，无类型约束 |
| 2016 | react-intl | React 生态 i18n，ICU MessageFormat |
| 2018 | typesafe-i18n | 首个完全类型安全的 i18n 库 |
| 2020 | @lingui/core | 类型安全 + 编译时优化 |
| 2021 | @formatjs/intl | ICU MessageFormat + TypeScript 类型 |
| 2022 | paraglide | 基于编译时生成的类型安全 i18n |
| 2023 | typesafe-i18n v5 | 完整类型安全 + 异步加载 |

## 第四章 设计哲学

### 4.1 类型驱动开发

类型安全 i18n 的核心哲学是"类型驱动开发"（Type-Driven Development）：先定义翻译键的类型，再实现翻译数据与翻译函数。类型定义是"契约"，实现是"履约"。

```typescript
// 1. 先定义类型契约
type TranslationKeys = {
  'app.title': string;
  'user.greeting': { name: string };
};

// 2. 再实现翻译数据（必须满足契约）
const translations: Record<Locale, TranslationData<TranslationKeys>> = { /* ... */ };

// 3. 最后实现翻译函数（自动获得类型安全）
const t = createTranslator<TranslationKeys>(translations);
```

这一哲学源自 Idris、Agda 等依赖类型语言的传统：类型先于实现，类型即规约。

### 4.2 单一真相源

类型安全的 i18n 系统中，翻译键的类型定义是"单一真相源"（Single Source of Truth）：

- 翻译数据必须满足类型定义。
- 翻译函数的签名由类型定义派生。
- IDE 自动补全基于类型定义。
- 翻译完整性检查基于类型定义。

避免在多处定义键集合，导致不一致。

### 4.3 渐进式类型增强

i18n 系统的类型安全是渐进式的，可以从无类型约束逐步升级到完全类型安全：

```typescript
// Level 0：无类型约束
function t(key: string): string { /* ... */ }

// Level 1：键存在性检查
function t<K extends keyof TranslationKeys>(key: K): string { /* ... */ }

// Level 2：参数类型约束
function t<K extends keyof TranslationKeys>(
  key: K,
  ...args: TranslationKeys[K] extends string ? [] : [TranslationKeys[K]]
): string { /* ... */ }

// Level 3：翻译完整性检查
const translations = { /* ... */ } satisfies Record<Locale, TranslationData<TranslationKeys>>;
```

这一渐进式策略降低了迁移成本，已有项目可以逐步升级。

### 4.4 编译时与运行时分离

类型安全 i18n 的类型约束在编译时完全消除，运行时只保留必要的数据与逻辑：

- **编译时**：键存在性检查、参数类型检查、翻译完整性检查。
- **运行时**：语言切换、参数插值、格式化、回退策略。

这一分离确保类型安全不带来运行时开销。数学上：

$$
\mathrm{CompileTime}(\mathrm{t}(k, p)) \vdash \mathrm{RuntimeTime}(\mathrm{t}(k, p)) \text{ is safe}
$$

### 4.5 类型安全与灵活性平衡

完整的类型安全有时会牺牲灵活性。例如，动态拼接翻译键（`t(\`errors.${field}\`)`）在严格的类型约束下难以实现。设计 i18n 系统时需要在类型安全与灵活性间平衡：

- **严格模式**：所有键必须显式列出，禁止动态拼接。
- **宽松模式**：允许动态拼接，但运行时检查键存在性。

```typescript
// 严格模式
declare function t<K extends keyof TranslationKeys>(key: K, ...args: ...): string;

// 宽松模式
declare function t(key: keyof TranslationKeys | string, ...args: ...): string;
```

## 第五章 语法与语义

### 5.1 字面量类型作为键

TypeScript 的字面量类型（Literal Types）是类型安全 i18n 的基础。字面量类型允许将具体的字符串值作为类型：

```typescript
type AppTitle = 'app.title';
let key: AppTitle = 'app.title';  // OK
key = 'app.subtitle';             // 编译错误
```

联合字面量类型构成翻译键的集合：

```typescript
type TranslationKey = 'app.title' | 'app.subtitle' | 'user.greeting';
```

### 5.2 keyof 操作符

`keyof T` 提取类型 `T` 的所有键作为联合类型：

```typescript
interface TranslationKeys {
  'app.title': string;
  'user.greeting': { name: string };
}

type TranslationKey = keyof TranslationKeys;
// 'app.title' | 'user.greeting'
```

这是从翻译键映射类型派生键联合类型的标准方式。

### 5.3 条件类型与可变元组

条件类型（Conditional Types）根据类型关系选择不同分支。结合可变元组（Variadic Tuples）实现条件参数：

```typescript
type Params<K extends keyof TranslationKeys> =
  TranslationKeys[K] extends string ? [] : [params: TranslationKeys[K]];

type Translate = <K extends keyof TranslationKeys>(key: K, ...args: Params<K>) => string;
```

**语义**：
- 若 `TranslationKeys[K]` 是 `string`（无参数键），`Params<K>` 为 `[]`，调用时不需要参数。
- 若 `TranslationKeys[K]` 是对象类型（有参数键），`Params<K>` 为 `[params: ...]`，调用时必须传入参数。

### 5.4 模板字面量类型

模板字面量类型（Template Literal Types）在 i18n 中用于：

1. **嵌套键展开**：将嵌套对象类型展开为点分路径联合类型。
2. **ICU 消息解析**：从 ICU 消息中提取参数占位符。
3. **键模式匹配**：匹配特定模式的键（如 `errors.*`）。

```typescript
// 嵌套键展开
type FlattenKeys<T, Prefix extends string = ''> = T extends object
  ? T extends Function
    ? never
    : {
        [K in keyof T & string]: FlattenKeys<
          T[K],
          Prefix extends '' ? K : `${Prefix}.${K}`
        >;
      }[keyof T]
  : Prefix;

// 使用
interface NestedTranslations {
  app: { title: string; subtitle: string };
  user: { greeting: { name: string }; logout: string };
}

type FlatKey = FlattenKeys<NestedTranslations>;
// 'app.title' | 'app.subtitle' | 'user.greeting' | 'user.logout'
```

### 5.5 映射类型与同态性

映射类型（Mapped Types）用于遍历翻译键映射，生成翻译数据类型：

```typescript
// 翻译数据类型：每个键对应字符串或参数化函数
type TranslationData<T> = {
  [K in keyof T]: T[K] extends string
    ? string
    : (params: T[K]) => string;
};
```

注意这是非同态映射（`K in keyof T` 而非 `K in keyof T as ...`），不保留修饰符，但翻译数据类型通常不需要修饰符。

### 5.6 satisfies 操作符

`satisfies` 操作符（TypeScript 4.9+）用于验证对象满足某个类型，同时保留对象的具体类型：

```typescript
const translations = {
  'app.title': '我的应用',
  'user.greeting': ({ name }: { name: string }) => `你好，${name}`,
} satisfies Record<Locale, Record<keyof TranslationKeys, string | ((params: any) => string)>>;
```

`satisfies` 的优势：
- 验证翻译数据满足类型契约（完整性检查）。
- 保留 `translations` 的具体类型，便于后续操作。
- 比 `: Type` 注解更安全，因为后者会拓宽类型。

### 5.7 分布式条件类型

条件类型在裸类型参数上自动分发，对处理复数形式等场景有用：

```typescript
// 复数键联合类型
type PluralKey = 'items.zero' | 'items.one' | 'items.other';

// 根据数量选择复数键
type SelectPlural<N extends number> = N extends 0
  ? 'items.zero'
  : N extends 1
  ? 'items.one'
  : 'items.other';
```

## 第六章 实战示例

### 6.1 基础 i18n 系统实现

完整的类型安全 i18n 系统包含三个部分：类型定义、翻译数据、翻译函数。

```typescript
// ============== 类型定义 ==============

type Locale = 'zh-CN' | 'en-US';

// 翻译键及其参数类型映射
interface TranslationKeys {
  'app.title': string;
  'app.subtitle': string;
  'user.greeting': { name: string };
  'user.profile': { name: string; age: number };
  'items.count': { count: number };
  'errors.required': { field: string };
  'errors.invalid': { field: string; type: string };
}

// 翻译数据类型
type TranslationData = {
  [K in keyof TranslationKeys]: TranslationKeys[K] extends string
    ? string
    : (params: TranslationKeys[K]) => string;
};

// 翻译函数类型
type Translate = <K extends keyof TranslationKeys>(
  key: K,
  ...args: TranslationKeys[K] extends string
    ? []
    : [params: TranslationKeys[K]]
) => string;

// ============== 翻译数据 ==============

const translations: Record<Locale, TranslationData> = {
  'zh-CN': {
    'app.title': '我的应用',
    'app.subtitle': '一个类型安全的 i18n 示例',
    'user.greeting': ({ name }) => `你好，${name}`,
    'user.profile': ({ name, age }) => `${name}，${age} 岁`,
    'items.count': ({ count }) => `${count} 个项目`,
    'errors.required': ({ field }) => `${field} 不能为空`,
    'errors.invalid': ({ field, type }) => `${field} 必须是 ${type} 类型`,
  },
  'en-US': {
    'app.title': 'My App',
    'app.subtitle': 'A type-safe i18n example',
    'user.greeting': ({ name }) => `Hello, ${name}`,
    'user.profile': ({ name, age }) => `${name}, ${age} years old`,
    'items.count': ({ count }) => `${count} items`,
    'errors.required': ({ field }) => `${field} is required`,
    'errors.invalid': ({ field, type }) => `${field} must be a ${type}`,
  },
};

// ============== 翻译函数实现 ==============

let currentLocale: Locale = 'zh-CN';

const t: Translate = (key, ...args) => {
  const value = translations[currentLocale][key];
  if (typeof value === 'function') {
    return value(args[0] as never);
  }
  return value;
};

// ============== 使用 ==============

t('app.title');                              // "我的应用"
t('user.greeting', { name: '张三' });         // "你好，张三"
t('user.profile', { name: '张三', age: 30 }); // "张三，30 岁"
t('items.count', { count: 5 });               // "5 个项目"

// 编译错误示例
// t('unknown.key');                           // 错误：'unknown.key' 不属于 keyof TranslationKeys
// t('user.greeting');                         // 错误：缺少参数 { name: string }
// t('user.greeting', { naem: '张三' });        // 错误：naem 拼写错误，应为 name
// t('user.greeting', { name: 123 });          // 错误：name 应为 string
```

### 6.2 嵌套键的实现

嵌套键组织更清晰，但类型实现更复杂：

```typescript
// 嵌套翻译键类型
interface NestedTranslations {
  app: {
    title: string;
    subtitle: string;
  };
  user: {
    greeting: { name: string };
    profile: { name: string; age: number };
    logout: string;
  };
  errors: {
    required: { field: string };
    invalid: { field: string; type: string };
    network: string;
  };
}

// 嵌套键展开为点分路径
type FlattenKeys<T, Prefix extends string = ''> = T extends object
  ? T extends Function
    ? never
    : {
        [K in keyof T & string]: FlattenKeys<
          T[K],
          Prefix extends '' ? K : `${Prefix}.${K}`
        >;
      }[keyof T]
  : Prefix;

// 根据点分路径获取类型
type GetTypeByPath<T, Path extends string> =
  Path extends `${infer Head}.${infer Rest}`
    ? Head extends keyof T
      ? GetTypeByPath<T[Head], Rest>
      : never
    : Path extends keyof T
    ? T[Path]
    : never;

// 翻译函数类型
type NestedTranslate = <K extends FlattenKeys<NestedTranslations>>(
  key: K,
  ...args: GetTypeByPath<NestedTranslations, K> extends string
    ? []
    : [params: GetTypeByPath<NestedTranslations, K>]
) => string;

// 翻译数据实现
const nestedTranslations: Record<Locale, any> = {
  'zh-CN': {
    app: {
      title: '我的应用',
      subtitle: '一个类型安全的 i18n 示例',
    },
    user: {
      greeting: ({ name }: { name: string }) => `你好，${name}`,
      profile: ({ name, age }: { name: string; age: number }) => `${name}，${age} 岁`,
      logout: '退出登录',
    },
    errors: {
      required: ({ field }: { field: string }) => `${field} 不能为空`,
      invalid: ({ field, type }: { field: string; type: string }) => `${field} 必须是 ${type} 类型`,
      network: '网络错误',
    },
  },
  'en-US': {
    app: {
      title: 'My App',
      subtitle: 'A type-safe i18n example',
    },
    user: {
      greeting: ({ name }: { name: string }) => `Hello, ${name}`,
      profile: ({ name, age }: { name: string; age: number }) => `${name}, ${age} years old`,
      logout: 'Logout',
    },
    errors: {
      required: ({ field }: { field: string }) => `${field} is required`,
      invalid: ({ field, type }: { field: string; type: string }) => `${field} must be a ${type}`,
      network: 'Network error',
    },
  },
};

// 嵌套翻译函数实现
const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
};

const nt: NestedTranslate = (key, ...args) => {
  const value = getNestedValue(nestedTranslations[currentLocale], key);
  if (typeof value === 'function') {
    return value(args[0]);
  }
  return value;
};

// 使用
nt('app.title');                              // "我的应用"
nt('user.greeting', { name: '张三' });         // "你好，张三"
nt('errors.network');                          // "网络错误"
```

### 6.3 复数形式处理

复数形式是 i18n 的难点，不同语言的复数规则不同：

```typescript
// 复数形式类型定义
interface PluralTranslations {
  'items.zero': string;
  'items.one': string;
  'items.other': { count: number };
  'users.zero': string;
  'users.one': string;
  'users.other': { count: number };
}

// 复数规则函数
type PluralRule = (n: number) => 'zero' | 'one' | 'other';

const pluralRules: Record<Locale, PluralRule> = {
  'zh-CN': (n) => (n === 0 ? 'zero' : 'other'), // 中文不区分单复数
  'en-US': (n) => (n === 0 ? 'zero' : n === 1 ? 'one' : 'other'),
};

// 类型安全的复数翻译函数
function tPlural<K extends string>(
  baseKey: K,
  count: number,
): string {
  const rule = pluralRules[currentLocale](count);
  const fullKey = `${baseKey}.${rule}` as keyof PluralTranslations;
  const value = (pluralTranslationsData[currentLocale] as any)[fullKey];
  if (typeof value === 'function') {
    return value({ count });
  }
  return value;
}

const pluralTranslationsData: Record<Locale, PluralTranslations> = {
  'zh-CN': {
    'items.zero': '没有项目',
    'items.one': '1 个项目',
    'items.other': ({ count }) => `${count} 个项目`,
    'users.zero': '没有用户',
    'users.one': '1 个用户',
    'users.other': ({ count }) => `${count} 个用户`,
  },
  'en-US': {
    'items.zero': 'No items',
    'items.one': '1 item',
    'items.other': ({ count }) => `${count} items`,
    'users.zero': 'No users',
    'users.one': '1 user',
    'users.other': ({ count }) => `${count} users`,
  },
};

// 使用
tPlural('items', 0);  // "没有项目" / "No items"
tPlural('items', 1);  // "1 个项目" / "1 item"
tPlural('items', 5);  // "5 个项目" / "5 items"
```

### 6.4 日期与数字格式化

日期、数字、货币的格式化基于 `Intl` API，类型层面对格式选项进行约束：

```typescript
// 日期格式类型
type DateFormat = 'short' | 'medium' | 'long' | 'full';

// 数字格式类型
type NumberFormat = 'decimal' | 'currency' | 'percent' | 'scientific';

// 货币代码类型（ISO 4217）
type Currency = 'CNY' | 'USD' | 'EUR' | 'JPY' | 'KRW';

// 日期格式化器
const dateFormatter: Record<Locale, Record<DateFormat, Intl.DateTimeFormat>> = {
  'zh-CN': {
    short: new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }),
    medium: new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' }),
    long: new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }),
    full: new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', hour: '2-digit', minute: '2-digit' }),
  },
  'en-US': {
    short: new Intl.DateTimeFormat('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }),
    medium: new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
    long: new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }),
    full: new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', hour: '2-digit', minute: '2-digit' }),
  },
};

function formatDate(date: Date, format: DateFormat): string {
  return dateFormatter[currentLocale][format].format(date);
}

// 数字格式化器
function formatNumber(value: number, format: NumberFormat, currency?: Currency): string {
  switch (format) {
    case 'decimal':
      return new Intl.NumberFormat(currentLocale).format(value);
    case 'currency':
      return new Intl.NumberFormat(currentLocale, {
        style: 'currency',
        currency: currency ?? 'CNY',
      }).format(value);
    case 'percent':
      return new Intl.NumberFormat(currentLocale, { style: 'percent' }).format(value);
    case 'scientific':
      return new Intl.NumberFormat(currentLocale, { notation: 'scientific' }).format(value);
  }
}

// 使用
formatDate(new Date(), 'long');                  // "2026 年 7 月 21 日 星期一"
formatNumber(1234567.89, 'decimal');             // "1,234,567.89"
formatNumber(99.99, 'currency', 'USD');          // "$99.99"
formatNumber(0.85, 'percent');                   // "85%"
```

### 6.5 React Hook 集成

在 React 中，类型安全的 i18n Hook 提供翻译函数与语言切换：

```typescript
import { useState, useCallback, useMemo, ReactNode } from 'react';

// i18n Context
interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translate;
  formatDate: (date: Date, format: DateFormat) => string;
  formatNumber: (value: number, format: NumberFormat, currency?: Currency) => string;
}

// React Hook
function useI18n(): I18nContextValue {
  const [locale, setLocale] = useState<Locale>('zh-CN');

  const t = useCallback<Translate>((key, ...args) => {
    const value = translations[locale][key];
    if (typeof value === 'function') {
      return value(args[0] as never);
    }
    return value;
  }, [locale]);

  const formatDateFn = useCallback(
    (date: Date, format: DateFormat) => dateFormatter[locale][format].format(date),
    [locale],
  );

  const formatNumberFn = useCallback(
    (value: number, format: NumberFormat, currency?: Currency) => {
      switch (format) {
        case 'decimal':
          return new Intl.NumberFormat(locale).format(value);
        case 'currency':
          return new Intl.NumberFormat(locale, { style: 'currency', currency: currency ?? 'CNY' }).format(value);
        case 'percent':
          return new Intl.NumberFormat(locale, { style: 'percent' }).format(value);
        case 'scientific':
          return new Intl.NumberFormat(locale, { notation: 'scientific' }).format(value);
      }
    },
    [locale],
  );

  return useMemo(
    () => ({
      locale,
      setLocale,
      t,
      formatDate: formatDateFn,
      formatNumber: formatNumberFn,
    }),
    [locale, t, formatDateFn, formatNumberFn],
  );
}

// 在组件中使用
function UserProfile({ user }: { user: { name: string; age: number; createdAt: Date } }) {
  const { t, formatDate, locale, setLocale } = useI18n();

  return (
    <div>
      <h1>{t('user.greeting', { name: user.name })}</h1>
      <p>{t('user.profile', { name: user.name, age: user.age })}</p>
      <p>{formatDate(user.createdAt, 'long')}</p>
      <button onClick={() => setLocale(locale === 'zh-CN' ? 'en-US' : 'zh-CN')}>
        {locale === 'zh-CN' ? 'English' : '中文'}
      </button>
    </div>
  );
}
```

### 6.6 Vue Composable 集成

在 Vue 3 中，使用 Composition API 实现类型安全的 i18n composable：

```typescript
import { ref, computed, ComputedRef } from 'vue';

// i18n Composable
function useI18n() {
  const locale = ref<Locale>('zh-CN');

  const t = computed<Translate>(() => {
    return (key, ...args) => {
      const value = translations[locale.value][key];
      if (typeof value === 'function') {
        return value(args[0] as never);
      }
      return value;
    };
  });

  const formatDate = computed(() => {
    return (date: Date, format: DateFormat) => dateFormatter[locale.value][format].format(date);
  });

  const formatNumber = computed(() => {
    return (value: number, format: NumberFormat, currency?: Currency) => {
      switch (format) {
        case 'decimal':
          return new Intl.NumberFormat(locale.value).format(value);
        case 'currency':
          return new Intl.NumberFormat(locale.value, { style: 'currency', currency: currency ?? 'CNY' }).format(value);
        case 'percent':
          return new Intl.NumberFormat(locale.value, { style: 'percent' }).format(value);
        case 'scientific':
          return new Intl.NumberFormat(locale.value, { notation: 'scientific' }).format(value);
      }
    };
  });

  const setLocale = (newLocale: Locale) => {
    locale.value = newLocale;
  };

  return {
    locale,
    t,
    formatDate,
    formatNumber,
    setLocale,
  };
}

// 在组件中使用
// <script setup lang="ts">
// const { t, locale, setLocale } = useI18n();
// </script>
//
// <template>
//   <h1>{{ t('user.greeting', { name: user.name }) }}</h1>
//   <button @click="setLocale(locale === 'zh-CN' ? 'en-US' : 'zh-CN')">
//     {{ locale === 'zh-CN' ? 'English' : '中文' }}
//   </button>
// </template>
```

### 6.7 ICU MessageFormat 集成

ICU MessageFormat 是 i18n 行业标准，支持复杂的消息格式化：

```typescript
// ICU 消息类型定义
type ICUMessage =
  | string
  | { [key: string]: string };

// ICU 消息解析（简化版）
type ParseICUParams<M extends string> =
  M extends `${string}{${infer Param}}${infer Rest}`
    ? Param | ParseICUParams<Rest>
    : never;

// 类型安全的 ICU 翻译
type ICUMessages = {
  'hello': 'Hello, {name}!';
  'items': '{count, plural, =0 {No items} =1 {1 item} other {# items}}';
  'gender': '{gender, select, male {He} female {She} other {They}} like(s) this.';
};

type ICUParams<M extends keyof ICUMessages> = ParseICUParams<ICUMessages[M]>;

// ICU 翻译函数类型
type ICUT Translate = <M extends keyof ICUMessages>(
  key: M,
  params: Record<ICUParams<M>, string | number>,
) => string;

// 使用 ICU 翻译
// icut('hello', { name: '张三' });  // "Hello, 张三!"
// icut('items', { count: 5 });       // "5 items"
// icut('gender', { gender: 'male' });// "He like(s) this."
```

### 6.8 翻译完整性检查

使用 `satisfies` 确保所有语言的翻译键完整：

```typescript
// 翻译完整性检查
type TranslationDataAll = Record<Locale, TranslationData>;

const allTranslations = {
  'zh-CN': {
    'app.title': '我的应用',
    'app.subtitle': '一个类型安全的 i18n 示例',
    'user.greeting': ({ name }: { name: string }) => `你好，${name}`,
    'user.profile': ({ name, age }: { name: string; age: number }) => `${name}，${age} 岁`,
    'items.count': ({ count }: { count: number }) => `${count} 个项目`,
    'errors.required': ({ field }: { field: string }) => `${field} 不能为空`,
    'errors.invalid': ({ field, type }: { field: string; type: string }) => `${field} 必须是 ${type} 类型`,
  },
  'en-US': {
    'app.title': 'My App',
    'app.subtitle': 'A type-safe i18n example',
    'user.greeting': ({ name }: { name: string }) => `Hello, ${name}`,
    'user.profile': ({ name, age }: { name: string; age: number }) => `${name}, ${age} years old`,
    'items.count': ({ count }: { count: number }) => `${count} items`,
    'errors.required': ({ field }: { field: string }) => `${field} is required`,
    'errors.invalid': ({ field, type }: { field: string; type: string }) => `${field} must be a ${type}`,
  },
} satisfies TranslationDataAll;
// 如果某个语言缺少某个键，编译时立即报错
```

### 6.9 异步加载翻译

大型应用按需加载翻译文件，减少初始包体积：

```typescript
// 异步翻译加载器
type TranslationLoader = Record<Locale, () => Promise<TranslationData>>;

const translationLoaders: TranslationLoader = {
  'zh-CN': () => import('./locales/zh-CN.json').then(m => m.default),
  'en-US': () => import('./locales/en-US.json').then(m => m.default),
};

// 异步 i18n 加载
async function loadLocale(locale: Locale): Promise<TranslationData> {
  return translationLoaders[locale]();
}

// 使用
// const zhTranslations = await loadLocale('zh-CN');
```

### 6.10 上下文变体

某些翻译根据上下文（如性别、正式/非正式）选择不同变体：

```typescript
// 上下文变体类型
type Context = 'formal' | 'informal';

interface ContextualTranslations {
  'greeting.formal': { name: string };
  'greeting.informal': { name: string };
}

function tContextual(
  baseKey: 'greeting',
  context: Context,
  params: { name: string },
): string {
  const fullKey = `${baseKey}.${context}` as keyof ContextualTranslations;
  const value = contextualTranslations[currentLocale][fullKey];
  return value(params);
}

const contextualTranslations: Record<Locale, ContextualTranslations> = {
  'zh-CN': {
    'greeting.formal': ({ name }) => `您好，${name}`,
    'greeting.informal': ({ name }) => `嗨，${name}`,
  },
  'en-US': {
    'greeting.formal': ({ name }) => `Good day, ${name}`,
    'greeting.informal': ({ name }) => `Hi, ${name}`,
  },
};
```

## 第七章 内部原理

### 7.1 类型推断流程

当调用 `t('user.greeting', { name: '张三' })` 时，TypeScript 的类型推断流程如下：

1. **键类型推断**：`'user.greeting'` 被推断为字面量类型 `'user.greeting'`，匹配 `K extends keyof TranslationKeys`。
2. **参数类型推断**：`TranslationKeys['user.greeting']` 解析为 `{ name: string }`，不是 `string`，因此 `Params<K>` 解析为 `[params: { name: string }]`。
3. **参数验证**：`{ name: '张三' }` 与 `{ name: string }` 匹配，类型检查通过。
4. **返回类型推断**：返回类型为 `string`。

```typescript
// 推断过程示意
// t('user.greeting', { name: '张三' })
//   ↓
// K = 'user.greeting'
// TranslationKeys['user.greeting'] = { name: string }
// { name: string } extends string ? [] : [params: { name: string }]
//   ↓
// [params: { name: string }]
//   ↓
// 参数 { name: '张三' } 匹配 { name: string } ✓
//   ↓
// 返回类型: string
```

### 7.2 分布式条件类型在 i18n 中的应用

当翻译键为联合类型时，条件类型会分发：

```typescript
type K = 'app.title' | 'user.greeting';

// 分发行为
type Result = TranslationKeys[K] extends string
  ? 'no-params'
  : 'has-params';
// 等价于
// TranslationKeys['app.title'] extends string ? 'no-params' : 'has-params'  → 'no-params'
// TranslationKeys['user.greeting'] extends string ? 'no-params' : 'has-params' → 'has-params'
// 结果：'no-params' | 'has-params'
```

这一分发行为在某些场景下有用，但在翻译函数签名中需要避免（使用 `K` 而非联合类型）。

### 7.3 模板字面量类型的解析机制

模板字面量类型 `'${infer Head}.${infer Rest}'` 的解析机制：

```typescript
type SplitDot<S> = S extends `${infer Head}.${infer Rest}`
  ? [Head, ...SplitDot<Rest>]
  : [S];

type Result = SplitDot<'app.title'>;
// 解析过程：
// 'app.title' matches '${Head}.${Rest}' → Head = 'app', Rest = 'title'
// 'title' does not match → ['title']
// 结果：['app', 'title']
```

TypeScript 编译器对模板字面量类型的解析是**贪心匹配**：`${infer Head}` 会尽可能匹配多的字符，直到第一个 `.`。

### 7.4 递归类型的深度限制

TypeScript 对递归类型有深度限制（约 50 层）。嵌套键展开时，过深的嵌套会导致递归失败：

```typescript
// 过深的嵌套会导致递归失败
interface DeepNested {
  level1: { level2: { level3: { level4: { level5: { level6: string } } } } };
}

type Flat = FlattenKeys<DeepNested>;
// 如果嵌套超过 50 层，TypeScript 会报错或返回 never
```

**解决方案**：限制嵌套深度，或使用迭代式展开（通过工具类型分层）。

### 7.5 性能复杂度分析

i18n 类型系统的性能复杂度：

| 操作 | 复杂度 | 说明 |
|------|--------|------|
| 键存在性检查 | $\mathcal{O}(1)$ | 联合类型查找是常数时间 |
| 参数类型推断 | $\mathcal{O}(1)$ | 索引访问是常数时间 |
| 嵌套键展开 | $\mathcal{O}(n \cdot d)$ | $n$ 是键数量，$d$ 是最大嵌套深度 |
| ICU 消息解析 | $\mathcal{O}(m)$ | $m$ 是消息长度 |
| 翻译完整性检查 | $\mathcal{O}(L \cdot K)$ | $L$ 是语言数，$K$ 是键数 |

对于大型 i18n 系统（1000+ 键），嵌套键展开与翻译完整性检查可能显著增加编译时间。

## 第八章 最佳实践

### 8.1 翻译键组织

**扁平键 vs 嵌套键**：

| 方式 | 优势 | 劣势 | 推荐场景 |
|------|------|------|---------|
| 扁平键 | 类型简单，性能好 | 视觉上不清晰 | 小型项目，键数 <100 |
| 嵌套键 | 视觉清晰，易于组织 | 类型复杂，性能差 | 大型项目，键数 100+ |

**键命名规范**：

```typescript
// 推荐：模块.字段.变体
type GoodKeys = {
  'user.profile.name': string;
  'user.profile.avatar': string;
  'errors.validation.required': { field: string };
};

// 避免：过短或无意义
type BadKeys = {
  'name': string;
  'req': { field: string };
};
```

### 8.2 翻译数据组织

**按语言分文件**：

```
src/locales/
  zh-CN.json
  en-US.json
  ja-JP.json
```

**按模块分文件**：

```
src/locales/
  zh-CN/
    user.json
    product.json
    errors.json
  en-US/
    user.json
    product.json
    errors.json
```

大型项目推荐按模块分文件，便于团队协作。

### 8.3 翻译函数设计

**单一翻译函数**：所有翻译通过 `t` 函数，类型安全。

**专用翻译函数**：为复数、日期、数字等提供专用函数：

```typescript
const t = createTranslator<TranslationKeys>(translations);     // 通用翻译
const tp = createPluralTranslator<PluralTranslations>(pluralData); // 复数翻译
const tf = createFormatter();                                    // 格式化
```

### 8.4 性能优化

**预编译翻译**：将参数化翻译预编译为字符串模板，避免运行时函数调用：

```typescript
// 编译前：参数化函数
'user.greeting': ({ name }) => `你好，${name}`,

// 编译后：字符串模板
'user.greeting': '你好，{name}',
```

**惰性加载**：按需加载翻译文件，减少初始包体积：

```typescript
const loadTranslations = async (locale: Locale) => {
  return import(`./locales/${locale}.json`);
};
```

**缓存格式化器**：`Intl.DateTimeFormat` 与 `Intl.NumberFormat` 创建开销大，应缓存：

```typescript
const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getDateFormatter(locale: Locale, format: DateFormat): Intl.DateTimeFormat {
  const key = `${locale}-${format}`;
  if (!formatterCache.has(key)) {
    formatterCache.set(key, new Intl.DateTimeFormat(locale, /* options */));
  }
  return formatterCache.get(key)!;
}
```

### 8.5 测试策略

**翻译完整性测试**：

```typescript
// 测试所有语言的翻译键完整
describe('Translation completeness', () => {
  const locales: Locale[] = ['zh-CN', 'en-US'];
  const keys = Object.keys(translations['zh-CN']) as (keyof TranslationKeys)[];

  locales.forEach(locale => {
    describe(`${locale} translations`, () => {
      keys.forEach(key => {
        test(`${key} should exist`, () => {
          expect(translations[locale][key]).toBeDefined();
        });
      });
    });
  });
});
```

**翻译函数测试**：

```typescript
describe('Translation function', () => {
  test('should translate simple key', () => {
    expect(t('app.title')).toBe('我的应用');
  });

  test('should translate parameterized key', () => {
    expect(t('user.greeting', { name: '张三' })).toBe('你好，张三');
  });
});
```

### 8.6 工作流集成

**CI/CD 翻译检查**：

```yaml
# .github/workflows/i18n-check.yml
name: i18n Check
on: [pull_request]
jobs:
  i18n:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Check translation completeness
        run: npm run check:i18n
```

**翻译键提取**：通过 AST 解析自动提取代码中使用的翻译键，与定义的键对比：

```typescript
// scripts/extract-i18n-keys.ts
import { parse } from '@babel/parser';
import { traverse } from '@babel/core';

// 解析代码，提取所有 t('...') 调用
function extractKeys(code: string): string[] {
  const ast = parse(code, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
  const keys: string[] = [];
  traverse(ast, {
    CallExpression(path) {
      if (path.node.callee.type === 'Identifier' && path.node.callee.name === 't') {
        if (path.node.arguments[0].type === 'StringLiteral') {
          keys.push(path.node.arguments[0].value);
        }
      }
    },
  });
  return keys;
}
```

## 第九章 常见陷阱

### 9.1 动态键拼接

**问题**：动态拼接翻译键会丢失类型安全：

```typescript
// 问题：动态拼接键
function showError(field: string) {
  return t(`errors.${field}` as keyof TranslationKeys);
  // 类型断言绕过了类型检查，可能导致运行时错误
}
```

**解决方案**：显式列出可能的键：

```typescript
// 方案 1：显式映射
const errorKeys: Record<string, keyof TranslationKeys> = {
  required: 'errors.required',
  invalid: 'errors.invalid',
};

function showError(field: keyof typeof errorKeys, params: any) {
  return t(errorKeys[field], params);
}

// 方案 2：使用联合类型
function showError(field: 'required' | 'invalid', params: any) {
  const key = `errors.${field}` as const;
  return t(key as keyof TranslationKeys, params);
}
```

### 9.2 类型断言滥用

**问题**：过度使用 `as` 断言绕过类型检查：

```typescript
// 问题：滥用 as
const value = translations[locale][key as any] as string;
```

**解决方案**：让类型系统工作，避免断言：

```typescript
// 方案：正确的类型设计
const value: string | ((params: any) => string) = translations[locale][key];
if (typeof value === 'function') {
  return value(params);
}
return value;
```

### 9.3 循环引用

**问题**：翻译键映射中存在循环引用：

```typescript
// 问题：循环引用
interface BadTranslations {
  'a': BadTranslations; // 自引用
}
```

**解决方案**：避免自引用，使用递归类型时明确终止条件：

```typescript
// 方案：递归类型 + 终止条件
type DeepTranslations = {
  [key: string]: string | DeepTranslations;
};
```

### 9.4 翻译函数的 this 绑定

**问题**：翻译函数中的 `this` 在回调中丢失：

```typescript
// 问题：this 丢失
const t = translator.t; // this 丢失
button.onclick = () => t('click'); // 可能出错
```

**解决方案**：使用箭头函数或 bind：

```typescript
// 方案：箭头函数
const t = (...args: Parameters<typeof translator.t>) => translator.t(...args);

// 或 bind
const t = translator.t.bind(translator);
```

### 9.5 类型推断失败

**问题**：复杂类型推断可能失败：

```typescript
// 问题：复杂类型推断失败
function translate<K extends keyof TranslationKeys>(
  key: K,
  ...args: TranslationKeys[K] extends string ? [] : [TranslationKeys[K]]
): string {
  // 实现
}

// 调用时类型推断可能不准确
const key = getUserInput(); // string 类型
translate(key); // 错误：string 不能赋值给 keyof TranslationKeys
```

**解决方案**：使用类型守卫或显式类型：

```typescript
// 方案 1：类型守卫
function isTranslationKey(key: string): key is keyof TranslationKeys {
  return key in translations['zh-CN'];
}

const key = getUserInput();
if (isTranslationKey(key)) {
  translate(key);
}

// 方案 2：显式类型
const key = getUserInput() as keyof TranslationKeys;
translate(key);
```

### 9.6 翻译数据类型不匹配

**问题**：翻译数据的实际类型与定义不匹配：

```typescript
// 问题：类型不匹配
const translations: Record<Locale, TranslationData> = {
  'zh-CN': {
    'user.greeting': ({ name }) => `你好，${name}`,
    // 错误：app.title 缺失
  },
};
```

**解决方案**：使用 `satisfies` 进行完整性检查：

```typescript
// 方案：satisfies
const translations = {
  'zh-CN': {
    'app.title': '我的应用',
    'user.greeting': ({ name }: { name: string }) => `你好，${name}`,
  },
} satisfies Record<Locale, TranslationData>;
// 编译错误：app.title 缺失
```

### 9.7 运行时键不存在

**问题**：类型安全不能保证运行时键一定存在：

```typescript
// 问题：运行时键不存在
const translations = { /* ... */ } satisfies Record<Locale, TranslationData>;
// 但如果运行时动态加载的翻译文件缺少键，仍然会出错

function t<K extends keyof TranslationKeys>(key: K): string {
  return translations[currentLocale][key]; // 运行时可能 undefined
}
```

**解决方案**：运行时回退机制：

```typescript
// 方案：运行时回退
function t<K extends keyof TranslationKeys>(key: K): string {
  const value = translations[currentLocale]?.[key];
  if (value === undefined) {
    console.warn(`Missing translation: ${key}`);
    return translations['zh-CN'][key] ?? key; // 回退到默认语言或键名
  }
  return value;
}
```

### 9.8 复数规则错误

**问题**：不同语言的复数规则不同，硬编码规则会出错：

```typescript
// 问题：硬编码复数规则
function pluralize(count: number): 'zero' | 'one' | 'other' {
  if (count === 0) return 'zero';
  if (count === 1) return 'one';
  return 'other';
}
// 阿拉伯语有 6 种复数形式，俄语有 3 种，此函数不适用
```

**解决方案**：使用 `Intl.PluralRules` API：

```typescript
// 方案：使用 Intl.PluralRules
function pluralize(locale: Locale, count: number): 'zero' | 'one' | 'two' | 'few' | 'many' | 'other' {
  const rules = new Intl.PluralRules(locale);
  return rules.select(count) as any;
}

// 使用
pluralize('en-US', 0);  // 'other'（英语不区分 zero）
pluralize('en-US', 1);  // 'one'
pluralize('en-US', 2);  // 'other'
pluralize('ar-EG', 0);  // 'zero'
pluralize('ar-EG', 1);  // 'one'
pluralize('ar-EG', 2);  // 'two'
```

## 第十章 性能分析

### 10.1 编译时性能

类型安全 i18n 的编译时性能受以下因素影响：

| 因素 | 影响 | 缓解策略 |
|------|------|---------|
| 翻译键数量 | $\mathcal{O}(K)$ | 分模块定义键 |
| 嵌套键深度 | $\mathcal{O}(d)$ | 限制嵌套深度 |
| 语言数量 | $\mathcal{O}(L)$ | 不影响类型复杂度 |
| ICU 消息复杂度 | $\mathcal{O}(m)$ | 简化 ICU 消息 |
| 翻译完整性检查 | $\mathcal{O}(L \cdot K)$ | 仅在 CI 检查 |

**实测数据**（参考 typesafe-i18n 文档）：

| 键数量 | 编译时间增量 | 类型检查时间增量 |
|--------|-------------|----------------|
| 50 | +0.1s | +0.05s |
| 200 | +0.5s | +0.2s |
| 500 | +2s | +1s |
| 1000 | +8s | +4s |
| 2000 | +30s | +15s |

**建议**：键数量超过 500 时，考虑按模块拆分类型定义。

### 10.2 运行时性能

类型安全 i18n 的运行时性能与无类型版本几乎相同，因为类型约束在编译时消除：

| 操作 | 时间复杂度 | 说明 |
|------|-----------|------|
| 翻译查找 | $\mathcal{O}(1)$ | 对象属性访问 |
| 参数插值 | $\mathcal{O}(m)$ | 字符串模板拼接 |
| 日期格式化 | $\mathcal{O}(1)$ | Intl.DateTimeFormat 缓存 |
| 数字格式化 | $\mathcal{O}(1)$ | Intl.NumberFormat 缓存 |
| 复数选择 | $\mathcal{O}(1)$ | Intl.PluralRules 缓存 |

**优化建议**：

1. **缓存 Intl 格式化器**：`Intl.DateTimeFormat` 与 `Intl.NumberFormat` 创建开销大，应缓存。
2. **预编译翻译**：将参数化翻译预编译为字符串模板，避免运行时函数调用。
3. **惰性加载**：按需加载翻译文件，减少初始包体积。

### 10.3 包体积分析

类型安全 i18n 的包体积主要来自：

| 来源 | 体积 | 说明 |
|------|------|------|
| 翻译数据 | 大 | 取决于键数量与文本长度 |
| 翻译函数 | 小 | 几百字节 |
| 格式化器 | 中 | 取决于使用的 Intl API |
| 类型定义 | 0 | 编译时消除 |

**优化建议**：

1. **按需加载翻译**：仅加载当前语言的翻译数据。
2. **Tree-shaking**：确保未使用的翻译函数被摇树优化。
3. **压缩翻译数据**：使用短键名、压缩 JSON。

## 第十一章 对比其他语言

### 11.1 与 Flow 对比

Flow（Facebook 的类型检查器）支持类似的类型安全 i18n：

```javascript
// @flow
type TranslationKeys = {
  'app.title': string,
  'user.greeting': { name: string },
};

function t<K: $Keys<TranslationKeys>>(
  key: K,
  ...args: $ElementType<TranslationKeys, K> extends string
    ? []
    : [$ElementType<TranslationKeys, K>]
): string {
  // ...
}
```

**对比**：

| 特性 | TypeScript | Flow |
|------|-----------|------|
| 字面量类型 | 支持 | 支持 |
| 条件类型 | 支持 | 不支持 |
| 模板字面量类型 | 支持 | 不支持 |
| 映射类型 | 支持 | 支持 |
| `satisfies` 操作符 | 支持（4.9+） | 不支持 |
| 类型推断能力 | 强 | 中 |

TypeScript 在类型表达力上优于 Flow，特别是模板字面量类型对 i18n 的支持。

### 11.2 与 Rust 对比

Rust 没有原生的 i18n 支持，但通过宏（macro）实现类型安全 i18n：

```rust
// Rust i18n 宏（使用 fluent crate）
use fluent::fluent_args;

let args = fluent_args![
    "name" => "张三"
];

let greeting = bundle.get_message("hello-world")
    .unwrap()
    .value()
    .unwrap();
// 运行时格式化，类型安全由宏保证
```

**对比**：

| 特性 | TypeScript | Rust |
|------|-----------|------|
| 类型安全 i18n | 编译时 | 编译时（宏） |
| 性能 | 运行时 | 编译时优化 |
| 灵活性 | 高 | 低（宏受限） |
| 学习曲线 | 低 | 高 |

Rust 的宏在编译时生成代码，性能更好，但灵活性低于 TypeScript 的类型系统。

### 11.3 与 Java 对比

Java 的 i18n 通过 `ResourceBundle` 实现，无类型约束：

```java
// Java i18n
ResourceBundle bundle = ResourceBundle.getBundle("messages", locale);
String greeting = bundle.getString("user.greeting");
// 无类型安全，键拼写错误运行时抛异常
```

**对比**：

| 特性 | TypeScript | Java |
|------|-----------|------|
| 类型安全 | 编译时 | 无 |
| 性能 | 运行时 | 运行时 |
| 灵活性 | 高 | 中 |
| 工具支持 | 强（IDE 补全） | 弱 |

Java 的 i18n 缺乏类型安全，但通过代码生成工具（如 Babel、Thymeleaf）可以部分弥补。

### 11.4 与 Python 对比

Python 的 i18n 通过 `gettext` 实现，无类型约束：

```python
# Python i18n
import gettext

t = gettext.translation('messages', localedir='locales', languages=['zh_CN'])
_ = t.gettext
greeting = _('user.greeting')
# 无类型安全
```

Python 的类型提示（Type Hints）可以提供部分类型约束，但不如 TypeScript 完善。

### 11.5 与 Kotlin 对比

Kotlin 通过类型安全构建器实现 i18n：

```kotlin
// Kotlin i18n
val translations = translations {
    "zh-CN" {
        "app.title" to "我的应用"
        "user.greeting" to { params: Map<String, Any> -> "你好，${params["name"]}" }
    }
}

// 类型安全通过构建器 DSL 保证
```

Kotlin 的类型系统支持类似 TypeScript 的类型安全 i18n，但语法更冗长。

## 第十二章 总结与扩展

### 12.1 核心要点回顾

本教程系统讲解了类型安全的 i18n 系统，核心要点：

1. **类型驱动开发**：先定义翻译键类型，再实现翻译数据与函数。
2. **条件类型 + 可变元组**：实现根据键自动推断参数类型的翻译函数签名。
3. **模板字面量类型**：实现嵌套键展开、ICU 消息解析等复杂场景。
4. **satisfies 操作符**：实现翻译完整性检查。
5. **Intl API 集成**：类型安全的日期、数字、货币格式化。
6. **框架集成**：React Hook、Vue Composable 等封装。
7. **性能权衡**：编译时类型安全与编译性能的平衡。

### 12.2 设计决策总结

| 决策点 | 推荐方案 | 备选方案 |
|--------|---------|---------|
| 键组织 | 扁平键（小型）/ 嵌套键（大型） | 混合方式 |
| 参数类型 | 对象类型 | 元组类型 |
| 复数处理 | Intl.PluralRules | 自定义规则 |
| 翻译完整性 | satisfies | 手动检查 |
| 框架集成 | Hook/Composable | 高阶组件 |
| 异步加载 | 按语言分文件 | 按模块分文件 |

### 12.3 进阶主题

**编译时 i18n 优化**：

通过编译时转换，将翻译函数调用替换为直接的字符串字面量，消除运行时开销：

```typescript
// 编译前
const greeting = t('user.greeting', { name: '张三' });

// 编译后（通过 Babel 插件）
const greeting = '你好，张三';
```

**类型安全的翻译键提取**：

通过 AST 解析自动从代码中提取翻译键，生成类型定义：

```typescript
// 代码中
t('user.greeting', { name });
t('app.title');

// 自动生成的类型
type ExtractedKeys = {
  'user.greeting': { name: string };
  'app.title': string;
};
```

**i18n 与低代码平台集成**：

在低代码平台中，i18n 类型可以从配置自动生成，实现可视化编辑与类型安全的结合。

### 12.4 推荐工具与库

| 工具/库 | 说明 |
|---------|------|
| typesafe-i18n | 完全类型安全的 i18n 库 |
| @lingui/core | 类型安全 + 编译时优化 |
| @formatjs/intl | ICU MessageFormat + TypeScript |
| paraglide | 基于编译时生成的类型安全 i18n |
| i18next + typescript | i18next 的 TypeScript 适配 |
| vue-i18n | Vue 生态 i18n，支持类型安全 |
| react-intl | React 生态 i18n，ICU MessageFormat |

### 12.5 学习资源

**官方文档**：

- TypeScript Handbook: Conditional Types
- TypeScript Handbook: Template Literal Types
- TypeScript Handbook: Mapped Types
- MDN: Intl API

**学术论文**：

- "Types as Propositions, Programs as Proofs"（Curry-Howard 同构）
- "Practical Type Inference for Polymorphic Languages"（Hindley-Milner 类型系统）

**开源项目**：

- typesafe-i18n（https://github.com/ivanhofer/typesafe-i18n）
- @lingui/core（https://github.com/lingui/js-lingui）
- @formatjs/intl（https://github.com/formatjs/formatjs）

### 12.6 练习题

#### 练习 1：基础类型安全 i18n

实现一个支持 3 种语言、5 个翻译键的类型安全 i18n 系统，其中 2 个键有参数。

#### 练习 2：嵌套键展开

实现 `FlattenKeys<T>` 类型，将 `{ app: { title: string } }` 展开为 `'app.title'`。

#### 练习 3：复数形式

实现类型安全的复数翻译函数，支持英语与中文的复数规则。

#### 练习 4：ICU MessageFormat 解析

实现 `ParseICUParams<M>` 类型，从 ICU 消息中提取参数名。

#### 练习 5：翻译完整性检查

使用 `satisfies` 实现翻译完整性检查，确保所有语言的翻译键完整。

### 12.7 练习题答案

#### 练习 1 答案

```typescript
type Locale = 'zh-CN' | 'en-US' | 'ja-JP';

interface TranslationKeys {
  'app.title': string;
  'app.subtitle': string;
  'user.greeting': { name: string };
  'user.profile': { name: string; age: number };
  'errors.required': { field: string };
}

type TranslationData = {
  [K in keyof TranslationKeys]: TranslationKeys[K] extends string
    ? string
    : (params: TranslationKeys[K]) => string;
};

type Translate = <K extends keyof TranslationKeys>(
  key: K,
  ...args: TranslationKeys[K] extends string
    ? []
    : [params: TranslationKeys[K]]
) => string;

const translations: Record<Locale, TranslationData> = {
  'zh-CN': {
    'app.title': '我的应用',
    'app.subtitle': '类型安全 i18n',
    'user.greeting': ({ name }) => `你好，${name}`,
    'user.profile': ({ name, age }) => `${name}，${age} 岁`,
    'errors.required': ({ field }) => `${field} 不能为空`,
  },
  'en-US': {
    'app.title': 'My App',
    'app.subtitle': 'Type-safe i18n',
    'user.greeting': ({ name }) => `Hello, ${name}`,
    'user.profile': ({ name, age }) => `${name}, ${age} years old`,
    'errors.required': ({ field }) => `${field} is required`,
  },
  'ja-JP': {
    'app.title': '私のアプリ',
    'app.subtitle': 'タイプセーフ i18n',
    'user.greeting': ({ name }) => `こんにちは、${name}`,
    'user.profile': ({ name, age }) => `${name}、${age} 歳`,
    'errors.required': ({ field }) => `${field} は必須です`,
  },
};

let currentLocale: Locale = 'zh-CN';

const t: Translate = (key, ...args) => {
  const value = translations[currentLocale][key];
  if (typeof value === 'function') {
    return value(args[0] as never);
  }
  return value;
};
```

#### 练习 2 答案

```typescript
type FlattenKeys<T, Prefix extends string = ''> = T extends object
  ? T extends Function
    ? never
    : {
        [K in keyof T & string]: FlattenKeys<
          T[K],
          Prefix extends '' ? K : `${Prefix}.${K}`
        >;
      }[keyof T]
  : Prefix;

// 测试
interface Test {
  app: { title: string; subtitle: string };
  user: { name: string; age: number };
}

type Flat = FlattenKeys<Test>;
// 'app.title' | 'app.subtitle' | 'user.name' | 'user.age'
```

#### 练习 3 答案

```typescript
type Locale = 'zh-CN' | 'en-US';
type PluralForm = 'zero' | 'one' | 'other';

interface PluralTranslations {
  'items.zero': string;
  'items.one': string;
  'items.other': { count: number };
}

const pluralRules: Record<Locale, (n: number) => PluralForm> = {
  'zh-CN': (n) => (n === 0 ? 'zero' : 'other'),
  'en-US': (n) => (n === 0 ? 'zero' : n === 1 ? 'one' : 'other'),
};

const pluralData: Record<Locale, PluralTranslations> = {
  'zh-CN': {
    'items.zero': '没有项目',
    'items.one': '1 个项目',
    'items.other': ({ count }) => `${count} 个项目`,
  },
  'en-US': {
    'items.zero': 'No items',
    'items.one': '1 item',
    'items.other': ({ count }) => `${count} items`,
  },
};

let currentLocale: Locale = 'zh-CN';

function tPlural(baseKey: 'items', count: number): string {
  const form = pluralRules[currentLocale](count);
  const fullKey = `${baseKey}.${form}` as keyof PluralTranslations;
  const value = pluralData[currentLocale][fullKey];
  if (typeof value === 'function') {
    return value({ count });
  }
  return value;
}
```

#### 练习 4 答案

```typescript
type ParseICUParams<M extends string> =
  M extends `${string}{${infer Param},${string}}${infer Rest}`
    ? Param | ParseICUParams<Rest>
    : M extends `${string}{${infer Param}}${infer Rest}`
    ? Param | ParseICUParams<Rest>
    : never;

// 测试
type Params1 = ParseICUParams<'Hello, {name}!'>;
// 'name'

type Params2 = ParseICUParams<'{count, plural, =0 {No items} other {# items}}'>;
// 'count'

type Params3 = ParseICUParams<'{gender, select, male {He} female {She}} likes {what}'>;
// 'gender' | 'what'
```

#### 练习 5 答案

```typescript
type Locale = 'zh-CN' | 'en-US';

interface TranslationKeys {
  'app.title': string;
  'user.greeting': { name: string };
}

type TranslationData = {
  [K in keyof TranslationKeys]: TranslationKeys[K] extends string
    ? string
    : (params: TranslationKeys[K]) => string;
};

const translations = {
  'zh-CN': {
    'app.title': '我的应用',
    'user.greeting': ({ name }: { name: string }) => `你好，${name}`,
  },
  'en-US': {
    'app.title': 'My App',
    'user.greeting': ({ name }: { name: string }) => `Hello, ${name}`,
  },
} satisfies Record<Locale, TranslationData>;
// 如果某个语言缺少某个键，编译时立即报错
```

### 12.8 扩展阅读

**类型理论**：

- Curry-Howard 同构：类型与命题的对应
- 依赖类型：Idris、Agda 中的类型系统
- 线性类型：Rust 中的所有权系统

**i18n 理论**：

- ICU MessageFormat 规范
- Unicode CLDR 数据
- 复数规则（Cardinal vs Ordinal）
- 性别变体（Gender Variants）

**工程实践**：

- 大型项目的 i18n 架构
- 翻译协作流程（翻译平台集成）
- A/B 测试与 i18n
- RTL（从右到左）语言支持

## 附录 A：完整类型安全 i18n 系统代码

```typescript
// ============== 类型定义 ==============

export type Locale = 'zh-CN' | 'en-US' | 'ja-JP' | 'ko-KR';

export interface TranslationKeys {
  'app.title': string;
  'app.subtitle': string;
  'user.greeting': { name: string };
  'user.profile': { name: string; age: number };
  'items.count': { count: number };
  'errors.required': { field: string };
  'errors.invalid': { field: string; type: string };
  'errors.network': string;
}

export type TranslationData = {
  [K in keyof TranslationKeys]: TranslationKeys[K] extends string
    ? string
    : (params: TranslationKeys[K]) => string;
};

export type Translate = <K extends keyof TranslationKeys>(
  key: K,
  ...args: TranslationKeys[K] extends string
    ? []
    : [params: TranslationKeys[K]]
) => string;

// ============== 翻译数据 ==============

export const translations: Record<Locale, TranslationData> = {
  'zh-CN': {
    'app.title': '我的应用',
    'app.subtitle': '类型安全的 i18n 系统',
    'user.greeting': ({ name }) => `你好，${name}`,
    'user.profile': ({ name, age }) => `${name}，${age} 岁`,
    'items.count': ({ count }) => `${count} 个项目`,
    'errors.required': ({ field }) => `${field} 不能为空`,
    'errors.invalid': ({ field, type }) => `${field} 必须是 ${type} 类型`,
    'errors.network': '网络错误',
  },
  'en-US': {
    'app.title': 'My App',
    'app.subtitle': 'Type-safe i18n system',
    'user.greeting': ({ name }) => `Hello, ${name}`,
    'user.profile': ({ name, age }) => `${name}, ${age} years old`,
    'items.count': ({ count }) => `${count} items`,
    'errors.required': ({ field }) => `${field} is required`,
    'errors.invalid': ({ field, type }) => `${field} must be a ${type}`,
    'errors.network': 'Network error',
  },
  'ja-JP': {
    'app.title': '私のアプリ',
    'app.subtitle': 'タイプセーフ i18n システム',
    'user.greeting': ({ name }) => `こんにちは、${name}`,
    'user.profile': ({ name, age }) => `${name}、${age} 歳`,
    'items.count': ({ count }) => `${count} 個のアイテム`,
    'errors.required': ({ field }) => `${field} は必須です`,
    'errors.invalid': ({ field, type }) => `${field} は ${type} 型である必要があります`,
    'errors.network': 'ネットワークエラー',
  },
  'ko-KR': {
    'app.title': '내 앱',
    'app.subtitle': '타입 안전 i18n 시스템',
    'user.greeting': ({ name }) => `안녕하세요, ${name}`,
    'user.profile': ({ name, age }) => `${name}, ${age} 세`,
    'items.count': ({ count }) => `${count}개 항목`,
    'errors.required': ({ field }) => `${field}은(는) 필수입니다`,
    'errors.invalid': ({ field, type }) => `${field}은(는) ${type} 형식이어야 합니다`,
    'errors.network': '네트워크 오류',
  },
};

// ============== 翻译函数 ==============

let currentLocale: Locale = 'zh-CN';

export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

export const t: Translate = (key, ...args) => {
  const value = translations[currentLocale][key];
  if (typeof value === 'function') {
    return value(args[0] as never);
  }
  return value;
};

// ============== 格式化函数 ==============

export type DateFormat = 'short' | 'medium' | 'long' | 'full';
export type NumberFormat = 'decimal' | 'currency' | 'percent' | 'scientific';
export type Currency = 'CNY' | 'USD' | 'EUR' | 'JPY' | 'KRW';

const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();
const numberFormatterCache = new Map<string, Intl.NumberFormat>();

export function formatDate(date: Date, format: DateFormat): string {
  const cacheKey = `${currentLocale}-${format}`;
  let formatter = dateFormatterCache.get(cacheKey);
  if (!formatter) {
    const options: Intl.DateTimeFormatOptions = {
      short: { year: 'numeric', month: '2-digit', day: '2-digit' },
      medium: { year: 'numeric', month: 'short', day: 'numeric' },
      long: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' },
      full: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', hour: '2-digit', minute: '2-digit' },
    }[format];
    formatter = new Intl.DateTimeFormat(currentLocale, options);
    dateFormatterCache.set(cacheKey, formatter);
  }
  return formatter.format(date);
}

export function formatNumber(value: number, format: NumberFormat, currency?: Currency): string {
  const cacheKey = `${currentLocale}-${format}-${currency ?? 'default'}`;
  let formatter = numberFormatterCache.get(cacheKey);
  if (!formatter) {
    const options: Intl.NumberFormatOptions = {
      decimal: {},
      currency: { style: 'currency', currency: currency ?? 'CNY' },
      percent: { style: 'percent' },
      scientific: { notation: 'scientific' },
    }[format];
    formatter = new Intl.NumberFormat(currentLocale, options);
    numberFormatterCache.set(cacheKey, formatter);
  }
  return formatter.format(value);
}

// ============== 复数处理 ==============

export type PluralForm = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

export function getPluralForm(count: number): PluralForm {
  const rules = new Intl.PluralRules(currentLocale);
  return rules.select(count) as PluralForm;
}

// ============== React Hook ==============

export function useI18n() {
  // React 实现见第六章 6.5 节
}
```

## 附录 B：常见类型错误信息

| 错误信息 | 原因 | 解决方案 |
|---------|------|---------|
| `Type '"unknown.key"' is not assignable to type 'keyof TranslationKeys'` | 使用了未定义的翻译键 | 检查键名拼写，或将其添加到 `TranslationKeys` |
| `Expected 2 arguments, but got 1` | 有参数键缺少参数 | 提供所需参数 |
| `Property 'naem' does not exist on type '{ name: string }'` | 参数属性拼写错误 | 修正拼写 |
| `Type 'number' is not assignable to type 'string'` | 参数类型错误 | 提供正确类型的参数 |
| `Object literal may only specify known properties` | 翻译数据包含未定义的键 | 检查键名或更新类型定义 |

## 附录 C：术语表

| 术语 | 英文 | 说明 |
|------|------|------|
| 国际化 | Internationalization (i18n) | 支持多语言、多地区的过程 |
| 本地化 | Localization (l10n) | 针对特定地区的适配 |
| 翻译键 | Translation Key | 翻译文本的唯一标识符 |
| 翻译数据 | Translation Data | 各语言的翻译文本映射 |
| 翻译函数 | Translation Function | 根据键获取翻译文本的函数 |
| 复数形式 | Plural Form | 根据数量选择的翻译变体 |
| 性别变体 | Gender Variant | 根据性别选择的翻译变体 |
| ICU MessageFormat | ICU MessageFormat | 国际化消息格式标准 |
| 字面量类型 | Literal Type | 表示具体值的类型 |
| 条件类型 | Conditional Type | 根据类型关系选择分支的类型 |
| 模板字面量类型 | Template Literal Type | 通过模板字符串构造的类型 |
| 映射类型 | Mapped Type | 遍历键集合构造的类型 |
| 类型推断 | Type Inference | 编译器自动推断类型 |
| 类型守卫 | Type Guard | 缩小类型范围的运行时检查 |

## 附录 D：参考文献

1. TypeScript Handbook. "Conditional Types". https://www.typescriptlang.org/docs/handbook/2/conditional-types.html
2. TypeScript Handbook. "Template Literal Types". https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html
3. TypeScript Handbook. "Mapped Types". https://www.typescriptlang.org/docs/handbook/2/mapped-types.html
4. ICU MessageFormat Specification. https://unicode-org.github.io/icu/userguide/format_parse/messages/
5. Unicode CLDR. https://cldr.unicode.org/
6. MDN Web Docs. "Intl". https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl
7. typesafe-i18n Documentation. https://typesafe-i18n.docs.page/
8. Lingui Documentation. https://lingui.js.org/
9. FormatJS Documentation. https://formatjs.github.io/
10. Stanford CS142: Web Applications. https://web.stanford.edu/class/cs142/
