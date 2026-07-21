---
order: 57
title: 泛型约束与默认值
module: typescript
category: TypeScript
difficulty: intermediate
description: 泛型约束、默认类型参数与条件泛型
author: fanquanpp
updated: '2026-07-21'
related:
  - typescript/索引签名与动态属性
  - typescript/映射类型进阶
  - typescript/装饰器详解
  - typescript/声明文件编写
prerequisites:
  - typescript/语法速查
---

## 学习目标

本文按 Bloom 分类法逐层组织学习目标，使读者从机械记忆走向元认知创新。建议读者在阅读每一章节后，回头核对自己处在哪一层级，避免停留在"能写语法"而未达到"能设计 API"的层次。

### 1. 记忆层（Remember）

- 复述泛型约束 `T extends U` 的语法形式、`keyof` 约束的语义、默认类型参数 `T = D` 的位置约定。
- 列出 TypeScript 中至少 4 种约束形态：结构约束、字面量约束、`keyof` 约束、模板字面量约束。
- 默写条件泛型在分发条件下的两条规则：裸类型参数触发分发、被包裹（如元组、数组）则不分发。

### 2. 理解层（Understand）

- 用自己的语言解释"约束"在类型系统中所扮演的"保证契约"角色，并以一段 5 行内的代码说明若移除约束将导致哪些类型不安全。
- 解释 `T extends infer U ? X : Y` 中 `infer` 子句的作用，并对照运行时的 `try/catch` 说明二者的相似与差异。
- 在白板上画出"类型参数解析"与"运行时函数调用"的对照图，标注两者在何种意义下同构、在何种意义下不同构。

### 3. 应用层（Apply）

- 实现一个泛型函数 `pickByShape<T, Shape extends Partial<T>>(obj: T, shape: Shape)`，仅保留 `obj` 中与 `shape` 同名的键。
- 使用默认类型参数将一个三参数泛型改写为"主参数显式、辅参数省略"的形态，使调用方负担最小化。
- 为已有 API 包装一层"约束式校验器"，在不修改原函数签名的前提下增加类型约束。

### 4. 分析层（Analyze）

- 比较结构约束与名义约束在大型代码库中的可维护性差异，给出至少 3 条量化指标（重构影响面、IDE 跳转准确率、类型错误定位时长）。
- 拆解一段 50 行的复杂条件泛型，识别其中"分发点""推断点""递归点"，并标注每个点的复杂度贡献。
- 分析 `lib.d.ts` 中 `Promise.then`、`Array.flatMap`、`Record` 三者的约束结构，归纳 TypeScript 标准库设计约束的常见模式。

### 5. 评价层（Evaluate）

- 评判"为了类型安全而引入过度复杂约束"的合理性，提出至少 3 条决策准则。
- 评估一段第三方库的类型签名，指出其中冗余约束、可简化约束、潜在运行时不安全点，并给出改进方案。
- 在团队 Code Review 中，制定一份"泛型约束评审清单"，包含必查项、推荐项与红线项。

### 6. 创造层（Create）

- 设计一套适用于领域驱动设计（DDD）的"类型即规约"框架，使业务规则以约束形式表达并自动校验。
- 重构一个已有项目中的类型层，将隐式约束显式化、将散落约束聚合化，输出重构前后对比报告。
- 撰写一篇关于"泛型约束复杂度度量"的技术文章，提出度量指标并给出案例验证。

---

## 历史动机与背景

### 1. 泛型的诞生：从"复制粘贴"到"参数化多态"

在 Java 5（2004 年）正式引入泛型之前，Java 集合库中所有容器都存储 `Object`。开发者每次取值都需要强制类型转换，运行时一旦类型不符就抛出 `ClassCastException`。这一痛点被 Java 之父 Joshua Bloch 在《Effective Java》中反复提及，他将其称为"运行时错误的灾难性滞后"。

```java
// Java 1.4 时代的代码：类型不安全
List list = new ArrayList();
list.add("hello");
Integer num = (Integer) list.get(0); // 运行时抛出 ClassCastException
```

Java 5 的泛型引入了"参数化类型"概念，将类型检查从运行时前移到编译时。但 Java 的泛型采用"擦除式实现（Erasure）"，运行时无法保留类型参数信息，这导致了一系列限制：无法 `new T()`、无法 `T.class`、无法 `instanceof List<String>`。这一取舍背后的工程考量是"二进制兼容性"——让 Java 5 编译器能继续使用 Java 1.4 的字节码。

### 2. C# 与 .NET：真泛型与协变/逆变

C# 2.0（2005 年）同样引入泛型，但与 Java 不同，.NET CLR 在运行时真正保留了类型参数信息，称为"具化式泛型（Reified Generics）"。这使得 `new T()`、`T.class`、`typeof(T)` 都成为可能。C# 4.0（2010 年）进一步引入协变（`out`）与逆变（`in`）修饰符，使 `IEnumerable<out T>` 这样的接口能安全协变。

### 3. TypeScript 的取舍：结构化 + 擦除式

TypeScript 在 2012 年由 Anders Hejlsberg（同时也是 C# 与 Turbo Pascal 的设计者）主导设计。它面临一个独特约束：必须能编译为可读的 JavaScript ES3 代码，且不能引入运行时开销。因此 TypeScript 选择：

- **结构化类型系统**：与 C# 的名义类型不同，TS 采用"鸭子类型"——只要结构兼容就算同类型。这使得泛型约束天然支持"形状匹配"。
- **类型擦除**：所有类型信息在编译后被擦除，运行时纯 JS。这使得 `new T()`、`instanceof T` 都不可能。
- **零运行时开销**：与 Java 擦除类似但更彻底，连"类型检查"也不在运行时执行。

在这一设计下，**泛型约束**承担了"在不引入运行时开销的前提下保证类型安全"的全部责任。一个 `T extends Comparable<T>` 的约束，编译期会被静态检查，运行时则被完全擦除。

### 4. 默认类型参数的引入动机

默认类型参数（TypeScript 2.3，2017 年）解决了"泛型参数过多导致调用方负担"的问题。例如 `React.Component<P, S>` 中的 `S`（state）多数情况下是 `{}`，让每个调用方都写 `React.Component<Props, {}>` 显得冗余。引入默认值后：

```typescript
// TS 2.3 之前
class Component<P, S> { /* ... */ }
class MyComp extends Component<MyProps, {}> { /* ... */ }

// TS 2.3 之后
class Component<P, S = {}> { /* ... */ }
class MyComp extends Component<MyProps> { /* ... */ }
```

这一特性极大降低了泛型 API 的使用门槛，是 TypeScript 工程化的关键一步。

### 5. 条件泛型与 `infer`：类型级编程的黎明

TypeScript 2.8（2018 年）引入条件类型与 `infer` 关键字，是类型系统演化的里程碑。在这之前，TS 类型系统主要是"声明式"的——你写什么类型，TS 就检查什么。条件类型使其具备了"计算式"能力：

```typescript
type IsString<T> = T extends string ? true : false;
type A = IsString<"hello">; // true
type B = IsString<42>;      // false
```

`infer` 关键字则允许在条件类型中"提取"子类型，类似于运行时的解构：

```typescript
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;
type R = ReturnType<() => string>; // string
```

这两个特性共同催生了"类型体操（Type Gymnastics）"社区，使得 TS 类型系统达到了图灵完备的边缘。本文将聚焦于条件泛型的工程价值而非花式技巧。

---

## 形式化定义

### 1. 泛型函数的数学形式化

设类型系统 $\mathcal{T}$ 为所有类型的集合，类型构造器 $\Gamma : \mathcal{T}^n \to \mathcal{T}$ 将 $n$ 个类型参数映射为一个新类型。一个泛型函数 $f$ 的类型可形式化为：

$$
f : \forall \alpha_1, \alpha_2, \ldots, \alpha_n \in \mathcal{T}.\, (T_1[\alpha], T_2[\alpha], \ldots, T_k[\alpha]) \to T_{\text{ret}}[\alpha]
\]

其中 $\alpha = (\alpha_1, \ldots, \alpha_n)$ 为类型参数向量，$T_i[\alpha]$ 表示依赖 $\alpha$ 的第 $i$ 个参数类型。

### 2. 泛型约束的形式化

约束 $C$ 是类型参数 $\alpha$ 上的一阶谓词，即 $C : \mathcal{T} \to \{0, 1\}$。带约束的泛型函数记作：

$$
f : \forall \alpha \in \mathcal{T}.\, C(\alpha) \Rightarrow (T_1[\alpha] \to T_{\text{ret}}[\alpha])
$$

读作"对任意类型 $\alpha$，若 $\alpha$ 满足约束 $C$，则 $f$ 接受 $T_1[\alpha]$ 类型的参数并返回 $T_{\text{ret}}[\alpha]$ 类型"。

在 TypeScript 中，最常见的约束形式是"子类型约束"：$C(\alpha) \iff \alpha <: U$，记作 `T extends U`。这里 $<:$ 是子类型关系，定义为：

$$
\alpha <: U \iff \forall v : \alpha.\, v \text{ 可被当作 } U \text{ 使用}
$$

对于结构化类型系统，子类型关系等价于结构包含关系：

$$
\alpha <: U \iff \text{Props}(U) \subseteq \text{Props}(\alpha) \land \forall p \in \text{Props}(U).\, \text{Type}(\alpha.p) <: \text{Type}(U.p)
$$

### 3. `keyof` 约束的形式化

`keyof T` 是类型 $T$ 所有属性键的联合类型，形式化为：

$$
\text{keyof}\, T = \bigcup_{p \in \text{Props}(T)} \{p\}
$$

`K extends keyof T` 约束表示 $K \in \mathcal{P}(\text{keyof}\, T)$，即 $K$ 是 $T$ 的属性键集合的某个子集。

### 4. 默认类型参数的形式化

带默认值的类型参数可形式化为"部分应用"：

$$
\Gamma(\alpha_1, \alpha_2, \ldots, \alpha_n) \text{ 其中 } \alpha_i = D_i \text{ 若未提供}
$$

这等价于一个部分函数 $\Gamma' : \mathcal{T}^{n-k} \to \mathcal{T}$，其中 $k$ 是有默认值的参数个数。从 $\lambda$ 演算角度看，默认值是 $\eta$ 归约的一种便利记法：

$$
\lambda \alpha_1 \ldots \alpha_n.\, \Gamma(\alpha_1, \ldots, \alpha_n) \equiv \lambda \alpha_1 \ldots \alpha_{n-k}.\, \Gamma(\alpha_1, \ldots, \alpha_{n-k}, D_{n-k+1}, \ldots, D_n)
$$

### 5. 条件泛型的形式化

条件泛型 `T extends U ? X : Y` 形式化为类型级函数：

$$
\text{Cond}(T, U, X, Y) = \begin{cases} X & \text{if } T <: U \\ Y & \text{otherwise} \end{cases}
$$

当 $T$ 是裸类型参数（naked type parameter）且实参为联合类型 $T = A \cup B$ 时，触发"分发"：

$$
\text{Cond}(A \cup B, U, X, Y) = \text{Cond}(A, U, X, Y) \cup \text{Cond}(B, U, X, Y)
$$

数学上这是"条件函数关于联合类型的分配律"。注意：当 $T$ 被"包裹"（如 `[T]` 或 `T[]`）时，分发被抑制，相当于条件函数成为非线性的。

### 6. `infer` 子句的形式化

`infer U` 在条件类型中引入一个存在量化的类型变量：

$$
\text{Cond}(T, U[\beta], X, Y) = \begin{cases} X[\beta := \beta_0] & \text{if } \exists \beta_0.\, T = U[\beta_0] \\ Y & \text{otherwise} \end{cases}
$$

其中 $U[\beta]$ 是包含未知类型 $\beta$ 的模式类型，$\beta_0$ 是通过合一（unification）得到的解。`infer` 的本质是类型级的"模式匹配 + 解构"。

---

## 理论推导

### 1. 子类型关系的传递性与约束链

定理（约束传递性）：若 $T <: U$ 且 $U <: V$，则 $T <: V$。

证明：对任意 $v : T$，由 $T <: U$ 知 $v$ 可当作 $U$ 使用，即 $v : U$。再由 $U <: V$ 知 $v$ 可当作 $V$ 使用，即 $v : V$。故 $T <: V$。$\square$

推论：约束链 `T extends U extends V` 等价于 `T extends V`，但前者表达更精确的"中间类型"，常用于 API 文档化。

### 2. 约束复杂度分析

设类型参数 $\alpha$ 上有 $k$ 个约束 $C_1, \ldots, C_k$，每个约束的"结构复杂度"为 $s_i$（以类型节点数衡量）。约束检查的总复杂度为：

$$
T_{\text{check}} = O\left(\sum_{i=1}^{k} s_i\right)
$$

对于深度为 $d$ 的递归类型约束（如 `DeepReadonly<T>`），约束展开次数为 $O(b^d)$，其中 $b$ 是平均分支因子。这就是为什么 TS 编译器对深度递归类型有"实例化深度限制"（默认 100 层）。

### 3. 默认类型参数的解析顺序

默认参数的解析遵循"左到右、可省略末尾"规则。形式化地，对于 $\Gamma(\alpha_1, \alpha_2, \alpha_3 = D_3, \alpha_4 = D_4)$：

- $\Gamma(A, B)$ 解析为 $\Gamma(A, B, D_3, D_4)$
- $\Gamma(A, B, C)$ 解析为 $\Gamma(A, B, C, D_4)$
- $\Gamma(A, B, , D)$ ❌ 不允许跳过中间参数

这与 Python 函数默认参数的"前缀必填、后缀可省"规则一致，背后的代数原理是函数参数的"柯里化"友好性。

### 4. 分发型条件类型的复杂度

对于联合类型 $T = A_1 \cup A_2 \cup \ldots \cup A_n$，分发型条件类型 `T extends U ? X : Y` 的计算复杂度为：

$$
T_{\text{distribute}} = O(n \cdot S_{\text{match}}(U))
$$

其中 $S_{\text{match}}(U)$ 是单次子类型匹配的复杂度。当 $n$ 较大（如 100+）时，TS 编译器会显著变慢。一种优化策略是"封装以抑制分发"：

```typescript
// 分发型：复杂度 O(n)
type IsString<T> = T extends string ? true : false;
type R1 = IsString<A | B | C | ...>; // 慢

// 非分发型：复杂度 O(1)
type IsStringNoDistribute<T> = [T] extends [string] ? true : false;
type R2 = IsStringNoDistribute<A | B | C | ...>; // 快
```

### 5. `infer` 的合一算法

`infer U` 的解析依赖 Robinson 合一算法（Robinson, 1965）。给定模式类型 $P$（含 `infer` 占位符）与目标类型 $T$，合一过程为：

1. 若 $P = U$（`infer` 占位符），返回 $\{U \mapsto T\}$。
2. 若 $P = P_1 \to P_2$ 且 $T = T_1 \to T_2$，递归合一 $P_1$ 与 $T_1$、$P_2$ 与 $T_2$，合并替换。
3. 若 $P = (P_1, P_2)$（元组）且 $T = (T_1, T_2)$，类似处理。
4. 其他情况，合一失败。

最坏复杂度为指数级，但 TS 编译器通过深度限制（默认 5）与缓存优化使其在实际场景下保持线性对数级。

### 6. 约束满足的可判定性

定理（约束满足的可判定性）：在 TS 类型系统中，给定类型 $T$ 与约束 $C$，判断 $T \models C$ 是否可满足，在最一般情况下是不可判定的。但 TS 通过以下限制使判定在实践中可解：

- 递归深度限制（避免无限展开）
- 不支持高阶类型（避免二阶合一）
- 不支持类型级不动量（避免停机问题归约）

这些限制使得 TS 类型系统近似于"复杂度可控的、可判定的子系统"，但代价是无法表达某些高级类型（如 Haskell 的 `Functor` 类型类）。

---

## 代码示例

### 示例 1：基础泛型约束

```typescript
// 约束：T 必须有 length 属性
// 编译期：检查传入类型是否有 length: number 字段
// 运行期：约束被擦除，仅保留函数逻辑
function logLength<T extends { length: number }>(arg: T): T {
  console.log(`Length: ${arg.length}`);
  return arg;
}

logLength("hello");      // OK：string 有 length: number
logLength([1, 2, 3]);    // OK：array 有 length: number
logLength({ length: 10 }); // OK：自定义结构兼容
// logLength(42);        // 编译错误：number 无 length 属性

// 工程价值：API 文档化"接受任何有 length 的对象"，避免硬编码 string | any[]
```

### 示例 2：`keyof` 约束与属性访问

```typescript
// K 必须是 T 的属性键
// 类型级保证：obj[key] 不会返回 undefined（除非 T 显式声明可选）
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { name: "Alice", age: 30, email: "alice@example.com" };

const name = getProperty(user, "name");   // 类型推断为 string
const age = getProperty(user, "age");     // 类型推断为 number
// getProperty(user, "phone");           // 编译错误：'phone' 不在 keyof user 中

// 进阶：属性赋值的类型安全
function setProperty<T, K extends keyof T>(obj: T, key: K, value: T[K]): T {
  return { ...obj, [key]: value };
}

const updated = setProperty(user, "age", 31);       // OK
// setProperty(user, "age", "31");                  // 编译错误：string 不能赋给 number
// setProperty(user, "name", 123);                  // 编译错误：number 不能赋给 string
```

### 示例 3：多重约束

```typescript
// T 必须同时满足两个约束
interface HasId {
  id: string;
}
interface HasName {
  name: string;
}

// 使用交叉类型表达"与"约束
function mergeEntities<T extends HasId & HasName>(a: T, b: T): T {
  return { ...a, ...b };
}

// 工程应用：通用 CRUD 仓库基类
interface Repository<T extends HasId & HasName> {
  findById(id: string): Promise<T | null>;
  findByName(name: string): Promise<T[]>;
  save(entity: T): Promise<void>;
}

class UserRepository implements Repository<{ id: string; name: string; email: string }> {
  // 实现省略
}
```

### 示例 4：默认类型参数

```typescript
// React.Component 风格的默认类型参数
interface Component<P = {}, S = {}> {
  props: P;
  state: S;
  setState(next: Partial<S>): void;
}

// 调用方仅指定必要参数
class Header implements Component<{ title: string }> {
  props = { title: "Welcome" };
  state = {};  // S 默认为 {}
  setState(next: Partial<{}>) { /* ... */ }
}

// 数据库连接配置：必填 + 可选默认
interface DBConfig<THost = string, TPort = number> {
  host: THost;
  port: TPort;
}

const cfg1: DBConfig = { host: "localhost", port: 5432 };
const cfg2: DBConfig<"db.prod.com"> = { host: "db.prod.com", port: 5432 };
```

### 示例 5：条件泛型基础

```typescript
// 分发型条件类型
type IsString<T> = T extends string ? true : false;
type IsNumber<T> = T extends number ? true : false;

type A1 = IsString<"hello">;  // true
type A2 = IsString<42>;       // false
type A3 = IsString<string | number>; // true | false -> boolean

// 抑制分发：用元组包裹
type IsStringNoDistribute<T> = [T] extends [string] ? true : false;
type A4 = IsStringNoDistribute<string | number>; // false（整体匹配失败）

// 工程场景：API 响应类型推断
type ApiResponse<T> = T extends string
  ? { body: string }
  : T extends number
  ? { body: number; unit?: string }
  : { body: unknown };

const r1: ApiResponse<"text"> = { body: "text" };
const r2: ApiResponse<42> = { body: 42, unit: "px" };
const r3: ApiResponse<{ x: number }> = { body: { x: 1 } };
```

### 示例 6：`infer` 提取函数返回值与参数

```typescript
// 提取返回类型
type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

// 提取第一个参数类型
type FirstParam<T> = T extends (first: infer P, ...rest: any[]) => any ? P : never;

// 提取 Promise 内部类型
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

// 提取数组元素类型
type ElementType<T> = T extends (infer E)[] ? E : never;

// 工程应用：从 API 函数签名自动生成响应类型
declare function getUser(id: string): Promise<{ id: string; name: string }>;
type GetUserResponse = UnwrapPromise<MyReturnType<typeof getUser>>;
// 等价于 { id: string; name: string }

// 工程应用：构造函数实例类型
type InstanceType<T extends new (...args: any[]) => any> = T extends new (...args: any[]) => infer I ? I : never;

class Foo { x = 1; }
type FooInstance = InstanceType<typeof Foo>; // Foo
```

### 示例 7：递归条件类型

```typescript
// 深度只读
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};

// 深度可变（反转 DeepReadonly）
type DeepMutable<T> = {
  -readonly [K in keyof T]: T[K] extends object ? DeepMutable<T[K]> : T[K];
};

// 深度可选
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

// 应用：配置默认值合并
type Config = {
  server: { host: string; port: number };
  cache: { ttl: number; enabled: boolean };
};

const partial: DeepPartial<Config> = {
  server: { host: "localhost" }, // port 可省略
};

// 工程价值：表单状态、配置覆盖、不可变状态更新
```

### 示例 8：约束与映射类型组合

```typescript
// 仅保留函数类型的属性
type FunctionKeys<T> = {
  [K in keyof T]: T[K] extends Function ? K : never
}[keyof T];

// 仅保留非函数属性
type NonFunctionKeys<T> = {
  [K in keyof T]: T[K] extends Function ? never : K
}[keyof T];

class Example {
  name = "test";
  count = 0;
  greet() {}
  compute() {}
}

type ExMethods = FunctionKeys<Example>;    // "greet" | "compute"
type ExFields = NonFunctionKeys<Example>;  // "name" | "count"

// 工程应用：自动区分"数据字段"与"方法"，用于序列化
function serializeFields<T>(obj: T): Pick<T, NonFunctionKeys<T>> {
  const result: any = {};
  (Object.keys(obj) as NonFunctionKeys<T>[]).forEach(key => {
    if (typeof (obj as any)[key] !== "function") {
      result[key] = obj[key];
    }
  });
  return result;
}
```

### 示例 9：条件泛型与默认值组合

```typescript
// 依据输入类型选择存储策略
type StorageStrategy<T> = T extends string
  ? { type: "string"; value: T }
  : T extends number
  ? { type: "number"; value: T }
  : T extends object
  ? { type: "json"; value: string } // 对象序列化为字符串
  : { type: "unknown"; value: unknown };

// 默认类型参数：当未指定时使用 string
class TypedStorage<T = string> {
  private data: StorageStrategy<T> | null = null;
  set(value: T) {
    // 运行时按类型选择存储格式
    if (typeof value === "string") {
      this.data = { type: "string", value } as any;
    } else if (typeof value === "number") {
      this.data = { type: "number", value } as any;
    } else if (typeof value === "object") {
      this.data = { type: "json", value: JSON.stringify(value) } as any;
    }
  }
  get(): T | null {
    if (!this.data) return null;
    switch (this.data.type) {
      case "string": return this.data.value as T;
      case "number": return this.data.value as T;
      case "json": return JSON.parse(this.data.value) as T;
      default: return null;
    }
  }
}

// 调用：T 推断为 string
const s1 = new TypedStorage();  // 默认 string
s1.set("hello");
// 调用：显式指定 number
const s2 = new TypedStorage<number>();
s2.set(42);
```

### 示例 10：约束递归与深度限制

```typescript
// 安全的深度类型递归：Tuple 类型转对象
type TupleToObject<T extends readonly any[]> = {
  [K in keyof T]: T[K];
};

// 数字递增（Peano 数表示）
type Increment<N extends number, Acc extends any[] = []> = 
  Acc["length"] extends N 
    ? [...Acc, any]["length"]
    : Increment<N, [...Acc, any]>;

type One = Increment<0>;   // 1
type Two = Increment<1>;   // 2
type Five = Increment<4>;  // 5

// 工程警示：递归深度限制
// TS 默认递归深度上限约 1000，超出会报 "Type instantiation is excessively deep"
// 实际工程中应避免用类型做"计算"，而用类型做"约束"
```

---

## 对比分析

### 1. TypeScript 与 Java/C# 泛型对比

| 特性 | TypeScript | Java | C# |
| :--- | :--- | :--- | :--- |
| 类型系统 | 结构化 | 名义 | 名义 |
| 类型擦除 | 完全擦除 | 擦除（带反射补丁） | 具化 |
| 运行时类型信息 | 无 | 部分（`TypeToken`） | 完整 |
| `new T()` | 不支持 | 不支持 | 支持 |
| `instanceof T` | 不支持 | 不支持 | 支持 |
| 协变/逆变 | 通过条件类型模拟 | 数组协变（不安全） | `out`/`in` 修饰符 |
| 默认类型参数 | 支持（TS 2.3+） | 不支持 | 支持 |
| 高阶类型 | 不支持 | 不支持 | 不支持（F# 支持） |
| 约束表达力 | 结构约束 | 名义约束 + `extends` | 名义约束 + `where` |

**论述**：

TypeScript 的结构化约束是其最大优势也是最大风险的来源。优势在于"鸭子类型友好"——任何满足形状的对象都能匹配约束，无需显式 `implements`。风险在于"假阳性"——一个恰好有 `id: string` 字段的对象会被 `T extends HasId` 接受，即使语义上不是实体。Java/C# 的名义约束避免了假阳性，但增加了模板代码与重构成本。

### 2. 默认类型参数 vs 函数重载

```typescript
// 方案 A：默认类型参数
function fetch1<T = unknown>(url: string): Promise<T> { /* ... */ return null as any; }

// 方案 B：函数重载
function fetch2(url: string): Promise<unknown>;
function fetch2<T>(url: string, parser: (raw: unknown) => T): Promise<T>;
function fetch2(url: string, parser?: (raw: unknown) => unknown): Promise<unknown> { /* ... */ return null as any; }

// 使用
const a = fetch1<string>("/api");          // 默认参数方案
const b = fetch2<string>("/api", JSON.parse); // 重载方案
```

| 维度 | 默认参数 | 函数重载 |
| :--- | :--- | :--- |
| 调用简洁性 | 高 | 中 |
| 类型推断准确 | 中（默认值影响推断） | 高（每条重载独立） |
| 运行时分支 | 单一实现 | 多实现选择 |
| 文档化能力 | 弱 | 强 |
| IDE 提示 | 单签名 | 多签名轮播 |

**结论**：默认参数适合"主要参数显式、辅助参数省略"场景；重载适合"不同输入对应不同输出"场景。

### 3. 条件泛型 vs 函数重载

```typescript
// 方案 A：条件类型（编译期分发）
type ProcessResult<T> = T extends string ? string[] : T extends number ? number : never;
function processA<T>(input: T): ProcessResult<T> {
  if (typeof input === "string") return input.split("") as any;
  return input as any;
}

// 方案 B：函数重载
function processB(input: string): string[];
function processB(input: number): number;
function processB(input: string | number): string[] | number {
  if (typeof input === "string") return input.split("");
  return input;
}
```

| 维度 | 条件类型 | 重载 |
| :--- | :--- | :--- |
| 类型推导精度 | 高（每调用点独立计算） | 高 |
| 实现复杂度 | 单一实现 | 多签名+实现 |
| 可读性 | 中（条件类型难读） | 高（直观） |
| 可维护性 | 中（修改条件易遗漏） | 高（每签名独立） |
| 与泛型组合 | 强（天然支持泛型） | 中（每泛型组合需新签名） |

### 4. `infer` vs 显式类型参数

```typescript
// 方案 A：infer 推导
type ReturnTypeA<T> = T extends (...args: any[]) => infer R ? R : never;

// 方案 B：显式参数
declare function callWith<R>(fn: () => R): R;
// 调用方必须显式指定 R 或依赖函数返回值推断
```

**论述**：`infer` 适合"从一个已有类型中提取子结构"，显式参数适合"调用方主动提供类型"。前者是"被动提取"，后者是"主动注入"。

---

## 常见陷阱与反模式

### 陷阱 1：约束过宽导致类型不安全

**反例**：

```typescript
// 反例：用 any 作为约束等价物
function badGet<T>(obj: any, key: string): any {
  return obj[key];
}
```

**问题**：约束完全失效，编译期无法发现拼写错误，运行时返回 `undefined` 也无感知。

**正例**：

```typescript
function goodGet<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
```

**生产事故案例**：某电商网站因 `badGet(user, "phnoe")`（拼写错误）返回 `undefined`，后续代码假设返回 string 调用 `.split("")`，运行时抛出 `TypeError`，导致首页白屏 30 分钟。事故根因分析显示：若使用 `goodGet`，编译期即可发现 `phnoe` 不在 `keyof User` 中。

### 陷阱 2：约束过严导致 API 不可用

**反例**：

```typescript
// 反例：约束要求精确类型，导致泛型失去意义
function onlyString<T extends "hello">(arg: T): T {
  return arg;
}
onlyString("hello"); // OK
// onlyString("world"); // 编译错误，但语义上完全合理
```

**问题**：将"具体值约束"误用为"类型约束"，使得函数失去通用性。

**正例**：

```typescript
function onlyString<T extends string>(arg: T): T {
  return arg;
}
```

### 陷阱 3：默认参数顺序错误

**反例**：

```typescript
// 反例：默认参数在前，必填参数在后
interface Bad<T = string, U> {  // 编译错误
  a: T;
  b: U;
}
```

**问题**：与函数默认值规则一致，默认参数必须在末尾。

**正例**：

```typescript
interface Good<T, U = string> {
  a: T;
  b: U;
}
```

### 陷阱 4：分发型条件类型意外行为

**反例**：

```typescript
type IsArray<T> = T extends any[] ? true : false;

type R = IsArray<string | number>; // 期望 false，实际 true | false = boolean
```

**问题**：分发导致联合类型每个成员独立判断，结果联合化。

**正例**：

```typescript
type IsArray<T> = [T] extends [any[]] ? true : false;
type R = IsArray<string | number>; // false，整体判断
```

**生产事故案例**：某 SDK 用 `IsArray<T>` 判断响应是否为数组以决定走批量处理分支。当响应类型被错误标注为 `string | string[]` 时，分发结果为 `boolean`，被误判为 true，导致单条数据走批量分支，触发后端批量接口限流。

### 陷阱 5：`infer` 与重载函数

**反例**：

```typescript
type OverloadedReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

function overloaded(x: string): string;
function overloaded(x: number): number;
function overloaded(x: any): any { return x; }

type R = OverloadedReturnType<typeof overloaded>; // 推断为 string，丢失了 number 重载
```

**问题**：`infer` 只匹配最后一个签名，前几个重载签名被忽略。

**正例**：

```typescript
// 显式联合化重载签名
type AllReturnTypes<T> = T extends {
  (...args: infer A1): infer R1;
  (...args: infer A2): infer R2;
} ? R1 | R2 : never;
```

### 陷阱 6：递归约束导致编译超时

**反例**：

```typescript
// 反例：无限递归
type Infinite<T> = T extends [infer A, ...infer B] ? Infinite<B> : never;
type R = Infinite<[1, 2, 3]>; // 编译器 hang 或报深度错误
```

**问题**：缺少终止条件，递归无限展开。

**正例**：

```typescript
type Finite<T extends any[]> = T extends [infer A, ...infer B] ? A | Finite<B> : never;
type R = Finite<[1, 2, 3]>; // 1 | 2 | 3
```

### 陷阱 7：约束与运行时不一致

**反例**：

```typescript
// 反例：约束声明是 number，运行时却是 string
interface Result { code: number; }
const data: Result = JSON.parse('{"code": "500"}'); // 运行时 code 是 string

data.code.toFixed(2); // 编译通过，运行时抛 TypeError
```

**问题**：JSON.parse 返回 any，赋值给 Result 后类型被"假装"满足，但运行时数据不匹配。

**正例**：

```typescript
import ajv from "ajv";

const schema = { type: "object", properties: { code: { type: "number" } }, required: ["code"] };
const validator = new ajv().compile(schema);

function parseSafe<T>(raw: unknown, validate: (x: unknown) => boolean): T {
  if (!validate(raw)) throw new Error("Invalid data");
  return raw as T;
}

const data = parseSafe<Result>(JSON.parse('{"code": "500"}'), validator); // 抛错
```

### 陷阱 8：约束链断裂导致类型推断失败

**反例**：

```typescript
function badChain<T extends U, U>(a: T, b: U): T {
  return a;
}
badChain(1, "hello"); // T 推断为 1，U 推断为 string，1 extends string 失败
```

**问题**：约束方向错误，T 应是 U 的子类型，但参数顺序导致 U 反向约束 T。

**正例**：

```typescript
function goodChain<T, U extends T>(a: T, b: U): T {
  return a;
}
goodChain("hello", "world"); // T 推断为 string，U 推断为 "world"，OK
```

---

## 工程实践

### 1. 约束设计原则

**原则 1：约束最小化**

约束应只包含函数逻辑所必需的字段。例如：

```typescript
// 差：约束过宽，调用方负担重
function badSort<T extends { id: string; name: string; age: number; email: string }>(arr: T[]): T[] {
  return arr.slice().sort((a, b) => a.name.localeCompare(b.name));
}

// 好：约束仅含必要字段
function goodSort<T extends { name: string }>(arr: T[]): T[] {
  return arr.slice().sort((a, b) => a.name.localeCompare(b.name));
}
```

**原则 2：约束文档化**

约束应通过接口名与注释清晰表达意图：

```typescript
/** 实体接口：表示具有唯一标识的领域对象 */
interface Entity {
  id: string;
}

/** 命名接口：表示有可读名称的对象 */
interface Nameable {
  name: string;
}

/** 时序接口：表示有创建时间的对象 */
interface Timestamped {
  createdAt: Date;
}

// 复合约束通过交叉类型表达
type AuditableEntity = Entity & Nameable & Timestamped;

function logEntity<T extends AuditableEntity>(e: T): void {
  console.log(`[${e.createdAt.toISOString()}] ${e.name} (${e.id})`);
}
```

**原则 3：约束与默认值组合降低使用成本**

```typescript
// 默认值让 90% 调用方无需指定类型
class Repository<T extends Entity = Entity> {
  async findById(id: string): Promise<T | null> { /* ... */ return null; }
}

// 默认调用：使用 Entity 默认值
const repo1 = new Repository();
// 显式调用：指定具体实体类型
const repo2 = new Repository<User>();
```

### 2. 性能优化策略

**策略 1：抑制不必要的分发**

```typescript
// 慢：分发，复杂度 O(n)
type SlowIsString<T> = T extends string ? true : false;
type R1 = SlowIsString<A | B | C | D | E | F | G>; // 7 次匹配

// 快：整体判断，复杂度 O(1)
type FastIsString<T> = [T] extends [string] ? true : false;
type R2 = FastIsString<A | B | C | D | E | F | G>; // 1 次匹配
```

**策略 2：缓存类型计算结果**

```typescript
// 用 type 别名缓存复杂计算
type CachedReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

// 多次使用时引用缓存而非重复计算
declare function fn1(): string;
declare function fn2(): number;
type R1 = CachedReturnType<typeof fn1>; // 计算一次
type R2 = CachedReturnType<typeof fn2>; // 计算一次
```

**策略 3：限制递归深度**

```typescript
// 危险：无限递归风险
type DeepChain<T> = T extends [infer A, ...infer B] ? DeepChain<B> : never;

// 安全：显式终止 + 深度限制
type DeepChain<T, Depth extends number = 10> = 
  Depth extends 0 ? never :
  T extends [infer A, ...infer B] ? A | DeepChain<B, Decrement<Depth>> : never;
```

**策略 4：约束声明前置**

```typescript
// 差：约束在最后，IDE 提示需滚动
function badFetch<T>(url: string, options?: RequestInit): Promise<T> { /* ... */ return null as any; }

// 好：约束前置，签名一目了然
function goodFetch<T>(url: string, options?: RequestInit): Promise<T> { /* ... */ return null as any; }
// 两者等价，但工程中推荐将约束写在第一个泛型参数上以提升可读性
```

### 3. 测试策略

**类型级测试**：

```typescript
import { expectType } from "tsd";

// 测试条件类型计算结果
type IsString<T> = T extends string ? true : false;
expectType<true>({} as IsString<"hello">);
expectType<false>({} as IsString<42>);

// 测试约束拒绝
// @ts-expect-error - 期望编译错误
const x: IsString<42> = true; // 应该报错，因为 IsString<42> 是 false

// 测试默认值
interface Default<T = string> { value: T; }
expectType<string>({} as Default["value"]);
```

**运行时测试**：

```typescript
// 约束仅编译期有效，运行时需独立测试
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

describe("getProperty", () => {
  it("返回正确值", () => {
    const obj = { a: 1, b: "x" };
    expect(getProperty(obj, "a")).toBe(1);
    expect(getProperty(obj, "b")).toBe("x");
  });
  it("对原型链上的属性也能访问", () => {
    class C { method() {} }
    const c = new C();
    expect(typeof getProperty(c, "method")).toBe("function");
  });
});
```

### 4. 与运行时校验组合

约束只能保证编译期类型安全，运行时仍需校验外部数据：

```typescript
import { z } from "zod";

// 约束定义
interface User {
  id: string;
  name: string;
  age: number;
}

// 运行时校验
const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  age: z.number().int().min(0).max(150),
});

// 类型安全的解析函数
function parseUser<T>(raw: unknown, schema: z.ZodSchema<T>): T {
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Validation failed: ${result.error.message}`);
  }
  return result.data;
}

// 约束确保 parseUser 返回类型与 schema 一致
const user = parseUser(JSON.parse('{"id":"...","name":"Alice","age":30}'), UserSchema);
// user: User
```

### 5. IDE 与工具链配置

**tsconfig.json 推荐配置**：

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

**ESLint 推荐规则**：

```json
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unsafe-assignment": "error",
    "@typescript-eslint/no-unsafe-member-access": "error",
    "@typescript-eslint/no-unsafe-call": "error",
    "@typescript-eslint/no-unsafe-return": "error",
    "@typescript-eslint/no-unsafe-argument": "error",
    "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
    "@typescript-eslint/no-empty-interface": "error",
    "@typescript-eslint/no-inferrable-types": "error",
    "@typescript-eslint/no-unused-vars": "error"
  }
}
```

### 6. 渐进式迁移策略

对于已有 JavaScript 项目，渐进式引入约束：

**第 1 步**：在核心数据模型上加约束

```typescript
// types.ts
export interface User { id: string; name: string; }
export interface Product { id: string; price: number; }

// utils.ts
export function findById<T extends { id: string }>(arr: T[], id: string): T | undefined {
  return arr.find(x => x.id === id);
}
```

**第 2 步**：在 API 边界加约束

```typescript
// api.ts
export async function getUser(id: string): Promise<User> {
  const res = await fetch(`/api/users/${id}`);
  return res.json();
}
```

**第 3 步**：在业务逻辑层加约束

```typescript
// service.ts
export class UserService<TUser extends User = User> {
  constructor(private repo: Repository<TUser>) {}
  async getProfile(id: string): Promise<TUser> {
    const user = await this.repo.findById(id);
    if (!user) throw new Error("User not found");
    return user;
  }
}
```

---

## 案例研究

### 案例 1：React 表单库的类型设计

以 `react-hook-form` 为例，其核心泛型约束设计：

```typescript
// 简化版：react-hook-form 的核心类型
type FieldValues = Record<string, any>;

interface FieldPath<TFieldValues extends FieldValues> extends String {
  // 模板字面量约束：路径必须是 TFieldValues 的合法字段路径
}

type FieldPathValue<
  TFieldValues extends FieldValues,
  TPath extends FieldPath<TFieldValues>
> = TPath extends `${infer Key}.${infer Rest}`
  ? Key extends keyof TFieldValues
    ? FieldPathValue<TFieldValues[Key], Rest & string>
    : never
  : TPath extends keyof TFieldValues
  ? TFieldValues[TPath]
  : never;

// 使用
interface FormData {
  user: { name: string; age: number };
  email: string;
}

const path = "user.name" as FieldPath<FormData>;
type ValueType = FieldPathValue<FormData, typeof path>; // string

// 工程价值：表单字段路径与值类型严格绑定，避免拼写错误与类型不匹配
```

**设计要点**：

- `TFieldValues extends FieldValues` 约束确保传入的是"字段映射"，而非任意类型。
- `FieldPath` 用模板字面量类型 + 条件递归实现"嵌套路径"约束，编译期校验路径合法性。
- `FieldPathValue` 用 `infer` 提取路径对应字段的值类型，使 `register("user.name")` 自动推断为 string。

**可改进点**：

- 字段路径约束复杂度高，深度嵌套（>5 层）时编译变慢。
- 不支持数组索引路径（如 `users[0].name`），需要自定义扩展。

### 案例 2：tRPC 的端到端类型安全

tRPC 通过约束实现"前后端类型同步"：

```typescript
// 后端：路由定义
const router = t.router({
  user: t.router({
    get: t.procedure
      .input(z.object({ id: z.string() }))
      .output(z.object({ id: z.string(), name: z.string() }))
      .query(async ({ input }) => {
        return { id: input.id, name: "Alice" };
      }),
  }),
});

type RouterType = typeof router;

// 前端：类型安全的客户端
const client = createTRPCClient<RouterType>({ url: "/api" });

// 调用：路径与参数都有类型检查
const user = await client.user.get.query({ id: "1" });
// user: { id: string; name: string }

// 编译错误：路径不存在
// await client.user.delete.mutate({});

// 编译错误：参数类型不匹配
// await client.user.get.query({ id: 123 });
```

**约束设计分析**：

- `createTRPCClient<RouterType>` 用 `RouterType` 作为约束，使客户端类型与后端路由定义同步。
- 路径调用 `client.user.get.query` 通过映射类型递归生成，每一级都有类型约束。
- 参数类型从 Zod schema 推断，与运行时校验同源。

**生产部署效果**：某团队引入 tRPC 后，前后端 API 接口不一致的 bug 减少 80%，接口联调时间从平均 2 天降到 0.5 天。

### 案例 3：Prisma 的类型生成

Prisma 通过 schema 文件生成强类型客户端：

```prisma
// schema.prisma
model User {
  id    String  @id @default(uuid())
  name  String
  email String  @unique
  posts Post[]
}

model Post {
  id       String @id @default(uuid())
  title    String
  authorId String
  author   User   @relation(fields: [authorId], references: [id])
}
```

```typescript
// 自动生成的类型
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 查询：where 子句的字段与操作符都有类型约束
const users = await prisma.user.findMany({
  where: { name: { contains: "Ali" } },
  include: { posts: true },
});
// users: (User & { posts: Post[] })[]

// 编译错误：字段名拼写错
// await prisma.user.findMany({ where: { nmae: "Alice" } });

// 编译错误：操作符与字段类型不匹配
// await prisma.user.findMany({ where: { id: { contains: "abc" } } }); // id 是 UUID，不支持 contains
```

**约束机制**：

- Prisma 通过 schema 解析生成 TypeScript 类型定义文件，将数据库 schema 编译期为 TS 类型。
- 查询参数类型通过 `WhereInput<T>` 映射类型生成，每字段对应一组合法操作符。
- `include`/`select` 通过条件类型计算返回类型，确保类型与查询参数严格对应。

### 案例 4：Express 中间件的类型增强

```typescript
import { Request, Response, NextFunction } from "express";

// 通过声明合并扩展 Request 类型
declare module "express-serve-static-core" {
  interface Request {
    user?: { id: string; name: string }; // 认证中间件注入
    requestId: string;                   // 链路追踪中间件注入
  }
}

// 中间件：认证
function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization;
  if (!token) return res.status(401).send("Unauthorized");
  req.user = verifyToken(token); // 类型安全赋值
  next();
}

// 中间件：链路追踪
function traceMiddleware(req: Request, res: Response, next: NextFunction) {
  req.requestId = generateRequestId();
  next();
}

// 业务路由：使用增强后的 Request
app.get("/profile", authMiddleware, traceMiddleware, (req, res) => {
  // req.user 类型已确定为 { id: string; name: string } | undefined
  if (!req.user) return res.status(401).send("Unauthorized");
  res.json({ id: req.user.id, name: req.user.name, requestId: req.requestId });
});
```

**约束价值**：

- 通过声明合并（接口合并机制）扩展 `Request`，所有中间件共享同一类型视图。
- 业务路由中 `req.user`、`req.requestId` 都有类型提示，避免运行时 undefined 访问。

---

## 习题

### 基础题

**题 1**：编写泛型函数 `firstOrDefault<T>(arr: T[], defaultValue: T): T`，返回数组第一个元素或默认值。

参考答案要点：

```typescript
function firstOrDefault<T>(arr: T[], defaultValue: T): T {
  return arr.length > 0 ? arr[0] : defaultValue;
}
```

**题 2**：实现 `keyof` 约束的 `omit` 函数：`function omit<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K>`。

参考答案要点：

```typescript
function omit<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj };
  keys.forEach(k => delete result[k]);
  return result;
}
```

**题 3**：用默认类型参数实现 `Storage<T = string>` 接口，未指定时默认存储 string。

参考答案要点：

```typescript
interface Storage<T = string> {
  get(): T | null;
  set(value: T): void;
}
```

**题 4**：用条件类型实现 `IsNever<T>`，判断 T 是否为 never。

参考答案要点：

```typescript
type IsNever<T> = [T] extends [never] ? true : false;
```

注意：必须用元组包裹，否则 `never extends never` 直接返回 never 而非 true。

### 进阶题

**题 5**：实现 `DeepReadonly<T>`，递归将所有属性变为只读。要求处理函数类型与数组类型。

参考答案要点：

```typescript
type DeepReadonly<T> = T extends Function
  ? T
  : T extends Array<infer U>
  ? ReadonlyArray<DeepReadonly<U>>
  : T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;
```

**题 6**：实现 `Pipe<Fns extends ((arg: any) => any)[]>`，类型级管道操作。

参考答案要点：

```typescript
type Pipe<Fns extends ((arg: any) => any)[]> = Fns extends [
  (arg: infer A) => infer B,
  ...infer Rest
]
  ? Rest extends [(arg: any) => any][]
    ? [(arg: B) => any, ...Rest] extends Fns
      ? Pipe<[(arg: B) => any, ...Rest]>
      : B
    : B
  : unknown;

function pipe<Fns extends ((arg: any) => any)[]>(
  ...fns: Fns
): (input: Parameters<Fns[0]>[0]) => Pipe<Fns> {
  return (input: any) => fns.reduce((acc, fn) => fn(acc), input);
}

const result = pipe(
  (x: number) => x * 2,
  (x: number) => x.toString(),
  (x: string) => x + "!"
)(5); // "10!"
```

**题 7**：实现 `PickByValueType<T, U>`，仅保留 T 中值类型为 U 子类型的字段。

参考答案要点：

```typescript
type PickByValueType<T, U> = {
  [K in keyof T as T[K] extends U ? K : never]: T[K];
};

interface Example { a: string; b: number; c: string; d: boolean; }
type Strings = PickByValueType<Example, string>; // { a: string; c: string }
```

**题 8**：实现约束 `HasFields<T, Fields extends keyof T>`，要求 T 必须包含 Fields 列出的所有字段。

参考答案要点：

```typescript
type HasFields<T, Fields extends keyof T> = T;

function withFields<T, F extends keyof T>(obj: T, fields: F[]): HasFields<T, F> {
  // 运行时校验
  fields.forEach(f => {
    if (!(f in obj)) throw new Error(`Missing field: ${String(f)}`);
  });
  return obj;
}
```

### 挑战题

**题 9**：实现"类型级字符串解析器"，将字符串 `"a=1&b=2&c=3"` 解析为 `{ a: "1"; b: "2"; c: "3" }`。

参考答案要点：

```typescript
type ParseQueryString<S extends string> =
  S extends `${infer K}=${infer V}&${infer Rest}`
    ? { [P in K]: V } & ParseQueryString<Rest>
    : S extends `${infer K}=${infer V}`
    ? { [P in K]: V }
    : {};

type Result = ParseQueryString<"a=1&b=2&c=3">; // { a: "1"; b: "2"; c: "3" }
```

**题 10**：实现 `Curry<F>` 类型，将多参数函数柯里化为单参数链式调用。

参考答案要点：

```typescript
type Curry<F> = F extends (...args: infer A) => infer R
  ? A extends [infer First, ...infer Rest]
    ? (arg: First) => Curry<(...args: Rest) => R>
    : R
  : never;

declare function curry<F extends (...args: any[]) => any>(fn: F): Curry<F>;

const add = (a: number, b: number, c: number) => a + b + c;
const curried = curry(add);
const result = curried(1)(2)(3); // 6
```

**题 11**：实现 `Validator<T>`，根据类型 T 自动生成运行时校验器。

参考答案要点：

```typescript
type Validator<T> = {
  [K in keyof T]: (value: unknown) => T[K];
};

function makeValidator<T>(schema: Validator<T>): (raw: unknown) => T {
  return (raw) => {
    if (typeof raw !== "object" || raw === null) throw new Error("Not object");
    const result: any = {};
    for (const key in schema) {
      result[key] = schema[key]((raw as any)[key]);
    }
    return result;
  };
}

const userValidator = makeValidator<{
  id: string;
  age: number;
}>({
  id: (v) => { if (typeof v !== "string") throw new Error("id must be string"); return v; },
  age: (v) => { if (typeof v !== "number") throw new Error("age must be number"); return v; },
});

const user = userValidator({ id: "1", age: 30 }); // 类型安全
```

---

## 参考文献

1. Hejlsberg, A. (2012). TypeScript: Language specification. Microsoft Corporation. https://github.com/Microsoft/TypeScript/blob/main/doc/spec.md

2. Bierman, G., Abadi, M., & Torgersen, M. (2014). Understanding TypeScript. In *ECOOP 2014 — Object-Oriented Programming* (pp. 257-281). Springer. https://doi.org/10.1007/978-3-662-44202-9_11

3. Bierman, G., Abadi, M., & Torgersen, M. (2014). Understanding TypeScript: A progressive approach to types. *Electronic Proceedings in Theoretical Computer Science*, 153, 1-15. https://doi.org/10.4204/EPTCS.153.1

4. Java Community Process. (2004). JSR 14: Add Generic Types To The Java Programming Language. https://www.jcp.org/en/jsr/detail?id=14

5. Kennedy, A., & Syme, D. (2001). Design and implementation of generics for the .NET Common Language Runtime. In *Proceedings of the ACM SIGPLAN 2001 Conference on Programming Language Design and Implementation* (PLDI '01) (pp. 1-12). ACM. https://doi.org/10.1145/378795.378797

6. Pierce, B. C. (2002). *Types and programming languages*. MIT Press. https://mitpress.mit.edu/9780262162098/types-and-programming-languages/

7. Cardelli, L., & Wegner, P. (1985). On understanding types, data abstraction, and polymorphism. *ACM Computing Surveys*, 17(4), 471-523. https://doi.org/10.1145/6041.6042

8. Robinson, J. A. (1965). A machine-oriented logic based on the resolution principle. *Journal of the ACM*, 12(1), 23-41. https://doi.org/10.1145/321250.321253

9. Reynolds, J. C. (1974). Towards a theory of type structure. In *Programming Symposium* (pp. 408-425). Springer. https://doi.org/10.1007/3-540-06859-7_148

10. Microsoft. (2017). TypeScript 2.3 release notes: Default type parameters. https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-3.html

11. Microsoft. (2018). TypeScript 2.8 release notes: Conditional types. https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8.html

12. Wadler, P., & Blott, S. (1989). How to make ad-hoc polymorphism less ad hoc. In *Proceedings of the 16th ACM SIGPLAN-SIGACT Symposium on Principles of Programming Languages* (POPL '89) (pp. 60-76). ACM. https://doi.org/10.1145/75277.75283

---

## 延伸阅读

### 官方文档

- **TypeScript Handbook - Generics**: https://www.typescriptlang.org/docs/handbook/2/generics.html
- **TypeScript Handbook - Conditional Types**: https://www.typescriptlang.org/docs/handbook/2/conditional-types.html
- **TypeScript Handbook - Type Inference**: https://www.typescriptlang.org/docs/handbook/type-inference.html
- **TypeScript Handbook - Creating Types from Types**: https://www.typescriptlang.org/docs/handbook/2/types-from-types.html

### 经典教材

- Pierce, B. C. (2002). *Types and Programming Languages* (TAPL). MIT Press. 类型论入门必读，系统讲解子类型、参数化多态、约束系统。
- Pierce, B. C. (2004). *Advanced Topics in Types and Programming Languages*. MIT Press. 涵盖子结构类型系统、依赖类型等进阶主题。
- Harper, R. (2016). *Practical Foundations for Programming Languages* (2nd ed.). Cambridge University Press. 形式化严谨，适合深入研究类型系统理论基础。

### 前沿论文

- Bierman, G., Abadi, M., & Torgersen, M. (2014). Understanding TypeScript. ECOOP 2014. 系统形式化 TS 类型系统。
- Bartoletti, M., et al. (2020). Type safety in dynamic languages: A formal analysis. 现代动态语言类型安全的形式化分析。
- Chlipala, A. (2013). Certified Programming with Dependent Types. MIT Press. 依赖类型与约束系统的高级应用。

### 开源项目参考

- **type-fest**: https://github.com/sindresorhus/type-fest - 实用类型工具集合，含大量约束模式实例。
- **ts-toolbelt**: https://github.com/millsp/ts-toolbelt - 类型级函数库，可学习高阶约束技巧。
- **io-ts**: https://github.com/gcanti/io-ts - 运行时类型与编译期类型同步的代表性库。
- **zod**: https://github.com/colinhacks/zod - 现代运行时校验库，与 TS 类型系统集成紧密。
- **tRPC**: https://github.com/trpc/trpc - 端到端类型安全 RPC 框架，约束设计典范。
- **react-hook-form**: https://github.com/react-hook-form/react-hook-form - 高性能表单库，类型约束设计精良。
- **Prisma**: https://github.com/prisma/prisma - 类型安全的 ORM，schema 驱动类型生成。

### 社区资源

- **TypeScript Deep Dive**: https://basarat.gitbook.io/typescript/ - 在线开源教材，涵盖泛型与约束实战。
- **Type Challenges**: https://github.com/type-challenges/type-challenges - 类型体操题集，适合进阶练习。
- **TypeScript Weekly**: https://www.typescript-weekly.com/ - 每周精选 TS 文章与项目。

### 工具与扩展

- **tsd**: https://github.com/SamVerschueren/tsd - 类型定义测试框架。
- **typescript-eslint**: https://github.com/typescript-eslint/typescript-eslint - ESLint 类型规则集。
- **TypeScript Playground**: https://www.typescriptlang.org/play - 在线实验 TS 类型系统。

### 进阶主题

- **依赖类型（Dependent Types）**：Idris、Agda、Lean 中类型可依赖值，TS 不支持但概念相关。
- **高阶类型（Higher-Kinded Types）**：Haskell 的 `Functor`、`Monad` 等，TS 不支持但可通过模式模拟。
- **效应系统（Effect Systems）**：Koka、Eff 中的效应推断，TS 不支持但部分场景可模拟。
- **线性类型（Linear Types）**：Rust 所有权系统的理论基础，TS 不支持但概念可借鉴用于资源管理。

---

## 总结

泛型约束与默认值是 TypeScript 类型系统的工程化基石。约束通过 `extends` 表达"必须满足"的契约，默认值通过 `= D` 表达"可选提供"的便利，条件泛型通过 `T extends U ? X : Y` 表达"基于类型计算"的灵活，`infer` 通过模式匹配表达"从已有类型提取"的解构。

掌握这些机制的关键不在于记语法，而在于理解其形式化基础与工程价值：

- **形式化基础**：约束是一阶谓词，分发是分配律，`infer` 是合一。
- **工程价值**：约束降低运行时错误率，默认值降低 API 使用成本，条件泛型提升类型表达力。

在实际工程中，应遵循"约束最小化、文档化、与运行时校验组合"三大原则，避免过度使用类型体操导致代码可读性下降与编译性能问题。TypeScript 类型系统的边界清晰——它是"编译期工具"而非"运行时保障"，理解这一边界是写出生产级代码的前提。

未来 TypeScript 类型系统的演进方向可能包括：更精细的效应类型、更友好的高阶类型模拟、更快的增量编译。但核心的"约束 + 默认 + 条件"三件套已足够稳定，值得深度投入。
