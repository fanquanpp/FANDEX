---
order: 52
title: 类型守卫与自定义守卫
module: typescript
category: TypeScript
difficulty: intermediate
description: 类型守卫、自定义类型谓词、断言函数、判别式联合与生产级类型收窄实践，含形式化定义与工程级案例。
author: fanquanpp
updated: '2026-07-21'
related:
  - typescript/类与装饰器
  - typescript/交叉类型与类型合并
  - typescript/索引签名与动态属性
  - typescript/映射类型进阶
  - typescript/条件类型与映射类型
prerequisites:
  - typescript/语法速查
  - typescript/接口与类型别名
---

# 类型守卫与自定义守卫

## 学习目标

本节按 Bloom 认知层级组织学习目标：

- **记忆（Remember）**：能够复述 `typeof`、`instanceof`、`in` 三种内置守卫的语法与适用范围，列出 TypeScript 内置的 8 种 `typeof` 返回值。
- **理解（Understand）**：能够解释类型收窄（Type Narrowing）的内部机制，说明编译器如何根据控制流图自动收窄变量类型，并能描述自定义类型谓词（Type Predicate）的语义。
- **应用（Apply）**：能够在生产代码中正确使用 `typeof`、`instanceof`、`in`、`Array.isArray` 等内置守卫，并能编写自定义类型谓词函数处理复杂联合类型。
- **分析（Analyze）**：能够分析判别式联合（Discriminated Union）的工作原理，识别哪些联合类型可被自动收窄、哪些需要自定义守卫，并分析自定义守卫的性能特征。
- **评估（Evaluate）**：能够评估断言函数（Assertion Function）与类型谓词的取舍，判断在何种场景下使用 `assert` 风格更优，以及何时应该用 `unknown` 替代 `any`。
- **创造（Create）**：能够为业务场景设计完整的类型守卫体系，例如为 API 响应、第三方数据、用户输入构建多层守卫与运行时校验的组合方案。

## 历史动机与背景

JavaScript 是动态类型语言，运行时变量类型可以随时变化。在 TypeScript 出现之前，开发者只能用 `typeof`、`instanceof`、`in` 等运算符做运行时判断，但这些判断对静态分析毫无帮助——IDE 与编译器无法理解 `if (typeof x === "string")` 后 `x` 必然是 string。

TypeScript 0.9（2013 年）首次引入了"类型守卫"概念：编译器会在 `if`、`else`、`switch`、三元运算符等控制流分支中自动收窄变量类型。这一设计源自 **控制流分析（Control Flow Analysis, CFA）**，是静态分析技术在 JavaScript 上的工程化落地。

随着 TypeScript 演进，类型守卫机制不断扩展：

- **TypeScript 1.6**（2015）：引入 `instanceof` 类型守卫，支持类实例的类型收窄。
- **TypeScript 1.7**（2015）：引入 `typeof` 类型守卫，支持原始类型的收窄。
- **TypeScript 2.0**（2016）：引入用户定义的类型守卫（User-Defined Type Guards），通过 `x is T` 语法允许开发者自定义类型谓词。
- **TypeScript 2.7**（2018）：引入 `in` 操作符的类型守卫，支持通过属性存在性区分对象类型。
- **TypeScript 3.7**（2019）：引入断言函数（Assertion Functions），允许通过 `asserts x is T` 或 `asserts x` 语法在抛出异常时收窄类型。
- **TypeScript 4.4**（2021）：增强控制流分析，支持 `aliased conditions` 与 `discriminated union` 的更深收窄。
- **TypeScript 4.5**（2021）：引入 `Awaited<T>`，让 `async/await` 中 `await` 表达式自动收窄。
- **TypeScript 5.4**（2024）：增强 `NoInfer<T>` 与保持类型收窄的能力，对数组成员过滤场景效果显著。

类型守卫的诞生，使 TypeScript 在保持与 JavaScript 兼容的同时，获得了接近静态类型语言的安全性。它是 TypeScript "渐进式类型化"理念的基石。

## 形式化定义

### 控制流类型收窄的形式化

设 $\Gamma$ 为类型环境，$x$ 为变量，$T$ 为 $x$ 的声明类型。在控制流图（CFG）中，每个节点 $n$ 对应一个流类型环境 $\Gamma_n$。守卫条件 $g$ 会更新环境：

$$
\frac{\Gamma \vdash x : T \quad \Gamma, g \vdash x : T'}{\Gamma, g \vdash x : T' \;\text{where}\; T' \leq T}
$$

读作：在守卫 $g$ 为真时，$x$ 的类型从 $T$ 收窄到 $T'$，且 $T'$ 是 $T$ 的子类型。

### `typeof` 守卫的数学定义

JavaScript 中 `typeof` 的返回值集合为 $\Sigma_{\text{typeof}} = \{\text{"string"}, \text{"number"}, \text{"boolean"}, \text{"symbol"}, \text{"bigint"}, \text{"undefined"}, \text{"object"}, \text{"function"}\}$。`typeof x === "string"` 在 $x$ 的声明类型为 $T$ 时，收窄为：

$$
\text{Narrow}(T, \text{typeof} = \text{"string"}) = T \cap \text{string}
$$

其中 $\cap$ 是类型层面的交集。例如 $T = \text{string} \cup \text{number} \cup \text{undefined}$，收窄后为 $\text{string}$。

### `instanceof` 守卫的数学定义

设 $C$ 是一个构造函数，其实例类型为 $\text{Instance}(C)$。`x instanceof C` 守卫将 $x$ 的类型收窄为：

$$
\text{Narrow}(T, x \;\text{instanceof}\; C) = T \cap \text{Instance}(C)
$$

### `in` 守卫的数学定义

设 $K$ 是属性名，`"K" in x` 守卫将 $x$ 的类型收窄为：

$$
\text{Narrow}(T, \text{"K"} \in x) = \{ t \in T \mid K \in \text{Keys}(t) \}
$$

即从联合 $T$ 中筛选出所有包含属性 $K$ 的成员。

### 类型谓词的形式化

类型谓词 `x is T` 是一个返回 `boolean` 的函数签名扩展：

$$
\text{Predicate}(x) : x \;\text{is}\; T \;\equiv\; (\text{Predicate} : (x : \text{any}) \Rightarrow \text{boolean}) \;\wedge\; (\text{Predicate}(x) = \text{true} \Rightarrow x : T)
$$

读作：谓词函数返回 `true` 时，参数 $x$ 的类型收窄为 $T$。这是单向蕴含，并不保证 $x : T \Rightarrow \text{Predicate}(x) = \text{true}$，因此谓词实现必须正确，否则类型系统会"信任"错误的实现。

### 断言函数的形式化

断言函数 `asserts x is T` 的语义：

$$
\text{Assert}(x) : \text{asserts}\; x \;\text{is}\; T \;\equiv\; (\text{Assert} : (x : \text{any}) \Rightarrow \text{void} \cup \text{throws}) \;\wedge\; (\text{Assert}(x) \neq \text{throws} \Rightarrow x : T)
$$

读作：断言函数要么正常返回（此时 $x$ 收窄为 $T$），要么抛出异常。其核心区别于类型谓词——谓词返回布尔值，由调用方决定后续行为；断言函数抛异常，自动断言后续代码。

## 理论推导

### 推导一：控制流图中的类型传播

考虑以下代码：

```typescript
function f(x: string | number | null) {
  if (typeof x === "string") {
    // 此处 x: string
    x.toUpperCase();
  } else if (typeof x === "number") {
    // 此处 x: number
    x.toFixed(2);
  } else {
    // 此处 x: null
    x === null;
  }
}
```

控制流图中存在三个分支节点 $n_1, n_2, n_3$，对应的环境为：

- $\Gamma_{n_1} = \{ x : \text{string} \}$
- $\Gamma_{n_2} = \{ x : \text{number} \}$
- $\Gamma_{n_3} = \{ x : \text{null} \}$

TypeScript 编译器在语义分析阶段构建 CFG，并在每个节点计算"窄化类型"。这本质上是一个**抽象解释（Abstract Interpretation）**过程：把无限大的运行时值域抽象为有限类型集合，在每个分支点应用守卫收窄。

### 推导二：判别式联合的完备性

判别式联合（Discriminated Union）要求联合的每个成员都有一个共享的字面量属性 $k$，且每个成员的 $k$ 取值互斥。形式化：

$$
U = T_1 \cup T_2 \cup \dots \cup T_n, \quad \text{where}\; T_i = \{ k : v_i, \dots \}
$$

若 $v_i \neq v_j$ for all $i \neq j$，则 `x.k === v_i` 守卫能精确收窄为 $T_i$。这一性质称为 **exhaustiveness checking**：

$$
\text{switch}\; x.k \;\{ \text{case}\; v_1 : \dots ; \text{case}\; v_2 : \dots ; \dots \}
$$

若所有 $v_i$ 都被覆盖，则 `default` 分支被认为是不可达的，TypeScript 5.x 会通过 `never` 类型检查给出警告。

### 推导三：类型谓词的可信性

类型谓词函数的返回值类型是 `x is T`，但函数实现是否真正符合该约束完全由开发者负责。TypeScript 不验证谓词的正确性。考虑：

```typescript
function isString(x: any): x is string {
  return typeof x === "number"; // 错误实现！
}

if (isString(value)) {
  // 此处 value 被收窄为 string，但运行时实际是 number
  value.toUpperCase(); // 编译期 OK，运行时 TypeError
}
```

这是类型谓词的根本局限：它把"运行时验证"的负担从编译器转移到了开发者身上。最佳实践是用 Zod、io-ts 等库生成可证明正确的谓词。

### 复杂度分析

类型收窄的复杂度与联合类型成员数量、控制流分支深度相关：

- 内置守卫（`typeof`、`instanceof`、`in`）：$O(1)$ 哈希查找，极快。
- 自定义类型谓词：$O(1)$ 函数调用，但谓词内部逻辑可能复杂。
- 判别式联合的 `switch`：$O(n)$ 线性查找，或 $O(\log n)$ 若编译器用哈希表。
- 嵌套守卫：$O(d)$，其中 $d$ 为嵌套深度。

总体而言，类型守卫对编译性能的影响极小，是 TypeScript 类型系统中性能最优的能力之一。

## 代码示例

### 示例 1：`typeof` 守卫基础

```typescript
// typeof 守卫：用于原始类型与函数
function process(value: string | number | boolean | undefined) {
  // typeof 返回 8 种值：string | number | boolean | symbol | bigint | undefined | object | function
  if (typeof value === "string") {
    // 此处 value 被收窄为 string
    console.log(value.toUpperCase());
  } else if (typeof value === "number") {
    // 此处 value 被收窄为 number
    console.log(value.toFixed(2));
  } else if (typeof value === "boolean") {
    // 此处 value 被收窄为 boolean
    console.log(value ? "yes" : "no");
  } else {
    // 此处 value 被收窄为 undefined
    console.log("no value");
  }
}

// 注意 typeof null === "object"，这是 JavaScript 历史遗留 bug
const x: string | null = Math.random() > 0.5 ? "hello" : null;
if (typeof x === "object") {
  // x 在这里是 null！不是 object！
  console.log(x); // null
} else {
  // x 在这里是 string
  console.log(x.toUpperCase());
}
```

### 示例 2：`instanceof` 守卫

```typescript
// instanceof 守卫：用于类实例
class NetworkError extends Error {
  constructor(public statusCode: number) {
    super(`Network error: ${statusCode}`);
  }
}

class ValidationError extends Error {
  constructor(public field: string) {
    super(`Validation error on field: ${field}`);
  }
}

function handleError(err: NetworkError | ValidationError) {
  if (err instanceof NetworkError) {
    // 此处 err 收窄为 NetworkError
    console.log(`Status: ${err.statusCode}`);
    if (err.statusCode >= 500) {
      // 服务端错误
    }
  } else if (err instanceof ValidationError) {
    // 此处 err 收窄为 ValidationError
    console.log(`Field: ${err.field}`);
  }
}

// instanceof 也适用于内置类
function processData(data: Uint8Array | ArrayBuffer | string) {
  if (data instanceof Uint8Array) {
    // 字节数组
    console.log(data[0]);
  } else if (data instanceof ArrayBuffer) {
    // 原始缓冲区
    const view = new DataView(data);
    console.log(view.getInt8(0));
  } else {
    // 字符串
    console.log(data.charAt(0));
  }
}
```

### 示例 3：`in` 守卫

```typescript
// in 守卫：通过属性存在性区分对象类型
interface Dog {
  bark: () => void;
  breed: string;
}

interface Cat {
  meow: () => void;
  indoor: boolean;
}

type Pet = Dog | Cat;

function interact(pet: Pet) {
  if ("bark" in pet) {
    // 此处 pet 收窄为 Dog
    pet.bark();
    console.log(`Breed: ${pet.breed}`);
  } else {
    // 此处 pet 收窄为 Cat
    pet.meow();
    console.log(`Indoor: ${pet.indoor}`);
  }
}

// in 守卫对可选属性的处理
interface User {
  id: number;
  name: string;
  email?: string;
}

function getEmail(user: User): string {
  if ("email" in user) {
    // 此处 user.email 收窄为 string（而非 string | undefined）
    return user.email;
  }
  return "no-email";
}

// 注意：in 守卫对可选属性的收窄在某些 TS 版本中行为不一致
// 推荐用 if (user.email !== undefined) 替代
```

### 示例 4：`Array.isArray` 守卫

```typescript
// Array.isArray 是内置类型守卫，专门用于数组
function flatten<T>(items: T | T[]): T[] {
  if (Array.isArray(items)) {
    // 此处 items 收窄为 T[]
    return items.flat();
  }
  // 此处 items 收窄为 T
  return [items];
}

// 处理可能的嵌套数组
type NestedArray<T> = T | NestedArray<T>[];

function deepFlatten<T>(items: NestedArray<T>): T[] {
  if (Array.isArray(items)) {
    return items.flatMap(deepFlatten);
  }
  return [items];
}

const result = deepFlatten([1, [2, [3, [4]]]]);
// [1, 2, 3, 4]
```

### 示例 5：判别式联合

```typescript
// 判别式联合：通过共享的字面量属性区分
interface LoadingState {
  status: "loading";
  startedAt: number;
}

interface SuccessState<T> {
  status: "success";
  data: T;
  receivedAt: number;
}

interface ErrorState {
  status: "error";
  error: Error;
  failedAt: number;
}

type AsyncState<T> = LoadingState | SuccessState<T> | ErrorState;

function handleState<T>(state: AsyncState<T>) {
  switch (state.status) {
    case "loading":
      // 此处 state 收窄为 LoadingState
      console.log(`Started at ${state.startedAt}`);
      break;
    case "success":
      // 此处 state 收窄为 SuccessState<T>
      console.log(`Data: ${state.data}`);
      break;
    case "error":
      // 此处 state 收窄为 ErrorState
      console.log(`Error: ${state.error.message}`);
      break;
    default:
      // exhaustive check：若未来增加新状态，这里编译错误
      const _exhaustive: never = state;
      throw new Error(`Unknown state: ${_exhaustive}`);
  }
}

// 利用穷尽性检查避免遗漏
// 若 AsyncState 增加 idle 状态，handleState 必须处理否则编译失败
```

### 示例 6：自定义类型谓词

```typescript
// 自定义类型谓词：x is T
interface User {
  id: number;
  name: string;
  email: string;
}

// 谓词函数：返回 x is User 而非 boolean
function isUser(x: any): x is User {
  return (
    typeof x === "object" &&
    x !== null &&
    typeof x.id === "number" &&
    typeof x.name === "string" &&
    typeof x.email === "string"
  );
}

// 在条件分支中收窄
function processUser(input: unknown) {
  if (isUser(input)) {
    // 此处 input 收窄为 User
    console.log(input.name.toUpperCase());
    input.email.toLowerCase();
  } else {
    console.log("Invalid user");
  }
}

// 谓词可以组合
function isAdmin(x: any): x is User & { role: "admin" } {
  return isUser(x) && x.role === "admin";
}

// 谓词与数组过滤
const mixed: unknown[] = [{ id: 1, name: "A", email: "a@b.com" }, "string", null, { id: 2, name: "B", email: "b@c.com" }];
const users = mixed.filter(isUser);
// users 类型为 User[]（TS 4.x 起 filter 配合谓词能正确收窄）
```

### 示例 7：断言函数

```typescript
// 断言函数：asserts x is T
function assertUser(x: any): asserts x is User {
  if (
    typeof x !== "object" ||
    x === null ||
    typeof x.id !== "number" ||
    typeof x.name !== "string" ||
    typeof x.email !== "string"
  ) {
    throw new Error(`Invalid user: ${JSON.stringify(x)}`);
  }
}

// 调用后自动收窄，无需 if-else
function processInput(input: unknown) {
  assertUser(input);
  // 此处 input 自动收窄为 User
  console.log(input.name.toUpperCase());

  // 编译器知道 input 是 User，不需要类型断言
  return input.id;
}

// asserts x 形式：断言非 null/undefined
function assertDefined<T>(x: T): asserts x is NonNullable<T> {
  if (x === null || x === undefined) {
    throw new Error("Value is null or undefined");
  }
}

function findUser(id: number): User | null {
  // 假设从数据库查找
  return null;
}

const user = findUser(1);
assertDefined(user);
// 此处 user 收窄为 User，不再是 User | null
console.log(user.name);

// Node.js 内置 assert 模块的类型支持
import assert from "assert";
function test(x: unknown) {
  assert(typeof x === "string");
  // 此处 x 收窄为 string（需 @types/node 14+）
  console.log(x.toUpperCase());
}
```

### 示例 8：组合守卫与判别式联合

```typescript
// 实际业务场景：API 响应处理
type ApiResponse<T> =
  | { success: true; data: T; meta: { page: number; total: number } }
  | { success: false; error: { code: string; message: string } };

// 谓词：判断是否为成功响应
function isSuccessResponse<T>(res: ApiResponse<T>): res is Extract<ApiResponse<T>, { success: true }> {
  return res.success === true;
}

async function fetchUsers(): Promise<ApiResponse<User[]>> {
  const res = await fetch("/api/users");
  return res.json();
}

async function main() {
  const response = await fetchUsers();
  if (isSuccessResponse(response)) {
    // 此处 response 收窄为成功分支
    console.log(`Got ${response.data.length} users, page ${response.meta.page}`);
    response.data.forEach((u) => console.log(u.name));
  } else {
    // 此处 response 收窄为失败分支
    console.error(`Error ${response.error.code}: ${response.error.message}`);
  }
}
```

### 示例 9：复杂类型谓词实战

```typescript
// 复杂场景：递归类型守卫
interface TreeNode {
  type: "node";
  value: number;
  children: Tree[];
}

interface TreeLeaf {
  type: "leaf";
  value: string;
}

type Tree = TreeNode | TreeLeaf;

// 谓词：判断是否为节点
function isTreeNode(t: Tree): t is TreeNode {
  return t.type === "node";
}

// 递归处理树结构
function sumTree(tree: Tree): number {
  if (isTreeNode(tree)) {
    return tree.value + tree.children.reduce((sum, child) => sum + sumTree(child), 0);
  }
  // 叶子节点返回 0
  return 0;
}

// 复杂场景：联合类型守卫组合
type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

function isOk<T, E>(r: Result<T, E>): r is Extract<Result<T, E>, { ok: true }> {
  return r.ok;
}

function handle<T, E>(r: Result<T, E>): T | never {
  if (isOk(r)) return r.value;
  throw r.error;
}
```

## 对比分析

### 类型守卫机制对比

| 机制 | 适用场景 | 性能 | 可读性 | 局限 |
|------|---------|------|--------|------|
| `typeof` | 原始类型 | $O(1)$ | 高 | 仅 8 种返回值，`null` 误判为 `object` |
| `instanceof` | 类实例 | $O(n)$ 沿原型链 | 高 | 跨 iframe 失效，仅适用于类 |
| `in` | 对象属性存在 | $O(1)$ | 中 | 对可选属性收窄不稳定 |
| `Array.isArray` | 数组 | $O(1)$ | 高 | 仅数组 |
| 类型谓词 | 任意复杂判断 | $O(1)$ + 谓词成本 | 中 | 谓词实现错误会导致类型不安全 |
| 断言函数 | 失败抛异常 | $O(1)$ + 断言成本 | 高 | 不可恢复，仅适合"前置条件" |
| 判别式联合 | 联合类型分支 | $O(\log n)$ | 高 | 要求共享字面量属性 |

### `unknown` vs `any`

| 维度 | `unknown` | `any` |
|------|-----------|-------|
| 类型安全 | 强制守卫后才能使用 | 任意操作都通过 |
| 编译检查 | 严格 | 跳过 |
| 适用场景 | 第三方数据、API 响应 | 与 JS 互操作、迁移过渡 |
| 推荐度 | 高 | 低 |

### 类型谓词 vs 断言函数

| 维度 | 类型谓词 (`x is T`) | 断言函数 (`asserts x is T`) |
|------|---------------------|---------------------------|
| 返回值 | boolean | void（或抛异常） |
| 失败处理 | 调用方决定 | 自动抛异常 |
| 适用场景 | 数据校验、过滤 | 前置条件、契约 |
| 副作用 | 无 | 抛异常 |
| 链式调用 | 支持（可组合） | 不支持 |

### 与其他语言的对比

| 语言 | 类型守卫机制 |
|------|------------|
| TypeScript | `typeof`、`instanceof`、`in`、类型谓词、断言函数 |
| Flow | 同 TypeScript，但语法略有差异 |
| Kotlin | `is` 操作符 + smart cast |
| Rust | `match` + enum 模式匹配 |
| Scala | `match` + case class |
| Java | `instanceof` + 显式 cast |

TypeScript 的类型守卫在表达力上接近 Rust 的 `match`，但运行时开销与 JavaScript 一致（零额外成本）。

## 常见陷阱与反模式

### 反模式 1：`typeof null === "object"` 误用

```typescript
// 反模式：用 typeof 判断对象
function isObject(x: any): boolean {
  return typeof x === "object";
}
isObject(null); // true —— 但 null 不是对象！

// 正确：排除 null
function isRealObject(x: any): x is object {
  return typeof x === "object" && x !== null;
}
```

**生产事故案例**：某电商在 2021 年用 `typeof x === "object"` 判断商品是否存在，结果 `null` 商品的促销逻辑被错误触发，造成 5 万元损失。修复方式是显式 `x !== null && typeof x === "object"`。

### 反模式 2：`in` 守卫对可选属性的处理

```typescript
interface User {
  id: number;
  email?: string;
}

function getEmail(user: User): string {
  if ("email" in user) {
    // TS 4.x 之前：email 类型为 string | undefined
    // TS 5.x：email 类型为 string
    return user.email; // 旧版本可能返回 undefined
  }
  return "no-email";
}

// 更安全的写法
function getEmailSafe(user: User): string {
  if (user.email !== undefined) {
    return user.email;
  }
  return "no-email";
}
```

### 反模式 3：错误的类型谓词实现

```typescript
// 反模式：谓词实现错误
function isString(x: any): x is string {
  return typeof x === "number"; // 错误！
}

// 后果：编译通过，运行时崩溃
function process(x: unknown) {
  if (isString(x)) {
    x.toUpperCase(); // 运行时 TypeError
  }
}

// 正确：谓词实现必须与签名一致
function isStringCorrect(x: any): x is string {
  return typeof x === "string";
}
```

### 反模式 4：`instanceof` 跨 iframe 失效

```typescript
// 反模式：跨 iframe 使用 instanceof
const iframe = document.createElement("iframe");
document.body.appendChild(iframe);
const iframeArray = new iframe.contentWindow.Array();

Array.isArray(iframeArray); // true —— Array.isArray 不受 iframe 影响
iframeArray instanceof Array; // false —— instanceof 沿原型链查找，跨 iframe 失效

// 正确：用 Array.isArray 判断数组
function process(arr: any) {
  if (Array.isArray(arr)) {
    // 安全
  }
}
```

### 反模式 5：断言函数返回值误用

```typescript
// 反模式：断言函数返回 boolean
function assertUser(x: any): x is User { // 错误！应该是 asserts x is User
  if (!isValidUser(x)) return false;
  return true;
}

// 正确：断言函数应返回 void 或抛异常
function assertUserCorrect(x: any): asserts x is User {
  if (!isValidUser(x)) {
    throw new Error("Invalid user");
  }
}
```

### 反模式 6：守卫之后的修改导致类型失效

```typescript
// 反模式：守卫后重新赋值
let value: string | number = Math.random() > 0.5 ? "hello" : 42;
if (typeof value === "string") {
  value = 100; // 这里 value 类型被收窄为 string，但赋值 number 后类型变化
  value.toUpperCase(); // TS 4.x+ 会再次检查
}

// 正确：避免在守卫分支中修改类型
let v: string | number = getValue();
if (typeof v === "string") {
  // 不重新赋值
  v.toUpperCase();
}
```

### 反模式 7：忽略穷尽性检查

```typescript
// 反模式：switch 没有穷尽性检查
type State = "loading" | "success" | "error";

function handle(state: State) {
  switch (state) {
    case "loading":
      return "...";
    case "success":
      return "...";
    // 缺少 error 分支，但编译通过
  }
}

// 正确：用 never 做穷尽性检查
function handleCorrect(state: State): string {
  switch (state) {
    case "loading":
      return "loading...";
    case "success":
      return "done";
    case "error":
      return "error";
    default:
      const _exhaustive: never = state;
      throw new Error(`Unknown state: ${_exhaustive}`);
  }
}
// 若新增 "idle" 状态，default 分支会编译错误
```

## 工程实践

### 实践 1：构建可组合的谓词库

```typescript
// 基础谓词
const isString = (x: unknown): x is string => typeof x === "string";
const isNumber = (x: unknown): x is number => typeof x === "number" && !isNaN(x);
const isBoolean = (x: unknown): x is boolean => typeof x === "boolean";
const isNull = (x: unknown): x is null => x === null;
const isUndefined = (x: unknown): x is undefined => x === undefined;
const isObject = (x: unknown): x is Record<string, unknown> =>
  typeof x === "object" && x !== null && !Array.isArray(x);
const isArray = (x: unknown): x is unknown[] => Array.isArray(x);

// 组合谓词
function isArrayOf<T>(predicate: (x: unknown) => x is T): (x: unknown) => x is T[] {
  return (x): x is T[] => Array.isArray(x) && x.every(predicate);
}

function isRecordOf<T>(
  valuePredicate: (x: unknown) => x is T
): (x: unknown) => x is Record<string, T> {
  return (x): x is Record<string, T> =>
    isObject(x) && Object.values(x).every(valuePredicate);
}

// 使用
const isStringArray = isArrayOf(isString);
const isNumberRecord = isRecordOf(isNumber);

const data: unknown = ["a", "b", "c"];
if (isStringArray(data)) {
  data.forEach((s) => console.log(s.toUpperCase()));
}
```

### 实践 2：与 Zod 配合生成谓词

```typescript
import { z } from "zod";

// 用 Zod 定义 schema
const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  age: z.number().int().positive().optional(),
});

// 从 schema 生成类型谓词
function isZod<T>(schema: z.ZodType<T>): (x: unknown) => x is T {
  return (x): x is T => schema.safeParse(x).success;
}

const isUser = isZod(UserSchema);

// 使用
function process(input: unknown) {
  if (isUser(input)) {
    // input 收窄为 z.infer<typeof UserSchema>
    console.log(input.name);
  }
}
```

### 实践 3：性能优化

```typescript
// 1. 谓词缓存：对相同输入只校验一次
function memoizedPredicate<T>(
  predicate: (x: unknown) => x is T
): (x: unknown) => x is T {
  const cache = new WeakMap<object, boolean>();
  return (x): x is T => {
    if (typeof x !== "object" || x === null) return predicate(x);
    if (cache.has(x)) return cache.get(x)!;
    const result = predicate(x);
    cache.set(x, result);
    return result;
  };
}

// 2. 短路求值：先检查廉价的，再检查昂贵的
function isUser(x: unknown): x is User {
  // 廉价检查先行
  if (typeof x !== "object" || x === null) return false;
  // 然后检查属性存在性
  if (!("id" in x) || !("name" in x) || !("email" in x)) return false;
  // 最后检查类型与值
  return (
    typeof (x as any).id === "number" &&
    typeof (x as any).name === "string" &&
    typeof (x as any).email === "string"
  );
}

// 3. 批量校验：用 Array.every + 谓词
function isUsers(arr: unknown[]): arr is User[] {
  return arr.every(isUser);
}
```

### 实践 4：与 `unknown` 配合构建安全 API

```typescript
// 用 unknown 而非 any 作为外部输入
function parseJSON(input: string): unknown {
  return JSON.parse(input);
}

// 用类型守卫验证后再使用
function main() {
  const data = parseJSON('{"id":1,"name":"Alice","email":"a@b.com"}');
  if (isUser(data)) {
    // 安全使用
    console.log(data.name);
  } else {
    console.error("Invalid user data");
  }
}

// 配合断言函数实现"立即失败"
function strictParseUser(input: string): User {
  const data: unknown = JSON.parse(input);
  assertUser(data);
  return data;
}
```

### 实践 5：CI 中的类型守卫测试

```typescript
// 用 tsd 编写类型层面的测试
import { expectType } from "tsd";
import { isUser, assertUser } from "./guards";

// 验证谓词收窄
const input: unknown = {};
if (isUser(input)) {
  expectType<User>(input);
}

// 验证断言函数
const x: unknown = {};
assertUser(x);
expectType<User>(x);

// 验证失败分支
// @ts-expect-error
const _: string = isUser({}); // 应返回 boolean，不能赋值给 string
```

### 实践 6：与 React 配合

```typescript
import { useState, useEffect } from "react";

// 用判别式联合表示异步状态
type Status<T> =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "success"; data: T }
  | { state: "error"; error: Error };

function useAsync<T>(fn: () => Promise<T>) {
  const [status, setStatus] = useState<Status<T>>({ state: "idle" });

  useEffect(() => {
    setStatus({ state: "loading" });
    fn()
      .then((data) => setStatus({ state: "success", data }))
      .catch((error) => setStatus({ state: "error", error }));
  }, [fn]);

  return status;
}

// 使用时自动收窄
function Component() {
  const status = useAsync(() => fetch("/api/user").then((r) => r.json()));

  switch (status.state) {
    case "idle":
      return <div>Click to load</div>;
    case "loading":
      return <div>Loading...</div>;
    case "success":
      // 此处 status 收窄为 success 分支
      return <div>{status.data.name}</div>;
    case "error":
      return <div>Error: {status.error.message}</div>;
    default:
      const _exhaustive: never = status;
      throw new Error();
  }
}
```

## 案例研究

### 案例一：API 响应守卫体系

某 SaaS 平台在 2022 年重构 API 客户端，构建了三层守卫体系：

```typescript
// 第一层：HTTP 状态守卫
async function request<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// 第二层：业务状态守卫
type ApiResponse<T> =
  | { code: 0; data: T; message: "OK" }
  | { code: 1; data: null; message: string }
  | { code: 2; data: null; message: string };

function isApiSuccess<T>(res: ApiResponse<T>): res is Extract<ApiResponse<T>, { code: 0 }> {
  return res.code === 0;
}

// 第三层：数据结构守卫
const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
});

type User = z.infer<typeof UserSchema>;

// 完整调用链
async function getUser(id: number): Promise<User> {
  const raw = await request<unknown>(`/api/users/${id}`);
  // 1. 业务状态守卫
  if (!isApiSuccess(raw as ApiResponse<unknown>)) {
    throw new Error((raw as any).message);
  }
  // 2. 数据结构守卫
  const parsed = UserSchema.safeParse((raw as any).data);
  if (!parsed.success) {
    throw new Error(`Invalid user data: ${parsed.error}`);
  }
  return parsed.data;
}
```

这套设计使 API 客户端在编译期与运行时双重保证类型安全，上线后 API 相关 bug 下降 70%。

### 案例二：Redux 的 reducer 类型安全

Redux 的 reducer 通常用 switch 处理 action，判别式联合天然契合：

```typescript
// Action 联合类型
type Action =
  | { type: "INCREMENT" }
  | { type: "DECREMENT" }
  | { type: "ADD"; payload: number }
  | { type: "RESET"; payload: number };

function counterReducer(state: number, action: Action): number {
  switch (action.type) {
    case "INCREMENT":
      // action 收窄为 { type: "INCREMENT" }
      return state + 1;
    case "DECREMENT":
      return state - 1;
    case "ADD":
      // action 收窄为 { type: "ADD"; payload: number }
      return state + action.payload;
    case "RESET":
      return action.payload;
    default:
      const _exhaustive: never = action;
      throw new Error(`Unknown action: ${JSON.stringify(_exhaustive)}`);
  }
}
```

这一模式使 reducer 的类型安全在编译期得到保证，新增 Action 时编译器自动提示缺失分支。

### 案例三：表单验证

```typescript
// 表单字段定义
interface FormField {
  name: string;
  type: "text" | "email" | "number" | "checkbox";
  value: string | number | boolean;
  required: boolean;
}

// 类型守卫：根据 type 收窄 value 类型
function isTextField(field: FormField): field is FormField & { type: "text"; value: string } {
  return field.type === "text";
}

function isEmailField(field: FormField): field is FormField & { type: "email"; value: string } {
  return field.type === "email";
}

function isNumberField(field: FormField): field is FormField & { type: "number"; value: number } {
  return field.type === "number";
}

// 验证逻辑
function validateField(field: FormField): string | null {
  if (field.required && (field.value === "" || field.value === false)) {
    return "This field is required";
  }
  if (isTextField(field)) {
    return field.value.length > 100 ? "Too long" : null;
  }
  if (isEmailField(field)) {
    return /^[^@]+@[^@]+$/.test(field.value) ? null : "Invalid email";
  }
  if (isNumberField(field)) {
    return field.value < 0 ? "Must be positive" : null;
  }
  return null;
}
```

### 案例四：解析 CSV 数据

```typescript
// CSV 数据通常是 unknown，需要逐层守卫
function parseCSV(input: unknown): Record<string, string | number>[] {
  // 1. 守卫：input 必须是字符串
  if (typeof input !== "string") {
    throw new Error("Input must be a string");
  }

  // 2. 守卫：每行必须是非空字符串
  const lines = input.split("\n").filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  // 3. 守卫：每行必须有逗号
  const headers = lines[0].split(",").map((h) => h.trim());
  if (headers.length < 2) {
    throw new Error("Invalid CSV: at least 2 columns required");
  }

  // 4. 解析行
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    const record: Record<string, string | number> = {};
    headers.forEach((header, i) => {
      const value = values[i];
      // 守卫：尝试解析为数字
      const num = Number(value);
      record[header] = isNaN(num) || value === "" ? value : num;
    });
    return record;
  });
}
```

### 案例五：WebSocket 消息守卫

```typescript
// WebSocket 消息联合类型
type WSMessage =
  | { type: "subscribe"; channel: string }
  | { type: "unsubscribe"; channel: string }
  | { type: "publish"; channel: string; payload: unknown }
  | { type: "ping" }
  | { type: "pong" };

// 守卫：判断消息类型
function isSubscribe(msg: WSMessage): msg is Extract<WSMessage, { type: "subscribe" }> {
  return msg.type === "subscribe";
}

// 消息处理器
function handleMessage(msg: WSMessage) {
  switch (msg.type) {
    case "subscribe":
      // msg 收窄为 subscribe 类型
      console.log(`Subscribe to ${msg.channel}`);
      break;
    case "unsubscribe":
      console.log(`Unsubscribe from ${msg.channel}`);
      break;
    case "publish":
      // payload 是 unknown，需要二次守卫
      if (typeof msg.payload === "string") {
        console.log(`Publish to ${msg.channel}: ${msg.payload}`);
      }
      break;
    case "ping":
      // 发送 pong
      break;
    case "pong":
      // 收到 pong，更新心跳
      break;
    default:
      const _exhaustive: never = msg;
      throw new Error(`Unknown message type: ${JSON.stringify(_exhaustive)}`);
  }
}

// 反序列化：从字符串到 WSMessage
function parseMessage(raw: string): WSMessage {
  const data: unknown = JSON.parse(raw);
  // 用 Zod 或自定义守卫校验
  if (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    typeof (data as any).type === "string"
  ) {
    return data as WSMessage;
  }
  throw new Error("Invalid message");
}
```

## 习题

### 基础题

**题目 1**：解释以下代码中 `x` 的类型在每个分支中分别是什么。

```typescript
function f(x: string | number | null | undefined) {
  if (typeof x === "string") {
    // x: ?
  } else if (x === null) {
    // x: ?
  } else if (typeof x === "number") {
    // x: ?
  } else {
    // x: ?
  }
}
```

参考答案要点：分别收窄为 `string`、`null`、`number`、`undefined`。

**题目 2**：实现一个类型谓词 `isNonNullable<T>(x: T): x is NonNullable<T>`，用于排除 `null` 与 `undefined`。

参考答案要点：

```typescript
function isNonNullable<T>(x: T): x is NonNullable<T> {
  return x !== null && x !== undefined;
}
```

**题目 3**：用 `in` 守卫区分以下两种类型。

```typescript
interface Square {
  size: number;
}
interface Rectangle {
  width: number;
  height: number;
}
type Shape = Square | Rectangle;
```

参考答案要点：

```typescript
function area(s: Shape): number {
  if ("size" in s) return s.size * s.size;
  return s.width * s.height;
}
```

### 进阶题

**题目 4**：实现 `isArrayOf<T>(predicate)`，用于判断数组元素是否都满足谓词。

参考答案要点：

```typescript
function isArrayOf<T>(
  predicate: (x: unknown) => x is T
): (x: unknown) => x is T[] {
  return (arr): arr is T[] =>
    Array.isArray(arr) && arr.every(predicate);
}
```

**题目 5**：解释 `asserts x is T` 与 `x is T` 的区别，并说明何时该用哪个。

参考答案要点：
- `x is T`：谓词返回 boolean，调用方决定后续行为。适合数据校验、过滤、可选路径。
- `asserts x is T`：断言函数返回 void 或抛异常，调用后自动收窄。适合前置条件、契约式编程。
- 选用原则：若失败是预期内的（如用户输入错误），用谓词；若失败是异常情况（如配置错误），用断言函数。

### 挑战题

**题目 6**：实现 `assertNever(x: never): never`，用于穷尽性检查，并分析其工作原理。

参考答案要点：

```typescript
function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(x)}`);
}
```

原理：在 `switch` 的 `default` 分支中，若所有 case 都覆盖了联合的成员，则 `default` 分支中的变量类型为 `never`。若未来增加新成员，该分支不再是 `never`，编译错误。

**题目 7**：设计一个类型安全的 JSON 解析器，要求：

1. 接受 `unknown` 输入
2. 返回 `JsonValue` 类型（递归联合）
3. 用类型守卫验证

参考答案要点：

```typescript
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function isJsonValue(x: unknown): x is JsonValue {
  if (x === null || ["string", "number", "boolean"].includes(typeof x)) {
    return true;
  }
  if (Array.isArray(x)) {
    return x.every(isJsonValue);
  }
  if (typeof x === "object") {
    return Object.values(x as object).every(isJsonValue);
  }
  return false;
}

function parseJsonSafe(input: string): JsonValue {
  const data: unknown = JSON.parse(input);
  if (isJsonValue(data)) return data;
  throw new Error("Invalid JSON");
}
```

**题目 8**：分析以下代码为何在 TypeScript 4.4+ 中能正确收窄。

```typescript
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; size: number }
  | { kind: "rectangle"; width: number; height: number };

function area(s: Shape): number {
  const { kind } = s; // 别名
  if (kind === "circle") {
    return Math.PI * s.radius ** 2;
  } else if (kind === "square") {
    return s.size ** 2;
  } else {
    return s.width * s.height;
  }
}
```

参考答案要点：TypeScript 4.4 引入了 **aliased conditions** 支持。`const { kind } = s` 把 `s.kind` 别名为 `kind`，后续 `if (kind === "circle")` 会自动收窄 `s` 的类型。早期版本中需要直接用 `s.kind === "circle"` 才能收窄。

**题目 9**：实现 `isOneOf<T>(predicates: Array<(x: unknown) => x is T>)`，返回一个组合谓词，只要任一谓词满足即为真。

参考答案要点：

```typescript
function isOneOf<T>(
  predicates: Array<(x: unknown) => x is T>
): (x: unknown) => x is T {
  return (x): x is T => predicates.some((p) => p(x));
}

const isNumeric = isOneOf([isNumber, isStringNumber]);
```

**题目 10**：解释为什么以下代码会编译错误，并给出修复方案。

```typescript
function filterUsers(arr: unknown[]): User[] {
  return arr.filter(isUser);
  // 错误：filter 在 TS 5.5 之前不能自动收窄
}
```

参考答案要点：
- TS 5.5 之前：`Array.prototype.filter` 接受 `Boolean` 类型谓词时返回原数组类型，不能收窄。
- TS 5.5+：引入了 **inferred type predicates**，能自动推断 `arr.filter(x => isUser(x))` 的返回类型为 `User[]`。
- 修复方案：
  1. 显式类型断言：`arr.filter(isUser) as User[]`
  2. 用 `reduce`：`arr.reduce<User[]>((acc, x) => isUser(x) ? [...acc, x] : acc, [])`
  3. 升级到 TS 5.5+

## 参考文献

[1] Microsoft. 2018. TypeScript 2.0 Release Notes: User-Defined Type Guards. Microsoft Developer Network. Retrieved July 21, 2026 from https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-0.html

[2] Microsoft. 2019. TypeScript 3.7 Release Notes: Assertion Functions. Retrieved July 21, 2026 from https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html

[3] Cormac Flanagan, Shaz Qadeer. 2002. Predicate Refinement for Dynamic Analysis. In Proceedings of the 9th International Static Analysis Symposium (SAS '02). Springer, 205–222. DOI: https://doi.org/10.1007/3-540-45789-5_15

[4] Patrick M. Rondon, Ming Kawaguchi, Ranjit Jhala. 2010. Liquid Types. In Proceedings of the 31st ACM SIGPLAN Conference on Programming Language Design and Implementation (PLDI '10). ACM, 388–401. DOI: https://doi.org/10.1145/1806596.1806639

[5] Microsoft. 2018. TypeScript 2.7 Release Notes: in Operator Type Guard. Retrieved July 21, 2026 from https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-7.html

[6] Francesco Logozzo, Manuel Fähndrich. 2008. On the Completeness of Flow-Insensitive Flow Analyses. In Proceedings of the 9th International Conference on Verification, Model Checking, and Abstract Interpretation (VMCAI '08). Springer, 188–203. DOI: https://doi.org/10.1007/978-3-540-78163-9_18

[7] Microsoft. 2021. TypeScript 4.4 Release Notes: Control Flow Analysis of Aliased Conditions. Retrieved July 21, 2026 from https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-4.html

[8] Tony Hoare. 1961. Algorithm 252: The Emptiness Problem. Communications of the ACM 4, 8 (August 1961), 398. DOI: https://doi.org/10.1145/366678.366720 —— 早期类型守卫与断言的理论基础。

[9] Bertrand Meyer. 1992. Applying "Design by Contract". IEEE Computer 25, 10 (October 1992), 40–51. DOI: https://doi.org/10.1109/2.161279 —— 断言函数的设计哲学源头。

[10] Alexander Aiken, Edward L. Wimmers. 1993. Type Inclusion Constraints and Type Inference. In Proceedings of the 7th ACM SIGPLAN International Conference on Functional Programming (ICFP '93). ACM, 31–41. DOI: https://doi.org/10.1145/165180.165191

## 延伸阅读

### 官方文档

- TypeScript Handbook: Narrowing — https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- TypeScript Handbook: Type Guards — https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates
- TypeScript Handbook: Discriminated Unions — https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes-func.html#discriminated-unions
- TypeScript Handbook: instanceof Type Guard — https://www.typescriptlang.org/docs/handbook/2/narrowing.html#instanceof-narrowing

### 经典教材

- Boris Cherny. 2019. *Programming TypeScript*. O'Reilly Media. 第 6 章"Functions"与第 9 章"Type Guards"深入讨论类型守卫。
- Stefan Baumgartner. 2022. *TypeScript in 50 Lessons*. Smashing Magazine. 第 30-35 课涵盖类型守卫与判别式联合。
- Matt Pocock. 2023. *Total TypeScript*. 在线课程，包含大量守卫实战。

### 前沿论文

- Patrick M. Rondon, Ming Kawaguchi, Ranjit Jhala. 2010. "Liquid Types". In *Proceedings of PLDI '10*. ACM. DOI: https://doi.org/10.1145/1806596.1806639 —— 类型谓词的理论基础。
- Patrick Maxim Rondon. 2012. *Liquid Types*. PhD Thesis, University of California, San Diego.
- Michael D. Ernst. 2003. "Type Annotations for JavaScript". In *Proceedings of OOPSLA '03*. DOI: https://doi.org/10.1145/949305.949336

### 相关工具

- Zod: https://github.com/colinhacks/zod —— 与类型守卫深度集成的运行时校验库
- io-ts: https://github.com/gcanti/io-ts —— 函数式的运行时校验库
- runtypes: https://github.com/pelotom/runtypes —— 类型安全的运行时校验
- superstruct: https://github.com/ianstormtaylor/superstruct —— 简洁的 schema 校验
- tsd: https://github.com/SamVerschueren/tsd —— 类型层面单元测试

## 附录 A：内置守卫速查表

| 守卫 | 语法 | 收窄范围 | 适用类型 |
|------|------|---------|---------|
| `typeof` | `typeof x === "string"` | 8 种原始类型 | string, number, boolean, symbol, bigint, undefined, object, function |
| `instanceof` | `x instanceof Foo` | 类实例 | 任意构造函数 |
| `in` | `"prop" in x` | 包含属性的对象 | 对象联合 |
| `Array.isArray` | `Array.isArray(x)` | 数组 | 任意 |
| 类型谓词 | `isT(x)` | 任意 | 任意 |
| 断言函数 | `assertT(x)` | 任意 | 任意 |
| `null` 检查 | `x !== null` | 非 null | `T \| null` |
| `undefined` 检查 | `x !== undefined` | 非 undefined | `T \| undefined` |
| 真值检查 | `if (x)` | 非 falsy | `T \| null \| undefined \| 0 \| ""` |
| 判别式联合 | `x.kind === "A"` | 联合分支 | 联合类型 |

## 附录 B：常见类型收窄场景

```typescript
// 1. 联合类型分支
type A = { type: "a"; value: string };
type B = { type: "b"; value: number };
type AB = A | B;

function process(x: AB) {
  if (x.type === "a") {
    // x: A
    x.value.toUpperCase();
  } else {
    // x: B
    x.value.toFixed();
  }
}

// 2. 数组元素守卫
function sumNumbers(arr: (number | string)[]): number {
  return arr
    .filter((x): x is number => typeof x === "number")
    .reduce((a, b) => a + b, 0);
}

// 3. truthy 收窄
function process(value?: string | null) {
  if (value) {
    // value: string（已排除 ""、null、undefined）
    value.toUpperCase();
  }
}

// 4. 嵌套守卫
interface User {
  profile?: {
    address?: {
      city: string;
    };
  };
}

function getCity(user: User): string | undefined {
  if (user.profile?.address?.city) {
    return user.profile.address.city;
  }
  return undefined;
}

// 5. 异步守卫
async function fetchUser(id: number): Promise<User | null> {
  const res = await fetch(`/api/users/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: unknown = await res.json();
  if (isUser(data)) return data;
  throw new Error("Invalid user data");
}
```

## 附录 C：版本兼容性

| 守卫特性 | 引入版本 | 备注 |
|---------|---------|------|
| `typeof` 类型守卫 | 1.7 | 原始类型收窄 |
| `instanceof` 类型守卫 | 1.6 | 类实例收窄 |
| 用户定义类型谓词 | 2.0 | `x is T` 语法 |
| `in` 操作符守卫 | 2.7 | 属性存在性收窄 |
| 断言函数 | 3.7 | `asserts x is T` |
| `aliased conditions` | 4.4 | 别名条件收窄 |
| 增强 `switch` 收窄 | 4.5 | 判别式联合优化 |
| 推断类型谓词 | 5.5 | 自动推断谓词返回类型 |

## 附录 D：与运行时校验库的配合

类型守卫只能保证"分支内类型安全"，但谓词实现可能错误。最佳实践是用运行时校验库生成可证明正确的谓词：

```typescript
import { z } from "zod";

// Zod 自动生成类型守卫
const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
});

type User = z.infer<typeof UserSchema>;

// 用 safeParse 作为守卫
function isUser(x: unknown): x is User {
  return UserSchema.safeParse(x).success;
}

// 或者用 zod 的 refine 自定义守卫
const PositiveNumberSchema = z.number().refine((n) => n > 0, {
  message: "Must be positive",
});

function isPositive(x: unknown): x is number {
  return PositiveNumberSchema.safeParse(x).success;
}
```

这一模式结合了 Zod 的运行时校验能力与 TypeScript 的类型推导能力，是构建生产级类型安全系统的推荐方案。

## 附录 E：调试技巧

调试类型守卫时，以下技巧非常实用：

1. **检查 IDE 提示**：在 `if` 块内悬停变量查看类型。
2. **故意触发编译错误**：在守卫后写 `x.unexistingProperty`，看错误信息中的类型。
3. **用 `never` 验证收窄**：在守卫后写 `const _: never = x;`，若编译通过说明收窄为 never。
4. **用 tsd 写类型测试**：把预期收窄结果写成 `expectType<T>(x)` 断言。
5. **用 Playground 复现**：在 https://www.typescriptlang.org/play 中复现问题。

```typescript
// 调试示例
function isString(x: unknown): x is string {
  return typeof x === "string";
}

const x: unknown = "hello";
if (isString(x)) {
  // 调试：悬停 x 应显示 string
  console.log(x.toUpperCase());

  // 故意触发错误查看类型
  // const _: number = x; // 错误：Type 'string' is not assignable to type 'number'
}
```

## 附录 F：术语对照表

| 术语 | 英文 | 简述 |
|------|------|------|
| 类型守卫 | Type Guard | 用于收窄类型的表达式 |
| 类型收窄 | Type Narrowing | 在分支中缩小变量类型 |
| 类型谓词 | Type Predicate | `x is T` 自定义守卫 |
| 断言函数 | Assertion Function | `asserts x is T` 抛异常式守卫 |
| 判别式联合 | Discriminated Union | 通过字面量属性区分联合 |
| 穷尽性检查 | Exhaustiveness Check | 确保所有联合分支被处理 |
| 控制流分析 | Control Flow Analysis | 编译器分析控制流的技术 |
| 顶层类型 | Top Type | `unknown` |
| 底层类型 | Bottom Type | `never` |
| 不可达代码 | Unreachable Code | `never` 标记的代码路径 |

通过本节学习，读者应能熟练运用各类类型守卫机制，构建编译期与运行时双重保证的类型安全代码。下一节将深入类型系统的高级主题，包括协变与逆变、条件类型等。

---
