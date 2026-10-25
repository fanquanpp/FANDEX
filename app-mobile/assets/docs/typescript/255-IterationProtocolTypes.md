---
order: 270
title: 迭代器与生成器类型
module: 'typescript'
category: 前端技术
difficulty: beginner
description: 迭代协议的类型层：Iterable/Iterator/Generator/AsyncGenerator 的类型参数、for...of 与 for await...of 的类型推导，以及分页流、文件流、任务队列三类工程实例。
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：迭代协议（iteration protocol）的**类型层**——`Iterable` / `Iterator` / `Generator` / `AsyncGenerator` 四个接口如何组织你的自定义数据结构的类型。
- **解决什么问题**：让自定义集合能被 `for...of`、展开运算符、解构消费且类型完整；让分页 API 像本地数组一样被顺序消费而不必先拉全量；让 `for await...of` 能直接遍历异步流。
- **什么时候用到**：封装分页/游标 API；写惰性序列、任务队列；给 `NodeList`、`Map`、`Set` 这类内置可迭代对象写泛型工具函数。运行时层（迭代协议的 JS 机制、生成器语法本身、Iterator 辅助方法）由 007-javascript 模块承载：[迭代器辅助方法](/javascript/310-IteratorHelper)与[生成器函数](/javascript/320-GeneratorFunctions)——本篇专注类型层，两模块各讲一半，阅读时建议配对。

## 前置知识

- [唯一 Symbol 与类型层](/typescript/250-SymbolsAndUniqueTypes)：`Symbol.iterator` 的类型地位
- [泛型进阶](/typescript/230-GenericConstraintDefault)：读懂接口里的三个类型参数
- [生成器函数](/javascript/320-GeneratorFunctions)：`function*` 与 `yield` 的运行时行为

## 1. 两个协议，四个接口

JS 的迭代协议分两层，TS 各有一套类型：

```typescript
// 库文件 lib.es2015.iterable.d.ts 中的定义（简化注释）
interface Iterator<T, TReturn = any, TNext = undefined> {
  next(...args: [] | [TNext]): IteratorResult<T, TReturn>;
}

interface Iterable<T> {
  [Symbol.iterator](): Iterator<T>;
}

interface IterableIterator<T> extends Iterator<T> {
  [Symbol.iterator](): IterableIterator<T>;
}
```

心智模型一句话：**`Iterable` 是「可以给我迭代器」的东西，`Iterator` 是「会一步步吐值」的东西**。数组是 Iterable；生成器对象两者都是（IterableIterator）；`for...of` 要的是 Iterable。

### 1.1 IteratorResult 的判别联合

`next()` 的返回值本身是一个判别联合——这恰好是[字面量联合类型](/typescript/110-LiteralUnionTypes)里 `done` 收窄的教科书案例：

```typescript
type IteratorResult<T, TReturn = any> =
  | IteratorYieldResult<T>      // { done?: false; value: T }
  | IteratorReturnResult<TReturn>; // { done: true; value: TReturn }

// 收窄效果
function consume<T>(it: Iterator<T>) {
  const r = it.next();
  if (r.done) {
    // 这里 r 是 IteratorReturnResult：r.value 是返回值类型
    return r.value;
  }
  // 这里 r 是 IteratorYieldResult：r.value 是 T
  return r.value;
}
```

写成 `if (r.done === true)` 与 `if (!r.done)` 都能收窄；但写成 `if (r.done === false)` 之外的形式（如 `if (!r.done)` 配 `done?: false` 可选属性）时注意：第一个 `next()` 前对象可能没有 `done` 字段，`!r.done` 为真——这正是「产出值」分支，语义仍正确。换种写法（比如把 `done?: false` 简化成 `done: false` 非可选）反而会破坏「无参调用 next 时 done 可能缺省」的真实形状。

## 2. Generator 的三个类型参数

```typescript
interface Generator<T = unknown, TReturn = any, TNext = unknown>
  extends Iterator<T, TReturn, TNext> {
  next(...args: [] | [TNext]): IteratorResult<T, TReturn>;
  return(value: TReturn): IteratorResult<T, TReturn>;
  throw(e: any): IteratorResult<T, TReturn>;
  [Symbol.iterator](): Generator<T, TReturn, TNext>;
}
```

三个参数的位置与含义（易错点，顺序背下来）：

| 参数 | 含义 | 常见默认 |
| --- | --- | --- |
| `T` | 每次 `yield` **吐出**的值 | `unknown` |
| `TReturn` | 生成器**最终 return** 的值 | `any` |
| `TNext` | 下次调用 `next(v)` **传回**生成器的值 | `unknown` |

```typescript
function* counter(): Generator<number, string, undefined> {
  yield 1;
  yield 2;
  return "done";  // TReturn 位置
}

const it = counter();
it.next(); // { value: 1, done: false }
it.next(); // { value: 2, done: false }
it.next(); // { value: "done", done: true }  ← value 是 string，不是 number
```

换成别的写法会发生什么：把签名写成 `Generator<number>`（省略后两个参数），`TReturn` 默认 `any`——`it.next().value` 在 done 分支里不再被检查，联合收窄的好处直接丢掉。**需要 `for...of` 以外的方式消费生成器（手动 next）时，三个参数都写全**；只被 `for...of` 消费时 TReturn 永远不会被读到，才可省略。

### 2.1 function* 的返回类型自动推断

`function*` 声明本身不需要手写 Generator：

```typescript
function* naturals() {
  let n = 0;
  while (true) {
    yield n++;
    // 后面永远不 return → TReturn 推断为 undefined，TNext 为 unknown
  }
}
// 推断类型: Generator<number, void, unknown>
```

推断规则：`yield x` 决定 `T`；`return y` 决定 `TReturn`；外部 `next(v)` 传的值决定 `TNext`（从 `yield` 表达式的**取值**推断——`const received = yield value` 这种写法会把外部传入的类型并进 `TNext` 的推断）。显式注解的时机：导出的生成器、或 `yield` 值类型过于宽泛需要收紧时。

## 3. 让自定义结构可迭代：实现 Iterable

给类实现 `[Symbol.iterator]()`，`for...of`、展开、解构全部解锁：

```typescript
class Playlist<T> implements Iterable<T> {
  private items: T[] = [];

  add(item: T): void {
    this.items.push(item);
  }

  *[Symbol.iterator](): IterableIterator<T> {
    yield* this.items;  // 委托给数组迭代器
  }
}

const pl = new Playlist<string>();
pl.add("song A");
pl.add("song B");

for (const song of pl) { /* ... */ }        // for...of
const copy = [...pl];                        // 展开为 string[]
const [first] = pl;                          // 解构
function play(...songs: string[]) {}
play(...pl);                                 // 传参展开
```

逐段拆解：

- `implements Iterable<T>`：约束「必须提供 `[Symbol.iterator]()`」。删掉这个 implements，代码仍能跑（TS 是结构类型）——但保留它等于把「可迭代」写进类的公共契约，漏写方法时编译期报错。
- `*[Symbol.iterator]()`：生成器方法语法，方法名是计算属性 `[Symbol.iterator]`。用普通方法返回 `{ next() {...} }` 也可以，但生成器把「记住游标状态」的样板全交给语言，出错面更小。
- `yield* this.items`：委托语法。换成手动 `for (const x of this.items) yield x;` 行为相同、多两行；换成 `return this.items[Symbol.iterator]()` 则返回的是迭代器而本方法必须是生成器，类型直接不匹配。

### 3.1 IterableIterator 与「可再次迭代」

一个只实现 `Iterator` 的对象被 `for...of` 消费后就「烧完」了；`IterableIterator` 同时提供 `next()` 和 `[Symbol.iterator]()`，让每个 `for...of` 都能拿到一份新迭代器。判断标准：**这个对象会被迭代多次吗？** 会，就用 IterableIterator（生成器对象天然满足）；一次性的游标，Iterator 即可。

## 4. 例子一：API 分页游标迭代器（真实工程场景）

分页 API 的经典痛点：页数未知，调用方要写「while + 取下一页」的循环。用异步生成器把它变成一条 `for await...of`：

```typescript
interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

interface Todo {
  id: number;
  title: string;
}

// 分页拉取器：把「请求第 N 页」的细节封死在生成器里
async function* paginate<T>(
  fetchPage: (cursor: string | null) => Promise<Page<T>>,
): AsyncGenerator<T, void, undefined> {
  let cursor: string | null = null;
  do {
    const page = await fetchPage(cursor);
    for (const item of page.items) {
      yield item;           // 逐条吐出，调用方拿到一条处理一条
    }
    cursor = page.nextCursor;
  } while (cursor !== null);
}

// 调用方：业务代码里再没有分页循环
async function syncTodos(): Promise<void> {
  for await (const todo of paginate<Todo>(fetchTodoPage)) {
    await saveToDb(todo);   // 一边拉一边写，内存里永远只有当前一条
  }
}

async function fetchTodoPage(cursor: string | null): Promise<Page<Todo>> {
  const res = await fetch(
    `https://api.example.com/todos?limit=50${cursor ? `&cursor=${cursor}` : ""}`,
  );
  return (await res.json()) as Page<Todo>;
}
```

逐段拆解：

- `AsyncGenerator<T, void, undefined>`：T 是吐出的条目；`void` 是因为「拉完即止」没有返回值；TNext 固定 undefined（调用方不回传数据）。
- `do...while (cursor !== null)`：游标 API 的终止条件在**响应里**而不是计数器里。换成 `for (let page = 1; ; page++)` 的页码式写法在游标 API 上直接失效——两套 API 的分页模型不同。
- 为什么不用「先拉全量再 map」：1 万条数据时全量方案的峰值内存与首条延迟都数倍于流式消费；这也是 `for await...of` 相对 `await Promise.all(pages)` 的核心差异——后者要全部完成才开始，前者随到随处理。

## 5. 例子二：Node.js 逐行读文件流

Node 的 `readline` 配合 `for await...of`，是文件流消费的最短写法：

```typescript
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";

async function countErrorLines(path: string): Promise<number> {
  const rl = createInterface({
    input: createReadStream(path, "utf-8"),
    crlfDelay: Infinity,  // 处理 Windows 的 \r\n
  });

  let errors = 0;
  for await (const line of rl) {   // rl 实现了 AsyncIterable<string>
    if (line.includes("ERROR")) {
      errors++;
    }
  }
  return errors;
}
```

`createInterface` 的返回类型在 `@types/node` 里是 `Interface`，声明了 `Symbol.asyncIterator`——所以 `for await...of (const line of rl)` 里 `line` 被 TS 精确推断为 `string`。若把 `crlfDelay: Infinity` 漏掉（换成默认值），Windows 换行的 `\r` 会残留在行尾，`line.includes("ERROR")` 不受影响但 `line === "..."` 这类精确比较会静默失败——类型系统帮不了你，这是运行时行为差异。

## 6. 例子三：生成器任务队列

游戏/动画场景常见的「任务序列」：任务一个接一个执行，每个任务完成后才轮到下一个：

```typescript
type Task = () => Promise<void>;

// 把任务数组变成顺序执行器：产出每个任务的「结果描述」
async function* runTasks(
  tasks: Task[],
): AsyncGenerator<{ index: number; ok: boolean; error?: string }> {
  for (const [index, task] of tasks.entries()) {
    try {
      await task();
      yield { index, ok: true };
    } catch (error) {
      yield { index, ok: false, error: String(error) };
    }
  }
}

// 消费：进度条能逐任务更新
const tasks: Task[] = [uploadAssets, clearCache, notifyUsers];
for await (const result of runTasks(tasks)) {
  progressBar.update(result.index, result.ok);
  if (!result.ok) {
    log.warn(`task ${result.index} failed: ${result.error}`);
  }
}
```

`for await (const [index, task] of ...)` 里的数组解构能工作，是因为数组本身就是 `Iterable<T>`——内置可迭代对象与自定义迭代器共用同一套类型接口。

## 7. for...of 与 for await...of 的类型速查

| 遍历目标 | 用哪条语句 | 元素类型 |
| --- | --- | --- |
| `Iterable<T>` | `for...of` | `T` |
| `AsyncIterable<T>` | `for await...of` | `T` |
| `Iterable<T> \| AsyncIterable<T>` | `for await...of` | `Awaited<T>` |
| `ArrayLike<T>`（只有 length+下标） | 不能 for...of，需 `Array.from` | `T` |

易错点：

- **`for await...of` 遍历普通数组会逐个 await 元素**。`for await (const p of [p1, p2])` 是等两个 Promise 依次完成，不是并发——要并发先 `Promise.all`。
- 对象字面量不是 Iterable：`for (const [k, v] of { a: 1 })` 编译报错。用 `Object.entries(obj)`（返回 `[string, T][]`，数组即可迭代）。
- `NodeList` 与 `HTMLCollection`：`NodeList` 带 `DOM.Iterable` lib 时可 `for...of`；`HTMLCollection` 只有配了 `DOM.Iterable` 才可迭代（细节见[DOM 与 Web API 类型](/typescript/345-DomLibAndWebApiTypes)）。

## 8. 动手实践

### 任务

1. 写一个 `zip<A, B>(a: Iterable<A>, b: Iterable<B>): Generator<[A, B]>` 生成器：把两个可迭代对象按位配对，短的耗尽即停。（提示：先 `for (const x of a)`，内部再手动 `b[Symbol.iterator]()` + `next()`。）
2. 把第 4 节的分页迭代器加一个 `take(limit: number)` 版本：最多产出 limit 条就提前终止。（提示：数到 limit 时 `return`，生成器的 `return` 会触发 `finally`。）
3. 用 `AsyncGenerator` 写一个 `poll<T>(fn: () => Promise<T>, intervalMs: number)`：无限轮询，每次间隔 intervalMs 吐出一次结果。（提示：`while (true)` + `yield await fn()` + `await sleep()`。）

### 参考实现（先自己做，再对照）

<details>
<summary>参考实现（点开前请先独立完成）</summary>

```typescript
// 1. zip
function* zip<A, B>(a: Iterable<A>, b: Iterable<B>): Generator<[A, B]> {
  const itB = b[Symbol.iterator]();
  for (const x of a) {
    const { value, done } = itB.next();
    if (done) return;
    yield [x, value];
  }
}

// 2. 带上限的分页
async function* paginateTake<T>(
  fetchPage: (cursor: string | null) => Promise<Page<T>>,
  limit: number,
): AsyncGenerator<T, void, undefined> {
  let cursor: string | null = null;
  let count = 0;
  try {
    do {
      const page = await fetchPage(cursor);
      for (const item of page.items) {
        if (count >= limit) return;   // 提前终止
        yield item;
        count++;
      }
      cursor = page.nextCursor;
    } while (cursor !== null);
  } finally {
    // 生成器被提前 return 时也会走到这里：放清理逻辑（关闭连接等）
  }
}

// 3. 轮询
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function* poll<T>(
  fn: () => Promise<T>,
  intervalMs: number,
): AsyncGenerator<T, void, undefined> {
  while (true) {
    yield await fn();
    await sleep(intervalMs);
  }
}
```

</details>

自检标准：zip 的类型参数顺序（先 A 后 B，返回 `Generator<[A, B]>`）；paginateTake 的 `return` 在 `try` 里、清理在 `finally`；poll 的 `yield await` 顺序（先拿结果再歇息）。

## 9. 坑点小结

1. **三个类型参数顺序**：`Generator<T产出, TReturn, TNext>`——与直觉相反的是第二个参数是 return 而不是「传回值」。
2. **手动消费生成器才能触发 TNext**：`for...of` 每次无参调用 `next()`，TNext 通道永远走 undefined。
3. **生成器是单次消费品**：同一生成器对象第二次 `for...of` 直接空循环。要可重复迭代，包成返回新生成器的函数。
4. **异步迭代器的失败要落在消费方**：`for await` 循环体里抛错会终止整个流，分页拉取场景把「单条失败重试」放循环体内、「整页失败」放生成器内，两种失败两种处理层级。

## 10. 练习

1. 给 `Playlist` 加 `map` / `filter` 方法，返回新的生成器而不是数组，保持惰性。
2. 用 `for await...of` 重写你项目里某个「拉全量再循环」的接口调用，对比两版的内存与首条数据到达时间。
3. 解释：为什么 `for (const x of playlist)` 里的 `x` 自动是 `string`？如果 `Playlist<T>` 的 `implements Iterable<T>` 去掉、`[Symbol.iterator]` 也删了，报错出现在哪一行？

## 11. 下一步

- [迭代器辅助方法](/javascript/310-IteratorHelper)：map/filter/take 等标准迭代组合子（运行时层）
- [生成器函数](/javascript/320-GeneratorFunctions)：yield/委托/双向通信的运行时语义
- [DOM 与 Web API 类型](/typescript/345-DomLibAndWebApiTypes)：`DOM.Iterable` lib 与 NodeList 的可迭代性
- [异步类型模式](/typescript/555-AsyncTypePatterns)：Promise 类型层与 async 函数推断

## 12. 参考与致谢

- **TypeScript 官方手册：Iterators and Generators**（https://www.typescriptlang.org/docs/handbook/iterators-in-javascript.html，文档许可 CC-BY 4.0）：本文协议定义、`for...of` 类型推导行为的基准来源。
- **TypeScript 官方手册：Interfaces**（https://www.typescriptlang.org/docs/handbook/2/objects.html，文档许可 CC-BY 4.0）。
- MDN「迭代协议」（https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Iteration_protocols，许可 CC-BY-SA 2.5）：迭代协议的运行时定义。
- 本文的分页迭代器、文件流、任务队列三个例子为原创工程场景；扫描素材 `e-core-java-mysql-web.md` 3.1 节 JS 基础练习 7 题合集的图片轮播页（`querySelectorAll` 消费场景）为 DOM 集合迭代的真实页面来源。
