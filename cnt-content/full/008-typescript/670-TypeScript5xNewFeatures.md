---
order: 730
title: TypeScript 5.x 新特性演进（5.0-5.9）
module: 'typescript'
category: 前端技术
difficulty: intermediate
description: 按 5.0 到 5.9 逐年串讲 TypeScript 的特性演进：const 类型参数、装饰器标准、using、推断类型谓词、import defer 与升级策略。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'typescript/680-TypeScript6And7CompilerEvolution'
  - 'typescript/180-SatisfiesOperator'
  - 'typescript/270-DecoratorDetailed'
prerequisites:
  - 'typescript/220-FunctionGeneric'
  - 'typescript/160-TypeInferenceDeepDive'
---

## 知识点地图

- **知识类别**：TypeScript 版本演进——5.0 到 6.0 逐年特性串讲与升级策略。
- **解决什么问题**：新特性散落在每年的发布公告里，团队不知道"哪些值得追、哪些要等生态"。本篇按年份给出全景与取舍。
- **什么时候用到**：升级 TypeScript 版本前盘点收益；代码评审里有人用了不认识的新语法时对号；规划库的最低 TS 版本要求时。
- **分工提示**：5.x 各特性的完整用法在其专篇（satisfies 见 180、装饰器见 270/280、using 见 javascript/620）；本篇是时间轴视角的索引与速查。
## 0. 一句话理解

> 5.0 打地基（const 类型参数、标准装饰器），5.2-5.5 补推断（NoInfer、推断类型谓词、isolatedDeclarations），5.6-5.7 收紧检查（迭代器、空值判断），5.8-5.9 拥抱现代运行时（可擦除语法、require(esm)、import defer）。6.0 之后编译器换代，语言层面趋于稳定。

## 1. TypeScript 5.0（2023-03）：三块基石

### 1.1 const 类型参数

```typescript
function defineConfig<const T extends object>(config: T) { return config; }

const conf = defineConfig({ mode: 'production', level: 3 });
//    ^? { readonly mode: "production"; readonly level: 3 }
// 没有 const 时，mode 被拓宽为 string、level 为 number
```

泛型标记 `const` 后，字面量以"最深字面量 + readonly"的形式推断，是写库函数（配置、路由表）的利器。

### 1.2 装饰器进入标准（Stage 3 实现）

5.0 起装饰器实现完全对齐 TC39 Stage 3 提案：参数从三个改为两个（`value, context`），类方法、访问器、字段、getter/setter 均可装饰。旧版实验性装饰器（`experimentalDecorators`）继续保留但已非主线。对比与实践见 `typescript/280-DecoratorStandardImpl`。

### 1.3 其他

- `--moduleResolution bundler`：为 Vite/esbuild 等打包器定制的模块解析策略；
- `--verbatimModuleSyntax`：导入语句原样保留，`import type` 语义更严格（详见 `typescript/320-ImportTypeVerbatimModuleSyntax`）；
- 所有枚举、`--target` 与泛型运算符的性能优化。

### 1.4 速查卡：const 类型参数

> 进阶预览（第一遍可跳过）：从这里到文件末尾是 TS 5.x 以来的新特性速览，包括 const 类型参数、satisfies、using、NoInfer、类型谓词推断等。它们解决的是"类型更精确"的进阶问题，零基础第一遍读到上面的"9. 总结"即可，等做过小项目、写过真实类型后再回来读，会更容易理解。这些章节编号（5.0/5.2/5.3……）是历史追加形成的，与前面的正文章节号不连续，不影响阅读顺序。

**基本写法：const 泛型参数**
`function <名><const T extends <约束>>(<参数>: T)`
```typescript
// 推断字面量类型而非放宽
function pickFirst<const T>(arr: readonly T[]): T {
  return arr[0];
}
const r = pickFirst(["red", "green"]); // "red" | "green"
```

**讲解：**

1. `<const T>` 告诉编译器"不要放宽推断"：`["red", "green"]` 被推断为字面量联合 `"red" | "green"` 而不是 `string`。
2. `readonly T[]` 表示只读数组参数，函数内不能修改元素。
3. 返回值 `T` 保留调用时的精确类型，是"配置对象、路由表"等场景的常用技巧。

---

**基本写法：const 配合元组**
`<const T extends readonly string[]>`
```typescript
// 保留元组字面量
function define<const T extends readonly string[]>(routes: T): T {
  return routes;
}
const c = define(["/home", "/about"]); // readonly ["/home", "/about"]
```

**讲解：**

1. `<const T extends readonly string[]>` 约束 T 必须是字符串数组，且保留"元组"形态。
2. 推断结果是 `readonly ["/home", "/about"]`：长度与每个位置的字符串都精确固定。
3. 之后遍历 `c` 时，每个元素都是具体的字面量类型，拼路由时不会丢失类型信息。

---

### 1.5 速查卡：satisfies 校验不放宽

> 版本注记：satisfies 于 TS 4.9 引入，5.0 时期随新工具链普及成为主流写法。完整讲解见 [satisfies 操作符专篇](/typescript/180-SatisfiesOperator)。

**基本写法：satisfies 校验不放宽**
`const <变量> = <值> satisfies <类型>`
```typescript
// 校验符合类型，保留具体字面量推断
const palette = {
  red: "#f00",
  green: [0, 255, 0],
} satisfies Record<string, string | number[]>;
palette.red;   // string（具体）
palette.green; // number[]
```

**讲解：**

1. `satisfies` 的作用是"校验但不改变推断"：对象必须符合 `Record<string, string | number[]>`，同时每个属性保留自己的具体类型。
2. `palette.red` 的类型是字面量 `"#f00"`（而不是 string），`palette.green` 是 `number[]`。
3. 对比直接标注 `: Record<...>`，satisfies 让使用方获得更精确的类型提示。

---

**基本写法：satisfies 与 as 区别**
`<值> satisfies <类型>`
```typescript
// as 断言可能撒谎，satisfies 强制校验
const m = { a: 1 } satisfies Record<"a", number>;
// const m = { a: 1 } satisfies Record<"a", string>; // 报错
```

**讲解：**

1. `as` 断言是"我保证它是对的"，类型不匹配时编译器可能放过，运行期才暴露问题。
2. `satisfies` 是"请检查我"：不符合类型就立刻报错，绝不撒谎。
3. 规则：能写 satisfies 就别写 as；as 只用于编译器确实无法推断的场景。

---

### 1.6 速查卡：标准装饰器与装饰器上下文

**基本写法：标准装饰器**
`@<装饰器> <类成员>`
```typescript
// 符合 TC39 Stage 3，无需 experimentalDecorators
function log(target: Function, ctx: ClassMethodDecoratorContext) {
  return function (this: unknown, ...args: unknown[]) {
    console.log(ctx.name, args);
    return target.apply(this, args);
  };
}
class S { @log greet() { return "hi"; } }
```

**讲解：**

1. 这是标准装饰器（TC39 Stage 3 语义），不需要开启 `experimentalDecorators`。
2. 装饰器函数接收 `target`（被装饰的方法）与 `ctx`（上下文，含方法名），返回包装函数。
3. `@log greet()` 表示给 `greet` 方法套上日志：每次调用先打印方法名与参数，再执行原方法。
4. `return target.apply(this, args)` 保持 `this` 与参数原样传递，这是装饰器的标准收尾。

---

**基本写法：装饰器上下文对象**
`<ctx>: ClassMethodDecoratorContext`
```typescript
// 上下文提供 name/kind/addInitializer 等
function bound(target: Function, ctx: ClassMethodDecoratorContext) {
  ctx.addInitializer(function (this: unknown) {
    (this as Record<string, unknown>)[ctx.name as string] =
      target.bind(this);
  });
}
```

**讲解：**

1. `ctx`（ClassMethodDecoratorContext）提供 `name`、`kind`、`addInitializer` 等成员。
2. `addInitializer` 在实例初始化时执行：示例把方法绑定到实例，实现"自动 bind"。
3. `(this as Record<string, unknown>)` 是类型断言：给未知结构的 this 添加索引访问能力。

---

### 1.7 速查卡：satisfies + const 组合

**基本写法：校验且保留字面量**
`<值> satisfies <类型>` + `function f<const T>`
```typescript
// 配置对象校验且保留字面量联合
function config<const T extends Record<string, string>>(c: T): T { return c; }
const c = config({
  home: "/",
  api: "/api",
} satisfies Record<string, string>);
c.home; // "/" 字面量
```

**讲解：**

1. `<const T extends Record<string, string>>` 保留传入对象的字面量类型，同时约束所有值必须是 string。
2. `satisfies` 在参数处校验：`c` 满足 `Record<string, string>`，且每个属性保留 `"/"`、`"/api"` 字面量。
3. 组合效果：写错配置（如值为数字）会报错，读 `c.home` 时又得到精确类型。

---

## 2. TypeScript 5.2（2023-09）：using 与显式资源管理

```typescript
function processFile(path: string) {
  using handle = openFile(path);       // 作用域结束自动调用 Symbol.dispose
  handle.read();
}                                      // 此处确定性释放，无需 try/finally
```

`using`/`await using` 为 JS 引入确定性资源释放语义，语言层面对应 `Disposable`/`AsyncDisposable` 接口。这是 5.2 最重要的一步，完整的运行时行为与落地进度见 `javascript/620-ExplicitResourceManagement`。

### 2.1 速查卡：using 与 await using

**基本写法：同步资源管理**
`using <变量> = <带 Symbol.dispose>`
```typescript
// 离开作用域自动释放
function read() {
  using f = openFile("./a.txt");
  // 作用域结束调用 [Symbol.dispose]
}
```

**讲解：**

1. `using` 是"同步资源管理"语法：变量离开作用域时自动调用其 `[Symbol.dispose]` 方法。
2. 示例里 `openFile` 返回带释放逻辑的对象，函数结束时文件自动关闭，无需手写 try/finally。
3. 对应提案已进入主流运行时，TS 5.2+ 提供类型支持。

---

**基本写法：异步资源管理**
`await using <变量> = <带 Symbol.asyncDispose>`
```typescript
// 异步自动清理
async function run() {
  await using conn = await db.connect();
  // 自动 await [Symbol.asyncDispose]
}
```

**讲解：**

1. `await using` 是异步版本：离开作用域时自动 `await` 资源的 `[Symbol.asyncDispose]` 方法。
2. `await using conn = await db.connect()`：右侧先连接数据库，`conn` 在作用域结束时自动断开。
3. 适合数据库连接、流、锁等"用完必须清理"的资源。

---

---
## 3. TypeScript 5.3（2023-11）：switch(true) 收窄

5.3 的语言层主角有两个：switch (true) 的类型收窄，以及 import attributes（`import data from "./x.json" with { type: "json" }`）从提案转正。速查卡（承接自 030 概述篇）：

**基本写法：switch(true) 类型收窄**
`switch (true) { case <条件>: ... }`
```typescript
// 每个 case 体内自动收窄
function desc(v: unknown) {
  switch (true) {
    case typeof v === "string": return v.toUpperCase();
    case typeof v === "number": return v.toFixed(2);
    default: return "unknown";
  }
}
```

**讲解：**

1. `switch (true)` 不是比较某个变量，而是让每个 `case` 写"布尔条件"，从上到下找第一个为真的分支。
2. 每个 case 体内变量 `v` 自动收窄：`typeof v === "string"` 成立后，`v.toUpperCase()` 合法。
3. 相比 if/else 链，这种写法让"多个互斥条件"的结构更整齐。

---

把这张卡放进 5.3 的原因是：switch(true) 收窄正是 5.3 发布说明里列出的行为变化——此前每个 case 体内的 typeof 判断不会联动收窄，必须写成 if/else 链才有效；5.3 起两条路径等价，可以按可读性自由选择。

---

## 4. TypeScript 5.4（2024-03）：NoInfer 与闭包收窄保留

```typescript
function createPair<T>(first: T, second: NoInfer<T>): [T, T] {
  return [first, second];
}

const p = createPair('a', 'b');  // OK：T 从 first 推断为 string
createPair('a', 1);              // 报错：second 不再参与 T 的推断
```

`NoInfer<T>` 阻止某个位置参与泛型推断，用于"第一个参数定类型、其余参数必须匹配"的 API。同版本还改进了闭包内的类型收窄保留：`if (!x) return;` 之后创建的闭包里 `x` 不再被重新放宽。

### 4.1 速查卡：NoInfer 与闭包保留收窄

**基本写法：阻止推断**
`NoInfer<<T>>`
```typescript
// 不从该位置推断 T，仅校验
function withDefault<T>(v: T | undefined, fb: NoInfer<T>): T {
  return v ?? fb;
}
const r = withDefault("hi", "x"); // T = string
// withDefault("hi", 42); // 报错：number 不能赋给 string
```

**讲解：**

1. `NoInfer<T>` 是 TS 5.4 新增工具类型：声明"不要从我这个位置推断 T"。
2. 示例里 T 只由第一个参数 `v` 推断为 `string`，第二个参数 `fb` 仅做校验。
3. 若没有 NoInfer，`withDefault("hi", 42)` 可能把 T 推断成 `string | number`，错误被放过。

---

**基本写法：闭包内保留 narrowing**
`const <fn> = () => <使用收窄变量>`
```typescript
// 5.4 修复闭包内类型丢失
function fn(v: string | null) {
  if (v === null) return;
  const cb = () => v.toUpperCase(); // v 已收窄为 string
  return cb();
}
```

**讲解：**

1. TS 5.4 之前，闭包内捕获的变量可能丢失收窄信息（v 被当成 string | null）。
2. 5.4 起，`if (v === null) return;` 之后的闭包 `() => v.toUpperCase()` 能确认 `v` 是 string。
3. 这个修复让"先判断、再在回调里使用"的安全模式真正生效。

---

---

## 5. TypeScript 5.5（2024-06）：推断类型谓词与正则检查

### 5.1 推断类型谓词（5.5 最具生产价值的变化）

```typescript
function isNotNull<T>(value: T | null): boolean {
  return value !== null;
}

const list: Array<string | null> = ['a', null, 'b'];
const filtered = list.filter(isNotNull);
//    ^? string[] —— 5.4 及之前是 (string | null)[]

// 5.5 能从实现自动推断出 value is T 谓词，filter 后自动收窄
```

箭头函数写法同样生效：`list.filter(x => x !== null)` 的结果直接是 `string[]`。

### 5.2 其他

- **正则语法检查**：`tsc` 会解析正则字面量并报告语法错误，同时识别 `d`、`v` 等新标志；
- **`--isolatedDeclarations`**：要求每个导出都带显式类型注解，使声明文件可以"单文件生成"，服务打包器与转译器（如 Bun）的快速 dts 产出；
- **`${configDir}`**：tsconfig 模板变量，指向当前配置文件所在目录，方便 monorepo 共享基础配置；
- JSDoc 新增 `@import` 标签与 `@satisfies` 支持。

### 5.3 速查卡：自动推断类型谓词

**基本写法：自动推断 is**
`function <f>(<x>): <TypePredicate>`
```typescript
// 返回布尔值自动推断为类型谓词
const isString = (x: unknown) => typeof x === "string";
const arr = [1, "a"].filter(isString); // string[]
```

**讲解：**

1. `(x: unknown) => typeof x === "string"` 返回布尔值，TS 5.5 起自动识别为类型谓词 `x is string`。
2. `filter` 使用该谓词后，结果数组类型从 `(string | number)[]` 收窄为 `string[]`。
3. 以前必须手写 `: x is string` 标注，现在编译器能自己推断。

---

---

## 6. TypeScript 5.6（2024-09）：从"不可能代码"里揪出 Bug

```typescript
// 5.6 起直接报错：条件恒真
if (/0x[0-9a-f]/.test(input)) { ... }   // RegExp 对象永远为真
while (true) { ... }                    // 仍允许：这是有意的无限循环

// 迭代器辅助方法的严格检查：遗漏 return 会提前报错
function* naturals(): Generator<number> {
  let n = 0;
  while (true) yield n++;
}
```

- **`--noUncheckedSideEffectImports`**：`import './foo.css'` 这类副作用导入默认不检查存在性，开启后拼错路径立即报错；
- **`--noCheck`**：跳过类型检查但完整产出（配合 `tsc --build` 拆分"快速构建"与"完整检查"）；
- 类型层完整支持 ES2025 的迭代器辅助方法（`IteratorObject` 泛型）。

### 6.1 速查卡：离散联合与迭代器辅助方法

**基本写法：离散联合类型**
`type <名> = { ... } | { ... }`
```typescript
// 成员间无公共字段时更严格检查
type A = { kind: "a"; x: number };
type B = { kind: "b"; y: string };
type U = A | B;
```

**讲解：**

1. `A` 与 `B` 是"离散联合"：两个成员没有公共字段（除了没有共同的 kind 判别）。
2. TS 5.6 对这种联合做更严格的检查：操作时必须先区分是哪种成员。
3. 实际项目中更常见"可辨识联合"（每个成员带 kind 字段），用 `switch (u.kind)` 收窄。

---

**基本写法：Iterator Helpers 类型**
`<iterator>.map(<fn>).filter(<fn>)`
```typescript
// 内置 Iterator 类型支持链式
function* gen() { yield 1; yield 2; }
const r = gen().map(x => x * 2).filter(x => x > 2).toArray(); // [4]
```

**讲解：**

1. `function* gen()` 是生成器：逐个 `yield` 出 1 和 2。
2. Iterator Helpers（ES2025）给迭代器加了 `.map/.filter/.toArray` 等链式方法。
3. 流程：1→2 变成 2→4，过滤大于 2 留下 4，`toArray()` 输出 `[4]`。

---

这张卡与上文第 6 节的"不可能代码检查"是 5.6 的两件事：前者是类型层面的联合检查与 ES2025 迭代器辅助方法的类型支持，后者是编译器对恒真条件的报错。两者在官方发布说明里并列，初读时容易误当成一个特性。

---

## 7. TypeScript 5.7（2025-01）：目标与检查现代化

- **`--target es2024`**：正式支持 ES2024 目标与对应 `--lib`；
- **检查非空表达式后的收窄重写**：`if (x !== null)` 这类判空检查之后，`x` 的收窄结果在更多间接场景（重新读取、别名传递）中被保留；
- **导入路径预解析缓存**：模块路径的解析结果被缓存复用，增量构建与冷启动的开销显著下降。

## 8. TypeScript 5.8（2025-03）：拥抱 Node 类型剥离

### 8.1 --erasableSyntaxOnly

```typescript
// 开启后以下"运行时语法"全部报错：
enum Color { Red }                    // 枚举需要生成运行时代码
namespace Utils { ... }               // 命名空间同理
class A { constructor(private x: number) {} }  // 参数属性
// 只保留纯类型标注：类型标注可被"剥离"而非"编译"
```

Node.js 的原生类型剥离（type stripping）要求 `.ts` 文件只含可擦除语法，此开关让 `tsc` 提前帮你守住这条线。

### 8.2 其他

- `--module node18`：模拟 Node 18 的模块互操作行为（后续 5.9 又补上 `node20`，两者都是 `nodenext` 在特定 Node 大版本下的"冻结形态"，适合锁定运行时的服务端项目）；
- `--module nodenext` 下允许 `require()` 一个 ESM 模块（对应 Node 22 的 require(esm)）；
- return 表达式的分支级检查：条件分支返回值逐支对照声明类型，报错位置更准。

## 9. TypeScript 5.9（2025-08）：import defer 与 5.x 收官

### 9.1 import defer：延迟模块求值

```typescript
// 延迟求值模块：导入时不执行模块体，首次访问其属性才触发加载
import defer * as heavy from './heavy-module.js';
export function runWhenNeeded() { return heavy.compute(); }
// 对应仍处 TC39 Stage 3 的延迟模块求值（deferred module evaluation）提案
```

边界要注意：`import defer` 只对命名空间导入（`* as`）生效；被延迟模块的顶层副作用推迟到首次属性访问，但如果该模块同时被其他普通 `import` 引用，则会退化为立即执行。适合把"启动时的大依赖"（编辑器内核、图表库）推迟到真正使用的时刻。

### 9.2 其他

- **`--module node20`**：新增 node20 模块策略，与 5.8 的 `node18` 配套，覆盖主流 LTS 运行时；
- **`dom.iterable` 类型全面化**：`NodeList`、`FormData`、`Headers` 等集合类型的可迭代能力在类型层面补齐；
- **可缩小的 async 回调返回类型**：泛型 API 接受 async 回调时，其返回类型会参考上下文期望的 `Promise<T>` 形态参与收窄，减少手动注解；
- `tsc --init` 全新设计：生成的 tsconfig 只保留推荐默认值，注释指向文档；
- 编辑器悬停类型支持展开：联合类型在悬停卡片中可逐个查看成员。

### 9.3 速查卡：import defer 与 node20 模块解析

**基本写法：延迟导入**
`import defer * as <名> from "<模块>"`
```typescript
// 首次使用时才求值
import defer * as lib from "./heavy";
// 用到 lib 时才执行模块
export function use() { return lib.foo(); }
```

**讲解：**

1. `import defer * as lib` 是延迟导入：`./heavy` 模块不会立即执行，首次访问 `lib` 时才求值。
2. 适合"体积大但未必用得上"的模块（如重型工具库），能缩短启动时间。
3. 与动态 `import()` 的区别：`import defer` 仍是静态依赖，模块关系可被构建工具静态分析。

---

**基本写法：node20 模块解析**
`"moduleResolution": "node20"`
```json
{
  "compilerOptions": {
    "module": "node20",
    "moduleResolution": "node20"
  }
}
```

**讲解：**

1. `"module": "node20"` 与 `"moduleResolution": "node20"` 配对使用，对齐 Node.js 20+ 的模块解析规则。
2. node20 解析同时支持 ESM 与 CJS 的导入导出规则，`package.json` 的 `type` 字段决定文件按哪种模块处理。
3. Node 22 LTS 环境与这套配置完全兼容。

---

---

## 10. TypeScript 6.0（2026-03）：语言层面的收官

6.0 定位是"桥梁版本"：编译器 API 与 5.9 完全兼容，重心在默认值现代化与弃用清理（完整迁移指南见 `typescript/680-TypeScript6And7CompilerEvolution`）。语言与类型层面同样有一批正向变化，值得在 5.x 视角下记录：

```typescript
// target/lib es2025：ES2025 内建 API 的类型定义就位
const safe = RegExp.escape("a.b(c)");   // 正则元字符转义（ES2025）

// Temporal：Stage 4 定稿后的现代日期时间 API，经 esnext.temporal 提供
const now = Temporal.Now.instant();

// upsert 家族：键不存在则插入，存在则原样返回
const m = new Map<string, number>();
m.getOrInsert("hits", 0);
m.getOrInsertComputed("ts", () => Date.now());
```

- **`#/` 子路径导入**：`module: nodenext` 与 `bundler` 下支持 package.json `imports` 字段声明的包内私有路径；
- **`moduleResolution: bundler` 可与 `module: commonjs` 组合**，打包器 + CJS 产物的项目不再被选项约束卡住；
- **`--stableTypeOrdering`**：诊断信息里类型的展示顺序稳定化（7.0 默认开启且不可关闭）；
- **`dom` 库并入 `dom.iterable` / `dom.asynciterable`**：`"lib": ["dom"]` 自动获得集合迭代能力。

6.0 之后语言特性趋近冻结，团队重心转向 Go 原生编译器（TypeScript 7.0，详见 `typescript/680-TypeScript6And7CompilerEvolution`）。

## 11. 升级策略

1. **不要跳版本**：5.x 各版本破坏性极小，`typescript` 直接升到 5.9.x 通常只需处理少量类型错误；
2. **新开关按需逐个开**：`strictNullChecks`/`noUncheckedIndexedAccess` 类家族之外，`isolatedDeclarations`、`erasableSyntaxOnly`、`noUncheckedSideEffectImports` 都属于"先评估再开启"；
3. **面向 6.x/7.x 提前铺路**：6.0 把 `strict` 设为默认、`target` 滚动到 es2025（详见 `typescript/680-TypeScript6And7CompilerEvolution`），现在显式写全 tsconfig 关键项，迁移成本最低；
4. **库作者优先**：`isolatedDeclarations` + `verbatimModuleSyntax` 越早开，声明产出越健壮。

## 12. 动手试试

1. 写一个 `defineConfig<const T>` 并验证推断结果与手写 `as const` 一致；
2. 用 `using` 重写一个临时文件清理逻辑，对比 try/finally 版本；
3. 找一个 `filter(Boolean)` 场景，升级到 5.5+ 后删掉手写类型谓词；
4. 用 `import defer` 延迟一个重依赖模块，在 DevTools 里观察模块体何时真正执行；
5. 在实验分支开启 `--erasableSyntaxOnly`，清点项目里枚举与参数属性的数量，评估 Node 类型剥离的迁移面。

## 12. 动手试试

任务（先自己完成，再展开参考实现）：

1. 写一个 `defineConfig<const T>` 并验证推断结果与手写 `as const` 一致；
2. 用 `using` 重写一个临时文件清理逻辑，对比 try/finally 版本；
3. 找一个 `filter(Boolean)` 场景，升级到 5.5+ 后删掉手写类型谓词；
4. 用 `import defer` 延迟一个重依赖模块，在 DevTools 里观察模块体何时真正执行；
5. 在实验分支开启 `--erasableSyntaxOnly`，清点项目里枚举与参数属性的数量，评估 Node 类型剥离的迁移面。

提示：第 1 题用 550 篇的 `Equal/Expect` 写类型断言；第 2 题需要一个带 `[Symbol.dispose]` 的对象；第 3 题重点观察 `filter(x => x !== null)` 的返回类型悬停。

<details>
<summary>参考实现（第 1~3 题核心代码，先做完再对照）</summary>

```typescript
// 1：const 类型参数 vs as const
function defineConfig<const T extends Record<string, string>>(c: T): T { return c; }
const a = defineConfig({ home: "/" });        // { readonly home: "/" }
const b = { home: "/" } as const;             // { readonly home: "/" }
type Expect<T extends true> = T;
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
  ? true : false;
type _same = Expect<Equal<typeof a, typeof b>>; // 编译通过即一致

// 2：using 版（对比 try/finally：少一层嵌套，异常路径也会释放）
{
  using tmp = {
    path: "/tmp/w03-demo.txt",
    [Symbol.dispose]() { console.log("cleaned:", this.path); },
  };
  // 使用 tmp …… 作用域结束自动调用 Symbol.dispose
}

// 3：5.5 前后对比
const mixed: Array<string | null> = ["a", null, "b"];
// 5.4：const names0 = mixed.filter((x): x is string => x !== null);
const names = mixed.filter((x) => x !== null); // 5.5+：直接 string[]
```

</details>

## 13. 一句话记住

> 5.0-5.2 立语法（const 泛型、标准装饰器、using），5.4-5.5 强推断（NoInfer、推断谓词、isolatedDeclarations），5.6-5.8 收检查贴运行时（不可能代码、类型剥离），5.9 引入 import defer、6.0 补齐 es2025/Temporal 类型——然后一切为 6.0/7.0 的编译器换代让路。
