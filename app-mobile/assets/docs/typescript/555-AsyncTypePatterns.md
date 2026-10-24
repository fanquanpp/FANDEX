---
order: 590
title: 异步类型模式
module: 'typescript'
category: 前端技术
difficulty: beginner
description: async 函数返回值的推断规则、Awaited 的语义（复用 infer 篇的 MyAwaited）、PromiseLike 与 thenable、catch 分支 unknown 的处理，以及轮询与事件回调中的异步类型陷阱。
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：异步（async/await/Promise）的**类型层**——TS 如何给 async 函数、await 表达式、try/catch 分支定类型。
- **解决什么问题**：「我 return 了 number，函数签名怎么是 `Promise<number>`」；封装库时如何从「别人的函数类型」里取出真正的返回值类型；`catch (e)` 里 e 为什么是 `unknown` 怎么用；把 async 回调直接塞进事件监听器时错误被静默吞掉。
- **什么时候用到**：写任何 `async` 函数；写 `fetch` 封装、重试/轮询工具；给 DOM 事件、定时器、数组回调（`map`/`forEach`）传异步函数时。

## 前置知识

- [类型推断深入](/typescript/160-TypeInferenceDeepDive)：推断的基本规则
- [infer 类型深潜](/typescript/450-TypeCompositionPractice)：本文 Awaited 一节的实现基础

## 1. async 函数返回值必为 Promise

规则一句话：**`async` 函数的返回类型永远是「你写什么，包一层 Promise」**。

```typescript
async function one(): Promise<number> { return 1; }
async function two() { return 1; }        // 推断为 Promise<number>
async function three() { return; }        // 推断为 Promise<void>
async function four() { throw new Error(); } // 推断为 Promise<never>
```

推断细节：

- `return 1` 在 async 函数里被理解为 `return Promise.resolve(1)` 的等价形式，所以类型是 `Promise<number>` 而不是 `number`。
- `throw` 的分支在类型里体现为 `Promise<never>`——`never` 在联合里消失，调用方看到的就是成功类型（失败通过 reject 走，不在类型里体现）。这与[Never 类型语义](/typescript/190-NeverTypeSemantics)的「never 是底部类型」一脉相承。
- 显式注解返回类型是推荐写法：async 函数体很长时，人眼追溯「最终返回什么」容易错，签名上的 `Promise<X>` 是最便宜的自检。

常见报错对照：

```typescript
async function bad(): Promise<number> {
  return 1;
}
const a = bad();      // Promise<number>
const b = await bad(); // number（await 解包一层）
const c = await a;    // number
const d: number = a;  // 错误！Promise<number> 不能赋给 number
```

## 2. Awaited：从类型里解包 Promise

`await` 在类型层的对应物是内置工具类型 `Awaited<T>`：

```typescript
type A = Awaited<Promise<number>>;       // number
type B = Awaited<Promise<Promise<string>>>; // string（递归解包）
type C = Awaited<number | Promise<number>>;  // number（联合里逐个解包）
```

它的手写实现（递归 + `then` 特征判别）已在[infer 类型深潜](/typescript/450-TypeCompositionPractice)第 3 节「MyAwaited 复刻」完整展开，本文不重复实现，只记两条结论：

1. **递归解包**：`Promise<Promise<T>>` 一层 await 即得 T，因为 thenable 链会自动展平；
2. **联合分布**：`Awaited<A | B>` 会分别解包每个成员再联合——这让你能对「可能返回 Promise 也可能返回裸值」的旧接口统一收型。

工程中更常用的名字是自造的 `UnwrapPromise`（语义别名，实现同 Awaited）：

```typescript
type UnwrapPromise<T> = Awaited<T>;

// 用途：从「别人的异步函数类型」里抽出真实返回值
declare function loadConfig(): Promise<{ host: string; port: number }>;

type Config = UnwrapPromise<ReturnType<typeof loadConfig>>;
// { host: string; port: number }
```

这条 `ReturnType` + `Awaited` 的组合是「从函数类型反查数据类型」的固定搭配，比手抄一遍接口防漂移。

## 3. PromiseLike 与 thenable

`PromiseLike<T>` 是 Promise 的**最小类型面**——只有一个 `then`：

```typescript
interface PromiseLike<T> {
  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2>;
}
```

为什么存在它：**你的库不该强迫使用者用原生 Promise**。任何有 `.then` 方法的对象（thenable）都满足这个接口——旧版 Bluebird 实例、自定义惰性求值对象都能传进来：

```typescript
// 库函数签名：用 PromiseLike 而不是 Promise
async function resolveValue<T>(value: T | PromiseLike<T>): Promise<T> {
  return value;   // await 语义自动展开 thenable
}

resolveValue(Promise.resolve(1));    // 原生 Promise，OK
resolveValue({ then: (onOk) => onOk(42) }); // 裸 thenable，OK
resolveValue(1);                     // 裸值也接受（T 直接命中）
```

写成 `Promise<T>` 参数会怎样：裸 thenable 传不进来，调用方被迫先包一层 `Promise.resolve`——接口可用性下降。反向注意：**返回值仍建议写 `Promise<T>`**，返回 thenable 会把「这个值是 Promise」的类型信息藏进 then 方法里，`await` 之后虽然类型正确，但调用方想 `.catch` 时补全不可用。

## 4. catch 分支是 unknown

TypeScript 4.4 起，`catch (e)` 的 `e` 默认类型是 `unknown`（由 `useUnknownInCatchVariables` 控制，`strict` 家族包含它）：

```typescript
try {
  await save();
} catch (e) {
  console.log(e.message);  // 错误！e 是 unknown
}
```

为什么这样设计：JS 允许 `throw` 任何值（字符串、数字、对象）。TS 无法保证捕获到的是 `Error` 实例，`any` 会纵容「假设它是 Error」的默认错误。处理三板斧：

```typescript
// 方案一：instanceof 收窄（首选，语义准确）
try {
  await save();
} catch (e) {
  if (e instanceof Error) {
    console.error(e.message);
  } else {
    console.error("unknown error", e);
  }
}

// 方案二：自定义类型守卫（项目里统一 error 形态时）
interface ApiError {
  code: number;
  message: string;
}
function isApiError(e: unknown): e is ApiError {
  return typeof e === "object" && e !== null && "code" in e && "message" in e;
}

// 方案三：结构检查 + String() 兜底（工具函数风格）
function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return String(e);
}
```

关掉这个检查（`useUnknownInCatchVariables: false`）换回 `any` 是可行但下策——所有 catch 分支重新变成「编译器闭嘴区」。错误形态统一、收窄封装成工具函数（如上面的 `errorMessage`）是一次性投入，全项目受益。

## 5. 泛型 async 函数

泛型与 async 组合时，返回类型写法有一个易错点：

```typescript
// 正确：返回 Promise<T>，T 由调用方数据决定
async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  return (await res.json()) as T;
}

const user = await fetchJson<{ id: number; name: string }>("/api/user");
// user: { id: number; name: string }
```

易错点：写成 `async function fetchJson<T>(): Promise<T>` 却在函数体里 `as T` 之外的任何地方出现具体类型，T 就成了「只写不读」的幽灵参数。判断 T 是否健康：**调用处能否从实参推断出 T**？上面例子 T 只能靠显式指定——这是「运行时才知道形状」的场景，可接受；若能改为 `fetchJson("/api/user" as const)` 由 URL 字面量映射出类型（URL 到类型的映射见[类型安全 API 客户端](/typescript/570-TypeSafeAPIClient)），比手写泛型实参更防错。

泛型 async 的返回类型还要注意「Promise 包几层」：

```typescript
// 错误：async + Promise 双重包裹
async function bad<T>(): Promise<Promise<T>> { ... }  // 类型报错提示
// TS 会提示实际类型是 Promise<T>——async 函数自动展平嵌套 Promise

// 正确
async function good<T>(): Promise<T> { ... }
```

## 6. 例子一：fetch 封装里的 await 解包与错误归一（真实工程场景）

一个生产级的 fetch 封装，把第 2-4 节的知识全部用上：

```typescript
interface ApiEnvelope<T> {
  code: number;
  data: T;
  message: string;
}

class ApiError extends Error {
  constructor(readonly code: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, init);
  } catch (e) {
    // 网络层失败：统一成 ApiError，调用方只处理一种错误
    throw new ApiError(-1, `network: ${errorMessage(e)}`);
  }
  const body = (await res.json()) as ApiEnvelope<T>;
  if (body.code !== 0) {
    throw new ApiError(body.code, body.message);
  }
  return body.data;
}

// 用 UnwrapPromise 从封装反查数据类型（第 2 节的固定搭配）
declare function getTodos(): Promise<Todo[]>;
type TodoList = Awaited<ReturnType<typeof getTodos>>;  // Todo[]

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}
```

逐段拆解：

- `catch (e)` 里的 e 是 unknown，走 `errorMessage` 工具收窄——而不是在 catch 里直接 `e as Error`。
- `(await res.json()) as T`：`res.json()` 返回 `Promise<any>`，`await` 后是 `any`，`as T` 是**断言**不是校验。运行时形状由后端契约保证；要求更强保证时接入运行时校验（见[运行时 Schema 校验](/typescript/660-RuntimeSchemaValidation)），类型层与运行时层各管一段。
- `class ApiError extends Error`：自定义错误类让 `instanceof ApiError` 收窄可用，调用方可以精确分支「业务错误 vs 网络错误」。

## 7. 例子二：定时器轮询回调的 async 处理（换图轮播的异步升级）

经典教学需求「点击换图后每半秒自动变换」（JS 综合考试卷第 3 题）的 TS 化，常常演进为「轮询接口检查新图」的异步版本。这里暴露定时器与 async 组合的第一陷阱：

```typescript
// 陷阱版：setInterval 的回调签名不认识 Promise
const timer = window.setInterval(async () => {
  const latest = await fetchLatestImage();
  img.src = latest;
}, 500);
```

这段代码能跑，但有三个类型层问题：

1. **回调返回的 `Promise<void>` 被丢弃**：`setInterval` 的 handler 类型是 `(...args: any[]) => void`，任何 Promise 返回值都被吞掉——错误没有 `.catch`，unhandled rejection 直接进 console 而不是你的错误处理。
2. **请求可能堆积**：接口 800ms 才返回时，500ms 的间隔会让请求排队，指数级堆积。
3. **清理时机**：async 回调未完成时 `clearInterval` 拦不住在途请求。

工程化修正版——自递归 setTimeout + try/catch 全覆盖：

```typescript
let stopped = false;
let inFlight = false;

async function pollImage(): Promise<void> {
  if (stopped || inFlight) return;  // 防堆积
  inFlight = true;
  try {
    const latest = await fetchLatestImage();
    img.src = latest;
  } catch (e) {
    log.warn(`poll failed: ${errorMessage(e)}`);  // 错误在这里被接住
  } finally {
    inFlight = false;
  }
  if (!stopped) {
    window.setTimeout(pollImage, 500);  // 上一次完成后才安排下一次
  }
}
pollImage();
```

回调返回 Promise 被吞是通用问题：所有「期望 `void` 返回」的回调位（`addEventListener`、`Array.prototype.map`、`forEach`）都一样——async 函数塞进去，返回的 Promise 没人 await。识别方法：**回调所在接口的类型签名返回值是 void 而 async 函数返回 Promise，就是被吞**。解法统一为「回调内自己 try/catch」，或走 TaskQueue 类的显式队列（把每次轮询变成可排队任务，类似[迭代器与生成器类型](/typescript/255-IterationProtocolTypes)第 6 节的任务队列）。

## 8. 例子三：事件处理器里的 async 与「吞错」实证

```typescript
const form = document.querySelector<HTMLFormElement>("#login");

// 陷阱：submit handler 返回的 Promise<void> 被 DOM 吞掉
form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const ok = await login();       // login 若 reject → unhandled rejection
  if (!ok) showBanner("登录失败");
});

// 修正：回调内全量 try/catch
form?.addEventListener("submit", (e) => {
  void (async () => {
    e.preventDefault();
    try {
      const ok = await login();
      if (!ok) showBanner("登录失败");
    } catch (err) {
      showBanner(errorMessage(err));
    }
  })();
});
```

修正版里 `void` 前缀是团队约定俗成的「我知道这里有 Promise 被丢弃」标记（配合 ESLint 的 no-floating-promises 规则强制），既不阻塞 UI 线程语义又让审查者一眼看到异步边界。

## 9. 动手实践

### 任务

1. 写 `async function retry<T>(fn: () => Promise<T>, times: number): Promise<T>`：失败重试最多 times 次，全部失败抛最后一次的错误。（提示：循环 + try/catch，最后一次失败在循环外 rethrow。）
2. 解释并修复：`arr.forEach(async (x) => { await save(x); }); console.log("done")` 为什么 "done" 先于保存完成打印？给出按顺序等全部完成的写法。
3. 给 `request<T>`（第 6 节）加一个 `useCache` 变体，签名 `requestCached<T>(path: string): Promise<T>`：首次请求后缓存 `Promise<T>` 本身（而不是结果值），并发调用共享同一个 Promise。（提示：`Map<string, Promise<unknown>>`。）

### 参考实现（先自己做，再对照）

<details>
<summary>参考实现（点开前请先独立完成）</summary>

```typescript
// 1. retry
async function retry<T>(fn: () => Promise<T>, times: number): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < times; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;   // unknown 可以直接 rethrow
}

// 2. forEach 的回调被并发启动，console.log 不等它们
//    按顺序等：for...of（串行）；并发等：Promise.all
for (const x of arr) {
  await save(x);          // 串行，全部完成才到 done
}
// 或并发：
await Promise.all(arr.map((x) => save(x)));

// 3. 缓存 Promise 本身
const cache = new Map<string, Promise<unknown>>();
function requestCached<T>(path: string): Promise<T> {
  let p = cache.get(path) as Promise<T> | undefined;
  if (!p) {
    p = request<T>(path);
    cache.set(path, p);
    p.catch(() => cache.delete(path));  // 失败不缓存，允许重试
  }
  return p;
}
```

</details>

自检标准：retry 的 `lastError` 类型是 unknown 而不是 any；任务 2 能说出「forEach 不等回调返回的 Promise」这句话；requestCached 缓存的是 Promise 对象本身且失败项被清除。

## 10. 坑点小结

1. **async 函数签名永远写 `Promise<X>`**：只写 `X` 是最常见的新手签名错误，编译器不会帮你纠正显式注解。
2. **`void` 回调位吞 Promise**：DOM 事件、定时器、`forEach` 里的 async 回调必须自带 try/catch。
3. **catch 的 unknown 是特性**：封装 `errorMessage(e: unknown)` 一处收窄，全项目复用。
4. **库参数用 `PromiseLike`，返回值用 `Promise`**：入参放宽、出参收紧。

## 11. 练习

1. 给你项目里找一个 `async` 函数，用 `type R = Awaited<ReturnType<typeof fn>>` 抽出返回类型并解释它的展开过程（联合、嵌套 Promise 各怎么处理）。
2. 把项目里的一个 `setInterval` 异步轮询改成第 7 节的自递归 `setTimeout` 版本，列出改动点（防堆积、错误接住、停止条件）。
3. 写一个 `PromiseLike<number>` 的最小对象并传入 `await`，观察 `Awaited` 如何收窄它，说明为什么 `PromiseLike` 足以被 await。

## 12. 下一步

- [infer 类型深潜](/typescript/450-TypeCompositionPractice)：MyAwaited 的完整递归实现
- [运行时 Schema 校验](/typescript/660-RuntimeSchemaValidation)：`as T` 之外的运行时兜底
- [类型安全 API 客户端](/typescript/570-TypeSafeAPIClient)：URL 到类型的端到端映射
- [迭代器与生成器类型](/typescript/255-IterationProtocolTypes)：`for await...of` 流式消费

## 13. 参考与致谢

- **TypeScript 官方手册：Async Functions / await**（https://www.typescriptlang.org/docs/handbook/release-notes/typescript-1-7.html，文档许可 CC-BY 4.0）：async 返回类型推断的基准来源。
- **TypeScript 4.4 发布说明：Control Flow Analysis of Aliased Conditions 与 useUnknownInCatchVariables**（https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-4.html，文档许可 CC-BY 4.0）：catch unknown 的出处。
- **TypeScript 官方 tsconfig 参考：useUnknownInCatchVariables**（https://www.typescriptlang.org/tsconfig/#useUnknownInCatchVariables，文档许可 Apache-2.0）。
- MDN「async function」（https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Statements/async_function，许可 CC-BY-SA 2.5）。
- 本文的 fetch 封装、轮询修正、事件回调三例为原创工程场景；轮询需求原型取自扫描素材 `e-core-java-mysql-web.md` 3.4 节 JS 综合考试卷「点击换图后每半秒自动变换」与 3.1 节练习 2 的定时器换图页，升级为 TS 异步类型化版本。
