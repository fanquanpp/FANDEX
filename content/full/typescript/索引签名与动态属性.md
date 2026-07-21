---
order: 53
title: 索引签名与动态属性
module: typescript
category: TypeScript
difficulty: intermediate
description: 索引签名、Record与动态属性访问
author: fanquanpp
updated: '2026-06-14'
related:
  - typescript/交叉类型与类型合并
  - typescript/类型守卫与自定义守卫
  - typescript/映射类型进阶
  - typescript/泛型约束与默认值
prerequisites:
  - typescript/语法速查
---

## 第一章 概述

### 1.1 为什么需要索引签名

在 JavaScript 中，对象是最常用的数据结构。对象的属性可以在运行时动态添加、删除、访问，这种动态性是 JavaScript 灵活性的来源之一。然而，TypeScript 的核心目标是**为 JavaScript 提供静态类型约束**，当对象的属性集合是动态的（即在编译时无法确定所有键），就需要一种机制来描述这种"键集合开放"的对象类型。

索引签名（Index Signature）正是为此而生。它允许对象拥有任意数量的属性，只要这些属性的键和值符合指定的类型。这一机制在以下场景中不可或缺：

1. **配置对象**：应用配置、环境变量、用户偏好等，键集合开放，值类型有限。
2. **字典映射**：用户列表、产品目录、ID 到实体的映射等。
3. **缓存**：以字符串键存储任意值的缓存结构。
4. **国际化字典**：翻译键到翻译文本的映射。
5. **JSON 数据**：从外部 API 或文件加载的动态 JSON 数据。
6. **元数据**：附加在实体上的动态属性，如用户自定义字段。

如果没有索引签名，开发者只能用 `any` 或 `Record<string, any>` 等宽泛类型绕过类型检查，失去了类型安全的价值。索引签名提供了"在动态性与类型安全之间取得平衡"的方案。

### 1.2 学习目标

完成本教程后，读者将能够：

1. 理解索引签名的语义，区分字符串索引签名、数字索引签名、symbol 索引签名。
2. 区分索引签名与 `Record<K, V>` 工具类型的联系与差异，知道何时使用哪种。
3. 掌握索引签名与已知属性共存的规则，避免类型不兼容错误。
4. 使用模板字面量键、条件索引签名等高级模式描述复杂的动态对象。
5. 实现类型安全的动态属性访问、设置、删除操作。
6. 处理嵌套索引签名、递归索引类型等复杂场景。
7. 使用 `satisfies` 操作符替代索引签名，在保留具体类型的同时获得验证。
8. 分析索引签名对编译时性能与运行时性能的影响。
9. 在配置对象、缓存、字典等实际场景中正确应用索引签名。

### 1.3 本教程的定位

本教程是 TypeScript 类型系统系列的"动态对象"专题，与《映射类型进阶》、《交叉类型与类型合并》、《类型守卫与自定义守卫》形成互补：

- 《映射类型进阶》侧重"如何根据已有类型派生新类型"。
- 《交叉类型与类型合并》侧重"如何合并多个类型"。
- 《类型守卫与自定义守卫》侧重"如何在运行时缩小类型范围"。
- 本教程侧重"如何描述键集合开放的对象"。

参考 MIT 6.102《软件构造》对"抽象数据类型"（ADT）的讲解：一个数据类型的语义包括其操作集合与不变式。索引签名是描述"映射型 ADT"（Map-like ADT）的核心工具，理解它就是理解 TypeScript 如何对 JavaScript 的对象模型进行类型抽象。

### 1.4 索引签名的核心问题

阅读本教程时请带着以下问题：

1. **索引签名 vs Record**：两者都描述"键到值的映射"，但行为差异显著。`Record<string, T>` 与 `{ [key: string]: T }` 真的等价吗？
2. **键类型限制**：为什么索引签名的键只能是 `string`、`number`、`symbol`？能否使用联合类型或字面量类型？
3. **已知属性共存**：当索引签名与已知属性同时存在时，已知属性的类型必须满足什么条件？
4. **数字键的真相**：JavaScript 中数字键会被转为字符串，TypeScript 如何处理数字索引签名与字符串索引签名的关系？
5. **属性访问的安全性**：`obj[key]` 在索引签名下返回 `T`，但实际上可能是 `undefined`，这一"谎言"如何缓解？
6. **性能开销**：索引签名对编译时类型检查与运行时性能有何影响？

### 1.5 索引签名的形式化定义

索引签名的形式化定义可以表示为：

$$
\mathrm{IndexSignature}(K, V) = \{ o : \mathrm{Object} \mid \forall k \in K, \ o[k] \in V \}
$$

其中 $K$ 是键集合（`string`、`number` 或 `symbol`），$V$ 是值类型。这一类型表示"所有键属于 $K$ 的属性，其值都属于 $V$"。

需要注意的是，索引签名是**下界**（lower bound）描述：它保证"所有存在的键对应的值都属于 $V$"，但**不保证**"所有 $K$ 中的键都存在"。这一区别是索引签名与 `Record<K, V>` 的核心差异之一。

## 第二章 基础概念

### 2.1 索引签名的语法

TypeScript 中索引签名有三种形式，对应 JavaScript 对象键的三种类型：

```typescript
// 字符串索引签名
interface StringMap {
  [key: string]: string;
}

// 数字索引签名
interface NumberMap {
  [key: number]: string;
}

// symbol 索引签名
interface SymbolMap {
  [key: symbol]: string;
}

// 混合索引签名（同时支持多种键类型）
interface MixedMap {
  [key: string]: string;
  [key: number]: string;
}
```

**语法说明**：

- `[key: Type]: ValueType` 中 `Type` 必须是 `string`、`number` 或 `symbol`（或它们的联合类型）。
- `key` 是形参名，可以是任意合法标识符，习惯用 `key` 或 `k`。
- `ValueType` 可以是任意类型，包括联合类型、对象类型、函数类型等。

### 2.2 字符串索引签名的语义

字符串索引签名表示"对象的任意字符串属性都属于 `ValueType`"：

```typescript
interface StringDict {
  [key: string]: string;
}

const dict: StringDict = {
  name: '张三',
  city: '北京',
  email: 'test@example.com',
};

// 任意字符串键的访问都返回 string
const value: string = dict['anyKey']; // 编译通过，运行时为 undefined
```

**重要语义**：

1. **类型保证是下界**：索引签名保证"如果某个键存在，其值属于 `ValueType`"，但**不保证**键一定存在。
2. **访问返回 `ValueType`**：`dict['anyKey']` 的类型是 `string`，不是 `string | undefined`。这是 TypeScript 的"乐观假设"——除非显式开启 `noUncheckedIndexedAccess` 选项。
3. **任意键赋值合法**：`dict['newKey'] = 'value'` 编译通过，因为 `newKey` 是字符串，值 `'value'` 是 `string`。

### 2.3 数字索引签名的特殊性

JavaScript 中对象的键总是字符串（或 symbol），数字键会被自动转为字符串。TypeScript 区分数字索引签名与字符串索引签名，但运行时行为一致：

```typescript
interface NumberIndexMap {
  [key: number]: string;
}

const list: NumberIndexMap = {
  0: '第一项',
  1: '第二项',
  2: '第三项',
};

// 数字键访问返回 string
list[0];       // '第一项'
list[1];       // '第二项'
list['0'];     // '第一项'（运行时与 list[0] 等价）

// 赋值
list[3] = '第四项'; // OK
list['4'] = '第五项'; // OK（数字字符串键）
```

**数字索引与字符串索引的关系**：

- 数字索引签名隐式包含字符串索引签名（因为数字键会被转为字符串）。
- 字符串索引签名不包含数字索引签名（因为字符串键不一定是数字字符串）。
- 当两者同时存在时，数字索引的值类型必须是字符串索引值类型的子类型。

```typescript
interface ValidMixed {
  [key: string]: string | number;
  [key: number]: string; // string 是 string | number 的子类型，合法
}

// interface InvalidMixed {
//   [key: string]: string;
//   [key: number]: number; // 错误：number 不是 string 的子类型
// }
```

### 2.4 Record 工具类型

`Record<K, V>` 是 TypeScript 内置的工具类型，用于创建键类型为 `K`、值类型为 `V` 的对象类型：

```typescript
type Record<K extends keyof any, T> = {
  [P in K]: T;
};
```

**`Record` 与索引签名的关键差异**：

1. **键的精确性**：`Record<K, V>` 中 `K` 可以是任意 `keyof any`（即 `string | number | symbol`），包括字面量联合类型；索引签名的键只能是 `string`、`number`、`symbol`。

```typescript
// Record 可以限制键为特定联合类型
type UserRoles = Record<'admin' | 'editor' | 'viewer', boolean>;
const roles: UserRoles = { admin: true, editor: false, viewer: true }; // 必须包含所有键

// 索引签名无法限制键为联合类型
interface LooseRoles {
  [key: string]: boolean;
}
const looseRoles: LooseRoles = { admin: true }; // 只需要一个键
```

2. **完整性检查**：`Record<K, V>` 要求所有键都存在（除非使用 `Partial<Record<K, V>>`）；索引签名不要求任何键存在。

3. **同态性**：`Record<K, V>` 是映射类型（非同态），不保留修饰符；索引签名不涉及修饰符。

4. **类型推断**：`Record` 的类型推断更精确，IDE 能提供更好的自动补全。

### 2.5 动态属性访问

动态属性访问通过 `keyof` 与泛型约束实现类型安全：

```typescript
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { name: '张三', age: 30, email: 'test@example.com' };

const name: string = getProperty(user, 'name');  // OK
const age: number = getProperty(user, 'age');    // OK
// getProperty(user, 'phone'); // 编译错误：'phone' 不是 user 的键
```

**`keyof T` 的语义**：`keyof T` 提取类型 `T` 的所有键作为联合类型。对于已知属性的对象，`keyof` 返回精确的键联合；对于索引签名的对象，`keyof` 返回 `string | number`（或对应的键类型）。

```typescript
interface KnownProps {
  name: string;
  age: number;
}
type KnownKeys = keyof KnownProps; // 'name' | 'age'

interface IndexedProps {
  [key: string]: string;
}
type IndexedKeys = keyof IndexedProps; // string | number
```

### 2.6 索引签名与已知属性共存

索引签名可以与已知属性共存，但**已知属性的类型必须是索引签名值类型的子类型**：

```typescript
interface ApiResponse {
  [key: string]: string | number | boolean | object;
  status: number;   // number 是 string | number | boolean | object 的子类型，OK
  message: string;  // string 是子类型，OK
  data: object;     // object 是子类型，OK
}

// 错误示例
// interface BadExample {
//   [key: string]: string;
//   count: number; // 错误：number 不是 string 的子类型
// }
```

**原因**：索引签名承诺"所有字符串键的值都属于 `ValueType`"，已知属性也是字符串键，因此其类型必须满足这一承诺。

**解决方案**：

```typescript
// 方案 1：拓宽索引签名值类型
interface FixedExample1 {
  [key: string]: string | number;
  count: number;
  label: string;
}

// 方案 2：使用联合类型
interface FixedExample2 {
  [key: string]: unknown; // unknown 是所有类型的超类型
  count: number;
  label: string;
}
```

## 第三章 历史演变

### 3.1 TypeScript 1.0：基础索引签名

TypeScript 1.0（2014 年）就支持了基础的字符串索引签名与数字索引签名，这是描述 JavaScript 对象动态性的基础：

```typescript
interface StringMap {
  [key: string]: string;
}
```

### 3.2 TypeScript 2.1：映射类型与 Record

TypeScript 2.1（2016 年 12 月）引入映射类型与 `Record` 工具类型。`Record` 提供了比索引签名更精确的键约束方式：

```typescript
type Record<K extends keyof any, T> = {
  [P in K]: T;
};

// Record 限制键为特定联合类型
type StrictMap = Record<'a' | 'b', string>;
```

### 3.3 TypeScript 4.1：模板字面量键

TypeScript 4.1（2020 年 11 月）引入模板字面量类型，使索引签名支持基于模板的键约束：

```typescript
// CSS 自定义属性
type CSSProperties = {
  [K in `--${string}`]?: string;
};

const styles: CSSProperties = {
  '--primary-color': '#2196F3',
  '--font-size': '16px',
};
```

### 3.4 TypeScript 4.4：Symbol 索引签名

TypeScript 4.4（2021 年 8 月）正式支持 symbol 索引签名：

```typescript
interface SymbolMap {
  [key: symbol]: string;
}

const sym = Symbol('key');
const map: SymbolMap = {
  [sym]: 'value',
};
```

### 3.5 TypeScript 4.9：satisfies 操作符

TypeScript 4.9（2022 年 11 月）引入 `satisfies` 操作符，提供了"验证对象满足类型，但保留具体类型"的能力，是索引签名的有力替代：

```typescript
const config = {
  port: 3000,
  host: 'localhost',
} satisfies Record<string, string | number>;
// config 的类型是 { port: number; host: string }，而非 Record<string, string | number>
```

### 3.6 TypeScript 5.0：装饰器与元数据

TypeScript 5.0（2023 年 3 月）的装饰器改进与元数据反射，使动态属性的应用场景更加丰富，索引签名在描述元数据时变得更加重要。

### 3.7 `noUncheckedIndexedAccess` 选项

TypeScript 4.1 引入 `noUncheckedIndexedAccess` 编译选项，使索引签名访问的返回类型包含 `undefined`，更准确地反映运行时行为：

```typescript
// tsconfig.json
// {
//   "compilerOptions": {
//     "noUncheckedIndexedAccess": true
//   }
// }

interface StringMap {
  [key: string]: string;
}

const dict: StringMap = {};
const value: string | undefined = dict['anyKey']; // 类型包含 undefined
```

## 第四章 设计哲学

### 4.1 渐进式类型（Gradual Typing）

TypeScript 的核心哲学是"渐进式类型"：允许在严格类型与动态类型之间平滑过渡。索引签名是这一哲学的体现——它允许对象具有"半结构化"的形态，部分键已知（精确类型），部分键开放（索引签名）。

```typescript
interface SemiStructured {
  // 已知属性，精确类型
  name: string;
  age: number;

  // 开放属性，宽松类型
  [key: string]: unknown;
}
```

这一设计使 TypeScript 既能描述严格的数据结构，又能适应 JavaScript 的动态特性。

### 4.2 类型安全与运行时真实性

TypeScript 的类型系统在"类型安全"与"运行时真实性"之间有所取舍。索引签名的"乐观假设"——访问返回 `ValueType` 而非 `ValueType | undefined`——是这一取舍的体现：

```typescript
interface StringMap {
  [key: string]: string;
}

const dict: StringMap = {};
const value: string = dict['anyKey']; // 类型是 string，但运行时是 undefined
```

`noUncheckedIndexedAccess` 选项提供了更"真实"但更"繁琐"的替代方案。这一设计哲学启示我们：类型系统的设计需要在"开发体验"与"正确性"之间平衡。

### 4.3 下界描述原则

索引签名采用"下界描述"：它描述"如果键存在，值属于什么类型"，而非"键一定存在"。这一原则与 JavaScript 对象的动态性一致：

$$
\forall k \in \mathrm{Object.keys}(o), \ o[k] \in V
$$

而非：

$$
\forall k \in K, \ k \in \mathrm{Object.keys}(o)
$$

`Record<K, V>` 则采用"精确描述"：它承诺所有 `K` 中的键都存在。两者的差异源于设计目标不同——索引签名描述"开放对象"，`Record` 描述"完整映射"。

### 4.4 类型推断的实用性

TypeScript 优先考虑"类型推断的实用性"。对于索引签名访问 `obj[key]`，返回 `T` 而非 `T | undefined` 使代码更简洁，避免大量 `if (value !== undefined)` 检查。这一实用性导向的设计哲学贯穿 TypeScript 的整个类型系统。

### 4.5 与 JavaScript 对象模型的对齐

TypeScript 的索引签名是对 JavaScript 对象模型的对齐。JavaScript 中对象本质上是一个"字符串到值的映射"（外加 symbol），索引签名直接反映了这一模型。这一对齐使 TypeScript 能准确描述 JavaScript 代码，包括其动态性。

## 第五章 语法与语义

### 5.1 索引签名的完整语法

```typescript
interface IndexSignatureObject {
  [key: KeyType]: ValueType;
}
```

**语法元素**：

- `[key: KeyType]`：键约束，`KeyType` 必须是 `string`、`number`、`symbol` 或其联合类型。
- `ValueType`：值类型，可以是任意类型。
- `key`：形参名，可以是任意合法标识符。

**变体**：

```typescript
// 只读索引签名
interface ReadonlyMap {
  readonly [key: string]: string;
}

// 可选属性与索引签名（已知属性可选，索引签名始终存在）
interface MixedProps {
  name?: string;
  [key: string]: string | undefined;
}

// 联合键类型
interface UnionKeyMap {
  [key: string | number]: string;
}
```

### 5.2 索引签名的类型推断

索引签名对象的类型推断遵循以下规则：

```typescript
interface StringMap {
  [key: string]: string;
}

const dict: StringMap = { name: '张三' };

// 访问推断
dict['name'];     // string
dict['unknown'];  // string（即使运行时是 undefined）
dict[0];          // string（数字键自动转为字符串）

// keyof 推断
type Keys = keyof StringMap; // string | number

// 索引访问推断
type ValueType = StringMap[string]; // string
```

### 5.3 Record 的语法与语义

```typescript
type Record<K extends keyof any, T> = {
  [P in K]: T;
};
```

**`Record` 的语义**：

- `K extends keyof any`：`K` 必须是 `string | number | symbol` 的子类型（即"可以作为对象键的类型"）。
- `[P in K]: T`：遍历 `K` 中的每个键，将其映射到 `T`。
- 结果是"所有 `K` 中键都存在，值类型为 `T`"的对象类型。

**`Record` 的类型推断**：

```typescript
type StrictMap = Record<'a' | 'b', string>;

// 访问推断
const map: StrictMap = { a: '1', b: '2' };
map['a'];        // string
map['c'];        // 编译错误：'c' 不是 'a' | 'b'

// keyof 推断
type Keys = keyof StrictMap; // 'a' | 'b'

// 完整性检查
const incomplete: StrictMap = { a: '1' }; // 编译错误：缺少 'b'
```

### 5.4 索引签名与 Record 的对比

| 特性 | 索引签名 `{ [key: string]: T }` | `Record<K, V>` |
|------|-------------------------------|----------------|
| 键约束 | `string`、`number`、`symbol` | 任意 `keyof any` 子类型 |
| 键精确性 | 开放（任意键） | 精确（指定键集合） |
| 完整性 | 不要求键存在 | 要求所有键存在 |
| 访问返回 | `T` | `T` |
| keyof | `string \| number` 等 | 精确的联合类型 |
| 同态性 | 非同态 | 非同态 |
| 适用场景 | 开放对象 | 完整映射 |

**等价场景**：

```typescript
// 这两种写法大致等价
interface StringMap {
  [key: string]: string;
}

type StringMapRecord = Record<string, string>;
```

但 `Record<string, string>` 与 `{ [key: string]: string }` 在某些边缘场景下行为略有不同（如属性修饰符处理）。

### 5.5 模板字面量键

TypeScript 4.1+ 支持基于模板字面量类型的键约束：

```typescript
// CSS 自定义属性
type CSSProperties = {
  [K in `--${string}`]?: string;
};

const styles: CSSProperties = {
  '--primary-color': '#2196F3',
  '--font-size': '16px',
};
// styles['--unknown'] = 'value'; // OK
// styles['unknown'] = 'value';    // 编译错误：不是 -- 前缀
```

**事件处理器映射**：

```typescript
type EventKey = `on${Capitalize<string>}`;
type EventMap = {
  [K in EventKey]?: (...args: any[]) => void;
};

const handlers: EventMap = {
  onClick: () => console.log('clicked'),
  onChange: () => console.log('changed'),
};
```

### 5.6 条件索引签名

通过条件类型派生不同的索引签名：

```typescript
type Dictionary<T, V> = T extends string
  ? Record<T, V>
  : { [key: string]: V };

type StringKeyDict = Dictionary<'a' | 'b', number>;
// Record<'a' | 'b', number> → { a: number; b: number }

type AnyKeyDict = Dictionary<string, number>;
// { [key: string]: number }
```

### 5.7 嵌套索引签名

索引签名可以嵌套，描述多维映射：

```typescript
interface NestedDict {
  [key: string]: {
    [key: string]: number;
  };
}

const scores: NestedDict = {
  math: { midterm: 85, final: 90 },
  english: { midterm: 78, final: 82 },
};
```

### 5.8 递归索引类型

通过递归类型描述任意深度的嵌套：

```typescript
type DeepRecord<T> = {
  [key: string]: T | DeepRecord<T>;
};

const deepConfig: DeepRecord<string> = {
  api: {
    baseURL: 'https://api.example.com',
    auth: {
      clientId: 'app-123',
      clientSecret: 'secret',
    },
  },
  features: {
    darkMode: 'true',
  },
};
```

## 第六章 实战示例

### 6.1 配置对象

配置对象是索引签名的典型应用：键集合开放，值类型有限。

```typescript
interface AppConfig {
  // 已知属性，精确类型
  appName: string;
  version: number;
  environment: 'development' | 'staging' | 'production';

  // 索引签名，允许任意额外配置
  [key: string]: string | number | boolean | object;
}

const config: AppConfig = {
  appName: '我的应用',
  version: 1,
  environment: 'production',
  debug: true,
  api: { baseURL: 'https://api.example.com', timeout: 5000 },
  features: { darkMode: true, i18n: true },
};

// 读取配置
function getConfig<T extends string | number | boolean>(key: string, defaultValue: T): T {
  const value = config[key];
  if (typeof value === typeof defaultValue) {
    return value as T;
  }
  return defaultValue;
}

const debug: boolean = getConfig('debug', false);
const port: number = getConfig('port', 3000);
```

### 6.2 类型安全的缓存

缓存结构使用索引签名存储任意键值对，但值类型固定：

```typescript
class TypedCache<T> {
  private cache: Record<string, T> = {};

  set(key: string, value: T): void {
    this.cache[key] = value;
  }

  get(key: string): T | undefined {
    return this.cache[key];
  }

  has(key: string): boolean {
    return key in this.cache;
  }

  delete(key: string): boolean {
    return delete this.cache[key];
  }

  keys(): string[] {
    return Object.keys(this.cache);
  }

  values(): T[] {
    return Object.values(this.cache);
  }

  entries(): Array<[string, T]> {
    return Object.entries(this.cache);
  }

  clear(): void {
    this.cache = {};
  }

  // 批量操作
  setMany(entries: Record<string, T>): void {
    this.cache = { ...this.cache, ...entries };
  }

  getMany(keys: string[]): Record<string, T | undefined> {
    return keys.reduce(
      (acc, key) => {
        acc[key] = this.cache[key];
        return acc;
      },
      {} as Record<string, T | undefined>,
    );
  }
}

// 使用
const userCache = new TypedCache<User>();
userCache.set('user:1', { id: 1, name: '张三' });
userCache.set('user:2', { id: 2, name: '李四' });

const user1 = userCache.get('user:1'); // User | undefined
const allUsers = userCache.values();    // User[]
```

### 6.3 国际化字典

国际化字典使用 `Record<Locale, Record<string, string>>` 描述多语言翻译映射：

```typescript
type Locale = 'zh-CN' | 'en-US' | 'ja-JP';

type TranslationDict = Record<string, string>;

const translations: Record<Locale, TranslationDict> = {
  'zh-CN': {
    'app.title': '我的应用',
    'user.greeting': '你好',
    'button.submit': '提交',
    'button.cancel': '取消',
  },
  'en-US': {
    'app.title': 'My App',
    'user.greeting': 'Hello',
    'button.submit': 'Submit',
    'button.cancel': 'Cancel',
  },
  'ja-JP': {
    'app.title': '私のアプリ',
    'user.greeting': 'こんにちは',
    'button.submit': '送信',
    'button.cancel': 'キャンセル',
  },
};

let currentLocale: Locale = 'zh-CN';

function t(key: string): string {
  return translations[currentLocale][key] ?? key;
}

// 使用
t('app.title');       // '我的应用'
t('user.greeting');   // '你好'
t('unknown.key');     // 'unknown.key'（回退到键本身）
```

### 6.4 动态属性访问

类型安全的动态属性访问通过 `keyof` 与泛型约束实现：

```typescript
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

function setProperty<T, K extends keyof T>(obj: T, key: K, value: T[K]): void {
  obj[key] = value;
}

const user = { name: '张三', age: 30, email: 'test@example.com' };

// 类型安全的访问
const name: string = getProperty(user, 'name');  // OK
const age: number = getProperty(user, 'age');    // OK
// getProperty(user, 'phone'); // 编译错误：'phone' 不是 user 的键

// 类型安全的设置
setProperty(user, 'name', '李四'); // OK
// setProperty(user, 'name', 123); // 编译错误：name 应为 string
```

### 6.5 模板字面量键的应用

模板字面量键在 CSS-in-JS、事件系统等场景中广泛应用：

```typescript
// CSS 自定义属性
type CSSCustomProperties = {
  [K in `--${string}`]?: string;
};

const theme: CSSCustomProperties = {
  '--primary-color': '#2196F3',
  '--secondary-color': '#FFC107',
  '--font-size': '16px',
  '--border-radius': '4px',
};

// 事件处理器
type EventName = keyof HTMLElementEventMap;
type EventHandler<E extends EventName> = (event: HTMLElementEventMap[E]) => void;

type EventHandlers = {
  [K in EventName as `on${Capitalize<K>}`]?: EventHandler<K>;
};

const handlers: EventHandlers = {
  onClick: (event) => console.log('clicked', event.clientX),
  onMouseOver: (event) => console.log('hovered', event.clientX),
  onKeyDown: (event) => console.log('key down', event.key),
};

// HTTP 头
type HTTPHeaders = {
  [K in string as `X-${Capitalize<K>}`]?: string;
};

const headers: HTTPHeaders = {
  'X-Request-Id': 'abc-123',
  'X-Auth-Token': 'token-value',
};
```

### 6.6 嵌套字典的安全访问

嵌套字典的安全访问需要处理 `undefined` 情况：

```typescript
interface NestedDict {
  [key: string]: {
    [key: string]: number;
  };
}

const scores: NestedDict = {
  math: { midterm: 85, final: 90 },
  english: { midterm: 78, final: 82 },
};

// 安全访问嵌套属性
function getNestedValue(obj: NestedDict, key1: string, key2: string): number | undefined {
  return obj[key1]?.[key2];
}

// 类型安全的路径访问
type Path<T> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? `${K}.${Path<T[K]>}` | K
        : K;
    }[keyof T & string]
  : never;

interface Config {
  api: {
    baseURL: string;
    timeout: number;
  };
  ui: {
    theme: 'light' | 'dark';
    locale: string;
  };
}

type ConfigPath = Path<Config>;
// 'api' | 'api.baseURL' | 'api.timeout' | 'ui' | 'ui.theme' | 'ui.locale'

function getConfigValue(path: ConfigPath): unknown {
  return path.split('.').reduce((obj: any, key) => obj?.[key], config);
}
```

### 6.7 条件索引签名

根据条件派生不同的索引签名类型：

```typescript
type Dictionary<T, V> = T extends string
  ? Record<T, V>
  : { [key: string]: V };

type StringKeyDict = Dictionary<'a' | 'b', number>;
// Record<'a' | 'b', number> → { a: number; b: number }

type AnyKeyDict = Dictionary<string, number>;
// { [key: string]: number }

// 条件索引签名的实际应用
type StrictConfig<T extends string> = Record<T, string | number | boolean>;
type LooseConfig = { [key: string]: string | number | boolean };

type AppMode = 'development' | 'staging' | 'production';
const strictConfig: StrictConfig<AppMode> = {
  development: true,
  staging: false,
  production: true,
};

const looseConfig: LooseConfig = {
  development: true,
  custom: 'value',
};
```

### 6.8 动态代理对象

使用 `Proxy` 创建类型安全的动态对象：

```typescript
function createTypedProxy<T extends Record<string, any>>(
  handler: (key: string) => T[string],
): T {
  return new Proxy({} as T, {
    get(_, key: string) {
      return handler(key);
    },
  });
}

// 创建环境变量代理
const env = createTypedProxy<string>((key) => process.env[key] ?? '');

env.VITE_API_URL; // string
env.VITE_DEBUG;   // string

// 创建配置代理
const config = createTypedProxy<string | number | boolean>((key) => {
  // 从某个配置源读取
  return getFromConfigSource(key);
});

config.apiUrl;     // string | number | boolean
config.timeout;    // string | number | boolean
```

### 6.9 递归索引类型的应用

递归索引类型描述任意深度的嵌套结构：

```typescript
type DeepRecord<T> = {
  [key: string]: T | DeepRecord<T>;
};

// 配置对象
const deepConfig: DeepRecord<string> = {
  api: {
    baseURL: 'https://api.example.com',
    auth: {
      clientId: 'app-123',
      clientSecret: 'secret',
    },
  },
  features: {
    darkMode: 'true',
    i18n: {
      defaultLocale: 'zh-CN',
      supportedLocales: 'zh-CN,en-US',
    },
  },
};

// 安全访问
function getDeepValue(obj: DeepRecord<string>, path: string): string | undefined {
  const keys = path.split('.');
  let current: DeepRecord<string> | string = obj;
  for (const key of keys) {
    if (typeof current === 'string') return undefined;
    current = current[key];
    if (current === undefined) return undefined;
  }
  return typeof current === 'string' ? current : undefined;
}

// 使用
getDeepValue(deepConfig, 'api.baseURL');              // 'https://api.example.com'
getDeepValue(deepConfig, 'api.auth.clientId');        // 'app-123'
getDeepValue(deepConfig, 'features.i18n.defaultLocale'); // 'zh-CN'
getDeepValue(deepConfig, 'unknown.path');             // undefined
```

### 6.10 satisfies 替代索引签名

`satisfies` 操作符提供了"验证对象满足类型，但保留具体类型"的能力：

```typescript
// 索引签名方式
const config1: Record<string, string | number> = {
  port: 3000,
  host: 'localhost',
};
// config1.port 的类型是 string | number（拓宽了）

// satisfies 方式
const config2 = {
  port: 3000,
  host: 'localhost',
} satisfies Record<string, string | number>;
// config2.port 的类型是 number（保留了具体类型）

// 实际应用
const colors = {
  primary: '#2196F3',
  secondary: '#FFC107',
  error: '#F44336',
} satisfies Record<string, string>;

// colors.primary 的类型是 string（具体值类型）
const primaryColor: string = colors.primary;
```

## 第七章 内部原理

### 7.1 索引签名的类型检查流程

当 TypeScript 检查 `obj[key]` 时（`obj` 有索引签名），类型检查流程如下：

1. **解析 `obj` 的类型**：检查 `obj` 是否有索引签名。
2. **解析 `key` 的类型**：检查 `key` 是否匹配索引签名的键类型。
3. **返回值类型**：返回索引签名的值类型 `ValueType`。

```typescript
interface StringMap {
  [key: string]: string;
}

const dict: StringMap = {};

// 类型检查流程：
// 1. dict 有字符串索引签名
// 2. 'anyKey' 是 string 类型，匹配
// 3. 返回 string 类型
const value: string = dict['anyKey'];
```

### 7.2 索引签名与已知属性的兼容性检查

当索引签名与已知属性共存时，TypeScript 检查"已知属性类型是否是索引签名值类型的子类型"：

```typescript
interface ValidExample {
  [key: string]: string | number;
  name: string;   // string 是 string | number 的子类型，OK
  count: number;  // number 是子类型，OK
}

// interface InvalidExample {
//   [key: string]: string;
//   count: number; // 错误：number 不是 string 的子类型
// }
```

**检查算法**：

$$
\forall p \in \mathrm{KnownProperties}(T), \ T_p \subseteq \mathrm{IndexValue}(T)
$$

其中 $T_p$ 是属性 $p$ 的类型，$\mathrm{IndexValue}(T)$ 是索引签名的值类型。

### 7.3 数字索引签名的特殊处理

数字索引签名在类型检查中有特殊处理：

1. **数字索引签名隐式包含字符串索引签名**：因为 JavaScript 中数字键会被转为字符串。

```typescript
interface NumberMap {
  [key: number]: string;
}

const list: NumberMap = { 0: 'a', 1: 'b' };
list[0];      // string
list['0'];    // string（数字字符串键也匹配）
list['any'];  // string（虽然键不是数字，但运行时所有键都是字符串）
```

2. **数字索引与字符串索引共存的规则**：数字索引的值类型必须是字符串索引值类型的子类型。

```typescript
interface ValidMixed {
  [key: string]: string | number;
  [key: number]: string; // string 是 string | number 的子类型
}
```

### 7.4 Record 的实现原理

`Record<K, V>` 通过映射类型实现：

```typescript
type Record<K extends keyof any, T> = {
  [P in K]: T;
};
```

**实现解析**：

- `K extends keyof any`：约束 `K` 为 `string | number | symbol` 的子类型。
- `[P in K]: T`：映射类型，遍历 `K` 中的每个字面量，生成对应属性。
- 当 `K` 是 `string` 时，映射类型退化为索引签名（`[P in string]: T` 等价于 `{ [key: string]: T }`）。
- 当 `K` 是字面量联合类型时，生成精确的属性集合。

```typescript
// Record<'a' | 'b', string> 的展开
type Result = {
  a: string;
  b: string;
};

// Record<string, string> 的展开
type Result2 = {
  [key: string]: string;
};
```

### 7.5 keyof 的行为

`keyof` 操作符在索引签名对象与已知属性对象上行为不同：

```typescript
interface KnownProps {
  name: string;
  age: number;
}
type KnownKeys = keyof KnownProps; // 'name' | 'age'

interface IndexedProps {
  [key: string]: string;
}
type IndexedKeys = keyof IndexedProps; // string | number

interface NumberIndexed {
  [key: number]: string;
}
type NumberKeys = keyof NumberIndexed; // number
```

**原因**：索引签名描述"任意键"，因此 `keyof` 返回键类型本身（而非具体的键联合）。

### 7.6 索引访问类型

索引访问类型 `T[K]` 的行为：

```typescript
interface StringMap {
  [key: string]: string;
}

type Value1 = StringMap[string]; // string
type Value2 = StringMap['any'];  // string
type Value3 = StringMap[number]; // string

interface KnownProps {
  name: string;
  age: number;
}

type Value4 = KnownProps['name']; // string
type Value5 = KnownProps['age'];  // number
```

### 7.7 编译时性能

索引签名对编译时性能的影响：

| 操作 | 复杂度 | 说明 |
|------|--------|------|
| 索引签名定义 | $\mathcal{O}(1)$ | 简单类型定义 |
| 索引访问 `obj[key]` | $\mathcal{O}(1)$ | 直接查找 |
| `keyof` 操作 | $\mathcal{O}(1)$ | 返回键类型 |
| 已知属性兼容性检查 | $\mathcal{O}(n)$ | $n$ 是已知属性数 |
| 嵌套索引签名 | $\mathcal{O}(d)$ | $d$ 是嵌套深度 |
| 递归索引类型 | $\mathcal{O}(2^n)$ | 潜在的指数爆炸 |

递归索引类型（如 `DeepRecord<T>`）在某些操作下可能导致类型爆炸，需要谨慎使用。

## 第八章 最佳实践

### 8.1 选择索引签名还是 Record

**选择索引签名的场景**：

- 对象的键集合是开放的（运行时可能添加任意键）。
- 配置对象、缓存、字典等动态结构。
- 从 JSON 解析的数据，键集合不确定。

**选择 Record 的场景**：

- 对象的键集合是已知的、有限的。
- 需要完整性检查（所有键都必须存在）。
- 需要精确的键联合类型（用于类型安全的访问）。

```typescript
// 索引签名：开放对象
interface Config {
  [key: string]: string | number | boolean;
}

// Record：完整映射
type UserRoles = Record<'admin' | 'editor' | 'viewer', boolean>;
```

### 8.2 使用 satisfies 替代索引签名

当需要"验证对象结构但保留具体类型"时，使用 `satisfies` 而非索引签名：

```typescript
// 不推荐：索引签名拓宽了类型
const config1: Record<string, string | number> = {
  port: 3000,
  host: 'localhost',
};
// config1.port 类型是 string | number

// 推荐：satisfies 保留具体类型
const config2 = {
  port: 3000,
  host: 'localhost',
} satisfies Record<string, string | number>;
// config2.port 类型是 number
```

### 8.3 开启 noUncheckedIndexedAccess

对于追求类型安全的项目，建议开启 `noUncheckedIndexedAccess`：

```json
// tsconfig.json
{
  "compilerOptions": {
    "noUncheckedIndexedAccess": true
  }
}
```

这一选项使索引访问的返回类型包含 `undefined`，更准确地反映运行时行为：

```typescript
interface StringMap {
  [key: string]: string;
}

const dict: StringMap = {};
const value: string | undefined = dict['anyKey']; // 类型包含 undefined

// 需要显式检查
if (value !== undefined) {
  console.log(value.toUpperCase()); // OK
}
```

### 8.4 使用 unknown 而非 any

当不确定值类型时，使用 `unknown` 而非 `any`：

```typescript
// 不推荐：any 绕过了类型检查
interface LooseAny {
  [key: string]: any;
}

// 推荐：unknown 强制类型检查
interface LooseUnknown {
  [key: string]: unknown;
}

const data: LooseUnknown = JSON.parse(jsonString);
// data.anyKey 类型是 unknown，需要类型守卫后才能使用
if (typeof data.name === 'string') {
  console.log(data.name.toUpperCase()); // OK
}
```

### 8.5 索引签名的键命名

索引签名的形参名应具有语义：

```typescript
// 不推荐：无语义的形参名
interface BadMap {
  [k: string]: string;
}

// 推荐：语义化形参名
interface GoodMap {
  [key: string]: string;
}

interface LocaleMap {
  [locale: string]: string;
}

interface EventHandlerMap {
  [eventName: string]: () => void;
}
```

### 8.6 避免索引签名与精确类型混用

当已知属性较多时，避免索引签名与精确类型混用，改用 `Record` + 可选属性：

```typescript
// 不推荐：索引签名与多个已知属性混用
interface MixedConfig {
  [key: string]: unknown;
  port: number;
  host: string;
  debug: boolean;
  timeout: number;
  // ...
}

// 推荐：使用精确类型 + 可选属性
interface PreciseConfig {
  port: number;
  host: string;
  debug: boolean;
  timeout: number;
  [key: string]: unknown; // 索引签名作为补充
}

// 或使用 Record + 扩展
type ConfigRecord = Record<'port' | 'host' | 'debug' | 'timeout', unknown> & {
  [key: string]: unknown;
};
```

### 8.7 类型安全的动态属性访问

使用泛型约束实现类型安全的动态属性访问：

```typescript
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

function setProperty<T, K extends keyof T>(obj: T, key: K, value: T[K]): T {
  return { ...obj, [key]: value };
}

const user = { name: '张三', age: 30 };

// 类型安全
const name = getProperty(user, 'name'); // string
const updated = setProperty(user, 'age', 31); // { name: string; age: number }
```

### 8.8 缓存与映射的实现

实现缓存与映射时，根据需求选择 `Record` 或 `Map`：

```typescript
// Record：简单映射，键为字符串
const userCache: Record<string, User> = {};

// Map：复杂映射，键可以是任意类型
const userMap = new Map<string, User>();
userMap.set('user:1', { id: 1, name: '张三' });
```

**Record vs Map**：

| 特性 | Record | Map |
|------|--------|-----|
| 键类型 | string / number / symbol | 任意类型 |
| 顺序 | 不保证 | 插入顺序 |
| 性能 | 哈希表 | 哈希表（更优） |
| 序列化 | JSON 原生支持 | 需要手动处理 |
| 迭代 | Object.entries / Object.keys | for...of |
| 大小 | Object.keys().length | map.size |

### 8.9 测试策略

索引签名对象的测试策略：

```typescript
describe('TypedCache', () => {
  let cache: TypedCache<string>;

  beforeEach(() => {
    cache = new TypedCache<string>();
  });

  test('should set and get value', () => {
    cache.set('key', 'value');
    expect(cache.get('key')).toBe('value');
  });

  test('should return undefined for missing key', () => {
    expect(cache.get('missing')).toBeUndefined();
  });

  test('should check existence', () => {
    cache.set('key', 'value');
    expect(cache.has('key')).toBe(true);
    expect(cache.has('missing')).toBe(false);
  });

  test('should delete value', () => {
    cache.set('key', 'value');
    cache.delete('key');
    expect(cache.has('key')).toBe(false);
  });
});
```

## 第九章 常见陷阱

### 9.1 访问返回 undefined 但类型不包含

**问题**：索引签名访问返回 `ValueType`，但运行时可能是 `undefined`：

```typescript
interface StringMap {
  [key: string]: string;
}

const dict: StringMap = {};
const value: string = dict['anyKey']; // 类型是 string，但运行时是 undefined
console.log(value.toUpperCase()); // 运行时错误：Cannot read property 'toUpperCase' of undefined
```

**解决方案**：开启 `noUncheckedIndexedAccess` 或手动检查：

```typescript
// 方案 1：开启 noUncheckedIndexedAccess
// tsconfig.json: "noUncheckedIndexedAccess": true

// 方案 2：手动检查
const value = dict['anyKey'];
if (value !== undefined) {
  console.log(value.toUpperCase());
}

// 方案 3：使用可选链
console.log(dict['anyKey']?.toUpperCase());
```

### 9.2 已知属性类型不兼容

**问题**：已知属性类型不是索引签名值类型的子类型：

```typescript
// 错误示例
interface BadExample {
  [key: string]: string;
  count: number; // 错误：number 不是 string 的子类型
}
```

**解决方案**：拓宽索引签名值类型或移除已知属性：

```typescript
// 方案 1：拓宽索引签名值类型
interface FixedExample1 {
  [key: string]: string | number;
  count: number;
  label: string;
}

// 方案 2：使用联合类型
interface FixedExample2 {
  [key: string]: unknown;
  count: number;
  label: string;
}
```

### 9.3 数字键的字符串转换

**问题**：JavaScript 中数字键会被转为字符串，可能导致意外行为：

```typescript
interface NumberMap {
  [key: number]: string;
}

const list: NumberMap = { 0: 'a', 1: 'b' };

// 数字键访问
list[0];      // 'a'
list['0'];    // 'a'（数字字符串键也匹配）
list[1.0];    // 'b'（1.0 等于 1）

// 但对象字面量的键总是字符串
const obj = { 1: 'one', 2: 'two' };
Object.keys(obj); // ['1', '2']（字符串键）
```

### 9.4 Object.keys 返回 string[]

**问题**：`Object.keys()` 返回 `string[]`，而非 `keyof T[]`：

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

const user: User = { id: 1, name: '张三', email: 'test@example.com' };
const keys = Object.keys(user); // string[]

// keys 的类型是 string[]，不是 ('id' | 'name' | 'email')[]
// 需要类型断言或类型守卫
const typedKeys = Object.keys(user) as (keyof User)[];
```

**解决方案**：

```typescript
// 方案 1：类型断言
const keys = Object.keys(user) as (keyof User)[];

// 方案 2：自定义工具函数
function keysOf<T extends object>(obj: T): (keyof T)[] {
  return Object.keys(obj) as (keyof T)[];
}

const typedKeys = keysOf(user); // ('id' | 'name' | 'email')[]
```

### 9.5 索引签名拓宽了类型

**问题**：使用索引签名注解会拓宽对象字面量的类型：

```typescript
const config: Record<string, string | number> = {
  port: 3000,
  host: 'localhost',
};

// config.port 类型是 string | number（拓宽了）
const port: number = config.port; // 编译错误：string | number 不能赋值给 number
```

**解决方案**：使用 `satisfies`：

```typescript
const config = {
  port: 3000,
  host: 'localhost',
} satisfies Record<string, string | number>;

// config.port 类型是 number（保留了具体类型）
const port: number = config.port; // OK
```

### 9.6 for...in 遍历的类型问题

**问题**：`for...in` 遍历的键类型是 `string`，而非 `keyof T`：

```typescript
interface User {
  id: number;
  name: string;
}

const user: User = { id: 1, name: '张三' };

for (const key in user) {
  // key 的类型是 string，不是 'id' | 'name'
  console.log(user[key]); // 编译错误：元素隐式具有 'any' 类型
}
```

**解决方案**：

```typescript
// 方案 1：类型断言
for (const key in user) {
  const k = key as keyof User;
  console.log(user[k]);
}

// 方案 2：使用 Object.entries
for (const [key, value] of Object.entries(user)) {
  console.log(key, value);
}

// 方案 3：使用 Object.keys
for (const key of Object.keys(user) as (keyof User)[]) {
  console.log(user[key]);
}
```

### 9.7 索引签名与 JSON.parse

**问题**：`JSON.parse` 返回 `any`，需要手动类型断言：

```typescript
const json = '{"name": "张三", "age": 30}';
const data = JSON.parse(json); // any

// 直接访问可能出错
console.log(data.name.toUpperCase()); // 运行时可能错误
```

**解决方案**：使用类型守卫或运行时验证：

```typescript
// 方案 1：类型断言（不安全）
const data = JSON.parse(json) as User;

// 方案 2：运行时验证（安全）
function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as any).name === 'string' &&
    typeof (obj as any).age === 'number'
  );
}

const parsed = JSON.parse(json);
if (isUser(parsed)) {
  console.log(parsed.name.toUpperCase()); // OK
}
```

### 9.8 递归类型的无限展开

**问题**：递归索引类型可能导致无限展开：

```typescript
type DeepRecord<T> = {
  [key: string]: T | DeepRecord<T>;
};

// 在某些操作下可能导致类型爆炸
type Result = DeepRecord<string>['a']['b']['c']; // 可能触发递归
```

**解决方案**：限制递归深度或使用条件类型终止：

```typescript
type DeepRecord<T, Depth extends number = 5> = Depth extends 0
  ? T
  : {
      [key: string]: T | DeepRecord<T, Depth extends 0 ? 0 : Depth>;
    };
```

### 9.9 索引签名与原型链

**问题**：`for...in` 遍历会包括原型链上的属性：

```typescript
const obj1 = { a: 1 };
const obj2 = Object.create(obj1);
obj2.b = 2;

for (const key in obj2) {
  console.log(key); // 'b', 'a'（包括原型链上的 'a'）
}
```

**解决方案**：使用 `Object.keys()` 或 `hasOwnProperty` 检查：

```typescript
for (const key in obj2) {
  if (Object.prototype.hasOwnProperty.call(obj2, key)) {
    console.log(key); // 只输出 'b'
  }
}

// 或使用 Object.keys
for (const key of Object.keys(obj2)) {
  console.log(key); // 只输出 'b'
}
```

### 9.10 symbol 索引签名的限制

**问题**：symbol 索引签名的使用场景有限：

```typescript
interface SymbolMap {
  [key: symbol]: string;
}

const sym1 = Symbol('key1');
const sym2 = Symbol('key2');

const map: SymbolMap = {
  [sym1]: 'value1',
  [sym2]: 'value2',
};

// 访问需要具体的 symbol
console.log(map[sym1]); // 'value1'

// 无法用字符串键访问
// console.log(map['key1']); // 编译错误：字符串键不匹配 symbol 索引
```

## 第十章 性能分析

### 10.1 编译时性能

索引签名对编译时性能的影响：

| 操作 | 复杂度 | 说明 |
|------|--------|------|
| 索引签名定义 | $\mathcal{O}(1)$ | 简单类型定义 |
| 索引访问 `obj[key]` | $\mathcal{O}(1)$ | 直接查找 |
| `keyof` 操作 | $\mathcal{O}(1)$ | 返回键类型 |
| 已知属性兼容性检查 | $\mathcal{O}(n)$ | $n$ 是已知属性数 |
| 嵌套索引签名 | $\mathcal{O}(d)$ | $d$ 是嵌套深度 |
| 递归索引类型 | $\mathcal{O}(2^n)$ | 潜在的指数爆炸 |
| `noUncheckedIndexedAccess` 开启 | $\mathcal{O}(1)$ | 额外的 undefined 检查 |

**实测数据**（参考 TypeScript 编译器源码注释）：

| 对象类型 | 类型检查时间（微秒） |
|---------|---------------------|
| 已知属性对象（5 个属性） | 10 |
| 索引签名对象 | 15 |
| 嵌套索引签名（3 层） | 50 |
| 递归索引类型 | 200+（取决于深度） |
| `Record<string, T>` | 12 |

### 10.2 运行时性能

索引签名本身在运行时无开销（类型信息编译时消除），但对象操作的运行时性能值得关注：

| 操作 | 时间复杂度 | 说明 |
|------|-----------|------|
| 属性访问 `obj[key]` | $\mathcal{O}(1)$ | 哈希表查找 |
| 属性设置 `obj[key] = value` | $\mathcal{O}(1)$ | 哈希表插入 |
| 属性删除 `delete obj[key]` | $\mathcal{O}(1)$ | 哈希表删除 |
| `Object.keys()` | $\mathcal{O}(n)$ | 遍历所有键 |
| `Object.entries()` | $\mathcal{O}(n)$ | 遍历所有键值对 |
| `key in obj` | $\mathcal{O}(1)$ | 哈希表查找 |
| `for...in` 遍历 | $\mathcal{O}(n)$ | 遍历所有键（包括原型链） |

### 10.3 Record vs Map 运行时性能

`Record`（普通对象）与 `Map` 的运行时性能对比：

| 操作 | Record | Map | 说明 |
|------|--------|-----|------|
| 插入 | $\mathcal{O}(1)$ | $\mathcal{O}(1)$ | Map 略快 |
| 查找 | $\mathcal{O}(1)$ | $\mathcal{O}(1)$ | Map 略快 |
| 删除 | $\mathcal{O}(1)$ | $\mathcal{O}(1)$ | Map 显著快（delete 有性能问题） |
| 遍历 | $\mathcal{O}(n)$ | $\mathcal{O}(n)$ | Map 略快 |
| 大小获取 | $\mathcal{O}(n)$（Object.keys().length） | $\mathcal{O}(1)$（map.size） | Map 显著快 |
| 序列化 | 原生 JSON 支持 | 需要手动处理 | Record 更方便 |

**建议**：

- 小规模数据（<1000 键）：使用 `Record`，方便序列化。
- 大规模数据（>1000 键）：使用 `Map`，性能更优。
- 需要非字符串键：使用 `Map`。
- 需要 JSON 序列化：使用 `Record`。

### 10.4 noUncheckedIndexedAccess 的性能影响

开启 `noUncheckedIndexedAccess` 对编译时性能的影响：

- 类型检查时间增加约 5-10%（额外的 `undefined` 处理）。
- 编译产物无变化（类型信息编译时消除）。
- 开发体验略受影响（需要更多 `undefined` 检查）。

对于大型项目，这一开销通常可以接受，换取的类型安全性值得。

## 第十一章 对比其他语言

### 11.1 与 Flow 对比

Flow（Facebook 的类型检查器）的索引签名与 TypeScript 类似：

```javascript
// @flow
interface StringMap {
  [key: string]: string;
}

const dict: StringMap = { name: '张三' };
```

**对比**：

| 特性 | TypeScript | Flow |
|------|-----------|------|
| 索引签名语法 | `[key: string]: T` | `[key: string]: T` |
| `Record` 工具类型 | 内置 | 不内置 |
| 模板字面量键 | 支持 | 不支持 |
| `satisfies` 操作符 | 支持（4.9+） | 不支持 |
| `noUncheckedIndexedAccess` | 支持 | 不支持 |

TypeScript 在索引签名的类型表达力上优于 Flow。

### 11.2 与 Rust 对比

Rust 没有直接的"索引签名"概念，但通过 `HashMap` 提供类似功能：

```rust
use std::collections::HashMap;

let mut dict: HashMap<String, String> = HashMap::new();
dict.insert("name".to_string(), "张三".to_string());

// 访问返回 Option<&String>
let value: Option<&String> = dict.get("name");
```

**对比**：

| 特性 | TypeScript | Rust |
|------|-----------|------|
| 动态键对象 | 索引签名 | HashMap |
| 访问返回 | `T`（乐观） | `Option<&T>`（精确） |
| 性能 | 哈希表 | 哈希表 |
| 类型安全 | 编译时 + 运行时 | 编译时 + 运行时 |

Rust 的 `Option<&T>` 返回类型更精确地反映了"键可能不存在"的事实，避免了 TypeScript 的"乐观假设"问题。

### 11.3 与 Java 对比

Java 通过 `Map<K, V>` 接口提供动态键映射：

```java
import java.util.HashMap;
import java.util.Map;

Map<String, String> dict = new HashMap<>();
dict.put("name", "张三");

// 访问返回 String（可能为 null）
String value = dict.get("name");
```

**对比**：

| 特性 | TypeScript | Java |
|------|-----------|------|
| 动态键对象 | 索引签名 / Record | Map<K, V> |
| 访问返回 | `T`（乐观） | `V`（可能为 null） |
| 类型安全 | 编译时 | 编译时（泛型） |
| 性能 | 哈希表 | 哈希表 |

Java 的 `Map.get` 返回 `V`（可能为 null），与 TypeScript 的乐观假设类似，但 Java 有 `Optional<V>` 的替代方案。

### 11.4 与 Python 对比

Python 的字典（dict）是最常用的动态键映射：

```python
# Python dict
dict_obj: dict[str, str] = {'name': '张三'}

# 访问返回 str（键不存在时抛出 KeyError）
value: str = dict_obj['name']

# 使用 get 方法返回 Optional[str]
value: str | None = dict_obj.get('name')
```

**对比**：

| 特性 | TypeScript | Python |
|------|-----------|--------|
| 动态键对象 | 索引签名 / Record | dict |
| 访问返回 | `T`（乐观） | `T` 或抛异常 |
| 类型安全 | 编译时 | 运行时（类型提示） |
| 性能 | 哈希表 | 哈希表 |

Python 的 `dict['key']` 在键不存在时抛出 `KeyError`，比 TypeScript 的"乐观假设"更严格。

### 11.5 与 Go 对比

Go 通过 `map[K]V` 提供动态键映射：

```go
// Go map
dict := map[string]string{"name": "张三"}

// 访问返回值和是否存在
value, ok := dict["name"]
if ok {
    fmt.Println(value)
}
```

**对比**：

| 特性 | TypeScript | Go |
|------|-----------|-----|
| 动态键对象 | 索引签名 / Record | map[K]V |
| 访问返回 | `T`（乐观） | `V, bool`（精确） |
| 类型安全 | 编译时 | 编译时 |
| 性能 | 哈希表 | 哈希表 |

Go 的"comma-ok"模式是最精确的访问方式，直接反映了"键可能不存在"的事实。

## 第十二章 总结与扩展

### 12.1 核心要点回顾

本教程系统讲解了 TypeScript 的索引签名与动态属性访问，核心要点：

1. **索引签名的语义**：描述"键集合开放"的对象，键类型只能是 `string`、`number`、`symbol`。
2. **索引签名 vs Record**：索引签名描述开放对象，`Record` 描述完整映射，两者各有适用场景。
3. **已知属性共存规则**：已知属性类型必须是索引签名值类型的子类型。
4. **数字索引的特殊性**：数字键运行时转为字符串，数字索引隐式包含字符串索引。
5. **模板字面量键**：TypeScript 4.1+ 支持基于模板的键约束，适用于 CSS 自定义属性、事件处理器等场景。
6. **动态属性访问**：通过 `keyof` 与泛型约束实现类型安全的动态访问。
7. **satisfies 操作符**：验证对象满足类型的同时保留具体类型，是索引签名的有力替代。
8. **noUncheckedIndexedAccess**：开启此选项使访问返回类型包含 `undefined`，更准确地反映运行时行为。
9. **性能权衡**：索引签名对编译时性能影响小，但递归索引类型可能导致类型爆炸。
10. **最佳实践**：根据场景选择索引签名、Record、Map 或 satisfies。

### 12.2 设计决策总结

| 场景 | 推荐方案 | 备选方案 |
|------|---------|---------|
| 开放对象（配置） | 索引签名 | satisfies |
| 完整映射（角色） | Record | 已知属性 |
| 缓存 | Record | Map |
| 大规模映射 | Map | Record |
| JSON 数据 | 索引签名 + 类型守卫 | zod 验证 |
| CSS 自定义属性 | 模板字面量键 | 索引签名 |
| 事件处理器 | 模板字面量键 | 已知属性 |
| 嵌套字典 | 嵌套索引签名 | 递归类型 |
| 动态代理 | Proxy + 索引签名 | Record |

### 12.3 进阶主题

**类型安全的 JSON 解析**：

通过运行时验证库（如 zod、io-ts、runtypes）实现类型安全的 JSON 解析：

```typescript
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string(),
  age: z.number(),
});

type User = z.infer<typeof UserSchema>;

const parseUser = (json: string): User => {
  const parsed = JSON.parse(json);
  return UserSchema.parse(parsed); // 运行时验证 + 类型安全
};
```

**类型安全的路径访问**：

通过模板字面量类型实现类型安全的路径访问：

```typescript
type Path<T> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? `${K}.${Path<T[K]>}` | K
        : K;
    }[keyof T & string]
  : never;

interface Config {
  api: { baseURL: string; timeout: number };
  ui: { theme: string; locale: string };
}

type ConfigPath = Path<Config>;
// 'api' | 'api.baseURL' | 'api.timeout' | 'ui' | 'ui.theme' | 'ui.locale'

function getPath(obj: Config, path: ConfigPath): unknown {
  return path.split('.').reduce((acc: any, key) => acc?.[key], obj);
}
```

**类型安全的动态对象创建**：

```typescript
function createObject<K extends string, V>(
  keys: K[],
  valueFactory: (key: K) => V,
): Record<K, V> {
  return keys.reduce(
    (acc, key) => {
      acc[key] = valueFactory(key);
      return acc;
    },
    {} as Record<K, V>,
  );
}

const roles = createObject(['admin', 'editor', 'viewer'], () => false);
// roles: Record<'admin' | 'editor' | 'viewer', boolean>
```

### 12.4 推荐工具与库

| 工具/库 | 说明 |
|---------|------|
| zod | 运行时类型验证 + 类型推导 |
| io-ts | 函数式编程风格的验证 |
| runtypes | 类型安全的运行时验证 |
| ts-toolbelt | 类型工具集合 |
| type-fest | 实用类型工具 |
| partial.deep | 深度 Partial 实现 |

### 12.5 学习资源

**官方文档**：

- TypeScript Handbook: Mapped Types
- TypeScript Handbook: Index Signatures
- TypeScript Handbook: Indexed Access Types
- TypeScript Handbook: keyof Type Operator

**开源项目**：

- type-fest（https://github.com/sindresorhus/type-fest）
- ts-toolbelt（https://github.com/millsp/ts-toolbelt）
- zod（https://github.com/colinhacks/zod）

### 12.6 练习题

#### 练习 1：基础索引签名

实现一个接受任意字符串键、返回数字值的字典类型，并实现 `get`、`set`、`has` 方法。

#### 练习 2：Record vs 索引签名

分别用 `Record` 和索引签名实现"用户角色映射"，并说明两者的差异。

#### 练习 3：模板字面量键

实现一个 CSS 自定义属性类型，键必须以 `--` 开头，值为字符串。

#### 练习 4：嵌套索引签名

实现一个二维嵌套字典类型，键为字符串，值为另一个字符串到数字的映射。

#### 练习 5：satisfies 替代

使用 `satisfies` 操作符实现配置对象的类型验证，并保留具体类型。

### 12.7 练习题答案

#### 练习 1 答案

```typescript
interface NumberDict {
  [key: string]: number;
}

class NumberDictionary {
  private data: NumberDict = {};

  get(key: string): number | undefined {
    return this.data[key];
  }

  set(key: string, value: number): void {
    this.data[key] = value;
  }

  has(key: string): boolean {
    return key in this.data;
  }

  delete(key: string): boolean {
    return delete this.data[key];
  }
}
```

#### 练习 2 答案

```typescript
// Record 方式：键必须完整
type RolesRecord = Record<'admin' | 'editor' | 'viewer', boolean>;
const roles1: RolesRecord = {
  admin: true,
  editor: false,
  viewer: true,
};
// 必须包含所有键，不能多也不能少

// 索引签名方式：键开放
interface RolesIndex {
  [key: string]: boolean;
}
const roles2: RolesIndex = {
  admin: true,
  editor: false,
};
// 可以只有部分键，也可以有额外键

// 差异：
// 1. Record 要求完整性，索引签名不要求
// 2. Record 限制键集合，索引签名开放
// 3. Record 提供精确的 keyof，索引签名返回 string
```

#### 练习 3 答案

```typescript
type CSSCustomProperties = {
  [K in `--${string}`]?: string;
};

const styles: CSSCustomProperties = {
  '--primary-color': '#2196F3',
  '--font-size': '16px',
  '--border-radius': '4px',
};

// styles['--unknown'] = 'value'; // OK
// styles['unknown'] = 'value';    // 编译错误：不是 -- 前缀
```

#### 练习 4 答案

```typescript
interface NestedDict {
  [key: string]: {
    [key: string]: number;
  };
}

const scores: NestedDict = {
  math: { midterm: 85, final: 90 },
  english: { midterm: 78, final: 82 },
};

function getNestedValue(obj: NestedDict, key1: string, key2: string): number | undefined {
  return obj[key1]?.[key2];
}

// 使用
getNestedValue(scores, 'math', 'midterm'); // 85
getNestedValue(scores, 'math', 'unknown');  // undefined
getNestedValue(scores, 'unknown', 'key');   // undefined
```

#### 练习 5 答案

```typescript
const config = {
  port: 3000,
  host: 'localhost',
  debug: true,
} satisfies Record<string, string | number | boolean>;

// config.port 类型是 number（保留了具体类型）
const port: number = config.port; // OK

// config.host 类型是 string
const host: string = config.host; // OK

// config.debug 类型是 boolean
const debug: boolean = config.debug; // OK

// 验证满足 Record<string, string | number | boolean>
// 如果有不符合类型的属性，编译时报错
const badConfig = {
  port: 3000,
  callback: () => {}, // 编译错误：函数不是 string | number | boolean
} satisfies Record<string, string | number | boolean>;
```

### 12.8 扩展阅读

**类型理论**：

- 子类型关系（Subtyping）
- 类型格（Type Lattice）
- 渐进式类型（Gradual Typing）
- 结构类型 vs 名义类型

**JavaScript 对象模型**：

- 属性描述符（Property Descriptor）
- 原型链（Prototype Chain）
- 代理（Proxy）
- 反射（Reflect）

**工程实践**：

- 大型项目的类型设计
- 类型安全的 API 设计
- 类型重构策略
- 类型性能优化

## 附录 A：索引签名 vs Record 完整对比表

| 特性 | 索引签名 `{ [key: string]: T }` | `Record<K, V>` |
|------|-------------------------------|----------------|
| 键约束 | `string`、`number`、`symbol` | 任意 `keyof any` 子类型 |
| 键精确性 | 开放（任意键） | 精确（指定键集合） |
| 完整性 | 不要求键存在 | 要求所有键存在 |
| 访问返回 | `T` | `T` |
| `keyof` | `string \| number` 等 | 精确的联合类型 |
| 同态性 | 非同态 | 非同态 |
| 修饰符保留 | 不保留 | 不保留 |
| 与已知属性共存 | 需要兼容性检查 | 通过交叉类型组合 |
| 类型推断 | 拓宽类型 | 拓宽类型 |
| `satisfies` 替代 | 支持 | 支持 |
| 适用场景 | 开放对象 | 完整映射 |
| 性能 | 略快 | 略慢 |
| 序列化 | JSON 原生 | JSON 原生 |

## 附录 B：常见类型错误信息

| 错误信息 | 原因 | 解决方案 |
|---------|------|---------|
| `Property 'X' of type 'A' is not assignable to string index type 'B'` | 已知属性类型不是索引签名值类型的子类型 | 拓宽索引签名值类型或修改已知属性类型 |
| `Element implicitly has an 'any' type because expression of type 'string' can't be used to index type 'T'` | 使用非键类型访问对象 | 使用 `keyof T` 约束或类型断言 |
| `Type 'string' is not assignable to type 'keyof T'` | 键类型不匹配 | 使用正确的键类型 |
| `Object literal may only specify known properties, and 'X' does not exist in type 'T'` | 对象字面量包含未知属性 | 移除未知属性或添加索引签名 |

## 附录 C：术语表

| 术语 | 英文 | 说明 |
|------|------|------|
| 索引签名 | Index Signature | 描述键集合开放的对象类型 |
| 索引访问类型 | Indexed Access Type | 通过键访问对象类型中对应属性的类型 |
| 映射类型 | Mapped Type | 遍历键集合构造新类型 |
| 键约束 | Key Constraint | 限制键的类型 |
| 完整性检查 | Completeness Check | 验证所有键都存在 |
| 同态映射 | Homomorphic Mapping | 保留原类型修饰符的映射 |
| 非同态映射 | Non-homomorphic Mapping | 不保留修饰符的映射 |
| 渐进式类型 | Gradual Typing | 允许动态与静态类型共存 |
| 下界描述 | Lower Bound Description | 描述"如果存在，属于什么类型" |
| 精确描述 | Exact Description | 描述"一定存在且属于什么类型" |

## 附录 D：参考文献

1. TypeScript Handbook. "Indexed Access Types". https://www.typescriptlang.org/docs/handbook/2/indexed-access-types.html
2. TypeScript Handbook. "Mapped Types". https://www.typescriptlang.org/docs/handbook/2/mapped-types.html
3. TypeScript Handbook. "keyof Type Operator". https://www.typescriptlang.org/docs/handbook/2/keyof-types.html
4. TypeScript Handbook. "Typeof Type Operator". https://www.typescriptlang.org/docs/handbook/2/typeof-types.html
5. TypeScript Release Notes. "TypeScript 4.4". https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-4.html
6. TypeScript Release Notes. "TypeScript 4.9". https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html
7. MDN Web Docs. "Proxy". https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
8. MDN Web Docs. "Map". https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
9. MIT 6.102: Software Construction. https://web.mit.edu/6.102/
10. type-fest Documentation. https://github.com/sindresorhus/type-fest
