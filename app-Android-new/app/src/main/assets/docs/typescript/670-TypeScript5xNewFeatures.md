---
order: 670
title: TypeScript 5.x 新特性演进（5.0-5.9）
module: 'typescript'
category: 前端技术
difficulty: intermediate
description: 按 5.0 到 5.9 逐年串讲 TypeScript 的特性演进：const 类型参数、装饰器标准、using、推断类型谓词、import defer 与升级策略。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'typescript/680-TypeScript6And7CompilerEvolution'
  - 'typescript/180-SatisfiesOperator'
  - 'typescript/270-DecoratorDetailed'
prerequisites:
  - 'typescript/220-FunctionGeneric'
  - 'typescript/160-TypeInferenceDeepDive'
---

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

## 2. TypeScript 5.2（2023-09）：using 与显式资源管理

```typescript
function processFile(path: string) {
  using handle = openFile(path);       // 作用域结束自动调用 Symbol.dispose
  handle.read();
}                                      // 此处确定性释放，无需 try/finally
```

`using`/`await using` 为 JS 引入确定性资源释放语义，语言层面对应 `Disposable`/`AsyncDisposable` 接口。这是 5.2 最重要的一步，完整的运行时行为与落地进度见 `javascript/620-ExplicitResourceManagement`。

## 3. TypeScript 5.4（2024-03）：NoInfer 与闭包收窄保留

```typescript
function createPair<T>(first: T, second: NoInfer<T>): [T, T] {
  return [first, second];
}

const p = createPair('a', 'b');  // OK：T 从 first 推断为 string
createPair('a', 1);              // 报错：second 不再参与 T 的推断
```

`NoInfer<T>` 阻止某个位置参与泛型推断，用于"第一个参数定类型、其余参数必须匹配"的 API。同版本还改进了闭包内的类型收窄保留：`if (!x) return;` 之后创建的闭包里 `x` 不再被重新放宽。

## 4. TypeScript 5.5（2024-06）：推断类型谓词与正则检查

### 4.1 推断类型谓词（5.5 最具生产价值的变化）

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

### 4.2 其他

- **正则语法检查**：`tsc` 会解析正则字面量并报告语法错误，同时识别 `d`、`v` 等新标志；
- **`--isolatedDeclarations`**：要求每个导出都带显式类型注解，使声明文件可以"单文件生成"，服务打包器与转译器（如 Bun）的快速 dts 产出；
- **`${configDir}`**：tsconfig 模板变量，指向当前配置文件所在目录，方便 monorepo 共享基础配置；
- JSDoc 新增 `@import` 标签与 `@satisfies` 支持。

## 5. TypeScript 5.6（2024-09）：从"不可能代码"里揪出 Bug

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

## 6. TypeScript 5.7（2025-01）：目标与检查现代化

- **`--target es2024`**：正式支持 ES2024 目标与对应 `--lib`；
- **检查非空表达式后的收窄重写**：`if (x !== null)` 这类判空检查之后，`x` 的收窄结果在更多间接场景（重新读取、别名传递）中被保留；
- **导入路径预解析缓存**：模块路径的解析结果被缓存复用，增量构建与冷启动的开销显著下降。

## 7. TypeScript 5.8（2025-03）：拥抱 Node 类型剥离

### 7.1 --erasableSyntaxOnly

```typescript
// 开启后以下"运行时语法"全部报错：
enum Color { Red }                    // 枚举需要生成运行时代码
namespace Utils { ... }               // 命名空间同理
class A { constructor(private x: number) {} }  // 参数属性
// 只保留纯类型标注：类型标注可被"剥离"而非"编译"
```

Node.js 的原生类型剥离（type stripping）要求 `.ts` 文件只含可擦除语法，此开关让 `tsc` 提前帮你守住这条线。

### 7.2 其他

- `--module node18`：模拟 Node 18 的模块互操作行为（后续 5.9 又补上 `node20`，两者都是 `nodenext` 在特定 Node 大版本下的"冻结形态"，适合锁定运行时的服务端项目）；
- `--module nodenext` 下允许 `require()` 一个 ESM 模块（对应 Node 22 的 require(esm)）；
- return 表达式的分支级检查：条件分支返回值逐支对照声明类型，报错位置更准。

## 8. TypeScript 5.9（2025-08）：import defer 与 5.x 收官

### 8.1 import defer：延迟模块求值

```typescript
// 延迟求值模块：导入时不执行模块体，首次访问其属性才触发加载
import defer * as heavy from './heavy-module.js';
export function runWhenNeeded() { return heavy.compute(); }
// 对应仍处 TC39 Stage 3 的延迟模块求值（deferred module evaluation）提案
```

边界要注意：`import defer` 只对命名空间导入（`* as`）生效；被延迟模块的顶层副作用推迟到首次属性访问，但如果该模块同时被其他普通 `import` 引用，则会退化为立即执行。适合把"启动时的大依赖"（编辑器内核、图表库）推迟到真正使用的时刻。

### 8.2 其他

- **`--module node20`**：新增 node20 模块策略，与 5.8 的 `node18` 配套，覆盖主流 LTS 运行时；
- **`dom.iterable` 类型全面化**：`NodeList`、`FormData`、`Headers` 等集合类型的可迭代能力在类型层面补齐；
- **可缩小的 async 回调返回类型**：泛型 API 接受 async 回调时，其返回类型会参考上下文期望的 `Promise<T>` 形态参与收窄，减少手动注解；
- `tsc --init` 全新设计：生成的 tsconfig 只保留推荐默认值，注释指向文档；
- 编辑器悬停类型支持展开：联合类型在悬停卡片中可逐个查看成员。

## 9. TypeScript 6.0（2026-03）：语言层面的收官

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

## 10. 升级策略

1. **不要跳版本**：5.x 各版本破坏性极小，`typescript` 直接升到 5.9.x 通常只需处理少量类型错误；
2. **新开关按需逐个开**：`strictNullChecks`/`noUncheckedIndexedAccess` 类家族之外，`isolatedDeclarations`、`erasableSyntaxOnly`、`noUncheckedSideEffectImports` 都属于"先评估再开启"；
3. **面向 6.x/7.x 提前铺路**：6.0 把 `strict` 设为默认、`target` 滚动到 es2025（详见 `typescript/680-TypeScript6And7CompilerEvolution`），现在显式写全 tsconfig 关键项，迁移成本最低；
4. **库作者优先**：`isolatedDeclarations` + `verbatimModuleSyntax` 越早开，声明产出越健壮。

## 11. 动手试试

1. 写一个 `defineConfig<const T>` 并验证推断结果与手写 `as const` 一致；
2. 用 `using` 重写一个临时文件清理逻辑，对比 try/finally 版本；
3. 找一个 `filter(Boolean)` 场景，升级到 5.5+ 后删掉手写类型谓词；
4. 用 `import defer` 延迟一个重依赖模块，在 DevTools 里观察模块体何时真正执行；
5. 在实验分支开启 `--erasableSyntaxOnly`，清点项目里枚举与参数属性的数量，评估 Node 类型剥离的迁移面。

## 12. 一句话记住

> 5.0-5.2 立语法（const 泛型、标准装饰器、using），5.4-5.5 强推断（NoInfer、推断谓词、isolatedDeclarations），5.6-5.8 收检查贴运行时（不可能代码、类型剥离），5.9 引入 import defer、6.0 补齐 es2025/Temporal 类型——然后一切为 6.0/7.0 的编译器换代让路。
